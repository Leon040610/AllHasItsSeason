'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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

exports.main = async (event = {}) => {
  const context = cloud.getWXContext()
  const openid = context.OPENID
  const salt = process.env.OWNER_KEY_SALT
  const secret = process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY
  if (!openid || !salt || !secret) {
    return { success: false, data: null, errorCode: 'recipient_config_missing' }
  }

  const ownerKey = ownerKeyFor(openid, salt)
  const docId = `recipient_${ownerKey}`
  const now = Date.now()
  try {
    if (event.action === 'disable') {
      await db.collection('notification_recipients').doc(docId).update({
        data: {
          status: 'disabled',
          disabledAt: now,
          updatedAt: now
        }
      })
      return { success: true, data: { status: 'disabled' } }
    }

    const encrypted = encrypt(openid, secret)
    let createdAt = now
    let grantVersion = 0
    try {
      const existing = await db.collection('notification_recipients').doc(docId).get()
      if (existing.data) {
        if (existing.data.createdAt) createdAt = existing.data.createdAt
        grantVersion = Number(existing.data.grantVersion || 0)
      }
    } catch (_) {
      // A missing document is expected on first registration.
    }
    await db.collection('notification_recipients').doc(docId).set({
      data: {
        ownerKey,
        encryptedOpenId: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        status: 'active',
        grantVersion: grantVersion + 1,
        authorizedAt: now,
        consumedAt: null,
        lastSentAt: null,
        lastErrorCode: null,
        updatedAt: now,
        createdAt
      }
    })
    return { success: true, data: { status: 'active', updatedAt: now } }
  } catch (error) {
    console.error('[registerReminderRecipient] database operation failed', error.errCode || 'unknown')
    return { success: false, data: null, errorCode: 'recipient_storage_failed' }
  }
}
