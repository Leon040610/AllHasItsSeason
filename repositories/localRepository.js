// Wrapper around uni.getStorageSync / uni.setStorageSync
export const localRepository = {
  get(key) {
    try {
      const data = uni.getStorageSync(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading local storage for key ${key}`, e);
      return null;
    }
  },
  
  set(key, value) {
    try {
      uni.setStorageSync(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing local storage for key ${key}`, e);
      return false;
    }
  },
  
  remove(key) {
    try {
      uni.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error(`Error removing local storage for key ${key}`, e);
      return false;
    }
  }
};
