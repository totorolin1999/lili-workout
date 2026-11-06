# 🏋️ Lili Workout (運動日誌)

一個專為個人訓練設計的現代化、簡潔高效且支援多語言的健身與運動記錄 Web / PWA 應用程式。採用簡約清爽的經典「藍白」現代美學設計，結合月曆、清單與肌群圖表三重視角，提供極致的訓練記錄與回顧體驗。

---

## 🌟 特色亮點 (Features)

### 1. 📅 三大訓練歷史檢視維度 (Triple-View Workout History)
- **月曆模式 (Calendar View)**：
  - 視覺化互動月份日曆，以圓點標記訓練日期，一目了然每月訓練頻率。
  - 當月運動總覽統計（訓練天數、總訓練次數、總完成組數）。
  - 點擊特定日期即時展開當日訓練課表；若為休息日，提供貼心提示並可**一鍵直達記錄該日訓練**（自動帶入指定日期）。
- **清單模式 (List View)**：
  - 依日期時間倒序排列，卡片自動依動作及**變式標籤**分組展示各組明細。
  - **同日課表靈活排序**：當同一天包含多場課表（例如上午有氧、傍晚重訓），支援拖曳手柄與上下箭頭直覺調換課表順序，並自動即時同步資料庫。
  - 支援**內嵌式即時編輯表單**（增刪組數、調整動作、修改數值、標籤切換、動作排序、備註更新）與安全刪除機制。
- **圖表分析模式 (Workout Analytics)**：
  - **肌群分佈甜甜圈圖 (SVG Donut Chart)**：動態統計九大肌群與運動分類（腿部、臀部、胸部、背部、肩膀、手臂、核心、有氧等）訓練組數佔比，各肌群均具備高辨識度的專屬色彩指標（例如臀部為亮眼粉紅 `#ec4899`）。
  - 圓心即時顯示選取肌群之名稱、完成組數及百分比，支援圖表區塊與圖例清單雙向聯動高亮。
  - 提供「本週 (This Week)」、「本月 (This Month)」與「全部歷史 (All Time)」時間範圍快速篩選。

### 2. 🎨 簡約現代藍白美學與主題切換 (Design & Theme System)
- **經典藍白主題風格 (Blue & White Theme)**：
  - 以經典深海軍藍 (`#004c87`)、活力天藍 (`#00b5e4`) 與純淨白為基底，打造清爽洗鍊且專注的視覺介面。
- **一鍵式明暗模式切換 (Single-Click Theme Toggle)**：
  - 導覽列與登入頁均提供一鍵快速切換深色 (Dark) 與淺色 (Light) 模式。
  - 本地快取 (localStorage) 記憶與跨分頁即時同步。
  - 內建 `<head>` 防閃爍 (FOUC-prevention) 腳本，並即時聯動行動裝置狀態列色彩 (`<meta name="theme-color">`)。

### 3. 📝 聰明強大的訓練記錄器 (Enhanced Workout Logger)
- **動作卡片拖曳與箭頭排序 (Card Reordering)**：
  - 支援原生 HTML5 滑鼠拖曳手柄（具備卡片半透明跟隨效果）與行動裝置觸控拖曳。
  - 提供上下步進箭頭按鈕，單手點擊即可輕鬆調整課表中動作項目的先後順序。
- **動作變式與細項標籤 (Exercise Variations & Tags)**：
  - 每一動作組數均支援細項變式標籤（如：保加利亞弓步、窄握臥推、箱上深蹲、沙發/椅子、彈力帶、單腿）。
  - 智慧關鍵字優先匹配：如「保加利亞分腿蹲」優先適配專屬家具/自重/啞鈴標籤，避免誤套用一般槓鈴深蹲變式。
  - 支援點擊預設/自訂標籤膠囊快速切換，或直接鍵入全新標籤即時套用。
- **組數完成核對 (Set Completion Checklist)**：
  - 每一組均提供「完成打勾」狀態標記，訓練過程中可即時核取，完整追蹤訓練達成率。
- **智慧前次數值帶入 (Last Session Ghost Values / Autofill)**：
  - 選擇動作後，自動查詢並帶入該動作最近一次的訓練數據（重量、次數、時間、距離）作為預設參考，提升紀錄效率。
- **彈窗式動作選取器 (Exercise Selector Modal)**：
  - 支援關鍵字搜尋（可同時匹配動作名稱與**變式標籤**）、肌群分類標籤快速篩選（腿、臀、胸、背、肩、手、核心、有氧等）。
  - 支援鍵盤快速鍵 (`Esc` 關閉) 與高亮當前已選動作。
- **跨頁面指定日期補登**：
  - 支援透過 URL 參數 (`?date=YYYY-MM-DD`) 直接在指定日期建立訓練，補登過往課表更直覺。

### 4. ⚡ 多種運動計量模式 (Diverse Calculation Types)
- 🏋️ **重量 + 次數 (`weight_reps`)**：重訓必備（如臥推、深蹲、硬舉、二頭彎舉、臀推）。
- 🔄 **僅次數 (`reps`)**：自重徒手訓練、引體向上、伏地挺身、跪姿後踢、蚌式開合。
- ⏱️ **僅時間 (`duration`)**：計時核心動作（如棒式平板支撐、靜態伸展）。
- 🏃 **距離 + 時間 (`distance_duration`)**：有氧慢跑、自行車、划船機，自動精準換算平均配速（如 `5'30"/km`，支援時間快速格式化）。
- ⚡ **次數 + 時間 (`reps_duration`)**：兼顧次數與時間之運動（如跳繩、波比跳、高強度間歇訓練 HIIT）。

### 5. 🌐 三語系國際化支援 (Multi-language i18n)
- 完整支援 **繁體中文 (zh-TW)**、**匈牙利語 (Magyar - hu)** 與 **英文 (English - en)**。
- 獨特之匈牙利語優先備用鏈機制（Hungarian-first fallback：`currentLocale → hu → en → zh-TW`），確保動作名稱與分類顯示無縫呈現不留白。
- 動作變式標籤 (Exercise Tags) 同步具備三語系在地化建議庫，客戶端動態解析呈現，乾淨無冗餘。
- 支援右上角語言下拉式選單即時無重載切換。

### 6. 📚 靈活的動作庫與變式管理 (Exercise Library & Variations)
- **預置全身九大肌群與運動分類**：包含腿部 (Legs)、臀部 (Glutes)、胸部 (Chest)、背部 (Back)、肩膀 (Shoulders)、手臂 (Arms)、核心 (Core)、有氧 (Cardio) 與其他 (Other)。
- **專屬居家臀部訓練動作庫 (Dedicated Glutes & Home Workouts)**：
  - 完整收錄熱門臀部運動：臀橋 (Glute Bridge)、臀推 (Hip Thrust)、保加利亞分腿蹲 (Bulgarian Split Squat)、跪姿後踢 (Donkey Kick)、蚌式開合 (Clamshell)、消防栓式 (Fire Hydrant)、蛙式推臀 (Frog Pump)、側臥抬腿 (Side-Lying Leg Raise)。
  - 貼近居家情境的預設變式建議（自重、彈力帶、沙發/椅子、單腿、啞鈴等）。
  - 智慧預設計量模式：自動將徒手孤立動作設為「僅次數 (`reps`)」，負重複合動作設為「重量 + 次數 (`weight_reps`)」。
- **動態多語系標籤解析 (Dynamic Client-Side Tags)**：
  - 預設動作變式標籤由客戶端依據當前瀏覽器語系動態匹配載入，資料庫專注保存使用者自定義標籤，避免多語系種子混雜。
- **自定義動作與標籤管理**：
  - 支援使用者新增與管理個人自定義動作，可自由輸入多語言名稱、選擇運動分類與指定計量方式。
  - 支援動作變式標籤 (Exercise Tags) 集中管理，可在動作庫中直接為動作擴充或刪除專屬變式。

### 7. 🔐 安全無密碼驗證 (Passwordless Magic Link Auth)
- 整合 Supabase Auth 電子郵件魔法連結登入，無需記憶密碼，安全又便捷。
- PostgreSQL 啟用嚴格的 Row Level Security (RLS) 權限原則與明確的 Data API 授權，確保使用者資料百分之百隱私隔離。

### 8. 📱 極致行動端體驗 (Mobile-First & PWA)
- 專為單手手機操作優化的操作介面與流暢響應式佈局。
- 具備完整 Web App Manifest 與圖示設定，支援加入至 iOS / Android 手機主畫面作為獨立 App (PWA) 使用。

### 9. 🛡️ 管理員會員管理儀表板 (Admin Member Management Dashboard)
- **全站會員數據總覽 (KPI Metrics)**：
  - 即時統計總會員人數、30 天活躍會員人數與活躍率、全站累積訓練場次、累積完成總組數。
- **多維度搜尋、篩選與排序 (Search & Filters)**：
  - 即時模糊搜尋會員 Email、暱稱或使用者 ID。
  - 角色篩選（全部 / 管理員 / 一般會員）與活躍度篩選（近 7 天活躍 / 近 30 天活躍 / 尚未開始訓練）。
  - 多種排序方式（最後訓練時間、註冊時間、課表數量、名稱）。
- **會員詳細抽屜與訓練明細 (Member Details & Workouts Drawer)**：
  - 檢視會員基本資料、肌群訓練分佈佔比與該會員建立的自訂動作庫。
  - 逐筆展開查看會員歷史訓練課表（日期、課表名稱、動作名稱與組數）。
  - 支援管理員權限切換（Promote to Admin / Demote to Member）、暱稱編輯與異常課表安全刪除。
- **資料匯出 (CSV Export)**：
  - 一鍵將會員清單與統計數據匯出為 CSV 報表（內建 UTF-8 BOM，相容繁中 Excel 無亂碼）。
- **嚴謹安全隔離 (Role-Based RLS & Admin Guard)**：
  - 後端 Server Action 與 PostgreSQL Row Level Security (RLS) 雙層驗證。
  - 非管理員嘗試造訪自動呈現友善之權限阻擋頁面；管理員登入時，導覽列自動顯現專屬後台入口，並支援在大螢幕桌面端流暢展開寬版管理介面。

### 10. 🏛️ 互動式系統設計與架構模擬器 (Interactive System Design Simulator)
- **專屬技術展示路由 (`/[locale]/system-design`)**：
  - 未列於前台導覽列（Navbar），專為作品集展示、技術面試、系統架構審查與開源文件化打造。
  - 無論是否登入皆可透過專屬網址直接存取（例如：`/zh-TW/system-design`）。
- **端到端三層全景架構圖 (Architecture Blueprint)**：
  - 視覺化劃分 Client（Next.js 16 App Router、React 19、Tailwind v4）、Server（Proxy Middleware、Server Actions）與 Backend（Supabase PostgreSQL、RLS、Magic Link Auth）。
  - 支援點擊任一區塊即時展開職責、代碼路徑、核心亮點與架構權衡（Trade-offs）。
- **核心資料流即時模擬器 (Interactive Flow Simulator)**：
  - 步進式與自動播放模擬四大業務流程：課表儲存、無密碼魔法連結登入、同日課表拖曳即時排序、匈牙利語優先多語備用鏈。
  - 附帶 Payload 資料負載與程式碼調用預覽。
- **資料庫實體關聯圖 (Interactive ERD & Schema)**：
  - 完整呈現 5 大核心資料表（`profiles`, `workouts`, `workout_sets`, `exercises`, `exercise_tags`）之欄位、主外鍵約束與 `ON DELETE CASCADE` 級聯刪除機制。
- **Row Level Security (RLS) 安全沙盒矩陣**：
  - 互動切換 4 種操作角色（會員 A/B、管理員、訪客）與 6 種資料庫操作，即時演算並呈現 RLS 權限核可（Granted ✅）或阻斷（Denied ❌）原因。
- **核心演算法邏輯實驗室 (Algorithms Lab)**：
  - 內建配速即時換算器（調用 `cardio.ts`）、多語備用鏈測試器（調用 `exercises.ts`）與五大計量模式矩陣。


---

## 🛠️ 技術棧 (Tech Stack)

- **框架**：[Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **核心庫**：[React 19](https://react.dev/)
- **語言**：[TypeScript 5](https://www.typescriptlang.org/)
- **樣式與主題**：[Tailwind CSS v4](https://tailwindcss.com/) (CSS Design Tokens, `@custom-variant dark`)
- **後端與資料庫**：[Supabase](https://supabase.com/) (PostgreSQL + RLS + Auth + `@supabase/ssr`)
- **多語系套件**：[next-intl](https://next-intl.dev/)
- **表單驗證**：[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **圖示庫**：[Lucide React](https://lucide.dev/)

---

## 📁 專案結構 (Project Structure)

```text
lili-workout/
├── messages/                     # 多語系語句翻譯檔 (hu.json, en.json, zh-TW.json)
├── public/                       # 靜態資源 (PWA 圖示、截圖)
├── src/
│   ├── app/                      # Next.js App Router 路由
│   │   ├── [locale]/             # 語系前綴動態路由
│   │   │   ├── admin/            # 管理員會員管理儀表板
│   │   │   ├── exercises/        # 動作庫與標籤管理頁面
│   │   │   ├── history/          # 訓練歷史紀錄頁面 (月曆/清單/圖表)
│   │   │   ├── login/            # 魔法連結登入頁面
│   │   │   ├── system-design/    # 互動式系統架構與設計模擬器 (未列於導覽列之專屬展示路由)
│   │   │   ├── layout.tsx        # 語系佈局 (導覽列、主題切換、語言切換、管理員權限入口)
│   │   │   └── page.tsx          # 今日訓練記錄器首頁 (支援 ?date 參數)
│   │   ├── auth/callback/        # Supabase Auth 授權跳轉路由處理
│   │   ├── globals.css           # Tailwind v4 全域樣式與藍白主題 Design Tokens
│   │   ├── layout.tsx            # 根佈局 (HTML 結構、FOUC 防閃爍腳本、Geist 字體)
│   │   └── manifest.ts           # PWA Web App Manifest 設定檔
│   ├── components/               # React 互動元件
│   │   ├── AdminDashboard.tsx        # 管理員會員管理儀表板 (KPI、清單篩選排序、會員抽屜、CSV 匯出)
│   │   ├── CurrentDateLabel.tsx      # 本地化日期時間標籤
│   │   ├── ExerciseManager.tsx       # 動作庫增刪與自訂標籤管理介面
│   │   ├── ExerciseSelectorModal.tsx # 彈窗式動作選取器 (搜尋動作/標籤與分類篩選)
│   │   ├── LanguageSwitcher.tsx      # 多語系下拉切換選單
│   │   ├── LoginForm.tsx             # Magic Link 電子郵件登入表單
│   │   ├── SystemDesignSimulator.tsx # 系統全景架構圖、資料流模擬器、ERD 與 RLS 沙盒元件
│   │   ├── ThemeToggle.tsx           # 一鍵切換明暗模式按鈕
│   │   ├── WorkoutAnalytics.tsx      # 肌群訓練分佈 SVG 甜甜圈圖表與週期篩選
│   │   ├── WorkoutCalendar.tsx       # 互動式訓練月曆與月份統計
│   │   ├── WorkoutCard.tsx           # 訓練紀錄卡片 (動作/標籤分組、各組明細呈現、同日拖曳排序)
│   │   ├── WorkoutEditForm.tsx       # 歷史訓練內嵌編輯表單 (組數/標籤編輯、卡片排序)
│   │   ├── WorkoutHistoryList.tsx    # 歷史紀錄多視角切換器 (月曆 / 清單 / 圖表)
│   │   └── WorkoutLogger.tsx         # 今日訓練記錄器主介面 (動作排序、標籤選擇、組數完成核對、前次數值帶入)
│   ├── i18n/                     # next-intl 路由轉發與語系配置
│   └── lib/                      # 核心工具函式與 Server Actions
│       ├── actions/
│       │   ├── admin.ts          # 管理員會員資料查詢、權限變更、訓練明細管理 Server Actions
│       │   ├── auth.ts           # 登入、登出與驗證 Server Actions
│       │   ├── exercise.ts       # 動作庫與變式標籤 CRUD Server Actions
│       │   └── workout.ts        # 訓練課表與組數 CRUD、前次紀錄查詢、同日課表排序 Server Actions
│       ├── supabase/             # Supabase Client / Server / Middleware 設定
│       ├── cardio.ts             # 有氧配速換算與時間字串解析模組
│       ├── exercises.ts          # 動作型別、分類、多語系顯示、計量模式與預設變式標籤定義
│       └── utils.ts              # 通用樣式輔助函式 (clsx + tailwind-merge)
├── supabase/                     # Supabase 資料庫腳本
│   ├── schema.sql                # 主資料表結構、RLS 策略、Data API 權限與初始動作 Seed
│   └── migrations/               # 資料庫歷程遷移腳本
│       ├── 20261014_add_calculation_type.sql      # 新增計量模式欄位
│       ├── 20261014_add_is_completed.sql         # 新增組數完成狀態欄位
│       ├── 20261021_grant_table_permissions.sql  # 補充 PostgREST Data API 存取權限
│       ├── 20261024_add_exercise_tags.sql        # 新增動作變式標籤表與組數標籤欄位
│       ├── 20261028_add_glutes_category_and_exercises.sql # 新增臀部分類與居家動作變式標籤種子資料
│       └── 20261105_add_profiles_and_admin.sql   # 新增 profiles 會員表、自動同步觸發器與管理員 RLS 權限
├── .env.example                  # 環境變數範例檔
├── next.config.ts                # Next.js 設定
└── package.json                  # 專案依賴與腳本
```

---

## 🚀 快速開始 (Getting Started)

### 1. 複製專案與安裝依賴

```bash
git clone <repository-url>
cd lili-workout
npm install
```

### 2. 設定 Supabase 資料庫

#### 全新安裝 (Fresh Setup)
1. 前往 [Supabase](https://supabase.com/) 建立一個新專案。
2. 進入 Supabase 控制台的 **SQL Editor**。
3. 開啟本專案中的 `supabase/schema.sql`，將內容貼上至 SQL Editor 中執行。這將建立：
   - `profiles` 表：使用者個人基本資料與權限角色（`admin` / `member`），含註冊自動同步觸發器。
   - `exercises` 表：動作庫（含多語言名稱與計量方式 `calculation_type`）。
   - `exercise_tags` 表：動作變式標籤（支援全域內建與使用者自訂標籤）。
   - `workouts` 表：訓練紀錄主檔（日期、標題、筆記）。
   - `workout_sets` 表：訓練各組明細（重量、次數、距離、秒數、變式標籤 `tag`、完成狀態 `is_completed` 等）。
   - 所有相關的 **RLS 安全性存取原則 (Row Level Security Policies)**、**Data API 存取權限 (GRANTs)** 與預設動作種子資料。
4. 於 Supabase **Authentication -> URL Configuration**：
   - 將 **Site URL** 設為 `http://localhost:3000`（或正式部署網址）。
   - 將 **Redirect URLs** 加入 `http://localhost:3000/auth/callback`。

#### 既有專案升級 (Upgrading Existing Databases)
若您已部署過先前版本的資料庫，請依序在 Supabase SQL Editor 中執行 `supabase/migrations/` 內的歷程遷移檔案：
- `20261014_add_calculation_type.sql`：新增計量模式欄位 (`calculation_type`)。
- `20261014_add_is_completed.sql`：新增組數完成狀態欄位 (`is_completed`)。
- `20261021_grant_table_permissions.sql`：補齊 PostgREST Data API 存取授權（符合 Supabase 資料表存取安全性規範）。
- `20261024_add_exercise_tags.sql`：建立 `exercise_tags` 資料表並於 `workout_sets` 新增動作變式標籤 `tag` 欄位。
- `20261028_add_glutes_category_and_exercises.sql`：更新動作分類檢查條件加入 `glutes` 類別，匯入 8 項居家與專業臀部訓練動作種子資料，並清理冗餘全域標籤以啟用客戶端動態本地化解析。
- `20261105_add_profiles_and_admin.sql`：建立 `profiles` 會員資料表、同步觸發器、管理員專屬 RLS 存取原則與統計 RPC 函式。

### 3. 設定環境變數

複製 `.env.example` 並重新命名為 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 填入您的 Supabase 專案資訊與管理員帳號：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# App URL (用於 Magic Link 登入跳轉重定向)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 管理員 Email 清單（選填，多個 Email 以逗號隔開）
ADMIN_EMAILS=admin@example.com
```

### 4. 啟動開發伺服器與訪問管理後台

```bash
npm run dev
```

開啟瀏覽器造訪 [http://localhost:3000](http://localhost:3000)，系統將自動依據瀏覽器偏好導向對應語系（如 `/hu`、`/zh-TW` 或 `/en`）。
- **會員管理員後台**：以管理員 Email 登入後，點擊頂部或底部導覽列的盾牌圖示 🛡️ 即可進入管理員會員儀表板（亦可直接造訪 `/[locale]/admin`）。


---

## 📜 常用指令 (Available Scripts)

- `npm run dev`：以開發模式啟動 Next.js 伺服器 (Turbopack)。
- `npm run build`：編譯並打包正式環境版本。
- `npm run start`：啟動正式環境伺服器。
- `npm run lint`：執行 ESLint 程式碼檢查。

---

## 📱 PWA 行動裝置安裝說明

- **iOS (Safari)**：點擊瀏覽器下方「分享」按鈕 ➔ 選擇「加入主畫面」。
- **Android (Chrome)**：點擊瀏覽器右上角選單 ➔ 選擇「安裝應用程式」或「加到主畫面」。

安裝後即可享受類似原生 App 的全螢幕沈浸式健身記錄體驗，離線快取載入更加流暢。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。歡迎自由學習、修改或部署個人版本。
