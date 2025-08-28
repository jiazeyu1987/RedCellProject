# 常见问题和解决方案

## 🔧 开发环境问题

### Q1: 数据库连接失败
**症状**: `Error: connect ECONNREFUSED 127.0.0.1:3306`  
**解决方案**:
```bash
# 1. 检查MySQL服务状态
npm run check-db

# 2. 验证数据库连接
node test-db-connection.js

# 3. 重置数据库表
node reset-tables.js
```

### Q2: 微信开发者工具授权问题
**症状**: 无法获取用户OpenID  
**解决方案**:
```bash
# 诊断小程序认证问题
node diagnose-miniprogram-auth.js

# 检查云函数配置
cat cloudfunctions/quickstartFunctions/config.json
```

### Q3: 管理后台无法登录
**症状**: 401认证失败  
**解决方案**:
```bash
# 测试管理员API通信
node test-admin-api-communication.js

# 检查认证中间件日志
# 查看server控制台输出
```

## 🐛 API相关问题

### Q4: API冲突检测
**问题**: 客户端调用API失败  
**解决方案**:
```bash
# 1. 扫描API接口
node api-scanner.js

# 2. 检测冲突
node conflict-detector.js  

# 3. 生成解决方案
node doc-generator.js
```

### Q5: 认证Token过期
**症状**: Token已过期，请重新登录  
**解决方案**:
```javascript
// 客户端自动刷新token
localStorage.removeItem('admin_token');
window.location.href = '/login';

// 或者实现token自动续期机制
```

### Q6: 跨域问题
**症状**: CORS policy错误  
**解决方案**:
```javascript
// admin-portal/src/setupProxy.js
module.exports = function(app) {
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: { '^/api': '/v1' }
  }));
};
```

## 💾 数据库问题

### Q7: 表结构不一致
**症状**: 字段不存在错误  
**解决方案**:
```bash
# 1. 检查表结构
node server/scripts/check-tables.js

# 2. 运行迁移
node server/scripts/migrate.js

# 3. 更新健康表结构  
node server/scripts/update-health-table.js
```

### Q8: 数据模型字段映射
**问题**: realName vs real_name字段冲突  
**解决方案**:
```javascript
// 在User模型中处理字段映射
static async update(userId, updateData) {
  // 处理realName字段映射
  if (updateData.realName !== undefined) {
    fields.push('real_name = ?');
    values.push(updateData.realName);
  }
}
```

## 🧪 测试问题

### Q9: 单元测试失败
**症状**: 测试用例执行失败  
**解决方案**:
```bash
# 1. 运行特定测试
cd server && npm test -- --testPathPattern=user

# 2. 查看覆盖率报告
npm run coverage

# 3. 修复数据库测试环境
npm run test:setup
```

### Q10: 负载测试工具使用
**问题**: 如何进行性能测试  
**解决方案**:
```bash
# 进入负载测试目录
cd load-testing

# 安装依赖
npm install

# 运行负载测试
npm start
```

## 🚀 部署问题

### Q11: 服务器启动失败
**症状**: 端口被占用或服务异常  
**解决方案**:
```bash
# 1. 检查端口占用
netstat -ano | findstr :3000

# 2. 强制重启服务
./restart-server.bat

# 3. 完整系统启动
./start-system.bat
```

### Q12: 云函数部署失败
**症状**: 云函数上传或调用失败  
**解决方案**:
```bash
# 上传云函数
./uploadCloudFunction.sh

# 检查云函数配置
cat cloudfunctions/quickstartFunctions/package.json
```

## 📊 监控和诊断

### Q13: 系统健康检查
**定期维护命令**:
```bash
# 综合诊断
node diagnose-errors.js

# 数据库诊断  
node diagnose-db.js

# API状态检查
node api-monitor.js scan
```

### Q14: 日志分析
**查看关键日志**:
```bash
# 服务器错误日志
tail -f server/logs/error.log

# API请求日志
tail -f server/logs/access.log

# 测试输出
cat server/test_output.txt
```

## 🔄 开发工作流

### Q15: 标准开发流程
**推荐工作流**:
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 启动开发环境
./start-system.bat

# 4. 运行测试
npm test

# 5. API冲突检测
node api-monitor.js scan

# 6. 提交代码前检查
npm run lint
```

### Q16: 代码规范检查
**质量保证**:
```bash
# ESLint检查
npm run lint

# 格式化代码
npm run format  

# 类型检查(如果使用TypeScript)
npm run type-check
```

## 📞 获取帮助

### 诊断工具
- `diagnose-errors.js`: 综合系统诊断
- `diagnose-db.js`: 数据库连接诊断  
- `diagnose-miniprogram-auth.js`: 小程序认证诊断

### 文档参考
- [API接口文档.md](../API接口文档.md)
- [数据库设计文档.md](../doc/数据库设计文档.md)
- [项目实施步骤.txt](../doc/上门医疗服务项目实施步骤文档.txt)

### 联系支持
如问题仍未解决，请：
1. 运行相应诊断工具
2. 收集错误日志
3. 提供详细的问题描述
4. 联系开发团队获取支持