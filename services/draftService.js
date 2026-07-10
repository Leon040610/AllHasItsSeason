import { localDraftRepository } from '../repositories/localDraftRepository.js'
import { generateId } from '../utils/idGenerator.js'
import { dateUtils } from '../utils/dateUtils.js'
import { itemService } from './itemService.js'

class DraftService {
  constructor() {
    this.drafts = []
    this.init()
  }

  init() {
    this.drafts = localDraftRepository.getDrafts()
    // Sort by updatedAt descending
    this.drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  getDrafts() {
    return this.drafts
  }

  getDraft(id) {
    return this.drafts.find(d => d.id === id)
  }

  computeMissingFields(draft) {
    const missing = []
    if (!draft.name) missing.push('名称')
    if (!draft.categoryId) missing.push('分类')
    if (!draft.displayImageUrl) missing.push('图片')
    
    if (draft.expiryMode === 'normal' || draft.expiryMode === 'dual') {
      if (!draft.productionDate && !draft.expiryDate) {
        missing.push('普通效期')
      }
    }
    if (draft.expiryMode === 'after_opening' || draft.expiryMode === 'dual') {
      if (!draft.afterOpeningShelfLifeValue && !draft.openedExpiryDate) {
        missing.push('开封效期')
      }
    }
    return missing
  }

  saveDraft(draftData) {
    const now = new Date().toISOString()
    let draft = this.drafts.find(d => d.id === draftData.id)
    
    if (draft) {
      // Update existing
      Object.assign(draft, draftData)
      draft.updatedAt = now
      draft.missingFields = this.computeMissingFields(draft)
    } else {
      // Create new
      draft = {
        ...draftData,
        id: draftData.id || generateId(),
        createdAt: now,
        updatedAt: now
      }
      draft.missingFields = this.computeMissingFields(draft)
      this.drafts.unshift(draft)
    }

    localDraftRepository.saveDrafts(this.drafts)
    this.init() // Re-sort
    return draft
  }

  deleteDraft(id) {
    const index = this.drafts.findIndex(d => d.id === id)
    if (index > -1) {
      this.drafts.splice(index, 1)
      localDraftRepository.saveDrafts(this.drafts)
      return { success: true }
    }
    return { success: false, message: '草稿不存在' }
  }

  clearDrafts() {
    this.drafts = []
    localDraftRepository.saveDrafts(this.drafts)
    return { success: true }
  }
}

export const draftService = new DraftService()
