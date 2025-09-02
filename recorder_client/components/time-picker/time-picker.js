// components/time-picker/time-picker.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前时间值
    value: {
      type: String,
      value: ''
    },
    // 时间格式
    format: {
      type: String,
      value: 'HH:mm'
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 占位符
    placeholder: {
      type: String,
      value: '请选择时间'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    displayTime: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 时间选择变化
     */
    onTimeChange(e) {
      const time = e.detail.value;
      this.setData({
        displayTime: time
      });
      
      this.triggerEvent('change', {
        value: time
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.setData({
        displayTime: this.properties.value
      });
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'value': function(newVal) {
      this.setData({
        displayTime: newVal
      });
    }
  }
});