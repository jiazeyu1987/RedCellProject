Component({
  /**
   * 底部导航栏组件的属性列表
   */
  properties: {
    // 导航项列表
    items: {
      type: Array,
      value: []
    },
    // 当前激活的索引
    activeIndex: {
      type: Number,
      value: 0
    },
    // 主题色彩
    theme: {
      type: String,
      value: 'primary',
      optionalTypes: ['primary', 'success', 'warning', 'dark']
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
    // 是否固定在底部
    fixed: {
      type: Boolean,
      value: true
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
     * 导航项点击事件
     */
    onNavItemClick(e) {
      const { index, key } = e.currentTarget.dataset;
      const item = this.properties.items[index];
      
      if (!item || item.disabled) {
        return;
      }

      // 更新激活状态
      this.updateActiveState(index);

      // 触发自定义事件
      this.triggerEvent('change', {
        index: index,
        key: key,
        item: item
      });

      // 如果有跳转路径，执行页面跳转
      if (item.url) {
        this.navigateToPage(item.url, item.switchTab);
      }
    },

    /**
     * 更新激活状态
     */
    updateActiveState(activeIndex) {
      const items = this.properties.items.map((item, index) => ({
        ...item,
        active: index === activeIndex
      }));

      this.setData({
        items: items
      });

      // 更新激活索引
      this.setData({
        activeIndex: activeIndex
      });
    },

    /**
     * 页面跳转
     */
    navigateToPage(url, switchTab = false) {
      if (switchTab) {
        wx.switchTab({
          url: url,
          fail: (err) => {
            console.error('导航跳转失败:', err);
          }
        });
      } else {
        wx.navigateTo({
          url: url,
          fail: (err) => {
            console.error('页面跳转失败:', err);
            // 如果navigateTo失败，尝试使用redirectTo
            wx.redirectTo({
              url: url,
              fail: (redirectErr) => {
                console.error('页面重定向失败:', redirectErr);
              }
            });
          }
        });
      }
    },

    /**
     * 设置角标
     */
    setBadge(index, badge) {
      const items = [...this.properties.items];
      if (items[index]) {
        items[index].badge = badge;
        this.setData({
          items: items
        });
      }
    },

    /**
     * 清除角标
     */
    clearBadge(index) {
      this.setBadge(index, 0);
    },

    /**
     * 设置项目启用/禁用状态
     */
    setItemDisabled(index, disabled) {
      const items = [...this.properties.items];
      if (items[index]) {
        items[index].disabled = disabled;
        this.setData({
          items: items
        });
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化激活状态
      this.updateActiveState(this.properties.activeIndex);
    }
  },

  /**
   * 监听器
   */
  observers: {
    'activeIndex': function(newActiveIndex) {
      this.updateActiveState(newActiveIndex);
    },
    'items': function(newItems) {
      // 确保新的items数据中包含激活状态
      const activeIndex = this.properties.activeIndex;
      this.updateActiveState(activeIndex);
    }
  }
});