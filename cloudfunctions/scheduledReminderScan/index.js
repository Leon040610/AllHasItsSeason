'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const {
  localParts,
  getEligibility,
  createDedupeKey,
  readConfig
} = require('./reminderUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function documentId(dedupeKey) {
  return `reminder_${crypto.createHash('sha256').update(dedupeKey).digest('hex').substring(0, 40)}`
}

async function getAll(collection, where) {
  const result = []
  let skip = 0
  while (true) {
    const page = await db.collection(collection).where(where || {}).skip(skip).limit(100).get()
    result.push(...page.data)
    if (page.data.length < 100) return result
    skip += page.data.length
  }
}

async function writeLog(jobId, status, errorCode, retryCount, now) {
  const id = `notification_${jobId}`
  const data = {
    jobId,
    status,
    sentAt: status === 'sent' ? now : null,
    errorCode: errorCode || null,
    retryCount: retryCount || 0,
    templateVersion: 'configured',
    updatedAt: now
  }
  try {
    const existingResult = await db.collection('notification_logs').where({ jobId }).limit(1).get()
    const existing = existingResult.data[0] || null
    if (existing) {
      await db.collection('notification_logs').doc(existing._id || id).update({ data })
    } else {
      await db.collection('notification_logs').doc(id).set({ data: { ...data, createdAt: now } })
    }
    return true
  } catch (error) {
    console.error('[scheduledReminderScan] notification log failed', error.errCode || 'unknown')
    return false
  }
}

function recordSkip(stats, reason) {
  stats.skipped++
  const key = reason || 'unknown'
  stats.skipReasons[key] = (stats.skipReasons[key] || 0) + 1
}

async function cancelStaleJobs(ownerKey, items, settings, recipient, config, now, currentDate) {
  const readyJobs = await getAll('reminder_jobs', { ownerKey, status: 'ready' })
  const itemMap = new Map(items.map((item) => [item.id, item]))
  let cancelled = 0
  for (const job of readyJobs) {
    const item = itemMap.get(job.itemId)
    const eligibility = getEligibility(item, settings, now, config.timeZone)
    if (!item || !eligibility.eligible || eligibility.activeExpiryDate !== job.activeExpiryDate || !recipient) {
      await db.collection('reminder_jobs').doc(job._id).update({
        data: { status: 'cancelled', lastErrorCode: 'stale_job', updatedAt: now }
      })
      await writeLog(job._id, 'cancelled', 'stale_job', job.retryCount, now)
      cancelled++
    }
  }
  return cancelled
}

exports.main = async (event = {}) => {
  const config = readConfig()
  const now = Date.now()
  const local = localParts(now, config.timeZone)
  const stats = { scanned: 0, created: 0, skipped: 0, duplicate: 0, cancelled: 0, failed: 0, logFailed: 0, skipReasons: {} }
  let stage = 'validate_config'
  if (!process.env.OWNER_KEY_SALT) {
    return { success: false, dryRun: config.dryRun, errorCode: 'owner_key_config_missing', stats }
  }

  try {
    stage = 'load_reminder_settings'
    const settingsRecords = await getAll('reminder_settings')
    for (const settings of settingsRecords) {
      if (!settings.ownerKey) continue
      stage = 'load_items'
      const items = await getAll('items', { ownerKey: settings.ownerKey })
      stats.scanned += items.length
      stage = 'load_recipient'
      const recipientResult = await db.collection('notification_recipients')
        .where({ ownerKey: settings.ownerKey, status: 'active' })
        .limit(1)
        .get()
      const recipient = recipientResult.data[0] || null
      stage = 'cancel_stale_jobs'
      stats.cancelled += await cancelStaleJobs(settings.ownerKey, items, settings, recipient, config, now, local.date)

      for (const item of items) {
        stage = 'evaluate_item'
        const eligibility = getEligibility(item, settings, now, config.timeZone)
        if (!eligibility.eligible) {
          recordSkip(stats, eligibility.reason)
          continue
        }
        // A normal subscription authorization grants one send only. The
        // recipient record is the server-side source of remaining capacity.
        if (!recipient) {
          recordSkip(stats, 'authorization_unavailable')
          continue
        }
        const remindTime = typeof settings.remindTime === 'string' ? settings.remindTime : '10:00'
        if (local.time < remindTime) {
          recordSkip(stats, 'before_remind_time')
          continue
        }
        if (!config.templateId || !config.fields) {
          recordSkip(stats, 'template_config_missing')
          stats.failed++
          continue
        }
        const reminderKind = 'expiry_window'
        const dedupeKey = createDedupeKey(settings.ownerKey, item.id, eligibility.activeExpiryDate, reminderKind)
        const id = documentId(dedupeKey)
        // Some local CloudBase debug runtimes return errCode -1 when
        // `doc(id).get()` targets a document that does not exist. Querying by
        // the deterministic dedupe key treats an empty result as the normal
        // first-run case and remains safe for deployed environments.
        stage = 'query_reminder_job'
        const existingResult = await db.collection('reminder_jobs')
          .where({ dedupeKey })
          .limit(1)
          .get()
        const existing = existingResult.data[0] || null
        if (existing && ['ready', 'sent'].includes(existing.status)) {
          stats.duplicate++
          const existingJobId = existing.id || existing._id || id
          if (!await writeLog(existingJobId, existing.status, existing.lastErrorCode || null, existing.retryCount || 0, now)) {
            stats.logFailed++
          }
          continue
        }
        const job = {
          id,
          ownerKey: settings.ownerKey,
          itemId: item.id,
          activeExpiryDate: eligibility.activeExpiryDate,
          remindDate: local.date,
          reminderKind,
          status: 'ready',
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
          retryCount: 0,
          lastErrorCode: null,
          dedupeKey
        }
        stage = 'write_reminder_job'
        await db.collection('reminder_jobs').doc(id).set({ data: job })
        stage = 'write_notification_log'
        if (!await writeLog(id, 'ready', null, 0, now)) stats.logFailed++
        stats.created++
      }
    }
    return { success: true, dryRun: config.dryRun, date: local.date, stats }
  } catch (error) {
    const detailCode = error && (error.errCode || error.code) ? String(error.errCode || error.code) : 'unknown'
    console.error('[scheduledReminderScan] scan failed', stage, detailCode)
    return { success: false, dryRun: config.dryRun, errorCode: 'scan_failed', failureStage: stage, detailCode, stats }
  }
}
