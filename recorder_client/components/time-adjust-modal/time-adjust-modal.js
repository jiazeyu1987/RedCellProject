/**
 * 时间调整弹窗组件
 * 用于调整预约时间的专门弹窗界面
 */

const TimeAdjustNotificationService = require('../../services/time-adjust-notification.service.js');

Component({
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    
    // 预约信息
    appointmentInfo: {
      type: Object,
      value: {}
    },
    
    // 可选时间段
    availableSlots: {
      type: Array,
      value: []
    },
    
    // 是否为批量调整
    isBatch: {
      type: Boolean,
      value: false
    },
    
    // 批量调整的预约列表
    batchAppointments: {
      type: Array,
      value: []
    },
    
    // 是否显示智能推荐
    showSmartRecommend: {
      type: Boolean,
      value: true
    },
    
    // 最小调整间隔（分钟）
    minAdjustInterval: {
      type: Number,
      value: 15
    },
    
    // 调整权限级别
    adjustPermissionLevel: {
      type: String,
      value: 'normal' // normal, advanced, emergency
    }
  },

  data: {
    // 原始时间信息
    originalTime: {
      date: '',
      startTime: '',
      endTime: '',
      duration: 0
    },
    
    // 新选择的时间
    newTime: {
      date: '',
      startTime: '',
      endTime: '',
      duration: 0
    },
    
    // 调整原因
    adjustReason: '',
    
    // 预定义的调整原因
    reasonOptions: [
      '患者临时有事',
      '路况堵塞延误',
      '上个服务超时',
      '紧急情况处理',
      '患者身体不适',
      '医疗设备故障',
      '天气原因',
      '其他原因'
    ],
    
    // 时间冲突检测结果
    conflictResult: {
      hasConflict: false,
      conflictAppointments: [],
      suggestions: []
    },
    
    // 智能推荐时间段
    recommendedSlots: [],
    
    // 当前选择的推荐时间
    selectedRecommend: null,
    
    // 表单验证状态
    validation: {
      dateValid: true,
      timeValid: true,
      reasonValid: true,
      conflictValid: true
    },
    
    // 弹窗状态
    modalState: {
      loading: false,
      submitting: false,
      step: 1, // 1: 时间选择, 2: 冲突解决, 3: 确认提交
      showReasonInput: false
    },
    
    // 时间选择器配置
    datePickerConfig: {
      minDate: '',
      maxDate: '',
      format: 'YYYY-MM-DD'
    },
    
    timePickerConfig: {
      minuteStep: 15,
      format: 'HH:mm'
    }
  },

  lifetimes: {
    attached() {
      this.initializeConfig();
      this.initNotificationService();
    }
  },

  observers: {
    'visible': function(newVal) {
      if (newVal) {
        this.resetModal();
        this.loadAppointmentInfo();
      }
    },
    
    'newTime.date, newTime.startTime': function(date, startTime) {
      if (date && startTime) {
        this.checkTimeConflict();
        this.generateSmartRecommendations();
      }
    }
  },

  methods: {
    /**
     * 初始化配置
     */
    initializeConfig() {
      const now = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30); // 30天内可调整
      
      this.setData({
        'datePickerConfig.minDate': this.formatDate(now),
        'datePickerConfig.maxDate': this.formatDate(maxDate)
      });
    },

    /**
     * 初始化通知服务
     */
    async initNotificationService() {
      try {
        this.notificationService = new TimeAdjustNotificationService();
        await this.notificationService.init();
        console.log('[TimeAdjustModal] 通知服务初始化成功');
      } catch (error) {
        console.error('[TimeAdjustModal] 通知服务初始化失败:', error);
      }
    },

    /**
     * 重置弹窗状态
     */
    resetModal() {
      this.setData({
        adjustReason: '',
        'modalState.step': 1,
        'modalState.loading': false,
        'modalState.submitting': false,
        'modalState.showReasonInput': false,
        'conflictResult.hasConflict': false,
        'conflictResult.conflictAppointments': [],
        selectedRecommend: null,
        validation: {
          dateValid: true,
          timeValid: true,
          reasonValid: true,
          conflictValid: true
        }
      });
    },

    /**
     * 加载预约信息
     */
    loadAppointmentInfo() {
      const { appointmentInfo, isBatch, batchAppointments } = this.properties;
      
      if (isBatch) {
        // 批量调整模式
        this.processBatchAppointments(batchAppointments);
      } else {
        // 单个预约调整
        this.processSingleAppointment(appointmentInfo);
      }
    },

    /**
     * 处理单个预约信息
     */
    processSingleAppointment(appointment) {
      const originalTime = {
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        duration: appointment.duration || this.calculateDuration(appointment.startTime, appointment.endTime)
      };
      
      this.setData({
        originalTime,
        newTime: { ...originalTime }
      });
    },

    /**
     * 处理批量预约信息
     */
    processBatchAppointments(appointments) {
      // 批量调整的逻辑处理
      const firstAppointment = appointments[0];
      const originalTime = {
        date: firstAppointment.date,
        startTime: firstAppointment.startTime,
        endTime: firstAppointment.endTime,
        duration: firstAppointment.duration || this.calculateDuration(firstAppointment.startTime, firstAppointment.endTime)
      };
      
      this.setData({
        originalTime,
        newTime: { ...originalTime }
      });
    },

    /**
     * 日期选择事件
     */
    onDateChange(e) {
      const selectedDate = e.detail.value;
      this.setData({
        'newTime.date': selectedDate
      });
      
      // 重新加载该日期的可用时间段
      this.loadAvailableSlots(selectedDate);
    },

    /**
     * 开始时间选择事件
     */
    onStartTimeChange(e) {
      const selectedTime = e.detail.value;
      const { duration } = this.data.newTime;
      const endTime = this.calculateEndTime(selectedTime, duration);
      
      this.setData({
        'newTime.startTime': selectedTime,
        'newTime.endTime': endTime
      });
    },

    /**
     * 结束时间选择事件
     */
    onEndTimeChange(e) {
      const selectedTime = e.detail.value;
      const { startTime } = this.data.newTime;
      const duration = this.calculateDuration(startTime, selectedTime);
      
      this.setData({
        'newTime.endTime': selectedTime,
        'newTime.duration': duration
      });
    },

    /**
     * 调整原因选择
     */
    onReasonSelect(e) {
      const { reason } = e.currentTarget.dataset;
      if (reason === '其他原因') {
        this.setData({
          'modalState.showReasonInput': true,
          adjustReason: ''
        });
      } else {
        this.setData({
          adjustReason: reason,
          'modalState.showReasonInput': false
        });
      }
    },

    /**
     * 自定义原因输入
     */
    onReasonInput(e) {
      this.setData({
        adjustReason: e.detail.value
      });
    },

    /**
     * 智能推荐时间选择
     */
    onRecommendSelect(e) {
      const { index } = e.currentTarget.dataset;
      const recommend = this.data.recommendedSlots[index];
      
      this.setData({
        selectedRecommend: index,
        'newTime.date': recommend.date,
        'newTime.startTime': recommend.startTime,
        'newTime.endTime': recommend.endTime,
        'newTime.duration': recommend.duration
      });
    },

    /**
     * 检查时间冲突
     */
    async checkTimeConflict() {
      const { newTime, originalTime } = this.data;
      const { appointmentInfo } = this.properties;
      
      // 如果时间没有改变，不需要检查冲突
      if (this.isSameTime(newTime, originalTime)) {
        this.setData({
          'conflictResult.hasConflict': false,
          'conflictResult.conflictAppointments': []
        });
        return;
      }
      
      try {
        // 调用时间冲突检测API
        const result = await this.detectTimeConflict({
          recorderId: appointmentInfo.recorderId,
          newDateTime: `${newTime.date} ${newTime.startTime}`,
          duration: newTime.duration,
          excludeAppointmentId: appointmentInfo.id
        });
        
        this.setData({
          conflictResult: result
        });
      } catch (error) {
        console.error('检测时间冲突失败:', error);
        wx.showToast({
          title: '检测冲突失败',
          icon: 'error'
        });
      }
    },

    /**
     * 生成智能推荐
     */
    async generateSmartRecommendations() {
      if (!this.properties.showSmartRecommend) return;
      
      const { newTime, originalTime } = this.data;
      const { appointmentInfo } = this.properties;
      
      try {
        this.setData({
          'modalState.loading': true
        });
        
        // 调用智能推荐API
        const recommendations = await this.getSmartRecommendations({
          recorderId: appointmentInfo.recorderId,
          originalDateTime: `${originalTime.date} ${originalTime.startTime}`,
          preferredDate: newTime.date,
          duration: newTime.duration,
          patientId: appointmentInfo.patientId,
          serviceType: appointmentInfo.serviceType
        });
        
        this.setData({
          recommendedSlots: recommendations,
          'modalState.loading': false
        });
      } catch (error) {
        console.error('获取智能推荐失败:', error);
        this.setData({
          'modalState.loading': false
        });
      }
    },

    /**
     * 加载可用时间段
     */
    async loadAvailableSlots(date) {
      try {
        const { appointmentInfo } = this.properties;
        const slots = await this.getAvailableSlots({
          recorderId: appointmentInfo.recorderId,
          date: date,
          serviceType: appointmentInfo.serviceType
        });
        
        this.setData({
          availableSlots: slots
        });
      } catch (error) {
        console.error('加载可用时间段失败:', error);
      }
    },

    /**
     * 下一步操作
     */
    onNextStep() {
      const currentStep = this.data.modalState.step;
      
      if (currentStep === 1) {
        // 验证时间选择
        if (this.validateTimeSelection()) {
          if (this.data.conflictResult.hasConflict) {
            this.setData({
              'modalState.step': 2
            });
          } else {
            this.setData({
              'modalState.step': 3
            });
          }
        }
      } else if (currentStep === 2) {
        // 冲突解决后进入确认步骤
        this.setData({
          'modalState.step': 3
        });
      }
    },

    /**
     * 上一步操作
     */
    onPrevStep() {
      const currentStep = this.data.modalState.step;
      if (currentStep > 1) {
        this.setData({
          'modalState.step': currentStep - 1
        });
      }
    },

    /**
     * 提交时间调整
     */
    async onSubmit() {
      if (!this.validateForm()) {
        return;
      }
      
      try {
        this.setData({
          'modalState.submitting': true
        });
        
        const adjustData = this.buildAdjustData();
        
        let result;
        if (this.properties.isBatch) {
          result = await this.submitBatchTimeAdjust(adjustData);
        } else {
          result = await this.submitSingleTimeAdjust(adjustData);
        }
        
        // 发送通知
        if (result && this.notificationService) {
          await this.sendAdjustmentNotifications(adjustData, result);
        }
        
        wx.showToast({
          title: '调整成功',
          icon: 'success'
        });
        
        // 触发成功事件
        this.triggerEvent('success', adjustData);
        this.closeModal();
        
      } catch (error) {
        console.error('提交时间调整失败:', error);
        
        // 发送失败通知
        if (this.notificationService) {
          await this.sendAdjustmentFailureNotification(error.message);
        }
        
        wx.showToast({
          title: error.message || '调整失败',
          icon: 'error'
        });
      } finally {
        this.setData({
          'modalState.submitting': false
        });
      }
    },

    /**
     * 关闭弹窗
     */
    closeModal() {
      this.triggerEvent('close');
    },

    /**
     * 取消操作
     */
    onCancel() {
      this.triggerEvent('cancel');
      this.closeModal();
    },

    /**
     * 验证时间选择
     */
    validateTimeSelection() {
      const { newTime } = this.data;
      const validation = {
        dateValid: !!newTime.date,
        timeValid: !!newTime.startTime && !!newTime.endTime,
        reasonValid: true,
        conflictValid: !this.data.conflictResult.hasConflict
      };
      
      this.setData({ validation });
      return Object.values(validation).every(v => v);
    },

    /**
     * 验证整个表单
     */
    validateForm() {
      const { newTime, adjustReason } = this.data;
      const validation = {
        dateValid: !!newTime.date,
        timeValid: !!newTime.startTime && !!newTime.endTime,
        reasonValid: !!adjustReason.trim(),
        conflictValid: !this.data.conflictResult.hasConflict
      };
      
      this.setData({ validation });
      
      if (!validation.dateValid || !validation.timeValid) {
        wx.showToast({
          title: '请选择调整时间',
          icon: 'error'
        });
        return false;
      }
      
      if (!validation.reasonValid) {
        wx.showToast({
          title: '请填写调整原因',
          icon: 'error'
        });
        return false;
      }
      
      if (!validation.conflictValid) {
        wx.showToast({
          title: '存在时间冲突',
          icon: 'error'
        });
        return false;
      }
      
      return true;
    },

    /**
     * 构建调整数据
     */
    buildAdjustData() {
      const { appointmentInfo, isBatch, batchAppointments } = this.properties;
      const { newTime, adjustReason, originalTime } = this.data;
      
      const baseData = {
        newDateTime: `${newTime.date} ${newTime.startTime}`,
        newEndDateTime: `${newTime.date} ${newTime.endTime}`,
        reason: adjustReason,
        adjustTime: new Date().toISOString()
      };
      
      if (isBatch) {
        return {
          ...baseData,
          type: 'batch',
          appointments: batchAppointments.map(apt => ({
            id: apt.id,
            originalDateTime: `${apt.date} ${apt.startTime}`
          }))
        };
      } else {
        return {
          ...baseData,
          type: 'single',
          appointmentId: appointmentInfo.id,
          originalDateTime: `${originalTime.date} ${originalTime.startTime}`
        };
      }
    },

    // 工具方法
    
    /**
     * 计算时长（分钟）
     */
    calculateDuration(startTime, endTime) {
      const [startHour, startMin] = startTime.split(':').map(n => parseInt(n));
      const [endHour, endMin] = endTime.split(':').map(n => parseInt(n));
      return (endHour * 60 + endMin) - (startHour * 60 + startMin);
    },

    /**
     * 根据开始时间和时长计算结束时间
     */
    calculateEndTime(startTime, duration) {
      const [hour, min] = startTime.split(':').map(n => parseInt(n));
      const totalMin = hour * 60 + min + duration;
      const endHour = Math.floor(totalMin / 60);
      const endMin = totalMin % 60;
      return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
    },

    /**
     * 格式化日期
     */
    formatDate(date) {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    },

    /**
     * 判断两个时间是否相同
     */
    isSameTime(time1, time2) {
      return time1.date === time2.date && 
             time1.startTime === time2.startTime && 
             time1.endTime === time2.endTime;
    },

    // API 调用方法（这些需要根据实际后端接口实现）
    
    /**
     * 检测时间冲突API
     */
    async detectTimeConflict(params) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            hasConflict: false,
            conflictAppointments: [],
            suggestions: []
          });
        }, 500);
      });
    },

    /**
     * 获取智能推荐API
     */
    async getSmartRecommendations(params) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            {
              date: params.preferredDate,
              startTime: '09:00',
              endTime: '10:30',
              duration: 90,
              score: 95,
              reason: '距离最近，无冲突'
            },
            {
              date: params.preferredDate,
              startTime: '14:00',
              endTime: '15:30',
              duration: 90,
              score: 88,
              reason: '时间充裕，服务效果佳'
            }
          ]);
        }, 500);
      });
    },

    /**
     * 获取可用时间段API
     */
    async getAvailableSlots(params) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { startTime: '09:00', endTime: '10:30' },
            { startTime: '14:00', endTime: '15:30' },
            { startTime: '16:00', endTime: '17:30' }
          ]);
        }, 300);
      });
    },

    /**
     * 提交单个时间调整API
     */
    async submitSingleTimeAdjust(adjustData) {
      // 模拟API调用
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.1) { // 90% 成功率
            resolve({ success: true });
          } else {
            reject(new Error('网络错误，请重试'));
          }
        }, 1000);
      });
    },

    /**
     * 提交批量时间调整API
     */
    async submitBatchTimeAdjust(adjustData) {
      // 模拟API调用
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.15) { // 85% 成功率
            resolve({ success: true });
          } else {
            reject(new Error('批量调整失败，请重试'));
          }
        }, 1500);
      });
    }
  }
});