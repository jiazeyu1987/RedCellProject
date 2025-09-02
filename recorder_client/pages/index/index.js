// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const { userStore, appStore } = require('../../stores/index.js');
const ErrorHandler = require('../../utils/error-handler.js');
const LoginStateManager = require('../../utils/login-state-manager.js');
const { PermissionMiddleware, PagePermissions } = require('../../utils/permission-middleware.js');
const { PERMISSIONS } = require('../../utils/role-permission.js');
const api = require('../../api/index.js');

Page({
  data: {
    // 用户信息
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    
    // 工作状态
    workStatus: 'online', // online, offline, busy
    statusText: '在线',
    
    // 通知相关
    unreadCount: 0,
    
    // 今日任务数据
    todayTasks: {
      total: 0,
      pending: 0,
      completed: 0
    },
    todayTasksSubtitle: '今日暂无任务',
    
    // 紧急任务列表
    urgentTasks: [],
    
    // 本周统计数据
    weekStats: {
      serviceCount: 0,
      totalHours: '0h',
      income: '0.00'
    },
    weekStatsSubtitle: '本周统计数据',
    
    // 通知列表
    notices: [],
    
    // 下拉刷新状态
    refreshing: false,
    
    // 其他状态
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  // 页面生命周期
  onLoad(options) {
    console.log('首页加载', options);
    
    // 检查是否从登录页跳转过来的
    if (options && options.from === 'login') {
      this.setData({ _fromLogin: true });
      console.log('从登录页跳转过来');
    }
    
    // 首先检查登录状态
    this.checkLoginAndInit(options);
  },

  // 检查登录状态并初始化
  async checkLoginAndInit(options) {
    try {
      console.log('首页检查登录状态开始...');
      
      // 检查是否刚刚登录成功
      const justLoggedIn = wx.getStorageSync('_justLoggedIn');
      if (justLoggedIn) {
        // 清除临时标记
        wx.removeStorageSync('_justLoggedIn');
        console.log('刚刚登录成功，直接初始化页面');
        this.initPage();
        return;
      }
      
      // 首先检查本地存储的登录信息
      const userData = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');
      
      if (!token || !userData) {
        console.log('本地无登录信息，跳转到登录页');
        setTimeout(() => {
          LoginStateManager.redirectToLogin();
        }, 100);
        return;
      }
      
      console.log('本地登录信息存在，尝试恢复登录状态');
      
      // 检查登录状态，但给一些时间让状态同步
      const isLoggedIn = await this.checkLoginWithRetry();
      
      if (!isLoggedIn) {
        console.log('登录状态验证失败，跳转到登录页');
        setTimeout(() => {
          LoginStateManager.redirectToLogin();
        }, 100);
        return;
      }
      
      console.log('登录状态检查通过，初始化页面');
      
      // 权限检查
      const hasPermission = this.checkPagePermissions(
        PagePermissions.INDEX.permissions,
        PagePermissions.INDEX.options
      );
      
      if (hasPermission) {
        this.initPage();
      } else {
        console.warn('权限检查未通过');
        wx.showToast({
          title: '权限不足',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('页面初始化失败:', error);
      // 发生错误时跳转到登录页
      setTimeout(() => {
        LoginStateManager.redirectToLogin();
      }, 100);
    }
  },

  // 带重试的登录状态检查
  async checkLoginWithRetry(maxRetries = 3, delay = 200) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`第${i + 1}次检查登录状态`);
        
        // 检查登录状态，但不自动跳转
        const isLoggedIn = await LoginStateManager.checkLoginStatus(false);
        
        if (isLoggedIn) {
          console.log('登录状态检查成功');
          return true;
        }
        
        // 如果检查失败，等待一段时间后重试
        if (i < maxRetries - 1) {
          console.log(`登录状态检查失败，${delay}ms后重试`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`第${i + 1}次登录状态检查出错:`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log('所有登录状态检查都失败');
    return false;
  },

  onShow() {
    console.log('首页显示');
    
    // 每次页面显示时检查登录状态
    this.checkLoginOnShow();
  },

  // 在页面显示时检查登录状态
  async checkLoginOnShow() {
    try {
      // 检查是否刚刚登录成功
      const justLoggedIn = wx.getStorageSync('_justLoggedIn');
      if (justLoggedIn) {
        // 清除临时标记
        wx.removeStorageSync('_justLoggedIn');
        console.log('刚刚登录成功，跳过登录状态检查');
        return;
      }
      
      // 避免页面就是从登录页跳转过来的情况下重复检查
      if (this.data._fromLogin) {
        this.setData({ _fromLogin: false });
        console.log('从登录页跳转过来，跳过登录状态检查');
        return;
      }
      
      // 简单检查本地存储
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (!token || !userInfo) {
        console.log('本地无登录信息，跳转到登录页');
        LoginStateManager.redirectToLogin();
        return;
      }
      
      // 设置当前页面
      ErrorHandler.safeStateUpdate(appStore, {
        currentPage: 'index'
      }, '设置当前页面');
      
      console.log('页面显示时登录状态检查通过');
      
      // 刷新页面数据
      this.refreshPageData();
      
      // 重新启动定时刷新
      this.startAutoRefresh();
    } catch (error) {
      console.error('页面显示检查失败:', error);
    }
  },

  onHide() {
    console.log('首页隐藏');
    // 页面隐藏时停止定时刷新
    this.stopAutoRefresh();
  },

  onUnload() {
    console.log('首页卸载');
    // 清理订阅和定时器
    this.cleanup();
  },

  // 初始化页面
  initPage() {
    try {
      console.log('初始化首页数据');
      
      // 设置用户信息
      this.updateUserInfo();
      
      // 初始化页面数据
      this.initPageData();
      
      // 订阅用户状态变化
      this.userUnsubscribe = ErrorHandler.safeSubscribe(userStore, (userState) => {
        try {
          console.log('用户状态变化:', userState);
          if (userState && userState.userInfo) {
            this.setData({
              userInfo: userState.userInfo,
              hasUserInfo: true
            });
          }
        } catch (error) {
          console.error('处理用户状态变化错误:', error);
        }
      }, '首页用户状态订阅');
      
      // 加载页面数据
      this.loadPageData();
      
      // 启动定时刷新
      this.startAutoRefresh();
    } catch (error) {
      console.error('初始化页面错误:', error);
    }
  },

  // 更新用户信息
  updateUserInfo() {
    try {
      const userData = wx.getStorageSync('userInfo');
      if (userData) {
        this.setData({
          userInfo: userData,
          hasUserInfo: true
        });
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
    }
  },

  // 初始化页面数据
  initPageData() {
    // 设置工作状态
    this.setData({
      workStatus: 'online',
      statusText: '在线服务中'
    });
    
    // 初始化示例数据
    this.setDemoData();
  },

  // 设置示例数据（后续替换为真实API调用）
  setDemoData() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    this.setData({
      // 今日任务数据
      todayTasks: {
        total: 8,
        pending: 3,
        completed: 5
      },
      todayTasksSubtitle: `${today} · 共8个任务`,
      
      // 紧急任务
      urgentTasks: [
        {
          id: 1,
          time: '10:30',
          patientName: '张老太',
          serviceName: '血压测量'
        },
        {
          id: 2,
          time: '14:00',
          patientName: '李大爷',
          serviceName: '康复训练'
        }
      ],
      
      // 本周统计
      weekStats: {
        serviceCount: 25,
        totalHours: '36h',
        income: '2,850.00'
      },
      weekStatsSubtitle: '本周表现优秀',
      
      // 通知消息
      notices: [
        {
          id: 1,
          type: 'urgent',
          icon: '🚨',
          title: '紧急任务通知',
          description: '王大妈血压异常，需要立即上门检查',
          time: '5分钟前'
        },
        {
          id: 2,
          type: 'info',
          icon: '📋',
          title: '新的医嘱更新',
          description: '李大爷的康复训练计划已更新',
          time: '30分钟前'
        }
      ],
      
      // 未读通知数量
      unreadCount: 3
    });
  },

  // 加载页面数据
  async loadPageData() {
    try {
      console.log('加载页面数据');
      
      // 并行加载各模块数据
      await Promise.all([
        this.loadTodayTasks(),
        this.loadWeekStats(),
        this.loadNotices(),
        this.loadUserWorkStatus()
      ]);
      
    } catch (error) {
      console.error('加载页面数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  // 加载今日任务数据
  async loadTodayTasks() {
    try {
      // TODO: 调用真实API
      // const response = await api.getTodayTasks();
      
      // 模拟API调用
      const mockData = {
        total: 8,
        pending: 3,
        completed: 5,
        urgentTasks: [
          {
            id: 1,
            time: '10:30',
            patientName: '张老太',
            serviceName: '血压测量',
            priority: 'high'
          },
          {
            id: 2,
            time: '14:00',
            patientName: '李大爷',
            serviceName: '康复训练',
            priority: 'urgent'
          }
        ]
      };
      
      const today = new Date().toLocaleDateString('zh-CN');
      
      this.setData({
        todayTasks: {
          total: mockData.total,
          pending: mockData.pending,
          completed: mockData.completed
        },
        todayTasksSubtitle: `${today} · 共${mockData.total}个任务`,
        urgentTasks: mockData.urgentTasks
      });
      
      console.log('今日任务数据加载完成');
    } catch (error) {
      console.error('加载今日任务失败:', error);
    }
  },

  // 加载本周统计数据
  async loadWeekStats() {
    try {
      // TODO: 调用真实API
      // const response = await api.getWeekStats();
      
      // 模拟API调用
      const mockData = {
        serviceCount: 25,
        totalHours: 36,
        income: 2850.00,
        performanceLevel: 'excellent' // excellent, good, normal
      };
      
      const subtitleMap = {
        excellent: '本周表现优秀',
        good: '本周表现良好',
        normal: '本周表现正常'
      };
      
      this.setData({
        weekStats: {
          serviceCount: mockData.serviceCount,
          totalHours: `${mockData.totalHours}h`,
          income: mockData.income.toFixed(2)
        },
        weekStatsSubtitle: subtitleMap[mockData.performanceLevel] || '本周统计数据'
      });
      
      console.log('本周统计数据加载完成');
    } catch (error) {
      console.error('加载本周统计失败:', error);
    }
  },

  // 加载通知数据
  async loadNotices() {
    try {
      // TODO: 调用真实API
      // const response = await api.getNotices();
      
      // 模拟API调用
      const mockData = [
        {
          id: 1,
          type: 'urgent',
          icon: '🚨',
          title: '紧急任务通知',
          description: '王大妈血压异常，需要立即上门检查',
          time: '5分钟前',
          timestamp: Date.now() - 5 * 60 * 1000
        },
        {
          id: 2,
          type: 'info',
          icon: '📋',
          title: '新的医嘱更新',
          description: '李大爷的康复训练计划已更新',
          time: '30分钟前',
          timestamp: Date.now() - 30 * 60 * 1000
        },
        {
          id: 3,
          type: 'warning',
          icon: '⚠️',
          title: '设备维护提醒',
          description: '血压计需要定期校准，请联系设备管理员',
          time: '2小时前',
          timestamp: Date.now() - 2 * 60 * 60 * 1000
        }
      ];
      
      // 计算未读通知数量
      const unreadCount = mockData.length;
      
      this.setData({
        notices: mockData,
        unreadCount: unreadCount
      });
      
      console.log('通知数据加载完成');
    } catch (error) {
      console.error('加载通知失败:', error);
    }
  },

  // 加载用户工作状态
  async loadUserWorkStatus() {
    try {
      // TODO: 调用真实API
      // const response = await api.getUserWorkStatus();
      
      // 模拟API调用
      const mockData = {
        status: 'online', // online, offline, busy
        lastActiveTime: Date.now(),
        todayWorkHours: 6.5
      };
      
      const statusMap = {
        online: '在线服务中',
        offline: '已下线',
        busy: '忙碌中'
      };
      
      this.setData({
        workStatus: mockData.status,
        statusText: statusMap[mockData.status] || '未知状态'
      });
      
      console.log('用户工作状态加载完成');
    } catch (error) {
      console.error('加载用户工作状态失败:', error);
    }
  },

  // 刷新页面数据
  async refreshPageData() {
    try {
      console.log('刷新页面数据');
      
      // 并行刷新所有数据
      await Promise.all([
        this.loadTodayTasks(),
        this.loadWeekStats(), 
        this.loadNotices(),
        this.loadUserWorkStatus()
      ]);
      
      console.log('页面数据刷新完成');
    } catch (error) {
      console.error('刷新页面数据失败:', error);
    }
  },

  // 定时刷新数据
  startAutoRefresh() {
    // 清除之前的定时器
    this.stopAutoRefresh();
    
    // 每5分钟自动刷新一次
    this.refreshTimer = setInterval(() => {
      this.refreshPageData();
    }, 5 * 60 * 1000);
    
    console.log('启动自动刷新，间隔5分钟');
  },

  // 停止定时刷新
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('停止自动刷新');
    }
  },

  // 清理资源
  cleanup() {
    // 取消订阅
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
      this.userUnsubscribe = null;
    }
    
    // 停止定时刷新
    this.stopAutoRefresh();
  },

  // 混入权限检查方法
  ...PermissionMiddleware.pagePermissionMixin(PERMISSIONS.VIEW_DASHBOARD),

  // 事件处理函数
  
  // 下拉刷新
  async onRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    
    try {
      // 重新加载页面数据
      await this.loadPageData();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('刷新失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 通知图标点击
  onNotificationTap() {
    console.log('点击通知图标');
    
    // 清除未读计数
    this.setData({
      unreadCount: 0
    });
    
    wx.navigateTo({
      url: '/pages/notifications/notifications'
    });
  },

  // 工作状态切换
  onWorkStatusTap() {
    console.log('点击工作状态');
    
    const statusOptions = [
      { key: 'online', text: '在线服务中' },
      { key: 'busy', text: '忙碌中' },
      { key: 'offline', text: '已下线' }
    ];
    
    wx.showActionSheet({
      itemList: statusOptions.map(item => item.text),
      success: (res) => {
        const selectedStatus = statusOptions[res.tapIndex];
        this.updateWorkStatus(selectedStatus.key, selectedStatus.text);
      }
    });
  },

  // 更新工作状态
  async updateWorkStatus(status, statusText) {
    try {
      // TODO: 调用API更新服务器状态
      // await api.updateWorkStatus(status);
      
      this.setData({
        workStatus: status,
        statusText: statusText
      });
      
      wx.showToast({
        title: `状态已更新为${statusText}`,
        icon: 'success'
      });
      
      console.log('工作状态更新成功:', status);
    } catch (error) {
      console.error('更新工作状态失败:', error);
      wx.showToast({
        title: '状态更新失败',
        icon: 'none'
      });
    }
  },

  // 今日任务卡片点击
  onTodayTasksTap() {
    console.log('点击今日任务');
    wx.navigateTo({
      url: '/pages/tasks/tasks'
    });
  },

  // 任务项点击
  onTaskItemTap(e) {
    const task = e.currentTarget.dataset.task;
    console.log('点击任务项:', task);
    
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?taskId=${task.id}`
    });
  },

  // 快捷操作点击
  onQuickAction(e) {
    const action = e.currentTarget.dataset.action;
    console.log('快捷操作:', action);
    
    const actionMap = {
      startService: '/pages/service/start-service',
      patientFiles: '/pages/health-archive/health-archive', 
      schedule: '/pages/schedule/schedule',
      payment: '/pages/payment/payment'
    };
    
    const url = actionMap[action];
    if (url) {
      wx.navigateTo({
        url: url
      });
    }
  },

  // 通知项点击
  onNoticeTap(e) {
    const notice = e.currentTarget.dataset.notice;
    console.log('点击通知:', notice);
    
    wx.navigateTo({
      url: `/pages/notice-detail/notice-detail?noticeId=${notice.id}`
    });
  },

  // 原有的事件处理（保留兼容性）
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        
        // 更新用户状态
        ErrorHandler.safeStateUpdate(userStore, {
          userInfo: res.userInfo
        }, '获取用户信息');
      }
    })
  },

  // 快捷操作导航方法
  
  // 跳转到患者管理页面
  goToPatients() {
    console.log('跳转到患者管理页面');
    wx.navigateTo({
      url: '/pages/family-members/family-members',
      fail: (err) => {
        console.error('跳转到患者管理页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到日程管理页面
  goToSchedule() {
    console.log('跳转到日程管理页面');
    wx.navigateTo({
      url: '/pages/schedule/schedule',
      fail: (err) => {
        console.error('跳转到日程管理页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到设置页面
  goToSettings() {
    console.log('跳转到设置页面');
    wx.navigateTo({
      url: '/pages/user-settings/user-settings',
      fail: (err) => {
        console.error('跳转到设置页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到通知页面
  goToNotifications() {
    console.log('跳转到通知页面');
    // 清除未读计数
    this.setData({
      unreadCount: 0
    });
    
    // TODO: 创建通知页面后更新路径
    wx.showToast({
      title: '通知功能开发中',
      icon: 'none'
    });
  },

  // 跳转到任务详情页面
  goToTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    console.log('跳转到任务详情页面:', taskId);
    
    // TODO: 创建任务详情页面后更新路径
    wx.showToast({
      title: '任务详情功能开发中',
      icon: 'none'
    });
  },

  // 跳转到通知详情页面
  goToNoticeDetail(e) {
    const noticeId = e.currentTarget.dataset.id;
    console.log('跳转到通知详情页面:', noticeId);
    
    // TODO: 创建通知详情页面后更新路径
    wx.showToast({
      title: '通知详情功能开发中',
      icon: 'none'
    });
  }
})
