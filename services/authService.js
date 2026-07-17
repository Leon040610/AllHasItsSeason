// authService.js
// 职责：管理用户登录状态、本地持久化、与云端用户档案同步。
// 安全约束：
//   - 不持久化 openid
//   - 不直接调用 wx.cloud.callFunction（通过 wechatCloudUserRepository 中转）
//   - 不传 ownerKey/openid 给云函数

import { wechatCloudUserRepository } from '../repositories/wechatCloudUserRepository.js'
import { cloudRuntimeService } from './cloudRuntimeService.js'
import { storageScopeService } from '../utils/storageScopeService.js'
import { guestMigrationService } from './guestMigrationService.js'
import { itemService } from './itemService.js'
import { categoryService } from './categoryService.js'
import { draftService } from './draftService.js'
import { settingsService } from './settingsService.js'
import { syncService } from './syncService.js'

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
      nickname: '万物旅人',
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

      // 1. 先写入全局设备级登录态
      this.user = {
        ...this._getDefaultUser(),
        isLoggedIn: true,
        uid: data.uid || '',
        nickname: data.nickname || '万物旅人',
        avatarCloudFileId: data.avatarCloudFileId || ''
      }
      this._save()

      // 2. 再切换活跃作用域到当前账号分区
      storageScopeService.setActiveScope(`account::${this.user.uid}`)

      // 重置合并标志，允许新登录的合并判断
      guestMigrationService.setMergePrompted(false)

      // 3. 显式重新重置与载入内存缓存数据
      await this._reloadServices()

      return { ...this.user }
    } catch (err) {
      // 登录失败：必须保持 guest 作用域和游客数据不变，不清空本地数据
      const errorMessage = typeof err?.message === 'string' ? err.message : ''
      const msg = errorMessage === 'cloud_not_ready' || errorMessage === 'cloud_call_failed'
        ? '暂时没登录成功，也可以先逛逛'
        : (errorMessage || '暂时没登录成功，也可以先逛逛')
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
      this.user.nickname = String(profileData.nickname).trim().substring(0, 30) || '万物旅人'
    }
    if (profileData.avatarUrl !== undefined) {
      // 头像本地存储，可被 updateAvatar 上传覆盖
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

  /**
   * 上传头像到云存储并同步云端
   * @param {string} tempFilePath 本地临时头像 file 路径
   */
  async updateAvatar(tempFilePath) {
    if (!this.user.isLoggedIn || !cloudRuntimeService.isReady()) {
      // 未登录或云开发未就绪，只更新本地
      this.updateProfile({ avatarUrl: tempFilePath })
      return
    }

    // 1. 上传临时头像到云存储
    const timestamp = Date.now()
    const cloudPath = `avatars/${this.user.uid}_${timestamp}.jpg`
    const uploadRes = await new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: resolve,
        fail: reject
      })
    })

    // 2. 调云函数更新档案
    await wechatCloudUserRepository.callLogin({
      action: 'updateAvatar',
      avatarTempFileId: uploadRes.fileID
    })

    // 3. 更新本地状态
    this.user.avatarUrl = tempFilePath
    this.user.avatarCloudFileId = uploadRes.fileID
    this._save()
  }

  async logout() {
    // Stop delayed and in-flight work before changing the storage scope.
    syncService.cancelForScopeChange()

    // Keep the device-level session and the active data scope in a consistent order.
    this.user = this._getDefaultUser()
    this._save()

    storageScopeService.setActiveScope('guest')

    // Reload every in-memory service so pages cannot keep the previous account's data.
    await this._reloadServices()
    return this.getUser()
  }

  /**
   * 显式重置并重新初始化核心服务，更新内存缓存
   */
  async _reloadServices() {
    itemService.init()
    categoryService.init()
    draftService.init()
    settingsService.init()
    syncService.init()
  }
}

export const authService = new AuthService()
