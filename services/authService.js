// authService.js
// 职责：管理用户登录状态、本地持久化、与云端用户档案同步。
// 安全约束：
//   - 不持久化 openid
//   - 不直接调用 wx.cloud.callFunction（通过 wechatCloudUserRepository 中转）
//   - 不传 ownerKey/openid 给云函数

import { wechatCloudUserRepository } from '../repositories/wechatCloudUserRepository.js'
import { cloudRuntimeService } from './cloudRuntimeService.js'

const USER_KEY = 'allhas_user_v1'

class AuthService {
  constructor() {
    this._loginLock = false
    this.user = this._getDefaultUser()
    this._init()
  }

  _getDefaultUser() {
    return {
      isLoggedIn: false,
      uid: '',
      nickname: '微信用户',
      avatarUrl: '',
      avatarCloudFileId: ''
    }
  }

  _init() {
    try {
      const raw = uni.getStorageSync(USER_KEY)
      if (raw) {
        const stored = JSON.parse(raw)
        // 兼容旧版本：过滤掉旧的 openid 字段，不再读取
        const { openid: _dropped, ...safe } = stored
        this.user = { ...this._getDefaultUser(), ...safe }
      }
    } catch (e) {
      console.error('[AuthService] init failed')
    }
  }

  _save() {
    try {
      // 持久化前再次过滤，确保 openid 不写入 storage
      const { openid: _dropped, ...safe } = this.user
      uni.setStorageSync(USER_KEY, JSON.stringify(safe))
    } catch (e) {
      console.error('[AuthService] save failed')
    }
  }

  getUser() {
    return { ...this.user }
  }

  isLoggedIn() {
    return this.user && this.user.isLoggedIn === true
  }

  /**
   * 微信登录：调用 login 云函数，本地持久化白名单字段。
   * @returns {Promise<object>} 登录后的用户信息（不含 openid）
   */
  async login() {
    if (this._loginLock) {
      throw new Error('login_in_progress')
    }

    if (!cloudRuntimeService.isReady()) {
      throw new Error('暂时没登录成功，也可以先逛逛')
    }

    this._loginLock = true
    uni.showLoading({ title: '登录中', mask: true })

    try {
      const data = await wechatCloudUserRepository.callLogin()

      // 只存储白名单字段
      this.user = {
        ...this._getDefaultUser(),
        isLoggedIn: true,
        uid: data.uid || '',
        nickname: data.nickname || '微信用户',
        avatarCloudFileId: data.avatarCloudFileId || ''
      }
      this._save()
      return { ...this.user }
    } catch (err) {
      // 登录失败：保留当前游客状态，不清空本地数据
      const msg = err.message === 'cloud_not_ready' || err.message === 'cloud_call_failed'
        ? '暂时没登录成功，也可以先逛逛'
        : (err.message || '暂时没登录成功，也可以先逛逛')
      throw new Error(msg)
    } finally {
      this._loginLock = false
      uni.hideLoading()
    }
  }

  /**
   * 更新本地 profile（头像/昵称）
   * @param {object} profileData 只允许 nickname、avatarUrl 字段
   */
  updateProfile(profileData) {
    if (profileData.nickname !== undefined) {
      this.user.nickname = String(profileData.nickname).trim().substring(0, 30) || '微信用户'
    }
    if (profileData.avatarUrl !== undefined) {
      // 头像本阶段只本地存储，不写云端
      this.user.avatarUrl = profileData.avatarUrl
    }
    this._save()
  }

  /**
   * 更新昵称：本地优先保存，异步同步云端。
   * 云端失败不回滚本地。
   * @param {string} nickname
   */
  async updateNickname(nickname) {
    // 1. 本地先保存
    this.updateProfile({ nickname })

    // 2. 若已登录且云开发就绪，异步同步云端
    if (!this.user.isLoggedIn || !cloudRuntimeService.isReady()) {
      return
    }

    try {
      await wechatCloudUserRepository.callUpdateNickname(this.user.nickname)
    } catch (err) {
      // 云端失败：Toast 提示，本地保留
      uni.showToast({ title: '网络有点慢，修改先为你保留', icon: 'none' })
    }
  }

  logout() {
    this.user = this._getDefaultUser()
    this._save()
  }
}

export const authService = new AuthService()
