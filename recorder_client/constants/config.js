// 全局配置文件

// 环境配置
const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production'
};

// 当前环境（开发时设为development，发布时改为production）
const CURRENT_ENV = ENV.DEVELOPMENT;

// API配置
const API_CONFIG = {
  [ENV.DEVELOPMENT]: {
    BASE_URL: 'https://mock-api.recorder.com', // 开发环境使用mock服务器
    USE_MOCK: true, // 是否使用模拟数据
  },
  [ENV.PRODUCTION]: {
    BASE_URL: 'https://api.recorder.com', // 生产环境真实服务器
    USE_MOCK: false,
  }
};

const CONFIG = {
  // 环境相关
  ENV,
  CURRENT_ENV,
  
  // API配置
  API_BASE_URL: API_CONFIG[CURRENT_ENV].BASE_URL,
  USE_MOCK_DATA: API_CONFIG[CURRENT_ENV].USE_MOCK,
  API_TIMEOUT: 10000,
  
  // 版本信息
  APP_VERSION: '1.0.0',
  
  // 本地存储键名
  STORAGE_KEYS: {
    USER_INFO: 'userInfo',
    TOKEN: 'token',
    ROLE: 'userRole',
    SETTINGS: 'appSettings'
  },
  
  // 用户角色
  USER_ROLES: {
    RECORDER: 'recorder',  // 记录员
    ADMIN: 'admin'         // 管理员
  },
  
  // 服务状态
  SERVICE_STATUS: {
    PENDING: 'pending',     // 待执行
    IN_PROGRESS: 'in_progress', // 进行中
    COMPLETED: 'completed', // 已完成
    CANCELLED: 'cancelled'  // 已取消
  },
  
  // 支付状态
  PAYMENT_STATUS: {
    UNPAID: 'unpaid',       // 未付款
    PAID: 'paid',           // 已付款
    OVERDUE: 'overdue',     // 逾期
    REFUNDED: 'refunded'    // 已退款
  }
};

module.exports = CONFIG;