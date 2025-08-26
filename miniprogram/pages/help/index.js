// 帮助中心页面
Page({
  data: {
    searchKeyword: '',
    currentCategory: 'all',
    expandedFaq: null,
    categories: [
      { id: 'all', name: '全部', icon: '📚' },
      { id: 'booking', name: '预约服务', icon: '📅' },
      { id: 'payment', name: '支付相关', icon: '💳' },
      { id: 'account', name: '账户问题', icon: '👤' },
      { id: 'service', name: '服务流程', icon: '🏥' },
      { id: 'other', name: '其他问题', icon: '❓' }
    ],
    faqs: [
      {
        id: 1,
        category: 'booking',
        question: '如何预约医护上门服务？',
        answer: '1. 在首页点击"立即预约"按钮\n2. 选择需要的服务类型\n3. 选择合适的服务时间\n4. 填写服务地址信息\n5. 选择支付方式并完成预约\n6. 等待医护人员联系确认',
        isHot: true,
        views: 1250
      },
      {
        id: 2,
        category: 'booking',
        question: '可以为家人预约服务吗？',
        answer: '当然可以！您可以：\n1. 在个人中心添加家庭成员信息\n2. 预约时选择为家庭成员预约\n3. 填写家人的详细健康信息\n4. 医护人员会根据家人情况提供专业服务',
        isHot: true,
        views: 980
      },
      {
        id: 3,
        category: 'booking',
        question: '预约后可以取消或修改吗？',
        answer: '可以取消或修改预约：\n• 服务开始前24小时：免费取消\n• 服务开始前2-24小时：收取20%手续费\n• 服务开始前2小时内：收取50%手续费\n\n修改预约请联系客服：400-888-8888',
        isHot: false,
        views: 756
      },
      {
        id: 4,
        category: 'payment',
        question: '支持哪些支付方式？',
        answer: '我们支持多种支付方式：\n• 微信支付（推荐）\n• 支付宝支付\n• 银行卡支付\n• 现金支付（到场付费）\n\n线上支付享受优惠价格，建议选择微信支付。',
        isHot: true,
        views: 1156
      },
      {
        id: 5,
        category: 'payment',
        question: '如何申请退款？',
        answer: '退款流程：\n1. 在服务记录中找到对应订单\n2. 点击"申请退款"按钮\n3. 填写退款原因\n4. 提交申请等待审核\n5. 审核通过后1-3个工作日到账\n\n注意：服务已开始的订单不支持退款。',
        isHot: false,
        views: 445
      },
      {
        id: 6,
        category: 'account',
        question: '如何修改个人信息？',
        answer: '修改个人信息步骤：\n1. 进入个人中心页面\n2. 点击头像或"编辑资料"\n3. 修改需要更新的信息\n4. 保存修改\n\n如需修改手机号，请联系客服验证身份。',
        isHot: false,
        views: 623
      },
      {
        id: 7,
        category: 'account',
        question: '忘记密码怎么办？',
        answer: '重置密码方法：\n1. 在登录页面点击"忘记密码"\n2. 输入注册时的手机号\n3. 获取验证码\n4. 设置新密码\n5. 完成重置\n\n如果手机号已更换，请联系客服处理。',
        isHot: false,
        views: 334
      },
      {
        id: 8,
        category: 'service',
        question: '医护人员的资质如何保证？',
        answer: '我们严格把控医护人员资质：\n• 持有国家认可的执业资格证\n• 3年以上临床工作经验\n• 通过平台专业培训和考核\n• 定期参加继续教育\n• 用户评价和监督机制\n\n您可以在服务前查看医护人员的详细资料。',
        isHot: true,
        views: 1789
      },
      {
        id: 9,
        category: 'service',
        question: '服务过程中遇到问题怎么办？',
        answer: '遇到问题时可以：\n1. 直接与现场医护人员沟通\n2. 拨打客服热线：400-888-8888\n3. 在APP内联系在线客服\n4. 使用"意见反馈"功能\n\n我们会第一时间为您解决问题。',
        isHot: false,
        views: 567
      },
      {
        id: 10,
        category: 'other',
        question: '服务区域有哪些？',
        answer: '目前服务覆盖区域：\n• 一线城市：北京、上海、广州、深圳\n• 二线城市：杭州、南京、武汉、成都等\n• 正在快速扩展到更多城市\n\n具体可服务区域请在预约时查看，我们会不断扩大服务范围。',
        isHot: false,
        views: 892
      }
    ],
    filteredFaqs: [],
    hotFaqs: [],
    contactMethods: [
      {
        type: 'phone',
        title: '客服热线',
        content: '400-888-8888',
        desc: '工作时间：9:00-21:00',
        icon: '📞'
      },
      {
        type: 'online',
        title: '在线客服',
        content: '7×24小时在线',
        desc: '即时响应，快速解答',
        icon: '💬'
      },
      {
        type: 'email',
        title: '邮件咨询',
        content: 'service@health.com',
        desc: '详细问题可发送邮件',
        icon: '📧'
      }
    ]
  },

  onLoad() {
    this.initData();
  },

  // 初始化数据
  initData() {
    this.filterFaqs();
    this.loadHotFaqs();
  },

  // 筛选FAQ
  filterFaqs() {
    let faqs = this.data.faqs;
    
    // 按分类筛选
    if (this.data.currentCategory !== 'all') {
      faqs = faqs.filter(faq => faq.category === this.data.currentCategory);
    }
    
    // 按关键词搜索
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      faqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(keyword) || 
        faq.answer.toLowerCase().includes(keyword)
      );
    }
    
    this.setData({ filteredFaqs: faqs });
  },

  // 加载热门问题
  loadHotFaqs() {
    const hotFaqs = this.data.faqs
      .filter(faq => faq.isHot)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    
    this.setData({ hotFaqs });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ 
      searchKeyword: e.detail.value 
    });
    this.filterFaqs();
  },

  // 清空搜索
  clearSearch() {
    this.setData({ 
      searchKeyword: '' 
    });
    this.filterFaqs();
  },

  // 选择分类
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ 
      currentCategory: categoryId,
      expandedFaq: null
    });
    this.filterFaqs();
  },

  // 展开/收起FAQ
  toggleFaq(e) {
    const faqId = e.currentTarget.dataset.id;
    const expandedFaq = this.data.expandedFaq === faqId ? null : faqId;
    this.setData({ expandedFaq });
    
    // 增加查看次数
    if (expandedFaq) {
      this.increaseFaqViews(faqId);
    }
  },

  // 增加FAQ查看次数
  increaseFaqViews(faqId) {
    const faqs = this.data.faqs.map(faq => {
      if (faq.id === faqId) {
        return { ...faq, views: faq.views + 1 };
      }
      return faq;
    });
    
    this.setData({ faqs });
    this.filterFaqs();
  },

  // 联系客服
  contactCustomerService(e) {
    const type = e.currentTarget.dataset.type;
    
    switch (type) {
      case 'phone':
        wx.makePhoneCall({
          phoneNumber: '4008888888'
        });
        break;
        
      case 'online':
        wx.showToast({
          title: '正在连接客服...',
          icon: 'loading'
        });
        // 这里可以跳转到客服聊天页面
        setTimeout(() => {
          wx.showToast({
            title: '客服功能开发中',
            icon: 'none'
          });
        }, 1500);
        break;
        
      case 'email':
        wx.setClipboardData({
          data: 'service@health.com',
          success: () => {
            wx.showToast({
              title: '邮箱地址已复制',
              icon: 'success'
            });
          }
        });
        break;
    }
  },

  // 反馈问题
  feedbackIssue() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  // 获取分类名称
  getCategoryName(categoryId) {
    const category = this.data.categories.find(cat => cat.id === categoryId);
    return category ? category.name : '';
  },

  // 分享FAQ
  shareFaq(e) {
    e.stopPropagation();
    const faq = e.currentTarget.dataset.faq;
    
    wx.showShareMenu({
      withShareTicket: true
    });
    
    // 可以自定义分享内容
    this.onShareAppMessage = () => {
      return {
        title: faq.question,
        path: `/pages/help/index?faqId=${faq.id}`,
        imageUrl: ''
      };
    };
    
    wx.showToast({
      title: '长按可分享',
      icon: 'none'
    });
  },

  // 复制FAQ内容
  copyFaq(e) {
    e.stopPropagation();
    const faq = e.currentTarget.dataset.faq;
    const content = `${faq.question}\n\n${faq.answer}`;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '内容已复制',
          icon: 'success'
        });
      }
    });
  }
});