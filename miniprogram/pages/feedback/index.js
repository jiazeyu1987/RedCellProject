// 意见反馈页面
Page({
  data: {
    feedbackTypes: [
      { value: 'bug', name: '问题反馈', icon: '🐛' },
      { value: 'suggestion', name: '功能建议', icon: '💡' },
      { value: 'service', name: '服务体验', icon: '⭐' },
      { value: 'other', name: '其他意见', icon: '💬' }
    ],
    selectedType: '',
    feedbackContent: '',
    contactInfo: '',
    images: [],
    submitting: false,
    feedbackHistory: []
  },

  onLoad() {
    this.loadFeedbackHistory();
  },

  // 加载反馈历史
  loadFeedbackHistory() {
    const history = wx.getStorageSync('feedbackHistory') || [];
    this.setData({ feedbackHistory: history });
  },

  // 选择反馈类型
  selectFeedbackType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ selectedType: type });
  },

  // 输入反馈内容
  onContentInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({
      contactInfo: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    const currentImages = this.data.images;
    const remainingCount = 9 - currentImages.length;
    
    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remainingCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...currentImages, ...res.tempFilePaths];
        this.setData({ images: newImages });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current: current,
      urls: this.data.images
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.selectedType) {
      wx.showToast({
        title: '请选择反馈类型',
        icon: 'none'
      });
      return;
    }

    if (!this.data.feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    if (this.data.feedbackContent.trim().length < 10) {
      wx.showToast({
        title: '反馈内容至少10个字符',
        icon: 'none'
      });
      return;
    }

    // 验证联系方式（如果填写了）
    if (this.data.contactInfo && !this.isValidContact(this.data.contactInfo)) {
      wx.showToast({
        title: '请输入正确的联系方式',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    // 模拟提交过程
    setTimeout(() => {
      this.processFeedback();
    }, 2000);
  },

  // 验证联系方式
  isValidContact(contact) {
    // 手机号验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    // 邮箱验证
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // QQ号验证
    const qqRegex = /^[1-9]\d{4,10}$/;
    
    return phoneRegex.test(contact) || emailRegex.test(contact) || qqRegex.test(contact);
  },

  // 处理反馈提交
  processFeedback() {
    const feedback = {
      id: Date.now(),
      type: this.data.selectedType,
      typeName: this.data.feedbackTypes.find(t => t.value === this.data.selectedType)?.name,
      content: this.data.feedbackContent,
      contact: this.data.contactInfo,
      imageCount: this.data.images.length,
      submitTime: new Date().toISOString(),
      status: 'submitted'
    };

    // 保存到历史记录
    const history = this.data.feedbackHistory;
    history.unshift(feedback);
    wx.setStorageSync('feedbackHistory', history);

    this.setData({
      submitting: false,
      feedbackHistory: history
    });

    // 清空表单
    this.resetForm();

    wx.showModal({
      title: '提交成功',
      content: '感谢您的反馈！我们会认真处理您的意见，并在3个工作日内给予回复。',
      showCancel: false,
      success: () => {
        // 可选择是否返回上一页
        // wx.navigateBack();
      }
    });
  },

  // 重置表单
  resetForm() {
    this.setData({
      selectedType: '',
      feedbackContent: '',
      contactInfo: '',
      images: []
    });
  },

  // 查看反馈详情
  viewFeedbackDetail(e) {
    const feedback = e.currentTarget.dataset.feedback;
    
    let content = `类型：${feedback.typeName}\n`;
    content += `时间：${this.formatDate(feedback.submitTime)}\n`;
    content += `状态：${this.getStatusText(feedback.status)}\n\n`;
    content += `内容：\n${feedback.content}`;
    
    if (feedback.contact) {
      content += `\n\n联系方式：${feedback.contact}`;
    }
    
    if (feedback.imageCount > 0) {
      content += `\n\n图片：${feedback.imageCount}张`;
    }

    wx.showModal({
      title: '反馈详情',
      content: content,
      showCancel: false
    });
  },

  // 删除反馈记录
  deleteFeedback(e) {
    e.stopPropagation();
    const feedbackId = e.currentTarget.dataset.id;
    const feedback = this.data.feedbackHistory.find(f => f.id === feedbackId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条反馈记录吗？`,
      success: (res) => {
        if (res.confirm) {
          const history = this.data.feedbackHistory.filter(f => f.id !== feedbackId);
          wx.setStorageSync('feedbackHistory', history);
          this.setData({ feedbackHistory: history });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天 ' + date.toTimeString().slice(0, 5);
    } else if (days === 1) {
      return '昨天 ' + date.toTimeString().slice(0, 5);
    } else if (days < 7) {
      return days + '天前';
    } else {
      return date.toISOString().slice(0, 10);
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'submitted': '已提交',
      'processing': '处理中',
      'replied': '已回复',
      'closed': '已关闭'
    };
    return statusMap[status] || status;
  },

  // 获取反馈类型图标
  getFeedbackTypeIcon(type) {
    const feedbackType = this.data.feedbackTypes.find(t => t.value === type);
    return feedbackType ? feedbackType.icon : '💬';
  },

  // 联系客服
  contactCustomerService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-888-8888\n工作时间：9:00-18:00\n\n您也可以直接拨打电话联系我们',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888'
          });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFeedbackHistory();
    wx.stopPullDownRefresh();
  }
});