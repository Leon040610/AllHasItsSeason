import { wechatCloudStorageRepository } from '../repositories/wechatCloudStorageRepository.js';

export const cloudStorageService = {
  async prepareImageUpload(itemId, imageRevision, extension) {
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
    return await wechatCloudStorageRepository.uploadFile(localPath, cloudPath);
  },

  async processImage(jobId, uploadTicket, itemId, imageRevision, originalCloudFileId) {
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
    try {
      const res = await wechatCloudStorageRepository.getTempFileURL([fileId]);
      if (res && res.length > 0 && res[0].tempFileURL) {
        return res[0].tempFileURL;
      }
    } catch (e) {
      console.error('Failed to resolve image URL', e);
    }
    return fileId;
  },

  async executeBackgroundUpload(itemService, itemId, imageRevision, originalLocalPath, localExt, userConsentAccepted, syncEnabled) {
    if (!syncEnabled) {
      // Sync is disabled, we do nothing and keep local image
      itemService.updateItemImageState(itemId, imageRevision, {
        imageProcessStatus: 'fallback',
        beautifyFallbackReason: 'sync_disabled',
        imageSyncPending: true
      });
      return;
    }

    try {
      itemService.updateItemImageState(itemId, imageRevision, { imageProcessStatus: 'uploading' });

      const prepareRes = await this.prepareImageUpload(itemId, imageRevision, localExt);
      const { jobId, uploadTicket, cloudPath } = prepareRes;

      const originalCloudFileId = await this.uploadOriginalImage(originalLocalPath, cloudPath);

      if (!userConsentAccepted) {
        // Only upload original, skip processing
        itemService.updateItemImageState(itemId, imageRevision, {
          originalImageCloudFileId,
          imageProcessStatus: 'fallback',
          beautifyFallbackReason: 'user_declined',
          imageSyncPending: false
        });
        return;
      }

      itemService.updateItemImageState(itemId, imageRevision, {
        originalImageCloudFileId,
        imageProcessStatus: 'cutting'
      });

      const processRes = await this.processImage(jobId, uploadTicket, itemId, imageRevision, originalCloudFileId);

      if (processRes.imageProcessStatus === 'success') {
        itemService.updateItemImageState(itemId, imageRevision, {
          cutoutImageCloudFileId: processRes.cutoutCloudFileId,
          imageProcessStatus: 'success',
          imageSyncPending: false
        });
      } else {
        itemService.updateItemImageState(itemId, imageRevision, {
          imageProcessStatus: 'fallback',
          beautifyFallbackReason: processRes.errorCode,
          imageSyncPending: false
        });
      }
    } catch (e) {
      console.error('Background upload error', e);
      itemService.updateItemImageState(itemId, imageRevision, {
        imageProcessStatus: 'error',
        imageSyncPending: true
      });
    }
  }
};
