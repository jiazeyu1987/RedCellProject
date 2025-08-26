// 用户详情页面
Page({
  data: {
    userId: null,
    user: null,
    serviceHistory: [],
    addressHistory: [],
    loading: true,
    currentTab: 'basic',
    tabs: [
      { id: 'basic', name: '基本信息', icon: '👤' },
      { id: 'address', name: '地址信息', icon: '🏠' },
      { id: 'service', name: '服务记录', icon: '🏥' },
      { id: 'health', name: '健康档案', icon: '❤️' }
    ]
  },

  onLoad(options) {
    this.checkAdminPermission();
    
    if (options.userId) {
      this.setData({ userId: options.userId });
      this.loadUserDetail();
    }
  },

  // 检查管理员权限
  checkAdminPermission() {
    const app = getApp();
    if (!app.checkAdminLoginExpiry()) {
      wx.showModal({
        title: '权限验证失败',
        content: '管理员登录已过期，请重新登录',
        showCancel: false,
        success: () => {
          app.setAdminLoginStatus(false);
          wx.redirectTo({
            url: '/pages/admin-login/index'
          });
        }
      });
      return false;
    }
    return true;
  },

  // 加载用户详情
  loadUserDetail() {
    this.setData({ loading: true });

    const app = getApp();
    const user = app.getUserById(this.data.userId);
    
    if (!user) {
      wx.showModal({
        title: '用户不存在',
        content: '未找到指定的用户信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    const serviceHistory = app.getUserServiceHistory(this.data.userId);
    const addressHistory = app.getUserAddressHistory(this.data.userId);

    setTimeout(() => {
      this.setData({
        user: user,
        serviceHistory: serviceHistory,
        addressHistory: addressHistory,
        loading: false
      });
    }, 500);
  },

  // 切换标签页
  switchTab(e) {
    const tabId = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tabId });
  },

  // 拨打用户电话
  callUser() {
    if (this.data.user && this.data.user.phone) {
      const phoneNumber = this.data.user.phone.replace(/\*/g, '8'); // 仅用于演示
      wx.makePhoneCall({
        phoneNumber: phoneNumber
      });
    }
  },

  // 发送短信
  sendSMS() {
    wx.showModal({
      title: '发送短信',
      content: '确定要向该用户发送短信吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '短信发送成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 查看完整手机号
  viewFullPhone() {
    const app = getApp();
    if (!app.checkAdminPermission('viewSensitiveInfo')) {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '完整手机号',
      content: `用户手机号：${this.data.user.fullPhone}\n\n注意：仅限管理员查看，请勿泄露`,
      showCancel: false
    });
  },

  // 查看完整身份证
  viewFullIdCard() {
    const app = getApp();
    if (!app.checkAdminPermission('viewSensitiveInfo')) {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '身份证信息',
      content: `身份证号：${this.data.user.fullIdCard}\n\n⚠️ 敏感信息，请严格保密`,
      showCancel: false
    });
  },

  // 查看完整邮箱
  viewFullEmail() {
    const app = getApp();
    if (!app.checkAdminPermission('viewSensitiveInfo')) {
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '邮箱地址',
      content: `邮箱：${this.data.user.fullEmail}`,
      showCancel: false
    });
  },

  // 查看服务详情
  viewServiceDetail(e) {
    const service = e.currentTarget.dataset.service;
    let content = `服务类型：${service.serviceName}\\n`;
    content += `服务时间：${service.serviceTime}\\n`;
    content += `服务时长：${service.duration}分钟\\n`;
    content += `服务人员：${service.nurse}\\n`;
    content += `服务费用：¥${service.cost}\\n`;
    content += `服务地址：${service.address}\\n`;
    content += `用户评价：${service.rating}星\\n`;
    content += `用户反馈：${service.feedback}`;

    wx.showModal({
      title: '服务详情',
      content: content,
      showCancel: false
    });
  },

  // 导航到地址
  navigateToAddress(e) {
    const address = e.currentTarget.dataset.address;
    wx.showModal({
      title: '导航到地址',
      content: `是否使用地图导航到：${address.address}`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '正在打开地图...',
            icon: 'loading'
          });
        }
      }
    });
  },

  // 冻结用户
  freezeUser() {
    wx.showModal({
      title: '冻结用户',
      content: '确定要冻结这个用户吗？冻结后用户将无法使用服务。',
      confirmText: '确认冻结',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '用户已冻结',
            icon: 'success'
          });
        }
      }
    });
  },

  // 导出用户数据
  exportUserData() {
    wx.showModal({
      title: '导出用户数据',
      content: '确定要导出该用户的完整数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '导出中...'
          });
          
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '导出成功',
              icon: 'success'
            });
          }, 2000);
        }
      }
    });
  },

  // 返回用户列表
  goBack() {
    wx.navigateBack();
  }
});