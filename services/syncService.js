import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'
import { settingsService } from './settingsService.js'
import { authService } from './authService.js'
import { cloudRuntimeService } from './cloudRuntimeService.js'
import { wechatCloudSyncRepository } from '../repositories/wechatCloudSyncRepository.js'
import { STORAGE_KEYS } from '../utils/storageKeys.js'
import { generateUUID } from '../utils/uuid.js'

const SYNC_KEY = STORAGE_KEYS.SYNC_SETTINGS

class SyncService {
  constructor() {
    this.settings = null
    this.isSyncing = false
    this.currentOperationId = null
    this.cancelRequested = false
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
    } else {
      // 保证字段完整
      let migrated = false
      if (settings.syncEnabled === undefined) { settings.syncEnabled = false; migrated = true }
      if (settings.syncStatus === undefined) { settings.syncStatus = 'not_logged_in'; migrated = true }
      if (migrated) this.save(settings)
    }
    
    // Recovery for stale syncing state
    if (settings.syncStatus === 'syncing' && !this.isSyncing) {
      settings.syncStatus = 'cancelled'
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
    const newSettings = { ...this.getSettings(), ...updates }
    this.save(newSettings)
  }

  enableSync() {
    this.updateSettings({ syncEnabled: true, updatedAt: Date.now() })
  }

  cancelSync(operationId) {
    if (this.currentOperationId === operationId) {
      this.cancelRequested = true
    }
  }

  toggleSync(enabled) {
    this.updateSettings({ syncEnabled: enabled, updatedAt: Date.now() })
    if (enabled) {
      return this.syncAll()
    }
    return Promise.resolve()
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

  // 为保持兼容性
  async syncItems(options = {}) {
    return this.syncAll(options)
  }

  hasPendingChanges() {
    const categories = categoryService.getPendingCategoriesForSync()
    const items = itemService.getPendingItemsForSync()
    const drafts = draftService.getPendingDraftsForSync()
    const reminderSettings = settingsService.hasPendingSettings()
    
    return categories.length > 0 || items.length > 0 || drafts.length > 0 || reminderSettings
  }

  async syncAll(options = {}) {
    const force = typeof options === 'boolean' ? options : !!options.force;
    const pullOnly = typeof options === 'object' ? !!options.pullOnly : false;
    const pushOnly = typeof options === 'object' ? !!options.pushOnly : false;
    const onProgress = typeof options === 'object' && typeof options.onProgress === 'function' ? options.onProgress : () => {};

    if (this.isSyncing) {
      throw new Error('sync_in_progress')
    }
    if (!authService.isLoggedIn()) {
      throw new Error('not_logged_in')
    }
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }
    
    // 如果没有开启同步（且不是主动点击开启时），则不自动同步
    if (!this.settings.syncEnabled && !force) {
      return { syncedItemCount: 0, conflictCount: 0 }
    }

    this.isSyncing = true
    const operationId = generateUUID()
    this.currentOperationId = operationId
    this.cancelRequested = false
    const syncStart = Date.now()
    
    this.updateSettings({ syncStatus: 'syncing' })
    
    let pullError = null
    let upsertError = null
    let totalConflictCount = 0
    let totalSyncedCount = 0
    let totalFailedCount = 0
    let collectionStats = {}
    let logWritten = false
    
    let completedUnits = 0
    let totalUnits = 1

    const reportProgress = (phase, collection, msg) => {
      onProgress({
        operationId,
        phase,
        collection,
        completedUnits,
        totalUnits,
        percent: Math.min(Math.floor((completedUnits / totalUnits) * 100), 100),
        message: msg
      })
    }

    reportProgress('preflight', '', '正在准备同步...')

    // Preflight check
    try {
      const stats = await wechatCloudSyncRepository.preflightSync()
      if (this.cancelRequested) throw new Error('cancelled')
      
      totalUnits = 0
      if (!pushOnly) {
        // pull chunks: each collection takes ceil(count / 100) requests
        totalUnits += Math.ceil((stats['items'] || 0) / 100) || 1
        totalUnits += Math.ceil((stats['categories'] || 0) / 100) || 1
        totalUnits += Math.ceil((stats['drafts'] || 0) / 100) || 1
        totalUnits += Math.ceil((stats['reminder_settings'] || 0) / 100) || 1
        totalUnits += Math.ceil((stats['sync_settings'] || 0) / 100) || 1
      }
    } catch (err) {
      console.warn('[SyncService] preflight failed', err)
      totalUnits = 10
    }

    const collections = [
      {
        name: 'sync_settings',
        service: this,
        getAllForSync: () => [{ id: 'default', syncEnabled: this.settings.syncEnabled, updatedAt: this.settings.updatedAt }],
        getPendingForSync: () => {
          return [{ id: 'default', syncEnabled: this.settings.syncEnabled, updatedAt: this.settings.updatedAt }]
        },
        applySyncResult: (res, status, lastSyncedAt) => {
          this.updateSettings({ 
            syncEnabled: res.syncEnabled, 
            updatedAt: res.updatedAt
          })
        }
      },
      {
        name: 'reminder_settings',
        service: settingsService,
        getAllForSync: () => [ { id: 'default', ...settingsService.getSettingsForSync() } ],
        getPendingForSync: () => settingsService.hasPendingSettings() ? [ { id: 'default', ...settingsService.getSettingsForSync() } ] : [],
        applySyncResult: (res, status, lastSyncedAt) => settingsService.applySyncResult(res, status, lastSyncedAt)
      },
      {
        name: 'categories',
        service: categoryService,
        getAllForSync: () => categoryService.getAllCategoriesForSync(),
        getPendingForSync: () => categoryService.getPendingCategoriesForSync(),
        applySyncResult: (res, status, lastSyncedAt) => categoryService.applySyncResult(res, status, lastSyncedAt),
        applyBatchSyncResults: (res, status, lastSyncedAt) => categoryService.applyBatchSyncResults(res, status, lastSyncedAt)
      },
      {
        name: 'drafts',
        service: draftService,
        getAllForSync: () => draftService.getAllDraftsForSync(),
        getPendingForSync: () => draftService.getPendingDraftsForSync(),
        applySyncResult: (res, status, lastSyncedAt) => draftService.applySyncResult(res, status, lastSyncedAt),
        applyBatchSyncResults: (res, status, lastSyncedAt) => draftService.applyBatchSyncResults(res, status, lastSyncedAt)
      },
      {
        name: 'items',
        service: itemService,
        getAllForSync: () => itemService.getAllItemsForSync(),
        getPendingForSync: () => itemService.getPendingItemsForSync(),
        applySyncResult: (res, status, lastSyncedAt) => itemService.applySyncResult(res, status, lastSyncedAt),
        applyBatchSyncResults: (res, status, lastSyncedAt) => itemService.applyBatchSyncResults(res, status, lastSyncedAt)
      }
    ]

    if (!pullOnly) {
      collections.forEach(col => {
        const pending = col.getPendingForSync()
        totalUnits += Math.ceil(pending.length / 20)
      })
    }
    totalUnits += 1 // For log writing

    try {
      for (const col of collections) {
        if (this.cancelRequested) break

        collectionStats[col.name] = { pull: 0, push: 0, conflict: 0, failed: 0 }
        const colLabel = col.name === 'items' ? '物品' : col.name === 'categories' ? '分类' : col.name === 'drafts' ? '草稿' : '设置'
        
        // 1. Pull
        if (!pushOnly) {
          let cursor = null
          let cloudRecords = []
          let hasMore = true
        
          while (hasMore) {
            if (this.cancelRequested) break
            reportProgress('pull', col.name, `正在同步${colLabel}...`)

            const pullRes = await wechatCloudSyncRepository.pullData(col.name, cursor, 100)
            cloudRecords = cloudRecords.concat(pullRes.records)
            cursor = pullRes.nextCursor
            hasMore = pullRes.hasMore
            
            completedUnits++
            reportProgress('pull', col.name, `正在同步${colLabel}...`)
          }
          if (this.cancelRequested) break
        
          // 2. Merge Pull Results
          const localRecords = col.getAllForSync()
          const localMap = new Map(localRecords.map(r => [r.id, r]))
          const applyToLocal = []

          for (const cloudRec of cloudRecords) {
            const localRec = localMap.get(cloudRec.id)
            if (!localRec) {
              applyToLocal.push(cloudRec)
            } else {
              const localTime = localRec.updatedAt || 0
              const cloudTime = cloudRec.updatedAt || 0
              
              if (localTime <= cloudTime) {
                applyToLocal.push(cloudRec)
                if (localTime !== cloudTime) {
                  totalConflictCount++
                  collectionStats[col.name].conflict++
                }
              }
            }
          }

          if (applyToLocal.length > 0) {
            if (col.applyBatchSyncResults) {
              col.applyBatchSyncResults(applyToLocal, 'synced', syncStart)
            } else {
              applyToLocal.forEach(r => col.applySyncResult(r, 'synced', syncStart))
            }
            totalSyncedCount += applyToLocal.length
            collectionStats[col.name].pull += applyToLocal.length
          }
        }

        // 3. Push Pending
        if (!pullOnly) {
          if (this.cancelRequested) break

          const pendingRecords = col.getPendingForSync()
          
          for (let i = 0; i < pendingRecords.length; i += 20) {
            if (this.cancelRequested) break
            reportProgress('push', col.name, `正在上传${colLabel}...`)

            const chunk = pendingRecords.slice(i, i + 20)
            const snapshot = chunk.map(r => ({ ...r }))
          
            try {
              const results = await wechatCloudSyncRepository.upsertData(col.name, snapshot)
              completedUnits++
              reportProgress('push', col.name, `正在上传${colLabel}...`)
              
              for (const res of results) {
                if (res.outcome === 'failed' || !res.record) {
                  totalFailedCount++
                  collectionStats[col.name].failed++
                  if (col.name !== 'sync_settings') {
                     col.applySyncResult(chunk.find(c => c.id === res.id), 'failed', null)
                  }
                  continue
                }
                
                totalConflictCount += res.conflictCount
                collectionStats[col.name].conflict += res.conflictCount
                
                const allFresh = col.getAllForSync()
                const currentLocal = allFresh.find(x => x.id === res.id)
                const snapshotRecord = snapshot.find(x => x.id === res.id)
                
                if (currentLocal && snapshotRecord && currentLocal.updatedAt === snapshotRecord.updatedAt) {
                  col.applySyncResult(res.record, 'synced', syncStart)
                  totalSyncedCount++
                  collectionStats[col.name].push++
                } else {
                  totalFailedCount++ 
                  collectionStats[col.name].failed++
                }
              }
            } catch (err) {
              console.error(`[SyncService] batch upsert ${col.name} failed`, err)
              upsertError = err
              totalFailedCount += chunk.length
              collectionStats[col.name].failed += chunk.length
              if (col.name !== 'sync_settings') {
                chunk.forEach(r => col.applySyncResult(r, 'failed', null))
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[SyncService] pull/upsert overall failed', err)
      pullError = err
    } finally {
      this.isSyncing = false
      this.currentOperationId = null
      
      const isSuccess = !this.cancelRequested && !pullError && !upsertError && totalFailedCount === 0
      
      const updates = {
        syncStatus: this.cancelRequested ? 'cancelled' : (isSuccess ? 'success' : 'error')
      }
      if (isSuccess && !this.cancelRequested) {
        updates.syncedItemCount = this.settings.syncedItemCount + totalSyncedCount
        updates.lastSyncAt = syncStart
        updates.lastSyncResult = {
          itemCount: collectionStats['items'] ? (collectionStats['items'].pull + collectionStats['items'].push) : 0,
          categoryCount: collectionStats['categories'] ? (collectionStats['categories'].pull + collectionStats['categories'].push) : 0,
          draftCount: collectionStats['drafts'] ? (collectionStats['drafts'].pull + collectionStats['drafts'].push) : 0,
          conflictCount: totalConflictCount
        }
      }
      this.updateSettings(updates)

      reportProgress('log', '', '正在保存同步记录...')

      try {
        await wechatCloudSyncRepository.logSync({
          operationId,
          status: this.cancelRequested ? 'cancelled' : (isSuccess ? 'success' : 'error'),
          reason: this.cancelRequested ? 'cancelled' : (pullError ? 'pull_error' : (upsertError ? 'upsert_error' : (totalFailedCount > 0 ? 'partial_failure' : 'ok'))),
          collectionStats,
          syncedCount: totalSyncedCount,
          conflictCount: totalConflictCount,
          failedCount: totalFailedCount,
          createdAt: syncStart,
          completedAt: Date.now(),
          errorCode: (pullError || upsertError || {}).message || ''
        })
        logWritten = true
        completedUnits++
        reportProgress('log', '', '完成')
      } catch (err) {
        console.error('[SyncService] logSync failed', err)
      }
      
      if (this.cancelRequested) {
        return { cancelled: true, syncedItemCount: totalSyncedCount, conflictCount: totalConflictCount, logWritten }
      }
      if (!isSuccess) {
        throw (pullError || upsertError || new Error('sync_partial_failure'))
      }
      return { syncedItemCount: totalSyncedCount, conflictCount: totalConflictCount, logWritten }
    }
  }
}

export const syncService = new SyncService()
