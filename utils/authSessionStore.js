import { STORAGE_KEYS } from './storageKeys.js'

function getDefaultSession() {
  return {
    isLoggedIn: false,
    uid: ''
  }
}

/**
 * Read the device-level session without importing AuthService. Keeping this
 * module dependency-free prevents the sync and authentication services from
 * forming a runtime cycle in the Mini Program bundle.
 */
export function getStoredSession() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEYS.USER)
    if (!raw) return getDefaultSession()

    const stored = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (stored && stored.isLoggedIn === true && typeof stored.uid === 'string' && stored.uid) {
      return {
        isLoggedIn: true,
        uid: stored.uid
      }
    }
  } catch (e) {
    console.warn('[AuthSessionStore] Failed to read stored session')
  }

  return getDefaultSession()
}

export function isStoredLoggedIn() {
  return getStoredSession().isLoggedIn
}
