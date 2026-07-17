// utils/storageScopeService.js
// 职责：维护当前活动作用域，生成 scoped storage key，并进行旧版数据无损幂等迁移。

const BASE_KEY_MAP = {
  'allhas_items_v1': 'items',
  'allhas_categories_v1': 'categories',
  'allhas_user_settings_v1': 'user_settings',
  'allhas_drafts_v1': 'drafts',
  'allhas_sync_settings_v1': 'sync_settings',
  'allhas_sync_logs_v1': 'sync_logs',
  'allhas_local_file_registry_v1': 'file_registry',
  'ALLHAS_OCR_SESSIONS': 'ocr_sessions'
}

let currentScope = 'guest'

// 1. 初始化活跃作用域 (从全局 allhas_active_scope_v1 读取，或兜底从 allhas_user_v1 恢复)
try {
  const savedScope = uni.getStorageSync('allhas_active_scope_v1')
  if (savedScope) {
    currentScope = savedScope
  } else {
    const userRaw = uni.getStorageSync('allhas_user_v1')
    if (userRaw) {
      const user = JSON.parse(userRaw)
      if (user.isLoggedIn && user.uid) {
        currentScope = `account::${user.uid}`
      }
    }
    uni.setStorageSync('allhas_active_scope_v1', currentScope)
  }
} catch (e) {
  console.error('[StorageScopeService] Failed to init scope:', e)
}

export const storageScopeService = {
  getActiveScope() {
    return currentScope
  },

  setActiveScope(scope) {
    currentScope = scope
    try {
      uni.setStorageSync('allhas_active_scope_v1', scope)
    } catch (e) {
      console.error('[StorageScopeService] Failed to set active scope:', e)
    }
  },

  getScopedKey(baseKey) {
    const suffix = BASE_KEY_MAP[baseKey]
    if (!suffix) {
      // 非隔离 Key 直接返回原 Key
      return baseKey
    }

    if (currentScope.startsWith('account::')) {
      const uid = currentScope.split('::')[1]
      return `account::${uid}::${suffix}`
    } else {
      return `guest::${suffix}`
    }
  },

  /**
   * 幂等无损数据迁移程序。由 App.vue onLaunch 调用一次。
   * 读取旧的全局 Key，转移 to guest 作用域，记录详细日志，不物理删除老数据以供降级回退。
   */
  runMigration() {
    const migrationKey = 'allhas_scope_migration_v1'
    let journal = null

    try {
      const rawJournal = uni.getStorageSync(migrationKey)
      if (rawJournal) {
        journal = JSON.parse(rawJournal)
      }
    } catch (e) {
      console.error('[Migration] Failed to parse journal:', e)
    }

    if (!journal) {
      journal = {
        version: 1,
        status: 'started',
        migratedKeys: [],
        updatedAt: Date.now()
      }
      uni.setStorageSync(migrationKey, JSON.stringify(journal))
    }

    if (journal.status === 'completed') {
      console.log('[Migration] All migrations completed previously.')
      return
    }

    const oldKeysMap = {
      'allhas_items_v1': 'guest::items',
      'allhas_categories_v1': 'guest::categories',
      'allhas_user_settings_v1': 'guest::user_settings',
      'allhas_drafts_v1': 'guest::drafts',
      'allhas_sync_settings_v1': 'guest::sync_settings',
      'allhas_sync_logs_v1': 'guest::sync_logs'
    }

    let journalChanged = false

    for (const oldKey in oldKeysMap) {
      if (journal.migratedKeys.includes(oldKey)) {
        continue
      }

      try {
        const oldVal = uni.getStorageSync(oldKey)
        if (oldVal !== '' && oldVal !== null && oldVal !== undefined) {
          const newKey = oldKeysMap[oldKey]
          
          // 写入新作用域 Key
          uni.setStorageSync(newKey, oldVal)
          
          // 回读并核对内容一致性
          const verifyVal = uni.getStorageSync(newKey)
          if (verifyVal === oldVal) {
            journal.migratedKeys.push(oldKey)
            journalChanged = true
            console.log(`[Migration] Key "${oldKey}" successfully migrated to guest scoped key "${newKey}".`)
          } else {
            console.error(`[Migration] Verification failed for key "${oldKey}".`)
          }
        } else {
          // 如果旧 Key 本来就不存在，标记已迁移，避免重复计算
          journal.migratedKeys.push(oldKey)
          journalChanged = true
        }
      } catch (err) {
        console.error(`[Migration] Error migrating key "${oldKey}":`, err)
      }
    }

    // 更新 Journal 状态
    if (journal.migratedKeys.length === Object.keys(oldKeysMap).length) {
      journal.status = 'completed'
      journalChanged = true
    } else {
      journal.status = 'verified'
      journalChanged = true
    }

    if (journalChanged) {
      journal.updatedAt = Date.now()
      uni.setStorageSync(migrationKey, JSON.stringify(journal))
    }
  }
}
