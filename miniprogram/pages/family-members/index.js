// 家庭成员管理页面
Page({
  data: {
    members: [],
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
  loadMembers() {
    // 模拟从本地存储或服务器加载数据
    const savedMembers = wx.getStorageSync('familyMembers') || [];
    
    // 添加一些示例数据（如果没有数据）
    if (savedMembers.length === 0) {
      const sampleMembers = [
        {
          id: 1,
          name: '张小明',
          relation: 'child',
          age: 8,
          gender: 'male',
          phone: '',
          idCard: '',
          medicalHistory: '过敏性鼻炎',
          allergies: '花粉',
          createTime: '2024-01-15',
          avatar: '👦'
        },
        {
          id: 2,
          name: '李美丽',
          relation: 'spouse',
          age: 35,
          gender: 'female',
          phone: '13888888888',
          idCard: '310101********1234',
          medicalHistory: '高血压',
          allergies: '海鲜',
          createTime: '2024-01-10',
          avatar: '👩'
        }
      ];
      wx.setStorageSync('familyMembers', sampleMembers);
      this.setData({ members: sampleMembers });
    } else {
      this.setData({ members: savedMembers });
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
  saveMember() {
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

    let members = [...this.data.members];
    
    if (member.id) {
      // 编辑现有成员
      const index = members.findIndex(item => item.id === member.id);
      if (index !== -1) {
        members[index] = {
          ...member,
          avatar: this.getAvatarByGender(member.gender)
        };
      }
    } else {
      // 新增成员
      const newMember = {
        ...member,
        id: Date.now(),
        createTime: new Date().toISOString().split('T')[0],
        avatar: this.getAvatarByGender(member.gender)
      };
      members.push(newMember);
    }

    // 保存到本地存储
    wx.setStorageSync('familyMembers', members);
    
    this.setData({
      members: members,
      showAddModal: false
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 根据性别获取头像
  getAvatarByGender(gender) {
    return gender === 'male' ? '👨' : '👩';
  },

  // 删除成员
  deleteMember(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(item => item.id === memberId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除成员"${member.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const members = this.data.members.filter(item => item.id !== memberId);
          wx.setStorageSync('familyMembers', members);
          this.setData({ members });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
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
    e.stopPropagation();
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