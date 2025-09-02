# 按钮蓝色边框问题修复方案

## 问题描述
微信小程序项目中所有的按钮都有一层蓝色边框，这层蓝色边框会束缚文字的宽度，影响视觉效果。

## 问题原因
1. 微信小程序原生 `button` 组件默认带有蓝色边框和 `::after` 伪元素
2. 原有的全局样式清除不够彻底
3. 自定义按钮组件的样式权重不够高

## 解决方案

### 1. 全局样式优化 (app.wxss & styles/global.wxss)

**新增全局样式规则：**
```css
/* 完全移除微信小程序button组件的默认样式 */
button {
  border: none !important;
  background: transparent !important;
  outline: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

button::after {
  display: none !important;
  border: none !important;
  background: none !important;
  content: none !important;
}

button::before {
  display: none !important;
  border: none !important;
  background: none !important;
  content: none !important;
}

/* 移除原生button的蓝色边框 */
button[plain] {
  border: none !important;
  background: transparent !important;
}

/* 移除点击时的蓝色背景 */
button:not([disabled]):active {
  background-color: transparent !important;
}
```

### 2. 自定义按钮组件优化 (components/button/button.wxss)

**主要优化内容：**

1. **增强权重：** 所有样式属性添加 `!important` 声明
2. **完全移除伪元素：** 彻底清除 `::after` 和 `::before` 伪元素
3. **文字容器优化：** 
   ```css
   .button-text {
     flex: 1;
     text-align: center;
     white-space: nowrap;
     overflow: visible;
     min-width: auto;
     width: auto;
     max-width: none;
   }
   ```
4. **模板优化：** 将按钮文字容器从 `view` 改为 `text` 元素

### 3. 页面特定按钮修复

**修复的页面：**
- `pages/user-settings/user-settings.wxss` - 退出登录按钮
- `pages/relationship-map/relationship-map.wxss` - 工具栏按钮和操作按钮

**修复方式：** 为每个原生button添加完整的样式重置规则

### 4. 创建测试页面

**新增文件：**
- `pages/button-test/button-test.*` - 按钮样式测试页面
- 在 `app.json` 中注册测试页面

## 修复效果

1. ✅ **移除蓝色边框：** 所有按钮不再显示蓝色边框
2. ✅ **文字不受束缚：** 按钮文字宽度不再受到限制
3. ✅ **保持原有功能：** 按钮的点击、禁用等功能正常
4. ✅ **样式一致性：** 自定义按钮组件和原生按钮样式统一
5. ✅ **兼容性：** 修复后的样式兼容不同场景和状态

## 关键文件修改列表

- ✅ `app.wxss` - 新建全局样式文件
- ✅ `styles/global.wxss` - 增强按钮样式重置
- ✅ `components/button/button.wxss` - 优化自定义按钮组件样式
- ✅ `components/button/button.wxml` - 优化按钮模板结构
- ✅ `pages/user-settings/user-settings.wxss` - 修复退出按钮
- ✅ `pages/relationship-map/relationship-map.wxss` - 修复页面按钮
- ✅ `pages/button-test/*` - 新增测试页面

## 使用建议

1. **优先使用自定义按钮组件：** 对于新开发的功能，推荐使用自定义 `button` 组件
2. **原生按钮需要样式重置：** 如果必须使用原生button，确保添加样式重置规则
3. **测试验证：** 可以访问 `pages/button-test/button-test` 页面查看修复效果

## 注意事项

1. 使用了 `!important` 提高样式权重，确保覆盖微信小程序默认样式
2. 修复后的按钮保持了所有微信小程序的原生功能（open-type等）
3. 样式修复兼容暗色主题和响应式设计