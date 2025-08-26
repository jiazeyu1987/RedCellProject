// components/auth-guard/index.js
const app = getApp();

Component({
  properties: {
    // 是否需要认证
    requireAuth: {
      type: Boolean,
      value: true
    },
    // 弹窗标题
    title: {
      type: String,
      value: ''
    },
    // 弹窗描述
    description: {
      type: String,
      value: ''
    },
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    // 取消按钮文本
    cancelText: {
      type: String,
      value: '取消'
    },
    // 确认按钮文本
    confirmText: {
      type: String,
      value: '去登录'
    }
  },

  data: {
    isLoggedIn: false,
    showAuthGuard: false
  },

  lifetimes: {
    attached() {
      this.checkLoginStatus();
    }
  },

  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const isLoggedIn = app.globalData.isLoggedIn;
      const showAuthGuard = this.data.requireAuth && !isLoggedIn;
      
      this.setData({
        isLoggedIn: isLoggedIn,
        showAuthGuard: showAuthGuard
      });
    },

    // 取消操作
    onCancel() {
      this.triggerEvent('cancel');
      this.setData({
        showAuthGuard: false
      });
    },

    // 确认操作（去登录）
    onConfirm() {
      this.triggerEvent('confirm');
      wx.navigateTo({
        url: '/pages/login/index'
      });
    },

    // 刷新登录状态
    refresh() {
      this.checkLoginStatus();
    }
  }
});