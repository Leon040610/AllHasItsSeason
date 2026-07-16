import { cloudRuntimeService } from '../services/cloudRuntimeService.js'

class WechatCloudSyncRepository {
  async pullData(collection, cursor = null, limit = 100) {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncData',
        data: {
          action: 'pull',
          collection,
          cursor,
          limit
        }
      })
      if (!res.result || !res.result.success) {
        throw new Error(res.result ? res.result.message : 'sync_pull_failed')
      }
      return res.result.data
    } catch (err) {
      console.error(`[WechatCloudSyncRepository] pullData(${collection}) failed:`, err)
      throw err
    }
  }

  async upsertData(collection, records) {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncData',
        data: {
          action: 'upsert',
          collection,
          records
        }
      })
      if (!res.result || !res.result.success) {
        throw new Error(res.result ? res.result.message : 'sync_upsert_failed')
      }
      return res.result.data.results
    } catch (err) {
      console.error(`[WechatCloudSyncRepository] upsertData(${collection}) failed:`, err)
      throw err
    }
  }

  // 保留旧 API 兼容
  async pullItems(cursor = null, limit = 100) {
    const res = await this.pullData('items', cursor, limit)
    // 兼容返回格式
    return {
      items: res.records,
      nextCursor: res.nextCursor,
      hasMore: res.hasMore
    }
  }

  async upsertItems(items) {
    const results = await this.upsertData('items', items)
    // 兼容返回格式 (目前返回格式一致)
    return results
  }

  async logSync(logData) {
    if (!cloudRuntimeService.isReady()) {
      return
    }
    try {
      await wx.cloud.callFunction({
        name: 'syncData',
        data: {
          action: 'log',
          logData
        }
      })
    } catch (err) {
      console.error('[WechatCloudSyncRepository] logSync failed:', err)
    }
  }
}

export const wechatCloudSyncRepository = new WechatCloudSyncRepository()
