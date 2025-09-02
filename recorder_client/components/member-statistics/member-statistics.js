Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 统计数据
    statistics: {
      type: Object,
      value: {},
      observer(newVal) {
        if (newVal) {
          this.processStatistics();
        }
      }
    },
    // 是否显示详细统计
    showDetail: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 处理后的统计数据
    processedStats: [],
    // 显示模式
    displayMode: 'simple', // simple, detailed, chart
    // 动画状态
    animationClass: '',
    // 扩展统计项
    extendedStats: [],
    // 年龄分布统计
    ageDistribution: {
      children: 0,    // 0-18岁
      adults: 0,      // 19-59岁
      elderly: 0      // 60岁以上
    },
    // 健康状态分布
    healthDistribution: {
      healthy: 0,
      chronic: 0,
      critical: 0
    },
    // 服务频率分布
    serviceDistribution: {
      daily: 0,
      weekly: 0,
      monthly: 0
    },
    // 性别分布
    genderDistribution: {
      male: 0,
      female: 0
    },
    // 图表数据
    chartData: {
      ageChart: [],
      healthChart: [],
      serviceChart: [],
      genderChart: []
    },
    // 快速洞察
    insights: [],
    // 统计卡片配置
    statCards: [
      {
        key: 'total',
        title: '总成员',
        icon: 'group',
        color: '#007AFF',
        bgColor: 'rgba(0, 122, 255, 0.1)',
        description: '家庭成员总数',
        priority: 1
      },
      {
        key: 'activeMembers',
        title: '活跃成员',
        icon: 'heart',
        color: '#34C759',
        bgColor: 'rgba(52, 199, 89, 0.1)',
        description: '近期有服务记录',
        priority: 2
      },
      {
        key: 'pendingService',
        title: '待服务',
        icon: 'clock',
        color: '#FF9500',
        bgColor: 'rgba(255, 149, 0, 0.1)',
        description: '等待服务的成员',
        priority: 3
      },
      {
        key: 'averageAge',
        title: '平均年龄',
        icon: 'age',
        color: '#5856D6',
        bgColor: 'rgba(88, 86, 214, 0.1)',
        unit: '岁',
        description: '家庭成员平均年龄',
        priority: 4
      },
      {
        key: 'criticalMembers',
        title: '重症成员',
        icon: 'warning',
        color: '#FF3B30',
        bgColor: 'rgba(255, 59, 48, 0.1)',
        description: '需要重点关注',
        priority: 5
      },
      {
        key: 'elderlyMembers',
        title: '老年成员',
        icon: 'elderly',
        color: '#AF52DE',
        bgColor: 'rgba(175, 82, 222, 0.1)',
        description: '60岁以上成员',
        priority: 6
      }
    ]
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理统计数据
     */
    processStatistics() {
      const stats = this.data.statistics;
      if (!stats) return;
      
      // 基本统计项
      const basicStats = this.generateBasicStats(stats);
      
      // 扩展统计项
      const extendedStats = this.generateExtendedStats(stats);
      
      // 分布统计
      const distributions = this.calculateDistributions(stats);
      
      // 生成洞察
      const insights = this.generateInsights(stats, distributions);
      
      // 图表数据
      const chartData = this.generateChartData(distributions);
      
      this.setData({
        processedStats: basicStats,
        extendedStats,
        ageDistribution: distributions.age,
        healthDistribution: distributions.health,
        serviceDistribution: distributions.service,
        genderDistribution: distributions.gender,
        insights,
        chartData,
        animationClass: 'fade-in'
      });
      
      // 数字动画
      this.animateNumbers();
    },

    /**
     * 生成基本统计项
     */
    generateBasicStats(stats) {
      return this.data.statCards.map(card => {
        const value = this.getStatValue(stats, card.key);
        const trend = this.calculateTrend(value, this.getLastStatValue(stats, card.key));
        
        return {
          ...card,
          value,
          trend,
          displayValue: 0, // 用于动画
          percentage: this.calculatePercentage(stats, card.key)
        };
      }).sort((a, b) => a.priority - b.priority);
    },

    /**
     * 获取统计值
     */
    getStatValue(stats, key) {
      switch (key) {
        case 'total':
          return stats.total || 0;
        case 'activeMembers':
          return stats.activeMembers || 0;
        case 'pendingService':
          return stats.pendingService || 0;
        case 'averageAge':
          return Math.round(stats.averageAge || 0);
        case 'criticalMembers':
          return stats.criticalMembers || 0;
        case 'elderlyMembers':
          return stats.elderlyMembers || 0;
        default:
          return 0;
      }
    },

    /**
     * 获取上期统计值
     */
    getLastStatValue(stats, key) {
      const lastStats = stats.lastPeriod || {};
      return this.getStatValue(lastStats, key);
    },

    /**
     * 生成扩展统计项
     */
    generateExtendedStats(stats) {
      return [
        {
          key: 'serviceRate',
          title: '服务覆盖率',
          value: this.calculateServiceRate(stats),
          unit: '%',
          icon: 'coverage',
          color: '#00D4AA'
        },
        {
          key: 'avgResponseTime',
          title: '平均响应时间',
          value: stats.avgResponseTime || 0,
          unit: '分钟',
          icon: 'timer',
          color: '#5AC8FA'
        },
        {
          key: 'satisfactionRate',
          title: '满意度',
          value: Math.round((stats.satisfactionRate || 0) * 100),
          unit: '%',
          icon: 'star',
          color: '#FFD60A'
        },
        {
          key: 'monthlyGrowth',
          title: '月增长率',
          value: this.calculateMonthlyGrowth(stats),
          unit: '%',
          icon: 'trend',
          color: '#30D158'
        }
      ];
    },

    /**
     * 计算分布统计
     */
    calculateDistributions(stats) {
      const members = stats.memberDetails || [];
      
      const age = { children: 0, adults: 0, elderly: 0 };
      const health = { healthy: 0, chronic: 0, critical: 0 };
      const service = { daily: 0, weekly: 0, monthly: 0 };
      const gender = { male: 0, female: 0 };
      
      members.forEach(member => {
        // 年龄分布
        if (member.age <= 18) age.children++;
        else if (member.age < 60) age.adults++;
        else age.elderly++;
        
        // 健康状态分布
        if (health[member.healthStatus]) {
          health[member.healthStatus]++;
        }
        
        // 服务频率分布
        if (service[member.serviceFrequency]) {
          service[member.serviceFrequency]++;
        }
        
        // 性别分布
        if (gender[member.gender]) {
          gender[member.gender]++;
        }
      });
      
      return { age, health, service, gender };
    },

    /**
     * 生成洞察
     */
    generateInsights(stats, distributions) {
      const insights = [];
      
      // 待服务成员提醒
      if (stats.pendingService > 0) {
        insights.push({
          type: 'warning',
          icon: 'warning',
          color: '#FF9500',
          title: '服务提醒',
          message: `有 ${stats.pendingService} 位成员等待服务`,
          action: '立即查看',
          actionType: 'filter',
          actionData: { serviceStatus: 'pending' }
        });
      }
      
      // 老年成员关注
      if (distributions.age.elderly > stats.total * 0.3) {
        insights.push({
          type: 'info',
          icon: 'elderly',
          color: '#007AFF',
          title: '老龄化程度较高',
          message: `老年成员占比 ${Math.round(distributions.age.elderly / stats.total * 100)}%`,
          action: '查看详情',
          actionType: 'filter',
          actionData: { ageRange: 'elderly' }
        });
      }
      
      // 活跃度评估
      const activityRate = stats.activeMembers / stats.total;
      if (activityRate >= 0.8) {
        insights.push({
          type: 'success',
          icon: 'success',
          color: '#34C759',
          title: '活跃度良好',
          message: `活跃成员占比 ${Math.round(activityRate * 100)}%`,
          action: null
        });
      } else if (activityRate < 0.5) {
        insights.push({
          type: 'warning',
          icon: 'info',
          color: '#FF9500',
          title: '活跃度偏低',
          message: '建议加强成员互动',
          action: '查看建议',
          actionType: 'suggestion'
        });
      }
      
      // 重症成员提醒
      if (stats.criticalMembers > 0) {
        insights.push({
          type: 'critical',
          icon: 'warning',
          color: '#FF3B30',
          title: '重症成员关注',
          message: `有 ${stats.criticalMembers} 位重症成员需要特别关注`,
          action: '立即查看',
          actionType: 'filter',
          actionData: { healthStatus: 'critical' }
        });
      }
      
      return insights.slice(0, 4); // 最多显示4个洞察
    },

    /**
     * 生成图表数据
     */
    generateChartData(distributions) {
      return {
        ageChart: [
          { name: '儿童', value: distributions.age.children, color: '#5AC8FA' },
          { name: '成人', value: distributions.age.adults, color: '#007AFF' },
          { name: '老人', value: distributions.age.elderly, color: '#AF52DE' }
        ],
        healthChart: [
          { name: '健康', value: distributions.health.healthy, color: '#34C759' },
          { name: '慢性病', value: distributions.health.chronic, color: '#FF9500' },
          { name: '重症', value: distributions.health.critical, color: '#FF3B30' }
        ],
        serviceChart: [
          { name: '每日', value: distributions.service.daily, color: '#007AFF' },
          { name: '每周', value: distributions.service.weekly, color: '#5856D6' },
          { name: '每月', value: distributions.service.monthly, color: '#AF52DE' }
        ],
        genderChart: [
          { name: '男性', value: distributions.gender.male, color: '#007AFF' },
          { name: '女性', value: distributions.gender.female, color: '#FF69B4' }
        ]
      };
    },

    /**
     * 计算百分比
     */
    calculatePercentage(stats, key) {
      const total = stats.total || 1;
      const value = this.getStatValue(stats, key);
      
      switch (key) {
        case 'activeMembers':
        case 'pendingService':
        case 'criticalMembers':
        case 'elderlyMembers':
          return Math.round((value / total) * 100);
        default:
          return null;
      }
    },

    /**
     * 计算服务覆盖率
     */
    calculateServiceRate(stats) {
      const total = stats.total || 1;
      const served = (stats.total || 0) - (stats.pendingService || 0);
      return Math.round((served / total) * 100);
    },

    /**
     * 计算月增长率
     */
    calculateMonthlyGrowth(stats) {
      const current = stats.total || 0;
      const lastMonth = stats.lastMonth?.total || current;
      
      if (lastMonth === 0) return 0;
      
      const growth = ((current - lastMonth) / lastMonth) * 100;
      return Math.round(growth * 10) / 10; // 保疙1位小数
    },

    /**
     * 计算趋势
     */
    calculateTrend(current, previous) {
      if (!previous || previous === 0) return null;
      
      const change = current - previous;
      const percentage = Math.abs((change / previous) * 100).toFixed(1);
      
      return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        value: Math.abs(change),
        percentage: percentage,
        text: change > 0 ? `+${change}` : change < 0 ? `${change}` : '0'
      };
    },

    /**
     * 数字动画
     */
    animateNumbers() {
      this.data.processedStats.forEach((stat, index) => {
        if (typeof stat.value === 'number') {
          this.animateNumber(stat.key, 0, stat.value, 1000);
        }
      });
    },

    /**
     * 单个数字动画 - 微信小程序兼容版本
     */
    animateNumber(key, start, end, duration) {
      // 防止重复动画
      if (this.animations && this.animations[key]) {
        clearTimeout(this.animations[key]);
      }
      
      // 初始化动画对象
      if (!this.animations) {
        this.animations = {};
      }
      
      const startTime = Date.now();
      const frameDuration = 16; // 约60fps
      
      const animate = () => {
        try {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // 使用easeOutQuart缓动函数
          const easeProgress = 1 - Math.pow(1 - progress, 4);
          const currentValue = Math.round(start + (end - start) * easeProgress);
          
          // 查找统计项索引
          const statIndex = this.data.processedStats.findIndex(s => s.key === key);
          if (statIndex >= 0) {
            const updateKey = `processedStats[${statIndex}].displayValue`;
            this.setData({
              [updateKey]: currentValue
            });
          }
          
          if (progress < 1) {
            // 使用setTimeout实现动画帧
            this.animations[key] = setTimeout(animate, frameDuration);
          } else {
            // 动画完成，清理资源
            delete this.animations[key];
          }
        } catch (error) {
          console.error('动画执行错误:', error);
          // 清理异常动画
          if (this.animations && this.animations[key]) {
            clearTimeout(this.animations[key]);
            delete this.animations[key];
          }
        }
      };
      
      // 启动动画
      this.animations[key] = setTimeout(animate, frameDuration);
    },

    /**
     * 统计项点击
     */
    onStatItemTap(event) {
      const { stat } = event.currentTarget.dataset;
      
      // 添加触觉反馈
      wx.vibrateShort({
        type: 'light',
        fail: () => {}
      });
      
      this.triggerEvent('statclick', { stat });
      
      // 触发筛选
      this.triggerFilterByStats(stat.key);
    },

    /**
     * 根据统计项触发筛选
     */
    triggerFilterByStats(statKey) {
      let filters = {};
      
      switch (statKey) {
        case 'pendingService':
          // 筛选待服务成员（可能是每日服务频率的成员）
          filters = { serviceFrequency: 'daily' };
          break;
        case 'activeMembers':
          // 筛选健康的成员
          filters = { healthStatus: 'healthy' };
          break;
        default:
          return;
      }
      
      this.triggerEvent('quickfilter', { filters });
    },

    /**
     * 切换显示模式
     */
    toggleDisplayMode() {
      const newMode = this.data.displayMode === 'simple' ? 'detailed' : 'simple';
      this.setData({ displayMode: newMode });
      
      this.triggerEvent('displaymodechange', { mode: newMode });
    },

    /**
     * 刷新统计数据
     */
    onRefresh() {
      this.triggerEvent('refresh');
      
      // 添加刷新动画
      this.setData({ animationClass: 'refresh' });
      setTimeout(() => {
        this.setData({ animationClass: '' });
      }, 500);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.processStatistics();
    },
    
    detached() {
      // 清理所有动画
      if (this.animations) {
        Object.keys(this.animations).forEach(key => {
          if (this.animations[key]) {
            clearTimeout(this.animations[key]);
          }
        });
        this.animations = null;
      }
    }
  }
});