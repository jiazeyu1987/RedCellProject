// pages/health-records/index.js
const { API, http, getTestToken } = require('../../config/api.js');

Page({
  data: {
    recordList: [],
    filteredRecords: [],
    typeFilter: 'all', // all, bloodPressure, bloodSugar, heartRate, weight
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad: function() {
    this.loadHealthRecords();
  },

  // 加载健康记录
  async loadHealthRecords(loadMore = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // 确保有token
      let token = wx.getStorageSync('token');
      if (!token) {
        console.log('健康记录页面：未找到token，开始获取测试token...');
        await getTestToken();
      }

      const page = loadMore ? this.data.page + 1 : 1;
      const result = await http.get(API.HEALTH.RECORDS, {
        page: page,
        limit: this.data.pageSize,
        type: this.data.typeFilter === 'all' ? undefined : this.data.typeFilter
      });

      console.log('健康记录页面：API响应', result);

      if (result.success && result.data.records) {
        const newRecords = this.formatRecords(result.data.records);
        
        let allRecords;
        if (loadMore) {
          allRecords = [...this.data.recordList, ...newRecords];
        } else {
          allRecords = newRecords;
        }

        this.setData({
          recordList: allRecords,
          page: page,
          hasMore: newRecords.length === this.data.pageSize,
          loading: false
        });

        this.updateFilteredRecords();
        
        console.log('健康记录加载成功:', allRecords);
      } else {
        console.log('服务器返回失败，使用模拟数据');
        this.loadMockData();
      }
    } catch (error) {
      console.error('健康记录页面：获取记录失败', error);
      
      wx.showToast({
        title: '无法连接服务器，显示模拟数据',
        icon: 'none',
        duration: 3000
      });
      
      this.loadMockData();
    }
  },

  // 格式化记录数据
  formatRecords(records) {
    return records.map(record => {
      const typeMap = {
        'bloodPressure': '血压',
        'bloodSugar': '血糖',
        'heartRate': '心率',
        'weight': '体重',
        'temperature': '体温'
      };

      const statusMap = {
        'normal': { text: '正常', color: '#52C41A' },
        'warning': { text: '注意', color: '#FAAD14' },
        'danger': { text: '危险', color: '#FF4D4F' }
      };

      const statusInfo = statusMap[record.status] || { text: '正常', color: '#52C41A' };
      
      // 格式化时间显示
      const recordTime = record.recordTime || record.record_time;
      const timeStr = recordTime ? new Date(recordTime).toLocaleString() : '';

      return {
        id: record.id,
        type: record.type,
        typeName: typeMap[record.type] || record.type,
        value: record.value,
        unit: record.unit || '',
        status: record.status,
        statusText: statusInfo.text,
        statusColor: statusInfo.color,
        notes: record.notes || '',
        recordTime: timeStr,
        date: timeStr.split(' ')[0],
        time: timeStr.split(' ')[1]
      };
    });
  },

  // 加载模拟数据
  loadMockData() {
    const mockRecords = [
      {
        id: 1,
        type: 'bloodPressure',
        typeName: '血压',
        value: '125/82',
        unit: 'mmHg',
        status: 'normal',
        statusText: '正常',
        statusColor: '#52C41A',
        notes: '早晨空腹测量',
        recordTime: '2024-01-27 09:30:00',
        date: '2024-01-27',
        time: '09:30:00'
      },
      {
        id: 2,
        type: 'bloodSugar',
        typeName: '血糖',
        value: '5.8',
        unit: 'mmol/L',
        status: 'normal',
        statusText: '正常',
        statusColor: '#52C41A',
        notes: '餐前血糖',
        recordTime: '2024-01-27 08:00:00',
        date: '2024-01-27',
        time: '08:00:00'
      },
      {
        id: 3,
        type: 'heartRate',
        typeName: '心率',
        value: '72',
        unit: '次/分',
        status: 'normal',
        statusText: '正常',
        statusColor: '#52C41A',
        notes: '静息心率',
        recordTime: '2024-01-26 20:15:00',
        date: '2024-01-26',
        time: '20:15:00'
      },
      {
        id: 4,
        type: 'weight',
        typeName: '体重',
        value: '65.5',
        unit: 'kg',
        status: 'normal',
        statusText: '正常',
        statusColor: '#52C41A',
        notes: '晨重',
        recordTime: '2024-01-26 07:00:00',
        date: '2024-01-26',
        time: '07:00:00'
      },
      {
        id: 5,
        type: 'bloodPressure',
        typeName: '血压',
        value: '135/88',
        unit: 'mmHg',
        status: 'warning',
        statusText: '注意',
        statusColor: '#FAAD14',
        notes: '运动后测量，偏高',
        recordTime: '2024-01-25 16:45:00',
        date: '2024-01-25',
        time: '16:45:00'
      }
    ];

    this.setData({
      recordList: mockRecords,
      loading: false,
      hasMore: false
    });

    this.updateFilteredRecords();
  },

  // 筛选记录类型
  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      typeFilter: type,
      page: 1
    });
    this.loadHealthRecords();
  },

  // 更新筛选结果
  updateFilteredRecords() {
    let filteredRecords;
    if (this.data.typeFilter === 'all') {
      filteredRecords = this.data.recordList;
    } else {
      filteredRecords = this.data.recordList.filter(item => item.type === this.data.typeFilter);
    }
    this.setData({ filteredRecords });
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const record = e.currentTarget.dataset.record;
    
    let content = `记录类型：${record.typeName}\n`;
    content += `记录值：${record.value}${record.unit}\n`;
    content += `状态：${record.statusText}\n`;
    content += `记录时间：${record.recordTime}\n`;
    if (record.notes) {
      content += `备注：${record.notes}`;
    }
    
    wx.showModal({
      title: '记录详情',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 删除记录
  deleteRecord(e) {
    const recordId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(recordId);
        }
      }
    });
  },

  // 执行删除操作
  async performDelete(recordId) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      // 调用删除API
      const result = await http.delete(`${API.HEALTH.RECORDS}/${recordId}`);
      
      if (result.success) {
        // 从本地列表中移除
        const updatedList = this.data.recordList.filter(item => item.id !== recordId);
        this.setData({ recordList: updatedList });
        this.updateFilteredRecords();
        
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: result.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      wx.hideLoading();
      
      // API失败时使用本地模拟删除
      wx.showModal({
        title: '网络异常',
        content: '无法连接服务器，是否使用本地模拟删除？',
        success: (res) => {
          if (res.confirm) {
            const updatedList = this.data.recordList.filter(item => item.id !== recordId);
            this.setData({ recordList: updatedList });
            this.updateFilteredRecords();
            
            wx.showToast({
              title: '删除成功(本地模拟)',
              icon: 'success'
            });
          }
        }
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadHealthRecords();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHealthRecords(true);
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});