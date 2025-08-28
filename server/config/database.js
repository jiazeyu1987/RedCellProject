const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db',
  charset: 'utf8mb4',
  timezone: 'local',
  dateStrings: true
};

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 安全处理参数，将undefined转换为null
function sanitizeParams(params) {
  if (!Array.isArray(params)) {
    return params === undefined ? null : params;
  }
  
  return params.map(param => param === undefined ? null : param);
}

// 执行查询
async function query(sql, params = []) {
  try {
    // 检查是否为事务控制语句，如果是则抛出有用的错误信息
    const transactionCommands = ['START TRANSACTION', 'BEGIN', 'COMMIT', 'ROLLBACK'];
    const upperSql = sql.trim().toUpperCase();
    
    for (const cmd of transactionCommands) {
      if (upperSql.startsWith(cmd)) {
        throw new Error(`不能直接执行事务命令 "${cmd}"。请使用 transaction() 函数来处理事务操作。`);
      }
    }
    
    // 安全处理参数
    const safeParams = sanitizeParams(params);
    
    const [rows] = await pool.execute(sql, safeParams);
    return rows;
  } catch (error) {
    // 在测试环境中对预期的重复条目错误不输出详细日志
    const isDuplicateEntry = error.code === 'ER_DUP_ENTRY';
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    if (!isTestEnv || !isDuplicateEntry) {
      console.error('数据库查询错误:', error);
    }
    throw error;
  }
}

// 执行事务
async function transaction(callback) {
  const connection = await pool.getConnection();
  
  // 为connection添加安全的execute方法
  const originalExecute = connection.execute.bind(connection);
  connection.execute = function(sql, params = []) {
    const safeParams = sanitizeParams(params);
    return originalExecute(sql, safeParams);
  };
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 初始化数据库
async function initDatabase() {
  console.log('🔄 开始初始化数据库...');
  
  try {
    // 检查数据库是否存在，不存在则创建
    const createDbSql = `CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
    await pool.execute(createDbSql);
    
    console.log('✅ 数据库初始化完成');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return false;
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  initDatabase,
  sanitizeParams
};