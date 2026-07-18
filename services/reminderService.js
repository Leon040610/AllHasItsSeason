import { determineActiveExpiry, getDaysDifference, formatDate } from '../utils/dateUtils.js';
import { wxReminderTemplateId } from '../env.js';

class ReminderService {
  /**
   * 计算单件物品的提醒候选资格
   * @param {Object} item 物品对象
   * @param {Object} settings 用户提醒设置
   * @param {number} [now=Date.now()] 当前时间戳 (用于模拟和日界判定)
   * @returns {Object} 提醒资格详情
   */
  getReminderEligibility(item, settings, now = Date.now()) {
    const result = {
      baseEligible: false,
      inAppEligible: false,
      subscriptionCandidate: false,
      reason: '',
      daysLeft: null,
      activeExpiryDate: null,
      activeExpirySource: null
    };

    // 1. 状态判断：只有待取用(pending)或使用中(using)符合要求
    if (item.status !== 'pending' && item.status !== 'using') {
      result.reason = `物品状态为${item.status}，不符合提醒条件`;
      return result;
    }

    // 2. 实时计算当前有效到期日
    const activeInfo = determineActiveExpiry(item);
    const activeExpiryDate = activeInfo.date;
    const activeExpirySource = activeInfo.source;

    result.activeExpiryDate = activeExpiryDate;
    result.activeExpirySource = activeExpirySource;

    if (!activeExpiryDate) {
      result.reason = '当前有效到期日不存在，无法计算';
      return result;
    }

    // 校验日期字符串是否合法 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(activeExpiryDate) || isNaN(Date.parse(activeExpiryDate))) {
      result.reason = '当前有效到期日格式非法';
      return result;
    }

    // 3. 校验提醒天数
    const remindDays = item.remindDays;
    if (typeof remindDays !== 'number' || !Number.isInteger(remindDays) || remindDays < 0) {
      result.reason = '提醒天数必须是非负整数';
      return result;
    }

    if (remindDays === 0) {
      result.reason = '物品设置为不提醒';
      return result;
    }

    // 4. 计算剩余天数 (按自然日对比)
    const todayStr = formatDate(new Date(now));
    const daysLeft = getDaysDifference(activeExpiryDate, todayStr);
    result.daysLeft = daysLeft;

    // 5. 提醒窗口期判定：已过期的物品不再重复提醒；未到提醒时间的不提醒
    if (daysLeft < 0) {
      result.reason = '物品已过期';
      return result;
    }

    if (daysLeft > remindDays) {
      result.reason = '未到提醒窗口期';
      return result;
    }

    // 符合基础提醒条件
    result.baseEligible = true;

    // 6. 应用内提醒资格判定
    if (settings && settings.inAppEnabled === true) {
      result.inAppEligible = true;
    } else {
      result.reason = '应用内提醒开关已关闭';
    }

    // 7. 微信订阅消息发送候选判定
    const isTemplateConfigured = typeof wxReminderTemplateId === 'string' && wxReminderTemplateId.trim().length > 0;
    if (settings && settings.subscriptionIntent === true && isTemplateConfigured) {
      result.subscriptionCandidate = true;
    } else if (!isTemplateConfigured) {
      result.reason = result.reason ? `${result.reason} 且微信订阅消息模板未配置` : '微信订阅消息模板未配置';
    } else {
      result.reason = result.reason ? `${result.reason} 且微信订阅消息意愿未开启` : '微信订阅消息意愿未开启';
    }

    if (result.baseEligible) {
      result.reason = '符合提醒条件';
    }

    return result;
  }

  /**
   * 获取所有符合提醒候选条件的物品列表
   * @param {Array} items 物品列表
   * @param {Object} settings 提醒设置
   * @param {number} [now=Date.now()] 当前时间戳
   * @returns {Array} 候选物品及对应的资格数据
   */
  getReminderCandidates(items, settings, now = Date.now()) {
    if (!Array.isArray(items)) return [];
    return items
      .map(item => {
        const eligibility = this.getReminderEligibility(item, settings, now);
        return {
          item,
          eligibility
        };
      })
      .filter(candidate => candidate.eligibility.baseEligible);
  }
}

export const reminderService = new ReminderService();
