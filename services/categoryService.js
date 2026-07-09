import { localRepository } from '../repositories/localRepository.js';

const CATEGORIES_KEY = 'allhas_categories_v1';

class CategoryService {
  constructor() {
    this.categories = [];
    this.init();
  }

  init() {
    const cats = localRepository.get(CATEGORIES_KEY);
    if (!cats || cats.length === 0) {
      this.categories = [
        { id: 'food', name: '食品', icon: '/static/icons/index-shipin.svg', cardBg: '#F4F3F1', iconBg: '#FFFFFF', isDefault: true, sortOrder: 1 },
        { id: 'medicine', name: '药品', icon: '/static/icons/index-yaopin.svg', cardBg: '#E9EDEA', iconBg: '#FFFFFF', isDefault: true, sortOrder: 2 },
        { id: 'beauty', name: '美妆', icon: '/static/icons/index-meizhuang.svg', cardBg: '#F4EFEA', iconBg: '#FFFFFF', isDefault: true, sortOrder: 3 },
        { id: 'daily', name: '日化', icon: '/static/icons/index-rihua.svg', cardBg: '#EEF1EE', iconBg: '#FFFFFF', isDefault: true, sortOrder: 4 },
        { id: 'baby', name: '母婴', icon: '/static/icons/index-yaopin.svg', cardBg: '#F4F3F1', iconBg: '#FFFFFF', isDefault: true, sortOrder: 5 }
      ];
      localRepository.set(CATEGORIES_KEY, this.categories);
    } else {
      this.categories = cats;
    }
  }

  getCategories() {
    if (this.categories.length === 0) this.init();
    return this.categories;
  }
}

export const categoryService = new CategoryService();
