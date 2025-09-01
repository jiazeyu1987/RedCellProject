/**
 * 调整历史组件
 * 显示预约时间调整的历史记录
 */
Component({
  properties: {
    // 预约ID
    appointmentId: {
      type: String,
      value: ''
    },
    
    // 记录员ID
    recorderId: {
      type: String,
      value: ''
    },
    
    // 显示模式：'list' | 'timeline' | 'summary'
    displayMode: {
      type: String,
      value: 'list'
    },
    
    // 是否显示筛选器
    showFilter: {
      type: Boolean,
      value: true
    },
    
    // 每页数量
    pageSize: {
      type: Number,
      value: 20
    }
  },

  data: {
    // 调整历史列表
    historyList: [],
    
    // 加载状态
    loading: false,
    hasMore: true,
    currentPage: 1,
    
    // 筛选条件
    filters: {
      dateRange: '',
      reason: '',
      status: ''
    },
    
    // 筛选选项
    filterOptions: {
      reasons: ['患者临时有事', '路况堵塞延误', '上个服务超时', '紧急情况处理'],
      statuses: [
        { key: 'pending', label: '待确认' },
        { key: 'approved', label: '已批准' },
        { key: 'rejected', label: '已拒绝' },
        { key: 'completed', label: '已完成' }
      ]
    },
    
    // 统计信息
    statistics: {
      totalAdjustments: 0,
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0
    },
    
    // 筛选面板显示状态
    filterPanelVisible: false,
    
    // 详情弹窗状态
    detailModalVisible: false,
    selectedRecord: null
  },

  lifetimes: {
    attached() {
      this.loadAdjustmentHistory();
      this.loadStatistics();
    }
  },

  methods: {
    /**
     * 重置数据
     */
    resetData() {
      this.setData({
        historyList: [],
        currentPage: 1,
        hasMore: true
      });
    },

    /**
     * 切换显示模式
     */
    onDisplayModeChange(e) {
      const { mode } = e.currentTarget.dataset;
      this.setData({ displayMode: mode });
    },

    /**
     * 关闭筛选面板
     */
    closeFilterPanel() {
      this.setData({ filterPanelVisible: false });
    },

    /**
     * 筛选条件变更
     */
    onStartDateChange(e) {
      this.setData({
        'filters.startDate': e.detail.value
      });
    },

    onEndDateChange(e) {
      this.setData({
        'filters.endDate': e.detail.value
      });
    },

    onStatusFilterChange(e) {
      const { status } = e.currentTarget.dataset;
      const currentStatus = this.data.filters.status;
      this.setData({
        'filters.status': currentStatus === status ? '' : status
      });
    },

    onReasonFilterChange(e) {
      const { reason } = e.currentTarget.dataset;
      const currentReason = this.data.filters.reason;
      this.setData({
        'filters.reason': currentReason === reason ? '' : reason
      });
    },

    /**
     * 重置筛选条件
     */
    onResetFilter() {
      this.setData({
        'filters.startDate': '',
        'filters.endDate': '',
        'filters.status': '',
        'filters.reason': ''
      });
    },

    /**
     * 关闭详情弹窗
     */
    closeDetailModal() {
      this.setData({
        detailModalVisible: false,
        selectedRecord: null
      });
    },

    /**
     * 重新申请调整
     */
    onReapplyAdjustment() {
      const { selectedRecord } = this.data;
      this.triggerEvent('reapply', {
        originalRecord: selectedRecord,
        appointmentInfo: {
          id: selectedRecord.appointmentId,
          patientName: selectedRecord.patientName
        }
      });
      this.closeDetailModal();
    },

    /**
     * 加载更多数据
     */
    onLoadMore() {
      if (!this.data.loading && this.data.hasMore) {
        this.loadAdjustmentHistory(true);
      }
    },

    /**
     * 加载调整历史
     */
    async loadAdjustmentHistory(append = false) {
      if (this.data.loading) return;
      
      this.setData({ loading: true });
      
      try {
        const params = {
          page: append ? this.data.currentPage + 1 : 1,
          pageSize: this.data.pageSize,
          appointmentId: this.data.appointmentId,
          recorderId: this.data.recorderId,
          ...this.data.filters
        };
        
        const result = await this.fetchAdjustmentHistory(params);
        
        const newHistoryList = append 
          ? [...this.data.historyList, ...result.list]
          : result.list;
        
        this.setData({
          historyList: newHistoryList,
          hasMore: result.hasMore,
          currentPage: params.page
        });
        
      } catch (error) {
        console.error('加载调整历史失败:', error);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 加载统计信息
     */
    async loadStatistics() {
      try {
        const params = {
          appointmentId: this.data.appointmentId,
          recorderId: this.data.recorderId
        };
        
        const statistics = await this.fetchAdjustmentStatistics(params);
        this.setData({ statistics });
      } catch (error) {
        console.error('加载统计信息失败:', error);
      }
    },

    /**
     * 查看调整详情
     */
    onViewDetail(e) {
      const { record } = e.currentTarget.dataset;
      this.setData({
        selectedRecord: record,
        detailModalVisible: true
      });
    },

    /**
     * 显示筛选面板
     */
    showFilterPanel() {
      this.setData({ filterPanelVisible: true });
    },

    /**
     * 应用筛选
     */
    onApplyFilter() {
      this.setData({ filterPanelVisible: false });
      this.resetData();
      this.loadAdjustmentHistory();
    },

    /**
     * 下拉刷新
     */
    onPullDownRefresh() {
      this.resetData();
      this.loadAdjustmentHistory();
      this.loadStatistics();
    },

    // API调用方法
    async fetchAdjustmentHistory(params) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockData = this.generateMockHistoryData(params.page, params.pageSize);
          resolve({
            list: mockData,
            hasMore: params.page < 5,
            total: 100
          });
        }, 500);
      });
    },

    async fetchAdjustmentStatistics(params) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            totalAdjustments: 45,
            approvedCount: 38,
            rejectedCount: 3,
            pendingCount: 4
          });
        }, 300);
      });
    },

    generateMockHistoryData(page, pageSize) {
      const data = [];
      const startIndex = (page - 1) * pageSize;
      
      for (let i = 0; i < pageSize; i++) {
        const id = startIndex + i + 1;
        data.push({
          id: `adj_${id}`,
          appointmentId: `apt_${id}`,
          patientName: `患者${id}`,
          originalTime: new Date().toISOString(),
          newTime: new Date().toISOString(),
          reason: '患者临时有事',
          status: 'approved',
          adjustTime: new Date().toISOString()
        });
      }
      
      return data;
    }
  }
});