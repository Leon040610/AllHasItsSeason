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

  async getTempFileURL(fileIDs) {
    if (typeof wx === 'undefined' || !wx.cloud) {
      throw new Error('wx.cloud not available');
    }
    const res = await wx.cloud.getTempFileURL({
      fileList: fileIDs
    });
    return res.fileList;
  }
};
