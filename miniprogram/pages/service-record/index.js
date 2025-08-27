// pages/service-record/index.js
Page({
  data: {
    statusFilter: 'all',
    serviceRecords: [
      {
        id: 1,
        serviceType: '基础健康监测',
        serviceDate: '2024-12-25',
        serviceTime: '09:30-10:30',
        address: '深圳市南山区科技园南区科苑路66号',
        price: 100,
        status: 'completed',
        statusText: '已完成',
        nurseInfo: {
          name: '张护士',
          title: '主管护师',
          phone: '138****5678'
        },
        hasReport: true,
        hasVideo: true,
        rated: false
      },
      {
        id: 2,
        serviceType: '综合健康评估',
        serviceDate: '2024-12-28',
        serviceTime: '14:00-15:00',
        address: '深圳市南山区科技园南区科苑路66号',
        price: 200,
        status: 'scheduled',
        statusText: '已预约',
        nurseInfo: {
          name: '李医生',
          title: '主治医师',
          phone: '139****1234'
        }
      },
      {
        id: 3,
        serviceType: '康复指导',
        serviceDate: '2024-12-20',
        serviceTime: '10:00-11:00',
        address: '深圳市南山区科技园南区科苑路66号',
        price: 150,
        status: 'cancelled',
        statusText: '已取消'
      }
    ],
    filteredRecords: []
  },

  onLoad: function() {
    this.filterRecords();
  },

  // 根据状态筛选记录
  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      statusFilter: status
    });
    this.filterRecords();
  },

  // 筛选记录
  filterRecords() {
    let filtered = this.data.serviceRecords;
    
    if (this.data.statusFilter !== 'all') {
      filtered = this.data.serviceRecords.filter(record => 
        record.status === this.data.statusFilter
      );
    }
    
    this.setData({
      filteredRecords: filtered
    });
  },

  // 查看详情
  viewDetail(e) {
    const record = e.currentTarget.dataset.record;
    wx.navigateTo({
      url: `/pages/service-detail/index?id=${record.id}`
    });
  },

  // 查看报告
  viewReport(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/health-report/index?serviceId=${id}`
    });
  },

  // 观看录像
  watchVideo(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/service-video/index?serviceId=${id}`
    });
  },

  // 评价服务
  rateService(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/service-rating/index?serviceId=${id}`
    });
  },

  // 联系医护人员
  contactNurse(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const nurse = e.currentTarget.dataset.nurse;
    
    wx.showModal({
      title: '联系医护人员',
      content: `${nurse.name} ${nurse.title}\n电话：${nurse.phone}`,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: nurse.phone.replace(/\*/g, '1')
          });
        }
      }
    });
  },

  // 取消服务
  cancelService(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这次服务吗？取消后不可恢复',
      confirmText: '确认取消',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.performCancelService(id);
        }
      }
    });
  },

  // 执行取消服务
  performCancelService(id) {
    wx.showLoading({
      title: '取消中...'
    });

    // 模拟取消操作
    setTimeout(() => {
      const records = this.data.serviceRecords.map(record => {
        if (record.id === id) {
          return {
            ...record,
            status: 'cancelled',
            statusText: '已取消'
          };
        }
        return record;
      });

      this.setData({
        serviceRecords: records
      });

      this.filterRecords();
      wx.hideLoading();
      
      wx.showToast({
        title: '已取消服务',
        icon: 'success'
      });
    }, 1500);
  },

  // 去预约页面
  goToBooking() {
    wx.switchTab({
      url: '/pages/booking/index'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.filterRecords();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});