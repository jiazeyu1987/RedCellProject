#!/usr/bin/env node

/**
 * 快速检查测试用户数量工具
 * 用于压力测试脚本中显示测试用户统计信息
 */

const mysql = require('mysql2/promise');

async function checkTestUsers() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'abcd1234!',
      database: process.env.DB_DATABASE || 'health_guard_db'
    });

    // 查询测试用户数量
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE open_id LIKE 'wx_test_%' 
         OR open_id LIKE 'wx_virtual_%'
    `);

    const testUserCount = rows[0].count;
    console.log(`📊 Test Users: ${testUserCount} found`);

    // 如果有测试用户，显示更多信息
    if (testUserCount > 0) {
      const [recentUsers] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE (open_id LIKE 'wx_test_%' OR open_id LIKE 'wx_virtual_%')
          AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
      `);
      
      if (recentUsers[0].count > 0) {
        console.log(`   ↳ ${recentUsers[0].count} created in last 24 hours`);
      }
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('📊 Test Users: Database connection failed');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('📊 Test Users: Database access denied');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('📊 Test Users: Database not found');
    } else {
      console.log('📊 Test Users: Unable to check');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行检查
checkTestUsers().catch(error => {
  console.log('📊 Test Users: Check failed');
  process.exit(1);
});