# Tom's Violin Studio 網上學堂

小提琴網上課程網站。純 HTML + JavaScript（ES modules）+ Tailwind CSS + Supabase。

## 目前進度：第 1 期（網站骨架同公開頁面）

| 頁面 | 檔案 | 內容 |
|---|---|---|
| 首頁（所有課程） | `index.html` + `js/home.js` | 介紹、課程卡、關於 Tom sir、實體課程查詢 |
| 課程介紹頁 | `course.html?c=<slug>` + `js/course.js` | 簡介、適合對象、課程大綱、收費、完成課程後、常見問題 |
| 條款／私隱／退款 | `terms.html` `privacy.html` `refund.html` | **草稿範本**，`[方括號]` 係待補充內容，上線前要搵專業人士睇 |

未做（之後幾期）：登入註冊、影片、付款、學習進度、管理。頁面上「登入」「免費試看」等按鈕暫時只會彈出「即將推出」。

## 資料

- 課程資料表：`courses`（一個課程一行）、`lessons`（每堂大綱）。結構同示範內容見 `supabase/migrations/0001_courses.sql`。
- **未設定 Supabase 時**，網站會用 `js/demo-data.js` 嘅示範資料。
- 課程狀態 `status`：`draft`（唔顯示）／`coming_soon`（顯示「即將推出」）／`published`（正式推出）。
- 免費試看堂數由 `free_lessons` 決定（例如 2 = 第 1–2 堂免費）。
- 網站文字一律用**書面語**。

### 接駁 Supabase（開咗新 project 之後）
1. 喺 Supabase SQL Editor 貼上 `supabase/migrations/0001_courses.sql` 執行（會建立資料表同示範課程）。
2. 喺 `js/config.js` 填 `supabaseUrl` 同 `supabaseAnonKey`（Project Settings → API）。⚠️ 只可以放 anon key，**唔好放 service_role key**。
3. 之後改課程內容、價錢、加新課程：直接用 Supabase Table Editor。

`js/config.js` 亦可以填 WhatsApp 連結、聯絡電郵、Instagram。

## 開發

```bash
npm install          # 第一次
npm run build:css    # 改咗 HTML / JS 入面嘅 class 之後要重新 build
npm run watch:css    # 開發時自動 build
```

本機預覽：Claude 嘅 launch 設定叫 `violin-online-course`（port 5180），或者：

```bash
python -m http.server 5180
```

改咗 JS 之後如果瀏覽器未更新，用 Ctrl+Shift+R 強制重新載入。
