// 用户偏好设置页面示例
const UserInfoManager = require('../../utils/user-info-manager.js');
const { PermissionMiddleware } = require('../../utils/permission-middleware.js');
const { PERMISSIONS } = require('../../utils/role-permission.js');
const { LoginPageDecorator, LoginStateMixin } = require('../../utils/login-page-decorator.js');
const LoginStateManager = require('../../utils/login-state-manager.js');

// 使用登录装饰器装饰页面
const UserSettingsPage = LoginPageDecorator.requirePermissions({
  // 混入登录状态管理方法
  ...LoginStateMixin,
  data: {
    userInfo: null,
    preferences: {
      enableNotification: true,
      enableLocation: true,
      theme: 'light',
      language: 'zh-CN',
      autoRefresh: true,
      soundEnabled: true
    },
    loading: false
  },

  onLoad() {
    // 页面已通过装饰器进行登录和权限检查
    this.initPage();
  },

  // 混入权限检查方法
  ...PermissionMiddleware.pagePermissionMixin(PERMISSIONS.VIEW_PROFILE),

  // 初始化页面
  initPage() {
    this.loadUserInfo();
    this.loadUserPreferences();
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userData = UserInfoManager.getUserInfo();
      if (userData) {
        this.setData({
          userInfo: userData.userInfo
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
    }
  },

  // 加载用户偏好设置
  loadUserPreferences() {
    try {
      const preferences = UserInfoManager.getUserPreferences();
      this.setData({
        preferences
      });
    } catch (error) {
      console.error('加载偏好设置失败:', error);
    }
  },

  // 更新用户头像
  async updateAvatar(e) {
    try {
      const { avatarUrl } = e.detail;
      
      this.setData({ loading: true });
      
      await UserInfoManager.updateUserInfo({
        avatarUrl
      });
      
      this.setData({
        'userInfo.avatarUrl': avatarUrl,
        loading: false
      });
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('更新头像失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '头像更新失败',
        icon: 'none'
      });
    }
  },

  // 更新用户昵称
  async updateNickname(e) {
    try {
      const nickname = e.detail.value;
      
      if (!nickname.trim()) {
        wx.showToast({
          title: '昵称不能为空',
          icon: 'none'
        });
        return;
      }
      
      await UserInfoManager.updateUserInfo({
        nickname: nickname.trim()
      });
      
      this.setData({
        'userInfo.nickname': nickname.trim()
      });
      
      wx.showToast({
        title: '昵称更新成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('更新昵称失败:', error);
      
      wx.showToast({
        title: '昵称更新失败',
        icon: 'none'
      });
    }
  },

  // 切换通知设置
  async toggleNotification(e) {
    const { value } = e.detail;
    
    try {
      await this.updatePreference('enableNotification', value);
    } catch (error) {
      console.error('更新通知设置失败:', error);
    }
  },

  // 切换定位设置
  async toggleLocation(e) {
    const { value } = e.detail;
    
    try {
      await this.updatePreference('enableLocation', value);
    } catch (error) {
      console.error('更新定位设置失败:', error);
    }
  },

  // 切换主题
  async switchTheme(e) {
    const theme = e.currentTarget.dataset.theme;
    
    try {
      await this.updatePreference('theme', theme);
    } catch (error) {
      console.error('更新主题设置失败:', error);
    }
  },

  // 切换自动刷新
  async toggleAutoRefresh(e) {
    const { value } = e.detail;
    
    try {
      await this.updatePreference('autoRefresh', value);
    } catch (error) {
      console.error('更新自动刷新设置失败:', error);
    }
  },

  // 切换声音设置
  async toggleSound(e) {
    const { value } = e.detail;
    
    try {
      await this.updatePreference('soundEnabled', value);
    } catch (error) {
      console.error('更新声音设置失败:', error);
    }
  },

  // 更新偏好设置
  async updatePreference(key, value) {
    try {
      const newPreferences = {
        ...this.data.preferences,
        [key]: value
      };
      
      await UserInfoManager.saveUserPreferences(newPreferences);
      
      this.setData({
        [`preferences.${key}`]: value
      });
      
      wx.showToast({
        title: '设置已保存',
        icon: 'success',
        duration: 1000
      });
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      
      wx.showToast({
        title: '保存设置失败',
        icon: 'none'
      });
    }
  },

  // 查看用户统计
  viewUserStats() {
    try {
      const stats = UserInfoManager.getUserStats();
      
      if (stats) {
        const loginTime = new Date(stats.loginTime).toLocaleString();
        const lastActive = new Date(stats.lastActiveTime).toLocaleString();
        
        wx.showModal({
          title: '用户统计',
          content: `登录时间: ${loginTime}\n最后活跃: ${lastActive}\n用户角色: ${stats.role}`,
          showCancel: false
        });
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
      
      wx.showToast({
        title: '获取统计信息失败',
        icon: 'none'
      });
    }
  },

  // 退出登录
  async logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.doLogout();
        }
      }
    });
  },

  // 执行退出登录
  async doLogout() {
    try {
      // 使用新的登录状态管理器
      await LoginStateManager.logout();
    } catch (error) {
      console.error('退出登录失败:', error);
      
      wx.showToast({
        title: '退出登录失败',
        icon: 'none'
      });
    }
  }
}, [PERMISSIONS.VIEW_PROFILE]); // 指定需要的权限

// 导出装饰后的页面
Page(UserSettingsPage);