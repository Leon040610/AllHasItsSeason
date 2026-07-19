# Findings - P3.1 Implementation

## 2026-07-19: P3.2 real-send failure repair
- `sendReminderNotifications` already uses the documented `cloud.openapi.subscribeMessage.send(...)` call and supplies server-only recipient data plus template data from environment-driven field mapping. The sending call itself did not need to be replaced.
- The function-local `config.json` lacked the required `permissions.openapi` declaration for `subscribeMessage.send`. This can produce CloudBase error `-604101` before the WeChat send API is reached.
- The prior unsigned error-code filter discarded `-604101`, and the generic `permission` keyword classified it as `authorization_unavailable`. That incorrectly consumed an otherwise valid one-time grant.
- The repair preserves signed platform codes, records permission failure as `cloud_api_permission_missing`, marks the job/log failed, and keeps the grant available. Explicit WeChat `43101` remains the only normal path that marks a current grant unavailable and skips its job.

## 2026-07-19: P3.2 send parameter correction
- The official WeChat global error-code table defines `-501007` as a CloudBase common parameter error. The observed `ready` job and available grant show that the sender safely retried this generic error rather than consuming the subscription.
- Official subscription-message examples use `YYYY-MM-DD` for date values and `YYYY-MM-DD HH:mm` for date-time values. The sender now uses those canonical formats instead of Chinese calendar text.
- A missing production date can no longer become an invalid placeholder payload. The sender validates the assembled template data before it calls WeChat, records `template_payload_invalid` without consuming the grant, and leaves a corrected item eligible for a later scan.

## 2026-07-19: Template time-field display correction
- The supplied template-detail preview displays a production date without a visible clock time, but a subsequent real cloud-call test returned `-501007` for the date-only `time8` payload. The live API validation is authoritative for this configured template.
- The sender therefore uses `YYYY-MM-DD HH:mm` for `time8`, defaulting a date-only production record to `00:00`. Sender validation requires that complete date-time form again.

## 2026-07-18: P3.2 Preflight Blocker
- The supplied WeChat template screenshot is sufficient to identify the template title as `保质期到期提醒` and the visible field keys: product name `thing5.DATA`, production date `time8.DATA`, remaining days `number2.DATA`, expiry date `date1.DATA`, and note `thing3.DATA`. The template ID was intentionally not copied into repository files or assistant output.
- The screenshot does not prove the account/category qualification, one-time subscription availability, per-field length limits, or the exact accepted date/time display format. Those must be verified from the platform template details or a dry-run/test-account send.
- The frontend-only `env.js` contains a configured `wxReminderTemplateId` value; its value was intentionally withheld from output. `env.example.js` still exposes only an empty frontend placeholder and no server configuration contract.
- The repository contains no `REMINDER_DRY_RUN`, `REMINDER_TEMPLATE_ID`, `REMINDER_TEMPLATE_FIELDS`, or `REMINDER_TIMEZONE` references, no scheduled reminder cloud function, and no `reminder_jobs` or `notification_logs` implementation.
- `cloudfunctions/login` calculates `ownerKey` from the request context and stores only `ownerKey`, `uid`, profile fields, and timestamps in `users`. It deliberately does not persist or return `openid`.
- A scheduled cloud trigger has no end-user `wxContext.OPENID`. The official subscription-message send operation therefore cannot be implemented safely from the current data model because the required recipient identity (`touser`) has no approved server-only mapping.
- P3.2 is blocked until the developer confirms the real template field keys/formats and主体/类目资格, configures the server environment values, and approves a secure recipient mapping that does not expose or write plaintext `openid` into business data.

## 2026-07-18: Edit Page Original/Sticker Toggle Regression
- Verification note: the repository root has no `package.json`, so there is no project-managed frontend test runner to execute. Focused JavaScript syntax and static data-flow assertions passed instead.
- Saving the edit-page "use original" selection makes `displayImageCloudFileId` equal `originalImageCloudFileId`. Before this repair, that field was also the only retained Cloud File ID for the processed sticker, so the edit page had no remaining source for "revert original" on its next load.
- The durable representation needs three separate references: `originalImageCloudFileId` for the camera image, `stickerImageCloudFileId` for the processed sticker, and `displayImageCloudFileId` for the currently selected display version.
- Existing historical records where a prior save already overwrote the display ID with the original ID and no sticker ID was recorded cannot reconstruct the lost sticker File ID from local metadata. The repair preserves all future switches and supports older records whose display ID still differs from the original ID.
- The update path preserves Cloud File IDs through `itemService.updateItemImageState()` and schedules normal item sync only after that local state has been persisted. The edit page resolves the independent sticker File ID only for display and does not store a temporary URL as business data.

## 2026-07-18: P3.2 implementation
- Added `registerReminderRecipient`, `scheduledReminderScan`, and `sendReminderNotifications` cloud functions. Each deployed function includes a local copy of the reminder utility because CloudBase uploads are directory-scoped.
- Subscription acceptance now registers an encrypted server-side recipient; disabling the setting disables that recipient. Plaintext `openid` is only held in function memory for the official send call and is never returned to the client or written to logs.
- Reminder jobs use a SHA-256 dedupe key derived from server-side ownership, item ID, active expiry date, and reminder kind. The scanner cancels stale ready jobs after item deletion, completion, preference changes, or date changes.
- `REMINDER_DRY_RUN` defaults to true. The sender performs final eligibility and recipient checks, applies bounded retries, and maps platform failures to safe error codes. No deployment or real send has been claimed; CloudBase configuration and trigger setup remain manual.

## 2026-07-18: Official subscribe-message API review
- The official server API confirms the cloud-call method is `subscribeMessage.send`; its required recipient field `touser` is the user's OpenID. The current cloud-function call shape (`templateId`, `page`, `data`, `miniprogramState`) matches the documented cloud-call naming.
- `REMINDER_RECIPIENT_ENCRYPTION_KEY` is not a WeChat API credential and does not require a local computer to stay online. It is an application-level AES key held in CloudBase function environment variables so a scheduled cloud function can decrypt a server-only recipient mapping at runtime.
- The current P3.2 behavior still needs a protocol correction before real deployment: an accepted `wx.requestSubscribeMessage` authorization is one-time, not a permanent permission. `subscriptionIntent` must remain a user preference, not proof that another message can be sent. After a successful send, the recipient/template authorization must be treated as consumed; after `43101` (not subscribed or quota exhausted), jobs must be skipped until the user actively authorizes again.
- Error classification must explicitly handle official codes: `43101` as authorization unavailable/no retry, `43107` as subscription capability banned/no retry, `47003` as template/field parameter failure/no retry, and `40003` as invalid recipient/no retry. The current generic classifier can otherwise misclassify some of these as retryable platform failures.

## 2026-07-18: P3.2 protocol completion
- `notification_recipients` now records a server-only one-time authorization lifecycle. Each accepted client authorization increments `grantVersion`, resets `consumedAt`, and returns the recipient to `active`; a successful send marks it `consumed`.
- The scanner requires an active recipient before creating a ready job and cancels ready jobs when the recipient is no longer active. This keeps `subscriptionIntent` as preference only, rather than treating it as permanent authorization.
- The sender atomically claims a ready job and then the active recipient before calling `subscribeMessage.send`, preventing concurrent sender invocations from sending the same one-time grant twice. Official authorization, template, recipient, and field-format failures do not retry.
- The screenshots show the expected variable separation and `REMINDER_DRY_RUN=true` values. The displayed secrets and template ID are exposed credentials/configuration and must be rotated; no value is copied into source or this report.
- The sender timeout shown as 3 seconds is too tight for a real API send followed by persistence; use a 10-15 second timeout before real-send testing. A timeout during a claimed send is deliberately fail-closed to avoid reopening a one-time grant and accidentally duplicating a message.
- Template values are now type-aware: ISO `YYYY-MM-DD` values become `YYYY年MM月DD日` for `date` and `time` fields, `time` receives `00:00` when no time is stored, and `number` receives digits only. This is a conservative default based on official template type conventions; the actual template detail page remains authoritative.
- The first manual local-debug scan returned `scan_failed` with SDK code `-1`. The scanner now returns a safe `failureStage` and `detailCode` (without error messages, OpenID, ownerKey, or credentials) so the next run can distinguish environment/configuration, collection access, item loading, job upsert, and log-writing failures.
- The follow-up diagnostic identified `failureStage: read_reminder_job` with `detailCode: -1` while `reminder_jobs` was empty. The scanner now uses a dedupe-key query instead of `doc(id).get()` for the first-run lookup, avoiding this local-debug missing-document behavior while preserving deterministic document IDs for writes.
- The next manual scan completed successfully (`scanned: 16`, `skipped: 15`, `duplicate: 1`, `created: 0`). Added a safe `skipReasons` counter so eligibility failures can be diagnosed without exposing item identifiers or account data.
- The first successful task creation exposed the same local-debug missing-document behavior in `notification_logs` (`notification log failed -1`). Both scanner and sender now query logs by `jobId` before updating, so an empty log collection is treated as a normal first-write case.
- Scanner statistics now include `logFailed`; a successful task scan with `logFailed > 0` is treated as an operational logging defect rather than silently reported as fully healthy.
- Sender dry-run diagnostics now read a bounded page of `reminder_jobs`, filter `ready` in memory, and return safe `visibleJobs`/`statusCounts` counters. This works around local-debug equality-query inconsistencies and distinguishes an empty view from a status mismatch.

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
