'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ALLOWED_PREFIXES = ['uploads/', 'processed/', 'avatars/']
const ACTIVE_JOB_STATUSES = new Set(['idle', 'cutting'])

function nowTimestamp(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value instanceof Date) return value.getTime()
  if (value && typeof value.toDate === 'function') return value.toDate().getTime()
  if (value && typeof value._seconds === 'number') return value._seconds * 1000
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : fallback
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
  const expected = process.env.CLEANUP_ADMIN_TOKEN
  if (!expected || !token || !safeEqual(token, expected)) {
    const error = new Error('maintenance_access_denied')
    error.code = 'maintenance_access_denied'
    throw error
  }
}

function isTimerInvocation() {
  const wxContext = typeof cloud.getWXContext === 'function' ? cloud.getWXContext() : null
  return !!wxContext && !wxContext.OPENID
}

function automaticAuditEnabled() {
  return process.env.CLEANUP_AUTO_AUDIT_ENABLED === 'true'
}

function readRetentionDays() {
  const value = Number(process.env.CLOUD_FILE_RETENTION_DAYS)
  if (value !== 7) {
    const error = new Error('retention_config_invalid')
    error.code = 'retention_config_invalid'
    throw error
  }
  return value
}

function isAllowedPath(path) {
  return typeof path === 'string' && ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix))
}

function isCloudFileId(value) {
  return typeof value === 'string' && value.startsWith('cloud://')
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

async function writeLog(data) {
  const safe = {
    operation: data.operation || 'audit',
    snapshotId: data.snapshotId || '',
    status: data.status || 'completed',
    dryRun: true,
    candidateCount: Number(data.candidateCount || 0),
    skippedCount: Number(data.skippedCount || 0),
    excludedCount: Number(data.excludedCount || 0),
    candidateBytes: Number(data.candidateBytes || 0),
    reasonCounts: data.reasonCounts || {},
    createdAt: Date.now()
  }
  await db.collection('cleanup_logs').add({ data: safe })
}

function addReason(stats, reason) {
  stats.reasonCounts[reason] = (stats.reasonCounts[reason] || 0) + 1
}

async function collectActiveReferences(cutoff) {
  const [items, drafts, jobs, users] = await Promise.all([
    getAll('items'),
    getAll('drafts'),
    getAll('image_jobs'),
    getAll('users')
  ])
  const references = new Set()
  for (const item of items) {
    const deletedAt = nowTimestamp(item.deletedAt, 0)
    if (item.status === 'deleted' && deletedAt > 0 && deletedAt <= cutoff) {
      continue
    }
    collectCloudFileIds(item, references)
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

function validateInventoryEntry(entry) {
  const createdAt = nowTimestamp(entry && entry.createdAt, 0)
  const sizeBytes = Number(entry && entry.sizeBytes)
  return {
    fileId: entry && entry.fileId,
    cloudPath: entry && entry.cloudPath,
    createdAt,
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : null
  }
}

async function beginSnapshot() {
  const snapshotId = `snapshot_${crypto.randomBytes(12).toString('hex')}`
  await writeLog({ operation: 'inventory_snapshot_started', snapshotId, status: 'ready' })
  return { success: true, dryRun: true, snapshotId }
}

async function appendInventory(snapshotId, files) {
  if (typeof snapshotId !== 'string' || !snapshotId.startsWith('snapshot_')) {
    return { success: false, errorCode: 'snapshot_invalid' }
  }
  if (!Array.isArray(files) || files.length === 0 || files.length > 100) {
    return { success: false, errorCode: 'inventory_batch_invalid' }
  }
  const results = []
  for (const source of files) {
    const entry = validateInventoryEntry(source)
    const documentId = `inventory_${hash(`${snapshotId}|${entry.fileId || ''}|${entry.cloudPath || ''}`).substring(0, 40)}`
    const valid = isCloudFileId(entry.fileId) && isAllowedPath(entry.cloudPath) && entry.createdAt > 0
    await db.collection('cloud_file_inventory').doc(documentId).set({
      data: {
        snapshotId,
        fileId: entry.fileId || '',
        cloudPath: entry.cloudPath || '',
        createdAt: entry.createdAt || null,
        sizeBytes: entry.sizeBytes,
        valid,
        updatedAt: Date.now()
      }
    })
    results.push({ accepted: valid })
  }
  return {
    success: true,
    dryRun: true,
    accepted: results.filter(result => result.accepted).length,
    rejected: results.filter(result => !result.accepted).length
  }
}

async function auditEntries(snapshotId, inventory, operation) {
  const retentionDays = readRetentionDays()
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  const references = await collectActiveReferences(cutoff)
  const stats = { candidateCount: 0, skippedCount: 0, excludedCount: 0, candidateBytes: 0, reasonCounts: {} }

  for (const source of inventory) {
    const entry = validateInventoryEntry(source)
    const sourceConfirmed = source.valid !== false
    let status = 'skipped'
    let reason = 'inventory_invalid'
    if (!sourceConfirmed || !isCloudFileId(entry.fileId) || !isAllowedPath(entry.cloudPath) || entry.createdAt <= 0) {
      stats.excludedCount++
      reason = 'inventory_unconfirmed'
    } else if (entry.createdAt > cutoff) {
      stats.skippedCount++
      reason = 'within_retention'
    } else if (references.has(entry.fileId)) {
      stats.skippedCount++
      reason = 'business_reference_exists'
    } else {
      status = 'ready'
      reason = 'unreferenced_over_retention'
      stats.candidateCount++
      stats.candidateBytes += entry.sizeBytes || 0
    }
    addReason(stats, reason)
    const candidateId = `cleanup_${hash(`${snapshotId}|${entry.fileId}`).substring(0, 40)}`
    await db.collection('cleanup_candidates').doc(candidateId).set({
      data: {
        snapshotId,
        fileId: entry.fileId || '',
        cloudPath: entry.cloudPath || '',
        createdAt: entry.createdAt || null,
        sizeBytes: entry.sizeBytes,
        status,
        reason,
        checkedAt: Date.now(),
        updatedAt: Date.now()
      }
    })
  }
  await writeLog({ operation, snapshotId, status: 'completed', ...stats })
  return { success: true, dryRun: true, retentionDays, scanned: inventory.length, ...stats }
}

async function runAudit(snapshotId) {
  if (typeof snapshotId !== 'string' || !snapshotId.startsWith('snapshot_')) {
    return { success: false, errorCode: 'snapshot_invalid' }
  }
  const inventory = await getAll('cloud_file_inventory', { snapshotId })
  return auditEntries(snapshotId, inventory, 'audit')
}

async function runScheduledAudit() {
  if (!automaticAuditEnabled()) {
    await writeLog({
      operation: 'audit_auto',
      status: 'skipped',
      reasonCounts: { automatic_audit_disabled: 1 }
    })
    return { success: true, scheduled: true, dryRun: true, skipped: true, errorCode: 'automatic_audit_disabled' }
  }
  const snapshotId = `auto_${crypto.randomBytes(12).toString('hex')}`
  const inventory = await getAll('cloud_file_registry')
  return {
    ...(await auditEntries(snapshotId, inventory, 'audit_auto')),
    scheduled: true,
    registryOnly: true
  }
}

exports.main = async event => {
  try {
    const action = event && event.action
    if (!action && isTimerInvocation()) return await runScheduledAudit()
    assertAdmin(event && event.adminToken)
    if (action === 'beginSnapshot') return await beginSnapshot()
    if (action === 'appendInventory') return await appendInventory(event.snapshotId, event.files)
    if (action === 'runAudit') return await runAudit(event.snapshotId)
    return { success: false, errorCode: 'action_invalid' }
  } catch (error) {
    const code = error && error.code ? error.code : 'audit_failed'
    console.error('[auditCloudFiles] failed', code)
    return { success: false, errorCode: code }
  }
}
