const { query, testConnection } = require('./config/database');

/**
 * 检查user_subscriptions表结构
 */
async function checkUserSubscriptionsTable() {
  console.log('🔍 开始检查user_subscriptions表结构...');
  
  try {
    // 测试数据库连接
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('数据库连接失败');
    }

    // 检查表是否存在
    const tableExistsQuery = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'health_guard_db' 
      AND table_name = 'user_subscriptions'
    `;
    
    const tableExists = await query(tableExistsQuery);
    
    if (tableExists[0].count === 0) {
      console.log('❌ user_subscriptions表不存在');
      return false;
    }
    
    console.log('✅ user_subscriptions表存在');
    
    // 获取表结构
    const tableStructure = await query('DESCRIBE user_subscriptions');
    
    console.log('\n📋 user_subscriptions表当前字段结构:');
    console.log('=====================================');
    tableStructure.forEach(field => {
      console.log(`${field.Field.padEnd(20)} | ${field.Type.padEnd(15)} | ${field.Null.padEnd(5)} | ${field.Key.padEnd(3)} | ${field.Default || 'NULL'}`);
    });
    
    // 检查specific字段是否存在
    const fieldNames = tableStructure.map(field => field.Field);
    const requiredFields = ['monthly_price', 'services_used', 'services_remaining', 'status', 'start_date', 'end_date'];
    
    console.log('\n🔍 检查必需字段:');
    console.log('=====================================');
    
    const missingFields = [];
    requiredFields.forEach(fieldName => {
      const exists = fieldNames.includes(fieldName);
      console.log(`${fieldName.padEnd(20)} | ${exists ? '✅ 存在' : '❌ 缺失'}`);
      if (!exists) {
        missingFields.push(fieldName);
      }
    });
    
    // 检查示例数据
    console.log('\n📊 表中数据统计:');
    console.log('=====================================');
    
    const countResult = await query('SELECT COUNT(*) as total FROM user_subscriptions');
    console.log(`总记录数: ${countResult[0].total}`);
    
    if (countResult[0].total > 0) {
      // 显示前5条记录的结构
      const sampleData = await query('SELECT * FROM user_subscriptions LIMIT 5');
      console.log('\n📝 示例数据 (前5条):');
      console.log('=====================================');
      sampleData.forEach((record, index) => {
        console.log(`记录 ${index + 1}:`, JSON.stringify(record, null, 2));
      });
    }
    
    // 返回检查结果
    return {
      tableExists: true,
      fields: fieldNames,
      missingFields,
      totalRecords: countResult[0].total,
      needsRepair: missingFields.length > 0
    };
    
  } catch (error) {
    console.error('❌ 检查表结构时出错:', error);
    return false;
  }
}

/**
 * 测试problemetic查询
 */
async function testProblematicQuery() {
  console.log('\n🧪 测试有问题的查询...');
  
  try {
    const testSql = `
      SELECT 
        us.monthly_price,
        us.services_used,
        us.services_remaining,
        us.status
      FROM user_subscriptions us 
      LIMIT 1
    `;
    
    const result = await query(testSql);
    console.log('✅ 查询成功，monthly_price字段存在');
    return true;
    
  } catch (error) {
    console.log('❌ 查询失败:', error.message);
    if (error.message.includes('monthly_price')) {
      console.log('🔍 确认：monthly_price字段确实不存在');
    }
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 开始user_subscriptions表诊断...\n');
  
  const checkResult = await checkUserSubscriptionsTable();
  
  if (checkResult) {
    await testProblematicQuery();
    
    console.log('\n📝 诊断总结:');
    console.log('=====================================');
    console.log(`表是否存在: ${checkResult.tableExists ? '✅' : '❌'}`);
    console.log(`总记录数: ${checkResult.totalRecords}`);
    console.log(`缺失字段数: ${checkResult.missingFields.length}`);
    
    if (checkResult.missingFields.length > 0) {
      console.log('缺失字段:', checkResult.missingFields.join(', '));
      console.log('\n⚠️  需要修复表结构!');
    } else {
      console.log('✅ 表结构完整');
    }
  }
  
  console.log('\n🏁 诊断完成');
  process.exit(0);
}

// 执行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  checkUserSubscriptionsTable,
  testProblematicQuery
};