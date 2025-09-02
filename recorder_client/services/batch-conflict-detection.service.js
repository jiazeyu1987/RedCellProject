/**
 * 批量时间冲突检测算法服务
 * 专门处理批量调整中的时间冲突检测和解决
 */

const { TIME_ADJUST_CONFIG } = require('../constants/time-adjust-config.js');

class BatchConflictDetectionService {
  constructor() {
    this.config = {
      // 检测参数配置
      detection: {
        maxConcurrentChecks: 50,      // 最大并发检测数量
        timeOverlapThreshold: 5,      // 时间重叠阈值(分钟)
        checkRadius: 7,               // 检查范围(天)
        includeBufferTime: true,      // 是否包含缓冲时间
        prioritizeConflicts: true     // 优先检测高优先级冲突
      },
      
      // 冲突严重程度权重
      severityWeights: {
        timeOverlap: 0.4,            // 时间重叠权重
        patientPriority: 0.3,        // 患者优先级权重
        serviceType: 0.2,            // 服务类型权重
        resourceConflict: 0.1        // 资源冲突权重
      },
      
      // 性能优化配置
      performance: {
        enableCaching: true,         // 启用缓存
        cacheExpiration: 300000,     // 缓存过期时间(毫秒)
        batchSize: 20,              // 批处理大小
        enableProgressCallback: true // 启用进度回调
      }
    };
    
    // 缓存管理
    this.cache = new Map();
    this.cacheTimers = new Map();
  }

  /**
   * 主要的批量冲突检测入口
   * @param {Array} batchItems - 批量调整项目列表
   * @param {Object} options - 检测选项
   * @returns {Promise<Object>} 冲突检测结果
   */
  async detectBatchConflicts(batchItems, options = {}) {
    const startTime = Date.now();
    const {
      progressCallback = null,
      enableCache = true,
      includeExternal = true,
      severityThreshold = 'low'
    } = options;

    try {
      console.log('[BatchConflictDetection] 开始批量冲突检测, 项目数量:', batchItems.length);
      
      // 参数验证
      if (!Array.isArray(batchItems) || batchItems.length === 0) {
        return this.createEmptyResult();
      }

      // 初始化结果对象
      const result = {
        conflicts: [],
        statistics: {
          totalItems: batchItems.length,
          internalConflicts: 0,
          externalConflicts: 0,
          highSeverityConflicts: 0,
          mediumSeverityConflicts: 0,
          lowSeverityConflicts: 0
        },
        processing: {
          startTime,
          endTime: null,
          duration: 0,
          processedItems: 0
        },
        recommendations: []
      };

      // 阶段1: 内部冲突检测
      const internalConflicts = await this.detectInternalConflicts(
        batchItems, 
        { progressCallback, phase: 'internal' }
      );
      for (let i = 0; i < internalConflicts.length; i++) {
        result.conflicts.push(internalConflicts[i]);
      }
      result.statistics.internalConflicts = internalConflicts.length;

      // 阶段2: 外部冲突检测(如果启用)
      if (includeExternal) {
        const externalConflicts = await this.detectExternalConflicts(
          batchItems,
          { progressCallback, phase: 'external' }
        );
        for (let i = 0; i < externalConflicts.length; i++) {
          result.conflicts.push(externalConflicts[i]);
        }
        result.statistics.externalConflicts = externalConflicts.length;
      }

      // 阶段3: 冲突分析和分类
      await this.analyzeConflictSeverity(result.conflicts);
      this.updateConflictStatistics(result);

      // 阶段4: 生成解决建议
      result.recommendations = await this.generateResolutionRecommendations(result.conflicts);

      // 完成处理
      result.processing.endTime = Date.now();
      result.processing.duration = result.processing.endTime - startTime;
      result.processing.processedItems = batchItems.length;

      console.log('[BatchConflictDetection] 冲突检测完成, 耗时:', result.processing.duration, 'ms');
      return result;

    } catch (error) {
      console.error('[BatchConflictDetection] 冲突检测失败:', error);
      throw new Error(`批量冲突检测失败: ${error.message}`);
    }
  }

  /**
   * 检测内部冲突(批量调整项目之间的冲突)
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 检测选项
   * @returns {Promise<Array>} 内部冲突列表
   */
  async detectInternalConflicts(batchItems, options = {}) {
    const { progressCallback = null, phase = 'internal' } = options;
    const conflicts = [];
    const totalComparisons = batchItems.length * (batchItems.length - 1) / 2;
    let processedComparisons = 0;

    console.log('[BatchConflictDetection] 开始内部冲突检测...');

    // 使用分批处理优化性能
    const batchSize = this.config.performance.batchSize;
    
    for (let i = 0; i < batchItems.length; i++) {
      for (let j = i + 1; j < batchItems.length; j++) {
        const item1 = batchItems[i];
        const item2 = batchItems[j];

        // 检查时间重叠
        const overlapResult = this.checkTimeOverlap(item1, item2);
        
        if (overlapResult.hasConflict) {
          const conflict = this.createInternalConflict(item1, item2, overlapResult);
          conflicts.push(conflict);
        }

        processedComparisons++;
        
        // 进度回调
        if (progressCallback && processedComparisons % batchSize === 0) {
          progressCallback({
            phase,
            processed: processedComparisons,
            total: totalComparisons,
            percentage: Math.round((processedComparisons / totalComparisons) * 100)
          });
        }

        // 分批处理,避免阻塞UI
        if (processedComparisons % batchSize === 0) {
          await this.delay(1);
        }
      }
    }

    console.log('[BatchConflictDetection] 内部冲突检测完成, 发现冲突:', conflicts.length);
    return conflicts;
  }

  /**
   * 检测外部冲突(与现有预约的冲突)
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 检测选项
   * @returns {Promise<Array>} 外部冲突列表
   */
  async detectExternalConflicts(batchItems, options = {}) {
    const { progressCallback = null, phase = 'external' } = options;
    const conflicts = [];
    let processedItems = 0;

    console.log('[BatchConflictDetection] 开始外部冲突检测...');

    for (const item of batchItems) {
      try {
        // 获取指定时间范围内的现有预约
        const existingSchedules = await this.getExistingSchedules(
          item.newTime, 
          this.config.detection.checkRadius
        );

        // 检查与每个现有预约的冲突
        for (const schedule of existingSchedules) {
          const overlapResult = this.checkTimeOverlap(item, schedule);
          
          if (overlapResult.hasConflict) {
            const conflict = this.createExternalConflict(item, schedule, overlapResult);
            conflicts.push(conflict);
          }
        }

        processedItems++;
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            phase,
            processed: processedItems,
            total: batchItems.length,
            percentage: Math.round((processedItems / batchItems.length) * 100)
          });
        }

        // 避免过于频繁的API调用
        if (processedItems % 5 === 0) {
          await this.delay(10);
        }

      } catch (error) {
        console.error('[BatchConflictDetection] 检测外部冲突失败:', item.scheduleId, error);
      }
    }

    console.log('[BatchConflictDetection] 外部冲突检测完成, 发现冲突:', conflicts.length);
    return conflicts;
  }

  /**
   * 检查两个时间项目是否重叠
   * @param {Object} item1 - 第一个时间项目
   * @param {Object} item2 - 第二个时间项目
   * @returns {Object} 重叠检查结果
   */
  checkTimeOverlap(item1, item2) {
    const start1 = new Date(item1.newTime || item1.startTime);
    const end1 = new Date(start1.getTime() + (item1.duration || 60) * 60000);
    
    const start2 = new Date(item2.newTime || item2.startTime);
    const end2 = new Date(start2.getTime() + (item2.duration || 60) * 60000);

    // 包含缓冲时间
    const bufferTime = this.config.detection.includeBufferTime ? 
      TIME_ADJUST_CONFIG.timeIntervals.bufferTime * 60000 : 0;

    const adjustedStart1 = new Date(start1.getTime() - bufferTime);
    const adjustedEnd1 = new Date(end1.getTime() + bufferTime);

    // 检查重叠
    const hasConflict = adjustedStart1 < end2 && adjustedEnd1 > start2;
    
    if (hasConflict) {
      // 计算重叠时间
      const overlapStart = new Date(Math.max(adjustedStart1.getTime(), start2.getTime()));
      const overlapEnd = new Date(Math.min(adjustedEnd1.getTime(), end2.getTime()));
      const overlapDuration = Math.max(0, overlapEnd.getTime() - overlapStart.getTime()) / 60000;

      return {
        hasConflict: true,
        overlapDuration,
        overlapStart,
        overlapEnd,
        overlapType: this.determineOverlapType(start1, end1, start2, end2)
      };
    }

    return { hasConflict: false };
  }

  /**
   * 创建内部冲突对象
   */
  createInternalConflict(item1, item2, overlapResult) {
    return {
      id: this.generateConflictId('internal'),
      type: 'internal',
      severity: 'medium', // 将在后续分析中更新
      scheduleId: item1.scheduleId,
      conflictWith: item2.scheduleId,
      conflictData: {
        item1: {
          scheduleId: item1.scheduleId,
          patientName: item1.patientName,
          newTime: item1.newTime,
          duration: item1.duration || 60
        },
        item2: {
          scheduleId: item2.scheduleId,
          patientName: item2.patientName,
          newTime: item2.newTime,
          duration: item2.duration || 60
        }
      },
      overlapInfo: overlapResult,
      detectedAt: new Date().toISOString(),
      resolutionSuggestions: [],
      impactScore: 0 // 将在分析阶段计算
    };
  }

  /**
   * 创建外部冲突对象
   */
  createExternalConflict(item, existingSchedule, overlapResult) {
    return {
      id: this.generateConflictId('external'),
      type: 'external',
      severity: 'medium', // 将在后续分析中更新
      scheduleId: item.scheduleId,
      conflictWith: existingSchedule.id,
      conflictData: {
        batchItem: {
          scheduleId: item.scheduleId,
          patientName: item.patientName,
          newTime: item.newTime,
          duration: item.duration || 60
        },
        existingSchedule: {
          id: existingSchedule.id,
          patientName: existingSchedule.patientName,
          startTime: existingSchedule.startTime,
          duration: existingSchedule.duration || 60
        }
      },
      overlapInfo: overlapResult,
      detectedAt: new Date().toISOString(),
      resolutionSuggestions: [],
      impactScore: 0 // 将在分析阶段计算
    };
  }

  /**
   * 分析冲突严重程度
   */
  async analyzeConflictSeverity(conflicts) {
    for (const conflict of conflicts) {
      const severityScore = this.calculateSeverityScore(conflict);
      conflict.severity = this.getSeverityLevel(severityScore);
      conflict.impactScore = severityScore;
    }
  }

  /**
   * 计算冲突严重程度分数
   */
  calculateSeverityScore(conflict) {
    let score = 0;
    const weights = this.config.severityWeights;

    // 时间重叠因子
    const overlapFactor = Math.min(
      conflict.overlapInfo.overlapDuration / 60, 
      1
    ) * weights.timeOverlap * 100;
    score += overlapFactor;

    // 患者优先级因子
    const priorityFactor = this.getPatientPriorityScore(conflict) * weights.patientPriority * 100;
    score += priorityFactor;

    // 服务类型因子
    const serviceTypeFactor = this.getServiceTypeScore(conflict) * weights.serviceType * 100;
    score += serviceTypeFactor;

    // 资源冲突因子
    const resourceFactor = this.getResourceConflictScore(conflict) * weights.resourceConflict * 100;
    score += resourceFactor;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 获取严重程度等级
   */
  getSeverityLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * 生成解决方案建议
   */
  async generateResolutionRecommendations(conflicts) {
    const recommendations = [];

    // 按严重程度分组
    const groupedConflicts = this.groupConflictsBySeverity(conflicts);

    // 为每个严重程度级别生成建议
    for (const [severity, conflictList] of Object.entries(groupedConflicts)) {
      if (conflictList.length > 0) {
        const recommendation = await this.generateSeverityBasedRecommendation(severity, conflictList);
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  // 辅助方法
  createEmptyResult() {
    return {
      conflicts: [],
      statistics: {
        totalItems: 0,
        internalConflicts: 0,
        externalConflicts: 0,
        highSeverityConflicts: 0,
        mediumSeverityConflicts: 0,
        lowSeverityConflicts: 0
      },
      processing: {
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        processedItems: 0
      },
      recommendations: []
    };
  }

  generateConflictId(type) {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 占位方法,需要根据实际业务逻辑实现
  async getExistingSchedules(time, radiusDays) {
    // 模拟API调用
    return [];
  }

  determineOverlapType(start1, end1, start2, end2) {
    if (start1 <= start2 && end1 >= end2) return 'contains';
    if (start2 <= start1 && end2 >= end1) return 'contained';
    if (start1 < start2 && end1 < end2) return 'partial_end';
    if (start1 > start2 && end1 > end2) return 'partial_start';
    return 'unknown';
  }

  getPatientPriorityScore(conflict) {
    // 根据患者优先级返回分数 0-1
    return 0.5; // 占位实现
  }

  getServiceTypeScore(conflict) {
    // 根据服务类型返回分数 0-1
    return 0.5; // 占位实现
  }

  getResourceConflictScore(conflict) {
    // 根据资源冲突返回分数 0-1
    return 0.3; // 占位实现
  }

  groupConflictsBySeverity(conflicts) {
    return conflicts.reduce((groups, conflict) => {
      const severity = conflict.severity || 'medium';
      if (!groups[severity]) groups[severity] = [];
      groups[severity].push(conflict);
      return groups;
    }, {});
  }

  async generateSeverityBasedRecommendation(severity, conflicts) {
    return {
      severity,
      conflictCount: conflicts.length,
      strategy: severity === 'critical' ? 'manual' : 'auto',
      description: `${severity}级别冲突处理建议`,
      actions: []
    };
  }

  updateConflictStatistics(result) {
    result.conflicts.forEach(conflict => {
      switch (conflict.severity) {
        case 'critical':
        case 'high':
          result.statistics.highSeverityConflicts++;
          break;
        case 'medium':
          result.statistics.mediumSeverityConflicts++;
          break;
        case 'low':
          result.statistics.lowSeverityConflicts++;
          break;
      }
    });
  }
}

module.exports = BatchConflictDetectionService;