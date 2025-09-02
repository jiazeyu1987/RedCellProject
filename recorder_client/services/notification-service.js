/**
 * 通知服务核心类
 * 负责通知的创建、发送、状态管理等核心功能
 */

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_STATUS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_RATE_LIMITS,
  NOTIFICATION_TIME_WINDOW,
  ROLE_NOTIFICATION_PERMISSIONS,
  NOTIFICATION_RETRY_CONFIG,
  DEFAULT_NOTIFICATION_CONFIG
} from '../constants/notification-config.js';

import TemplateManager from './template-manager.js';
import WechatMessageService from './wechat-message.service.js';
import SMSService from './sms-service.js';

class NotificationService {
  constructor() {
    this.config = DEFAULT_NOTIFICATION_CONFIG;
    this.queue = [];
    this.processing = false;
    this.rateLimit = new Map(); // 用户发送频率限制
    this.retryCount = new Map(); // 重试计数
    this.templateManager = null;
    this.wechatMessageService = null;
    this.smsService = null;
  }

  /**
   * 初始化通知服务
   */
  async init() {
    try {
      console.log('[NotificationService] 初始化通知服务...');
      
      // 初始化模板管理器
      this.templateManager = new TemplateManager();
      await this.templateManager.init();
      
      // 初始化微信消息服务
      this.wechatMessageService = new WechatMessageService();
      await this.wechatMessageService.init();
      
      // 初始化短信服务
      this.smsService = new SMSService();
      await this.smsService.init();
      
      // 加载配置
      await this.loadConfig();
      
      // 启动队列处理
      this.startQueueProcessor();
      
      // 清理过期通知
      this.startCleanupTimer();
      
      console.log('[NotificationService] 通知服务初始化完成');
      return true;
    } catch (error) {
      console.error('[NotificationService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      // 从本地存储或服务器加载配置
      const localConfig = wx.getStorageSync('notification_config');
      if (localConfig) {
        this.config = { ...this.config, ...localConfig };
      }
    } catch (error) {
      console.warn('[NotificationService] 配置加载失败，使用默认配置');
    }
  }

  /**
   * 创建带模板的通知
   * @param {Object} options 通知选项
   * @returns {Object} 通知对象
   */
  createNotificationFromTemplate(options) {
    const {
      type,
      channel = NOTIFICATION_CHANNELS.IN_APP,
      targetUser,
      data = {},
      templateId = null,
      priority = NOTIFICATION_PRIORITY.NORMAL,
      scheduledTime = new Date(),
      expireTime = null
    } = options;

    // 验证必要参数
    if (!type || !targetUser) {
      throw new Error('缺少必要的通知参数');
    }

    // 获取或生成模板内容
    let title, content;
    if (templateId) {
      // 使用指定模板
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error('指定的模板不存在');
      }
      
      const rendered = this.templateManager.renderTemplate(template, data);
      if (!rendered) {
        throw new Error('模板渲染失败或条件不满足');
      }
      
      title = rendered.title;
      content = rendered.content;
    } else {
      // 使用默认模板
      const defaultTemplate = this.getDefaultTemplate(type, channel);
      if (defaultTemplate) {
        const rendered = this.templateManager.renderTemplate(defaultTemplate, data);
        title = rendered ? rendered.title : '通知';
        content = rendered ? rendered.content : '您有新的通知';
      } else {
        title = data.title || '通知';
        content = data.content || '您有新的通知';
      }
    }

    // 创建通知
    return this.createNotification({
      type,
      title,
      content,
      targetUser,
      data: {
        ...data,
        templateId,
        templateRenderedAt: new Date().toISOString()
      },
      channels: [channel],
      priority,
      scheduledTime,
      expireTime
    });
  }

  /**
   * 创建通知
   * @param {Object} options 通知选项
   * @returns {Object} 通知对象
   */
  createNotification(options) {
    const {
      type,
      title,
      content,
      targetUser,
      data = {},
      channels = [NOTIFICATION_CHANNELS.IN_APP],
      priority = NOTIFICATION_PRIORITY.NORMAL,
      scheduledTime = new Date(),
      expireTime = null
    } = options;

    // 验证必要参数
    if (!type || !title || !content || !targetUser) {
      throw new Error('缺少必要的通知参数');
    }

    // 验证权限
    if (!this.checkPermission(targetUser.role, type, channels)) {
      throw new Error('用户没有接收此类型通知的权限');
    }

    // 生成通知ID
    const notificationId = this.generateNotificationId();

    // 创建通知对象
    const notification = {
      id: notificationId,
      type,
      title,
      content,
      data,
      targetUser,
      channels,
      priority,
      status: NOTIFICATION_STATUS.PENDING,
      scheduledTime,
      sentTime: null,
      deliveredTime: null,
      readTime: null,
      expireTime: expireTime || this.calculateExpireTime(type),
      retryCount: 0,
      metadata: {
        source: 'recorder_client',
        version: '1.0.0',
        timestamp: Date.now()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return notification;
  }

  /**
   * 发送通知
   * @param {Object} notification 通知对象
   * @returns {Promise<boolean>} 发送结果
   */
  async sendNotification(notification) {
    try {
      // 检查发送频率限制
      if (!this.checkRateLimit(notification.targetUser.id, notification.type)) {
        console.warn('[NotificationService] 触发频率限制，跳过发送:', notification.id);
        return false;
      }

      // 检查时间窗口
      if (!this.checkTimeWindow(notification.type)) {
        console.log('[NotificationService] 不在发送时间窗口内，延迟发送:', notification.id);
        this.scheduleNotification(notification);
        return true;
      }

      // 更新状态为发送中
      notification.status = NOTIFICATION_STATUS.SENDING;
      notification.sentTime = new Date();
      notification.updatedAt = new Date();

      // 根据渠道发送通知
      const results = await Promise.allSettled(
        notification.channels.map(channel => this.sendByChannel(notification, channel))
      );

      // 检查发送结果
      const hasSuccess = results.some(result => result.status === 'fulfilled' && result.value);
      
      if (hasSuccess) {
        notification.status = NOTIFICATION_STATUS.SENT;
        this.updateRateLimit(notification.targetUser.id, notification.type);
        this.saveNotificationLog(notification, 'success');
        return true;
      } else {
        throw new Error('所有渠道发送失败');
      }

    } catch (error) {
      console.error('[NotificationService] 发送失败:', error);
      notification.status = NOTIFICATION_STATUS.FAILED;
      notification.updatedAt = new Date();
      
      // 如果未达到最大重试次数，加入重试队列
      if (notification.retryCount < NOTIFICATION_RETRY_CONFIG.maxRetries) {
        this.scheduleRetry(notification);
      } else {
        this.saveNotificationLog(notification, 'failed', error.message);
      }
      
      return false;
    }
  }

  /**
   * 根据渠道发送通知
   * @param {Object} notification 通知对象
   * @param {string} channel 发送渠道
   * @returns {Promise<boolean>} 发送结果
   */
  async sendByChannel(notification, channel) {
    switch (channel) {
      case NOTIFICATION_CHANNELS.WECHAT_TEMPLATE:
        return await this.sendWechatTemplate(notification);
      
      case NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE:
        return await this.sendWechatSubscribe(notification);
      
      case NOTIFICATION_CHANNELS.SMS:
        return await this.sendSMS(notification);
      
      case NOTIFICATION_CHANNELS.IN_APP:
        return await this.sendInApp(notification);
      
      default:
        console.warn('[NotificationService] 不支持的发送渠道:', channel);
        return false;
    }
  }

  /**
   * 发送微信模板消息
   */
  async sendWechatTemplate(notification) {
    if (!this.wechatMessageService) {
      console.error('[NotificationService] 微信消息服务未初始化');
      return false;
    }
    
    return await this.wechatMessageService.sendTemplateMessage(notification);
  }

  /**
   * 发送微信订阅消息
   */
  async sendWechatSubscribe(notification) {
    if (!this.wechatMessageService) {
      console.error('[NotificationService] 微信消息服务未初始化');
      return false;
    }
    
    return await this.wechatMessageService.sendSubscribeMessage(notification);
  }

  /**
   * 发送短信
   */
  async sendSMS(notification) {
    if (!this.smsService) {
      console.error('[NotificationService] 短信服务未初始化');
      return false;
    }
    
    return await this.smsService.sendSMS(notification);
  }

  /**
   * 发送应用内通知
   */
  async sendInApp(notification) {
    try {
      // 保存到本地存储
      const notifications = wx.getStorageSync('in_app_notifications') || [];
      notifications.unshift(notification);
      
      // 限制最大存储数量
      const maxStored = 100;
      if (notifications.length > maxStored) {
        notifications.splice(maxStored);
      }
      
      wx.setStorageSync('in_app_notifications', notifications);
      
      // 发送事件通知
      this.emitNotificationEvent('new_notification', notification);
      
      console.log('[NotificationService] 应用内通知发送成功:', notification.id);
      return true;
    } catch (error) {
      console.error('[NotificationService] 应用内通知发送失败:', error);
      return false;
    }
  }

  /**
   * 检查权限
   */
  checkPermission(userRole, notificationType, channels) {
    const permissions = ROLE_NOTIFICATION_PERMISSIONS[userRole];
    if (!permissions) return false;
    
    const hasTypePermission = permissions.allowedTypes.includes(notificationType);
    const hasChannelPermission = channels.every(channel => 
      permissions.allowedChannels.includes(channel)
    );
    
    return hasTypePermission && hasChannelPermission;
  }

  /**
   * 检查发送频率限制
   */
  checkRateLimit(userId, notificationType) {
    const limitKey = `${userId}_${notificationType}`;
    const limits = NOTIFICATION_RATE_LIMITS[notificationType] || NOTIFICATION_RATE_LIMITS.DEFAULT;
    const now = Date.now();
    
    if (!this.rateLimit.has(limitKey)) {
      this.rateLimit.set(limitKey, { count: 0, lastSent: 0, dailyCount: 0, lastReset: now });
    }
    
    const userLimit = this.rateLimit.get(limitKey);
    
    // 检查是否需要重置每日计数
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now - userLimit.lastReset > oneDayMs) {
      userLimit.dailyCount = 0;
      userLimit.lastReset = now;
    }
    
    // 检查每日限制
    if (userLimit.dailyCount >= limits.maxPerDay) {
      return false;
    }
    
    // 检查时间间隔限制
    if (now - userLimit.lastSent < limits.minInterval) {
      return false;
    }
    
    return true;
  }

  /**
   * 更新发送频率计数
   */
  updateRateLimit(userId, notificationType) {
    const limitKey = `${userId}_${notificationType}`;
    const userLimit = this.rateLimit.get(limitKey);
    
    if (userLimit) {
      userLimit.count++;
      userLimit.dailyCount++;
      userLimit.lastSent = Date.now();
    }
  }

  /**
   * 检查时间窗口
   */
  checkTimeWindow(notificationType) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 获取对应的时间窗口配置
    let timeWindow = NOTIFICATION_TIME_WINDOW.DEFAULT;
    if (notificationType === NOTIFICATION_TYPES.HEALTH_ALERT) {
      timeWindow = NOTIFICATION_TIME_WINDOW.HEALTH_ALERT;
    }
    
    return currentTime >= timeWindow.startTime && currentTime <= timeWindow.endTime;
  }

  /**
   * 计算过期时间
   */
  calculateExpireTime(notificationType) {
    const now = new Date();
    let expireHours = 24; // 默认24小时
    
    switch (notificationType) {
      case NOTIFICATION_TYPES.HEALTH_ALERT:
        expireHours = 1; // 紧急健康警报1小时过期
        break;
      case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        expireHours = 2; // 预约提醒2小时过期
        break;
      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        expireHours = 72; // 付款提醒72小时过期
        break;
    }
    
    return new Date(now.getTime() + expireHours * 60 * 60 * 1000);
  }

  /**
   * 生成通知ID
   */
  generateNotificationId() {
    return `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动队列处理器
   */
  startQueueProcessor() {
    if (this.processing) return;
    
    this.processing = true;
    const processQueue = async () => {
      if (this.queue.length > 0) {
        const notification = this.queue.shift();
        await this.sendNotification(notification);
      }
      
      if (this.processing) {
        setTimeout(processQueue, 1000); // 1秒处理一次
      }
    };
    
    processQueue();
  }

  /**
   * 停止队列处理器
   */
  stopQueueProcessor() {
    this.processing = false;
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    // 每小时清理一次过期通知
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理过期通知
   */
  cleanupExpiredNotifications() {
    try {
      const notifications = wx.getStorageSync('in_app_notifications') || [];
      const now = new Date();
      
      const validNotifications = notifications.filter(notification => {
        return !notification.expireTime || new Date(notification.expireTime) > now;
      });
      
      if (validNotifications.length !== notifications.length) {
        wx.setStorageSync('in_app_notifications', validNotifications);
        console.log('[NotificationService] 清理过期通知完成');
      }
    } catch (error) {
      console.error('[NotificationService] 清理过期通知失败:', error);
    }
  }

  /**
   * 安排重试
   */
  scheduleRetry(notification) {
    notification.retryCount++;
    const delay = NOTIFICATION_RETRY_CONFIG.retryIntervals[notification.retryCount - 1] || 
                  NOTIFICATION_RETRY_CONFIG.retryIntervals[NOTIFICATION_RETRY_CONFIG.retryIntervals.length - 1];
    
    setTimeout(() => {
      this.queue.push(notification);
    }, delay);
  }

  /**
   * 安排延迟发送
   */
  scheduleNotification(notification) {
    // 计算下一个可发送时间
    const nextSendTime = this.calculateNextSendTime();
    const delay = nextSendTime.getTime() - Date.now();
    
    setTimeout(() => {
      this.queue.push(notification);
    }, delay);
  }

  /**
   * 计算下一个发送时间
   */
  calculateNextSendTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 明天早上8点
    return tomorrow;
  }

  /**
   * 发送事件通知
   */
  emitNotificationEvent(eventType, data) {
    try {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof currentPage.onNotificationEvent === 'function') {
          currentPage.onNotificationEvent(eventType, data);
        }
      }
    } catch (error) {
      console.warn('[NotificationService] 发送事件通知失败:', error);
    }
  }

  /**
   * 保存通知日志
   */
  saveNotificationLog(notification, result, error = null) {
    try {
      const logs = wx.getStorageSync('notification_logs') || [];
      const log = {
        id: notification.id,
        type: notification.type,
        targetUser: notification.targetUser.id,
        result,
        error,
        timestamp: new Date().toISOString()
      };
      
      logs.unshift(log);
      
      // 限制日志数量
      const maxLogs = 500;
      if (logs.length > maxLogs) {
        logs.splice(maxLogs);
      }
      
      wx.setStorageSync('notification_logs', logs);
    } catch (error) {
      console.warn('[NotificationService] 保存通知日志失败:', error);
    }
  }

  /**
   * 发送验证码
   * @param {string} phone 手机号
   * @param {string} template 模板类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendVerificationCode(phone, template = 'verification') {
    if (!this.smsService) {
      throw new Error('短信服务未初始化');
    }
    
    return await this.smsService.sendVerificationCode(phone, template);
  }

  /**
   * 验证验证码
   * @param {string} phone 手机号
   * @param {string} code 验证码
   * @returns {boolean} 验证结果
   */
  verifyCode(phone, code) {
    if (!this.smsService) {
      return false;
    }
    
    return this.smsService.verifyCode(phone, code);
  }

  /**
   * 创建场景化通知
   * @param {string} scene 场景类型
   * @param {Object} data 场景数据
   * @returns {Object} 通知对象
   */
  createSceneNotification(scene, data) {
    const sceneConfigs = {
      // 预约确认场景
      appointmentConfirm: {
        type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRM,
        channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.SMS],
        priority: NOTIFICATION_PRIORITY.HIGH,
        templateId: 'tpl_appointment_confirm_wechat'
      },
      
      // 预约提醒场景
      appointmentReminder: {
        type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
        channels: [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE, NOTIFICATION_CHANNELS.IN_APP],
        priority: NOTIFICATION_PRIORITY.NORMAL,
        templateId: 'tpl_appointment_reminder_sms'
      },
      
      // 付款提醒场景
      paymentReminder: {
        type: NOTIFICATION_TYPES.PAYMENT_REMINDER,
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.SMS],
        priority: NOTIFICATION_PRIORITY.NORMAL,
        templateId: 'tpl_payment_reminder_app'
      },
      
      // 健康警报场景
      healthAlert: {
        type: NOTIFICATION_TYPES.HEALTH_ALERT,
        channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.SMS, NOTIFICATION_CHANNELS.IN_APP],
        priority: NOTIFICATION_PRIORITY.CRITICAL,
        templateId: 'tpl_health_alert_wechat'
      },
      
      // 服务完成场景
      serviceComplete: {
        type: NOTIFICATION_TYPES.SERVICE_COMPLETE,
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.WECHAT_TEMPLATE],
        priority: NOTIFICATION_PRIORITY.NORMAL,
        templateId: 'tpl_service_complete_app'
      },
      
      // 用药提醒场景
      medicationReminder: {
        type: NOTIFICATION_TYPES.MEDICATION_REMINDER,
        channels: [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE, NOTIFICATION_CHANNELS.IN_APP],
        priority: NOTIFICATION_PRIORITY.HIGH,
        templateId: 'tpl_medication_reminder_wechat'
      }
    };

    const config = sceneConfigs[scene];
    if (!config) {
      throw new Error(`不支持的场景类型: ${scene}`);
    }

    // 创建通知
    return this.createNotificationFromTemplate({
      type: config.type,
      targetUser: data.targetUser,
      data: data.notificationData,
      templateId: config.templateId,
      channels: config.channels,
      priority: config.priority
    });
  }

  /**
   * 批量发送通知
   * @param {Array} notifications 通知数组
   * @returns {Promise<Array>} 发送结果数组
   */
  async sendBatchNotifications(notifications) {
    const results = [];
    
    // 按优先级排序
    const sortedNotifications = notifications.sort((a, b) => b.priority - a.priority);
    
    // 分批发送，避免频率限制
    const batchSize = 10;
    for (let i = 0; i < sortedNotifications.length; i += batchSize) {
      const batch = sortedNotifications.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(notification => this.sendNotification(notification))
      );
      
      batchResults.forEach((result, index) => {
        const notification = batch[index];
        results.push({
          notificationId: notification.id,
          success: result.status === 'fulfilled' && result.value,
          error: result.status === 'rejected' ? result.reason : null
        });
      });
      
      // 批次间延迟，避免过快发送
      if (i + batchSize < sortedNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('[NotificationService] 批量发送完成:', results);
    return results;
  }

  /**
   * 获取通知统计
   * @param {Object} filters 筛选条件
   * @returns {Object} 统计信息
   */
  getNotificationStats(filters = {}) {
    try {
      const notifications = wx.getStorageSync('in_app_notifications') || [];
      const logs = wx.getStorageSync('notification_logs') || [];
      
      // 基础统计
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.readTime).length,
        read: notifications.filter(n => n.readTime).length,
        byType: {},
        byPriority: {},
        byStatus: {},
        recentActivity: []
      };
      
      // 按类型统计
      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
        stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
      });
      
      // 最近活动（最近7天的日志）
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      stats.recentActivity = logs
        .filter(log => new Date(log.timestamp).getTime() > sevenDaysAgo)
        .slice(0, 50);
      
      // 成功率统计
      const recentLogs = logs.slice(0, 100);
      const successCount = recentLogs.filter(log => log.result === 'success').length;
      stats.successRate = recentLogs.length > 0 ? (successCount / recentLogs.length * 100).toFixed(2) : 0;
      
      return stats;
    } catch (error) {
      console.error('[NotificationService] 获取统计失败:', error);
      return { total: 0, unread: 0, read: 0, successRate: 0 };
    }
  }

  /**
   * 清理通知
   * @param {Object} options 清理选项
   */
  async cleanupNotifications(options = {}) {
    const {
      olderThanDays = 30,
      maxCount = 1000,
      keepUnread = true
    } = options;
    
    try {
      const notifications = wx.getStorageSync('in_app_notifications') || [];
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      
      let filteredNotifications = notifications.filter(notification => {
        // 保留未读通知
        if (keepUnread && !notification.readTime) {
          return true;
        }
        
        // 保留指定天数内的通知
        const createdTime = new Date(notification.createdAt).getTime();
        return createdTime > cutoffTime;
      });
      
      // 如果数量仍然超限，按时间倒序保留最新的
      if (filteredNotifications.length > maxCount) {
        filteredNotifications = filteredNotifications
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, maxCount);
      }
      
      // 保存清理后的通知
      wx.setStorageSync('in_app_notifications', filteredNotifications);
      
      const cleanedCount = notifications.length - filteredNotifications.length;
      console.log('[NotificationService] 通知清理完成，清理数量:', cleanedCount);
      
      return {
        success: true,
        cleanedCount,
        remainingCount: filteredNotifications.length
      };
    } catch (error) {
      console.error('[NotificationService] 通知清理失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出通知数据
   * @param {Object} filters 筛选条件
   * @returns {Object} 导出数据
   */
  exportNotifications(filters = {}) {
    try {
      const notifications = wx.getStorageSync('in_app_notifications') || [];
      const logs = wx.getStorageSync('notification_logs') || [];
      
      let exportNotifications = [...notifications];
      
      // 应用筛选条件
      if (filters.type) {
        exportNotifications = exportNotifications.filter(n => n.type === filters.type);
      }
      
      if (filters.startDate) {
        const startTime = new Date(filters.startDate).getTime();
        exportNotifications = exportNotifications.filter(n => 
          new Date(n.createdAt).getTime() >= startTime
        );
      }
      
      if (filters.endDate) {
        const endTime = new Date(filters.endDate).getTime();
        exportNotifications = exportNotifications.filter(n => 
          new Date(n.createdAt).getTime() <= endTime
        );
      }
      
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        filters,
        notifications: exportNotifications,
        logs: logs.slice(0, 1000), // 最多导出1000条日志
        stats: this.getNotificationStats()
      };
    } catch (error) {
      console.error('[NotificationService] 导出通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取短信服务
   * @returns {SMSService} 短信服务实例
   */
  getSMSService() {
    return this.smsService;
  }

  /**
   * 获取模板管理器
   * @returns {TemplateManager} 模板管理器实例
   */
  getTemplateManager() {
    return this.templateManager;
  }

  /**
   * 获取微信消息服务
   * @returns {WechatMessageService} 微信消息服务实例
   */
  getWechatMessageService() {
    return this.wechatMessageService;
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.stopQueueProcessor();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.templateManager) {
      // 清理模板管理器资源
      this.templateManager = null;
    }
    if (this.smsService) {
      this.smsService.destroy();
      this.smsService = null;
    }
    this.queue = [];
    this.rateLimit.clear();
    this.retryCount.clear();
  }
}

export default NotificationService;