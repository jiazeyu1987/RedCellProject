/**
 * 时间调整权限管理服务
 * 负责管理时间调整相关的权限控制、限制检查和审批流程
 */

const { RolePermissionManager } = require('../utils/role-permission.js');
const { TIME_ADJUST_CONFIG, TimeAdjustUtils } = require('../constants/time-adjust-config.js');
const CONFIG = require('../constants/config.js');

class TimeAdjustPermissionService {
  
  /**
   * 获取用户当前的调整权限信息
   * @param {Object} userInfo 用户信息
   * @returns {Object} 权限信息
   */
  static getUserAdjustPermissions(userInfo) {
    const { role, experience, certifications = [] } = userInfo;
    const permissionLevel = RolePermissionManager.getTimeAdjustPermissionLevel(role);
    const permissions = TIME_ADJUST_CONFIG.permissions[permissionLevel];
    
    return {
      level: permissionLevel,
      role: role,
      maxAdjustHours: permissions.maxAdjustHours,
      maxAdjustTimes: permissions.maxAdjustTimes,
      requireApproval: permissions.requireApproval,
      minNoticeHours: permissions.minNoticeHours,
      allowedTimeRanges: permissions.allowedTimeRanges,
      maxCrossDays: permissions.maxCrossDays,
      emergencyOverride: permissions.emergencyOverride,
      canBatchAdjust: RolePermissionManager.canBatchAdjust(role),
      canOverrideLimit: RolePermissionManager.canOverrideAdjustLimit(role),
      canApprove: RolePermissionManager.hasApprovalPermission(role),
      canEmergencyAdjust: this.canEmergencyAdjust(role),
      canEmergencyApprove: this.canEmergencyApprove(role),
      availableTypes: this.getAvailableAdjustTypes(role),
      dailyRemaining: null, // 需要从服务器获取
      experience: experience || 0,
      certifications: certifications
    };
  }

  /**
   * 获取用户可用的调整类型
   * @param {string} userRole 用户角色
   * @returns {Array} 可用的调整类型
   */
  static getAvailableAdjustTypes(userRole) {
    const types = [];
    
    if (RolePermissionManager.hasTimeAdjustPermission(userRole, 'normal')) {
      types.push({
        type: 'normal',
        label: '普通调整',
        description: '日常时间调整，适用于一般情况',
        color: '#1890ff',
        icon: '📅'
      });
    }
    
    if (RolePermissionManager.hasTimeAdjustPermission(userRole, 'advanced')) {
      types.push({
        type: 'advanced',
        label: '高级调整',
        description: '大幅度时间调整，适用于复杂情况',
        color: '#faad14',
        icon: '⚡'
      });
    }
    
    if (RolePermissionManager.hasTimeAdjustPermission(userRole, 'emergency')) {
      types.push({
        type: 'emergency',
        label: '紧急调整',
        description: '紧急情况调整，可跨天调整',
        color: '#f5222d',
        icon: '🚨'
      });
    }
    
    return types;
  }

  /**
   * 验证调整请求的权限
   * @param {Object} userInfo 用户信息
   * @param {Object} adjustData 调整数据
   * @returns {Object} 验证结果
   */
  static async validateAdjustRequest(userInfo, adjustData) {
    const permissions = this.getUserAdjustPermissions(userInfo);
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      requireApproval: false,
      adjustType: 'normal',
      impactScore: 0
    };

    // 1. 基础权限检查
    if (!permissions.availableTypes.length) {
      validation.valid = false;
      validation.errors.push('用户没有时间调整权限');
      return validation;
    }

    // 2. 计算调整参数
    const now = new Date();
    const originalTime = new Date(adjustData.originalTime);
    const newTime = new Date(adjustData.newTime);
    const hoursDiff = Math.abs(newTime - originalTime) / (1000 * 60 * 60);
    const noticeHours = (originalTime - now) / (1000 * 60 * 60);

    // 3. 确定所需的调整类型
    let requiredType = this.determineAdjustType(hoursDiff, noticeHours, adjustData);
    validation.adjustType = requiredType;

    // 4. 检查是否有对应类型的权限
    if (!RolePermissionManager.hasTimeAdjustPermission(userInfo.role, requiredType)) {
      validation.valid = false;
      validation.errors.push(`用户没有${this.getAdjustTypeName(requiredType)}权限，请联系主管处理`);
      return validation;
    }

    // 5. 检查调整范围限制
    const typePermissions = TIME_ADJUST_CONFIG.permissions[requiredType];
    if (hoursDiff > typePermissions.maxAdjustHours && !permissions.canOverrideLimit) {
      validation.valid = false;
      validation.errors.push(`调整时间超出权限范围（最大${typePermissions.maxAdjustHours}小时）`);
    }

    // 6. 检查提前通知时间
    if (noticeHours < typePermissions.minNoticeHours) {
      if (permissions.canOverrideLimit) {
        validation.warnings.push(`提前通知时间不足（建议${typePermissions.minNoticeHours}小时）`);
      } else {
        validation.valid = false;
        validation.errors.push(`提前通知时间不足（最少${typePermissions.minNoticeHours}小时）`);
      }
    }

    // 7. 检查是否需要审批
    if (typePermissions.requireApproval || validation.warnings.length > 0) {
      validation.requireApproval = true;
    }

    // 8. 检查每日调整次数限制
    const dailyRemaining = await this.getDailyRemainingAdjustments(
      userInfo.id || 'current_user', 
      permissions.level
    );
    
    if (dailyRemaining <= 0 && !permissions.canOverrideLimit) {
      validation.valid = false;
      validation.errors.push('今日调整次数已用完，明日可继续使用');
    } else if (dailyRemaining <= 1 && !permissions.canOverrideLimit) {
      validation.warnings.push(`今日还可调整${dailyRemaining}次`);
    }
    
    // 9. 检查批量调整权限
    if (adjustData.batchAdjust && !permissions.canBatchAdjust) {
      validation.valid = false;
      validation.errors.push('用户没有批量调整权限');
    }

    // 10. 计算调整影响分数
    const impactScore = TimeAdjustUtils.calculateAdjustImpact(
      adjustData.originalTime,
      adjustData.newTime,
      adjustData.appointmentInfo || {}
    );
    
    validation.impactScore = impactScore;

    if (impactScore > 50) {
      validation.warnings.push('此次调整可能对患者造成较大影响');
      validation.requireApproval = true;
    }
    
    // 11. 特殊情况检查
    this.checkSpecialConditions(validation, adjustData, permissions);

    return validation;
  }

  /**
   * 确定调整类型
   * @param {number} hoursDiff 调整时间差（小时）
   * @param {number} noticeHours 提前通知时间（小时）
   * @param {Object} adjustData 调整数据
   * @returns {string} 调整类型
   */
  static determineAdjustType(hoursDiff, noticeHours, adjustData) {
    // 紧急情况检查
    if (adjustData.appointmentInfo?.urgent || 
        adjustData.urgentLevel === 'urgent' ||
        adjustData.isEmergency ||
        noticeHours < 2) {
      return 'emergency';
    }
    
    // 检查是否跨天调整
    const originalDate = new Date(adjustData.originalTime).toDateString();
    const newDate = new Date(adjustData.newTime).toDateString();
    
    if (originalDate !== newDate) {
      return 'emergency';
    }
    
    // 检查时间范围
    const newTime = new Date(adjustData.newTime);
    const hour = newTime.getHours();
    
    // 非工作时间调整需要高级权限
    if (hour < 8 || hour > 18) {
      return hoursDiff > TIME_ADJUST_CONFIG.permissions.normal.maxAdjustHours ? 'emergency' : 'advanced';
    }
    
    // 根据调整幅度决定
    if (hoursDiff > TIME_ADJUST_CONFIG.permissions.advanced.maxAdjustHours) {
      return 'emergency';
    } else if (hoursDiff > TIME_ADJUST_CONFIG.permissions.normal.maxAdjustHours) {
      return 'advanced';
    }
    
    return 'normal';
  }

  /**
   * 获取调整类型名称
   * @param {string} adjustType 调整类型
   * @returns {string} 类型名称
   */
  static getAdjustTypeName(adjustType) {
    const typeNames = {
      'normal': '普通调整',
      'advanced': '高级调整',
      'emergency': '紧急调整'
    };
    return typeNames[adjustType] || '未知类型';
  }

  /**
   * 检查特殊情况
   * @param {Object} validation 验证结果
   * @param {Object} adjustData 调整数据
   * @param {Object} permissions 用户权限
   */
  static checkSpecialConditions(validation, adjustData, permissions) {
    const originalTime = new Date(adjustData.originalTime);
    const newTime = new Date(adjustData.newTime);
    const typePermissions = TIME_ADJUST_CONFIG.permissions[permissions.level];
    
    // 1. 检查时间范围限制
    const timeRangeResult = this.checkTimeRangeRestrictions(newTime, typePermissions, adjustData);
    if (!timeRangeResult.valid) {
      if (typePermissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`调整到受限时间段：${timeRangeResult.reason}，紧急情况允许但需审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(timeRangeResult.reason);
      }
    }
    
    // 2. 检查调整幅度限制 
    const adjustHoursDiff = Math.abs(newTime - originalTime) / (1000 * 60 * 60);
    const adjustDirection = newTime > originalTime ? 'forward' : 'backward';
    const timeRangeRestrictions = typePermissions.timeRangeRestrictions;
    
    if (adjustDirection === 'forward' && adjustHoursDiff > timeRangeRestrictions.maxForwardAdjust) {
      if (typePermissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`向后调整${adjustHoursDiff.toFixed(1)}小时超出限制（最大${timeRangeRestrictions.maxForwardAdjust}小时），需要特殊审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(`向后调整超出限制（最大${timeRangeRestrictions.maxForwardAdjust}小时）`);
      }
    }
    
    if (adjustDirection === 'backward' && adjustHoursDiff > timeRangeRestrictions.maxBackwardAdjust) {
      if (typePermissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`向前调整${adjustHoursDiff.toFixed(1)}小时超出限制（最大${timeRangeRestrictions.maxBackwardAdjust}小时），需要特殊审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(`向前调整超出限制（最大${timeRangeRestrictions.maxBackwardAdjust}小时）`);
      }
    }
    
    // 3. 检查跨天/跨周限制
    const crossDays = TimeAdjustUtils.calculateCrossDays(originalTime, newTime);
    if (crossDays > typePermissions.maxCrossDays) {
      if (typePermissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`跨天调整超出限制（${crossDays}>${typePermissions.maxCrossDays}），需要特殊审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(`跨天调整超出限制（最大${typePermissions.maxCrossDays}天）`);
      }
    }
    
    // 检查跨周限制
    if (this.isCrossWeek(originalTime, newTime) && !timeRangeRestrictions.allowCrossWeek) {
      validation.valid = false;
      validation.errors.push('不允许跨周调整');
    }
    
    // 4. 检查特殊日期限制
    const specialDayResult = this.checkSpecialDayRestrictions(newTime, typePermissions, adjustData);
    if (!specialDayResult.valid) {
      if (typePermissions.emergencyOverride && adjustData.isEmergency) {
        validation.warnings.push(`调整到特殊日期：${specialDayResult.reason}，紧急情况允许但需审批`);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(specialDayResult.reason);
      }
    }
    
    // 5. 检查条件性限制
    const conditionalResult = this.checkConditionalRestrictions(adjustData, typePermissions);
    if (!conditionalResult.valid) {
      if (conditionalResult.requireApproval) {
        validation.warnings.push(conditionalResult.reason);
        validation.requireApproval = true;
      } else {
        validation.valid = false;
        validation.errors.push(conditionalResult.reason);
      }
    }
    
    // 6. 检查调整频率
    if (adjustData.recentAdjustCount && adjustData.recentAdjustCount > 3) {
      validation.warnings.push('近期调整频繁，建议优化时间安排');
      validation.requireApproval = true;
    }
    
    // 7. 检查调整理由合理性
    if (!adjustData.reason || adjustData.reason.trim() === '') {
      validation.warnings.push('缺少调整原因，建议说明情况');
    }
    
    // 8. 检查调整影响评估
    const impactScore = this.calculateAdjustmentImpact(originalTime, newTime, adjustData);
    if (impactScore > 70) {
      validation.warnings.push(`调整影响评分较高（${impactScore}分），建议谨慎处理`);
      validation.requireApproval = true;
    }
  }

  /**
   * 检查时间范围限制（增强版）
   * @param {Date} newTime 新时间
   * @param {Object} typePermissions 权限配置
   * @param {Object} adjustData 调整数据
   * @returns {Object} 检查结果
   */
  static checkTimeRangeRestrictions(newTime, typePermissions, adjustData) {
    const result = { valid: true, reason: '' };
    const hour = newTime.getHours();
    const minute = newTime.getMinutes();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // 1. 检查基本时间范围
    const allowedRanges = typePermissions.allowedTimeRanges;
    let inAllowedRange = false;
    
    for (const range of allowedRanges) {
      if (this.isTimeInRange(timeStr, range.start, range.end)) {
        inAllowedRange = true;
        break;
      }
    }
    
    if (!inAllowedRange && allowedRanges.length > 0) {
      result.valid = false;
      result.reason = `调整时间不在允许范围内（${this.formatTimeRanges(allowedRanges)}）`;
      return result;
    }
    
    // 2. 检查限制时间段
    const restrictions = typePermissions.timeRangeRestrictions.restrictedHours;
    
    // 检查常规限制时间
    if (restrictions.start && restrictions.start.length >= 2) {
      if (this.isTimeInRange(timeStr, restrictions.start[0], restrictions.start[1])) {
        result.valid = false;
        result.reason = `调整时间在限制时段内（${restrictions.start[0]}-${restrictions.start[1]}）`;
        return result;
      }
    }
    
    // 检查午休时间限制
    if (restrictions.lunch && restrictions.lunch.length >= 2) {
      if (this.isTimeInRange(timeStr, restrictions.lunch[0], restrictions.lunch[1])) {
        result.valid = false;
        result.reason = `调整时间在午休时段内（${restrictions.lunch[0]}-${restrictions.lunch[1]}）`;
        return result;
      }
    }
    
    // 检查紧急情况下的限制
    if (adjustData.isEmergency && restrictions.emergency && restrictions.emergency.length >= 2) {
      if (this.isTimeInRange(timeStr, restrictions.emergency[0], restrictions.emergency[1])) {
        result.valid = false;
        result.reason = `调整时间在紧急限制时段内（${restrictions.emergency[0]}-${restrictions.emergency[1]}）`;
        return result;
      }
    }
    
    return result;
  }
  
  /**
   * 检查特殊日期限制
   * @param {Date} newTime 新时间
   * @param {Object} typePermissions 权限配置
   * @param {Object} adjustData 调整数据
   * @returns {Object} 检查结果
   */
  static checkSpecialDayRestrictions(newTime, typePermissions, adjustData) {
    const result = { valid: true, reason: '' };
    const timeRangeRestrictions = typePermissions.timeRangeRestrictions;
    
    // 检查周末限制
    const dayOfWeek = newTime.getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !timeRangeRestrictions.allowWeekend) {
      result.valid = false;
      result.reason = '不允许调整到周末';
      return result;
    }
    
    // 检查节假日限制
    if (this.isHoliday(newTime) && !timeRangeRestrictions.allowHoliday) {
      result.valid = false;
      result.reason = '不允许调整到节假日';
      return result;
    }
    
    // 检查限制日期列表
    const restrictedDays = typePermissions.restrictedDays || [];
    const dateStr = newTime.toISOString().split('T')[0];
    
    for (const restrictedDay of restrictedDays) {
      if (restrictedDay.date === dateStr) {
        result.valid = false;
        result.reason = `${dateStr}为限制调整日期：${restrictedDay.reason || '特殊日期'}`;
        return result;
      }
    }
    
    return result;
  }
  
  /**
   * 检查条件性限制
   * @param {Object} adjustData 调整数据
   * @param {Object} typePermissions 权限配置
   * @returns {Object} 检查结果
   */
  static checkConditionalRestrictions(adjustData, typePermissions) {
    const result = { valid: true, reason: '', requireApproval: false };
    const conditionalRestrictions = typePermissions.conditionalRestrictions;
    
    // 检查患者类型限制
    if (adjustData.patientInfo && conditionalRestrictions.patientType) {
      const patientType = adjustData.patientInfo.type || 'normal';
      const restriction = conditionalRestrictions.patientType[patientType];
      
      if (restriction) {
        // 检查调整小时数限制
        if (restriction.maxAdjustHours) {
          const hoursDiff = Math.abs(new Date(adjustData.newTime) - new Date(adjustData.originalTime)) / (1000 * 60 * 60);
          if (hoursDiff > restriction.maxAdjustHours) {
            result.valid = false;
            result.reason = `${patientType}患者调整时间不能超过${restriction.maxAdjustHours}小时`;
            return result;
          }
        }
        
        // 检查是否需要审批
        if (restriction.requireApproval) {
          result.requireApproval = true;
          result.reason = `${patientType}患者时间调整需要额外审批`;
        }
        
        // 检查提前通知时间
        if (restriction.minNoticeHours) {
          const noticeHours = (new Date(adjustData.originalTime) - new Date()) / (1000 * 60 * 60);
          if (noticeHours < restriction.minNoticeHours) {
            result.valid = false;
            result.reason = `${patientType}患者调整需要提前${restriction.minNoticeHours}小时通知`;
            return result;
          }
        }
      }
    }
    
    // 检查服务类型限制
    if (adjustData.serviceType && conditionalRestrictions.serviceType) {
      const serviceRestriction = conditionalRestrictions.serviceType[adjustData.serviceType];
      if (serviceRestriction) {
        const hoursDiff = Math.abs(new Date(adjustData.newTime) - new Date(adjustData.originalTime)) / (1000 * 60 * 60);
        
        if (serviceRestriction.maxAdjustHours && hoursDiff > serviceRestriction.maxAdjustHours) {
          result.valid = false;
          result.reason = `${adjustData.serviceType}服务调整时间不能超过${serviceRestriction.maxAdjustHours}小时`;
          return result;
        }
        
        if (serviceRestriction.requireApproval) {
          result.requireApproval = true;
          result.reason = `${adjustData.serviceType}服务时间调整需要额外审批`;
        }
      }
    }
    
    // 检查天气条件限制
    if (adjustData.weatherCondition && conditionalRestrictions.weather) {
      const weatherRestriction = conditionalRestrictions.weather[adjustData.weatherCondition];
      if (weatherRestriction) {
        const hoursDiff = Math.abs(new Date(adjustData.newTime) - new Date(adjustData.originalTime)) / (1000 * 60 * 60);
        
        if (weatherRestriction.maxAdjustHours && hoursDiff > weatherRestriction.maxAdjustHours) {
          result.valid = false;
          result.reason = `${adjustData.weatherCondition}天气条件下调整时间不能超过${weatherRestriction.maxAdjustHours}小时`;
          return result;
        }
        
        if (weatherRestriction.requireApproval) {
          result.requireApproval = true;
          result.reason = `${adjustData.weatherCondition}天气条件下时间调整需要额外审批`;
        }
      }
    }
    
    return result;
  }
  
  /**
   * 判断时间是否在指定范围内
   * @param {string} time 时间 (HH:MM)
   * @param {string} start 开始时间 (HH:MM)
   * @param {string} end 结束时间 (HH:MM)
   * @returns {boolean} 是否在范围内
   */
  static isTimeInRange(time, start, end) {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    
    // 处理跨天的情况
    if (endMinutes < startMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }
  
  /**
   * 时间转换为分钟数
   * @param {string} time 时间 (HH:MM)
   * @returns {number} 分钟数
   */
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * 格式化时间范围
   * @param {Array} ranges 时间范围数组
   * @returns {string} 格式化的时间范围
   */
  static formatTimeRanges(ranges) {
    return ranges.map(range => `${range.start}-${range.end}`).join(', ');
  }
  
  /**
   * 判断是否跨周
   * @param {Date} startTime 开始时间
   * @param {Date} endTime 结束时间
   * @returns {boolean} 是否跨周
   */
  static isCrossWeek(startTime, endTime) {
    const getWeekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
      return new Date(d.setDate(diff));
    };
    
    const startWeek = getWeekStart(startTime);
    const endWeek = getWeekStart(endTime);
    
    return startWeek.getTime() !== endWeek.getTime();
  }
  
  /**
   * 判断是否为节假日
   * @param {Date} date 日期
   * @returns {boolean} 是否为节假日
   */
  static isHoliday(date) {
    // 这里可以集成节假日API或者本地节假日数据
    // 暂时使用简单的判断逻辑
    const holidays = [
      '2025-01-01', // 元旦
      '2025-02-10', '2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14', '2025-02-15', '2025-02-16', // 春节
      '2025-04-05', '2025-04-06', '2025-04-07', // 清明节
      '2025-05-01', '2025-05-02', '2025-05-03', // 劳动节
      '2025-06-09', '2025-06-10', '2025-06-11', // 端午节
      '2025-09-15', '2025-09-16', '2025-09-17', // 中秋节
      '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07' // 国庆节
    ];
    
    const dateStr = date.toISOString().split('T')[0];
    return holidays.includes(dateStr);
  }
  
  /**
   * 计算调整影响评分
   * @param {Date} originalTime 原时间
   * @param {Date} newTime 新时间
   * @param {Object} adjustData 调整数据
   * @returns {number} 影响评分 (0-100)
   */
  static calculateAdjustmentImpact(originalTime, newTime, adjustData) {
    let score = 0;
    
    // 时间差影响 (最大30分)
    const hoursDiff = Math.abs(newTime - originalTime) / (1000 * 60 * 60);
    score += Math.min(hoursDiff * 2, 30);
    
    // 提前通知时间影响 (最大20分)
    const noticeHours = (originalTime - new Date()) / (1000 * 60 * 60);
    if (noticeHours < 2) score += 20;
    else if (noticeHours < 12) score += 10;
    else if (noticeHours < 24) score += 5;
    
    // 患者类型影响 (最大15分)
    if (adjustData.patientInfo) {
      const patientType = adjustData.patientInfo.type;
      if (patientType === 'vip') score += 15;
      else if (patientType === 'elderly') score += 10;
      else if (patientType === 'critical') score += 12;
    }
    
    // 服务类型影响 (最大15分)
    if (adjustData.serviceType) {
      if (adjustData.serviceType === 'surgery') score += 15;
      else if (adjustData.serviceType === 'medication') score += 10;
      else if (adjustData.serviceType === 'routine') score += 5;
    }
    
    // 调整频率影响 (最大10分)
    if (adjustData.recentAdjustCount) {
      score += Math.min(adjustData.recentAdjustCount * 2, 10);
    }
    
    // 时间段影响 (最大10分)
    const hour = newTime.getHours();
    if (hour < 8 || hour > 18) score += 10;
    else if (hour < 9 || hour > 17) score += 5;
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 获取调整审批流程配置
   * @param {string} adjustType 调整类型
   * @param {number} impactScore 影响分数
   * @returns {Object} 审批流程配置
   */
  static getApprovalWorkflow(adjustType, impactScore = 0) {
    const workflows = {
      normal: {
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SENIOR_RECORDER,
            name: '高级记录员审批',
            required: false,
            autoApprove: impactScore < 30
          }
        ]
      },
      advanced: {
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SENIOR_RECORDER,
            name: '高级记录员审批',
            required: true,
            autoApprove: false
          },
          {
            step: 2,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管审批',
            required: impactScore > 60,
            autoApprove: false
          }
        ]
      },
      emergency: {
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管紧急审批',
            required: true,
            autoApprove: false,
            urgent: true
          }
        ]
      }
    };

    return workflows[adjustType] || workflows.normal;
  }

  /**
   * 检查用户是否可以审批指定的调整申请
   * @param {string} userRole 用户角色
   * @param {Object} adjustRequest 调整申请
   * @returns {boolean} 是否可以审批
   */
  static canApproveAdjustment(userRole, adjustRequest) {
    if (!RolePermissionManager.hasApprovalPermission(userRole)) {
      return false;
    }

    const workflow = this.getApprovalWorkflow(
      adjustRequest.adjustType || 'normal',
      adjustRequest.impactScore || 0
    );

    // 检查是否在当前审批步骤中
    const currentStep = workflow.steps[adjustRequest.currentStep - 1];
    if (!currentStep) {
      return false;
    }

    return RolePermissionManager.hasPermission(userRole, currentStep.role) ||
           userRole === currentStep.role;
  }

  /**
   * 获取用户可审批的调整类型
   * @param {string} userRole 用户角色
   * @returns {Array} 可审批的调整类型
   */
  static getApprovableAdjustTypes(userRole) {
    const approvableTypes = [];
    
    if (RolePermissionManager.hasApprovalPermission(userRole)) {
      ['normal', 'advanced', 'emergency'].forEach(type => {
        const workflow = this.getApprovalWorkflow(type, 0);
        const canApprove = workflow.steps.some(step => 
          RolePermissionManager.hasPermission(userRole, step.role) ||
          userRole === step.role
        );
        
        if (canApprove) {
          approvableTypes.push({
            type,
            name: this.getAdjustTypeName(type),
            priority: type === 'emergency' ? 'high' : type === 'advanced' ? 'medium' : 'normal'
          });
        }
      });
    }
    
    return approvableTypes;
  }

  /**
   * 获取今日剩余调整次数
   * @param {string} userId 用户ID
   * @param {string} permissionLevel 权限级别
   * @returns {Promise<number>} 剩余次数
   */
  static async getDailyRemainingAdjustments(userId, permissionLevel) {
    try {
      // 这里应该调用API获取今日已使用次数
      // const response = await api.get(`/adjustments/daily-count/${userId}`);
      // const usedCount = response.data.count;
      
      // 暂时使用模拟数据
      const usedCount = await this.getTodayUsedAdjustments(userId);
      const maxCount = TIME_ADJUST_CONFIG.permissions[permissionLevel].maxAdjustTimes;
      
      return Math.max(0, maxCount - usedCount);
    } catch (error) {
      console.error('获取今日调整次数失败:', error);
      return 0;
    }
  }

  /**
   * 获取今日已使用的调整次数
   * @param {string} userId 用户ID
   * @returns {Promise<number>} 已使用次数
   */
  static async getTodayUsedAdjustments(userId) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const storageKey = `${CONFIG.STORAGE_KEYS.USER_ADJUSTMENTS}_${userId}_${todayStr}`;
      
      const adjustments = wx.getStorageSync(storageKey) || [];
      return adjustments.length;
    } catch (error) {
      console.error('获取今日调整次数失败:', error);
      return 0;
    }
  }

  /**
   * 获取详细的调整次数统计
   * @param {string} userId 用户ID
   * @param {string} permissionLevel 权限级别
   * @returns {Promise<Object>} 统计信息
   */
  static async getAdjustmentStatistics(userId, permissionLevel) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const permissions = TIME_ADJUST_CONFIG.permissions[permissionLevel];
      
      // 获取今日调整记录
      const todayAdjustments = await this.getDayAdjustments(userId, todayStr);
      
      // 获取本周调整记录
      const weekAdjustments = await this.getWeekAdjustments(userId);
      
      // 获取本月调整记录
      const monthAdjustments = await this.getMonthAdjustments(userId);
      
      const statistics = {
        today: {
          used: todayAdjustments.length,
          remaining: Math.max(0, permissions.maxAdjustTimes - todayAdjustments.length),
          maxAllowed: permissions.maxAdjustTimes,
          percentage: Math.round((todayAdjustments.length / permissions.maxAdjustTimes) * 100),
          adjustments: todayAdjustments
        },
        week: {
          used: weekAdjustments.length,
          maxAllowed: permissions.maxAdjustTimes * 7,
          percentage: Math.round((weekAdjustments.length / (permissions.maxAdjustTimes * 7)) * 100),
          averagePerDay: Math.round(weekAdjustments.length / 7 * 10) / 10
        },
        month: {
          used: monthAdjustments.length,
          maxAllowed: permissions.maxAdjustTimes * 30,
          percentage: Math.round((monthAdjustments.length / (permissions.maxAdjustTimes * 30)) * 100),
          averagePerDay: Math.round(monthAdjustments.length / 30 * 10) / 10
        },
        adjustmentTypes: this.analyzeAdjustmentTypes(todayAdjustments),
        timeDistribution: this.analyzeTimeDistribution(todayAdjustments),
        emergencyCount: todayAdjustments.filter(adj => adj.adjustType === 'emergency').length
      };
      
      return statistics;
    } catch (error) {
      console.error('获取调整统计失败:', error);
      return this.getEmptyStatistics();
    }
  }

  /**
   * 获取指定日期的调整记录
   * @param {string} userId 用户ID
   * @param {string} dateStr 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Array>} 调整记录
   */
  static async getDayAdjustments(userId, dateStr) {
    try {
      const storageKey = `${CONFIG.STORAGE_KEYS.USER_ADJUSTMENTS}_${userId}_${dateStr}`;
      return wx.getStorageSync(storageKey) || [];
    } catch (error) {
      console.error('获取日调整记录失败:', error);
      return [];
    }
  }

  /**
   * 获取本周调整记录
   * @param {string} userId 用户ID
   * @returns {Promise<Array>} 调整记录
   */
  static async getWeekAdjustments(userId) {
    try {
      const adjustments = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayAdjustments = await this.getDayAdjustments(userId, dateStr);
        adjustments.push(...dayAdjustments);
      }
      
      return adjustments;
    } catch (error) {
      console.error('获取周调整记录失败:', error);
      return [];
    }
  }

  /**
   * 获取本月调整记录
   * @param {string} userId 用户ID
   * @returns {Promise<Array>} 调整记录
   */
  static async getMonthAdjustments(userId) {
    try {
      const adjustments = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayAdjustments = await this.getDayAdjustments(userId, dateStr);
        adjustments.push(...dayAdjustments);
      }
      
      return adjustments;
    } catch (error) {
      console.error('获取月调整记录失败:', error);
      return [];
    }
  }

  /**
   * 分析调整类型分布
   * @param {Array} adjustments 调整记录
   * @returns {Object} 类型分布
   */
  static analyzeAdjustmentTypes(adjustments) {
    const types = {
      normal: 0,
      advanced: 0,
      emergency: 0
    };
    
    adjustments.forEach(adj => {
      if (types.hasOwnProperty(adj.adjustType)) {
        types[adj.adjustType]++;
      }
    });
    
    return types;
  }

  /**
   * 分析时间分布
   * @param {Array} adjustments 调整记录
   * @returns {Object} 时间分布
   */
  static analyzeTimeDistribution(adjustments) {
    const distribution = {
      morning: 0,    // 8-12
      afternoon: 0,  // 12-18
      evening: 0,    // 18-22
      night: 0       // 22-8
    };
    
    adjustments.forEach(adj => {
      if (adj.newTime) {
        const hour = new Date(adj.newTime).getHours();
        
        if (hour >= 8 && hour < 12) {
          distribution.morning++;
        } else if (hour >= 12 && hour < 18) {
          distribution.afternoon++;
        } else if (hour >= 18 && hour < 22) {
          distribution.evening++;
        } else {
          distribution.night++;
        }
      }
    });
    
    return distribution;
  }

  /**
   * 获取空的统计信息
   * @returns {Object} 空的统计信息
   */
  static getEmptyStatistics() {
    return {
      today: {
        used: 0,
        remaining: 0,
        maxAllowed: 0,
        percentage: 0,
        adjustments: []
      },
      week: {
        used: 0,
        maxAllowed: 0,
        percentage: 0,
        averagePerDay: 0
      },
      month: {
        used: 0,
        maxAllowed: 0,
        percentage: 0,
        averagePerDay: 0
      },
      adjustmentTypes: { normal: 0, advanced: 0, emergency: 0 },
      timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      emergencyCount: 0
    };
  }

  /**
   * 检查调整次数限制
   * @param {string} userId 用户ID
   * @param {string} permissionLevel 权限级别
   * @param {boolean} isEmergency 是否为紧急调整
   * @returns {Promise<Object>} 限制检查结果
   */
  static async checkAdjustmentLimits(userId, permissionLevel, isEmergency = false) {
    const result = {
      canAdjust: false,
      reason: '',
      remaining: 0,
      warning: false,
      emergencyOverride: false
    };
    
    try {
      const statistics = await this.getAdjustmentStatistics(userId, permissionLevel);
      const permissions = TIME_ADJUST_CONFIG.permissions[permissionLevel];
      
      // 紧急调整可以超越日常限制
      if (isEmergency && permissions.emergencyOverride) {
        result.canAdjust = true;
        result.emergencyOverride = true;
        result.reason = '紧急调整允许超越日常限制';
        return result;
      }
      
      // 检查今日限制
      if (statistics.today.remaining > 0) {
        result.canAdjust = true;
        result.remaining = statistics.today.remaining;
        
        // 警告检查
        if (statistics.today.remaining <= 1) {
          result.warning = true;
          result.reason = `今日还可调整${statistics.today.remaining}次`;
        }
      } else {
        result.canAdjust = false;
        result.reason = '今日调整次数已用完';
      }
      
      return result;
    } catch (error) {
      console.error('检查调整限制失败:', error);
      result.reason = '检查限制失败';
      return result;
    }
  }

  /**
   * 记录调整操作
   * @param {string} userId 用户ID
   * @param {Object} adjustmentData 调整数据
   * @returns {Promise<boolean>} 记录是否成功
   */
  static async recordAdjustment(userId, adjustmentData) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const storageKey = `${CONFIG.STORAGE_KEYS.USER_ADJUSTMENTS}_${userId}_${todayStr}`;
      
      const adjustments = wx.getStorageSync(storageKey) || [];
      adjustments.push({
        ...adjustmentData,
        timestamp: today,
        id: this.generateAdjustmentId()
      });
      
      wx.setStorageSync(storageKey, adjustments);
      return true;
    } catch (error) {
      console.error('记录调整操作失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否有紧急调整权限（增强版）
   * @param {string} userRole 用户角色
   * @param {Object} emergencyContext 紧急情况上下文
   * @returns {Object} 紧急调整权限检查结果
   */
  static canEmergencyAdjust(userRole, emergencyContext = {}) {
    const result = {
      canAdjust: false,
      level: 'none',
      requireApproval: false,
      overrideCapabilities: [],
      limitations: [],
      reason: ''
    };
    
    // 基础紧急调整权限检查
    const hasEmergencyPermission = RolePermissionManager.hasTimeAdjustPermission(userRole, 'emergency');
    const canOverrideLimit = RolePermissionManager.canOverrideAdjustLimit(userRole);
    
    if (!hasEmergencyPermission && !canOverrideLimit) {
      result.reason = '用户没有紧急调整权限';
      return result;
    }
    
    result.canAdjust = true;
    
    // 根据角色判断紧急调整级别
    if (userRole === CONFIG.USER_ROLES.ADMIN) {
      result.level = 'unlimited';
      result.overrideCapabilities = [
        'time_range_override',    // 跨时间范围
        'cross_day_override',     // 跨天调整
        'holiday_override',       // 节假日调整
        'count_limit_override',   // 次数限制覆盖
        'approval_skip',          // 跳过审批
        'patient_type_override'   // 患者类型限制覆盖
      ];
    } else if (userRole === CONFIG.USER_ROLES.SUPERVISOR) {
      result.level = 'advanced';
      result.requireApproval = emergencyContext.urgencyLevel !== 'critical';
      result.overrideCapabilities = [
        'time_range_override',
        'cross_day_override',
        'count_limit_override'
      ];
      if (emergencyContext.urgencyLevel === 'critical') {
        result.overrideCapabilities.push('approval_skip');
      }
    } else if (userRole === CONFIG.USER_ROLES.SENIOR_RECORDER) {
      result.level = 'limited';
      result.requireApproval = true;
      result.overrideCapabilities = [
        'cross_day_override'
      ];
      result.limitations = [
        '需要主管审批',
        '仅限基础紧急情况',
        '需要详细说明理由'
      ];
    } else {
      result.level = 'request_only';
      result.requireApproval = true;
      result.limitations = [
        '需要申请特殊权限',
        '需要主管或高级记录员审批',
        '仅限真正紧急情况'
      ];
    }
    
    return result;
  }

  /**
   * 检查用户是否有紧急审批权限
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否有紧急审批权限
   */
  static canEmergencyApprove(userRole) {
    return userRole === CONFIG.USER_ROLES.SUPERVISOR ||
           userRole === CONFIG.USER_ROLES.ADMIN;
  }

  /**
   * 判断是否为紧急调整情况（增强版）
   * @param {Object} adjustData 调整数据
   * @param {Object} appointmentInfo 预约信息
   * @param {Object} contextInfo 上下文信息
   * @returns {Object} 紧急情况分析结果
   */
  static analyzeEmergencyCondition(adjustData, appointmentInfo = {}, contextInfo = {}) {
    const analysis = {
      isEmergency: false,
      urgencyLevel: 'normal',
      emergencyType: null,
      emergencyFactors: [],
      emergencyScore: 0,
      requireImmediateAction: false,
      suggestedActions: [],
      approvalPriority: 'normal'
    };
    
    let emergencyScore = 0;
    const factors = [];
    
    // 1. 时间紧迫性评估
    const now = new Date();
    const originalTime = new Date(adjustData.originalTime);
    const noticeHours = (originalTime - now) / (1000 * 60 * 60);
    
    if (noticeHours < 0.5) { // 30分钟内
      emergencyScore += 40;
      factors.push('极紧急时间调整');
      analysis.requireImmediateAction = true;
    } else if (noticeHours < 2) { // 2小时内
      emergencyScore += 30;
      factors.push('紧急时间调整');
    } else if (noticeHours < 6) { // 6小时内
      emergencyScore += 15;
      factors.push('较紧急时间调整');
    }
    
    // 2. 患者紧急情况评估
    if (appointmentInfo.patientCondition) {
      switch (appointmentInfo.patientCondition) {
        case 'critical':
          emergencyScore += 35;
          factors.push('患者病情危重');
          analysis.emergencyType = 'medical_emergency';
          break;
        case 'urgent':
          emergencyScore += 25;
          factors.push('患者情况紧急');
          analysis.emergencyType = 'medical_urgent';
          break;
        case 'unstable':
          emergencyScore += 15;
          factors.push('患者情况不稳定');
          break;
      }
    }
    
    // 3. 服务紧急性评估
    if (adjustData.serviceType) {
      switch (adjustData.serviceType) {
        case 'surgery':
          emergencyScore += 30;
          factors.push('手术服务不能延误');
          analysis.emergencyType = 'service_critical';
          break;
        case 'medication':
          emergencyScore += 20;
          factors.push('用药服务需及时');
          break;
        case 'emergency_visit':
          emergencyScore += 35;
          factors.push('紧急上门服务');
          analysis.emergencyType = 'service_emergency';
          break;
      }
    }
    
    // 4. 外部紧急因素
    if (adjustData.emergencyReason) {
      switch (adjustData.emergencyReason) {
        case 'natural_disaster':
          emergencyScore += 40;
          factors.push('自然灾害影响');
          analysis.emergencyType = 'external_emergency';
          break;
        case 'traffic_accident':
          emergencyScore += 25;
          factors.push('交通事故影响');
          break;
        case 'family_emergency':
          emergencyScore += 20;
          factors.push('家庭紧急情况');
          break;
        case 'health_emergency':
          emergencyScore += 30;
          factors.push('健康紧急情况');
          analysis.emergencyType = 'health_emergency';
          break;
      }
    }
    
    // 设置结果
    analysis.emergencyScore = emergencyScore;
    analysis.emergencyFactors = factors;
    
    // 判断紧急级别
    if (emergencyScore >= 80) {
      analysis.isEmergency = true;
      analysis.urgencyLevel = 'critical';
      analysis.approvalPriority = 'immediate';
      analysis.suggestedActions = [
        '立即处理，无需等待审批',
        '通知相关人员立即反应',
        '记录详细的紧急处理过程'
      ];
    } else if (emergencyScore >= 60) {
      analysis.isEmergency = true;
      analysis.urgencyLevel = 'urgent';
      analysis.approvalPriority = 'high';
      analysis.suggestedActions = [
        '优先处理，加速审批流程',
        '通知相关人员关注',
        '做好后续跟进工作'
      ];
    } else if (emergencyScore >= 40) {
      analysis.isEmergency = true;
      analysis.urgencyLevel = 'moderate';
      analysis.approvalPriority = 'medium';
      analysis.suggestedActions = [
        '适当加速处理流程',
        '增加沟通和协调',
        '关注调整后的影响'
      ];
    }
    
    return analysis;
  }
  static analyzeEmergencyLevel(adjustData, appointmentInfo = {}) {
    const analysis = {
      isEmergency: false,
      emergencyLevel: 'normal', // normal | medium | high | critical
      reasons: [],
      score: 0,
      autoApprovalEligible: false
    };

    const now = new Date();
    const originalTime = new Date(adjustData.originalTime);
    const newTime = new Date(adjustData.newTime);
    const noticeHours = (originalTime - now) / (1000 * 60 * 60);
    const hoursDiff = Math.abs(newTime - originalTime) / (1000 * 60 * 60);

    // 1. 检查时间紧迫性
    if (noticeHours < 2) {
      analysis.score += 30;
      analysis.reasons.push('提前通知时间不足');
    }
    if (noticeHours < 0.5) {
      analysis.score += 20;
      analysis.reasons.push('紧急时间调整');
    }

    // 2. 检查调整幅度
    if (hoursDiff > 48) {
      analysis.score += 25;
      analysis.reasons.push('大幅度时间调整');
    }

    // 3. 检查调整原因
    const emergencyReasons = ['emergency_situation', 'patient_illness', 'previous_overtime'];
    if (emergencyReasons.includes(adjustData.reasonCode)) {
      analysis.score += 35;
      analysis.reasons.push('紧急原因');
    }

    // 4. 检查患者类型
    if (appointmentInfo.patientType === 'vip' || appointmentInfo.priority === 'high') {
      analysis.score += 15;
      analysis.reasons.push('高优先级患者');
    }

    // 5. 检查服务类型
    if (appointmentInfo.serviceType === 'emergency' || appointmentInfo.critical) {
      analysis.score += 20;
      analysis.reasons.push('紧急服务');
    }

    // 6. 检查是否跨日调整
    const originalDate = originalTime.toDateString();
    const newDate = newTime.toDateString();
    if (originalDate !== newDate) {
      analysis.score += 15;
      analysis.reasons.push('跨日调整');
    }

    // 7. 确定紧急级别
    if (analysis.score >= 80) {
      analysis.emergencyLevel = 'critical';
      analysis.isEmergency = true;
    } else if (analysis.score >= 60) {
      analysis.emergencyLevel = 'high';
      analysis.isEmergency = true;
    } else if (analysis.score >= 40) {
      analysis.emergencyLevel = 'medium';
      analysis.isEmergency = true;
    }

    // 8. 判断是否符合自动审批条件
    analysis.autoApprovalEligible = (
      analysis.emergencyLevel === 'critical' && 
      analysis.score >= 90 &&
      emergencyReasons.includes(adjustData.reasonCode)
    );

    return analysis;
  }

  /**
   * 处理紧急调整申请
   * @param {Object} userInfo 用户信息
   * @param {Object} adjustData 调整数据
   * @returns {Object} 处理结果
   */
  static async processEmergencyAdjust(userInfo, adjustData) {
    const result = {
      success: false,
      canProceed: false,
      requireApproval: false,
      emergencyLevel: 'normal',
      message: '',
      workflow: null
    };

    // 1. 检查紧急调整权限
    if (!this.canEmergencyAdjust(userInfo.role)) {
      result.message = '用户没有紧急调整权限，需要特殊申请';
      return result;
    }

    // 2. 分析紧急级别
    const emergencyAnalysis = this.analyzeEmergencyLevel(adjustData, adjustData.appointmentInfo);
    result.emergencyLevel = emergencyAnalysis.emergencyLevel;

    if (!emergencyAnalysis.isEmergency) {
      result.message = '不符合紧急调整条件，请使用普通调整流程';
      return result;
    }

    // 3. 判断处理流程
    if (emergencyAnalysis.autoApprovalEligible) {
      // 符合自动审批条件
      result.success = true;
      result.canProceed = true;
      result.requireApproval = false; // 先执行，后补审批
      result.message = '紧急情况自动批准，将进行事后审批';
      result.workflow = this.getEmergencyWorkflow('auto_approve');
    } else {
      // 需要紧急审批
      result.success = true;
      result.canProceed = false;
      result.requireApproval = true;
      result.message = `紧急调整申请已提交，紧急级别：${this.getEmergencyLevelName(emergencyAnalysis.emergencyLevel)}`;
      result.workflow = this.getEmergencyWorkflow('emergency_approval');
    }

    // 4. 记录紧急调整
    await this.recordEmergencyAdjust(userInfo.id, {
      ...adjustData,
      emergencyAnalysis,
      processResult: result
    });

    return result;
  }

  /**
   * 获取紧急级别名称
   * @param {string} level 紧急级别
   * @returns {string} 级别名称
   */
  static getEmergencyLevelName(level) {
    const levelNames = {
      'normal': '普通',
      'medium': '中等',
      'high': '高级',
      'critical': '极紧急'
    };
    return levelNames[level] || '未知';
  }

  /**
   * 获取紧急调整工作流
   * @param {string} type 流程类型
   * @returns {Object} 工作流配置
   */
  static getEmergencyWorkflow(type) {
    const workflows = {
      auto_approve: {
        type: 'emergency_auto',
        steps: [
          {
            step: 1,
            action: 'execute',
            name: '立即执行',
            autoExecute: true
          },
          {
            step: 2,
            action: 'post_approval',
            name: '事后审批',
            role: CONFIG.USER_ROLES.SUPERVISOR,
            deadline: 24 // 24小时内完成审批
          }
        ]
      },
      emergency_approval: {
        type: 'emergency_approval',
        urgent: true,
        steps: [
          {
            step: 1,
            action: 'emergency_approve',
            name: '紧急审批',
            role: CONFIG.USER_ROLES.SUPERVISOR,
            deadline: 1, // 1小时内完成
            autoEscalate: true
          }
        ]
      }
    };

    return workflows[type] || workflows.emergency_approval;
  }

  /**
   * 记录紧急调整
   * @param {string} userId 用户ID
   * @param {Object} emergencyData 紧急调整数据
   * @returns {Promise<boolean>} 记录结果
   */
  static async recordEmergencyAdjust(userId, emergencyData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `${CONFIG.STORAGE_KEYS.USER_ADJUSTMENTS}_emergency_${userId}_${today}`;
      
      const emergencyAdjusts = wx.getStorageSync(storageKey) || [];
      emergencyAdjusts.push({
        ...emergencyData,
        timestamp: new Date(),
        id: this.generateAdjustmentId()
      });
      
      wx.setStorageSync(storageKey, emergencyAdjusts);
      return true;
    } catch (error) {
      console.error('记录紧急调整失败:', error);
      return false;
    }
  }

  /**
   * 生成调整操作ID
   * @returns {string} 调整ID
   */
  static generateAdjustmentId() {
    return 'adj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 创建特殊权限申请
   * @param {Object} userInfo 用户信息
   * @param {Object} requestData 申请数据
   * @returns {Promise<Object>} 申请结果
   */
  static async createSpecialPermissionRequest(userInfo, requestData) {
    const result = {
      success: false,
      requestId: null,
      message: '',
      workflow: null
    };

    try {
      const {
        requestType, // 'time_extension' | 'count_increase' | 'emergency_privilege'
        reason,
        adjustData,
        duration, // 申请时长（小时）
        justification // 申请理由
      } = requestData;

      // 1. 验证申请资格
      const eligibilityCheck = this.checkSpecialRequestEligibility(userInfo, requestType);
      if (!eligibilityCheck.eligible) {
        result.message = eligibilityCheck.reason;
        return result;
      }

      // 2. 生成申请ID
      const requestId = this.generateSpecialRequestId();
      
      // 3. 分析申请紧急性
      const urgencyAnalysis = this.analyzeRequestUrgency(adjustData, requestType);
      
      // 4. 确定审批流程
      const workflow = this.getSpecialRequestWorkflow(requestType, urgencyAnalysis.level);
      
      // 5. 创建申请记录
      const specialRequest = {
        id: requestId,
        applicantId: userInfo.id,
        applicantName: userInfo.name,
        applicantRole: userInfo.role,
        requestType,
        reason,
        adjustData,
        duration,
        justification,
        urgencyLevel: urgencyAnalysis.level,
        urgencyScore: urgencyAnalysis.score,
        workflow,
        status: 'pending_approval',
        currentStep: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvalHistory: [],
        documents: [], // 支持文件
        metadata: {
          currentPermissionLevel: this.getUserPermissionLevel(userInfo),
          requestedPermissionLevel: this.getRequestedPermissionLevel(requestType),
          ipAddress: '', // 可由前端传入
          userAgent: '' // 可由前端传入
        }
      };

      // 6. 保存申请
      await this.saveSpecialRequest(specialRequest);

      // 7. 发送申请通知
      await this.sendSpecialRequestNotification(specialRequest);

      result.success = true;
      result.requestId = requestId;
      result.message = '特殊权限申请已提交，请耐心等待审批';
      result.workflow = workflow;

      return result;

    } catch (error) {
      console.error('创建特殊权限申请失败:', error);
      result.message = '申请提交失败，请稍后重试';
      return result;
    }
  }

  /**
   * 检查特殊申请资格
   * @param {Object} userInfo 用户信息
   * @param {string} requestType 申请类型
   * @returns {Object} 资格检查结果
   */
  static checkSpecialRequestEligibility(userInfo, requestType) {
    const result = {
      eligible: false,
      reason: ''
    };

    const { role, experience = 0, certifications = [] } = userInfo;

    // 1. 检查基本资格
    if (role === CONFIG.USER_ROLES.ADMIN) {
      result.eligible = true;
      return result; // 管理员可以申请任何特殊权限
    }

    // 2. 根据申请类型检查
    switch (requestType) {
      case 'time_extension':
        if (experience >= 6) {
          result.eligible = true;
        } else {
          result.reason = '申请时间延长权限需要至少6个月工作经验';
        }
        break;
        
      case 'count_increase':
        if (role === CONFIG.USER_ROLES.SENIOR_RECORDER || experience >= 12) {
          result.eligible = true;
        } else {
          result.reason = '申请次数增加需要高级记录员资格或12个月经验';
        }
        break;
        
      case 'emergency_privilege':
        if (role === CONFIG.USER_ROLES.SENIOR_RECORDER || 
            role === CONFIG.USER_ROLES.SUPERVISOR ||
            certifications.includes('emergency')) {
          result.eligible = true;
        } else {
          result.reason = '申请紧急权限需要高级记录员以上资格或紧急认证';
        }
        break;
        
      default:
        result.reason = '未知的申请类型';
    }

    return result;
  }

  /**
   * 生成特殊申请ID
   * @returns {string} 申请ID
   */
  static generateSpecialRequestId() {
    return 'sreq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 分析申请紧急性
   * @param {Object} adjustData 调整数据
   * @param {string} requestType 申请类型
   * @returns {Object} 紧急性分析
   */
  static analyzeRequestUrgency(adjustData, requestType) {
    const analysis = {
      level: 'normal', // normal | medium | high | urgent
      score: 0,
      factors: []
    };

    if (adjustData) {
      const now = new Date();
      const originalTime = new Date(adjustData.originalTime);
      const noticeHours = (originalTime - now) / (1000 * 60 * 60);

      // 时间紧迫性
      if (noticeHours < 2) {
        analysis.score += 40;
        analysis.factors.push('提前通知时间极短');
      } else if (noticeHours < 6) {
        analysis.score += 25;
        analysis.factors.push('提前通知时间不足');
      }

      // 调整原因
      const emergencyReasons = ['emergency_situation', 'patient_illness'];
      if (emergencyReasons.includes(adjustData.reasonCode)) {
        analysis.score += 30;
        analysis.factors.push('紧急医疗情况');
      }
    }

    // 申请类型加权
    if (requestType === 'emergency_privilege') {
      analysis.score += 20;
      analysis.factors.push('紧急权限申请');
    }

    // 确定紧急级别
    if (analysis.score >= 70) {
      analysis.level = 'urgent';
    } else if (analysis.score >= 50) {
      analysis.level = 'high';
    } else if (analysis.score >= 30) {
      analysis.level = 'medium';
    }

    return analysis;
  }

  /**
   * 获取特殊申请审批流程
   * @param {string} requestType 申请类型
   * @param {string} urgencyLevel 紧急级别
   * @returns {Object} 审批流程
   */
  static getSpecialRequestWorkflow(requestType, urgencyLevel) {
    const baseWorkflows = {
      time_extension: {
        type: 'special_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SENIOR_RECORDER,
            name: '高级记录员审批',
            deadline: 24
          },
          {
            step: 2,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管最终审批',
            deadline: 48
          }
        ]
      },
      count_increase: {
        type: 'special_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管审批',
            deadline: 48
          }
        ]
      },
      emergency_privilege: {
        type: 'special_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管紧急审批',
            deadline: urgencyLevel === 'urgent' ? 2 : 12
          }
        ]
      }
    };

    const workflow = baseWorkflows[requestType] || baseWorkflows.time_extension;
    
    // 根据紧急级别调整流程
    if (urgencyLevel === 'urgent') {
      workflow.steps = workflow.steps.map(step => ({
        ...step,
        deadline: Math.min(step.deadline, 6), // 紧急情况最多6小时
        urgent: true
      }));
    }

    return workflow;
  }

  /**
   * 获取请求的权限级别
   * @param {string} requestType 申请类型
   * @returns {string} 权限级别
   */
  static getRequestedPermissionLevel(requestType) {
    const levelMapping = {
      'time_extension': 'advanced',
      'count_increase': 'advanced',
      'emergency_privilege': 'emergency'
    };
    
    return levelMapping[requestType] || 'normal';
  }

  /**
   * 保存特殊申请
   * @param {Object} specialRequest 特殊申请数据
   * @returns {Promise<boolean>} 保存结果
   */
  static async saveSpecialRequest(specialRequest) {
    try {
      const storageKey = `special_requests_${specialRequest.applicantId}`;
      const requests = wx.getStorageSync(storageKey) || [];
      
      requests.push(specialRequest);
      wx.setStorageSync(storageKey, requests);
      
      // 同时保存到全局索引
      const globalKey = 'all_special_requests';
      const allRequests = wx.getStorageSync(globalKey) || [];
      allRequests.push({
        id: specialRequest.id,
        applicantId: specialRequest.applicantId,
        requestType: specialRequest.requestType,
        status: specialRequest.status,
        createdAt: specialRequest.createdAt
      });
      wx.setStorageSync(globalKey, allRequests);
      
      return true;
    } catch (error) {
      console.error('保存特殊申请失败:', error);
      return false;
    }
  }

  /**
   * 发送特殊申请通知
   * @param {Object} specialRequest 特殊申请数据
   * @returns {Promise<void>}
   */
  static async sendSpecialRequestNotification(specialRequest) {
    try {
      // 这里应该集成通知服务
      // 暂时使用控制台输出
      console.log('发送特殊申请通知:', {
        type: 'special_request_created',
        requestId: specialRequest.id,
        requestType: specialRequest.requestType,
        applicant: specialRequest.applicantName,
        urgencyLevel: specialRequest.urgencyLevel
      });
    } catch (error) {
      console.error('发送特殊申请通知失败:', error);
    }
  }

  /**
   * 获取用户的特殊申请列表
   * @param {string} userId 用户ID
   * @param {string} status 申请状态过滤器
   * @returns {Promise<Array>} 申请列表
   */
  static async getUserSpecialRequests(userId, status = null) {
    try {
      const storageKey = `special_requests_${userId}`;
      const requests = wx.getStorageSync(storageKey) || [];
      
      if (status) {
        return requests.filter(req => req.status === status);
      }
      
      return requests;
    } catch (error) {
      console.error('获取特殊申请列表失败:', error);
      return [];
    }
  }

  /**
   * 创建调整权限报告
   * @param {Object} userInfo 用户信息
   * @returns {Object} 权限报告
   */
  static generatePermissionReport(userInfo) {
    const permissions = this.getUserAdjustPermissions(userInfo);
    const availableTypes = this.getAvailableAdjustTypes(userInfo.role);
    
    return {
      user: {
        id: userInfo.id,
        name: userInfo.name,
        role: userInfo.role,
        experience: userInfo.experience
      },
      permissions: {
        level: permissions.level,
        maxAdjustHours: permissions.maxAdjustHours,
        maxDailyAdjustments: permissions.maxAdjustTimes,
        requireApproval: permissions.requireApproval,
        minNoticeHours: permissions.minNoticeHours
      },
      capabilities: {
        canBatchAdjust: permissions.canBatchAdjust,
        canOverrideLimit: permissions.canOverrideLimit,
        canApprove: permissions.canApprove,
        availableTypes: availableTypes.map(t => t.type)
      },
      recommendations: this.generatePermissionRecommendations(userInfo)
    };
  }

  /**
   * 生成权限提升建议
   * @param {Object} userInfo 用户信息
   * @returns {Array} 建议列表
   */
  static generatePermissionRecommendations(userInfo) {
    const recommendations = [];
    const { role, experience = 0, certifications = [] } = userInfo;

    if (role === CONFIG.USER_ROLES.RECORDER) {
      if (experience >= 12) {
        recommendations.push({
          type: 'role_upgrade',
          title: '申请高级记录员资格',
          description: '您的工作经验已满12个月，可申请升级为高级记录员',
          benefits: ['获得高级调整权限', '可进行批量调整', '调整范围扩大到72小时']
        });
      }
      
      if (!certifications.includes('advanced_care')) {
        recommendations.push({
          type: 'certification',
          title: '获取高级护理认证',
          description: '通过高级护理认证可获得更多权限',
          benefits: ['提升专业能力', '增加调整权限', '职业发展机会']
        });
      }
    }

    if (role === CONFIG.USER_ROLES.SENIOR_RECORDER) {
      if (experience >= 24 && certifications.includes('management')) {
        recommendations.push({
          type: 'role_upgrade',
          title: '申请主管职位',
          description: '您具备主管资格，可申请主管职位',
          benefits: ['获得紧急调整权限', '审批权限', '管理团队']
        });
      }
    }

    return recommendations;
  }
  
  /**
   * 申请特殊权限
   * @param {string} userId 申请用户ID
   * @param {Object} requestData 申请数据
   * @returns {Promise<Object>} 申请结果
   */
  static async requestSpecialPermission(userId, requestData) {
    try {
      const requestId = this.generateRequestId();
      const request = {
        id: requestId,
        userId: userId,
        requestTime: new Date().toISOString(),
        requestType: requestData.type, // 'time_extension', 'count_increase', 'emergency_privilege'
        reason: requestData.reason,
        urgencyLevel: requestData.urgencyLevel || 'normal',
        relatedAdjustment: requestData.adjustmentData || null,
        requestedPermissions: requestData.permissions || [],
        duration: requestData.duration || 24, // 小时
        
        // 状态信息
        status: 'pending', // pending, reviewing, approved, rejected, expired
        currentStep: 1,
        workflow: this.getRequestApprovalWorkflow(requestData.type, requestData.urgencyLevel),
        
        // 审批记录
        approvalHistory: [],
        finalDecision: null,
        
        // 系统信息
        autoExpiry: requestData.autoExpiry !== false,
        expiryTime: new Date(Date.now() + (requestData.duration || 24) * 60 * 60 * 1000).toISOString()
      };
      
      // 保存申请
      const requestsKey = `permission_requests_${userId}`;
      const requests = wx.getStorageSync(requestsKey) || [];
      requests.push(request);
      wx.setStorageSync(requestsKey, requests);
      
      // 保存到全局申请列表
      const globalRequestsKey = 'permission_requests_global';
      const globalRequests = wx.getStorageSync(globalRequestsKey) || [];
      globalRequests.push(request);
      wx.setStorageSync(globalRequestsKey, globalRequests);
      
      return {
        success: true,
        requestId: requestId,
        status: 'submitted',
        message: '特殊权限申请已提交，请等待审批'
      };
      
    } catch (error) {
      console.error('申请特殊权限失败:', error);
      return {
        success: false,
        message: '申请提交失败，请稍后重试'
      };
    }
  }
  
  /**
   * 检查用户是否有有效的临时权限
   * @param {string} userId 用户ID
   * @param {string} permissionType 权限类型
   * @returns {Promise<Object>} 权限检查结果
   */
  static async checkTemporaryPermissions(userId, permissionType) {
    try {
      const tempPermissionsKey = `temp_permissions_${userId}`;
      const tempPermissions = wx.getStorageSync(tempPermissionsKey) || [];
      
      const now = new Date();
      const activePermissions = tempPermissions.filter(perm => {
        const endTime = new Date(perm.endTime);
        return perm.status === 'active' && 
               endTime > now && 
               perm.permissions.includes(permissionType);
      });
      
      if (activePermissions.length === 0) {
        return {
          hasPermission: false,
          reason: '没有有效的临时权限'
        };
      }
      
      const latestPermission = activePermissions[0];
      
      return {
        hasPermission: true,
        permission: latestPermission,
        remainingTime: new Date(latestPermission.endTime) - now
      };
      
    } catch (error) {
      console.error('检查临时权限失败:', error);
      return {
        hasPermission: false,
        reason: '系统错误，无法检查权限'
      };
    }
  }
  
  /**
   * 获取申请审批流程
   * @param {string} requestType 申请类型
   * @param {string} urgencyLevel 紧急级别
   * @returns {Object} 审批流程
   */
  static getRequestApprovalWorkflow(requestType, urgencyLevel = 'normal') {
    const baseWorkflows = {
      time_extension: {
        type: 'time_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SENIOR_RECORDER,
            name: '高级记录员审批',
            deadline: 24
          },
          {
            step: 2,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管审批',
            deadline: 48
          }
        ]
      },
      count_increase: {
        type: 'special_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管审批',
            deadline: 48
          }
        ]
      },
      emergency_privilege: {
        type: 'special_permission',
        steps: [
          {
            step: 1,
            role: CONFIG.USER_ROLES.SUPERVISOR,
            name: '主管紧急审批',
            deadline: urgencyLevel === 'urgent' ? 2 : 12
          }
        ]
      }
    };

    return baseWorkflows[requestType] || baseWorkflows.count_increase;
  }
  
  /**
   * 生成申请ID
   * @returns {string} 申请ID
   */
  static generateRequestId() {
    return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = TimeAdjustPermissionService;

/**
 * 更新全局统计信息
 * @param {string} userId 用户ID
 * @param {Object} adjustmentRecord 调整记录
 * @returns {Promise<boolean>} 是否更新成功
 */
TimeAdjustPermissionService.updateGlobalStatistics = async function(userId, adjustmentRecord) {
    try {
      const globalStatsKey = `${CONFIG.STORAGE_KEYS.USER_ADJUSTMENTS}_global_${userId}`;
      let globalStats = wx.getStorageSync(globalStatsKey) || {
        totalAdjustments: 0,
        emergencyAdjustments: 0,
        approvalRequiredCount: 0,
        averageImpactScore: 0,
        mostUsedReasons: {},
        timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
        adjustmentTypes: { normal: 0, advanced: 0, emergency: 0 },
        weeklyTrends: [],
        monthlyTrends: []
      };
      
      // 更新统计数据
      globalStats.totalAdjustments++;
      
      if (adjustmentRecord.isEmergency) {
        globalStats.emergencyAdjustments++;
      }
      
      if (adjustmentRecord.approvalRequired) {
        globalStats.approvalRequiredCount++;
      }
      
      // 更新平均影响评分
      const totalScore = globalStats.averageImpactScore * (globalStats.totalAdjustments - 1) + adjustmentRecord.impactScore;
      globalStats.averageImpactScore = totalScore / globalStats.totalAdjustments;
      
      // 更新原因统计
      const reason = adjustmentRecord.reason || 'unknown';
      globalStats.mostUsedReasons[reason] = (globalStats.mostUsedReasons[reason] || 0) + 1;
      
      // 更新时间分布
      const hour = new Date(adjustmentRecord.newTime).getHours();
      if (hour >= 6 && hour < 12) globalStats.timeDistribution.morning++;
      else if (hour >= 12 && hour < 18) globalStats.timeDistribution.afternoon++;
      else if (hour >= 18 && hour < 22) globalStats.timeDistribution.evening++;
      else globalStats.timeDistribution.night++;
      
      // 更新调整类型
      globalStats.adjustmentTypes[adjustmentRecord.adjustType]++;
      
      // 保存更新的统计
      wx.setStorageSync(globalStatsKey, globalStats);
      
      return true;
    } catch (error) {
      console.error('更新全局统计失败:', error);
      return false;
    }
  }
  
/**
 * 触发调整相关事件
 * @param {Object} adjustmentRecord 调整记录
 */
TimeAdjustPermissionService.triggerAdjustmentEvents = function(adjustmentRecord) {
    try {
      // 发送自定义事件
      if (typeof getApp === 'function') {
        const app = getApp();
        if (app.globalData && app.globalData.eventBus) {
          app.globalData.eventBus.emit('adjustment_recorded', {
            record: adjustmentRecord,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 紧急调整事件
      if (adjustmentRecord.isEmergency) {
        console.warn('紧急调整被记录:', {
          userId: adjustmentRecord.userId,
          urgencyLevel: adjustmentRecord.urgencyLevel,
          factors: adjustmentRecord.emergencyFactors
        });
      }
      
      // 高影响调整事件
      if (adjustmentRecord.impactScore > 70) {
        console.warn('高影响调整被记录:', {
          userId: adjustmentRecord.userId,
          impactScore: adjustmentRecord.impactScore,
          reason: adjustmentRecord.reason
        });
      }
      
    } catch (error) {
      console.error('触发调整事件失败:', error);
    }
  }
  
/**
 * 获取调整数据分析报告
 * @param {string} userId 用户ID
 * @param {Object} options 分析选项
 * @returns {Promise<Object>} 分析报告
 */
TimeAdjustPermissionService.getAdjustmentAnalysisReport = async function(userId, options = {}) {
    try {
      const {
        timeRange = 'month', // day, week, month, quarter, year
        includeComparison = true,
        includeTrends = true,
        includeRecommendations = true
      } = options;
      
      const report = {
        summary: {
          period: timeRange,
          totalAdjustments: 0,
          emergencyRate: 0,
          approvalRate: 0,
          averageImpactScore: 0,
          efficiency: 'good' // poor, fair, good, excellent
        },
        breakdown: {
          byType: { normal: 0, advanced: 0, emergency: 0 },
          byTime: { morning: 0, afternoon: 0, evening: 0, night: 0 },
          byReason: {},
          byDay: {}
        },
        trends: {
          daily: [],
          weekly: [],
          patterns: []
        },
        comparison: {
          previousPeriod: null,
          change: {
            total: 0,
            emergency: 0,
            efficiency: 0
          }
        },
        recommendations: [],
        warnings: []
      };
      
      // 获取数据并分析
      const rawData = await this.getAdjustmentDataByRange(userId, timeRange);
      
      // 基础统计
      report.summary.totalAdjustments = rawData.length;
      const emergencyCount = rawData.filter(adj => adj.isEmergency).length;
      const approvalCount = rawData.filter(adj => adj.approvalRequired).length;
      
      report.summary.emergencyRate = rawData.length ? (emergencyCount / rawData.length * 100) : 0;
      report.summary.approvalRate = rawData.length ? (approvalCount / rawData.length * 100) : 0;
      
      // 平均影响评分
      const totalImpact = rawData.reduce((sum, adj) => sum + (adj.impactScore || 0), 0);
      report.summary.averageImpactScore = rawData.length ? (totalImpact / rawData.length) : 0;
      
      // 效率评估
      if (report.summary.emergencyRate > 50) {
        report.summary.efficiency = 'poor';
        report.warnings.push('紧急调整比例过高，建议优化时间管理');
      } else if (report.summary.emergencyRate > 30) {
        report.summary.efficiency = 'fair';
      } else if (report.summary.emergencyRate < 10) {
        report.summary.efficiency = 'excellent';
      }
      
      // 细分类统计
      rawData.forEach(adj => {
        // 按类型
        report.breakdown.byType[adj.adjustType] = (report.breakdown.byType[adj.adjustType] || 0) + 1;
        
        // 按时间
        const hour = new Date(adj.newTime).getHours();
        if (hour >= 6 && hour < 12) report.breakdown.byTime.morning++;
        else if (hour >= 12 && hour < 18) report.breakdown.byTime.afternoon++;
        else if (hour >= 18 && hour < 22) report.breakdown.byTime.evening++;
        else report.breakdown.byTime.night++;
        
        // 按原因
        const reason = adj.reason || 'unknown';
        report.breakdown.byReason[reason] = (report.breakdown.byReason[reason] || 0) + 1;
        
        // 按日期
        const date = adj.timestamp.split('T')[0];
        report.breakdown.byDay[date] = (report.breakdown.byDay[date] || 0) + 1;
      });
      
      // 生成建议
      if (includeRecommendations) {
        report.recommendations = this.generateAdjustmentRecommendations(report);
      }
      
      return report;
      
    } catch (error) {
      console.error('生成调整分析报告失败:', error);
      return null;
    }
  }
  
/**
 * 检查时间范围调整限制（增强版）
 * @param {Object} userInfo 用户信息
 * @param {Object} adjustData 调整数据
 * @returns {Object} 时间范围检查结果
 */
TimeAdjustPermissionService.checkTimeRangeAdjustLimits = function(userInfo, adjustData) {
    const result = {
      valid: true,
      violations: [],
      warnings: [],
      allowedOverrides: [],
      restrictionLevel: 'normal'
    };
    
    const permissions = this.getUserAdjustPermissions(userInfo);
    const originalTime = new Date(adjustData.originalTime);
    const newTime = new Date(adjustData.newTime);
    const hoursDiff = Math.abs(newTime - originalTime) / (1000 * 60 * 60);
    
    // 1. 检查最大调整时间范围
    if (hoursDiff > permissions.maxAdjustHours) {
      if (permissions.canOverrideLimit) {
        result.allowedOverrides.push({
          type: 'time_range_override',
          description: `调整时间${hoursDiff.toFixed(1)}小时超出常规限制${permissions.maxAdjustHours}小时，但用户有覆盖权限`,
          requireApproval: true
        });
        result.warnings.push(`时间调整超出常规范围，需要审批`);
      } else {
        result.valid = false;
        result.violations.push({
          type: 'time_range_exceeded',
          message: `调整时间${hoursDiff.toFixed(1)}小时超出允许范围${permissions.maxAdjustHours}小时`,
          severity: 'error'
        });
      }
    }
    
    // 2. 检查工作时间范围限制
    const newHour = newTime.getHours();
    const isWorkingHours = newHour >= 8 && newHour <= 18;
    
    if (!isWorkingHours && permissions.level !== 'emergency') {
      const restrictionLevel = this.getTimeRestrictionLevel(newHour, permissions.level);
      
      if (restrictionLevel === 'forbidden') {
        result.valid = false;
        result.violations.push({
          type: 'forbidden_time',
          message: `不允许调整到${newHour}:00时段`,
          severity: 'error'
        });
      } else if (restrictionLevel === 'restricted') {
        if (permissions.canOverrideLimit) {
          result.allowedOverrides.push({
            type: 'time_restriction_override',
            description: `调整到受限时段，需要特殊权限`,
            requireApproval: true
          });
          result.warnings.push(`调整到非工作时间，需要审批`);
        } else {
          result.valid = false;
          result.violations.push({
            type: 'restricted_time',
            message: `您没有权限调整到${newHour}:00时段`,
            severity: 'error'
          });
        }
      }
    }
    
    return result;
  }
  
/**
 * 获取时间限制级别
 * @param {number} hour 小时数
 * @param {string} permissionLevel 权限级别
 * @returns {string} 限制级别
 */
TimeAdjustPermissionService.getTimeRestrictionLevel = function(hour, permissionLevel) {
    const restrictions = {
      'normal': {
        forbidden: [22, 23, 0, 1, 2, 3, 4, 5, 6], // 22:00-06:00 禁止
        restricted: [7, 19, 20, 21] // 07:00-08:00, 19:00-22:00 受限
      },
      'advanced': {
        forbidden: [0, 1, 2, 3, 4, 5], // 00:00-05:00 禁止
        restricted: [6, 7, 22, 23] // 06:00-08:00, 22:00-00:00 受限
      },
      'emergency': {
        forbidden: [2, 3, 4], // 02:00-05:00 禁止
        restricted: [1, 5] // 01:00-02:00, 05:00-06:00 受限
      }
    };
    
    const levelRestrictions = restrictions[permissionLevel] || restrictions.normal;
    
    if (levelRestrictions.forbidden.includes(hour)) {
      return 'forbidden';
    } else if (levelRestrictions.restricted.includes(hour)) {
      return 'restricted';
    }
    
    return 'allowed';
  }
  
/**
 * 实现调整次数限制功能
 * @param {Object} userInfo 用户信息
 * @param {Object} adjustData 调整数据
 * @returns {Promise<Object>} 次数限制检查结果
 */
TimeAdjustPermissionService.implementAdjustmentCountLimits = async function(userInfo, adjustData) {
    const result = {
      canAdjust: false,
      remainingCount: 0,
      resetTime: null,
      limitType: 'daily',
      overrideAvailable: false,
      overrideConditions: []
    };
    
    try {
      const permissions = this.getUserAdjustPermissions(userInfo);
      const userId = userInfo.id || 'current_user';
      
      // 检查每日限制
      const dailyStats = await this.getAdjustmentStatistics(userId, permissions.level);
      result.remainingCount = dailyStats.today.remaining;
      
      // 计算重置时间（第二天0点）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      result.resetTime = tomorrow;
      
      if (result.remainingCount > 0) {
        result.canAdjust = true;
      } else {
        // 检查是否可以覆盖限制
        if (permissions.canOverrideLimit) {
          result.overrideAvailable = true;
          result.overrideConditions = [
            '需要提供详细的调整理由',
            '需要主管审批',
            '将计入个人调整记录'
          ];
          
          // 紧急情况可以临时覆盖
          if (adjustData.isEmergency) {
            result.canAdjust = true;
            result.overrideConditions.unshift('紧急情况临时允许超限');
          }
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('检查调整次数限制失败:', error);
      return {
        ...result,
        error: '系统错误，无法验证调整次数'
      };
    }
  }