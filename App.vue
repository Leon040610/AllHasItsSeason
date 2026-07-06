<script>
import { cloudEnvID } from '@/env'

export default {
	onLaunch() {
		// 动态加载 Noto Serif SC 字体
		if (typeof wx !== 'undefined' && wx.loadFontFace) {
			wx.loadFontFace({
				family: 'Noto Serif SC',
				source: 'url("https://fonts.gstatic.com/s/notoserifsc/v22/H4c8BXePl9DZ0Xe7gG9cyOj7mm63SzZBEtERe7Em.woff2")',
				success: () => {},
				fail: () => {}
			})
		}
		// 初始化云开发
		if (typeof wx !== 'undefined' && wx.cloud) {
			try {
				wx.cloud.init({
					env: cloudEnvID,
					traceUser: true
				})
			} catch (e) {
				console.warn('云开发初始化失败，请检查 env.js 中的环境 ID', e)
			}
		}
	},
	onShow() {},
	onHide() {}
}
</script>

<style>
/* 每个页面公共 css */
/* 注：微信小程序不支持加载外部字体，Noto Serif SC 通过 wx.loadFontFace 动态加载 */
</style>
