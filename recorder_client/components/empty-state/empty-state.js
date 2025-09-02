Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 标题
    title: {
      type: String,
      value: '暂无数据'
    },
    // 描述
    description: {
      type: String,
      value: ''
    },
    // 图标
    icon: {
      type: String,
      value: 'empty'
    },
    // 操作按钮文本
    actionText: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onActionTap() {
      this.triggerEvent('action');
    }
  }
});