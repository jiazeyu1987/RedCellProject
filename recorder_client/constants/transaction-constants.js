/**
 * 批量事务常量定义
 */

// 事务状态
export const TRANSACTION_STATUS = {
  PENDING: 'pending',           // 等待中
  RUNNING: 'running',          // 执行中
  COMMITTED: 'committed',      // 已提交
  ROLLED_BACK: 'rolled_back',  // 已回滚
  ROLLING_BACK: 'rolling_back', // 回滚中
  FAILED: 'failed',            // 失败
  TIMEOUT: 'timeout'           // 超时
};

// 事务类型
export const TRANSACTION_TYPE = {
  TIME_ADJUSTMENT: 'time_adjustment',      // 时间调整
  BATCH_UPDATE: 'batch_update',           // 批量更新
  DATA_MIGRATION: 'data_migration',       // 数据迁移
  BULK_OPERATION: 'bulk_operation',       // 批量操作
  CASCADE_UPDATE: 'cascade_update'        // 级联更新
};

// 操作类型
export const OPERATION_TYPE = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',
  MODIFY: 'modify'
};

// 事务隔离级别
export const ISOLATION_LEVEL = {
  READ_UNCOMMITTED: 'read_uncommitted',
  READ_COMMITTED: 'read_committed',
  REPEATABLE_READ: 'repeatable_read',
  SERIALIZABLE: 'serializable'
};

// 回滚策略
export const ROLLBACK_STRATEGY = {
  IMMEDIATE: 'immediate',       // 立即回滚
  PARTIAL: 'partial',          // 部分回滚
  CASCADE: 'cascade',          // 级联回滚
  COMPENSATING: 'compensating' // 补偿回滚
};

// 快照类型
export const SNAPSHOT_TYPE = {
  FULL: 'full',                // 完整快照
  INCREMENTAL: 'incremental',  // 增量快照
  DIFFERENTIAL: 'differential' // 差异快照
};

// 锁类型
export const LOCK_TYPE = {
  SHARED: 'shared',            // 共享锁
  EXCLUSIVE: 'exclusive',      // 排他锁
  UPDATE: 'update',            // 更新锁
  INTENT: 'intent'             // 意向锁
};

// 事务优先级
export const TRANSACTION_PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4
};

// 事务阶段
export const TRANSACTION_PHASE = {
  INIT: 'init',
  PREPARE: 'prepare',
  COMMIT: 'commit',
  ABORT: 'abort',
  CLEANUP: 'cleanup'
};

// 错误代码
export const TRANSACTION_ERROR_CODE = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  LOCK_TIMEOUT: 'LOCK_TIMEOUT',
  CONFLICT_DETECTED: 'CONFLICT_DETECTED',
  RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED',
  COMMIT_FAILED: 'COMMIT_FAILED',
  TIMEOUT: 'TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
};