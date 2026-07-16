import { generateUUID } from '../utils/uuid.js';

export function createItem(data) {
  const now = Date.now();
  return {
    id: data.id || generateUUID(),
    name: data.name || '',
    categoryId: data.categoryId || '',
    categoryName: data.categoryName || '',
    originalImageUrl: data.originalImageUrl || '', // Keep for local use if unuploaded
    cutoutImageUrl: data.cutoutImageUrl || '', // Keep for local use
    displayImageUrl: data.displayImageUrl || '', // Keep for local use
    
    // Cloud file IDs
    originalImageCloudFileId: data.originalImageCloudFileId || '',
    cutoutImageCloudFileId: data.cutoutImageCloudFileId || '',
    displayImageCloudFileId: data.displayImageCloudFileId || '',
    imageUpdatedAt: data.imageUpdatedAt || null,
    imageRevision: data.imageRevision || 0,
    imageSyncPending: data.imageSyncPending !== undefined ? data.imageSyncPending : false,
    imageProcessStatus: data.imageProcessStatus || 'idle', // idle, uploading, cutting, success, fallback, error
    beautifyFallbackReason: data.beautifyFallbackReason || '',
    
    imageBackgroundColor: data.imageBackgroundColor || '',
    stickerRotation: data.stickerRotation !== undefined ? data.stickerRotation : (Math.random() * 4 - 2),
    productionDate: data.productionDate || '',
    shelfLifeValue: data.shelfLifeValue || 0,
    shelfLifeUnit: data.shelfLifeUnit || 'day', // day, month, year
    expiryDate: data.expiryDate || '',
    
    // Multi-expiry fields
    expiryMode: data.expiryMode || 'normal', // normal, after_opening, dual
    openDate: data.openDate || '',
    afterOpeningShelfLifeValue: data.afterOpeningShelfLifeValue || 0,
    afterOpeningShelfLifeUnit: data.afterOpeningShelfLifeUnit || 'month', // day, month, year
    openedExpiryDate: data.openedExpiryDate || '',
    activeExpiryDate: data.activeExpiryDate !== undefined ? data.activeExpiryDate : (data.expiryDate || null),
    activeExpirySource: data.activeExpirySource || 'normal', // normal, unopened, opened

    status: data.status || 'pending', // pending, using, done, deleted
    remindDays: data.remindDays !== undefined ? data.remindDays : 7,
    timeline: data.timeline || [{
      id: generateUUID(),
      date: formatDateMonthDay(now),
      desc: '录入'
    }],
    createdAt: data.createdAt || now,
    updatedAt: now,
    lastEditedAt: data.lastEditedAt || now,

    // Sync fields
    syncStatus: data.syncStatus || 'pending', // pending, synced, failed
    lastSyncedAt: data.lastSyncedAt || null,
    syncError: data.syncError || ''
  };
}

function formatDateMonthDay(timestamp) {
  const d = new Date(timestamp);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}.${day} ${h}:${min}`;
}
