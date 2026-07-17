import { storageScopeService } from '../utils/storageScopeService.js'
import { syncService } from './syncService.js'
import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'
import { settingsService } from './settingsService.js'

let mergePrompted = false
let mergeInProgress = false

export const guestMigrationService = {
  isMergePrompted() {
    return mergePrompted
  },

  setMergePrompted(val) {
    mergePrompted = val
  },

  /**
   * 检查游客作用域下是否存在“真实用户修改的数据”。
   */
  hasRealGuestData() {
    const guestPrefix = 'guest::'

    // 1. 检查是否存在未删除的物品
    try {
      const raw = uni.getStorageSync(`${guestPrefix}items`)
      if (raw) {
        const items = JSON.parse(raw)
        if (items.some(i => i.status !== 'deleted')) return true
      }
    } catch (e) {}

    // 2. 检查是否存在未删除的自建/手动草稿
    try {
      const raw = uni.getStorageSync(`${guestPrefix}drafts`)
      if (raw) {
        const drafts = JSON.parse(raw)
        if (drafts.some(d => d.source === 'add' && !d.isDeleted)) return true
      }
    } catch (e) {}

    // 3. 检查是否存在自建分类或被修改的系统分类
    try {
      const raw = uni.getStorageSync(`${guestPrefix}categories`)
      if (raw) {
        const cats = JSON.parse(raw)
        const hasRealCat = cats.some(c => {
          if (!c.isSystem && !c.isDeleted) return true
          if (c.isSystem && c.updatedAt > 0 && !c.isDeleted) return true // 用户修改了系统默认分类
          return false
        })
        if (hasRealCat) return true
      }
    } catch (e) {}

    // 4. 检查是否存在用户改动过的提醒设置
    try {
      const raw = uni.getStorageSync(`${guestPrefix}user_settings`)
      if (raw) {
        const settings = JSON.parse(raw)
        if (settings && settings.updatedAt > 0) return true
      }
    } catch (e) {}

    return false
  },

  /**
   * 提示用户合并，成功后执行数据迁移并触发后台同步。
   */
  async checkAndPromptMerge(uid, onComplete, options = {}) {
    const scheduleAutoSync = options.scheduleAutoSync !== false
    if (mergePrompted || mergeInProgress) {
      if (onComplete) onComplete(false)
      return
    }

    if (!this.hasRealGuestData()) {
      console.log('[GuestMigration] 游客作用域中无真实数据，直接开启同步。')
      syncService.enableSync()
      if (scheduleAutoSync) {
        syncService.scheduleAutoSync({ reason: 'sync_enabled' })
      }
      if (onComplete) onComplete(true)
      return
    }

    mergePrompted = true
    mergeInProgress = true

    uni.showModal({
      title: '把这台设备的收纳记录带到云端吗？',
      content: '开启后，这些记录会和当前账号一起保存，换设备时也能找回。',
      cancelText: '暂不合并',
      confirmText: '开启同步',
      confirmColor: '#8A9A86',
      success: async (res) => {
        try {
          if (res.confirm) {
            uni.showLoading({ title: '正在合并数据...', mask: true })
            
            // 7. 合并前先执行账号数据 pull，以拉取最新的云端数据
            try {
              await syncService.syncAll({ pullOnly: true, force: true })
            } catch (pullErr) {
              console.warn('[GuestMigration] 拉取云端数据失败，将直接本地合并:', pullErr)
            }

            // 执行本地数据合并写入
            await this.executeLocalMerge(uid)

            // 启用同步开关
            syncService.enableSync()
            
            uni.hideLoading()
            uni.showToast({ title: '已开启同步并合并数据', icon: 'success' })
            
            // 安排首轮自动同步（Debounced 上传合并内容）
            if (scheduleAutoSync) {
              syncService.scheduleAutoSync({ reason: 'merge_completed' })
            }

            if (onComplete) onComplete(true)
          } else {
            // "暂不合并"：不合并数据，直接开启账号同步
            syncService.enableSync()
            uni.showToast({ title: '已开启同步，未合并本地记录', icon: 'none' })
            if (scheduleAutoSync) {
              syncService.scheduleAutoSync({ reason: 'merge_skipped' })
            }
            if (onComplete) onComplete(false)
          }
        } catch (err) {
          console.error('[GuestMigration] 合并异常失败:', err)
          uni.hideLoading()
          uni.showToast({ title: '合并失败，请稍后重试', icon: 'none' })
          if (onComplete) onComplete(false)
        } finally {
          mergeInProgress = false
        }
      },
      fail: () => {
        mergeInProgress = false
      }
    })
  },

  /**
   * 合并游客 scoped 键值数据到登录 scoped 键值。
   */
  async executeLocalMerge(uid) {
    const guestPrefix = 'guest::'
    const accountPrefix = `account::${uid}::`

    // 1. 合并 Items
    try {
      const guestRaw = uni.getStorageSync(`${guestPrefix}items`)
      const guestItems = guestRaw ? JSON.parse(guestRaw) : []
      const accountRaw = uni.getStorageSync(`${accountPrefix}items`)
      let accountItems = accountRaw ? JSON.parse(accountRaw) : []

      for (const gItem of guestItems) {
        const idx = accountItems.findIndex(i => i.id === gItem.id)
        if (idx === -1) {
          const itemToPush = { ...gItem }
          // 9. 游客本地图片没有 Cloud File ID 时保留本地路径，挂起同步
          if (itemToPush.originalImageUrl && !itemToPush.originalImageCloudFileId) {
            itemToPush.imageSyncPending = true
          }
          itemToPush.syncStatus = 'pending' // 标记待上传云端
          accountItems.push(itemToPush)
        } else {
          // 冲突：取 updatedAt 更晚的，时间相同时以账号/云端优先 (保留本地墓碑)
          const aItem = accountItems[idx]
          const gTime = gItem.updatedAt || 0
          const aTime = aItem.updatedAt || 0
          if (gTime > aTime) {
            const merged = { ...gItem, syncStatus: 'pending' }
            if (merged.originalImageUrl && !merged.originalImageCloudFileId) {
              merged.imageSyncPending = true
            }
            accountItems[idx] = merged
          }
        }
      }
      uni.setStorageSync(`${accountPrefix}items`, JSON.stringify(accountItems))
    } catch (e) {
      console.error('[Merge] Failed to merge items:', e)
    }

    // 2. 合并 草稿箱 (仅限 source = 'add')
    try {
      const guestRaw = uni.getStorageSync(`${guestPrefix}drafts`)
      const guestDrafts = guestRaw ? JSON.parse(guestRaw) : []
      const accountRaw = uni.getStorageSync(`${accountPrefix}drafts`)
      let accountDrafts = accountRaw ? JSON.parse(accountRaw) : []

      for (const gDraft of guestDrafts) {
        if (gDraft.source !== 'add') continue
        
        const idx = accountDrafts.findIndex(d => d.id === gDraft.id)
        if (idx === -1) {
          const draftToPush = { ...gDraft, syncStatus: 'pending' }
          accountDrafts.push(draftToPush)
        } else {
          const aDraft = accountDrafts[idx]
          const gTime = gDraft.updatedAt || 0
          const aTime = aDraft.updatedAt || 0
          if (gTime > aTime) {
            accountDrafts[idx] = { ...gDraft, syncStatus: 'pending' }
          }
        }
      }
      uni.setStorageSync(`${accountPrefix}drafts`, JSON.stringify(accountDrafts))
    } catch (e) {
      console.error('[Merge] Failed to merge drafts:', e)
    }

    // 3. 合并 分类 (仅用户自建或修改的分类)
    try {
      const guestRaw = uni.getStorageSync(`${guestPrefix}categories`)
      const guestCats = guestRaw ? JSON.parse(guestRaw) : []
      const accountRaw = uni.getStorageSync(`${accountPrefix}categories`)
      let accountCats = accountRaw ? JSON.parse(accountRaw) : []

      for (const gCat of guestCats) {
        // 略过未修改的系统分类
        if (gCat.isSystem && gCat.updatedAt === 0) {
          continue
        }

        const idx = accountCats.findIndex(c => c.id === gCat.id)
        if (idx === -1) {
          const catToPush = { ...gCat, syncStatus: 'pending' }
          accountCats.push(catToPush)
        } else {
          const aCat = accountCats[idx]
          const gTime = gCat.updatedAt || 0
          const aTime = aCat.updatedAt || 0
          if (gTime > aTime) {
            accountCats[idx] = { ...gCat, syncStatus: 'pending' }
          }
        }
      }
      uni.setStorageSync(`${accountPrefix}categories`, JSON.stringify(accountCats))
    } catch (e) {
      console.error('[Merge] Failed to merge categories:', e)
    }

    // 4. 合并 提醒配置
    try {
      const guestRaw = uni.getStorageSync(`${guestPrefix}user_settings`)
      const accountRaw = uni.getStorageSync(`${accountPrefix}user_settings`)

      if (guestRaw) {
        const guestSettings = JSON.parse(guestRaw)
        const accountSettings = accountRaw ? JSON.parse(accountRaw) : null

        // 仅当账号无自定义有效配置时才导入游客配置
        const isAccountValid = accountSettings && accountSettings.updatedAt > 0
        if (!isAccountValid) {
          const merged = { ...guestSettings, syncStatus: 'pending' }
          uni.setStorageSync(`${accountPrefix}user_settings`, JSON.stringify(merged))
        }
      }
    } catch (e) {
      console.error('[Merge] Failed to merge settings:', e)
    }

    // 5. 合并成功后物理清除游客 Scoped 临时数据
    uni.removeStorageSync(`${guestPrefix}items`)
    uni.removeStorageSync(`${guestPrefix}drafts`)
    uni.removeStorageSync(`${guestPrefix}categories`)
    uni.removeStorageSync(`${guestPrefix}user_settings`)
    uni.removeStorageSync(`${guestPrefix}sync_settings`)
    uni.removeStorageSync(`${guestPrefix}sync_logs`)
    uni.removeStorageSync(`${guestPrefix}ocr_sessions`)

    // 6. 重新载入内存缓存数据
    itemService.init()
    categoryService.init()
    draftService.init()
    settingsService.init()
    syncService.init()
  }
}
