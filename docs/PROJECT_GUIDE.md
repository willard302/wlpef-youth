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
- **報名狀況檢視 (管理員)**: 管理員可進入專用頁面，檢視各活動的報名名單，並追蹤 Google 試算表同步狀態。
- **權限管理**: 管理員與建立者可編輯或刪除活動。

### 🔐 智慧註冊與帳號整合流程 (Smart Registration & Account Merging)
- **社群優先註冊**: 支援 Google 與 Apple 快速登入，初次登入時會自動以社群信箱建立帳號。
- **自動偵測重複信箱**: 當使用者嘗試以相同信箱進行一般註冊時，系統會自動偵測該信箱是否已被社群帳號佔用。
- **無縫帳號升級 (Linking)**: 
  - 若偵測到該信箱僅有社群登入權限（無密碼），系統會引導使用者透過「重設密碼」流程為現有帳號補設密碼。
  - 完成驗證後，使用者即可同時使用社群登入與一般信箱密碼登入，保留所有原始資料與點數。
- **重複帳號自動合併**: 透過 Edge Function (`merge-duplicate-account`)，在登入確認階段自動處理可能產生的重複帳號紀錄，確保使用者權益（如點數與報名紀錄）不因登入方式不同而分散。

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
  - `target_id`: 外部系統識別碼，用於跨系統資料比對與排行榜整合。
  - `subdomain`: 活動專屬子網域代稱，預留給未來專屬頁面功能使用。
  - `registration_bonus`: 報名活動可獲得的獎勵點數。
  - `social_leaderboard`: 是否啟動社交排行榜功能，開啟後會將資料納入排行榜視圖。
  - `raffle_threshold`: 抽獎點數門檻，用於判定使用者是否具備該活動的抽獎資格。
  - `checkin_bonus`: 活動簽到可獲得的獎勵點數。

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

### 其他識別參數
- **Target ID**:
  - **跨系統對接**: 用於生成報名紀錄的唯一識別碼，方便與外部系統或舊有資料對接。
  - **社交排行榜**: 該 ID 會呈現在 `social_leaderboard` 視圖中，供外部行銷或抽獎工具快速抓取特定活動資料。
- **活動子網域 (Subdomain)**:
  - **預留擴充**: 目前為預留欄位，未來將用於自動生成活動專屬網頁（如 `youth-camp.domain.com`）。目前不填寫不影響功能。

### 遊戲化與社交功能 (Gamification & Social)
- **社交排行榜 (`social_leaderboard`)**:
- **自動彙整**: 開啟後，系統會自動在資料庫視圖中計算參加者的「活動點數」、「總點數」與「報名順序」。
- **應用場景**: 適用於現場大螢幕即時排名顯示、活動積分競賽等。
- **抽獎資格判定 (`raffle_threshold`)**:
- **自動篩選**: 設定門檻點數後，排行榜視圖會自動標記達標的使用者。
- **應用場景**: 快速產出符合抽獎資格的名單，減少人工核對時間。

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
