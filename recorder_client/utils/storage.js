// 本地存储工具封装
const CONFIG = require('../constants/config.js');

class StorageService {
  /**
   * 存储数据
   * @param {string} key 存储键
   * @param {*} data 要存储的数据
   * @param {boolean} sync 是否同步存储（默认false，使用异步）
   */
  static set(key, data, sync = false) {
    try {
      const value = typeof data === 'object' ? JSON.stringify(data) : data;
      
      if (sync) {
        wx.setStorageSync(key, value);
        return Promise.resolve();
      } else {
        return new Promise((resolve, reject) => {
          wx.setStorage({
            key,
            data: value,
            success: resolve,
            fail: reject
          });
        });
      }
    } catch (error) {
      console.error('存储数据失败:', error);
      return Promise.reject(error);
    }
  }

  /**
   * 获取数据
   * @param {string} key 存储键
   * @param {*} defaultValue 默认值
   * @param {boolean} sync 是否同步获取（默认false，使用异步）
   */
  static get(key, defaultValue = null, sync = false) {
    try {
      if (sync) {
        const value = wx.getStorageSync(key);
        return this._parseValue(value, defaultValue);
      } else {
        return new Promise((resolve, reject) => {
          wx.getStorage({
            key,
            success: (res) => {
              resolve(this._parseValue(res.data, defaultValue));
            },
            fail: () => {
              resolve(defaultValue);
            }
          });
        });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      return sync ? defaultValue : Promise.resolve(defaultValue);
    }
  }

  /**
   * 删除数据
   * @param {string} key 存储键
   * @param {boolean} sync 是否同步删除（默认false，使用异步）
   */
  static remove(key, sync = false) {
    try {
      if (sync) {
        wx.removeStorageSync(key);
        return Promise.resolve();
      } else {
        return new Promise((resolve, reject) => {
          wx.removeStorage({
            key,
            success: resolve,
            fail: reject
          });
        });
      }
    } catch (error) {
      console.error('删除数据失败:', error);
      return Promise.reject(error);
    }
  }

  /**
   * 清空所有存储
   * @param {boolean} sync 是否同步清空（默认false，使用异步）
   */
  static clear(sync = false) {
    try {
      if (sync) {
        wx.clearStorageSync();
        return Promise.resolve();
      } else {
        return new Promise((resolve, reject) => {
          wx.clearStorage({
            success: resolve,
            fail: reject
          });
        });
      }
    } catch (error) {
      console.error('清空存储失败:', error);
      return Promise.reject(error);
    }
  }

  /**
   * 获取存储信息
   */
  static getInfo() {
    return new Promise((resolve, reject) => {
      wx.getStorageInfo({
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 解析存储的值
   */
  static _parseValue(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  // ============ 业务相关的存储方法 ============

  /**
   * 存储用户信息
   */
  static setUserInfo(userInfo) {
    return this.set(CONFIG.STORAGE_KEYS.USER_INFO, userInfo);
  }

  /**
   * 获取用户信息
   */
  static getUserInfo() {
    return this.get(CONFIG.STORAGE_KEYS.USER_INFO, null);
  }

  /**
   * 存储用户token
   */
  static setToken(token) {
    return this.set(CONFIG.STORAGE_KEYS.TOKEN, token);
  }

  /**
   * 获取用户token
   */
  static getToken() {
    return this.get(CONFIG.STORAGE_KEYS.TOKEN, '');
  }

  /**
   * 存储用户角色
   */
  static setUserRole(role) {
    return this.set(CONFIG.STORAGE_KEYS.ROLE, role);
  }

  /**
   * 获取用户角色
   */
  static getUserRole() {
    return this.get(CONFIG.STORAGE_KEYS.ROLE, '');
  }

  /**
   * 存储应用设置
   */
  static setAppSettings(settings) {
    return this.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  }

  /**
   * 获取应用设置
   */
  static getAppSettings() {
    return this.get(CONFIG.STORAGE_KEYS.SETTINGS, {
      enableNotification: true,
      enableLocation: true,
      theme: 'light',
      language: 'zh-CN'
    });
  }

  /**
   * 清除用户相关数据（登出时使用）
   */
  static clearUserData() {
    const promises = [
      this.remove(CONFIG.STORAGE_KEYS.USER_INFO),
      this.remove(CONFIG.STORAGE_KEYS.TOKEN),
      this.remove(CONFIG.STORAGE_KEYS.ROLE)
    ];
    return Promise.all(promises);
  }

  /**
   * 存储临时数据（带过期时间）
   */
  static setTempData(key, data, expireTime = 24 * 60 * 60 * 1000) {
    const tempData = {
      data,
      timestamp: Date.now(),
      expireTime
    };
    return this.set(`temp_${key}`, tempData);
  }

  /**
   * 获取临时数据（自动检查过期）
   */
  static getTempData(key, defaultValue = null) {
    return this.get(`temp_${key}`, null).then(tempData => {
      if (!tempData) {
        return defaultValue;
      }

      const now = Date.now();
      if (now - tempData.timestamp > tempData.expireTime) {
        // 数据已过期，删除并返回默认值
        this.remove(`temp_${key}`);
        return defaultValue;
      }

      return tempData.data;
    });
  }

  /**
   * 存储缓存数据
   */
  static setCacheData(key, data, cacheTime = 30 * 60 * 1000) {
    return this.setTempData(`cache_${key}`, data, cacheTime);
  }

  /**
   * 获取缓存数据
   */
  static getCacheData(key, defaultValue = null) {
    return this.getTempData(`cache_${key}`, defaultValue);
  }

  /**
   * 存储列表数据的分页信息
   */
  static setListPagination(listKey, pagination) {
    return this.set(`pagination_${listKey}`, pagination);
  }

  /**
   * 获取列表数据的分页信息
   */
  static getListPagination(listKey) {
    return this.get(`pagination_${listKey}`, {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: true
    });
  }
}

module.exports = StorageService;