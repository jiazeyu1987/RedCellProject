// components/health-metric-card/index.js
Component({
  properties: {
    // 指标名称
    name: {
      type: String,
      value: ''
    },
    // 指标值
    value: {
      type: String,
      value: ''
    },
    // 单位
    unit: {
      type: String,
      value: ''
    },
    // 图标
    icon: {
      type: String,
      value: ''
    },
    // 图标颜色
    iconColor: {
      type: String,
      value: '#1890FF'
    },
    // 状态：normal, warning, danger
    status: {
      type: String,
      value: 'normal'
    },
    // 状态文本
    statusText: {
      type: String,
      value: ''
    },
    // 趋势图标
    trendIcon: {
      type: String,
      value: ''
    },
    // 正常范围
    normalRange: {
      type: String,
      value: ''
    },
    // 是否显示范围
    showRange: {
      type: Boolean,
      value: true
    },
    // 最后更新时间
    lastUpdateTime: {
      type: String,
      value: ''
    }
  },

  methods: {
    // 卡片点击事件
    onCardTap() {
      this.triggerEvent('cardtap', {
        name: this.data.name,
        value: this.data.value,
        status: this.data.status
      });
    }
  }
});