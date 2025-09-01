/**
 * 通知模板类型定义
 * 支持多种消息类型和自定义模板
 */

// 模板类型枚举
export const TEMPLATE_TYPES = {
  // 预约相关
  APPOINTMENT_CONFIRM: 'appointment_confirm',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CHANGE: 'appointment_change',
  APPOINTMENT_CANCEL: 'appointment_cancel',
  
  // 时间调整相关
  TIME_ADJUST_REQUEST: 'time_adjust_request',
  TIME_ADJUST_CONFIRM: 'time_adjust_confirm',
  TIME_ADJUST_REJECT: 'time_adjust_reject',
  TIME_ADJUST_SUCCESS: 'time_adjust_success',
  TIME_ADJUST_CONFLICT: 'time_adjust_conflict',
  TIME_ADJUST_EMERGENCY: 'time_adjust_emergency',
  TIME_ADJUST_BATCH: 'time_adjust_batch',
  TIME_ADJUST_REMINDER: 'time_adjust_reminder',
  
  // 服务相关
  SERVICE_START: 'service_start',
  SERVICE_PROGRESS: 'service_progress',
  SERVICE_COMPLETE: 'service_complete',
  SERVICE_EVALUATION: 'service_evaluation',
  
  // 付款相关
  PAYMENT_REMINDER: 'payment_reminder',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_OVERDUE: 'payment_overdue',
  PAYMENT_REFUND: 'payment_refund',
  
  // 健康相关
  HEALTH_ALERT: 'health_alert',
  MEDICATION_REMINDER: 'medication_reminder',
  CHECKUP_REMINDER: 'checkup_reminder',
  HEALTH_REPORT: 'health_report',
  
  // 系统相关
  SYSTEM_NOTICE: 'system_notice',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  
  // 营销推广
  MARKETING_PROMOTION: 'marketing_promotion',
  MARKETING_EVENT: 'marketing_event',
  MARKETING_SURVEY: 'marketing_survey'
};

// 消息格式类型
export const MESSAGE_FORMATS = {
  TEXT: 'text',           // 纯文本消息
  CARD: 'card',           // 卡片消息
  IMAGE_TEXT: 'image_text', // 图文消息
  RICH_TEXT: 'rich_text', // 富文本消息
  CUSTOM: 'custom'        // 自定义格式
};

// 通知渠道类型
export const NOTIFICATION_CHANNELS = {
  WECHAT_TEMPLATE: 'wechat_template',     // 微信模板消息
  WECHAT_SUBSCRIBE: 'wechat_subscribe',   // 微信订阅消息
  SMS: 'sms',                             // 短信
  IN_APP: 'in_app',                       // 应用内通知
  EMAIL: 'email',                         // 邮件
  PUSH: 'push'                            // 推送通知
};

// 模板类型配置
export const TEMPLATE_TYPE_CONFIGS = {
  [TEMPLATE_TYPES.APPOINTMENT_CONFIRM]: {
    name: '预约确认通知',
    description: '患者预约成功后的确认通知',
    category: 'appointment',
    icon: 'calendar-check',
    color: '#4CAF50',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'serviceName',
      'serviceTime',
      'address'
    ],
    optionalVariables: [
      'recorderName',
      'contactPhone',
      'notes'
    ],
    defaultTemplate: {
      title: '预约确认',
      content: '尊敬的{patientName}，您预约的{serviceName}已确认。\n\n服务时间：{serviceTime}\n服务地址：{address}\n\n如有疑问，请联系：{contactPhone}'
    }
  },

  [TEMPLATE_TYPES.APPOINTMENT_REMINDER]: {
    name: '预约提醒通知',
    description: '预约前的提醒通知',
    category: 'appointment',
    icon: 'alarm',
    color: '#FF9800',
    priority: 'normal',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'serviceName',
      'serviceTime'
    ],
    optionalVariables: [
      'address',
      'recorderName',
      'preparationNotes'
    ],
    defaultTemplate: {
      title: '预约提醒',
      content: '{patientName}您好，您预约的{serviceName}将于{serviceTime}开始，请提前做好准备。'
    }
  },

  [TEMPLATE_TYPES.SERVICE_COMPLETE]: {
    name: '服务完成通知',
    description: '服务完成后的通知',
    category: 'service',
    icon: 'check-circle',
    color: '#4CAF50',
    priority: 'normal',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD,
      MESSAGE_FORMATS.RICH_TEXT
    ],
    requiredVariables: [
      'patientName',
      'serviceName',
      'completedTime'
    ],
    optionalVariables: [
      'serviceDuration',
      'serviceNotes',
      'nextAppointment'
    ],
    defaultTemplate: {
      title: '服务完成',
      content: '{patientName}您好，您的{serviceName}已于{completedTime}完成。感谢您的信任！'
    }
  },

  [TEMPLATE_TYPES.PAYMENT_REMINDER]: {
    name: '付款提醒通知',
    description: '付款提醒通知',
    category: 'payment',
    icon: 'credit-card',
    color: '#F44336',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'amount',
      'dueDate'
    ],
    optionalVariables: [
      'serviceName',
      'paymentMethod',
      'contactPhone'
    ],
    defaultTemplate: {
      title: '付款提醒',
      content: '{patientName}您好，您有一笔{amount}元的费用即将到期，请于{dueDate}前完成付款。'
    }
  },

  [TEMPLATE_TYPES.HEALTH_ALERT]: {
    name: '健康警报通知',
    description: '健康异常警报通知',
    category: 'health',
    icon: 'warning',
    color: '#FF5722',
    priority: 'urgent',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP,
      NOTIFICATION_CHANNELS.PUSH
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'alertType',
      'alertTime'
    ],
    optionalVariables: [
      'alertDetails',
      'emergencyContact',
      'actionRequired'
    ],
    defaultTemplate: {
      title: '健康警报',
      content: '【健康警报】{patientName}，检测到{alertType}异常，时间：{alertTime}。请及时关注！'
    }
  },

  [TEMPLATE_TYPES.SYSTEM_NOTICE]: {
    name: '系统公告通知',
    description: '系统公告和重要通知',
    category: 'system',
    icon: 'megaphone',
    color: '#2196F3',
    priority: 'normal',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.RICH_TEXT
    ],
    requiredVariables: [
      'noticeTitle',
      'noticeContent'
    ],
    optionalVariables: [
      'effectiveDate',
      'contactInfo'
    ],
    defaultTemplate: {
      title: '系统公告',
      content: '【系统公告】{noticeTitle}\n\n{noticeContent}'
    }
  },

  // 时间调整相关模板
  [TEMPLATE_TYPES.TIME_ADJUST_REQUEST]: {
    name: '时间调整申请通知',
    description: '时间调整申请提交后的通知',
    category: 'time_adjust',
    icon: 'clock-edit',
    color: '#FF9800',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'originalTime',
      'newTime',
      'reason'
    ],
    optionalVariables: [
      'serviceName',
      'recorderName',
      'contactPhone',
      'adjustType'
    ],
    defaultTemplate: {
      title: '时间调整申请',
      content: '{patientName}您好，您的预约时间调整申请已提交。\n\n原时间：{originalTime}\n新时间：{newTime}\n调整原因：{reason}\n\n我们将尽快处理您的申请。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_CONFIRM]: {
    name: '时间调整确认通知',
    description: '时间调整申请被确认后的通知',
    category: 'time_adjust',
    icon: 'check-circle',
    color: '#4CAF50',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'originalTime',
      'newTime',
      'confirmTime'
    ],
    optionalVariables: [
      'serviceName',
      'recorderName',
      'contactPhone',
      'notes'
    ],
    defaultTemplate: {
      title: '时间调整确认',
      content: '{patientName}您好，您的时间调整申请已被确认。\n\n原时间：{originalTime}\n新时间：{newTime}\n确认时间：{confirmTime}\n\n请按新时间准时参加服务。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_REJECT]: {
    name: '时间调整拒绝通知',
    description: '时间调整申请被拒绝后的通知',
    category: 'time_adjust',
    icon: 'x-circle',
    color: '#F44336',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'originalTime',
      'requestedTime',
      'rejectReason'
    ],
    optionalVariables: [
      'serviceName',
      'alternativeTime',
      'contactPhone'
    ],
    defaultTemplate: {
      title: '时间调整拒绝',
      content: '{patientName}您好，很抱歉，您的时间调整申请被拒绝。\n\n原时间：{originalTime}\n申请时间：{requestedTime}\n拒绝原因：{rejectReason}\n\n请按原时间参加服务或联系我们重新安排。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_SUCCESS]: {
    name: '时间调整成功通知',
    description: '时间调整成功完成后的通知',
    category: 'time_adjust',
    icon: 'check',
    color: '#4CAF50',
    priority: 'normal',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'newTime',
      'successTime'
    ],
    optionalVariables: [
      'serviceName',
      'recorderName',
      'notes'
    ],
    defaultTemplate: {
      title: '时间调整成功',
      content: '{patientName}您好，您的时间调整已成功完成。\n\n新时间：{newTime}\n调整时间：{successTime}\n\n感谢您的理解与配合！'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_CONFLICT]: {
    name: '时间调整冲突通知',
    description: '时间调整出现冲突后的通知',
    category: 'time_adjust',
    icon: 'alert-triangle',
    color: '#FF5722',
    priority: 'urgent',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'conflictTime',
      'conflictReason'
    ],
    optionalVariables: [
      'alternativeTime1',
      'alternativeTime2',
      'contactPhone'
    ],
    defaultTemplate: {
      title: '时间调整冲突',
      content: '{patientName}您好，您申请的时间{conflictTime}出现冲突。\n\n冲突原因：{conflictReason}\n\n建议时间：{alternativeTime1}\n或者：{alternativeTime2}\n\n请重新选择时间。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_EMERGENCY]: {
    name: '紧急时间调整通知',
    description: '紧急情况下的时间调整通知',
    category: 'time_adjust',
    icon: 'zap',
    color: '#FF3B30',
    priority: 'critical',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP,
      NOTIFICATION_CHANNELS.PUSH
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD
    ],
    requiredVariables: [
      'patientName',
      'emergencyReason',
      'originalTime',
      'newTime'
    ],
    optionalVariables: [
      'urgencyLevel',
      'contactPhone',
      'compensationInfo'
    ],
    defaultTemplate: {
      title: '紧急时间调整',
      content: '【紧急通知】{patientName}您好，由于{emergencyReason}，您的服务时间需要紧急调整。\n\n原时间：{originalTime}\n新时间：{newTime}\n\n请及时查看并回复确认。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_BATCH]: {
    name: '批量时间调整通知',
    description: '批量时间调整的通知',
    category: 'time_adjust',
    icon: 'layers',
    color: '#9C27B0',
    priority: 'high',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
      NOTIFICATION_CHANNELS.SMS,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT,
      MESSAGE_FORMATS.CARD,
      MESSAGE_FORMATS.RICH_TEXT
    ],
    requiredVariables: [
      'patientName',
      'adjustCount',
      'adjustDetails'
    ],
    optionalVariables: [
      'effectiveDate',
      'reason',
      'contactPhone'
    ],
    defaultTemplate: {
      title: '批量时间调整',
      content: '{patientName}您好，您有{adjustCount}个预约的时间需要调整。\n\n调整详情：\n{adjustDetails}\n\n请查看详情并确认。'
    }
  },

  [TEMPLATE_TYPES.TIME_ADJUST_REMINDER]: {
    name: '时间调整提醒通知',
    description: '时间调整相关的提醒通知',
    category: 'time_adjust',
    icon: 'bell',
    color: '#607D8B',
    priority: 'normal',
    supportedChannels: [
      NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE,
      NOTIFICATION_CHANNELS.IN_APP
    ],
    supportedFormats: [
      MESSAGE_FORMATS.TEXT
    ],
    requiredVariables: [
      'patientName',
      'reminderType',
      'reminderTime'
    ],
    optionalVariables: [
      'actionRequired',
      'deadline'
    ],
    defaultTemplate: {
      title: '时间调整提醒',
      content: '{patientName}您好，提醒您{reminderType}。\n\n提醒时间：{reminderTime}\n请及时处理。'
    }
  }
};

// 模板格式配置
export const FORMAT_CONFIGS = {
  [MESSAGE_FORMATS.TEXT]: {
    name: '纯文本',
    description: '简单的文本消息',
    icon: 'text',
    maxLength: 500,
    features: ['variables', 'conditions'],
    restrictions: {
      noImages: true,
      noLinks: false,
      noFormatting: true
    }
  },

  [MESSAGE_FORMATS.CARD]: {
    name: '卡片消息',
    description: '包含标题、内容和按钮的卡片格式',
    icon: 'card',
    maxLength: 800,
    features: ['variables', 'conditions', 'buttons', 'images'],
    structure: {
      title: { required: true, maxLength: 50 },
      content: { required: true, maxLength: 300 },
      image: { required: false },
      buttons: { required: false, maxCount: 3 }
    }
  },

  [MESSAGE_FORMATS.IMAGE_TEXT]: {
    name: '图文消息',
    description: '包含图片和文字的消息',
    icon: 'image-text',
    maxLength: 600,
    features: ['variables', 'conditions', 'images', 'links'],
    structure: {
      title: { required: true, maxLength: 60 },
      description: { required: true, maxLength: 200 },
      image: { required: true },
      link: { required: false }
    }
  },

  [MESSAGE_FORMATS.RICH_TEXT]: {
    name: '富文本',
    description: '支持格式化的富文本消息',
    icon: 'rich-text',
    maxLength: 1000,
    features: ['variables', 'conditions', 'formatting', 'links', 'lists'],
    restrictions: {
      allowedTags: ['b', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'a']
    }
  },

  [MESSAGE_FORMATS.CUSTOM]: {
    name: '自定义格式',
    description: '完全自定义的消息格式',
    icon: 'code',
    maxLength: 2000,
    features: ['variables', 'conditions', 'functions', 'custom'],
    restrictions: {
      requiresApproval: true
    }
  }
};

// 渠道配置
export const CHANNEL_CONFIGS = {
  [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE]: {
    name: '微信模板消息',
    description: '微信公众号模板消息',
    icon: 'wechat',
    color: '#07C160',
    features: ['variables', 'links'],
    limitations: {
      maxLength: 600,
      requiresTemplate: true,
      needsUserSubscription: false
    }
  },

  [NOTIFICATION_CHANNELS.WECHAT_SUBSCRIBE]: {
    name: '微信订阅消息',
    description: '微信小程序订阅消息',
    icon: 'wechat-mini',
    color: '#07C160',
    features: ['variables'],
    limitations: {
      maxLength: 200,
      requiresTemplate: true,
      needsUserSubscription: true,
      onceOnly: true
    }
  },

  [NOTIFICATION_CHANNELS.SMS]: {
    name: '短信通知',
    description: '手机短信通知',
    icon: 'message',
    color: '#FF9800',
    features: ['variables'],
    limitations: {
      maxLength: 70,
      chargeable: true,
      needsSignature: true
    }
  },

  [NOTIFICATION_CHANNELS.IN_APP]: {
    name: '应用内通知',
    description: '小程序内部通知',
    icon: 'bell',
    color: '#2196F3',
    features: ['variables', 'formatting', 'actions'],
    limitations: {
      maxLength: 1000,
      requiresLogin: true
    }
  },

  [NOTIFICATION_CHANNELS.EMAIL]: {
    name: '邮件通知',
    description: '电子邮件通知',
    icon: 'email',
    color: '#FF5722',
    features: ['variables', 'formatting', 'attachments'],
    limitations: {
      maxLength: 5000,
      requiresEmailAddress: true
    }
  },

  [NOTIFICATION_CHANNELS.PUSH]: {
    name: '推送通知',
    description: '系统推送通知',
    icon: 'notification',
    color: '#9C27B0',
    features: ['variables', 'actions'],
    limitations: {
      maxLength: 100,
      requiresPermission: true
    }
  }
};

// 获取模板类型配置
export function getTemplateTypeConfig(type) {
  return TEMPLATE_TYPE_CONFIGS[type] || null;
}

// 获取格式配置
export function getFormatConfig(format) {
  return FORMAT_CONFIGS[format] || null;
}

// 获取渠道配置
export function getChannelConfig(channel) {
  return CHANNEL_CONFIGS[channel] || null;
}

// 获取支持的格式
export function getSupportedFormats(type) {
  const config = getTemplateTypeConfig(type);
  return config ? config.supportedFormats : [];
}

// 获取支持的渠道
export function getSupportedChannels(type) {
  const config = getTemplateTypeConfig(type);
  return config ? config.supportedChannels : [];
}

// 验证模板类型和格式兼容性
export function validateTypeFormatCompatibility(type, format) {
  const supportedFormats = getSupportedFormats(type);
  return supportedFormats.includes(format);
}

// 验证模板类型和渠道兼容性
export function validateTypeChannelCompatibility(type, channel) {
  const supportedChannels = getSupportedChannels(type);
  return supportedChannels.includes(channel);
}

// 获取默认模板
export function getDefaultTemplate(type) {
  const config = getTemplateTypeConfig(type);
  return config ? config.defaultTemplate : null;
}

// 获取必需变量
export function getRequiredVariables(type) {
  const config = getTemplateTypeConfig(type);
  return config ? config.requiredVariables : [];
}

// 获取可选变量
export function getOptionalVariables(type) {
  const config = getTemplateTypeConfig(type);
  return config ? config.optionalVariables : [];
}

// 获取所有变量
export function getAllVariables(type) {
  const required = getRequiredVariables(type);
  const optional = getOptionalVariables(type);
  return [...required, ...optional];
}

// 按分类获取模板类型
export function getTemplateTypesByCategory() {
  const categories = {};
  
  Object.entries(TEMPLATE_TYPE_CONFIGS).forEach(([type, config]) => {
    const category = config.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({
      type,
      ...config
    });
  });
  
  return categories;
}

// 获取分类信息
export function getCategoryInfo() {
  return {
    appointment: {
      name: '预约管理',
      description: '预约相关的通知模板',
      icon: 'calendar',
      color: '#4CAF50'
    },
    service: {
      name: '服务管理', 
      description: '服务过程相关的通知模板',
      icon: 'service',
      color: '#2196F3'
    },
    payment: {
      name: '付款管理',
      description: '付款相关的通知模板',
      icon: 'payment',
      color: '#FF9800'
    },
    health: {
      name: '健康管理',
      description: '健康相关的通知模板',
      icon: 'health',
      color: '#E91E63'
    },
    system: {
      name: '系统管理',
      description: '系统相关的通知模板',
      icon: 'settings',
      color: '#607D8B'
    },
    marketing: {
      name: '营销推广',
      description: '营销推广相关的通知模板',
      icon: 'campaign',
      color: '#FF5722'
    }
  };
}