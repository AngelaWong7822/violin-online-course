// Demo catalogue used until Supabase is configured in js/config.js.
// Same shape and content as the seed in supabase/migrations/0001_courses.sql.

const p = (name, detail = '') => ({ name, detail });

export const DEMO_COURSES = [
  {
    slug: 'kids-8',
    title: '小提琴啟蒙 8 堂',
    audience_label: '兒童 · 4.5–10 歲',
    summary: '鈴木教學法，家長陪練，打好持琴、持弓、按弦基本功。',
    intro: '由 Tom sir 親自示範，家長在家陪伴孩子循序漸進，打好持琴、持弓及按弦的基本功。',
    description:
      '本課程專為 4.5–10 歲兒童設計，採用鈴木教學法（Suzuki Method），以自然、愉悅的方式引導孩子學習小提琴。課程強調聽力訓練、模仿及重複練習，讓孩子像學習母語一樣掌握音樂技能，同時培養專注力、紀律和藝術感受。',
    price_hkd: 1500,
    free_lessons: 2,
    access_months: 12,
    status: 'published',
    sort_order: 10,
    fit_points: [
      '4.5–10 歲、未曾學習小提琴的兒童',
      '家長願意每日陪伴練習 15–20 分鐘',
      '希望先在家試學，再決定是否報讀實體課程',
    ],
    after_steps: [
      '完成 8 堂網上課程',
      '預約 Tom sir 評估姿勢及程度',
      '合格者可插班加入實體小組班，繼續進階學習',
    ],
    faqs: [
      { q: '孩子應使用甚麼尺寸的小提琴？', a: '[待 Tom sir 補充：按年齡及手臂長度選擇尺寸的建議]' },
      { q: '家長沒有音樂背景，可以陪練嗎？', a: '可以。每堂均附家長陪練提示，說明需要留意的重點及常見錯誤。' },
      { q: '可使用手機或電腦觀看嗎？', a: '可以。課程可透過手機、平板或電腦的瀏覽器觀看，毋須安裝任何程式。' },
      { q: '付款後可以退款嗎？', a: '詳情請參閱退款政策。' },
    ],
    cover_url: null,
    lessons: [
      { number: 1, title: '認識小提琴', points: [p('認識小提琴', '認識小提琴各個部位和用途'), p('姿勢訓練', '練習演奏及休息姿勢，以正確姿勢持琴'), p('節奏與音感', '透過拍手、唱音培養基礎樂感，提升音樂認知')] },
      { number: 2, title: '持弓練習', points: [p('持弓練習', '學習正確握弓法'), p('複習持琴', '鞏固姿勢，確保穩定與舒適'), p('節奏音感', '在小提琴上嘗試，提升聽辨與節拍感')] },
      { number: 3, title: '按弦入門', points: [p('放鬆練習', '學習身體放鬆'), p('複習姿勢', '鞏固持琴與持弓基礎動作'), p('節奏及音感訓練'), p('按弦入門', '開始用 1–2 指練習按弦發音')] },
      { number: 4, title: '音階練習', points: [p('複習鞏固', '強化已學技巧（持琴、持弓、按弦）'), p('音階練習', '開始基礎拉奏訓練，培養音準與流暢度')] },
      { number: 5, title: '第一首樂曲', points: [p('綜合複習', '鞏固持琴、持弓、按弦等基礎技巧'), p('樂曲練習', '開始練習《Mary Had a Little Lamb》，應用所學技能')] },
      { number: 6, title: '《Baby Shark》與變奏', points: [p('樂曲學習', '掌握熱門兒歌《Baby Shark》基礎旋律'), p('變奏練習', '初步嘗試簡單變奏，培養音樂表現力'), p('技巧應用', '結合持弓、按弦等基礎技能進行綜合訓練')] },
      { number: 7, title: '《小星星》與換弦', points: [p('趣味樂曲', '學習演奏《小星星》'), p('節奏強化', '透過重複樂句訓練穩定拍感'), p('換弦練習', '結合簡單換弦動作鞏固基本功')] },
      { number: 8, title: '綜合演奏', points: [p('綜合演奏', '串連所學曲目'), p('趣味複習', '透過遊戲化方式鞏固全部基礎技巧'), p('節奏強化', '透過重複樂句訓練穩定拍感'), p('評估及證書', '評估合格後頒發電子證書')] },
    ],
  },
  {
    slug: 'adult-beginner',
    title: '成人初學課程',
    audience_label: '成人 · 初學',
    summary: '[課程內容待定：例如適合初學不久、希望鞏固基礎的成人]',
    intro: '',
    description: '',
    price_hkd: null,
    free_lessons: 0,
    access_months: 12,
    status: 'coming_soon',
    sort_order: 20,
    fit_points: [],
    after_steps: [],
    faqs: [],
    cover_url: null,
    lessons: [],
  },
];
