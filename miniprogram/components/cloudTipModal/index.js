Component({

  /**
   * 页面的初始数据
   */
  data: {
    showTip: false,
  },
  properties: {
    showTipProps: Boolean,
    title: String,
    content: String,
    // 是否可以点击遮罩层关闭
    maskClosable: {
      type: Boolean,
      value: true
    }
  },
  observers: {
    showTipProps: function(showTipProps) {
      this.setData({
        showTip: showTipProps
      });
    }
  },
  methods: {
    // 点击关闭按钮
    onClose(){
      this.setData({
        showTip: false
      });
      // 触发父组件事件
      this.triggerEvent('close');
    },
    
    // 点击遮罩层
    onMaskTap() {
      if (this.data.maskClosable) {
        this.onClose();
      }
    }
  }
});
