import { cloudRuntimeService } from '../services/cloudRuntimeService.js'

class WechatCloudSyncRepository {
  async pullItems(cursor = null, limit = 100) {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncData',
        data: {
          action: 'pull',
          cursor,
          limit
        }
      })
      if (!res.result || !res.result.success) {
        throw new Error(res.result ? res.result.message : 'sync_pull_failed')
      }
      return res.result.data
    } catch (err) {
      console.error('[WechatCloudSyncRepository] pullItems failed:', err)
      throw err
    }
  }

  async upsertItems(items) {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncData',
        data: {
          action: 'upsert',
          items
        }
      })
      if (!res.result || !res.result.success) {
        throw new Error(res.result ? res.result.message : 'sync_upsert_failed')
      }
      return res.result.data.results
    } catch (err) {
      console.error('[WechatCloudSyncRepository] upsertItems failed:', err)
      throw err
    }
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
