// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: "",
      
      // 用户信息
      userInfo: null,
      openId: null,
      isLoggedIn: false,
      
      // 服务配置
      serviceTypes: [
        { id: 1, name: '基础健康监测', price: 100, description: '血压、血糖、体温等基础指标检测', icon: '🩺' },
        { id: 2, name: '综合健康评估', price: 200, description: '全面健康状况评估和建议', icon: '📋' },
        { id: 3, name: '康复指导', price: 150, description: '专业康复师上门指导', icon: '🏃' },
        { id: 4, name: '慢病管理', price: 180, description: '糖尿病、高血压等慢病管理', icon: '💊' }
      ],
      
      // 医院信息
      hospitals: [
        { id: 1, name: '市第一人民医院', address: '市中心区人民路123号', phone: '0755-12345678' },
        { id: 2, name: '市中医院', address: '市南区中医路456号', phone: '0755-87654321' },
        { id: 3, name: '社区卫生服务中心', address: '各社区就近服务', phone: '0755-11112222' }
      ]
    };
    
    // 初始化云开发
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const openId = wx.getStorageSync('openId');
    
    if (userInfo && openId) {
      this.globalData.userInfo = userInfo;
      this.globalData.openId = openId;
      this.globalData.isLoggedIn = true;
    }
  },
  
  // 用户登录
  login(userInfo, openId) {
    this.globalData.userInfo = userInfo;
    this.globalData.openId = openId;
    this.globalData.isLoggedIn = true;
    
    // 保存到本地存储
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('openId', openId);
  },
  
  // 用户退出登录
  logout() {
    this.globalData.userInfo = null;
    this.globalData.openId = null;
    this.globalData.isLoggedIn = false;
    
    // 清除本地存储
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openId');
  },
  
  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  // 格式化时间
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },
  
  // 显示提示消息
  showToast(title, icon = 'none') {
    wx.showToast({
      title: title,
      icon: icon,
      duration: 2000
    });
  },
  
  // 显示加载中
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    });
  },
  
  // 隐藏加载
  hideLoading() {
    wx.hideLoading();
  }
});
