// pages/address-management/index.js
Page({
  data: {
    addressList: [],
    showAddModal: false,
    editingAddress: {
      id: null,
      contactName: '',
      contactPhone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    }
  },

  onLoad: function() {
    this.loadAddressList();
  },

  onShow: function() {
    this.loadAddressList();
  },

  // 加载地址列表
  loadAddressList() {
    // 模拟从本地存储获取地址列表
    const addressList = wx.getStorageSync('addressList') || [
      {
        id: 1,
        contactName: '张三',
        contactPhone: '13812345678',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园南区科苑路66号',
        isDefault: true
      },
      {
        id: 2,
        contactName: '李四',
        contactPhone: '13987654321',
        province: '广东省',
        city: '深圳市',
        district: '福田区',
        detail: '华强北路100号',
        isDefault: false
      }
    ];

    this.setData({
      addressList: addressList
    });
  },

  // 新增地址
  addAddress() {
    this.setData({
      showAddModal: true,
      editingAddress: {
        id: null,
        contactName: '',
        contactPhone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        isDefault: false
      }
    });
  },

  // 编辑地址
  editAddress(e) {
    const address = e.currentTarget.dataset.address;
    this.setData({
      showAddModal: true,
      editingAddress: { ...address }
    });
  },

  // 删除地址
  deleteAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(addressId);
        }
      }
    });
  },

  // 执行删除操作
  performDelete(addressId) {
    const addressList = this.data.addressList.filter(item => item.id !== addressId);
    
    // 如果删除的是默认地址，设置第一个为默认
    if (addressList.length > 0) {
      const hasDefault = addressList.some(item => item.isDefault);
      if (!hasDefault) {
        addressList[0].isDefault = true;
      }
    }

    this.setData({ addressList });
    this.saveToStorage(addressList);
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
  },

  // 设置默认地址
  setDefault(e) {
    const addressId = e.currentTarget.dataset.id;
    
    const addressList = this.data.addressList.map(item => ({
      ...item,
      isDefault: item.id === addressId
    }));

    this.setData({ addressList });
    this.saveToStorage(addressList);
    
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showAddModal: false
    });
  },

  // 输入处理
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`editingAddress.${field}`]: value
    });
  },

  // 地区选择
  onRegionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({
      'editingAddress.province': province,
      'editingAddress.city': city,
      'editingAddress.district': district
    });
  },

  // 切换默认地址
  toggleDefault() {
    this.setData({
      'editingAddress.isDefault': !this.data.editingAddress.isDefault
    });
  },

  // 保存地址
  saveAddress() {
    const address = this.data.editingAddress;
    
    // 验证必填字段
    if (!address.contactName) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return;
    }

    if (!address.contactPhone) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(address.contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    if (!address.province || !address.city || !address.district) {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return;
    }

    if (!address.detail) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    let addressList = [...this.data.addressList];
    
    if (address.id) {
      // 编辑现有地址
      const index = addressList.findIndex(item => item.id === address.id);
      if (index !== -1) {
        addressList[index] = address;
      }
    } else {
      // 新增地址
      address.id = Date.now();
      addressList.push(address);
    }

    // 如果设置为默认地址，取消其他地址的默认状态
    if (address.isDefault) {
      addressList = addressList.map(item => ({
        ...item,
        isDefault: item.id === address.id
      }));
    }

    this.setData({
      addressList: addressList,
      showAddModal: false
    });

    this.saveToStorage(addressList);

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 保存到本地存储
  saveToStorage(addressList) {
    wx.setStorageSync('addressList', addressList);
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});