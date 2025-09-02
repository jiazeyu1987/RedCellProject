/**
 * 通知相关API接口
 * 提供与服务器通信的通知相关接口
 */

const httpService = require('../services/http.service.js');

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

  // ============= 通知数据分析相关API =============
  
  /**
   * 获取通知阅读率分析
   * @param {Object} params 分析参数
   * @returns {Promise} API响应
   */
  async getNotificationReadRateAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/read-rate', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取阅读率分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知点击率分析
   * @param {Object} params 分析参数
   * @returns {Promise} API响应
   */
  async getNotificationClickRateAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/click-rate', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取点击率分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知转化率分析
   * @param {Object} params 分析参数
   * @returns {Promise} API响应
   */
  async getNotificationConversionAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/conversion', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取转化率分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户参与度分析
   * @param {Object} params 分析参数
   * @returns {Promise} API响应
   */
  async getUserEngagementAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/engagement', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取用户参与度分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知效果对比分析
   * @param {Object} params 对比参数
   * @returns {Promise} API响应
   */
  async getNotificationEffectComparison(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/comparison', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取效果对比分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知趋势分析
   * @param {Object} params 趋势参数
   * @returns {Promise} API响应
   */
  async getNotificationTrendAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/trend', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取趋势分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知热力图数据
   * @param {Object} params 热力图参数
   * @returns {Promise} API响应
   */
  async getNotificationHeatmapData(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/heatmap', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取热力图数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知漏斗分析
   * @param {Object} params 漏斗参数
   * @returns {Promise} API响应
   */
  async getNotificationFunnelAnalysis(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/funnel', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取漏斗分析失败:', error);
      throw error;
    }
  }

  /**
   * 记录通知交互事件
   * @param {Object} eventData 事件数据
   * @returns {Promise} API响应
   */
  async recordNotificationEvent(eventData) {
    try {
      return await httpService.post('/api/notifications/analytics/events', eventData);
    } catch (error) {
      console.error('[NotificationAPI] 记录交互事件失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知A/B测试结果
   * @param {Object} params 测试参数
   * @returns {Promise} API响应
   */
  async getNotificationABTestResults(params = {}) {
    try {
      return await httpService.get('/api/notifications/analytics/ab-test', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取A/B测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 创建A/B测试
   * @param {Object} testConfig 测试配置
   * @returns {Promise} API响应
   */
  async createNotificationABTest(testConfig) {
    try {
      return await httpService.post('/api/notifications/analytics/ab-test', testConfig);
    } catch (error) {
      console.error('[NotificationAPI] 创建A/B测试失败:', error);
      throw error;
    }
  }

  // ============= 通知报告相关API =============

  /**
   * 生成日报
   * @param {Object} params 日报参数
   * @returns {Promise} API响应
   */
  async generateDailyReport(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports/daily', { params });
    } catch (error) {
      console.error('[NotificationAPI] 生成日报失败:', error);
      throw error;
    }
  }

  /**
   * 生成周报
   * @param {Object} params 周报参数
   * @returns {Promise} API响应
   */
  async generateWeeklyReport(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports/weekly', { params });
    } catch (error) {
      console.error('[NotificationAPI] 生成周报失败:', error);
      throw error;
    }
  }

  /**
   * 生成月报
   * @param {Object} params 月报参数
   * @returns {Promise} API响应
   */
  async generateMonthlyReport(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports/monthly', { params });
    } catch (error) {
      console.error('[NotificationAPI] 生成月报失败:', error);
      throw error;
    }
  }

  /**
   * 获取趋势分析报告
   * @param {Object} params 趋势分析参数
   * @returns {Promise} API响应
   */
  async getTrendAnalysisReport(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports/trend', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取趋势分析报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取异常情况报告
   * @param {Object} params 异常检测参数
   * @returns {Promise} API响应
   */
  async getAnomalyReport(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports/anomaly', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取异常情况报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告列表
   * @param {Object} params 查询参数
   * @returns {Promise} API响应
   */
  async getReportList(params = {}) {
    try {
      return await httpService.get('/api/notifications/reports', { params });
    } catch (error) {
      console.error('[NotificationAPI] 获取报告列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告详情
   * @param {string} reportId 报告ID
   * @returns {Promise} API响应
   */
  async getReportDetail(reportId) {
    try {
      return await httpService.get(`/api/notifications/reports/${reportId}`);
    } catch (error) {
      console.error('[NotificationAPI] 获取报告详情失败:', error);
      throw error;
    }
  }

  /**
   * 下载报告
   * @param {string} reportId 报告ID
   * @param {string} format 文件格式
   * @returns {Promise} API响应
   */
  async downloadReport(reportId, format = 'pdf') {
    try {
      return await httpService.get(`/api/notifications/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob'
      });
    } catch (error) {
      console.error('[NotificationAPI] 下载报告失败:', error);
      throw error;
    }
  }

  /**
   * 定时报告配置
   * @param {Object} config 定时配置
   * @returns {Promise} API响应
   */
  async scheduleReport(config) {
    try {
      return await httpService.post('/api/notifications/reports/schedule', config);
    } catch (error) {
      console.error('[NotificationAPI] 配置定时报告失败:', error);
      throw error;
    }
  }
}

module.exports = new NotificationAPI();