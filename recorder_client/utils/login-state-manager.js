// 登录状态管理器 - 实现登录状态持久化
const CONFIG = require('../constants/config.js');
const UserInfoManager = require('./user-info-manager.js');
const { AuthAPI } = require('../api/index.js');
const { userStore, appStore } = require('../stores/index.js');
const ErrorHandler = require('./error-handler.js');

class LoginStateManager {
  /**
   * 初始化登录状态管理器
   */
  static init() {
    this.initHeartbeat();
    this.initStateSync();
    console.log('登录状态管理器初始化完成');
  }

  /**
   * 检查并恢复登录状态（应用启动时调用）
   * @returns {boolean} 是否有有效的登录状态
   */
  static async checkAndRestoreLoginState() {
    try {
      console.log('检查登录状态...');
      
      // 1. 检查本地是否有登录信息
      const userData = UserInfoManager.getUserInfo();
      if (!userData || !userData.token) {
        console.log('本地无登录信息');
        return false;
      }

      // 2. 验证token是否有效
      const isTokenValid = await this.validateToken(userData.token);
      if (!isTokenValid) {
        console.log('Token已失效，清除本地数据');
        await this.forceLogout('Token已过期');
        return false;
      }

      // 3. 恢复用户状态
      try {
        userStore.setState({
          userInfo: userData.userInfo,
          token: userData.token,
          role: userData.role,
          isLoggedIn: true
        });
        
        // 更新最后活跃时间
        UserInfoManager.updateLastActiveTime();
        
        console.log('登录状态恢复成功');
        return true;
      } catch (error) {
        console.error('恢复登录状态失败:', error);
        await this.forceLogout('状态恢复失败');
        return false;
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  /**
   * 验证Token是否有效
   * @param {string} token 用户token
   * @returns {boolean} token是否有效
   */
  static async validateToken(token) {
    try {
      if (!token) {
        return false;
      }

      // 1. 客户端基础验证
      const isBasicValid = await UserInfoManager.validateToken();
      if (!isBasicValid) {
        console.log('Token 基础验证失败');
        return false;
      }

      // 2. 检查用户信息是否存在
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        console.log('用户信息不存在');
        return false;
      }

      // 3. 服务端验证（如果可用）
      try {
        const result = await AuthAPI.validateToken(token);
        const isServerValid = result.success || result.valid;
        console.log('服务端 token 验证结果:', isServerValid);
        return isServerValid;
      } catch (error) {
        // 如果 API 调用失败，使用客户端验证结果
        console.warn('服务端 token 验证失败，使用客户端验证:', error.message);
        
        // 如果是网络错误，则保持登录状态
        if (error.code === -1 || error.message.includes('网络')) {
          console.log('网络错误，保持客户端登录状态');
          return isBasicValid;
        }
        
        return isBasicValid;
      }
    } catch (error) {
      console.error('Token 验证失败:', error);
      return false;
    }
  }

  /**
   * 检查登录状态（用于页面权限控制）
   * @param {boolean} redirectToLogin 是否自动跳转到登录页
   * @returns {boolean} 是否已登录
   */
  static async checkLoginStatus(redirectToLogin = true) {
    try {
      const isLoggedIn = UserInfoManager.isLoggedIn();
      
      if (!isLoggedIn) {
        if (redirectToLogin) {
          this.redirectToLogin();
        }
        return false;
      }

      // 验证token是否仍然有效
      const token = UserInfoManager.getToken();
      const isValid = await this.validateToken(token);
      
      if (!isValid) {
        await this.forceLogout('登录已失效');
        if (redirectToLogin) {
          this.redirectToLogin();
        }
        return false;
      }

      // 更新最后活跃时间
      UserInfoManager.updateLastActiveTime();
      return true;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      if (redirectToLogin) {
        this.redirectToLogin();
      }
      return false;
    }
  }

  /**
   * 强制退出登录
   * @param {string} reason 退出原因
   */
  static async forceLogout(reason = '登录已失效') {
    try {
      console.log('强制退出登录:', reason);
      
      // 1. 清除本地存储
      UserInfoManager.clearUserInfo();
      
      // 2. 清除全局状态
      try {
        userStore.setState({
          userInfo: null,
          token: '',
          role: '',
          isLoggedIn: false
        });
      } catch (error) {
        console.error('清除用户状态失败:', error);
      }

      // 3. 显示退出提示
      wx.showToast({
        title: reason,
        icon: 'none',
        duration: 2000
      });

      // 4. 清理心跳检测
      this.stopHeartbeat();

      console.log('强制退出完成');
    } catch (error) {
      console.error('强制退出失败:', error);
    }
  }

  /**
   * 主动退出登录
   */
  static async logout() {
    try {
      const token = UserInfoManager.getToken();
      
      // 1. 调用后端登出接口
      if (token) {
        try {
          await AuthAPI.logout(token);
        } catch (error) {
          console.warn('服务端登出失败:', error.message);
        }
      }

      // 2. 清除本地数据
      await this.forceLogout('已退出登录');

      // 3. 跳转到登录页
      this.redirectToLogin();
      
      console.log('用户主动退出完成');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  }

  /**
   * 跳转到登录页
   */
  static redirectToLogin() {
    try {
      // 获取当前页面栈
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage ? currentPage.route : '';

      // 如果当前已经是登录页，不重复跳转
      if (currentRoute === 'pages/login/login') {
        return;
      }

      // 跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
        fail: (error) => {
          console.error('跳转登录页失败:', error);
          // 备用方案：使用navigateTo
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
    } catch (error) {
      console.error('跳转登录页失败:', error);
    }
  }

  /**
   * 初始化心跳检测（定期验证登录状态）
   */
  static initHeartbeat() {
    // 停止之前的心跳
    this.stopHeartbeat();
    
    // 每5分钟检查一次登录状态
    this.heartbeatTimer = setInterval(async () => {
      try {
        const isLoggedIn = UserInfoManager.isLoggedIn();
        if (isLoggedIn) {
          const token = UserInfoManager.getToken();
          const isValid = await this.validateToken(token);
          
          if (!isValid) {
            console.log('心跳检测发现token已失效');
            await this.forceLogout('登录已过期');
            this.redirectToLogin();
          } else {
            // 更新最后活跃时间
            UserInfoManager.updateLastActiveTime();
            console.log('心跳检测：登录状态正常');
          }
        }
      } catch (error) {
        console.error('心跳检测失败:', error);
      }
    }, 5 * 60 * 1000); // 5分钟

    console.log('心跳检测已启动');
  }

  /**
   * 停止心跳检测
   */
  static stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('心跳检测已停止');
    }
  }

  /**
   * 初始化状态同步（监听存储变化）
   */
  static initStateSync() {
    try {
      // 监听存储变化事件（如果支持）
      if (wx.onStorageChange) {
        wx.onStorageChange((res) => {
          if (res.key === CONFIG.STORAGE_KEYS.TOKEN || 
              res.key === CONFIG.STORAGE_KEYS.USER_INFO) {
            console.log('检测到登录状态变化');
            this.syncLoginState();
          }
        });
      }

      // 监听页面显示事件
      const originalOnShow = getCurrentPages()[0]?.onShow;
      if (originalOnShow) {
        // 在页面显示时检查登录状态
        const self = this;
        wx.onAppShow(() => {
          setTimeout(() => {
            self.syncLoginState();
          }, 100);
        });
      }
    } catch (error) {
      console.error('初始化状态同步失败:', error);
    }
  }

  /**
   * 同步登录状态
   */
  static async syncLoginState() {
    try {
      const userData = UserInfoManager.getUserInfo();
      const currentState = userStore.getState();

      // 如果本地有数据但状态中没有，恢复状态
      if (userData && !currentState.isLoggedIn) {
        const isValid = await this.validateToken(userData.token);
        if (isValid) {
          userStore.setState({
            userInfo: userData.userInfo,
            token: userData.token,
            role: userData.role,
            isLoggedIn: true
          });
          console.log('登录状态已同步');
        } else {
          await this.forceLogout('登录状态同步失败');
        }
      }
      // 如果本地没有数据但状态中有，清除状态
      else if (!userData && currentState.isLoggedIn) {
        await this.forceLogout('登录数据丢失');
      }
    } catch (error) {
      console.error('同步登录状态失败:', error);
    }
  }

  /**
   * 刷新Token（如果支持）
   * @param {string} refreshToken 刷新token
   * @returns {boolean} 是否刷新成功
   */
  static async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        return false;
      }

      const result = await AuthAPI.refreshToken(refreshToken);
      
      if (result.success && result.token) {
        // 更新本地存储的token
        const currentUserInfo = UserInfoManager.getUserInfo();
        if (currentUserInfo) {
          await UserInfoManager.saveUserInfo(
            currentUserInfo.userInfo,
            result.token,
            currentUserInfo.role
          );
          
          // 更新状态
          userStore.setState({
            ...userStore.getState(),
            token: result.token
          });
          
          console.log('Token刷新成功');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Token刷新失败:', error);
      return false;
    }
  }

  /**
   * 获取登录状态信息
   * @returns {object} 登录状态信息
   */
  static getLoginStateInfo() {
    try {
      const userData = UserInfoManager.getUserInfo();
      const userStats = UserInfoManager.getUserStats();
      
      return {
        isLoggedIn: UserInfoManager.isLoggedIn(),
        hasToken: !!UserInfoManager.getToken(),
        userInfo: userData?.userInfo || null,
        role: userData?.role || '',
        loginTime: userStats?.loginTime || null,
        lastActiveTime: userStats?.lastActiveTime || null,
        heartbeatActive: !!this.heartbeatTimer
      };
    } catch (error) {
      console.error('获取登录状态信息失败:', error);
      return {
        isLoggedIn: false,
        hasToken: false,
        userInfo: null,
        role: '',
        loginTime: null,
        lastActiveTime: null,
        heartbeatActive: false
      };
    }
  }

  /**
   * 页面权限检查装饰器
   * @param {Function} pageObject 页面对象
   * @param {Array} requiredPermissions 需要的权限
   * @returns {Function} 增强后的页面对象
   */
  static withLoginCheck(pageObject, requiredPermissions = []) {
    const originalOnLoad = pageObject.onLoad || function() {};
    const originalOnShow = pageObject.onShow || function() {};

    pageObject.onLoad = async function(options) {
      // 检查登录状态
      const isLoggedIn = await LoginStateManager.checkLoginStatus(true);
      if (!isLoggedIn) {
        return;
      }

      // 如果指定了权限要求，进行权限检查
      if (requiredPermissions.length > 0) {
        const hasPermission = await LoginStateManager.checkPermissions(requiredPermissions);
        if (!hasPermission) {
          wx.showToast({
            title: '权限不足',
            icon: 'none'
          });
          wx.navigateBack();
          return;
        }
      }

      // 调用原始的onLoad
      originalOnLoad.call(this, options);
    };

    pageObject.onShow = async function() {
      // 页面显示时再次检查登录状态
      const isLoggedIn = await LoginStateManager.checkLoginStatus(false);
      if (!isLoggedIn) {
        LoginStateManager.redirectToLogin();
        return;
      }

      // 调用原始的onShow
      originalOnShow.call(this);
    };

    return pageObject;
  }

  /**
   * 检查用户权限
   * @param {Array} requiredPermissions 需要的权限
   * @returns {boolean} 是否有权限
   */
  static async checkPermissions(requiredPermissions) {
    try {
      const { RolePermissionManager } = require('./role-permission.js');
      const userRole = UserInfoManager.getUserRole();
      
      return requiredPermissions.every(permission => 
        RolePermissionManager.hasPermission(userRole, permission)
      );
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }
}

module.exports = LoginStateManager;