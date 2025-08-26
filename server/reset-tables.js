const { query, testConnection } = require('./config/database');
require('dotenv').config();

async function resetTables() {
  console.log('🔄 重置数据库表...');
  
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    
    // 删除现有表（按依赖关系倒序）
    console.log('🗑️ 删除现有表...');
    const tablesToDrop = [
      'bookings',
      'addresses', 
      'admin_sessions',
      'users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ 删除表 ${table}`);
      } catch (error) {
        console.log(`⚠️ 表 ${table} 不存在或删除失败: ${error.message}`);
      }
    }
    
    // 创建新表
    console.log('📋 创建新表...');
    
    // 用户表
    const createUsersTable = `
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        open_id VARCHAR(100) UNIQUE NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        avatar VARCHAR(500),
        phone VARCHAR(20),
        email VARCHAR(100),
        real_name VARCHAR(50),
        gender ENUM('男','女','未知') DEFAULT '未知',
        birthday DATE,
        status ENUM('active','disabled') DEFAULT 'active',
        member_level ENUM('regular','vip') DEFAULT 'regular',
        service_count INT DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await query(createUsersTable);
    console.log('✅ 创建用户表');
    
    // 地址表
    const createAddressesTable = `
      CREATE TABLE addresses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        province VARCHAR(20),
        city VARCHAR(20),
        district VARCHAR(20),
        address TEXT NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await query(createAddressesTable);
    console.log('✅ 创建地址表');
    
    // 预约表
    const createBookingsTable = `
      CREATE TABLE bookings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        service_date DATE NOT NULL,
        service_time TIME NOT NULL,
        address_id INT,
        status ENUM('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_service_date (service_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await query(createBookingsTable);
    console.log('✅ 创建预约表');
    
    // 管理员会话表
    const createAdminSessionsTable = `
      CREATE TABLE admin_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await query(createAdminSessionsTable);
    console.log('✅ 创建管理员会话表');
    
    console.log('🎉 数据库表重置完成!');
    
  } catch (error) {
    console.error('❌ 重置数据库表失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetTables().then(() => {
    process.exit(0);
  });
}

module.exports = resetTables;