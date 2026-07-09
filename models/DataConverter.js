import { getDaysDifference, getTodayStr } from '../utils/dateUtils.js';

export const DataConverter = {
  toItemViewModel(item) {
    const today = getTodayStr();
    const daysLeft = getDaysDifference(item.expiryDate, today);
    
    let statusLabel = '';
    // Priority:
    // 1. deleted / isDeleted: (should be filtered out before display usually, but just in case)
    if (item.status === 'deleted') {
      statusLabel = '已删除';
    } 
    // 2. done: 已用完
    else if (item.status === 'done') {
      statusLabel = '已用完';
    }
    // 3. daysLeft < 0: 已过期
    else if (daysLeft < 0) {
      statusLabel = '已过期';
    }
    // 4. status === using 且 daysLeft >= 0: 使用中 · 还有 X 天
    else if (item.status === 'using' && daysLeft >= 0) {
      statusLabel = `使用中 · 还有 ${daysLeft} 天`;
    }
    // 5. daysLeft <= remindDays: 临期 / 还有 X 天
    else if (daysLeft <= item.remindDays) {
      statusLabel = `还有 ${daysLeft} 天`; // UI handles the warning color
    }
    // 6. 其他: 待取用 / 还有 X 天
    else {
      statusLabel = `还有 ${daysLeft} 天`; // UI typically shows '待取用' in details, or just days
    }

    // Format dates for display
    let produceDateLabel = '';
    if (item.productionDate) {
      const [y, m, d] = item.productionDate.split('-');
      produceDateLabel = `${y}年${m}月${d}日`;
    }
    
    let expireDateLabel = '';
    if (item.expiryDate) {
      const [y, m, d] = item.expiryDate.split('-');
      expireDateLabel = `${y}年${m}月${d}日`;
    }
    
    let shelfUnitDisplay = '天';
    if (item.shelfLifeUnit === 'month') shelfUnitDisplay = '月';
    if (item.shelfLifeUnit === 'year') shelfUnitDisplay = '年';

    return {
      id: item.id,
      name: item.name,
      category: item.categoryId,           // Backwards compatibility for UI
      categoryLabel: item.categoryName,    // Backwards compatibility for UI
      imageUrl: item.originalImageUrl || item.displayImageUrl,
      displayImageUrl: item.displayImageUrl,
      rotation: item.stickerRotation,
      status: item.status,
      statusLabel: statusLabel,
      daysLeft: daysLeft,
      produceDate: item.productionDate,
      produceDateLabel: produceDateLabel,
      expireDate: item.expiryDate,
      expireDateLabel: expireDateLabel,
      shelfLife: item.shelfLifeValue.toString(),
      shelfUnit: shelfUnitDisplay,
      timeline: item.timeline,
      remindDays: item.remindDays
    };
  }
};
