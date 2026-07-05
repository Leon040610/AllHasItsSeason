<script>
import { cloudEnvID } from '@/env'

export default {
	onLaunch() {
		if (typeof wx !== 'undefined' && wx.cloud) {
			wx.cloud.init({
				env: cloudEnvID,
				traceUser: true
			})
		}
	},
	onShow() {},
	onHide() {}
}
</script>

<style>
/* 每个页面公共 css */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
</style>
