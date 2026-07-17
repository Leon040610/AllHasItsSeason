import { localRepository } from './localRepository.js'
import { STORAGE_KEYS } from '../utils/storageKeys.js'

export const localDraftRepository = {
  getDrafts() {
    const data = localRepository.get(STORAGE_KEYS.DRAFTS)
    return data || []
  },

  saveDrafts(drafts) {
    localRepository.set(STORAGE_KEYS.DRAFTS, drafts)
  }
}
