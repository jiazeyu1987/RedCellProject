Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 错误标题
    title: {
      type: String,
      value: '加载失败'
    },
    // 错误描述
    description: {
      type: String,
      value: '网络连接异常，请检查网络后重试'
    },
    // 错误图标
    icon: {
      type: String,
      value: 'error'
    },
    // 操作按钮文本
    actionText: {
      type: String,
      value: '重试'
    },
    // 是否显示操作按钮
    showAction: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 操作按钮点击
     */
    onActionTap() {
      this.triggerEvent('action');
    }
  }
});