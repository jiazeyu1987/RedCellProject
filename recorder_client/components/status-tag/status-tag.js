Component({
  /**
   * 状态标签组件的属性列表
   */
  properties: {
    // 标签文本
    text: {
      type: String,
      value: ''
    },
    // 标签类型
    type: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'primary', 'success', 'warning', 'error', 'info']
    },
    // 状态类型
    status: {
      type: String,
      value: '',
      optionalTypes: ['pending', 'processing', 'completed', 'cancelled', 'paused', 'expired', 'online', 'offline', 'busy', 'idle']
    },
    // 标签尺寸
    size: {
      type: String,
      value: 'medium',
      optionalTypes: ['small', 'medium', 'large']
    },
    // 标签形状
    shape: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'rounded', 'round', 'square']
    },
    // 标签样式
    variant: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'bordered', 'filled']
    },
    // 左侧图标
    icon: {
      type: String,
      value: ''
    },
    // 右侧图标
    suffixIcon: {
      type: String,
      value: ''
    },
    // 是否显示状态点
    dot: {
      type: Boolean,
      value: false
    },
    // 是否可关闭
    closable: {
      type: Boolean,
      value: false
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 自定义颜色
    color: {
      type: String,
      value: ''
    },
    // 自定义背景色
    backgroundColor: {
      type: String,
      value: ''
    },
    // 自定义边框色
    borderColor: {
      type: String,
      value: ''
    },
    // 自定义样式类
    extraClass: {
      type: String,
      value: ''
    },
    // 自定义内联样式
    extraStyle: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    tagClass: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 标签点击事件
     */
    onTagClick(e) {
      if (this.properties.disabled || !this.properties.clickable) {
        return;
      }

      this.triggerEvent('click', {
        text: this.properties.text,
        type: this.properties.type,
        status: this.properties.status
      });
    },

    /**
     * 关闭按钮点击事件
     */
    onCloseClick(e) {
      e.stopPropagation();
      
      if (this.properties.disabled) {
        return;
      }

      this.triggerEvent('close', {
        text: this.properties.text,
        type: this.properties.type,
        status: this.properties.status
      });
    },

    /**
     * 设置标签文本
     */
    setText(text) {
      this.setData({
        text: text
      });
    },

    /**
     * 设置标签类型
     */
    setType(type) {
      this.setData({
        type: type
      });
      this.updateTagClass();
    },

    /**
     * 设置标签状态
     */
    setStatus(status) {
      this.setData({
        status: status
      });
      this.updateTagClass();
    },

    /**
     * 设置禁用状态
     */
    setDisabled(disabled) {
      this.setData({
        disabled: disabled
      });
      this.updateTagClass();
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateTagClass();
      this.updateCustomStyle();
    }
  },

  /**
   * 监听器
   */
  observers: {
    'type, status, size, shape, variant, clickable, disabled': function() {
      this.updateTagClass();
    },
    'color, backgroundColor, borderColor': function() {
      this.updateCustomStyle();
    }
  },

  /**
   * 更新标签样式类
   */
  updateTagClass() {
    let tagClass = 'status-tag';
    
    // 类型或状态样式
    if (this.properties.status) {
      tagClass += ` tag-${this.properties.status}`;
    } else if (this.properties.type) {
      tagClass += ` tag-${this.properties.type}`;
    }
    
    // 尺寸样式
    if (this.properties.size) {
      tagClass += ` tag-${this.properties.size}`;
    }
    
    // 形状样式
    if (this.properties.shape && this.properties.shape !== 'default') {
      tagClass += ` tag-${this.properties.shape}`;
    }
    
    // 变体样式
    if (this.properties.variant && this.properties.variant !== 'default') {
      tagClass += ` tag-${this.properties.variant}`;
    }
    
    // 可点击样式
    if (this.properties.clickable) {
      tagClass += ' tag-clickable';
    }
    
    // 禁用样式
    if (this.properties.disabled) {
      tagClass += ' tag-disabled';
    }

    this.setData({
      tagClass: tagClass
    });
  },

  /**
   * 更新自定义样式
   */
  updateCustomStyle() {
    let customStyle = this.properties.extraStyle || '';
    
    if (this.properties.color) {
      customStyle += `color: ${this.properties.color};`;
    }
    
    if (this.properties.backgroundColor) {
      customStyle += `background-color: ${this.properties.backgroundColor};`;
    }
    
    if (this.properties.borderColor) {
      customStyle += `border-color: ${this.properties.borderColor};`;
    }

    this.setData({
      extraStyle: customStyle
    });
  }
});