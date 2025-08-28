# 健康守护微信小程序 - 项目上下文

## 项目概述
这是一个基于微信小程序云开发的健康服务管理系统，包含小程序客户端、管理员后台和服务器端API。

## 技术栈
- **前端**: 微信小程序原生框架
- **后端**: Node.js + Express + MySQL
- **云函数**: 微信云开发
- **管理后台**: React + Ant Design
- **测试**: Jest

## 项目结构
```
wx_mini_program/
├── miniprogram/          # 小程序客户端
├── cloudfunctions/       # 微信云函数
├── server/              # 后端服务器
├── admin-portal/        # 管理员后台
├── load-testing/        # 负载测试工具
└── doc/                # 项目文档
```

## 开发规范
- 使用ES6+语法
- 遵循RESTful API设计
- 统一错误处理和日志记录
- 数据库字段使用下划线命名（snake_case）
- 前端变量使用驼峰命名（camelCase）

## 常用命令
```bash
# 启动服务器
cd server ; npm start

# 启动管理后台
cd admin-portal ; npm start

# 运行测试
cd server ; npm test

# API冲突检测
node api-scanner.js
node conflict-detector.js
```

## 重要组件
- **认证中间件**: `server/middlewares/auth.js`
- **用户模型**: `server/models/User.js`
- **API工具**: `admin-portal/src/utils/api.js`
- **云函数入口**: `cloudfunctions/quickstartFunctions/index.js`

## 数据库连接
- 配置文件: `server/config/database.js`
- 迁移脚本: `server/scripts/migrate.js`
- 主要表: users, bookings, health_records, service_types

## 注意事项
- 所有API响应需要统一格式
- 敏感信息需要脱敏处理
- 管理员功能需要权限验证
- 健康数据需要加密存储