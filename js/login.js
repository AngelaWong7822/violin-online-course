// Login / sign-up / forgot-password page.
import { mountLayout, esc } from './layout.js';
import { getClient } from './supabase.js';
import {
  supabaseConfigured, getSession, getProfile, safeNext, siteBase,
  authErrorMessage, urlAuthError,
} from './auth.js';

mountLayout();

const root = document.getElementById('page-root');
const params = new URLSearchParams(location.search);
const rawNext = params.get('next');
const next = /^(login|reset-password)\.html/.test(rawNext || '') ? 'my-courses.html' : safeNext(rawNext);
let mode = ['signup', 'forgot'].includes(params.get('mode')) ? params.get('mode') : 'login';

const googleIcon = '<svg class="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

const TEXT = {
  login: { title: '登入', submit: '登入' },
  signup: { title: '註冊帳戶', submit: '註冊' },
  forgot: { title: '忘記密碼', submit: '發送重設連結' },
};

/** After login: finish the profile first if needed, then go where the user was heading. */
async function goNext(user) {
  let profile = null;
  try {
    profile = await getProfile(user.id);
  } catch {
    // profiles table missing or offline: still let them in
    profile = {};
  }
  location.replace(profile ? next : `account.html?setup=1&next=${encodeURIComponent(next)}`);
}

function alertBox(kind, message) {
  return `<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${message}</div>`;
}

function render(notice = '') {
  const t = TEXT[mode];
  const tabs = mode === 'forgot' ? '' : `
    <div class="mb-6 grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-medium" role="tablist">
      <button type="button" role="tab" data-mode="login" aria-selected="${mode === 'login'}"
        class="rounded-full py-2.5 ${mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-muted'}">登入</button>
      <button type="button" role="tab" data-mode="signup" aria-selected="${mode === 'signup'}"
        class="rounded-full py-2.5 ${mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-muted'}">註冊</button>
    </div>`;

  const google = mode === 'forgot' ? '' : `
    <button type="button" class="btn-google" data-google>${googleIcon}<span>使用 Google 帳戶繼續</span></button>
    <div class="divider-text my-6">或使用電郵地址</div>`;

  const password = mode === 'forgot' ? '' : `
    <div>
      <label class="form-label" for="password">密碼</label>
      <input class="form-input" id="password" name="password" type="password" required minlength="${mode === 'signup' ? 8 : 1}"
        autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}">
      ${mode === 'signup' ? '<p class="form-hint">最少 8 個字元。</p>' : ''}
    </div>`;

  const confirm = mode === 'signup' ? `
    <div>
      <label class="form-label" for="password2">確認密碼</label>
      <input class="form-input" id="password2" name="password2" type="password" required minlength="8" autocomplete="new-password">
    </div>` : '';

  const below = {
    login: '<p class="text-right text-sm"><button type="button" class="text-gold-deep underline-offset-2 hover:underline" data-mode="forgot">忘記密碼？</button></p>',
    signup: '<p class="text-xs leading-5 text-muted">註冊即表示閣下同意本網站的<a href="terms.html">條款及細則</a>及<a href="privacy.html">私隱政策</a>。</p>',
    forgot: '<p class="text-center text-sm"><button type="button" class="text-gold-deep underline-offset-2 hover:underline" data-mode="login">返回登入</button></p>',
  }[mode];

  root.innerHTML = `
    <h1 class="mb-2 text-center font-serif text-3xl font-bold">${t.title}</h1>
    <p class="mb-8 text-center text-sm text-muted">${mode === 'forgot'
      ? '請輸入註冊時使用的電郵地址，我們會發送重設密碼的連結給閣下。'
      : '登入後即可免費試看課程，並查看已報讀的課程。'}</p>
    <div class="card p-6 sm:p-8">
      ${tabs}
      <div id="notice" class="mb-5 empty:hidden">${notice}</div>
      ${google}
      <form id="auth-form" class="space-y-5" novalidate>
        <div>
          <label class="form-label" for="email">電郵地址</label>
          <input class="form-input" id="email" name="email" type="email" required autocomplete="email" inputmode="email">
        </div>
        ${password}
        ${confirm}
        ${mode === 'login' ? below : ''}
        <button type="submit" class="btn-primary btn-block">${t.submit}</button>
        ${mode !== 'login' ? below : ''}
      </form>
    </div>`;
}

function setNotice(kind, message) {
  document.getElementById('notice').innerHTML = message ? alertBox(kind, message) : '';
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type=submit]');
  const email = form.email.value.trim();
  const password = form.password?.value || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setNotice('error', '請輸入正確的電郵地址。');
  if (mode === 'login' && !password) return setNotice('error', '請輸入密碼。');
  if (mode === 'signup') {
    if (password.length < 8) return setNotice('error', '密碼最少須有 8 個字元。');
    if (password !== form.password2.value) return setNotice('error', '兩次輸入的密碼不一致。');
  }

  button.disabled = true;
  setNotice('', '');
  try {
    const sb = await getClient();
    if (mode === 'login') {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return goNext(data.user);
    }
    if (mode === 'signup') {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteBase()}login.html?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      if (data.session) return goNext(data.user); // email confirmation switched off
      if (data.user && data.user.identities?.length === 0) {
        return setNotice('error', '此電郵地址已經註冊，請直接登入。');
      }
      form.reset();
      return setNotice('ok', `確認電郵已發送至 <strong>${esc(email)}</strong>。請按電郵中的連結完成註冊。如未收到，請檢查垃圾郵件。`);
    }
    // forgot
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteBase()}reset-password.html`,
    });
    if (error) throw error;
    form.reset();
    setNotice('ok', `如 <strong>${esc(email)}</strong> 已經註冊，閣下將收到重設密碼的電郵。`);
  } catch (error) {
    setNotice('error', esc(authErrorMessage(error)));
  } finally {
    button.disabled = false;
  }
}

async function onGoogle(button) {
  button.disabled = true;
  try {
    const sb = await getClient();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteBase()}login.html?next=${encodeURIComponent(next)}` },
    });
    if (error) throw error;
  } catch (error) {
    setNotice('error', esc(authErrorMessage(error)));
    button.disabled = false;
  }
}

root.addEventListener('click', (event) => {
  const modeBtn = event.target.closest('[data-mode]');
  if (modeBtn) {
    mode = modeBtn.dataset.mode;
    render();
    bindForm();
    return;
  }
  const googleBtn = event.target.closest('[data-google]');
  if (googleBtn) onGoogle(googleBtn);
});

function bindForm() {
  document.getElementById('auth-form').addEventListener('submit', onSubmit);
}

async function init() {
  if (!supabaseConfigured()) {
    root.innerHTML = alertBox('info', '登入功能尚未設定。');
    return;
  }
  const urlError = urlAuthError();
  // getSession also completes a Google / email-link login from the URL
  const session = await getSession().catch(() => null);
  if (session && !urlError) return goNext(session.user);
  render(urlError ? alertBox('error', esc(urlError)) : '');
  bindForm();
  if (urlError) history.replaceState(null, '', location.pathname + location.search);
}

init();
