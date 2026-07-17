import { localRepository } from '../repositories/localRepository.js'
import { STORAGE_KEYS } from '../utils/storageKeys.js'
import { generateUUID } from '../utils/uuid.js'
import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'
import { settingsService } from './settingsService.js'
import { cloudRuntimeService } from './cloudRuntimeService.js'
import { wechatCloudSyncRepository } from '../repositories/wechatCloudSyncRepository.js'
import { isStoredLoggedIn } from '../utils/authSessionStore.js'
import { storageScopeService } from '../utils/storageScopeService.js'

const SYNC_KEY = STORAGE_KEYS.SYNC_SETTINGS

function isNetworkAvailable() {
  return new Promise((resolve) => {
    if (typeof uni === 'undefined' || !uni.getNetworkType) {
      resolve(true)
      return
    }
    uni.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => {
        resolve(true)
      }
    })
  })
}

class SyncService {
  constructor() {
    this.settings = null
    this.isSyncing = false
    this.currentOperationId = null
    this.cancelRequested = false
    
    // 自动同步调度状态
    this.autoSyncTimer = null
    this.syncRequestedAfterCurrent = false
    this.scopeEpoch = 0
    
    this.init()
    
    // 全局只在构造函数中注册一次网络状态改变监听，保证幂等
    if (typeof uni !== 'undefined' && uni.onNetworkStatusChange) {
      uni.onNetworkStatusChange((res) => {
        if (res.isConnected) {
          console.log('[AutoSync] 网络已恢复，安排自动同步...')
          this.scheduleAutoSync({ reason: 'network_recovered' })
        }
      })
    }

    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('localDataChanged', () => {
        this.scheduleAutoSync({ reason: 'local_data_changed' })
      })
    }
  }

  init() {
    if (!this.isSyncing) {
      this.cancelRequested = false
    }

    let settings = null
    try {
      settings = localRepository.get(SYNC_KEY)
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
      localRepository.set(SYNC_KEY, settings)
      this.settings = settings
    } catch (e) {
      console.error('syncService save failed', e)
    }
  }

  scheduleAutoSync({ reason }) {
    console.log(`[AutoSync] 触发调度。原因: ${reason}`)
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer)
    }
    
    // 3秒 Debounce 机制，防频繁触发
    this.autoSyncTimer = setTimeout(async () => {
      this.autoSyncTimer = null
      try {
        await this.runScheduledSync()
      } catch (err) {
        console.warn('[AutoSync] Scheduled sync failed safely:', err && err.message ? err.message : err)
      }
    }, 3000)
  }

  cancelForScopeChange() {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
    this.syncRequestedAfterCurrent = false
    this.cancelRequested = true
    this.scopeEpoch += 1
  }

  async runScheduledSync() {
    if (!isStoredLoggedIn()) return
    
    const settings = this.getSettings()
    if (!settings || !settings.syncEnabled) return
    
    if (this.isSyncing) {
      // 正在同步时追加写，则在当前同步结束后重试一轮
      this.syncRequestedAfterCurrent = true
      console.log('[AutoSync] 同步已在进行中，标记同步追加请求')
      return
    }

    const networkOk = await isNetworkAvailable()
    if (!networkOk) return

    if (!cloudRuntimeService.isReady()) return
    if (this.cancelRequested) return

    // 仅在有本地待同步记录时触发
    if (!this.hasPendingChanges()) return

    console.log('[AutoSync] 自动同步前置条件全部满足，开始后台同步...')
    
    try {
      await this.syncAll({ force: false, isAuto: true })
    } catch (err) {
      console.warn('[AutoSync] 后台同步静默失败:', err.message)
    } finally {
      if (this.syncRequestedAfterCurrent) {
        this.syncRequestedAfterCurrent = false
        console.log('[AutoSync] 发现同步追加标记，开启追加轮次')
        this.scheduleAutoSync({ reason: 'queued_request' })
      }
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
    if (!isStoredLoggedIn()) {
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
    const operationScope = storageScopeService.getActiveScope()
    const operationEpoch = this.scopeEpoch
    this.currentOperationId = operationId
    this.cancelRequested = false
    const syncStart = Date.now()

    const assertOperationCurrent = () => {
      if (operationEpoch !== this.scopeEpoch || operationScope !== storageScopeService.getActiveScope()) {
        throw new Error('scope_changed')
      }
    }
    
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
      assertOperationCurrent()
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
            assertOperationCurrent()
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
              assertOperationCurrent()
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
      const scopeChanged = operationEpoch !== this.scopeEpoch || operationScope !== storageScopeService.getActiveScope()
      if (this.currentOperationId === operationId) {
        this.isSyncing = false
        this.currentOperationId = null
      }

      if (scopeChanged) {
        this.cancelRequested = false
        return { cancelled: true, reason: 'scope_changed', syncedItemCount: totalSyncedCount, conflictCount: totalConflictCount, logWritten: false }
      }
      
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
