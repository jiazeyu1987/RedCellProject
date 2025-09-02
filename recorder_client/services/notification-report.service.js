/**
 * 通知数据报告生成服务
 * 负责生成各种通知数据分析报告
 */

import NotificationService from './notification-service.js';
import notificationAPI from '../api/notification-api.js';

class NotificationReportService {
  constructor() {
    this.notificationService = null;
    this.reportCache = new Map();
    this.scheduledReports = new Map();
  }

  /**
   * 初始化报告服务
   */
  async init() {
    try {
      console.log('[NotificationReportService] 初始化报告服务...');
      
      this.notificationService = new NotificationService();
      await this.notificationService.init();
      
      // 加载已保存的报告配置
      await this.loadReportConfigs();
      
      console.log('[NotificationReportService] 报告服务初始化完成');
      return true;
    } catch (error) {
      console.error('[NotificationReportService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 生成日报
   * @param {Object} options 日报选项
   * @returns {Object} 日报数据
   */
  async generateDailyReport(options = {}) {
    const {
      date = new Date(),
      includeCharts = true,
      format = 'json' // json, html, pdf
    } = options;

    try {
      console.log('[NotificationReportService] 生成日报...', date);

      const reportDate = new Date(date);
      const startDate = new Date(reportDate.setHours(0, 0, 0, 0));
      const endDate = new Date(reportDate.setHours(23, 59, 59, 999));

      // 检查缓存
      const cacheKey = `daily_${startDate.toISOString().split('T')[0]}`;
      if (this.reportCache.has(cacheKey)) {
        return this.reportCache.get(cacheKey);
      }

      // 获取基础数据
      const baseStats = this.notificationService.getNotificationStats({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // 获取详细分析数据
      const readRateAnalysis = this.notificationService.getNotificationReadRateAnalysis({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: 'hour'
      });

      const clickRateAnalysis = this.notificationService.getNotificationClickRateAnalysis({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: 'hour'
      });

      const engagementAnalysis = this.notificationService.getUserEngagementAnalysis({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // 计算关键指标
      const keyMetrics = this.calculateDailyKeyMetrics(baseStats, readRateAnalysis, clickRateAnalysis);

      // 识别异常情况
      const anomalies = await this.detectDailyAnomalies(baseStats, startDate);

      // 生成图表数据
      const charts = includeCharts ? this.generateDailyCharts(baseStats, readRateAnalysis, clickRateAnalysis) : null;

      // 生成洞察和建议
      const insights = this.generateDailyInsights(baseStats, readRateAnalysis, clickRateAnalysis, engagementAnalysis);

      const report = {
        metadata: {
          type: 'daily',
          date: startDate.toISOString().split('T')[0],
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        },
        summary: {
          totalNotifications: baseStats.totalSent,
          readRate: parseFloat(baseStats.readRate),
          clickRate: clickRateAnalysis.summary.overallClickRate,
          engagementScore: engagementAnalysis.summary.averageScore,
          anomaliesDetected: anomalies.length
        },
        keyMetrics,
        baseStats,
        readRateAnalysis,
        clickRateAnalysis,
        engagementAnalysis,
        anomalies,
        charts,
        insights,
        recommendations: this.generateDailyRecommendations(keyMetrics, anomalies, insights)
      };

      // 缓存报告
      this.reportCache.set(cacheKey, report);

      // 格式化输出
      return this.formatReport(report, format);

    } catch (error) {
      console.error('[NotificationReportService] 生成日报失败:', error);
      throw error;
    }
  }

  /**
   * 生成周报
   * @param {Object} options 周报选项
   * @returns {Object} 周报数据
   */
  async generateWeeklyReport(options = {}) {
    const {
      startDate = null,
      endDate = null,
      includeComparison = true,
      format = 'json'
    } = options;

    try {
      console.log('[NotificationReportService] 生成周报...');

      // 计算本周时间范围
      const now = new Date();
      let weekStart, weekEnd;
      
      if (startDate && endDate) {
        weekStart = new Date(startDate);
        weekEnd = new Date(endDate);
      } else {
        weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
      }

      // 获取本周数据
      const currentWeekStats = this.notificationService.getNotificationStats({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      });

      const currentWeekReadRate = this.notificationService.getNotificationReadRateAnalysis({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        groupBy: 'day'
      });

      const currentWeekClickRate = this.notificationService.getNotificationClickRateAnalysis({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        groupBy: 'day'
      });

      // 获取上周数据进行对比
      let comparison = null;
      if (includeComparison) {
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(weekEnd);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

        const prevWeekStats = this.notificationService.getNotificationStats({
          startDate: prevWeekStart.toISOString(),
          endDate: prevWeekEnd.toISOString()
        });

        comparison = this.calculateWeeklyComparison(currentWeekStats, prevWeekStats);
      }

      // 计算周趋势
      const weeklyTrend = this.calculateWeeklyTrend(currentWeekReadRate, currentWeekClickRate);

      // 生成周报洞察
      const insights = this.generateWeeklyInsights(currentWeekStats, currentWeekReadRate, weeklyTrend, comparison);

      const report = {
        metadata: {
          type: 'weekly',
          period: {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
          },
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        },
        summary: {
          totalNotifications: currentWeekStats.totalSent,
          avgDailyReadRate: this.calculateAverageRate(currentWeekReadRate.stats, 'readRate'),
          avgDailyClickRate: this.calculateAverageRate(currentWeekClickRate.stats, 'clickRate'),
          bestDay: this.findBestPerformingDay(currentWeekReadRate.stats),
          worstDay: this.findWorstPerformingDay(currentWeekReadRate.stats)
        },
        currentWeekStats,
        currentWeekReadRate,
        currentWeekClickRate,
        weeklyTrend,
        comparison,
        insights,
        recommendations: this.generateWeeklyRecommendations(weeklyTrend, comparison, insights)
      };

      return this.formatReport(report, format);

    } catch (error) {
      console.error('[NotificationReportService] 生成周报失败:', error);
      throw error;
    }
  }

  /**
   * 生成月报
   * @param {Object} options 月报选项
   * @returns {Object} 月报数据
   */
  async generateMonthlyReport(options = {}) {
    const {
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      includeYearComparison = true,
      format = 'json'
    } = options;

    try {
      console.log('[NotificationReportService] 生成月报...', `${year}-${month}`);

      // 计算月份时间范围
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      // 获取本月数据
      const currentMonthStats = this.notificationService.getNotificationStats({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      });

      const currentMonthReadRate = this.notificationService.getNotificationReadRateAnalysis({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        groupBy: 'week'
      });

      const currentMonthClickRate = this.notificationService.getNotificationClickRateAnalysis({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        groupBy: 'week'
      });

      const currentMonthConversion = this.notificationService.getNotificationConversionAnalysis({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      });

      // 计算同比数据
      let yearComparison = null;
      if (includeYearComparison && year > 2023) {
        const prevYearStart = new Date(year - 1, month - 1, 1);
        const prevYearEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

        const prevYearStats = this.notificationService.getNotificationStats({
          startDate: prevYearStart.toISOString(),
          endDate: prevYearEnd.toISOString()
        });

        yearComparison = this.calculateYearlyComparison(currentMonthStats, prevYearStats);
      }

      // 计算月度趋势
      const monthlyTrend = this.calculateMonthlyTrend(currentMonthReadRate, currentMonthClickRate, currentMonthConversion);

      // 生成月度总结
      const monthlySummary = this.generateMonthlySummary(currentMonthStats, monthlyTrend, yearComparison);

      // 生成改进计划
      const improvementPlan = this.generateMonthlyImprovementPlan(monthlyTrend, yearComparison);

      const report = {
        metadata: {
          type: 'monthly',
          period: {
            year,
            month,
            monthName: monthStart.toLocaleDateString('zh-CN', { month: 'long' })
          },
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        },
        summary: monthlySummary,
        currentMonthStats,
        currentMonthReadRate,
        currentMonthClickRate,
        currentMonthConversion,
        monthlyTrend,
        yearComparison,
        improvementPlan,
        achievements: this.identifyMonthlyAchievements(currentMonthStats, monthlyTrend),
        challenges: this.identifyMonthlyChallenges(monthlyTrend, yearComparison),
        recommendations: this.generateMonthlyRecommendations(monthlyTrend, yearComparison, improvementPlan)
      };

      return this.formatReport(report, format);

    } catch (error) {
      console.error('[NotificationReportService] 生成月报失败:', error);
      throw error;
    }
  }

  /**
   * 生成趋势分析报告
   * @param {Object} options 趋势分析选项
   * @returns {Object} 趋势分析数据
   */
  async generateTrendAnalysis(options = {}) {
    const {
      startDate,
      endDate,
      metrics = ['readRate', 'clickRate', 'conversionRate'],
      groupBy = 'day',
      includePrediction = true
    } = options;

    try {
      console.log('[NotificationReportService] 生成趋势分析...');

      // 获取历史数据
      const historicalData = await this.getHistoricalData(startDate, endDate, groupBy);

      // 分析各指标趋势
      const trendAnalysis = {};
      for (const metric of metrics) {
        trendAnalysis[metric] = this.analyzeTrend(historicalData, metric);
      }

      // 识别趋势模式
      const patterns = this.identifyTrendPatterns(trendAnalysis);

      // 生成趋势预测
      let prediction = null;
      if (includePrediction) {
        prediction = this.generateTrendPrediction(trendAnalysis, patterns);
      }

      // 生成趋势洞察
      const insights = this.generateTrendInsights(trendAnalysis, patterns);

      return {
        metadata: {
          type: 'trend',
          period: { startDate, endDate },
          metrics,
          generatedAt: new Date().toISOString()
        },
        historicalData,
        trendAnalysis,
        patterns,
        prediction,
        insights,
        recommendations: this.generateTrendRecommendations(trendAnalysis, patterns, prediction)
      };

    } catch (error) {
      console.error('[NotificationReportService] 生成趋势分析失败:', error);
      throw error;
    }
  }

  /**
   * 检测异常情况
   * @param {Object} currentStats 当前统计数据
   * @param {Date} date 日期
   * @returns {Array} 异常情况列表
   */
  async detectDailyAnomalies(currentStats, date) {
    try {
      const anomalies = [];

      // 获取历史平均值
      const historicalAverage = await this.getHistoricalAverage(date, 7); // 过去7天平均值

      // 检测发送量异常
      if (currentStats.totalSent < historicalAverage.totalSent * 0.5) {
        anomalies.push({
          type: 'low_volume',
          severity: 'high',
          description: '今日通知发送量显著低于历史平均值',
          current: currentStats.totalSent,
          expected: historicalAverage.totalSent,
          deviation: ((currentStats.totalSent / historicalAverage.totalSent - 1) * 100).toFixed(2)
        });
      }

      // 检测阅读率异常
      if (currentStats.readRate < historicalAverage.readRate * 0.8) {
        anomalies.push({
          type: 'low_read_rate',
          severity: 'medium',
          description: '今日阅读率明显下降',
          current: currentStats.readRate,
          expected: historicalAverage.readRate,
          deviation: ((currentStats.readRate / historicalAverage.readRate - 1) * 100).toFixed(2)
        });
      }

      // 检测成功率异常
      if (currentStats.successRate < 95) {
        anomalies.push({
          type: 'low_success_rate',
          severity: 'high',
          description: '通知发送成功率过低',
          current: currentStats.successRate,
          threshold: 95,
          impact: 'delivery_failure'
        });
      }

      return anomalies;

    } catch (error) {
      console.error('[NotificationReportService] 检测异常失败:', error);
      return [];
    }
  }

  /**
   * 计算日报关键指标
   */
  calculateDailyKeyMetrics(baseStats, readRateAnalysis, clickRateAnalysis) {
    return {
      deliveryRate: baseStats.successRate,
      openRate: baseStats.readRate,
      clickThroughRate: clickRateAnalysis.summary.overallClickRate,
      avgResponseTime: baseStats.avgDeliveryTime,
      peakHour: this.findPeakHour(readRateAnalysis.stats),
      totalReach: baseStats.totalSent,
      engagement: {
        high: Math.round(baseStats.totalSent * 0.3),
        medium: Math.round(baseStats.totalSent * 0.5),
        low: Math.round(baseStats.totalSent * 0.2)
      }
    };
  }

  /**
   * 生成日报图表数据
   */
  generateDailyCharts(baseStats, readRateAnalysis, clickRateAnalysis) {
    return {
      hourlyReadRate: {
        type: 'line',
        data: this.convertToChartData(readRateAnalysis.stats, 'readRate'),
        title: '每小时阅读率趋势'
      },
      hourlyClickRate: {
        type: 'line',
        data: this.convertToChartData(clickRateAnalysis.stats, 'clickRate'),
        title: '每小时点击率趋势'
      },
      typeDistribution: {
        type: 'pie',
        data: Object.entries(baseStats.byType || {}),
        title: '通知类型分布'
      },
      channelPerformance: {
        type: 'bar',
        data: Object.entries(baseStats.byChannel || {}),
        title: '渠道表现对比'
      }
    };
  }

  /**
   * 生成日报洞察
   */
  generateDailyInsights(baseStats, readRateAnalysis, clickRateAnalysis, engagementAnalysis) {
    const insights = [];

    // 阅读率洞察
    if (baseStats.readRate > 70) {
      insights.push({
        type: 'positive',
        title: '阅读率表现优秀',
        description: `今日阅读率达到${baseStats.readRate}%，超过行业平均水平`,
        impact: 'high'
      });
    } else if (baseStats.readRate < 30) {
      insights.push({
        type: 'warning',
        title: '阅读率需要改进',
        description: `今日阅读率仅为${baseStats.readRate}%，建议优化通知内容和发送时机`,
        impact: 'high'
      });
    }

    // 最佳时间洞察
    const peakHour = this.findPeakHour(readRateAnalysis.stats);
    if (peakHour) {
      insights.push({
        type: 'info',
        title: '用户活跃时间分析',
        description: `用户在${peakHour}点最为活跃，建议在此时间段发送重要通知`,
        impact: 'medium'
      });
    }

    return insights;
  }

  /**
   * 生成日报建议
   */
  generateDailyRecommendations(keyMetrics, anomalies, insights) {
    const recommendations = [];

    // 基于异常生成建议
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'low_volume':
          recommendations.push({
            priority: 'high',
            action: '检查发送系统状态',
            description: '通知发送量异常，需要排查技术问题',
            category: 'technical'
          });
          break;
        case 'low_read_rate':
          recommendations.push({
            priority: 'medium',
            action: '优化通知内容',
            description: '提升通知标题吸引力，优化内容质量',
            category: 'content'
          });
          break;
      }
    });

    // 基于指标生成建议
    if (keyMetrics.clickThroughRate < 10) {
      recommendations.push({
        priority: 'medium',
        action: '改进调用行动',
        description: '增加明确的行动按钮，优化用户体验',
        category: 'design'
      });
    }

    return recommendations;
  }

  // ============= 辅助方法 =============

  /**
   * 格式化报告
   */
  formatReport(report, format) {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(report);
      case 'pdf':
        return this.generatePDFReport(report);
      default:
        return report;
    }
  }

  /**
   * 查找峰值小时
   */
  findPeakHour(hourlyStats) {
    let maxRate = 0;
    let peakHour = null;

    for (const [hour, stats] of Object.entries(hourlyStats)) {
      const rate = parseFloat(stats.readRate || 0);
      if (rate > maxRate) {
        maxRate = rate;
        peakHour = hour.split('-')[3]; // 提取小时部分
      }
    }

    return peakHour;
  }

  /**
   * 转换为图表数据格式
   */
  convertToChartData(stats, metric) {
    return Object.entries(stats).map(([time, data]) => ({
      x: time,
      y: parseFloat(data[metric] || 0)
    }));
  }

  /**
   * 加载报告配置
   */
  async loadReportConfigs() {
    try {
      const configs = wx.getStorageSync('notification_report_configs') || {};
      this.scheduledReports = new Map(Object.entries(configs));
    } catch (error) {
      console.warn('[NotificationReportService] 加载报告配置失败:', error);
    }
  }

  /**
   * 保存报告配置
   */
  async saveReportConfigs() {
    try {
      const configs = Object.fromEntries(this.scheduledReports);
      wx.setStorageSync('notification_report_configs', configs);
    } catch (error) {
      console.error('[NotificationReportService] 保存报告配置失败:', error);
    }
  }

  // ============= 报告辅助方法 =============

  /**
   * 获取历史平均值
   */
  async getHistoricalAverage(date, days = 7) {
    const endDate = new Date(date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const stats = this.notificationService.getNotificationStats({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    return {
      totalSent: Math.round(stats.totalSent / days),
      readRate: stats.readRate,
      successRate: stats.successRate
    };
  }

  /**
   * 计算周对比
   */
  calculateWeeklyComparison(currentWeek, previousWeek) {
    const comparison = {
      totalSent: {
        current: currentWeek.totalSent,
        previous: previousWeek.totalSent,
        change: currentWeek.totalSent - previousWeek.totalSent,
        changePercent: previousWeek.totalSent > 0 ? 
          ((currentWeek.totalSent / previousWeek.totalSent - 1) * 100).toFixed(2) : 0
      },
      readRate: {
        current: currentWeek.readRate,
        previous: previousWeek.readRate,
        change: currentWeek.readRate - previousWeek.readRate,
        changePercent: previousWeek.readRate > 0 ? 
          ((currentWeek.readRate / previousWeek.readRate - 1) * 100).toFixed(2) : 0
      },
      successRate: {
        current: currentWeek.successRate,
        previous: previousWeek.successRate,
        change: currentWeek.successRate - previousWeek.successRate,
        changePercent: previousWeek.successRate > 0 ? 
          ((currentWeek.successRate / previousWeek.successRate - 1) * 100).toFixed(2) : 0
      }
    };

    return comparison;
  }

  /**
   * 计算年对比
   */
  calculateYearlyComparison(currentYear, previousYear) {
    return this.calculateWeeklyComparison(currentYear, previousYear);
  }

  /**
   * 计算周趋势
   */
  calculateWeeklyTrend(readRateAnalysis, clickRateAnalysis) {
    const readRateKeys = Object.keys(readRateAnalysis.stats).sort();
    const clickRateKeys = Object.keys(clickRateAnalysis.stats).sort();

    const trend = {
      readRate: this.calculateTrendDirection(readRateKeys.map(key => 
        parseFloat(readRateAnalysis.stats[key].readRate)
      )),
      clickRate: this.calculateTrendDirection(clickRateKeys.map(key => 
        parseFloat(clickRateAnalysis.stats[key].clickRate)
      )),
      overallDirection: 'stable'
    };

    // 确定整体趋势方向
    if (trend.readRate.direction === 'up' && trend.clickRate.direction === 'up') {
      trend.overallDirection = 'up';
    } else if (trend.readRate.direction === 'down' || trend.clickRate.direction === 'down') {
      trend.overallDirection = 'down';
    }

    return trend;
  }

  /**
   * 计算月趋势
   */
  calculateMonthlyTrend(readRateAnalysis, clickRateAnalysis, conversionAnalysis) {
    const readTrend = this.calculateWeeklyTrend(readRateAnalysis, clickRateAnalysis);
    
    return {
      ...readTrend,
      conversion: {
        totalConversions: conversionAnalysis.summary.totalConversions,
        bestGoal: conversionAnalysis.summary.bestPerformingGoal,
        avgTime: conversionAnalysis.summary.avgConversionTime
      }
    };
  }

  /**
   * 计算趋势方向
   */
  calculateTrendDirection(values) {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 'low' };
    }

    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const changePercent = first > 0 ? (change / first * 100) : 0;

    let direction = 'stable';
    let confidence = 'medium';

    if (Math.abs(changePercent) > 10) {
      direction = changePercent > 0 ? 'up' : 'down';
      confidence = 'high';
    } else if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'up' : 'down';
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      direction,
      change: changePercent.toFixed(2),
      confidence,
      values: { first, last }
    };
  }

  /**
   * 计算平均率
   */
  calculateAverageRate(stats, rateKey) {
    const rates = Object.values(stats).map(stat => parseFloat(stat[rateKey] || 0));
    return rates.length > 0 ? (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(2) : 0;
  }

  /**
   * 查找表现最佳的天
   */
  findBestPerformingDay(stats) {
    let bestDay = null;
    let bestRate = 0;

    for (const [day, stat] of Object.entries(stats)) {
      const rate = parseFloat(stat.readRate || 0);
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = day;
      }
    }

    return bestDay ? {
      date: bestDay,
      readRate: bestRate
    } : null;
  }

  /**
   * 查找表现最差的天
   */
  findWorstPerformingDay(stats) {
    let worstDay = null;
    let worstRate = 100;

    for (const [day, stat] of Object.entries(stats)) {
      const rate = parseFloat(stat.readRate || 0);
      if (rate < worstRate) {
        worstRate = rate;
        worstDay = day;
      }
    }

    return worstDay ? {
      date: worstDay,
      readRate: worstRate
    } : null;
  }

  /**
   * 生成周报洞察
   */
  generateWeeklyInsights(weekStats, readRateAnalysis, weeklyTrend, comparison) {
    const insights = [];

    // 趋势洞察
    if (weeklyTrend.overallDirection === 'up') {
      insights.push({
        type: 'positive',
        title: '本周表现优秀',
        description: '阅读率和点击率均呈上升趋势',
        impact: 'high'
      });
    } else if (weeklyTrend.overallDirection === 'down') {
      insights.push({
        type: 'warning',
        title: '需要关注表现下降',
        description: '本周整体指标有下降趋势，建议分析原因',
        impact: 'high'
      });
    }

    // 对比洞察
    if (comparison && Math.abs(parseFloat(comparison.totalSent.changePercent)) > 20) {
      insights.push({
        type: 'info',
        title: '发送量显著变化',
        description: `相比上周，通知发送量变化${comparison.totalSent.changePercent}%`,
        impact: 'medium'
      });
    }

    return insights;
  }

  /**
   * 生成周报建议
   */
  generateWeeklyRecommendations(weeklyTrend, comparison, insights) {
    const recommendations = [];

    if (weeklyTrend.overallDirection === 'down') {
      recommendations.push({
        priority: 'high',
        action: '分析下降原因',
        description: '深入分析本周指标下降的具体原因，制定改进计划',
        category: 'analysis'
      });
    }

    if (comparison && parseFloat(comparison.readRate.changePercent) < -10) {
      recommendations.push({
        priority: 'medium',
        action: '优化阅读体验',
        description: '阅读率下降较多，建议优化通知内容和发送时机',
        category: 'content'
      });
    }

    return recommendations;
  }

  /**
   * 生成月度总结
   */
  generateMonthlySummary(monthStats, monthlyTrend, yearComparison) {
    const summary = {
      totalNotifications: monthStats.totalSent,
      avgReadRate: monthStats.readRate,
      avgSuccessRate: monthStats.successRate,
      trendDirection: monthlyTrend.overallDirection,
      keyAchievements: [],
      mainChallenges: []
    };

    // 成就识别
    if (monthStats.readRate > 60) {
      summary.keyAchievements.push('阅读率表现优秀');
    }
    if (monthStats.successRate > 95) {
      summary.keyAchievements.push('发送成功率高');
    }

    // 挑战识别
    if (monthlyTrend.overallDirection === 'down') {
      summary.mainChallenges.push('整体指标下降趋势');
    }
    if (monthStats.readRate < 30) {
      summary.mainChallenges.push('阅读率偏低');
    }

    return summary;
  }

  /**
   * 生成月度改进计划
   */
  generateMonthlyImprovementPlan(monthlyTrend, yearComparison) {
    const plan = {
      shortTerm: [], // 1-2周
      mediumTerm: [], // 1个月
      longTerm: [] // 3个月
    };

    if (monthlyTrend.readRate.direction === 'down') {
      plan.shortTerm.push('优化通知标题和内容');
      plan.mediumTerm.push('分析用户行为模式，优化发送策略');
    }

    if (monthlyTrend.clickRate.direction === 'down') {
      plan.shortTerm.push('改进行动召唤设计');
      plan.longTerm.push('重新设计通知交互流程');
    }

    return plan;
  }

  /**
   * 识别月度成就
   */
  identifyMonthlyAchievements(monthStats, monthlyTrend) {
    const achievements = [];

    if (monthStats.totalSent > 10000) {
      achievements.push({
        title: '大量通知发送',
        description: `成功发送超过${monthStats.totalSent.toLocaleString()}条通知`,
        impact: 'high'
      });
    }

    if (monthlyTrend.overallDirection === 'up') {
      achievements.push({
        title: '指标持续改善',
        description: '本月整体指标呈现上升趋势',
        impact: 'high'
      });
    }

    return achievements;
  }

  /**
   * 识别月度挑战
   */
  identifyMonthlyChallenges(monthlyTrend, yearComparison) {
    const challenges = [];

    if (monthlyTrend.overallDirection === 'down') {
      challenges.push({
        title: '指标下降趋势',
        description: '多个关键指标出现下降',
        severity: 'high',
        urgency: 'immediate'
      });
    }

    if (yearComparison && parseFloat(yearComparison.totalSent.changePercent) < -30) {
      challenges.push({
        title: '同比发送量大幅下降',
        description: '相比去年同期发送量显著减少',
        severity: 'medium',
        urgency: 'high'
      });
    }

    return challenges;
  }

  /**
   * 生成月报建议
   */
  generateMonthlyRecommendations(monthlyTrend, yearComparison, improvementPlan) {
    const recommendations = [];

    // 基于改进计划生成建议
    if (improvementPlan.shortTerm.length > 0) {
      recommendations.push({
        priority: 'high',
        timeframe: 'short',
        actions: improvementPlan.shortTerm,
        category: 'immediate'
      });
    }

    if (improvementPlan.mediumTerm.length > 0) {
      recommendations.push({
        priority: 'medium',
        timeframe: 'medium',
        actions: improvementPlan.mediumTerm,
        category: 'strategic'
      });
    }

    return recommendations;
  }

  /**
   * 获取历史数据
   */
  async getHistoricalData(startDate, endDate, groupBy) {
    return this.notificationService.getNotificationStats({
      startDate,
      endDate,
      groupBy
    });
  }

  /**
   * 分析趋势
   */
  analyzeTrend(historicalData, metric) {
    const values = Object.values(historicalData).map(data => data[metric] || 0);
    return this.calculateTrendDirection(values);
  }

  /**
   * 识别趋势模式
   */
  identifyTrendPatterns(trendAnalysis) {
    const patterns = {};
    
    for (const [metric, trend] of Object.entries(trendAnalysis)) {
      if (trend.confidence === 'high') {
        patterns[metric] = {
          type: 'strong_trend',
          direction: trend.direction,
          confidence: trend.confidence
        };
      } else if (Math.abs(parseFloat(trend.change)) > 5) {
        patterns[metric] = {
          type: 'moderate_trend',
          direction: trend.direction,
          confidence: trend.confidence
        };
      } else {
        patterns[metric] = {
          type: 'stable',
          direction: 'stable',
          confidence: 'high'
        };
      }
    }
    
    return patterns;
  }

  /**
   * 生成趋势预测
   */
  generateTrendPrediction(trendAnalysis, patterns) {
    const predictions = {};
    
    for (const [metric, trend] of Object.entries(trendAnalysis)) {
      if (trend.confidence === 'high') {
        const currentValue = trend.values.last;
        const changeRate = parseFloat(trend.change) / 100;
        const predictedValue = currentValue * (1 + changeRate);
        
        predictions[metric] = {
          currentValue,
          predictedValue: predictedValue.toFixed(2),
          confidence: trend.confidence,
          timeframe: 'next_period'
        };
      }
    }
    
    return predictions;
  }

  /**
   * 生成趋势洞察
   */
  generateTrendInsights(trendAnalysis, patterns) {
    const insights = [];
    
    const strongUpTrends = Object.entries(patterns).filter(([_, pattern]) => 
      pattern.type === 'strong_trend' && pattern.direction === 'up'
    );
    
    const strongDownTrends = Object.entries(patterns).filter(([_, pattern]) => 
      pattern.type === 'strong_trend' && pattern.direction === 'down'
    );
    
    if (strongUpTrends.length > 0) {
      insights.push({
        type: 'positive',
        title: '强劲上升趋势',
        description: `${strongUpTrends.map(([metric]) => metric).join('、')}指标呈现强劲上升趋势`,
        impact: 'high'
      });
    }
    
    if (strongDownTrends.length > 0) {
      insights.push({
        type: 'warning',
        title: '指标下降警告',
        description: `${strongDownTrends.map(([metric]) => metric).join('、')}指标出现显著下降`,
        impact: 'high'
      });
    }
    
    return insights;
  }

  /**
   * 生成趋势建议
   */
  generateTrendRecommendations(trendAnalysis, patterns, prediction) {
    const recommendations = [];
    
    // 基于趋势模式生成建议
    for (const [metric, pattern] of Object.entries(patterns)) {
      if (pattern.type === 'strong_trend' && pattern.direction === 'down') {
        recommendations.push({
          priority: 'high',
          metric,
          action: `紧急干预${metric}下降趋势`,
          description: `${metric}指标持续下降，需要立即采取行动`,
          category: 'urgent'
        });
      } else if (pattern.type === 'strong_trend' && pattern.direction === 'up') {
        recommendations.push({
          priority: 'medium',
          metric,
          action: `保持并强化${metric}优势`,
          description: `${metric}指标表现优秀，建议总结经验并扩大成果`,
          category: 'optimization'
        });
      }
    }
    
    return recommendations;
  }
}

export default NotificationReportService;