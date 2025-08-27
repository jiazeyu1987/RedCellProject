// pages/health/index.js
// 已将所有云函数调用替换为本地API调用 - 更新时间: 2024-01-27
const { API, http, getTestToken } = require('../../config/api.js');
const app = getApp();

Page({
  data: {
    lastUpdateTime: '',
    trendFilter: 'week',
    loading: false,
    
    // 健康指标
    healthMetrics: [],
    
    // 图表图例
    chartLegend: [
      { type: 'bloodPressure', name: '血压', color: '#52C41A' },
      { type: 'bloodSugar', name: '血糖', color: '#1890FF' },
      { type: 'heartRate', name: '心率', color: '#FF6B6B' }
    ],
    
    // 最近记录
    recentRecords: [],
    
    // 健康建议
    healthSuggestions: [],
    
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
    this.checkAuthAndLoad();
  },

  // 检查用户认证并加载数据
  async checkAuthAndLoad() {
    // 尝试获取测试token
    try {
      const existingToken = wx.getStorageSync('token');
      if (!existingToken) {
        console.log('未找到token，开始获取测试token...');
        await getTestToken();
      } else {
        console.log('已找到token:', existingToken.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('获取测试token失败:', error);
      wx.showToast({
        title: '获取测试token失败，将显示模拟数据',
        icon: 'none',
        duration: 3000
      });
    }
    
    // 加载健康数据
    this.loadHealthData();
  },

  // 初始化数据
  initData() {
    const now = new Date();
    this.setData({
      lastUpdateTime: this.formatDateTime(now)
    });
  },

  // 加载健康数据
  async loadHealthData() {
    this.setData({ loading: true });
    
    try {
      // 并行加载数据
      await Promise.all([
        this.loadHealthMetrics(),
        this.loadRecentRecords(),
        this.loadHealthSuggestions()
      ]);
      
      // 更新最后更新时间
      const now = new Date();
      this.setData({
        lastUpdateTime: this.formatDateTime(now)
      });
      
    } catch (error) {
      console.error('加载健康数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载健康指标
  async loadHealthMetrics() {
    try {
      console.log('开始调用健康记录API获取最新指标数据:', API.HEALTH.RECORDS);
      
      // 直接从健康记录中获取最新数据来构建指标
      const result = await http.get(API.HEALTH.RECORDS, {
        limit: 50, // 获取足够多的记录来确保有各种类型的最新数据
        page: 1
      });
      
      console.log('健康记录API响应（用于指标）:', result);
      
      if (result.success && result.data.records && result.data.records.length > 0) {
        // 从健康记录中提取最新的指标数据
        const latestMetrics = this.extractLatestMetricsFromRecords(result.data.records);
        
        if (latestMetrics.length > 0) {
          this.setData({ healthMetrics: latestMetrics });
          console.log('从健康记录中提取的最新指标:', latestMetrics);
          return;
        }
      }
      
      // 如果没有记录或API调用失败，使用模拟数据
      console.log('无健康记录或API调用失败，使用模拟数据');
      this.setMockHealthMetrics();
      
    } catch (error) {
      console.error('加载健康指标失败:', error);
      this.setMockHealthMetrics();
    }
  },

  // 从健康记录中提取最新的指标数据
  extractLatestMetricsFromRecords(records) {
    // 按类型分组并找出最新记录
    const latestByType = {};
    
    records.forEach(record => {
      const type = record.type;
      const recordTime = new Date(record.recordTime || record.record_time);
      
      if (!latestByType[type] || recordTime > new Date(latestByType[type].recordTime || latestByType[type].record_time)) {
        latestByType[type] = record;
      }
    });
    
    // 转换为健康指标格式
    const metricsInfo = {
      'bloodPressure': { name: '血压', unit: 'mmHg', color: '#52C41A', icon: '🩸' },
      'bloodSugar': { name: '血糖', unit: 'mmol/L', color: '#1890FF', icon: '🍯' },
      'heartRate': { name: '心率', unit: '次/分', color: '#FF6B6B', icon: '❤️' },
      'weight': { name: '体重', unit: 'kg', color: '#FAAD14', icon: '⚖️' }
    };
    
    const metrics = [];
    
    // 确保按固定顺序显示所有指标
    Object.keys(metricsInfo).forEach(type => {
      const info = metricsInfo[type];
      const record = latestByType[type];
      
      let value = '--';
      let status = 'normal';
      let unit = info.unit;
      
      if (record && record.value) {
        value = record.value;
        status = record.status || 'normal';
        unit = record.unit || info.unit;
      }
      
      metrics.push({
        type: type,
        name: info.name,
        value: value,
        unit: unit,
        status: status,
        statusText: this.getStatusText(status),
        trend: '→', // 默认趋势
        color: info.color,
        icon: info.icon
      });
    });
    
    return metrics;
  },

  // 设置模拟健康指标数据
  setMockHealthMetrics() {
    // 直接设置展示用的健康指标数据
    const mockMetrics = [
      {
        type: 'bloodPressure',
        name: '血压',
        value: '120/80',
        unit: 'mmHg',
        status: 'normal',
        statusText: '正常',
        trend: '→',
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
        trend: '→',
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
        trend: '→',
        color: '#FAAD14',
        icon: '⚖️'
      }
    ];
    
    // 直接设置数据，不需要额外处理
    this.setData({ healthMetrics: mockMetrics });
    console.log('设置模拟健康指标数据（无实际记录或API异常）:', mockMetrics);
  },

  // 加载最近记录
  async loadRecentRecords() {
    try {
      console.log('开始调用localhost API:', API.HEALTH.RECORDS);
      
      const result = await http.get(API.HEALTH.RECORDS, {
        limit: 10,
        page: 1
      });
      
      console.log('最近记录API响应:', result);
      
      if (result.success && result.data.records) {
        const records = result.data.records || [];
        const formattedRecords = this.formatRecentRecords(records);
        this.setData({ recentRecords: formattedRecords });
        console.log('最近记录加载成功:', formattedRecords);
      } else {
        console.log('服务器返回失败，使用模拟数据');
        this.setMockRecentRecords();
      }
    } catch (error) {
      console.error('加载最近记录失败:', error);
      this.setMockRecentRecords();
    }
  },

  // 格式化最近记录数据
  formatRecentRecords(records) {
    const typeMap = {
      'bloodPressure': '血压',
      'bloodSugar': '血糖', 
      'heartRate': '心率',
      'weight': '体重',
      'temperature': '体温'
    };
    
    // 按记录时间分组，每个时间点显示一条记录
    const groupedRecords = {};
    
    records.forEach(record => {
      const recordTime = record.recordTime || record.record_time;
      if (!recordTime) return;
      
      const date = new Date(recordTime);
      const dateStr = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      }).replace(/\//g, '-');
      const timeStr = date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const key = `${dateStr}_${timeStr}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          id: Date.now() + Math.random(),
          date: dateStr,
          time: timeStr,
          type: '快速记录',
          values: [],
          note: record.notes || '',
          overallStatus: 'normal',
          statusLabel: '正常'
        };
      }
      
      groupedRecords[key].values.push({
        name: typeMap[record.type] || record.type,
        value: record.value,
        unit: record.unit || ''
      });
    });
    
    return Object.values(groupedRecords)
      .sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`))
      .slice(0, 5);
  },

  // 设置模拟最近记录数据
  setMockRecentRecords() {
    const mockRecords = [
      {
        id: 1,
        date: '2024-01-27',
        time: '09:30',
        type: '快速记录',
        values: [
          { name: '血压', value: '125/82', unit: 'mmHg' },
          { name: '心率', value: '72', unit: '次/分' }
        ],
        note: '晨间测量（模拟数据）',
        overallStatus: 'normal',
        statusLabel: '正常'
      },
      {
        id: 2,
        date: '2024-01-27',
        time: '08:00',
        type: '快速记录',
        values: [
          { name: '血糖', value: '5.8', unit: 'mmol/L' },
          { name: '体重', value: '65.5', unit: 'kg' }
        ],
        note: '餐前测量（模拟数据）',
        overallStatus: 'normal',
        statusLabel: '正常'
      }
    ];
    
    this.setData({ recentRecords: mockRecords });
  },

  // 加载健康建议
  async loadHealthSuggestions() {
    try {
      console.log('开始调用localhost API:', API.HEALTH.SUGGESTIONS);
      
      const result = await http.get(API.HEALTH.SUGGESTIONS);
      
      console.log('健康建议API响应:', result);
      
      if (result.success) {
        const suggestions = result.data.suggestions || [];
        this.setData({ healthSuggestions: suggestions });
        console.log('健康建议加载成功:', suggestions);
      } else {
        console.log('服务器返回失败，使用模拟数据');
        this.setMockHealthSuggestions();
      }
    } catch (error) {
      console.error('加载健康建议失败:', error);
      this.setMockHealthSuggestions();
    }
  },

  // 设置模拟健康建议数据
  setMockHealthSuggestions() {
    const suggestions = [
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
    ];
    
    this.setData({ healthSuggestions: suggestions });
  },

  // 将简单数据转换为指标数据
  convertSimpleDataToMetrics(simpleData) {
    const metricsInfo = {
      'bloodPressure': { name: '血压', unit: 'mmHg', color: '#52C41A', icon: '🩸' },
      'bloodSugar': { name: '血糖', unit: 'mmol/L', color: '#1890FF', icon: '🍯' },
      'heartRate': { name: '心率', unit: '次/分', color: '#FF6B6B', icon: '❤️' },
      'weight': { name: '体重', unit: 'kg', color: '#FAAD14', icon: '⚖️' }
    };
    
    return simpleData.map(item => {
      const info = metricsInfo[item.type] || { name: item.type, unit: '', color: '#999', icon: '📊' };
      const value = this.safeGetValue(item, 'value') || this.safeGetValue(item, 'latestValue', '--');
      const status = this.safeGetValue(item, 'status', 'normal');
      
      return {
        type: item.type,
        name: info.name,
        value: value,
        unit: this.safeGetValue(item, 'unit', info.unit),
        status: status,
        statusText: this.getStatusText(status),
        trend: '→', // 默认趋势
        color: info.color,
        icon: info.icon
      };
    });
  },

  // 将记录数据转换为指标数据
  convertRecordsToMetrics(records) {
    // 按类型分组并获取最新记录
    const latestRecords = {};
    
    records.forEach(record => {
      const type = record.type;
      if (!latestRecords[type] || 
          new Date(record.record_time || record.recordTime) > new Date(latestRecords[type].record_time || latestRecords[type].recordTime)) {
        latestRecords[type] = record;
      }
    });
    
    // 转换为指标数据
    const metricsInfo = {
      'bloodPressure': { name: '血压', unit: 'mmHg', color: '#52C41A', icon: '🩸' },
      'bloodSugar': { name: '血糖', unit: 'mmol/L', color: '#1890FF', icon: '🍯' },
      'heartRate': { name: '心率', unit: '次/分', color: '#FF6B6B', icon: '❤️' },
      'weight': { name: '体重', unit: 'kg', color: '#FAAD14', icon: '⚖️' }
    };
    
    return Object.keys(latestRecords).map(type => {
      const record = latestRecords[type];
      const info = metricsInfo[type] || { name: type, unit: '', color: '#999', icon: '📊' };
      
      // 处理value字段，可能是JSON格式
      let value = '--';
      if (record.value) {
        if (typeof record.value === 'string') {
          try {
            const parsedValue = JSON.parse(record.value);
            if (type === 'bloodPressure' && parsedValue.systolic && parsedValue.diastolic) {
              value = `${parsedValue.systolic}/${parsedValue.diastolic}`;
            } else if (parsedValue.value) {
              value = parsedValue.value.toString();
            }
          } catch (e) {
            value = record.value; // 如果不是JSON，直接使用
          }
        } else if (typeof record.value === 'object') {
          if (type === 'bloodPressure' && record.value.systolic && record.value.diastolic) {
            value = `${record.value.systolic}/${record.value.diastolic}`;
          } else if (record.value.value) {
            value = record.value.value.toString();
          }
        } else {
          value = record.value.toString();
        }
      }
      
      const status = this.safeGetValue(record, 'status', 'normal');
      
      return {
        type: type,
        name: info.name,
        value: value,
        unit: this.safeGetValue(record, 'unit', info.unit),
        status: status,
        statusText: this.getStatusText(status),
        trend: '→', // 默认趋势，可以后续根据历史数据计算
        color: info.color,
        icon: info.icon
      };
    });
  },

  // 安全获取数据的工具函数
  safeGetValue(obj, key, defaultValue = '--') {
    if (!obj || obj[key] === undefined || obj[key] === null || obj[key] === 'undefined') {
      return defaultValue;
    }
    return obj[key];
  },

  // 安全获取数值类型数据
  safeGetNumber(obj, key, defaultValue = 0) {
    const value = this.safeGetValue(obj, key, defaultValue);
    return isNaN(Number(value)) ? defaultValue : Number(value);
  },

  // 处理健康指标数据
  processHealthMetrics(records) {
    const metricsMap = {};
    
    // 按类型分组
    records.forEach(record => {
      if (!metricsMap[record.type]) {
        metricsMap[record.type] = [];
      }
      metricsMap[record.type].push(record);
    });
    
    const metrics = [];
    
    // 血压
    if (metricsMap.bloodPressure && metricsMap.bloodPressure.length > 0) {
      const latest = metricsMap.bloodPressure[0];
      const value = this.safeGetValue(latest, 'value') || this.safeGetValue(latest, 'latestValue', '--');
      const status = this.safeGetValue(latest, 'status', 'normal');
      
      metrics.push({
        type: 'bloodPressure',
        name: '血压',
        value: value,
        unit: this.safeGetValue(latest, 'unit', 'mmHg'),
        status: status,
        statusText: this.getStatusText(status),
        trend: this.calculateTrend(metricsMap.bloodPressure),
        color: '#52C41A',
        icon: '🩸'
      });
    }
    
    // 血糖
    if (metricsMap.bloodSugar && metricsMap.bloodSugar.length > 0) {
      const latest = metricsMap.bloodSugar[0];
      const value = this.safeGetValue(latest, 'value') || this.safeGetValue(latest, 'latestValue', '--');
      const status = this.safeGetValue(latest, 'status', 'normal');
      
      metrics.push({
        type: 'bloodSugar',
        name: '血糖',
        value: value,
        unit: this.safeGetValue(latest, 'unit', 'mmol/L'),
        status: status,
        statusText: this.getStatusText(status),
        trend: this.calculateTrend(metricsMap.bloodSugar),
        color: '#1890FF',
        icon: '🍯'
      });
    }
    
    // 心率
    if (metricsMap.heartRate && metricsMap.heartRate.length > 0) {
      const latest = metricsMap.heartRate[0];
      const value = this.safeGetValue(latest, 'value') || this.safeGetValue(latest, 'latestValue', '--');
      const status = this.safeGetValue(latest, 'status', 'normal');
      
      metrics.push({
        type: 'heartRate',
        name: '心率',
        value: value,
        unit: this.safeGetValue(latest, 'unit', '次/分'),
        status: status,
        statusText: this.getStatusText(status),
        trend: this.calculateTrend(metricsMap.heartRate),
        color: '#FF6B6B',
        icon: '❤️'
      });
    }
    
    // 体重
    if (metricsMap.weight && metricsMap.weight.length > 0) {
      const latest = metricsMap.weight[0];
      const value = this.safeGetValue(latest, 'value') || this.safeGetValue(latest, 'latestValue', '--');
      const status = this.safeGetValue(latest, 'status', 'normal');
      
      metrics.push({
        type: 'weight',
        name: '体重',
        value: value,
        unit: this.safeGetValue(latest, 'unit', 'kg'),
        status: status,
        statusText: this.getStatusText(status),
        trend: this.calculateTrend(metricsMap.weight),
        color: '#FAAD14',
        icon: '⚖️'
      });
    }
    
    return metrics;
  },

  // 处理最近记录
  processRecentRecords(records) {
    const groupedRecords = {};
    
    records.forEach(record => {
      const date = new Date(record.recordTime).toLocaleDateString();
      const time = new Date(record.recordTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const key = `${date}_${time}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          id: Date.now() + Math.random(),
          date: date.replace(/\//g, '-'),
          time: time,
          type: '上门体检',
          values: [],
          note: record.notes || '',
          overallStatus: 'normal',
          statusLabel: '正常'
        };
      }
      
      groupedRecords[key].values.push({
        name: this.getMetricName(record.type),
        value: record.value,
        unit: record.unit || ''
      });
    });
    
    return Object.values(groupedRecords).slice(0, 5);
  },

  // 获取指标名称
  getMetricName(type) {
    const names = {
      'bloodPressure': '血压',
      'bloodSugar': '血糖',
      'heartRate': '心率',
      'weight': '体重',
      'temperature': '体温'
    };
    return names[type] || type;
  },

  // 获取状态文本
  getStatusText(status) {
    // 安全处理undefined、null或空字符串
    if (!status || status === 'undefined' || status === null) {
      return '正常';
    }
    
    const statusMap = {
      'normal': '正常',
      'warning': '注意',
      'danger': '危险'
    };
    
    return statusMap[status] || '正常';
  },

  // 计算趋势
  calculateTrend(records) {
    if (!records || records.length < 2) return '→';
    
    const latest = records[0];
    const previous = records[1];
    
    // 安全获取数值，优先使用value，其次latestValue
    const latestValue = this.safeGetNumber(latest, 'value') || this.safeGetNumber(latest, 'latestValue');
    const previousValue = this.safeGetNumber(previous, 'value') || this.safeGetNumber(previous, 'latestValue');
    
    if (latestValue === 0 || previousValue === 0) return '→';
    
    if (latestValue > previousValue) return '↑';
    if (latestValue < previousValue) return '↓';
    return '→';
  },

  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
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
      // 安全获取数据，防止undefined显示
      const safeValue = this.safeGetValue(metric, 'value', '--');
      const safeUnit = this.safeGetValue(metric, 'unit', '');
      const safeName = this.safeGetValue(metric, 'name', '健康指标');
      const safeStatusText = this.safeGetValue(metric, 'statusText', '正常');
      
      let content = `当前${safeName}：${safeValue}${safeUnit}\n状态：${safeStatusText}\n\n`;
      
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
        default:
          content += '请咨询医生获取专业建议';
          break;
      }
      
      this.setData({
        showDetailModal: true,
        detailTitle: safeName + '详情',
        detailContent: content
      });
    } else {
      // 如果找不到指标数据，显示错误信息
      wx.showToast({
        title: '数据不存在',
        icon: 'none'
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

  // 更新本地健康指标显示
  updateLocalHealthMetrics(newRecords) {
    console.log('开始更新本地健康指标:', newRecords);
    
    const currentMetrics = [...this.data.healthMetrics];
    const metricsInfo = {
      'bloodPressure': { name: '血压', unit: 'mmHg', color: '#52C41A', icon: '🩸' },
      'bloodSugar': { name: '血糖', unit: 'mmol/L', color: '#1890FF', icon: '🍯' },
      'heartRate': { name: '心率', unit: '次/分', color: '#FF6B6B', icon: '❤️' },
      'weight': { name: '体重', unit: 'kg', color: '#FAAD14', icon: '⚖️' }
    };
    
    // 更新或添加新的指标数据
    newRecords.forEach(record => {
      const existingIndex = currentMetrics.findIndex(m => m.type === record.type);
      const info = metricsInfo[record.type];
      
      if (info) {
        const updatedMetric = {
          type: record.type,
          name: info.name,
          value: record.value,
          unit: record.unit,
          status: record.status,
          statusText: this.getStatusText(record.status),
          trend: '→', // 默认趋势
          color: info.color,
          icon: info.icon
        };
        
        if (existingIndex >= 0) {
          // 更新现有指标
          currentMetrics[existingIndex] = updatedMetric;
        } else {
          // 添加新指标
          currentMetrics.push(updatedMetric);
        }
      }
    });
    
    // 确保按固定顺序显示所有指标（即使没有数据也要显示）
    const orderedTypes = ['bloodPressure', 'bloodSugar', 'heartRate', 'weight'];
    const orderedMetrics = [];
    
    orderedTypes.forEach(type => {
      const existing = currentMetrics.find(m => m.type === type);
      if (existing) {
        orderedMetrics.push(existing);
      } else {
        // 如果没有数据，显示默认的'--'
        const info = metricsInfo[type];
        orderedMetrics.push({
          type: type,
          name: info.name,
          value: '--',
          unit: info.unit,
          status: 'normal',
          statusText: '正常',
          trend: '→',
          color: info.color,
          icon: info.icon
        });
      }
    });
    
    this.setData({ healthMetrics: orderedMetrics });
    console.log('本地健康指标已更新:', orderedMetrics);
  },

  // 保存记录
  async saveRecord() {
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

    wx.showLoading({ title: '保存中...' });
    
    try {
      const records = [];
      
      // 血压记录
      if (data.systolic && data.diastolic) {
        const systolic = parseFloat(data.systolic);
        const diastolic = parseFloat(data.diastolic);
        const bpValue = `${systolic}/${diastolic}`;
        
        let status = 'normal';
        if (systolic >= 140 || diastolic >= 90) {
          status = 'warning';
        } else if (systolic >= 160 || diastolic >= 100) {
          status = 'danger';
        }
        
        records.push({
          type: 'bloodPressure',
          value: bpValue,
          unit: 'mmHg',
          status: status,
          notes: data.note || ''
        });
      }
      
      // 血糖记录
      if (data.bloodSugar) {
        const bloodSugar = parseFloat(data.bloodSugar);
        let status = 'normal';
        if (bloodSugar >= 7.0) {
          status = 'warning';
        } else if (bloodSugar >= 11.1) {
          status = 'danger';
        }
        
        records.push({
          type: 'bloodSugar',
          value: bloodSugar.toString(),
          unit: 'mmol/L',
          status: status,
          notes: data.note || ''
        });
      }
      
      // 心率记录
      if (data.heartRate) {
        const heartRate = parseFloat(data.heartRate);
        let status = 'normal';
        if (heartRate < 60 || heartRate > 100) {
          status = 'warning';
        } else if (heartRate < 50 || heartRate > 120) {
          status = 'danger';
        }
        
        records.push({
          type: 'heartRate',
          value: heartRate.toString(),
          unit: '次/分',
          status: status,
          notes: data.note || ''
        });
      }
      
      // 体重记录
      if (data.weight) {
        const weight = parseFloat(data.weight);
        records.push({
          type: 'weight',
          value: weight.toString(),
          unit: 'kg',
          status: 'normal',
          notes: data.note || ''
        });
      }
      
      // 保存所有记录
      for (const record of records) {
        console.log('保存健康记录:', record);
        
        const result = await http.post(API.HEALTH.RECORDS, {
          ...record,
          recordTime: new Date().toISOString()
        });
        
        console.log('保存响应:', result);
        
        if (!result.success) {
          throw new Error(result.message || '保存失败');
        }
      }
      
      wx.showToast({
        title: '记录保存成功',
        icon: 'success'
      });
      
      this.setData({
        showRecordModal: false
      });
      
      // 立即更新本地显示的健康指标
      this.updateLocalHealthMetrics(records);
      
      // 再刷新所有数据（保证数据一致性）
      this.loadHealthData();
      
    } catch (error) {
      console.error('保存健康记录失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
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