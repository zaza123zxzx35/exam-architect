import { BACKUP_PREFIX, UNIFIED_KEY } from './constants.js'

/**
 * @param {Storage} storage
 * @param {string} [label]
 * @returns {{ key: string, written: boolean }}
 */
export function backupUnifiedStore(storage, label = 'pre-migrate') {
  const current = storage.getItem(UNIFIED_KEY)
  if (current == null) {
    return { key: '', written: false }
  }
  const key = `${BACKUP_PREFIX}${label}_${Date.now()}`
  storage.setItem(key, current)
  return { key, written: true }
}

/**
 * Snapshot selected legacy keys before first unified write.
 * @param {Storage} storage
 * @param {string[]} keys
 */
export function backupLegacyKeys(storage, keys) {
  const snapshot = {}
  for (const key of keys) {
    const value = storage.getItem(key)
    if (value != null) snapshot[key] = value
  }
  if (Object.keys(snapshot).length === 0) {
    return { key: '', written: false, count: 0 }
  }
  const key = `${BACKUP_PREFIX}legacy_${Date.now()}`
  storage.setItem(key, JSON.stringify({ at: new Date().toISOString(), snapshot }))
  return { key, written: true, count: Object.keys(snapshot).length }
}

/**
 * @param {Storage} storage
 * @param {string} backupKey
 * @returns {boolean}
 */
export function restoreUnifiedFromBackup(storage, backupKey) {
  if (!backupKey.startsWith(BACKUP_PREFIX)) return false
  const raw = storage.getItem(backupKey)
  if (raw == null) return false
  storage.setItem(UNIFIED_KEY, raw)
  return true
}

/**
 * @param {Storage} storage
 * @returns {string[]}
 */
export function listBackupKeys(storage) {
  const keys = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key && key.startsWith(BACKUP_PREFIX)) keys.push(key)
  }
  return keys.sort()
}
