import { ocrParser } from '../utils/ocrParser.js';
import { ocrSessionService } from './ocrSessionService.js';

export const recognitionService = {
  async recognize(tempFilePath, expiryMode = 'normal') {
    const startTime = Date.now();
    try {
      // 1. Invoke Service Market OCR
      const res = await new Promise((resolve, reject) => {
        wx.serviceMarket.invokeService({
          service: 'wx79ac3de8be320b71',
          api: 'OcrAllInOne',
          data: {
            img_url: new wx.serviceMarket.CDN({
              type: 'filePath',
              filePath: tempFilePath
            }),
            data_type: 3,
            ocr_type: 8 // 通用印刷体识别
          },
          success: (r) => resolve(r),
          fail: (e) => reject(e)
        });
      });

      // 2. Parse Raw Text
      let rawText = '';
      if (res && res.data && res.data.ocr_comm_res && res.data.ocr_comm_res.items) {
        res.data.ocr_comm_res.items.forEach(item => {
          if (item.text) {
            rawText += item.text + '\n';
          }
        });
      }

      // 3. Extract Structured Info
      const suggestions = ocrParser.parse(rawText, expiryMode);

      // 4. Create Session (only saves structured info)
      const sessionId = ocrSessionService.createSession(suggestions);

      // 5. Log Success (no PII or raw text)
      this.logAudit({
        status: 'success',
        recognizedFieldKeys: Object.keys(suggestions),
        recognizedFieldCount: Object.keys(suggestions).length,
        createdAt: startTime,
        completedAt: Date.now()
      });

      return { success: true, sessionId };
    } catch (e) {
      console.error('OCR failed', e);
      // Safe Error String
      let errorCode = 'unknown_error';
      if (e.errCode === 45009) errorCode = 'quota_exceeded';
      else if (e.errCode === 9301002) errorCode = 'service_unavailable';
      else if (e.errMsg && e.errMsg.includes('timeout')) errorCode = 'network_timeout';

      this.logAudit({
        status: 'fail',
        errorCode: errorCode,
        createdAt: startTime,
        completedAt: Date.now()
      });

      return { success: false, errorCode };
    }
  },

  logAudit(payload) {
    // Fire and forget log via cloud function
    wx.cloud.callFunction({
      name: 'logRecognition',
      data: payload
    }).catch(e => {
      console.error('Failed to write OCR audit log', e);
    });
  }
}
