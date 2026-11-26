// Login state, profile checks and small auth helpers shared by member pages.
import { getClient, supabaseConfigured } from './supabase.js';

export { supabaseConfigured };

/** Folder the site lives in (works on the custom domain and on github.io/<repo>/). */
export const siteBase = () => new URL('.', location.href).href;

/**
 * Only allow redirects to our own pages, e.g. "my-courses.html" or
 * "course.html?c=kids-8". Anything else falls back.
 */
export function safeNext(raw, fallback = 'my-courses.html') {
  if (raw && /^[a-z0-9-]+\.html(\?[a-zA-Z0-9=&_.-]*)?(#[a-zA-Z0-9_-]*)?$/.test(raw)) return raw;
  return fallback;
}

/** Current page as a "next" value, e.g. "account.html?setup=1". */
export function currentPage() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return file + location.search;
}

export const loginUrl = (next = currentPage()) => `login.html?next=${encodeURIComponent(next)}`;

export async function getSession() {
  if (!supabaseConfigured()) return null;
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Logged-in user, or redirect to the login page. */
export async function requireUser() {
  const session = await getSession();
  if (!session) {
    location.replace(loginUrl());
    return new Promise(() => {}); // stop the page while the browser navigates
  }
  return session.user;
}

export async function getProfile(userId) {
  const sb = await getClient();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Logged-in user with a completed profile; otherwise send them to finish it. */
export async function requireProfile() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) {
    location.replace(`account.html?setup=1&next=${encodeURIComponent(currentPage())}`);
    return new Promise(() => {});
  }
  return { user, profile };
}

export async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut();
  location.href = 'index.html';
}

/**
 * Hong Kong numbers may be typed as "9123 4567"; other places need the
 * country code, e.g. "+86 138 0013 8000". Returns "+85291234567" or null.
 */
export function normalizeWhatsapp(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/[\s()-]/g, '');
  if (/^[4-9]\d{7}$/.test(digits)) return `+852${digits}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  return null;
}

/** Show "+85291234567" as "9123 4567"; other countries as typed. */
export function displayWhatsapp(value) {
  const m = /^\+852(\d{4})(\d{4})$/.exec(value || '');
  return m ? `${m[1]} ${m[2]}` : value || '';
}

/** Supabase auth errors in plain written Chinese. */
export function authErrorMessage(error) {
  const msg = String(error?.message || error || '');
  const rules = [
    [/invalid login credentials/i, '電郵或密碼不正確，請重新輸入。'],
    [/email not confirmed/i, '閣下尚未確認電郵地址，請先按確認電郵中的連結。'],
    [/already registered|already been registered/i, '此電郵地址已經註冊，請直接登入。'],
    [/password should be at least|weak password/i, '密碼最少須有 8 個字元。'],
    [/rate limit|too many|security purposes/i, '嘗試次數過多，請稍候數分鐘再試。'],
    [/unable to validate email|invalid email|email address .* is invalid/i, '電郵地址格式不正確。'],
    [/new password should be different/i, '新密碼不可與舊密碼相同。'],
    [/provider is not enabled|unsupported provider/i, '此登入方式尚未啟用。'],
    [/expired|invalid.*(token|link)|otp/i, '連結已失效，請重新申請。'],
    [/failed to fetch|network/i, '網絡連線出現問題，請檢查後再試。'],
  ];
  const hit = rules.find(([re]) => re.test(msg));
  return hit ? hit[1] : `發生錯誤，請稍後再試。${msg ? `（${msg}）` : ''}`;
}

/** Errors Supabase puts in the URL after a failed email-link / Google login. */
export function urlAuthError() {
  const params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const code = params.get('error_code') || params.get('error');
  if (!code) return null;
  if (/otp_expired|expired/i.test(code)) return '連結已失效或已使用，請重新登入或重新申請。';
  if (/access_denied/i.test(code)) return '登入已取消。';
  return authErrorMessage(params.get('error_description') || code);
}
