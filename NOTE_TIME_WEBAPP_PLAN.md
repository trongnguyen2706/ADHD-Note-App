# Note Time Webapp Implementation Plan

Ngày tạo: 2026-06-29

## 1. Mục tiêu phiên bản đầu

Xây một web app nhỏ tên **Note Time** để ghi nhanh việc đang làm theo mốc giờ hiện tại.

Yêu cầu quan trọng nhất của bản đầu:

- Chạy tốt trên PC web.
- Có thể install trên điện thoại như app bằng PWA.
- Dữ liệu đồng bộ giữa PC và điện thoại.
- Giao diện nền trắng, hiện đại, minimal, có cảm giác glassmorphism nhẹ.
- Màn hình chính là nhiều note/card theo ngày.
- Bấm vào một ngày mới mở danh sách entry chi tiết của ngày đó.
- Search theo ngày, tháng, năm, giờ, hoặc hành động.
- Khi search theo hành động, hiện ngày có hành động đó và highlight phần match.

## 2. Quyết định kiến trúc

### Stack đề xuất

```text
Frontend: React + Vite + TypeScript
UI: CSS modules hoặc Tailwind CSS, lucide-react icons
PWA: vite-plugin-pwa + Web App Manifest + Service Worker
Auth: Firebase Authentication
Database/sync: Firebase Cloud Firestore
Hosting: Firebase Hosting, Vercel, hoặc Cloudflare Pages
```

### Lý do chọn stack này

- Web app làm nhanh, deploy dễ, mở được trên PC và điện thoại.
- PWA giúp install lên điện thoại mà chưa cần App Store/Google Play.
- Firestore có realtime sync giữa nhiều thiết bị.
- Firestore hỗ trợ offline persistence cho web, Android, Apple app; khi online lại có thể sync thay đổi local lên backend.
- Nếu sau này làm app native bằng Expo/React Native, phần model, search parser, repository interface vẫn có thể tái sử dụng.

### Không chọn localStorage làm storage chính

`localStorage` chỉ lưu trên một trình duyệt/một máy. Nếu dùng localStorage thì điện thoại và PC không tự đồng bộ được.

Bản này cần sync nên dữ liệu chính phải nằm trên cloud database. Local cache chỉ là lớp phụ để app mở nhanh và dùng được khi mạng chập chờn.

## 3. Quyết định đồng bộ dữ liệu

### Source of truth

Firestore là nguồn dữ liệu chính.

Mỗi user đăng nhập sẽ có data riêng:

```text
users/{uid}/entries/{entryId}
```

MVP chỉ cần collection `entries`. App sẽ group entry theo ngày ở client.

Sau này nếu dữ liệu nhiều, có thể thêm:

```text
users/{uid}/days/{dateKey}
```

để lưu summary theo ngày, giảm số lần đọc.

### Auth bắt buộc để sync

Muốn cùng dữ liệu trên PC và điện thoại thì user phải đăng nhập cùng một tài khoản.

Luồng MVP nên dùng:

```text
Continue with Google
```

Có thể thêm anonymous auth sau để dùng thử, nhưng anonymous auth riêng trên mỗi máy sẽ không tự sync qua thiết bị khác nếu không link tài khoản.

### Offline/cache

Firestore web SDK sẽ bật persistent local cache bằng IndexedDB.

Vai trò:

- App vẫn thấy dữ liệu đã tải trước đó khi mất mạng.
- Entry tạo lúc offline được queue lại.
- Khi online lại, Firestore sync lên cloud.

Lưu ý: dữ liệu cache vẫn nằm trên thiết bị. Nếu sau này app có thông tin nhạy cảm, cần có setting kiểu "Enable offline on this trusted device".

### Conflict rule

MVP dùng quy tắc đơn giản:

```text
Last write wins
```

Vì entry chủ yếu là note ngắn, rủi ro conflict thấp.

Mỗi entry vẫn lưu `updatedAt` để sau này có thể làm conflict resolution rõ hơn.

## 4. Data model

### Entry document

```ts
type TimeEntry = {
  id: string;
  userId: string;
  dateKey: string;        // "2026-06-29"
  monthKey: string;       // "2026-06"
  timeText: string;       // "14:32"
  text: string;           // "Write project plan"
  textNormalized: string; // lower-case, bỏ dấu tiếng Việt nếu cần
  capturedAt: string;     // ISO string từ device tại lúc bấm +
  timezone: string;       // ví dụ "Asia/Saigon"
  createdAt: Timestamp;   // serverTimestamp
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};
```

### Vì sao cần cả `capturedAt` và `createdAt`

- `capturedAt`: thời điểm user muốn ghi nhận. Đây là thời gian hiển thị trong app.
- `createdAt`: thời điểm server nhận record. Dùng để debug/sync.

Nếu user bấm `+` lúc 14:32 nhưng offline đến 14:50 mới sync, app vẫn phải hiển thị entry ở 14:32.

### Day group trong UI

```ts
type DayGroup = {
  dateKey: string;
  displayDate: string; // "29/06"
  fullDate: string;    // "29 June 2026"
  entries: TimeEntry[];
  entryCount: number;
  previewEntries: TimeEntry[];
  hasSearchMatch: boolean;
};
```

## 5. Firestore security rules

Mục tiêu: user chỉ đọc/ghi data của chính mình.

Rules dự kiến:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, create, update, delete: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

Sau khi thêm soft delete, app có thể không dùng delete thật mà set `deletedAt`.

## 6. UI direction

### Visual style

Phong cách chính:

- Pure white background.
- Glass card nhẹ, không nền ảnh.
- Border xám rất nhạt.
- Shadow mềm, ít.
- Typography sạch, có thể dùng serif cho title nhỏ nếu hợp.
- Accent ice-blue cho selected state.
- Amber nhạt chỉ dùng cho highlight search.

Palette đề xuất:

```css
--bg: #ffffff;
--panel: rgba(255, 255, 255, 0.72);
--border: rgba(20, 23, 31, 0.08);
--text: #171923;
--muted: #747985;
--accent: #8fc7ff;
--accent-strong: #2f80ed;
--highlight: rgba(255, 196, 87, 0.35);
--danger: #d64545;
```

### Desktop layout

```text
+----------------------------------------------------------+
| Note Time              [ Search date, time, action ]     |
|----------------------------------------------------------|
|                                                          |
| [12/06 card] [15/06 card] [20/06 card]      Detail panel |
| [29/06 card] [30/06 card] [01/07 card]      Timeline     |
|                                                          |
|                                                (+)       |
+----------------------------------------------------------+
```

Desktop có 3 vùng:

- Header: title + search.
- Main grid: cards theo ngày.
- Detail panel bên phải: hiện ngày đang chọn.

### Mobile/PWA layout

```text
+----------------------+
| Note Time            |
| [ Search...        ] |
|                      |
| [12/06 card]         |
| [15/06 card]         |
| [20/06 card]         |
|                      |
|                  (+) |
+----------------------+
```

Mobile không nên ép detail panel bên phải. Bấm card sẽ mở:

- route `/day/:dateKey`, hoặc
- bottom sheet/fullscreen drawer.

MVP nên dùng route `/day/:dateKey` để dễ deep link và dễ back.

### Components

```text
AppShell
AuthGate
TopBar
SearchBar
DayGrid
DayCard
DayDetailPanel
DayDetailPage
TimelineEntry
AddEntryModal
EditEntryModal
FloatingAddButton
SyncStatus
InstallAppPrompt
EmptyState
Toast
```

## 7. Search behavior

### Input patterns cần support

```text
12/06
12/06/2026
2026-06-12
06/2026
14:32
14
gym
go to gym
viết plan
```

### Search parser

Search chia thành 4 loại:

```ts
type SearchMode =
  | "empty"
  | "date"
  | "month"
  | "time"
  | "text";
```

Rule:

- Có format ngày rõ ràng -> search theo `dateKey`.
- Có format tháng/năm -> search theo `monthKey`.
- Có format giờ `HH:mm` hoặc chỉ `HH` -> search theo `timeText`.
- Còn lại -> search theo `textNormalized`.

### Search result trên màn hình chính

Khi search:

- Vẫn hiển thị card theo ngày.
- Chỉ giữ các ngày có match.
- Card preview ưu tiên dòng match.
- Highlight phần match trong text/time/date.

### Search trong detail

Khi bấm vào card từ kết quả search:

- Mở ngày tương ứng.
- Dòng match được highlight.
- Nếu danh sách dài, scroll tới match đầu tiên.

## 8. PWA install plan

### Files cần có

```text
public/manifest.webmanifest
public/icons/icon-192.png
public/icons/icon-512.png
src/service-worker.ts hoặc config vite-plugin-pwa
```

### Manifest tối thiểu

```json
{
  "name": "Note Time",
  "short_name": "Note Time",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Install support

- Android Chrome/Edge: có thể hiện install prompt.
- iOS: user thường cài bằng Share menu -> Add to Home Screen. Không dựa vào `beforeinstallprompt` trên iOS.
- Desktop Chrome/Edge: install được từ browser UI nếu manifest hợp lệ.
- App phải chạy qua HTTPS khi deploy. Localhost vẫn dùng được khi dev.

### Service worker strategy

MVP:

- Cache app shell: HTML, CSS, JS, icon.
- Network-first hoặc stale-while-revalidate cho app assets.
- Firestore data sync/cache do Firestore SDK xử lý.

Không tự cache Firestore API bằng service worker để tránh lỗi dữ liệu stale khó debug.

## 9. Implementation phases

### Phase 0 - Chuẩn bị repo

Checklist:

- [ ] Tạo Vite React TypeScript app.
- [ ] Cài dependencies.
- [ ] Setup lint/format.
- [ ] Tạo cấu trúc folder.
- [ ] Thêm env file mẫu.

Commands dự kiến:

```bash
npm create vite@latest . -- --template react-ts
npm install firebase lucide-react date-fns
npm install -D vite-plugin-pwa eslint prettier
```

Cấu trúc folder:

```text
src/
  app/
  components/
  features/
    auth/
    entries/
    search/
    pwa/
  lib/
    firebase/
    time/
    text/
  styles/
  types/
```

### Phase 1 - Firebase setup

Checklist:

- [ ] Tạo Firebase project.
- [ ] Enable Firebase Auth.
- [ ] Enable Google provider.
- [ ] Enable Firestore.
- [ ] Add web app trong Firebase console.
- [ ] Lưu config vào `.env.local`.
- [ ] Tạo `src/lib/firebase/client.ts`.
- [ ] Bật Firestore persistent local cache cho web.
- [ ] Viết security rules theo `users/{uid}/entries`.

Env mẫu:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Phase 2 - Auth flow

Checklist:

- [ ] Tạo `AuthGate`.
- [ ] Tạo màn sign-in minimal.
- [ ] Thêm nút `Continue with Google`.
- [ ] Lưu auth state bằng Firebase Auth.
- [ ] Thêm logout trong menu.
- [ ] Khi chưa login, không đọc/ghi Firestore.

Acceptance:

- [ ] Login trên PC.
- [ ] Login cùng account trên điện thoại.
- [ ] Cả hai thiết bị thấy cùng data.

### Phase 3 - Repository layer

Tạo interface để UI không phụ thuộc trực tiếp Firebase:

```ts
type EntryRepository = {
  subscribeEntries(userId: string, cb: (entries: TimeEntry[]) => void): () => void;
  addEntry(input: AddEntryInput): Promise<void>;
  updateEntry(input: UpdateEntryInput): Promise<void>;
  softDeleteEntry(entryId: string): Promise<void>;
};
```

Checklist:

- [ ] Tạo type `TimeEntry`.
- [ ] Tạo helper `getCurrentEntryTime()`.
- [ ] Tạo helper `normalizeText()`.
- [ ] Implement Firestore repository.
- [ ] Query entries theo user, `deletedAt == null`.
- [ ] Sort entry theo `capturedAt`.
- [ ] Realtime subscribe bằng Firestore listener.

### Phase 4 - Seed data và dev mocks

Checklist:

- [ ] Tạo data mẫu 5-7 ngày.
- [ ] Có entry giống concept: Breakfast, Go to gym, Reading, Write project plan.
- [ ] Tạo dev-only seed button hoặc script.
- [ ] Có empty state nếu chưa có data.

### Phase 5 - Desktop UI foundation

Checklist:

- [ ] Global CSS variables.
- [ ] White background.
- [ ] App shell responsive.
- [ ] Top bar với title `Note Time`.
- [ ] Search bar centered.
- [ ] Main grid daily cards.
- [ ] Right detail panel.
- [ ] Floating plus button.
- [ ] Sync status nhỏ: `Synced`, `Offline`, `Syncing`.

Desktop acceptance:

- [ ] 1366px width nhìn cân.
- [ ] 1920px width không bị rỗng quá mức.
- [ ] Text không tràn card.
- [ ] Không có card lồng trong card.
- [ ] Nút `+` luôn dễ bấm.

### Phase 6 - Day cards

Card cần hiển thị:

- Date: `12/06`.
- Label: `6 entries` hoặc `Today`.
- 2-3 preview entry.
- Search highlight nếu có.
- Selected state nếu đang mở detail.

Checklist:

- [ ] Group entries theo `dateKey`.
- [ ] Sort ngày mới nhất trước.
- [ ] Preview entry ưu tiên match search.
- [ ] Card click chọn ngày.
- [ ] Keyboard accessible: Enter mở card.

### Phase 7 - Detail panel/page

Desktop:

- Detail panel bên phải.

Mobile:

- Detail page hoặc full-screen sheet.

Checklist:

- [ ] Title ngày đầy đủ: `12 June 2026`.
- [ ] Timeline entry theo giờ.
- [ ] Highlight match.
- [ ] Edit action.
- [ ] Delete action.
- [ ] Empty state cho ngày không có entry.

### Phase 8 - Add entry flow

Luồng:

```text
Click + -> lấy giờ hiện tại -> mở modal -> nhập action -> OK -> lưu Firestore
```

Checklist:

- [ ] Floating plus button.
- [ ] Add modal/sheet.
- [ ] Hiển thị `Now 14:32`.
- [ ] Textarea/input cho action.
- [ ] `OK` lưu.
- [ ] `Esc` đóng trên desktop.
- [ ] `Ctrl/Cmd + Enter` lưu nhanh.
- [ ] Validate không lưu text rỗng.
- [ ] Sau khi lưu, card hôm nay update realtime.
- [ ] Nếu detail panel đang ở hôm nay, entry mới hiện ngay.

### Phase 9 - Search

Checklist:

- [ ] Implement `parseSearchQuery()`.
- [ ] Implement `filterDayGroups()`.
- [ ] Implement `highlightMatch()`.
- [ ] Search ngày.
- [ ] Search tháng.
- [ ] Search năm nếu cần.
- [ ] Search giờ.
- [ ] Search text/action.
- [ ] Bấm card từ search mở đúng ngày và scroll tới match.

Test cases:

```text
Search "12/06" -> chỉ hiện ngày 12/06.
Search "06/2026" -> hiện các ngày trong tháng 06/2026.
Search "09:18" -> hiện ngày có entry 09:18.
Search "gym" -> hiện ngày có "Go to gym", highlight "gym".
Search empty -> hiện toàn bộ ngày.
```

### Phase 10 - Edit/delete

Checklist:

- [ ] Edit entry text.
- [ ] Optional: edit time/date nếu ghi nhầm.
- [ ] Soft delete bằng `deletedAt`.
- [ ] Confirm delete nhẹ, không làm phiền quá nhiều.
- [ ] Undo delete trong vài giây bằng toast.

### Phase 11 - PWA install

Checklist:

- [ ] Add manifest.
- [ ] Generate app icons 192/512.
- [ ] Add Apple touch icon.
- [ ] Add theme color.
- [ ] Configure `vite-plugin-pwa`.
- [ ] Register service worker.
- [ ] Add install button/banner cho browser hỗ trợ.
- [ ] Add iOS fallback copy: hướng dẫn ngắn trong menu install.
- [ ] Test Lighthouse PWA.

Acceptance:

- [ ] Install được trên Android Chrome.
- [ ] Add to Home Screen được trên iPhone.
- [ ] Install được trên desktop Chrome/Edge.
- [ ] Mở từ icon thì chạy standalone, không giống tab browser.

### Phase 12 - Sync verification

Checklist:

- [ ] Login cùng Google account trên PC và điện thoại.
- [ ] Tạo entry trên PC, điện thoại thấy trong vài giây.
- [ ] Tạo entry trên điện thoại, PC thấy trong vài giây.
- [ ] Tắt mạng điện thoại, tạo entry, bật mạng lại, PC thấy entry sau khi sync.
- [ ] Mở 2 tab PC, data update đồng bộ.
- [ ] Logout/login lại vẫn thấy data.

### Phase 13 - Deploy

Checklist:

- [ ] Chọn hosting HTTPS.
- [ ] Set env vars trên hosting.
- [ ] Build production.
- [ ] Deploy.
- [ ] Test PWA install trên domain thật.
- [ ] Test Firestore rules với user khác.

Gợi ý:

```text
Firebase Hosting nếu muốn cùng ecosystem với Auth/Firestore.
Vercel nếu muốn deploy React app rất nhanh.
Cloudflare Pages nếu muốn CDN nhanh và đơn giản.
```

MVP nên dùng **Firebase Hosting** cho đồng bộ stack.

### Phase 14 - Polish

Checklist:

- [ ] Loading skeleton.
- [ ] Offline badge.
- [ ] Toast khi sync thành công/lỗi.
- [ ] Empty state đẹp.
- [ ] Smooth open/close modal.
- [ ] Responsive mobile.
- [ ] Keyboard shortcuts.
- [ ] Export JSON backup.
- [ ] Import JSON backup.

## 10. Testing plan

### Unit tests

- `normalizeText()`
- `parseSearchQuery()`
- `filterDayGroups()`
- `groupEntriesByDay()`
- `highlightMatch()`

### Integration tests

- Add entry.
- Search text.
- Open day detail.
- Edit entry.
- Delete entry.

### Manual QA

- Desktop Chrome.
- Desktop Edge.
- Mobile Chrome Android.
- Mobile Safari iPhone.
- PWA installed mode.
- Offline then online sync.

## 11. Definition of Done cho MVP

MVP được coi là xong khi:

- [ ] User login bằng Google.
- [ ] User tạo entry bằng nút `+`.
- [ ] App tự lấy giờ hiện tại.
- [ ] Entry lưu vào Firestore.
- [ ] PC và điện thoại sync cùng data.
- [ ] Màn hình chính hiển thị card theo ngày.
- [ ] Bấm card mở detail của ngày.
- [ ] Search theo ngày/giờ/action hoạt động.
- [ ] Match action được highlight.
- [ ] PWA install được trên điện thoại.
- [ ] UI nền trắng, minimal, sạch, không overlap text.

## 12. Rủi ro và quyết định cần nhớ

- Cross-device sync bắt buộc cần login cùng account.
- Anonymous auth chỉ phù hợp dùng thử, không phải sync ổn định giữa PC và điện thoại.
- PWA trên iOS có cách install khác Android; không phụ thuộc vào custom install prompt.
- Firestore offline cache giúp app dùng được khi mạng yếu, nhưng data cache nằm trên thiết bị.
- Search toàn bộ lịch sử bằng client-side chỉ phù hợp MVP. Khi entry nhiều, cần thêm day summary hoặc search index.
- Last-write-wins đủ cho MVP, nhưng nếu sau này nhiều thiết bị edit cùng entry thì cần conflict UI.

## 13. Tài liệu tham khảo

- MDN - Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN - Offline and background operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- Firebase - Firestore offline data: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firebase - Anonymous auth notes: https://firebase.google.com/docs/auth/web/anonymous-auth
