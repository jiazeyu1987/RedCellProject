// pages/bind-phone/bind-phone.js
const { AuthAPI } = require('../../api/index.js');
const CONFIG = require('../../constants/config.js');

Page({
  data: {
    phone: '',
    smsCode: '',
    phoneError: '',
    smsCodeError: '',
    canBind: false,
    isLoading: false,
    // 短信验证码相关
    smsCountdown: 0,
    sendingSms: false,
    canSendSms: false,
    isFirstSend: true
  },

  onLoad(options) {
    // 检查是否是从微信登录跳转过来的
    if (!wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN)) {
      // 没有token，返回登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone: phone,
      phoneError: ''
    });
    this.checkCanBind();
    this.updateSmsButtonState();
  },

  // 手机号获得焦点
  onPhoneFocus() {
    this.setData({
      phoneError: ''
    });
  },

  // 手机号失去焦点
  onPhoneBlur() {
    this.validatePhone();
    this.updateSmsButtonState();
  },

  // 清空手机号
  clearPhone() {
    this.setData({
      phone: '',
      phoneError: ''
    });
    this.checkCanBind();
    this.updateSmsButtonState();
  },

  // 验证码输入
  onSmsCodeInput(e) {
    const smsCode = e.detail.value;
    this.setData({
      smsCode: smsCode,
      smsCodeError: ''
    });
    this.checkCanBind();
  },

  // 验证码获得焦点
  onSmsCodeFocus() {
    this.setData({
      smsCodeError: ''
    });
  },

  // 验证码失去焦点
  onSmsCodeBlur() {
    this.validateSmsCode();
  },

  // 验证手机号
  validatePhone() {
    const { phone } = this.data;
    const phonePattern = /^1[3-9]\d{9}$/;
    
    if (!phone) {
      this.setData({ phoneError: '请输入手机号' });
      return false;
    }
    
    if (!phonePattern.test(phone)) {
      this.setData({ phoneError: '请输入正确的手机号格式' });
      return false;
    }
    
    this.setData({ phoneError: '' });
    return true;
  },

  // 验证验证码
  validateSmsCode() {
    const { smsCode } = this.data;
    
    if (!smsCode) {
      this.setData({ smsCodeError: '请输入验证码' });
      return false;
    }
    
    if (smsCode.length !== 6) {
      this.setData({ smsCodeError: '验证码为6位数字' });
      return false;
    }
    
    this.setData({ smsCodeError: '' });
    return true;
  },

  // 检查是否可以绑定
  checkCanBind() {
    const { phone, smsCode } = this.data;
    const phonePattern = /^1[3-9]\d{9}$/;
    
    const canBind = phonePattern.test(phone) && smsCode.length === 6;
    this.setData({ canBind });
  },

  // 更新短信按钮状态
  updateSmsButtonState() {
    const { phone, smsCountdown } = this.data;
    const phonePattern = /^1[3-9]\d{9}$/;
    const canSend = phonePattern.test(phone) && smsCountdown === 0;
    this.setData({ canSendSms: canSend });
  },

  // 发送短信验证码
  async sendSmsCode() {
    if (!this.data.canSendSms || this.data.sendingSms) {
      return;
    }

    // 验证手机号
    if (!this.validatePhone()) {
      return;
    }

    this.setData({ sendingSms: true });

    try {
      const result = await AuthAPI.getSmsCode(this.data.phone);
      
      if (result.success || result.code === 0) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        
        // 启动倒计时
        this.startCountdown();
        
        this.setData({
          isFirstSend: false
        });
        
      } else {
        wx.showToast({
          title: result.message || '验证码发送失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      
      let errorMessage = '验证码发送失败';
      if (error.code === 1006) {
        errorMessage = '发送太频繁，请稍后重试';
      } else if (error.code === 1007) {
        errorMessage = '手机号格式不正确';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    } finally {
      this.setData({ sendingSms: false });
    }
  },

  // 启动倒计时
  startCountdown() {
    const countdownTime = 60; // 60秒倒计时
    this.setData({
      smsCountdown: countdownTime,
      canSendSms: false
    });

    // 清除之前的定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.countdownTimer = setInterval(() => {
      const countdown = this.data.smsCountdown - 1;
      
      if (countdown <= 0) {
        // 倒计时结束
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({
          smsCountdown: 0
        });
        this.updateSmsButtonState();
      } else {
        this.setData({
          smsCountdown: countdown
        });
      }
    }, 1000);
  },

  // 绑定手机号
  async bindPhone() {
    if (!this.data.canBind || this.data.isLoading) {
      return;
    }

    // 验证表单
    if (!this.validatePhone() || !this.validateSmsCode()) {
      return;
    }

    this.setData({
      isLoading: true
    });

    try {
      const result = await AuthAPI.bindPhone(this.data.phone, this.data.smsCode);
      
      if (result.success || result.code === 0) {
        // 绑定成功
        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        });
        
        // 更新本地用户信息
        const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
        if (userInfo) {
          userInfo.phone = this.data.phone;
          wx.setStorageSync(CONFIG.STORAGE_KEYS.USER_INFO, userInfo);
        }
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
        
      } else {
        wx.showToast({
          title: result.message || '绑定失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('绑定手机号失败:', error);
      
      let errorMessage = '绑定失败，请稍后重试';
      if (error.code === 1008) {
        errorMessage = '验证码错误或已过期';
      } else if (error.code === 1011) {
        errorMessage = '该手机号已被其他账户绑定';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  },

  // 跳过绑定
  skipBinding() {
    wx.showModal({
      title: '跳过绑定',
      content: '跳过手机号绑定可能影响账户安全，确定要跳过吗？',
      confirmText: '确定跳过',
      cancelText: '继续绑定',
      success: (res) => {
        if (res.confirm) {
          // 跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  // 页面卸载
  onUnload() {
    // 清理定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  // 页面隐藏
  onHide() {
    // 暂停倒计时，保存剩余时间
    if (this.countdownTimer && this.data.smsCountdown > 0) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  // 页面显示
  onShow() {
    // 恢复倒计时
    if (this.data.smsCountdown > 0 && !this.countdownTimer) {
      this.resumeCountdown();
    }
  },

  // 恢复倒计时
  resumeCountdown() {
    this.countdownTimer = setInterval(() => {
      const countdown = this.data.smsCountdown - 1;
      
      if (countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({
          smsCountdown: 0
        });
        this.updateSmsButtonState();
      } else {
        this.setData({
          smsCountdown: countdown
        });
      }
    }, 1000);
  }
});