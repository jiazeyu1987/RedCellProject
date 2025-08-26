// pages/login/index.js
const app = getApp();

Page({
  data: {
    phoneNumber: '',
    verifyCode: '',
    agreedToTerms: false,
    canSendCode: false,
    canLogin: false,
    codeButtonText: '发送验证码',
    countdown: 0
  },

  onLoad: function() {
    // 检查是否已经登录
    if (app.globalData.isLoggedIn) {
      this.redirectToHome();
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phoneNumber: phone,
      canSendCode: this.validatePhone(phone) && this.data.countdown === 0,
      canLogin: this.validatePhone(phone) && this.data.verifyCode.length === 6 && this.data.agreedToTerms
    });
  },

  // 验证码输入
  onCodeInput(e) {
    const code = e.detail.value;
    this.setData({
      verifyCode: code,
      canLogin: this.validatePhone(this.data.phoneNumber) && code.length === 6 && this.data.agreedToTerms
    });
  },

  // 验证手机号
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // 发送验证码
  sendVerifyCode() {
    if (!this.data.canSendCode) {
      return;
    }

    if (!this.validatePhone(this.data.phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 模拟发送验证码
    wx.showLoading({
      title: '发送中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });

      // 开始倒计时
      this.startCountdown();
    }, 1000);
  },

  // 开始倒计时
  startCountdown() {
    let countdown = 60;
    this.setData({
      countdown: countdown,
      canSendCode: false,
      codeButtonText: `${countdown}s后重发`
    });

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        this.setData({
          countdown: countdown,
          codeButtonText: `${countdown}s后重发`
        });
      } else {
        clearInterval(timer);
        this.setData({
          countdown: 0,
          canSendCode: this.validatePhone(this.data.phoneNumber),
          codeButtonText: '重新发送'
        });
      }
    }, 1000);
  },

  // 微信授权登录
  onGetUserInfo(e) {
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    if (e.detail.userInfo) {
      app.showLoading('登录中...');
      
      // 模拟登录过程
      setTimeout(() => {
        const userInfo = e.detail.userInfo;
        userInfo.phone = '138****5678'; // 模拟手机号
        
        app.login(userInfo, 'mock_openid_123456');
        app.hideLoading();
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          this.redirectToHome();
        }, 1500);
      }, 2000);
    } else {
      wx.showToast({
        title: '取消授权',
        icon: 'none'
      });
    }
  },

  // 手机号登录
  phoneLogin() {
    if (!this.data.canLogin) {
      return;
    }

    if (!this.validatePhone(this.data.phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    if (this.data.verifyCode.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      });
      return;
    }

    // 模拟验证码验证
    if (this.data.verifyCode !== '123456') {
      wx.showToast({
        title: '验证码错误',
        icon: 'none'
      });
      return;
    }

    app.showLoading('登录中...');

    // 模拟登录过程
    setTimeout(() => {
      const userInfo = {
        nickName: `用户${this.data.phoneNumber.substr(-4)}`,
        avatarUrl: '👤',
        phone: this.data.phoneNumber
      };

      app.login(userInfo, 'mock_openid_' + Date.now());
      app.hideLoading();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        this.redirectToHome();
      }, 1500);
    }, 2000);
  },

  // 同意协议
  toggleAgreement() {
    this.setData({
      agreedToTerms: !this.data.agreedToTerms,
      canLogin: this.validatePhone(this.data.phoneNumber) && this.data.verifyCode.length === 6 && !this.data.agreedToTerms
    });
  },

  // 查看用户协议
  viewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的详细内容...',
      showCancel: false
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的详细内容...',
      showCancel: false
    });
  },

  // 快速体验
  quickExperience() {
    this.redirectToHome();
  },

  // 重定向到首页
  redirectToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  }
});