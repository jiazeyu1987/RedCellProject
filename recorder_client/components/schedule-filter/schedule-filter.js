const CONSTANTS = require('../../constants/constants');

/**
 * 日程筛选器组件
 * 用于筛选和排序日程列表
 */
Component({
  properties: {
    // 当前筛选条件
    filters: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.updateFiltersDisplay(newVal);
      }
    },
    
    // 是否显示筛选器
    visible: {
      type: Boolean,
      value: false
    },
    
    // 可用的患者列表（用于患者筛选）
    patientList: {
      type: Array,
      value: []
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    }
  },

  data: {
    // 筛选选项
    filterOptions: {
      // 时间筛选
      timeFilters: [
        { key: CONSTANTS.FILTER_TYPES.ALL, label: '全部', icon: '📅' },
        { key: CONSTANTS.FILTER_TYPES.TODAY, label: '今日', icon: '📍' },
        { key: CONSTANTS.FILTER_TYPES.TOMORROW, label: '明日', icon: '➡️' },
        { key: CONSTANTS.FILTER_TYPES.THIS_WEEK, label: '本周', icon: '📊' },
        { key: CONSTANTS.FILTER_TYPES.NEXT_WEEK, label: '下周', icon: '⏭️' },
        { key: CONSTANTS.FILTER_TYPES.OVERDUE, label: '已过期', icon: '⚠️' }
      ],
      
      // 状态筛选
      statusFilters: [
        { key: 'all', label: '全部状态', icon: '🔄' },
        { key: CONSTANTS.SCHEDULE_STATUS.PENDING, label: '待服务', icon: '⏳' },
        { key: CONSTANTS.SCHEDULE_STATUS.CONFIRMED, label: '已确认', icon: '✅' },
        { key: CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS, label: '服务中', icon: '🔄' },
        { key: CONSTANTS.SCHEDULE_STATUS.COMPLETED, label: '已完成', icon: '✓' },
        { key: CONSTANTS.SCHEDULE_STATUS.CANCELLED, label: '已取消', icon: '❌' },
        { key: CONSTANTS.SCHEDULE_STATUS.NO_SHOW, label: '患者不在家', icon: '🚪' }
      ],
      
      // 类型筛选
      typeFilters: [
        { key: 'all', label: '全部类型', icon: '📋' },
        { key: CONSTANTS.SCHEDULE_TYPES.REGULAR, label: '常规服务', icon: '🏥' },
        { key: CONSTANTS.SCHEDULE_TYPES.EMERGENCY, label: '紧急服务', icon: '🚨' },
        { key: CONSTANTS.SCHEDULE_TYPES.FOLLOW_UP, label: '复诊服务', icon: '🔄' },
        { key: CONSTANTS.SCHEDULE_TYPES.INITIAL, label: '初诊服务', icon: '🆕' },
        { key: CONSTANTS.SCHEDULE_TYPES.CONSULTATION, label: '咨询服务', icon: '💬' }
      ],
      
      // 优先级筛选
      priorityFilters: [
        { key: 'all', label: '全部优先级', icon: '⚖️' },
        { key: CONSTANTS.PRIORITY_LEVELS.URGENT, label: '紧急', icon: '🔥' },
        { key: CONSTANTS.PRIORITY_LEVELS.HIGH, label: '高', icon: '⬆️' },
        { key: CONSTANTS.PRIORITY_LEVELS.NORMAL, label: '普通', icon: '➡️' },
        { key: CONSTANTS.PRIORITY_LEVELS.LOW, label: '低', icon: '⬇️' }
      ],
      
      // 排序选项
      sortOptions: [
        { key: CONSTANTS.SORT_TYPES.TIME_ASC, label: '时间升序(最近优先)', icon: '⏰', category: 'time' },
        { key: CONSTANTS.SORT_TYPES.TIME_DESC, label: '时间降序(最远优先)', icon: '⏰', category: 'time' },
        { key: CONSTANTS.SORT_TYPES.PRIORITY_DESC, label: '优先级降序(高到低)', icon: '🔥', category: 'priority' },
        { key: CONSTANTS.SORT_TYPES.PRIORITY_ASC, label: '优先级升序(低到高)', icon: '⬆️', category: 'priority' },
        { key: CONSTANTS.SORT_TYPES.STATUS_ASC, label: '状态升序', icon: '📊', category: 'status' },
        { key: CONSTANTS.SORT_TYPES.STATUS_DESC, label: '状态降序', icon: '📊', category: 'status' },
        { key: CONSTANTS.SORT_TYPES.PATIENT_NAME_ASC, label: '患者姓名A-Z', icon: '👤', category: 'name' },
        { key: CONSTANTS.SORT_TYPES.PATIENT_NAME_DESC, label: '患者姓名Z-A', icon: '👤', category: 'name' },
        { key: CONSTANTS.SORT_TYPES.SERVICE_TYPE_ASC, label: '服务类型升序', icon: '🏥', category: 'type' },
        { key: CONSTANTS.SORT_TYPES.SERVICE_TYPE_DESC, label: '服务类型降序', icon: '🏥', category: 'type' },
        { key: CONSTANTS.SORT_TYPES.DISTANCE_ASC, label: '距离升序(最近)', icon: '📏', category: 'distance' },
        { key: CONSTANTS.SORT_TYPES.DISTANCE_DESC, label: '距离降序(最远)', icon: '📏', category: 'distance' },
        { key: CONSTANTS.SORT_TYPES.DURATION_ASC, label: '服务时长升序', icon: '⏱️', category: 'duration' },
        { key: CONSTANTS.SORT_TYPES.DURATION_DESC, label: '服务时长降序', icon: '⏱️', category: 'duration' },
        { key: CONSTANTS.SORT_TYPES.COST_ASC, label: '费用升序(低到高)', icon: '💰', category: 'cost' },
        { key: CONSTANTS.SORT_TYPES.COST_DESC, label: '费用降序(高到低)', icon: '💰', category: 'cost' }
      ]
    },
    
    // 当前活动的筛选标签
    activeFilters: {
      time: CONSTANTS.FILTER_TYPES.ALL,
      status: 'all',
      type: 'all',
      priority: 'all',
      patient: 'all',
      sort: CONSTANTS.SORT_TYPES.TIME_ASC,
      // 高级筛选条件
      duration: { min: 0, max: 999 }, // 服务时长筛选（分钟）
      distance: { min: 0, max: 100 }, // 距离筛选（公里）
      cost: { min: 0, max: 9999 },    // 费用筛选（元）
      noteKeyword: '',                // 备注关键字
      tags: [],                       // 标签筛选
      createTimeRange: {              // 创建时间范围
        startDate: '',
        endDate: ''
      }
    },
    
    // 自定义日期范围
    customDateRange: {
      startDate: '',
      endDate: ''
    },
    
    // 搜索关键字
    searchKeyword: '',
    
    // 显示的筛选面板
    activePanel: '', // time, status, type, priority, patient, sort, search, advanced
    
    // 高级筛选状态
    showAdvancedFilters: false,
    
    // 排序组合设置
    sortCombination: {
      primary: CONSTANTS.SORT_TYPES.TIME_ASC,
      secondary: '',
      tertiary: ''
    },
    
    // 筛选条件缓存
    filterCache: [],
    
    // 筛选历史
    filterHistory: [],
    
    // 智能推荐
    recommendedFilters: []
  },

  methods: {
    /**
     * 更新筛选条件显示
     */
    updateFiltersDisplay(filters) {
      if (!filters) return;
      
      const activeFilters = {
        time: filters.time || CONSTANTS.FILTER_TYPES.ALL,
        status: filters.status || 'all',
        type: filters.type || 'all',
        priority: filters.priority || 'all',
        patient: filters.patient || 'all',
        sort: filters.sort || CONSTANTS.SORT_TYPES.TIME_ASC
      };
      
      this.setData({
        activeFilters,
        searchKeyword: filters.keyword || '',
        customDateRange: {
          startDate: filters.startDate || '',
          endDate: filters.endDate || ''
        }
      });
    },

    /**
     * 显示筛选器
     */
    show() {
      this.setData({
        visible: true
      });
    },

    /**
     * 隐藏筛选器
     */
    hide() {
      this.setData({
        visible: false,
        activePanel: ''
      });
    },

    /**
     * 切换筛选面板
     */
    togglePanel(e) {
      const panel = e.currentTarget.dataset.panel;
      const activePanel = this.data.activePanel === panel ? '' : panel;
      
      this.setData({
        activePanel
      });
    },

    /**
     * 选择筛选选项
     */
    selectFilter(e) {
      const { type, value } = e.currentTarget.dataset;
      const activeFilters = { ...this.data.activeFilters };
      activeFilters[type] = value;
      
      this.setData({
        activeFilters,
        activePanel: '' // 关闭面板
      });
      
      this.applyFilters();
    },

    /**
     * 搜索输入
     */
    onSearchInput(e) {
      const keyword = e.detail.value;
      this.setData({
        searchKeyword: keyword
      });
    },

    /**
     * 搜索确认
     */
    onSearchConfirm() {
      this.applyFilters();
    },

    /**
     * 清空搜索
     */
    clearSearch() {
      this.setData({
        searchKeyword: ''
      });
      this.applyFilters();
    },

    /**
     * 自定义日期范围选择
     */
    onCustomDateChange(e) {
      const { type } = e.currentTarget.dataset;
      const date = e.detail.value;
      
      const customDateRange = { ...this.data.customDateRange };
      customDateRange[type] = date;
      
      this.setData({
        customDateRange
      });
      
      // 如果选择了自定义日期范围，自动应用
      if (customDateRange.startDate && customDateRange.endDate) {
        const activeFilters = { ...this.data.activeFilters };
        activeFilters.time = 'custom';
        
        this.setData({
          activeFilters
        });
        
        this.applyFilters();
      }
    },

    /**
     * 应用筛选条件
     */
    applyFilters() {
      const filters = {
        ...this.data.activeFilters,
        keyword: this.data.searchKeyword
      };
      
      // 如果是自定义日期范围
      if (filters.time === 'custom') {
        filters.startDate = this.data.customDateRange.startDate;
        filters.endDate = this.data.customDateRange.endDate;
      }
      
      this.triggerEvent('filter', { filters });
    },

    /**
     * 重置筛选条件
     */
    resetFilters() {
      const activeFilters = {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC
      };
      
      this.setData({
        activeFilters,
        searchKeyword: '',
        customDateRange: {
          startDate: '',
          endDate: ''
        },
        activePanel: ''
      });
      
      this.applyFilters();
    },

    /**
     * 快速筛选（常用组合）
     */
    quickFilter(e) {
      const type = e.currentTarget.dataset.type;
      let activeFilters = { ...this.data.activeFilters };
      
      switch (type) {
        case 'today_pending':
          activeFilters.time = CONSTANTS.FILTER_TYPES.TODAY;
          activeFilters.status = CONSTANTS.SCHEDULE_STATUS.PENDING;
          break;
          
        case 'urgent_all':
          activeFilters.priority = CONSTANTS.PRIORITY_LEVELS.URGENT;
          activeFilters.status = 'all';
          break;
          
        case 'overdue':
          activeFilters.time = CONSTANTS.FILTER_TYPES.OVERDUE;
          break;
          
        case 'emergency':
          activeFilters.type = CONSTANTS.SCHEDULE_TYPES.EMERGENCY;
          activeFilters.sort = CONSTANTS.SORT_TYPES.TIME_ASC;
          break;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },

    /**
     * 获取活跃筛选器数量
     */
    getActiveFilterCount() {
      const { activeFilters, searchKeyword } = this.data;
      let count = 0;
      
      if (activeFilters.time !== CONSTANTS.FILTER_TYPES.ALL) count++;
      if (activeFilters.status !== 'all') count++;
      if (activeFilters.type !== 'all') count++;
      if (activeFilters.priority !== 'all') count++;
      if (activeFilters.patient !== 'all') count++;
      if (searchKeyword) count++;
      
      return count;
    },
    
    /**
     * 高级排序设置
     */
    setupAdvancedSort() {
      this.setData({
        activePanel: 'advanced_sort'
      });
    },
    
    /**
     * 设置排序组合
     */
    setSortCombination(e) {
      const { level, value } = e.currentTarget.dataset;
      const sortCombination = { ...this.data.sortCombination };
      
      if (level === 'primary') {
        sortCombination.primary = value;
      } else if (level === 'secondary') {
        sortCombination.secondary = value;
      } else if (level === 'tertiary') {
        sortCombination.tertiary = value;
      }
      
      this.setData({
        sortCombination
      });
      
      // 应用组合排序
      this.applyCombinedSort();
    },
    
    /**
     * 应用组合排序
     */
    applyCombinedSort() {
      const combination = this.data.sortCombination;
      const activeFilters = { ...this.data.activeFilters };
      
      // 传递组合排序信息
      activeFilters.sortCombination = combination;
      activeFilters.sort = 'combined'; // 标记为组合排序
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 保存筛选条件为模板
     */
    saveFilterTemplate(e) {
      const name = e.detail.value;
      if (!name.trim()) {
        wx.showToast({
          title: '请输入模板名称',
          icon: 'none'
        });
        return;
      }
      
      const template = {
        name: name.trim(),
        filters: { ...this.data.activeFilters },
        keyword: this.data.searchKeyword,
        createTime: new Date().toISOString()
      };
      
      // 保存到本地存储
      try {
        const templates = wx.getStorageSync('filter_templates') || [];
        templates.push(template);
        wx.setStorageSync('filter_templates', templates);
        
        wx.showToast({
          title: '模板已保存',
          icon: 'success'
        });
        
        this.loadFilterTemplates();
        
      } catch (error) {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    },
    
    /**
     * 加载筛选模板
     */
    loadFilterTemplates() {
      try {
        const templates = wx.getStorageSync('filter_templates') || [];
        this.setData({
          filterCache: templates
        });
      } catch (error) {
        console.error('加载筛选模板失败:', error);
      }
    },
    
    /**
     * 应用筛选模板
     */
    applyFilterTemplate(e) {
      const index = e.currentTarget.dataset.index;
      const template = this.data.filterCache[index];
      
      if (!template) return;
      
      this.setData({
        activeFilters: { ...template.filters },
        searchKeyword: template.keyword || ''
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: `已应用模板：${template.name}`,
        icon: 'success'
      });
    },
    
    /**
     * 删除筛选模板
     */
    deleteFilterTemplate(e) {
      const index = e.currentTarget.dataset.index;
      const template = this.data.filterCache[index];
      
      wx.showModal({
        title: '确认删除',
        content: `确定要删除模板「${template.name}」吗？`,
        success: (res) => {
          if (res.confirm) {
            const templates = [...this.data.filterCache];
            templates.splice(index, 1);
            
            try {
              wx.setStorageSync('filter_templates', templates);
              this.setData({
                filterCache: templates
              });
              
              wx.showToast({
                title: '已删除',
                icon: 'success'
              });
            } catch (error) {
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },
    
    /**
     * 智能筛选推荐
     */
    getSmartRecommendations() {
      // 模拟智能推荐功能
      const recommendations = [
        {
          name: '今日紧急任务',
          filters: {
            time: CONSTANTS.FILTER_TYPES.TODAY,
            priority: CONSTANTS.PRIORITY_LEVELS.URGENT,
            status: 'all'
          },
          reason: '根据优先级推荐'
        },
        {
          name: '待处理任务',
          filters: {
            status: CONSTANTS.SCHEDULE_STATUS.PENDING,
            time: 'all'
          },
          reason: '根据状态推荐'
        },
        {
          name: '即将过期',
          filters: {
            time: CONSTANTS.FILTER_TYPES.OVERDUE,
            status: CONSTANTS.SCHEDULE_STATUS.PENDING
          },
          reason: '根据时间推荐'
        }
      ];
      
      this.setData({
        recommendedFilters: recommendations
      });
    },
    
    /**
     * 应用推荐筛选
     */
    applyRecommendedFilter(e) {
      const index = e.currentTarget.dataset.index;
      const recommendation = this.data.recommendedFilters[index];
      
      if (!recommendation) return;
      
      const activeFilters = {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC,
        ...recommendation.filters
      };
      
      this.setData({
        activeFilters,
        searchKeyword: ''
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: `已应用：${recommendation.name}`,
        icon: 'success'
      });
    },
    
    /**
     * 设置服务时长筛选范围
     */
    setDurationFilter(e) {
      const { type } = e.currentTarget.dataset;
      const value = parseInt(e.detail.value) || 0;
      const activeFilters = { ...this.data.activeFilters };
      
      if (type === 'min') {
        activeFilters.duration.min = value;
      } else if (type === 'max') {
        activeFilters.duration.max = value;
      }
      
      // 验证范围合理性
      if (activeFilters.duration.min > activeFilters.duration.max) {
        wx.showToast({
          title: '最小值不能大于最大值',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 设置距离筛选范围
     */
    setDistanceFilter(e) {
      const { type } = e.currentTarget.dataset;
      const value = parseFloat(e.detail.value) || 0;
      const activeFilters = { ...this.data.activeFilters };
      
      if (type === 'min') {
        activeFilters.distance.min = value;
      } else if (type === 'max') {
        activeFilters.distance.max = value;
      }
      
      // 验证范围合理性
      if (activeFilters.distance.min > activeFilters.distance.max) {
        wx.showToast({
          title: '最小距离不能大于最大距离',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 设置费用筛选范围
     */
    setCostFilter(e) {
      const { type } = e.currentTarget.dataset;
      const value = parseFloat(e.detail.value) || 0;
      const activeFilters = { ...this.data.activeFilters };
      
      if (type === 'min') {
        activeFilters.cost.min = value;
      } else if (type === 'max') {
        activeFilters.cost.max = value;
      }
      
      // 验证范围合理性
      if (activeFilters.cost.min > activeFilters.cost.max) {
        wx.showToast({
          title: '最小金额不能大于最大金额',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 设置备注关键字筛选
     */
    setNoteKeywordFilter(e) {
      const keyword = e.detail.value.trim();
      const activeFilters = { ...this.data.activeFilters };
      activeFilters.noteKeyword = keyword;
      
      this.setData({
        activeFilters
      });
      
      // 延迟搜索，减少频繁调用
      clearTimeout(this.noteSearchTimer);
      this.noteSearchTimer = setTimeout(() => {
        this.applyFilters();
      }, 500);
    },
    
    /**
     * 设置创建时间范围
     */
    setCreateTimeRange(e) {
      const { type } = e.currentTarget.dataset;
      const date = e.detail.value;
      const activeFilters = { ...this.data.activeFilters };
      
      if (type === 'start') {
        activeFilters.createTimeRange.startDate = date;
      } else if (type === 'end') {
        activeFilters.createTimeRange.endDate = date;
      }
      
      // 验证日期范围合理性
      if (activeFilters.createTimeRange.startDate && 
          activeFilters.createTimeRange.endDate &&
          new Date(activeFilters.createTimeRange.startDate) > new Date(activeFilters.createTimeRange.endDate)) {
        wx.showToast({
          title: '开始日期不能晚于结束日期',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 切换标签筛选
     */
    toggleTagFilter(e) {
      const tag = e.currentTarget.dataset.tag;
      const activeFilters = { ...this.data.activeFilters };
      const tags = [...activeFilters.tags];
      
      const index = tags.indexOf(tag);
      if (index > -1) {
        tags.splice(index, 1); // 移除标签
      } else {
        tags.push(tag); // 添加标签
      }
      
      activeFilters.tags = tags;
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 快速设置服务时长筛选
     */
    quickSetDuration(e) {
      const type = e.currentTarget.dataset.type;
      const activeFilters = { ...this.data.activeFilters };
      
      switch (type) {
        case 'short':
          activeFilters.duration = { min: 0, max: 30 };
          break;
        case 'medium':
          activeFilters.duration = { min: 30, max: 90 };
          break;
        case 'long':
          activeFilters.duration = { min: 90, max: 999 };
          break;
        case 'reset':
          activeFilters.duration = { min: 0, max: 999 };
          break;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: '已设置时长筛选',
        icon: 'success'
      });
    },
    
    /**
     * 快速设置距离筛选
     */
    quickSetDistance(e) {
      const type = e.currentTarget.dataset.type;
      const activeFilters = { ...this.data.activeFilters };
      
      switch (type) {
        case 'nearby':
          activeFilters.distance = { min: 0, max: 5 };
          break;
        case 'moderate':
          activeFilters.distance = { min: 5, max: 20 };
          break;
        case 'far':
          activeFilters.distance = { min: 20, max: 100 };
          break;
        case 'reset':
          activeFilters.distance = { min: 0, max: 100 };
          break;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: '已设置距离筛选',
        icon: 'success'
      });
    },
    
    /**
     * 快速设置费用筛选
     */
    quickSetCost(e) {
      const type = e.currentTarget.dataset.type;
      const activeFilters = { ...this.data.activeFilters };
      
      switch (type) {
        case 'low':
          activeFilters.cost = { min: 0, max: 200 };
          break;
        case 'medium':
          activeFilters.cost = { min: 200, max: 500 };
          break;
        case 'high':
          activeFilters.cost = { min: 500, max: 9999 };
          break;
        case 'reset':
          activeFilters.cost = { min: 0, max: 9999 };
          break;
      }
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: '已设置费用筛选',
        icon: 'success'
      });
    },
    
    /**
     * 组合筛选设置（多条件组合）
     */
    setCombinedFilters(filters) {
      const activeFilters = {
        time: CONSTANTS.FILTER_TYPES.ALL,
        status: 'all',
        type: 'all',
        priority: 'all',
        patient: 'all',
        sort: CONSTANTS.SORT_TYPES.TIME_ASC,
        duration: { min: 0, max: 999 },
        distance: { min: 0, max: 100 },
        cost: { min: 0, max: 9999 },
        noteKeyword: '',
        tags: [],
        createTimeRange: { startDate: '', endDate: '' },
        ...filters
      };
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
    },
    
    /**
     * 获取高级筛选条件数量
     */
    getAdvancedFilterCount() {
      const { activeFilters } = this.data;
      let count = 0;
      
      // 服务时长筛选
      if (activeFilters.duration.min > 0 || activeFilters.duration.max < 999) count++;
      
      // 距离筛选
      if (activeFilters.distance.min > 0 || activeFilters.distance.max < 100) count++;
      
      // 费用筛选
      if (activeFilters.cost.min > 0 || activeFilters.cost.max < 9999) count++;
      
      // 备注关键字
      if (activeFilters.noteKeyword) count++;
      
      // 标签筛选
      if (activeFilters.tags.length > 0) count++;
      
      // 创建时间范围
      if (activeFilters.createTimeRange.startDate || activeFilters.createTimeRange.endDate) count++;
      
      return count;
    },
    
    /**
     * 重置高级筛选条件
     */
    resetAdvancedFilters() {
      const activeFilters = { ...this.data.activeFilters };
      
      activeFilters.duration = { min: 0, max: 999 };
      activeFilters.distance = { min: 0, max: 100 };
      activeFilters.cost = { min: 0, max: 9999 };
      activeFilters.noteKeyword = '';
      activeFilters.tags = [];
      activeFilters.createTimeRange = { startDate: '', endDate: '' };
      
      this.setData({
        activeFilters
      });
      
      this.applyFilters();
      
      wx.showToast({
        title: '已重置高级筛选',
        icon: 'success'
      });
    }
  },
  
  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.loadFilterTemplates();
      this.getSmartRecommendations();
    }
  }
});