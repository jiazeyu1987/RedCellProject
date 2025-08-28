const { EnhancedUserGenerator } = require('./enhancedUserGenerator');
const { SubscriptionGenerator } = require('./subscriptionGenerator');
const { PaymentGenerator } = require('./paymentGenerator');
const { AddressGenerator } = require('./addressGenerator');
const { HealthDataGenerator } = require('./healthDataGenerator');
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
 * 集成增强型用户生成器
 */
class IntegratedUserGenerator {
  constructor() {
    this.connection = null;
    this.userGenerator = null;
    this.subscriptionGenerator = null;
    this.paymentGenerator = null;
    this.addressGenerator = null;
    this.healthDataGenerator = null;
  }
  
  /**
   * 初始化所有生成器
   */
  async initialize() {
    try {
      // 建立数据库连接
      this.connection = await mysql.createConnection(config);
      console.log('✅ 数据库连接成功');
      
      // 初始化各个生成器
      this.userGenerator = new EnhancedUserGenerator();
      await this.userGenerator.initialize();
      
      this.subscriptionGenerator = new SubscriptionGenerator(this.connection);
      this.paymentGenerator = new PaymentGenerator(this.connection);
      this.addressGenerator = new AddressGenerator(this.connection);
      this.healthDataGenerator = new HealthDataGenerator(this.connection);
      
      console.log('✅ 所有生成器初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      return false;
    }
  }
  
  /**
   * 清理资源
   */
  async cleanup() {
    if (this.userGenerator) {
      await this.userGenerator.cleanup();
    }
    if (this.connection) {
      await this.connection.end();
    }
  }
  
  /**
   * 生成单个完整用户数据
   */
  async generateCompleteUser(options = {}) {
    const {
      includeSubscriptions = true,
      includePayments = true,
      includeAddresses = true,
      includeHealthData = true
    } = options;
    
    try {
      // 1. 生成用户基础信息
      console.log('👤 生成用户基础信息...');
      const userResult = await this.userGenerator.generateSingleUser();
      
      if (!userResult.success) {
        throw new Error(`用户生成失败: ${userResult.error}`);
      }
      
      const userData = userResult.userData;
      const userId = userData.open_id;
      
      console.log(`✅ 用户创建成功: ${userData.nickname}(${userData.real_name})`);
      
      // 2. 生成订阅信息
      let subscriptionData = [];
      if (includeSubscriptions) {
        console.log('📦 生成订阅信息...');
        const subscriptionResults = await this.subscriptionGenerator.generateForUser(userId, {
          enableDatabase: true,
          includeHistory: true
        });
        
        subscriptionData = subscriptionResults
          .filter(r => r.success)
          .map(r => r.subscription);
      }
      
      // 3. 生成支付记录
      if (includePayments) {
        console.log('💳 生成支付记录...');
        await this.paymentGenerator.generateForUser(userId, {
          enableDatabase: true,
          subscriptionData: subscriptionData
        });
      }
      
      // 4. 生成地址信息
      if (includeAddresses) {
        console.log('🏠 生成地址信息...');
        await this.addressGenerator.generateForUser(userId, {
          realName: userData.real_name,
          phone: userData.phone,
          gender: userData.gender
        }, {
          enableDatabase: true,
          minAddresses: 1,
          maxAddresses: 3
        });
      }
      
      // 5. 生成健康数据
      if (includeHealthData) {
        console.log('💊 生成健康数据...');
        await this.healthDataGenerator.generateForUser(userId, userData.health_condition, {
          enableDatabase: true,
          daysBack: 90,
          maxRecordsPerDay: 3
        });
      }
      
      console.log(`🎉 完整用户 ${userData.nickname} 生成完成！\n`);
      
      return {
        success: true,
        userData: userData,
        userId: userId
      };
      
    } catch (error) {
      console.error(`❌ 完整用户生成失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 批量生成完整用户数据
   */
  async batchGenerateCompleteUsers(count, options = {}) {
    const {
      batchSize = 5,
      progressCallback = null,
      ...generationOptions
    } = options;
    
    console.log(`🚀 开始批量生成 ${count} 个完整用户数据...`);
    console.log('📊 包含: 基础信息 + 订阅记录 + 支付记录 + 地址信息 + 健康数据\n');
    
    const results = {
      total: count,
      success: 0,
      failed: 0,
      errors: [],
      users: []
    };
    
    for (let i = 0; i < count; i++) {
      try {
        console.log(`\n[${i + 1}/${count}] 生成第 ${i + 1} 个用户:`);
        console.log('='.repeat(50));
        
        const result = await this.generateCompleteUser(generationOptions);
        
        if (result.success) {
          results.success++;
          results.users.push(result.userData);
        } else {
          results.failed++;
          results.errors.push(result.error);
        }
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: count,
            success: results.success,
            failed: results.failed
          });
        }
        
        // 批次间延时，避免数据库压力过大
        if ((i + 1) % batchSize === 0 && i + 1 < count) {
          console.log('\n⏸️ 批次间暂停 2 秒...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
        console.error(`❌ 第 ${i + 1} 个用户生成异常: ${error.message}`);
      }
    }
    
    // 输出最终统计
    console.log('\n' + '='.repeat(60));
    console.log('🎉 批量生成完成！');
    console.log(`✅ 成功: ${results.success} 个用户`);
    console.log(`❌ 失败: ${results.failed} 个用户`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    return results;
  }
  
  /**
   * 生成数据统计报告
   */
  async generateReport() {
    try {
      console.log('\n📊 正在生成数据统计报告...\n');
      
      // 用户统计
      const [userStats] = await this.connection.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN open_id LIKE 'wx_test_%' THEN 1 END) as test_users,
          COUNT(CASE WHEN member_level = 'vip' THEN 1 END) as vip_users,
          COUNT(CASE WHEN health_condition != 'healthy' THEN 1 END) as users_with_conditions
        FROM users
      `);
      
      // 订阅统计
      const [subscriptionStats] = await this.connection.execute(`
        SELECT 
          COUNT(*) as total_subscriptions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
          AVG(purchase_price) as avg_price
        FROM user_subscriptions
      `);
      
      // 支付统计
      const [paymentStats] = await this.connection.execute(`
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success_payments,
          SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) as total_revenue
        FROM payment_records
      `);
      
      // 地址统计
      const [addressStats] = await this.connection.execute(`
        SELECT 
          COUNT(*) as total_addresses,
          COUNT(CASE WHEN is_default = 1 THEN 1 END) as default_addresses
        FROM user_addresses
      `);
      
      // 健康记录统计
      const [healthStats] = await this.connection.execute(`
        SELECT 
          COUNT(*) as total_health_records,
          COUNT(DISTINCT user_id) as users_with_health_data,
          COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_records,
          COUNT(CASE WHEN status = 'danger' THEN 1 END) as danger_records
        FROM health_records
      `);
      
      // 输出报告
      console.log('Health Guard Test Data Report');
      console.log('='.repeat(60));
      
      console.log('\n👥 用户统计:');
      console.log(`   总用户数: ${userStats[0].total_users}`);
      console.log(`   测试用户: ${userStats[0].test_users}`);
      console.log(`   VIP用户: ${userStats[0].vip_users}`);
      console.log(`   有健康问题用户: ${userStats[0].users_with_conditions}`);
      
      console.log('\n📦 订阅统计:');
      console.log(`   总订阅数: ${subscriptionStats[0].total_subscriptions}`);
      console.log(`   活跃订阅: ${subscriptionStats[0].active_subscriptions}`);
      console.log(`   平均价格: ¥${parseFloat(subscriptionStats[0].avg_price || 0).toFixed(2)}`);
      
      console.log('\n💳 支付统计:');
      console.log(`   总支付记录: ${paymentStats[0].total_payments}`);
      console.log(`   成功支付: ${paymentStats[0].success_payments}`);
      console.log(`   总收入: ¥${parseFloat(paymentStats[0].total_revenue || 0).toFixed(2)}`);
      
      console.log('\n🏠 地址统计:');
      console.log(`   总地址数: ${addressStats[0].total_addresses}`);
      console.log(`   默认地址: ${addressStats[0].default_addresses}`);
      
      console.log('\n💊 健康数据统计:');
      console.log(`   总健康记录: ${healthStats[0].total_health_records}`);
      console.log(`   有健康数据用户: ${healthStats[0].users_with_health_data}`);
      console.log(`   预警记录: ${healthStats[0].warning_records}`);
      console.log(`   危险记录: ${healthStats[0].danger_records}`);
      
      console.log('\n' + '='.repeat(60));
      
    } catch (error) {
      console.error('❌ 生成报告失败:', error.message);
    }
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  async function main() {
    const generator = new IntegratedUserGenerator();
    
    try {
      await generator.initialize();
      
      switch (command) {
        case 'generate':
          const count = parseInt(args[1]) || 10;
          await generator.batchGenerateCompleteUsers(count, {
            progressCallback: (progress) => {
              if (progress.current % 5 === 0 || progress.current === progress.total) {
                console.log(`\n📈 总体进度: ${progress.current}/${progress.total} (成功: ${progress.success}, 失败: ${progress.failed})`);
              }
            }
          });
          break;
          
        case 'single':
          await generator.generateCompleteUser();
          break;
          
        case 'report':
          await generator.generateReport();
          break;
          
        case 'basic-only':
          const basicCount = parseInt(args[1]) || 10;
          await generator.batchGenerateCompleteUsers(basicCount, {
            includeSubscriptions: false,
            includePayments: false,
            includeAddresses: false,
            includeHealthData: false
          });
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node integratedUserGenerator.js generate [数量]     # 生成完整用户数据');
          console.log('  node integratedUserGenerator.js single              # 生成单个完整用户');
          console.log('  node integratedUserGenerator.js report              # 生成数据统计报告');
          console.log('  node integratedUserGenerator.js basic-only [数量]   # 仅生成基础用户信息');
      }
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    } finally {
      await generator.cleanup();
    }
  }
  
  main();
}

module.exports = IntegratedUserGenerator;