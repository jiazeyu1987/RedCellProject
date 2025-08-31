// 用户信息管理工具
const CONFIG = require('../constants/config.js');
const StorageService = require('./storage.js');
const { userStore } = require('../stores/index.js');

class UserInfoManager {
  /**
   * 保存用户信息
   * @param {object} userInfo 用户信息
   * @param {string} token 用户token
   * @param {string} role 用户角色
   */
  static async saveUserInfo(userInfo, token, role) {
    try {
      // 数据验证
      if (!userInfo || !token) {
        throw new Error('用户信息或token不能为空');
      }

      // 构建完整的用户数据
      const userData = {
        ...userInfo,
        role: role || CONFIG.USER_ROLES.RECORDER,
        loginTime: Date.now(),
        lastActiveTime: Date.now()
      };

      // 同步保存到本地存储
      wx.setStorageSync(CONFIG.STORAGE_KEYS.TOKEN, token);
      wx.setStorageSync(CONFIG.STORAGE_KEYS.USER_INFO, userData);
      wx.setStorageSync(CONFIG.STORAGE_KEYS.ROLE, userData.role);

      // 更新全局状态
      userStore.setState({
        userInfo: userData,
        token: token,
        role: userData.role,
        isLoggedIn: true
      });

      console.log('用户信息保存成功');
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  }

  /**
   * 获取用户信息
   * @returns {object|null} 用户信息
   */
  static getUserInfo() {
    try {
      const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      const token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
      const role = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);

      if (!userInfo || !token) {
        return null;
      }

      return {
        userInfo,
        token,
        role: role || CONFIG.USER_ROLES.RECORDER,
        isLoggedIn: true
      };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 更新用户信息
   * @param {object} updates 要更新的字段
   */
  static async updateUserInfo(updates) {
    try {
      const currentUserInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      if (!currentUserInfo) {
        throw new Error('当前没有用户登录');
      }

      // 合并更新的信息
      const updatedUserInfo = {
        ...currentUserInfo,
        ...updates,
        lastUpdateTime: Date.now()
      };

      // 保存更新后的用户信息
      wx.setStorageSync(CONFIG.STORAGE_KEYS.USER_INFO, updatedUserInfo);

      // 如果角色发生变化，也更新角色存储
      if (updates.role) {
        wx.setStorageSync(CONFIG.STORAGE_KEYS.ROLE, updates.role);
      }

      // 更新全局状态
      const currentState = userStore.getState();
      userStore.setState({
        ...currentState,
        userInfo: updatedUserInfo,
        role: updates.role || currentState.role
      });

      console.log('用户信息更新成功');
      return updatedUserInfo;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新最后活跃时间
   */
  static updateLastActiveTime() {
    try {
      const currentUserInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      if (currentUserInfo) {
        const updatedUserInfo = {
          ...currentUserInfo,
          lastActiveTime: Date.now()
        };
        
        wx.setStorageSync(CONFIG.STORAGE_KEYS.USER_INFO, updatedUserInfo);
        
        // 更新全局状态
        const currentState = userStore.getState();
        userStore.setState({
          ...currentState,
          userInfo: updatedUserInfo
        });
      }
    } catch (error) {
      console.error('更新最后活跃时间失败:', error);
    }
  }

  /**
   * 清除用户信息（登出时使用）
   */
  static clearUserInfo() {
    try {
      // 清除本地存储
      wx.removeStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
      wx.removeStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      wx.removeStorageSync(CONFIG.STORAGE_KEYS.ROLE);

      // 清除全局状态
      userStore.setState({
        userInfo: null,
        token: '',
        role: '',
        isLoggedIn: false
      });

      console.log('用户信息已清除');
      return true;
    } catch (error) {
      console.error('清除用户信息失败:', error);
      return false;
    }
  }

  /**
   * 检查用户登录状态
   * @returns {boolean} 是否已登录
   */
  static isLoggedIn() {
    try {
      const token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
      const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      return !!(token && userInfo);
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户角色
   * @returns {string} 用户角色
   */
  static getUserRole() {
    try {
      const role = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
      return role || CONFIG.USER_ROLES.RECORDER;
    } catch (error) {
      console.error('获取用户角色失败:', error);
      return CONFIG.USER_ROLES.RECORDER;
    }
  }

  /**
   * 获取用户token
   * @returns {string} 用户token
   */
  static getToken() {
    try {
      return wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN) || '';
    } catch (error) {
      console.error('获取用户token失败:', error);
      return '';
    }
  }

  /**
   * 验证token是否有效
   * @returns {boolean} token是否有效
   */
  static async validateToken() {
    try {
      const token = this.getToken();
      
      if (!token) {
        return false;
      }

      // 这里可以调用后端API验证token
      // 暂时使用简单的格式验证
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      // 检查token是否过期（如果token包含过期时间）
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return false;
        }
      } catch (parseError) {
        console.error('解析token失败:', parseError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('验证token失败:', error);
      return false;
    }
  }

  /**
   * 初始化用户状态（应用启动时调用）
   */
  static initUserState() {
    try {
      const userData = this.getUserInfo();
      
      if (userData && userData.userInfo && userData.token) {
        // 更新全局状态
        userStore.setState(userData);
        
        // 更新最后活跃时间
        this.updateLastActiveTime();
        
        console.log('用户状态初始化成功');
        return true;
      } else {
        // 没有有效的用户信息，清除状态
        this.clearUserInfo();
        console.log('没有有效的用户信息');
        return false;
      }
    } catch (error) {
      console.error('初始化用户状态失败:', error);
      return false;
    }
  }

  /**
   * 保存用户偏好设置
   * @param {object} preferences 偏好设置
   */
  static async saveUserPreferences(preferences) {
    try {
      const currentUserInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      if (!currentUserInfo) {
        throw new Error('用户未登录');
      }

      const updatedPreferences = {
        ...currentUserInfo.preferences,
        ...preferences,
        lastUpdateTime: Date.now()
      };

      await this.updateUserInfo({
        preferences: updatedPreferences
      });

      console.log('用户偏好设置保存成功');
      return updatedPreferences;
    } catch (error) {
      console.error('保存用户偏好设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户偏好设置
   * @returns {object} 偏好设置
   */
  static getUserPreferences() {
    try {
      const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      if (!userInfo || !userInfo.preferences) {
        // 返回默认偏好设置
        return {
          enableNotification: true,
          enableLocation: true,
          theme: 'light',
          language: 'zh-CN',
          autoRefresh: true,
          soundEnabled: true
        };
      }

      return userInfo.preferences;
    } catch (error) {
      console.error('获取用户偏好设置失败:', error);
      return {};
    }
  }

  /**
   * 获取用户统计信息
   * @returns {object} 统计信息
   */
  static getUserStats() {
    try {
      const userInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
      
      if (!userInfo) {
        return null;
      }

      return {
        loginTime: userInfo.loginTime,
        lastActiveTime: userInfo.lastActiveTime,
        lastUpdateTime: userInfo.lastUpdateTime,
        role: userInfo.role
      };
    } catch (error) {
      console.error('获取用户统计信息失败:', error);
      return null;
    }
  }
}

module.exports = UserInfoManager;