// app.js - 记录员小程序主入口
const CONFIG = require('./constants/config.js');
const StorageService = require('./utils/storage.js');
const ErrorHandler = require('./utils/error-handler.js');
const UserInfoManager = require('./utils/user-info-manager.js');
const LoginStateManager = require('./utils/login-state-manager.js');
const AppLoginInitializer = require('./utils/app-login-initializer.js');
const { userStore, appStore } = require('./stores/index.js');

App({
  // 全局数据
  globalData: {
    userInfo: null,
    systemInfo: null,
    version: CONFIG.APP_VERSION
  },

  // 存储订阅取消函数
  subscriptions: [],

  // 应用启动
  onLaunch(options) {
    console.log('记录员小程序启动', options);
    
    // 检查环境
    ErrorHandler.checkEnvironment();
    
    // 初始化应用
    this.initApp();
  },

  // 应用显示
  onShow(options) {
    console.log('记录员小程序显示', options);
    
    // 检查网络状态
    this.checkNetworkStatus();
    
    // 检查版本更新
    this.checkUpdate();
  },

  // 应用隐藏
  onHide() {
    console.log('记录员小程序隐藏');
  },

  // 应用销毁
  onUnload() {
    console.log('记录员小程序销毁');
    this.cleanup();
  },

  // 应用出错
  onError(error) {
    console.error('记录员小程序错误:', error);
    
    // 使用错误处理工具
    const result = ErrorHandler.handleError(error, 'App');
    
    if (!result.handled) {
      // 错误上报
      this.reportError(error);
    }
  },

  // 页面不存在
  onPageNotFound(res) {
    console.warn('页面不存在:', res);
    
    // 重定向到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  /**
   * 初始化应用
   */
  async initApp() {
    try {
      // 获取系统信息
      await this.getSystemInfo();
      
      // 初始化用户状态
      await this.initUserState();
      
      // 设置网络状态监听
      this.setNetworkListener();
      
      console.log('应用初始化完成');
    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  },

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return new Promise((resolve) => {
      wx.getSystemInfo({
        success: (res) => {
          this.globalData.systemInfo = res;
          console.log('系统信息:', res);
          resolve(res);
        },
        fail: (error) => {
          console.error('获取系统信息失败:', error);
          resolve(null);
        }
      });
    });
  },

  /**
   * 初始化用户状态
   */
  async initUserState() {
    try {
      // 使用应用级登录初始化器
      const hasValidLogin = await AppLoginInitializer.initialize(this);
      
      if (hasValidLogin) {
        console.log('用户状态初始化成功');
      } else {
        console.log('无有效登录状态');
      }
      
      // 设置登录事件回调
      AppLoginInitializer.setLoginEventCallback(this.onLoginStateChange.bind(this));
      
    } catch (error) {
      console.error('初始化用户状态失败:', error);
    }
  },

  /**
   * 检查网络状态
   */
  checkNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        ErrorHandler.safeStateUpdate(appStore, {
          networkStatus: networkType === 'none' ? 'offline' : 'online'
        }, '检查网络状态');
        
        if (networkType === 'none') {
          wx.showToast({
            title: '网络连接异常',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 设置网络状态监听
   */
  setNetworkListener() {
    // 监听网络状态变化
    const networkChangeHandler = (res) => {
      try {
        ErrorHandler.safeStateUpdate(appStore, {
          networkStatus: res.isConnected ? 'online' : 'offline'
        }, '网络状态变化');
        
        if (!res.isConnected) {
          wx.showToast({
            title: '网络连接已断开',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('网络状态更新错误:', error);
      }
    };
    
    wx.onNetworkStatusChange(networkChangeHandler);
    
    // 保存取消监听的方法
    this.networkChangeHandler = networkChangeHandler;
  },

  /**
   * 检查版本更新
   */
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        console.error('版本更新失败');
      });
    }
  },

  /**
   * 处理 webview 错误
   */
  handleWebviewError() {
    try {
      // 清理所有状态存储的监听器
      if (userStore && typeof userStore.clearState === 'function') {
        // 不清理状态，只清理监听器
        console.log('清理 userStore 监听器');
      }
      
      if (appStore && typeof appStore.clearState === 'function') {
        console.log('清理 appStore 监听器');
      }
      
      // 尝试重新初始化应用
      setTimeout(() => {
        this.initApp();
      }, 100);
    } catch (error) {
      console.error('处理 webview 错误失败:', error);
    }
  },

  /**
   * 错误上报
   */
  reportError(error) {
    // 可以在这里上报错误到服务器
    console.error('错误上报:', error);
  },

  /**
   * 清理资源
   */
  cleanup() {
    // 取消所有订阅
    this.subscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.error('取消订阅错误:', error);
        }
      }
    });
    this.subscriptions = [];
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return this.globalData.userInfo;
  },

  /**
   * 设置用户信息
   */
  async setUserInfo(userInfo, token, role) {
    this.globalData.userInfo = userInfo;
    const saveSuccess = await UserInfoManager.saveUserInfo(userInfo, token, role);
    
    if (saveSuccess) {
      // 启动心跳检测
      LoginStateManager.initHeartbeat();
    }
    
    return saveSuccess;
  },

  /**
   * 更新用户信息
   */
  updateUserInfo(updates) {
    try {
      const updatedInfo = UserInfoManager.updateUserInfo(updates);
      this.globalData.userInfo = updatedInfo;
      return updatedInfo;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  },

  /**
   * 清除用户信息
   */
  async clearUserInfo() {
    this.globalData.userInfo = null;
    await LoginStateManager.forceLogout('用户主动退出');
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus(redirectToLogin = true) {
    return await LoginStateManager.checkLoginStatus(redirectToLogin);
  },

  /**
   * 登录状态变化回调
   */
  onLoginStateChange(type, data) {
    try {
      console.log('登录状态变化:', type, data);
      
      switch (type) {
        case 'restored':
          // 登录状态恢复
          this.globalData.userInfo = data.userInfo;
          break;
        case 'invalid':
          // 登录状态失效
          this.globalData.userInfo = null;
          break;
        case 'logout':
          // 用户退出
          this.globalData.userInfo = null;
          break;
      }
    } catch (error) {
      console.error('处理登录状态变化失败:', error);
    }
  },

  /**
   * 触发登录事件
   */
  triggerLoginEvent(type, data) {
    this.onLoginStateChange(type, data);
  },

  /**
   * 获取登录状态信息
   */
  getLoginStateInfo() {
    return AppLoginInitializer.getLoginStateSummary();
  },

  /**
   * 同步登录状态
   */
  async syncLoginState() {
    await AppLoginInitializer.syncLoginState();
  },

  /**
   * 预热登录检查
   */
  preWarmLoginCheck() {
    AppLoginInitializer.preWarmLoginCheck();
  }
});
