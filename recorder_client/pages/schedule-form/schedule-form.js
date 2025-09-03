// 日程表单页面
const { scheduleStore, userStore, appStore } = require('../../stores/index.js');
const CONSTANTS = require('../../constants/constants');
const CONFIG = require('../../constants/config');
const ErrorHandler = require('../../utils/error-handler');
const { PERMISSIONS, RolePermissionManager } = require('../../utils/role-permission');

/**
 * 日程表单页面
 * 功能：创建和编辑日程
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面模式
    mode: 'create', // create | edit
    scheduleId: null,
    
    // 表单数据
    formData: {
      serviceName: '',
      patientId: '',
      patientName: '',
      serviceType: '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      priority: 'normal',
      reminders: [],
      tags: []
    },
    
    // 表单验证错误
    formErrors: {},
    
    // 页面状态
    loading: false,
    submitting: false,
    
    // 选择器选项
    serviceTypes: [
      { value: 'health_check', label: '健康检查' },
      { value: 'medication', label: '用药提醒' },
      { value: 'exercise', label: '运动指导' },
      { value: 'diet', label: '饮食指导' },
      { value: 'psychological', label: '心理疏导' },
      { value: 'emergency', label: '紧急处理' },
      { value: 'other', label: '其他服务' }
    ],
    
    priorities: [
      { value: 'low', label: '低优先级', color: '#28a745' },
      { value: 'normal', label: '普通', color: '#007aff' },
      { value: 'high', label: '高优先级', color: '#ff9500' },
      { value: 'urgent', label: '紧急', color: '#ff3b30' }
    ],
    
    // 患者列表
    patientList: [],
    
    // 权限相关
    permissions: {
      canCreate: false,
      canEdit: false
    },
    
    // 显示文本
    selectedServiceTypeLabel: '',
    selectedPriorityLabel: '',
    selectedPriorityColor: '#007aff',
    
    // 日期时间选择器数据
    dateTimePickerRange: [[], [], [], []], // 年、月、日、时分
    dateTimePickerRangeKey: ['label', 'label', 'label', 'label'],
    startTimePickerValue: [0, 0, 0, 0],
    endTimePickerValue: [0, 0, 0, 0]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('日程表单页面加载', options);
    
    try {
      // 获取页面参数
      const { mode = 'create', id } = options;
      
      this.setData({
        mode,
        scheduleId: id
      });
      
      // 添加测试用户状态的功能
      this.testUserState();
      
      // 权限检查
      this.checkPermissions();
      
      // 初始化页面数据
      this.initPageData();
      
      // 如果是编辑模式，加载日程数据
      if (mode === 'edit' && id) {
        this.loadScheduleData(id);
      }
      
    } catch (error) {
      console.error('页面加载失败:', error);
      ErrorHandler.showError('页面加载失败，请重试');
    }
  },

  /**
   * 测试用户状态
   */
  testUserState() {
    console.log('=== 测试用户状态 ===');
    
    // 检查各种获取用户信息的方式
    const userStoreState = userStore.getState();
    const storageUserInfo = wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
    const storageRole = wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE);
    const storageToken = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
    const legacyUserRole = wx.getStorageSync('userRole');
    
    console.log('userStore 状态:', userStoreState);
    console.log('本地存储 userInfo:', storageUserInfo);
    console.log('本地存储 role:', storageRole);
    console.log('本地存储 token:', storageToken);
    console.log('旧版 userRole:', legacyUserRole);
    
    // 如果没有用户信息，模拟设置一个
    if (!userStoreState.userInfo && !storageUserInfo) {
      console.log('没有用户信息，模拟设置一个');
      const mockUserInfo = {
        id: '1',
        name: '测试用户',
        phone: '13800138000',
        role: 'senior_recorder'
      };
      
      // 保存到本地存储
      wx.setStorageSync(CONFIG.STORAGE_KEYS.USER_INFO, mockUserInfo);
      wx.setStorageSync(CONFIG.STORAGE_KEYS.ROLE, mockUserInfo.role);
      wx.setStorageSync(CONFIG.STORAGE_KEYS.TOKEN, 'mock-token-12345');
      wx.setStorageSync('userRole', mockUserInfo.role); // 兼容旧版
      
      // 更新 store
      userStore.setState({
        userInfo: mockUserInfo,
        role: mockUserInfo.role,
        token: 'mock-token-12345',
        isLoggedIn: true
      });
      
      console.log('已设置模拟用户信息');
    }
    
    console.log('=== 用户状态测试结束 ===');
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    console.log('日程表单页面渲染完成');
    
    // 设置导航栏标题
    const title = this.data.mode === 'create' ? '新建日程' : '编辑日程';
    wx.setNavigationBarTitle({
      title
    });
  },

  /**
   * 检查用户权限
   */
  checkPermissions() {
    console.log('开始检查权限...');
    
    // 从用户存储获取用户信息
    const userInfo = userStore.getState().userInfo;
    console.log('用户信息(从 store):', userInfo);
    
    // 获取用户角色，优先从用户信息中获取，如果没有则从本地存储获取
    let userRole = userInfo?.role;
    if (!userRole) {
      userRole = wx.getStorageSync('userRole') || wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE) || 'recorder';
      console.log('从本地存储获取角色:', userRole);
    }
    
    console.log('用户角色:', userRole);
    
    // 为了调试，输出所有可能的存储值
    console.log('调试信息:', {
      fromStore: userInfo,
      fromStorageUserRole: wx.getStorageSync('userRole'),
      fromStorageRole: wx.getStorageSync(CONFIG.STORAGE_KEYS.ROLE),
      fromStorageUserInfo: wx.getStorageSync(CONFIG.STORAGE_KEYS.USER_INFO),
      finalRole: userRole
    });
    
    // 检查权限，如果角色为空，临时设置为 senior_recorder 以便调试
    if (!userRole || userRole === '') {
      console.log('角色为空，临时设置为 senior_recorder');
      userRole = 'senior_recorder';
    }
    
    const permissions = {
      canCreate: RolePermissionManager.hasPermission(userRole, PERMISSIONS.CREATE_SCHEDULE),
      canEdit: RolePermissionManager.hasPermission(userRole, PERMISSIONS.UPDATE_SCHEDULE)
    };
    
    console.log('权限检查结果:', permissions);
    console.log('CREATE_SCHEDULE 权限:', PERMISSIONS.CREATE_SCHEDULE);
    console.log('UPDATE_SCHEDULE 权限:', PERMISSIONS.UPDATE_SCHEDULE);
    
    this.setData({ permissions });
    
    // 权限检查
    const { mode } = this.data;
    console.log('页面模式:', mode);
    
    if ((mode === 'create' && !permissions.canCreate) || 
        (mode === 'edit' && !permissions.canEdit)) {
      console.log('权限不足，显示提示');
      wx.showModal({
        title: '权限不足',
        content: `您没有${mode === 'create' ? '创建' : '编辑'}日程的权限，当前角色：${userRole}`,
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    
    console.log('权限检查通过');
    return true;
  },

  /**
   * 初始化页面数据
   */
  async initPageData() {
    try {
      // 初始化日期时间选择器
      this.initDateTimePicker();
      
      // 加载患者列表
      await this.loadPatientList();
      
      // 初始化表单默认值
      if (this.data.mode === 'create') {
        this.initDefaultFormData();
      }
      
    } catch (error) {
      console.error('初始化页面数据失败:', error);
    }
  },

  /**
   * 初始化默认表单数据
   */
  initDefaultFormData() {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1小时后
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 结束时间为开始时间后1小时
    
    // 查找默认优先级
    const defaultPriority = this.data.priorities.find(p => p.value === 'normal');
    
    // 格式化时间字符串
    const startTimeStr = this.formatDateTime(startTime);
    const endTimeStr = this.formatDateTime(endTime);
    
    this.setData({
      'formData.startTime': startTimeStr,
      'formData.endTime': endTimeStr,
      'formData.priority': 'normal',
      selectedPriorityLabel: defaultPriority ? defaultPriority.label : '',
      selectedPriorityColor: defaultPriority ? defaultPriority.color : '#007aff'
    });
    
    // 设置选择器默认值
    this.setPickerDefaultValues(startTime, endTime);
  },

  /**
   * 加载患者列表
   */
  async loadPatientList() {
    try {
      // TODO: 调用真实API获取患者列表
      // 暂时使用模拟数据
      const mockPatients = [
        { id: '1', name: '张三', age: 65, gender: '男' },
        { id: '2', name: '李四', age: 72, gender: '女' },
        { id: '3', name: '王五', age: 68, gender: '男' },
        { id: '4', name: '赵六', age: 70, gender: '女' }
      ];
      
      this.setData({
        patientList: mockPatients
      });
      
    } catch (error) {
      console.error('加载患者列表失败:', error);
    }
  },

  /**
   * 加载日程数据（编辑模式）
   */
  async loadScheduleData(scheduleId) {
    this.setData({ loading: true });
    
    try {
      // TODO: 调用真实API获取日程详情
      // 暂时使用模拟数据
      const mockSchedule = {
        id: scheduleId,
        serviceName: '健康检查',
        patientId: '1',
        patientName: '张三',
        serviceType: 'health_check',
        startTime: '2024-01-15 09:00',
        endTime: '2024-01-15 10:00',
        location: '社区卫生服务中心',
        description: '定期健康检查，测量血压血糖',
        priority: 'normal',
        reminders: [15, 30],
        tags: ['健康检查', '定期']
      };
      
      this.setData({
        formData: mockSchedule
      });
      
      // 设置显示标签
      this.updateDisplayLabels();
      
    } catch (error) {
      console.error('加载日程数据失败:', error);
      ErrorHandler.showError('加载日程数据失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // ============ 表单操作 ============

  /**
   * 表单输入变化
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value,
      [`formErrors.${field}`]: '' // 清除该字段的错误信息
    });
  },

  /**
   * 服务类型选择
   */
  onServiceTypeChange(e) {
    const index = e.detail.value;
    const serviceType = this.data.serviceTypes[index];
    
    this.setData({
      'formData.serviceType': serviceType.value,
      'formErrors.serviceType': '',
      selectedServiceTypeLabel: serviceType.label
    });
  },

  /**
   * 优先级选择
   */
  onPriorityChange(e) {
    const index = e.detail.value;
    const priority = this.data.priorities[index];
    
    this.setData({
      'formData.priority': priority.value,
      'formErrors.priority': '',
      selectedPriorityLabel: priority.label,
      selectedPriorityColor: priority.color
    });
  },

  /**
   * 患者选择
   */
  onPatientChange(e) {
    const index = e.detail.value;
    const patient = this.data.patientList[index];
    
    if (patient) {
      this.setData({
        'formData.patientId': patient.id,
        'formData.patientName': patient.name,
        'formErrors.patientId': ''
      });
    }
  },

  /**
   * 日期时间变化
   */
  onDateTimeChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value,
      [`formErrors.${field}`]: '' // 清除该字段的错误信息
    });
  },

  /**
   * 初始化日期时间选择器
   */
  initDateTimePicker() {
    const currentYear = new Date().getFullYear();
    
    // 年份数据（2年范围）
    const years = [];
    for (let i = currentYear; i <= currentYear + 2; i++) {
      years.push({ value: i, label: `${i}年` });
    }
    
    // 月份数据
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push({ value: i, label: `${i}月` });
    }
    
    // 日期数据（默认31天）
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push({ value: i, label: `${i}日` });
    }
    
    // 时分数据（格式：HH:mm）
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) { // 15分钟间隔
        const hour = String(h).padStart(2, '0');
        const minute = String(m).padStart(2, '0');
        times.push({ value: `${hour}:${minute}`, label: `${hour}:${minute}` });
      }
    }
    
    this.setData({
      dateTimePickerRange: [years, months, days, times]
    });
  },

  /**
   * 日期时间选择器变化
   */
  onDateTimePickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const { dateTimePickerRange } = this.data;
    
    // 获取选中的值
    const year = dateTimePickerRange[0][value[0]].value;
    const month = dateTimePickerRange[1][value[1]].value;
    const day = dateTimePickerRange[2][value[2]].value;
    const time = dateTimePickerRange[3][value[3]].value;
    
    // 格式化为日期时间字符串
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateTimeStr = `${year}-${monthStr}-${dayStr} ${time}`;
    
    // 更新选择器值
    const pickerValueField = field === 'startTime' ? 'startTimePickerValue' : 'endTimePickerValue';
    
    this.setData({
      [`formData.${field}`]: dateTimeStr,
      [`formErrors.${field}`]: '',
      [pickerValueField]: value
    });
  },

  /**
   * 更新显示标签
   */
  updateDisplayLabels() {
    const { formData } = this.data;
    
    // 更新服务类型标签
    const serviceType = this.data.serviceTypes.find(s => s.value === formData.serviceType);
    
    // 更新优先级标签
    const priority = this.data.priorities.find(p => p.value === formData.priority);
    
    this.setData({
      selectedServiceTypeLabel: serviceType ? serviceType.label : '',
      selectedPriorityLabel: priority ? priority.label : '',
      selectedPriorityColor: priority ? priority.color : '#007aff'
    });
  },

  // ============ 表单验证 ============

  /**
   * 验证表单
   */
  validateForm() {
    const { formData } = this.data;
    const errors = {};
    
    // 移除服务名称、患者、服务类型的必选验证
    // 保留时间验证，因为时间是重要的
    
    // 开始时间验证
    if (!formData.startTime) {
      errors.startTime = '请选择开始时间';
    }
    
    // 结束时间验证
    if (!formData.endTime) {
      errors.endTime = '请选择结束时间';
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      errors.endTime = '结束时间必须晚于开始时间';
    }
    
    this.setData({ formErrors: errors });
    
    return Object.keys(errors).length === 0;
  },

  // ============ 表单提交 ============

  /**
   * 提交表单
   */
  async onSubmit() {
    console.log('提交表单');
    
    // 验证表单
    if (!this.validateForm()) {
      wx.showToast({
        title: '请完善表单信息',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ submitting: true });
    
    try {
      const { mode, formData } = this.data;
      
      if (mode === 'create') {
        await this.createSchedule(formData);
      } else {
        await this.updateSchedule(formData);
      }
      
      wx.showToast({
        title: mode === 'create' ? '创建成功' : '更新成功',
        icon: 'success'
      });
      
      // 返回上一页并刷新
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('表单提交失败:', error);
      ErrorHandler.showError('操作失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 创建日程
   */
  async createSchedule(formData) {
    // TODO: 调用真实的创建API
    console.log('创建日程:', formData);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * 更新日程
   */
  async updateSchedule(formData) {
    // TODO: 调用真实的更新API
    console.log('更新日程:', formData);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  /**
   * 取消操作
   */
  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '取消后将丢失已填写的信息，确定要离开吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  // ============ 工具方法 ============

  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 设置选择器默认值
   */
  setPickerDefaultValues(startTime, endTime) {
    const { dateTimePickerRange } = this.data;
    if (dateTimePickerRange[0].length === 0) return;
    
    // 开始时间选择器值
    const startYear = startTime.getFullYear();
    const startMonth = startTime.getMonth() + 1;
    const startDay = startTime.getDate();
    const startHour = String(startTime.getHours()).padStart(2, '0');
    const startMinute = String(Math.floor(startTime.getMinutes() / 15) * 15).padStart(2, '0');
    const startTimeStr = `${startHour}:${startMinute}`;
    
    const startYearIndex = dateTimePickerRange[0].findIndex(item => item.value === startYear);
    const startMonthIndex = dateTimePickerRange[1].findIndex(item => item.value === startMonth);
    const startDayIndex = dateTimePickerRange[2].findIndex(item => item.value === startDay);
    const startTimeIndex = dateTimePickerRange[3].findIndex(item => item.value === startTimeStr);
    
    // 结束时间选择器值
    const endYear = endTime.getFullYear();
    const endMonth = endTime.getMonth() + 1;
    const endDay = endTime.getDate();
    const endHour = String(endTime.getHours()).padStart(2, '0');
    const endMinute = String(Math.floor(endTime.getMinutes() / 15) * 15).padStart(2, '0');
    const endTimeStr = `${endHour}:${endMinute}`;
    
    const endYearIndex = dateTimePickerRange[0].findIndex(item => item.value === endYear);
    const endMonthIndex = dateTimePickerRange[1].findIndex(item => item.value === endMonth);
    const endDayIndex = dateTimePickerRange[2].findIndex(item => item.value === endDay);
    const endTimeIndex = dateTimePickerRange[3].findIndex(item => item.value === endTimeStr);
    
    this.setData({
      startTimePickerValue: [startYearIndex, startMonthIndex, startDayIndex, startTimeIndex],
      endTimePickerValue: [endYearIndex, endMonthIndex, endDayIndex, endTimeIndex]
    });
  }
});