Page({
  data: {
    systemInfo: {},
    debugInfo: {
      platform: '',
      version: '',
      SDKVersion: '',
      debugMode: false
    },
    testResults: {
      nativeButton: false,
      customButton: false,
      viewElement: false,
      textElement: false
    }
  },
  
  onLoad: function (options) {
    this.getSystemInfo();
    this.checkDebugMode();
  },

  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          systemInfo: res,
          'debugInfo.platform': res.platform,
          'debugInfo.version': res.version,
          'debugInfo.SDKVersion': res.SDKVersion
        });
        console.log('系统信息:', res);
      }
    });
  },

  checkDebugMode() {
    // 检查是否在开发者工具中
    const isDevtools = this.data.systemInfo.platform === 'devtools';
    this.setData({
      'debugInfo.debugMode': isDevtools
    });
  },

  onNativeButtonTap() {
    console.log('原生按钮被点击');
    this.setData({
      'testResults.nativeButton': true
    });
  },

  onCustomButtonTap() {
    console.log('自定义按钮被点击');
    this.setData({
      'testResults.customButton': true
    });
  },

  onViewTap() {
    console.log('View元素被点击');
    this.setData({
      'testResults.viewElement': true
    });
  },

  onTextTap() {
    console.log('Text元素被点击');
    this.setData({
      'testResults.textElement': true
    });
  },

  copyDebugInfo() {
    const debugInfo = {
      systemInfo: this.data.systemInfo,
      debugInfo: this.data.debugInfo,
      testResults: this.data.testResults,
      timestamp: new Date().toISOString()
    };

    wx.setClipboardData({
      data: JSON.stringify(debugInfo, null, 2),
      success: () => {
        wx.showToast({
          title: '调试信息已复制到剪贴板',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },

  clearTestResults() {
    this.setData({
      testResults: {
        nativeButton: false,
        customButton: false,
        viewElement: false,
        textElement: false
      }
    });
  }
});