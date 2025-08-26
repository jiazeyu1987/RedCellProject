// pages/booking-history/index.js
const app = getApp();

Page({
  data: {
    bookingList: [],
    filteredBookings: [],
    statusFilter: 'all', // all, pending, completed, cancelled
    loading: false
  },

  onLoad: function() {
    this.loadBookingHistory();
  },

  onShow: function() {
    this.loadBookingHistory();
  },

  // 加载预约历史
  loadBookingHistory() {
    this.setData({ loading: true });
    
    // 模拟API调用
    setTimeout(() => {
      const mockData = [
        {
          id: 1,
          serviceType: '基础健康监测',
          serviceDate: '2024-01-15',
          serviceTime: '09:00-10:00',
          address: '深圳市南山区科技园南区科苑路66号',
          price: 100,
          status: 'completed',
          statusText: '已完成',
          createTime: '2024-01-10 14:30',
          nurseInfo: {
            name: '李护士',
            title: '主管护师',
            phone: '138****5678'
          }
        },
        {
          id: 2,
          serviceType: '综合健康评估',
          serviceDate: '2024-01-20',
          serviceTime: '14:00-15:00',
          address: '深圳市南山区科技园南区科苑路66号',
          price: 200,
          status: 'pending',
          statusText: '待服务',
          createTime: '2024-01-18 10:15'
        },
        {
          id: 3,
          serviceType: '康复指导',
          serviceDate: '2024-01-08',
          serviceTime: '15:00-16:00',
          address: '深圳市南山区科技园南区科苑路66号',
          price: 150,
          status: 'cancelled',
          statusText: '已取消',
          createTime: '2024-01-05 16:20',
          cancelReason: '临时有事，需要取消预约'
        }
      ];

      this.setData({
        bookingList: mockData,
        loading: false
      });
      this.updateFilteredBookings();
    }, 1000);
  },

  // 筛选状态
  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      statusFilter: status
    });
    this.updateFilteredBookings();
  },

  // 更新筛选结果
  updateFilteredBookings() {
    let filteredBookings;
    if (this.data.statusFilter === 'all') {
      filteredBookings = this.data.bookingList;
    } else {
      filteredBookings = this.data.bookingList.filter(item => item.status === this.data.statusFilter);
    }
    this.setData({ filteredBookings });
  },

  // 查看预约详情
  viewDetail(e) {
    const booking = e.currentTarget.dataset.booking;
    wx.showModal({
      title: '预约详情',
      content: `服务类型：${booking.serviceType}\n服务时间：${booking.serviceDate} ${booking.serviceTime}\n服务地址：${booking.address}\n费用：¥${booking.price}`,
      showCancel: false
    });
  },

  // 取消预约
  cancelBooking(e) {
    e.stopPropagation();
    const bookingId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      success: (res) => {
        if (res.confirm) {
          this.performCancel(bookingId);
        }
      }
    });
  },

  // 执行取消操作
  performCancel(bookingId) {
    wx.showLoading({ title: '取消中...' });
    
    // 模拟API调用
    setTimeout(() => {
      const bookingList = this.data.bookingList.map(item => {
        if (item.id === bookingId) {
          return {
            ...item,
            status: 'cancelled',
            statusText: '已取消',
            cancelReason: '用户主动取消'
          };
        }
        return item;
      });

      this.setData({ bookingList });
      this.updateFilteredBookings();
      wx.hideLoading();
      wx.showToast({
        title: '已取消预约',
        icon: 'success'
      });
    }, 1000);
  },

  // 联系医护人员
  contactNurse(e) {
    e.stopPropagation();
    const nurse = e.currentTarget.dataset.nurse;
    
    wx.showActionSheet({
      itemList: ['拨打电话', '发送短信'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({
            phoneNumber: nurse.phone.replace(/\*/g, '5')
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '短信功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 重新预约
  rebookService(e) {
    e.stopPropagation();
    const booking = e.currentTarget.dataset.booking;
    
    wx.showModal({
      title: '重新预约',
      content: '是否重新预约该服务？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/booking/index'
          });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadBookingHistory();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});