# 健康守护小程序后端服务

这是健康守护微信小程序的后端API服务器，使用Node.js + Express + MySQL技术栈开发。

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境

复制 `.env` 文件并修改数据库配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=health_guard_db
```

### 3. 初始化数据库

运行数据库迁移脚本：

```bash
npm run migrate
```

### 4. 启动服务器

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

服务器将在 http://localhost:3000 启动

## API接口

### 基础信息

- **基础URL**: `http://localhost:3000/v1`
- **认证方式**: Bearer Token
- **数据格式**: JSON

### 主要接口

#### 用户认证
- `POST /v1/auth/wechat-login` - 微信登录
- `GET /v1/auth/user-info` - 获取用户信息
- `PUT /v1/auth/user-info` - 更新用户信息

#### 管理员功能
- `POST /v1/admin/login` - 管理员登录
- `GET /v1/admin/users` - 获取用户列表
- `GET /v1/admin/users/:userId` - 获取用户详情
- `PUT /v1/admin/users/:userId/status` - 更新用户状态

#### 服务管理
- `GET /v1/services/types` - 获取服务类型列表
- `GET /v1/services/types/:serviceId` - 获取服务详情

#### 其他接口
- `GET /health` - 健康检查
- `GET /v1/config` - 获取应用配置

## 管理员功能

### 登录口令
- `admin123`
- `health2024`
- `manager888`

### 权限说明
- `viewUserData`: 查看用户基本数据
- `viewSensitiveInfo`: 查看敏感信息（完整手机号、身份证等）
- `exportData`: 导出用户数据
- `freezeUser`: 冻结/解冻用户

### 登录有效期
管理员登录状态有效期为30分钟，超时需重新验证。

## 数据库结构

主要数据表：
- `users` - 用户基础信息表
- `service_types` - 服务类型表
- `user_addresses` - 用户地址表
- `bookings` - 预约订单表
- `service_records` - 服务记录表
- `health_records` - 健康记录表
- `community_posts` - 社区动态表

## 开发说明

### 项目结构

```
server/
├── app.js                 # 主应用文件
├── package.json          # 项目配置
├── .env                  # 环境配置
├── config/
│   └── database.js       # 数据库配置
├── models/
│   └── User.js          # 用户模型
├── routes/              # 路由文件
│   ├── auth.js         # 认证路由
│   ├── admin.js        # 管理员路由
│   ├── services.js     # 服务路由
│   └── ...
├── middlewares/
│   └── auth.js         # 认证中间件
├── utils/
│   ├── index.js        # 工具函数
│   └── jwt.js          # JWT工具
└── scripts/
    └── migrate.js      # 数据库迁移脚本
```

### 开发规范

1. **错误处理**: 使用统一的错误响应格式
2. **数据验证**: 对所有输入数据进行验证
3. **安全考虑**: JWT认证、权限控制、数据脱敏
4. **代码风格**: 使用ESLint和Prettier

### 调试工具

推荐使用以下工具测试API：
- Postman
- Insomnia
- curl命令行工具

### 示例请求

```bash
# 健康检查
curl http://localhost:3000/health

# 获取服务类型
curl http://localhost:3000/v1/services/types

# 管理员登录
curl -X POST http://localhost:3000/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin123"}'
```

## 部署说明

### 环境要求
- Node.js >= 14.0.0
- MySQL >= 8.0
- npm >= 6.0.0

### 生产部署

1. 设置环境变量：
```bash
export NODE_ENV=production
export DB_PASSWORD=your_production_password
```

2. 启动服务：
```bash
npm start
```

3. 使用PM2管理进程：
```bash
pm2 start app.js --name health-guard-server
```

### Docker部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 注意事项

1. **数据库连接**: 确保MySQL服务正常运行
2. **端口冲突**: 默认使用3000端口，可通过环境变量修改
3. **微信配置**: 需要配置正确的微信AppID和Secret
4. **安全配置**: 生产环境请修改JWT密钥
5. **日志记录**: 建议配置日志服务监控应用状态

## 支持

如有问题，请联系开发团队或查看API文档。

- 📧 Email: support@health-guard.com
- 📱 Phone: 400-888-8888
- 📚 文档: /doc 文件夹下的接口文档