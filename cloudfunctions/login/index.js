// 云函数 login
// 职责：通过 cloud.getWXContext() 获取身份，生成 ownerKey，读写 users 集合。
// 安全约束：
//   - 不返回 OPENID、ownerKey 或完整错误堆栈
//   - 不在日志中打印 OPENID 或 ownerKey
//   - ownerKey 由 HMAC-SHA256(OPENID, OWNER_KEY_SALT) 生成，不可逆
//   - OWNER_KEY_SALT 必须在云开发控制台环境变量中配置，严禁写入代码

'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const usersCol = db.collection('users')

/**
 * 生成稳定且不可逆的 ownerKey
 * @param {string} openid
 * @param {string} salt 来自云函数环境变量 OWNER_KEY_SALT
 * @returns {string} 32 字符 hex 字符串
 */
function generateOwnerKey(openid, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(openid)
    .digest('hex')
    .substring(0, 32)
}

/**
 * 生成可展示的短 uid（不含任何敏感信息）
 * @param {string} ownerKey
 * @returns {string}
 */
function generateUid(ownerKey) {
  return ownerKey.substring(0, 8).toUpperCase()
}

exports.main = async (event, context) => {
  const { action = 'login', nickname } = event

  // 1. 获取微信身份（服务端，不信任前端传入）
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  if (!OPENID) {
    return { success: false, data: null, message: '无法获取用户身份，请重试' }
  }

  // 2. 读取 OWNER_KEY_SALT（必须在云开发控制台环境变量中配置）
  const salt = process.env.OWNER_KEY_SALT
  if (!salt || salt.trim() === '') {
    // salt 缺失时拒绝服务，不降级为不安全模式
    console.error('[login] OWNER_KEY_SALT 未配置，拒绝处理')
    return { success: false, data: null, message: '服务配置不完整，请联系开发者' }
  }

  // 3. 生成 ownerKey（不打印）
  const ownerKey = generateOwnerKey(OPENID, salt)

  // 4. 分支处理
  try {
    if (action === 'updateNickname') {
      return await handleUpdateNickname(ownerKey, nickname)
    }
    return await handleLogin(ownerKey)
  } catch (err) {
    // 不打印完整错误，只记录类别
    console.error('[login] 数据库操作异常:', err.errCode || 'unknown')
    return { success: false, data: null, message: '服务暂时不可用，请稍后重试' }
  }
}

/**
 * 处理登录：查询或创建用户档案
 */
async function handleLogin(ownerKey) {
  const now = Date.now()
  const uid = generateUid(ownerKey)

  // 查询是否已有档案
  const queryRes = await usersCol.where({ ownerKey }).limit(1).get()

  let userDoc

  if (queryRes.data.length === 0) {
    // 首次登录：创建用户档案
    const newUser = {
      ownerKey,
      uid,
      nickname: '微信用户',
      avatarCloudFileId: '',
      loginStatus: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    }
    await usersCol.add({ data: newUser })
    userDoc = newUser
  } else {
    // 已有档案：更新 lastLoginAt
    userDoc = queryRes.data[0]
    await usersCol.where({ ownerKey }).update({
      data: { lastLoginAt: now, updatedAt: now }
    })
  }

  // 白名单返回（严禁返回 ownerKey、OPENID）
  return {
    success: true,
    data: {
      uid: userDoc.uid,
      nickname: userDoc.nickname,
      avatarCloudFileId: userDoc.avatarCloudFileId || '',
      createdAt: userDoc.createdAt
    },
    message: '登录成功'
  }
}

/**
 * 处理昵称更新
 */
async function handleUpdateNickname(ownerKey, nickname) {
  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return { success: false, data: null, message: '昵称不能为空' }
  }
  const cleanNickname = nickname.trim().substring(0, 30)
  const now = Date.now()

  await usersCol.where({ ownerKey }).update({
    data: { nickname: cleanNickname, updatedAt: now }
  })

  return {
    success: true,
    data: { nickname: cleanNickname },
    message: '昵称已更新'
  }
}
