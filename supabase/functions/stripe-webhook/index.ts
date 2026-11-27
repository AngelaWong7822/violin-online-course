// stripe-webhook: Stripe tells us a payment finished (or was refunded).
//
// Stripe → POST /functions/v1/stripe-webhook
// Events to subscribe to in Stripe (Developers → Webhooks):
//   checkout.session.completed
//   checkout.session.async_payment_succeeded
//   charge.refunded
//
// Every request is checked against STRIPE_WEBHOOK_SECRET (whsec_…), so only
// Stripe can open courses. Repeated deliveries are harmless: one Checkout
// Session can create only one enrollment.
// Deploy with JWT verification OFF (Stripe has no Supabase login):
//   supabase functions deploy stripe-webhook --no-verify-jwt
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const TOLERANCE_SECONDS = 300;
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Check the Stripe-Signature header (t=…,v1=…) against the raw body. */
async function verifySignature(payload: string, header: string | null, secret: string) {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const expected = toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`)));
  return signatures.some((sig) => safeEqual(sig, expected));
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // e.g. 31 Jan + 1 month → 28/29 Feb
  return d;
}

// deno-lint-ignore no-explicit-any
async function openCourse(session: any) {
  if (session.payment_status !== 'paid') return 'not paid yet';
  const userId = session.metadata?.user_id || session.client_reference_id;
  const courseId = session.metadata?.course_id;
  if (!userId || !courseId) throw new Error(`session ${session.id} has no user/course metadata`);

  // Access period from the course itself (fallback: metadata, then 12)
  const { data: course } = await admin.from('courses').select('access_months').eq('id', courseId).maybeSingle();
  const months = Number(course?.access_months || session.metadata?.access_months || 12);

  const now = new Date();
  const { error } = await admin.from('enrollments').upsert({
    user_id: userId,
    course_id: courseId,
    status: 'active',
    source: 'stripe',
    amount_hkd: Math.round((session.amount_total || 0) / 100),
    starts_at: now.toISOString(),
    expires_at: addMonths(now, months).toISOString(),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  }, { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true });
  if (error) throw error;
  return 'enrolled';
}

// deno-lint-ignore no-explicit-any
async function handleRefund(charge: any) {
  // Only a full refund closes access; partial refunds keep the course open.
  if (!charge.refunded || !charge.payment_intent) return 'partial refund ignored';
  const { error } = await admin
    .from('enrollments')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', charge.payment_intent);
  if (error) throw error;
  return 'refunded';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const payload = await req.text();
  const ok = await verifySignature(
    payload,
    req.headers.get('Stripe-Signature'),
    Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
  );
  if (!ok) return new Response('invalid signature', { status: 400 });

  const event = JSON.parse(payload);
  try {
    let result = 'ignored';
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        result = await openCourse(event.data.object);
        break;
      case 'charge.refunded':
        result = await handleRefund(event.data.object);
        break;
    }
    console.log(event.type, event.id, result);
    return new Response(JSON.stringify({ received: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // 500 makes Stripe retry later
    console.error(event.type, event.id, err);
    return new Response('error', { status: 500 });
  }
});
