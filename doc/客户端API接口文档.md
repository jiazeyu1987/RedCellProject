# 健康守护小程序 - 客户端API接口文档

## 文档说明

本文档描述了健康守护微信小程序客户端与服务器端的API接口规范，包括用户端功能和管理员功能的所有接口定义。

## 基础信息

- **项目名称**: 健康守护小程序
- **API版本**: v1.0
- **基础URL**: `https://api.health-guard.com/v1`
- **认证方式**: Bearer Token
- **数据格式**: JSON

## 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1693824000000
}
```

### 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 1. 用户认证模块

### 1.1 微信登录

**接口地址**: `POST /auth/wechat-login`

**请求参数**:
```json
{
  "code": "wx_code_from_login",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL",
    "gender": 1,
    "city": "城市",
    "province": "省份",
    "country": "国家"
  }
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt_token_here",
    "userInfo": {
      "id": "user_001",
      "openId": "wx_openid_001",
      "nickname": "用户昵称",
      "avatar": "头像URL",
      "phone": "",
      "memberLevel": "regular",
      "registerTime": "2023-06-15 10:30:00"
    }
  }
}
```

### 1.2 获取用户信息

**接口地址**: `GET /auth/user-info`

**请求头**:
```
Authorization: Bearer {token}
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "id": "user_001",
    "nickname": "张医生",
    "realName": "张明华",
    "phone": "138****5678",
    "email": "zh***@email.com",
    "age": 35,
    "gender": "男",
    "memberLevel": "vip",
    "serviceCount": 15,
    "totalSpent": 2500,
    "registerTime": "2023-06-15 10:30:00"
  }
}
```

### 1.3 更新用户信息

**接口地址**: `PUT /auth/user-info`

**请求参数**:
```json
{
  "realName": "张明华",
  "phone": "13812345678",
  "email": "zhangming@email.com",
  "age": 35,
  "gender": "男",
  "emergencyContact": "李女士 13987654321",
  "emergencyRelation": "配偶"
}
```

## 2. 服务预约模块

### 2.1 获取服务类型列表

**接口地址**: `GET /services/types`

**响应数据**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "基础健康监测",
      "price": 100,
      "description": "血压、血糖、体温等基础指标检测",
      "icon": "🩺",
      "duration": 60,
      "category": "检测"
    },
    {
      "id": 2,
      "name": "综合健康评估",
      "price": 200,
      "description": "全面健康状况评估和建议",
      "icon": "📋",
      "duration": 90,
      "category": "评估"
    }
  ]
}
```

### 2.2 创建服务预约

**接口地址**: `POST /bookings`

**请求参数**:
```json
{
  "serviceId": 1,
  "appointmentTime": "2025-08-25 14:00:00",
  "address": {
    "contactName": "张明华",
    "contactPhone": "13812345678",
    "address": "深圳市南山区科技园南区深南大道9988号",
    "isDefault": true
  },
  "notes": "有高血压，需要特别注意",
  "urgency": "normal"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "预约成功",
  "data": {
    "bookingId": "booking_001",
    "orderNo": "HG20250825001",
    "status": "pending",
    "serviceInfo": {
      "id": 1,
      "name": "基础健康监测",
      "price": 100
    },
    "appointmentTime": "2025-08-25 14:00:00",
    "estimatedDuration": 60,
    "address": "深圳市南山区科技园南区深南大道9988号"
  }
}
```

### 2.3 获取预约列表

**接口地址**: `GET /bookings`

**请求参数**:
```
status: pending|confirmed|completed|cancelled
page: 1
pageSize: 10
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "bookingId": "booking_001",
        "orderNo": "HG20250825001",
        "serviceName": "基础健康监测",
        "appointmentTime": "2025-08-25 14:00:00",
        "status": "pending",
        "nurse": null,
        "address": "深圳市南山区科技园南区深南大道9988号",
        "price": 100
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 2.4 取消预约

**接口地址**: `PUT /bookings/{bookingId}/cancel`

**响应数据**:
```json
{
  "code": 200,
  "message": "预约已取消"
}
```

## 3. 健康档案模块

### 3.1 获取健康数据

**接口地址**: `GET /health/records`

**请求参数**:
```
type: bloodPressure|bloodSugar|temperature|weight|heartRate
startDate: 2025-08-01
endDate: 2025-08-31
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "record_001",
        "type": "bloodPressure",
        "value": {
          "systolic": 120,
          "diastolic": 80
        },
        "unit": "mmHg",
        "recordTime": "2025-08-25 08:30:00",
        "source": "self",
        "notes": ""
      }
    ],
    "statistics": {
      "average": {
        "systolic": 125,
        "diastolic": 82
      },
      "trend": "stable"
    }
  }
}
```

### 3.2 添加健康记录

**接口地址**: `POST /health/records`

**请求参数**:
```json
{
  "type": "bloodPressure",
  "value": {
    "systolic": 120,
    "diastolic": 80
  },
  "recordTime": "2025-08-25 08:30:00",
  "notes": "早上空腹测量"
}
```

### 3.3 获取健康报告

**接口地址**: `GET /health/reports`

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "reportId": "report_001",
    "generateTime": "2025-08-25 10:00:00",
    "period": "2025-08",
    "summary": {
      "overallScore": 85,
      "riskLevel": "low",
      "suggestions": [
        "保持规律运动",
        "注意饮食控制"
      ]
    },
    "details": {
      "bloodPressure": {
        "average": "125/82",
        "status": "normal",
        "trend": "stable"
      }
    }
  }
}
```

## 4. 服务记录模块

### 4.1 获取服务记录

**接口地址**: `GET /service-records`

**请求参数**:
```
page: 1
pageSize: 10
startDate: 2025-08-01
endDate: 2025-08-31
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "service_001",
        "bookingId": "booking_001",
        "serviceName": "基础健康监测",
        "serviceTime": "2025-08-20 14:00:00",
        "duration": 45,
        "nurse": {
          "id": "nurse_001",
          "name": "护士小王",
          "avatar": "头像URL",
          "qualification": "主管护师"
        },
        "status": "completed",
        "address": "深圳市南山区科技园南区深南大道9988号",
        "cost": 100,
        "rating": 5,
        "feedback": "服务很专业，护士态度很好，会继续使用。",
        "serviceReport": {
          "bloodPressure": "120/80",
          "bloodSugar": "5.6",
          "temperature": "36.5",
          "notes": "各项指标正常"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 4.2 评价服务

**接口地址**: `POST /service-records/{recordId}/rating`

**请求参数**:
```json
{
  "rating": 5,
  "feedback": "服务很专业，护士态度很好",
  "tags": ["专业", "准时", "态度好"]
}
```

## 5. 地址管理模块

### 5.1 获取地址列表

**接口地址**: `GET /addresses`

**响应数据**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "addr_001",
      "contactName": "张明华",
      "contactPhone": "13812345678",
      "address": "深圳市南山区科技园南区深南大道9988号",
      "isDefault": true,
      "visitCount": 8,
      "lastVisit": "2025-08-20",
      "addTime": "2023-06-15"
    }
  ]
}
```

### 5.2 添加地址

**接口地址**: `POST /addresses`

**请求参数**:
```json
{
  "contactName": "张明华",
  "contactPhone": "13812345678",
  "address": "深圳市南山区科技园南区深南大道9988号",
  "isDefault": false
}
```

### 5.3 更新地址

**接口地址**: `PUT /addresses/{addressId}`

### 5.4 删除地址

**接口地址**: `DELETE /addresses/{addressId}`

## 6. 社区互动模块

### 6.1 获取社区动态

**接口地址**: `GET /community/posts`

**请求参数**:
```
type: all|health|experience|question
page: 1
pageSize: 10
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "post_001",
        "userId": "user_001",
        "userNickname": "张医生",
        "userAvatar": "👨‍⚕️",
        "type": "health",
        "title": "血压监测小贴士",
        "content": "每天固定时间测量血压，有助于更好地掌握血压变化规律...",
        "images": ["图片URL"],
        "publishTime": "2025-08-25 10:00:00",
        "likeCount": 15,
        "commentCount": 3,
        "isLiked": false
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 6.2 发布动态

**接口地址**: `POST /community/posts`

**请求参数**:
```json
{
  "type": "health",
  "title": "血压监测小贴士",
  "content": "每天固定时间测量血压，有助于更好地掌握血压变化规律...",
  "images": ["图片URL"]
}
```

### 6.3 点赞/取消点赞

**接口地址**: `POST /community/posts/{postId}/like`

### 6.4 评论动态

**接口地址**: `POST /community/posts/{postId}/comments`

**请求参数**:
```json
{
  "content": "很有用的建议，谢谢分享！",
  "replyToCommentId": null
}
```

## 7. 医院挂号模块

### 7.1 获取医院列表

**接口地址**: `GET /hospitals`

**响应数据**:
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "市第一人民医院",
      "address": "市中心区人民路123号",
      "phone": "0755-12345678",
      "level": "三甲",
      "distance": 2.5,
      "departments": [
        {
          "id": 1,
          "name": "心内科",
          "doctorCount": 15,
          "availableToday": true
        }
      ]
    }
  ]
}
```

### 7.2 获取科室列表

**接口地址**: `GET /hospitals/{hospitalId}/departments`

### 7.3 获取医生列表

**接口地址**: `GET /hospitals/{hospitalId}/departments/{deptId}/doctors`

### 7.4 预约挂号

**接口地址**: `POST /hospitals/appointments`

**请求参数**:
```json
{
  "hospitalId": 1,
  "departmentId": 1,
  "doctorId": 1,
  "appointmentDate": "2025-08-26",
  "timeSlot": "09:00",
  "patientName": "张明华",
  "patientPhone": "13812345678",
  "symptoms": "胸闷气短"
}
```

## 8. 管理员模块

### 8.1 管理员登录

**接口地址**: `POST /admin/login`

**请求参数**:
```json
{
  "password": "admin123"
}
```

**响应数据**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "admin_jwt_token",
    "permissions": [
      "viewUserData",
      "viewSensitiveInfo",
      "exportData",
      "freezeUser"
    ],
    "expireTime": "2025-08-25 15:30:00"
  }
}
```

### 8.2 获取用户列表

**接口地址**: `GET /admin/users`

**请求参数**:
```
keyword: 搜索关键词
status: all|active|inactive
memberLevel: all|regular|vip
sortBy: registerTime|lastVisit|serviceCount|totalSpent
sortOrder: asc|desc
page: 1
pageSize: 20
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "user_001",
        "nickname": "张医生",
        "realName": "张明华",
        "phone": "138****5678",
        "avatar": "👨‍⚕️",
        "status": "active",
        "memberLevel": "vip",
        "serviceCount": 15,
        "totalSpent": 2500,
        "registerTime": "2023-06-15 10:30:00",
        "lastVisit": "2025-08-20 14:20:00"
      }
    ],
    "total": 6,
    "page": 1,
    "pageSize": 20
  }
}
```

### 8.3 获取用户详情

**接口地址**: `GET /admin/users/{userId}`

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "userInfo": {
      "id": "user_001",
      "nickname": "张医生",
      "realName": "张明华",
      "phone": "138****5678",
      "fullPhone": "13812345678",
      "idCard": "440106********1234",
      "fullIdCard": "440106199001011234",
      "email": "zh***@email.com",
      "fullEmail": "zhangming@email.com",
      "age": 35,
      "gender": "男",
      "birthday": "1990-01-01",
      "registerTime": "2023-06-15 10:30:00",
      "lastVisit": "2025-08-20 14:20:00",
      "lastLoginIP": "192.168.1.100",
      "status": "active",
      "memberLevel": "vip",
      "serviceCount": 15,
      "totalSpent": 2500,
      "emergencyContact": "李女士 13987654321",
      "emergencyRelation": "配偶",
      "healthCondition": "良好",
      "allergies": "青霉素过敏",
      "medicalHistory": "高血压病史3年",
      "preferredServices": ["基础健康监测", "慢病管理"],
      "deviceInfo": {
        "platform": "iOS",
        "model": "iPhone 13",
        "version": "15.0"
      }
    },
    "addressHistory": [
      {
        "id": "addr_001_1",
        "address": "深圳市南山区科技园南区深南大道9988号",
        "contactName": "张明华",
        "contactPhone": "13812345678",
        "isDefault": true,
        "visitCount": 8,
        "lastVisit": "2025-08-20",
        "addTime": "2023-06-15"
      }
    ],
    "serviceHistory": [
      {
        "id": "service_001_1",
        "serviceName": "基础健康监测",
        "serviceTime": "2025-08-20 14:00",
        "cost": 100,
        "nurse": "护士小王",
        "duration": 45,
        "rating": 5,
        "feedback": "服务很专业，护士态度很好，会继续使用。"
      }
    ]
  }
}
```

### 8.4 冻结/解冻用户

**接口地址**: `PUT /admin/users/{userId}/status`

**请求参数**:
```json
{
  "status": "frozen",
  "reason": "违规操作"
}
```

### 8.5 导出用户数据

**接口地址**: `GET /admin/users/export`

**请求参数**:
```
userIds: user_001,user_002
format: excel|csv
```

## 9. 通用接口

### 9.1 文件上传

**接口地址**: `POST /upload`

**请求参数**: FormData
```
file: 文件对象
type: avatar|health_report|community_image
```

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "url": "https://cdn.health-guard.com/uploads/20250825/xxx.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

### 9.2 获取配置信息

**接口地址**: `GET /config`

**响应数据**:
```json
{
  "code": 200,
  "data": {
    "version": "1.0.0",
    "features": {
      "communityEnabled": true,
      "hospitalBookingEnabled": true,
      "videoCallEnabled": false
    },
    "contact": {
      "phone": "400-888-8888",
      "email": "support@health-guard.com",
      "workTime": "9:00-18:00"
    }
  }
}
```

## 错误代码说明

| 错误代码 | 说明 |
|----------|------|
| 10001 | 用户未登录 |
| 10002 | 用户已被冻结 |
| 10003 | 用户不存在 |
| 20001 | 服务类型不存在 |
| 20002 | 预约时间冲突 |
| 20003 | 预约已取消 |
| 30001 | 文件上传失败 |
| 30002 | 文件格式不支持 |
| 40001 | 管理员密码错误 |
| 40002 | 管理员权限不足 |
| 40003 | 管理员登录已过期 |

## 接口调用示例

### JavaScript调用示例

```javascript
// 用户登录
const login = async (code, userInfo) => {
  try {
    const response = await wx.request({
      url: 'https://api.health-guard.com/v1/auth/wechat-login',
      method: 'POST',
      data: {
        code,
        userInfo
      }
    });
    
    if (response.data.code === 200) {
      // 保存token
      wx.setStorageSync('token', response.data.data.token);
      return response.data.data;
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
};

// 创建预约
const createBooking = async (bookingData) => {
  const token = wx.getStorageSync('token');
  
  try {
    const response = await wx.request({
      url: 'https://api.health-guard.com/v1/bookings',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: bookingData
    });
    
    return response.data;
  } catch (error) {
    console.error('创建预约失败:', error);
  }
};
```

---

**文档更新时间**: 2025-08-25  
**文档版本**: v1.0  
**维护人员**: 开发团队