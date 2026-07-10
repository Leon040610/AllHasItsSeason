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
        enabled: true,
        inAppEnabled: true,
        remindDayOptions: oldCustomDays || [0, 1, 3, 7, 30],
        defaultRemindDays: oldDefaultDays !== '' ? Number(oldDefaultDays) : 7,
        remindTime: oldDefaultTime || '10:00',
        updatedAt: Date.now()
      };
      
      localRepository.set(SETTINGS_KEY, settings);
    } else {
      // Ensure existing settings have new keys if they were created with old schema
      let migrated = false;
      if (settings.remindDayOptions === undefined) {
        settings.remindDayOptions = settings.customReminderDays || [0, 1, 3, 7, 30];
        migrated = true;
      }
      if (settings.defaultRemindDays === undefined) {
        settings.defaultRemindDays = settings.defaultReminderDays !== undefined ? settings.defaultReminderDays : 7;
        migrated = true;
      }
      if (settings.remindTime === undefined) {
        settings.remindTime = settings.defaultReminderTime || '10:00';
        migrated = true;
      }
      if (settings.enabled === undefined) {
        settings.enabled = true;
        settings.inAppEnabled = true;
        migrated = true;
      }
      if (migrated) {
        settings.updatedAt = Date.now();
        localRepository.set(SETTINGS_KEY, settings);
      }
    }
    this.settings = settings;
  }

  getSettings() {
    if (!this.settings) this.init();
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings, updatedAt: Date.now() };
    return localRepository.set(SETTINGS_KEY, this.settings);
  }
}

export const settingsService = new SettingsService();
