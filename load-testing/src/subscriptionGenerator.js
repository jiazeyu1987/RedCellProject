const faker = require('faker');

// 设置中文语言
faker.locale = 'zh_CN';

/**
 * 套餐级别分布概率
 * 基于真实用户行为模式设计
 */
const PLAN_DISTRIBUTION = {
  1: 0.15,  // 15% - 贴心关怀型
  2: 0.20,  // 20% - 基础保障型  
  3: 0.25,  // 25% - 健康守护型 (最受欢迎)
  4: 0.15,  // 15% - 专业护理型
  5: 0.10,  // 10% - 贴心陪护型
  6: 0.08,  // 8%  - 高级护理型
  7: 0.04,  // 4%  - 专家指导型
  8: 0.02,  // 2%  - 专属护理型
  9: 0.007, // 0.7% - 全程陪护型
  10: 0.003 // 0.3% - 尊享专家型
};

/**
 * 订阅状态分布概率
 */
const STATUS_DISTRIBUTION = {
  'active': 0.70,    // 70% 活跃订阅
  'expired': 0.20,   // 20% 过期订阅
  'cancelled': 0.10  // 10% 取消订阅
};

/**
 * 基于概率分布选择套餐级别
 */
function selectPlanLevel() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [level, probability] of Object.entries(PLAN_DISTRIBUTION)) {
    cumulative += probability;
    if (random <= cumulative) {
      return parseInt(level);
    }
  }
  
  return 3; // 默认返回最受欢迎的级别
}

/**
 * 基于概率分布选择订阅状态
 */
function selectSubscriptionStatus() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [status, probability] of Object.entries(STATUS_DISTRIBUTION)) {
    cumulative += probability;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'active'; // 默认返回活跃状态
}

/**
 * 根据套餐级别获取套餐信息
 */
function getPlanInfo(level) {
  const plans = {
    1: { id: 'plan_level_1', name: '贴心关怀型', basePrice: 98.00, monthlyVisits: 1 },
    2: { id: 'plan_level_2', name: '基础保障型', basePrice: 168.00, monthlyVisits: 2 },
    3: { id: 'plan_level_3', name: '健康守护型', basePrice: 298.00, monthlyVisits: 4 },
    4: { id: 'plan_level_4', name: '专业护理型', basePrice: 498.00, monthlyVisits: 6 },
    5: { id: 'plan_level_5', name: '贴心陪护型', basePrice: 798.00, monthlyVisits: 8 },
    6: { id: 'plan_level_6', name: '高级护理型', basePrice: 1280.00, monthlyVisits: 12 },
    7: { id: 'plan_level_7', name: '专家指导型', basePrice: 1880.00, monthlyVisits: 16 },
    8: { id: 'plan_level_8', name: '专属护理型', basePrice: 2280.00, monthlyVisits: 20 },
    9: { id: 'plan_level_9', name: '全程陪护型', basePrice: 2680.00, monthlyVisits: 25 },
    10: { id: 'plan_level_10', name: '尊享专家型', basePrice: 2980.00, monthlyVisits: 30 }
  };
  
  return plans[level] || plans[3];
}

/**
 * 生成订阅时间范围
 */
function generateSubscriptionDates(status) {
  const now = new Date();
  let startDate, endDate;
  
  switch (status) {
    case 'active':
      // 活跃订阅：开始时间在过去1-90天内，结束时间在未来30-365天内
      startDate = faker.date.between(
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      );
      endDate = faker.date.between(
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      );
      break;
      
    case 'expired':
      // 过期订阅：开始时间在过去365天内，结束时间在过去1-30天内
      startDate = faker.date.between(
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      );
      endDate = faker.date.between(
        new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      );
      break;
      
    case 'cancelled':
      // 取消订阅：开始时间在过去180天内，结束时间在开始后的7-90天内
      startDate = faker.date.between(
        new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      );
      endDate = faker.date.between(
        new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      );
      break;
      
    default:
      startDate = now;
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate };
}

/**
 * 计算剩余配额
 */
function calculateRemainingQuota(status, monthlyVisits, startDate, endDate) {
  const now = new Date();
  
  if (status === 'cancelled' || status === 'expired') {
    return 0;
  }
  
  // 活跃订阅，计算剩余配额
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const usedDays = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const totalQuota = Math.ceil((totalDays / 30) * monthlyVisits);
  
  // 模拟已使用的服务次数（随机消耗0-70%的配额）
  const usageRate = faker.datatype.number({ min: 0, max: 70 }) / 100;
  const usedQuota = Math.floor(totalQuota * usageRate);
  
  return Math.max(0, totalQuota - usedQuota);
}

/**
 * 生成购买价格（包含折扣和优惠）
 */
function generatePurchasePrice(basePrice) {
  // 90-110%的价格波动（包含促销、折扣等因素）
  const variation = faker.datatype.number({ min: -10, max: 10 }) / 100;
  const finalPrice = basePrice * (1 + variation);
  
  // 保留两位小数
  return Math.round(finalPrice * 100) / 100;
}

/**
 * 生成单个用户的订阅信息
 */
function generateUserSubscription(userId) {
  const level = selectPlanLevel();
  const status = selectSubscriptionStatus();
  const planInfo = getPlanInfo(level);
  const { startDate, endDate } = generateSubscriptionDates(status);
  const remainingQuota = calculateRemainingQuota(status, planInfo.monthlyVisits, startDate, endDate);
  const purchasePrice = generatePurchasePrice(planInfo.basePrice);
  
  return {
    id: `sub_${faker.datatype.uuid().replace(/-/g, '')}`,
    user_id: userId,
    plan_id: planInfo.id,
    status: status,
    start_date: startDate,
    end_date: endDate,
    remaining_quota: remainingQuota,
    purchase_price: purchasePrice,
    create_time: startDate,
    update_time: new Date(),
    
    // 扩展信息（用于显示和分析）
    _planInfo: {
      level: level,
      name: planInfo.name,
      basePrice: planInfo.basePrice,
      monthlyVisits: planInfo.monthlyVisits
    }
  };
}

/**
 * 为用户生成多个订阅记录（模拟续费历史）
 */
function generateUserSubscriptionHistory(userId, options = {}) {
  const { maxSubscriptions = 3, includeHistory = true } = options;
  
  const subscriptions = [];
  const subscriptionCount = includeHistory ? 
    faker.datatype.number({ min: 1, max: maxSubscriptions }) : 1;
  
  for (let i = 0; i < subscriptionCount; i++) {
    const subscription = generateUserSubscription(userId);
    
    // 如果是历史记录，调整时间
    if (i > 0 && includeHistory) {
      const prevSubscription = subscriptions[i - 1];
      subscription.start_date = new Date(prevSubscription.end_date.getTime() + 24 * 60 * 60 * 1000);
      
      if (i < subscriptionCount - 1) {
        // 历史订阅，设置为已过期
        subscription.status = 'expired';
        subscription.end_date = faker.date.between(
          subscription.start_date,
          new Date(subscription.start_date.getTime() + 90 * 24 * 60 * 60 * 1000)
        );
        subscription.remaining_quota = 0;
      }
    }
    
    subscriptions.push(subscription);
  }
  
  return subscriptions;
}

/**
 * 插入订阅记录到数据库
 */
async function insertSubscriptionToDatabase(subscriptionData, connection) {
  const sql = `
    INSERT INTO user_subscriptions (
      id, user_id, plan_id, status, start_date, end_date,
      remaining_quota, purchase_price, create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    subscriptionData.id,
    subscriptionData.user_id,
    subscriptionData.plan_id,
    subscriptionData.status,
    subscriptionData.start_date,
    subscriptionData.end_date,
    subscriptionData.remaining_quota,
    subscriptionData.purchase_price,
    subscriptionData.create_time,
    subscriptionData.update_time
  ];
  
  const [result] = await connection.execute(sql, values);
  return result;
}

/**
 * 订阅生成器类
 */
class SubscriptionGenerator {
  constructor(connection = null) {
    this.connection = connection;
  }
  
  /**
   * 为单个用户生成订阅信息
   */
  async generateForUser(userId, options = {}) {
    const { enableDatabase = true, includeHistory = true } = options;
    
    try {
      const subscriptions = generateUserSubscriptionHistory(userId, { includeHistory });
      const results = [];
      
      for (const subscription of subscriptions) {
        if (enableDatabase && this.connection) {
          try {
            await insertSubscriptionToDatabase(subscription, this.connection);
            console.log(`  📦 订阅记录创建成功: ${subscription._planInfo.name} (${subscription.status})`);
            results.push({ success: true, subscription });
          } catch (error) {
            console.log(`  ❌ 订阅记录创建失败: ${error.message}`);
            results.push({ success: false, error: error.message, subscription });
          }
        } else {
          console.log(`  📦 订阅记录生成成功: ${subscription._planInfo.name} (${subscription.status})`);
          results.push({ success: true, subscription });
        }
      }
      
      return results;
      
    } catch (error) {
      console.log(`  ❌ 用户订阅信息生成失败: ${error.message}`);
      return [{ success: false, error: error.message }];
    }
  }
  
  /**
   * 批量为用户生成订阅信息
   */
  async batchGenerateForUsers(userIds, options = {}) {
    const { progressCallback } = options;
    
    console.log(`📦 开始为 ${userIds.length} 个用户生成订阅信息...`);
    
    const results = {
      total: userIds.length,
      success: 0,
      failed: 0,
      subscriptions: []
    };
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      try {
        const userResults = await this.generateForUser(userId, options);
        
        for (const result of userResults) {
          if (result.success) {
            results.success++;
            results.subscriptions.push(result.subscription);
          } else {
            results.failed++;
          }
        }
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: userIds.length,
            success: results.success,
            failed: results.failed
          });
        }
        
      } catch (error) {
        results.failed++;
        console.log(`❌ 用户 ${userId} 订阅生成异常: ${error.message}`);
      }
    }
    
    console.log(`🎉 订阅信息生成完成! 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }
  
  /**
   * 获取订阅统计信息
   */
  getSubscriptionStats(subscriptions) {
    const stats = {
      total: subscriptions.length,
      byStatus: {},
      byLevel: {},
      totalRevenue: 0,
      averagePrice: 0
    };
    
    subscriptions.forEach(sub => {
      // 按状态统计
      stats.byStatus[sub.status] = (stats.byStatus[sub.status] || 0) + 1;
      
      // 按级别统计
      const level = sub._planInfo?.level || 'unknown';
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
      
      // 收入统计
      stats.totalRevenue += sub.purchase_price;
    });
    
    stats.averagePrice = stats.total > 0 ? stats.totalRevenue / stats.total : 0;
    
    return stats;
  }
}

module.exports = {
  SubscriptionGenerator,
  generateUserSubscription,
  generateUserSubscriptionHistory,
  insertSubscriptionToDatabase,
  selectPlanLevel,
  selectSubscriptionStatus,
  getPlanInfo,
  PLAN_DISTRIBUTION,
  STATUS_DISTRIBUTION
};

// 命令行接口
if (require.main === module) {
  const mysql = require('mysql2/promise');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'abcd1234!',
    database: process.env.DB_DATABASE || 'health_guard_db'
  };
  
  async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'test';
    
    let connection;
    
    try {
      connection = await mysql.createConnection(config);
      const generator = new SubscriptionGenerator(connection);
      
      switch (command) {
        case 'test':
          console.log('🧪 测试订阅信息生成...');
          const testUserId = 'wx_test_user_123';
          const testSubscriptions = generateUserSubscriptionHistory(testUserId);
          console.log('生成的订阅数据:', JSON.stringify(testSubscriptions, null, 2));
          break;
          
        case 'generate':
          const userId = args[1];
          if (!userId) {
            console.log('❌ 请提供用户ID');
            break;
          }
          await generator.generateForUser(userId, { enableDatabase: true });
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node subscriptionGenerator.js test');
          console.log('  node subscriptionGenerator.js generate <用户ID>');
      }
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
  
  main();
}