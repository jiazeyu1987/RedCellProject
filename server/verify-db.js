const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDatabaseConnection() {
  console.log('🔍 验证数据库连接...\n');
  
  // 数据库连接配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'abcd1234!',
    charset: 'utf8mb4',
    timezone: '+08:00'
  };

  console.log('📋 连接信息:');
  console.log(`   主机: ${dbConfig.host}`);
  console.log(`   端口: ${dbConfig.port}`);
  console.log(`   用户名: ${dbConfig.user}`);
  console.log(`   密码: ${'*'.repeat(dbConfig.password.length)}`);
  console.log(`   数据库: ${process.env.DB_DATABASE || 'health_guard_db'}\n`);

  let connection = null;

  try {
    // 1. 测试基本连接（不指定数据库）
    console.log('1️⃣ 测试MySQL服务连接...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ MySQL服务连接成功\n');

    // 2. 检查数据库是否存在
    const databaseName = process.env.DB_DATABASE || 'health_guard_db';
    console.log('2️⃣ 检查数据库是否存在...');
    
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${databaseName}'`);
    
    if (databases.length === 0) {
      console.log(`⚠️  数据库 '${databaseName}' 不存在，正在创建...`);
      await connection.execute(`CREATE DATABASE ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 数据库 '${databaseName}' 创建成功\n`);
    } else {
      console.log(`✅ 数据库 '${databaseName}' 已存在\n`);
    }

    // 3. 连接到指定数据库
    await connection.end();
    console.log('3️⃣ 测试连接到指定数据库...');
    
    connection = await mysql.createConnection({
      ...dbConfig,
      database: databaseName
    });
    console.log('✅ 成功连接到指定数据库\n');

    // 4. 测试基本SQL操作
    console.log('4️⃣ 测试基本SQL操作...');
    const [result] = await connection.execute('SELECT NOW() as `current_time`, VERSION() as mysql_version');
    console.log(`✅ SQL测试成功`);
    console.log(`   当前时间: ${result[0].current_time}`);
    console.log(`   MySQL版本: ${result[0].mysql_version}\n`);

    // 5. 检查现有表
    console.log('5️⃣ 检查现有数据表...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('📋 数据库中暂无数据表');
    } else {
      console.log('📋 现有数据表:');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`   ${index + 1}. ${tableName}`);
      });
    }

    console.log('\n🎉 数据库连接验证完成，所有检查通过！');
    return true;

  } catch (error) {
    console.error('\n❌ 数据库连接验证失败:');
    console.error('==========================================');
    console.error(`错误代码: ${error.code || 'UNKNOWN'}`);
    console.error(`错误信息: ${error.message}`);
    
    if (error.sqlMessage) {
      console.error(`SQL错误: ${error.sqlMessage}`);
    }
    
    console.error('==========================================\n');
    
    // 提供解决建议
    console.log('🔧 可能的解决方案:');
    
    switch (error.code) {
      case 'ECONNREFUSED':
        console.log('   • MySQL服务未启动，请启动MySQL服务');
        console.log('   • 检查端口3306是否被占用');
        break;
        
      case 'ER_ACCESS_DENIED_ERROR':
        console.log('   • 检查用户名和密码是否正确');
        console.log('   • 确认用户具有相应权限');
        break;
        
      case 'ER_BAD_DB_ERROR':
        console.log('   • 数据库不存在，程序会自动创建');
        break;
        
      case 'ENOTFOUND':
        console.log('   • 检查主机地址是否正确');
        break;
        
      default:
        console.log('   • 检查网络连接');
        console.log('   • 确认MySQL服务正在运行');
        console.log('   • 验证防火墙设置');
    }
    
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此文件，则执行验证
if (require.main === module) {
  verifyDatabaseConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('验证过程出错:', error);
      process.exit(1);
    });
}

module.exports = verifyDatabaseConnection;