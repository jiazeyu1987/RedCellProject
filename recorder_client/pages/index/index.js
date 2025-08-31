// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const { userStore, appStore } = require('../../stores/index.js');
const ErrorHandler = require('../../utils/error-handler.js');
const LoginStateManager = require('../../utils/login-state-manager.js');
const { PermissionMiddleware, PagePermissions } = require('../../utils/permission-middleware.js');
const { PERMISSIONS } = require('../../utils/role-permission.js');

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  // 页面生命周期
  onLoad(options) {
    console.log('首页加载', options);
    
    // 检查是否从登录页跳转过来的
    if (options && options.from === 'login') {
      this.setData({ _fromLogin: true });
      console.log('从登录页跳转过来');
    }
    
    // 首先检查登录状态
    this.checkLoginAndInit(options);
  },

  // 检查登录状态并初始化
  async checkLoginAndInit(options) {
    try {
      console.log('首页检查登录状态开始...');
      
      // 检查是否刚刚登录成功
      const justLoggedIn = wx.getStorageSync('_justLoggedIn');
      if (justLoggedIn) {
        // 清除临时标记
        wx.removeStorageSync('_justLoggedIn');
        console.log('刚刚登录成功，直接初始化页面');
        this.initPage();
        return;
      }
      
      // 首先检查本地存储的登录信息
      const userData = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      if (!token || !userData) {
        console.log('本地无登录信息，跳转到登录页');
        setTimeout(() => {
          LoginStateManager.redirectToLogin();
        }, 100);
        return;
      }
      
      console.log('本地登录信息存在，尝试恢复登录状态');
      
      // 检查登录状态，但给一些时间让状态同步
      const isLoggedIn = await this.checkLoginWithRetry();
      
      if (!isLoggedIn) {
        console.log('登录状态验证失败，跳转到登录页');
        setTimeout(() => {
          LoginStateManager.redirectToLogin();
        }, 100);
        return;
      }
      
      console.log('登录状态检查通过，初始化页面');
      
      // 权限检查
      const hasPermission = this.checkPagePermissions(
        PagePermissions.INDEX.permissions,
        PagePermissions.INDEX.options
      );
      
      if (hasPermission) {
        this.initPage();
      } else {
        console.warn('权限检查未通过');
        wx.showToast({
          title: '权限不足',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('页面初始化失败:', error);
      // 发生错误时跳转到登录页
      setTimeout(() => {
        LoginStateManager.redirectToLogin();
      }, 100);
    }
  },

  // 带重试的登录状态检查
  async checkLoginWithRetry(maxRetries = 3, delay = 200) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`第${i + 1}次检查登录状态`);
        
        // 检查登录状态，但不自动跳转
        const isLoggedIn = await LoginStateManager.checkLoginStatus(false);
        
        if (isLoggedIn) {
          console.log('登录状态检查成功');
          return true;
        }
        
        // 如果检查失败，等待一段时间后重试
        if (i < maxRetries - 1) {
          console.log(`登录状态检查失败，${delay}ms后重试`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`第${i + 1}次登录状态检查出错:`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log('所有登录状态检查都失败');
    return false;
  },

  onShow() {
    console.log('首页显示');
    
    // 每次页面显示时检查登录状态
    this.checkLoginOnShow();
  },

  // 页面显示时检查登录状态
  async checkLoginOnShow() {
    try {
      // 检查是否刚刚登录成功
      const justLoggedIn = wx.getStorageSync('_justLoggedIn');
      if (justLoggedIn) {
        // 清除临时标记
        wx.removeStorageSync('_justLoggedIn');
        console.log('刚刚登录成功，跳过登录状态检查');
        return;
      }
      
      // 避免页面就是从登录页跳转过来的情况下重复检查
      if (this.data._fromLogin) {
        this.setData({ _fromLogin: false });
        console.log('从登录页跳转过来，跳过登录状态检查');
        return;
      }
      
      // 简单检查本地存储
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (!token || !userInfo) {
        console.log('本地无登录信息，跳转到登录页');
        LoginStateManager.redirectToLogin();
        return;
      }
      
      // 设置当前页面
      ErrorHandler.safeStateUpdate(appStore, {
        currentPage: 'index'
      }, '设置当前页面');
      
      console.log('页面显示时登录状态检查通过');
    } catch (error) {
      console.error('页面显示检查失败:', error);
    }
  },

  onHide() {
    console.log('首页隐藏');
  },

  onUnload() {
    console.log('首页卸载');
    // 清理订阅
    this.cleanup();
  },

  // 初始化页面
  initPage() {
    try {
      // 订阅用户状态变化
      this.userUnsubscribe = ErrorHandler.safeSubscribe(userStore, (userState) => {
        try {
          console.log('用户状态变化:', userState);
          if (userState && userState.userInfo) {
            this.setData({
              userInfo: userState.userInfo,
              hasUserInfo: true
            });
          }
        } catch (error) {
          console.error('处理用户状态变化错误:', error);
        }
      }, '首页用户状态订阅');
    } catch (error) {
      console.error('初始化页面错误:', error);
    }
  },

  // 清理资源
  cleanup() {
    // 取消订阅
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
      this.userUnsubscribe = null;
    }
  },

  // 混入权限检查方法
  ...PermissionMiddleware.pagePermissionMixin(PERMISSIONS.VIEW_DASHBOARD),

  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        
        // 更新用户状态
        ErrorHandler.safeStateUpdate(userStore, {
          userInfo: res.userInfo
        }, '获取用户信息');
      }
    })
  }
})
