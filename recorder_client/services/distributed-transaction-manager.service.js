/**
 * 分布式事务管理器
 * 实现跨多个服务的分布式事务协调和管理
 */

import { batchTransactionService, TRANSACTION_STATUS } from './batch-transaction.service.js';

// 分布式事务协议
export const DISTRIBUTED_TRANSACTION_PROTOCOL = {
  TWO_PHASE_COMMIT: '2pc',          // 两阶段提交
  SAGA: 'saga',                     // Saga模式
  TCC: 'tcc'                        // Try-Confirm-Cancel
};

// 参与者状态
export const PARTICIPANT_STATUS = {
  PREPARING: 'preparing',           // 准备中
  PREPARED: 'prepared',            // 已准备
  COMMITTED: 'committed',          // 已提交
  ABORTED: 'aborted',             // 已中止
  FAILED: 'failed'                // 失败
};

class DistributedTransactionManager {
  constructor() {
    this.config = {
      coordinatorTimeout: 60000,        // 协调器超时时间
      participantTimeout: 30000,        // 参与者超时时间
      maxRetries: 3,                   // 最大重试次数
      heartbeatInterval: 5000          // 心跳间隔
    };
    
    // 分布式事务注册表
    this.distributedTransactions = new Map();
    
    // 参与者注册表
    this.participants = new Map();
    
    // 预写日志
    this.writeAheadLog = [];
    
    // 开始心跳
    this.startHeartbeat();
  }

  /**
   * 注册事务参与者
   * @param {string} participantId - 参与者ID
   * @param {Object} participantConfig - 参与者配置
   */
  registerParticipant(participantId, participantConfig) {
    console.log(`[DistributedTransaction] 注册参与者: ${participantId}`);
    
    const participant = {
      id: participantId,
      name: participantConfig.name || participantId,
      endpoint: participantConfig.endpoint,
      protocol: participantConfig.protocol || DISTRIBUTED_TRANSACTION_PROTOCOL.TWO_PHASE_COMMIT,
      
      // 状态信息
      status: 'active',
      lastHeartbeat: Date.now(),
      currentTransactions: new Set(),
      
      // 操作接口
      prepare: participantConfig.prepare,
      commit: participantConfig.commit,
      abort: participantConfig.abort
    };
    
    this.participants.set(participantId, participant);
    this.logWAL('PARTICIPANT_REGISTERED', { participantId });
  }

  /**
   * 开始分布式事务
   * @param {string} transactionType - 事务类型
   * @param {Array} items - 操作项目
   * @param {Array} participantIds - 参与者ID列表
   * @param {Object} options - 事务选项
   * @returns {Promise<Object>} 分布式事务对象
   */
  async beginDistributedTransaction(transactionType, items, participantIds, options = {}) {
    const distributedTxId = this.generateDistributedTransactionId();
    
    try {
      console.log(`[DistributedTransaction] 开始分布式事务 ${distributedTxId}`);
      
      // 验证参与者
      this.validateParticipants(participantIds);
      
      // 创建分布式事务对象
      const distributedTransaction = {
        id: distributedTxId,
        type: transactionType,
        status: TRANSACTION_STATUS.PENDING,
        protocol: options.protocol || DISTRIBUTED_TRANSACTION_PROTOCOL.TWO_PHASE_COMMIT,
        
        // 时间信息
        startTime: Date.now(),
        endTime: null,
        timeout: options.timeout || this.config.coordinatorTimeout,
        
        // 参与者信息
        participants: participantIds.map(id => ({
          id,
          status: PARTICIPANT_STATUS.PREPARING,
          localTransactionId: null,
          lastUpdate: Date.now()
        })),
        
        // 操作数据
        items: [...items],
        options: { ...options },
        
        // 执行结果
        results: [],
        errors: [],
        
        // 状态跟踪
        phase: 'prepare',
        retryCount: 0
      };
      
      // 记录到WAL
      this.logWAL('DISTRIBUTED_TRANSACTION_STARTED', {
        distributedTxId,
        type: transactionType,
        participants: participantIds
      });
      
      // 注册分布式事务
      this.distributedTransactions.set(distributedTxId, distributedTransaction);
      
      // 设置超时处理
      this.setupDistributedTransactionTimeout(distributedTransaction);
      
      return distributedTransaction;
      
    } catch (error) {
      console.error(`[DistributedTransaction] 创建分布式事务失败:`, error);
      throw new Error(`分布式事务创建失败: ${error.message}`);
    }
  }

  /**
   * 执行分布式事务 - 两阶段提交
   * @param {Object} distributedTransaction - 分布式事务对象
   * @param {Function} operationCallback - 操作回调
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<Object>} 执行结果
   */
  async executeDistributedTransaction2PC(distributedTransaction, operationCallback, progressCallback) {
    const { id } = distributedTransaction;
    
    try {
      console.log(`[DistributedTransaction] 执行2PC事务 ${id}`);
      
      distributedTransaction.status = TRANSACTION_STATUS.RUNNING;
      this.logWAL('2PC_EXECUTION_STARTED', { distributedTxId: id });
      
      // 阶段1: Prepare Phase
      const prepareResult = await this.executePreparePhase(distributedTransaction, operationCallback, progressCallback);
      
      if (!prepareResult.success) {
        await this.executeAbortPhase(distributedTransaction);
        throw new Error(`Prepare阶段失败: ${prepareResult.error}`);
      }
      
      // 阶段2: Commit Phase
      const commitResult = await this.executeCommitPhase(distributedTransaction);
      
      if (!commitResult.success) {
        await this.executeAbortPhase(distributedTransaction);
        throw new Error(`Commit阶段失败: ${commitResult.error}`);
      }
      
      // 事务成功完成
      distributedTransaction.status = TRANSACTION_STATUS.COMMITTED;
      distributedTransaction.endTime = Date.now();
      
      this.logWAL('2PC_EXECUTION_COMPLETED', { distributedTxId: id });
      
      // 清理
      await this.cleanupDistributedTransaction(distributedTransaction);
      
      return {
        success: true,
        distributedTransactionId: id,
        results: distributedTransaction.results
      };
      
    } catch (error) {
      console.error(`[DistributedTransaction] 2PC事务 ${id} 执行失败:`, error);
      distributedTransaction.status = TRANSACTION_STATUS.FAILED;
      throw error;
    }
  }

  /**
   * 执行Prepare阶段
   * @param {Object} distributedTransaction - 分布式事务
   * @param {Function} operationCallback - 操作回调
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<Object>} 执行结果
   */
  async executePreparePhase(distributedTransaction, operationCallback, progressCallback) {
    const { id, participants } = distributedTransaction;
    console.log(`[DistributedTransaction] 执行Prepare阶段, 事务: ${id}`);
    
    distributedTransaction.phase = 'prepare';
    const prepareResults = [];
    
    // 并行向所有参与者发送Prepare请求
    const preparePromises = participants.map(async (participant) => {
      try {
        const participantService = this.participants.get(participant.id);
        
        if (!participantService) {
          throw new Error(`参与者不存在: ${participant.id}`);
        }
        
        // 调用参与者的prepare方法
        const result = await this.callParticipantPrepare(
          participantService, 
          distributedTransaction, 
          operationCallback
        );
        
        participant.status = PARTICIPANT_STATUS.PREPARED;
        participant.lastUpdate = Date.now();
        
        prepareResults.push({ participant: participant.id, success: true, result });
        return { success: true, participant: participant.id, result };
        
      } catch (error) {
        participant.status = PARTICIPANT_STATUS.FAILED;
        participant.error = error.message;
        
        prepareResults.push({ participant: participant.id, success: false, error: error.message });
        return { success: false, participant: participant.id, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(preparePromises);
    
    // 检查是否所有参与者都准备成功
    const allPrepared = results.every(result => 
      result.status === 'fulfilled' && result.value.success
    );
    
    distributedTransaction.prepareResults = prepareResults;
    
    this.logWAL('PREPARE_PHASE_COMPLETED', {
      distributedTxId: id,
      allPrepared,
      results: prepareResults
    });
    
    return {
      success: allPrepared,
      error: allPrepared ? null : '部分参与者prepare失败',
      results: prepareResults
    };
  }

  /**
   * 执行Commit阶段
   * @param {Object} distributedTransaction - 分布式事务
   * @returns {Promise<Object>} 执行结果
   */
  async executeCommitPhase(distributedTransaction) {
    const { id, participants } = distributedTransaction;
    console.log(`[DistributedTransaction] 执行Commit阶段, 事务: ${id}`);
    
    distributedTransaction.phase = 'commit';
    const commitResults = [];
    
    // 并行向所有参与者发送Commit请求
    const commitPromises = participants.map(async (participant) => {
      try {
        const participantService = this.participants.get(participant.id);
        
        await this.callParticipantCommit(participantService, distributedTransaction);
        
        participant.status = PARTICIPANT_STATUS.COMMITTED;
        participant.lastUpdate = Date.now();
        
        commitResults.push({ participant: participant.id, success: true });
        return { success: true, participant: participant.id };
        
      } catch (error) {
        participant.status = PARTICIPANT_STATUS.FAILED;
        participant.error = error.message;
        
        commitResults.push({ participant: participant.id, success: false, error: error.message });
        return { success: false, participant: participant.id, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(commitPromises);
    
    const allCommitted = results.every(result => 
      result.status === 'fulfilled' && result.value.success
    );
    
    distributedTransaction.commitResults = commitResults;
    
    this.logWAL('COMMIT_PHASE_COMPLETED', {
      distributedTxId: id,
      allCommitted,
      results: commitResults
    });
    
    return {
      success: allCommitted,
      error: allCommitted ? null : '部分参与者commit失败',
      results: commitResults
    };
  }

  /**
   * 执行Abort阶段
   * @param {Object} distributedTransaction - 分布式事务
   * @returns {Promise<void>}
   */
  async executeAbortPhase(distributedTransaction) {
    const { id, participants } = distributedTransaction;
    console.log(`[DistributedTransaction] 执行Abort阶段, 事务: ${id}`);
    
    distributedTransaction.phase = 'abort';
    distributedTransaction.status = TRANSACTION_STATUS.ROLLING_BACK;
    
    // 并行向所有参与者发送Abort请求
    const abortPromises = participants.map(async (participant) => {
      try {
        const participantService = this.participants.get(participant.id);
        
        if (participantService && participant.status === PARTICIPANT_STATUS.PREPARED) {
          await this.callParticipantAbort(participantService, distributedTransaction);
        }
        
        participant.status = PARTICIPANT_STATUS.ABORTED;
        participant.lastUpdate = Date.now();
        
      } catch (error) {
        console.error(`[DistributedTransaction] 参与者 ${participant.id} abort失败:`, error);
        participant.status = PARTICIPANT_STATUS.FAILED;
        participant.error = error.message;
      }
    });
    
    await Promise.allSettled(abortPromises);
    
    distributedTransaction.status = TRANSACTION_STATUS.ROLLED_BACK;
    distributedTransaction.endTime = Date.now();
    
    this.logWAL('ABORT_PHASE_COMPLETED', { distributedTxId: id });
  }

  // ===== 参与者调用方法 =====

  /**
   * 调用参与者Prepare方法
   */
  async callParticipantPrepare(participant, distributedTransaction, operationCallback) {
    if (typeof participant.prepare === 'function') {
      return await participant.prepare(distributedTransaction, operationCallback);
    } else {
      return await this.defaultPrepare(participant, distributedTransaction, operationCallback);
    }
  }

  /**
   * 调用参与者Commit方法
   */
  async callParticipantCommit(participant, distributedTransaction) {
    if (typeof participant.commit === 'function') {
      return await participant.commit(distributedTransaction);
    } else {
      return await this.defaultCommit(participant, distributedTransaction);
    }
  }

  /**
   * 调用参与者Abort方法
   */
  async callParticipantAbort(participant, distributedTransaction) {
    if (typeof participant.abort === 'function') {
      return await participant.abort(distributedTransaction);
    } else {
      return await this.defaultAbort(participant, distributedTransaction);
    }
  }

  // ===== 默认实现方法 =====

  async defaultPrepare(participant, distributedTransaction, operationCallback) {
    // 为参与者创建本地事务
    const localTransaction = await batchTransactionService.beginTransaction(
      distributedTransaction.type,
      distributedTransaction.items,
      { 
        distributedTransactionId: distributedTransaction.id,
        participantId: participant.id
      }
    );
    
    // 记录本地事务ID
    const participantInfo = distributedTransaction.participants.find(p => p.id === participant.id);
    if (participantInfo) {
      participantInfo.localTransactionId = localTransaction.id;
    }
    
    // 执行本地事务准备
    await batchTransactionService.executeTransaction(localTransaction, operationCallback);
    
    return { localTransactionId: localTransaction.id };
  }

  async defaultCommit(participant, distributedTransaction) {
    const participantInfo = distributedTransaction.participants.find(p => p.id === participant.id);
    
    if (participantInfo && participantInfo.localTransactionId) {
      const localTransaction = batchTransactionService.activeTransactions.get(participantInfo.localTransactionId);
      
      if (localTransaction) {
        await batchTransactionService.commitTransaction(localTransaction);
      }
    }
    
    return { success: true };
  }

  async defaultAbort(participant, distributedTransaction) {
    const participantInfo = distributedTransaction.participants.find(p => p.id === participant.id);
    
    if (participantInfo && participantInfo.localTransactionId) {
      await batchTransactionService.abortTransaction(
        participantInfo.localTransactionId, 
        '分布式事务中止'
      );
    }
    
    return { success: true };
  }

  // ===== 工具方法 =====

  generateDistributedTransactionId() {
    return `dtx_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  validateParticipants(participantIds) {
    for (const id of participantIds) {
      if (!this.participants.has(id)) {
        throw new Error(`参与者不存在: ${id}`);
      }
      
      const participant = this.participants.get(id);
      if (participant.status !== 'active') {
        throw new Error(`参与者状态异常: ${id} - ${participant.status}`);
      }
    }
  }

  setupDistributedTransactionTimeout(distributedTransaction) {
    setTimeout(async () => {
      if (this.distributedTransactions.has(distributedTransaction.id) && 
          distributedTransaction.status === TRANSACTION_STATUS.RUNNING) {
        
        console.warn(`[DistributedTransaction] 事务 ${distributedTransaction.id} 超时`);
        
        try {
          await this.executeAbortPhase(distributedTransaction);
        } catch (error) {
          console.error(`[DistributedTransaction] 超时中止事务失败:`, error);
        }
      }
    }, distributedTransaction.timeout);
  }

  async cleanupDistributedTransaction(distributedTransaction) {
    const { id } = distributedTransaction;
    
    // 从注册表中移除
    this.distributedTransactions.delete(id);
    
    // 清理参与者的当前事务记录
    distributedTransaction.participants.forEach(participant => {
      const participantService = this.participants.get(participant.id);
      if (participantService) {
        participantService.currentTransactions.delete(id);
      }
    });
    
    this.logWAL('DISTRIBUTED_TRANSACTION_CLEANED', { distributedTxId: id });
  }

  startHeartbeat() {
    setInterval(() => {
      // 检查参与者心跳
      this.checkParticipantHeartbeats();
    }, this.config.heartbeatInterval);
  }

  checkParticipantHeartbeats() {
    const now = Date.now();
    const heartbeatTimeout = this.config.heartbeatInterval * 3;
    
    for (const [participantId, participant] of this.participants) {
      if (now - participant.lastHeartbeat > heartbeatTimeout) {
        console.warn(`[DistributedTransaction] 参与者 ${participantId} 心跳超时`);
        participant.status = 'inactive';
      }
    }
  }

  logWAL(event, data) {
    const logEntry = {
      timestamp: Date.now(),
      event,
      data: { ...data }
    };
    
    this.writeAheadLog.push(logEntry);
    
    // 限制日志大小
    if (this.writeAheadLog.length > 1000) {
      this.writeAheadLog = this.writeAheadLog.slice(-500);
    }
  }

  /**
   * 获取分布式事务状态
   * @param {string} distributedTransactionId - 分布式事务ID
   * @returns {Object|null} 事务状态信息
   */
  getDistributedTransactionStatus(distributedTransactionId) {
    const transaction = this.distributedTransactions.get(distributedTransactionId);
    
    if (!transaction) {
      return null;
    }
    
    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      phase: transaction.phase,
      participants: transaction.participants.map(p => ({
        id: p.id,
        status: p.status,
        lastUpdate: p.lastUpdate
      })),
      startTime: transaction.startTime,
      endTime: transaction.endTime
    };
  }

  /**
   * 获取所有活跃分布式事务
   * @returns {Array} 活跃事务列表
   */
  getActiveDistributedTransactions() {
    return Array.from(this.distributedTransactions.values()).map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      phase: transaction.phase,
      participantCount: transaction.participants.length,
      startTime: transaction.startTime
    }));
  }
}

// 导出服务实例
export default DistributedTransactionManager;
export const distributedTransactionManager = new DistributedTransactionManager();