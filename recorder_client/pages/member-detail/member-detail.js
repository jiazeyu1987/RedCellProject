const familyArchiveService = require('../../services/family-archive.service.js');
const { PatientAPI } = require('../../api/index.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 成员ID
    memberId: '',
    
    // 成员详细信息
    memberDetail: null,
    
    // 页面状态
    loading: true,
    isError: false,
    errorMessage: '',
    
    // 健康档案数据
    healthRecord: null,
    
    // 服务历史数据
    serviceHistory: [],
    
    // 当前选中的Tab
    currentTab: 'basic', // basic, health, service, relationship
    
    // Tab配置
    tabs: [
      { key: 'basic', title: '基本信息', icon: 'user' },
      { key: 'health', title: '健康档案', icon: 'heart' },
      { key: 'service', title: '服务历史', icon: 'clock' },
      { key: 'relationship', title: '关系管理', icon: 'group' }
    ],
    
    // 关系类型配置
    relationshipTypes: [
      { value: '本人', label: '本人' },
      { value: '配偶', label: '配偶' },
      { value: '父亲', label: '父亲' },
      { value: '母亲', label: '母亲' },
      { value: '子女', label: '子女' },
      { value: '孙子', label: '孙子/孙女' },
      { value: '兄弟姐妹', label: '兄弟姐妹' },
      { value: '亲戚', label: '亲戚' },
      { value: '其他', label: '其他' }
    ],
    
    // 家庭关系数据
    familyRelationships: [], // 家庭成员列表
    relationshipEdges: [], // 关系连线
    relationshipLayout: [], // 布局位置
    relationshipStatistics: {}, // 关系统计
    relationshipRecommendations: [], // 智能推荐关系
    
    // 关系管理状态
    isManagingRelationships: false,
    selectedMember: null,
    relationshipEditMode: 'view', // view, edit, add
    
    // 操作菜单
    actionMenuVisible: false,
    actionMenuItems: [
      { key: 'edit', title: '编辑信息', icon: 'edit' },
      { key: 'call', title: '拨打电话', icon: 'phone' },
      { key: 'message', title: '发送短信', icon: 'message' },
      { key: 'relationship', title: '管理关系', icon: 'group' },
      { key: 'export', title: '导出档案', icon: 'download' },
      { key: 'delete', title: '删除成员', icon: 'delete', danger: true }
    ],
    
    // 编辑模式
    isEditing: false,
    editData: {},
    
    // 头像上传
    uploadingAvatar: false,
    
    // 家庭档案管理
    showFamilyArchiveModal: false,
    familyArchives: [], // 多个家庭档案
    currentFamilyId: '',
    familyOperationMode: 'view', // view, create, merge, separate
    
    // 新家庭创建
    newFamilyData: {
      familyName: '',
      address: '',
      contactPhone: '',
      description: ''
    },
    
    // 家庭合并/分离
    selectedMembers: [],
    targetFamilyId: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { memberId } = options;
    if (!memberId) {
      this.showError('缺少成员ID参数');
      return;
    }
    
    this.setData({ memberId });
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新数据
    if (this.data.memberId) {
      this.loadMemberDetail();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshAllData();
  },

  /**
   * 页面分享
   */
  onShareAppMessage() {
    const member = this.data.memberDetail;
    return {
      title: `${member?.name || '成员'}的档案信息`,
      path: `/pages/member-detail/member-detail?memberId=${this.data.memberId}`
    };
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: '成员详情'
      });
      
      // 加载成员详情
      await this.loadMemberDetail();
      
      // 根据当前Tab加载对应数据
      await this.loadTabData(this.data.currentTab);
      
    } catch (error) {
      console.error('初始化页面失败:', error);
      this.showError('页面初始化失败');
    }
  },

  /**
   * 加载成员详情
   */
  async loadMemberDetail() {
    this.setData({ loading: true });
    
    try {
      const memberDetail = await familyArchiveService.getMemberDetail(this.data.memberId);
      
      this.setData({
        memberDetail,
        loading: false,
        isError: false
      });
      
      // 更新导航栏标题
      wx.setNavigationBarTitle({
        title: `${memberDetail.name} - 档案详情`
      });
      
    } catch (error) {
      console.error('加载成员详情失败:', error);
      this.setData({
        loading: false,
        isError: true,
        errorMessage: error.message || '加载失败'
      });
    }
  },

  /**
   * 刷新所有数据
   */
  async refreshAllData() {
    try {
      await Promise.all([
        this.loadMemberDetail(),
        this.loadTabData(this.data.currentTab)
      ]);
    } catch (error) {
      console.error('刷新数据失败:', error);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * Tab切换
   */
  async onTabChange(event) {
    const { tab } = event.currentTarget.dataset;
    
    if (tab === this.data.currentTab) return;
    
    this.setData({ currentTab: tab });
    
    // 加载对应Tab的数据
    await this.loadTabData(tab);
  },

  /**
   * 加载Tab数据
   */
  async loadTabData(tab) {
    switch (tab) {
      case 'health':
        await this.loadHealthRecord();
        break;
      case 'service':
        await this.loadServiceHistory();
        break;
      case 'relationship':
        await this.loadRelationshipData();
        break;
      default:
        // basic tab 不需要额外加载数据
        break;
    }
  },

  /**
   * 加载健康档案
   */
  async loadHealthRecord() {
    try {
      const healthRecord = await PatientAPI.getMemberHealthRecord(this.data.memberId);
      this.setData({ healthRecord: healthRecord.data });
    } catch (error) {
      console.error('加载健康档案失败:', error);
      wx.showToast({
        title: '加载健康档案失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载服务历史
   */
  async loadServiceHistory() {
    try {
      const serviceHistory = await PatientAPI.getMemberServiceHistory(this.data.memberId, {
        page: 1,
        pageSize: 20
      });
      this.setData({ serviceHistory: serviceHistory.data || [] });
    } catch (error) {
      console.error('加载服务历史失败:', error);
      wx.showToast({
        title: '加载服务历史失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载关系数据
   */
  async loadRelationshipData() {
    try {
      // 加载关系类型
      const relationshipTypes = await PatientAPI.getRelationshipTypes();
      
      // 获取当前成员的家庭ID
      const familyId = this.data.memberDetail?.familyId;
      if (!familyId) {
        this.setData({ 
          relationshipTypes: relationshipTypes.data || this.data.relationshipTypes,
          familyRelationships: [],
          relationshipRecommendations: []
        });
        return;
      }

      // 获取家庭关系图谱
      const relationshipMap = await familyArchiveService.getFamilyRelationshipMap(familyId);
      
      // 获取智能推荐关系
      const recommendations = await familyArchiveService.recommendFamilyRelationships(
        familyId, 
        this.data.memberDetail
      );

      this.setData({ 
        relationshipTypes: relationshipTypes.data || this.data.relationshipTypes,
        familyRelationships: relationshipMap.nodes || [],
        relationshipEdges: relationshipMap.edges || [],
        relationshipLayout: relationshipMap.layout || [],
        relationshipStatistics: relationshipMap.statistics || {},
        relationshipRecommendations: recommendations || []
      });
      
    } catch (error) {
      console.error('加载关系数据失败:', error);
      this.setData({ 
        relationshipTypes: this.data.relationshipTypes,
        familyRelationships: [],
        relationshipRecommendations: []
      });
    }
  },

  /**
   * 显示操作菜单
   */
  showActionMenu() {
    this.setData({ actionMenuVisible: true });
  },

  /**
   * 隐藏操作菜单
   */
  hideActionMenu() {
    this.setData({ actionMenuVisible: false });
  },

  /**
   * 操作菜单项点击
   */
  onActionMenuTap(event) {
    const { action } = event.currentTarget.dataset;
    this.hideActionMenu();
    
    switch (action) {
      case 'edit':
        this.startEdit();
        break;
      case 'call':
        this.makePhoneCall();
        break;
      case 'message':
        this.sendMessage();
        break;
      case 'relationship':
        this.showFamilyArchiveManager();
        break;
      case 'export':
        this.exportMemberArchive();
        break;
      case 'delete':
        this.confirmDelete();
        break;
    }
  },

  /**
   * 开始编辑
   */
  startEdit() {
    const editData = { ...this.data.memberDetail };
    this.setData({
      isEditing: true,
      editData
    });
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({
      isEditing: false,
      editData: {}
    });
  },

  /**
   * 保存编辑
   */
  async saveEdit() {
    try {
      wx.showLoading({ title: '保存中...' });
      
      await familyArchiveService.updateFamilyMember(this.data.memberId, this.data.editData);
      
      this.setData({
        memberDetail: { ...this.data.editData },
        isEditing: false,
        editData: {}
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存编辑失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  /**
   * 编辑数据变更
   */
  onEditDataChange(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    
    this.setData({
      [`editData.${field}`]: value
    });
  },

  /**
   * 拨打电话
   */
  makePhoneCall() {
    const phone = this.data.memberDetail?.phone;
    if (!phone) {
      wx.showToast({
        title: '没有电话号码',
        icon: 'none'
      });
      return;
    }
    
    wx.makePhoneCall({
      phoneNumber: phone,
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
   * 发送短信
   */
  sendMessage() {
    const phone = this.data.memberDetail?.phone;
    if (!phone) {
      wx.showToast({
        title: '没有电话号码',
        icon: 'none'
      });
      return;
    }
    
    // 小程序无法直接发送短信，可以复制号码到剪贴板
    wx.setClipboardData({
      data: phone,
      success: () => {
        wx.showToast({
          title: '号码已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 导出成员档案
   */
  async exportMemberArchive() {
    try {
      wx.showLoading({ title: '导出中...' });
      
      const archiveData = {
        basicInfo: this.data.memberDetail,
        healthRecord: this.data.healthRecord,
        serviceHistory: this.data.serviceHistory
      };
      
      // 将数据转换为字符串并保存到临时文件
      const jsonString = JSON.stringify(archiveData, null, 2);
      
      // 这里可以实现更复杂的导出逻辑，比如生成PDF等
      wx.setClipboardData({
        data: jsonString,
        success: () => {
          wx.hideLoading();
          wx.showToast({
            title: '档案数据已复制',
            icon: 'success'
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('导出档案失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  },

  /**
   * 确认删除
   */
  confirmDelete() {
    const memberName = this.data.memberDetail?.name || '该成员';
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${memberName} 的档案吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: (res) => {
        if (res.confirm) {
          this.deleteMember();
        }
      }
    });
  },

  /**
   * 删除成员
   */
  async deleteMember() {
    try {
      wx.showLoading({ title: '删除中...' });
      
      await familyArchiveService.deleteFamilyMember(this.data.memberId);
      
      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      wx.hideLoading();
      console.error('删除成员失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 头像点击 - 更换头像
   */
  onAvatarTap() {
    if (this.data.uploadingAvatar) return;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadAvatar(res.tempFilePaths[0]);
      }
    });
  },

  /**
   * 上传头像
   */
  async uploadAvatar(filePath) {
    this.setData({ uploadingAvatar: true });
    
    try {
      const result = await PatientAPI.uploadMemberAvatar(this.data.memberId, filePath);
      
      // 更新本地数据
      this.setData({
        'memberDetail.avatar': result.data.avatarUrl,
        uploadingAvatar: false
      });
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
      
    } catch (error) {
      this.setData({ uploadingAvatar: false });
      console.error('上传头像失败:', error);
      wx.showToast({
        title: '头像更新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 健康档案编辑
   */
  onHealthRecordEdit() {
    // 跳转到健康档案编辑页面
    wx.navigateTo({
      url: `/pages/health-record-edit/health-record-edit?memberId=${this.data.memberId}`
    });
  },

  /**
   * 服务历史项点击
   */
  onServiceHistoryTap(event) {
    const { record } = event.currentTarget.dataset;
    // 跳转到服务记录详情页面
    wx.navigateTo({
      url: `/pages/service-record-detail/service-record-detail?recordId=${record.id}`
    });
  },

  /**
   * 关系选择
   */
  onRelationshipSelect(event) {
    const { relationship } = event.currentTarget.dataset;
    
    // 如果正在编辑模式，更新编辑数据
    if (this.data.isEditing) {
      this.setData({
        'editData.relationship': relationship
      });
    } else {
      // 直接更新关系
      this.updateRelationship(relationship);
    }
  },

  /**
   * 更新关系
   */
  async updateRelationship(relationship) {
    try {
      await PatientAPI.setMemberRelationship(this.data.memberId, { relationship });
      
      this.setData({
        'memberDetail.relationship': relationship
      });
      
      wx.showToast({
        title: '关系更新成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('更新关系失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 重试加载
   */
  onRetry() {
    this.loadMemberDetail();
  },

  /**
   * 显示错误
   */
  showError(message) {
    this.setData({
      loading: false,
      isError: true,
      errorMessage: message
    });
  },

  /**
   * 格式化显示文本
   */
  formatDisplayText(value, type) {
    if (!value) return '暂无';
    
    switch (type) {
      case 'phone':
        return value.replace(/(\\d{3})\\d{4}(\\d{4})/, '$1****$2');
      case 'idCard':
        return value.replace(/(\\d{6})\\d{8}(\\d{4})/, '$1********$2');
      case 'gender':
        return value === 'male' ? '男' : '女';
      case 'healthStatus':
        const statusMap = {
          'healthy': '健康',
          'chronic': '慢性病',
          'critical': '重症'
        };
        return statusMap[value] || value;
      case 'serviceFrequency':
        const frequencyMap = {
          'daily': '每日',
          'weekly': '每周',
          'monthly': '每月'
        };
        return frequencyMap[value] || value;
      default:
        return value;
    }
  },

  /**
   * 页面卸载
   */
  onUnload() {
    // 清理定时器等资源
  },

  // ==================== 多人家庭档案管理功能 ====================

  /**
   * 显示家庭档案管理弹窗
   */
  showFamilyArchiveManager() {
    this.setData({ 
      showFamilyArchiveModal: true,
      familyOperationMode: 'view'
    });
    this.loadFamilyArchives();
  },

  /**
   * 隐藏家庭档案管理弹窗
   */
  hideFamilyArchiveManager() {
    this.setData({ 
      showFamilyArchiveModal: false,
      selectedMembers: [],
      targetFamilyId: ''
    });
  },

  /**
   * 加载多个家庭档案
   */
  async loadFamilyArchives() {
    try {
      // 获取用户相关的所有家庭 ID
      const familyIds = await this.getUserFamilyIds();
      
      if (familyIds.length > 0) {
        const result = await familyArchiveService.getMultipleFamilyArchives(familyIds);
        this.setData({ 
          familyArchives: result.success || [],
          currentFamilyId: this.data.memberDetail?.familyId || ''
        });
      }
    } catch (error) {
      console.error('加载家庭档案失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 获取用户关联的家庭 ID
   */
  async getUserFamilyIds() {
    try {
      const response = await PatientAPI.getUserFamilies();
      return response.data || [];
    } catch (error) {
      console.error('获取用户家庭 ID失败:', error);
      return [];
    }
  },

  /**
   * 创建新家庭档案
   */
  async createFamilyArchive() {
    try {
      const { newFamilyData } = this.data;
      
      // 数据验证
      if (!newFamilyData.familyName || !newFamilyData.address) {
        wx.showToast({
          title: '请填写必要信息',
          icon: 'none'
        });
        return;
      }

      wx.showLoading({ title: '创建中...' });
      
      const result = await familyArchiveService.createFamilyArchive(newFamilyData);
      
      wx.hideLoading();
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });
      
      // 刷新家庭列表
      await this.loadFamilyArchives();
      
      // 切换到查看模式
      this.setData({ familyOperationMode: 'view' });
      
    } catch (error) {
      wx.hideLoading();
      console.error('创建家庭档案失败:', error);
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none'
      });
    }
  },

  /**
   * 合并家庭档案
   */
  async mergeFamilyArchives() {
    try {
      const { currentFamilyId, targetFamilyId } = this.data;
      
      if (!targetFamilyId) {
        wx.showToast({
          title: '请选择目标家庭',
          icon: 'none'
        });
        return;
      }

      wx.showModal({
        title: '确认合并',
        content: '确定要合并这两个家庭档案吗？此操作不可撤销。',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '合并中...' });
              
              await familyArchiveService.mergeFamilyArchives(
                currentFamilyId, 
                targetFamilyId,
                { keepSourceData: true, conflictResolution: 'merge' }
              );
              
              wx.hideLoading();
              wx.showToast({
                title: '合并成功',
                icon: 'success'
              });
              
              // 刷新数据
              await this.loadFamilyArchives();
              await this.loadMemberDetail();
              
            } catch (error) {
              wx.hideLoading();
              wx.showToast({
                title: error.message || '合并失败',
                icon: 'none'
              });
            }
          }
        }
      });
      
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 关系管理 - 保存关系
   */
  async saveRelationship(event) {
    try {
      const { relationship } = event.currentTarget.dataset;
      const { selectedMember, currentFamilyId } = this.data;
      
      if (!selectedMember) {
        wx.showToast({
          title: '请选择成员',
          icon: 'none'
        });
        return;
      }

      wx.showLoading({ title: '保存中...' });
      
      // 更新关系
      const relationshipData = [{
        memberA: this.data.memberId,
        memberB: selectedMember.id,
        relationship: relationship,
        createTime: new Date().toISOString()
      }];
      
      await familyArchiveService.manageFamilyRelationships(currentFamilyId, relationshipData);
      
      wx.hideLoading();
      wx.showToast({
        title: '关系保存成功',
        icon: 'success'
      });
      
      // 刷新关系数据
      await this.loadRelationshipData();
      
      // 重置编辑状态
      this.setData({ 
        selectedMember: null,
        relationshipEditMode: 'view'
      });
      
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分离家庭成员
   */
  async separateFamilyMembers() {
    try {
      const { selectedMembers, currentFamilyId } = this.data;
      
      if (selectedMembers.length === 0) {
        wx.showToast({
          title: '请选择要分离的成员',
          icon: 'none'
        });
        return;
      }

      wx.showModal({
        title: '确认分离',
        content: `确定要将选中的 ${selectedMembers.length} 个成员分离到新家庭吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({ title: '分离中...' });
              
              await familyArchiveService.separateFamilyMembers(
                currentFamilyId,
                selectedMembers.map(m => m.id),
                { createNewFamily: true }
              );
              
              wx.hideLoading();
              wx.showToast({
                title: '分离成功',
                icon: 'success'
              });
              
              // 刷新数据
              await this.loadFamilyArchives();
              await this.loadMemberDetail();
              
            } catch (error) {
              wx.hideLoading();
              wx.showToast({
                title: error.message || '分离失败',
                icon: 'none'
              });
            }
          }
        }
      });
      
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 新家庭数据变更
   */
  onNewFamilyDataChange(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    
    this.setData({
      [`newFamilyData.${field}`]: value
    });
  },

  /**
   * 目标家庭选择
   */
  onTargetFamilySelect(event) {
    const { familyId } = event.currentTarget.dataset;
    this.setData({ targetFamilyId: familyId });
  },

  /**
   * 成员选择（用于批量操作）
   */
  onMemberSelect(event) {
    const { member } = event.currentTarget.dataset;
    const { selectedMembers } = this.data;
    
    const index = selectedMembers.findIndex(m => m.id === member.id);
    if (index > -1) {
      selectedMembers.splice(index, 1);
    } else {
      selectedMembers.push(member);
    }
    
    this.setData({ selectedMembers });
  },

  /**
   * 操作模式切换
   */
  onOperationModeChange(event) {
    const { mode } = event.currentTarget.dataset;
    this.setData({ 
      familyOperationMode: mode,
      selectedMembers: [],
      targetFamilyId: ''
    });
  },

  /**
   * 数据验证
   */
  validateMemberData(data) {
    const errors = {};
    
    if (!data.name || data.name.trim() === '') {
      errors.name = '姓名不能为空';
    }
    
    if (!data.phone || !/^1[3-9]\d{9}$/.test(data.phone)) {
      errors.phone = '请输入正确的手机号';
    }
    
    if (data.idCard && !/^\d{17}[\dX]$/.test(data.idCard)) {
      errors.idCard = '请输入正确的身份证号';
    }
    
    if (!data.relationship) {
      errors.relationship = '请选择关系';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * 显示验证错误
   */
  showValidationErrors(errors) {
    const firstError = Object.values(errors)[0];
    wx.showToast({
      title: firstError,
      icon: 'none'
    });
  },

  /**
   * 获取健康状态颜色
   */
  getHealthStatusColor(status) {
    const colorMap = {
      'healthy': '#34c759',
      'chronic': '#ff9500',
      'critical': '#ff3b30'
    };
    return colorMap[status] || '#999';
  },

  /**
   * 生成分享内容
   */
  generateShareContent() {
    const member = this.data.memberDetail;
    if (!member) return '';
    
    return `${member.name}的健康档案\n` +
           `年龄：${member.age}岁\n` +
           `健康状态：${this.formatDisplayText(member.healthStatus, 'healthStatus')}\n` +
           `服务频率：${this.formatDisplayText(member.serviceFrequency, 'serviceFrequency')}`;
  },

  /**
   * 复制分享内容
   */
  copyShareContent() {
    const content = this.generateShareContent();
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '内容已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 预览健康档案
   */
  previewHealthRecord() {
    const { memberDetail, healthRecord } = this.data;
    
    wx.previewImage({
      urls: ['/images/health-record-preview.png'], // 健康档案预览图
      current: '/images/health-record-preview.png'
    });
  },

  /**
   * 打印健康档案
   */
  printHealthRecord() {
    // 这里可以集成打印功能或生成PDF
    wx.showToast({
      title: '打印功能开发中',
      icon: 'none'
    });
  },

  /**
   * 关系图谱交互
   */
  onRelationshipMapTap(event) {
    const { member } = event.detail;
    
    // 显示成员详情或进行关系编辑
    this.setData({
      selectedMember: member,
      relationshipEditMode: 'edit'
    });
  },

  /**
   * 智能推荐应用
   */
  applyRecommendation(event) {
    const { recommendation } = event.currentTarget.dataset;
    
    wx.showModal({
      title: '应用推荐',
      content: `确定要应用这个关系推荐吗？\n${recommendation.suggestion}`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // 应用推荐的关系设置
            await this.applyRelationshipRecommendation(recommendation);
            
            wx.showToast({
              title: '应用成功',
              icon: 'success'
            });
            
            // 刷新关系数据
            await this.loadRelationshipData();
            
          } catch (error) {
            wx.showToast({
              title: '应用失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 应用关系推荐
   */
  async applyRelationshipRecommendation(recommendation) {
    // 实现推荐关系的应用逻辑
    const relationshipData = {
      memberA: this.data.memberId,
      memberB: recommendation.targetMemberId,
      relationship: recommendation.suggestedRelationship,
      confidence: recommendation.confidence,
      source: 'ai_recommendation'
    };
    
    return await familyArchiveService.manageFamilyRelationships(
      this.data.memberDetail.familyId,
      [relationshipData]
    );
  }
});