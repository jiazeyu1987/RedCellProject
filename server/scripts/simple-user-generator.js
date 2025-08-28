const { query, transaction } = require('../config/database');
const crypto = require('crypto');

console.log('🎯 用户池管理增强功能 - 最终压力测试工具');
console.log('📋 将生成50个包含完整信息的测试用户');
console.log('💡 包含：用户基本信息、订阅套餐、付费记录、地址信息、健康数据');
console.log('');

// 简化的随机数据生成器
const generators = {
  generateId: () => crypto.randomBytes(8).toString('hex'),
  
  generateName: () => {
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '孙'];
    const names = ['明华', '丽华', '建国', '秀英', '志强', '桂英', '金花', '国强'];
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           names[Math.floor(Math.random() * names.length)];
  },
  
  generatePhone: () => {
    const prefixes = ['138', '139', '156', '158', '186', '188'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix;
  },
  
  generateAddress: () => {
    const cities = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区'];
    const streets = ['建国路', '人民路', '中山路', '解放路'];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${city}${street}${number}号`;
  },
  
  generateDate: (daysAgo = 365) => {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
  }
};

class SimpleUserGenerator {
  
  static async generateTestUsers(count = 50) {
    console.log(`📦 开始生成 ${count} 个测试用户...`);
    
    try {
      // 获取套餐列表
      const packages = await query('SELECT * FROM subscription_packages WHERE is_active = 1 ORDER BY level');
      console.log(`✅ 获取到 ${packages.length} 个可用套餐`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < count; i++) {
        try {
          await transaction(async (connection) => {
            const realName = generators.generateName();
            const phone = generators.generatePhone();
            const age = Math.floor(Math.random() * 30) + 50; // 50-80岁
            const gender = Math.random() > 0.5 ? '男' : '女';
            const hasSubscription = Math.random() > 0.3; // 70%概率有订阅
            
            // 1. 创建用户
            const [userResult] = await connection.execute(`
              INSERT INTO users (
                open_id, nickname, real_name, phone, age, gender, 
                status, subscription_status, total_payment_amount, payment_count,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW(), NOW())
            `, [
              `test_user_${generators.generateId()}`,
              realName,
              realName,
              phone,
              age,
              gender,
              hasSubscription ? 'active' : 'none',
              0,
              0
            ]);
            
            const userId = userResult.insertId;
            
            // 2. 创建订阅（如果有）
            if (hasSubscription && packages.length > 0) {
              const selectedPackage = packages[Math.floor(Math.random() * packages.length)];
              const startDate = generators.generateDate(180);
              const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
              const status = endDate > new Date() ? 'active' : 'expired';
              
              const subscriptionId = `sub_${generators.generateId()}`;
              
              await connection.execute(`
                INSERT INTO user_subscriptions (
                  id, user_id, plan_id, status, start_date, end_date,
                  remaining_quota, purchase_price, create_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `, [
                subscriptionId,
                userId.toString(),
                selectedPackage.id,
                status,
                startDate,
                endDate,
                Math.floor(Math.random() * selectedPackage.services_per_month),
                selectedPackage.price
              ]);
              
              // 更新用户当前订阅ID
              await connection.execute(
                'UPDATE users SET current_subscription_id = ?, subscription_status = ? WHERE id = ?',
                [subscriptionId, status, userId]
              );
            }
            
            // 3. 创建付费记录（如果有订阅）
            if (hasSubscription) {
              const paymentCount = Math.floor(Math.random() * 5) + 1; // 1-5次付费
              let totalAmount = 0;
              
              for (let j = 0; j < paymentCount; j++) {
                const amount = parseFloat((Math.random() * 1500 + 100).toFixed(2));
                const paymentTime = generators.generateDate(365);
                
                await connection.execute(`
                  INSERT INTO payment_records (
                    id, user_id, amount, payment_method, status,
                    order_no, pay_time, create_time
                  ) VALUES (?, ?, ?, ?, 'success', ?, ?, NOW())
                `, [
                  `pay_${generators.generateId()}`,
                  userId.toString(),
                  amount,
                  ['wechat', 'alipay', 'bank_card'][Math.floor(Math.random() * 3)],
                  `ORD_${generators.generateId()}`,
                  paymentTime
                ]);
                
                totalAmount += amount;
              }
              
              // 更新用户付费统计
              await connection.execute(`
                UPDATE users SET 
                  total_payment_amount = ?, 
                  payment_count = ?,
                  last_payment_time = (
                    SELECT MAX(pay_time) FROM payment_records WHERE user_id = ?
                  )
                WHERE id = ?
              `, [totalAmount, paymentCount, userId, userId]);
            }
            
            // 4. 创建地址信息
            await connection.execute(`
              INSERT INTO user_addresses (
                id, user_id, contact_name, contact_phone, address,
                is_default, visit_count, last_visit, create_time
              ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())
            `, [
              `addr_${generators.generateId()}`,
              userId.toString(),
              realName,
              phone,
              generators.generateAddress(),
              Math.floor(Math.random() * 15),
              Math.random() > 0.5 ? generators.generateDate(60) : null
            ]);
            
            // 5. 创建健康记录
            const healthRecordCount = Math.floor(Math.random() * 30) + 10; // 10-40条记录
            for (let k = 0; k < healthRecordCount; k++) {
              const types = ['blood_pressure', 'blood_sugar', 'heart_rate', 'weight'];
              const type = types[Math.floor(Math.random() * types.length)];
              
              let value, unit, status;
              switch (type) {
                case 'blood_pressure':
                  const systolic = Math.floor(Math.random() * 50) + 110;
                  const diastolic = Math.floor(Math.random() * 30) + 70;
                  value = `${systolic}/${diastolic}`;
                  unit = 'mmHg';
                  status = systolic > 140 ? 'warning' : 'normal';
                  break;
                case 'blood_sugar':
                  value = (Math.random() * 4 + 4).toFixed(1);
                  unit = 'mmol/L';
                  status = parseFloat(value) > 7.0 ? 'warning' : 'normal';
                  break;
                case 'heart_rate':
                  value = Math.floor(Math.random() * 40) + 60;
                  unit = 'bpm';
                  status = value > 100 ? 'warning' : 'normal';
                  break;
                case 'weight':
                  value = (Math.random() * 30 + 50).toFixed(1);
                  unit = 'kg';
                  status = 'normal';
                  break;
              }
              
              await connection.execute(`
                INSERT INTO health_records (
                  id, user_id, type, value, unit, status, record_time, source, create_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
              `, [
                `health_${generators.generateId()}`,
                userId.toString(),
                type,
                value,
                unit,
                status,
                generators.generateDate(90),
                ['self', 'nurse', 'device'][Math.floor(Math.random() * 3)]
              ]);
            }
          });
          
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`📊 进度: ${successCount}/${count} 用户创建成功`);
          }
          
        } catch (error) {
          errorCount++;
          console.error(`❌ 创建用户 ${i + 1} 失败:`, error.message);
        }
      }
      
      console.log('');
      console.log('🎉 测试用户生成完成！');
      console.log(`✅ 成功创建: ${successCount} 个用户`);
      console.log(`❌ 创建失败: ${errorCount} 个用户`);
      
      // 验证生成结果
      await this.verifyGeneratedData();
      
      return { successCount, errorCount };
      
    } catch (error) {
      console.error('❌ 生成测试用户失败:', error);
      throw error;
    }
  }

  static async verifyGeneratedData() {
    console.log('');
    console.log('🔍 验证生成的数据...');
    
    try {
      // 验证用户数量
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 用户总数: ${userCount[0].count}`);
      
      // 验证订阅数量
      const subscriptionCount = await query('SELECT COUNT(*) as count FROM user_subscriptions');
      console.log(`📦 订阅记录: ${subscriptionCount[0].count}`);
      
      // 验证付费记录
      const paymentCount = await query('SELECT COUNT(*) as count FROM payment_records');
      const totalRevenue = await query('SELECT SUM(amount) as total FROM payment_records WHERE status = "success"');
      console.log(`💳 付费记录: ${paymentCount[0].count} 条，总金额: ¥${parseFloat(totalRevenue[0].total || 0).toFixed(2)}`);
      
      // 验证地址记录
      const addressCount = await query('SELECT COUNT(*) as count FROM user_addresses');
      console.log(`🏠 地址记录: ${addressCount[0].count}`);
      
      // 验证健康记录
      const healthCount = await query('SELECT COUNT(*) as count FROM health_records');
      console.log(`💊 健康记录: ${healthCount[0].count}`);
      
      // 验证订阅状态分布
      const statusStats = await query(`
        SELECT subscription_status, COUNT(*) as count 
        FROM users 
        GROUP BY subscription_status
      `);
      
      console.log('📊 订阅状态分布:');
      statusStats.forEach(stat => {
        console.log(`   ${stat.subscription_status}: ${stat.count} 用户`);
      });
      
      // 验证套餐分布
      const packageStats = await query(`
        SELECT sp.name, sp.level, COUNT(us.id) as count
        FROM subscription_packages sp
        LEFT JOIN user_subscriptions us ON sp.id = us.plan_id
        GROUP BY sp.id
        ORDER BY sp.level
      `);
      
      console.log('📦 套餐订阅分布:');
      packageStats.forEach(stat => {
        console.log(`   Lv.${stat.level} ${stat.name}: ${stat.count} 用户`);
      });
      
      console.log('✅ 数据验证完成！');
      
    } catch (error) {
      console.error('❌ 数据验证失败:', error);
    }
  }
}

// 执行生成器
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 50;
  
  SimpleUserGenerator.generateTestUsers(count)
    .then((result) => {
      console.log(`\n🎉 压力测试工具执行完成！成功: ${result.successCount}, 失败: ${result.errorCount}`);
      process.exit(result.errorCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('压力测试工具执行异常:', error);
      process.exit(1);
    });
}

module.exports = SimpleUserGenerator;