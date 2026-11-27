// Course detail page: course.html?c=<slug>
import { getCourse } from './data.js';
import { mountLayout, applyConfigLinks, esc, formatHKD, icons, showError, toast } from './layout.js';
import { myEnrollment, startCheckout } from './checkout.js';

const PAYMENT_METHODS = '信用卡 · Apple Pay · Google Pay · Alipay · WeChat Pay';

const freeRange = (n) => (n === 1 ? '第 1 堂' : `第 1–${n} 堂`);

function hero(c) {
  const published = c.status === 'published';
  const cta = published
    ? `<button type="button" class="btn-primary w-full sm:w-auto" data-soon="免費試看">${c.free_lessons > 0 ? `免費試看${freeRange(c.free_lessons)}` : '立即報讀'}</button>
       <a href="#outline" class="text-center text-[15px] font-medium">查看課程大綱</a>`
    : `<span class="tag bg-[#EFE9DC] px-3 py-1 text-sm text-[#4A4136]">即將推出</span>
       <button type="button" class="btn-outline" data-soon="推出通知">推出時通知我</button>`;
  return `
  <section class="bg-cream">
    <div class="container-page flex flex-wrap items-center gap-10 py-10 sm:py-16 lg:gap-14">
      <div class="flex min-w-0 flex-[1_1_26rem] flex-col gap-5">
        <a href="index.html#courses" class="text-sm font-medium no-underline">‹ 所有課程</a>
        <div class="text-sm font-medium tracking-[0.08em] text-[#6B5320]">${esc(c.audience_label)}</div>
        <h1 class="font-serif text-[34px] font-bold leading-tight sm:text-5xl">${esc(c.title)}</h1>
        <p class="max-w-[32em] text-base leading-8 text-[#4A4136] sm:text-lg">${esc(c.intro || c.summary)}</p>
        <div class="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">${cta}</div>
      </div>
      ${published ? `
      <div class="flex aspect-video min-w-0 flex-[1_1_26rem] flex-col items-center justify-center gap-3 rounded-2xl bg-ink">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-ink sm:h-20 sm:w-20">${icons.play}</span>
        <span class="text-sm text-cream">介紹影片即將上載</span>
      </div>` : ''}
    </div>
  </section>`;
}

function about(c) {
  if (!c.description && !c.fit_points.length) return '';
  const fit = c.fit_points.length
    ? `<div class="flex flex-col gap-4">
         <h2 class="section-title">適合對象</h2>
         <ul class="flex flex-col gap-3">
           ${c.fit_points.map((t) => `<li class="flex items-start gap-3 text-base leading-7">${icons.check}<span>${esc(t)}</span></li>`).join('')}
         </ul>
       </div>`
    : '';
  return `
  <section class="container-page grid gap-10 pt-14 sm:pt-20 lg:grid-cols-2">
    ${c.description ? `<div class="flex flex-col gap-4"><h2 class="section-title">課程簡介</h2><p class="text-base leading-8 text-[#4A4136]">${esc(c.description)}</p></div>` : ''}
    ${fit}
  </section>`;
}

function outline(c) {
  if (!c.lessons.length) return '';
  const cards = c.lessons.map((l) => {
    const free = l.number <= c.free_lessons;
    const points = (l.points || []).map((pt) =>
      `<li class="text-sm leading-6 text-muted"><span class="font-medium text-ink">${esc(pt.name)}</span>${pt.detail ? ` – ${esc(pt.detail)}` : ''}</li>`,
    ).join('');
    return `
      <article class="card flex flex-col gap-3 p-5">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream font-serif font-bold text-[#6B5320]">${l.number}</span>
          <h3 class="text-base font-bold">第 ${l.number} 堂 · ${esc(l.title)}</h3>
        </div>
        ${free ? '<span class="tag self-start bg-[#E3F0E3] text-[#2F5D3A]">免費試看</span>' : ''}
        <ul class="flex flex-col gap-1.5">${points}</ul>
      </article>`;
  }).join('');
  return `
  <section id="outline" class="container-page scroll-mt-6 pt-14 sm:pt-20">
    <h2 class="section-title mb-6 sm:mb-8">${c.lessons.length} 堂課程大綱</h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${cards}</div>
  </section>`;
}

function pricing(c) {
  if (c.status !== 'published' || c.price_hkd == null) return '';
  const bullets = [
    c.free_lessons > 0 && `${freeRange(c.free_lessons)}免費試看，註冊即可觀看`,
    `付款後 ${c.access_months} 個月內無限次觀看`,
    '每堂附練習重點 PDF',
  ].filter(Boolean);
  const after = c.after_steps.length
    ? `<div class="flex min-w-0 flex-[1_1_22rem] flex-col gap-4">
         <h2 class="section-title">完成課程後</h2>
         <ol class="card">
           ${c.after_steps.map((s, i) => `<li class="flex gap-4 border-b border-sand px-5 py-4 text-[15px] leading-7 last:border-0"><b class="text-gold-deep">${i + 1}</b><span>${esc(s)}</span></li>`).join('')}
         </ol>
       </div>`
    : '';
  return `
  <section id="price" class="container-page flex flex-wrap gap-6 pt-14 sm:pt-20">
    <div class="flex min-w-0 flex-[1_1_22rem] flex-col gap-4 rounded-3xl bg-ink p-7 text-ivory sm:p-9">
      <div class="text-sm tracking-[0.1em] text-[#E6CF94]">完整課程</div>
      <div class="flex items-baseline gap-2">
        <span class="font-serif text-4xl font-bold sm:text-5xl">${formatHKD(c.price_hkd)}</span>
        ${c.lessons.length ? `<span class="text-[15px] text-[#D9CFBD]">/ ${c.lessons.length} 堂</span>` : ''}
      </div>
      <ul class="flex flex-col gap-2 text-[15px] leading-7 text-[#EFE7D6]">
        ${bullets.map((b) => `<li>· ${esc(b)}</li>`).join('')}
      </ul>
      <div id="enroll-box" class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="button" class="btn-primary self-stretch sm:self-start" data-enroll="${esc(c.slug)}">立即報讀</button>
        ${c.free_lessons > 0 ? `<button type="button" class="text-[15px] font-medium text-[#E6CF94] underline-offset-4 hover:underline" data-soon="免費試看">先免費試看${freeRange(c.free_lessons)}</button>` : ''}
      </div>
      <div class="text-[13px] text-[#CFC4B0]">${PAYMENT_METHODS}</div>
    </div>
    ${after}
  </section>`;
}

function faqs(c) {
  if (!c.faqs.length) return '';
  const items = c.faqs.map((f) => {
    const answer = f.q.includes('退款')
      ? `${esc(f.a)} <a href="refund.html">退款政策</a>`
      : esc(f.a);
    return `
      <details class="faq card">
        <summary><span>${esc(f.q)}</span>${icons.chevron}</summary>
        <p class="-mt-1 px-5 pb-5 text-[15px] leading-7 text-muted">${answer}</p>
      </details>`;
  }).join('');
  return `
  <section id="faq" class="container-page pt-14 sm:pt-20">
    <h2 class="section-title mb-6">常見問題</h2>
    <div class="grid items-start gap-3 md:grid-cols-2">${items}</div>
  </section>`;
}

const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};

/** Enrol button: show "already enrolled" for owners, otherwise go to Stripe. */
async function setUpEnrol(course) {
  const box = document.getElementById('enroll-box');
  if (!box) return;

  let enrolment = null;
  try {
    enrolment = await myEnrollment(course.id);
  } catch (err) {
    console.error(err);
  }
  if (enrolment) {
    box.innerHTML = `
      <a href="my-courses.html" class="btn-primary self-stretch sm:self-start">已報讀 · 前往我的課程</a>
      <span class="text-[14px] text-[#E6CF94]">觀看期至 ${formatDate(enrolment.expires_at)}</span>`;
    return;
  }

  const go = async (button) => {
    button.disabled = true;
    const label = button.textContent;
    button.textContent = '正在前往付款頁面…';
    const message = await startCheckout(course.slug);
    if (message) {
      toast(message, 4000);
      button.disabled = false;
      button.textContent = label;
    }
  };

  box.querySelector('[data-enroll]').addEventListener('click', (event) => go(event.currentTarget));

  // Back from login / profile setup with &buy=1: continue to payment once.
  const params = new URLSearchParams(location.search);
  if (params.get('buy') === '1') {
    params.delete('buy');
    history.replaceState(null, '', `${location.pathname}?${params}#price`);
    document.getElementById('price')?.scrollIntoView({ behavior: 'instant' });
    go(box.querySelector('[data-enroll]'));
  }
}

async function main() {
  mountLayout();
  const root = document.getElementById('course-root');
  const slug = new URLSearchParams(location.search).get('c');
  try {
    const course = slug ? await getCourse(slug) : null;
    if (!course) {
      document.title = "找不到課程 | Tom's Violin Studio";
      root.innerHTML = `
        <div class="container-page flex flex-col items-center gap-4 py-24 text-center">
          <h1 class="section-title">找不到此課程</h1>
          <p class="text-muted">課程可能已下架或連結有誤。</p>
          <a href="index.html#courses" class="btn-primary">瀏覽所有課程</a>
        </div>`;
      return;
    }
    document.title = `${course.title} | Tom's Violin Studio 網上學堂`;
    root.innerHTML = hero(course) + about(course) + outline(course) + pricing(course) + faqs(course);
    applyConfigLinks(root);
    // Content renders after load, so honour #outline / #price / #faq links now.
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'instant' });
    if (course.status === 'published' && course.price_hkd != null) setUpEnrol(course);
  } catch (err) {
    console.error(err);
    showError(root, '暫時未能載入課程，請稍後再試。');
  }
}

main();
