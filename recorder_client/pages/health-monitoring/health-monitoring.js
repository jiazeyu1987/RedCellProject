const healthArchiveService = require('../../services/health-archive.service.js');

Page({
  data: {
    memberId: '',
    memberName: '',
    currentTab: 'exercise', // exercise, sleep
    
    // 运动数据
    exerciseStats: {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      weeklyFrequency: 0,
      favoriteExercise: ''
    },
    exerciseRecords: [],
    exerciseTrend: [],
    
    // 睡眠数据
    sleepStats: {
      totalNights: 0,
      avgDuration: 0,
      avgQualityScore: 0,
      avgSleepLatency: 0,
      bestSleepQuality: '',
      worstSleepQuality: '',
      sleepDebt: 0
    },
    sleepRecords: [],
    sleepTrend: [],
    
    // 筛选条件
    filters: {
      dateRange: '7days', // 7days, 30days, 90days
      exerciseType: '', // 运动类型筛选
      sleepQuality: '' // 睡眠质量筛选
    },
    
    loading: false,
    refreshing: false
  },

  onLoad(options) {
    const { memberId, memberName } = options;
    this.setData({ 
      memberId, 
      memberName: decodeURIComponent(memberName || '成员')
    });
    
    this.loadHealthData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadHealthData();
  },

  async loadHealthData() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadExerciseData(),
        this.loadSleepData()
      ]);
    } catch (error) {
      console.error('加载健康数据失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadExerciseData() {
    try {
      const { memberId, filters } = this.data;
      const options = {
        dateRange: this.getDateRange(filters.dateRange),
        exerciseType: filters.exerciseType,
        limit: 50
      };
      
      const result = await healthArchiveService.getExerciseRecords(memberId, options);
      
      this.setData({
        exerciseStats: result.statistics,
        exerciseRecords: result.records,
        exerciseTrend: this.calculateExerciseTrend(result.records)
      });
      
    } catch (error) {
      console.error('加载运动数据失败:', error);
      throw error;
    }
  },

  async loadSleepData() {
    try {
      const { memberId, filters } = this.data;
      const options = {
        dateRange: this.getDateRange(filters.dateRange),
        quality: filters.sleepQuality,
        limit: 50
      };
      
      const result = await healthArchiveService.getSleepRecords(memberId, options);
      
      this.setData({
        sleepStats: result.statistics,
        sleepRecords: result.records,
        sleepTrend: this.calculateSleepTrend(result.records)
      });
      
    } catch (error) {
      console.error('加载睡眠数据失败:', error);
      throw error;
    }
  },

  getDateRange(range) {
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return {
      start: startDate.toISOString(),
      end: now.toISOString()
    };
  },

  calculateExerciseTrend(records) {
    if (!records || records.length === 0) return [];
    
    // 按日期分组
    const groupedData = records.reduce((acc, record) => {
      const date = new Date(record.recordTime).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalDuration: 0,
          totalCalories: 0,
          workoutCount: 0
        };
      }
      
      acc[date].totalDuration += record.exercise.duration || 0;
      acc[date].totalCalories += record.exercise.calories || 0;
      acc[date].workoutCount += 1;
      
      return acc;
    }, {});
    
    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  calculateSleepTrend(records) {
    if (!records || records.length === 0) return [];
    
    return records.map(record => ({
      date: record.recordDate,
      duration: record.sleepTime.duration || 0,
      qualityScore: record.analysis?.quality_score || 0,
      sleepLatency: record.sleepTime.sleepLatency || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  // 标签页切换
  onTabChange(e) {
    const { value } = e.detail;
    this.setData({ currentTab: value });
  },

  // 筛选条件变更
  onFilterChange(e) {
    const { type } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`filters.${type}`]: value
    });
    
    // 重新加载数据
    this.loadHealthData();
  },

  // 添加运动记录
  addExerciseRecord() {
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=exercise`
    });
  },

  // 添加睡眠记录
  addSleepRecord() {
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=sleep`
    });
  },

  // 查看运动记录详情
  viewExerciseDetail(e) {
    const { index } = e.currentTarget.dataset;
    const record = this.data.exerciseRecords[index];
    
    wx.showModal({
      title: '运动详情',
      content: this.formatExerciseDetail(record),
      showCancel: false
    });
  },

  // 查看睡眠记录详情
  viewSleepDetail(e) {
    const { index } = e.currentTarget.dataset;
    const record = this.data.sleepRecords[index];
    
    wx.showModal({
      title: '睡眠详情',
      content: this.formatSleepDetail(record),
      showCancel: false
    });
  },

  formatExerciseDetail(record) {
    const exercise = record.exercise;
    const analysis = record.analysis;
    
    let detail = `运动类型：${exercise.type}\n`;
    detail += `运动时长：${exercise.duration}分钟\n`;
    detail += `运动强度：${exercise.intensity}\n`;
    
    if (exercise.calories) {
      detail += `消耗卡路里：${exercise.calories}大卡\n`;
    }
    
    if (exercise.distance) {
      detail += `运动距离：${exercise.distance}公里\n`;
    }
    
    if (analysis && analysis.recommendations.length > 0) {
      detail += `\n建议：\n${analysis.recommendations.join('\n')}`;
    }
    
    return detail;
  },

  formatSleepDetail(record) {
    const sleepTime = record.sleepTime;
    const sleepQuality = record.sleepQuality;
    const analysis = record.analysis;
    
    let detail = `睡眠时长：${sleepTime.duration}小时\n`;
    detail += `上床时间：${sleepTime.bedTime}\n`;
    detail += `起床时间：${sleepTime.wakeUpTime}\n`;
    detail += `入睡时间：${sleepTime.sleepLatency}分钟\n`;
    detail += `睡眠质量：${sleepQuality.overall}\n`;
    
    if (sleepQuality.awakening) {
      detail += `夜间觉醒：${sleepQuality.awakening}次\n`;
    }
    
    if (analysis && analysis.quality_score) {
      detail += `质量评分：${analysis.quality_score}分\n`;
    }
    
    if (analysis && analysis.recommendations.length > 0) {
      detail += `\n建议：\n${analysis.recommendations.join('\n')}`;
    }
    
    return detail;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadHealthData().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  // 分享数据
  onShareData() {
    const { currentTab, exerciseStats, sleepStats } = this.data;
    
    let shareContent = '';
    if (currentTab === 'exercise') {
      shareContent = `我的运动数据：\n总锻炼次数：${exerciseStats.totalWorkouts}次\n总运动时长：${exerciseStats.totalDuration}分钟\n平均时长：${exerciseStats.avgDuration}分钟\n周频率：${exerciseStats.weeklyFrequency}次/周`;
    } else {
      shareContent = `我的睡眠数据：\n记录天数：${sleepStats.totalNights}天\n平均睡眠：${sleepStats.avgDuration}小时\n质量评分：${sleepStats.avgQualityScore}分\n平均入睡：${sleepStats.avgSleepLatency}分钟`;
    }
    
    wx.setClipboardData({
      data: shareContent,
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  }
});