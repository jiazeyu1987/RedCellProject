/**
 * 审批管理组件
 * 显示审批任务列表和处理审批流程
 */

const AdjustmentApprovalService = require('../../services/adjustment-approval.service.js');
const TimeAdjustPermissionService = require('../../services/time-adjust-permission.service.js');

Component({
  properties: {
    // 显示模式：list(列表) | detail(详情)
    mode: {
      type: String,
      value: 'list'
    },
    // 审批任务ID（详情模式使用）
    requestId: {
      type: String,
      value: ''
    },
    // 用户角色
    userRole: {
      type: String,
      value: ''
    },
    // 是否显示
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 审批任务列表
    approvalTasks: [],
    // 当前任务详情
    currentTask: null,
    // 加载状态
    loading: false,
    // 审批决定
    decision: '', // approve | reject | request_changes
    // 审批意见
    comment: '',
    // 筛选状态
    filterStatus: 'pending_approval',
    // 排序方式
    sortBy: 'priority', // priority | time | type
    // 是否显示筛选器
    showFilter: false,
    // 统计信息
    statistics: {
      total: 0,
      pending: 0,
      urgent: 0,
      overdue: 0
    }
  },

  lifetimes: {
    attached() {
      this.initComponent();
    }
  },

  observers: {
    'show': function(show) {
      if (show) {
        this.loadData();
      }
    },
    'requestId': function(requestId) {
      if (requestId && this.data.mode === 'detail') {
        this.loadTaskDetail(requestId);
      }
    }
  },

  methods: {
    /**
     * 初始化组件
     */
    initComponent() {
      console.log('审批管理组件初始化');
    },

    /**
     * 加载数据
     */
    async loadData() {
      if (this.data.mode === 'list') {
        await this.loadApprovalTasks();
      } else if (this.data.mode === 'detail' && this.data.requestId) {
        await this.loadTaskDetail(this.data.requestId);
      }
    },

    /**
     * 加载审批任务列表
     */
    async loadApprovalTasks() {
      try {
        this.setData({ loading: true });

        // 获取当前用户信息
        const userInfo = wx.getStorageSync('userInfo');
        if (!userInfo) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
        }

        // 获取审批任务
        const tasks = await AdjustmentApprovalService.getApprovalTasks(userInfo.id, {
          status: this.data.filterStatus,
          sortBy: this.data.sortBy
        });

        // 计算统计信息
        const statistics = this.calculateStatistics(tasks);

        this.setData({
          approvalTasks: tasks,
          statistics,
          loading: false
        });

      } catch (error) {
        console.error('加载审批任务失败:', error);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    /**
     * 加载任务详情
     */
    async loadTaskDetail(requestId) {
      try {
        this.setData({ loading: true });

        const taskDetail = await AdjustmentApprovalService.getApprovalStatus(requestId);
        if (!taskDetail) {
          wx.showToast({ title: '任务不存在', icon: 'none' });
          return;
        }

        this.setData({
          currentTask: taskDetail,
          loading: false
        });

      } catch (error) {
        console.error('加载任务详情失败:', error);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    /**
     * 处理审批决定
     */
    async handleApproval() {
      if (!this.data.decision) {
        wx.showToast({ title: '请选择审批结果', icon: 'none' });
        return;
      }

      if (this.data.decision === 'reject' && !this.data.comment.trim()) {
        wx.showToast({ title: '拒绝时请填写原因', icon: 'none' });
        return;
      }

      try {
        wx.showLoading({ title: '处理中...', mask: true });

        const userInfo = wx.getStorageSync('userInfo');
        const result = await AdjustmentApprovalService.processApproval(
          this.data.currentTask.requestId,
          {
            approverId: userInfo.id,
            decision: this.data.decision,
            comment: this.data.comment
          }
        );

        wx.hideLoading();

        if (result.success) {
          wx.showToast({ title: '处理成功', icon: 'success' });
          
          // 触发审批完成事件
          this.triggerEvent('approval-complete', {
            requestId: this.data.currentTask.requestId,
            decision: this.data.decision,
            newStatus: result.newStatus
          });

          // 重新加载数据
          await this.loadData();
          
          // 重置表单
          this.resetForm();
        } else {
          wx.showToast({ title: result.error || '处理失败', icon: 'none' });
        }

      } catch (error) {
        wx.hideLoading();
        console.error('处理审批失败:', error);
        wx.showToast({ title: '处理失败', icon: 'none' });
      }
    },

    /**
     * 快速审批（一键批准）
     */
    async quickApprove(e) {
      const { requestId } = e.currentTarget.dataset;
      
      try {
        wx.showLoading({ title: '批准中...', mask: true });
        
        const userInfo = wx.getStorageSync('userInfo');
        const result = await AdjustmentApprovalService.processApproval(requestId, {
          approverId: userInfo.id,
          decision: 'approve',
          comment: '快速批准'
        });

        wx.hideLoading();

        if (result.success) {
          wx.showToast({ title: '批准成功', icon: 'success' });
          await this.loadApprovalTasks();
        } else {
          wx.showToast({ title: result.error || '批准失败', icon: 'none' });
        }

      } catch (error) {
        wx.hideLoading();
        console.error('快速审批失败:', error);
        wx.showToast({ title: '批准失败', icon: 'none' });
      }
    },

    /**
     * 查看任务详情
     */
    viewTaskDetail(e) {
      const { requestId } = e.currentTarget.dataset;
      this.triggerEvent('view-detail', { requestId });
    },

    /**
     * 选择审批决定
     */
    selectDecision(e) {
      const { decision } = e.currentTarget.dataset;
      this.setData({ decision });
    },

    /**
     * 输入审批意见
     */
    onCommentInput(e) {
      this.setData({ comment: e.detail.value });
    },

    /**
     * 切换筛选状态
     */
    switchFilterStatus(e) {
      const { status } = e.currentTarget.dataset;
      this.setData({ filterStatus: status });
      this.loadApprovalTasks();
    },

    /**
     * 切换排序方式
     */
    switchSortBy(e) {
      const { sortBy } = e.currentTarget.dataset;
      this.setData({ sortBy });
      this.loadApprovalTasks();
    },

    /**
     * 显示/隐藏筛选器
     */
    toggleFilter() {
      this.setData({ showFilter: !this.data.showFilter });
    },

    /**
     * 刷新数据
     */
    async refreshData() {
      await this.loadData();
      wx.showToast({ title: '刷新成功', icon: 'success' });
    },

    /**
     * 重置表单
     */
    resetForm() {
      this.setData({
        decision: '',
        comment: ''
      });
    },

    /**
     * 计算统计信息
     */
    calculateStatistics(tasks) {
      const now = new Date();
      const statistics = {
        total: tasks.length,
        pending: 0,
        urgent: 0,
        overdue: 0
      };

      tasks.forEach(task => {
        if (task.status === 'pending_approval') {
          statistics.pending++;
        }
        if (task.urgentLevel === 'urgent') {
          statistics.urgent++;
        }
        // 超过24小时未处理视为过期
        const hoursPassed = (now - new Date(task.createdAt)) / (1000 * 60 * 60);
        if (hoursPassed > 24) {
          statistics.overdue++;
        }
      });

      return statistics;
    },

    /**
     * 格式化时间
     */
    formatTime(time) {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff / (1000 * 60));

      if (hours > 24) {
        return `${Math.floor(hours / 24)}天前`;
      } else if (hours > 0) {
        return `${hours}小时前`;
      } else if (minutes > 0) {
        return `${minutes}分钟前`;
      } else {
        return '刚刚';
      }
    },

    /**
     * 获取优先级颜色
     */
    getPriorityColor(priority) {
      if (priority >= 80) return '#f5222d'; // 高优先级 - 红色
      if (priority >= 60) return '#faad14'; // 中优先级 - 橙色
      return '#52c41a'; // 低优先级 - 绿色
    },

    /**
     * 获取状态颜色
     */
    getStatusColor(status) {
      const colors = {
        'pending_approval': '#1890ff',
        'approved': '#52c41a',
        'rejected': '#f5222d',
        'changes_requested': '#faad14',
        'cancelled': '#8c8c8c'
      };
      return colors[status] || '#8c8c8c';
    },

    /**
     * 关闭组件
     */
    close() {
      this.triggerEvent('close');
    }
  }
});