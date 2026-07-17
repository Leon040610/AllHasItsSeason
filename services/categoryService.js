import { localRepository } from '../repositories/localRepository.js';
import { itemService } from './itemService.js';
import { STORAGE_KEYS } from '../utils/storageKeys.js';
import { normalizeTimestamp } from '../utils/dateUtils.js';

const CATEGORIES_KEY = STORAGE_KEYS.CATEGORIES;

const SYSTEM_CATEGORY_DEFAULTS = [
  { id: 'food', name: '食品', backgroundColor: '#F4F3F1', iconColor: '#8E4D33', iconKey: 'shipin', defaultExpiryMode: 'normal', sortOrder: 1 },
  { id: 'daily', name: '日化', backgroundColor: '#EEF1EE', iconColor: '#665D51', iconKey: 'rihua', defaultExpiryMode: 'normal', sortOrder: 2 },
  { id: 'beauty', name: '美妆', backgroundColor: '#F4EFEA', iconColor: '#8E4D33', iconKey: 'meizhuang', defaultExpiryMode: 'dual', sortOrder: 3 },
  { id: 'medicine', name: '药品', backgroundColor: '#E9EDEA', iconColor: '#536251', iconKey: 'yaopin', defaultExpiryMode: 'dual', sortOrder: 4 },
  { id: 'baby', name: '母婴', backgroundColor: '#F4F3F1', iconColor: '#665D51', iconKey: 'fenlei9', defaultExpiryMode: 'dual', sortOrder: 5 },
  { id: 'other', name: '其他', backgroundColor: '#F4F3F1', iconColor: '#444842', iconKey: 'qita', defaultExpiryMode: 'normal', sortOrder: 99 }
];

function isUnmodifiedSystemCategory(cat) {
  const def = SYSTEM_CATEGORY_DEFAULTS.find(d => d.id === cat.id);
  if (!def) return false;
  return cat.name === def.name &&
         cat.backgroundColor === def.backgroundColor &&
         cat.iconColor === def.iconColor &&
         cat.iconKey === def.iconKey &&
         cat.defaultExpiryMode === def.defaultExpiryMode &&
         cat.sortOrder === def.sortOrder;
}

class CategoryService {
  constructor() {
    this.categories = [];
    this.init();
  }

  init() {
    let cats = localRepository.get(CATEGORIES_KEY);
    
    // Default categories if missing
    if (!cats || cats.length === 0) {
      cats = SYSTEM_CATEGORY_DEFAULTS.map(def => ({
        ...def,
        isSystem: true,
        isDeleted: false,
        syncStatus: 'synced', // 种子数据标记为已同步，防止反向覆盖云端
        lastSyncedAt: null,
        syncError: '',
        createdAt: 0,
        updatedAt: 0
      }));
      localRepository.set(CATEGORIES_KEY, cats);
    } else {
      let migrated = false;
      
      const hasOther = cats.find(c => c.id === 'other');
      if (!hasOther) {
        const otherDef = SYSTEM_CATEGORY_DEFAULTS.find(d => d.id === 'other');
        cats.push({
          ...otherDef,
          isSystem: true,
          isDeleted: false,
          syncStatus: 'synced',
          lastSyncedAt: null,
          syncError: '',
          createdAt: 0,
          updatedAt: 0
        });
        migrated = true;
      }
      
      cats = cats.map(c => {
        let changed = false;
        
        // 兼容和修复旧数据
        if (c.backgroundColor === undefined) {
          changed = true;
          c.backgroundColor = c.cardBg || '#F4F3F1';
          c.iconColor = c.iconBg || '#FFFFFF';
          c.iconKey = c.icon ? c.icon.split('-').pop().split('.')[0] : 'qita';
          c.defaultExpiryMode = c.defaultExpiryMode || (['medicine', 'beauty', 'baby'].includes(c.id) ? 'dual' : 'normal');
          c.isSystem = c.isSystem !== undefined ? c.isSystem : !!c.isDefault;
        }

        if (c.isSystem && c.iconColor === '#FFFFFF') {
          changed = true;
          const fixMap = {
            'food': '#8E4D33', 'medicine': '#536251', 'beauty': '#8E4D33',
            'daily': '#665D51', 'baby': '#665D51', 'other': '#444842'
          };
          c.iconColor = fixMap[c.id] || '#8E4D33';
        }
        
        if (c.id === 'beauty' && c.name === '护肤美妆') { changed = true; c.name = '美妆'; }
        if (c.id === 'baby' && c.iconKey === 'yaopin') { changed = true; c.iconKey = 'fenlei9'; }

        if (c.isDeleted === undefined) { changed = true; c.isDeleted = false; }
        if (!c.syncStatus) {
          changed = true;
          c.syncStatus = 'pending';
          c.lastSyncedAt = null;
          c.syncError = '';
        }

        // 时间戳规范化
        const origCreatedAt = c.createdAt;
        const origUpdatedAt = c.updatedAt;
        c.createdAt = normalizeTimestamp(c.createdAt, Date.now());
        c.updatedAt = normalizeTimestamp(c.updatedAt, Date.now());
        if (origCreatedAt !== c.createdAt || origUpdatedAt !== c.updatedAt) {
          changed = true;
        }
        if (c.deletedAt !== undefined) {
          c.deletedAt = normalizeTimestamp(c.deletedAt, Date.now());
        }

        // 识别未修改的系统默认分类，将其降级为种子数据 (0 时间戳，synced 状态)
        if (c.isSystem && isUnmodifiedSystemCategory(c) && c.updatedAt !== 0) {
          changed = true;
          c.createdAt = 0;
          c.updatedAt = 0;
          c.syncStatus = 'synced'; // 防止上传
        }

        if (changed) migrated = true;
        return c;
      });

      if (migrated) localRepository.set(CATEGORIES_KEY, cats);
    }
    
    this.categories = cats;
  }

  _save() {
    return localRepository.set(CATEGORIES_KEY, this.categories);
  }

  getCategories() {
    this.init(); // Refresh memory
    const items = itemService.getItems();
    
    return this.categories
      .filter(c => !c.isDeleted)
      .map(cat => {
        const count = items.filter(i => i.categoryId === cat.id && i.status !== 'deleted').length;
        return {
          ...cat,
          itemCount: count,
          cardBg: cat.backgroundColor,
          iconBg: cat.iconColor,
          icon: `/static/icons/me-category-${cat.iconKey}.svg`
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getAllCategoriesForSync() {
    this.init();
    return this.categories;
  }

  getPendingCategoriesForSync() {
    this.init();
    return this.categories.filter(c => c.syncStatus === 'pending' || c.syncStatus === 'failed');
  }

  applySyncResult(syncedCat, status = 'synced', lastSyncedAt = Date.now(), skipSave = false) {
    this.init();
    const index = this.categories.findIndex(c => c.id === syncedCat.id);
    const newCat = { ...syncedCat, syncStatus: status, lastSyncedAt };
    
    if (index !== -1) {
      this.categories[index] = newCat;
    } else {
      this.categories.push(newCat);
    }
    
    if (!skipSave) this._save();
  }

  applyBatchSyncResults(syncedCats, status = 'synced', lastSyncedAt = Date.now()) {
    this.init();
    syncedCats.forEach(cat => {
      this.applySyncResult(cat, status, lastSyncedAt, true);
    });
    this._save();
  }

  addCategory(data) {
    this.init();
    const now = Date.now();
    const newCat = {
      id: 'cat_' + Date.now(), // 毫秒时间戳id
      name: data.name,
      backgroundColor: data.backgroundColor || '#F4F3F1',
      iconColor: data.iconColor || '#FFFFFF',
      iconKey: data.iconKey || 'qita',
      defaultExpiryMode: data.defaultExpiryMode || 'normal',
      sortOrder: this.categories.length + 1,
      isSystem: false,
      isDeleted: false,
      syncStatus: 'pending',
      lastSyncedAt: null,
      syncError: '',
      createdAt: now,
      updatedAt: now,
      ...data
    };
    this.categories.push(newCat);
    this._save();
    import('./syncService.js').then(({ syncService }) => {
      syncService.scheduleAutoSync({ reason: 'category_added' });
    });
    return true;
  }

  updateCategory(id, data) {
    this.init();
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    // 不允许覆盖 createdAt
    const { createdAt, ...rest } = data;

    this.categories[index] = {
      ...this.categories[index],
      ...rest,
      syncStatus: 'pending',
      updatedAt: Date.now()
    };
    
    this._save();
    import('./syncService.js').then(({ syncService }) => {
      syncService.scheduleAutoSync({ reason: 'category_updated' });
    });
    return true;
  }

  deleteCategory(id) {
    this.init();
    const cat = this.categories.find(c => c.id === id);
    if (!cat) return { success: false, message: '分类不存在' };

    const items = itemService.getItems();
    const hasItems = items.some(i => i.categoryId === id && i.status !== 'deleted');
    
    if (hasItems) {
      return { success: false, message: '该分类下已有物品，暂不支持删除。如需删除，请先将物品移动至其他分类。' };
    }

    // Soft delete with tombstone
    this.updateCategory(id, { isDeleted: true, deletedAt: Date.now() });
    return { success: true, message: '已删除' };
  }
}

export const categoryService = new CategoryService();
