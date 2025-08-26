// components/loading/index.js
Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 加载类型：fullscreen, inline, skeleton, list
    type: {
      type: String,
      value: 'inline'
    },
    // 加载文本
    text: {
      type: String,
      value: ''
    },
    // 骨架屏行数
    rows: {
      type: Number,
      value: 3
    },
    // 是否显示头像
    showAvatar: {
      type: Boolean,
      value: true
    }
  },

  data: {
    skeletonRows: []
  },

  observers: {
    'rows': function(rows) {
      this.generateSkeletonRows(rows);
    }
  },

  lifetimes: {
    attached() {
      this.generateSkeletonRows(this.data.rows);
    }
  },

  methods: {
    // 生成骨架屏行数据
    generateSkeletonRows(rows) {
      const skeletonRows = [];
      for (let i = 0; i < rows; i++) {
        skeletonRows.push({
          width: Math.floor(Math.random() * 40) + 60, // 60-100%
          showSubLine: i === 0 || Math.random() > 0.5
        });
      }
      this.setData({
        skeletonRows: skeletonRows
      });
    }
  }
});