const healthArchiveService = require('../../services/health-archive.service.js');
const familyArchiveService = require('../../services/family-archive.service.js');

Page({
  data: {
    memberId: '',
    memberInfo: null,
    healthData: null,
    riskAssessment: null,
    currentTab: 'overview',
    tabs: [
      { key: 'overview', title: '概览', icon: 'dashboard' },
      { key: 'vital', title: '生命体征', icon: 'heart' },
      { key: 'medical', title: '医疗记录', icon: 'medical-bag' },
      { key: 'reports', title: '检查报告', icon: 'document' },
      { key: 'medications', title: '用药记录', icon: 'medicine' }
    ],
    
    // 新增：医疗记录数据
    medicalRecords: {
      consultations: [],
      diagnoses: [],
      surgeries: []
    },
    
    // 新增：检查报告数据
    examinationReports: [],
    loading: true,
    isError: false,
    errorMessage: ''
  },

  onLoad(options) {
    if (options.memberId) {
      this.setData({ memberId: options.memberId });
      this.initPage();
    }
  },

  async initPage() {
    try {
      await this.loadHealthArchive();
    } catch (error) {
      console.error('初始化失败:', error);
      this.setData({
        loading: false,
        isError: true,
        errorMessage: '加载失败，请重试'
      });
    }
  },

  async loadHealthArchive() {
    try {
      this.setData({ loading: true });

      const memberDetail = await familyArchiveService.getMemberDetail(this.data.memberId);
      const healthData = await healthArchiveService.getHealthArchive(this.data.memberId);
      const riskAssessment = await healthArchiveService.assessHealthRisks(this.data.memberId);
      
      // 加载医疗记录
      await this.loadMedicalRecords();
      
      // 加载检查报告
      await this.loadExaminationReports();

      this.setData({
        memberInfo: memberDetail,
        healthData,
        riskAssessment,
        loading: false
      });

      wx.setNavigationBarTitle({
        title: `${memberDetail.name}的健康档案`
      });
    } catch (error) {
      console.error('加载健康档案失败:', error);
      this.setData({
        loading: false,
        isError: true,
        errorMessage: '加载失败，请重试'
      });
    }
  },
  
  // 新增：加载医疗记录
  async loadMedicalRecords() {
    try {
      const medicalRecordsManager = healthArchiveService.medicalRecords;
      
      // 获取就诊记录
      const consultationsResult = await medicalRecordsManager.getConsultationRecords(this.data.memberId, {
        dateRange: '1y' // 最近一年
      });
      
      // 获取诊断记录（从健康档案中直接获取）
      const healthData = await healthArchiveService.getHealthArchive(this.data.memberId);
      const diagnoses = healthData.medicalRecords.diagnoses || [];
      const surgeries = healthData.medicalRecords.surgeries || [];
      
      this.setData({
        medicalRecords: {
          consultations: consultationsResult.records || [],
          diagnoses: diagnoses.slice(0, 10), // 只显示最近10条
          surgeries: surgeries.slice(0, 10)
        }
      });
    } catch (error) {
      console.error('加载医疗记录失败:', error);
    }
  },
  
  // 新增：加载检查报告
  async loadExaminationReports() {
    try {
      const medicalRecordsManager = healthArchiveService.medicalRecords;
      
      const reportsResult = await medicalRecordsManager.getExaminationReports(this.data.memberId, {
        dateRange: '1y' // 最近一年
      });
      
      this.setData({
        examinationReports: reportsResult.reports || []
      });
    } catch (error) {
      console.error('加载检查报告失败:', error);
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ currentTab: tab });
  },

  async addVitalSign() {
    // 添加生命体征记录
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=vital`
    });
  },

  async addMedicalReport() {
    // 添加检查报告
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=examinationReport`
    });
  },

  async addMedication() {
    // 添加用药记录
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=medicationRecord`
    });
  },
  
  // 新增：添加就诊记录
  addConsultation() {
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=consultation`
    });
  },
  
  // 新增：添加诊断记录
  addDiagnosis() {
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=diagnosis`
    });
  },
  
  // 新增：添加手术记录
  addSurgery() {
    wx.navigateTo({
      url: `/pages/health-record-form/health-record-form?memberId=${this.data.memberId}&type=surgery`
    });
  },
  
  // 新增：查看记录详情
  viewRecordDetail(e) {
    const { recordType, recordId } = e.currentTarget.dataset;
    
    // 这里可以根据记录类型跳转到不同的详情页面
    wx.navigateTo({
      url: `/pages/medical-record-detail/medical-record-detail?memberId=${this.data.memberId}&recordType=${recordType}&recordId=${recordId}`
    });
  },
  
  // 新增：查看更多记录
  viewMoreRecords(e) {
    const { recordType } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/medical-records-list/medical-records-list?memberId=${this.data.memberId}&type=${recordType}`
    });
  },
  
  // 新增：格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  
  // 新增：获取记录类型显示名称
  getRecordTypeName(type) {
    const typeMap = {
      'consultation': '就诊',
      'diagnosis': '诊断',
      'surgery': '手术',
      'blood': '血液检查',
      'urine': '尿液检查',
      'imaging': '影像检查',
      'ecg': '心电图',
      'endoscopy': '内镜检查',
      'pathology': '病理检查'
    };
    return typeMap[type] || type;
  },

  viewRiskDetail() {
    if (!this.data.riskAssessment) return;
    
    const { riskFactors, recommendations } = this.data.riskAssessment;
    const content = `风险因素：\n${riskFactors.map(f => `• ${f.description}`).join('\n')}\n\n建议：\n${recommendations.map(r => `• ${r}`).join('\n')}`;
    
    wx.showModal({
      title: '风险评估详情',
      content,
      showCancel: false
    });
  },

  onPullDownRefresh() {
    this.loadHealthArchive().then(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  onShow() {
    // 页面显示时刷新数据，以便显示新添加的记录
    if (this.data.memberId) {
      this.loadMedicalRecords();
      this.loadExaminationReports();
    }
  }
});