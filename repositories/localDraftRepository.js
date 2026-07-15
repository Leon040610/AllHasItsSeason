import { STORAGE_KEYS } from '../utils/storageKeys.js'

export const localDraftRepository = {
  getDrafts() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.DRAFTS)
      return data ? JSON.parse(data) : []
    } catch (e) {
      console.error('getDrafts failed', e)
      return []
    }
  },

  saveDrafts(drafts) {
    try {
      uni.setStorageSync(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts))
    } catch (e) {
      console.error('saveDrafts failed', e)
    }
  }
}
