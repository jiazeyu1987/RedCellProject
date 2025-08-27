// pages/address-management/index.js
const { API, http, getTestToken } = require('../../config/api.js');
const authManager = require('../../utils/auth.js');

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
    this.checkAuthAndLoad();
  },

  onShow: function() {
    this.checkAuthAndLoad();
  },

  // 检查用户认证并加载数据
  async checkAuthAndLoad() {
    // 尝试获取测试token
    try {
      const existingToken = wx.getStorageSync('token');
      if (!existingToken) {
        console.log('未找到token，开始获取测试token...');
        await getTestToken();
      } else {
        console.log('已找到token:', existingToken.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('获取测试token失败:', error);
      wx.showToast({
        title: '获取测试token失败，将显示模拟数据',
        icon: 'none',
        duration: 3000
      });
    }
    
    // 加载地址列表
    this.loadAddressList();
  },

  // 加载地址列表
  async loadAddressList() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      console.log('开始调用localhost API:', API.USER.ADDRESSES);
      console.log('API配置:', API);
      
      const result = await http.get(API.USER.ADDRESSES);
      
      console.log('服务器响应:', result);
      
      if (result.success) {
        // 将服务器返回的数据处理为适合前端的格式
        const addressList = result.data ? result.data.addresses || result.data : [];
        
        this.setData({
          addressList: addressList
        });
        
        console.log('地址列表加载成功:', addressList);
      } else {
        console.log('服务器返回失败，使用模拟数据');
        // 如果获取失败，使用模拟数据
        const mockAddressList = [
          {
            id: 1,
            contactName: '张三',
            contactPhone: '13812345678',
            province: '广东省',
            city: '深圳市',
            district: '南山区',
            detail: '科技园南区科苑路66号',
            isDefault: true
          }
        ];
        
        this.setData({
          addressList: mockAddressList
        });
      }
    } catch (error) {
      console.error('获取地址列表失败:', error);
      console.error('错误详情:', JSON.stringify(error));
      
      // 发生错误时使用模拟数据
      const mockAddressList = [
        {
          id: 1,
          contactName: '模拟用户',
          contactPhone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          detail: '模拟地址（服务器连接失败）',
          isDefault: true
        }
      ];
      
      this.setData({
        addressList: mockAddressList
      });
      
      wx.showToast({
        title: '服务器连接失败，显示模拟数据',
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
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
    // 检查事件对象是否存在
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
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
  async performDelete(addressId) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const result = await http.delete(`${API.USER.ADDRESSES}/${addressId}`);
      
      if (result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载列表
        this.loadAddressList();
      } else {
        wx.showToast({
          title: result.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除地址失败:', error);
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 设置默认地址
  async setDefault(e) {
    const addressId = e.currentTarget.dataset.id;
    const address = this.data.addressList.find(item => item.id === addressId);
    
    if (!address) {
      wx.showToast({
        title: '地址不存在',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '设置中...' });
      
      const result = await http.put(`${API.USER.ADDRESSES}/${addressId}`, {
        isDefault: true
      });
      
      if (result.success) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });
        
        // 重新加载列表
        this.loadAddressList();
      } else {
        wx.showToast({
          title: result.message || '设置失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('设置默认地址失败:', error);
      wx.showToast({
        title: error.message || '设置失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
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
  async saveAddress() {
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

    try {
      wx.showLoading({ title: '保存中...' });
      
      let result;
      // 将省市区和详细地址合并为一个字段
      const fullAddress = `${address.province}${address.city}${address.district}${address.detail}`;
      
      const addressData = {
        contactName: address.contactName,
        contactPhone: address.contactPhone,
        address: fullAddress,
        isDefault: address.isDefault || false
      };
      
      if (address.id || address._id) {
        // 编辑现有地址
        result = await http.put(`${API.USER.ADDRESSES}/${address.id || address._id}`, addressData);
      } else {
        // 新增地址
        result = await http.post(API.USER.ADDRESSES, addressData);
      }
      
      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        this.setData({
          showAddModal: false
        });
        
        // 重新加载列表
        this.loadAddressList();
      } else {
        wx.showToast({
          title: result.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存地址失败:', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});