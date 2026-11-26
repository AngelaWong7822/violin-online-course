// "My account": profile (name, WhatsApp, consent), learners, password, sign out.
// With ?setup=1 it is the first-login form that must be completed.
import { mountLayout, esc } from './layout.js';
import { getClient } from './supabase.js';
import {
  requireUser, getProfile, signOut, safeNext, normalizeWhatsapp, displayWhatsapp,
  authErrorMessage, supabaseConfigured,
} from './auth.js';

mountLayout();

const root = document.getElementById('page-root');
const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));
const thisYear = new Date().getFullYear();

let user;
let profile;
let learners = [];
let editingId = null;

const alert = (kind, message) =>
  `<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${esc(message)}</div>`;

function flash(id, kind, message) {
  const box = document.getElementById(id);
  box.innerHTML = message ? alert(kind, message) : '';
}

function profileFields() {
  const p = profile || {};
  return `
    <div>
      <label class="form-label" for="name">姓名</label>
      <input class="form-input" id="name" name="name" required maxlength="80" autocomplete="name"
        value="${esc(p.name || user.user_metadata?.full_name || '')}">
      <p class="form-hint">家長報讀兒童課程，請填寫家長姓名；學員資料可於「我的帳戶」頁面另行登記。</p>
    </div>
    <div>
      <label class="form-label" for="whatsapp">WhatsApp 電話號碼</label>
      <input class="form-input" id="whatsapp" name="whatsapp" type="tel" required inputmode="tel" autocomplete="tel"
        placeholder="例如 9123 4567" value="${esc(displayWhatsapp(p.whatsapp))}">
      <p class="form-hint">香港號碼可直接輸入 8 位數字；其他地區請加上國家／地區號碼，例如 +86 138 0013 8000。</p>
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
  const whatsapp = normalizeWhatsapp(form.whatsapp.value);
  if (!name) return { error: '請輸入姓名。' };
  if (!form.whatsapp.value.trim()) return { error: '請輸入 WhatsApp 電話號碼。' };
  if (!whatsapp) return { error: 'WhatsApp 電話號碼格式不正確。香港號碼請輸入 8 位數字。' };
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

function learnerRows() {
  if (!learners.length) {
    return '<p class="text-sm text-muted">尚未登記學員。</p>';
  }
  return `<ul class="divide-y divide-line">${learners.map((l) => `
    <li class="flex items-center justify-between gap-4 py-3">
      <div>
        <div class="font-medium">${esc(l.name)}</div>
        ${l.birth_year ? `<div class="text-sm text-muted">${l.birth_year} 年出生</div>` : ''}
      </div>
      <div class="flex shrink-0 gap-2">
        <button type="button" class="btn-outline px-4 py-1.5" data-edit="${l.id}">修改</button>
        <button type="button" class="btn-outline px-4 py-1.5" data-delete="${l.id}">刪除</button>
      </div>
    </li>`).join('')}</ul>`;
}

function birthYearOptions(selected) {
  const years = [];
  for (let y = thisYear - 3; y >= thisYear - 90; y -= 1) {
    years.push(`<option value="${y}" ${y === selected ? 'selected' : ''}>${y}</option>`);
  }
  return `<option value="">不提供</option>${years.join('')}`;
}

function learnerForm() {
  const l = learners.find((x) => x.id === editingId) || {};
  return `
    <form id="learner-form" class="mt-5 grid gap-4 rounded-xl bg-sand p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end" novalidate>
      <div>
        <label class="form-label" for="learner-name">${editingId ? '修改學員姓名' : '新增學員姓名'}</label>
        <input class="form-input" id="learner-name" name="name" required maxlength="80" value="${esc(l.name || '')}">
      </div>
      <div>
        <label class="form-label" for="learner-year">出生年份</label>
        <select class="form-input" id="learner-year" name="year">${birthYearOptions(l.birth_year)}</select>
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary px-6 py-3">${editingId ? '更新' : '新增'}</button>
        ${editingId ? '<button type="button" class="btn-outline py-3" data-cancel>取消</button>' : ''}
      </div>
    </form>`;
}

function renderLearners() {
  document.getElementById('learner-list').innerHTML = learnerRows();
  document.getElementById('learner-form-slot').innerHTML = learnerForm();
}

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

    <section class="card mt-6 p-6 sm:p-8" aria-labelledby="learner-title">
      <h2 id="learner-title" class="font-serif text-xl font-bold">學員</h2>
      <p class="mt-1 text-sm text-muted">如由家長代子女報讀，請登記學習課程的子女。一個帳戶可登記多於一位學員。</p>
      <div id="learner-notice" class="mt-4 empty:hidden"></div>
      <div id="learner-list" class="mt-3"></div>
      <div id="learner-form-slot"></div>
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

  renderLearners();

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const { row, error } = readProfileForm(form);
    if (error) return flash('profile-notice', 'error', error);
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await saveProfile(row);
      form.whatsapp.value = displayWhatsapp(profile.whatsapp);
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

  root.addEventListener('submit', onLearnerSubmit);
  root.addEventListener('click', onLearnerClick);
}

async function loadLearners() {
  const sb = await getClient();
  const { data, error } = await sb.from('learners').select('*').order('created_at');
  if (error) throw error;
  learners = data;
}

async function onLearnerSubmit(event) {
  if (event.target.id !== 'learner-form') return;
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  if (!name) return flash('learner-notice', 'error', '請輸入學員姓名。');
  const row = { name, birth_year: form.year.value ? Number(form.year.value) : null };
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    const sb = await getClient();
    const { error } = editingId
      ? await sb.from('learners').update(row).eq('id', editingId)
      : await sb.from('learners').insert(row);
    if (error) throw error;
    flash('learner-notice', 'ok', editingId ? '學員資料已更新。' : '已新增學員。');
    editingId = null;
    await loadLearners();
    renderLearners();
  } catch (err) {
    flash('learner-notice', 'error', authErrorMessage(err));
    button.disabled = false;
  }
}

async function onLearnerClick(event) {
  const target = event.target;
  if (target.closest('[data-signout]')) return signOut();
  if (target.closest('[data-cancel]')) {
    editingId = null;
    return renderLearners();
  }
  const edit = target.closest('[data-edit]');
  if (edit) {
    editingId = edit.dataset.edit;
    renderLearners();
    document.getElementById('learner-name').focus();
    return;
  }
  const del = target.closest('[data-delete]');
  if (del) {
    const learner = learners.find((l) => l.id === del.dataset.delete);
    if (!learner || !window.confirm(`確定刪除學員「${learner.name}」？`)) return;
    try {
      const sb = await getClient();
      const { error } = await sb.from('learners').delete().eq('id', learner.id);
      if (error) throw error;
      if (editingId === learner.id) editingId = null;
      flash('learner-notice', 'ok', '已刪除學員。');
      await loadLearners();
      renderLearners();
    } catch (err) {
      flash('learner-notice', 'error', authErrorMessage(err));
    }
  }
}

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
    await loadLearners();
    renderAccount();
  } catch (err) {
    root.innerHTML = alert('error', `未能載入帳戶資料：${authErrorMessage(err)}`);
  }
}

init();
