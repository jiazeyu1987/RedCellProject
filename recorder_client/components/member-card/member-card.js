Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 成员信息
    member: {
      type: Object,
      value: {},
      observer(newVal) {
        if (newVal && newVal.id) {
          this.processData();
        }
      }
    },
    // 卡片样式
    cardStyle: {
      type: String,
      value: 'default' // default, compact, detailed
    },
    // 是否显示快捷操作
    showQuickActions: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 处理后的数据
    displayData: {},
    // 健康状态映射
    healthStatusMap: {
      'healthy': { text: '健康', color: '#34c759', icon: 'heart' },
      'chronic': { text: '慢性病', color: '#ff9500', icon: 'medical' },
      'critical': { text: '重症', color: '#ff3b30', icon: 'warning' }
    },
    // 服务频率映射
    frequencyMap: {
      'daily': { text: '每日', color: '#007AFF' },
      'weekly': { text: '每周', color: '#5856d6' },
      'monthly': { text: '每月', color: '#af52de' }
    },
    // 年龄分组
    ageGroup: '',
    // 相对时间
    relativeTime: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理数据
     */
    processData() {
      const member = this.data.member;
      if (!member || !member.id) return;
      
      // 处理年龄分组
      let ageGroup = '';
      if (member.age <= 18) {
        ageGroup = 'child';
      } else if (member.age < 60) {
        ageGroup = 'adult';
      } else {
        ageGroup = 'elderly';
      }
      
      // 计算相对时间
      const relativeTime = this.formatRelativeTime(member.lastServiceTime);
      
      // 处理显示用的数据
      const displayData = {
        ...member,
        // 脱敏处理
        phoneDisplay: this.maskPhone(member.phone),
        idCardDisplay: this.maskIdCard(member.idCard),
        // 格式化时间
        lastServiceDisplay: this.formatDateTime(member.lastServiceTime),
        // 健康状态
        healthStatusInfo: this.data.healthStatusMap[member.healthStatus] || {},
        // 服务频率
        frequencyInfo: this.data.frequencyMap[member.serviceFrequency] || {},
        // 年龄组
        ageGroup: ageGroup
      };
      
      this.setData({
        displayData,
        ageGroup,
        relativeTime
      });
    },

    /**
     * 手机号脱敏
     */
    maskPhone(phone) {
      if (!phone) return '';
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    /**
     * 身份证脱敏
     */
    maskIdCard(idCard) {
      if (!idCard) return '';
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return '';
      
      const date = new Date(dateTimeStr);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return '今天 ' + date.toTimeString().substr(0, 5);
      } else if (diffDays === 1) {
        return '昨天 ' + date.toTimeString().substr(0, 5);
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return date.toLocaleDateString();
      }
    },

    /**
     * 格式化相对时间
     */
    formatRelativeTime(dateTimeStr) {
      if (!dateTimeStr) return '暂无记录';
      
      const date = new Date(dateTimeStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 1) {
        return '刚刚';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays < 30) {
        return `${diffDays}天前`;
      } else {
        return '很久以前';
      }
    },

    /**
     * 卡片点击事件
     */
    onCardTap() {
      this.triggerEvent('tap', { member: this.data.member });
    },

    /**
     * 快捷操作 - 联系
     */
    onContactTap(event) {
      event.stopPropagation();
      this.triggerEvent('contact', { member: this.data.member });
    },

    /**
     * 快捷操作 - 预约
     */
    onAppointmentTap(event) {
      event.stopPropagation();
      this.triggerEvent('appointment', { member: this.data.member });
    },

    /**
     * 快捷操作 - 健康记录
     */
    onHealthRecordTap(event) {
      event.stopPropagation();
      this.triggerEvent('healthrecord', { member: this.data.member });
    },

    /**
     * 快捷操作 - 服务历史
     */
    onServiceHistoryTap(event) {
      event.stopPropagation();
      this.triggerEvent('servicehistory', { member: this.data.member });
    },

    /**
     * 头像加载错误处理
     */
    onAvatarError() {
      const defaultAvatar = this.data.member.gender === 'female' 
        ? '/images/avatar-female-default.png' 
        : '/images/avatar-male-default.png';
      
      this.setData({
        'displayData.avatar': defaultAvatar
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.processData();
    }
  }
});