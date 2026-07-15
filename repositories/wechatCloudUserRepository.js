// wechatCloudUserRepository.js
// 职责：封装所有对 login 云函数的调用，是前端唯一的云端用户操作入口。
// 约束：
//   - 页面不得直接调用 wx.cloud.callFunction
//   - 调用前必须确认 cloudRuntimeService 已就绪
//   - 不处理任何业务逻辑，只负责网络 I/O 和错误转换
//   - 不在日志中打印任何云函数返回的敏感字段

import { cloudRuntimeService } from '../services/cloudRuntimeService.js'

class WechatCloudUserRepository {
  /**
   * 调用 login 云函数执行登录
   * @returns {Promise<{uid: string, nickname: string, avatarCloudFileId: string, createdAt: string}>}
   */
  async callLogin() {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }

    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: { action: 'login' },
        success: (res) => {
          const result = res.result
          if (result && result.success && result.data) {
            resolve(result.data)
          } else {
            reject(new Error(result?.message || 'login_failed'))
          }
        },
        fail: (err) => {
          console.error('[CloudUserRepo] callLogin failed:', err.errMsg || 'unknown')
          reject(new Error('cloud_call_failed'))
        }
      })
    })
  }

  /**
   * 调用 login 云函数更新昵称
   * @param {string} nickname
   * @returns {Promise<{nickname: string}>}
   */
  async callUpdateNickname(nickname) {
    if (!cloudRuntimeService.isReady()) {
      throw new Error('cloud_not_ready')
    }

    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: { action: 'updateNickname', nickname },
        success: (res) => {
          const result = res.result
          if (result && result.success) {
            resolve(result.data)
          } else {
            reject(new Error(result?.message || 'update_failed'))
          }
        },
        fail: (err) => {
          console.error('[CloudUserRepo] callUpdateNickname failed:', err.errMsg || 'unknown')
          reject(new Error('cloud_call_failed'))
        }
      })
    })
  }
}

export const wechatCloudUserRepository = new WechatCloudUserRepository()
