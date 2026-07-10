import { localRepository } from '../repositories/localRepository.js';
import { createItem } from '../models/ItemModel.js';
import { DataConverter } from '../models/DataConverter.js';
import { generateUUID } from '../utils/uuid.js';

const ITEMS_KEY = 'allhas_items_v1';

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
        if (!item.expiryMode) {
          migrated = true;
          return {
            ...item,
            expiryMode: 'normal',
            openDate: '',
            afterOpeningShelfLifeValue: 0,
            afterOpeningShelfLifeUnit: 'month',
            openedExpiryDate: '',
            activeExpiryDate: item.expiryDate || null,
            activeExpirySource: 'normal'
          };
        }
        return item;
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
      
      // Update data
      this.items[index] = { 
        ...this.items[index], 
        ...updateData,
        updatedAt: now,
        lastEditedAt: now
      };
      
      // Ensure timeline exists, and prepend history record
      if (!this.items[index].timeline) {
        this.items[index].timeline = [];
      }
      this.items[index].timeline.unshift({
        id: generateUUID(),
        date: this._formatDateMonthDay(now),
        desc: '编辑信息'
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
    return `${m}.${day}`;
  }
}

export const itemService = new ItemService();
