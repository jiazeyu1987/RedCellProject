Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前筛选条件
    filters: {
      type: Object,
      value: {}
    },
    // 是否显示
    visible: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 筛选选项配置
    filterOptions: {
      ageRange: [
        { value: 'child', label: '儿童(≤18岁)', icon: 'child', min: 0, max: 18 },
        { value: 'adult', label: '成人(19-59岁)', icon: 'adult', min: 19, max: 59 },
        { value: 'elderly', label: '老人(≥60岁)', icon: 'elderly', min: 60, max: 120 }
      ],
      gender: [
        { value: 'male', label: '男性', icon: 'man' },
        { value: 'female', label: '女性', icon: 'woman' }
      ],
      healthStatus: [
        { value: 'healthy', label: '健康', icon: 'heart', color: '#34c759' },
        { value: 'chronic', label: '慢性病', icon: 'medical', color: '#ff9500' },
        { value: 'critical', label: '重症', icon: 'warning', color: '#ff3b30' }
      ],
      serviceFrequency: [
        { value: 'daily', label: '每日服务', icon: 'clock', color: '#007AFF' },
        { value: 'weekly', label: '每周服务', icon: 'calendar', color: '#5856d6' },
        { value: 'monthly', label: '每月服务', icon: 'calendar', color: '#af52de' }
      ],
      // 新增筛选选项
      relationship: [
        { value: 'parent', label: '父母', icon: 'family' },
        { value: 'child', label: '子女', icon: 'child' },
        { value: 'spouse', label: '配偶', icon: 'heart' },
        { value: 'sibling', label: '兄弟姐妹', icon: 'people' },
        { value: 'grandparent', label: '祖父母', icon: 'elderly' },
        { value: 'other', label: '其他', icon: 'person' }
      ],
      priority: [
        { value: 'high', label: '高优先级', icon: 'warning', color: '#ff3b30' },
        { value: 'medium', label: '中优先级', icon: 'clock', color: '#ff9500' },
        { value: 'low', label: '低优先级', icon: 'circle', color: '#34c759' }
      ],
      serviceStatus: [
        { value: 'active', label: '活跃', icon: 'success', color: '#34c759' },
        { value: 'inactive', label: '非活跃', icon: 'pause', color: '#8e8e93' },
        { value: 'suspended', label: '暂停', icon: 'stop', color: '#ff9500' }
      ]
    },
    
    // 筛选分组标题
    filterGroups: [
      { key: 'ageRange', title: '年龄范围', icon: 'age', expanded: true },
      { key: 'gender', title: '性别', icon: 'gender', expanded: true },
      { key: 'healthStatus', title: '健康状态', icon: 'health', expanded: true },
      { key: 'serviceFrequency', title: '服务频率', icon: 'frequency', expanded: false },
      { key: 'relationship', title: '家庭关系', icon: 'family', expanded: false },
      { key: 'priority', title: '优先级', icon: 'priority', expanded: false },
      { key: 'serviceStatus', title: '服务状态', icon: 'status', expanded: false }
    ],
    
    // 已选择的筛选条件数量
    selectedCount: 0,
    
    // 折叠状态
    collapsed: {},
    
    // 高级筛选模式
    advancedMode: false,
    
    // 年龄范围筛选
    ageRangeFilter: {
      enabled: false,
      min: 0,
      max: 120,
      selectedMin: 0,
      selectedMax: 120
    },
    
    // 搜索关键词
    searchKeyword: '',
    
    // 筛选历史
    filterHistory: [],
    maxHistoryCount: 10
  },

  /**
   * 监听器
   */
  observers: {
    'filters': function(filters) {
      this.updateSelectedCount();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新已选择的筛选条件数量
     */
    updateSelectedCount() {
      const filters = this.data.filters || {};
      let count = 0;
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          count++;
        }
      });
      
      this.setData({ selectedCount: count });
    },

    /**
     * 筛选选项点击
     */
    onFilterOptionTap(event) {
      const { type, value } = event.currentTarget.dataset;
      
      // 添加触觉反馈
      wx.vibrateShort({
        type: 'light',
        fail: () => {}
      });
      
      this.triggerEvent('filterchange', { type, value });
    },

    /**
     * 清除所有筛选
     */
    onClearAll() {
      // 添加触觉反馈
      wx.vibrateShort({
        type: 'medium',
        fail: () => {}
      });
      
      this.triggerEvent('clear');
    },

    /**
     * 检查选项是否被选中
     */
    isOptionSelected(type, value) {
      const filters = this.data.filters || {};
      return filters[type] === value;
    },

    /**
     * 获取筛选组的选中数量
     */
    getGroupSelectedCount(groupKey) {
      const filters = this.data.filters || {};
      return filters[groupKey] ? 1 : 0;
    },

    /**
     * 折叠/展开筛选组
     */
    onGroupToggle(event) {
      const { group } = event.currentTarget.dataset;
      const collapsedKey = `collapsed_${group}`;
      
      this.setData({
        [collapsedKey]: !this.data[collapsedKey]
      });
    },

    /**
     * 快速筛选预设
     */
    onQuickFilter(event) {
      const { preset } = event.currentTarget.dataset;
      
      let filters = {};
      
      switch (preset) {
        case 'elderly_critical':
          filters = {
            ageRange: 'elderly',
            healthStatus: 'critical'
          };
          break;
        case 'daily_service':
          filters = {
            serviceFrequency: 'daily'
          };
          break;
        case 'healthy_adult':
          filters = {
            ageRange: 'adult',
            healthStatus: 'healthy'
          };
          break;
        case 'chronic_elderly':
          filters = {
            ageRange: 'elderly',
            healthStatus: 'chronic'
          };
          break;
        case 'high_priority':
          filters = {
            priority: 'high'
          };
          break;
        case 'family_core':
          filters = {
            relationship: 'parent'
          };
          break;
      }
      
      // 保存到筛选历史
      this.saveFilterHistory(filters);
      
      // 触发筛选变更事件
      Object.keys(filters).forEach(type => {
        this.triggerEvent('filterchange', { 
          type, 
          value: filters[type] 
        });
      });
    },

    /**
     * 切换高级筛选模式
     */
    onToggleAdvancedMode() {
      this.setData({
        advancedMode: !this.data.advancedMode
      });
    },

    /**
     * 年龄范围滑块变化
     */
    onAgeRangeChange(event) {
      const { value } = event.detail;
      
      this.setData({
        'ageRangeFilter.selectedMin': value[0],
        'ageRangeFilter.selectedMax': value[1]
      });
    },

    /**
     * 应用年龄范围筛选
     */
    onApplyAgeRange() {
      const { selectedMin, selectedMax } = this.data.ageRangeFilter;
      
      this.triggerEvent('filterchange', {
        type: 'ageRange',
        value: {
          min: selectedMin,
          max: selectedMax
        }
      });
    },

    /**
     * 搜索关键词输入
     */
    onSearchInput(event) {
      const keyword = event.detail.value;
      this.setData({ searchKeyword: keyword });
      
      // 防抖处理
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.triggerEvent('search', { keyword });
      }, 300);
    },

    /**
     * 保存筛选历史
     */
    saveFilterHistory(filters) {
      const history = [...this.data.filterHistory];
      const filterString = JSON.stringify(filters);
      
      // 去重
      const existingIndex = history.findIndex(item => 
        JSON.stringify(item.filters) === filterString
      );
      
      if (existingIndex > -1) {
        history.splice(existingIndex, 1);
      }
      
      // 添加到头部
      history.unshift({
        filters,
        timestamp: Date.now(),
        name: this.generateFilterName(filters)
      });
      
      // 限制历史记录数量
      if (history.length > this.data.maxHistoryCount) {
        history.splice(this.data.maxHistoryCount);
      }
      
      this.setData({ filterHistory: history });
    },

    /**
     * 生成筛选条件名称
     */
    generateFilterName(filters) {
      const parts = [];
      
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        const options = this.data.filterOptions[key];
        
        if (options) {
          const option = options.find(opt => opt.value === value);
          if (option) {
            parts.push(option.label);
          }
        }
      });
      
      return parts.join(' + ') || '自定义筛选';
    },

    /**
     * 应用历史筛选
     */
    onApplyHistoryFilter(event) {
      const { index } = event.currentTarget.dataset;
      const historyItem = this.data.filterHistory[index];
      
      if (historyItem) {
        Object.keys(historyItem.filters).forEach(type => {
          this.triggerEvent('filterchange', {
            type,
            value: historyItem.filters[type]
          });
        });
      }
    },

    /**
     * 删除历史筛选
     */
    onDeleteHistoryFilter(event) {
      event.stopPropagation();
      const { index } = event.currentTarget.dataset;
      const history = [...this.data.filterHistory];
      history.splice(index, 1);
      this.setData({ filterHistory: history });
    },

    /**
     * 重置筛选条件
     */
    onResetFilters() {
      this.setData({
        ageRangeFilter: {
          enabled: false,
          min: 0,
          max: 120,
          selectedMin: 0,
          selectedMax: 120
        },
        searchKeyword: ''
      });
      
      this.triggerEvent('reset');
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateSelectedCount();
    }
  }
});