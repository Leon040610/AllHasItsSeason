import { localDraftRepository } from '../repositories/localDraftRepository.js'
import { generateUUID } from '../utils/uuid.js'
import { normalizeTimestamp } from '../utils/dateUtils.js'
import { itemService } from './itemService.js'

class DraftService {
  constructor() {
    this.drafts = []
    this.init()
  }

  init() {
    let rawDrafts = localDraftRepository.getDrafts()
    let migrated = false
    
    this.drafts = rawDrafts.map(d => {
      let changed = false
      const draft = { ...d }
      if (!draft.syncStatus) {
        draft.syncStatus = 'pending'
        draft.lastSyncedAt = null
        draft.syncError = ''
        changed = true
      }
      if (draft.isDeleted === undefined) {
        draft.isDeleted = false
        changed = true
      }
      if (!draft.source) {
        draft.source = 'add'
        changed = true
      }
      
      const origCreatedAt = draft.createdAt;
      const origUpdatedAt = draft.updatedAt;
      draft.createdAt = normalizeTimestamp(draft.createdAt, Date.now());
      draft.updatedAt = normalizeTimestamp(draft.updatedAt, Date.now());
      if (draft.deletedAt !== undefined) {
        draft.deletedAt = normalizeTimestamp(draft.deletedAt, Date.now());
      }
      if (origCreatedAt !== draft.createdAt || origUpdatedAt !== draft.updatedAt) {
        changed = true
      }
      
      if (changed) migrated = true
      return draft
    })
    
    if (migrated) {
      localDraftRepository.saveDrafts(this.drafts)
    }

    // Sort by updatedAt descending
    this.drafts.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getDrafts() {
    this.init()
    return this.drafts.filter(d => !d.isDeleted)
  }

  getDraft(id) {
    this.init()
    return this.drafts.find(d => d.id === id && !d.isDeleted)
  }

  getAllDraftsForSync() {
    this.init()
    // 强制仅同步 source === 'add'
    return this.drafts.filter(d => d.source === 'add')
  }

  getPendingDraftsForSync() {
    this.init()
    return this.drafts.filter(d => d.source === 'add' && (d.syncStatus === 'pending' || d.syncStatus === 'failed'))
  }

  computeMissingFields(draft) {
    const missing = []
    if (!draft.name) missing.push('待补名称')
    
    // categoryId / categoryName is required
    if (!draft.categoryId && !draft.categoryName) missing.push('待补分类')
    
    // displayImageUrl and originalImageUrl both absent
    if (!draft.displayImageUrl && !draft.originalImageUrl) {
      missing.push('缺失图片')
    }
    
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

  applySyncResult(syncedDraft, status = 'synced', lastSyncedAt = Date.now(), skipSave = false) {
    this.init();
    const index = this.drafts.findIndex(d => d.id === syncedDraft.id);
    let newDraft = { ...syncedDraft };
    
    if (index !== -1) {
      const local = this.drafts[index];
      // 本地胜出保留本地图片路径字段
      const preserveFields = ['originalImageUrl', 'cutoutImageUrl', 'displayImageUrl', 'originalImagePath', 'tempFilePath', 'savedFilePath'];
      preserveFields.forEach(field => {
        if (local[field] !== undefined) {
          newDraft[field] = local[field];
        }
      });
      newDraft.syncStatus = status;
      newDraft.lastSyncedAt = lastSyncedAt;
      newDraft.missingFields = this.computeMissingFields(newDraft);
      this.drafts[index] = newDraft;
    } else {
      newDraft.syncStatus = status;
      newDraft.lastSyncedAt = lastSyncedAt;
      newDraft.missingFields = this.computeMissingFields(newDraft);
      this.drafts.push(newDraft);
    }
    
    if (!skipSave) localDraftRepository.saveDrafts(this.drafts);
  }

  applyBatchSyncResults(syncedDrafts, status = 'synced', lastSyncedAt = Date.now()) {
    this.init();
    syncedDrafts.forEach(d => {
      this.applySyncResult(d, status, lastSyncedAt, true);
    });
    localDraftRepository.saveDrafts(this.drafts);
  }

  applySyncTombstones(tombstones, lastSyncedAt = Date.now()) {
    this.init();
    let changed = false;
    for (const tombstone of tombstones || []) {
      if (!tombstone || !tombstone.recordId) continue;
      const index = this.drafts.findIndex(draft => draft.id === tombstone.recordId);
      if (index === -1) continue;
      const current = this.drafts[index];
      const deletedAt = normalizeTimestamp(tombstone.deletedAt, Date.now());
      this.drafts[index] = {
        ...current,
        isDeleted: true,
        deletedAt,
        updatedAt: Math.max(normalizeTimestamp(current.updatedAt, 0), normalizeTimestamp(tombstone.updatedAt, deletedAt)),
        syncStatus: 'synced',
        lastSyncedAt
      };
      changed = true;
    }
    if (changed) localDraftRepository.saveDrafts(this.drafts);
    return changed;
  }

  saveDraft(draftData) {
    this.init() // Ensure we have latest data before saving
    const now = Date.now()
    let draft = this.drafts.find(d => d.id === draftData.id)
    
    // Force source to 'add' for all drafts in this version
    draftData.source = 'add'
    
    if (draft) {
      const { createdAt, ...rest } = draftData;
      // Update existing
      Object.assign(draft, rest)
      draft.updatedAt = now
      draft.syncStatus = 'pending'
      draft.missingFields = this.computeMissingFields(draft)
    } else {
      // Create new
      draft = {
        ...draftData,
        id: draftData.id || generateUUID(),
        syncStatus: 'pending',
        lastSyncedAt: null,
        syncError: '',
        isDeleted: false,
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
      this.drafts[index].isDeleted = true
      this.drafts[index].syncStatus = 'pending'
      this.drafts[index].updatedAt = Date.now()
      this.drafts[index].deletedAt = Date.now()
      localDraftRepository.saveDrafts(this.drafts)
      return { success: true }
    }
    return { success: false, message: '草稿不存在' }
  }

  clearDrafts() {
    let changed = false
    const now = Date.now()
    this.drafts.forEach(d => {
      if (!d.isDeleted) {
        d.isDeleted = true
        d.syncStatus = 'pending'
        d.updatedAt = now
        d.deletedAt = now
        changed = true
      }
    })
    if (changed) {
      localDraftRepository.saveDrafts(this.drafts)
    }
    return { success: true }
  }
}

export const draftService = new DraftService()
