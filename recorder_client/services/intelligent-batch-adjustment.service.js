/**
 * 智能批量调整推荐算法服务
 * 为批量时间调整提供智能推荐和优化算法
 */

import { TIME_ADJUST_CONFIG } from '../constants/time-adjust-config.js';

class IntelligentBatchAdjustmentService {
  constructor() {
    this.config = {
      // 距离计算配置
      distance: {
        maxDistance: 50,              // 最大有效距离(km)
        travelSpeedKmh: 40,          // 平均行驶速度(km/h)
        bufferTimeMinutes: 15,       // 路程缓冲时间(分钟)
        prioritizeNearby: true       // 优先考虑就近安排
      },
      
      // 优先级权重配置
      priority: {
        patientUrgency: 0.4,         // 患者紧急程度权重
        serviceImportance: 0.3,      // 服务重要性权重
        historicalPreference: 0.2,   // 历史偏好权重
        timeFlexibility: 0.1         // 时间灵活性权重
      },
      
      // 负载均衡配置
      loadBalance: {
        maxDailyHours: 8,            // 每日最大工作小时
        optimalDailyHours: 6,        // 每日最佳工作小时
        breakIntervalMinutes: 30,    // 最小休息间隔
        maxConsecutiveHours: 4       // 最大连续工作小时
      },
      
      // 算法优化配置
      optimization: {
        maxIterations: 100,          // 最大优化迭代次数
        convergenceThreshold: 0.01,  // 收敛阈值
        randomSeed: 42,              // 随机种子
        enableParallelProcessing: true // 启用并行处理
      }
    };
    
    // 算法状态
    this.algorithmState = {
      isRunning: false,
      currentIteration: 0,
      bestSolution: null,
      bestScore: 0
    };
    
    // 历史数据缓存
    this.historicalDataCache = new Map();
    this.distanceCache = new Map();
  }

  /**
   * 智能批量调整推荐主入口
   * @param {Array} batchItems - 批量调整项目列表
   * @param {Object} options - 调整选项
   * @returns {Promise<Object>} 推荐方案
   */
  async generateIntelligentRecommendations(batchItems, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('[IntelligentBatchAdjustment] 开始智能推荐算法, 项目数量:', batchItems.length);
      
      // 参数验证
      if (!Array.isArray(batchItems) || batchItems.length === 0) {
        return this.createEmptyRecommendation();
      }

      // 设置算法状态
      this.algorithmState.isRunning = true;
      this.algorithmState.currentIteration = 0;
      this.algorithmState.bestSolution = null;
      this.algorithmState.bestScore = 0;

      // 初始化推荐结果对象
      const recommendation = {
        solutions: [],
        analytics: {
          totalItems: batchItems.length,
          processingTime: 0,
          algorithmMetrics: {}
        },
        strategies: {
          distanceBased: null,
          priorityBased: null,
          historicalBased: null,
          dynamicTime: null,
          loadBalance: null
        }
      };

      // 执行各种推荐算法
      await this.runRecommendationAlgorithms(batchItems, recommendation, options);

      // 生成综合最优方案
      const optimalSolution = await this.generateOptimalSolution(recommendation.strategies);
      recommendation.solutions.push(optimalSolution);

      // 完成处理
      this.algorithmState.isRunning = false;
      recommendation.analytics.processingTime = Date.now() - startTime;
      
      console.log('[IntelligentBatchAdjustment] 智能推荐完成, 耗时:', recommendation.analytics.processingTime, 'ms');
      return recommendation;

    } catch (error) {
      this.algorithmState.isRunning = false;
      console.error('[IntelligentBatchAdjustment] 智能推荐失败:', error);
      throw new Error(`智能批量调整推荐失败: ${error.message}`);
    }
  }

  /**
   * 执行各种推荐算法
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} recommendation - 推荐结果对象
   * @param {Object} options - 选项
   */
  async runRecommendationAlgorithms(batchItems, recommendation, options) {
    const algorithms = [
      { name: 'distanceBased', method: this.calculateDistanceBasedSorting },
      { name: 'priorityBased', method: this.calculatePriorityBasedStrategy },
      { name: 'historicalBased', method: this.calculateHistoricalPreferenceRecommendation },
      { name: 'dynamicTime', method: this.calculateDynamicTimeAllocation },
      { name: 'loadBalance', method: this.calculateLoadBalanceAdjustment }
    ];

    // 并行执行所有算法
    const algorithmPromises = algorithms.map(async (algo) => {
      try {
        const result = await algo.method.call(this, batchItems, options);
        recommendation.strategies[algo.name] = result;
        console.log(`[IntelligentBatchAdjustment] ${algo.name} 算法完成`);
      } catch (error) {
        console.error(`[IntelligentBatchAdjustment] ${algo.name} 算法失败:`, error);
        recommendation.strategies[algo.name] = null;
      }
    });

    await Promise.all(algorithmPromises);
  }

  /**
   * 5.2.1.2.1 基于距离的智能排序算法
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 距离优化方案
   */
  async calculateDistanceBasedSorting(batchItems, options = {}) {
    console.log('[DistanceBasedSorting] 开始基于距离的智能排序...');
    
    try {
      // 构建距离矩阵
      const distanceMatrix = await this.buildDistanceMatrix(batchItems);
      
      // 计算最优路径
      const optimalRoute = await this.calculateOptimalRoute(batchItems, distanceMatrix);
      
      // 生成时间安排
      const timeSchedule = await this.generateTimeScheduleFromRoute(optimalRoute, distanceMatrix);
      
      return {
        type: 'distance_based',
        score: this.calculateRouteScore(optimalRoute, distanceMatrix),
        adjustments: timeSchedule,
        metrics: {
          totalDistance: this.calculateTotalDistance(optimalRoute, distanceMatrix),
          travelTime: this.calculateTotalTravelTime(optimalRoute, distanceMatrix),
          efficiency: this.calculateRouteEfficiency(optimalRoute, distanceMatrix)
        },
        description: '基于地理位置距离优化的服务路线，最小化交通时间和距离'
      };
      
    } catch (error) {
      console.error('[DistanceBasedSorting] 算法执行失败:', error);
      throw error;
    }
  }

  /**
   * 5.2.1.2.2 基于优先级的调整策略
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 优先级优化方案
   */
  async calculatePriorityBasedStrategy(batchItems, options = {}) {
    console.log('[PriorityBasedStrategy] 开始基于优先级的调整策略...');
    
    try {
      // 计算每个项目的综合优先级分数
      const priorityScores = await this.calculatePriorityScores(batchItems);
      
      // 按优先级排序
      const sortedItems = this.sortByPriority(batchItems, priorityScores);
      
      // 分配最优时间段
      const prioritySchedule = await this.allocateOptimalTimeSlots(sortedItems, priorityScores);
      
      return {
        type: 'priority_based',
        score: this.calculatePriorityScore(prioritySchedule),
        adjustments: prioritySchedule,
        metrics: {
          highPriorityFirst: this.countHighPriorityFirst(prioritySchedule),
          priorityDistribution: this.analyzePriorityDistribution(prioritySchedule),
          urgencyHandling: this.analyzeUrgencyHandling(prioritySchedule)
        },
        description: '基于患者优先级和服务重要性的智能调整策略'
      };
      
    } catch (error) {
      console.error('[PriorityBasedStrategy] 算法执行失败:', error);
      throw error;
    }
  }

  /**
   * 5.2.1.2.3 基于历史偏好的推荐算法
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 历史偏好优化方案
   */
  async calculateHistoricalPreferenceRecommendation(batchItems, options = {}) {
    console.log('[HistoricalPreference] 开始基于历史偏好的推荐算法...');
    
    try {
      // 获取历史调整数据
      const historicalData = await this.getHistoricalAdjustmentData(batchItems);
      
      // 分析历史偏好模式
      const preferencePatterns = await this.analyzeHistoricalPatterns(historicalData);
      
      // 基于历史偏好生成推荐
      const historicalSchedule = await this.generateHistoricalBasedSchedule(batchItems, preferencePatterns);
      
      return {
        type: 'historical_based',
        score: this.calculateHistoricalScore(historicalSchedule, preferencePatterns),
        adjustments: historicalSchedule,
        metrics: {
          patternMatchRate: this.calculatePatternMatchRate(historicalSchedule, preferencePatterns),
          learningAccuracy: this.calculateLearningAccuracy(preferencePatterns),
          adaptationScore: this.calculateAdaptationScore(historicalSchedule)
        },
        description: '基于历史调整数据学习的个性化推荐方案'
      };
      
    } catch (error) {
      console.error('[HistoricalPreference] 算法执行失败:', error);
      throw error;
    }
  }

  /**
   * 5.2.1.2.4 动态时间分配算法
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 动态时间分配方案
   */
  async calculateDynamicTimeAllocation(batchItems, options = {}) {
    console.log('[DynamicTimeAllocation] 开始动态时间分配算法...');
    
    try {
      // 分析服务时长需求
      const serviceDurations = await this.analyzeServiceDurations(batchItems);
      
      // 计算动态缓冲时间
      const bufferTimes = await this.calculateDynamicBufferTimes(batchItems, serviceDurations);
      
      // 生成动态时间分配
      const dynamicSchedule = await this.generateDynamicTimeSchedule(batchItems, serviceDurations, bufferTimes);
      
      return {
        type: 'dynamic_time',
        score: this.calculateTimeEfficiencyScore(dynamicSchedule),
        adjustments: dynamicSchedule,
        metrics: {
          timeUtilization: this.calculateTimeUtilization(dynamicSchedule),
          bufferOptimization: this.calculateBufferOptimization(bufferTimes),
          flexibilityScore: this.calculateFlexibilityScore(dynamicSchedule)
        },
        description: '基于服务时长和缓冲时间的动态智能分配方案'
      };
      
    } catch (error) {
      console.error('[DynamicTimeAllocation] 算法执行失败:', error);
      throw error;
    }
  }

  /**
   * 5.2.1.2.5 负载均衡调整算法
   * @param {Array} batchItems - 批量调整项目
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 负载均衡方案
   */
  async calculateLoadBalanceAdjustment(batchItems, options = {}) {
    console.log('[LoadBalanceAdjustment] 开始负载均衡调整算法...');
    
    try {
      // 分析当前工作负荷分布
      const currentLoadDistribution = await this.analyzeCurrentWorkloadDistribution(batchItems);
      
      // 计算理想负荷分配
      const idealLoadDistribution = await this.calculateIdealLoadDistribution(batchItems);
      
      // 生成负载均衡调整方案
      const balancedSchedule = await this.generateLoadBalancedSchedule(batchItems, currentLoadDistribution, idealLoadDistribution);
      
      return {
        type: 'load_balance',
        score: this.calculateLoadBalanceScore(balancedSchedule),
        adjustments: balancedSchedule,
        metrics: {
          workloadVariance: this.calculateWorkloadVariance(balancedSchedule),
          dailyBalance: this.analyzeDailyLoadBalance(balancedSchedule),
          overloadPrevention: this.analyzeOverloadPrevention(balancedSchedule)
        },
        description: '平衡每日工作负荷，优化工作效率和健康度'
      };
      
    } catch (error) {
      console.error('[LoadBalanceAdjustment] 算法执行失败:', error);
      throw error;
    }
  }

  // ===== 距离算法辅助方法 =====
  
  /**
   * 构建距离矩阵
   */
  async buildDistanceMatrix(batchItems) {
    const matrix = {};
    
    for (let i = 0; i < batchItems.length; i++) {
      matrix[i] = {};
      for (let j = 0; j < batchItems.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const distance = await this.calculateDistance(
            batchItems[i].address,
            batchItems[j].address
          );
          matrix[i][j] = distance;
        }
      }
    }
    
    return matrix;
  }

  /**
   * 计算两地之间的距离
   */
  async calculateDistance(address1, address2) {
    const cacheKey = `${address1}-${address2}`;
    
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey);
    }
    
    // 模拟距离计算 (实际实现需要调用地图API)
    const distance = Math.random() * this.config.distance.maxDistance;
    
    this.distanceCache.set(cacheKey, distance);
    return distance;
  }

  /**
   * 使用贪心算法计算最优路径
   */
  async calculateOptimalRoute(batchItems, distanceMatrix) {
    const itemCount = batchItems.length;
    if (itemCount <= 1) return batchItems.map((_, index) => index);
    
    const visited = new Set();
    const route = [];
    let currentIndex = 0; // 从第一个点开始
    
    route.push(currentIndex);
    visited.add(currentIndex);
    
    while (visited.size < itemCount) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      
      for (let i = 0; i < itemCount; i++) {
        if (!visited.has(i) && distanceMatrix[currentIndex][i] < nearestDistance) {
          nearestDistance = distanceMatrix[currentIndex][i];
          nearestIndex = i;
        }
      }
      
      if (nearestIndex !== -1) {
        route.push(nearestIndex);
        visited.add(nearestIndex);
        currentIndex = nearestIndex;
      }
    }
    
    return route;
  }

  // ===== 优先级算法辅助方法 =====
  
  /**
   * 计算综合优先级分数
   */
  async calculatePriorityScores(batchItems) {
    const scores = {};
    
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      const urgencyScore = this.calculateUrgencyScore(item);
      const importanceScore = this.calculateImportanceScore(item);
      const flexibilityScore = this.calculateFlexibilityScore(item);
      
      scores[i] = {
        urgency: urgencyScore,
        importance: importanceScore,
        flexibility: flexibilityScore,
        total: urgencyScore * this.config.priority.patientUrgency +
               importanceScore * this.config.priority.serviceImportance +
               flexibilityScore * this.config.priority.timeFlexibility
      };
    }
    
    return scores;
  }

  /**
   * 计算紧急程度分数
   */
  calculateUrgencyScore(item) {
    // 基于患者状态、服务类型等计算紧急程度
    const factors = {
      patientCondition: item.patientCondition || 'stable',
      serviceType: item.serviceType || 'routine',
      timeConstraint: item.timeConstraint || 'flexible'
    };
    
    let score = 0.5; // 基础分数
    
    if (factors.patientCondition === 'critical') score += 0.4;
    else if (factors.patientCondition === 'urgent') score += 0.2;
    
    if (factors.serviceType === 'emergency') score += 0.3;
    else if (factors.serviceType === 'priority') score += 0.15;
    
    if (factors.timeConstraint === 'strict') score += 0.2;
    else if (factors.timeConstraint === 'preferred') score += 0.1;
    
    return Math.min(score, 1.0);
  }

  // ===== 通用辅助方法 =====
  
  /**
   * 创建空推荐结果
   */
  createEmptyRecommendation() {
    return {
      solutions: [],
      analytics: {
        totalItems: 0,
        processingTime: 0,
        algorithmMetrics: {}
      },
      strategies: {
        distanceBased: null,
        priorityBased: null,
        historicalBased: null,
        dynamicTime: null,
        loadBalance: null
      }
    };
  }

  /**
   * 生成综合最优方案
   */
  async generateOptimalSolution(strategies) {
    const validStrategies = Object.values(strategies).filter(s => s !== null);
    
    if (validStrategies.length === 0) {
      return {
        type: 'empty',
        score: 0,
        adjustments: [],
        description: '无法生成推荐方案'
      };
    }
    
    // 简单实现：选择得分最高的策略
    const bestStrategy = validStrategies.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return {
      type: 'optimal_combined',
      score: bestStrategy.score,
      adjustments: bestStrategy.adjustments,
      description: `综合最优方案 - 基于${bestStrategy.type}策略`,
      baseStrategy: bestStrategy.type
    };
  }

  // ===== 距离算法完整实现 =====
  
  /**
   * 从路径生成时间安排
   */
  async generateTimeScheduleFromRoute(route, distanceMatrix) {
    const schedule = [];
    let currentTime = new Date();
    
    for (let i = 0; i < route.length; i++) {
      const routeIndex = route[i];
      
      // 如果不是第一个点，计算行程时间
      if (i > 0) {
        const prevIndex = route[i - 1];
        const distance = distanceMatrix[prevIndex][routeIndex];
        const travelTimeMinutes = (distance / this.config.distance.travelSpeedKmh) * 60;
        const bufferTime = this.config.distance.bufferTimeMinutes;
        
        currentTime = new Date(currentTime.getTime() + (travelTimeMinutes + bufferTime) * 60000);
      }
      
      schedule.push({
        itemIndex: routeIndex,
        scheduledTime: new Date(currentTime),
        travelTime: i > 0 ? (distanceMatrix[route[i-1]][routeIndex] / this.config.distance.travelSpeedKmh) * 60 : 0,
        bufferTime: this.config.distance.bufferTimeMinutes
      });
      
      // 假设每个服务需要1小时
      currentTime = new Date(currentTime.getTime() + 60 * 60000);
    }
    
    return schedule;
  }

  /**
   * 计算路径得分
   */
  calculateRouteScore(route, distanceMatrix) {
    const totalDistance = this.calculateTotalDistance(route, distanceMatrix);
    const efficiency = this.calculateRouteEfficiency(route, distanceMatrix);
    
    // 距离越短得分越高，效率越高得分越高
    const distanceScore = Math.max(0, 1 - (totalDistance / (this.config.distance.maxDistance * route.length)));
    
    return (distanceScore * 0.6) + (efficiency * 0.4);
  }

  /**
   * 计算总距离
   */
  calculateTotalDistance(route, distanceMatrix) {
    let totalDistance = 0;
    
    for (let i = 1; i < route.length; i++) {
      totalDistance += distanceMatrix[route[i-1]][route[i]];
    }
    
    return totalDistance;
  }

  /**
   * 计算总行程时间
   */
  calculateTotalTravelTime(route, distanceMatrix) {
    const totalDistance = this.calculateTotalDistance(route, distanceMatrix);
    return (totalDistance / this.config.distance.travelSpeedKmh) * 60; // 分钟
  }

  /**
   * 计算路径效率
   */
  calculateRouteEfficiency(route, distanceMatrix) {
    if (route.length <= 1) return 1.0;
    
    const actualDistance = this.calculateTotalDistance(route, distanceMatrix);
    
    // 计算直线距离作为理论最优距离
    let theoreticalOptimalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      theoreticalOptimalDistance += distanceMatrix[route[0]][route[i]];
    }
    
    return theoreticalOptimalDistance / actualDistance;
  }
  
  // ===== 优先级算法完整实现 =====
  
  /**
   * 按优先级排序
   */
  sortByPriority(items, scores) {
    return items
      .map((item, index) => ({ item, index, score: scores[index] }))
      .sort((a, b) => b.score.total - a.score.total)
      .map(entry => entry.item);
  }

  /**
   * 分配最优时间段
   */
  async allocateOptimalTimeSlots(items, scores) {
    const schedule = [];
    const workingHours = { start: 8, end: 18 }; // 8:00-18:00工作时间
    let currentTime = new Date();
    currentTime.setHours(workingHours.start, 0, 0, 0);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const score = scores[i];
      
      // 高优先级项目安排在较早时间
      const priorityTimeAdjustment = (1 - score.total) * 240; // 最多延后4小时
      const scheduledTime = new Date(currentTime.getTime() + priorityTimeAdjustment * 60000);
      
      schedule.push({
        itemIndex: i,
        originalItem: item,
        scheduledTime,
        priorityScore: score.total,
        timeSlotOptimal: score.total > 0.8 // 高优先级获得最优时间段
      });
      
      // 为下一个项目预留时间
      currentTime = new Date(scheduledTime.getTime() + 90 * 60000); // 90分钟间隔
    }
    
    return schedule;
  }

  /**
   * 计算优先级方案得分
   */
  calculatePriorityScore(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    let totalScore = 0;
    let highPriorityInOptimalSlots = 0;
    
    schedule.forEach((item, index) => {
      const priorityScore = item.priorityScore || 0.5;
      const positionPenalty = index * 0.02; // 越靠后位置得分越低
      const slotBonus = item.timeSlotOptimal ? 0.1 : 0;
      
      totalScore += priorityScore - positionPenalty + slotBonus;
      
      if (priorityScore > 0.8 && item.timeSlotOptimal) {
        highPriorityInOptimalSlots++;
      }
    });
    
    return Math.min(totalScore / schedule.length, 1.0);
  }

  /**
   * 统计高优先级项目优先安排数量
   */
  countHighPriorityFirst(schedule) {
    let count = 0;
    
    for (let i = 0; i < Math.min(schedule.length, 5); i++) {
      if (schedule[i].priorityScore > 0.8) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 分析优先级分布
   */
  analyzePriorityDistribution(schedule) {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    schedule.forEach(item => {
      const score = item.priorityScore || 0.5;
      if (score > 0.8) distribution.high++;
      else if (score > 0.5) distribution.medium++;
      else distribution.low++;
    });
    
    return {
      distribution,
      balance: this.calculateDistributionBalance(distribution),
      highPriorityRatio: distribution.high / schedule.length
    };
  }

  /**
   * 分析紧急情况处理
   */
  analyzeUrgencyHandling(schedule) {
    const urgentItems = schedule.filter(item => item.priorityScore > 0.9);
    const earlySlots = schedule.slice(0, Math.ceil(schedule.length * 0.3));
    const urgentInEarlySlots = urgentItems.filter(urgent => 
      earlySlots.some(early => early.itemIndex === urgent.itemIndex)
    );
    
    return {
      totalUrgent: urgentItems.length,
      urgentInEarlySlots: urgentInEarlySlots.length,
      urgencyHandlingRate: urgentItems.length > 0 ? urgentInEarlySlots.length / urgentItems.length : 1,
      averageUrgentPosition: this.calculateAveragePosition(urgentItems, schedule)
    };
  }
  
  // ===== 历史偏好算法完整实现 =====
  
  /**
   * 获取历史调整数据
   */
  async getHistoricalAdjustmentData(items) {
    // 模拟历史数据获取
    const mockHistoricalData = [];
    
    for (let i = 0; i < Math.min(items.length * 3, 50); i++) {
      mockHistoricalData.push({
        patientId: `patient_${Math.floor(Math.random() * 20)}`,
        serviceType: ['routine', 'priority', 'emergency'][Math.floor(Math.random() * 3)],
        originalTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        adjustedTime: new Date(),
        adjustmentReason: ['traffic', 'patient_request', 'emergency', 'optimization'][Math.floor(Math.random() * 4)],
        satisfactionScore: 0.6 + Math.random() * 0.4,
        timeSlot: Math.floor(Math.random() * 10) + 8 // 8-18点
      });
    }
    
    return mockHistoricalData;
  }

  /**
   * 分析历史偏好模式
   */
  async analyzeHistoricalPatterns(historicalData) {
    const patterns = {
      timeSlotPreferences: {},
      serviceTypePatterns: {},
      adjustmentReasons: {},
      satisfactionCorrelations: {}
    };
    
    // 分析时间段偏好
    historicalData.forEach(record => {
      const hour = record.adjustedTime.getHours();
      const timeSlot = this.getTimeSlotCategory(hour);
      
      if (!patterns.timeSlotPreferences[timeSlot]) {
        patterns.timeSlotPreferences[timeSlot] = { count: 0, totalSatisfaction: 0 };
      }
      
      patterns.timeSlotPreferences[timeSlot].count++;
      patterns.timeSlotPreferences[timeSlot].totalSatisfaction += record.satisfactionScore;
    });
    
    // 计算平均满意度
    Object.keys(patterns.timeSlotPreferences).forEach(slot => {
      const data = patterns.timeSlotPreferences[slot];
      data.averageSatisfaction = data.totalSatisfaction / data.count;
    });
    
    // 分析服务类型模式
    historicalData.forEach(record => {
      if (!patterns.serviceTypePatterns[record.serviceType]) {
        patterns.serviceTypePatterns[record.serviceType] = {
          count: 0,
          preferredTimeSlots: {},
          averageSatisfaction: 0
        };
      }
      
      const pattern = patterns.serviceTypePatterns[record.serviceType];
      pattern.count++;
      
      const timeSlot = this.getTimeSlotCategory(record.adjustedTime.getHours());
      pattern.preferredTimeSlots[timeSlot] = (pattern.preferredTimeSlots[timeSlot] || 0) + 1;
    });
    
    return patterns;
  }

  /**
   * 基于历史偏好生成安排
   */
  async generateHistoricalBasedSchedule(items, patterns) {
    const schedule = [];
    
    items.forEach((item, index) => {
      const serviceType = item.serviceType || 'routine';
      const typePattern = patterns.serviceTypePatterns[serviceType];
      
      // 根据历史偏好选择最佳时间段
      let bestTimeSlot = 'morning'; // 默认
      if (typePattern && typePattern.preferredTimeSlots) {
        bestTimeSlot = Object.keys(typePattern.preferredTimeSlots).reduce((best, current) => 
          typePattern.preferredTimeSlots[current] > typePattern.preferredTimeSlots[best] ? current : best
        );
      }
      
      const scheduledTime = this.generateTimeFromSlot(bestTimeSlot, index);
      
      schedule.push({
        itemIndex: index,
        originalItem: item,
        scheduledTime,
        recommendedTimeSlot: bestTimeSlot,
        confidenceScore: this.calculateHistoricalConfidence(patterns, item),
        basedOnPattern: serviceType
      });
    });
    
    return schedule;
  }

  /**
   * 计算历史方案得分
   */
  calculateHistoricalScore(schedule, patterns) {
    if (!schedule || schedule.length === 0) return 0;
    
    let totalScore = 0;
    
    schedule.forEach(item => {
      totalScore += item.confidenceScore || 0.5;
    });
    
    return totalScore / schedule.length;
  }

  /**
   * 计算模式匹配率
   */
  calculatePatternMatchRate(schedule, patterns) {
    if (!schedule || schedule.length === 0) return 0;
    
    let matchedItems = 0;
    
    schedule.forEach(item => {
      const serviceType = item.basedOnPattern;
      const typePattern = patterns.serviceTypePatterns[serviceType];
      
      if (typePattern && typePattern.count >= 3) {
        matchedItems++;
      }
    });
    
    return matchedItems / schedule.length;
  }

  /**
   * 计算学习算法准确性
   */
  calculateLearningAccuracy(patterns) {
    const totalPatterns = Object.keys(patterns.serviceTypePatterns).length;
    const reliablePatterns = Object.values(patterns.serviceTypePatterns)
      .filter(pattern => pattern.count >= 5).length;
    
    return totalPatterns > 0 ? reliablePatterns / totalPatterns : 0.5;
  }

  /**
   * 计算适应性分数
   */
  calculateAdaptationScore(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    const avgConfidence = schedule.reduce((sum, item) => 
      sum + (item.confidenceScore || 0.5), 0) / schedule.length;
    
    return Math.min(avgConfidence + 0.1, 1.0); // 适应性奖励
  }
  
  // ===== 辅助方法实现 =====
  
  /**
   * 获取时间段分类
   */
  getTimeSlotCategory(hour) {
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 18) return 'afternoon';
    return 'evening';
  }
  
  /**
   * 根据时间段生成时间
   */
  generateTimeFromSlot(timeSlot, offset) {
    const today = new Date();
    let hour = 9; // 默认9点
    
    switch (timeSlot) {
      case 'morning': hour = 9 + (offset % 3); break;
      case 'lunch': hour = 12 + (offset % 2); break;
      case 'afternoon': hour = 14 + (offset % 4); break;
      case 'evening': hour = 18; break;
    }
    
    today.setHours(hour, 0, 0, 0);
    return today;
  }
  
  /**
   * 计算历史置信度
   */
  calculateHistoricalConfidence(patterns, item) {
    const serviceType = item.serviceType || 'routine';
    const typePattern = patterns.serviceTypePatterns[serviceType];
    
    if (!typePattern || typePattern.count < 3) {
      return 0.5; // 低置信度
    }
    
    // 基于历史数据数量和满意度计算置信度
    const dataReliability = Math.min(typePattern.count / 10, 1); // 10个数据点为满分
    const satisfactionWeight = typePattern.averageSatisfaction || 0.7;
    
    return dataReliability * satisfactionWeight;
  }
  
  /**
   * 计算分布均衡性
   */
  calculateDistributionBalance(distribution) {
    const total = distribution.high + distribution.medium + distribution.low;
    if (total === 0) return 1;
    
    // 理想分布：30%高优先级，50%中优先级，20%低优先级
    const ideal = { high: 0.3, medium: 0.5, low: 0.2 };
    const actual = {
      high: distribution.high / total,
      medium: distribution.medium / total,
      low: distribution.low / total
    };
    
    const deviation = Math.abs(actual.high - ideal.high) + 
                     Math.abs(actual.medium - ideal.medium) + 
                     Math.abs(actual.low - ideal.low);
    
    return 1 - (deviation / 2); // 归一化到0-1
  }
  
  /**
   * 计算平均位置
   */
  calculateAveragePosition(targetItems, allSchedule) {
    if (targetItems.length === 0) return 0;
    
    let totalPosition = 0;
    targetItems.forEach(item => {
      const position = allSchedule.findIndex(scheduleItem => 
        scheduleItem.itemIndex === item.itemIndex
      );
      totalPosition += position;
    });
    
    return totalPosition / targetItems.length;
  }
  
  // ===== 动态时间分配和负载均衡算法实现 =====
  
  /**
   * 分析服务时长需求
   */
  async analyzeServiceDurations(items) {
    const durations = {};
    
    items.forEach((item, index) => {
      const serviceType = item.serviceType || 'routine';
      let baseDuration = 60; // 基础时间60分钟
      
      // 根据服务类型调整时长
      switch (serviceType) {
        case 'emergency': baseDuration = 90; break;
        case 'priority': baseDuration = 75; break;
        case 'routine': baseDuration = 60; break;
        case 'maintenance': baseDuration = 45; break;
        default: baseDuration = 60;
      }
      
      // 添加随机变化模拟实际情况
      const variation = baseDuration * 0.3 * Math.random();
      
      durations[index] = {
        estimated: baseDuration + variation,
        confidence: 0.7 + Math.random() * 0.25, // 0.7-0.95的置信度
        serviceType: serviceType
      };
    });
    
    return durations;
  }

  /**
   * 计算动态缓冲时间
   */
  async calculateDynamicBufferTimes(items, durations) {
    const buffers = {};
    
    items.forEach((item, index) => {
      const duration = durations[index];
      const serviceType = duration.serviceType;
      
      // 基础缓冲时间计算
      let baseBuffer = 15; // 最小15分钟
      
      // 根据服务类型调整缓冲时间
      switch (serviceType) {
        case 'emergency': baseBuffer = 30; break;
        case 'priority': baseBuffer = 25; break;
        case 'routine': baseBuffer = 20; break;
        case 'maintenance': baseBuffer = 15; break;
      }
      
      // 根据服务时长调整缓冲时间（时间越长需要更多缓冲）
      const durationBuffer = duration.estimated * 0.15;
      
      // 置信度越低需要更多缓冲时间
      const confidenceAdjustment = (1 - duration.confidence) * 20;
      
      buffers[index] = Math.max(baseBuffer, durationBuffer + confidenceAdjustment);
    });
    
    return buffers;
  }

  /**
   * 生成动态时间安排
   */
  async generateDynamicTimeSchedule(items, durations, buffers) {
    const schedule = [];
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0); // 从上匈8点开始
    
    items.forEach((item, index) => {
      const duration = durations[index];
      const buffer = buffers[index];
      
      // 检查是否超过工作时间（下午6点）
      const scheduledEndTime = new Date(currentTime.getTime() + (duration.estimated + buffer) * 60000);
      if (scheduledEndTime.getHours() >= 18) {
        // 如果超过工作时间，调整到第二天
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(8, 0, 0, 0);
      }
      
      schedule.push({
        itemIndex: index,
        originalItem: item,
        scheduledTime: new Date(currentTime),
        duration: duration.estimated,
        bufferTime: buffer,
        confidence: duration.confidence,
        endTime: new Date(currentTime.getTime() + duration.estimated * 60000)
      });
      
      // 更新下一个时间
      currentTime = new Date(currentTime.getTime() + (duration.estimated + buffer) * 60000);
    });
    
    return schedule;
  }

  /**
   * 计算时间效率得分
   */
  calculateTimeEfficiencyScore(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    let totalServiceTime = 0;
    let totalBufferTime = 0;
    
    schedule.forEach(item => {
      totalServiceTime += item.duration || 60;
      totalBufferTime += item.bufferTime || 15;
    });
    
    // 效率 = 实际服务时间 / (服务时间 + 缓冲时间)
    return totalServiceTime / (totalServiceTime + totalBufferTime);
  }

  /**
   * 计算时间利用率
   */
  calculateTimeUtilization(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    const workingHours = 10; // 8:00-18:00 = 10小时
    const workingMinutes = workingHours * 60;
    
    let scheduledMinutes = 0;
    schedule.forEach(item => {
      scheduledMinutes += (item.duration || 60) + (item.bufferTime || 15);
    });
    
    return Math.min(scheduledMinutes / workingMinutes, 1.0);
  }

  /**
   * 计算缓冲优化得分
   */
  calculateBufferOptimization(buffers) {
    if (!buffers || Object.keys(buffers).length === 0) return 0;
    
    const bufferValues = Object.values(buffers);
    const avgBuffer = bufferValues.reduce((sum, val) => sum + val, 0) / bufferValues.length;
    const optimalBuffer = 20; // 理想缓冲时间20分钟
    
    // 缓冲时间越接近理想值得分越高
    return Math.max(0, 1 - Math.abs(avgBuffer - optimalBuffer) / optimalBuffer);
  }

  /**
   * 分析当前工作负荷分布
   */
  async analyzeCurrentWorkloadDistribution(items) {
    const distribution = {
      daily: {},
      weekly: {},
      totalHours: 0,
      averageDailyHours: 0
    };
    
    // 模拟当前一周的工作负荷
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      // 模拟每日工作时间（5-9小时）
      const dailyHours = 5 + Math.random() * 4;
      distribution.daily[dateKey] = dailyHours;
      distribution.totalHours += dailyHours;
    }
    
    distribution.averageDailyHours = distribution.totalHours / 7;
    
    return distribution;
  }

  /**
   * 计算理想负荷分配
   */
  async calculateIdealLoadDistribution(items) {
    const optimalDailyHours = this.config.loadBalance.optimalDailyHours;
    const maxDailyHours = this.config.loadBalance.maxDailyHours;
    
    return {
      daily: {
        target: optimalDailyHours,
        maximum: maxDailyHours,
        minimum: optimalDailyHours * 0.7
      },
      weekly: {
        target: optimalDailyHours * 5, // 工作日5天
        maximum: maxDailyHours * 6,
        distribution: 'even' // 均匀分布
      }
    };
  }

  /**
   * 生成负载均衡安排
   */
  async generateLoadBalancedSchedule(items, currentDistribution, idealDistribution) {
    const schedule = [];
    const dailyTarget = idealDistribution.daily.target;
    let currentDay = new Date();
    let currentDayHours = 0;
    
    items.forEach((item, index) => {
      const estimatedHours = 1.5; // 假设每个项目1.5小时
      
      // 检查当日是否已达到目标工作量
      if (currentDayHours + estimatedHours > dailyTarget) {
        // 切换到下一工作日
        currentDay = new Date(currentDay);
        currentDay.setDate(currentDay.getDate() + 1);
        // 跳过周末
        if (currentDay.getDay() === 0) currentDay.setDate(currentDay.getDate() + 1);
        if (currentDay.getDay() === 6) currentDay.setDate(currentDay.getDate() + 2);
        
        currentDayHours = 0;
      }
      
      const scheduledTime = new Date(currentDay);
      scheduledTime.setHours(8 + Math.floor(currentDayHours), (currentDayHours % 1) * 60, 0, 0);
      
      schedule.push({
        itemIndex: index,
        originalItem: item,
        scheduledTime,
        estimatedHours,
        dailyTotalHours: currentDayHours + estimatedHours,
        loadBalanced: true
      });
      
      currentDayHours += estimatedHours;
    });
    
    return schedule;
  }

  /**
   * 计算负载均衡得分
   */
  calculateLoadBalanceScore(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    const dailyHours = {};
    
    schedule.forEach(item => {
      const dateKey = item.scheduledTime.toISOString().split('T')[0];
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + (item.estimatedHours || 1.5);
    });
    
    const hoursArray = Object.values(dailyHours);
    const avgHours = hoursArray.reduce((sum, h) => sum + h, 0) / hoursArray.length;
    const targetHours = this.config.loadBalance.optimalDailyHours;
    
    // 计算与目标的偏差
    const deviation = Math.abs(avgHours - targetHours) / targetHours;
    
    return Math.max(0, 1 - deviation);
  }

  /**
   * 计算工作负荷方差
   */
  calculateWorkloadVariance(schedule) {
    if (!schedule || schedule.length === 0) return 0;
    
    const dailyHours = {};
    
    schedule.forEach(item => {
      const dateKey = item.scheduledTime.toISOString().split('T')[0];
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + (item.estimatedHours || 1.5);
    });
    
    const hoursArray = Object.values(dailyHours);
    const avgHours = hoursArray.reduce((sum, h) => sum + h, 0) / hoursArray.length;
    
    const variance = hoursArray.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / hoursArray.length;
    
    return Math.sqrt(variance); // 返回标准差
  }

  /**
   * 分析每日负载均衡
   */
  analyzeDailyLoadBalance(schedule) {
    const dailyHours = {};
    let overloadDays = 0;
    let underloadDays = 0;
    
    schedule.forEach(item => {
      const dateKey = item.scheduledTime.toISOString().split('T')[0];
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + (item.estimatedHours || 1.5);
    });
    
    const maxHours = this.config.loadBalance.maxDailyHours;
    const minHours = this.config.loadBalance.optimalDailyHours * 0.7;
    
    Object.values(dailyHours).forEach(hours => {
      if (hours > maxHours) overloadDays++;
      if (hours < minHours) underloadDays++;
    });
    
    return {
      totalDays: Object.keys(dailyHours).length,
      overloadDays,
      underloadDays,
      balancedDays: Object.keys(dailyHours).length - overloadDays - underloadDays,
      averageHours: Object.values(dailyHours).reduce((sum, h) => sum + h, 0) / Object.keys(dailyHours).length
    };
  }

  /**
   * 分析过载预防
   */
  analyzeOverloadPrevention(schedule) {
    const analysis = this.analyzeDailyLoadBalance(schedule);
    
    return {
      riskLevel: analysis.overloadDays > 0 ? 'high' : (analysis.averageHours > 7 ? 'medium' : 'low'),
      overloadCount: analysis.overloadDays,
      preventionEffectiveness: analysis.overloadDays === 0 ? 1.0 : Math.max(0, 1 - analysis.overloadDays / analysis.totalDays),
      recommendations: analysis.overloadDays > 0 ? ['减少部分项目', '延长服务周期'] : ['保持当前安排']
    };
  }
  
  /**
   * 计算服务重要性得分
   */
  calculateImportanceScore(item) {
    const serviceTypes = {
      'emergency': 1.0,
      'priority': 0.8,
      'routine': 0.6,
      'maintenance': 0.4
    };
    return serviceTypes[item.serviceType] || 0.6;
  }
  
  /**
   * 计算时间灵活性得分
   */
  calculateFlexibilityScore(item) {
    const constraints = item.timeConstraint || 'flexible';
    const flexibilityScores = {
      'flexible': 1.0,
      'preferred': 0.8,
      'strict': 0.4,
      'fixed': 0.2
    };
    return flexibilityScores[constraints] || 0.8;
  }
}

// 导出服务实例
export default IntelligentBatchAdjustmentService;
export const intelligentBatchAdjustmentService = new IntelligentBatchAdjustmentService();