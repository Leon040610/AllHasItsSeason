export const wechatCloudStorageRepository = {
  async uploadFile(localPath, cloudPath) {
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: localPath
    });
    return res.fileID;
  },

  async registerFileMetadata(fileId, cloudPath, sourceKind) {
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.callFunction({
      name: 'registerCloudFile',
      data: { fileId, cloudPath, sourceKind }
    });
    const result = res && res.result ? res.result : {};
    if (!result.success) {
      throw new Error(result.errorCode || 'registry_write_failed');
    }
  },

  async getTempFileURL(fileIDs) {
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.getTempFileURL({
      fileList: fileIDs
    });
    return res.fileList;
  },

  async downloadFile(cloudFileId) {
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.downloadFile({
      fileID: cloudFileId
    });
    return res;
  }
};
