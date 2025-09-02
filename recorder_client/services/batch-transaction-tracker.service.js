/**
 * 批量事务状态追踪服务
 * 实现事务状态的实时追踪、监控和报告
 */

import { batchTransactionService, TRANSACTION_STATUS } from './batch-transaction.service.js';
import { distributedTransactionManager } from './distributed-transaction-manager.service.js';

// 追踪事件类型
export const TRACKING_EVENT = {
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_STARTED: 'transaction_started',
  TRANSACTION_PROGRESS: 'transaction_progress',
  TRANSACTION_COMPLETED: 'transaction_completed',
  TRANSACTION_FAILED: 'transaction_failed',
  TRANSACTION_ROLLED_BACK: 'transaction_rolled_back',
  OPERATION_SUCCESS: 'operation_success',
  OPERATION_FAILED: 'operation_failed'
};

// 监控指标类型
export const METRIC_TYPE = {
  PERFORMANCE: 'performance',
  SUCCESS_RATE: 'success_rate',
  ERROR_RATE: 'error_rate',
  THROUGHPUT: 'throughput',
  RESOURCE_USAGE: 'resource_usage'
};

class BatchTransactionTracker {
  constructor() {
    this.config = {
      // 追踪配置
      trackingEnabled: true,           // 启用追踪
      realTimeUpdates: true,          // 实时更新
      maxTrackingHistory: 10000,      // 最大追踪历史数
      metricsRetention: 24 * 60 * 60 * 1000, // 指标保留时间(24小时)
      
      // 监控配置
      monitoringInterval: 5000,       // 监控间隔(毫秒)
      alertThresholds: {
        errorRate: 0.1,               // 错误率阈值(10%)
        avgDuration: 60000,           // 平均耗时阈值(1分钟)
        maxActiveTransactions: 50     // 最大活跃事务数
      },
      
      // 报告配置
      enableReports: true,            // 启用报告
      reportInterval: 60000,          // 报告间隔(1分钟)
      reportRetention: 7 * 24 * 60 * 60 * 1000 // 报告保留时间(7天)
    };
    
    // 追踪数据存储
    this.trackingHistory = [];
    this.activeTransactions = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.reports = [];
    
    // 订阅者列表
    this.subscribers = new Map();
    
    // 性能统计
    this.statistics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageDuration: 0,
      throughput: 0,
      lastResetTime: Date.now()
    };
    
    // 启动监控
    this.startMonitoring();
  }

  /**
   * 开始追踪事务
   * @param {string} transactionId - 事务ID
   * @param {Object} transactionInfo - 事务信息
   * @returns {void}
   */
  startTracking(transactionId, transactionInfo) {
    if (!this.config.trackingEnabled) return;
    
    console.log(`[TransactionTracker] 开始追踪事务: ${transactionId}`);
    
    const trackingInfo = {
      transactionId,
      type: transactionInfo.type,
      status: TRANSACTION_STATUS.PENDING,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      
      // 进度信息
      progress: {
        total: transactionInfo.itemCount || 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percentage: 0
      },
      
      // 性能指标
      metrics: {
        throughput: 0,
        averageOperationTime: 0,
        errorRate: 0,
        resourceUsage: {}
      },
      
      // 状态历史
      statusHistory: [{
        status: TRANSACTION_STATUS.PENDING,
        timestamp: Date.now(),
        message: '事务已创建'
      }],
      
      // 事件列表
      events: [],
      
      // 错误信息
      errors: [],
      
      // 标签和元数据
      tags: transactionInfo.tags || [],
      metadata: transactionInfo.metadata || {}
    };
    
    // 存储追踪信息
    this.activeTransactions.set(transactionId, trackingInfo);
    
    // 触发追踪事件
    this.emitTrackingEvent(TRACKING_EVENT.TRANSACTION_CREATED, {
      transactionId,
      trackingInfo
    });
    
    // 更新统计
    this.statistics.totalTransactions++;
  }

  /**
   * 更新事务状态
   * @param {string} transactionId - 事务ID
   * @param {string} status - 新状态
   * @param {Object} details - 详细信息
   * @returns {void}
   */
  updateTransactionStatus(transactionId, status, details = {}) {
    const trackingInfo = this.activeTransactions.get(transactionId);
    if (!trackingInfo) return;
    
    const oldStatus = trackingInfo.status;
    trackingInfo.status = status;
    
    // 记录状态变更
    trackingInfo.statusHistory.push({
      status,
      timestamp: Date.now(),
      message: details.message || `状态从 ${oldStatus} 变更为 ${status}`,
      details
    });
    
    // 更新结束时间和持续时间
    if (status === TRANSACTION_STATUS.COMMITTED || 
        status === TRANSACTION_STATUS.FAILED || 
        status === TRANSACTION_STATUS.ROLLED_BACK) {
      trackingInfo.endTime = Date.now();
      trackingInfo.duration = trackingInfo.endTime - trackingInfo.startTime;
      
      // 更新统计
      if (status === TRANSACTION_STATUS.COMMITTED) {
        this.statistics.successfulTransactions++;
      } else {
        this.statistics.failedTransactions++;
      }
      
      // 计算平均持续时间
      this.updateAverageDuration(trackingInfo.duration);
      
      // 移除活跃事务追踪
      this.completeTracking(transactionId);
    }
    
    // 触发状态更新事件
    this.emitTrackingEvent(TRACKING_EVENT.TRANSACTION_PROGRESS, {
      transactionId,
      oldStatus,
      newStatus: status,
      trackingInfo,
      details
    });
    
    console.log(`[TransactionTracker] 事务 ${transactionId} 状态更新: ${oldStatus} -> ${status}`);
  }

  /**
   * 更新事务进度
   * @param {string} transactionId - 事务ID
   * @param {Object} progress - 进度信息
   * @returns {void}
   */
  updateTransactionProgress(transactionId, progress) {
    const trackingInfo = this.activeTransactions.get(transactionId);
    if (!trackingInfo) return;
    
    // 更新进度信息
    Object.assign(trackingInfo.progress, progress);
    
    // 计算百分比
    if (trackingInfo.progress.total > 0) {
      trackingInfo.progress.percentage = Math.round(
        (trackingInfo.progress.processed / trackingInfo.progress.total) * 100
      );
    }
    
    // 计算吞吐量
    const currentTime = Date.now();
    const elapsedTime = currentTime - trackingInfo.startTime;
    if (elapsedTime > 0) {
      trackingInfo.metrics.throughput = (trackingInfo.progress.processed / elapsedTime) * 1000; // 每秒处理数
    }
    
    // 计算错误率
    if (trackingInfo.progress.processed > 0) {
      trackingInfo.metrics.errorRate = trackingInfo.progress.failed / trackingInfo.progress.processed;
    }
    
    // 触发进度更新事件
    this.emitTrackingEvent(TRACKING_EVENT.TRANSACTION_PROGRESS, {
      transactionId,
      progress: trackingInfo.progress,
      metrics: trackingInfo.metrics
    });
    
    // 实时更新
    if (this.config.realTimeUpdates) {
      this.notifySubscribers(transactionId, 'progress', trackingInfo);
    }
  }

  /**
   * 记录事务事件
   * @param {string} transactionId - 事务ID
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   * @returns {void}
   */
  recordTransactionEvent(transactionId, eventType, eventData = {}) {
    const trackingInfo = this.activeTransactions.get(transactionId);
    if (!trackingInfo) return;
    
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: { ...eventData }
    };
    
    trackingInfo.events.push(event);
    
    // 如果是错误事件，记录到错误列表
    if (eventType === TRACKING_EVENT.OPERATION_FAILED) {
      trackingInfo.errors.push({
        timestamp: event.timestamp,
        error: eventData.error,
        operation: eventData.operation,
        details: eventData.details
      });
    }
    
    // 触发事件
    this.emitTrackingEvent(eventType, {
      transactionId,
      event,
      trackingInfo
    });
  }

  /**
   * 完成事务追踪
   * @param {string} transactionId - 事务ID
   * @returns {void}
   */
  completeTracking(transactionId) {
    const trackingInfo = this.activeTransactions.get(transactionId);
    if (!trackingInfo) return;
    
    console.log(`[TransactionTracker] 完成事务追踪: ${transactionId}`);
    
    // 生成最终报告
    const finalReport = this.generateTransactionReport(trackingInfo);
    
    // 移动到历史记录
    this.trackingHistory.push({
      ...trackingInfo,
      finalReport,
      completedAt: Date.now()
    });
    
    // 从活跃追踪中移除
    this.activeTransactions.delete(transactionId);
    
    // 清理过期历史记录
    this.cleanupHistory();
    
    // 触发完成事件
    this.emitTrackingEvent(TRACKING_EVENT.TRANSACTION_COMPLETED, {
      transactionId,
      finalReport
    });
  }

  /**
   * 订阅事务追踪更新
   * @param {string} subscriberId - 订阅者ID
   * @param {Function} callback - 回调函数
   * @param {Object} options - 订阅选项
   * @returns {void}
   */
  subscribe(subscriberId, callback, options = {}) {
    this.subscribers.set(subscriberId, {
      callback,
      options,
      subscribeTime: Date.now()
    });
    
    console.log(`[TransactionTracker] 新增订阅者: ${subscriberId}`);
  }

  /**
   * 取消订阅
   * @param {string} subscriberId - 订阅者ID
   * @returns {void}
   */
  unsubscribe(subscriberId) {
    const removed = this.subscribers.delete(subscriberId);
    if (removed) {
      console.log(`[TransactionTracker] 移除订阅者: ${subscriberId}`);
    }
  }

  /**
   * 获取事务追踪信息
   * @param {string} transactionId - 事务ID
   * @returns {Object|null} 追踪信息
   */
  getTransactionTracking(transactionId) {
    // 先查找活跃事务
    const activeTracking = this.activeTransactions.get(transactionId);
    if (activeTracking) {
      return { ...activeTracking };
    }
    
    // 查找历史记录
    const historicalTracking = this.trackingHistory.find(
      track => track.transactionId === transactionId
    );
    
    return historicalTracking ? { ...historicalTracking } : null;
  }

  /**
   * 获取所有活跃事务追踪
   * @returns {Array} 活跃事务追踪列表
   */
  getActiveTransactionTrackings() {
    return Array.from(this.activeTransactions.values()).map(tracking => ({
      transactionId: tracking.transactionId,
      type: tracking.type,
      status: tracking.status,
      startTime: tracking.startTime,
      duration: Date.now() - tracking.startTime,
      progress: { ...tracking.progress },
      metrics: { ...tracking.metrics }
    }));
  }

  /**
   * 获取统计信息
   * @param {Object} options - 选项
   * @returns {Object} 统计信息
   */
  getStatistics(options = {}) {
    const now = Date.now();
    const timeRange = options.timeRange || (24 * 60 * 60 * 1000); // 默认24小时
    
    // 基本统计
    const basicStats = { ...this.statistics };
    
    // 计算成功率
    const totalCompleted = this.statistics.successfulTransactions + this.statistics.failedTransactions;
    basicStats.successRate = totalCompleted > 0 ? 
      this.statistics.successfulTransactions / totalCompleted : 0;
    
    // 计算错误率
    basicStats.errorRate = 1 - basicStats.successRate;
    
    // 当前活跃事务数
    basicStats.activeTransactions = this.activeTransactions.size;
    
    // 时间范围内的统计
    const recentHistory = this.trackingHistory.filter(
      track => (now - track.completedAt) <= timeRange
    );
    
    basicStats.recentTransactions = recentHistory.length;
    basicStats.recentSuccessRate = this.calculateSuccessRate(recentHistory);
    basicStats.recentAverageDuration = this.calculateAverageDuration(recentHistory);
    
    return basicStats;
  }

  /**
   * 生成性能报告
   * @param {Object} options - 报告选项
   * @returns {Object} 性能报告
   */
  generatePerformanceReport(options = {}) {
    const timeRange = options.timeRange || (24 * 60 * 60 * 1000);
    const now = Date.now();
    
    // 获取时间范围内的数据
    const recentTransactions = this.trackingHistory.filter(
      track => (now - track.completedAt) <= timeRange
    );
    
    const report = {
      reportId: `perf_${Date.now()}`,
      generatedAt: now,
      timeRange,
      
      // 基本指标
      totalTransactions: recentTransactions.length,
      successfulTransactions: recentTransactions.filter(t => t.status === TRANSACTION_STATUS.COMMITTED).length,
      failedTransactions: recentTransactions.filter(t => t.status === TRANSACTION_STATUS.FAILED).length,
      
      // 性能指标
      averageDuration: this.calculateAverageDuration(recentTransactions),
      medianDuration: this.calculateMedianDuration(recentTransactions),
      maxDuration: this.calculateMaxDuration(recentTransactions),
      minDuration: this.calculateMinDuration(recentTransactions),
      
      // 吞吐量指标
      throughput: this.calculateThroughput(recentTransactions, timeRange),
      peakThroughput: this.calculatePeakThroughput(recentTransactions),
      
      // 错误分析
      errorAnalysis: this.analyzeErrors(recentTransactions),
      
      // 趋势分析
      trends: this.analyzeTrends(recentTransactions),
      
      // 建议
      recommendations: this.generateRecommendations(recentTransactions)
    };
    
    // 存储报告
    this.reports.push(report);
    this.cleanupReports();
    
    return report;
  }

  // ===== 内部方法 =====

  startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
      this.checkAlertConditions();
      this.generatePeriodicReport();
    }, this.config.monitoringInterval);
  }

  collectMetrics() {
    const now = Date.now();
    
    // 收集当前指标
    const currentMetrics = {
      timestamp: now,
      activeTransactions: this.activeTransactions.size,
      averageDuration: this.statistics.averageDuration,
      successRate: this.calculateCurrentSuccessRate(),
      errorRate: this.calculateCurrentErrorRate(),
      throughput: this.calculateCurrentThroughput()
    };
    
    // 存储指标
    this.metrics.set(now, currentMetrics);
    
    // 清理过期指标
    this.cleanupMetrics();
  }

  checkAlertConditions() {
    const thresholds = this.config.alertThresholds;
    const currentStats = this.getStatistics();
    
    // 检查错误率
    if (currentStats.errorRate > thresholds.errorRate) {
      this.generateAlert('HIGH_ERROR_RATE', {
        currentRate: currentStats.errorRate,
        threshold: thresholds.errorRate
      });
    }
    
    // 检查平均耗时
    if (currentStats.averageDuration > thresholds.avgDuration) {
      this.generateAlert('HIGH_AVERAGE_DURATION', {
        currentDuration: currentStats.averageDuration,
        threshold: thresholds.avgDuration
      });
    }
    
    // 检查活跃事务数
    if (currentStats.activeTransactions > thresholds.maxActiveTransactions) {
      this.generateAlert('TOO_MANY_ACTIVE_TRANSACTIONS', {
        currentCount: currentStats.activeTransactions,
        threshold: thresholds.maxActiveTransactions
      });
    }
  }

  generateAlert(type, data) {
    const alert = {
      id: `alert_${Date.now()}`,
      type,
      severity: this.determineAlertSeverity(type),
      timestamp: Date.now(),
      data,
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    console.warn(`[TransactionTracker] 生成告警: ${type}`, data);
    
    // 触发告警事件
    this.emitTrackingEvent('ALERT_GENERATED', alert);
  }

  generatePeriodicReport() {
    if (!this.config.enableReports) return;
    
    const now = Date.now();
    const lastReport = this.reports[this.reports.length - 1];
    
    if (!lastReport || (now - lastReport.generatedAt) >= this.config.reportInterval) {
      this.generatePerformanceReport();
    }
  }

  emitTrackingEvent(eventType, data) {
    // 通知所有订阅者
    for (const [subscriberId, subscriber] of this.subscribers) {
      try {
        const { callback, options } = subscriber;
        
        // 检查订阅者是否关心此类事件
        if (options.events && !options.events.includes(eventType)) {
          continue;
        }
        
        callback(eventType, data);
      } catch (error) {
        console.error(`[TransactionTracker] 通知订阅者 ${subscriberId} 失败:`, error);
      }
    }
  }

  notifySubscribers(transactionId, updateType, data) {
    this.emitTrackingEvent('REAL_TIME_UPDATE', {
      transactionId,
      updateType,
      data
    });
  }

  generateTransactionReport(trackingInfo) {
    return {
      transactionId: trackingInfo.transactionId,
      type: trackingInfo.type,
      status: trackingInfo.status,
      duration: trackingInfo.duration,
      
      // 性能摘要
      performance: {
        throughput: trackingInfo.metrics.throughput,
        errorRate: trackingInfo.metrics.errorRate,
        averageOperationTime: trackingInfo.metrics.averageOperationTime
      },
      
      // 进度摘要
      progressSummary: {
        totalItems: trackingInfo.progress.total,
        processedItems: trackingInfo.progress.processed,
        successfulItems: trackingInfo.progress.succeeded,
        failedItems: trackingInfo.progress.failed,
        successRate: trackingInfo.progress.total > 0 ? 
          trackingInfo.progress.succeeded / trackingInfo.progress.total : 0
      },
      
      // 事件统计
      eventStats: {
        totalEvents: trackingInfo.events.length,
        errorCount: trackingInfo.errors.length,
        statusChanges: trackingInfo.statusHistory.length
      },
      
      // 时间分析
      timeAnalysis: {
        startTime: trackingInfo.startTime,
        endTime: trackingInfo.endTime,
        duration: trackingInfo.duration,
        avgTimePerItem: trackingInfo.progress.total > 0 ?
          trackingInfo.duration / trackingInfo.progress.total : 0
      }
    };
  }

  updateAverageDuration(newDuration) {
    const totalCompleted = this.statistics.successfulTransactions + this.statistics.failedTransactions;
    if (totalCompleted === 1) {
      this.statistics.averageDuration = newDuration;
    } else {
      this.statistics.averageDuration = (
        (this.statistics.averageDuration * (totalCompleted - 1) + newDuration) / totalCompleted
      );
    }
  }

  calculateSuccessRate(transactions) {
    if (transactions.length === 0) return 0;
    
    const successful = transactions.filter(t => t.status === TRANSACTION_STATUS.COMMITTED).length;
    return successful / transactions.length;
  }

  calculateAverageDuration(transactions) {
    if (transactions.length === 0) return 0;
    
    const totalDuration = transactions.reduce((sum, t) => sum + (t.duration || 0), 0);
    return totalDuration / transactions.length;
  }

  calculateMedianDuration(transactions) {
    if (transactions.length === 0) return 0;
    
    const durations = transactions.map(t => t.duration || 0).sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    
    return durations.length % 2 === 0 ?
      (durations[mid - 1] + durations[mid]) / 2 :
      durations[mid];
  }

  calculateMaxDuration(transactions) {
    if (transactions.length === 0) return 0;
    return Math.max(...transactions.map(t => t.duration || 0));
  }

  calculateMinDuration(transactions) {
    if (transactions.length === 0) return 0;
    return Math.min(...transactions.map(t => t.duration || 0));
  }

  calculateThroughput(transactions, timeRange) {
    if (transactions.length === 0 || timeRange <= 0) return 0;
    return (transactions.length / timeRange) * 1000; // 每秒事务数
  }

  calculatePeakThroughput(transactions) {
    // 简化实现：计算每小时峰值
    const hourlyGroups = new Map();
    
    transactions.forEach(t => {
      const hour = Math.floor(t.startTime / (60 * 60 * 1000));
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, 0);
      }
      hourlyGroups.set(hour, hourlyGroups.get(hour) + 1);
    });
    
    return Math.max(...Array.from(hourlyGroups.values()), 0) / 3600; // 每秒峰值
  }

  analyzeErrors(transactions) {
    const errorTransactions = transactions.filter(t => t.status === TRANSACTION_STATUS.FAILED);
    const errorTypes = new Map();
    
    errorTransactions.forEach(t => {
      t.errors.forEach(error => {
        const errorType = error.error || 'Unknown';
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      });
    });
    
    return {
      totalErrors: errorTransactions.length,
      errorRate: transactions.length > 0 ? errorTransactions.length / transactions.length : 0,
      errorTypes: Object.fromEntries(errorTypes),
      topErrors: Array.from(errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  analyzeTrends(transactions) {
    // 简化的趋势分析
    const timePoints = 10;
    const timeWindow = Date.now() - (24 * 60 * 60 * 1000); // 24小时
    const windowSize = (24 * 60 * 60 * 1000) / timePoints;
    
    const trends = [];
    
    for (let i = 0; i < timePoints; i++) {
      const windowStart = timeWindow + (i * windowSize);
      const windowEnd = windowStart + windowSize;
      
      const windowTransactions = transactions.filter(t => 
        t.startTime >= windowStart && t.startTime < windowEnd
      );
      
      trends.push({
        timeWindow: windowStart,
        transactionCount: windowTransactions.length,
        successRate: this.calculateSuccessRate(windowTransactions),
        averageDuration: this.calculateAverageDuration(windowTransactions)
      });
    }
    
    return trends;
  }

  generateRecommendations(transactions) {
    const recommendations = [];
    const errorAnalysis = this.analyzeErrors(transactions);
    const avgDuration = this.calculateAverageDuration(transactions);
    
    // 基于错误率的建议
    if (errorAnalysis.errorRate > 0.1) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: `错误率较高(${(errorAnalysis.errorRate * 100).toFixed(1)}%)，建议检查常见错误原因`,
        action: '分析错误日志并优化错误处理'
      });
    }
    
    // 基于性能的建议
    if (avgDuration > 30000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `平均执行时间较长(${(avgDuration / 1000).toFixed(1)}秒)，建议优化性能`,
        action: '检查批量操作大小和并发配置'
      });
    }
    
    // 基于活跃事务数的建议
    if (this.activeTransactions.size > 20) {
      recommendations.push({
        type: 'concurrency',
        priority: 'medium',
        message: `活跃事务数较多(${this.activeTransactions.size})，可能存在资源竞争`,
        action: '考虑调整并发控制策略'
      });
    }
    
    return recommendations;
  }

  cleanupHistory() {
    if (this.trackingHistory.length > this.config.maxTrackingHistory) {
      this.trackingHistory = this.trackingHistory.slice(-this.config.maxTrackingHistory);
    }
  }

  cleanupMetrics() {
    const cutoffTime = Date.now() - this.config.metricsRetention;
    
    for (const [timestamp, metrics] of this.metrics) {
      if (timestamp < cutoffTime) {
        this.metrics.delete(timestamp);
      }
    }
  }

  cleanupReports() {
    const cutoffTime = Date.now() - this.config.reportRetention;
    
    this.reports = this.reports.filter(report => 
      report.generatedAt >= cutoffTime
    );
  }

  calculateCurrentSuccessRate() {
    const recentTransactions = this.trackingHistory.slice(-100); // 最近100个事务
    return this.calculateSuccessRate(recentTransactions);
  }

  calculateCurrentErrorRate() {
    return 1 - this.calculateCurrentSuccessRate();
  }

  calculateCurrentThroughput() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentTransactions = this.trackingHistory.filter(t => 
      t.completedAt >= oneMinuteAgo
    );
    
    return recentTransactions.length / 60; // 每秒事务数
  }

  determineAlertSeverity(alertType) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'critical',
      'HIGH_AVERAGE_DURATION': 'warning',
      'TOO_MANY_ACTIVE_TRANSACTIONS': 'warning'
    };
    
    return severityMap[alertType] || 'info';
  }

  /**
   * 获取实时监控数据
   * @returns {Object} 实时监控数据
   */
  getRealTimeMonitoringData() {
    return {
      activeTransactions: this.getActiveTransactionTrackings(),
      statistics: this.getStatistics(),
      recentAlerts: this.alerts.slice(-10),
      currentMetrics: this.getCurrentMetrics()
    };
  }

  getCurrentMetrics() {
    const latestMetrics = Array.from(this.metrics.values()).slice(-1)[0];
    return latestMetrics || {};
  }
}

// 导出服务实例
export default BatchTransactionTracker;
export const batchTransactionTracker = new BatchTransactionTracker();