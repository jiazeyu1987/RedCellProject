/**
 * 时间调整通知服务
 * 专门处理时间调整相关的通知功能
 */

const { 
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CHANNELS 
} = require('../constants/notification-config.js');

const { TEMPLATE_TYPES } = require('../constants/template-types.js');
const NotificationService = require('./notification-service.js');

class TimeAdjustNotificationService {
  constructor() {
    this.notificationService = null;
    this.config = {
      // 患者通知配置
      patientNotification: {
        enableWechat: true,
        enableSMS: true,
        enableInApp: true,
        autoSend: true
      },
      
      // 内部协调通知配置
      teamNotification: {
        enableWechat: true,
        enableInApp: true,
        notifyRecorders: true,
        notifySchedulers: true,
        notifyManagers: true
      },
      
      // 通知时机配置
      timing: {
        immediateNotify: true,        // 立即通知
        reminderBeforeHours: [24, 2], // 提前提醒时间
        batchNotifyDelay: 5           // 批量通知延迟(分钟)
      },
      
      // 重试配置（新增）
      retry: {
        enabled: true,               // 是否启用重试
        maxAttempts: 3,             // 最大重试次数
        initialDelay: 5000,         // 初始重试延迟（毫秒）
        backoffMultiplier: 2,       // 退避倍数
        maxDelay: 30000             // 最大重试延迟（毫秒）
      },
      
      // 状态跟踪配置（新增）
      statusTracking: {
        enabled: true,              // 是否启用状态跟踪
        realTimeCheck: true,        // 是否启用实时状态检查
        historyRetention: 30        // 历史记录保留天数
      }
    };
  }

  /**
   * 初始化服务
   */
  async init() {
    try {
      console.log('[TimeAdjustNotificationService] 初始化时间调整通知服务...');
      
      // 初始化通知服务
      this.notificationService = new NotificationService();
      await this.notificationService.init();
      
      console.log('[TimeAdjustNotificationService] 初始化完成');
      return true;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 确保通知服务已初始化
   */
  async ensureNotificationServiceInitialized() {
    if (!this.notificationService) {
      this.notificationService = new NotificationService();
      await this.notificationService.init();
    }
  }

  /**
   * 安全的创建并发送通知方法
   * @param {Object} notificationData 通知数据
   * @returns {Promise<boolean>} 发送结果
   */
  async safeCreateAndSend(notificationData) {
    try {
      await this.ensureNotificationServiceInitialized();
      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 安全发送通知失败:', error);
      return false;
    }
  }

  // ========== 增强的患者通知功能 ==========
  
  /**
   * 带重试机制的通知发送
   * @param {Object} notificationData 通知数据
   * @param {number} maxRetries 最大重试次数
   * @param {number} retryInterval 重试间隔（毫秒）
   */
  async sendWithRetry(notificationData, maxRetries = 3, retryInterval = 5000) {
    let attempts = 0;
    let errors = [];
    
    while (attempts < maxRetries) {
      attempts++;
      
      try {
        console.log(`[TimeAdjustNotificationService] 发送通知尝试 ${attempts}/${maxRetries}:`, notificationData.type);
        
        const result = await this.notificationService.createAndSend(notificationData);
        
        if (result && result.success) {
          return {
            success: true,
            attempts,
            result,
            errors
          };
        } else {
          const error = result?.error || '发送失败';
          errors.push(`尝试 ${attempts}: ${error}`);
          
          if (attempts < maxRetries) {
            console.log(`[TimeAdjustNotificationService] 发送失败，${retryInterval/1000}秒后重试...`);
            await this.delay(retryInterval);
          }
        }
      } catch (error) {
        errors.push(`尝试 ${attempts}: ${error.message}`);
        
        if (attempts < maxRetries) {
          console.log(`[TimeAdjustNotificationService] 发送异常，${retryInterval/1000}秒后重试...`);
          await this.delay(retryInterval);
        }
      }
    }
    
    return {
      success: false,
      attempts,
      errors
    };
  }
  
  /**
   * 延迟函数
   * @param {number} ms 延迟毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 发送时间调整申请通知给患者（增强版本 - 支持状态跟踪和重试）
   * @param {Object} adjustData 调整数据
   * @param {Object} options 发送选项
   */
  async sendAdjustRequestNotification(adjustData, options = {}) {
    const {
      enableRetry = true,
      maxRetries = 3,
      retryInterval = 5000,
      enableStatusTracking = true,
      trackingCallback = null
    } = options;
    
    let result = { success: false, attempts: 0, errors: [] };
    
    try {
      const { appointmentInfo, adjustReason, newTime, adjustType } = adjustData;
      
      // 构建通知数据
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_REQUEST,
        title: '时间调整申请',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          originalTime: this.formatDateTime(appointmentInfo.originalDateTime),
          newTime: this.formatDateTime(newTime),
          reason: adjustReason,
          serviceName: appointmentInfo.serviceName || '护理服务',
          recorderName: appointmentInfo.recorderName,
          contactPhone: appointmentInfo.contactPhone,
          adjustType: adjustType || 'normal',
          appointmentId: appointmentInfo.id
        },
        channels: this.getPatientNotificationChannels(),
        priority: this.getAdjustPriority(adjustType),
        templateId: TEMPLATE_TYPES.TIME_ADJUST_REQUEST
      };

      // 发送通知（支持重试机制）
      result = await this.sendWithRetry(
        notificationData, 
        enableRetry ? maxRetries : 1, 
        retryInterval
      );
      
      // 保存通知历史
      if (enableStatusTracking) {
        await this.saveNotificationHistory(
          notificationData, 
          result.success ? 'sent' : 'failed',
          result
        );
      }
      
      // 执行状态跟踪回调
      if (trackingCallback && typeof trackingCallback === 'function') {
        await trackingCallback(result, notificationData);
      }
      
      return result;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整申请通知失败:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 发送时间调整确认通知给患者
   * @param {Object} confirmData 确认数据
   */
  async sendAdjustConfirmNotification(confirmData) {
    try {
      const { appointmentInfo, originalTime, newTime, confirmTime, notes } = confirmData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_CONFIRM,
        title: '时间调整确认',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          originalTime: this.formatDateTime(originalTime),
          newTime: this.formatDateTime(newTime),
          confirmTime: this.formatDateTime(confirmTime),
          serviceName: appointmentInfo.serviceName || '护理服务',
          recorderName: appointmentInfo.recorderName,
          contactPhone: appointmentInfo.contactPhone,
          notes: notes || '',
          appointmentId: appointmentInfo.id
        },
        channels: this.getPatientNotificationChannels(),
        priority: NOTIFICATION_PRIORITY.HIGH,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_CONFIRM
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整确认通知失败:', error);
      return false;
    }
  }

  /**
   * 发送时间调整拒绝通知给患者
   * @param {Object} rejectData 拒绝数据
   */
  async sendAdjustRejectNotification(rejectData) {
    try {
      const { appointmentInfo, requestedTime, rejectReason, alternativeTime } = rejectData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_REJECT,
        title: '时间调整拒绝',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          originalTime: this.formatDateTime(appointmentInfo.originalDateTime),
          requestedTime: this.formatDateTime(requestedTime),
          rejectReason: rejectReason,
          serviceName: appointmentInfo.serviceName || '护理服务',
          alternativeTime: alternativeTime ? this.formatDateTime(alternativeTime) : '',
          contactPhone: appointmentInfo.contactPhone,
          appointmentId: appointmentInfo.id
        },
        channels: this.getPatientNotificationChannels(),
        priority: NOTIFICATION_PRIORITY.HIGH,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_REJECT
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整拒绝通知失败:', error);
      return false;
    }
  }

  /**
   * 发送时间调整成功通知给患者
   * @param {Object} successData 成功数据
   */
  async sendAdjustSuccessNotification(successData) {
    try {
      const { appointmentInfo, newTime, successTime, notes } = successData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_SUCCESS,
        title: '时间调整成功',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          newTime: this.formatDateTime(newTime),
          successTime: this.formatDateTime(successTime),
          serviceName: appointmentInfo.serviceName || '护理服务',
          recorderName: appointmentInfo.recorderName,
          notes: notes || '',
          appointmentId: appointmentInfo.id
        },
        channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.IN_APP],
        priority: NOTIFICATION_PRIORITY.NORMAL,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_SUCCESS
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整成功通知失败:', error);
      return false;
    }
  }

  /**
   * 发送时间冲突通知给患者
   * @param {Object} conflictData 冲突数据
   */
  async sendAdjustConflictNotification(conflictData) {
    try {
      const { appointmentInfo, conflictTime, conflictReason, alternatives } = conflictData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_CONFLICT,
        title: '时间调整冲突',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          conflictTime: this.formatDateTime(conflictTime),
          conflictReason: conflictReason,
          alternativeTime1: alternatives && alternatives[0] ? this.formatDateTime(alternatives[0]) : '',
          alternativeTime2: alternatives && alternatives[1] ? this.formatDateTime(alternatives[1]) : '',
          contactPhone: appointmentInfo.contactPhone,
          appointmentId: appointmentInfo.id
        },
        channels: this.getPatientNotificationChannels(),
        priority: NOTIFICATION_PRIORITY.URGENT,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_CONFLICT
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整冲突通知失败:', error);
      return false;
    }
  }

  /**
   * 发送紧急时间调整通知给患者
   * @param {Object} emergencyData 紧急数据
   */
  async sendEmergencyAdjustNotification(emergencyData) {
    try {
      const { appointmentInfo, emergencyReason, originalTime, newTime, urgencyLevel, compensation } = emergencyData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_EMERGENCY,
        title: '紧急时间调整',
        targetUser: {
          id: appointmentInfo.patientId,
          name: appointmentInfo.patientName,
          phone: appointmentInfo.patientPhone,
          openid: appointmentInfo.patientOpenid
        },
        data: {
          patientName: appointmentInfo.patientName,
          emergencyReason: emergencyReason,
          originalTime: this.formatDateTime(originalTime),
          newTime: this.formatDateTime(newTime),
          urgencyLevel: urgencyLevel || 'high',
          contactPhone: appointmentInfo.contactPhone,
          compensationInfo: compensation || '',
          appointmentId: appointmentInfo.id
        },
        channels: [
          NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
          NOTIFICATION_CHANNELS.SMS,
          NOTIFICATION_CHANNELS.IN_APP
        ],
        priority: NOTIFICATION_PRIORITY.CRITICAL,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_EMERGENCY
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送紧急调整通知失败:', error);
      return false;
    }
  }

  /**
   * 发送批量时间调整通知给患者
   * @param {Object} batchData 批量数据
   */
  async sendBatchAdjustNotification(batchData) {
    try {
      const { patientInfo, adjustments, reason, effectiveDate } = batchData;
      
      // 构建调整详情文本
      const adjustDetails = adjustments.map((adj, index) => 
        `${index + 1}. ${adj.serviceName || '护理服务'} ${this.formatDateTime(adj.originalTime)} → ${this.formatDateTime(adj.newTime)}`
      ).join('\n');
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_BATCH,
        title: '批量时间调整',
        targetUser: {
          id: patientInfo.patientId,
          name: patientInfo.patientName,
          phone: patientInfo.patientPhone,
          openid: patientInfo.patientOpenid
        },
        data: {
          patientName: patientInfo.patientName,
          adjustCount: adjustments.length,
          adjustDetails: adjustDetails,
          effectiveDate: effectiveDate ? this.formatDateTime(effectiveDate) : '',
          reason: reason || '',
          contactPhone: patientInfo.contactPhone
        },
        channels: this.getPatientNotificationChannels(),
        priority: NOTIFICATION_PRIORITY.HIGH,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_BATCH
      };

      return await this.safeCreateAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送批量调整通知失败:', error);
      return false;
    }
  }

  /**
   * 发送时间调整提醒通知给患者
   * @param {Object} reminderData 提醒数据
   */
  async sendAdjustReminderNotification(reminderData) {
    try {
      const { patientInfo, reminderType, actionRequired, deadline } = reminderData;
      
      const notificationData = {
        type: NOTIFICATION_TYPES.TIME_ADJUST_REMINDER,
        title: '时间调整提醒',
        targetUser: {
          id: patientInfo.patientId,
          name: patientInfo.patientName,
          phone: patientInfo.patientPhone,
          openid: patientInfo.patientOpenid
        },
        data: {
          patientName: patientInfo.patientName,
          reminderType: reminderType,
          reminderTime: this.formatDateTime(new Date()),
          actionRequired: actionRequired || '',
          deadline: deadline ? this.formatDateTime(deadline) : ''
        },
        channels: [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE, NOTIFICATION_CHANNELS.IN_APP],
        priority: NOTIFICATION_PRIORITY.NORMAL,
        templateId: TEMPLATE_TYPES.TIME_ADJUST_REMINDER
      };

      return await this.notificationService.createAndSend(notificationData);
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调整提醒通知失败:', error);
      return false;
    }
  }

  // ========== 内部协调通知机制 ==========

  /**
   * 发送内部团队通知（增强版本）
   * @param {Object} teamNotifyData 团队通知数据
   */
  async sendTeamNotification(teamNotifyData) {
    try {
      const { adjustData, notifyType, targetRoles, urgencyLevel = 'normal' } = teamNotifyData;
      
      // 获取需要通知的团队成员
      const teamMembers = await this.getTeamMembers(adjustData.appointmentInfo, targetRoles);
      
      const notifications = [];
      const results = {
        total: teamMembers.length,
        success: 0,
        failed: 0,
        details: []
      };
      
      for (const member of teamMembers) {
        try {
          const notificationData = {
            type: this.getTeamNotificationType(notifyType),
            title: this.getTeamNotificationTitle(notifyType),
            targetUser: {
              id: member.id,
              name: member.name,
              role: member.role,
              openid: member.openid
            },
            data: {
              patientName: adjustData.appointmentInfo.patientName,
              recorderName: adjustData.appointmentInfo.recorderName,
              originalTime: this.formatDateTime(adjustData.originalTime),
              newTime: this.formatDateTime(adjustData.newTime),
              reason: adjustData.adjustReason,
              adjustType: adjustData.adjustType || 'normal',
              notifyType: notifyType,
              memberRole: member.role,
              appointmentId: adjustData.appointmentInfo.id,
              urgencyLevel: urgencyLevel,
              memberName: member.name,
              department: member.department
            },
            channels: this.getTeamNotificationChannels(),
            priority: this.getTeamNotifyPriority(notifyType, adjustData.adjustType),
            templateId: this.getTeamNotificationTemplate(notifyType)
          };
          
          // 使用增强的发送方法
          const result = await this.sendWithRetry(notificationData, 2, 3000);
          
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
          
          results.details.push({
            memberId: member.id,
            memberName: member.name,
            role: member.role,
            success: result.success,
            attempts: result.attempts,
            errors: result.errors
          });
          
          // 保存通知历史
          await this.saveNotificationHistory(
            notificationData, 
            result.success ? 'sent' : 'failed',
            result
          );
          
        } catch (error) {
          results.failed++;
          results.details.push({
            memberId: member.id,
            memberName: member.name,
            role: member.role,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`[TimeAdjustNotificationService] 团队通知发送完成: ${results.success}/${results.total}`);
      return results;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送团队通知失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送调度中心通知（增强版本）
   * @param {Object} scheduleNotifyData 调度通知数据
   */
  async sendScheduleCenterNotification(scheduleNotifyData) {
    try {
      const { adjustData, impactAnalysis, conflictInfo, notifyLevel = 'normal' } = scheduleNotifyData;
      
      // 获取调度中心人员
      const schedulers = await this.getSchedulers();
      
      const results = {
        total: schedulers.length,
        success: 0,
        failed: 0,
        details: []
      };
      
      for (const scheduler of schedulers) {
        try {
          const notificationData = {
            type: NOTIFICATION_TYPES.TIME_ADJUST_REQUEST,
            title: '调度中心 - 时间调整通知',
            targetUser: {
              id: scheduler.id,
              name: scheduler.name,
              role: 'scheduler',
              openid: scheduler.openid
            },
            data: {
              patientName: adjustData.appointmentInfo.patientName,
              recorderName: adjustData.appointmentInfo.recorderName,
              originalTime: this.formatDateTime(adjustData.originalTime),
              newTime: this.formatDateTime(adjustData.newTime),
              reason: adjustData.adjustReason,
              impactDescription: this.buildImpactDescription(impactAnalysis),
              conflictDescription: this.buildConflictDescription(conflictInfo),
              appointmentId: adjustData.appointmentInfo.id,
              schedulerName: scheduler.name,
              notifyLevel: notifyLevel,
              adjustType: adjustData.adjustType || 'normal',
              department: scheduler.department,
              serviceName: adjustData.appointmentInfo.serviceName || '护理服务'
            },
            channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.IN_APP],
            priority: this.getScheduleNotifyPriority(notifyLevel, adjustData.adjustType),
            templateId: 'schedule_center_adjust_notify'
          };
          
          // 使用增强的发送方法
          const result = await this.sendWithRetry(notificationData, 2, 3000);
          
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
          
          results.details.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            success: result.success,
            attempts: result.attempts,
            errors: result.errors
          });
          
          // 保存通知历史
          await this.saveNotificationHistory(
            notificationData, 
            result.success ? 'sent' : 'failed',
            result
          );
          
        } catch (error) {
          results.failed++;
          results.details.push({
            schedulerId: scheduler.id,
            schedulerName: scheduler.name,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`[TimeAdjustNotificationService] 调度中心通知发送完成: ${results.success}/${results.total}`);
      return results;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送调度中心通知失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送相关记录员通知
   * @param {Object} relatedRecorderData 相关记录员数据
   */
  async sendRelatedRecorderNotification(relatedRecorderData) {
    try {
      const { adjustData, affectedAppointments, relationshipType } = relatedRecorderData;
      
      // 获取受影响的记录员
      const relatedRecorders = await this.getRelatedRecorders(affectedAppointments);
      
      const notifications = [];
      
      for (const recorder of relatedRecorders) {
        const notificationData = {
          type: NOTIFICATION_TYPES.TIME_ADJUST_REQUEST,
          title: '相关记录员 - 时间调整通知',
          targetUser: {
            id: recorder.id,
            name: recorder.name,
            role: 'recorder',
            openid: recorder.openid
          },
          data: {
            patientName: adjustData.appointmentInfo.patientName,
            adjustingRecorderName: adjustData.appointmentInfo.recorderName,
            originalTime: this.formatDateTime(adjustData.originalTime),
            newTime: this.formatDateTime(adjustData.newTime),
            reason: adjustData.adjustReason,
            relationshipType: relationshipType,
            affectedCount: affectedAppointments.length,
            recorderName: recorder.name,
            appointmentId: adjustData.appointmentInfo.id
          },
          channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.IN_APP],
          priority: NOTIFICATION_PRIORITY.NORMAL,
          templateId: 'related_recorder_adjust_notify'
        };
        
        notifications.push(this.notificationService.createAndSend(notificationData));
      }
      
      const results = await Promise.allSettled(notifications);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`[TimeAdjustNotificationService] 相关记录员通知发送完成: ${successCount}/${results.length}`);
      return successCount > 0;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送相关记录员通知失败:', error);
      return false;
    }
  }

  /**
   * 发送紧急调整警报
   * @param {Object} emergencyAlertData 紧急警报数据
   */
  async sendEmergencyAlert(emergencyAlertData) {
    try {
      const { adjustData, emergencyLevel, affectedServices } = emergencyAlertData;
      
      // 获取紧急情况通知人员
      const emergencyContacts = await this.getEmergencyContacts(emergencyLevel);
      
      const notifications = [];
      
      for (const contact of emergencyContacts) {
        const notificationData = {
          type: NOTIFICATION_TYPES.TIME_ADJUST_EMERGENCY,
          title: '紧急时间调整警报',
          targetUser: {
            id: contact.id,
            name: contact.name,
            role: contact.role,
            openid: contact.openid
          },
          data: {
            patientName: adjustData.appointmentInfo.patientName,
            recorderName: adjustData.appointmentInfo.recorderName,
            emergencyReason: adjustData.adjustReason,
            originalTime: this.formatDateTime(adjustData.originalTime),
            newTime: this.formatDateTime(adjustData.newTime),
            emergencyLevel: emergencyLevel,
            affectedServicesCount: affectedServices.length,
            contactName: contact.name,
            contactRole: contact.role,
            appointmentId: adjustData.appointmentInfo.id
          },
          channels: [
            NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
            NOTIFICATION_CHANNELS.SMS,
            NOTIFICATION_CHANNELS.IN_APP
          ],
          priority: NOTIFICATION_PRIORITY.CRITICAL,
          templateId: TEMPLATE_TYPES.TIME_ADJUST_EMERGENCY
        };
        
        notifications.push(this.notificationService.createAndSend(notificationData));
      }
      
      const results = await Promise.allSettled(notifications);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`[TimeAdjustNotificationService] 紧急警报发送完成: ${successCount}/${results.length}`);
      return successCount > 0;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送紧急警报失败:', error);
      return false;
    }
  }

  /**
   * 综合协调通知发送
   * @param {Object} coordinateData 协调数据
   */
  async sendCoordinationNotifications(coordinateData) {
    try {
      const { adjustData, notificationScope, urgencyLevel } = coordinateData;
      
      const results = {
        patient: false,
        team: false,
        schedule: false,
        emergency: false
      };
      
      // 1. 发送患者通知
      if (notificationScope.includes('patient')) {
        results.patient = await this.sendAdjustRequestNotification(adjustData);
      }
      
      // 2. 发送团队通知
      if (notificationScope.includes('team')) {
        results.team = await this.sendTeamNotification({
          adjustData,
          notifyType: 'time_adjust',
          targetRoles: ['recorder', 'nurse', 'supervisor']
        });
      }
      
      // 3. 发送调度中心通知
      if (notificationScope.includes('schedule')) {
        results.schedule = await this.sendScheduleCenterNotification({
          adjustData,
          impactAnalysis: adjustData.impactAnalysis,
          conflictInfo: adjustData.conflictInfo
        });
      }
      
      // 4. 紧急情况警报
      if (urgencyLevel === 'critical' || adjustData.adjustType === 'emergency') {
        results.emergency = await this.sendEmergencyAlert({
          adjustData,
          emergencyLevel: urgencyLevel,
          affectedServices: adjustData.affectedServices || []
        });
      }
      
      console.log('[TimeAdjustNotificationService] 协调通知发送结果:', results);
      return results;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 发送协调通知失败:', error);
      return false;
    }
  }

  /**
   * 获取患者通知渠道
   */
  getPatientNotificationChannels() {
    const channels = [];
    
    if (this.config.patientNotification.enableWechat) {
      channels.push(NOTIFICATION_CHANNELS.WECHAT_TEMPLATE);
    }
    
    if (this.config.patientNotification.enableSMS) {
      channels.push(NOTIFICATION_CHANNELS.SMS);
    }
    
    if (this.config.patientNotification.enableInApp) {
      channels.push(NOTIFICATION_CHANNELS.IN_APP);
    }
    
    return channels;
  }

  /**
   * 获取调整优先级
   * @param {string} adjustType 调整类型
   */
  getAdjustPriority(adjustType) {
    switch (adjustType) {
      case 'emergency':
        return NOTIFICATION_PRIORITY.CRITICAL;
      case 'urgent':
        return NOTIFICATION_PRIORITY.URGENT;
      case 'batch':
        return NOTIFICATION_PRIORITY.HIGH;
      default:
        return NOTIFICATION_PRIORITY.NORMAL;
    }
  }

  /**
   * 格式化日期时间
   * @param {Date|string} dateTime 日期时间
   */
  formatDateTime(dateTime) {
    if (!dateTime) return '';
    
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return dateTime;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // ========== 内部协调辅助方法 ==========

  /**
   * 获取团队成员列表
   * @param {Object} appointmentInfo 预约信息
   * @param {Array} targetRoles 目标角色
   */
  async getTeamMembers(appointmentInfo, targetRoles = []) {
    try {
      // 模拟 API 调用，实际应该从服务器获取
      const allMembers = [
        {
          id: 'recorder_001',
          name: '张三',
          role: 'recorder',
          openid: 'openid_recorder_001',
          department: '护理部',
          phone: '13800138001'
        },
        {
          id: 'nurse_001',
          name: '李四',
          role: 'nurse',
          openid: 'openid_nurse_001',
          department: '护理部',
          phone: '13800138002'
        },
        {
          id: 'supervisor_001',
          name: '王五',
          role: 'supervisor',
          openid: 'openid_supervisor_001',
          department: '管理部',
          phone: '13800138003'
        }
      ];
      
      // 根据目标角色过滤
      if (targetRoles.length > 0) {
        return allMembers.filter(member => targetRoles.includes(member.role));
      }
      
      return allMembers;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取团队成员失败:', error);
      return [];
    }
  }

  /**
   * 获取调度中心人员
   */
  async getSchedulers() {
    try {
      // 模拟调度中心人员数据
      return [
        {
          id: 'scheduler_001',
          name: '赵六',
          role: 'scheduler',
          openid: 'openid_scheduler_001',
          department: '调度中心',
          phone: '13800138004'
        },
        {
          id: 'scheduler_002',
          name: '孙七',
          role: 'scheduler',
          openid: 'openid_scheduler_002',
          department: '调度中心',
          phone: '13800138005'
        }
      ];
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取调度中心人员失败:', error);
      return [];
    }
  }

  /**
   * 获取相关记录员
   * @param {Array} affectedAppointments 受影响的预约
   */
  async getRelatedRecorders(affectedAppointments) {
    try {
      // 模拟相关记录员数据
      const relatedRecorderIds = [...new Set(affectedAppointments.map(apt => apt.recorderId))];
      
      const allRecorders = [
        {
          id: 'recorder_002',
          name: '陈八',
          role: 'recorder',
          openid: 'openid_recorder_002',
          department: '护理部',
          phone: '13800138006'
        },
        {
          id: 'recorder_003',
          name: '刘九',
          role: 'recorder',
          openid: 'openid_recorder_003',
          department: '护理部',
          phone: '13800138007'
        }
      ];
      
      return allRecorders.filter(recorder => relatedRecorderIds.includes(recorder.id));
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取相关记录员失败:', error);
      return [];
    }
  }

  /**
   * 获取紧急联系人
   * @param {string} emergencyLevel 紧急级别
   */
  async getEmergencyContacts(emergencyLevel) {
    try {
      const contacts = {
        low: [
          {
            id: 'supervisor_001',
            name: '王五',
            role: 'supervisor',
            openid: 'openid_supervisor_001',
            phone: '13800138003'
          }
        ],
        medium: [
          {
            id: 'manager_001',
            name: '吴十',
            role: 'manager',
            openid: 'openid_manager_001',
            phone: '13800138008'
          }
        ],
        high: [
          {
            id: 'director_001',
            name: '郑十一',
            role: 'director',
            openid: 'openid_director_001',
            phone: '13800138009'
          }
        ],
        critical: [
          {
            id: 'ceo_001',
            name: '孙十二',
            role: 'ceo',
            openid: 'openid_ceo_001',
            phone: '13800138010'
          }
        ]
      };
      
      return contacts[emergencyLevel] || contacts.low;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取紧急联系人失败:', error);
      return [];
    }
  }

  /**
   * 获取团队通知类型
   * @param {string} notifyType 通知类型
   */
  getTeamNotificationType(notifyType) {
    const typeMap = {
      'time_adjust': NOTIFICATION_TYPES.TIME_ADJUST_REQUEST,
      'time_confirm': NOTIFICATION_TYPES.TIME_ADJUST_CONFIRM,
      'time_conflict': NOTIFICATION_TYPES.TIME_ADJUST_CONFLICT,
      'emergency': NOTIFICATION_TYPES.TIME_ADJUST_EMERGENCY
    };
    
    return typeMap[notifyType] || NOTIFICATION_TYPES.TIME_ADJUST_REQUEST;
  }

  /**
   * 获取团队通知标题
   * @param {string} notifyType 通知类型
   */
  getTeamNotificationTitle(notifyType) {
    const titleMap = {
      'time_adjust': '团队通知 - 时间调整申请',
      'time_confirm': '团队通知 - 时间调整确认',
      'time_conflict': '团队通知 - 时间冲突警报',
      'emergency': '团队通知 - 紧急调整'
    };
    
    return titleMap[notifyType] || '团队通知';
  }

  /**
   * 获取团队通知模板
   * @param {string} notifyType 通知类型
   */
  getTeamNotificationTemplate(notifyType) {
    const templateMap = {
      'time_adjust': 'team_time_adjust_notify',
      'time_confirm': 'team_time_confirm_notify',
      'time_conflict': 'team_time_conflict_notify',
      'emergency': 'team_emergency_adjust_notify'
    };
    
    return templateMap[notifyType] || 'team_time_adjust_notify';
  }

  /**
   * 获取团队通知渠道
   */
  getTeamNotificationChannels() {
    const channels = [];
    
    if (this.config.teamNotification.enableWechat) {
      channels.push(NOTIFICATION_CHANNELS.WECHAT_TEMPLATE);
    }
    
    if (this.config.teamNotification.enableInApp) {
      channels.push(NOTIFICATION_CHANNELS.IN_APP);
    }
    
    return channels;
  }

  /**
   * 获取调度通知优先级
   * @param {string} notifyLevel 通知级别
   * @param {string} adjustType 调整类型
   */
  getScheduleNotifyPriority(notifyLevel, adjustType) {
    if (adjustType === 'emergency' || notifyLevel === 'critical') {
      return NOTIFICATION_PRIORITY.CRITICAL;
    }
    if (notifyLevel === 'urgent' || adjustType === 'urgent') {
      return NOTIFICATION_PRIORITY.URGENT;
    }
    return NOTIFICATION_PRIORITY.HIGH;
  }

  /**
   * 获取团队通知优先级
   * @param {string} notifyType 通知类型
   * @param {string} adjustType 调整类型
   */
  getTeamNotifyPriority(notifyType, adjustType) {
    if (adjustType === 'emergency' || notifyType === 'emergency') {
      return NOTIFICATION_PRIORITY.CRITICAL;
    }
    
    if (notifyType === 'time_conflict') {
      return NOTIFICATION_PRIORITY.URGENT;
    }
    
    return NOTIFICATION_PRIORITY.HIGH;
  }

  /**
   * 获取团队通知紧急程度
   * @param {string} notifyType 通知类型
   * @param {string} adjustType 调整类型
   */
  getTeamNotifyUrgency(notifyType, adjustType) {
    if (adjustType === 'emergency') return 'critical';
    if (notifyType === 'time_conflict') return 'urgent';
    if (notifyType === 'time_adjust') return 'normal';
    return 'low';
  }

  /**
   * 构建影响分析描述
   * @param {Object} impactAnalysis 影响分析
   */
  buildImpactDescription(impactAnalysis) {
    if (!impactAnalysis) return '无影响分析';
    
    const parts = [];
    
    if (impactAnalysis.affectedAppointments) {
      parts.push(`影响预约数量: ${impactAnalysis.affectedAppointments}`);
    }
    
    if (impactAnalysis.resourceConflict) {
      parts.push(`资源冲突: ${impactAnalysis.resourceConflict}`);
    }
    
    if (impactAnalysis.workloadChange) {
      parts.push(`工作负荷变化: ${impactAnalysis.workloadChange}`);
    }
    
    return parts.join('; ') || '详细影响分析正在生成中';
  }

  /**
   * 构建冲突描述
   * @param {Object} conflictInfo 冲突信息
   */
  buildConflictDescription(conflictInfo) {
    if (!conflictInfo) return '无冲突';
    
    const parts = [];
    
    if (conflictInfo.hasConflict) {
      parts.push('存在时间冲突');
    }
    
    if (conflictInfo.conflictType) {
      parts.push(`冲突类型: ${conflictInfo.conflictType}`);
    }
    
    if (conflictInfo.conflictCount) {
      parts.push(`冲突数量: ${conflictInfo.conflictCount}`);
    }
    
    return parts.join('; ') || '无冲突检测';
  }

  // ========== 通知历史管理功能 ==========

  /**
   * 保存通知历史记录
   * @param {Object} notificationData 通知数据
   * @param {string} status 发送状态
   * @param {Object} result 发送结果
   */
  async saveNotificationHistory(notificationData, status, result = {}) {
    try {
      const historyRecord = {
        id: this.generateHistoryId(),
        type: 'time_adjust_notification',
        notificationType: notificationData.type,
        targetUser: notificationData.targetUser,
        channels: notificationData.channels,
        priority: notificationData.priority,
        status: status,
        content: {
          title: notificationData.title,
          data: notificationData.data
        },
        result: result,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          appointmentId: notificationData.data?.appointmentId,
          adjustType: notificationData.data?.adjustType,
          urgencyLevel: notificationData.data?.urgencyLevel
        }
      };
      
      // 保存到本地存储
      await this.saveToLocalStorage(historyRecord);
      
      // 同步到服务器（如果需要）
      await this.syncToServer(historyRecord);
      
      console.log('[TimeAdjustNotificationService] 通知历史保存成功:', historyRecord.id);
      return historyRecord;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 保存通知历史失败:', error);
      return null;
    }
  }

  /**
   * 生成统计建议
   * @param {Object} statistics 统计数据
   */
  generateStatisticsRecommendations(statistics) {
    const recommendations = [];
    
    // 成功率分析
    if (statistics.successRate < 80) {
      recommendations.push({
        type: 'success_rate',
        priority: 'high',
        message: `通知成功率仅为 ${statistics.successRate}%，建议检查网络环境和通知渠道配置`
      });
    }
    
    // 尝试次数分析
    if (statistics.averageAttempts > 2) {
      recommendations.push({
        type: 'retry_attempts',
        priority: 'medium',
        message: `平均尝试次数为 ${statistics.averageAttempts}，建议优化网络配置或调整重试策略`
      });
    }
    
    // 响应时间分析
    if (statistics.responseTime.average > 5000) {
      recommendations.push({
        type: 'response_time',
        priority: 'medium',
        message: `平均响应时间为 ${statistics.responseTime.average}ms，建议优化服务器性能`
      });
    }
    
    // 渠道分析
    const channelTotal = Object.values(statistics.byChannel).reduce((a, b) => a + b, 0);
    Object.keys(statistics.byChannel).forEach(channel => {
      const count = statistics.byChannel[channel];
      const rate = (count / channelTotal) * 100;
      
      if (rate < 10 && count > 0) {
        recommendations.push({
          type: 'channel_usage',
          priority: 'low',
          message: `${channel} 渠道使用率仅为 ${rate.toFixed(1)}%，考虑是否需要该渠道`
        });
      }
    });
    
    // 时间分布分析
    const hourlyTotal = Object.values(statistics.byHour).reduce((a, b) => a + b, 0);
    const peakHours = Object.keys(statistics.byHour)
      .filter(hour => (statistics.byHour[hour] / hourlyTotal) > 0.2);
    
    if (peakHours.length > 0) {
      recommendations.push({
        type: 'peak_hours',
        priority: 'low',
        message: `通知高峰时段： ${peakHours.join(', ')}时，可考虑错峰发送以提高效果`
      });
    }
    
    return recommendations;
  }

  /**
   * 获取通知历史列表（增强版本）
   * @param {Object} filters 筛选条件
   */
  async getNotificationHistory(filters = {}) {
    try {
      const {
        appointmentId,
        patientId,
        notificationType,
        status,
        startDate,
        endDate,
        page = 1,
        pageSize = 20
      } = filters;
      
      // 从本地存储获取
      let historyList = await this.getFromLocalStorage();
      
      // 应用筛选条件
      if (appointmentId) {
        historyList = historyList.filter(item => 
          item.metadata?.appointmentId === appointmentId
        );
      }
      
      if (patientId) {
        historyList = historyList.filter(item => 
          item.targetUser?.id === patientId
        );
      }
      
      if (notificationType) {
        historyList = historyList.filter(item => 
          item.notificationType === notificationType
        );
      }
      
      if (status) {
        historyList = historyList.filter(item => 
          item.status === status
        );
      }
      
      if (startDate) {
        historyList = historyList.filter(item => 
          new Date(item.createdAt) >= new Date(startDate)
        );
      }
      
      if (endDate) {
        historyList = historyList.filter(item => 
          new Date(item.createdAt) <= new Date(endDate)
        );
      }
      
      // 按时间倒序排列
      historyList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // 分页处理
      const total = historyList.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = historyList.slice(startIndex, endIndex);
      
      return {
        data: pageData,
        pagination: {
          page,
          pageSize,
          total,
          pages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取通知历史失败:', error);
      return {
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, pages: 0 }
      };
    }
  }

  /**
   * 获取单个通知历史详情
   * @param {string} historyId 历史ID
   */
  async getNotificationHistoryDetail(historyId) {
    try {
      const historyList = await this.getFromLocalStorage();
      const historyItem = historyList.find(item => item.id === historyId);
      
      if (!historyItem) {
        throw new Error('通知历史记录不存在');
      }
      
      return historyItem;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取通知历史详情失败:', error);
      return null;
    }
  }

  /**
   * 获取通知发送统计
   * @param {Object} dateRange 日期范围
   */
  async getNotificationStatistics(dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const historyList = await this.getFromLocalStorage();
      
      // 筛选日期范围
      let filteredList = historyList;
      if (startDate) {
        filteredList = filteredList.filter(item => 
          new Date(item.createdAt) >= new Date(startDate)
        );
      }
      if (endDate) {
        filteredList = filteredList.filter(item => 
          new Date(item.createdAt) <= new Date(endDate)
        );
      }
      
      // 统计数据
      const statistics = {
        total: filteredList.length,
        byStatus: {},
        byType: {},
        byChannel: {},
        byPriority: {},
        successRate: 0,
        timeDistribution: {}
      };
      
      // 按状态统计
      filteredList.forEach(item => {
        statistics.byStatus[item.status] = (statistics.byStatus[item.status] || 0) + 1;
      });
      
      // 按类型统计
      filteredList.forEach(item => {
        statistics.byType[item.notificationType] = (statistics.byType[item.notificationType] || 0) + 1;
      });
      
      // 按渠道统计
      filteredList.forEach(item => {
        item.channels.forEach(channel => {
          statistics.byChannel[channel] = (statistics.byChannel[channel] || 0) + 1;
        });
      });
      
      // 按优先级统计
      filteredList.forEach(item => {
        statistics.byPriority[item.priority] = (statistics.byPriority[item.priority] || 0) + 1;
      });
      
      // 计算成功率
      const successCount = statistics.byStatus['sent'] || 0;
      statistics.successRate = filteredList.length > 0 ? 
        Math.round((successCount / filteredList.length) * 100) : 0;
      
      // 时间分布统计（按小时）
      filteredList.forEach(item => {
        const hour = new Date(item.createdAt).getHours();
        statistics.timeDistribution[hour] = (statistics.timeDistribution[hour] || 0) + 1;
      });
      
      return statistics;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 获取通知统计失败:', error);
      return null;
    }
  }

  /**
   * 删除通知历史
   * @param {string|Array} historyIds 历史ID（单个或批量）
   */
  async deleteNotificationHistory(historyIds) {
    try {
      const ids = Array.isArray(historyIds) ? historyIds : [historyIds];
      const historyList = await this.getFromLocalStorage();
      
      const updatedList = historyList.filter(item => !ids.includes(item.id));
      
      await this.saveToLocalStorage(null, updatedList);
      
      console.log('[TimeAdjustNotificationService] 删除通知历史成功:', ids.length);
      return true;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 删除通知历史失败:', error);
      return false;
    }
  }

  /**
   * 清理过期历史记录
   * @param {number} daysToKeep 保留天数（默认30天）
   */
  async cleanupExpiredHistory(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const historyList = await this.getFromLocalStorage();
      const validList = historyList.filter(item => 
        new Date(item.createdAt) >= cutoffDate
      );
      
      const deletedCount = historyList.length - validList.length;
      
      if (deletedCount > 0) {
        await this.saveToLocalStorage(null, validList);
        console.log(`[TimeAdjustNotificationService] 清理过期历史记录: ${deletedCount} 条`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 清理过期历史失败:', error);
      return 0;
    }
  }

  /**
   * 导出通知历史
   * @param {Object} filters 筛选条件
   * @param {string} format 导出格式（json/csv）
   */
  async exportNotificationHistory(filters = {}, format = 'json') {
    try {
      const historyData = await this.getNotificationHistory(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(historyData.data);
      }
      
      return {
        data: historyData.data,
        exportTime: new Date().toISOString(),
        filters: filters,
        total: historyData.pagination.total
      };
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 导出通知历史失败:', error);
      return null;
    }
  }

  // ========== 历史管理辅助方法 ==========

  /**
   * 生成历史ID
   */
  generateHistoryId() {
    return 'notify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 保存到本地存储
   */
  async saveToLocalStorage(newRecord, fullList = null) {
    try {
      let historyList;
      
      if (fullList) {
        historyList = fullList;
      } else {
        historyList = await this.getFromLocalStorage();
        if (newRecord) {
          historyList.push(newRecord);
        }
      }
      
      wx.setStorageSync('time_adjust_notification_history', historyList);
      return true;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 保存到本地存储失败:', error);
      return false;
    }
  }

  /**
   * 从本地存储获取
   */
  async getFromLocalStorage() {
    try {
      return wx.getStorageSync('time_adjust_notification_history') || [];
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 从本地存储获取失败:', error);
      return [];
    }
  }

  /**
   * 同步到服务器
   */
  async syncToServer(historyRecord) {
    try {
      // 模拟 API 调用
      // const result = await api.saveNotificationHistory(historyRecord);
      
      console.log('[TimeAdjustNotificationService] 同步到服务器成功:', historyRecord.id);
      return true;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 同步到服务器失败:', error);
      return false;
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = [
      'ID',
      '通知类型',
      '目标用户',
      '状态',
      '渠道',
      '优先级',
      '创建时间'
    ];
    
    const csvContent = [headers.join(',')];
    
    data.forEach(item => {
      const row = [
        item.id,
        item.notificationType,
        item.targetUser?.name || '',
        item.status,
        item.channels.join(';'),
        item.priority,
        item.createdAt
      ];
      csvContent.push(row.join(','));
    });
    
    return csvContent.join('\n');
  }

  
  /**
   * 重新发送失败的患者通知
   * @param {string} historyId 历史记录ID
   */
  async resendFailedPatientNotification(historyId) {
    try {
      const historyItem = await this.getNotificationHistoryDetail(historyId);
      
      if (!historyItem) {
        throw new Error('通知历史记录不存在');
      }
      
      if (historyItem.status === 'sent') {
        return { success: false, message: '该通知已发送成功，无需重发' };
      }
      
      // 重新构建通知数据
      const notificationData = {
        type: historyItem.notificationType,
        title: historyItem.content.title,
        targetUser: historyItem.targetUser,
        data: historyItem.content.data,
        channels: historyItem.channels,
        priority: historyItem.priority,
        templateId: historyItem.templateId
      };
      
      // 重新发送
      const result = await this.sendWithRetry(notificationData, 2, 3000);
      
      // 更新历史记录
      if (result.success) {
        await this.updateNotificationHistoryStatus(historyId, 'sent', result);
      } else {
        await this.updateNotificationHistoryStatus(historyId, 'retry_failed', result);
      }
      
      return result;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 重发通知失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 更新通知历史状态
   * @param {string} historyId 历史ID
   * @param {string} status 新状态
   * @param {Object} result 结果数据
   */
  async updateNotificationHistoryStatus(historyId, status, result = {}) {
    try {
      const historyList = await this.getFromLocalStorage();
      const index = historyList.findIndex(item => item.id === historyId);
      
      if (index !== -1) {
        historyList[index].status = status;
        historyList[index].updatedAt = new Date().toISOString();
        historyList[index].result = { ...historyList[index].result, ...result };
        
        await this.saveToLocalStorage(null, historyList);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[TimeAdjustNotificationService] 更新通知历史状态失败:', error);
      return false;
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取配置
   */
  getConfig() {
    return this.config;
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.notificationService) {
      this.notificationService.destroy();
      this.notificationService = null;
    }
  }
}

module.exports = TimeAdjustNotificationService;