const { ScheduleAPI } = require('../../api/index');
const CONSTANTS = require('../../constants/constants');
// 临时注释掉登录装饰器以便调试
// const { LoginPageDecorator } = require('../../utils/login-page-decorator');
// const BatchConflictDetectionService = require('../../services/batch-conflict-detection.service.js');

/**
 * 日程管理页面
 * 功能：显示日程列表、筛选排序、批量操作等
 */
Page({
  data: {
    // 页面状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    
    // 日程列表数据
    scheduleList: [],
    filteredScheduleList: [],
    originalScheduleList: [],
    
    // 筛选条件
    currentFilters: {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: ''
    },
    
    // 分页信息
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    },
    
    // 界面状态
    showFilter: false,
    batchMode: false,
    selectedSchedules: [],
    
    // 批量选择增强功能
    batchSelection: {
      mode: 'normal', // normal, quick, advanced
      quickSelectMode: false, // 快速选择模式
      selectCount: 0, // 选中数量
      maxSelectLimit: 50, // 最大选择数量限制
      selectByDateRange: false, // 按日期范围选择
      selectByStatus: false, // 按状态选择
      selectByPatient: false, // 按患者选择
      dateRange: {
        start: '',
        end: ''
      },
      statusFilter: 'all', // pending, completed, cancelled, in_progress
      patientFilter: 'all',
      showQuickSelectMenu: false, // 显示快速选择菜单
      lastSelectAction: '', // 最后一次选择操作记录
      selectHistory: [], // 选择历史记录
      autoSelectRules: {
        enabled: false,
        rules: [] // 自动选择规则
      }
    },
    
    // 统计信息
    statistics: {
      total: 0,
      today: 0,
      pending: 0,
      overdue: 0,
      completed: 0,
      inProgress: 0,
      cancelled: 0,
      // 新增详细统计
      thisWeek: 0,
      thisMonth: 0,
      avgDuration: 0,
      completionRate: 0,
      trend: {
        direction: 'up', // up, down, stable
        percentage: 0
      }
    },
    
    // 快捷筛选标签
    quickFilters: [
      {
        key: CONSTANTS.FILTER_TYPES.TODAY,
        label: '今日',
        icon: '📍',
        count: 0
      },
      {
        key: 'pending',
        label: '待服务',
        icon: '⏳',
        count: 0
      },
      {
        key: 'urgent',
        label: '紧急',
        icon: '🔥',
        count: 0
      },
      {
        key: CONSTANTS.FILTER_TYPES.OVERDUE,
        label: '已过期',
        icon: '⚠️',
        count: 0
      }
    ],
    
    // 筛选条件标签显示
    activeFilterTags: [], // 当前激活的筛选标签
    
    // 筛选结果统计
    filterResultCount: 0,
    totalResultCount: 0,
    
    // 筛选历史记录
    filterHistory: [],
    showFilterHistory: false,
    
    // 弹窗状态
    showActionModal: false,
    selectedSchedule: null,
    actionModalActions: [],
    
    // 错误状态
    errorState: {
      hasError: false,
      errorType: '', // 'network', 'data', 'permission', 'unknown'
      errorMessage: '',
      canRetry: true,
      retryCount: 0,
      maxRetry: 3
    },
    
    // 时间调整相关状态
    timeAdjustment: {
      modalVisible: false,
      currentAppointment: null,
      isBatch: false,
      batchAppointments: [],
      availableSlots: [],
      adjustmentHistory: {
        modalVisible: false,
        appointmentId: '',
        recorderId: ''
      }
    },
    
    // 审批管理相关状态
    approvalManagement: {
      modalVisible: false,
      mode: 'list', // list | detail
      currentRequestId: '',
      userRole: '',
      pendingCount: 0,
      hasApprovalPermission: false
    },
    
    // 用户不在家处理相关状态
    waitingForPatient: {
      isWaiting: false,
      scheduleId: '',
      remainingTime: 0,
      startTime: ''
    },
    
    // 批量操作进度状态
    batchProgress: {
      visible: false,
      action: '',
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      status: 'processing', // processing, success, partial, error
      error: ''
    },

    // 批量调整操作面板
    batchAdjustPanel: {
      visible: false,
      selectedSchedules: [],
      progressCallback: null,
      totalCount: 0,
      currentStep: 1, // 1: 选择调整方式, 2: 设置参数, 3: 冲突检测, 4: 确认执行
      adjustType: '', // 'uniform', 'staggered', 'smart', 'proportion', 'template', 'custom'
      adjustTypeName: '',
      adjustParams: {},
      conflicts: [],
      preview: [],
      availableTemplates: [], // 可用的调整模板
      showPreviewDetail: false // 是否显示详细预览
    },

    // 批量冲突处理面板
    batchConflictPanel: {
      visible: false,
      conflicts: [],
      internalConflicts: [], // 批量调整项目间的冲突
      externalConflicts: [], // 与现有预约的冲突
      criticalConflicts: [], // 严重冲突
      selectedConflicts: [],
      resolutionStrategy: 'auto', // 'auto', 'manual', 'skip'
      autoResolutionOptions: {
        preferEarlier: true,
        allowWeekends: false,
        maxDaysDelay: 7
      },
      manualOptions: [], // 手动解决选项
      
      // 增强的冲突分析数据
      overallSeverity: 'low', // 'low', 'medium', 'high', 'critical'
      overallSeverityText: '轻微',
      severityStats: {
        high: { count: 0, percentage: 0 },
        medium: { count: 0, percentage: 0 },
        low: { count: 0, percentage: 0 }
      },
      impactAnalysis: {
        affectedPatients: 0,
        totalDelay: 0,
        economicLoss: 0
      },
      sortedConflicts: [], // 按严重程度排序的冲突
      conflictFilter: {
        type: 'all', // 'all', 'internal', 'external'
        severity: 'all' // 'all', 'high', 'medium', 'low'
      }
    }
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    console.log('日程页面开始加载...');
    
    this.initPage();
    this.initApprovalPermissions(); // 初始化审批权限
    
    // 先加载模拟统计数据，保证页面显示
    this.setMockStatistics();
    
    // 尝试加载真实数据
    this.loadScheduleList(true);
    this.loadFilterHistory(); // 加载筛选历史
    
    // 初始化排序缓存
    this.sortCache = new Map();
    this.distanceCache = {};
    
    console.log('日程页面加载完成');
    
    // 初始化批量冲突检测服务 - 延迟加载
    // this.batchConflictService = new BatchConflictDetectionService();
  },

  /**
   * 页面显示
   */
  onShow() {
    this.refreshData();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (!this.data.loadingMore && this.data.hasMore) {
      this.loadMoreSchedules();
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '日程管理'
    });
    
    // 初始化筛选条件
    this.setData({
      currentFilters: {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC,
        keyword: ''
      }
    });
    
    // 初始化时加载模拟数据作为默认显示
    console.log('初始化页面，加载基础数据');
    this.loadMockScheduleData();
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    this.setData({
      refreshing: true,
      'pagination.page': 1
    });
    
    try {
      await this.loadScheduleList(true);
      await this.loadStatistics();
    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        refreshing: false
      });
    }
  },

  /**
   * 加载日程列表
   */
  async loadScheduleList(reset = false) {
    if (this.data.loading) return;
    
    this.setData({
      loading: reset
    });
    
    try {
      const { page, limit } = this.data.pagination;
      const currentPage = reset ? 1 : page;
      
      const params = {
        page: currentPage,
        limit: limit,
        ...this.buildApiFilters()
      };
      
      const result = await ScheduleAPI.getScheduleList(params);
      
      let scheduleList = [];
      if (reset) {
        scheduleList = result.data.list || [];
      } else {
        scheduleList = [...this.data.scheduleList, ...(result.data.list || [])];
      }
      
      // 处理日程数据
      const processedList = scheduleList.map(schedule => this.processScheduleItem(schedule));
      
      this.setData({
        scheduleList: processedList,
        originalScheduleList: processedList,
        'pagination.page': currentPage + 1,
        'pagination.total': result.data.total || 0,
        hasMore: processedList.length < (result.data.total || 0)
      });
      
      // 应用本地筛选
      this.applyLocalFilters();
      
    } catch (error) {
      console.error('加载日程列表失败:', error);
      
      // 如果是重置加载且当前列表为空，使用模拟数据
      if (reset && this.data.scheduleList.length === 0) {
        console.log('使用模拟日程数据');
        this.loadMockScheduleData();
      } else {
        this.handleError(error, '加载日程列表失败');
      }
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  /**
   * 加载更多日程
   */
  async loadMoreSchedules() {
    this.setData({
      loadingMore: true
    });
    
    try {
      await this.loadScheduleList(false);
    } finally {
      this.setData({
        loadingMore: false
      });
    }
  },

  /**
   * 加载统计信息
   */
  async loadStatistics() {
    try {
      // 同时获取基本统计和详细统计
      const [basicStats, detailedStats] = await Promise.all([
        ScheduleAPI.getScheduleStatistics(),
        ScheduleAPI.getDetailedStatistics('today')
      ]);
      
      const statistics = {
        ...this.data.statistics,
        ...(basicStats.data || {}),
        ...(detailedStats.data || {})
      };
      
      // 计算完成率
      if (statistics.total > 0) {
        statistics.completionRate = Math.round((statistics.completed / statistics.total) * 100);
      }
      
      // 更新快捷筛选计数
      const quickFilters = this.data.quickFilters.map(filter => {
        let newCount = 0;
        let countChanged = false;
        
        switch (filter.key) {
          case CONSTANTS.FILTER_TYPES.TODAY:
            newCount = statistics.today || 0;
            break;
          case 'pending':
            newCount = statistics.pending || 0;
            break;
          case 'urgent':
            newCount = statistics.urgent || 0;
            break;
          case CONSTANTS.FILTER_TYPES.OVERDUE:
            newCount = statistics.overdue || 0;
            break;
          default:
            newCount = filter.count || 0;
        }
        
        // 检查数量是否发生变化
        if (filter.count !== newCount && newCount > 0) {
          countChanged = true;
          // 延迟重置动画状态
          setTimeout(() => {
            const updatedFilters = this.data.quickFilters.map(f => 
              f.key === filter.key ? { ...f, countChanged: false } : f
            );
            this.setData({ quickFilters: updatedFilters });
          }, 500);
        }
        
        return { ...filter, count: newCount, countChanged };
      });
      
      this.setData({
        statistics,
        quickFilters
      });
      
      // 加载趋势数据（异步）
      this.loadStatisticsTrend();
      
    } catch (error) {
      console.error('加载统计信息失败:', error);
      // 使用模拟数据作为备用
      this.setMockStatistics();
    }
  },
  
  /**
   * 加载统计趋势数据
   */
  async loadStatisticsTrend() {
    try {
      const result = await ScheduleAPI.getStatisticsTrend(7);
      const trendData = result.data || {};
      
      const statistics = {
        ...this.data.statistics,
        trend: trendData.trend || this.data.statistics.trend
      };
      
      this.setData({ statistics });
      
    } catch (error) {
      console.error('加载趋势数据失败:', error);
    }
  },
  
  /**
   * 设置模拟统计数据（用于开发测试）
   */
  setMockStatistics() {
    const mockStatistics = {
      total: 25,
      today: 8,
      pending: 5,
      overdue: 2,
      completed: 18,
      inProgress: 0,
      cancelled: 0,
      thisWeek: 25,
      thisMonth: 120,
      avgDuration: 45,
      completionRate: 72,
      urgent: 3,
      trend: {
        direction: 'up',
        percentage: 12
      }
    };
    
    // 更新快捷筛选计数
    const quickFilters = this.data.quickFilters.map(filter => {
      switch (filter.key) {
        case CONSTANTS.FILTER_TYPES.TODAY:
          return { ...filter, count: mockStatistics.today };
        case 'pending':
          return { ...filter, count: mockStatistics.pending };
        case 'urgent':
          return { ...filter, count: mockStatistics.urgent };
        case CONSTANTS.FILTER_TYPES.OVERDUE:
          return { ...filter, count: mockStatistics.overdue };
        default:
          return filter;
      }
    });
    
    this.setData({
      statistics: mockStatistics,
      quickFilters
    });
  },
  
  /**
   * 加载模拟日程数据（用于开发测试和错误回退）
   */
  loadMockScheduleData() {
    const mockScheduleList = [
      {
        id: 'mock_001',
        patientName: '张三',
        serviceName: '居家护理',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        address: '北京市朝阳区三里屯小区12号楼301室',
        status: 'pending',
        priority: 'normal',
        serviceType: 'regular',
        contactPhone: '138****5678',
        notes: '患者需要血压测量和用药指导',
        patientAge: 65,
        patientGender: '男',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 60
      },
      {
        id: 'mock_002',
        patientName: '李四',
        serviceName: '康复理疗',
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        address: '北京市海淀区中关村大街55号',
        status: 'confirmed',
        priority: 'high',
        serviceType: 'follow_up',
        contactPhone: '139****1234',
        notes: '需要带物理治疗设备',
        patientAge: 45,
        patientGender: '女',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 90
      },
      {
        id: 'mock_003',
        patientName: '王五',
        serviceName: '健康检查',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        address: '北京市东城区建国门外大街100号',
        status: 'completed',
        priority: 'normal',
        serviceType: 'initial',
        contactPhone: '150****9876',
        notes: '定期健康检查，包括血常规和尿常规',
        patientAge: 72,
        patientGender: '男',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 45,
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_004',
        patientName: '赵六',
        serviceName: '精神健康咨询',
        startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now()).toISOString(),
        address: '北京市西城区复兴门内大街200号',
        status: 'overdue',
        priority: 'urgent',
        serviceType: 'consultation',
        contactPhone: '187****3456',
        notes: '患者有焦虑症状，需要心理疑导',
        patientAge: 38,
        patientGender: '女',
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 60
      },
      {
        id: 'mock_005',
        patientName: '孙七',
        serviceName: '伤口换药',
        startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
        address: '北京市丰台区丰科路18号院',
        status: 'pending',
        priority: 'high',
        serviceType: 'emergency',
        contactPhone: '156****7890',
        notes: '车祸外伤后需定期换药',
        patientAge: 28,
        patientGender: '男',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 30
      }
    ];
    
    // 处理模拟数据
    const processedList = mockScheduleList.map(schedule => this.processScheduleItem(schedule));
    
    this.setData({
      scheduleList: processedList,
      originalScheduleList: processedList,
      'pagination.total': mockScheduleList.length,
      hasMore: false,
      loading: false  // 确保加载状态被清除
    });
    
    // 应用本地筛选
    this.applyLocalFilters();
    
    // 显示提示信息
    wx.showToast({
      title: '已加载模拟数据',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 处理日程项数据
   */
  processScheduleItem(schedule) {
    return {
      ...schedule,
      // 添加一些计算属性用于显示
      isToday: this.isToday(schedule.startTime),
      isOverdue: this.isOverdue(schedule.startTime),
      timeUntilStart: this.getTimeUntilStart(schedule.startTime),
      statusColor: this.getStatusColor(schedule.status),
      priorityLevel: schedule.priority || CONSTANTS.PRIORITY_LEVELS.NORMAL
    };
  },

  /**
   * 构建API筛选参数
   */
  buildApiFilters() {
    const filters = this.data.currentFilters;
    const apiFilters = {};
    
    // 状态筛选
    if (filters.status !== 'all') {
      apiFilters.status = filters.status;
    }
    
    // 类型筛选
    if (filters.type !== 'all') {
      apiFilters.type = filters.type;
    }
    
    // 优先级筛选
    if (filters.priority !== 'all') {
      apiFilters.priority = filters.priority;
    }
    
    // 患者筛选
    if (filters.patient !== 'all') {
      apiFilters.patient = filters.patient;
    }
    
    // 关键字搜索
    if (filters.keyword) {
      apiFilters.keyword = filters.keyword;
    }
    
    // 时间筛选
    if (filters.time !== CONSTANTS.FILTER_TYPES.ALL) {
      const timeRange = this.getTimeRange(filters.time);
      if (timeRange) {
        apiFilters.startDate = timeRange.startDate;
        apiFilters.endDate = timeRange.endDate;
      }
    }
    
    // 排序
    if (filters.sort === 'combined' && filters.sortCombination) {
      apiFilters.sortCombination = JSON.stringify(filters.sortCombination);
    } else {
      apiFilters.sort = filters.sort;
    }
    
    // 高级筛选条件
    
    // 服务时长筛选
    if (filters.duration && (filters.duration.min > 0 || filters.duration.max < 999)) {
      apiFilters.durationMin = filters.duration.min;
      apiFilters.durationMax = filters.duration.max;
    }
    
    // 距离筛选
    if (filters.distance && (filters.distance.min > 0 || filters.distance.max < 100)) {
      apiFilters.distanceMin = filters.distance.min;
      apiFilters.distanceMax = filters.distance.max;
    }
    
    // 费用筛选
    if (filters.cost && (filters.cost.min > 0 || filters.cost.max < 9999)) {
      apiFilters.costMin = filters.cost.min;
      apiFilters.costMax = filters.cost.max;
    }
    
    // 备注关键字筛选
    if (filters.noteKeyword) {
      apiFilters.noteKeyword = filters.noteKeyword;
    }
    
    // 标签筛选
    if (filters.tags && filters.tags.length > 0) {
      apiFilters.tags = filters.tags.join(',');
    }
    
    // 创建时间范围
    if (filters.createTimeRange) {
      if (filters.createTimeRange.startDate) {
        apiFilters.createStartDate = filters.createTimeRange.startDate;
      }
      if (filters.createTimeRange.endDate) {
        apiFilters.createEndDate = filters.createTimeRange.endDate;
      }
    }
    
    // 自定义日期范围
    if (filters.customDateRange) {
      if (filters.customDateRange.startDate) {
        apiFilters.customStartDate = filters.customDateRange.startDate;
      }
      if (filters.customDateRange.endDate) {
        apiFilters.customEndDate = filters.customDateRange.endDate;
      }
    }
    
    return apiFilters;
  },

  /**
   * 获取时间范围
   */
  getTimeRange(timeFilter) {
    const now = new Date();
    let startDate, endDate;
    
    switch (timeFilter) {
      case CONSTANTS.FILTER_TYPES.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
        
      case CONSTANTS.FILTER_TYPES.TOMORROW:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
        
      case CONSTANTS.FILTER_TYPES.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        break;
        
      case CONSTANTS.FILTER_TYPES.OVERDUE:
        endDate = now;
        startDate = new Date(now.getFullYear() - 1, 0, 1); // 一年前
        break;
        
      default:
        return null;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  },

  /**
   * 应用本地筛选（排序等）
   */
  applyLocalFilters() {
    console.log('开始应用本地筛选...');
    let filteredList = [...this.data.originalScheduleList];
    
    console.log('原始数据长度:', filteredList.length);
    
    // 简化排序逻辑 - 默认按时间排序
    const sortType = this.data.currentFilters.sort;
    
    try {
      if (sortType === CONSTANTS.SORT_TYPES.TIME_DESC) {
        filteredList.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      } else {
        // 默认时间升序排序
        filteredList.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      }
      
      console.log('排序后数据长度:', filteredList.length);
      
      this.setData({
        filteredScheduleList: filteredList
      });
      
      console.log('数据设置成功，filteredScheduleList长度:', filteredList.length);
      
      // 更新筛选条件标签
      this.updateFilterTags();
      
    } catch (error) {
      console.error('筛选排序失败:', error);
      // 出错时直接使用原始数据
      this.setData({
        filteredScheduleList: filteredList
      });
    }
  },
  
  /**
   * 应用单一排序
   */
  applySingleSort(a, b, sortType) {
    switch (sortType) {
      case CONSTANTS.SORT_TYPES.TIME_ASC:
        return this.compareTime(a.startTime, b.startTime, true);
        
      case CONSTANTS.SORT_TYPES.TIME_DESC:
        return this.compareTime(a.startTime, b.startTime, false);
        
      case CONSTANTS.SORT_TYPES.PRIORITY_DESC:
        return this.comparePriority(b.priority, a.priority);
        
      case CONSTANTS.SORT_TYPES.PRIORITY_ASC:
        return this.comparePriority(a.priority, b.priority);
        
      case CONSTANTS.SORT_TYPES.STATUS_ASC:
        return this.compareStatus(a.status, b.status);
        
      case CONSTANTS.SORT_TYPES.STATUS_DESC:
        return this.compareStatus(b.status, a.status);
        
      case CONSTANTS.SORT_TYPES.PATIENT_NAME_ASC:
        return this.comparePatientName(a.patient?.name, b.patient?.name, true);
        
      case CONSTANTS.SORT_TYPES.PATIENT_NAME_DESC:
        return this.comparePatientName(a.patient?.name, b.patient?.name, false);
        
      case CONSTANTS.SORT_TYPES.SERVICE_TYPE_ASC:
        return this.compareServiceType(a.type, b.type);
        
      case CONSTANTS.SORT_TYPES.SERVICE_TYPE_DESC:
        return this.compareServiceType(b.type, a.type);
        
      case CONSTANTS.SORT_TYPES.DISTANCE_ASC:
        return this.compareDistance(a, b, true);
        
      case CONSTANTS.SORT_TYPES.DISTANCE_DESC:
        return this.compareDistance(a, b, false);
        
      case CONSTANTS.SORT_TYPES.DURATION_ASC:
        return this.compareDuration(a.duration, b.duration, true);
        
      case CONSTANTS.SORT_TYPES.DURATION_DESC:
        return this.compareDuration(a.duration, b.duration, false);
        
      case CONSTANTS.SORT_TYPES.COST_ASC:
        return this.compareCost(a.cost, b.cost, true);
        
      case CONSTANTS.SORT_TYPES.COST_DESC:
        return this.compareCost(a.cost, b.cost, false);
        
      case CONSTANTS.SORT_TYPES.CREATE_TIME_ASC:
        return this.compareTime(a.createTime || a.createdAt, b.createTime || b.createdAt, true);
        
      case CONSTANTS.SORT_TYPES.CREATE_TIME_DESC:
        return this.compareTime(a.createTime || a.createdAt, b.createTime || b.createdAt, false);
        
      default:
        return 0;
    }
  },
  
  /**
   * 应用组合排序
   */
  applyCombinedSort(a, b, sortCombination) {
    const { primary, secondary, tertiary } = sortCombination;
    
    // 主要排序
    let result = this.applySingleSort(a, b, primary);
    if (result !== 0) return result;
    
    // 次要排序
    if (secondary && secondary !== primary) {
      result = this.applySingleSort(a, b, secondary);
      if (result !== 0) return result;
    }
    
    // 第三排序
    if (tertiary && tertiary !== primary && tertiary !== secondary) {
      result = this.applySingleSort(a, b, tertiary);
      if (result !== 0) return result;
    }
    
    // 如果所有排序条件都相等，使用默认的ID排序保证稳定性
    const idA = a.id || '';
    const idB = b.id || '';
    return idA.localeCompare(idB);
  },
  
  /**
   * 缓存排序结果（用于性能优化）
   */
  cacheSortResult(sortType, resultCount) {
    if (!this.sortCache) {
      this.sortCache = new Map();
    }
    
    const cacheKey = `${sortType}_${this.data.originalScheduleList.length}`;
    const cacheData = {
      sortType,
      resultCount,
      timestamp: Date.now(),
      filters: JSON.stringify(this.data.currentFilters)
    };
    
    this.sortCache.set(cacheKey, cacheData);
    
    // 清理过期缓存（超过5分钟）
    const expireTime = 5 * 60 * 1000;
    for (const [key, data] of this.sortCache.entries()) {
      if (Date.now() - data.timestamp > expireTime) {
        this.sortCache.delete(key);
      }
    }
  },
  
  /**
   * 检查是否可以使用排序缓存
   */
  canUseSortCache(sortType) {
    if (!this.sortCache) return false;
    
    const cacheKey = `${sortType}_${this.data.originalScheduleList.length}`;
    const cacheData = this.sortCache.get(cacheKey);
    
    if (!cacheData) return false;
    
    // 检查缓存是否过期（5分钟）
    const expireTime = 5 * 60 * 1000;
    if (Date.now() - cacheData.timestamp > expireTime) {
      this.sortCache.delete(cacheKey);
      return false;
    }
    
    // 检查筛选条件是否变化
    const currentFilters = JSON.stringify(this.data.currentFilters);
    if (cacheData.filters !== currentFilters) {
      return false;
    }
    
    return true;
  },
  
  /**
   * 清理排序缓存
   */
  clearSortCache() {
    if (this.sortCache) {
      this.sortCache.clear();
    }
    
    // 清理距离缓存
    if (this.distanceCache) {
      this.distanceCache = {};
    }
  },

  /**
   * 筛选器变更处理
   */
  onFilterChange(e) {
    const filters = e.detail.filters;
    
    this.setData({
      currentFilters: filters,
      'pagination.page': 1
    });
    
    // 重新加载数据
    this.loadScheduleList(true);
    
    // 保存筛选历史
    this.saveFilterHistory();
    
    // 隐藏筛选器
    this.hideFilter();
  },

  /**
   * 显示筛选器
   */
  showFilter() {
    this.setData({
      showFilter: true
    });
  },

  /**
   * 隐藏筛选器
   */
  hideFilter() {
    this.setData({
      showFilter: false
    });
  },

  /**
   * 快捷筛选
   */
  onQuickFilter(e) {
    const filterKey = e.currentTarget.dataset.key;
    let filters = { ...this.data.currentFilters };
    
    // 如果点击的是当前激活的筛选器，则清除筛选
    const isCurrentFilter = this.isCurrentFilter(filterKey);
    
    if (isCurrentFilter) {
      // 清除筛选，回到全部状态
      filters = {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC,
        keyword: ''
      };
    } else {
      // 重置其他筛选条件
      filters = {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC,
        keyword: ''
      };
      
      // 应用快捷筛选
      switch (filterKey) {
        case CONSTANTS.FILTER_TYPES.TODAY:
          filters.time = CONSTANTS.FILTER_TYPES.TODAY;
          break;
          
        case 'pending':
          filters.status = CONSTANTS.SCHEDULE_STATUS.PENDING;
          break;
          
        case 'urgent':
          filters.priority = CONSTANTS.PRIORITY_LEVELS.URGENT;
          break;
          
        case CONSTANTS.FILTER_TYPES.OVERDUE:
          filters.time = CONSTANTS.FILTER_TYPES.OVERDUE;
          break;
      }
    }
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
    
    this.setData({
      currentFilters: filters,
      'pagination.page': 1
    });
    
    this.loadScheduleList(true);
  },
  
  /**
   * 检查是否为当前活动的筛选器
   */
  isCurrentFilter(filterKey) {
    const filters = this.data.currentFilters;
    
    switch (filterKey) {
      case CONSTANTS.FILTER_TYPES.TODAY:
        return filters.time === CONSTANTS.FILTER_TYPES.TODAY;
        
      case 'pending':
        return filters.status === CONSTANTS.SCHEDULE_STATUS.PENDING;
        
      case 'urgent':
        return filters.priority === CONSTANTS.PRIORITY_LEVELS.URGENT;
        
      case CONSTANTS.FILTER_TYPES.OVERDUE:
        return filters.time === CONSTANTS.FILTER_TYPES.OVERDUE;
        
      default:
        return false;
    }
  },
  
  /**
   * 清除所有筛选条件
   */
  /**
   * 统计项点击事件
   */
  onStatItemTap(e) {
    const type = e.currentTarget.dataset.type;
    let filters = { ...this.data.currentFilters };
    
    // 重置筛选条件
    filters = {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: ''
    };
    
    // 根据统计类型设置筛选条件
    switch (type) {
      case 'today':
        filters.time = CONSTANTS.FILTER_TYPES.TODAY;
        break;
      case 'pending':
        filters.status = CONSTANTS.SCHEDULE_STATUS.PENDING;
        break;
      case 'overdue':
        filters.time = CONSTANTS.FILTER_TYPES.OVERDUE;
        break;
      case 'total':
        // 保持默认筛选（显示全部）
        break;
    }
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
    
    this.setData({
      currentFilters: filters,
      'pagination.page': 1
    });
    
    this.loadScheduleList(true);
    
    // 显示反馈
    wx.showToast({
      title: `已筛选${type === 'total' ? '全部' : type === 'today' ? '今日' : type === 'pending' ? '待服务' : '已过期'}日程`,
      icon: 'none',
      duration: 1500
    });
  },
  
  /**
   * 清除所有筛选条件
   */
  clearFilters() {
    const defaultFilters = {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: ''
    };
    
    this.setData({
      currentFilters: defaultFilters,
      'pagination.page': 1
    });
    
    this.loadScheduleList(true);
    
    wx.showToast({
      title: '已清除筛选',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    const batchMode = !this.data.batchMode;
    
    this.setData({
      batchMode,
      selectedSchedules: [], // 清空选中列表
      'batchSelection.selectCount': 0,
      'batchSelection.quickSelectMode': false,
      'batchSelection.showQuickSelectMenu': false,
      'batchSelection.lastSelectAction': batchMode ? `进入批量模式 - ${this.formatDateTime(new Date())}` : `退出批量模式 - ${this.formatDateTime(new Date())}`
    });
    
    // 增强触觉反馈
    wx.vibrateShort({
      type: batchMode ? 'heavy' : 'medium'
    });
    
    // 显示动画提示
    wx.showToast({
      title: batchMode ? '已进入批量模式\n点击选择或使用快速选择' : '已退出批量模式',
      icon: 'none',
      duration: 2000
    });
    
    // 更新导航栏标题
    wx.setNavigationBarTitle({
      title: batchMode ? '批量选择 - 日程管理' : '日程管理'
    });
    
    // 如果退出批量模式，恢复原始状态
    if (!batchMode) {
      this.resetBatchSelectionState();
    } else {
      // 进入批量模式时的初始化
      this.initBatchSelection();
    }
  },
  
  /**
   * 初始化批量选择
   */
  initBatchSelection() {
    // 更新选择历史
    this.updateSelectHistory('进入批量模式', 0);
    
    // 检查是否有预约可选择
    if (this.data.filteredScheduleList.length === 0) {
      wx.showToast({
        title: '当前没有可选择的预约',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  /**
   * 重置批量选择状态
   */
  resetBatchSelectionState() {
    this.setData({
      selectedSchedules: [],
      batchMode: false,
      'batchSelection.selectCount': 0,
      'batchSelection.quickSelectMode': false,
      'batchSelection.showQuickSelectMenu': false,
      'batchSelection.selectByDateRange': false,
      'batchSelection.selectByStatus': false,
      'batchSelection.selectByPatient': false,
      'batchSelection.lastSelectAction': `重置选择状态 - ${this.formatDateTime(new Date())}`
    });
    
    // 恢复导航栏
    wx.setNavigationBarTitle({
      title: '日程管理'
    });
    
    // 更新选择历史
    this.updateSelectHistory('重置状态', 0);
  },
  
  /**
   * 日程选择事件
   */
  onScheduleSelect(e) {
    const schedule = e.detail?.schedule || e.currentTarget.dataset.schedule;
    if (!schedule || !schedule.id) return;
    
    const selectedSchedules = [...this.data.selectedSchedules];
    const index = selectedSchedules.indexOf(schedule.id);
    
    if (index > -1) {
      // 取消选中
      selectedSchedules.splice(index, 1);
    } else {
      // 选中
      selectedSchedules.push(schedule.id);
    }
    
    // 增强触觉反馈
    wx.vibrateShort({
      type: index > -1 ? 'light' : 'medium'
    });
    
    this.setData({
      selectedSchedules
    });
    
    // 增加选中动画效果
    this.animateSelectionFeedback(schedule.id, index === -1);
    
    // 显示选中反馈
    if (selectedSchedules.length === 0) {
      wx.showToast({
        title: '已清空选择',
        icon: 'none',
        duration: 1000
      });
    } else if (selectedSchedules.length === this.data.filteredScheduleList.length) {
      wx.showToast({
        title: '已全选 ' + selectedSchedules.length + ' 项',
        icon: 'success',
        duration: 1500
      });
    }
  },
  
  /**
   * 选中动画反馈
   */
  animateSelectionFeedback(scheduleId, isSelected) {
    // 简单的动画反馈，在实际实现中可以通过CSS动画来实现
    if (isSelected) {
      console.log('选中动画: ', scheduleId);
    } else {
      console.log('取消选中动画: ', scheduleId);
    }
  },
  
  /**
   * 全选功能
   */
  selectAll() {
    const allScheduleIds = this.data.filteredScheduleList.map(item => item.id);
    const isAllSelected = this.data.selectedSchedules.length === allScheduleIds.length;
    
    if (isAllSelected) {
      // 已全选，执行取消全选
      this.setData({
        selectedSchedules: []
      });
      
      wx.vibrateShort({ type: 'light' });
      wx.showToast({
        title: '已取消全选',
        icon: 'none',
        duration: 1500
      });
    } else {
      // 未全选，执行全选
      this.setData({
        selectedSchedules: allScheduleIds
      });
      
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({
        title: `已全选 ${allScheduleIds.length} 条日程`,
        icon: 'success',
        duration: 1500
      });
    }
    
    // 动画效果
    this.triggerSelectAllAnimation();
  },
  
  /**
   * 触发全选动画
   */
  triggerSelectAllAnimation() {
    // 可以在这里添加全选的动画效果
    console.log('全选动画触发');
  },
  
  /**
   * 反选功能
   */
  selectInverse() {
    if (this.data.selectedSchedules.length === 0) {
      wx.showToast({
        title: '请先选择一些项目',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const allScheduleIds = this.data.filteredScheduleList.map(item => item.id);
    const selectedSchedules = this.data.selectedSchedules;
    
    // 获取未选中的ID
    const inverseSelection = allScheduleIds.filter(id => !selectedSchedules.includes(id));
    
    this.setData({
      selectedSchedules: inverseSelection
    });
    
    wx.vibrateShort({
      type: 'medium'
    });
    
    wx.showToast({
      title: `已反选 ${inverseSelection.length} 条日程`,
      icon: 'none',
      duration: 1500
    });
    
    // 动画效果
    this.triggerInverseAnimation();
  },
  
  /**
   * 触发反选动画
   */
  triggerInverseAnimation() {
    console.log('反选动画触发');
  },

  /**
   * 显示批量快速选择菜单
   */
  showBatchQuickMenu() {
    this.setData({
      'batchSelection.showQuickSelectMenu': !this.data.batchSelection.showQuickSelectMenu
    });
    
    // 触发触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
  },

  /**
   * 快速选择操作
   */
  quickSelectAction(e) {
    const { action } = e.currentTarget.dataset;
    const { filteredScheduleList, batchSelection } = this.data;
    
    let selectedIds = [];
    let actionText = '';
    
    switch (action) {
      case 'select_today':
        // 选择今日的预约
        const today = this.formatDate(new Date());
        selectedIds = filteredScheduleList
          .filter(item => item.date === today)
          .map(item => item.id);
        actionText = '选择今日';
        break;
        
      case 'select_pending':
        // 选择待处理的预约
        selectedIds = filteredScheduleList
          .filter(item => item.status === 'pending')
          .map(item => item.id);
        actionText = '选择待处理';
        break;
        
      case 'select_urgent':
        // 选择紧急的预约
        selectedIds = filteredScheduleList
          .filter(item => item.priority === 'urgent')
          .map(item => item.id);
        actionText = '选择紧急';
        break;
        
      case 'select_overdue':
        // 选择过期的预约
        const now = new Date();
        selectedIds = filteredScheduleList
          .filter(item => {
            const scheduleTime = new Date(`${item.date} ${item.time}`);
            return scheduleTime < now && item.status !== 'completed';
          })
          .map(item => item.id);
        actionText = '选择过期';
        break;
        
      case 'select_first_10':
        // 选择前10个
        selectedIds = filteredScheduleList.slice(0, 10).map(item => item.id);
        actionText = '选择前10个';
        break;
        
      case 'select_last_10':
        // 选择后10个
        selectedIds = filteredScheduleList.slice(-10).map(item => item.id);
        actionText = '选择后10个';
        break;
        
      case 'select_range_5':
        // 选择中间5个
        const mid = Math.floor(filteredScheduleList.length / 2);
        const start = Math.max(0, mid - 2);
        const end = Math.min(filteredScheduleList.length, start + 5);
        selectedIds = filteredScheduleList.slice(start, end).map(item => item.id);
        actionText = '选择中间5个';
        break;
    }
    
    // 检查数量限制
    if (selectedIds.length > batchSelection.maxSelectLimit) {
      selectedIds = selectedIds.slice(0, batchSelection.maxSelectLimit);
      actionText += `(限制${batchSelection.maxSelectLimit}个)`;
    }
    
    this.setData({
      selectedSchedules: selectedIds,
      'batchSelection.selectCount': selectedIds.length,
      'batchSelection.showQuickSelectMenu': false,
      'batchSelection.lastSelectAction': `${actionText} - ${this.formatDateTime(new Date())}`
    });
    
    // 更新选择历史
    this.updateSelectHistory(actionText, selectedIds.length);
    
    wx.showToast({
      title: `${actionText}：${selectedIds.length}个项目`,
      icon: 'success',
      duration: 1500
    });
    
    // 触发触觉反馈
    wx.vibrateShort();
  },

  /**
   * 更新选择历史
   */
  updateSelectHistory(action, count) {
    const { batchSelection } = this.data;
    const historyItem = {
      action,
      count: typeof count === 'number' ? count : 0,
      timestamp: new Date().getTime(),
      formattedTime: this.formatDateTime(new Date())
    };
    
    const newHistory = [historyItem, ...batchSelection.selectHistory.slice(0, 9)]; // 保留最近10条记录
    
    this.setData({
      'batchSelection.selectHistory': newHistory
    });
  },

  /**
   * 按条件选择预约
   */
  selectByCondition(e) {
    const { condition } = e.currentTarget.dataset;
    
    switch (condition) {
      case 'by_status':
        this.showStatusSelectModal();
        break;
      case 'by_date':
        this.showDateRangeSelectModal();
        break;
      case 'by_patient':
        this.showPatientSelectModal();
        break;
      case 'by_priority':
        this.showPrioritySelectModal();
        break;
    }
  },

  /**
   * 显示状态选择弹窗
   */
  showStatusSelectModal() {
    wx.showActionSheet({
      itemList: ['待处理', '进行中', '已完成', '已取消', '已过期'],
      success: (res) => {
        const statusMap = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];
        const selectedStatus = statusMap[res.tapIndex];
        const statusNameMap = ['待处理', '进行中', '已完成', '已取消', '已过期'];
        const statusName = statusNameMap[res.tapIndex];
        
        this.selectByStatus(selectedStatus, statusName);
      }
    });
  },

  /**
   * 按状态选择
   */
  selectByStatus(status, statusName) {
    const { filteredScheduleList, batchSelection } = this.data;
    
    let selectedIds;
    if (status === 'overdue') {
      // 过期预约的特殊处理
      const now = new Date();
      selectedIds = filteredScheduleList
        .filter(item => {
          const scheduleTime = new Date(`${item.date} ${item.time}`);
          return scheduleTime < now && item.status !== 'completed';
        })
        .map(item => item.id);
    } else {
      selectedIds = filteredScheduleList
        .filter(item => item.status === status)
        .map(item => item.id);
    }
    
    // 检查数量限制
    if (selectedIds.length > batchSelection.maxSelectLimit) {
      selectedIds = selectedIds.slice(0, batchSelection.maxSelectLimit);
    }
    
    const actionText = `选择${statusName}`;
    
    this.setData({
      selectedSchedules: selectedIds,
      'batchSelection.selectCount': selectedIds.length,
      'batchSelection.lastSelectAction': `${actionText} - ${this.formatDateTime(new Date())}`
    });
    
    // 更新选择历史
    this.updateSelectHistory(actionText, selectedIds.length);
    
    wx.showToast({
      title: `${actionText}：${selectedIds.length}个项目`,
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 显示优先级选择弹窗
   */
  showPrioritySelectModal() {
    wx.showActionSheet({
      itemList: ['紧急', '高', '中', '低'],
      success: (res) => {
        const priorityMap = ['urgent', 'high', 'medium', 'low'];
        const selectedPriority = priorityMap[res.tapIndex];
        const priorityNameMap = ['紧急', '高', '中', '低'];
        const priorityName = priorityNameMap[res.tapIndex];
        
        this.selectByPriority(selectedPriority, priorityName);
      }
    });
  },

  /**
   * 按优先级选择
   */
  selectByPriority(priority, priorityName) {
    const { filteredScheduleList, batchSelection } = this.data;
    
    const selectedIds = filteredScheduleList
      .filter(item => item.priority === priority)
      .map(item => item.id);
    
    // 检查数量限制
    const limitedIds = selectedIds.length > batchSelection.maxSelectLimit 
      ? selectedIds.slice(0, batchSelection.maxSelectLimit) 
      : selectedIds;
    
    const actionText = `选择${priorityName}优先级`;
    
    this.setData({
      selectedSchedules: limitedIds,
      'batchSelection.selectCount': limitedIds.length,
      'batchSelection.lastSelectAction': `${actionText} - ${this.formatDateTime(new Date())}`
    });
    
    // 更新选择历史
    this.updateSelectHistory(actionText, limitedIds.length);
    
    wx.showToast({
      title: `${actionText}：${limitedIds.length}个项目`,
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 切换选择模式
   */
  toggleSelectMode(e) {
    const { mode } = e.currentTarget.dataset;
    
    this.setData({
      'batchSelection.mode': mode
    });
    
    wx.showToast({
      title: `切换到${mode === 'quick' ? '快速' : mode === 'advanced' ? '高级' : '普通'}模式`,
      icon: 'none',
      duration: 1500
    });
  },
  
  /**
   * 清除所有选中
   */
  clearSelection() {
    if (this.data.selectedSchedules.length === 0) {
      wx.showToast({
        title: '没有选中项目',
        icon: 'none',
        duration: 1000
      });
      return;
    }
    
    const selectedCount = this.data.selectedSchedules.length;
    
    this.setData({
      selectedSchedules: []
    });
    
    wx.vibrateShort({
      type: 'light'
    });
    
    wx.showToast({
      title: `已清空 ${selectedCount} 个选中项`,
      icon: 'none',
      duration: 1500
    });
    
    // 动画效果
    this.triggerClearAnimation();
  },
  
  /**
   * 触发清空动画
   */
  triggerClearAnimation() {
    console.log('清空动画触发');
  },
  
  /**
   * 智能快捷选择
   */
  onSmartQuickSelect(e) {
    const type = e.currentTarget.dataset.type;
    let targetSchedules = [];
    let message = '';
    
    switch (type) {
      case 'today':
        targetSchedules = this.data.filteredScheduleList.filter(schedule => this.isToday(schedule.startTime));
        message = '今日日程';
        break;
      case 'urgent':
        targetSchedules = this.data.filteredScheduleList.filter(schedule => schedule.priority === 'urgent');
        message = '紧急日程';
        break;
      case 'pending':
        targetSchedules = this.data.filteredScheduleList.filter(schedule => 
          schedule.status === CONSTANTS.SCHEDULE_STATUS.PENDING
        );
        message = '待服务日程';
        break;
      case 'overdue':
        targetSchedules = this.data.filteredScheduleList.filter(schedule => this.isOverdue(schedule.startTime));
        message = '已过期日程';
        break;
      case 'same_patient':
        if (this.data.selectedSchedules.length > 0) {
          const firstSelected = this.data.filteredScheduleList.find(s => s.id === this.data.selectedSchedules[0]);
          if (firstSelected) {
            targetSchedules = this.data.filteredScheduleList.filter(schedule => 
              schedule.patientId === firstSelected.patientId
            );
            message = '同一患者日程';
          }
        }
        break;
      default:
        return;
    }
    
    if (targetSchedules.length === 0) {
      wx.showToast({
        title: `没有找到${message}`,
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const targetIds = targetSchedules.map(s => s.id);
    
    this.setData({
      selectedSchedules: targetIds
    });
    
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({
      title: `已选中${targetSchedules.length}个${message}`,
      icon: 'success',
      duration: 1500
    });
  },
  
  /**
   * 批量选择快捷操作菜单
   */
  showBatchQuickMenu() {
    const quickOptions = [
      '选择今日日程',
      '选择紧急日程', 
      '选择待服务日程',
      '选择已过期日程'
    ];
    
    if (this.data.selectedSchedules.length > 0) {
      quickOptions.push('选择同一患者日程');
    }
    
    wx.showActionSheet({
      itemList: quickOptions,
      success: (res) => {
        const actions = ['today', 'urgent', 'pending', 'overdue', 'same_patient'];
        const selectedAction = actions[res.tapIndex];
        if (selectedAction) {
          this.onSmartQuickSelect({
            currentTarget: { dataset: { type: selectedAction } }
          });
        }
      }
    });
  },
  
  /**
   * 批量操作
   */
  onBatchAction(e) {
    const action = e.currentTarget.dataset.action;
    const selectedSchedules = this.data.selectedSchedules;
    
    if (selectedSchedules.length === 0) {
      wx.showToast({
        title: '请先选择日程',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示批量操作确认对话框
    this.showBatchConfirmDialog(action, selectedSchedules);
  },
  
  /**
   * 显示批量操作确认对话框
   */
  showBatchConfirmDialog(action, selectedSchedules) {
    const scheduleDetails = this.data.filteredScheduleList
      .filter(schedule => selectedSchedules.includes(schedule.id))
      .slice(0, 3); // 最多显示3个详情
    
    let actionConfig = this.getBatchActionConfig(action, selectedSchedules.length);
    
    const detailText = scheduleDetails.map(schedule => 
      `• ${schedule.patientName} - ${this.formatDateTime(schedule.startTime)}`
    ).join('\n');
    
    const moreText = selectedSchedules.length > 3 ? `\n...及其他${selectedSchedules.length - 3}项` : '';
    
    const content = `${actionConfig.message}\n\n选中项目：\n${detailText}${moreText}\n\n此操作${actionConfig.reversible ? '可以撤销' : '不可撤销'}，请确认继续。`;
    
    wx.showModal({
      title: actionConfig.title,
      content: content,
      confirmText: actionConfig.confirmText,
      cancelText: '取消',
      confirmColor: actionConfig.danger ? '#ff3b30' : '#007aff',
      success: (res) => {
        if (res.confirm) {
          this.executeBatchActionWithProgress(action, selectedSchedules);
        }
      }
    });
  },
  
  /**
   * 获取批量操作配置
   */
  getBatchActionConfig(action, count) {
    const configs = {
      reschedule: {
        title: '批量调整时间',
        message: `即将对${count}个日程进行时间调整`,
        confirmText: '开始调整',
        danger: false,
        reversible: true
      },
      cancel: {
        title: '批量取消预约',
        message: `即将取消${count}个预约日程`,
        confirmText: '确定取消',
        danger: true,
        reversible: false
      },
      confirm: {
        title: '批量确认预约',
        message: `即将确认${count}个预约日程`,
        confirmText: '确定确认',
        danger: false,
        reversible: true
      },
      delete: {
        title: '批量删除日程',
        message: `即将永久删除${count}个日程记录`,
        confirmText: '确定删除',
        danger: true,
        reversible: false
      }
    };
  },
    
  /**
   * 带进度显示的批量操作执行
   */
  async executeBatchActionWithProgress(action, selectedSchedules) {
    const totalCount = selectedSchedules.length;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // 初始化进度显示
    this.showBatchProgress({
      action: action,
      total: totalCount,
      processed: 0,
      success: 0,
      failed: 0,
      status: 'processing'
    });
    
    try {
      // 根据操作类型执行不同的处理逻辑
      switch (action) {
        case 'reschedule':
          await this.processBatchReschedule(selectedSchedules, (progress) => {
            processedCount = progress.processed;
            successCount = progress.success;
            failedCount = progress.failed;
            this.updateBatchProgress({
              total: totalCount,
              processed: processedCount,
              success: successCount,
              failed: failedCount,
              status: 'processing'
            });
          });
          break;
          
        case 'cancel':
          await this.processBatchCancel(selectedSchedules, (progress) => {
            processedCount = progress.processed;
            successCount = progress.success;
            failedCount = progress.failed;
            this.updateBatchProgress({
              total: totalCount,
              processed: processedCount,
              success: successCount,
              failed: failedCount,
              status: 'processing'
            });
          });
          break;
          
        case 'confirm':
          await this.processBatchConfirm(selectedSchedules, (progress) => {
            processedCount = progress.processed;
            successCount = progress.success;
            failedCount = progress.failed;
            this.updateBatchProgress({
              total: totalCount,
              processed: processedCount,
              success: successCount,
              failed: failedCount,
              status: 'processing'
            });
          });
          break;
          
        default:
          throw new Error('不支持的批量操作类型');
      }
      
      // 操作完成
      this.completeBatchProgress({
        total: totalCount,
        processed: processedCount,
        success: successCount,
        failed: failedCount,
        status: failedCount === 0 ? 'success' : 'partial'
      });
      
    } catch (error) {
      console.error('批量操作失败:', error);
      this.completeBatchProgress({
        total: totalCount,
        processed: processedCount,
        success: successCount,
        failed: totalCount - successCount,
        status: 'error',
        error: error.message
      });
    }
  },
  
  /**
   * 显示批量进度
   */
  showBatchProgress(progress) {
    this.setData({
      batchProgress: {
        visible: true,
        ...progress
      }
    });
  },
  
  /**
   * 更新批量进度
   */
  updateBatchProgress(progress) {
    this.setData({
      'batchProgress.processed': progress.processed,
      'batchProgress.success': progress.success,
      'batchProgress.failed': progress.failed,
      'batchProgress.status': progress.status
    });
  },
  
  /**
   * 完成批量进度
   */
  completeBatchProgress(progress) {
    this.setData({
      'batchProgress.processed': progress.processed,
      'batchProgress.success': progress.success,
      'batchProgress.failed': progress.failed,
      'batchProgress.status': progress.status,
      'batchProgress.error': progress.error
    });
    
    // 3秒后自动关闭进度显示
    setTimeout(() => {
      this.hideBatchProgress();
    }, 3000);
    
    // 显示结果提示
    this.showBatchResultToast(progress);
    
    // 刷新数据和退出批量模式
    this.refreshData();
    this.resetBatchSelectionState();
  },
  
  /**
   * 隐藏批量进度
   */
  hideBatchProgress() {
    this.setData({
      'batchProgress.visible': false
    });
  },
  
  /**
   * 显示批量结果提示
   */
  showBatchResultToast(progress) {
    if (progress.status === 'success') {
      wx.showToast({
        title: `成功处理${progress.success}个项目`,
        icon: 'success',
        duration: 2000
      });
    } else if (progress.status === 'partial') {
      wx.showToast({
        title: `成功${progress.success}个，失败${progress.failed}个`,
        icon: 'none',
        duration: 3000
      });
    } else {
      wx.showToast({
        title: `操作失败：${progress.error || '未知错误'}`,
        icon: 'error',
        duration: 3000
      });
    }
  },
  
  /**
   * 处理批量取消（带进度回调）
   */
  async processBatchCancel(selectedSchedules, progressCallback) {
    const schedules = this.data.filteredScheduleList.filter(schedule => 
      selectedSchedules.includes(schedule.id)
    );
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    for (const schedule of schedules) {
      try {
        // 模拟 API 调用
        await this.simulateAPICall();
        await ScheduleAPI.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CANCELLED);
        success++;
      } catch (error) {
        console.error(`取消日程 ${schedule.id} 失败:`, error);
        failed++;
      }
      
      processed++;
      progressCallback({ processed, success, failed });
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  },
  
  /**
   * 处理批量确认（带进度回调）
   */
  async processBatchConfirm(selectedSchedules, progressCallback) {
    const schedules = this.data.filteredScheduleList.filter(schedule => 
      selectedSchedules.includes(schedule.id)
    );
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    for (const schedule of schedules) {
      try {
        await this.simulateAPICall();
        await ScheduleAPI.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CONFIRMED);
        success++;
      } catch (error) {
        console.error(`确认日程 ${schedule.id} 失败:`, error);
        failed++;
      }
      
      processed++;
      progressCallback({ processed, success, failed });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  },
  
  /**
   * 处理批量时间调整（带进度回调）
   */
  async processBatchReschedule(selectedSchedules, progressCallback) {
    // 显示批量调整操作面板
    this.showBatchAdjustPanel(selectedSchedules, progressCallback);
  },

  /**
   * 显示批量调整操作面板
   */
  showBatchAdjustPanel(selectedSchedules, progressCallback) {
    const schedules = this.data.filteredScheduleList.filter(schedule => 
      selectedSchedules.includes(schedule.id)
    );

    // 设置批量调整面板数据
    this.setData({
      batchAdjustPanel: {
        visible: true,
        selectedSchedules: schedules,
        progressCallback: progressCallback,
        totalCount: schedules.length,
        currentStep: 1, // 1: 选择调整方式, 2: 设置参数, 3: 冲突检测, 4: 确认执行
        adjustType: '', // 'uniform', 'staggered', 'smart', 'custom'
        adjustParams: {},
        conflicts: [],
        preview: []
      }
    });
  },
  
  /**
   * 批量调整面板 - 选择调整类型
   */
  onBatchAdjustTypeSelect(e) {
    const adjustType = e.currentTarget.dataset.type;
    
    this.setData({
      'batchAdjustPanel.adjustType': adjustType,
      'batchAdjustPanel.currentStep': 2
    });
    
    // 根据类型初始化默认参数
    this.initializeAdjustParams(adjustType);
  },

  /**
   * 初始化调整参数
   */
  initializeAdjustParams(adjustType) {
    let defaultParams = {};
    let adjustTypeName = '';
    
    switch (adjustType) {
      case 'uniform':
        adjustTypeName = '统一调整';
        defaultParams = {
          delayType: 'hours', // 'minutes', 'hours', 'days', 'fixed'
          delayValue: 1,
          targetDate: this.getNextBusinessDay(),
          targetTime: '09:00',
          keepOrder: true,
          avoidNonWorkHours: true,
          avoidWeekends: false
        };
        break;
      case 'staggered':
        adjustTypeName = '错开调整';
        defaultParams = {
          startDateTime: this.getNextBusinessDay() + ' 09:00',
          interval: 30, // 间隔分钟数
          intervalType: 'minutes', // 'minutes', 'hours'
          maxPerDay: 8,
          sortBy: 'time' // 'time', 'priority', 'patient', 'distance'
        };
        break;
      case 'smart':
        adjustTypeName = '智能调整';
        defaultParams = {
          strategy: 'balanced', // 'distance', 'priority', 'time', 'balanced'
          considerTraffic: true,
          avoidWeekends: false,
          preferredTimeRange: {
            start: '08:00',
            end: '18:00'
          },
          distanceWeight: 30,
          priorityWeight: 40,
          timeWeight: 30
        };
        break;
      case 'proportion':
        adjustTypeName = '按比例调整';
        defaultParams = {
          proportionType: 'priority', // 'priority', 'urgency', 'duration', 'custom'
          baseInterval: 30, // 基准时间间隔（分钟）
          customProportions: [
            { level: 'urgent', levelName: '紧急', proportion: 50 },
            { level: 'high', levelName: '高', proportion: 30 },
            { level: 'medium', levelName: '中', proportion: 15 },
            { level: 'low', levelName: '低', proportion: 5 }
          ]
        };
        break;
      case 'template':
        adjustTypeName = '模板调整';
        defaultParams = {
          selectedTemplate: '',
          templateParams: {}
        };
        // 加载可用模板
        this.loadAvailableTemplates();
        break;
      case 'custom':
        adjustTypeName = '自定义调整';
        defaultParams = {
          customRules: [],
          applyToAll: true
        };
        break;
    }
    
    this.setData({
      'batchAdjustPanel.adjustParams': defaultParams,
      'batchAdjustPanel.adjustTypeName': adjustTypeName
    });
    
    // 生成初始预览
    this.updateBatchPreview();
  },

  /**
   * 更新调整参数
   */
  onAdjustParamChange(e) {
    let field, value;
    
    if (e.type === 'change') {
      // picker 组件
      field = e.currentTarget.dataset.field;
      if (field === 'intervalType') {
        value = e.detail.value === 0 ? 'minutes' : 'hours';
      } else {
        value = e.detail.value;
      }
    } else if (e.type === 'input') {
      // input 组件
      field = e.currentTarget.dataset.field;
      value = e.detail.value;
    } else if (e.type === 'tap') {
      // 按钮组件
      field = e.currentTarget.dataset.field;
      value = e.currentTarget.dataset.value;
    } else if (e.detail) {
      // switch 组件或自定义事件
      field = e.currentTarget.dataset.field || e.detail.field;
      value = e.detail.value;
    }
    
    if (!field) return;
    
    // 处理嵌套字段（如 preferredTimeRange.start）
    const keyPath = field.includes('.') ? 
      `batchAdjustPanel.adjustParams.${field}` : 
      `batchAdjustPanel.adjustParams.${field}`;
    
    // 特殊处理
    if (field === 'delayValue') {
      value = parseInt(value) || 0;
    } else if (field.includes('Weight')) {
      value = parseInt(value) || 0;
      // 检查权重总和
      this.validateWeights(field, value);
    }
    
    this.setData({
      [keyPath]: value
    });
    
    // 实时预览更新
    this.updateBatchPreview();
  },
  
  /**
   * 验证权重设置
   */
  validateWeights(changedField, newValue) {
    const params = this.data.batchAdjustPanel.adjustParams;
    const weights = {
      distanceWeight: changedField === 'distanceWeight' ? newValue : params.distanceWeight,
      priorityWeight: changedField === 'priorityWeight' ? newValue : params.priorityWeight,
      timeWeight: changedField === 'timeWeight' ? newValue : params.timeWeight
    };
    
    const totalWeight = weights.distanceWeight + weights.priorityWeight + weights.timeWeight;
    
    if (totalWeight > 100) {
      wx.showToast({
        title: '权重总和不能超过100%',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 更新批量调整预览
   */
  updateBatchPreview() {
    const { selectedSchedules, adjustType, adjustParams } = this.data.batchAdjustPanel;
    
    if (!adjustType || selectedSchedules.length === 0) {
      return;
    }
    
    try {
      // 根据调整类型生成预览
      let preview = [];
      let conflicts = [];
      
      switch (adjustType) {
        case 'uniform':
          preview = this.generateUniformPreview(selectedSchedules, adjustParams);
          break;
        case 'staggered':
          preview = this.generateStaggeredPreview(selectedSchedules, adjustParams);
          break;
        case 'smart':
          preview = this.generateSmartPreview(selectedSchedules, adjustParams);
          break;
        case 'proportion':
          preview = this.generateProportionPreview(selectedSchedules, adjustParams);
          break;
        case 'template':
          preview = this.generateTemplatePreview(selectedSchedules, adjustParams);
          break;
        case 'custom':
          preview = this.generateCustomPreview(selectedSchedules, adjustParams);
          break;
        default:
          preview = [];
      }
      
      // 检测冲突
      conflicts = this.detectBatchConflicts(preview);
      
      this.setData({
        'batchAdjustPanel.preview': preview,
        'batchAdjustPanel.conflicts': conflicts
      });
      
    } catch (error) {
      console.error('生成预览失败:', error);
    }
  },

  /**
   * 生成统一调整预览
   */
  generateUniformPreview(schedules, params) {
    const preview = [];
    
    schedules.forEach(schedule => {
      let newDateTime;
      
      if (params.delayType === 'fixed') {
        // 固定时间
        newDateTime = `${params.targetDate} ${params.targetTime}`;
      } else {
        // 延后指定时间
        const currentTime = new Date(`${schedule.date} ${schedule.time}`);
        let delayMs = 0;
        
        switch (params.delayType) {
          case 'minutes':
            delayMs = params.delayValue * 60 * 1000;
            break;
          case 'hours':
            delayMs = params.delayValue * 60 * 60 * 1000;
            break;
          case 'days':
            delayMs = params.delayValue * 24 * 60 * 60 * 1000;
            break;
        }
        
        const newTime = new Date(currentTime.getTime() + delayMs);
        
        // 避免非工作时间
        if (params.avoidNonWorkHours) {
          const adjustedTime = this.adjustToWorkHours(newTime);
          newDateTime = this.formatFullDateTime(adjustedTime);
        } else {
          newDateTime = this.formatFullDateTime(newTime);
        }
      }
      
      preview.push({
        scheduleId: schedule.id,
        originalDateTime: `${schedule.date} ${schedule.time}`,
        newDateTime,
        patientName: schedule.patientName || schedule.patient?.name || '未知患者',
        reason: this.getAdjustReason(params),
        status: 'pending'
      });
    });
    
    // 如果保持顺序，需要重新排序
    if (params.keepOrder) {
      preview.sort((a, b) => new Date(a.newDateTime) - new Date(b.newDateTime));
    }
    
    return preview;
  },

  /**
   * 生成错开调整预览
   */
  generateStaggeredPreview(schedules, params) {
    const preview = [];
    const startTime = new Date(`${params.startDateTime}`);
    
    // 排序
    let sortedSchedules = [...schedules];
    switch (params.sortBy) {
      case 'priority':
        sortedSchedules.sort((a, b) => this.comparePriority(b.priority, a.priority));
        break;
      case 'patient':
        sortedSchedules.sort((a, b) => (a.patientName || '').localeCompare(b.patientName || ''));
        break;
      case 'distance':
        sortedSchedules.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        break;
      default:
        sortedSchedules.sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
    }
    
    let currentTime = new Date(startTime);
    let dailyCount = 0;
    
    sortedSchedules.forEach((schedule, index) => {
      // 检查每日限制
      if (dailyCount >= params.maxPerDay) {
        // 移动到下一天
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(9, 0, 0, 0); // 重置到早上9点
        dailyCount = 0;
      }
      
      const newDateTime = this.formatFullDateTime(currentTime);
      
      preview.push({
        scheduleId: schedule.id,
        originalDateTime: `${schedule.date} ${schedule.time}`,
        newDateTime,
        patientName: schedule.patientName || schedule.patient?.name || '未知患者',
        reason: `错开调整，间隔${params.interval}${params.intervalType === 'minutes' ? '分钟' : '小时'}`,
        status: 'pending',
        order: index + 1
      });
      
      // 计算下一个时间
      if (params.intervalType === 'minutes') {
        currentTime.setMinutes(currentTime.getMinutes() + params.interval);
      } else {
        currentTime.setHours(currentTime.getHours() + params.interval);
      }
      
      dailyCount++;
    });
    
    return preview;
  },

  /**
   * 生成智能调整预览
   */
  generateSmartPreview(schedules, params) {
    const preview = [];
    
    // 计算每个预约的智能评分
    const schedulesWithScore = schedules.map(schedule => ({
      ...schedule,
      smartScore: this.calculateSmartScore(schedule, params)
    }));
    
    // 按评分排序
    schedulesWithScore.sort((a, b) => b.smartScore - a.smartScore);
    
    // 生成调整建议
    let currentTime = new Date();
    currentTime.setHours(params.preferredTimeRange.start.split(':')[0], 
                        params.preferredTimeRange.start.split(':')[1], 0, 0);
    
    schedulesWithScore.forEach(schedule => {
      const suggestedTime = this.findOptimalTime(schedule, params, currentTime);
      
      preview.push({
        scheduleId: schedule.id,
        originalDateTime: `${schedule.date} ${schedule.time}`,
        newDateTime: this.formatFullDateTime(suggestedTime),
        patientName: schedule.patientName || schedule.patient?.name || '未知患者',
        reason: `智能调整（评分：${schedule.smartScore.toFixed(1)}）`,
        status: 'pending',
        smartScore: schedule.smartScore
      });
      
      // 更新下一个可用时间
      currentTime = new Date(suggestedTime.getTime() + 60 * 60 * 1000); // 间隔1小时
    });
    
    return preview;
  },

  /**
   * 生成按比例调整预览
   */
  generateProportionPreview(schedules, params) {
    const preview = [];
    
    // 按优先级分组
    const groupedSchedules = this.groupSchedulesByPriority(schedules);
    
    let currentTime = new Date();
    currentTime.setHours(9, 0, 0, 0); // 从早上9点开始
    
    // 按比例分配时间
    params.customProportions.forEach(proportion => {
      const levelSchedules = groupedSchedules[proportion.level] || [];
      const timeSlots = Math.floor((params.baseInterval * proportion.proportion) / 100);
      
      levelSchedules.forEach((schedule, index) => {
        if (index < timeSlots) {
          preview.push({
            scheduleId: schedule.id,
            originalDateTime: `${schedule.date} ${schedule.time}`,
            newDateTime: this.formatFullDateTime(currentTime),
            patientName: schedule.patientName || schedule.patient?.name || '未知患者',
            reason: `${proportion.levelName}优先级分配（${proportion.proportion}%）`,
            status: 'pending',
            priority: proportion.level
          });
          
          currentTime.setMinutes(currentTime.getMinutes() + 30); // 间隔30分钟
        }
      });
    });
    
    return preview;
  },

  /**
   * 生成模板调整预览
   */
  generateTemplatePreview(schedules, params) {
    const preview = [];
    
    if (!params.selectedTemplate) {
      return preview;
    }
    
    // 根据选中的模板生成预览
    const template = this.data.batchAdjustPanel.availableTemplates.find(
      t => t.id === params.selectedTemplate
    );
    
    if (template) {
      schedules.forEach((schedule, index) => {
        const newDateTime = this.applyTemplate(schedule, template, index);
        
        preview.push({
          scheduleId: schedule.id,
          originalDateTime: `${schedule.date} ${schedule.time}`,
          newDateTime,
          patientName: schedule.patientName || schedule.patient?.name || '未知患者',
          reason: `模板调整：${template.name}`,
          status: 'pending'
        });
      });
    }
    
    return preview;
  },

  /**
   * 生成自定义调整预览
   */
  generateCustomPreview(schedules, params) {
    const preview = [];
    
    if (!params.customRules || params.customRules.length === 0) {
      return preview;
    }
    
    schedules.forEach(schedule => {
      let newDateTime = `${schedule.date} ${schedule.time}`;
      let reason = '自定义调整';
      
      // 应用自定义规则
      params.customRules.forEach(rule => {
        if (this.matchesRule(schedule, rule)) {
          newDateTime = this.applyCustomRule(schedule, rule);
          reason = `自定义调整：${rule.description || rule.name}`;
        }
      });
      
      preview.push({
        scheduleId: schedule.id,
        originalDateTime: `${schedule.date} ${schedule.time}`,
        newDateTime,
        patientName: schedule.patientName || schedule.patient?.name || '未知患者',
        reason,
        status: 'pending'
      });
    });
    
    return preview;
  },

  /**
   * 检测批量冲突
   */
  detectBatchConflicts(preview) {
    const conflicts = [];
    const timeSlots = new Map();
    
    // 检测内部冲突（批量调整之间的冲突）
    preview.forEach((item, index) => {
      const timeKey = item.newDateTime;
      
      if (timeSlots.has(timeKey)) {
        conflicts.push({
          type: 'internal',
          scheduleIds: [timeSlots.get(timeKey).scheduleId, item.scheduleId],
          time: timeKey,
          description: '批量调整项目之间时间冲突',
          severity: 'high'
        });
      } else {
        timeSlots.set(timeKey, item);
      }
    });
    
    // 检测与现有预约的冲突（简化实现）
    const allSchedules = this.data.filteredScheduleList;
    const selectedIds = preview.map(p => p.scheduleId);
    
    preview.forEach(item => {
      const conflictSchedules = allSchedules.filter(schedule => 
        !selectedIds.includes(schedule.id) && 
        `${schedule.date} ${schedule.time}` === item.newDateTime
      );
      
      if (conflictSchedules.length > 0) {
        conflicts.push({
          type: 'external',
          scheduleId: item.scheduleId,
          conflictWith: conflictSchedules.map(s => s.id),
          time: item.newDateTime,
          description: '与现有预约时间冲突',
          severity: 'medium'
        });
      }
    });
    
    return conflicts;
  },

  /**
   * 辅助函数：调整到工作时间
   */
  adjustToWorkHours(dateTime) {
    const time = new Date(dateTime);
    const hour = time.getHours();
    
    if (hour < 8) {
      time.setHours(8, 0, 0, 0);
    } else if (hour >= 18) {
      time.setDate(time.getDate() + 1);
      time.setHours(8, 0, 0, 0);
    }
    
    return time;
  },

  /**
   * 辅助函数：格式化完整日期时间
   */
  formatFullDateTime(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 辅助函数：获取调整原因
   */
  getAdjustReason(params) {
    if (params.delayType === 'fixed') {
      return `统一调整到 ${params.targetDate} ${params.targetTime}`;
    } else {
      const unit = {
        'minutes': '分钟',
        'hours': '小时',
        'days': '天'
      }[params.delayType] || '';
      return `统一延后 ${params.delayValue} ${unit}`;
    }
  },

  /**
   * 辅助函数：计算智能评分
   */
  calculateSmartScore(schedule, params) {
    let score = 0;
    
    // 优先级权重
    const priorityScore = {
      'urgent': 100,
      'high': 80,
      'medium': 60,
      'low': 40
    }[schedule.priority] || 50;
    score += (priorityScore * params.priorityWeight) / 100;
    
    // 距离权重（假设越近越好）
    const distanceScore = Math.max(0, 100 - (schedule.distance || 0) * 2);
    score += (distanceScore * params.distanceWeight) / 100;
    
    // 时间权重（假设越早越好）
    const timeScore = this.calculateTimeScore(schedule);
    score += (timeScore * params.timeWeight) / 100;
    
    return score;
  },

  /**
   * 辅助函数：计算时间评分
   */
  calculateTimeScore(schedule) {
    const scheduleTime = new Date(`${schedule.date} ${schedule.time}`);
    const now = new Date();
    const hoursDiff = (scheduleTime - now) / (1000 * 60 * 60);
    
    // 越接近当前时间分数越高，但有上限
    if (hoursDiff < 0) return 0; // 过期
    if (hoursDiff < 24) return 100; // 24小时内最高分
    if (hoursDiff < 72) return 80;  // 3天内高分
    if (hoursDiff < 168) return 60; // 1周内中等分
    return 40; // 超过1周低分
  },

  /**
   * 辅助函数：获取下一个工作日
   */
  getNextBusinessDay() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 如果是周末，调整到下周一
    if (tomorrow.getDay() === 0) { // 周日
      tomorrow.setDate(tomorrow.getDate() + 1);
    } else if (tomorrow.getDay() === 6) { // 周六
      tomorrow.setDate(tomorrow.getDate() + 2);
    }
    
    return this.formatDate(tomorrow);
  },

  /**
   * 批量调整面板 - 步骤控制
   */
  onBatchAdjustStep(e) {
    const action = e.currentTarget.dataset.action;
    const currentStep = this.data.batchAdjustPanel.currentStep;
    
    let newStep = currentStep;
    
    switch (action) {
      case 'next':
        if (currentStep < 4) {
          newStep = currentStep + 1;
          
          // 步骤2到3时，执行冲突检测
          if (newStep === 3) {
            this.updateBatchPreview();
          }
        }
        break;
      case 'prev':
        if (currentStep > 1) {
          newStep = currentStep - 1;
        }
        break;
      case 'restart':
        newStep = 1;
        this.setData({
          'batchAdjustPanel.adjustType': '',
          'batchAdjustPanel.adjustParams': {},
          'batchAdjustPanel.preview': [],
          'batchAdjustPanel.conflicts': []
        });
        break;
    }
    
    this.setData({
      'batchAdjustPanel.currentStep': newStep
    });
    
    // 步骤切换提示
    if (newStep !== currentStep) {
      const stepNames = ['', '选择调整方式', '设置参数', '冲突检测', '确认执行'];
      wx.showToast({
        title: `步骤${newStep}: ${stepNames[newStep]}`,
        icon: 'none',
        duration: 1500
      });
    }
  },

  /**
   * 关闭批量调整面板
   */
  closeBatchAdjustPanel() {
    this.setData({
      'batchAdjustPanel.visible': false,
      'batchAdjustPanel.currentStep': 1,
      'batchAdjustPanel.adjustType': '',
      'batchAdjustPanel.adjustParams': {},
      'batchAdjustPanel.preview': [],
      'batchAdjustPanel.conflicts': []
    });
  },

  /**
   * 执行批量调整
   */
  async executeBatchAdjustment() {
    const { selectedSchedules, preview, progressCallback } = this.data.batchAdjustPanel;
    
    if (preview.length === 0) {
      wx.showToast({
        title: '没有可执行的调整',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示确认对话框
    const success = await this.showBatchExecuteConfirm(preview);
    if (!success) return;
    
    // 关闭调整面板
    this.closeBatchAdjustPanel();
    
    // 执行批量调整
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    try {
      for (const item of preview) {
        try {
          // 调用时间调整API
          await this.executeTimeAdjustment(item);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            scheduleId: item.scheduleId,
            error: error.message
          });
        }
        
        processedCount++;
        
        // 更新进度
        if (progressCallback) {
          progressCallback({
            processed: processedCount,
            success: successCount,
            failed: failedCount
          });
        }
      }
      
      // 刷新列表
      await this.loadScheduleList(true);
      
      // 显示结果
      this.showBatchResult({
        total: preview.length,
        success: successCount,
        failed: failedCount,
        errors
      });
      
    } catch (error) {
      console.error('批量调整执行失败:', error);
      wx.showToast({
        title: '批量调整失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 显示批量执行确认对话框
   */
  showBatchExecuteConfirm(preview) {
    return new Promise((resolve) => {
      const conflicts = this.data.batchAdjustPanel.conflicts.length;
      let content = `即将调整 ${preview.length} 个预约的时间`;
      
      if (conflicts > 0) {
        content += `\n\n⚠️ 检测到 ${conflicts} 个冲突，执行后可能需要手动处理`;
      }
      
      content += '\n\n确认执行批量时间调整吗？';
      
      wx.showModal({
        title: '确认批量调整',
        content,
        confirmText: '确认执行',
        cancelText: '取消',
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  },

  /**
   * 执行单个时间调整
   */
  async executeTimeAdjustment(adjustmentItem) {
    // 模拟API调用
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% 成功率的模拟
        if (Math.random() > 0.1) {
          resolve(adjustmentItem);
        } else {
          reject(new Error('调整失败'));
        }
      }, 200 + Math.random() * 300);
    });
  },

  /**
   * 显示批量调整结果
   */
  showBatchResult(result) {
    let title, content;
    
    if (result.failed === 0) {
      title = '批量调整成功';
      content = `成功调整了 ${result.success} 个预约的时间`;
    } else if (result.success === 0) {
      title = '批量调整失败';
      content = `${result.failed} 个预约调整失败，请检查网络连接后重试`;
    } else {
      title = '批量调整部分完成';
      content = `成功调整 ${result.success} 个，失败 ${result.failed} 个预约`;
    }
    
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  /**
   * 预览详情切换
   */
  togglePreviewDetail() {
    this.setData({
      'batchAdjustPanel.showPreviewDetail': !this.data.batchAdjustPanel.showPreviewDetail
    });
  },

  /**
   * 加载可用模板
   */
  async loadAvailableTemplates() {
    try {
      // 模拟API调用
      const templates = [
        {
          id: 'morning_shift',
          name: '晨间服务模板',
          description: '统一安排到早上8-12点',
          params: {
            timeRange: { start: '08:00', end: '12:00' },
            interval: 30
          }
        },
        {
          id: 'afternoon_shift',
          name: '下午服务模板',
          description: '统一安排到下午2-6点',
          params: {
            timeRange: { start: '14:00', end: '18:00' },
            interval: 30
          }
        },
        {
          id: 'priority_based',
          name: '优先级模板',
          description: '按优先级分配时间段',
          params: {
            urgentTime: '08:00-10:00',
            highTime: '10:00-14:00',
            mediumTime: '14:00-17:00',
            lowTime: '17:00-18:00'
          }
        }
      ];
      
      this.setData({
        'batchAdjustPanel.availableTemplates': templates
      });
      
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  },

  /**
   * 模板选择
   */
  onTemplateSelect(e) {
    const templateId = e.currentTarget.dataset.templateId;
    
    this.setData({
      'batchAdjustPanel.adjustParams.selectedTemplate': templateId
    });
    
    // 更新预览
    this.updateBatchPreview();
  },
  
  /**
   * 比例设置变化
   */
  onProportionChange(e) {
    const level = e.currentTarget.dataset.level;
    const proportion = parseInt(e.detail.value);
    
    const customProportions = this.data.batchAdjustPanel.adjustParams.customProportions.map(item => {
      if (item.level === level) {
        return { ...item, proportion };
      }
      return item;
    });
    
    this.setData({
      'batchAdjustPanel.adjustParams.customProportions': customProportions
    });
    
    this.updateBatchPreview();
  },
  
  /**
   * 模板选择
   */
  onTemplateSelect(e) {
    const templateId = e.currentTarget.dataset.templateId;
    
    this.setData({
      'batchAdjustPanel.adjustParams.selectedTemplate': templateId
    });
    
    // 加载模板参数
    this.loadTemplateParams(templateId);
  },
  
  /**
   * 快速延期选择
   */
  onQuickDelaySelect(e) {
    const delay = parseInt(e.currentTarget.dataset.delay);
    
    // 设置为统一调整模式
    this.setData({
      'batchAdjustPanel.adjustType': 'uniform',
      'batchAdjustPanel.adjustTypeName': '统一调整',
      'batchAdjustPanel.currentStep': 2
    });
    
    // 设置延迟参数
    let delayType, delayValue;
    if (delay < 60) {
      delayType = 'minutes';
      delayValue = delay;
    } else if (delay < 1440) {
      delayType = 'hours';
      delayValue = Math.round(delay / 60);
    } else {
      delayType = 'days';
      delayValue = Math.round(delay / 1440);
    }
    
    this.setData({
      'batchAdjustPanel.adjustParams.delayType': delayType,
      'batchAdjustPanel.adjustParams.delayValue': delayValue
    });
    
    this.updateBatchPreview();
  },
  
  /**
   * 快速时间选择
   */
  onQuickTimeSelect(e) {
    const timeType = e.currentTarget.dataset.time;
    
    // 设置为统一调整模式
    this.setData({
      'batchAdjustPanel.adjustType': 'uniform',
      'batchAdjustPanel.adjustTypeName': '统一调整',
      'batchAdjustPanel.currentStep': 2,
      'batchAdjustPanel.adjustParams.delayType': 'fixed'
    });
    
    let targetDate, targetTime;
    const today = new Date();
    
    switch (timeType) {
      case 'tomorrow-9':
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        targetTime = '09:00';
        break;
      case 'tomorrow-14':
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        targetTime = '14:00';
        break;
      case 'next-monday':
        const nextMonday = this.getNextMonday();
        targetDate = nextMonday.toISOString().split('T')[0];
        targetTime = '09:00';
        break;
      case 'weekend':
        const nextSaturday = this.getNextSaturday();
        targetDate = nextSaturday.toISOString().split('T')[0];
        targetTime = '09:00';
        break;
    }
    
    this.setData({
      'batchAdjustPanel.adjustParams.targetDate': targetDate,
      'batchAdjustPanel.adjustParams.targetTime': targetTime
    });
    
    this.updateBatchPreview();
  },

  /**
   * 更新批量预览
   */
  async updateBatchPreview() {
    const { adjustType, adjustParams, selectedSchedules } = this.data.batchAdjustPanel;
    
    try {
      const preview = await this.generateAdjustmentPreview(selectedSchedules, adjustType, adjustParams);
      
      this.setData({
        'batchAdjustPanel.preview': preview
      });
    } catch (error) {
      console.error('生成预览失败:', error);
    }
  },

  /**
   * 生成调整预览
   */
  async generateAdjustmentPreview(schedules, adjustType, params) {
    const preview = [];
    
    switch (adjustType) {
      case 'uniform':
        return this.generateUniformPreview(schedules, params);
      case 'staggered':
        return this.generateStaggeredPreview(schedules, params);
      case 'smart':
        return this.generateSmartPreview(schedules, params);
      case 'custom':
        return this.generateCustomPreview(schedules, params);
      default:
        return [];
    }
  },

  /**
   * 生成统一调整预览
   */
  generateUniformPreview(schedules, params) {
    const preview = [];
    
    schedules.forEach(schedule => {
      const originalTime = new Date(schedule.startTime);
      let newTime;
      
      if (params.targetDate && params.targetTime) {
        // 指定日期和时间
        newTime = new Date(params.targetDate + 'T' + params.targetTime + ':00');
      } else {
        // 按延迟时间计算
        newTime = new Date(originalTime);
        
        switch (params.delayType) {
          case 'minutes':
            newTime.setMinutes(newTime.getMinutes() + params.delayValue);
            break;
          case 'hours':
            newTime.setHours(newTime.getHours() + params.delayValue);
            break;
          case 'days':
            newTime.setDate(newTime.getDate() + params.delayValue);
            break;
        }
      }
      
      preview.push({
        scheduleId: schedule.id,
        patientName: schedule.patientName,
        originalTime: originalTime,
        newTime: newTime,
        duration: schedule.duration,
        conflict: false, // 将在冲突检测中更新
        status: 'pending'
      });
    });
    
    return preview;
  },

  /**
   * 生成错开调整预览
   */
  generateStaggeredPreview(schedules, params) {
    const preview = [];
    const startTime = new Date();
    
    // 设置起始时间
    const [hours, minutes] = params.startTime.split(':');
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // 如果起始时间已过，调整到明天
    if (startTime < new Date()) {
      startTime.setDate(startTime.getDate() + 1);
    }
    
    schedules.forEach((schedule, index) => {
      const newTime = new Date(startTime);
      
      // 计算每个预约的时间
      const intervalMinutes = params.intervalType === 'hours' ? params.interval * 60 : params.interval;
      newTime.setMinutes(newTime.getMinutes() + index * intervalMinutes);
      
      // 检查是否超出当日最大数量
      const dayOffset = Math.floor(index / params.maxPerDay);
      if (dayOffset > 0) {
        newTime.setDate(newTime.getDate() + dayOffset);
        newTime.setMinutes(newTime.getMinutes() - Math.floor(index / params.maxPerDay) * params.maxPerDay * intervalMinutes);
      }
      
      preview.push({
        scheduleId: schedule.id,
        patientName: schedule.patientName,
        originalTime: new Date(schedule.startTime),
        newTime: newTime,
        duration: schedule.duration,
        conflict: false,
        status: 'pending'
      });
    });
    
    return preview;
  },

  /**
   * 生成智能调整预览
   */
  async generateSmartPreview(schedules, params) {
    const preview = [];
    
    // 根据策略排序
    let sortedSchedules = [...schedules];
    
    switch (params.strategy) {
      case 'distance':
        sortedSchedules = await this.sortByDistance(schedules);
        break;
      case 'priority':
        sortedSchedules = this.sortByPriority(schedules);
        break;
      case 'time':
        sortedSchedules = this.sortByTime(schedules);
        break;
    }
    
    // 生成智能时间分配
    const timeSlots = await this.generateOptimalTimeSlots(
      sortedSchedules.length, 
      params.preferredTimeRange, 
      params.avoidWeekends,
      params.considerTraffic
    );
    
    sortedSchedules.forEach((schedule, index) => {
      preview.push({
        scheduleId: schedule.id,
        patientName: schedule.patientName,
        originalTime: new Date(schedule.startTime),
        newTime: timeSlots[index],
        duration: schedule.duration,
        conflict: false,
        status: 'pending',
        smartReason: this.getSmartAdjustReason(schedule, timeSlots[index], params.strategy)
      });
    });
    
    return preview;
  },
  
  /**
   * 批量调整时间
   */
  async batchReschedule(scheduleIds) {
    try {
      // 检查批量调整权限
      const userInfo = wx.getStorageSync('userInfo') || {};
      const { RolePermissionManager } = require('../../utils/role-permission.js');
      
      // 获取选中的预约信息
      const selectedSchedules = this.data.filteredScheduleList.filter(schedule => 
        scheduleIds.includes(schedule.id)
      );
      
      const permissionCheck = RolePermissionManager.checkBatchAdjustPermission(userInfo.role, selectedSchedules);
      
      if (!permissionCheck.allowed) {
        wx.showToast({
          title: permissionCheck.reason || '没有批量调整权限',
          icon: 'none'
        });
        return;
      }
      
      // 显示批量调整选项
      const options = [
        '使用时间调整弹窗',
        '一键延期功能',
        '智能重新安排',
        '自定义批量调整'
      ];
      
      wx.showActionSheet({
        itemList: options,
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.showBatchTimeAdjustModal(selectedSchedules);
              break;
            case 1:
              this.batchDelayAppointments(selectedSchedules);
              break;
            case 2:
              this.smartBatchReschedule(selectedSchedules);
              break;
            case 3:
              this.showCustomBatchAdjust(selectedSchedules);
              break;
          }
        }
      });
      
    } catch (error) {
      console.error('批量调整错误:', error);
      wx.showToast({
        title: '批量调整失败',
        icon: 'none'
      });
    }
  },

  /**
   * 获取下一个工作日
   */
  getNextBusinessDay() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 如果是周末，调整到下周一
    if (tomorrow.getDay() === 0) { // 周日
      tomorrow.setDate(tomorrow.getDate() + 1);
    } else if (tomorrow.getDay() === 6) { // 周六
      tomorrow.setDate(tomorrow.getDate() + 2);
    }
    
    return tomorrow.toISOString().split('T')[0];
  },

  /**
   * 按距离排序
   */
  async sortByDistance(schedules) {
    // 模拟距离计算，实际应该调用地图 API
    const schedulesWithDistance = schedules.map(schedule => ({
      ...schedule,
      distance: Math.random() * 50 // 模拟距离（公里）
    }));
    
    return schedulesWithDistance.sort((a, b) => a.distance - b.distance);
  },

  /**
   * 按优先级排序
   */
  sortByPriority(schedules) {
    const priorityOrder = {
      'urgent': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    
    return schedules.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 5;
      const bPriority = priorityOrder[b.priority] || 5;
      return aPriority - bPriority;
    });
  },

  /**
   * 按时间排序
   */
  sortByTime(schedules) {
    return schedules.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  },

  /**
   * 生成最优时间段
   */
  async generateOptimalTimeSlots(count, timeRange, avoidWeekends, considerTraffic) {
    const slots = [];
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    const workingHours = endHour - startHour;
    
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // 从明天开始
    currentDate.setHours(startHour, 0, 0, 0);
    
    for (let i = 0; i < count; i++) {
      // 跳过周末（如果需要）
      if (avoidWeekends) {
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // 考虑交通情况（防止高峰期）
      if (considerTraffic) {
        const hour = currentDate.getHours();
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
          // 高峰期，调整时间
          if (hour <= 9) {
            currentDate.setHours(10, 0, 0, 0);
          } else {
            currentDate.setHours(20, 0, 0, 0);
          }
        }
      }
      
      slots.push(new Date(currentDate));
      
      // 移到下一个时间段（每1.5小时一个）
      currentDate.setHours(currentDate.getHours() + 1, 30, 0, 0);
      
      // 如果超出工作时间，调整到下一天
      if (currentDate.getHours() >= endHour) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(startHour, 0, 0, 0);
      }
    }
    
    return slots;
  },

  /**
   * 获取智能调整原因
   */
  getSmartAdjustReason(schedule, newTime, strategy) {
    const reasons = {
      'distance': '按距离优化排序',
      'priority': '按优先级排序',
      'time': '按时间顺序排序'
    };
    
    return reasons[strategy] || '智能优化排序';
  },

  /**
   * 执行冲突检测
   */
  async performConflictDetection() {
    const { preview } = this.data.batchAdjustPanel;
    
    this.setData({
      'batchAdjustPanel.currentStep': 3
    });
    
    wx.showLoading({ title: '检测冲突中...' });
    
    try {
      // 进度回调
      const progressCallback = (progress) => {
        const progressText = `检测进度: ${progress.processed}/${progress.total}`;
        wx.showLoading({ title: progressText });
      };
      
      const conflicts = await this.detectBatchConflicts(preview, progressCallback);
      
      // 更新预览中的冲突信息
      const updatedPreview = preview.map(item => {
        const conflict = conflicts.find(c => c.scheduleId === item.scheduleId);
        return {
          ...item,
          conflict: !!conflict,
          conflictDetails: conflict ? conflict.details : null,
          conflictSeverity: conflict ? conflict.severity : null
        };
      });
      
      this.setData({
        'batchAdjustPanel.preview': updatedPreview,
        'batchAdjustPanel.conflicts': conflicts
      });
      
      wx.hideLoading();
      
      if (conflicts.length > 0) {
        // 有冲突，显示冲突处理界面
        this.showBatchConflictHandler();
        
        // 显示冲突总结
        wx.showToast({
          title: `发现 ${conflicts.length} 个冲突`,
          icon: 'none',
          duration: 2000
        });
      } else {
        // 无冲突，直接进入确认步骤
        this.setData({
          'batchAdjustPanel.currentStep': 4
        });
        
        wx.showToast({
          title: '未发现冲突，可以执行',
          icon: 'success'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '冲突检测失败',
        icon: 'none'
      });
      console.error('冲突检测失败:', error);
    }
  },

  /**
   * 检测批量冲突 - 使用新的批量冲突检测服务
   */
  async detectBatchConflicts(preview, progressCallback = null) {
    try {
      console.log('[Schedule] 开始批量冲突检测, 项目数量:', preview.length);
      
      // 延迟导入 BatchConflictDetectionService
      if (!this.batchConflictService) {
        try {
          const BatchConflictDetectionService = require('../../services/batch-conflict-detection.service.js');
          this.batchConflictService = new BatchConflictDetectionService();
        } catch (error) {
          console.error('无法加载批量冲突检测服务:', error);
          // 使用简化的冲突检测
          return this.detectSimpleBatchConflicts(preview, progressCallback);
        }
      }
      
      // 转换预览数据格式为服务所需的格式
      const batchItems = preview.map(item => ({
        scheduleId: item.scheduleId,
        patientName: item.patientName,
        newTime: item.newTime || item.newDateTime,
        originalTime: item.originalTime || item.originalDateTime,
        duration: item.duration || 60,
        priority: item.priority || 'normal',
        serviceType: item.serviceType || 'general'
      }));
      
      // 调用批量冲突检测服务
      const detectionResult = await this.batchConflictService.detectBatchConflicts(batchItems, {
        progressCallback: (progress) => {
          if (progressCallback) {
            // 转换进度格式
            progressCallback({ 
              processed: progress.processed, 
              total: progress.total 
            });
          }
        },
        includeExternal: true,
        severityThreshold: 'low'
      });
      
      // 转换结果格式为页面所需的格式
      const conflicts = detectionResult.conflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        scheduleId: conflict.scheduleId,
        conflictWith: conflict.conflictWith,
        conflictWithData: conflict.type === 'internal' ? 
          conflict.conflictData.item2 : conflict.conflictData.existingSchedule,
        details: this.generateConflictDetails(conflict),
        originalTime: conflict.conflictData.batchItem?.originalTime || 
                     conflict.conflictData.item1?.originalTime,
        newTime: conflict.conflictData.batchItem?.newTime || 
                conflict.conflictData.item1?.newTime,
        patientName: conflict.conflictData.batchItem?.patientName || 
                    conflict.conflictData.item1?.patientName,
        duration: conflict.conflictData.batchItem?.duration || 
                 conflict.conflictData.item1?.duration || 60,
        detectedAt: conflict.detectedAt,
        impactScore: conflict.impactScore,
        overlapInfo: conflict.overlapInfo
      }));
      
      console.log('[Schedule] 批量冲突棅测完成, 发现冲突:', conflicts.length);
      console.log('[Schedule] 棅测统计:', detectionResult.statistics);
      
      // 保存详细统计信息到页面数据
      this.setData({
        'batchAdjustPanel.detectionStatistics': detectionResult.statistics,
        'batchAdjustPanel.processingInfo': detectionResult.processing,
        'batchAdjustPanel.recommendations': detectionResult.recommendations
      });
      
      return conflicts;
      
    } catch (error) {
      console.error('[Schedule] 批量冲突棅测失败:', error);
      wx.showToast({
        title: '冲突棅测失败',
        icon: 'none'
      });
      return [];
    }
  },
  
  /**
   * 简化的批量冲突检测（备用方案）
   */
  async detectSimpleBatchConflicts(preview, progressCallback = null) {
    try {
      console.log('[Schedule] 使用简化冲突检测');
      const conflicts = [];
      
      // 检测预览项目之间的冲突
      for (let i = 0; i < preview.length; i++) {
        for (let j = i + 1; j < preview.length; j++) {
          const item1 = preview[i];
          const item2 = preview[j];
          
          if (this.hasTimeOverlap(
            item1.newTime || item1.newDateTime, 
            item1.duration || 60,
            item2.newTime || item2.newDateTime, 
            item2.duration || 60
          )) {
            conflicts.push({
              id: `conflict_${i}_${j}`,
              type: 'internal',
              severity: 'medium',
              scheduleId: item1.scheduleId,
              conflictWith: item2.scheduleId,
              conflictWithData: item2,
              details: `与${item2.patientName}的预约时间冲突`,
              originalTime: item1.originalTime || item1.originalDateTime,
              newTime: item1.newTime || item1.newDateTime,
              patientName: item1.patientName,
              duration: item1.duration || 60,
              detectedAt: new Date().toISOString()
            });
          }
        }
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            processed: i + 1,
            total: preview.length
          });
        }
      }
      
      console.log('[Schedule] 简化冲突检测完成, 发现冲突:', conflicts.length);
      return conflicts;
      
    } catch (error) {
      console.error('[Schedule] 简化冲突检测失败:', error);
      return [];
    }
  },
  
  /**
   * 生成冲突详情描述
   */
  generateConflictDetails(conflict) {
    const { type, conflictData, overlapInfo } = conflict;
    
    if (type === 'internal') {
      const { item1, item2 } = conflictData;
      return `与${item2.patientName}的预约时间冲突（重叠${Math.round(overlapInfo.overlapDuration || 0)}分钟）`;
    } else if (type === 'external') {
      const { existingSchedule } = conflictData;
      return `与现有预约(${existingSchedule.patientName})冲突（重叠${Math.round(overlapInfo.overlapDuration || 0)}分钟）`;
    }
    
    return '未知冲突类型';
  },

  /**
   * 检查时间重叠
   */
  hasTimeOverlap(time1, duration1, time2, duration2) {
    const start1 = new Date(time1);
    const end1 = new Date(start1.getTime() + duration1 * 60000);
    const start2 = new Date(time2);
    const end2 = new Date(start2.getTime() + duration2 * 60000);
    
    return !(end1 <= start2 || end2 <= start1);
  },
    
  /**
   * 显示批量冲突处理界面
   */
  showBatchConflictHandler() {
    const { conflicts, preview } = this.data.batchAdjustPanel;
    
    // 分类冲突
    const internalConflicts = conflicts.filter(c => c.type === 'internal');
    const externalConflicts = conflicts.filter(c => c.type === 'external');
    
    // 增强冲突分析
    const enhancedConflicts = this.analyzeConflictDetails(conflicts);
    const severityStats = this.calculateSeverityStats(enhancedConflicts);
    const overallSeverity = this.calculateOverallSeverity(enhancedConflicts);
    const impactAnalysis = this.calculateImpactAnalysis(enhancedConflicts);
    const criticalConflicts = enhancedConflicts.filter(c => c.severity === 'high' || c.severity === 'critical');
    
    // 按严重程度排序
    const sortedConflicts = this.sortConflictsBySeverity(enhancedConflicts);
    
    this.setData({
      batchConflictPanel: {
        visible: true,
        conflicts: enhancedConflicts,
        internalConflicts: internalConflicts,
        externalConflicts: externalConflicts,
        criticalConflicts: criticalConflicts,
        selectedConflicts: [], // 用户选择的冲突项
        resolutionStrategy: 'auto', // 'auto', 'manual', 'skip'
        autoResolutionOptions: {
          preferEarlier: true,
          allowWeekends: false,
          maxDaysDelay: 7
        },
        
        // 增强的分析数据
        overallSeverity: overallSeverity.level,
        overallSeverityText: overallSeverity.text,
        severityStats: severityStats,
        impactAnalysis: impactAnalysis,
        sortedConflicts: sortedConflicts,
        conflictFilter: {
          type: 'all',
          severity: 'all'
        }
      }
    });
  },

  /**
   * 冲突解决策略选择
   */
  onConflictResolutionSelect(e) {
    const strategy = e.currentTarget.dataset.strategy;
    
    this.setData({
      'batchConflictPanel.resolutionStrategy': strategy
    });
    
    // 根据策略显示不同的选项
    this.updateConflictResolutionOptions(strategy);
    
    // 显示策略选择反馈
    wx.vibrateShort();
    
    const strategyNames = {
      'auto': '智能自动解决',
      'manual': '手动精准解决',
      'skip': '跳过冲突项目',
      'smart': '智能混合策略'
    };
    
    wx.showToast({
      title: `已选择: ${strategyNames[strategy]}`,
      icon: 'success',
      duration: 1500
    });
  },
  
  /**
   * 获取策略推荐分数
   */
  getStrategyRecommendationScore(strategy, conflicts) {
    const conflictCount = conflicts.length;
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
    const highCount = conflicts.filter(c => c.severity === 'high').length;
    
    let score = 0;
    
    switch (strategy) {
      case 'auto':
        // 自动解决适合中等数量、低复杂度的冲突
        if (conflictCount <= 10 && criticalCount <= 2) score += 80;
        if (conflictCount > 20) score -= 30;
        break;
        
      case 'manual':
        // 手动解决适合复杂或高优先级冲突
        if (criticalCount > 0 || highCount > conflictCount * 0.5) score += 90;
        if (conflictCount > 15) score -= 20;
        break;
        
      case 'skip':
        // 跳过适合大量低优先级冲突
        if (conflictCount > 15 && criticalCount === 0) score += 60;
        if (criticalCount > 0) score -= 50;
        break;
        
      case 'smart':
        // 智能混合适合各种情况
        score = 70; // 基础分
        if (conflictCount > 10) score += 20;
        if (criticalCount > 0 && highCount > 0) score += 15;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  },
  
  /**
   * 获取策略推荐原因
   */
  getStrategyRecommendationReason(strategy, conflicts) {
    const conflictCount = conflicts.length;
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
    
    const reasons = {
      'auto': [
        `适合 ${conflictCount} 个冲突的自动处理`,
        '高效率，低错误率',
        '平均处理时间 30 秒'
      ],
      'manual': [
        `可精准处理 ${criticalCount} 个严重冲突`,
        '完全控制处理过程',
        '适合复杂情况'
      ],
      'skip': [
        `将处理 ${conflicts.length - conflictCount} 个无冲突项目`,
        '快速完成，降低风险',
        '保持原有安排'
      ],
      'smart': [
        'AI 智能分析最优方案',
        '组合多种策略优势',
        '最大化整体效果'
      ]
    };
    
    return reasons[strategy] || [];
  },

  /**
   * 更新冲突解决选项
   */
  updateConflictResolutionOptions(strategy) {
    switch (strategy) {
      case 'auto':
        this.showAutoResolutionOptions();
        break;
      case 'manual':
        this.showManualResolutionOptions();
        break;
      case 'skip':
        this.showSkipOptions();
        break;
    }
  },

  /**
   * 显示自动解决选项
   */
  showAutoResolutionOptions() {
    // 自动解决的配置选项已在 data 中定义
    // 用户可以调整这些参数
  },

  /**
   * 显示手动解决选项
   */
  showManualResolutionOptions() {
    // 显示每个冲突的具体解决选项
    const { conflicts } = this.data.batchConflictPanel;
    
    const manualOptions = conflicts.map(conflict => {
      const baseOptions = [
        { key: 'reschedule', label: '重新安排该项', icon: '📅', priority: 1, description: '自动找到合适的时间重新安排' },
        { key: 'reschedule_manual', label: '手动选择时间', icon: '⏰', priority: 2, description: '手动选择新的时间进行调整' },
        { key: 'skip', label: '跳过该项', icon: '⏭️', priority: 3, description: '保持原有时间，不进行调整' },
        { key: 'cancel', label: '取消该项', icon: '❌', priority: 5, description: '彻底取消该预约安排' }
      ];
      
      // 根据冲突严重程度添加选项
      if (conflict.severity !== 'critical') {
        baseOptions.push({
          key: 'force', 
          label: '强制覆盖', 
          icon: '⚠️', 
          priority: 4, 
          description: '强制执行，忽略冲突警告',
          warning: true
        });
      }
      
      // 根据冲突类型添加特殊选项
      if (conflict.type === 'external') {
        baseOptions.push({
          key: 'negotiate', 
          label: '协调现有预约', 
          icon: '🤝', 
          priority: 2.5, 
          description: '与相关人员协调调整现有预约'
        });
      }
      
      // 按优先级排序
      baseOptions.sort((a, b) => a.priority - b.priority);
      
      return {
        conflictId: conflict.scheduleId,
        conflictData: conflict,
        options: baseOptions,
        selectedOption: this.getRecommendedOption(conflict),
        customTime: null,
        notes: ''
      };
    });
    
    this.setData({
      'batchConflictPanel.manualOptions': manualOptions
    });
  },
  
  /**
   * 获取推荐选项
   */
  getRecommendedOption(conflict) {
    // 根据冲突类型和严重程度推荐选项
    if (conflict.severity === 'critical') {
      return 'reschedule_manual'; // 严重冲突需要手动处理
    } else if (conflict.severity === 'high') {
      return conflict.type === 'external' ? 'negotiate' : 'reschedule';
    } else {
      return 'reschedule'; // 低严重程度冲突默认自动重新安排
    }
  },
  
  /**
   * 手动解决选项选择
   */
  onManualOptionSelect(e) {
    const { conflictId, option } = e.currentTarget.dataset;
    const { manualOptions } = this.data.batchConflictPanel;
    
    const updatedOptions = manualOptions.map(item => {
      if (item.conflictId === conflictId) {
        const updatedItem = { ...item, selectedOption: option };
        
        // 如果选择手动选择时间，显示时间选择器
        if (option === 'reschedule_manual') {
          this.showTimePickerForConflict(conflictId);
        }
        
        return updatedItem;
      }
      return item;
    });
    
    this.setData({
      'batchConflictPanel.manualOptions': updatedOptions
    });
    
    // 选项反馈
    wx.vibrateShort();
    
    // 更新选项统计
    this.updateManualOptionsStatistics();
  },
  
  /**
   * 显示时间选择器
   */
  showTimePickerForConflict(conflictId) {
    const conflict = this.data.batchConflictPanel.sortedConflicts.find(c => c.scheduleId === conflictId);
    
    wx.showModal({
      title: '选择新时间',
      content: `为 ${conflict.patientName} 选择新的服务时间`,
      showCancel: true,
      confirmText: '选择时间',
      success: (res) => {
        if (res.confirm) {
          // 这里应该调用时间选择器组件
          this.openCustomTimePicker(conflictId);
        }
      }
    });
  },
  
  /**
   * 打开自定义时间选择器
   */
  openCustomTimePicker(conflictId) {
    // 这里应该集成时间选择器组件
    // 现在使用简化版本
    const now = new Date();
    const suggestedTimes = this.generateSuggestedTimes(now, conflictId);
    
    const timeOptions = suggestedTimes.map(time => time.label);
    
    wx.showActionSheet({
      itemList: timeOptions,
      success: (res) => {
        const selectedTime = suggestedTimes[res.tapIndex];
        this.updateConflictCustomTime(conflictId, selectedTime.value);
      }
    });
  },
  
  /**
   * 生成建议时间
   */
  generateSuggestedTimes(baseTime, conflictId) {
    const times = [];
    const conflict = this.data.batchConflictPanel.sortedConflicts.find(c => c.scheduleId === conflictId);
    
    // 当天的建议时间
    for (let hour = 8; hour <= 18; hour++) {
      const time = new Date(baseTime);
      time.setHours(hour, 0, 0, 0);
      
      if (this.isTimeAvailable(time, conflict)) {
        times.push({
          label: `今天 ${hour}:00`,
          value: time.toISOString()
        });
      }
    }
    
    // 明天的建议时间
    const tomorrow = new Date(baseTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    for (let hour = 8; hour <= 18; hour++) {
      const time = new Date(tomorrow);
      time.setHours(hour, 0, 0, 0);
      
      times.push({
        label: `明天 ${hour}:00`,
        value: time.toISOString()
      });
      
      if (times.length >= 8) break; // 限制选项数量
    }
    
    return times;
  },
  
  /**
   * 检查时间是否可用
   */
  isTimeAvailable(time, excludeConflict) {
    // 简化版本，实际应该检查与所有其他预约的冲突
    const hour = time.getHours();
    return hour >= 8 && hour <= 18; // 不超过工作时间
  },
  
  /**
   * 更新冲突自定义时间
   */
  updateConflictCustomTime(conflictId, timeValue) {
    const { manualOptions } = this.data.batchConflictPanel;
    
    const updatedOptions = manualOptions.map(item => {
      if (item.conflictId === conflictId) {
        return { ...item, customTime: timeValue };
      }
      return item;
    });
    
    this.setData({
      'batchConflictPanel.manualOptions': updatedOptions
    });
    
    wx.showToast({
      title: '时间已更新',
      icon: 'success'
    });
  },
  
  /**
   * 更新手动选项统计
   */
  updateManualOptionsStatistics() {
    const { manualOptions } = this.data.batchConflictPanel;
    
    const stats = {
      total: manualOptions.length,
      reschedule: manualOptions.filter(o => o.selectedOption === 'reschedule').length,
      skip: manualOptions.filter(o => o.selectedOption === 'skip').length,
      force: manualOptions.filter(o => o.selectedOption === 'force').length,
      cancel: manualOptions.filter(o => o.selectedOption === 'cancel').length
    };
    
    this.setData({
      'batchConflictPanel.manualStats': stats
    });
  },

  /**
   * 显示跳过选项
   */
  showSkipOptions() {
    // 跳过所有冲突项，只处理无冲突的项目
  },

  /**
   * 手动解决选项选择
   */
  onManualOptionSelect(e) {
    const { conflictId, option } = e.detail;
    const { manualOptions } = this.data.batchConflictPanel;
    
    const updatedOptions = manualOptions.map(item => {
      if (item.conflictId === conflictId) {
        return { ...item, selectedOption: option };
      }
      return item;
    });
    
    this.setData({
      'batchConflictPanel.manualOptions': updatedOptions
    });
  },

  /**
   * 执行冲突解决
   */
  async executeConflictResolution() {
    const { resolutionStrategy, conflicts } = this.data.batchConflictPanel;
    const { preview } = this.data.batchAdjustPanel;
    
    if (conflicts.length === 0) {
      wx.showToast({
        title: '没有需要处理的冲突',
        icon: 'none'
      });
      return;
    }
    
    // 显示确认对话框
    const confirmResult = await this.showResolutionConfirmDialog(resolutionStrategy, conflicts.length);
    if (!confirmResult) return;
    
    wx.showLoading({ title: '解决冲突中...' });
    
    try {
      let resolvedPreview;
      let resolutionResults = {
        total: conflicts.length,
        success: 0,
        failed: 0,
        skipped: 0,
        details: []
      };
      
      switch (resolutionStrategy) {
        case 'auto':
          resolvedPreview = await this.executeAutoResolution(preview, resolutionResults);
          break;
        case 'manual':
          resolvedPreview = await this.executeManualResolution(preview, resolutionResults);
          break;
        case 'skip':
          resolvedPreview = await this.executeSkipResolution(preview, resolutionResults);
          break;
        case 'smart':
          resolvedPreview = await this.executeSmartResolution(preview, resolutionResults);
          break;
        default:
          throw new Error('未知的解决策略');
      }
      
      // 更新预览结果
      this.setData({
        'batchAdjustPanel.preview': resolvedPreview,
        'batchAdjustPanel.currentStep': 4,
        'batchConflictPanel.visible': false
      });
      
      wx.hideLoading();
      
      // 显示处理结果
      this.showResolutionResults(resolutionResults);
      
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '冲突解决失败',
        content: error.message || '请重试或联系技术支持',
        showCancel: false
      });
      console.error('冲突解决失败:', error);
    }
  },
  
  /**
   * 显示解决确认对话框
   */
  showResolutionConfirmDialog(strategy, conflictCount) {
    return new Promise((resolve) => {
      const strategyNames = {
        'auto': '智能自动解决',
        'manual': '手动精准解决',
        'skip': '跳过冲突项目',
        'smart': '智能混合策略'
      };
      
      const content = `将使用「${strategyNames[strategy]}」处理 ${conflictCount} 个冲突。\n\n确认继续吗？`;
      
      wx.showModal({
        title: '确认冲突处理',
        content: content,
        showCancel: true,
        cancelText: '取消',
        confirmText: '确认处理',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  },
  
  /**
   * 显示处理结果
   */
  showResolutionResults(results) {
    const { total, success, failed, skipped } = results;
    
    let title, icon, content;
    
    if (failed === 0) {
      title = '冲突处理完成';
      icon = 'success';
      content = `成功处理 ${success} 个冲突`;
      if (skipped > 0) {
        content += `，跳过 ${skipped} 个`;
      }
    } else if (success > 0) {
      title = '部分处理成功';
      icon = 'none';
      content = `成功 ${success} 个，失败 ${failed} 个`;
      if (skipped > 0) {
        content += `，跳过 ${skipped} 个`;
      }
    } else {
      title = '处理失败';
      icon = 'none';
      content = `${failed} 个冲突处理失败，请检查后重试`;
    }
    
    if (failed === 0) {
      wx.showToast({
        title: content,
        icon: icon,
        duration: 2000
      });
    } else {
      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  /**
   * 执行自动解决
   */
  async executeAutoResolution(preview, resolutionResults) {
    const { conflicts, autoResolutionOptions } = this.data.batchConflictPanel;
    const resolvedPreview = [...preview];
    
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      
      try {
        // 更新进度
        wx.showLoading({ 
          title: `自动解决中... (${i + 1}/${conflicts.length})` 
        });
        
        const conflictItem = resolvedPreview.find(item => item.scheduleId === conflict.scheduleId);
        
        if (conflictItem) {
          // 自动重新安排冲突项
          const newTime = await this.findAlternativeTime(
            conflictItem,
            resolvedPreview,
            autoResolutionOptions
          );
          
          if (newTime) {
            conflictItem.newTime = newTime;
            conflictItem.newDateTime = this.formatDateTime(newTime);
            conflictItem.conflict = false;
            conflictItem.resolutionMethod = '自动重新安排';
            conflictItem.resolutionTime = new Date().toISOString();
            
            resolutionResults.success++;
            resolutionResults.details.push({
              scheduleId: conflict.scheduleId,
              patientName: conflict.patientName,
              action: 'rescheduled',
              oldTime: conflict.originalTime,
              newTime: this.formatDateTime(newTime),
              method: 'auto'
            });
          } else {
            // 找不到合适时间，标记为失败
            conflictItem.resolutionMethod = '自动解决失败';
            conflictItem.resolutionError = '找不到合适的替代时间';
            
            resolutionResults.failed++;
            resolutionResults.details.push({
              scheduleId: conflict.scheduleId,
              patientName: conflict.patientName,
              action: 'failed',
              error: '找不到合适的替代时间'
            });
          }
        }
      } catch (error) {
        resolutionResults.failed++;
        resolutionResults.details.push({
          scheduleId: conflict.scheduleId,
          patientName: conflict.patientName,
          action: 'failed',
          error: error.message
        });
      }
    }
    
    return resolvedPreview;
  },

  /**
   * 执行手动解决
   */
  async executeManualResolution(preview, resolutionResults) {
    const { manualOptions } = this.data.batchConflictPanel;
    const resolvedPreview = [...preview];
    
    for (let i = 0; i < manualOptions.length; i++) {
      const option = manualOptions[i];
      
      try {
        // 更新进度
        wx.showLoading({ 
          title: `手动处理中... (${i + 1}/${manualOptions.length})` 
        });
        
        const conflictItem = resolvedPreview.find(item => item.scheduleId === option.conflictId);
        
        if (conflictItem) {
          switch (option.selectedOption) {
            case 'reschedule':
              const newTime = await this.findAlternativeTime(conflictItem, resolvedPreview);
              if (newTime) {
                conflictItem.newTime = newTime;
                conflictItem.newDateTime = this.formatDateTime(newTime);
                conflictItem.conflict = false;
                conflictItem.resolutionMethod = '手动重新安排';
                
                resolutionResults.success++;
                resolutionResults.details.push({
                  scheduleId: option.conflictId,
                  patientName: conflictItem.patientName,
                  action: 'rescheduled',
                  oldTime: conflictItem.originalTime,
                  newTime: this.formatDateTime(newTime),
                  method: 'manual_auto'
                });
              } else {
                resolutionResults.failed++;
                resolutionResults.details.push({
                  scheduleId: option.conflictId,
                  patientName: conflictItem.patientName,
                  action: 'failed',
                  error: '找不到合适的替代时间'
                });
              }
              break;
              
            case 'reschedule_manual':
              if (option.customTime) {
                conflictItem.newTime = new Date(option.customTime);
                conflictItem.newDateTime = this.formatDateTime(new Date(option.customTime));
                conflictItem.conflict = false;
                conflictItem.resolutionMethod = '手动指定时间';
                
                resolutionResults.success++;
                resolutionResults.details.push({
                  scheduleId: option.conflictId,
                  patientName: conflictItem.patientName,
                  action: 'rescheduled',
                  oldTime: conflictItem.originalTime,
                  newTime: this.formatDateTime(new Date(option.customTime)),
                  method: 'manual_custom'
                });
              } else {
                resolutionResults.failed++;
                resolutionResults.details.push({
                  scheduleId: option.conflictId,
                  patientName: conflictItem.patientName,
                  action: 'failed',
                  error: '未指定新时间'
                });
              }
              break;
              
            case 'skip':
              conflictItem.status = 'skipped';
              conflictItem.resolutionMethod = '手动跳过';
              conflictItem.conflict = false; // 跳过处理后不再显示为冲突
              
              resolutionResults.skipped++;
              resolutionResults.details.push({
                scheduleId: option.conflictId,
                patientName: conflictItem.patientName,
                action: 'skipped',
                method: 'manual'
              });
              break;
              
            case 'force':
              conflictItem.conflict = false;
              conflictItem.resolutionMethod = '手动强制执行';
              conflictItem.forceExecuted = true;
              
              resolutionResults.success++;
              resolutionResults.details.push({
                scheduleId: option.conflictId,
                patientName: conflictItem.patientName,
                action: 'forced',
                warning: '强制执行可能存在风险',
                method: 'manual'
              });
              break;
              
            case 'cancel':
              conflictItem.status = 'cancelled';
              conflictItem.resolutionMethod = '手动取消';
              
              resolutionResults.success++;
              resolutionResults.details.push({
                scheduleId: option.conflictId,
                patientName: conflictItem.patientName,
                action: 'cancelled',
                method: 'manual'
              });
              break;
              
            case 'negotiate':
              // 协调现有预约，需要人工干预
              conflictItem.status = 'pending_negotiation';
              conflictItem.resolutionMethod = '等待协调';
              
              resolutionResults.success++;
              resolutionResults.details.push({
                scheduleId: option.conflictId,
                patientName: conflictItem.patientName,
                action: 'negotiation',
                note: '需要与相关人员协调',
                method: 'manual'
              });
              break;
              
            default:
              resolutionResults.failed++;
              resolutionResults.details.push({
                scheduleId: option.conflictId,
                patientName: conflictItem.patientName,
                action: 'failed',
                error: `未知的处理方式: ${option.selectedOption}`
              });
          }
          
          // 添加处理时间戳
          conflictItem.resolutionTime = new Date().toISOString();
          if (option.notes) {
            conflictItem.resolutionNotes = option.notes;
          }
        }
      } catch (error) {
        resolutionResults.failed++;
        resolutionResults.details.push({
          scheduleId: option.conflictId,
          action: 'failed',
          error: error.message
        });
      }
    }
    
    return resolvedPreview;
  },

  /**
   * 执行跳过解决
   */
  async executeSkipResolution(preview, resolutionResults) {
    const { conflicts } = this.data.batchConflictPanel;
    const resolvedPreview = preview.map(item => {
      const hasConflict = conflicts.some(c => c.scheduleId === item.scheduleId);
      
      if (hasConflict) {
        resolutionResults.skipped++;
        resolutionResults.details.push({
          scheduleId: item.scheduleId,
          patientName: item.patientName,
          action: 'skipped',
          reason: '存在冲突，跳过处理',
          method: 'skip_strategy'
        });
        
        return {
          ...item,
          status: 'skipped',
          resolutionMethod: '跳过冲突项',
          resolutionTime: new Date().toISOString()
        };
      }
      
      resolutionResults.success++;
      resolutionResults.details.push({
        scheduleId: item.scheduleId,
        patientName: item.patientName,
        action: 'processed',
        reason: '无冲突，正常处理',
        method: 'skip_strategy'
      });
      
      return item;
    });
    
    return resolvedPreview;
  },
  
  /**
   * 执行智能混合解决
   */
  async executeSmartResolution(preview, resolutionResults) {
    const { conflicts } = this.data.batchConflictPanel;
    const resolvedPreview = [...preview];
    
    // 智能分析每个冲突的最佳处理方式
    const smartDecisions = this.analyzeSmartResolutionStrategy(conflicts);
    
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      const decision = smartDecisions.find(d => d.scheduleId === conflict.scheduleId);
      
      try {
        wx.showLoading({ 
          title: `智能处理中... (${i + 1}/${conflicts.length})` 
        });
        
        const conflictItem = resolvedPreview.find(item => item.scheduleId === conflict.scheduleId);
        
        if (conflictItem && decision) {
          switch (decision.recommendedAction) {
            case 'auto_reschedule':
              const newTime = await this.findAlternativeTime(conflictItem, resolvedPreview, {
                preferEarlier: decision.parameters.preferEarlier,
                allowWeekends: decision.parameters.allowWeekends,
                maxDaysDelay: decision.parameters.maxDaysDelay
              });
              
              if (newTime) {
                conflictItem.newTime = newTime;
                conflictItem.newDateTime = this.formatDateTime(newTime);
                conflictItem.conflict = false;
                conflictItem.resolutionMethod = `智能自动重新安排 (${decision.confidence}% 置信度)`;
                
                resolutionResults.success++;
                resolutionResults.details.push({
                  scheduleId: conflict.scheduleId,
                  patientName: conflict.patientName,
                  action: 'smart_rescheduled',
                  oldTime: conflict.originalTime,
                  newTime: this.formatDateTime(newTime),
                  confidence: decision.confidence,
                  reason: decision.reason
                });
              } else {
                // 智能重新安排失败，尝试其他方式
                this.handleSmartResolutionFallback(conflictItem, decision, resolutionResults);
              }
              break;
              
            case 'skip':
              conflictItem.status = 'skipped';
              conflictItem.resolutionMethod = `智能跳过 (${decision.confidence}% 置信度)`;
              conflictItem.conflict = false;
              
              resolutionResults.skipped++;
              resolutionResults.details.push({
                scheduleId: conflict.scheduleId,
                patientName: conflict.patientName,
                action: 'smart_skipped',
                confidence: decision.confidence,
                reason: decision.reason
              });
              break;
              
            case 'manual_review':
              conflictItem.status = 'pending_manual';
              conflictItem.resolutionMethod = `需要人工审核 (${decision.confidence}% 置信度)`;
              
              resolutionResults.failed++;
              resolutionResults.details.push({
                scheduleId: conflict.scheduleId,
                patientName: conflict.patientName,
                action: 'requires_manual',
                confidence: decision.confidence,
                reason: decision.reason
              });
              break;
              
            case 'negotiate':
              conflictItem.status = 'pending_negotiation';
              conflictItem.resolutionMethod = `智能协调 (${decision.confidence}% 置信度)`;
              
              resolutionResults.success++;
              resolutionResults.details.push({
                scheduleId: conflict.scheduleId,
                patientName: conflict.patientName,
                action: 'smart_negotiation',
                confidence: decision.confidence,
                reason: decision.reason
              });
              break;
          }
          
          conflictItem.resolutionTime = new Date().toISOString();
          conflictItem.smartDecision = decision;
        }
      } catch (error) {
        resolutionResults.failed++;
        resolutionResults.details.push({
          scheduleId: conflict.scheduleId,
          patientName: conflict.patientName,
          action: 'failed',
          error: error.message
        });
      }
    }
    
    return resolvedPreview;
  },
  
  /**
   * 分析智能解决策略
   */
  analyzeSmartResolutionStrategy(conflicts) {
    return conflicts.map(conflict => {
      let recommendedAction = 'auto_reschedule';
      let confidence = 80;
      let reason = '默认智能重新安排';
      let parameters = {
        preferEarlier: true,
        allowWeekends: false,
        maxDaysDelay: 3
      };
      
      // 基于冲突严重程度的决策
      if (conflict.severity === 'critical') {
        recommendedAction = 'manual_review';
        confidence = 95;
        reason = '严重冲突需要人工审核';
      } else if (conflict.severity === 'high') {
        if (conflict.type === 'external') {
          recommendedAction = 'negotiate';
          confidence = 85;
          reason = '高严重度外部冲突建议协调';
        } else {
          confidence = 90;
          reason = '高严重度内部冲突可自动重新安排';
          parameters.maxDaysDelay = 1; // 更严格的时间限制
        }
      } else if (conflict.severity === 'low') {
        // 低严重度冲突可能跳过
        if (Math.random() > 0.3) { // 70% 概率重新安排，30% 跳过
          confidence = 75;
          reason = '低严重度冲突，尝试自动重新安排';
          parameters.allowWeekends = true; // 允许在周末安排
          parameters.maxDaysDelay = 7;
        } else {
          recommendedAction = 'skip';
          confidence = 60;
          reason = '低严重度冲突，建议跳过处理';
        }
      }
      
      // 基于优先级的调整
      const priority = this.getSchedulePriority(conflict.scheduleId);
      if (priority === 'urgent') {
        if (recommendedAction === 'skip') {
          recommendedAction = 'auto_reschedule';
          confidence = 90;
          reason = '紧急任务不能跳过，强制重新安排';
        }
        parameters.preferEarlier = true;
        parameters.maxDaysDelay = 1;
      } else if (priority === 'low') {
        parameters.preferEarlier = false;
        parameters.maxDaysDelay = 14;
        parameters.allowWeekends = true;
      }
      
      return {
        scheduleId: conflict.scheduleId,
        recommendedAction,
        confidence,
        reason,
        parameters
      };
    });
  },
  
  /**
   * 处理智能解决失败的备用方案
   */
  handleSmartResolutionFallback(conflictItem, decision, resolutionResults) {
    // 如果智能重新安排失败，尝试其他方式
    if (decision.confidence > 80) {
      // 高置信度的决策失败，转为人工审核
      conflictItem.status = 'pending_manual';
      conflictItem.resolutionMethod = '智能失败，转人工审核';
      
      resolutionResults.failed++;
      resolutionResults.details.push({
        scheduleId: decision.scheduleId,
        patientName: conflictItem.patientName,
        action: 'fallback_manual',
        reason: '智能重新安排失败，需人工干预'
      });
    } else {
      // 低置信度的决策失败，直接跳过
      conflictItem.status = 'skipped';
      conflictItem.resolutionMethod = '智能失败，自动跳过';
      conflictItem.conflict = false;
      
      resolutionResults.skipped++;
      resolutionResults.details.push({
        scheduleId: decision.scheduleId,
        patientName: conflictItem.patientName,
        action: 'fallback_skip',
        reason: '智能重新安排失败，自动跳过'
      });
    }
  },

  /**
   * 寻找替代时间
   */
  async findAlternativeTime(conflictItem, allItems, options = {}) {
    const baseTime = new Date(conflictItem.newTime);
    const maxAttempts = 20;
    const { maxDaysDelay = 7, allowWeekends = false, preferEarlier = true } = options;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const candidateTime = new Date(baseTime);
      
      if (preferEarlier) {
        // 优先尝试更早的时间
        candidateTime.setHours(candidateTime.getHours() - attempt);
        
        // 如果太早，尝试下一天
        if (candidateTime.getHours() < 8) {
          candidateTime.setDate(candidateTime.getDate() + 1);
          candidateTime.setHours(8 + (attempt % 8), 0, 0, 0);
        }
      } else {
        // 尝试更晚的时间
        candidateTime.setHours(candidateTime.getHours() + attempt);
        
        // 如果太晚，调整到下一天
        if (candidateTime.getHours() > 18) {
          candidateTime.setDate(candidateTime.getDate() + 1);
          candidateTime.setHours(8 + (attempt % 8), 0, 0, 0);
        }
      }
      
      // 检查是否超出最大延迟天数
      const daysDiff = Math.floor((candidateTime - baseTime) / (24 * 60 * 60 * 1000));
      if (Math.abs(daysDiff) > maxDaysDelay) {
        continue;
      }
      
      // 检查是否是周末
      if (!allowWeekends && (candidateTime.getDay() === 0 || candidateTime.getDay() === 6)) {
        continue;
      }
      
      // 检查是否与其他项目冲突
      const hasConflict = allItems.some(item => {
        if (item.scheduleId === conflictItem.scheduleId) return false;
        return this.hasTimeOverlap(
          candidateTime,
          conflictItem.duration,
          item.newTime,
          item.duration
        );
      });
      
      if (!hasConflict) {
        return candidateTime;
      }
    }
    
    return null; // 找不到合适的时间
  },

  /**
   * 关闭冲突处理面板
   */
  closeBatchConflictPanel() {
    this.setData({
      'batchConflictPanel.visible': false
    });
  },
  
  /**
   * 增强冲突分析 - 添加详细信息和严重程度
   */
  analyzeConflictDetails(conflicts) {
    return conflicts.map(conflict => {
      const enhancedConflict = { ...conflict };
      
      // 计算严重程度分数
      enhancedConflict.severityScore = this.calculateConflictSeverityScore(conflict);
      
      // 确定严重程度等级
      if (enhancedConflict.severityScore >= 80) {
        enhancedConflict.severity = 'critical';
        enhancedConflict.severityText = '非常严重';
        enhancedConflict.severityIcon = '🔥';
        enhancedConflict.severityColor = '#ff4757';
      } else if (enhancedConflict.severityScore >= 60) {
        enhancedConflict.severity = 'high';
        enhancedConflict.severityText = '严重';
        enhancedConflict.severityIcon = '⚠️';
        enhancedConflict.severityColor = '#ff6b35';
      } else if (enhancedConflict.severityScore >= 40) {
        enhancedConflict.severity = 'medium';
        enhancedConflict.severityText = '中等';
        enhancedConflict.severityIcon = '🟡';
        enhancedConflict.severityColor = '#ffa502';
      } else {
        enhancedConflict.severity = 'low';
        enhancedConflict.severityText = '轻微';
        enhancedConflict.severityIcon = '🟢';
        enhancedConflict.severityColor = '#2ed573';
      }
      
      // 添加冲突类型描述
      enhancedConflict.conflictTypeDescription = this.getConflictTypeDescription(conflict);
      
      // 影响范围分析
      enhancedConflict.impactScope = this.analyzeImpactScope(conflict);
      
      // 生成解决建议
      enhancedConflict.suggestions = this.generateConflictSuggestions(conflict);
      
      // 时间解析
      const timeInfo = this.parseTimeInfo(conflict.originalTime, conflict.newTime);
      enhancedConflict.originalDate = timeInfo.originalDate;
      enhancedConflict.newDate = timeInfo.newDate;
      
      // 优先级信息
      enhancedConflict.priority = this.getSchedulePriority(conflict.scheduleId);
      enhancedConflict.priorityText = this.getPriorityText(enhancedConflict.priority);
      
      // 是否允许强制执行
      enhancedConflict.canForce = enhancedConflict.severity !== 'critical';
      
      // 初始化展开状态
      enhancedConflict.expanded = false;
      
      // 冲突检测时间
      enhancedConflict.detectedAt = new Date().toLocaleString();
      
      // 预计解决时间
      enhancedConflict.estimatedResolutionTime = this.estimateResolutionTime(conflict);
      
      // 冲突ID用于唯一标识
      enhancedConflict.conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return enhancedConflict;
    });
  },
  
  /**
   * 计算冲突严重程度分数
   */
  calculateConflictSeverityScore(conflict) {
    let score = 0;
    
    // 基本分数
    if (conflict.type === 'external') {
      score += 30; // 外部冲突更严重
    } else {
      score += 20; // 内部冲突
    }
    
    // 优先级影响
    const priority = this.getSchedulePriority(conflict.scheduleId);
    if (priority === 'urgent') {
      score += 30;
    } else if (priority === 'high') {
      score += 20;
    } else if (priority === 'medium') {
      score += 10;
    }
    
    // 时间远近影响
    const timeUrgency = this.calculateTimeUrgency(conflict.newTime);
    score += timeUrgency;
    
    // 患者特殊情况
    const patientFactor = this.getPatientSeverityFactor(conflict.patientName);
    score += patientFactor;
    
    return Math.min(100, Math.max(0, score));
  },
  
  /**
   * 获取冲突类型描述
   */
  getConflictTypeDescription(conflict) {
    if (conflict.type === 'internal') {
      return '批量调整的多个项目在同一时间段产生冲突';
    } else if (conflict.type === 'external') {
      return '调整后的时间与现有预约时间重叠';
    }
    return '未知冲突类型';
  },
  
  /**
   * 分析影响范围
   */
  analyzeImpactScope(conflict) {
    const impacts = [];
    
    if (conflict.type === 'external') {
      impacts.push('影响现有预约安排');
    }
    
    if (conflict.conflictWith && conflict.conflictWith.length > 0) {
      impacts.push(`影响${conflict.conflictWith.length}个相关预约`);
    }
    
    const priority = this.getSchedulePriority(conflict.scheduleId);
    if (priority === 'urgent') {
      impacts.push('影响紧急服务安排');
    }
    
    return impacts.length > 0 ? impacts.join('、') : '影响范围有限';
  },
  
  /**
   * 生成冲突解决建议
   */
  generateConflictSuggestions(conflict) {
    const suggestions = [];
    
    // 根据冲突类型提供建议
    if (conflict.type === 'internal') {
      suggestions.push('将冲突项目错开时间安排');
      suggestions.push('考虑将部分项目延后到下一工作日');
    } else if (conflict.type === 'external') {
      suggestions.push('重新选择适合的时间段');
      suggestions.push('与相关人员协调调整现有预约');
    }
    
    // 根据优先级提供建议
    const priority = this.getSchedulePriority(conflict.scheduleId);
    if (priority === 'urgent') {
      suggestions.push('优先保障此紧急任务的时间安排');
    } else if (priority === 'low') {
      suggestions.push('可考虑将此任务延后处理');
    }
    
    return suggestions;
  },
  
  /**
   * 计算严重程度统计
   */
  calculateSeverityStats(conflicts) {
    const stats = {
      high: { count: 0, percentage: 0 },
      medium: { count: 0, percentage: 0 },
      low: { count: 0, percentage: 0 }
    };
    
    const total = conflicts.length;
    if (total === 0) return stats;
    
    conflicts.forEach(conflict => {
      const severity = conflict.severity;
      if (severity === 'critical' || severity === 'high') {
        stats.high.count++;
      } else if (severity === 'medium') {
        stats.medium.count++;
      } else {
        stats.low.count++;
      }
    });
    
    // 计算百分比
    stats.high.percentage = (stats.high.count / total * 100).toFixed(1);
    stats.medium.percentage = (stats.medium.count / total * 100).toFixed(1);
    stats.low.percentage = (stats.low.count / total * 100).toFixed(1);
    
    return stats;
  },
  
  /**
   * 计算整体严重程度
   */
  calculateOverallSeverity(conflicts) {
    if (conflicts.length === 0) {
      return { level: 'none', text: '无冲突' };
    }
    
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
    const highCount = conflicts.filter(c => c.severity === 'high').length;
    const mediumCount = conflicts.filter(c => c.severity === 'medium').length;
    
    if (criticalCount > 0) {
      return { level: 'critical', text: '非常严重' };
    } else if (highCount > conflicts.length * 0.5) {
      return { level: 'high', text: '严重' };
    } else if (highCount > 0 || mediumCount > conflicts.length * 0.5) {
      return { level: 'medium', text: '中等' };
    } else {
      return { level: 'low', text: '轻微' };
    }
  },
  
  /**
   * 计算影响分析
   */
  calculateImpactAnalysis(conflicts) {
    const analysis = {
      affectedPatients: 0,
      totalDelay: 0,
      economicLoss: 0
    };
    
    const patientSet = new Set();
    
    conflicts.forEach(conflict => {
      // 统计受影响患者
      patientSet.add(conflict.patientName);
      
      // 计算时间延误（简化估算）
      analysis.totalDelay += this.estimateDelayHours(conflict);
      
      // 计算经济损失（简化估算）
      analysis.economicLoss += this.estimateEconomicLoss(conflict);
    });
    
    analysis.affectedPatients = patientSet.size;
    analysis.totalDelay = analysis.totalDelay.toFixed(1);
    analysis.economicLoss = analysis.economicLoss.toFixed(0);
    
    return analysis;
  },
  
  /**
   * 按严重程度排序冲突
   */
  sortConflictsBySeverity(conflicts) {
    const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    
    return [...conflicts].sort((a, b) => {
      // 首先按严重程度排序
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // 然后按分数排序
      return b.severityScore - a.severityScore;
    });
  },
  
  /**
   * 计算时间紧急程度
   */
  calculateTimeUrgency(timeString) {
    try {
      const targetTime = new Date(timeString);
      const now = new Date();
      const diffHours = (targetTime - now) / (1000 * 60 * 60);
      
      if (diffHours < 2) return 20; // 2小时内
      if (diffHours < 8) return 15; // 8小时内
      if (diffHours < 24) return 10; // 24小时内
      return 5; // 超过24小时
    } catch (e) {
      return 5; // 默认值
    }
  },
  
  /**
   * 获取患者严重程度因子
   */
  getPatientSeverityFactor(patientName) {
    // 这里可以根据患者的健康状况、年龄等因素计算
    // 现在使用简化版本
    const patientInfo = this.getPatientInfo(patientName);
    if (patientInfo) {
      if (patientInfo.age >= 80) return 10;
      if (patientInfo.healthCondition === 'critical') return 15;
      if (patientInfo.isEmergency) return 20;
    }
    return 5; // 默认值
  },
  
  /**
   * 获取预约优先级
   */
  getSchedulePriority(scheduleId) {
    const schedule = this.data.filteredScheduleList.find(s => s.id === scheduleId);
    return schedule ? (schedule.priority || 'medium') : 'medium';
  },
  
  /**
   * 获取优先级文本
   */
  getPriorityText(priority) {
    const priorityMap = {
      'urgent': '紧急',
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return priorityMap[priority] || '中';
  },
  
  /**
   * 解析时间信息
   */
  parseTimeInfo(originalTime, newTime) {
    try {
      const original = new Date(originalTime);
      const newDate = new Date(newTime);
      
      return {
        originalDate: this.formatDate(original),
        newDate: this.formatDate(newDate)
      };
    } catch (e) {
      return {
        originalDate: '无效日期',
        newDate: '无效日期'
      };
    }
  },
  
  /**
   * 估算延误小时数
   */
  estimateDelayHours(conflict) {
    // 简化估算，实际应用中需要更复杂的算法
    if (conflict.type === 'external') {
      return 2; // 外部冲突平均2小时延误
    } else {
      return 1; // 内部冲突平均1小时延误
    }
  },
  
  /**
   * 预计解决时间
   */
  estimateResolutionTime(conflict) {
    const baseTimes = {
      'low': 30,      // 30秒
      'medium': 120,  // 2分钟
      'high': 300,    // 5分钟
      'critical': 600 // 10分钟
    };
    
    const severity = this.getConflictSeverity(conflict);
    const baseTime = baseTimes[severity] || 60;
    
    // 根据冲突类型调整
    const typeMultiplier = conflict.type === 'external' ? 1.5 : 1.0;
    
    return Math.round(baseTime * typeMultiplier);
  },
  
  /**
   * 获取冲突严重程度
   */
  getConflictSeverity(conflict) {
    const score = this.calculateConflictSeverityScore(conflict);
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  },
  
  /**
   * 实时更新冲突状态
   */
  updateConflictStatus(conflictId, status, details = '') {
    const { sortedConflicts } = this.data.batchConflictPanel;
    
    const updatedConflicts = sortedConflicts.map(conflict => {
      if (conflict.conflictId === conflictId) {
        return {
          ...conflict,
          status: status,
          statusText: this.getStatusText(status),
          statusUpdatedAt: new Date().toLocaleString(),
          statusDetails: details
        };
      }
      return conflict;
    });
    
    this.setData({
      'batchConflictPanel.sortedConflicts': updatedConflicts
    });
    
    // 触发统计更新
    this.updateConflictStatistics();
  },
  
  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'analyzing': '分析中',
      'resolving': '解决中',
      'resolved': '已解决',
      'skipped': '已跳过',
      'failed': '处理失败'
    };
    return statusMap[status] || '未知';
  },
  
  /**
   * 更新冲突统计信息
   */
  updateConflictStatistics() {
    const { sortedConflicts } = this.data.batchConflictPanel;
    
    const stats = {
      total: sortedConflicts.length,
      pending: sortedConflicts.filter(c => c.status === 'pending').length,
      resolved: sortedConflicts.filter(c => c.status === 'resolved').length,
      failed: sortedConflicts.filter(c => c.status === 'failed').length
    };
    
    this.setData({
      'batchConflictPanel.statistics': stats
    });
  },
  
  /**
   * 获取患者信息
   */
  getPatientInfo(patientName) {
    // 这里应该从数据库或API获取患者信息
    // 现在返回模拟数据
    return {
      name: patientName,
      age: 65,
      healthCondition: 'stable',
      isEmergency: false
    };
  },
  
  /**
   * 按严重程度排序冲突
   */
  onSortConflictsBySeverity() {
    const { conflicts } = this.data.batchConflictPanel;
    
    if (conflicts.length === 0) {
      wx.showToast({
        title: '没有冲突需要排序',
        icon: 'none'
      });
      return;
    }
    
    // 显示排序选项
    wx.showActionSheet({
      itemList: [
        '严重程度：高到低',
        '严重程度：低到高',
        '优先级：高到低',
        '优先级：低到高',
        '时间：近到远',
        '时间：远到近',
        '冲突类型：内部优先',
        '冲突类型：外部优先',
        '智能排序（推荐）'
      ],
      success: (res) => {
        this.applySortingStrategy(res.tapIndex);
      }
    });
  },
  
  /**
   * 应用排序策略
   */
  applySortingStrategy(strategyIndex) {
    const { conflicts } = this.data.batchConflictPanel;
    let sortedConflicts;
    let sortDescription;
    
    switch (strategyIndex) {
      case 0: // 严重程度：高到低
        sortedConflicts = this.sortBySeverity(conflicts, 'desc');
        sortDescription = '按严重程度降序排列';
        break;
        
      case 1: // 严重程度：低到高
        sortedConflicts = this.sortBySeverity(conflicts, 'asc');
        sortDescription = '按严重程度升序排列';
        break;
        
      case 2: // 优先级：高到低
        sortedConflicts = this.sortByPriority(conflicts, 'desc');
        sortDescription = '按优先级降序排列';
        break;
        
      case 3: // 优先级：低到高
        sortedConflicts = this.sortByPriority(conflicts, 'asc');
        sortDescription = '按优先级升序排列';
        break;
        
      case 4: // 时间：近到远
        sortedConflicts = this.sortByTime(conflicts, 'asc');
        sortDescription = '按时间近远排列';
        break;
        
      case 5: // 时间：远到近
        sortedConflicts = this.sortByTime(conflicts, 'desc');
        sortDescription = '按时间远近排列';
        break;
        
      case 6: // 冲突类型：内部优先
        sortedConflicts = this.sortByConflictType(conflicts, 'internal_first');
        sortDescription = '内部冲突优先显示';
        break;
        
      case 7: // 冲突类型：外部优先
        sortedConflicts = this.sortByConflictType(conflicts, 'external_first');
        sortDescription = '外部冲突优先显示';
        break;
        
      case 8: // 智能排序
        sortedConflicts = this.smartSort(conflicts);
        sortDescription = '智能排序（综合考虑多个因素）';
        break;
        
      default:
        sortedConflicts = conflicts;
        sortDescription = '保持原有排序';
    }
    
    this.setData({
      'batchConflictPanel.sortedConflicts': sortedConflicts,
      'batchConflictPanel.currentSortDescription': sortDescription
    });
    
    wx.showToast({
      title: sortDescription,
      icon: 'success',
      duration: 2000
    });
    
    // 记录排序操作
    this.recordSortingOperation(strategyIndex, sortDescription);
  },
  
  /**
   * 按严重程度排序
   */
  sortBySeverity(conflicts, order = 'desc') {
    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return [...conflicts].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      
      if (order === 'desc') {
        if (severityDiff !== 0) return -severityDiff; // 高严重程度在前
        return b.severityScore - a.severityScore; // 相同严重程度时按分数排序
      } else {
        if (severityDiff !== 0) return severityDiff; // 低严重程度在前
        return a.severityScore - b.severityScore;
      }
    });
  },
  
  /**
   * 按优先级排序
   */
  sortByPriority(conflicts, order = 'desc') {
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return [...conflicts].sort((a, b) => {
      const aPriority = this.getSchedulePriority(a.scheduleId);
      const bPriority = this.getSchedulePriority(b.scheduleId);
      
      const priorityDiff = priorityOrder[aPriority] - priorityOrder[bPriority];
      
      if (order === 'desc') {
        if (priorityDiff !== 0) return -priorityDiff;
        // 相同优先级时按严重程度排序
        return this.sortBySeverity([a, b], 'desc')[0] === a ? -1 : 1;
      } else {
        if (priorityDiff !== 0) return priorityDiff;
        return this.sortBySeverity([a, b], 'asc')[0] === a ? -1 : 1;
      }
    });
  },
  
  /**
   * 按时间排序
   */
  sortByTime(conflicts, order = 'asc') {
    return [...conflicts].sort((a, b) => {
      const aTime = new Date(a.newTime || a.originalTime);
      const bTime = new Date(b.newTime || b.originalTime);
      
      const timeDiff = aTime - bTime;
      
      if (order === 'asc') {
        return timeDiff; // 时间近的在前
      } else {
        return -timeDiff; // 时间远的在前
      }
    });
  },
  
  /**
   * 按冲突类型排序
   */
  sortByConflictType(conflicts, type = 'internal_first') {
    return [...conflicts].sort((a, b) => {
      if (type === 'internal_first') {
        if (a.type === 'internal' && b.type === 'external') return -1;
        if (a.type === 'external' && b.type === 'internal') return 1;
      } else {
        if (a.type === 'external' && b.type === 'internal') return -1;
        if (a.type === 'internal' && b.type === 'external') return 1;
      }
      
      // 相同类型时按严重程度排序
      return this.sortBySeverity([a, b], 'desc')[0] === a ? -1 : 1;
    });
  },
  
  /**
   * 智能排序（综合多个因素）
   */
  smartSort(conflicts) {
    return [...conflicts].sort((a, b) => {
      // 计算智能排序分数
      const aScore = this.calculateSmartSortScore(a);
      const bScore = this.calculateSmartSortScore(b);
      
      return bScore - aScore; // 高分在前
    });
  },
  
  /**
   * 显示冲突处理结果预览
   */
  showConflictResolutionPreview() {
    const { resolutionStrategy, conflicts, manualOptions } = this.data.batchConflictPanel;
    
    if (conflicts.length === 0) {
      wx.showToast({
        title: '没有冲突需要预览',
        icon: 'none'
      });
      return;
    }
    
    // 生成预览数据
    const preview = this.generateResolutionPreview(resolutionStrategy, conflicts, manualOptions);
    
    // 计算预览统计
    const statistics = this.calculatePreviewStatistics(preview);
    
    // 预估处理时间
    const estimatedTime = this.estimateProcessingTime(preview);
    
    // 识别风险项
    const risks = this.identifyResolutionRisks(preview);
    
    this.setData({
      'batchConflictPanel.resolutionPreview': {
        visible: true,
        items: preview,
        statistics: statistics,
        estimatedTime: estimatedTime,
        risks: risks,
        strategy: resolutionStrategy
      }
    });
    
    // 显示预览窗口
    this.openResolutionPreviewModal();
  },
  
  /**
   * 生成解决预览
   */
  generateResolutionPreview(strategy, conflicts, manualOptions) {
    const preview = [];
    
    conflicts.forEach(conflict => {
      const item = {
        conflictId: conflict.conflictId || conflict.scheduleId,
        scheduleId: conflict.scheduleId,
        patientName: conflict.patientName,
        originalTime: conflict.originalTime,
        currentNewTime: conflict.newTime,
        severity: conflict.severity,
        severityText: conflict.severityText,
        type: conflict.type,
        details: conflict.details,
        priority: this.getSchedulePriority(conflict.scheduleId),
        estimatedDuration: conflict.duration || 60
      };
      
      // 根据策略生成预览信息
      switch (strategy) {
        case 'auto':
          item.plannedAction = 'auto_reschedule';
          item.plannedActionText = '自动重新安排';
          item.newTime = this.predictAutoRescheduleTime(conflict);
          item.confidence = this.calculateAutoRescheduleConfidence(conflict);
          item.estimatedProcessTime = this.estimateResolutionTime(conflict);
          break;
          
        case 'manual':
          const manualOption = manualOptions?.find(opt => opt.conflictId === conflict.scheduleId);
          if (manualOption) {
            item.plannedAction = manualOption.selectedOption;
            item.plannedActionText = this.getManualActionText(manualOption.selectedOption);
            item.customTime = manualOption.customTime;
            item.notes = manualOption.notes;
            
            if (manualOption.selectedOption === 'reschedule_manual' && manualOption.customTime) {
              item.newTime = manualOption.customTime;
              item.confidence = 95; // 手动指定时间置信度高
            } else if (manualOption.selectedOption === 'reschedule') {
              item.newTime = this.predictAutoRescheduleTime(conflict);
              item.confidence = 85;
            } else {
              item.confidence = 100; // 跳过、取消等操作置信度高
            }
          } else {
            item.plannedAction = 'reschedule';
            item.plannedActionText = '默认重新安排';
            item.newTime = this.predictAutoRescheduleTime(conflict);
            item.confidence = 80;
          }
          item.estimatedProcessTime = 120; // 手动处理需要更多时间
          break;
          
        case 'skip':
          item.plannedAction = 'skip';
          item.plannedActionText = '跳过处理';
          item.newTime = item.currentNewTime; // 保持原有时间
          item.confidence = 100;
          item.estimatedProcessTime = 5; // 跳过处理很快
          break;
          
        case 'smart':
          const smartDecision = this.analyzeSmartResolutionStrategy([conflict])[0];
          item.plannedAction = smartDecision.recommendedAction;
          item.plannedActionText = this.getSmartActionText(smartDecision.recommendedAction);
          item.confidence = smartDecision.confidence;
          item.smartReason = smartDecision.reason;
          
          if (smartDecision.recommendedAction === 'auto_reschedule') {
            item.newTime = this.predictAutoRescheduleTime(conflict, smartDecision.parameters);
          } else {
            item.newTime = item.currentNewTime;
          }
          item.estimatedProcessTime = this.estimateSmartProcessingTime(smartDecision);
          break;
      }
      
      // 识别预期问题
      item.expectedIssues = this.identifyExpectedIssues(item);
      
      // 计算成功概率
      item.successProbability = this.calculateSuccessProbability(item);
      
      preview.push(item);
    });
    
    return preview;
  },
  
  /**
   * 预测自动重新安排时间
   */
  predictAutoRescheduleTime(conflict, options = {}) {
    const baseTime = new Date(conflict.newTime || conflict.originalTime);
    const defaultOptions = {
      preferEarlier: true,
      maxDaysDelay: 3,
      allowWeekends: false
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 简化的预测算法
    if (mergedOptions.preferEarlier) {
      // 尝试找更早的时间
      const earlierTime = new Date(baseTime);
      earlierTime.setHours(earlierTime.getHours() - 2);
      
      if (earlierTime.getHours() >= 8) {
        return earlierTime.toISOString();
      }
    }
    
    // 尝试找更晚的时间
    const laterTime = new Date(baseTime);
    laterTime.setHours(laterTime.getHours() + 2);
    
    if (laterTime.getHours() <= 18) {
      return laterTime.toISOString();
    }
    
    // 如果当天不行，尝试第二天
    const nextDay = new Date(baseTime);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0);
    
    return nextDay.toISOString();
  },
  
  /**
   * 计算自动重新安排置信度
   */
  calculateAutoRescheduleConfidence(conflict) {
    let confidence = 80; // 基础置信度
    
    // 根据严重程度调整
    if (conflict.severity === 'low') {
      confidence += 15;
    } else if (conflict.severity === 'high') {
      confidence -= 10;
    } else if (conflict.severity === 'critical') {
      confidence -= 25;
    }
    
    // 根据冲突类型调整
    if (conflict.type === 'internal') {
      confidence += 10; // 内部冲突更容易解决
    }
    
    return Math.max(20, Math.min(95, confidence));
  },
  
  /**
   * 获取手动操作文本
   */
  getManualActionText(action) {
    const actionTexts = {
      'reschedule': '自动找时间重新安排',
      'reschedule_manual': '手动指定时间',
      'skip': '跳过不处理',
      'force': '强制执行',
      'cancel': '取消该项',
      'negotiate': '协调现有预约'
    };
    
    return actionTexts[action] || '未知操作';
  },
  
  /**
   * 获取智能操作文本
   */
  getSmartActionText(action) {
    const actionTexts = {
      'auto_reschedule': '智能自动重新安排',
      'skip': '智能跳过',
      'manual_review': '智能识别需人工审核',
      'negotiate': '智能协调'
    };
    
    return actionTexts[action] || '智能分析';
  },
  
  /**
   * 预估智能处理时间
   */
  estimateSmartProcessingTime(decision) {
    const baseTimes = {
      'auto_reschedule': 45,
      'skip': 5,
      'manual_review': 300,
      'negotiate': 180
    };
    
    return baseTimes[decision.recommendedAction] || 60;
  },
  
  /**
   * 识别预期问题
   */
  identifyExpectedIssues(previewItem) {
    const issues = [];
    
    // 检查时间问题
    if (previewItem.newTime) {
      const newTime = new Date(previewItem.newTime);
      const hour = newTime.getHours();
      
      if (hour < 8 || hour > 18) {
        issues.push({
          type: 'time_range',
          severity: 'warning',
          message: '新时间超出正常工作时间范围'
        });
      }
      
      if (newTime.getDay() === 0 || newTime.getDay() === 6) {
        issues.push({
          type: 'weekend',
          severity: 'info',
          message: '安排在周末，可能需要额外协调'
        });
      }
    }
    
    // 检查操作风险
    if (previewItem.plannedAction === 'force') {
      issues.push({
        type: 'force_execution',
        severity: 'error',
        message: '强制执行可能导致时间冲突和服务质量问题'
      });
    }
    
    // 检查置信度问题
    if (previewItem.confidence < 60) {
      issues.push({
        type: 'low_confidence',
        severity: 'warning',
        message: `处理置信度较低 (${previewItem.confidence}%)，建议人工审核`
      });
    }
    
    return issues;
  },
  
  /**
   * 计算成功概率
   */
  calculateSuccessProbability(previewItem) {
    let probability = previewItem.confidence;
    
    // 根据预期问题调整
    previewItem.expectedIssues?.forEach(issue => {
      switch (issue.severity) {
        case 'error':
          probability -= 20;
          break;
        case 'warning':
          probability -= 10;
          break;
        case 'info':
          probability -= 5;
          break;
      }
    });
    
    return Math.max(10, Math.min(100, probability));
  },
  
  /**
   * 计算预览统计
   */
  calculatePreviewStatistics(preview) {
    const stats = {
      total: preview.length,
      willReschedule: 0,
      willSkip: 0,
      willCancel: 0,
      willForce: 0,
      averageConfidence: 0,
      averageSuccessProbability: 0,
      totalEstimatedTime: 0,
      highRiskCount: 0
    };
    
    let confidenceSum = 0;
    let successProbabilitySum = 0;
    
    preview.forEach(item => {
      // 统计操作类型
      if (item.plannedAction.includes('reschedule')) {
        stats.willReschedule++;
      } else if (item.plannedAction === 'skip') {
        stats.willSkip++;
      } else if (item.plannedAction === 'cancel') {
        stats.willCancel++;
      } else if (item.plannedAction === 'force') {
        stats.willForce++;
      }
      
      // 累计数据
      confidenceSum += item.confidence;
      successProbabilitySum += item.successProbability;
      stats.totalEstimatedTime += item.estimatedProcessTime;
      
      // 统计高风险项目
      if (item.expectedIssues?.some(issue => issue.severity === 'error')) {
        stats.highRiskCount++;
      }
    });
    
    stats.averageConfidence = Math.round(confidenceSum / stats.total);
    stats.averageSuccessProbability = Math.round(successProbabilitySum / stats.total);
    
    return stats;
  },
  
  /**
   * 预估处理时间
   */
  estimateProcessingTime(preview) {
    const totalSeconds = preview.reduce((sum, item) => sum + item.estimatedProcessTime, 0);
    
    return {
      totalSeconds,
      totalMinutes: Math.ceil(totalSeconds / 60),
      formattedTime: this.formatDuration(totalSeconds)
    };
  },
  
  /**
   * 识别解决风险
   */
  identifyResolutionRisks(preview) {
    const risks = [];
    
    // 检查强制执行风险
    const forceCount = preview.filter(item => item.plannedAction === 'force').length;
    if (forceCount > 0) {
      risks.push({
        type: 'force_execution_risk',
        severity: 'high',
        title: '强制执行风险',
        description: `${forceCount} 个项目将强制执行，可能导致时间冲突`,
        suggestion: '建议重新考虑这些项目的处理方式'
      });
    }
    
    // 检查低置信度风险
    const lowConfidenceCount = preview.filter(item => item.confidence < 60).length;
    if (lowConfidenceCount > 0) {
      risks.push({
        type: 'low_confidence_risk',
        severity: 'medium',
        title: '低置信度风险',
        description: `${lowConfidenceCount} 个项目的处理置信度低于 60%`,
        suggestion: '建议对这些项目进行人工审核'
      });
    }
    
    // 检查周末安排风险
    const weekendCount = preview.filter(item => {
      if (item.newTime) {
        const day = new Date(item.newTime).getDay();
        return day === 0 || day === 6;
      }
      return false;
    }).length;
    
    if (weekendCount > 0) {
      risks.push({
        type: 'weekend_scheduling_risk',
        severity: 'low',
        title: '周末安排风险',
        description: `${weekendCount} 个项目安排在周末`,
        suggestion: '请确认周末服务安排和人员配置'
      });
    }
    
    return risks;
  },
  
  /**
   * 打开解决预览模态框
   */
  openResolutionPreviewModal() {
    // 这里应该打开一个详细的预览模态框
    // 现在使用简化版本
    const { resolutionPreview } = this.data.batchConflictPanel;
    
    let content = `处理预览：\n`;
    content += `• 总计: ${resolutionPreview.statistics.total} 个冲突\n`;
    content += `• 重新安排: ${resolutionPreview.statistics.willReschedule} 个\n`;
    content += `• 跳过处理: ${resolutionPreview.statistics.willSkip} 个\n`;
    content += `• 平均置信度: ${resolutionPreview.statistics.averageConfidence}%\n`;
    content += `• 预估时间: ${resolutionPreview.estimatedTime.formattedTime}`;
    
    if (resolutionPreview.risks.length > 0) {
      content += `\n\n风险提示：\n`;
      resolutionPreview.risks.forEach(risk => {
        content += `• ${risk.title}: ${risk.description}\n`;
      });
    }
    
    wx.showModal({
      title: '冲突处理预览',
      content: content,
      showCancel: true,
      cancelText: '返回修改',
      confirmText: '确认执行',
      success: (res) => {
        if (res.confirm) {
          this.executeConflictResolution();
        }
      }
    });
  },
  
  /**
   * 格式化时间段
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds} 秒`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} 分钟`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `${hours} 小时 ${minutes} 分钟`;
    }
  },
  
  /**
   * 记录排序操作
   */
  recordSortingOperation(strategyIndex, description) {
    const operation = {
      timestamp: new Date().toISOString(),
      strategyIndex,
      description,
      conflictCount: this.data.batchConflictPanel.conflicts.length
    };
    
    // 将操作记录保存到本地存储
    const sortingHistory = wx.getStorageSync('conflictSortingHistory') || [];
    sortingHistory.unshift(operation);
    
    // 保留最近 50 次记录
    if (sortingHistory.length > 50) {
      sortingHistory.splice(50);
    }
    
    wx.setStorageSync('conflictSortingHistory', sortingHistory);
  },
  
  /**
   * 筛选冲突
   */
  onFilterConflictsByType() {
    const options = [
      { text: '全部冲突', value: 'all' },
      { text: '仅内部冲突', value: 'internal' },
      { text: '仅外部冲突', value: 'external' },
      { text: '仅严重冲突', value: 'severe' }
    ];
    
    wx.showActionSheet({
      itemList: options.map(o => o.text),
      success: (res) => {
        const selectedFilter = options[res.tapIndex].value;
        this.applyConflictFilter(selectedFilter);
      }
    });
  },
  
  /**
   * 应用冲突筛选
   */
  applyConflictFilter(filterType) {
    const { conflicts } = this.data.batchConflictPanel;
    let filteredConflicts;
    
    switch (filterType) {
      case 'internal':
        filteredConflicts = conflicts.filter(c => c.type === 'internal');
        break;
      case 'external':
        filteredConflicts = conflicts.filter(c => c.type === 'external');
        break;
      case 'severe':
        filteredConflicts = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical');
        break;
      default:
        filteredConflicts = conflicts;
    }
    
    this.setData({
      'batchConflictPanel.sortedConflicts': filteredConflicts,
      'batchConflictPanel.conflictFilter.type': filterType
    });
    
    wx.showToast({
      title: `显示 ${filteredConflicts.length} 个冲突`,
      icon: 'success'
    });
  },
  
  /**
   * 切换冲突详情展开
   */
  onToggleConflictDetails(e) {
    const conflictId = e.currentTarget.dataset.conflictId;
    const { sortedConflicts } = this.data.batchConflictPanel;
    
    const updatedConflicts = sortedConflicts.map(conflict => {
      if (conflict.scheduleId === conflictId) {
        return { ...conflict, expanded: !conflict.expanded };
      }
      return conflict;
    });
    
    this.setData({
      'batchConflictPanel.sortedConflicts': updatedConflicts
    });
    
    // 触觉反馈
    wx.vibrateShort();
  },
  
  /**
   * 冲突快捷操作
   */
  onQuickConflictAction(e) {
    const { conflictId, action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'reschedule':
        this.quickRescheduleConflict(conflictId);
        break;
      case 'skip':
        this.quickSkipConflict(conflictId);
        break;
      case 'force':
        this.quickForceConflict(conflictId);
        break;
    }
  },
  
  /**
   * 快速重新安排冲突
   */
  async quickRescheduleConflict(conflictId) {
    wx.showLoading({ title: '重新安排中...' });
    
    try {
      // 找到替代时间
      const conflict = this.data.batchConflictPanel.sortedConflicts.find(c => c.scheduleId === conflictId);
      const alternativeTime = await this.findAlternativeTimeForConflict(conflict);
      
      if (alternativeTime) {
        // 更新冲突状态
        this.updateConflictResolution(conflictId, 'resolved', `重新安排到 ${alternativeTime}`);
        
        wx.hideLoading();
        wx.showToast({
          title: '重新安排成功',
          icon: 'success'
        });
      } else {
        throw new Error('找不到合适的时间');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '重新安排失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 快速跳过冲突
   */
  quickSkipConflict(conflictId) {
    wx.showModal({
      title: '确认跳过',
      content: '确定要跳过这个冲突项目吗？跳过后将保持原有时间不变。',
      success: (res) => {
        if (res.confirm) {
          this.updateConflictResolution(conflictId, 'skipped', '用户选择跳过');
          wx.showToast({
            title: '已跳过该冲突',
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 快速强制执行
   */
  quickForceConflict(conflictId) {
    wx.showModal({
      title: '强制执行警告',
      content: '强制执行可能会导致时间重叠和服务质量问题，确定要继续吗？',
      confirmText: '强制执行',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.updateConflictResolution(conflictId, 'forced', '用户强制执行');
          wx.showToast({
            title: '已强制执行',
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 更新冲突解决状态
   */
  updateConflictResolution(conflictId, status, method) {
    const { sortedConflicts } = this.data.batchConflictPanel;
    
    const updatedConflicts = sortedConflicts.map(conflict => {
      if (conflict.scheduleId === conflictId) {
        return {
          ...conflict,
          resolutionStatus: status,
          resolutionStatusText: this.getResolutionStatusText(status),
          resolutionMethod: method
        };
      }
      return conflict;
    });
    
    this.setData({
      'batchConflictPanel.sortedConflicts': updatedConflicts
    });
  },
  
  /**
   * 获取解决状态文本
   */
  getResolutionStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'resolved': '已解决',
      'skipped': '已跳过',
      'forced': '强制执行'
    };
    return statusMap[status] || '未知状态';
  },
  
  /**
   * 自动解决选项变更
   */
  onAutoResolutionOptionChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`batchConflictPanel.autoResolutionOptions.${field}`]: value
    });
  },

  /**
   * 估算经济损失
   */
  estimateEconomicLoss(conflict) {
    // 简化估算，实际应用中需要更复杂的算法
    const baseCost = 200; // 基础服务费用
    const severityMultiplier = {
      'low': 0.1,
      'medium': 0.3,
      'high': 0.5,
      'critical': 1.0
    };
    
    const multiplier = severityMultiplier[conflict.severity] || 0.3;
    return baseCost * multiplier;
  },

  /**
   * 确认执行批量调整
   */
  async confirmBatchAdjustment() {
    const { preview, progressCallback } = this.data.batchAdjustPanel;
    
    // 过滤出需要处理的项目（排除被跳过或取消的）
    const itemsToProcess = preview.filter(item => 
      item.status !== 'skipped' && item.status !== 'cancelled'
    );
    
    if (itemsToProcess.length === 0) {
      wx.showToast({
        title: '没有需要处理的项目',
        icon: 'none'
      });
      return;
    }
    
    // 隐藏批量调整面板
    this.setData({
      'batchAdjustPanel.visible': false
    });
    
    // 开始执行批量调整
    await this.executeFinalBatchAdjustment(itemsToProcess, progressCallback);
  },

  /**
   * 执行最终批量调整
   */
  async executeFinalBatchAdjustment(items, progressCallback) {
    let processed = 0;
    let success = 0;
    let failed = 0;
    const errors = [];
    
    for (const item of items) {
      try {
        // 调用 API 执行时间调整
        await ScheduleAPI.rescheduleAppointment(
          item.scheduleId,
          item.newTime.toISOString(),
          new Date(item.newTime.getTime() + item.duration * 60000).toISOString(),
          `批量调整: ${item.resolutionMethod || '自动调整'}`
        );
        
        success++;
        
        // 发送通知
        await this.sendAdjustmentNotification(item);
        
      } catch (error) {
        console.error(`调整日程 ${item.scheduleId} 失败:`, error);
        failed++;
        errors.push({
          scheduleId: item.scheduleId,
          patientName: item.patientName,
          error: error.message
        });
      }
      
      processed++;
      
      // 更新进度
      if (progressCallback) {
        progressCallback({ processed, success, failed });
      }
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 显示最终结果
    this.showBatchAdjustmentResult({
      total: items.length,
      success: success,
      failed: failed,
      errors: errors
    });
  },

  /**
   * 发送调整通知
   */
  async sendAdjustmentNotification(item) {
    try {
      const notificationData = {
        type: 'schedule_adjustment',
        scheduleId: item.scheduleId,
        patientName: item.patientName,
        originalTime: item.originalTime,
        newTime: item.newTime,
        reason: item.resolutionMethod || '批量调整'
      };
      
      // 这里应该调用通知服务
      // await notificationService.sendAdjustmentNotification(notificationData);
      
    } catch (error) {
      console.error('发送通知失败:', error);
      // 通知失败不影响主流程
    }
  },

  /**
   * 显示批量调整结果
   */
  showBatchAdjustmentResult(result) {
    const { total, success, failed, errors } = result;
    
    let title, content;
    
    if (failed === 0) {
      title = '批量调整成功';
      content = `所有${total}个预约均已成功调整`;
    } else if (success === 0) {
      title = '批量调整失败';
      content = `所有${total}个预约调整均失败`;
    } else {
      title = '批量调整部分成功';
      content = `成功调整${success}个，失败${failed}个`;
    }
    
    // 如果有错误，显示详细信息
    if (errors.length > 0) {
      const errorDetails = errors.slice(0, 3).map(err => 
        `• ${err.patientName}: ${err.error}`
      ).join('\n');
      
      const moreErrors = errors.length > 3 ? `\n...及其他${errors.length - 3}个错误` : '';
      
      content += `\n\n失败详情:\n${errorDetails}${moreErrors}`;
    }
    
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        // 刷新数据并退出批量模式
        this.refreshData();
        this.resetBatchSelectionState();
      }
    });
  },

  /**
   * 取消批量调整
   */
  cancelBatchAdjustment() {
    this.setData({
      'batchAdjustPanel.visible': false,
      'batchConflictPanel.visible': false
    });
  },

  /**
   * 重置批量选择状态
   */
  resetBatchSelectionState() {
    this.setData({
      batchMode: false,
      selectedSchedules: [],
      'batchAdjustPanel.visible': false,
      'batchConflictPanel.visible': false
    });
  },
  
  /**
   * 显示批量时间调整弹窗
   */
  async showBatchTimeAdjustModal(selectedSchedules) {
    try {
      // 使用第一个预约作为基准
      const baseAppointment = selectedSchedules[0];
      
      // 获取可用时间段
      const availableSlots = await this.getAvailableTimeSlots();
      
      this.setData({
        'timeAdjustment.modalVisible': true,
        'timeAdjustment.currentAppointment': baseAppointment,
        'timeAdjustment.isBatch': true,
        'timeAdjustment.batchAppointments': selectedSchedules,
        'timeAdjustment.availableSlots': availableSlots
      });
    } catch (error) {
      console.error('显示批量调整弹窗失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },
  
  /**
   * 一键延期功能
   */
  batchDelayAppointments(selectedSchedules) {
    const delayOptions = [
      { label: '延期30分钟', minutes: 30 },
      { label: '延期1小时', minutes: 60 },
      { label: '延期2小时', minutes: 120 },
      { label: '延期到明天', minutes: 24 * 60 },
      { label: '自定义延期时间', minutes: 0 }
    ];
    
    wx.showActionSheet({
      itemList: delayOptions.map(opt => opt.label),
      success: (res) => {
        const selected = delayOptions[res.tapIndex];
        
        if (selected.minutes === 0) {
          // 自定义延期时间
          this.showCustomDelayInput(selectedSchedules);
        } else {
          this.executeBatchDelay(selectedSchedules, selected.minutes);
        }
      }
    });
  },
  
  /**
   * 执行批量延期
   */
  async executeBatchDelay(selectedSchedules, delayMinutes) {
    try {
      wx.showLoading({ title: '正在延期...' });
      
      const batchData = {
        type: 'delay',
        delayMinutes: delayMinutes,
        schedules: selectedSchedules.map(schedule => ({
          id: schedule.id,
          originalTime: schedule.startTime,
          newTime: new Date(new Date(schedule.startTime).getTime() + delayMinutes * 60000).toISOString()
        })),
        reason: `批量延期${delayMinutes}分钟`,
        batchId: 'batch_' + Date.now()
      };
      
      // 调用API执行批量延期
      const result = await ScheduleAPI.batchReschedule(
        selectedSchedules.map(s => s.id),
        null, // 使用动态计算的时间
        null,
        batchData.reason
      );
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: `成功延期${selectedSchedules.length}个预约`,
          icon: 'success'
        });
        
        // 退出批量模式并刷新数据
        this.setData({
          batchMode: false,
          selectedSchedules: []
        });
        
        this.refreshData();
        
        // 发送批量调整通知
        this.sendBatchAdjustNotifications(batchData);
      } else {
        throw new Error(result.message || '批量延期失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '延期失败，请重试',
        icon: 'none'
      });
    }
  },
  
  /**
   * 智能批量重新安排
   */
  async smartBatchReschedule(selectedSchedules) {
    try {
      wx.showLoading({ title: '智能分析中...' });
      
      // 进行智能分析，找到最优的重新安排方案
      const analysisResult = await this.analyzeOptimalReschedule(selectedSchedules);
      
      wx.hideLoading();
      
      if (analysisResult.solutions.length === 0) {
        wx.showToast({
          title: '暂无可用的重新安排方案',
          icon: 'none'
        });
        return;
      }
      
      // 显示智能推荐结果
      this.showSmartRescheduleSolutions(selectedSchedules, analysisResult);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '分析失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分析最优重新安排方案
   */
  async analyzeOptimalReschedule(selectedSchedules) {
    const solutions = [];
    
    // 方案1：统一延后一天
    solutions.push({
      id: 'next_day',
      title: '统一调整到明天',
      description: '将所有选中的预约调整到明天同一时间',
      confidence: 90,
      estimatedTime: '2分钟',
      affectedCount: selectedSchedules.length,
      advantages: ['操作简单', '冲突概率低']
    });
    
    // 方案2：智能分散安排
    solutions.push({
      id: 'smart_distribute',
      title: '智能分散安排',
      description: '根据地理位置和空闲时间自动分配',
      confidence: 85,
      estimatedTime: '3分钟',
      affectedCount: selectedSchedules.length,
      advantages: ['路程最优', '时间分布合理']
    });
    
    // 方案3：按优先级分组
    solutions.push({
      id: 'priority_group',
      title: '按优先级分组调整',
      description: '紧急预约优先安排，其他逐步调整',
      confidence: 80,
      estimatedTime: '4分钟',
      affectedCount: selectedSchedules.length,
      advantages: ['重要性优先', '灵活性高']
    });
    
    return {
      totalSchedules: selectedSchedules.length,
      analysisTime: new Date().toISOString(),
      solutions: solutions
    };
  },
  
  /**
   * 显示智能重新安排方案
   */
  showSmartRescheduleSolutions(selectedSchedules, analysisResult) {
    const solutions = analysisResult.solutions;
    const solutionLabels = solutions.map(sol => 
      `${sol.title} (信心度${sol.confidence}%)`
    );
    
    wx.showActionSheet({
      itemList: solutionLabels,
      success: (res) => {
        const selectedSolution = solutions[res.tapIndex];
        this.executeSolution(selectedSchedules, selectedSolution);
      }
    });
  },
  
  /**
   * 执行选定的解决方案
   */
  async executeSolution(selectedSchedules, solution) {
    try {
      wx.showLoading({ title: `正在执行${solution.title}...` });
      
      let adjustedSchedules = [];
      
      switch (solution.id) {
        case 'next_day':
          adjustedSchedules = this.calculateNextDaySchedules(selectedSchedules);
          break;
        case 'smart_distribute':
          adjustedSchedules = await this.calculateSmartDistribution(selectedSchedules);
          break;
        case 'priority_group':
          adjustedSchedules = await this.calculatePriorityGrouping(selectedSchedules);
          break;
      }
      
      // 执行批量调整
      const batchData = {
        type: 'smart_reschedule',
        solutionId: solution.id,
        solutionTitle: solution.title,
        schedules: adjustedSchedules,
        reason: `智能重新安排: ${solution.title}`,
        batchId: 'smart_' + Date.now()
      };
      
      const result = await this.executeBatchAdjustment(batchData);
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: `${solution.title}执行成功`,
          icon: 'success'
        });
        
        this.handleBatchAdjustSuccess(batchData);
      } else {
        throw new Error(result.message || '执行失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '执行失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 计算第二天的时间表
   */
  calculateNextDaySchedules(selectedSchedules) {
    return selectedSchedules.map(schedule => {
      const originalDate = new Date(schedule.startTime);
      const nextDay = new Date(originalDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      return {
        id: schedule.id,
        originalTime: schedule.startTime,
        newTime: nextDay.toISOString(),
        adjustType: 'next_day'
      };
    });
  },
  
  /**
   * 计算智能分布方案
   */
  async calculateSmartDistribution(selectedSchedules) {
    // 模拟智能分析，根据地理位置和可用时间进行分配
    const adjustedSchedules = [];
    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0); // 从明天上午9点开始
    baseTime.setDate(baseTime.getDate() + 1);
    
    selectedSchedules.forEach((schedule, index) => {
      const adjustedTime = new Date(baseTime);
      adjustedTime.setHours(adjustedTime.getHours() + index * 2); // 每2小时一个
      
      adjustedSchedules.push({
        id: schedule.id,
        originalTime: schedule.startTime,
        newTime: adjustedTime.toISOString(),
        adjustType: 'smart_distribution'
      });
    });
    
    return adjustedSchedules;
  },
  
  /**
   * 计算优先级分组方案
   */
  async calculatePriorityGrouping(selectedSchedules) {
    // 按优先级排序
    const sortedSchedules = [...selectedSchedules].sort((a, b) => {
      const priorityOrder = {
        'urgent': 4,
        'high': 3,
        'normal': 2,
        'low': 1
      };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });
    
    const adjustedSchedules = [];
    const baseTime = new Date();
    baseTime.setHours(8, 0, 0, 0); // 从明天上午8点开始
    baseTime.setDate(baseTime.getDate() + 1);
    
    sortedSchedules.forEach((schedule, index) => {
      const adjustedTime = new Date(baseTime);
      
      // 紧急和高优先级的安排在前面
      if (schedule.priority === 'urgent') {
        adjustedTime.setHours(8 + index); // 紧急任务每小时一个
      } else if (schedule.priority === 'high') {
        adjustedTime.setHours(10 + index); // 高优先级从10点开始
      } else {
        adjustedTime.setHours(14 + index); // 普通任务从下午2点开始
      }
      
      adjustedSchedules.push({
        id: schedule.id,
        originalTime: schedule.startTime,
        newTime: adjustedTime.toISOString(),
        adjustType: 'priority_grouping',
        priority: schedule.priority
      });
    });
    
    return adjustedSchedules;
  },
  
  /**
   * 执行批量调整
   */
  async executeBatchAdjustment(batchData) {
    try {
      // 调用API执行批量调整
      const result = await ScheduleAPI.batchReschedule(
        batchData.schedules.map(s => s.id),
        batchData.schedules.map(s => s.newTime),
        null, // endTime由后端计算
        batchData.reason
      );
      
      return result;
    } catch (error) {
      console.error('执行批量调整失败:', error);
      return { success: false, message: error.message };
    }
  },
  
  /**
   * 处理批量调整成功
   */
  handleBatchAdjustSuccess(batchData) {
    // 退出批量模式
    this.setData({
      batchMode: false,
      selectedSchedules: []
    });
    
    // 刷新数据
    this.refreshData();
    
    // 发送通知
    this.sendBatchAdjustNotifications(batchData);
    
    // 记录批量调整历史
    this.recordBatchAdjustHistory(batchData);
  },
  
  /**
   * 发送批量调整通知
   */
  async sendBatchAdjustNotifications(batchData) {
    try {
      // 给每个患者发送通知
      const patientGroups = new Map();
      
      // 按患者分组
      batchData.schedules.forEach(schedule => {
        const originalSchedule = this.data.filteredScheduleList.find(s => s.id === schedule.id);
        if (originalSchedule && originalSchedule.patient) {
          const patientId = originalSchedule.patient.id;
          if (!patientGroups.has(patientId)) {
            patientGroups.set(patientId, {
              patient: originalSchedule.patient,
              adjustments: []
            });
          }
          patientGroups.get(patientId).adjustments.push({
            serviceName: originalSchedule.serviceName || '护理服务',
            originalTime: schedule.originalTime,
            newTime: schedule.newTime
          });
        }
      });
      
      // 发送通知
      const timeAdjustService = require('../../services/time-adjust-notification.service.js');
      
      for (const [patientId, group] of patientGroups) {
        await timeAdjustService.sendBatchAdjustNotification({
          patientInfo: {
            patientId: patientId,
            patientName: group.patient.name,
            patientPhone: group.patient.phone,
            patientOpenid: group.patient.openid
          },
          adjustments: group.adjustments,
          reason: batchData.reason,
          effectiveDate: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('发送批量调整通知失败:', error);
    }
  },
  
  /**
   * 记录批量调整历史
   */
  recordBatchAdjustHistory(batchData) {
    try {
      const historyRecord = {
        id: batchData.batchId,
        type: batchData.type,
        title: batchData.solutionTitle || batchData.reason,
        scheduleCount: batchData.schedules.length,
        timestamp: new Date().toISOString(),
        operator: wx.getStorageSync('userInfo')?.name || 'Unknown',
        details: batchData
      };
      
      // 保存到本地存储
      const batchHistory = wx.getStorageSync('batchAdjustHistory') || [];
      batchHistory.unshift(historyRecord);
      
      // 保留最近50条记录
      if (batchHistory.length > 50) {
        batchHistory.splice(50);
      }
      
      wx.setStorageSync('batchAdjustHistory', batchHistory);
      
      // 异步发送到服务器
      ScheduleAPI.recordBatchAdjustHistory && ScheduleAPI.recordBatchAdjustHistory(historyRecord);
      
    } catch (error) {
      console.error('记录批量调整历史失败:', error);
    }
  },
  
  /**
   * 批量取消
   */
  async batchCancel(scheduleIds) {
    wx.showModal({
      title: '批量取消确认',
      content: `确定要取消这 ${scheduleIds.length} 条日程吗？此操作不可恢复。`,
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '正在取消...' });
            
            const result = await ScheduleAPI.batchUpdateStatus(scheduleIds, CONSTANTS.SCHEDULE_STATUS.CANCELLED, '批量取消操作');
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: '批量取消成功',
                icon: 'success'
              });
              
              // 退出批量模式并刷新数据
              this.setData({
                batchMode: false,
                selectedSchedules: []
              });
              
              this.refreshData();
            } else {
              throw new Error(result.message || '取消失败');
            }
            
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  /**
   * 批量确认
   */
  async batchConfirm(scheduleIds) {
    try {
      wx.showLoading({ title: '正在确认...' });
      
      const result = await ScheduleAPI.batchUpdateStatus(scheduleIds, CONSTANTS.SCHEDULE_STATUS.CONFIRMED, '批量确认操作');
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: '批量确认成功',
          icon: 'success'
        });
        
        // 退出批量模式并刷新数据
        this.setData({
          batchMode: false,
          selectedSchedules: []
        });
        
        this.refreshData();
      } else {
        throw new Error(result.message || '确认失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '确认失败',
        icon: 'none'
      });
    }
  },

  /**
   * 日程卡片点击事件
   */
  onScheduleCardTap(e) {
    const schedule = e.detail?.schedule || e.currentTarget.dataset.schedule;
    if (!schedule) return;
    
    // 如果在批量模式下，点击即选择
    if (this.data.batchMode) {
      this.onScheduleSelect(e);
      return;
    }
    
    // 普通模式下跳转到详情页
    this.viewScheduleDetails(schedule);
  },
  
  /**
   * 日程卡片长按事件
   */
  onScheduleCardLongPress(e) {
    const schedule = e.detail?.schedule || e.currentTarget.dataset.schedule;
    if (!schedule) return;
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'heavy'
    });
    
    // 如果不在批量模式，进入批量模式并选中当前项
    if (!this.data.batchMode) {
      this.setData({
        batchMode: true,
        selectedSchedules: [schedule.id]
      });
      
      wx.showToast({
        title: '已进入批量选择模式',
        icon: 'none',
        duration: 1500
      });
    } else {
      // 已在批量模式，切换选中状态
      this.onScheduleSelect(e);
    }
  },
  
  /**
   * 日程卡片操作
   */
  onScheduleCardAction(e) {
    const { action, schedule } = e.detail;
    
    switch (action) {
      case 'start_service':
        this.startService(schedule);
        break;
        
      case 'more':
        this.showScheduleActions(schedule);
        break;
        
      default:
        console.log('未知操作:', action);
    }
  },

  /**
   * 显示日程操作菜单
   */
  showScheduleActions(schedule) {
    const actions = [];
    
    // 根据日程状态显示不同操作
    switch (schedule.status) {
      case CONSTANTS.SCHEDULE_STATUS.PENDING:
      case CONSTANTS.SCHEDULE_STATUS.CONFIRMED:
        actions.push(
          { key: 'start', label: '开始服务', icon: '▶️' },
          { key: 'reschedule', label: '调整时间', icon: '📅' },
          { key: 'cancel', label: '取消服务', icon: '❌' }
        );
        break;
        
      case CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS:
        actions.push(
          { key: 'complete', label: '完成服务', icon: '✅' },
          { key: 'no_show', label: '患者不在家', icon: '🚪' }
        );
        break;
        
      case CONSTANTS.SCHEDULE_STATUS.COMPLETED:
        actions.push(
          { key: 'view_record', label: '查看记录', icon: '📋' }
        );
        break;
    }
    
    // 通用操作
    actions.push(
      { key: 'edit', label: '编辑日程', icon: '✏️' },
      { key: 'details', label: '查看详情', icon: '👁️' }
    );
    
    this.setData({
      selectedSchedule: schedule,
      actionModalActions: actions,
      showActionModal: true
    });
  },

  /**
   * 执行日程操作
   */
  onScheduleAction(e) {
    const action = e.detail.action;
    const schedule = this.data.selectedSchedule;
    
    this.setData({
      showActionModal: false
    });
    
    switch (action) {
      case 'start':
        this.startService(schedule);
        break;
        
      case 'complete':
        this.completeService(schedule);
        break;
        
      case 'reschedule':
        this.rescheduleService(schedule);
        break;
        
      case 'cancel':
        this.cancelService(schedule);
        break;
        
      case 'no_show':
        this.handleNoShow(schedule);
        break;
        
      case 'view_record':
        this.viewServiceRecord(schedule);
        break;
        
      case 'edit':
        this.editSchedule(schedule);
        break;
        
      case 'details':
        this.viewScheduleDetails(schedule);
        break;
    }
  },

  /**
   * 工具方法
   */
  isToday(dateTime) {
    const today = new Date();
    const date = new Date(dateTime);
    return today.toDateString() === date.toDateString();
  },

  isOverdue(startTime) {
    return new Date() > new Date(startTime);
  },

  getTimeUntilStart(startTime) {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return '已开始';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}天后`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟后`;
    } else {
      return `${minutes}分钟后`;
    }
  },

  getStatusColor(status) {
    const colorMap = {
      [CONSTANTS.SCHEDULE_STATUS.PENDING]: '#ff9500',
      [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: '#007aff',
      [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: '#34c759',
      [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: '#28a745',
      [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: '#ff3b30',
      [CONSTANTS.SCHEDULE_STATUS.NO_SHOW]: '#ff6b6b',
      [CONSTANTS.SCHEDULE_STATUS.OVERDUE]: '#dc3545'
    };
    return colorMap[status] || '#999';
  },

  /**
   * 服务操作方法
   */
  async startService(schedule) {
    // 实现开始服务逻辑
    console.log('开始服务:', schedule);
  },

  async completeService(schedule) {
    // 实现完成服务逻辑
    console.log('完成服务:', schedule);
  },

  async rescheduleService(schedule) {
    // 跳转到时间调整页面
    wx.navigateTo({
      url: `/pages/schedule-reschedule/schedule-reschedule?id=${schedule.id}`
    });
  },

  async cancelService(schedule) {
    // 实现取消服务逻辑
    console.log('取消服务:', schedule);
  },

  /**
   * 处理用户不在家情况
   */
  async handleNoShow(schedule) {
    const self = this;
    
    // 显示用户不在家处理选项
    wx.showActionSheet({
      itemList: [
        '联系患者或家属',
        '等待10分钟',
        '记录不在家原因',
        '立即重新安排',
        '标记为不在家'
      ],
      success: function(res) {
        switch (res.tapIndex) {
          case 0:
            self.contactPatientOrFamily(schedule);
            break;
          case 1:
            self.waitForPatient(schedule);
            break;
          case 2:
            self.recordNoShowReason(schedule);
            break;
          case 3:
            self.immediateReschedule(schedule);
            break;
          case 4:
            self.markAsNoShow(schedule);
            break;
        }
      }
    });
  },

  /**
   * 联系患者或家属
   */
  contactPatientOrFamily(schedule) {
    const patient = schedule.patient;
    if (!patient) {
      wx.showToast({
        title: '患者信息不完整',
        icon: 'none'
      });
      return;
    }

    const contactOptions = [];
    const actions = [];

    // 添加患者联系方式
    if (patient.phone) {
      contactOptions.push(`📞 致电患者：${patient.phone}`);
      actions.push(() => this.makeCall(patient.phone));
    }

    // 添加紧急联系人
    if (patient.emergencyContact && patient.emergencyContact.phone) {
      contactOptions.push(`📞 致电紧急联系人：${patient.emergencyContact.phone}`);
      actions.push(() => this.makeCall(patient.emergencyContact.phone));
    }

    // 添加微信联系选项
    if (patient.wechatId) {
      contactOptions.push('💬 发送微信消息');
      actions.push(() => this.sendWechatMessage(schedule));
    }

    // 添加短信选项
    if (patient.phone) {
      contactOptions.push('📱 发送短信');
      actions.push(() => this.sendSmsMessage(schedule));
    }

    if (contactOptions.length === 0) {
      wx.showToast({
        title: '没有可用的联系方式',
        icon: 'none'
      });
      return;
    }

    wx.showActionSheet({
      itemList: contactOptions,
      success: (res) => {
        if (res.tapIndex >= 0 && res.tapIndex < actions.length) {
          actions[res.tapIndex]();
        }
      }
    });
  },

  /**
   * 拨打电话
   */
  makeCall(phoneNumber) {
    wx.makePhoneCall({
      phoneNumber: phoneNumber,
      success: () => {
        // 记录联系尝试
        this.recordContactAttempt({
          type: 'phone_call',
          phoneNumber: phoneNumber,
          timestamp: new Date().toISOString()
        });
      },
      fail: (error) => {
        wx.showToast({
          title: '拨号失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 发送微信消息
   */
  sendWechatMessage(schedule) {
    const patient = schedule.patient;
    const message = `您好${patient.name}，我是您的护理记录员，现在已到达您家门口，但没有人应答。请问您现在是否在家？如果需要重新安排时间，请及时联系我们。`;
    
    // 这里应该调用微信API发送消息
    // 由于小程序限制，这里模拟发送过程
    wx.showLoading({ title: '发送中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '消息已发送',
        icon: 'success'
      });
      
      // 记录消息发送
      this.recordContactAttempt({
        type: 'wechat_message',
        message: message,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  },

  /**
   * 发送短信
   */
  sendSmsMessage(schedule) {
    const patient = schedule.patient;
    const message = `您好${patient.name}，我是您的护理记录员，现在已到达您家门口，但没有人应答。请问您现在是否在家？如果需要重新安排时间，请及时联系我们。回复T退订。`;
    
    wx.showLoading({ title: '发送中...' });
    
    // 调用SMS API
    ScheduleAPI.sendSms({
      phone: patient.phone,
      message: message,
      type: 'no_show_notification'
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '短信已发送',
        icon: 'success'
      });
      
      // 记录短信发送
      this.recordContactAttempt({
        type: 'sms_message',
        phone: patient.phone,
        message: message,
        timestamp: new Date().toISOString()
      });
    }).catch((error) => {
      wx.hideLoading();
      wx.showToast({
        title: '短信发送失败',
        icon: 'none'
      });
    });
  },

  /**
   * 等待患者（10分钟倒计时）
   */
  waitForPatient(schedule) {
    const self = this;
    let waitTime = 10 * 60; // 10分钟，单位秒
    
    wx.showModal({
      title: '等待患者',
      content: `将等待10分钟，期间您可以继续尝试联系患者。等待期间如果患者出现，请点击"患者已到"按钮。`,
      confirmText: '开始等待',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          self.startWaitingTimer(schedule, waitTime);
        }
      }
    });
  },

  /**
   * 开始等待倒计时
   */
  startWaitingTimer(schedule, waitTime) {
    const self = this;
    let remainingTime = waitTime;
    
    // 更新页面状态显示等待中
    this.setData({
      waitingForPatient: {
        isWaiting: true,
        scheduleId: schedule.id,
        remainingTime: remainingTime,
        startTime: new Date().toISOString()
      }
    });

    // 显示等待提示
    const modal = wx.showModal({
      title: '正在等待患者',
      content: `剩余等待时间：${Math.floor(remainingTime / 60)}分${remainingTime % 60}秒\n\n如果患者已到，请点击"患者已到"`,
      confirmText: '患者已到',
      cancelText: '停止等待',
      success: (res) => {
        if (res.confirm) {
          // 患者已到，继续正常服务流程
          self.patientArrived(schedule);
        } else {
          // 停止等待
          self.stopWaiting();
        }
      }
    });

    // 开始倒计时
    const timer = setInterval(() => {
      remainingTime--;
      
      if (remainingTime <= 0) {
        clearInterval(timer);
        self.waitingTimeout(schedule);
      } else {
        // 更新显示的剩余时间
        self.setData({
          'waitingForPatient.remainingTime': remainingTime
        });
      }
    }, 1000);

    // 保存定时器引用
    this.waitTimer = timer;
  },

  /**
   * 患者已到
   */
  patientArrived(schedule) {
    // 清除等待状态
    this.stopWaiting();
    
    // 记录等待结果
    this.recordWaitingResult(schedule, 'patient_arrived');
    
    wx.showToast({
      title: '可以开始服务了',
      icon: 'success'
    });
    
    // 更新预约状态为进行中
    this.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS);
  },

  /**
   * 等待超时
   */
  waitingTimeout(schedule) {
    // 清除等待状态
    this.stopWaiting();
    
    // 记录等待结果
    this.recordWaitingResult(schedule, 'timeout');
    
    wx.showModal({
      title: '等待超时',
      content: '已等待10分钟，患者仍未出现。请选择后续处理方式：',
      showCancel: false,
      confirmText: '选择处理方式',
      success: () => {
        // 重新显示处理选项
        this.handleNoShow(schedule);
      }
    });
  },

  /**
   * 停止等待
   */
  stopWaiting() {
    if (this.waitTimer) {
      clearInterval(this.waitTimer);
      this.waitTimer = null;
    }
    
    this.setData({
      waitingForPatient: {
        isWaiting: false,
        scheduleId: '',
        remainingTime: 0,
        startTime: ''
      }
    });
  },

  /**
   * 记录不在家原因
   */
  recordNoShowReason(schedule) {
    const self = this;
    const reasonOptions = [
      '患者临时外出',
      '患者忘记预约',
      '患者身体不适无法接受服务',
      '家属代为取消但未通知',
      '地址错误或找不到',
      '其他原因'
    ];

    wx.showActionSheet({
      itemList: reasonOptions,
      success: (res) => {
        let selectedReason = reasonOptions[res.tapIndex];
        
        if (selectedReason === '其他原因') {
          // 弹出输入框让用户自定义原因
          self.showCustomReasonInput(schedule);
        } else {
          self.saveNoShowReason(schedule, selectedReason);
        }
      }
    });
  },

  /**
   * 显示自定义原因输入框
   */
  showCustomReasonInput(schedule) {
    // 由于小程序限制，这里使用页面跳转的方式实现输入
    // 实际项目中可以使用自定义弹窗组件
    wx.navigateTo({
      url: `/pages/no-show-reason/no-show-reason?scheduleId=${schedule.id}`
    });
  },

  /**
   * 保存不在家原因
   */
  async saveNoShowReason(schedule, reason, customReason = '') {
    try {
      wx.showLoading({ title: '记录中...' });
      
      const noShowData = {
        scheduleId: schedule.id,
        reason: reason,
        customReason: customReason,
        timestamp: new Date().toISOString(),
        location: await this.getCurrentLocation(),
        recorderId: wx.getStorageSync('userInfo')?.id
      };
      
      // 调用API保存记录
      await ScheduleAPI.recordNoShow(noShowData);
      
      wx.hideLoading();
      wx.showToast({
        title: '记录已保存',
        icon: 'success'
      });
      
      // 询问是否需要重新安排
      this.askForReschedule(schedule);
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '记录失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 立即重新安排
   */
  immediateReschedule(schedule) {
    wx.showModal({
      title: '重新安排服务',
      content: '将为您提供可选的时间段进行重新安排。是否继续？',
      success: (res) => {
        if (res.confirm) {
          // 跳转到重新安排页面，传递特殊标识表示这是因为不在家而重新安排
          wx.navigateTo({
            url: `/pages/schedule-reschedule/schedule-reschedule?id=${schedule.id}&reason=no_show`
          });
        }
      }
    });
  },

  /**
   * 标记为不在家状态
   */
  async markAsNoShow(schedule) {
    wx.showModal({
      title: '标记为不在家',
      content: '确认将此预约标记为"患者不在家"状态吗？后续可在管理后台进行处理。',
      confirmText: '确认',
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            
            // 更新预约状态
            await this.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.NO_SHOW);
            
            // 记录处理详情
            await ScheduleAPI.recordNoShowHandling({
              scheduleId: schedule.id,
              handlingType: 'mark_as_no_show',
              timestamp: new Date().toISOString(),
              location: await this.getCurrentLocation(),
              recorderId: wx.getStorageSync('userInfo')?.id
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '已标记为不在家',
              icon: 'success'
            });
            
            // 刷新列表
            this.refreshData();
            
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '处理失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 获取当前位置
   */
  getCurrentLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy
          });
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  },

  /**
   * 更新预约状态
   */
  async updateScheduleStatus(scheduleId, status) {
    return ScheduleAPI.updateScheduleStatus(scheduleId, status);
  },

  /**
   * 记录联系尝试
   */
  recordContactAttempt(attemptData) {
    // 保存到本地存储或发送到服务器
    const attempts = wx.getStorageSync('contactAttempts') || [];
    attempts.push(attemptData);
    wx.setStorageSync('contactAttempts', attempts);
    
    // 异步发送到服务器
    ScheduleAPI.recordContactAttempt(attemptData).catch(error => {
      console.error('记录联系尝试失败:', error);
    });
  },

  /**
   * 记录等待结果
   */
  recordWaitingResult(schedule, result) {
    const waitingData = {
      scheduleId: schedule.id,
      result: result,
      waitStartTime: this.data.waitingForPatient?.startTime,
      waitEndTime: new Date().toISOString(),
      recorderId: wx.getStorageSync('userInfo')?.id
    };
    
    // 发送到服务器
    ScheduleAPI.recordWaitingResult(waitingData).catch(error => {
      console.error('记录等待结果失败:', error);
    });
  },

  /**
   * 页面隐藏
   */
  onHide() {
    // 停止等待定时器
    if (this.waitTimer) {
      clearInterval(this.waitTimer);
      this.waitTimer = null;
    }
  },

  /**
   * 页面卸载
   */
  onUnload() {
    // 清理定时器
    if (this.waitTimer) {
      clearInterval(this.waitTimer);
      this.waitTimer = null;
    }
    
    // 清理排序缓存
    this.clearSortCache();
  },

  viewServiceRecord(schedule) {
    // 跳转到服务记录页面
    wx.navigateTo({
      url: `/pages/service-record/service-record?scheduleId=${schedule.id}`
    });
  },

  editSchedule(schedule) {
    // 跳转到编辑页面
    wx.navigateTo({
      url: `/pages/schedule-edit/schedule-edit?id=${schedule.id}`
    });
  },

  viewScheduleDetails(schedule) {
    // 跳转到详情页面
    wx.navigateTo({
      url: `/pages/schedule-detail/schedule-detail?id=${schedule.id}`
    });
  },
  
  /**
   * 错误处理方法
   */
  handleError(error, context = '操作') {
    let errorType = 'unknown';
    let errorMessage = '未知错误';
    let canRetry = true;
    
    // 分析错误类型
    if (error.message && error.message.includes('网络')) {
      errorType = 'network';
      errorMessage = '网络连接失败，请检查网络设置';
    } else if (error.statusCode === 401) {
      errorType = 'permission';
      errorMessage = '登录已过期，请重新登录';
      canRetry = false;
    } else if (error.statusCode === 403) {
      errorType = 'permission';
      errorMessage = '没有权限访问此功能';
      canRetry = false;
    } else if (error.statusCode >= 500) {
      errorType = 'server';
      errorMessage = '服务器错误，请稍后重试';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const errorState = {
      hasError: true,
      errorType,
      errorMessage: `${context}: ${errorMessage}`,
      canRetry,
      retryCount: this.data.errorState.retryCount + 1,
      maxRetry: 3
    };
    
    this.setData({ errorState });
    
    // 显示错误提示
    if (canRetry && errorState.retryCount < errorState.maxRetry) {
      wx.showModal({
        title: '操作失败',
        content: errorMessage + '是否重试？',
        success: (res) => {
          if (res.confirm) {
            this.retryLastOperation();
          }
        }
      });
    } else {
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  /**
   * 重试上次操作
   */
  retryLastOperation() {
    // 清除错误状态
    this.setData({
      'errorState.hasError': false
    });
    
    // 重新加载数据
    this.refreshData();
  },
  
  /**
   * 清除错误状态
   */
  clearError() {
    this.setData({
      errorState: {
        hasError: false,
        errorType: '',
        errorMessage: '',
        canRetry: true,
        retryCount: 0,
        maxRetry: 3
      }
    });
  },
  
  /**
   * 比较优先级
   */
  comparePriority(priority1, priority2) {
    const priorityOrder = {
      [CONSTANTS.PRIORITY_LEVELS.URGENT]: 4,
      [CONSTANTS.PRIORITY_LEVELS.HIGH]: 3,
      [CONSTANTS.PRIORITY_LEVELS.NORMAL]: 2,
      [CONSTANTS.PRIORITY_LEVELS.LOW]: 1
    };
    return (priorityOrder[priority1] || 2) - (priorityOrder[priority2] || 2);
  },
  
  /**
   * 比较状态
   */
  compareStatus(status1, status2) {
    const statusOrder = {
      [CONSTANTS.SCHEDULE_STATUS.PENDING]: 1,
      [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: 2,
      [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: 3,
      [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: 4,
      [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: 5,
      [CONSTANTS.SCHEDULE_STATUS.NO_SHOW]: 6,
      [CONSTANTS.SCHEDULE_STATUS.OVERDUE]: 7
    };
    return (statusOrder[status1] || 0) - (statusOrder[status2] || 0);
  },
  
  /**
   * 比较服务类型
   */
  compareServiceType(type1, type2) {
    const typeOrder = {
      [CONSTANTS.SCHEDULE_TYPES.EMERGENCY]: 1,
      [CONSTANTS.SCHEDULE_TYPES.URGENT]: 2,
      [CONSTANTS.SCHEDULE_TYPES.REGULAR]: 3,
      [CONSTANTS.SCHEDULE_TYPES.FOLLOW_UP]: 4,
      [CONSTANTS.SCHEDULE_TYPES.INITIAL]: 5,
      [CONSTANTS.SCHEDULE_TYPES.CONSULTATION]: 6
    };
    return (typeOrder[type1] || 3) - (typeOrder[type2] || 3);
  },
  
  /**
   * 比较距离（基于地理位置）
   */
  compareDistance(schedule1, schedule2, ascending = true) {
    // 如果没有存储的距离信息，尝试计算
    const distance1 = schedule1.distance || this.calculateDistance(schedule1.address);
    const distance2 = schedule2.distance || this.calculateDistance(schedule2.address);
    
    if (ascending) {
      return distance1 - distance2;
    } else {
      return distance2 - distance1;
    }
  },
  
  /**
   * 计算距离（简化实现，实际应该使用真实的地理位置 API）
   */
  calculateDistance(address) {
    // 这里是模拟实现，实际应该使用微信小程序的地理位置 API
    if (!address || typeof address !== 'string') return 999; // 没有地址的排在最后
    
    // 如果已经缓存了距离计算结果，直接返回
    if (this.distanceCache && this.distanceCache[address]) {
      return this.distanceCache[address];
    }
    
    // 初始化缓存
    if (!this.distanceCache) {
      this.distanceCache = {};
    }
    
    // 模拟距离计算（实际应该使用真实的距离计算）
    const addressHash = this.getStringHash(address.trim());
    const distance = (addressHash % 50) + 1; // 返回 1-50 公里的模拟距离
    
    // 缓存结果
    this.distanceCache[address] = distance;
    
    return distance;
  },
  
  /**
   * 获取字符串哈希值（用于模拟距离计算）
   */
  getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  },
  
  /**
   * 生成筛选条件标签
   */
  generateFilterTags() {
    const filters = this.data.currentFilters;
    const tags = [];
    
    // 时间筛选标签
    if (filters.time !== CONSTANTS.FILTER_TYPES.ALL) {
      const timeLabels = {
        [CONSTANTS.FILTER_TYPES.TODAY]: '今日',
        [CONSTANTS.FILTER_TYPES.TOMORROW]: '明日',
        [CONSTANTS.FILTER_TYPES.THIS_WEEK]: '本周',
        [CONSTANTS.FILTER_TYPES.NEXT_WEEK]: '下周',
        [CONSTANTS.FILTER_TYPES.OVERDUE]: '已过期'
      };
      
      tags.push({
        type: 'time',
        key: filters.time,
        label: timeLabels[filters.time] || '时间筛选',
        icon: '📅',
        color: '#007aff'
      });
    }
    
    // 状态筛选标签
    if (filters.status !== 'all') {
      const statusLabels = {
        [CONSTANTS.SCHEDULE_STATUS.PENDING]: '待服务',
        [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: '已确认',
        [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: '服务中',
        [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: '已完成',
        [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: '已取消',
        [CONSTANTS.SCHEDULE_STATUS.NO_SHOW]: '不在家'
      };
      
      tags.push({
        type: 'status',
        key: filters.status,
        label: statusLabels[filters.status] || '状态筛选',
        icon: '📋',
        color: '#34c759'
      });
    }
    
    // 类型筛选标签
    if (filters.type !== 'all') {
      const typeLabels = {
        [CONSTANTS.SCHEDULE_TYPES.REGULAR]: '常规服务',
        [CONSTANTS.SCHEDULE_TYPES.EMERGENCY]: '紧急服务',
        [CONSTANTS.SCHEDULE_TYPES.FOLLOW_UP]: '复诊服务',
        [CONSTANTS.SCHEDULE_TYPES.INITIAL]: '初诊服务',
        [CONSTANTS.SCHEDULE_TYPES.CONSULTATION]: '咨询服务'
      };
      
      tags.push({
        type: 'type',
        key: filters.type,
        label: typeLabels[filters.type] || '类型筛选',
        icon: '🏥',
        color: '#ff9500'
      });
    }
    
    // 优先级筛选标签
    if (filters.priority !== 'all') {
      const priorityLabels = {
        [CONSTANTS.PRIORITY_LEVELS.LOW]: '低优先级',
        [CONSTANTS.PRIORITY_LEVELS.NORMAL]: '普通优先级',
        [CONSTANTS.PRIORITY_LEVELS.HIGH]: '高优先级',
        [CONSTANTS.PRIORITY_LEVELS.URGENT]: '紧急优先级'
      };
      
      const priorityColors = {
        [CONSTANTS.PRIORITY_LEVELS.LOW]: '#8e8e93',
        [CONSTANTS.PRIORITY_LEVELS.NORMAL]: '#007aff',
        [CONSTANTS.PRIORITY_LEVELS.HIGH]: '#ff9500',
        [CONSTANTS.PRIORITY_LEVELS.URGENT]: '#ff3b30'
      };
      
      tags.push({
        type: 'priority',
        key: filters.priority,
        label: priorityLabels[filters.priority] || '优先级筛选',
        icon: '🔥',
        color: priorityColors[filters.priority] || '#007aff'
      });
    }
    
    // 关键字搜索标签
    if (filters.keyword) {
      tags.push({
        type: 'keyword',
        key: 'keyword',
        label: `搜索: ${filters.keyword}`,
        icon: '🔍',
        color: '#5856d6'
      });
    }
    
    // 高级筛选标签
    if (filters.duration && (filters.duration.min > 0 || filters.duration.max < 999)) {
      tags.push({
        type: 'duration',
        key: 'duration',
        label: `时长: ${filters.duration.min}-${filters.duration.max}分钟`,
        icon: '⏱️',
        color: '#af52de'
      });
    }
    
    if (filters.distance && (filters.distance.min > 0 || filters.distance.max < 100)) {
      tags.push({
        type: 'distance',
        key: 'distance',
        label: `距离: ${filters.distance.min}-${filters.distance.max}公里`,
        icon: '📏',
        color: '#00c7be'
      });
    }
    
    if (filters.cost && (filters.cost.min > 0 || filters.cost.max < 9999)) {
      tags.push({
        type: 'cost',
        key: 'cost',
        label: `费用: ¥${filters.cost.min}-${filters.cost.max}`,
        icon: '💰',
        color: '#ff2d92'
      });
    }
    
    if (filters.noteKeyword) {
      tags.push({
        type: 'noteKeyword',
        key: 'noteKeyword',
        label: `备注: ${filters.noteKeyword}`,
        icon: '📝',
        color: '#8e8e93'
      });
    }
    
    // 排序标签（非默认排序时显示）
    if (filters.sort !== CONSTANTS.SORT_TYPES.TIME_ASC) {
      const sortLabel = CONSTANTS.SORT_TYPES_TEXT[filters.sort] || '自定义排序';
      tags.push({
        type: 'sort',
        key: filters.sort,
        label: `排序: ${sortLabel}`,
        icon: '🔄',
        color: '#6d6d70'
      });
    }
    
    return tags;
  },
  
  /**
   * 更新筛选条件标签
   */
  updateFilterTags() {
    try {
      const activeFilterTags = this.generateFilterTags();
      const filterResultCount = this.data.filteredScheduleList ? this.data.filteredScheduleList.length : 0;
      const totalResultCount = this.data.originalScheduleList ? this.data.originalScheduleList.length : 0;
      
      this.setData({
        activeFilterTags,
        filterResultCount,
        totalResultCount
      });
    } catch (error) {
      console.error('更新筛选标签失败:', error);
      // 设置默认值避免错误
      this.setData({
        activeFilterTags: [],
        filterResultCount: this.data.filteredScheduleList ? this.data.filteredScheduleList.length : 0,
        totalResultCount: this.data.originalScheduleList ? this.data.originalScheduleList.length : 0
      });
    }
  },
  
  /**
   * 移除筛选标签
   */
  removeFilterTag(e) {
    const { type, key } = e.currentTarget.dataset;
    const filters = { ...this.data.currentFilters };
    
    switch (type) {
      case 'time':
        filters.time = CONSTANTS.FILTER_TYPES.ALL;
        break;
      case 'status':
        filters.status = 'all';
        break;
      case 'type':
        filters.type = 'all';
        break;
      case 'priority':
        filters.priority = 'all';
        break;
      case 'keyword':
        filters.keyword = '';
        break;
      case 'duration':
        filters.duration = { min: 0, max: 999 };
        break;
      case 'distance':
        filters.distance = { min: 0, max: 100 };
        break;
      case 'cost':
        filters.cost = { min: 0, max: 9999 };
        break;
      case 'noteKeyword':
        filters.noteKeyword = '';
        break;
      case 'sort':
        filters.sort = CONSTANTS.SORT_TYPES.TIME_ASC;
        break;
    }
    
    this.setData({
      currentFilters: filters,
      'pagination.page': 1
    });
    
    this.loadScheduleList(true);
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
  },
  
  /**
   * 清除所有筛选标签
   */
  clearAllFilterTags() {
    const defaultFilters = {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: '',
      duration: { min: 0, max: 999 },
      distance: { min: 0, max: 100 },
      cost: { min: 0, max: 9999 },
      noteKeyword: ''
    };
    
    this.setData({
      currentFilters: defaultFilters,
      'pagination.page': 1
    });
    
    this.loadScheduleList(true);
    
    wx.showToast({
      title: '已清除所有筛选',
      icon: 'success',
      duration: 1500
    });
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'medium'
    });
  },
  
  /**
   * 保存筛选历史
   */
  saveFilterHistory() {
    const filters = this.data.currentFilters;
    
    // 检查是否是默认筛选条件
    const isDefaultFilter = (
      filters.time === CONSTANTS.FILTER_TYPES.ALL &&
      filters.status === 'all' &&
      filters.type === 'all' &&
      filters.priority === 'all' &&
      filters.patient === 'all' &&
      filters.sort === CONSTANTS.SORT_TYPES.TIME_ASC &&
      !filters.keyword &&
      (!filters.duration || (filters.duration.min === 0 && filters.duration.max === 999)) &&
      (!filters.distance || (filters.distance.min === 0 && filters.distance.max === 100)) &&
      (!filters.cost || (filters.cost.min === 0 && filters.cost.max === 9999)) &&
      !filters.noteKeyword
    );
    
    // 默认筛选不保存
    if (isDefaultFilter) return;
    
    const filterHistory = [...this.data.filterHistory];
    
    // 创建历史记录
    const historyItem = {
      id: Date.now().toString(),
      filters: JSON.parse(JSON.stringify(filters)), // 深拷贝
      tags: this.generateFilterTags(),
      resultCount: this.data.filterResultCount,
      timestamp: new Date().toISOString(),
      displayName: this.generateFilterDisplayName(filters)
    };
    
    // 检查是否已存在相同的筛选条件
    const existingIndex = filterHistory.findIndex(item => 
      JSON.stringify(item.filters) === JSON.stringify(filters)
    );
    
    if (existingIndex > -1) {
      // 更新时间和结果数量
      filterHistory[existingIndex] = historyItem;
    } else {
      // 添加新记录
      filterHistory.unshift(historyItem);
    }
    
    // 保留最近的20条记录
    if (filterHistory.length > 20) {
      filterHistory.splice(20);
    }
    
    this.setData({
      filterHistory
    });
    
    // 保存到本地存储
    try {
      wx.setStorageSync('schedule_filter_history', filterHistory);
    } catch (error) {
      console.error('保存筛选历史失败:', error);
    }
  },
  
  /**
   * 加载筛选历史
   */
  loadFilterHistory() {
    try {
      const filterHistory = wx.getStorageSync('schedule_filter_history') || [];
      this.setData({
        filterHistory
      });
    } catch (error) {
      console.error('加载筛选历史失败:', error);
    }
  },
  
  /**
   * 生成筛选条件显示名称
   */
  generateFilterDisplayName(filters) {
    const parts = [];
    
    if (filters.time !== CONSTANTS.FILTER_TYPES.ALL) {
      const timeLabels = {
        [CONSTANTS.FILTER_TYPES.TODAY]: '今日',
        [CONSTANTS.FILTER_TYPES.TOMORROW]: '明日',
        [CONSTANTS.FILTER_TYPES.THIS_WEEK]: '本周',
        [CONSTANTS.FILTER_TYPES.OVERDUE]: '已过期'
      };
      parts.push(timeLabels[filters.time]);
    }
    
    if (filters.status !== 'all') {
      const statusLabels = {
        [CONSTANTS.SCHEDULE_STATUS.PENDING]: '待服务',
        [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: '已完成',
        [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: '已取消'
      };
      parts.push(statusLabels[filters.status]);
    }
    
    if (filters.priority !== 'all') {
      const priorityLabels = {
        [CONSTANTS.PRIORITY_LEVELS.URGENT]: '紧急',
        [CONSTANTS.PRIORITY_LEVELS.HIGH]: '高优先级'
      };
      parts.push(priorityLabels[filters.priority]);
    }
    
    if (filters.keyword) {
      parts.push(`搜索"${filters.keyword}"`);
    }
    
    return parts.length > 0 ? parts.join(' + ') : '自定义筛选';
  },
  
  /**
   * 显示筛选历史
   */
  showFilterHistory() {
    this.setData({
      showFilterHistory: true
    });
  },
  
  /**
   * 隐藏筛选历史
   */
  hideFilterHistory() {
    this.setData({
      showFilterHistory: false
    });
  },
  
  /**
   * 应用历史筛选条件
   */
  applyHistoryFilter(e) {
    const index = e.currentTarget.dataset.index;
    const historyItem = this.data.filterHistory[index];
    
    if (!historyItem) return;
    
    this.setData({
      currentFilters: { ...historyItem.filters },
      'pagination.page': 1,
      showFilterHistory: false
    });
    
    this.loadScheduleList(true);
    
    wx.showToast({
      title: `已应用: ${historyItem.displayName}`,
      icon: 'success',
      duration: 1500
    });
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
  },
  
  /**
   * 删除历史筛选条件
   */
  deleteHistoryFilter(e) {
    const index = e.currentTarget.dataset.index;
    const historyItem = this.data.filterHistory[index];
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除筛选条件「${historyItem.displayName}」吗？`,
      success: (res) => {
        if (res.confirm) {
          const filterHistory = [...this.data.filterHistory];
          filterHistory.splice(index, 1);
          
          this.setData({
            filterHistory
          });
          
          // 更新本地存储
          try {
            wx.setStorageSync('schedule_filter_history', filterHistory);
          } catch (error) {
            console.error('更新筛选历史失败:', error);
          }
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 清空筛选历史
   */
  clearFilterHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有筛选历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            filterHistory: []
          });
          
          try {
            wx.removeStorageSync('schedule_filter_history');
          } catch (error) {
            console.error('清空筛选历史失败:', error);
          }
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 比较时间（增强版）
   */
  compareTime(time1, time2, ascending = true) {
    // 处理空值情况
    if (!time1 && !time2) return 0;
    if (!time1) return ascending ? 1 : -1;
    if (!time2) return ascending ? -1 : 1;
    
    const date1 = new Date(time1);
    const date2 = new Date(time2);
    
    // 检查日期有效性
    if (isNaN(date1.getTime()) && isNaN(date2.getTime())) return 0;
    if (isNaN(date1.getTime())) return ascending ? 1 : -1;
    if (isNaN(date2.getTime())) return ascending ? -1 : 1;
    
    const diff = date1.getTime() - date2.getTime();
    return ascending ? diff : -diff;
  },
  
  /**
   * 比较患者姓名（增强版）
   */
  comparePatientName(name1, name2, ascending = true) {
    // 处理空值情况
    const safeName1 = (name1 || '').trim();
    const safeName2 = (name2 || '').trim();
    
    if (!safeName1 && !safeName2) return 0;
    if (!safeName1) return ascending ? 1 : -1;
    if (!safeName2) return ascending ? -1 : 1;
    
    // 支持中文排序
    const result = safeName1.localeCompare(safeName2, 'zh-CN', {
      numeric: true,
      sensitivity: 'base'
    });
    
    return ascending ? result : -result;
  },
  
  /**
   * 比较服务时长（增强版）
   */
  compareDuration(duration1, duration2, ascending = true) {
    const safeDuration1 = Number(duration1) || 0;
    const safeDuration2 = Number(duration2) || 0;
    
    const diff = safeDuration1 - safeDuration2;
    return ascending ? diff : -diff;
  },
  
  /**
   * 比较费用（增强版）
   */
  compareCost(cost1, cost2, ascending = true) {
    const safeCost1 = Number(cost1) || 0;
    const safeCost2 = Number(cost2) || 0;
    
    const diff = safeCost1 - safeCost2;
    return ascending ? diff : -diff;
  },
  
  /**
   * 智能排序（基于多个因素的综合排序）
   */
  smartSort(scheduleList) {
    return scheduleList.sort((a, b) => {
      // 1. 紧急程度优先
      const urgencyA = this.getUrgencyScore(a);
      const urgencyB = this.getUrgencyScore(b);
      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA; // 紧急程度高的优先
      }
      
      // 2. 时间接近程度
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      const now = Date.now();
      const timeDistanceA = Math.abs(timeA - now);
      const timeDistanceB = Math.abs(timeB - now);
      
      if (Math.abs(timeDistanceA - timeDistanceB) > 3600000) { // 超过1小时差异
        return timeDistanceA - timeDistanceB; // 时间更接近的优先
      }
      
      // 3. 地理距离
      const distanceA = a.distance || this.calculateDistance(a.address);
      const distanceB = b.distance || this.calculateDistance(b.address);
      
      return distanceA - distanceB; // 距离更近的优先
    });
  },
  
  /**
   * 计算紧急程度评分
   */
  getUrgencyScore(schedule) {
    let score = 0;
    
    // 优先级权重
    const priorityWeights = {
      [CONSTANTS.PRIORITY_LEVELS.URGENT]: 40,
      [CONSTANTS.PRIORITY_LEVELS.HIGH]: 30,
      [CONSTANTS.PRIORITY_LEVELS.NORMAL]: 20,
      [CONSTANTS.PRIORITY_LEVELS.LOW]: 10
    };
    score += priorityWeights[schedule.priority] || 20;
    
    // 服务类型权重
    const typeWeights = {
      [CONSTANTS.SCHEDULE_TYPES.EMERGENCY]: 30,
      [CONSTANTS.SCHEDULE_TYPES.INITIAL]: 20,
      [CONSTANTS.SCHEDULE_TYPES.REGULAR]: 15,
      [CONSTANTS.SCHEDULE_TYPES.FOLLOW_UP]: 10,
      [CONSTANTS.SCHEDULE_TYPES.CONSULTATION]: 5
    };
    score += typeWeights[schedule.type] || 15;
    
    // 状态权重
    const statusWeights = {
      [CONSTANTS.SCHEDULE_STATUS.OVERDUE]: 20,
      [CONSTANTS.SCHEDULE_STATUS.PENDING]: 15,
      [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: 10,
      [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: 5
    };
    score += statusWeights[schedule.status] || 0;
    
    // 时间因素（即将开始的服务优先级更高）
    const now = new Date();
    const startTime = new Date(schedule.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilStart < 0) {
      score += 15; // 已经过期的
    } else if (hoursUntilStart <= 2) {
      score += 10; // 2小时内的
    } else if (hoursUntilStart <= 6) {
      score += 5; // 6小时内的
    }
    
    return score;
  },
  
  // ========== 时间调整相关方法 ==========
  
  /**
   * 单个预约时间调整
   */
  onScheduleAdjustTime(e) {
    const { schedule } = e.currentTarget.dataset;
    if (!schedule) {
      console.error('无效的预约信息');
      return;
    }
    
    this.showTimeAdjustModal(schedule);
  },
  
  /**
   * 显示时间调整弹窗
   */
  async showTimeAdjustModal(appointment, isBatch = false, batchAppointments = []) {
    try {
      // 加载可用时间段
      const availableSlots = await this.getAvailableTimeSlots(appointment);
      
      this.setData({
        'timeAdjustment.modalVisible': true,
        'timeAdjustment.currentAppointment': appointment,
        'timeAdjustment.isBatch': isBatch,
        'timeAdjustment.batchAppointments': batchAppointments,
        'timeAdjustment.availableSlots': availableSlots
      });
    } catch (error) {
      console.error('获取可用时间段失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
    }
  },
  
  /**
   * 隐藏时间调整弹窗
   */
  hideTimeAdjustModal() {
    this.setData({
      'timeAdjustment.modalVisible': false,
      'timeAdjustment.currentAppointment': null,
      'timeAdjustment.isBatch': false,
      'timeAdjustment.batchAppointments': [],
      'timeAdjustment.availableSlots': []
    });
  },
  
  /**
   * 时间调整成功事件
   */
  onTimeAdjustSuccess(e) {
    const { adjustData } = e.detail;
    
    wx.showToast({
      title: '调整成功',
      icon: 'success'
    });
    
    // 隐藏弹窗
    this.hideTimeAdjustModal();
    
    // 刷新列表
    this.refreshData();
    
    // 触发全局事件
    wx.eventBus && wx.eventBus.emit('scheduleAdjusted', adjustData);
  },
  
  /**
   * 时间调整取消事件
   */
  onTimeAdjustCancel() {
    this.hideTimeAdjustModal();
  },
  
  /**
   * 批量时间调整
   */
  onBatchTimeAdjust() {
    const selectedSchedules = this.data.selectedSchedules;
    
    if (selectedSchedules.length === 0) {
      wx.showToast({
        title: '请选择要调整的预约',
        icon: 'none'
      });
      return;
    }
    
    // 获取选中的预约信息
    const batchAppointments = this.data.scheduleList.filter(schedule => 
      selectedSchedules.includes(schedule.id)
    );
    
    // 使用第一个预约作为基准
    const baseAppointment = batchAppointments[0];
    
    this.showTimeAdjustModal(baseAppointment, true, batchAppointments);
  },
  
  /**
   * 查看调整历史
   */
  onViewAdjustmentHistory(e) {
    const { appointmentId, recorderId } = e.currentTarget.dataset;
    
    this.setData({
      'timeAdjustment.adjustmentHistory.modalVisible': true,
      'timeAdjustment.adjustmentHistory.appointmentId': appointmentId || '',
      'timeAdjustment.adjustmentHistory.recorderId': recorderId || ''
    });
  },
  
  /**
   * 关闭调整历史弹窗
   */
  onCloseAdjustmentHistory() {
    this.setData({
      'timeAdjustment.adjustmentHistory.modalVisible': false,
      'timeAdjustment.adjustmentHistory.appointmentId': '',
      'timeAdjustment.adjustmentHistory.recorderId': ''
    });
  },
  
  /**
   * 重新申请调整
   */
  onReapplyAdjustment(e) {
    const { originalRecord, appointmentInfo } = e.detail;
    
    // 关闭历史弹窗
    this.onCloseAdjustmentHistory();
    
    // 打开调整弹窗
    this.showTimeAdjustModal(appointmentInfo);
  },
  
  /**
   * 获取可用时间段
   */
  async getAvailableTimeSlots(appointment) {
    try {
      // 调用API获取可用时间段
      const result = await ScheduleAPI.getAvailableTimeSlots({
        recorderId: appointment.recorderId || wx.getStorageSync('userInfo').id,
        date: appointment.date,
        serviceType: appointment.serviceType,
        duration: appointment.duration || 60,
        excludeAppointmentId: appointment.id
      });
      
      return result.data || [];
    } catch (error) {
      console.error('获取可用时间段失败:', error);
      
      // 返回模拟数据
      return this.getMockAvailableSlots();
    }
  },
  
  /**
   * 获取模拟可用时间段
   */
  getMockAvailableSlots() {
    return [
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '10:30', endTime: '12:00' },
      { startTime: '14:00', endTime: '15:30' },
      { startTime: '15:30', endTime: '17:00' },
      { startTime: '17:00', endTime: '18:30' }
    ];
  },
  
  /**
   * 处理时间调整相关的操作事件
   */
  onScheduleCardAction(e) {
    const { action, schedule } = e.detail;
    
    switch (action) {
      case 'adjust-time':
        this.onScheduleAdjustTime({ currentTarget: { dataset: { schedule } } });
        break;
        
      case 'view-history':
        this.onViewAdjustmentHistory({
          currentTarget: {
            dataset: {
              appointmentId: schedule.id,
              recorderId: schedule.recorderId
            }
          }
        });
        break;
        
      case 'cancel':
        this.cancelSchedule(schedule);
        break;
        
      case 'confirm':
        this.confirmSchedule(schedule);
        break;
        
      default:
        console.log('未处理的操作:', action);
    }
  },
  
  /**
   * 取消预约
   */
  async cancelSchedule(schedule) {
    wx.showModal({
      title: '确认取消',
      content: `确定要取消与${schedule.patientName}的预约吗？`,
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '正在取消...' });
            
            await ScheduleAPI.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CANCELLED);
            
            wx.hideLoading();
            wx.showToast({
              title: '取消成功',
              icon: 'success'
            });
            
            this.refreshData();
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '取消失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },
  
  /**
   * 确认预约
   */
  async confirmSchedule(schedule) {
    try {
      wx.showLoading({ title: '正在确认...' });
      
      await ScheduleAPI.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CONFIRMED);
      
      wx.hideLoading();
      wx.showToast({
        title: '确认成功',
        icon: 'success'
      });
      
      this.refreshData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '确认失败',
        icon: 'error'
      });
    }
  },
  
  // ========================= 审批管理相关方法 =========================
  
  /**
   * 初始化审批权限
   */
  initApprovalPermissions() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const userRole = wx.getStorageSync('userRole');
      
      if (userInfo && userRole) {
        const { RolePermissionManager } = require('../../utils/role-permission.js');
        const hasApprovalPermission = RolePermissionManager.hasApprovalPermission(userRole);
        
        this.setData({
          'approvalManagement.userRole': userRole,
          'approvalManagement.hasApprovalPermission': hasApprovalPermission
        });
        
        // 如果有审批权限，加载待审批数量
        if (hasApprovalPermission) {
          this.loadPendingApprovalCount();
        }
      }
    } catch (error) {
      console.error('初始化审批权限失败:', error);
    }
  },
  
  /**
   * 加载待审批数量
   */
  async loadPendingApprovalCount() {
    try {
      const AdjustmentApprovalService = require('../../services/adjustment-approval.service.js');
      const userInfo = wx.getStorageSync('userInfo');
      
      const pendingTasks = await AdjustmentApprovalService.getApprovalTasks(userInfo.id, {
        status: 'pending_approval'
      });
      
      this.setData({
        'approvalManagement.pendingCount': pendingTasks.length
      });
    } catch (error) {
      console.error('加载待审批数量失败:', error);
    }
  },
  
  /**
   * 打开审批管理界面
   */
  openApprovalManager() {
    if (!this.data.approvalManagement.hasApprovalPermission) {
      wx.showToast({
        title: '没有审批权限',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      'approvalManagement.modalVisible': true,
      'approvalManagement.mode': 'list'
    });
  },
  
  /**
   * 查看审批详情
   */
  viewApprovalDetail(e) {
    const { requestId } = e.detail;
    
    this.setData({
      'approvalManagement.mode': 'detail',
      'approvalManagement.currentRequestId': requestId
    });
  },
  
  /**
   * 审批完成回调
   */
  onApprovalComplete(e) {
    const { requestId, decision, newStatus } = e.detail;
    
    console.log('审批完成:', { requestId, decision, newStatus });
    
    // 刷新待审批数量
    this.loadPendingApprovalCount();
    
    // 如果批准了，刷新日程列表
    if (decision === 'approve') {
      this.refreshData();
    }
  },
  
  /**
   * 关闭审批管理界面
   */
  closeApprovalManager() {
    this.setData({
      'approvalManagement.modalVisible': false,
      'approvalManagement.mode': 'list',
      'approvalManagement.currentRequestId': ''
    });
  },
  
  /**
   * 创建调整申请
   */
  async createAdjustmentRequest(adjustmentData) {
    try {
      wx.showLoading({ title: '提交申请中...' });
      
      const AdjustmentApprovalService = require('../../services/adjustment-approval.service.js');
      const userInfo = wx.getStorageSync('userInfo');
      
      const requestData = {
        applicantId: userInfo.id,
        appointmentId: adjustmentData.appointmentId,
        originalTime: adjustmentData.originalTime,
        newTime: adjustmentData.newTime,
        reason: adjustmentData.reason,
        reasonCategory: adjustmentData.reasonCategory,
        urgentLevel: adjustmentData.urgentLevel || 'normal',
        batchAdjust: adjustmentData.batchAdjust || false,
        affectedAppointments: adjustmentData.affectedAppointments || []
      };
      
      const result = await AdjustmentApprovalService.createAdjustmentRequest(requestData);
      
      wx.hideLoading();
      
      if (result.success) {
        if (result.requireApproval) {
          wx.showModal({
            title: '申请已提交',
            content: '您的调整申请已提交，请等待审批结果',
            showCancel: false,
            confirmText: '知道了'
          });
        } else {
          wx.showToast({
            title: '调整成功',
            icon: 'success'
          });
          // 刷新日程列表
          this.refreshData();
        }
      } else {
        wx.showToast({
          title: result.error || '提交失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('创建调整申请失败:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      });
    }
  },
  
  /**
   * 获取下个周一
   */
  getNextMonday() {
    const today = new Date();
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
    return nextMonday;
  },
  
  /**
   * 获取下个周六
   */
  getNextSaturday() {
    const today = new Date();
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
    return nextSaturday;
  },
  
  /**
   * 加载可用模板
   */
  async loadAvailableTemplates() {
    try {
      // 模拟模板数据
      const templates = [
        {
          id: 'template1',
          name: '常规延期模板',
          description: '将所有预约延期2小时',
          usageCount: 156,
          createTime: '2024-01-15'
        },
        {
          id: 'template2',
          name: '紧急情况模板',
          description: '按优先级重新安排，紧急优先',
          usageCount: 89,
          createTime: '2024-02-10'
        },
        {
          id: 'template3',
          name: '周末集中模板',
          description: '将所有预约集中到周末',
          usageCount: 34,
          createTime: '2024-03-01'
        }
      ];
      
      this.setData({
        'batchAdjustPanel.availableTemplates': templates
      });
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  },
  
  /**
   * 加载模板参数
   */
  async loadTemplateParams(templateId) {
    try {
      // 模拟模板参数
      const templateParams = {
        'template1': {
          delayType: 'hours',
          delayValue: 2,
          keepOrder: true
        },
        'template2': {
          strategy: 'priority',
          considerTraffic: false,
          priorityWeight: 70,
          timeWeight: 30
        },
        'template3': {
          targetDate: this.getNextSaturday().toISOString().split('T')[0],
          targetTime: '09:00',
          delayType: 'fixed'
        }
      };
      
      this.setData({
        'batchAdjustPanel.adjustParams.templateParams': templateParams[templateId] || {}
      });
      
      this.updateBatchPreview();
    } catch (error) {
      console.error('加载模板参数失败:', error);
    }
  },
  
  /**
   * 刷新预览
   */
  onRefreshPreview() {
    wx.showLoading({ title: '刷新中...' });
    
    setTimeout(() => {
      this.updateBatchPreview();
      wx.hideLoading();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    }, 800);
  },
  
  /**
   * 切换预览详细模式
   */
  onTogglePreviewDetail() {
    this.setData({
      showPreviewDetail: !this.data.showPreviewDetail
    });
  },
  
  /**
   * 保存调整模板
   */
  onSaveAdjustTemplate() {
    const { adjustType, adjustParams } = this.data.batchAdjustPanel;
    
    if (!adjustType || Object.keys(adjustParams).length === 0) {
      wx.showToast({
        title: '请先设置调整参数',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '保存模板',
      content: '是否将当前调整设置保存为模板？',
      success: (res) => {
        if (res.confirm) {
          this.saveCurrentAsTemplate();
        }
      }
    });
  },
  
  /**
   * 保存当前设置为模板
   */
  async saveCurrentAsTemplate() {
    try {
      const templateData = {
        name: `自定义模板_${new Date().toLocaleString()}`,
        adjustType: this.data.batchAdjustPanel.adjustType,
        adjustParams: this.data.batchAdjustPanel.adjustParams,
        createTime: new Date().toISOString()
      };
      
      // 这里应该调用API保存模板
      // await api.saveAdjustTemplate(templateData);
      
      wx.showToast({
        title: '模板保存成功',
        icon: 'success'
      });
      
      // 重新加载模板列表
      this.loadAvailableTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },
  
  /**
   * 加载模板参数
   */
  async loadTemplateParams(templateId) {
    try {
      // 模拟模板参数
      const templateParams = {
        'template1': {
          delayType: 'hours',
          delayValue: 2,
          keepOrder: true
        },
        'template2': {
          strategy: 'priority',
          considerTraffic: false,
          priorityWeight: 70,
          timeWeight: 30
        },
        'template3': {
          targetDate: this.getNextSaturday().toISOString().split('T')[0],
          targetTime: '09:00',
          delayType: 'fixed'
        }
      };
      
      this.setData({
        'batchAdjustPanel.adjustParams.templateParams': templateParams[templateId] || {}
      });
      
      this.updateBatchPreview();
    } catch (error) {
      console.error('加载模板参数失败:', error);
    }
  },
  
  /**
   * 刷新预览
   */
  onRefreshPreview() {
    wx.showLoading({ title: '刷新中...' });
    
    setTimeout(() => {
      this.updateBatchPreview();
      wx.hideLoading();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    }, 800);
  },
  
  /**
   * 切换预览详细模式
   */
  onTogglePreviewDetail() {
    this.setData({
      showPreviewDetail: !this.data.showPreviewDetail
    });
  },
  
  /**
   * 保存调整模板
   */
  onSaveAdjustTemplate() {
    const { adjustType, adjustParams } = this.data.batchAdjustPanel;
    
    if (!adjustType || Object.keys(adjustParams).length === 0) {
      wx.showToast({
        title: '请先设置调整参数',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '保存模板',
      content: '是否将当前调整设置保存为模板？',
      success: (res) => {
        if (res.confirm) {
          this.saveCurrentAsTemplate();
        }
      }
    });
  },
  
  /**
   * 加载可用模板列表
   */
  loadAvailableTemplates() {
    // TODO: 实现加载可用模板
    console.log('加载可用模板');
  },
  
  /**
   * 保存当前设置为模板
   */
  async saveCurrentAsTemplate() {
    try {
      const templateData = {
        name: `自定义模板_${new Date().toLocaleString()}`,
        adjustType: this.data.batchAdjustPanel.adjustType,
        adjustParams: this.data.batchAdjustPanel.adjustParams,
        createTime: new Date().toISOString()
      };
      
      // 这里应该调用API保存模板
      // await ScheduleAPI.saveAdjustTemplate(templateData);
      
      wx.showToast({
        title: '模板保存成功',
        icon: 'success'
      });
      
      // 重新加载模板列表
      this.loadAvailableTemplates();
    } catch (error) {
      console.error('保存模板失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // ========================= 错误处理工具方法 =========================

  /**
   * 处理错误
   */
  handleError(error, message = '操作失败') {
    console.error(message + ':', error);
    
    let errorMessage = message;
    if (error && error.message) {
      errorMessage = error.message;
    }
    
    this.setData({
      'errorState.hasError': true,
      'errorState.errorMessage': errorMessage,
      'errorState.errorType': this.getErrorType(error),
      'errorState.canRetry': true
    });
    
    wx.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 获取错误类型
   */
  getErrorType(error) {
    if (!error) return 'unknown';
    
    if (error.code === 'NETWORK_ERROR') {
      return 'network';
    } else if (error.code === 'AUTH_FAILED') {
      return 'permission';
    } else if (error.code === 'VALIDATION_ERROR') {
      return 'data';
    }
    
    return 'unknown';
  },

  // ========================= 页面状态管理方法 =========================

  /**
   * 清除错误状态
   */
  clearErrorState() {
    this.setData({
      'errorState.hasError': false,
      'errorState.errorMessage': '',
      'errorState.errorType': '',
      'errorState.canRetry': true
    });
  }
});
