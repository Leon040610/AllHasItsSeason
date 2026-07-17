<script>
import { cloudRuntimeService } from '@/services/cloudRuntimeService.js'

const FONT_FAMILY = 'Noto Serif SC'
let fontLoadAttempted = false

/**
 * 加载 Noto Serif SC 子集字体（真机生效，开发工具系统已有该字体可忽略）
 * 仅在云开发就绪后调用，失败时回退系统字体，不影响启动
 */
function loadCustomFont() {
  if (fontLoadAttempted) return
  fontLoadAttempted = true

  if (typeof wx === 'undefined' || !wx.loadFontFace) {
    console.log('[字体] 缺少 wx.loadFontFace，跳过字体加载')
    return
  }

  console.log('[字体] 开始直接加载包内 Noto Serif SC...')
  
  // 优先直接读取包内编译好的字体文件，避免文件拷贝和上传带来的网络消耗与权限限制
  wx.loadFontFace({
    family: FONT_FAMILY,
    source: 'url("/static/fonts/noto-serif-sc-subset.woff2")',
    global: true,
    scopes: ['app'],
    success: () => {
      console.log('[字体] Noto Serif SC 包内直接加载成功!')
    },
    fail: (err) => {
      console.warn('[字体] 包内直接加载失败，尝试从云端备份加载:', JSON.stringify(err))
      
      // 备份方案：使用云存储上的备份字体 fileID，免去客户端上传逻辑
      const backupCloudId = 'cloud://yu-d9gr7snghb66efdb4/fonts/noto-serif-sc-subset.woff2'
      wx.loadFontFace({
        family: FONT_FAMILY,
        source: `url("${backupCloudId}")`,
        global: true,
        scopes: ['app'],
        success: () => {
          console.log('[字体] Noto Serif SC 从云端备份加载成功!')
        },
        fail: (cloudErr) => {
          console.error('[字体] 字体加载的所有途径均已失败:', JSON.stringify(cloudErr))
        }
      })
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

    // 判断登录状态，决定入口页
    const userRaw = uni.getStorageSync('allhas_user_v1')
    let isLoggedIn = false
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw)
        isLoggedIn = user.isLoggedIn === true
      } catch (e) { /* ignore */ }
    }

    if (isLoggedIn) {
      uni.reLaunch({ url: '/pages/index/index' })
    }
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* Noto Serif SC 通过 wx.loadFontFace 动态加载（真机），开发工具使用系统安装字体 */
/* 子集文件: static/fonts/noto-serif-sc-subset.woff2 (604字, 332KB) */
</style>
