// Set a new password after following the reset link from the email.
import { mountLayout, esc } from './layout.js';
import { getClient } from './supabase.js';
import { supabaseConfigured, getSession, authErrorMessage, urlAuthError } from './auth.js';

mountLayout();
const root = document.getElementById('page-root');

const heading = '<h1 class="mb-8 text-center font-serif text-3xl font-bold">重設密碼</h1>';

function showMessage(kind, message, link = '') {
  root.innerHTML = `${heading}
    <div class="card space-y-5 p-6 sm:p-8">
      <div class="alert alert-${kind}">${message}</div>
      ${link}
    </div>`;
}

function renderForm() {
  root.innerHTML = `${heading}
    <div class="card p-6 sm:p-8">
      <div id="notice" class="mb-5 empty:hidden"></div>
      <form id="reset-form" class="space-y-5" novalidate>
        <div>
          <label class="form-label" for="password">新密碼</label>
          <input class="form-input" id="password" type="password" required minlength="8" autocomplete="new-password">
          <p class="form-hint">最少 8 個字元。</p>
        </div>
        <div>
          <label class="form-label" for="password2">確認新密碼</label>
          <input class="form-input" id="password2" type="password" required minlength="8" autocomplete="new-password">
        </div>
        <button type="submit" class="btn-primary btn-block">儲存新密碼</button>
      </form>
    </div>`;

  document.getElementById('reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = document.getElementById('notice');
    const password = form.password.value;
    const fail = (msg) => { notice.innerHTML = `<div class="alert alert-error" role="alert">${esc(msg)}</div>`; };
    if (password.length < 8) return fail('密碼最少須有 8 個字元。');
    if (password !== form.password2.value) return fail('兩次輸入的密碼不一致。');

    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      const sb = await getClient();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      showMessage('ok', '密碼已更新，閣下已經登入。', '<a href="my-courses.html" class="btn-primary btn-block">前往我的課程</a>');
    } catch (error) {
      fail(authErrorMessage(error));
      button.disabled = false;
    }
  });
}

async function init() {
  if (!supabaseConfigured()) return showMessage('info', '登入功能尚未設定。');
  const urlError = urlAuthError();
  const session = await getSession().catch(() => null);
  if (urlError || !session) {
    return showMessage(
      'error',
      esc(urlError || '重設連結無效或已失效。'),
      '<a href="login.html?mode=forgot" class="btn-primary btn-block">重新申請重設密碼</a>',
    );
  }
  renderForm();
}

init();
