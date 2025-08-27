// 家庭成员管理页面
Page({
  data: {
    members: [],
    loading: false,
    showAddModal: false,
    editingMember: {
      name: '',
      relation: '',
      age: '',
      gender: '',
      phone: '',
      idCard: '',
      medicalHistory: '',
      allergies: ''
    },
    relations: [
      { value: 'father', name: '父亲' },
      { value: 'mother', name: '母亲' },
      { value: 'spouse', name: '配偶' },
      { value: 'child', name: '子女' },
      { value: 'sibling', name: '兄弟姐妹' },
      { value: 'grandparent', name: '祖父母/外祖父母' },
      { value: 'other', name: '其他' }
    ],
    genders: [
      { value: 'male', name: '男' },
      { value: 'female', name: '女' }
    ]
  },

  onLoad() {
    this.loadMembers();
  },

  onShow() {
    // 刷新成员列表
    this.loadMembers();
  },

  // 加载家庭成员列表
  async loadMembers() {
    this.setData({ loading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getFamilyMembers'
        }
      });
      
      if (result.result.success) {
        const members = result.result.data.map(member => ({
          ...member,
          avatar: this.getAvatarByGender(member.gender),
          createTime: new Date(member.createTime).toLocaleDateString()
        }));
        
        this.setData({ members });
      } else {
        console.error('获取家庭成员失败:', result.result.errMsg);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取家庭成员失败:', error);
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 显示添加成员弹窗
  showAddMemberModal() {
    this.setData({
      showAddModal: true,
      editingMember: {
        name: '',
        relation: '',
        age: '',
        gender: '',
        phone: '',
        idCard: '',
        medicalHistory: '',
        allergies: ''
      }
    });
  },

  // 隐藏添加成员弹窗
  hideAddMemberModal() {
    this.setData({
      showAddModal: false
    });
  },

  // 编辑成员
  editMember(e) {
    const member = e.currentTarget.dataset.member;
    this.setData({
      showAddModal: true,
      editingMember: { ...member }
    });
  },

  // 输入处理
  onMemberInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`editingMember.${field}`]: value
    });
  },

  // 关系选择
  onRelationChange(e) {
    const index = e.detail.value;
    const relation = this.data.relations[index];
    this.setData({
      'editingMember.relation': relation.value,
      'editingMember.relationIndex': index
    });
  },

  // 性别选择
  onGenderChange(e) {
    const index = e.detail.value;
    const gender = this.data.genders[index];
    this.setData({
      'editingMember.gender': gender.value,
      'editingMember.genderIndex': index
    });
  },

  // 保存成员
  async saveMember() {
    const member = this.data.editingMember;
    
    // 验证必填字段
    if (!member.name || !member.relation || !member.age || !member.gender) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 验证年龄
    if (isNaN(member.age) || member.age < 0 || member.age > 150) {
      wx.showToast({
        title: '请输入正确的年龄',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    if (member.phone && !/^1[3-9]\d{9}$/.test(member.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    
    try {
      if (member._id) {
        // 更新成员
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'updateFamilyMember',
            data: {
              _id: member._id,
              name: member.name,
              relation: member.relation,
              age: parseInt(member.age),
              gender: member.gender,
              phone: member.phone || '',
              idCard: member.idCard || '',
              medicalHistory: member.medicalHistory || '',
              allergies: member.allergies || ''
            }
          }
        });
        
        if (!result.result.success) {
          throw new Error(result.result.errMsg || '更新失败');
        }
      } else {
        // 新增成员
        const result = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'saveFamilyMember',
            data: {
              name: member.name,
              relation: member.relation,
              age: parseInt(member.age),
              gender: member.gender,
              phone: member.phone || '',
              idCard: member.idCard || '',
              medicalHistory: member.medicalHistory || '',
              allergies: member.allergies || ''
            }
          }
        });
        
        if (!result.result.success) {
          throw new Error(result.result.errMsg || '添加失败');
        }
      }
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      this.setData({
        showAddModal: false
      });
      
      // 刷新列表
      this.loadMembers();
      
    } catch (error) {
      console.error('保存家庭成员失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 根据性别获取头像
  getAvatarByGender(gender) {
    return gender === 'male' ? '👨' : '👩';
  },

  // 删除成员
  async deleteMember(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(item => item._id === memberId || item.id === memberId);
    
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除成员"${member.name}"吗？`
    });
    
    if (!res.confirm) return;
    
    wx.showLoading({ title: '删除中...' });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'deleteFamilyMember',
          data: {
            _id: member._id || member.id
          }
        }
      });
      
      if (!result.result.success) {
        throw new Error(result.result.errMsg || '删除失败');
      }
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 刷新列表
      this.loadMembers();
      
    } catch (error) {
      console.error('删除家庭成员失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 查看成员详情
  viewMemberDetail(e) {
    const member = e.currentTarget.dataset.member;
    const relationName = this.data.relations.find(r => r.value === member.relation)?.name || member.relation;
    const genderName = this.data.genders.find(g => g.value === member.gender)?.name || member.gender;
    
    let content = `关系：${relationName}\n`;
    content += `性别：${genderName}\n`;
    content += `年龄：${member.age}岁\n`;
    if (member.phone) content += `电话：${member.phone}\n`;
    if (member.idCard) content += `身份证：${member.idCard}\n`;
    if (member.medicalHistory) content += `病史：${member.medicalHistory}\n`;
    if (member.allergies) content += `过敏史：${member.allergies}\n`;
    
    wx.showModal({
      title: member.name,
      content: content,
      showCancel: false
    });
  },

  // 为成员预约服务
  bookForMember(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const member = e.currentTarget.dataset.member;
    
    // 将选中的成员信息保存到全局数据中
    const app = getApp();
    app.globalData.selectedMember = member;
    
    wx.navigateTo({
      url: '/pages/booking/index'
    });
  },

  // 获取关系名称
  getRelationName(relation) {
    const relationObj = this.data.relations.find(r => r.value === relation);
    return relationObj ? relationObj.name : relation;
  },

  // 获取性别名称
  getGenderName(gender) {
    const genderObj = this.data.genders.find(g => g.value === gender);
    return genderObj ? genderObj.name : gender;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMembers();
    wx.stopPullDownRefresh();
  }
});