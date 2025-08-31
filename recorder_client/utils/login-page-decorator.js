// 登录状态装饰器 - 为页面添加自动登录检查
const LoginStateManager = require('./login-state-manager.js');
const { PERMISSIONS } = require('./role-permission.js');

/**
 * 页面登录装饰器
 * 为页面对象添加自动登录检查功能
 */
class LoginPageDecorator {
  /**
   * 装饰需要登录的页面
   * @param {Object} pageObject 页面对象
   * @param {Object} options 配置选项
   * @param {Array} options.requiredPermissions 需要的权限列表
   * @param {boolean} options.autoRedirect 是否自动重定向到登录页
   * @param {Function} options.onLoginRequired 登录需要时的回调
   * @param {Function} options.onPermissionDenied 权限不足时的回调
   * @returns {Object} 增强后的页面对象
   */
  static withLoginCheck(pageObject, options = {}) {
    const {
      requiredPermissions = [],
      autoRedirect = true,
      onLoginRequired,
      onPermissionDenied
    } = options;

    // 保存原始的生命周期方法
    const originalOnLoad = pageObject.onLoad || function() {};
    const originalOnShow = pageObject.onShow || function() {};
    const originalOnUnload = pageObject.onUnload || function() {};

    // 增强 onLoad 方法
    pageObject.onLoad = async function(options) {
      try {
        // 检查登录状态
        const loginCheckResult = await LoginPageDecorator._performLoginCheck({
          requiredPermissions,
          autoRedirect,
          onLoginRequired,
          onPermissionDenied,
          context: this,
          lifecycle: 'onLoad'
        });

        if (!loginCheckResult.success) {
          return;
        }

        // 调用原始的 onLoad
        originalOnLoad.call(this, options);
      } catch (error) {
        console.error('页面登录检查失败:', error);
        if (autoRedirect) {
          LoginStateManager.redirectToLogin();
        }
      }
    };

    // 增强 onShow 方法
    pageObject.onShow = async function() {
      try {
        // 每次页面显示时检查登录状态
        const loginCheckResult = await LoginPageDecorator._performLoginCheck({
          requiredPermissions,
          autoRedirect: false, // onShow 时不自动重定向，手动处理
          onLoginRequired,
          onPermissionDenied,
          context: this,
          lifecycle: 'onShow'
        });

        if (!loginCheckResult.success) {
          if (autoRedirect) {
            LoginStateManager.redirectToLogin();
          }
          return;
        }

        // 调用原始的 onShow
        originalOnShow.call(this);
      } catch (error) {
        console.error('页面显示时登录检查失败:', error);
      }
    };

    // 增强 onUnload 方法
    pageObject.onUnload = function() {
      try {
        // 调用原始的 onUnload
        originalOnUnload.call(this);
      } catch (error) {
        console.error('页面卸载失败:', error);
      }
    };

    // 添加手动检查登录状态的方法
    pageObject.checkLogin = async function() {
      return await LoginStateManager.checkLoginStatus(autoRedirect);
    };

    // 添加退出登录的方法
    pageObject.logout = async function() {
      await LoginStateManager.logout();
    };

    return pageObject;
  }

  /**
   * 执行登录检查
   * @private
   */
  static async _performLoginCheck({
    requiredPermissions,
    autoRedirect,
    onLoginRequired,
    onPermissionDenied,
    context,
    lifecycle
  }) {
    try {
      // 1. 检查登录状态
      const isLoggedIn = await LoginStateManager.checkLoginStatus(autoRedirect);
      
      if (!isLoggedIn) {
        console.log(`${lifecycle}: 用户未登录`);
        
        if (onLoginRequired) {
          onLoginRequired.call(context);
        }
        
        return { success: false, reason: 'not_logged_in' };
      }

      // 2. 检查权限
      if (requiredPermissions.length > 0) {
        const hasPermission = await LoginStateManager.checkPermissions(requiredPermissions);
        
        if (!hasPermission) {
          console.log(`${lifecycle}: 权限不足`, requiredPermissions);
          
          if (onPermissionDenied) {
            onPermissionDenied.call(context, requiredPermissions);
          } else {
            wx.showToast({
              title: '权限不足',
              icon: 'none'
            });
            
            // 返回上一页或首页
            setTimeout(() => {
              const pages = getCurrentPages();
              if (pages.length > 1) {
                wx.navigateBack();
              } else {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            }, 1500);
          }
          
          return { success: false, reason: 'permission_denied' };
        }
      }

      console.log(`${lifecycle}: 登录和权限检查通过`);
      return { success: true };
    } catch (error) {
      console.error(`${lifecycle}: 登录检查失败`, error);
      return { success: false, reason: 'check_failed', error };
    }
  }

  /**
   * 快速装饰器方法 - 基础登录检查
   */
  static requireLogin(pageObject) {
    return this.withLoginCheck(pageObject, {
      autoRedirect: true
    });
  }

  /**
   * 快速装饰器方法 - 需要特定权限
   */
  static requirePermissions(pageObject, permissions) {
    return this.withLoginCheck(pageObject, {
      requiredPermissions: Array.isArray(permissions) ? permissions : [permissions],
      autoRedirect: true
    });
  }

  /**
   * 快速装饰器方法 - 管理员权限
   */
  static requireAdmin(pageObject) {
    return this.withLoginCheck(pageObject, {
      requiredPermissions: [PERMISSIONS.ADMIN_ACCESS],
      autoRedirect: true
    });
  }

  /**
   * 快速装饰器方法 - 记录员权限
   */
  static requireRecorder(pageObject) {
    return this.withLoginCheck(pageObject, {
      requiredPermissions: [PERMISSIONS.VIEW_DASHBOARD],
      autoRedirect: true
    });
  }
}

/**
 * 登录状态混入对象
 * 可以直接混入到页面对象中
 */
const LoginStateMixin = {
  /**
   * 检查当前登录状态
   */
  async checkLoginStatus() {
    return await LoginStateManager.checkLoginStatus(true);
  },

  /**
   * 获取登录状态信息
   */
  getLoginStateInfo() {
    return LoginStateManager.getLoginStateInfo();
  },

  /**
   * 退出登录
   */
  async logout() {
    try {
      await LoginStateManager.logout();
    } catch (error) {
      console.error('退出登录失败:', error);
      wx.showToast({
        title: '退出失败',
        icon: 'none'
      });
    }
  },

  /**
   * 检查是否有特定权限
   */
  async checkPermission(permission) {
    return await LoginStateManager.checkPermissions([permission]);
  },

  /**
   * 刷新登录状态
   */
  async refreshLoginState() {
    try {
      await LoginStateManager.syncLoginState();
    } catch (error) {
      console.error('刷新登录状态失败:', error);
    }
  }
};

module.exports = {
  LoginPageDecorator,
  LoginStateMixin
};