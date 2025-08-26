// pages/community/index.js
Page({
  data: {
    activeTab: 'posts',
    
    // 用户动态
    postList: [
      {
        id: 1,
        userName: '张大爷',
        userAvatar: '👨',
        content: '今天的健康监测结果很好，血压比上次有所改善，感谢医护人员的专业服务！大家也要注意定期检查身体哦~',
        createTime: '2小时前',
        likes: 12,
        comments: 3,
        images: []
      },
      {
        id: 2,
        userName: '李奶奶',
        userAvatar: '👩',
        content: '和大家分享一个好消息，通过健康守护的绿色通道，成功预约到了心内科专家号！服务真的很贴心。',
        createTime: '5小时前',
        likes: 8,
        comments: 5,
        images: ['📷']
      },
      {
        id: 3,
        userName: '王师傅',
        userAvatar: '👩‍⚕️',
        content: '上门服务真的很方便，医生很专业，测量过程很仔细，还给了很多健康建议。推荐给有需要的朋友们！',
        createTime: '1天前',
        likes: 15,
        comments: 7,
        images: []
      }
    ],
    
    // 健康知识
    knowledgeList: [
      {
        id: 1,
        title: '高血压患者的日常饮食注意事项',
        summary: '高血压是常见的慢性疾病，通过合理的饮食调理可以有效控制血压，改善生活质量...',
        cover: '🥗',
        author: '李医生',
        readCount: 128
      },
      {
        id: 2,
        title: '老年人如何预防心血管疾病',
        summary: '心血管疾病是老年人的主要健康威胁之一，通过早期预防和科学管理可以大大降低风险...',
        cover: '❤️',
        author: '王医生',
        readCount: 89
      },
      {
        id: 3,
        title: '糖尿病患者的运动指导',
        summary: '适度的运动对糖尿病患者控制血糖非常重要，但需要选择合适的运动方式和强度...',
        cover: '🏃',
        author: '张医生',
        readCount: 156
      }
    ],
    
    // 问答
    qaList: [
      {
        id: 1,
        question: '我最近血压有点高，平时需要注意什么？',
        answer: '建议您：1.控制盐分摄入，每日不超过6g；2.适度运动，如散步、太极；3.保持心情舒畅；4.定期监测血压。如果持续偏高，建议及时就医。',
        doctorName: '李医生',
        createTime: '昨天',
        status: 'answered',
        statusText: '已回复'
      },
      {
        id: 2,
        question: '老人家腿脚不便，上门服务都包括哪些检查项目？',
        answer: '我们的上门服务包括：基础生命体征监测（血压、心率、体温）、血糖检测、简单的体格检查、健康咨询指导等。具体项目可根据您的需求定制。',
        doctorName: '王护士',
        createTime: '2天前',
        status: 'answered',
        statusText: '已回复'
      },
      {
        id: 3,
        question: '预约服务后大概多久能安排医护人员上门？',
        answer: '',
        createTime: '3小时前',
        status: 'pending',
        statusText: '等待回复'
      }
    ]
  },

  onLoad: function() {
    this.loadData();
  },

  // 加载数据
  loadData() {
    // 根据当前tab加载相应数据
    switch (this.data.activeTab) {
      case 'posts':
        this.loadPosts();
        break;
      case 'knowledge':
        this.loadKnowledge();
        break;
      case 'qa':
        this.loadQA();
        break;
    }
  },

  // 加载用户动态
  loadPosts() {
    // 模拟加载数据
    console.log('加载用户动态');
  },

  // 加载健康知识
  loadKnowledge() {
    // 模拟加载数据
    console.log('加载健康知识');
  },

  // 加载问答
  loadQA() {
    // 模拟加载数据
    console.log('加载问答');
  },

  // 切换tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    this.loadData();
  },

  // 发布内容
  publish() {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/index'
      });
      return;
    }

    wx.showActionSheet({
      itemList: ['发布动态', '提问咨询'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.publishPost();
        } else if (res.tapIndex === 1) {
          this.publishQuestion();
        }
      }
    });
  },

  // 发布动态
  publishPost() {
    wx.navigateTo({
      url: '/pages/publish-post/index'
    });
  },

  // 发布问题
  publishQuestion() {
    wx.navigateTo({
      url: '/pages/publish-question/index'
    });
  },

  // 查看帖子详情
  viewPost(e) {
    const post = e.currentTarget.dataset.post;
    wx.navigateTo({
      url: `/pages/post-detail/index?id=${post.id}`
    });
  },

  // 查看健康知识详情
  viewKnowledge(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/knowledge-detail/index?id=${item.id}`
    });
  },

  // 查看问答详情
  viewQA(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/qa-detail/index?id=${item.id}`
    });
  },

  // 点赞帖子
  likePost(e) {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    
    const postList = this.data.postList.map(post => {
      if (post.id === id) {
        return {
          ...post,
          likes: post.likes + 1
        };
      }
      return post;
    });
    
    this.setData({
      postList: postList
    });
    
    wx.showToast({
      title: '已点赞',
      icon: 'success',
      duration: 1000
    });
  },

  // 评论帖子
  commentPost(e) {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/index?id=${id}&action=comment`
    });
  },

  // 预览图片
  previewImage(e) {
    e.stopPropagation();
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;
    
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom() {
    wx.showToast({
      title: '加载更多...',
      icon: 'loading',
      duration: 1000
    });
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '健康守护社区 - 分享健康生活',
      path: '/pages/community/index'
    };
  }
});