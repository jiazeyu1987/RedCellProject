// pages/forgot-password/forgot-password.js
const AuthValidator = require('../../utils/auth-validator.js');
const AuthAPI = require('../../api/index.js').auth;

Page({
  /**
   * 页面的初始数据
   */
  data: {
    step: 1, // 1:验证手机号, 2:输入验证码, 3:设置新密码
    phone: '',
    smsCode: '',
    newPassword: '',
    confirmPassword: '',
    
    // 错误信息
    phoneError: '',
    smsCodeError: '',
    passwordError: '',
    confirmPasswordError: '',
    
    // 按钮状态
    canSendSms: false,
    canVerifyPhone: false,
    canResetPassword: false,
    
    // 倒计时相关
    smsCountdown: 0,
    sendingSms: false,
    
    // 验证状态
    verifyingPhone: false,
    resettingPassword: false,
    
    // 密码显示状态
    showPassword: false,
    showConfirmPassword: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果是从登录页面传来的手机号，则预填充
    if (options.phone) {
      this.setData({
        phone: options.phone
      });
      this.validatePhone();
      this.checkCanSendSms();
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '找回密码'
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 恢复倒计时（如果有）
    if (this.data.smsCountdown > 0 && !this.countdownTimer) {
      this.resumeCountdown();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 暂停倒计时
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone: phone,
      phoneError: ''
    });
    this.validatePhone();
    this.checkCanSendSms();
  },

  // 手机号失去焦点
  onPhoneBlur() {
    this.validatePhone();
  },

  // 清空手机号
  clearPhone() {
    this.setData({
      phone: '',
      phoneError: ''
    });
    this.checkCanSendSms();
  },

  // 验证码输入
  onSmsCodeInput(e) {
    const smsCode = e.detail.value;
    this.setData({
      smsCode: smsCode,
      smsCodeError: ''
    });
    this.validateSmsCode();
    this.checkCanVerifyPhone();
  },

  // 新密码输入
  onNewPasswordInput(e) {
    const newPassword = e.detail.value;
    this.setData({
      newPassword: newPassword,
      passwordError: ''
    });
    this.validateNewPassword();
    this.checkCanResetPassword();
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    const confirmPassword = e.detail.value;
    this.setData({
      confirmPassword: confirmPassword,
      confirmPasswordError: ''
    });
    this.validateConfirmPassword();
    this.checkCanResetPassword();
  },

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 切换确认密码显示
  toggleConfirmPassword() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    });
  },

  // 验证手机号
  validatePhone() {
    const { phone } = this.data;
    const result = AuthValidator.validatePhone(phone);
    
    this.setData({ phoneError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 验证短信验证码
  validateSmsCode() {
    const { smsCode } = this.data;
    const result = AuthValidator.validateSmsCode(smsCode);
    
    this.setData({ smsCodeError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 验证新密码
  validateNewPassword() {
    const { newPassword } = this.data;
    const result = AuthValidator.validatePassword(newPassword);
    
    this.setData({ passwordError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 验证确认密码
  validateConfirmPassword() {
    const { newPassword, confirmPassword } = this.data;
    
    if (!confirmPassword) {
      this.setData({ confirmPasswordError: '请再次输入密码' });
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      this.setData({ confirmPasswordError: '两次输入的密码不一致' });
      return false;
    }
    
    this.setData({ confirmPasswordError: '' });
    return true;
  },

  // 检查是否可以发送短信
  checkCanSendSms() {
    const { phone, smsCountdown } = this.data;
    const phonePattern = /^1[3-9]\d{9}$/;
    const canSend = phonePattern.test(phone) && smsCountdown === 0;
    this.setData({ canSendSms: canSend });
  },

  // 检查是否可以验证手机号
  checkCanVerifyPhone() {
    const { phone, smsCode } = this.data;
    const canVerify = this.validatePhone() && this.validateSmsCode();
    this.setData({ canVerifyPhone: canVerify });
  },

  // 检查是否可以重置密码
  checkCanResetPassword() {
    const canReset = this.validateNewPassword() && this.validateConfirmPassword();
    this.setData({ canResetPassword: canReset });
  },

  // 发送短信验证码
  async sendSmsCode() {
    if (!this.data.canSendSms || this.data.sendingSms) {
      return;
    }

    if (!this.validatePhone()) {
      return;
    }

    this.setData({ sendingSms: true });

    try {
      // 调用发送密码重置验证码API
      const result = await AuthAPI.getPasswordResetSmsCode(this.data.phone);
      
      if (result.success || result.code === 0) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        
        // 启动倒计时
        this.startCountdown();
        
      } else {
        wx.showToast({
          title: result.message || '验证码发送失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      
      let errorMessage = '验证码发送失败';
      if (error.code === 1001) {
        errorMessage = '手机号未注册';
      } else if (error.code === 1006) {
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

    this.countdownTimer = setInterval(() => {
      const countdown = this.data.smsCountdown - 1;
      
      if (countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({
          smsCountdown: 0
        });
        this.checkCanSendSms();
      } else {
        this.setData({
          smsCountdown: countdown
        });
      }
    }, 1000);
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
        this.checkCanSendSms();
      } else {
        this.setData({
          smsCountdown: countdown
        });
      }
    }, 1000);
  },

  // 验证手机号（第一步到第二步）
  async verifyPhone() {
    if (!this.data.canVerifyPhone || this.data.verifyingPhone) {
      return;
    }

    if (!this.validatePhone() || !this.validateSmsCode()) {
      return;
    }

    this.setData({ verifyingPhone: true });

    try {
      // 验证手机号和验证码
      const result = await AuthAPI.verifyPasswordResetCode(this.data.phone, this.data.smsCode);
      
      if (result.success || result.code === 0) {
        // 验证成功，进入第三步
        this.setData({
          step: 3
        });
        
        wx.showToast({
          title: '验证成功',
          icon: 'success'
        });
        
      } else {
        wx.showToast({
          title: result.message || '验证失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('验证失败:', error);
      
      let errorMessage = '验证失败';
      if (error.code === 1008) {
        errorMessage = '验证码错误或已过期';
      } else if (error.code === 1001) {
        errorMessage = '手机号未注册';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    } finally {
      this.setData({ verifyingPhone: false });
    }
  },

  // 重置密码
  async resetPassword() {
    if (!this.data.canResetPassword || this.data.resettingPassword) {
      return;
    }

    if (!this.validateNewPassword() || !this.validateConfirmPassword()) {
      return;
    }

    this.setData({ resettingPassword: true });

    try {
      // 重置密码
      const result = await AuthAPI.resetPassword(
        this.data.phone, 
        this.data.smsCode, 
        this.data.newPassword
      );
      
      if (result.success || result.code === 0) {
        wx.showModal({
          title: '密码重置成功',
          content: '密码已重置成功，请使用新密码登录',
          showCancel: false,
          confirmText: '去登录',
          success: () => {
            // 跳转到登录页面
            wx.navigateBack({
              delta: 1
            });
          }
        });
        
      } else {
        wx.showToast({
          title: result.message || '密码重置失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      
      let errorMessage = '密码重置失败';
      if (error.code === 1008) {
        errorMessage = '验证码已过期，请重新获取';
      } else if (error.code === 1001) {
        errorMessage = '用户不存在';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    } finally {
      this.setData({ resettingPassword: false });
    }
  },

  // 下一步（第一步到第二步）
  nextStep() {
    if (this.data.step === 1) {
      // 验证手机号格式
      if (!this.validatePhone()) {
        return;
      }
      
      // 进入第二步
      this.setData({
        step: 2
      });
    }
  },

  // 上一步
  prevStep() {
    if (this.data.step === 2) {
      this.setData({
        step: 1,
        smsCode: '',
        smsCodeError: ''
      });
    } else if (this.data.step === 3) {
      this.setData({
        step: 2,
        newPassword: '',
        confirmPassword: '',
        passwordError: '',
        confirmPasswordError: ''
      });
    }
  },

  // 返回登录页面
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});