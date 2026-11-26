// "My account": profile (name, WhatsApp, consent), password, sign out.
// With ?setup=1 it is the first-login form that must be completed.
import { mountLayout, esc } from './layout.js';
import { getClient } from './supabase.js';
import {
  requireUser, getProfile, signOut, safeNext, normalizeWhatsapp, splitWhatsapp, PHONE_CODES,
  authErrorMessage, supabaseConfigured,
} from './auth.js';

mountLayout();

const root = document.getElementById('page-root');
const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));

let user;
let profile;

const alert = (kind, message) =>
  `<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${esc(message)}</div>`;

function flash(id, kind, message) {
  const box = document.getElementById(id);
  box.innerHTML = message ? alert(kind, message) : '';
}

const phoneExample = (code) => PHONE_CODES.find((c) => c.code === code)?.example || '';

function profileFields() {
  const p = profile || {};
  const phone = splitWhatsapp(p.whatsapp);
  return `
    <div>
      <label class="form-label" for="name">姓名</label>
      <input class="form-input" id="name" name="name" required maxlength="80" autocomplete="name"
        value="${esc(p.name || user.user_metadata?.full_name || '')}">
    </div>
    <div>
      <label class="form-label" for="whatsapp">WhatsApp 電話號碼</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <select class="form-input pr-8 sm:w-auto sm:shrink-0" id="phone-code" name="phoneCode" aria-label="國家／地區號碼">
          ${PHONE_CODES.map((c) => `<option value="${c.code}" ${c.code === phone.code ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select>
        <input class="form-input min-w-0 flex-1" id="whatsapp" name="whatsapp" type="tel" required inputmode="tel" autocomplete="tel-national"
          placeholder="例如 ${esc(phoneExample(phone.code))}" value="${esc(phone.number)}">
      </div>
      <p class="form-hint">請選擇國家／地區，再輸入電話號碼。</p>
    </div>
    <div class="rounded-xl bg-sand p-4 text-sm leading-6">
      <p>Tom's Violin Studio 擬使用閣下的姓名、電郵地址及 WhatsApp 電話號碼，向閣下發送小提琴課程（包括網上及實體課程）的資訊、優惠及活動推廣。未經閣下同意，本工作室不會如此使用閣下的個人資料。如閣下不同意，請在下方加上剔號。詳情請參閱<a href="privacy.html" target="_blank">私隱政策</a>。</p>
      <label class="mt-3 flex items-start gap-3 font-medium">
        <input type="checkbox" name="optout" class="mt-1 h-4 w-4 shrink-0 accent-[#B8913A]" ${profile && !p.marketing_consent ? 'checked' : ''}>
        <span>本人反對 Tom's Violin Studio 將本人的個人資料用於上述直接促銷用途。</span>
      </label>
    </div>`;
}

function readProfileForm(form) {
  const name = form.name.value.trim();
  const whatsapp = normalizeWhatsapp(form.phoneCode.value, form.whatsapp.value);
  if (!name) return { error: '請輸入姓名。' };
  if (!form.whatsapp.value.trim()) return { error: '請輸入 WhatsApp 電話號碼。' };
  if (!whatsapp) {
    return {
      error: form.phoneCode.value === 'other'
        ? 'WhatsApp 電話號碼格式不正確。請以「+」開始，輸入國家／地區號碼及電話號碼。'
        : `WhatsApp 電話號碼格式不正確，例如：${phoneExample(form.phoneCode.value)}。`,
    };
  }
  return { row: { id: user.id, name, whatsapp, marketing_consent: !form.optout.checked } };
}

async function saveProfile(row) {
  const sb = await getClient();
  const { data, error } = await sb.from('profiles').upsert(row).select().single();
  if (error) throw error;
  profile = data;
}

/* ---------- first login ---------- */

function renderSetup() {
  root.innerHTML = `
    <h1 class="font-serif text-3xl font-bold">完成帳戶資料</h1>
    <p class="mt-2 text-muted">歡迎加入！請填寫以下資料，以便我們就課程安排與閣下聯絡。</p>
    <form id="profile-form" class="card mt-8 space-y-5 p-6 sm:p-8" novalidate>
      <div id="profile-notice" class="empty:hidden"></div>
      <div>
        <span class="form-label">電郵地址</span>
        <p class="text-[15px] text-muted">${esc(user.email)}</p>
      </div>
      ${profileFields()}
      <button type="submit" class="btn-primary btn-block">儲存並繼續</button>
    </form>`;

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const { row, error } = readProfileForm(form);
    if (error) return flash('profile-notice', 'error', error);
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await saveProfile(row);
      location.replace(next);
    } catch (err) {
      flash('profile-notice', 'error', authErrorMessage(err));
      button.disabled = false;
    }
  });
}

/* ---------- normal account page ---------- */

function renderAccount() {
  const usesPassword = (user.app_metadata?.providers || [user.app_metadata?.provider]).includes('email');
  const viaGoogle = (user.app_metadata?.providers || []).includes('google');

  root.innerHTML = `
    <h1 class="font-serif text-3xl font-bold">我的帳戶</h1>
    <p class="mt-2 text-muted">${esc(user.email)}${viaGoogle ? '（Google 帳戶）' : ''}</p>

    <section class="card mt-8 p-6 sm:p-8" aria-labelledby="profile-title">
      <h2 id="profile-title" class="font-serif text-xl font-bold">個人資料</h2>
      <form id="profile-form" class="mt-5 space-y-5" novalidate>
        <div id="profile-notice" class="empty:hidden"></div>
        ${profileFields()}
        <button type="submit" class="btn-primary">儲存</button>
      </form>
    </section>

    ${usesPassword ? `
    <section class="card mt-6 p-6 sm:p-8" aria-labelledby="password-title">
      <h2 id="password-title" class="font-serif text-xl font-bold">更改密碼</h2>
      <form id="password-form" class="mt-5 space-y-5" novalidate>
        <div id="password-notice" class="empty:hidden"></div>
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="form-label" for="new-password">新密碼</label>
            <input class="form-input" id="new-password" type="password" minlength="8" autocomplete="new-password">
          </div>
          <div>
            <label class="form-label" for="new-password2">確認新密碼</label>
            <input class="form-input" id="new-password2" type="password" minlength="8" autocomplete="new-password">
          </div>
        </div>
        <button type="submit" class="btn-outline">更新密碼</button>
      </form>
    </section>` : ''}

    <div class="mt-8 flex flex-wrap items-center justify-between gap-4">
      <a href="my-courses.html">← 返回我的課程</a>
      <button type="button" class="btn-outline" data-signout>登出</button>
    </div>`;

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const { row, error } = readProfileForm(form);
    if (error) return flash('profile-notice', 'error', error);
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await saveProfile(row);
      const saved = splitWhatsapp(profile.whatsapp);
      form.phoneCode.value = saved.code;
      form.whatsapp.value = saved.number;
      flash('profile-notice', 'ok', '資料已儲存。');
    } catch (err) {
      flash('profile-notice', 'error', authErrorMessage(err));
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('password-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = document.getElementById('new-password').value;
    if (password.length < 8) return flash('password-notice', 'error', '密碼最少須有 8 個字元。');
    if (password !== document.getElementById('new-password2').value) {
      return flash('password-notice', 'error', '兩次輸入的密碼不一致。');
    }
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      const sb = await getClient();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      form.reset();
      flash('password-notice', 'ok', '密碼已更新。');
    } catch (err) {
      flash('password-notice', 'error', authErrorMessage(err));
    } finally {
      button.disabled = false;
    }
  });

  root.querySelector('[data-signout]').addEventListener('click', signOut);
}

// Placeholder follows the chosen country
document.addEventListener('change', (event) => {
  if (event.target.id !== 'phone-code') return;
  document.getElementById('whatsapp').placeholder = `例如 ${phoneExample(event.target.value)}`;
});

async function init() {
  if (!supabaseConfigured()) {
    root.innerHTML = alert('info', '登入功能尚未設定。');
    return;
  }
  user = await requireUser();
  try {
    profile = await getProfile(user.id);
    if (!profile || params.get('setup') === '1') {
      if (profile) return location.replace(next); // already done
      return renderSetup();
    }
    renderAccount();
  } catch (err) {
    root.innerHTML = alert('error', `未能載入帳戶資料：${authErrorMessage(err)}`);
  }
}

init();
