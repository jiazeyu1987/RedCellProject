// API接口管理
const { http } = require('../services/http.service.js');
import NotificationAPI from './notification-api.js';

// 用户认证相关API
const AuthAPI = {
  // 手机号密码登录
  loginByPassword: (phone, password) => {
    return http.post('/auth/login/password', { phone, password });
  },
  
  // 手机号验证码登录
  loginByPhone: (phone, code) => {
    return http.post('/auth/login/phone', { phone, code });
  },
  
  // 微信授权登录
  loginByWechat: (params) => {
    return http.post('/auth/login/wechat', params);
  },
  
  // 获取验证码
  getSmsCode: (phone) => {
    return http.post('/auth/sms/send', { phone });
  },
  
  // 退出登录
  logout: (token) => {
    return http.post('/auth/logout', { token });
  },
  
  // 验证token
  validateToken: (token) => {
    return http.post('/auth/validate-token', { token });
  },
  
  // 刷新token
  refreshToken: (refreshToken) => {
    return http.post('/auth/refresh', { refreshToken });
  },
  
  // 获取用户信息
  getUserInfo: () => {
    return http.get('/auth/user');
  },
  
  // 绑定手机号
  bindPhone: (phone, code) => {
    return http.post('/auth/bind-phone', { phone, code });
  },

  // 获取密码重置验证码
  getPasswordResetSmsCode: (phone) => {
    return http.post('/auth/password-reset/sms', { phone });
  },

  // 验证密码重置验证码
  verifyPasswordResetCode: (phone, code) => {
    return http.post('/auth/password-reset/verify', { phone, code });
  },

  // 重置密码
  resetPassword: (phone, code, newPassword) => {
    return http.post('/auth/password-reset/confirm', { phone, code, newPassword });
  }
};

// 日程管理相关API
const ScheduleAPI = {
  // 获取日程列表
  getScheduleList: (params) => {
    return http.get('/schedule/list', params);
  },
  
  // 获取日程统计信息
  getScheduleStatistics: (params = {}) => {
    return http.get('/schedule/statistics', params);
  },
  
  // 获取详细统计信息
  getDetailedStatistics: (timeRange = 'today') => {
    return http.get('/schedule/statistics/detailed', { timeRange });
  },
  
  // 获取统计趋势数据
  getStatisticsTrend: (days = 7) => {
    return http.get('/schedule/statistics/trend', { days });
  },
  
  // 获取日程详情
  getScheduleDetail: (id) => {
    return http.get(`/schedule/detail/${id}`);
  },
  
  // 更新日程状态
  updateScheduleStatus: (id, status, reason = '') => {
    return http.put(`/schedule/status/${id}`, { status, reason });
  },
  
  // 调整预约时间
  rescheduleAppointment: (id, newStartTime, newEndTime, reason = '') => {
    return http.put(`/schedule/reschedule/${id}`, { 
      newStartTime, 
      newEndTime, 
      reason 
    });
  },
  
  // 批量时间调整
  batchReschedule: (scheduleIds, newStartTime, newEndTime, reason = '') => {
    return http.put('/schedule/batch-reschedule', { 
      scheduleIds, 
      newStartTime, 
      newEndTime, 
      reason 
    });
  },
  
  // 批量更新状态
  batchUpdateStatus: (scheduleIds, status, reason = '') => {
    return http.put('/schedule/batch-status', { 
      scheduleIds, 
      status, 
      reason 
    });
  },
  
  // 检查时间冲突
  checkTimeConflict: (startTime, endTime, excludeIds = []) => {
    return http.post('/schedule/check-conflict', {
      startTime,
      endTime,
      excludeIds
    });
  },
  
  // 处理患者不在家情况
  handlePatientNotHome: (scheduleId, reason, nextAction) => {
    return http.post(`/schedule/no-show/${scheduleId}`, {
      reason,
      nextAction // 'reschedule', 'cancel', 'wait'
    });
  },
  
  // 开始服务
  startService: (scheduleId, location) => {
    return http.post(`/schedule/start/${scheduleId}`, {
      startTime: new Date().toISOString(),
      location
    });
  },
  
  // 完成服务
  completeService: (scheduleId, endTime, summary) => {
    return http.post(`/schedule/complete/${scheduleId}`, {
      endTime,
      summary
    });
  },
  
  // 取消服务
  cancelService: (scheduleId, reason) => {
    return http.post(`/schedule/cancel/${scheduleId}`, {
      reason,
      cancelTime: new Date().toISOString()
    });
  },
  
  // 获取推荐时间段
  getRecommendedTimeSlots: (date, duration = 60) => {
    return http.get('/schedule/recommended-slots', {
      date,
      duration
    });
  },
  
  // 同步日程数据
  syncScheduleData: (lastSyncTime) => {
    return http.post('/schedule/sync', {
      lastSyncTime
    });
  },
  
  // 获取日稌提醒
  getScheduleReminders: () => {
    return http.get('/schedule/reminders');
  },
  
  // 标记提醒已读
  markReminderRead: (reminderId) => {
    return http.put(`/schedule/reminder/${reminderId}/read`);
  }
};

// 患者管理相关API
const PatientAPI = {
  // 获取患者列表
  getPatientList: (params) => {
    return http.get('/patient/list', params);
  },
  
  // 获取患者详情
  getPatientDetail: (id) => {
    return http.get(`/patient/detail/${id}`);
  },
  
  // 获取家庭成员列表
  getFamilyMembers: (patientId) => {
    return http.get(`/patient/family/${patientId}`);
  },
  
  // 更新患者信息
  updatePatientInfo: (id, data) => {
    return http.put(`/patient/update/${id}`, data);
  },
  
  // 获取健康档案
  getHealthRecord: (patientId) => {
    return http.get(`/patient/health-record/${patientId}`);
  },
  
  // 获取服务历史
  getServiceHistory: (patientId, params) => {
    return http.get(`/patient/service-history/${patientId}`, params);
  }
};

// 服务记录相关API
const RecordAPI = {
  // 创建服务记录
  createRecord: (data) => {
    return http.post('/record/create', data);
  },
  
  // 更新服务记录
  updateRecord: (id, data) => {
    return http.put(`/record/update/${id}`, data);
  },
  
  // 获取服务记录列表
  getRecordList: (params) => {
    return http.get('/record/list', params);
  },
  
  // 获取服务记录详情
  getRecordDetail: (id) => {
    return http.get(`/record/detail/${id}`);
  },
  
  // 上传服务照片
  uploadPhoto: (filePath, recordId) => {
    return http.upload('/record/upload/photo', filePath, { recordId });
  },
  
  // 上传服务录音
  uploadAudio: (filePath, recordId) => {
    return http.upload('/record/upload/audio', filePath, { recordId });
  },
  
  // 提交电子签名
  submitSignature: (recordId, signature) => {
    return http.post('/record/signature', { recordId, signature });
  }
};

// 付款管理相关API
const PaymentAPI = {
  // 获取付款列表
  getPaymentList: (params) => {
    return http.get('/payment/list', params);
  },
  
  // 获取付款详情
  getPaymentDetail: (id) => {
    return http.get(`/payment/detail/${id}`);
  },
  
  // 发送催缴通知
  sendPaymentReminder: (paymentId) => {
    return http.post(`/payment/reminder/${paymentId}`);
  },
  
  // 处理退款
  processRefund: (paymentId, reason) => {
    return http.post(`/payment/refund/${paymentId}`, { reason });
  },
  
  // 获取财务统计
  getFinancialStats: (params) => {
    return http.get('/payment/stats', params);
  }
};

// 预约挂号相关API
const AppointmentAPI = {
  // 搜索医院
  searchHospitals: (keyword, location) => {
    return http.get('/appointment/hospitals/search', { keyword, location });
  },
  
  // 获取科室列表
  getDepartments: (hospitalId) => {
    return http.get(`/appointment/departments/${hospitalId}`);
  },
  
  // 获取医生列表
  getDoctors: (departmentId, date) => {
    return http.get('/appointment/doctors', { departmentId, date });
  },
  
  // 预约挂号
  makeAppointment: (data) => {
    return http.post('/appointment/make', data);
  },
  
  // 获取预约记录
  getAppointmentHistory: (params) => {
    return http.get('/appointment/history', params);
  }
};

// 医生协作相关API
const CollaborationAPI = {
  // 发送消息给医生
  sendMessage: (doctorId, message, attachments) => {
    return http.post('/collaboration/message/send', { doctorId, message, attachments });
  },
  
  // 获取消息列表
  getMessages: (doctorId, params) => {
    return http.get(`/collaboration/messages/${doctorId}`, params);
  },
  
  // 分享健康信息
  shareHealthInfo: (doctorId, patientId, data) => {
    return http.post('/collaboration/health-info/share', { doctorId, patientId, data });
  },
  
  // 获取医嘱
  getMedicalAdvice: (patientId) => {
    return http.get(`/collaboration/medical-advice/${patientId}`);
  },
  
  // 提交症状报告
  submitSymptomReport: (patientId, symptoms) => {
    return http.post('/collaboration/symptom-report', { patientId, symptoms });
  }
};

module.exports = {
  AuthAPI,
  ScheduleAPI,
  PatientAPI,
  RecordAPI,
  PaymentAPI,
  AppointmentAPI,
  CollaborationAPI,
  NotificationAPI
};