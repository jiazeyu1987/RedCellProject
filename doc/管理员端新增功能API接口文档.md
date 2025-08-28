# 管理员端新增功能API接口文档

> **文档版本**: v1.0  
> **创建时间**: 2025年8月28日  
> **功能模块**: 付费信息管理、套餐管理、地址分布统计  

---

## 🗄️ 数据模型设计

### 1. 套餐表 (subscription_plans)
```sql
CREATE TABLE `subscription_plans` (
  `id` varchar(50) NOT NULL COMMENT '套餐ID',
  `name` varchar(100) NOT NULL COMMENT '套餐名称',
  `type` enum('basic','premium','vip','enterprise') DEFAULT 'basic' COMMENT '套餐类型',
  `price` decimal(10,2) NOT NULL COMMENT '套餐价格',
  `duration_days` int NOT NULL COMMENT '有效期(天)',
  `service_quota` int DEFAULT -1 COMMENT '服务次数配额(-1表示无限)',
  `features` json NOT NULL COMMENT '功能特性',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否启用',
  `create_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='套餐表';
```

### 2. 用户套餐表 (user_subscriptions)
```sql
CREATE TABLE `user_subscriptions` (
  `id` varchar(50) NOT NULL COMMENT '订阅ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `plan_id` varchar(50) NOT NULL COMMENT '套餐ID',
  `status` enum('active','expired','cancelled') DEFAULT 'active' COMMENT '状态',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `remaining_quota` int DEFAULT -1 COMMENT '剩余配额',
  `purchase_price` decimal(10,2) NOT NULL COMMENT '购买价格',
  `create_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户套餐表';
```

### 3. 支付记录表 (payment_records)
```sql
CREATE TABLE `payment_records` (
  `id` varchar(50) NOT NULL COMMENT '支付记录ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `amount` decimal(10,2) NOT NULL COMMENT '支付金额',
  `payment_method` enum('wechat','alipay','balance') NOT NULL COMMENT '支付方式',
  `status` enum('pending','success','failed') DEFAULT 'pending' COMMENT '支付状态',
  `pay_time` timestamp NULL DEFAULT NULL COMMENT '支付时间',
  `create_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';
```

---

## 💰 付费信息管理API

### 1. 获取用户付费概览
**接口**: `GET /api/admin/payment/overview`

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "totalRevenue": 156780.50,          // 总收入
    "todayRevenue": 2350.00,            // 今日收入
    "monthRevenue": 45600.00,           // 本月收入
    "totalTransactions": 1256,          // 总交易数
    "successRate": 98.5,                // 成功率
    "paymentMethodStats": [             // 支付方式统计
      {
        "method": "wechat",
        "name": "微信支付",
        "count": 856,
        "amount": 98450.50,
        "percentage": 62.8
      }
    ]
  }
}
```

### 2. 获取用户支付记录
**接口**: `GET /api/admin/payment/records`

**请求参数**:
- page: 页码
- pageSize: 每页数量  
- userId: 用户ID(可选)
- status: 支付状态(可选)

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "records": [
      {
        "id": "pay_001",
        "user": {
          "id": "user_001",
          "nickname": "张大爷",
          "phone": "138****5678"
        },
        "orderNo": "ORD20250828001",
        "amount": 299.00,
        "paymentMethod": "wechat",
        "status": "success",
        "payTime": "2025-08-28 14:30:00"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1256
    }
  }
}
```

---

## 📦 套餐管理API

### 1. 获取套餐列表
**接口**: `GET /api/admin/subscription/plans`

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_001",
        "name": "VIP月度套餐",
        "type": "vip",
        "price": 299.00,
        "durationDays": 30,
        "serviceQuota": 10,
        "features": ["专属护士服务", "7x24小时咨询"],
        "isActive": true,
        "subscriptionCount": 156,       // 订阅人数
        "revenue": 46644.00            // 收入
      }
    ],
    "statistics": {
      "totalPlans": 8,
      "activePlans": 6,
      "totalSubscriptions": 567,
      "totalRevenue": 128450.00
    }
  }
}
```

### 2. 获取用户套餐订阅列表
**接口**: `GET /api/admin/subscription/users`

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_001",
        "user": {
          "id": "user_001",
          "nickname": "张大爷",
          "phone": "138****5678"
        },
        "plan": {
          "id": "plan_001",
          "name": "VIP月度套餐",
          "price": 299.00
        },
        "status": "active",
        "startDate": "2025-08-01",
        "endDate": "2025-08-31",
        "remainingQuota": 7,
        "usedQuota": 3,
        "daysRemaining": 3
      }
    ],
    "statistics": {
      "activeCount": 456,
      "expiredCount": 89,
      "expiringCount": 22            // 7天内到期
    }
  }
}
```

---

## 📍 地址分布统计API

### 1. 获取地址分布概览
**接口**: `GET /api/admin/address/distribution`

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "overview": {
      "totalAddresses": 1256,         // 总地址数
      "totalUsers": 892,              // 总用户数
      "totalServices": 2348,          // 总服务次数
      "coverageCities": 23,           // 覆盖城市数
      "coverageDistricts": 89         // 覆盖区县数
    },
    "cityDistribution": [             // 城市分布
      {
        "city": "深圳市",
        "province": "广东省",
        "userCount": 456,
        "addressCount": 623,
        "serviceCount": 1234,
        "percentage": 51.2,
        "coordinates": {
          "lat": 22.547,
          "lng": 114.085
        }
      }
    ],
    "heatmapData": [                  // 热力图数据
      {
        "lat": 22.531,
        "lng": 113.930,
        "intensity": 0.8,            // 强度值 0-1
        "serviceCount": 423,
        "userCount": 156
      }
    ]
  }
}
```

### 2. 获取地址详细信息
**接口**: `GET /api/admin/address/details`

**响应数据**:
```javascript
{
  "code": 200,
  "success": true,
  "data": {
    "addresses": [
      {
        "id": "addr_001",
        "address": "深圳市南山区科技园南区深南大道9988号",
        "user": {
          "id": "user_001",
          "nickname": "张大爷",
          "phone": "138****5678"
        },
        "coordinates": {
          "lat": 22.531,
          "lng": 113.930
        },
        "visitCount": 8,
        "lastVisit": "2025-08-25 14:30:00"
      }
    ],
    "statistics": {
      "totalServices": 2348,
      "avgVisitsPerAddress": 1.87
    }
  }
}
```

---

## 🔧 错误码定义

| 错误码 | 错误信息 | 说明 |
|--------|----------|------|
| 4001 | 用户不存在 | 指定的用户ID不存在 |
| 4002 | 套餐不存在 | 指定的套餐ID不存在 |
| 4003 | 支付记录不存在 | 指定的支付记录不存在 |
| 4004 | 地址不存在 | 指定的地址ID不存在 |
| 5001 | 数据库查询失败 | 数据库操作异常 |
| 5002 | 统计数据计算失败 | 统计计算过程中出现错误 |