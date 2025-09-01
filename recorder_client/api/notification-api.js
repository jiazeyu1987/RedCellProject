/**
 * 通知相关API接口
 * 提供与服务器通信的通知相关接口
 */

import httpService from '../services/http.service.js';

class NotificationAPI {
  /**
   * 发送通知请求
   * @param {Object} notificationData 通知数据
   * @returns {Promise} API响应
   */
  async sendNotification(notificationData) {
    try {
      return await httpService.post('/api/notifications/send', notificationData);
    } catch (error) {
      console.error('[NotificationAPI] 发送通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param {Object} params 查询参数
   * @returns {Promise} API响应
   */
  async getUserNotifications(params = {}) {
    try {
      return await httpService.get('/api/notifications/user', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取用户通知失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId 通知ID
   * @returns {Promise} API响应
   */
  async markAsRead(notificationId) {
    try {
      return await httpService.put(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('[NotificationAPI] 标记通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 批量标记通知为已读
   * @param {Array} notificationIds 通知ID数组
   * @returns {Promise} API响应
   */
  async batchMarkAsRead(notificationIds) {
    try {
      return await httpService.put('/api/notifications/batch-read', { 
        notificationIds 
      });
    } catch (error) {
      console.error('[NotificationAPI] 批量标记通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {string} notificationId 通知ID
   * @returns {Promise} API响应
   */
  async deleteNotification(notificationId) {
    try {
      return await httpService.delete(`/api/notifications/${notificationId}`);
    } catch (error) {
      console.error('[NotificationAPI] 删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知设置
   * @returns {Promise} API响应
   */
  async getNotificationSettings() {
    try {
      return await httpService.get('/api/notifications/settings');
    } catch (error) {
      console.error('[NotificationAPI] 获取通知设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新通知设置
   * @param {Object} settings 通知设置
   * @returns {Promise} API响应
   */
  async updateNotificationSettings(settings) {
    try {
      return await httpService.put('/api/notifications/settings', settings);
    } catch (error) {
      console.error('[NotificationAPI] 更新通知设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知模板
   * @param {string} templateType 模板类型
   * @returns {Promise} API响应
   */
  async getNotificationTemplate(templateType) {
    try {
      return await httpService.get(`/api/notifications/templates/${templateType}`);
    } catch (error) {
      console.error('[NotificationAPI] 获取通知模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知统计
   * @param {Object} params 查询参数
   * @returns {Promise} API响应
   */
  async getNotificationStats(params = {}) {
    try {
      return await httpService.get('/api/notifications/stats', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取通知统计失败:', error);
      throw error;
    }
  }

  /**
   * 发送微信模板消息
   * @param {Object} templateData 模板数据
   * @returns {Promise} API响应
   */
  async sendWechatTemplate(templateData) {
    try {
      return await httpService.post('/api/notifications/wechat/template', templateData);
    } catch (error) {
      console.error('[NotificationAPI] 发送微信模板消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送微信订阅消息
   * @param {Object} subscribeData 订阅消息数据
   * @returns {Promise} API响应
   */
  async sendWechatSubscribe(subscribeData) {
    try {
      return await httpService.post('/api/notifications/wechat/subscribe', subscribeData);
    } catch (error) {
      console.error('[NotificationAPI] 发送微信订阅消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送短信
   * @param {Object} smsData 短信数据
   * @returns {Promise} API响应
   */
  async sendSMS(smsData) {
    try {
      return await httpService.post('/api/notifications/sms/send', smsData);
    } catch (error) {
      console.error('[NotificationAPI] 发送短信失败:', error);
      throw error;
    }
  }

  /**
   * 验证手机号并发送验证码
   * @param {string} phone 手机号
   * @returns {Promise} API响应
   */
  async sendVerificationCode(phone) {
    try {
      return await httpService.post('/api/notifications/sms/verify-code', { phone });
    } catch (error) {
      console.error('[NotificationAPI] 发送验证码失败:', error);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param {string} phone 手机号
   * @param {string} code 验证码
   * @returns {Promise} API响应
   */
  async verifyCode(phone, code) {
    try {
      return await httpService.post('/api/notifications/sms/verify', { phone, code });
    } catch (error) {
      console.error('[NotificationAPI] 验证码验证失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知发送日志
   * @param {Object} params 查询参数
   * @returns {Promise} API响应
   */
  async getNotificationLogs(params = {}) {
    try {
      return await httpService.get('/api/notifications/logs', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取通知日志失败:', error);
      throw error;
    }
  }

  /**
   * 重发失败的通知
   * @param {string} notificationId 通知ID
   * @returns {Promise} API响应
   */
  async resendNotification(notificationId) {
    try {
      return await httpService.post(`/api/notifications/${notificationId}/resend`);
    } catch (error) {
      console.error('[NotificationAPI] 重发通知失败:', error);
      throw error;
    }
  }
}

export default new NotificationAPI();