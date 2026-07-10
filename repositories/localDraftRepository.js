const DRAFTS_KEY = 'allhas_drafts_v1'

export const localDraftRepository = {
  getDrafts() {
    try {
      const data = uni.getStorageSync(DRAFTS_KEY)
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.error('getDrafts failed', e)
      return []
    }
  },

  saveDrafts(drafts) {
    try {
      uni.setStorageSync(DRAFTS_KEY, JSON.stringify(drafts))
    } catch (e) {
      console.error('saveDrafts failed', e)
    }
  }
}
