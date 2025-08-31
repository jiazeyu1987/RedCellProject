Component({
  /**
   * 列表组件的属性列表
   */
  properties: {
    // 列表数据
    items: {
      type: Array,
      value: []
    },
    // 列表标题
    title: {
      type: String,
      value: ''
    },
    // 列表副标题
    subtitle: {
      type: String,
      value: ''
    },
    // 是否显示头部
    showHeader: {
      type: Boolean,
      value: false
    },
    // 是否显示底部
    showFooter: {
      type: Boolean,
      value: false
    },
    // 头部额外内容
    headerExtra: {
      type: Boolean,
      value: false
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      value: true
    },
    // 是否显示空状态
    showEmpty: {
      type: Boolean,
      value: true
    },
    // 空状态文案
    emptyText: {
      type: String,
      value: '暂无数据'
    },
    // 空状态图标
    emptyIcon: {
      type: String,
      value: ''
    },
    // 空状态操作
    emptyAction: {
      type: Boolean,
      value: false
    },
    // 列表类型
    type: {
      type: String,
      value: 'default', // default, bordered, card, divided, plain, compact
      optionalTypes: ['default', 'bordered', 'card', 'divided', 'plain', 'compact']
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
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 列表项点击事件
     */
    onItemClick(e) {
      const { index, item } = e.currentTarget.dataset;
      
      if (!this.properties.clickable || item.disabled) {
        return;
      }

      this.triggerEvent('itemclick', {
        index: index,
        item: item
      });
    },

    /**
     * 列表项长按事件
     */
    onItemLongPress(e) {
      const { index, item } = e.currentTarget.dataset;
      
      if (item.disabled) {
        return;
      }

      this.triggerEvent('itemlongpress', {
        index: index,
        item: item
      });
    },

    /**
     * 更新列表项
     */
    updateItem(index, newItem) {
      const items = [...this.properties.items];
      if (items[index]) {
        items[index] = { ...items[index], ...newItem };
        this.setData({
          items: items
        });
      }
    },

    /**
     * 添加列表项
     */
    addItem(item, index) {
      const items = [...this.properties.items];
      if (typeof index === 'number' && index >= 0) {
        items.splice(index, 0, item);
      } else {
        items.push(item);
      }
      this.setData({
        items: items
      });
    },

    /**
     * 删除列表项
     */
    removeItem(index) {
      const items = [...this.properties.items];
      if (items[index]) {
        items.splice(index, 1);
        this.setData({
          items: items
        });
      }
    },

    /**
     * 清空列表
     */
    clearItems() {
      this.setData({
        items: []
      });
    },

    /**
     * 滚动到指定项
     */
    scrollToItem(index) {
      const query = this.createSelectorQuery();
      query.select(`.list-item:nth-child(${index + 1})`).boundingClientRect();
      query.selectViewport().scrollOffset();
      query.exec((res) => {
        if (res[0] && res[1]) {
          wx.pageScrollTo({
            scrollTop: res[1].scrollTop + res[0].top - 100,
            duration: 300
          });
        }
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateListClass();
    }
  },

  /**
   * 监听器
   */
  observers: {
    'type': function(newType) {
      this.updateListClass();
    }
  },

  /**
   * 更新列表样式类
   */
  updateListClass() {
    let listClass = 'list-container';
    const type = this.properties.type;
    
    if (type && type !== 'default') {
      listClass += ` list-${type}`;
    }

    this.setData({
      listClass: listClass
    });
  }
});