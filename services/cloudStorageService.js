import { wechatCloudStorageRepository } from '../repositories/wechatCloudStorageRepository.js';
import { syncService } from './syncService.js';
import { cloudRuntimeService } from './cloudRuntimeService.js';
import { isStoredLoggedIn } from '../utils/authSessionStore.js';

const tempUrlCache = {};

function scheduleImageMetadataSync() {
  // The first item sync can finish before the background image upload. Queue a
  // normal debounced pass only after File IDs have been persisted locally.
  syncService.scheduleAutoSync({ reason: 'image_metadata_ready' });
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

  async uploadOriginalImage(localPath, cloudPath, sourceKind) {
    if (!isStoredLoggedIn()) {
      throw new Error('login_required');
    }
    const fileId = await wechatCloudStorageRepository.uploadFile(localPath, cloudPath);
    try {
      await wechatCloudStorageRepository.registerFileMetadata(
        fileId,
        cloudPath,
        sourceKind || this.getCloudFileSourceKind(cloudPath)
      );
    } catch (error) {
      // Registry failure must never block a user from saving an item. The file
      // remains outside automatic cleanup until a later upload registers it.
      console.warn('[CloudStorageService] file registry unavailable');
    }
    return fileId;
  },

  getCloudFileSourceKind(cloudPath) {
    if (typeof cloudPath !== 'string') return 'original';
    if (cloudPath.startsWith('avatars/')) return 'avatar';
    if (cloudPath.startsWith('processed/')) return 'cutout';
    if (cloudPath.includes('/display_')) return 'display';
    return 'original';
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

  async executeBackgroundUpload(itemService, itemId, imageRevision, originalLocalPath, displayLocalPath, localExt, userConsentAccepted, syncEnabled) {
    if (!isStoredLoggedIn()) {
      return { success: false, reason: 'login_required' };
    }
    if (!itemId) {
      return { success: false, reason: 'item_id_required' };
    }

    const isSyncActive = syncEnabled !== undefined ? syncEnabled : syncService.getSettings().syncEnabled;
    if (!isSyncActive) {
      itemService.updateItemImageState(itemId, imageRevision, {
        imageProcessStatus: 'fallback',
        beautifyFallbackReason: 'sync_disabled',
        imageSyncPending: true
      });
      return { success: false, reason: 'sync_disabled' };
    }

    try {
      const markedUploading = itemService.updateItemImageState(itemId, imageRevision, { imageProcessStatus: 'uploading' });
      if (!markedUploading) {
        return { success: false, reason: 'item_state_not_found' };
      }

      const prepareRes = await this.prepareImageUpload(itemId, imageRevision, localExt);
      const { cloudPath } = prepareRes;

      const originalCloudFileId = await this.uploadOriginalImage(originalLocalPath, cloudPath, 'original');

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

        scheduleImageMetadataSync();
        uni.showToast({ title: '图片备份完成', icon: 'success' });
        return { success: true };
      }

      itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId: originalCloudFileId,
        imageProcessStatus: 'cutting'
      });

      // Upload display sticker directly since it's already generated by frontend canvas
      const stickerExt = displayLocalPath.match(/\.([a-zA-Z0-9]+)$/) ? displayLocalPath.match(/\.([a-zA-Z0-9]+)$/)[1] : 'png';
      const prepareRes2 = await this.prepareImageUpload(itemId + '_sticker', imageRevision, stickerExt);
      const displayImageCloudFileId = await this.uploadOriginalImage(displayLocalPath, prepareRes2.cloudPath, 'display');

      const updated = itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId: originalCloudFileId,
        displayImageCloudFileId,
        stickerImageCloudFileId: displayImageCloudFileId,
        imageProcessStatus: 'success',
        imageSyncPending: false
      });
      if (!updated) return { success: false, reason: 'item_state_not_found' };

      scheduleImageMetadataSync();
      uni.showToast({ title: '贴纸上云完成', icon: 'success' });
      return { success: true };
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

  async finalizePreparedImageUpload(itemService, itemId, imageRevision, originalCloudFileId, stickerLocalPath, localExt, useOriginal, imageProcessStatus) {
    if (!isStoredLoggedIn()) {
      return { success: false, reason: 'login_required' };
    }
    if (!itemId || !originalCloudFileId || !stickerLocalPath) {
      return { success: false, reason: 'image_source_required' };
    }

    try {
      const extensionMatch = stickerLocalPath.match(/\.([a-zA-Z0-9]+)$/);
      const extension = extensionMatch ? extensionMatch[1] : (localExt || 'png');
      const stickerImageCloudFileId = await this.uploadOriginalImage(
        stickerLocalPath,
        `uploads/${itemId}/display_${imageRevision}.${extension}`,
        'display'
      );
      const displayImageCloudFileId = useOriginal
        ? originalCloudFileId
        : (stickerImageCloudFileId || originalCloudFileId);
      const updated = itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId: originalCloudFileId,
        displayImageCloudFileId,
        stickerImageCloudFileId,
        imageProcessStatus: useOriginal ? 'fallback' : (imageProcessStatus || 'success'),
        imageSyncPending: false
      });
      if (!updated) return { success: false, reason: 'item_state_not_found' };

      scheduleImageMetadataSync();
      uni.showToast({ title: '贴纸上云完成', icon: 'success' });
      return { success: true };
    } catch (e) {
      console.error('Prepared image upload error', e);
      itemService.updateItemImageState(itemId, imageRevision, {
        imageProcessStatus: 'error',
        imageSyncPending: true
      });
      uni.showToast({ title: '图片上云失败', icon: 'none' });
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
