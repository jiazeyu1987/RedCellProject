const healthArchiveService = require('../../services/health-archive.service.js');

Page({
  data: {
    memberId: '',
    recordType: 'vital', // vital, report, medication, monitoring, consultation, diagnosis, surgery
    formData: {},
    submitting: false,
    
    // 表单配置
    vitalSignForm: {
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      bodyTemperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      notes: '',
      measureTime: ''
    },
    
    medicalReportForm: {
      reportType: 'blood',
      hospital: '',
      department: '',
      doctor: '',
      diagnosis: '',
      recommendations: '',
      reportDate: '',
      files: []
    },
    
    medicationForm: {
      medicationName: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      indication: '',
      startDate: '',
      endDate: '',
      notes: ''
    },
    
    monitoringForm: {
      monitorType: 'glucose',
      value: '',
      unit: '',
      timeOfDay: 'morning',
      context: '',
      notes: ''
    },
    
    // 新增：运动记录表单
    exerciseForm: {
      recordTime: '',
      exercise: {
        type: '',
        duration: '',
        intensity: 'moderate',
        calories: '',
        distance: '',
        steps: ''
      },
      exerciseContext: {
        location: '',
        weather: '',
        temperature: '',
        equipment: [],
        companion: ''
      },
      physicalState: {
        preExerciseHeartRate: '',
        postExerciseHeartRate: '',
        maxHeartRate: '',
        avgHeartRate: '',
        energyLevel: '',
        fatigue: '',
        mood: ''
      },
      performance: {
        perceived_exertion: '',
        completion_rate: 100,
        personal_record: false,
        achievement: '',
        difficulty: ''
      },
      notes: '',
      tags: []
    },
    
    // 新增：睡眠记录表单
    sleepForm: {
      recordDate: '',
      sleepTime: {
        bedTime: '',
        sleepTime: '',
        wakeUpTime: '',
        duration: '',
        sleepLatency: ''
      },
      sleepQuality: {
        overall: '',
        deepSleep: '',
        lightSleep: '',
        remSleep: '',
        awakening: '',
        restfulness: ''
      },
      sleepEnvironment: {
        room_temperature: '',
        noise_level: '',
        light_level: '',
        air_quality: '',
        bed_comfort: '',
        pillow_comfort: ''
      },
      preSleepState: {
        stress_level: '',
        caffeine_intake: false,
        alcohol_intake: false,
        heavy_meal: false,
        exercise_timing: '',
        screen_time: '',
        mood: ''
      },
      postSleepState: {
        morning_mood: '',
        energy_level: '',
        alertness: '',
        physical_feeling: '',
        motivation: ''
      },
      notes: '',
      dream_description: '',
      sleep_aids: [],
      disruptions: []
    },
    
    // 新增：就诊记录表单
    consultationForm: {
      recordDate: '',
      hospital: '',
      department: '',
      doctor: '',
      visitType: 'outpatient',
      chiefComplaint: '',
      presentIllness: '',
      diagnosis: '',
      treatment: '',
      followUpInstructions: '',
      nextVisitDate: '',
      cost: '',
      notes: ''
    },
    
    // 新增：用药记录表单
    medicationRecordForm: {
      medicationName: '',
      genericName: '',
      specification: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      startDate: '',
      endDate: '',
      prescribedBy: '',
      indication: '',
      status: 'active',
      notes: ''
    },
    
    // 新增：检查报告表单
    examinationReportForm: {
      reportType: 'blood',
      reportDate: '',
      orderDate: '',
      hospital: '',
      department: '',
      doctor: '',
      testItems: [],
      results: [],
      diagnosis: '',
      recommendations: '',
      followUpRequired: false,
      followUpDate: '',
      urgency: 'normal',
      cost: '',
      notes: ''
    },
    
    // 新增：诊断记录表单
    diagnosisForm: {
      diagnosisDate: '',
      doctor: '',
      hospital: '',
      department: '',
      primaryDiagnosis: '',
      secondaryDiagnoses: [],
      severity: 'mild',
      confidence: 'definitive',
      prognosis: '',
      treatmentPlan: '',
      followUpPlan: '',
      status: 'active',
      notes: ''
    },
    
    // 新增：手术记录表单
    surgeryForm: {
      surgeryDate: '',
      surgeryName: '',
      surgeryCode: '',
      hospital: '',
      department: '',
      surgeon: '',
      anesthesiaType: '',
      indication: '',
      preoperativeDiagnosis: '',
      postoperativeDiagnosis: '',
      surgicalProcedure: '',
      findings: '',
      duration: '',
      postoperativeCare: '',
      nextVisitDate: '',
      cost: '',
      notes: ''
    },
    
    // 选项配置
    recordTypeOptions: [
      { value: 'vital', label: '生命体征', icon: 'heartbeat' },
      { value: 'exercise', label: '运动记录', icon: 'run' },
      { value: 'sleep', label: '睡眠记录', icon: 'moon' },
      { value: 'consultation', label: '就诊记录', icon: 'medical-bag' },
      { value: 'medicationRecord', label: '用药记录', icon: 'pill' },
      { value: 'examinationReport', label: '检查报告', icon: 'file-text' },
      { value: 'diagnosis', label: '诊断记录', icon: 'stethoscope' },
      { value: 'surgery', label: '手术记录', icon: 'surgical-knife' },
      { value: 'monitoring', label: '健康监测', icon: 'activity' }
    ],
    
    reportTypeOptions: [
      { value: 'blood', label: '血液检查' },
      { value: 'urine', label: '尿液检查' },
      { value: 'imaging', label: '影像检查' },
      { value: 'ecg', label: '心电图' },
      { value: 'endoscopy', label: '内镜检查' },
      { value: 'pathology', label: '病理检查' }
    ],
    
    routeOptions: [
      { value: 'oral', label: '口服' },
      { value: 'injection', label: '注射' },
      { value: 'topical', label: '外用' },
      { value: 'inhalation', label: '吸入' },
      { value: 'sublingual', label: '舌下含服' }
    ],
    
    visitTypeOptions: [
      { value: 'outpatient', label: '门诊' },
      { value: 'emergency', label: '急诊' },
      { value: 'follow_up', label: '复诊' },
      { value: 'consultation', label: '会诊' }
    ],
    
    medicationStatusOptions: [
      { value: 'active', label: '正在使用' },
      { value: 'completed', label: '已完成' },
      { value: 'discontinued', label: '已停药' },
      { value: 'paused', label: '暂停使用' }
    ],
    
    severityOptions: [
      { value: 'mild', label: '轻度' },
      { value: 'moderate', label: '中度' },
      { value: 'severe', label: '重度' },
      { value: 'critical', label: '危重' }
    ],
    
    confidenceOptions: [
      { value: 'definitive', label: '明确诊断' },
      { value: 'probable', label: '可能诊断' },
      { value: 'possible', label: '疑似诊断' }
    ],
    
    urgencyOptions: [
      { value: 'normal', label: '正常' },
      { value: 'urgent', label: '紧急' },
      { value: 'critical', label: '危急' }
    ],
    
    monitorTypeOptions: [
      { value: 'glucose', label: '血糖', unit: 'mmol/L' },
      { value: 'weight', label: '体重', unit: 'kg' },
      { value: 'exercise', label: '运动', unit: '小时' },
      { value: 'sleep', label: '睡眠', unit: '小时' }
    ],
    
    timeOfDayOptions: [
      { value: 'morning', label: '早晨' },
      { value: 'afternoon', label: '下午' },
      { value: 'evening', label: '晚上' }
    ],
    
    // 运动相关选项
    exerciseTypeOptions: [
      { value: 'running', label: '跑步' },
      { value: 'walking', label: '散步' },
      { value: 'cycling', label: '骑行' },
      { value: 'swimming', label: '游泳' },
      { value: 'strength', label: '力量训练' },
      { value: 'yoga', label: '瑜伽' },
      { value: 'basketball', label: '篮球' },
      { value: 'football', label: '足球' },
      { value: 'tennis', label: '网球' },
      { value: 'badminton', label: '羽毛球' }
    ],
    
    exerciseIntensityOptions: [
      { value: 'low', label: '低强度' },
      { value: 'moderate', label: '中等强度' },
      { value: 'high', label: '高强度' },
      { value: 'vigorous', label: '剧烈运动' }
    ],
    
    exerciseLocationOptions: [
      { value: 'indoor', label: '室内' },
      { value: 'outdoor', label: '室外' },
      { value: 'gym', label: '健身房' },
      { value: 'home', label: '家里' }
    ],
    
    energyLevelOptions: [
      { value: 'very_low', label: '非常低' },
      { value: 'low', label: '较低' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '较高' },
      { value: 'very_high', label: '非常高' }
    ],
    
    // 睡眠相关选项
    sleepQualityOptions: [
      { value: 'very_poor', label: '非常差' },
      { value: 'poor', label: '差' },
      { value: 'fair', label: '一般' },
      { value: 'good', label: '好' },
      { value: 'excellent', label: '非常好' }
    ],
    
    noiseLevelOptions: [
      { value: 'quiet', label: '安静' },
      { value: 'moderate', label: '适中' },
      { value: 'noisy', label: '噪音' }
    ],
    
    lightLevelOptions: [
      { value: 'dark', label: '黑暗' },
      { value: 'dim', label: '暗淡' },
      { value: 'bright', label: '明亮' }
    ],
    
    comfortLevelOptions: [
      { value: 'uncomfortable', label: '不舒适' },
      { value: 'fair', label: '一般' },
      { value: 'comfortable', label: '舒适' },
      { value: 'very_comfortable', label: '非常舒适' }
    ],
    
    stressLevelOptions: [
      { value: 'low', label: '低' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '高' }
    ],
    
    exerciseTimingOptions: [
      { value: 'no_exercise', label: '没有运动' },
      { value: 'morning', label: '上午运动' },
      { value: 'afternoon', label: '下午运动' },
      { value: 'evening', label: '晚上运动' }
    ],
    
    morningMoodOptions: [
      { value: 'tired', label: '疲惫' },
      { value: 'groggy', label: '昏沉' },
      { value: 'fair', label: '一般' },
      { value: 'refreshed', label: '清醒' },
      { value: 'energetic', label: '精力充沛' }
    ],
    
    alertnessOptions: [
      { value: 'drowsy', label: '昏昏欲睡' },
      { value: 'sluggish', label: '迟缓' },
      { value: 'alert', label: '警觉' },
      { value: 'sharp', label: '敏锐' }
    ]
  },

  onLoad(options) {
    const { memberId, type = 'vital' } = options;
    this.setData({ 
      memberId, 
      recordType: type,
      formData: this.getDefaultFormData(type)
    });
    
    // 设置默认时间
    this.setDefaultDateTime();
  },

  getDefaultFormData(type) {
    const forms = {
      vital: this.data.vitalSignForm,
      report: this.data.medicalReportForm,
      medication: this.data.medicationForm,
      monitoring: this.data.monitoringForm,
      exercise: this.data.exerciseForm,
      sleep: this.data.sleepForm,
      consultation: this.data.consultationForm,
      medicationRecord: this.data.medicationRecordForm,
      examinationReport: this.data.examinationReportForm,
      diagnosis: this.data.diagnosisForm,
      surgery: this.data.surgeryForm
    };
    return { ...forms[type] };
  },

  setDefaultDateTime() {
    const now = new Date();
    const timeStr = now.toISOString().slice(0, 16);
    const dateStr = now.toISOString().slice(0, 10);
    
    const updates = {};
    if (this.data.recordType === 'vital') {
      updates['formData.measureTime'] = timeStr;
    } else if (this.data.recordType === 'report') {
      updates['formData.reportDate'] = dateStr;
    } else if (this.data.recordType === 'medication') {
      updates['formData.startDate'] = dateStr;
    } else if (this.data.recordType === 'exercise') {
      updates['formData.recordTime'] = dateStr;
    } else if (this.data.recordType === 'sleep') {
      updates['formData.recordDate'] = dateStr;
    }
    
    this.setData(updates);
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onSelectChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onDateTimeChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 新增：滑块变化事件
  onSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 新增：开关变化事件
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 新增：提交事件统一入口
  onSubmit() {
    this.submitForm();
  },

  async submitForm() {
    try {
      if (this.data.submitting) return;
      
      // 表单验证
      const isValid = this.validateForm();
      if (!isValid) return;
      
      this.setData({ submitting: true });
      wx.showLoading({ title: '保存中...' });
      
      // 根据记录类型调用不同的API
      await this.saveRecord();
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存记录失败:', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
      wx.hideLoading();
    }
  },

  async saveRecord() {
    const { memberId, recordType, formData } = this.data;
    
    switch (recordType) {
      case 'vital':
        await healthArchiveService.addVitalSign(memberId, formData);
        break;
      case 'report':
        await healthArchiveService.addMedicalReport(memberId, formData);
        break;
      case 'medication':
        await healthArchiveService.addMedication(memberId, formData);
        break;
      case 'monitoring':
        await healthArchiveService.addHealthMonitoring(memberId, formData);
        break;
      // 新增的专门运动和睡眠记录类型
      case 'exercise':
        await healthArchiveService.addExerciseRecord(memberId, formData);
        break;
      case 'sleep':
        await healthArchiveService.addSleepRecord(memberId, formData);
        break;
      // 新增的医疗记录类型
      case 'consultation':
        await healthArchiveService.medicalRecords.addConsultationRecord(memberId, formData);
        break;
      case 'medicationRecord':
        await healthArchiveService.medicalRecords.addMedicationRecord(memberId, formData);
        break;
      case 'examinationReport':
        await healthArchiveService.medicalRecords.addExaminationReport(memberId, formData);
        break;
      case 'diagnosis':
        await healthArchiveService.medicalRecords.addDiagnosisRecord(memberId, formData);
        break;
      case 'surgery':
        await healthArchiveService.medicalRecords.addSurgeryRecord(memberId, formData);
        break;
      default:
        throw new Error('未知的记录类型');
    }
  },

  validateForm() {
    const { recordType, formData } = this.data;
    
    // 根据记录类型验证不同字段
    let requiredFields = [];
    
    switch (recordType) {
      case 'vital':
        requiredFields = ['measureTime'];
        break;
      case 'exercise':
        requiredFields = ['exercise.type', 'exercise.duration'];
        break;
      case 'sleep':
        requiredFields = ['sleepTime.bedTime', 'sleepTime.wakeUpTime', 'sleepTime.duration'];
        break;
      case 'consultation':
        requiredFields = ['recordDate', 'hospital', 'department', 'doctor'];
        break;
      case 'medicationRecord':
        requiredFields = ['medicationName', 'dosage', 'frequency', 'startDate'];
        break;
      case 'examinationReport':
        requiredFields = ['reportType', 'reportDate', 'hospital'];
        break;
      case 'diagnosis':
        requiredFields = ['diagnosisDate', 'doctor', 'primaryDiagnosis'];
        break;
      case 'surgery':
        requiredFields = ['surgeryDate', 'surgeryName', 'hospital', 'surgeon'];
        break;
      case 'medication':
        requiredFields = ['medicationName', 'dosage'];
        break;
      case 'monitoring':
        requiredFields = ['monitorType', 'value'];
        break;
    }
    
    // 检查必填字段
    for (const field of requiredFields) {
      const fieldValue = this.getNestedFieldValue(formData, field);
      if (!fieldValue || fieldValue === '') {
        const fieldLabels = {
          'exercise.type': '运动类型',
          'exercise.duration': '运动时长',
          'sleepTime.bedTime': '上床时间',
          'sleepTime.wakeUpTime': '起床时间',
          'sleepTime.duration': '睡眠时长',
          recordDate: '记录日期',
          hospital: '医院名称',
          department: '科室',
          doctor: '医生姓名',
          medicationName: '药物名称',
          dosage: '剂量',
          frequency: '频率',
          startDate: '开始日期',
          reportType: '报告类型',
          reportDate: '报告日期',
          diagnosisDate: '诊断日期',
          primaryDiagnosis: '主要诊断',
          surgeryDate: '手术日期',
          surgeryName: '手术名称',
          surgeon: '主刀医生',
          monitorType: '监测类型',
          value: '数值',
          measureTime: '测量时间'
        };
        
        const label = fieldLabels[field] || field;
        wx.showToast({
          title: `请填写${label}`,
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },
  
  // 获取嵌套字段值
  getNestedFieldValue(obj, field) {
    const keys = field.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return null;
      }
    }
    return value;
  },,
          frequency: '用药频率',
          startDate: '开始日期',
          reportType: '报告类型',
          reportDate: '报告日期',
          diagnosisDate: '诊断日期',
          primaryDiagnosis: '主要诊断',
          surgeryDate: '手术日期',
          surgeryName: '手术名称',
          surgeon: '主刀医生',
          measureTime: '测量时间',
          monitorType: '监测类型',
          value: '数值'
        };
        
        wx.showToast({
          title: `请填写${fieldLabels[field] || field}`,
          icon: 'error'
        });
        return false;
      }
    }
    
    // 特定验证
    if (recordType === 'medicationRecord' && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        wx.showToast({
          title: '结束日期必须晚于开始日期',
          icon: 'error'
        });
        return false;
      }
    }
    
    return true;
  },
  
  // 新增：记录类型切换
  onRecordTypeChange(e) {
    const recordType = e.detail.value;
    this.setData({
      recordType,
      formData: this.getDefaultFormData(recordType)
    });
    this.setDefaultDateTime();
  },
  
  // 新增：添加次要诊断
  addSecondaryDiagnosis() {
    const secondaryDiagnoses = this.data.formData.secondaryDiagnoses || [];
    secondaryDiagnoses.push('');
    this.setData({
      'formData.secondaryDiagnoses': secondaryDiagnoses
    });
  },
  
  // 新增：删除次要诊断
  removeSecondaryDiagnosis(e) {
    const { index } = e.currentTarget.dataset;
    const secondaryDiagnoses = this.data.formData.secondaryDiagnoses || [];
    secondaryDiagnoses.splice(index, 1);
    this.setData({
      'formData.secondaryDiagnoses': secondaryDiagnoses
    });
  },
  
  // 新增：更新次要诊断
  onSecondaryDiagnosisChange(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;
    const secondaryDiagnoses = this.data.formData.secondaryDiagnoses || [];
    secondaryDiagnoses[index] = value;
    this.setData({
      'formData.secondaryDiagnoses': secondaryDiagnoses
    });
  },
  
  // 新增：切换选项
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  }
    
    switch (recordType) {
      case 'vital':
        return this.validateVitalForm(formData);
      case 'report':
        return this.validateReportForm(formData);
      case 'medication':
        return this.validateMedicationForm(formData);
      case 'monitoring':
        return this.validateMonitoringForm(formData);
    }
    return false;
  },

  validateVitalForm(data) {
    if (!data.bloodPressure.systolic && !data.heartRate && !data.bodyTemperature) {
      wx.showToast({ title: '请至少填写一项生命体征', icon: 'none' });
      return false;
    }
    return true;
  },

  validateReportForm(data) {
    if (!data.hospital || !data.reportType) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return false;
    }
    return true;
  },

  validateMedicationForm(data) {
    if (!data.medicationName || !data.dosage) {
      wx.showToast({ title: '请填写药物名称和剂量', icon: 'none' });
      return false;
    }
    return true;
  },

  validateMonitoringForm(data) {
    if (!data.value) {
      wx.showToast({ title: '请填写监测数值', icon: 'none' });
      return false;
    }
    return true;
  }
});