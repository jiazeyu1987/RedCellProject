// pages/health/index.js
const app = getApp();

Page({
  data: {
    lastUpdateTime: '',
    trendFilter: 'week',
    
    // 健康指标
    healthMetrics: [
      {
        type: 'bloodPressure',
        name: '血压',
        value: '120/80',
        unit: 'mmHg',
        status: 'normal',
        statusText: '正常',
        trend: '↓',
        color: '#52C41A',
        icon: '🩸'
      },
      {
        type: 'bloodSugar',
        name: '血糖',
        value: '5.6',
        unit: 'mmol/L',
        status: 'normal',
        statusText: '正常',
        trend: '→',
        color: '#1890FF',
        icon: '🍯'
      },
      {
        type: 'heartRate',
        name: '心率',
        value: '72',
        unit: '次/分',
        status: 'normal',
        statusText: '正常',
        trend: '↑',
        color: '#FF6B6B',
        icon: '❤️'
      },
      {
        type: 'weight',
        name: '体重',
        value: '65.5',
        unit: 'kg',
        status: 'normal',
        statusText: '正常',
        trend: '↓',
        color: '#FAAD14',
        icon: '⚖️'
      }
    ],
    
    // 图表图例
    chartLegend: [
      { type: 'bloodPressure', name: '血压', color: '#52C41A' },
      { type: 'bloodSugar', name: '血糖', color: '#1890FF' },
      { type: 'heartRate', name: '心率', color: '#FF6B6B' }
    ],
    
    // 最近记录
    recentRecords: [
      {
        id: 1,
        date: '12-25',
        time: '09:30',
        type: '上门体检',
        values: [
          { name: '血压', value: '120/80', unit: 'mmHg' },
          { name: '血糖', value: '5.6', unit: 'mmol/L' },
          { name: '心率', value: '72', unit: '次/分' }
        ],
        note: '身体状况良好，各项指标正常',
        overallStatus: 'normal',
        statusLabel: '正常'
      },
      {
        id: 2,
        date: '12-22',
        time: '14:20',
        type: '自我记录',
        values: [
          { name: '血压', value: '135/85', unit: 'mmHg' },
          { name: '血糖', value: '6.2', unit: 'mmol/L' }
        ],
        note: '感觉有些疲劳',
        overallStatus: 'warning',
        statusLabel: '注意'
      },
      {
        id: 3,
        date: '12-20',
        time: '10:15',
        type: '上门体检',
        values: [
          { name: '血压', value: '118/78', unit: 'mmHg' },
          { name: '血糖', value: '5.4', unit: 'mmol/L' },
          { name: '心率', value: '68', unit: '次/分' },
          { name: '体重', value: '66.0', unit: 'kg' }
        ],
        overallStatus: 'normal',
        statusLabel: '正常'
      }
    ],
    
    // 健康建议
    healthSuggestions: [
      {
        id: 1,
        icon: '🏃',
        title: '适度运动',
        description: '建议每天进行30分钟的轻度运动，如散步、太极拳等',
        actionText: '查看运动计划',
        action: 'exercise'
      },
      {
        id: 2,
        icon: '🥗',
        title: '均衡饮食',
        description: '注意控制盐分摄入，多吃新鲜蔬菜水果',
        actionText: '饮食建议',
        action: 'diet'
      },
      {
        id: 3,
        icon: '😴',
        title: '规律作息',
        description: '保持充足睡眠，每天7-8小时，避免熬夜',
        actionText: '睡眠指导',
        action: 'sleep'
      }
    ],
    
    // 弹窗相关
    showRecordModal: false,
    showDetailModal: false,
    detailTitle: '',
    detailContent: '',
    
    // 记录数据
    recordData: {
      systolic: '',
      diastolic: '',
      bloodSugar: '',
      heartRate: '',
      weight: '',
      note: ''
    }
  },

  onLoad: function() {
    this.initData();
    this.initChart();
  },

  onShow: function() {
    this.setData({
      canSubmit: true
    });
    this.loadHealthData();
  },

  // 初始化数据
  initData() {
    const now = new Date();
    this.setData({
      lastUpdateTime: app.formatDate(now) + ' ' + app.formatTime(now)
    });
  },

  // 加载健康数据
  loadHealthData() {
    // 模拟从后台获取最新健康数据
    // 这里可以调用云函数获取真实数据
  },

  // 初始化图表
  initChart() {
    const ctx = wx.createCanvasContext('healthChart', this);
    this.drawChart(ctx);
  },

  // 绘制图表
  drawChart(ctx) {
    // 图表区域
    const chartArea = {
      left: 60,
      top: 40,
      width: 580,
      height: 280
    };

    // 模拟数据
    const data = this.generateChartData();
    
    // 清空画布
    ctx.clearRect(0, 0, 700, 400);
    
    // 绘制网格线
    this.drawGrid(ctx, chartArea);
    
    // 绘制数据线
    this.drawDataLines(ctx, chartArea, data);
    
    // 绘制坐标轴
    this.drawAxes(ctx, chartArea, data);
    
    ctx.draw();
  },

  // 生成图表数据
  generateChartData() {
    const days = this.data.trendFilter === 'week' ? 7 : 
                 this.data.trendFilter === 'month' ? 30 : 365;
    
    const data = {
      labels: [],
      bloodPressure: [],
      bloodSugar: [],
      heartRate: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.labels.push(date.getDate());
      
      // 模拟健康数据波动
      data.bloodPressure.push(115 + Math.random() * 20);
      data.bloodSugar.push(5.0 + Math.random() * 2);
      data.heartRate.push(65 + Math.random() * 20);
    }

    return data;
  },

  // 绘制网格线
  drawGrid(ctx, area) {
    ctx.setStrokeStyle('#E5E5E5');
    ctx.setLineWidth(0.5);

    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = area.top + (area.height * i) / 5;
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.left + area.width, y);
      ctx.stroke();
    }

    // 垂直网格线
    for (let i = 0; i <= 6; i++) {
      const x = area.left + (area.width * i) / 6;
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.top + area.height);
      ctx.stroke();
    }
  },

  // 绘制数据线
  drawDataLines(ctx, area, data) {
    const colors = ['#52C41A', '#1890FF', '#FF6B6B'];
    const datasets = [data.bloodPressure, data.bloodSugar, data.heartRate];
    const maxValues = [150, 10, 100]; // 各指标的最大值
    
    datasets.forEach((dataset, index) => {
      ctx.setStrokeStyle(colors[index]);
      ctx.setLineWidth(3);
      ctx.beginPath();
      
      dataset.forEach((value, i) => {
        const x = area.left + (area.width * i) / (dataset.length - 1);
        const y = area.top + area.height - (value / maxValues[index]) * area.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // 绘制数据点
      ctx.setFillStyle(colors[index]);
      dataset.forEach((value, i) => {
        const x = area.left + (area.width * i) / (dataset.length - 1);
        const y = area.top + area.height - (value / maxValues[index]) * area.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  },

  // 绘制坐标轴
  drawAxes(ctx, area, data) {
    ctx.setFillStyle('#666');
    ctx.setFontSize(20);
    
    // X轴标签
    data.labels.forEach((label, index) => {
      if (index % Math.ceil(data.labels.length / 6) === 0) {
        const x = area.left + (area.width * index) / (data.labels.length - 1);
        ctx.fillText(label, x - 10, area.top + area.height + 25);
      }
    });
  },

  // 切换趋势过滤器
  changeTrendFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      trendFilter: filter
    });
    this.initChart();
  },

  // 查看指标详情
  viewMetricDetail(e) {
    const type = e.currentTarget.dataset.type;
    const metric = this.data.healthMetrics.find(m => m.type === type);
    
    if (metric) {
      let content = `当前${metric.name}：${metric.value}${metric.unit}\n状态：${metric.statusText}\n\n`;
      
      switch (type) {
        case 'bloodPressure':
          content += '正常血压范围：90-140/60-90 mmHg\n建议：保持规律作息，适度运动，控制盐分摄入';
          break;
        case 'bloodSugar':
          content += '正常血糖范围：3.9-6.1 mmol/L（空腹）\n建议：控制饮食，少吃甜食，定期检测';
          break;
        case 'heartRate':
          content += '正常心率范围：60-100次/分钟\n建议：适度运动增强心肺功能，避免剧烈运动';
          break;
        case 'weight':
          content += 'BMI正常范围：18.5-24\n建议：均衡饮食，适量运动，保持健康体重';
          break;
      }
      
      this.setData({
        showDetailModal: true,
        detailTitle: metric.name + '详情',
        detailContent: content
      });
    }
  },

  // 快速记录
  quickRecord() {
    this.setData({
      showRecordModal: true,
      recordData: {
        systolic: '',
        diastolic: '',
        bloodSugar: '',
        heartRate: '',
        weight: '',
        note: ''
      }
    });
  },

  // 记录数据输入
  onRecordInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`recordData.${field}`]: value
    });
  },

  // 保存记录
  saveRecord() {
    const data = this.data.recordData;
    
    // 验证数据
    if (!data.systolic && !data.diastolic && !data.bloodSugar && !data.heartRate && !data.weight) {
      wx.showToast({
        title: '请至少填写一项数据',
        icon: 'none'
      });
      return;
    }

    // 数据验证
    if (data.systolic && (data.systolic < 60 || data.systolic > 200)) {
      wx.showToast({
        title: '收缩压数值异常',
        icon: 'none'
      });
      return;
    }

    if (data.diastolic && (data.diastolic < 40 || data.diastolic > 120)) {
      wx.showToast({
        title: '舒张压数值异常',
        icon: 'none'
      });
      return;
    }

    app.showLoading('保存中...');
    
    // 模拟保存到后台
    setTimeout(() => {
      app.hideLoading();
      this.setData({
        showRecordModal: false
      });
      
      wx.showToast({
        title: '记录保存成功',
        icon: 'success'
      });
      
      // 刷新数据
      this.loadHealthData();
    }, 1000);
  },

  // 关闭记录弹窗
  closeRecordModal() {
    this.setData({
      showRecordModal: false
    });
  },

  // 关闭详情弹窗
  closeDetailModal() {
    this.setData({
      showDetailModal: false
    });
  },

  // 查看所有记录
  viewAllRecords() {
    wx.navigateTo({
      url: '/pages/health-records/index'
    });
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const record = e.currentTarget.dataset.record;
    // 这里可以导航到记录详情页面
    wx.showToast({
      title: '查看记录详情',
      icon: 'none'
    });
  },

  // 处理建议操作
  handleSuggestionAction(e) {
    const action = e.currentTarget.dataset.action;
    
    switch (action) {
      case 'exercise':
        this.setData({
          showDetailModal: true,
          detailTitle: '运动计划建议',
          detailContent: '每日运动建议：\n\n1. 早晨：散步20-30分钟\n2. 下午：太极拳或广场舞30分钟\n3. 晚饭后：散步15-20分钟\n\n注意事项：\n• 运动前做好热身\n• 避免剧烈运动\n• 如有不适立即停止\n• 运动后适当休息'
        });
        break;
      case 'diet':
        this.setData({
          showDetailModal: true,
          detailTitle: '饮食建议',
          detailContent: '健康饮食指导：\n\n1. 少盐少油：每日盐分控制在6g以内\n2. 多吃蔬果：每日5种不同颜色蔬果\n3. 适量蛋白：鱼肉蛋奶豆制品\n4. 粗细搭配：适量粗粮代替精米面\n\n禁忌食物：\n• 高盐腌制品\n• 高糖甜食\n• 油炸食品\n• 烟酒'
        });
        break;
      case 'sleep':
        this.setData({
          showDetailModal: true,
          detailTitle: '睡眠指导',
          detailContent: '良好睡眠习惯：\n\n作息规律：\n• 每晚10-11点上床\n• 早晨6-7点起床\n• 午休不超过30分钟\n\n睡前准备：\n• 睡前1小时不看手机\n• 保持房间安静黑暗\n• 可以听轻音乐放松\n• 避免睡前大量饮水\n\n如有失眠问题，建议咨询医生'
        });
        break;
    }
  },

  // 图表触摸事件
  chartTouchStart(e) {
    // 处理图表交互
  },

  chartTouchMove(e) {
    // 处理图表拖拽
  },

  chartTouchEnd(e) {
    // 处理图表触摸结束
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHealthData();
    this.initChart();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '我的健康档案',
      path: '/pages/health/index'
    };
  }
});