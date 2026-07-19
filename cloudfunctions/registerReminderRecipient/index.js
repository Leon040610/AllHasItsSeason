'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function ownerKeyFor(openid, salt) {
  return crypto.createHmac('sha256', salt).update(openid).digest('hex').substring(0, 32)
}

function encryptionKey(secret) {
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(value, secret) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64')
  }
}

function validGrantInput(event) {
  return event &&
    typeof event.itemId === 'string' && event.itemId.length > 0 && event.itemId.length <= 128 &&
    typeof event.activeExpiryDate === 'string' && DATE_RE.test(event.activeExpiryDate) &&
    event.reminderKind === 'expiry_window'
}

function grantId(ownerKey, itemId, activeExpiryDate) {
  const source = `${ownerKey}|${itemId}|${activeExpiryDate}|expiry_window`
  return `grant_${crypto.createHash('sha256').update(source).digest('hex').substring(0, 40)}`
}

async function cancelReplacedGrants(ownerKey, itemId, activeExpiryDate, keepId, now) {
  const existing = await db.collection('notification_grants').where({
    ownerKey,
    itemId,
    activeExpiryDate,
    reminderKind: 'expiry_window',
    status: 'available'
  }).limit(20).get()
  for (const grant of existing.data) {
    if (grant.id === keepId) continue
    await db.collection('notification_grants').doc(grant._id).update({
      data: {
        status: 'cancelled',
        lastErrorCode: 'replaced_by_new_authorization',
        updatedAt: now
      }
    })
  }
}

exports.main = async (event = {}) => {
  const context = cloud.getWXContext()
  const openid = context.OPENID
  const salt = process.env.OWNER_KEY_SALT
  const secret = process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY
  if (!openid || !salt || !secret) {
    return { success: false, data: null, errorCode: 'recipient_config_missing' }
  }
  if (event.action !== 'registerGrant' || !validGrantInput(event)) {
    return { success: false, data: null, errorCode: 'invalid_grant_request' }
  }

  const ownerKey = ownerKeyFor(openid, salt)
  const recipientId = `recipient_${ownerKey}`
  const now = Date.now()
  const grant = {
    id: grantId(ownerKey, event.itemId, event.activeExpiryDate),
    ownerKey,
    itemId: event.itemId,
    activeExpiryDate: event.activeExpiryDate,
    reminderKind: 'expiry_window',
    status: 'available',
    createdAt: now,
    updatedAt: now,
    consumedAt: null,
    cancelledAt: null,
    lastErrorCode: null,
    retryCount: 0
  }

  try {
    const encrypted = encrypt(openid, secret)
    let createdAt = now
    try {
      const existingRecipient = await db.collection('notification_recipients').doc(recipientId).get()
      createdAt = existingRecipient.data && existingRecipient.data.createdAt || now
    } catch (_) {
      // First registration has no endpoint record yet.
    }
    await db.collection('notification_recipients').doc(recipientId).set({
      data: {
        ownerKey,
        encryptedOpenId: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        status: 'active',
        updatedAt: now,
        createdAt,
        lastErrorCode: null
      }
    })
    let originalCreatedAt = now
    try {
      const existingGrant = await db.collection('notification_grants').doc(grant.id).get()
      originalCreatedAt = existingGrant.data && existingGrant.data.createdAt || now
    } catch (_) {
      // A first authorization has no existing grant slot.
    }
    grant.createdAt = originalCreatedAt
    await cancelReplacedGrants(ownerKey, grant.itemId, grant.activeExpiryDate, grant.id, now)
    await db.collection('notification_grants').doc(grant.id).set({ data: grant })
    return {
      success: true,
      data: {
        grantId: grant.id,
        itemId: grant.itemId,
        activeExpiryDate: grant.activeExpiryDate,
        status: grant.status
      }
    }
  } catch (error) {
    console.error('[registerReminderRecipient] grant registration failed', error.errCode || 'unknown')
    return { success: false, data: null, errorCode: 'reminder_grant_storage_failed' }
  }
}
