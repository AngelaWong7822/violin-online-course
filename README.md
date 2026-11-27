# Tom's Violin Studio 網上學堂

小提琴網上課程網站。純 HTML + JavaScript（ES modules）+ Tailwind CSS + Supabase。

## 目前進度：第 3 期（付款）進行中

| 頁面 | 檔案 | 內容 |
|---|---|---|
| 首頁（所有課程） | `index.html` + `js/home.js` | 介紹、課程卡、關於 Tom sir、實體課程查詢 |
| 課程介紹頁 | `course.html?c=<slug>` + `js/course.js` | 簡介、適合對象、課程大綱、收費、完成課程後、常見問題 |
| 條款／私隱／退款 | `terms.html` `privacy.html` `refund.html` | **草稿範本**，`[方括號]` 係待補充內容，上線前要搵專業人士睇 |

| 登入／註冊／忘記密碼 | `login.html` + `js/login.js` | Google 或電郵 + 密碼；`?next=` 登入後返回原頁 |
| 重設密碼 | `reset-password.html` | 由「忘記密碼」電郵連結進入 |
| 我的帳戶 | `account.html` | 首次登入（`?setup=1`）必須填姓名、WhatsApp（可揀國家）、宣傳反對框；改密碼；登出。一個帳戶 = 一位學員 |
| 我的課程 | `my-courses.html` | 已報讀課程同觀看期；免費試看課程 |

共用：`js/supabase.js`（Supabase client）、`js/auth.js`（登入狀態、WhatsApp 格式、錯誤訊息）。

### 付款（第 3 期）
- 課程頁「立即報讀」→ `js/checkout.js` → Edge Function `create-checkout`（價錢由資料庫讀）→ Stripe 付款頁。
- 付款成功 → Stripe 通知 Edge Function `stripe-webhook`（核實簽名）→ 自動加 `enrollments`，有效期 = 課程 `access_months`。
- Stripe 全數退款 → 自動將報讀改為 `refunded`。
- Edge Functions 用 service_role，都要 grant（見 0004）。
- Edge Functions 原始碼：`supabase/functions/`；部署要加 `--no-verify-jwt`。
- Supabase Secrets：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`（**唔好放入 code**）。

未做：上堂頁同影片（等有片）、學習進度、管理。「進入課程」「免費試看」暫時只會彈出「即將推出」。

## 資料

- 課程資料表：`courses`（一個課程一行）、`lessons`（每堂大綱）。結構同示範內容見 `supabase/migrations/0001_courses.sql`。
- 會員資料表（`0002_accounts.sql`）：`profiles`（帳戶資料）、`learners`（學員，暫時冇用，保留備用）、`enrollments`（報讀紀錄，網站只可讀，由付款或 Table Editor 新增）。
- ⚠️ 呢個 Supabase project 唔會自動開放新資料表，每個 migration 都要寫 `grant`。
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
