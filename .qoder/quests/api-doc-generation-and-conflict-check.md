# API接口文档生成与冲突检查设计

## 概述

本设计文档分析健康守护小程序多组件系统间的API通信接口，包括后端服务器(server)、管理员门户(admin-portal)、小程序客户端(miniprogram)与MySQL数据库之间的接口交互，并识别接口冲突问题。

## 系统架构与通信流程

```mermaid
graph TB
    A[小程序客户端] -->|HTTP/JSON| B[后端服务器:3000]
    C[管理员门户] -->|HTTP/JSON via代理| B
    B -->|SQL| D[MySQL数据库]
    B -->|云调用| E[微信云数据库]
    
    subgraph "API路由层"
        F[/v1/auth] 
        G[/v1/users]
        H[/v1/bookings]
        I[/v1/health]
        J[/v1/admin]
        K[/v1/services]
    end
    
    B --- F
    B --- G
    B --- H
    B --- I
    B --- J
    B --- K
```

## 接口域分析

### 1. 后端服务器(Server)接口域

**基础配置**
- **基础URL**: `http://localhost:3000`
- **API前缀**: `/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

**核心路由架构**
```javascript
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/services', serviceRoutes);
app.use('/v1/bookings', bookingRoutes);
app.use('/v1/health', healthRoutes);
app.use('/v1/community', communityRoutes);
app.use('/v1/hospitals', hospitalRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/upload', uploadRoutes);
app.use('/v1/config', configRoutes);
```

**实现的接口列表**

#### 认证模块 (/v1/auth)
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | /auth/login | 用户登录 | ✅ |
| GET | /auth/user-info | 获取用户信息 | ✅ |
| PUT | /auth/user-info | 更新用户信息 | ✅ |

#### 用户管理模块 (/v1/users)  
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| GET | /users/profile | 获取用户资料 | ✅ |
| GET | /users/addresses | 获取用户地址 | ✅ |
| GET | /users/family-members | 获取家庭成员 | ✅ |

#### 预约管理模块 (/v1/bookings)
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | /bookings | 创建预约 | ✅ |
| GET | /bookings | 获取预约列表 | ✅ |
| GET | /bookings/:id | 获取预约详情 | ✅ |

#### 健康管理模块 (/v1/health)
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| GET | /health/records | 获取健康记录 | ✅ |
| POST | /health/records | 添加健康记录 | ✅ |

#### 服务管理模块 (/v1/services)
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| GET | /services | 获取服务列表 | ✅ |
| GET | /services/types | 获取服务类型 | ✅ |

#### 管理员模块 (/v1/admin)
| 方法 | 路径 | 功能 | 状态 |
|------|------|------|------|
| POST | /admin/login | 管理员登录 | ✅ |
| POST | /admin/simple-login | 简化登录接口 | ✅ |
| GET | /admin/users | 获取用户列表 | ✅ |
| GET | /admin/users/:id | 获取用户详情 | ✅ |
| PUT | /admin/users/:id/status | 更新用户状态 | ✅ |
| GET | /admin/statistics | 获取统计数据 | ✅ |

### 2. 管理员门户(Admin-Portal)接口域

**基础配置**
- **基础URL**: `/api` (通过代理转发到后端)
- **代理目标**: `http://localhost:3000/v1`
- **认证方式**: Bearer Token存储在localStorage
- **数据格式**: JSON

**请求的接口列表**

#### 认证相关
| 接口函数 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| login(password) | POST /api/admin/login | POST /v1/admin/login | ✅ |
| logout() | POST /api/admin/logout | POST /v1/admin/logout | ❌ |
| getProfile() | GET /api/admin/profile | GET /v1/admin/profile | ❌ |

#### 用户池管理
| 接口函数 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| getUserPool(params) | GET /api/admin/user-pool | - | ❌ |
| getUserDetail(userId) | GET /api/admin/users/:id | GET /v1/admin/users/:id | ✅ |
| updateUserStatus() | PUT /api/admin/users/:id/status | PUT /v1/admin/users/:id/status | ✅ |

#### 服务者管理
| 接口函数 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| getServiceProviders() | GET /api/admin/service-providers | - | ❌ |
| getProviderDetail() | GET /api/admin/service-providers/:id | - | ❌ |
| updateProviderInfo() | PUT /api/admin/service-providers/:id | - | ❌ |

#### 分配管理
| 接口函数 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| getAssignments() | GET /api/admin/assignments | - | ❌ |
| assignUser() | POST /api/admin/assign-user | - | ❌ |
| batchAssignUsers() | POST /api/admin/auto-assign | - | ❌ |

#### 统计数据
| 接口函数 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| getDashboardStats() | GET /api/admin/dashboard/stats | - | ❌ |
| getGeoData() | GET /api/admin/dashboard/geo-data | - | ❌ |
| exportUserData() | GET /api/admin/users/export | - | ❌ |

### 3. 小程序客户端(Miniprogram)接口域

**基础配置**
- **基础URL**: `http://localhost:3000`
- **API前缀**: `/v1`
- **认证方式**: Bearer Token存储在wx.storage
- **数据格式**: JSON
- **请求库**: 自定义wx.request封装

**使用的接口列表**

#### 用户认证
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| USER.LOGIN | /auth/login | /v1/auth/login | ✅ |
| USER.REGISTER | /auth/register | - | ❌ |
| USER.PROFILE | /users/profile | /v1/users/profile | ✅ |
| USER.ADDRESSES | /users/addresses | /v1/users/addresses | ✅ |
| USER.FAMILY_MEMBERS | /users/family-members | /v1/users/family-members | ✅ |

#### 服务预约
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| SERVICE.TYPES | /services/types | /v1/services/types | ✅ |
| SERVICE.BOOK | /bookings | /v1/bookings | ✅ |
| SERVICE.HISTORY | /bookings | /v1/bookings | ✅ |

#### 健康管理
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| HEALTH.RECORDS | /health/records | /v1/health/records | ✅ |
| HEALTH.METRICS | /health/metrics | - | ❌ |
| HEALTH.SUGGESTIONS | /health/suggestions | - | ❌ |
| HEALTH.REPORTS | /health/reports | - | ❌ |

#### 社区功能
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| COMMUNITY.POSTS | /community/posts | /v1/community/* | ✅ |
| COMMUNITY.KNOWLEDGE | /community/knowledge | /v1/community/* | ✅ |
| COMMUNITY.QA | /community/qa | /v1/community/* | ✅ |

#### 管理员功能
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| ADMIN.LOGIN | /admin/login | /v1/admin/login | ✅ |
| ADMIN.USERS | /admin/users | /v1/admin/users | ✅ |

#### 其他接口
| 接口常量 | 请求路径 | 对应后端路径 | 状态 |
|----------|----------|--------------|------|
| HOSPITAL | /hospitals | /v1/hospitals | ✅ |
| UPLOAD | /upload | /v1/upload | ✅ |
| HEALTH_CHECK | /health | GET /health | ✅ |

### 4. MySQL数据库接口域

**主要数据表结构**

#### 用户相关表
```sql
-- users表
CREATE TABLE users (
  id varchar(50) PRIMARY KEY,
  open_id varchar(100) UNIQUE NOT NULL,
  nickname varchar(100) NOT NULL,
  real_name varchar(50),
  phone varchar(20),
  email varchar(100),
  member_level enum('regular','vip') DEFAULT 'regular',
  status enum('active','inactive','frozen') DEFAULT 'active',
  service_count int DEFAULT 0,
  total_spent decimal(10,2) DEFAULT 0.00,
  register_time timestamp DEFAULT CURRENT_TIMESTAMP
);

-- user_addresses表
CREATE TABLE user_addresses (
  id varchar(50) PRIMARY KEY,
  user_id varchar(50) NOT NULL,
  contact_name varchar(50) NOT NULL,
  contact_phone varchar(20) NOT NULL,
  address varchar(500) NOT NULL,
  is_default tinyint(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 预约相关表
```sql
-- bookings表
CREATE TABLE bookings (
  id varchar(50) PRIMARY KEY,
  order_no varchar(50) UNIQUE NOT NULL,
  user_id varchar(50) NOT NULL,
  service_id int NOT NULL,
  appointment_time timestamp NOT NULL,
  status enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  price decimal(10,2) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- service_types表
CREATE TABLE service_types (
  id int AUTO_INCREMENT PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration int DEFAULT 60,
  category varchar(50),
  is_active tinyint(1) DEFAULT 1
);
```

#### 健康相关表
```sql
-- health_records表
CREATE TABLE health_records (
  id varchar(50) PRIMARY KEY,
  user_id varchar(50) NOT NULL,
  type varchar(50) NOT NULL,
  value json NOT NULL,
  record_time timestamp NOT NULL,
  source enum('self','nurse','device','doctor') DEFAULT 'self',
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 接口冲突分析

### 1. 路径不匹配冲突

#### 管理员门户请求的未实现接口
```
❌ POST /v1/admin/logout - 后端未实现
❌ GET /v1/admin/profile - 后端未实现  
❌ GET /v1/admin/user-pool - 后端未实现
❌ GET /v1/admin/service-providers - 后端未实现
❌ GET /v1/admin/assignments - 后端未实现
❌ POST /v1/admin/assign-user - 后端未实现
❌ GET /v1/admin/dashboard/stats - 后端未实现
❌ GET /v1/admin/users/export - 后端未实现
```

#### 小程序客户端请求的未实现接口
```
❌ POST /v1/auth/register - 后端未实现
❌ GET /v1/health/metrics - 后端未实现
❌ GET /v1/health/suggestions - 后端未实现  
❌ GET /v1/health/reports - 后端未实现
```

### 2. 响应格式冲突

#### 客户端API文档 vs 服务器端实现

**文档中的响应格式**
```json
{
  "code": 200,
  "message": "success", 
  "data": {},
  "timestamp": 1693824000000
}
```

**服务器端实际响应格式**
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 3. 认证机制冲突

#### 管理员登录接口不一致

**管理员门户期望的响应**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "permissions": ["viewUserData", "exportData"],
    "expireTime": "2025-08-25 12:00:00"
  }
}
```

**服务器端实际响应**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "token": "simple_token_" + timestamp,
    "permissions": ["viewUserData", "viewSensitiveInfo"]
  }
}
```

### 4. 数据模型冲突

#### 预约数据结构不匹配

**客户端API文档期望**
```json
{
  "serviceId": 1,
  "appointmentTime": "2025-08-25 14:00:00",
  "address": {
    "contactName": "张明华",
    "contactPhone": "13812345678",
    "address": "详细地址",
    "isDefault": true
  }
}
```

**服务器端实现**
```json
{
  "serviceType": "basic_health",
  "serviceDate": "2025-08-25", 
  "serviceTime": "14:00",
  "addressId": 1
}
```

### 5. 数据库表结构冲突

#### 预约表字段不一致

**数据库设计文档中的bookings表**
```sql
CREATE TABLE bookings (
  service_id int NOT NULL,
  appointment_time timestamp NOT NULL,
  address_id varchar(50) NOT NULL
);
```

**服务器端实际使用**
```sql
INSERT INTO bookings (
  service_type,      -- 使用字符串而非ID
  service_date,      -- 分离日期和时间  
  service_time,
  address_id         -- 使用整型而非varchar
);
```

## 接口一致性建议

### 1. 统一响应格式

建议所有接口使用统一的响应格式：
```json
{
  "success": boolean,
  "code": number,
  "message": string,
  "data": object,
  "timestamp": number
}
```

### 2. 补全缺失接口

需要在后端实现的接口：
- 管理员登出接口
- 管理员资料接口  
- 用户池管理接口
- 服务者管理接口
- 分配管理接口
- 数据导出接口

### 3. 统一数据模型

需要统一的数据结构：
- 预约创建请求格式
- 用户信息响应格式
- 错误响应格式
- 分页数据格式

### 4. 统一认证机制

建议采用标准JWT认证：
- 统一token格式
- 统一权限表示
- 统一过期处理

## 详细Bug记录与修复跟踪

### P0级 - 阻塞性接口冲突

#### BUG-001: 管理员登录响应格式不匹配
**影响组件**: admin-portal ↔ server  
**问题详情**: 
- 管理员门户期望: `{success: true, data: {token, permissions, expireTime}}`
- 服务器端返回: `{code: 200, success: true, data: {token: "simple_token_xxx", permissions}}`
- 缺少expireTime字段，token格式不标准

**影响**: 管理员无法正常登录或token管理异常

#### BUG-002: 预约接口请求参数完全不匹配
**影响组件**: miniprogram ↔ server  
**问题详情**:
- 小程序发送: `{serviceId: 1, appointmentTime: "2025-08-25 14:00:00", address: {}}`
- 服务器端接收: `{serviceType: "basic_health", serviceDate: "2025-08-25", serviceTime: "14:00", addressId: 1}`
- 参数名称和格式完全不同

**影响**: 预约功能完全无法使用

#### BUG-003: 响应格式标准不统一
**影响组件**: 全系统  
**问题详情**:
- 客户端API文档期望: `{code: 200, message: "success", data: {}, timestamp: xxx}`
- 服务器端实际返回: `{success: true, data: {}, message: "操作成功"}`
- 字段名称和结构不一致

**影响**: 前端无法正确解析响应数据

### P1级 - 重要接口问题

#### BUG-004: 管理员门户大量接口未实现
**影响组件**: admin-portal → server  
**缺失接口列表**:
```
❌ POST /v1/admin/logout - 管理员登出
❌ GET /v1/admin/profile - 管理员资料
❌ GET /v1/admin/user-pool - 用户池管理
❌ GET /v1/admin/service-providers - 服务者管理
❌ GET /v1/admin/assignments - 分配管理
❌ POST /v1/admin/assign-user - 用户分配
❌ GET /v1/admin/dashboard/stats - 统计数据
❌ GET /v1/admin/users/export - 数据导出
```
**影响**: 管理员门户大部分功能无法使用

#### BUG-005: 小程序健康模块接口缺失
**影响组件**: miniprogram → server  
**缺失接口列表**:
```
❌ GET /v1/health/metrics - 健康指标
❌ GET /v1/health/suggestions - 健康建议
❌ GET /v1/health/reports - 健康报告
```
**影响**: 健康管理功能不完整

#### BUG-006: 用户注册接口缺失
**影响组件**: miniprogram → server  
**问题详情**: 小程序定义了`USER.REGISTER: '/auth/register'`，但服务器端未实现该接口
**影响**: 用户无法通过注册流程加入系统

### P2级 - 一般性问题

#### BUG-007: 数据库表结构与代码不匹配
**影响组件**: server ↔ MySQL  
**问题详情**:
- 数据库设计文档中bookings表使用`service_id(int)`和`address_id(varchar)`
- 服务器端代码使用`service_type(string)`和`address_id(int)`
- 字段类型和名称不一致

#### BUG-008: 认证机制不统一
**影响组件**: admin-portal vs miniprogram  
**问题详情**:
- 管理员门户使用localStorage存储token
- 小程序使用wx.storage存储token
- 两者token生成和验证机制不同

#### BUG-009: API前缀配置不一致
**影响组件**: miniprogram配置 vs server实际  
**问题详情**:
- 小程序配置API前缀为'/v1'
- 但某些接口(如健康检查)直接访问'/health'，没有前缀
- 配置和实际使用不匹配

#### BUG-010: 分页格式不统一
**影响组件**: 各前端 ↔ server  
**问题详情**:
- 不同接口返回的分页格式不统一
- 有些使用`{total, page, limit}`，有些使用`{current, pageSize, total}`

### 数据一致性冲突

#### BUG-011: 服务类型数据格式冲突
**问题详情**:
- 预约创建时使用字符串: "basic_health", "comprehensive_health"
- 服务类型表中使用数字ID: 1, 2, 3
- 数据引用方式不一致

#### BUG-012: 用户状态枚举值不匹配
**问题详情**:
- 数据库定义: `enum('active','inactive','frozen')`
- 前端使用: 'enabled', 'disabled'
- 状态值定义不一致

### 修复优先级建议

#### 立即修复 (P0)
1. 统一响应格式为: `{success: boolean, code: number, message: string, data: object}`
2. 修复管理员登录接口响应格式
3. 修复预约接口参数格式

#### 近期修复 (P1)
1. 实现管理员门户缺失的接口
2. 实现小程序健康模块接口
3. 实现用户注册接口

#### 后续优化 (P2)
1. 统一认证机制
2. 修复数据库表结构
3. 统一分页格式
4. 统一API路径规范

### 风险评估

**高风险**:
- 预约功能完全不可用 (BUG-002)
- 管理员门户大部分功能不可用 (BUG-004)

**中等风险**:
- 响应解析错误导致前端异常 (BUG-003)
- 健康功能不完整影响用户体验 (BUG-005)

**低风险**:
- 数据库结构问题可能导致未来扩展困难 (BUG-007)
- 认证机制不统一增加维护成本 (BUG-008)

## 接口测试策略

### 1. 自动化测试

- 创建API契约测试
- 验证响应格式一致性
- 检查接口可用性

### 2. 集成测试

- 端到端接口调用测试
- 跨组件数据流测试
- 错误处理测试

### 3. 性能测试

- 接口响应时间测试
- 并发请求测试
- 数据库查询性能测试