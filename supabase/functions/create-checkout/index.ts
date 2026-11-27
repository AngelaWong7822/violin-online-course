// create-checkout: start a Stripe Checkout payment for one course.
//
// Called from the course page by a logged-in user:
//   POST /functions/v1/create-checkout   { course_slug, return_base }
//   Authorization: Bearer <user access token>   (supabase-js adds it)
// Returns { url } — the Stripe payment page to send the browser to.
//
// The price always comes from the database, never from the browser.
// Deploy with JWT verification OFF (the user token is checked below):
//   supabase functions deploy create-checkout --no-verify-jwt
//
// Secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY   sk_test_… (sandbox) or sk_live_… (after launch)
//   ALLOWED_ORIGINS     optional, comma separated; defaults below
//   PAYMENT_METHODS     optional, default "card,alipay,wechat_pay"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_ORIGINS = [
  'https://academy.tomlee-violin.com',
  'https://angelawong7822.github.io',
  'http://localhost:5180',
];
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || DEFAULT_ORIGINS.join(','))
  .split(',').map((s) => s.trim()).filter(Boolean);
const PAYMENT_METHODS = (Deno.env.get('PAYMENT_METHODS') || 'card,alipay,wechat_pay')
  .split(',').map((s) => s.trim()).filter(Boolean);

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function reply(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

/** Stripe's API takes form-encoded bodies with bracket keys. */
function formEncode(data: Record<string, unknown>, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') formEncode(item as Record<string, unknown>, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(item));
      });
    } else if (typeof value === 'object') {
      formEncode(value as Record<string, unknown>, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

/** Only send people back to our own site. */
function safeReturnBase(raw: unknown): string {
  try {
    const url = new URL(String(raw));
    if (ALLOWED_ORIGINS.includes(url.origin)) {
      return url.origin + url.pathname.replace(/[^/]*$/, ''); // folder, ends with "/"
    }
  } catch { /* fall through */ }
  return `${ALLOWED_ORIGINS[0]}/`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return reply(origin, 405, { error: 'method_not_allowed' });

  // 1. Who is paying?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = token
    ? await admin.auth.getUser(token)
    : { data: { user: null }, error: null };
  const user = userData?.user;
  if (userError || !user) return reply(origin, 401, { error: 'not_logged_in' });

  let body: { course_slug?: string; return_base?: string };
  try {
    body = await req.json();
  } catch {
    return reply(origin, 400, { error: 'bad_request' });
  }

  // 2. Profile must be complete (name + WhatsApp)
  const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!profile) return reply(origin, 400, { error: 'no_profile' });

  // 3. Course and price from the database
  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('id, slug, title, price_hkd, access_months, status')
    .eq('slug', String(body.course_slug || ''))
    .maybeSingle();
  if (courseError) return reply(origin, 500, { error: 'server_error' });
  if (!course || course.status !== 'published' || course.price_hkd == null || course.price_hkd <= 0) {
    return reply(origin, 404, { error: 'course_not_available' });
  }

  // 4. Do not sell the same course twice while access is still valid
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  if (existing && existing.length) return reply(origin, 409, { error: 'already_enrolled' });

  // 5. Create the Stripe Checkout Session
  const base = safeReturnBase(body.return_base);
  const params = formEncode({
    mode: 'payment',
    locale: 'zh-HK',
    customer_email: user.email,
    client_reference_id: user.id,
    allowed_payment_method_types: PAYMENT_METHODS, // newer Stripe API name; card includes Apple/Google Pay
    payment_method_options: PAYMENT_METHODS.includes('wechat_pay') ? { wechat_pay: { client: 'web' } } : undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'hkd',
        unit_amount: course.price_hkd * 100, // Stripe counts in cents
        product_data: { name: course.title, description: `網上課程 · ${course.access_months} 個月觀看期` },
      },
    }],
    metadata: { user_id: user.id, course_id: course.id, access_months: course.access_months },
    payment_intent_data: {
      description: `${course.title}（網上課程）`,
      metadata: { user_id: user.id, course_id: course.id },
    },
    success_url: `${base}my-courses.html?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}course.html?c=${encodeURIComponent(course.slug)}#price`,
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const session = await stripeRes.json();
  if (!stripeRes.ok) {
    console.error('Stripe error', session?.error?.message);
    return reply(origin, 502, { error: 'stripe_error', message: session?.error?.message });
  }

  return reply(origin, 200, { url: session.url });
});
