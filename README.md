# 健康守护微信小程序系统

这是一个基于微信小程序云开发的综合健康服务管理系统，包含小程序客户端、管理员后台和服务器端API。

## 🎯 系统组件

- **📱 小程序客户端** (`miniprogram/`): 用户健康数据管理和服务预约
- **🖥️ 管理员后台** (`admin-portal/`): React + Ant Design 管理界面
- **⚙️ 服务器端** (`server/`): Node.js + Express + MySQL API服务
- **☁️ 云函数** (`cloudfunctions/`): 微信云开发无服务器功能
- **🛠️ 管理工具** (`tools/`): 系统启动和管理工具集

## 🚀 快速启动

### 1. 使用管理工具（推荐）

```bash
# 启动管理员门户
tools\start-admin-portal.bat

# 或使用综合管理工具
tools\admin-tools.bat

# 快速启动（最简单）
tools\quick-start-admin.bat

# 系统性能测试
tools\load-test.bat

# 快速压力测试
tools\quick-load-test.bat
```

### 2. 传统启动方式

```bash
# 启动后端服务器
cd server
npm install
npm start

# 启动管理门户
cd admin-portal
npm install
npm start
```

## 🛠️ 管理工具功能

| 工具 | 功能 | 用途 |
|------|------|------|
| `start-admin-portal.bat` | 完整管理门户启动 | 环境检查、多模式启动、构建测试 |
| `quick-start-admin.bat` | 快速启动 | 最少交互的快速启动 |
| `admin-tools.bat` | 综合管理工具 | 前端、后端、数据库、API全方位管理 |
| `load-test.bat` | 压力测试工具 | 负载测试、压力测试、性能评估 |
| `quick-load-test.bat` | 快速压力测试 | 简化的性能测试启动 |

## 📊 API管理

系统提供完整的API冲突检测和文档生成工具：

```bash
# API扫描和冲突检测
node api-scanner.js
node conflict-detector.js

# 生成API文档
node doc-generator.js

# API监控
node api-monitor.js scan
```

## 🔧 系统诊断

```bash
# 综合系统诊断
node diagnose-errors.js

# 数据库连接诊断
node diagnose-db.js

# 小程序认证诊断
node diagnose-miniprogram-auth.js
```

## 📚 核心功能

- **数据库操作**: 支持小程序前端和云函数端对数据库的读写
- **文件存储**: 提供文件上传、下载功能，支持控制台可视化管理
- **云函数执行**: 在云端运行业务逻辑代码，微信私有协议天然鉴权
- **用户管理**: 完整的用户注册、认证、权限管理系统
- **健康数据**: 健康记录管理、数据分析、报告生成
- **服务预约**: 医疗服务预约、调度、管理功能
- **管理后台**: 用户池管理、服务者管理、数据导出等

## 🏗️ 技术架构

- **前端**: 微信小程序原生框架 + React (管理后台)
- **后端**: Node.js + Express + MySQL
- **云服务**: 微信云开发 + 云函数
- **认证**: JWT + 微信授权
- **测试**: Jest + 覆盖率报告

## 📁 项目结构

```
wx_mini_program/
├── miniprogram/          # 小程序客户端
├── cloudfunctions/       # 微信云函数
├── server/              # 后端服务器
├── admin-portal/        # 管理员后台
├── tools/               # 管理工具
├── load-testing/        # 负载测试
├── doc/                # 项目文档
└── .qoder/             # Qoder IDE配置
```

## 🔗 相关文档

- [管理工具说明](./tools/README.md)
- [API接口文档](./API接口文档.md)
- [数据库设计文档](./doc/数据库设计文档.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

