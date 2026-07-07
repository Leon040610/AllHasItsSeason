<script>
import { cloudEnvID } from '@/env'

const FONT_FAMILY = 'Noto Serif SC'

/**
 * 加载 Noto Serif SC 子集字体（真机生效，开发工具系统已有该字体可忽略）
 *
 * 流程：将包内字体上传到云存储 → 用返回的 fileID 加载字体
 * wx.cloud.uploadFile 是幂等操作，相同 cloudPath 会覆盖，不会重复报错
 */
function loadCustomFont() {
	if (typeof wx === 'undefined' || !wx.loadFontFace) {
		console.log('[字体] 非微信环境，跳过字体加载')
		return
	}

	const tempPath = `${wx.env.USER_DATA_PATH}/noto-serif-sc-subset.woff2`
	const fs = wx.getFileSystemManager()

	console.log('[字体] 开始加载 Noto Serif SC...')

	// Step 1: 将小程序包内的字体复制到用户可写目录
	fs.copyFile({
		srcPath: 'static/fonts/noto-serif-sc-subset.woff2',
		destPath: tempPath,
		success: () => {
			console.log('[字体] 复制到用户目录成功')

			// Step 2: 上传到云存储（幂等，已有同名文件会覆盖）
			wx.cloud.uploadFile({
				cloudPath: 'fonts/noto-serif-sc-subset.woff2',
				filePath: tempPath,
				success: (upRes) => {
					console.log('[字体] 云存储上传成功, fileID:', upRes.fileID)

					// Step 3: 用 cloud:// fileID 加载字体
					wx.loadFontFace({
						family: FONT_FAMILY,
						source: `url("${upRes.fileID}")`,
						global: true,
						success: () => {
							console.log('[字体] Noto Serif SC 加载成功!')
						},
						fail: (err) => {
							console.error('[字体] loadFontFace 失败:', JSON.stringify(err))
						}
					})
				},
				fail: (err) => {
					console.error('[字体] 上传云存储失败:', JSON.stringify(err))
				}
			})
		},
		fail: (err) => {
			console.error('[字体] 复制本地字体失败:', JSON.stringify(err))
		}
	})
}

export default {
	onLaunch() {
		// 1. 初始化云开发（必须在字体加载之前，uploadFile 依赖云开发初始化）
		if (typeof wx !== 'undefined' && wx.cloud) {
			try {
				wx.cloud.init({
					env: cloudEnvID,
					traceUser: true
				})
				console.log('[云开发] 初始化成功, env:', cloudEnvID)
			} catch (e) {
				console.warn('[云开发] 初始化失败:', e)
			}
		}

		// 2. 加载自定义字体（真机需要，开发工具使用系统安装的同名字体）
		loadCustomFont()
	},
	onShow() {},
	onHide() {}
}
</script>

<style>
/* Noto Serif SC 通过 wx.loadFontFace 动态加载（真机），开发工具使用系统安装字体 */
/* 子集文件: static/fonts/noto-serif-sc-subset.woff2 (604字, 332KB) */
</style>
