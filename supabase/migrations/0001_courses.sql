-- 0001_courses.sql
-- Phase 1: public course catalogue (courses + lesson outlines).
-- Run once in the Supabase SQL Editor of the NEW online-course project.
--
-- Public visitors (anon key) can only READ courses whose status is
-- 'coming_soon' or 'published', and lesson outlines of published courses.
-- Nobody can write through the API; edit rows in the Table Editor (admin).
-- Video IDs / PDFs are NOT stored here; phase 2 adds a protected table.

create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title          text not null,
  audience_label text not null default '',          -- e.g. 兒童 · 4.5–10 歲
  summary        text not null default '',          -- one line for course cards
  description    text not null default '',          -- paragraph on the course page
  intro          text not null default '',          -- hero sentence on the course page
  price_hkd      integer check (price_hkd is null or price_hkd >= 0),
  free_lessons   integer not null default 0 check (free_lessons >= 0),
  access_months  integer not null default 12 check (access_months > 0),
  status         text not null default 'draft'
                 check (status in ('draft', 'coming_soon', 'published')),
  sort_order     integer not null default 0,
  fit_points     jsonb not null default '[]'::jsonb,  -- ["…", "…"]
  after_steps    jsonb not null default '[]'::jsonb,  -- ["…", "…"]
  faqs           jsonb not null default '[]'::jsonb,  -- [{"q": "…", "a": "…"}]
  cover_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.lessons (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  number     integer not null check (number > 0),
  title      text not null,
  points     jsonb not null default '[]'::jsonb,     -- [{"name": "…", "detail": "…"}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, number)
);

create index if not exists lessons_course_idx on public.lessons(course_id, number);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists courses_touch on public.courses;
create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

drop trigger if exists lessons_touch on public.lessons;
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- API access. The project does NOT auto-grant new tables to the Data API,
-- so grant read-only access explicitly (RLS below still filters the rows).
grant usage on schema public to anon, authenticated;
grant select on public.courses, public.lessons to anon, authenticated;

-- Row level security: read-only public catalogue
alter table public.courses enable row level security;
alter table public.lessons enable row level security;

drop policy if exists "public can read visible courses" on public.courses;
create policy "public can read visible courses" on public.courses
  for select to anon, authenticated
  using (status in ('coming_soon', 'published'));

drop policy if exists "public can read lessons of published courses" on public.lessons;
create policy "public can read lessons of published courses" on public.lessons
  for select to anon, authenticated
  using (exists (
    select 1 from public.courses c
    where c.id = lessons.course_id and c.status = 'published'
  ));

-- ------------------------------------------------------------------
-- Seed data (same content as js/demo-data.js). Safe to re-run.
-- ------------------------------------------------------------------
insert into public.courses
  (slug, title, audience_label, summary, intro, description, price_hkd, free_lessons,
   access_months, status, sort_order, fit_points, after_steps, faqs)
values
  ('kids-8', '小提琴啟蒙 8 堂', '兒童 · 4.5–10 歲',
   '鈴木教學法，家長陪練，打好持琴、持弓、按弦基本功。',
   '由 Tom sir 親自示範，家長在家陪伴孩子循序漸進，打好持琴、持弓及按弦的基本功。',
   '本課程專為 4.5–10 歲兒童設計，採用鈴木教學法（Suzuki Method），以自然、愉悅的方式引導孩子學習小提琴。課程強調聽力訓練、模仿及重複練習，讓孩子像學習母語一樣掌握音樂技能，同時培養專注力、紀律和藝術感受。',
   1500, 2, 12, 'published', 10,
   '["4.5–10 歲、未曾學習小提琴的兒童", "家長願意每日陪伴練習 15–20 分鐘", "希望先在家試學，再決定是否報讀實體課程"]',
   '["完成 8 堂網上課程", "預約 Tom sir 評估姿勢及程度", "合格者可插班加入實體小組班，繼續進階學習"]',
   '[{"q": "孩子應使用甚麼尺寸的小提琴？", "a": "[待 Tom sir 補充：按年齡及手臂長度選擇尺寸的建議]"},
     {"q": "家長沒有音樂背景，可以陪練嗎？", "a": "可以。每堂均附家長陪練提示，說明需要留意的重點及常見錯誤。"},
     {"q": "可使用手機或電腦觀看嗎？", "a": "可以。課程可透過手機、平板或電腦的瀏覽器觀看，毋須安裝任何程式。"},
     {"q": "付款後可以退款嗎？", "a": "詳情請參閱退款政策。"}]'),
  ('adult-beginner', '成人初學課程', '成人 · 初學',
   '[課程內容待定：例如適合初學不久、希望鞏固基礎的成人]',
   '', '', null, 0, 12, 'coming_soon', 20, '[]', '[]', '[]')
on conflict (slug) do nothing;

insert into public.lessons (course_id, number, title, points)
select c.id, l.number, l.title, l.points::jsonb
from public.courses c
join (values
  (1, '認識小提琴', '[{"name":"認識小提琴","detail":"認識小提琴各個部位和用途"},{"name":"姿勢訓練","detail":"練習演奏及休息姿勢，以正確姿勢持琴"},{"name":"節奏與音感","detail":"透過拍手、唱音培養基礎樂感，提升音樂認知"}]'),
  (2, '持弓練習', '[{"name":"持弓練習","detail":"學習正確握弓法"},{"name":"複習持琴","detail":"鞏固姿勢，確保穩定與舒適"},{"name":"節奏音感","detail":"在小提琴上嘗試，提升聽辨與節拍感"}]'),
  (3, '按弦入門', '[{"name":"放鬆練習","detail":"學習身體放鬆"},{"name":"複習姿勢","detail":"鞏固持琴與持弓基礎動作"},{"name":"節奏及音感訓練","detail":""},{"name":"按弦入門","detail":"開始用 1–2 指練習按弦發音"}]'),
  (4, '音階練習', '[{"name":"複習鞏固","detail":"強化已學技巧（持琴、持弓、按弦）"},{"name":"音階練習","detail":"開始基礎拉奏訓練，培養音準與流暢度"}]'),
  (5, '第一首樂曲', '[{"name":"綜合複習","detail":"鞏固持琴、持弓、按弦等基礎技巧"},{"name":"樂曲練習","detail":"開始練習《Mary Had a Little Lamb》，應用所學技能"}]'),
  (6, '《Baby Shark》與變奏', '[{"name":"樂曲學習","detail":"掌握熱門兒歌《Baby Shark》基礎旋律"},{"name":"變奏練習","detail":"初步嘗試簡單變奏，培養音樂表現力"},{"name":"技巧應用","detail":"結合持弓、按弦等基礎技能進行綜合訓練"}]'),
  (7, '《小星星》與換弦', '[{"name":"趣味樂曲","detail":"學習演奏《小星星》"},{"name":"節奏強化","detail":"透過重複樂句訓練穩定拍感"},{"name":"換弦練習","detail":"結合簡單換弦動作鞏固基本功"}]'),
  (8, '綜合演奏', '[{"name":"綜合演奏","detail":"串連所學曲目"},{"name":"趣味複習","detail":"透過遊戲化方式鞏固全部基礎技巧"},{"name":"節奏強化","detail":"透過重複樂句訓練穩定拍感"},{"name":"評估及證書","detail":"評估合格後頒發電子證書"}]')
) as l(number, title, points) on true
where c.slug = 'kids-8'
on conflict (course_id, number) do nothing;
