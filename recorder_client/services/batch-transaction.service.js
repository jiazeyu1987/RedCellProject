/**
 * 批量操作事务处理服务
 * 实现批量操作的原子性、事务管理、回滚机制等
 */

import { TIME_ADJUST_CONFIG } from '../constants/time-adjust-config.js';

// 事务状态枚举
export const TRANSACTION_STATUS = {
  PENDING: 'pending',           // 待处理
  RUNNING: 'running',          // 执行中
  COMMITTED: 'committed',      // 已提交
  ROLLED_BACK: 'rolled_back',  // 已回滚
  FAILED: 'failed',           // 失败
  TIMEOUT: 'timeout'          // 超时
};

// 事务类型枚举
export const TRANSACTION_TYPE = {
  BATCH_RESCHEDULE: 'batch_reschedule',
  BATCH_CANCEL: 'batch_cancel',
  BATCH_CONFIRM: 'batch_confirm',
  BATCH_DELETE: 'batch_delete',
  BATCH_UPDATE: 'batch_update'
};

class BatchTransactionService {
  constructor() {
    this.config = {
      // 事务配置
      timeout: 30000,                    // 事务超时时间(毫秒)
      maxRetries: 3,                     // 最大重试次数
      retryDelay: 1000,                  // 重试延迟(毫秒)
      
      // 锁配置
      lockTimeout: 5000,                 // 锁超时时间
      maxLockWaitTime: 10000,           // 最大锁等待时间
      
      // 日志配置
      logLevel: 'info',                  // 日志级别
      maxLogEntries: 1000,              // 最大日志条数
      logRetention: 7 * 24 * 60 * 60 * 1000 // 日志保留时间(7天)
    };
    
    // 活跃事务映射
    this.activeTransactions = new Map();
    
    // 事务日志
    this.transactionLogs = [];
    
    // 事务状态追踪
    this.transactionTracker = new Map();
    
    // 事务统计
    this.statistics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageDuration: 0,
      totalDuration: 0,
      lastResetTime: Date.now()
    };
    
    // 资源锁管理
    this.resourceLocks = new Map();
    
    // 事务ID计数器
    this.transactionIdCounter = 0;
  }

  /**
   * 开始批量事务
   * @param {string} type - 事务类型
   * @param {Array} items - 批量操作项目
   * @param {Object} options - 事务选项
   * @returns {Promise<Object>} 事务对象
   */
  async beginTransaction(type, items, options = {}) {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    
    try {
      console.log(`[BatchTransaction] 开始事务 ${transactionId}, 类型: ${type}, 项目数: ${items.length}`);
      
      // 验证事务参数
      this.validateTransactionParams(type, items, options);
      
      // 创建事务对象
      const transaction = {
        id: transactionId,
        type,
        status: TRANSACTION_STATUS.PENDING,
        items: this.deepClone(items),
        originalData: [],
        snapshot: null,
        options: { ...options },
        
        // 时间信息
        startTime,
        endTime: null,
        duration: 0,
        timeout: options.timeout || this.config.timeout,
        
        // 执行信息
        progress: {
          total: items.length,
          processed: 0,
          succeeded: 0,
          failed: 0,
          errors: []
        },
        
        // 锁信息
        locks: [],
        
        // 回滚信息
        rollbackOperations: [],
        canRollback: true
      };
      
      // 开始事务状态追踪
      this.startTransactionTracking(transaction);
      
      // 获取资源锁
      await this.acquireResourceLocks(transaction);
      
      // 创建数据快照
      transaction.snapshot = await this.createDataSnapshot(transaction);
      
      // 记录事务开始
      this.logTransaction(transaction, 'TRANSACTION_STARTED', 'Transaction started successfully');
      
      // 注册活跃事务
      this.activeTransactions.set(transactionId, transaction);
      
      // 设置超时处理
      this.setupTransactionTimeout(transaction);
      
      return transaction;
      
    } catch (error) {
      console.error(`[BatchTransaction] 创建事务失败: ${error.message}`);
      throw new Error(`事务创建失败: ${error.message}`);
    }
  }

  /**
   * 执行事务操作
   * @param {Object} transaction - 事务对象
   * @param {Function} operationCallback - 操作回调函数
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Object>} 执行结果
   */
  async executeTransaction(transaction, operationCallback, progressCallback = null) {
    const { id } = transaction;
    
    try {
      console.log(`[BatchTransaction] 执行事务 ${id}`);
      
      // 检查事务状态
      if (transaction.status !== TRANSACTION_STATUS.PENDING) {
        throw new Error(`事务状态无效: ${transaction.status}`);
      }
      
      // 更新事务状态
      transaction.status = TRANSACTION_STATUS.RUNNING;
      this.updateTransactionTracking(id, { status: TRANSACTION_STATUS.RUNNING });
      this.logTransaction(transaction, 'TRANSACTION_EXECUTING', 'Transaction execution started');
      
      // 执行批量操作
      const results = await this.executeBatchOperations(
        transaction, 
        operationCallback, 
        progressCallback
      );
      
      // 验证执行结果
      await this.validateExecutionResults(transaction, results);
      
      // 提交事务
      await this.commitTransaction(transaction);
      
      // 完成事务追踪
      const trackingReport = this.finishTransactionTracking(id, TRANSACTION_STATUS.COMMITTED);
      
      console.log(`[BatchTransaction] 事务 ${id} 执行成功`);
      return {
        success: true,
        transactionId: id,
        results,
        progress: transaction.progress,
        trackingReport
      };
      
    } catch (error) {
      console.error(`[BatchTransaction] 事务 ${id} 执行失败:`, error);
      
      // 回滚事务
      try {
        await this.rollbackTransaction(transaction, error);
        this.finishTransactionTracking(id, TRANSACTION_STATUS.ROLLED_BACK);
      } catch (rollbackError) {
        console.error(`[BatchTransaction] 事务 ${id} 回滚失败:`, rollbackError);
        this.finishTransactionTracking(id, TRANSACTION_STATUS.FAILED);
      }
      
      throw error;
    }
  }

  /**
   * 执行批量操作
   * @param {Object} transaction - 事务对象
   * @param {Function} operationCallback - 操作回调函数
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Array>} 执行结果列表
   */
  async executeBatchOperations(transaction, operationCallback, progressCallback) {
    const { items } = transaction;
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // 检查事务是否被中断
        if (transaction.status !== TRANSACTION_STATUS.RUNNING) {
          throw new Error('事务被中断');
        }
        
        // 执行单个操作
        const result = await this.executeSingleOperation(transaction, item, operationCallback);
        results.push(result);
        
        // 更新进度
        transaction.progress.processed++;
        transaction.progress.succeeded++;
        
        // 更新追踪信息
        this.updateTransactionTracking(transaction.id, {
          progress: { ...transaction.progress },
          operationTime: Date.now() - operationStartTime
        });
        
        // 触发进度回调
        if (progressCallback) {
          progressCallback({
            transactionId: transaction.id,
            progress: { ...transaction.progress },
            currentItem: item,
            result
          });
        }
        
        // 记录操作成功
        this.logTransaction(transaction, 'OPERATION_SUCCESS', 
          `Operation ${i + 1}/${items.length} completed successfully`, { item, result });
        
      } catch (error) {
        // 记录操作失败
        transaction.progress.processed++;
        transaction.progress.failed++;
        transaction.progress.errors.push({
          item,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // 更新追踪信息
        this.updateTransactionTracking(transaction.id, {
          progress: { ...transaction.progress },
          error: error.message,
          operation: `item_${i}`
        });
        
        this.logTransaction(transaction, 'OPERATION_FAILED', 
          `Operation ${i + 1}/${items.length} failed: ${error.message}`, { item, error: error.message });
        
        // 根据策略决定是否继续
        if (transaction.options.failFast) {
          throw new Error(`批量操作失败: ${error.message}`);
        }
        
        results.push({ success: false, error: error.message, item });
      }
    }
    
    return results;
  }

  /**
   * 执行单个操作
   * @param {Object} transaction - 事务对象
   * @param {Object} item - 操作项目
   * @param {Function} operationCallback - 操作回调函数
   * @returns {Promise<Object>} 操作结果
   */
  async executeSingleOperation(transaction, item, operationCallback) {
    const operationStartTime = Date.now();
    
    try {
      // 记录原始数据(用于回滚)
      const originalData = await this.captureOriginalData(item);
      transaction.originalData.push({ item, originalData });
      
      // 执行具体操作
      const result = await operationCallback(item, transaction);
      
      // 记录回滚操作
      if (result.rollbackOperation) {
        transaction.rollbackOperations.push(result.rollbackOperation);
      }
      
      return { success: true, result, item };
      
    } catch (error) {
      throw new Error(`操作执行失败: ${error.message}`);
    }
  }

  /**
   * 提交事务
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async commitTransaction(transaction) {
    const { id } = transaction;
    
    try {
      console.log(`[BatchTransaction] 提交事务 ${id}`);
      
      // 更新事务状态
      transaction.status = TRANSACTION_STATUS.COMMITTED;
      transaction.endTime = Date.now();
      transaction.duration = transaction.endTime - transaction.startTime;
      
      // 释放资源锁
      await this.releaseResourceLocks(transaction);
      
      // 清理事务数据(保留必要信息)
      await this.cleanupTransactionData(transaction);
      
      // 记录事务提交
      this.logTransaction(transaction, 'TRANSACTION_COMMITTED', 
        `Transaction committed successfully in ${transaction.duration}ms`);
      
      // 从活跃事务中移除
      this.activeTransactions.delete(id);
      
    } catch (error) {
      console.error(`[BatchTransaction] 提交事务 ${id} 失败:`, error);
      throw new Error(`事务提交失败: ${error.message}`);
    }
  }

  /**
   * 回滚事务
   * @param {Object} transaction - 事务对象
   * @param {Error} error - 导致回滚的错误
   * @returns {Promise<void>}
   */
  async rollbackTransaction(transaction, error) {
    const { id } = transaction;
    
    try {
      console.log(`[BatchTransaction] 回滚事务 ${id}, 原因: ${error.message}`);
      
      // 检查是否可以回滚
      if (!transaction.canRollback) {
        throw new Error('事务不支持回滚');
      }
      
      // 更新事务状态
      transaction.status = TRANSACTION_STATUS.ROLLING_BACK;
      
      // 执行回滚操作
      await this.executeRollbackOperations(transaction);
      
      // 恢复原始数据
      await this.restoreOriginalData(transaction);
      
      // 更新最终状态
      transaction.status = TRANSACTION_STATUS.ROLLED_BACK;
      transaction.endTime = Date.now();
      transaction.duration = transaction.endTime - transaction.startTime;
      
      // 释放资源锁
      await this.releaseResourceLocks(transaction);
      
      // 记录事务回滚
      this.logTransaction(transaction, 'TRANSACTION_ROLLED_BACK', 
        `Transaction rolled back due to: ${error.message}`);
      
      // 从活跃事务中移除
      this.activeTransactions.delete(id);
      
    } catch (rollbackError) {
      // 回滚失败，标记为失败状态
      transaction.status = TRANSACTION_STATUS.FAILED;
      this.logTransaction(transaction, 'ROLLBACK_FAILED', 
        `Rollback failed: ${rollbackError.message}`);
      
      throw new Error(`事务回滚失败: ${rollbackError.message}`);
    }
  }

  /**
   * 获取事务状态
   * @param {string} transactionId - 事务ID
   * @returns {Object|null} 事务状态信息
   */
  getTransactionStatus(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction) {
      return null;
    }
    
    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      progress: { ...transaction.progress },
      startTime: transaction.startTime,
      endTime: transaction.endTime,
      duration: transaction.duration,
      itemCount: transaction.items.length
    };
  }

  /**
   * 获取所有活跃事务
   * @returns {Array} 活跃事务列表
   */
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values()).map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      progress: { ...transaction.progress },
      startTime: transaction.startTime,
      itemCount: transaction.items.length
    }));
  }

  /**
   * 强制中止事务
   * @param {string} transactionId - 事务ID
   * @param {string} reason - 中止原因
   * @returns {Promise<void>}
   */
  async abortTransaction(transactionId, reason = '手动中止') {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`事务不存在: ${transactionId}`);
    }
    
    if (transaction.status === TRANSACTION_STATUS.COMMITTED) {
      throw new Error('已提交的事务无法中止');
    }
    
    try {
      console.log(`[BatchTransaction] 中止事务 ${transactionId}, 原因: ${reason}`);
      
      // 如果事务正在运行，尝试回滚
      if (transaction.status === TRANSACTION_STATUS.RUNNING) {
        await this.rollbackTransaction(transaction, new Error(reason));
      } else {
        // 直接标记为失败并清理
        transaction.status = TRANSACTION_STATUS.FAILED;
        await this.releaseResourceLocks(transaction);
        this.activeTransactions.delete(transactionId);
      }
      
      this.logTransaction(transaction, 'TRANSACTION_ABORTED', 
        `Transaction aborted: ${reason}`);
        
    } catch (error) {
      console.error(`[BatchTransaction] 中止事务失败:`, error);
      throw error;
    }
  }

  // ===== 内部辅助方法 =====

  /**
   * 生成事务ID
   * @returns {string}
   */
  generateTransactionId() {
    return `btx_${Date.now()}_${++this.transactionIdCounter}`;
  }

  /**
   * 验证事务参数
   * @param {string} type - 事务类型
   * @param {Array} items - 操作项目
   * @param {Object} options - 选项
   */
  validateTransactionParams(type, items, options) {
    if (!type || !Object.values(TRANSACTION_TYPE).includes(type)) {
      throw new Error(`无效的事务类型: ${type}`);
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('操作项目不能为空');
    }
    
    if (items.length > 100) {
      throw new Error(`批量操作项目过多: ${items.length}, 最大支持100个`);
    }
  }

  /**
   * 获取资源锁
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async acquireResourceLocks(transaction) {
    const resourceIds = this.extractResourceIds(transaction.items);
    const acquiredLocks = [];
    
    try {
      for (const resourceId of resourceIds) {
        await this.acquireLock(resourceId, transaction.id);
        acquiredLocks.push(resourceId);
      }
      
      transaction.locks = acquiredLocks;
      
    } catch (error) {
      // 释放已获取的锁
      for (const lockId of acquiredLocks) {
        await this.releaseLock(lockId, transaction.id);
      }
      throw error;
    }
  }

  /**
   * 释放资源锁
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async releaseResourceLocks(transaction) {
    const { locks, id } = transaction;
    
    for (const lockId of locks) {
      try {
        await this.releaseLock(lockId, id);
      } catch (error) {
        console.error(`[BatchTransaction] 释放锁 ${lockId} 失败:`, error);
      }
    }
    
    transaction.locks = [];
  }

  /**
   * 获取单个资源锁
   * @param {string} resourceId - 资源ID
   * @param {string} transactionId - 事务ID
   * @returns {Promise<void>}
   */
  async acquireLock(resourceId, transactionId) {
    const existingLock = this.resourceLocks.get(resourceId);
    
    if (existingLock && existingLock.transactionId !== transactionId) {
      // 检查锁是否过期
      if (Date.now() - existingLock.acquiredAt > this.config.lockTimeout) {
        this.resourceLocks.delete(resourceId);
      } else {
        throw new Error(`资源 ${resourceId} 已被锁定`);
      }
    }
    
    this.resourceLocks.set(resourceId, {
      transactionId,
      acquiredAt: Date.now()
    });
  }

  /**
   * 释放单个资源锁
   * @param {string} resourceId - 资源ID
   * @param {string} transactionId - 事务ID
   * @returns {Promise<void>}
   */
  async releaseLock(resourceId, transactionId) {
    const lock = this.resourceLocks.get(resourceId);
    
    if (lock && lock.transactionId === transactionId) {
      this.resourceLocks.delete(resourceId);
    }
  }

  /**
   * 提取资源ID列表
   * @param {Array} items - 操作项目
   * @returns {Array} 资源ID列表
   */
  extractResourceIds(items) {
    return items.map(item => item.scheduleId || item.id).filter(Boolean);
  }

  /**
   * 创建数据快照
   * @param {Object} transaction - 事务对象
   * @returns {Promise<Object>} 数据快照
   */
  async createDataSnapshot(transaction) {
    return {
      transactionId: transaction.id,
      timestamp: Date.now(),
      itemCount: transaction.items.length,
      checksum: this.calculateChecksum(transaction.items)
    };
  }

  /**
   * 捕获原始数据
   * @param {Object} item - 操作项目
   * @returns {Promise<Object>} 原始数据
   */
  async captureOriginalData(item) {
    // 这里应该根据具体业务逻辑获取原始数据
    // 临时实现，返回当前状态的深拷贝
    return this.deepClone(item);
  }

  /**
   * 执行回滚操作
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async executeRollbackOperations(transaction) {
    const operations = transaction.rollbackOperations.reverse(); // 逆序执行
    
    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        console.error('[BatchTransaction] 回滚操作失败:', error);
        // 继续执行其他回滚操作
      }
    }
  }

  /**
   * 恢复原始数据
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async restoreOriginalData(transaction) {
    const { originalData } = transaction;
    
    for (const { item, originalData: data } of originalData) {
      try {
        // 这里应该根据具体业务逻辑恢复数据
        // 临时实现
        console.log(`恢复数据: ${item.id || item.scheduleId}`);
      } catch (error) {
        console.error('[BatchTransaction] 恢复数据失败:', error);
      }
    }
  }

  /**
   * 验证执行结果
   * @param {Object} transaction - 事务对象
   * @param {Array} results - 执行结果
   * @returns {Promise<void>}
   */
  async validateExecutionResults(transaction, results) {
    const { progress } = transaction;
    
    // 检查是否有失败的操作
    if (progress.failed > 0 && transaction.options.requireAllSuccess) {
      throw new Error(`批量操作部分失败: ${progress.failed}/${progress.total} 项失败`);
    }
    
    // 检查成功率是否达到要求
    const successRate = progress.succeeded / progress.total;
    const requiredSuccessRate = transaction.options.minSuccessRate || 0.8;
    
    if (successRate < requiredSuccessRate) {
      throw new Error(`成功率不达标: ${(successRate * 100).toFixed(1)}%, 要求: ${(requiredSuccessRate * 100)}%`);
    }
  }

  /**
   * 清理事务数据
   * @param {Object} transaction - 事务对象
   * @returns {Promise<void>}
   */
  async cleanupTransactionData(transaction) {
    // 清理大对象，保留必要信息
    transaction.items = [];
    transaction.originalData = [];
    transaction.rollbackOperations = [];
  }

  /**
   * 设置事务超时
   * @param {Object} transaction - 事务对象
   */
  setupTransactionTimeout(transaction) {
    setTimeout(() => {
      if (this.activeTransactions.has(transaction.id) && 
          transaction.status === TRANSACTION_STATUS.RUNNING) {
        this.abortTransaction(transaction.id, '事务超时').catch(console.error);
      }
    }, transaction.timeout);
  }

  /**
   * 记录事务日志
   * @param {Object} transaction - 事务对象
   * @param {string} event - 事件类型
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  logTransaction(transaction, event, message, data = null) {
    const logEntry = {
      transactionId: transaction.id,
      event,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this.deepClone(data) : null
    };
    
    this.transactionLogs.push(logEntry);
    
    // 清理过期日志
    this.cleanupOldLogs();
    
    console.log(`[BatchTransaction] ${event}: ${message}`);
  }

  /**
   * 清理过期日志
   */
  cleanupOldLogs() {
    const cutoffTime = Date.now() - this.config.logRetention;
    
    this.transactionLogs = this.transactionLogs.filter(log => 
      new Date(log.timestamp).getTime() > cutoffTime
    );
    
    // 限制日志数量
    if (this.transactionLogs.length > this.config.maxLogEntries) {
      this.transactionLogs = this.transactionLogs.slice(-this.config.maxLogEntries);
    }
  }

  /**
   * 获取事务日志
   * @param {string} transactionId - 事务ID (可选)
   * @returns {Array} 日志列表
   */
  getTransactionLogs(transactionId = null) {
    if (transactionId) {
      return this.transactionLogs.filter(log => log.transactionId === transactionId);
    }
    return [...this.transactionLogs];
  }

  /**
   * 开始事务状态追踪
   * @param {Object} transaction - 事务对象
   * @returns {void}
   */
  startTransactionTracking(transaction) {
    const trackingInfo = {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      startTime: transaction.startTime,
      endTime: null,
      duration: 0,
      
      // 进度信息
      progress: {
        total: transaction.items.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percentage: 0
      },
      
      // 性能指标
      performance: {
        throughput: 0,           // 吞吐量(项目/秒)
        avgOperationTime: 0,     // 平均操作时间
        maxOperationTime: 0,     // 最大操作时间
        minOperationTime: Infinity  // 最小操作时间
      },
      
      // 资源使用
      resourceUsage: {
        locksAcquired: transaction.locks.length,
        memoryUsage: this.estimateMemoryUsage(transaction),
        cpuTime: 0
      },
      
      // 错误信息
      errors: [],
      warnings: [],
      
      // 里程碑时间戳
      milestones: {
        started: transaction.startTime,
        firstOperation: null,
        halfwayPoint: null,
        lastOperation: null,
        finished: null
      }
    };
    
    this.transactionTracker.set(transaction.id, trackingInfo);
    this.statistics.totalTransactions++;
  }

  /**
   * 更新事务追踪进度
   * @param {string} transactionId - 事务ID
   * @param {Object} progressUpdate - 进度更新
   * @returns {void}
   */
  updateTransactionTracking(transactionId, progressUpdate) {
    const tracking = this.transactionTracker.get(transactionId);
    if (!tracking) return;
    
    const now = Date.now();
    
    // 更新进度
    if (progressUpdate.progress) {
      Object.assign(tracking.progress, progressUpdate.progress);
      tracking.progress.percentage = (tracking.progress.processed / tracking.progress.total) * 100;
      
      // 更新里程碑
      if (tracking.progress.processed === 1 && !tracking.milestones.firstOperation) {
        tracking.milestones.firstOperation = now;
      }
      
      if (tracking.progress.percentage >= 50 && !tracking.milestones.halfwayPoint) {
        tracking.milestones.halfwayPoint = now;
      }
    }
    
    // 更新性能指标
    if (progressUpdate.operationTime) {
      const opTime = progressUpdate.operationTime;
      tracking.performance.maxOperationTime = Math.max(tracking.performance.maxOperationTime, opTime);
      tracking.performance.minOperationTime = Math.min(tracking.performance.minOperationTime, opTime);
      
      // 计算平均操作时间
      const totalOps = tracking.progress.processed;
      if (totalOps > 0) {
        tracking.performance.avgOperationTime = 
          (tracking.performance.avgOperationTime * (totalOps - 1) + opTime) / totalOps;
      }
    }
    
    // 计算吞吐量
    const elapsedTime = (now - tracking.startTime) / 1000; // 秒
    if (elapsedTime > 0) {
      tracking.performance.throughput = tracking.progress.processed / elapsedTime;
    }
    
    // 更新状态
    if (progressUpdate.status) {
      tracking.status = progressUpdate.status;
    }
    
    // 添加错误或警告
    if (progressUpdate.error) {
      tracking.errors.push({
        timestamp: now,
        error: progressUpdate.error,
        operation: progressUpdate.operation || 'unknown'
      });
    }
    
    if (progressUpdate.warning) {
      tracking.warnings.push({
        timestamp: now,
        warning: progressUpdate.warning,
        operation: progressUpdate.operation || 'unknown'
      });
    }
  }

  /**
   * 完成事务追踪
   * @param {string} transactionId - 事务ID
   * @param {string} finalStatus - 最终状态
   * @returns {Object} 追踪结果
   */
  finishTransactionTracking(transactionId, finalStatus) {
    const tracking = this.transactionTracker.get(transactionId);
    if (!tracking) return null;
    
    const now = Date.now();
    
    // 更新最终状态
    tracking.status = finalStatus;
    tracking.endTime = now;
    tracking.duration = now - tracking.startTime;
    tracking.milestones.finished = now;
    
    if (tracking.progress.processed > 0) {
      tracking.milestones.lastOperation = now;
    }
    
    // 更新统计信息
    this.statistics.totalDuration += tracking.duration;
    this.statistics.averageDuration = this.statistics.totalDuration / this.statistics.totalTransactions;
    
    if (finalStatus === TRANSACTION_STATUS.COMMITTED) {
      this.statistics.successfulTransactions++;
    } else {
      this.statistics.failedTransactions++;
    }
    
    // 计算最终性能指标
    if (tracking.performance.minOperationTime === Infinity) {
      tracking.performance.minOperationTime = 0;
    }
    
    // 生成追踪报告
    const report = this.generateTrackingReport(tracking);
    
    // 移除追踪信息（保留报告）
    this.transactionTracker.delete(transactionId);
    
    return report;
  }

  /**
   * 生成追踪报告
   * @param {Object} tracking - 追踪信息
   * @returns {Object} 追踪报告
   */
  generateTrackingReport(tracking) {
    const report = {
      id: tracking.id,
      type: tracking.type,
      status: tracking.status,
      
      // 时间信息
      timing: {
        startTime: tracking.startTime,
        endTime: tracking.endTime,
        duration: tracking.duration,
        milestones: { ...tracking.milestones }
      },
      
      // 结果统计
      results: {
        total: tracking.progress.total,
        processed: tracking.progress.processed,
        succeeded: tracking.progress.succeeded,
        failed: tracking.progress.failed,
        successRate: tracking.progress.total > 0 ? 
          (tracking.progress.succeeded / tracking.progress.total) * 100 : 0
      },
      
      // 性能分析
      performance: {
        throughput: tracking.performance.throughput,
        avgOperationTime: tracking.performance.avgOperationTime,
        operationTimeRange: {
          min: tracking.performance.minOperationTime,
          max: tracking.performance.maxOperationTime
        },
        efficiency: this.calculateEfficiency(tracking)
      },
      
      // 资源使用
      resources: {
        locksUsed: tracking.resourceUsage.locksAcquired,
        memoryEstimate: tracking.resourceUsage.memoryUsage,
        resourceUtilization: this.calculateResourceUtilization(tracking)
      },
      
      // 质量指标
      quality: {
        errorCount: tracking.errors.length,
        warningCount: tracking.warnings.length,
        errorRate: tracking.progress.total > 0 ? 
          (tracking.errors.length / tracking.progress.total) * 100 : 0,
        reliability: this.calculateReliability(tracking)
      },
      
      // 详细错误信息
      issues: {
        errors: tracking.errors,
        warnings: tracking.warnings
      }
    };
    
    return report;
  }

  /**
   * 获取事务追踪信息
   * @param {string} transactionId - 事务ID
   * @returns {Object|null} 追踪信息
   */
  getTransactionTracking(transactionId) {
    return this.transactionTracker.get(transactionId) || null;
  }

  /**
   * 获取所有活跃事务追踪
   * @returns {Array} 活跃事务追踪列表
   */
  getActiveTransactionTrackings() {
    return Array.from(this.transactionTracker.values());
  }

  /**
   * 获取事务统计信息
   * @returns {Object} 统计信息
   */
  getTransactionStatistics() {
    return {
      ...this.statistics,
      activeTransactions: this.activeTransactions.size,
      trackedTransactions: this.transactionTracker.size,
      successRate: this.statistics.totalTransactions > 0 ? 
        (this.statistics.successfulTransactions / this.statistics.totalTransactions) * 100 : 0
    };
  }

  /**
   * 重置统计信息
   * @returns {void}
   */
  resetStatistics() {
    this.statistics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageDuration: 0,
      totalDuration: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * 估算事务内存使用
   * @param {Object} transaction - 事务对象
   * @returns {number} 内存使用估算值(字节)
   */
  estimateMemoryUsage(transaction) {
    const itemSize = JSON.stringify(transaction.items).length;
    const snapshotSize = transaction.snapshot ? JSON.stringify(transaction.snapshot).length : 0;
    const logSize = JSON.stringify(transaction.progress).length;
    
    return itemSize + snapshotSize + logSize;
  }

  /**
   * 计算事务效率
   * @param {Object} tracking - 追踪信息
   * @returns {number} 效率评分 (0-100)
   */
  calculateEfficiency(tracking) {
    if (tracking.duration === 0) return 0;
    
    const theoreticalMinTime = tracking.progress.total * 10; // 假设每个操作最少需要10ms
    const actualTime = tracking.duration;
    
    return Math.min(100, (theoreticalMinTime / actualTime) * 100);
  }

  /**
   * 计算资源利用率
   * @param {Object} tracking - 追踪信息
   * @returns {number} 资源利用率 (0-100)
   */
  calculateResourceUtilization(tracking) {
    // 简化计算，基于锁的数量和内存使用
    const lockUtilization = Math.min(100, tracking.resourceUsage.locksAcquired * 10);
    const memoryUtilization = Math.min(100, (tracking.resourceUsage.memoryUsage / (1024 * 1024)) * 10);
    
    return (lockUtilization + memoryUtilization) / 2;
  }

  /**
   * 计算可靠性
   * @param {Object} tracking - 追踪信息
   * @returns {number} 可靠性评分 (0-100)
   */
  calculateReliability(tracking) {
    if (tracking.progress.total === 0) return 100;
    
    const successRate = (tracking.progress.succeeded / tracking.progress.total) * 100;
    const errorPenalty = tracking.errors.length * 5; // 每个错误扣除5分
    const warningPenalty = tracking.warnings.length * 2; // 每个警告扣除2分
    
    return Math.max(0, successRate - errorPenalty - warningPenalty);
  }

  /**
   * 开始事务状态追踪
   * @param {Object} transaction - 事务对象
   * @returns {void}
   */
  startTransactionTracking(transaction) {
    const trackingInfo = {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      startTime: transaction.startTime,
      endTime: null,
      duration: 0,
      
      // 进度信息
      progress: {
        total: transaction.items.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        percentage: 0
      },
      
      // 性能指标
      performance: {
        throughput: 0,           // 吞吐量(项目/秒)
        avgOperationTime: 0,     // 平均操作时间
        maxOperationTime: 0,     // 最大操作时间
        minOperationTime: Infinity  // 最小操作时间
      },
      
      // 资源使用
      resourceUsage: {
        locksAcquired: transaction.locks.length,
        memoryUsage: this.estimateMemoryUsage(transaction),
        cpuTime: 0
      },
      
      // 错误信息
      errors: [],
      warnings: [],
      
      // 里程碑时间戳
      milestones: {
        started: transaction.startTime,
        firstOperation: null,
        halfwayPoint: null,
        lastOperation: null,
        finished: null
      }
    };
    
    this.transactionTracker.set(transaction.id, trackingInfo);
    this.statistics.totalTransactions++;
  }

  /**
   * 更新事务追踪进度
   * @param {string} transactionId - 事务ID
   * @param {Object} progressUpdate - 进度更新
   * @returns {void}
   */
  updateTransactionTracking(transactionId, progressUpdate) {
    const tracking = this.transactionTracker.get(transactionId);
    if (!tracking) return;
    
    const now = Date.now();
    
    // 更新进度
    if (progressUpdate.progress) {
      Object.assign(tracking.progress, progressUpdate.progress);
      tracking.progress.percentage = (tracking.progress.processed / tracking.progress.total) * 100;
      
      // 更新里程碑
      if (tracking.progress.processed === 1 && !tracking.milestones.firstOperation) {
        tracking.milestones.firstOperation = now;
      }
      
      if (tracking.progress.percentage >= 50 && !tracking.milestones.halfwayPoint) {
        tracking.milestones.halfwayPoint = now;
      }
    }
    
    // 更新性能指标
    if (progressUpdate.operationTime) {
      const opTime = progressUpdate.operationTime;
      tracking.performance.maxOperationTime = Math.max(tracking.performance.maxOperationTime, opTime);
      tracking.performance.minOperationTime = Math.min(tracking.performance.minOperationTime, opTime);
      
      // 计算平均操作时间
      const totalOps = tracking.progress.processed;
      if (totalOps > 0) {
        tracking.performance.avgOperationTime = 
          (tracking.performance.avgOperationTime * (totalOps - 1) + opTime) / totalOps;
      }
    }
    
    // 计算吞吐量
    const elapsedTime = (now - tracking.startTime) / 1000; // 秒
    if (elapsedTime > 0) {
      tracking.performance.throughput = tracking.progress.processed / elapsedTime;
    }
    
    // 更新状态
    if (progressUpdate.status) {
      tracking.status = progressUpdate.status;
    }
    
    // 添加错误或警告
    if (progressUpdate.error) {
      tracking.errors.push({
        timestamp: now,
        error: progressUpdate.error,
        operation: progressUpdate.operation || 'unknown'
      });
    }
    
    if (progressUpdate.warning) {
      tracking.warnings.push({
        timestamp: now,
        warning: progressUpdate.warning,
        operation: progressUpdate.operation || 'unknown'
      });
    }
  }

  /**
   * 完成事务追踪
   * @param {string} transactionId - 事务ID
   * @param {string} finalStatus - 最终状态
   * @returns {Object} 追踪结果
   */
  finishTransactionTracking(transactionId, finalStatus) {
    const tracking = this.transactionTracker.get(transactionId);
    if (!tracking) return null;
    
    const now = Date.now();
    
    // 更新最终状态
    tracking.status = finalStatus;
    tracking.endTime = now;
    tracking.duration = now - tracking.startTime;
    tracking.milestones.finished = now;
    
    if (tracking.progress.processed > 0) {
      tracking.milestones.lastOperation = now;
    }
    
    // 更新统计信息
    this.statistics.totalDuration += tracking.duration;
    this.statistics.averageDuration = this.statistics.totalDuration / this.statistics.totalTransactions;
    
    if (finalStatus === TRANSACTION_STATUS.COMMITTED) {
      this.statistics.successfulTransactions++;
    } else {
      this.statistics.failedTransactions++;
    }
    
    // 计算最终性能指标
    if (tracking.performance.minOperationTime === Infinity) {
      tracking.performance.minOperationTime = 0;
    }
    
    // 生成追踪报告
    const report = this.generateTrackingReport(tracking);
    
    // 移除追踪信息（保留报告）
    this.transactionTracker.delete(transactionId);
    
    return report;
  }

  /**
   * 生成追踪报告
   * @param {Object} tracking - 追踪信息
   * @returns {Object} 追踪报告
   */
  generateTrackingReport(tracking) {
    const report = {
      id: tracking.id,
      type: tracking.type,
      status: tracking.status,
      
      // 时间信息
      timing: {
        startTime: tracking.startTime,
        endTime: tracking.endTime,
        duration: tracking.duration,
        milestones: { ...tracking.milestones }
      },
      
      // 结果统计
      results: {
        total: tracking.progress.total,
        processed: tracking.progress.processed,
        succeeded: tracking.progress.succeeded,
        failed: tracking.progress.failed,
        successRate: tracking.progress.total > 0 ? 
          (tracking.progress.succeeded / tracking.progress.total) * 100 : 0
      },
      
      // 性能分析
      performance: {
        throughput: tracking.performance.throughput,
        avgOperationTime: tracking.performance.avgOperationTime,
        operationTimeRange: {
          min: tracking.performance.minOperationTime,
          max: tracking.performance.maxOperationTime
        },
        efficiency: this.calculateEfficiency(tracking)
      },
      
      // 资源使用
      resources: {
        locksUsed: tracking.resourceUsage.locksAcquired,
        memoryEstimate: tracking.resourceUsage.memoryUsage,
        resourceUtilization: this.calculateResourceUtilization(tracking)
      },
      
      // 质量指标
      quality: {
        errorCount: tracking.errors.length,
        warningCount: tracking.warnings.length,
        errorRate: tracking.progress.total > 0 ? 
          (tracking.errors.length / tracking.progress.total) * 100 : 0,
        reliability: this.calculateReliability(tracking)
      },
      
      // 详细错误信息
      issues: {
        errors: tracking.errors,
        warnings: tracking.warnings
      }
    };
    
    return report;
  }

  /**
   * 获取事务追踪信息
   * @param {string} transactionId - 事务ID
   * @returns {Object|null} 追踪信息
   */
  getTransactionTracking(transactionId) {
    return this.transactionTracker.get(transactionId) || null;
  }

  /**
   * 获取所有活跃事务追踪
   * @returns {Array} 活跃事务追踪列表
   */
  getActiveTransactionTrackings() {
    return Array.from(this.transactionTracker.values());
  }

  /**
   * 获取事务统计信息
   * @returns {Object} 统计信息
   */
  getTransactionStatistics() {
    return {
      ...this.statistics,
      activeTransactions: this.activeTransactions.size,
      trackedTransactions: this.transactionTracker.size,
      successRate: this.statistics.totalTransactions > 0 ? 
        (this.statistics.successfulTransactions / this.statistics.totalTransactions) * 100 : 0
    };
  }

  /**
   * 重置统计信息
   * @returns {void}
   */
  resetStatistics() {
    this.statistics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageDuration: 0,
      totalDuration: 0,
      lastResetTime: Date.now()
    };
  }

  /**
   * 深拷贝对象
   * @param {any} obj - 要拷贝的对象
   * @returns {any} 拷贝后的对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * 计算校验和
   * @param {Array} items - 项目列表
   * @returns {string} 校验和
   */
  calculateChecksum(items) {
    const str = JSON.stringify(items);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }
}

// 导出服务实例
export default BatchTransactionService;
export const batchTransactionService = new BatchTransactionService();