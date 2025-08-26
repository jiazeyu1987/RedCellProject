// pages/health-report/index.js
Page({
  data: {
    reportList: [],
    selectedReport: null,
    showDetailModal: false,
    loading: false
  },

  onLoad: function() {
    this.loadHealthReports();
  },

  onShow: function() {
    this.loadHealthReports();
  },

  // 加载健康报告列表
  loadHealthReports() {
    this.setData({ loading: true });
    
    // 模拟API调用
    setTimeout(() => {
      const mockReports = [
        {
          id: 1,
          title: '2024年1月综合健康报告',
          date: '2024-01-15',
          type: '综合体检',
          doctor: '李医生',
          hospital: '市第一人民医院',
          summary: '整体健康状况良好，各项指标基本正常',
          status: 'normal',
          details: {
            bloodPressure: {
              name: '血压',
              value: '120/80',
              unit: 'mmHg',
              status: 'normal',
              reference: '90-140/60-90'
            },
            bloodSugar: {
              name: '血糖',
              value: '5.6',
              unit: 'mmol/L',
              status: 'normal',
              reference: '3.9-6.1'
            },
            heartRate: {
              name: '心率',
              value: '72',
              unit: '次/分',
              status: 'normal',
              reference: '60-100'
            },
            weight: {
              name: '体重',
              value: '65.5',
              unit: 'kg',
              status: 'normal',
              reference: 'BMI: 18.5-24'
            }
          },
          recommendations: [
            '保持良好的生活习惯',
            '适量运动，每周至少150分钟',
            '均衡饮食，少盐少糖',
            '定期体检，建议3个月后复查'
          ]
        },
        {
          id: 2,
          title: '血压监测报告',
          date: '2024-01-10',
          type: '专项检查',
          doctor: '王护士',
          hospital: '社区卫生服务中心',
          summary: '血压略有偏高，需要注意饮食和作息',
          status: 'warning',
          details: {
            bloodPressure: {
              name: '血压',
              value: '145/92',
              unit: 'mmHg',
              status: 'warning',
              reference: '90-140/60-90'
            }
          },
          recommendations: [
            '减少盐分摄入，每日不超过6g',
            '适度运动，避免剧烈运动',
            '保持规律作息，避免熬夜',
            '建议1周后复查血压'
          ]
        },
        {
          id: 3,
          title: '血糖监测报告',
          date: '2024-01-05',
          type: '专项检查',
          doctor: '张护士',
          hospital: '社区卫生服务中心',
          summary: '血糖控制良好，继续保持',
          status: 'normal',
          details: {
            bloodSugar: {
              name: '空腹血糖',
              value: '5.2',
              unit: 'mmol/L',
              status: 'normal',
              reference: '3.9-6.1'
            },
            bloodSugarAfterMeal: {
              name: '餐后2小时血糖',
              value: '7.8',
              unit: 'mmol/L',
              status: 'normal',
              reference: '<11.1'
            }
          },
          recommendations: [
            '继续保持良好的饮食习惯',
            '定期监测血糖变化',
            '适量运动有助于血糖控制'
          ]
        }
      ];

      this.setData({
        reportList: mockReports,
        loading: false
      });
    }, 1000);
  },

  // 查看报告详情
  viewDetail(e) {
    const report = e.currentTarget.dataset.report;
    this.setData({
      selectedReport: report,
      showDetailModal: true
    });
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({
      showDetailModal: false,
      selectedReport: null
    });
  },

  // 下载报告
  downloadReport(e) {
    const reportId = e.currentTarget.dataset.id;
    
    wx.showToast({
      title: '报告下载功能开发中',
      icon: 'none'
    });
  },

  // 分享报告
  shareReport(e) {
    const report = e.currentTarget.dataset.report;
    
    wx.showActionSheet({
      itemList: ['分享给医生', '分享给家人', '保存到相册'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({
            title: '分享给医生功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '分享给家人功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 2) {
          wx.showToast({
            title: '保存功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 获取状态对应的颜色
  getStatusColor(status) {
    switch (status) {
      case 'normal':
        return '#52C41A';
      case 'warning':
        return '#FAAD14';
      case 'danger':
        return '#FF4D4F';
      default:
        return '#666';
    }
  },

  // 获取状态文本
  getStatusText(status) {
    switch (status) {
      case 'normal':
        return '正常';
      case 'warning':
        return '注意';
      case 'danger':
        return '异常';
      default:
        return '未知';
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHealthReports();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});