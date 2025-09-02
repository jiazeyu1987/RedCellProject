/**
 * 部分回滚增强服务
 * 提供智能的部分回滚功能，包括选择算法、影响分析和并发处理
 */

import { batchRollbackService } from './batch-rollback.service.js';

// 部分回滚选择策略
export const PARTIAL_ROLLBACK_STRATEGY = {
  BY_FAILURE: 'by_failure',           // 按失败项目选择
  BY_PRIORITY: 'by_priority',         // 按优先级选择
  BY_DEPENDENCY: 'by_dependency',     // 按依赖关系选择
  BY_IMPACT: 'by_impact',            // 按影响程度选择
  BY_RISK: 'by_risk',                // 按风险等级选择
  CUSTOM: 'custom'                    // 自定义选择
};

// 部分回滚模式
export const PARTIAL_ROLLBACK_MODE = {
  CONSERVATIVE: 'conservative',       // 保守模式
  AGGRESSIVE: 'aggressive',          // 激进模式
  BALANCED: 'balanced',              // 平衡模式
  MINIMAL: 'minimal'                 // 最小模式
};

class PartialRollbackService {
  constructor() {
    this.config = {
      // 选择配置
      maxSelectionRatio: 0.8,         // 最大选择比例
      minSelectionCount: 1,           // 最小选择数量
      defaultMode: PARTIAL_ROLLBACK_MODE.BALANCED,
      
      // 并发配置
      maxConcurrentRollbacks: 3,       // 最大并发回滚数
      batchSize: 10,                  // 批处理大小
      
      // 安全配置
      requireConfirmation: true,       // 需要确认
      backupBeforeRollback: true,     // 回滚前备份
      validateAfterRollback: true     // 回滚后验证
    };
    
    // 选择算法注册表
    this.selectionAlgorithms = new Map();
    
    // 部分回滚历史记录
    this.partialRollbackHistory = [];
    
    // 当前进行中的部分回滚任务
    this.activePartialRollbacks = new Map();
    
    // 并发控制
    this.concurrencyManager = {
      activeCount: 0,
      queue: [],
      maxConcurrent: this.config.maxConcurrentRollbacks
    };
    
    // 验证结果缓存
    this.validationCache = new Map();
    
    // 初始化选择算法
    this.initializeSelectionAlgorithms();
  }

  /**
   * 初始化选择算法
   */
  initializeSelectionAlgorithms() {
    // 按失败项目选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_FAILURE, {
      name: '失败项目选择',
      selector: this.selectByFailure.bind(this),
      weight: 0.9,
      description: '优先选择失败或异常的项目进行回滚'
    });

    // 按优先级选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_PRIORITY, {
      name: '优先级选择',
      selector: this.selectByPriority.bind(this),
      weight: 0.8,
      description: '按业务优先级选择项目进行回滚'
    });

    // 按依赖关系选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_DEPENDENCY, {
      name: '依赖关系选择',
      selector: this.selectByDependency.bind(this),
      weight: 0.85,
      description: '按依赖关系选择相关项目进行回滚'
    });

    // 按影响程度选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_IMPACT, {
      name: '影响程度选择',
      selector: this.selectByImpact.bind(this),
      weight: 0.75,
      description: '按影响程度选择项目进行回滚'
    });

    // 按风险等级选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_RISK, {
      name: '风险等级选择',
      selector: this.selectByRisk.bind(this),
      weight: 0.7,
      description: '按风险等级选择项目进行回滚'
    });

    // 自定义选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.CUSTOM, {
      name: '自定义选择',
      selector: this.selectByCustomRules.bind(this),
      weight: 1.0,
      description: '按用户自定义规则选择项目'
    });
  }

  /**
   * 智能部分回滚增强版
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 回滚选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executeAdvancedPartialRollback(transactionId, options = {}) {
    const startTime = Date.now();
    const rollbackId = this.generatePartialRollbackId(transactionId);
    
    try {
      console.log(`[PartialRollback] 开始高级部分回滚 ${rollbackId} for 事务 ${transactionId}`);
      
      // 检查并发限制
      if (this.concurrencyManager.activeCount >= this.concurrencyManager.maxConcurrent) {
        return await this.queueRollbackTask(transactionId, options);
      }
      
      // 增加活跃任务计数
      this.concurrencyManager.activeCount++;
      this.activePartialRollbacks.set(rollbackId, {
        transactionId,
        startTime,
        status: 'running',
        progress: 0,
        mode: 'advanced'
      });
      
      // 获取事务快照和操作记录
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      const operationRecord = batchRollbackService.operationRecords.get(transactionId);
      this.updateRollbackProgress(rollbackId, 10);
      
      // 分析增强回滚上下文
      const enhancedContext = await this.analyzeEnhancedRollbackContext(snapshot, operationRecord, options);
      this.updateRollbackProgress(rollbackId, 25);
      
      // 机器学习项目选择
      const mlSelection = await this.performMLItemSelection(snapshot, enhancedContext, options);
      this.updateRollbackProgress(rollbackId, 50);
      
      // 多维验证选择结果
      const validationResult = await this.performMultiDimensionalValidation(mlSelection, enhancedContext);
      if (!validationResult.valid) {
        throw new Error(`多维验证失败: ${validationResult.reason}`);
      }
      this.updateRollbackProgress(rollbackId, 70);
      
      // 自适应执行策略
      const executionStrategy = await this.selectAdaptiveExecutionStrategy(mlSelection, enhancedContext);
      
      // 执行高级部分回滚
      const result = await this.executeAdvancedRollbackStrategy(
        transactionId, 
        mlSelection.selectedItems.map(item => item.id), 
        executionStrategy,
        {
          ...options,
          rollbackId,
          progressCallback: (progress) => {
            this.updateRollbackProgress(rollbackId, 70 + progress * 0.25);
          }
        }
      );
      
      // 学习和优化
      await this.recordLearningData(rollbackId, mlSelection, result, enhancedContext);
      this.updateRollbackProgress(rollbackId, 95);
      
      // 结果分析和建议
      const analysisAndRecommendations = await this.generateAnalysisAndRecommendations(
        result, mlSelection, enhancedContext
      );
      
      // 记录高级部分回滚历史
      this.recordAdvancedPartialRollback(rollbackId, mlSelection, result, analysisAndRecommendations);
      
      // 更新状态
      this.updateRollbackProgress(rollbackId, 100);
      const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
      rollbackRecord.status = 'completed';
      rollbackRecord.endTime = Date.now();
      rollbackRecord.duration = rollbackRecord.endTime - startTime;
      
      console.log(`[PartialRollback] 高级部分回滚 ${rollbackId} 完成，耗时: ${rollbackRecord.duration}ms`);
      
      return {
        success: true,
        rollbackId,
        mode: 'advanced',
        result,
        mlSelection,
        validationResult,
        executionStrategy,
        duration: rollbackRecord.duration,
        enhancedContext,
        analysisAndRecommendations
      };
      
    } catch (error) {
      console.error(`[PartialRollback] 高级部分回滚 ${rollbackId} 失败:`, error);
      
      // 更新失败状态
      if (this.activePartialRollbacks.has(rollbackId)) {
        const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
        rollbackRecord.status = 'failed';
        rollbackRecord.error = error.message;
        rollbackRecord.endTime = Date.now();
      }
      
      throw error;
    } finally {
      // 减少活跃任务计数
      this.concurrencyManager.activeCount--;
      
      // 处理队列中的任务
      this.processQueuedTasks();
    }
  }

  /**
   * 分析增强回滚上下文
   * @param {Object} snapshot - 事务快照
   * @param {Object} operationRecord - 操作记录
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增强上下文分析结果
   */
  async analyzeEnhancedRollbackContext(snapshot, operationRecord, options) {
    const basicContext = await this.analyzeRollbackContext(snapshot, options);
    
    // 增强上下文分析
    const enhancedContext = {
      ...basicContext,
      
      // 操作记录分析
      operationAnalysis: operationRecord ? {
        complexity: this.calculateOperationComplexity(operationRecord),
        riskProfile: this.analyzeOperationRiskProfile(operationRecord),
        dependencyMatrix: this.buildDependencyMatrix(operationRecord),
        executionPattern: this.analyzeExecutionPattern(operationRecord)
      } : null,
      
      // 实时环境分析
      environmentAnalysis: {
        systemLoad: await this.getCurrentSystemLoad(),
        resourceAvailability: await this.analyzeResourceAvailability(),
        networkConditions: await this.analyzeNetworkConditions(),
        concurrentOperations: this.analyzeConcurrentOperations()
      },
      
      // 历史模式分析
      historicalAnalysis: {
        similarCases: await this.findSimilarCases(snapshot),
        successPatterns: await this.identifySuccessPatterns(snapshot),
        failurePatterns: await this.identifyFailurePatterns(snapshot),
        learningInsights: await this.extractLearningInsights(snapshot)
      },
      
      // 预测分析
      predictiveAnalysis: {
        rollbackDifficulty: this.predictRollbackDifficulty(snapshot, operationRecord),
        successProbability: await this.predictSuccessProbability(snapshot, operationRecord),
        optimalSelectionSize: this.predictOptimalSelectionSize(snapshot),
        timeToCompletion: this.predictTimeToCompletion(snapshot, operationRecord)
      },
      
      // 业务影响分析
      businessImpactAnalysis: {
        userImpactLevel: this.calculateUserImpactLevel(snapshot),
        businessCriticality: this.assessBusinessCriticality(snapshot),
        downTimeRisk: this.assessDownTimeRisk(snapshot),
        reputationRisk: this.assessReputationRisk(snapshot)
      }
    };
    
    return enhancedContext;
  }

  /**
   * 机器学习项目选择
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 增强上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} ML选择结果
   */
  async performMLItemSelection(snapshot, context, options) {
    try {
      console.log('[PartialRollback] 执行机器学习项目选择');
      
      const items = snapshot.data.items;
      
      // 特征提取
      const features = await this.extractItemFeatures(items, context);
      
      // 多策略集成学习
      const ensembleResults = await this.applyEnsembleLearning(items, features, context);
      
      // 动态权重调整
      const weightAdjustedResults = await this.applyDynamicWeighting(ensembleResults, context);
      
      // 优化选择
      const optimizedSelection = await this.optimizeSelection(weightAdjustedResults, context);
      
      // 验证和微调
      const finalSelection = await this.validateAndRefineSelection(optimizedSelection, context);
      
      return {
        selectedItems: finalSelection.items,
        totalItems: items.length,
        selectionRatio: finalSelection.items.length / items.length,
        mlMetrics: {
          confidence: finalSelection.confidence,
          expectedSuccessRate: finalSelection.expectedSuccessRate,
          riskLevel: finalSelection.riskLevel,
          complexity: finalSelection.complexity
        },
        features,
        ensembleResults,
        reasoning: finalSelection.reasoning,
        methodology: 'machine_learning_enhanced'
      };
      
    } catch (error) {
      console.error('[PartialRollback] ML项目选择失败:', error);
      
      // 回退到传统方法
      return await this.smartSelectRollbackItems(snapshot, context, options);
    }
  }

  /**
   * 多维验证选择结果
   * @param {Object} mlSelection - ML选择结果
   * @param {Object} enhancedContext - 增强上下文
   * @returns {Promise<Object>} 验证结果
   */
  async performMultiDimensionalValidation(mlSelection, enhancedContext) {
    try {
      console.log('[PartialRollback] 执行多维验证');
      
      const validationResults = {
        valid: true,
        score: 0,
        maxScore: 100,
        dimensions: {},
        warnings: [],
        errors: [],
        recommendations: []
      };
      
      // 1. 业务逻辑验证
      const businessValidation = await this.validateBusinessLogic(mlSelection, enhancedContext);
      validationResults.dimensions.business = businessValidation;
      validationResults.score += businessValidation.score;
      
      // 2. 技术依赖验证
      const dependencyValidation = await this.validateDependencies(mlSelection, enhancedContext);
      validationResults.dimensions.dependency = dependencyValidation;
      validationResults.score += dependencyValidation.score;
      
      // 3. 安全性验证
      const securityValidation = await this.validateSecurity(mlSelection, enhancedContext);
      validationResults.dimensions.security = securityValidation;
      validationResults.score += securityValidation.score;
      
      // 4. 性能影响验证
      const performanceValidation = await this.validatePerformanceImpact(mlSelection, enhancedContext);
      validationResults.dimensions.performance = performanceValidation;
      validationResults.score += performanceValidation.score;
      
      // 5. 数据一致性验证
      const consistencyValidation = await this.validateDataConsistency(mlSelection, enhancedContext);
      validationResults.dimensions.consistency = consistencyValidation;
      validationResults.score += consistencyValidation.score;
      
      // 汇总验证结果
      validationResults.valid = validationResults.score >= 70; // 70%及格线
      
      // 收集所有警告和错误
      Object.values(validationResults.dimensions).forEach(dim => {
        if (dim.warnings) validationResults.warnings.push(...dim.warnings);
        if (dim.errors) validationResults.errors.push(...dim.errors);
        if (dim.recommendations) validationResults.recommendations.push(...dim.recommendations);
      });
      
      console.log(`[PartialRollback] 多维验证完成，得分: ${validationResults.score}/${validationResults.maxScore}`);
      
      return validationResults;
      
    } catch (error) {
      console.error('[PartialRollback] 多维验证失败:', error);
      return {
        valid: false,
        score: 0,
        reason: `验证过程失败: ${error.message}`,
        error
      };
    }
  }

  /**
   * 提取项目特征
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @returns {Promise<Array>} 特征矩阵
   */
  async extractItemFeatures(items, context) {
    const features = [];
    
    for (const item of items) {
      const feature = {
        // 基础特征
        itemId: item.id || item.scheduleId,
        complexity: this.calculateItemComplexity(item),
        riskScore: this.calculateRollbackRisk(item, context),
        priority: this.calculateRollbackPriority(item, context),
        
        // 操作特征
        operationType: this.encodeOperationType(item.operationType),
        dataSize: JSON.stringify(item).length,
        hasComplexData: this.hasComplexData(item) ? 1 : 0,
        
        // 依赖特征
        dependencyCount: (item.dependencies || []).length,
        isIndependent: (item.dependencies || []).length === 0 ? 1 : 0,
        
        // 时间特征
        ageInTransaction: this.calculateItemAge(item, context),
        isRecentlyModified: this.isRecentlyModified(item) ? 1 : 0,
        
        // 业务特征
        businessValue: this.calculateBusinessValue(item),
        userImpact: this.calculateUserImpact(item),
        
        // 历史特征
        historicalSuccessRate: await this.getHistoricalSuccessRate(item),
        rollbackFrequency: await this.getRollbackFrequency(item)
      };
      
      features.push(feature);
    }
    
    return features;
  }

  /**
   * 多策略集成学习
   * @param {Array} items - 项目列表
   * @param {Array} features - 特征矩阵
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 集成学习结果
   */
  async applyEnsembleLearning(items, features, context) {
    const strategies = [
      'decision_tree',
      'neural_network',
      'svm',
      'random_forest',
      'gradient_boosting'
    ];
    
    const results = {};
    
    for (const strategy of strategies) {
      try {
        const strategyResult = await this.applyMLStrategy(strategy, items, features, context);
        results[strategy] = strategyResult;
      } catch (error) {
        console.warn(`[PartialRollback] ML策略 ${strategy} 失败:`, error);
        results[strategy] = { success: false, error: error.message };
      }
    }
    
    // 权重计算
    const weights = this.calculateStrategyWeights(results, context);
    
    // 集成结果
    const ensembleSelection = this.combineStrategyResults(results, weights);
    
    return {
      individualResults: results,
      weights,
      ensembleSelection,
      confidence: this.calculateEnsembleConfidence(results, weights)
    };
  }

  /**
   * 应用ML策略（简化实现）
   * @param {string} strategy - 策略名称
   * @param {Array} items - 项目列表
   * @param {Array} features - 特征矩阵
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 策略结果
   */
  async applyMLStrategy(strategy, items, features, context) {
    // 简化的ML策略实现（实际应用中需要真实的ML模型）
    const selections = [];
    
    switch (strategy) {
      case 'decision_tree':
        // 决策树策略：基于规则的选择
        features.forEach((feature, index) => {
          let score = 0;
          if (feature.riskScore < 0.3) score += 0.4;
          if (feature.complexity < 0.5) score += 0.3;
          if (feature.isIndependent) score += 0.3;
          
          if (score > 0.6) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
        
      case 'neural_network':
        // 神经网络策略：非线性综合评分
        features.forEach((feature, index) => {
          const score = this.neuralNetworkScore(feature);
          if (score > 0.5) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
        
      case 'svm':
        // 支持向量机策略：边界分类
        features.forEach((feature, index) => {
          const score = this.svmScore(feature);
          if (score > 0) {
            selections.push({ item: items[index], score: (score + 1) / 2, strategy });
          }
        });
        break;
        
      case 'random_forest':
        // 随机森林策略：多决策树集成
        features.forEach((feature, index) => {
          const trees = [
            this.decisionTree1(feature),
            this.decisionTree2(feature),
            this.decisionTree3(feature)
          ];
          const avgScore = trees.reduce((sum, score) => sum + score, 0) / trees.length;
          
          if (avgScore > 0.5) {
            selections.push({ item: items[index], score: avgScore, strategy });
          }
        });
        break;
        
      case 'gradient_boosting':
        // 梯度提升策略：迭代优化
        features.forEach((feature, index) => {
          const score = this.gradientBoostingScore(feature);
          if (score > 0.5) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
    }
    
    return {
      success: true,
      strategy,
      selections: selections.sort((a, b) => b.score - a.score),
      count: selections.length,
      confidence: this.calculateStrategyConfidence(selections, strategy)
    };
  }

  /**
   * 智能部分回滚
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 回滚选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executeSmartPartialRollback(transactionId, options = {}) {
    const startTime = Date.now();
    const rollbackId = this.generatePartialRollbackId(transactionId);
    
    try {
      console.log(`[PartialRollback] 开始智能部分回滚 ${rollbackId} for 事务 ${transactionId}`);
      
      // 检查并发限制
      if (this.concurrencyManager.activeCount >= this.concurrencyManager.maxConcurrent) {
        return await this.queueRollbackTask(transactionId, options);
      }
      
      // 增加活跃任务计数
      this.concurrencyManager.activeCount++;
      this.activePartialRollbacks.set(rollbackId, {
        transactionId,
        startTime,
        status: 'running',
        progress: 0
      });
      
      // 获取事务快照
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }

      // 分析回滚上下文
      const context = await this.analyzeRollbackContext(snapshot, options);
      this.updateRollbackProgress(rollbackId, 20);
      
      // 智能选择回滚项目
      const selection = await this.smartSelectRollbackItems(snapshot, context, options);
      this.updateRollbackProgress(rollbackId, 50);
      
      // 验证选择结果
      const validationResult = await this.validateSelection(selection, context);
      if (!validationResult.valid) {
        throw new Error(`选择验证失败: ${validationResult.reason}`);
      }
      this.updateRollbackProgress(rollbackId, 70);
      
      // 执行部分回滚
      const result = await batchRollbackService.executePartialRollback(
        transactionId, 
        selection.selectedItems.map(item => item.id), 
        {
          ...options,
          rollbackId,
          progressCallback: (progress) => {
            this.updateRollbackProgress(rollbackId, 70 + progress * 0.3);
          }
        }
      );
      
      // 记录回滚历史
      this.recordPartialRollback(rollbackId, selection, result);
      
      // 更新状态
      this.updateRollbackProgress(rollbackId, 100);
      const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
      rollbackRecord.status = 'completed';
      rollbackRecord.endTime = Date.now();
      rollbackRecord.duration = rollbackRecord.endTime - startTime;
      
      console.log(`[PartialRollback] 智能部分回滚 ${rollbackId} 完成，耗时: ${rollbackRecord.duration}ms`);
      
      return {
        success: true,
        rollbackId,
        result,
        selection,
        validationResult,
        duration: rollbackRecord.duration,
        context
      };
      
    } catch (error) {
      console.error(`[PartialRollback] 智能部分回滚 ${rollbackId} 失败:`, error);
      
      // 更新失败状态
      if (this.activePartialRollbacks.has(rollbackId)) {
        const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
        rollbackRecord.status = 'failed';
        rollbackRecord.error = error.message;
        rollbackRecord.endTime = Date.now();
      }
      
      throw error;
    } finally {
      // 减少活跃任务计数
      this.concurrencyManager.activeCount--;
      
      // 处理队列中的任务
      this.processQueuedTasks();
    }
  }

  /**
   * 队列回滚任务
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 回滚结果
   */
  async queueRollbackTask(transactionId, options) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        transactionId,
        options,
        resolve,
        reject,
        queuedAt: Date.now()
      };
      
      this.concurrencyManager.queue.push(queueItem);
      console.log(`[PartialRollback] 任务 ${transactionId} 已加入队列，当前队列长度: ${this.concurrencyManager.queue.length}`);
    });
  }

  /**
   * 处理队列中的任务
   */
  async processQueuedTasks() {
    while (this.concurrencyManager.queue.length > 0 && 
           this.concurrencyManager.activeCount < this.concurrencyManager.maxConcurrent) {
      
      const queueItem = this.concurrencyManager.queue.shift();
      
      try {
        const result = await this.executeSmartPartialRollback(queueItem.transactionId, queueItem.options);
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }
    }
  }

  /**
   * 更新回滚进度
   * @param {string} rollbackId - 回滚 ID
   * @param {number} progress - 进度百分比
   */
  updateRollbackProgress(rollbackId, progress) {
    if (this.activePartialRollbacks.has(rollbackId)) {
      this.activePartialRollbacks.get(rollbackId).progress = progress;
    }
  }

  /**
   * 分析回滚上下文
   * @param {Object} snapshot - 事务快照
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 上下文分析结果
   */
  async analyzeRollbackContext(snapshot, options) {
    const context = {
      // 基本信息
      totalItems: snapshot.data.items.length,
      dataSize: snapshot.size,
      
      // 当前状态分析
      statusDistribution: this.analyzeStatusDistribution(snapshot.data.items),
      
      // 依赖分析
      dependencyAnalysis: await this.analyzeDependencies(snapshot.data.items),
      
      // 风险分析
      riskAnalysis: await this.analyzeRiskFactors(snapshot.data.items),
      
      // 约束条件
      constraints: {
        maxRollbackRatio: options.maxRollbackRatio || this.config.maxSelectionRatio,
        minRollbackCount: options.minRollbackCount || this.config.minSelectionCount,
        timeLimit: options.timeLimit || 300000,
        riskTolerance: options.riskTolerance || 'medium'
      }
    };
    
    return context;
  }

  /**
   * 智能选择回滚项目
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 上下文信息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async smartSelectRollbackItems(snapshot, context, options) {
    const items = snapshot.data.items;
    const strategies = options.strategies || [
      PARTIAL_ROLLBACK_STRATEGY.BY_FAILURE,
      PARTIAL_ROLLBACK_STRATEGY.BY_PRIORITY,
      PARTIAL_ROLLBACK_STRATEGY.BY_IMPACT
    ];
    
    console.log(`[PartialRollback] 使用 ${strategies.length} 种策略进行智能选择`);
    
    // 执行多策略选择
    const strategyResults = [];
    for (const strategy of strategies) {
      const algorithm = this.selectionAlgorithms.get(strategy);
      if (algorithm) {
        try {
          const result = await algorithm.selector(items, context, options);
          strategyResults.push({
            strategy,
            weight: algorithm.weight,
            selectedItems: result.selectedItems,
            confidence: result.confidence,
            reasoning: result.reasoning
          });
        } catch (error) {
          console.warn(`[PartialRollback] 策略 ${strategy} 执行失败:`, error);
        }
      }
    }
    
    // 融合多策略结果
    const finalSelection = await this.mergeStrategyResults(strategyResults, context);
    
    return {
      selectedItems: finalSelection.items,
      totalItems: items.length,
      selectionRatio: finalSelection.items.length / items.length,
      strategies: strategyResults,
      confidence: finalSelection.confidence,
      reasoning: finalSelection.reasoning
    };
  }

  /**
   * 按失败项目选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByFailure(items, context, options) {
    const failedItems = items.filter(item => 
      item.status === 'failed' || 
      item.error || 
      item.result === false
    );
    
    // 按失败严重程度排序
    const sortedFailedItems = failedItems.sort((a, b) => {
      const severityA = this.calculateFailureSeverity(a);
      const severityB = this.calculateFailureSeverity(b);
      return severityB - severityA;
    });
    
    return {
      selectedItems: sortedFailedItems,
      confidence: failedItems.length > 0 ? 0.95 : 0.1,
      reasoning: `选择了 ${failedItems.length} 个失败项目进行回滚`
    };
  }

  /**
   * 按优先级选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByPriority(items, context, options) {
    // 计算每个项目的回滚优先级
    const itemsWithPriority = items.map(item => ({
      ...item,
      rollbackPriority: this.calculateRollbackPriority(item, context)
    }));
    
    // 按优先级排序
    const sortedItems = itemsWithPriority.sort((a, b) => b.rollbackPriority - a.rollbackPriority);
    
    // 选择前N个高优先级项目
    const maxSelection = Math.ceil(items.length * context.constraints.maxRollbackRatio);
    const selectedItems = sortedItems.slice(0, maxSelection);
    
    return {
      selectedItems,
      confidence: 0.85,
      reasoning: `按优先级选择了前 ${selectedItems.length} 个高优先级项目`
    };
  }

  /**
   * 按依赖关系选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByDependency(items, context, options) {
    const selectedItems = [];
    
    // 找出独立项目（无依赖的项目）
    const independentItems = items.filter(item => {
      const deps = item.dependencies || [];
      return deps.length === 0;
    });
    
    selectedItems.push(...independentItems);
    
    return {
      selectedItems,
      confidence: 0.8,
      reasoning: `基于依赖关系选择了 ${selectedItems.length} 个独立项目`
    };
  }

  /**
   * 按影响程度选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByImpact(items, context, options) {
    // 计算每个项目的回滚影响程度
    const itemsWithImpact = items.map(item => ({
      ...item,
      rollbackImpact: this.calculateRollbackImpact(item, context)
    }));
    
    // 根据风险承受能力选择
    const riskTolerance = context.constraints.riskTolerance;
    let impactThreshold;
    
    switch (riskTolerance) {
      case 'low':
        impactThreshold = 0.3;
        break;
      case 'high':
        impactThreshold = 0.8;
        break;
      default:
        impactThreshold = 0.5;
    }
    
    const selectedItems = itemsWithImpact
      .filter(item => item.rollbackImpact <= impactThreshold)
      .sort((a, b) => a.rollbackImpact - b.rollbackImpact);
```

```
/**
 * 部分回滚增强服务
 * 提供智能的部分回滚功能，包括选择算法、影响分析和并发处理
 */

import { batchRollbackService } from './batch-rollback.service.js';

// 部分回滚选择策略
export const PARTIAL_ROLLBACK_STRATEGY = {
  BY_FAILURE: 'by_failure',           // 按失败项目选择
  BY_PRIORITY: 'by_priority',         // 按优先级选择
  BY_DEPENDENCY: 'by_dependency',     // 按依赖关系选择
  BY_IMPACT: 'by_impact',            // 按影响程度选择
  BY_RISK: 'by_risk',                // 按风险等级选择
  CUSTOM: 'custom'                    // 自定义选择
};

// 部分回滚模式
export const PARTIAL_ROLLBACK_MODE = {
  CONSERVATIVE: 'conservative',       // 保守模式
  AGGRESSIVE: 'aggressive',          // 激进模式
  BALANCED: 'balanced',              // 平衡模式
  MINIMAL: 'minimal'                 // 最小模式
};

class PartialRollbackService {
  constructor() {
    this.config = {
      // 选择配置
      maxSelectionRatio: 0.8,         // 最大选择比例
      minSelectionCount: 1,           // 最小选择数量
      defaultMode: PARTIAL_ROLLBACK_MODE.BALANCED,
      
      // 并发配置
      maxConcurrentRollbacks: 3,       // 最大并发回滚数
      batchSize: 10,                  // 批处理大小
      
      // 安全配置
      requireConfirmation: true,       // 需要确认
      backupBeforeRollback: true,     // 回滚前备份
      validateAfterRollback: true     // 回滚后验证
    };
    
    // 选择算法注册表
    this.selectionAlgorithms = new Map();
    
    // 部分回滚历史记录
    this.partialRollbackHistory = [];
    
    // 当前进行中的部分回滚任务
    this.activePartialRollbacks = new Map();
    
    // 并发控制
    this.concurrencyManager = {
      activeCount: 0,
      queue: [],
      maxConcurrent: this.config.maxConcurrentRollbacks
    };
    
    // 验证结果缓存
    this.validationCache = new Map();
    
    // 初始化选择算法
    this.initializeSelectionAlgorithms();
  }

  /**
   * 初始化选择算法
   */
  initializeSelectionAlgorithms() {
    // 按失败项目选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_FAILURE, {
      name: '失败项目选择',
      selector: this.selectByFailure.bind(this),
      weight: 0.9,
      description: '优先选择失败或异常的项目进行回滚'
    });

    // 按优先级选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_PRIORITY, {
      name: '优先级选择',
      selector: this.selectByPriority.bind(this),
      weight: 0.8,
      description: '按业务优先级选择项目进行回滚'
    });

    // 按依赖关系选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_DEPENDENCY, {
      name: '依赖关系选择',
      selector: this.selectByDependency.bind(this),
      weight: 0.85,
      description: '按依赖关系选择相关项目进行回滚'
    });

    // 按影响程度选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_IMPACT, {
      name: '影响程度选择',
      selector: this.selectByImpact.bind(this),
      weight: 0.75,
      description: '按影响程度选择项目进行回滚'
    });

    // 按风险等级选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.BY_RISK, {
      name: '风险等级选择',
      selector: this.selectByRisk.bind(this),
      weight: 0.7,
      description: '按风险等级选择项目进行回滚'
    });

    // 自定义选择
    this.selectionAlgorithms.set(PARTIAL_ROLLBACK_STRATEGY.CUSTOM, {
      name: '自定义选择',
      selector: this.selectByCustomRules.bind(this),
      weight: 1.0,
      description: '按用户自定义规则选择项目'
    });
  }

  /**
   * 智能部分回滚增强版
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 回滚选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executeAdvancedPartialRollback(transactionId, options = {}) {
    const startTime = Date.now();
    const rollbackId = this.generatePartialRollbackId(transactionId);
    
    try {
      console.log(`[PartialRollback] 开始高级部分回滚 ${rollbackId} for 事务 ${transactionId}`);
      
      // 检查并发限制
      if (this.concurrencyManager.activeCount >= this.concurrencyManager.maxConcurrent) {
        return await this.queueRollbackTask(transactionId, options);
      }
      
      // 增加活跃任务计数
      this.concurrencyManager.activeCount++;
      this.activePartialRollbacks.set(rollbackId, {
        transactionId,
        startTime,
        status: 'running',
        progress: 0,
        mode: 'advanced'
      });
      
      // 获取事务快照和操作记录
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      const operationRecord = batchRollbackService.operationRecords.get(transactionId);
      this.updateRollbackProgress(rollbackId, 10);
      
      // 分析增强回滚上下文
      const enhancedContext = await this.analyzeEnhancedRollbackContext(snapshot, operationRecord, options);
      this.updateRollbackProgress(rollbackId, 25);
      
      // 机器学习项目选择
      const mlSelection = await this.performMLItemSelection(snapshot, enhancedContext, options);
      this.updateRollbackProgress(rollbackId, 50);
      
      // 多维验证选择结果
      const validationResult = await this.performMultiDimensionalValidation(mlSelection, enhancedContext);
      if (!validationResult.valid) {
        throw new Error(`多维验证失败: ${validationResult.reason}`);
      }
      this.updateRollbackProgress(rollbackId, 70);
      
      // 自适应执行策略
      const executionStrategy = await this.selectAdaptiveExecutionStrategy(mlSelection, enhancedContext);
      
      // 执行高级部分回滚
      const result = await this.executeAdvancedRollbackStrategy(
        transactionId, 
        mlSelection.selectedItems.map(item => item.id), 
        executionStrategy,
        {
          ...options,
          rollbackId,
          progressCallback: (progress) => {
            this.updateRollbackProgress(rollbackId, 70 + progress * 0.25);
          }
        }
      );
      
      // 学习和优化
      await this.recordLearningData(rollbackId, mlSelection, result, enhancedContext);
      this.updateRollbackProgress(rollbackId, 95);
      
      // 结果分析和建议
      const analysisAndRecommendations = await this.generateAnalysisAndRecommendations(
        result, mlSelection, enhancedContext
      );
      
      // 记录高级部分回滚历史
      this.recordAdvancedPartialRollback(rollbackId, mlSelection, result, analysisAndRecommendations);
      
      // 更新状态
      this.updateRollbackProgress(rollbackId, 100);
      const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
      rollbackRecord.status = 'completed';
      rollbackRecord.endTime = Date.now();
      rollbackRecord.duration = rollbackRecord.endTime - startTime;
      
      console.log(`[PartialRollback] 高级部分回滚 ${rollbackId} 完成，耗时: ${rollbackRecord.duration}ms`);
      
      return {
        success: true,
        rollbackId,
        mode: 'advanced',
        result,
        mlSelection,
        validationResult,
        executionStrategy,
        duration: rollbackRecord.duration,
        enhancedContext,
        analysisAndRecommendations
      };
      
    } catch (error) {
      console.error(`[PartialRollback] 高级部分回滚 ${rollbackId} 失败:`, error);
      
      // 更新失败状态
      if (this.activePartialRollbacks.has(rollbackId)) {
        const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
        rollbackRecord.status = 'failed';
        rollbackRecord.error = error.message;
        rollbackRecord.endTime = Date.now();
      }
      
      throw error;
    } finally {
      // 减少活跃任务计数
      this.concurrencyManager.activeCount--;
      
      // 处理队列中的任务
      this.processQueuedTasks();
    }
  }

  /**
   * 分析增强回滚上下文
   * @param {Object} snapshot - 事务快照
   * @param {Object} operationRecord - 操作记录
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 增强上下文分析结果
   */
  async analyzeEnhancedRollbackContext(snapshot, operationRecord, options) {
    const basicContext = await this.analyzeRollbackContext(snapshot, options);
    
    // 增强上下文分析
    const enhancedContext = {
      ...basicContext,
      
      // 操作记录分析
      operationAnalysis: operationRecord ? {
        complexity: this.calculateOperationComplexity(operationRecord),
        riskProfile: this.analyzeOperationRiskProfile(operationRecord),
        dependencyMatrix: this.buildDependencyMatrix(operationRecord),
        executionPattern: this.analyzeExecutionPattern(operationRecord)
      } : null,
      
      // 实时环境分析
      environmentAnalysis: {
        systemLoad: await this.getCurrentSystemLoad(),
        resourceAvailability: await this.analyzeResourceAvailability(),
        networkConditions: await this.analyzeNetworkConditions(),
        concurrentOperations: this.analyzeConcurrentOperations()
      },
      
      // 历史模式分析
      historicalAnalysis: {
        similarCases: await this.findSimilarCases(snapshot),
        successPatterns: await this.identifySuccessPatterns(snapshot),
        failurePatterns: await this.identifyFailurePatterns(snapshot),
        learningInsights: await this.extractLearningInsights(snapshot)
      },
      
      // 预测分析
      predictiveAnalysis: {
        rollbackDifficulty: this.predictRollbackDifficulty(snapshot, operationRecord),
        successProbability: await this.predictSuccessProbability(snapshot, operationRecord),
        optimalSelectionSize: this.predictOptimalSelectionSize(snapshot),
        timeToCompletion: this.predictTimeToCompletion(snapshot, operationRecord)
      },
      
      // 业务影响分析
      businessImpactAnalysis: {
        userImpactLevel: this.calculateUserImpactLevel(snapshot),
        businessCriticality: this.assessBusinessCriticality(snapshot),
        downTimeRisk: this.assessDownTimeRisk(snapshot),
        reputationRisk: this.assessReputationRisk(snapshot)
      }
    };
    
    return enhancedContext;
  }

  /**
   * 机器学习项目选择
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 增强上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} ML选择结果
   */
  async performMLItemSelection(snapshot, context, options) {
    try {
      console.log('[PartialRollback] 执行机器学习项目选择');
      
      const items = snapshot.data.items;
      
      // 特征提取
      const features = await this.extractItemFeatures(items, context);
      
      // 多策略集成学习
      const ensembleResults = await this.applyEnsembleLearning(items, features, context);
      
      // 动态权重调整
      const weightAdjustedResults = await this.applyDynamicWeighting(ensembleResults, context);
      
      // 优化选择
      const optimizedSelection = await this.optimizeSelection(weightAdjustedResults, context);
      
      // 验证和微调
      const finalSelection = await this.validateAndRefineSelection(optimizedSelection, context);
      
      return {
        selectedItems: finalSelection.items,
        totalItems: items.length,
        selectionRatio: finalSelection.items.length / items.length,
        mlMetrics: {
          confidence: finalSelection.confidence,
          expectedSuccessRate: finalSelection.expectedSuccessRate,
          riskLevel: finalSelection.riskLevel,
          complexity: finalSelection.complexity
        },
        features,
        ensembleResults,
        reasoning: finalSelection.reasoning,
        methodology: 'machine_learning_enhanced'
      };
      
    } catch (error) {
      console.error('[PartialRollback] ML项目选择失败:', error);
      
      // 回退到传统方法
      return await this.smartSelectRollbackItems(snapshot, context, options);
    }
  }

  /**
   * 多维验证选择结果
   * @param {Object} mlSelection - ML选择结果
   * @param {Object} enhancedContext - 增强上下文
   * @returns {Promise<Object>} 验证结果
   */
  async performMultiDimensionalValidation(mlSelection, enhancedContext) {
    try {
      console.log('[PartialRollback] 执行多维验证');
      
      const validationResults = {
        valid: true,
        score: 0,
        maxScore: 100,
        dimensions: {},
        warnings: [],
        errors: [],
        recommendations: []
      };
      
      // 1. 业务逻辑验证
      const businessValidation = await this.validateBusinessLogic(mlSelection, enhancedContext);
      validationResults.dimensions.business = businessValidation;
      validationResults.score += businessValidation.score;
      
      // 2. 技术依赖验证
      const dependencyValidation = await this.validateDependencies(mlSelection, enhancedContext);
      validationResults.dimensions.dependency = dependencyValidation;
      validationResults.score += dependencyValidation.score;
      
      // 3. 安全性验证
      const securityValidation = await this.validateSecurity(mlSelection, enhancedContext);
      validationResults.dimensions.security = securityValidation;
      validationResults.score += securityValidation.score;
      
      // 4. 性能影响验证
      const performanceValidation = await this.validatePerformanceImpact(mlSelection, enhancedContext);
      validationResults.dimensions.performance = performanceValidation;
      validationResults.score += performanceValidation.score;
      
      // 5. 数据一致性验证
      const consistencyValidation = await this.validateDataConsistency(mlSelection, enhancedContext);
      validationResults.dimensions.consistency = consistencyValidation;
      validationResults.score += consistencyValidation.score;
      
      // 汇总验证结果
      validationResults.valid = validationResults.score >= 70; // 70%及格线
      
      // 收集所有警告和错误
      Object.values(validationResults.dimensions).forEach(dim => {
        if (dim.warnings) validationResults.warnings.push(...dim.warnings);
        if (dim.errors) validationResults.errors.push(...dim.errors);
        if (dim.recommendations) validationResults.recommendations.push(...dim.recommendations);
      });
      
      console.log(`[PartialRollback] 多维验证完成，得分: ${validationResults.score}/${validationResults.maxScore}`);
      
      return validationResults;
      
    } catch (error) {
      console.error('[PartialRollback] 多维验证失败:', error);
      return {
        valid: false,
        score: 0,
        reason: `验证过程失败: ${error.message}`,
        error
      };
    }
  }

  /**
   * 提取项目特征
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @returns {Promise<Array>} 特征矩阵
   */
  async extractItemFeatures(items, context) {
    const features = [];
    
    for (const item of items) {
      const feature = {
        // 基础特征
        itemId: item.id || item.scheduleId,
        complexity: this.calculateItemComplexity(item),
        riskScore: this.calculateRollbackRisk(item, context),
        priority: this.calculateRollbackPriority(item, context),
        
        // 操作特征
        operationType: this.encodeOperationType(item.operationType),
        dataSize: JSON.stringify(item).length,
        hasComplexData: this.hasComplexData(item) ? 1 : 0,
        
        // 依赖特征
        dependencyCount: (item.dependencies || []).length,
        isIndependent: (item.dependencies || []).length === 0 ? 1 : 0,
        
        // 时间特征
        ageInTransaction: this.calculateItemAge(item, context),
        isRecentlyModified: this.isRecentlyModified(item) ? 1 : 0,
        
        // 业务特征
        businessValue: this.calculateBusinessValue(item),
        userImpact: this.calculateUserImpact(item),
        
        // 历史特征
        historicalSuccessRate: await this.getHistoricalSuccessRate(item),
        rollbackFrequency: await this.getRollbackFrequency(item)
      };
      
      features.push(feature);
    }
    
    return features;
  }

  /**
   * 多策略集成学习
   * @param {Array} items - 项目列表
   * @param {Array} features - 特征矩阵
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 集成学习结果
   */
  async applyEnsembleLearning(items, features, context) {
    const strategies = [
      'decision_tree',
      'neural_network',
      'svm',
      'random_forest',
      'gradient_boosting'
    ];
    
    const results = {};
    
    for (const strategy of strategies) {
      try {
        const strategyResult = await this.applyMLStrategy(strategy, items, features, context);
        results[strategy] = strategyResult;
      } catch (error) {
        console.warn(`[PartialRollback] ML策略 ${strategy} 失败:`, error);
        results[strategy] = { success: false, error: error.message };
      }
    }
    
    // 权重计算
    const weights = this.calculateStrategyWeights(results, context);
    
    // 集成结果
    const ensembleSelection = this.combineStrategyResults(results, weights);
    
    return {
      individualResults: results,
      weights,
      ensembleSelection,
      confidence: this.calculateEnsembleConfidence(results, weights)
    };
  }

  /**
   * 应用ML策略（简化实现）
   * @param {string} strategy - 策略名称
   * @param {Array} items - 项目列表
   * @param {Array} features - 特征矩阵
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 策略结果
   */
  async applyMLStrategy(strategy, items, features, context) {
    // 简化的ML策略实现（实际应用中需要真实的ML模型）
    const selections = [];
    
    switch (strategy) {
      case 'decision_tree':
        // 决策树策略：基于规则的选择
        features.forEach((feature, index) => {
          let score = 0;
          if (feature.riskScore < 0.3) score += 0.4;
          if (feature.complexity < 0.5) score += 0.3;
          if (feature.isIndependent) score += 0.3;
          
          if (score > 0.6) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
        
      case 'neural_network':
        // 神经网络策略：非线性综合评分
        features.forEach((feature, index) => {
          const score = this.neuralNetworkScore(feature);
          if (score > 0.5) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
        
      case 'svm':
        // 支持向量机策略：边界分类
        features.forEach((feature, index) => {
          const score = this.svmScore(feature);
          if (score > 0) {
            selections.push({ item: items[index], score: (score + 1) / 2, strategy });
          }
        });
        break;
        
      case 'random_forest':
        // 随机森林策略：多决策树集成
        features.forEach((feature, index) => {
          const trees = [
            this.decisionTree1(feature),
            this.decisionTree2(feature),
            this.decisionTree3(feature)
          ];
          const avgScore = trees.reduce((sum, score) => sum + score, 0) / trees.length;
          
          if (avgScore > 0.5) {
            selections.push({ item: items[index], score: avgScore, strategy });
          }
        });
        break;
        
      case 'gradient_boosting':
        // 梯度提升策略：迭代优化
        features.forEach((feature, index) => {
          const score = this.gradientBoostingScore(feature);
          if (score > 0.5) {
            selections.push({ item: items[index], score, strategy });
          }
        });
        break;
    }
    
    return {
      success: true,
      strategy,
      selections: selections.sort((a, b) => b.score - a.score),
      count: selections.length,
      confidence: this.calculateStrategyConfidence(selections, strategy)
    };
  }

  /**
   * 智能部分回滚
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 回滚选项
   * @returns {Promise<Object>} 回滚结果
   */
  async executeSmartPartialRollback(transactionId, options = {}) {
    const startTime = Date.now();
    const rollbackId = this.generatePartialRollbackId(transactionId);
    
    try {
      console.log(`[PartialRollback] 开始智能部分回滚 ${rollbackId} for 事务 ${transactionId}`);
      
      // 检查并发限制
      if (this.concurrencyManager.activeCount >= this.concurrencyManager.maxConcurrent) {
        return await this.queueRollbackTask(transactionId, options);
      }
      
      // 增加活跃任务计数
      this.concurrencyManager.activeCount++;
      this.activePartialRollbacks.set(rollbackId, {
        transactionId,
        startTime,
        status: 'running',
        progress: 0
      });
      
      // 获取事务快照
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }

      // 分析回滚上下文
      const context = await this.analyzeRollbackContext(snapshot, options);
      this.updateRollbackProgress(rollbackId, 20);
      
      // 智能选择回滚项目
      const selection = await this.smartSelectRollbackItems(snapshot, context, options);
      this.updateRollbackProgress(rollbackId, 50);
      
      // 验证选择结果
      const validationResult = await this.validateSelection(selection, context);
      if (!validationResult.valid) {
        throw new Error(`选择验证失败: ${validationResult.reason}`);
      }
      this.updateRollbackProgress(rollbackId, 70);
      
      // 执行部分回滚
      const result = await batchRollbackService.executePartialRollback(
        transactionId, 
        selection.selectedItems.map(item => item.id), 
        {
          ...options,
          rollbackId,
          progressCallback: (progress) => {
            this.updateRollbackProgress(rollbackId, 70 + progress * 0.3);
          }
        }
      );
      
      // 记录回滚历史
      this.recordPartialRollback(rollbackId, selection, result);
      
      // 更新状态
      this.updateRollbackProgress(rollbackId, 100);
      const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
      rollbackRecord.status = 'completed';
      rollbackRecord.endTime = Date.now();
      rollbackRecord.duration = rollbackRecord.endTime - startTime;
      
      console.log(`[PartialRollback] 智能部分回滚 ${rollbackId} 完成，耗时: ${rollbackRecord.duration}ms`);
      
      return {
        success: true,
        rollbackId,
        result,
        selection,
        validationResult,
        duration: rollbackRecord.duration,
        context
      };
      
    } catch (error) {
      console.error(`[PartialRollback] 智能部分回滚 ${rollbackId} 失败:`, error);
      
      // 更新失败状态
      if (this.activePartialRollbacks.has(rollbackId)) {
        const rollbackRecord = this.activePartialRollbacks.get(rollbackId);
        rollbackRecord.status = 'failed';
        rollbackRecord.error = error.message;
        rollbackRecord.endTime = Date.now();
      }
      
      throw error;
    } finally {
      // 减少活跃任务计数
      this.concurrencyManager.activeCount--;
      
      // 处理队列中的任务
      this.processQueuedTasks();
    }
  }

  /**
   * 队列回滚任务
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 回滚结果
   */
  async queueRollbackTask(transactionId, options) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        transactionId,
        options,
        resolve,
        reject,
        queuedAt: Date.now()
      };
      
      this.concurrencyManager.queue.push(queueItem);
      console.log(`[PartialRollback] 任务 ${transactionId} 已加入队列，当前队列长度: ${this.concurrencyManager.queue.length}`);
    });
  }

  /**
   * 处理队列中的任务
   */
  async processQueuedTasks() {
    while (this.concurrencyManager.queue.length > 0 && 
           this.concurrencyManager.activeCount < this.concurrencyManager.maxConcurrent) {
      
      const queueItem = this.concurrencyManager.queue.shift();
      
      try {
        const result = await this.executeSmartPartialRollback(queueItem.transactionId, queueItem.options);
        queueItem.resolve(result);
      } catch (error) {
        queueItem.reject(error);
      }
    }
  }

  /**
   * 更新回滚进度
   * @param {string} rollbackId - 回滚 ID
   * @param {number} progress - 进度百分比
   */
  updateRollbackProgress(rollbackId, progress) {
    if (this.activePartialRollbacks.has(rollbackId)) {
      this.activePartialRollbacks.get(rollbackId).progress = progress;
    }
  }

  /**
   * 分析回滚上下文
   * @param {Object} snapshot - 事务快照
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 上下文分析结果
   */
  async analyzeRollbackContext(snapshot, options) {
    const context = {
      // 基本信息
      totalItems: snapshot.data.items.length,
      dataSize: snapshot.size,
      
      // 当前状态分析
      statusDistribution: this.analyzeStatusDistribution(snapshot.data.items),
      
      // 依赖分析
      dependencyAnalysis: await this.analyzeDependencies(snapshot.data.items),
      
      // 风险分析
      riskAnalysis: await this.analyzeRiskFactors(snapshot.data.items),
      
      // 约束条件
      constraints: {
        maxRollbackRatio: options.maxRollbackRatio || this.config.maxSelectionRatio,
        minRollbackCount: options.minRollbackCount || this.config.minSelectionCount,
        timeLimit: options.timeLimit || 300000,
        riskTolerance: options.riskTolerance || 'medium'
      }
    };
    
    return context;
  }

  /**
   * 智能选择回滚项目
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 上下文信息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async smartSelectRollbackItems(snapshot, context, options) {
    const items = snapshot.data.items;
    const strategies = options.strategies || [
      PARTIAL_ROLLBACK_STRATEGY.BY_FAILURE,
      PARTIAL_ROLLBACK_STRATEGY.BY_PRIORITY,
      PARTIAL_ROLLBACK_STRATEGY.BY_IMPACT
    ];
    
    console.log(`[PartialRollback] 使用 ${strategies.length} 种策略进行智能选择`);
    
    // 执行多策略选择
    const strategyResults = [];
    for (const strategy of strategies) {
      const algorithm = this.selectionAlgorithms.get(strategy);
      if (algorithm) {
        try {
          const result = await algorithm.selector(items, context, options);
          strategyResults.push({
            strategy,
            weight: algorithm.weight,
            selectedItems: result.selectedItems,
            confidence: result.confidence,
            reasoning: result.reasoning
          });
        } catch (error) {
          console.warn(`[PartialRollback] 策略 ${strategy} 执行失败:`, error);
        }
      }
    }
    
    // 融合多策略结果
    const finalSelection = await this.mergeStrategyResults(strategyResults, context);
    
    return {
      selectedItems: finalSelection.items,
      totalItems: items.length,
      selectionRatio: finalSelection.items.length / items.length,
      strategies: strategyResults,
      confidence: finalSelection.confidence,
      reasoning: finalSelection.reasoning
    };
  }

  /**
   * 按失败项目选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByFailure(items, context, options) {
    const failedItems = items.filter(item => 
      item.status === 'failed' || 
      item.error || 
      item.result === false
    );
    
    // 按失败严重程度排序
    const sortedFailedItems = failedItems.sort((a, b) => {
      const severityA = this.calculateFailureSeverity(a);
      const severityB = this.calculateFailureSeverity(b);
      return severityB - severityA;
    });
    
    return {
      selectedItems: sortedFailedItems,
      confidence: failedItems.length > 0 ? 0.95 : 0.1,
      reasoning: `选择了 ${failedItems.length} 个失败项目进行回滚`
    };
  }

  /**
   * 按优先级选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByPriority(items, context, options) {
    // 计算每个项目的回滚优先级
    const itemsWithPriority = items.map(item => ({
      ...item,
      rollbackPriority: this.calculateRollbackPriority(item, context)
    }));
    
    // 按优先级排序
    const sortedItems = itemsWithPriority.sort((a, b) => b.rollbackPriority - a.rollbackPriority);
    
    // 选择前N个高优先级项目
    const maxSelection = Math.ceil(items.length * context.constraints.maxRollbackRatio);
    const selectedItems = sortedItems.slice(0, maxSelection);
    
    return {
      selectedItems,
      confidence: 0.85,
      reasoning: `按优先级选择了前 ${selectedItems.length} 个高优先级项目`
    };
  }

  /**
   * 按依赖关系选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByDependency(items, context, options) {
    const selectedItems = [];
    
    // 找出独立项目（无依赖的项目）
    const independentItems = items.filter(item => {
      const deps = item.dependencies || [];
      return deps.length === 0;
    });
    
    selectedItems.push(...independentItems);
    
    return {
      selectedItems,
      confidence: 0.8,
      reasoning: `基于依赖关系选择了 ${selectedItems.length} 个独立项目`
    };
  }

  /**
   * 按影响程度选择
   * @param {Array} items - 项目列表
   * @param {Object} context - 上下文
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 选择结果
   */
  async selectByImpact(items, context, options) {
    // 计算每个项目的回滚影响程度
    const itemsWithImpact = items.map(item => ({
      ...item,
      rollbackImpact: this.calculateRollbackImpact(item, context)
    }));
    
    // 根据风险承受能力选择
    const riskTolerance = context.constraints.riskTolerance;
    let impactThreshold;
    
    switch (riskTolerance) {
      case 'low':
        impactThreshold = 0.3;
        break;
      case 'high':
        impactThreshold = 0.8;
        break;
      default:
        impactThreshold = 0.5;
    }
    
    const selectedItems = itemsWithImpact
      .filter(item => item.rollbackImpact <= impactThreshold)
      .sort((a, b) => a.rollbackImpact - b.rollbackImpact);
    
    return {
      selectedItems,
      confidence: 0.75,
      reasoning: `基于影响程度选择了 ${selectedItems.length} 个低影响项目`
    };
  }

  /**
   * 融合多策略结果
   * @param {Array} strategyResults - 策略结果列表
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 融合结果
   */
  async mergeStrategyResults(strategyResults, context) {
    if (strategyResults.length === 0) {
      return { items: [], confidence: 0, reasoning: '没有有效的选择策略' };
    }
    
    // 计算项目得分
    const itemScores = new Map();
    
    strategyResults.forEach(result => {
      const { selectedItems, weight, confidence } = result;
      
      selectedItems.forEach(item => {
        const itemId = item.id || item.operationId;
        const currentScore = itemScores.get(itemId) || 0;
        const newScore = currentScore + (weight * confidence);
        itemScores.set(itemId, newScore);
      });
    });
    
    // 按得分排序并选择
    const rankedItems = Array.from(itemScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([itemId, score]) => {
        const item = strategyResults[0].selectedItems.find(item => 
          (item.id || item.operationId) === itemId
        ) || { id: itemId };
        return { ...item, fusionScore: score };
      });
    
    // 应用约束条件
    const maxItems = Math.ceil(context.totalItems * context.constraints.maxRollbackRatio);
    const minItems = Math.max(context.constraints.minRollbackCount, 1);
    
    const selectedCount = Math.min(Math.max(rankedItems.length, minItems), maxItems);
    const finalItems = rankedItems.slice(0, selectedCount);
    
    const avgConfidence = strategyResults.reduce((sum, r) => sum + r.confidence, 0) / strategyResults.length;
    
    return {
      items: finalItems,
      confidence: avgConfidence,
      reasoning: `融合 ${strategyResults.length} 种策略，选择了 ${finalItems.length} 个最优项目`
    };
  }

  // ===== 辅助计算方法 =====

  calculateFailureSeverity(item) {
    let severity = 0;
    
    if (item.error) {
      const errorType = item.error.type || 'unknown';
      const severityMap = {
        'timeout': 0.6,
        'network': 0.7,
        'validation': 0.8,
        'system': 0.9,
        'data': 1.0
      };
      severity += severityMap[errorType] || 0.5;
    }
    
    if (item.retryCount) {
      severity += Math.min(item.retryCount * 0.1, 0.3);
    }
    
    return Math.min(severity, 1.0);
  }

  calculateRollbackPriority(item, context) {
    let priority = 0;
    
    // 基础优先级
    if (item.priority) {
      const priorityMap = { 'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 1.0 };
      priority += priorityMap[item.priority] || 0.5;
    }
    
    // 失败项目优先级更高
    if (item.status === 'failed') {
      priority += 0.3;
    }
    
    // 时间因素
    if (item.timing && item.timing.duration > 10000) {
      priority += 0.2;
    }
    
    return Math.min(priority, 1.0);
  }

  calculateRollbackImpact(item, context) {
    let impact = 0.5; // 基础影响值
    
    // 数据影响
    if (item.dataSize && item.dataSize > 1024 * 1024) {
      impact += 0.2;
    }
    
    // 用户影响
    if (item.userIds && item.userIds.length > 10) {
      impact += 0.3;
    }
    
    return Math.min(impact, 1.0);
  }

  // ===== 分析方法 =====

  analyzeStatusDistribution(items) {
    const distribution = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
    
    items.forEach(item => {
      const status = item.status || 'pending';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    
    return distribution;
  }

  async analyzeDependencies(items) {
    const hasDependencies = items.some(item => item.dependencies && item.dependencies.length > 0);
    const dependencyCount = items.reduce((count, item) => 
      count + (item.dependencies ? item.dependencies.length : 0), 0
    );
    
    return {
      hasDependencies,
      dependencyCount,
      averageDependencies: items.length > 0 ? dependencyCount / items.length : 0
    };
  }

  async analyzeRiskFactors(items) {
    let totalRisk = 0;
    let highRiskItems = 0;
    
    items.forEach(item => {
      const risk = this.calculateRollbackRisk(item, {});
      totalRisk += risk;
      if (risk > 0.7) {
        highRiskItems++;
      }
    });
    
    return {
      averageRisk: items.length > 0 ? totalRisk / items.length : 0,
      highRiskItems,
      riskLevel: highRiskItems > items.length * 0.3 ? 'high' : 
                 highRiskItems > items.length * 0.1 ? 'medium' : 'low'
    };
  }

  calculateRollbackRisk(item, context) {
    let risk = 0.3;
    
    const operationRisks = {
      'delete': 0.9,
      'update': 0.6,
      'insert': 0.3,
      'select': 0.1
    };
    
    risk += operationRisks[item.type] || 0.5;
    
    if (item.dependencies && item.dependencies.length > 0) {
      risk += item.dependencies.length * 0.1;
    }
    
    return Math.min(risk, 1.0);
  }

  async validateSelection(selection, context) {
    // 验证选择结果的合理性
    if (selection.selectedItems.length === 0) {
      throw new Error('没有选择任何项目进行回滚');
    }
    
    if (selection.selectionRatio > context.constraints.maxRollbackRatio) {
      throw new Error(`选择比例过高: ${selection.selectionRatio}`);
    }
    
    return true;
  }

  recordPartialRollback(rollbackId, selection, result) {
    const record = {
      id: rollbackId,
      timestamp: Date.now(),
      selection,
      result,
      success: result.success
    };
    
    this.partialRollbackHistory.push(record);
    
    // 限制历史记录数量
    if (this.partialRollbackHistory.length > 100) {
      this.partialRollbackHistory.shift();
    }
  }

  generatePartialRollbackId(transactionId) {
    return `partial_rollback_${transactionId}_${Date.now()}`;
  }

  /**
   * 获取部分回滚统计信息
   * @returns {Object} 统计信息
   */
  getPartialRollbackStats() {
    const totalRollbacks = this.partialRollbackHistory.length;
    const successfulRollbacks = this.partialRollbackHistory.filter(r => r.success).length;
    
    return {
      totalRollbacks,
      successfulRollbacks,
      successRate: totalRollbacks > 0 ? successfulRollbacks / totalRollbacks : 0,
      averageSelectionRatio: totalRollbacks > 0 ? 
        this.partialRollbackHistory.reduce((sum, r) => sum + r.selection.selectionRatio, 0) / totalRollbacks : 0
    };
  }

  /**
   * 预测部分回滚结果
   * @param {string} transactionId - 事务ID
   * @param {Array} itemIds - 项目ID列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 预测结果
   */
  async predictPartialRollbackOutcome(transactionId, itemIds, options = {}) {
    try {
      console.log(`[PartialRollback] 预测部分回滚结果 for 事务 ${transactionId}`);
      
      // 获取事务快照
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }
      
      // 筛选项目
      const selectedItems = this.filterSnapshotItemsById(snapshot, itemIds);
      
      // 分析项目特征
      const itemCharacteristics = await this.analyzeItemCharacteristics(selectedItems);
      
      // 基于历史数据预测成功率
      const successProbability = await this.predictSuccessProbability(itemCharacteristics);
      
      // 预估执行时间
      const estimatedDuration = this.estimateExecutionTime(selectedItems);
      
      // 预测潜在风险
      const potentialRisks = await this.predictPotentialRisks(selectedItems, snapshot);
      
      // 推荐策略
      const recommendedStrategy = await this.recommendOptimalStrategy(itemCharacteristics);
      
      const prediction = {
        transactionId,
        selectedItemCount: selectedItems.length,
        totalItemCount: snapshot.data.items.length,
        selectionRatio: selectedItems.length / snapshot.data.items.length,
        
        prediction: {
          successProbability,
          estimatedDuration,
          confidenceLevel: this.calculateConfidenceLevel(itemCharacteristics),
          
          outcome: {
            expectedSuccessCount: Math.round(selectedItems.length * successProbability),
            expectedFailureCount: Math.round(selectedItems.length * (1 - successProbability)),
            riskLevel: this.assessOverallRisk(potentialRisks)
          }
        },
        
        risks: potentialRisks,
        recommendations: {
          strategy: recommendedStrategy,
          precautions: this.generatePrecautions(potentialRisks),
          alternatives: this.suggestAlternatives(itemCharacteristics)
        },
        
        timestamp: Date.now()
      };
      
      console.log(`[PartialRollback] 预测完成，成功率: ${(successProbability * 100).toFixed(1)}%`);
      
      return prediction;
      
    } catch (error) {
      console.error('[PartialRollback] 预测部分回滚结果失败:', error);
      throw error;
    }
  }

  /**
   * 批量部分回滚
   * @param {Array} rollbackRequests - 回滚请求列表
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 批量回滚结果
   */
  async executeBatchPartialRollback(rollbackRequests, options = {}) {
    const batchId = this.generateBatchRollbackId();
    const startTime = Date.now();
    
    try {
      console.log(`[PartialRollback] 开始批量部分回滚 ${batchId}，请求数: ${rollbackRequests.length}`);
      
      // 验证请求
      await this.validateBatchRequests(rollbackRequests);
      
      // 分组处理
      const batches = this.groupRequestsIntoBatches(rollbackRequests, options);
      
      const batchResults = [];
      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      
      // 逐批次处理
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          console.log(`[PartialRollback] 处理批次 ${i + 1}/${batches.length}，请求数: ${batch.length}`);
          
          // 并发执行该批次的请求
          const batchPromises = batch.map(request => 
            this.executeSmartPartialRollback(request.transactionId, request.options)
              .catch(error => ({
                success: false,
                transactionId: request.transactionId,
                error: error.message
              }))
          );
          
          const batchResult = await Promise.all(batchPromises);
          
          // 统计批次结果
          const batchSuccessCount = batchResult.filter(r => r.success).length;
          const batchFailureCount = batchResult.length - batchSuccessCount;
          
          totalSuccessCount += batchSuccessCount;
          totalFailureCount += batchFailureCount;
          
          batchResults.push({
            batchIndex: i,
            requestCount: batch.length,
            successCount: batchSuccessCount,
            failureCount: batchFailureCount,
            results: batchResult
          });
          
          // 批次间延迟（避免系统过载）
          if (i < batches.length - 1 && options.batchDelay) {
            await new Promise(resolve => setTimeout(resolve, options.batchDelay));
          }
          
        } catch (error) {
          console.error(`[PartialRollback] 批次 ${i + 1} 处理失败:`, error);
          
          batchResults.push({
            batchIndex: i,
            requestCount: batch.length,
            successCount: 0,
            failureCount: batch.length,
            error: error.message
          });
          
          totalFailureCount += batch.length;
        }
      }
      
      const duration = Date.now() - startTime;
      
      const summary = {
        batchId,
        totalRequests: rollbackRequests.length,
        totalBatches: batches.length,
        totalSuccessCount,
        totalFailureCount,
        successRate: rollbackRequests.length > 0 ? totalSuccessCount / rollbackRequests.length : 0,
        duration,
        batchResults
      };
      
      console.log(`[PartialRollback] 批量部分回滚 ${batchId} 完成，成功率: ${(summary.successRate * 100).toFixed(1)}%`);
      
      return summary;
      
    } catch (error) {
      console.error(`[PartialRollback] 批量部分回滚 ${batchId} 失败:`, error);
      throw error;
    }
  }

  // ===== 预测和批量处理辅助方法 =====

  filterSnapshotItemsById(snapshot, itemIds) {
    const itemIdSet = new Set(itemIds);
    return snapshot.data.items.filter(item => {
      const itemId = item.id || item.operationId || item.scheduleId;
      return itemIdSet.has(itemId);
    });
  }

  async analyzeItemCharacteristics(items) {
    const characteristics = {
      complexity: this.calculateAverageComplexity(items),
      risk: this.calculateAverageRisk(items),
      dependencies: this.analyzeDependencyComplexity(items),
      types: this.analyzeItemTypes(items),
      sizes: this.analyzeItemSizes(items),
      timing: this.analyzeTimingPatterns(items)
    };
    
    return characteristics;
  }

  async predictSuccessProbability(characteristics) {
    // 基于项目特征的成功率预测
    let baseProbability = 0.8;
    
    // 复杂度影响
    baseProbability -= characteristics.complexity * 0.2;
    
    // 风险影响
    baseProbability -= characteristics.risk * 0.15;
    
    // 依赖关系影响
    if (characteristics.dependencies.hasComplexDependencies) {
      baseProbability -= 0.1;
    }
    
    // 历史数据影响
    const historicalSuccessRate = this.getPartialRollbackStats().successRate;
    if (historicalSuccessRate > 0) {
      baseProbability = (baseProbability + historicalSuccessRate) / 2;
    }
    
    return Math.max(0.1, Math.min(0.95, baseProbability));
  }

  estimateExecutionTime(items) {
    // 基于项目数量和复杂度估算执行时间
    const baseTimePerItem = 100; // 每个项目的基础时间（毫秒）
    const complexityMultiplier = this.calculateAverageComplexity(items) * 2;
    
    return Math.min(items.length * baseTimePerItem * complexityMultiplier, 300000); // 最多5分钟
  }

  async predictPotentialRisks(items, snapshot) {
    const risks = [];
    
    // 数据风险
    const dataRisk = this.assessDataRisk(items);
    if (dataRisk.level === 'high') {
      risks.push({
        type: 'data',
        level: 'high',
        description: '高风险数据操作',
        mitigation: '建议在低峰期执行'
      });
    }
    
    // 依赖风险
    const dependencyRisk = this.assessDependencyRisk(items);
    if (dependencyRisk.level === 'high') {
      risks.push({
        type: 'dependency',
        level: 'high',
        description: '复杂依赖关系',
        mitigation: '先处理无依赖项目'
      });
    }
    
    // 性能风险
    if (items.length > 100) {
      risks.push({
        type: 'performance',
        level: 'medium',
        description: '大量项目可能影响性能',
        mitigation: '分批次处理'
      });
    }
    
    return risks;
  }

  async recommendOptimalStrategy(characteristics) {
    if (characteristics.risk > 0.7) {
      return PARTIAL_ROLLBACK_STRATEGY.BY_RISK;
    } else if (characteristics.dependencies.hasComplexDependencies) {
      return PARTIAL_ROLLBACK_STRATEGY.BY_DEPENDENCY;
    } else if (characteristics.complexity > 0.6) {
      return PARTIAL_ROLLBACK_STRATEGY.BY_PRIORITY;
    } else {
      return PARTIAL_ROLLBACK_STRATEGY.BY_IMPACT;
    }
  }

  calculateConfidenceLevel(characteristics) {
    let confidence = 0.8;
    
    // 基于数据量调整置信度
    if (this.partialRollbackHistory.length < 10) {
      confidence -= 0.2; // 历史数据不足
    }
    
    // 基于复杂度调整
    confidence -= characteristics.complexity * 0.1;
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  assessOverallRisk(risks) {
    const highRiskCount = risks.filter(r => r.level === 'high').length;
    const mediumRiskCount = risks.filter(r => r.level === 'medium').length;
    
    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > 1) return 'medium';
    return 'low';
  }

  generatePrecautions(risks) {
    const precautions = [];
    
    if (risks.some(r => r.type === 'data')) {
      precautions.push('备份关键数据');
    }
    
    if (risks.some(r => r.type === 'dependency')) {
      precautions.push('验证依赖关系');
    }
    
    if (risks.some(r => r.type === 'performance')) {
      precautions.push('监控系统性能');
    }
    
    return precautions;
  }

  suggestAlternatives(characteristics) {
    const alternatives = [];
    
    if (characteristics.complexity > 0.7) {
      alternatives.push('考虑分步骤回滚');
    }
    
    if (characteristics.risk > 0.6) {
      alternatives.push('使用补偿策略替代直接回滚');
    }
    
    alternatives.push('在低峰期或维护窗口执行');
    
    return alternatives;
  }

  async validateBatchRequests(requests) {
    for (const request of requests) {
      if (!request.transactionId) {
        throw new Error('请求缺少事务ID');
      }
      
      // 验证事务存在
      const snapshot = batchRollbackService.getTransactionSnapshot(request.transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${request.transactionId}`);
      }
    }
  }

  groupRequestsIntoBatches(requests, options) {
    const batchSize = options.batchSize || this.config.batchSize;
    const batches = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches;
  }

  generateBatchRollbackId() {
    return `batch_partial_rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== 其他辅助计算方法 =====

  calculateAverageComplexity(items) {
    if (items.length === 0) return 0;
    
    let totalComplexity = 0;
    for (const item of items) {
      let complexity = 0.3; // 基础复杂度
      
      // 根据操作类型调整
      const operationComplexity = {
        'create': 0.2,
        'update': 0.5,
        'delete': 0.8,
        'move': 0.6
      };
      complexity += operationComplexity[item.operation] || 0.3;
      
      // 根据数据大小调整
      if (item.originalData) {
        const dataSize = JSON.stringify(item.originalData).length;
        complexity += Math.min(dataSize / 10000, 0.3);
      }
      
      totalComplexity += Math.min(complexity, 1.0);
    }
    
    return totalComplexity / items.length;
  }

  calculateAverageRisk(items) {
    if (items.length === 0) return 0;
    
    let totalRisk = 0;
    for (const item of items) {
      totalRisk += this.calculateRollbackRisk(item, {});
    }
    
    return totalRisk / items.length;
  }

  analyzeDependencyComplexity(items) {
    let dependencyCount = 0;
    let complexDependencies = 0;
    
    for (const item of items) {
      if (item.dependencies && item.dependencies.length > 0) {
        dependencyCount += item.dependencies.length;
        if (item.dependencies.length > 3) {
          complexDependencies++;
        }
      }
    }
    
    return {
      hasDependencies: dependencyCount > 0,
      dependencyCount,
      hasComplexDependencies: complexDependencies > 0,
      averageDependenciesPerItem: items.length > 0 ? dependencyCount / items.length : 0
    };
  }

  analyzeItemTypes(items) {
    const typeCount = {};
    items.forEach(item => {
      const type = item.type || item.operation || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    return {
      types: Object.keys(typeCount),
      distribution: typeCount,
      diversity: Object.keys(typeCount).length / items.length
    };
  }

  analyzeItemSizes(items) {
    const sizes = items.map(item => {
      return item.originalData ? JSON.stringify(item.originalData).length : 0;
    });
    
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const averageSize = sizes.length > 0 ? totalSize / sizes.length : 0;
    const maxSize = Math.max(...sizes, 0);
    
    return {
      totalSize,
      averageSize,
      maxSize,
      sizeVariance: this.calculateVariance(sizes)
    };
  }

  analyzeTimingPatterns(items) {
    const timings = items
      .map(item => item.timing ? item.timing.duration : 0)
      .filter(duration => duration > 0);
    
    if (timings.length === 0) {
      return {
        hasTimingData: false,
        averageDuration: 0,
        maxDuration: 0
      };
    }
    
    const totalDuration = timings.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / timings.length;
    const maxDuration = Math.max(...timings);
    
    return {
      hasTimingData: true,
      averageDuration,
      maxDuration,
      totalDuration,
      durationVariance: this.calculateVariance(timings)
    };
  }

  assessDataRisk(items) {
    let highRiskCount = 0;
    let criticalDataCount = 0;
    
    for (const item of items) {
      if (item.originalData) {
        if (item.originalData.priority === 'critical' || item.originalData.important) {
          criticalDataCount++;
        }
        
        if (item.originalData.sensitive || item.originalData.confidential) {
          highRiskCount++;
        }
      }
    }
    
    const riskRatio = items.length > 0 ? (highRiskCount + criticalDataCount) / items.length : 0;
    
    return {
      level: riskRatio > 0.5 ? 'high' : riskRatio > 0.2 ? 'medium' : 'low',
      highRiskCount,
      criticalDataCount,
      riskRatio
    };
  }

  assessDependencyRisk(items) {
    const dependencyAnalysis = this.analyzeDependencyComplexity(items);
    
    let level = 'low';
    if (dependencyAnalysis.hasComplexDependencies) {
      level = 'high';
    } else if (dependencyAnalysis.averageDependenciesPerItem > 1) {
      level = 'medium';
    }
    
    return {
      level,
      ...dependencyAnalysis
    };
  }

  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    
    return variance;
  }

  // ===== 新增的辅助方法 =====

  /**
   * 选择数量验证
   */
  validateSelectionQuantity(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const totalItems = enhancedContext.totalItems || selectedItems.length;
    const selectionRatio = selectedItems.length / totalItems;
    
    if (selectedItems.length === 0) {
      return { valid: false, reason: '选择项目数量为零' };
    }
    
    if (selectionRatio > 0.8) {
      return { valid: false, reason: '选择比例过高，可能影响系统稳定性' };
    }
    
    if (selectedItems.length > 1000) {
      return { 
        valid: true, 
        warning: '选择项目较多，建议分批处理' 
      };
    }
    
    return { valid: true };
  }

  /**
   * 依赖一致性验证
   */
  async validateDependencyConsistency(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const riskyDependencies = [];
    
    for (const item of selectedItems) {
      const dependencies = this.getItemDependencies(item);
      
      for (const dep of dependencies) {
        const isDepSelected = selectedItems.some(selected => 
          selected.id === dep.id || selected.operationId === dep.id
        );
        
        if (!isDepSelected && dep.criticalLevel === 'high') {
          riskyDependencies.push({
            item: item.id,
            dependency: dep.id,
            reason: '关键依赖未选中'
          });
        }
      }
    }
    
    return {
      valid: riskyDependencies.length === 0,
      riskyDependencies,
      reason: riskyDependencies.length > 0 ? '存在未选中的关键依赖' : null
    };
  }

  /**
   * 业务影响验证
   */
  async validateBusinessImpact(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const criticalItems = [];
    let totalImpactScore = 0;
    
    for (const item of selectedItems) {
      const impactScore = this.calculateBusinessImpactScore(item);
      totalImpactScore += impactScore;
      
      if (impactScore > 0.8) {
        criticalItems.push({
          item: item.id,
          impactScore,
          reason: '高业务影响项目'
        });
      }
    }
    
    const avgImpactScore = selectedItems.length > 0 ? totalImpactScore / selectedItems.length : 0;
    
    return {
      avgImpactScore,
      riskLevel: avgImpactScore > 0.7 ? 'high' : avgImpactScore > 0.4 ? 'medium' : 'low',
      criticalItems,
      totalImpactScore
    };
  }

  /**
   * 资源需求验证
   */
  async validateResourceRequirements(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const resourceRequirement = this.calculateResourceRequirement(selectedItems);
    const currentAvailability = enhancedContext.environmentAnalysis?.resourceAvailability || 0.8;
    
    const utilizationRatio = resourceRequirement / currentAvailability;
    
    return {
      sufficient: utilizationRatio <= 1.0,
      utilizationRatio,
      resourceRequirement,
      currentAvailability,
      recommendation: utilizationRatio > 0.9 ? '建议在低峰期执行' : null
    };
  }

  /**
   * 时间窗口验证
   */
  validateTimeWindow(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const estimatedDuration = this.estimateExecutionTime(selectedItems);
    const availableTime = enhancedContext.constraints?.timeLimit || 300000;
    
    return {
      feasible: estimatedDuration <= availableTime,
      estimatedDuration,
      availableTime,
      timeBuffer: availableTime - estimatedDuration
    };
  }

  /**
   * 历史成功率验证
   */
  async validateHistoricalSuccessRate(mlSelection, enhancedContext) {
    const similarCases = enhancedContext.historicalAnalysis?.similarCases || [];
    const successRate = similarCases.length > 0 ? 
      similarCases.filter(c => c.success).length / similarCases.length : 0.8;
    
    return {
      successRate,
      sampleSize: similarCases.length,
      confidence: similarCases.length >= 10 ? 'high' : similarCases.length >= 3 ? 'medium' : 'low'
    };
  }

  /**
   * 内部一致性验证
   */
  validateInternalConsistency(mlSelection) {
    const { selectedItems, confidence } = mlSelection;
    
    if (confidence < 0.5 && selectedItems.length > 0) {
      return {
        valid: false,
        reason: '选择结果置信度过低'
      };
    }
    
    return { valid: true };
  }

  /**
   * 生成验证建议
   */
  generateValidationRecommendation(validationResults, errors, warnings) {
    const recommendations = [];
    
    if (errors.length > 0) {
      recommendations.push('建议重新选择项目或调整参数');
    }
    
    if (warnings.length > 0) {
      recommendations.push('建议在低峰期执行或加强监控');
    }
    
    if (validationResults.resource?.utilizationRatio > 0.8) {
      recommendations.push('建议减少并发数或分批处理');
    }
    
    return recommendations;
  }

  /**
   * 计算最优批次大小
   */
  calculateOptimalBatchSize(itemCount, systemLoad, resourceAvailability) {
    let baseSize = Math.ceil(itemCount * 0.1);
    
    if (systemLoad < 0.3) baseSize *= 2;
    if (resourceAvailability > 0.8) baseSize *= 1.5;
    
    return Math.min(Math.max(baseSize, 5), 50);
  }

  /**
   * 计算最优并发数
   */
  calculateOptimalConcurrency(systemLoad, resourceAvailability) {
    let baseConcurrency = Math.floor(resourceAvailability * 5);
    
    if (systemLoad > 0.7) baseConcurrency = Math.max(1, baseConcurrency - 2);
    
    return Math.min(Math.max(baseConcurrency, 1), 8);
  }

  /**
   * 计算最优重试次数
   */
  calculateOptimalRetries(riskLevel) {
    switch (riskLevel) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * 计算最优超时时间
   */
  calculateOptimalTimeout(itemCount, systemLoad) {
    let baseTimeout = 30000; // 30秒基础时间
    
    baseTimeout += itemCount * 500; // 每个项目增加500ms
    
    if (systemLoad > 0.7) baseTimeout *= 1.5;
    
    return Math.min(baseTimeout, 300000); // 最多5分钟
  }

  /**
   * 调整策略参数
   */
  adjustStrategyParameters(strategy, enhancedContext, mlSelection) {
    const adjusted = { ...strategy };
    
    // 根据实际情况调整参数
    const currentTime = new Date().getHours();
    if (currentTime >= 22 || currentTime <= 6) {
      // 非工作时间，可以更激进
      adjusted.concurrency = Math.min(adjusted.concurrency * 1.5, 10);
      adjusted.batchSize = Math.min(adjusted.batchSize * 1.2, 30);
    }
    
    return adjusted;
  }

  /**
   * 创建执行批次
   */
  createExecutionBatches(itemIds, executionStrategy) {
    const batchSize = executionStrategy.batchSize || 10;
    const batches = [];
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      batches.push(itemIds.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * 并发执行批次
   */
  async executeBatchWithConcurrency(transactionId, batch, strategy, context) {
    const results = {
      processedCount: 0,
      successCount: 0,
      failCount: 0,
      errors: [],
      warnings: []
    };
    
    const concurrency = Math.min(strategy.concurrency || 3, batch.length);
    const chunks = [];
    
    // 将批次分割为并发块
    for (let i = 0; i < batch.length; i += concurrency) {
      chunks.push(batch.slice(i, i + concurrency));
    }
    
    // 逐块并发处理
    for (const chunk of chunks) {
      const promises = chunk.map(itemId => 
        this.rollbackSingleItem(transactionId, itemId, strategy)
          .then(() => ({ success: true, itemId }))
          .catch(error => ({ success: false, itemId, error: error.message }))
      );
      
      const chunkResults = await Promise.all(promises);
      
      chunkResults.forEach(result => {
        results.processedCount++;
        if (result.success) {
          results.successCount++;
        } else {
          results.failCount++;
          results.errors.push(result.error);
        }
      });
    }
    
    return results;
  }

  /**
   * 单个项目回滚
   */
  async rollbackSingleItem(transactionId, itemId, strategy) {
    const retries = strategy.retryAttempts || 1;
    const timeout = strategy.timeout || 30000;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 模拟回滚操作
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
          
          // 模拟异步回滚操作
          setTimeout(() => {
            clearTimeout(timer);
            if (Math.random() > 0.1) { // 90%成功率
              resolve();
            } else {
              reject(new Error(`项目 ${itemId} 回滚失败`));
            }
          }, Math.random() * 1000 + 500);
        });
        
        return; // 成功则返回
        
      } catch (error) {
        if (attempt === retries) {
          throw error; // 最后一次尝试失败，抛出错误
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * 检查是否应该提前终止
   */
  shouldAbortExecution(results, strategy) {
    if (results.processedItems === 0) return false;
    
    const failureRate = results.failedItems / results.processedItems;
    const abortThreshold = strategy.abortThreshold || 0.5;
    
    return failureRate > abortThreshold;
  }

  /**
   * 回滚已成功的项目
   */
  async rollbackSuccessfulItems(batches, transactionId) {
    console.log(`[PartialRollback] 开始回滚已成功的项目`);
    
    for (const batch of batches) {
      if (batch.result && batch.result.successCount > 0) {
        try {
          // 模拟回滚操作
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[PartialRollback] 已回滚批次 ${batch.index}`);
        } catch (error) {
          console.error(`[PartialRollback] 回滚批次 ${batch.index} 失败:`, error);
        }
      }
    }
  }

  /**
   * 获取项目依赖
   */
  getItemDependencies(item) {
    // 模拟依赖分析
    return item.dependencies || [];
  }

  /**
   * 计算业务影响分数
   */
  calculateBusinessImpactScore(item) {
    let score = 0;
    
    if (item.priority === 'high') score += 0.4;
    if (item.criticalLevel === 'high') score += 0.3;
    if (item.affectedUsers > 100) score += 0.2;
    if (item.dataSize > 1024 * 1024) score += 0.1; // 1MB以上
    
    return Math.min(score, 1.0);
  }

  /**
   * 计算资源需求
   */
  calculateResourceRequirement(selectedItems) {
    let totalRequirement = 0;
    
    selectedItems.forEach(item => {
      let itemRequirement = 0.1; // 基础资源
      
      if (item.complexity === 'high') itemRequirement += 0.3;
      if (item.dataSize > 1024 * 1024) itemRequirement += 0.2;
      if (item.dependencies && item.dependencies.length > 0) itemRequirement += 0.1;
      
      totalRequirement += itemRequirement;
    });
    
    return totalRequirement;
  }

  /**
   * 经过失败选择策略
   */
  async performFallbackSelection(snapshot, enhancedContext, options) {
    console.log('[PartialRollback] 使用备用选择策略');
    
    const items = snapshot.data.items;
    if (!items || items.length === 0) {
      return { items: [], confidence: 0, reason: '无可选择项目' };
    }
    
    // 简单的备用选择：选择前30%的项目
    const selectionCount = Math.min(Math.ceil(items.length * 0.3), 50);
    const selectedItems = items.slice(0, selectionCount);
    
    return {
      items: selectedItems,
      confidence: 0.6,
      reason: '使用备用选择策略，选择了前30%的项目'
    };
  }
}

// 导出服务实例
export default PartialRollbackService;
export const partialRollbackService = new PartialRollbackService();   */
  validateSelectionQuantity(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const totalItems = enhancedContext.totalItems || selectedItems.length;
    const selectionRatio = selectedItems.length / totalItems;
    
    if (selectedItems.length === 0) {
      return { valid: false, reason: '选择项目数量为零' };
    }
    
    if (selectionRatio > 0.8) {
      return { valid: false, reason: '选择比例过高，可能影响系统稳定性' };
    }
    
    if (selectedItems.length > 1000) {
      return { 
        valid: true, 
        warning: '选择项目较多，建议分批处理' 
      };
    }
    
    return { valid: true };
  }

  /**
   * 依赖一致性验证
   */
  async validateDependencyConsistency(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const riskyDependencies = [];
    
    for (const item of selectedItems) {
      const dependencies = this.getItemDependencies(item);
      
      for (const dep of dependencies) {
        const isDepSelected = selectedItems.some(selected => 
          selected.id === dep.id || selected.operationId === dep.id
        );
        
        if (!isDepSelected && dep.criticalLevel === 'high') {
          riskyDependencies.push({
            item: item.id,
            dependency: dep.id,
            reason: '关键依赖未选中'
          });
        }
      }
    }
    
    return {
      valid: riskyDependencies.length === 0,
      riskyDependencies,
      reason: riskyDependencies.length > 0 ? '存在未选中的关键依赖' : null
    };
  }

  /**
   * 业务影响验证
   */
  async validateBusinessImpact(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const criticalItems = [];
    let totalImpactScore = 0;
    
    for (const item of selectedItems) {
      const impactScore = this.calculateBusinessImpactScore(item);
      totalImpactScore += impactScore;
      
      if (impactScore > 0.8) {
        criticalItems.push({
          item: item.id,
          impactScore,
          reason: '高业务影响项目'
        });
      }
    }
    
    const avgImpactScore = selectedItems.length > 0 ? totalImpactScore / selectedItems.length : 0;
    
    return {
      avgImpactScore,
      riskLevel: avgImpactScore > 0.7 ? 'high' : avgImpactScore > 0.4 ? 'medium' : 'low',
      criticalItems,
      totalImpactScore
    };
  }

  /**
   * 资源需求验证
   */
  async validateResourceRequirements(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const resourceRequirement = this.calculateResourceRequirement(selectedItems);
    const currentAvailability = enhancedContext.environmentAnalysis?.resourceAvailability || 0.8;
    
    const utilizationRatio = resourceRequirement / currentAvailability;
    
    return {
      sufficient: utilizationRatio <= 1.0,
      utilizationRatio,
      resourceRequirement,
      currentAvailability,
      recommendation: utilizationRatio > 0.9 ? '建议在低峰期执行' : null
    };
  }

  /**
   * 时间窗口验证
   */
  validateTimeWindow(mlSelection, enhancedContext) {
    const { selectedItems } = mlSelection;
    const estimatedDuration = this.estimateExecutionTime(selectedItems);
    const availableTime = enhancedContext.constraints?.timeLimit || 300000;
    
    return {
      feasible: estimatedDuration <= availableTime,
      estimatedDuration,
      availableTime,
      timeBuffer: availableTime - estimatedDuration
    };
  }

  /**
   * 历史成功率验证
   */
  async validateHistoricalSuccessRate(mlSelection, enhancedContext) {
    const similarCases = enhancedContext.historicalAnalysis?.similarCases || [];
    const successRate = similarCases.length > 0 ? 
      similarCases.filter(c => c.success).length / similarCases.length : 0.8;
    
    return {
      successRate,
      sampleSize: similarCases.length,
      confidence: similarCases.length >= 10 ? 'high' : similarCases.length >= 3 ? 'medium' : 'low'
    };
  }

  /**
   * 内部一致性验证
   */
  validateInternalConsistency(mlSelection) {
    const { selectedItems, confidence } = mlSelection;
    
    if (confidence < 0.5 && selectedItems.length > 0) {
      return {
        valid: false,
        reason: '选择结果置信度过低'
      };
    }
    
    return { valid: true };
  }

  /**
   * 生成验证建议
   */
  generateValidationRecommendation(validationResults, errors, warnings) {
    const recommendations = [];
    
    if (errors.length > 0) {
      recommendations.push('建议重新选择项目或调整参数');
    }
    
    if (warnings.length > 0) {
      recommendations.push('建议在低峰期执行或加强监控');
    }
    
    if (validationResults.resource?.utilizationRatio > 0.8) {
      recommendations.push('建议减少并发数或分批处理');
    }
    
    return recommendations;
  }

  /**
   * 计算最优批次大小
   */
  calculateOptimalBatchSize(itemCount, systemLoad, resourceAvailability) {
    let baseSize = Math.ceil(itemCount * 0.1);
    
    if (systemLoad < 0.3) baseSize *= 2;
    if (resourceAvailability > 0.8) baseSize *= 1.5;
    
    return Math.min(Math.max(baseSize, 5), 50);
  }

  /**
   * 计算最优并发数
   */
  calculateOptimalConcurrency(systemLoad, resourceAvailability) {
    let baseConcurrency = Math.floor(resourceAvailability * 5);
    
    if (systemLoad > 0.7) baseConcurrency = Math.max(1, baseConcurrency - 2);
    
    return Math.min(Math.max(baseConcurrency, 1), 8);
  }

  /**
   * 计算最优重试次数
   */
  calculateOptimalRetries(riskLevel) {
    switch (riskLevel) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * 计算最优超时时间
   */
  calculateOptimalTimeout(itemCount, systemLoad) {
    let baseTimeout = 30000; // 30秒基础时间
    
    baseTimeout += itemCount * 500; // 每个项目增加500ms
    
    if (systemLoad > 0.7) baseTimeout *= 1.5;
    
    return Math.min(baseTimeout, 300000); // 最多5分钟
  }

  /**
   * 调整策略参数
   */
  adjustStrategyParameters(strategy, enhancedContext, mlSelection) {
    const adjusted = { ...strategy };
    
    // 根据实际情况调整参数
    const currentTime = new Date().getHours();
    if (currentTime >= 22 || currentTime <= 6) {
      // 非工作时间，可以更激进
      adjusted.concurrency = Math.min(adjusted.concurrency * 1.5, 10);
      adjusted.batchSize = Math.min(adjusted.batchSize * 1.2, 30);
    }
    
    return adjusted;
  }

  /**
   * 创建执行批次
   */
  createExecutionBatches(itemIds, executionStrategy) {
    const batchSize = executionStrategy.batchSize || 10;
    const batches = [];
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      batches.push(itemIds.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * 并发执行批次
   */
  async executeBatchWithConcurrency(transactionId, batch, strategy, context) {
    const results = {
      processedCount: 0,
      successCount: 0,
      failCount: 0,
      errors: [],
      warnings: []
    };
    
    const concurrency = Math.min(strategy.concurrency || 3, batch.length);
    const chunks = [];
    
    // 将批次分割为并发块
    for (let i = 0; i < batch.length; i += concurrency) {
      chunks.push(batch.slice(i, i + concurrency));
    }
    
    // 逐块并发处理
    for (const chunk of chunks) {
      const promises = chunk.map(itemId => 
        this.rollbackSingleItem(transactionId, itemId, strategy)
          .then(() => ({ success: true, itemId }))
          .catch(error => ({ success: false, itemId, error: error.message }))
      );
      
      const chunkResults = await Promise.all(promises);
      
      chunkResults.forEach(result => {
        results.processedCount++;
        if (result.success) {
          results.successCount++;
        } else {
          results.failCount++;
          results.errors.push(result.error);
        }
      });
    }
    
    return results;
  }

  /**
   * 单个项目回滚
   */
  async rollbackSingleItem(transactionId, itemId, strategy) {
    const retries = strategy.retryAttempts || 1;
    const timeout = strategy.timeout || 30000;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 模拟回滚操作
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
          
          // 模拟异步回滚操作
          setTimeout(() => {
            clearTimeout(timer);
            if (Math.random() > 0.1) { // 90%成功率
              resolve();
            } else {
              reject(new Error(`项目 ${itemId} 回滚失败`));
            }
          }, Math.random() * 1000 + 500);
        });
        
        return; // 成功则返回
        
      } catch (error) {
        if (attempt === retries) {
          throw error; // 最后一次尝试失败，抛出错误
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  /**
   * 检查是否应该提前终止
   */
  shouldAbortExecution(results, strategy) {
    if (results.processedItems === 0) return false;
    
    const failureRate = results.failedItems / results.processedItems;
    const abortThreshold = strategy.abortThreshold || 0.5;
    
    return failureRate > abortThreshold;
  }

  /**
   * 回滚已成功的项目
   */
  async rollbackSuccessfulItems(batches, transactionId) {
    console.log(`[PartialRollback] 开始回滚已成功的项目`);
    
    for (const batch of batches) {
      if (batch.result && batch.result.successCount > 0) {
        try {
          // 模拟回滚操作
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`[PartialRollback] 已回滚批次 ${batch.index}`);
        } catch (error) {
          console.error(`[PartialRollback] 回滚批次 ${batch.index} 失败:`, error);
        }
      }
    }
  }

  /**
   * 获取项目依赖
   */
  getItemDependencies(item) {
    // 模拟依赖分析
    return item.dependencies || [];
  }

  /**
   * 计算业务影响分数
   */
  calculateBusinessImpactScore(item) {
    let score = 0;
    
    if (item.priority === 'high') score += 0.4;
    if (item.criticalLevel === 'high') score += 0.3;
    if (item.affectedUsers > 100) score += 0.2;
    if (item.dataSize > 1024 * 1024) score += 0.1; // 1MB以上
    
    return Math.min(score, 1.0);
  }

  /**
   * 计算资源需求
   */
  calculateResourceRequirement(selectedItems) {
    let totalRequirement = 0;
    
    selectedItems.forEach(item => {
      let itemRequirement = 0.1; // 基础资源
      
      if (item.complexity === 'high') itemRequirement += 0.3;
      if (item.dataSize > 1024 * 1024) itemRequirement += 0.2;
      if (item.dependencies && item.dependencies.length > 0) itemRequirement += 0.1;
      
      totalRequirement += itemRequirement;
    });
    
    return totalRequirement;
  }

  /**
   * 经过失败选择策略
   */
  async performFallbackSelection(snapshot, enhancedContext, options) {
    console.log('[PartialRollback] 使用备用选择策略');
    
    const items = snapshot.data.items;
    if (!items || items.length === 0) {
      return { items: [], confidence: 0, reason: '无可选择项目' };
    }
    
    // 简单的备用选择：选择前30%的项目
    const selectionCount = Math.min(Math.ceil(items.length * 0.3), 50);
    const selectedItems = items.slice(0, selectionCount);
    
    return {
      items: selectedItems,
      confidence: 0.6,
      reason: '使用备用选择策略，选择了前30%的项目'
    };
  }
}

// 导出服务实例
export default PartialRollbackService;
export const partialRollbackService = new PartialRollbackService();