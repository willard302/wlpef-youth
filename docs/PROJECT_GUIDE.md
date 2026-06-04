# WLPEF Youth Project Documentation

## 1. 專案概觀 (Project Overview)
本專案為一個完整的社團管理應用程式，採用 **Nuxt 4**、**TailwindCSS**、**Vant UI** 以及 **Supabase** 構建。專案設計初衷是為了解決社團活動排程與成員管理的需求。

### 核心技術棧 (Core Tech Stack)
- **前端框架**: Nuxt 4 (Vue 3)
- **樣式處理**: TailwindCSS
- **UI 元件庫**: Vant UI
- **後端與認證**: Supabase (PostgreSQL + Auth + Storage)
- **語言**: 繁體中文 (zh-TW)

---

## 2. 主要功能 (Main Features)

### 🏠 整合式數位儀表板 (Unified Dashboard)
- **即將到來活動**: 頂部 Banner 自動顯示最近的一場社團活動。
- **互動式行事曆**: 整合於首頁，支援月份切換、日期選擇與活動標記點。
- **活動列表**: 根據選擇日期顯示詳細的活動資訊（時間、地點、參與人數）。
- **權限管理**: 管理員與建立者可編輯或刪除活動。

### 👤 會員中心 (User Center)
- **個人資料管理**: 支援姓名、校友會/單位、性別及個人簡介的編輯。
- **大頭照上傳**: 整合 Supabase Storage 進行頭像存取。
- **安全設定**: 支援密碼修改。
- **註冊補完**: 針對 Google 登入等外部驗證，提供專用的資料完善頁面 (`google-signup.vue`)。

### 📢 公告系統 (Announcements)
- **首頁公告**: 顯示最新的社團消息與活動通知。

---

## 3. 資料庫架構 (Database Schema - Supabase)

### 關鍵資料表 (Key Tables)
- **`auth.users`**: 由 Supabase Auth 管理，儲存私密憑證。
- **`public.profiles`**: 擴充使用者資訊，用於公開顯示與關聯查詢。
  - `id`: UUID (與 auth.users 關聯)。
  - `name`: 使用者全名。
  - `avatar_url`: 大頭照公開連結。
  - `role`: 角色權限 (`admin`, `member`)。
  - `department`: 校友會或所屬單位。
  - `points`: 成員點數。
  - `bio`: 個人簡介。
- **`events`**: 儲存行事曆活動詳情。
  - `title`: 活動名稱。
  - `start_at` / `end_at`: 起迄時間。
  - `location`: 地點。
  - `color`: 行事曆標記顏色。
  - `google_sheet_id`: 連動的 Google 試算表 ID，用於同步外部報名資料。
  - `registration_bonus`: 報名活動可獲得的獎勵點數。

### 架構優勢
1. **關聯性**: 方便將使用者與活動進行關聯查詢。
2. **類型安全**: 嚴格定義資料類型（如 DATE, INTEGER）。
3. **性能**: 對常用查詢欄位（如 `points` 或 `department`）建立索引。

---

## 4. 外部整合功能 (External Integrations)

### Google 試算表同步
系統支援透過 Google 表單收集報名資訊，並自動同步至本平台：
- **運作原理**: 後端 Edge Function 會定期讀取指定的 `google_sheet_id`。
- **自動比對**: 透過 Email 比對試算表紀錄與平台會員帳號。
- **自動獎勵**: 比對成功後，系統會自動發放「報名獎勵點數」並更新活動參與人數。
- **設定方式**: 僅需在創建活動時填入 **Google 試算表 ID** 即可（確保該試算表已授權給系統服務帳戶讀取）。

---

## 5. UI/UX 標準 (UI/UX Standards)
- **行動優先 (Mobile-First)**: 針對移動端設備進行優化，提供流暢的觸控體驗。
- **視覺風格**: 以「天空藍」(`sky-500`) 為主色調，結合毛玻璃效果 (`backdrop-blur`) 與現代化圓角。
- **全域元件**:
  - `AppHeader`: 統一的頁面導覽與標題。
  - `Tabbar`: 簡約的底部導覽（首頁、個人中心）。
  - `Toast`: 全域訊息通知系統。

---

## 6. 開發指南 (Development Guide)

### 目錄結構 (Folder Structure)
- `app/components`: 可複用的 Vue 元件。
- `app/composables`: 共享的邏輯與狀態管理。
- `app/pages`: 基於路由的頁面視圖。
- `app/services`: 與 Supabase 互動的 API 服務。
- `app/types`: TypeScript 介面與資料庫型別定義。
- `supabase/full_schema.sql`: 完整的資料庫定義文件。

### 開發流程
1. 於 `supabase/full_schema.sql` 定義資料表。
2. 於 `app/services` 實作後端互動邏輯。
3. 建立 Composables 管理狀態。
4. 在 `app/pages` 中建構 UI。
