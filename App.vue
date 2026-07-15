<script>
import { cloudRuntimeService } from '@/services/cloudRuntimeService.js'

const FONT_FAMILY = 'Noto Serif SC'
let fontLoadAttempted = false

/**
 * 加载 Noto Serif SC 子集字体（真机生效，开发工具系统已有该字体可忽略）
 * 仅在云运行时就绪后调用，失败时回退系统字体，不影响启动
 */
function loadCustomFont() {
  if (fontLoadAttempted) return
  fontLoadAttempted = true

  if (typeof wx === 'undefined' || !wx.loadFontFace) {
    console.log('[字体] 缺少 wx.loadFontFace，跳过字体加载')
    return
  }
  if (!wx.env || !wx.env.USER_DATA_PATH) {
    console.log('[字体] 缺少 wx.env.USER_DATA_PATH，跳过字体加载')
    return
  }
  if (!wx.getFileSystemManager) {
    console.log('[字体] 缺少 wx.getFileSystemManager，跳过字体加载')
    return
  }
  if (!cloudRuntimeService.isReady()) {
    console.log('[字体] 云开发未就绪，跳过字体加载')
    return
  }

  const tempPath = `${wx.env.USER_DATA_PATH}/noto-serif-sc-subset.woff2`
  const fs = wx.getFileSystemManager()
  const localFontPath = 'static/fonts/noto-serif-sc-subset.woff2'

  // 检查本地包内字体文件是否存在
  try {
    fs.accessSync(localFontPath)
  } catch (e) {
    console.log('[字体] 本地字体文件不存在，跳过字体加载')
    return
  }

  console.log('[字体] 开始加载 Noto Serif SC...')

  fs.copyFile({
    srcPath: localFontPath,
    destPath: tempPath,
    success: () => {
      console.log('[字体] 复制到用户目录成功')
      wx.cloud.uploadFile({
        cloudPath: 'fonts/noto-serif-sc-subset.woff2',
        filePath: tempPath,
        success: (upRes) => {
          console.log('[字体] 云存储上传成功')
          wx.loadFontFace({
            family: FONT_FAMILY,
            source: `url("${upRes.fileID}")`,
            global: true,
            success: () => {
              console.log('[字体] Noto Serif SC 加载成功!')
            },
            fail: () => {
              console.error('[字体] loadFontFace 失败')
            }
          })
        },
        fail: () => {
          console.error('[字体] 上传云存储失败')
        }
      })
    },
    fail: () => {
      console.error('[字体] 复制本地字体失败')
    }
  })
}

export default {
  onLaunch() {
    cloudRuntimeService.init().then((res) => {
      if (res.status === 'ready') {
        loadCustomFont()
      }
    })
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* Noto Serif SC 通过 wx.loadFontFace 动态加载（真机），开发工具使用系统安装字体 */
/* 子集文件: static/fonts/noto-serif-sc-subset.woff2 (604字, 332KB) */
</style>
