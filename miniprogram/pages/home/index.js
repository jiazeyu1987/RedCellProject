// pages/home/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    todayDate: '',
    
    // 轮播图数据
    bannerList: [
      {
        image: '',
        title: '专业上门医疗服务',
        description: '为老年人提供贴心的健康监测服务'
      },
      {
        image: '',
        title: '健康管理专家',
        description: '24小时健康咨询，守护您的健康'
      },
      {
        image: '',
        title: '医院绿色通道',
        description: '快速挂号，专车接送，省心省力'
      }
    ],
    
    // 快速服务
    quickServices: [
      {
        id: 1,
        name: '立即预约',
        icon: '📅',
        action: 'booking'
      },
      {
        id: 2,
        name: '健康档案',
        icon: '📈',
        action: 'health'
      },
      {
        id: 3,
        name: '医院挂号',
        icon: '🏥',
        action: 'hospital'
      },
      {
        id: 4,
        name: '在线咨询',
        icon: '💬',
        action: 'consult'
      },
      {
        id: 5,
        name: '服务记录',
        icon: '📝',
        action: 'record'
      },
      {
        id: 6,
        name: '紧急呼叫',
        icon: '🆘',
        action: 'emergency'
      }
    ],
    
    // 健康数据
    healthData: {
      bloodPressure: '',
      bloodSugar: '',
      heartRate: ''
    },
    
    // 服务特色
    features: [
      {
        icon: '👩‍⚕️',
        title: '专业医护团队',
        description: '持证上岗的专业医生和护士，为您提供安全可靠的服务'
      },
      {
        icon: '🏠',
        title: '便民上门服务',
        description: '无需出门，专业医护人员上门为您提供健康监测服务'
      },
      {
        icon: '📹',
        title: '全程记录存档',
        description: '服务过程全程录像，健康数据云端存储，随时查看'
      },
      {
        icon: '⚡',
        title: '24小时响应',
        description: '紧急情况快速响应，与医院建立绿色通道'
      }
    ],
    
    // 社区动态
    communityPosts: []
  },

  onLoad: function() {
    this.checkLoginStatus();
    this.initData();
    this.loadCommunityPosts();
  },

  onShow: function() {
    this.checkLoginStatus();
    if (this.data.userInfo) {
      this.loadHealthData();
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = app.globalData.userInfo;
    this.setData({
      userInfo: userInfo
    });
  },

  // 初始化数据
  initData() {
    const today = new Date();
    const todayDate = app.formatDate(today);
    this.setData({
      todayDate: todayDate
    });
  },

  // 加载健康数据
  loadHealthData() {
    // 模拟从后台获取今日健康数据
    const mockHealthData = {
      bloodPressure: '120/80',
      bloodSugar: '5.6',
      heartRate: '72'
    };
    
    this.setData({
      healthData: mockHealthData
    });
  },

  // 加载社区动态
  loadCommunityPosts() {
    // 模拟社区动态数据
    const mockPosts = [
      {
        id: 1,
        userName: '张大爷',
        userAvatar: '',
        content: '今天的健康监测结果很好，血压比上次有所改善，感谢医护人员的专业服务！',
        createTime: '2小时前',
        likes: 12,
        comments: 3,
        images: []
      },
      {
        id: 2,
        userName: '李奶奶',
        userAvatar: '',
        content: '和大家分享一个好消息，通过健康守护的绿色通道，成功预约到了心内科专家号！',
        createTime: '5小时前',
        likes: 8,
        comments: 5,
        images: []
      },
      {
        id: 3,
        userName: '王师傅',
        userAvatar: '',
        content: '上门服务真的很方便，医生很专业，测量过程很仔细，还给了很多健康建议。',
        createTime: '1天前',
        likes: 15,
        comments: 7,
        images: []
      }
    ];
    
    this.setData({
      communityPosts: mockPosts
    });
  },

  // 快速服务点击
  onQuickServiceTap(e) {
    const service = e.currentTarget.dataset.service;
    
    switch(service.action) {
      case 'booking':
        this.navigateToBooking();
        break;
      case 'health':
        this.navigateToHealth();
        break;
      case 'hospital':
        this.navigateToHospital();
        break;
      case 'consult':
        this.showConsultModal();
        break;
      case 'record':
        this.navigateToRecord();
        break;
      case 'emergency':
        this.handleEmergency();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  // 导航到预约页面
  navigateToBooking() {
    if (!this.data.userInfo) {
      this.goToLogin();
      return;
    }
    wx.switchTab({
      url: '/pages/booking/index'
    });
  },

  // 导航到健康档案
  navigateToHealth() {
    if (!this.data.userInfo) {
      this.goToLogin();
      return;
    }
    wx.switchTab({
      url: '/pages/health/index'
    });
  },

  // 导航到医院挂号
  navigateToHospital() {
    if (!this.data.userInfo) {
      this.goToLogin();
      return;
    }
    wx.navigateTo({
      url: '/pages/hospital/index'
    });
  },

  // 导航到服务记录
  navigateToRecord() {
    if (!this.data.userInfo) {
      this.goToLogin();
      return;
    }
    wx.navigateTo({
      url: '/pages/service-record/index'
    });
  },

  // 显示咨询弹窗
  showConsultModal() {
    wx.showModal({
      title: '在线咨询',
      content: '是否拨打健康咨询热线：400-123-4567',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4001234567'
          });
        }
      }
    });
  },

  // 处理紧急呼叫
  handleEmergency() {
    wx.showModal({
      title: '紧急呼叫',
      content: '是否拨打急救电话：120',
      confirmText: '拨打',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '120'
          });
        }
      }
    });
  },

  // 查看健康记录
  viewHealthRecord() {
    wx.switchTab({
      url: '/pages/health/index'
    });
  },

  // 快速预约
  quickBooking() {
    wx.switchTab({
      url: '/pages/booking/index'
    });
  },

  // 去登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 去社区
  goToCommunity() {
    wx.switchTab({
      url: '/pages/community/index'
    });
  },

  // 查看帖子详情
  viewPost(e) {
    const post = e.currentTarget.dataset.post;
    // 这里可以导航到帖子详情页面
    wx.showToast({
      title: '查看帖子详情',
      icon: 'none'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCommunityPosts();
    if (this.data.userInfo) {
      this.loadHealthData();
    }
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '健康守护 - 专业上门医疗服务',
      path: '/pages/home/index',
      imageUrl: ''
    };
  }
});