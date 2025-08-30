# 健康守护微信小程序后端API函数文档

## 1. 概述

本文档详细分析了健康守护微信小程序后端服务（server 文件夹）的所有API函数，记录了每个函数与MySQL数据库表的关系，并提供了完整的数据库表字段说明文档。

### 1.1 技术架构
- **框架**: Node.js + Express.js
- **数据库**: MySQL
- **认证**: JWT + 微信授权
- **ORM**: 原生SQL查询
- **测试**: Jest

### 1.2 核心文件结构
```
server/
├── app.js                    # Express应用入口
├── config/database.js       # 数据库配置和连接池
├── middlewares/auth.js      # 认证中间件
├── models/                  # 数据模型
│   ├── User.js              # 用户数据模型
│   └── EnhancedUser.js      # 增强用户模型
├── routes/                  # API路由文件
│   ├── admin.js             # 管理员相关API
│   ├── auth.js              # 认证相关API
│   ├── bookings.js          # 预约订单API
│   ├── community.js         # 社区功能API
│   ├── config.js            # 配置信息API
│   ├── health.js            # 健康数据API
│   ├── hospitals.js         # 医院信息API
│   ├── services.js          # 服务类型API
│   ├── upload.js            # 文件上传API
│   └── users.js             # 用户管理API
└── utils/                   # 工具函数
```

## 2. API路由详细分析

### 2.1 认证模块 (routes/auth.js)

#### 2.1.1 用户注册
- **路由**: `POST /v1/auth/register`
- **函数名**: `router.post('/register')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 创建新用户账户并生成JWT Token

**请求参数**:
```json
{
  "openId": "string",     // 微信OpenID (必填)
  "nickname": "string",   // 用户昵称 (必填)
  "avatar": "string",     // 头像URL (可选)
  "phone": "string",      // 手机号 (可选)
  "email": "string",      // 邮箱 (可选)
  "realName": "string",   // 真实姓名 (可选)
  "gender": "string",     // 性别 (可选)
  "birthday": "date"      // 生日 (可选)
}
```

**数据库操作**:
- 检查用户是否已存在: `SELECT * FROM users WHERE open_id = ?`
- 创建用户: `INSERT INTO users (open_id, nickname, ...) VALUES (?, ?, ...)`

#### 2.1.2 用户登录
- **路由**: `POST /v1/auth/login`
- **函数名**: `router.post('/login')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 用户登录验证并生成JWT Token

**数据库操作**:
- 查找用户: `SELECT * FROM users WHERE open_id = ?`
- 创建新用户（如果不存在）

#### 2.1.3 微信登录
- **路由**: `POST /v1/auth/wechat-login`
- **函数名**: `router.post('/wechat-login')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 微信授权登录并获取用户信息

**数据库操作**:
- 查找用户: `SELECT * FROM users WHERE open_id = ?`
- 更新登录信息: 调用 `UserModel.updateLoginInfo()`

#### 2.1.4 获取用户信息
- **路由**: `GET /v1/auth/user-info` 和 `GET /v1/auth/profile`
- **函数名**: `router.get('/user-info')` 和 `router.get('/profile')`
- **主要操作表**: 无（返回中间件提供的用户信息）
- **关联表**: 无
- **功能描述**: 获取当前登录用户的基本信息

#### 2.1.5 更新用户信息
- **路由**: `PUT /v1/auth/user-info` 和 `PUT /v1/auth/profile`
- **函数名**: `router.put('/user-info')` 和 `router.put('/profile')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 更新用户基本信息

**数据库操作**:
- 更新用户信息: 调用 `UserModel.update()`

### 2.2 用户管理模块 (routes/users.js)

#### 2.2.1 获取用户资料
- **路由**: `GET /v1/users/profile`
- **函数名**: `router.get('/profile')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 获取用户详细资料

**数据库操作**:
```sql
SELECT id, openid, nickname, real_name as realName, avatar, phone, email, 
       age, gender, birthday, member_level as memberLevel,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as registerTime,
       DATE_FORMAT(last_login, '%Y-%m-%d %H:%i') as lastVisit
FROM users 
WHERE id = ?
```

#### 2.2.2 更新用户资料
- **路由**: `PUT /v1/users/profile`
- **函数名**: `router.put('/profile')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 更新用户详细资料

**数据库操作**:
```sql
UPDATE users SET nickname = ?, real_name = ?, phone = ?, email = ?, 
                 age = ?, gender = ?, birthday = ?, updated_at = NOW() 
WHERE id = ?
```

#### 2.2.3 家庭成员管理

##### 2.2.3.1 获取家庭成员列表
- **路由**: `GET /v1/users/family-members`
- **函数名**: `router.get('/family-members')`
- **主要操作表**: `family_members`
- **关联表**: `users`
- **功能描述**: 获取用户的家庭成员列表

**数据库操作**:
```sql
SELECT id, name, relation, age, gender, phone, id_card as idCard,
       medical_history as medicalHistory, allergies,
       DATE_FORMAT(created_at, '%Y-%m-%d') as createTime
FROM family_members 
WHERE user_id = ?
ORDER BY created_at DESC
```

##### 2.2.3.2 添加家庭成员
- **路由**: `POST /v1/users/family-members`
- **函数名**: `router.post('/family-members')`
- **主要操作表**: `family_members`
- **关联表**: `users`
- **功能描述**: 添加新的家庭成员

**数据库操作**:
```sql
INSERT INTO family_members (user_id, name, relation, age, gender, phone, id_card, medical_history, allergies, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
```

##### 2.2.3.3 更新家庭成员
- **路由**: `PUT /v1/users/family-members/:id`
- **函数名**: `router.put('/family-members/:id')`
- **主要操作表**: `family_members`
- **关联表**: `users`
- **功能描述**: 更新家庭成员信息

**数据库操作**:
```sql
UPDATE family_members SET name = ?, relation = ?, age = ?, gender = ?, 
                         phone = ?, id_card = ?, medical_history = ?, 
                         allergies = ?, updated_at = NOW() 
WHERE id = ? AND user_id = ?
```

##### 2.2.3.4 删除家庭成员
- **路由**: `DELETE /v1/users/family-members/:id`
- **函数名**: `router.delete('/family-members/:id')`
- **主要操作表**: `family_members`
- **关联表**: `users`
- **功能描述**: 删除家庭成员

**数据库操作**:
```sql
DELETE FROM family_members WHERE id = ? AND user_id = ?
```

#### 2.2.4 用户地址管理

##### 2.2.4.1 获取地址列表
- **路由**: `GET /v1/users/addresses`
- **函数名**: `router.get('/addresses')`
- **主要操作表**: `user_addresses`
- **关联表**: `users`
- **功能描述**: 获取用户的地址列表

**数据库操作**:
```sql
SELECT id, contact_name as contactName, contact_phone as contactPhone,
       address, latitude, longitude, is_default as isDefault,
       visit_count as visitCount,
       DATE_FORMAT(create_time, '%Y-%m-%d %H:%i') as createdAt
FROM user_addresses 
WHERE user_id = ?
ORDER BY is_default DESC, create_time DESC
```

##### 2.2.4.2 添加地址
- **路由**: `POST /v1/users/addresses`
- **函数名**: `router.post('/addresses')`
- **主要操作表**: `user_addresses`
- **关联表**: `users`
- **功能描述**: 添加新的用户地址

**数据库操作**:
```sql
-- 如果设置为默认地址，先取消其他地址的默认状态
UPDATE user_addresses SET is_default = 0 WHERE user_id = ?

-- 插入新地址
INSERT INTO user_addresses (id, user_id, contact_name, contact_phone, address, latitude, longitude, is_default, create_time, update_time)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
```

##### 2.2.4.3 更新地址
- **路由**: `PUT /v1/users/addresses/:id`
- **函数名**: `router.put('/addresses/:id')`
- **主要操作表**: `user_addresses`
- **关联表**: `users`
- **功能描述**: 更新用户地址信息

**数据库操作**:
```sql
-- 如果设置为默认地址，先取消其他地址的默认状态
UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id != ?

-- 更新地址信息
UPDATE user_addresses SET contact_name = ?, contact_phone = ?, address = ?, 
                         latitude = ?, longitude = ?, is_default = ?, 
                         update_time = NOW() 
WHERE id = ? AND user_id = ?
```

##### 2.2.4.4 删除地址
- **路由**: `DELETE /v1/users/addresses/:id`
- **函数名**: `router.delete('/addresses/:id')`
- **主要操作表**: `user_addresses`
- **关联表**: `users`
- **功能描述**: 删除用户地址

**数据库操作**:
```sql
-- 删除地址
DELETE FROM user_addresses WHERE id = ? AND user_id = ?

-- 如果删除的是默认地址，设置第一个地址为默认
UPDATE user_addresses SET is_default = 1 WHERE user_id = ? ORDER BY create_time ASC LIMIT 1
```

## 3. 数据模型分析 (models/User.js)

### 3.1 用户模型主要方法

#### 3.1.1 findByOpenId
- **函数名**: `UserModel.findByOpenId(openId)`
- **主要操作表**: `users`
- **功能描述**: 通过微信OpenID查找用户

**数据库操作**:
```sql
SELECT * FROM users WHERE open_id = ?
```

#### 3.1.2 findById
- **函数名**: `UserModel.findById(id)`
- **主要操作表**: `users`
- **功能描述**: 通过用户ID查找用户

**数据库操作**:
```sql
SELECT * FROM users WHERE id = ?
```

#### 3.1.3 create
- **函数名**: `UserModel.create(userData)`
- **主要操作表**: `users`
- **功能描述**: 创建新用户

**数据库操作**:
```sql
INSERT INTO users (
  open_id, nickname, avatar, phone, email, real_name,
  gender, birthday, status, member_level, service_count, total_spent,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### 3.1.4 update
- **函数名**: `UserModel.update(userId, updateData)`
- **主要操作表**: `users`
- **功能描述**: 更新用户信息

**数据库操作**:
```sql
UPDATE users SET nickname = ?, real_name = ?, phone = ?, email = ?, 
                 age = ?, gender = ?, birthday = ?, emergency_contact = ?, 
                 emergency_relation = ?, health_condition = ?, allergies = ?, 
                 medical_history = ?, preferred_services = ?, updated_at = ? 
WHERE id = ?
```

#### 3.1.5 getList
- **函数名**: `UserModel.getList(options)`
- **主要操作表**: `users`
- **功能描述**: 获取用户列表（管理员功能）

**数据库操作**:
```sql
-- 查询总数
SELECT COUNT(*) as total FROM users WHERE [条件]

-- 查询列表
SELECT id, nickname, real_name, phone, email, avatar, status, member_level,
       service_count, total_spent, created_at, updated_at
FROM users 
WHERE [条件] 
ORDER BY [排序] 
LIMIT [分页]
```

#### 3.1.6 getDetailById
- **函数名**: `UserModel.getDetailById(userId)`
- **主要操作表**: `users`, `bookings`
- **功能描述**: 获取用户详情（包含统计信息）

**数据库操作**:
```sql
-- 获取用户统计信息
SELECT 
  COUNT(*) as totalBookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedBookings,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as totalSpent
FROM bookings 
WHERE user_id = ?
```

#### 3.1.7 updateStatus
- **函数名**: `UserModel.updateStatus(userId, status, reason)`
- **主要操作表**: `users`
- **功能描述**: 更新用户状态

**数据库操作**:
```sql
UPDATE users 
SET status = ?, updated_at = ?
WHERE id = ?
```

#### 3.1.8 incrementServiceCount
- **函数名**: `UserModel.incrementServiceCount(userId, amount)`
- **主要操作表**: `users`
- **功能描述**: 增加服务次数

**数据库操作**:
```sql
UPDATE users 
SET service_count = service_count + ?, updated_at = ?
WHERE id = ?
```

#### 3.1.9 incrementTotalSpent
- **函数名**: `UserModel.incrementTotalSpent(userId, amount)`
- **主要操作表**: `users`
- **功能描述**: 增加消费金额

**数据库操作**:
```sql
UPDATE users 
SET total_spent = total_spent + ?, updated_at = ?
WHERE id = ?
```

#### 3.1.10 getStatistics
- **函数名**: `UserModel.getStatistics()`
- **主要操作表**: `users`
- **功能描述**: 获取用户统计信息

**数据库操作**:
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
  COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen_users,
  COUNT(CASE WHEN member_level = 'vip' THEN 1 END) as vip_users,
  AVG(service_count) as avg_service_count,
  SUM(total_spent) as total_revenue
FROM users
```

## 4. 数据库连接配置 (config/database.js)

### 4.1 核心函数

#### 4.1.1 testConnection
- **函数名**: `testConnection()`
- **功能描述**: 测试数据库连接

#### 4.1.2 query
- **函数名**: `query(sql, params)`
- **功能描述**: 执行SQL查询

#### 4.1.3 transaction
- **函数名**: `transaction(callback)`
- **功能描述**: 执行事务操作

#### 4.1.4 sanitizeParams
- **函数名**: `sanitizeParams(params)`
- **功能描述**: 安全处理参数，将undefined转换为null

## 5. 数据表结构与字段说明

*注：根据代码分析，以下是实际使用的数据库表结构*

### 5.1 users - 用户基础信息表

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | INT | PRIMARY KEY AUTO_INCREMENT | 用户唯一标识符 |
| open_id | VARCHAR(100) | NOT NULL, UNIQUE | 微信OpenID，用于身份认证 |
| union_id | VARCHAR(100) | DEFAULT NULL | 微信UnionID，跨应用标识 |
| nickname | VARCHAR(100) | NOT NULL | 用户昵称 |
| real_name | VARCHAR(50) | DEFAULT NULL | 真实姓名 |
| avatar | VARCHAR(500) | DEFAULT NULL | 头像URL地址 |
| phone | VARCHAR(20) | DEFAULT NULL | 手机号码 |
| email | VARCHAR(100) | DEFAULT NULL | 邮箱地址 |
| id_card | VARCHAR(20) | DEFAULT NULL | 身份证号码 |
| age | INT | DEFAULT NULL | 年龄 |
| gender | ENUM('男','女','未知','male','female') | DEFAULT '未知' | 性别 |
| birthday | DATE | DEFAULT NULL | 出生日期 |
| member_level | ENUM('regular','vip') | DEFAULT 'regular' | 会员等级 |
| status | ENUM('active','inactive','frozen','disabled') | DEFAULT 'active' | 用户状态 |
| service_count | INT | DEFAULT 0 | 使用服务次数统计 |
| total_spent | DECIMAL(10,2) | DEFAULT 0.00 | 累计消费金额 |
| emergency_contact | VARCHAR(100) | DEFAULT NULL | 紧急联系人信息 |
| emergency_relation | VARCHAR(20) | DEFAULT NULL | 与紧急联系人关系 |
| health_condition | VARCHAR(200) | DEFAULT NULL | 健康状况描述 |
| allergies | TEXT | DEFAULT NULL | 过敏史记录 |
| medical_history | TEXT | DEFAULT NULL | 既往病史 |
| preferred_services | JSON | DEFAULT NULL | 偏好服务类型 |
| device_info | JSON | DEFAULT NULL | 设备信息记录 |
| last_login_ip | VARCHAR(50) | DEFAULT NULL | 最后登录IP地址 |
| last_login_time | TIMESTAMP | NULL | 最后登录时间 |
| last_login | TIMESTAMP | NULL | 最后登录时间（别名字段） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 账户创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 信息更新时间 |

### 5.2 family_members - 家庭成员表

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | INT | PRIMARY KEY AUTO_INCREMENT | 家庭成员唯一标识符 |
| user_id | INT | NOT NULL | 关联用户ID，外键 |
| name | VARCHAR(50) | NOT NULL | 家庭成员姓名 |
| relation | ENUM('father','mother','spouse','child','sibling','grandparent','other') | NOT NULL | 与用户的关系 |
| age | INT | NOT NULL | 年龄 |
| gender | ENUM('male','female') | NOT NULL | 性别 |
| phone | VARCHAR(20) | DEFAULT NULL | 手机号码 |
| id_card | VARCHAR(20) | DEFAULT NULL | 身份证号码 |
| medical_history | TEXT | DEFAULT NULL | 既往病史 |
| allergies | TEXT | DEFAULT NULL | 过敏史记录 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

### 5.3 user_addresses - 用户地址表

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | VARCHAR(50) | PRIMARY KEY | 地址唯一标识符 |
| user_id | INT | NOT NULL | 关联用户ID，外键 |
| contact_name | VARCHAR(50) | NOT NULL | 联系人姓名 |
| contact_phone | VARCHAR(20) | NOT NULL | 联系人电话 |
| address | VARCHAR(500) | NOT NULL | 详细地址描述 |
| latitude | DECIMAL(10,6) | DEFAULT NULL | 地址纬度坐标 |
| longitude | DECIMAL(10,6) | DEFAULT NULL | 地址经度坐标 |
| is_default | TINYINT(1) | DEFAULT 0 | 是否为默认地址 |
| visit_count | INT | DEFAULT 0 | 该地址服务次数 |
| last_visit | TIMESTAMP | NULL | 最后服务时间 |
| create_time | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 地址创建时间 |
| update_time | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 地址更新时间 |

### 5.4 bookings - 预约订单表

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | INT 或 VARCHAR(50) | PRIMARY KEY | 预约订单ID |
| user_id | INT | NOT NULL | 预约用户ID，外键 |
| service_type | VARCHAR(50) | NOT NULL | 服务类型标识 |
| service_date | DATE | NOT NULL | 预约服务日期 |
| service_time | TIME | NOT NULL | 预约服务时间 |
| address_id | INT 或 VARCHAR(50) | DEFAULT NULL | 服务地址ID，外键 |
| status | ENUM('pending','confirmed','in_progress','completed','cancelled') | DEFAULT 'pending' | 订单状态 |
| total_amount | DECIMAL(10,2) | DEFAULT 0.00 | 服务总费用 |
| notes | TEXT | DEFAULT NULL | 预约备注信息 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 订单创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 订单更新时间 |

*注：从UserModel.getDetailById函数分析，该表确实存在并被使用，但具体字段名可能与代码中的查询不完全一致*

### 5.5 admin_sessions - 管理员会话表

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | INT | PRIMARY KEY AUTO_INCREMENT | 会话ID |
| token | VARCHAR(255) | UNIQUE NOT NULL | 会话令牌 |
| expires_at | DATETIME | NOT NULL | 令牌过期时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 会话创建时间 |

*注：该表在admin.js路由中被使用，用于管理员会话管理*

### 2.3 预约管理模块 (routes/bookings.js)

#### 2.3.1 创建预约
- **路由**: `POST /v1/bookings`
- **函数名**: `router.post('/')`
- **主要操作表**: `bookings`, `addresses`
- **关联表**: `users`
- **功能描述**: 创建新的服务预约

**请求参数**:
```json
{
  "serviceType": "string",    // 服务类型 (必填)
  "serviceDate": "date",      // 预约日期 (必填)
  "serviceTime": "time",      // 预约时间 (必填)
  "addressId": "string",      // 地址ID (必填)
  "notes": "string"           // 备注信息 (可选)
}
```

**数据库操作**:
- 验证地址: `SELECT id FROM addresses WHERE id = ? AND user_id = ?`
- 创建预约: `INSERT INTO bookings (user_id, service_type, service_date, service_time, address_id, status, total_amount, notes, created_at, updated_at) VALUES (...)`

#### 2.3.2 获取预约列表
- **路由**: `GET /v1/bookings`
- **函数名**: `router.get('/')`
- **主要操作表**: `bookings`
- **关联表**: `users`
- **功能描述**: 获取用户的预约列表（支持分页和状态筛选）

**数据库操作**:
```sql
-- 查询总数
SELECT COUNT(*) as total FROM bookings WHERE user_id = ? [AND status = ?]

-- 查询列表
SELECT id, service_type as serviceType, service_date as serviceDate, 
       TIME_FORMAT(service_time, '%H:%i') as serviceTime,
       status, total_amount as totalAmount, notes, created_at as createdAt, updated_at as updatedAt
FROM bookings 
WHERE user_id = ? [AND status = ?]
ORDER BY created_at DESC
LIMIT ? OFFSET ?
```

#### 2.3.3 获取预约详情
- **路由**: `GET /v1/bookings/:id`
- **函数名**: `router.get('/:id')`
- **主要操作表**: `bookings`
- **关联表**: `users`
- **功能描述**: 获取单个预约的详细信息

#### 2.3.4 更新预约
- **路由**: `PUT /v1/bookings/:id`
- **函数名**: `router.put('/:id')`
- **主要操作表**: `bookings`
- **关联表**: `users`
- **功能描述**: 更新预约信息（仅限未完成的预约）

#### 2.3.5 取消预约
- **路由**: `PUT /v1/bookings/:id/cancel`
- **函数名**: `router.put('/:id/cancel')`
- **主要操作表**: `bookings`
- **关联表**: `users`
- **功能描述**: 取消预约

**数据库操作**:
```sql
UPDATE bookings SET status = "cancelled", updated_at = NOW() WHERE id = ? AND user_id = ?
```

### 2.4 健康数据模块 (routes/health.js)

#### 2.4.1 获取健康记录
- **路由**: `GET /v1/health/records`
- **函数名**: `router.get('/records')`
- **主要操作表**: `health_records`
- **关联表**: `users`
- **功能描述**: 获取用户健康记录列表（支持分页和类型筛选）

**数据库操作**:
```sql
SELECT id, type, value, unit, status, notes, 
       DATE_FORMAT(record_time, '%Y-%m-%d %H:%i') as recordTime,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as createdAt
FROM health_records 
WHERE user_id = ? [AND type = ?]
ORDER BY record_time DESC
LIMIT ? OFFSET ?
```

#### 2.4.2 添加健康记录
- **路由**: `POST /v1/health/records`
- **函数名**: `router.post('/records')`
- **主要操作表**: `health_records`
- **关联表**: `users`
- **功能描述**: 添加新的健康记录

**请求参数**:
```json
{
  "type": "string",        // 记录类型 (必填)
  "value": "string",       // 数值 (必填)
  "unit": "string",        // 单位 (可选)
  "status": "string",      // 状态 (可选)
  "notes": "string",       // 备注 (可选)
  "recordTime": "datetime" // 记录时间 (可选)
}
```

**数据库操作**:
```sql
INSERT INTO health_records (id, user_id, type, value, unit, status, notes, record_time, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
```

#### 2.4.3 获取健康指标统计
- **路由**: `GET /v1/health/metrics`
- **函数名**: `router.get('/metrics')`
- **主要操作表**: `health_records`
- **关联表**: `users`
- **功能描述**: 获取指定天数内的健康指标统计

**数据库操作**:
```sql
SELECT type, value, unit, status,
       DATE_FORMAT(record_time, '%Y-%m-%d') as date
FROM health_records 
WHERE user_id = ? AND record_time >= ?
ORDER BY type, record_time DESC
```

#### 2.4.4 获取健康建议
- **路由**: `GET /v1/health/suggestions`
- **函数名**: `router.get('/suggestions')`
- **主要操作表**: `health_records`
- **关联表**: `users`
- **功能描述**: 基于用户健康数据生成个性化建议

#### 2.4.5 删除健康记录
- **路由**: `DELETE /v1/health/records/:id`
- **函数名**: `router.delete('/records/:id')`
- **主要操作表**: `health_records`
- **关联表**: `users`
- **功能描述**: 删除指定的健康记录

### 2.5 管理员模块 (routes/admin.js)

#### 2.5.1 管理员登录
- **路由**: `POST /v1/admin/login`
- **函数名**: `router.post('/login')`
- **主要操作表**: `admin_sessions`
- **关联表**: 无
- **功能描述**: 管理员身份验证和会话创建

**请求参数**:
```json
{
  "password": "string"  // 管理员口令 (必填)
}
```

**数据库操作**:
- 创建会话: 调用 `adminSession.createSession()`

#### 2.5.2 简化登录
- **路由**: `POST /v1/admin/simple-login`
- **函数名**: `router.post('/simple-login')`
- **主要操作表**: 无
- **关联表**: 无
- **功能描述**: 简化的管理员登录接口（用于调试）

#### 2.5.3 管理员登出
- **路由**: `POST /v1/admin/logout`
- **函数名**: `router.post('/logout')`
- **主要操作表**: `admin_sessions`
- **关联表**: 无
- **功能描述**: 管理员登出和会话清理

#### 2.5.4 获取用户列表
- **路由**: `GET /v1/admin/users`
- **函数名**: `router.get('/users')`
- **主要操作表**: `users`
- **关联表**: 无
- **功能描述**: 管理员获取用户列表（支持搜索、筛选、分页）

**数据库操作**:
- 调用 `UserModel.getList(options)`

#### 2.5.5 获取增强用户列表
- **路由**: `GET /v1/admin/users/enhanced`
- **函数名**: `router.get('/users/enhanced')`
- **主要操作表**: `users`, 及其他关联表
- **关联表**: `user_addresses`, `health_records`, `bookings` 等
- **功能描述**: 获取包含订阅、付费、地址、健康信息的增强用户列表

## 6. 字段说明标注

### 6.1 明确字段
以下字段含义明确，直接从代码和业务逻辑中可以确定：
- 所有主键、外键字段
- 用户基本信息字段（姓名、电话、邮箱等）
- 时间戳字段
- 状态和枚举字段

### 6.2 不明确字段
以下字段在当前代码分析中含义不够明确：

1. **users表**:
   - `device_info`: JSON字段，具体存储什么设备信息不明确
   - `union_id`: 微信UnionID，但具体使用场景不明确
   - `id_card`: 身份证号码字段存在但使用场景不明确

2. **user_addresses表**:
   - `visit_count`: 该地址的服务次数，但计数逻辑不明确
   - `last_visit`: 最后服务时间，但更新逻辑不明确

3. **bookings表**:
   - 该表的完整结构需要进一步确认，因为代码中的查询与某些字段定义存在差异

## 7. 总结

### 7.1 代码质量评估
- ✅ 良好的错误处理机制
- ✅ 完善的参数验证
- ✅ 规范的数据库操作
- ✅ 合理的权限控制
- ⚠️ 部分表结构定义与代码使用存在差异
- ⚠️ 某些字段的业务逻辑不够明确

### 7.2 建议改进
1. 统一数据库表结构定义与实际使用
2. 完善字段注释和业务逻辑文档
3. 增加更多的单元测试覆盖
4. 建立数据字典文档

### 7.3 安全性评估
- ✅ JWT认证机制
- ✅ 参数验证和SQL注入防护
- ✅ 敏感信息脱敏处理
- ✅ 权限控制和用户隔离

---

*本文档基于2025年8月30日的代码版本生成，如有代码更新，请及时更新此文档。*