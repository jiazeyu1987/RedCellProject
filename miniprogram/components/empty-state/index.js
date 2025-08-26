// components/empty-state/index.js
Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 图标
    icon: {
      type: String,
      value: ''
    },
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 描述
    description: {
      type: String,
      value: ''
    },
    // 操作按钮文本
    actionText: {
      type: String,
      value: ''
    }
  },

  methods: {
    // 操作按钮点击
    onActionTap() {
      this.triggerEvent('action');
    }
  }
});