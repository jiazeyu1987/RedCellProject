// 错误处理工具
class ErrorHandler {
  /**
   * 处理微信小程序常见错误
   */
  static handleError(error, context = '') {
    console.error(`[${context}] 错误:`, error);
    
    // 处理不同类型的错误
    if (error && error.message) {
      const message = error.message;
      
      // webviewId 相关错误
      if (message.includes('__subscribe_webviewId')) {
        return this.handleWebviewError(error, context);
      }
      
      // 状态管理相关错误
      if (message.includes('Cannot read property') && message.includes('setState')) {
        return this.handleStateError(error, context);
      }
      
      // 网络相关错误
      if (message.includes('request:fail') || message.includes('network')) {
        return this.handleNetworkError(error, context);
      }
    }
    
    // 默认错误处理
    return this.handleDefaultError(error, context);
  }

  /**
   * 处理 webviewId 错误
   */
  static handleWebviewError(error, context) {
    console.warn(`[${context}] WebView 订阅错误，可能的原因：`);
    console.warn('1. 页面组件化使用不当');
    console.warn('2. 状态管理监听器未正确清理');
    console.warn('3. 微信小程序版本兼容性问题');
    
    // 建议的解决方案
    const solutions = [
      '确保页面使用 Page() 而不是 Component()',
      '在页面 onUnload 时清理所有状态监听器',
      '避免在页面销毁后访问状态管理',
      '检查 app.json 中的渲染引擎配置'
    ];
    
    console.log('建议的解决方案:');
    solutions.forEach((solution, index) => {
      console.log(`${index + 1}. ${solution}`);
    });
    
    return {
      type: 'webview_error',
      handled: true,
      suggestions: solutions
    };
  }

  /**
   * 处理状态管理错误
   */
  static handleStateError(error, context) {
    console.warn(`[${context}] 状态管理错误`);
    
    return {
      type: 'state_error',
      handled: true,
      suggestion: '检查状态管理器是否正确初始化'
    };
  }

  /**
   * 处理网络错误
   */
  static handleNetworkError(error, context) {
    console.warn(`[${context}] 网络错误`);
    
    wx.showToast({
      title: '网络连接异常',
      icon: 'none',
      duration: 2000
    });
    
    return {
      type: 'network_error',
      handled: true,
      userNotified: true
    };
  }

  /**
   * 默认错误处理
   */
  static handleDefaultError(error, context) {
    console.error(`[${context}] 未知错误:`, error);
    
    return {
      type: 'unknown_error',
      handled: false
    };
  }

  /**
   * 安全的状态更新
   */
  static safeStateUpdate(store, newState, context = '') {
    try {
      if (store && typeof store.setState === 'function') {
        store.setState(newState);
        return true;
      } else {
        console.warn(`[${context}] 状态管理器无效`);
        return false;
      }
    } catch (error) {
      this.handleError(error, `${context} - safeStateUpdate`);
      return false;
    }
  }

  /**
   * 安全的状态订阅
   */
  static safeSubscribe(store, listener, context = '') {
    try {
      if (store && typeof store.subscribe === 'function') {
        return store.subscribe(listener);
      } else {
        console.warn(`[${context}] 状态管理器无效`);
        return () => {}; // 返回空的取消订阅函数
      }
    } catch (error) {
      this.handleError(error, `${context} - safeSubscribe`);
      return () => {};
    }
  }

  /**
   * 检查小程序环境
   */
  static checkEnvironment() {
    const systemInfo = wx.getSystemInfoSync();
    const SDKVersion = systemInfo.SDKVersion;
    
    console.log('小程序环境信息:');
    console.log('SDK 版本:', SDKVersion);
    console.log('平台:', systemInfo.platform);
    console.log('微信版本:', systemInfo.version);
    
    // 检查版本兼容性
    const minSDKVersion = '2.10.0';
    if (this.compareVersion(SDKVersion, minSDKVersion) < 0) {
      console.warn(`SDK 版本过低，建议 ${minSDKVersion} 以上`);
      return false;
    }
    
    return true;
  }

  /**
   * 版本比较
   */
  static compareVersion(v1, v2) {
    const v1parts = v1.split('.').map(Number);
    const v2parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }
}

module.exports = ErrorHandler;