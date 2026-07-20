'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ALLOWED_PREFIXES = ['uploads/', 'processed/', 'avatars/']
const ALLOWED_SOURCE_KINDS = new Set(['original', 'display', 'cutout', 'avatar'])

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function deriveOwnerKey(openid) {
  const salt = process.env.OWNER_KEY_SALT
  if (!salt) {
    const error = new Error('config_error')
    error.code = 'config_error'
    throw error
  }
  return crypto.createHmac('sha256', salt).update(openid).digest('hex').substring(0, 32)
}

function isAllowedPath(cloudPath) {
  return typeof cloudPath === 'string' && ALLOWED_PREFIXES.some(prefix => cloudPath.startsWith(prefix))
}

function isMatchingCloudFile(fileId, cloudPath) {
  return typeof fileId === 'string'
    && fileId.startsWith('cloud://')
    && isAllowedPath(cloudPath)
    && fileId.includes(`/${cloudPath}`)
}

function safeSourceKind(value) {
  return ALLOWED_SOURCE_KINDS.has(value) ? value : 'original'
}

exports.main = async event => {
  try {
    const wxContext = cloud.getWXContext()
    if (!wxContext || !wxContext.OPENID) {
      return { success: false, errorCode: 'unauthorized' }
    }

    const fileId = event && event.fileId
    const cloudPath = event && event.cloudPath
    if (!isMatchingCloudFile(fileId, cloudPath)) {
      return { success: false, errorCode: 'file_metadata_invalid' }
    }

    const now = Date.now()
    const documentId = `file_${hash(fileId).substring(0, 40)}`
    await db.collection('cloud_file_registry').doc(documentId).set({
      data: {
        fileId,
        cloudPath,
        sourceKind: safeSourceKind(event && event.sourceKind),
        ownerKey: deriveOwnerKey(wxContext.OPENID),
        sizeBytes: null,
        createdAt: now,
        registeredAt: now,
        updatedAt: now
      }
    })

    return { success: true }
  } catch (error) {
    const errorCode = error && error.code ? error.code : 'registry_write_failed'
    console.error('[registerCloudFile] failed', errorCode)
    return { success: false, errorCode }
  }
}
