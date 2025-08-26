// pages/health-plan/index.js
Page({
  data: {
    planList: [],
    activePlan: null,
    showCreateModal: false,
    showDetailModal: false,
    newPlan: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      category: 'exercise', // exercise, diet, sleep, medication
      targets: []
    },
    categories: [
      { value: 'exercise', label: '运动计划', icon: '🏃' },
      { value: 'diet', label: '饮食计划', icon: '🥗' },
      { value: 'sleep', label: '睡眠计划', icon: '😴' },
      { value: 'medication', label: '用药提醒', icon: '💊' }
    ],
    loading: false
  },

  onLoad: function() {
    this.loadHealthPlans();
  },

  onShow: function() {
    this.loadHealthPlans();
  },

  // 加载健康计划
  loadHealthPlans() {
    this.setData({ loading: true });
    
    // 模拟API调用
    setTimeout(() => {
      const mockPlans = [
        {
          id: 1,
          title: '减重健身计划',
          description: '通过合理饮食和适量运动，3个月内减重5公斤',
          category: 'exercise',
          categoryLabel: '运动计划',
          icon: '🏃',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          status: 'active',
          progress: 65,
          targets: [
            { name: '每周运动5次', completed: 12, total: 15 },
            { name: '每次运动30分钟以上', completed: 10, total: 15 },
            { name: '控制饮食热量', completed: 20, total: 25 }
          ],
          lastUpdate: '2024-01-15'
        },
        {
          id: 2,
          title: '血压控制计划',
          description: '通过饮食调节和规律作息，保持血压稳定',
          category: 'diet',
          categoryLabel: '饮食计划',
          icon: '🥗',
          startDate: '2024-01-10',
          endDate: '2024-04-10',
          status: 'active',
          progress: 40,
          targets: [
            { name: '每日盐分摄入少于6g', completed: 8, total: 20 },
            { name: '多吃蔬菜水果', completed: 15, total: 20 },
            { name: '定时测量血压', completed: 18, total: 20 }
          ],
          lastUpdate: '2024-01-14'
        },
        {
          id: 3,
          title: '改善睡眠质量',
          description: '建立规律作息，提高睡眠质量',
          category: 'sleep',
          categoryLabel: '睡眠计划',
          icon: '😴',
          startDate: '2024-01-05',
          endDate: '2024-02-05',
          status: 'completed',
          progress: 100,
          targets: [
            { name: '每晚10点半前上床', completed: 30, total: 30 },
            { name: '睡前不看手机', completed: 25, total: 30 },
            { name: '保证8小时睡眠', completed: 28, total: 30 }
          ],
          lastUpdate: '2024-02-05'
        }
      ];

      this.setData({
        planList: mockPlans,
        loading: false
      });
    }, 1000);
  },

  // 查看计划详情
  viewPlanDetail(e) {
    const plan = e.currentTarget.dataset.plan;
    this.setData({
      activePlan: plan,
      showDetailModal: true
    });
  },

  // 创建新计划
  createPlan() {
    this.setData({
      showCreateModal: true,
      newPlan: {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        category: 'exercise',
        targets: []
      }
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showCreateModal: false,
      showDetailModal: false,
      activePlan: null
    });
  },

  // 输入处理
  onPlanInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`newPlan.${field}`]: value
    });
  },

  // 分类选择
  selectCategory(e) {
    const category = e.detail.value;
    const categoryIndex = parseInt(category);
    this.setData({
      'newPlan.category': this.data.categories[categoryIndex].value
    });
  },

  // 日期选择
  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    const date = e.detail.value;
    this.setData({
      [`newPlan.${field}`]: date
    });
  },

  // 保存计划
  savePlan() {
    const plan = this.data.newPlan;
    
    // 验证必填字段
    if (!plan.title) {
      wx.showToast({
        title: '请输入计划标题',
        icon: 'none'
      });
      return;
    }

    if (!plan.description) {
      wx.showToast({
        title: '请输入计划描述',
        icon: 'none'
      });
      return;
    }

    if (!plan.startDate || !plan.endDate) {
      wx.showToast({
        title: '请选择计划日期',
        icon: 'none'
      });
      return;
    }

    // 验证日期
    if (new Date(plan.startDate) >= new Date(plan.endDate)) {
      wx.showToast({
        title: '结束日期必须晚于开始日期',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    // 模拟API调用
    setTimeout(() => {
      const categoryInfo = this.data.categories.find(c => c.value === plan.category);
      const newPlan = {
        id: Date.now(),
        ...plan,
        categoryLabel: categoryInfo.label,
        icon: categoryInfo.icon,
        status: 'active',
        progress: 0,
        targets: [],
        lastUpdate: new Date().toISOString().split('T')[0]
      };

      const planList = [newPlan, ...this.data.planList];
      this.setData({
        planList: planList,
        showCreateModal: false
      });

      wx.hideLoading();
      wx.showToast({
        title: '计划创建成功',
        icon: 'success'
      });
    }, 1000);
  },

  // 删除计划
  deletePlan(e) {
    const planId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个健康计划吗？',
      success: (res) => {
        if (res.confirm) {
          const planList = this.data.planList.filter(plan => plan.id !== planId);
          this.setData({ planList });
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 更新计划进度
  updateProgress(e) {
    const planId = e.currentTarget.dataset.id;
    
    wx.showToast({
      title: '进度更新功能开发中',
      icon: 'none'
    });
  },

  // 获取计划状态文本
  getStatusText(status) {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'paused':
        return '已暂停';
      default:
        return '未知';
    }
  },

  // 获取进度颜色
  getProgressColor(progress) {
    if (progress >= 80) return '#52C41A';
    if (progress >= 50) return '#1890FF';
    if (progress >= 20) return '#FAAD14';
    return '#FF4D4F';
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHealthPlans();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});