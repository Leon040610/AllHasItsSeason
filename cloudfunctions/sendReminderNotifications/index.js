'use strict'

const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const { getEligibility, readConfig, buildTemplateData, isValidTemplateData } = require('./reminderUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function encryptionKey(secret) {
  return crypto.createHash('sha256').update(secret).digest()
}

function decrypt(recipient, secret) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(secret), Buffer.from(recipient.encryptionIv, 'base64'))
  decipher.setAuthTag(Buffer.from(recipient.encryptionAuthTag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(recipient.encryptedOpenId, 'base64')), decipher.final()]).toString('utf8')
}

function platformCode(error) {
  const value = error && (error.errCode || error.code || error.errcode || (error.result && error.result.errcode))
  const code = String(value || '').trim()
  return /^-?\d{3,6}$/.test(code) ? code : null
}

function classifyError(error) {
  const code = platformCode(error)
  const message = String(error && (error.errMsg || error.message) || '').toLowerCase()
  if (code === '-604101' || (message.includes('openapi') && message.includes('permission'))) {
    return 'cloud_api_permission_missing'
  }
  if (code === '-501007') return 'cloud_parameter_invalid'
  if (code === '40003' || message.includes('openid') || message.includes('open id')) return 'recipient_invalid'
  if (code === '40037' || message.includes('template')) return 'template_invalid'
  if (code === '43107' || message.includes('banned') || message.includes('ban')) return 'subscription_banned'
  if (code === '43101' || message.includes('not subscribed') || message.includes('subscription unavailable')) return 'authorization_unavailable'
  if (code === '47003' || message.includes('parameter') || message.includes('format')) return 'template_field_invalid'
  if (message.includes('network') || message.includes('timeout') || message.includes('socket')) return 'network_error'
  return 'platform_error'
}

async function writeLog(job, status, errorCode, retryCount, now, errorCodeFromPlatform = null) {
  const data = {
    jobId: job.id,
    itemId: job.itemId || null,
    grantId: job.grantId || null,
    status,
    sentAt: status === 'sent' ? now : null,
    errorCode: errorCode || null,
    platformErrorCode: errorCodeFromPlatform,
    retryCount: retryCount || 0,
    templateVersion: 'configured',
    updatedAt: now
  }
  try {
    const existing = await db.collection('notification_logs').where({ jobId: job.id }).limit(1).get()
    if (existing.data[0]) await db.collection('notification_logs').doc(existing.data[0]._id).update({ data })
    else await db.collection('notification_logs').doc(`notification_${job.id}`).set({ data: { ...data, createdAt: now } })
  } catch (error) {
    console.error('[sendReminderNotifications] notification log failed', error.errCode || 'unknown')
  }
}

async function claimJob(job, now) {
  const result = await db.collection('reminder_jobs').where({ _id: job._id, status: 'ready' }).update({
    data: { status: 'sending', sendingAt: now, updatedAt: now }
  })
  return Boolean(result && (result.stats ? result.stats.updated : result.updated))
}

async function claimGrant(grant, jobId, now) {
  const result = await db.collection('notification_grants').where({ _id: grant._id, status: 'available' }).update({
    data: { status: 'sending', sendingJobId: jobId, sendingAt: now, updatedAt: now }
  })
  return Boolean(result && (result.stats ? result.stats.updated : result.updated))
}

async function findOne(collection, where) {
  const result = await db.collection(collection).where(where).limit(1).get()
  return result.data[0] || null
}

async function skipJob(job, errorCode, now) {
  await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'skipped', lastErrorCode: errorCode, updatedAt: now } })
  await writeLog(job, 'skipped', errorCode, job.retryCount, now)
  return 'skipped'
}

async function processJob(job, config, now) {
  if (!job || !job._id || !(await claimJob(job, now))) return 'duplicate'
  const item = await findOne('items', { ownerKey: job.ownerKey, id: job.itemId })
  const settings = await findOne('reminder_settings', { ownerKey: job.ownerKey })
  const eligibility = getEligibility(item, settings, now, config.timeZone)
  if (!item || !settings || !eligibility.eligible || eligibility.activeExpiryDate !== job.activeExpiryDate) {
    return skipJob(job, 'stale_job', now)
  }

  const grant = await findOne('notification_grants', { ownerKey: job.ownerKey, id: job.grantId })
  if (!grant || grant.status !== 'available' || grant.itemId !== job.itemId || grant.activeExpiryDate !== job.activeExpiryDate || grant.reminderKind !== job.reminderKind) {
    return skipJob(job, 'authorization_unavailable', now)
  }
  const recipient = await findOne('notification_recipients', { ownerKey: job.ownerKey, status: 'active' })
  if (!recipient) return skipJob(job, 'recipient_unavailable', now)
  if (config.dryRun) return 'dryRun'
  const templateData = buildTemplateData(item, eligibility, config.fields)
  if (!isValidTemplateData(templateData, config.fields)) {
    await db.collection('reminder_jobs').doc(job._id).update({
      data: { status: 'failed', lastErrorCode: 'template_payload_invalid', updatedAt: now }
    })
    await writeLog(job, 'failed', 'template_payload_invalid', job.retryCount, now)
    return 'failed'
  }
  if (!(await claimGrant(grant, job.id, now))) return skipJob(job, 'authorization_busy', now)

  let openid
  try {
    openid = decrypt(recipient, process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY)
  } catch (_) {
    await db.collection('notification_grants').doc(grant._id).update({
      data: { status: 'failed', lastErrorCode: 'recipient_decrypt_failed', sendingJobId: null, sendingAt: null, updatedAt: now }
    })
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'failed', lastErrorCode: 'recipient_decrypt_failed', updatedAt: now } })
    await writeLog(job, 'failed', 'recipient_decrypt_failed', job.retryCount, now)
    return 'failed'
  }

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: config.templateId,
      page: 'pages/index/index',
      data: templateData,
      miniprogramState: config.miniprogramState
    })
    await db.collection('notification_grants').doc(grant._id).update({
      data: { status: 'consumed', consumedAt: now, lastErrorCode: null, sendingJobId: null, sendingAt: null, updatedAt: now }
    })
    await db.collection('reminder_jobs').doc(job._id).update({ data: { status: 'sent', lastErrorCode: null, updatedAt: now } })
    await writeLog(job, 'sent', null, job.retryCount, now)
    return 'sent'
  } catch (error) {
    const errorCode = classifyError(error)
    const errorCodeFromPlatform = platformCode(error)
    const retryCount = Number(job.retryCount || 0) + 1
    const retryable = errorCode === 'network_error' || errorCode === 'platform_error'
    const retry = retryable && retryCount <= config.maxRetries
    const jobStatus = retry ? 'ready' : (errorCode === 'authorization_unavailable' ? 'skipped' : 'failed')
    const grantStatus = retry || errorCode === 'cloud_api_permission_missing' || errorCode === 'cloud_parameter_invalid'
      ? 'available'
      : (errorCode === 'authorization_unavailable' ? 'unavailable' : 'failed')
    await db.collection('notification_grants').doc(grant._id).update({
      data: { status: grantStatus, retryCount, lastErrorCode: errorCode, sendingJobId: null, sendingAt: null, updatedAt: now }
    })
    await db.collection('reminder_jobs').doc(job._id).update({
      data: { status: jobStatus, retryCount, lastErrorCode: errorCode, lastPlatformErrorCode: errorCodeFromPlatform, updatedAt: now }
    })
    await writeLog(job, jobStatus, errorCode, retryCount, now, errorCodeFromPlatform)
    if (errorCode === 'recipient_invalid' || errorCode === 'subscription_banned') {
      await db.collection('notification_recipients').doc(recipient._id).update({
        data: { status: errorCode === 'recipient_invalid' ? 'disabled' : 'banned', lastErrorCode: errorCode, updatedAt: now }
      })
    }
    return jobStatus
  }
}

async function getReadyJobs() {
  const result = await db.collection('reminder_jobs').limit(100).get()
  const statusCounts = {}
  for (const job of result.data) {
    const status = job && job.status ? String(job.status) : 'missing'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  }
  return { jobs: result.data.filter((job) => job && job.status === 'ready'), total: result.data.length, statusCounts }
}

exports.main = async () => {
  const config = readConfig()
  if (!process.env.REMINDER_TEMPLATE_ID || !config.fields || !process.env.REMINDER_RECIPIENT_ENCRYPTION_KEY) {
    return { success: false, dryRun: config.dryRun, errorCode: 'template_config_missing', counts: {} }
  }
  const snapshot = await getReadyJobs()
  const counts = { sent: 0, skipped: 0, failed: 0, ready: 0, duplicate: 0, dryRun: 0, visibleJobs: snapshot.total, statusCounts: snapshot.statusCounts }
  if (config.dryRun) {
    counts.dryRun = snapshot.jobs.length
    return { success: true, dryRun: true, counts }
  }
  const now = Date.now()
  try {
    for (const job of snapshot.jobs) {
      const result = await processJob(job, config, now)
      if (counts[result] !== undefined) counts[result]++
    }
    return { success: true, dryRun: false, counts }
  } catch (error) {
    console.error('[sendReminderNotifications] send loop failed', error.errCode || 'unknown')
    return { success: false, dryRun: false, errorCode: 'send_loop_failed', counts }
  }
}

exports.processJob = processJob
exports.classifyError = classifyError
exports.safePlatformErrorCode = platformCode
