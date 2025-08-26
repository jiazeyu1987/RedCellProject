const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'https://servicewechat.com'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
const apiPrefix = process.env.NODE_ENV === 'test' ? '/api' : (process.env.API_PREFIX || '/v1');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');
const healthRoutes = require('./routes/health');
const communityRoutes = require('./routes/community');
const hospitalRoutes = require('./routes/hospitals');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const configRoutes = require('./routes/config');

// 注册路由
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/services`, serviceRoutes);
app.use(`${apiPrefix}/bookings`, bookingRoutes);
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/community`, communityRoutes);
app.use(`${apiPrefix}/hospitals`, hospitalRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes);
app.use(`${apiPrefix}/config`, configRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: '请求参数错误',
      details: error.details
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: 'Token无效'
    });
  }
  
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 健康守护服务器启动成功`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🔗 API前缀: ${apiPrefix}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  });
}

module.exports = app;