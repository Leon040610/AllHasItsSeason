'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const itemsCol = db.collection('items')
const logsCol = db.collection('sync_logs')

/**
 * 生成稳定且不可逆的 ownerKey，必须与 login 保持一致
 */
function generateOwnerKey(openid, salt) {
  return crypto.createHmac('sha256', salt).update(openid).digest('hex').substring(0, 32)
}

/**
 * 生成确定的云端文档 ID
 */
function generateCloudDocumentId(ownerKey, itemId) {
  const hash = crypto.createHmac('sha256', ownerKey).update(itemId).digest('hex').substring(0, 24)
  return `item_${hash}`
}

/**
 * 提取白名单字段，坚决不写入原始图片路径等无关字段
 */
function extractSafeItem(item, ownerKey) {
  return {
    ownerKey,
    id: item.id,
    name: item.name || '',
    brand: item.brand || '',
    specification: item.specification || '',
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || '',
    status: item.status || 'active',
    
    // expiry related
    expiryMode: item.expiryMode || 'normal',
    productionDate: item.productionDate || '',
    shelfLifeValue: typeof item.shelfLifeValue === 'number' ? item.shelfLifeValue : 0,
    shelfLifeUnit: item.shelfLifeUnit || 'month',
    expiryDate: item.expiryDate || '',
    openDate: item.openDate || '',
    afterOpeningShelfLifeValue: typeof item.afterOpeningShelfLifeValue === 'number' ? item.afterOpeningShelfLifeValue : 0,
    afterOpeningShelfLifeUnit: item.afterOpeningShelfLifeUnit || 'month',
    openedExpiryDate: item.openedExpiryDate || '',
    activeExpiryDate: item.activeExpiryDate || null,
    activeExpirySource: item.activeExpirySource || 'normal',
    remindDays: typeof item.remindDays === 'number' ? item.remindDays : 7,
    
    notes: item.notes || '',
    imageProcessStatus: item.imageProcessStatus || 'pending',
    
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  }
}

exports.main = async (event, context) => {
  const { action, items, cursor, limit, logData } = event

  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  if (!OPENID) {
    return { success: false, message: '无法获取用户身份' }
  }

  const salt = process.env.OWNER_KEY_SALT
  if (!salt) {
    console.error('[syncData] OWNER_KEY_SALT 未配置')
    return { success: false, message: '服务配置不完整' }
  }

  const ownerKey = generateOwnerKey(OPENID, salt)

  try {
    if (action === 'pull') {
      return await handlePull(ownerKey, cursor, limit || 100)
    } else if (action === 'upsert') {
      return await handleUpsert(ownerKey, items || [])
    } else if (action === 'log') {
      return await handleLog(ownerKey, logData)
    } else {
      return { success: false, message: '未知的同步指令' }
    }
  } catch (err) {
    console.error('[syncData] 异常:', err.errCode || err.message || 'unknown')
    return { success: false, message: '同步服务异常' }
  }
}

async function handlePull(ownerKey, cursor, limit) {
  let query = itemsCol.where({ ownerKey })
  
  if (cursor) {
    query = query.where({ _id: db.command.gt(cursor) })
  }
  
  const res = await query.orderBy('_id', 'asc').limit(limit).get()
  const fetchedItems = res.data || []
  
  // 去除云端内置字段和 ownerKey 返回给前端
  const safeItems = fetchedItems.map(doc => {
    const { _id, ownerKey: _drop, _openid, ...rest } = doc
    return rest
  })
  
  const nextCursor = fetchedItems.length > 0 ? fetchedItems[fetchedItems.length - 1]._id : null
  const hasMore = fetchedItems.length === limit

  return {
    success: true,
    data: {
      items: safeItems,
      nextCursor,
      hasMore
    }
  }
}

async function handleUpsert(ownerKey, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, data: { results: [] } }
  }
  if (items.length > 20) {
    return { success: false, message: '单次同步超出 20 条限制' }
  }

  const results = []

  // 串行执行事务，确保绝对原子性和避免云函数并发事务资源超限
  for (const item of items) {
    if (!item.id) continue
    
    const cloudDocumentId = generateCloudDocumentId(ownerKey, item.id)
    const safeItem = extractSafeItem(item, ownerKey)

    try {
      const outcomeRes = await db.runTransaction(async transaction => {
        const docRes = await transaction.collection('items').doc(cloudDocumentId).get().catch(() => null)
        const doc = docRes && docRes.data ? docRes.data : null

        if (doc) {
          const localTime = new Date(safeItem.updatedAt).getTime()
          const cloudTime = new Date(doc.updatedAt).getTime()

          if (localTime > cloudTime) {
            await transaction.collection('items').doc(cloudDocumentId).update({ data: safeItem })
            return {
              outcome: 'updated',
              item: safeItem,
              conflictCount: 0
            }
          } else {
            // 云端胜出 (平局或云端较新)
            return {
              outcome: 'remote_wins',
              item: doc, // 返回云端数据供本地校正
              conflictCount: localTime !== cloudTime ? 1 : 0
            }
          }
        } else {
          // 不存在则创建
          await transaction.collection('items').doc(cloudDocumentId).set({ data: safeItem })
          return {
            outcome: 'created',
            item: safeItem,
            conflictCount: 0
          }
        }
      })
      
      const { _id, ownerKey: _drop, _openid, ...returnedSafeItem } = outcomeRes.item
      
      results.push({
        id: item.id,
        outcome: outcomeRes.outcome,
        updatedAt: returnedSafeItem.updatedAt,
        conflictCount: outcomeRes.conflictCount,
        item: returnedSafeItem
      })
    } catch (err) {
      console.error(`[syncData] 事务失败 itemId=${item.id}`, err)
      results.push({
        id: item.id,
        outcome: 'failed',
        updatedAt: safeItem.updatedAt,
        conflictCount: 0,
        item: null
      })
    }
  }

  return {
    success: true,
    data: { results }
  }
}

async function handleLog(ownerKey, logData) {
  if (!logData) return { success: true }
  
  const safeLog = {
    ownerKey,
    status: logData.status || 'unknown',
    reason: logData.reason || '',
    syncedItemCount: typeof logData.syncedItemCount === 'number' ? logData.syncedItemCount : 0,
    conflictCount: typeof logData.conflictCount === 'number' ? logData.conflictCount : 0,
    failedCount: typeof logData.failedCount === 'number' ? logData.failedCount : 0,
    createdAt: logData.createdAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorMessage: (logData.errorMessage || '').substring(0, 200) // 脱敏截断
  }

  try {
    await logsCol.add({ data: safeLog })
  } catch (err) {
    console.error('[syncData] 日志写入失败', err)
  }
  
  return { success: true }
}
