# Findings - P3.1 Implementation

## Initial Context Analysis
- **SECURITY.md**:
  - `env.js`, `.env`, `project.private.config.json` 等文件均不能提交。
  - `OWNER_KEY_SALT` 必须配置在云开发控制台，不能在代码中硬编码。
  - 用户表 `users` 只能在云端通过云函数读写，前端没有读写权限。
  - `openid` 与 `ownerKey` 绝不能在前端暴露或打印。
- **settingsService.js**:
  - `settingsService` 在本地通过 `localRepository` 管理用户设置，存储在 `STORAGE_KEYS.USER_SETTINGS` 键中。
  - 现有字段：`enabled: true`, `inAppEnabled: true`, `remindDayOptions: [0, 1, 3, 7, 30]`, `defaultRemindDays: 7`, `remindTime: '10:00'`, `syncStatus`, `lastSyncedAt`, `syncError`, `createdAt`, `updatedAt`。
  - `isUnmodifiedReminderSettings` 用于判断设置是否为默认设置，退化为种子数据。
  - `updateSettings` 会更新 `updatedAt` 并将 `syncStatus` 设为 `'pending'`。

## PRD V1.3.7 & Design Guidelines Analysis
- **Aesthetics & compliance**:
  - NO "AI" keywords in the UI or codebase. Instead use "智能抠图" (smart cutout), "一键抠图", "拍照识字" (OCR).
- **Three Expiry Modes & Calculations**:
  - `normal`: Uses `expiryDate` (from production date + shelf life).
  - `after_opening`: Uses `openedExpiryDate` (from open date + after-opening shelf life).
  - `dual` (Double expiry):
    - Unopened (`status = 'pending'` or '待取用'): uses normal `expiryDate`.
    - In-use (`status = 'using'` or '使用中'): uses `openedExpiryDate`.
  - All reminders and displays are driven by `activeExpiryDate` (calculated dynamically or stored).
  - Days left, expiration tags (near expire / expired) must be consistent across home, library, and cloud scan functions.
  - Active expiry state tags `near_expire`, `expired` must not be persisted as main status. Main status is `pending`, `using`, `done` (completed/consumed), `deleted`.
- **Reminder Settings Fields Upgrade**:
  - Need to support fields: `enabled`, `inAppEnabled`, `subscriptionIntent`, `subscriptionLastResult`, `subscriptionLastRequestedAt`, `reminderTemplateConfigured`, `remindDayOptions`, `defaultRemindDays`, `remindTime`, `updatedAt`.
  - Sync compatibility: Local repository storage syncs with cloud `reminder_settings`.
- **WeChat Subscription & Authorization**:
  - Must use `wx.requestSubscribeMessage` to request permission when the user toggles WeChat reminders.
  - The template IDs must be stored in secure configuration (such as `env.js`) and not hardcoded in pages.
  - Flow:
    - User toggles: check login and template existence.
    - Call API: If accepted, set lastResult to `accept`, show toast "提醒偏好已记下，重要日期会温和地出现".
    - If rejected/ban: set lastResult to `reject` / `ban`, show toast "没关系，首页也会继续提醒你".
    - Save states: `subscriptionLastResult`, `subscriptionLastRequestedAt`, `subscriptionIntent` = true/false, `enabled` = (accept status).

## Existing Code Analysis
- **itemService.js**:
  - Contains `getItems` (filters out `'deleted'`), `addItem`, `updateItem`, `softDeleteItem`, `markItemDone` (status set to `'done'`).
  - History tracking uses `timeline`.
- **dateUtils.js**:
  - `determineActiveExpiry(item)` calculates `activeExpiryDate` and `activeExpirySource` correctly:
    - If `status === 'done'`, returns `{ date: null, source: null }`.
    - If `expiryMode === 'normal'`, returns normal `expiryDate`.
    - If `expiryMode === 'after_opening'`, returns `openedExpiryDate` (if opened).
    - If `expiryMode === 'dual'`:
      - If unopened (`status === 'pending' || !item.openDate`), returns normal `expiryDate`.
      - If in use (`status === 'using' && item.openDate`), returns the earlier of `openedExpiryDate` and `expiryDate` (or the available one if one is missing).
- **DataConverter.js**:
  - `toItemViewModel` dynamically converts stored item models to UI view models.
  - Recalculates `activeExpiryDate` and `activeExpirySource` using `determineActiveExpiry`.
  - Determines `daysLeft` using `getDaysDifference` based on the calculated `activeExpiryDate` and today.
  - Tags `displayStatus` as `'expiring'` if `daysLeft <= remindDays`.
- **reminder/index.vue**:
  - Current implementation only handles simple state switches, calling `saveSettings` directly without calling `wx.requestSubscribeMessage`.
  - `subscribeEnabled` is bound to `settings.enabled`.
- **cloudfunctions/syncData/index.js**:
  - Validates `collection` against `ALLOWED_COLLECTIONS` (includes `reminder_settings`).
  - `extractSafePayload` for `reminder_settings` only extracts: `id='default'`, `enabled`, `remindDayOptions`, `defaultRemindDays`, `remindTime`, `inAppEnabled`, `createdAt`, `updatedAt`.
  - Needs update to support: `subscriptionIntent`, `subscriptionLastResult`, `subscriptionLastRequestedAt` (and optionally `reminderTemplateConfigured`).
- **syncService.js**:
  - `syncAll` lists `reminder_settings` as a sync collection.
  - `reminder_settings` has custom `getPendingForSync` and `applySyncResult` hooks delegating to `settingsService`.
  - `syncService` itself determines if there are pending changes by checking `settingsService.hasPendingSettings()`.
- **env.example.js**:
  - Contains global config constants like `cloudEnvID`, `fontUrl`, `fontFileId`.
  - We can define `reminderTemplateId` here to ensure it's not hardcoded in the pages.

## 2026-07-18: Cross-Device Sticker Regression
- The user's newly created cloud `items` records have an empty `displayImageCloudFileId`; this is why another device has no source it can download. A local `wxfile://` path cannot solve cross-device rendering.
- `pages/add/index.vue` and `pages/detail/edit/index.vue` still pass `syncService.getSettings().syncEnabled` into `cloudStorageService.executeBackgroundUpload`.
- `cloudStorageService.syncImageMetadata()` currently waits for an existing sync for at most five seconds and returns `false` if it remains active. It needs a reliable follow-up delivery path for the File-ID-bearing item state rather than dropping the metadata handoff.
- The repair must stay narrow: retain local paths locally for the current device, upload both original and display sticker to cloud storage for logged-in image actions, and sync only their cloud File IDs as item metadata.
- Affected phone-side records retain `imageSyncPending: true` because the original upload callback could not locate an item with the undefined ID. A logged-in launch recovery can safely target only these records when their local original path is still available. It reuses the locally generated sticker and does not call the third-party cutout flow.
- The exported successful record has non-empty original and display Cloud File IDs. The later records have no original Cloud File ID and several are marked `imageProcessStatus: error`, so the failure occurs before metadata sync can preserve a File ID.
- The current `unpackage/dist/dev/mp-weixin` output already contains the generated item ID fix. It also showed add/edit pages navigating away after 0.8-1s without awaiting `executeBackgroundUpload`; temporary Canvas files can disappear when their page is destroyed. The upload must complete before navigation.

## WeChat Subscribe Message Document Analysis (New vs Old)
- **Old One-time Subscribe Message (弹窗一次性订阅)**:
  - Triggered via user click event calling `wx.requestSubscribeMessage`.
  - Shows a popup to the user to choose accept or reject.
  - A successful authorization grants the backend permission to push exactly 1 notification.
  - This is the standard, stable and most universal method suited for reminder settings.
- **New One-time Subscribe Message (新版一次性订阅)**:
  - This is a Beta feature that bypasses the conventional popup selection.
  - It relies on specific triggers such as Wechat Pay transactions (using payment transaction ID as a code) or button actions utilizing `open-type="liveActivity"` (real-time activities).
  - Since our reminder settings page does not involve transaction checkouts or live activities, and requires a traditional user permission intent opt-in, the **Old (Conventional) One-time Subscribe popup is the correct choice**.
