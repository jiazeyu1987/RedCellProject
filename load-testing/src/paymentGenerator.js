const faker = require('faker');

// 设置中文语言
faker.locale = 'zh_CN';

/**
 * 支付方式分布概率（基于中国移动支付市场数据）
 */
const PAYMENT_METHOD_DISTRIBUTION = {
  'wechat': 0.60,     // 60% 微信支付
  'alipay': 0.30,     // 30% 支付宝
  'bank_card': 0.08,  // 8%  银行卡
  'balance': 0.02     // 2%  余额支付
};

/**
 * 支付状态分布概率
 */
const PAYMENT_STATUS_DISTRIBUTION = {
  'success': 0.95,    // 95% 支付成功
  'failed': 0.03,     // 3%  支付失败
  'refunded': 0.015,  // 1.5% 已退款
  'cancelled': 0.005  // 0.5% 已取消
};

/**
 * 支付方式对应的中文名称
 */
const PAYMENT_METHOD_NAMES = {
  'wechat': '微信支付',
  'alipay': '支付宝',
  'bank_card': '银行卡支付',
  'balance': '余额支付'
};

/**
 * 基于概率分布选择支付方式
 */
function selectPaymentMethod() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [method, probability] of Object.entries(PAYMENT_METHOD_DISTRIBUTION)) {
    cumulative += probability;
    if (random <= cumulative) {
      return method;
    }
  }
  
  return 'wechat'; // 默认返回微信支付
}

/**
 * 基于概率分布选择支付状态
 */
function selectPaymentStatus() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [status, probability] of Object.entries(PAYMENT_STATUS_DISTRIBUTION)) {
    cumulative += probability;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'success'; // 默认返回成功状态
}

/**
 * 生成订单号
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = faker.datatype.number({ min: 1000, max: 9999 });
  return `HG${timestamp}${random}`;
}

/**
 * 生成支付金额（基于订阅价格加上可能的额外费用）
 */
function generatePaymentAmount(baseAmount = null) {
  if (baseAmount) {
    // 基于订阅价格，可能包含优惠或额外费用
    const variation = faker.datatype.number({ min: -15, max: 10 }) / 100; // -15%到+10%的变化
    const finalAmount = baseAmount * (1 + variation);
    return Math.max(1, Math.round(finalAmount * 100) / 100); // 最少1元
  } else {
    // 随机金额，模拟其他类型的支付
    const amounts = [98, 168, 298, 498, 798, 1280, 1880, 2280, 2680, 2980];
    const basePrice = faker.random.arrayElement(amounts);
    const variation = faker.datatype.number({ min: -10, max: 5 }) / 100;
    return Math.round(basePrice * (1 + variation) * 100) / 100;
  }
}

/**
 * 生成支付时间
 */
function generatePaymentTime(status, createTime = null) {
  const baseTime = createTime || faker.date.recent(180); // 最近180天内
  
  switch (status) {
    case 'success':
      // 成功支付：创建后5分钟到2小时内完成
      return faker.date.between(
        new Date(baseTime.getTime() + 5 * 60 * 1000),
        new Date(baseTime.getTime() + 2 * 60 * 60 * 1000)
      );
      
    case 'failed':
    case 'cancelled':
      // 失败/取消：创建后1-30分钟内
      return faker.date.between(
        new Date(baseTime.getTime() + 1 * 60 * 1000),
        new Date(baseTime.getTime() + 30 * 60 * 1000)
      );
      
    case 'refunded':
      // 退款：原支付时间后的1-30天内
      const payTime = faker.date.between(
        new Date(baseTime.getTime() + 5 * 60 * 1000),
        new Date(baseTime.getTime() + 2 * 60 * 60 * 1000)
      );
      return faker.date.between(
        new Date(payTime.getTime() + 24 * 60 * 60 * 1000),
        new Date(payTime.getTime() + 30 * 24 * 60 * 60 * 1000)
      );
      
    default:
      return null;
  }
}

/**
 * 生成支付备注信息
 */
function generatePaymentRemark(status, paymentMethod) {
  const remarks = {
    success: {
      wechat: ['微信支付成功', '通过微信完成支付', '微信扫码支付'],
      alipay: ['支付宝支付成功', '通过支付宝完成支付', '支付宝扫码支付'],
      bank_card: ['银行卡支付成功', '通过网银支付', '银行卡快捷支付'],
      balance: ['余额支付成功', '账户余额支付', '余额扣费成功']
    },
    failed: [
      '支付密码错误', '银行卡余额不足', '网络超时', '银行系统维护',
      '支付限额超限', '风控拦截', '用户取消支付'
    ],
    cancelled: [
      '用户主动取消', '支付超时取消', '订单已取消', '用户放弃支付'
    ],
    refunded: [
      '用户申请退款', '服务未提供退款', '系统异常退款', '客服处理退款',
      '7天无理由退款', '服务质量问题退款'
    ]
  };
  
  if (status === 'success' && remarks.success[paymentMethod]) {
    return faker.random.arrayElement(remarks.success[paymentMethod]);
  } else if (remarks[status]) {
    return faker.random.arrayElement(remarks[status]);
  }
  
  return null;
}

/**
 * 生成单个支付记录
 */
function generatePaymentRecord(userId, options = {}) {
  const {
    amount = null,
    relatedOrderInfo = null,
    createTime = null
  } = options;
  
  const status = selectPaymentStatus();
  const paymentMethod = selectPaymentMethod();
  const orderNo = generateOrderNumber();
  const paymentAmount = generatePaymentAmount(amount);
  const baseCreateTime = createTime || faker.date.recent(180);
  const payTime = generatePaymentTime(status, baseCreateTime);
  const remark = generatePaymentRemark(status, paymentMethod);
  
  return {
    id: `pay_${faker.datatype.uuid().replace(/-/g, '')}`,
    user_id: userId,
    order_no: orderNo,
    amount: paymentAmount,
    payment_method: paymentMethod,
    status: status,
    pay_time: payTime,
    create_time: baseCreateTime,
    update_time: new Date(),
    remark: remark,
    
    // 扩展信息（用于显示和分析）
    _displayInfo: {
      paymentMethodName: PAYMENT_METHOD_NAMES[paymentMethod],
      statusText: getStatusText(status),
      relatedOrder: relatedOrderInfo
    }
  };
}

/**
 * 获取状态显示文本
 */
function getStatusText(status) {
  const statusTexts = {
    'success': '支付成功',
    'failed': '支付失败',
    'cancelled': '已取消',
    'refunded': '已退款',
    'pending': '待支付'
  };
  
  return statusTexts[status] || '未知状态';
}

/**
 * 为用户生成支付历史记录
 */
function generateUserPaymentHistory(userId, options = {}) {
  const {
    subscriptionData = null,
    minPayments = 1,
    maxPayments = 8,
    includeRandomPayments = true
  } = options;
  
  const payments = [];
  
  // 1. 基于订阅记录生成支付记录
  if (subscriptionData && subscriptionData.length > 0) {
    subscriptionData.forEach(subscription => {
      const payment = generatePaymentRecord(userId, {
        amount: subscription.purchase_price,
        relatedOrderInfo: {
          type: 'subscription',
          subscriptionId: subscription.id,
          planName: subscription._planInfo?.name || '套餐订阅'
        },
        createTime: subscription.create_time
      });
      payments.push(payment);
    });
  }
  
  // 2. 生成额外的随机支付记录（模拟其他服务购买）
  if (includeRandomPayments) {
    const randomPaymentCount = faker.datatype.number({ 
      min: Math.max(0, minPayments - payments.length),
      max: Math.max(0, maxPayments - payments.length)
    });
    
    for (let i = 0; i < randomPaymentCount; i++) {
      const payment = generatePaymentRecord(userId, {
        relatedOrderInfo: {
          type: 'service',
          serviceName: faker.random.arrayElement([
            '单次上门服务', '健康体检', '紧急医疗', '专家咨询',
            '康复理疗', '药品配送', '医疗器械', '健康评估'
          ])
        }
      });
      payments.push(payment);
    }
  }
  
  // 3. 按时间排序
  payments.sort((a, b) => new Date(a.create_time) - new Date(b.create_time));
  
  return payments;
}

/**
 * 插入支付记录到数据库
 */
async function insertPaymentToDatabase(paymentData, connection) {
  const sql = `
    INSERT INTO payment_records (
      id, user_id, order_no, amount, payment_method, status,
      pay_time, create_time, update_time, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    paymentData.id,
    paymentData.user_id,
    paymentData.order_no,
    paymentData.amount,
    paymentData.payment_method,
    paymentData.status,
    paymentData.pay_time,
    paymentData.create_time,
    paymentData.update_time,
    paymentData.remark
  ];
  
  const [result] = await connection.execute(sql, values);
  return result;
}

/**
 * 支付记录生成器类
 */
class PaymentGenerator {
  constructor(connection = null) {
    this.connection = connection;
  }
  
  /**
   * 为单个用户生成支付记录
   */
  async generateForUser(userId, options = {}) {
    const { enableDatabase = true, subscriptionData = null } = options;
    
    try {
      const payments = generateUserPaymentHistory(userId, { subscriptionData });
      const results = [];
      
      for (const payment of payments) {
        if (enableDatabase && this.connection) {
          try {
            await insertPaymentToDatabase(payment, this.connection);
            console.log(`  💳 支付记录创建成功: ¥${payment.amount} (${payment._displayInfo.statusText})`);
            results.push({ success: true, payment });
          } catch (error) {
            console.log(`  ❌ 支付记录创建失败: ${error.message}`);
            results.push({ success: false, error: error.message, payment });
          }
        } else {
          console.log(`  💳 支付记录生成成功: ¥${payment.amount} (${payment._displayInfo.statusText})`);
          results.push({ success: true, payment });
        }
      }
      
      return results;
      
    } catch (error) {
      console.log(`  ❌ 用户支付记录生成失败: ${error.message}`);
      return [{ success: false, error: error.message }];
    }
  }
  
  /**
   * 批量为用户生成支付记录
   */
  async batchGenerateForUsers(userData, options = {}) {
    const { progressCallback } = options;
    
    console.log(`💳 开始为 ${userData.length} 个用户生成支付记录...`);
    
    const results = {
      total: userData.length,
      success: 0,
      failed: 0,
      payments: []
    };
    
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      const userId = user.userId || user.open_id || user.id;
      const subscriptionData = user.subscriptions || null;
      
      try {
        const userResults = await this.generateForUser(userId, { 
          ...options, 
          subscriptionData 
        });
        
        for (const result of userResults) {
          if (result.success) {
            results.success++;
            results.payments.push(result.payment);
          } else {
            results.failed++;
          }
        }
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: userData.length,
            success: results.success,
            failed: results.failed
          });
        }
        
      } catch (error) {
        results.failed++;
        console.log(`❌ 用户 ${userId} 支付记录生成异常: ${error.message}`);
      }
    }
    
    console.log(`🎉 支付记录生成完成! 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }
  
  /**
   * 获取支付统计信息
   */
  getPaymentStats(payments) {
    const stats = {
      total: payments.length,
      byStatus: {},
      byMethod: {},
      totalAmount: 0,
      averageAmount: 0,
      successRate: 0
    };
    
    let successCount = 0;
    
    payments.forEach(payment => {
      // 按状态统计
      stats.byStatus[payment.status] = (stats.byStatus[payment.status] || 0) + 1;
      
      // 按支付方式统计
      stats.byMethod[payment.payment_method] = (stats.byMethod[payment.payment_method] || 0) + 1;
      
      // 金额统计
      stats.totalAmount += payment.amount;
      
      // 成功率计算
      if (payment.status === 'success') {
        successCount++;
      }
    });
    
    stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;
    stats.successRate = stats.total > 0 ? successCount / stats.total : 0;
    
    return stats;
  }
}

module.exports = {
  PaymentGenerator,
  generatePaymentRecord,
  generateUserPaymentHistory,
  insertPaymentToDatabase,
  selectPaymentMethod,
  selectPaymentStatus,
  generateOrderNumber,
  PAYMENT_METHOD_DISTRIBUTION,
  PAYMENT_STATUS_DISTRIBUTION,
  PAYMENT_METHOD_NAMES
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
      const generator = new PaymentGenerator(connection);
      
      switch (command) {
        case 'test':
          console.log('🧪 测试支付记录生成...');
          const testUserId = 'wx_test_user_123';
          const testPayments = generateUserPaymentHistory(testUserId);
          console.log('生成的支付数据:', JSON.stringify(testPayments, null, 2));
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
          console.log('  node paymentGenerator.js test');
          console.log('  node paymentGenerator.js generate <用户ID>');
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