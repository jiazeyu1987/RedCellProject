# 解决微信小程序按钮蓝色 Hover 遮罩问题

## 问题描述

微信小程序的 `<button>` 组件默认带有 `hover-class="button-hover"` 效果，当用户点击按钮时会显示一个蓝色的遮罩层，这可能会影响自定义按钮的视觉效果。

## 解决方案

### 1. 对于原生 button 组件

直接在 button 标签上添加 `hover-class="none"` 来禁用默认的 hover 效果：

```xml
<!-- 禁用 hover 效果 -->
<button hover-class="none">按钮文字</button>

<!-- 或者自定义 hover 样式 -->
<button hover-class="my-hover">按钮文字</button>
```

### 2. 对于自定义 button 组件

我们已经修改了 `/components/button/button` 组件：

#### 使用方式

```xml
<!-- 默认禁用蓝色遮罩（推荐） -->
<button text="按钮文字" type="primary"></button>

<!-- 启用自定义 hover 效果 -->
<button text="按钮文字" type="primary" disable-hover="{{false}}"></button>

<!-- 动态控制 hover 效果 -->
<button text="按钮文字" type="primary" disable-hover="{{!showHover}}"></button>
```

#### 组件属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `disable-hover` | Boolean | `true` | 是否禁用 hover 效果 |

### 3. 自定义 hover 样式

在组件样式中，我们提供了 `.button-hover` 类来定义自定义的 hover 效果：

```css
.button-hover {
  opacity: 0.8;
  transform: scale(0.98);
}
```

这个效果不会覆盖按钮的背景色，只会改变透明度和大小。

## 优势

1. **保持视觉一致性**：避免蓝色遮罩干扰自定义按钮样式
2. **灵活控制**：可以根据需要启用或禁用 hover 效果
3. **更好的用户体验**：自定义 hover 效果更自然，不会突兀地覆盖背景
4. **向后兼容**：默认禁用，不影响现有代码

## 测试页面

已创建测试页面 `/pages/hover-test/hover-test` 来演示不同的 hover 效果对比。

## 全局配置

在 `app.wxss` 中已经添加了全局样式来确保所有原生 button 的默认样式被重置：

```css
button:hover,
button:focus,
button:active,
button.button-hover {
  border: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
  outline: 0 !important;
}
```

## 使用建议

1. **新项目**：直接使用自定义 button 组件，默认已禁用蓝色遮罩
2. **现有项目**：
   - 对于原生 button，添加 `hover-class="none"`
   - 逐步迁移到自定义 button 组件
3. **特殊需求**：如果确实需要 hover 反馈，设置 `disable-hover="false"`