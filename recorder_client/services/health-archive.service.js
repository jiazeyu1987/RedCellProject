/**
 * 健康档案管理服务
 * 负责管理家庭成员的健康数据、医疗记录、体检报告等信息
 */

const { storage } = require('../utils/storage.js');
const { PatientAPI } = require('../api/index.js');

class HealthArchiveService {
  constructor() {
    this.storageKey = 'health_archive_data';
    this.cacheExpire = 30 * 60 * 1000; // 30分钟缓存过期时间
    this.localData = null;
    this.lastSyncTime = null;
  }

  // ==================== 健康档案数据结构定义 ====================

  /**
   * 医疗记录数据结构
   */
  getMedicalRecordSchema() {
    return {
      id: '', // 记录ID
      memberId: '', // 成员ID
      recordType: '', // 记录类型：consultation, hospitalization, surgery, emergency, vaccination
      recordDate: '', // 记录日期
      hospital: '', // 医院名称
      department: '', // 科室
      doctor: '', // 医生姓名
      chiefComplaint: '', // 主诉
      presentIllness: '', // 现病史
      pastHistory: '', // 既往史
      physicalExamination: '', // 体格检查
      diagnosis: '', // 诊断
      treatment: '', // 治疗方案
      medications: [], // 开具药物
      followUpInstructions: '', // 随访指导
      nextVisitDate: '', // 下次就诊日期
      cost: 0, // 费用
      status: 'active', // 状态：active, completed, cancelled
      files: [], // 相关文件
      notes: '', // 备注
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 就诊记录数据结构
   */
  getConsultationSchema() {
    return {
      ...this.getMedicalRecordSchema(),
      recordType: 'consultation',
      visitType: '', // 就诊类型：outpatient, emergency, follow_up
      appointmentTime: '', // 预约时间
      waitingTime: 0, // 等待时间(分钟)
      consultationDuration: 0, // 就诊时长(分钟)
      symptoms: [], // 症状列表
      vitalSigns: {}, // 生命体征
      prescriptions: [], // 处方
      referrals: [], // 转诊
      testOrders: [], // 检查单
      dischargeInstructions: '' // 出院/离院指导
    };
  }

  /**
   * 用药记录扩展数据结构
   */
  getMedicationRecordSchema() {
    return {
      id: '', // 用药记录ID
      memberId: '', // 成员ID
      prescriptionId: '', // 处方ID
      medicationName: '', // 药物名称
      genericName: '', // 通用名称
      specification: '', // 规格
      dosage: '', // 剂量
      frequency: '', // 用药频率
      route: '', // 给药途径
      startDate: '', // 开始日期
      endDate: '', // 结束日期
      prescribedBy: '', // 开药医生
      indication: '', // 适应症
      contraindications: [], // 禁忌症
      sideEffects: [], // 副作用
      interactions: [], // 药物相互作用
      adherence: '', // 依从性：good, fair, poor
      effectiveness: '', // 药效：excellent, good, fair, poor
      status: 'active', // 状态：active, completed, discontinued, paused
      discontinueReason: '', // 停药原因
      cost: 0, // 费用
      pharmacy: '', // 购药药店
      batchNumber: '', // 批号
      expiryDate: '', // 有效期
      storageInstructions: '', // 存储说明
      notes: '', // 备注
      reminders: [], // 用药提醒
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 检查报告数据结构
   */
  getExaminationReportSchema() {
    return {
      id: '', // 报告ID
      memberId: '', // 成员ID
      reportType: '', // 报告类型：blood, urine, imaging, ecg, endoscopy, pathology
      reportDate: '', // 报告日期
      orderDate: '', // 开单日期
      hospital: '', // 医院名称
      department: '', // 科室
      doctor: '', // 医生姓名
      technician: '', // 技师姓名
      testItems: [], // 检查项目
      results: [], // 检查结果
      abnormalItems: [], // 异常项目
      normalRange: {}, // 正常范围
      diagnosis: '', // 诊断
      impression: '', // 印象
      recommendations: '', // 建议
      followUpRequired: false, // 是否需要复查
      followUpDate: '', // 复查日期
      urgency: 'normal', // 紧急程度：normal, urgent, critical
      status: 'pending', // 状态：pending, completed, reviewed
      reportFiles: [], // 报告文件
      images: [], // 图像文件
      cost: 0, // 检查费用
      notes: '', // 备注
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 诊断记录数据结构
   */
  getDiagnosisSchema() {
    return {
      id: '', // 诊断ID
      memberId: '', // 成员ID
      consultationId: '', // 关联就诊记录ID
      diagnosisDate: '', // 诊断日期
      doctor: '', // 诊断医生
      hospital: '', // 医院
      department: '', // 科室
      primaryDiagnosis: '', // 主要诊断
      secondaryDiagnoses: [], // 次要诊断
      diagnosisCode: '', // 诊断编码(ICD-10)
      severity: '', // 严重程度：mild, moderate, severe, critical
      stage: '', // 疾病分期
      confidence: '', // 诊断可信度：definitive, probable, possible
      differential: [], // 鉴别诊断
      prognosis: '', // 预后
      treatmentPlan: '', // 治疗计划
      followUpPlan: '', // 随访计划
      complications: [], // 并发症
      comorbidities: [], // 合并症
      status: 'active', // 状态：active, resolved, chronic
      notes: '', // 备注
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 手术记录数据结构
   */
  getSurgerySchema() {
    return {
      id: '', // 手术记录ID
      memberId: '', // 成员ID
      surgeryDate: '', // 手术日期
      surgeryName: '', // 手术名称
      surgeryCode: '', // 手术编码
      hospital: '', // 医院名称
      department: '', // 科室
      operatingRoom: '', // 手术室
      surgeon: '', // 主刀医生
      assistants: [], // 助手医生
      anesthesiologist: '', // 麻醉医生
      anesthesiaType: '', // 麻醉方式
      indication: '', // 手术适应症
      preoperativeDiagnosis: '', // 术前诊断
      postoperativeDiagnosis: '', // 术后诊断
      surgicalProcedure: '', // 手术过程
      findings: '', // 术中所见
      complications: [], // 术中并发症
      bloodLoss: 0, // 出血量(ml)
      duration: 0, // 手术时长(分钟)
      anesthesiaDuration: 0, // 麻醉时长(分钟)
      postoperativeCare: '', // 术后护理
      recovery: '', // 恢复情况
      followUpInstructions: '', // 随访指导
      nextVisitDate: '', // 下次复查日期
      cost: 0, // 手术费用
      status: 'completed', // 状态：scheduled, in_progress, completed, cancelled
      files: [], // 相关文件
      notes: '', // 备注
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 健康档案基础数据结构
   */
  getHealthArchiveSchema() {
    return {
      // 基本信息
      memberId: '', // 成员ID
      archiveId: '', // 档案ID
      createTime: '', // 创建时间
      updateTime: '', // 更新时间
      
      // 基础健康信息
      basicHealthInfo: {
        bloodType: '', // 血型：A, B, AB, O
        height: 0, // 身高(cm)
        weight: 0, // 体重(kg)
        bmi: 0, // BMI指数
        allergies: [], // 过敏史
        chronicDiseases: [], // 慢性疾病
        familyMedicalHistory: [], // 家族病史
        smokingStatus: '', // 吸烟状态：never, former, current
        drinkingStatus: '', // 饮酒状态：never, occasional, regular, heavy
        exerciseFrequency: '', // 运动频率：none, rare, regular, frequent
        sleepQuality: '', // 睡眠质量：poor, fair, good, excellent
        mentalHealth: '', // 心理健康状态：normal, mild, moderate, severe
        lastPhysicalExam: '', // 最后体检时间
        nextPhysicalExamDue: '' // 下次体检预期时间
      },

      // 生命体征记录
      vitalSigns: {
        current: {
          bloodPressure: { systolic: 0, diastolic: 0, measureTime: '' }, // 血压
          heartRate: { value: 0, measureTime: '' }, // 心率
          bodyTemperature: { value: 0, measureTime: '' }, // 体温
          respiratoryRate: { value: 0, measureTime: '' }, // 呼吸频率
          oxygenSaturation: { value: 0, measureTime: '' } // 血氧饱和度
        },
        history: [] // 历史记录
      },

      // 检验检查报告
      medicalReports: {
        bloodTests: [], // 血液检查
        urineTests: [], // 尿液检查
        imagingStudies: [], // 影像学检查（X光、CT、MRI等）
        ecg: [], // 心电图
        endoscopy: [], // 内镜检查
        pathology: [], // 病理检查
        others: [] // 其他检查
      },

      // 医疗记录
      medicalRecords: {
        consultations: [], // 门诊记录
        hospitalizations: [], // 住院记录
        surgeries: [], // 手术记录
        emergencyVisits: [], // 急诊记录
        vaccinations: [], // 疫苗接种记录
        mentalHealthRecords: [] // 心理健康记录
      },

      // 用药信息
      medications: {
        current: [], // 当前用药
        history: [], // 历史用药
        allergicReactions: [] // 药物过敏反应
      },

      // 健康监测数据
      healthMonitoring: {
        bloodGlucose: [], // 血糖监测
        bloodPressureMonitoring: [], // 血压监测
        weightTracking: [], // 体重追踪
        exerciseRecords: [], // 运动记录
        sleepRecords: [], // 睡眠记录
        moodTracking: [], // 情绪追踪
        symptomTracking: [] // 症状追踪
      },

      // 健康计划
      healthPlans: {
        treatment: [], // 治疗计划
        medication: [], // 用药计划
        exercise: [], // 运动计划
        diet: [], // 饮食计划
        followUp: [], // 复查计划
        preventive: [] // 预防保健计划
      },

      // 数据权限和隐私
      dataPermissions: {
        viewPermissions: [], // 查看权限
        editPermissions: [], // 编辑权限
        sharePermissions: [], // 分享权限
        sensitiveDataAccess: [] // 敏感数据访问权限
      }
    };
  }

  /**
   * 生命体征数据结构（增强版）
   */
  getVitalSignSchema() {
    return {
      id: '', // 记录ID
      memberId: '', // 成员ID
      measureTime: '', // 测量时间
      measureBy: '', // 测量者
      
      // 基础生命体征
      bloodPressure: { 
        systolic: 0, // 收缩压
        diastolic: 0, // 舒张压
        unit: 'mmHg', // 单位
        position: 'sitting' // 测量体位
      },
      heartRate: {
        value: 0, // 心率值
        unit: 'bpm', // 单位
        rhythm: 'regular' // 心律
      },
      bodyTemperature: {
        value: 0, // 体温值
        unit: 'celsius', // 单位
        measureSite: 'oral' // 测量部位
      },
      respiratoryRate: {
        value: 0, // 呼吸频率
        unit: 'per_min' // 单位
      },
      oxygenSaturation: {
        value: 0, // 血氧饱和度
        unit: 'percent' // 单位
      },
      
      // 其他指标
      weight: { value: 0, unit: 'kg' },
      height: { value: 0, unit: 'cm' },
      bmi: { value: 0, category: '' },
      bloodGlucose: { value: 0, unit: 'mmol/L', testType: 'random' },
      
      // 异常标记和警报
      abnormal: false,
      alertLevel: 'normal', // normal, caution, warning, critical
      alertReasons: [],
      
      // 设备和记录信息
      deviceInfo: { name: '', model: '' },
      notes: '',
      createTime: '',
      updateTime: ''
    };
  }

  /**
   * 医疗报告数据结构
   */
  getMedicalReportSchema() {
    return {
      id: '', // 报告ID
      memberId: '', // 成员ID
      reportType: '', // 报告类型：blood, urine, imaging, ecg, etc.
      reportDate: '', // 报告日期
      hospital: '', // 医院名称
      department: '', // 科室
      doctor: '', // 医生姓名
      testItems: [], // 检查项目
      results: [], // 检查结果
      abnormalItems: [], // 异常项目
      diagnosis: '', // 诊断
      recommendations: '', // 建议
      followUpRequired: false, // 是否需要复查
      followUpDate: '', // 复查日期
      urgency: '', // 紧急程度：low, medium, high, critical
      files: [], // 相关文件（图片、PDF等）
      status: 'pending' // 状态：pending, reviewed, archived
    };
  }

  /**
   * 用药记录数据结构
   */
  getMedicationSchema() {
    return {
      id: '', // 用药记录ID
      memberId: '', // 成员ID
      medicationName: '', // 药物名称
      genericName: '', // 通用名称
      dosage: '', // 剂量
      frequency: '', // 用药频率
      route: '', // 给药途径：oral, injection, topical, etc.
      startDate: '', // 开始日期
      endDate: '', // 结束日期
      duration: '', // 用药时长
      prescribedBy: '', // 开药医生
      indication: '', // 用药指征
      sideEffects: [], // 副作用
      effectiveness: '', // 药效评价
      adherence: '', // 依从性
      status: 'active', // 状态：active, completed, discontinued
      notes: '', // 备注
      interactions: [], // 药物相互作用
      allergicReaction: false, // 是否过敏
      cost: 0 // 药物费用
    };
  }

  /**
   * 健康监测数据结构
   */
  getHealthMonitoringSchema() {
    return {
      id: '', // 监测记录ID
      memberId: '', // 成员ID
      monitorType: '', // 监测类型：glucose, bp, weight, exercise, sleep, mood
      value: 0, // 监测值
      unit: '', // 单位
      recordTime: '', // 记录时间
      timeOfDay: '', // 一天中的时间：morning, afternoon, evening, night
      context: '', // 测量环境：fasting, post_meal, before_exercise, after_exercise
      device: '', // 监测设备
      notes: '', // 备注
      tags: [], // 标签
      location: '', // 监测地点
      weather: '', // 天气情况
      mood: '', // 情绪状态
      symptoms: [], // 相关症状
      triggers: [], // 触发因素
      abnormal: false, // 是否异常
      trendAnalysis: '' // 趋势分析
    };
  }
  
  // ==================== 运动和睡眠监测专门功能 ====================
  
  /**
   * 添加运动记录
   * @param {string} memberId - 成员ID
   * @param {Object} exerciseData - 运动数据
   * @returns {Promise<Object>} 添加结果
   */
  async addExerciseRecord(memberId, exerciseData) {
    try {
      // 验证数据
      this.validateExerciseData(exerciseData);
      
      // 构建完整数据结构
      const completeData = {
        ...this.getExerciseRecordSchema(),
        ...exerciseData,
        memberId,
        id: this.generateId(),
        recordTime: exerciseData.recordTime || new Date().toISOString(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      // 运动数据分析
      const analysis = this.analyzeExerciseData(completeData);
      completeData.analysis = analysis;
      
      // 获取健康档案
      const healthData = await this.getHealthArchive(memberId);
      
      // 添加到运动记录
      if (!healthData.healthMonitoring.exerciseRecords) {
        healthData.healthMonitoring.exerciseRecords = [];
      }
      healthData.healthMonitoring.exerciseRecords.unshift(completeData);
      
      // 更新运动频率统计
      this.updateExerciseFrequency(healthData, completeData);
      
      // 保存到服务器
      await this.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: completeData.id,
        message: '运动记录添加成功',
        analysis: completeData.analysis
      };
      
    } catch (error) {
      console.error('添加运动记录失败:', error);
      throw new Error(`添加运动记录失败: ${error.message}`);
    }
  }
  
  /**
   * 添加睡眠记录
   * @param {string} memberId - 成员ID
   * @param {Object} sleepData - 睡眠数据
   * @returns {Promise<Object>} 添加结果
   */
  async addSleepRecord(memberId, sleepData) {
    try {
      // 验证数据
      this.validateSleepData(sleepData);
      
      // 构建完整数据结构
      const completeData = {
        ...this.getSleepRecordSchema(),
        ...sleepData,
        memberId,
        id: this.generateId(),
        recordDate: sleepData.recordDate || new Date().toISOString().split('T')[0],
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      // 睡眠数据分析
      const analysis = this.analyzeSleepData(completeData);
      completeData.analysis = analysis;
      
      // 获取健康档案
      const healthData = await this.getHealthArchive(memberId);
      
      // 添加到睡眠记录
      if (!healthData.healthMonitoring.sleepRecords) {
        healthData.healthMonitoring.sleepRecords = [];
      }
      healthData.healthMonitoring.sleepRecords.unshift(completeData);
      
      // 更新睡眠质量统计
      this.updateSleepQuality(healthData, completeData);
      
      // 保存到服务器
      await this.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: completeData.id,
        message: '睡眠记录添加成功',
        analysis: completeData.analysis
      };
      
    } catch (error) {
      console.error('添加睡眠记录失败:', error);
      throw new Error(`添加睡眠记录失败: ${error.message}`);
    }
  }
  
  /**
   * 获取运动记录
   * @param {string} memberId - 成员ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 运动记录
   */
  async getExerciseRecords(memberId, options = {}) {
    try {
      const healthData = await this.getHealthArchive(memberId);
      let records = healthData.healthMonitoring.exerciseRecords || [];
      
      // 时间范围过滤
      if (options.dateRange) {
        records = this.filterByTimeRange(records, options.dateRange);
      }
      
      // 运动类型过滤
      if (options.exerciseType) {
        records = records.filter(r => r.exercise.type === options.exerciseType);
      }
      
      // 限制数量
      if (options.limit) {
        records = records.slice(0, options.limit);
      }
      
      // 添加统计分析
      const statistics = this.calculateExerciseStatistics(records);
      
      return {
        success: true,
        records,
        total: records.length,
        statistics
      };
      
    } catch (error) {
      console.error('获取运动记录失败:', error);
      throw new Error(`获取运动记录失败: ${error.message}`);
    }
  }
  
  /**
   * 获取睡眠记录
   * @param {string} memberId - 成员ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 睡眠记录
   */
  async getSleepRecords(memberId, options = {}) {
    try {
      const healthData = await this.getHealthArchive(memberId);
      let records = healthData.healthMonitoring.sleepRecords || [];
      
      // 时间范围过滤
      if (options.dateRange) {
        records = this.filterByTimeRange(records, options.dateRange);
      }
      
      // 质量过滤
      if (options.quality) {
        records = records.filter(r => r.sleepQuality.overall === options.quality);
      }
      
      // 限制数量
      if (options.limit) {
        records = records.slice(0, options.limit);
      }
      
      // 添加统计分析
      const statistics = this.calculateSleepStatistics(records);
      
      return {
        success: true,
        records,
        total: records.length,
        statistics
      };
      
    } catch (error) {
      console.error('获取睡眠记录失败:', error);
      throw new Error(`获取睡眠记录失败: ${error.message}`);
    }
  }
  
  // ==================== 血压血糖监测专门功能 ====================
  
  /**
   * 血压监测数据结构
   */
  getBloodPressureMonitoringSchema() {
    return {
      id: '',
      memberId: '',
      measureTime: '',
      measureBy: '',
      
      // 血压数据
      bloodPressure: {
        systolic: 0, // 收缩压
        diastolic: 0, // 舒张压
        unit: 'mmHg',
        pulsPressure: 0, // 脉压差
        meanPressure: 0 // 平均动脉压
      },
      
      // 测量环境
      measurementContext: {
        position: 'sitting', // 体位
        armUsed: 'left', // 手臂
        cuffSize: 'adult', // 袖带尺寸
        restTime: 5, // 休息时间(分钟)
        environment: 'quiet' // 环境
      },
      
      // 分析数据
      analysis: {
        category: 'normal', // normal, elevated, stage1, stage2, crisis
        riskLevel: 'low', // 风险等级
        recommendations: []
      },
      
      notes: '',
      abnormal: false,
      createTime: '',
      updateTime: ''
    };
  }
  
  /**
   * 血糖监测数据结构
   */
  getBloodGlucoseMonitoringSchema() {
    return {
      id: '',
      memberId: '',
      measureTime: '',
      measureBy: '',
      
      // 血糖数据
      bloodGlucose: {
        value: 0,
        unit: 'mmol/L',
        testType: 'random' // fasting, random, postprandial, bedtime
      },
      
      // 测量上下文
      measurementContext: {
        mealRelation: 'before', // before, after, fasting
        mealType: '', // breakfast, lunch, dinner
        timeSinceMeal: 0, // 进餐后时间(分钟)
        medicationTaken: false, // 是否已服药
        physicalActivity: 'none' // 运动情况
      },
      
      // 分析数据
      analysis: {
        category: 'normal', // low, normal, prediabetic, diabetic
        riskLevel: 'low',
        recommendations: []
      },
      
      notes: '',
      abnormal: false,
      createTime: '',
      updateTime: ''
    };
  }
  
  /**
   * 运动健康数据结构
   */
  getExerciseRecordSchema() {
    return {
      id: '',
      memberId: '',
      recordTime: '',
      
      // 运动基本信息
      exercise: {
        type: '', // running, walking, cycling, swimming, strength, yoga, etc.
        duration: 0, // 运动时长(分钟)
        intensity: 'moderate', // low, moderate, high, vigorous
        calories: 0, // 消耗卡路里
        distance: 0, // 运动距离(公里)
        steps: 0 // 步数
      },
      
      // 运动环境
      exerciseContext: {
        location: '', // indoor, outdoor, gym, home
        weather: '', // sunny, cloudy, rainy, etc.
        temperature: 0, // 环境温度
        equipment: [], // 使用的器械或设备
        companion: '' // alone, with_trainer, with_friends
      },
      
      // 身体状态
      physicalState: {
        preExerciseHeartRate: 0, // 运动前心率
        postExerciseHeartRate: 0, // 运动后心率
        maxHeartRate: 0, // 最大心率
        avgHeartRate: 0, // 平均心率
        energyLevel: '', // very_low, low, moderate, high, very_high
        fatigue: '', // none, light, moderate, severe
        mood: '' // poor, fair, good, excellent
      },
      
      // 运动表现
      performance: {
        perceived_exertion: 0, // 主观感受强度(1-10)
        completion_rate: 100, // 完成度百分比
        personal_record: false, // 是否个人最佳
        achievement: '', // 成就描述
        difficulty: '' // easy, moderate, challenging, very_hard
      },
      
      // 分析数据
      analysis: {
        category: 'moderate', // light, moderate, vigorous, extreme
        calorie_efficiency: 0, // 卡路里消耗效率
        heart_rate_zone: '', // fat_burn, cardio, peak
        recommendations: [],
        fitness_impact: '' // 对健康的影响评估
      },
      
      notes: '',
      tags: [], // 运动标签
      photos: [], // 运动照片
      route: {}, // GPS路线(如果有)
      createTime: '',
      updateTime: ''
    };
  }
  
  /**
   * 睡眠质量数据结构
   */
  getSleepRecordSchema() {
    return {
      id: '',
      memberId: '',
      recordDate: '', // 睡眠日期
      
      // 睡眠时间
      sleepTime: {
        bedTime: '', // 上床时间
        sleepTime: '', // 入睡时间
        wakeUpTime: '', // 起床时间
        duration: 0, // 总睡眠时长(小时)
        sleepLatency: 0 // 入睡潜伏期(分钟)
      },
      
      // 睡眠质量
      sleepQuality: {
        overall: '', // very_poor, poor, fair, good, excellent
        deepSleep: 0, // 深睡眠时长(小时)
        lightSleep: 0, // 浅睡眠时长(小时)
        remSleep: 0, // REM睡眠时长(小时)
        awakening: 0, // 夜间觉醒次数
        restfulness: '' // 睡眠恢复感: poor, fair, good, excellent
      },
      
      // 睡眠环境
      sleepEnvironment: {
        room_temperature: 0, // 室温
        noise_level: '', // quiet, moderate, noisy
        light_level: '', // dark, dim, bright
        air_quality: '', // poor, fair, good, excellent
        bed_comfort: '', // uncomfortable, fair, comfortable, very_comfortable
        pillow_comfort: '' // uncomfortable, fair, comfortable, very_comfortable
      },
      
      // 睡前状态
      preSleepState: {
        stress_level: '', // low, moderate, high
        caffeine_intake: false, // 是否摄入咖啡因
        alcohol_intake: false, // 是否饮酒
        heavy_meal: false, // 是否进食过多
        exercise_timing: '', // no_exercise, morning, afternoon, evening
        screen_time: 0, // 睡前屏幕时间(分钟)
        mood: '' // anxious, stressed, calm, relaxed, happy
      },
      
      // 醒后状态
      postSleepState: {
        morning_mood: '', // tired, groggy, fair, refreshed, energetic
        energy_level: '', // very_low, low, moderate, high, very_high
        alertness: '', // drowsy, sluggish, alert, sharp
        physical_feeling: '', // sore, stiff, normal, refreshed
        motivation: '' // very_low, low, moderate, high, very_high
      },
      
      // 分析数据
      analysis: {
        quality_score: 0, // 睡眠质量评分(0-100)
        efficiency: 0, // 睡眠效率百分比
        sleep_debt: 0, // 睡眠负债(小时)
        recommendations: [],
        sleep_phase_analysis: {}, // 睡眠阶段分析
        pattern_insights: '' // 睡眠模式洞察
      },
      
      notes: '',
      dream_description: '', // 梦境描述
      sleep_aids: [], // 使用的助眠工具
      disruptions: [], // 睡眠干扰因素
      createTime: '',
      updateTime: ''
    };
  }

  // ==================== 血压血糖监测专门方法 ====================

  /**
   * 添加血压监测记录
   * @param {string} memberId - 成员ID
   * @param {Object} bpData - 血压数据
   * @returns {Promise<Object>} 添加结果
   */
  async addBloodPressureRecord(memberId, bpData) {
    try {
      // 验证数据
      this.validateBloodPressureData(bpData);
      
      // 构建完整数据结构
      const completeData = {
        ...this.getBloodPressureMonitoringSchema(),
        ...bpData,
        memberId,
        id: this.generateId(),
        measureTime: bpData.measureTime || new Date().toISOString(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      // 计算脉压差和平均动脉压
      if (completeData.bloodPressure.systolic > 0 && completeData.bloodPressure.diastolic > 0) {
        completeData.bloodPressure.pulsPressure = completeData.bloodPressure.systolic - completeData.bloodPressure.diastolic;
        completeData.bloodPressure.meanPressure = Math.round((completeData.bloodPressure.systolic + 2 * completeData.bloodPressure.diastolic) / 3);
      }

      // 血压分析
      const analysis = this.analyzeBloodPressure(completeData.bloodPressure.systolic, completeData.bloodPressure.diastolic);
      completeData.analysis = analysis;
      completeData.abnormal = analysis.category !== 'normal';
      
      // 获取健康档案
      const healthData = await this.getHealthArchive(memberId);
      
      // 添加到血压监测记录
      if (!healthData.healthMonitoring.bloodPressureMonitoring) {
        healthData.healthMonitoring.bloodPressureMonitoring = [];
      }
      healthData.healthMonitoring.bloodPressureMonitoring.unshift(completeData);
      
      // 更新最新生命体征
      healthData.vitalSigns.current.bloodPressure = {
        systolic: completeData.bloodPressure.systolic,
        diastolic: completeData.bloodPressure.diastolic,
        measureTime: completeData.measureTime
      };
      
      // 保存到服务器
      await this.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: completeData.id,
        message: '血压监测记录添加成功',
        analysis: completeData.analysis
      };
      
    } catch (error) {
      console.error('添加血压监测记录失败:', error);
      throw new Error(`添加血压监测记录失败: ${error.message}`);
    }
  }

  /**
   * 添加血糖监测记录
   * @param {string} memberId - 成员ID
   * @param {Object} bgData - 血糖数据
   * @returns {Promise<Object>} 添加结果
   */
  async addBloodGlucoseRecord(memberId, bgData) {
    try {
      // 验证数据
      this.validateBloodGlucoseData(bgData);
      
      // 构建完整数据结构
      const completeData = {
        ...this.getBloodGlucoseMonitoringSchema(),
        ...bgData,
        memberId,
        id: this.generateId(),
        measureTime: bgData.measureTime || new Date().toISOString(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      // 血糖分析
      const analysis = this.analyzeBloodGlucose(
        completeData.bloodGlucose.value,
        completeData.bloodGlucose.testType,
        completeData.measurementContext.mealRelation
      );
      completeData.analysis = analysis;
      completeData.abnormal = analysis.category !== 'normal';
      
      // 获取健康档案
      const healthData = await this.getHealthArchive(memberId);
      
      // 添加到血糖监测记录
      if (!healthData.healthMonitoring.bloodGlucose) {
        healthData.healthMonitoring.bloodGlucose = [];
      }
      healthData.healthMonitoring.bloodGlucose.unshift(completeData);
      
      // 保存到服务器
      await this.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: completeData.id,
        message: '血糖监测记录添加成功',
        analysis: completeData.analysis
      };
      
    } catch (error) {
      console.error('添加血糖监测记录失败:', error);
      throw new Error(`添加血糖监测记录失败: ${error.message}`);
    }
  }

  /**
   * 获取血压监测记录
   * @param {string} memberId - 成员ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 血压记录
   */
  async getBloodPressureRecords(memberId, options = {}) {
    try {
      const healthData = await this.getHealthArchive(memberId);
      let records = healthData.healthMonitoring.bloodPressureMonitoring || [];
      
      // 时间范围过滤
      if (options.dateRange) {
        records = this.filterByTimeRange(records, options.dateRange);
      }
      
      // 限制数量
      if (options.limit) {
        records = records.slice(0, options.limit);
      }
      
      return {
        success: true,
        records,
        total: records.length
      };
      
    } catch (error) {
      console.error('获取血压监测记录失败:', error);
      throw new Error(`获取血压监测记录失败: ${error.message}`);
    }
  }

  /**
   * 获取血糖监测记录
   * @param {string} memberId - 成员ID
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 血糖记录
   */
  async getBloodGlucoseRecords(memberId, options = {}) {
    try {
      const healthData = await this.getHealthArchive(memberId);
      let records = healthData.healthMonitoring.bloodGlucose || [];
      
      // 时间范围过滤
      if (options.dateRange) {
        records = this.filterByTimeRange(records, options.dateRange);
      }
      
      // 限制数量
      if (options.limit) {
        records = records.slice(0, options.limit);
      }
      
      return {
        success: true,
        records,
        total: records.length
      };
      
    } catch (error) {
      console.error('获取血糖监测记录失败:', error);
      throw new Error(`获取血糖监测记录失败: ${error.message}`);
    }
  }

  /**
   * 添加血糖监测记录
   * @param {string} memberId - 成员ID
   * @param {Object} bgData - 血糖数据
   * @returns {Promise<Object>} 添加结果
   */
  async addBloodGlucoseRecord(memberId, bgData) {
    try {
      // 构建完整数据结构
      const completeData = {
        ...this.getBloodGlucoseMonitoringSchema(),
        ...bgData,
        memberId,
        id: this.generateId(),
        measureTime: bgData.measureTime || new Date().toISOString()
      };

      // 血糖分析
      const analysis = this.analyzeBloodGlucose(
        completeData.bloodGlucose.value,
        completeData.bloodGlucose.testType,
        completeData.measurementContext.mealRelation
      );
      completeData.analysis = analysis;
      completeData.abnormal = analysis.category !== 'normal';

      // 数据验证
      this.validateBloodGlucoseData(completeData);

      // 调用API添加
      const result = await PatientAPI.addBloodGlucoseRecord(memberId, completeData);
      
      // 更新本地缓存
      this.addHealthMonitoringToCache(memberId, { 
        ...result.data, 
        monitorType: 'bloodGlucose',
        value: completeData.bloodGlucose.value
      });
      
      // 检查是否需要触发警报
      if (completeData.abnormal) {
        await this.triggerBloodGlucoseAlert(memberId, result.data);
      }
      
      return result;

    } catch (error) {
      console.error('添加血糖记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取血压监测记录列表
   * @param {string} memberId - 成员ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 血压记录列表
   */
  async getBloodPressureRecords(memberId, options = {}) {
    try {
      const {
        dateRange = '1m',
        limit = 50,
        offset = 0,
        sortBy = 'measureTime',
        sortOrder = 'desc',
        includeAnalysis = true
      } = options;

      // 从缓存获取数据
      const cachedData = this.getHealthCache(memberId);
      let records = [];
      
      if (cachedData && cachedData.healthMonitoring && cachedData.healthMonitoring.bloodPressureMonitoring) {
        records = cachedData.healthMonitoring.bloodPressureMonitoring;
      } else {
        // 从服务器获取
        const response = await PatientAPI.getBloodPressureRecords(memberId, options);
        records = response.data || [];
        
        // 更新缓存
        this.updateHealthCacheField(memberId, 'healthMonitoring.bloodPressureMonitoring', records);
      }
      
      // 日期范围筛选
      const filteredRecords = this.filterRecordsByDateRange(records, dateRange, 'measureTime');
      
      // 排序
      const sortedRecords = this.sortRecords(filteredRecords, sortBy, sortOrder);
      
      // 分页
      const paginatedRecords = sortedRecords.slice(offset, offset + limit);
      
      // 添加分析数据
      let analysisData = {};
      if (includeAnalysis) {
        analysisData = await this.analyzeBloodPressureTrends(memberId, filteredRecords);
      }
      
      return {
        records: paginatedRecords,
        total: filteredRecords.length,
        analysis: analysisData,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < filteredRecords.length
        }
      };
      
    } catch (error) {
      console.error('获取血压记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取血糖监测记录列表
   * @param {string} memberId - 成员ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 血糖记录列表
   */
  async getBloodGlucoseRecords(memberId, options = {}) {
    try {
      const {
        dateRange = '1m',
        limit = 50,
        offset = 0,
        sortBy = 'measureTime',
        sortOrder = 'desc',
        includeAnalysis = true
      } = options;

      // 从缓存获取数据
      const cachedData = this.getHealthCache(memberId);
      let records = [];
      
      if (cachedData && cachedData.healthMonitoring && cachedData.healthMonitoring.bloodGlucose) {
        records = cachedData.healthMonitoring.bloodGlucose;
      } else {
        // 从服务器获取
        const response = await PatientAPI.getBloodGlucoseRecords(memberId, options);
        records = response.data || [];
        
        // 更新缓存
        this.updateHealthCacheField(memberId, 'healthMonitoring.bloodGlucose', records);
      }
      
      // 日期范围筛选
      const filteredRecords = this.filterRecordsByDateRange(records, dateRange, 'measureTime');
      
      // 排序
      const sortedRecords = this.sortRecords(filteredRecords, sortBy, sortOrder);
      
      // 分页
      const paginatedRecords = sortedRecords.slice(offset, offset + limit);
      
      // 添加分析数据
      let analysisData = {};
      if (includeAnalysis) {
        analysisData = await this.analyzeBloodGlucoseTrends(memberId, filteredRecords);
      }
      
      return {
        records: paginatedRecords,
        total: filteredRecords.length,
        analysis: analysisData,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < filteredRecords.length
        }
      };
      
    } catch (error) {
      console.error('获取血糖记录失败:', error);
      throw error;
    }
  }

  /**
   * 血压分析算法
   * @param {number} systolic - 收缩压
   * @param {number} diastolic - 舒张压
   * @returns {Object} 分析结果
   */
  analyzeBloodPressure(systolic, diastolic) {
    let category = 'normal';
    let riskLevel = 'low';
    const recommendations = [];

    // 血压分类（参考AHA/ACC指南）
    if (systolic >= 180 || diastolic >= 120) {
      category = 'crisis';
      riskLevel = 'critical';
      recommendations.push('立即就医，可能是高血压危象');
      recommendations.push('避免剧烈运动，保持安静');
    } else if (systolic >= 140 || diastolic >= 90) {
      category = 'stage2';
      riskLevel = 'high';
      recommendations.push('需要药物治疗，请咨询医生');
      recommendations.push('改善生活方式：低盐饮食、规律运动');
    } else if (systolic >= 130 || diastolic >= 80) {
      category = 'stage1';
      riskLevel = 'medium';
      recommendations.push('考虑生活方式干预或药物治疗');
      recommendations.push('定期监测血压变化');
    } else if (systolic >= 120 && systolic < 130 && diastolic < 80) {
      category = 'elevated';
      riskLevel = 'low';
      recommendations.push('改善生活方式，定期监测');
      recommendations.push('控制体重，减少钠盐摄入');
    } else {
      category = 'normal';
      riskLevel = 'low';
      recommendations.push('保持健康的生活方式');
      recommendations.push('继续定期监测血压');
    }

    return {
      category,
      riskLevel,
      recommendations,
      systolicCategory: this.getSystolicCategory(systolic),
      diastolicCategory: this.getDiastolicCategory(diastolic)
    };
  }

  /**
   * 血糖分析算法
   * @param {number} value - 血糖值
   * @param {string} testType - 测试类型
   * @param {string} mealRelation - 进餐关系
   * @returns {Object} 分析结果
   */
  analyzeBloodGlucose(value, testType, mealRelation) {
    let category = 'normal';
    let riskLevel = 'low';
    const recommendations = [];

    // 根据测试类型和进餐关系分析
    if (testType === 'fasting' || mealRelation === 'fasting') {
      // 空腹血糖分析
      if (value >= 7.0) {
        category = 'diabetic';
        riskLevel = 'high';
        recommendations.push('血糖水平提示可能患有糖尿病，建议就医确诊');
        recommendations.push('需要进行进一步的糖尿病检查');
      } else if (value >= 6.1) {
        category = 'prediabetic';
        riskLevel = 'medium';
        recommendations.push('空腹血糖受损，有患糖尿病风险');
        recommendations.push('建议改善饮食习惯，增加运动');
      } else if (value >= 3.9) {
        category = 'normal';
        riskLevel = 'low';
        recommendations.push('空腹血糖正常，保持健康生活方式');
      } else {
        category = 'low';
        riskLevel = 'medium';
        recommendations.push('血糖偏低，注意饮食规律');
        recommendations.push('如有低血糖症状，及时补充糖分');
      }
    } else if (mealRelation === 'after' || testType === 'postprandial') {
      // 餐后血糖分析
      if (value >= 11.1) {
        category = 'diabetic';
        riskLevel = 'high';
        recommendations.push('餐后血糖过高，建议就医诊断');
        recommendations.push('注意控制碳水化合物摄入');
      } else if (value >= 7.8) {
        category = 'prediabetic';
        riskLevel = 'medium';
        recommendations.push('餐后血糖受损，注意饮食控制');
        recommendations.push('建议定期监测血糖变化');
      } else if (value >= 3.9) {
        category = 'normal';
        riskLevel = 'low';
        recommendations.push('餐后血糖正常');
      } else {
        category = 'low';
        riskLevel = 'medium';
        recommendations.push('血糖偏低，注意餐后血糖管理');
      }
    } else {
      // 随机血糖分析
      if (value >= 11.1) {
        category = 'diabetic';
        riskLevel = 'high';
        recommendations.push('随机血糖过高，建议就医检查');
      } else if (value >= 7.8) {
        category = 'prediabetic';
        riskLevel = 'medium';
        recommendations.push('血糖偏高，建议进一步检查');
      } else if (value >= 3.9) {
        category = 'normal';
        riskLevel = 'low';
        recommendations.push('血糖水平正常');
      } else {
        category = 'low';
        riskLevel = 'medium';
        recommendations.push('血糖偏低，注意补充能量');
      }
    }

    return {
      category,
      riskLevel,
      recommendations,
      targetRange: this.getBloodGlucoseTargetRange(testType, mealRelation)
    };
  }

  /**
   * 分析血压趋势
   * @param {string} memberId - 成员ID
   * @param {Array} records - 血压记录
   * @returns {Object} 趋势分析结果
   */
  async analyzeBloodPressureTrends(memberId, records) {
    try {
      if (!records || records.length === 0) {
        return { trends: {}, statistics: {}, alerts: [] };
      }

      // 按时间排序
      const sortedRecords = records.sort((a, b) => new Date(a.measureTime) - new Date(b.measureTime));
      
      // 提取血压数据
      const systolicValues = [];
      const diastolicValues = [];
      const timestamps = [];
      
      sortedRecords.forEach(record => {
        if (record.bloodPressure) {
          systolicValues.push(record.bloodPressure.systolic);
          diastolicValues.push(record.bloodPressure.diastolic);
          timestamps.push(new Date(record.measureTime));
        }
      });

      // 计算趋势
      const systolicTrend = this.calculateTrendDirection(systolicValues);
      const diastolicTrend = this.calculateTrendDirection(diastolicValues);
      
      // 计算统计数据
      const statistics = {
        totalRecords: records.length,
        averageSystolic: Math.round(systolicValues.reduce((sum, v) => sum + v, 0) / systolicValues.length),
        averageDiastolic: Math.round(diastolicValues.reduce((sum, v) => sum + v, 0) / diastolicValues.length),
        maxSystolic: Math.max(...systolicValues),
        minSystolic: Math.min(...systolicValues),
        maxDiastolic: Math.max(...diastolicValues),
        minDiastolic: Math.min(...diastolicValues),
        abnormalCount: records.filter(r => r.abnormal).length
      };
      
      // 检测警报
      const alerts = this.detectBloodPressureAlerts(records);
      
      return {
        trends: {
          systolic: systolicTrend,
          diastolic: diastolicTrend
        },
        statistics,
        alerts,
        lastUpdate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('分析血压趋势失败:', error);
      return { trends: {}, statistics: {}, alerts: [] };
    }
  }

  /**
   * 分析血糖趋势
   * @param {string} memberId - 成员ID
   * @param {Array} records - 血糖记录
   * @returns {Object} 趋势分析结果
   */
  async analyzeBloodGlucoseTrends(memberId, records) {
    try {
      if (!records || records.length === 0) {
        return { trends: {}, statistics: {}, alerts: [] };
      }

      // 按时间排序
      const sortedRecords = records.sort((a, b) => new Date(a.measureTime) - new Date(b.measureTime));
      
      // 按测试类型分组
      const groupedByType = {
        fasting: [],
        postprandial: [],
        random: [],
        bedtime: []
      };
      
      sortedRecords.forEach(record => {
        if (record.bloodGlucose) {
          const testType = record.bloodGlucose.testType || 'random';
          if (groupedByType[testType]) {
            groupedByType[testType].push(record.bloodGlucose.value);
          }
        }
      });

      // 计算各类型趋势
      const trends = {};
      Object.keys(groupedByType).forEach(type => {
        if (groupedByType[type].length > 0) {
          trends[type] = this.calculateTrendDirection(groupedByType[type]);
        }
      });
      
      // 计算统计数据
      const allValues = sortedRecords.map(r => r.bloodGlucose ? r.bloodGlucose.value : 0).filter(v => v > 0);
      const statistics = {
        totalRecords: records.length,
        averageValue: allValues.length > 0 ? Math.round(allValues.reduce((sum, v) => sum + v, 0) / allValues.length * 10) / 10 : 0,
        maxValue: allValues.length > 0 ? Math.max(...allValues) : 0,
        minValue: allValues.length > 0 ? Math.min(...allValues) : 0,
        abnormalCount: records.filter(r => r.abnormal).length,
        byType: {}
      };
      
      // 按类型统计
      Object.keys(groupedByType).forEach(type => {
        const values = groupedByType[type];
        if (values.length > 0) {
          statistics.byType[type] = {
            count: values.length,
            average: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10,
            max: Math.max(...values),
            min: Math.min(...values)
          };
        }
      });
      
      // 检测警报
      const alerts = this.detectBloodGlucoseAlerts(records);
      
      return {
        trends,
        statistics,
        alerts,
        lastUpdate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('分析血糖趋势失败:', error);
      return { trends: {}, statistics: {}, alerts: [] };
    }
  }

  // ==================== 健康档案管理方法 ====================

  /**
   * 获取成员健康档案
   * @param {string} memberId - 成员ID
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 健康档案数据
   */
  async getHealthArchive(memberId, forceRefresh = false) {
    try {
      // 检查缓存
      if (!forceRefresh) {
        const cached = this.getHealthCache(memberId);
        if (cached) {
          return cached;
        }
      }

      // 从服务器获取
      const response = await PatientAPI.getHealthArchive(memberId);
      const healthData = {
        ...this.getHealthArchiveSchema(),
        ...response.data,
        memberId,
        lastUpdateTime: new Date().toISOString()
      };

      // 更新缓存
      this.updateHealthCache(memberId, healthData);
      
      return healthData;

    } catch (error) {
      console.error('获取健康档案失败:', error);
      
      // 返回缓存数据或默认结构
      const cached = this.getHealthCache(memberId);
      return cached || { ...this.getHealthArchiveSchema(), memberId };
    }
  }

  /**
   * 更新健康档案基础信息
   * @param {string} memberId - 成员ID
   * @param {Object} basicInfo - 基础健康信息
   * @returns {Promise<Object>} 更新结果
   */
  async updateBasicHealthInfo(memberId, basicInfo) {
    try {
      // 数据验证
      this.validateBasicHealthInfo(basicInfo);

      // 调用API更新
      const result = await PatientAPI.updateBasicHealthInfo(memberId, basicInfo);
      
      // 更新本地缓存
      this.updateHealthCacheField(memberId, 'basicHealthInfo', result.data);
      
      return result;

    } catch (error) {
      console.error('更新基础健康信息失败:', error);
      throw error;
    }
  }

  /**
   * 添加生命体征记录（增强版）
   * @param {string} memberId - 成员ID
   * @param {Object} vitalSign - 生命体征数据
   * @returns {Promise<Object>} 添加结果
   */
  async addVitalSign(memberId, vitalSign) {
    try {
      // 数据预处理和智能补全
      const processedData = await this.preprocessVitalSignData(vitalSign);
      
      // 构建完整数据结构
      const completeData = {
        ...this.getVitalSignSchema(),
        ...processedData,
        memberId,
        id: this.generateId(),
        measureTime: vitalSign.measureTime || new Date().toISOString()
      };

      // 自动计算BMI
      if (completeData.weight.value > 0 && completeData.height.value > 0) {
        completeData.bmi = this.calculateBMI(completeData.weight.value, completeData.height.value);
      }
      
      // 异常检测和警报评估
      const analysis = await this.analyzeVitalSigns(completeData);
      completeData.abnormal = analysis.hasAbnormalities;
      completeData.alertLevel = analysis.alertLevel;
      completeData.alertReasons = analysis.alertReasons;
      
      // 数据验证
      this.validateVitalSign(completeData);

      // 调用API添加
      const result = await PatientAPI.addVitalSign(memberId, completeData);
      
      // 更新本地缓存
      this.addVitalSignToCache(memberId, result.data);
      
      // 触发异常警报
      if (analysis.hasAbnormalities) {
        await this.triggerVitalSignAlert(memberId, result.data);
      }
      
      return result;

    } catch (error) {
      console.error('添加生命体征记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 预处理生命体征数据
   */
  async preprocessVitalSignData(vitalSign) {
    const processed = { ...vitalSign };
    
    // 单位转换和标准化
    if (processed.bodyTemperature && typeof processed.bodyTemperature === 'number') {
      processed.bodyTemperature = {
        value: processed.bodyTemperature,
        unit: 'celsius',
        measureSite: 'oral'
      };
    }
    
    if (processed.heartRate && typeof processed.heartRate === 'number') {
      processed.heartRate = {
        value: processed.heartRate,
        unit: 'bpm',
        rhythm: 'regular'
      };
    }
    
    return processed;
  }
  
  /**
   * 计算BMI
   */
  calculateBMI(weight, height) {
    const heightInM = height / 100;
    const bmi = weight / (heightInM * heightInM);
    
    let category;
    if (bmi < 18.5) category = 'underweight';
    else if (bmi < 24) category = 'normal';
    else if (bmi < 28) category = 'overweight';
    else category = 'obese';
    
    return {
      value: Math.round(bmi * 10) / 10,
      category
    };
  }
  
  /**
   * 分析生命体征数据
   */
  async analyzeVitalSigns(vitalSign) {
    const analysis = {
      hasAbnormalities: false,
      alertLevel: 'normal',
      alertReasons: []
    };
    
    // 血压分析
    if (vitalSign.bloodPressure && vitalSign.bloodPressure.systolic > 0) {
      const bp = vitalSign.bloodPressure;
      if (bp.systolic >= 180 || bp.diastolic >= 110) {
        analysis.hasAbnormalities = true;
        analysis.alertLevel = 'critical';
        analysis.alertReasons.push('高血压危象');
      } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
        analysis.hasAbnormalities = true;
        analysis.alertLevel = 'warning';
        analysis.alertReasons.push('血压偏高');
      }
    }
    
    // 心率分析
    if (vitalSign.heartRate && vitalSign.heartRate.value > 0) {
      const hr = vitalSign.heartRate.value;
      if (hr > 100 || hr < 60) {
        analysis.hasAbnormalities = true;
        analysis.alertLevel = analysis.alertLevel === 'normal' ? 'caution' : analysis.alertLevel;
        analysis.alertReasons.push(hr > 100 ? '心率过快' : '心率过缓');
      }
    }
    
    // 体温分析
    if (vitalSign.bodyTemperature && vitalSign.bodyTemperature.value > 0) {
      const temp = vitalSign.bodyTemperature.value;
      if (temp >= 37.3) {
        analysis.hasAbnormalities = true;
        analysis.alertLevel = temp >= 39 ? 'warning' : 'caution';
        analysis.alertReasons.push('发热');
      }
    }
    
    return analysis;
  }
  
  /**
   * 触发生命体征异常警报
   */
  async triggerVitalSignAlert(memberId, vitalSign) {
    try {
      console.log('生命体征异常警报:', {
        memberId,
        alertLevel: vitalSign.alertLevel,
        reasons: vitalSign.alertReasons
      });
    } catch (error) {
      console.error('触发警报失败:', error);
    }
  }

  /**
   * 获取生命体征记录列表
   * @param {string} memberId - 成员ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 生命体征记录列表
   */
  async getVitalSignRecords(memberId, options = {}) {
    try {
      const {
        dateRange = '1m',
        limit = 50,
        offset = 0,
        sortBy = 'measureTime',
        sortOrder = 'desc',
        includeAnalysis = true
      } = options;

      // 从缓存获取数据
      const cachedData = this.getHealthCache(memberId);
      let records = [];
      
      if (cachedData && cachedData.vitalSigns) {
        records = cachedData.vitalSigns;
      } else {
        // 从服务器获取
        const response = await PatientAPI.getVitalSignRecords(memberId, options);
        records = response.data || [];
        
        // 更新缓存
        this.updateHealthCacheField(memberId, 'vitalSigns', records);
      }
      
      // 日期范围筛选
      const filteredRecords = this.filterRecordsByDateRange(records, dateRange, 'measureTime');
      
      // 排序
      const sortedRecords = this.sortRecords(filteredRecords, sortBy, sortOrder);
      
      // 分页
      const paginatedRecords = sortedRecords.slice(offset, offset + limit);
      
      // 添加分析数据
      let analysisData = {};
      if (includeAnalysis) {
        analysisData = await this.analyzeVitalSignTrends(memberId, filteredRecords);
      }
      
      return {
        records: paginatedRecords,
        total: filteredRecords.length,
        analysis: analysisData,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < filteredRecords.length
        }
      };
      
    } catch (error) {
      console.error('获取生命体征记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 分析生命体征趋势
   * @param {string} memberId - 成员ID
   * @param {Array} records - 记录列表
   * @returns {Promise<Object>} 趋势分析结果
   */
  async analyzeVitalSignTrends(memberId, records) {
    try {
      if (!records || records.length === 0) {
        return { trends: {}, statistics: {}, alerts: [] };
      }
      
      // 按时间排序
      const sortedRecords = records.sort((a, b) => new Date(a.measureTime) - new Date(b.measureTime));
      
      // 计算趋势
      const trends = {
        bloodPressure: this.calculateTrend(sortedRecords, 'bloodPressure'),
        heartRate: this.calculateTrend(sortedRecords, 'heartRate'),
        bodyTemperature: this.calculateTrend(sortedRecords, 'bodyTemperature'),
        weight: this.calculateTrend(sortedRecords, 'weight')
      };
      
      // 计算统计数据
      const statistics = {
        totalRecords: records.length,
        abnormalRecords: records.filter(r => r.abnormal).length,
        alertCounts: this.countAlertLevels(records),
        averageValues: this.calculateAverageValues(records),
        ranges: this.calculateRanges(records)
      };
      
      // 检测警报
      const alerts = this.detectVitalSignAlerts(records);
      
      return {
        trends,
        statistics,
        alerts,
        lastUpdate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('分析生命体征趋势失败:', error);
      return { trends: {}, statistics: {}, alerts: [] };
    }
  }
  
  /**
   * 计算趋势方向
   * @param {Array} values - 数值数组
   * @returns {Object} 趋势信息
   */
  calculateTrendDirection(values) {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, values: [] };
    }
    
    const recent = values.slice(-5); // 最近5次测量
    const avg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = ((last - first) / first * 100).toFixed(1);
    
    let direction = 'stable';
    if (Math.abs(change) > 10) {
      direction = change > 0 ? 'increasing' : 'decreasing';
    } else if (Math.abs(change) > 5) {
      direction = change > 0 ? 'slightly_increasing' : 'slightly_decreasing';
    }
    
    return {
      direction,
      change: parseFloat(change),
      average: Math.round(avg * 10) / 10,
      values: recent
    };
  }

  /**
   * 获取收缩压分类
   */
  getSystolicCategory(systolic) {
    if (systolic >= 180) return 'crisis';
    if (systolic >= 140) return 'stage2';
    if (systolic >= 130) return 'stage1';
    if (systolic >= 120) return 'elevated';
    return 'normal';
  }

  /**
   * 获取舒张压分类
   */
  getDiastolicCategory(diastolic) {
    if (diastolic >= 120) return 'crisis';
    if (diastolic >= 90) return 'stage2';
    if (diastolic >= 80) return 'stage1';
    return 'normal';
  }

  /**
   * 获取血糖目标范围
   */
  getBloodGlucoseTargetRange(testType, mealRelation) {
    if (testType === 'fasting' || mealRelation === 'fasting') {
      return { min: 3.9, max: 6.1, unit: 'mmol/L', description: '空腹血糖正常范围' };
    } else if (mealRelation === 'after' || testType === 'postprandial') {
      return { min: 3.9, max: 7.8, unit: 'mmol/L', description: '餐后2小时血糖正常范围' };
    } else {
      return { min: 3.9, max: 7.8, unit: 'mmol/L', description: '随机血糖正常范围' };
    }
  }

  /**
   * 检测血压警报
   */
  detectBloodPressureAlerts(records) {
    const alerts = [];
    const recentRecords = records.slice(-3); // 最近3次记录
    
    // 检测持续异常
    const persistentHigh = recentRecords.every(r => 
      r.bloodPressure && (r.bloodPressure.systolic >= 140 || r.bloodPressure.diastolic >= 90)
    );
    
    if (persistentHigh && recentRecords.length >= 3) {
      alerts.push({
        type: 'persistent_high_bp',
        level: 'warning',
        message: '连续3次血压过高',
        recommendations: ['建议就医咨询', '注意休息和饮食控制']
      });
    }
    
    // 检测急剧变化
    if (records.length >= 2) {
      const latest = records[records.length - 1];
      const previous = records[records.length - 2];
      
      if (latest.bloodPressure && previous.bloodPressure) {
        const systolicChange = Math.abs(latest.bloodPressure.systolic - previous.bloodPressure.systolic);
        const diastolicChange = Math.abs(latest.bloodPressure.diastolic - previous.bloodPressure.diastolic);
        
        if (systolicChange > 30 || diastolicChange > 20) {
          alerts.push({
            type: 'rapid_bp_change',
            level: 'caution',
            message: '血压变化较大',
            recommendations: ['密切监测血压变化', '注意休息和情绪管理']
          });
        }
      }
    }
    
    return alerts;
  }

  /**
   * 检测血糖警报
   */
  detectBloodGlucoseAlerts(records) {
    const alerts = [];
    const recentRecords = records.slice(-3); // 最近3次记录
    
    // 检测持续高血糖
    const persistentHigh = recentRecords.every(r => 
      r.bloodGlucose && r.analysis && (r.analysis.category === 'diabetic' || r.analysis.category === 'prediabetic')
    );
    
    if (persistentHigh && recentRecords.length >= 3) {
      alerts.push({
        type: 'persistent_high_glucose',
        level: 'warning',
        message: '连续3次血糖异常',
        recommendations: ['建议就医进行糖尿病筛查', '控制饮食和运动']
      });
    }
    
    // 检测低血糖
    const recentLow = recentRecords.filter(r => 
      r.bloodGlucose && r.analysis && r.analysis.category === 'low'
    );
    
    if (recentLow.length >= 2) {
      alerts.push({
        type: 'frequent_low_glucose',
        level: 'caution',
        message: '频繁出现低血糖',
        recommendations: ['注意餐时规律性', '如有糖尿病，调整药物剂量']
      });
    }
    
    return alerts;
  }

  /**
   * 触发血压异常警报
   */
  async triggerBloodPressureAlert(memberId, bpRecord) {
    try {
      console.log('血压异常警报:', {
        memberId,
        systolic: bpRecord.bloodPressure.systolic,
        diastolic: bpRecord.bloodPressure.diastolic,
        category: bpRecord.analysis.category,
        riskLevel: bpRecord.analysis.riskLevel
      });
      
      // 这里可以添加通知逃用逻辑，比如发送微信通知等
      
    } catch (error) {
      console.error('触发血压警报失败:', error);
    }
  }

  /**
   * 触发血糖异常警报
   */
  async triggerBloodGlucoseAlert(memberId, bgRecord) {
    try {
      console.log('血糖异常警报:', {
        memberId,
        value: bgRecord.bloodGlucose.value,
        testType: bgRecord.bloodGlucose.testType,
        category: bgRecord.analysis.category,
        riskLevel: bgRecord.analysis.riskLevel
      });
      
      // 这里可以添加通知逃用逻辑
      
    } catch (error) {
      console.error('触发血糖警报失败:', error);
    }
  }

  /**
   * 验证血压数据
   */
  validateBloodPressureData(bpData) {
    const { bloodPressure } = bpData;
    
    if (!bloodPressure) {
      throw new Error('缺少血压数据');
    }
    
    const { systolic, diastolic } = bloodPressure;
    
    if (!systolic || !diastolic) {
      throw new Error('收缩压和舒张压不能为空');
    }
    
    if (systolic < 60 || systolic > 250) {
      throw new Error('收缩压数值超出正常范围(60-250mmHg)');
    }
    
    if (diastolic < 40 || diastolic > 150) {
      throw new Error('舒张压数值超出正常范围(40-150mmHg)');
    }
    
    if (systolic <= diastolic) {
      throw new Error('收缩压应大于舒张压');
    }
  }

  /**
   * 验证血糖数据
   */
  validateBloodGlucoseData(bgData) {
    const { bloodGlucose } = bgData;
    
    if (!bloodGlucose) {
      throw new Error('缺少血糖数据');
    }
    
    const { value } = bloodGlucose;
    
    if (!value && value !== 0) {
      throw new Error('血糖数值不能为空');
    }
    
    if (value < 1 || value > 30) {
      throw new Error('血糖数值超出正常范围(1-30mmol/L)');
    }
  }

  /**
   * 获取综合健康评估
   * @param {string} memberId - 成员ID
   * @returns {Promise<Object>} 健康评估结果
   */
  async getComprehensiveHealthAssessment(memberId) {
    try {
      // 获取最近的健康数据
      const healthData = await this.getHealthArchive(memberId);
      const bpRecords = await this.getBloodPressureRecords(memberId, { limit: 10 });
      const bgRecords = await this.getBloodGlucoseRecords(memberId, { limit: 10 });
      const vitalRecords = await this.getVitalSignRecords(memberId, { limit: 10 });
      
      const assessment = {
        memberId,
        assessmentDate: new Date().toISOString(),
        overallRisk: 'low',
        riskFactors: [],
        recommendations: [],
        scores: {
          cardiovascular: 0,
          metabolic: 0,
          overall: 0
        },
        trends: {},
        alerts: []
      };
      
      // 心血管风险评估
      if (bpRecords.records && bpRecords.records.length > 0) {
        const cvRisk = this.assessCardiovascularRisk(bpRecords.records, healthData);
        assessment.scores.cardiovascular = cvRisk.score;
        assessment.riskFactors.push(...cvRisk.factors);
        assessment.recommendations.push(...cvRisk.recommendations);
        assessment.trends.bloodPressure = bpRecords.analysis.trends;
      }
      
      // 代谢风险评估
      if (bgRecords.records && bgRecords.records.length > 0) {
        const metRisk = this.assessMetabolicRisk(bgRecords.records, healthData);
        assessment.scores.metabolic = metRisk.score;
        assessment.riskFactors.push(...metRisk.factors);
        assessment.recommendations.push(...metRisk.recommendations);
        assessment.trends.bloodGlucose = bgRecords.analysis.trends;
      }
      
      // 综合评分
      assessment.scores.overall = Math.round((assessment.scores.cardiovascular + assessment.scores.metabolic) / 2);
      
      // 确定总体风险等级
      if (assessment.scores.overall >= 80) {
        assessment.overallRisk = 'critical';
      } else if (assessment.scores.overall >= 60) {
        assessment.overallRisk = 'high';
      } else if (assessment.scores.overall >= 40) {
        assessment.overallRisk = 'medium';
      } else {
        assessment.overallRisk = 'low';
      }
      
      // 收集所有警报
      if (bpRecords.analysis && bpRecords.analysis.alerts) {
        assessment.alerts.push(...bpRecords.analysis.alerts);
      }
      if (bgRecords.analysis && bgRecords.analysis.alerts) {
        assessment.alerts.push(...bgRecords.analysis.alerts);
      }
      
      return assessment;
      
    } catch (error) {
      console.error('获取综合健康评估失败:', error);
      throw error;
    }
  }

  /**
   * 心血管风险评估
   */
  assessCardiovascularRisk(bpRecords, healthData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    
    // 分析最近血压数据
    const recentRecords = bpRecords.slice(-5);
    const avgSystolic = recentRecords.reduce((sum, r) => sum + r.bloodPressure.systolic, 0) / recentRecords.length;
    const avgDiastolic = recentRecords.reduce((sum, r) => sum + r.bloodPressure.diastolic, 0) / recentRecords.length;
    
    // 血压风险分析
    if (avgSystolic >= 140 || avgDiastolic >= 90) {
      score += 30;
      factors.push({ type: 'high_blood_pressure', severity: 'high', description: '高血压' });
      recommendations.push('建议就医进行血压管理');
    } else if (avgSystolic >= 130 || avgDiastolic >= 80) {
      score += 20;
      factors.push({ type: 'elevated_blood_pressure', severity: 'medium', description: '血压偏高' });
      recommendations.push('改善生活方式，定期监测');
    }
    
    // 其他风险因子
    if (healthData.basicHealthInfo) {
      const { age, chronicDiseases, smokingStatus, familyMedicalHistory } = healthData.basicHealthInfo;
      
      if (age && age > 65) {
        score += 10;
        factors.push({ type: 'advanced_age', severity: 'medium', description: '高龄' });
      }
      
      if (smokingStatus === 'current') {
        score += 15;
        factors.push({ type: 'smoking', severity: 'high', description: '吸烟' });
        recommendations.push('强烈建议戒烟');
      }
      
      if (familyMedicalHistory && familyMedicalHistory.some(h => h.includes('心血管'))) {
        score += 10;
        factors.push({ type: 'family_history', severity: 'medium', description: '心血管疾病家族史' });
      }
    }
    
    return { score: Math.min(score, 100), factors, recommendations };
  }

  /**
   * 代谢风险评估
   */
  assessMetabolicRisk(bgRecords, healthData) {
    const factors = [];
    const recommendations = [];
    let score = 0;
    
    // 分析最近血糖数据
    const recentRecords = bgRecords.slice(-5);
    const diabeticCount = recentRecords.filter(r => r.analysis && r.analysis.category === 'diabetic').length;
    const prediabeticCount = recentRecords.filter(r => r.analysis && r.analysis.category === 'prediabetic').length;
    
    // 血糖风险分析
    if (diabeticCount >= 3) {
      score += 40;
      factors.push({ type: 'diabetes', severity: 'critical', description: '糖尿病' });
      recommendations.push('必须就医进行糖尿病管理');
    } else if (prediabeticCount >= 3) {
      score += 25;
      factors.push({ type: 'prediabetes', severity: 'high', description: '糖尿病前期' });
      recommendations.push('改善饮食习惯，增加运动');
    }
    
    // 其他风险因子
    if (healthData.basicHealthInfo) {
      const { weight, height, familyMedicalHistory } = healthData.basicHealthInfo;
      
      if (weight && height) {
        const bmi = this.calculateBMI(weight, height);
        if (bmi.value >= 28) {
          score += 15;
          factors.push({ type: 'obesity', severity: 'high', description: '肥胖' });
          recommendations.push('控制体重，合理饮食');
        } else if (bmi.value >= 24) {
          score += 10;
          factors.push({ type: 'overweight', severity: 'medium', description: '超重' });
        }
      }
      
      if (familyMedicalHistory && familyMedicalHistory.some(h => h.includes('糖尿病'))) {
        score += 10;
        factors.push({ type: 'family_diabetes', severity: 'medium', description: '糖尿病家族史' });
      }
    }
    
    return { score: Math.min(score, 100), factors, recommendations };
  }
  
  /**
   * 统计警报级别
   */
  countAlertLevels(records) {
    const counts = { normal: 0, caution: 0, warning: 0, critical: 0 };
    records.forEach(record => {
      if (counts.hasOwnProperty(record.alertLevel)) {
        counts[record.alertLevel]++;
      }
    });
    return counts;
  }
  
  /**
   * 计算平均值
   */
  calculateAverageValues(records) {
    const totals = { count: 0, systolic: 0, diastolic: 0, heartRate: 0, temperature: 0 };
    
    records.forEach(record => {
      totals.count++;
      if (record.bloodPressure && record.bloodPressure.systolic) {
        totals.systolic += record.bloodPressure.systolic;
        totals.diastolic += record.bloodPressure.diastolic;
      }
      if (record.heartRate && record.heartRate.value) {
        totals.heartRate += record.heartRate.value;
      }
      if (record.bodyTemperature && record.bodyTemperature.value) {
        totals.temperature += record.bodyTemperature.value;
      }
    });
    
    return {
      systolic: Math.round(totals.systolic / totals.count),
      diastolic: Math.round(totals.diastolic / totals.count),
      heartRate: Math.round(totals.heartRate / totals.count),
      temperature: Math.round(totals.temperature / totals.count * 10) / 10
    };
  }
  
  /**
   * 计算数值范围
   */
  calculateRanges(records) {
    const ranges = {
      systolic: { min: Infinity, max: -Infinity },
      diastolic: { min: Infinity, max: -Infinity },
      heartRate: { min: Infinity, max: -Infinity },
      temperature: { min: Infinity, max: -Infinity }
    };
    
    records.forEach(record => {
      if (record.bloodPressure) {
        ranges.systolic.min = Math.min(ranges.systolic.min, record.bloodPressure.systolic || Infinity);
        ranges.systolic.max = Math.max(ranges.systolic.max, record.bloodPressure.systolic || -Infinity);
        ranges.diastolic.min = Math.min(ranges.diastolic.min, record.bloodPressure.diastolic || Infinity);
        ranges.diastolic.max = Math.max(ranges.diastolic.max, record.bloodPressure.diastolic || -Infinity);
      }
      if (record.heartRate && record.heartRate.value) {
        ranges.heartRate.min = Math.min(ranges.heartRate.min, record.heartRate.value);
        ranges.heartRate.max = Math.max(ranges.heartRate.max, record.heartRate.value);
      }
      if (record.bodyTemperature && record.bodyTemperature.value) {
        ranges.temperature.min = Math.min(ranges.temperature.min, record.bodyTemperature.value);
        ranges.temperature.max = Math.max(ranges.temperature.max, record.bodyTemperature.value);
      }
    });
    
    return ranges;
  }
  
  /**
   * 检测警报
   */
  detectVitalSignAlerts(records) {
    const alerts = [];
    const recentRecords = records.slice(-3); // 最近3次记录
    
    // 检测持续异常
    const persistentAbnormal = recentRecords.every(r => r.abnormal);
    if (persistentAbnormal && recentRecords.length >= 3) {
      alerts.push({
        type: 'persistent_abnormal',
        level: 'warning',
        message: '连续3次测量结果异常',
        recommendations: ['建议咨询医生']
      });
    }
    
    // 检测急剧变化
    if (records.length >= 2) {
      const latest = records[records.length - 1];
      const previous = records[records.length - 2];
      
      // 血压变化
      if (latest.bloodPressure && previous.bloodPressure) {
        const systolicChange = Math.abs(latest.bloodPressure.systolic - previous.bloodPressure.systolic);
        if (systolicChange > 30) {
          alerts.push({
            type: 'rapid_bp_change',
            level: 'caution',
            message: '血压变化较大',
            recommendations: ['密切监测血压变化']
          });
        }
      }
    }
    
    return alerts;
  }

  /**
   * 添加用药记录
   * @param {string} memberId - 成员ID
   * @param {Object} medication - 用药数据
   * @returns {Promise<Object>} 添加结果
   */
  async addMedication(memberId, medication) {
    try {
      // 数据验证和补全
      const completeData = {
        ...this.getMedicationSchema(),
        ...medication,
        memberId,
        id: this.generateId(),
        startDate: medication.startDate || new Date().toISOString()
      };

      this.validateMedication(completeData);

      // 调用API添加
      const result = await PatientAPI.addMedication(memberId, completeData);
      
      // 更新本地缓存
      this.addMedicationToCache(memberId, result.data);
      
      return result;

    } catch (error) {
      console.error('添加用药记录失败:', error);
      throw error;
    }
  }

  /**
   * 添加健康监测数据
   * @param {string} memberId - 成员ID
   * @param {Object} monitoring - 监测数据
   * @returns {Promise<Object>} 添加结果
   */
  async addHealthMonitoring(memberId, monitoring) {
    try {
      // 数据验证和补全
      const completeData = {
        ...this.getHealthMonitoringSchema(),
        ...monitoring,
        memberId,
        id: this.generateId(),
        recordTime: monitoring.recordTime || new Date().toISOString()
      };

      this.validateHealthMonitoring(completeData);

      // 调用API添加
      const result = await PatientAPI.addHealthMonitoring(memberId, completeData);
      
      // 更新本地缓存
      this.addHealthMonitoringToCache(memberId, result.data);
      
      return result;

    } catch (error) {
      console.error('添加健康监测数据失败:', error);
      throw error;
    }
  }

  // ==================== 数据查询和分析方法 ====================

  /**
   * 获取健康数据趋势分析
   * @param {string} memberId - 成员ID
   * @param {string} dataType - 数据类型
   * @param {string} timeRange - 时间范围
   * @returns {Promise<Object>} 趋势分析结果
   */
  async getHealthTrends(memberId, dataType, timeRange = '30d') {
    try {
      const healthData = await this.getHealthArchive(memberId);
      
      let data = [];
      switch (dataType) {
        case 'bloodPressure':
          data = healthData.vitalSigns.history.filter(v => v.bloodPressure);
          break;
        case 'bloodGlucose':
          data = healthData.healthMonitoring.bloodGlucose;
          break;
        case 'weight':
          data = healthData.healthMonitoring.weightTracking;
          break;
        // 添加更多数据类型
      }

      // 过滤时间范围
      const filteredData = this.filterByTimeRange(data, timeRange);
      
      // 计算趋势
      const trends = this.calculateTrends(filteredData, dataType);
      
      return {
        dataType,
        timeRange,
        dataPoints: filteredData.length,
        trends,
        analysis: this.generateTrendAnalysis(trends)
      };

    } catch (error) {
      console.error('获取健康趋势失败:', error);
      throw error;
    }
  }

  /**
   * 健康风险评估
   * @param {string} memberId - 成员ID
   * @returns {Promise<Object>} 风险评估结果
   */
  async assessHealthRisks(memberId) {
    try {
      const healthData = await this.getHealthArchive(memberId);
      
      const riskFactors = [];
      const recommendations = [];

      // 分析各种风险因子
      this.analyzeVitalSignsRisk(healthData, riskFactors, recommendations);
      this.analyzeLifestyleRisk(healthData, riskFactors, recommendations);
      this.analyzeMedicalHistoryRisk(healthData, riskFactors, recommendations);
      
      // 计算综合风险评分
      const overallRisk = this.calculateOverallRisk(riskFactors);
      
      return {
        memberId,
        assessmentDate: new Date().toISOString(),
        overallRisk,
        riskFactors,
        recommendations,
        nextAssessmentDue: this.calculateNextAssessmentDate(overallRisk)
      };

    } catch (error) {
      console.error('健康风险评估失败:', error);
      throw error;
    }
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 获取健康档案缓存
   * @private
   */
  getHealthCache(memberId) {
    try {
      const cacheKey = `health_archive_${memberId}`;
      const cached = storage.get(cacheKey);
      
      if (cached && cached.timestamp) {
        const now = Date.now();
        if (now - cached.timestamp < this.cacheExpire) {
          return cached.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取健康档案缓存失败:', error);
      return null;
    }
  }

  /**
   * 更新健康档案缓存
   * @private
   */
  updateHealthCache(memberId, data) {
    try {
      const cacheKey = `health_archive_${memberId}`;
      storage.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('更新健康档案缓存失败:', error);
    }
  }

  /**
   * 更新健康档案特定字段缓存
   * @private
   */
  updateHealthCacheField(memberId, field, value) {
    try {
      const cached = this.getHealthCache(memberId);
      if (cached) {
        cached[field] = value;
        cached.updateTime = new Date().toISOString();
        this.updateHealthCache(memberId, cached);
      }
    } catch (error) {
      console.error('更新健康档案字段缓存失败:', error);
    }
  }

  /**
   * 添加生命体征到缓存
   * @private
   */
  addVitalSignToCache(memberId, vitalSign) {
    try {
      const cached = this.getHealthCache(memberId);
      if (cached) {
        // 更新当前生命体征
        cached.vitalSigns.current = {
          bloodPressure: vitalSign.bloodPressure ? {
            systolic: vitalSign.bloodPressure.systolic,
            diastolic: vitalSign.bloodPressure.diastolic,
            measureTime: vitalSign.measureTime
          } : cached.vitalSigns.current.bloodPressure,
          heartRate: vitalSign.heartRate ? {
            value: vitalSign.heartRate,
            measureTime: vitalSign.measureTime
          } : cached.vitalSigns.current.heartRate,
          bodyTemperature: vitalSign.bodyTemperature ? {
            value: vitalSign.bodyTemperature,
            measureTime: vitalSign.measureTime
          } : cached.vitalSigns.current.bodyTemperature,
          respiratoryRate: vitalSign.respiratoryRate ? {
            value: vitalSign.respiratoryRate,
            measureTime: vitalSign.measureTime
          } : cached.vitalSigns.current.respiratoryRate,
          oxygenSaturation: vitalSign.oxygenSaturation ? {
            value: vitalSign.oxygenSaturation,
            measureTime: vitalSign.measureTime
          } : cached.vitalSigns.current.oxygenSaturation
        };
        
        // 添加到历史记录
        cached.vitalSigns.history.unshift(vitalSign);
        
        // 限制历史记录数量（保留最近100条）
        if (cached.vitalSigns.history.length > 100) {
          cached.vitalSigns.history = cached.vitalSigns.history.slice(0, 100);
        }
        
        this.updateHealthCache(memberId, cached);
      }
    } catch (error) {
      console.error('添加生命体征到缓存失败:', error);
    }
  }

  /**
   * 添加医疗报告到缓存
   * @private
   */
  addMedicalReportToCache(memberId, report) {
    try {
      const cached = this.getHealthCache(memberId);
      if (cached) {
        const reportType = report.reportType;
        if (!cached.medicalReports[reportType]) {
          cached.medicalReports[reportType] = [];
        }
        cached.medicalReports[reportType].unshift(report);
        
        // 限制每种类型报告数量（保留最近50条）
        if (cached.medicalReports[reportType].length > 50) {
          cached.medicalReports[reportType] = cached.medicalReports[reportType].slice(0, 50);
        }
        
        this.updateHealthCache(memberId, cached);
      }
    } catch (error) {
      console.error('添加医疗报告到缓存失败:', error);
    }
  }

  /**
   * 添加用药记录到缓存
   * @private
   */
  addMedicationToCache(memberId, medication) {
    try {
      const cached = this.getHealthCache(memberId);
      if (cached) {
        if (medication.status === 'active') {
          cached.medications.current.unshift(medication);
        }
        cached.medications.history.unshift(medication);
        
        // 限制记录数量
        if (cached.medications.history.length > 100) {
          cached.medications.history = cached.medications.history.slice(0, 100);
        }
        
        this.updateHealthCache(memberId, cached);
      }
    } catch (error) {
      console.error('添加用药记录到缓存失败:', error);
    }
  }

  /**
   * 添加健康监测数据到缓存
   * @private
   */
  addHealthMonitoringToCache(memberId, monitoring) {
    try {
      const cached = this.getHealthCache(memberId);
      if (cached) {
        const monitorType = monitoring.monitorType;
        if (!cached.healthMonitoring[monitorType]) {
          cached.healthMonitoring[monitorType] = [];
        }
        cached.healthMonitoring[monitorType].unshift(monitoring);
        
        // 限制每种监测类型数据量（保留最近200条）
        if (cached.healthMonitoring[monitorType].length > 200) {
          cached.healthMonitoring[monitorType] = cached.healthMonitoring[monitorType].slice(0, 200);
        }
        
        this.updateHealthCache(memberId, cached);
      }
    } catch (error) {
      console.error('添加健康监测数据到缓存失败:', error);
    }
  }

  // ==================== 数据验证方法 ====================

  /**
   * 验证基础健康信息
   * @private
   */
  validateBasicHealthInfo(info) {
    // 血型验证
    if (info.bloodType && !['A', 'B', 'AB', 'O'].includes(info.bloodType)) {
      throw new Error('血型格式不正确');
    }
    
    // 身高验证
    if (info.height && (info.height < 50 || info.height > 250)) {
      throw new Error('身高数据不合理');
    }
    
    // 体重验证
    if (info.weight && (info.weight < 10 || info.weight > 300)) {
      throw new Error('体重数据不合理');
    }
    
    // BMI验证
    if (info.bmi && (info.bmi < 10 || info.bmi > 50)) {
      throw new Error('BMI数据不合理');
    }
  }

  /**
   * 验证生命体征数据
   * @private
   */
  validateVitalSign(vitalSign) {
    // 血压验证
    if (vitalSign.bloodPressure) {
      const { systolic, diastolic } = vitalSign.bloodPressure;
      if (systolic < 60 || systolic > 250 || diastolic < 40 || diastolic > 150) {
        throw new Error('血压数据超出正常范围');
      }
      if (systolic <= diastolic) {
        throw new Error('收缩压应大于舒张压');
      }
    }
    
    // 心率验证
    if (vitalSign.heartRate && (vitalSign.heartRate < 30 || vitalSign.heartRate > 200)) {
      throw new Error('心率数据超出正常范围');
    }
    
    // 体温验证
    if (vitalSign.bodyTemperature && (vitalSign.bodyTemperature < 32 || vitalSign.bodyTemperature > 44)) {
      throw new Error('体温数据超出正常范围');
    }
    
    // 呼吸频率验证
    if (vitalSign.respiratoryRate && (vitalSign.respiratoryRate < 5 || vitalSign.respiratoryRate > 60)) {
      throw new Error('呼吸频率数据超出正常范围');
    }
    
    // 血氧饱和度验证
    if (vitalSign.oxygenSaturation && (vitalSign.oxygenSaturation < 50 || vitalSign.oxygenSaturation > 100)) {
      throw new Error('血氧饱和度数据超出正常范围');
    }
  }

  /**
   * 验证医疗报告数据
   * @private
   */
  validateMedicalReport(report) {
    const required = ['reportType', 'reportDate', 'hospital'];
    
    for (const field of required) {
      if (!report[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 报告类型验证
    const validTypes = ['blood', 'urine', 'imaging', 'ecg', 'endoscopy', 'pathology', 'others'];
    if (!validTypes.includes(report.reportType)) {
      throw new Error('报告类型不正确');
    }
    
    // 日期验证
    const reportDate = new Date(report.reportDate);
    const now = new Date();
    if (reportDate > now) {
      throw new Error('报告日期不能为未来时间');
    }
  }

  /**
   * 验证用药记录数据
   * @private
   */
  validateMedication(medication) {
    const required = ['medicationName', 'dosage', 'frequency', 'startDate'];
    
    for (const field of required) {
      if (!medication[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 日期验证
    const startDate = new Date(medication.startDate);
    if (medication.endDate) {
      const endDate = new Date(medication.endDate);
      if (endDate <= startDate) {
        throw new Error('结束日期应晚于开始日期');
      }
    }
    
    // 状态验证
    const validStatuses = ['active', 'completed', 'discontinued'];
    if (!validStatuses.includes(medication.status)) {
      throw new Error('用药状态不正确');
    }
  }

  /**
   * 验证健康监测数据
   * @private
   */
  validateHealthMonitoring(monitoring) {
    const required = ['monitorType', 'value', 'recordTime'];
    
    for (const field of required) {
      if (!monitoring[field] && monitoring[field] !== 0) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 监测类型验证
    const validTypes = ['glucose', 'bp', 'weight', 'exercise', 'sleep', 'mood'];
    if (!validTypes.includes(monitoring.monitorType)) {
      throw new Error('监测类型不正确');
    }
    
    // 数值合理性验证
    this.validateMonitoringValue(monitoring.monitorType, monitoring.value);
  }

  /**
   * 验证监测数值的合理性
   * @private
   */
  validateMonitoringValue(type, value) {
    switch (type) {
      case 'glucose':
        if (value < 1 || value > 30) {
          throw new Error('血糖数值超出正常范围');
        }
        break;
      case 'weight':
        if (value < 10 || value > 300) {
          throw new Error('体重数值超出正常范围');
        }
        break;
      case 'exercise':
        if (value < 0 || value > 24) {
          throw new Error('运动时长数值不合理');
        }
        break;
      case 'sleep':
        if (value < 0 || value > 24) {
          throw new Error('睡眠时长数值不合理');
        }
        break;
      case 'mood':
        if (value < 1 || value > 10) {
          throw new Error('情绪评分应在1-10之间');
        }
        break;
    }
  }
  
  /**
   * 验证运动数据
   * @private
   */
  validateExerciseData(exerciseData) {
    const required = ['exercise'];
    
    for (const field of required) {
      if (!exerciseData[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    const exercise = exerciseData.exercise;
    
    // 运动时长验证
    if (exercise.duration && (exercise.duration < 0 || exercise.duration > 720)) {
      throw new Error('运动时长应在0-720分钟之间');
    }
    
    // 卡路里验证
    if (exercise.calories && (exercise.calories < 0 || exercise.calories > 10000)) {
      throw new Error('消耗卡路里数值不合理');
    }
    
    // 距离验证
    if (exercise.distance && exercise.distance < 0) {
      throw new Error('运动距离不能为负数');
    }
    
    // 强度验证
    const validIntensities = ['low', 'moderate', 'high', 'vigorous'];
    if (exercise.intensity && !validIntensities.includes(exercise.intensity)) {
      throw new Error('运动强度值不正确');
    }
  }
  
  /**
   * 验证睡眠数据
   * @private
   */
  validateSleepData(sleepData) {
    const required = ['sleepTime'];
    
    for (const field of required) {
      if (!sleepData[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    const sleepTime = sleepData.sleepTime;
    
    // 睡眠时长验证
    if (sleepTime.duration && (sleepTime.duration < 0 || sleepTime.duration > 24)) {
      throw new Error('睡眠时长应在0-24小时之间');
    }
    
    // 入睡潜伏期验证
    if (sleepTime.sleepLatency && (sleepTime.sleepLatency < 0 || sleepTime.sleepLatency > 300)) {
      throw new Error('入睡潜伏期应在0-300分钟之间');
    }
    
    // 时间格式验证
    if (sleepTime.bedTime && !this.isValidTimeFormat(sleepTime.bedTime)) {
      throw new Error('上床时间格式不正确');
    }
    
    if (sleepTime.wakeUpTime && !this.isValidTimeFormat(sleepTime.wakeUpTime)) {
      throw new Error('起床时间格式不正确');
    }
  }
  
  /**
   * 验证时间格式
   * @private
   */
  isValidTimeFormat(timeString) {
    if (typeof timeString === 'string') {
      // 验证 HH:MM 格式
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(timeString);
    }
    // 如果是Date对象或ISO字符串
    return !isNaN(new Date(timeString).getTime());
  }

  // ==================== 工具方法 ====================

  /**
   * 生成唯一ID
   * @private
   */
  generateId() {
    return 'health_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 根据时间范围过滤数据
   * @private
   */
  filterByTimeRange(data, timeRange) {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1d':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startTime = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startTime = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemTime = new Date(item.measureTime || item.recordTime || item.reportDate);
      return itemTime >= startTime;
    });
  }

  /**
   * 计算趋势数据
   * @private
   */
  calculateTrends(data, dataType) {
    if (!data || data.length < 2) {
      return { trend: 'insufficient_data', change: 0, percentage: 0 };
    }
    
    // 根据数据类型提取数值
    const values = data.map(item => {
      switch (dataType) {
        case 'bloodPressure':
          return item.bloodPressure ? item.bloodPressure.systolic : null;
        case 'bloodGlucose':
        case 'weight':
          return item.value;
        default:
          return item.value;
      }
    }).filter(v => v !== null);
    
    if (values.length < 2) {
      return { trend: 'insufficient_data', change: 0, percentage: 0 };
    }
    
    // 计算趋势
    const latest = values[0];
    const earliest = values[values.length - 1];
    const change = latest - earliest;
    const percentage = earliest !== 0 ? (change / earliest) * 100 : 0;
    
    let trend = 'stable';
    if (Math.abs(percentage) > 5) {
      trend = change > 0 ? 'increasing' : 'decreasing';
    }
    
    return { trend, change, percentage: Math.round(percentage * 100) / 100 };
  }

  /**
   * 生成趋势分析报告
   * @private
   */
  generateTrendAnalysis(trends) {
    const { trend, change, percentage } = trends;
    
    switch (trend) {
      case 'increasing':
        return `数据呈上升趋势，增长了${Math.abs(change).toFixed(1)}个单位（${Math.abs(percentage)}%）`;
      case 'decreasing':
        return `数据呈下降趋势，下降了${Math.abs(change).toFixed(1)}个单位（${Math.abs(percentage)}%）`;
      case 'stable':
        return '数据相对稳定，变化幅度较小';
      default:
        return '数据不足，无法进行趋势分析';
    }
  }

  /**
   * 分析生命体征风险
   * @private
   */
  analyzeVitalSignsRisk(healthData, riskFactors, recommendations) {
    const current = healthData.vitalSigns.current;
    
    // 血压风险分析
    if (current.bloodPressure) {
      const { systolic, diastolic } = current.bloodPressure;
      if (systolic >= 140 || diastolic >= 90) {
        riskFactors.push({
          type: 'high_blood_pressure',
          level: 'high',
          description: '血压偏高',
          value: `${systolic}/${diastolic} mmHg`
        });
        recommendations.push('建议控制饮食，减少盐分摄入，定期监测血压');
      }
    }
    
    // 心率风险分析
    if (current.heartRate && current.heartRate.value) {
      if (current.heartRate.value > 100) {
        riskFactors.push({
          type: 'tachycardia',
          level: 'medium',
          description: '心率偏快',
          value: `${current.heartRate.value} bpm`
        });
        recommendations.push('建议适度休息，避免过度劳累，必要时就医检查');
      }
    }
  }

  /**
   * 分析生活方式风险
   * @private
   */
  analyzeLifestyleRisk(healthData, riskFactors, recommendations) {
    const basic = healthData.basicHealthInfo;
    
    // BMI风险分析
    if (basic.bmi) {
      if (basic.bmi >= 28) {
        riskFactors.push({
          type: 'obesity',
          level: 'high',
          description: '肥胖',
          value: `BMI: ${basic.bmi}`
        });
        recommendations.push('建议控制体重，增加运动，调整饮食结构');
      } else if (basic.bmi < 18.5) {
        riskFactors.push({
          type: 'underweight',
          level: 'medium',
          description: '体重偏轻',
          value: `BMI: ${basic.bmi}`
        });
        recommendations.push('建议增加营养摄入，适当运动增强体质');
      }
    }
    
    // 吸烟风险分析
    if (basic.smokingStatus === 'current') {
      riskFactors.push({
        type: 'smoking',
        level: 'high',
        description: '吸烟',
        value: '当前吸烟'
      });
      recommendations.push('强烈建议戒烟，可寻求专业戒烟帮助');
    }
  }

  /**
   * 分析病史风险
   * @private
   */
  analyzeMedicalHistoryRisk(healthData, riskFactors, recommendations) {
    const basic = healthData.basicHealthInfo;
    
    // 慢性疾病风险
    if (basic.chronicDiseases && basic.chronicDiseases.length > 0) {
      riskFactors.push({
        type: 'chronic_diseases',
        level: 'medium',
        description: '慢性疾病',
        value: basic.chronicDiseases.join(', ')
      });
      recommendations.push('建议定期复查，遵医嘱用药，注意疾病管理');
    }
    
    // 家族病史风险
    if (basic.familyMedicalHistory && basic.familyMedicalHistory.length > 0) {
      riskFactors.push({
        type: 'family_history',
        level: 'medium',
        description: '家族病史',
        value: basic.familyMedicalHistory.join(', ')
      });
      recommendations.push('建议定期体检，关注相关疾病的早期筛查');
    }
  }

  /**
   * 计算综合风险评分
   * @private
   */
  calculateOverallRisk(riskFactors) {
    if (riskFactors.length === 0) {
      return { level: 'low', score: 10, description: '低风险' };
    }
    
    let score = 0;
    riskFactors.forEach(factor => {
      switch (factor.level) {
        case 'high': score += 30; break;
        case 'medium': score += 20; break;
        case 'low': score += 10; break;
      }
    });
    
    let level, description;
    if (score >= 60) {
      level = 'high';
      description = '高风险';
    } else if (score >= 30) {
      level = 'medium';
      description = '中等风险';
    } else {
      level = 'low';
      description = '低风险';
    }
    
    return { level, score, description };
  }

  /**
   * 计算下次评估日期
   * @private
   */
  calculateNextAssessmentDate(overallRisk) {
    const now = new Date();
    let months;
    
    switch (overallRisk.level) {
      case 'high': months = 3; break;
      case 'medium': months = 6; break;
      case 'low': months = 12; break;
      default: months = 6;
    }
    
    const nextDate = new Date(now);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate.toISOString();
  }
}

// 创建单例实例
const healthArchiveService = new HealthArchiveService();

// ==================== 医疗记录管理扩展 ====================

/**
 * 医疗记录管理服务扩展
 * 处理就诊记录、用药记录、检查报告、诊断记录和手术记录
 */
class MedicalRecordsManager {
  constructor(healthService) {
    this.healthService = healthService;
  }

  // ==================== 就诊记录管理 ====================

  /**
   * 添加就诊记录
   */
  async addConsultationRecord(memberId, consultationData) {
    try {
      // 验证数据
      this.validateConsultationData(consultationData);
      
      // 创建就诊记录
      const record = {
        ...this.healthService.getConsultationSchema(),
        ...consultationData,
        id: this.healthService.generateId(),
        memberId,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      
      // 获取健康档案
      const healthData = await this.healthService.getHealthArchive(memberId);
      
      // 添加到就诊记录
      if (!healthData.medicalRecords.consultations) {
        healthData.medicalRecords.consultations = [];
      }
      healthData.medicalRecords.consultations.unshift(record);
      
      // 更新健康档案
      await this.healthService.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: record.id,
        message: '就诊记录添加成功'
      };
    } catch (error) {
      console.error('添加就诊记录失败:', error);
      throw new Error(`添加就诊记录失败: ${error.message}`);
    }
  }

  /**
   * 获取就诊记录列表
   */
  async getConsultationRecords(memberId, options = {}) {
    try {
      const healthData = await this.healthService.getHealthArchive(memberId);
      let records = healthData.medicalRecords.consultations || [];
      
      // 应用筛选条件
      if (options.dateRange) {
        records = this.filterRecordsByDateRange(records, options.dateRange);
      }
      
      if (options.hospital) {
        records = records.filter(r => r.hospital.includes(options.hospital));
      }
      
      // 排序
      records.sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
      
      return {
        success: true,
        records,
        total: records.length
      };
    } catch (error) {
      console.error('获取就诊记录失败:', error);
      throw new Error(`获取就诊记录失败: ${error.message}`);
    }
  }

  // ==================== 用药记录管理 ====================

  /**
   * 添加用药记录
   */
  async addMedicationRecord(memberId, medicationData) {
    try {
      // 验证数据
      this.validateMedicationData(medicationData);
      
      // 创建用药记录
      const record = {
        ...this.healthService.getMedicationRecordSchema(),
        ...medicationData,
        id: this.healthService.generateId(),
        memberId,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      
      // 获取健康档案
      const healthData = await this.healthService.getHealthArchive(memberId);
      
      // 添加到用药记录
      if (!healthData.medications.current) {
        healthData.medications.current = [];
      }
      if (!healthData.medications.history) {
        healthData.medications.history = [];
      }
      
      if (record.status === 'active') {
        healthData.medications.current.unshift(record);
      } else {
        healthData.medications.history.unshift(record);
      }
      
      // 更新健康档案
      await this.healthService.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        recordId: record.id,
        message: '用药记录添加成功'
      };
    } catch (error) {
      console.error('添加用药记录失败:', error);
      throw new Error(`添加用药记录失败: ${error.message}`);
    }
  }

  /**
   * 获取用药记录列表
   */
  async getMedicationRecords(memberId, options = {}) {
    try {
      const healthData = await this.healthService.getHealthArchive(memberId);
      let records = [];
      
      // 合并当前用药和历史用药
      if (options.status === 'active') {
        records = healthData.medications.current || [];
      } else if (options.status === 'history') {
        records = healthData.medications.history || [];
      } else {
        records = [
          ...(healthData.medications.current || []),
          ...(healthData.medications.history || [])
        ];
      }
      
      // 应用筛选条件
      if (options.medicationName) {
        records = records.filter(r => 
          r.medicationName.includes(options.medicationName) ||
          r.genericName.includes(options.medicationName)
        );
      }
      
      // 排序
      records.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      
      return {
        success: true,
        records,
        total: records.length
      };
    } catch (error) {
      console.error('获取用药记录失败:', error);
      throw new Error(`获取用药记录失败: ${error.message}`);
    }
  }

  // ==================== 检查报告管理 ====================

  /**
   * 添加检查报告
   */
  async addExaminationReport(memberId, reportData) {
    try {
      // 验证数据
      this.validateExaminationData(reportData);
      
      // 创建检查报告
      const report = {
        ...this.healthService.getExaminationReportSchema(),
        ...reportData,
        id: this.healthService.generateId(),
        memberId,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      
      // 获取健康档案
      const healthData = await this.healthService.getHealthArchive(memberId);
      
      // 添加到相应类型的报告列表
      const reportCategory = this.getReportCategory(report.reportType);
      if (!healthData.medicalReports[reportCategory]) {
        healthData.medicalReports[reportCategory] = [];
      }
      healthData.medicalReports[reportCategory].unshift(report);
      
      // 更新健康档案
      await this.healthService.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        reportId: report.id,
        message: '检查报告添加成功'
      };
    } catch (error) {
      console.error('添加检查报告失败:', error);
      throw new Error(`添加检查报告失败: ${error.message}`);
    }
  }

  /**
   * 获取检查报告列表
   */
  async getExaminationReports(memberId, options = {}) {
    try {
      const healthData = await this.healthService.getHealthArchive(memberId);
      let reports = [];
      
      // 根据报告类型获取报告
      if (options.reportType) {
        const category = this.getReportCategory(options.reportType);
        reports = healthData.medicalReports[category] || [];
      } else {
        // 获取所有类型的报告
        Object.values(healthData.medicalReports).forEach(categoryReports => {
          if (Array.isArray(categoryReports)) {
            reports.push(...categoryReports);
          }
        });
      }
      
      // 应用筛选条件
      if (options.dateRange) {
        reports = this.filterRecordsByDateRange(reports, options.dateRange, 'reportDate');
      }
      
      // 排序
      reports.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
      
      return {
        success: true,
        reports,
        total: reports.length
      };
    } catch (error) {
      console.error('获取检查报告失败:', error);
      throw new Error(`获取检查报告失败: ${error.message}`);
    }
  }

  // ==================== 诊断记录管理 ====================

  /**
   * 添加诊断记录
   */
  async addDiagnosisRecord(memberId, diagnosisData) {
    try {
      // 验证数据
      this.validateDiagnosisData(diagnosisData);
      
      // 创建诊断记录
      const diagnosis = {
        ...this.healthService.getDiagnosisSchema(),
        ...diagnosisData,
        id: this.healthService.generateId(),
        memberId,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      
      // 获取健康档案
      const healthData = await this.healthService.getHealthArchive(memberId);
      
      // 更新慢性疾病列表
      if (diagnosis.status === 'chronic' && !healthData.basicHealthInfo.chronicDiseases.includes(diagnosis.primaryDiagnosis)) {
        healthData.basicHealthInfo.chronicDiseases.push(diagnosis.primaryDiagnosis);
      }
      
      // 保存为独立的诊断记录
      if (!healthData.medicalRecords.diagnoses) {
        healthData.medicalRecords.diagnoses = [];
      }
      healthData.medicalRecords.diagnoses.unshift(diagnosis);
      
      // 更新健康档案
      await this.healthService.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        diagnosisId: diagnosis.id,
        message: '诊断记录添加成功'
      };
    } catch (error) {
      console.error('添加诊断记录失败:', error);
      throw new Error(`添加诊断记录失败: ${error.message}`);
    }
  }

  // ==================== 手术记录管理 ====================

  /**
   * 添加手术记录
   */
  async addSurgeryRecord(memberId, surgeryData) {
    try {
      // 验证数据
      this.validateSurgeryData(surgeryData);
      
      // 创建手术记录
      const surgery = {
        ...this.healthService.getSurgerySchema(),
        ...surgeryData,
        id: this.healthService.generateId(),
        memberId,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      
      // 获取健康档案
      const healthData = await this.healthService.getHealthArchive(memberId);
      
      // 添加到手术记录
      if (!healthData.medicalRecords.surgeries) {
        healthData.medicalRecords.surgeries = [];
      }
      healthData.medicalRecords.surgeries.unshift(surgery);
      
      // 更新健康档案
      await this.healthService.updateHealthArchive(memberId, healthData);
      
      return {
        success: true,
        surgeryId: surgery.id,
        message: '手术记录添加成功'
      };
    } catch (error) {
      console.error('添加手术记录失败:', error);
      throw new Error(`添加手术记录失败: ${error.message}`);
    }
  }

  // ==================== 数据验证方法 ====================

  /**
   * 验证就诊记录数据
   */
  validateConsultationData(data) {
    const required = ['recordDate', 'hospital', 'department', 'doctor'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 日期验证
    if (new Date(data.recordDate) > new Date()) {
      throw new Error('就诊日期不能是未来时间');
    }
  }

  /**
   * 验证用药记录数据
   */
  validateMedicationData(data) {
    const required = ['medicationName', 'dosage', 'frequency', 'startDate'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 日期验证
    if (data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
      throw new Error('开始日期不能晚于结束日期');
    }
  }

  /**
   * 验证检查报告数据
   */
  validateExaminationData(data) {
    const required = ['reportType', 'reportDate', 'hospital'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    const validTypes = ['blood', 'urine', 'imaging', 'ecg', 'endoscopy', 'pathology'];
    if (!validTypes.includes(data.reportType)) {
      throw new Error('检查报告类型不正确');
    }
  }

  /**
   * 验证诊断记录数据
   */
  validateDiagnosisData(data) {
    const required = ['diagnosisDate', 'doctor', 'primaryDiagnosis'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
  }

  /**
   * 验证手术记录数据
   */
  validateSurgeryData(data) {
    const required = ['surgeryDate', 'surgeryName', 'hospital', 'surgeon'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    
    // 手术时长验证
    if (data.duration && (data.duration < 0 || data.duration > 24 * 60)) {
      throw new Error('手术时长数据不合理');
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 根据日期范围筛选记录
   */
  filterRecordsByDateRange(records, dateRange, dateField = 'recordDate') {
    if (!dateRange) return records;
    
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return records;
    }
    
    return records.filter(record => {
      const recordDate = new Date(record[dateField]);
      return recordDate >= startDate;
    });
  }

  /**
   * 获取报告分类
   */
  getReportCategory(reportType) {
    const categoryMap = {
      'blood': 'bloodTests',
      'urine': 'urineTests',
      'imaging': 'imagingStudies',
      'ecg': 'ecg',
      'endoscopy': 'endoscopy',
      'pathology': 'pathology'
    };
    return categoryMap[reportType] || 'others';
  }
}

// 创建医疗记录管理器实例
const medicalRecordsManager = new MedicalRecordsManager(healthArchiveService);

// 将医疗记录管理器附加到健康档案服务
healthArchiveService.medicalRecords = medicalRecordsManager;

// ==================== 运动和睡眠数据分析方法扩展 ====================

/**
 * 分析运动数据
 * @private
 */
healthArchiveService.analyzeExerciseData = function(exerciseData) {
  const exercise = exerciseData.exercise;
  const physicalState = exerciseData.physicalState || {};
  const performance = exerciseData.performance || {};
  
  const analysis = {
    category: 'moderate',
    calorie_efficiency: 0,
    heart_rate_zone: '',
    recommendations: [],
    fitness_impact: 'positive'
  };
  
  // 运动强度分类
  if (exercise.duration > 0) {
    const caloriesPerMinute = exercise.calories / exercise.duration;
    
    if (caloriesPerMinute < 5) {
      analysis.category = 'light';
    } else if (caloriesPerMinute < 10) {
      analysis.category = 'moderate';
    } else if (caloriesPerMinute < 15) {
      analysis.category = 'vigorous';
    } else {
      analysis.category = 'extreme';
    }
    
    analysis.calorie_efficiency = Math.round(caloriesPerMinute * 10) / 10;
  }
  
  // 心率区间分析
  if (physicalState.avgHeartRate > 0) {
    if (physicalState.avgHeartRate < 120) {
      analysis.heart_rate_zone = 'fat_burn';
    } else if (physicalState.avgHeartRate < 150) {
      analysis.heart_rate_zone = 'cardio';
    } else {
      analysis.heart_rate_zone = 'peak';
    }
  }
  
  // 生成建议
  if (exercise.duration < 30) {
    analysis.recommendations.push('建议增加运动时长至少30分钟以获得更好的健康效果');
  }
  
  if (analysis.category === 'light') {
    analysis.recommendations.push('可以适当增加运动强度来提高健身效果');
  }
  
  if (performance.perceived_exertion > 8) {
    analysis.recommendations.push('运动强度较高，注意适度休息和恢复');
  }
  
  return analysis;
};

/**
 * 分析睡眠数据
 * @private
 */
healthArchiveService.analyzeSleepData = function(sleepData) {
  const sleepTime = sleepData.sleepTime || {};
  const sleepQuality = sleepData.sleepQuality || {};
  const preSleepState = sleepData.preSleepState || {};
  
  const analysis = {
    quality_score: 0,
    efficiency: 0,
    sleep_debt: 0,
    recommendations: [],
    sleep_phase_analysis: {},
    pattern_insights: ''
  };
  
  // 计算睡眠质量评分
  let score = 50; // 基础分
  
  // 睡眠时长评分
  if (sleepTime.duration >= 7 && sleepTime.duration <= 9) {
    score += 20;
  } else if (sleepTime.duration >= 6 && sleepTime.duration < 7) {
    score += 10;
    analysis.recommendations.push('建议增加睡眠时间至7-9小时');
  } else if (sleepTime.duration > 9) {
    score += 5;
    analysis.recommendations.push('睡眠时间过长，注意睡眠质量');
  } else {
    score -= 10;
    analysis.recommendations.push('睡眠时间严重不足，需要改善睡眠习惯');
  }
  
  // 入睡时间评分
  if (sleepTime.sleepLatency <= 15) {
    score += 15;
  } else if (sleepTime.sleepLatency <= 30) {
    score += 10;
  } else {
    score -= 5;
    analysis.recommendations.push('入睡时间过长，可以尝试放松技巧或改善睡眠环境');
  }
  
  // 睡眠质量评分
  const qualityScores = {
    'excellent': 15,
    'good': 10,
    'fair': 5,
    'poor': -5,
    'very_poor': -10
  };
  
  if (sleepQuality.overall && qualityScores[sleepQuality.overall]) {
    score += qualityScores[sleepQuality.overall];
  }
  
  // 夜间觉醒评分
  if (sleepQuality.awakening <= 1) {
    score += 10;
  } else if (sleepQuality.awakening <= 2) {
    score += 5;
  } else {
    score -= 5;
    analysis.recommendations.push('夜间觉醒次数较多，建议检查睡眠环境或咨询医生');
  }
  
  // 睡前状态影响
  if (preSleepState.caffeine_intake) {
    score -= 5;
    analysis.recommendations.push('避免睡前摄入咖啡因');
  }
  
  if (preSleepState.screen_time > 60) {
    score -= 5;
    analysis.recommendations.push('减少睡前屏幕时间，建议睡前1小时避免使用电子设备');
  }
  
  analysis.quality_score = Math.max(0, Math.min(100, score));
  
  // 计算睡眠效率
  if (sleepTime.duration > 0 && sleepTime.sleepLatency >= 0) {
    analysis.efficiency = Math.round((sleepTime.duration / (sleepTime.duration + sleepTime.sleepLatency / 60)) * 100);
  }
  
  // 计算睡眠负债
  const idealSleep = 8;
  analysis.sleep_debt = Math.max(0, idealSleep - sleepTime.duration);
  
  return analysis;
};

/**
 * 更新运动频率统计
 * @private
 */
healthArchiveService.updateExerciseFrequency = function(healthData, exerciseRecord) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  // 计算最近一周的运动次数
  const recentExercises = (healthData.healthMonitoring.exerciseRecords || [])
    .filter(record => new Date(record.recordTime) >= weekAgo);
  
  const exerciseCount = recentExercises.length;
  
  // 更新运动频率
  if (exerciseCount >= 5) {
    healthData.basicHealthInfo.exerciseFrequency = 'frequent';
  } else if (exerciseCount >= 3) {
    healthData.basicHealthInfo.exerciseFrequency = 'regular';
  } else if (exerciseCount >= 1) {
    healthData.basicHealthInfo.exerciseFrequency = 'rare';
  } else {
    healthData.basicHealthInfo.exerciseFrequency = 'none';
  }
};

/**
 * 更新睡眠质量统计
 * @private
 */
healthArchiveService.updateSleepQuality = function(healthData, sleepRecord) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  // 计算最近一周的平均睡眠质量
  const recentSleepRecords = (healthData.healthMonitoring.sleepRecords || [])
    .filter(record => new Date(record.recordDate) >= weekAgo);
  
  if (recentSleepRecords.length > 0) {
    const qualityScores = {
      'very_poor': 1,
      'poor': 2,
      'fair': 3,
      'good': 4,
      'excellent': 5
    };
    
    const totalScore = recentSleepRecords.reduce((sum, record) => {
      return sum + (qualityScores[record.sleepQuality?.overall] || 3);
    }, 0);
    
    const avgScore = totalScore / recentSleepRecords.length;
    
    if (avgScore >= 4.5) {
      healthData.basicHealthInfo.sleepQuality = 'excellent';
    } else if (avgScore >= 3.5) {
      healthData.basicHealthInfo.sleepQuality = 'good';
    } else if (avgScore >= 2.5) {
      healthData.basicHealthInfo.sleepQuality = 'fair';
    } else {
      healthData.basicHealthInfo.sleepQuality = 'poor';
    }
  }
};

/**
 * 计算运动统计数据
 * @private
 */
healthArchiveService.calculateExerciseStatistics = function(records) {
  if (!records || records.length === 0) {
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      avgCalories: 0,
      mostFrequentType: '',
      weeklyFrequency: 0
    };
  }
  
  const stats = {
    totalWorkouts: records.length,
    totalDuration: 0,
    totalCalories: 0,
    avgDuration: 0,
    avgCalories: 0,
    mostFrequentType: '',
    weeklyFrequency: 0
  };
  
  // 计算总数据
  records.forEach(record => {
    stats.totalDuration += record.exercise.duration || 0;
    stats.totalCalories += record.exercise.calories || 0;
  });
  
  // 计算平均值
  stats.avgDuration = Math.round(stats.totalDuration / records.length);
  stats.avgCalories = Math.round(stats.totalCalories / records.length);
  
  // 统计最常见的运动类型
  const typeCount = {};
  records.forEach(record => {
    const type = record.exercise.type;
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  
  let maxCount = 0;
  Object.keys(typeCount).forEach(type => {
    if (typeCount[type] > maxCount) {
      maxCount = typeCount[type];
      stats.mostFrequentType = type;
    }
  });
  
  // 计算周频率（最近一个月的数据）
  const now = new Date();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recentRecords = records.filter(record => new Date(record.recordTime) >= monthAgo);
  stats.weeklyFrequency = Math.round((recentRecords.length / 4) * 10) / 10;
  
  return stats;
};

/**
 * 计算睡眠统计数据
 * @private
 */
healthArchiveService.calculateSleepStatistics = function(records) {
  if (!records || records.length === 0) {
    return {
      totalNights: 0,
      avgDuration: 0,
      avgQualityScore: 0,
      avgSleepLatency: 0,
      bestSleepQuality: '',
      worstSleepQuality: '',
      sleepDebt: 0
    };
  }
  
  const stats = {
    totalNights: records.length,
    avgDuration: 0,
    avgQualityScore: 0,
    avgSleepLatency: 0,
    bestSleepQuality: '',
    worstSleepQuality: '',
    sleepDebt: 0
  };
  
  let totalDuration = 0;
  let totalQualityScore = 0;
  let totalSleepLatency = 0;
  let totalSleepDebt = 0;
  
  records.forEach(record => {
    totalDuration += record.sleepTime.duration || 0;
    totalQualityScore += record.analysis?.quality_score || 0;
    totalSleepLatency += record.sleepTime.sleepLatency || 0;
    totalSleepDebt += record.analysis?.sleep_debt || 0;
  });
  
  // 计算平均值
  stats.avgDuration = Math.round((totalDuration / records.length) * 10) / 10;
  stats.avgQualityScore = Math.round(totalQualityScore / records.length);
  stats.avgSleepLatency = Math.round(totalSleepLatency / records.length);
  stats.sleepDebt = Math.round((totalSleepDebt / records.length) * 10) / 10;
  
  // 找出最好和最差的睡眠质量
  let bestScore = 0;
  let worstScore = 100;
  
  records.forEach(record => {
    const score = record.analysis?.quality_score || 0;
    if (score > bestScore) {
      bestScore = score;
      stats.bestSleepQuality = record.sleepQuality?.overall || '';
    }
    if (score < worstScore) {
      worstScore = score;
      stats.worstSleepQuality = record.sleepQuality?.overall || '';
    }
  });
  
  return stats;
};

module.exports = healthArchiveService;