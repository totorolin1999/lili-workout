'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Layers,
  Activity,
  Database,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Code2,
  Table,
  Key,
  Globe,
  Timer,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Server,
  Smartphone,
  Gauge,
  Lock,
} from 'lucide-react'
import { calculatePace, formatSecondsToTime, parseTimeToSeconds } from '@/lib/cardio'

interface SystemDesignSimulatorProps {
  locale: string
  isLoggedIn: boolean
}

type TabType = 'architecture' | 'flow' | 'database' | 'security' | 'lab'

export default function SystemDesignSimulator({ locale, isLoggedIn }: SystemDesignSimulatorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('architecture')

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground tracking-wide">
                <Sparkles className="h-3 w-3" />
                System Design Simulator
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                v1.0 • Hidden Route
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              🏋️ Lili Workout 系統架構與設計模擬器
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              深度視覺化呈現本專案的全端架構藍圖、動態資料流生命週期、PostgreSQL 關聯模型 (ERD)、Row Level Security (RLS) 隔離原則與核心演算法邏輯。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Link
              href={`/${locale}${isLoggedIn ? '' : '/login'}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isLoggedIn ? '返回訓練記錄' : '前往登入頁'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50 text-xs font-medium">
          <TabButton
            active={activeTab === 'architecture'}
            onClick={() => setActiveTab('architecture')}
            icon={<Layers className="h-4 w-4" />}
            label="1. 全景架構圖"
            subtitle="Architecture Blueprint"
          />
          <TabButton
            active={activeTab === 'flow'}
            onClick={() => setActiveTab('flow')}
            icon={<Activity className="h-4 w-4" />}
            label="2. 資料流模擬器"
            subtitle="Interactive Flows"
          />
          <TabButton
            active={activeTab === 'database'}
            onClick={() => setActiveTab('database')}
            icon={<Database className="h-4 w-4" />}
            label="3. 資料庫關聯模型"
            subtitle="Schema & ERD"
          />
          <TabButton
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            icon={<ShieldCheck className="h-4 w-4" />}
            label="4. 安全與 RLS 矩陣"
            subtitle="Security & Sandbox"
          />
          <TabButton
            active={activeTab === 'lab'}
            onClick={() => setActiveTab('lab')}
            icon={<Cpu className="h-4 w-4" />}
            label="5. 核心邏輯實驗室"
            subtitle="Algorithms Lab"
          />
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all">
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'flow' && <FlowSimulatorTab />}
        {activeTab === 'database' && <DatabaseERDTab />}
        {activeTab === 'security' && <SecurityMatrixTab />}
        {activeTab === 'lab' && <LogicLabTab locale={locale} />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  subtitle: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap text-left ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
      }`}
    >
      <span className={active ? 'text-primary-foreground' : 'text-primary'}>{icon}</span>
      <div>
        <div className="font-semibold leading-none">{label}</div>
        <div
          className={`text-[10px] mt-0.5 leading-none opacity-80 ${
            active ? 'text-primary-foreground/90' : 'text-muted-foreground'
          }`}
        >
          {subtitle}
        </div>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB 1: 全景系統架構圖 (Architecture Blueprint)
   ═══════════════════════════════════════════════════════════════════════════════ */
function ArchitectureTab() {
  const [selectedNode, setSelectedNode] = useState<string>('server-actions')

  const nodeDetails: Record<
    string,
    { title: string; layer: string; path: string; desc: string; highlights: string[]; tradeOffs: string }
  > = {
    'app-router': {
      title: 'Next.js 16 App Router (Client / Server Components)',
      layer: '前端展示層 (Frontend Presentation Layer)',
      path: 'src/app/[locale]/...',
      desc: '基於 React 19 與 Next.js 16 App Router 架構。頁面由語系動態路由 [locale] 統一接管，在伺服器端預先準備多語系訊息與初始資料，並於客戶端組裝高度互動性 UI。',
      highlights: [
        'React 19 Server Components 實現極速初始 HTML 渲染',
        'Tailwind CSS v4 設計令牌（MTK 藍白主題與 Dark 模式自定義變體）',
        '支援 PWA Manifest 與離線安裝體驗，單手手機操作最佳化',
        '動態寬版容器：一般記錄介面為 mobile-first max-w-md，管理後台與架構頁面擴展至 max-w-6xl',
      ],
      tradeOffs: 'Server Component 與 Client Component 界線劃分明確，最小化客戶端 JavaScript Bundle 大小。',
    },
    middleware: {
      title: 'Edge Proxy & Session Refresh (中間件層)',
      layer: '邊緣網路與路由轉發層 (Edge & Routing Layer)',
      path: 'proxy.ts & src/lib/supabase/middleware.ts',
      desc: '在邊緣節點攔截所有傳入請求，並行完成「next-intl 多語系路徑重寫」與「Supabase JWT Session 憑證展期 (Silent Refresh)」。',
      highlights: [
        '單一 Proxy 中介處理多語系轉發與 Supabase SSR 驗證狀態維持',
        '安全同步 HTTP Request/Response Cookie，防止無密碼魔法連結授權狀態中斷',
        '靜態資源與 API 路由自動 Bypass，保證零額外效能開銷',
      ],
      tradeOffs: '保證 Cookie 同步時需注意雙向寫入 Response Header，確保 Session 在伺服器端即時可用。',
    },
    'server-actions': {
      title: 'Next.js Server Actions (後端邏輯與交易層)',
      layer: '核心服務與交易層 (Business Logic & Mutation Layer)',
      path: 'src/lib/actions/*.ts',
      desc: '取代傳統 REST/GraphQL API 端點，透過型別安全的 Server Actions 處理資料庫 CRUD、管理員權限驗證與同日課表拖曳即時排序。',
      highlights: [
        '零 API Route 冗餘：前端直接呼叫 Server Action，享有端到端 TypeScript 型別推導',
        '雙層防護機制：後端 Server Action 率先檢查 Session 與角色，再由 PostgreSQL RLS 嚴密圍堵',
        '原子化快取更新：成功後透過 revalidatePath 即時刷新客戶端快取，杜絕畫面不同步',
      ],
      tradeOffs: '相較於傳統 API，減少了 Route Handler 樣板代碼，且天生防範 CSRF。',
    },
    'supabase-auth': {
      title: 'Supabase Auth (無密碼魔法連結驗證)',
      layer: '身份識別與授權中心 (Identity & Access Layer)',
      path: 'src/app/auth/callback/route.ts',
      desc: '採用現代無密碼 (Passwordless Magic Link) 驗證。使用者僅需輸入電子郵件，透過單次連結與 PKCE Code 交換取得具備加密簽章的 JWT。',
      highlights: [
        '徹底免除密碼外洩、弱密碼或忘記密碼的管理負擔',
        'PKCE 交換成功後自動觸發 PostgreSQL on_auth_user_created 建立會員資料',
        '搭配 @supabase/ssr 寫入 Secure, HttpOnly, SameSite=Lax 之 Session Cookie',
      ],
      tradeOffs: '對個人日常健身記錄極度友善；若需要第三方 OAuth (Google, Apple) 可無縫擴充。',
    },
    'supabase-db': {
      title: 'Supabase PostgreSQL (關係型資料庫與 RLS)',
      layer: '資料儲存與安全防護層 (Data Persistence & RLS Layer)',
      path: 'supabase/schema.sql & migrations/*.sql',
      desc: '託管於 Supabase 的 PostgreSQL 16+。所有資料表皆嚴格開啟 Row Level Security (RLS)，保證使用者資料絕對物理隔離。',
      highlights: [
        '全表啟用 RLS：透過 auth.uid() = user_id 原則，未授權者在 SQL 底層即被阻絕',
        '完整的外鍵約束與 ON DELETE CASCADE 級聯清理，防止孤兒資料殘留',
        '管理員角色原則：profiles.role = "admin" 享有跨會員監控與安全刪除權限',
      ],
      tradeOffs: '將安全性下沉至資料庫核心層，即使應用層發生漏洞，資料庫也能自我守護。',
    },
  }

  const selected = nodeDetails[selectedNode] || nodeDetails['server-actions']

  return (
    <div className="space-y-6">
      {/* Visual Architectural Map */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            端到端三層架構全景 (3-Tier End-to-End Blueprint)
          </h2>
          <span className="text-xs text-muted-foreground">點擊任一區塊查看架構細節</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tier 1: Client */}
          <div
            onClick={() => setSelectedNode('app-router')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedNode === 'app-router'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/50 bg-background/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Tier 1 • Client & UI
              </span>
              <Smartphone className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">Next.js 16 Web & PWA</h3>
            <p className="text-xs text-muted-foreground mb-3">
              App Router, React 19, Tailwind CSS v4, Lucide Icons, Drag & Drop
            </p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>三重視角檢視：月曆 / 清單 / SVG 圖表</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>動作卡片拖曳與箭頭即時排序</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>經典藍白主題與一鍵明暗模式切換</span>
              </div>
            </div>
          </div>

          {/* Tier 2: Server Actions & Middleware */}
          <div
            onClick={() => setSelectedNode('server-actions')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedNode === 'server-actions' || selectedNode === 'middleware'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/50 bg-background/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Tier 2 • Server Actions & Proxy
              </span>
              <Server className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">Node Runtime / Edge</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Server Actions, Proxy Session Refresh, next-intl i18n
            </p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>`saveWorkoutAction` 原子交易寫入</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>`updateWorkoutSortOrderAction` 批量排序</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>`checkIsAdmin` 雙層權限守衛</span>
              </div>
            </div>
          </div>

          {/* Tier 3: Supabase & PostgreSQL */}
          <div
            onClick={() => setSelectedNode('supabase-db')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedNode === 'supabase-db' || selectedNode === 'supabase-auth'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/50 bg-background/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Tier 3 • Supabase Backend
              </span>
              <Database className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">PostgreSQL & Auth</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Row Level Security, Magic Link Auth, Cascade Constraints
            </p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>嚴格 RLS：`auth.uid() = user_id`</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>觸發器自動建立 `profiles` 會員資料</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>5 大實體表關聯與 ON DELETE CASCADE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground self-center">快速切換檢視：</span>
          {[
            { id: 'app-router', label: 'App Router 前端層' },
            { id: 'middleware', label: 'Proxy / Session Refresh' },
            { id: 'server-actions', label: 'Server Actions 核心' },
            { id: 'supabase-auth', label: 'Magic Link 驗證流' },
            { id: 'supabase-db', label: 'PostgreSQL & RLS' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedNode(item.id)}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedNode === item.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 border-border hover:bg-muted text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Node Details Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div>
            <div className="text-xs font-semibold text-primary">{selected.layer}</div>
            <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
            <Code2 className="h-3.5 w-3.5" />
            {selected.path}
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">{selected.desc}</p>

        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            核心設計亮點 (Key Architectural Highlights)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selected.highlights.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-foreground/80"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-border/60">
          <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            架構權衡與工程思維 (Engineering Trade-off)
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{selected.tradeOffs}</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB 2: 互動式資料流模擬器 (Interactive Flow Simulator)
   ═══════════════════════════════════════════════════════════════════════════════ */
function FlowSimulatorTab() {
  const [selectedFlow, setSelectedFlow] = useState<'workout' | 'auth' | 'reorder' | 'i18n'>('workout')
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  const flows = {
    workout: {
      name: '🏋️ 訓練課表儲存流程 (Workout Save Flow)',
      desc: '模擬從前端點擊「完成並儲存訓練」，經由 Server Action 驗證至 Supabase 資料庫原子寫入的完整生命週期。',
      steps: [
        {
          stage: '1. 客戶端表單驗證',
          actor: 'React Hook Form + Zod',
          action: '檢查課表日期、動作清單與各組數值（重量、次數、有氧時間）是否合法。',
          payload: '{ date: "2026-11-06", title: "腿臀訓練日", sets: [{ exercise_id: "...", weight_kg: 60, reps: 10 }] }',
          status: 'SUCCESS',
        },
        {
          stage: '2. 呼叫 Server Action',
          actor: 'saveWorkoutAction (src/lib/actions/workout.ts)',
          action: '無暴露 REST API，直接以 RPC 呼叫後端 Server Action。建立 Supabase Server Client。',
          payload: 'await saveWorkoutAction({ date, title, sets })',
          status: 'SUCCESS',
        },
        {
          stage: '3. 身份 Session 驗證',
          actor: 'Supabase Server Client & Cookies',
          action: '自傳入的 HttpOnly Cookie 解密存取令牌 (JWT)，驗證登入會員 auth.uid()。若未登入則阻擋。',
          payload: 'const { data: { user } } = await supabase.auth.getUser() // uid: "a8f3-..."',
          status: 'SUCCESS',
        },
        {
          stage: '4. PostgreSQL RLS 權限過濾',
          actor: 'PostgreSQL Row Level Security',
          action: '資料庫底層校驗 RLS Policy：WITH CHECK (auth.uid() = user_id)，防止偽造他人 user_id 寫入。',
          payload: 'INSERT INTO workouts (user_id, date, title) VALUES (auth.uid(), ...) RETURNING id;',
          status: 'SUCCESS',
        },
        {
          stage: '5. 原子化批次寫入組數',
          actor: 'workout_sets 資料表',
          action: '取得剛建立的 workout.id，並發寫入所有關聯之 workout_sets 組數資料，具備外鍵與 Cascade 約束。',
          payload: 'INSERT INTO workout_sets (workout_id, exercise_id, weight_kg, reps, tag, is_completed) ...',
          status: 'SUCCESS',
        },
        {
          stage: '6. 快取失效與畫面即時同步',
          actor: 'revalidatePath & Client Router',
          action: '呼叫 revalidatePath("/[locale]/history") 與首頁，通知 Next.js 快取失效，前端跳轉並展示成功 Toast。',
          payload: 'revalidatePath(`/${locale}/history`); return { success: true, workoutId };',
          status: 'COMPLETED',
        },
      ],
    },
    auth: {
      name: '🔐 無密碼魔法連結登入 (Magic Link Auth Flow)',
      desc: '模擬從電子郵件輸入、發送驗證信、點擊單次登入連結至 profiles 會員自動初始化的全過程。',
      steps: [
        {
          stage: '1. 送出電子郵件',
          actor: 'LoginForm Component',
          action: '使用者輸入 Email，呼叫 signInWithOtp 發起登入請求。',
          payload: 'supabase.auth.signInWithOtp({ email: "user@example.com", options: { emailRedirectTo } })',
          status: 'SUCCESS',
        },
        {
          stage: '2. 產生加密 Token 並寄發郵件',
          actor: 'Supabase Auth Engine',
          action: '生成 PKCE Code 與單次有效驗證連結，發送安全信件至使用者收件匣。',
          payload: 'https://app.liliworkout.com/auth/callback?code=pkce_secret_token_123',
          status: 'SUCCESS',
        },
        {
          stage: '3. 點擊回調路由交換 Session',
          actor: 'src/app/auth/callback/route.ts',
          action: 'Route Handler 截獲 code 參數，呼叫 exchangeCodeForSession 交換正式 Session JWT。',
          payload: 'await supabase.auth.exchangeCodeForSession(code)',
          status: 'SUCCESS',
        },
        {
          stage: '4. 資料庫觸發器自動建立 Profile',
          actor: 'PostgreSQL Trigger (on_auth_user_created)',
          action: '資料庫層偵測到 auth.users 新增，自動將 id、email 寫入 public.profiles，預設為 member 角色。',
          payload: 'INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, \'member\');',
          status: 'SUCCESS',
        },
        {
          stage: '5. 寫入 HttpOnly Cookie 並導向首頁',
          actor: 'Next.js Response Headers',
          action: '將 Session 存入 Secure, SameSite=Lax Cookie，安全導向至今日訓練主畫面。',
          payload: 'NextResponse.redirect(`/${locale}`)',
          status: 'COMPLETED',
        },
      ],
    },
    reorder: {
      name: '🔄 同日課表拖曳即時排序 (Card Reordering Flow)',
      desc: '當一天有多場訓練（例如晨間跑步、傍晚重訓），模擬拖曳排序與防抖同步至資料庫。',
      steps: [
        {
          stage: '1. HTML5 拖曳或箭頭點擊',
          actor: 'WorkoutCard / WorkoutHistoryList',
          action: '使用者拖曳卡片或點擊上下移動箭頭，即時更新本機 React State（樂觀更新 Optimistic Update）。',
          payload: 'reorderList(prevWorkouts, sourceIndex, targetIndex)',
          status: 'SUCCESS',
        },
        {
          stage: '2. 防抖觸發 Server Action',
          actor: 'updateWorkoutSortOrderAction',
          action: '透過防抖 (Debounce) 機制，打包所有受影響課表的新 sort_order 鍵值對。',
          payload: 'await updateWorkoutSortOrderAction([{ id: "w1", sort_order: 0 }, { id: "w2", sort_order: 1 }])',
          status: 'SUCCESS',
        },
        {
          stage: '3. RLS 權限查驗',
          actor: 'PostgreSQL UPDATE Policy',
          action: '資料庫檢核 USING (auth.uid() = user_id)，確保使用者只能修改屬於自己的課表排序。',
          payload: 'UPDATE workouts SET sort_order = $2 WHERE id = $1 AND user_id = auth.uid()',
          status: 'SUCCESS',
        },
        {
          stage: '4. 同步完成',
          actor: 'Database & Revalidation',
          action: '排序持久化完成，下次造訪歷史紀錄時即時按 sort_order ASC, created_at DESC 正確呈現。',
          payload: 'SELECT * FROM workouts WHERE date = $1 ORDER BY sort_order ASC;',
          status: 'COMPLETED',
        },
      ],
    },
    i18n: {
      name: '🌐 匈牙利語優先多語備用鏈 (Hungarian-First Fallback)',
      desc: '模擬動作名稱在當前語系缺漏時，無縫向上級聯備用，確保介面永遠不會空白。',
      steps: [
        {
          stage: '1. 偵測當前瀏覽器語系',
          actor: 'next-intl Routing',
          action: '例如使用者目前處於繁體中文語系 (zh-TW)。',
          payload: 'const locale = "zh-TW"',
          status: 'SUCCESS',
        },
        {
          stage: '2. 檢查當前語系欄位',
          actor: 'getExerciseName(exercise, locale)',
          action: '查詢 exercise.name_zh。若有值則直接返回。若為 null 則啟動 Fallback 備用鏈。',
          payload: 'exercise.name_zh === null -> Trigger Fallback',
          status: 'SUCCESS',
        },
        {
          stage: '3. 級聯至第一優先備用：匈牙利語 (hu)',
          actor: 'Hungarian-First Policy',
          action: '本系統專屬設計：優先嘗試 exercise.name_hu，維持 Lili 核心語系的自然性。',
          payload: 'exercise.name_hu ? return exercise.name_hu : cascadeNext()',
          status: 'SUCCESS',
        },
        {
          stage: '4. 級聯至第二優先備用：英語 (en)',
          actor: 'English Fallback',
          action: '若匈牙利語亦無，嘗試通用英語名稱 exercise.name_en。',
          payload: 'return exercise.name_en || exercise.name_zh || "Unnamed Exercise"',
          status: 'COMPLETED',
        },
      ],
    },
  }

  const activeFlow = flows[selectedFlow]
  const currentStepData = activeFlow.steps[currentStep] || activeFlow.steps[0]

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < activeFlow.steps.length - 1) {
            return prev + 1
          } else {
            setIsPlaying(false)
            return prev
          }
        })
      }, 2200)
    }
    return () => clearInterval(timer)
  }, [isPlaying, activeFlow.steps.length])

  return (
    <div className="space-y-6">
      {/* Flow Selection Tabs */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              核心資料流即時模擬器
            </h2>
            <p className="text-xs text-muted-foreground">選擇想要模擬的業務流程，體驗從請求發起至資料庫結算的完整歷程</p>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted p-1 rounded-xl">
            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentStep((prev) => Math.max(0, prev - 1))
              }}
              disabled={currentStep === 0}
              className="p-1.5 rounded-lg hover:bg-background disabled:opacity-40 text-foreground transition-colors"
              title="上一步"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? '暫停' : '自動播放'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentStep((prev) => Math.min(activeFlow.steps.length - 1, prev + 1))
              }}
              disabled={currentStep === activeFlow.steps.length - 1}
              className="p-1.5 rounded-lg hover:bg-background disabled:opacity-40 text-foreground transition-colors"
              title="下一步"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentStep(0)
              }}
              className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
              title="重設步驟"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scenarios */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(flows) as Array<keyof typeof flows>).map((key) => (
            <button
              key={key}
              onClick={() => {
                setSelectedFlow(key)
                setCurrentStep(0)
                setIsPlaying(false)
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedFlow === key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/40 border-border hover:bg-muted text-foreground'
              }`}
            >
              <div className="font-semibold text-xs truncate">{flows[key].name}</div>
              <div
                className={`text-[10px] mt-0.5 truncate ${
                  selectedFlow === key ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}
              >
                {flows[key].steps.length} 個生命週期節點
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Step Timeline */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-primary tracking-wide">
              STEP {currentStep + 1} OF {activeFlow.steps.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(((currentStep + 1) / activeFlow.steps.length) * 100)}% 完成
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / activeFlow.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {activeFlow.steps.map((st, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsPlaying(false)
                setCurrentStep(idx)
              }}
              className={`p-2 rounded-xl border text-left transition-all ${
                currentStep === idx
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20'
                  : idx < currentStep
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-muted-foreground'
                  : 'border-border/50 bg-background/50 text-muted-foreground/60'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                {idx < currentStep ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                      currentStep === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span className="truncate">{st.stage}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Current Step Detail Card */}
        <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                節點執行對象 (Actor)
              </span>
              <h3 className="text-base font-bold text-foreground mt-1">{currentStepData.actor}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {currentStepData.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              運作原理與行為 (Operation Description)
            </h4>
            <p className="text-sm text-foreground/90 leading-relaxed">{currentStepData.action}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              資料負載 / 程式調用模擬 (Payload & Query Preview)
            </h4>
            <pre className="p-3 rounded-xl bg-card border border-border text-[11px] font-mono text-foreground overflow-x-auto">
              <code>{currentStepData.payload}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB 3: 資料庫關聯模型與 ERD (Database Schema & ERD)
   ═══════════════════════════════════════════════════════════════════════════════ */
function DatabaseERDTab() {
  const [selectedTable, setSelectedTable] = useState<string>('workouts')

  const tables = {
    profiles: {
      name: 'profiles',
      desc: '使用者資料表。與 Supabase auth.users 進行 1:1 強綁定，儲存使用者暱稱與系統權限角色（member / admin）。',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NO', desc: '關聯 auth.users.id (ON DELETE CASCADE)' },
        { name: 'email', type: 'TEXT', key: '', nullable: 'YES', desc: '使用者 Email 信箱' },
        { name: 'display_name', type: 'TEXT', key: '', nullable: 'YES', desc: '自定義暱稱' },
        { name: 'role', type: 'TEXT', key: '', nullable: 'NO', desc: '會員角色 ("admin" | "member")，預設 "member"' },
        { name: 'created_at', type: 'TIMESTAMPTZ', key: '', nullable: 'NO', desc: '註冊時間' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', key: '', nullable: 'NO', desc: '資料異動時間' },
      ],
      rls: [
        'Users can view their own profile (auth.uid() = id)',
        'Users can update their own profile (auth.uid() = id)',
        'Admins have full select/update permissions on all profiles',
      ],
    },
    workouts: {
      name: 'workouts',
      desc: '訓練紀錄主檔。記錄每一次訓練課表的日期、自訂標題、備註與同日排序號。',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NO', desc: 'Primary Key (gen_random_uuid())' },
        { name: 'user_id', type: 'UUID', key: 'FK', nullable: 'NO', desc: '關聯 profiles.id (ON DELETE CASCADE)' },
        { name: 'date', type: 'DATE', key: 'INDEX', nullable: 'NO', desc: '訓練日期 (YYYY-MM-DD)' },
        { name: 'title', type: 'TEXT', key: '', nullable: 'YES', desc: '課表標題（選填）' },
        { name: 'notes', type: 'TEXT', key: '', nullable: 'YES', desc: '訓練備註筆記' },
        { name: 'sort_order', type: 'INTEGER', key: '', nullable: 'NO', desc: '同日課表拖曳排序號（預設 0）' },
        { name: 'created_at', type: 'TIMESTAMPTZ', key: '', nullable: 'NO', desc: '建立時間' },
      ],
      rls: [
        'ALL operations restricted to auth.uid() = user_id',
        'Admins can delete anomaly workouts across users',
      ],
    },
    workout_sets: {
      name: 'workout_sets',
      desc: '訓練組數明細表。記錄課表中每一個動作每一組的重量、次數、時間、距離、變式標籤與完成狀態。',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NO', desc: 'Primary Key (gen_random_uuid())' },
        { name: 'workout_id', type: 'UUID', key: 'FK', nullable: 'NO', desc: '關聯 workouts.id (ON DELETE CASCADE)' },
        { name: 'exercise_id', type: 'UUID', key: 'FK', nullable: 'NO', desc: '關聯 exercises.id' },
        { name: 'set_order', type: 'INTEGER', key: '', nullable: 'NO', desc: '組數在課表內的先後次序' },
        { name: 'weight_kg', type: 'NUMERIC(6,2)', key: '', nullable: 'YES', desc: '重訓重量（公斤）' },
        { name: 'reps', type: 'INTEGER', key: '', nullable: 'YES', desc: '完成次數' },
        { name: 'duration_seconds', type: 'INTEGER', key: '', nullable: 'YES', desc: '有氧或計時動作總秒數' },
        { name: 'distance_meters', type: 'INTEGER', key: '', nullable: 'YES', desc: '跑步/自行車公尺數' },
        { name: 'tag', type: 'TEXT', key: '', nullable: 'YES', desc: '變式標籤（如：沙發/椅子、單腿、自重）' },
        { name: 'is_completed', type: 'BOOLEAN', key: '', nullable: 'NO', desc: '組數完成勾選標記（預設 true）' },
      ],
      rls: [
        'Inherits workout ownership via workout_id reference and auth.uid() check',
        'Cascade deletes automatically when parent workout is removed',
      ],
    },
    exercises: {
      name: 'exercises',
      desc: '動作庫主表。包含全身九大肌群動作、三語系名稱、專屬計量模式與使用者自訂動作。',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NO', desc: 'Primary Key (gen_random_uuid())' },
        { name: 'name_hu', type: 'TEXT', key: '', nullable: 'YES', desc: '匈牙利語名稱' },
        { name: 'name_en', type: 'TEXT', key: '', nullable: 'YES', desc: '英語名稱' },
        { name: 'name_zh', type: 'TEXT', key: '', nullable: 'YES', desc: '繁體中文名稱' },
        { name: 'category', type: 'TEXT', key: '', nullable: 'NO', desc: 'legs, glutes, chest, back, shoulders, arms, core, cardio, other' },
        { name: 'calculation_type', type: 'TEXT', key: '', nullable: 'NO', desc: 'weight_reps, reps, duration, distance_duration, reps_duration' },
        { name: 'user_id', type: 'UUID', key: 'FK', nullable: 'YES', desc: 'NULL 表全域內建預設動作；UUID 表特定使用者自訂動作' },
      ],
      rls: [
        'SELECT: user_id IS NULL OR user_id = auth.uid()',
        'INSERT/UPDATE/DELETE: Restricted to own custom exercises (user_id = auth.uid())',
      ],
    },
    exercise_tags: {
      name: 'exercise_tags',
      desc: '動作變式標籤表。支援全域預設標籤與使用者自訂擴充標籤。',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NO', desc: 'Primary Key' },
        { name: 'exercise_id', type: 'UUID', key: 'FK', nullable: 'NO', desc: '關聯 exercises.id (ON DELETE CASCADE)' },
        { name: 'tag_name', type: 'TEXT', key: '', nullable: 'NO', desc: '變式名稱（如：單腿、箱上、窄握）' },
        { name: 'user_id', type: 'UUID', key: 'FK', nullable: 'YES', desc: 'NULL 表內建推薦標籤；UUID 表個人擴充標籤' },
      ],
      rls: [
        'SELECT: user_id IS NULL OR user_id = auth.uid()',
        'INSERT/DELETE: user_id = auth.uid()',
      ],
    },
  }

  const activeTableData = tables[selectedTable as keyof typeof tables] || tables.workouts

  return (
    <div className="space-y-6">
      {/* Visual ERD Entity Graph */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            實體關聯模型 (Interactive ERD Diagram)
          </h2>
          <span className="text-xs text-muted-foreground">點擊實體卡片檢視資料表結構與 RLS 原則</span>
        </div>

        {/* ERD Nodes Representation */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Object.entries(tables).map(([key, tbl]) => {
            const isSelected = selectedTable === key
            return (
              <div
                key={key}
                onClick={() => setSelectedTable(key)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/10 shadow-sm'
                    : 'border-border bg-background/60 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-foreground">{tbl.name}</span>
                  <Table className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                  {tbl.desc}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{tbl.columns.length} columns</span>
                  <span className="text-emerald-500 font-semibold">RLS Active</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Relationship Connectors Legend */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">關鍵外鍵約束：</span>
          <span className="flex items-center gap-1 font-mono">
            <code className="text-primary font-bold">profiles</code> (1) ── (N){' '}
            <code className="text-primary font-bold">workouts</code> [CASCADE]
          </span>
          <span className="flex items-center gap-1 font-mono">
            <code className="text-primary font-bold">workouts</code> (1) ── (N){' '}
            <code className="text-primary font-bold">workout_sets</code> [CASCADE]
          </span>
          <span className="flex items-center gap-1 font-mono">
            <code className="text-primary font-bold">exercises</code> (1) ── (N){' '}
            <code className="text-primary font-bold">exercise_tags</code> [CASCADE]
          </span>
        </div>
      </div>

      {/* Selected Table Detail */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div>
            <div className="text-xs font-semibold text-primary">PostgreSQL Schema Definition</div>
            <h3 className="text-lg font-bold text-foreground font-mono">TABLE public.{activeTableData.name}</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
            {activeTableData.desc}
          </span>
        </div>

        {/* Columns Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">欄位名稱 (Column)</th>
                <th className="py-2.5 px-3">資料型別 (Data Type)</th>
                <th className="py-2.5 px-3">鍵約束 (Constraint)</th>
                <th className="py-2.5 px-3">Nullable</th>
                <th className="py-2.5 px-3">說明 (Description)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {activeTableData.columns.map((col, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-foreground">{col.name}</td>
                  <td className="py-2.5 px-3 text-primary">{col.type}</td>
                  <td className="py-2.5 px-3">
                    {col.key === 'PK' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                        <Key className="h-2.5 w-2.5" /> PK
                      </span>
                    )}
                    {col.key === 'FK' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                        FK
                      </span>
                    )}
                    {col.key === 'INDEX' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px]">
                        IDX
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{col.nullable}</td>
                  <td className="py-2.5 px-3 font-sans text-foreground/80">{col.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table RLS Rules */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary" />
            掛載之 Row Level Security (RLS) 策略
          </h4>
          <div className="space-y-1.5">
            {activeTableData.rls.map((rule, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs font-mono text-foreground/80 flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB 4: 安全防護與 RLS 矩陣 (Security Matrix & Row Level Security)
   ═══════════════════════════════════════════════════════════════════════════════ */
function SecurityMatrixTab() {
  const [selectedActor, setSelectedActor] = useState<'userA' | 'userB' | 'admin' | 'guest'>('userA')
  const [selectedAction, setSelectedAction] = useState<
    'selectOwn' | 'selectOther' | 'deleteOwn' | 'deleteOther' | 'adminPanel' | 'changeRole'
  >('selectOther')

  const actors = {
    userA: { name: '會員 A (一般會員)', role: 'member', uid: 'uuid-user-a' },
    userB: { name: '會員 B (一般會員)', role: 'member', uid: 'uuid-user-b' },
    admin: { name: '管理員 (系統 Admin)', role: 'admin', uid: 'uuid-admin-root' },
    guest: { name: '未登入訪客 (Guest)', role: 'anon', uid: null },
  }

  const actions = {
    selectOwn: {
      name: '讀取 會員 A 的課表紀錄 (SELECT workouts)',
      targetOwner: 'userA',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'userA') return { allowed: true, reason: 'auth.uid() = user_id 符合，完全存取。' }
        if (actorKey === 'admin') return { allowed: true, reason: '管理員具備 profiles.role = "admin" 監控權限。' }
        return { allowed: false, reason: 'RLS 嚴格隔離：查詢結果自動為空集合 (0 rows returned)。' }
      },
    },
    selectOther: {
      name: '嘗試讀取 會員 B 的課表紀錄 (SELECT workouts)',
      targetOwner: 'userB',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'userB') return { allowed: true, reason: 'auth.uid() = user_id 匹配。' }
        if (actorKey === 'admin') return { allowed: true, reason: '管理員允許查閱所有會員之訓練明細。' }
        return { allowed: false, reason: 'RLS 策略拒絕：auth.uid() 與該課表之 user_id 不符，阻絕存取。' }
      },
    },
    deleteOwn: {
      name: '刪除 會員 A 自己的課表 (DELETE workout)',
      targetOwner: 'userA',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'userA') return { allowed: true, reason: '本人刪除，連鎖 (CASCADE) 清理所屬組數明細。' }
        if (actorKey === 'admin') return { allowed: true, reason: '管理員後台具備安全刪除異常課表權限。' }
        return { allowed: false, reason: '未授權刪除，資料庫拋出 403 拒絕變更。' }
      },
    },
    deleteOther: {
      name: '非本人嘗試刪除 會員 A 的課表 (DELETE workout)',
      targetOwner: 'userA',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'admin') return { allowed: true, reason: '管理員授權通過（後台管理功能）。' }
        return { allowed: false, reason: '嚴格越權防護：RLS 判定 USING(auth.uid() = user_id) 失敗，刪除影響行數為 0。' }
      },
    },
    adminPanel: {
      name: '造訪管理員儀表板 (GET /[locale]/admin)',
      targetOwner: 'system',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'admin') return { allowed: true, reason: 'checkIsAdmin() 返回 isAdmin: true，儀表板完整載入。' }
        return { allowed: false, reason: '雙層防衛攔截：前端自動呈現友好之「無管理員存取權限」阻擋卡片。' }
      },
    },
    changeRole: {
      name: '修改會員角色 (UPDATE profiles SET role = "admin")',
      targetOwner: 'system',
      evaluates: (actorKey: keyof typeof actors) => {
        if (actorKey === 'admin') return { allowed: true, reason: '管理員專屬權限：允許升級或降級會員角色。' }
        return { allowed: false, reason: '一般會員或訪客無權修改 role 欄位，由 DB CHECK 與 Server Action 雙重阻斷。' }
      },
    },
  }

  const currentResult = actions[selectedAction].evaluates(selectedActor)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <ShieldCheck className="h-4 w-4" />
            1. 深度防禦 (Defense in Depth)
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            系統不在前端或單一 API 端點倚賴單一驗證，而是建構「Edge Proxy $\to$ Server Action 邏輯守衛 $\to$ PostgreSQL RLS 資料庫原生圍欄」三重防線。
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <Lock className="h-4 w-4" />
            2. 零密碼攻擊面
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            採用無密碼 Magic Link + PKCE 授權，伺服器不儲存使用者雜湊密碼（Hash），完全杜絕字典攻擊、撞庫（Credential Stuffing）與密碼外洩風險。
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <Database className="h-4 w-4" />
            3. 零金鑰洩漏保證
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            瀏覽器僅能存取公開的 Supabase Anon Key。具備超級權限的 Service Role Key 僅於特定背景任務保留，一般業務代碼 100% 透過 RLS 隔離。
          </p>
        </div>
      </div>

      {/* Interactive RLS Sandbox */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Row Level Security (RLS) 動態沙盒模擬
            </h2>
            <p className="text-xs text-muted-foreground">
              切換不同操作者角色與操作目標，即時演算安全存取原則之判定結果
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
            PostgreSQL Engine v16
          </span>
        </div>

        {/* Select Actor */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
            步驟 1：選擇操作角色 (Simulated Actor)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(Object.keys(actors) as Array<keyof typeof actors>).map((k) => (
              <button
                key={k}
                onClick={() => setSelectedActor(k)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedActor === k
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-border bg-background/60 hover:bg-muted text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">{actors[k].name}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  role: {actors[k].role}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Select Action */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
            步驟 2：選擇欲執行的資料庫操作 (Target Action)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(Object.keys(actions) as Array<keyof typeof actions>).map((actKey) => (
              <button
                key={actKey}
                onClick={() => setSelectedAction(actKey)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedAction === actKey
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-border bg-background/60 hover:bg-muted text-foreground'
                }`}
              >
                <div className="text-xs leading-snug">{actions[actKey].name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Evaluation Output */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            currentResult.allowed
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {currentResult.allowed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-500" />
              )}
              <span
                className={`text-sm font-bold tracking-tight ${
                  currentResult.allowed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {currentResult.allowed ? '存取核可 (ACCESS GRANTED ✅)' : '存取阻斷 (ACCESS DENIED ❌)'}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/80 text-foreground">
              RLS Policy Check
            </span>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed font-sans">{currentResult.reason}</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB 5: 核心邏輯實驗室 (Interactive Logic Lab)
   ═══════════════════════════════════════════════════════════════════════════════ */
function LogicLabTab({ locale }: { locale: string }) {
  // Tool 1: Cardio Pace Calculator
  const [distanceKm, setDistanceKm] = useState<string>('5.0')
  const [durationInput, setDurationInput] = useState<string>('27:30')

  const parsedSeconds = parseTimeToSeconds(durationInput)
  const calculatedPace = calculatePace(parseFloat(distanceKm), parsedSeconds)
  const speedKmh =
    parseFloat(distanceKm) > 0 && parsedSeconds && parsedSeconds > 0
      ? ((parseFloat(distanceKm) / parsedSeconds) * 3600).toFixed(2)
      : null

  // Tool 2: i18n Fallback Cascade Simulator
  const [nameHu, setNameHu] = useState<string>('Guggolás')
  const [nameEn, setNameEn] = useState<string>('Barbell Squat')
  const [nameZh, setNameZh] = useState<string>('')
  const [simulatedLocale, setSimulatedLocale] = useState<'zh-TW' | 'en' | 'hu'>('zh-TW')

  const resolveSimulatedName = () => {
    if (simulatedLocale === 'zh-TW') {
      if (nameZh.trim()) return { name: nameZh, source: '當前語系匹配 (name_zh)' }
      if (nameHu.trim()) return { name: nameHu, source: '匈牙利語優先備用 (name_hu fallback)' }
      if (nameEn.trim()) return { name: nameEn, source: '英語次級備用 (name_en fallback)' }
      return { name: '未命名動作', source: '無符合資料' }
    } else if (simulatedLocale === 'en') {
      if (nameEn.trim()) return { name: nameEn, source: '當前語系匹配 (name_en)' }
      if (nameHu.trim()) return { name: nameHu, source: '匈牙利語優先備用 (name_hu fallback)' }
      if (nameZh.trim()) return { name: nameZh, source: '中文次級備用 (name_zh fallback)' }
      return { name: 'Unnamed Exercise', source: 'No data' }
    } else {
      if (nameHu.trim()) return { name: nameHu, source: '當前語系匹配 (name_hu)' }
      if (nameEn.trim()) return { name: nameEn, source: '英語次級備用 (name_en fallback)' }
      if (nameZh.trim()) return { name: nameZh, source: '中文次級備用 (name_zh fallback)' }
      return { name: 'Névtelen gyakorlat', source: 'Nincs adat' }
    }
  }

  const simulatedResult = resolveSimulatedName()

  // Tool 3: Calculation Type Matrix
  const [selectedCalcType, setSelectedCalcType] = useState<string>('weight_reps')

  const calcTypeConfigs: Record<
    string,
    { title: string; fields: string[]; examples: string; formula: string }
  > = {
    weight_reps: {
      title: '重量 + 次數 (Weight & Reps)',
      fields: ['重量 (kg)', '次數 (reps)'],
      examples: '槓鈴臥推、深蹲、硬舉、啞鈴肩推、臀推',
      formula: '總訓練量 (Volume) = 重量 × 次數 × 組數',
    },
    reps: {
      title: '僅次數 (Reps Only)',
      fields: ['次數 (reps)'],
      examples: '徒手深蹲、引體向上、伏地挺身、跪姿後踢、蚌式開合',
      formula: '總重複數 = 次數 × 組數',
    },
    duration: {
      title: '僅時間 (Duration Only)',
      fields: ['秒數 / 時間 (mm:ss)'],
      examples: '棒式平板支撐、靜態伸展、靠牆深蹲',
      formula: '累積張力時間 (Time Under Tension) = 秒數累加',
    },
    distance_duration: {
      title: '距離 + 時間 (Distance & Duration)',
      fields: ['距離 (km)', '時間 (mm:ss)'],
      examples: '慢跑、自行車、划船機',
      formula: '平均配速 = 時間(秒) ÷ 距離(km) $\\to$ 格式化為 mm\'ss"/km',
    },
    reps_duration: {
      title: '次數 + 時間 (Reps & Duration)',
      fields: ['次數 (reps)', '時間 (mm:ss)'],
      examples: '跳繩、波比跳 (Burpees)、高強度間歇訓練 (HIIT)',
      formula: '輸出功率 = 次數 ÷ 時間',
    },
  }

  return (
    <div className="space-y-6">
      {/* Tool 1: Cardio Pace Calculation */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              1. 有氧配速換算模組 (Live Cardio Pace Engine)
            </h3>
            <p className="text-xs text-muted-foreground">
              調用專案內部 `src/lib/cardio.ts` 演算法，即時解析時間字串並精準換算每公里配速
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-mono">
            src/lib/cardio.ts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                距離 (公里 / km)
              </label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="例如: 5.0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                時間 (支援 "27:30", "1:15:00", 或純分鐘 "30")
              </label>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="例如: 27:30"
              />
            </div>
          </div>

          {/* Result preview */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                演算法即時解析結果
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">解析總秒數：</span>
                  <span className="font-mono font-bold text-foreground">{parsedSeconds ?? '無效輸入'} 秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">時間標準格式化：</span>
                  <span className="font-mono font-bold text-foreground">{formatSecondsToTime(parsedSeconds) || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均時速：</span>
                  <span className="font-mono font-bold text-foreground">{speedKmh ? `${speedKmh} km/h` : '—'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">平均每公里配速 (Pace)：</span>
              <span className="text-lg font-black text-primary font-mono">{calculatedPace ?? '無法換算'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool 2: i18n Fallback Simulator */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              2. 匈牙利語優先多語備用鏈測試器 (i18n Fallback Tester)
            </h3>
            <p className="text-xs text-muted-foreground">
              測試當資料庫動作缺乏中文或英文名稱時，系統如何依據備用鏈智能解析呈現
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-mono">
            src/lib/exercises.ts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              匈牙利語名稱 (name_hu)
            </label>
            <input
              type="text"
              value={nameHu}
              onChange={(e) => setNameHu(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="例如: Guggolás"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              英語名稱 (name_en)
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="例如: Barbell Squat"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              繁體中文名稱 (name_zh) [試著清空它]
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="清空以觸發 Fallback 備用鏈"
            />
          </div>
        </div>

        {/* Locale switch test */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground">切換測試語系環境：</span>
          {[
            { key: 'zh-TW', label: '繁體中文 (zh-TW)' },
            { key: 'hu', label: 'Magyar (hu)' },
            { key: 'en', label: 'English (en)' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSimulatedLocale(item.key as 'zh-TW' | 'en' | 'hu')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                simulatedLocale === item.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 border-border text-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Simulation Output Card */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">最終 UI 呈現之名稱</div>
            <div className="text-lg font-bold text-foreground mt-0.5">{simulatedResult.name}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">解析決策來源</span>
            <div className="text-xs font-bold text-primary">{simulatedResult.source}</div>
          </div>
        </div>
      </div>

      {/* Tool 3: Calculation Type Matrix */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            3. 五大多元運動計量模式矩陣 (Calculation Type Matrix)
          </h3>
          <p className="text-xs text-muted-foreground">
            展示前端表單與後端資料庫如何依據計量模式動態調整輸入欄位與驗證原則
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(calcTypeConfigs).map((typeKey) => (
            <button
              key={typeKey}
              onClick={() => setSelectedCalcType(typeKey)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                selectedCalcType === typeKey
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/40 border-border hover:bg-muted text-foreground'
              }`}
            >
              {calcTypeConfigs[typeKey].title}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">啟用之動態表單欄位：</span>
            <span className="font-bold text-foreground">
              {calcTypeConfigs[selectedCalcType].fields.join(' + ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">典型適用動作：</span>
            <span className="font-medium text-foreground">
              {calcTypeConfigs[selectedCalcType].examples}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border/50">
            <span className="text-muted-foreground">數據統計計算公式：</span>
            <span className="font-mono font-semibold text-primary">
              {calcTypeConfigs[selectedCalcType].formula}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
