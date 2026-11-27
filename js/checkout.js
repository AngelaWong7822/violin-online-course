// Enrol / pay for a course through Stripe Checkout (via the create-checkout Edge Function).
import { getClient, supabaseConfigured } from './supabase.js';
import { getSession, getProfile, siteBase } from './auth.js';

/** Page to come back to after login / profile setup, then continue to payment. */
const resumeUrl = (slug) => `course.html?c=${encodeURIComponent(slug)}&buy=1`;

/** Active, unexpired enrollment of the logged-in user for this course, or null. */
export async function myEnrollment(courseId) {
  if (!supabaseConfigured()) return null;
  const session = await getSession();
  if (!session) return null;
  const sb = await getClient();
  const { data, error } = await sb
    .from('enrollments')
    .select('id, expires_at')
    .eq('course_id', courseId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data[0] || null;
}

/**
 * Send the visitor to Stripe. Not logged in → login first; no profile →
 * finish it first; both come back here with &buy=1 and continue.
 * Resolves with an error message (string) if it could not start.
 */
export async function startCheckout(slug) {
  if (!supabaseConfigured()) return '付款功能尚未設定。';
  const session = await getSession();
  if (!session) {
    location.href = `login.html?next=${encodeURIComponent(resumeUrl(slug))}`;
    return null;
  }

  const sb = await getClient();
  // Send the user's token explicitly: right after page load supabase-js may
  // still be using the public key for function calls.
  const { data, error } = await sb.functions.invoke('create-checkout', {
    body: { course_slug: slug, return_base: siteBase() },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!error && data?.url) {
    location.href = data.url;
    return null;
  }

  let code = data?.error;
  if (error?.context && typeof error.context.json === 'function') {
    try { code = (await error.context.json()).error; } catch { /* keep generic */ }
  }
  switch (code) {
    case 'not_logged_in':
      // We do have a session here, so sending them to log in again would loop.
      return '登入狀態已失效，請登出後重新登入，再試一次。';
    case 'no_profile': {
      // Only send them to fill in the profile if it is really missing;
      // otherwise the two pages would keep sending each other back.
      const profile = await getProfile(session.user.id).catch(() => null);
      if (profile) return '暫時未能前往付款頁面，請稍後再試。';
      location.href = `account.html?setup=1&next=${encodeURIComponent(resumeUrl(slug))}`;
      return null;
    }
    case 'already_enrolled':
      location.href = 'my-courses.html';
      return null;
    case 'course_not_available':
      return '此課程暫時未能報讀。';
    default:
      return '暫時未能前往付款頁面，請稍後再試。';
  }
}
