'use strict'

const crypto = require('crypto')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  return Number.isFinite(Date.parse(value + 'T00:00:00+08:00'))
}

function localParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(now)).reduce((out, part) => {
    if (part.type !== 'literal') out[part.type] = part.value
    return out
  }, {})
  const hour = parts.hour === '24' ? '00' : parts.hour
  return { date: parts.year + '-' + parts.month + '-' + parts.day, time: hour + ':' + parts.minute }
}

function daysBetween(expiryDate, today) {
  const expiry = Date.parse(expiryDate + 'T00:00:00+08:00')
  const base = Date.parse(today + 'T00:00:00+08:00')
  if (!Number.isFinite(expiry) || !Number.isFinite(base)) return null
  return Math.round((expiry - base) / 86400000)
}

function determineActiveExpiry(item) {
  if (!item || item.status === 'done' || item.status === 'deleted') return { date: null, source: null }
  const normal = isValidDate(item.expiryDate) ? item.expiryDate : ''
  const opened = isValidDate(item.openedExpiryDate) ? item.openedExpiryDate : ''
  if (item.expiryMode === 'after_opening') return item.openDate && opened ? { date: opened, source: 'opened' } : { date: null, source: null }
  if (item.expiryMode === 'dual' && item.status === 'using' && item.openDate) {
    if (!normal) return opened ? { date: opened, source: 'opened' } : { date: null, source: null }
    if (!opened) return { date: normal, source: 'unopened' }
    return Date.parse(opened + 'T00:00:00+08:00') < Date.parse(normal + 'T00:00:00+08:00')
      ? { date: opened, source: 'opened' } : { date: normal, source: 'unopened' }
  }
  return normal ? { date: normal, source: item.expiryMode === 'dual' ? 'unopened' : 'normal' } : { date: null, source: null }
}

function getEligibility(item, settings, now, timeZone) {
  if (!item || !settings || settings.enabled !== true || settings.subscriptionIntent !== true) return { eligible: false, reason: 'preference_disabled' }
  if (item.status !== 'pending' && item.status !== 'using') return { eligible: false, reason: 'item_status' }
  if (!Number.isInteger(item.remindDays) || item.remindDays <= 0) return { eligible: false, reason: 'remind_days' }
  const active = determineActiveExpiry(item)
  if (!active.date) return { eligible: false, reason: 'no_active_expiry' }
  const local = localParts(now, timeZone)
  const daysLeft = daysBetween(active.date, local.date)
  if (daysLeft === null) return { eligible: false, reason: 'invalid_expiry' }
  if (daysLeft < 0) return { eligible: false, reason: 'expired', activeExpiryDate: active.date, daysLeft }
  if (daysLeft > item.remindDays) return { eligible: false, reason: 'outside_window', activeExpiryDate: active.date, daysLeft }
  return { eligible: true, activeExpiryDate: active.date, activeExpirySource: active.source, daysLeft, remindDays: item.remindDays }
}

function createDedupeKey(ownerKey, itemId, activeExpiryDate, reminderKind) {
  return crypto.createHash('sha256').update(ownerKey + '|' + itemId + '|' + activeExpiryDate + '|' + reminderKind).digest('hex')
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).toLowerCase() === 'true'
}

function readConfig() {
  let fields = null
  try { fields = process.env.REMINDER_TEMPLATE_FIELDS ? JSON.parse(process.env.REMINDER_TEMPLATE_FIELDS) : null } catch (_) { fields = null }
  const required = ['itemName', 'productionDate', 'daysLeft', 'expiryDate', 'note']
  const fieldsValid = fields && required.every((key) => {
    const value = typeof fields[key] === 'string' ? fields[key] : fields[key] && fields[key].field
    return typeof value === 'string' && /^[a-z]+\d+$/.test(value)
  })
  const retryValue = Number(process.env.REMINDER_MAX_RETRIES || 2)
  return {
    dryRun: parseBool(process.env.REMINDER_DRY_RUN, true),
    templateId: typeof process.env.REMINDER_TEMPLATE_ID === 'string' ? process.env.REMINDER_TEMPLATE_ID.trim() : '',
    fields: fieldsValid ? fields : null,
    timeZone: process.env.REMINDER_TIMEZONE || 'Asia/Shanghai',
    maxRetries: Number.isFinite(retryValue) ? Math.max(0, Math.min(3, retryValue)) : 2,
    miniprogramState: ['formal', 'trial', 'developer'].includes(process.env.REMINDER_MINIPROGRAM_STATE)
      ? process.env.REMINDER_MINIPROGRAM_STATE
      : (process.env.NODE_ENV === 'production' ? 'formal' : 'trial')
  }
}

function fieldName(value) { return typeof value === 'string' ? value : value && value.field }
function textValue(value, maxLength) { return String(value === undefined || value === null ? '-' : value).trim().substring(0, maxLength || 20) || '-' }

function fieldType(value) {
  const name = fieldName(value) || ''
  const match = name.match(/^[a-z]+/)
  return match ? match[0] : 'thing'
}

function formatCalendarDate(value) {
  const text = String(value === undefined || value === null ? '' : value).trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+.*)?$/)
  return match ? `${match[1]}年${match[2]}月${match[3]}日` : text
}

function formatTemplateValue(value, field, fallbackLength) {
  const type = fieldType(field)
  if (type === 'number') return String(value === undefined || value === null ? 0 : value)
  if (type === 'date') return textValue(formatCalendarDate(value), 20)
  if (type === 'time') {
    const date = String(value === undefined || value === null ? '' : value).trim()
    const time = date.match(/\s+(\d{1,2}:\d{2})$/)
    return `${formatCalendarDate(date)} ${time ? time[1] : '00:00'}`
  }
  return textValue(value, fallbackLength || 20)
}

function buildTemplateData(item, eligibility, fields) {
  const values = {
    itemName: formatTemplateValue(item.name, fields.itemName, 20),
    productionDate: formatTemplateValue(item.productionDate, fields.productionDate, 20),
    daysLeft: formatTemplateValue(eligibility.daysLeft, fields.daysLeft, 10),
    expiryDate: formatTemplateValue(eligibility.activeExpiryDate, fields.expiryDate, 20),
    note: formatTemplateValue(item.notes || 'Please check', fields.note, 20)
  }
  return Object.keys(values).reduce((data, key) => {
    data[fieldName(fields[key])] = { value: values[key] }
    return data
  }, {})
}

module.exports = { isValidDate, localParts, determineActiveExpiry, getEligibility, createDedupeKey, readConfig, buildTemplateData, fieldType, formatTemplateValue, formatCalendarDate }
