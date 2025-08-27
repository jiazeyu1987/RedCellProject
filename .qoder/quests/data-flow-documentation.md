# 健康守护微信小程序 - 数据流向文档

## 项目概述

健康守护微信小程序是一个基于微信云开发和独立服务器的混合架构健康管理平台。项目采用前后端分离设计，支持双重数据存储：云开发数据库和MySQL数据库，为用户提供全面的健康管理服务。

## 技术架构

### 整体架构图

```mermaid
graph TB
    subgraph "前端层"
        A[微信小程序]
        A1[页面层]
        A2[组件层]
        A3[API配置层]
    end
    
    subgraph "服务层"
        B[云函数层]
        C[服务器API层]
        B1[quickstartFunctions]
        C1[Express服务器]
        C2[路由控制器]
    end
    
    subgraph "数据层"
        D[微信云数据库]
        E[MySQL数据库]
        F[云存储]
    end
    
    A --> B
    A --> C
    B --> D
    B --> F
    C --> E
    
    A1 --> A2
    A2 --> A3
    B1 --> D
    C1 --> C2
    C2 --> E
```

## 数据存储架构

### 数据库设计概览

项目采用双数据库架构：

1. **微信云数据库**：JSON文档型数据库，用于基础功能演示
2. **MySQL数据库**：关系型数据库，用于生产级业务数据

### 核心数据表

| 表名 | 用途 | 数据库类型 | 主要字段 |
|------|------|------------|----------|
| users | 用户基础信息 | MySQL | id, open_id, nickname, phone, age, gender |
| user_addresses | 用户地址管理 | MySQL | id, user_id, contact_name, address, latitude, longitude |
| service_types | 服务类型定义 | MySQL | id, name, price, duration, category |
| bookings | 预约订单 | MySQL | id, user_id, service_id, appointment_time, status |
| health_records | 健康记录 | MySQL | id, user_id, type, value, record_time |
| sales | 示例销售数据 | 云数据库 | region, city, sales |
| healthRecords | 健康记录(云端) | 云数据库 | openid, type, value, recordTime |

## 数据流向分析

### 1. 用户认证数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant P as 小程序前端
    participant CF as 云函数
    participant CD as 云数据库
    participant API as 服务器API
    participant DB as MySQL数据库
    
    U->>P: 微信登录
    P->>CF: wx.cloud.callFunction(getOpenId)
    CF->>CF: cloud.getWXContext()
    CF-->>P: 返回openid
    P->>API: POST /v1/auth/login
    API->>DB: 查询/创建用户记录
    DB-->>API: 用户信息
    API-->>P: 返回JWT token
    P->>P: 存储token到本地
```

### 2. 健康数据录入流程

```mermaid
flowchart TD
    A[用户输入健康数据] --> B{选择存储方式}
    B -->|云数据库| C[调用云函数]
    B -->|MySQL数据库| D[调用服务器API]
    
    C --> E[saveHealthData云函数]
    E --> F[数据验证]
    F --> G[写入云数据库]
    G --> H[返回结果]
    
    D --> I[POST /v1/health/records]
    I --> J[JWT认证验证]
    J --> K[数据格式验证]
    K --> L[写入MySQL数据库]
    L --> M[返回结果]
    
    H --> N[前端更新界面]
    M --> N
```

### 3. 服务预约数据流

```mermaid
sequenceDiagram
    participant U as 用户
    participant P as 小程序前端
    participant API as 服务器API
    participant DB as MySQL数据库
    
    U->>P: 选择服务类型
    P->>API: GET /v1/services/types
    API->>DB: SELECT FROM service_types
    DB-->>API: 服务类型列表
    API-->>P: 返回服务列表
    
    U->>P: 填写预约信息
    P->>API: POST /v1/bookings
    API->>API: 验证用户身份
    API->>API: 验证预约时间
    API->>API: 验证地址信息
    API->>DB: INSERT INTO bookings
    DB-->>API: 预约记录ID
    API-->>P: 预约成功响应
    P-->>U: 显示预约确认
```

### 4. 数据查询与展示流程

```mermaid
graph TD
    A[页面加载] --> B[检查token]
    B --> C{token有效?}
    C -->|否| D[获取测试token]
    C -->|是| E[发起API请求]
    D --> E
    
    E --> F[服务器接收请求]
    F --> G[JWT认证]
    G --> H{认证通过?}
    H -->|否| I[返回401错误]
    H -->|是| J[查询数据库]
    
    J --> K[数据处理]
    K --> L[返回JSON响应]
    L --> M[前端数据绑定]
    M --> N[页面渲染]
    
    I --> O[显示错误信息]
    O --> P[使用模拟数据]
    P --> M
```

## API接口数据流

### 请求处理流程

```mermaid
flowchart LR
    A[小程序发起请求] --> B[API配置封装]
    B --> C[添加认证头]
    C --> D[Express路由]
    D --> E[中间件验证]
    E --> F[业务逻辑处理]
    F --> G[数据库操作]
    G --> H[响应格式化]
    H --> I[返回JSON]
    I --> J[前端处理响应]
```

### 核心API数据传输格式

#### 健康记录保存

**请求格式**：
```javascript
{
  type: 'bloodPressure',
  value: '120/80',
  unit: 'mmHg',
  status: 'normal',
  notes: '日常监测',
  recordTime: '2024-01-27T10:30:00Z'
}
```

**响应格式**：
```javascript
{
  success: true,
  message: '健康记录添加成功',
  data: {
    record: {
      id: 'uuid-string',
      type: 'bloodPressure',
      value: '120/80',
      recordTime: '2024-01-27 10:30:00'
    }
  }
}
```

#### 预约创建

**请求格式**：
```javascript
{
  serviceType: 'basic_health',
  serviceDate: '2024-01-28',
  serviceTime: '09:00',
  addressId: 'address-uuid',
  notes: '高血压复查'
}
```

**响应格式**：
```javascript
{
  success: true,
  message: '预约创建成功',
  data: {
    booking: {
      id: 123,
      serviceType: 'basic_health',
      status: 'pending',
      totalAmount: 100.00
    }
  }
}
```

## 云函数数据处理

### 云函数调用机制

```mermaid
sequenceDiagram
    participant P as 小程序前端
    participant CF as quickstartFunctions
    participant CD as 云数据库
    
    P->>CF: wx.cloud.callFunction({<br/>name: 'quickstartFunctions',<br/>data: {type: 'saveHealthData', data: {...}}})
    CF->>CF: switch(event.type)
    CF->>CF: 获取用户openid
    CF->>CD: db.collection('healthRecords').add()
    CD-->>CF: 写入结果
    CF-->>P: {success: true, data: result}
```

### 云函数支持的操作类型

| 操作类型 | 功能描述 | 数据库操作 |
|----------|----------|------------|
| getOpenId | 获取用户标识 | 无 |
| saveHealthData | 保存健康数据 | INSERT |
| getHealthData | 查询健康数据 | SELECT |
| createCollection | 创建数据集合 | CREATE |
| selectRecord | 查询记录 | SELECT |
| updateRecord | 更新记录 | UPDATE |
| insertRecord | 插入记录 | INSERT |
| deleteRecord | 删除记录 | DELETE |

## 数据流控制与验证

### 数据验证层次

1. **前端验证**：用户输入基础验证
2. **API层验证**：业务逻辑验证
3. **数据库约束**：数据完整性验证

### 错误处理机制

```mermaid
graph TD
    A[API请求] --> B{网络正常?}
    B -->|否| C[显示网络错误]
    B -->|是| D{服务器响应?}
    D -->|否| E[使用模拟数据]
    D -->|是| F{认证有效?}
    F -->|否| G[重新获取token]
    F -->|是| H{业务逻辑成功?}
    H -->|否| I[显示业务错误]
    H -->|是| J[正常处理数据]
    
    C --> K[用户提示]
    E --> L[降级体验]
    G --> A
    I --> K
    J --> M[界面更新]
```

## 性能优化策略

### 数据缓存机制

1. **本地缓存**：使用wx.getStorageSync存储token和用户信息
2. **页面缓存**：避免重复加载相同数据
3. **分页加载**：大数据量采用分页策略

### 并发处理

```javascript
// 并行加载数据示例
async loadHealthData() {
  await Promise.all([
    this.loadHealthMetrics(),
    this.loadRecentRecords(),
    this.loadHealthSuggestions()
  ]);
}
```

## 安全性设计

### 认证机制

1. **微信身份认证**：基于微信openid的用户识别
2. **JWT Token**：服务器API访问控制
3. **云函数天然鉴权**：基于微信生态的安全机制

### 数据安全

- 敏感数据加密存储
- SQL注入防护
- 跨域请求限制
- 输入数据清理

## 监控与日志

### 关键监控点

1. **API响应时间**
2. **数据库连接状态**
3. **错误率统计**
4. **用户操作轨迹**

### 日志记录

```javascript
console.log('API请求:', {
  url: requestOptions.url,
  method: requestOptions.method,
  data: requestOptions.data,
  hasToken: !!token
});
```

## 故障恢复机制

### 容错设计

1. **API调用失败**：自动降级到模拟数据
2. **网络异常**：离线缓存支持
3. **服务器故障**：云函数备用方案

### 数据一致性

- 双写机制保证数据同步
- 定期数据校验
- 异常数据回滚

## 扩展性考虑

### 水平扩展

1. **微服务架构**：业务模块独立部署
2. **数据库分片**：支持大规模用户
3. **CDN加速**：静态资源优化

### 功能扩展

- 新增业务模块的标准化接入
- API版本管理策略
- 数据迁移方案