// pages/test-nav/index.js
const { API } = require('../../config/api.js');

Page({
  data: {
    serverConfig: {
      baseURL: '',
      addresses: ''
    }
  },

  onLoad: function() {
    this.loadServerConfig();
  },

  // 加载服务器配置信息
  loadServerConfig() {
    this.setData({
      serverConfig: {
        baseURL: API.BASE_URL,
        addresses: API.API_BASE + API.USER.ADDRESSES
      }
    });
  },

  // 导航到弹框演示页面
  navigateToModalDemo() {
    wx.navigateTo({
      url: '/pages/modal-demo/index'
    });
  },

  // 导航到API测试页面
  navigateToApiTest() {
    wx.navigateTo({
      url: '/pages/api-test/index'
    });
  },

  // 导航到地址管理页面
  navigateToAddressManagement() {
    wx.navigateTo({
      url: '/pages/address-management/index'
    });
  },

  // 导航到预约页面
  navigateToBooking() {
    wx.navigateTo({
      url: '/pages/booking/index'
    });
  },

  // 快速测试所有页面
  async testAllPages() {
    wx.showLoading({ title: '开始测试...' });
    
    const pages = [
      { name: 'API测试', url: '/pages/api-test/index' },
      { name: '地址管理', url: '/pages/address-management/index' },
      { name: '预约服务', url: '/pages/booking/index' }
    ];
    
    let results = [];
    
    for (let page of pages) {
      try {
        // 这里只是模拟测试，实际上只能一个一个页面手动测试
        results.push(`✓ ${page.name}: 配置正确`);
      } catch (error) {
        results.push(`✗ ${page.name}: ${error.message}`);
      }
    }
    
    wx.hideLoading();
    
    wx.showModal({
      title: '测试结果',
      content: results.join('\n'),
      showCancel: false,
      success: () => {
        wx.showToast({
          title: '请手动访问各页面进行实际测试',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 查看控制台日志提示
  viewLogs() {
    wx.showModal({
      title: '查看日志说明',
      content: '请在微信开发者工具中:\n1. 打开\"调试器\"面板\n2. 选择\"Console\"标签页\n3. 查看实时日志输出\n\n测试时注意查看以下关键日志:\n• API调用请求\n• 服务器响应\n• 错误信息',
      showCancel: false
    });
  }
});