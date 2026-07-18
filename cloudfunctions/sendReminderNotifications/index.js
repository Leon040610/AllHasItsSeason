'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const {
  getEligibility,
  readConfig,
  buildTemplateData
} = require('./reminderUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function encryptionKey(secret) {
  return crypto.createHash('sha256').update(secret).digest()
}

function decrypt(recipient, secret) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(secret),
    Buffer.from(recipient.encryptionIv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(recipient.encryptionAuthTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(recipient.encryptedOpenId, 'base64')),
    decipher.final()
  ]).toString('utf8')
}

function classifyError(error) {
  const rawCode = String(error && (error.errCode || error.code || '')).trim()
  const code = rawCode.toLowerCase()
  const message = String(error && error.errMsg || '').toLowerCase()
  if (rawCode === '40003' || message.includes('openid') || message.includes('open id')) return 'recipient_invalid'
  if (rawCode === '40037' || code.includes('template') || message.includes('template')) return 'template_invalid'
  if (rawCode === '43107' || message.includes('banned') || message.includes('ban')) return 'subscription_banned'
  if (rawCode === '43101' || code.includes('subscribe') || message.includes('subscribe') || message.includes('permission')) return 'authorization_unavailable'
  if (rawCode === '47003' || message.includes('parameter') || message.includes('format')) return 'template_field_invalid'
  if (code.includes('network') || code.includes('timeout') || code.includes('timedout') || message.includes('timeout') || message.includes('timed out') || message.includes('socket')) return 'network_error'
  return 'platform_error'
}

async function getItem(ownerKey, itemId) {
  const result = await db.collection('items').where({ ownerKey, id: itemId }).limit(1).get()
  return result.data[0] || null
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
    if (existing) await db.collection('notification_logs').doc(existing._id || id).update({ data })
    else await db.collection('notification_logs').doc(id).set({ data: { ...data, createdAt: now } })
  } catch (error) {
    console.error('[sendReminderNotifications] notification log failed', error.errCode || 'unknown')
  }
}

async function updateRecipient(recipient, data) {
  if (!recipient || !recipient._id) return
  await db.collection('notification_recipients').doc(recipient._id).update({ data })
}

async function claimJob(job, now) {
  const result = await db.collection('reminder_jobs')
    .where({ _id: job._id, status: 'ready' })
    .update({ data: { status: 'sending', sendingAt: now, updatedAt: now } })
  return Boolean(result && (result.stats ? result.stats.updated : result.updated))
}

async function claimRecipient(recipient, jobId, now) {
  const result = await db.collection('notification_recipients')
    .where({ _id: recipient._id, status: 'active' })
    .update({ data: { status: 'sending', sendingJobId: jobId, sendingAt: now, updatedAt: now } })
  return Boolean(result && (result.stats ? result.stats.updated : result.updated))
}

async function processJob(job, config, now) {
  if (!job || !job._id || !(await claimJob(job, now))) return 'duplicate'
  const item = await getItem(job.ownerKey, job.itemId)
  const settingsRes = await db.collection('reminder_settings').where({ ownerKey: job.ownerKey }).limit(1).get()
  const settings = settingsRes.data[0]
  const eligibility = getEligibility(item, settings, now, config.timeZone)
  if (!item || !settings || !eligibility.eligible || eligibility.activeExpiryDate !== job.activeExpiryDate) {
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'skipped', lastErrorCode: 'stale_job', updatedAt: now } })
    await writeLog(job._id, 'skipped', 'stale_job', job.retryCount, now)
    return 'skipped'
  }

  const recipientRes = await db.collection('notification_recipients').where({ ownerKey: job.ownerKey, status: 'active' }).limit(1).get()
  const recipient = recipientRes.data[0]
  if (!recipient) {
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'skipped', lastErrorCode: 'authorization_unavailable', updatedAt: now } })
    await writeLog(job._id, 'skipped', 'authorization_unavailable', job.retryCount, now)
    return 'skipped'
  }

  if (config.dryRun) return 'dry_run'

  if (!(await claimRecipient(recipient, job._id, now))) {
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'skipped', lastErrorCode: 'authorization_busy', updatedAt: now } })
    await writeLog(job._id, 'skipped', 'authorization_busy', job.retryCount, now)
    return 'skipped'
  }

  let openid
  try {
    openid = decrypt(recipient, process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY)
  } catch (_) {
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'failed', lastErrorCode: 'recipient_decrypt_failed', updatedAt: now } })
    await writeLog(job._id, 'failed', 'recipient_decrypt_failed', job.retryCount, now)
    await updateRecipient(recipient, {
      status: 'active',
      lastErrorCode: 'recipient_decrypt_failed',
      sendingJobId: null,
      sendingAt: null,
      updatedAt: now
    })
    return 'failed'
  }

  let sendError = null
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: config.templateId,
      page: 'pages/index/index',
      data: buildTemplateData(item, eligibility, config.fields),
      miniprogramState: config.miniprogramState
    })
  } catch (error) {
    sendError = error
  }

  if (!sendError) {
    // Consume the one-time grant before marking the job complete. If a
    // persistence call fails after the API accepted the message, leaving the
    // recipient in `sending` is safer than reopening it and sending twice.
    try {
      await updateRecipient(recipient, {
        status: 'consumed',
        consumedAt: now,
        lastSentAt: now,
        sendingJobId: null,
        sendingAt: null,
        lastErrorCode: null,
        updatedAt: now
      })
      await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'sent', updatedAt: now, lastErrorCode: null } })
      await writeLog(job._id, 'sent', null, job.retryCount, now)
      return 'sent'
    } catch (error) {
      console.error('[sendReminderNotifications] sent-state persistence failed', error && error.errCode || 'unknown')
      return 'failed'
    }
  }

  {
    const error = sendError
    const errorCode = classifyError(error)
    const retryable = errorCode === 'network_error' || errorCode === 'platform_error'
    const retryCount = Number(job.retryCount || 0) + 1
    const nextStatus = retryable && retryCount <= config.maxRetries ? 'ready' : (errorCode === 'authorization_unavailable' ? 'skipped' : 'failed')
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: nextStatus, retryCount, lastErrorCode: errorCode, updatedAt: now } })
    await writeLog(job._id, nextStatus, errorCode, retryCount, now)
    const recipientStatus = errorCode === 'authorization_unavailable'
      ? 'unavailable'
      : errorCode === 'subscription_banned'
        ? 'banned'
        : errorCode === 'recipient_invalid'
          ? 'disabled'
          : (nextStatus === 'ready' ? 'active' : 'active')
    await updateRecipient(recipient, {
      status: recipientStatus,
      lastErrorCode: errorCode,
      sendingJobId: null,
      sendingAt: null,
      updatedAt: now
    })
    return nextStatus
  }
}

async function getReadyJobs() {
  // Some local CloudBase debug runtimes have returned an empty result for a
  // direct equality query on a newly-created string field. Read the bounded
  // server-side page and filter in memory so the sender sees the same jobs as
  // the console while retaining the 100-job safety limit.
  const result = await db.collection('reminder_jobs').limit(100).get()
  const statusCounts = {}
  for (const job of result.data) {
    const status = job && job.status ? String(job.status) : 'missing'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  }
  return {
    jobs: result.data.filter((job) => job && job.status === 'ready'),
    total: result.data.length,
    statusCounts
  }
}

async function sendReadyJobs(event = {}) {
  const config = readConfig()
  const now = Date.now()
  if (!process.env.REMINDER_TEMPLATE_ID || !config.fields || !process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY) {
    return { success: false, dryRun: config.dryRun, errorCode: 'template_config_missing', counts: {} }
  }
  const jobSnapshot = await getReadyJobs()
  const jobs = jobSnapshot.jobs
  const counts = {
    sent: 0,
    skipped: 0,
    failed: 0,
    ready: 0,
    duplicate: 0,
    dryRun: 0,
    visibleJobs: jobSnapshot.total,
    statusCounts: jobSnapshot.statusCounts
  }
  if (config.dryRun) {
    counts.dryRun = jobs.length
    return { success: true, dryRun: true, counts }
  }
  for (const job of jobs) {
    const result = await processJob(job, config, now)
    if (counts[result] !== undefined) counts[result]++
  }
  return { success: true, dryRun: false, counts }
}

exports.main = async (event = {}) => {
  try {
    return await sendReadyJobs(event)
  } catch (error) {
    console.error('[sendReminderNotifications] send loop failed', error.errCode || 'unknown')
    return { success: false, dryRun: readConfig().dryRun, errorCode: 'send_loop_failed', counts: {} }
  }
}

exports.processJob = processJob
exports.classifyError = classifyError
