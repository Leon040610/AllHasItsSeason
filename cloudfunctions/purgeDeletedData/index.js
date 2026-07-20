'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ACTIVE_IMAGE_STATUSES = new Set(['idle', 'cutting'])
const ACTIVE_REMINDER_STATUSES = new Set(['sending'])

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

function readRetention() {
  const days = Number(process.env.DELETED_RECORD_RETENTION_DAYS)
  if (days !== 7) {
    const error = new Error('record_retention_config_invalid')
    error.code = 'record_retention_config_invalid'
    throw error
  }
  return { days, cutoff: Date.now() - days * 24 * 60 * 60 * 1000 }
}

function recordPurgeEnabled(automatic = false) {
  return process.env.RECORD_PURGE_DRY_RUN === 'false'
    && process.env.RECORD_PURGE_DELETE_ENABLED === 'true'
    && (!automatic || process.env.RECORD_PURGE_AUTO_DELETE_ENABLED === 'true')
}

function tombstoneId(ownerKey, collection, recordId) {
  return `tombstone_${crypto.createHmac('sha256', ownerKey).update(`${collection}:${recordId}`).digest('hex').substring(0, 32)}`
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

async function getDocument(collection, id) {
  const result = await db.collection(collection).doc(id).get().catch(() => null)
  return result && result.data ? result.data : null
}

async function writeLog(data) {
  await db.collection('cleanup_logs').add({
    data: {
      operation: data.operation || 'data_purge',
      runId: data.runId || '',
      status: data.status || 'completed',
      dryRun: !!data.dryRun,
      candidateCount: Number(data.candidateCount || 0),
      deletedCount: Number(data.deletedCount || 0),
      skippedCount: Number(data.skippedCount || 0),
      failedCount: Number(data.failedCount || 0),
      recordType: data.recordType || null,
      recordRef: data.recordRef || null,
      reasonCode: data.reasonCode || null,
      createdAt: Date.now()
    }
  })
}

async function setCandidate(runId, type, sourceDocumentId, recordId, status, reason) {
  const id = `purge_${hash(`${runId}|${type}|${sourceDocumentId}`).substring(0, 40)}`
  await db.collection('purge_candidates').doc(id).set({
    data: {
      runId,
      type,
      sourceDocumentId,
      recordId,
      status,
      reason: reason || null,
      checkedAt: Date.now(),
      updatedAt: Date.now()
    }
  })
  return id
}

function isExpiredDeletedItem(item, cutoff) {
  return item && item.status === 'deleted' && toTimestamp(item.deletedAt, 0) > 0 && toTimestamp(item.deletedAt, 0) <= cutoff
}

function jobsForItem(jobs, itemId) {
  return jobs.filter(job => job.itemId === itemId || job.itemId === `${itemId}_sticker`)
}

function itemCandidateReason(item, imageJobs, reminderJobs, cutoff) {
  if (!isExpiredDeletedItem(item, cutoff)) return 'item_not_eligible'
  if (!item.id || !item.ownerKey) return 'item_identity_invalid'
  if (jobsForItem(imageJobs, item.id).some(job => ACTIVE_IMAGE_STATUSES.has(job.status))) return 'image_job_active'
  if (reminderJobs.some(job => job.itemId === item.id && ACTIVE_REMINDER_STATUSES.has(job.status))) return 'reminder_job_sending'
  return null
}

async function audit(operation = 'data_purge') {
  const { days, cutoff } = readRetention()
  const runId = `purge_run_${crypto.randomBytes(12).toString('hex')}`
  const [items, imageJobs, reminderJobs] = await Promise.all([
    getAll('items'), getAll('image_jobs'), getAll('reminder_jobs')
  ])
  const stats = { candidateCount: 0, skippedCount: 0, deletedCount: 0, failedCount: 0 }

  for (const item of items) {
    if (item.status !== 'deleted') continue
    const reason = itemCandidateReason(item, imageJobs, reminderJobs, cutoff)
    if (reason) {
      await setCandidate(runId, 'item', item._id, item.id || '', 'skipped', reason)
      stats.skippedCount++
    } else {
      await setCandidate(runId, 'item', item._id, item.id || '', 'ready', null)
      stats.candidateCount++
    }
  }

  await writeLog({ runId, status: 'completed', dryRun: true, operation, ...stats })
  return { success: true, dryRun: true, runId, retentionDays: days, ...stats }
}

async function writeTombstoneAndRemove(collection, sourceDocumentId, record) {
  const deletedAt = toTimestamp(record.deletedAt, Date.now())
  const id = tombstoneId(record.ownerKey, collection, record.id)
  await db.collection('sync_tombstones').doc(id).set({
    data: {
      ownerKey: record.ownerKey,
      collection,
      recordId: record.id,
      deletedAt,
      purgedAt: Date.now(),
      updatedAt: Date.now()
    }
  })
  await db.collection(collection).doc(sourceDocumentId).remove()
}

async function deleteDocuments(collection, documents) {
  for (const document of documents) {
    await db.collection(collection).doc(document._id).remove()
  }
}

async function purgeItem(item, cutoff) {
  const [allImageJobs, allReminderJobs, allGrants] = await Promise.all([
    getAll('image_jobs'),
    getAll('reminder_jobs', { ownerKey: item.ownerKey }),
    getAll('notification_grants', { ownerKey: item.ownerKey })
  ])
  const reason = itemCandidateReason(item, allImageJobs, allReminderJobs, cutoff)
  if (reason) return { status: 'skipped', reason }

  const relatedJobs = jobsForItem(allImageJobs, item.id)
  const relatedReminderJobs = allReminderJobs.filter(job => job.itemId === item.id)
  const relatedGrants = allGrants.filter(grant => grant.itemId === item.id)
  const relatedJobIds = new Set(relatedReminderJobs.map(job => job.id).filter(Boolean))
  const notificationLogs = (await getAll('notification_logs')).filter(log => relatedJobIds.has(log.jobId))

  for (const job of relatedReminderJobs) {
    if (job.status === 'ready') {
      await db.collection('reminder_jobs').doc(job._id).update({
        data: { status: 'cancelled', lastErrorCode: 'item_retention_purge', updatedAt: Date.now() }
      })
    }
  }

  await deleteDocuments('image_jobs', relatedJobs)
  await deleteDocuments('notification_grants', relatedGrants)
  await deleteDocuments('reminder_jobs', relatedReminderJobs)
  await deleteDocuments('notification_logs', notificationLogs)
  await writeTombstoneAndRemove('items', item._id, item)
  return { status: 'deleted' }
}

async function execute(runId, requestedLimit, automatic = false) {
  if (typeof runId !== 'string' || !runId.startsWith('purge_run_')) return { success: false, errorCode: 'run_invalid' }
  const { days, cutoff } = readRetention()
  const maxRecords = Math.max(1, Math.min(Number(requestedLimit) || 10, 20))
  const canDelete = recordPurgeEnabled(automatic)
  const operation = automatic ? 'data_purge_auto' : 'data_purge'
  const candidates = (await getAll('purge_candidates', {
    runId,
    status: db.command.in(['ready', 'failed'])
  }))
    .slice(0, maxRecords)
  const stats = { candidateCount: candidates.length, deletedCount: 0, skippedCount: 0, failedCount: 0 }

  for (const candidate of candidates) {
    const recordRef = hash(candidate.recordId || '').substring(0, 16)
    if (!canDelete) {
      await writeLog({ runId, status: 'ready', dryRun: true, candidateCount: 1, recordType: candidate.type, recordRef, reasonCode: automatic ? 'automatic_delete_disabled' : 'dry_run', operation })
      continue
    }
    try {
      if (candidate.type !== 'item') throw new Error('candidate_type_invalid')
      const source = await getDocument('items', candidate.sourceDocumentId)
      const result = source ? await purgeItem(source, cutoff) : { status: 'skipped', reason: 'source_missing' }
      await db.collection('purge_candidates').doc(candidate._id).update({
        data: { status: result.status, reason: result.reason || null, checkedAt: Date.now(), updatedAt: Date.now() }
      })
      if (result.status === 'deleted') {
        stats.deletedCount++
        await writeLog({ runId, status: 'deleted', dryRun: false, deletedCount: 1, recordType: candidate.type, recordRef, operation })
      } else {
        stats.skippedCount++
        await writeLog({ runId, status: 'skipped', dryRun: false, skippedCount: 1, recordType: candidate.type, recordRef, reasonCode: result.reason || 'recheck_failed', operation })
      }
    } catch (_) {
      await db.collection('purge_candidates').doc(candidate._id).update({
        data: { status: 'failed', reason: 'purge_failed', checkedAt: Date.now(), updatedAt: Date.now() }
      })
      stats.failedCount++
      await writeLog({ runId, status: 'failed', dryRun: false, failedCount: 1, recordType: candidate.type, recordRef, reasonCode: 'purge_failed', operation })
    }
  }
  await writeLog({ runId, status: 'completed', dryRun: !canDelete, operation, ...stats })
  return { success: true, dryRun: !canDelete, retentionDays: days, ...stats }
}

function automaticLimit() {
  return Math.max(1, Math.min(Number(process.env.RECORD_PURGE_AUTO_DELETE_LIMIT) || 10, 20))
}

async function runScheduledPurge() {
  if (process.env.RECORD_PURGE_AUTO_AUDIT_ENABLED !== 'true') {
    await writeLog({
      operation: 'data_purge_auto',
      status: 'skipped',
      dryRun: true,
      reasonCode: 'automatic_audit_disabled'
    })
    return { success: true, scheduled: true, dryRun: true, skipped: true, errorCode: 'automatic_audit_disabled' }
  }
  const auditResult = await audit('data_purge_auto')
  const executeResult = await execute(auditResult.runId, automaticLimit(), true)
  return { success: true, scheduled: true, audit: auditResult, execute: executeResult }
}

exports.main = async event => {
  try {
    if (!(event && (event.action || event.adminToken)) && isTimerInvocation()) return await runScheduledPurge()
    assertAdmin(event && event.adminToken)
    if (event.action === 'audit') return await audit()
    if (event.action === 'execute') return await execute(event.runId, event.maxRecords)
    return { success: false, errorCode: 'action_invalid' }
  } catch (error) {
    const code = error && error.code ? error.code : 'purge_failed'
    console.error('[purgeDeletedData] failed', code)
    return { success: false, errorCode: code }
  }
}
