Component({
  /**
   * 按钮组件的属性列表
   */
  properties: {
    // 按钮文字
    text: {
      type: String,
      value: ''
    },
    // 按钮类型
    type: {
      type: String,
      value: 'primary',
      optionalTypes: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'text', 'link']
    },
    // 按钮尺寸
    size: {
      type: String,
      value: 'medium',
      optionalTypes: ['large', 'medium', 'small', 'mini']
    },
    // 按钮形状
    shape: {
      type: String,
      value: 'default',
      optionalTypes: ['default', 'round', 'rounded', 'square']
    },
    // 是否为块级按钮
    block: {
      type: Boolean,
      value: false
    },
    // 是否为幽灵按钮
    ghost: {
      type: Boolean,
      value: false
    },
    // 是否为渐变按钮
    gradient: {
      type: Boolean,
      value: false
    },
    // 是否显示阴影
    shadow: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    },
    // 加载文字
    loadingText: {
      type: String,
      value: ''
    },
    // 左侧图标
    iconLeft: {
      type: String,
      value: ''
    },
    // 右侧图标
    iconRight: {
      type: String,
      value: ''
    },
    // 角标
    badge: {
      type: String,
      value: ''
    },
    // 微信开放能力
    openType: {
      type: String,
      value: ''
    },
    // 表单类型
    formType: {
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
    buttonClass: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 按钮点击事件
     */
    onButtonClick(e) {
      if (this.properties.disabled || this.properties.loading) {
        return;
      }

      this.triggerEvent('click', {
        type: this.properties.type,
        text: this.properties.text
      });
    },

    /**
     * 获取用户信息
     */
    onGetUserInfo(e) {
      this.triggerEvent('getuserinfo', e.detail);
    },

    /**
     * 客服会话
     */
    onContact(e) {
      this.triggerEvent('contact', e.detail);
    },

    /**
     * 获取手机号
     */
    onGetPhoneNumber(e) {
      this.triggerEvent('getphonenumber', e.detail);
    },

    /**
     * 打开设置页
     */
    onOpenSetting(e) {
      this.triggerEvent('opensetting', e.detail);
    },

    /**
     * 打开APP
     */
    onLaunchApp(e) {
      this.triggerEvent('launchapp', e.detail);
    },

    /**
     * 选择头像
     */
    onChooseAvatar(e) {
      this.triggerEvent('chooseavatar', e.detail);
    },

    /**
     * 设置加载状态
     */
    setLoading(loading, loadingText) {
      this.setData({
        loading: loading,
        loadingText: loadingText || this.properties.loadingText
      });
    },

    /**
     * 设置禁用状态
     */
    setDisabled(disabled) {
      this.setData({
        disabled: disabled
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateButtonClass();
    }
  },

  /**
   * 监听器
   */
  observers: {
    'type, size, shape, block, ghost, gradient, shadow': function() {
      this.updateButtonClass();
    }
  },

  /**
   * 更新按钮样式类
   */
  updateButtonClass() {
    let buttonClass = 'custom-button';
    
    // 类型样式
    if (this.properties.type) {
      buttonClass += ` button-${this.properties.type}`;
    }
    
    // 尺寸样式
    if (this.properties.size) {
      buttonClass += ` button-${this.properties.size}`;
    }
    
    // 形状样式
    if (this.properties.shape && this.properties.shape !== 'default') {
      buttonClass += ` button-${this.properties.shape}`;
    }
    
    // 块级按钮
    if (this.properties.block) {
      buttonClass += ' button-block';
    }
    
    // 幽灵按钮
    if (this.properties.ghost) {
      buttonClass += ' button-ghost';
    }
    
    // 渐变按钮
    if (this.properties.gradient) {
      buttonClass += ' button-gradient';
    }
    
    // 阴影按钮
    if (this.properties.shadow) {
      buttonClass += ' button-shadow';
    }

    this.setData({
      buttonClass: buttonClass
    });
  }
});