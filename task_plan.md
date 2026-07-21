# Task Plan - P3.1 & P2 Cleanup Implementation

## Phase 16: P3.3 Cloud File and Deleted-Record Governance
- [x] Define a 7-day retention model: soft-delete first, then controlled physical cleanup.
- [x] Preserve a minimal long-lived `sync_tombstones` index so an offline device cannot recreate purged items or drafts.
- [x] Add dry-run-only cloud-file inventory, candidate audit, controlled file deletion, and deleted-record purge cloud functions.
- [x] Review the implementation and repair static and safety defects, including authoritative soft-delete handling, failed-candidate retry, and strict Cloud Storage success checks.
- [x] Add exact CloudBase collection, index, environment-variable, dry-run, and guarded-delete deployment instructions.
- [x] Run final static checks and complete the P3.3 self-review. No deployment or real deletion is part of this phase.
- [x] Keep drafts permanently: exclude them from seven-day data purge and preserve their Cloud File ID references during file governance.

## Phase 17: P3.3 Scheduled Governance Automation
- [x] Register future Cloud File IDs server-side as images and avatars are uploaded, without exposing maintenance credentials to the client.
- [x] Make file audits read the durable registry and create a weekly audit/cleanup trigger chain.
- [x] Add weekly audit/execute trigger paths for seven-day deleted item governance with server-only trigger validation.
- [x] Keep actual automatic deletion disabled by default and document the separate activation switches.
- [x] Run static, safety, and trigger-configuration checks; do not deploy or enable automatic deletion.

### Phase 17 Decisions
- Managed automatic cleanup begins only for files registered after this deployment. Historical files without a trusted registry record remain excluded from automatic deletion.
- All timer paths are limited to unauthenticated CloudBase timer invocations. Mini-program calls must continue to provide the maintenance token for manual operations.
- The weekly order is audit at 02:00, file cleanup at 02:20, then soft-deleted-item purge at 02:40 every Sunday (CloudBase China standard time).
- Draft documents and every Cloud File ID reachable from a draft remain permanently protected.

## Phase 18: Usage Guide Entry and Page
- [x] Add the usage-guide entry above About in the existing connected Me-page settings group.
- [x] Add an independent guide page using the existing About-page top-bar pattern and category icon asset.
- [x] Verify the new route, icon paths, Vue structure, and affected diff without altering existing workspace changes.
- [x] Review the supplied Markdown manual and PDF layout, including the one user-flow screenshot position.
- [x] Replace the short guide content with the complete user-facing manual and a stable image placeholder.
- [x] Verify the expanded page structure and preserve the supplied Markdown content, with image locations left empty until project-local assets are provided.
- [x] Add the `mp-html` renderer and a repeatable `marked` build command for the supplied Markdown source.
- [x] Apply the PDF-inspired title, body, table, quote, and emphasis typography through `mp-html` tag styles.

## Phase 19: Brand Confirmation Dialogs and First-Use Guides
- [x] Add a reusable branded confirmation dialog with normal and destructive double-button variants.
- [x] Migrate only the scoped double-button business confirmations; preserve Toasts, editable inputs, single-button alerts, action sheets, and system authorization flows.
- [x] Keep the guest-data migration confirmation as its existing native dialog.
- [x] Add the delayed, once-only homepage welcome guide and the logged-in add-page reminder-subscription guide.
- [x] Run focused structure, JavaScript syntax, asset, storage-key, and whitespace checks.

## Phase 20: User Agreement and Privacy Policy Access
- [x] Verify the supplied Markdown sources, current `mp-html` page convention, and configured developer contact information.
- [x] Generate the user-agreement and privacy-policy HTML modules directly from the supplied Markdown without altering their terms.
- [x] Add the two custom-navigation policy pages by reusing the usage-guide page structure and styles.
- [x] Register both routes, wire both launch/about-page links, and require explicit agreement before WeChat login.
- [x] Run focused module, routing, navigation, and whitespace checks.

## Phase 21: Detail Sticker Presentation Scale
- [x] Expose the existing image-processing state in the item view model.
- [x] Scale only successfully processed sticker images in the item-detail hero while preserving their rotation and original-photo sizing.
- [x] Apply the same processed-sticker-only scale in the add-item preview while retaining the original-image toggle behavior.
- [x] Apply the same processed-sticker-only scale in the home-page focus cards without changing card layout or original-photo sizing.
- [x] Run focused syntax and whitespace checks.

## Phase 22: Voluntary Login Entry for Review Compliance
- [x] Make the home page the first application route so a fresh launch enters the app as a guest.
- [x] Remove the startup redirect that could interrupt the initial home-page experience.
- [x] Change the Me-page WeChat login button from immediate authorization to navigation to the existing agreement-confirmed login page.
- [x] Preserve the existing persisted-login session and post-login return-to-home behavior.
- [x] Run focused route, login-entry, and whitespace checks.

## Phase 15: P3.2 Real-Send Cloud API Permission Repair
- [x] Declare the official `subscribeMessage.send` OpenAPI permission on the sender function only.
- [x] Preserve signed CloudBase platform codes and separate missing cloud-call permission from one-time authorization loss.
- [x] Keep a grant available when the send call never left CloudBase because permission is missing.
- [x] Document the required re-deployment, trigger upload, permission-cache wait, and fresh grant validation.

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

## Phase 12: P3.2 Preflight and Design
- [x] Verify the current P3.1 reminder service and subscription authorization entry points.
- [x] Verify that the repository has no scheduled reminder cloud function, reminder job/log implementation, or server-side P3.2 configuration schema.
- [x] Verify that `ownerKey` is the only server-side account identifier currently persisted; no safe recipient mapping for scheduled WeChat delivery is available.
- [x] Confirmed template field keys from the supplied platform screenshot and selected a server-only encrypted recipient mapping.

## Phase 13: P3.2 Reminder Scan and Delivery
- [x] Add server-only encrypted recipient registration without exposing plaintext openid.
- [x] Add shared server reminder qualification, timezone/date formatting, and safe template data mapping.
- [x] Add scheduledReminderScan with deterministic jobs, cancellation, dry-run logs, and scan metrics.
- [x] Correct one-time subscription consumption state and official error-code handling before real-send deployment.
- [x] Wire frontend authorization acceptance to recipient registration.
- [x] Run static checks and dry-run-oriented local assertions; document manual deployment/configuration and stop before P3.3.

## Phase 14: One-Time Subscription Grant Correction
- [x] Replace the account-wide recipient "active" authorization model with a per-item, per-active-expiry one-time grant.
- [x] Bind each accepted client subscription request to the item being saved; do not request through a custom modal callback.
- [x] Require a matching available grant during scan and consume only that grant after a successful send.
- [x] Isolate authorization loss and retries to the current grant and job; do not disable other items for the same account.
- [x] Remove the hidden legacy settings-page authorization control and stale service references.
- [x] Run final static checks and document the manual CloudBase deployment and real-device verification steps.
- [x] Declare the two CloudBase timer triggers in function-local `config.json` files and document “上传触发器” deployment.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| PowerShell quoting error while probing configuration metadata | 1 | The probe was read-only and did not touch project files; the surrounding searches and safe configuration checks were rerun successfully. |
| Reminder-page cleanup patch did not match mixed legacy text on the first attempt | 1 | Re-ran the cleanup with stable ASCII anchors and removed the hidden template, obsolete imports, function, and styles without touching other page logic. |
| Deployment-document insertion did not match the first non-ASCII context anchor | 1 | Re-ran the insertion using the stable environment-variable code-block anchor; the documentation update applied successfully. |
