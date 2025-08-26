// components/service-card/index.js
Component({
  properties: {
    // 服务数据
    serviceData: {
      type: Object,
      value: {}
    },
    // 是否选中
    selected: {
      type: Boolean,
      value: false
    },
    // 是否显示图标
    showIcon: {
      type: Boolean,
      value: true
    },
    // 是否显示元数据
    showMeta: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    // 卡片点击事件
    onCardTap() {
      this.triggerEvent('cardtap', {
        serviceData: this.data.serviceData,
        selected: this.data.selected
      });
    }
  }
});