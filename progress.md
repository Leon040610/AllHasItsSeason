# Progress Log

## Session: 2026-07-18

### Phase 1: Diagnosis
- **Status:** complete
- Read the official API page and inspected the captured device log.
- Compared the documented source/scope/version constraints to `App.vue` and `manifest.json`.
- Verified that the provided file is a TrueType variable font rather than WOFF2.

### Phase 2: Implementation
- **Status:** complete
- Replaced invalid package-path and Cloud Storage fallback attempts with a configured HTTPS source in `App.vue`.
- Added an eight-second fallback timeout and deferred authenticated routing until the font request completes.
- Renamed the local asset from `.woff2` to `.ttf` after validating its binary signature.

### Phase 3: Verification and Handoff
- **Status:** in_progress
- Parsed the final `App.vue` script successfully with Node after removing SFC imports for syntax validation.
- Confirmed no old package, Cloud Storage, or invalid scope references remain.
- Confirmed internal family name `Noto Serif SC` and a variable TrueType table set using `ttx`.
- A real-device verification remains dependent on deployment of the TTF to a correctly configured HTTPS static URL.
- Confirmed the uploaded Cloud Storage object returns HTTP 200. The console exposes no CORS configuration and the object response has no CORS header, so the loader now uses `wx.cloud.downloadFile` followed by a base64 TTF Data URL.
- Raised the mini-program target base library from 3.3.4 to 3.7.9 because the official API enables Data URL font sources from 3.7.9 onward.
- The initial full Noto Serif SC source download was truncated to approximately 1 MB by the transport path, so the generator did not replace the existing local subset. The next attempt uses validated byte ranges.
- PowerShell `Invoke-WebRequest` rejects a manually supplied `Range` header; the range downloader will use `curl.exe --range` instead.
- The alternate GitHub range request was reset before it returned bytes. The next source route is a CDN mirror, not another raw GitHub retry.
- The CDN mirror was denied with HTTP 403. Automated source acquisition is stopped after three distinct failures; a locally supplied full font source is required for the subset build.
- The user supplied the full Noto Serif SC variable font. Generated a 2,792,800-byte subset with 3,868 code points from project sources and GB2312 level-one common characters; verified `cmap`, `glyf`, `fvar`, and `gvar` tables remain present.
- The default Python interpreter lacked FontTools for the final cmap comparison. Use the Python 3.12 interpreter that provides `pyftsubset` instead; generation output remains valid.
- Final validation with the FontTools-enabled Python 3.12 environment confirmed all 3,868 required code points are present and that `fvar`, `gvar`, and `STAT` remain in the generated font.
- Device log showed the 2.79 MB font still loading at 15 seconds and the launch flow was incorrectly awaiting that task. Changed startup to invoke cloud/font initialization in the background, retained only a slow-load warning, and guarded login error handling against an undefined error value.
- Reviewed the supplied screenshots: Cloud Runtime is `ready`; the old 15-second font timeout then forced a system-font fallback. The launch-page toast matches an undefined error object dereference. Added a readiness guard so the background font task starts only after Cloud Runtime returns `ready`.
- Re-ran static syntax checks after the final startup guard: `App.vue`, `pages/launch/index.vue`, and `services/authService.js` all parse successfully. `git diff --check` reports no whitespace errors.

## Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Inspect font signature | File extension and binary match | `.woff2` name contains TTF binary | identified |
| Inspect official source contract | source accepts HTTPS/Data URL | current package URL and Cloud ID fail contract | identified |
| Final loader syntax | Script parses | Node parses successfully | pass |
| Font internal metadata | Noto Serif SC TTF | Family is Noto Serif SC; TTF variable tables present | pass |
| Updated startup script | Font work does not block routing | `App.vue` script parses with Node | pass |
| Launch/login error guards | Empty rejection values do not dereference `message` | Launch page and auth-service scripts parse with Node | pass |
| Patch integrity | No malformed diff whitespace | `git diff --check` | pass |
