const { query, testConnection, transaction } = require('./config/database');

/**
 * 用户订阅表字段修复脚本
 * 用于添加缺失的monthly_price字段并进行数据填充
 */
class UserSubscriptionTableFix {
  
  /**
   * 检查字段是否存在
   */
  static async checkFieldExists(fieldName) {
    try {
      const result = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'health_guard_db' 
        AND TABLE_NAME = 'user_subscriptions' 
        AND COLUMN_NAME = ?
      `, [fieldName]);
      
      return result.length > 0;
    } catch (error) {
      console.error(`检查字段 ${fieldName} 时出错:`, error);
      return false;
    }
  }
  
  /**
   * 添加monthly_price字段
   */
  static async addMonthlyPriceField() {
    try {
      console.log('📝 添加monthly_price字段到user_subscriptions表...');
      
      const fieldExists = await this.checkFieldExists('monthly_price');
      if (fieldExists) {
        console.log('ℹ️  monthly_price字段已存在，跳过添加');
        return true;
      }
      
      // 添加字段
      await query(`
        ALTER TABLE user_subscriptions 
        ADD COLUMN monthly_price DECIMAL(10,2) DEFAULT 0.00 
        COMMENT '月费价格'
      `);
      
      console.log('✅ monthly_price字段添加成功');
      return true;
      
    } catch (error) {
      console.error('❌ 添加monthly_price字段失败:', error);
      return false;
    }
  }
  
  /**
   * 填充monthly_price数据
   */
  static async populateMonthlyPriceData() {
    try {
      console.log('📊 开始填充monthly_price数据...');
      
      // 检查是否有需要更新的记录
      const recordsToUpdate = await query(`
        SELECT us.id, us.package_id, sp.price
        FROM user_subscriptions us
        JOIN subscription_packages sp ON us.package_id = sp.id
        WHERE us.monthly_price = 0.00 OR us.monthly_price IS NULL
      `);
      
      if (recordsToUpdate.length === 0) {
        console.log('ℹ️  没有需要更新的记录');
        return true;
      }
      
      console.log(`📝 找到 ${recordsToUpdate.length} 条需要更新的记录`);
      
      // 批量更新数据
      await query(`
        UPDATE user_subscriptions us
        JOIN subscription_packages sp ON us.package_id = sp.id
        SET us.monthly_price = sp.price
        WHERE us.monthly_price = 0.00 OR us.monthly_price IS NULL
      `);
      
      console.log('✅ monthly_price数据填充完成');
      return true;
      
    } catch (error) {
      console.error('❌ 填充monthly_price数据失败:', error);
      return false;
    }
  }
  
  /**
   * 验证修复结果
   */
  static async validateFix() {
    try {
      console.log('🔍 验证修复结果...');
      
      // 检查字段是否存在
      const fieldExists = await this.checkFieldExists('monthly_price');
      if (!fieldExists) {
        console.log('❌ monthly_price字段不存在');
        return false;
      }
      
      // 检查数据完整性
      const stats = await query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN monthly_price > 0 THEN 1 END) as records_with_price,
          COUNT(CASE WHEN monthly_price = 0 OR monthly_price IS NULL THEN 1 END) as records_without_price
        FROM user_subscriptions
      `);
      
      const { total_records, records_with_price, records_without_price } = stats[0];
      
      console.log('📊 修复结果统计:');
      console.log(`总记录数: ${total_records}`);
      console.log(`有价格记录: ${records_with_price}`);
      console.log(`无价格记录: ${records_without_price}`);
      
      // 测试查询是否正常
      const testQuery = `
        SELECT 
          us.id,
          us.monthly_price,
          sp.price as package_price
        FROM user_subscriptions us
        LEFT JOIN subscription_packages sp ON us.package_id = sp.id
        LIMIT 1
      `;
      
      const testResult = await query(testQuery);
      console.log('✅ 测试查询成功，字段可正常访问');
      
      if (testResult.length > 0) {
        console.log('📝 示例数据:', {
          subscription_id: testResult[0].id,
          monthly_price: testResult[0].monthly_price,
          package_price: testResult[0].package_price
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ 验证修复结果失败:', error);
      return false;
    }
  }
  
  /**
   * 执行完整修复流程
   */
  static async executeFullFix() {
    console.log('🚀 开始用户订阅表修复流程...\n');
    
    try {
      // 1. 测试数据库连接
      console.log('1. 测试数据库连接...');
      const connectionOk = await testConnection();
      if (!connectionOk) {
        throw new Error('数据库连接失败');
      }
      console.log('✅ 数据库连接正常\n');
      
      // 2. 添加字段
      console.log('2. 添加monthly_price字段...');
      const addFieldSuccess = await this.addMonthlyPriceField();
      if (!addFieldSuccess) {
        throw new Error('添加字段失败');
      }
      console.log('✅ 字段添加完成\n');
      
      // 3. 填充数据
      console.log('3. 填充monthly_price数据...');
      const populateSuccess = await this.populateMonthlyPriceData();
      if (!populateSuccess) {
        throw new Error('数据填充失败');
      }
      console.log('✅ 数据填充完成\n');
      
      // 4. 验证结果
      console.log('4. 验证修复结果...');
      const validateSuccess = await this.validateFix();
      if (!validateSuccess) {
        throw new Error('验证失败');
      }
      console.log('✅ 验证通过\n');
      
      console.log('🎉 用户订阅表修复完成！');
      console.log('\n📝 修复总结:');
      console.log('- ✅ 添加了monthly_price字段');
      console.log('- ✅ 填充了现有数据');
      console.log('- ✅ 验证了修复结果');
      console.log('- ✅ 增强用户列表API现在应该正常工作');
      
      return true;
      
    } catch (error) {
      console.error('❌ 修复流程失败:', error.message);
      return false;
    }
  }
  
  /**
   * 回滚修复（移除字段）
   */
  static async rollbackFix() {
    console.log('⚠️  开始回滚修复...');
    
    try {
      const fieldExists = await this.checkFieldExists('monthly_price');
      if (!fieldExists) {
        console.log('ℹ️  monthly_price字段不存在，无需回滚');
        return true;
      }
      
      console.log('📝 移除monthly_price字段...');
      await query('ALTER TABLE user_subscriptions DROP COLUMN monthly_price');
      
      console.log('✅ 回滚完成');
      return true;
      
    } catch (error) {
      console.error('❌ 回滚失败:', error);
      return false;
    }
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'fix';
  
  switch (command) {
    case 'fix':
      await UserSubscriptionTableFix.executeFullFix();
      break;
    case 'validate':
      await UserSubscriptionTableFix.validateFix();
      break;
    case 'rollback':
      await UserSubscriptionTableFix.rollbackFix();
      break;
    default:
      console.log('用法: node fix-user-subscriptions-table.js [fix|validate|rollback]');
      console.log('  fix - 执行完整修复流程（默认）');
      console.log('  validate - 仅验证修复结果');
      console.log('  rollback - 回滚修复');
  }
  
  process.exit(0);
}

// 导出模块
module.exports = UserSubscriptionTableFix;

// 直接执行
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}