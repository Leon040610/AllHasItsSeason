import { getDaysDifference, getTodayStr, determineActiveExpiry } from '../utils/dateUtils.js';

export const DataConverter = {
  toItemViewModel(item) {
    const today = getTodayStr();
    
    // Safety fallback for old data
    const safeItem = {
      ...item,
      expiryMode: item.expiryMode || 'normal',
      activeExpirySource: item.activeExpirySource || 'normal',
      activeExpiryDate: item.activeExpiryDate !== undefined ? item.activeExpiryDate : (item.expiryDate || null)
    };

    // Recalculate active expiry dynamically based on current date/status just to be safe
    const activeInfo = determineActiveExpiry(safeItem);
    const activeDate = activeInfo.date;
    const activeSource = activeInfo.source;

    let daysLeft = null;
    if (activeDate) {
      daysLeft = getDaysDifference(activeDate, today);
    }
    
    let statusLabel = '';
    let displayStatus = 'normal'; // normal, expiring, expired, done, deleted, incomplete

    if (safeItem.status === 'deleted') {
      statusLabel = '已删除';
      displayStatus = 'deleted';
    } else if (safeItem.status === 'done') {
      statusLabel = '已用完';
      displayStatus = 'done';
    } else if (!activeDate) {
      statusLabel = '待补全';
      displayStatus = 'incomplete';
    } else if (daysLeft < 0) {
      displayStatus = 'expired';
      if (activeSource === 'opened') {
        statusLabel = `开封后已过期 ${Math.abs(daysLeft)} 天`;
      } else {
        statusLabel = `已过期 ${Math.abs(daysLeft)} 天`;
      }
    } else {
      if (daysLeft <= safeItem.remindDays) {
        displayStatus = 'expiring';
      }
      
      if (safeItem.status === 'using' && activeSource === 'opened') {
        statusLabel = `开封后还有 ${daysLeft} 天`;
      } else {
        statusLabel = `还有 ${daysLeft} 天`;
      }
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-');
      return `${y}年${m}月${d}日`;
    };

    const getUnitDisplay = (unit) => {
      if (unit === 'month') return '月';
      if (unit === 'year') return '年';
      return '天';
    };

    return {
      id: safeItem.id,
      name: safeItem.name,
      category: safeItem.categoryId,           
      categoryLabel: safeItem.categoryName,    
      imageUrl: safeItem.displayImageCloudFileId || safeItem.cutoutImageCloudFileId || safeItem.originalImageCloudFileId || safeItem.displayImageUrl || safeItem.originalImageUrl || '',
      displayImageUrl: safeItem.displayImageCloudFileId || safeItem.displayImageUrl || '',
      originalImageUrl: safeItem.originalImageCloudFileId || safeItem.originalImageUrl || '',
      cardBg: safeItem.imageBackgroundColor,
      rotation: safeItem.stickerRotation,
      status: safeItem.status,
      statusLabel: statusLabel,
      displayStatus: displayStatus,
      daysLeft: daysLeft,
      
      // Normal expiry
      produceDate: safeItem.productionDate,
      produceDateLabel: formatDate(safeItem.productionDate),
      expireDate: safeItem.expiryDate,
      expireDateLabel: formatDate(safeItem.expiryDate),
      shelfLife: safeItem.shelfLifeValue ? safeItem.shelfLifeValue.toString() : '',
      shelfUnit: getUnitDisplay(safeItem.shelfLifeUnit),
      
      // Multi-expiry
      expiryMode: safeItem.expiryMode,
      expiryModeLabel: safeItem.expiryMode === 'dual' ? '双效期' : (safeItem.expiryMode === 'after_opening' ? '开封后效期' : '普通效期'),
      openDate: safeItem.openDate,
      openDateLabel: formatDate(safeItem.openDate),
      afterOpeningShelfLife: safeItem.afterOpeningShelfLifeValue ? safeItem.afterOpeningShelfLifeValue.toString() : '',
      afterOpeningShelfUnit: getUnitDisplay(safeItem.afterOpeningShelfLifeUnit),
      openedExpiryDate: safeItem.openedExpiryDate,
      openedExpiryDateLabel: formatDate(safeItem.openedExpiryDate),
      
      activeExpiryDate: activeDate,
      activeExpiryDateLabel: formatDate(activeDate),
      activeExpirySource: activeSource,
      activeExpirySourceLabel: activeSource === 'opened' ? '开封后效期更早' : (activeSource === 'unopened' ? '包装效期更早' : ''),
      
      timeline: safeItem.timeline,
      remindDays: safeItem.remindDays !== undefined ? safeItem.remindDays : 7
    };
  }
};
