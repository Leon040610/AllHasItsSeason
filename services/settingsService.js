import { localRepository } from '../repositories/localRepository.js';

const SETTINGS_KEY = 'allhas_user_settings_v1';

class SettingsService {
  constructor() {
    this.settings = null;
    this.init();
  }

  init() {
    let settings = localRepository.get(SETTINGS_KEY);
    
    // Migration from old keys
    if (!settings) {
      const oldDefaultDays = uni.getStorageSync('defaultReminderDays');
      const oldCustomDays = uni.getStorageSync('customReminderDays');
      const oldDefaultTime = uni.getStorageSync('defaultReminderTime');
      
      settings = {
        defaultReminderDays: oldDefaultDays !== '' ? oldDefaultDays : 7,
        customReminderDays: oldCustomDays || [0, 3, 7, 14, 30],
        defaultReminderTime: oldDefaultTime || '10:00',
        nickname: '独居探索家',
        avatar: ''
      };
      
      localRepository.set(SETTINGS_KEY, settings);
    }
    this.settings = settings;
  }

  getSettings() {
    if (!this.settings) this.init();
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return localRepository.set(SETTINGS_KEY, this.settings);
  }
}

export const settingsService = new SettingsService();
