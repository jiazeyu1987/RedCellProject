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
  async loadBookingHistory() {
    this.setData({ loading: true });
    
    try {
      // 检查用户登录状态
      const app = getApp();
      if (!app.globalData.isLoggedIn) {
        // 如果用户未登录，显示空状态
        this.setData({
          bookingList: [],
          loading: false
        });
        this.updateFilteredBookings();
        return;
      }
      
      console.log('历史记录页面：开始调用API获取预约列表');
      
      // 调用服务器API获取预约列表
      const { API, http, getTestToken } = require('../../config/api.js');
      
      // 确保有token
      let token = wx.getStorageSync('token');
      if (!token) {
        console.log('历史记录页面：未找到token，开始获取测试token...');
        await getTestToken();
      }
      
      const result = await http.get(API.SERVICE.HISTORY);
      
      console.log('历史记录页面：API响应', result);
      
      if (result.success && result.data.bookings) {
        // 将后端数据转换为前端格式
        const bookingList = result.data.bookings.map(booking => {
          // 服务类型翻译
          const serviceTypeMap = {
            'basic_health': '基础健康监测',
            'comprehensive_health': '综合健康评估',
            'home_care': '康复指导',
            'emergency_care': '慢病管理'
          };
          
          // 状态翻译
          const statusMap = {
            'pending': { text: '待服务', status: 'pending' },
            'confirmed': { text: '已确认', status: 'confirmed' },
            'in_progress': { text: '服务中', status: 'in_progress' },
            'completed': { text: '已完成', status: 'completed' },
            'cancelled': { text: '已取消', status: 'cancelled' }
          };
          
          const statusInfo = statusMap[booking.status] || { text: '未知状态', status: 'unknown' };
          
          return {
            id: booking.id,
            serviceType: serviceTypeMap[booking.serviceType] || booking.serviceType,
            serviceDate: booking.serviceDate,
            serviceTime: booking.serviceTime,
            address: '数据库地址', // 后端暂未返回地址信息
            price: booking.totalAmount,
            status: statusInfo.status,
            statusText: statusInfo.text,
            createTime: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : '',
            notes: booking.notes
          };
        });
        
        this.setData({
          bookingList: bookingList,
          loading: false
        });
        
        console.log('历史记录页面：预约列表加载成功', bookingList);
        
      } else {
        console.log('历史记录页面：API返回数据格式错误，使用模拟数据');
        this.loadMockData();
      }
      
      this.updateFilteredBookings();
      
    } catch (error) {
      console.error('历史记录页面：获取预约历史失败', error);
      
      // API调用失败时显示提示并使用模拟数据
      wx.showToast({
        title: '无法连接服务器，显示模拟数据',
        icon: 'none',
        duration: 3000
      });
      
      this.loadMockData();
      this.updateFilteredBookings();
    }
  },
  
  // 加载模拟数据（作为备用）
  loadMockData() {
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
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
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
  async performCancel(bookingId) {
    try {
      wx.showLoading({ title: '取消中...' });
      
      const { API, http } = require('../../config/api.js');
      
      console.log('历史记录页面：开始取消预约', bookingId);
      
      // 调用后端API取消预约
      const result = await http.put(`${API.SERVICE.BOOK}/${bookingId}/cancel`, {
        reason: '用户主动取消'
      });
      
      console.log('历史记录页面：取消API响应', result);
      
      if (result.success) {
        // API调用成功，更新本地状态
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
      } else {
        wx.hideLoading();
        wx.showToast({
          title: result.message || '取消失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('历史记录页面：取消预约失败', error);
      wx.hideLoading();
      
      // API调用失败时使用模拟流程
      wx.showModal({
        title: '网络异常',
        content: '无法连接服务器，是否使用本地模拟取消？',
        success: (res) => {
          if (res.confirm) {
            // 使用原有模拟流程
            const bookingList = this.data.bookingList.map(item => {
              if (item.id === bookingId) {
                return {
                  ...item,
                  status: 'cancelled',
                  statusText: '已取消',
                  cancelReason: '用户主动取消(本地模拟)'
                };
              }
              return item;
            });

            this.setData({ bookingList });
            this.updateFilteredBookings();
            wx.showToast({
              title: '已取消预约(本地模拟)',
              icon: 'success'
            });
          }
        }
      });
    }
  },

  // 联系医护人员
  contactNurse(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
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
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
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