# 代码规范和约定

## JavaScript编码规范

### 变量命名
- **常量**: 全大写+下划线 `const MAX_RETRY_COUNT = 3`
- **变量/函数**: 驼峰命名 `const userName = 'admin'`
- **类名**: 帕斯卡命名 `class UserModel {}`
- **文件名**: 小写+连字符 `user-service.js`

### 函数定义
```javascript
// ✅ 推荐：使用async/await
async function getUserById(userId) {
  try {
    const user = await UserModel.findById(userId);
    return user;
  } catch (error) {
    console.error('获取用户失败:', error);
    throw error;
  }
}

// ❌ 避免：使用Promise.then
function getUserById(userId) {
  return UserModel.findById(userId)
    .then(user => user)
    .catch(error => { throw error; });
}
```

### 错误处理
```javascript
// ✅ 统一错误响应格式
return Utils.error(res, '用户不存在', 404);

// ✅ 详细错误日志
console.error('数据库操作失败:', {
  operation: 'findById',
  userId: userId,
  error: error.message
});
```

## API设计规范

### 路由命名
- **RESTful风格**: `/v1/users/:id`
- **版本前缀**: `/v1/`, `/v2/`
- **资源名称**: 复数形式 `/users`, `/bookings`

### 响应格式
```javascript
// ✅ 成功响应
{
  "success": true,
  "data": { /* 数据内容 */ },
  "message": "操作成功"
}

// ✅ 错误响应  
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在"
  }
}
```

## 数据库规范

### 表命名
- 使用复数形式: `users`, `bookings`
- 小写+下划线: `health_records`
- 有意义的名称: `user_addresses`

### 字段命名
- 小写+下划线: `user_id`, `created_at`
- 布尔字段: `is_active`, `has_permission`
- 时间字段: `created_at`, `updated_at`

### 索引约定
- 主键: `PRIMARY KEY (id)`
- 外键: `KEY idx_user_id (user_id)`
- 唯一约束: `UNIQUE KEY uk_open_id (open_id)`

## 安全规范

### 数据验证
```javascript
// ✅ 输入验证
if (!userId || isNaN(parseInt(userId))) {
  throw new Error('无效的用户ID');
}

// ✅ SQL注入防护
const sql = 'SELECT * FROM users WHERE id = ?';
await query(sql, [userId]);
```

### 敏感信息处理
```javascript
// ✅ 数据脱敏
phone: Utils.maskPhone(user.phone)  // 138****5678
email: Utils.maskEmail(user.email)  // t***@example.com
```

## 注释规范

### 函数注释
```javascript
/**
 * 根据用户ID获取用户详细信息
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 用户信息对象
 * @throws {Error} 当用户不存在时抛出错误
 */
async function getUserById(userId) {
  // 实现代码
}
```

### 复杂逻辑注释
```javascript
// 检查token格式并选择相应的验证方式
// 优先使用简单token格式（推荐），向下兼容JWT格式
if (token.startsWith('admin_token_')) {
  // 处理简单token
} else {
  // 处理JWT token（兼容性支持）
}
```

## 测试规范

### 单元测试
- 文件命名: `*.test.js`
- 测试描述: 清晰的业务场景
- 覆盖率: 目标80%以上

```javascript
describe('UserModel.findById', () => {
  test('应该返回有效用户信息', async () => {
    const user = await UserModel.findById(1);
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  });
});
```