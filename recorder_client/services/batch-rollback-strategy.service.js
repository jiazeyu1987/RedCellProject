/**
 * 批量回滚策略算法服务
 * 实现多种回滚策略的智能选择和执行
 */

import { batchRollbackService, ROLLBACK_STRATEGY, SNAPSHOT_TYPE } from './batch-rollback.service.js';

// 策略优先级
export const STRATEGY_PRIORITY = {
  EMERGENCY: 'emergency',        // 紧急策略
  FAST: 'fast',                 // 快速策略
  SAFE: 'safe',                 // 安全策略
  OPTIMAL: 'optimal',           // 最优策略
  CUSTOM: 'custom'              // 自定义策略
};

// 回滚模式
export const ROLLBACK_MODE = {
  SYNCHRONOUS: 'sync',          // 同步回滚
  ASYNCHRONOUS: 'async',        // 异步回滚
  BATCH_SYNC: 'batch_sync',     // 批量同步
  BATCH_ASYNC: 'batch_async'    // 批量异步
};

class BatchRollbackStrategyService {
  constructor() {
    this.config = {
      // 策略配置
      defaultStrategy: ROLLBACK_STRATEGY.IMMEDIATE,
      fallbackStrategy: ROLLBACK_STRATEGY.COMPENSATING,
      maxConcurrentRollbacks: 5,
      
      // 性能阈值
      performanceThresholds: {
        fastRollbackTime: 5000,     // 快速回滚时间阈值(5秒)
        maxMemoryUsage: 100,        // 最大内存使用(MB)
        maxCpuUsage: 80,           // 最大CPU使用率(%)
        networkLatency: 100        // 网络延迟阈值(ms)
      },
      
      // 风险评估配置
      riskAssessment: {
        lowRiskThreshold: 30,       // 低风险阈值
        mediumRiskThreshold: 60,    // 中风险阈值
        highRiskThreshold: 90       // 高风险阈值
      }
    };
    
    // 策略注册表
    this.strategies = new Map();
    
    // 策略执行历史
    this.executionHistory = [];
    
    // 初始化内置策略
    this.initializeBuiltinStrategies();
  }

  /**
   * 初始化内置策略
   */
  initializeBuiltinStrategies() {
    // 立即回滚策略
    this.registerStrategy(ROLLBACK_STRATEGY.IMMEDIATE, {
      name: '立即回滚策略',
      description: '立即执行所有回滚操作',
      priority: STRATEGY_PRIORITY.FAST,
      mode: ROLLBACK_MODE.SYNCHRONOUS,
      executor: this.executeImmediateStrategy.bind(this),
      validator: this.validateImmediateStrategy.bind(this),
      estimator: this.estimateImmediateStrategy.bind(this)
    });

    // 部分回滚策略
    this.registerStrategy(ROLLBACK_STRATEGY.PARTIAL, {
      name: '部分回滚策略',
      description: '只回滚指定的操作项目',
      priority: STRATEGY_PRIORITY.SAFE,
      mode: ROLLBACK_MODE.BATCH_SYNC,
      executor: this.executePartialStrategy.bind(this),
      validator: this.validatePartialStrategy.bind(this),
      estimator: this.estimatePartialStrategy.bind(this)
    });

    // 级联回滚策略
    this.registerStrategy(ROLLBACK_STRATEGY.CASCADE, {
      name: '级联回滚策略',
      description: '回滚当前事务及其所有依赖事务',
      priority: STRATEGY_PRIORITY.EMERGENCY,
      mode: ROLLBACK_MODE.BATCH_ASYNC,
      executor: this.executeCascadeStrategy.bind(this),
      validator: this.validateCascadeStrategy.bind(this),
      estimator: this.estimateCascadeStrategy.bind(this)
    });
  }

  /**
   * 注册回滚策略
   * @param {string} strategyType - 策略类型
   * @param {Object} strategyConfig - 策略配置
   */
  registerStrategy(strategyType, strategyConfig) {
    this.strategies.set(strategyType, {
      ...strategyConfig,
      registeredAt: Date.now(),
      executionCount: 0,
      successCount: 0,
      averageExecutionTime: 0
    });
    
    console.log(`[RollbackStrategy] 注册策略: ${strategyType}`);
  }

  /**
   * 智能策略选择增强版
   * @param {string} transactionId - 事务ID
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 推荐的策略
   */
  async selectOptimalStrategyEnhanced(transactionId, context = {}) {
    try {
      console.log(`[RollbackStrategy] 为事务 ${transactionId} 选择最优回滚策略（增强版）`);
      
      // 获取事务信息
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }

      // 获取操作记录信息
      const operationRecord = batchRollbackService.operationRecords.get(transactionId);
      
      // 收集增强决策因素
      const enhancedFactors = await this.collectEnhancedDecisionFactors(snapshot, operationRecord, context);
      
      // 实时策略评估
      const realTimeEvaluations = await this.performRealTimeStrategyEvaluation(enhancedFactors);
      
      // 基于AI的策略推荐
      const aiRecommendation = await this.generateAIStrategyRecommendation(enhancedFactors, realTimeEvaluations);
      
      // 动态策略调整
      const dynamicStrategy = await this.applyDynamicStrategyAdjustment(aiRecommendation, enhancedFactors);
      
      console.log(`[RollbackStrategy] 增强策略选择: ${dynamicStrategy.type} (综合评分: ${dynamicStrategy.score.toFixed(2)})`);
      
      return dynamicStrategy;
      
    } catch (error) {
      console.error(`[RollbackStrategy] 增强策略选择失败:`, error);
      
      // 回退到基础策略选择
      return await this.selectOptimalStrategy(transactionId, context);
    }
  }

  /**
   * 收集增强决策因素
   * @param {Object} snapshot - 事务快照
   * @param {Object} operationRecord - 操作记录
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 增强决策因素
   */
  async collectEnhancedDecisionFactors(snapshot, operationRecord, context) {
    const basicFactors = await this.collectDecisionFactors(snapshot, context);
    
    // 增强因素
    const enhancedFactors = {
      ...basicFactors,
      
      // 操作记录因素
      operationFactors: operationRecord ? {
        operationComplexity: this.calculateOperationComplexity(operationRecord),
        operationRiskDistribution: this.analyzeOperationRiskDistribution(operationRecord),
        operationDependencyGraph: this.buildOperationDependencyGraph(operationRecord),
        operationExecutionContext: operationRecord.context
      } : null,
      
      // 实时系统因素
      realTimeFactors: {
        currentSystemLoad: await this.getCurrentSystemLoad(),
        activeRollbackCount: this.getActiveRollbackOperations(),
        resourceUtilization: await this.getResourceUtilization(),
        networkLatency: await this.measureNetworkLatency()
      },
      
      // 业务级因素
      businessFactors: {
        businessCriticality: this.assessBusinessCriticality(snapshot, context),
        userImpactLevel: this.calculateUserImpactLevel(snapshot),
        timeSensitivity: this.evaluateTimeSensitivity(context),
        complianceRequirements: this.checkComplianceRequirements(snapshot)
      },
      
      // 学习因素
      learningFactors: {
        historicalPatterns: await this.analyzeHistoricalPatterns(snapshot.type),
        strategyEffectiveness: await this.getStrategyEffectiveness(),
        failurePatterns: await this.identifyFailurePatterns(snapshot),
        successPatterns: await this.identifySuccessPatterns(snapshot)
      },
      
      // 环境因素
      environmentalFactors: {
        timeOfDay: this.getCurrentTimeContext(),
        dayOfWeek: this.getDayOfWeekContext(),
        seasonality: this.getSeasonalityContext(),
        externalEvents: await this.checkExternalEvents()
      }
    };
    
    return enhancedFactors;
  }

  /**
   * 实时策略评估
   * @param {Object} factors - 决策因素
   * @returns {Promise<Array>} 实时评估结果
   */
  async performRealTimeStrategyEvaluation(factors) {
    const evaluations = [];
    
    for (const [strategyType, strategy] of this.strategies) {
      try {
        // 实时性能测试
        const performanceMetrics = await this.measureStrategyPerformance(strategyType, factors);
        
        // 实时风险评估
        const riskAssessment = await this.assessRealTimeRisk(strategyType, factors);
        
        // 实时成本计算
        const costAnalysis = await this.calculateRealTimeCost(strategyType, factors);
        
        // 实时可行性检查
        const feasibilityCheck = await this.checkRealTimeFeasibility(strategyType, factors);
        
        const evaluation = {
          strategyType,
          performanceMetrics,
          riskAssessment,
          costAnalysis,
          feasibilityCheck,
          timestamp: Date.now(),
          
          // 综合评分
          realTimeScore: this.calculateRealTimeScore({
            performanceMetrics,
            riskAssessment,
            costAnalysis,
            feasibilityCheck
          })
        };
        
        evaluations.push(evaluation);
        
      } catch (error) {
        console.error(`[RollbackStrategy] 实时评估策略 ${strategyType} 失败:`, error);
      }
    }
    
    return evaluations.sort((a, b) => b.realTimeScore - a.realTimeScore);
  }

  /**
   * 生成AI策略推荐
   * @param {Object} factors - 决策因素
   * @param {Array} evaluations - 评估结果
   * @returns {Promise<Object>} AI推荐结果
   */
  async generateAIStrategyRecommendation(factors, evaluations) {
    try {
      // 简化的AI决策模型（基于规则和权重）
      const aiModel = {
        // 特征权重
        featureWeights: {
          performance: 0.3,
          risk: 0.25,
          cost: 0.2,
          feasibility: 0.15,
          history: 0.1
        },
        
        // 策略偏好
        strategyPreferences: {
          immediate: { speed: 0.9, safety: 0.6, complexity: 0.3 },
          partial: { speed: 0.7, safety: 0.9, complexity: 0.7 },
          cascade: { speed: 0.4, safety: 0.8, complexity: 0.9 },
          compensating: { speed: 0.5, safety: 0.95, complexity: 0.8 }
        }
      };
      
      let bestStrategy = null;
      let bestScore = -1;
      
      for (const evaluation of evaluations) {
        const { strategyType } = evaluation;
        
        // 计算AI评分
        const aiScore = this.calculateAIScore(evaluation, factors, aiModel);
        
        // 上下文调整
        const contextAdjustedScore = this.applyContextAdjustment(aiScore, factors, strategyType);
        
        if (contextAdjustedScore > bestScore) {
          bestScore = contextAdjustedScore;
          bestStrategy = {
            type: strategyType,
            score: contextAdjustedScore,
            confidence: this.calculateConfidence(evaluation, factors),
            reasoning: this.generateReasoning(evaluation, factors, aiModel)
          };
        }
      }
      
      return bestStrategy || {
        type: this.config.fallbackStrategy,
        score: 0,
        confidence: 0.1,
        reasoning: 'AI推荐失败，使用默认策略'
      };
      
    } catch (error) {
      console.error('[RollbackStrategy] AI策略推荐失败:', error);
      return {
        type: this.config.fallbackStrategy,
        score: 0,
        confidence: 0.1,
        reasoning: `AI推荐错误: ${error.message}`
      };
    }
  }

  /**
   * 动态策略调整
   * @param {Object} baseStrategy - 基础策略
   * @param {Object} factors - 决策因素
   * @returns {Promise<Object>} 调整后策略
   */
  async applyDynamicStrategyAdjustment(baseStrategy, factors) {
    try {
      const adjustedStrategy = { ...baseStrategy };
      
      // 实时系统负载调整
      if (factors.realTimeFactors.currentSystemLoad > 0.8) {
        adjustedStrategy.score *= 0.8; // 高负载时降低评分
        adjustedStrategy.reasoning += '; 系统高负载调整';
      }
      
      // 紧急情况调整
      if (factors.businessFactors.businessCriticality === 'critical') {
        if (adjustedStrategy.type === ROLLBACK_STRATEGY.IMMEDIATE) {
          adjustedStrategy.score *= 1.2; // 紧急情况优先立即回滚
        }
        adjustedStrategy.reasoning += '; 紧急业务调整';
      }
      
      // 时间敏感性调整
      if (factors.businessFactors.timeSensitivity === 'high') {
        if ([ROLLBACK_STRATEGY.CASCADE, ROLLBACK_STRATEGY.COMPENSATING].includes(adjustedStrategy.type)) {
          adjustedStrategy.score *= 0.7; // 时间敏感时降低复杂策略评分
        }
        adjustedStrategy.reasoning += '; 时间敏感调整';
      }
      
      // 学习基础调整
      const historicalSuccess = factors.learningFactors.strategyEffectiveness[adjustedStrategy.type];
      if (historicalSuccess) {
        const successBonus = (historicalSuccess.successRate - 0.5) * 0.4; // -0.2 to +0.2
        adjustedStrategy.score *= (1 + successBonus);
        adjustedStrategy.reasoning += `; 历史成功率调整(${(successBonus * 100).toFixed(1)}%)`;
      }
      
      // 环境因素调整
      if (factors.environmentalFactors.timeOfDay.isPeakHours) {
        adjustedStrategy.score *= 0.9; // 高峰期降低评分
        adjustedStrategy.reasoning += '; 高峰期调整';
      }
      
      // 计算最终置信度
      adjustedStrategy.confidence = this.recalculateConfidence(adjustedStrategy, factors);
      
      return adjustedStrategy;
      
    } catch (error) {
      console.error('[RollbackStrategy] 动态策略调整失败:', error);
      return baseStrategy;
    }
  }
    try {
      console.log(`[RollbackStrategy] 为事务 ${transactionId} 选择最优回滚策略`);
      
      // 获取事务信息
      const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
      if (!snapshot) {
        throw new Error(`事务快照不存在: ${transactionId}`);
      }

      // 收集决策因素
      const decisionFactors = await this.collectDecisionFactors(snapshot, context);
      
      // 评估所有可用策略
      const strategyEvaluations = await this.evaluateStrategies(decisionFactors);
      
      // 选择最优策略
      const optimalStrategy = this.selectBestStrategy(strategyEvaluations);
      
      console.log(`[RollbackStrategy] 选择策略: ${optimalStrategy.type} (评分: ${optimalStrategy.score})`);
      
      return optimalStrategy;
      
    } catch (error) {
      console.error(`[RollbackStrategy] 策略选择失败:`, error);
      
      // 返回默认策略
      return {
        type: this.config.defaultStrategy,
        score: 0,
        reason: `策略选择失败，使用默认策略: ${error.message}`
      };
    }
  }

  /**
   * 收集决策因素
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 决策因素
   */
  async collectDecisionFactors(snapshot, context) {
    const factors = {
      // 事务特征
      transactionSize: snapshot.itemCount,
      dataSize: snapshot.size,
      snapshotType: snapshot.type,
      
      // 业务因素
      businessPriority: context.priority || 'normal',
      timeConstraints: context.maxRollbackTime || 300000,
      urgencyLevel: context.urgencyLevel || 'normal',
      
      // 风险因素
      riskLevel: await this.calculateRiskLevel(snapshot, context),
      dependencies: snapshot.dependencies || {},
      impactScope: await this.calculateImpactScope(snapshot),
      
      // 系统状态
      systemLoad: await this.getCurrentSystemLoad(),
      availableResources: await this.getAvailableResources(),
      concurrentOperations: await this.getConcurrentOperationsCount(),
      
      // 历史数据
      historicalPerformance: await this.getHistoricalPerformance(snapshot.type),
      failurePatterns: await this.getFailurePatterns(context)
    };
    
    return factors;
  }

  /**
   * 评估所有策略
   * @param {Object} factors - 决策因素
   * @returns {Promise<Array>} 策略评估结果
   */
  async evaluateStrategies(factors) {
    const evaluations = [];
    
    for (const [strategyType, strategy] of this.strategies) {
      try {
        console.log(`[RollbackStrategy] 评估策略: ${strategyType}`);
        
        // 验证策略适用性
        const validation = await strategy.validator(factors);
        if (!validation.valid) {
          console.log(`[RollbackStrategy] 策略 ${strategyType} 不适用: ${validation.reason}`);
          continue;
        }
        
        // 估算策略性能
        const estimation = await strategy.estimator(factors);
        
        // 计算策略得分
        const score = await this.calculateStrategyScore(strategyType, factors, estimation);
        
        evaluations.push({
          strategyType,
          score,
          estimation,
          validation,
          recommendation: await this.generateStrategyRecommendation(strategyType, factors, estimation)
        });
        
      } catch (error) {
        console.error(`[RollbackStrategy] 评估策略 ${strategyType} 失败:`, error);
        
        evaluations.push({
          strategyType,
          score: 0,
          error: error.message,
          recommendation: {
            viable: false,
            reason: error.message
          }
        });
      }
    }
    
    // 按得分排序
    evaluations.sort((a, b) => b.score - a.score);
    
    return evaluations;
  }

  /**
   * 计算策略得分
   * @param {string} strategyType - 策略类型
   * @param {Object} factors - 决策因素
   * @param {Object} estimation - 性能估算
   * @returns {Promise<number>} 策略得分
   */
  async calculateStrategyScore(strategyType, factors, estimation) {
    let score = 0;
    
    // 成功率权重 (40%)
    score += estimation.successProbability * 40;
    
    // 执行时间权重 (25%)
    const timeScore = Math.max(0, 25 - (estimation.executionTime / 1000) * 2.5);
    score += timeScore;
    
    // 资源使用权重 (20%)
    const resourceScore = Math.max(0, 20 - (estimation.memoryUsage / 10));
    score += resourceScore;
    
    // 业务优先级调整 (15%)
    const priorityMultiplier = {
      'emergency': 1.5,
      'high': 1.2,
      'normal': 1.0,
      'low': 0.8
    };
    score *= (priorityMultiplier[factors.businessPriority] || 1.0);
    
    // 历史性能调整
    if (factors.historicalPerformance) {
      const historyBonus = factors.historicalPerformance[strategyType] ? 
        factors.historicalPerformance[strategyType].averageSuccessRate * 5 : 0;
      score += historyBonus;
    }
    
    // 风险级别惩罚
    const riskPenalty = {
      'low': 0,
      'medium': -5,
      'high': -15,
      'critical': -30
    };
    score += (riskPenalty[factors.riskLevel] || 0);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成策略推荐
   * @param {string} strategyType - 策略类型
   * @param {Object} factors - 决策因素
   * @param {Object} estimation - 性能估算
   * @returns {Promise<Object>} 推荐信息
   */
  async generateStrategyRecommendation(strategyType, factors, estimation) {
    const strategy = this.strategies.get(strategyType);
    
    const recommendation = {
      viable: estimation.successProbability >= 0.7,
      confidence: estimation.successProbability,
      estimatedTime: estimation.executionTime,
      memoryUsage: estimation.memoryUsage,
      pros: [],
      cons: [],
      warnings: []
    };
    
    // 根据策略类型生成具体推荐
    switch (strategyType) {
      case ROLLBACK_STRATEGY.IMMEDIATE:
        recommendation.pros.push('快速执行', '简单明了');
        if (factors.transactionSize > 100) {
          recommendation.cons.push('大型事务可能影响性能');
        }
        if (factors.riskLevel === 'high') {
          recommendation.warnings.push('高风险操作，建议谨慎执行');
        }
        break;
        
      case ROLLBACK_STRATEGY.PARTIAL:
        recommendation.pros.push('精确控制', '降低风险');
        if (factors.dependencies.hasDependencies) {
          recommendation.cons.push('可能影响依赖项');
        }
        if (factors.transactionSize < 10) {
          recommendation.warnings.push('小型事务可能不需要部分回滚');
        }
        break;
        
      case ROLLBACK_STRATEGY.CASCADE:
        recommendation.pros.push('完整性保障', '处理依赖关系');
        recommendation.cons.push('执行时间较长', '资源消耗较大');
        if (!factors.dependencies.hasDependencies) {
          recommendation.warnings.push('未检测到依赖关系，可能不需要级联回滚');
        }
        break;
    }
    
    return recommendation;
  }
        
        evaluations.push({
          type: strategyType,
          strategy,
          score,
          estimation
        });
        
      } catch (error) {
        console.error(`[RollbackStrategy] 评估策略 ${strategyType} 失败:`, error);
      }
    }
    
    // 按得分排序
    return evaluations.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算策略得分
   * @param {string} strategyType - 策略类型
   * @param {Object} factors - 决策因素
   * @param {Object} estimation - 性能估算
   * @returns {Promise<number>} 策略得分(0-100)
   */
  async calculateStrategyScore(strategyType, factors, estimation) {
    let score = 100;
    
    // 执行时间评分
    const timeRatio = estimation.executionTime / factors.timeConstraints;
    if (timeRatio > 1) {
      score -= 50;
    } else if (timeRatio > 0.8) {
      score -= 20;
    }
    
    // 风险评分
    if (factors.riskLevel > 70) {
      score -= 30;
    } else if (factors.riskLevel > 40) {
      score -= 15;
    }
    
    // 策略特定调整
    const strategyAdjustments = {
      [ROLLBACK_STRATEGY.IMMEDIATE]: 10,    // 快速执行加分
      [ROLLBACK_STRATEGY.PARTIAL]: 15,      // 安全性加分
      [ROLLBACK_STRATEGY.CASCADE]: -10      // 复杂性减分
    };
    
    score += strategyAdjustments[strategyType] || 0;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 选择最佳策略
   * @param {Array} evaluations - 策略评估结果
   * @returns {Object} 最佳策略
   */
  selectBestStrategy(evaluations) {
    if (evaluations.length === 0) {
      return {
        type: this.config.fallbackStrategy,
        score: 0,
        reason: '没有可用的策略，使用回退策略'
      };
    }
    
    const bestEvaluation = evaluations[0];
    
    return {
      type: bestEvaluation.type,
      score: bestEvaluation.score,
      strategy: bestEvaluation.strategy,
      estimation: bestEvaluation.estimation,
      reason: `最优策略选择：${bestEvaluation.strategy.name}`
    };
  }

  // ===== 策略验证器实现 =====

  async validateImmediateStrategy(factors) {
    const validation = {
      valid: true,
      reason: 'valid',
      checks: []
    };
    
    // 检查事务大小
    if (factors.transactionSize > 1000) {
      validation.checks.push({
        type: 'size_check',
        passed: false,
        message: '事务过大，不适合立即回滚'
      });
      validation.valid = false;
      validation.reason = '事务过大';
    } else {
      validation.checks.push({
        type: 'size_check',
        passed: true,
        message: '事务大小适合'
      });
    }
    
    // 检查系统负载
    if (factors.systemLoad > 80) {
      validation.checks.push({
        type: 'load_check',
        passed: false,
        message: '系统负载过高'
      });
      validation.valid = false;
      validation.reason = '系统负载过高';
    } else {
      validation.checks.push({
        type: 'load_check',
        passed: true,
        message: '系统负载正常'
      });
    }
    
    return validation;
  }

  async validatePartialStrategy(factors) {
    const validation = {
      valid: true,
      reason: 'valid',
      checks: []
    };
    
    // 检查事务大小 - 部分回滚需要一定数量的项目
    if (factors.transactionSize < 5) {
      validation.checks.push({
        type: 'size_check',
        passed: false,
        message: '事务过小，不需要部分回滚'
      });
      validation.valid = false;
      validation.reason = '事务过小';
    } else {
      validation.checks.push({
        type: 'size_check',
        passed: true,
        message: '事务大小适合部分回滚'
      });
    }
    
    return validation;
  }

  async validateCascadeStrategy(factors) {
    const validation = {
      valid: true,
      reason: 'valid',
      checks: []
    };
    
    // 检查是否有依赖关系
    if (!factors.dependencies || !factors.dependencies.hasDependencies) {
      validation.checks.push({
        type: 'dependency_check',
        passed: false,
        message: '未检测到依赖关系，不需要级联回滚'
      });
      validation.valid = false;
      validation.reason = '无依赖关系';
    } else {
      validation.checks.push({
        type: 'dependency_check',
        passed: true,
        message: `检测到 ${factors.dependencies.dependencyCount} 个依赖关系`
      });
    }
    
    return validation;
  }

  // ===== 策略估算器实现 =====

  async estimateImmediateStrategy(factors) {
    return {
      executionTime: factors.transactionSize * 50,
      memoryUsage: factors.dataSize / 1024 / 1024,
      successProbability: 0.95
    };
  }

  async estimatePartialStrategy(factors) {
    return {
      executionTime: factors.transactionSize * 30,
      memoryUsage: factors.dataSize / 1024 / 1024 * 0.3,
      successProbability: 0.92
    };
  }

  async estimateCascadeStrategy(factors) {
    const cascadeMultiplier = factors.dependencies.dependencyCount || 1;
    return {
      executionTime: factors.transactionSize * 80 * cascadeMultiplier,
      memoryUsage: factors.dataSize / 1024 / 1024 * cascadeMultiplier,
      successProbability: 0.85
    };
  }

  // ===== 策略执行器实现 =====

  async executeImmediateStrategy(transactionId, options) {
    return await batchRollbackService.executeRollback(transactionId, {
      strategy: ROLLBACK_STRATEGY.IMMEDIATE,
      ...options
    });
  }

  async executePartialStrategy(transactionId, options) {
    const itemIds = options.itemIds || await this.selectPartialRollbackItems(transactionId);
    
    return await batchRollbackService.executePartialRollback(transactionId, itemIds, {
      strategy: ROLLBACK_STRATEGY.PARTIAL,
      ...options
    });
  }

  async executeCascadeStrategy(transactionId, options) {
    return await batchRollbackService.handleCascadeRollback(transactionId, {
      strategy: ROLLBACK_STRATEGY.CASCADE,
      ...options
    });
  }

  async selectPartialRollbackItems(transactionId) {
    const snapshot = batchRollbackService.getTransactionSnapshot(transactionId);
    const items = snapshot.data.items;
    
    // 简化实现：选择前30%的项目
    return items.slice(0, Math.ceil(items.length * 0.3)).map(item => item.id);
  }

  // ===== 策略评估辅助方法 =====

  /**
   * 计算风险级别
   * @param {Object} snapshot - 事务快照
   * @param {Object} context - 上下文信息
   * @returns {Promise<string>} 风险级别
   */
  async calculateRiskLevel(snapshot, context) {
    let riskScore = 0;
    
    // 数据大小风险
    if (snapshot.size > 50 * 1024 * 1024) { // 50MB
      riskScore += 30;
    } else if (snapshot.size > 10 * 1024 * 1024) { // 10MB
      riskScore += 15;
    }
    
    // 项目数量风险
    if (snapshot.itemCount > 500) {
      riskScore += 25;
    } else if (snapshot.itemCount > 100) {
      riskScore += 10;
    }
    
    // 依赖关系风险
    if (snapshot.dependencies && snapshot.dependencies.hasDependencies) {
      riskScore += snapshot.dependencies.dependencyCount * 5;
    }
    
    // 业务优先级调整
    if (context.priority === 'emergency') {
      riskScore += 20;
    } else if (context.priority === 'high') {
      riskScore += 10;
    }
    
    // 返回风险级别
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * 计算影响范围
   * @param {Object} snapshot - 事务快照
   * @returns {Promise<string>} 影响范围
   */
  async calculateImpactScope(snapshot) {
    const itemCount = snapshot.itemCount;
    
    if (itemCount > 200) return 'system-wide';
    if (itemCount > 50) return 'department';
    if (itemCount > 10) return 'team';
    return 'individual';
  }

  /**
   * 获取当前系统负载
   * @returns {Promise<number>} 系统负载百分比
   */
  async getCurrentSystemLoad() {
    // 简化实现，实际应用中应该检查真实的系统指标
    const concurrentOps = await this.getConcurrentOperationsCount();
    return Math.min(100, concurrentOps * 10);
  }

  /**
   * 获取可用资源
   * @returns {Promise<Object>} 可用资源信息
   */
  async getAvailableResources() {
    return {
      memory: 75, // 75% 可用内存
      cpu: 60,    // 60% 可用CPU
      network: 80 // 80% 网络带宽
    };
  }

  /**
   * 获取并发操作数量
   * @returns {Promise<number>} 并发操作数量
   */
  async getConcurrentOperationsCount() {
    // 简化实现
    return Math.floor(Math.random() * 10);
  }

  /**
   * 获取历史性能数据
   * @param {string} snapshotType - 快照类型
   * @returns {Promise<Object>} 历史性能数据
   */
  async getHistoricalPerformance(snapshotType) {
    // 模拟历史数据
    return {
      [ROLLBACK_STRATEGY.IMMEDIATE]: {
        averageExecutionTime: 5000,
        averageSuccessRate: 0.92,
        totalExecutions: 150
      },
      [ROLLBACK_STRATEGY.PARTIAL]: {
        averageExecutionTime: 8000,
        averageSuccessRate: 0.95,
        totalExecutions: 80
      },
      [ROLLBACK_STRATEGY.CASCADE]: {
        averageExecutionTime: 15000,
        averageSuccessRate: 0.88,
        totalExecutions: 25
      }
    };
  }

  /**
   * 获取失败模式
   * @param {Object} context - 上下文信息
   * @returns {Promise<Array>} 失败模式
   */
  async getFailurePatterns(context) {
    // 模拟失败模式分析
    const patterns = [];
    
    if (context.priority === 'emergency') {
      patterns.push({
        type: 'timeout_risk',
        probability: 0.3,
        description: '紧急操作容易超时'
      });
    }
    
    return patterns;
  }

  /**
   * 执行策略
   * @param {string} strategyType - 策略类型
   * @param {string} transactionId - 事务ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 执行结果
   */
  async executeStrategy(strategyType, transactionId, options = {}) {
    const strategy = this.strategies.get(strategyType);
    if (!strategy) {
      throw new Error(`未知的回滚策略: ${strategyType}`);
    }
    
    const startTime = Date.now();
    
    try {
      console.log(`[RollbackStrategy] 执行策略 ${strategyType} for 事务 ${transactionId}`);
      
      // 更新策略执行计数
      strategy.executionCount++;
      
      // 执行策略
      const result = await strategy.executor(transactionId, options);
      
      // 记录成功执行
      strategy.successCount++;
      
      const executionTime = Date.now() - startTime;
      strategy.averageExecutionTime = (
        (strategy.averageExecutionTime * (strategy.successCount - 1) + executionTime) / 
        strategy.successCount
      );
      
      // 记录执行历史
      this.recordExecution(strategyType, transactionId, {
        success: true,
        executionTime,
        result,
        timestamp: Date.now()
      });
      
      console.log(`[RollbackStrategy] 策略 ${strategyType} 执行成功，耗时: ${executionTime}ms`);
      
      return {
        success: true,
        strategy: strategyType,
        executionTime,
        result
      };
      
    } catch (error) {
      console.error(`[RollbackStrategy] 策略 ${strategyType} 执行失败:`, error);
      
      // 记录失败执行
      this.recordExecution(strategyType, transactionId, {
        success: false,
        executionTime: Date.now() - startTime,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * 记录策略执行历史
   * @param {string} strategyType - 策略类型
   * @param {string} transactionId - 事务ID
   * @param {Object} execution - 执行信息
   */
  recordExecution(strategyType, transactionId, execution) {
    const record = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategyType,
      transactionId,
      ...execution
    };
    
    this.executionHistory.push(record);
    
    // 限制历史记录数量
    if (this.executionHistory.length > 1000) {
      this.executionHistory.shift();
    }
  }

  /**
   * 自适应策略选择
   * @param {string} transactionId - 事务ID
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 推荐策略
   */
  async adaptiveStrategySelection(transactionId, context = {}) {
    try {
      // 分析历史执行数据
      const historicalData = this.analyzeHistoricalPerformance(context);
      
      // 获取系统当前状态
      const systemState = await this.getCurrentSystemState();
      
      // 结合历史数据和当前状态选择策略
      const adaptiveFactors = {
        ...context,
        historicalPerformance: historicalData,
        systemState,
        adaptationLevel: 'high'
      };
      
      // 使用增强的决策因子
      const enhancedDecisionFactors = await this.enhanceDecisionFactors(adaptiveFactors);
      
      // 评估所有策略并加权计分
      const weightedEvaluations = await this.evaluateStrategiesWithWeights(enhancedDecisionFactors);
      
      // 选择最优策略
      const bestStrategy = this.selectBestWeightedStrategy(weightedEvaluations);
      
      console.log(`[RollbackStrategy] 自适应策略选择: ${bestStrategy.type} (综合评分: ${bestStrategy.weightedScore.toFixed(2)})`);
      
      return bestStrategy;
      
    } catch (error) {
      console.error('[RollbackStrategy] 自适应策略选择失败:', error);
      return await this.selectOptimalStrategy(transactionId, context);
    }
  }

  /**
   * 分析历史性能数据
   * @param {Object} context - 上下文信息
   * @returns {Object} 历史性能分析
   */
  analyzeHistoricalPerformance(context) {
    const recentExecutions = this.executionHistory
      .filter(exec => Date.now() - exec.timestamp < 24 * 60 * 60 * 1000) // 近24小时
      .slice(-100); // 最近100次执行
    
    const performanceByStrategy = {};
    
    for (const execution of recentExecutions) {
      if (!performanceByStrategy[execution.strategyType]) {
        performanceByStrategy[execution.strategyType] = {
          executions: [],
          successRate: 0,
          avgExecutionTime: 0
        };
      }
      
      performanceByStrategy[execution.strategyType].executions.push(execution);
    }
    
    // 计算每个策略的性能指标
    for (const [strategyType, data] of Object.entries(performanceByStrategy)) {
      const executions = data.executions;
      const successfulExecutions = executions.filter(e => e.success);
      
      data.successRate = executions.length > 0 ? successfulExecutions.length / executions.length : 0;
      data.avgExecutionTime = executions.length > 0 ? 
        executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length : 0;
    }
    
    return performanceByStrategy;
  }

  /**
   * 获取当前系统状态
   * @returns {Promise<Object>} 系统状态
   */
  async getCurrentSystemState() {
    // 在小程序环境中，无法直接获取系统性能数据
    // 这里返回一个模拟的系统状态
    return {
      memoryUsage: Math.random() * 100, // 内存使用率（%）
      cpuUsage: Math.random() * 100,    // CPU使用率（%）
      networkLatency: Math.random() * 200 + 50, // 网络延迟（ms）
      activeTransactions: batchRollbackService.snapshots.size, // 活跃事务数
      timestamp: Date.now()
    };
  }

  /**
   * 增强决策因子
   * @param {Object} factors - 基础决策因子
   * @returns {Promise<Object>} 增强后的决策因子
   */
  async enhanceDecisionFactors(factors) {
    return {
      ...factors,
      
      // 时间因子
      timeFactors: {
        currentHour: new Date().getHours(),
        isBusinessHours: this.isBusinessHours(),
        isPeakTime: this.isPeakTime()
      },
      
      // 负载因子
      loadFactors: {
        systemLoad: factors.systemState.cpuUsage + factors.systemState.memoryUsage,
        networkLoad: factors.systemState.networkLatency,
        transactionLoad: factors.systemState.activeTransactions
      },
      
      // 历史因子
      historicalFactors: {
        recentSuccessRate: this.calculateRecentSuccessRate(),
        trendingStrategy: this.getTrendingStrategy(),
        seasonalPattern: this.getSeasonalPattern()
      },
      
      // 业务因子
      businessFactors: {
        criticalPeriod: this.isCriticalBusinessPeriod(),
        maintenanceWindow: this.isMaintenanceWindow(),
        userActivity: factors.systemState.activeTransactions > 10 ? 'high' : 'low'
      }
    };
  }

  /**
   * 使用加权评估策略
   * @param {Object} factors - 决策因子
   * @returns {Promise<Array>} 加权评估结果
   */
  async evaluateStrategiesWithWeights(factors) {
    const evaluations = [];
    
    for (const [strategyType, strategy] of this.strategies) {
      try {
        // 验证策略适用性
        const isValid = await strategy.validator(factors);
        if (!isValid.valid) {
          continue;
        }
        
        // 估算策略性能
        const estimation = await strategy.estimator(factors);
        
        // 计算基础得分
        const baseScore = await this.calculateStrategyScore(strategyType, factors, estimation);
        
        // 计算加权得分
        const weightedScore = this.calculateWeightedScore(strategyType, factors, baseScore, estimation);
        
        evaluations.push({
          type: strategyType,
          strategy,
          baseScore,
          weightedScore,
          estimation,
          weights: this.getStrategyWeights(strategyType, factors)
        });
        
      } catch (error) {
        console.error(`[RollbackStrategy] 评估策略 ${strategyType} 失败:`, error);
      }
    }
    
    // 按加权得分排序
    return evaluations.sort((a, b) => b.weightedScore - a.weightedScore);
  }

  /**
   * 计算加权得分
   * @param {string} strategyType - 策略类型
   * @param {Object} factors - 决策因子
   * @param {number} baseScore - 基础得分
   * @param {Object} estimation - 性能估算
   * @returns {number} 加权得分
   */
  calculateWeightedScore(strategyType, factors, baseScore, estimation) {
    const weights = this.getStrategyWeights(strategyType, factors);
    let weightedScore = baseScore;
    
    // 历史性能加权
    const historicalPerf = factors.historicalPerformance[strategyType];
    if (historicalPerf) {
      const historyBonus = historicalPerf.successRate * 20; // 最多20分加分
      weightedScore += historyBonus * weights.historical;
    }
    
    // 系统状态加权
    const systemLoad = factors.loadFactors.systemLoad;
    if (systemLoad < 50) {
      weightedScore += 10 * weights.system; // 低负载加分
    } else if (systemLoad > 80) {
      weightedScore -= 15 * weights.system; // 高负载减分
    }
    
    // 时间因子加权
    if (factors.timeFactors.isBusinessHours) {
      if (strategyType === ROLLBACK_STRATEGY.IMMEDIATE) {
        weightedScore += 5 * weights.timing; // 工作时间优先快速策略
      }
    }
    
    // 业务因子加权
    if (factors.businessFactors.criticalPeriod) {
      if (strategyType === ROLLBACK_STRATEGY.PARTIAL) {
        weightedScore += 15 * weights.business; // 关键时期优先部分回滚
      }
    }
    
    return Math.max(0, Math.min(150, weightedScore));
  }

  /**
   * 获取策略权重
   * @param {string} strategyType - 策略类型
   * @param {Object} factors - 决策因子
   * @returns {Object} 权重配置
   */
  getStrategyWeights(strategyType, factors) {
    const baseWeights = {
      historical: 0.3,  // 历史性能权重
      system: 0.25,     // 系统状态权重
      timing: 0.2,      // 时间因子权重
      business: 0.25    // 业务因子权重
    };
    
    // 根据策略类型调整权重
    switch (strategyType) {
      case ROLLBACK_STRATEGY.IMMEDIATE:
        return { ...baseWeights, timing: 0.35, system: 0.35 };
      case ROLLBACK_STRATEGY.PARTIAL:
        return { ...baseWeights, business: 0.4, historical: 0.35 };
      case ROLLBACK_STRATEGY.CASCADE:
        return { ...baseWeights, system: 0.4, business: 0.35 };
      default:
        return baseWeights;
    }
  }

  /**
   * 选择最优加权策略
   * @param {Array} evaluations - 加权评估结果
   * @returns {Object} 最优策略
   */
  selectBestWeightedStrategy(evaluations) {
    if (evaluations.length === 0) {
      return {
        type: this.config.fallbackStrategy,
        weightedScore: 0,
        reason: '没有可用的策略，使用回退策略'
      };
    }
    
    const bestEvaluation = evaluations[0];
    
    return {
      type: bestEvaluation.type,
      weightedScore: bestEvaluation.weightedScore,
      baseScore: bestEvaluation.baseScore,
      strategy: bestEvaluation.strategy,
      estimation: bestEvaluation.estimation,
      weights: bestEvaluation.weights,
      reason: `加权最优策略选择：${bestEvaluation.strategy.name}`
    };
  }

  // ===== 辅助判断方法 =====

  isBusinessHours() {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 18;
  }

  isPeakTime() {
    const hour = new Date().getHours();
    return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
  }

  calculateRecentSuccessRate() {
    const recentExecutions = this.executionHistory
      .filter(exec => Date.now() - exec.timestamp < 2 * 60 * 60 * 1000) // 近2小时
      .slice(-50);
    
    if (recentExecutions.length === 0) return 0.8; // 默认值
    
    const successCount = recentExecutions.filter(exec => exec.success).length;
    return successCount / recentExecutions.length;
  }

  getTrendingStrategy() {
    const recentExecutions = this.executionHistory
      .filter(exec => Date.now() - exec.timestamp < 60 * 60 * 1000) // 近1小时
      .slice(-20);
    
    const strategyCount = {};
    recentExecutions.forEach(exec => {
      strategyCount[exec.strategyType] = (strategyCount[exec.strategyType] || 0) + 1;
    });
    
    let maxCount = 0;
    let trendingStrategy = null;
    for (const [strategy, count] of Object.entries(strategyCount)) {
      if (count > maxCount) {
        maxCount = count;
        trendingStrategy = strategy;
      }
    }
    
    return trendingStrategy || ROLLBACK_STRATEGY.IMMEDIATE;
  }

  // ===== 增强策略算法辅助方法 =====

  /**
   * 计算操作复杂度
   * @param {Object} operationRecord - 操作记录
   * @returns {number} 复杂度评分
   */
  calculateOperationComplexity(operationRecord) {
    if (!operationRecord || !operationRecord.operations) {
      return 0.5;
    }
    
    let totalComplexity = 0;
    const operations = operationRecord.operations;
    
    operations.forEach(operation => {
      let opComplexity = 0;
      
      // 操作类型复杂度
      const operationTypes = {
        'create': 0.3,
        'read': 0.1,
        'update': 0.5,
        'delete': 0.8
      };
      
      const opType = operation.expectedOperation?.action || 'update';
      opComplexity += operationTypes[opType] || 0.5;
      
      // 依赖复杂度
      if (operation.dependencies) {
        const totalDeps = (
          (operation.dependencies.upstream?.length || 0) +
          (operation.dependencies.downstream?.length || 0) +
          (operation.dependencies.external?.length || 0)
        );
        opComplexity += Math.min(totalDeps * 0.1, 0.4);
      }
      
      // 风险复杂度
      if (operation.riskAssessment) {
        opComplexity += operation.riskAssessment.operationRisk?.score || 0;
      }
      
      totalComplexity += opComplexity;
    });
    
    return Math.min(totalComplexity / operations.length, 1.0);
  }

  /**
   * 分析操作风险分布
   * @param {Object} operationRecord - 操作记录
   * @returns {Object} 风险分布分析
   */
  analyzeOperationRiskDistribution(operationRecord) {
    if (!operationRecord?.operations) {
      return { low: 0, medium: 0, high: 0, average: 0.5 };
    }
    
    const distribution = { low: 0, medium: 0, high: 0 };
    let totalRisk = 0;
    
    operationRecord.operations.forEach(operation => {
      const riskScore = operation.riskAssessment?.operationRisk?.score || 0.5;
      totalRisk += riskScore;
      
      if (riskScore < 0.3) {
        distribution.low++;
      } else if (riskScore < 0.7) {
        distribution.medium++;
      } else {
        distribution.high++;
      }
    });
    
    return {
      ...distribution,
      average: totalRisk / operationRecord.operations.length,
      highRiskRatio: distribution.high / operationRecord.operations.length
    };
  }

  /**
   * 构建操作依赖图
   * @param {Object} operationRecord - 操作记录
   * @returns {Object} 依赖图
   */
  buildOperationDependencyGraph(operationRecord) {
    if (!operationRecord?.operations) {
      return { nodes: [], edges: [], complexity: 0 };
    }
    
    const nodes = new Map();
    const edges = [];
    
    // 建立节点
    operationRecord.operations.forEach(operation => {
      nodes.set(operation.id, {
        id: operation.id,
        type: operation.expectedOperation?.action || 'unknown',
        risk: operation.riskAssessment?.operationRisk?.score || 0.5
      });
    });
    
    // 建立边
    operationRecord.operations.forEach(operation => {
      const upstream = operation.dependencies?.upstream || [];
      upstream.forEach(depId => {
        if (nodes.has(depId)) {
          edges.push({ from: depId, to: operation.id, type: 'dependency' });
        }
      });
    });
    
    // 计算图复杂度
    const complexity = this.calculateGraphComplexity(Array.from(nodes.values()), edges);
    
    return {
      nodes: Array.from(nodes.values()),
      edges,
      complexity
    };
  }

  /**
   * 计算图复杂度
   * @param {Array} nodes - 节点列表
   * @param {Array} edges - 边列表
   * @returns {number} 复杂度
   */
  calculateGraphComplexity(nodes, edges) {
    if (nodes.length === 0) return 0;
    
    // 节点数量复杂度
    const nodeComplexity = Math.min(nodes.length / 100, 0.5);
    
    // 边密度复杂度
    const maxEdges = nodes.length * (nodes.length - 1) / 2;
    const edgeDensity = maxEdges > 0 ? edges.length / maxEdges : 0;
    const edgeComplexity = edgeDensity * 0.3;
    
    // 循环复杂度
    const cycleComplexity = this.detectCycles(nodes, edges) * 0.2;
    
    return Math.min(nodeComplexity + edgeComplexity + cycleComplexity, 1.0);
  }

  /**
   * 检测循环
   * @param {Array} nodes - 节点列表
   * @param {Array} edges - 边列表
   * @returns {number} 循环数量比例
   */
  detectCycles(nodes, edges) {
    // 简化的循环检测算法
    const adjacencyList = new Map();
    
    // 构建邻接表
    nodes.forEach(node => adjacencyList.set(node.id, []));
    edges.forEach(edge => {
      if (adjacencyList.has(edge.from)) {
        adjacencyList.get(edge.from).push(edge.to);
      }
    });
    
    // 使用DFS检测循环
    const visited = new Set();
    const recursionStack = new Set();
    let cycleCount = 0;
    
    const dfs = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) cycleCount++;
        } else if (recursionStack.has(neighbor)) {
          cycleCount++;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    });
    
    return nodes.length > 0 ? cycleCount / nodes.length : 0;
  }

  /**
   * 获取活跃回滚操作数
   * @returns {number} 活跃回滚操作数
   */
  getActiveRollbackOperations() {
    // 简化实现，实际应用中需要统计真实的活跃回滚操作
    return Math.floor(Math.random() * 5);
  }

  /**
   * 获取资源利用率
   * @returns {Promise<Object>} 资源利用率
   */
  async getResourceUtilization() {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      storage: Math.random() * 100,
      network: Math.random() * 100
    };
  }

  /**
   * 测量网络延迟
   * @returns {Promise<number>} 网络延迟（毫秒）
   */
  async measureNetworkLatency() {
    // 简化实现，返回模拟延迟
    return Math.random() * 200 + 20; // 20-220ms
  }

  /**
   * 评估业务关键性
   * @param {Object} snapshot - 快照
   * @param {Object} context - 上下文
   * @returns {string} 关键性级别
   */
  assessBusinessCriticality(snapshot, context) {
    let criticalityScore = 0;
    
    // 数据量关键性
    if (snapshot.itemCount > 100) {
      criticalityScore += 0.3;
    }
    
    // 优先级关键性
    if (context.priority === 'critical') {
      criticalityScore += 0.5;
    } else if (context.priority === 'high') {
      criticalityScore += 0.3;
    }
    
    // 紧急程度关键性
    if (context.urgencyLevel === 'emergency') {
      criticalityScore += 0.4;
    } else if (context.urgencyLevel === 'urgent') {
      criticalityScore += 0.2;
    }
    
    if (criticalityScore >= 0.7) return 'critical';
    if (criticalityScore >= 0.4) return 'high';
    if (criticalityScore >= 0.2) return 'medium';
    return 'low';
  }

  /**
   * 计算用户影响级别
   * @param {Object} snapshot - 快照
   * @returns {string} 影响级别
   */
  calculateUserImpactLevel(snapshot) {
    let impactScore = 0;
    
    // 项目数量影响
    if (snapshot.itemCount > 200) {
      impactScore += 0.4;
    } else if (snapshot.itemCount > 50) {
      impactScore += 0.2;
    }
    
    // 数据大小影响
    if (snapshot.size > 10 * 1024 * 1024) { // 10MB
      impactScore += 0.3;
    }
    
    // 操作类型影响
    const hasHighImpactOps = snapshot.data?.items?.some(item => 
      ['delete', 'update'].includes(item.operationType)
    );
    if (hasHighImpactOps) {
      impactScore += 0.3;
    }
    
    if (impactScore >= 0.7) return 'high';
    if (impactScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * 评估时间敏感性
   * @param {Object} context - 上下文
   * @returns {string} 时间敏感性
   */
  evaluateTimeSensitivity(context) {
    if (context.maxRollbackTime && context.maxRollbackTime < 30000) { // 30秒
      return 'high';
    }
    
    if (context.urgencyLevel === 'emergency') {
      return 'high';
    }
    
    if (context.timeConstraints && context.timeConstraints < 300000) { // 5分钟
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 检查合规要求
   * @param {Object} snapshot - 快照
   * @returns {Array} 合规要求列表
   */
  checkComplianceRequirements(snapshot) {
    const requirements = [];
    
    // 数据保护合规
    if (snapshot.size > 5 * 1024 * 1024) { // 5MB
      requirements.push({
        type: 'data_protection',
        level: 'medium',
        description: '大量数据需要额外保护'
      });
    }
    
    // 操作审计合规
    requirements.push({
      type: 'audit_trail',
      level: 'required',
      description: '所有回滚操作需要审计记录'
    });
    
    return requirements;
  }
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 简化的季节性模式
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'weekend';
    } else if (hour < 9 || hour > 18) {
      return 'off_hours';
    } else {
      return 'business_hours';
    }
  }

  isCriticalBusinessPeriod() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 关键业务时期：工作日的上午和下午高峰期
    return dayOfWeek >= 1 && dayOfWeek <= 5 && 
           ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16));
  }

  isMaintenanceWindow() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 维护窗口：凌晨2点到5点，或周末
    return (hour >= 2 && hour <= 5) || dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * 获取策略统计信息
   * @returns {Object} 统计信息
   */
  getStrategyStats() {
    const stats = {};
    
    for (const [strategyType, strategy] of this.strategies) {
      stats[strategyType] = {
        executionCount: strategy.executionCount,
        successCount: strategy.successCount,
        successRate: strategy.executionCount > 0 ? strategy.successCount / strategy.executionCount : 0,
        averageExecutionTime: strategy.averageExecutionTime
      };
    }
    
    return stats;
  }

  /**
   * 获取执行历史
   * @param {number} limit - 限制数量
   * @returns {Array} 执行历史
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory
      .slice(-limit)
      .map(record => ({
        id: record.id,
        strategyType: record.strategyType,
        transactionId: record.transactionId,
        success: record.success,
        executionTime: record.executionTime,
        timestamp: record.timestamp
      }));
  }
}

// 导出服务实例
export default BatchRollbackStrategyService;
export const batchRollbackStrategyService = new BatchRollbackStrategyService();