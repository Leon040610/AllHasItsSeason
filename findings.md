# Findings
- The application relies heavily on WeChat Cloud Storage.
- wx.cloud.uploadFile is used in wechatCloudStorageRepository.js and cloudfunctions/imageProcess/index.js.
- Original images are uploaded to /uploads/{jobId}/original.jpg.
- Cutout images are uploaded to /processed/{jobId}/cutout.png.
- Final sticker images are uploaded via executeBackgroundUpload when syncEnabled is true.
- If the Cloud Storage is empty, it means no successful upload has occurred in that specific environment, or the environment ID in the console doesn't match the one initialized in the code.
