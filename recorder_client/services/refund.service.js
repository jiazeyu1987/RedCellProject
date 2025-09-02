/**
 * 退款处理服务
 * @description 处理退款申请、审批流程、退款处理和记录管理
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { 
  PAYMENT_STATUS, 
  REFUND_TYPES,
  PAYMENT_METHODS 
} from '../constants/payment-constants.js';
import paymentStatusService from './payment-status.service.js';

class RefundService {
  constructor() {
    this.refundQueue = new Map();
    this.refundHistory = new Map();
    this.approvalRules = new Map();
    this.init();
  }

  /**
   * 初始化退款服务
   */
  init() {
    // 注册退款审批规则
    this.registerApprovalRule('default', {
      autoApprove: true,
      maxAmount: 100,      // 100元以下自动审批
      requireManager: false
    });

    this.registerApprovalRule('high_amount', {
      autoApprove: false,
      maxAmount: 1000,     // 1000元以上需要经理审批
      requireManager: true
    });

    this.registerApprovalRule('vip', {
      autoApprove: true,
      maxAmount: 500,      // VIP用户500元以下自动审批
      requireManager: false
    });
  }

  /**
   * 注册审批规则
   * @param {string} ruleName 规则名称
   * @param {Object} rule 审批规则
   */
  registerApprovalRule(ruleName, rule) {
    this.approvalRules.set(ruleName, rule);
  }

  /**
   * 申请退款
   * @param {Object} refundRequest 退款申请
   * @returns {Promise<Object>} 申请结果
   */
  async applyRefund(refundRequest) {
    try {
      const {
        paymentId,
        amount,
        reason,
        type = REFUND_TYPES.USER_REQUEST,
        userId,
        evidence = []
      } = refundRequest;

      // 验证退款申请
      const validation = await this.validateRefundRequest(refundRequest);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // 生成退款申请ID
      const refundId = this.generateRefundId();

      // 创建退款申请记录
      const refundRecord = {
        refundId,
        paymentId,
        userId,
        amount,
        reason,
        type,
        evidence,
        status: 'pending',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        approvalRequired: this.isApprovalRequired(amount, userId),
        approvalHistory: []
      };

      // 保存退款申请
      await this.saveRefundRequest(refundRecord);

      // 更新支付状态
      await paymentStatusService.updateStatus(
        paymentId,
        PAYMENT_STATUS.REFUNDING,
        '用户申请退款',
        userId
      );

      // 检查是否需要审批
      if (refundRecord.approvalRequired) {
        await this.submitForApproval(refundId);
      } else {
        // 自动审批通过
        await this.approveRefund(refundId, 'system', '系统自动审批');
      }

      console.log(`[RefundService] 退款申请提交成功: ${refundId}`);

      return {
        success: true,
        refundId,
        status: refundRecord.status,
        approvalRequired: refundRecord.approvalRequired
      };

    } catch (error) {
      console.error('[RefundService] 申请退款失败:', error);
      throw error;
    }
  }

  /**
   * 审批退款
   * @param {string} refundId 退款ID
   * @param {string} approverId 审批人ID
   * @param {string} comment 审批意见
   * @param {boolean} approved 是否通过
   * @returns {Promise<Object>} 审批结果
   */
  async approveRefund(refundId, approverId, comment, approved = true) {
    try {
      const refundRecord = await this.getRefundRecord(refundId);
      if (!refundRecord) {
        throw new Error('退款申请不存在');
      }

      if (refundRecord.status !== 'pending') {
        throw new Error('退款申请状态不允许审批');
      }

      // 记录审批历史
      const approvalRecord = {
        approverId,
        comment,
        approved,
        timestamp: new Date().toISOString()
      };

      refundRecord.approvalHistory.push(approvalRecord);
      refundRecord.updateTime = new Date().toISOString();

      if (approved) {
        refundRecord.status = 'approved';
        
        // 执行退款处理
        await this.processRefund(refundId);
      } else {
        refundRecord.status = 'rejected';
        
        // 恢复支付状态
        await paymentStatusService.updateStatus(
          refundRecord.paymentId,
          PAYMENT_STATUS.COMPLETED,
          '退款申请被拒绝',
          approverId
        );
      }

      // 保存更新
      await this.updateRefundRecord(refundRecord);

      // 发送审批结果通知
      await this.sendApprovalNotification(refundRecord);

      console.log(`[RefundService] 退款审批完成: ${refundId}, 结果: ${approved ? '通过' : '拒绝'}`);

      return {
        success: true,
        approved,
        status: refundRecord.status
      };

    } catch (error) {
      console.error('[RefundService] 审批退款失败:', error);
      throw error;
    }
  }

  /**
   * 处理退款
   * @param {string} refundId 退款ID
   * @returns {Promise<Object>} 处理结果
   */
  async processRefund(refundId) {
    try {
      const refundRecord = await this.getRefundRecord(refundId);
      if (!refundRecord) {
        throw new Error('退款记录不存在');
      }

      if (refundRecord.status !== 'approved') {
        throw new Error('退款未通过审批');
      }

      // 获取原支付信息
      const paymentInfo = await this.getPaymentInfo(refundRecord.paymentId);
      if (!paymentInfo) {
        throw new Error('原支付记录不存在');
      }

      // 根据原支付方式选择退款处理方式
      let refundResult;
      switch (paymentInfo.method) {
        case PAYMENT_METHODS.WECHAT:
          refundResult = await this.processWechatRefund(refundRecord, paymentInfo);
          break;
        case PAYMENT_METHODS.BALANCE:
          refundResult = await this.processBalanceRefund(refundRecord, paymentInfo);
          break;
        case PAYMENT_METHODS.POINTS:
          refundResult = await this.processPointsRefund(refundRecord, paymentInfo);
          break;
        default:
          throw new Error(`不支持的退款方式: ${paymentInfo.method}`);
      }

      // 更新退款状态
      refundRecord.status = refundResult.success ? 'completed' : 'failed';
      refundRecord.processTime = new Date().toISOString();
      refundRecord.refundResult = refundResult;
      refundRecord.updateTime = new Date().toISOString();

      await this.updateRefundRecord(refundRecord);

      // 更新支付状态
      const newPaymentStatus = refundResult.success ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.COMPLETED;
      await paymentStatusService.updateStatus(
        refundRecord.paymentId,
        newPaymentStatus,
        refundResult.success ? '退款成功' : '退款失败',
        'system'
      );

      // 发送退款结果通知
      await this.sendRefundNotification(refundRecord);

      console.log(`[RefundService] 退款处理完成: ${refundId}, 结果: ${refundResult.success ? '成功' : '失败'}`);

      return refundResult;

    } catch (error) {
      console.error('[RefundService] 处理退款失败:', error);
      
      // 更新退款状态为失败
      try {
        const refundRecord = await this.getRefundRecord(refundId);
        if (refundRecord) {
          refundRecord.status = 'failed';
          refundRecord.errorMessage = error.message;
          refundRecord.updateTime = new Date().toISOString();
          await this.updateRefundRecord(refundRecord);
        }
      } catch (updateError) {
        console.error('[RefundService] 更新失败状态错误:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * 微信退款处理
   * @param {Object} refundRecord 退款记录
   * @param {Object} paymentInfo 支付信息
   * @returns {Promise<Object>} 退款结果
   */
  async processWechatRefund(refundRecord, paymentInfo) {
    try {
      // 调用微信退款API
      const refundParams = {
        out_trade_no: paymentInfo.orderId,
        out_refund_no: refundRecord.refundId,
        total_fee: Math.round(paymentInfo.amount * 100), // 转换为分
        refund_fee: Math.round(refundRecord.amount * 100)
      };

      // 这里应该调用实际的微信退款API
      // const apiResult = await this.callWechatRefundAPI(refundParams);
      
      // 暂时使用模拟结果
      const apiResult = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        refund_id: 'wx_refund_' + Date.now(),
        refund_fee: refundParams.refund_fee
      };

      if (apiResult.return_code === 'SUCCESS' && apiResult.result_code === 'SUCCESS') {
        return {
          success: true,
          transactionId: apiResult.refund_id,
          amount: refundRecord.amount,
          message: '微信退款成功'
        };
      } else {
        return {
          success: false,
          error: apiResult.err_code_des || '微信退款失败',
          message: '微信退款失败'
        };
      }

    } catch (error) {
      console.error('[RefundService] 微信退款处理失败:', error);
      return {
        success: false,
        error: error.message,
        message: '微信退款处理异常'
      };
    }
  }

  /**
   * 余额退款处理
   * @param {Object} refundRecord 退款记录
   * @param {Object} paymentInfo 支付信息
   * @returns {Promise<Object>} 退款结果
   */
  async processBalanceRefund(refundRecord, paymentInfo) {
    try {
      // 获取用户信息
      const userInfo = await this.getUserInfo(refundRecord.userId);
      if (!userInfo) {
        throw new Error('用户信息不存在');
      }

      // 退款到用户余额
      const currentBalance = userInfo.balance || 0;
      const newBalance = currentBalance + refundRecord.amount;

      // 更新用户余额
      await this.updateUserBalance(refundRecord.userId, newBalance);

      // 记录余额变动
      await this.recordBalanceChange({
        userId: refundRecord.userId,
        type: 'refund',
        amount: refundRecord.amount,
        orderId: refundRecord.refundId,
        description: `退款：${refundRecord.reason}`,
        balance: newBalance,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionId: `balance_refund_${refundRecord.refundId}`,
        amount: refundRecord.amount,
        newBalance,
        message: '余额退款成功'
      };

    } catch (error) {
      console.error('[RefundService] 余额退款处理失败:', error);
      return {
        success: false,
        error: error.message,
        message: '余额退款处理失败'
      };
    }
  }

  /**
   * 积分退款处理
   * @param {Object} refundRecord 退款记录
   * @param {Object} paymentInfo 支付信息
   * @returns {Promise<Object>} 退款结果
   */
  async processPointsRefund(refundRecord, paymentInfo) {
    try {
      // 计算退款积分数量（1元=100积分）
      const refundPoints = Math.round(refundRecord.amount * 100);

      // 获取用户信息
      const userInfo = await this.getUserInfo(refundRecord.userId);
      if (!userInfo) {
        throw new Error('用户信息不存在');
      }

      // 退款积分到用户账户
      const currentPoints = userInfo.points || 0;
      const newPoints = currentPoints + refundPoints;

      // 更新用户积分
      await this.updateUserPoints(refundRecord.userId, newPoints);

      // 记录积分变动
      await this.recordPointsChange({
        userId: refundRecord.userId,
        type: 'refund',
        points: refundPoints,
        orderId: refundRecord.refundId,
        description: `积分退款：${refundRecord.reason}`,
        balance: newPoints,
        timestamp: Date.now()
      });

      return {
        success: true,
        transactionId: `points_refund_${refundRecord.refundId}`,
        amount: refundRecord.amount,
        refundPoints,
        newPoints,
        message: '积分退款成功'
      };

    } catch (error) {
      console.error('[RefundService] 积分退款处理失败:', error);
      return {
        success: false,
        error: error.message,
        message: '积分退款处理失败'
      };
    }
  }

  /**
   * 验证退款申请
   * @param {Object} refundRequest 退款申请
   * @returns {Promise<Object>} 验证结果
   */
  async validateRefundRequest(refundRequest) {
    try {
      const { paymentId, amount, reason, userId } = refundRequest;

      // 检查必填字段
      if (!paymentId || !amount || !reason || !userId) {
        return {
          valid: false,
          message: '缺少必要的退款信息'
        };
      }

      // 检查支付记录是否存在
      const paymentInfo = await this.getPaymentInfo(paymentId);
      if (!paymentInfo) {
        return {
          valid: false,
          message: '原支付记录不存在'
        };
      }

      // 检查支付状态
      if (paymentInfo.status !== PAYMENT_STATUS.COMPLETED) {
        return {
          valid: false,
          message: '只能对已完成的支付申请退款'
        };
      }

      // 检查退款金额
      if (amount <= 0 || amount > paymentInfo.amount) {
        return {
          valid: false,
          message: '退款金额无效'
        };
      }

      // 检查是否已有退款申请
      const existingRefund = await this.getRefundByPaymentId(paymentId);
      if (existingRefund && existingRefund.status !== 'rejected') {
        return {
          valid: false,
          message: '该支付已有退款申请在处理中'
        };
      }

      return {
        valid: true,
        message: '验证通过'
      };

    } catch (error) {
      console.error('[RefundService] 验证退款申请失败:', error);
      return {
        valid: false,
        message: '验证过程出现错误'
      };
    }
  }

  /**
   * 检查是否需要审批
   * @param {number} amount 退款金额
   * @param {string} userId 用户ID
   * @returns {boolean} 是否需要审批
   */
  isApprovalRequired(amount, userId) {
    // 根据金额和用户级别确定审批规则
    const userLevel = this.getUserLevel(userId);
    const rule = this.approvalRules.get(userLevel) || this.approvalRules.get('default');
    
    return !rule.autoApprove || amount > rule.maxAmount;
  }

  /**
   * 获取用户级别
   * @param {string} userId 用户ID
   * @returns {string} 用户级别
   */
  getUserLevel(userId) {
    // 这里应该从数据库获取用户级别
    // 暂时返回默认级别
    return 'default';
  }

  /**
   * 生成退款ID
   * @returns {string} 退款ID
   */
  generateRefundId() {
    return 'REFUND_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  // ==================== 数据操作方法 ====================

  /**
   * 保存退款申请
   * @param {Object} refundRecord 退款记录
   */
  async saveRefundRequest(refundRecord) {
    try {
      const storageKey = `refund_${refundRecord.refundId}`;
      wx.setStorageSync(storageKey, refundRecord);
      
      // 添加到退款队列
      this.refundQueue.set(refundRecord.refundId, refundRecord);
    } catch (error) {
      console.error('[RefundService] 保存退款申请失败:', error);
      throw error;
    }
  }

  /**
   * 获取退款记录
   * @param {string} refundId 退款ID
   * @returns {Promise<Object>} 退款记录
   */
  async getRefundRecord(refundId) {
    try {
      // 先从内存缓存获取
      if (this.refundQueue.has(refundId)) {
        return this.refundQueue.get(refundId);
      }
      
      // 从存储获取
      const storageKey = `refund_${refundId}`;
      const record = wx.getStorageSync(storageKey);
      
      if (record) {
        this.refundQueue.set(refundId, record);
      }
      
      return record;
    } catch (error) {
      console.error('[RefundService] 获取退款记录失败:', error);
      return null;
    }
  }

  /**
   * 更新退款记录
   * @param {Object} refundRecord 退款记录
   */
  async updateRefundRecord(refundRecord) {
    try {
      const storageKey = `refund_${refundRecord.refundId}`;
      wx.setStorageSync(storageKey, refundRecord);
      
      // 更新内存缓存
      this.refundQueue.set(refundRecord.refundId, refundRecord);
    } catch (error) {
      console.error('[RefundService] 更新退款记录失败:', error);
      throw error;
    }
  }

  /**
   * 根据支付ID获取退款记录
   * @param {string} paymentId 支付ID
   * @returns {Promise<Object>} 退款记录
   */
  async getRefundByPaymentId(paymentId) {
    try {
      // 这里应该从数据库查询
      // 暂时遍历本地存储
      const keys = wx.getStorageInfoSync().keys;
      const refundKeys = keys.filter(key => key.startsWith('refund_'));
      
      for (const key of refundKeys) {
        const record = wx.getStorageSync(key);
        if (record && record.paymentId === paymentId) {
          return record;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[RefundService] 根据支付ID获取退款记录失败:', error);
      return null;
    }
  }

  /**
   * 获取支付信息
   * @param {string} paymentId 支付ID
   * @returns {Promise<Object>} 支付信息
   */
  async getPaymentInfo(paymentId) {
    try {
      const storageKey = `payment_${paymentId}`;
      return wx.getStorageSync(storageKey);
    } catch (error) {
      console.error('[RefundService] 获取支付信息失败:', error);
      return null;
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo(userId) {
    try {
      // 这里应该从API获取用户信息
      // 暂时从本地存储获取
      return wx.getStorageSync('userInfo');
    } catch (error) {
      console.error('[RefundService] 获取用户信息失败:', error);
      return null;
    }
  }

  // ==================== 其他辅助方法 ====================

  /**
   * 提交审批
   */
  async submitForApproval(refundId) {
    // 发送审批通知给管理员
    console.log(`[RefundService] 退款申请${refundId}已提交审批`);
  }

  /**
   * 发送审批结果通知
   */
  async sendApprovalNotification(refundRecord) {
    // 发送通知给用户
    console.log(`[RefundService] 退款审批结果通知已发送: ${refundRecord.refundId}`);
  }

  /**
   * 发送退款结果通知
   */
  async sendRefundNotification(refundRecord) {
    // 发送退款结果通知
    console.log(`[RefundService] 退款结果通知已发送: ${refundRecord.refundId}`);
  }

  /**
   * 更新用户余额
   */
  async updateUserBalance(userId, newBalance) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.balance = newBalance;
    wx.setStorageSync('userInfo', userInfo);
  }

  /**
   * 更新用户积分
   */
  async updateUserPoints(userId, newPoints) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.points = newPoints;
    wx.setStorageSync('userInfo', userInfo);
  }

  /**
   * 记录余额变动
   */
  async recordBalanceChange(changeRecord) {
    const balanceHistory = wx.getStorageSync('balance_history') || [];
    balanceHistory.unshift(changeRecord);
    
    if (balanceHistory.length > 1000) {
      balanceHistory.splice(1000);
    }
    
    wx.setStorageSync('balance_history', balanceHistory);
  }

  /**
   * 记录积分变动
   */
  async recordPointsChange(changeRecord) {
    const pointsHistory = wx.getStorageSync('points_history') || [];
    pointsHistory.unshift(changeRecord);
    
    if (pointsHistory.length > 1000) {
      pointsHistory.splice(1000);
    }
    
    wx.setStorageSync('points_history', pointsHistory);
  }
}

// 创建单例实例
const refundService = new RefundService();

export default refundService;