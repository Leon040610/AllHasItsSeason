import { localDraftRepository } from '../repositories/localDraftRepository.js'
import { generateUUID } from '../utils/uuid.js'
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
    this.init()
    return this.drafts
  }

  getDraft(id) {
    this.init()
    return this.drafts.find(d => d.id === id)
  }

  computeMissingFields(draft) {
    const missing = []
    if (!draft.name) missing.push('待补名称')
    
    // categoryId / categoryName is required
    if (!draft.categoryId && !draft.categoryName) missing.push('待补分类')
    
    // displayImageUrl and originalImageUrl both absent
    if (!draft.displayImageUrl && !draft.originalImageUrl) missing.push('缺失图片')
    
    let hasExpiry = false
    let hasAfterOpening = false

    if (draft.expiryMode === 'normal' || draft.expiryMode === 'dual') {
      if (draft.expiryDate || (draft.productionDate && draft.shelfLifeValue && draft.shelfLifeUnit)) {
        hasExpiry = true
      }
    }

    if (draft.expiryMode === 'after_opening' || draft.expiryMode === 'dual') {
      if (draft.openedExpiryDate || (draft.openDate && draft.afterOpeningShelfLifeValue && draft.afterOpeningShelfLifeUnit)) {
        hasAfterOpening = true
      }
    }

    if (draft.expiryMode === 'normal') {
      if (!hasExpiry) missing.push('待确认到期日')
    } else if (draft.expiryMode === 'after_opening') {
      if (!hasAfterOpening) missing.push('待补开封效期')
    } else if (draft.expiryMode === 'dual') {
      if (!hasExpiry) missing.push('待确认到期日')
      if (draft.status === 'using' && !hasAfterOpening) missing.push('待补开封效期')
    } else {
      // Default fallback if expiryMode is empty or invalid
      if (!draft.expiryDate && !(draft.productionDate && draft.shelfLifeValue)) {
        missing.push('待确认到期日')
      }
    }

    return missing
  }

  saveDraft(draftData) {
    this.init() // Ensure we have latest data before saving
    const now = new Date().toISOString()
    let draft = this.drafts.find(d => d.id === draftData.id)
    
    // Force source to 'add' for all drafts in this version
    draftData.source = 'add'
    
    if (draft) {
      // Update existing
      Object.assign(draft, draftData)
      draft.updatedAt = now
      draft.missingFields = this.computeMissingFields(draft)
    } else {
      // Create new
      draft = {
        ...draftData,
        id: draftData.id || generateUUID(),
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
