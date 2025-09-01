Component({
  /**
   * 卡片组件的属性列表
   */
  properties: {
    // 卡片标题
    title: {
      type: String,
      value: ''
    },
    // 卡片副标题
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
      value: false
    },
    // 是否显示额外内容
    extra: {
      type: Boolean,
      value: false
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
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: false
    },
    // 卡片类型
    type: {
      type: String,
      value: 'default', // default, bordered, shadow-none
      optionalTypes: ['default', 'bordered', 'shadow-none']
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    cardClass: 'card'
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 卡片点击事件
     */
    onCardClick() {
      if (this.properties.clickable) {
        this.triggerEvent('cardclick', {
          title: this.properties.title,
          subtitle: this.properties.subtitle
        });
      }
    },

    /**
     * 卡片长按事件
     */
    onCardLongPress() {
      this.triggerEvent('cardlongpress', {
        title: this.properties.title,
        subtitle: this.properties.subtitle
      });
    },

    /**
     * 更新卡片样式类
     */
    updateCardClass() {
      let cardClass = 'card';
      const type = this.properties.type;
      
      if (type === 'bordered') {
        cardClass += ' card-bordered';
      } else if (type === 'shadow-none') {
        cardClass += ' card-shadow-none';
      }

      if (this.properties.clickable) {
        cardClass += ' card-hover';
      }

      this.setData({
        cardClass: cardClass
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件实例进入页面节点树时执行
      this.updateCardClass();
    }
  },

  /**
   * 组件的私有方法
   */
  observers: {
    'type': function(newType) {
      this.updateCardClass();
    }
  }

});