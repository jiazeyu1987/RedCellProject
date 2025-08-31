// 调试助手工具
const CONFIG = require('../constants/config.js');

class DebugHelper {
  /**
   * 记录微信登录调试信息
   */
  static logWechatLoginDebug(step, data = {}) {
    if (CONFIG.CURRENT_ENV === CONFIG.ENV.DEVELOPMENT) {
      console.log(`[微信登录调试] ${step}:`, {
        timestamp: new Date().toISOString(),
        step,
        data,
        stack: new Error().stack.split('\n').slice(1, 3).join('\n')
      });
    }
  }

  /**
   * 记录页面跳转调试信息
   */
  static logNavigationDebug(action, url, method = 'unknown') {
    if (CONFIG.CURRENT_ENV === CONFIG.ENV.DEVELOPMENT) {
      console.log(`[页面跳转调试] ${action}:`, {
        timestamp: new Date().toISOString(),
        action,
        url,
        method,
        currentPages: getCurrentPages().map(page => page.route)
      });
    }
  }

  /**
   * 记录登录状态调试信息
   */
  static logLoginStateDebug(action, state = {}) {
    if (CONFIG.CURRENT_ENV === CONFIG.ENV.DEVELOPMENT) {
      console.log(`[登录状态调试] ${action}:`, {
        timestamp: new Date().toISOString(),
        action,
        state,
        storage: {
          token: !!wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN),
          userInfo: !!wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO),
          role: wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE)
        }
      });
    }
  }

  /**
   * 记录API调用调试信息
   */
  static logApiDebug(api, params, result) {
    if (CONFIG.CURRENT_ENV === CONFIG.ENV.DEVELOPMENT) {
      console.log(`[API调试] ${api}:`, {
        timestamp: new Date().toISOString(),
        api,
        params,
        result,
        isMock: CONFIG.USE_MOCK_DATA
      });
    }
  }

  /**
   * 获取当前系统状态快照
   */
  static getSystemSnapshot() {
    try {
      const pages = getCurrentPages();
      return {
        timestamp: new Date().toISOString(),
        currentPage: pages.length > 0 ? pages[pages.length - 1].route : 'unknown',
        pageStack: pages.map(page => page.route),
        storage: {
          token: wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN),
          userInfo: wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO),
          role: wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE)
        },
        systemInfo: wx.getSystemInfoSync(),
        networkType: 'unknown' // 这个需要异步获取
      };
    } catch (error) {
      console.error('获取系统快照失败:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 微信登录问题诊断
   */
  static async diagnoseWechatLogin() {
    console.log('=== 微信登录问题诊断开始 ===');
    
    try {
      // 1. 检查基础环境
      const systemInfo = wx.getSystemInfoSync();
      console.log('1. 系统信息:', systemInfo);
      
      // 2. 检查网络状态
      const networkInfo = await new Promise((resolve) => {
        wx.getNetworkType({
          success: resolve,
          fail: (error) => resolve({ error })
        });
      });
      console.log('2. 网络状态:', networkInfo);
      
      // 3. 检查存储状态
      const storageInfo = {
        token: wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN),
        userInfo: wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO),
        role: wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE)
      };
      console.log('3. 存储状态:', storageInfo);
      
      // 4. 检查页面栈
      const pages = getCurrentPages();
      console.log('4. 页面栈:', pages.map(page => page.route));
      
      // 5. 测试微信API
      const loginTest = await new Promise((resolve) => {
        wx.checkSession({
          success: () => resolve({ valid: true }),
          fail: () => resolve({ valid: false })
        });
      });
      console.log('5. 微信Session状态:', loginTest);
      
      console.log('=== 微信登录问题诊断完成 ===');
      
      return {
        system: systemInfo,
        network: networkInfo,
        storage: storageInfo,
        pages: pages.map(page => page.route),
        wechatSession: loginTest
      };
      
    } catch (error) {
      console.error('诊断过程出错:', error);
      return { error: error.message };
    }
  }

  /**
   * 模拟微信登录测试
   */
  static async testWechatLoginFlow() {
    console.log('=== 微信登录流程测试开始 ===');
    
    try {
      // 1. 测试获取code
      console.log('1. 测试获取微信code...');
      const codeResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      console.log('1. 获取code结果:', codeResult);
      
      // 2. 测试检查session
      console.log('2. 测试检查session...');
      const sessionResult = await new Promise((resolve) => {
        wx.checkSession({
          success: () => resolve({ valid: true }),
          fail: () => resolve({ valid: false })
        });
      });
      console.log('2. Session检查结果:', sessionResult);
      
      console.log('=== 微信登录流程测试完成 ===');
      
      return {
        code: codeResult,
        session: sessionResult
      };
      
    } catch (error) {
      console.error('测试过程出错:', error);
      return { error: error.message };
    }
  }
}

module.exports = DebugHelper;