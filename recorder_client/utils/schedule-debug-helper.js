// 日程页面调试辅助工具

class ScheduleDebugHelper {
  constructor() {
    this.debugInfo = {
      loadingStates: [],
      apiCalls: [],
      errors: [],
      dataChanges: []
    };
  }

  /**
   * 记录加载状态变化
   */
  logLoadingState(state, context = '') {
    const timestamp = new Date().toISOString();
    this.debugInfo.loadingStates.push({
      timestamp,
      state,
      context,
      type: 'loading_state'
    });
    
    console.log(`[Debug] Loading State: ${state} - ${context} at ${timestamp}`);
    
    // 保留最近50条记录
    if (this.debugInfo.loadingStates.length > 50) {
      this.debugInfo.loadingStates.shift();
    }
  }

  /**
   * 记录API调用
   */
  logApiCall(url, method, params, result = null, error = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      url,
      method,
      params,
      result: result ? 'success' : 'failed',
      error: error ? error.message : null,
      type: 'api_call'
    };
    
    this.debugInfo.apiCalls.push(logEntry);
    
    console.log(`[Debug] API Call: ${method} ${url}`, logEntry);
    
    // 保留最近20条记录
    if (this.debugInfo.apiCalls.length > 20) {
      this.debugInfo.apiCalls.shift();
    }
  }

  /**
   * 记录错误信息
   */
  logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      message: error.message || error,
      stack: error.stack || '',
      context,
      type: 'error'
    };
    
    this.debugInfo.errors.push(errorInfo);
    
    console.error(`[Debug] Error: ${context}`, errorInfo);
    
    // 保留最近30条记录
    if (this.debugInfo.errors.length > 30) {
      this.debugInfo.errors.shift();
    }
  }

  /**
   * 记录数据变化
   */
  logDataChange(dataType, oldValue, newValue, context = '') {
    const timestamp = new Date().toISOString();
    const changeInfo = {
      timestamp,
      dataType,
      oldLength: Array.isArray(oldValue) ? oldValue.length : (oldValue ? 1 : 0),
      newLength: Array.isArray(newValue) ? newValue.length : (newValue ? 1 : 0),
      context,
      type: 'data_change'
    };
    
    this.debugInfo.dataChanges.push(changeInfo);
    
    console.log(`[Debug] Data Change: ${dataType}`, changeInfo);
    
    // 保留最近40条记录
    if (this.debugInfo.dataChanges.length > 40) {
      this.debugInfo.dataChanges.shift();
    }
  }

  /**
   * 检查当前状态
   */
  checkCurrentState(pageData) {
    const issues = [];
    
    // 检查加载状态
    if (pageData.loading && pageData.scheduleList.length > 0) {
      issues.push('Warning: 数据已加载但仍显示loading状态');
    }
    
    // 检查数据一致性
    if (pageData.originalScheduleList.length !== pageData.scheduleList.length) {
      issues.push('Warning: 原始数据与处理后数据长度不一致');
    }
    
    // 检查筛选结果
    if (pageData.filteredScheduleList.length > pageData.originalScheduleList.length) {
      issues.push('Error: 筛选后数据比原始数据多');
    }
    
    // 检查错误状态
    if (pageData.errorState.hasError && pageData.loading) {
      issues.push('Warning: 同时存在错误状态和加载状态');
    }
    
    return {
      issues,
      hasIssues: issues.length > 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成调试报告
   */
  generateReport() {
    return {
      summary: {
        totalLoadingStates: this.debugInfo.loadingStates.length,
        totalApiCalls: this.debugInfo.apiCalls.length,
        totalErrors: this.debugInfo.errors.length,
        totalDataChanges: this.debugInfo.dataChanges.length,
        generatedAt: new Date().toISOString()
      },
      details: this.debugInfo,
      recentActivity: this.getRecentActivity()
    };
  }

  /**
   * 获取最近活动
   */
  getRecentActivity() {
    const allActivities = [
      ...this.debugInfo.loadingStates,
      ...this.debugInfo.apiCalls,
      ...this.debugInfo.errors,
      ...this.debugInfo.dataChanges
    ];
    
    return allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }

  /**
   * 清理调试信息
   */
  clearDebugInfo() {
    this.debugInfo = {
      loadingStates: [],
      apiCalls: [],
      errors: [],
      dataChanges: []
    };
    console.log('[Debug] 调试信息已清理');
  }

  /**
   * 导出调试信息到控制台
   */
  exportToConsole() {
    const report = this.generateReport();
    console.group('📊 日程页面调试报告');
    console.log('📋 概要:', report.summary);
    console.log('🔄 加载状态记录:', report.details.loadingStates);
    console.log('🌐 API调用记录:', report.details.apiCalls);
    console.log('❌ 错误记录:', report.details.errors);
    console.log('📊 数据变化记录:', report.details.dataChanges);
    console.log('⏰ 最近活动:', report.recentActivity);
    console.groupEnd();
    
    return report;
  }

  /**
   * 诊断常见问题
   */
  diagnoseCommonIssues() {
    const diagnosis = [];
    
    // 检查是否有长时间的loading状态
    const recentLoadingStates = this.debugInfo.loadingStates.slice(-10);
    const loadingTrueCount = recentLoadingStates.filter(s => s.state === true).length;
    if (loadingTrueCount > 5) {
      diagnosis.push({
        issue: '疑似loading状态异常',
        description: '最近10次状态变化中有超过5次设置为loading=true',
        suggestion: '检查loadScheduleList方法中的finally块，确保loading状态被正确清除'
      });
    }
    
    // 检查API调用失败率
    const recentApiCalls = this.debugInfo.apiCalls.slice(-5);
    const failedCalls = recentApiCalls.filter(call => call.result === 'failed').length;
    if (failedCalls > 2) {
      diagnosis.push({
        issue: 'API调用失败率过高',
        description: '最近5次API调用中有超过2次失败',
        suggestion: '检查网络连接或API服务状态，可能需要使用模拟数据'
      });
    }
    
    // 检查错误频率
    if (this.debugInfo.errors.length > 3) {
      diagnosis.push({
        issue: '错误发生频率过高',
        description: `发现${this.debugInfo.errors.length}个错误`,
        suggestion: '检查错误日志，修复根本原因'
      });
    }
    
    return diagnosis;
  }
}

// 创建全局实例
const scheduleDebugHelper = new ScheduleDebugHelper();

module.exports = {
  ScheduleDebugHelper,
  scheduleDebugHelper
};