import { storageScopeService } from '../utils/storageScopeService.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';

const DATA_CHANGE_KEYS = new Set([
  STORAGE_KEYS.ITEMS,
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.USER_SETTINGS,
  STORAGE_KEYS.DRAFTS
]);

function notifyDataChanged(key) {
  if (!DATA_CHANGE_KEYS.has(key) || typeof uni === 'undefined' || !uni.$emit) return;
  uni.$emit('localDataChanged', { key });
}

// Wrapper around uni.getStorageSync / uni.setStorageSync
export const localRepository = {
  get(key) {
    try {
      const scopedKey = storageScopeService.getScopedKey(key);
      const data = uni.getStorageSync(scopedKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading local storage for key ${key}`, e);
      return null;
    }
  },
  
  set(key, value) {
    try {
      const scopedKey = storageScopeService.getScopedKey(key);
      uni.setStorageSync(scopedKey, JSON.stringify(value));
      notifyDataChanged(key);
      return true;
    } catch (e) {
      console.error(`Error writing local storage for key ${key}`, e);
      return false;
    }
  },
  
  remove(key) {
    try {
      const scopedKey = storageScopeService.getScopedKey(key);
      uni.removeStorageSync(scopedKey);
      return true;
    } catch (e) {
      console.error(`Error removing local storage for key ${key}`, e);
      return false;
    }
  }
};
