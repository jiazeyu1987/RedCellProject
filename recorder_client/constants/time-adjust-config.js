/**
 * 时间调整功能配置文件
 * 统一管理时间调整相关的配置项
 */

export const TIME_ADJUST_CONFIG = {
  // 调整权限配置 - 增强版
  permissions: {
    normal: {
      maxAdjustHours: 24,      // 最大调整小时数
      maxAdjustTimes: 3,       // 每日最大调整次数
      requireApproval: false,  // 是否需要审批
      minNoticeHours: 2,       // 最小提前通知时间
      allowedTimeRanges: [     // 允许调整的时间范围
        { start: '08:00', end: '18:00', label: '工作时间' },
      ],
      restrictedDays: [],      // 限制调整的日期（节假日等）
      maxCrossDays: 0,         // 最大跨天数
      emergencyOverride: false, // 紧急情况是否可以超越限制
      
      // 新增：细化的时间范围限制
      timeRangeRestrictions: {
        maxForwardAdjust: 24,    // 向后调整最大小时数
        maxBackwardAdjust: 12,   // 向前调整最大小时数
        allowCrossWeek: false,   // 是否允许跨周调整
        allowHoliday: false,     // 是否允许节假日调整
        allowWeekend: false,     // 是否允许周末调整
        restrictedHours: {       // 限制的具体时间段
          start: ['22:00', '06:00'], // 夜间限制
          lunch: ['12:00', '13:00'], // 午休时间
          emergency: []            // 紧急情况下也限制的时间
        }
      },
      
      // 新增：条件性限制
      conditionalRestrictions: {
        patientType: {
          vip: { requireApproval: true, minNoticeHours: 4 },
          elderly: { maxAdjustHours: 12, restrictedHours: ['22:00', '06:00'] },
          critical: { requireApproval: true, minNoticeHours: 6 }
        },
        serviceType: {
          surgery: { maxAdjustHours: 6, requireApproval: true },
          medication: { maxAdjustHours: 2, minNoticeHours: 4 },
          routine: { maxAdjustHours: 24 }
        },
        weather: {
          severe: { maxAdjustHours: 6, requireApproval: true },
          rain: { maxAdjustHours: 12 }
        }
      }
    },
    
    advanced: {
      maxAdjustHours: 72,
      maxAdjustTimes: 10,
      requireApproval: false,
      minNoticeHours: 1,
      allowedTimeRanges: [
        { start: '08:00', end: '20:00', label: '扩展工作时间' },
      ],
      restrictedDays: [],
      maxCrossDays: 2,         // 可以跨2天调整
      emergencyOverride: true,
      
      timeRangeRestrictions: {
        maxForwardAdjust: 72,    // 向后调整最大72小时
        maxBackwardAdjust: 48,   // 向前调整最大48小时
        allowCrossWeek: true,    // 允许跨周调整
        allowHoliday: false,     // 节假日需要审批
        allowWeekend: true,      // 允许周末调整
        restrictedHours: {
          start: ['23:00', '05:00'], // 深夜限制缩小
          lunch: [],               // 取消午休限制
          emergency: ['01:00', '04:00'] // 紧急情况下的限制
        }
      },
      
      conditionalRestrictions: {
        patientType: {
          vip: { requireApproval: false, minNoticeHours: 2 },
          elderly: { maxAdjustHours: 48, restrictedHours: ['23:00', '05:00'] },
          critical: { requireApproval: true, minNoticeHours: 3 }
        },
        serviceType: {
          surgery: { maxAdjustHours: 24, requireApproval: true },
          medication: { maxAdjustHours: 12, minNoticeHours: 2 },
          routine: { maxAdjustHours: 72 }
        },
        weather: {
          severe: { maxAdjustHours: 24, requireApproval: true },
          rain: { maxAdjustHours: 48 }
        }
      }
    },
    
    emergency: {
      maxAdjustHours: 168,
      maxAdjustTimes: 999,
      requireApproval: true,
      minNoticeHours: 0,
      allowedTimeRanges: [
        { start: '00:00', end: '23:59', label: '全天24小时' }
      ],
      restrictedDays: [],
      maxCrossDays: 7,         // 可以跨一周调整
      emergencyOverride: true,
      
      timeRangeRestrictions: {
        maxForwardAdjust: 168,   // 向后调整最大一周
        maxBackwardAdjust: 168,  // 向前调整最大一周
        allowCrossWeek: true,    // 允许跨周调整
        allowHoliday: true,      // 允许节假日调整
        allowWeekend: true,      // 允许周末调整
        restrictedHours: {
          start: [],             // 无时间限制
          lunch: [],
          emergency: []          // 紧急情况无限制
        }
      },
      
      conditionalRestrictions: {
        patientType: {
          vip: { requireApproval: true, minNoticeHours: 1 },
          elderly: { maxAdjustHours: 168, minNoticeHours: 1 },
          critical: { requireApproval: true, minNoticeHours: 0 }
        },
        serviceType: {
          surgery: { maxAdjustHours: 168, requireApproval: true },
          medication: { maxAdjustHours: 168, minNoticeHours: 0 },
          routine: { maxAdjustHours: 168 }
        },
        weather: {
          severe: { maxAdjustHours: 168, requireApproval: true },
          rain: { maxAdjustHours: 168 }
        }
      }
    },
    
    admin: {
      maxAdjustHours: 999,
      maxAdjustTimes: 999,
      requireApproval: false,
      minNoticeHours: 0,
      allowedTimeRanges: [
        { start: '00:00', end: '23:59', label: '无限制' }
      ],
      restrictedDays: [],
      maxCrossDays: 999,
      emergencyOverride: true,
      
      timeRangeRestrictions: {
        maxForwardAdjust: 999,
        maxBackwardAdjust: 999,
        allowCrossWeek: true,
        allowHoliday: true,
        allowWeekend: true,
        restrictedHours: {
          start: [],
          lunch: [],
          emergency: []
        }
      },
      
      conditionalRestrictions: {
        patientType: {},
        serviceType: {},
        weather: {}
      }
    }
  },

  // 时间间隔配置
  timeIntervals: {
    defaultStep: 15,     // 默认时间步长（分钟）
    minDuration: 30,     // 最小服务时长（分钟）
    maxDuration: 480,    // 最大服务时长（分钟）
    bufferTime: 15       // 预约间缓冲时间（分钟）
  },

  // 智能推荐配置
  smartRecommend: {
    maxRecommends: 5,        // 最大推荐数量
    considerDistance: true,   // 是否考虑距离
    considerHistory: true,    // 是否考虑历史偏好
    considerWorkload: true,   // 是否考虑工作负荷
    scoreThreshold: 60       // 推荐分数阈值
  },

  // 冲突检测配置
  conflictDetection: {
    checkRadius: 7,          // 检查范围（天）
    includeTravel: true,     // 是否包含路程时间
    autoResolve: false,      // 是否自动解决冲突
    suggestAlternatives: 3   // 建议替代方案数量
  },

  // 通知配置
  notification: {
    patientNotify: true,     // 是否通知患者
    teamNotify: true,        // 是否通知团队
    autoRemind: true,        // 是否自动提醒
    reminderHours: [24, 2]   // 提醒时间点（小时）
  },

  // 界面配置
  ui: {
    showSmartRecommend: true,  // 显示智能推荐
    showHistory: true,         // 显示调整历史
    enableBatch: true,         // 启用批量操作
    animationDuration: 300     // 动画持续时间（毫秒）
  }
};

// 调整原因预设
export const ADJUST_REASONS = [
  {
    key: 'patient_emergency',
    label: '患者临时有事',
    category: 'patient',
    urgent: false
  },
  {
    key: 'traffic_delay',
    label: '路况堵塞延误',
    category: 'external',
    urgent: false
  },
  {
    key: 'previous_overtime',
    label: '上个服务超时',
    category: 'schedule',
    urgent: true
  },
  {
    key: 'emergency_situation',
    label: '紧急情况处理',
    category: 'emergency',
    urgent: true
  },
  {
    key: 'patient_illness',
    label: '患者身体不适',
    category: 'patient',
    urgent: true
  },
  {
    key: 'equipment_failure',
    label: '医疗设备故障',
    category: 'equipment',
    urgent: false
  },
  {
    key: 'weather_reason',
    label: '天气原因',
    category: 'external',
    urgent: false
  },
  {
    key: 'other_reason',
    label: '其他原因',
    category: 'other',
    urgent: false
  }
];

// 时间段预设
export const TIME_SLOTS = {
  morning: {
    label: '上午',
    start: '08:00',
    end: '12:00',
    peak: true
  },
  afternoon: {
    label: '下午',
    start: '14:00',
    end: '18:00',
    peak: true
  },
  evening: {
    label: '晚上',
    start: '18:00',
    end: '21:00',
    peak: false
  },
  night: {
    label: '夜间',
    start: '21:00',
    end: '08:00',
    peak: false,
    restricted: true
  }
};

// 状态映射
export const ADJUST_STATUS = {
  pending: {
    label: '待确认',
    color: '#ffc107',
    icon: '⏳'
  },
  approved: {
    label: '已批准',
    color: '#28a745',
    icon: '✅'
  },
  rejected: {
    label: '已拒绝',
    color: '#dc3545',
    icon: '❌'
  },
  completed: {
    label: '已完成',
    color: '#6c757d',
    icon: '✓'
  },
  cancelled: {
    label: '已取消',
    color: '#6c757d',
    icon: '🚫'
  }
};

// 工具函数
export const TimeAdjustUtils = {
  /**
   * 获取用户权限级别
   */
  getUserPermissionLevel(userInfo) {
    const { role, experience, certifications } = userInfo;
    
    if (role === 'supervisor' || certifications.includes('emergency')) {
      return 'emergency';
    } else if (experience > 12 || certifications.includes('advanced')) {
      return 'advanced';
    } else {
      return 'normal';
    }
  },

  /**
   * 计算调整影响分数
   */
  calculateAdjustImpact(originalTime, newTime, appointmentInfo) {
    let impact = 0;
    
    const timeDiff = Math.abs(new Date(newTime) - new Date(originalTime));
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // 时间差异影响
    if (hoursDiff > 24) impact += 30;
    else if (hoursDiff > 8) impact += 20;
    else if (hoursDiff > 2) impact += 10;
    
    // 紧急程度影响
    if (appointmentInfo.urgent) impact += 20;
    
    // 患者类型影响
    if (appointmentInfo.patientType === 'vip') impact += 15;
    
    return Math.min(impact, 100);
  },

  /**
   * 格式化调整原因
   */
  formatAdjustReason(reasonKey, customReason) {
    const predefined = ADJUST_REASONS.find(r => r.key === reasonKey);
    
    if (predefined) {
      return predefined.label;
    } else if (reasonKey === 'other_reason' && customReason) {
      return customReason;
    } else {
      return '未知原因';
    }
  },

  /**
   * 验证调整权限 - 增强版
   */
  validateAdjustPermission(userLevel, adjustData) {
    const permissions = TIME_ADJUST_CONFIG.permissions[userLevel];
    const now = new Date();
    const adjustTime = new Date(adjustData.newTime);
    const originalTime = new Date(adjustData.originalTime);
    
    const hoursDiff = Math.abs(adjustTime - originalTime) / (1000 * 60 * 60);
    const noticeHours = (originalTime - now) / (1000 * 60 * 60);
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      adjustmentType: 'normal',
      requireApproval: permissions.requireApproval
    };
    
    // 1. 检查调整小时数限制
    if (hoursDiff > permissions.maxAdjustHours && !permissions.emergencyOverride) {
      validation.valid = false;
      validation.errors.push(`调整时间超出权限范围（最大${permissions.maxAdjustHours}小时）`);
    }
    
    // 2. 检查提前通知时间
    if (noticeHours < permissions.minNoticeHours && !permissions.emergencyOverride) {
      validation.valid = false;
      validation.errors.push(`提前通知时间不足（最少${permissions.minNoticeHours}小时）`);
    }
    
    // 3. 检查允许的时间范围
    const timeRangeValid = this.validateTimeRange(adjustTime, permissions.allowedTimeRanges);
    if (!timeRangeValid.valid) {
      if (permissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push('调整到非工作时间，紧急情况允许但需审批');
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push('调整时间超出允许的时间范围');
      }
    }
    
    // 4. 检查跨天限制
    const crossDays = this.calculateCrossDays(originalTime, adjustTime);
    if (crossDays > permissions.maxCrossDays) {
      if (permissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`跨天调整超出限制（${crossDays}>${permissions.maxCrossDays}），需要特殊审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(`跨天调整超出限制（最大${permissions.maxCrossDays}天）`);
      }
    }
    
    // 5. 检查限制日期
    const restrictedDayCheck = this.checkRestrictedDays(adjustTime, permissions.restrictedDays);
    if (!restrictedDayCheck.valid) {
      validation.valid = false;
      validation.errors.push(restrictedDayCheck.reason);
    }
    
    // 6. 新增：检查时间范围限制
    const timeRangeRestrictions = this.validateTimeRangeRestrictions(
      originalTime, 
      adjustTime, 
      permissions.timeRangeRestrictions, 
      adjustData
    );
    
    if (!timeRangeRestrictions.valid) {
      validation.valid = false;
      validation.errors.push(...timeRangeRestrictions.errors);
    }
    
    validation.warnings.push(...timeRangeRestrictions.warnings);
    
    if (timeRangeRestrictions.requireApproval) {
      validation.requireApproval = true;
    }
    
    // 7. 新增：检查条件性限制
    const conditionalCheck = this.validateConditionalRestrictions(
      adjustData, 
      permissions.conditionalRestrictions
    );
    
    if (!conditionalCheck.valid) {
      validation.warnings.push(...conditionalCheck.warnings);
    }
    
    if (conditionalCheck.requireApproval) {
      validation.requireApproval = true;
    }
    
    // 8. 确定调整类型
    validation.adjustmentType = this.determineAdjustmentType(hoursDiff, crossDays, adjustData);
    
    return validation;
  },

  /**
   * 验证时间范围限制
   */
  validateTimeRangeRestrictions(originalTime, newTime, restrictions, adjustData = {}) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      requireApproval: false
    };

    if (!restrictions) return result;

    const timeDiff = (newTime - originalTime) / (1000 * 60 * 60); // 正值表示向后调整，负值表示向前调整
    const absTimeDiff = Math.abs(timeDiff);

    // 1. 检查调整方向和范围
    if (timeDiff > 0) { // 向后调整
      if (absTimeDiff > restrictions.maxForwardAdjust) {
        result.valid = false;
        result.errors.push(`向后调整超出限制（最大${restrictions.maxForwardAdjust}小时）`);
      }
    } else if (timeDiff < 0) { // 向前调整
      if (absTimeDiff > restrictions.maxBackwardAdjust) {
        result.valid = false;
        result.errors.push(`向前调整超出限制（最大${restrictions.maxBackwardAdjust}小时）`);
      }
    }

    // 2. 检查跨周限制
    if (!restrictions.allowCrossWeek) {
      const weekDiff = this.calculateWeekDifference(originalTime, newTime);
      if (weekDiff > 0) {
        result.valid = false;
        result.errors.push('不允许跨周调整');
      }
    }

    // 3. 检查周末限制
    if (!restrictions.allowWeekend) {
      const dayOfWeek = newTime.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        result.valid = false;
        result.errors.push('不允许调整到周末');
      }
    }

    // 4. 检查节假日限制
    if (!restrictions.allowHoliday) {
      if (this.isHoliday(newTime)) {
        if (adjustData.isEmergency) {
          result.warnings.push('调整到节假日，紧急情况允许但需审批');
          result.requireApproval = true;
        } else {
          result.valid = false;
          result.errors.push('不允许调整到节假日');
        }
      }
    }

    // 5. 检查限制时间段
    const restrictedHourCheck = this.checkRestrictedHours(newTime, restrictions.restrictedHours, adjustData);
    if (!restrictedHourCheck.valid) {
      if (adjustData.isEmergency && restrictedHourCheck.allowEmergency) {
        result.warnings.push(restrictedHourCheck.reason + '（紧急情况允许）');
        result.requireApproval = true;
      } else {
        result.valid = false;
        result.errors.push(restrictedHourCheck.reason);
      }
    }

    return result;
  },

  /**
   * 验证条件性限制
   */
  validateConditionalRestrictions(adjustData, conditionalRestrictions) {
    const result = {
      valid: true,
      warnings: [],
      requireApproval: false
    };

    if (!conditionalRestrictions) return result;

    const { patientInfo = {}, serviceType, weather } = adjustData;

    // 1. 检查患者类型限制
    if (patientInfo.type && conditionalRestrictions.patientType) {
      const patientRestriction = conditionalRestrictions.patientType[patientInfo.type];
      if (patientRestriction) {
        if (patientRestriction.requireApproval) {
          result.requireApproval = true;
          result.warnings.push(`${patientInfo.type}患者调整需要审批`);
        }
        
        // 检查特殊时间限制
        if (patientRestriction.restrictedHours) {
          const newTime = new Date(adjustData.newTime);
          const hour = newTime.getHours();
          const [startHour, endHour] = patientRestriction.restrictedHours;
          
          if (this.isTimeInRange(hour, startHour, endHour)) {
            result.warnings.push(`${patientInfo.type}患者不建议在${startHour}-${endHour}时间段调整`);
          }
        }
      }
    }

    // 2. 检查服务类型限制
    if (serviceType && conditionalRestrictions.serviceType) {
      const serviceRestriction = conditionalRestrictions.serviceType[serviceType];
      if (serviceRestriction) {
        if (serviceRestriction.requireApproval) {
          result.requireApproval = true;
          result.warnings.push(`${serviceType}服务调整需要审批`);
        }
      }
    }

    // 3. 检查天气条件限制
    if (weather && conditionalRestrictions.weather) {
      const weatherRestriction = conditionalRestrictions.weather[weather];
      if (weatherRestriction) {
        if (weatherRestriction.requireApproval) {
          result.requireApproval = true;
          result.warnings.push(`${weather}天气条件下调整需要审批`);
        }
      }
    }

    return result;
  },

  /**
   * 检查限制时间段
   */
  checkRestrictedHours(targetTime, restrictedHours, adjustData = {}) {
    const result = {
      valid: true,
      reason: '',
      allowEmergency: false
    };

    if (!restrictedHours || Object.keys(restrictedHours).length === 0) {
      return result;
    }

    const hour = targetTime.getHours();
    const minute = targetTime.getMinutes();
    const timeValue = hour * 60 + minute;

    // 检查各种限制时间段
    for (const [restrictionType, timeRange] of Object.entries(restrictedHours)) {
      if (timeRange.length === 2) {
        const [startTime, endTime] = timeRange;
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startValue = startHour * 60 + startMinute;
        const endValue = endHour * 60 + endMinute;
        
        let inRestrictedTime = false;
        
        // 处理跨夜情况
        if (endValue < startValue) {
          inRestrictedTime = timeValue >= startValue || timeValue <= endValue;
        } else {
          inRestrictedTime = timeValue >= startValue && timeValue <= endValue;
        }
        
        if (inRestrictedTime) {
          result.valid = false;
          result.reason = `调整时间在限制时间段内（${this.getRestrictionTypeName(restrictionType)}: ${startTime}-${endTime}）`;
          
          // 检查是否允许紧急情况例外
          if (restrictionType !== 'emergency') {
            result.allowEmergency = true;
          }
          
          break;
        }
      }
    }

    return result;
  },

  /**
   * 获取限制类型名称
   */
  getRestrictionTypeName(restrictionType) {
    const typeNames = {
      start: '夜间时间',
      lunch: '午休时间',
      emergency: '紧急限制时间'
    };
    return typeNames[restrictionType] || restrictionType;
  },

  /**
   * 计算周数差异
   */
  calculateWeekDifference(originalTime, newTime) {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const timeDiff = Math.abs(newTime - originalTime);
    return Math.floor(timeDiff / oneWeek);
  },

  /**
   * 检查是否为节假日
   */
  isHoliday(date) {
    // 这里可以集成真实的节假日API，这里做简单模拟
    const holidays = [
      '2025-01-01', // 元旦
      '2025-02-12', // 春节
      '2025-04-05', // 清明
      '2025-05-01', // 劳动节
      '2025-10-01'  // 国庆节
    ];
    
    const dateStr = date.toISOString().split('T')[0];
    return holidays.includes(dateStr);
  },

  /**
   * 检查时间是否在指定范围内
   */
  isTimeInRange(hour, startTime, endTime) {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    
    if (end < start) { // 跨夜情况
      return hour >= start || hour <= end;
    } else {
      return hour >= start && hour <= end;
    }
  },

  /**
   * 确定调整类型
   */
  determineAdjustmentType(hoursDiff, crossDays, adjustData) {
    // 紧急情况检查
    if (adjustData.isEmergency || 
        adjustData.urgentLevel === 'urgent' ||
        adjustData.reasonCode === 'emergency_situation') {
      return 'emergency';
    }
    
    // 跨天调整
    if (crossDays > 0) {
      return crossDays > 2 ? 'emergency' : 'advanced';
    }
    
    // 根据调整幅度决定
    if (hoursDiff > 72) {
      return 'emergency';
    } else if (hoursDiff > 24) {
      return 'advanced';
    }
    
    return 'normal';
  },

  /**
   * 验证时间范围
   */
  validateTimeRange(targetTime, allowedRanges) {
    if (!allowedRanges || allowedRanges.length === 0) {
      return { valid: true };
    }
    
    const targetHour = targetTime.getHours();
    const targetMinute = targetTime.getMinutes();
    const targetTimeValue = targetHour * 60 + targetMinute;
    
    for (const range of allowedRanges) {
      const [startHour, startMinute] = range.start.split(':').map(Number);
      const [endHour, endMinute] = range.end.split(':').map(Number);
      
      const startValue = startHour * 60 + startMinute;
      const endValue = endHour * 60 + endMinute;
      
      // 处理跨夜情况
      if (endValue < startValue) {
        if (targetTimeValue >= startValue || targetTimeValue <= endValue) {
          return { valid: true };
        }
      } else {
        if (targetTimeValue >= startValue && targetTimeValue <= endValue) {
          return { valid: true };
        }
      }
    }
    
    return { 
      valid: false, 
      reason: `时间不在允许范围内` 
    };
  },

  /**
   * 计算跨天数
   */
  calculateCrossDays(originalTime, newTime) {
    const originalDate = new Date(originalTime.getFullYear(), originalTime.getMonth(), originalTime.getDate());
    const newDate = new Date(newTime.getFullYear(), newTime.getMonth(), newTime.getDate());
    
    return Math.abs(Math.floor((newDate - originalDate) / (1000 * 60 * 60 * 24)));
  },

  /**
   * 检查限制日期
   */
  checkRestrictedDays(targetTime, restrictedDays) {
    if (!restrictedDays || restrictedDays.length === 0) {
      return { valid: true };
    }
    
    const targetDateStr = targetTime.toISOString().split('T')[0];
    const dayOfWeek = targetTime.getDay(); // 0=周日, 1=周一, ...
    
    for (const restriction of restrictedDays) {
      // 检查具体日期
      if (restriction.date && restriction.date === targetDateStr) {
        return { 
          valid: false, 
          reason: `${restriction.date}为限制日期（${restriction.reason || '节假日'}）` 
        };
      }
      
      // 检查星期几
      if (restriction.dayOfWeek && restriction.dayOfWeek === dayOfWeek) {
        return { 
          valid: false, 
          reason: `周${['\u65e5','\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d'][dayOfWeek]}为限制日期` 
        };
      }
    }
    
    return { valid: true };
  },

  /**
   * 获取允许的时间范围描述
   */
  getTimeRangeDescription(allowedRanges) {
    if (!allowedRanges || allowedRanges.length === 0) {
      return '无限制';
    }
    
    return allowedRanges.map(range => `${range.start}-${range.end}`).join(', ');
  },

  /**
   * 检查时间调整的完整性
   */
  validateAdjustIntegrity(adjustData, userPermissions) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      requireApproval: false
    };
    
    const { originalTime, newTime, reason, isEmergency } = adjustData;
    
    // 1. 基本数据验证
    if (!originalTime || !newTime) {
      validation.valid = false;
      validation.errors.push('缺少必要的时间信息');
      return validation;
    }
    
    if (new Date(originalTime) >= new Date(newTime)) {
      validation.warnings.push('调整后时间早于原时间');
    }
    
    // 2. 权限验证
    const permissionCheck = this.validateAdjustPermission(userPermissions.level, adjustData);
    validation.valid = validation.valid && permissionCheck.valid;
    validation.errors.push(...permissionCheck.errors);
    validation.warnings.push(...permissionCheck.warnings);
    
    // 3. 特殊情况判断
    if (isEmergency) {
      validation.requireApproval = true;
      validation.warnings.push('紧急调整需要特殊审批');
    }
    
    if (!reason || reason.trim() === '') {
      validation.warnings.push('建议填写调整原因');
    }
    
    return validation;
  }
};