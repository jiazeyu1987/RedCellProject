const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

console.log('🔍 开始数据库连接测试...');
console.log('📋 数据库配置:');
console.log(`   主机: ${config.host}:${config.port}`);
console.log(`   用户: ${config.user}`);
console.log(`   数据库: ${config.database}`);
console.log('');

async function testDatabaseConnection() {
  let connection;
  
  try {
    console.log('🔄 步骤1: 测试基础连接...');
    
    // 测试基础连接（不指定数据库）
    const basicConfig = { ...config };
    delete basicConfig.database;
    
    connection = await mysql.createConnection(basicConfig);
    console.log('✅ 数据库服务器连接成功');
    
    // 检查数据库是否存在
    console.log('🔄 步骤2: 检查数据库是否存在...');
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === config.database);
    
    if (dbExists) {
      console.log(`✅ 数据库 "${config.database}" 存在`);
    } else {
      console.log(`❌ 数据库 "${config.database}" 不存在`);
      console.log('💡 解决方案: 请先创建数据库');
      console.log(`   CREATE DATABASE ${config.database};`);
      return false;
    }
    
    await connection.end();
    
    // 重新连接到指定数据库
    console.log('🔄 步骤3: 连接到目标数据库...');
    connection = await mysql.createConnection(config);
    console.log(`✅ 成功连接到数据库 "${config.database}"`);
    
    // 检查必要的表是否存在
    console.log('🔄 步骤4: 检查必要的数据表...');
    const requiredTables = ['users', 'user_subscriptions', 'payment_records', 'health_records'];
    const [tables] = await connection.execute('SHOW TABLES');
    const existingTables = tables.map(table => Object.values(table)[0]);
    
    console.log('📋 数据表状态:');
    let allTablesExist = true;
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table} - 存在`);
      } else {
        console.log(`   ❌ ${table} - 不存在`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('');
      console.log('💡 解决方案: 请运行数据库初始化脚本创建缺失的表');
      return false;
    }
    
    // 检查users表结构
    console.log('🔄 步骤5: 检查users表结构...');
    const [userColumns] = await connection.execute('DESCRIBE users');
    const requiredColumns = ['id', 'open_id', 'nickname', 'member_level', 'service_count', 'total_spent'];
    
    console.log('📋 users表字段状态:');
    let allColumnsExist = true;
    
    for (const column of requiredColumns) {
      const columnExists = userColumns.some(col => col.Field === column);
      if (columnExists) {
        console.log(`   ✅ ${column} - 存在`);
      } else {
        console.log(`   ❌ ${column} - 不存在`);
        allColumnsExist = false;
      }
    }
    
    if (!allColumnsExist) {
      console.log('');
      console.log('💡 解决方案: 请更新数据库表结构');
      return false;
    }
    
    // 测试插入权限
    console.log('🔄 步骤6: 测试数据库权限...');
    const testUserId = `test_${Date.now()}`;
    
    try {
      await connection.execute(
        'INSERT INTO users (id, open_id, nickname, member_level, service_count, total_spent, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [testUserId, testUserId, '测试用户', 'regular', 0, 0, 'active']
      );
      console.log('✅ 插入权限正常');
      
      // 清理测试数据
      await connection.execute('DELETE FROM users WHERE id = ?', [testUserId]);
      console.log('✅ 删除权限正常');
      
    } catch (error) {
      console.log('❌ 数据库权限不足:', error.message);
      return false;
    }
    
    console.log('');
    console.log('🎉 数据库连接测试全部通过！');
    console.log('✨ 可以正常生成用户数据');
    return true;
    
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    console.log('');
    console.log('🔧 常见问题解决方案:');
    console.log('1. 检查MySQL服务是否启动');
    console.log('2. 检查数据库用户名和密码');
    console.log('3. 检查数据库主机和端口');
    console.log('4. 检查防火墙设置');
    console.log('5. 检查数据库权限设置');
    return false;
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行测试
testDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 测试过程中发生异常:', error.message);
  process.exit(1);
});