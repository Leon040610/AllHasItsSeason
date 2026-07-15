import { localRepository } from '../repositories/localRepository.js'
import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'
import { authService } from './authService.js'
import { cloudRuntimeService } from './cloudRuntimeService.js'
import { wechatCloudSyncRepository } from '../repositories/wechatCloudSyncRepository.js'
import { STORAGE_KEYS } from '../utils/storageKeys.js'

const SYNC_KEY = STORAGE_KEYS.SYNC_SETTINGS
const LOGS_KEY = STORAGE_KEYS.SYNC_LOGS

class SyncService {
  constructor() {
    this.settings = null
    this.isSyncing = false
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

  async syncItems() {
    if (this.isSyncing) {
      throw new Error('sync_in_progress')
    }
    if (!authService.isLoggedIn()) {
      throw new Error('not_logged_in')
    }
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }

    this.isSyncing = true
    const syncStart = Date.now()
    
    this.updateSettings({ syncStatus: 'syncing', syncEnabled: true })
    
    let pullError = null
    let upsertError = null
    let conflictCount = 0
    let syncedItemCount = 0
    let failedCount = 0

    try {
      // 1. Pull All items from cloud with pagination
      let cursor = null
      let cloudItems = []
      let hasMore = true
      
      while (hasMore) {
        const pullRes = await wechatCloudSyncRepository.pullItems(cursor, 100)
        cloudItems = cloudItems.concat(pullRes.items)
        cursor = pullRes.nextCursor
        hasMore = pullRes.hasMore
      }

      // 2. Merge locally
      const localItems = itemService.getAllItemsForSync()
      const localMap = new Map(localItems.map(i => [i.id, i]))
      const applyToLocal = []

      for (const cloudItem of cloudItems) {
        const localItem = localMap.get(cloudItem.id)
        if (!localItem) {
          // New from cloud
          applyToLocal.push(cloudItem)
        } else {
          const localTime = new Date(localItem.updatedAt).getTime()
          const cloudTime = new Date(cloudItem.updatedAt).getTime()
          
          if (localTime <= cloudTime) {
            // Cloud wins or tie
            applyToLocal.push(cloudItem)
            if (localTime !== cloudTime) {
              conflictCount++
            }
          }
          // if localTime > cloudTime, local wins, it will be picked up below
        }
      }

      if (applyToLocal.length > 0) {
        itemService.applyBatchSyncResults(applyToLocal, 'synced', syncStart)
        syncedItemCount += applyToLocal.length
      }

      // 3. Upsert pending items
      const pendingItems = itemService.getPendingItemsForSync()
      
      for (let i = 0; i < pendingItems.length; i += 20) {
        const chunk = pendingItems.slice(i, i + 20)
        // take snapshot of chunk
        const snapshot = chunk.map(item => ({ ...item }))
        
        try {
          const results = await wechatCloudSyncRepository.upsertItems(snapshot)
          
          for (const res of results) {
            if (res.outcome === 'failed' || !res.item) {
              failedCount++
              itemService.applySyncResult(chunk.find(c => c.id === res.id), 'failed', null)
              continue
            }
            
            conflictCount += res.conflictCount
            
            // Check for mid-sync edits by reading fresh from itemService
            const allFresh = itemService.getAllItemsForSync()
            const currentLocal = allFresh.find(x => x.id === res.id)
            const snapshotItem = snapshot.find(x => x.id === res.id)
            
            if (currentLocal && snapshotItem && currentLocal.updatedAt === snapshotItem.updatedAt) {
              // No mid-sync edits. Apply the exact outcome returned by cloud
              itemService.applySyncResult(res.item, 'synced', syncStart)
              syncedItemCount++
            } else {
              // Mid-sync edit happened! Leave it as pending for next sync
              failedCount++ 
            }
          }
        } catch (err) {
          console.error('[SyncService] batch upsert failed', err)
          upsertError = err
          failedCount += chunk.length
          // Mark chunk as failed locally without overwriting their content
          chunk.forEach(item => {
             itemService.applySyncResult(item, 'failed', null)
          })
        }
      }

    } catch (err) {
      console.error('[SyncService] pull failed', err)
      pullError = err
    } finally {
      this.isSyncing = false
      
      const isSuccess = !pullError && !upsertError && failedCount === 0
      this.updateSettings({
        syncStatus: isSuccess ? 'success' : 'error',
        lastSyncAt: syncStart,
        syncedItemCount: this.settings.syncedItemCount + syncedItemCount
      })

      // Log to cloud
      wechatCloudSyncRepository.logSync({
        status: isSuccess ? 'success' : 'error',
        reason: pullError ? 'pull_error' : (upsertError ? 'upsert_error' : (failedCount > 0 ? 'partial_failure' : 'ok')),
        syncedItemCount,
        conflictCount,
        failedCount,
        createdAt: new Date(syncStart).toISOString(),
        errorMessage: (pullError || upsertError || {}).message || ''
      })
      
      if (!isSuccess) {
        throw (pullError || upsertError || new Error('sync_partial_failure'))
      }
      return { syncedItemCount, conflictCount }
    }
  }
}

export const syncService = new SyncService()
