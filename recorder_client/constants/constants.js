// 应用常量定义
const CONSTANTS = {
  // 页面路径
  PAGES: {
    LOGIN: '/pages/login/login',
    HOME: '/pages/index/index',
    SCHEDULE: '/pages/schedule/schedule',
    SCHEDULE_DETAIL: '/pages/schedule-detail/schedule-detail',
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
  },

  // 日程状态
  SCHEDULE_STATUS: {
    PENDING: 'pending',        // 待服务
    CONFIRMED: 'confirmed',    // 已确认
    IN_PROGRESS: 'in_progress', // 服务中
    COMPLETED: 'completed',    // 已完成
    CANCELLED: 'cancelled',    // 已取消
    RESCHEDULED: 'rescheduled', // 已改期
    NO_SHOW: 'no_show',       // 患者不在家
    OVERDUE: 'overdue'        // 已逾期
  },

  // 日程类型
  SCHEDULE_TYPES: {
    REGULAR: 'regular',        // 常规服务
    EMERGENCY: 'emergency',    // 紧急服务
    FOLLOW_UP: 'follow_up',    // 复诊服务
    INITIAL: 'initial',       // 初诊服务
    CONSULTATION: 'consultation' // 咨询服务
  },

  // 服务优先级
  PRIORITY_LEVELS: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  },

  // 日程筛选类型
  FILTER_TYPES: {
    ALL: 'all',
    TODAY: 'today',
    TOMORROW: 'tomorrow',
    THIS_WEEK: 'this_week',
    NEXT_WEEK: 'next_week',
    OVERDUE: 'overdue'
  },

  // 排序类型
  SORT_TYPES: {
    TIME_ASC: 'time_asc',      // 时间升序（最近优先）
    TIME_DESC: 'time_desc',    // 时间降序（最远优先）
    PRIORITY_ASC: 'priority_asc', // 优先级升序（低到高）
    PRIORITY_DESC: 'priority_desc', // 优先级降序（高到低）
    STATUS_ASC: 'status_asc',  // 状态升序
    STATUS_DESC: 'status_desc', // 状态降序
    PATIENT_NAME_ASC: 'patient_name_asc', // 患者姓名A-Z
    PATIENT_NAME_DESC: 'patient_name_desc', // 患者姓名Z-A
    SERVICE_TYPE_ASC: 'service_type_asc', // 服务类型升序
    SERVICE_TYPE_DESC: 'service_type_desc', // 服务类型降序
    DISTANCE_ASC: 'distance_asc', // 距离升序（最近）
    DISTANCE_DESC: 'distance_desc', // 距离降序（最远）
    CREATE_TIME_ASC: 'create_time_asc', // 创建时间升序
    CREATE_TIME_DESC: 'create_time_desc', // 创建时间降序
    DURATION_ASC: 'duration_asc', // 服务时长升序（短到长）
    DURATION_DESC: 'duration_desc', // 服务时长降序（长到短）
    COST_ASC: 'cost_asc',      // 费用升序（低到高）
    COST_DESC: 'cost_desc'     // 费用降序（高到低）
  },

  // 时间调整操作类型
  TIME_ADJUST_ACTIONS: {
    RESCHEDULE: 'reschedule',  // 改期
    DELAY: 'delay',            // 延时
    ADVANCE: 'advance',        // 提前
    CANCEL: 'cancel'           // 取消
  },

  // 通知类型
  NOTIFICATION_TYPES: {
    SCHEDULE_REMINDER: 'schedule_reminder',     // 日程提醒
    STATUS_CHANGE: 'status_change',            // 状态变更
    TIME_CONFLICT: 'time_conflict',            // 时间冲突
    PATIENT_NOT_HOME: 'patient_not_home',      // 患者不在家
    URGENT_SCHEDULE: 'urgent_schedule',        // 紧急日程
    SYSTEM_MESSAGE: 'system_message'          // 系统消息
  },

  // 批量操作类型
  BATCH_OPERATIONS: {
    RESCHEDULE: 'batch_reschedule',    // 批量改期
    CANCEL: 'batch_cancel',            // 批量取消
    CONFIRM: 'batch_confirm',          // 批量确认
    UPDATE_STATUS: 'batch_update_status' // 批量更新状态
  }
};

// 状态对应的中文显示
CONSTANTS.SCHEDULE_STATUS_TEXT = {
  [CONSTANTS.SCHEDULE_STATUS.PENDING]: '待服务',
  [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: '已确认',
  [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: '服务中',
  [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: '已完成',
  [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: '已取消',
  [CONSTANTS.SCHEDULE_STATUS.RESCHEDULED]: '已改期',
  [CONSTANTS.SCHEDULE_STATUS.NO_SHOW]: '患者不在家',
  [CONSTANTS.SCHEDULE_STATUS.OVERDUE]: '已逾期'
};

// 服务类型对应的中文显示
CONSTANTS.SCHEDULE_TYPES_TEXT = {
  [CONSTANTS.SCHEDULE_TYPES.REGULAR]: '常规服务',
  [CONSTANTS.SCHEDULE_TYPES.EMERGENCY]: '紧急服务',
  [CONSTANTS.SCHEDULE_TYPES.FOLLOW_UP]: '复诊服务',
  [CONSTANTS.SCHEDULE_TYPES.INITIAL]: '初诊服务',
  [CONSTANTS.SCHEDULE_TYPES.CONSULTATION]: '咨询服务'
};

// 优先级对应的中文显示
CONSTANTS.PRIORITY_LEVELS_TEXT = {
  [CONSTANTS.PRIORITY_LEVELS.LOW]: '低',
  [CONSTANTS.PRIORITY_LEVELS.NORMAL]: '普通',
  [CONSTANTS.PRIORITY_LEVELS.HIGH]: '高',
  [CONSTANTS.PRIORITY_LEVELS.URGENT]: '紧急'
};

// 排序类型对应的中文显示
CONSTANTS.SORT_TYPES_TEXT = {
  [CONSTANTS.SORT_TYPES.TIME_ASC]: '时间升序(最近优先)',
  [CONSTANTS.SORT_TYPES.TIME_DESC]: '时间降序(最远优先)',
  [CONSTANTS.SORT_TYPES.PRIORITY_ASC]: '优先级升序(低到高)',
  [CONSTANTS.SORT_TYPES.PRIORITY_DESC]: '优先级降序(高到低)',
  [CONSTANTS.SORT_TYPES.STATUS_ASC]: '状态升序',
  [CONSTANTS.SORT_TYPES.STATUS_DESC]: '状态降序',
  [CONSTANTS.SORT_TYPES.PATIENT_NAME_ASC]: '患者姓名A-Z',
  [CONSTANTS.SORT_TYPES.PATIENT_NAME_DESC]: '患者姓名Z-A',
  [CONSTANTS.SORT_TYPES.SERVICE_TYPE_ASC]: '服务类型升序',
  [CONSTANTS.SORT_TYPES.SERVICE_TYPE_DESC]: '服务类型降序',
  [CONSTANTS.SORT_TYPES.DISTANCE_ASC]: '距离升序(最近)',
  [CONSTANTS.SORT_TYPES.DISTANCE_DESC]: '距离降序(最远)',
  [CONSTANTS.SORT_TYPES.CREATE_TIME_ASC]: '创建时间升序',
  [CONSTANTS.SORT_TYPES.CREATE_TIME_DESC]: '创建时间降序',
  [CONSTANTS.SORT_TYPES.DURATION_ASC]: '服务时长升序',
  [CONSTANTS.SORT_TYPES.DURATION_DESC]: '服务时长降序',
  [CONSTANTS.SORT_TYPES.COST_ASC]: '费用升序',
  [CONSTANTS.SORT_TYPES.COST_DESC]: '费用降序'
};

module.exports = CONSTANTS;