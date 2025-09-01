const api = require('../../api/index');
const CONSTANTS = require('../../constants/constants');
const loginPageDecorator = require('../../utils/login-page-decorator');

/**
 * 日程管理页面
 * 功能：显示日程列表、筛选排序、批量操作等
 */
Page(loginPageDecorator({
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
    }
  },

  /**
   * 页面加载
   */
  onLoad(options) {
    this.initPage();
    this.initApprovalPermissions(); // 初始化审批权限
    this.loadScheduleList(true);
    this.loadFilterHistory(); // 加载筛选历史
    // 在开发阶段使用模拟数据
    this.setMockStatistics();
    
    // 初始化排序缓存
    this.sortCache = new Map();
    this.distanceCache = {};
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
      
      const result = await api.getScheduleList(params);
      
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
      this.handleError(error, '加载日程列表失败');
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
        api.getScheduleStatistics(),
        api.getDetailedStatistics('today')
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
      const result = await api.getStatisticsTrend(7);
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
    let filteredList = [...this.data.originalScheduleList];
    
    // 排序
    const sortType = this.data.currentFilters.sort;
    
    // 检查是否可以使用缓存的排序结果
    const canUseCache = this.canUseSortCache(sortType);
    if (!canUseCache) {
      // 执行排序
      if (sortType === 'combined' && this.data.currentFilters.sortCombination) {
        // 组合排序
        filteredList.sort((a, b) => {
          return this.applyCombinedSort(a, b, this.data.currentFilters.sortCombination);
        });
      } else if (sortType === 'smart') {
        // 智能排序
        filteredList = this.smartSort(filteredList);
      } else {
        // 单一排序
        filteredList.sort((a, b) => {
          return this.applySingleSort(a, b, sortType);
        });
      }
    }
    
    this.setData({
      filteredScheduleList: filteredList
    });
    
    // 更新筛选条件标签
    this.updateFilterTags();
    
    // 记录排序操作到缓存
    this.cacheSortResult(sortType, filteredList.length);
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
      selectedSchedules: [] // 清空选中列表
    });
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    wx.showToast({
      title: batchMode ? '已进入批量模式' : '已退出批量模式',
      icon: 'none',
      duration: 1500
    });
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
    
    // 触觉反馈
    wx.vibrateShort({
      type: 'light'
    });
    
    this.setData({
      selectedSchedules
    });
  },
  
  /**
   * 全选功能
   */
  selectAll() {
    const allScheduleIds = this.data.filteredScheduleList.map(item => item.id);
    
    this.setData({
      selectedSchedules: allScheduleIds
    });
    
    wx.vibrateShort({
      type: 'medium'
    });
    
    wx.showToast({
      title: `已全选 ${allScheduleIds.length} 条日程`,
      icon: 'none',
      duration: 1500
    });
  },
  
  /**
   * 反选功能
   */
  selectInverse() {
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
  },
  
  /**
   * 清除所有选中
   */
  clearSelection() {
    this.setData({
      selectedSchedules: []
    });
    
    wx.showToast({
      title: '已清除选中',
      icon: 'none',
      duration: 1000
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
        icon: 'none'
      });
      return;
    }
    
    switch (action) {
      case 'reschedule':
        this.batchReschedule(selectedSchedules);
        break;
        
      case 'cancel':
        this.batchCancel(selectedSchedules);
        break;
        
      case 'confirm':
        this.batchConfirm(selectedSchedules);
        break;
        
      case 'delete':
        this.batchDelete(selectedSchedules);
        break;
        
      default:
        console.log('未知的批量操作:', action);
    }
  },
  
  /**
   * 批量调整时间
   */
  async batchReschedule(scheduleIds) {
    wx.showModal({
      title: '批量调整确认',
      content: `确定要调整这 ${scheduleIds.length} 条日程的时间吗？`,
      success: (res) => {
        if (res.confirm) {
          // 跳转到批量调整页面
          wx.navigateTo({
            url: `/pages/batch-reschedule/batch-reschedule?ids=${scheduleIds.join(',')}`
          });
        }
      }
    });
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
            
            const result = await api.batchUpdateStatus(scheduleIds, CONSTANTS.SCHEDULE_STATUS.CANCELLED, '批量取消操作');
            
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
      
      const result = await api.batchUpdateStatus(scheduleIds, CONSTANTS.SCHEDULE_STATUS.CONFIRMED, '批量确认操作');
      
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

  async handleNoShow(schedule) {
    // 实现患者不在家处理逻辑
    console.log('患者不在家:', schedule);
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
    const activeFilterTags = this.generateFilterTags();
    const filterResultCount = this.data.filteredScheduleList.length;
    const totalResultCount = this.data.originalScheduleList.length;
    
    this.setData({
      activeFilterTags,
      filterResultCount,
      totalResultCount
    });
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
      const result = await api.getAvailableTimeSlots({
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
            
            await api.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CANCELLED);
            
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
      
      await api.updateScheduleStatus(schedule.id, CONSTANTS.SCHEDULE_STATUS.CONFIRMED);
      
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
        const RolePermissionManager = require('../../utils/role-permission.js');
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
  }
  }
}));