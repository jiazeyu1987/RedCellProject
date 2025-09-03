// 日程管理页面
const { scheduleStore, userStore, appStore } = require('../../stores/index.js');
const CONSTANTS = require('../../constants/constants');
const ErrorHandler = require('../../utils/error-handler');
const { PermissionMiddleware, PagePermissions } = require('../../utils/permission-middleware');
const { PERMISSIONS, RolePermissionManager } = require('../../utils/role-permission');

/**
 * 日程管理页面
 * 功能：日程列表展示、筛选排序、批量操作等
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    
    // 日程列表数据
    scheduleList: [],
    filteredScheduleList: [],
    
    // 分页信息
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: true
    },
    
    // 筛选和排序
    currentFilters: {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: ''
    },
    
    // 批量操作
    batchMode: false,
    selectedSchedules: [],
    allSelected: false,
    
    // 界面显示状态
    showFilter: false,
    showStats: true,
    showFab: true,
    showMoreMenu: false,
    hasActiveFilters: false,
    
    // 统计信息
    scheduleStats: {
      total: 0,
      pending: 0,
      today: 0,
      overdue: 0,
      completed: 0
    },
    
    // 快捷筛选标签
    quickFilters: [
      {
        key: CONSTANTS.FILTER_TYPES.TODAY,
        label: '今日',
        icon: '📍',
        active: false,
        count: 0
      },
      {
        key: CONSTANTS.FILTER_TYPES.TOMORROW,
        label: '明日', 
        icon: '➡️',
        active: false,
        count: 0
      },
      {
        key: CONSTANTS.FILTER_TYPES.THIS_WEEK,
        label: '本周',
        icon: '📊',
        active: false,
        count: 0
      },
      {
        key: CONSTANTS.FILTER_TYPES.OVERDUE,
        label: '已过期',
        icon: '⚠️',
        active: false,
        count: 0
      }
    ],
    
    // 权限相关
    permissions: {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canBatchEdit: false
    },
    
    // 患者列表（用于筛选）
    patientList: [],
    
    // 浮动操作按钮
    fabExpanded: false,
    fabActions: [
      {
        key: 'create',
        label: '创建日程',
        icon: '➕',
        color: '#007AFF'
      },
      {
        key: 'sync',
        label: '同步日程',
        icon: '🔄',
        color: '#34C759'
      },
      {
        key: 'export',
        label: '导出列表',
        icon: '📤',
        color: '#FF9500'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('日程管理页面加载', options);
    
    try {
      // 权限检查
      this.checkPermissions();
      
      // 初始化页面数据
      this.initPageData();
      
      // 加载日程列表
      this.loadScheduleList();
      
      // 设置页面状态
      appStore.setState({
        currentPage: 'schedule'
      });
      
    } catch (error) {
      console.error('页面加载失败:', error);
      ErrorHandler.showError('页面加载失败，请重试');
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    console.log('日程管理页面渲染完成');
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '日程管理'
    });
    
    // 监听状态变化
    this.setupStoreListeners();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('日程管理页面显示');
    
    // 刷新数据
    this.refreshScheduleList();
    
    // 更新统计信息
    this.updateScheduleStats();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    console.log('日程管理页面隐藏');
    
    // 退出批量模式
    if (this.data.batchMode) {
      this.exitBatchMode();
    }
    
    // 隐藏筛选器
    if (this.data.showFilter) {
      this.hideFilter();
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    console.log('日程管理页面卸载');
    
    // 清理定时器
    this.clearTimers();
    
    // 移除事件监听
    this.removeStoreListeners();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    console.log('用户下拉刷新');
    
    this.setData({
      refreshing: true
    });
    
    this.refreshScheduleList().finally(() => {
      this.setData({
        refreshing: false
      });
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    console.log('页面触底，加载更多');
    
    if (this.data.pagination.hasMore && !this.data.loadingMore) {
      this.loadMoreSchedules();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '我的日程管理',
      path: '/pages/schedule/schedule',
      imageUrl: '/images/share-schedule.png'
    };
  },

  // ============ 权限检查 ============
  
  /**
   * 检查用户权限
   */
  checkPermissions() {
    const userInfo = userStore.getState().userInfo;
    const userRole = userInfo?.role || 'recorder';
    
    const permissions = {
      canView: RolePermissionManager.hasPermission(userRole, PERMISSIONS.VIEW_SCHEDULE),
      canCreate: RolePermissionManager.hasPermission(userRole, PERMISSIONS.CREATE_SCHEDULE),
      canEdit: RolePermissionManager.hasPermission(userRole, PERMISSIONS.UPDATE_SCHEDULE),
      canDelete: RolePermissionManager.hasPermission(userRole, PERMISSIONS.DELETE_SCHEDULE),
      canBatchEdit: RolePermissionManager.hasPermission(userRole, PERMISSIONS.BATCH_ADJUST_TIME)
    };
    
    this.setData({ permissions });
    
    // 如果没有查看权限，跳转到无权限页面
    if (!permissions.canView) {
      wx.redirectTo({
        url: '/pages/error/error?type=permission'
      });
      return;
    }
  },

  // ============ 数据初始化 ============
  
  /**
   * 初始化页面数据
   */
  initPageData() {
    // 从缓存恢复筛选条件
    const cachedFilters = wx.getStorageSync('schedule_filters');
    if (cachedFilters) {
      this.setData({
        currentFilters: {
          ...this.data.currentFilters,
          ...cachedFilters
        }
      });
    }
    
    // 初始化快捷筛选标签状态
    this.updateQuickFilters();
  },

  /**
   * 设置状态监听
   */
  setupStoreListeners() {
    // 监听日程状态变化
    this.scheduleUnsubscribe = scheduleStore.subscribe((state) => {
      this.setData({
        scheduleList: state.scheduleList,
        loading: state.loading
      });
      
      // 应用当前筛选条件
      this.applyFilters();
      
      // 更新统计信息
      this.updateScheduleStats();
    });
    
    // 监听用户状态变化
    this.userUnsubscribe = userStore.subscribe((state) => {
      if (state.userInfo) {
        this.checkPermissions();
      }
    });
  },

  /**
   * 移除状态监听
   */
  removeStoreListeners() {
    // 清理监听器
    try {
      if (this.scheduleUnsubscribe && typeof this.scheduleUnsubscribe === 'function') {
        this.scheduleUnsubscribe();
        this.scheduleUnsubscribe = null;
      }
      
      if (this.userUnsubscribe && typeof this.userUnsubscribe === 'function') {
        this.userUnsubscribe();
        this.userUnsubscribe = null;
      }
    } catch (error) {
      console.error('移除状态监听器失败:', error);
    }
  },

  /**
   * 清理定时器
   */
  clearTimers() {
    // 清理所有定时器
    if (this.statsUpdateTimer) {
      clearInterval(this.statsUpdateTimer);
    }
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  },

  // ============ 数据加载 ============
  
  /**
   * 加载日程列表
   */
  async loadScheduleList() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // 重置分页
      const pagination = {
        page: 1,
        pageSize: 20,
        total: 0,
        hasMore: true
      };
      
      this.setData({ pagination });
      
      // 调用加载数据的方法
      await this.fetchScheduleData();
      
    } catch (error) {
      console.error('加载日程列表失败:', error);
      ErrorHandler.showError('加载日程列表失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新日程列表
   */
  async refreshScheduleList() {
    try {
      console.log('刷新日程列表');
      await this.loadScheduleList();
    } catch (error) {
      console.error('刷新日程列表失败:', error);
      ErrorHandler.showError('刷新失败');
    }
  },

  /**
   * 加载更多日程
   */
  async loadMoreSchedules() {
    if (this.data.loadingMore || !this.data.pagination.hasMore) return;
    
    this.setData({ loadingMore: true });
    
    try {
      const nextPage = this.data.pagination.page + 1;
      
      this.setData({
        'pagination.page': nextPage
      });
      
      await this.fetchScheduleData(true); // appendMode = true
      
    } catch (error) {
      console.error('加载更多日程失败:', error);
      ErrorHandler.showError('加载更多失败');
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  /**
   * 获取日程数据
   */
  async fetchScheduleData(appendMode = false) {
    // TODO: 实现真实的API调用
    // 现在使用模拟数据
    const mockData = this.generateMockScheduleData();
    
    if (appendMode) {
      // 追加模式
      const currentList = this.data.scheduleList;
      this.setData({
        scheduleList: [...currentList, ...mockData.list]
      });
    } else {
      // 替换模式
      this.setData({
        scheduleList: mockData.list
      });
    }
    
    // 更新分页信息
    this.setData({
      'pagination.total': mockData.total,
      'pagination.hasMore': mockData.hasMore
    });
    
    // 应用筛选
    this.applyFilters();
    
    // 更新状态存储
    scheduleStore.setState({
      scheduleList: this.data.scheduleList
    });
  },

  /**
   * 生成模拟日程数据
   */
  generateMockScheduleData() {
    const scheduleList = [];
    const now = new Date();
    
    // 生成20条模拟数据
    for (let i = 0; i < 20; i++) {
      const startTime = new Date(now.getTime() + (i - 5) * 24 * 60 * 60 * 1000 + Math.random() * 8 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (1 + Math.random() * 2) * 60 * 60 * 1000);
      
      const statuses = Object.values(CONSTANTS.SCHEDULE_STATUS);
      const types = Object.values(CONSTANTS.SCHEDULE_TYPES);
      const priorities = Object.values(CONSTANTS.PRIORITY_LEVELS);
      
      scheduleList.push({
        id: `schedule_${i + 1}`,
        patientId: `patient_${Math.floor(Math.random() * 10) + 1}`,
        patientName: ['张老太', '李大爷', '王阿姨', '陈爷爷', '刘奶奶'][Math.floor(Math.random() * 5)],
        serviceName: ['血压测量', '康复训练', '糖尿病护理', '伤口换药', '健康咨询'][Math.floor(Math.random() * 5)],
        serviceType: types[Math.floor(Math.random() * types.length)],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        address: '北京市朝阳区某某小区',
        distance: Math.floor(Math.random() * 20) + 1,
        estimatedDuration: Math.floor(Math.random() * 120) + 30,
        cost: Math.floor(Math.random() * 200) + 50,
        notes: '备注信息',
        createTime: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return {
      list: scheduleList,
      total: 156,
      hasMore: this.data.pagination.page < 8
    };
  },

  // ============ 筛选和排序功能 ============

  /**
   * 应用筛选条件
   */
  applyFilters() {
    const { scheduleList, currentFilters } = this.data;
    
    let filteredList = [...scheduleList];
    
    // 时间筛选
    if (currentFilters.time !== CONSTANTS.FILTER_TYPES.ALL) {
      filteredList = this.filterByTime(filteredList, currentFilters.time);
    }
    
    // 状态筛选
    if (currentFilters.status !== 'all') {
      filteredList = filteredList.filter(item => item.status === currentFilters.status);
    }
    
    // 类型筛选
    if (currentFilters.type !== 'all') {
      filteredList = filteredList.filter(item => item.serviceType === currentFilters.type);
    }
    
    // 优先级筛选
    if (currentFilters.priority !== 'all') {
      filteredList = filteredList.filter(item => item.priority === currentFilters.priority);
    }
    
    // 关键字搜索
    if (currentFilters.keyword) {
      const keyword = currentFilters.keyword.toLowerCase();
      filteredList = filteredList.filter(item => 
        item.patientName.toLowerCase().includes(keyword) ||
        item.serviceName.toLowerCase().includes(keyword) ||
        item.address.toLowerCase().includes(keyword)
      );
    }
    
    // 应用排序
    filteredList = this.sortScheduleList(filteredList, currentFilters.sort);
    
    this.setData({ 
      filteredScheduleList: filteredList,
      hasActiveFilters: this.hasActiveFilters()
    });
  },

  /**
   * 按时间筛选
   */
  filterByTime(list, timeFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return list.filter(item => {
      const startTime = new Date(item.startTime);
      
      switch (timeFilter) {
        case CONSTANTS.FILTER_TYPES.TODAY:
          return startTime >= today && startTime < tomorrow;
        case CONSTANTS.FILTER_TYPES.TOMORROW:
          return startTime >= tomorrow && startTime < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        case CONSTANTS.FILTER_TYPES.THIS_WEEK:
          return startTime >= weekStart && startTime < weekEnd;
        case CONSTANTS.FILTER_TYPES.OVERDUE:
          return startTime < now && item.status !== CONSTANTS.SCHEDULE_STATUS.COMPLETED;
        default:
          return true;
      }
    });
  },

  /**
   * 排序日程列表
   */
  sortScheduleList(list, sortType) {
    return list.sort((a, b) => {
      switch (sortType) {
        case CONSTANTS.SORT_TYPES.TIME_ASC:
          return new Date(a.startTime) - new Date(b.startTime);
        case CONSTANTS.SORT_TYPES.TIME_DESC:
          return new Date(b.startTime) - new Date(a.startTime);
        case CONSTANTS.SORT_TYPES.PRIORITY_DESC:
          return this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
        case CONSTANTS.SORT_TYPES.PRIORITY_ASC:
          return this.getPriorityValue(a.priority) - this.getPriorityValue(b.priority);
        case CONSTANTS.SORT_TYPES.PATIENT_NAME_ASC:
          return a.patientName.localeCompare(b.patientName);
        case CONSTANTS.SORT_TYPES.PATIENT_NAME_DESC:
          return b.patientName.localeCompare(a.patientName);
        case CONSTANTS.SORT_TYPES.DISTANCE_ASC:
          return a.distance - b.distance;
        case CONSTANTS.SORT_TYPES.DISTANCE_DESC:
          return b.distance - a.distance;
        default:
          return 0;
      }
    });
  },

  /**
   * 获取优先级数值
   */
  getPriorityValue(priority) {
    const priorityMap = {
      [CONSTANTS.PRIORITY_LEVELS.LOW]: 1,
      [CONSTANTS.PRIORITY_LEVELS.NORMAL]: 2,
      [CONSTANTS.PRIORITY_LEVELS.HIGH]: 3,
      [CONSTANTS.PRIORITY_LEVELS.URGENT]: 4
    };
    return priorityMap[priority] || 0;
  },

  /**
   * 检查是否有活跃的筛选条件
   */
  hasActiveFilters() {
    const filters = this.data.currentFilters;
    return filters.time !== CONSTANTS.FILTER_TYPES.ALL ||
           filters.status !== 'all' ||
           filters.type !== 'all' ||
           filters.priority !== 'all' ||
           filters.patient !== 'all' ||
           filters.keyword !== '';
  },

  /**
   * 更新统计信息
   */
  updateScheduleStats() {
    const { scheduleList } = this.data;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const stats = {
      total: scheduleList.length,
      pending: scheduleList.filter(item => item.status === CONSTANTS.SCHEDULE_STATUS.PENDING).length,
      today: scheduleList.filter(item => {
        const startTime = new Date(item.startTime);
        return startTime >= today && startTime < tomorrow;
      }).length,
      overdue: scheduleList.filter(item => {
        const startTime = new Date(item.startTime);
        return startTime < now && item.status !== CONSTANTS.SCHEDULE_STATUS.COMPLETED;
      }).length,
      completed: scheduleList.filter(item => item.status === CONSTANTS.SCHEDULE_STATUS.COMPLETED).length
    };
    
    this.setData({ scheduleStats: stats });
    
    // 更新快捷筛选标签的计数
    this.updateQuickFilters();
  },

  /**
   * 更新快捷筛选标签
   */
  updateQuickFilters() {
    const { scheduleList, currentFilters } = this.data;
    const now = new Date();
    
    const quickFilters = this.data.quickFilters.map(filter => {
      let count = 0;
      const timeFilteredList = this.filterByTime(scheduleList, filter.key);
      count = timeFilteredList.length;
      
      return {
        ...filter,
        count,
        active: currentFilters.time === filter.key
      };
    });
    
    this.setData({ quickFilters });
  },

  // ============ 用户交互事件 ============

  /**
   * 日程卡片点击
   */
  onScheduleTap(e) {
    if (this.data.batchMode) {
      return; // 批量模式下不响应卡片点击
    }
    
    const schedule = e.currentTarget.dataset.schedule;
    console.log('点击日程卡片:', schedule);
    
    // 跳转到日程详情页
    wx.navigateTo({
      url: `/pages/schedule-detail/schedule-detail?id=${schedule.id}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 日程选择（批量模式）
   */
  onScheduleSelect(e) {
    const { scheduleId, selected } = e.detail;
    let selectedSchedules = [...this.data.selectedSchedules];
    
    if (selected) {
      if (!selectedSchedules.includes(scheduleId)) {
        selectedSchedules.push(scheduleId);
      }
    } else {
      selectedSchedules = selectedSchedules.filter(id => id !== scheduleId);
    }
    
    this.setData({
      selectedSchedules,
      allSelected: selectedSchedules.length === this.data.filteredScheduleList.length
    });
  },

  /**
   * 日程操作（编辑、删除等）
   */
  onScheduleAction(e) {
    const { action, schedule } = e.detail;
    console.log('日程操作:', action, schedule);
    
    switch (action) {
      case 'edit':
        this.editSchedule(schedule);
        break;
      case 'delete':
        this.deleteSchedule(schedule);
        break;
      case 'reschedule':
        this.rescheduleSchedule(schedule);
        break;
      default:
        console.warn('未知操作:', action);
    }
  },

  /**
   * 快捷筛选
   */
  onQuickFilter(e) {
    const filterKey = e.currentTarget.dataset.filter;
    console.log('快捷筛选:', filterKey);
    
    const currentFilters = {
      ...this.data.currentFilters,
      time: this.data.currentFilters.time === filterKey ? CONSTANTS.FILTER_TYPES.ALL : filterKey
    };
    
    this.setData({ currentFilters });
    
    // 缓存筛选条件
    wx.setStorageSync('schedule_filters', currentFilters);
    
    // 应用筛选
    this.applyFilters();
  },

  /**
   * 筛选器变化
   */
  onFilterChange(e) {
    const filters = e.detail;
    console.log('筛选器变化:', filters);
    
    this.setData({
      currentFilters: {
        ...this.data.currentFilters,
        ...filters
      }
    });
    
    // 缓存筛选条件
    wx.setStorageSync('schedule_filters', this.data.currentFilters);
    
    // 应用筛选
    this.applyFilters();
  },

  /**
   * 重置筛选器
   */
  onFilterReset() {
    console.log('重置筛选器');
    
    const defaultFilters = {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      keyword: ''
    };
    
    this.setData({ currentFilters: defaultFilters });
    
    // 清除缓存
    wx.removeStorageSync('schedule_filters');
    
    // 应用筛选
    this.applyFilters();
  },

  /**
   * 空状态操作
   */
  onEmptyAction() {
    if (this.data.hasActiveFilters) {
      // 清除筛选
      this.onFilterReset();
    } else {
      // 创建日程
      this.createSchedule();
    }
  },

  // ============ 界面控制 ============

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    const batchMode = !this.data.batchMode;
    console.log('切换批量模式:', batchMode);
    
    this.setData({
      batchMode,
      selectedSchedules: [],
      allSelected: false
    });
    
    if (!batchMode) {
      // 退出批量模式时的清理工作
      console.log('退出批量模式');
    }
  },

  /**
   * 退出批量模式
   */
  exitBatchMode() {
    this.setData({
      batchMode: false,
      selectedSchedules: [],
      allSelected: false
    });
  },

  /**
   * 切换全选
   */
  toggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const selectedSchedules = allSelected ? 
      this.data.filteredScheduleList.map(item => item.id) : [];
    
    this.setData({
      allSelected,
      selectedSchedules
    });
  },

  /**
   * 显示/隐藏筛选器
   */
  toggleFilter() {
    const showFilter = !this.data.showFilter;
    console.log('切换筛选器显示:', showFilter);
    
    this.setData({ showFilter });
  },

  /**
   * 隐藏筛选器
   */
  hideFilter() {
    this.setData({ showFilter: false });
  },

  /**
   * 显示自定义筛选
   */
  showCustomFilter() {
    console.log('显示自定义筛选');
    this.setData({ showFilter: true });
  },

  /**
   * 切换浮动按钮
   */
  toggleFab() {
    const fabExpanded = !this.data.fabExpanded;
    this.setData({ fabExpanded });
  },

  /**
   * 浮动按钮操作
   */
  onFabAction(e) {
    const action = e.currentTarget.dataset.action;
    console.log('浮动按钮操作:', action);
    
    // 收起浮动按钮
    this.setData({ fabExpanded: false });
    
    switch (action) {
      case 'create':
        this.createSchedule();
        break;
      case 'sync':
        this.syncSchedule();
        break;
      case 'export':
        this.exportSchedule();
        break;
    }
  },

  /**
   * 显示更多菜单
   */
  showMoreMenu() {
    this.setData({ showMoreMenu: true });
  },

  /**
   * 隐藏更多菜单
   */
  hideMoreMenu() {
    this.setData({ showMoreMenu: false });
  },

  // ============ 业务操作 ============

  /**
   * 创建日程
   */
  createSchedule() {
    console.log('创建日程');
    
    if (!this.data.permissions.canCreate) {
      wx.showToast({
        title: '没有创建权限',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到日程创建表单页面
    wx.navigateTo({
      url: '/pages/schedule-form/schedule-form?mode=create',
      fail: (err) => {
        console.error('跳转到日程表单失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 编辑日程
   */
  editSchedule(schedule) {
    console.log('编辑日程:', schedule);
    
    wx.navigateTo({
      url: `/pages/schedule-form/schedule-form?mode=edit&id=${schedule.id}`
    });
  },

  /**
   * 删除日程
   */
  deleteSchedule(schedule) {
    console.log('删除日程:', schedule);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${schedule.serviceName}"日程吗？`,
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用删除API
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 刷新列表
          this.refreshScheduleList();
        }
      }
    });
  },

  /**
   * 重新安排日程
   */
  rescheduleSchedule(schedule) {
    console.log('重新安排日程:', schedule);
    
    wx.navigateTo({
      url: `/pages/time-adjust/time-adjust?scheduleId=${schedule.id}`
    });
  },

  /**
   * 批量改期
   */
  batchReschedule() {
    const { selectedSchedules } = this.data;
    if (selectedSchedules.length === 0) return;
    
    console.log('批量改期:', selectedSchedules);
    
    wx.navigateTo({
      url: `/pages/batch-adjust/batch-adjust?scheduleIds=${selectedSchedules.join(',')}`
    });
  },

  /**
   * 批量取消
   */
  batchCancel() {
    const { selectedSchedules } = this.data;
    if (selectedSchedules.length === 0) return;
    
    console.log('批量取消:', selectedSchedules);
    
    wx.showModal({
      title: '确认取消',
      content: `确定要取消选中的${selectedSchedules.length}个日程吗？`,
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用批量取消API
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          });
          
          // 退出批量模式并刷新列表
          this.exitBatchMode();
          this.refreshScheduleList();
        }
      }
    });
  },

  /**
   * 同步日程
   */
  syncSchedule() {
    console.log('同步日程');
    
    wx.showLoading({
      title: '同步中...'
    });
    
    // TODO: 实现真实的同步逻辑
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '同步完成',
        icon: 'success'
      });
      
      this.refreshScheduleList();
    }, 2000);
  },

  /**
   * 导出日程
   */
  exportSchedule() {
    console.log('导出日程');
    
    wx.showActionSheet({
      itemList: ['导出为Excel', '导出为PDF', '发送到邮箱'],
      success: (res) => {
        const actions = ['excel', 'pdf', 'email'];
        const action = actions[res.tapIndex];
        
        console.log('导出方式:', action);
        
        // TODO: 实现导出功能
        wx.showToast({
          title: '导出功能开发中',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 日程设置
   */
  scheduleSettings() {
    console.log('日程设置');
    
    this.hideMoreMenu();
    
    wx.navigateTo({
      url: '/pages/schedule-settings/schedule-settings'
    });
  }
});