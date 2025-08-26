// 设置页面
Page({
  data: {
    userInfo: {
      nickname: '健康用户',
      avatar: '👤',
      phone: '138****8888'
    },
    settings: {
      notifications: {
        system: true,
        service: true,
        promotion: false,
        community: true
      },
      privacy: {
        profileVisible: true,
        locationService: true,
        dataSync: false
      },
      preferences: {
        theme: 'auto', // auto, light, dark
        language: 'zh-CN',
        currency: 'CNY'
      }
    },
    themeOptions: [
      { value: 'auto', name: '跟随系统' },
      { value: 'light', name: '浅色模式' },
      { value: 'dark', name: '深色模式' }
    ],
    languageOptions: [
      { value: 'zh-CN', name: '简体中文' },
      { value: 'zh-TW', name: '繁體中文' },
      { value: 'en-US', name: 'English' }
    ],
    storageInfo: {
      used: 0,
      total: 0
    }
  },

  onLoad() {
    this.loadUserInfo();
    this.loadSettings();
    this.loadStorageInfo();
  },

  onShow() {
    // 更新用户信息
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo() {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          ...app.globalData.userInfo
        }
      });
    }
  },

  // 加载设置信息
  loadSettings() {
    const savedSettings = wx.getStorageSync('userSettings');
    if (savedSettings) {
      this.setData({
        settings: {
          ...this.data.settings,
          ...savedSettings
        }
      });
    }
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('userSettings', this.data.settings);
  },

  // 加载存储信息
  loadStorageInfo() {
    wx.getStorageInfo({
      success: (res) => {
        this.setData({
          storageInfo: {
            used: (res.currentSize / 1024).toFixed(2), // KB转MB
            total: (res.limitSize / 1024).toFixed(2)
          }
        });
      }
    });
  },

  // 编辑个人资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile-edit/index'
    });
  },

  // 修改手机号
  changePhone() {
    wx.showModal({
      title: '修改手机号',
      content: '为了账户安全，修改手机号需要验证身份，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 修改密码
  changePassword() {
    wx.showModal({
      title: '修改密码',
      content: '是否跳转到密码修改页面？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 切换通知设置
  toggleNotification(e) {
    const type = e.currentTarget.dataset.type;
    const checked = e.detail.value;
    
    this.setData({
      [`settings.notifications.${type}`]: checked
    });
    
    this.saveSettings();
    
    wx.showToast({
      title: checked ? '已开启' : '已关闭',
      icon: 'success'
    });
  },

  // 切换隐私设置
  togglePrivacy(e) {
    const type = e.currentTarget.dataset.type;
    const checked = e.detail.value;
    
    // 位置服务需要特殊处理
    if (type === 'locationService' && checked) {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                this.setData({
                  [`settings.privacy.${type}`]: checked
                });
                this.saveSettings();
              },
              fail: () => {
                wx.showModal({
                  title: '需要位置权限',
                  content: '请在设置中开启位置权限',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              }
            });
          } else {
            this.setData({
              [`settings.privacy.${type}`]: checked
            });
            this.saveSettings();
          }
        }
      });
    } else {
      this.setData({
        [`settings.privacy.${type}`]: checked
      });
      this.saveSettings();
    }
  },

  // 选择主题
  selectTheme() {
    const options = this.data.themeOptions.map(item => item.name);
    const currentIndex = this.data.themeOptions.findIndex(
      item => item.value === this.data.settings.preferences.theme
    );
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedTheme = this.data.themeOptions[res.tapIndex];
        this.setData({
          'settings.preferences.theme': selectedTheme.value
        });
        this.saveSettings();
        
        wx.showToast({
          title: `已切换到${selectedTheme.name}`,
          icon: 'success'
        });
      }
    });
  },

  // 选择语言
  selectLanguage() {
    const options = this.data.languageOptions.map(item => item.name);
    const currentIndex = this.data.languageOptions.findIndex(
      item => item.value === this.data.settings.preferences.language
    );
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedLang = this.data.languageOptions[res.tapIndex];
        this.setData({
          'settings.preferences.language': selectedLang.value
        });
        this.saveSettings();
        
        wx.showToast({
          title: `已切换到${selectedLang.name}`,
          icon: 'success'
        });
      }
    });
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '清理缓存会删除临时文件，但不会影响您的个人数据，是否继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清理中...'
          });
          
          // 模拟清理过程
          setTimeout(() => {
            wx.hideLoading();
            this.loadStorageInfo(); // 重新加载存储信息
            
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            });
          }, 2000);
        }
      }
    });
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({
      title: '检查中...'
    });
    
    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading();
      
      if (wx.getUpdateManager) {
        const updateManager = wx.getUpdateManager();
        
        updateManager.onCheckForUpdate((res) => {
          if (res.hasUpdate) {
            wx.showModal({
              title: '发现新版本',
              content: '发现新版本，是否下载更新？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  updateManager.onUpdateReady(() => {
                    wx.showModal({
                      title: '更新完成',
                      content: '新版本已准备好，是否重启应用？',
                      success: (restartRes) => {
                        if (restartRes.confirm) {
                          updateManager.applyUpdate();
                        }
                      }
                    });
                  });
                  
                  updateManager.onUpdateFailed(() => {
                    wx.showToast({
                      title: '更新失败',
                      icon: 'none'
                    });
                  });
                }
              }
            });
          } else {
            wx.showToast({
              title: '已是最新版本',
              icon: 'success'
            });
          }
        });
      } else {
        wx.showToast({
          title: '已是最新版本',
          icon: 'success'
        });
      }
    }, 1500);
  },

  // 用户协议
  viewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...\n\n1. 服务条款\n2. 用户权利\n3. 平台责任\n4. 免责声明',
      showCancel: false
    });
  },

  // 隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...\n\n我们承诺保护用户隐私，详细条款请查看完整版隐私政策。',
      showCancel: false
    });
  },

  // 联系客服
  contactCustomerService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-888-8888\n工作时间：9:00-21:00',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888'
          });
        }
      }
    });
  },

  // 关于我们
  aboutUs() {
    wx.navigateTo({
      url: '/pages/about/index'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '是否确定退出当前账户？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          const app = getApp();
          app.globalData.userInfo = null;
          app.globalData.isLoggedIn = false;
          
          // 清除本地存储的用户数据
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('accessToken');
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            complete: () => {
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/home/index'
                });
              }, 1500);
            }
          });
        }
      }
    });
  },

  // 获取主题名称
  getThemeName(theme) {
    const themeObj = this.data.themeOptions.find(item => item.value === theme);
    return themeObj ? themeObj.name : theme;
  },

  // 获取语言名称
  getLanguageName(lang) {
    const langObj = this.data.languageOptions.find(item => item.value === lang);
    return langObj ? langObj.name : lang;
  },

  // 计算存储使用百分比
  getStoragePercentage() {
    if (!this.data.storageInfo.total || this.data.storageInfo.total === 0) {
      return 0;
    }
    return (this.data.storageInfo.used / this.data.storageInfo.total * 100).toFixed(1);
  }
});