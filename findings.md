# Findings: Mini Program Custom Font Loading

## Requirements
- Diagnose why the design font is absent in WeChat preview and device debugging.
- Correct the app implementation where possible and identify the deployment action that cannot be inferred from the repository.

## Research Findings
- Official docs: `wx.loadFontFace.source` must be an HTTPS link or a Data URL. The API dynamically loads a network font; it does not load from a mini-program package path or a `cloud://` ID.
- An HTTPS font link must be a downloadable response, use HTTPS, return a valid font `Content-Type`, and be same-origin or send CORS headers allowing `https://servicewechat.com`.
- The docs recommend TTF or WOFF. WOFF2 has iOS compatibility issues on older clients. Data URL support begins at base library 3.7.9; this project's `mp-weixin.libVersion` is 3.3.4.
- Valid `scopes` are `webview`, `native`, and `skyline`. `app` is not a valid scope; global behavior is controlled by `global: true`.
- `static/fonts/noto-serif-sc-subset.ttf` is 340,044 bytes and starts with `00 01 00 00`, the TrueType sfnt signature. It is a variable TTF. It was renamed from the misleading `.woff2` extension.
- Screenshot evidence: the package path produces `invalid url`; the fallback then fails because Cloud Storage returns an empty download URL. Consequently `wx.loadFontFace` is never reached.
- The font is now present in the intended Cloud Storage environment under the supplied File ID. Its signed download URL returns HTTP 200 and 340,044 bytes. The app must resolve a new signed URL on each launch rather than keep the provided URL, which has an expiry parameter.
- The Cloud Development console version in use only exposes storage cache settings, not CORS rules. The direct object response also has no observed `Access-Control-Allow-Origin` header. The loader therefore downloads through `wx.cloud.downloadFile`, reads the local temporary file as base64, and registers a `data:font/ttf` URL. This avoids CORS and response MIME dependencies.
- A complete Noto Serif SC variable font is now available locally. A new subset includes 3,868 code points: the project source's text plus GB2312 level-one common Chinese characters, ASCII, and common CJK punctuation. The generated TTF is 2,792,800 bytes and preserves the variable-font `fvar` and `gvar` tables.
- Final cmap validation found all 3,868 requested code points in the generated font, with zero omissions. The Cloud Storage console has a two-minute cache rule for all files, so an in-place overwrite may serve the prior file briefly.
- A device run confirmed the new 2.79 MB file is present in Cloud Storage, but the previous 15-second foreground wait prevented it from reaching registration and delayed startup. Font loading now continues in the background after Cloud Runtime initialization. The launch page and auth service also guard against undefined rejection values before accessing `message`.
- The captured device log confirms Cloud Runtime had already reached `ready`. The `[font] timed out ... continuing with the system fallback` line came from the old timeout branch, which abandoned later font registration; it was not evidence that Cloud Storage failed. The visible `Cannot read properties of undefined` toast came from the old launch-page catch block dereferencing an undefined rejection value.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Configure a Cloud Storage File ID in the ignored local environment file | The uploaded object now exists. The app downloads it using the authenticated Cloud Development API. |
| Use a TTF Data URL after download | The downloaded file never has to be fetched cross-origin by the font API. |
| Replace the old 340,044-byte subset with the 2,792,800-byte subset | The former had about 646 glyphs and visibly caused character-level system-font fallback. |

## Resources
- https://developers.weixin.qq.com/miniprogram/dev/api/ui/font/wx.loadFontFace.html
- `App.vue`
- `static/fonts/noto-serif-sc-subset.ttf`
