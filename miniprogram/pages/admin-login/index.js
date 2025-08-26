// 管理员登录页面
Page({
  data: {
    password: '',
    showPassword: false,
    loading: false
  },

  onLoad() {
    // 检查是否已经是管理员登录状态
    const app = getApp();
    if (app.checkAdminLoginExpiry()) {
      this.navigateToUserManagement();
    }
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 验证管理员口令
  verifyAdminPassword() {
    if (!this.data.password) {
      wx.showToast({
        title: '请输入管理员口令',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 模拟验证过程
    setTimeout(() => {
      const app = getApp();
      const isValid = app.verifyAdminPassword(this.data.password);
      
      this.setData({ loading: false });

      if (isValid) {
        // 保存管理员登录状态
        app.setAdminLoginStatus(true);
        
        wx.showToast({
          title: '验证成功',
          icon: 'success',
          complete: () => {
            setTimeout(() => {
              this.navigateToUserManagement();
            }, 1500);
          }
        });
      } else {
        wx.showToast({
          title: '口令错误',
          icon: 'error'
        });
        
        // 清空密码输入
        this.setData({ password: '' });
      }
    }, 1500);
  },



  // 导航到用户管理页面
  navigateToUserManagement() {
    wx.redirectTo({
      url: '/pages/admin-users/index'
    });
  },

  // 返回首页
  goBack() {
    wx.showModal({
      title: '确认退出',
      content: '是否退出管理员登录？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  // 忘记密码（联系超级管理员）
  forgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系超级管理员重置密码\\n\\n联系方式：\\n电话：400-888-8888\\n邮箱：admin@health.com',
      showCancel: false
    });
  },

  // 查看安全提示
  viewSecurityTips() {
    wx.showModal({
      title: '安全提示',
      content: '• 管理员口令具有最高权限\\n• 请妥善保管口令，不要泄露给他人\\n• 定期更换管理员口令\\n• 使用完毕请及时退出管理员模式',
      showCancel: false
    });
  }
});