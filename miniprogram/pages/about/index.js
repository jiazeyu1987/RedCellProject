// 关于我们页面
Page({
  data: {
    appInfo: {
      name: '健康守护',
      version: 'v1.0.0',
      description: '专业的上门医疗服务平台',
      logo: '🏥'
    },
    companyInfo: {
      name: '健康守护科技有限公司',
      established: '2023年',
      address: '北京市朝阳区健康大厦18层',
      phone: '400-888-8888',
      email: 'contact@health.com',
      website: 'https://www.health.com'
    },
    features: [
      {
        icon: '👨‍⚕️',
        title: '专业医护团队',
        description: '拥有三甲医院经验的专业医护人员，持证上岗，服务可靠'
      },
      {
        icon: '🏠',
        title: '上门服务',
        description: '足不出户享受专业医疗服务，节省时间，更加便利'
      },
      {
        icon: '📱',
        title: '智能预约',
        description: '在线预约，实时跟踪，智能匹配最适合的医护人员'
      },
      {
        icon: '🔒',
        title: '隐私保护',
        description: '严格保护用户隐私，所有信息加密传输和存储'
      },
      {
        icon: '⚡',
        title: '快速响应',
        description: '24小时在线客服，紧急情况快速响应，及时提供帮助'
      },
      {
        icon: '💯',
        title: '品质保证',
        description: '服务标准化，质量有保障，用户满意度超过98%'
      }
    ],
    milestones: [
      {
        year: '2023',
        title: '公司成立',
        description: '健康守护科技有限公司正式成立，开始专注于上门医疗服务'
      },
      {
        year: '2023.6',
        title: '产品上线',
        description: '健康守护小程序正式上线，开始为用户提供专业医疗服务'
      },
      {
        year: '2023.9',
        title: '业务扩展',
        description: '服务范围扩展至10个主要城市，用户数量突破10万'
      },
      {
        year: '2023.12',
        title: '技术升级',
        description: '引入AI智能匹配系统，提升服务效率和用户体验'
      },
      {
        year: '2024',
        title: '持续发展',
        description: '继续扩大服务范围，优化服务质量，致力于成为行业领导者'
      }
    ],
    teamMembers: [
      {
        name: '张医生',
        position: '首席医疗官',
        experience: '20年三甲医院经验',
        avatar: '👨‍⚕️'
      },
      {
        name: '李护士长',
        position: '护理总监',
        experience: '15年护理管理经验',
        avatar: '👩‍⚕️'
      },
      {
        name: '王工程师',
        position: '技术总监',
        experience: '互联网医疗专家',
        avatar: '👨‍💻'
      },
      {
        name: '陈经理',
        position: '运营总监',
        experience: '医疗服务运营专家',
        avatar: '👩‍💼'
      }
    ],
    achievements: [
      {
        number: '100,000+',
        label: '注册用户',
        icon: '👥'
      },
      {
        number: '50,000+',
        label: '服务次数',
        icon: '🏥'
      },
      {
        number: '98%',
        label: '满意度',
        icon: '⭐'
      },
      {
        number: '10',
        label: '服务城市',
        icon: '🌍'
      }
    ],
    socialLinks: [
      {
        platform: '微信公众号',
        account: 'health-guard',
        icon: '💬',
        qrcode: '📱'
      },
      {
        platform: '官方微博',
        account: '@健康守护',
        icon: '📢',
        qrcode: '📱'
      },
      {
        platform: '客服热线',
        account: '400-888-8888',
        icon: '📞',
        qrcode: ''
      }
    ]
  },

  onLoad() {
    this.loadAppInfo();
  },

  // 加载应用信息
  loadAppInfo() {
    // 可以从服务器获取最新的应用信息
    console.log('App info loaded');
  },

  // 联系我们
  contactUs(e) {
    const type = e.currentTarget.dataset.type;
    const contact = e.currentTarget.dataset.contact;
    
    switch (type) {
      case 'phone':
        wx.makePhoneCall({
          phoneNumber: contact.replace('-', '')
        });
        break;
        
      case 'email':
        wx.setClipboardData({
          data: contact,
          success: () => {
            wx.showToast({
              title: '邮箱地址已复制',
              icon: 'success'
            });
          }
        });
        break;
        
      case 'website':
        wx.setClipboardData({
          data: contact,
          success: () => {
            wx.showToast({
              title: '网址已复制',
              icon: 'success'
            });
          }
        });
        break;
        
      case 'address':
        wx.setClipboardData({
          data: contact,
          success: () => {
            wx.showToast({
              title: '地址已复制',
              icon: 'success'
            });
          }
        });
        break;
    }
  },

  // 查看团队成员详情
  viewTeamMember(e) {
    const member = e.currentTarget.dataset.member;
    
    wx.showModal({
      title: member.name,
      content: `职位：${member.position}\n经验：${member.experience}\n\n致力于为用户提供最优质的医疗服务体验。`,
      showCancel: false
    });
  },

  // 查看二维码
  viewQRCode(e) {
    const platform = e.currentTarget.dataset.platform;
    
    wx.showModal({
      title: `关注${platform}`,
      content: '请使用微信扫一扫功能扫描二维码关注我们',
      showCancel: false
    });
  },

  // 分享应用
  onShareAppMessage() {
    return {
      title: '健康守护 - 专业的上门医疗服务',
      path: '/pages/home/index',
      imageUrl: ''
    };
  },

  // 查看更新日志
  viewChangeLog() {
    const changelog = `v1.0.0 (2024-01-01)
• 首次发布
• 支持上门医疗预约
• 健康档案管理
• 社区互动功能
• 完善的用户体系

后续版本将持续优化用户体验，增加更多实用功能。`;

    wx.showModal({
      title: '更新日志',
      content: changelog,
      showCancel: false
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们严格遵守相关法律法规，保护用户隐私安全。详细内容请查看完整版隐私政策。',
      showCancel: false
    });
  },

  // 查看用户协议
  viewUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '使用本应用即表示您同意我们的服务条款。详细内容请查看完整版用户协议。',
      showCancel: false
    });
  },

  // 意见反馈
  feedback() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  // 帮助中心
  help() {
    wx.navigateTo({
      url: '/pages/help/index'
    });
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({
      title: '检查中...'
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '已是最新版本',
        icon: 'success'
      });
    }, 1500);
  }
});