/**
 * 通知设置管理器
 * 负责用户通知偏好设置的管理
 */

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY
} from '../constants/notification-config.js';

class NotificationSettingsManager {
  constructor() {
    this.userSettings = null;
    this.defaultSettings = this.getDefaultSettings();
  }

  /**
   * 初始化设置管理器
   */
  async init() {
    try {
      await this.loadUserSettings();
      return true;
    } catch (error) {
      console.error('[NotificationSettingsManager] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 获取用户设置
   */
  getUserSettings() {
    return this.userSettings || this.defaultSettings;
  }

  /**
   * 更新用户设置
   */
  async updateUserSettings(newSettings) {
    try {
      const updatedSettings = {
        ...this.userSettings,
        ...newSettings,
        updatedAt: new Date().toISOString()
      };

      this.validateSettings(updatedSettings);
      this.userSettings = updatedSettings;
      await this.saveUserSettings();

      return this.userSettings;
    } catch (error) {
      console.error('[NotificationSettingsManager] 更新用户设置失败:', error);
      throw error;
    }
  }

  /**
   * 设置免打扰模式
   */
  async setDoNotDisturbMode(enabled, schedule = null) {
    const settings = {
      doNotDisturb: {
        enabled,
        schedule: schedule || {
          startTime: '22:00',
          endTime: '08:00',
          weekdays: [1, 2, 3, 4, 5, 6, 0]
        }
      }
    };

    return await this.updateUserSettings(settings);
  }

  /**
   * 检查通知是否应该发送
   */
  shouldSendNotification(notification) {
    const settings = this.getUserSettings();
    const result = {
      allowed: true,
      reasons: [],
      suggestedChannels: [...notification.channels],
      delayUntil: null
    };

    // 检查全局开关
    if (!settings.globalEnabled) {
      result.allowed = false;
      result.reasons.push('通知已全局关闭');
      return result;
    }

    // 检查通知类型设置
    const typeSettings = settings.notificationTypes[notification.type];
    if (typeSettings && !typeSettings.enabled) {
      result.allowed = false;
      result.reasons.push('该类型通知已关闭');
      return result;
    }

    // 检查免打扰模式
    const dndResult = this.checkDoNotDisturb(notification);
    if (!dndResult.allowed) {
      result.allowed = false;
      result.reasons.push('当前处于免打扰时间');
      result.delayUntil = dndResult.nextAllowedTime;
      return result;
    }

    return result;
  }

  /**
   * 检查免打扰模式
   */
  checkDoNotDisturb(notification) {
    const settings = this.getUserSettings();
    const dnd = settings.doNotDisturb;

    if (!dnd?.enabled) {
      return { allowed: true };
    }

    // 紧急通知不受免打扰限制
    if (notification.priority >= NOTIFICATION_PRIORITY.URGENT) {
      return { allowed: true };
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentWeekday = now.getDay();

    if (dnd.schedule.weekdays.includes(currentWeekday)) {
      const startTime = dnd.schedule.startTime;
      const endTime = dnd.schedule.endTime;

      let inDndPeriod = false;
      if (startTime <= endTime) {
        inDndPeriod = currentTime >= startTime && currentTime <= endTime;
      } else {
        inDndPeriod = currentTime >= startTime || currentTime <= endTime;
      }

      if (inDndPeriod) {
        const nextAllowedTime = this.calculateNextAllowedTime(dnd.schedule);
        return {
          allowed: false,
          nextAllowedTime
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 记录用户行为
   */
  recordUserBehavior(notification, action) {
    try {
      const behaviorData = this.getUserBehaviorData();
      const typeKey = notification.type;
      
      if (!behaviorData[typeKey]) {
        behaviorData[typeKey] = {
          totalCount: 0,
          readCount: 0,
          dismissCount: 0,
          clickCount: 0
        };
      }
      
      const typeData = behaviorData[typeKey];
      typeData.totalCount++;
      
      switch (action) {
        case 'read':
          typeData.readCount++;
          break;
        case 'dismiss':
          typeData.dismissCount++;
          break;
        case 'click':
          typeData.clickCount++;
          break;
      }
      
      wx.setStorageSync('user_notification_behavior', behaviorData);
      
    } catch (error) {
      console.error('[NotificationSettingsManager] 记录用户行为失败:', error);
    }
  }

  /**
   * 获取用户行为数据
   */
  getUserBehaviorData() {
    try {
      return wx.getStorageSync('user_notification_behavior') || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * 加载用户设置
   */
  async loadUserSettings() {
    try {
      const settings = wx.getStorageSync('user_notification_settings');
      if (settings) {
        this.userSettings = settings;
      } else {
        this.userSettings = this.defaultSettings;
        await this.saveUserSettings();
      }
    } catch (error) {
      this.userSettings = this.defaultSettings;
    }
  }

  /**
   * 保存用户设置
   */
  async saveUserSettings() {
    try {
      wx.setStorageSync('user_notification_settings', this.userSettings);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证设置
   */
  validateSettings(settings) {
    if (typeof settings.globalEnabled !== 'boolean') {
      throw new Error('globalEnabled 必须是布尔值');
    }
  }

  /**
   * 计算下次允许时间
   */
  calculateNextAllowedTime(schedule) {
    const now = new Date();
    const nextAllowed = new Date(now);
    
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    nextAllowed.setHours(endHour, endMinute, 0, 0);
    
    if (nextAllowed <= now) {
      nextAllowed.setDate(nextAllowed.getDate() + 1);
    }
    
    return nextAllowed.toISOString();
  }

  /**
   * 获取默认设置
   */
  getDefaultSettings() {
    return {
      globalEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      notificationTypes: {
        [NOTIFICATION_TYPES.APPOINTMENT_CONFIRM]: {
          enabled: true,
          channels: {
            [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE]: true,
            [NOTIFICATION_CHANNELS.SMS]: true,
            [NOTIFICATION_CHANNELS.IN_APP]: true
          }
        },
        [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: {
          enabled: true,
          channels: {
            [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE]: true,
            [NOTIFICATION_CHANNELS.IN_APP]: true
          }
        },
        [NOTIFICATION_TYPES.PAYMENT_REMINDER]: {
          enabled: true,
          channels: {
            [NOTIFICATION_CHANNELS.IN_APP]: true,
            [NOTIFICATION_CHANNELS.SMS]: false
          }
        },
        [NOTIFICATION_TYPES.HEALTH_ALERT]: {
          enabled: true,
          channels: {
            [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE]: true,
            [NOTIFICATION_CHANNELS.SMS]: true,
            [NOTIFICATION_CHANNELS.IN_APP]: true
          }
        }
      },
      
      channels: {
        [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE]: { enabled: true },
        [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE]: { enabled: true },
        [NOTIFICATION_CHANNELS.SMS]: { enabled: true },
        [NOTIFICATION_CHANNELS.IN_APP]: { enabled: true }
      },
      
      doNotDisturb: {
        enabled: false,
        schedule: {
          startTime: '22:00',
          endTime: '08:00',
          weekdays: [1, 2, 3, 4, 5, 6, 0]
        }
      },
      
      smartNotifications: {
        enabled: false,
        config: {
          learnFromBehavior: true,
          optimizeTiming: true,
          deduplication: true
        }
      }
    };
  }

  /**
   * 重置为默认设置
   */
  async resetToDefault() {
    this.userSettings = this.getDefaultSettings();
    await this.saveUserSettings();
    return this.userSettings;
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.userSettings = null;
  }
}

export default NotificationSettingsManager;