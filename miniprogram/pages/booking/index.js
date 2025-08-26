// pages/booking/index.js
const app = getApp();

Page({
  data: {
    currentStep: 1,
    
    // 服务类型
    serviceTypes: [
      {
        id: 1,
        name: '基础健康监测',
        price: 100,
        description: '血压、血糖、体温等基础指标检测，适合日常健康维护',
        features: ['血压测量', '血糖检测', '体温监测', '基础咨询']
      },
      {
        id: 2,
        name: '综合健康评估',
        price: 200,
        description: '全面健康状况评估和建议，包含多项检查项目',
        features: ['全面体检', '健康评估', '专业建议', '报告解读']
      },
      {
        id: 3,
        name: '康复指导',
        price: 150,
        description: '专业康复师上门指导，制定个性化康复方案',
        features: ['康复评估', '运动指导', '康复训练', '跟踪服务']
      },
      {
        id: 4,
        name: '慢病管理',
        price: 180,
        description: '糖尿病、高血压等慢性疾病专项管理服务',
        features: ['病情监测', '用药指导', '生活建议', '定期随访']
      }
    ],
    
    selectedService: {},
    selectedDate: '',
    selectedTime: '',
    selectedAddress: {},
    selectedPayment: 'wechat',
    specialNeeds: '',
    agreedToTerms: false,
    
    // 可选日期
    availableDates: [],
    
    // 时间段
    timeSlots: [
      { time: '08:00-09:00', available: true },
      { time: '09:00-10:00', available: true },
      { time: '10:00-11:00', available: false },
      { time: '11:00-12:00', available: true },
      { time: '14:00-15:00', available: true },
      { time: '15:00-16:00', available: true },
      { time: '16:00-17:00', available: false },
      { time: '17:00-18:00', available: true }
    ],
    
    // 地址列表
    addressList: [],
    
    // 地址编辑相关
    showAddressModal: false,
    editingAddress: {}
  },

  onLoad: function() {
    this.initAvailableDates();
    this.loadAddressList();
  },

  // 初始化可选日期（未来7天）
  initAvailableDates() {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = app.formatDate(date);
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayText = i === 0 ? '今天' : i === 1 ? '明天' : dayNames[date.getDay()];
      const dateText = `${date.getMonth() + 1}/${date.getDate()}`;
      
      dates.push({
        date: dateStr,
        dayText: dayText,
        dateText: dateText
      });
    }
    
    this.setData({
      availableDates: dates
    });
  },

  // 加载地址列表
  loadAddressList() {
    // 模拟从后台获取用户地址列表
    const mockAddresses = [
      {
        id: 1,
        contactName: '张三',
        contactPhone: '138****5678',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园南区科苑路66号'
      }
    ];
    
    this.setData({
      addressList: mockAddresses
    });
  },

  // 选择服务类型
  selectService(e) {
    const service = e.currentTarget.dataset.service;
    this.setData({
      selectedService: service
    });
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({
      selectedDate: date
    });
  },

  // 选择时间
  selectTime(e) {
    const time = e.currentTarget.dataset.time;
    // 检查时间段是否可用
    const timeSlot = this.data.timeSlots.find(slot => slot.time === time);
    if (!timeSlot.available) {
      wx.showToast({
        title: '该时间段已被预约',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      selectedTime: time
    });
  },

  // 选择地址
  selectAddress(e) {
    const address = e.currentTarget.dataset.address;
    this.setData({
      selectedAddress: address
    });
  },

  // 选择支付方式
  selectPayment(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({
      selectedPayment: method
    });
  },

  // 特殊需求输入
  onSpecialNeedsInput(e) {
    this.setData({
      specialNeeds: e.detail.value
    });
  },

  // 同意协议
  toggleAgreement() {
    this.setData({
      agreedToTerms: !this.data.agreedToTerms
    });
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep === 1) {
      if (!this.data.selectedService.id) {
        wx.showToast({
          title: '请选择服务类型',
          icon: 'none'
        });
        return;
      }
    } else if (this.data.currentStep === 2) {
      if (!this.data.selectedDate) {
        wx.showToast({
          title: '请选择服务日期',
          icon: 'none'
        });
        return;
      }
      if (!this.data.selectedTime) {
        wx.showToast({
          title: '请选择服务时间',
          icon: 'none'
        });
        return;
      }
      if (!this.data.selectedAddress.id) {
        wx.showToast({
          title: '请选择服务地址',
          icon: 'none'
        });
        return;
      }
    }
    
    this.setData({
      currentStep: this.data.currentStep + 1
    });
  },

  // 上一步
  prevStep() {
    this.setData({
      currentStep: this.data.currentStep - 1
    });
  },

  // 新增地址
  addAddress() {
    this.setData({
      showAddressModal: true,
      editingAddress: {
        contactName: '',
        contactPhone: '',
        province: '',
        city: '',
        district: '',
        detail: ''
      }
    });
  },

  // 编辑地址
  editAddress(e) {
    e.stopPropagation();
    const address = e.currentTarget.dataset.address;
    this.setData({
      showAddressModal: true,
      editingAddress: { ...address }
    });
  },

  // 关闭地址弹窗
  closeAddressModal() {
    this.setData({
      showAddressModal: false,
      editingAddress: {}
    });
  },

  // 地址输入
  onAddressInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`editingAddress.${field}`]: value
    });
  },

  // 地区选择
  onRegionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({
      'editingAddress.province': province,
      'editingAddress.city': city,
      'editingAddress.district': district
    });
  },

  // 保存地址
  saveAddress() {
    const address = this.data.editingAddress;
    
    // 验证必填字段
    if (!address.contactName || !address.contactPhone || !address.province || !address.detail) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(address.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    let addressList = [...this.data.addressList];
    
    if (address.id) {
      // 编辑现有地址
      const index = addressList.findIndex(item => item.id === address.id);
      if (index !== -1) {
        addressList[index] = address;
      }
    } else {
      // 新增地址
      address.id = Date.now();
      addressList.push(address);
    }

    this.setData({
      addressList: addressList,
      showAddressModal: false,
      editingAddress: {}
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 查看服务协议
  viewServiceAgreement() {
    wx.showModal({
      title: '服务协议',
      content: '这里是服务协议的详细内容...',
      showCancel: false
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的详细内容...',
      showCancel: false
    });
  },

  // 提交预约
  submitBooking() {
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意服务协议',
        icon: 'none'
      });
      return;
    }

    const bookingData = {
      service: this.data.selectedService,
      date: this.data.selectedDate,
      time: this.data.selectedTime,
      address: this.data.selectedAddress,
      payment: this.data.selectedPayment,
      specialNeeds: this.data.specialNeeds,
      createTime: new Date().toISOString()
    };

    if (this.data.selectedPayment === 'wechat') {
      this.processWechatPayment(bookingData);
    } else {
      this.processOfflineBooking(bookingData);
    }
  },

  // 处理微信支付
  processWechatPayment(bookingData) {
    wx.showLoading({
      title: '正在发起支付...'
    });

    // 模拟调用支付接口
    setTimeout(() => {
      wx.hideLoading();
      
      // 模拟支付成功
      wx.showModal({
        title: '支付成功',
        content: '预约已确认，我们会尽快安排医护人员与您联系',
        showCancel: false,
        success: () => {
          this.navigateToServiceRecord();
        }
      });
    }, 2000);
  },

  // 处理到场支付预约
  processOfflineBooking(bookingData) {
    wx.showLoading({
      title: '正在提交预约...'
    });

    // 模拟提交预约
    setTimeout(() => {
      wx.hideLoading();
      
      wx.showModal({
        title: '预约成功',
        content: '预约已确认，请在服务时准备好现金支付',
        showCancel: false,
        success: () => {
          this.navigateToServiceRecord();
        }
      });
    }, 1500);
  },

  // 导航到服务记录
  navigateToServiceRecord() {
    wx.redirectTo({
      url: '/pages/service-record/index'
    });
  },

  // 计算是否可以提交
  get canSubmit() {
    return this.data.selectedService.id && 
           this.data.selectedDate && 
           this.data.selectedTime && 
           this.data.selectedAddress.id && 
           this.data.selectedPayment && 
           this.data.agreedToTerms;
  },

  onShow() {
    // 更新提交按钮状态
    this.setData({
      canSubmit: this.canSubmit
    });
  }
});