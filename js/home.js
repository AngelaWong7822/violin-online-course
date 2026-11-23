// Home page: course catalogue.
import { listCourses, usingDemoData } from './data.js';
import { mountLayout, applyConfigLinks, esc, formatHKD, showError } from './layout.js';

function cover(course) {
  if (course.cover_url) {
    return `<img src="${esc(course.cover_url)}" alt="" class="h-44 w-full object-cover sm:h-48">`;
  }
  const tone = course.status === 'published' ? 'bg-ink' : 'bg-muted';
  return `
    <div class="${tone} flex h-44 items-end p-5 sm:h-48" aria-hidden="true">
      <span class="font-serif text-2xl font-bold text-cream/90">${esc(course.title)}</span>
    </div>`;
}

function courseCard(course) {
  const published = course.status === 'published';
  const tags = [
    `<span class="tag bg-cream text-[#6B5320]">${esc(course.audience_label)}</span>`,
    published && course.free_lessons > 0
      ? `<span class="tag bg-[#E3F0E3] text-[#2F5D3A]">首 ${course.free_lessons} 堂免費</span>`
      : '',
    !published ? '<span class="tag bg-[#EFE9DC] text-[#4A4136]">即將推出</span>' : '',
  ].join('');

  const footer = published
    ? `<div class="text-lg font-bold">${course.price_hkd != null ? formatHKD(course.price_hkd) : ''}</div>
       <a href="course.html?c=${encodeURIComponent(course.slug)}" class="btn-primary px-6 py-3 text-[15px]">了解課程</a>`
    : `<div class="text-[15px] font-medium text-muted">敬請期待</div>
       <button type="button" class="btn-outline" data-soon="推出通知">推出時通知我</button>`;

  return `
    <article class="card flex flex-col overflow-hidden">
      ${cover(course)}
      <div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div class="flex flex-wrap gap-2">${tags}</div>
        <h3 class="font-serif text-xl font-bold sm:text-[22px]">${esc(course.title)}</h3>
        <p class="flex-1 text-[15px] leading-7 text-muted">${esc(course.summary)}</p>
        <div class="mt-2 flex items-center justify-between gap-3">${footer}</div>
      </div>
    </article>`;
}

async function main() {
  mountLayout();
  applyConfigLinks();
  const list = document.getElementById('course-list');
  try {
    const courses = await listCourses();
    if (usingDemoData()) console.info('[violin-online-course] 使用示範資料（未設定 Supabase）');
    list.innerHTML =
      courses.map(courseCard).join('') +
      `<div class="flex min-h-[12rem] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#CDB27A] p-8 text-center text-[15px] text-muted">更多課程陸續推出</div>`;
  } catch (err) {
    console.error(err);
    showError(list, '暫時未能載入課程，請稍後再試。');
  }
}

main();
