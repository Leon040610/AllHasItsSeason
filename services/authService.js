const USER_KEY = 'allhas_user_v1'

class AuthService {
  constructor() {
    this.user = this.getDefaultUser()
    this.init()
  }

  getDefaultUser() {
    return {
      isLoggedIn: false,
      uid: '',
      nickname: '微信用户',
      avatarUrl: '',
      openid: ''
    }
  }

  init() {
    try {
      const data = uni.getStorageSync(USER_KEY)
      if (data) {
        this.user = { ...this.getDefaultUser(), ...JSON.parse(data) }
      }
    } catch (e) {
      console.error('AuthService init failed', e)
    }
  }

  save() {
    try {
      uni.setStorageSync(USER_KEY, JSON.stringify(this.user))
    } catch (e) {
      console.error('AuthService save failed', e)
    }
  }

  getUser() {
    return this.user
  }

  isLoggedIn() {
    return this.user && this.user.isLoggedIn
  }

  updateProfile(profileData) {
    if (profileData.nickname !== undefined) this.user.nickname = profileData.nickname
    if (profileData.avatarUrl !== undefined) this.user.avatarUrl = profileData.avatarUrl
    this.save()
  }

  async login() {
    return new Promise((resolve, reject) => {
      // 检查是否在微信小程序环境
      if (typeof wx === 'undefined') {
        return reject(new Error('请在微信环境中使用登录功能'))
      }
      
      // 检查云开发是否可用
      if (!wx.cloud) {
        return reject(new Error('微信云开发环境未就绪'))
      }

      uni.showLoading({ title: '登录中', mask: true })
      
      // 预留调用云函数获取 openid
      wx.cloud.callFunction({
        name: 'login', // 假设云开发配置了 login 云函数
        data: {},
        success: (res) => {
          uni.hideLoading()
          if (res.result && res.result.openid) {
            this.user.isLoggedIn = true
            this.user.openid = res.result.openid
            // 用 openid 前8位作为 UID 展示
            this.user.uid = res.result.openid.substring(0, 8).toUpperCase()
            this.save()
            resolve(this.user)
          } else {
            reject(new Error('获取身份信息失败'))
          }
        },
        fail: (err) => {
          uni.hideLoading()
          console.error('login callFunction failed', err)
          reject(new Error('云服务暂未配置或调用失败'))
        }
      })
    })
  }

  logout() {
    this.user = this.getDefaultUser()
    this.save()
  }
}

export const authService = new AuthService()
