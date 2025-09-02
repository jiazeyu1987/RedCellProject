/**
 * 家庭关系图谱详情页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 关系图谱数据
    relationshipData: null,
    
    // 当前模式：view(查看), edit(编辑)
    currentMode: 'view',
    
    // 是否显示操作按钮
    showActions: true,
    
    // 当前选中的成员ID
    selectedMemberId: '',
    
    // 页面加载状态
    loading: true,
    isError: false,
    
    // 编辑状态
    isEditMode: false,
    hasChanges: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('关系图谱页面加载', options);
    
    // 从参数中获取关系数据
    if (options.data) {
      try {
        const relationshipData = JSON.parse(decodeURIComponent(options.data));
        this.setData({ 
          relationshipData,
          loading: false 
        });
      } catch (error) {
        console.error('解析关系数据失败:', error);
        this.setData({ 
          isError: true,
          loading: false 
        });
      }
    } else {
      // 如果没有传入数据，尝试从其他来源获取
      this.loadRelationshipData();
    }

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '家庭关系图谱'
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时的处理
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 如果有未保存的更改，提示用户
    if (this.data.hasChanges) {
      this.promptSaveChanges();
    }
  },

  /**
   * 加载关系图谱数据
   */
  async loadRelationshipData() {
    this.setData({ loading: true });
    
    try {
      // 这里应该调用实际的API获取数据
      const relationshipData = await this.getRelationshipDataFromAPI();
      
      this.setData({ 
        relationshipData,
        loading: false,
        isError: false
      });
    } catch (error) {
      console.error('加载关系图谱数据失败:', error);
      this.setData({ 
        loading: false,
        isError: true 
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 切换编辑模式
   */
  toggleEditMode() {
    const newMode = this.data.currentMode === 'view' ? 'edit' : 'view';
    
    this.setData({ 
      currentMode: newMode,
      isEditMode: newMode === 'edit'
    });
    
    // 显示模式切换提示
    wx.showToast({
      title: newMode === 'edit' ? '进入编辑模式' : '退出编辑模式',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 重置图谱布局
   */
  onResetLayout() {
    const relationshipMap = this.selectComponent('#relationshipMap');
    if (relationshipMap) {
      relationshipMap.resetLayout();
      
      wx.showToast({
        title: '布局已重置',
        icon: 'success',
        duration: 1000
      });
    }
  },

  /**
   * 导出图谱
   */
  onExportMap() {
    const relationshipMap = this.selectComponent('#relationshipMap');
    if (relationshipMap) {
      const mapData = relationshipMap.exportMapData();
      
      // 这里可以实现导出功能，比如保存到相册或分享
      wx.showActionSheet({
        itemList: ['保存到相册', '分享给朋友', '导出数据'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.saveToAlbum(mapData);
              break;
            case 1:
              this.shareToFriend(mapData);
              break;
            case 2:
              this.exportData(mapData);
              break;
          }
        }
      });
    }
  },

  /**
   * 保存到相册
   */
  saveToAlbum(mapData) {
    wx.showLoading({ title: '正在保存...' });
    
    // 实际实现中需要将Canvas转换为图片并保存
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    }, 2000);
  },

  /**
   * 分享给朋友
   */
  shareToFriend(mapData) {
    // 实现分享功能
    wx.showToast({
      title: '准备分享',
      icon: 'loading'
    });
  },

  /**
   * 导出数据
   */
  exportData(mapData) {
    // 将数据复制到剪贴板
    wx.setClipboardData({
      data: JSON.stringify(mapData, null, 2),
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 节点选中事件
   */
  onNodeSelect(event) {
    const { node } = event.detail;
    
    this.setData({ selectedMemberId: node.id });
    
    // 显示成员详细信息
    this.showMemberDetails(node);
  },

  /**
   * 显示成员详细信息
   */
  showMemberDetails(node) {
    const memberInfo = `
姓名：${node.name || '未知'}
年龄：${node.age || '-'}岁
性别：${node.gender === 'male' ? '男' : '女'}
关系：${node.relationship || '成员'}
健康状态：${this.getHealthStatusText(node.healthStatus)}
    `.trim();

    wx.showModal({
      title: '成员详情',
      content: memberInfo,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '查看详情',
      success: (res) => {
        if (res.confirm) {
          // 跳转到成员详情页面
          wx.navigateTo({
            url: `/pages/member-detail/member-detail?memberId=${node.id}`
          });
        }
      }
    });
  },

  /**
   * 获取健康状态文本
   */
  getHealthStatusText(status) {
    const statusMap = {
      'healthy': '健康',
      'chronic': '慢性病',
      'critical': '高危',
      'unknown': '未知'
    };
    return statusMap[status] || '未知';
  },

  /**
   * 关系添加事件
   */
  onRelationshipAdd(event) {
    const { edge } = event.detail;
    
    this.setData({ hasChanges: true });
    
    // 这里可以调用API保存关系
    console.log('添加关系:', edge);
    
    wx.showToast({
      title: '关系已建立',
      icon: 'success'
    });
  },

  /**
   * 关系删除事件
   */
  onRelationshipRemove(event) {
    const { sourceNodeId, targetNodeId } = event.detail;
    
    this.setData({ hasChanges: true });
    
    // 这里可以调用API删除关系
    console.log('删除关系:', sourceNodeId, targetNodeId);
    
    wx.showToast({
      title: '关系已删除',
      icon: 'success'
    });
  },

  /**
   * 添加新成员
   */
  onAddMember() {
    wx.navigateTo({
      url: '/pages/member-form/member-form?mode=add&returnUrl=/pages/relationship-map/relationship-map'
    });
  },

  /**
   * 编辑成员信息
   */
  onEditMember(event) {
    const { member } = event.detail;
    
    wx.navigateTo({
      url: `/pages/member-form/member-form?mode=edit&memberId=${member.id}&returnUrl=/pages/relationship-map/relationship-map`
    });
  },

  /**
   * 查看成员详情
   */
  onViewMemberDetails(event) {
    const { member } = event.detail;
    
    wx.navigateTo({
      url: `/pages/member-detail/member-detail?memberId=${member.id}`
    });
  },

  /**
   * 保存更改
   */
  async saveChanges() {
    if (!this.data.hasChanges) {
      wx.showToast({
        title: '没有需要保存的更改',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    try {
      const relationshipMap = this.selectComponent('#relationshipMap');
      const mapData = relationshipMap ? relationshipMap.exportMapData() : null;
      
      if (mapData) {
        // 调用API保存数据
        await this.saveRelationshipData(mapData);
        
        this.setData({ hasChanges: false });
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 提示保存更改
   */
  promptSaveChanges() {
    if (!this.data.hasChanges) return;
    
    wx.showModal({
      title: '有未保存的更改',
      content: '您有未保存的更改，是否要保存？',
      confirmText: '保存',
      cancelText: '放弃',
      success: (res) => {
        if (res.confirm) {
          this.saveChanges();
        } else {
          this.setData({ hasChanges: false });
        }
      }
    });
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    this.loadRelationshipData();
  },

  /**
   * 返回上一页
   */
  onBack() {
    if (this.data.hasChanges) {
      this.promptSaveChanges();
    } else {
      wx.navigateBack();
    }
  },

  /**
   * 模拟API - 获取关系数据
   */
  async getRelationshipDataFromAPI() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          nodes: [],
          edges: []
        });
      }, 1000);
    });
  },

  /**
   * 模拟API - 保存关系数据
   */
  async saveRelationshipData(mapData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1500);
    });
  }
});