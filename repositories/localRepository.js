import { storageScopeService } from '../utils/storageScopeService.js';

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
