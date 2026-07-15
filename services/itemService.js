import { localRepository } from '../repositories/localRepository.js';
import { createItem } from '../models/ItemModel.js';
import { DataConverter } from '../models/DataConverter.js';
import { generateUUID } from '../utils/uuid.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';

const ITEMS_KEY = STORAGE_KEYS.ITEMS;

class ItemService {
  constructor() {
    this.items = [];
    this.initialized = false;
  }

  init() {
    const storedItems = localRepository.get(ITEMS_KEY);
    if (storedItems) {
      let migrated = false;
      this.items = storedItems.map(item => {
        let changed = false;
        const mapped = { ...item };
        
        if (!mapped.expiryMode) {
          changed = true;
          mapped.expiryMode = 'normal';
          mapped.openDate = '';
          mapped.afterOpeningShelfLifeValue = 0;
          mapped.afterOpeningShelfLifeUnit = 'month';
          mapped.openedExpiryDate = '';
          mapped.activeExpiryDate = mapped.expiryDate || null;
          mapped.activeExpirySource = 'normal';
        }
        if (!mapped.syncStatus) {
          changed = true;
          mapped.syncStatus = 'pending';
          mapped.lastSyncedAt = null;
          mapped.syncError = '';
        }
        if (!mapped.createdAt) {
          changed = true;
          mapped.createdAt = Date.now();
        }
        if (!mapped.updatedAt) {
          changed = true;
          mapped.updatedAt = Date.now();
        }
        
        if (changed) migrated = true;
        return mapped;
      });
      if (migrated) {
        this._save();
      }
    } else {
      this.items = [];
    }
    this.initialized = true;
  }

  _save() {
    return localRepository.set(ITEMS_KEY, this.items);
  }

  getItems() {
    if (!this.initialized) this.init();
    return this.items.filter(i => i.status !== 'deleted');
  }

  getViewItems() {
    return this.getItems().map(item => DataConverter.toItemViewModel(item));
  }

  getItemById(id) {
    if (!this.initialized) this.init();
    return this.items.find(i => i.id === id && i.status !== 'deleted');
  }

  getViewItemById(id) {
    const item = this.getItemById(id);
    return item ? DataConverter.toItemViewModel(item) : null;
  }

  getAllItemsForSync() {
    if (!this.initialized) this.init();
    return this.items; // includes deleted tombstones
  }

  getPendingItemsForSync() {
    if (!this.initialized) this.init();
    return this.items.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'failed');
  }

  /**
   * 静默更新同步结果，不改变 updatedAt 也不触发 pending。
   */
  applySyncResult(syncedItem, status = 'synced', lastSyncedAt = Date.now(), skipSave = false) {
    if (!this.initialized) this.init();
    const index = this.items.findIndex(i => i.id === syncedItem.id);
    let newItem = { ...syncedItem };
    
    if (index !== -1) {
      const local = this.items[index];
      // 保留本地图片路径和timeline等不参与本阶段同步的字段
      const preserveFields = ['originalImageUrl', 'cutoutImageUrl', 'displayImageUrl', 'savedFilePath', 'timeline'];
      preserveFields.forEach(field => {
        if (local[field] !== undefined) {
          newItem[field] = local[field];
        }
      });
      newItem.syncStatus = status;
      newItem.lastSyncedAt = lastSyncedAt;
      this.items[index] = newItem;
    } else {
      if (!newItem.timeline) newItem.timeline = [];
      newItem.syncStatus = status;
      newItem.lastSyncedAt = lastSyncedAt;
      this.items.push(newItem);
    }
    
    if (!skipSave) this._save();
  }
  
  applyBatchSyncResults(syncedItems, status = 'synced', lastSyncedAt = Date.now()) {
    if (!this.initialized) this.init();
    syncedItems.forEach(item => {
      this.applySyncResult(item, status, lastSyncedAt, true);
    });
    this._save();
  }

  addItem(itemData) {
    if (!this.initialized) this.init();
    const newItem = createItem(itemData);
    this.items.push(newItem);
    return this._save();
  }

  updateItem(id, updateData) {
    if (!this.initialized) this.init();
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      const now = Date.now();
      
      const current = this.items[index];
      const changes = [];
      const fieldMap = {
        name: '名称',
        categoryId: '分类',
        notes: '备注',
        expiryMode: '效期模式',
        productionDate: '生产日期',
        shelfLifeValue: '保质期',
        expiryDate: '效期',
        openDate: '开封日期',
        afterOpeningShelfLifeValue: '开封保质期',
        status: '状态',
        remindDays: '提醒设置',
        originalImageUrl: '图片'
      };
      
      const valueFormatter = (key, val) => {
        if (val === undefined || val === null || val === '') return '空';
        if (key === 'status') {
          const map = { pending: '待取用', using: '使用中', done: '已用完', deleted: '已删除' };
          return map[val] || val;
        }
        if (key === 'expiryMode') {
          const map = { normal: '普通效期', after_opening: '开封后效期', dual: '双效期' };
          return map[val] || val;
        }
        if (key === 'remindDays') {
          return val === 0 ? '不提醒' : `提前${val}天`;
        }
        return val;
      };

      Object.keys(updateData).forEach(key => {
        if (fieldMap[key] && String(current[key]) !== String(updateData[key])) {
           const oldVal = valueFormatter(key, current[key]);
           const newVal = valueFormatter(key, updateData[key]);
           changes.push(`${fieldMap[key]}(${oldVal}->${newVal})`);
        }
      });
      
      let desc = '编辑信息';
      if (changes.length > 0) {
        if (changes.length > 2) desc = `修改了 ${changes.slice(0, 2).join('、')} 等`;
        else desc = `修改了 ${changes.join('、')}`;
      }

      // Update data
      this.items[index] = { 
        ...current, 
        ...updateData,
        updatedAt: now,
        lastEditedAt: now,
        syncStatus: 'pending'
      };
      
      // Ensure timeline exists, and prepend history record
      if (!this.items[index].timeline) {
        this.items[index].timeline = [];
      }
      this.items[index].timeline.unshift({
        id: generateUUID(),
        date: this._formatDateMonthDay(now),
        desc
      });
      
      return this._save();
    }
    return false;
  }

  softDeleteItem(id) {
    if (!this.initialized) this.init();
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items[index].status = 'deleted';
      this.items[index].syncStatus = 'pending';
      this.items[index].updatedAt = Date.now();
      return this._save();
    }
    return false;
  }

  markItemDone(id) {
    if (!this.initialized) this.init();
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.items[index].status = 'done';
      this.items[index].syncStatus = 'pending';
      this.items[index].updatedAt = Date.now();
      this.items[index].timeline.unshift({
        id: generateUUID(),
        date: this._formatDateMonthDay(Date.now()),
        desc: '已用完'
      });
      return this._save();
    }
    return false;
  }

  _formatDateMonthDay(timestamp) {
    const d = new Date(timestamp);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}.${day} ${h}:${min}`;
  }
}

export const itemService = new ItemService();
