Component({
  /**
   * 表单项组件的属性列表
   */
  properties: {
    // 表单项类型
    type: {
      type: String,
      value: 'input',
      optionalTypes: ['input', 'textarea', 'picker', 'switch', 'slider', 'radio', 'checkbox', 'custom']
    },
    // 标签文本
    label: {
      type: String,
      value: ''
    },
    // 标签额外内容
    labelExtra: {
      type: Boolean,
      value: false
    },
    // 表单值
    value: {
      type: null,
      value: ''
    },
    // 占位符
    placeholder: {
      type: String,
      value: ''
    },
    // 占位符样式
    placeholderStyle: {
      type: String,
      value: 'color: #999999'
    },
    // 是否必填
    required: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否有错误
    error: {
      type: Boolean,
      value: false
    },
    // 错误信息
    errorMessage: {
      type: String,
      value: ''
    },
    // 帮助文本
    help: {
      type: String,
      value: ''
    },
    // 右侧图标
    icon: {
      type: String,
      value: ''
    },

    // 输入框相关属性
    inputType: {
      type: String,
      value: 'text'
    },
    maxlength: {
      type: Number,
      value: 140
    },
    focus: {
      type: Boolean,
      value: false
    },
    confirmType: {
      type: String,
      value: 'done'
    },
    inputClass: {
      type: String,
      value: ''
    },

    // 文本域相关属性
    autoHeight: {
      type: Boolean,
      value: false
    },

    // 选择器相关属性
    pickerMode: {
      type: String,
      value: 'selector'
    },
    pickerRange: {
      type: Array,
      value: []
    },
    pickerRangeKey: {
      type: String,
      value: ''
    },
    pickerValue: {
      type: null,
      value: 0
    },
    pickerStart: {
      type: String,
      value: ''
    },
    pickerEnd: {
      type: String,
      value: ''
    },
    pickerFields: {
      type: String,
      value: 'day'
    },
    displayValue: {
      type: String,
      value: ''
    },

    // 开关相关属性
    switchColor: {
      type: String,
      value: '#007AFF'
    },

    // 滑块相关属性
    sliderMin: {
      type: Number,
      value: 0
    },
    sliderMax: {
      type: Number,
      value: 100
    },
    sliderStep: {
      type: Number,
      value: 1
    },
    showSliderValue: {
      type: Boolean,
      value: true
    },

    // 单选框相关属性
    radioOptions: {
      type: Array,
      value: []
    },
    radioColor: {
      type: String,
      value: '#007AFF'
    },

    // 复选框相关属性
    checkboxOptions: {
      type: Array,
      value: []
    },
    checkboxColor: {
      type: String,
      value: '#007AFF'
    },

    // 样式相关
    extraClass: {
      type: String,
      value: ''
    },
    extraStyle: {
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
    /**
     * 输入事件
     */
    onInput(e) {
      const value = e.detail.value;
      this.triggerEvent('input', {
        value: value,
        type: this.properties.type
      });
    },

    /**
     * 失焦事件
     */
    onBlur(e) {
      const value = e.detail.value;
      this.triggerEvent('blur', {
        value: value,
        type: this.properties.type
      });
    },

    /**
     * 聚焦事件
     */
    onFocus(e) {
      const value = e.detail.value;
      this.triggerEvent('focus', {
        value: value,
        type: this.properties.type
      });
    },

    /**
     * 确认事件
     */
    onConfirm(e) {
      const value = e.detail.value;
      this.triggerEvent('confirm', {
        value: value,
        type: this.properties.type
      });
    },

    /**
     * 选择器改变事件
     */
    onPickerChange(e) {
      const value = e.detail.value;
      this.triggerEvent('change', {
        value: value,
        type: 'picker',
        detail: e.detail
      });
    },

    /**
     * 选择器取消事件
     */
    onPickerCancel(e) {
      this.triggerEvent('cancel', {
        type: 'picker',
        detail: e.detail
      });
    },

    /**
     * 开关改变事件
     */
    onSwitchChange(e) {
      const value = e.detail.value;
      this.triggerEvent('change', {
        value: value,
        type: 'switch',
        detail: e.detail
      });
    },

    /**
     * 滑块改变事件
     */
    onSliderChange(e) {
      const value = e.detail.value;
      this.triggerEvent('change', {
        value: value,
        type: 'slider',
        detail: e.detail
      });
    },

    /**
     * 滑块拖动事件
     */
    onSliderChanging(e) {
      const value = e.detail.value;
      this.triggerEvent('changing', {
        value: value,
        type: 'slider',
        detail: e.detail
      });
    },

    /**
     * 单选框改变事件
     */
    onRadioChange(e) {
      const value = e.detail.value;
      this.triggerEvent('change', {
        value: value,
        type: 'radio',
        detail: e.detail
      });
    },

    /**
     * 复选框改变事件
     */
    onCheckboxChange(e) {
      const value = e.detail.value;
      this.triggerEvent('change', {
        value: value,
        type: 'checkbox',
        detail: e.detail
      });
    },

    /**
     * 图标点击事件
     */
    onIconClick(e) {
      this.triggerEvent('iconclick', {
        type: this.properties.type
      });
    },

    /**
     * 设置值
     */
    setValue(value) {
      this.setData({
        value: value
      });
    },

    /**
     * 获取值
     */
    getValue() {
      return this.properties.value;
    },

    /**
     * 设置错误状态
     */
    setError(error, errorMessage) {
      this.setData({
        error: error,
        errorMessage: errorMessage || ''
      });
    },

    /**
     * 清除错误状态
     */
    clearError() {
      this.setData({
        error: false,
        errorMessage: ''
      });
    },

    /**
     * 验证表单
     */
    validate() {
      const value = this.properties.value;
      const required = this.properties.required;

      // 必填验证
      if (required) {
        if (this.properties.type === 'checkbox') {
          if (!value || !value.length) {
            this.setError(true, '请选择至少一项');
            return false;
          }
        } else if (!value && value !== 0) {
          this.setError(true, '此项为必填项');
          return false;
        }
      }

      this.clearError();
      return true;
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      
    }
  }
});