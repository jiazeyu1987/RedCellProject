const healthArchiveService = require('../../services/health-archive.service.js');
const familyArchiveService = require('../../services/family-archive.service.js');
const { PatientAPI } = require('../../api/index.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 搜索关键字
    searchKeyword: '',
    
    // 当前筛选条件
    currentFilters: {
      healthStatus: '', // 健康状态: 'healthy', 'chronic', 'critical'
      riskLevel: '', // 风险等级: 'low', 'medium', 'high'
      hasRecentReports: false, // 是否有最近报告
      needsAttention: false // 需要关注
    },
    
    // 健康档案列表
    healthArchives: [],
    
    // 筛选后的列表
    filteredArchives: [],
    
    // 页面状态
    loading: true,
    isEmpty: false,
    isError: false,
    errorMessage: '',
    
    // 统计信息
    statistics: {
      total: 0,
      healthyCount: 0,
      chronicCount: 0,
      criticalCount: 0,
      highRiskCount: 0,
      needsAttentionCount: 0
    },
    
    // 界面状态
    showFilters: false,
    viewMode: 'grid', // 'grid' | 'list'
    
    // 操作状态
    refreshing: false,
    
    // 健康状态选项
    healthStatusOptions: [
      { value: '', label: '全部状态' },
      { value: 'healthy', label: '健康', color: '#34c759' },
      { value: 'chronic', label: '慢性病', color: '#ff9500' },
      { value: 'critical', label: '重症', color: '#ff3b30' }
    ],
    
    // 风险等级选项
    riskLevelOptions: [
      { value: '', label: '全部风险' },
      { value: 'low', label: '低风险', color: '#34c759' },
      { value: 'medium', label: '中等风险', color: '#ff9500' },
      { value: 'high', label: '高风险', color: '#ff3b30' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取传入的参数
    if (options.memberId) {
      this.setData({ memberId: options.memberId });
    }
    
    // 初始化页面
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新数据
    this.loadHealthArchives();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    // 如果需要分页加载，在这里实现
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      await this.loadHealthArchives();
    } catch (error) {
      console.error('初始化页面失败:', error);
      this.setData({
        isError: true,
        errorMessage: '页面初始化失败，请重试'
      });
    }
  },

  /**
   * 加载健康档案列表
   */
  async loadHealthArchives() {
    try {
      this.setData({ loading: true, isError: false });

      // 获取家庭成员列表
      const membersResult = await familyArchiveService.getFamilyMembers();
      const members = membersResult.members || [];

      // 获取每个成员的健康档案
      const healthArchivesPromises = members.map(async (member) => {
        try {
          const healthData = await healthArchiveService.getHealthArchive(member.id);
          const riskAssessment = await healthArchiveService.assessHealthRisks(member.id);
          
          return {
            memberId: member.id,
            memberInfo: member,
            healthData,
            riskAssessment,
            lastUpdateTime: healthData.updateTime || healthData.createTime
          };
        } catch (error) {
          console.error(`获取成员 ${member.id} 健康档案失败:`, error);
          return {
            memberId: member.id,
            memberInfo: member,
            healthData: null,
            riskAssessment: null,
            error: error.message
          };
        }
      });

      const healthArchives = await Promise.all(healthArchivesPromises);
      
      // 计算统计信息
      const statistics = this.calculateStatistics(healthArchives);
      
      this.setData({
        healthArchives,
        filteredArchives: healthArchives,
        statistics,
        loading: false,
        isEmpty: healthArchives.length === 0
      });

      // 应用当前筛选条件
      this.applyFilters();

    } catch (error) {
      console.error('加载健康档案失败:', error);
      this.setData({
        loading: false,
        isError: true,
        errorMessage: '加载健康档案失败，请重试'
      });
    }
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      this.setData({ refreshing: true });
      await this.loadHealthArchives();
    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    } finally {
      this.setData({ refreshing: false });
      // 停止下拉刷新
      if (wx.stopPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  /**
   * 计算统计信息
   */
  calculateStatistics(archives) {
    const stats = {
      total: archives.length,
      healthyCount: 0,
      chronicCount: 0,
      criticalCount: 0,
      highRiskCount: 0,
      needsAttentionCount: 0
    };

    archives.forEach(archive => {
      if (!archive.healthData) return;

      // 健康状态统计
      const healthStatus = archive.memberInfo?.healthStatus || 'healthy';
      switch (healthStatus) {
        case 'healthy':
          stats.healthyCount++;
          break;
        case 'chronic':
          stats.chronicCount++;
          break;
        case 'critical':
          stats.criticalCount++;
          break;
      }

      // 风险等级统计
      if (archive.riskAssessment?.overallRisk?.level === 'high') {
        stats.highRiskCount++;
      }

      // 需要关注统计（高风险或有异常数据）
      if (this.needsAttention(archive)) {
        stats.needsAttentionCount++;
      }
    });

    return stats;
  },

  /**
   * 判断是否需要关注
   */
  needsAttention(archive) {
    if (!archive.healthData || !archive.riskAssessment) return false;

    // 高风险
    if (archive.riskAssessment.overallRisk?.level === 'high') {
      return true;
    }

    // 生命体征异常
    const current = archive.healthData.vitalSigns?.current;
    if (current) {
      if (current.bloodPressure) {
        const { systolic, diastolic } = current.bloodPressure;
        if (systolic >= 140 || diastolic >= 90) return true;
      }
      if (current.heartRate?.value && (current.heartRate.value > 100 || current.heartRate.value < 60)) {
        return true;
      }
    }

    // 长时间未更新
    const lastUpdate = new Date(archive.healthData.updateTime || archive.healthData.createTime);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      return true;
    }

    return false;
  },

  /**
   * 搜索功能
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.applyFilters();
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  /**
   * 切换筛选器显示
   */
  toggleFilters() {
    this.setData({ showFilters: !this.data.showFilters });
  },

  /**
   * 切换视图模式
   */
  toggleViewMode() {
    const newMode = this.data.viewMode === 'grid' ? 'list' : 'grid';
    this.setData({ viewMode: newMode });
  },

  /**
   * 筛选器变更
   */
  onFilterChange(e) {
    const { field, value } = e.currentTarget.dataset;
    const filters = { ...this.data.currentFilters };
    
    if (filters[field] === value) {
      // 如果点击的是当前选中的选项，则取消选择
      filters[field] = '';
    } else {
      filters[field] = value;
    }
    
    this.setData({ currentFilters: filters });
    this.applyFilters();
  },

  /**
   * 切换布尔筛选器
   */
  toggleBooleanFilter(e) {
    const { field } = e.currentTarget.dataset;
    const filters = { ...this.data.currentFilters };
    filters[field] = !filters[field];
    
    this.setData({ currentFilters: filters });
    this.applyFilters();
  },

  /**
   * 清空筛选器
   */
  clearFilters() {
    this.setData({
      currentFilters: {
        healthStatus: '',
        riskLevel: '',
        hasRecentReports: false,
        needsAttention: false
      }
    });
    this.applyFilters();
  },

  /**
   * 应用筛选条件
   */
  applyFilters() {
    const { healthArchives, searchKeyword, currentFilters } = this.data;
    let filtered = [...healthArchives];

    // 关键字搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(archive => {
        const member = archive.memberInfo;
        return member && (
          member.name.toLowerCase().includes(keyword) ||
          member.phone.includes(keyword) ||
          (member.idCard && member.idCard.includes(keyword))
        );
      });
    }

    // 健康状态筛选
    if (currentFilters.healthStatus) {
      filtered = filtered.filter(archive => 
        archive.memberInfo?.healthStatus === currentFilters.healthStatus
      );
    }

    // 风险等级筛选
    if (currentFilters.riskLevel) {
      filtered = filtered.filter(archive => 
        archive.riskAssessment?.overallRisk?.level === currentFilters.riskLevel
      );
    }

    // 最近报告筛选
    if (currentFilters.hasRecentReports) {
      filtered = filtered.filter(archive => {
        if (!archive.healthData) return false;
        const reports = archive.healthData.medicalReports;
        const hasRecentReport = Object.values(reports).some(reportList => 
          reportList.length > 0 && this.isRecentReport(reportList[0])
        );
        return hasRecentReport;
      });
    }

    // 需要关注筛选
    if (currentFilters.needsAttention) {
      filtered = filtered.filter(archive => this.needsAttention(archive));
    }

    this.setData({ 
      filteredArchives: filtered,
      isEmpty: filtered.length === 0 && !this.data.loading
    });
  },

  /**
   * 判断是否为最近报告
   */
  isRecentReport(report) {
    if (!report.reportDate) return false;
    const reportDate = new Date(report.reportDate);
    const daysSince = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30; // 30天内的报告算最近
  },

  /**
   * 查看健康档案详情
   */
  viewHealthArchive(e) {
    const { memberId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/health-archive-detail/health-archive-detail?memberId=${memberId}`
    });
  },

  /**
   * 添加健康记录
   */
  addHealthRecord(e) {
    const { memberId, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${memberId}&type=${type}`
    });
  },

  /**
   * 查看风险评估
   */
  viewRiskAssessment(e) {
    const { memberId } = e.currentTarget.dataset;
    const archive = this.data.healthArchives.find(a => a.memberId === memberId);
    
    if (!archive || !archive.riskAssessment) {
      wx.showToast({
        title: '暂无风险评估数据',
        icon: 'none'
      });
      return;
    }

    // 显示风险评估详情
    this.showRiskAssessmentModal(archive.riskAssessment);
  },

  /**
   * 显示风险评估模态框
   */
  showRiskAssessmentModal(riskAssessment) {
    const riskFactorsText = riskAssessment.riskFactors
      .map(factor => `• ${factor.description}: ${factor.value}`)
      .join('\n');
    
    const recommendationsText = riskAssessment.recommendations
      .map(rec => `• ${rec}`)
      .join('\n');

    const content = `风险等级：${riskAssessment.overallRisk.description}\n评分：${riskAssessment.overallRisk.score}\n\n风险因素：\n${riskFactorsText}\n\n建议：\n${recommendationsText}`;

    wx.showModal({
      title: '健康风险评估',
      content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 刷新健康档案
   */
  async refreshArchive(e) {
    const { memberId } = e.currentTarget.dataset;
    
    try {
      wx.showLoading({ title: '刷新中...' });
      
      // 强制刷新该成员的健康档案
      await healthArchiveService.getHealthArchive(memberId, true);
      
      // 重新加载列表
      await this.loadHealthArchives();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('刷新健康档案失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  }
});