Component({
  /**
   * 弹窗组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 弹窗标题
    title: {
      type: String,
      value: ''
    },
    // 弹窗副标题
    subtitle: {
      type: String,
      value: ''
    },
    // 是否显示头部
    showHeader: {
      type: Boolean,
      value: true
    },
    // 是否显示底部
    showFooter: {
      type: Boolean,
      value: true
    },
    // 头部额外内容
    headerExtra: {
      type: Boolean,
      value: false
    },
    // 底部自定义内容
    footerCustom: {
      type: Boolean,
      value: false
    },
    // 是否显示关闭按钮
    closable: {
      type: Boolean,
      value: true
    },
    // 点击遮罩是否关闭
    maskClosable: {
      type: Boolean,
      value: true
    },
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    // 是否显示确认按钮
    showConfirm: {
      type: Boolean,
      value: true
    },
    // 取消按钮文字
    cancelText: {
      type: String,
      value: '取消'
    },
    // 确认按钮文字
    confirmText: {
      type: String,
      value: '确定'
    },
    // 确认按钮加载状态
    confirmLoading: {
      type: Boolean,
      value: false
    },
    // 弹窗类型
    type: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'center', 'bottom', 'top', 'fullscreen']
    },
    // 弹窗尺寸
    size: {
      type: String,
      value: 'medium',
      optionalTypes: ['small', 'medium', 'large']
    },
    // 弹窗主题
    theme: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'success', 'warning', 'error']
    },
    // 自定义样式类
    extraClass: {
      type: String,
      value: ''
    },
    // 容器自定义样式
    containerStyle: {
      type: String,
      value: ''
    },
    // 遮罩自定义样式
    overlayStyle: {
      type: String,
      value: ''
    },
    // 动画持续时间
    duration: {
      type: Number,
      value: 300
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animating: false,
    modalClass: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 遮罩点击事件
     */
    onOverlayClick(e) {
      if (e.target === e.currentTarget && this.properties.maskClosable) {
        this.close();
      }
    },

    /**
     * 容器点击事件（阻止冒泡）
     */
    onContainerClick(e) {
      e.stopPropagation();
    },

    /**
     * 关闭按钮点击
     */
    onCloseClick() {
      this.close();
    },

    /**
     * 取消按钮点击
     */
    onCancelClick() {
      this.triggerEvent('cancel');
      this.close();
    },

    /**
     * 确认按钮点击
     */
    onConfirmClick() {
      this.triggerEvent('confirm');
    },

    /**
     * 显示弹窗
     */
    show() {
      this.setData({
        visible: true,
        animating: true
      });

      // 触发显示事件
      this.triggerEvent('show');

      // 动画结束后设置状态
      setTimeout(() => {
        this.setData({
          animating: false
        });
        this.triggerEvent('aftershow');
      }, this.properties.duration);
    },

    /**
     * 关闭弹窗
     */
    close() {
      this.setData({
        animating: true
      });

      // 触发关闭事件
      this.triggerEvent('close');

      // 动画结束后隐藏
      setTimeout(() => {
        this.setData({
          visible: false,
          animating: false
        });
        this.triggerEvent('afterclose');
      }, this.properties.duration);
    },

    /**
     * 切换显示状态
     */
    toggle() {
      if (this.properties.visible) {
        this.close();
      } else {
        this.show();
      }
    },

    /**
     * 设置确认按钮加载状态
     */
    setConfirmLoading(loading) {
      this.setData({
        confirmLoading: loading
      });
    },

    /**
     * 更新弹窗样式类
     */
    updateModalClass() {
      let modalClass = 'modal-container';
      
      // 类型样式
      if (this.properties.type) {
        modalClass += ` modal-${this.properties.type}`;
      }
      
      // 尺寸样式
      if (this.properties.size && this.properties.size !== 'medium') {
        modalClass += ` modal-${this.properties.size}`;
      }
      
      // 主题样式
      if (this.properties.theme && this.properties.theme !== 'default') {
        modalClass += ` modal-${this.properties.theme}`;
      }
      
      // 无头部样式
      if (!this.properties.showHeader) {
        modalClass += ' modal-no-header';
      }
      
      // 无底部样式
      if (!this.properties.showFooter) {
        modalClass += ' modal-no-footer';
      }

      this.setData({
        modalClass: modalClass
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateModalClass();
    }
  },

  /**
   * 监听器
   */
  observers: {
    'visible': function(newVisible) {
      if (newVisible) {
        this.show();
      } else {
        this.close();
      }
    },
    'type, size, theme, showHeader, showFooter': function() {
      this.updateModalClass();
    }
  }
});