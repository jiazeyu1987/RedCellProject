# Health Guard Enhanced Load Testing Tool

增强型健康守护系统压力测试工具，提供完整的用户数据生成和管理功能。

## 🚀 新功能特性

### 增强型用户生成器
- **完整用户生命周期模拟**：生成包含订阅、付款、地址、健康数据的完整用户档案
- **真实数据模拟**：基于中国用户行为模式设计的概率分布
- **多维度数据关联**：订阅套餐与付款记录、健康状况与监测数据的逻辑关联
- **北京地理数据**：基于真实北京市区县街道的地址生成

### 用户清理工具
- **安全删除机制**：只删除标识为测试的用户数据
- **级联删除**：自动清理用户的所有关联数据
- **交互式确认**：提供预览和确认机制防止误删
- **批量管理**：支持按日期、数量等条件批量删除

## 📦 文件结构

```
load-testing/
├── src/
│   ├── enhancedUserGenerator.js     # 增强型用户生成器核心
│   ├── subscriptionGenerator.js    # 订阅信息生成器
│   ├── paymentGenerator.js         # 支付记录生成器
│   ├── addressGenerator.js         # 地址信息生成器
│   ├── healthDataGenerator.js      # 健康数据生成器
│   ├── integratedUserGenerator.js  # 集成生成器
│   ├── userCleanupTool.js          # 用户清理工具
│   └── integrationTest.js          # 集成测试脚本
├── tools/
│   ├── 压力测试.bat                # 增强压力测试主工具
│   └── 用户清理.bat                # 用户清理工具界面
├── .env.example                     # 环境配置示例
└── README.md                        # 说明文档
```

## 🛠️ 安装和配置

### 1. 环境准备

确保已安装以下环境：
- Node.js 14+
- MySQL 5.7+
- npm 包管理器

### 2. 依赖安装

```bash
cd load-testing
npm install
```

### 3. 环境配置

复制配置文件并根据需要修改：
```bash
copy .env.example .env
```

主要配置项：
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=health_guard_db
```

### 4. 数据库初始化

运行数据库初始化脚本：
```bash
node src/init-database.js
```

## 🎯 使用方法

### 方式一：图形界面工具

#### 增强压力测试工具
```bash
tools\压力测试.bat
```

功能选项：
- **[1] 增强型用户生成** - 生成包含完整数据的50个用户
- **[2] 基础用户生成** - 生成仅包含基础信息的50个用户  
- **[3] 自定义用户生成** - 指定数量和选项生成用户
- **[4] 负载测试** - 运行5分钟负载测试
- **[5] 压力测试** - 运行3分钟压力测试
- **[6] 用户管理** - 打开用户清理工具
- **[7] 数据报告** - 生成统计报告

#### 用户清理工具
```bash
tools\用户清理.bat
```

功能选项：
- **[1] 删除所有测试用户** - 清理所有测试数据
- **[2] 按日期范围删除** - 指定创建日期范围删除
- **[3] 按数量删除** - 删除指定数量的最旧用户
- **[4] 预览删除** - 查看将要删除的数据（不实际删除）

### 方式二：命令行工具

#### 集成用户生成器
```bash
# 生成10个完整用户数据
node src/integratedUserGenerator.js generate 10

# 生成单个完整用户
node src/integratedUserGenerator.js single

# 生成数据统计报告
node src/integratedUserGenerator.js report

# 仅生成基础用户信息
node src/integratedUserGenerator.js basic-only 10
```

#### 单独模块使用
```bash
# 用户生成器
node src/enhancedUserGenerator.js generate 50

# 订阅生成器
node src/subscriptionGenerator.js test

# 支付生成器  
node src/paymentGenerator.js test

# 地址生成器
node src/addressGenerator.js test

# 健康数据生成器
node src/healthDataGenerator.js test

# 用户清理工具
node src/userCleanupTool.js interactive
```

#### 集成测试
```bash
# 运行完整功能测试
node src/integrationTest.js
```

## 📊 数据模型

### 用户表 (users)
- 基础信息：姓名、电话、邮箱、年龄、性别、生日
- 健康信息：健康状况、过敏史、紧急联系人
- 系统字段：会员等级、状态、服务次数、总消费

### 订阅表 (user_subscriptions)  
- 订阅信息：套餐ID、状态、开始/结束时间
- 配额管理：剩余配额、购买价格
- 10级套餐体系：从98元贴心关怀型到2980元尊享专家型

### 支付记录表 (payment_records)
- 支付信息：金额、支付方式、状态、订单号
- 时间记录：支付时间、创建时间
- 支付方式：微信(60%)、支付宝(30%)、银行卡(8%)、余额(2%)

### 地址表 (user_addresses)
- 地址信息：省市区详细地址、经纬度坐标
- 联系信息：联系人姓名、电话
- 服务记录：是否默认、服务次数、最后服务时间

### 健康记录表 (health_records)
- 健康指标：血压、血糖、心率、体重、体温等
- 状态评估：正常、预警、危险
- 监测频率：基于用户健康状况的智能频率分布

## 🎮 高级功能

### 概率分布模拟
- **套餐级别分布**：3级健康守护型最受欢迎(25%)，高级套餐稀有
- **支付状态分布**：95%成功、3%失败、1.5%退款、0.5%取消
- **健康状态分布**：基于用户健康状况调整正常/预警/危险比例

### 智能数据关联
- **订阅与支付**：订阅记录自动生成对应支付记录
- **健康状况与监测**：高血压用户更频繁监测血压
- **地址与服务**：地址包含历史服务次数模拟

### 安全机制
- **测试用户标识**：open_id以'wx_test_'开头，便于识别和清理
- **级联删除控制**：按外键约束顺序安全删除关联数据
- **事务保护**：删除操作使用数据库事务确保一致性

## 🔧 故障排除

### 常见问题

**1. 数据库连接失败**
```bash
# 检查MySQL服务状态
services.msc

# 验证数据库配置
node src/database-test.js
```

**2. 表结构缺失**
```bash
# 运行数据库初始化
node src/init-database.js

# 检查表结构
node src/integrationTest.js
```

**3. 权限问题**
- 确保数据库用户有CREATE/ALTER/DROP权限
- 检查文件读写权限

**4. 依赖缺失**
```bash
# 重新安装依赖
npm install

# 检查关键依赖
npm list mysql2 faker
```

### 调试模式

启用调试输出：
```bash
# 设置调试环境变量
set DEBUG_MODE=true
set LOG_LEVEL=debug

# 运行调试测试
node src/integrationTest.js
```

## 📈 性能建议

### 生成性能优化
- **批量大小**：默认10个用户一批，可通过配置调整
- **数据库连接池**：复用连接减少开销
- **批次延时**：避免数据库压力过大

### 大规模测试
```bash
# 分批生成大量用户
node src/integratedUserGenerator.js generate 200

# 监控数据库性能
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
```

## 🤝 贡献指南

### 开发新功能
1. 创建功能分支
2. 实现功能模块
3. 添加集成测试
4. 更新文档

### 代码规范
- 使用ES6+语法
- 添加详细注释
- 错误处理完善
- 遵循现有代码风格

## 📝 更新日志

### v2.0.0 (2024-08-28)
- ✨ 全新增强型用户生成器
- 🎯 完整用户生命周期数据模拟
- 🛠️ 用户清理工具
- 📊 数据统计报告功能
- 🔧 集成测试框架

### v1.0.0  
- 📦 基础用户生成功能
- ⚡ 简单负载测试工具

## 📞 技术支持

如遇问题或需要技术支持，请：
1. 查看故障排除部分
2. 运行集成测试诊断
3. 检查系统日志输出
4. 联系开发团队

---

© 2024 Health Guard System - Enhanced Load Testing Tool