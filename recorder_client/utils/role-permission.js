// 角色权限管理工具
const CONFIG = require('../constants/config.js');

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
  
  // 管理员权限
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  MANAGE_SETTINGS: 'manage_settings'
};

// 角色权限映射
const ROLE_PERMISSIONS = {
  [CONFIG.USER_ROLES.RECORDER]: [
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
    PERMISSIONS.VIEW_MEDICAL_ADVICE
  ],
  
  [CONFIG.USER_ROLES.ADMIN]: [
    // 管理员拥有所有权限
    ...Object.values(PERMISSIONS)
  ]
};

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
    return userRole === CONFIG.USER_ROLES.ADMIN;
  }

  /**
   * 检查是否为记录员
   * @param {string} userRole 用户角色
   * @returns {boolean} 是否为记录员
   */
  static isRecorder(userRole) {
    return userRole === CONFIG.USER_ROLES.RECORDER;
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
}

module.exports = {
  RolePermissionManager,
  PERMISSIONS,
  ROLE_PERMISSIONS
};