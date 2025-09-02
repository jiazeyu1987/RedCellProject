const familyArchiveService = require('../../services/family-archive.service.js');
const { PatientAPI } = require('../../api/index.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面模式: 'add' | 'edit'
    mode: 'add',
    
    // 成员ID（编辑模式）
    memberId: '',
    
    // 表单数据
    formData: {
      name: '',
      age: '',
      gender: 'male',
      phone: '',
      idCard: '',
      relationship: '',
      address: '',
      emergencyContact: '',
      healthStatus: 'healthy',
      serviceFrequency: 'monthly',
      avatar: '',
      medicalHistory: [],
      currentMedications: [],
      allergyHistory: [],
      notes: ''
    },
    
    // 计算显示用的索引
    healthStatusIndex: 0,
    serviceFrequencyIndex: 2,
    
    // 表单验证错误
    errors: {},
    
    // 页面状态
    loading: false,
    submitting: false,
    
    // 选项配置
    genderOptions: [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' }
    ],
    
    relationshipOptions: [
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
    
    healthStatusOptions: [
      { value: 'healthy', label: '健康', color: '#34c759' },
      { value: 'chronic', label: '慢性病', color: '#ff9500' },
      { value: 'critical', label: '重症', color: '#ff3b30' }
    ],
    
    serviceFrequencyOptions: [
      { value: 'daily', label: '每日服务', color: '#007AFF' },
      { value: 'weekly', label: '每周服务', color: '#5856D6' },
      { value: 'monthly', label: '每月服务', color: '#AF52DE' }
    ],
    
    // 步骤配置
    currentStep: 0,
    steps: [
      { key: 'basic', title: '基本信息', icon: 'user' },
      { key: 'contact', title: '联系方式', icon: 'phone' },
      { key: 'health', title: '健康信息', icon: 'heart' },
      { key: 'other', title: '其他信息', icon: 'more' }
    ],
    
    // 头像上传
    uploadingAvatar: false,
    
    // 动态输入数组
    medicalHistoryInput: '',
    medicationInput: '',
    allergyInput: '',
    
    // 模态选择器显示状态
    healthStatusPickerVisible: false,
    serviceFrequencyPickerVisible: false
  },

  /**
   * 更新选择器索引
   */
  updatePickerIndexes() {
    const healthStatusIndex = this.getPickerIndex('healthStatus', this.data.formData.healthStatus);
    const serviceFrequencyIndex = this.getPickerIndex('serviceFrequency', this.data.formData.serviceFrequency);
    
    this.setData({
      healthStatusIndex,
      serviceFrequencyIndex
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { mode = 'add', memberId } = options;
    
    this.setData({ 
      mode, 
      memberId: memberId || '' 
    });
    
    this.initPage();
    this.updatePickerIndexes();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时的处理
  },

  /**
   * 初始化页面
   */
  async initPage() {
    const { mode, memberId } = this.data;
    
    // 设置导航栏标题
    const title = mode === 'add' ? '添加成员' : '编辑成员';
    wx.setNavigationBarTitle({ title });
    
    // 如果是编辑模式，加载成员数据
    if (mode === 'edit' && memberId) {
      await this.loadMemberData();
    }
  },

  /**
   * 加载成员数据（编辑模式）
   */
  async loadMemberData() {
    this.setData({ loading: true });
    
    try {
      const memberDetail = await familyArchiveService.getMemberDetail(this.data.memberId);
      
      // 转换数据格式
      const formData = {
        name: memberDetail.name || '',
        age: memberDetail.age ? memberDetail.age.toString() : '',
        gender: memberDetail.gender || 'male',
        phone: memberDetail.phone || '',
        idCard: memberDetail.idCard || '',
        relationship: memberDetail.relationship || '',
        address: memberDetail.address || '',
        emergencyContact: memberDetail.emergencyContact || '',
        healthStatus: memberDetail.healthStatus || 'healthy',
        serviceFrequency: memberDetail.serviceFrequency || 'monthly',
        avatar: memberDetail.avatar || '',
        medicalHistory: memberDetail.medicalHistory || [],
        currentMedications: memberDetail.currentMedications || [],
        allergyHistory: memberDetail.allergyHistory || [],
        notes: memberDetail.notes || ''
      };
      
      this.setData({
        formData,
        loading: false
      });
      
      // 更新选择器索引
      this.updatePickerIndexes();
      
    } catch (error) {
      console.error('加载成员数据失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    }
  },

  /**
   * 步骤切换
   */
  onStepChange(event) {
    const { step } = event.currentTarget.dataset;
    if (typeof step === 'number') {
      this.setData({ currentStep: step });
    }
  },

  /**
   * 上一步
   */
  onPrevStep() {
    const currentStep = Math.max(0, this.data.currentStep - 1);
    this.setData({ currentStep });
  },

  /**
   * 下一步
   */
  onNextStep() {
    console.log('点击下一步，当前步骤:', this.data.currentStep); // 调试日志
    // 验证当前步骤
    if (this.validateCurrentStep()) {
      const currentStep = Math.min(this.data.steps.length - 1, this.data.currentStep + 1);
      this.setData({ currentStep });
      console.log('验证通过，跳转到步骤:', currentStep); // 调试日志
    } else {
      console.log('验证失败，保持当前步骤'); // 调试日志
    }
  },

  /**
   * 表单输入变更
   */
  onInputChange(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    
    console.log('表单输入变更:', field, value); // 调试日志
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: null // 清除错误
    });
  },

  /**
   * 选择器变更
   */
  onPickerChange(event) {
    const { field } = event.currentTarget.dataset;
    const index = event.detail.value;
    
    let value;
    switch (field) {
      case 'gender':
        value = this.data.genderOptions[index].value;
        break;
      case 'relationship':
        value = this.data.relationshipOptions[index].value;
        break;
      case 'healthStatus':
        value = this.data.healthStatusOptions[index].value;
        break;
      case 'serviceFrequency':
        value = this.data.serviceFrequencyOptions[index].value;
        break;
      default:
        return;
    }
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: null
    });
  },

  /**
   * 单选框变更
   */
  onRadioChange(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: null
    });
  },

  /**
   * 头像上传
   */
  onChooseAvatar() {
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
      // 这里可以调用文件上传API
      // 现在先直接使用本地路径
      this.setData({
        'formData.avatar': filePath,
        uploadingAvatar: false
      });
      
      wx.showToast({
        title: '头像设置成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('上传头像失败:', error);
      this.setData({ uploadingAvatar: false });
      
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 添加医疗历史项
   */
  onAddMedicalHistory() {
    const input = this.data.medicalHistoryInput.trim();
    if (!input) return;
    
    const medicalHistory = [...this.data.formData.medicalHistory, input];
    this.setData({
      'formData.medicalHistory': medicalHistory,
      medicalHistoryInput: ''
    });
  },

  /**
   * 删除医疗历史项
   */
  onRemoveMedicalHistory(event) {
    const { index } = event.currentTarget.dataset;
    const medicalHistory = this.data.formData.medicalHistory.filter((_, i) => i !== index);
    this.setData({ 'formData.medicalHistory': medicalHistory });
  },

  /**
   * 添加用药记录
   */
  onAddMedication() {
    const input = this.data.medicationInput.trim();
    if (!input) return;
    
    const currentMedications = [...this.data.formData.currentMedications, input];
    this.setData({
      'formData.currentMedications': currentMedications,
      medicationInput: ''
    });
  },

  /**
   * 删除用药记录
   */
  onRemoveMedication(event) {
    const { index } = event.currentTarget.dataset;
    const currentMedications = this.data.formData.currentMedications.filter((_, i) => i !== index);
    this.setData({ 'formData.currentMedications': currentMedications });
  },

  /**
   * 添加过敏史
   */
  onAddAllergy() {
    const input = this.data.allergyInput.trim();
    if (!input) return;
    
    const allergyHistory = [...this.data.formData.allergyHistory, input];
    this.setData({
      'formData.allergyHistory': allergyHistory,
      allergyInput: ''
    });
  },

  /**
   * 删除过敏史
   */
  onRemoveAllergy(event) {
    const { index } = event.currentTarget.dataset;
    const allergyHistory = this.data.formData.allergyHistory.filter((_, i) => i !== index);
    this.setData({ 'formData.allergyHistory': allergyHistory });
  },

  /**
   * 动态输入变更
   */
  onDynamicInputChange(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    this.setData({ [field]: value });
  },

  /**
   * 验证当前步骤
   */
  validateCurrentStep() {
    const { currentStep, formData } = this.data;
    const errors = {};
    
    console.log('验证步骤:', currentStep, '表单数据:', formData); // 调试日志
    
    switch (currentStep) {
      case 0: // 基本信息
        if (!formData.name || !formData.name.trim()) {
          errors.name = '请输入姓名';
          console.log('姓名验证失败:', formData.name); // 调试日志
        }
        if (!formData.age || isNaN(formData.age) || formData.age < 0 || formData.age > 150) {
          errors.age = '请输入有效年龄';
          console.log('年龄验证失败:', formData.age); // 调试日志
        }
        break;
        
      case 1: // 联系方式
        if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
          errors.phone = '请输入正确的手机号';
        }
        if (formData.idCard && !/^\d{17}[\dX]$/.test(formData.idCard)) {
          errors.idCard = '请输入正确的身份证号';
        }
        break;
        
      case 2: // 健康信息
        // 健康信息可以为空，不做强制验证
        break;
        
      case 3: // 其他信息
        // 其他信息可以为空，不做强制验证
        break;
    }
    
    if (Object.keys(errors).length > 0) {
      this.setData({ errors });
      
      // 显示第一个错误
      const firstError = Object.values(errors)[0];
      wx.showToast({
        title: firstError,
        icon: 'none'
      });
      
      return false;
    }
    
    return true;
  },

  /**
   * 表单提交
   */
  async onSubmit() {
    // 验证所有步骤
    for (let i = 0; i <= this.data.steps.length - 1; i++) {
      this.setData({ currentStep: i });
      if (!this.validateCurrentStep()) {
        return;
      }
    }
    
    const { mode, memberId, formData } = this.data;
    
    this.setData({ submitting: true });
    
    try {
      // 转换数据格式
      const submitData = {
        ...formData,
        age: parseInt(formData.age)
      };
      
      if (mode === 'add') {
        await familyArchiveService.addFamilyMember(submitData);
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        
        // 添加成功后跳转到家庭成员列表页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/family-members/family-members'
          });
        }, 1500);
      } else {
        await familyArchiveService.updateFamilyMember(memberId, submitData);
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 编辑成功后返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
      
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 取消操作
   */
  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消编辑吗？未保存的内容将丢失。',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  /**
   * 重置表单
   */
  onReset() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置表单吗？所有内容将清空。',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            formData: {
              name: '',
              age: '',
              gender: 'male',
              phone: '',
              idCard: '',
              relationship: '',
              address: '',
              emergencyContact: '',
              healthStatus: 'healthy',
              serviceFrequency: 'monthly',
              avatar: '',
              medicalHistory: [],
              currentMedications: [],
              allergyHistory: [],
              notes: ''
            },
            errors: {},
            currentStep: 0,
            medicalHistoryInput: '',
            medicationInput: '',
            allergyInput: ''
          });
        }
      }
    });
  },

  /**
   * 获取选择器索引
   */
  getPickerIndex(field, value) {
    const optionsMap = {
      gender: this.data.genderOptions,
      relationship: this.data.relationshipOptions,
      healthStatus: this.data.healthStatusOptions,
      serviceFrequency: this.data.serviceFrequencyOptions
    };
    
    const options = optionsMap[field];
    if (!options) return 0;
    
    const index = options.findIndex(option => option.value === value);
    return index >= 0 ? index : 0;
  },

  /**
   * 显示健康状态选择器
   */
  showHealthStatusPicker() {
    console.log('显示健康状态选择器');
    this.setData({ healthStatusPickerVisible: true });
  },

  /**
   * 健康状态选择确认
   */
  onHealthStatusConfirm(e) {
    console.log('健康状态选择确认', e.detail);
    const { value } = e.detail;
    this.setData({
      'formData.healthStatus': value,
      'errors.healthStatus': null,
      healthStatusPickerVisible: false
    });
    
    // 更新选择器索引
    this.updatePickerIndexes();
    
    console.log('健康状态已更新:', value, '当前formData:', this.data.formData);
  },

  /**
   * 健康状态选择取消
   */
  onHealthStatusCancel() {
    this.setData({ healthStatusPickerVisible: false });
  },

  /**
   * 显示服务频率选择器
   */
  showServiceFrequencyPicker() {
    console.log('显示服务频率选择器');
    this.setData({ serviceFrequencyPickerVisible: true });
  },

  /**
   * 服务频率选择确认
   */
  onServiceFrequencyConfirm(e) {
    console.log('服务频率选择确认', e.detail);
    const { value } = e.detail;
    this.setData({
      'formData.serviceFrequency': value,
      'errors.serviceFrequency': null,
      serviceFrequencyPickerVisible: false
    });
    
    // 更新选择器索引
    this.updatePickerIndexes();
    
    console.log('服务频率已更新:', value, '当前formData:', this.data.formData);
  },

  /**
   * 服务频率选择取消
   */
  onServiceFrequencyCancel() {
    this.setData({ serviceFrequencyPickerVisible: false });
  }
});