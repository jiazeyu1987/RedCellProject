const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

console.log('🔍 数据库连接配置检查:');
console.log('==========================================');
console.log(`主机: ${dbConfig.host}`);
console.log(`端口: ${dbConfig.port}`);
console.log(`用户名: ${dbConfig.user}`);
console.log(`密码: ${'*'.repeat(dbConfig.password.length)}`);
console.log(`数据库: ${process.env.DB_DATABASE || 'health_guard_db'}`);
console.log('==========================================\n');

async function testDatabaseConnection() {
  console.log('🧪 开始测试数据库连接...\n');
  
  try {
    // 1. 测试基本连接（不指定数据库）
    console.log('1️⃣ 测试MySQL服务连接...');
    const basicConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    console.log('✅ MySQL服务连接成功');
    
    // 2. 检查数据库是否存在
    console.log('\n2️⃣ 检查数据库是否存在...');
    const databaseName = process.env.DB_DATABASE || 'health_guard_db';
    const [databases] = await basicConnection.execute(`SHOW DATABASES LIKE '${databaseName}'`);
    
    if (databases.length === 0) {
      console.log(`⚠️  数据库 '${databaseName}' 不存在，正在创建...`);
      await basicConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 数据库 '${databaseName}' 创建成功`);
    } else {
      console.log(`✅ 数据库 '${databaseName}' 已存在`);
    }
    
    await basicConnection.end();
    
    // 3. 测试完整连接（包含数据库）
    console.log('\n3️⃣ 测试完整数据库连接...');
    const fullConfig = {
      ...dbConfig,
      database: databaseName
    };
    
    const fullConnection = await mysql.createConnection(fullConfig);
    console.log('✅ 完整数据库连接成功');
    
    // 4. 测试基本SQL操作
    console.log('\n4️⃣ 测试基本SQL操作...');
    const [result] = await fullConnection.execute('SELECT 1 + 1 AS result');
    console.log(`✅ SQL测试成功，结果: ${result[0].result}`);
    
    // 5. 检查现有表
    console.log('\n5️⃣ 检查现有数据表...');
    const [tables] = await fullConnection.execute('SHOW TABLES');
    if (tables.length === 0) {
      console.log('📋 数据库中暂无数据表');
    } else {
      console.log('📋 现有数据表:');
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
      });
    }
    
    await fullConnection.end();
    
    console.log('\n🎉 数据库连接测试完成，所有检查通过！');
    console.log('\n💡 建议执行以下命令进行数据库迁移:');
    console.log('   npm run migrate');
    
  } catch (error) {
    console.error('\n❌ 数据库连接测试失败:');
    console.error('==========================================');
    console.error(`错误类型: ${error.code || 'UNKNOWN'}`);
    console.error(`错误信息: ${error.message}`);
    console.error('==========================================\n');
    
    // 提供解决建议
    console.log('🔧 可能的解决方案:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   1. 检查MySQL服务是否启动');
      console.log('      - Windows: net start mysql');
      console.log('      - macOS: brew services start mysql');
      console.log('      - Linux: sudo systemctl start mysql');
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   1. 检查用户名和密码是否正确');
      console.log('   2. 确认用户具有相应权限');
      console.log('   3. 尝试在.env文件中修改数据库配置');
    }
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('   1. 数据库不存在，将自动创建');
      console.log('   2. 检查用户是否有创建数据库的权限');
    }
    
    console.log('   3. 检查防火墙设置');
    console.log('   4. 确认MySQL端口3306未被占用');
    console.log('   5. 查看.env文件中的数据库配置');
    
    process.exit(1);
  }
}

// 运行测试
testDatabaseConnection();