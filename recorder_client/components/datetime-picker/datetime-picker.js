/**
 * 日期时间选择器组件
 * 支持日期、时间、日期时间选择
 */
Component({
  properties: {
    // 选择器类型：date, time, datetime
    type: {
      type: String,
      value: 'datetime'
    },
    
    // 当前值
    value: {
      type: String,
      value: '',
      observer: function(newVal) {
        this.updateCurrentValue(newVal);
      }
    },
    
    // 最小日期时间
    minDate: {
      type: String,
      value: ''
    },
    
    // 最大日期时间
    maxDate: {
      type: String,
      value: ''
    },
    
    // 时间间隔（分钟）
    minuteStep: {
      type: Number,
      value: 15
    },
    
    // 显示格式
    format: {
      type: String,
      value: 'YYYY-MM-DD HH:mm'
    },
    
    // 占位文本
    placeholder: {
      type: String,
      value: '请选择时间'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    },
    
    // 可用时间段限制
    availableSlots: {
      type: Array,
      value: [],
      observer: function(newVal) {
        this.updateAvailableSlots(newVal);
      }
    },
    
    // 禁用的时间段
    disabledSlots: {
      type: Array,
      value: []
    },
    
    // 最小调整间隔（分钟）
    minAdjustInterval: {
      type: Number,
      value: 30
    },
    
    // 工作时间配置
    workingHours: {
      type: Object,
      value: {
        start: '08:00',
        end: '18:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      }
    },
    
    // 是否启用时间冲突检测
    enableConflictDetection: {
      type: Boolean,
      value: false
    },
    
    // 是否启用智能推荐
    enableSmartRecommend: {
      type: Boolean,
      value: false
    },
    
    // 预约服务时长（分钟）
    serviceDuration: {
      type: Number,
      value: 60
    },
    
    // 预约ID（用于排除自身冲突检测）
    appointmentId: {
      type: String,
      value: ''
    }
  },

  data: {
    // 显示文本
    displayText: '',
    
    // 选择器显示状态
    pickerVisible: false,
    
    // 日期选择器数据
    datePickerValue: [0, 0, 0], // 年、月、日索引
    datePickerRange: [[], [], []], // 年、月、日选项
    
    // 时间选择器数据
    timePickerValue: [0, 0], // 小时、分钟索引
    timePickerRange: [[], []], // 小时、分钟选项
    
    // 当前选中的日期时间
    currentDateTime: {
      year: 0,
      month: 0,
      date: 0,
      hours: 0,
      minutes: 0
    },
    
    // 可用时间段数据
    availableSlotsData: [],
    
    // 禁用的时间段数据
    disabledSlotsData: [],
    
    // 冲突检测结果
    conflictResult: {
      hasConflict: false,
      conflictDetails: []
    },
    
    // 智能推荐结果
    recommendedTimes: [],
    
    // 时间段验证状态
    validation: {
      isValid: true,
      message: ''
    }
  },

  lifetimes: {
    attached() {
      this.initPicker();
    }
  },

  methods: {
    /**
     * 初始化选择器
     */
    initPicker() {
      this.generateDateRange();
      this.generateTimeRange();
      this.updateCurrentValue(this.data.value);
    },

    /**
     * 生成日期范围
     */
    generateDateRange() {
      const now = new Date();
      const minDate = this.data.minDate ? new Date(this.data.minDate) : new Date(now.getFullYear(), 0, 1);
      const maxDate = this.data.maxDate ? new Date(this.data.maxDate) : new Date(now.getFullYear() + 2, 11, 31);
      
      // 生成年份
      const years = [];
      for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year++) {
        years.push(`${year}年`);
      }
      
      // 生成月份
      const months = [];
      for (let month = 1; month <= 12; month++) {
        months.push(`${month}月`);
      }
      
      // 生成日期（动态生成，根据选中的年月）
      const days = this.generateDaysForMonth(now.getFullYear(), now.getMonth() + 1);
      
      this.setData({
        'datePickerRange[0]': years,
        'datePickerRange[1]': months,
        'datePickerRange[2]': days
      });
    },

    /**
     * 生成指定年月的日期
     */
    generateDaysForMonth(year, month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(`${day}日`);
      }
      return days;
    },

    /**
     * 生成时间范围
     */
    generateTimeRange() {
      // 生成小时
      const hours = [];
      for (let hour = 0; hour < 24; hour++) {
        hours.push(`${hour.toString().padStart(2, '0')}时`);
      }
      
      // 生成分钟（根据步长）
      const minutes = [];
      for (let minute = 0; minute < 60; minute += this.data.minuteStep) {
        minutes.push(`${minute.toString().padStart(2, '0')}分`);
      }
      
      this.setData({
        'timePickerRange[0]': hours,
        'timePickerRange[1]': minutes
      });
    },

    /**
     * 更新当前值
     */
    updateCurrentValue(value) {
      if (!value) {
        this.setData({
          displayText: this.data.placeholder
        });
        return;
      }
      
      const dateTime = new Date(value);
      if (isNaN(dateTime.getTime())) {
        console.warn('Invalid datetime value:', value);
        return;
      }
      
      // 更新当前日期时间对象
      const currentDateTime = {
        year: dateTime.getFullYear(),
        month: dateTime.getMonth() + 1,
        date: dateTime.getDate(),
        hours: dateTime.getHours(),
        minutes: dateTime.getMinutes()
      };
      
      // 更新选择器索引
      this.updatePickerIndexes(currentDateTime);
      
      // 更新显示文本
      const displayText = this.formatDisplayText(dateTime);
      
      this.setData({
        currentDateTime,
        displayText
      });
    },

    /**
     * 更新选择器索引
     */
    updatePickerIndexes(dateTime) {
      const minDate = this.data.minDate ? new Date(this.data.minDate) : new Date(dateTime.year, 0, 1);
      
      // 日期选择器索引
      const yearIndex = dateTime.year - minDate.getFullYear();
      const monthIndex = dateTime.month - 1;
      const dateIndex = dateTime.date - 1;
      
      // 时间选择器索引
      const hourIndex = dateTime.hours;
      const minuteIndex = Math.floor(dateTime.minutes / this.data.minuteStep);
      
      this.setData({
        datePickerValue: [yearIndex, monthIndex, dateIndex],
        timePickerValue: [hourIndex, minuteIndex]
      });
    },

    /**
     * 格式化显示文本
     */
    formatDisplayText(dateTime) {
      const format = this.data.format;
      
      const year = dateTime.getFullYear();
      const month = (dateTime.getMonth() + 1).toString().padStart(2, '0');
      const date = dateTime.getDate().toString().padStart(2, '0');
      const hours = dateTime.getHours().toString().padStart(2, '0');
      const minutes = dateTime.getMinutes().toString().padStart(2, '0');
      
      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', date)
        .replace('HH', hours)
        .replace('mm', minutes);
    },

    /**
     * 显示选择器
     */
    showPicker() {
      if (this.data.disabled) return;
      
      this.setData({
        pickerVisible: true
      });
    },

    /**
     * 隐藏选择器
     */
    hidePicker() {
      this.setData({
        pickerVisible: false
      });
    },

    /**
     * 日期选择器变化
     */
    onDatePickerChange(e) {
      const value = e.detail.value;
      const datePickerRange = this.data.datePickerRange;
      
      // 获取选中的年月日
      const year = parseInt(datePickerRange[0][value[0]].replace('年', ''));
      const month = parseInt(datePickerRange[1][value[1]].replace('月', ''));
      const date = parseInt(datePickerRange[2][value[2]].replace('日', ''));
      
      // 更新日期
      const currentDateTime = {
        ...this.data.currentDateTime,
        year,
        month,
        date
      };
      
      // 如果选择了新的年月，需要重新生成日期选项
      if (value[0] !== this.data.datePickerValue[0] || value[1] !== this.data.datePickerValue[1]) {
        const newDays = this.generateDaysForMonth(year, month);
        this.setData({
          'datePickerRange[2]': newDays
        });
        
        // 确保选中的日期不超出新月份的天数
        if (date > newDays.length) {
          value[2] = newDays.length - 1;
          currentDateTime.date = newDays.length;
        }
      }
      
      this.setData({
        datePickerValue: value,
        currentDateTime
      });
      
      this.updateValue();
    },

    /**
     * 时间选择器变化
     */
    onTimePickerChange(e) {
      const value = e.detail.value;
      const timePickerRange = this.data.timePickerRange;
      
      // 获取选中的时分
      const hours = parseInt(timePickerRange[0][value[0]].replace('时', ''));
      const minutes = parseInt(timePickerRange[1][value[1]].replace('分', ''));
      
      // 更新时间
      const currentDateTime = {
        ...this.data.currentDateTime,
        hours,
        minutes
      };
      
      this.setData({
        timePickerValue: value,
        currentDateTime
      });
      
      this.updateValue();
    },

    /**
     * 确认选择
     */
    onConfirm() {
      this.updateValue();
      this.hidePicker();
    },

    /**
     * 取消选择
     */
    onCancel() {
      this.hidePicker();
    },

    /**
     * 更新值并触发事件
     */
    async updateValue() {
      const { year, month, date, hours, minutes } = this.data.currentDateTime;
      
      // 创建新的日期对象
      const newDateTime = new Date(year, month - 1, date, hours, minutes);
      
      // 检查日期是否在允许范围内
      if (this.data.minDate && newDateTime < new Date(this.data.minDate)) {
        wx.showToast({
          title: '时间不能早于最小时间',
          icon: 'none'
        });
        return;
      }
      
      if (this.data.maxDate && newDateTime > new Date(this.data.maxDate)) {
        wx.showToast({
          title: '时间不能晚于最大时间',
          icon: 'none'
        });
        return;
      }
      
      // 进行增强验证
      const validation = await this.validateTimeSelection(newDateTime);
      
      if (!validation.isValid) {
        wx.showToast({
          title: validation.message,
          icon: 'none',
          duration: 3000
        });
        
        // 触发验证失败事件
        this.triggerEvent('validationFail', {
          validation,
          dateTime: newDateTime
        });
        
        return;
      }
      
      // 格式化为 ISO 字符串
      const value = newDateTime.toISOString();
      
      // 更新显示文本
      const displayText = this.formatDisplayText(newDateTime);
      
      this.setData({
        displayText
      });
      
      // 获取智能推荐（如果启用）
      if (this.data.enableSmartRecommend) {
        const recommendations = await this.getSmartRecommendations(newDateTime);
        
        // 触发推荐事件
        this.triggerEvent('recommendationsReady', {
          recommendations,
          dateTime: newDateTime
        });
      }
      
      // 触发变更事件
      this.triggerEvent('change', {
        value: value,
        displayText: displayText,
        dateTime: newDateTime,
        validation: validation,
        conflictResult: this.data.conflictResult
      });
    },

    /**
     * 清空选择
     */
    onClear() {
      this.setData({
        displayText: this.data.placeholder,
        currentDateTime: {
          year: 0,
          month: 0,
          date: 0,
          hours: 0,
          minutes: 0
        }
      });
      
      this.triggerEvent('change', {
        value: '',
        displayText: '',
        dateTime: null
      });
    },

    // ========== 增强功能方法 ==========
    
    /**
     * 更新可用时间段
     */
    updateAvailableSlots(availableSlots) {
      this.setData({
        availableSlotsData: availableSlots || []
      });
      
      // 重新生成时间范围
      if (this.data.enableConflictDetection) {
        this.generateAvailableTimeRange();
      }
    },
    
    /**
     * 生成可用时间范围
     */
    generateAvailableTimeRange() {
      const { availableSlotsData, workingHours, minuteStep } = this.data;
      
      if (availableSlotsData.length === 0) {
        // 如果没有限制，使用工作时间
        this.generateWorkingHoursRange();
        return;
      }
      
      // 根据可用时间段生成时间选项
      const availableHours = [];
      const availableMinutes = [];
      
      availableSlotsData.forEach(slot => {
        const startTime = this.parseTime(slot.startTime);
        const endTime = this.parseTime(slot.endTime);
        
        for (let hour = startTime.hour; hour <= endTime.hour; hour++) {
          if (availableHours.indexOf(hour) === -1) {
            availableHours.push(hour);
          }
        }
      });
      
      // 生成分钟选项
      for (let minute = 0; minute < 60; minute += minuteStep) {
        availableMinutes.push(minute);
      }
      
      // 更新时间选择器
      const hours = availableHours.map(h => `${h.toString().padStart(2, '0')}时`);
      const minutes = availableMinutes.map(m => `${m.toString().padStart(2, '0')}分`);
      
      this.setData({
        'timePickerRange[0]': hours,
        'timePickerRange[1]': minutes
      });
    },
    
    /**
     * 生成工作时间范围
     */
    generateWorkingHoursRange() {
      const { workingHours, minuteStep } = this.data;
      const startTime = this.parseTime(workingHours.start);
      const endTime = this.parseTime(workingHours.end);
      const breakStart = this.parseTime(workingHours.breakStart);
      const breakEnd = this.parseTime(workingHours.breakEnd);
      
      const hours = [];
      const minutes = [];
      
      // 生成工作时间内的小时
      for (let hour = startTime.hour; hour <= endTime.hour; hour++) {
        // 跳过休息时间
        if (hour < breakStart.hour || hour >= breakEnd.hour) {
          hours.push(`${hour.toString().padStart(2, '0')}时`);
        }
      }
      
      // 生成分钟选项
      for (let minute = 0; minute < 60; minute += minuteStep) {
        minutes.push(`${minute.toString().padStart(2, '0')}分`);
      }
      
      this.setData({
        'timePickerRange[0]': hours,
        'timePickerRange[1]': minutes
      });
    },
    
    /**
     * 检测时间冲突
     */
    async detectTimeConflict(dateTime) {
      if (!this.data.enableConflictDetection) {
        return { hasConflict: false, conflictDetails: [] };
      }
      
      try {
        // 调用冲突检测 API
        const result = await this.callConflictDetectionAPI({
          dateTime: dateTime.toISOString(),
          duration: this.data.serviceDuration,
          excludeAppointmentId: this.data.appointmentId
        });
        
        this.setData({
          conflictResult: result
        });
        
        return result;
      } catch (error) {
        console.error('检测时间冲突失败:', error);
        return { hasConflict: false, conflictDetails: [] };
      }
    },
    
    /**
     * 获取智能推荐时间
     */
    async getSmartRecommendations(preferredDateTime) {
      if (!this.data.enableSmartRecommend) {
        return [];
      }
      
      try {
        // 调用智能推荐 API
        const recommendations = await this.callSmartRecommendAPI({
          preferredDateTime: preferredDateTime.toISOString(),
          duration: this.data.serviceDuration,
          workingHours: this.data.workingHours
        });
        
        this.setData({
          recommendedTimes: recommendations
        });
        
        return recommendations;
      } catch (error) {
        console.error('获取智能推荐失败:', error);
        return [];
      }
    },
    
    /**
     * 验证时间选择
     */
    async validateTimeSelection(dateTime) {
      const validation = { isValid: true, message: '' };
      
      // 1. 检查是否在工作时间内
      if (!this.isWithinWorkingHours(dateTime)) {
        validation.isValid = false;
        validation.message = '请选择工作时间内的时间';
        this.setData({ validation });
        return validation;
      }
      
      // 2. 检查是否在可用时间段内
      if (!this.isWithinAvailableSlots(dateTime)) {
        validation.isValid = false;
        validation.message = '请选择可用的时间段';
        this.setData({ validation });
        return validation;
      }
      
      // 3. 检查最小调整间隔
      if (!this.checkMinAdjustInterval(dateTime)) {
        validation.isValid = false;
        validation.message = `调整时间间隔不能小于${this.data.minAdjustInterval}分钟`;
        this.setData({ validation });
        return validation;
      }
      
      // 4. 检测时间冲突
      const conflictResult = await this.detectTimeConflict(dateTime);
      if (conflictResult.hasConflict) {
        validation.isValid = false;
        validation.message = '选择的时间存在冲突';
      }
      
      this.setData({ validation });
      return validation;
    },
    
    /**
     * 检查是否在工作时间内
     */
    isWithinWorkingHours(dateTime) {
      const { workingHours } = this.data;
      const hour = dateTime.getHours();
      const minute = dateTime.getMinutes();
      const currentTime = hour * 60 + minute;
      
      const startTime = this.parseTime(workingHours.start);
      const endTime = this.parseTime(workingHours.end);
      const breakStart = this.parseTime(workingHours.breakStart);
      const breakEnd = this.parseTime(workingHours.breakEnd);
      
      const workStart = startTime.hour * 60 + startTime.minute;
      const workEnd = endTime.hour * 60 + endTime.minute;
      const breakStartTime = breakStart.hour * 60 + breakStart.minute;
      const breakEndTime = breakEnd.hour * 60 + breakEnd.minute;
      
      // 检查是否在工作时间内且不在休息时间
      return currentTime >= workStart && 
             currentTime <= workEnd && 
             (currentTime < breakStartTime || currentTime >= breakEndTime);
    },
    
    /**
     * 检查是否在可用时间段内
     */
    isWithinAvailableSlots(dateTime) {
      const { availableSlotsData } = this.data;
      
      if (availableSlotsData.length === 0) {
        return true; // 没有限制则默认可用
      }
      
      const targetTime = dateTime.getHours() * 60 + dateTime.getMinutes();
      const serviceDuration = this.data.serviceDuration;
      
      return availableSlotsData.some(slot => {
        const startTime = this.parseTime(slot.startTime);
        const endTime = this.parseTime(slot.endTime);
        const slotStart = startTime.hour * 60 + startTime.minute;
        const slotEnd = endTime.hour * 60 + endTime.minute;
        
        // 检查服务时间是否完全在可用时间段内
        return targetTime >= slotStart && (targetTime + serviceDuration) <= slotEnd;
      });
    },
    
    /**
     * 检查最小调整间隔
     */
    checkMinAdjustInterval(dateTime) {
      if (!this.data.value) {
        return true; // 初始选择时不限制
      }
      
      const originalDateTime = new Date(this.data.value);
      const timeDiff = Math.abs(dateTime.getTime() - originalDateTime.getTime());
      const minInterval = this.data.minAdjustInterval * 60 * 1000; // 转为毫秒
      
      return timeDiff >= minInterval;
    },
    
    /**
     * 解析时间字符串 (HH:mm)
     */
    parseTime(timeStr) {
      const [hour, minute] = timeStr.split(':').map(n => parseInt(n));
      return { hour, minute };
    },
    
    /**
     * 获取可用时间段提示
     */
    getAvailableTimeHints() {
      const { availableSlotsData } = this.data;
      
      if (availableSlotsData.length === 0) {
        return '全天可用';
      }
      
      const hints = availableSlotsData.map(slot => 
        `${slot.startTime}-${slot.endTime}`
      ).join(', ');
      
      return `可用时段: ${hints}`;
    },
    
    // ========== API 调用方法 ==========
    
    /**
     * 调用冲突检测 API
     */
    async callConflictDetectionAPI(params) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            hasConflict: false,
            conflictDetails: []
          });
        }, 300);
      });
    },
    
    /**
     * 调用智能推荐 API
     */
    async callSmartRecommendAPI(params) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            {
              dateTime: new Date(params.preferredDateTime),
              score: 95,
              reason: '时间充裕，无冲突'
            }
          ]);
        }, 500);
      });
    },
    
    // ========== 公开方法 ==========
    
    /**
     * 设置可用时间段
     */
    setAvailableSlots(slots) {
      this.setData({
        availableSlotsData: slots || []
      });
      this.generateAvailableTimeRange();
    },
    
    /**
     * 设置禁用时间段
     */
    setDisabledSlots(slots) {
      this.setData({
        disabledSlotsData: slots || []
      });
    },
    
    /**
     * 手动触发冲突检测
     */
    async checkConflict() {
      const { year, month, date, hours, minutes } = this.data.currentDateTime;
      const dateTime = new Date(year, month - 1, date, hours, minutes);
      
      const result = await this.detectTimeConflict(dateTime);
      
      this.triggerEvent('conflictDetected', {
        conflictResult: result,
        dateTime: dateTime
      });
      
      return result;
    },
    
    /**
     * 获取当前验证状态
     */
    getValidationStatus() {
      return this.data.validation;
    },
    
    /**
     * 重置验证状态
     */
    resetValidation() {
      this.setData({
        validation: {
          isValid: true,
          message: ''
        }
      });
    }
  }
});