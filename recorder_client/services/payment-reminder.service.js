/**
 * 催缴提醒服务
 * @description 自动识别欠费、发送催缴通知、催缴策略配置
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { 
  PAYMENT_STATUS, 
  REMINDER_TYPES,
  PAYMENT_CONFIG 
} from '../constants/payment-constants.js';
import notificationService from './notification-service.js';
import smsService from './sms-service.js';
import paymentStatusService from './payment-status.service.js';

class PaymentReminderService {
  constructor() {
    this.reminderStrategies = new Map();
    this.reminderHistory = new Map();
    this.reminderTasks = new Set();
    this.init();
  }

  /**
   * 初始化催缴服务
   */
  init() {
    // 注册默认催缴策略
    this.registerReminderStrategy('default', {
      intervals: [1, 3, 7, 14],  // 逾期天数
      methods: [REMINDER_TYPES.PUSH, REMINDER_TYPES.WECHAT, REMINDER_TYPES.SMS],
      escalation: true,          // 是否升级催缴
      maxReminders: 10           // 最大催缴次数
    });

    // 注册VIP催缴策略
    this.registerReminderStrategy('vip', {
      intervals: [1, 2, 5, 10],
      methods: [REMINDER_TYPES.PHONE, REMINDER_TYPES.WECHAT, REMINDER_TYPES.SMS],
      escalation: true,
      maxReminders: 15
    });

    // 启动定时检查
    this.startScheduledCheck();
  }

  /**
   * 注册催缴策略
   * @param {string} strategyName 策略名称
   * @param {Object} strategy 策略配置
   */
  registerReminderStrategy(strategyName, strategy) {
    this.reminderStrategies.set(strategyName, strategy);
  }

  /**
   * 检查并处理逾期付款
   * @returns {Promise<Array>} 处理结果
   */
  async checkOverduePayments() {
    try {
      console.log('[PaymentReminderService] 开始检查逾期付款');
      
      // 获取逾期付款列表
      const overduePayments = await this.getOverduePayments();
      const results = [];

      for (const payment of overduePayments) {
        try {
          const result = await this.processOverduePayment(payment);
          results.push(result);
        } catch (error) {
          console.error('[PaymentReminderService] 处理逾期付款失败:', payment.paymentId, error);
          results.push({
            paymentId: payment.paymentId,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`[PaymentReminderService] 逾期付款处理完成，共处理${results.length}条记录`);
      return results;

    } catch (error) {
      console.error('[PaymentReminderService] 检查逾期付款失败:', error);
      return [];
    }
  }

  /**
   * 处理单个逾期付款
   * @param {Object} payment 付款信息
   * @returns {Promise<Object>} 处理结果
   */
  async processOverduePayment(payment) {
    try {
      const { paymentId, userId, amount, createTime, userLevel } = payment;
      
      // 计算逾期天数
      const overdueDays = this.calculateOverdueDays(createTime);
      
      // 获取催缴策略
      const strategy = this.getReminderStrategy(userLevel);
      
      // 检查是否需要催缴
      const shouldRemind = this.shouldSendReminder(paymentId, overdueDays, strategy);
      
      if (!shouldRemind) {
        return {
          paymentId,
          success: true,
          action: 'skip',
          reason: '未到催缴时间或已达最大催缴次数'
        };
      }

      // 发送催缴通知
      const reminderResult = await this.sendReminder(payment, overdueDays, strategy);
      
      // 记录催缴历史
      await this.recordReminderHistory(paymentId, reminderResult);
      
      return {
        paymentId,
        success: true,
        action: 'reminded',
        method: reminderResult.method,
        overdueDays
      };

    } catch (error) {
      console.error('[PaymentReminderService] 处理逾期付款失败:', error);
      throw error;
    }
  }

  /**
   * 发送催缴通知
   * @param {Object} payment 付款信息
   * @param {number} overdueDays 逾期天数
   * @param {Object} strategy 催缴策略
   * @returns {Promise<Object>} 发送结果
   */
  async sendReminder(payment, overdueDays, strategy) {
    try {
      const { paymentId, userId, amount, description } = payment;
      
      // 选择催缴方式
      const reminderMethod = this.selectReminderMethod(paymentId, overdueDays, strategy);
      
      // 生成催缴内容
      const reminderContent = this.generateReminderContent(payment, overdueDays);
      
      let result;
      
      switch (reminderMethod) {
        case REMINDER_TYPES.PUSH:
          result = await this.sendPushReminder(userId, reminderContent);
          break;
        case REMINDER_TYPES.WECHAT:
          result = await this.sendWechatReminder(userId, reminderContent);
          break;
        case REMINDER_TYPES.SMS:
          result = await this.sendSmsReminder(userId, reminderContent);
          break;
        case REMINDER_TYPES.PHONE:
          result = await this.schedulePhoneReminder(userId, reminderContent);
          break;
        default:
          throw new Error(`不支持的催缴方式: ${reminderMethod}`);
      }

      return {
        method: reminderMethod,
        success: result.success,
        messageId: result.messageId,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('[PaymentReminderService] 发送催缴通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送推送催缴
   * @param {string} userId 用户ID
   * @param {Object} content 催缴内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendPushReminder(userId, content) {
    try {
      const result = await notificationService.sendPersonalizedNotification({
        userId,
        type: 'payment_reminder',
        title: content.title,
        content: content.message,
        data: {
          type: 'payment_reminder',
          paymentId: content.paymentId,
          amount: content.amount
        }
      });

      return {
        success: result.success,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('[PaymentReminderService] 发送推送催缴失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送微信催缴
   * @param {string} userId 用户ID
   * @param {Object} content 催缴内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendWechatReminder(userId, content) {
    try {
      // 发送微信模板消息
      const templateData = {
        first: { value: content.title },
        keyword1: { value: content.amount },
        keyword2: { value: content.overdueDays + '天' },
        keyword3: { value: content.dueDate },
        remark: { value: content.message }
      };

      const result = await notificationService.sendWechatTemplateMessage({
        userId,
        templateId: 'payment_reminder_template',
        data: templateData,
        url: '/pages/payment/payment-detail?id=' + content.paymentId
      });

      return {
        success: result.success,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('[PaymentReminderService] 发送微信催缴失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送短信催缴
   * @param {string} userId 用户ID
   * @param {Object} content 催缴内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendSmsReminder(userId, content) {
    try {
      const userInfo = await this.getUserInfo(userId);
      if (!userInfo.phone) {
        throw new Error('用户未绑定手机号');
      }

      const smsContent = `【记录员】尊敬的用户，您有一笔${content.amount}元的费用已逾期${content.overdueDays}天，请及时缴费。详情查看小程序。`;

      const result = await smsService.sendSMS({
        phone: userInfo.phone,
        content: smsContent,
        type: 'payment_reminder'
      });

      return {
        success: result.success,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('[PaymentReminderService] 发送短信催缴失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 安排电话催缴
   * @param {string} userId 用户ID
   * @param {Object} content 催缴内容
   * @returns {Promise<Object>} 安排结果
   */
  async schedulePhoneReminder(userId, content) {
    try {
      // 创建电话催缴任务
      const taskId = `phone_reminder_${userId}_${Date.now()}`;
      
      const task = {
        taskId,
        userId,
        paymentId: content.paymentId,
        amount: content.amount,
        overdueDays: content.overdueDays,
        scheduledTime: Date.now() + 2 * 60 * 60 * 1000, // 2小时后
        status: 'scheduled',
        attempts: 0
      };

      // 保存任务到存储
      await this.savePhoneReminderTask(task);

      return {
        success: true,
        messageId: taskId
      };
    } catch (error) {
      console.error('[PaymentReminderService] 安排电话催缴失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成催缴内容
   * @param {Object} payment 付款信息
   * @param {number} overdueDays 逾期天数
   * @returns {Object} 催缴内容
   */
  generateReminderContent(payment, overdueDays) {
    const { paymentId, amount, description, createTime } = payment;
    
    let urgencyLevel = '提醒';
    if (overdueDays > 7) urgencyLevel = '催缴';
    if (overdueDays > 14) urgencyLevel = '紧急催缴';

    const dueDate = new Date(createTime).toLocaleDateString();
    const formattedAmount = `¥${amount.toFixed(2)}`;

    return {
      paymentId,
      amount: formattedAmount,
      overdueDays,
      dueDate,
      title: `${urgencyLevel}：您有未完成的付款`,
      message: `您有一笔${formattedAmount}的${description}费用已逾期${overdueDays}天，请及时处理以免影响服务使用。`,
      urgencyLevel
    };
  }

  /**
   * 选择催缴方式
   * @param {string} paymentId 付款ID
   * @param {number} overdueDays 逾期天数
   * @param {Object} strategy 催缴策略
   * @returns {string} 催缴方式
   */
  selectReminderMethod(paymentId, overdueDays, strategy) {
    const reminderCount = this.getReminderCount(paymentId);
    const methods = strategy.methods || [REMINDER_TYPES.PUSH];

    // 根据逾期天数和催缴次数选择方式
    if (overdueDays <= 3) {
      return REMINDER_TYPES.PUSH;
    } else if (overdueDays <= 7) {
      return methods.includes(REMINDER_TYPES.WECHAT) ? REMINDER_TYPES.WECHAT : REMINDER_TYPES.PUSH;
    } else if (overdueDays <= 14) {
      return methods.includes(REMINDER_TYPES.SMS) ? REMINDER_TYPES.SMS : REMINDER_TYPES.WECHAT;
    } else {
      return methods.includes(REMINDER_TYPES.PHONE) ? REMINDER_TYPES.PHONE : REMINDER_TYPES.SMS;
    }
  }

  /**
   * 判断是否应该发送催缴
   * @param {string} paymentId 付款ID
   * @param {number} overdueDays 逾期天数
   * @param {Object} strategy 催缴策略
   * @returns {boolean} 是否应该催缴
   */
  shouldSendReminder(paymentId, overdueDays, strategy) {
    const { intervals, maxReminders } = strategy;
    const reminderCount = this.getReminderCount(paymentId);
    
    // 检查是否达到最大催缴次数
    if (reminderCount >= maxReminders) {
      return false;
    }

    // 检查是否在催缴间隔内
    return intervals.includes(overdueDays) || 
           (overdueDays > Math.max(...intervals) && reminderCount < maxReminders);
  }

  /**
   * 获取催缴策略
   * @param {string} userLevel 用户级别
   * @returns {Object} 催缴策略
   */
  getReminderStrategy(userLevel = 'default') {
    return this.reminderStrategies.get(userLevel) || this.reminderStrategies.get('default');
  }

  /**
   * 计算逾期天数
   * @param {string} createTime 创建时间
   * @returns {number} 逾期天数
   */
  calculateOverdueDays(createTime) {
    const now = new Date();
    const createdDate = new Date(createTime);
    const diffTime = now.getTime() - createdDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 获取催缴次数
   * @param {string} paymentId 付款ID
   * @returns {number} 催缴次数
   */
  getReminderCount(paymentId) {
    const history = this.reminderHistory.get(paymentId) || [];
    return history.length;
  }

  /**
   * 记录催缴历史
   * @param {string} paymentId 付款ID
   * @param {Object} reminderResult 催缴结果
   */
  async recordReminderHistory(paymentId, reminderResult) {
    try {
      if (!this.reminderHistory.has(paymentId)) {
        this.reminderHistory.set(paymentId, []);
      }

      const record = {
        ...reminderResult,
        timestamp: Date.now(),
        date: new Date().toISOString()
      };

      this.reminderHistory.get(paymentId).push(record);

      // 保存到本地存储
      const storageKey = `reminder_history_${paymentId}`;
      wx.setStorageSync(storageKey, this.reminderHistory.get(paymentId));

    } catch (error) {
      console.error('[PaymentReminderService] 记录催缴历史失败:', error);
    }
  }

  /**
   * 获取逾期付款列表
   * @returns {Promise<Array>} 逾期付款列表
   */
  async getOverduePayments() {
    try {
      // 这里应该从后端API获取逾期付款数据
      // 暂时返回模拟数据
      return [
        // {
        //   paymentId: 'payment_001',
        //   userId: 'user_001',
        //   amount: 100.00,
        //   description: '健康档案服务费',
        //   createTime: '2025-08-25T00:00:00.000Z',
        //   userLevel: 'default'
        // }
      ];
    } catch (error) {
      console.error('[PaymentReminderService] 获取逾期付款列表失败:', error);
      return [];
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(userId) {
    try {
      // 这里应该从后端API获取用户信息
      // 暂时从本地存储获取
      return wx.getStorageSync('userInfo') || {};
    } catch (error) {
      console.error('[PaymentReminderService] 获取用户信息失败:', error);
      return {};
    }
  }

  /**
   * 保存电话催缴任务
   * @param {Object} task 催缴任务
   */
  async savePhoneReminderTask(task) {
    try {
      const tasks = wx.getStorageSync('phone_reminder_tasks') || [];
      tasks.push(task);
      wx.setStorageSync('phone_reminder_tasks', tasks);
    } catch (error) {
      console.error('[PaymentReminderService] 保存电话催缴任务失败:', error);
    }
  }

  /**
   * 启动定时检查
   */
  startScheduledCheck() {
    // 每小时检查一次逾期付款
    setInterval(() => {
      this.checkOverduePayments().catch(error => {
        console.error('[PaymentReminderService] 定时检查失败:', error);
      });
    }, 60 * 60 * 1000);

    console.log('[PaymentReminderService] 已启动定时检查服务');
  }

  /**
   * 手动触发催缴检查
   * @returns {Promise<Array>} 处理结果
   */
  async manualCheck() {
    console.log('[PaymentReminderService] 手动触发催缴检查');
    return await this.checkOverduePayments();
  }

  /**
   * 获取催缴历史记录
   * @param {string} paymentId 付款ID
   * @returns {Array} 催缴历史
   */
  getReminderHistory(paymentId) {
    return this.reminderHistory.get(paymentId) || [];
  }

  /**
   * 停止对特定付款的催缴
   * @param {string} paymentId 付款ID
   * @param {string} reason 停止原因
   */
  stopReminder(paymentId, reason = '手动停止') {
    const history = this.reminderHistory.get(paymentId) || [];
    history.push({
      method: 'stop',
      success: true,
      reason,
      timestamp: Date.now(),
      date: new Date().toISOString()
    });
    
    this.reminderHistory.set(paymentId, history);
    console.log(`[PaymentReminderService] 已停止对${paymentId}的催缴`);
  }
}

// 创建单例实例
const paymentReminderService = new PaymentReminderService();

export default paymentReminderService;