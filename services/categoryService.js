import { localRepository } from '../repositories/localRepository.js';
import { itemService } from './itemService.js';

const CATEGORIES_KEY = 'allhas_categories_v1';

class CategoryService {
  constructor() {
    this.categories = [];
    this.init();
  }

  init() {
    let cats = localRepository.get(CATEGORIES_KEY);
    
    // Default categories if missing
    if (!cats || cats.length === 0) {
      const now = Date.now();
      cats = [
        { id: 'food', name: '食品', backgroundColor: '#F4F3F1', iconColor: '#8E4D33', iconKey: 'shipin', defaultExpiryMode: 'normal', sortOrder: 1, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now },
        { id: 'daily', name: '日化', backgroundColor: '#EEF1EE', iconColor: '#665D51', iconKey: 'rihua', defaultExpiryMode: 'normal', sortOrder: 2, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now },
        { id: 'beauty', name: '美妆', backgroundColor: '#F4EFEA', iconColor: '#8E4D33', iconKey: 'meizhuang', defaultExpiryMode: 'dual', sortOrder: 3, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now },
        { id: 'medicine', name: '药品', backgroundColor: '#E9EDEA', iconColor: '#536251', iconKey: 'yaopin', defaultExpiryMode: 'dual', sortOrder: 4, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now },
        { id: 'baby', name: '母婴', backgroundColor: '#F4F3F1', iconColor: '#665D51', iconKey: 'fenlei9', defaultExpiryMode: 'dual', sortOrder: 5, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now },
        { id: 'other', name: '其他', backgroundColor: '#F4F3F1', iconColor: '#444842', iconKey: 'qita', defaultExpiryMode: 'normal', sortOrder: 99, isSystem: true, isDeleted: false, createdAt: now, updatedAt: now }
      ];
      localRepository.set(CATEGORIES_KEY, cats);
    } else {
      // Migrate old data
      let migrated = false;
      
      const hasOther = cats.find(c => c.id === 'other');
      if (!hasOther) {
        cats.push({ id: 'other', name: '其他', backgroundColor: '#F4F3F1', iconColor: '#FFFFFF', iconKey: 'qita', defaultExpiryMode: 'normal', sortOrder: 99, isSystem: true, isDeleted: false, createdAt: Date.now(), updatedAt: Date.now() });
        migrated = true;
      }
      
      cats = cats.map(c => {
        if (c.backgroundColor === undefined) {
          migrated = true;
          return {
            ...c,
            backgroundColor: c.cardBg || '#F4F3F1',
            iconColor: c.iconBg || '#FFFFFF',
            iconKey: c.icon ? c.icon.split('-').pop().split('.')[0] : 'qita',
            defaultExpiryMode: c.defaultExpiryMode || (['medicine', 'beauty', 'baby'].includes(c.id) ? 'dual' : 'normal'),
            isSystem: c.isSystem !== undefined ? c.isSystem : !!c.isDefault,
            isDeleted: c.isDeleted || false,
            createdAt: c.createdAt || Date.now(),
            updatedAt: c.updatedAt || Date.now()
          };
        }
        
        // Force fix white iconColor for system categories that got saved incorrectly
        if (c.isSystem && c.iconColor === '#FFFFFF') {
          migrated = true;
          const fixMap = {
            'food': '#8E4D33',
            'medicine': '#536251',
            'beauty': '#8E4D33',
            'daily': '#665D51',
            'baby': '#665D51',
            'other': '#444842'
          };
          c.iconColor = fixMap[c.id] || '#8E4D33';
        }
        
        // Migrate "护肤美妆" to "美妆"
        if (c.id === 'beauty' && c.name === '护肤美妆') {
          migrated = true;
          c.name = '美妆';
        }
        
        // Migrate "母婴" icon to smile
        if (c.id === 'baby' && c.iconKey === 'yaopin') {
          migrated = true;
          c.iconKey = 'fenlei9';
        }

        return c;
      });

      if (migrated) localRepository.set(CATEGORIES_KEY, cats);
    }
    
    this.categories = cats;
  }

  getCategories() {
    this.init(); // Refresh memory
    const items = itemService.getItems();
    
    return this.categories
      .filter(c => !c.isDeleted)
      .map(cat => {
        // Count items belonging to this category that are not deleted
        const count = items.filter(i => i.categoryId === cat.id && i.status !== 'deleted').length;
        
        return {
          ...cat,
          itemCount: count,
          // Legacy mapping for UI that hasn't updated yet
          cardBg: cat.backgroundColor,
          iconBg: cat.iconColor,
          icon: `/static/icons/me-category-${cat.iconKey}.svg`
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  addCategory(data) {
    this.init();
    const newCat = {
      id: 'cat_' + Date.now(),
      name: data.name,
      backgroundColor: data.backgroundColor || '#F4F3F1',
      iconColor: data.iconColor || '#FFFFFF',
      iconKey: data.iconKey || 'qita',
      defaultExpiryMode: data.defaultExpiryMode || 'normal',
      sortOrder: this.categories.length + 1,
      isSystem: false,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...data
    };
    this.categories.push(newCat);
    localRepository.set(CATEGORIES_KEY, this.categories);
    return true;
  }

  updateCategory(id, data) {
    this.init();
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    this.categories[index] = {
      ...this.categories[index],
      ...data,
      updatedAt: Date.now()
    };
    
    localRepository.set(CATEGORIES_KEY, this.categories);
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

    // Soft delete
    this.updateCategory(id, { isDeleted: true });
    return { success: true, message: '已删除' };
  }
}

export const categoryService = new CategoryService();
