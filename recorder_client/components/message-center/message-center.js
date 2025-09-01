/**
 * 消息中心组件
 * 用于显示和管理应用内通知消息
 */

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_STATUS
} from '../../constants/notification-config.js';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    
    // 通知列表
    notifications: {
      type: Array,
      value: []
    },
    
    // 是否显示顶部导航
    showHeader: {
      type: Boolean,
      value: true
    },
    
    // 是否显示筛选器
    showFilter: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 筛选状态
    filterType: 'all', // all, unread, read
    
    // 选择模式
    selectionMode: false,
    selectedIds: [],
    
    // 通知分类
    categories: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'unread', label: '未读', count: 0 },
      { key: 'appointment', label: '预约', count: 0 },
      { key: 'payment', label: '付款', count: 0 },
      { key: 'health', label: '健康', count: 0 },
      { key: 'system', label: '系统', count: 0 }
    ],
    
    // 筛选后的通知列表
    filteredNotifications: [],
    
    // 加载状态
    loading: false,
    
    // 刷新状态
    refreshing: false,
    
    // 显示删除确认
    showDeleteConfirm: false,
    
    // 当前操作的通知
    currentNotification: null
  },

  /**
   * 生命周期
   */
  lifetimes: {
    attached() {
      this.loadNotifications();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'notifications': function(notifications) {
      this.updateFilteredNotifications();
      this.updateCategoryCounts();
    },
    
    'filterType': function(filterType) {
      this.updateFilteredNotifications();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载通知
     */
    async loadNotifications() {
      try {
        this.setData({ loading: true });
        
        // 从本地存储加载通知
        const notifications = wx.getStorageSync('in_app_notifications') || [];
        
        // 按时间倒序排列
        const sortedNotifications = notifications.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        this.setData({
          notifications: sortedNotifications,
          loading: false
        });
        
        // 触发事件
        this.triggerEvent('loaded', { notifications: sortedNotifications });
        
      } catch (error) {
        console.error('[MessageCenter] 加载通知失败:', error);
        this.setData({ loading: false });
        
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },

    /**
     * 刷新通知
     */
    async onRefresh() {
      this.setData({ refreshing: true });
      await this.loadNotifications();
      this.setData({ refreshing: false });
    },

    /**
     * 更新筛选后的通知列表
     */
    updateFilteredNotifications() {
      const { notifications, filterType } = this.data;
      let filtered = [...notifications];
      
      switch (filterType) {
        case 'unread':
          filtered = notifications.filter(n => !n.readTime);
          break;
        case 'read':
          filtered = notifications.filter(n => n.readTime);
          break;
        case 'appointment':
          filtered = notifications.filter(n => this.isAppointmentType(n.type));
          break;
        case 'payment':
          filtered = notifications.filter(n => this.isPaymentType(n.type));
          break;
        case 'health':
          filtered = notifications.filter(n => this.isHealthType(n.type));
          break;
        case 'system':
          filtered = notifications.filter(n => this.isSystemType(n.type));
          break;
        default:
          // 'all' - 显示所有
          break;
      }
      
      this.setData({ filteredNotifications: filtered });
    },

    /**
     * 更新分类计数
     */
    updateCategoryCounts() {
      const { notifications } = this.data;
      const categories = [...this.data.categories];
      
      categories.forEach(category => {
        switch (category.key) {
          case 'all':
            category.count = notifications.length;
            break;
          case 'unread':
            category.count = notifications.filter(n => !n.readTime).length;
            break;
          case 'appointment':
            category.count = notifications.filter(n => this.isAppointmentType(n.type)).length;
            break;
          case 'payment':
            category.count = notifications.filter(n => this.isPaymentType(n.type)).length;
            break;
          case 'health':
            category.count = notifications.filter(n => this.isHealthType(n.type)).length;
            break;
          case 'system':
            category.count = notifications.filter(n => this.isSystemType(n.type)).length;
            break;
        }
      });
      
      this.setData({ categories });
    },

    /**
     * 判断是否为预约类型
     */
    isAppointmentType(type) {
      return [
        NOTIFICATION_TYPES.APPOINTMENT_CONFIRM,
        NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
        NOTIFICATION_TYPES.APPOINTMENT_CHANGE,
        NOTIFICATION_TYPES.APPOINTMENT_CANCEL
      ].includes(type);
    },

    /**
     * 判断是否为付款类型
     */
    isPaymentType(type) {
      return [
        NOTIFICATION_TYPES.PAYMENT_REMINDER,
        NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        NOTIFICATION_TYPES.PAYMENT_OVERDUE,
        NOTIFICATION_TYPES.REFUND_NOTICE
      ].includes(type);
    },

    /**
     * 判断是否为健康类型
     */
    isHealthType(type) {
      return [
        NOTIFICATION_TYPES.HEALTH_REMINDER,
        NOTIFICATION_TYPES.HEALTH_ALERT,
        NOTIFICATION_TYPES.MEDICATION_REMINDER,
        NOTIFICATION_TYPES.FOLLOWUP_REMINDER
      ].includes(type);
    },

    /**
     * 判断是否为系统类型
     */
    isSystemType(type) {
      return [
        NOTIFICATION_TYPES.SYSTEM_NOTICE,
        NOTIFICATION_TYPES.VERSION_UPDATE,
        NOTIFICATION_TYPES.MAINTENANCE_NOTICE
      ].includes(type);
    },

    /**
     * 筛选器点击
     */
    onFilterTap(e) {
      const { type } = e.currentTarget.dataset;
      this.setData({ filterType: type });
    },

    /**
     * 通知项点击
     */
    onNotificationTap(e) {
      const { notification } = e.currentTarget.dataset;
      
      if (this.data.selectionMode) {
        // 选择模式下切换选中状态
        this.toggleSelection(notification.id);
      } else {
        // 普通模式下打开通知详情
        this.openNotificationDetail(notification);
      }
    },

    /**
     * 通知项长按
     */
    onNotificationLongPress(e) {
      const { notification } = e.currentTarget.dataset;
      
      // 进入选择模式
      this.setData({
        selectionMode: true,
        selectedIds: [notification.id]
      });
      
      // 触发震动反馈
      wx.vibrateShort();
    },

    /**
     * 切换选中状态
     */
    toggleSelection(notificationId) {
      const { selectedIds } = this.data;
      const index = selectedIds.indexOf(notificationId);
      
      if (index >= 0) {
        selectedIds.splice(index, 1);
      } else {
        selectedIds.push(notificationId);
      }
      
      this.setData({ selectedIds: [...selectedIds] });
    },

    /**
     * 全选
     */
    onSelectAll() {
      const { filteredNotifications } = this.data;
      const allIds = filteredNotifications.map(n => n.id);
      
      this.setData({ selectedIds: allIds });
    },

    /**
     * 取消选择
     */
    onCancelSelection() {
      this.setData({
        selectionMode: false,
        selectedIds: []
      });
    },

    /**
     * 批量标记已读
     */
    onMarkAsRead() {
      const { selectedIds } = this.data;
      if (selectedIds.length === 0) {
        wx.showToast({
          title: '请选择通知',
          icon: 'none'
        });
        return;
      }
      
      this.batchMarkAsRead(selectedIds);
    },

    /**
     * 批量删除
     */
    onBatchDelete() {
      const { selectedIds } = this.data;
      if (selectedIds.length === 0) {
        wx.showToast({
          title: '请选择通知',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ showDeleteConfirm: true });
    },

    /**
     * 确认删除
     */
    onConfirmDelete() {
      const { selectedIds } = this.data;
      this.batchDeleteNotifications(selectedIds);
      this.setData({ showDeleteConfirm: false });
    },

    /**
     * 取消删除
     */
    onCancelDelete() {
      this.setData({ showDeleteConfirm: false });
    },

    /**
     * 单个通知删除
     */
    onDeleteNotification(e) {
      const { notification } = e.currentTarget.dataset;
      this.setData({
        currentNotification: notification,
        showDeleteConfirm: true
      });
    },

    /**
     * 打开通知详情
     */
    openNotificationDetail(notification) {
      // 标记为已读
      this.markNotificationAsRead(notification.id);
      
      // 触发事件
      this.triggerEvent('open', { notification });
      
      // 根据通知类型跳转相应页面
      this.navigateByNotificationType(notification);
    },

    /**
     * 根据通知类型导航
     */
    navigateByNotificationType(notification) {
      const { type, data } = notification;
      
      switch (type) {
        case NOTIFICATION_TYPES.APPOINTMENT_CONFIRM:
        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
          wx.navigateTo({
            url: `/pages/schedule/schedule?appointmentId=${data.appointmentId}`
          });
          break;
          
        case NOTIFICATION_TYPES.PAYMENT_REMINDER:
          wx.navigateTo({
            url: `/pages/payment/payment?orderId=${data.orderId}`
          });
          break;
          
        case NOTIFICATION_TYPES.HEALTH_ALERT:
          wx.navigateTo({
            url: `/pages/health/health?recordId=${data.recordId}`
          });
          break;
          
        default:
          // 显示通知详情弹窗
          this.showNotificationDetail(notification);
      }
    },

    /**
     * 显示通知详情弹窗
     */
    showNotificationDetail(notification) {
      this.setData({ currentNotification: notification });
      // 这里可以显示详情弹窗
    },

    /**
     * 标记通知为已读
     */
    markNotificationAsRead(notificationId) {
      try {
        const notifications = wx.getStorageSync('in_app_notifications') || [];
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification && !notification.readTime) {
          notification.readTime = new Date().toISOString();
          notification.status = NOTIFICATION_STATUS.READ;
          
          wx.setStorageSync('in_app_notifications', notifications);
          
          // 更新组件数据
          this.setData({ notifications });
          
          // 触发事件
          this.triggerEvent('read', { notificationId });
        }
      } catch (error) {
        console.error('[MessageCenter] 标记已读失败:', error);
      }
    },

    /**
     * 批量标记已读
     */
    batchMarkAsRead(notificationIds) {
      try {
        const notifications = wx.getStorageSync('in_app_notifications') || [];
        let updatedCount = 0;
        
        notifications.forEach(notification => {
          if (notificationIds.includes(notification.id) && !notification.readTime) {
            notification.readTime = new Date().toISOString();
            notification.status = NOTIFICATION_STATUS.READ;
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          wx.setStorageSync('in_app_notifications', notifications);
          
          // 更新组件数据
          this.setData({ 
            notifications,
            selectionMode: false,
            selectedIds: []
          });
          
          wx.showToast({
            title: `已标记${updatedCount}条已读`,
            icon: 'success'
          });
          
          // 触发事件
          this.triggerEvent('batchRead', { count: updatedCount });
        }
      } catch (error) {
        console.error('[MessageCenter] 批量标记已读失败:', error);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    },

    /**
     * 批量删除通知
     */
    batchDeleteNotifications(notificationIds) {
      try {
        const notifications = wx.getStorageSync('in_app_notifications') || [];
        const filteredNotifications = notifications.filter(n => !notificationIds.includes(n.id));
        
        wx.setStorageSync('in_app_notifications', filteredNotifications);
        
        // 更新组件数据
        this.setData({
          notifications: filteredNotifications,
          selectionMode: false,
          selectedIds: []
        });
        
        wx.showToast({
          title: `已删除${notificationIds.length}条通知`,
          icon: 'success'
        });
        
        // 触发事件
        this.triggerEvent('batchDelete', { count: notificationIds.length });
        
      } catch (error) {
        console.error('[MessageCenter] 批量删除失败:', error);
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    },

    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
      const icons = {
        [NOTIFICATION_TYPES.APPOINTMENT_CONFIRM]: 'calendar',
        [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: 'clock',
        [NOTIFICATION_TYPES.PAYMENT_REMINDER]: 'money',
        [NOTIFICATION_TYPES.HEALTH_ALERT]: 'warning',
        [NOTIFICATION_TYPES.SYSTEM_NOTICE]: 'info'
      };
      
      return icons[type] || 'message';
    },

    /**
     * 获取优先级颜色
     */
    getPriorityColor(priority) {
      const colors = {
        [NOTIFICATION_PRIORITY.LOW]: '#909399',
        [NOTIFICATION_PRIORITY.NORMAL]: '#409EFF',
        [NOTIFICATION_PRIORITY.HIGH]: '#E6A23C',
        [NOTIFICATION_PRIORITY.URGENT]: '#F56C6C',
        [NOTIFICATION_PRIORITY.CRITICAL]: '#F56C6C'
      };
      
      return colors[priority] || '#909399';
    },

    /**
     * 格式化时间
     */
    formatTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
      
      if (diff < minute) {
        return '刚刚';
      } else if (diff < hour) {
        return `${Math.floor(diff / minute)}分钟前`;
      } else if (diff < day) {
        return `${Math.floor(diff / hour)}小时前`;
      } else if (diff < 7 * day) {
        return `${Math.floor(diff / day)}天前`;
      } else {
        return date.toLocaleDateString();
      }
    },

    /**
     * 清空所有通知
     */
    onClearAll() {
      wx.showModal({
        title: '确认清空',
        content: '确定要清空所有通知吗？此操作无法撤销。',
        success: (res) => {
          if (res.confirm) {
            try {
              wx.removeStorageSync('in_app_notifications');
              this.setData({ notifications: [] });
              
              wx.showToast({
                title: '已清空',
                icon: 'success'
              });
              
              // 触发事件
              this.triggerEvent('clearAll');
            } catch (error) {
              console.error('[MessageCenter] 清空通知失败:', error);
              wx.showToast({
                title: '清空失败',
                icon: 'none'
              });
            }
          }
        }
      });
    },

    /**
     * 关闭消息中心
     */
    onClose() {
      this.triggerEvent('close');
    }
  }
});