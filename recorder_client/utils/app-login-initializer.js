// 应用级登录状态初始化工具
const LoginStateManager = require('./login-state-manager.js');
const UserInfoManager = require('./user-info-manager.js');

/**
 * 应用登录状态初始化器
 * 负责应用启动时的登录状态管理
 */
class AppLoginInitializer {
  /**
   * 初始化应用登录状态
   * @param {Object} app 应用实例
   */
  static async initialize(app) {
    try {
      console.log('开始初始化应用登录状态...');
      
      // 1. 初始化登录状态管理器
      LoginStateManager.init();
      
      // 2. 检查并恢复登录状态
      const hasValidLogin = await LoginStateManager.checkAndRestoreLoginState();
      
      if (hasValidLogin) {
        const userData = UserInfoManager.getUserInfo();
        if (userData) {
          // 更新应用全局数据
          app.globalData.userInfo = userData.userInfo;
          console.log('登录状态恢复成功');
          
          // 触发登录成功事件
          this._triggerLoginEvent('restored', userData);
        }
      } else {
        console.log('无有效登录状态');
        
        // 触发登录失效事件
        this._triggerLoginEvent('invalid', null);
      }
      
      // 3. 设置应用级别的登录状态监听
      this._setupAppLoginListeners(app);
      
      console.log('应用登录状态初始化完成');
      return hasValidLogin;
    } catch (error) {
      console.error('应用登录状态初始化失败:', error);
      return false;
    }
  }

  /**
   * 设置应用级登录状态监听
   * @private
   */
  static _setupAppLoginListeners(app) {
    try {
      // 监听应用显示事件
      const originalOnShow = app.onShow;
      app.onShow = function(options) {
        // 应用显示时检查登录状态
        AppLoginInitializer._handleAppShow(options);
        
        // 调用原始的onShow
        if (originalOnShow) {
          originalOnShow.call(this, options);
        }
      };

      // 监听应用隐藏事件
      const originalOnHide = app.onHide;
      app.onHide = function() {
        // 应用隐藏时更新最后活跃时间
        AppLoginInitializer._handleAppHide();
        
        // 调用原始的onHide
        if (originalOnHide) {
          originalOnHide.call(this);
        }
      };
    } catch (error) {
      console.error('设置应用登录监听失败:', error);
    }
  }

  /**
   * 处理应用显示事件
   * @private
   */
  static async _handleAppShow(options) {
    try {
      console.log('应用显示，检查登录状态');
      
      // 检查登录状态是否仍然有效
      const isLoggedIn = UserInfoManager.isLoggedIn();
      
      if (isLoggedIn) {
        // 验证token是否仍然有效
        const token = UserInfoManager.getToken();
        const isValid = await LoginStateManager.validateToken(token);
        
        if (isValid) {
          // 更新最后活跃时间
          UserInfoManager.updateLastActiveTime();
          console.log('登录状态检查通过');
        } else {
          console.log('Token已失效，清除登录状态');
          await LoginStateManager.forceLogout('登录已过期，请重新登录');
          
          // 检查当前页面是否需要登录
          this._checkCurrentPageLoginRequirement();
        }
      }
    } catch (error) {
      console.error('应用显示时登录检查失败:', error);
    }
  }

  /**
   * 处理应用隐藏事件
   * @private
   */
  static _handleAppHide() {
    try {
      const isLoggedIn = UserInfoManager.isLoggedIn();
      
      if (isLoggedIn) {
        // 更新最后活跃时间
        UserInfoManager.updateLastActiveTime();
        console.log('应用隐藏，已更新最后活跃时间');
      }
    } catch (error) {
      console.error('应用隐藏时处理失败:', error);
    }
  }

  /**
   * 检查当前页面是否需要登录
   * @private
   */
  static _checkCurrentPageLoginRequirement() {
    try {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (!currentPage) {
        return;
      }
      
      const currentRoute = currentPage.route;
      
      // 定义不需要登录的页面
      const publicPages = [
        'pages/login/login',
        'pages/register/register',
        'pages/forgot-password/forgot-password',
        'pages/agreement/user-agreement',
        'pages/agreement/privacy-policy'
      ];
      
      // 如果当前页面需要登录，跳转到登录页
      if (!publicPages.includes(currentRoute)) {
        console.log('当前页面需要登录，跳转到登录页');
        LoginStateManager.redirectToLogin();
      }
    } catch (error) {
      console.error('检查当前页面登录要求失败:', error);
    }
  }

  /**
   * 触发登录相关事件
   * @private
   */
  static _triggerLoginEvent(type, data) {
    try {
      // 触发自定义事件（如果支持）
      if (wx.getApp && wx.getApp().triggerLoginEvent) {
        wx.getApp().triggerLoginEvent(type, data);
      }
      
      // 或者使用事件总线
      if (typeof this.loginEventBus === 'function') {
        this.loginEventBus(type, data);
      }
    } catch (error) {
      console.error('触发登录事件失败:', error);
    }
  }

  /**
   * 设置登录事件回调
   */
  static setLoginEventCallback(callback) {
    this.loginEventBus = callback;
  }

  /**
   * 获取当前登录状态摘要
   */
  static getLoginStateSummary() {
    try {
      const loginInfo = LoginStateManager.getLoginStateInfo();
      const userStats = UserInfoManager.getUserStats();
      
      return {
        ...loginInfo,
        stats: userStats,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('获取登录状态摘要失败:', error);
      return {
        isLoggedIn: false,
        hasToken: false,
        userInfo: null,
        error: error.message
      };
    }
  }

  /**
   * 手动同步登录状态
   */
  static async syncLoginState() {
    try {
      await LoginStateManager.syncLoginState();
      console.log('登录状态同步完成');
    } catch (error) {
      console.error('登录状态同步失败:', error);
    }
  }

  /**
   * 预热登录检查（提前进行网络验证）
   */
  static async preWarmLoginCheck() {
    try {
      const isLoggedIn = UserInfoManager.isLoggedIn();
      
      if (isLoggedIn) {
        const token = UserInfoManager.getToken();
        // 异步验证token，不阻塞主流程
        LoginStateManager.validateToken(token).then(isValid => {
          if (!isValid) {
            console.log('预热检查发现token已失效');
            LoginStateManager.forceLogout('登录状态已失效');
          }
        }).catch(error => {
          console.warn('预热检查失败:', error);
        });
      }
    } catch (error) {
      console.error('预热登录检查失败:', error);
    }
  }
}

module.exports = AppLoginInitializer;