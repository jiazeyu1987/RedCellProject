// pages/api-test/index.js
const { API, http } = require('../../config/api.js');

Page({
  data: {
    serverConfig: {
      baseURL: '',
      apiPrefix: '',
      timeout: 0
    },
    testStatus: {
      health: null,
      addresses: null
    },
    testing: {
      health: false,
      addresses: false
    },
    testResults: []
  },

  onLoad: function() {
    this.loadServerConfig();
  },

  // 加载服务器配置
  loadServerConfig() {
    const app = getApp();
    this.setData({
      serverConfig: {
        baseURL: API.BASE_URL,
        apiPrefix: API.API_PREFIX,
        timeout: API.TIMEOUT
      }
    });
  },

  // 测试健康检查
  async testHealthCheck() {
    this.setData({
      'testing.health': true,
      'testStatus.health': null
    });

    try {
      const startTime = Date.now();
      const result = await http.get(API.HEALTH_CHECK);
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.setData({
        'testStatus.health': true
      });

      this.addTestResult({
        title: '健康检查',
        success: true,
        message: `服务器响应正常，耗时 ${duration}ms`,
        time: this.formatTime(new Date())
      });

      wx.showToast({
        title: '健康检查成功',
        icon: 'success'
      });
    } catch (error) {
      this.setData({
        'testStatus.health': false
      });

      this.addTestResult({
        title: '健康检查',
        success: false,
        message: `连接失败: ${error.message || '网络错误'}`,
        time: this.formatTime(new Date())
      });

      wx.showToast({
        title: '健康检查失败',
        icon: 'error'
      });
    } finally {
      this.setData({
        'testing.health': false
      });
    }
  },

  // 测试地址API
  async testAddressesAPI() {
    this.setData({
      'testing.addresses': true,
      'testStatus.addresses': null
    });

    try {
      const startTime = Date.now();
      
      // 尝试获取地址列表
      let result;
      try {
        result = await http.get(API.USER.ADDRESSES);
      } catch (error) {
        // 如果是401错误（未认证），这也算是成功的测试，说明API端点存在
        if (error.code === 401) {
          result = { success: false, message: '需要用户认证' };
        } else {
          throw error;
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.setData({
        'testStatus.addresses': true
      });

      this.addTestResult({
        title: '地址API测试',
        success: true,
        message: `API端点响应正常，耗时 ${duration}ms ${result.message ? '(' + result.message + ')' : ''}`,
        time: this.formatTime(new Date())
      });

      wx.showToast({
        title: '地址API测试成功',
        icon: 'success'
      });
    } catch (error) {
      this.setData({
        'testStatus.addresses': false
      });

      this.addTestResult({
        title: '地址API测试',
        success: false,
        message: `API调用失败: ${error.message || '网络错误'}`,
        time: this.formatTime(new Date())
      });

      wx.showToast({
        title: '地址API测试失败',
        icon: 'error'
      });
    } finally {
      this.setData({
        'testing.addresses': false
      });
    }
  },

  // 添加测试结果
  addTestResult(result) {
    const results = [...this.data.testResults];
    results.unshift(result); // 新结果放在前面
    
    // 只保留最近的10条结果
    if (results.length > 10) {
      results.splice(10);
    }
    
    this.setData({
      testResults: results
    });
  },

  // 清除测试结果
  clearResults() {
    this.setData({
      testResults: [],
      testStatus: {
        health: null,
        addresses: null
      }
    });
    
    wx.showToast({
      title: '结果已清除',
      icon: 'success'
    });
  },

  // 格式化时间
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
});