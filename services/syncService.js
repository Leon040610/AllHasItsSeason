import { localRepository } from '../repositories/localRepository.js'
import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'

const SYNC_KEY = 'allhas_sync_settings_v1'
const LOGS_KEY = 'allhas_sync_logs_v1'

class SyncService {
  constructor() {
    this.settings = null
    this.init()
  }

  init() {
    let settings = null
    try {
      const data = uni.getStorageSync(SYNC_KEY)
      if (data) settings = JSON.parse(data)
    } catch (e) {
      console.error('syncService init failed', e)
    }
    
    if (!settings) {
      settings = {
        syncEnabled: false,
        syncStatus: 'not_logged_in',
        lastSyncAt: null,
        syncProgress: 0,
        syncedItemCount: 0,
        savedStorageSize: '',
        updatedAt: Date.now()
      }
      this.save(settings)
    }
    
    this.settings = settings
  }

  save(settings) {
    try {
      uni.setStorageSync(SYNC_KEY, JSON.stringify(settings))
      this.settings = settings
    } catch (e) {
      console.error('syncService save failed', e)
    }
  }

  getSettings() {
    if (!this.settings) this.init()
    return this.settings
  }

  updateSettings(updates) {
    const newSettings = { ...this.getSettings(), ...updates, updatedAt: Date.now() }
    this.save(newSettings)
  }

  getSyncStats() {
    const items = itemService.getItems()
    // count only non-deleted items
    const itemCount = items.filter(i => i.status !== 'deleted').length
    
    const categories = categoryService.getCategories()
    const categoryCount = categories.length

    const drafts = draftService.getDrafts()
    const draftCount = drafts.length

    return {
      itemCount,
      categoryCount,
      draftCount
    }
  }
}

export const syncService = new SyncService()
