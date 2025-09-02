/**
 * 批量事务回滚机制服务
 * 实现批量操作的回滚策略、快照管理和级联回滚
 */

import { batchTransactionService, TRANSACTION_STATUS } from './batch-transaction.service.js';

// 回滚策略类型
export const ROLLBACK_STRATEGY = {
  IMMEDIATE: 'immediate',           // 立即回滚
  DELAYED: 'delayed',              // 延迟回滚
  PARTIAL: 'partial',              // 部分回滚
  CASCADE: 'cascade',              // 级联回滚
  COMPENSATING: 'compensating'     // 补偿回滚
};

// 快照类型
export const SNAPSHOT_TYPE = {
  FULL: 'full',                    // 完整快照
  INCREMENTAL: 'incremental',      // 增量快照
  DIFFERENTIAL: 'differential'     // 差异快照
};

class BatchRollbackService {
  constructor() {
    this.config = {
      // 回滚配置
      maxRollbackTime: 300000,        // 最大回滚时间(5分钟)
      autoRollbackThreshold: 0.3,     // 自动回滚阈值(30%失败)
      enableCascadeRollback: true,    // 启用级联回滚
      maxSnapshotSize: 50 * 1024 * 1024, // 最大快照大小50MB
      
      // 补偿配置
      maxCompensationRetries: 3,      // 最大补偿重试次数
      compensationTimeout: 30000,     // 补偿操作超时
      enableAsyncCompensation: true,  // 启用异步补偿
      
      // 快照增强配置
      snapshotRetentionDays: 7,       // 快照保留天数
      maxSnapshotsPerTransaction: 10, // 每个事务最大快照数
      enableIncrementalSnapshot: true, // 启用增量快照
      compressionLevel: 6,            // 压缩级别(1-9)
      enableVersioning: true          // 启用版本控制
    };
    
    // 快照存储
    this.snapshots = new Map();
    
    // 操作记录存储
    this.operationRecords = new Map();
    
    // 操作映射（新增）
    this.operationMappings = new Map();
    
    // 快照版本管理
    this.snapshotVersions = new Map();
    
    // 回滚操作注册表
    this.rollbackOperations = new Map();
    
    // 补偿操作队列
    this.compensationQueue = [];
    
    // 级联依赖图
    this.dependencyGraph = new Map();
    
    // 快照统计信息
    this.snapshotStats = {
      totalSnapshots: 0,
      totalSize: 0,
      compressionRatio: 0,
      averageSize: 0
    };
    
    // 定期清理任务
    this.startSnapshotCleanupTask();
  }

  /**
   * 启动快照清理任务
   */
  startSnapshotCleanupTask() {
    // 每小时执行一次清理任务
    this.cleanupTimer = setInterval(() => {
      this.performSnapshotCleanup();
    }, 60 * 60 * 1000); // 1小时
    
    console.log('[BatchRollback] 快照清理任务已启动');
  }

  /**
   * 执行快照清理
   */
  async performSnapshotCleanup() {
    const now = Date.now();
    const retentionTime = this.config.snapshotRetentionDays * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    console.log('[BatchRollback] 开始执行快照清理...');
    
    try {
      for (const [snapshotId, snapshot] of this.snapshots) {
        // 检查快照年龄
        if (now - snapshot.timestamp > retentionTime) {
          // 检查是否有活跃依赖
          if (!await this.hasActiveDependencies(snapshotId)) {
            this.snapshots.delete(snapshotId);
            cleanedCount++;
            console.log(`[BatchRollback] 清理过期快照: ${snapshotId}`);
          }
        }
      }
      
      // 更新统计信息
      this.updateSnapshotStatsAfterCleanup();
      
      if (cleanedCount > 0) {
        console.log(`[BatchRollback] 快照清理完成，清理数量: ${cleanedCount}`);
      }
      
    } catch (error) {
      console.error('[BatchRollback] 快照清理失败:', error);
    }
  }

  /**
   * 检查是否有活跃依赖
   * @param {string} snapshotId - 快照ID
   * @returns {Promise<boolean>} 是否有活跃依赖
   */
  async hasActiveDependencies(snapshotId) {
    // 检查是否有其他快照依赖于这个快照
    for (const [_, snapshot] of this.snapshots) {
      if (snapshot.metadata && snapshot.metadata.baseSnapshotId === snapshotId) {
        return true;
      }
    }
    
    // 检查是否有活跃的回滚操作依赖于这个快照
    // 这里可以添加更复杂的依赖检查逻辑
    
    return false;
  }

  /**
   * 清理后更新统计信息
   */
  updateSnapshotStatsAfterCleanup() {
    let totalSize = 0;
    let totalSnapshots = 0;
    let totalCompressionRatio = 0;
    
    for (const [_, snapshot] of this.snapshots) {
      totalSize += snapshot.size || 0;
      totalSnapshots++;
      
      if (snapshot.stats && snapshot.stats.compressionRatio) {
        totalCompressionRatio += snapshot.stats.compressionRatio;
      }
    }
    
    this.snapshotStats = {
      totalSnapshots,
      totalSize,
      averageSize: totalSnapshots > 0 ? totalSize / totalSnapshots : 0,
      compressionRatio: totalSnapshots > 0 ? totalCompressionRatio / totalSnapshots : 1.0
    };
  }

  /**
   * 停止清理任务
   */
  stopSnapshotCleanupTask() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[BatchRollback] 快照清理任务已停止');
    }
  }

  /**
   * 创建操作记录快照（增强版）
   * @param {string} transactionId - 事务ID
   * @param {Array} items - 操作项目
   * @param {Object} options - 快照选项
   * @returns {Promise<Object>} 快照对象
   */
  async createOperationSnapshot(transactionId, items, options = {}) {
    const snapshotId = this.generateSnapshotId(transactionId);
    const startTime = Date.now();
    
    try {
      console.log(`[BatchRollback] 创建操作记录快照 ${snapshotId} for 事务 ${transactionId}`);
      
      // 捕获操作前状态
      const operationRecord = await this.captureOperationRecord(transactionId, items, options);
      
      // 创建详细快照
      const snapshot = await this.createDetailedSnapshot(transactionId, items, operationRecord, options);
      
      // 建立操作映射
      await this.buildOperationMapping(snapshot, items);
      
      // 存储操作记录
      this.operationRecords.set(transactionId, operationRecord);
      
      console.log(`[BatchRollback] 操作记录快照 ${snapshotId} 创建完成`);
      
      return snapshot;
      
    } catch (error) {
      console.error(`[BatchRollback] 创建操作记录快照失败:`, error);
      throw new Error(`操作记录快照创建失败: ${error.message}`);
    }
  }

  /**
   * 捕获操作记录
   * @param {string} transactionId - 事务ID
   * @param {Array} items - 操作项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 操作记录
   */
  async captureOperationRecord(transactionId, items, options = {}) {
    const operationRecord = {
      id: `operation_${transactionId}_${Date.now()}`,
      transactionId,
      captureTime: Date.now(),
      
      // 操作项目详情
      operations: [],
      
      // 状态信息
      initialState: {
        totalItems: items.length,
        readyItems: items.filter(item => item.status === 'ready').length,
        pendingItems: items.filter(item => item.status === 'pending').length,
        systemState: await this.captureSystemState()
      },
      
      // 执行上下文
      context: {
        executionMode: options.mode || 'normal',
        priority: options.priority || 'medium',
        constraints: options.constraints || {},
        environment: await this.captureEnvironmentInfo()
      },
      
      // 操作轨迹
      operationTrace: [],
      
      // 检查点
      checkpoints: []
    };
    
    // 记录每个操作项目的详细信息
    for (const item of items) {
      const operation = {
        id: item.id || item.scheduleId,
        type: item.operationType || 'unknown',
        
        // 操作前状态
        beforeState: await this.captureItemState(item, 'before'),
        
        // 预期操作
        expectedOperation: {
          action: item.action || 'modify',
          parameters: item.parameters || {},
          target: item.target || {},
          expectedResult: item.expectedResult || null
        },
        
        // 依赖关系
        dependencies: {
          upstream: item.dependencies || [],
          downstream: await this.findDownstreamDependencies(item),
          external: await this.findExternalDependencies(item)
        },
        
        // 风险评估
        riskAssessment: {
          operationRisk: this.assessOperationRisk(item),
          dataRisk: this.assessDataRisk([item]),
          businessRisk: this.assessBusinessRisk(item)
        }
      };
      
      operationRecord.operations.push(operation);
    }
    
    return operationRecord;
  }

  /**
   * 创建详细快照
   * @param {string} transactionId - 事务ID
   * @param {Array} items - 操作项目
   * @param {Object} operationRecord - 操作记录
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 详细快照
   */
  async createDetailedSnapshot(transactionId, items, operationRecord, options = {}) {
    const snapshotId = this.generateSnapshotId(transactionId);
    const snapshotType = options.type || SNAPSHOT_TYPE.FULL;
    
    const snapshot = {
      id: snapshotId,
      transactionId,
      type: snapshotType,
      timestamp: Date.now(),
      itemCount: items.length,
      
      // 操作记录引用
      operationRecordId: operationRecord.id,
      
      // 增强的数据快照
      data: await this.captureEnhancedDataSnapshot(items, operationRecord, options),
      
      // 操作历史
      operationHistory: {
        plannedOperations: operationRecord.operations.length,
        executedOperations: 0,
        failedOperations: 0,
        rollbackOperations: 0
      },
      
      // 快照级联信息
      cascadeInfo: {
        parentSnapshots: [],
        childSnapshots: [],
        dependentTransactions: await this.findDependentTransactions(transactionId)
      },
      
      // 恢复点信息
      recoveryPoints: await this.createRecoveryPoints(items, operationRecord),
      
      // 元数据增强
      metadata: {
        version: await this.generateSnapshotVersion(transactionId),
        compression: options.compression || this.config.compressionLevel > 0,
        encryption: options.encryption || false,
        checksums: {},
        baseSnapshotId: null,
        createdBy: options.createdBy || 'system',
        tags: options.tags || [],
        retentionPolicy: options.retentionPolicy || 'default',
        
        // 新增操作记录相关元数据
        operationMetadata: {
          captureMethod: options.captureMethod || 'full',
          validationLevel: options.validationLevel || 'standard',
          compressionRatio: 1.0,
          integrityCheck: await this.calculateIntegrityChecksum(items)
        }
      },
      
      // 依赖关系增强
      dependencies: await this.analyzeDependencies(items),
      
      // 回滚策略
      rollbackStrategy: options.strategy || ROLLBACK_STRATEGY.IMMEDIATE,
      
      // 状态和统计
      status: 'active',
      size: 0,
      stats: {
        captureTime: 0,
        compressionRatio: 1.0,
        itemsChanged: items.length,
        operationComplexity: this.calculateOperationComplexity(operationRecord)
      }
    };
    
    return snapshot;
  }

  /**
   * 建立操作映射
   * @param {Object} snapshot - 快照对象
   * @param {Array} items - 操作项目
   * @returns {Promise<void>}
   */
  async buildOperationMapping(snapshot, items) {
    const mapping = {
      snapshotId: snapshot.id,
      transactionId: snapshot.transactionId,
      itemMappings: new Map(),
      operationMappings: new Map(),
      dependencyMappings: new Map()
    };
    
    // 建立项目映射
    items.forEach((item, index) => {
      const itemId = item.id || item.scheduleId;
      mapping.itemMappings.set(itemId, {
        index,
        snapshotIndex: index,
        originalItem: item,
        snapshotItem: snapshot.data.items[index]
      });
    });
    
    // 建立操作映射
    const operationRecord = this.operationRecords.get(snapshot.transactionId);
    if (operationRecord) {
      operationRecord.operations.forEach((operation, index) => {
        mapping.operationMappings.set(operation.id, {
          index,
          operation,
          snapshotIndex: index
        });
      });
    }
    
    // 存储映射关系
    this.operationMappings = this.operationMappings || new Map();
    this.operationMappings.set(snapshot.id, mapping);
  }

  /**
   * 创建操作快照
   * @param {string} transactionId - 事务ID
   * @param {Array} items - 操作项目
   * @param {Object} options - 快照选项
   * @returns {Promise<Object>} 快照对象
   */
  async createSnapshot(transactionId, items, options = {}) {
    const snapshotId = this.generateSnapshotId(transactionId);
    const startTime = Date.now();
    
    try {
      console.log(`[BatchRollback] 创建快照 ${snapshotId} for 事务 ${transactionId}`);
      
      const snapshotType = options.type || SNAPSHOT_TYPE.FULL;
      
      // 获取基础快照(用于增量快照)
      const baseSnapshot = snapshotType === SNAPSHOT_TYPE.INCREMENTAL ? 
        await this.getLatestSnapshot(transactionId) : null;
      
      const snapshot = {
        id: snapshotId,
        transactionId,
        type: snapshotType,
        timestamp: startTime,
        itemCount: items.length,
        
        // 数据快照
        data: await this.captureDataSnapshot(items, snapshotType, {
          ...options,
          baseSnapshot
        }),
        
        // 元数据增强
        metadata: {
          version: await this.generateSnapshotVersion(transactionId),
          compression: options.compression || this.config.compressionLevel > 0,
          encryption: options.encryption || false,
          checksums: {},
          baseSnapshotId: baseSnapshot ? baseSnapshot.id : null,
          createdBy: options.createdBy || 'system',
          tags: options.tags || [],
          retentionPolicy: options.retentionPolicy || 'default'
        },
        
        // 依赖关系增强
        dependencies: await this.analyzeDependencies(items),
        
        // 回滚策略
        rollbackStrategy: options.strategy || ROLLBACK_STRATEGY.IMMEDIATE,
        
        // 状态和统计
        status: 'active',
        size: 0,
        stats: {
          captureTime: 0,
          compressionRatio: 1.0,
          itemsChanged: snapshotType === SNAPSHOT_TYPE.INCREMENTAL ? 0 : items.length
        }
      };
      
      // 计算快照大小和校验和
      snapshot.size = this.calculateSnapshotSize(snapshot.data);
      snapshot.metadata.checksums = this.calculateChecksums(snapshot.data);
      
      // 增量快照特殊处理
      if (snapshotType === SNAPSHOT_TYPE.INCREMENTAL && baseSnapshot) {
        snapshot.stats.itemsChanged = await this.calculateChangedItemsCount(snapshot.data, baseSnapshot.data);
      }
      
      // 验证快照大小
      if (snapshot.size > this.config.maxSnapshotSize) {
        console.warn(`[BatchRollback] 快照过大，尝试压缩: ${snapshot.size} bytes`);
        
        // 自动启用压缩
        if (!snapshot.metadata.compression) {
          snapshot.data = await this.compressSnapshotData(snapshot.data);
          snapshot.metadata.compression = true;
          snapshot.size = this.calculateSnapshotSize(snapshot.data);
          snapshot.stats.compressionRatio = snapshot.size / this.calculateSnapshotSize(await this.decompressSnapshotData(snapshot.data));
        }
        
        // 仍然过大则报错
        if (snapshot.size > this.config.maxSnapshotSize) {
          throw new Error(`快照过大: ${snapshot.size} bytes, 最大允许: ${this.config.maxSnapshotSize} bytes`);
        }
      }
      
      // 压缩快照(如果启用)
      if (snapshot.metadata.compression && !options.skipCompression) {
        const originalSize = snapshot.size;
        snapshot.data = await this.compressSnapshotData(snapshot.data);
        snapshot.size = this.calculateSnapshotSize(snapshot.data);
        snapshot.stats.compressionRatio = snapshot.size / originalSize;
      }
      
      // 加密快照(如果启用)
      if (snapshot.metadata.encryption) {
        snapshot.data = await this.encryptSnapshotData(snapshot.data, options.encryptionKey);
      }
      
      // 版本控制管理
      await this.manageSnapshotVersions(transactionId, snapshot);
      
      // 存储快照
      this.snapshots.set(snapshotId, snapshot);
      
      // 更新统计信息
      this.updateSnapshotStats(snapshot);
      
      snapshot.stats.captureTime = Date.now() - startTime;
      
      console.log(`[BatchRollback] 快照 ${snapshotId} 创建完成, 大小: ${snapshot.size} bytes, 压缩比: ${(snapshot.stats.compressionRatio * 100).toFixed(1)}%`);
      
      return snapshot;
      
    } catch (error) {
      console.error(`[BatchRollback] 创建快照失败:`, error);
      throw new Error(`快照创建失败: ${error.message}`);
    }
  }

  /**
   * 执行回滚操作
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 回滚选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executeRollback(transactionId, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`[BatchRollback] 开始回滚事务 ${transactionId}`);
      
      // 获取事务快照
      const snapshot = this.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      // 验证回滚条件
      await this.validateRollbackConditions(transactionId, options);
      
      // 根据策略执行回滚
      const rollbackResult = await this.executeRollbackByStrategy(
        snapshot, 
        options.strategy || snapshot.rollbackStrategy,
        options
      );
      
      // 记录回滚结果
      const rollbackRecord = {
        transactionId,
        snapshotId: snapshot.id,
        strategy: options.strategy || snapshot.rollbackStrategy,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        success: rollbackResult.success,
        itemsRolledBack: rollbackResult.itemsRolledBack,
        errors: rollbackResult.errors || []
      };
      
      // 如果启用级联回滚，处理依赖事务
      if (this.config.enableCascadeRollback && rollbackResult.success) {
        await this.handleCascadeRollback(transactionId, options);
      }
      
      // 清理快照(可选)
      if (options.cleanupSnapshot && rollbackResult.success) {
        await this.removeSnapshot(snapshot.id);
      }
      
      console.log(`[BatchRollback] 事务 ${transactionId} 回滚完成, 耗时: ${rollbackRecord.duration}ms`);
      
      return rollbackRecord;
      
    } catch (error) {
      console.error(`[BatchRollback] 回滚事务 ${transactionId} 失败:`, error);
      throw new Error(`回滚失败: ${error.message}`);
    }
  }

  /**
   * 执行部分回滚
   * @param {string} transactionId - 事务ID
   * @param {Array} itemIds - 需要回滚的项目ID列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executePartialRollback(transactionId, itemIds, options = {}) {
    try {
      console.log(`[BatchRollback] 开始部分回滚事务 ${transactionId}, 项目数: ${itemIds.length}`);
      
      const snapshot = this.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      // 筛选需要回滚的项目
      const itemsToRollback = this.filterSnapshotItems(snapshot, itemIds);
      
      if (itemsToRollback.length === 0) {
        return {
          success: true,
          itemsRolledBack: 0,
          message: '没有需要回滚的项目'
        };
      }
      
      // 分析影响范围
      const impactAnalysis = await this.analyzeRollbackImpact(itemsToRollback, snapshot);
      
      // 执行部分回滚
      const rollbackResults = [];
      let successCount = 0;
      let failCount = 0;
      
      for (const item of itemsToRollback) {
        try {
          await this.rollbackSingleItem(item, snapshot);
          rollbackResults.push({ itemId: item.id, success: true });
          successCount++;
        } catch (error) {
          rollbackResults.push({ 
            itemId: item.id, 
            success: false, 
            error: error.message 
          });
          failCount++;
        }
      }
      
      console.log(`[BatchRollback] 部分回滚完成, 成功: ${successCount}, 失败: ${failCount}`);
      
      return {
        success: failCount === 0,
        itemsRolledBack: successCount,
        totalItems: itemsToRollback.length,
        results: rollbackResults,
        impactAnalysis
      };
      
    } catch (error) {
      console.error(`[BatchRollback] 部分回滚失败:`, error);
      throw error;
    }
  }

  /**
   * 执行级联回滚
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 级联回滚结果
   */
  async handleCascadeRollback(transactionId, options = {}) {
    try {
      console.log(`[BatchRollback] 开始级联回滚处理, 事务: ${transactionId}`);
      
      // 查找依赖事务
      const dependentTransactions = this.findDependentTransactions(transactionId);
      
      if (dependentTransactions.length === 0) {
        return { cascadeCount: 0, message: '没有依赖事务需要回滚' };
      }
      
      console.log(`[BatchRollback] 发现 ${dependentTransactions.length} 个依赖事务需要级联回滚`);
      
      const cascadeResults = [];
      
      // 按依赖顺序回滚
      for (const depTxId of dependentTransactions) {
        try {
          const result = await this.executeRollback(depTxId, {
            ...options,
            isCascade: true,
            parentTransaction: transactionId
          });
          
          cascadeResults.push({
            transactionId: depTxId,
            success: true,
            result
          });
          
        } catch (error) {
          cascadeResults.push({
            transactionId: depTxId,
            success: false,
            error: error.message
          });
          
          // 级联回滚失败时的处理策略
          if (options.cascadeFailureStrategy === 'abort') {
            throw new Error(`级联回滚失败: ${depTxId} - ${error.message}`);
          }
        }
      }
      
      const successCount = cascadeResults.filter(r => r.success).length;
      
      return {
        cascadeCount: dependentTransactions.length,
        successCount,
        failCount: dependentTransactions.length - successCount,
        results: cascadeResults
      };
      
    } catch (error) {
      console.error(`[BatchRollback] 级联回滚处理失败:`, error);
      throw error;
    }
  }

  /**
   * 回滚影响评估
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 影响评估结果
   */
  async evaluateRollbackImpact(transactionId, options = {}) {
    try {
      console.log(`[BatchRollback] 评估回滚影响, 事务: ${transactionId}`);
      
      const snapshot = this.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      // 分析数据影响
      const dataImpact = await this.analyzeDataImpact(snapshot);
      
      // 分析业务影响
      const businessImpact = await this.analyzeBusinessImpact(snapshot);
      
      // 分析依赖影响
      const dependencyImpact = await this.analyzeDependencyImpact(transactionId);
      
      // 分析性能影响
      const performanceImpact = await this.analyzePerformanceImpact(snapshot);
      
      // 计算影响评分
      const impactScore = this.calculateImpactScore({
        dataImpact,
        businessImpact,
        dependencyImpact,
        performanceImpact
      });
      
      const assessment = {
        transactionId,
        impactScore,
        riskLevel: this.determineRiskLevel(impactScore),
        
        impacts: {
          data: dataImpact,
          business: businessImpact,
          dependency: dependencyImpact,
          performance: performanceImpact
        },
        
        recommendations: this.generateRollbackRecommendations(impactScore),
        estimatedDuration: this.estimateRollbackDuration(snapshot),
        
        timestamp: Date.now()
      };
      
      console.log(`[BatchRollback] 影响评估完成, 风险等级: ${assessment.riskLevel}, 评分: ${impactScore}`);
      
      return assessment;
      
    } catch (error) {
      console.error(`[BatchRollback] 影响评估失败:`, error);
      throw error;
    }
  }

  // ===== 内部实现方法 =====

  async captureDataSnapshot(items, type, options = {}) {
    // 根据快照类型捕获数据
    switch (type) {
      case SNAPSHOT_TYPE.FULL:
        return await this.captureFullSnapshot(items, options);
      case SNAPSHOT_TYPE.INCREMENTAL:
        return await this.captureIncrementalSnapshot(items, options);
      case SNAPSHOT_TYPE.DIFFERENTIAL:
        return await this.captureDifferentialSnapshot(items, options);
      default:
        return await this.captureFullSnapshot(items, options);
    }
  }

  /**
   * 捕获完整快照
   * @param {Array} items - 项目列表  
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 完整快照
   */
  async captureFullSnapshot(items, options = {}) {
    const snapshot = {
      type: SNAPSHOT_TYPE.FULL,
      items: [],
      timestamp: Date.now(),
      metadata: {
        captureMode: options.captureMode || 'deep',
        includeBinary: options.includeBinary || false,
        customFields: options.customFields || []
      }
    };
    
    for (const item of items) {
      const itemSnapshot = await this.captureItemSnapshot(item, 'full', options);
      snapshot.items.push(itemSnapshot);
    }
    
    return snapshot;
  }

  /**
   * 捕获增量快照
   * @param {Array} items - 当前项目列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增量快照
   */
  async captureIncrementalSnapshot(items, options = {}) {
    const baseSnapshot = options.baseSnapshot || await this.getLatestSnapshot(options.transactionId);
    
    const snapshot = {
      type: SNAPSHOT_TYPE.INCREMENTAL,
      items: [],
      timestamp: Date.now(),
      baseSnapshotId: baseSnapshot ? baseSnapshot.id : null,
      changes: {
        added: [],
        modified: [],
        removed: []
      }
    };
    
    if (!baseSnapshot) {
      // 没有基础快照，降级为完整快照
      console.warn('[BatchRollback] 没有基础快照，降级为完整快照');
      return await this.captureFullSnapshot(items, options);
    }
    
    // 构建基础数据索引
    const baseItemsMap = new Map();
    if (baseSnapshot.data && baseSnapshot.data.items) {
      baseSnapshot.data.items.forEach(item => {
        baseItemsMap.set(item.id, item);
      });
    }
    
    // 分析当前项目
    const currentItemsMap = new Map();
    for (const item of items) {
      currentItemsMap.set(item.id || item.scheduleId, item);
      
      const itemId = item.id || item.scheduleId;
      const baseItem = baseItemsMap.get(itemId);
      
      if (!baseItem) {
        // 新增项目
        const itemSnapshot = await this.captureItemSnapshot(item, 'added', options);
        snapshot.items.push(itemSnapshot);
        snapshot.changes.added.push(itemId);
      } else {
        // 检查是否修改
        const currentChecksum = await this.calculateItemChecksum(item);
        const baseChecksum = await this.calculateItemChecksum(baseItem.originalData || baseItem);
        
        if (currentChecksum !== baseChecksum) {
          // 修改的项目
          const itemSnapshot = await this.captureItemSnapshot(item, 'modified', options);
          itemSnapshot.changes = await this.calculateItemChanges(item, baseItem.originalData || baseItem);
          snapshot.items.push(itemSnapshot);
          snapshot.changes.modified.push(itemId);
        }
      }
    }
    
    // 检查删除的项目
    for (const [baseItemId] of baseItemsMap) {
      if (!currentItemsMap.has(baseItemId)) {
        snapshot.changes.removed.push(baseItemId);
      }
    }
    
    return snapshot;
  }

  /**
   * 捕获差异快照
   * @param {Array} items - 当前项目列表  
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 差异快照
   */
  async captureDifferentialSnapshot(items, options = {}) {
    const snapshot = {
      type: SNAPSHOT_TYPE.DIFFERENTIAL,
      items: [],
      timestamp: Date.now(),
      baseSnapshotId: options.baseSnapshot ? options.baseSnapshot.id : null,
      diffs: []
    };
    
    // 实现差异算法（简化版）
    for (const item of items) {
      const itemSnapshot = await this.captureItemSnapshot(item, 'differential', options);
      snapshot.items.push(itemSnapshot);
    }
    
    return snapshot;
  }

  /**
   * 捕获单个项目快照
   * @param {Object} item - 项目
   * @param {string} captureType - 捕获类型
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 项目快照
   */
  async captureItemSnapshot(item, captureType, options = {}) {
    const itemSnapshot = {
      id: item.id || item.scheduleId,
      captureType,
      originalData: await this.deepClone(item),
      metadata: {
        capturedAt: Date.now(),
        version: item.version || 1,
        checksum: await this.calculateItemChecksum(item),
        size: JSON.stringify(item).length
      }
    };
    
    // 添加自定义字段
    if (options.customFields && options.customFields.length > 0) {
      itemSnapshot.customData = {};
      for (const field of options.customFields) {
        if (item[field] !== undefined) {
          itemSnapshot.customData[field] = item[field];
        }
      }
    }
    
    return itemSnapshot;
  }

  /**
   * 计算项目变更
   * @param {Object} currentItem - 当前项目
   * @param {Object} baseItem - 基础项目
   * @returns {Promise<Object>} 变更信息
   */
  async calculateItemChanges(currentItem, baseItem) {
    const changes = {
      fields: {},
      summary: {
        totalChanges: 0,
        addedFields: [],
        modifiedFields: [],
        removedFields: []
      }
    };
    
    // 比较字段变更
    const currentFields = new Set(Object.keys(currentItem));
    const baseFields = new Set(Object.keys(baseItem));
    
    // 新增字段
    for (const field of currentFields) {
      if (!baseFields.has(field)) {
        changes.fields[field] = {
          type: 'added',
          newValue: currentItem[field]
        };
        changes.summary.addedFields.push(field);
        changes.summary.totalChanges++;
      }
    }
    
    // 删除字段
    for (const field of baseFields) {
      if (!currentFields.has(field)) {
        changes.fields[field] = {
          type: 'removed',
          oldValue: baseItem[field]
        };
        changes.summary.removedFields.push(field);
        changes.summary.totalChanges++;
      }
    }
    
    // 修改字段
    for (const field of currentFields) {
      if (baseFields.has(field)) {
        const currentValue = JSON.stringify(currentItem[field]);
        const baseValue = JSON.stringify(baseItem[field]);
        
        if (currentValue !== baseValue) {
          changes.fields[field] = {
            type: 'modified',
            oldValue: baseItem[field],
            newValue: currentItem[field]
          };
          changes.summary.modifiedFields.push(field);
          changes.summary.totalChanges++;
        }
      }
    }
    
    return changes;
  }

  async executeRollbackByStrategy(snapshot, strategy, options) {
    switch (strategy) {
      case ROLLBACK_STRATEGY.IMMEDIATE:
        return await this.executeImmediateRollback(snapshot, options);
      case ROLLBACK_STRATEGY.PARTIAL:
        return await this.executePartialRollbackInternal(snapshot, options);
      case ROLLBACK_STRATEGY.CASCADE:
        return await this.executeCascadeRollbackInternal(snapshot, options);
      case ROLLBACK_STRATEGY.COMPENSATING:
        return await this.executeCompensatingRollback(snapshot, options);
      default:
        throw new Error(`不支持的回滚策略: ${strategy}`);
    }
  }

  async executeImmediateRollback(snapshot, options) {
    const results = {
      success: true,
      itemsRolledBack: 0,
      errors: []
    };
    
    for (const item of snapshot.data.items) {
      try {
        await this.rollbackSingleItem(item, snapshot);
        results.itemsRolledBack++;
      } catch (error) {
        results.errors.push({
          itemId: item.id,
          error: error.message
        });
        results.success = false;
      }
    }
    
    return results;
  }

  async rollbackSingleItem(item, snapshot) {
    // 根据项目类型执行具体的回滚操作
    const originalData = item.originalData;
    
    // 这里应该根据具体业务逻辑实现回滚
    // 临时实现：模拟回滚操作
    console.log(`回滚项目: ${item.id}`);
    
    // 模拟异步回滚操作
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return { success: true, itemId: item.id };
  }

  getTransactionSnapshot(transactionId) {
    for (const [snapshotId, snapshot] of this.snapshots) {
      if (snapshot.transactionId === transactionId) {
        return snapshot;
      }
    }
    return null;
  }

  findDependentTransactions(transactionId) {
    const dependents = [];
    
    if (this.dependencyGraph.has(transactionId)) {
      const dependencies = this.dependencyGraph.get(transactionId);
      dependents.push(...dependencies);
    }
    
    return dependents;
  }

  /**
   * 增强的级联回滚处理
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 级联回滚结果
   */
  async executeAdvancedCascadeRollback(transactionId, options = {}) {
    const cascadeId = this.generateCascadeId(transactionId);
    const startTime = Date.now();
    
    try {
      console.log(`[BatchRollback] 开始增强级联回滚 ${cascadeId} for 事务 ${transactionId}`);
      
      // 级联图分析
      const cascadeAnalysis = await this.analyzeCascadeGraph(transactionId, options);
      
      if (cascadeAnalysis.dependentTransactions.length === 0) {
        return {
          success: true,
          cascadeId,
          message: '无依赖事务需要级联回滚',
          cascadeAnalysis
        };
      }
      
      // 级联回滚策略选择
      const cascadeStrategy = await this.selectCascadeStrategy(cascadeAnalysis, options);
      
      // 分阶段执行级联回滚
      const cascadeResult = await this.executeCascadePhases(transactionId, cascadeAnalysis, cascadeStrategy, options);
      
      // 级联一致性验证
      const consistencyCheck = await this.validateCascadeConsistency(cascadeResult, cascadeAnalysis);
      
      const duration = Date.now() - startTime;
      
      return {
        success: cascadeResult.overallSuccess,
        cascadeId,
        transactionId,
        duration,
        cascadeAnalysis,
        cascadeStrategy,
        cascadeResult,
        consistencyCheck,
        summary: {
          totalDependentTransactions: cascadeAnalysis.dependentTransactions.length,
          successfulRollbacks: cascadeResult.phases.reduce((sum, phase) => sum + phase.successCount, 0),
          failedRollbacks: cascadeResult.phases.reduce((sum, phase) => sum + phase.failCount, 0),
          phasesExecuted: cascadeResult.phases.length
        }
      };
      
    } catch (error) {
      console.error(`[BatchRollback] 增强级联回滚 ${cascadeId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 分析级联图
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 级联分析结果
   */
  async analyzeCascadeGraph(transactionId, options = {}) {
    const analysis = {
      rootTransaction: transactionId,
      dependentTransactions: [],
      dependencyLevels: [],
      cascadeGraph: new Map(),
      circularDependencies: [],
      criticalPaths: [],
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        mitigationStrategies: []
      },
      executionOrder: [],
      estimatedDuration: 0,
      resourceRequirements: {
        memory: 0,
        cpu: 0,
        network: 0
      }
    };
    
    // 构建级联依赖图
    const visitedNodes = new Set();
    const dependencyQueue = [{ txId: transactionId, level: 0, path: [] }];
    
    while (dependencyQueue.length > 0) {
      const { txId, level, path } = dependencyQueue.shift();
      
      if (visitedNodes.has(txId)) {
        // 检测到循环依赖
        const cycleIndex = path.indexOf(txId);
        if (cycleIndex >= 0) {
          analysis.circularDependencies.push({
            cycle: path.slice(cycleIndex).concat([txId]),
            impact: 'high',
            resolution: '需要特殊处理循环依赖'
          });
        }
        continue;
      }
      
      visitedNodes.add(txId);
      
      // 获取直接依赖事务
      const directDependents = this.findDirectDependentTransactions(txId);
      
      if (directDependents.length > 0) {
        // 初始化级别数组
        while (analysis.dependencyLevels.length <= level) {
          analysis.dependencyLevels.push([]);
        }
        
        for (const depTxId of directDependents) {
          if (depTxId !== transactionId) { // 避免自引用
            analysis.dependentTransactions.push(depTxId);
            analysis.dependencyLevels[level].push(depTxId);
            
            // 构建级联图节点
            if (!analysis.cascadeGraph.has(depTxId)) {
              const depSnapshot = this.getTransactionSnapshot(depTxId);
              analysis.cascadeGraph.set(depTxId, {
                transactionId: depTxId,
                level,
                parentTransactions: [txId],
                childTransactions: [],
                snapshot: depSnapshot,
                estimatedRollbackTime: this.estimateTransactionRollbackTime(depTxId, depSnapshot),
                riskLevel: this.assessTransactionRollbackRisk(depTxId, depSnapshot),
                resourceRequirement: this.calculateTransactionResourceRequirement(depTxId, depSnapshot)
              });
            } else {
              // 添加到父事务列表
              const node = analysis.cascadeGraph.get(depTxId);
              if (!node.parentTransactions.includes(txId)) {
                node.parentTransactions.push(txId);
              }
            }
            
            // 继续搜索下一级依赖
            dependencyQueue.push({
              txId: depTxId,
              level: level + 1,
              path: path.concat([txId])
            });
          }
        }
      }
    }
    
    // 计算关键路径
    analysis.criticalPaths = this.identifyCriticalPaths(analysis.cascadeGraph);
    
    // 计算执行顺序
    analysis.executionOrder = this.calculateCascadeExecutionOrder(analysis.cascadeGraph, analysis.dependencyLevels);
    
    // 风险评估
    analysis.riskAssessment = this.assessCascadeRisk(analysis);
    
    // 资源需求计算
    analysis.resourceRequirements = this.calculateCascadeResourceRequirements(analysis.cascadeGraph);
    
    // 估算总时间
    analysis.estimatedDuration = this.estimateCascadeDuration(analysis);
    
    return analysis;
  }

  /**
   * 选择级联回滚策略
   * @param {Object} cascadeAnalysis - 级联分析结果
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 级联策略
   */
  async selectCascadeStrategy(cascadeAnalysis, options = {}) {
    const strategies = {
      sequential: {
        name: 'sequential',
        description: '顺序执行，按依赖层级逐级回滚',
        advantages: ['安全可靠', '容易跟踪', '依赖关系明确'],
        disadvantages: ['执行时间较长'],
        suitableFor: ['复杂依赖关系', '高风险操作'],
        score: 0
      },
      parallel: {
        name: 'parallel',
        description: '并行执行，同级别事务并发回滚',
        advantages: ['执行速度快', '资源利用率高'],
        disadvantages: ['并发复杂度高', '错误处理复杂'],
        suitableFor: ['独立事务', '资源充足'],
        score: 0
      },
      hybrid: {
        name: 'hybrid',
        description: '混合模式，结合顺序和并行',
        advantages: ['平衡性能和安全', '灵活适应'],
        disadvantages: ['策略复杂度中等'],
        suitableFor: ['一般情况', '资源中等'],
        score: 0
      },
      adaptive: {
        name: 'adaptive',
        description: '自适应模式，根据实时情况动态调整',
        advantages: ['智能优化', '适应性强'],
        disadvantages: ['实现复杂', '不可预测性'],
        suitableFor: ['复杂环境', '高级用户'],
        score: 0
      }
    };
    
    // 策略评分
    const riskLevel = cascadeAnalysis.riskAssessment.overallRisk;
    const dependentCount = cascadeAnalysis.dependentTransactions.length;
    const hasCircularDeps = cascadeAnalysis.circularDependencies.length > 0;
    const maxLevel = cascadeAnalysis.dependencyLevels.length;
    
    // Sequential 策略评分
    strategies.sequential.score = 70; // 基础分
    if (riskLevel === 'high') strategies.sequential.score += 20;
    if (hasCircularDeps) strategies.sequential.score += 15;
    if (dependentCount > 20) strategies.sequential.score -= 10;
    
    // Parallel 策略评分
    strategies.parallel.score = 60;
    if (riskLevel === 'low') strategies.parallel.score += 25;
    if (maxLevel <= 2) strategies.parallel.score += 15;
    if (dependentCount <= 10) strategies.parallel.score += 10;
    if (hasCircularDeps) strategies.parallel.score -= 30;
    
    // Hybrid 策略评分
    strategies.hybrid.score = 75; // 默认推荐
    if (dependentCount > 5 && dependentCount <= 20) strategies.hybrid.score += 15;
    if (maxLevel > 2 && maxLevel <= 5) strategies.hybrid.score += 10;
    
    // Adaptive 策略评分
    strategies.adaptive.score = 65;
    if (cascadeAnalysis.criticalPaths.length > 2) strategies.adaptive.score += 20;
    if (dependentCount > 15) strategies.adaptive.score += 15;
    
    // 用户指定策略
    if (options.forcedStrategy && strategies[options.forcedStrategy]) {
      return {
        ...strategies[options.forcedStrategy],
        reason: '用户指定策略',
        forced: true,
        alternatives: Object.values(strategies).filter(s => s.name !== options.forcedStrategy).sort((a, b) => b.score - a.score).slice(0, 2)
      };
    }
    
    // 选择最优策略
    const bestStrategy = Object.values(strategies).reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return {
      ...bestStrategy,
      reason: `基于风险等级(${riskLevel})、依赖数量(${dependentCount})和层级数(${maxLevel})的智能选择`,
      alternatives: Object.values(strategies).filter(s => s.name !== bestStrategy.name).sort((a, b) => b.score - a.score).slice(0, 2),
      scoringDetails: {
        riskLevel,
        dependentCount,
        hasCircularDeps,
        maxLevel,
        strategies: Object.fromEntries(
          Object.entries(strategies).map(([name, strategy]) => [name, { score: strategy.score, name: strategy.name }])
        )
      }
    };
  }

  /**
   * 执行级联阶段
   * @param {string} transactionId - 事务ID
   * @param {Object} cascadeAnalysis - 级联分析结果
   * @param {Object} cascadeStrategy - 级联策略
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 执行结果
   */
  async executeCascadePhases(transactionId, cascadeAnalysis, cascadeStrategy, options = {}) {
    const result = {
      overallSuccess: true,
      phases: [],
      errors: [],
      warnings: [],
      executionStrategy: cascadeStrategy.name,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      statistics: {
        totalTransactions: cascadeAnalysis.dependentTransactions.length,
        successfulTransactions: 0,
        failedTransactions: 0,
        skippedTransactions: 0,
        totalRollbacks: 0
      }
    };
    
    try {
      switch (cascadeStrategy.name) {
        case 'sequential':
          await this.executeSequentialCascade(cascadeAnalysis, result, options);
          break;
          
        case 'parallel':
          await this.executeParallelCascade(cascadeAnalysis, result, options);
          break;
          
        case 'hybrid':
          await this.executeHybridCascade(cascadeAnalysis, result, options);
          break;
          
        case 'adaptive':
          await this.executeAdaptiveCascade(cascadeAnalysis, result, options);
          break;
          
        default:
          throw new Error(`未知的级联策略: ${cascadeStrategy.name}`);
      }
      
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.overallSuccess = result.statistics.failedTransactions === 0;
      
    } catch (error) {
      result.overallSuccess = false;
      result.errors.push({
        type: 'execution_failure',
        message: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
    
    return result;
  }

  generateSnapshotId(transactionId) {
    return `snapshot_${transactionId}_${Date.now()}`;
  }

  calculateSnapshotSize(data) {
    return JSON.stringify(data).length;
  }

  calculateChecksums(data) {
    return {
      md5: this.calculateMD5(JSON.stringify(data))
    };
  }

  calculateMD5(str) {
    // 简单的字符串哈希实现
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // ===== 级联回滚执行策略方法 =====

  /**
   * 执行顺序级联回滚
   */
  async executeSequentialCascade(cascadeAnalysis, result, options) {
    console.log('[BatchRollback] 开始执行顺序级联回滚');
    
    for (let level = 0; level < cascadeAnalysis.dependencyLevels.length; level++) {
      const levelTransactions = cascadeAnalysis.dependencyLevels[level] || [];
      
      if (levelTransactions.length === 0) continue;
      
      const phaseStartTime = Date.now();
      const phase = {
        level,
        transactions: [...levelTransactions],
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        errors: [],
        startTime: phaseStartTime,
        endTime: null,
        duration: 0
      };
      
      console.log(`[BatchRollback] 执行级联级别 ${level}，事务数: ${levelTransactions.length}`);
      
      for (const txId of levelTransactions) {
        try {
          const rollbackResult = await this.executeRollback(txId, {
            ...options,
            isCascade: true,
            parentTransaction: cascadeAnalysis.rootTransaction,
            cascadeLevel: level
          });
          
          phase.successCount++;
          result.statistics.successfulTransactions++;
          result.statistics.totalRollbacks++;
          
        } catch (error) {
          console.error(`[BatchRollback] 级联回滚事务 ${txId} 失败:`, error);
          
          phase.failCount++;
          result.statistics.failedTransactions++;
          phase.errors.push({
            transactionId: txId,
            error: error.message,
            timestamp: Date.now()
          });
          
          // 根据策略决定是否继续
          if (options.abortOnFailure) {
            throw new Error(`顺序级联回滚失败，事务: ${txId}`);
          }
        }
      }
      
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phaseStartTime;
      result.phases.push(phase);
      
      console.log(`[BatchRollback] 级联级别 ${level} 完成，成功: ${phase.successCount}, 失败: ${phase.failCount}`);
    }
  }

  /**
   * 执行并行级联回滚
   */
  async executeParallelCascade(cascadeAnalysis, result, options) {
    console.log('[BatchRollback] 开始执行并行级联回滚');
    
    const maxConcurrency = options.maxConcurrency || 5;
    
    for (let level = 0; level < cascadeAnalysis.dependencyLevels.length; level++) {
      const levelTransactions = cascadeAnalysis.dependencyLevels[level] || [];
      
      if (levelTransactions.length === 0) continue;
      
      const phaseStartTime = Date.now();
      const phase = {
        level,
        transactions: [...levelTransactions],
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        errors: [],
        startTime: phaseStartTime,
        endTime: null,
        duration: 0
      };
      
      console.log(`[BatchRollback] 并行执行级联级别 ${level}，事务数: ${levelTransactions.length}`);
      
      // 将事务分批并行执行
      const batches = [];
      for (let i = 0; i < levelTransactions.length; i += maxConcurrency) {
        batches.push(levelTransactions.slice(i, i + maxConcurrency));
      }
      
      for (const batch of batches) {
        const promises = batch.map(async (txId) => {
          try {
            const rollbackResult = await this.executeRollback(txId, {
              ...options,
              isCascade: true,
              parentTransaction: cascadeAnalysis.rootTransaction,
              cascadeLevel: level
            });
            
            return { success: true, txId, result: rollbackResult };
            
          } catch (error) {
            return { success: false, txId, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(promises);
        
        batchResults.forEach(batchResult => {
          if (batchResult.success) {
            phase.successCount++;
            result.statistics.successfulTransactions++;
            result.statistics.totalRollbacks++;
          } else {
            phase.failCount++;
            result.statistics.failedTransactions++;
            phase.errors.push({
              transactionId: batchResult.txId,
              error: batchResult.error,
              timestamp: Date.now()
            });
          }
        });
      }
      
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phaseStartTime;
      result.phases.push(phase);
      
      console.log(`[BatchRollback] 并行级联级别 ${level} 完成，成功: ${phase.successCount}, 失败: ${phase.failCount}`);
    }
  }

  /**
   * 执行混合级联回滚
   */
  async executeHybridCascade(cascadeAnalysis, result, options) {
    console.log('[BatchRollback] 开始执行混合级联回滚');
    
    const hybridThreshold = options.hybridThreshold || 10; // 超过这个数量使用并行
    
    for (let level = 0; level < cascadeAnalysis.dependencyLevels.length; level++) {
      const levelTransactions = cascadeAnalysis.dependencyLevels[level] || [];
      
      if (levelTransactions.length === 0) continue;
      
      const phaseStartTime = Date.now();
      const phase = {
        level,
        transactions: [...levelTransactions],
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        errors: [],
        startTime: phaseStartTime,
        endTime: null,
        duration: 0,
        strategy: levelTransactions.length > hybridThreshold ? 'parallel' : 'sequential'
      };
      
      console.log(`[BatchRollback] 混合模式级联级别 ${level}，使用${phase.strategy}策略，事务数: ${levelTransactions.length}`);
      
      if (phase.strategy === 'parallel') {
        // 使用并行策略
        await this.executeParallelPhase(levelTransactions, cascadeAnalysis, phase, result, options);
      } else {
        // 使用顺序策略
        await this.executeSequentialPhase(levelTransactions, cascadeAnalysis, phase, result, options);
      }
      
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phaseStartTime;
      result.phases.push(phase);
      
      console.log(`[BatchRollback] 混合级联级别 ${level} 完成，成功: ${phase.successCount}, 失败: ${phase.failCount}`);
    }
  }

  /**
   * 执行自适应级联回滚
   */
  async executeAdaptiveCascade(cascadeAnalysis, result, options) {
    console.log('[BatchRollback] 开始执行自适应级联回滚');
    
    let adaptiveStrategy = {
      currentConcurrency: 3,
      maxConcurrency: options.maxConcurrency || 10,
      minConcurrency: 1,
      failureThreshold: 0.2,
      adjustmentFactor: 1.5
    };
    
    for (let level = 0; level < cascadeAnalysis.dependencyLevels.length; level++) {
      const levelTransactions = cascadeAnalysis.dependencyLevels[level] || [];
      
      if (levelTransactions.length === 0) continue;
      
      const phaseStartTime = Date.now();
      const phase = {
        level,
        transactions: [...levelTransactions],
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        errors: [],
        startTime: phaseStartTime,
        endTime: null,
        duration: 0,
        adaptiveMetrics: {
          initialConcurrency: adaptiveStrategy.currentConcurrency,
          finalConcurrency: adaptiveStrategy.currentConcurrency,
          adjustments: []
        }
      };
      
      console.log(`[BatchRollback] 自适应级联级别 ${level}，初始并发数: ${adaptiveStrategy.currentConcurrency}，事务数: ${levelTransactions.length}`);
      
      await this.executeAdaptivePhase(levelTransactions, cascadeAnalysis, phase, result, adaptiveStrategy, options);
      
      phase.adaptiveMetrics.finalConcurrency = adaptiveStrategy.currentConcurrency;
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phaseStartTime;
      result.phases.push(phase);
      
      console.log(`[BatchRollback] 自适应级联级别 ${level} 完成，成功: ${phase.successCount}, 失败: ${phase.failCount}, 最终并发数: ${adaptiveStrategy.currentConcurrency}`);
    }
  }

  /**
   * 执行并行阶段
   */
  async executeParallelPhase(transactions, cascadeAnalysis, phase, result, options) {
    const maxConcurrency = options.maxConcurrency || 5;
    
    // 将事务分批并行执行
    const batches = [];
    for (let i = 0; i < transactions.length; i += maxConcurrency) {
      batches.push(transactions.slice(i, i + maxConcurrency));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (txId) => {
        try {
          const rollbackResult = await this.executeRollback(txId, {
            ...options,
            isCascade: true,
            parentTransaction: cascadeAnalysis.rootTransaction,
            cascadeLevel: phase.level
          });
          
          return { success: true, txId, result: rollbackResult };
          
        } catch (error) {
          return { success: false, txId, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach(batchResult => {
        if (batchResult.success) {
          phase.successCount++;
          result.statistics.successfulTransactions++;
          result.statistics.totalRollbacks++;
        } else {
          phase.failCount++;
          result.statistics.failedTransactions++;
          phase.errors.push({
            transactionId: batchResult.txId,
            error: batchResult.error,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  /**
   * 执行顺序阶段
   */
  async executeSequentialPhase(transactions, cascadeAnalysis, phase, result, options) {
    for (const txId of transactions) {
      try {
        const rollbackResult = await this.executeRollback(txId, {
          ...options,
          isCascade: true,
          parentTransaction: cascadeAnalysis.rootTransaction,
          cascadeLevel: phase.level
        });
        
        phase.successCount++;
        result.statistics.successfulTransactions++;
        result.statistics.totalRollbacks++;
        
      } catch (error) {
        console.error(`[BatchRollback] 级联回滚事务 ${txId} 失败:`, error);
        
        phase.failCount++;
        result.statistics.failedTransactions++;
        phase.errors.push({
          transactionId: txId,
          error: error.message,
          timestamp: Date.now()
        });
        
        // 根据策略决定是否继续
        if (options.abortOnFailure) {
          throw new Error(`顺序级联回滚失败，事务: ${txId}`);
        }
      }
    }
  }

  /**
   * 执行自适应阶段
   */
  async executeAdaptivePhase(transactions, cascadeAnalysis, phase, result, adaptiveStrategy, options) {
    let remainingTransactions = [...transactions];
    
    while (remainingTransactions.length > 0) {
      const batchSize = Math.min(adaptiveStrategy.currentConcurrency, remainingTransactions.length);
      const currentBatch = remainingTransactions.splice(0, batchSize);
      
      const batchStartTime = Date.now();
      const promises = currentBatch.map(async (txId) => {
        try {
          const rollbackResult = await this.executeRollback(txId, {
            ...options,
            isCascade: true,
            parentTransaction: cascadeAnalysis.rootTransaction,
            cascadeLevel: phase.level
          });
          
          return { success: true, txId, result: rollbackResult };
          
        } catch (error) {
          return { success: false, txId, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(promises);
      const batchDuration = Date.now() - batchStartTime;
      
      // 统计批次结果
      let batchSuccessCount = 0;
      let batchFailCount = 0;
      
      batchResults.forEach(batchResult => {
        if (batchResult.success) {
          batchSuccessCount++;
          phase.successCount++;
          result.statistics.successfulTransactions++;
          result.statistics.totalRollbacks++;
        } else {
          batchFailCount++;
          phase.failCount++;
          result.statistics.failedTransactions++;
          phase.errors.push({
            transactionId: batchResult.txId,
            error: batchResult.error,
            timestamp: Date.now()
          });
        }
      });
      
      // 自适应调整
      const batchFailureRate = batchFailCount / currentBatch.length;
      const adjustment = this.calculateAdaptiveAdjustment(
        adaptiveStrategy, 
        batchFailureRate, 
        batchDuration, 
        remainingTransactions.length
      );
      
      if (adjustment.shouldAdjust) {
        console.log(`[BatchRollback] 自适应调整：${adjustment.oldConcurrency} -> ${adjustment.newConcurrency}, 原因: ${adjustment.reason}`);
        
        phase.adaptiveMetrics.adjustments.push({
          timestamp: Date.now(),
          oldConcurrency: adjustment.oldConcurrency,
          newConcurrency: adjustment.newConcurrency,
          reason: adjustment.reason,
          failureRate: batchFailureRate,
          duration: batchDuration
        });
        
        adaptiveStrategy.currentConcurrency = adjustment.newConcurrency;
      }
    }
  }

  /**
   * 计算自适应调整
   */
  calculateAdaptiveAdjustment(strategy, failureRate, duration, remainingCount) {
    const adjustment = {
      shouldAdjust: false,
      oldConcurrency: strategy.currentConcurrency,
      newConcurrency: strategy.currentConcurrency,
      reason: ''
    };
    
    // 基于失败率调整
    if (failureRate > strategy.failureThreshold) {
      // 失败率过高，降低并发数
      adjustment.newConcurrency = Math.max(
        strategy.minConcurrency,
        Math.floor(strategy.currentConcurrency / strategy.adjustmentFactor)
      );
      adjustment.reason = `失败率过高 (${(failureRate * 100).toFixed(1)}%)`;
      adjustment.shouldAdjust = true;
    } else if (failureRate === 0 && duration < 5000) {
      // 全部成功且速度很快，可以增加并发数
      adjustment.newConcurrency = Math.min(
        strategy.maxConcurrency,
        Math.ceil(strategy.currentConcurrency * strategy.adjustmentFactor)
      );
      adjustment.reason = `性能良好，可以提高并发`;
      adjustment.shouldAdjust = true;
    }
    
    // 如果剩余任务很少，降低并发数
    if (remainingCount < strategy.currentConcurrency && remainingCount > 0) {
      adjustment.newConcurrency = remainingCount;
      adjustment.reason = `剩余任务较少`;
      adjustment.shouldAdjust = true;
    }
    
    return adjustment;
  }

  /**
   * 验证级联一致性
   */
  async validateCascadeConsistency(cascadeResult, cascadeAnalysis) {
    const consistency = {
      valid: true,
      score: 100,
      issues: [],
      warnings: [],
      recommendations: []
    };
    
    try {
      // 检查所有依赖事务是否已处理
      const processedTransactions = new Set();
      cascadeResult.phases.forEach(phase => {
        phase.transactions.forEach(txId => processedTransactions.add(txId));
      });
      
      const missingTransactions = cascadeAnalysis.dependentTransactions.filter(
        txId => !processedTransactions.has(txId)
      );
      
      if (missingTransactions.length > 0) {
        consistency.valid = false;
        consistency.score -= 30;
        consistency.issues.push({
          type: 'missing_transactions',
          message: `未处理的依赖事务: ${missingTransactions.join(', ')}`,
          severity: 'high'
        });
      }
      
      // 检查循环依赖处理
      if (cascadeAnalysis.circularDependencies.length > 0) {
        const unhandledCircular = cascadeAnalysis.circularDependencies.filter(
          cycle => !this.isCircularDependencyResolved(cycle, cascadeResult)
        );
        
        if (unhandledCircular.length > 0) {
          consistency.score -= 20;
          consistency.warnings.push({
            type: 'unresolved_circular',
            message: `未解决的循环依赖: ${unhandledCircular.length} 个`,
            severity: 'medium'
          });
        }
      }
      
      // 检查失败率
      const totalTransactions = cascadeResult.statistics.totalTransactions;
      const failedTransactions = cascadeResult.statistics.failedTransactions;
      const failureRate = totalTransactions > 0 ? failedTransactions / totalTransactions : 0;
      
      if (failureRate > 0.3) {
        consistency.score -= 25;
        consistency.warnings.push({
          type: 'high_failure_rate',
          message: `失败率过高: ${(failureRate * 100).toFixed(1)}%`,
          severity: 'high'
        });
      }
      
      // 生成建议
      if (consistency.score < 80) {
        consistency.recommendations.push('建议检查失败的事务并重新执行级联回滚');
      }
      
      if (missingTransactions.length > 0) {
        consistency.recommendations.push('需要手动处理未完成的依赖事务');
      }
      
      console.log(`[BatchRollback] 级联一致性验证完成，得分: ${consistency.score}/100`);
      
    } catch (error) {
      console.error('[BatchRollback] 级联一致性验证失败:', error);
      consistency.valid = false;
      consistency.score = 0;
      consistency.issues.push({
        type: 'validation_error',
        message: `验证过程失败: ${error.message}`,
        severity: 'critical'
      });
    }
    
    return consistency;
  }

  /**
   * 检查循环依赖是否已解决
   */
  isCircularDependencyResolved(cycle, cascadeResult) {
    // 简化实现：检查循环中的所有事务是否都已成功回滚
    const successfulTransactions = new Set();
    cascadeResult.phases.forEach(phase => {
      // 这里需要更复杂的逻辑来追踪成功的事务
      if (phase.successCount > 0) {
        phase.transactions.forEach(txId => successfulTransactions.add(txId));
      }
    });
    
    return cycle.cycle.every(txId => successfulTransactions.has(txId));
  }

  /**
   * 生成级联ID
   */
  generateCascadeId(transactionId) {
    return `cascade_${transactionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async calculateItemChecksum(item) {
    return this.calculateMD5(JSON.stringify(item));
  }

  async deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ===== 操作记录快照增强方法 =====

  /**
   * 捕获系统状态
   * @returns {Promise<Object>} 系统状态
   */
  async captureSystemState() {
    return {
      timestamp: Date.now(),
      activeTransactions: batchTransactionService.activeTransactions.size,
      memoryUsage: this.estimateMemoryUsage(),
      snapshotCount: this.snapshots.size,
      operationRecordCount: this.operationRecords.size
    };
  }

  /**
   * 捕获环境信息
   * @returns {Promise<Object>} 环境信息
   */
  async captureEnvironmentInfo() {
    return {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'miniprogram',
      platform: 'wechat-miniprogram',
      version: '1.0.0',
      networkType: await this.detectNetworkType(),
      deviceInfo: await this.getDeviceInfo()
    };
  }

  /**
   * 捕获项目状态
   * @param {Object} item - 项目
   * @param {string} stage - 阶段（before/after）
   * @returns {Promise<Object>} 项目状态
   */
  async captureItemState(item, stage) {
    return {
      stage,
      timestamp: Date.now(),
      itemId: item.id || item.scheduleId,
      status: item.status || 'unknown',
      data: await this.deepClone(item),
      checksum: await this.calculateItemChecksum(item),
      size: JSON.stringify(item).length,
      version: item.version || 1
    };
  }

  /**
   * 查找下游依赖
   * @param {Object} item - 项目
   * @returns {Promise<Array>} 下游依赖列表
   */
  async findDownstreamDependencies(item) {
    // 简化实现，实际应用中需要根据业务逻辑实现
    return [];
  }

  /**
   * 查找外部依赖
   * @param {Object} item - 项目
   * @returns {Promise<Array>} 外部依赖列表
   */
  async findExternalDependencies(item) {
    // 简化实现
    return [];
  }

  /**
   * 评估操作风险
   * @param {Object} item - 项目
   * @returns {Object} 风险评估
   */
  assessOperationRisk(item) {
    let risk = 0.3;
    
    // 根据操作类型评估风险
    const operationRisks = {
      'delete': 0.9,
      'update': 0.6,
      'create': 0.4,
      'read': 0.1
    };
    
    const operationType = item.operationType || item.action || 'update';
    risk += operationRisks[operationType] || 0.5;
    
    // 数据大小风险
    const dataSize = JSON.stringify(item).length;
    if (dataSize > 10000) {
      risk += 0.2;
    }
    
    return {
      level: risk > 0.7 ? 'high' : risk > 0.4 ? 'medium' : 'low',
      score: Math.min(risk, 1.0),
      factors: {
        operationType: operationType,
        dataSize: dataSize,
        hasComplexData: this.hasComplexData(item)
      }
    };
  }

  /**
   * 评估业务风险
   * @param {Object} item - 项目
   * @returns {Object} 业务风险评估
   */
  assessBusinessRisk(item) {
    let risk = 0.2;
    
    // 优先级风险
    const priority = item.priority || 'medium';
    const priorityRisks = {
      'critical': 0.8,
      'high': 0.6,
      'medium': 0.4,
      'low': 0.2
    };
    
    risk += priorityRisks[priority] || 0.4;
    
    // 用户影响风险
    if (item.userIds && item.userIds.length > 50) {
      risk += 0.3;
    }
    
    return {
      level: risk > 0.7 ? 'high' : risk > 0.4 ? 'medium' : 'low',
      score: Math.min(risk, 1.0),
      factors: {
        priority: priority,
        userImpact: item.userIds ? item.userIds.length : 0,
        businessCritical: item.businessCritical || false
      }
    };
  }

  /**
   * 捕获增强数据快照
   * @param {Array} items - 项目列表
   * @param {Object} operationRecord - 操作记录
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增强数据快照
   */
  async captureEnhancedDataSnapshot(items, operationRecord, options = {}) {
    const snapshot = {
      type: options.type || SNAPSHOT_TYPE.FULL,
      items: [],
      timestamp: Date.now(),
      
      // 操作上下文
      operationContext: {
        recordId: operationRecord.id,
        executionMode: operationRecord.context.executionMode,
        priority: operationRecord.context.priority
      },
      
      // 批量信息
      batchInfo: {
        totalBatches: Math.ceil(items.length / (options.batchSize || 50)),
        currentBatch: options.currentBatch || 1,
        itemsPerBatch: options.batchSize || 50
      },
      
      // 一致性信息
      consistencyInfo: {
        globalChecksum: await this.calculateGlobalChecksum(items),
        itemChecksums: new Map(),
        crossReferences: await this.buildCrossReferences(items)
      }
    };
    
    // 捕获每个项目的增强信息
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const operation = operationRecord.operations[i];
      
      const itemSnapshot = await this.captureEnhancedItemSnapshot(item, operation, options);
      snapshot.items.push(itemSnapshot);
      
      // 存储项目校验和
      snapshot.consistencyInfo.itemChecksums.set(
        item.id || item.scheduleId,
        itemSnapshot.metadata.checksum
      );
    }
    
    return snapshot;
  }

  /**
   * 捕获增强项目快照
   * @param {Object} item - 项目
   * @param {Object} operation - 操作记录
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增强项目快照
   */
  async captureEnhancedItemSnapshot(item, operation, options = {}) {
    const itemSnapshot = {
      id: item.id || item.scheduleId,
      captureType: 'enhanced',
      
      // 原始数据
      originalData: await this.deepClone(item),
      
      // 操作前状态
      beforeState: operation.beforeState,
      
      // 预期操作
      expectedOperation: operation.expectedOperation,
      
      // 依赖信息
      dependencies: operation.dependencies,
      
      // 风险评估
      riskAssessment: operation.riskAssessment,
      
      // 元数据
      metadata: {
        capturedAt: Date.now(),
        version: item.version || 1,
        checksum: await this.calculateItemChecksum(item),
        size: JSON.stringify(item).length,
        complexity: this.calculateItemComplexity(item),
        
        // 增强元数据
        enhancedMetadata: {
          operationId: operation.id,
          captureMethod: options.captureMethod || 'full',
          validationLevel: options.validationLevel || 'standard',
          integrityHash: await this.calculateIntegrityHash(item),
          changeVector: await this.calculateChangeVector(item)
        }
      },
      
      // 验证信息
      validation: {
        structureValid: await this.validateItemStructure(item),
        dataValid: await this.validateItemData(item),
        relationshipValid: await this.validateItemRelationships(item)
      }
    };
    
    return itemSnapshot;
  }

  /**
   * 创建恢复点
   * @param {Array} items - 项目列表
   * @param {Object} operationRecord - 操作记录
   * @returns {Promise<Array>} 恢复点列表
   */
  async createRecoveryPoints(items, operationRecord) {
    const recoveryPoints = [];
    
    // 主恢复点（操作前）
    recoveryPoints.push({
      id: `recovery_main_${operationRecord.id}`,
      type: 'main',
      timestamp: Date.now(),
      description: '主恢复点 - 操作执行前状态',
      state: {
        operationRecord: await this.deepClone(operationRecord),
        itemStates: await Promise.all(items.map(item => this.captureItemState(item, 'recovery')))
      },
      recoveryInstructions: {
        rollbackMethod: 'full',
        dependencies: operationRecord.operations.map(op => op.dependencies).flat(),
        preconditions: await this.generateRecoveryPreconditions(items)
      }
    });
    
    // 批量恢复点（每50个项目）
    const batchSize = 50;
    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      
      recoveryPoints.push({
        id: `recovery_batch_${operationRecord.id}_${batchIndex}`,
        type: 'batch',
        timestamp: Date.now(),
        description: `批量恢复点 ${batchIndex + 1} - 项目 ${i + 1} 到 ${Math.min(i + batchSize, items.length)}`,
        state: {
          batchIndex,
          batchItems: await this.deepClone(batchItems),
          batchOperations: operationRecord.operations.slice(i, i + batchSize)
        },
        recoveryInstructions: {
          rollbackMethod: 'partial',
          affectedItems: batchItems.map(item => item.id || item.scheduleId),
          rollbackOrder: 'reverse'
        }
      });
    }
    
    return recoveryPoints;
  }

  // ===== 增强快照功能辅助方法 =====

  /**
   * 生成快照版本
   * @param {string} transactionId - 事务ID
   * @returns {Promise<string>} 版本号
   */
  async generateSnapshotVersion(transactionId) {
    if (!this.snapshotVersions.has(transactionId)) {
      this.snapshotVersions.set(transactionId, 0);
    }
    
    const currentVersion = this.snapshotVersions.get(transactionId) + 1;
    this.snapshotVersions.set(transactionId, currentVersion);
    
    return `v${currentVersion}.0`;
  }

  /**
   * 获取最新快照
   * @param {string} transactionId - 事务ID
   * @returns {Object|null} 最新快照
   */
  async getLatestSnapshot(transactionId) {
    let latestSnapshot = null;
    let latestTimestamp = 0;
    
    for (const [snapshotId, snapshot] of this.snapshots) {
      if (snapshot.transactionId === transactionId && snapshot.timestamp > latestTimestamp) {
        latestSnapshot = snapshot;
        latestTimestamp = snapshot.timestamp;
      }
    }
    
    return latestSnapshot;
  }

  /**
   * 计算变更项目数量
   * @param {Object} currentData - 当前数据
   * @param {Object} baseData - 基础数据
   * @returns {Promise<number>} 变更项目数量
   */
  async calculateChangedItemsCount(currentData, baseData) {
    if (!baseData || !baseData.items) {
      return currentData.items ? currentData.items.length : 0;
    }
    
    let changedCount = 0;
    const baseItemsMap = new Map();
    
    // 构建基础数据索引
    baseData.items.forEach(item => {
      baseItemsMap.set(item.id, this.calculateItemChecksum(item));
    });
    
    // 比较当前数据
    currentData.items.forEach(item => {
      const baseChecksum = baseItemsMap.get(item.id);
      const currentChecksum = this.calculateItemChecksum(item);
      
      if (!baseChecksum || baseChecksum !== currentChecksum) {
        changedCount++;
      }
    });
    
    return changedCount;
  }

  /**
   * 管理快照版本
   * @param {string} transactionId - 事务ID
   * @param {Object} newSnapshot - 新快照
   */
  async manageSnapshotVersions(transactionId, newSnapshot) {
    const existingSnapshots = [];
    
    // 收集现有快照
    for (const [snapshotId, snapshot] of this.snapshots) {
      if (snapshot.transactionId === transactionId) {
        existingSnapshots.push(snapshot);
      }
    }
    
    // 按时间排序
    existingSnapshots.sort((a, b) => a.timestamp - b.timestamp);
    
    // 检查是否超过最大数量限制
    if (existingSnapshots.length >= this.config.maxSnapshotsPerTransaction) {
      const toRemove = existingSnapshots.slice(0, existingSnapshots.length - this.config.maxSnapshotsPerTransaction + 1);
      
      for (const oldSnapshot of toRemove) {
        console.log(`[BatchRollback] 移除过期快照: ${oldSnapshot.id}`);
        this.snapshots.delete(oldSnapshot.id);
      }
    }
  }

  /**
   * 压缩快照数据
   * @param {Object} data - 原始数据
   * @returns {Promise<Object>} 压缩后数据
   */
  async compressSnapshotData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      // 简单的压缩算法(实际应用中可使用 gzip 等)
      const compressedString = this.simpleCompress(jsonString);
      
      return {
        __compressed: true,
        algorithm: 'simple',
        data: compressedString,
        originalSize: jsonString.length,
        compressedSize: compressedString.length
      };
      
    } catch (error) {
      console.error('[BatchRollback] 压缩失败:', error);
      return data; // 压缩失败则返回原始数据
    }
  }

  /**
   * 解压快照数据
   * @param {Object} compressedData - 压缩数据
   * @returns {Promise<Object>} 解压后数据
   */
  async decompressSnapshotData(compressedData) {
    try {
      if (!compressedData.__compressed) {
        return compressedData; // 未压缩的数据直接返回
      }
      
      const decompressedString = this.simpleDecompress(compressedData.data);
      return JSON.parse(decompressedString);
      
    } catch (error) {
      console.error('[BatchRollback] 解压失败:', error);
      throw new Error(`解压失败: ${error.message}`);
    }
  }

  /**
   * 加密快照数据
   * @param {Object} data - 原始数据
   * @param {string} encryptionKey - 加密密钥
   * @returns {Promise<Object>} 加密后数据
   */
  async encryptSnapshotData(data, encryptionKey) {
    try {
      if (!encryptionKey) {
        throw new Error('缺少加密密钥');
      }
      
      const jsonString = JSON.stringify(data);
      
      // 简单的加密算法(实际应用中应使用 AES 等)
      const encryptedString = this.simpleEncrypt(jsonString, encryptionKey);
      
      return {
        __encrypted: true,
        algorithm: 'simple',
        data: encryptedString,
        keyHash: this.calculateMD5(encryptionKey)
      };
      
    } catch (error) {
      console.error('[BatchRollback] 加密失败:', error);
      throw error;
    }
  }

  /**
   * 解密快照数据
   * @param {Object} encryptedData - 加密数据
   * @param {string} encryptionKey - 解密密钥
   * @returns {Promise<Object>} 解密后数据
   */
  async decryptSnapshotData(encryptedData, encryptionKey) {
    try {
      if (!encryptedData.__encrypted) {
        return encryptedData; // 未加密的数据直接返回
      }
      
      if (!encryptionKey) {
        throw new Error('缺少解密密钥');
      }
      
      // 验证密钥
      const keyHash = this.calculateMD5(encryptionKey);
      if (keyHash !== encryptedData.keyHash) {
        throw new Error('解密密钥错误');
      }
      
      const decryptedString = this.simpleDecrypt(encryptedData.data, encryptionKey);
      return JSON.parse(decryptedString);
      
    } catch (error) {
      console.error('[BatchRollback] 解密失败:', error);
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  /**
   * 更新快照统计信息
   * @param {Object} snapshot - 快照对象
   */
  updateSnapshotStats(snapshot) {
    this.snapshotStats.totalSnapshots++;
    this.snapshotStats.totalSize += snapshot.size;
    this.snapshotStats.averageSize = this.snapshotStats.totalSize / this.snapshotStats.totalSnapshots;
    
    if (snapshot.stats && snapshot.stats.compressionRatio) {
      const totalRatio = this.snapshotStats.compressionRatio * (this.snapshotStats.totalSnapshots - 1) + snapshot.stats.compressionRatio;
      this.snapshotStats.compressionRatio = totalRatio / this.snapshotStats.totalSnapshots;
    }
  }

  /**
   * 简单压缩算法
   * @param {string} str - 原始字符串
   * @returns {string} 压缩后字符串
   */
  simpleCompress(str) {
    // 简单的 RLE (行程编码) 压缩
    let compressed = '';
    for (let i = 0; i < str.length; i++) {
      let count = 1;
      while (i + 1 < str.length && str[i] === str[i + 1]) {
        count++;
        i++;
      }
      if (count > 3) {
        compressed += `${str[i]}*${count}`;
      } else {
        compressed += str[i].repeat(count);
      }
    }
    return compressed;
  }

  /**
   * 简单解压算法
   * @param {string} compressedStr - 压缩字符串
   * @returns {string} 解压后字符串
   */
  simpleDecompress(compressedStr) {
    return compressedStr.replace(/(.)\*(\d+)/g, (match, char, count) => {
      return char.repeat(parseInt(count));
    });
  }

  /**
   * 简单加密算法
   * @param {string} str - 原始字符串
   * @param {string} key - 密钥
   * @returns {string} 加密后字符串
   */
  simpleEncrypt(str, key) {
    let encrypted = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      const keyCode = key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode ^ keyCode);
    }
    return btoa(encrypted); // Base64 编码
  }

  /**
   * 简单解密算法
   * @param {string} encryptedStr - 加密字符串
   * @param {string} key - 密钥
   * @returns {string} 解密后字符串
   */
  simpleDecrypt(encryptedStr, key) {
    const decoded = atob(encryptedStr); // Base64 解码
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyCode = key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode ^ keyCode);
    }
    return decrypted;
  }

  async validateRollbackConditions(transactionId, options) {
    // 验证回滚条件
    const transaction = batchTransactionService.activeTransactions.get(transactionId);
    
    if (transaction && transaction.status === TRANSACTION_STATUS.COMMITTED) {
      if (!options.forceRollback) {
        throw new Error('已提交的事务不能回滚，除非强制回滚');
      }
    }
    
    return true;
  }

  async analyzeDependencies(items) {
    // 分析项目间的依赖关系
    return {
      hasDependencies: false,
      dependencyCount: 0,
      dependencyTree: {}
    };
  }

  async analyzeDataImpact(snapshot) {
    return {
      affectedRecords: snapshot.data.items.length,
      dataSize: snapshot.size,
      riskLevel: 'medium'
    };
  }

  async analyzeBusinessImpact(snapshot) {
    return {
      affectedUsers: 0,
      businessProcesses: [],
      riskLevel: 'low'
    };
  }

  async analyzeDependencyImpact(transactionId) {
    const dependents = this.findDependentTransactions(transactionId);
    return {
      dependentTransactions: dependents.length,
      cascadeRisk: dependents.length > 0 ? 'high' : 'low'
    };
  }

  async analyzePerformanceImpact(snapshot) {
    return {
      estimatedTime: Math.min(snapshot.data.items.length * 100, 30000),
      resourceUsage: 'medium',
      riskLevel: 'low'
    };
  }

  calculateImpactScore(impacts) {
    // 简单的影响评分计算
    let score = 0;
    
    if (impacts.dataImpact.riskLevel === 'high') score += 40;
    else if (impacts.dataImpact.riskLevel === 'medium') score += 20;
    
    if (impacts.businessImpact.riskLevel === 'high') score += 30;
    else if (impacts.businessImpact.riskLevel === 'medium') score += 15;
    
    if (impacts.dependencyImpact.cascadeRisk === 'high') score += 20;
    
    if (impacts.performanceImpact.riskLevel === 'high') score += 10;
    
    return Math.min(score, 100);
  }

  determineRiskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  generateRollbackRecommendations(score) {
    const recommendations = [];
    
    if (score >= 70) {
      recommendations.push('建议在低峰时段执行回滚');
      recommendations.push('提前通知相关用户');
      recommendations.push('准备回滚失败的应急方案');
    } else if (score >= 40) {
      recommendations.push('建议监控回滚过程');
      recommendations.push('准备数据恢复方案');
    } else {
      recommendations.push('可以安全执行回滚');
    }
    
    return recommendations;
  }

  estimateRollbackDuration(snapshot) {
    // 估算回滚耗时
    return Math.min(snapshot.data.items.length * 50, 300000); // 最多5分钟
  }

  /**
   * 启动快照清理任务
   */
  startSnapshotCleanupTask() {
    // 每小时执行一次清理任务
    setInterval(() => {
      this.cleanupExpiredSnapshots();
    }, 60 * 60 * 1000);
  }
  
  /**
   * 清理过期快照
   */
  async cleanupExpiredSnapshots() {
    try {
      const now = Date.now();
      const retentionTime = this.config.snapshotRetentionDays * 24 * 60 * 60 * 1000;
      
      let cleanedCount = 0;
      for (const [snapshotId, snapshot] of this.snapshots) {
        if (now - snapshot.timestamp > retentionTime) {
          await this.removeSnapshot(snapshotId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`[BatchRollback] 清理了 ${cleanedCount} 个过期快照`);
        this.updateSnapshotStats();
      }
      
    } catch (error) {
      console.error('[BatchRollback] 快照清理失败:', error);
    }
  }
  
  /**
   * 创建操作记录快照
   * @param {string} transactionId - 事务ID
   * @param {Array} operations - 操作列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 操作记录快照
   */
  async createOperationSnapshot(transactionId, operations, options = {}) {
    const recordId = this.generateOperationRecordId(transactionId);
    const timestamp = Date.now();
    
    try {
      console.log(`[BatchRollback] 创建操作记录快照 ${recordId}`);
      
      const operationRecord = {
        id: recordId,
        transactionId,
        timestamp,
        version: await this.generateSnapshotVersion(transactionId),
        
        // 操作详情
        operations: await this.captureOperationDetails(operations),
        
        // 状态信息
        statusInfo: {
          totalOperations: operations.length,
          completedOperations: 0,
          failedOperations: 0,
          inProgressOperations: 0,
          skippedOperations: 0
        },
        
        // 性能指标
        performanceMetrics: {
          startTime: timestamp,
          endTime: null,
          duration: 0,
          averageOperationTime: 0,
          throughput: 0
        },
        
        // 资源使用情况
        resourceUsage: {
          memoryUsage: this.getMemoryUsage(),
          cpuUsage: 0,
          networkBandwidth: 0,
          diskIO: 0
        },
        
        // 错误信息
        errors: [],
        warnings: [],
        
        // 影响分析
        impactAnalysis: await this.analyzeOperationImpact(operations),
        
        // 依赖关系
        dependencies: await this.analyzeOperationDependencies(operations),
        
        // 安全信息
        security: {
          userId: options.userId || 'system',
          permissions: options.permissions || [],
          auditLevel: options.auditLevel || 'standard'
        },
        
        // 状态
        status: 'active',
        locked: false
      };
      
      // 存储操作记录
      this.operationRecords.set(recordId, operationRecord);
      
      // 更新统计信息
      this.updateSnapshotStats();
      
      console.log(`[BatchRollback] 操作记录快照 ${recordId} 创建完成`);
      
      return operationRecord;
      
    } catch (error) {
      console.error(`[BatchRollback] 创建操作记录快照失败:`, error);
      throw new Error(`操作记录快照创建失败: ${error.message}`);
    }
  }
  
  /**
   * 更新操作记录快照
   * @param {string} recordId - 记录ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新后的记录
   */
  async updateOperationSnapshot(recordId, updates) {
    const record = this.operationRecords.get(recordId);
    if (!record) {
      throw new Error(`操作记录不存在: ${recordId}`);
    }
    
    if (record.locked) {
      throw new Error(`操作记录已锁定: ${recordId}`);
    }
    
    try {
      // 创建版本备份
      if (this.config.enableVersioning) {
        await this.createVersionBackup(recordId, record);
      }
      
      // 应用更新
      Object.assign(record, updates, {
        lastUpdated: Date.now(),
        version: record.version + 0.1
      });
      
      // 重新计算性能指标
      if (updates.statusInfo) {
        await this.updatePerformanceMetrics(record);
      }
      
      console.log(`[BatchRollback] 操作记录 ${recordId} 已更新`);
      
      return record;
      
    } catch (error) {
      console.error(`[BatchRollback] 更新操作记录失败:`, error);
      throw error;
    }
  }
  
  /**
   * 锁定操作记录
   * @param {string} recordId - 记录ID
   * @param {string} reason - 锁定原因
   * @returns {Promise<boolean>} 锁定结果
   */
  async lockOperationRecord(recordId, reason = '操作进行中') {
    const record = this.operationRecords.get(recordId);
    if (!record) {
      return false;
    }
    
    record.locked = true;
    record.lockReason = reason;
    record.lockTime = Date.now();
    
    console.log(`[BatchRollback] 操作记录 ${recordId} 已锁定: ${reason}`);
    return true;
  }
  
  /**
   * 解锁操作记录
   * @param {string} recordId - 记录ID
   * @returns {Promise<boolean>} 解锁结果
   */
  async unlockOperationRecord(recordId) {
    const record = this.operationRecords.get(recordId);
    if (!record) {
      return false;
    }
    
    record.locked = false;
    delete record.lockReason;
    delete record.lockTime;
    
    console.log(`[BatchRollback] 操作记录 ${recordId} 已解锁`);
    return true;
  }
  
  /**
   * 捕获操作详情
   * @param {Array} operations - 操作列表
   * @returns {Promise<Array>} 操作详情
   */
  async captureOperationDetails(operations) {
    const details = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      const detail = {
        index: i,
        id: operation.id || `op_${i}`,
        type: operation.type || 'unknown',
        status: 'pending',
        
        // 操作参数
        params: await this.deepClone(operation.params || {}),
        
        // 时间信息
        timing: {
          scheduled: Date.now(),
          started: null,
          completed: null,
          duration: 0
        },
        
        // 执行结果
        result: null,
        error: null,
        
        // 回滚信息
        rollbackInfo: {
          canRollback: operation.canRollback !== false,
          rollbackOperation: operation.rollbackOperation || null,
          rollbackData: operation.rollbackData || null
        },
        
        // 依赖关系
        dependencies: operation.dependencies || [],
        
        // 优先级
        priority: operation.priority || 'normal',
        
        // 重试信息
        retryInfo: {
          maxRetries: operation.maxRetries || 3,
          currentRetries: 0,
          retryDelay: operation.retryDelay || 1000
        }
      };
      
      details.push(detail);
    }
    
    return details;
  }
  
  /**
   * 分析操作影响
   * @param {Array} operations - 操作列表
   * @returns {Promise<Object>} 影响分析结果
   */
  async analyzeOperationImpact(operations) {
    const analysis = {
      dataImpact: {
        affectedTables: new Set(),
        affectedRecords: 0,
        dataChangeSize: 0
      },
      
      systemImpact: {
        estimatedCpuUsage: 0,
        estimatedMemoryUsage: 0,
        estimatedDuration: 0
      },
      
      businessImpact: {
        affectedUsers: new Set(),
        criticalOperations: 0,
        riskLevel: 'low'
      },
      
      securityImpact: {
        sensitiveData: false,
        permissionChanges: false,
        auditRequired: false
      }
    };
    
    for (const operation of operations) {
      // 分析数据影响
      if (operation.tableNames) {
        operation.tableNames.forEach(table => analysis.dataImpact.affectedTables.add(table));
      }
      
      if (operation.recordCount) {
        analysis.dataImpact.affectedRecords += operation.recordCount;
      }
      
      // 分析系统影响
      analysis.systemImpact.estimatedDuration += operation.estimatedDuration || 100;
      
      // 分析业务影响
      if (operation.userIds) {
        operation.userIds.forEach(userId => analysis.businessImpact.affectedUsers.add(userId));
      }
      
      if (operation.priority === 'critical') {
        analysis.businessImpact.criticalOperations++;
      }
      
      // 分析安全影响
      if (operation.sensitiveData) {
        analysis.securityImpact.sensitiveData = true;
      }
      
      if (operation.permissionChanges) {
        analysis.securityImpact.permissionChanges = true;
      }
    }
    
    // 计算风险级别
    if (analysis.businessImpact.criticalOperations > 0 || 
        analysis.securityImpact.sensitiveData ||
        analysis.dataImpact.affectedRecords > 1000) {
      analysis.businessImpact.riskLevel = 'high';
    } else if (analysis.dataImpact.affectedRecords > 100 ||
               analysis.businessImpact.affectedUsers.size > 10) {
      analysis.businessImpact.riskLevel = 'medium';
    }
    
    // 转换Set为Array以便序列化
    analysis.dataImpact.affectedTables = Array.from(analysis.dataImpact.affectedTables);
    analysis.businessImpact.affectedUsers = Array.from(analysis.businessImpact.affectedUsers);
    
    return analysis;
  }
  
  /**
   * 分析操作依赖关系
   * @param {Array} operations - 操作列表
   * @returns {Promise<Object>} 依赖关系分析
   */
  async analyzeOperationDependencies(operations) {
    const dependencies = {
      internalDependencies: [],    // 内部依赖
      externalDependencies: [],    // 外部依赖
      circularDependencies: [],    // 循环依赖
      dependencyGraph: new Map(),  // 依赖图
      executionOrder: []           // 执行顺序
    };
    
    // 构建依赖图
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const opId = operation.id || `op_${i}`;
      
      if (!dependencies.dependencyGraph.has(opId)) {
        dependencies.dependencyGraph.set(opId, {
          operation,
          dependsOn: [],
          dependedBy: []
        });
      }
      
      // 分析依赖关系
      if (operation.dependencies && operation.dependencies.length > 0) {
        for (const depId of operation.dependencies) {
          // 检查是否为内部依赖
          const isInternal = operations.some(op => (op.id || `op_${operations.indexOf(op)}`) === depId);
          
          if (isInternal) {
            dependencies.internalDependencies.push({
              from: opId,
              to: depId,
              type: 'sequential'
            });
            
            // 更新依赖图
            const depNode = dependencies.dependencyGraph.get(depId);
            if (depNode) {
              depNode.dependedBy.push(opId);
            }
            
            const currentNode = dependencies.dependencyGraph.get(opId);
            if (currentNode) {
              currentNode.dependsOn.push(depId);
            }
          } else {
            dependencies.externalDependencies.push({
              from: opId,
              to: depId,
              type: 'external'
            });
          }
        }
      }
    }
    
    // 检测循环依赖
    dependencies.circularDependencies = this.detectCircularDependencies(dependencies.dependencyGraph);
    
    // 计算执行顺序
    dependencies.executionOrder = this.calculateExecutionOrder(dependencies.dependencyGraph);
    
    // 转换Map为Object以便序列化
    const graphObj = {};
    for (const [key, value] of dependencies.dependencyGraph) {
      graphObj[key] = {
        dependsOn: value.dependsOn,
        dependedBy: value.dependedBy
      };
    }
    dependencies.dependencyGraph = graphObj;
    
    return dependencies;
  }
  
  /**
   * 检测循环依赖
   * @param {Map} dependencyGraph - 依赖图
   * @returns {Array} 循环依赖列表
   */
  detectCircularDependencies(dependencyGraph) {
    const circularDeps = [];
    const visited = new Set();
    const recStack = new Set();
    
    const dfs = (nodeId, path = []) => {
      if (recStack.has(nodeId)) {
        // 找到循环依赖
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart >= 0) {
          circularDeps.push(path.slice(cycleStart).concat(nodeId));
        }
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      recStack.add(nodeId);
      
      const node = dependencyGraph.get(nodeId);
      if (node) {
        for (const depId of node.dependsOn) {
          dfs(depId, path.concat(nodeId));
        }
      }
      
      recStack.delete(nodeId);
    };
    
    for (const nodeId of dependencyGraph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }
    
    return circularDeps;
  }
  
  /**
   * 计算执行顺序
   * @param {Map} dependencyGraph - 依赖图
   * @returns {Array} 执行顺序
   */
  calculateExecutionOrder(dependencyGraph) {
    const inDegree = new Map();
    const executionOrder = [];
    const queue = [];
    
    // 计算入度
    for (const [nodeId, node] of dependencyGraph) {
      inDegree.set(nodeId, node.dependsOn.length);
    }
    
    // 找到入度为0的节点
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }
    
    // 拓扑排序
    while (queue.length > 0) {
      const currentId = queue.shift();
      executionOrder.push(currentId);
      
      const currentNode = dependencyGraph.get(currentId);
      if (currentNode) {
        for (const dependentId of currentNode.dependedBy) {
          const newDegree = inDegree.get(dependentId) - 1;
          inDegree.set(dependentId, newDegree);
          
          if (newDegree === 0) {
            queue.push(dependentId);
          }
        }
      }
    }
    
    return executionOrder;
  }
  
  /**
   * 更新性能指标
   * @param {Object} record - 操作记录
   * @returns {Promise<void>}
   */
  async updatePerformanceMetrics(record) {
    const { statusInfo, performanceMetrics } = record;
    
    // 计算完成时间
    if (statusInfo.completedOperations + statusInfo.failedOperations === statusInfo.totalOperations) {
      performanceMetrics.endTime = Date.now();
      performanceMetrics.duration = performanceMetrics.endTime - performanceMetrics.startTime;
    }
    
    // 计算平均操作时间
    if (statusInfo.completedOperations > 0) {
      performanceMetrics.averageOperationTime = performanceMetrics.duration / statusInfo.completedOperations;
    }
    
    // 计算吞吐量
    if (performanceMetrics.duration > 0) {
      performanceMetrics.throughput = (statusInfo.completedOperations * 1000) / performanceMetrics.duration; // 每秒操作数
    }
    
    // 更新资源使用情况
    record.resourceUsage.memoryUsage = this.getMemoryUsage();
  }
  
  /**
   * 生成快照版本
   * @param {string} transactionId - 事务ID
   * @returns {Promise<string>} 版本号
   */
  async generateSnapshotVersion(transactionId) {
    let versions = this.snapshotVersions.get(transactionId);
    if (!versions) {
      versions = { major: 1, minor: 0, patch: 0 };
    } else {
      versions.minor++;
    }
    
    this.snapshotVersions.set(transactionId, versions);
    
    return `${versions.major}.${versions.minor}.${versions.patch}`;
  }
  
  /**
   * 创建版本备份
   * @param {string} recordId - 记录ID
   * @param {Object} record - 记录对象
   * @returns {Promise<void>}
   */
  async createVersionBackup(recordId, record) {
    const backupId = `${recordId}_v${record.version}`;
    const backup = await this.deepClone(record);
    
    // 存储到版本历史中
    if (!this.snapshotVersions.has(recordId)) {
      this.snapshotVersions.set(recordId, []);
    }
    
    const versions = this.snapshotVersions.get(recordId);
    versions.push({
      id: backupId,
      version: record.version,
      timestamp: Date.now(),
      data: backup
    });
    
    // 限制版本历史数量
    if (versions.length > this.config.maxSnapshotsPerTransaction) {
      versions.shift(); // 删除最老的版本
    }
  }
  
  /**
   * 生成操作记录ID
   * @param {string} transactionId - 事务ID
   * @returns {string} 操作记录ID
   */
  generateOperationRecordId(transactionId) {
    return `op_record_${transactionId}_${Date.now()}`;
  }
  
  /**
   * 获取内存使用情况
   * @returns {number} 内存使用量(MB)
   */
  getMemoryUsage() {
    // 在小程序环境中，无法直接获取内存使用情况
    // 这里返回一个估算值
    const estimatedUsage = (this.snapshots.size * 0.1) + (this.operationRecords.size * 0.05);
    return Math.round(estimatedUsage * 100) / 100;
  }
  
  /**
   * 更新快照统计信息
   */
  updateSnapshotStats() {
    const totalSnapshots = this.snapshots.size + this.operationRecords.size;
    let totalSize = 0;
    
    for (const snapshot of this.snapshots.values()) {
      totalSize += snapshot.size || 0;
    }
    
    for (const record of this.operationRecords.values()) {
      totalSize += JSON.stringify(record).length;
    }
    
    this.snapshotStats = {
      totalSnapshots,
      totalSize,
      averageSize: totalSnapshots > 0 ? totalSize / totalSnapshots : 0,
      compressionRatio: 0.3 // 假设30%的压缩率
    };
  }
  
  /**
   * 获取快照统计信息
   * @returns {Object} 统计信息
   */
  getSnapshotStats() {
    return { ...this.snapshotStats };
  }
  
  /**
   * 获取操作记录
   * @param {string} recordId - 记录ID
   * @returns {Object|null} 操作记录
   */
  getOperationRecord(recordId) {
    return this.operationRecords.get(recordId) || null;
  }
  
  /**
   * 获取事务的所有操作记录
   * @param {string} transactionId - 事务ID
   * @returns {Array} 操作记录列表
   */
  getTransactionOperationRecords(transactionId) {
    const records = [];
    
    for (const record of this.operationRecords.values()) {
      if (record.transactionId === transactionId) {
        records.push(record);
      }
    }
    
    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取快照信息
   * @param {string} snapshotId - 快照ID
   * @returns {Object|null} 快照信息
   */
  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * 删除快照
   * @param {string} snapshotId - 快照ID
   * @returns {Promise<boolean>} 删除结果
   */
  async removeSnapshot(snapshotId) {
    const deleted = this.snapshots.delete(snapshotId);
    if (deleted) {
      console.log(`[BatchRollback] 快照 ${snapshotId} 已删除`);
    }
    return deleted;
  }

  /**
   * 获取所有快照
   * @returns {Array} 快照列表
   */
  getAllSnapshots() {
    return Array.from(this.snapshots.values()).map(snapshot => ({
      id: snapshot.id,
      transactionId: snapshot.transactionId,
      type: snapshot.type,
      timestamp: snapshot.timestamp,
      itemCount: snapshot.itemCount,
      size: snapshot.size,
      status: snapshot.status
    }));
  }

  // ===== 快照功能增强方法 =====

  /**
   * 实现增量快照捕获
   * @param {Array} items - 项目列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增量快照
   */
  async captureIncrementalSnapshot(items, options) {
    const snapshot = {
      type: 'incremental',
      items: [],
      timestamp: Date.now(),
      baseSnapshot: options.baseSnapshot
    };
    
    // 与基础快照比较，只保存变化的项目
    const baseItems = options.baseSnapshot ? options.baseSnapshot.data.items : [];
    const baseItemMap = new Map(baseItems.map(item => [item.id, item]));
    
    for (const item of items) {
      const itemId = item.id || item.scheduleId;
      const baseItem = baseItemMap.get(itemId);
      
      // 新项目或有变化的项目
      if (!baseItem || JSON.stringify(item) !== JSON.stringify(baseItem.originalData)) {
        const itemSnapshot = {
          id: itemId,
          originalData: await this.deepClone(item),
          changeType: baseItem ? 'modified' : 'added',
          metadata: {
            capturedAt: Date.now(),
            version: item.version || 1,
            checksum: this.calculateItemChecksum(item),
            baseChecksum: baseItem ? baseItem.metadata.checksum : null
          }
        };
        
        snapshot.items.push(itemSnapshot);
      }
    }
    
    // 检查删除的项目
    for (const baseItem of baseItems) {
      const exists = items.find(item => (item.id || item.scheduleId) === baseItem.id);
      if (!exists) {
        snapshot.items.push({
          id: baseItem.id,
          originalData: baseItem.originalData,
          changeType: 'deleted',
          metadata: baseItem.metadata
        });
      }
    }
    
    return snapshot;
  }

  /**
   * 实现差异快照捕获
   * @param {Array} items - 项目列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 差异快照
   */
  async captureDifferentialSnapshot(items, options) {
    const snapshot = {
      type: 'differential',
      items: [],
      timestamp: Date.now(),
      referenceSnapshot: options.referenceSnapshot
    };
    
    // 与参考快照比较，保存差异信息
    const refItems = options.referenceSnapshot ? options.referenceSnapshot.data.items : [];
    const refItemMap = new Map(refItems.map(item => [item.id, item]));
    
    for (const item of items) {
      const itemId = item.id || item.scheduleId;
      const refItem = refItemMap.get(itemId);
      
      if (refItem) {
        // 计算字段级别的差异
        const differences = this.calculateFieldDifferences(item, refItem.originalData);
        
        if (differences.length > 0) {
          snapshot.items.push({
            id: itemId,
            differences,
            metadata: {
              capturedAt: Date.now(),
              version: item.version || 1,
              checksum: this.calculateItemChecksum(item),
              referenceVersion: refItem.metadata.version
            }
          });
        }
      } else {
        // 新项目，保存完整数据
        snapshot.items.push({
          id: itemId,
          originalData: await this.deepClone(item),
          changeType: 'new',
          metadata: {
            capturedAt: Date.now(),
            version: item.version || 1,
            checksum: this.calculateItemChecksum(item)
          }
        });
      }
    }
    
    return snapshot;
  }

  /**
   * 计算字段差异
   * @param {Object} newData - 新数据
   * @param {Object} oldData - 旧数据
   * @returns {Array} 差异列表
   */
  calculateFieldDifferences(newData, oldData) {
    const differences = [];
    const allKeys = new Set([...Object.keys(newData), ...Object.keys(oldData)]);
    
    for (const key of allKeys) {
      const newValue = newData[key];
      const oldValue = oldData[key];
      
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        differences.push({
          field: key,
          oldValue,
          newValue,
          changeType: oldValue === undefined ? 'added' : 
                     newValue === undefined ? 'removed' : 'modified'
        });
      }
    }
    
    return differences;
  }

  // ===== 操作记录快照相关辅助方法 =====

  /**
   * 计算全局校验和
   * @param {Array} items - 项目列表
   * @returns {Promise<string>} 全局校验和
   */
  async calculateGlobalChecksum(items) {
    const combinedData = items.map(item => JSON.stringify(item)).join('');
    return this.calculateMD5(combinedData);
  }

  /**
   * 构建交叉引用
   * @param {Array} items - 项目列表
   * @returns {Promise<Object>} 交叉引用映射
   */
  async buildCrossReferences(items) {
    const references = new Map();
    
    items.forEach((item, index) => {
      const itemId = item.id || item.scheduleId;
      references.set(itemId, {
        index,
        relatedItems: [],
        dependencies: item.dependencies || []
      });
    });
    
    // 建立关联关系
    items.forEach((item, index) => {
      const itemId = item.id || item.scheduleId;
      const deps = item.dependencies || [];
      
      deps.forEach(depId => {
        if (references.has(depId)) {
          references.get(depId).relatedItems.push(itemId);
        }
      });
    });
    
    return Object.fromEntries(references);
  }

  /**
   * 计算项目复杂度
   * @param {Object} item - 项目
   * @returns {number} 复杂度评分（0-1）
   */
  calculateItemComplexity(item) {
    let complexity = 0;
    
    // 数据结构复杂度
    const dataSize = JSON.stringify(item).length;
    complexity += Math.min(dataSize / 10000, 0.3);
    
    // 属性数量复杂度
    const propCount = Object.keys(item).length;
    complexity += Math.min(propCount / 50, 0.2);
    
    // 依赖关系复杂度
    if (item.dependencies && item.dependencies.length > 0) {
      complexity += Math.min(item.dependencies.length / 10, 0.3);
    }
    
    // 操作类型复杂度
    const operationComplexity = {
      'create': 0.1,
      'read': 0.05,
      'update': 0.15,
      'delete': 0.2
    };
    
    const opType = item.operationType || item.action || 'update';
    complexity += operationComplexity[opType] || 0.1;
    
    return Math.min(complexity, 1.0);
  }

  /**
   * 计算操作复杂度
   * @param {Object} operationRecord - 操作记录
   * @returns {number} 复杂度评分（0-1）
   */
  calculateOperationComplexity(operationRecord) {
    if (!operationRecord.operations || operationRecord.operations.length === 0) {
      return 0;
    }
    
    let totalComplexity = 0;
    
    operationRecord.operations.forEach(operation => {
      let opComplexity = 0;
      
      // 操作类型复杂度
      opComplexity += operation.riskAssessment ? operation.riskAssessment.operationRisk.score : 0.5;
      
      // 依赖关系复杂度
      const totalDeps = (operation.dependencies.upstream.length + 
                        operation.dependencies.downstream.length + 
                        operation.dependencies.external.length);
      opComplexity += Math.min(totalDeps / 10, 0.3);
      
      totalComplexity += opComplexity;
    });
    
    return Math.min(totalComplexity / operationRecord.operations.length, 1.0);
  }

  /**
   * 计算完整性校验和
   * @param {Array} items - 项目列表
   * @returns {Promise<string>} 完整性校验和
   */
  async calculateIntegrityChecksum(items) {
    const integrity = {
      itemCount: items.length,
      totalSize: items.reduce((sum, item) => sum + JSON.stringify(item).length, 0),
      itemHashes: items.map(item => this.calculateMD5(JSON.stringify(item))),
      timestamp: Date.now()
    };
    
    return this.calculateMD5(JSON.stringify(integrity));
  }

  /**
   * 计算完整性哈希
   * @param {Object} item - 项目
   * @returns {Promise<string>} 完整性哈希
   */
  async calculateIntegrityHash(item) {
    const integrity = {
      id: item.id || item.scheduleId,
      checksum: await this.calculateItemChecksum(item),
      size: JSON.stringify(item).length,
      timestamp: Date.now()
    };
    
    return this.calculateMD5(JSON.stringify(integrity));
  }

  /**
   * 计算变更向量
   * @param {Object} item - 项目
   * @returns {Promise<Object>} 变更向量
   */
  async calculateChangeVector(item) {
    return {
      itemId: item.id || item.scheduleId,
      changeSequence: Date.now(),
      changeType: item.operationType || 'update',
      magnitude: this.calculateItemComplexity(item),
      direction: this.calculateChangeDirection(item)
    };
  }

  /**
   * 计算变更方向
   * @param {Object} item - 项目
   * @returns {string} 变更方向
   */
  calculateChangeDirection(item) {
    const opType = item.operationType || item.action || 'update';
    
    const directions = {
      'create': 'forward',
      'update': 'modify',
      'delete': 'backward',
      'read': 'neutral'
    };
    
    return directions[opType] || 'modify';
  }

  /**
   * 验证项目结构
   * @param {Object} item - 项目
   * @returns {Promise<boolean>} 验证结果
   */
  async validateItemStructure(item) {
    try {
      // 基本结构验证
      if (!item || typeof item !== 'object') {
        return false;
      }
      
      // 检查必需字段
      const requiredFields = ['id', 'scheduleId'];
      const hasRequired = requiredFields.some(field => item[field]);
      
      if (!hasRequired) {
        return false;
      }
      
      // 检查数据类型
      if (item.timestamp && isNaN(new Date(item.timestamp).getTime())) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[BatchRollback] 项目结构验证失败:', error);
      return false;
    }
  }

  /**
   * 验证项目数据
   * @param {Object} item - 项目
   * @returns {Promise<boolean>} 验证结果
   */
  async validateItemData(item) {
    try {
      // 数据完整性验证
      const serialized = JSON.stringify(item);
      if (!serialized || serialized === '{}') {
        return false;
      }
      
      // 数据大小验证
      if (serialized.length > 1024 * 1024) { // 1MB limit
        console.warn('[BatchRollback] 项目数据过大:', serialized.length);
        return false;
      }
      
      // 数据格式验证
      if (item.date && isNaN(new Date(item.date).getTime())) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[BatchRollback] 项目数据验证失败:', error);
      return false;
    }
  }

  /**
   * 验证项目关系
   * @param {Object} item - 项目
   * @returns {Promise<boolean>} 验证结果
   */
  async validateItemRelationships(item) {
    try {
      // 依赖关系验证
      if (item.dependencies) {
        if (!Array.isArray(item.dependencies)) {
          return false;
        }
        
        // 检查循环依赖
        const itemId = item.id || item.scheduleId;
        if (item.dependencies.includes(itemId)) {
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('[BatchRollback] 项目关系验证失败:', error);
      return false;
    }
  }

  /**
   * 实现数据压缩
   * @param {Object} data - 待压缩数据
   * @returns {Promise<Object>} 压缩后的数据
   */
  async compressSnapshotData(data) {
    try {
      // 简单的JSON压缩实现
      const jsonString = JSON.stringify(data);
      
      // 移除不必要的空格和换行
      const compressedString = jsonString
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}\[\]:,])\s*/g, '$1');
      
      // 计算压缩比
      const originalSize = jsonString.length;
      const compressedSize = compressedString.length;
      const compressionRatio = (originalSize - compressedSize) / originalSize;
      
      console.log(`[BatchRollback] 数据压缩完成，压缩比: ${(compressionRatio * 100).toFixed(2)}%`);
      
      return {
        data: compressedString,
        compressed: true,
        originalSize,
        compressedSize,
        compressionRatio
      };
      
    } catch (error) {
      console.error('[BatchRollback] 数据压缩失败:', error);
      return data;
    }
  }

  /**
   * 实现数据加密
   * @param {Object} data - 待加密数据
   * @param {string} key - 加密密钥
   * @returns {Promise<Object>} 加密后的数据
   */
  async encryptSnapshotData(data, key) {
    try {
      // 简单的字符串编码实现（实际项目中应使用真正的加密算法）
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      const keyStr = key || 'default_encryption_key';
      
      let encrypted = '';
      for (let i = 0; i < jsonString.length; i++) {
        const charCode = jsonString.charCodeAt(i);
        const keyCode = keyStr.charCodeAt(i % keyStr.length);
        encrypted += String.fromCharCode(charCode ^ keyCode);
      }
      
      // Base64编码
      const base64Encrypted = btoa(unescape(encodeURIComponent(encrypted)));
      
      console.log('[BatchRollback] 数据加密完成');
      
      return {
        data: base64Encrypted,
        encrypted: true,
        algorithm: 'simple_xor_base64',
        keyHash: this.calculateMD5(keyStr)
      };
      
    } catch (error) {
      console.error('[BatchRollback] 数据加密失败:', error);
      return data;
    }
  }

  /**
   * 实现回滚影响分析
   * @param {Array} items - 项目列表
   * @param {Object} snapshot - 快照对象
   * @returns {Promise<Object>} 影响分析结果
   */
  async analyzeRollbackImpact(items, snapshot) {
    const analysis = {
      affectedItems: items.length,
      totalItems: snapshot.data.items.length,
      impactRatio: items.length / snapshot.data.items.length,
      
      // 数据影响分析
      dataImpact: {
        estimatedDataSize: 0,
        affectedTables: new Set(),
        criticalData: false
      },
      
      // 业务影响分析
      businessImpact: {
        affectedUsers: new Set(),
        businessProcesses: [],
        downtime: 0
      },
      
      // 技术影响分析
      technicalImpact: {
        systemLoad: 'medium',
        networkBandwidth: 'low',
        storageUsage: 'medium'
      },
      
      // 风险评估
      risks: [],
      riskLevel: 'medium',
      confidence: 0.8
    };
    
    // 分析每个项目的影响
    for (const item of items) {
      // 数据影响
      if (item.originalData) {
        const dataSize = JSON.stringify(item.originalData).length;
        analysis.dataImpact.estimatedDataSize += dataSize;
        
        // 检查是否涉及关键数据
        if (item.originalData.priority === 'critical' || item.originalData.important) {
          analysis.dataImpact.criticalData = true;
        }
        
        // 收集涉及的表名
        if (item.originalData.tableName) {
          analysis.dataImpact.affectedTables.add(item.originalData.tableName);
        }
      }
      
      // 业务影响
      if (item.userIds) {
        item.userIds.forEach(userId => analysis.businessImpact.affectedUsers.add(userId));
      }
      
      if (item.businessProcess) {
        analysis.businessImpact.businessProcesses.push(item.businessProcess);
      }
      
      // 预估停机时间
      analysis.businessImpact.downtime += item.estimatedRollbackTime || 100;
    }
    
    // 风险评估
    if (analysis.dataImpact.criticalData) {
      analysis.risks.push('涉及关键业务数据');
    }
    
    if (analysis.impactRatio > 0.5) {
      analysis.risks.push('影响范围较大');
    }
    
    if (analysis.businessImpact.affectedUsers.size > 100) {
      analysis.risks.push('影响用户数量较多');
    }
    
    if (analysis.businessImpact.downtime > 30000) {
      analysis.risks.push('可能导致较长停机时间');
    }
    
    // 确定风险等级
    if (analysis.risks.length >= 3 || analysis.dataImpact.criticalData) {
      analysis.riskLevel = 'high';
      analysis.confidence = 0.9;
    } else if (analysis.risks.length >= 1) {
      analysis.riskLevel = 'medium';
      analysis.confidence = 0.8;
    } else {
      analysis.riskLevel = 'low';
      analysis.confidence = 0.7;
    }
    
    // 转换Set为Array
    analysis.dataImpact.affectedTables = Array.from(analysis.dataImpact.affectedTables);
    analysis.businessImpact.affectedUsers = Array.from(analysis.businessImpact.affectedUsers);
    
    return analysis;
  }

  /**
   * 筛选快照项目
   * @param {Object} snapshot - 快照对象
   * @param {Array} itemIds - 项目ID列表
   * @returns {Array} 筛选后的项目列表
   */
  async executePartialRollbackInternal(snapshot, options) {
    // 内部部分回滚实现
    const itemIds = options.itemIds || [];
    const itemsToRollback = this.filterSnapshotItems(snapshot, itemIds);
    
    return await this.executeImmediateRollback({
      ...snapshot,
      data: { ...snapshot.data, items: itemsToRollback }
    }, options);
  }

  async executeCascadeRollbackInternal(snapshot, options) {
    // 内部级联回滚实现
    const result = await this.executeImmediateRollback(snapshot, options);
    
    // 处理级联依赖
    const dependentTransactions = this.findDependentTransactions(snapshot.transactionId);
    if (dependentTransactions.length > 0) {
      result.cascadeResults = [];
      for (const txId of dependentTransactions) {
        try {
          const cascadeResult = await this.executeRollback(txId, {
            ...options,
            isCascade: true
          });
          result.cascadeResults.push({ transactionId: txId, success: true, result: cascadeResult });
        } catch (error) {
          result.cascadeResults.push({ transactionId: txId, success: false, error: error.message });
        }
      }
    }
    
    return result;
  }

  async executeCompensatingRollback(snapshot, options) {
    // 补偿回滚实现
    const results = {
      success: true,
      itemsRolledBack: 0,
      compensations: [],
      errors: []
    };
    
    for (const item of snapshot.data.items) {
      try {
        // 执行补偿操作而不是直接回滚
        const compensationResult = await this.executeCompensation(item, snapshot);
        results.compensations.push(compensationResult);
        results.itemsRolledBack++;
      } catch (error) {
        results.errors.push({
          itemId: item.id,
          error: error.message
        });
        results.success = false;
      }
    }
    
    return results;
  }

  async executeCompensation(item, snapshot) {
    // 执行单个项目的补偿操作
    const compensationOp = {
      type: 'compensation',
      itemId: item.id,
      originalData: item.originalData,
      compensationAction: this.generateCompensationAction(item),
      timestamp: Date.now()
    };
    
    // 模拟补偿操作执行
    console.log(`执行补偿操作: ${item.id}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      compensation: compensationOp,
      itemId: item.id
    };
  }

  generateCompensationAction(item) {
    // 生成补偿操作
    const actions = {
      'create': 'delete',
      'update': 'restore',
      'delete': 'recreate',
      'move': 'move_back'
    };
    
    return actions[item.operation] || 'restore';
  }
}

// 导出服务实例
export default BatchRollbackService;
export const batchRollbackService = new BatchRollbackService();