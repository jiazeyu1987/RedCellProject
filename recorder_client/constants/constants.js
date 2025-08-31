// 应用常量定义
const CONSTANTS = {
  // 页面路径
  PAGES: {
    LOGIN: '/pages/login/login',
    HOME: '/pages/home/home',
    SCHEDULE: '/pages/schedule/schedule',
    PATIENT: '/pages/patient/patient',
    RECORD: '/pages/record/record',
    PROFILE: '/pages/profile/profile'
  },
  
  // 事件名称
  EVENTS: {
    LOGIN_SUCCESS: 'loginSuccess',
    LOGOUT: 'logout',
    USER_INFO_UPDATE: 'userInfoUpdate',
    SCHEDULE_UPDATE: 'scheduleUpdate',
    PATIENT_UPDATE: 'patientUpdate'
  },
  
  // 请求方法
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },
  
  // 错误码
  ERROR_CODES: {
    NETWORK_ERROR: 1001,
    AUTH_FAILED: 1002,
    PERMISSION_DENIED: 1003,
    DATA_NOT_FOUND: 1004,
    VALIDATION_ERROR: 1005
  },
  
  // 消息类型
  MESSAGE_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  }
};

module.exports = CONSTANTS;