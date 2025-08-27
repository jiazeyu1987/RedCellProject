const { query, testConnection } = require('../config/database');

// 检查所需的表
const requiredTables = [
  'health_knowledge',
  'qa_questions', 
  'community_posts',
  'post_likes'
];

async function checkTables() {
  console.log('🔍 检查数据库表...');
  
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    
    for (const tableName of requiredTables) {
      try {
        const result = await query(`SHOW TABLES LIKE '${tableName}'`);
        if (result.length > 0) {
          console.log(`✅ 表 ${tableName} 存在`);
          
          // 显示表结构
          const structure = await query(`DESCRIBE ${tableName}`);
          console.log(`📋 表 ${tableName} 结构:`);
          structure.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type}`);
          });
          console.log('');
        } else {
          console.log(`❌ 表 ${tableName} 不存在`);
        }
      } catch (error) {
        console.log(`❌ 检查表 ${tableName} 失败:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  checkTables();
}

module.exports = { checkTables };