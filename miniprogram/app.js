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
      ],
      
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
      },
      
      // 模拟用户数据
      mockUsers: [
        {
          id: 'user_001',
          openId: 'wx_openid_001',
          nickname: '张医生',
          realName: '张明华',
          avatar: '👨‍⚕️',
          phone: '138****5678',
          fullPhone: '13812345678',
          idCard: '440106********1234',
          fullIdCard: '440106199001011234',
          email: 'zh***@email.com',
          fullEmail: 'zhangming@email.com',
          age: 35,
          gender: '男',
          birthday: '1990-01-01',
          registerTime: '2023-06-15 10:30:00',
          lastVisit: '2025-08-20 14:20:00',
          lastLoginIP: '192.168.1.100',
          status: 'active',
          memberLevel: 'vip',
          serviceCount: 15,
          totalSpent: 2500,
          emergencyContact: '李女士 13987654321',
          emergencyRelation: '配偶',
          healthCondition: '良好',
          allergies: '青霉素过敏',
          medicalHistory: '高血压病史3年',
          preferredServices: ['基础健康监测', '慢病管理'],
          deviceInfo: {
            platform: 'iOS',
            model: 'iPhone 13',
            version: '15.0'
          }
        },
        {
          id: 'user_002',
          openId: 'wx_openid_002',
          nickname: '李护士',
          realName: '李春花',
          avatar: '👩‍⚕️',
          phone: '139****9876',
          fullPhone: '13987659876',
          idCard: '440106********5678',
          fullIdCard: '440106198505155678',
          email: 'li***@email.com',
          fullEmail: 'lichunhua@email.com',
          age: 28,
          gender: '女',
          birthday: '1985-05-15',
          registerTime: '2023-07-20 09:15:00',
          lastVisit: '2025-08-22 16:45:00',
          lastLoginIP: '192.168.1.150',
          status: 'active',
          memberLevel: 'regular',
          serviceCount: 8,
          totalSpent: 1200,
          emergencyContact: '王先生 13612345678',
          emergencyRelation: '兄弟',
          healthCondition: '良好',
          allergies: '无已知过敏',
          medicalHistory: '无重大疾病史',
          preferredServices: ['康复指导', '综合健康评估'],
          deviceInfo: {
            platform: 'Android',
            model: 'HUAWEI P40',
            version: '10.0'
          }
        },
        {
          id: 'user_003',
          openId: 'wx_openid_003',
          nickname: '王老师',
          realName: '王建国',
          avatar: '👨‍🏫',
          phone: '188****1234',
          fullPhone: '18812341234',
          idCard: '440106********9012',
          fullIdCard: '440106197203209012',
          email: 'wa***@email.com',
          fullEmail: 'wangjianguo@email.com',
          age: 52,
          gender: '男',
          birthday: '1972-03-20',
          registerTime: '2023-05-10 14:22:00',
          lastVisit: '2025-08-18 11:30:00',
          lastLoginIP: '192.168.1.88',
          status: 'active',
          memberLevel: 'vip',
          serviceCount: 22,
          totalSpent: 4200,
          emergencyContact: '王太太 13798765432',
          emergencyRelation: '配偶',
          healthCondition: '需要关注',
          allergies: '海鲜过敏',
          medicalHistory: '糖尿病、高血压',
          preferredServices: ['慢病管理', '基础健康监测'],
          deviceInfo: {
            platform: 'WeChat',
            model: 'WeChat Mini Program',
            version: '7.0.0'
          }
        },
        {
          id: 'user_004',
          openId: 'wx_openid_004',
          nickname: '赵阿姨',
          realName: '赵美丽',
          avatar: '👵',
          phone: '135****7890',
          fullPhone: '13567897890',
          idCard: '440106********3456',
          fullIdCard: '440106196012153456',
          email: 'zh***@email.com',
          fullEmail: 'zhaomeili@email.com',
          age: 64,
          gender: '女',
          birthday: '1960-12-15',
          registerTime: '2023-08-05 16:40:00',
          lastVisit: '2025-08-21 09:20:00',
          lastLoginIP: '192.168.1.200',
          status: 'inactive',
          memberLevel: 'regular',
          serviceCount: 5,
          totalSpent: 750,
          emergencyContact: '赵女儿 13456789012',
          emergencyRelation: '女儿',
          healthCondition: '需要关注',
          allergies: '药物过敏',
          medicalHistory: '心脏病、关节炎',
          preferredServices: ['康复指导', '基础健康监测'],
          deviceInfo: {
            platform: 'Android',
            model: 'OPPO A55',
            version: '11.0'
          }
        },
        {
          id: 'user_005',
          openId: 'wx_openid_005',
          nickname: '小刘',
          realName: '刘小明',
          avatar: '👨‍💼',
          phone: '150****5555',
          fullPhone: '15012345555',
          idCard: '440106********7890',
          fullIdCard: '440106199508237890',
          email: 'li***@email.com',
          fullEmail: 'liuxiaoming@email.com',
          age: 29,
          gender: '男',
          birthday: '1995-08-23',
          registerTime: '2023-09-12 11:15:00',
          lastVisit: '2025-08-23 20:10:00',
          lastLoginIP: '192.168.1.77',
          status: 'active',
          memberLevel: 'regular',
          serviceCount: 3,
          totalSpent: 450,
          emergencyContact: '刘父亲 13678901234',
          emergencyRelation: '父亲',
          healthCondition: '良好',
          allergies: '无已知过敏',
          medicalHistory: '无重大疾病史',
          preferredServices: ['基础健康监测'],
          deviceInfo: {
            platform: 'iOS',
            model: 'iPhone 14 Pro',
            version: '16.0'
          }
        },
        {
          id: 'user_006',
          openId: 'wx_openid_006',
          nickname: '陈女士',
          realName: '陈雅婷',
          avatar: '👩‍💻',
          phone: '177****8888',
          fullPhone: '17712348888',
          idCard: '440106********2468',
          fullIdCard: '440106198710302468',
          email: 'ch***@email.com',
          fullEmail: 'chenyating@email.com',
          age: 37,
          gender: '女',
          birthday: '1987-10-30',
          registerTime: '2023-04-18 08:45:00',
          lastVisit: '2025-08-19 13:55:00',
          lastLoginIP: '192.168.1.120',
          status: 'active',
          memberLevel: 'vip',
          serviceCount: 18,
          totalSpent: 3100,
          emergencyContact: '陈先生 13501234567',
          emergencyRelation: '丈夫',
          healthCondition: '良好',
          allergies: '花粉过敏',
          medicalHistory: '无重大疾病史',
          preferredServices: ['综合健康评估', '康复指导'],
          deviceInfo: {
            platform: 'iOS',
            model: 'iPhone 12',
            version: '15.5'
          }
        }
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
  },
  
  // 管理员验证
  verifyAdminPassword(password) {
    return this.globalData.adminConfig.passwords.includes(password);
  },
  
  // 获取所有用户数据
  getAllUsers() {
    return this.globalData.mockUsers;
  },
  
  // 根据ID获取用户详情
  getUserById(userId) {
    return this.globalData.mockUsers.find(user => user.id === userId);
  },
  
  // 搜索用户
  searchUsers(keyword) {
    if (!keyword) return this.globalData.mockUsers;
    
    const lowerKeyword = keyword.toLowerCase();
    return this.globalData.mockUsers.filter(user => 
      user.nickname.toLowerCase().includes(lowerKeyword) ||
      user.realName.toLowerCase().includes(lowerKeyword) ||
      user.phone.includes(keyword) ||
      user.fullPhone.includes(keyword)
    );
  },
  
  // 根据状态筛选用户
  filterUsersByStatus(status) {
    if (status === 'all') return this.globalData.mockUsers;
    return this.globalData.mockUsers.filter(user => user.status === status);
  },
  
  // 根据会员等级筛选用户
  filterUsersByMemberLevel(level) {
    if (level === 'all') return this.globalData.mockUsers;
    return this.globalData.mockUsers.filter(user => user.memberLevel === level);
  },
  
  // 用户排序
  sortUsers(users, sortBy, order = 'desc') {
    return users.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortBy) {
        case 'serviceCount':
          aValue = a.serviceCount;
          bValue = b.serviceCount;
          break;
        case 'totalSpent':
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case 'registerTime':
          aValue = new Date(a.registerTime).getTime();
          bValue = new Date(b.registerTime).getTime();
          break;
        case 'lastVisit':
          aValue = new Date(a.lastVisit).getTime();
          bValue = new Date(b.lastVisit).getTime();
          break;
        default:
          aValue = a.nickname;
          bValue = b.nickname;
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  },
  
  // 生成用户地址历史数据
  getUserAddressHistory(userId) {
    const addressData = {
      'user_001': [
        {
          id: 'addr_001_1',
          address: '深圳市南山区科技园南区深南大道9988号',
          contactName: '张明华',
          contactPhone: '13812345678',
          isDefault: true,
          visitCount: 8,
          lastVisit: '2025-08-20',
          addTime: '2023-06-15'
        },
        {
          id: 'addr_001_2', 
          address: '深圳市福田区华强北路1234号华强广场',
          contactName: '张明华',
          contactPhone: '13812345678',
          isDefault: false,
          visitCount: 7,
          lastVisit: '2025-08-10',
          addTime: '2023-08-20'
        }
      ],
      'user_002': [
        {
          id: 'addr_002_1',
          address: '深圳市罗湖区东门步行街168号',
          contactName: '李春花',
          contactPhone: '13987659876',
          isDefault: true,
          visitCount: 8,
          lastVisit: '2025-08-22',
          addTime: '2023-07-20'
        }
      ],
      'user_003': [
        {
          id: 'addr_003_1',
          address: '深圳市宝安区西乡街道宝源路168号',
          contactName: '王建国',
          contactPhone: '18812341234',
          isDefault: true,
          visitCount: 15,
          lastVisit: '2025-08-18',
          addTime: '2023-05-10'
        },
        {
          id: 'addr_003_2',
          address: '深圳市宝安区新安街道建安路88号',
          contactName: '王太太',
          contactPhone: '13798765432',
          isDefault: false,
          visitCount: 7,
          lastVisit: '2025-07-15',
          addTime: '2023-09-05'
        }
      ],
      'user_004': [
        {
          id: 'addr_004_1',
          address: '深圳市龙岗区布吉街道吉华路288号',
          contactName: '赵美丽',
          contactPhone: '13567897890',
          isDefault: true,
          visitCount: 5,
          lastVisit: '2025-08-21',
          addTime: '2023-08-05'
        }
      ],
      'user_005': [
        {
          id: 'addr_005_1',
          address: '深圳市龙华区民治街道梅龙路1866号',
          contactName: '刘小明',
          contactPhone: '15012345555',
          isDefault: true,
          visitCount: 3,
          lastVisit: '2025-08-23',
          addTime: '2023-09-12'
        }
      ],
      'user_006': [
        {
          id: 'addr_006_1',
          address: '深圳市坪山区坪山街道坪山大道2007号',
          contactName: '陈雅婷',
          contactPhone: '17712348888',
          isDefault: true,
          visitCount: 12,
          lastVisit: '2025-08-19',
          addTime: '2023-04-18'
        },
        {
          id: 'addr_006_2',
          address: '深圳市光明区光明街道光明大道3008号',
          contactName: '陈先生',
          contactPhone: '13501234567',
          isDefault: false,
          visitCount: 6,
          lastVisit: '2025-07-28',
          addTime: '2023-11-10'
        }
      ]
    };
    
    return addressData[userId] || [];
  },
  
  // 生成用户服务历史数据
  getUserServiceHistory(userId) {
    const serviceData = {
      'user_001': [
        {
          id: 'service_001_1',
          serviceName: '基础健康监测',
          serviceTime: '2025-08-20 14:00',
          cost: 100,
          nurse: '护士小王',
          duration: 45,
          rating: 5,
          feedback: '服务很专业，护士态度很好，会继续使用。'
        },
        {
          id: 'service_001_2',
          serviceName: '慢病管理',
          serviceTime: '2025-08-15 10:30',
          cost: 180,
          nurse: '护士小李',
          duration: 60,
          rating: 5,
          feedback: '对慢病管理很有帮助，指导很详细。'
        },
        {
          id: 'service_001_3',
          serviceName: '基础健康监测',
          serviceTime: '2025-08-10 16:20',
          cost: 100,
          nurse: '护士小张',
          duration: 40,
          rating: 4,
          feedback: '服务不错，时间安排合理。'
        }
      ],
      'user_002': [
        {
          id: 'service_002_1',
          serviceName: '康复指导',
          serviceTime: '2025-08-22 09:00',
          cost: 150,
          nurse: '康复师陈老师',
          duration: 90,
          rating: 5,
          feedback: '康复效果很明显，专业水平很高。'
        },
        {
          id: 'service_002_2',
          serviceName: '综合健康评估',
          serviceTime: '2025-08-18 14:30',
          cost: 200,
          nurse: '医生刘主任',
          duration: 75,
          rating: 5,
          feedback: '评估很全面，建议很实用。'
        }
      ],
      'user_003': [
        {
          id: 'service_003_1',
          serviceName: '慢病管理',
          serviceTime: '2025-08-18 11:00',
          cost: 180,
          nurse: '护士小赵',
          duration: 55,
          rating: 4,
          feedback: '对糖尿病管理帮助很大。'
        },
        {
          id: 'service_003_2',
          serviceName: '基础健康监测',
          serviceTime: '2025-08-12 15:30',
          cost: 100,
          nurse: '护士小陈',
          duration: 35,
          rating: 5,
          feedback: '血压血糖监测很准确。'
        }
      ],
      'user_004': [
        {
          id: 'service_004_1',
          serviceName: '康复指导',
          serviceTime: '2025-08-21 10:00',
          cost: 150,
          nurse: '康复师王老师',
          duration: 80,
          rating: 4,
          feedback: '关节活动度有改善。'
        }
      ],
      'user_005': [
        {
          id: 'service_005_1',
          serviceName: '基础健康监测',
          serviceTime: '2025-08-23 19:00',
          cost: 100,
          nurse: '护士小林',
          duration: 30,
          rating: 5,
          feedback: '年轻人也要关注健康，服务很好。'
        }
      ],
      'user_006': [
        {
          id: 'service_006_1',
          serviceName: '综合健康评估',
          serviceTime: '2025-08-19 13:30',
          cost: 200,
          nurse: '医生周主任',
          duration: 85,
          rating: 5,
          feedback: '评估报告很详细，很有参考价值。'
        },
        {
          id: 'service_006_2',
          serviceName: '康复指导',
          serviceTime: '2025-08-14 16:00',
          cost: 150,
          nurse: '康复师李老师',
          duration: 70,
          rating: 4,
          feedback: '康复训练很专业。'
        }
      ]
    };
    
    return serviceData[userId] || [];
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
  }
});
