// Shared header, footer, "coming soon" notice and small helpers.
import { CONFIG } from './config.js';
import { sessionStorageKey } from './supabase.js';

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const formatHKD = (n) => `HK$${Number(n).toLocaleString('en-HK')}`;

export const icons = {
  check: '<svg class="h-6 w-6 shrink-0 text-gold-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg class="h-7 w-7" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  chevron: '<svg class="h-5 w-5 shrink-0 text-gold-deep transition-transform" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const logo = `
  <a href="index.html" class="flex items-center gap-3 text-ink no-underline">
    <img src="img/logo.png" alt="" width="40" height="40" class="h-10 w-10">
    <span class="font-serif text-base font-bold sm:text-lg">Tom's Violin Studio</span>
  </a>`;

/**
 * Logged in = a saved Supabase session exists in this browser. Checked
 * without loading supabase-js so plain pages stay light; member pages verify
 * the session properly.
 */
function looksLoggedIn() {
  const key = sessionStorageKey();
  try {
    return Boolean(key && localStorage.getItem(key));
  } catch {
    return false;
  }
}

const accountIcon = '<svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function accountLinks() {
  if (!looksLoggedIn()) {
    const next = encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search);
    return `<a href="login.html?next=${next}" class="btn-outline">登入</a>`;
  }
  return `
        <a href="my-courses.html" class="btn-outline">我的課程</a>
        <a href="account.html" class="-ml-3 flex h-10 w-10 items-center justify-center rounded-full text-ink no-underline hover:bg-cream/60" aria-label="我的帳戶" title="我的帳戶">${accountIcon}</a>`;
}

function header() {
  return `
  <header class="border-b border-line bg-ivory">
    <div class="container-page flex items-center justify-between gap-4 py-3.5">
      ${logo}
      <nav aria-label="主要選單" class="flex items-center gap-7 text-[15px]">
        <a href="index.html#courses" class="hidden text-ink no-underline hover:text-gold-deep md:inline">所有課程</a>
        <a href="index.html#about" class="hidden text-ink no-underline hover:text-gold-deep md:inline">關於 Tom sir</a>
        <a href="index.html#offline" class="hidden text-ink no-underline hover:text-gold-deep md:inline">實體課程</a>
        ${accountLinks()}
      </nav>
    </div>
  </header>`;
}

function footer() {
  const social = [
    CONFIG.youtubeUrl && `<a href="${esc(CONFIG.youtubeUrl)}" target="_blank" rel="noopener">YouTube</a>`,
    CONFIG.instagramUrl && `<a href="${esc(CONFIG.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>`,
  ].filter(Boolean).join('');
  return `
  <footer class="mt-20 bg-cream">
    <div class="container-page flex flex-col gap-4 py-9 text-sm text-[#4A4136] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="font-serif text-base font-bold text-ink">Tom's Violin Studio</div>
        <div class="mt-1">© ${new Date().getFullYear()} Tom's Violin Studio</div>
      </div>
      <nav aria-label="頁尾連結" class="flex flex-wrap gap-x-6 gap-y-2">
        <a href="terms.html">條款及細則</a>
        <a href="privacy.html">私隱政策</a>
        <a href="refund.html">退款政策</a>
        ${social}
      </nav>
    </div>
  </footer>`;
}

/** Small notice for features that arrive in later phases. */
export function toast(message, ms = 2600) {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.setAttribute('role', 'status');
    box.className =
      'fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-xl bg-ink px-5 py-3.5 text-center text-sm text-ivory shadow-lg transition-opacity';
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.style.opacity = '1';
  clearTimeout(box._timer);
  box._timer = setTimeout(() => { box.style.opacity = '0'; }, ms);
}

export function mountLayout() {
  document.getElementById('site-header').innerHTML = header();
  document.getElementById('site-footer').innerHTML = footer();
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-soon]');
    if (!trigger) return;
    event.preventDefault();
    toast(`${trigger.dataset.soon}即將推出，敬請期待。`);
  });
}

/** Fill links/text that come from config (WhatsApp, contact email). */
export function applyConfigLinks(root = document) {
  root.querySelectorAll('[data-whatsapp]').forEach((el) => {
    if (CONFIG.whatsappUrl) {
      el.href = CONFIG.whatsappUrl;
      el.target = '_blank';
      el.rel = 'noopener';
    } else {
      el.dataset.soon = 'WhatsApp 查詢';
    }
  });
  root.querySelectorAll('[data-contact-email]').forEach((el) => {
    el.textContent = CONFIG.contactEmail || '[聯絡電郵待定]';
  });
}

export function showError(container, message) {
  container.innerHTML = `<div class="card p-6 text-center text-muted">${esc(message)}</div>`;
}
