Component({
  /**
   * 微信订阅消息管理组件
   * 处理订阅消息授权、状态管理等功能
   */
  
  properties: {
    // 是否显示订阅管理界面
    visible: {
      type: Boolean,
      value: false
    },
    // 需要订阅的消息类型列表
    subscriptionTypes: {
      type: Array,
      value: []
    }
  },

  data: {
    // 订阅状态列表
    subscriptions: [],
    
    // 订阅模板配置
    subscriptionTemplates: {
      'appointment_reminder': {
        name: '预约提醒',
        description: '服务预约时间提醒',
        templateId: 'subscribe_id_001',
        required: true
      },
      'payment_reminder': {
        name: '付款提醒',
        description: '服务费用支付提醒',
        templateId: 'subscribe_id_002',
        required: false
      },
      'service_complete': {
        name: '服务完成',
        description: '护理服务完成通知',
        templateId: 'subscribe_id_003',
        required: false
      },
      'health_alert': {
        name: '健康警报',
        description: '紧急健康状况提醒',
        templateId: 'subscribe_id_004',
        required: true
      }
    },
    
    // 加载状态
    loading: false
  },

  lifetimes: {
    attached() {
      this.loadSubscriptionStatus();
    }
  },

  observers: {
    'subscriptionTypes': function(types) {
      this.updateSubscriptionList(types);
    }
  },

  methods: {
    /**
     * 加载订阅状态
     */
    loadSubscriptionStatus() {
      try {
        const userInfo = wx.getStorageSync('user_info') || {};
        const subscriptions = wx.getStorageSync('user_subscriptions') || {};
        const userSubs = subscriptions[userInfo.openid] || {};
        
        // 构建订阅列表
        const subscriptionList = Object.keys(this.data.subscriptionTemplates).map(type => {
          const template = this.data.subscriptionTemplates[type];
          const subscription = userSubs[type];
          
          return {
            type,
            name: template.name,
            description: template.description,
            templateId: template.templateId,
            required: template.required,
            subscribed: !!subscription,
            expireTime: subscription ? subscription.expireTime : null,
            subscribedAt: subscription ? subscription.subscribedAt : null
          };
        });
        
        this.setData({ subscriptions: subscriptionList });
      } catch (error) {
        console.error('[SubscriptionManager] 加载订阅状态失败:', error);
      }
    },

    /**
     * 更新订阅列表
     */
    updateSubscriptionList(types) {
      if (!types || types.length === 0) return;
      
      const filteredSubscriptions = this.data.subscriptions.filter(sub => 
        types.includes(sub.type)
      );
      
      this.setData({ subscriptions: filteredSubscriptions });
    },

    /**
     * 切换订阅状态
     */
    async toggleSubscription(e) {
      const { subscription } = e.currentTarget.dataset;
      
      if (subscription.subscribed) {
        // 取消订阅
        this.cancelSubscription(subscription);
      } else {
        // 请求订阅
        await this.requestSubscription(subscription);
      }
    },

    /**
     * 请求订阅
     */
    async requestSubscription(subscription) {
      try {
        this.setData({ loading: true });

        const result = await wx.requestSubscribeMessage({
          tmplIds: [subscription.templateId]
        });

        const accepted = result[subscription.templateId] === 'accept';
        
        if (accepted) {
          // 保存订阅状态
          this.saveSubscriptionStatus(subscription.type, true);
          
          wx.showToast({
            title: '订阅成功',
            icon: 'success'
          });
          
          // 触发订阅成功事件
          this.triggerEvent('subscribe', {
            type: subscription.type,
            subscribed: true
          });
        } else {
          wx.showToast({
            title: '订阅被拒绝',
            icon: 'none'
          });
        }

        // 重新加载状态
        this.loadSubscriptionStatus();

      } catch (error) {
        console.error('[SubscriptionManager] 请求订阅失败:', error);
        
        let message = '订阅失败';
        if (error.errMsg && error.errMsg.includes('requestSubscribeMessage:fail')) {
          if (error.errMsg.includes('用户拒绝')) {
            message = '用户拒绝订阅';
          } else if (error.errMsg.includes('模板已被删除')) {
            message = '订阅模板不可用';
          }
        }
        
        wx.showToast({
          title: message,
          icon: 'error'
        });
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 取消订阅
     */
    cancelSubscription(subscription) {
      wx.showModal({
        title: '取消订阅',
        content: `确定要取消【${subscription.name}】订阅吗？取消后将无法接收相关通知。`,
        success: (res) => {
          if (res.confirm) {
            // 保存取消状态
            this.saveSubscriptionStatus(subscription.type, false);
            
            wx.showToast({
              title: '已取消订阅',
              icon: 'success'
            });
            
            // 触发取消订阅事件
            this.triggerEvent('unsubscribe', {
              type: subscription.type,
              subscribed: false
            });
            
            // 重新加载状态
            this.loadSubscriptionStatus();
          }
        }
      });
    },

    /**
     * 批量订阅
     */
    async batchSubscribe() {
      try {
        this.setData({ loading: true });

        // 获取未订阅的模板ID
        const unsubscribedTemplates = this.data.subscriptions
          .filter(sub => !sub.subscribed)
          .map(sub => sub.templateId);

        if (unsubscribedTemplates.length === 0) {
          wx.showToast({
            title: '已全部订阅',
            icon: 'none'
          });
          return;
        }

        const result = await wx.requestSubscribeMessage({
          tmplIds: unsubscribedTemplates
        });

        // 处理订阅结果
        let successCount = 0;
        this.data.subscriptions.forEach(subscription => {
          if (!subscription.subscribed && result[subscription.templateId] === 'accept') {
            this.saveSubscriptionStatus(subscription.type, true);
            successCount++;
          }
        });

        if (successCount > 0) {
          wx.showToast({
            title: `成功订阅${successCount}个消息`,
            icon: 'success'
          });
          
          // 触发批量订阅事件
          this.triggerEvent('batchSubscribe', {
            successCount,
            totalCount: unsubscribedTemplates.length
          });
        } else {
          wx.showToast({
            title: '订阅失败',
            icon: 'error'
          });
        }

        // 重新加载状态
        this.loadSubscriptionStatus();

      } catch (error) {
        console.error('[SubscriptionManager] 批量订阅失败:', error);
        wx.showToast({
          title: '批量订阅失败',
          icon: 'error'
        });
      } finally {
        this.setData({ loading: false });
      }
    },

    /**
     * 保存订阅状态
     */
    saveSubscriptionStatus(type, subscribed) {
      try {
        const userInfo = wx.getStorageSync('user_info') || {};
        const openid = userInfo.openid;
        
        if (!openid) {
          console.warn('[SubscriptionManager] 用户openid不存在');
          return;
        }
        
        const subscriptions = wx.getStorageSync('user_subscriptions') || {};
        if (!subscriptions[openid]) {
          subscriptions[openid] = {};
        }
        
        if (subscribed) {
          subscriptions[openid][type] = {
            templateId: this.data.subscriptionTemplates[type].templateId,
            subscribedAt: Date.now(),
            expireTime: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1年有效期
          };
        } else {
          delete subscriptions[openid][type];
        }
        
        wx.setStorageSync('user_subscriptions', subscriptions);
        
        console.log('[SubscriptionManager] 订阅状态已保存:', type, subscribed);
      } catch (error) {
        console.error('[SubscriptionManager] 保存订阅状态失败:', error);
      }
    },

    /**
     * 检查必需的订阅
     */
    checkRequiredSubscriptions() {
      const requiredSubs = this.data.subscriptions.filter(sub => 
        sub.required && !sub.subscribed
      );
      
      if (requiredSubs.length > 0) {
        wx.showModal({
          title: '重要提醒',
          content: '部分重要通知需要您的订阅授权，建议立即订阅以免错过重要信息。',
          confirmText: '立即订阅',
          success: (res) => {
            if (res.confirm) {
              this.batchSubscribe();
            }
          }
        });
      }
    },

    /**
     * 获取订阅统计
     */
    getSubscriptionStats() {
      const total = this.data.subscriptions.length;
      const subscribed = this.data.subscriptions.filter(sub => sub.subscribed).length;
      const required = this.data.subscriptions.filter(sub => sub.required).length;
      const requiredSubscribed = this.data.subscriptions.filter(sub => 
        sub.required && sub.subscribed
      ).length;
      
      return {
        total,
        subscribed,
        required,
        requiredSubscribed,
        progress: total > 0 ? (subscribed / total * 100).toFixed(1) : 0
      };
    },

    /**
     * 显示订阅详情
     */
    showSubscriptionDetail(e) {
      const { subscription } = e.currentTarget.dataset;
      
      let statusText = subscription.subscribed ? '已订阅' : '未订阅';
      let detailText = subscription.description;
      
      if (subscription.subscribed && subscription.expireTime) {
        const expireDate = new Date(subscription.expireTime).toLocaleDateString();
        detailText += `\n\n订阅时间：${new Date(subscription.subscribedAt).toLocaleDateString()}`;
        detailText += `\n过期时间：${expireDate}`;
      }
      
      wx.showModal({
        title: `${subscription.name} - ${statusText}`,
        content: detailText,
        showCancel: false,
        confirmText: '确定'
      });
    },

    /**
     * 关闭订阅管理
     */
    close() {
      this.triggerEvent('close');
    },

    /**
     * 刷新订阅状态
     */
    refresh() {
      this.loadSubscriptionStatus();
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      });
    }
  }
});