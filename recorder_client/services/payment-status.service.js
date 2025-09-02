/**
 * 付款状态管理服务
 * @description 负责付款状态的管理、状态流转和状态变更记录
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { 
  PAYMENT_STATUS, 
  STATUS_FLOW_RULES, 
  PAYMENT_CONFIG,
  PAYMENT_EXCEPTION_TYPES 
} from '../constants/payment-constants.js';
import { formatDateTime } from '../utils/util.js';

class PaymentStatusService {
  constructor() {
    this.statusHistory = new Map(); // 状态变更历史记录
    this.listeners = new Map();     // 状态变更监听器
  }

  /**
   * 检查状态流转是否有效
   * @param {string} currentStatus 当前状态
   * @param {string} targetStatus 目标状态
   * @returns {boolean} 是否可以流转
   */
  canTransition(currentStatus, targetStatus) {
    try {
      const allowedTransitions = STATUS_FLOW_RULES[currentStatus] || [];
      return allowedTransitions.includes(targetStatus);
    } catch (error) {
      console.error('[PaymentStatusService] 检查状态流转失败:', error);
      return false;
    }
  }

  /**
   * 更新付款状态
   * @param {string} paymentId 付款ID
   * @param {string} newStatus 新状态
   * @param {string} reason 变更原因
   * @param {string} operatorId 操作员ID
   * @returns {Promise<boolean>} 更新结果
   */
  async updateStatus(paymentId, newStatus, reason = '', operatorId = '') {
    try {
      // 获取当前状态
      const currentStatus = await this.getCurrentStatus(paymentId);
      
      // 检查状态流转是否有效
      if (!this.canTransition(currentStatus, newStatus)) {
        throw new Error(`无效的状态流转: ${currentStatus} -> ${newStatus}`);
      }

      // 执行状态更新
      const success = await this._executeStatusUpdate(paymentId, newStatus);
      
      if (success) {
        // 记录状态变更历史
        await this._recordStatusChange(paymentId, currentStatus, newStatus, reason, operatorId);
        
        // 触发状态变更事件
        this._emitStatusChangeEvent(paymentId, currentStatus, newStatus);
        
        // 执行状态相关的业务逻辑
        await this._handleStatusSpecificActions(paymentId, newStatus);
        
        console.log(`[PaymentStatusService] 状态更新成功: ${paymentId} ${currentStatus} -> ${newStatus}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PaymentStatusService] 更新付款状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   * @param {string} paymentId 付款ID
   * @returns {Promise<string>} 当前状态
   */
  async getCurrentStatus(paymentId) {
    try {
      // 从本地存储或服务器获取当前状态
      const paymentData = await this._getPaymentData(paymentId);
      return paymentData?.status || PAYMENT_STATUS.PENDING;
    } catch (error) {
      console.error('[PaymentStatusService] 获取当前状态失败:', error);
      return PAYMENT_STATUS.PENDING;
    }
  }

  /**
   * 批量更新付款状态
   * @param {Array} updates 更新列表 [{paymentId, newStatus, reason}]
   * @param {string} operatorId 操作员ID
   * @returns {Promise<Array>} 更新结果列表
   */
  async batchUpdateStatus(updates, operatorId = '') {
    const results = [];
    
    try {
      for (const update of updates) {
        try {
          const success = await this.updateStatus(
            update.paymentId,
            update.newStatus,
            update.reason || '批量更新',
            operatorId
          );
          results.push({
            paymentId: update.paymentId,
            success,
            error: null
          });
        } catch (error) {
          results.push({
            paymentId: update.paymentId,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`[PaymentStatusService] 批量更新完成: ${results.length}个订单`);
      return results;
    } catch (error) {
      console.error('[PaymentStatusService] 批量更新状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取状态变更历史
   * @param {string} paymentId 付款ID
   * @param {number} limit 限制数量
   * @returns {Promise<Array>} 状态变更历史
   */
  async getStatusHistory(paymentId, limit = 50) {
    try {
      const history = this.statusHistory.get(paymentId) || [];
      return history.slice(0, limit);
    } catch (error) {
      console.error('[PaymentStatusService] 获取状态历史失败:', error);
      return [];
    }
  }

  /**
   * 添加状态变更监听器
   * @param {string} paymentId 付款ID
   * @param {Function} callback 回调函数
   */
  addStatusListener(paymentId, callback) {
    if (!this.listeners.has(paymentId)) {
      this.listeners.set(paymentId, []);
    }
    this.listeners.get(paymentId).push(callback);
  }

  /**
   * 移除状态变更监听器
   * @param {string} paymentId 付款ID
   * @param {Function} callback 回调函数
   */
  removeStatusListener(paymentId, callback) {
    const listeners = this.listeners.get(paymentId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 检查逾期付款
   * @returns {Promise<Array>} 逾期付款列表
   */
  async checkOverduePayments() {
    try {
      const now = new Date();
      const overdueThreshold = new Date(now.getTime() - PAYMENT_CONFIG.OVERDUE_DAYS * 24 * 60 * 60 * 1000);
      
      // 获取待付款订单
      const pendingPayments = await this._getPendingPayments();
      const overduePayments = [];
      
      for (const payment of pendingPayments) {
        if (new Date(payment.createTime) < overdueThreshold) {
          // 更新为逾期状态
          await this.updateStatus(
            payment.paymentId,
            PAYMENT_STATUS.OVERDUE,
            '系统自动检测逾期',
            'system'
          );
          overduePayments.push(payment);
        }
      }
      
      console.log(`[PaymentStatusService] 检查到${overduePayments.length}个逾期付款`);
      return overduePayments;
    } catch (error) {
      console.error('[PaymentStatusService] 检查逾期付款失败:', error);
      return [];
    }
  }

  /**
   * 自动处理付款状态
   * 定时任务，处理超时、逾期等状态
   */
  async autoProcessPaymentStatus() {
    try {
      console.log('[PaymentStatusService] 开始自动处理付款状态');
      
      // 检查逾期付款
      await this.checkOverduePayments();
      
      // 检查超时付款
      await this._checkTimeoutPayments();
      
      // 检查需要暂停服务的付款
      await this._checkServiceSuspension();
      
      console.log('[PaymentStatusService] 自动处理付款状态完成');
    } catch (error) {
      console.error('[PaymentStatusService] 自动处理付款状态失败:', error);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 执行状态更新
   * @param {string} paymentId 付款ID
   * @param {string} newStatus 新状态
   * @returns {Promise<boolean>} 更新结果
   */
  async _executeStatusUpdate(paymentId, newStatus) {
    try {
      // 这里应该调用实际的数据库更新或API接口
      // 暂时使用本地存储模拟
      const storageKey = `payment_${paymentId}`;
      const paymentData = wx.getStorageSync(storageKey) || {};
      paymentData.status = newStatus;
      paymentData.updateTime = new Date().toISOString();
      
      wx.setStorageSync(storageKey, paymentData);
      return true;
    } catch (error) {
      console.error('[PaymentStatusService] 执行状态更新失败:', error);
      return false;
    }
  }

  /**
   * 记录状态变更历史
   */
  async _recordStatusChange(paymentId, fromStatus, toStatus, reason, operatorId) {
    try {
      if (!this.statusHistory.has(paymentId)) {
        this.statusHistory.set(paymentId, []);
      }
      
      const changeRecord = {
        fromStatus,
        toStatus,
        reason,
        operatorId,
        changeTime: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      this.statusHistory.get(paymentId).unshift(changeRecord);
      
      // 限制历史记录数量
      const history = this.statusHistory.get(paymentId);
      if (history.length > 100) {
        this.statusHistory.set(paymentId, history.slice(0, 100));
      }
      
      // 同时保存到本地存储
      const storageKey = `payment_history_${paymentId}`;
      wx.setStorageSync(storageKey, this.statusHistory.get(paymentId));
      
    } catch (error) {
      console.error('[PaymentStatusService] 记录状态变更失败:', error);
    }
  }

  /**
   * 触发状态变更事件
   */
  _emitStatusChangeEvent(paymentId, fromStatus, toStatus) {
    try {
      const listeners = this.listeners.get(paymentId) || [];
      const event = {
        paymentId,
        fromStatus,
        toStatus,
        timestamp: Date.now()
      };
      
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[PaymentStatusService] 状态变更监听器执行失败:', error);
        }
      });
    } catch (error) {
      console.error('[PaymentStatusService] 触发状态变更事件失败:', error);
    }
  }

  /**
   * 处理状态相关的业务逻辑
   */
  async _handleStatusSpecificActions(paymentId, status) {
    try {
      switch (status) {
        case PAYMENT_STATUS.COMPLETED:
          await this._handlePaymentCompleted(paymentId);
          break;
        case PAYMENT_STATUS.FAILED:
          await this._handlePaymentFailed(paymentId);
          break;
        case PAYMENT_STATUS.OVERDUE:
          await this._handlePaymentOverdue(paymentId);
          break;
        case PAYMENT_STATUS.SUSPENDED:
          await this._handleServiceSuspended(paymentId);
          break;
      }
    } catch (error) {
      console.error('[PaymentStatusService] 处理状态相关业务逻辑失败:', error);
    }
  }

  /**
   * 处理支付完成
   */
  async _handlePaymentCompleted(paymentId) {
    // 发送支付成功通知
    // 激活相关服务
    // 更新用户权限
  }

  /**
   * 处理支付失败
   */
  async _handlePaymentFailed(paymentId) {
    // 发送支付失败通知
    // 记录失败原因
  }

  /**
   * 处理逾期付款
   */
  async _handlePaymentOverdue(paymentId) {
    // 发送逾期通知
    // 启动催缴流程
  }

  /**
   * 处理服务暂停
   */
  async _handleServiceSuspended(paymentId) {
    // 暂停相关服务
    // 发送服务暂停通知
  }

  /**
   * 获取付款数据
   */
  async _getPaymentData(paymentId) {
    try {
      const storageKey = `payment_${paymentId}`;
      return wx.getStorageSync(storageKey);
    } catch (error) {
      console.error('[PaymentStatusService] 获取付款数据失败:', error);
      return null;
    }
  }

  /**
   * 获取待付款订单
   */
  async _getPendingPayments() {
    try {
      // 这里应该从数据库或API获取待付款订单
      // 暂时返回空数组
      return [];
    } catch (error) {
      console.error('[PaymentStatusService] 获取待付款订单失败:', error);
      return [];
    }
  }

  /**
   * 检查超时付款
   */
  async _checkTimeoutPayments() {
    try {
      const now = new Date();
      const timeoutThreshold = new Date(now.getTime() - PAYMENT_CONFIG.PAYMENT_TIMEOUT);
      
      // 获取处理中的付款
      const processingPayments = await this._getProcessingPayments();
      
      for (const payment of processingPayments) {
        if (new Date(payment.updateTime) < timeoutThreshold) {
          await this.updateStatus(
            payment.paymentId,
            PAYMENT_STATUS.FAILED,
            '支付超时',
            'system'
          );
        }
      }
    } catch (error) {
      console.error('[PaymentStatusService] 检查超时付款失败:', error);
    }
  }

  /**
   * 检查需要暂停服务的付款
   */
  async _checkServiceSuspension() {
    try {
      const now = new Date();
      const suspensionThreshold = new Date(
        now.getTime() - PAYMENT_CONFIG.SUSPENSION_OVERDUE_DAYS * 24 * 60 * 60 * 1000
      );
      
      // 获取逾期付款
      const overduePayments = await this._getOverduePayments();
      
      for (const payment of overduePayments) {
        if (new Date(payment.createTime) < suspensionThreshold) {
          await this.updateStatus(
            payment.paymentId,
            PAYMENT_STATUS.SUSPENDED,
            '逾期时间过长，自动暂停服务',
            'system'
          );
        }
      }
    } catch (error) {
      console.error('[PaymentStatusService] 检查服务暂停失败:', error);
    }
  }

  /**
   * 获取处理中的付款
   */
  async _getProcessingPayments() {
    return [];
  }

  /**
   * 获取逾期付款
   */
  async _getOverduePayments() {
    return [];
  }
}

// 创建单例实例
const paymentStatusService = new PaymentStatusService();

export default paymentStatusService;