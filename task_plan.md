# Task Plan: Repair Mini Program Custom Font Loading

## Goal
Make the Noto Serif SC font load through `wx.loadFontFace` using an officially supported source and provide a concrete deployment checklist for the font asset.

## Current Phase
Phase 3 - Verification and handoff

## Phases

### Phase 1: Diagnose API and asset contract
- [x] Read the official `wx.loadFontFace` documentation.
- [x] Inspect the runtime errors and current loader.
- [x] Verify the actual font container format.
- **Status:** complete

### Phase 2: Implement valid loading path
- [x] Replace invalid package and cloud-file loading attempts with a valid TTF source.
- [x] Use only documented scope values and wait before authenticated routing.
- [x] Rename the locally supplied font asset to match its TrueType format.
- **Status:** complete

### Phase 3: Verify and hand off
- [x] Validate code references and font metadata.
- [x] Remove the Cloud Storage CORS dependency through a Data URL source.
- [x] Generate a project and common-character font subset from the full Noto Serif SC source.
- [x] Verify all generated coverage code points exist in the subset cmap.
- [x] Decouple the font task from startup routing and handle empty login errors safely.
- [ ] Verify on a device using base library 3.7.9 or later.
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use a Cloud Storage TTF Data URL | The supplied console does not expose CORS rules. Downloading through `wx.cloud` and registering a Data URL avoids cross-origin font loading. |
| Load from `App.vue` with `global: true` and `webview` scope | The official documentation requires global registration in the app entry and lists `webview` as a valid page-rendering scope. |
| Download the Cloud Storage File ID at launch | The file is read as base64 and passed as a TTF Data URL, so its signed URL, CORS headers, and MIME response header are irrelevant. |
| Include GB2312 level-one characters and project text | This covers the app's static text plus 3,755 commonly used Chinese characters while keeping the runtime asset much smaller than the 25 MB full source. |
| Load the larger font in the background | A slow cloud download must never block launch-page navigation or the existing login flow. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `request:fail invalid url` for `/static/fonts/...` | 1 | Remove package-path `wx.request` calls; mini program network APIs do not read package assets. |
| `internal server error: empty download url` | 1 | The hard-coded Cloud Storage file ID does not resolve to a downloadable object. Do not use it as the font source. |
| Data URL declares WOFF2 for a TTF file | 1 | Rename the asset to `.ttf` and serve it as `font/ttf`. |
| Cloud Storage response lacks observed CORS headers | 1 | Avoid the direct object URL; use `wx.cloud.downloadFile` and a Data URL instead. |
| Full source font download stopped at 1 MB | 1 | Use validated byte-range downloads before invoking the subset generator; leave the current font untouched until the source hash and size are complete. |
| GitHub byte-range download connection reset | 2 | Use a CDN mirror of the same public Google Fonts source; do not retry the failed raw GitHub route. |
| CDN mirror denied the full source font | 3 | Stop automated acquisition. Request that the user place a complete Noto Serif SC/Source Han Serif TTF in the workspace, then generate the project/common subset locally. |
| Large font exceeded the 15-second foreground wait | 1 | Retain a slow-load warning but allow the download and registration to continue in the background. |
