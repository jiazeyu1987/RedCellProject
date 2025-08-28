const { 
  generateVirtualUser, 
  generateUserSubscription, 
  generatePaymentRecord,
  generateHealthRecord
} = require('./userGenerator.js');
const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

console.log('🔍 用户创建失败详细诊断');
console.log('========================================');
console.log('');

async function debugUserCreation() {
  let connection;
  
  try {
    // 1. 测试数据库连接
    console.log('📋 步骤1: 测试数据库连接...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');

    // 2. 检查表结构
    console.log('');
    console.log('📋 步骤2: 检查数据表结构...');
    const requiredTables = ['users', 'user_subscriptions', 'payment_records', 'subscription_plans', 'health_records'];
    
    for (const table of requiredTables) {
      try {
        const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
        console.log(`✅ ${table} 表存在，当前记录数: ${result[0].count}`);
      } catch (error) {
        console.log(`❌ ${table} 表不存在或无法访问: ${error.message}`);
      }
    }

    // 3. 检查users表字段
    console.log('');
    console.log('📋 步骤3: 检查users表字段结构...');
    const [userColumns] = await connection.execute('DESCRIBE users');
    const requiredFields = ['service_count', 'total_spent', 'member_level'];
    
    console.log('🔍 users表字段:');
    userColumns.forEach(col => {
      const isRequired = requiredFields.includes(col.Field);
      console.log(`   ${isRequired ? '✅' : '📋'} ${col.Field} (${col.Type})`);
    });

    // 4. 生成测试用户数据
    console.log('');
    console.log('📋 步骤4: 生成测试用户数据...');
    const testUser = generateVirtualUser();
    console.log('✅ 用户数据生成成功');
    console.log('📊 用户数据预览:', JSON.stringify({
      nickname: testUser.nickname,
      member_level: testUser.member_level,
      service_count: testUser.service_count,
      total_spent: testUser.total_spent
    }, null, 2));

    // 5. 测试用户插入
    console.log('');
    console.log('📋 步骤5: 测试用户数据插入...');
    const insertUserSql = `
      INSERT INTO users (
        open_id, nickname, real_name, phone, age, gender, 
        member_level, status, health_condition, latitude, longitude, 
        assignment_status, service_count, total_spent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const userValues = [
      testUser.open_id, testUser.nickname, testUser.real_name, testUser.phone,
      testUser.age, testUser.gender, testUser.member_level, testUser.status,
      testUser.health_condition, testUser.latitude, testUser.longitude,
      testUser.assignment_status, testUser.service_count, testUser.total_spent,
      testUser.created_at, testUser.updated_at
    ];

    try {
      const [userResult] = await connection.execute(insertUserSql, userValues);
      console.log('✅ 用户插入成功，ID:', userResult.insertId);
      
      // 6. 测试套餐订阅插入
      console.log('');
      console.log('📋 步骤6: 测试套餐订阅插入...');
      const subscription = generateUserSubscription(testUser.open_id, testUser.member_level);
      console.log('📦 套餐信息:', JSON.stringify({
        plan_id: subscription.plan_id,
        price: subscription.purchase_price,
        remaining_quota: subscription.remaining_quota
      }, null, 2));

      const insertSubSql = `
        INSERT INTO user_subscriptions (
          id, user_id, plan_id, status, start_date, end_date,
          remaining_quota, purchase_price, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const subValues = [
        subscription.id, subscription.user_id, subscription.plan_id,
        subscription.status, subscription.start_date, subscription.end_date,
        subscription.remaining_quota, subscription.purchase_price, subscription.create_time
      ];

      const [subResult] = await connection.execute(insertSubSql, subValues);
      console.log('✅ 套餐订阅插入成功');

      // 7. 测试支付记录插入
      console.log('');
      console.log('📋 步骤7: 测试支付记录插入...');
      const payment = generatePaymentRecord(testUser.open_id, subscription);
      
      const insertPaySql = `
        INSERT INTO payment_records (
          id, user_id, order_no, amount, payment_method, status, pay_time, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const payValues = [
        payment.id, payment.user_id, payment.order_no, payment.amount,
        payment.payment_method, payment.status, payment.pay_time, payment.create_time
      ];

      const [payResult] = await connection.execute(insertPaySql, payValues);
      console.log('✅ 支付记录插入成功');

      // 8. 清理测试数据
      console.log('');
      console.log('📋 步骤8: 清理测试数据...');
      await connection.execute('DELETE FROM payment_records WHERE user_id = ?', [testUser.open_id]);
      await connection.execute('DELETE FROM user_subscriptions WHERE user_id = ?', [testUser.open_id]);
      await connection.execute('DELETE FROM users WHERE open_id = ?', [testUser.open_id]);
      console.log('✅ 测试数据清理完成');

      console.log('');
      console.log('🎉 所有测试通过！用户生成器应该可以正常工作了');
      
    } catch (insertError) {
      console.log('❌ 数据插入失败:');
      console.log('   错误代码:', insertError.code);
      console.log('   错误信息:', insertError.message);
      
      if (insertError.sqlMessage) {
        console.log('   SQL错误:', insertError.sqlMessage);
      }
      
      console.log('');
      console.log('🔧 可能的解决方案:');
      
      if (insertError.code === 'ER_NO_SUCH_TABLE') {
        console.log('   - 表不存在，请运行数据库初始化脚本');
        console.log('   - 命令: node init-database.js');
      } else if (insertError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('   - 字段不存在，请检查表结构');
        console.log('   - 可能需要添加 service_count 和 total_spent 字段');
      } else if (insertError.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('   - 外键约束失败，检查关联表数据');
      } else if (insertError.code === 'ER_DUP_ENTRY') {
        console.log('   - 重复键冲突，可能是 open_id 重复');
      }
    }

  } catch (error) {
    console.log('❌ 诊断过程失败:', error.message);
    console.log('');
    console.log('🔧 基础问题解决方案:');
    console.log('   1. 检查MySQL服务是否启动');
    console.log('   2. 检查数据库连接配置');
    console.log('   3. 运行数据库初始化: node init-database.js');
    
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行诊断
debugUserCreation().catch(error => {
  console.error('💥 诊断异常:', error.message);
  process.exit(1);
});