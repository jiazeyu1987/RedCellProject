// 用户认证工具类
const { API, http } = require('../config/api.js');

class AuthManager {
  constructor() {
    this.token = wx.getStorageSync('token') || null;
    this.userInfo = wx.getStorageSync('userInfo') || null;
  }

  // 获取当前用户信息
  getCurrentUser() {
    return this.userInfo;
  }

  // 获取当前token
  getToken() {
    return this.token;
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!(this.token && this.userInfo);
  }

  // 微信登录
  async wxLogin() {
    try {
      wx.showLoading({ title: '登录中...' });

      // 获取微信登录code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        throw new Error('获取微信登录code失败');
      }

      // 获取用户信息
      const userInfoRes = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        });
      });

      // 发送到服务器进行登录验证
      const result = await http.post(API.USER.LOGIN, {
        code: loginRes.code,
        userInfo: userInfoRes.userInfo,
        encryptedData: userInfoRes.encryptedData,
        iv: userInfoRes.iv
      });

      if (result.success) {
        // 保存用户信息和token
        this.token = result.data.token;
        this.userInfo = result.data.userInfo;

        wx.setStorageSync('token', this.token);
        wx.setStorageSync('userInfo', this.userInfo);

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        return result.data;
      } else {
        throw new Error(result.message || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
      throw error;
    } finally {
      wx.hideLoading();
    }
  }

  // 静默登录（如果有token则验证，没有则提示登录）
  async silentLogin() {
    if (this.token) {
      try {
        // 验证token是否有效
        const result = await http.get(API.USER.PROFILE);
        if (result.success) {
          this.userInfo = result.data;
          wx.setStorageSync('userInfo', this.userInfo);
          return true;
        }
      } catch (error) {
        console.log('token验证失败，需要重新登录');
      }
    }
    return false;
  }

  // 退出登录
  logout() {
    this.token = null;
    this.userInfo = null;

    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');

    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
  }

  // 确保用户已登录，未登录则跳转到登录页面
  async ensureLogin() {
    if (this.isLoggedIn()) {
      const isValid = await this.silentLogin();
      if (isValid) return true;
    }

    // 跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/index'
    });
    return false;
  }
}

// 创建全局实例
const authManager = new AuthManager();

module.exports = authManager;