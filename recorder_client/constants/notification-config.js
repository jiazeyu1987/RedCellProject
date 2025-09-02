/**
 * 通知系统配置文件
 * 包含通知数据模型、发送机制、配置系统的核心配置
 */

// 通知类型枚举
const NOTIFICATION_TYPES = {
  // 预约相关通知
  APPOINTMENT_CONFIRM: 'appointment_confirm',      // 预约确认
  APPOINTMENT_REMINDER: 'appointment_reminder',   // 预约提醒
  APPOINTMENT_CHANGE: 'appointment_change',       // 预约变更
  APPOINTMENT_CANCEL: 'appointment_cancel',       // 预约取消
  APPOINTMENT_COMPLETE: 'appointment_complete',   // 预约完成
  
  // 时间调整相关通知
  TIME_ADJUST_REQUEST: 'time_adjust_request',     // 时间调整申请
  TIME_ADJUST_CONFIRM: 'time_adjust_confirm',     // 时间调整确认
  TIME_ADJUST_REJECT: 'time_adjust_reject',       // 时间调整拒绝
  TIME_ADJUST_SUCCESS: 'time_adjust_success',     // 时间调整成功
  TIME_ADJUST_CONFLICT: 'time_adjust_conflict',   // 时间调整冲突
  TIME_ADJUST_EMERGENCY: 'time_adjust_emergency', // 紧急时间调整
  TIME_ADJUST_BATCH: 'time_adjust_batch',         // 批量时间调整
  TIME_ADJUST_REMINDER: 'time_adjust_reminder',   // 时间调整提醒

  // 服务相关通知
  SERVICE_START: 'service_start',                 // 服务开始
  SERVICE_PROGRESS: 'service_progress',           // 服务进度
  SERVICE_COMPLETE: 'service_complete',           // 服务完成
  SERVICE_EVALUATION: 'service_evaluation',      // 服务评价
  SERVICE_EXCEPTION: 'service_exception',         // 异常情况

  // 付款相关通知
  PAYMENT_REMINDER: 'payment_reminder',           // 付款提醒
  PAYMENT_SUCCESS: 'payment_success',             // 付款成功
  PAYMENT_OVERDUE: 'payment_overdue',             // 逾期提醒
  REFUND_NOTICE: 'refund_notice',                // 退款通知
  BILL_CHANGE: 'bill_change',                     // 账单变更

  // 健康相关通知
  HEALTH_REMINDER: 'health_reminder',             // 健康提醒
  MEDICATION_REMINDER: 'medication_reminder',     // 用药提醒
  FOLLOWUP_REMINDER: 'followup_reminder',         // 复诊提醒
  HEALTH_REPORT: 'health_report',                 // 健康报告
  HEALTH_ALERT: 'health_alert',                   // 紧急健康警报

  // 系统通知
  SYSTEM_NOTICE: 'system_notice',                 // 系统公告
  VERSION_UPDATE: 'version_update',               // 版本更新
  MAINTENANCE_NOTICE: 'maintenance_notice'        // 维护通知
};

// 通知优先级
const NOTIFICATION_PRIORITY = {
  LOW: 1,       // 低优先级
  NORMAL: 2,    // 普通优先级
  HIGH: 3,      // 高优先级
  URGENT: 4,    // 紧急优先级
  CRITICAL: 5   // 关键优先级
};

// 通知状态
const NOTIFICATION_STATUS = {
  PENDING: 'pending',       // 待发送
  SENDING: 'sending',       // 发送中
  SENT: 'sent',            // 已发送
  DELIVERED: 'delivered',   // 已送达
  READ: 'read',            // 已读
  FAILED: 'failed',        // 发送失败
  EXPIRED: 'expired'       // 已过期
};

// 通知渠道
const NOTIFICATION_CHANNELS = {
  WECHAT_TEMPLATE: 'wechat_template',     // 微信模板消息
  WECHAT_SUBSCRIBE: 'wechat_subscribe',   // 微信订阅消息
  WECHAT_SERVICE: 'wechat_service',       // 微信服务号
  SMS: 'sms',                             // 短信
  IN_APP: 'in_app',                       // 应用内
  EMAIL: 'email',                         // 邮件(预留)
  PUSH: 'push'                            // 推送(预留)
};

// 通知频率限制
const NOTIFICATION_RATE_LIMITS = {
  [NOTIFICATION_TYPES.HEALTH_REMINDER]: {
    maxPerDay: 3,
    minInterval: 2 * 60 * 60 * 1000  // 2小时
  },
  [NOTIFICATION_TYPES.PAYMENT_REMINDER]: {
    maxPerDay: 2,
    minInterval: 4 * 60 * 60 * 1000  // 4小时
  },
  [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: {
    maxPerDay: 5,
    minInterval: 30 * 60 * 1000      // 30分钟
  },
  // 时间调整相关限制
  [NOTIFICATION_TYPES.TIME_ADJUST_REQUEST]: {
    maxPerDay: 10,
    minInterval: 5 * 60 * 1000       // 5分钟
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_CONFIRM]: {
    maxPerDay: 20,
    minInterval: 1 * 60 * 1000       // 1分钟
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_EMERGENCY]: {
    maxPerDay: 50,
    minInterval: 30 * 1000           // 30秒
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_BATCH]: {
    maxPerDay: 5,
    minInterval: 10 * 60 * 1000      // 10分钟
  },
  DEFAULT: {
    maxPerDay: 10,
    minInterval: 60 * 1000           // 1分钟
  }
};

// 通知时间窗口（不打扰时间）
const NOTIFICATION_TIME_WINDOW = {
  DEFAULT: {
    startTime: '08:00',
    endTime: '22:00'
  },
  URGENT: {
    startTime: '00:00',
    endTime: '23:59'
  },
  HEALTH_ALERT: {
    startTime: '00:00',
    endTime: '23:59'
  }
};

// 通知模板配置
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.APPOINTMENT_CONFIRM]: {
    wechat: 'appointment_confirm_wechat',
    sms: 'appointment_confirm_sms',
    inApp: 'appointment_confirm_app'
  },
  [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: {
    wechat: 'appointment_reminder_wechat',
    sms: 'appointment_reminder_sms',
    inApp: 'appointment_reminder_app'
  },
  [NOTIFICATION_TYPES.PAYMENT_REMINDER]: {
    wechat: 'payment_reminder_wechat',
    sms: 'payment_reminder_sms',
    inApp: 'payment_reminder_app'
  },
  [NOTIFICATION_TYPES.HEALTH_ALERT]: {
    wechat: 'health_alert_wechat',
    sms: 'health_alert_sms',
    inApp: 'health_alert_app'
  },
  // 时间调整相关模板
  [NOTIFICATION_TYPES.TIME_ADJUST_REQUEST]: {
    wechat: 'time_adjust_request_wechat',
    sms: 'time_adjust_request_sms',
    inApp: 'time_adjust_request_app'
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_CONFIRM]: {
    wechat: 'time_adjust_confirm_wechat',
    sms: 'time_adjust_confirm_sms',
    inApp: 'time_adjust_confirm_app'
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_SUCCESS]: {
    wechat: 'time_adjust_success_wechat',
    sms: 'time_adjust_success_sms',
    inApp: 'time_adjust_success_app'
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_CONFLICT]: {
    wechat: 'time_adjust_conflict_wechat',
    sms: 'time_adjust_conflict_sms',
    inApp: 'time_adjust_conflict_app'
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_EMERGENCY]: {
    wechat: 'time_adjust_emergency_wechat',
    sms: 'time_adjust_emergency_sms',
    inApp: 'time_adjust_emergency_app'
  },
  [NOTIFICATION_TYPES.TIME_ADJUST_BATCH]: {
    wechat: 'time_adjust_batch_wechat',
    sms: 'time_adjust_batch_sms',
    inApp: 'time_adjust_batch_app'
  }
  // 其他类型模板配置...
};

// 用户角色通知权限配置
const ROLE_NOTIFICATION_PERMISSIONS = {
  patient: {
    allowedTypes: [
      NOTIFICATION_TYPES.APPOINTMENT_CONFIRM,
      NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      NOTIFICATION_TYPES.SERVICE_COMPLETE,
      NOTIFICATION_TYPES.PAYMENT_REMINDER,
      NOTIFICATION_TYPES.HEALTH_REMINDER
    ],
    allowedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ]
  },
  recorder: {
    allowedTypes: Object.values(NOTIFICATION_TYPES),
    allowedChannels: Object.values(NOTIFICATION_CHANNELS)
  },
  admin: {
    allowedTypes: Object.values(NOTIFICATION_TYPES),
    allowedChannels: Object.values(NOTIFICATION_CHANNELS)
  }
};

// 通知重试配置
const NOTIFICATION_RETRY_CONFIG = {
  maxRetries: 3,
  retryIntervals: [1000, 5000, 30000], // 1秒, 5秒, 30秒
  backoffMultiplier: 2,
  maxBackoffTime: 5 * 60 * 1000 // 5分钟
};

// 通知队列配置
const NOTIFICATION_QUEUE_CONFIG = {
  maxQueueSize: 1000,
  batchSize: 50,
  processingInterval: 5000, // 5秒
  priorityQueues: {
    [NOTIFICATION_PRIORITY.CRITICAL]: 'critical_queue',
    [NOTIFICATION_PRIORITY.URGENT]: 'urgent_queue',
    [NOTIFICATION_PRIORITY.HIGH]: 'high_queue',
    [NOTIFICATION_PRIORITY.NORMAL]: 'normal_queue',
    [NOTIFICATION_PRIORITY.LOW]: 'low_queue'
  }
};

// 通知数据模型结构
const NOTIFICATION_DATA_MODEL = {
  id: 'string',                    // 通知ID
  type: 'string',                  // 通知类型
  title: 'string',                 // 通知标题
  content: 'string',               // 通知内容
  data: 'object',                  // 附加数据
  targetUser: 'object',            // 目标用户信息
  channels: 'array',               // 发送渠道
  priority: 'number',              // 优先级
  status: 'string',                // 状态
  scheduledTime: 'date',           // 计划发送时间
  sentTime: 'date',                // 实际发送时间
  deliveredTime: 'date',           // 送达时间
  readTime: 'date',                // 阅读时间
  expireTime: 'date',              // 过期时间
  retryCount: 'number',            // 重试次数
  metadata: 'object',              // 元数据
  createdAt: 'date',               // 创建时间
  updatedAt: 'date'                // 更新时间
};

// 默认配置
const DEFAULT_NOTIFICATION_CONFIG = {
  enabled: true,
  defaultChannel: NOTIFICATION_CHANNELS.IN_APP,
  defaultPriority: NOTIFICATION_PRIORITY.NORMAL,
  maxRetries: 3,
  timeWindow: NOTIFICATION_TIME_WINDOW.DEFAULT,
  rateLimit: NOTIFICATION_RATE_LIMITS.DEFAULT
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_STATUS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_RATE_LIMITS,
  NOTIFICATION_TIME_WINDOW,
  NOTIFICATION_TEMPLATES,
  ROLE_NOTIFICATION_PERMISSIONS,
  NOTIFICATION_RETRY_CONFIG,
  NOTIFICATION_QUEUE_CONFIG,
  NOTIFICATION_DATA_MODEL,
  DEFAULT_NOTIFICATION_CONFIG
};