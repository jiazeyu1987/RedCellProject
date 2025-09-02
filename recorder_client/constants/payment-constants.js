/**
 * 付款管理相关常量定义
 * @description 定义付款状态、支付方式、交易类型等常量
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

// 付款状态枚举
const PAYMENT_STATUS = {
  PENDING: 'pending',           // 待付款
  PROCESSING: 'processing',     // 处理中
  COMPLETED: 'completed',       // 已完成
  FAILED: 'failed',            // 支付失败
  CANCELLED: 'cancelled',       // 已取消
  REFUNDING: 'refunding',       // 退款中
  REFUNDED: 'refunded',         // 已退款
  OVERDUE: 'overdue',          // 已逾期
  SUSPENDED: 'suspended'        // 服务暂停
};

// 付款状态显示文本
const PAYMENT_STATUS_TEXT = {
  [PAYMENT_STATUS.PENDING]: '待付款',
  [PAYMENT_STATUS.PROCESSING]: '处理中',
  [PAYMENT_STATUS.COMPLETED]: '已完成',
  [PAYMENT_STATUS.FAILED]: '支付失败',
  [PAYMENT_STATUS.CANCELLED]: '已取消',
  [PAYMENT_STATUS.REFUNDING]: '退款中',
  [PAYMENT_STATUS.REFUNDED]: '已退款',
  [PAYMENT_STATUS.OVERDUE]: '已逾期',
  [PAYMENT_STATUS.SUSPENDED]: '服务暂停'
};

// 付款状态颜色配置
const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.PENDING]: '#FF9500',
  [PAYMENT_STATUS.PROCESSING]: '#007AFF',
  [PAYMENT_STATUS.COMPLETED]: '#34C759',
  [PAYMENT_STATUS.FAILED]: '#FF3B30',
  [PAYMENT_STATUS.CANCELLED]: '#8E8E93',
  [PAYMENT_STATUS.REFUNDING]: '#AF52DE',
  [PAYMENT_STATUS.REFUNDED]: '#5856D6',
  [PAYMENT_STATUS.OVERDUE]: '#FF2D92',
  [PAYMENT_STATUS.SUSPENDED]: '#FF6B22'
};

// 支付方式枚举
const PAYMENT_METHODS = {
  WECHAT: 'wechat',            // 微信支付
  ALIPAY: 'alipay',           // 支付宝
  BANK_CARD: 'bank_card',      // 银行卡
  CASH: 'cash',               // 现金
  POINTS: 'points',           // 积分支付
  BALANCE: 'balance'          // 余额支付
};

// 支付方式显示文本
const PAYMENT_METHOD_TEXT = {
  [PAYMENT_METHODS.WECHAT]: '微信支付',
  [PAYMENT_METHODS.ALIPAY]: '支付宝',
  [PAYMENT_METHODS.BANK_CARD]: '银行卡',
  [PAYMENT_METHODS.CASH]: '现金',
  [PAYMENT_METHODS.POINTS]: '积分支付',
  [PAYMENT_METHODS.BALANCE]: '余额支付'
};

// 交易类型枚举
const TRANSACTION_TYPES = {
  SERVICE_FEE: 'service_fee',        // 服务费
  SUBSCRIPTION: 'subscription',       // 订阅费
  CONSULTATION: 'consultation',       // 咨询费
  MEDICINE: 'medicine',              // 药品费
  EXAMINATION: 'examination',        // 检查费
  REGISTRATION: 'registration',      // 挂号费
  OTHER: 'other'                     // 其他费用
};

// 交易类型显示文本
const TRANSACTION_TYPE_TEXT = {
  [TRANSACTION_TYPES.SERVICE_FEE]: '服务费',
  [TRANSACTION_TYPES.SUBSCRIPTION]: '订阅费',
  [TRANSACTION_TYPES.CONSULTATION]: '咨询费',
  [TRANSACTION_TYPES.MEDICINE]: '药品费',
  [TRANSACTION_TYPES.EXAMINATION]: '检查费',
  [TRANSACTION_TYPES.REGISTRATION]: '挂号费',
  [TRANSACTION_TYPES.OTHER]: '其他费用'
};

// 退款类型枚举
const REFUND_TYPES = {
  FULL: 'full',                // 全额退款
  PARTIAL: 'partial',          // 部分退款
  SERVICE_CANCEL: 'service_cancel',  // 服务取消退款
  SYSTEM_ERROR: 'system_error',      // 系统错误退款
  USER_REQUEST: 'user_request'       // 用户申请退款
};

// 退款类型显示文本
const REFUND_TYPE_TEXT = {
  [REFUND_TYPES.FULL]: '全额退款',
  [REFUND_TYPES.PARTIAL]: '部分退款',
  [REFUND_TYPES.SERVICE_CANCEL]: '服务取消退款',
  [REFUND_TYPES.SYSTEM_ERROR]: '系统错误退款',
  [REFUND_TYPES.USER_REQUEST]: '用户申请退款'
};

// 催缴类型枚举
const REMINDER_TYPES = {
  SMS: 'sms',                  // 短信催缴
  WECHAT: 'wechat',           // 微信催缴
  PHONE: 'phone',             // 电话催缴
  EMAIL: 'email',             // 邮件催缴
  PUSH: 'push'                // 推送催缴
};

// 催缴类型显示文本
const REMINDER_TYPE_TEXT = {
  [REMINDER_TYPES.SMS]: '短信催缴',
  [REMINDER_TYPES.WECHAT]: '微信催缴',
  [REMINDER_TYPES.PHONE]: '电话催缴',
  [REMINDER_TYPES.EMAIL]: '邮件催缴',
  [REMINDER_TYPES.PUSH]: '推送催缴'
};

// 付款异常类型
const PAYMENT_EXCEPTION_TYPES = {
  NETWORK_ERROR: 'network_error',      // 网络错误
  TIMEOUT: 'timeout',                  // 超时
  INSUFFICIENT_BALANCE: 'insufficient_balance',  // 余额不足
  ACCOUNT_FROZEN: 'account_frozen',    // 账户冻结
  INVALID_ACCOUNT: 'invalid_account',  // 无效账户
  SYSTEM_MAINTENANCE: 'system_maintenance',  // 系统维护
  UNKNOWN_ERROR: 'unknown_error'       // 未知错误
};

// 付款异常类型显示文本
const PAYMENT_EXCEPTION_TEXT = {
  [PAYMENT_EXCEPTION_TYPES.NETWORK_ERROR]: '网络错误',
  [PAYMENT_EXCEPTION_TYPES.TIMEOUT]: '支付超时',
  [PAYMENT_EXCEPTION_TYPES.INSUFFICIENT_BALANCE]: '余额不足',
  [PAYMENT_EXCEPTION_TYPES.ACCOUNT_FROZEN]: '账户冻结',
  [PAYMENT_EXCEPTION_TYPES.INVALID_ACCOUNT]: '无效账户',
  [PAYMENT_EXCEPTION_TYPES.SYSTEM_MAINTENANCE]: '系统维护',
  [PAYMENT_EXCEPTION_TYPES.UNKNOWN_ERROR]: '未知错误'
};

// 状态流转规则
const STATUS_FLOW_RULES = {
  [PAYMENT_STATUS.PENDING]: [
    PAYMENT_STATUS.PROCESSING,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.OVERDUE
  ],
  [PAYMENT_STATUS.PROCESSING]: [
    PAYMENT_STATUS.COMPLETED,
    PAYMENT_STATUS.FAILED
  ],
  [PAYMENT_STATUS.COMPLETED]: [
    PAYMENT_STATUS.REFUNDING
  ],
  [PAYMENT_STATUS.FAILED]: [
    PAYMENT_STATUS.PENDING,
    PAYMENT_STATUS.CANCELLED
  ],
  [PAYMENT_STATUS.CANCELLED]: [],
  [PAYMENT_STATUS.REFUNDING]: [
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.COMPLETED
  ],
  [PAYMENT_STATUS.REFUNDED]: [],
  [PAYMENT_STATUS.OVERDUE]: [
    PAYMENT_STATUS.SUSPENDED,
    PAYMENT_STATUS.PROCESSING
  ],
  [PAYMENT_STATUS.SUSPENDED]: [
    PAYMENT_STATUS.PROCESSING
  ]
};

// 默认配置
const PAYMENT_CONFIG = {
  // 超时设置
  PAYMENT_TIMEOUT: 15 * 60 * 1000,     // 15分钟
  
  // 逾期设置
  OVERDUE_DAYS: 7,                     // 7天后标记为逾期
  
  // 催缴设置
  REMINDER_INTERVALS: [1, 3, 7],       // 逾期1、3、7天后发送催缴
  
  // 服务暂停设置
  SUSPENSION_OVERDUE_DAYS: 15,         // 逾期15天后暂停服务
  
  // 分页设置
  PAGE_SIZE: 20,
  
  // 金额范围
  MIN_AMOUNT: 0.01,                    // 最小金额
  MAX_AMOUNT: 99999.99                 // 最大金额
};

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_STATUS_TEXT,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_TEXT,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_TEXT,
  REFUND_TYPES,
  REFUND_TYPE_TEXT,
  REMINDER_TYPES,
  REMINDER_TYPE_TEXT,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_EXCEPTION_TEXT,
  STATUS_FLOW_RULES,
  PAYMENT_CONFIG
};