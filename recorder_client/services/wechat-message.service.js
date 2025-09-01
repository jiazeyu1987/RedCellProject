/**
 * 微信消息推送服务
 * 实现微信模板消息、订阅消息、服务号消息等功能
 */

import { 
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS 
} from '../constants/notification-config.js';

import notificationAPI from '../api/notification-api.js';

class WechatMessageService {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = null;
    this.templateIds = new Map(); // 模板ID映射
    this.subscribeTemplates = new Map(); // 订阅消息模板
  }

  /**
   * 初始化微信消息服务
   */
  async init() {
    try {
      console.log('[WechatMessageService] 初始化微信消息服务...');
      
      // 加载模板配置
      await this.loadTemplateConfig();
      
      // 预热AccessToken（如果需要）
      // await this.refreshAccessToken();
      
      console.log('[WechatMessageService] 微信消息服务初始化完成');
      return true;
    } catch (error) {
      console.error('[WechatMessageService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 发送微信模板消息
   * @param {Object} notification 通知对象
   * @returns {Promise<boolean>} 发送结果
   */
  async sendTemplateMessage(notification) {
    try {
      console.log('[WechatMessageService] 发送模板消息:', notification.id);

      // 构建模板消息数据
      const templateData = this.buildTemplateData(notification);
      if (!templateData) {
        throw new Error('构建模板数据失败');
      }

      // 调用后端API发送
      const result = await notificationAPI.sendWechatTemplate(templateData);
      
      if (result.success) {
        console.log('[WechatMessageService] 模板消息发送成功:', result.msgid);
        
        // 更新通知状态
        this.updateNotificationStatus(notification, 'sent', {
          msgid: result.msgid,
          channel: 'wechat_template'
        });
        
        return true;
      } else {
        throw new Error(result.message || '模板消息发送失败');
      }

    } catch (error) {
      console.error('[WechatMessageService] 模板消息发送失败:', error);
      
      // 记录发送失败
      this.updateNotificationStatus(notification, 'failed', {
        error: error.message,
        channel: 'wechat_template'
      });
      
      return false;
    }
  }

  /**
   * 发送微信订阅消息
   * @param {Object} notification 通知对象
   * @returns {Promise<boolean>} 发送结果
   */
  async sendSubscribeMessage(notification) {
    try {
      console.log('[WechatMessageService] 发送订阅消息:', notification.id);

      // 检查用户订阅状态
      const hasSubscription = await this.checkUserSubscription(
        notification.targetUser.openid,
        notification.type
      );

      if (!hasSubscription) {
        console.warn('[WechatMessageService] 用户未订阅该类型消息');
        return false;
      }

      // 构建订阅消息数据
      const subscribeData = this.buildSubscribeData(notification);
      if (!subscribeData) {
        throw new Error('构建订阅消息数据失败');
      }

      // 调用后端API发送
      const result = await notificationAPI.sendWechatSubscribe(subscribeData);
      
      if (result.success) {
        console.log('[WechatMessageService] 订阅消息发送成功:', result.msgid);
        
        // 更新通知状态
        this.updateNotificationStatus(notification, 'sent', {
          msgid: result.msgid,
          channel: 'wechat_subscribe'
        });
        
        return true;
      } else {
        throw new Error(result.message || '订阅消息发送失败');
      }

    } catch (error) {
      console.error('[WechatMessageService] 订阅消息发送失败:', error);
      
      // 记录发送失败
      this.updateNotificationStatus(notification, 'failed', {
        error: error.message,
        channel: 'wechat_subscribe'
      });
      
      return false;
    }
  }

  /**
   * 发送服务号消息
   * @param {Object} notification 通知对象
   * @returns {Promise<boolean>} 发送结果
   */
  async sendServiceMessage(notification) {
    try {
      console.log('[WechatMessageService] 发送服务号消息:', notification.id);

      // 构建服务号消息数据
      const serviceData = this.buildServiceMessageData(notification);
      if (!serviceData) {
        throw new Error('构建服务号消息数据失败');
      }

      // 调用后端API发送
      const result = await this.sendCustomMessage(serviceData);
      
      if (result.success) {
        console.log('[WechatMessageService] 服务号消息发送成功');
        
        // 更新通知状态
        this.updateNotificationStatus(notification, 'sent', {
          channel: 'wechat_service'
        });
        
        return true;
      } else {
        throw new Error(result.message || '服务号消息发送失败');
      }

    } catch (error) {
      console.error('[WechatMessageService] 服务号消息发送失败:', error);
      
      // 记录发送失败
      this.updateNotificationStatus(notification, 'failed', {
        error: error.message,
        channel: 'wechat_service'
      });
      
      return false;
    }
  }

  /**
   * 构建模板消息数据
   * @param {Object} notification 通知对象
   * @returns {Object} 模板消息数据
   */
  buildTemplateData(notification) {
    try {
      // 获取模板ID
      const templateId = this.getTemplateId(notification.type, 'template');
      if (!templateId) {
        console.warn('[WechatMessageService] 未找到模板ID:', notification.type);
        return null;
      }

      // 构建模板数据
      const templateData = {
        touser: notification.targetUser.openid,
        template_id: templateId,
        url: this.buildJumpUrl(notification),
        miniprogram: this.buildMiniprogramData(notification),
        data: this.buildTemplateFieldData(notification)
      };

      return templateData;
    } catch (error) {
      console.error('[WechatMessageService] 构建模板数据失败:', error);
      return null;
    }
  }

  /**
   * 构建订阅消息数据
   * @param {Object} notification 通知对象
   * @returns {Object} 订阅消息数据
   */
  buildSubscribeData(notification) {
    try {
      // 获取订阅模板ID
      const templateId = this.getTemplateId(notification.type, 'subscribe');
      if (!templateId) {
        console.warn('[WechatMessageService] 未找到订阅模板ID:', notification.type);
        return null;
      }

      // 构建订阅消息数据
      const subscribeData = {
        touser: notification.targetUser.openid,
        template_id: templateId,
        page: this.buildPagePath(notification),
        data: this.buildSubscribeFieldData(notification),
        miniprogram_state: 'formal', // developer, trial, formal
        lang: 'zh_CN'
      };

      return subscribeData;
    } catch (error) {
      console.error('[WechatMessageService] 构建订阅消息数据失败:', error);
      return null;
    }
  }

  /**
   * 构建服务号消息数据
   * @param {Object} notification 通知对象
   * @returns {Object} 服务号消息数据
   */
  buildServiceMessageData(notification) {
    try {
      const messageData = {
        touser: notification.targetUser.openid,
        msgtype: 'text', // text, image, voice, video, music, news, mpnews, wxcard
        text: {
          content: `${notification.title}\n\n${notification.content}`
        }
      };

      // 如果是图文消息
      if (notification.data.articles) {
        messageData.msgtype = 'news';
        messageData.news = {
          articles: notification.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            url: article.url,
            picurl: article.picurl
          }))
        };
      }

      return messageData;
    } catch (error) {
      console.error('[WechatMessageService] 构建服务号消息数据失败:', error);
      return null;
    }
  }

  /**
   * 构建模板字段数据
   * @param {Object} notification 通知对象
   * @returns {Object} 模板字段数据
   */
  buildTemplateFieldData(notification) {
    const data = {};
    const notificationData = notification.data || {};

    // 根据通知类型构建不同的字段
    switch (notification.type) {
      case NOTIFICATION_TYPES.APPOINTMENT_CONFIRM:
        data.first = { value: '您的预约已确认', color: '#173177' };
        data.keyword1 = { value: notificationData.service?.type || '护理服务', color: '#173177' };
        data.keyword2 = { value: this.formatDate(notificationData.appointment?.date), color: '#173177' };
        data.keyword3 = { value: notificationData.user?.address || '', color: '#173177' };
        data.remark = { value: '我们的护理人员将准时为您提供服务！', color: '#173177' };
        break;

      case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        data.first = { value: '服务提醒', color: '#173177' };
        data.keyword1 = { value: notificationData.service?.type || '护理服务', color: '#173177' };
        data.keyword2 = { value: this.formatDate(notificationData.appointment?.date), color: '#173177' };
        data.keyword3 = { value: notificationData.user?.name || '', color: '#173177' };
        data.remark = { value: '请您准备好相关物品，我们即将为您提供服务。', color: '#173177' };
        break;

      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        data.first = { value: '付款提醒', color: '#173177' };
        data.keyword1 = { value: notificationData.payment?.orderNo || '', color: '#173177' };
        data.keyword2 = { value: `¥${notificationData.payment?.amount || 0}`, color: '#FF6B6B' };
        data.keyword3 = { value: this.formatDate(notificationData.payment?.dueDate), color: '#173177' };
        data.remark = { value: '为了不影响后续服务，请及时完成支付。', color: '#173177' };
        break;

      case NOTIFICATION_TYPES.HEALTH_ALERT:
        data.first = { value: '健康警报', color: '#FF6B6B' };
        data.keyword1 = { value: notificationData.health?.item || '', color: '#173177' };
        data.keyword2 = { value: notificationData.health?.value || '', color: '#FF6B6B' };
        data.keyword3 = { value: notificationData.health?.normalRange || '', color: '#173177' };
        data.remark = { value: '请立即联系医护人员或前往医院检查！', color: '#FF6B6B' };
        break;

      default:
        data.first = { value: notification.title, color: '#173177' };
        data.keyword1 = { value: notification.content, color: '#173177' };
        data.remark = { value: '如有疑问，请联系客服。', color: '#173177' };
    }

    return data;
  }

  /**
   * 构建订阅消息字段数据
   * @param {Object} notification 通知对象
   * @returns {Object} 订阅消息字段数据
   */
  buildSubscribeFieldData(notification) {
    const data = {};
    const notificationData = notification.data || {};

    // 订阅消息字段相对简单
    switch (notification.type) {
      case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        data.thing1 = { value: notificationData.service?.type || '护理服务' };
        data.time2 = { value: this.formatDate(notificationData.appointment?.date) };
        data.thing3 = { value: notificationData.user?.address || '' };
        break;

      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        data.character_string1 = { value: notificationData.payment?.orderNo || '' };
        data.amount2 = { value: `¥${notificationData.payment?.amount || 0}` };
        data.time3 = { value: this.formatDate(notificationData.payment?.dueDate) };
        break;

      default:
        data.thing1 = { value: notification.title };
        data.thing2 = { value: notification.content };
    }

    return data;
  }

  /**
   * 构建跳转URL
   * @param {Object} notification 通知对象
   * @returns {string} 跳转URL
   */
  buildJumpUrl(notification) {
    const baseUrl = 'https://your-domain.com/h5';
    
    switch (notification.type) {
      case NOTIFICATION_TYPES.APPOINTMENT_CONFIRM:
      case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        return `${baseUrl}/appointment/${notification.data.appointment?.id}`;
      
      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        return `${baseUrl}/payment/${notification.data.payment?.orderNo}`;
      
      case NOTIFICATION_TYPES.HEALTH_ALERT:
        return `${baseUrl}/health/${notification.data.health?.recordId}`;
      
      default:
        return `${baseUrl}/notifications/${notification.id}`;
    }
  }

  /**
   * 构建小程序数据
   * @param {Object} notification 通知对象
   * @returns {Object} 小程序数据
   */
  buildMiniprogramData(notification) {
    return {
      appid: 'your-miniprogram-appid', // 替换为实际的小程序AppID
      pagepath: this.buildPagePath(notification)
    };
  }

  /**
   * 构建页面路径
   * @param {Object} notification 通知对象
   * @returns {string} 页面路径
   */
  buildPagePath(notification) {
    switch (notification.type) {
      case NOTIFICATION_TYPES.APPOINTMENT_CONFIRM:
      case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
        return `pages/schedule/schedule?id=${notification.data.appointment?.id}`;
      
      case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        return `pages/payment/payment?orderNo=${notification.data.payment?.orderNo}`;
      
      case NOTIFICATION_TYPES.HEALTH_ALERT:
        return `pages/health/health?recordId=${notification.data.health?.recordId}`;
      
      default:
        return 'pages/index/index';
    }
  }

  /**
   * 获取模板ID
   * @param {string} notificationType 通知类型
   * @param {string} messageType 消息类型 (template|subscribe)
   * @returns {string} 模板ID
   */
  getTemplateId(notificationType, messageType) {
    const key = `${notificationType}_${messageType}`;
    return this.templateIds.get(key);
  }

  /**
   * 检查用户订阅状态
   * @param {string} openid 用户openid
   * @param {string} notificationType 通知类型
   * @returns {Promise<boolean>} 是否已订阅
   */
  async checkUserSubscription(openid, notificationType) {
    try {
      // 从本地存储检查订阅状态
      const subscriptions = wx.getStorageSync('user_subscriptions') || {};
      const userSubs = subscriptions[openid] || {};
      
      // 检查是否有该类型的有效订阅
      const subscription = userSubs[notificationType];
      if (!subscription) return false;
      
      // 检查订阅是否过期
      const now = Date.now();
      if (subscription.expireTime && now > subscription.expireTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[WechatMessageService] 检查订阅状态失败:', error);
      return false;
    }
  }

  /**
   * 请求用户订阅
   * @param {string} templateId 模板ID
   * @returns {Promise<boolean>} 订阅结果
   */
  async requestSubscribe(templateId) {
    try {
      const result = await wx.requestSubscribeMessage({
        tmplIds: [templateId]
      });
      
      const subscribed = result[templateId] === 'accept';
      
      if (subscribed) {
        // 保存订阅状态
        this.saveSubscriptionStatus(templateId, true);
        console.log('[WechatMessageService] 用户同意订阅:', templateId);
      } else {
        console.log('[WechatMessageService] 用户拒绝订阅:', templateId);
      }
      
      return subscribed;
    } catch (error) {
      console.error('[WechatMessageService] 请求订阅失败:', error);
      return false;
    }
  }

  /**
   * 保存订阅状态
   * @param {string} templateId 模板ID
   * @param {boolean} subscribed 是否订阅
   */
  saveSubscriptionStatus(templateId, subscribed) {
    try {
      const userInfo = wx.getStorageSync('user_info') || {};
      const openid = userInfo.openid;
      
      if (!openid) return;
      
      const subscriptions = wx.getStorageSync('user_subscriptions') || {};
      if (!subscriptions[openid]) {
        subscriptions[openid] = {};
      }
      
      // 根据模板ID确定通知类型
      const notificationType = this.getNotificationTypeByTemplateId(templateId);
      
      if (subscribed) {
        subscriptions[openid][notificationType] = {
          templateId,
          subscribedAt: Date.now(),
          expireTime: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1年有效期
        };
      } else {
        delete subscriptions[openid][notificationType];
      }
      
      wx.setStorageSync('user_subscriptions', subscriptions);
    } catch (error) {
      console.error('[WechatMessageService] 保存订阅状态失败:', error);
    }
  }

  /**
   * 发送客服消息
   * @param {Object} messageData 消息数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendCustomMessage(messageData) {
    // 这里应该调用后端API
    // 暂时返回模拟结果
    return {
      success: true,
      message: '客服消息发送成功'
    };
  }

  /**
   * 格式化日期
   * @param {string|Date} date 日期
   * @returns {string} 格式化后的日期
   */
  formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  /**
   * 根据模板ID获取通知类型
   * @param {string} templateId 模板ID
   * @returns {string} 通知类型
   */
  getNotificationTypeByTemplateId(templateId) {
    // 反向查找映射
    for (const [key, value] of this.templateIds.entries()) {
      if (value === templateId) {
        return key.split('_')[0];
      }
    }
    return 'unknown';
  }

  /**
   * 更新通知状态
   * @param {Object} notification 通知对象
   * @param {string} status 状态
   * @param {Object} metadata 元数据
   */
  updateNotificationStatus(notification, status, metadata = {}) {
    try {
      notification.status = status;
      notification.updatedAt = new Date();
      
      if (status === 'sent') {
        notification.sentTime = new Date();
      }
      
      // 更新元数据
      Object.assign(notification.metadata, metadata);
      
      // 触发状态更新事件
      this.emitStatusUpdateEvent(notification);
    } catch (error) {
      console.error('[WechatMessageService] 更新通知状态失败:', error);
    }
  }

  /**
   * 触发状态更新事件
   * @param {Object} notification 通知对象
   */
  emitStatusUpdateEvent(notification) {
    try {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof currentPage.onNotificationStatusUpdate === 'function') {
          currentPage.onNotificationStatusUpdate(notification);
        }
      }
    } catch (error) {
      console.warn('[WechatMessageService] 触发状态更新事件失败:', error);
    }
  }

  /**
   * 加载模板配置
   */
  async loadTemplateConfig() {
    try {
      // 从配置文件或服务器加载模板ID映射
      const config = {
        // 模板消息
        [NOTIFICATION_TYPES.APPOINTMENT_CONFIRM + '_template']: 'template_id_001',
        [NOTIFICATION_TYPES.APPOINTMENT_REMINDER + '_template']: 'template_id_002',
        [NOTIFICATION_TYPES.PAYMENT_REMINDER + '_template']: 'template_id_003',
        [NOTIFICATION_TYPES.HEALTH_ALERT + '_template']: 'template_id_004',
        
        // 订阅消息
        [NOTIFICATION_TYPES.APPOINTMENT_REMINDER + '_subscribe']: 'subscribe_id_001',
        [NOTIFICATION_TYPES.PAYMENT_REMINDER + '_subscribe']: 'subscribe_id_002',
        [NOTIFICATION_TYPES.SERVICE_COMPLETE + '_subscribe']: 'subscribe_id_003'
      };
      
      // 加载到内存
      for (const [key, value] of Object.entries(config)) {
        this.templateIds.set(key, value);
      }
      
      console.log('[WechatMessageService] 模板配置加载完成');
    } catch (error) {
      console.error('[WechatMessageService] 加载模板配置失败:', error);
    }
  }
}

export default WechatMessageService;