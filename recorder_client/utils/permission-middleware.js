// 权限检查中间件
const CONFIG = require('../constants/config.js');
const { RolePermissionManager, PERMISSIONS } = require('./role-permission.js');

class PermissionMiddleware {
  /**
   * 页面权限检查混入
   * 在页面的 onLoad 中调用
   * @param {string|Array<string>} permissions 需要的权限
   * @param {object} options 配置选项
   */
  static pagePermissionMixin(permissions, options = {}) {
    return {
      onLoad(pageOptions) {
        // 执行权限检查
        this.checkPagePermissions(permissions, options);
        
        // 如果有原始的 onLoad，则调用它
        if (this._originalOnLoad) {
          this._originalOnLoad.call(this, pageOptions);
        }
      },

      checkPagePermissions(requiredPermissions, config = {}) {
        try {
          // 检查是否刚刚登录成功
          const justLoggedIn = wx.getStorageSync('_justLoggedIn');
          if (justLoggedIn) {
            console.log('刚刚登录成功，跳过权限检查');
            return true;
          }
          
          const userRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
          const token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
          
          // 检查是否已登录
          if (!token || !userRole) {
            console.log('未登录或缺少角色信息，跳过权限检查');
            // 不在这里处理登录跳转，由页面自己处理
            return false;
          }
          
          // 权限检查
          let hasPermission = false;
          
          if (Array.isArray(requiredPermissions)) {
            const operator = config.operator || 'AND';
            hasPermission = RolePermissionManager.hasPermissions(userRole, requiredPermissions, operator);
          } else if (typeof requiredPermissions === 'string') {
            hasPermission = RolePermissionManager.hasPermission(userRole, requiredPermissions);
          } else {
            // 如果没有指定权限，则允许访问
            hasPermission = true;
          }
          
          if (!hasPermission) {
            this.handleNoPermission(config);
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('页面权限检查失败:', error);
          // 遇到错误时也不要阻止页面加载
          return true;
        }
      },

      handleNoLogin(config) {
        const message = config.noLoginMessage || '请先登录';
        
        wx.showModal({
          title: '未登录',
          content: message,
          showCancel: false,
          confirmText: '去登录',
          success: () => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }
        });
      },

      handleNoPermission(config) {
        const message = config.noPermissionMessage || '您没有权限访问此页面';
        const showBack = config.showBack !== false;
        
        wx.showModal({
          title: '访问受限',
          content: message,
          showCancel: false,
          confirmText: showBack ? '返回' : '确定',
          success: () => {
            if (showBack) {
              wx.navigateBack({
                fail: () => {
                  wx.switchTab({
                    url: '/pages/index/index'
                  });
                }
              });
            }
          }
        });
      },

      handlePermissionError(error, config) {
        console.error('权限验证错误:', error);
        const message = config.errorMessage || '权限验证失败，请重试';
        
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      }
    };
  }

  /**
   * 操作权限检查
   * @param {string} permission 需要的权限
   * @param {function} action 要执行的操作
   * @param {object} options 配置选项
   */
  static checkOperationPermission(permission, action, options = {}) {
    try {
      const userRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
      
      if (!userRole) {
        const message = options.noLoginMessage || '请先登录';
        wx.showModal({
          title: '未登录',
          content: message,
          showCancel: false,
          confirmText: '去登录',
          success: () => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }
        });
        return;
      }
      
      if (RolePermissionManager.hasPermission(userRole, permission)) {
        // 有权限，执行操作
        if (typeof action === 'function') {
          action();
        }
      } else {
        // 无权限，显示提示
        const message = options.noPermissionMessage || '您没有此操作权限';
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
        
        // 如果有无权限回调，则执行
        if (options.onNoPermission && typeof options.onNoPermission === 'function') {
          options.onNoPermission();
        }
      }
    } catch (error) {
      console.error('操作权限检查失败:', error);
      
      const message = options.errorMessage || '权限验证失败';
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }
  }

  /**
   * 角色守卫
   * @param {string|Array<string>} allowedRoles 允许的角色
   * @param {function} action 要执行的操作
   * @param {object} options 配置选项
   */
  static checkRole(allowedRoles, action, options = {}) {
    try {
      const userRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
      
      if (!userRole) {
        const message = options.noLoginMessage || '请先登录';
        wx.showToast({
          title: message,
          icon: 'none'
        });
        return;
      }
      
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      
      if (roles.includes(userRole)) {
        // 角色匹配，执行操作
        if (typeof action === 'function') {
          action();
        }
      } else {
        // 角色不匹配
        const message = options.noRoleMessage || '您的角色无权执行此操作';
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('角色检查失败:', error);
    }
  }

  /**
   * 生成页面权限配置
   */
  static createPageConfig(permissions, options = {}) {
    return {
      permissions,
      options: {
        noLoginMessage: options.noLoginMessage,
        noPermissionMessage: options.noPermissionMessage,
        errorMessage: options.errorMessage,
        showBack: options.showBack,
        operator: options.operator || 'AND'
      }
    };
  }
}

// 常用页面权限配置
const PagePermissions = {
  // 首页
  INDEX: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_DASHBOARD),
  
  // 日程管理
  SCHEDULE_LIST: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_SCHEDULE),
  SCHEDULE_DETAIL: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_SCHEDULE),
  
  // 患者管理
  PATIENT_LIST: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_PATIENT),
  PATIENT_DETAIL: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_PATIENT),
  PATIENT_HEALTH: PermissionMiddleware.createPageConfig([
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.VIEW_PATIENT_HEALTH
  ]),
  
  // 服务记录
  RECORD_LIST: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_RECORD),
  RECORD_CREATE: PermissionMiddleware.createPageConfig(PERMISSIONS.CREATE_RECORD),
  RECORD_DETAIL: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_RECORD),
  
  // 付款管理
  PAYMENT_LIST: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_PAYMENT),
  PAYMENT_MANAGE: PermissionMiddleware.createPageConfig(PERMISSIONS.MANAGE_PAYMENT),
  
  // 预约挂号
  APPOINTMENT_LIST: PermissionMiddleware.createPageConfig(PERMISSIONS.VIEW_APPOINTMENT),
  APPOINTMENT_CREATE: PermissionMiddleware.createPageConfig(PERMISSIONS.CREATE_APPOINTMENT),
  
  // 管理员页面
  ADMIN_USERS: PermissionMiddleware.createPageConfig(PERMISSIONS.MANAGE_USERS, {
    noPermissionMessage: '只有管理员可以访问用户管理页面'
  }),
  ADMIN_SETTINGS: PermissionMiddleware.createPageConfig(PERMISSIONS.MANAGE_SETTINGS, {
    noPermissionMessage: '只有管理员可以访问系统设置'
  })
};

module.exports = {
  PermissionMiddleware,
  PagePermissions
};