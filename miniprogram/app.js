// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      // TODO: 请在微信开发者工具的云开发控制台中获取环境ID，并填入下方
      // 例如: env: "cloud1-4g0xxxxxx",
      env: "", // 请填入你的云开发环境ID
      
      // API服务器配置
      apiConfig: {
        baseURL: 'http://localhost:3000',  // 本地服务器地址
        apiPrefix: '/v1',                  // API前缀
        timeout: 30000                    // 请求超时时间
      },
      
      // 用户信息
      userInfo: null,
      openId: null,
      isLoggedIn: false,
      
      // 管理员配置
      adminConfig: {
        // 管理员口令列表
        passwords: ['admin123', 'health2024', 'manager888'],
        // 管理员权限
        permissions: {
          viewUserData: true,
          viewSensitiveInfo: true,
          exportData: true,
          freezeUser: true
        }
      }
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
  },
  
  // 管理员验证
  verifyAdminPassword(password) {
    return this.globalData.adminConfig.passwords.includes(password);
  },
  
  // 管理员权限检查
  checkAdminPermission(permission) {
    const isAdminLoggedIn = wx.getStorageSync('adminLoggedIn');
    if (!isAdminLoggedIn) return false;
    
    return this.globalData.adminConfig.permissions[permission] || false;
  },
  
  // 设置管理员登录状态
  setAdminLoginStatus(status) {
    wx.setStorageSync('adminLoggedIn', status);
    if (!status) {
      wx.removeStorageSync('adminLoginTime');
    } else {
      wx.setStorageSync('adminLoginTime', new Date().getTime());
    }
  },
  
  // 检查管理员登录状态是否过期（30分钟）
  checkAdminLoginExpiry() {
    const loginTime = wx.getStorageSync('adminLoginTime');
    if (!loginTime) return false;
    
    const now = new Date().getTime();
    const expiry = 30 * 60 * 1000; // 30分钟
    
    return (now - loginTime) < expiry;
  },
  
  // 获取所有用户数据（模拟数据）
  getAllUsers() {
    // 这里返回模拟的用户数据
    // 在实际项目中，这应该通过API调用获取
    return [
      {
        id: 1,
        nickname: '张大爷',
        realName: '张明',
        phone: '138****1234',
        age: 68,
        gender: '男',
        status: 'active',
        memberLevel: 'regular',
        serviceCount: 5,
        totalSpent: 850.00,
        lastLoginTime: '2024-01-26 14:30',
        joinDate: '2023-11-15'
      },
      {
        id: 2,
        nickname: '李奶奶',
        realName: '李华',
        phone: '139****5678',
        age: 72,
        gender: '女',
        status: 'active',
        memberLevel: 'vip',
        serviceCount: 12,
        totalSpent: 2180.00,
        lastLoginTime: '2024-01-27 09:15',
        joinDate: '2023-10-08'
      },
      {
        id: 3,
        nickname: '王师傅',
        realName: '王建国',
        phone: '136****9012',
        age: 65,
        gender: '男',
        status: 'inactive',
        memberLevel: 'regular',
        serviceCount: 2,
        totalSpent: 320.00,
        lastLoginTime: '2024-01-20 16:45',
        joinDate: '2023-12-02'
      },
      {
        id: 4,
        nickname: '刘阿姨',
        realName: '刘美丽',
        phone: '137****3456',
        age: 59,
        gender: '女',
        status: 'active',
        memberLevel: 'regular',
        serviceCount: 8,
        totalSpent: 1240.00,
        lastLoginTime: '2024-01-26 11:20',
        joinDate: '2023-09-18'
      }
    ];
  },
  
  // 按状态筛选用户
  filterUsersByStatus(status) {
    const users = this.getAllUsers();
    return users.filter(user => user.status === status);
  },
  
  // 按会员等级筛选用户
  filterUsersByMemberLevel(level) {
    const users = this.getAllUsers();
    return users.filter(user => user.memberLevel === level);
  },
  
  // 搜索用户
  searchUsers(keyword) {
    const users = this.getAllUsers();
    const lowerKeyword = keyword.toLowerCase();
    
    return users.filter(user => {
      return user.nickname.toLowerCase().includes(lowerKeyword) ||
             user.realName.toLowerCase().includes(lowerKeyword) ||
             user.phone.includes(keyword);
    });
  },
  
  // 排序用户
  sortUsers(users, sortBy, sortOrder = 'asc') {
    const sorted = [...users].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // 处理数字类型的字段
      if (['age', 'serviceCount', 'totalSpent'].includes(sortBy)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // 处理日期类型的字段
      if (['lastLoginTime', 'joinDate'].includes(sortBy)) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // 处理字符串类型的字段
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    return sorted;
  }
});
