# 项目组件和模块说明

## 核心模块架构

### 🏗️ 服务器端 (server/)

#### 认证模块
- **文件**: `middlewares/auth.js`
- **功能**: 用户和管理员认证中间件
- **关键函数**:
  - `authMiddleware`: 用户JWT认证
  - `adminAuthMiddleware`: 管理员认证（支持双格式）
  - `checkAdminPermission`: 权限检查

#### 数据模型
- **文件**: `models/User.js`
- **功能**: 用户数据操作封装
- **关键方法**:
  - `findByOpenId`: 通过微信OpenID查找用户
  - `create`: 创建新用户
  - `updateLoginInfo`: 更新登录信息

#### API路由
- **目录**: `routes/`
- **模块说明**:
  - `auth.js`: 认证相关API
  - `users.js`: 用户管理API
  - `admin.js`: 管理员功能API
  - `bookings.js`: 预约管理API
  - `health.js`: 健康数据API

### 📱 小程序端 (miniprogram/)

#### 页面结构
- **目录**: `pages/`
- **主要页面**:
  - `index`: 首页和服务入口
  - `login`: 用户登录页面
  - `health`: 健康数据管理
  - `booking`: 服务预约
  - `profile`: 个人中心

#### 组件库
- **目录**: `components/`
- **核心组件**:
  - `auth-guard`: 登录状态守卫
  - `health-metric-card`: 健康指标卡片
  - `service-card`: 服务项目卡片
  - `modal`: 通用模态框

#### 工具类
- **文件**: `utils/auth.js`
- **功能**: 认证状态管理和微信登录

### 🔧 管理后台 (admin-portal/)

#### 页面组件
- **目录**: `src/pages/`
- **主要页面**:
  - `Login`: 管理员登录
  - `Dashboard`: 数据概览
  - `UserPool`: 用户池管理
  - `ServiceProviders`: 服务者管理

#### API工具
- **文件**: `src/utils/api.js`
- **功能**: 
  - axios配置和拦截器
  - 统一错误处理
  - 自动token管理

### ☁️ 云函数 (cloudfunctions/)

#### 主函数
- **文件**: `quickstartFunctions/index.js`
- **功能**: 统一云函数入口
- **支持操作**:
  - 获取OpenID
  - 数据库CRUD操作
  - 健康数据管理
  - 社区功能

## 数据流向

### 认证流程
```
用户登录 → 微信授权 → 获取OpenID → 云函数验证 → 返回JWT → 存储token
```

### API调用流程
```
客户端请求 → 认证中间件 → 路由处理 → 数据模型 → 数据库 → 响应返回
```

### 健康数据流程
```
用户输入 → 前端验证 → 云函数处理 → 数据库存储 → 状态分析 → 报告生成
```

## 关键配置

### 数据库配置
- **文件**: `server/config/database.js`
- **连接**: MySQL数据库
- **连接池**: 最大10个连接

### 环境配置
- **开发环境**: 本地MySQL + 微信开发者工具
- **生产环境**: 云数据库 + 微信云开发

## 安全机制

### 认证安全
- JWT Token验证
- Session管理
- 权限分级控制

### 数据安全
- 敏感信息脱敏
- SQL注入防护
- 参数验证

## 性能优化

### 数据库优化
- 索引优化
- 查询缓存
- 连接池管理

### 前端优化
- 组件懒加载
- 图片压缩
- 请求合并

## 错误处理

### 统一错误格式
```javascript
Utils.error(res, message, statusCode);
```

### 日志记录
- 操作日志
- 错误日志  
- 性能日志

## 测试策略

### 单元测试
- 模型层测试
- API接口测试
- 组件功能测试

### 集成测试
- 端到端流程测试
- API集成测试
- 数据库集成测试