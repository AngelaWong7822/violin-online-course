// Course catalogue access: Supabase when configured, demo data otherwise.
import { CONFIG } from './config.js';
import { DEMO_COURSES } from './demo-data.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const VISIBLE = ['coming_soon', 'published'];

let clientPromise = null;

export function usingDemoData() {
  return !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey;
}

async function client() {
  if (!clientPromise) {
    clientPromise = import(SUPABASE_ESM).then(({ createClient }) =>
      createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: { persistSession: false },
      }),
    );
  }
  return clientPromise;
}

const bySortOrder = (a, b) => a.sort_order - b.sort_order;

/** All courses a visitor may see, in display order (no lessons). */
export async function listCourses() {
  if (usingDemoData()) {
    return DEMO_COURSES.filter((c) => VISIBLE.includes(c.status)).sort(bySortOrder);
  }
  const sb = await client();
  const { data, error } = await sb
    .from('courses')
    .select('*')
    .in('status', VISIBLE)
    .order('sort_order');
  if (error) throw error;
  return data;
}

/** One course with its lessons sorted by number, or null if not visible. */
export async function getCourse(slug) {
  if (usingDemoData()) {
    const course = DEMO_COURSES.find((c) => c.slug === slug && VISIBLE.includes(c.status));
    return course ? { ...course, lessons: [...course.lessons].sort((a, b) => a.number - b.number) } : null;
  }
  const sb = await client();
  const { data, error } = await sb
    .from('courses')
    .select('*, lessons(number, title, points)')
    .eq('slug', slug)
    .in('status', VISIBLE)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  data.lessons = (data.lessons || []).sort((a, b) => a.number - b.number);
  return data;
}
