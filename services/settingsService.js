import { localRepository } from '../repositories/localRepository.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';
import { normalizeTimestamp } from '../utils/dateUtils.js';

const SETTINGS_KEY = STORAGE_KEYS.USER_SETTINGS;

const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  inAppEnabled: true,
  remindDayOptions: [0, 1, 3, 7, 30],
  defaultRemindDays: 7,
  remindTime: '10:00',
  subscriptionIntent: false,
  subscriptionLastResult: 'unknown',
  subscriptionLastRequestedAt: null,
  subscriptionLastErrorCode: null
};

function isUnmodifiedReminderSettings(settings) {
  if (settings.enabled !== DEFAULT_REMINDER_SETTINGS.enabled) return false;
  if (settings.inAppEnabled !== DEFAULT_REMINDER_SETTINGS.inAppEnabled) return false;
  if (settings.defaultRemindDays !== DEFAULT_REMINDER_SETTINGS.defaultRemindDays) return false;
  if (settings.remindTime !== DEFAULT_REMINDER_SETTINGS.remindTime) return false;
  if (settings.subscriptionIntent !== DEFAULT_REMINDER_SETTINGS.subscriptionIntent) return false;
  if (settings.subscriptionLastResult !== DEFAULT_REMINDER_SETTINGS.subscriptionLastResult) return false;
  if (settings.subscriptionLastRequestedAt !== DEFAULT_REMINDER_SETTINGS.subscriptionLastRequestedAt) return false;
  if (settings.subscriptionLastErrorCode !== DEFAULT_REMINDER_SETTINGS.subscriptionLastErrorCode) return false;
  if (!Array.isArray(settings.remindDayOptions) || settings.remindDayOptions.length !== 5) return false;
  for (let i = 0; i < 5; i++) {
    if (settings.remindDayOptions[i] !== DEFAULT_REMINDER_SETTINGS.remindDayOptions[i]) return false;
  }
  return true;
}

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
      
      const isCustomized = (oldDefaultDays !== '' && oldDefaultDays !== 7) || 
                           (oldCustomDays && JSON.stringify(oldCustomDays) !== JSON.stringify([0,1,3,7,30])) ||
                           (oldDefaultTime && oldDefaultTime !== '10:00');
                           
      settings = {
        enabled: true,
        inAppEnabled: true,
        remindDayOptions: oldCustomDays || [...DEFAULT_REMINDER_SETTINGS.remindDayOptions],
        defaultRemindDays: oldDefaultDays !== '' ? Number(oldDefaultDays) : DEFAULT_REMINDER_SETTINGS.defaultRemindDays,
        remindTime: oldDefaultTime || DEFAULT_REMINDER_SETTINGS.remindTime,
        subscriptionIntent: DEFAULT_REMINDER_SETTINGS.subscriptionIntent,
        subscriptionLastResult: DEFAULT_REMINDER_SETTINGS.subscriptionLastResult,
        subscriptionLastRequestedAt: DEFAULT_REMINDER_SETTINGS.subscriptionLastRequestedAt,
        subscriptionLastErrorCode: DEFAULT_REMINDER_SETTINGS.subscriptionLastErrorCode,
        syncStatus: isCustomized ? 'pending' : 'synced',
        lastSyncedAt: null,
        syncError: '',
        createdAt: isCustomized ? Date.now() : 0,
        updatedAt: isCustomized ? Date.now() : 0
      };
      
      localRepository.set(SETTINGS_KEY, settings);
    } else {
      let migrated = false;
      if (settings.remindDayOptions === undefined) {
        settings.remindDayOptions = settings.customReminderDays || [...DEFAULT_REMINDER_SETTINGS.remindDayOptions];
        migrated = true;
      }
      if (settings.defaultRemindDays === undefined) {
        settings.defaultRemindDays = settings.defaultReminderDays !== undefined ? settings.defaultReminderDays : DEFAULT_REMINDER_SETTINGS.defaultRemindDays;
        migrated = true;
      }
      if (settings.remindTime === undefined) {
        settings.remindTime = settings.defaultReminderTime || DEFAULT_REMINDER_SETTINGS.remindTime;
        migrated = true;
      }
      if (settings.enabled === undefined) {
        settings.enabled = true;
        settings.inAppEnabled = true;
        migrated = true;
      }
      if (settings.subscriptionIntent === undefined) {
        settings.subscriptionIntent = DEFAULT_REMINDER_SETTINGS.subscriptionIntent;
        migrated = true;
      }
      if (settings.subscriptionLastResult === undefined) {
        settings.subscriptionLastResult = DEFAULT_REMINDER_SETTINGS.subscriptionLastResult;
        migrated = true;
      }
      if (settings.subscriptionLastRequestedAt === undefined) {
        settings.subscriptionLastRequestedAt = DEFAULT_REMINDER_SETTINGS.subscriptionLastRequestedAt;
        migrated = true;
      }
      if (settings.subscriptionLastErrorCode === undefined) {
        settings.subscriptionLastErrorCode = DEFAULT_REMINDER_SETTINGS.subscriptionLastErrorCode;
        migrated = true;
      }
      if (settings.syncStatus === undefined) {
        settings.syncStatus = 'pending';
        settings.lastSyncedAt = null;
        settings.syncError = '';
        migrated = true;
      }
      
      const origCreatedAt = settings.createdAt;
      const origUpdatedAt = settings.updatedAt;
      settings.createdAt = normalizeTimestamp(settings.createdAt, Date.now());
      settings.updatedAt = normalizeTimestamp(settings.updatedAt, Date.now());
      if (origCreatedAt !== settings.createdAt || origUpdatedAt !== settings.updatedAt) {
        migrated = true;
      }

      // 如果没有任何修改，则退化为种子数据 (0 时间戳，synced 状态)
      if (isUnmodifiedReminderSettings(settings) && settings.updatedAt !== 0) {
        settings.createdAt = 0;
        settings.updatedAt = 0;
        settings.syncStatus = 'synced'; // 防止上传覆盖云端
        migrated = true;
      }

      if (migrated) {
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
    this.init();
    // 禁止覆盖 createdAt
    const { createdAt, ...rest } = newSettings;
    
    this.settings = { 
      ...this.settings, 
      ...rest,
      syncStatus: 'pending',
      updatedAt: Date.now() 
    };
    return localRepository.set(SETTINGS_KEY, this.settings);
  }

  applySyncResult(syncedSettings, status = 'synced', lastSyncedAt = Date.now()) {
    this.init();
    this.settings = { 
      ...this.settings, 
      ...syncedSettings, 
      syncStatus: status,
      lastSyncedAt
    };
    localRepository.set(SETTINGS_KEY, this.settings);
  }
}

export const settingsService = new SettingsService();
