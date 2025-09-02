/**
 * 批量事务日志记录服务
 * 实现事务操作的详细日志记录、审计追踪和日志管理
 */

// 日志级别
export const LOG_LEVEL = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5
};

// 日志类型
export const LOG_TYPE = {
  TRANSACTION: 'transaction',
  OPERATION: 'operation',
  SYSTEM: 'system',
  AUDIT: 'audit',
  PERFORMANCE: 'performance',
  ERROR: 'error'
};

// 日志格式
export const LOG_FORMAT = {
  JSON: 'json',
  TEXT: 'text',
  STRUCTURED: 'structured'
};

class BatchTransactionLogger {
  constructor() {
    this.config = {
      // 日志配置
      logLevel: LOG_LEVEL.INFO,           // 日志级别
      logFormat: LOG_FORMAT.JSON,         // 日志格式
      enableConsoleLog: true,             // 启用控制台日志
      enableFileLog: false,               // 启用文件日志（小程序环境下为localStorage）
      
      // 存储配置
      maxLogEntries: 50000,               // 最大日志条数
      maxLogSize: 100 * 1024 * 1024,      // 最大日志大小(100MB)
      logRetention: 30 * 24 * 60 * 60 * 1000, // 日志保留时间(30天)
      
      // 缓冲配置
      bufferSize: 100,                    // 缓冲区大小
      flushInterval: 5000,                // 刷新间隔(毫秒)
      
      // 压缩配置
      enableCompression: true,            // 启用压缩
      compressionThreshold: 1024,         // 压缩阈值
      
      // 审计配置
      enableAuditTrail: true,             // 启用审计追踪
      auditSensitiveOperations: true      // 审计敏感操作
    };
    
    // 日志存储
    this.logBuffer = [];
    this.logStorage = [];
    this.auditTrail = [];
    
    // 性能指标
    this.metrics = {
      totalLogs: 0,
      errorLogs: 0,
      warningLogs: 0,
      averageLogSize: 0,
      lastFlushTime: Date.now()
    };
    
    // 日志处理器
    this.logHandlers = new Map();
    
    // 启动日志刷新定时器
    this.startLogFlushing();
    
    // 注册默认处理器
    this.registerDefaultHandlers();
  }

  /**
   * 记录事务日志
   * @param {string} transactionId - 事务ID
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   * @param {Object} options - 选项
   * @returns {void}
   */
  logTransaction(transactionId, level, message, data = {}, options = {}) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry({
      type: LOG_TYPE.TRANSACTION,
      level,
      message,
      transactionId,
      data,
      ...options
    });
    
    this.writeLog(logEntry);
    
    // 如果是审计敏感操作，记录到审计追踪
    if (this.config.enableAuditTrail && this.isAuditSensitiveOperation(message, data)) {
      this.recordAuditTrail(logEntry);
    }
  }

  /**
   * 记录操作日志
   * @param {string} transactionId - 事务ID
   * @param {string} operationId - 操作ID
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   * @returns {void}
   */
  logOperation(transactionId, operationId, level, message, data = {}) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry({
      type: LOG_TYPE.OPERATION,
      level,
      message,
      transactionId,
      operationId,
      data
    });
    
    this.writeLog(logEntry);
  }

  /**
   * 记录系统日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   * @returns {void}
   */
  logSystem(level, message, data = {}) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = this.createLogEntry({
      type: LOG_TYPE.SYSTEM,
      level,
      message,
      data
    });
    
    this.writeLog(logEntry);
  }

  /**
   * 记录性能日志
   * @param {string} transactionId - 事务ID
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间
   * @param {Object} metrics - 性能指标
   * @returns {void}
   */
  logPerformance(transactionId, operation, duration, metrics = {}) {
    const logEntry = this.createLogEntry({
      type: LOG_TYPE.PERFORMANCE,
      level: LOG_LEVEL.INFO,
      message: `Performance: ${operation}`,
      transactionId,
      data: {
        operation,
        duration,
        metrics,
        timestamp: Date.now()
      }
    });
    
    this.writeLog(logEntry);
  }

  /**
   * 记录错误日志
   * @param {string} transactionId - 事务ID
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {void}
   */
  logError(transactionId, error, context = {}) {
    const logEntry = this.createLogEntry({
      type: LOG_TYPE.ERROR,
      level: LOG_LEVEL.ERROR,
      message: `Error: ${error.message}`,
      transactionId,
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context
      }
    });
    
    this.writeLog(logEntry);
    this.metrics.errorLogs++;
  }

  /**
   * 批量记录日志
   * @param {Array} logEntries - 日志条目数组
   * @returns {void}
   */
  logBatch(logEntries) {
    for (const entry of logEntries) {
      if (this.shouldLog(entry.level)) {
        const logEntry = this.createLogEntry(entry);
        this.addToBuffer(logEntry);
      }
    }
    
    // 立即刷新缓冲区
    this.flushBuffer();
  }

  /**
   * 查询日志
   * @param {Object} criteria - 查询条件
   * @returns {Array} 日志条目列表
   */
  queryLogs(criteria = {}) {
    let logs = [...this.logStorage];
    
    // 按事务ID过滤
    if (criteria.transactionId) {
      logs = logs.filter(log => log.transactionId === criteria.transactionId);
    }
    
    // 按日志类型过滤
    if (criteria.type) {
      logs = logs.filter(log => log.type === criteria.type);
    }
    
    // 按日志级别过滤
    if (criteria.level !== undefined) {
      logs = logs.filter(log => log.level >= criteria.level);
    }
    
    // 按时间范围过滤
    if (criteria.startTime) {
      logs = logs.filter(log => log.timestamp >= criteria.startTime);
    }
    
    if (criteria.endTime) {
      logs = logs.filter(log => log.timestamp <= criteria.endTime);
    }
    
    // 按关键词搜索
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(keyword) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(keyword))
      );
    }
    
    // 排序
    const sortField = criteria.sortField || 'timestamp';
    const sortOrder = criteria.sortOrder || 'desc';
    
    logs.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    // 分页
    const limit = criteria.limit || 100;
    const offset = criteria.offset || 0;
    
    return logs.slice(offset, offset + limit);
  }

  /**
   * 获取审计追踪
   * @param {Object} criteria - 查询条件
   * @returns {Array} 审计记录列表
   */
  getAuditTrail(criteria = {}) {
    let auditLogs = [...this.auditTrail];
    
    // 按事务ID过滤
    if (criteria.transactionId) {
      auditLogs = auditLogs.filter(log => log.transactionId === criteria.transactionId);
    }
    
    // 按时间范围过滤
    if (criteria.startTime) {
      auditLogs = auditLogs.filter(log => log.timestamp >= criteria.startTime);
    }
    
    if (criteria.endTime) {
      auditLogs = auditLogs.filter(log => log.timestamp <= criteria.endTime);
    }
    
    return auditLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 导出日志
   * @param {Object} criteria - 导出条件
   * @param {string} format - 导出格式
   * @returns {string} 导出的日志内容
   */
  exportLogs(criteria = {}, format = 'json') {
    const logs = this.queryLogs(criteria);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.exportToCSV(logs);
      
      case 'text':
        return this.exportToText(logs);
      
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 清理过期日志
   * @returns {Object} 清理结果
   */
  cleanupLogs() {
    const now = Date.now();
    const cutoffTime = now - this.config.logRetention;
    
    const originalCount = this.logStorage.length;
    
    // 清理过期日志
    this.logStorage = this.logStorage.filter(log => log.timestamp >= cutoffTime);
    
    // 清理过期审计记录
    this.auditTrail = this.auditTrail.filter(audit => audit.timestamp >= cutoffTime);
    
    const cleanedCount = originalCount - this.logStorage.length;
    
    console.log(`[TransactionLogger] 清理了 ${cleanedCount} 条过期日志`);
    
    return {
      originalCount,
      remainingCount: this.logStorage.length,
      cleanedCount
    };
  }

  /**
   * 获取日志统计
   * @returns {Object} 日志统计信息
   */
  getLogStatistics() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // 基本统计
    const basicStats = { ...this.metrics };
    
    // 按类型统计
    const typeStats = {};
    const levelStats = {};
    
    for (const log of this.logStorage) {
      // 类型统计
      typeStats[log.type] = (typeStats[log.type] || 0) + 1;
      
      // 级别统计
      const levelName = this.getLevelName(log.level);
      levelStats[levelName] = (levelStats[levelName] || 0) + 1;
    }
    
    // 最近24小时统计
    const recentLogs = this.logStorage.filter(log => log.timestamp >= oneDayAgo);
    
    return {
      ...basicStats,
      totalStoredLogs: this.logStorage.length,
      bufferSize: this.logBuffer.length,
      auditTrailSize: this.auditTrail.length,
      typeStats,
      levelStats,
      recentStats: {
        count: recentLogs.length,
        errorCount: recentLogs.filter(log => log.level === LOG_LEVEL.ERROR).length,
        warningCount: recentLogs.filter(log => log.level === LOG_LEVEL.WARN).length
      }
    };
  }

  // ===== 内部方法 =====

  createLogEntry(entry) {
    const timestamp = Date.now();
    
    const logEntry = {
      id: this.generateLogId(),
      timestamp,
      type: entry.type || LOG_TYPE.SYSTEM,
      level: entry.level || LOG_LEVEL.INFO,
      message: entry.message || '',
      transactionId: entry.transactionId || null,
      operationId: entry.operationId || null,
      
      // 上下文信息
      context: {
        userAgent: wx.getSystemInfoSync ? wx.getSystemInfoSync().platform : 'unknown',
        appVersion: wx.getAccountInfoSync ? wx.getAccountInfoSync().miniProgram.version : 'unknown',
        timestamp: new Date(timestamp).toISOString()
      },
      
      // 数据
      data: entry.data || {},
      
      // 格式化消息
      formattedMessage: this.formatLogMessage(entry.level, entry.message, entry.data)
    };
    
    // 计算日志大小
    logEntry.size = JSON.stringify(logEntry).length;
    
    return logEntry;
  }

  shouldLog(level) {
    return level >= this.config.logLevel;
  }

  writeLog(logEntry) {
    // 更新指标
    this.metrics.totalLogs++;
    this.updateAverageLogSize(logEntry.size);
    
    if (logEntry.level === LOG_LEVEL.WARN) {
      this.metrics.warningLogs++;
    }
    
    // 添加到缓冲区
    this.addToBuffer(logEntry);
    
    // 控制台输出
    if (this.config.enableConsoleLog) {
      this.writeToConsole(logEntry);
    }
    
    // 调用自定义处理器
    this.callLogHandlers(logEntry);
  }

  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // 检查缓冲区大小
    if (this.logBuffer.length >= this.config.bufferSize) {
      this.flushBuffer();
    }
  }

  flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    console.log(`[TransactionLogger] 刷新日志缓冲区, 条数: ${this.logBuffer.length}`);
    
    // 将缓冲区内容移动到存储
    this.logStorage.push(...this.logBuffer);
    this.logBuffer = [];
    
    // 检查存储大小
    this.checkStorageSize();
    
    // 更新刷新时间
    this.metrics.lastFlushTime = Date.now();
    
    // 持久化到本地存储（如果启用）
    if (this.config.enableFileLog) {
      this.persistToStorage();
    }
  }

  startLogFlushing() {
    setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  writeToConsole(logEntry) {
    const message = logEntry.formattedMessage;
    
    switch (logEntry.level) {
      case LOG_LEVEL.TRACE:
      case LOG_LEVEL.DEBUG:
        console.debug(message, logEntry.data);
        break;
      case LOG_LEVEL.INFO:
        console.info(message, logEntry.data);
        break;
      case LOG_LEVEL.WARN:
        console.warn(message, logEntry.data);
        break;
      case LOG_LEVEL.ERROR:
      case LOG_LEVEL.FATAL:
        console.error(message, logEntry.data);
        break;
    }
  }

  formatLogMessage(level, message, data) {
    const levelName = this.getLevelName(level);
    const timestamp = new Date().toISOString();
    
    switch (this.config.logFormat) {
      case LOG_FORMAT.JSON:
        return JSON.stringify({ level: levelName, message, timestamp, data });
      
      case LOG_FORMAT.STRUCTURED:
        return `[${timestamp}] [${levelName}] ${message}`;
      
      case LOG_FORMAT.TEXT:
      default:
        return `${timestamp} ${levelName}: ${message}`;
    }
  }

  getLevelName(level) {
    const levelNames = {
      [LOG_LEVEL.TRACE]: 'TRACE',
      [LOG_LEVEL.DEBUG]: 'DEBUG',
      [LOG_LEVEL.INFO]: 'INFO',
      [LOG_LEVEL.WARN]: 'WARN',
      [LOG_LEVEL.ERROR]: 'ERROR',
      [LOG_LEVEL.FATAL]: 'FATAL'
    };
    
    return levelNames[level] || 'UNKNOWN';
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  updateAverageLogSize(size) {
    if (this.metrics.totalLogs === 1) {
      this.metrics.averageLogSize = size;
    } else {
      this.metrics.averageLogSize = (
        (this.metrics.averageLogSize * (this.metrics.totalLogs - 1) + size) / this.metrics.totalLogs
      );
    }
  }

  checkStorageSize() {
    // 检查日志条数
    if (this.logStorage.length > this.config.maxLogEntries) {
      const removeCount = this.logStorage.length - this.config.maxLogEntries;
      this.logStorage.splice(0, removeCount);
      console.log(`[TransactionLogger] 移除了 ${removeCount} 条旧日志`);
    }
    
    // 检查总大小（粗略估算）
    const estimatedSize = this.logStorage.length * this.metrics.averageLogSize;
    if (estimatedSize > this.config.maxLogSize) {
      const removeCount = Math.floor(this.logStorage.length * 0.2); // 移除20%
      this.logStorage.splice(0, removeCount);
      console.log(`[TransactionLogger] 因大小限制移除了 ${removeCount} 条日志`);
    }
  }

  isAuditSensitiveOperation(message, data) {
    if (!this.config.auditSensitiveOperations) return false;
    
    // 定义敏感操作关键词
    const sensitiveKeywords = [
      'transaction_started',
      'transaction_committed',
      'transaction_rolled_back',
      'permission_check',
      'user_operation',
      'data_modification'
    ];
    
    const messageText = message.toLowerCase();
    return sensitiveKeywords.some(keyword => messageText.includes(keyword));
  }

  recordAuditTrail(logEntry) {
    const auditEntry = {
      id: this.generateLogId(),
      timestamp: logEntry.timestamp,
      transactionId: logEntry.transactionId,
      operationId: logEntry.operationId,
      action: logEntry.message,
      level: logEntry.level,
      data: logEntry.data,
      context: logEntry.context
    };
    
    this.auditTrail.push(auditEntry);
    
    // 限制审计追踪大小
    if (this.auditTrail.length > 10000) {
      this.auditTrail = this.auditTrail.slice(-5000);
    }
  }

  registerDefaultHandlers() {
    // 注册错误处理器
    this.registerLogHandler('error_handler', (logEntry) => {
      if (logEntry.level >= LOG_LEVEL.ERROR) {
        // 可以在这里添加错误报告逻辑
        this.handleError(logEntry);
      }
    });
    
    // 注册性能监控处理器
    this.registerLogHandler('performance_monitor', (logEntry) => {
      if (logEntry.type === LOG_TYPE.PERFORMANCE) {
        this.handlePerformanceLog(logEntry);
      }
    });
  }

  registerLogHandler(name, handler) {
    this.logHandlers.set(name, handler);
  }

  callLogHandlers(logEntry) {
    for (const [name, handler] of this.logHandlers) {
      try {
        handler(logEntry);
      } catch (error) {
        console.error(`[TransactionLogger] 日志处理器 ${name} 执行失败:`, error);
      }
    }
  }

  handleError(logEntry) {
    // 错误处理逻辑
    if (logEntry.level === LOG_LEVEL.FATAL) {
      // 致命错误的特殊处理
      console.error('[FATAL ERROR]', logEntry);
    }
  }

  handlePerformanceLog(logEntry) {
    // 性能日志处理逻辑
    const { duration, operation } = logEntry.data;
    
    if (duration > 10000) { // 超过10秒
      console.warn(`[PERFORMANCE WARNING] ${operation} took ${duration}ms`);
    }
  }

  persistToStorage() {
    try {
      // 在小程序环境中使用本地存储
      const logData = {
        logs: this.logStorage.slice(-1000), // 只保存最近1000条
        auditTrail: this.auditTrail.slice(-500), // 只保存最近500条审计记录
        metrics: this.metrics,
        timestamp: Date.now()
      };
      
      wx.setStorageSync('batch_transaction_logs', logData);
    } catch (error) {
      console.error('[TransactionLogger] 持久化日志失败:', error);
    }
  }

  loadFromStorage() {
    try {
      const logData = wx.getStorageSync('batch_transaction_logs');
      if (logData) {
        this.logStorage = logData.logs || [];
        this.auditTrail = logData.auditTrail || [];
        this.metrics = { ...this.metrics, ...logData.metrics };
        
        console.log(`[TransactionLogger] 从存储加载了 ${this.logStorage.length} 条日志`);
      }
    } catch (error) {
      console.error('[TransactionLogger] 加载日志失败:', error);
    }
  }

  exportToCSV(logs) {
    const headers = ['Timestamp', 'Level', 'Type', 'Transaction ID', 'Message', 'Data'];
    const csvRows = [headers.join(',')];
    
    for (const log of logs) {
      const row = [
        new Date(log.timestamp).toISOString(),
        this.getLevelName(log.level),
        log.type,
        log.transactionId || '',
        `"${log.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.data).replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  exportToText(logs) {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = this.getLevelName(log.level);
      const txId = log.transactionId || 'N/A';
      
      return `[${timestamp}] [${level}] [${log.type}] [TX:${txId}] ${log.message}`;
    }).join('\n');
  }

  /**
   * 设置日志级别
   * @param {number} level - 日志级别
   */
  setLogLevel(level) {
    this.config.logLevel = level;
    console.log(`[TransactionLogger] 日志级别设置为: ${this.getLevelName(level)}`);
  }

  /**
   * 启用/禁用日志记录
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.config.logLevel = enabled ? LOG_LEVEL.INFO : LOG_LEVEL.FATAL + 1;
    console.log(`[TransactionLogger] 日志记录${enabled ? '已启用' : '已禁用'}`);
  }
}

// 导出服务实例
export default BatchTransactionLogger;
export const batchTransactionLogger = new BatchTransactionLogger();

// 初始化时从存储加载日志
batchTransactionLogger.loadFromStorage();