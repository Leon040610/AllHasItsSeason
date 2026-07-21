<script>
import { storageScopeService } from '@/utils/storageScopeService.js'
import { syncService } from '@/services/syncService.js'
import { cloudRuntimeService } from '@/services/cloudRuntimeService.js'
import { fontFileId, fontUrl } from '@/env.js'

const FONT_FAMILY = 'Noto Serif SC'
let fontLoadPromise

function supportsFontDataUrl() {
  const version = wx.getSystemInfoSync().SDKVersion || '0.0.0'
  const current = version.split('.').map((part) => Number(part) || 0)
  const minimum = [3, 7, 9]

  for (let index = 0; index < minimum.length; index += 1) {
    if ((current[index] || 0) !== minimum[index]) {
      return (current[index] || 0) > minimum[index]
    }
  }

  return true
}

function downloadFontFile(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.downloadFile({
      fileID,
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    })
  })
}

function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: reject
    })
  })
}

async function resolveFontSource() {
  if (fontFileId && fontFileId.startsWith('cloud://')) {
    if (!supportsFontDataUrl()) {
      throw new Error('Cloud Storage fonts require WeChat base library 3.7.9 or later')
    }

    const tempFilePath = await downloadFontFile(fontFileId)
    const base64 = await readFileAsBase64(tempFilePath)
    return `data:font/ttf;base64,${base64}`
  }

  if (/^https:\/\//i.test(fontUrl)) return fontUrl
  throw new Error('No HTTPS fontUrl or Cloud Storage fontFileId is configured')
}

function loadCustomFont() {
  if (fontLoadPromise) return fontLoadPromise

  fontLoadPromise = new Promise((resolve) => {
    const finish = (loaded) => resolve(loaded)

    if (typeof wx === 'undefined' || !wx.loadFontFace) {
      console.warn('[font] wx.loadFontFace is unavailable; using the system fallback')
      finish(false)
      return
    }

    const slowLoadWarningId = setTimeout(() => {
      console.warn('[font] Noto Serif SC is still loading in the background')
    }, 15000)

    resolveFontSource()
      .then((source) => {
        wx.loadFontFace({
          family: FONT_FAMILY,
          source: `url("${source}")`,
          global: true,
          scopes: ['webview'],
          success: (res) => {
            clearTimeout(slowLoadWarningId)
            console.log('[font] Noto Serif SC registered:', res.status)
            finish(true)
          },
          fail: (err) => {
            clearTimeout(slowLoadWarningId)
            console.error('[font] Noto Serif SC could not be registered:', JSON.stringify(err))
            finish(false)
          }
        })
      })
      .catch((err) => {
        clearTimeout(slowLoadWarningId)
        console.error('[font] Unable to prepare the Cloud Storage font:', err && err.message ? err.message : JSON.stringify(err))
        finish(false)
      })
  })

  return fontLoadPromise
}

export default {
  onLaunch() {
    storageScopeService.runMigration()
    cloudRuntimeService.init().then((runtime) => {
      if (runtime.status === 'ready') loadCustomFont()
    })

  },
  onShow() {
    syncService.scheduleAutoSync({ reason: 'app_onshow' })
  },
  onHide() {}
}
</script>

<style>
</style>
