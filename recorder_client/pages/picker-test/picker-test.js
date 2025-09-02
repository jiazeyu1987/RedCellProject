Page({
  data: {
    healthStatusOptions: [
      { value: 'healthy', label: '健康', color: '#34c759' },
      { value: 'chronic', label: '慢性病', color: '#ff9500' },
      { value: 'critical', label: '重症', color: '#ff3b30' }
    ],
    serviceFrequencyOptions: [
      { value: 'daily', label: '每日服务', color: '#007AFF' },
      { value: 'weekly', label: '每周服务', color: '#5856D6' },
      { value: 'monthly', label: '每月服务', color: '#AF52DE' }
    ],
    
    selectedHealthStatus: 'healthy',
    selectedServiceFrequency: 'monthly',
    
    healthStatusPickerVisible: false,
    serviceFrequencyPickerVisible: false
  },

  // 显示健康状态选择器
  showHealthStatusPicker() {
    console.log('显示健康状态选择器');
    this.setData({ healthStatusPickerVisible: true });
  },

  // 健康状态选择确认
  onHealthStatusConfirm(e) {
    console.log('健康状态选择确认', e.detail);
    const { value } = e.detail;
    this.setData({
      selectedHealthStatus: value,
      healthStatusPickerVisible: false
    });
    console.log('健康状态已更新:', value);
  },

  // 健康状态选择取消
  onHealthStatusCancel() {
    console.log('健康状态选择取消');
    this.setData({ healthStatusPickerVisible: false });
  },

  // 显示服务频率选择器
  showServiceFrequencyPicker() {
    console.log('显示服务频率选择器');
    this.setData({ serviceFrequencyPickerVisible: true });
  },

  // 服务频率选择确认
  onServiceFrequencyConfirm(e) {
    console.log('服务频率选择确认', e.detail);
    const { value } = e.detail;
    this.setData({
      selectedServiceFrequency: value,
      serviceFrequencyPickerVisible: false
    });
    console.log('服务频率已更新:', value);
  },

  // 服务频率选择取消
  onServiceFrequencyCancel() {
    console.log('服务频率选择取消');
    this.setData({ serviceFrequencyPickerVisible: false });
  }
});