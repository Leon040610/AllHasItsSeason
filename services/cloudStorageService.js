import { wechatCloudStorageRepository } from '../repositories/wechatCloudStorageRepository.js';
import { syncService } from './syncService.js';
import { cloudRuntimeService } from './cloudRuntimeService.js';
import { isStoredLoggedIn } from '../utils/authSessionStore.js';

const tempUrlCache = {};
let pendingImageRecoveryPromise = null;

function isLocalImagePath(path) {
  return typeof path === 'string'
    && (path.startsWith('wxfile://') || path.startsWith('file://'));
}

function getImageExtension(path) {
  const match = typeof path === 'string' && path.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : 'jpg';
}

export const cloudStorageService = {
  async prepareImageUpload(itemId, imageRevision, extension) {
    if (!isStoredLoggedIn()) {
      throw new Error('login_required');
    }
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.callFunction({
      name: 'imageProcess',
      data: {
        action: 'prepareUpload',
        itemId,
        imageRevision,
        extension
      }
    });
    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.errorMessage || 'Failed to prepare upload');
    }
    return result; // returns { jobId, uploadTicket, cloudPath }
  },

  async uploadOriginalImage(localPath, cloudPath) {
    if (!isStoredLoggedIn()) {
      throw new Error('login_required');
    }
    return await wechatCloudStorageRepository.uploadFile(localPath, cloudPath);
  },

  async processImage(jobId, uploadTicket, itemId, imageRevision, originalCloudFileId) {
    if (!isStoredLoggedIn()) {
      throw new Error('login_required');
    }
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.callFunction({
      name: 'imageProcess',
      data: {
        action: 'processUpload',
        jobId,
        uploadTicket,
        itemId,
        imageRevision,
        originalCloudFileId
      }
    });
    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.errorMessage || 'Failed to process image');
    }
    return result; // returns { imageProcessStatus, cutoutCloudFileId, errorCode }
  },
  
  async resolveImageUrl(fileId) {
    if (!fileId) return '';
    if (!fileId.startsWith('cloud://')) return fileId;
    if (tempUrlCache[fileId]) {
      return tempUrlCache[fileId];
    }
    try {
      const runtime = await cloudRuntimeService.init();
      if (!runtime || runtime.status !== 'ready') return fileId;
      const res = await wechatCloudStorageRepository.getTempFileURL([fileId]);
      if (res && res.length > 0 && res[0].tempFileURL) {
        tempUrlCache[fileId] = res[0].tempFileURL;
        return res[0].tempFileURL;
      }
    } catch (e) {
      console.error('Failed to resolve image URL', e);
    }
    return fileId;
  },

  async resolveBatchImageUrls(fileIds) {
    const uniqueIds = [...new Set(fileIds.filter(id => id && id.startsWith('cloud://') && !tempUrlCache[id]))];
    if (uniqueIds.length === 0) {
      return tempUrlCache;
    }
    try {
      const runtime = await cloudRuntimeService.init();
      if (!runtime || runtime.status !== 'ready') return tempUrlCache;
      const res = await wechatCloudStorageRepository.getTempFileURL(uniqueIds);
      if (res && Array.isArray(res)) {
        res.forEach(item => {
          if (item.fileID && item.tempFileURL) {
            tempUrlCache[item.fileID] = item.tempFileURL;
          }
        });
      }
    } catch (e) {
      console.error('Failed to resolve batch image URLs', e);
    }
    return tempUrlCache;
  },

  async restoreItemDisplayImages(viewItems) {
    if (!Array.isArray(viewItems) || viewItems.length === 0) {
      return viewItems;
    }
    // 仅处理页面临时视图副本，不能把临时 URL 写回本地业务数据或同步到云端。
    const restoredItems = viewItems.map(item => ({ ...item }));
    const fileIdsToResolve = [];
    restoredItems.forEach(item => {
      const targetId = item.displayImageCloudFileId || item.cutoutImageCloudFileId || item.originalImageCloudFileId || item.imageUrl;
      if (targetId && targetId.startsWith('cloud://')) {
        fileIdsToResolve.push(targetId);
      }
      const originalId = item.originalImageCloudFileId;
      if (originalId && originalId.startsWith('cloud://')) {
        fileIdsToResolve.push(originalId);
      }
    });
    if (fileIdsToResolve.length > 0) {
      const resolvedMap = await this.resolveBatchImageUrls(fileIdsToResolve);
      restoredItems.forEach(item => {
        const hasLocalValidUrl = item.displayImageUrl && !item.displayImageUrl.startsWith('cloud://');
        if (!hasLocalValidUrl) {
          const targetId = item.displayImageCloudFileId || item.cutoutImageCloudFileId || item.originalImageCloudFileId || item.imageUrl;
          if (targetId && resolvedMap[targetId]) {
            item.displayImageUrl = resolvedMap[targetId];
            item.imageUrl = resolvedMap[targetId];
          }
        }
        const hasLocalOriginalValidUrl = item.originalImageUrl && !item.originalImageUrl.startsWith('cloud://');
        if (!hasLocalOriginalValidUrl) {
          const originalId = item.originalImageCloudFileId;
          if (originalId && resolvedMap[originalId]) {
            item.originalImageUrl = resolvedMap[originalId];
          }
        }
      });
    }
    return restoredItems;
  },

  async syncImageMetadata() {
    // 新增物品的首轮自动同步可能仍在执行。等待其结束后再强制推送图片元数据，
    // 防止包含空 File ID 的旧快照赢得竞争。
    for (let attempt = 0; attempt < 120 && syncService.isSyncing; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (syncService.isSyncing) return false;

    try {
      await syncService.syncAll({ force: true, pushOnly: true });
      return true;
    } catch (e) {
      return false;
    }
  },

  async resumePendingImageUploads(itemService) {
    if (pendingImageRecoveryPromise || !isStoredLoggedIn()) {
      return pendingImageRecoveryPromise || { recovered: 0, skipped: 0 };
    }

    pendingImageRecoveryPromise = (async () => {
      const pendingItems = itemService.getAllItemsForSync().filter((item) => (
        item.status !== 'deleted'
        && item.imageSyncPending === true
        && !item.displayImageCloudFileId
        && isLocalImagePath(item.originalImageUrl)
      ));
      let recovered = 0;

      for (const item of pendingItems) {
        const displayPath = isLocalImagePath(item.displayImageUrl)
          ? item.displayImageUrl
          : item.originalImageUrl;
        const hasSticker = displayPath !== item.originalImageUrl;

        await this.executeBackgroundUpload(
          itemService,
          item.id,
          item.imageRevision || 0,
          item.originalImageUrl,
          displayPath,
          getImageExtension(item.originalImageUrl),
          hasSticker
        );
        recovered += 1;
      }

      return { recovered, skipped: 0 };
    })();

    try {
      return await pendingImageRecoveryPromise;
    } finally {
      pendingImageRecoveryPromise = null;
    }
  },

  async executeBackgroundUpload(itemService, itemId, imageRevision, originalLocalPath, displayLocalPath, localExt, userConsentAccepted) {
    if (!isStoredLoggedIn()) {
      return { success: false, reason: 'login_required' };
    }
    if (!itemId) {
      return { success: false, reason: 'item_id_required' };
    }

    try {
      const markedUploading = itemService.updateItemImageState(itemId, imageRevision, { imageProcessStatus: 'uploading' });
      if (!markedUploading) {
        return { success: false, reason: 'item_state_not_found' };
      }

      const prepareRes = await this.prepareImageUpload(itemId, imageRevision, localExt);
      const { cloudPath } = prepareRes;

      const originalCloudFileId = await this.uploadOriginalImage(originalLocalPath, cloudPath);

      if (!userConsentAccepted || originalLocalPath === displayLocalPath) {
        // Only upload original, skip processing
        const updated = itemService.updateItemImageState(itemId, imageRevision, {
          originalImageCloudFileId: originalCloudFileId,
          displayImageCloudFileId: originalCloudFileId,
          imageProcessStatus: 'fallback',
          beautifyFallbackReason: 'user_declined',
          imageSyncPending: false
        });
        if (!updated) return { success: false, reason: 'item_state_not_found' };

        this.syncImageMetadata();
        uni.showToast({ title: '图片备份完成', icon: 'success' });
        return { success: true, metadataSynced: false };
      }

      itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId: originalCloudFileId,
        imageProcessStatus: 'cutting'
      });

      // Upload display sticker directly since it's already generated by frontend canvas
      const stickerExt = displayLocalPath.match(/\.([a-zA-Z0-9]+)$/) ? displayLocalPath.match(/\.([a-zA-Z0-9]+)$/)[1] : 'png';
      const prepareRes2 = await this.prepareImageUpload(itemId + '_sticker', imageRevision, stickerExt);
      const displayImageCloudFileId = await this.uploadOriginalImage(displayLocalPath, prepareRes2.cloudPath);

      const updated = itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId: originalCloudFileId,
        displayImageCloudFileId,
        imageProcessStatus: 'success',
        imageSyncPending: false
      });
      if (!updated) return { success: false, reason: 'item_state_not_found' };

      this.syncImageMetadata();
      uni.showToast({ title: '贴纸上云成功', icon: 'success' });
      return { success: true, metadataSynced: false };
    } catch (e) {
      if (e.message === 'login_required') {
        return { success: false, reason: 'login_required' };
      }
      console.error('Background upload error', e);
      itemService.updateItemImageState(itemId, imageRevision, {
        imageProcessStatus: 'error',
        imageSyncPending: true
      });
      uni.showToast({ title: '图片上云失败', icon: 'none' })
      return { success: false, reason: 'upload_failed' };
    }
  },

  async downloadFile(cloudFileId) {
    if (!cloudFileId) {
      throw new Error('Cloud file ID is empty');
    }
    if (!cloudFileId.startsWith('cloud://')) {
      return cloudFileId;
    }
    try {
      const res = await wechatCloudStorageRepository.downloadFile(cloudFileId);
      if (res && res.tempFilePath) {
        return res.tempFilePath;
      }
      throw new Error('Temp file path is empty');
    } catch (e) {
      console.error('[CloudStorageService] downloadFile failed:', e);
      throw e;
    }
  }
};
