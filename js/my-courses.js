// "My courses": enrolled courses plus courses available as a free trial.
import { mountLayout, esc } from './layout.js';
import { getClient } from './supabase.js';
import { requireProfile, supabaseConfigured, authErrorMessage } from './auth.js';
import { listCourses } from './data.js';

mountLayout();
const root = document.getElementById('page-root');

const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};

async function loadEnrollments() {
  const sb = await getClient();
  const { data, error } = await sb
    .from('enrollments')
    .select('id, status, starts_at, expires_at, stripe_checkout_session_id, courses(id, slug, title, audience_label)')
    .eq('status', 'active')
    .order('expires_at', { ascending: false });
  if (error) throw error;
  return data.filter((e) => e.courses);
}

function enrolledCard(e) {
  const expired = new Date(e.expires_at) < new Date();
  const c = e.courses;
  return `
    <article class="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="text-sm text-muted">${esc(c.audience_label)}</div>
        <h3 class="mt-1 font-serif text-xl font-bold">${esc(c.title)}</h3>
        <p class="mt-2 text-sm ${expired ? 'text-[#8A2E1C]' : 'text-muted'}">
          ${expired ? `觀看期已於 ${formatDate(e.expires_at)} 屆滿` : `觀看期至 ${formatDate(e.expires_at)}`}
        </p>
      </div>
      ${expired
        ? `<a href="course.html?c=${encodeURIComponent(c.slug)}" class="btn-outline shrink-0">查看課程</a>`
        : '<button type="button" class="btn-primary shrink-0" data-soon="上課功能">進入課程</button>'}
    </article>`;
}

function trialCard(c) {
  return `
    <article class="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted">${esc(c.audience_label)}</span>
          <span class="tag bg-cream text-gold-deep">首 ${c.free_lessons} 堂免費</span>
        </div>
        <h3 class="mt-1 font-serif text-xl font-bold">${esc(c.title)}</h3>
        <p class="mt-2 text-sm text-muted">${esc(c.summary)}</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <a href="course.html?c=${encodeURIComponent(c.slug)}" class="btn-outline">課程介紹</a>
        <button type="button" class="btn-primary px-5 py-2.5 text-sm" data-soon="免費試看">免費試看</button>
      </div>
    </article>`;
}

async function init() {
  if (!supabaseConfigured()) {
    root.innerHTML = '<div class="alert alert-info">登入功能尚未設定。</div>';
    return;
  }
  const { profile } = await requireProfile();
  const paidSession = new URLSearchParams(location.search).get('paid'); // Stripe session id
  if (paidSession) history.replaceState(null, '', location.pathname);
  try {
    let enrollments = await loadEnrollments();
    // Stripe's confirmation can arrive a few seconds after the redirect: wait for it.
    const opened = () => enrollments.some((e) => e.stripe_checkout_session_id === paidSession);
    for (let i = 0; paidSession && !opened() && i < 8; i += 1) {
      root.innerHTML = '<div class="alert alert-info">已收到付款，正在開通課程，請稍候…</div>';
      await new Promise((r) => setTimeout(r, 2000));
      enrollments = await loadEnrollments();
    }
    const courses = await listCourses();
    const banner = !paidSession ? ''
      : opened()
        ? '<div class="alert alert-ok mt-6">付款成功，課程已開通。</div>'
        : '<div class="alert alert-info mt-6">已收到閣下的付款，課程開通需時，請於數分鐘後重新整理此頁。如仍未顯示，請與我們聯絡。</div>';
    const enrolledIds = new Set(enrollments.map((e) => e.courses.id));
    const trials = courses.filter((c) => c.status === 'published' && c.free_lessons > 0 && !enrolledIds.has(c.id));

    root.innerHTML = `
      <h1 class="font-serif text-3xl font-bold">我的課程</h1>
      <p class="mt-2 text-muted">歡迎回來，${esc(profile.name)}。</p>
      ${banner}

      <section class="mt-10" aria-labelledby="enrolled-title">
        <h2 id="enrolled-title" class="mb-4 font-serif text-xl font-bold">已報讀課程</h2>
        ${enrollments.length
          ? `<div class="space-y-4">${enrollments.map(enrolledCard).join('')}</div>`
          : '<div class="card p-6 text-muted">閣下尚未報讀任何課程。可先免費試看，或<a href="index.html#courses">瀏覽所有課程</a>。</div>'}
      </section>

      ${trials.length ? `
      <section class="mt-12" aria-labelledby="trial-title">
        <h2 id="trial-title" class="mb-4 font-serif text-xl font-bold">免費試看</h2>
        <div class="space-y-4">${trials.map(trialCard).join('')}</div>
      </section>` : ''}`;
  } catch (err) {
    root.innerHTML = `<div class="alert alert-error">未能載入課程：${esc(authErrorMessage(err))}</div>`;
  }
}

init();
