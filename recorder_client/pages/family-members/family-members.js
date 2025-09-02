const familyArchiveService = require('../../services/family-archive.service.js');
const { PatientAPI } = require('../../api/index.js');
const familyArchiveService = require('../../services/family-archive.service.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 搜索关键字
    searchKeyword: '',
    
    // 当前筛选条件
    currentFilters: {
      ageRange: '', // 年龄范围: 'child'(儿童), 'adult'(成人), 'elderly'(老人)
      gender: '', // 性别: 'male'(男), 'female'(女)
      healthStatus: '', // 健康状态: 'healthy'(健康), 'chronic'(慢性病), 'critical'(重症)
      serviceFrequency: '' // 服务频率: 'daily'(每日), 'weekly'(每周), 'monthly'(每月)
    },
    
    // 排序方式
    sortBy: 'name', // 'name'(姓名), 'age'(年龄), 'lastService'(最近服务), 'frequency'(服务频率)
    sortOrder: 'asc', // 'asc'(升序), 'desc'(降序)
    
    // 家庭成员列表数据
    memberList: [],
    
    // 筛选后的列表
    filteredList: [],
    
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    
    // 界面状态
    showFilters: false, // 是否显示筛选器
    isEmpty: false, // 是否为空状态
    isError: false, // 是否错误状态
    
    // 统计信息
    statistics: {
      total: 0,
      activeMembers: 0,
      pendingService: 0,
      averageAge: 0
    },
    
    // 家庭关系图谱数据
    relationshipMapData: null,
    selectedMemberId: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('家庭成员列表页面加载', options);
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadMemberList();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshData();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreMembers();
    }
  },

  /**
   * 初始化页面
   */
  initPage() {
    wx.setNavigationBarTitle({
      title: '家庭成员'
    });
    
    this.loadStatistics();
  },

  /**
   * 加载家庭成员列表
   */
  async loadMemberList() {
    this.setData({ loading: true });
    
    try {
      let result;
      
      try {
        // 使用家庭档案服务获取数据
        result = await familyArchiveService.getFamilyMembers({
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          ...this.data.currentFilters
        });
      } catch (serviceError) {
        console.warn('服务调用失败，使用模拟数据:', serviceError);
        
        // 使用模拟数据
        result = {
          members: [
            {
              id: '1',
              name: '张三',
              age: 65,
              gender: 'male',
              phone: '13800138001',
              idCard: '110101195801011234',
              healthStatus: 'healthy',
              serviceFrequency: 'weekly',
              lastServiceTime: '2024-01-01'
            },
            {
              id: '2', 
              name: '李四',
              age: 45,
              gender: 'female',
              phone: '13800138002',
              idCard: '110101197901011234',
              healthStatus: 'chronic',
              serviceFrequency: 'daily',
              lastServiceTime: '2024-01-02'
            }
          ],
          pagination: {
            hasMore: false
          },
          statistics: {
            total: 2,
            activeMembers: 2,
            pendingService: 0,
            averageAge: 55
          }
        };
      }
      
      // 确保 result 和 result.members 存在
      const members = Array.isArray(result?.members) ? result.members : [];
      
      this.setData({
        memberList: members,
        filteredList: members,
        hasMore: result?.pagination?.hasMore || false,
        loading: false,
        isEmpty: members.length === 0,
        isError: false
      });
      
      // 同时更新统计信息
      if (result?.statistics) {
        this.updateStatistics(result.statistics);
      }
      
      // 生成关系图谱数据
      this.generateRelationshipMapData(members);
      
      this.applyFiltersAndSort();
      
    } catch (error) {
      console.error('加载家庭成员列表失败:', error);
      
      // 设置空数组防止后续错误
      this.setData({
        memberList: [],
        filteredList: [],
        loading: false,
        isError: true,
        isEmpty: true
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    this.setData({
      currentPage: 1,
      hasMore: true
    });
    
    await this.loadMemberList();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载更多成员
   */
  async loadMoreMembers() {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      let result;
      
      try {
        const nextPage = this.data.currentPage + 1;
        result = await familyArchiveService.getFamilyMembers({
          page: nextPage,
          pageSize: this.data.pageSize,
          ...this.data.currentFilters
        });
      } catch (serviceError) {
        console.warn('服务调用失败，停止加载更多:', serviceError);
        
        // 服务失败时停止加载
        this.setData({ 
          loading: false,
          hasMore: false 
        });
        return;
      }
      
      // 确保数据安全
      const existingMembers = Array.isArray(this.data.memberList) ? this.data.memberList : [];
      const newMembers = Array.isArray(result?.members) ? result.members : [];
      const newMemberList = [...existingMembers, ...newMembers];
      
      this.setData({
        memberList: newMemberList,
        currentPage: this.data.currentPage + 1,
        hasMore: result?.pagination?.hasMore || false,
        loading: false
      });
      
      this.applyFiltersAndSort();
      
    } catch (error) {
      console.error('加载更多家庭成员失败:', error);
      this.setData({ 
        loading: false,
        hasMore: false
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 搜索输入
   */
  onSearchInput(event) {
    const keyword = event.detail.value;
    this.setData({ searchKeyword: keyword });
    
    // 防抖处理
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.applyFiltersAndSort();
    }, 300);
  },

  /**
   * 搜索确认
   */
  onSearchConfirm(event) {
    const keyword = event.detail.value;
    this.setData({ searchKeyword: keyword });
    this.applyFiltersAndSort();
  },

  /**
   * 切换筛选器显示
   */
  toggleFilters() {
    this.setData({
      showFilters: !this.data.showFilters
    });
  },

  /**
   * 筛选条件变更
   */
  onFilterChange(event) {
    const { type, value } = event.detail;
    const filters = { ...this.data.currentFilters };
    filters[type] = filters[type] === value ? '' : value; // 点击已选中的则取消
    
    this.setData({ currentFilters: filters });
    this.applyFiltersAndSort();
  },

  /**
   * 清除所有筛选
   */
  clearAllFilters() {
    this.setData({
      searchKeyword: '',
      currentFilters: {
        ageRange: '',
        gender: '',
        healthStatus: '',
        serviceFrequency: ''
      }
    });
    this.applyFiltersAndSort();
  },

  /**
   * 排序选项点击
   */
  onSortOptionTap(event) {
    const { sortBy, sortOrder } = event.currentTarget.dataset;
    
    // 添加触觉反馈
    wx.vibrateShort({
      type: 'light',
      fail: () => {}
    });
    
    this.setData({ 
      sortBy, 
      sortOrder 
    });
    
    this.applyFiltersAndSort();
  },

  /**
   * 应用筛选和排序
   */
  applyFiltersAndSort() {
    // 安全检查 memberList 是否为数组
    const memberList = this.data.memberList;
    if (!Array.isArray(memberList)) {
      console.warn('memberList 不是数组:', memberList);
      this.setData({
        filteredList: [],
        isEmpty: true
      });
      return;
    }
    
    let filteredList = [...memberList];
    
    // 应用搜索
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filteredList = filteredList.filter(member => 
        member.name.toLowerCase().includes(keyword) ||
        member.phone.includes(keyword) ||
        member.idCard.includes(keyword)
      );
    }
    
    // 应用筛选条件
    const filters = this.data.currentFilters;
    
    if (filters.ageRange) {
      filteredList = filteredList.filter(member => {
        const age = member.age;
        switch (filters.ageRange) {
          case 'child': return age <= 18;
          case 'adult': return age > 18 && age < 60;
          case 'elderly': return age >= 60;
          default: return true;
        }
      });
    }
    
    if (filters.gender) {
      filteredList = filteredList.filter(member => member.gender === filters.gender);
    }
    
    if (filters.healthStatus) {
      filteredList = filteredList.filter(member => member.healthStatus === filters.healthStatus);
    }
    
    if (filters.serviceFrequency) {
      filteredList = filteredList.filter(member => member.serviceFrequency === filters.serviceFrequency);
    }
    
    // 应用排序
    filteredList.sort((a, b) => {
      let compareValue = 0;
      
      switch (this.data.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'age':
          compareValue = a.age - b.age;
          break;
        case 'lastService':
          compareValue = new Date(a.lastServiceTime) - new Date(b.lastServiceTime);
          break;
        case 'frequency':
          const frequencyOrder = { 'daily': 3, 'weekly': 2, 'monthly': 1 };
          compareValue = (frequencyOrder[b.serviceFrequency] || 0) - (frequencyOrder[a.serviceFrequency] || 0);
          break;
      }
      
      return this.data.sortOrder === 'desc' ? -compareValue : compareValue;
    });
    
    this.setData({
      filteredList,
      isEmpty: filteredList.length === 0 && this.data.memberList.length > 0
    });
  },

  /**
   * 成员卡片点击
   */
  onMemberCardTap(event) {
    const { member } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/member-detail/member-detail?memberId=${member.id}`
    });
  },

  /**
   * 快捷操作 - 联系
   */
  onQuickContact(event) {
    const { member } = event.currentTarget.dataset;
    
    wx.makePhoneCall({
      phoneNumber: member.phone,
      fail: (error) => {
        console.error('拨打电话失败:', error);
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 快捷操作 - 预约
   */
  onQuickAppointment(event) {
    const { member } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/appointment/appointment?memberId=${member.id}`
    });
  },

  /**
   * 快捷操作 - 健康记录
   */
  onQuickHealthRecord(event) {
    const { member } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/health-record/health-record?memberId=${member.id}`
    });
  },

  /**
   * 快捷操作 - 服务历史
   */
  onQuickServiceHistory(event) {
    const { member } = event.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/service-history/service-history?memberId=${member.id}`
    });
  },

  /**
   * 添加新成员
   */
  onAddMember() {
    wx.navigateTo({
      url: '/pages/member-form/member-form?mode=add'
    });
  },

  /**
   * 统计项点击 - 快速筛选
   */
  onStatisticsClick(event) {
    const { stat } = event.detail;
    
    // 根据统计项设置对应的筛选条件
    let newFilters = { ...this.data.currentFilters };
    
    switch (stat.key) {
      case 'activeMembers':
        // 筛选活跃成员（近期有服务记录的）
        newFilters.healthStatus = 'healthy';
        break;
      case 'pendingService':
        // 筛选待服务成员（每日服务频率）
        newFilters.serviceFrequency = 'daily';
        break;
      case 'averageAge':
        // 筛选老人
        newFilters.ageRange = 'elderly';
        break;
      default:
        // 总成员 - 清除所有筛选
        newFilters = {
          ageRange: '',
          gender: '',
          healthStatus: '',
          serviceFrequency: ''
        };
        break;
    }
    
    this.setData({ currentFilters: newFilters });
    this.applyFiltersAndSort();
    
    // 显示提示
    const filterMessages = {
      'activeMembers': '已筛选健康成员',
      'pendingService': '已筛选每日服务成员',
      'averageAge': '已筛选老人成员',
      'total': '已清除所有筛选条件'
    };
    
    wx.showToast({
      title: filterMessages[stat.key] || '筛选已更新',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 快速筛选（通过统计组件触发）
   */
  onQuickFilter(event) {
    const { filters } = event.detail;
    
    this.setData({ currentFilters: { ...this.data.currentFilters, ...filters } });
    this.applyFiltersAndSort();
  },

  /**
   * 加载统计信息
   */
  async loadStatistics() {
    try {
      // 模拟API调用
      const stats = await this.getStatisticsFromAPI();
      this.setData({ statistics: stats });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  },

  /**
   * 更新统计信息
   */
  updateStatistics(newStats) {
    if (!newStats) return;
    
    try {
      // 合并新的统计数据
      const currentStats = this.data.statistics || {};
      const updatedStats = {
        ...currentStats,
        ...newStats,
        // 确保数值类型正确
        total: Number(newStats.total) || 0,
        activeMembers: Number(newStats.activeMembers) || 0,
        pendingService: Number(newStats.pendingService) || 0,
        averageAge: Number(newStats.averageAge) || 0,
        criticalMembers: Number(newStats.criticalMembers) || 0,
        elderlyMembers: Number(newStats.elderlyMembers) || 0
      };
      
      this.setData({ 
        statistics: updatedStats 
      });
      
      console.log('统计信息已更新:', updatedStats);
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  },
  async getMemberListFromAPI(page = 1) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = this.generateMockData(page);
        resolve(mockData);
      }, 1000);
    });
  },

  /**
   * 生成关系图谱数据
   */
  generateRelationshipMapData(members) {
    // 数据验证和防护性检查
    if (!members || !Array.isArray(members) || members.length < 2) {
      this.setData({ relationshipMapData: null });
      return;
    }

    try {
      // 转换成员数据为图谱节点
      const nodes = members.map(member => {
        // 确保 member 对象存在且有必要属性
        if (!member || typeof member !== 'object') {
          console.warn('非法成员数据:', member);
          return null;
        }

        return {
          id: member.id || '',
          name: member.name || '未知',
          age: member.age || 0,
          gender: member.gender || 'unknown',
          avatar: member.avatar || '',
          relationship: member.relationship || '未知',
          healthStatus: member.healthStatus || 'unknown',
          x: 0, // 由组件自动计算布局
          y: 0
        };
      }).filter(node => node !== null); // 过滤掉无效节点

      // 生成关系连线（根据关系字段建立连接）
      const edges = this.generateFamilyRelationships(nodes);

      const relationshipMapData = {
        nodes,
        edges
      };

      this.setData({ relationshipMapData });
    } catch (error) {
      console.error('生成关系图谱数据失败:', error);
      this.setData({ relationshipMapData: null });
    }
  },

  /**
   * 生成家庭关系连线
   */
  generateFamilyRelationships(nodes) {
    const edges = [];
    
    // 查找主要成员（本人）
    const primaryMember = nodes.find(node => node.relationship === '本人');
    if (!primaryMember) return edges;

    // 建立与主要成员的关系
    nodes.forEach(node => {
      if (node.id === primaryMember.id) return;
      
      let relationshipType = node.relationship;
      
      // 标准化关系名称
      if (relationshipType === '配偶') {
        relationshipType = '夫妻';
      } else if (relationshipType === '子女') {
        relationshipType = '父子';
      } else if (relationshipType === '父亲' || relationshipType === '母亲') {
        relationshipType = '父子';
      } else if (relationshipType === '兄弟姐妹') {
        relationshipType = '兄弟姐妹';
      } else if (relationshipType === '祖父母') {
        relationshipType = '祖孙';
      } else if (relationshipType === '孙子女') {
        relationshipType = '祖孙';
      }
      
      edges.push({
        source: primaryMember.id,
        target: node.id,
        relationship: relationshipType
      });
    });

    // 添加额外的关系连线（比如夫妻之间的子女）
    this.addAdditionalRelationships(nodes, edges);

    return edges;
  },

  /**
   * 添加额外的家庭关系
   */
  addAdditionalRelationships(nodes, edges) {
    // 查找夫妻
    const spouses = nodes.filter(node => node.relationship === '配偶');
    const children = nodes.filter(node => node.relationship === '子女');
    
    // 夫妻与子女的关系
    spouses.forEach(spouse => {
      children.forEach(child => {
        // 避免重复连线
        const existingEdge = edges.find(edge => 
          (edge.source === spouse.id && edge.target === child.id) ||
          (edge.source === child.id && edge.target === spouse.id)
        );
        
        if (!existingEdge) {
          edges.push({
            source: spouse.id,
            target: child.id,
            relationship: '父子'
          });
        }
      });
    });
  },

  /**
   * 显示关系图谱详情
   */
  showRelationshipMap() {
    wx.navigateTo({
      url: '/pages/relationship-map/relationship-map?data=' + encodeURIComponent(JSON.stringify(this.data.relationshipMapData))
    });
  },

  /**
   * 图谱节点选中事件
   */
  onMapNodeSelect(event) {
    const { node } = event.detail;
    this.setData({ selectedMemberId: node.id });
    
    // 可以进一步处理，比如高亮对应的成员卡片
    wx.showToast({
      title: `已选中 ${node.name}`,
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 添加关系事件
   */
  onRelationshipAdd(event) {
    const { edge } = event.detail;
    console.log('添加关系:', edge);
    
    // 可以在这里处理关系添加后的逻辑
    wx.showToast({
      title: '关系已建立',
      icon: 'success'
    });
  },

  /**
   * 删除关系事件
   */
  onRelationshipRemove(event) {
    const { sourceNodeId, targetNodeId } = event.detail;
    console.log('删除关系:', sourceNodeId, targetNodeId);
    
    // 可以在这里处理关系删除后的逻辑
    wx.showToast({
      title: '关系已删除',
      icon: 'success'
    });
  },

  /**
   * 模拟API - 获取统计信息
   */
  async getStatisticsFromAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          total: 8,
          activeMembers: 6,
          pendingService: 2,
          averageAge: 59,
          // 上期数据（用于趋势对比）
          lastTotal: 7,
          lastActiveMembers: 5,
          lastPendingService: 3,
          lastAverageAge: 61
        });
      }, 500);
    });
  },

  /**
   * 生成模拟数据
   */
  generateMockData(page) {
    const mockMembers = [
      {
        id: '1',
        name: '张三',
        age: 75,
        gender: 'male',
        phone: '138****8888',
        idCard: '330***********1234',
        avatar: '/images/avatar-male.png',
        healthStatus: 'critical',
        serviceFrequency: 'daily',
        lastServiceTime: '2025-08-30 14:30',
        relationship: '本人',
        emergencyContact: '李四 139****9999',
        medicalHistory: ['高血压', '糖尿病', '冠心病'],
        currentMedications: ['降压药', '二甲双胍', '心脏药物'],
        allergyHistory: ['青霉素', '磺胺类药物'],
        address: '杭州市西湖区文三路123号',
        isActive: true
      },
      {
        id: '2',
        name: '王美丽',
        age: 68,
        gender: 'female',
        phone: '139****7777',
        idCard: '330***********5678',
        avatar: '/images/avatar-female.png',
        healthStatus: 'chronic',
        serviceFrequency: 'weekly',
        lastServiceTime: '2025-08-28 09:00',
        relationship: '配偶',
        emergencyContact: '张三 138****8888',
        medicalHistory: ['糖尿病', '骨质疏松'],
        currentMedications: ['二甲双胍', '钙片'],
        allergyHistory: ['海鲜', '蚱白'],
        address: '杭州市西湖区文三路123号',
        isActive: true
      },
      {
        id: '3',
        name: '张小明',
        age: 45,
        gender: 'male',
        phone: '137****6666',
        idCard: '330***********9012',
        avatar: '/images/avatar-male.png',
        healthStatus: 'healthy',
        serviceFrequency: 'monthly',
        lastServiceTime: '2025-08-15 16:00',
        relationship: '子女',
        emergencyContact: '张三 138****8888',
        medicalHistory: [],
        currentMedications: [],
        allergyHistory: [],
        address: '杭州市上城区延安路456号',
        isActive: false
      },
      {
        id: '4',
        name: '李奶奶',
        age: 82,
        gender: 'female',
        phone: '135****5555',
        idCard: '330***********3456',
        avatar: '/images/avatar-female.png',
        healthStatus: 'critical',
        serviceFrequency: 'daily',
        lastServiceTime: '2025-08-30 10:00',
        relationship: '母亲',
        emergencyContact: '李四 139****9999',
        medicalHistory: ['高血压', '高血脂', '老年痴呆症'],
        currentMedications: ['降压药', '他汀类', '记忆增强药'],
        allergyHistory: ['青霉素'],
        address: '杭州市拱墅区中山北路789号',
        isActive: true
      },
      {
        id: '5',
        name: '小明',
        age: 16,
        gender: 'male',
        phone: '136****4444',
        idCard: '330***********7890',
        avatar: '/images/avatar-child.png',
        healthStatus: 'healthy',
        serviceFrequency: 'monthly',
        lastServiceTime: '2025-08-20 15:30',
        relationship: '孙子',
        emergencyContact: '张小明 137****6666',
        medicalHistory: ['小儿哮喘'],
        currentMedications: ['支气管扩张剂'],
        allergyHistory: ['花粉', '尘螨'],
        address: '杭州市上城区延安路456号',
        isActive: true
      },
      {
        id: '6',
        name: '王爷爷',
        age: 78,
        gender: 'male',
        phone: '133****3333',
        idCard: '330***********2345',
        avatar: '/images/avatar-male.png',
        healthStatus: 'chronic',
        serviceFrequency: 'weekly',
        lastServiceTime: '2025-08-29 08:00',
        relationship: '父亲',
        emergencyContact: '王美丽 139****7777',
        medicalHistory: ['高血压', '前列腺肾大'],
        currentMedications: ['降压药', '前列腺药物'],
        allergyHistory: [],
        address: '杭州市西湖区文三路123号',
        isActive: true
      },
      {
        id: '7',
        name: '赵姐姐',
        age: 52,
        gender: 'female',
        phone: '139****2222',
        idCard: '330***********6789',
        avatar: '/images/avatar-female.png',
        healthStatus: 'healthy',
        serviceFrequency: 'monthly',
        lastServiceTime: '2025-08-25 11:00',
        relationship: '亲戚',
        emergencyContact: '张三 138****8888',
        medicalHistory: [],
        currentMedications: [],
        allergyHistory: ['花生'],
        address: '杭州市滨江区江南大道101号',
        isActive: false
      },
      {
        id: '8',
        name: '陈小华',
        age: 35,
        gender: 'male',
        phone: '138****1111',
        idCard: '330***********0123',
        avatar: '/images/avatar-male.png',
        healthStatus: 'healthy',
        serviceFrequency: 'monthly',
        lastServiceTime: '2025-08-22 14:00',
        relationship: '女婿',
        emergencyContact: '张小明 137****6666',
        medicalHistory: [],
        currentMedications: [],
        allergyHistory: [],
        address: '杭州市上城区延安路456号',
        isActive: true
      }
    ];
    
    if (page === 1) {
      return {
        data: mockMembers,
        hasMore: false,
        total: mockMembers.length
      };
    } else {
      return {
        data: [],
        hasMore: false,
        total: mockMembers.length
      };
    }
  }
});