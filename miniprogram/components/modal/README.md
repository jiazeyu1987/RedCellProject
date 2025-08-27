# 弹框组件使用说明

## 概述

项目中现在提供了两种支持点击遮罩关闭的弹框解决方案：

1. **改进的 cloudTipModal 组件** - 适用于简单的提示弹框
2. **新的通用 modal 组件** - 适用于各种复杂场景的弹框

## 1. cloudTipModal 组件

### 使用方法

```javascript
// 在页面的 .json 文件中引入
{
  "usingComponents": {
    "cloud-tip-modal": "/components/cloudTipModal/index"
  }
}
```

```xml
<!-- 在页面的 .wxml 中使用 -->
<cloud-tip-modal 
  showTipProps="{{showTip}}" 
  title="提示标题" 
  content="提示内容"
  mask-closable="{{true}}"
  bind:close="onModalClose">
</cloud-tip-modal>
```

### 属性说明

- `showTipProps`: 是否显示弹框
- `title`: 弹框标题
- `content`: 弹框内容
- `mask-closable`: 是否可以点击遮罩关闭（默认true）

### 事件

- `close`: 弹框关闭时触发

## 2. 通用 modal 组件

### 使用方法

```javascript
// 在页面的 .json 文件中引入
{
  "usingComponents": {
    "custom-modal": "/components/modal/index"
  }
}
```

```xml
<!-- 基础用法 -->
<custom-modal 
  show="{{showModal}}"
  title="弹框标题"
  bind:close="onModalClose">
  <view>弹框内容</view>
</custom-modal>

<!-- 带底部按钮的弹框 -->
<custom-modal 
  show="{{showConfirmModal}}"
  title="确认操作"
  show-footer="{{true}}"
  cancel-text="取消"
  confirm-text="确定"
  mask-closable="{{false}}"
  bind:close="onModalClose"
  bind:cancel="onCancel"
  bind:confirm="onConfirm">
  <view>确认要执行此操作吗？</view>
</custom-modal>

<!-- 底部弹出的弹框 -->
<custom-modal 
  show="{{showBottomModal}}"
  title="选择选项"
  position="bottom"
  bind:close="onModalClose">
  <view>选择内容</view>
</custom-modal>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| show | Boolean | false | 是否显示弹框 |
| title | String | '' | 弹框标题 |
| showClose | Boolean | true | 是否显示关闭按钮 |
| maskClosable | Boolean | true | 是否可以点击遮罩关闭 |
| width | String | '90%' | 弹框宽度 |
| height | String | 'auto' | 弹框高度 |
| position | String | 'center' | 弹框位置（center/bottom） |
| customClass | String | '' | 自定义类名 |
| showFooter | Boolean | false | 是否显示底部按钮 |
| cancelText | String | '取消' | 取消按钮文本 |
| confirmText | String | '确定' | 确认按钮文本 |

### 事件

- `close`: 弹框关闭时触发
- `cancel`: 点击取消按钮时触发
- `confirm`: 点击确认按钮时触发

## 3. 现有页面的弹框改进

### 预约页面（booking）

预约页面的地址编辑弹框已经支持点击遮罩关闭：

```xml
<!-- 已改进 -->
<view class="modal-overlay" wx:if="{{showAddressModal}}" bindtap="closeAddressModal">
  <view class="address-modal" catchtap="">
    <!-- 弹框内容 -->
  </view>
</view>
```

### 其他页面

如果你想为其他页面添加支持点击遮罩关闭的弹框，可以：

1. **使用通用 modal 组件**（推荐）
2. **手动添加遮罩点击事件**

手动添加的方法：
```xml
<!-- 在遮罩层添加点击事件 -->
<view class="modal-overlay" wx:if="{{showModal}}" bindtap="closeModal">
  <!-- 在弹框容器上使用 catchtap="" 阻止事件冒泡 -->
  <view class="modal-container" catchtap="">
    <!-- 弹框内容 -->
  </view>
</view>
```

## 4. 最佳实践

### 何时使用点击遮罩关闭

✅ **适合的场景：**
- 信息展示弹框
- 选择选项弹框
- 非关键操作弹框

❌ **不适合的场景：**
- 确认删除等重要操作
- 表单提交确认
- 支付确认

### 示例代码

```javascript
Page({
  data: {
    showInfoModal: false,
    showConfirmModal: false
  },

  // 显示信息弹框（可点击遮罩关闭）
  showInfo() {
    this.setData({
      showInfoModal: true
    });
  },

  // 显示确认弹框（不可点击遮罩关闭）
  showConfirm() {
    this.setData({
      showConfirmModal: true
    });
  },

  // 关闭弹框
  closeModal() {
    this.setData({
      showInfoModal: false,
      showConfirmModal: false
    });
  },

  // 确认操作
  onConfirm() {
    // 执行操作
    wx.showToast({
      title: '操作成功',
      icon: 'success'
    });
    this.closeModal();
  }
});
```

## 5. 演示页面

访问 `/pages/modal-demo/index` 可以看到各种弹框的使用示例和效果对比。

通过测试导航页面 → UI组件测试 → 弹框组件演示 可以快速访问。

## 6. 迁移现有代码

如果你想将现有的 `wx.showModal` 替换为支持遮罩关闭的自定义弹框：

**原来的代码：**
```javascript
wx.showModal({
  title: '提示',
  content: '这是一个提示信息',
  success: (res) => {
    if (res.confirm) {
      console.log('用户点击确定');
    }
  }
});
```

**改为自定义弹框：**
```javascript
// 在 data 中添加
data: {
  showCustomModal: false,
  modalTitle: '',
  modalContent: ''
},

// 显示弹框的方法
showCustomModal(title, content) {
  this.setData({
    showCustomModal: true,
    modalTitle: title,
    modalContent: content
  });
},

// 关闭弹框
closeCustomModal() {
  this.setData({
    showCustomModal: false
  });
}
```

```xml
<custom-modal 
  show="{{showCustomModal}}"
  title="{{modalTitle}}"
  show-footer="{{true}}"
  mask-closable="{{true}}"
  bind:close="closeCustomModal"
  bind:confirm="onConfirmAction">
  <text>{{modalContent}}</text>
</custom-modal>
```

这样就可以在保持原有功能的基础上，增加点击遮罩关闭的能力。