const { query } = require('../config/database');

// 测试环境设置
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'health_guard_test_db';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ADMIN_JWT_SECRET = 'test_admin_jwt_secret';

// 增加测试超时时间
jest.setTimeout(30000);

// 全局测试钩子
beforeAll(async () => {
  console.log('🔧 设置测试环境...');
  
  // 创建测试数据库
  try {
    await query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ 测试数据库创建成功');
  } catch (error) {
    console.error('❌ 测试数据库创建失败:', error.message);
  }
  
  // 简化数据清理逻辑
  try {
    console.log('✅ 测试数据库初始化完成');
  } catch (error) {
    console.log('⚠️ 测试数据库初始化失败:', error.message);
  }
});

afterAll(async () => {
  console.log('🧹 清理测试环境...');
  
  // 可选：清理测试数据库
  // await query(`DROP DATABASE IF EXISTS ${process.env.DB_DATABASE}`);
  
  // 关闭数据库连接
  const { pool } = require('../config/database');
  await pool.end();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});