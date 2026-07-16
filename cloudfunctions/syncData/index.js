'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ALLOWED_COLLECTIONS = ['items', 'categories', 'reminder_settings', 'drafts', 'sync_settings']

// 统一跨集合时间戳契约，确保返回 number
function normalizeTimestamp(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'number') return value
  const time = new Date(value).getTime()
  return isNaN(time) ? fallback : time
}

function generateOwnerKey(openid, salt) {
  return crypto.createHmac('sha256', salt).update(openid).digest('hex').substring(0, 32)
}

function getCloudDocumentId(collection, ownerKey, recordId) {
  if (collection === 'items') {
    // 保持 P2.4 兼容性
    const hash = crypto.createHmac('sha256', ownerKey).update(recordId).digest('hex').substring(0, 24)
    return `item_${hash}`
  } else if (collection === 'reminder_settings' || collection === 'sync_settings') {
    return `${collection}_${ownerKey}`
  } else {
    const hash = crypto.createHmac('sha256', ownerKey).update(recordId).digest('hex').substring(0, 24)
    return `${collection}_${hash}`
  }
}

function extractSafePayload(collection, record, ownerKey) {
  const safeRecord = { ownerKey }
  
  const extractTime = (key) => {
    if (record[key] !== undefined) {
      safeRecord[key] = normalizeTimestamp(record[key])
    }
  }

  if (collection === 'items') {
    safeRecord.id = record.id
    safeRecord.name = record.name || ''
    safeRecord.brand = record.brand || ''
    safeRecord.specification = record.specification || ''
    safeRecord.categoryId = record.categoryId || ''
    safeRecord.categoryName = record.categoryName || ''
    safeRecord.status = record.status || 'active'
    safeRecord.expiryMode = record.expiryMode || 'normal'
    safeRecord.productionDate = record.productionDate || ''
    safeRecord.shelfLifeValue = typeof record.shelfLifeValue === 'number' ? record.shelfLifeValue : 0
    safeRecord.shelfLifeUnit = record.shelfLifeUnit || 'month'
    safeRecord.expiryDate = record.expiryDate || ''
    safeRecord.openDate = record.openDate || ''
    safeRecord.afterOpeningShelfLifeValue = typeof record.afterOpeningShelfLifeValue === 'number' ? record.afterOpeningShelfLifeValue : 0
    safeRecord.afterOpeningShelfLifeUnit = record.afterOpeningShelfLifeUnit || 'month'
    safeRecord.openedExpiryDate = record.openedExpiryDate || ''
    safeRecord.activeExpiryDate = record.activeExpiryDate || null
    safeRecord.activeExpirySource = record.activeExpirySource || 'normal'
    safeRecord.remindDays = typeof record.remindDays === 'number' ? record.remindDays : 7
    safeRecord.notes = record.notes || ''
    
    // New P2.7 Image fields
    safeRecord.imageProcessStatus = record.imageProcessStatus || 'idle'
    safeRecord.originalImageCloudFileId = record.originalImageCloudFileId || ''
    safeRecord.cutoutImageCloudFileId = record.cutoutImageCloudFileId || ''
    safeRecord.displayImageCloudFileId = record.displayImageCloudFileId || ''
    safeRecord.imageRevision = typeof record.imageRevision === 'number' ? record.imageRevision : 0
    safeRecord.imageSyncPending = !!record.imageSyncPending
    safeRecord.imageBackgroundColor = record.imageBackgroundColor || ''
    safeRecord.beautifyFallbackReason = record.beautifyFallbackReason || ''
    safeRecord.stickerRotation = typeof record.stickerRotation === 'number' ? record.stickerRotation : 0
    extractTime('imageUpdatedAt')
    
    safeRecord.createdAt = normalizeTimestamp(record.createdAt, Date.now())
    safeRecord.updatedAt = normalizeTimestamp(record.updatedAt, Date.now())
    extractTime('deletedAt')
  } 
  else if (collection === 'categories') {
    safeRecord.id = record.id
    safeRecord.name = record.name || ''
    safeRecord.backgroundColor = record.backgroundColor || '#F4F3F1'
    safeRecord.iconColor = record.iconColor || '#8E4D33'
    safeRecord.iconKey = record.iconKey || 'qita'
    safeRecord.defaultExpiryMode = record.defaultExpiryMode || 'normal'
    safeRecord.sortOrder = typeof record.sortOrder === 'number' ? record.sortOrder : 99
    safeRecord.isSystem = !!record.isSystem
    safeRecord.isDeleted = !!record.isDeleted
    
    safeRecord.createdAt = normalizeTimestamp(record.createdAt, Date.now())
    safeRecord.updatedAt = normalizeTimestamp(record.updatedAt, Date.now())
    extractTime('deletedAt')
  }
  else if (collection === 'reminder_settings') {
    safeRecord.id = 'default'
    safeRecord.enabled = !!record.enabled
    safeRecord.remindDayOptions = Array.isArray(record.remindDayOptions) ? record.remindDayOptions : [0, 1, 3, 7, 30]
    safeRecord.defaultRemindDays = typeof record.defaultRemindDays === 'number' ? record.defaultRemindDays : 7
    safeRecord.remindTime = record.remindTime || '10:00'
    safeRecord.inAppEnabled = record.inAppEnabled !== undefined ? !!record.inAppEnabled : true
    
    safeRecord.createdAt = normalizeTimestamp(record.createdAt, Date.now())
    safeRecord.updatedAt = normalizeTimestamp(record.updatedAt, Date.now())
  }
  else if (collection === 'sync_settings') {
    safeRecord.id = 'default'
    safeRecord.syncEnabled = !!record.syncEnabled
    
    safeRecord.createdAt = normalizeTimestamp(record.createdAt, Date.now())
    safeRecord.updatedAt = normalizeTimestamp(record.updatedAt, Date.now())
  }
  else if (collection === 'drafts') {
    if (record.source !== 'add') {
      throw new Error('validation_failed: draft source must be add')
    }
    safeRecord.id = record.id
    safeRecord.name = record.name || ''
    safeRecord.brand = record.brand || ''
    safeRecord.specification = record.specification || ''
    safeRecord.categoryId = record.categoryId || ''
    safeRecord.categoryName = record.categoryName || ''
    safeRecord.status = record.status || 'pending'
    safeRecord.expiryMode = record.expiryMode || ''
    safeRecord.productionDate = record.productionDate || ''
    safeRecord.shelfLifeValue = typeof record.shelfLifeValue === 'number' ? record.shelfLifeValue : 0
    safeRecord.shelfLifeUnit = record.shelfLifeUnit || ''
    safeRecord.expiryDate = record.expiryDate || ''
    safeRecord.openDate = record.openDate || ''
    safeRecord.afterOpeningShelfLifeValue = typeof record.afterOpeningShelfLifeValue === 'number' ? record.afterOpeningShelfLifeValue : 0
    safeRecord.afterOpeningShelfLifeUnit = record.afterOpeningShelfLifeUnit || ''
    safeRecord.openedExpiryDate = record.openedExpiryDate || ''
    safeRecord.activeExpiryDate = record.activeExpiryDate || null
    safeRecord.activeExpirySource = record.activeExpirySource || ''
    safeRecord.remindDays = typeof record.remindDays === 'number' ? record.remindDays : 7
    safeRecord.notes = record.notes || ''
    safeRecord.source = 'add'
    safeRecord.isDeleted = !!record.isDeleted
    
    safeRecord.createdAt = normalizeTimestamp(record.createdAt, Date.now())
    safeRecord.updatedAt = normalizeTimestamp(record.updatedAt, Date.now())
    extractTime('deletedAt')
  }
  
  return safeRecord
}

exports.main = async (event, context) => {
  const { action, collection, records, cursor, limit, logData } = event

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
    if (action === 'log') {
      return await handleLog(ownerKey, logData)
    }

    if (action === 'getLogs') {
      return await handleGetLogs(ownerKey, limit)
    }

    if (action === 'preflight') {
      return await handlePreflight(ownerKey)
    }

    // 兼容P2.4：如果未传 collection 且 action 为 pull/upsert，默认为 items
    const targetCollection = collection || 'items'

    if (!ALLOWED_COLLECTIONS.includes(targetCollection)) {
      return { success: false, message: '非法的集合名' }
    }

    if (action === 'pull') {
      return await handlePull(targetCollection, ownerKey, cursor, limit || 100)
    } else if (action === 'upsert') {
      // 兼容旧接口 items 参数
      const inputRecords = records || event.items || []
      return await handleUpsert(targetCollection, ownerKey, inputRecords)
    } else {
      return { success: false, message: '未知的同步指令' }
    }
  } catch (err) {
    console.error('[syncData] 异常:', err.errCode || err.message || 'unknown')
    return { success: false, message: err.message || '同步服务异常' }
  }
}

async function handlePull(collection, ownerKey, cursor, limit) {
  let query = db.collection(collection).where({ ownerKey })
  
  if (cursor) {
    query = query.where({ _id: db.command.gt(cursor) })
  }
  
  const res = await query.orderBy('_id', 'asc').limit(limit).get()
  const fetchedRecords = res.data || []
  
  const safeRecords = fetchedRecords.map(doc => {
    const { _id, ownerKey: _drop, _openid, ...rest } = doc
    return rest
  })
  
  const nextCursor = fetchedRecords.length > 0 ? fetchedRecords[fetchedRecords.length - 1]._id : null
  const hasMore = fetchedRecords.length === limit

  return {
    success: true,
    data: {
      records: safeRecords,
      nextCursor,
      hasMore
    }
  }
}

async function handleUpsert(collection, ownerKey, records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, data: { results: [] } }
  }
  if (records.length > 20) {
    return { success: false, message: '单次同步超出 20 条限制' }
  }

  const results = []

  for (const record of records) {
    // reminder_settings 和 sync_settings 的 id 强制为 default，其他需要传 id
    const recordId = (collection === 'reminder_settings' || collection === 'sync_settings') ? 'default' : record.id
    if (!recordId) continue
    
    let safeRecord
    try {
      safeRecord = extractSafePayload(collection, { ...record, id: recordId }, ownerKey)
    } catch (e) {
      results.push({
        id: recordId,
        outcome: 'failed',
        errorCode: e.message,
        conflictCount: 0,
        record: null
      })
      continue
    }

    const cloudDocumentId = getCloudDocumentId(collection, ownerKey, recordId)

    try {
      const outcomeRes = await db.runTransaction(async transaction => {
        const docRes = await transaction.collection(collection).doc(cloudDocumentId).get().catch(() => null)
        const doc = docRes && docRes.data ? docRes.data : null

        if (doc) {
          const localTime = safeRecord.updatedAt
          const cloudTime = doc.updatedAt || 0

          if (localTime > cloudTime) {
            // 禁止覆盖云端原有的 createdAt
            if (doc.createdAt !== undefined) {
              safeRecord.createdAt = doc.createdAt
            }
            await transaction.collection(collection).doc(cloudDocumentId).update({ data: safeRecord })
            return {
              outcome: 'updated',
              record: safeRecord,
              conflictCount: 0
            }
          } else {
            // 云端胜出 (平局或云端较新)
            return {
              outcome: 'remote_wins',
              record: doc,
              conflictCount: localTime !== cloudTime ? 1 : 0
            }
          }
        } else {
          // 不存在则创建
          await transaction.collection(collection).doc(cloudDocumentId).set({ data: safeRecord })
          return {
            outcome: 'created',
            record: safeRecord,
            conflictCount: 0
          }
        }
      })
      
      const { _id, ownerKey: _drop, _openid, ...returnedSafeRecord } = outcomeRes.record
      
      results.push({
        id: recordId,
        outcome: outcomeRes.outcome,
        updatedAt: returnedSafeRecord.updatedAt,
        conflictCount: outcomeRes.conflictCount,
        record: returnedSafeRecord
      })
    } catch (err) {
      console.error(`[syncData] 事务失败 collection=${collection} id=${recordId}`, err)
      results.push({
        id: recordId,
        outcome: 'failed',
        conflictCount: 0,
        record: null
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
    operationId: logData.operationId || '',
    status: logData.status || 'unknown',
    reason: logData.reason || '',
    collectionStats: logData.collectionStats || {},
    syncedCount: typeof logData.syncedCount === 'number' ? logData.syncedCount : 0,
    conflictCount: typeof logData.conflictCount === 'number' ? logData.conflictCount : 0,
    failedCount: typeof logData.failedCount === 'number' ? logData.failedCount : 0,
    createdAt: normalizeTimestamp(logData.createdAt, Date.now()),
    completedAt: normalizeTimestamp(logData.completedAt, Date.now()),
    errorCode: (logData.errorCode || '').substring(0, 200)
  }

  try {
    await db.collection('sync_logs').add({ data: safeLog })
  } catch (err) {
    console.error('[syncData] 日志写入失败', err)
  }
  
  return { success: true }
}

async function handleGetLogs(ownerKey, limit) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 10, 20))
  try {
    const res = await db.collection('sync_logs')
      .where({ ownerKey })
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get()
      
    const logs = res.data.map(doc => {
      const { _id, _openid, ownerKey: _dropKey, operationId, errorCode, ...rest } = doc
      
      let safeErrorCode = 'unknown_error'
      if (errorCode) {
        const msg = String(errorCode).toLowerCase()
        if (msg.includes('network')) safeErrorCode = 'network_error'
        else if (msg.includes('cloud') || msg.includes('timeout')) safeErrorCode = 'cloud_unavailable'
        else if (msg.includes('permission') || msg.includes('auth')) safeErrorCode = 'permission_denied'
        else if (msg.includes('cancel')) safeErrorCode = 'cancelled'
        else if (msg.includes('partial')) safeErrorCode = 'partial_failure'
      } else if (doc.status === 'success') {
        safeErrorCode = ''
      } else if (doc.status === 'cancelled') {
        safeErrorCode = 'cancelled'
      }

      return {
        ...rest,
        errorCode: safeErrorCode
      }
    })
    
    return { success: true, data: { logs } }
  } catch (err) {
    console.error('[syncData] getLogs failed', err)
    return { success: false, message: '获取日志失败' }
  }
}

async function handlePreflight(ownerKey) {
  try {
    const stats = {}
    for (const collection of ALLOWED_COLLECTIONS) {
      const res = await db.collection(collection).where({ ownerKey }).count()
      stats[collection] = res.total || 0
    }
    return { success: true, data: { stats } }
  } catch (err) {
    console.error('[syncData] preflight failed', err)
    return { success: false, message: '预检失败' }
  }
}
