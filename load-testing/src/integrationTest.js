const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

/**
 * 集成测试类
 */
class IntegrationTest {
  constructor() {
    this.connection = null;
  }
  
  /**
   * 初始化测试环境
   */
  async initialize() {
    try {
      this.connection = await mysql.createConnection(config);
      console.log('✅ 数据库连接成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      return false;
    }
  }
  
  /**
   * 清理测试环境
   */
  async cleanup() {
    if (this.connection) {
      await this.connection.end();
    }
  }
  
  /**
   * 测试数据库表结构
   */
  async testDatabaseStructure() {
    console.log('\n📋 测试数据库表结构...');
    
    const requiredTables = [
      'users',
      'user_subscriptions', 
      'payment_records',
      'user_addresses',
      'health_records',
      'subscription_plans'
    ];
    
    const results = {};
    
    for (const table of requiredTables) {
      try {
        const [tables] = await this.connection.execute(`SHOW TABLES LIKE '${table}'`);
        const exists = tables.length > 0;
        results[table] = exists;
        
        if (exists) {
          console.log(`  ✅ ${table} - 存在`);
        } else {
          console.log(`  ❌ ${table} - 不存在`);
        }
      } catch (error) {
        results[table] = false;
        console.log(`  ❌ ${table} - 检查失败: ${error.message}`);
      }
    }
    
    const allTablesExist = Object.values(results).every(exists => exists);
    
    if (allTablesExist) {
      console.log('✅ 所有必需的表都存在');
    } else {
      console.log('❌ 缺少必需的表，请运行数据库初始化脚本');
    }
    
    return allTablesExist;
  }
  
  /**
   * 测试单个用户生成器
   */
  async testUserGenerator() {
    console.log('\n👤 测试用户生成器...');
    
    try {
      const { EnhancedUserGenerator } = require('./enhancedUserGenerator');
      const generator = new EnhancedUserGenerator();
      await generator.initialize();
      
      const result = await generator.generateSingleUser();
      
      if (result.success) {
        console.log(`  ✅ 用户生成成功: ${result.userData.nickname}`);
        
        // 验证用户是否插入到数据库
        const [users] = await this.connection.execute(
          'SELECT id FROM users WHERE open_id = ?', 
          [result.userData.open_id]
        );
        
        if (users.length > 0) {
          console.log('  ✅ 用户已成功插入数据库');
          return { success: true, userId: result.userData.open_id };
        } else {
          console.log('  ❌ 用户未插入到数据库');
          return { success: false };
        }
      } else {
        console.log(`  ❌ 用户生成失败: ${result.error}`);
        return { success: false };
      }
      
    } catch (error) {
      console.log(`  ❌ 用户生成器测试失败: ${error.message}`);
      return { success: false };
    }
  }
  
  /**
   * 测试订阅生成器
   */
  async testSubscriptionGenerator(userId) {
    console.log('\n📦 测试订阅生成器...');
    
    try {
      const { SubscriptionGenerator } = require('./subscriptionGenerator');
      const generator = new SubscriptionGenerator(this.connection);
      
      const results = await generator.generateForUser(userId, { enableDatabase: true });
      
      if (results.some(r => r.success)) {
        console.log('  ✅ 订阅生成成功');
        return true;
      } else {
        console.log('  ❌ 订阅生成失败');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ 订阅生成器测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 测试支付生成器
   */
  async testPaymentGenerator(userId) {
    console.log('\n💳 测试支付生成器...');
    
    try {
      const { PaymentGenerator } = require('./paymentGenerator');
      const generator = new PaymentGenerator(this.connection);
      
      const results = await generator.generateForUser(userId, { enableDatabase: true });
      
      if (results.some(r => r.success)) {
        console.log('  ✅ 支付记录生成成功');
        return true;
      } else {
        console.log('  ❌ 支付记录生成失败');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ 支付生成器测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 测试地址生成器
   */
  async testAddressGenerator(userId) {
    console.log('\n🏠 测试地址生成器...');
    
    try {
      const { AddressGenerator } = require('./addressGenerator');
      const generator = new AddressGenerator(this.connection);
      
      const results = await generator.generateForUser(userId, {}, { enableDatabase: true });
      
      if (results.some(r => r.success)) {
        console.log('  ✅ 地址信息生成成功');
        return true;
      } else {
        console.log('  ❌ 地址信息生成失败');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ 地址生成器测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 测试健康数据生成器
   */
  async testHealthDataGenerator(userId) {
    console.log('\n💊 测试健康数据生成器...');
    
    try {
      const { HealthDataGenerator } = require('./healthDataGenerator');
      const generator = new HealthDataGenerator(this.connection);
      
      const results = await generator.generateForUser(userId, 'healthy', { 
        enableDatabase: true,
        daysBack: 7,
        maxRecordsPerDay: 2
      });
      
      if (results.some(r => r.success)) {
        console.log('  ✅ 健康数据生成成功');
        return true;
      } else {
        console.log('  ❌ 健康数据生成失败');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ 健康数据生成器测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 测试用户清理工具
   */
  async testUserCleanup() {
    console.log('\n🗑️ 测试用户清理工具...');
    
    try {
      const UserCleanupTool = require('./userCleanupTool');
      const tool = new UserCleanupTool();
      await tool.initialize();
      
      // 获取测试用户数量
      const users = await tool.getTestUsers();
      console.log(`  📊 找到 ${users.length} 个测试用户`);
      
      if (users.length > 0) {
        // 测试统计功能
        const userIds = users.map(u => u.id);
        const stats = await tool.getUserDataStats(userIds);
        console.log(`  📊 关联数据: 订阅 ${stats.subscriptions || 0}, 支付 ${stats.payments || 0}, 地址 ${stats.addresses || 0}, 健康 ${stats.healthRecords || 0}`);
        console.log('  ✅ 用户清理工具功能正常');
      } else {
        console.log('  ✅ 用户清理工具功能正常（无测试用户）');
      }
      
      await tool.cleanup();
      return true;
      
    } catch (error) {
      console.log(`  ❌ 用户清理工具测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 测试集成用户生成器
   */
  async testIntegratedGenerator() {
    console.log('\n🚀 测试集成用户生成器...');
    
    try {
      const IntegratedUserGenerator = require('./integratedUserGenerator');
      const generator = new IntegratedUserGenerator();
      await generator.initialize();
      
      const result = await generator.generateCompleteUser({
        includeSubscriptions: true,
        includePayments: true,
        includeAddresses: true,
        includeHealthData: true
      });
      
      if (result.success) {
        console.log('  ✅ 集成用户生成成功');
        
        // 验证数据完整性
        const userId = result.userId;
        
        const [subscriptions] = await this.connection.execute(
          'SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ?', [userId]
        );
        
        const [payments] = await this.connection.execute(
          'SELECT COUNT(*) as count FROM payment_records WHERE user_id = ?', [userId]
        );
        
        const [addresses] = await this.connection.execute(
          'SELECT COUNT(*) as count FROM user_addresses WHERE user_id = ?', [userId]
        );
        
        const [health] = await this.connection.execute(
          'SELECT COUNT(*) as count FROM health_records WHERE user_id = ?', [userId]
        );
        
        console.log(`  📊 生成数据统计: 订阅 ${subscriptions[0].count}, 支付 ${payments[0].count}, 地址 ${addresses[0].count}, 健康 ${health[0].count}`);
        
        await generator.cleanup();
        return true;
      } else {
        console.log('  ❌ 集成用户生成失败');
        await generator.cleanup();
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ 集成用户生成器测试失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 运行完整测试套件
   */
  async runFullTest() {
    console.log('🧪 开始运行增强型用户生成器集成测试...');
    console.log('='.repeat(60));
    
    const results = {};
    
    // 1. 测试数据库结构
    results.database = await this.testDatabaseStructure();
    if (!results.database) {
      console.log('\n❌ 数据库结构测试失败，终止测试');
      return results;
    }
    
    // 2. 测试各个生成器
    const userResult = await this.testUserGenerator();
    results.userGenerator = userResult.success;
    
    if (userResult.success) {
      const userId = userResult.userId;
      
      results.subscriptionGenerator = await this.testSubscriptionGenerator(userId);
      results.paymentGenerator = await this.testPaymentGenerator(userId);
      results.addressGenerator = await this.testAddressGenerator(userId);
      results.healthDataGenerator = await this.testHealthDataGenerator(userId);
    }
    
    // 3. 测试清理工具
    results.userCleanup = await this.testUserCleanup();
    
    // 4. 测试集成生成器
    results.integratedGenerator = await this.testIntegratedGenerator();
    
    // 输出测试结果摘要
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果摘要:');
    console.log('='.repeat(60));
    
    const testItems = [
      { name: '数据库结构', key: 'database' },
      { name: '用户生成器', key: 'userGenerator' },
      { name: '订阅生成器', key: 'subscriptionGenerator' },
      { name: '支付生成器', key: 'paymentGenerator' },
      { name: '地址生成器', key: 'addressGenerator' },
      { name: '健康数据生成器', key: 'healthDataGenerator' },
      { name: '用户清理工具', key: 'userCleanup' },
      { name: '集成生成器', key: 'integratedGenerator' }
    ];
    
    let passedCount = 0;
    let totalCount = testItems.length;
    
    testItems.forEach(item => {
      const status = results[item.key] ? '✅ 通过' : '❌ 失败';
      console.log(`${item.name}: ${status}`);
      if (results[item.key]) passedCount++;
    });
    
    console.log('='.repeat(60));
    console.log(`测试完成: ${passedCount}/${totalCount} 通过`);
    
    if (passedCount === totalCount) {
      console.log('🎉 所有测试通过！增强型用户生成器功能正常');
    } else {
      console.log('⚠️ 部分测试失败，请检查相关模块');
    }
    
    return results;
  }
}

// 命令行接口
if (require.main === module) {
  async function main() {
    const test = new IntegrationTest();
    
    try {
      const initialized = await test.initialize();
      if (!initialized) {
        process.exit(1);
      }
      
      await test.runFullTest();
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      process.exit(1);
    } finally {
      await test.cleanup();
    }
  }
  
  main();
}

module.exports = IntegrationTest;