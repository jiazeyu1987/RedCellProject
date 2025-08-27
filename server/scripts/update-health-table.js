// 更新health_records表结构脚本
const { query } = require('../config/database');
require('dotenv').config();

async function updateHealthRecordsTable() {
  console.log('🔄 开始更新 health_records 表结构...');
  
  try {
    // 1. 检查表是否存在
    console.log('📋 检查表结构...');
    
    try {
      const tableExists = await query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'health_records'
      `);
      
      if (tableExists[0].count === 0) {
        console.log('❌ health_records 表不存在，请先运行 npm run migrate');
        process.exit(1);
      }
      
      console.log('✅ health_records 表存在');
    } catch (error) {
      console.error('❌ 检查表存在性失败:', error.message);
      process.exit(1);
    }
    
    // 2. 检查是否已经有 status 字段
    try {
      const columns = await query('DESCRIBE health_records');
      const hasStatusColumn = columns.some(col => col.Field === 'status');
      
      if (hasStatusColumn) {
        console.log('✅ status 字段已存在，无需更新');
        
        // 检查其他可能缺失的字段
        const hasCreatedAt = columns.some(col => col.Field === 'created_at');
        const hasUpdatedAt = columns.some(col => col.Field === 'updated_at');
        
        if (!hasCreatedAt || !hasUpdatedAt) {
          console.log('📝 检测到时间字段缺失，正在添加...');
          
          if (!hasCreatedAt) {
            await query(`
              ALTER TABLE health_records 
              ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
            `);
            console.log('✅ 已添加 created_at 字段');
          }
          
          if (!hasUpdatedAt) {
            await query(`
              ALTER TABLE health_records 
              ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            `);
            console.log('✅ 已添加 updated_at 字段');
          }
        }
        
        console.log('🎉 表结构检查完成！');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ 检查字段失败:', error.message);
    }
    
    // 3. 添加缺失的字段
    console.log('📝 添加缺失的字段...');
    
    // 添加 status 字段
    await query(`
      ALTER TABLE health_records 
      ADD COLUMN status enum('normal','warning','danger') DEFAULT 'normal' COMMENT '状态'
    `);
    console.log('✅ 已添加 status 字段');
    
    // 检查并添加其他可能缺失的字段
    const updatedColumns = await query('DESCRIBE health_records');
    
    // 检查 created_at 字段
    const hasCreatedAt = updatedColumns.some(col => col.Field === 'created_at');
    if (!hasCreatedAt) {
      await query(`
        ALTER TABLE health_records 
        ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
      `);
      console.log('✅ 已添加 created_at 字段');
    }
    
    // 检查 updated_at 字段
    const hasUpdatedAt = updatedColumns.some(col => col.Field === 'updated_at');
    if (!hasUpdatedAt) {
      await query(`
        ALTER TABLE health_records 
        ADD COLUMN updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      `);
      console.log('✅ 已添加 updated_at 字段');
    }
    
    // 检查 value 字段类型
    const valueColumn = updatedColumns.find(col => col.Field === 'value');
    if (valueColumn && valueColumn.Type.includes('json')) {
      console.log('📝 将 value 字段从 json 改为 varchar...');
      await query(`
        ALTER TABLE health_records 
        MODIFY COLUMN value varchar(100) NOT NULL COMMENT '记录值'
      `);
      console.log('✅ 已更新 value 字段类型');
    }
    
    // 4. 添加索引
    try {
      await query(`
        ALTER TABLE health_records 
        ADD INDEX idx_status (status)
      `);
      console.log('✅ 已添加 status 字段索引');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        console.warn('⚠️ 添加索引失败:', error.message);
      }
    }
    
    // 5. 显示最终表结构
    console.log('\n📋 最终表结构:');
    const finalColumns = await query('DESCRIBE health_records');
    console.table(finalColumns);
    
    console.log('\n🎉 health_records 表结构更新完成！');
    console.log('现在可以正常使用健康相关API了。');
    
  } catch (error) {
    console.error('❌ 更新表结构失败:', error);
    console.error('错误详情:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateHealthRecordsTable();
}

module.exports = {
  updateHealthRecordsTable
};