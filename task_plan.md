# Task Plan - P3.1 & P2 Cleanup Implementation

## Phase 1: Research and Setup
- [x] Read required files (PRD, design docs, existing services, models, utils)
- [x] Research cloud functions configuration for settings syncing
- [x] Identify WeChat subscription template fields and constraints
- [x] Write findings to findings.md
- [x] Finalize implementation_plan.md and get user approval

## Phase 2: Date Utils & Expiry Logic Unification
- [x] Unify daysLeft, activeExpiryDate, 临期/过期判定
- [x] Ensure itemService.js and all views (home, library) use the same utility functions
- [x] Clarify expiry rules for: normal, after_opening, dual (unopened/opened)
- [x] Define fixed rule for whether expired items can trigger reminders

## Phase 3: Upgrade Reminder Settings Fields
- [x] Add/update settings fields in local storage and cloud database (reminder_settings)
- [x] Implement field compatibility and migration in settingsService.js
- [x] Ensure DataConverter.js handles new fields correctly during sync

## Phase 4: WeChat Subscription Integration
- [x] Access/read settings.env or config to fetch WeChat Template ID securely
- [x] Handle UI reminder switch toggle
- [x] Call wx.requestSubscribeMessage upon user interaction
- [x] Record subscriptionLastResult, subscriptionLastRequestedAt, inAppEnabled, enabled, subscriptionIntent
- [x] Implement user-friendly feedback toasts based on authorization result
- [x] Ensure no automatic popups and no actual message sending

## Phase 5: Verification and Walkthrough
- [x] Verify using unit tests or mock data converter
- [x] Draft walkthrough.md with verification results

## Phase 6: P2 Cleanup Package
- [x] Uniform ownerKey hash generation across all four cloudfunctions
- [x] Add repairHistoricalOwnerKey action in syncData for safety migration
- [x] Filter out local image paths from items and drafts sync payload
- [x] Upgrade drafts check and applySyncResult to support new device login
- [x] Fix avatar update call in authService and userRepository with format validation
- [x] Centralize downloadFile logic in cloudStorageService and storageRepository
- [x] Refactor direct uni.cloud.downloadFile calls in add/edit pages
- [x] Run syntax checks, check git check, write walkthrough.md

## Phase 7: Guest Login Gate
- [x] Intercept unrecognized guest users in recognitionService (recognize)
- [x] Intercept unrecognized guest users in cloudStorageService (prepare, upload, process, backgroundUpload)
- [x] Add checkLoginAndPrompt modal in homepage photo scan entry
- [x] Add checkLoginAndPrompt check in pages/add/index.vue (choose, reprocess, ocr)
- [x] Add checkLoginAndPrompt check in pages/detail/edit/index.vue (choose, reprocess)
- [x] Implement onLoad routing gate inside pages/add/recognize.vue
- [x] Refine alerts from uni.showModal to lightweight native uni.showToast (1600ms, icon 'none')
- [x] Run syntax checks and git checks, update walkthrough.md

## Phase 8: Cloud File ID Image Restoration Link
- [x] Implement tempUrlCache memory cache in cloudStorageService
- [x] Implement resolveBatchImageUrls for batch Cloud File ID translation
- [x] Implement restoreItemDisplayImages for view hydration restore
- [x] Integrate hydration restore in homepage (focusItems)
- [x] Integrate hydration restore in library page list
- [x] Integrate hydration restore in detail page
- [x] Integrate hydration restore in edit page
- [x] Integrate hydration restore in drafts list page
- [x] Run syntax checks and git checks, update walkthrough.md

## Phase 9: Restore Cross-Device Sticker Upload
- [x] Confirm the failed records have empty `displayImageCloudFileId`; do not roll back unrelated P2.9/P3.1 work.
- [x] Trace the image selection, background upload, metadata update, and cloud sync path.
- [x] Decouple a logged-in user's deliberate image backup from the general data-sync toggle and make metadata delivery reliable after a concurrent sync.
- [x] Add a logged-in recovery pass for local records that are still marked `imageSyncPending` and lack a display File ID; it uploads existing image files only and does not invoke image processing.
- [x] Verify the cloud allowlist preserves all Cloud File ID fields and run focused static checks.

## Phase 10: Preserve Image Upload Before Page Exit
- [x] Compare the exported successful and failed records without exposing identifiers or File IDs.
- [x] Confirm the current generated Mini Program includes the latest business-ID fix.
- [x] Keep add/edit pages alive until the deliberate image upload completes, then restore the success copy to `贴纸上云成功`.
- [x] Re-run static and isolated behavior checks.

## Phase 11: Preserve Sticker Reference When Switching to Original
- [x] Diagnose the edit-page regression: saving "use original" overwrites the only sticker Cloud File ID.
- [x] Add `stickerImageCloudFileId` as an independent persistent item field and include it in the `items` sync allowlist.
- [x] Finalize edit-page load/save behavior so original and sticker can be switched repeatedly without losing either reference.
- [x] Verify syntax, whitespace, and the affected upload/sync call paths; document the required `syncData` deployment.
