/**
 * 支付方式管理服务
 * @description 支持微信支付、支付宝、银行卡等多种支付方式
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { 
  PAYMENT_METHODS, 
  PAYMENT_STATUS,
  PAYMENT_EXCEPTION_TYPES 
} from '../constants/payment-constants.js';
import paymentStatusService from './payment-status.service.js';

class PaymentMethodsService {
  constructor() {
    this.supportedMethods = new Set();
    this.methodConfigs = new Map();
    this.paymentHandlers = new Map();
    this.init();
  }

  /**
   * 初始化支付方式
   */
  init() {
    this.registerPaymentMethod(PAYMENT_METHODS.WECHAT, {
      name: '微信支付',
      icon: '/images/payment/wechat.png',
      enabled: true,
      handler: this.handleWechatPayment.bind(this)
    });

    this.registerPaymentMethod(PAYMENT_METHODS.ALIPAY, {
      name: '支付宝',
      icon: '/images/payment/alipay.png',
      enabled: false, // 小程序中通常不支持支付宝
      handler: this.handleAlipayPayment.bind(this)
    });

    this.registerPaymentMethod(PAYMENT_METHODS.BALANCE, {
      name: '余额支付',
      icon: '/images/payment/balance.png',
      enabled: true,
      handler: this.handleBalancePayment.bind(this)
    });

    this.registerPaymentMethod(PAYMENT_METHODS.POINTS, {
      name: '积分支付',
      icon: '/images/payment/points.png',
      enabled: true,
      handler: this.handlePointsPayment.bind(this)
    });
  }

  /**
   * 注册支付方式
   * @param {string} method 支付方式
   * @param {Object} config 配置信息
   */
  registerPaymentMethod(method, config) {
    this.supportedMethods.add(method);
    this.methodConfigs.set(method, config);
    this.paymentHandlers.set(method, config.handler);
  }

  /**
   * 获取支持的支付方式列表
   * @returns {Array} 支付方式列表
   */
  getSupportedMethods() {
    const methods = [];
    
    for (const [method, config] of this.methodConfigs.entries()) {
      if (config.enabled) {
        methods.push({
          method,
          name: config.name,
          icon: config.icon,
          available: this.isMethodAvailable(method)
        });
      }
    }
    
    return methods;
  }

  /**
   * 检查支付方式是否可用
   * @param {string} method 支付方式
   * @returns {boolean} 是否可用
   */
  isMethodAvailable(method) {
    switch (method) {
      case PAYMENT_METHODS.WECHAT:
        return this.checkWechatPayAvailable();
      case PAYMENT_METHODS.BALANCE:
        return this.checkBalanceAvailable();
      case PAYMENT_METHODS.POINTS:
        return this.checkPointsAvailable();
      default:
        return false;
    }
  }

  /**
   * 发起支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async initiatePayment(paymentData) {
    try {
      const { method, amount, orderId, description } = paymentData;
      
      // 检查支付方式是否支持
      if (!this.supportedMethods.has(method)) {
        throw new Error(`不支持的支付方式: ${method}`);
      }

      // 检查支付方式是否可用
      if (!this.isMethodAvailable(method)) {
        throw new Error(`支付方式暂不可用: ${method}`);
      }

      // 更新支付状态为处理中
      await paymentStatusService.updateStatus(
        orderId,
        PAYMENT_STATUS.PROCESSING,
        '开始支付处理',
        'system'
      );

      // 获取支付处理器
      const handler = this.paymentHandlers.get(method);
      if (!handler) {
        throw new Error(`未找到支付处理器: ${method}`);
      }

      // 执行支付
      const result = await handler(paymentData);
      
      return {
        success: true,
        method,
        result,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('[PaymentMethodsService] 发起支付失败:', error);
      
      // 更新支付状态为失败
      if (paymentData.orderId) {
        await paymentStatusService.updateStatus(
          paymentData.orderId,
          PAYMENT_STATUS.FAILED,
          error.message,
          'system'
        );
      }
      
      throw error;
    }
  }

  /**
   * 查询支付结果
   * @param {string} orderId 订单ID
   * @param {string} method 支付方式
   * @returns {Promise<Object>} 支付结果
   */
  async queryPaymentResult(orderId, method) {
    try {
      const handler = this.paymentHandlers.get(method);
      if (!handler.queryResult) {
        throw new Error(`支付方式不支持结果查询: ${method}`);
      }

      return await handler.queryResult(orderId);
    } catch (error) {
      console.error('[PaymentMethodsService] 查询支付结果失败:', error);
      throw error;
    }
  }

  // ==================== 微信支付处理 ====================

  /**
   * 检查微信支付是否可用
   */
  checkWechatPayAvailable() {
    try {
      return wx.canIUse('requestPayment');
    } catch (error) {
      console.error('[PaymentMethodsService] 检查微信支付可用性失败:', error);
      return false;
    }
  }

  /**
   * 处理微信支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async handleWechatPayment(paymentData) {
    try {
      const { amount, orderId, description } = paymentData;
      
      // 获取支付参数（通常需要从后端获取）
      const paymentParams = await this.getWechatPaymentParams({
        amount,
        orderId,
        description
      });

      return new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType,
          paySign: paymentParams.paySign,
          
          success: async (res) => {
            console.log('[PaymentMethodsService] 微信支付成功:', res);
            
            // 更新支付状态
            await paymentStatusService.updateStatus(
              orderId,
              PAYMENT_STATUS.COMPLETED,
              '微信支付成功',
              'wechat'
            );
            
            resolve({
              success: true,
              transactionId: res.transactionId || '',
              message: '支付成功'
            });
          },
          
          fail: async (err) => {
            console.error('[PaymentMethodsService] 微信支付失败:', err);
            
            let failureReason = '微信支付失败';
            if (err.errMsg.includes('cancel')) {
              failureReason = '用户取消支付';
              await paymentStatusService.updateStatus(
                orderId,
                PAYMENT_STATUS.CANCELLED,
                failureReason,
                'user'
              );
            } else {
              await paymentStatusService.updateStatus(
                orderId,
                PAYMENT_STATUS.FAILED,
                failureReason,
                'wechat'
              );
            }
            
            reject(new Error(failureReason));
          }
        });
      });
      
    } catch (error) {
      console.error('[PaymentMethodsService] 处理微信支付失败:', error);
      throw error;
    }
  }

  /**
   * 获取微信支付参数
   * @param {Object} orderInfo 订单信息
   * @returns {Promise<Object>} 支付参数
   */
  async getWechatPaymentParams(orderInfo) {
    try {
      // 这里应该调用后端API获取支付参数
      // 暂时返回模拟数据
      return {
        timeStamp: String(Date.now()),
        nonceStr: this.generateNonceStr(),
        package: `prepay_id=wx${Date.now()}`,
        signType: 'MD5',
        paySign: 'mock_sign_' + Date.now()
      };
    } catch (error) {
      console.error('[PaymentMethodsService] 获取微信支付参数失败:', error);
      throw error;
    }
  }

  // ==================== 支付宝支付处理 ====================

  /**
   * 处理支付宝支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async handleAlipayPayment(paymentData) {
    // 小程序通常不支持支付宝支付
    throw new Error('小程序暂不支持支付宝支付');
  }

  // ==================== 余额支付处理 ====================

  /**
   * 检查余额支付是否可用
   */
  checkBalanceAvailable() {
    try {
      // 检查用户是否有余额账户
      const userBalance = this.getUserBalance();
      return userBalance !== null;
    } catch (error) {
      console.error('[PaymentMethodsService] 检查余额可用性失败:', error);
      return false;
    }
  }

  /**
   * 处理余额支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async handleBalancePayment(paymentData) {
    try {
      const { amount, orderId, description } = paymentData;
      
      // 检查余额是否充足
      const userBalance = this.getUserBalance();
      if (userBalance < amount) {
        throw new Error('余额不足');
      }

      // 扣减余额
      const success = await this.deductBalance(amount, orderId, description);
      
      if (success) {
        await paymentStatusService.updateStatus(
          orderId,
          PAYMENT_STATUS.COMPLETED,
          '余额支付成功',
          'balance'
        );
        
        return {
          success: true,
          transactionId: `balance_${orderId}_${Date.now()}`,
          message: '余额支付成功',
          remainingBalance: this.getUserBalance()
        };
      } else {
        throw new Error('余额扣减失败');
      }
      
    } catch (error) {
      console.error('[PaymentMethodsService] 处理余额支付失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户余额
   * @returns {number} 用户余额
   */
  getUserBalance() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      return userInfo.balance || 0;
    } catch (error) {
      console.error('[PaymentMethodsService] 获取用户余额失败:', error);
      return 0;
    }
  }

  /**
   * 扣减用户余额
   * @param {number} amount 扣减金额
   * @param {string} orderId 订单ID
   * @param {string} description 描述
   * @returns {Promise<boolean>} 扣减结果
   */
  async deductBalance(amount, orderId, description) {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const currentBalance = userInfo.balance || 0;
      
      if (currentBalance < amount) {
        return false;
      }
      
      userInfo.balance = currentBalance - amount;
      wx.setStorageSync('userInfo', userInfo);
      
      // 记录余额变动
      this.recordBalanceChange({
        type: 'deduct',
        amount: -amount,
        orderId,
        description,
        balance: userInfo.balance,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('[PaymentMethodsService] 扣减余额失败:', error);
      return false;
    }
  }

  /**
   * 记录余额变动
   * @param {Object} changeRecord 变动记录
   */
  recordBalanceChange(changeRecord) {
    try {
      const balanceHistory = wx.getStorageSync('balance_history') || [];
      balanceHistory.unshift(changeRecord);
      
      // 限制历史记录数量
      if (balanceHistory.length > 1000) {
        balanceHistory.splice(1000);
      }
      
      wx.setStorageSync('balance_history', balanceHistory);
    } catch (error) {
      console.error('[PaymentMethodsService] 记录余额变动失败:', error);
    }
  }

  // ==================== 积分支付处理 ====================

  /**
   * 检查积分支付是否可用
   */
  checkPointsAvailable() {
    try {
      const userPoints = this.getUserPoints();
      return userPoints > 0;
    } catch (error) {
      console.error('[PaymentMethodsService] 检查积分可用性失败:', error);
      return false;
    }
  }

  /**
   * 处理积分支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async handlePointsPayment(paymentData) {
    try {
      const { amount, orderId, description } = paymentData;
      
      // 计算需要的积分数量（假设1元=100积分）
      const requiredPoints = Math.ceil(amount * 100);
      
      // 检查积分是否充足
      const userPoints = this.getUserPoints();
      if (userPoints < requiredPoints) {
        throw new Error('积分不足');
      }

      // 扣减积分
      const success = await this.deductPoints(requiredPoints, orderId, description);
      
      if (success) {
        await paymentStatusService.updateStatus(
          orderId,
          PAYMENT_STATUS.COMPLETED,
          '积分支付成功',
          'points'
        );
        
        return {
          success: true,
          transactionId: `points_${orderId}_${Date.now()}`,
          message: '积分支付成功',
          usedPoints: requiredPoints,
          remainingPoints: this.getUserPoints()
        };
      } else {
        throw new Error('积分扣减失败');
      }
      
    } catch (error) {
      console.error('[PaymentMethodsService] 处理积分支付失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户积分
   * @returns {number} 用户积分
   */
  getUserPoints() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      return userInfo.points || 0;
    } catch (error) {
      console.error('[PaymentMethodsService] 获取用户积分失败:', error);
      return 0;
    }
  }

  /**
   * 扣减用户积分
   * @param {number} points 扣减积分
   * @param {string} orderId 订单ID
   * @param {string} description 描述
   * @returns {Promise<boolean>} 扣减结果
   */
  async deductPoints(points, orderId, description) {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const currentPoints = userInfo.points || 0;
      
      if (currentPoints < points) {
        return false;
      }
      
      userInfo.points = currentPoints - points;
      wx.setStorageSync('userInfo', userInfo);
      
      // 记录积分变动
      this.recordPointsChange({
        type: 'deduct',
        points: -points,
        orderId,
        description,
        balance: userInfo.points,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('[PaymentMethodsService] 扣减积分失败:', error);
      return false;
    }
  }

  /**
   * 记录积分变动
   * @param {Object} changeRecord 变动记录
   */
  recordPointsChange(changeRecord) {
    try {
      const pointsHistory = wx.getStorageSync('points_history') || [];
      pointsHistory.unshift(changeRecord);
      
      // 限制历史记录数量
      if (pointsHistory.length > 1000) {
        pointsHistory.splice(1000);
      }
      
      wx.setStorageSync('points_history', pointsHistory);
    } catch (error) {
      console.error('[PaymentMethodsService] 记录积分变动失败:', error);
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 生成随机字符串
   * @param {number} length 长度
   * @returns {string} 随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * 格式化金额
   * @param {number} amount 金额
   * @returns {string} 格式化后的金额
   */
  formatAmount(amount) {
    return (amount / 100).toFixed(2);
  }

  /**
   * 验证支付金额
   * @param {number} amount 金额
   * @returns {boolean} 验证结果
   */
  validateAmount(amount) {
    return typeof amount === 'number' && amount > 0 && amount <= 999999;
  }
}

// 创建单例实例
const paymentMethodsService = new PaymentMethodsService();

export default paymentMethodsService;