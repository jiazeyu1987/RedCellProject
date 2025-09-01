const CONSTANTS = require('../../constants/constants');

/**
 * 日程卡片组件
 * 用于显示单个日程安排的详细信息
 */
Component({
  properties: {
    // 日程数据
    schedule: {
      type: Object,
      value: {},
      observer: function(newVal) {
        if (newVal && newVal.id) {
          this.processScheduleData(newVal);
        }
      }
    },
    
    // 是否可选择（用于批量操作）
    selectable: {
      type: Boolean,
      value: false
    },
    
    // 是否已选中
    selected: {
      type: Boolean,
      value: false
    },
    
    // 卡片样式类型
    cardType: {
      type: String,
      value: 'default' // default, compact, detailed
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: true
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    }
  },

  data: {
    // 处理后的日程数据
    processedSchedule: {},
    
    // 状态颜色映射
    statusColorMap: {
      [CONSTANTS.SCHEDULE_STATUS.PENDING]: '#ff9500',
      [CONSTANTS.SCHEDULE_STATUS.CONFIRMED]: '#007aff',
      [CONSTANTS.SCHEDULE_STATUS.IN_PROGRESS]: '#34c759',
      [CONSTANTS.SCHEDULE_STATUS.COMPLETED]: '#28a745',
      [CONSTANTS.SCHEDULE_STATUS.CANCELLED]: '#ff3b30',
      [CONSTANTS.SCHEDULE_STATUS.RESCHEDULED]: '#af52de',
      [CONSTANTS.SCHEDULE_STATUS.NO_SHOW]: '#ff6b6b',
      [CONSTANTS.SCHEDULE_STATUS.OVERDUE]: '#dc3545'
    },
    
    // 优先级图标映射
    priorityIconMap: {
      [CONSTANTS.PRIORITY_LEVELS.LOW]: '⬇️',
      [CONSTANTS.PRIORITY_LEVELS.NORMAL]: '➡️',
      [CONSTANTS.PRIORITY_LEVELS.HIGH]: '⬆️',
      [CONSTANTS.PRIORITY_LEVELS.URGENT]: '🔥'
    }
  },

  methods: {
    /**
     * 处理日程数据
     */
    processScheduleData(schedule) {
      const processedSchedule = {
        ...schedule,
        // 格式化时间显示
        timeDisplay: this.formatTimeDisplay(schedule.startTime, schedule.endTime),
        
        // 状态文本
        statusText: CONSTANTS.SCHEDULE_STATUS_TEXT[schedule.status] || '未知状态',
        
        // 状态颜色
        statusColor: this.data.statusColorMap[schedule.status] || '#999',
        
        // 服务类型文本
        typeText: CONSTANTS.SCHEDULE_TYPES_TEXT[schedule.type] || '未知类型',
        
        // 优先级文本和图标
        priorityText: CONSTANTS.PRIORITY_LEVELS_TEXT[schedule.priority] || '普通',
        priorityIcon: this.data.priorityIconMap[schedule.priority] || '➡️',
        
        // 是否为今日日程
        isToday: this.isToday(schedule.startTime),
        
        // 是否已过期
        isOverdue: this.isOverdue(schedule.startTime),
        
        // 时间状态
        timeStatus: this.getTimeStatus(schedule.startTime, schedule.endTime, schedule.status)
      };
      
      this.setData({
        processedSchedule
      });
    },

    /**
     * 格式化时间显示
     */
    formatTimeDisplay(startTime, endTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      const formatDate = (date) => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day}`;
      };
      
      // 如果是同一天
      if (startDate.toDateString() === endDate.toDateString()) {
        return {
          date: formatDate(startDate),
          time: `${formatTime(startDate)} - ${formatTime(endDate)}`,
          fullTime: `${formatDate(startDate)} ${formatTime(startDate)} - ${formatTime(endDate)}`
        };
      } else {
        // 跨天服务
        return {
          date: `${formatDate(startDate)} - ${formatDate(endDate)}`,
          time: `${formatTime(startDate)} - ${formatTime(endDate)}`,
          fullTime: `${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}`
        };
      }
    },

    /**
     * 判断是否为今日
     */
    isToday(dateTime) {
      const today = new Date();
      const date = new Date(dateTime);
      return today.toDateString() === date.toDateString();
    },

    /**
     * 判断是否已过期
     */
    isOverdue(startTime) {
      return new Date() > new Date(startTime);
    },

    /**
     * 获取时间状态
     */
    getTimeStatus(startTime, endTime, status) {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (status === CONSTANTS.SCHEDULE_STATUS.COMPLETED) {
        return 'completed';
      }
      
      if (status === CONSTANTS.SCHEDULE_STATUS.CANCELLED) {
        return 'cancelled';
      }
      
      if (now > end) {
        return 'overdue';
      }
      
      if (now >= start && now <= end) {
        return 'ongoing';
      }
      
      if (now < start) {
        // 计算距离开始时间
        const timeDiff = start.getTime() - now.getTime();
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
        
        if (hoursDiff <= 1) {
          return 'soon'; // 即将开始（1小时内）
        } else if (hoursDiff <= 24) {
          return 'today'; // 今日
        } else {
          return 'upcoming'; // 未来
        }
      }
      
      return 'unknown';
    },

    /**
     * 点击卡片事件
     */
    onCardTap() {
      if (this.data.selectable) {
        // 批量选择模式
        const selected = !this.data.selected;
        this.setData({ selected });
        this.triggerEvent('select', {
          schedule: this.data.schedule,
          selected: selected
        });
      } else {
        // 正常点击进入详情
        this.triggerEvent('tap', {
          schedule: this.data.schedule
        });
      }
    },

    /**
     * 快速操作按钮点击
     */
    onActionTap(e) {
      e.stopPropagation();
      const action = e.currentTarget.dataset.action;
      
      this.triggerEvent('action', {
        action: action,
        schedule: this.data.schedule
      });
    },

    /**
     * 联系患者
     */
    onContactPatient() {
      const patient = this.data.schedule.patient;
      if (patient && patient.phone) {
        wx.makePhoneCall({
          phoneNumber: patient.phone,
          fail: (err) => {
            wx.showToast({
              title: '拨打失败',
              icon: 'none'
            });
          }
        });
      }
    },

    /**
     * 导航到患者地址
     */
    onNavigateToPatient() {
      const address = this.data.schedule.address;
      if (address && address.latitude && address.longitude) {
        wx.openLocation({
          latitude: address.latitude,
          longitude: address.longitude,
          name: address.name || '服务地址',
          address: address.detail || '',
          fail: (err) => {
            wx.showToast({
              title: '导航失败',
              icon: 'none'
            });
          }
        });
      }
    },

    /**
     * 开始服务
     */
    onStartService() {
      this.triggerEvent('action', {
        action: 'start_service',
        schedule: this.data.schedule
      });
    }
  }
});