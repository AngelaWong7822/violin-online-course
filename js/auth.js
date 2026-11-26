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

/** Country codes offered for WhatsApp numbers (Hong Kong first = default). */
export const PHONE_CODES = [
  { code: '852', label: '香港 +852', pattern: /^[4-9]\d{7}$/, example: '9123 4567' },
  { code: '853', label: '澳門 +853', pattern: /^6\d{7}$/, example: '6612 3456' },
  { code: '86', label: '中國內地 +86', pattern: /^1\d{10}$/, example: '138 0013 8000' },
  { code: '886', label: '台灣 +886', pattern: /^9\d{8}$/, example: '912 345 678' },
  { code: '65', label: '新加坡 +65', pattern: /^[89]\d{7}$/, example: '8123 4567' },
  { code: '60', label: '馬來西亞 +60', pattern: /^1\d{8,9}$/, example: '12 345 6789' },
  { code: '44', label: '英國 +44', pattern: /^7\d{9}$/, example: '7400 123456' },
  { code: '1', label: '美國／加拿大 +1', pattern: /^[2-9]\d{9}$/, example: '212 555 0123' },
  { code: '61', label: '澳洲 +61', pattern: /^4\d{8}$/, example: '412 345 678' },
  { code: '64', label: '紐西蘭 +64', pattern: /^2\d{7,9}$/, example: '21 123 4567' },
  { code: '81', label: '日本 +81', pattern: /^[789]0\d{8}$/, example: '90 1234 5678' },
  { code: '82', label: '南韓 +82', pattern: /^1\d{8,9}$/, example: '10 1234 5678' },
  { code: 'other', label: '其他國家／地區', pattern: null, example: '+國家號碼 電話號碼' },
];

/**
 * Build an E.164 number ("+85291234567") from the chosen country code and
 * the typed number, or return null if it does not look right. A leading
 * trunk "0" (e.g. UK 07400…) is dropped. "other" expects "+<code><number>".
 */
export function normalizeWhatsapp(code, input) {
  const raw = String(input || '').replace(/[\s().-]/g, '');
  if (code === 'other') {
    const full = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
    return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
  }
  const entry = PHONE_CODES.find((c) => c.code === code);
  if (!entry) return null;
  let local = raw.startsWith(`+${code}`) ? raw.slice(code.length + 1) : raw;
  if (local.startsWith('0')) local = local.slice(1);
  return entry.pattern.test(local) ? `+${code}${local}` : null;
}

/** Split a stored "+85291234567" into { code: '852', number: '91234567' } for the form. */
export function splitWhatsapp(value) {
  if (!value) return { code: '852', number: '' };
  const match = PHONE_CODES
    .filter((c) => c.pattern && value.startsWith(`+${c.code}`))
    .sort((a, b) => b.code.length - a.code.length)[0];
  const local = match && value.slice(match.code.length + 1);
  if (match && match.pattern.test(local)) return { code: match.code, number: local };
  return { code: 'other', number: value };
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
