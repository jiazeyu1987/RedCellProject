// pages/profile/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    memberLevel: '普通会员',
    serviceCount: 0,
    recordCount: 0,
    postCount: 0,
    adminClickCount: 0 // 管理员入口点击计数
  },

  onLoad: function() {
    this.loadUserInfo();
  },

  onShow: function() {
    this.loadUserInfo();
    this.loadUserStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    this.setData({
      userInfo: userInfo
    });
  },

  // 加载用户统计数据
  loadUserStats() {
    if (!app.globalData.isLoggedIn) {
      return;
    }
    
    // 模拟从后台获取用户统计数据
    const mockStats = {
      serviceCount: 8,
      recordCount: 23,
      postCount: 5
    };
    
    this.setData({
      serviceCount: mockStats.serviceCount,
      recordCount: mockStats.recordCount,
      postCount: mockStats.postCount
    });
  },

  // 编辑个人资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/index'
    });
  },

  // 查看服务历史
  viewServiceHistory() {
    if (!this.checkLogin()) return;
    wx.navigateTo({
      url: '/pages/service-record/index'
    });
  },

  // 查看健康记录
  viewHealthRecords() {
    if (!this.checkLogin()) return;
    wx.switchTab({
      url: '/pages/health/index'
    });
  },

  // 查看社区动态
  viewCommunityPosts() {
    if (!this.checkLogin()) return;
    wx.switchTab({
      url: '/pages/community/index'
    });
  },

  // 通用导航
  navigateTo(e) {
    if (!this.checkLogin()) return;
    
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({
        url: url,
        fail: () => {
          wx.showToast({
            title: '页面开发中',
            icon: 'none'
          });
        }
      });
    }
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-123-4567\n服务时间：9:00-18:00',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4001234567'
          });
        }
      }
    });
  },

  // 去登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({
            userInfo: null,
            serviceCount: 0,
            recordCount: 0,
            postCount: 0
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 检查登录状态
  checkLogin() {
    if (!app.globalData.isLoggedIn) {
      this.goToLogin();
      return false;
    }
    return true;
  },

  // 管理员入口（隐藏）- 连续点击版本号区域5次
  onVersionTap() {
    this.setData({
      adminClickCount: this.data.adminClickCount + 1
    });
    
    if (this.data.adminClickCount >= 5) {
      wx.showModal({
        title: '管理员入口',
        content: '您即将进入管理员模式，是否继续？',
        success: (res) => {
          if (res.confirm) {
            this.goToAdminLogin();
          }
          // 重置计数器
          this.setData({ adminClickCount: 0 });
        }
      });
    }
    
    // 3秒后重置计数器
    setTimeout(() => {
      this.setData({ adminClickCount: 0 });
    }, 3000);
  },

  // 跳转到管理员登录页面
  goToAdminLogin() {
    wx.navigateTo({
      url: '/pages/admin-login/index'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserInfo();
    this.loadUserStats();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '健康守护 - 专业上门医疗服务',
      path: '/pages/home/index'
    };
  }
});