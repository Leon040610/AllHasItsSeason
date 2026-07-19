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

function grantKey(itemId, activeExpiryDate) {
  return `${itemId}|${activeExpiryDate}|expiry_window`
}

async function getAll(collection, where) {
  const records = []
  let skip = 0
  while (true) {
    const page = await db.collection(collection).where(where || {}).skip(skip).limit(100).get()
    records.push(...page.data)
    if (page.data.length < 100) return records
    skip += page.data.length
  }
}

async function writeLog(job, status, errorCode, retryCount, now) {
  const jobId = typeof job === 'string' ? job : job.id
  const data = {
    jobId,
    itemId: typeof job === 'string' ? null : job.itemId || null,
    grantId: typeof job === 'string' ? null : job.grantId || null,
    status,
    sentAt: status === 'sent' ? now : null,
    errorCode: errorCode || null,
    retryCount: retryCount || 0,
    templateVersion: 'configured',
    updatedAt: now
  }
  try {
    const existing = await db.collection('notification_logs').where({ jobId }).limit(1).get()
    if (existing.data[0]) await db.collection('notification_logs').doc(existing.data[0]._id).update({ data })
    else await db.collection('notification_logs').doc(`notification_${jobId}`).set({ data: { ...data, createdAt: now } })
    return true
  } catch (error) {
    console.error('[scheduledReminderScan] notification log failed', error.errCode || 'unknown')
    return false
  }
}

function recordSkip(stats, reason) {
  stats.skipped++
  stats.skipReasons[reason || 'unknown'] = (stats.skipReasons[reason || 'unknown'] || 0) + 1
}

async function cancelStaleGrants(ownerKey, itemMap, settings, grants, config, now) {
  let cancelled = 0
  for (const grant of grants) {
    const item = itemMap.get(grant.itemId)
    const eligibility = getEligibility(item, settings, now, config.timeZone)
    if (!item || !eligibility.eligible || eligibility.activeExpiryDate !== grant.activeExpiryDate) {
      await db.collection('notification_grants').doc(grant._id).update({
        data: { status: 'cancelled', cancelledAt: now, lastErrorCode: 'stale_grant', updatedAt: now }
      })
      cancelled++
    }
  }
  return cancelled
}

async function cancelStaleJobs(ownerKey, itemMap, settings, grantsById, config, now) {
  const readyJobs = await getAll('reminder_jobs', { ownerKey, status: 'ready' })
  let cancelled = 0
  for (const job of readyJobs) {
    const item = itemMap.get(job.itemId)
    const eligibility = getEligibility(item, settings, now, config.timeZone)
    const grant = grantsById.get(job.grantId)
    const valid = grant && grant.status === 'available' &&
      grant.itemId === job.itemId && grant.activeExpiryDate === job.activeExpiryDate &&
      eligibility.eligible && eligibility.activeExpiryDate === job.activeExpiryDate
    if (!valid) {
      const errorCode = job.grantId ? 'stale_job' : 'legacy_grant_missing'
      await db.collection('reminder_jobs').doc(job._id).update({
        data: { status: 'cancelled', lastErrorCode: errorCode, updatedAt: now }
      })
      await writeLog(job, 'cancelled', errorCode, job.retryCount, now)
      cancelled++
    }
  }
  return cancelled
}

exports.main = async () => {
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
      const itemMap = new Map(items.map((item) => [item.id, item]))
      stats.scanned += items.length

      stage = 'load_grants'
      const ownerGrants = await getAll('notification_grants', { ownerKey: settings.ownerKey })
      const grants = ownerGrants.filter((grant) => grant.status === 'available')
      stage = 'cancel_stale_grants'
      stats.cancelled += await cancelStaleGrants(settings.ownerKey, itemMap, settings, grants, config, now)
      const activeGrants = grants.filter((grant) => {
        const item = itemMap.get(grant.itemId)
        const eligibility = getEligibility(item, settings, now, config.timeZone)
        return item && eligibility.eligible && eligibility.activeExpiryDate === grant.activeExpiryDate
      })
      const grantsById = new Map(ownerGrants
        .filter((grant) => grant.status === 'available' || grant.status === 'sending')
        .map((grant) => [grant.id, grant]))
      const grantsByItem = new Map(activeGrants.map((grant) => [grantKey(grant.itemId, grant.activeExpiryDate), grant]))

      stage = 'cancel_stale_jobs'
      stats.cancelled += await cancelStaleJobs(settings.ownerKey, itemMap, settings, grantsById, config, now)

      for (const item of items) {
        stage = 'evaluate_item'
        const eligibility = getEligibility(item, settings, now, config.timeZone)
        if (!eligibility.eligible) {
          recordSkip(stats, eligibility.reason)
          continue
        }
        const grant = grantsByItem.get(grantKey(item.id, eligibility.activeExpiryDate))
        if (!grant) {
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
        stage = 'query_reminder_job'
        const result = await db.collection('reminder_jobs').where({ dedupeKey }).limit(1).get()
        const existing = result.data[0] || null
        if (existing && existing.status === 'sent') {
          await db.collection('notification_grants').doc(grant._id).update({
            data: { status: 'cancelled', cancelledAt: now, lastErrorCode: 'dedupe_already_sent', updatedAt: now }
          })
          stats.duplicate++
          continue
        }
        if (existing && existing.status === 'ready' && existing.grantId === grant.id) {
          stats.duplicate++
          continue
        }

        const job = {
          id,
          ownerKey: settings.ownerKey,
          itemId: item.id,
          grantId: grant.id,
          activeExpiryDate: eligibility.activeExpiryDate,
          remindDate: local.date,
          reminderKind,
          status: 'ready',
          createdAt: existing && existing.createdAt || now,
          updatedAt: now,
          retryCount: 0,
          lastErrorCode: null,
          dedupeKey
        }
        stage = 'write_reminder_job'
        await db.collection('reminder_jobs').doc(id).set({ data: job })
        if (!await writeLog(job, 'ready', null, 0, now)) stats.logFailed++
        stats.created++
      }
    }
    return { success: true, dryRun: config.dryRun, date: local.date, stats }
  } catch (error) {
    const detailCode = error && (error.errCode || error.code) ? String(error.errCode || error.code) : 'unknown'
    console.error('[scheduledReminderScan] scan failed', stage, detailCode)
    return { success: false, dryRun: config.dryRun, errorCode: 'scan_failed', failureStage: stage, stats }
  }
}
