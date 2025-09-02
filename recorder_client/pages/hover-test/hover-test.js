Page({
  data: {
    showHover: false
  },
  
  onLoad: function (options) {
    
  },

  toggleHover() {
    this.setData({
      showHover: !this.data.showHover
    });
  }
});