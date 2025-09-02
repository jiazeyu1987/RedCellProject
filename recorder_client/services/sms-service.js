/**
 * 短信服务类
 * 负责短信发送、验证码管理等功能
 */

const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS
} = require('../constants/notification-config.js');

const notificationAPI = require('../api/notification-api.js');

class SMSService {
  constructor() {
    this.providers = new Map(); // 短信服务商
    this.verificationCodes = new Map(); // 验证码缓存
    this.sendHistory = new Map(); // 发送历史
    this.config = {
      defaultProvider: 'aliyun',
      retryAttempts: 3,
      verificationCodeExpiry: 5 * 60 * 1000, // 5分钟
      rateLimits: {
        perMinute: 1,
        perHour: 5,
        perDay: 10
      }
    };
  }

  /**
   * 初始化短信服务
   */
  async init() {
    try {
      console.log('[SMSService] 初始化短信服务...');
      
      // 加载服务商配置
      await this.loadProviderConfig();
      
      // 初始化默认服务商
      await this.initializeProviders();
      
      // 清理过期验证码
      this.startCleanupTimer();
      
      console.log('[SMSService] 短信服务初始化完成');
      return true;
    } catch (error) {
      console.error('[SMSService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 发送短信
   * @param {Object} notification 通知对象
   * @returns {Promise<boolean>} 发送结果
   */
  async sendSMS(notification) {
    try {
      console.log('[SMSService] 发送短信:', notification.id);

      // 检查发送频率限制
      if (!this.checkRateLimit(notification.targetUser.phone)) {
        throw new Error('发送频率超限，请稍后再试');
      }

      // 构建短信数据
      const smsData = this.buildSMSData(notification);
      if (!smsData) {
        throw new Error('构建短信数据失败');
      }

      // 选择服务商
      const provider = this.selectProvider();
      
      // 发送短信
      const result = await this.sendBySProvider(provider, smsData);
      
      if (result.success) {
        console.log('[SMSService] 短信发送成功:', result);
        
        // 更新发送历史
        this.updateSendHistory(notification.targetUser.phone, true);
        
        // 更新通知状态
        this.updateNotificationStatus(notification, 'sent', {
          messageId: result.messageId,
          provider: provider,
          channel: 'sms'
        });
        
        return true;
      } else {
        throw new Error(result.message || '短信发送失败');
      }

    } catch (error) {
      console.error('[SMSService] 短信发送失败:', error);
      
      // 更新发送历史
      this.updateSendHistory(notification.targetUser.phone, false, error.message);
      
      // 记录发送失败
      this.updateNotificationStatus(notification, 'failed', {
        error: error.message,
        channel: 'sms'
      });
      
      return false;
    }
  }

  /**
   * 发送验证码
   * @param {string} phone 手机号
   * @param {string} template 模板类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendVerificationCode(phone, template = 'verification') {
    try {
      console.log('[SMSService] 发送验证码:', phone);

      // 检查手机号格式
      if (!this.validatePhone(phone)) {
        throw new Error('手机号格式不正确');
      }

      // 检查发送频率
      if (!this.checkVerificationCodeLimit(phone)) {
        throw new Error('验证码发送过于频繁，请稍后再试');
      }

      // 生成验证码
      const code = this.generateVerificationCode();
      
      // 构建短信内容
      const content = this.buildVerificationContent(code, template);
      
      // 发送短信
      const smsData = {
        phone,
        content,
        template,
        type: 'verification'
      };

      const provider = this.selectProvider();
      const result = await this.sendBySProvider(provider, smsData);
      
      if (result.success) {
        // 缓存验证码
        this.cacheVerificationCode(phone, code);
        
        console.log('[SMSService] 验证码发送成功');
        return {
          success: true,
          messageId: result.messageId,
          expiry: this.config.verificationCodeExpiry
        };
      } else {
        throw new Error(result.message || '验证码发送失败');
      }

    } catch (error) {
      console.error('[SMSService] 验证码发送失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证验证码
   * @param {string} phone 手机号
   * @param {string} code 验证码
   * @returns {boolean} 验证结果
   */
  verifyCode(phone, code) {
    try {
      const cacheKey = this.getVerificationKey(phone);
      const cachedData = this.verificationCodes.get(cacheKey);
      
      if (!cachedData) {
        return false; // 验证码不存在
      }
      
      // 检查是否过期
      if (Date.now() > cachedData.expiry) {
        this.verificationCodes.delete(cacheKey);
        return false; // 验证码已过期
      }
      
      // 验证码码
      if (cachedData.code !== code) {
        // 增加失败次数
        cachedData.attempts = (cachedData.attempts || 0) + 1;
        
        // 失败次数过多，删除验证码
        if (cachedData.attempts >= 3) {
          this.verificationCodes.delete(cacheKey);
        }
        
        return false; // 验证码错误
      }
      
      // 验证成功，删除验证码
      this.verificationCodes.delete(cacheKey);
      
      console.log('[SMSService] 验证码验证成功:', phone);
      return true;
      
    } catch (error) {
      console.error('[SMSService] 验证码验证失败:', error);
      return false;
    }
  }

  /**
   * 通过服务商发送短信
   * @param {string} provider 服务商名称
   * @param {Object} smsData 短信数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendBySProvider(provider, smsData) {
    switch (provider) {
      case 'aliyun':
        return await this.sendByAliyun(smsData);
      case 'tencent':
        return await this.sendByTencent(smsData);
      case 'mock':
        return await this.sendByMock(smsData);
      default:
        throw new Error('不支持的短信服务商');
    }
  }

  /**
   * 阿里云短信发送
   * @param {Object} smsData 短信数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendByAliyun(smsData) {
    try {
      // 调用后端API发送
      const result = await notificationAPI.sendSMS({
        provider: 'aliyun',
        ...smsData
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        message: result.message
      };
    } catch (error) {
      console.error('[SMSService] 阿里云短信发送失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 腾讯云短信发送
   * @param {Object} smsData 短信数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendByTencent(smsData) {
    try {
      // 调用后端API发送
      const result = await notificationAPI.sendSMS({
        provider: 'tencent',
        ...smsData
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        message: result.message
      };
    } catch (error) {
      console.error('[SMSService] 腾讯云短信发送失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 模拟短信发送（开发环境）
   * @param {Object} smsData 短信数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendByMock(smsData) {
    console.log('[SMSService] 模拟短信发送:', smsData);
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      message: '模拟发送成功'
    };
  }

  /**
   * 构建短信数据
   * @param {Object} notification 通知对象
   * @returns {Object} 短信数据
   */
  buildSMSData(notification) {
    try {
      const phone = notification.targetUser.phone;
      if (!phone) {
        throw new Error('目标用户手机号缺失');
      }

      // 获取短信模板
      const template = this.getSMSTemplate(notification.type);
      
      return {
        phone,
        content: notification.content,
        template: template,
        type: notification.type,
        priority: notification.priority,
        data: notification.data
      };
    } catch (error) {
      console.error('[SMSService] 构建短信数据失败:', error);
      return null;
    }
  }

  /**
   * 获取短信模板
   * @param {string} notificationType 通知类型
   * @returns {string} 模板ID
   */
  getSMSTemplate(notificationType) {
    const templates = {
      [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: 'SMS_001',
      [NOTIFICATION_TYPES.APPOINTMENT_CHANGE]: 'SMS_002',
      [NOTIFICATION_TYPES.PAYMENT_REMINDER]: 'SMS_003',
      [NOTIFICATION_TYPES.HEALTH_ALERT]: 'SMS_004',
      verification: 'SMS_VERIFY'
    };
    
    return templates[notificationType] || 'SMS_DEFAULT';
  }

  /**
   * 生成验证码
   * @returns {string} 6位数验证码
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 构建验证码短信内容
   * @param {string} code 验证码
   * @param {string} template 模板类型
   * @returns {string} 短信内容
   */
  buildVerificationContent(code, template) {
    const templates = {
      verification: `【健康护理】您的验证码是${code}，5分钟内有效，请勿泄露给他人。`,
      login: `【健康护理】您正在登录，验证码${code}，5分钟内有效。`,
      register: `【健康护理】欢迎注册，验证码${code}，5分钟内有效。`,
      reset: `【健康护理】您正在重置密码，验证码${code}，5分钟内有效。`
    };
    
    return templates[template] || templates.verification;
  }

  /**
   * 缓存验证码
   * @param {string} phone 手机号
   * @param {string} code 验证码
   */
  cacheVerificationCode(phone, code) {
    const key = this.getVerificationKey(phone);
    const expiry = Date.now() + this.config.verificationCodeExpiry;
    
    this.verificationCodes.set(key, {
      code,
      expiry,
      attempts: 0,
      createdAt: Date.now()
    });
  }

  /**
   * 获取验证码缓存键
   * @param {string} phone 手机号
   * @returns {string} 缓存键
   */
  getVerificationKey(phone) {
    return `verify_${phone}`;
  }

  /**
   * 验证手机号格式
   * @param {string} phone 手机号
   * @returns {boolean} 是否有效
   */
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 检查发送频率限制
   * @param {string} phone 手机号
   * @returns {boolean} 是否允许发送
   */
  checkRateLimit(phone) {
    const history = this.sendHistory.get(phone) || {
      lastSent: 0,
      dailyCount: 0,
      hourlyCount: 0,
      minuteCount: 0,
      lastResetDay: 0,
      lastResetHour: 0,
      lastResetMinute: 0
    };
    
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;
    
    // 重置计数器
    if (now - history.lastResetDay > oneDay) {
      history.dailyCount = 0;
      history.lastResetDay = now;
    }
    
    if (now - history.lastResetHour > oneHour) {
      history.hourlyCount = 0;
      history.lastResetHour = now;
    }
    
    if (now - history.lastResetMinute > oneMinute) {
      history.minuteCount = 0;
      history.lastResetMinute = now;
    }
    
    // 检查限制
    if (history.minuteCount >= this.config.rateLimits.perMinute) return false;
    if (history.hourlyCount >= this.config.rateLimits.perHour) return false;
    if (history.dailyCount >= this.config.rateLimits.perDay) return false;
    
    return true;
  }

  /**
   * 检查验证码发送限制
   * @param {string} phone 手机号
   * @returns {boolean} 是否允许发送
   */
  checkVerificationCodeLimit(phone) {
    const key = this.getVerificationKey(phone);
    const cached = this.verificationCodes.get(key);
    
    // 如果已有未过期的验证码，且时间间隔小于1分钟，不允许重发
    if (cached && Date.now() - cached.createdAt < 60 * 1000) {
      return false;
    }
    
    return this.checkRateLimit(phone);
  }

  /**
   * 更新发送历史
   * @param {string} phone 手机号
   * @param {boolean} success 是否成功
   * @param {string} error 错误信息
   */
  updateSendHistory(phone, success, error = null) {
    const history = this.sendHistory.get(phone) || {
      lastSent: 0,
      dailyCount: 0,
      hourlyCount: 0,
      minuteCount: 0,
      lastResetDay: Date.now(),
      lastResetHour: Date.now(),
      lastResetMinute: Date.now(),
      totalSent: 0,
      successCount: 0
    };
    
    const now = Date.now();
    
    // 更新计数
    history.lastSent = now;
    history.totalSent++;
    history.minuteCount++;
    history.hourlyCount++;
    history.dailyCount++;
    
    if (success) {
      history.successCount++;
    }
    
    this.sendHistory.set(phone, history);
  }

  /**
   * 选择服务商
   * @returns {string} 服务商名称
   */
  selectProvider() {
    // 简单的负载均衡逻辑
    const providers = Array.from(this.providers.keys());
    if (providers.length === 0) {
      return 'mock'; // 默认使用模拟服务商
    }
    
    // 选择可用的服务商
    for (const provider of providers) {
      const config = this.providers.get(provider);
      if (config.enabled && !config.maintenance) {
        return provider;
      }
    }
    
    return this.config.defaultProvider;
  }

  /**
   * 加载服务商配置
   */
  async loadProviderConfig() {
    try {
      const config = wx.getStorageSync('sms_provider_config') || {};
      
      // 默认配置
      const defaultConfig = {
        aliyun: {
          enabled: true,
          priority: 1,
          maintenance: false
        },
        tencent: {
          enabled: false,
          priority: 2,
          maintenance: false
        },
        mock: {
          enabled: true,
          priority: 999,
          maintenance: false
        }
      };
      
      // 合并配置
      this.config.providers = { ...defaultConfig, ...config };
    } catch (error) {
      console.warn('[SMSService] 加载服务商配置失败:', error);
    }
  }

  /**
   * 初始化服务商
   */
  async initializeProviders() {
    const config = this.config.providers || {};
    
    Object.entries(config).forEach(([provider, providerConfig]) => {
      if (providerConfig.enabled) {
        this.providers.set(provider, providerConfig);
      }
    });
    
    console.log('[SMSService] 已初始化服务商:', Array.from(this.providers.keys()));
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    // 每5分钟清理一次过期验证码
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCodes();
    }, 5 * 60 * 1000);
  }

  /**
   * 清理过期验证码
   */
  cleanupExpiredCodes() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, data] of this.verificationCodes.entries()) {
      if (now > data.expiry) {
        this.verificationCodes.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log('[SMSService] 清理过期验证码:', cleaned);
    }
  }

  /**
   * 更新通知状态
   * @param {Object} notification 通知对象
   * @param {string} status 状态
   * @param {Object} metadata 元数据
   */
  updateNotificationStatus(notification, status, metadata = {}) {
    notification.status = status;
    notification.metadata = {
      ...notification.metadata,
      ...metadata,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 获取发送统计
   * @param {string} phone 手机号（可选）
   * @returns {Object} 统计信息
   */
  getSendStats(phone = null) {
    if (phone) {
      const history = this.sendHistory.get(phone);
      if (!history) {
        return { totalSent: 0, successCount: 0, successRate: 0 };
      }
      
      return {
        totalSent: history.totalSent,
        successCount: history.successCount,
        successRate: history.totalSent > 0 ? (history.successCount / history.totalSent * 100).toFixed(2) : 0,
        lastSent: history.lastSent
      };
    }
    
    // 全局统计
    let totalSent = 0;
    let successCount = 0;
    
    for (const history of this.sendHistory.values()) {
      totalSent += history.totalSent;
      successCount += history.successCount;
    }
    
    return {
      totalSent,
      successCount,
      successRate: totalSent > 0 ? (successCount / totalSent * 100).toFixed(2) : 0,
      uniqueUsers: this.sendHistory.size
    };
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.providers.clear();
    this.verificationCodes.clear();
    this.sendHistory.clear();
    
    console.log('[SMSService] 短信服务已销毁');
  }
}

module.exports = SMSService;