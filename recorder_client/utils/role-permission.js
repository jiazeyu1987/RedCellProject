// 角色权限管理工具

// 为了避免循环依赖，在模块内部定义用户角色常量
const USER_ROLES = {
  RECORDER: 'recorder',        // 普通记录员
  SENIOR_RECORDER: 'senior_recorder', // 高级记录员
  SUPERVISOR: 'supervisor',    // 主管
  ADMIN: 'admin'              // 管理员
};

// 权限定义
const PERMISSIONS = {
  // 基础权限
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_PROFILE: 'view_profile',
  
  // 日程管理权限
  VIEW_SCHEDULE: 'view_schedule',
  CREATE_SCHEDULE: 'create_schedule',
  UPDATE_SCHEDULE: 'update_schedule',
  DELETE_SCHEDULE: 'delete_schedule',
  
  // 患者管理权限
  VIEW_PATIENT: 'view_patient',
  CREATE_PATIENT: 'create_patient',
  UPDATE_PATIENT: 'update_patient',
  DELETE_PATIENT: 'delete_patient',
  VIEW_PATIENT_HEALTH: 'view_patient_health',
  
  // 服务记录权限
  VIEW_RECORD: 'view_record',
  CREATE_RECORD: 'create_record',
  UPDATE_RECORD: 'update_record',
  DELETE_RECORD: 'delete_record',
  UPLOAD_MEDIA: 'upload_media',
  
  // 付款管理权限
  VIEW_PAYMENT: 'view_payment',
  MANAGE_PAYMENT: 'manage_payment',
  PROCESS_REFUND: 'process_refund',
  VIEW_FINANCIAL_STATS: 'view_financial_stats',
  
  // 预约挂号权限
  VIEW_APPOINTMENT: 'view_appointment',
  CREATE_APPOINTMENT: 'create_appointment',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  
  // 医生协作权限
  COLLABORATE_DOCTOR: 'collaborate_doctor',
  SHARE_HEALTH_INFO: 'share_health_info',
  VIEW_MEDICAL_ADVICE: 'view_medical_advice',
  
  // 时间调整权限 - 增强版
  ADJUST_TIME_NORMAL: 'adjust_time_normal',       // 普通时间调整权限
  ADJUST_TIME_ADVANCED: 'adjust_time_advanced',   // 高级时间调整权限
  ADJUST_TIME_EMERGENCY: 'adjust_time_emergency', // 紧急时间调整权限
  APPROVE_ADJUSTMENT: 'approve_adjustment',       // 审批调整权限
  BATCH_ADJUST_TIME: 'batch_adjust_time',         // 批量调整权限
  VIEW_ADJUST_HISTORY: 'view_adjust_history',     // 查看调整历史权限
  OVERRIDE_ADJUST_LIMIT: 'override_adjust_limit', // 超越调整限制权限
  
  // 新增：细化的调整权限
  ADJUST_CROSS_DAY: 'adjust_cross_day',           // 跨天调整权限
  ADJUST_NON_WORKING_HOURS: 'adjust_non_working_hours', // 非工作时间调整
  ADJUST_CRITICAL_APPOINTMENTS: 'adjust_critical_appointments', // 重要预约调整
  ADJUST_VIP_PATIENTS: 'adjust_vip_patients',     // VIP患者调整权限
  ADJUST_MULTIPLE_PATIENTS: 'adjust_multiple_patients', // 多患者调整权限
  EMERGENCY_ADJUSTMENT_OVERRIDE: 'emergency_adjustment_override', // 紧急调整超越权限
  
  // 新增：时间范围控制权限
  ADJUST_WITHIN_24H: 'adjust_within_24h',         // 24小时内调整
  ADJUST_WITHIN_72H: 'adjust_within_72h',         // 72小时内调整
  ADJUST_BEYOND_72H: 'adjust_beyond_72h',         // 超过72小时调整
  ADJUST_SAME_DAY: 'adjust_same_day',             // 当日调整
  ADJUST_NEXT_DAY: 'adjust_next_day',             // 次日调整
  ADJUST_WITHIN_WEEK: 'adjust_within_week',       // 一周内调整
  
  // 新增：调整次数控制权限
  DAILY_ADJUST_3: 'daily_adjust_3',               // 每日最多3次调整
  DAILY_ADJUST_5: 'daily_adjust_5',               // 每日最多5次调整
  DAILY_ADJUST_10: 'daily_adjust_10',             // 每日最多10次调整
  UNLIMITED_DAILY_ADJUST: 'unlimited_daily_adjust', // 无限制每日调整
  
  // 新增：特殊权限申请
  REQUEST_SPECIAL_PERMISSION: 'request_special_permission', // 申请特殊权限
  APPROVE_SPECIAL_PERMISSION: 'approve_special_permission', // 审批特殊权限
  GRANT_TEMPORARY_PERMISSION: 'grant_temporary_permission', // 授予临时权限
  REVOKE_PERMISSIONS: 'revoke_permissions',       // 撤销权限
  
  // 管理员权限
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  MANAGE_SETTINGS: 'manage_settings'
};

// 角色权限映射
const ROLE_PERMISSIONS = {};

// 先定义基础角色权限
ROLE_PERMISSIONS[USER_ROLES.RECORDER] = [
  // 基础权限
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.VIEW_PROFILE,
  
  // 日程管理
  PERMISSIONS.VIEW_SCHEDULE,
  PERMISSIONS.UPDATE_SCHEDULE,
  
  // 患者管理
  PERMISSIONS.VIEW_PATIENT,
  PERMISSIONS.VIEW_PATIENT_HEALTH,
  
  // 服务记录
  PERMISSIONS.VIEW_RECORD,
  PERMISSIONS.CREATE_RECORD,
  PERMISSIONS.UPDATE_RECORD,
  PERMISSIONS.UPLOAD_MEDIA,
  
  // 付款查看
  PERMISSIONS.VIEW_PAYMENT,
  
  // 预约功能
  PERMISSIONS.VIEW_APPOINTMENT,
  PERMISSIONS.CREATE_APPOINTMENT,
  PERMISSIONS.CANCEL_APPOINTMENT,
  
  // 医生协作
  PERMISSIONS.COLLABORATE_DOCTOR,
  PERMISSIONS.SHARE_HEALTH_INFO,
  PERMISSIONS.VIEW_MEDICAL_ADVICE,
  
  // 时间调整 - 普通记录员只有基础调整权限
  PERMISSIONS.ADJUST_TIME_NORMAL,
  PERMISSIONS.VIEW_ADJUST_HISTORY,
  PERMISSIONS.ADJUST_WITHIN_24H,        // 允许24小时内调整
  PERMISSIONS.ADJUST_SAME_DAY,          // 允许当日调整
  PERMISSIONS.DAILY_ADJUST_3,           // 每日最多3次
  PERMISSIONS.REQUEST_SPECIAL_PERMISSION // 可以申请特殊权限
];

// 然后定义高级角色权限（继承基础权限）
ROLE_PERMISSIONS[USER_ROLES.SENIOR_RECORDER] = [
  // 继承普通记录员所有权限
  ...ROLE_PERMISSIONS[USER_ROLES.RECORDER],
  
  // 高级权限
  PERMISSIONS.CREATE_SCHEDULE,
  PERMISSIONS.DELETE_SCHEDULE,
  PERMISSIONS.UPDATE_PATIENT,
  PERMISSIONS.DELETE_RECORD,
  
  // 高级时间调整权限
  PERMISSIONS.ADJUST_TIME_ADVANCED,
  PERMISSIONS.BATCH_ADJUST_TIME,
  PERMISSIONS.ADJUST_WITHIN_72H,        // 允许72小时内调整
  PERMISSIONS.ADJUST_CROSS_DAY,         // 允许跨天调整
  PERMISSIONS.ADJUST_NON_WORKING_HOURS, // 允许非工作时间调整
  PERMISSIONS.ADJUST_NEXT_DAY,          // 允许次日调整
  PERMISSIONS.DAILY_ADJUST_5,           // 每日最多5次
  PERMISSIONS.ADJUST_WITHIN_WEEK        // 允许一周内调整
];

// 定义主管权限（继承高级记录员权限）
ROLE_PERMISSIONS[USER_ROLES.SUPERVISOR] = [
  // 继承高级记录员所有权限
  ...ROLE_PERMISSIONS[USER_ROLES.SENIOR_RECORDER],
  
  // 主管权限
  PERMISSIONS.CREATE_PATIENT,
  PERMISSIONS.DELETE_PATIENT,
  PERMISSIONS.MANAGE_PAYMENT,
  PERMISSIONS.PROCESS_REFUND,
  PERMISSIONS.VIEW_FINANCIAL_STATS,
  
  // 紧急调整和审批权限
  PERMISSIONS.ADJUST_TIME_EMERGENCY,
  PERMISSIONS.APPROVE_ADJUSTMENT,
  PERMISSIONS.OVERRIDE_ADJUST_LIMIT,
  PERMISSIONS.ADJUST_BEYOND_72H,         // 允许超过72小时调整
  PERMISSIONS.ADJUST_CRITICAL_APPOINTMENTS, // 允许重要预约调整
  PERMISSIONS.ADJUST_VIP_PATIENTS,       // VIP患者调整权限
  PERMISSIONS.ADJUST_MULTIPLE_PATIENTS,  // 多患者调整权限
  PERMISSIONS.EMERGENCY_ADJUSTMENT_OVERRIDE, // 紧急调整超越权限
  PERMISSIONS.DAILY_ADJUST_10,           // 每日最多10次
  PERMISSIONS.APPROVE_SPECIAL_PERMISSION, // 审批特殊权限
  PERMISSIONS.GRANT_TEMPORARY_PERMISSION  // 授予临时权限
];

// 定义管理员权限（拥有所有权限）
ROLE_PERMISSIONS[USER_ROLES.ADMIN] = [
  // 管理员拥有所有权限
  ...Object.values(PERMISSIONS),
  PERMISSIONS.UNLIMITED_DAILY_ADJUST,    // 无限制每日调整
  PERMISSIONS.REVOKE_PERMISSIONS         // 撤销权限
];

class RolePermissionManager {
  /**
   * 检查用户是否有指定权限
   * @param {string} userRole 用户角色
   * @param {string} permission 权限名称
   * @returns {boolean} 是否有权限
   */
  static hasPermission(userRole, permission) {
    if (!userRole || !permission) {
      return false;
    }
    
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) {
      return false;
    }
    
    return rolePermissions.includes(permission);
  }

  /**
   * 检查用户是否有多个权限
   * @param {string} userRole 用户角色
   * @param {Array<string>} permissions 权限数组
   * @param {string} operator 操作符 'AND' | 'OR'
   * @returns {boolean} 是否有权限
   */
  static hasPermissions(userRole, permissions, operator = 'AND') {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    
    if (operator === 'AND') {
      return permissions.every(permission => this.hasPermission(userRole, permission));
    } else if (operator === 'OR') {
      return permissions.some(permission => this.hasPermission(userRole, permission));
    }
    
    return false;
  }

  /**
   * 获取用户角色的所有权限
   * @param {string} userRole 用户角色
   * @returns {Array<string>} 权限列表
   */
  static getRolePermissions(userRole) {
    return ROLE_PERMISSIONS[userRole] || [];
  }

  /**
   * 检查是否为管理员
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否为管理员
   */
  static isAdmin(userRole) {
    return userRole === USER_ROLES.ADMIN;
  }

  /**
   * 检查是否为主管
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否为主管
   */
  static isSupervisor(userRole) {
    return userRole === USER_ROLES.SUPERVISOR;
  }

  /**
   * 检查是否为高级记录员
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否为高级记录员
   */
  static isSeniorRecorder(userRole) {
    return userRole === USER_ROLES.SENIOR_RECORDER;
  }

  /**
   * 获取用户的时间调整权限级别
   * @param {string} userRole 用户角色
   * @returns {string} 权限级别 normal|advanced|emergency|admin
   */
  static getTimeAdjustPermissionLevel(userRole) {
    if (this.isAdmin(userRole)) {
      return 'admin';
    } else if (this.isSupervisor(userRole)) {
      return 'emergency';
    } else if (this.isSeniorRecorder(userRole)) {
      return 'advanced';
    } else {
      return 'normal';
    }
  }

  /**
   * 检查时间调整权限
   * @param {string} userRole 用户角色
   * @param {string} adjustType 调整类型 normal|advanced|emergency
   * @returns {boolean} 是否有权限
   */
  static hasTimeAdjustPermission(userRole, adjustType = 'normal') {
    const permissionMap = {
      'normal': PERMISSIONS.ADJUST_TIME_NORMAL,
      'advanced': PERMISSIONS.ADJUST_TIME_ADVANCED,
      'emergency': PERMISSIONS.ADJUST_TIME_EMERGENCY
    };
    
    const requiredPermission = permissionMap[adjustType];
    if (!requiredPermission) {
      return false;
    }
    
    return this.hasPermission(userRole, requiredPermission);
  }

  /**
   * 检查时间范围调整权限
   * @param {string} userRole 用户角色
   * @param {number} hoursDiff 调整时间差（小时）
   * @returns {Object} 权限检查结果
   */
  static checkTimeRangePermission(userRole, hoursDiff) {
    const result = {
      allowed: false,
      maxHours: 0,
      requireApproval: false,
      permissionLevel: 'none'
    };

    if (hoursDiff <= 24) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_WITHIN_24H)) {
        result.allowed = true;
        result.maxHours = 24;
        result.permissionLevel = 'normal';
      }
    }

    if (hoursDiff <= 72) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_WITHIN_72H)) {
        result.allowed = true;
        result.maxHours = 72;
        result.permissionLevel = 'advanced';
        result.requireApproval = hoursDiff > 24;
      }
    }

    if (hoursDiff > 72) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_BEYOND_72H)) {
        result.allowed = true;
        result.maxHours = 999;
        result.permissionLevel = 'emergency';
        result.requireApproval = true;
      }
    }

    return result;
  }

  /**
   * 检查每日调整次数权限
   * @param {string} userRole 用户角色
   * @returns {Object} 每日调整次数信息
   */
  static getDailyAdjustmentLimit(userRole) {
    if (this.hasPermission(userRole, PERMISSIONS.UNLIMITED_DAILY_ADJUST)) {
      return { limit: 999, level: 'unlimited' };
    }

    if (this.hasPermission(userRole, PERMISSIONS.DAILY_ADJUST_10)) {
      return { limit: 10, level: 'advanced' };
    }

    if (this.hasPermission(userRole, PERMISSIONS.DAILY_ADJUST_5)) {
      return { limit: 5, level: 'intermediate' };
    }

    if (this.hasPermission(userRole, PERMISSIONS.DAILY_ADJUST_3)) {
      return { limit: 3, level: 'basic' };
    }

    return { limit: 0, level: 'none' };
  }

  /**
   * 检查跨天调整权限
   * @param {string} userRole 用户角色
   * @param {Date} originalTime 原时间
   * @param {Date} newTime 新时间
   * @returns {Object} 跨天调整权限检查结果
   */
  static checkCrossDayPermission(userRole, originalTime, newTime) {
    const result = {
      allowed: false,
      requireApproval: false,
      crossDays: 0,
      reason: ''
    };

    // 计算跨天数
    const originalDate = new Date(originalTime.getFullYear(), originalTime.getMonth(), originalTime.getDate());
    const newDate = new Date(newTime.getFullYear(), newTime.getMonth(), newTime.getDate());
    const crossDays = Math.abs(Math.floor((newDate - originalDate) / (1000 * 60 * 60 * 24)));
    
    result.crossDays = crossDays;

    // 当日调整，不跨天
    if (crossDays === 0) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_SAME_DAY)) {
        result.allowed = true;
      } else {
        result.reason = '没有当日调整权限';
      }
      return result;
    }

    // 次日调整
    if (crossDays === 1) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_NEXT_DAY)) {
        result.allowed = true;
        result.requireApproval = true;
      } else {
        result.reason = '没有次日调整权限';
      }
      return result;
    }

    // 多天跨越调整
    if (crossDays <= 7) {
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_WITHIN_WEEK)) {
        result.allowed = true;
        result.requireApproval = true;
      } else if (this.hasPermission(userRole, PERMISSIONS.ADJUST_CROSS_DAY)) {
        result.allowed = true;
        result.requireApproval = true;
      } else {
        result.reason = '没有跨天调整权限';
      }
      return result;
    }

    // 超过一周的调整，需要特殊权限
    if (this.hasPermission(userRole, PERMISSIONS.EMERGENCY_ADJUSTMENT_OVERRIDE)) {
      result.allowed = true;
      result.requireApproval = true;
    } else {
      result.reason = '跨天调整超出权限范围，需要特殊权限';
    }

    return result;
  }

  /**
   * 检查非工作时间调整权限
   * @param {string} userRole 用户角色
   * @param {Date} adjustTime 调整后的时间
   * @returns {Object} 非工作时间调整权限检查结果
   */
  static checkNonWorkingHoursPermission(userRole, adjustTime) {
    const result = {
      allowed: false,
      requireApproval: false,
      isWorkingHours: true,
      timeSlot: '',
      reason: ''
    };

    const hour = adjustTime.getHours();
    
    // 判断是否为工作时间（8:00-18:00）
    if (hour >= 8 && hour < 18) {
      result.allowed = true;
      result.isWorkingHours = true;
      result.timeSlot = 'working_hours';
      return result;
    }

    result.isWorkingHours = false;

    // 非工作时间分类
    if (hour >= 18 && hour < 22) {
      result.timeSlot = 'evening';
    } else if (hour >= 22 || hour < 6) {
      result.timeSlot = 'night';
    } else if (hour >= 6 && hour < 8) {
      result.timeSlot = 'early_morning';
    }

    // 检查非工作时间调整权限
    if (this.hasPermission(userRole, PERMISSIONS.ADJUST_NON_WORKING_HOURS)) {
      result.allowed = true;
      result.requireApproval = true;
    } else {
      result.reason = '没有非工作时间调整权限';
    }

    return result;
  }

  /**
   * 检查特殊患者调整权限
   * @param {string} userRole 用户角色
   * @param {Object} patientInfo 患者信息
   * @returns {Object} 特殊患者调整权限检查结果
   */
  static checkSpecialPatientPermission(userRole, patientInfo = {}) {
    const result = {
      allowed: false,
      requireApproval: false,
      patientType: 'normal',
      specialRequirements: [],
      reason: ''
    };

    const { isVip, isCritical, priority, specialNeeds } = patientInfo;

    // VIP患者
    if (isVip || priority === 'vip') {
      result.patientType = 'vip';
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_VIP_PATIENTS)) {
        result.allowed = true;
        result.requireApproval = true;
        result.specialRequirements.push('vip_approval');
      } else {
        result.reason = '没有VIP患者调整权限';
        return result;
      }
    }

    // 重症患者
    if (isCritical || priority === 'critical') {
      result.patientType = 'critical';
      if (this.hasPermission(userRole, PERMISSIONS.ADJUST_CRITICAL_APPOINTMENTS)) {
        result.allowed = true;
        result.requireApproval = true;
        result.specialRequirements.push('medical_review');
      } else {
        result.reason = '没有重症患者调整权限';
        return result;
      }
    }

    // 特殊需求患者
    if (specialNeeds && specialNeeds.length > 0) {
      result.specialRequirements.push(...specialNeeds);
      result.requireApproval = true;
    }

    // 普通患者
    if (!result.allowed && result.patientType === 'normal') {
      result.allowed = true;
    }

    return result;
  }

  /**
   * 检查批量调整权限
   * @param {string} userRole 用户角色
   * @param {Array} adjustments 调整列表
   * @returns {Object} 批量调整权限检查结果
   */
  static checkBatchAdjustPermission(userRole, adjustments = []) {
    const result = {
      allowed: false,
      requireApproval: false,
      batchSize: adjustments.length,
      maxBatchSize: 0,
      affectedPatients: 0,
      reason: ''
    };

    // 计算影响的患者数量
    const patientIds = new Set();
    adjustments.forEach(adj => {
      if (adj.patientId) {
        patientIds.add(adj.patientId);
      }
    });
    result.affectedPatients = patientIds.size;

    // 基础批量调整权限
    if (!this.hasPermission(userRole, PERMISSIONS.BATCH_ADJUST_TIME)) {
      result.reason = '没有批量调整权限';
      return result;
    }

    // 根据角色确定最大批量大小
    if (this.hasPermission(userRole, PERMISSIONS.ADJUST_MULTIPLE_PATIENTS)) {
      result.maxBatchSize = 20;  // 高级用户可以批量调整更多
    } else {
      result.maxBatchSize = 5;   // 普通用户限制5个
    }

    // 检查批量大小限制
    if (result.batchSize > result.maxBatchSize) {
      result.reason = `批量调整数量超过限制（最大${result.maxBatchSize}个）`;
      return result;
    }

    // 检查影响患者数量
    if (result.affectedPatients > 10) {
      if (!this.hasPermission(userRole, PERMISSIONS.ADJUST_MULTIPLE_PATIENTS)) {
        result.reason = '影响患者数量过多，需要更高级别权限';
        return result;
      }
      result.requireApproval = true;
    }

    result.allowed = true;
    if (result.batchSize > 3 || result.affectedPatients > 3) {
      result.requireApproval = true;
    }

    return result;
  }

  /**
   * 检查是否有审批权限
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否有审批权限
   */
  static hasApprovalPermission(userRole) {
    return this.hasPermission(userRole, PERMISSIONS.APPROVE_ADJUSTMENT);
  }

  /**
   * 检查是否可以超越调整限制
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否可以超越限制
   */
  static canOverrideAdjustLimit(userRole) {
    return this.hasPermission(userRole, PERMISSIONS.OVERRIDE_ADJUST_LIMIT);
  }

  /**
   * 检查是否可以批量调整
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否可以批量调整
   */
  static canBatchAdjust(userRole) {
    return this.hasPermission(userRole, PERMISSIONS.BATCH_ADJUST_TIME);
  }

  /**
   * 权限守卫 - 检查当前用户权限
   * @param {string} permission 需要的权限
   * @param {function} onSuccess 成功回调
   * @param {function} onFail 失败回调
   */
  static checkPermission(permission, onSuccess, onFail) {
    try {
      const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      const userRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
      
      if (!userInfo || !userRole) {
        // 用户未登录
        if (onFail) {
          onFail('用户未登录');
        } else {
          this.redirectToLogin();
        }
        return;
      }
      
      if (this.hasPermission(userRole, permission)) {
        // 有权限，执行成功回调
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // 无权限，执行失败回调
        if (onFail) {
          onFail('没有操作权限');
        } else {
          wx.showToast({
            title: '没有操作权限',
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      if (onFail) {
        onFail('权限验证失败');
      }
    }
  }

  /**
   * 页面权限守卫
   * @param {string} permission 页面需要的权限
   * @returns {boolean} 是否有权限访问
   */
  static checkPagePermission(permission) {
    try {
      const userRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
      
      if (!userRole) {
        this.redirectToLogin();
        return false;
      }
      
      if (!this.hasPermission(userRole, permission)) {
        wx.showModal({
          title: '访问受限',
          content: '您没有权限访问此页面',
          showCancel: false,
          confirmText: '返回',
          success: () => {
            wx.navigateBack();
          }
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('页面权限检查失败:', error);
      return false;
    }
  }

  /**
   * 跳转到登录页面
   */
  static redirectToLogin() {
    wx.reLaunch({
      url: '/pages/login/login'
    });
  }

  /**
   * 检查特殊权限申请资格
   * @param {string} userRole 用户角色
   * @param {string} requestType 申请类型
   * @param {Object} userInfo 用户信息
   * @returns {Object} 申请资格检查结果
   */
  static checkSpecialPermissionEligibility(userRole, requestType, userInfo = {}) {
    const result = {
      eligible: false,
      reason: '',
      requirements: [],
      estimatedProcessTime: 0
    };

    const { experience = 0, certifications = [], performanceScore = 0 } = userInfo;

    // 检查是否可以申请特殊权限
    if (!this.hasPermission(userRole, PERMISSIONS.REQUEST_SPECIAL_PERMISSION)) {
      result.reason = '当前角色不允许申请特殊权限';
      return result;
    }

    // 根据申请类型检查资格
    switch (requestType) {
      case 'temporary_advanced':
        if (experience >= 6 && performanceScore >= 80) {
          result.eligible = true;
          result.estimatedProcessTime = 24; // 24小时
        } else {
          result.reason = '申请临时高级权限需要至少6个月经验和80分以上绩效';
          result.requirements = ['工作经验 >= 6个月', '绩效评分 >= 80分'];
        }
        break;

      case 'temporary_emergency':
        if (experience >= 12 && (certifications.includes('emergency') || performanceScore >= 90)) {
          result.eligible = true;
          result.estimatedProcessTime = 12; // 12小时
        } else {
          result.reason = '申请临时紧急权限需要至少12个月经验和紧急认证或高绩效';
          result.requirements = ['工作经验 >= 12个月', '紧急认证或绩效评分 >= 90分'];
        }
        break;

      case 'extend_daily_limit':
        if (experience >= 3 && performanceScore >= 70) {
          result.eligible = true;
          result.estimatedProcessTime = 8; // 8小时
        } else {
          result.reason = '申请延长每日限制需要至少3个月经验和70分以上绩效';
          result.requirements = ['工作经验 >= 3个月', '绩效评分 >= 70分'];
        }
        break;

      case 'cross_day_approval':
        if (userRole === CONFIG.USER_ROLES.SENIOR_RECORDER || experience >= 9) {
          result.eligible = true;
          result.estimatedProcessTime = 6; // 6小时
        } else {
          result.reason = '申请跨天调整权限需要高级记录员资格或9个月以上经验';
          result.requirements = ['高级记录员资格或9个月以上经验'];
        }
        break;

      default:
        result.reason = '未知的特殊权限类型';
    }

    return result;
  }

  /**
   * 获取可申请的特殊权限类型
   * @param {string} userRole 用户角色
   * @param {Object} userInfo 用户信息
   * @returns {Array} 可申请的权限类型列表
   */
  static getAvailableSpecialPermissions(userRole, userInfo = {}) {
    const availablePermissions = [];

    const permissionTypes = [
      {
        type: 'temporary_advanced',
        name: '临时高级调整权限',
        description: '获得临时的高级调整权限，有效期24小时',
        benefits: ['可调整跨天时间', '可调整非工作时间', '增加每日调整次数'],
        duration: '24小时'
      },
      {
        type: 'temporary_emergency',
        name: '临时紧急调整权限',
        description: '获得临时的紧急调整权限，有效期12小时',
        benefits: ['可超过72小时调整', '可调整VIP患者', '紧急情况无限制'],
        duration: '12小时'
      },
      {
        type: 'extend_daily_limit',
        name: '延长每日调整限制',
        description: '临时提高今日的调整次数限制',
        benefits: ['今日可额外调整', '应对突发情况'],
        duration: '今日有效'
      },
      {
        type: 'cross_day_approval',
        name: '跨天调整审批权限',
        description: '获得审批跨天调整的权限',
        benefits: ['可审批跨天调整', '加快审批流程'],
        duration: '永久有效'
      }
    ];

    permissionTypes.forEach(permission => {
      const eligibility = this.checkSpecialPermissionEligibility(userRole, permission.type, userInfo);
      if (eligibility.eligible) {
        availablePermissions.push({
          ...permission,
          eligibility
        });
      }
    });

    return availablePermissions;
  }

  /**
   * 检查权限组合
   * @param {string} userRole 用户角色
   * @param {Object} adjustData 调整数据
   * @returns {Object} 权限检查结果
   */
  static checkCombinedPermissions(userRole, adjustData) {
    const result = {
      canAdjust: false,
      requireApproval: false,
      permissions: {},
      restrictions: [],
      recommendations: []
    };

    const { originalTime, newTime, patientInfo, batchItems, adjustType } = adjustData;

    try {
      // 1. 检查基础调整权限
      const basicPermission = this.hasTimeAdjustPermission(userRole, adjustType || 'normal');
      result.permissions.basic = basicPermission;
      
      if (!basicPermission) {
        result.restrictions.push('缺少基础调整权限');
        return result;
      }

      // 2. 检查时间范围权限
      if (originalTime && newTime) {
        const timeDiff = Math.abs(new Date(newTime) - new Date(originalTime)) / (1000 * 60 * 60);
        const timeRangePermission = this.checkTimeRangePermission(userRole, timeDiff);
        result.permissions.timeRange = timeRangePermission;
        
        if (!timeRangePermission.allowed) {
          result.restrictions.push(`调整时间超出权限范围（${timeDiff.toFixed(1)}小时）`);
        }
        
        if (timeRangePermission.requireApproval) {
          result.requireApproval = true;
        }
      }

      // 3. 检查跨天权限
      if (originalTime && newTime) {
        const crossDayPermission = this.checkCrossDayPermission(userRole, new Date(originalTime), new Date(newTime));
        result.permissions.crossDay = crossDayPermission;
        
        if (!crossDayPermission.allowed && crossDayPermission.crossDays > 0) {
          result.restrictions.push(crossDayPermission.reason);
        }
        
        if (crossDayPermission.requireApproval) {
          result.requireApproval = true;
        }
      }

      // 4. 检查非工作时间权限
      if (newTime) {
        const nonWorkingHoursPermission = this.checkNonWorkingHoursPermission(userRole, new Date(newTime));
        result.permissions.nonWorkingHours = nonWorkingHoursPermission;
        
        if (!nonWorkingHoursPermission.allowed && !nonWorkingHoursPermission.isWorkingHours) {
          result.restrictions.push(nonWorkingHoursPermission.reason);
        }
        
        if (nonWorkingHoursPermission.requireApproval) {
          result.requireApproval = true;
        }
      }

      // 5. 检查特殊患者权限
      if (patientInfo) {
        const specialPatientPermission = this.checkSpecialPatientPermission(userRole, patientInfo);
        result.permissions.specialPatient = specialPatientPermission;
        
        if (!specialPatientPermission.allowed && specialPatientPermission.patientType !== 'normal') {
          result.restrictions.push(specialPatientPermission.reason);
        }
        
        if (specialPatientPermission.requireApproval) {
          result.requireApproval = true;
        }
      }

      // 6. 检查批量调整权限
      if (batchItems && batchItems.length > 1) {
        const batchPermission = this.checkBatchAdjustPermission(userRole, batchItems);
        result.permissions.batch = batchPermission;
        
        if (!batchPermission.allowed) {
          result.restrictions.push(batchPermission.reason);
        }
        
        if (batchPermission.requireApproval) {
          result.requireApproval = true;
        }
      }

      // 7. 检查每日调整次数限制
      const dailyLimit = this.getDailyAdjustmentLimit(userRole);
      result.permissions.dailyLimit = dailyLimit;
      
      // 8. 综合判断
      result.canAdjust = result.restrictions.length === 0;
      
      // 9. 生成建议
      if (result.restrictions.length > 0) {
        result.recommendations.push('建议申请相应的特殊权限或联系上级审批');
      }
      
      if (result.requireApproval) {
        result.recommendations.push('此调整需要审批，请耐心等待');
      }

    } catch (error) {
      console.error('权限检查失败:', error);
      result.restrictions.push('权限检查失败，请联系管理员');
    }
    
    return result;
  }

  /**
   * 创建权限装饰器
   * @param {string} permission 需要的权限
   * @returns {function} 装饰器函数
   */
  static requirePermission(permission) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(...args) {
        RolePermissionManager.checkPermission(
          permission,
          () => {
            // 有权限，执行原方法
            originalMethod.apply(this, args);
          },
          (message) => {
            // 无权限，显示提示
            wx.showToast({
              title: message,
              icon: 'none'
            });
          }
        );
      };
      
      return descriptor;
    };
  }

  /**
   * 生成权限报告
   * @param {Object} userInfo 用户信息
   * @returns {Object} 权限报告
   */
  static generatePermissionReport(userInfo) {
    const { role, experience = 0, certifications = [] } = userInfo;
    const allPermissions = this.getRolePermissions(role);
    const dailyLimit = this.getDailyAdjustmentLimit(role);

    return {
      user: {
        role: role,
        experience: experience,
        certifications: certifications
      },
      permissions: {
        basic: {
          canViewSchedule: this.hasPermission(role, PERMISSIONS.VIEW_SCHEDULE),
          canUpdateSchedule: this.hasPermission(role, PERMISSIONS.UPDATE_SCHEDULE),
          canCreateRecord: this.hasPermission(role, PERMISSIONS.CREATE_RECORD)
        },
        timeAdjustment: {
          normal: this.hasPermission(role, PERMISSIONS.ADJUST_TIME_NORMAL),
          advanced: this.hasPermission(role, PERMISSIONS.ADJUST_TIME_ADVANCED),
          emergency: this.hasPermission(role, PERMISSIONS.ADJUST_TIME_EMERGENCY),
          batchAdjust: this.hasPermission(role, PERMISSIONS.BATCH_ADJUST_TIME),
          crossDay: this.hasPermission(role, PERMISSIONS.ADJUST_CROSS_DAY),
          nonWorkingHours: this.hasPermission(role, PERMISSIONS.ADJUST_NON_WORKING_HOURS)
        },
        timeRange: {
          within24h: this.hasPermission(role, PERMISSIONS.ADJUST_WITHIN_24H),
          within72h: this.hasPermission(role, PERMISSIONS.ADJUST_WITHIN_72H),
          beyond72h: this.hasPermission(role, PERMISSIONS.ADJUST_BEYOND_72H)
        },
        dailyLimits: dailyLimit,
        specialPatients: {
          vip: this.hasPermission(role, PERMISSIONS.ADJUST_VIP_PATIENTS),
          critical: this.hasPermission(role, PERMISSIONS.ADJUST_CRITICAL_APPOINTMENTS),
          multiple: this.hasPermission(role, PERMISSIONS.ADJUST_MULTIPLE_PATIENTS)
        },
        approval: {
          canApprove: this.hasPermission(role, PERMISSIONS.APPROVE_ADJUSTMENT),
          canOverrideLimit: this.hasPermission(role, PERMISSIONS.OVERRIDE_ADJUST_LIMIT),
          canApproveSpecial: this.hasPermission(role, PERMISSIONS.APPROVE_SPECIAL_PERMISSION)
        },
        special: {
          canRequestSpecial: this.hasPermission(role, PERMISSIONS.REQUEST_SPECIAL_PERMISSION),
          emergencyOverride: this.hasPermission(role, PERMISSIONS.EMERGENCY_ADJUSTMENT_OVERRIDE)
        }
      },
      recommendations: this.generatePermissionUpgradeRecommendations(userInfo)
    };
  }

  /**
   * 生成权限升级建议
   * @param {Object} userInfo 用户信息
   * @returns {Array} 建议列表
   */
  static generatePermissionUpgradeRecommendations(userInfo) {
    const { role, experience = 0, certifications = [] } = userInfo;
    const recommendations = [];

    // 为普通记录员提供升级建议
    if (role === USER_ROLES.RECORDER) {
      if (experience >= 12) {
        recommendations.push({
          type: 'role_upgrade',
          title: '申请高级记录员资格',
          description: '您的工作经验已满足12个月，可申请升级为高级记录员',
          benefits: ['获得高级调整权限', '可进行批量调整', '调整范围扩大到72小时'],
          priority: 'high'
        });
      }

      if (!certifications.includes('advanced_care')) {
        recommendations.push({
          type: 'certification',
          title: '获取高级护理认证',
          description: '通过高级护理认证可获得更多权限',
          benefits: ['提升专业能力', '增加调整权限', '职业发展机会'],
          priority: 'medium'
        });
      }
    }

    // 为高级记录员提供升级建议
    if (role === USER_ROLES.SENIOR_RECORDER) {
      if (experience >= 24 && certifications.includes('management')) {
        recommendations.push({
          type: 'role_upgrade',
          title: '申请主管职位',
          description: '您具备主管资格，可申请主管职位',
          benefits: ['获得紧急调整权限', '审批权限', '管理团队'],
          priority: 'high'
        });
      }

      if (!certifications.includes('emergency')) {
        recommendations.push({
          type: 'certification',
          title: '获取紧急认证',
          description: '获得紧急情况处理认证，提升专业水平',
          benefits: ['获得紧急调整权限', '应对突发情况', '提升专业声誉'],
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }
}

module.exports = {
  RolePermissionManager,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  USER_ROLES
};