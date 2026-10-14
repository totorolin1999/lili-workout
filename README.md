# 🏋️ Lili Workout (運動日誌)

一個專為個人訓練設計的現代化、簡潔高效且支援多語言的健身與運動記錄 Web / PWA 應用程式。

---

## 🌟 特色亮點 (Features)

- **多種運動計量模式 (Diverse Calculation Types)**
  - 🏋️ **重量 + 次數 (`weight_reps`)**：重訓必備（如臥推、深蹲、二頭彎舉）。
  - 🔄 **僅次數 (`reps`)**：徒手自重訓練或計次動作。
  - ⏱️ **僅時間 (`duration`)**：計時核心動作（如平板支撐）。
  - 🏃 **距離 + 時間 (`distance_duration`)**：有氧跑步、騎車，自動計算平均配速（如 `5'30"/km`）。
  - ⚡ **次數 + 時間 (`reps_duration`)**：如跳繩等兼顧次數與時間的運動。

- **三語系國際化支援 (Multi-language i18n)**
  - 支援 **繁體中文 (zh-TW)**、**匈牙利語 (Magyar - hu)** 與 **英文 (English - en)**。
  - 匈牙利語優先備用鏈機制（Hungarian-first fallback：`currentLocale → hu → en → zh-TW`），確保動作名稱無縫呈現不留白。

- **靈活的動作庫管理 (Exercise Library)**
  - 預置豐富的全身各大肌群（胸、背、腿、肩、手臂、核心、有氧等）內建動作。
  - 支援使用者自定義動作，可自由輸入多語言名稱、選擇運動分類與指定計量方式。

- **完整訓練歷史與編輯 (Workout History & Logging)**
  - 今日訓練快速記錄：支援勾選組數完成狀態、即時查看上一次訓練數值對照。
  - 歷史記錄檢視：隨時回顧過往課表與細項，支援重新編輯與刪除。

- **安全無密碼驗證 (Passwordless Magic Link Auth)**
  - 整合 Supabase Auth 電子郵件魔法連結登入，無需記憶密碼。
  - PostgreSQL 啟用 Row Level Security (RLS)，嚴格保護個人數據隱私。

- **極致行動端體驗 (Mobile-First & PWA)**
  - 針對手機螢幕寬度量身打造的使用者介面。
  - 具備 Web App Manifest，支援安裝至手機主畫面作為獨立 App (PWA) 使用。

---

## 🛠️ 技術棧 (Tech Stack)

- **框架**：[Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **核心庫**：[React 19](https://react.dev/)
- **語言**：[TypeScript 5](https://www.typescriptlang.org/)
- **樣式**：[Tailwind CSS v4](https://tailwindcss.com/)
- **後端與資料庫**：[Supabase](https://supabase.com/) (PostgreSQL + RLS + Auth + SSR Client)
- **多語系套件**：[next-intl](https://next-intl.dev/)
- **表單驗證**：[React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **圖示庫**：[Lucide React](https://lucide.dev/)

---

## 📁 專案結構 (Project Structure)

```text
lili-workout/
├── messages/                 # 多語系語句翻譯檔 (hu.json, en.json, zh-TW.json)
├── public/                   # 靜態資源 (圖示、截圖)
├── src/
│   ├── app/                  # Next.js App Router 路由
│   │   ├── [locale]/         # 支援語系前綴的頁面路由
│   │   │   ├── exercises/    # 動作庫管理頁面
│   │   │   ├── history/      # 訓練歷史紀錄頁面
│   │   │   ├── login/        # 魔法連結登入頁面
│   │   │   ├── layout.tsx    # 主佈局 (導航列、語言切換、認證檢查)
│   │   │   └── page.tsx      # 首頁 / 今日訓練記錄器
│   │   ├── auth/callback/    # Supabase Auth 授權跳轉處理
│   │   └── manifest.ts       # PWA Web App Manifest 設定
│   ├── components/           # UI 元件 (表單、對話框、記錄器、語言切換等)
│   ├── i18n/                 # next-intl 路由與配置
│   └── lib/                  # 工具函式與 Server Actions
│       ├── actions/          # Next.js Server Actions (auth, workout, exercise)
│       ├── supabase/         # Supabase Client / Server / Middleware
│       ├── cardio.ts         # 配速與時間格式解析計算模組
│       └── exercises.ts      # 動作型別、多語系顯示與計量方式邏輯
├── supabase/                 # Supabase 資料庫 Schema 與 SQL 遷移腳本
│   ├── schema.sql            # 主資料表、RLS 策略與初始內建動作 Seed
│   └── migrations/           # 歷史遷移腳本
├── .env.example              # 環境變數範例檔
├── next.config.ts            # Next.js 配置
└── package.json              # 專案依賴與腳本
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

1. 前往 [Supabase](https://supabase.com/) 建立一個新專案。
2. 進入 Supabase 控制台的 **SQL Editor**。
3. 開啟本專案中的 `supabase/schema.sql`，將內容貼上至 SQL Editor 中執行。這將建立：
   - `exercises` 表：動作庫（含多語言名稱與計算方式）。
   - `workouts` 表：訓練紀錄主檔。
   - `workout_sets` 表：訓練各組明細。
   - 所有相關的 **RLS 安全性存取原則 (Row Level Security Policies)** 與預設動作資料。
4. 於 Supabase **Authentication -> URL Configuration**：
   - 將 **Site URL** 設為 `http://localhost:3000`（或正式網址）。
   - 將 **Redirect URLs** 加入 `http://localhost:3000/auth/callback`。

### 3. 設定環境變數

複製 `.env.example` 並重新命名為 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 填入您的 Supabase 專案資訊：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# App URL (用於 Magic Link 登入跳轉重定向)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器造訪 [http://localhost:3000](http://localhost:3000)，系統將自動導向預設語系（如 `/hu`、`/zh-TW` 或 `/en`）。

---

## 📜 常用指令 (Available Scripts)

- `npm run dev`：以開發模式啟動 Next.js 伺服器 (Turbopack)。
- `npm run build`：編譯並打包正式環境版本。
- `npm run start`：啟動正式環境伺服器。
- `npm run lint`：執行 ESLint 程式碼檢查。

---

## 📱 PWA 安裝說明

- **iOS (Safari)**：點擊瀏覽器下方「分享」按鈕 ➔ 選擇「加入主畫面」。
- **Android (Chrome)**：點擊瀏覽器右上角選單 ➔ 選擇「安裝應用程式」或「加到主畫面」。

安裝後即可享受類似原生 App 的全螢幕沈浸式健身體驗。

---

## 📄 授權條款 (License)

本專案採私有授權或自訂條款 (Private Project)。
