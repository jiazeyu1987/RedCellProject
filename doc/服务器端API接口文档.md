# 健康守护小程序 - 服务器端API接口文档

## 文档说明

本文档描述了健康守护微信小程序服务器端API接口的技术实现规范。

## 技术架构

### 技术栈
- **后端框架**: Node.js + Express.js
- **数据库**: MySQL 8.0 + Redis
- **认证**: JWT Token
- **文件存储**: 阿里云OSS
- **推送服务**: 微信模板消息

### 项目结构
```
health-guard-api/
├── controllers/          # 控制器层
├── services/            # 业务逻辑层
├── models/              # 数据模型层
├── middlewares/         # 中间件
├── routes/              # 路由配置
├── utils/               # 工具函数
└── config/              # 配置文件
```

## 核心数据库表设计

### 用户表 (users)
```sql
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL COMMENT '用户ID',
  `open_id` varchar(100) NOT NULL COMMENT '微信OpenID',
  `nickname` varchar(100) NOT NULL COMMENT '昵称',
  `real_name` varchar(50) DEFAULT NULL COMMENT '真实姓名',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `member_level` enum('regular','vip') DEFAULT 'regular' COMMENT '会员等级',
  `status` enum('active','inactive','frozen') DEFAULT 'active' COMMENT '用户状态',
  `service_count` int DEFAULT 0 COMMENT '服务次数',
  `total_spent` decimal(10,2) DEFAULT 0.00 COMMENT '总消费金额',
  `register_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_open_id` (`open_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 预约订单表 (bookings)
```sql
CREATE TABLE `bookings` (
  `id` varchar(50) NOT NULL COMMENT '预约ID',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `service_id` int NOT NULL COMMENT '服务类型ID',
  `appointment_time` timestamp NOT NULL COMMENT '预约时间',
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `price` decimal(10,2) NOT NULL COMMENT '服务价格',
  `create_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 健康记录表 (health_records)
```sql
CREATE TABLE `health_records` (
  `id` varchar(50) NOT NULL COMMENT '记录ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `type` varchar(50) NOT NULL COMMENT '记录类型',
  `value` json NOT NULL COMMENT '记录值',
  `record_time` timestamp NOT NULL COMMENT '记录时间',
  `source` enum('self','nurse','device','doctor') DEFAULT 'self',
  `create_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 核心接口实现

### 1. 用户认证

```javascript
// 微信登录
async wechatLogin(req, res) {
  const { code, userInfo } = req.body;
  
  // 获取微信OpenID
  const wxUserInfo = await this.getWechatUserInfo(code);
  
  // 查找或创建用户
  let user = await User.findByOpenId(wxUserInfo.openid);
  if (!user) {
    user = await User.create({
      openId: wxUserInfo.openid,
      nickname: userInfo.nickName
    });
  }
  
  // 生成JWT Token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    code: 200,
    data: { token, userInfo: user }
  });
}
```

### 2. 预约服务

```javascript
// 创建预约
async createBooking(req, res) {
  const { serviceId, appointmentTime, address } = req.body;
  const userId = req.user.id;
  
  // 验证服务类型和时间
  const serviceType = await ServiceType.findById(serviceId);
  
  // 创建预约
  const booking = await Booking.create({
    userId,
    serviceId,
    appointmentTime,
    price: serviceType.price,
    orderNo: generateOrderNo()
  });
  
  res.json({
    code: 200,
    message: '预约成功',
    data: booking
  });
}
```

### 3. 健康数据

```javascript
// 添加健康记录
async addHealthRecord(req, res) {
  const { type, value, recordTime } = req.body;
  const userId = req.user.id;
  
  const record = await HealthRecord.create({
    userId,
    type,
    value,
    recordTime: recordTime || new Date()
  });
  
  res.json({
    code: 200,
    data: record
  });
}
```

### 4. 管理员接口

```javascript
// 获取用户列表
async getUserList(req, res) {
  const { keyword, status, page = 1, pageSize = 20 } = req.query;
  
  const result = await User.getList({
    keyword,
    status,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
  
  res.json({
    code: 200,
    data: result
  });
}
```

## 中间件

### JWT认证中间件
```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({ code: 401, message: '请先登录' });
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId);
  
  req.user = user;
  next();
};
```

### 管理员权限中间件
```javascript
const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  
  // 检查30分钟过期时间
  const expireTime = new Date(decoded.loginTime + 30 * 60 * 1000);
  if (new Date() > expireTime) {
    return res.json({ code: 401, message: '管理员登录已过期' });
  }
  
  req.admin = await Admin.findById(decoded.adminId);
  next();
};
```

## 配置文件

### 环境配置 (.env)
```env
NODE_ENV=production
PORT=3000

# 数据库
DB_HOST=localhost
DB_USERNAME=health_guard
DB_PASSWORD=your_password
DB_DATABASE=health_guard_db

# JWT
JWT_SECRET=your_jwt_secret
ADMIN_JWT_SECRET=your_admin_jwt_secret

# 微信
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

# OSS
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=health-guard-files
```

### 数据库配置
```javascript
// config/database.js
module.exports = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4',
  timezone: '+08:00',
  pool: {
    min: 2,
    max: 10
  }
};
```

## 部署配置

### Docker配置
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Nginx配置
```nginx
server {
    listen 80;
    server_name api.health-guard.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

**文档版本**: v1.0  
**维护人员**: 后端开发团队