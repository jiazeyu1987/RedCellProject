// pages/modal-demo/index.js
Page({
  data: {
    // 各种弹框显示状态
    showCenterModal: false,
    showBottomModal: false,
    showCustomModal: false,
    showConfirmModal: false,
    
    // 示例数据
    demoText: '这是一个可以点击遮罩关闭的弹框示例'
  },

  // 显示居中弹框
  showCenter() {
    this.setData({
      showCenterModal: true
    });
  },

  // 显示底部弹框
  showBottom() {
    this.setData({
      showBottomModal: true
    });
  },

  // 显示自定义弹框
  showCustom() {
    this.setData({
      showCustomModal: true
    });
  },

  // 显示确认弹框
  showConfirm() {
    this.setData({
      showConfirmModal: true
    });
  },

  // 关闭弹框
  onModalClose() {
    this.setData({
      showCenterModal: false,
      showBottomModal: false,
      showCustomModal: false,
      showConfirmModal: false
    });
    
    wx.showToast({
      title: '弹框已关闭',
      icon: 'success'
    });
  },

  // 取消操作
  onModalCancel() {
    this.onModalClose();
    console.log('用户点击了取消');
  },

  // 确认操作
  onModalConfirm() {
    wx.showToast({
      title: '确认成功',
      icon: 'success'
    });
    
    // 延迟关闭弹框
    setTimeout(() => {
      this.onModalClose();
    }, 1000);
  },

  // 使用系统弹框对比
  showSystemModal() {
    wx.showModal({
      title: '系统弹框',
      content: '这是微信原生的弹框，只能通过按钮关闭，不能点击遮罩关闭',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '点击了确定',
            icon: 'success'
          });
        }
      }
    });
  }
});