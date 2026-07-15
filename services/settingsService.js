import { localRepository } from '../repositories/localRepository.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';

const SETTINGS_KEY = STORAGE_KEYS.USER_SETTINGS;

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
        syncStatus: 'pending',
        lastSyncedAt: null,
        syncError: '',
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
      if (settings.syncStatus === undefined) {
        settings.syncStatus = 'pending';
        settings.lastSyncedAt = null;
        settings.syncError = '';
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

  getSettingsForSync() {
    if (!this.settings) this.init();
    return this.settings;
  }

  hasPendingSettings() {
    if (!this.settings) this.init();
    return this.settings.syncStatus === 'pending' || this.settings.syncStatus === 'failed';
  }

  updateSettings(newSettings) {
    this.settings = { 
      ...this.settings, 
      ...newSettings, 
      syncStatus: 'pending',
      updatedAt: Date.now() 
    };
    return localRepository.set(SETTINGS_KEY, this.settings);
  }
}

export const settingsService = new SettingsService();
