import { cloudEnvID } from '../env.js'

class CloudRuntimeService {
  constructor() {
    this.status = 'unavailable' // 'ready' | 'unavailable' | 'init_failed'
    this.initPromise = null
  }

  init() {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve) => {
      // 1. 检查微信环境与基础能力
      if (typeof wx === 'undefined' || !wx.cloud) {
        console.warn('[CloudRuntime] 非微信环境或不支持云开发，降级为纯本地模式')
        this.status = 'unavailable'
        return resolve({ status: this.status, reason: 'non_wechat_environment' })
      }

      // 2. 检查环境变量配置有效性
      if (!cloudEnvID || cloudEnvID.trim() === '' || cloudEnvID === '请替换为你的微信云开发环境 ID') {
        console.warn('[CloudRuntime] 未配置有效的云环境 ID，降级为纯本地模式')
        this.status = 'unavailable'
        return resolve({ status: this.status, reason: 'cloud_env_not_configured' })
      }

      // 3. 执行单次初始化
      try {
        wx.cloud.init({
          env: cloudEnvID,
          traceUser: true
        })
        console.log('[CloudRuntime] 云开发环境初始化成功 (ready)')
        this.status = 'ready'
        resolve({ status: this.status, reason: 'success' })
      } catch (err) {
        console.error('[CloudRuntime] 云开发初始化抛出异常，降级为纯本地模式')
        this.status = 'init_failed'
        resolve({ status: this.status, reason: 'cloud_init_failed' })
      }
    })

    return this.initPromise
  }

  isReady() {
    return this.status === 'ready'
  }
}

export const cloudRuntimeService = new CloudRuntimeService()
