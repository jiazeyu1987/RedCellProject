Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 标题
    title: {
      type: String,
      value: '请选择'
    },
    // 选项数组
    options: {
      type: Array,
      value: []
    },
    // 当前选中的值
    value: {
      type: String,
      value: ''
    },
    // 是否点击遮罩关闭
    maskClosable: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    selectedIndex: [0], // picker-view需要数组格式
    tempSelectedValue: '', // 临时选中的值
    tempSelectedIndex: 0
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化选中索引
     */
    initSelectedIndex() {
      const { options, value } = this.properties;
      if (!options || options.length === 0) return;
      
      const index = options.findIndex(option => option.value === value);
      const selectedIndex = index >= 0 ? index : 0;
      
      this.setData({
        selectedIndex: [selectedIndex],
        tempSelectedIndex: selectedIndex,
        tempSelectedValue: options[selectedIndex]?.value || ''
      });
    },

    /**
     * picker选择改变
     */
    onPickerChange(e) {
      const index = e.detail.value[0];
      const { options } = this.properties;
      
      if (options && options[index]) {
        this.setData({
          tempSelectedIndex: index,
          tempSelectedValue: options[index].value
        });
      }
    },

    /**
     * 确认选择
     */
    onConfirm() {
      const { options } = this.properties;
      const { tempSelectedIndex } = this.data;
      
      if (options && options[tempSelectedIndex]) {
        const selectedOption = options[tempSelectedIndex];
        
        // 触发选择事件
        this.triggerEvent('confirm', {
          value: selectedOption.value,
          option: selectedOption,
          index: tempSelectedIndex
        });
      }
      
      this.hide();
    },

    /**
     * 取消选择
     */
    onCancel() {
      this.triggerEvent('cancel');
      this.hide();
    },

    /**
     * 遮罩点击
     */
    onOverlayClick() {
      if (this.properties.maskClosable) {
        this.onCancel();
      }
    },

    /**
     * 显示picker
     */
    show() {
      this.initSelectedIndex();
      this.setData({ visible: true });
      this.triggerEvent('show');
    },

    /**
     * 隐藏picker
     */
    hide() {
      this.setData({ visible: false });
      this.triggerEvent('hide');
    }
  },

  /**
   * 监听器
   */
  observers: {
    'visible': function(newVisible) {
      if (newVisible) {
        this.initSelectedIndex();
      }
    },
    'value, options': function() {
      if (this.properties.visible) {
        this.initSelectedIndex();
      }
    }
  },

  /**
   * 生命周期
   */
  lifetimes: {
    attached() {
      this.initSelectedIndex();
    }
  }
});