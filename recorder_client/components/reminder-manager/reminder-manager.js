/**
 * 催缴管理组件
 * @description 用于管理和配置催缴策略的组件
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { REMINDER_TYPES } from '../../constants/payment-constants.js';
import paymentReminderService from '../../services/payment-reminder.service.js';

Component({
  properties: {
    // 用户级别
    userLevel: {
      type: String,
      value: 'default'
    }
  },

  data: {
    // 催缴策略配置
    reminderConfig: {
      intervals: [1, 3, 7, 14],
      methods: [REMINDER_TYPES.PUSH, REMINDER_TYPES.WECHAT, REMINDER_TYPES.SMS],
      maxReminders: 10,
      escalation: true
    },
    
    // 催缴历史统计
    statistics: {
      totalReminders: 0,
      successRate: 0,
      avgResponseTime: 0,
      methodDistribution: {}
    },
    
    // 最近催缴记录
    recentReminders: [],
    
    // 加载状态
    loading: false,
    
    // 可用的催缴方式
    availableMethods: [
      { value: REMINDER_TYPES.PUSH, label: '应用推送', icon: '/images/reminder/push.png' },
      { value: REMINDER_TYPES.WECHAT, label: '微信通知', icon: '/images/reminder/wechat.png' },
      { value: REMINDER_TYPES.SMS, label: '短信通知', icon: '/images/reminder/sms.png' },
      { value: REMINDER_TYPES.PHONE, label: '电话催缴', icon: '/images/reminder/phone.png' },
      { value: REMINDER_TYPES.EMAIL, label: '邮件通知', icon: '/images/reminder/email.png' }
    ],
    
    // 编辑模式
    editMode: false
  },

  lifetimes: {
    attached() {
      this.loadReminderConfig();
      this.loadStatistics();
      this.loadRecentReminders();
    }
  },

  methods: {
    /**
     * 加载催缴配置
     */
    async loadReminderConfig() {
      try {
        this.setData({ loading: true });
        
        const config = paymentReminderService.getReminderStrategy(this.properties.userLevel);
        
        this.setData({
          reminderConfig: config,
          loading: false
        });
        
      } catch (error) {
        console.error('[ReminderManager] 加载催缴配置失败:', error);
        wx.showToast({
          title: '加载配置失败',
          icon: 'error'
        });
        this.setData({ loading: false });
      }
    },

    /**
     * 加载催缴统计信息
     */
    async loadStatistics() {
      try {
        // 这里应该从后端API获取统计数据
        // 暂时使用模拟数据
        const statistics = {
          totalReminders: 156,
          successRate: 78.5,
          avgResponseTime: 2.3,
          methodDistribution: {
            [REMINDER_TYPES.PUSH]: 45,
            [REMINDER_TYPES.WECHAT]: 35,
            [REMINDER_TYPES.SMS]: 15,
            [REMINDER_TYPES.PHONE]: 5
          }
        };
        
        this.setData({ statistics });
        
      } catch (error) {
        console.error('[ReminderManager] 加载统计信息失败:', error);
      }
    },

    /**
     * 加载最近催缴记录
     */
    async loadRecentReminders() {
      try {
        // 这里应该从后端API获取最近的催缴记录
        // 暂时使用模拟数据
        const recentReminders = [
          {
            id: '1',
            paymentId: 'payment_001',
            userId: 'user_001',
            method: REMINDER_TYPES.WECHAT,
            status: 'success',
            timestamp: Date.now() - 2 * 60 * 60 * 1000,
            response: true
          },
          {
            id: '2',
            paymentId: 'payment_002',
            userId: 'user_002',
            method: REMINDER_TYPES.SMS,
            status: 'failed',
            timestamp: Date.now() - 4 * 60 * 60 * 1000,
            response: false
          }
        ];
        
        this.setData({ recentReminders });
        
      } catch (error) {
        console.error('[ReminderManager] 加载催缴记录失败:', error);
      }
    },

    /**
     * 切换编辑模式
     */
    onToggleEditMode() {
      this.setData({
        editMode: !this.data.editMode
      });
    },

    /**
     * 更新催缴间隔
     */
    onUpdateIntervals(e) {
      const intervals = e.detail.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
      
      this.setData({
        'reminderConfig.intervals': intervals
      });
    },

    /**
     * 切换催缴方式
     */
    onToggleMethod(e) {
      const { method } = e.currentTarget.dataset;
      const { reminderConfig } = this.data;
      const methods = [...reminderConfig.methods];
      
      const index = methods.indexOf(method);
      if (index > -1) {
        methods.splice(index, 1);
      } else {
        methods.push(method);
      }
      
      this.setData({
        'reminderConfig.methods': methods
      });
    },

    /**
     * 更新最大催缴次数
     */
    onUpdateMaxReminders(e) {
      const maxReminders = parseInt(e.detail.value) || 10;
      
      this.setData({
        'reminderConfig.maxReminders': maxReminders
      });
    },

    /**
     * 切换升级催缴
     */
    onToggleEscalation() {
      this.setData({
        'reminderConfig.escalation': !this.data.reminderConfig.escalation
      });
    },

    /**
     * 保存配置
     */
    async onSaveConfig() {
      try {
        const { reminderConfig } = this.data;
        const { userLevel } = this.properties;
        
        // 验证配置
        if (!this.validateConfig(reminderConfig)) {
          return;
        }
        
        // 保存配置
        paymentReminderService.registerReminderStrategy(userLevel, reminderConfig);
        
        wx.showToast({
          title: '配置保存成功',
          icon: 'success'
        });
        
        this.setData({ editMode: false });
        
        // 触发配置更新事件
        this.triggerEvent('configUpdated', { config: reminderConfig });
        
      } catch (error) {
        console.error('[ReminderManager] 保存配置失败:', error);
        wx.showToast({
          title: '保存配置失败',
          icon: 'error'
        });
      }
    },

    /**
     * 取消编辑
     */
    onCancelEdit() {
      this.setData({ editMode: false });
      this.loadReminderConfig(); // 重新加载配置
    },

    /**
     * 手动触发催缴检查
     */
    async onManualCheck() {
      try {
        wx.showLoading({ title: '检查中...' });
        
        const results = await paymentReminderService.manualCheck();
        
        wx.hideLoading();
        
        const successCount = results.filter(r => r.success).length;
        
        wx.showToast({
          title: `检查完成，处理${successCount}条记录`,
          icon: 'success'
        });
        
        // 刷新统计信息
        this.loadStatistics();
        this.loadRecentReminders();
        
      } catch (error) {
        wx.hideLoading();
        console.error('[ReminderManager] 手动检查失败:', error);
        wx.showToast({
          title: '检查失败',
          icon: 'error'
        });
      }
    },

    /**
     * 查看催缴详情
     */
    onViewReminderDetail(e) {
      const { reminderId } = e.currentTarget.dataset;
      
      wx.navigateTo({
        url: `/pages/reminder-detail/reminder-detail?id=${reminderId}`
      });
    },

    /**
     * 验证配置
     */
    validateConfig(config) {
      if (!config.intervals || config.intervals.length === 0) {
        wx.showToast({
          title: '请设置催缴间隔',
          icon: 'error'
        });
        return false;
      }
      
      if (!config.methods || config.methods.length === 0) {
        wx.showToast({
          title: '请选择催缴方式',
          icon: 'error'
        });
        return false;
      }
      
      if (config.maxReminders < 1 || config.maxReminders > 50) {
        wx.showToast({
          title: '最大催缴次数应在1-50之间',
          icon: 'error'
        });
        return false;
      }
      
      return true;
    },

    /**
     * 获取方式图标
     */
    getMethodIcon(method) {
      const methodMap = {
        [REMINDER_TYPES.PUSH]: '/images/reminder/push.png',
        [REMINDER_TYPES.WECHAT]: '/images/reminder/wechat.png',
        [REMINDER_TYPES.SMS]: '/images/reminder/sms.png',
        [REMINDER_TYPES.PHONE]: '/images/reminder/phone.png',
        [REMINDER_TYPES.EMAIL]: '/images/reminder/email.png'
      };
      return methodMap[method] || '/images/reminder/default.png';
    },

    /**
     * 获取方式名称
     */
    getMethodName(method) {
      const nameMap = {
        [REMINDER_TYPES.PUSH]: '应用推送',
        [REMINDER_TYPES.WECHAT]: '微信通知',
        [REMINDER_TYPES.SMS]: '短信通知',
        [REMINDER_TYPES.PHONE]: '电话催缴',
        [REMINDER_TYPES.EMAIL]: '邮件通知'
      };
      return nameMap[method] || '未知方式';
    },

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    },

    /**
     * 格式化成功率
     */
    formatSuccessRate(rate) {
      return (rate || 0).toFixed(1) + '%';
    },

    /**
     * 格式化响应时间
     */
    formatResponseTime(time) {
      return (time || 0).toFixed(1) + '小时';
    }
  }
});