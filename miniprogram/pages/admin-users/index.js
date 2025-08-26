// 用户管理页面
Page({
  data: {
    users: [],
    filteredUsers: [],
    searchKeyword: '',
    currentFilter: 'all',
    sortBy: 'registerTime',
    sortOrder: 'desc',
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    loading: true,
    filters: [
      { id: 'all', name: '全部用户', icon: '👥' },
      { id: 'active', name: '活跃用户', icon: '🟢' },
      { id: 'inactive', name: '非活跃', icon: '🔴' },
      { id: 'vip', name: 'VIP会员', icon: '👑' }
    ],
    sortOptions: [
      { value: 'registerTime', label: '注册时间' },
      { value: 'lastVisit', label: '最后访问' },
      { value: 'serviceCount', label: '服务次数' },
      { value: 'nickname', label: '用户名' }
    ]
  },

  onLoad() {
    this.checkAdminPermission();
  },

  onShow() {
    this.loadUserData();
  },

  // 检查管理员权限
  checkAdminPermission() {
    const app = getApp();
    if (!app.checkAdminLoginExpiry()) {
      wx.showModal({
        title: '权限验证失败',
        content: '管理员登录已过期，请重新登录',
        showCancel: false,
        success: () => {
          app.setAdminLoginStatus(false);
          wx.redirectTo({
            url: '/pages/admin-login/index'
          });
        }
      });
      return false;
    }
    return true;
  },

  // 加载用户数据
  loadUserData() {
    this.setData({ loading: true });
    
    // 从app.js获取用户数据
    const app = getApp();
    const users = app.getAllUsers();
    
    setTimeout(() => {
      this.setData({
        users: users,
        loading: false
      });
      this.updateStatistics();
      this.filterUsers();
    }, 500);
  },

  // 更新统计数据
  updateStatistics() {
    const users = this.data.users;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;

    this.setData({
      totalUsers: users.length,
      activeUsers: activeUsers,
      inactiveUsers: inactiveUsers
    });
  },

  // 搜索用户
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    this.filterUsers();
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    });
    this.filterUsers();
  },

  // 选择筛选条件
  selectFilter(e) {
    const filterId = e.currentTarget.dataset.filter;
    this.setData({
      currentFilter: filterId
    });
    this.filterUsers();
  },

  // 筛选用户
  filterUsers() {
    const app = getApp();
    let filtered = [...this.data.users];

    // 按状态筛选
    if (this.data.currentFilter !== 'all') {
      switch (this.data.currentFilter) {
        case 'active':
        case 'inactive':
          filtered = app.filterUsersByStatus(this.data.currentFilter);
          break;
        case 'vip':
          filtered = app.filterUsersByMemberLevel('vip');
          break;
      }
    }

    // 按关键词搜索
    if (this.data.searchKeyword) {
      filtered = app.searchUsers(this.data.searchKeyword);
      
      // 如果同时有筛选和搜索，需要再次筛选
      if (this.data.currentFilter !== 'all') {
        switch (this.data.currentFilter) {
          case 'active':
          case 'inactive':
            filtered = filtered.filter(user => user.status === this.data.currentFilter);
            break;
          case 'vip':
            filtered = filtered.filter(user => user.memberLevel === 'vip');
            break;
        }
      }
    }

    // 排序
    this.sortUsers(filtered);
  },

  // 排序用户
  sortUsers(users) {
    const app = getApp();
    const { sortBy, sortOrder } = this.data;
    
    const sortedUsers = app.sortUsers(users, sortBy, sortOrder);

    this.setData({
      filteredUsers: sortedUsers
    });
  },

  // 选择排序方式
  selectSort() {
    const options = this.data.sortOptions.map(opt => opt.label);
    
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const selectedSort = this.data.sortOptions[res.tapIndex];
        this.setData({
          sortBy: selectedSort.value
        });
        this.filterUsers();
      }
    });
  },

  // 切换排序顺序
  toggleSortOrder() {
    this.setData({
      sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc'
    });
    this.filterUsers();
  },

  // 查看用户详情
  viewUserDetail(e) {
    const user = e.currentTarget.dataset.user;
    wx.navigateTo({
      url: `/pages/admin-user-detail/index?userId=${user.id}`
    });
  },

  // 导出用户数据
  exportUserData() {
    wx.showModal({
      title: '导出用户数据',
      content: '确定要导出当前筛选的用户数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '导出中...'
          });
          
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '导出成功',
              icon: 'success'
            });
          }, 2000);
        }
      }
    });
  },

  // 刷新数据
  refreshData() {
    this.loadUserData();
  },

  // 退出管理员模式
  exitAdmin() {
    wx.showModal({
      title: '退出管理员',
      content: '确定要退出管理员模式吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.setAdminLoginStatus(false);
          
          wx.showToast({
            title: '已退出管理员模式',
            icon: 'success',
            complete: () => {
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/home/index'
                });
              }, 1500);
            }
          });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserData();
    wx.stopPullDownRefresh();
  }
});