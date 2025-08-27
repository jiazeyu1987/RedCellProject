// components/modal/index.js
Component({
  properties: {
    // 是否显示弹框
    show: {
      type: Boolean,
      value: false
    },
    // 弹框标题
    title: {
      type: String,
      value: ''
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      value: true
    },
    // 是否可以点击遮罩关闭
    maskClosable: {
      type: Boolean,
      value: true
    },
    // 弹框宽度
    width: {
      type: String,
      value: '90%'
    },
    // 弹框高度
    height: {
      type: String,
      value: 'auto'
    },
    // 弹框位置 center/bottom
    position: {
      type: String,
      value: 'center'
    },
    // 自定义类名
    customClass: {
      type: String,
      value: ''
    },
    // 是否显示底部按钮
    showFooter: {
      type: Boolean,
      value: false
    },
    // 取消按钮文本
    cancelText: {
      type: String,
      value: '取消'
    },
    // 确认按钮文本
    confirmText: {
      type: String,
      value: '确定'
    }
  },

  data: {
  },

  methods: {
    // 点击遮罩
    onMaskTap() {
      if (this.data.maskClosable) {
        this.closeModal();
      }
    },

    // 关闭弹框
    closeModal() {
      this.triggerEvent('close');
    },

    // 点击关闭按钮
    onCloseTap() {
      this.closeModal();
    },

    // 点击取消按钮
    onCancelTap() {
      this.triggerEvent('cancel');
      this.closeModal();
    },

    // 点击确认按钮
    onConfirmTap() {
      this.triggerEvent('confirm');
    }
  }
});