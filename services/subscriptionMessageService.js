import { wxReminderTemplateId } from '../env.js';

class SubscriptionMessageService {
  /**
   * 检查当前运行时环境是否配置了有效的模板 ID
   * @returns {boolean}
   */
  isTemplateConfigured() {
    return typeof wxReminderTemplateId === 'string' && wxReminderTemplateId.trim().length > 0;
  }

  /**
   * 发起订阅消息授权申请
   * @returns {Promise<Object>} 授权映射结果
   */
  requestSubscription() {
    return new Promise((resolve) => {
      // 1. 验证运行时模板配置
      if (!this.isTemplateConfigured()) {
        resolve({
          success: false,
          result: 'unavailable',
          errorCode: 'invalid_template'
        });
        return;
      }

      // 2. 验证微信 API 可用性
      if (typeof wx === 'undefined' || !wx.requestSubscribeMessage) {
        resolve({
          success: false,
          result: 'unavailable',
          errorCode: 'client_unavailable'
        });
        return;
      }

      // 3. 发起微信授权弹窗
      wx.requestSubscribeMessage({
        tmplIds: [wxReminderTemplateId],
        success: (res) => {
          const status = res[wxReminderTemplateId];
          
          if (status === 'accept') {
            resolve({
              success: true,
              result: 'accept',
              errorCode: null
            });
          } else if (status === 'reject') {
            resolve({
              success: false,
              result: 'reject',
              errorCode: null
            });
          } else if (status === 'ban') {
            resolve({
              success: false,
              result: 'ban',
              errorCode: 'service_banned'
            });
          } else if (status === 'filter') {
            resolve({
              success: false,
              result: 'filter',
              errorCode: 'invalid_template' // 归类为模板配置/标题冲突问题
            });
          } else {
            resolve({
              success: false,
              result: 'unknown',
              errorCode: 'unknown_error'
            });
          }
        },
        fail: (err) => {
          console.error('[SubscriptionMessageService] 授权申请失败:', err);

          const errMsg = String(err.errMsg || err.message || '').toLowerCase();
          const errCode = err.errCode;

          let errorCode = 'unknown_error';
          let result = 'unavailable';

          // 判定失败原因
          if (errMsg.includes('cancel') || errCode === 20005) {
            // 用户在微信弹窗上层取消或拦截
            result = 'reject';
            errorCode = null;
          } else if (errMsg.includes('deny') || errCode === 20004) {
            // 微信小程序订阅消息全局总开关关闭
            errorCode = 'main_switch_off';
          } else if (errMsg.includes('invalid') || errMsg.includes('template') || errCode === 20001 || errCode === 20003) {
            // 模板配置无效
            errorCode = 'invalid_template';
          } else if (errMsg.includes('network') || errMsg.includes('timeout')) {
            // 网络异常
            errorCode = 'network_error';
          } else {
            // 系统或客户端环境不可用
            errorCode = 'client_unavailable';
          }

          resolve({
            success: false,
            result,
            errorCode
          });
        }
      });
    });
  }
}

export const subscriptionMessageService = new SubscriptionMessageService();
