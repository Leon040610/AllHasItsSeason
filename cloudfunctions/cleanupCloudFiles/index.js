'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ALLOWED_PREFIXES = ['uploads/', 'processed/', 'avatars/']
const ACTIVE_JOB_STATUSES = new Set(['idle', 'cutting'])

function toTimestamp(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value instanceof Date) return value.getTime()
  if (value && typeof value.toDate === 'function') return value.toDate().getTime()
  if (value && typeof value._seconds === 'number') return value._seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : fallback
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function assertAdmin(token) {
  if (!process.env.CLEANUP_ADMIN_TOKEN || !token || !safeEqual(token, process.env.CLEANUP_ADMIN_TOKEN)) {
    const error = new Error('maintenance_access_denied')
    error.code = 'maintenance_access_denied'
    throw error
  }
}

function isTimerInvocation() {
  const wxContext = typeof cloud.getWXContext === 'function' ? cloud.getWXContext() : null
  return !!wxContext && !wxContext.OPENID
}

function retentionCutoff() {
  const days = Number(process.env.CLOUD_FILE_RETENTION_DAYS)
  if (days !== 7) {
    const error = new Error('retention_config_invalid')
    error.code = 'retention_config_invalid'
    throw error
  }
  return { days, cutoff: Date.now() - days * 24 * 60 * 60 * 1000 }
}

function isAllowedPath(path) {
  return typeof path === 'string' && ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix))
}

function isCloudFileId(value) {
  return typeof value === 'string' && value.startsWith('cloud://')
}

function isAuditRunId(value) {
  return typeof value === 'string' && (value.startsWith('snapshot_') || value.startsWith('auto_'))
}

function collectCloudFileIds(value, target = new Set()) {
  if (!value || typeof value !== 'object' || value instanceof Date) return target
  if (Array.isArray(value)) {
    value.forEach(child => collectCloudFileIds(child, target))
    return target
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.endsWith('CloudFileId') && isCloudFileId(child)) target.add(child)
    else collectCloudFileIds(child, target)
  }
  return target
}

async function getAll(collection, where = null) {
  const records = []
  let skip = 0
  while (true) {
    let query = db.collection(collection)
    if (where) query = query.where(where)
    const page = await query.skip(skip).limit(100).get()
    records.push(...(page.data || []))
    if (!page.data || page.data.length < 100) return records
    skip += page.data.length
  }
}

async function collectActiveReferences(cutoff) {
  const [items, drafts, jobs, users] = await Promise.all([
    getAll('items'), getAll('drafts'), getAll('image_jobs'), getAll('users')
  ])
  const references = new Set()
  for (const item of items) {
    if (item.status === 'deleted' && toTimestamp(item.deletedAt, 0) > 0 && toTimestamp(item.deletedAt, 0) <= cutoff) {
    } else {
      collectCloudFileIds(item, references)
    }
  }
  for (const draft of drafts) {
    collectCloudFileIds(draft, references)
  }
  for (const user of users) {
    if (isCloudFileId(user.avatarCloudFileId)) references.add(user.avatarCloudFileId)
  }
  for (const job of jobs) {
    if (ACTIVE_JOB_STATUSES.has(job.status)) collectCloudFileIds(job, references)
  }
  return references
}

async function writeLog(data) {
  await db.collection('cleanup_logs').add({
    data: {
      operation: data.operation || 'file_cleanup',
      snapshotId: data.snapshotId || '',
      status: data.status,
      dryRun: data.dryRun,
      candidateCount: Number(data.candidateCount || 0),
      deletedCount: Number(data.deletedCount || 0),
      skippedCount: Number(data.skippedCount || 0),
      failedCount: Number(data.failedCount || 0),
      fileRef: data.fileRef || null,
      reasonCode: data.reasonCode || null,
      createdAt: Date.now()
    }
  })
}

async function updateCandidate(candidate, status, reason) {
  await db.collection('cleanup_candidates').doc(candidate._id).update({
    data: { status, reason, checkedAt: Date.now(), updatedAt: Date.now() }
  })
}

function deletionEnabled(automatic = false) {
  return process.env.CLEANUP_DRY_RUN === 'false'
    && process.env.CLEANUP_DELETE_ENABLED === 'true'
    && (!automatic || process.env.CLEANUP_AUTO_DELETE_ENABLED === 'true')
}

async function cleanup(snapshotId, requestedLimit, automatic = false) {
  if (!isAuditRunId(snapshotId)) {
    return { success: false, errorCode: 'snapshot_invalid' }
  }
  const maxDeletes = Math.max(1, Math.min(Number(requestedLimit) || 10, 20))
  const { days, cutoff } = retentionCutoff()
  const candidates = (await getAll('cleanup_candidates', {
    snapshotId,
    status: db.command.in(['ready', 'failed'])
  }))
    .slice(0, maxDeletes)
  const canDelete = deletionEnabled(automatic)
  const operation = automatic ? 'file_cleanup_auto' : 'file_cleanup'
  const stats = { candidateCount: candidates.length, deletedCount: 0, skippedCount: 0, failedCount: 0 }

  for (const candidate of candidates) {
    const safePath = isAllowedPath(candidate.cloudPath)
    const oldEnough = toTimestamp(candidate.createdAt, 0) > 0 && toTimestamp(candidate.createdAt, 0) <= cutoff
    const references = await collectActiveReferences(cutoff)
    const fileRef = hash(candidate.fileId || '').substring(0, 16)
    if (!isCloudFileId(candidate.fileId) || !safePath || !oldEnough || references.has(candidate.fileId)) {
      await updateCandidate(candidate, 'skipped', 'recheck_failed')
      await writeLog({ operation, snapshotId, status: 'skipped', dryRun: !canDelete, skippedCount: 1, fileRef, reasonCode: 'recheck_failed' })
      stats.skippedCount++
      continue
    }
    if (!canDelete) {
      await writeLog({ operation, snapshotId, status: 'ready', dryRun: true, candidateCount: 1, fileRef, reasonCode: automatic ? 'automatic_delete_disabled' : 'dry_run' })
      continue
    }
    try {
      const result = await cloud.deleteFile({ fileList: [candidate.fileId] })
      const fileResult = result && Array.isArray(result.fileList) ? result.fileList[0] : null
      if (!fileResult || fileResult.status !== 0) {
        throw new Error('cloud_delete_failed')
      }
      await updateCandidate(candidate, 'deleted', null)
      await writeLog({ operation, snapshotId, status: 'deleted', dryRun: false, deletedCount: 1, fileRef })
      stats.deletedCount++
    } catch (_) {
      await updateCandidate(candidate, 'failed', 'cloud_delete_failed')
      await writeLog({ operation, snapshotId, status: 'failed', dryRun: false, failedCount: 1, fileRef, reasonCode: 'cloud_delete_failed' })
      stats.failedCount++
    }
  }
  await writeLog({ operation, snapshotId, status: 'completed', dryRun: !canDelete, ...stats })
  return { success: true, dryRun: !canDelete, retentionDays: days, ...stats }
}

function automaticLimit() {
  return Math.max(1, Math.min(Number(process.env.CLEANUP_AUTO_DELETE_LIMIT) || 10, 20))
}

async function getLatestAutomaticSnapshotId() {
  const result = await db.collection('cleanup_logs')
    .where({ operation: 'audit_auto', status: 'completed' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return result && result.data && result.data[0] ? result.data[0].snapshotId : ''
}

async function runScheduledCleanup() {
  const snapshotId = await getLatestAutomaticSnapshotId()
  if (!snapshotId) {
    await writeLog({
      operation: 'file_cleanup_auto',
      status: 'skipped',
      dryRun: true,
      reasonCode: 'automatic_audit_not_found'
    })
    return { success: true, scheduled: true, dryRun: true, skipped: true, errorCode: 'automatic_audit_not_found' }
  }
  return { ...(await cleanup(snapshotId, automaticLimit(), true)), scheduled: true }
}

exports.main = async event => {
  try {
    if (!(event && (event.adminToken || event.snapshotId)) && isTimerInvocation()) return await runScheduledCleanup()
    assertAdmin(event && event.adminToken)
    return await cleanup(event.snapshotId, event.maxDeletes)
  } catch (error) {
    const code = error && error.code ? error.code : 'cleanup_failed'
    console.error('[cleanupCloudFiles] failed', code)
    return { success: false, errorCode: code }
  }
}
