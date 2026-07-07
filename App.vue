<script>
import { cloudEnvID } from '@/env'

const FONT_CLOUD_PATH = 'fonts/noto-serif-sc-subset.woff2'
const FONT_FAMILY = 'Noto Serif SC'

/**
 * 加载 Noto Serif SC 子集字体（真机生效，开发工具使用系统字体）
 *
 * 流程：从云存储下载字体 → 用临时路径加载字体
 * 首次使用：本地字体上传到云存储 → 再下载加载
 *
 * 注意：env.js 中需配置正确的云开发环境 ID
 */
function loadCustomFont() {
	if (typeof wx === 'undefined' || !wx.loadFontFace) return

	// Step 1: 尝试从云存储下载字体文件
	wx.cloud.downloadFile({
		fileID: `cloud://${cloudEnvID}/${FONT_CLOUD_PATH}`,
		success: (dlRes) => {
			// 下载成功，用临时文件路径加载字体
			wx.loadFontFace({
				family: FONT_FAMILY,
				source: `url("${dlRes.tempFilePath}")`,
				scopes: ['app'],
				success: () => console.log('[字体] Noto Serif SC 加载成功'),
				fail: (e) => console.warn('[字体] loadFontFace 失败:', e)
			})
		},
		fail: () => {
			console.warn('[字体] 云存储未找到字体文件，尝试上传...')
			uploadAndLoadFont()
		}
	})
}

function uploadAndLoadFont() {
	const tempPath = `${wx.env.USER_DATA_PATH}/noto-serif-sc-subset.woff2`
	const fs = wx.getFileSystemManager()

	// 将小程序包内的字体复制到用户可写目录（uploadFile 要求用户目录路径）
	fs.copyFile({
		srcPath: 'static/fonts/noto-serif-sc-subset.woff2',
		destPath: tempPath,
		success: () => {
			wx.cloud.uploadFile({
				cloudPath: FONT_CLOUD_PATH,
				filePath: tempPath,
				success: (upRes) => {
					console.log('[字体] 已上传到云存储:', upRes.fileID)
					// 上传成功后用 fileID 加载
					wx.loadFontFace({
						family: FONT_FAMILY,
						source: `url("${upRes.fileID}")`,
						scopes: ['app'],
						success: () => console.log('[字体] Noto Serif SC 加载成功'),
						fail: (e) => console.warn('[字体] 上传后 loadFontFace 失败:', e)
					})
				},
				fail: (e) => console.warn('[字体] 上传云存储失败:', e)
			})
		},
		fail: (e) => console.warn('[字体] 复制本地字体文件失败:', e)
	})
}

export default {
	onLaunch() {
		// 初始化云开发（必须在字体加载之前，loadFontFace 依赖 cloud:// 协议）
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

		// 加载自定义字体（真机需要，开发工具使用系统字体无需此步骤）
		loadCustomFont()
	},
	onShow() {},
	onHide() {}
}
</script>

<style>
/* 每个页面公共 css */
/* Noto Serif SC 通过 wx.loadFontFace 动态加载，子集文件位于 static/fonts/noto-serif-sc-subset.woff2 */
</style>
