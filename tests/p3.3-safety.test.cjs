const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const root = path.resolve(__dirname, '..')

function loadInternals(relativePath, names, env = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const module = { exports: {} }
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database() { return {} }
  }
  const context = {
    Buffer,
    Date,
    Math,
    Number,
    Object,
    Set,
    String,
    Array,
    Error,
    console: { error() {} },
    crypto,
    module,
    exports: module.exports,
    process: { env: { ...env } },
    require(name) {
      if (name === 'wx-server-sdk') return cloud
      if (name === 'crypto') return crypto
      throw new Error(`Unexpected dependency: ${name}`)
    }
  }
  vm.runInNewContext(`${source}\nmodule.exports.__test__ = { ${names.join(', ')} }`, context, { filename: relativePath })
  return { internals: module.exports.__test__, env: context.process.env }
}

const audit = loadInternals('cloudfunctions/auditCloudFiles/index.js', ['readRetentionDays', 'collectCloudFileIds'], {
  CLOUD_FILE_RETENTION_DAYS: '7'
})
assert.strictEqual(audit.internals.readRetentionDays(), 7)
audit.env.CLOUD_FILE_RETENTION_DAYS = '30'
assert.throws(() => audit.internals.readRetentionDays(), /retention_config_invalid/)
const nestedReferences = audit.internals.collectCloudFileIds({
  nested: { displayImageCloudFileId: 'cloud://test/display.png' },
  files: [{ originalCloudFileId: 'cloud://test/original.jpg' }]
})
assert.deepStrictEqual([...nestedReferences].sort(), ['cloud://test/display.png', 'cloud://test/original.jpg'])

const cleanup = loadInternals('cloudfunctions/cleanupCloudFiles/index.js', ['deletionEnabled', 'retentionCutoff', 'isAuditRunId'], {
  CLEANUP_DRY_RUN: 'true',
  CLEANUP_DELETE_ENABLED: 'false',
  CLOUD_FILE_RETENTION_DAYS: '7'
})
assert.strictEqual(cleanup.internals.deletionEnabled(), false)
cleanup.env.CLEANUP_DRY_RUN = 'false'
assert.strictEqual(cleanup.internals.deletionEnabled(), false)
cleanup.env.CLEANUP_DELETE_ENABLED = 'true'
assert.strictEqual(cleanup.internals.deletionEnabled(), true)
assert.strictEqual(cleanup.internals.deletionEnabled(true), false)
cleanup.env.CLEANUP_AUTO_DELETE_ENABLED = 'true'
assert.strictEqual(cleanup.internals.deletionEnabled(true), true)
assert.strictEqual(cleanup.internals.retentionCutoff().days, 7)
assert.strictEqual(cleanup.internals.isAuditRunId('snapshot_manual'), true)
assert.strictEqual(cleanup.internals.isAuditRunId('auto_weekly'), true)
assert.strictEqual(cleanup.internals.isAuditRunId('unexpected'), false)
cleanup.env.CLOUD_FILE_RETENTION_DAYS = '6'
assert.throws(() => cleanup.internals.retentionCutoff(), /retention_config_invalid/)

const purge = loadInternals('cloudfunctions/purgeDeletedData/index.js', ['recordPurgeEnabled', 'itemCandidateReason'], {
  RECORD_PURGE_DRY_RUN: 'true',
  RECORD_PURGE_DELETE_ENABLED: 'false'
})
assert.strictEqual(purge.internals.recordPurgeEnabled(), false)
purge.env.RECORD_PURGE_DRY_RUN = 'false'
purge.env.RECORD_PURGE_DELETE_ENABLED = 'true'
assert.strictEqual(purge.internals.recordPurgeEnabled(), true)
assert.strictEqual(purge.internals.recordPurgeEnabled(true), false)
purge.env.RECORD_PURGE_AUTO_DELETE_ENABLED = 'true'
assert.strictEqual(purge.internals.recordPurgeEnabled(true), true)
const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
const deletedItem = { id: 'item-1', ownerKey: 'server-only-key', status: 'deleted', deletedAt: cutoff }
assert.strictEqual(purge.internals.itemCandidateReason(deletedItem, [], [], cutoff), null)
assert.strictEqual(purge.internals.itemCandidateReason(deletedItem, [{ itemId: 'item-1', status: 'cutting' }], [], cutoff), 'image_job_active')
assert.strictEqual(purge.internals.itemCandidateReason(deletedItem, [], [{ itemId: 'item-1', status: 'sending' }], cutoff), 'reminder_job_sending')

const syncSource = fs.readFileSync(path.join(root, 'cloudfunctions/syncData/index.js'), 'utf8')
assert.match(syncSource, /action === 'pullTombstones'/)
assert.match(syncSource, /getSyncTombstoneId\(ownerKey, collection, recordId\)/)
assert.match(syncSource, /doc\.status === 'deleted'/)
assert.match(syncSource, /doc\.isDeleted === true/)

const purgeSource = fs.readFileSync(path.join(root, 'cloudfunctions/purgeDeletedData/index.js'), 'utf8')
assert.doesNotMatch(purgeSource, /getAll\('drafts'\)/)
assert.doesNotMatch(purgeSource, /type === 'draft'/)

const auditSource = fs.readFileSync(path.join(root, 'cloudfunctions/auditCloudFiles/index.js'), 'utf8')
assert.match(auditSource, /for \(const draft of drafts\) \{\s*collectCloudFileIds\(draft, references\)/)
assert.match(auditSource, /getAll\('cloud_file_registry'\)/)
assert.match(auditSource, /CLEANUP_AUTO_AUDIT_ENABLED/)

const registerSource = fs.readFileSync(path.join(root, 'cloudfunctions/registerCloudFile/index.js'), 'utf8')
assert.match(registerSource, /cloud_file_registry/)
assert.match(registerSource, /ALLOWED_PREFIXES/)
assert.match(registerSource, /fileId\.includes/)

for (const relativePath of [
  'cloudfunctions/auditCloudFiles/config.json',
  'cloudfunctions/cleanupCloudFiles/config.json',
  'cloudfunctions/purgeDeletedData/config.json'
]) {
  const config = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
  assert.strictEqual(config.triggers.length, 1)
  assert.strictEqual(config.triggers[0].type, 'timer')
  assert.match(config.triggers[0].config, /^0 (0|20|40) 2 \* \* 0 \*$/)
}

console.log('P3.3 safety assertions passed')
