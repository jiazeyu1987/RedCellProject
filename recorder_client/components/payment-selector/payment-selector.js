/**
 * 支付选择组件
 * @description 用于选择支付方式的组件
 * @version 1.0.0
 * @author 系统管理员
 * @date 2025-09-01
 */

import { PAYMENT_METHODS } from '../../constants/payment-constants.js';
import paymentMethodsService from '../../services/payment-methods.service.js';

Component({
  properties: {
    // 订单金额
    amount: {
      type: Number,
      value: 0
    },
    
    // 是否显示组件
    visible: {
      type: Boolean,
      value: false
    },
    
    // 订单信息
    orderInfo: {
      type: Object,
      value: {}
    }
  },

  data: {
    // 支付方式列表
    paymentMethods: [],
    
    // 选中的支付方式
    selectedMethod: '',
    
    // 用户余额
    userBalance: 0,
    
    // 用户积分
    userPoints: 0,
    
    // 加载状态
    loading: false,
    
    // 支付中状态
    paying: false
  },

  lifetimes: {
    attached() {
      this.loadPaymentMethods();
      this.loadUserAssets();
    }
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.loadPaymentMethods();
        this.loadUserAssets();
      }
    }
  },

  methods: {
    /**
     * 加载支付方式
     */
    loadPaymentMethods() {
      try {
        const methods = paymentMethodsService.getSupportedMethods();
        this.setData({
          paymentMethods: methods,
          selectedMethod: methods.length > 0 ? methods[0].method : ''
        });
      } catch (error) {
        console.error('[PaymentSelector] 加载支付方式失败:', error);
        wx.showToast({
          title: '加载支付方式失败',
          icon: 'error'
        });
      }
    },

    /**
     * 加载用户资产信息
     */
    loadUserAssets() {
      try {
        const userBalance = paymentMethodsService.getUserBalance();
        const userPoints = paymentMethodsService.getUserPoints();
        
        this.setData({
          userBalance,
          userPoints
        });
      } catch (error) {
        console.error('[PaymentSelector] 加载用户资产失败:', error);
      }
    },

    /**
     * 选择支付方式
     */
    onMethodSelect(e) {
      const { method } = e.currentTarget.dataset;
      this.setData({
        selectedMethod: method
      });
    },

    /**
     * 确认支付
     */
    async onConfirmPayment() {
      if (this.data.paying) return;

      try {
        const { selectedMethod, amount } = this.data;
        const { orderInfo } = this.properties;

        if (!selectedMethod) {
          wx.showToast({
            title: '请选择支付方式',
            icon: 'error'
          });
          return;
        }

        this.setData({ paying: true });

        // 构建支付数据
        const paymentData = {
          method: selectedMethod,
          amount: amount,
          orderId: orderInfo.orderId,
          description: orderInfo.description || '服务费用'
        };

        // 发起支付
        const result = await paymentMethodsService.initiatePayment(paymentData);

        if (result.success) {
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });

          // 触发支付成功事件
          this.triggerEvent('paymentSuccess', {
            method: selectedMethod,
            result: result.result,
            orderInfo
          });

          this.onClose();
        }

      } catch (error) {
        console.error('[PaymentSelector] 支付失败:', error);
        
        let errorMessage = '支付失败';
        if (error.message.includes('余额不足')) {
          errorMessage = '余额不足，请充值后再试';
        } else if (error.message.includes('积分不足')) {
          errorMessage = '积分不足，请选择其他支付方式';
        } else if (error.message.includes('取消')) {
          errorMessage = '支付已取消';
        }

        wx.showToast({
          title: errorMessage,
          icon: 'error'
        });

        // 触发支付失败事件
        this.triggerEvent('paymentError', {
          error: error.message,
          orderInfo: this.properties.orderInfo
        });

      } finally {
        this.setData({ paying: false });
      }
    },

    /**
     * 关闭组件
     */
    onClose() {
      this.triggerEvent('close');
    },

    /**
     * 查看余额详情
     */
    onViewBalance() {
      wx.navigateTo({
        url: '/pages/user-assets/balance/balance'
      });
    },

    /**
     * 查看积分详情
     */
    onViewPoints() {
      wx.navigateTo({
        url: '/pages/user-assets/points/points'
      });
    },

    /**
     * 余额充值
     */
    onRecharge() {
      wx.navigateTo({
        url: '/pages/user-assets/recharge/recharge'
      });
    },

    /**
     * 获取支付方式图标
     */
    getMethodIcon(method) {
      const icons = {
        [PAYMENT_METHODS.WECHAT]: '/images/payment/wechat.png',
        [PAYMENT_METHODS.ALIPAY]: '/images/payment/alipay.png',
        [PAYMENT_METHODS.BALANCE]: '/images/payment/balance.png',
        [PAYMENT_METHODS.POINTS]: '/images/payment/points.png'
      };
      return icons[method] || '/images/payment/default.png';
    },

    /**
     * 获取支付方式描述
     */
    getMethodDescription(method) {
      const { userBalance, userPoints, amount } = this.data;
      
      switch (method) {
        case PAYMENT_METHODS.WECHAT:
          return '安全便捷的微信支付';
        case PAYMENT_METHODS.BALANCE:
          return `余额: ¥${userBalance.toFixed(2)} ${userBalance < amount ? '(余额不足)' : ''}`;
        case PAYMENT_METHODS.POINTS:
          const requiredPoints = Math.ceil(amount * 100);
          return `积分: ${userPoints} ${userPoints < requiredPoints ? '(积分不足)' : ''}`;
        default:
          return '';
      }
    },

    /**
     * 检查支付方式是否可用
     */
    isMethodAvailable(method) {
      const { userBalance, userPoints, amount } = this.data;
      
      switch (method) {
        case PAYMENT_METHODS.WECHAT:
          return paymentMethodsService.checkWechatPayAvailable();
        case PAYMENT_METHODS.BALANCE:
          return userBalance >= amount;
        case PAYMENT_METHODS.POINTS:
          const requiredPoints = Math.ceil(amount * 100);
          return userPoints >= requiredPoints;
        default:
          return false;
      }
    },

    /**
     * 格式化金额显示
     */
    formatAmount(amount) {
      return amount.toFixed(2);
    }
  }
});