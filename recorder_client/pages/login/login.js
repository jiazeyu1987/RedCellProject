// pages/login/login.js
const { AuthAPI } = require('../../api/index.js');
const CONFIG = require('../../constants/config.js');
const { userStore, appStore } = require('../../stores/index.js');
const AuthValidator = require('../../utils/auth-validator.js');
const { RolePermissionManager } = require('../../utils/role-permission.js');
const UserInfoManager = require('../../utils/user-info-manager.js');
const LoginStateManager = require('../../utils/login-state-manager.js');
const DebugHelper = require('../../utils/debug-helper.js');

Page({
  data: {
    // 登录方式：'password' - 密码登录，'sms' - 验证码登录
    loginType: 'password',
    phone: '',
    password: '',
    smsCode: '',
    showPassword: false,
    isLoading: false,
    canLogin: false,
    rememberPassword: false,
    phoneError: '',
    passwordError: '',
    smsCodeError: '',
    loginAttempts: 0,
    isLocked: false,
    lockTime: 0,
    // 短信验证码相关
    smsCountdown: 0,
    sendingSms: false,
    canSendSms: false,
    isFirstSend: true,
    // 微信授权相关
    showAuthButton: false,
    pendingWechatCode: null,
    // 调试相关
    showDebugTools: false
  },

  onLoad(options) {
    // 页面加载时检查是否有记住的登录信息
    this.loadRememberedInfo();
    
    // 检查是否已经登录
    this.checkAutoLogin();
    
    // 初始化默认登录方式为密码登录
    this.setData({
      loginType: 'password',
      // 开发环境显示调试功能
      showDebugTools: CONFIG.CURRENT_ENV === CONFIG.ENV.DEVELOPMENT
    });
    
    // 设置当前页面
    try {
      appStore.setState({
        currentPage: 'login'
      });
    } catch (error) {
      console.error('设置当前页面错误:', error);
    }
  },

  // 验证用户角色
  validateUserRole(role) {
    if (!role) {
      console.error('用户角色为空');
      return false;
    }
    
    // 检查角色是否在允许的角色列表中
    const allowedRoles = Object.values(CONFIG.USER_ROLES);
    if (!allowedRoles.includes(role)) {
      console.error('不支持的用户角色:', role);
      return false;
    }
    
    // 检查角色是否有基本权限
    const hasBasicPermission = RolePermissionManager.hasPermission(role, 'view_dashboard');
    if (!hasBasicPermission) {
      console.error('用户角色缺少基本权限:', role);
      return false;
    }
    
    return true;
  },

  // 检查自动登录
  async checkAutoLogin() {
    try {
      const hasValidLogin = await LoginStateManager.checkAndRestoreLoginState();
      
      if (hasValidLogin) {
        // 登录状态有效，直接跳转到首页
        wx.showToast({
          title: '欢迎回来',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      }
    } catch (error) {
      console.error('自动登录检查失败:', error);
    }
  },

  // 清除用户数据
  async clearUserData() {
    await LoginStateManager.forceLogout('登录信息已失效');
  },

  // 加载记住的登录信息
  loadRememberedInfo() {
    try {
      const rememberedInfo = wx.getStorageSync('rememberedLoginInfo');
      if (rememberedInfo) {
        this.setData({
          phone: rememberedInfo.phone || '',
          rememberPassword: true
        });
        this.checkCanLogin();
      }
    } catch (error) {
      console.error('加载记住的登录信息失败:', error);
    }
  },

  // 切换登录方式
  switchLoginType(e) {
    const loginType = e.currentTarget.dataset.type;
    this.setData({
      loginType: loginType,
      // 清空相关错误信息
      passwordError: '',
      smsCodeError: '',
      smsCode: '',
      password: ''
    });
    this.checkCanLogin();
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone: phone,
      phoneError: ''
    });
    this.checkCanLogin();
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
    // 更新短信验证码按钮状态
    this.updateSmsButtonState();
  },

  // 清空手机号
  clearPhone() {
    this.setData({
      phone: '',
      phoneError: ''
    });
    this.checkCanLogin();
  },

  // 密码输入
  onPasswordInput(e) {
    const password = e.detail.value;
    this.setData({
      password: password,
      passwordError: ''
    });
    this.checkCanLogin();
  },

  // 密码获得焦点
  onPasswordFocus() {
    this.setData({
      passwordError: ''
    });
  },

  // 密码失去焦点
  onPasswordBlur() {
    this.validatePassword();
  },

  // 验证码输入
  onSmsCodeInput(e) {
    const smsCode = e.detail.value;
    this.setData({
      smsCode: smsCode,
      smsCodeError: ''
    });
    this.checkCanLogin();
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

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 切换记住密码
  toggleRemember() {
    this.setData({
      rememberPassword: !this.data.rememberPassword
    });
  },

  // 验证手机号
  validatePhone() {
    const { phone } = this.data;
    const result = AuthValidator.validatePhone(phone);
    
    this.setData({ phoneError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 验证验证码
  validateSmsCode() {
    const { smsCode } = this.data;
    const result = AuthValidator.validateSmsCode(smsCode);
    
    this.setData({ smsCodeError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 更新短信按钮状态
  updateSmsButtonState() {
    const { phone, smsCountdown } = this.data;
    const phonePattern = /^1[3-9]\d{9}$/;
    const canSend = phonePattern.test(phone) && smsCountdown === 0;
    this.setData({ canSendSms: canSend });
  },

  // 验证密码
  validatePassword() {
    const { password } = this.data;
    const result = AuthValidator.validatePassword(password);
    
    this.setData({ passwordError: result.valid ? '' : result.message });
    return result.valid;
  },

  // 检查是否可以登录
  checkCanLogin() {
    const { phone, password, smsCode, loginType } = this.data;
    
    // 使用验证器进行表单验证
    const formData = { phone, password, smsCode };
    const validationResult = AuthValidator.validateLoginForm(formData, loginType);
    
    this.setData({ canLogin: validationResult.valid });
    
    // 更新短信按钮状态
    if (loginType === 'sms') {
      this.updateSmsButtonState();
    }
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

  // 登录
  async login() {
    if (!this.data.canLogin || this.data.isLoading) {
      return;
    }

    // 检查是否被锁定
    if (this.checkLoginLock()) {
      return;
    }

    // 验证表单
    let isFormValid = false;
    if (this.data.loginType === 'password') {
      isFormValid = this.validatePhone() && this.validatePassword();
    } else if (this.data.loginType === 'sms') {
      isFormValid = this.validatePhone() && this.validateSmsCode();
    }
    
    if (!isFormValid) {
      return;
    }

    this.setData({
      isLoading: true
    });

    try {
      // 调用登录API
      const result = await this.doLogin();
      
      if (result.success) {
        // 登录成功，重置尝试次数
        this.resetLoginAttempts();
        
        // 验证用户角色
        if (!this.validateUserRole(result.role)) {
          wx.showToast({
            title: '用户角色验证失败',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        // 保存登录信息
        if (this.data.rememberPassword) {
          this.saveLoginInfo();
        } else {
          this.clearSavedLoginInfo();
        }
        
        // 保存用户token和信息
        const app = getApp();
        const saveSuccess = await app.setUserInfo(
          result.userInfo,
          result.token,
          result.role
        );
        
        if (!saveSuccess) {
          wx.showToast({
            title: '保存用户信息失败',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 登录成功，跳转到首页
        setTimeout(() => {
          this.navigateToHome();
        }, 1000);
        
      } else {
        // 登录失败，增加尝试次数
        this.increaseLoginAttempts();
        
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      this.increaseLoginAttempts();
      
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  },

  // 检查登录锁定状态
  checkLoginLock() {
    const { isLocked, lockTime } = this.data;
    
    if (isLocked) {
      const currentTime = Date.now();
      const remainingTime = Math.ceil((lockTime - currentTime) / 1000);
      
      if (remainingTime > 0) {
        wx.showToast({
          title: `登录被锁定，请${remainingTime}秒后重试`,
          icon: 'none',
          duration: 2000
        });
        return true;
      } else {
        // 锁定时间到期，解除锁定
        this.setData({
          isLocked: false,
          lockTime: 0,
          loginAttempts: 0
        });
      }
    }
    
    return false;
  },

  // 增加登录尝试次数
  increaseLoginAttempts() {
    const attempts = this.data.loginAttempts + 1;
    this.setData({
      loginAttempts: attempts
    });
    
    // 5次尝试失败后锁定5分钟
    if (attempts >= 5) {
      const lockTime = Date.now() + 5 * 60 * 1000; // 5分钟
      this.setData({
        isLocked: true,
        lockTime: lockTime
      });
      
      wx.showToast({
        title: '尝试次数过多，账户已锁定5分钟',
        icon: 'none',
        duration: 3000
      });
    } else {
      const remainingAttempts = 5 - attempts;
      wx.showToast({
        title: `还可尝试${remainingAttempts}次`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 重置登录尝试次数
  resetLoginAttempts() {
    this.setData({
      loginAttempts: 0,
      isLocked: false,
      lockTime: 0
    });
  },

  // 实际登录API调用
  async doLogin() {
    const { phone, password, smsCode, loginType } = this.data;
    
    try {
      let result;
      
      if (loginType === 'password') {
        // 密码登录
        result = await AuthAPI.loginByPassword(phone, password);
      } else if (loginType === 'sms') {
        // 验证码登录
        result = await AuthAPI.loginByPhone(phone, smsCode);
      }
      
      // 处理登录成功的响应
      if (result.success || result.code === 0) {
        const userData = result.data || result;
        return {
          success: true,
          message: result.message || '登录成功',
          token: userData.token,
          userInfo: userData.userInfo || userData.user,
          role: userData.userInfo?.role || userData.user?.role || CONFIG.USER_ROLES.RECORDER
        };
      } else {
        return {
          success: false,
          message: result.message || '登录失败'
        };
      }
    } catch (error) {
      console.error('登录API调用失败:', error);
      
      // 处理不同类型的错误
      if (error.code === 401) {
        return {
          success: false,
          message: loginType === 'password' ? '手机号或密码错误' : '手机号或验证码错误'
        };
      } else if (error.code === 423) {
        return {
          success: false,
          message: '账户已被锁定，请联系管理员'
        };
      } else if (error.code === 1001) {
        return {
          success: false,
          message: '用户不存在'
        };
      } else if (error.code === 1008) {
        return {
          success: false,
          message: '验证码错误或已过期'
        };
      } else if (error.code === 1002) {
        return {
          success: false,
          message: '手机号格式不正确'
        };
      } else if (error.code === 1003) {
        return {
          success: false,
          message: '密码格式不正确'
        };
      } else {
        return {
          success: false,
          message: error.message || '网络错误，请稍后重试'
        };
      }
    }
  },

  // 保存登录信息
  saveLoginInfo() {
    try {
      wx.setStorageSync('rememberedLoginInfo', {
        phone: this.data.phone
      });
    } catch (error) {
      console.error('保存登录信息失败:', error);
    }
  },

  // 清除保存的登录信息
  clearSavedLoginInfo() {
    try {
      wx.removeStorageSync('rememberedLoginInfo');
    } catch (error) {
      console.error('清除登录信息失败:', error);
    }
  },

  // 微信登录
  async wechatLogin() {
    try {
      DebugHelper.logWechatLoginDebug('开始微信登录');
      console.log('开始微信登录流程...');
      
      wx.showLoading({
        title: '微信登录中...'
      });
      
      // 获取微信登录code
      DebugHelper.logWechatLoginDebug('获取微信登录code');
      console.log('获取微信登录code...');
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      if (!loginRes.code) {
        throw new Error('获取微信登录code失败');
      }
      
      DebugHelper.logWechatLoginDebug('微信登录code获取成功', { code: loginRes.code });
      console.log('微信登录code获取成功:', loginRes.code);
      
      // 尝试直接使用code进行登录（静默登录）
      DebugHelper.logWechatLoginDebug('尝试静默登录');
      console.log('尝试静默登录...');
      let result = await this.doWechatLogin(loginRes.code, null);
      
      if (result.success) {
        DebugHelper.logWechatLoginDebug('静默登录成功', result);
        console.log('静默登录成功');
        // 静默登录成功
        await this.handleWechatLoginSuccess(result);
      } else if (result.needUserInfo) {
        DebugHelper.logWechatLoginDebug('需要获取用户信息，启动授权流程');
        console.log('需要获取用户信息，启动授权流程...');
        // 需要获取用户信息
        const userInfoRes = await this.getUserInfoWithAuth();
        if (userInfoRes) {
          DebugHelper.logWechatLoginDebug('用户授权成功，重新登录', userInfoRes);
          console.log('用户授权成功，重新登录...');
          // 重新调用登录接口，传入用户信息
          result = await this.doWechatLogin(loginRes.code, userInfoRes);
          if (result.success) {
            DebugHelper.logWechatLoginDebug('授权登录成功', result);
            console.log('授权登录成功');
            await this.handleWechatLoginSuccess(result);
          } else {
            throw new Error(result.message || '微信登录失败');
          }
        } else {
          throw new Error('用户取消授权');
        }
      } else {
        throw new Error(result.message || '微信登录失败');
      }
      
    } catch (error) {
      DebugHelper.logWechatLoginDebug('微信登录失败', { error: error.message });
      console.error('微信登录失败:', error);
      
      let errorMessage = '微信登录失败';
      if (error.message === '用户取消授权') {
        errorMessage = '需要授权后才能使用微信登录';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取用户信息授权（使用按钮形式）
  async getUserInfoWithAuth() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '授权提示',
        content: '为了更好地为您提供服务，需要获取您的微信头像和昵称',
        confirmText: '去授权',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 显示授权按钮
            this.setData({
              showAuthButton: true
            });
            
            // 设置回调函数
            this.authCallback = resolve;
          } else {
            resolve(null);
          }
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  },

  // 处理用户信息授权结果
  onGetUserInfo(e) {
    this.setData({
      showAuthButton: false
    });
    
    if (e.detail.userInfo) {
      // 授权成功，返回用户信息
      if (this.authCallback) {
        this.authCallback(e.detail);
        this.authCallback = null;
      }
    } else {
      // 授权失败
      if (this.authCallback) {
        this.authCallback(null);
        this.authCallback = null;
      }
      
      wx.showToast({
        title: '需要授权后才能使用微信登录',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 处理微信登录成功
  async handleWechatLoginSuccess(result) {
    console.log('处理微信登录成功:', result);
    
    // 校验返回数据的完整性
    if (!result || !result.userInfo) {
      console.error('用户信息缺失:', result);
      wx.showToast({
        title: '登录数据异常，请重试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      // 保存用户token和信息
      const app = getApp();
      const saveSuccess = await app.setUserInfo(
        result.userInfo,
        result.token,
        result.userInfo.role || CONFIG.USER_ROLES.RECORDER
      );
      
      if (!saveSuccess) {
        wx.showToast({
          title: '保存用户信息失败',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      console.log('用户信息保存成功，准备跳转');
      
      // 检查是否需要绑定手机号
      if (result.needBindPhone) {
        wx.showModal({
          title: '绑定手机号',
          content: '为了账户安全，建议绑定手机号',
          confirmText: '去绑定',
          cancelText: '跳过',
          success: (res) => {
            if (res.confirm) {
              // 跳转到手机号绑定页面
              wx.navigateTo({
                url: '/pages/bind-phone/bind-phone'
              });
            } else {
              // 直接跳转到首页
              this.navigateToHome();
            }
          }
        });
      } else {
        // 直接跳转到首页
        this.navigateToHome();
      }
    } catch (error) {
      console.error('处理微信登录成功时发生错误:', error);
      wx.showToast({
        title: '登录处理失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 跳转到首页
  navigateToHome() {
    DebugHelper.logNavigationDebug('跳转到首页', '/pages/index/index', 'switchTab');
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // 给更多时间让状态同步，然后跳转
    setTimeout(() => {
      // 先检查一下登录状态是否正确保存
      const userData = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      if (!userData || !token) {
        console.error('登录成功但未能正确保存用户信息');
        wx.showToast({
          title: '登录状态保存失败，请重试',
          icon: 'none'
        });
        return;
      }
      
      console.log('登录状态正常，开始跳转到首页');
      
      // 设置一个临时标记，表示刚刚登录成功
      wx.setStorageSync('_justLoggedIn', true);
      
      wx.switchTab({
        url: '/pages/index/index',
        success: () => {
          DebugHelper.logNavigationDebug('跳转首页成功', '/pages/index/index');
          console.log('成功跳转到首页');
        },
        fail: (error) => {
          DebugHelper.logNavigationDebug('跳转首页失败，使用备用方案', '/pages/index/index', 'reLaunch');
          console.error('跳转首页失败，使用备用方案:', error);
          // 备用方案：使用 reLaunch
          wx.reLaunch({
            url: '/pages/index/index',
            success: () => {
              DebugHelper.logNavigationDebug('备用方案跳转成功', '/pages/index/index');
              console.log('备用方案跳转成功');
            },
            fail: (reLaunchError) => {
              DebugHelper.logNavigationDebug('备用方案也失败', '/pages/index/index', 'reLaunch');
              console.error('备用方案也失败:', reLaunchError);
              wx.showToast({
                title: '跳转失败，请手动切换到首页',
                icon: 'none',
                duration: 3000
              });
            }
          });
        }
      });
    }, 1000); // 减少到 1 秒，提高响应速度
  },

  // 微信登录API
  async doWechatLogin(code, userInfo) {
    try {
      // 构建请求参数
      const params = { code };
      
      // 如果有用户信息，则添加到参数中
      if (userInfo) {
        params.encryptedData = userInfo.encryptedData;
        params.iv = userInfo.iv;
        params.signature = userInfo.signature;
        params.rawData = userInfo.rawData;
      }
      
      // 调用微信登录API
      const result = await AuthAPI.loginByWechat(params);
      
      if (result.success || result.code === 0) {
        // 处理用户信息，兼容不同的返回结构
        const userInfo = result.data?.userInfo || result.data?.user || result.userInfo || null;
        
        if (!userInfo) {
          console.warn('未获取到用户信息:', result);
        }
        
        return {
          success: true,
          message: result.message || '微信登录成功',
          token: result.data?.token || result.token,
          userInfo: userInfo,
          needBindPhone: result.data?.needBindPhone || result.needBindPhone || false
        };
      } else if (result.code === 1009) {
        // 需要用户信息授权
        return {
          success: false,
          needUserInfo: true,
          message: '需要用户信息授权'
        };
      } else {
        return {
          success: false,
          message: result.message || '微信登录失败'
        };
      }
    } catch (error) {
      console.error('微信登录API调用失败:', error);
      
      // 处理不同类型的错误
      if (error.code === 401) {
        return {
          success: false,
          message: '微信授权失败'
        };
      } else if (error.code === 1009) {
        return {
          success: false,
          needUserInfo: true,
          message: '需要用户信息授权'
        };
      } else if (error.code === 1010) {
        return {
          success: false,
          message: '微信用户不存在，请先注册'
        };
      } else {
        return {
          success: false,
          message: error.message || '微信登录失败'
        };
      }
    }
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 跳转到忘记密码页面
  goToForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password'
    });
  },

  // 显示用户协议
  showUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/user-agreement'
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/agreement/privacy-policy'
    });
  },

  // 页面卸载
  onUnload() {
    // 清理定时器
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  // 调试工具：诊断微信登录
  async debugDiagnoseWechatLogin() {
    if (CONFIG.CURRENT_ENV !== CONFIG.ENV.DEVELOPMENT) {
      return;
    }
    
    wx.showLoading({
      title: '诊断中...'
    });
    
    try {
      const diagnosis = await DebugHelper.diagnoseWechatLogin();
      console.log('微信登录诊断结果:', diagnosis);
      
      wx.showModal({
        title: '诊断结果',
        content: `系统: ${diagnosis.system?.platform || 'unknown'}\n网络: ${diagnosis.network?.networkType || 'unknown'}\n页面: ${diagnosis.pages?.join(', ') || 'unknown'}\nSession: ${diagnosis.wechatSession?.valid ? '有效' : '无效'}`,
        showCancel: false
      });
    } catch (error) {
      console.error('诊断失败:', error);
      wx.showToast({
        title: '诊断失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 调试工具：清理所有数据
  debugClearAllData() {
    if (CONFIG.CURRENT_ENV !== CONFIG.ENV.DEVELOPMENT) {
      return;
    }
    
    wx.showModal({
      title: '清理数据',
      content: '确定要清理所有存储数据吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            wx.showToast({
              title: '数据已清理',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: '清理失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 调试工具：测试微信登录流程
  async debugTestWechatFlow() {
    if (CONFIG.CURRENT_ENV !== CONFIG.ENV.DEVELOPMENT) {
      return;
    }
    
    wx.showLoading({
      title: '测试中...'
    });
    
    try {
      const testResult = await DebugHelper.testWechatLoginFlow();
      console.log('微信登录流程测试结果:', testResult);
      
      wx.showModal({
        title: '测试结果',
        content: `Code: ${testResult.code?.code ? '获取成功' : '获取失败'}\nSession: ${testResult.session?.valid ? '有效' : '无效'}`,
        showCancel: false
      });
    } catch (error) {
      console.error('测试失败:', error);
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
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