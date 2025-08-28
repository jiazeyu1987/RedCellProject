const { query, transaction } = require('../config/database');
const crypto = require('crypto');

console.log('🎯 用户池管理增强功能 - 压力测试工具');
console.log('📋 将生成50个包含完整信息的测试用户');
console.log('💡 包含：用户基本信息、订阅套餐、付费记录、地址信息、健康数据');
console.log('');

// 生成随机数据的工具函数
const generators = {
  // 生成随机ID
  generateId: (prefix = '') => {
    return prefix + crypto.randomBytes(8).toString('hex');
  },

  // 生成随机姓名
  generateName: () => {
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '孙', '周', '吴', '徐', '朱', '马', '胡', '郭', '林', '何', '高', '梁', '程'];
    const names = ['明华', '丽华', '建国', '秀英', '志强', '桂英', '金花', '国强', '玉兰', '建华', '明', '伟', '芳', '娜', '静', '磊', '洋', '勇', '艳', '红'];
    
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           names[Math.floor(Math.random() * names.length)];
  },

  // 生成随机手机号
  generatePhone: () => {
    const prefixes = ['138', '139', '156', '158', '186', '188', '131', '132', '155', '185'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix;
  },

  // 生成随机年龄
  generateAge: () => {
    return Math.floor(Math.random() * 30) + 50; // 50-80岁
  },

  // 生成随机性别
  generateGender: () => {
    return Math.random() > 0.5 ? '男' : '女';
  },

  // 生成随机地址
  generateAddress: () => {
    const provinces = ['北京市', '上海市', '广东省', '江苏省', '浙江省', '四川省', '湖北省', '湖南省', '河南省', '山东省'];
    const cities = ['朝阳区', '海淀区', '浦东新区', '南山区', '西湖区', '锦江区', '武昌区', '岳麓区', '二七区', '历下区'];
    const streets = ['建国路', '人民路', '中山路', '解放路', '和平路', '胜利路', '文化路', '民主路', '光明路', '友谊路'];
    
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return {
      province: province,
      city: city,
      address: `${province}${city}${street}${number}号`
    };
  },

  // 生成随机病情
  generateConditions: () => {
    const conditions = ['高血压', '糖尿病', '冠心病', '关节炎', '失眠', '胃病', '腰椎病', '颈椎病', '白内障', '前列腺'];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3个病情
    const result = [];
    
    for (let i = 0; i < count; i++) {
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      if (!result.includes(condition)) {
        result.push(condition);
      }
    }
    
    return result;
  },

  // 生成随机日期
  generateDate: (daysAgo = 365) => {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    const date = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
    return date;
  }
};

class EnhancedUserGenerator {
  
  static async generateTestUsers(count = 50) {
    console.log(`📦 开始生成 ${count} 个测试用户...`);
    
    try {
      // 首先获取可用的套餐列表
      const packages = await this.getAvailablePackages();
      console.log(`✅ 获取到 ${packages.length} 个可用套餐`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < count; i++) {
        try {
          const userData = this.generateRandomUserData(packages, i + 1);
          
          await transaction(async (connection) => {
            // 1. 创建用户
            const userId = await this.createUser(connection, userData);
            
            // 2. 创建订阅（70%概率有订阅）
            if (userData.hasSubscription) {
              await this.createSubscription(connection, userId, userData.subscription);
            }
            
            // 3. 创建付费记录
            if (userData.paymentHistory.length > 0) {
              await this.createPayments(connection, userId, userData.paymentHistory);
            }
            
            // 4. 创建地址信息
            await this.createAddress(connection, userId, userData.address);
            
            // 5. 创建健康记录
            if (userData.healthRecords.length > 0) {
              await this.createHealthRecords(connection, userId, userData.healthRecords);
            }
            
            // 6. 更新用户统计信息
            await this.updateUserStatistics(connection, userId, userData);
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

  static async getAvailablePackages() {
    const sql = 'SELECT * FROM subscription_packages WHERE is_active = 1 ORDER BY level';
    return await query(sql);
  }

  static generateRandomUserData(packages, index) {
    const hasSubscription = Math.random() > 0.3; // 70%概率有订阅
    const realName = generators.generateName();
    const address = generators.generateAddress();
    const conditions = generators.generateConditions();
    const age = generators.generateAge();
    
    // 生成用户基本信息
    const userData = {
      index: index,
      openId: `test_user_${generators.generateId()}`,
      nickname: realName,
      realName: realName,
      phone: generators.generatePhone(),
      age: age,
      gender: generators.generateGender(),
      hasSubscription: hasSubscription,
      address: {
        contactName: realName,
        contactPhone: generators.generatePhone(),
        ...address
      },
      healthConditions: conditions
    };

    // 生成订阅信息
    if (hasSubscription && packages.length > 0) {
      const selectedPackage = packages[Math.floor(Math.random() * packages.length)];
      const startDate = generators.generateDate(180); // 最近6个月内开始
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天有效期
      
      userData.subscription = {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        level: selectedPackage.level,
        monthlyPrice: selectedPackage.price,
        servicesPerMonth: selectedPackage.services_per_month,
        status: endDate > new Date() ? 'active' : 'expired',
        startDate: startDate,
        endDate: endDate,
        servicesUsed: Math.floor(Math.random() * selectedPackage.services_per_month),
        servicesRemaining: Math.floor(Math.random() * selectedPackage.services_per_month)
      };
    }

    // 生成付费记录
    userData.paymentHistory = [];
    if (hasSubscription) {
      const paymentCount = Math.floor(Math.random() * 6) + 1; // 1-6次付费
      let totalAmount = 0;
      
      for (let j = 0; j < paymentCount; j++) {
        const amount = parseFloat((Math.random() * 2000 + 100).toFixed(2)); // 100-2100元
        const paymentTime = generators.generateDate(365);
        
        userData.paymentHistory.push({
          amount: amount,
          paymentMethod: ['wechat', 'alipay', 'bank_card'][Math.floor(Math.random() * 3)],
          paymentStatus: 'success',
          paymentTime: paymentTime,
          orderNo: `ORD_${generators.generateId()}`
        });
        
        totalAmount += amount;
      }
      
      userData.totalPayment = totalAmount;
      userData.paymentCount = paymentCount;
    } else {
      userData.totalPayment = 0;
      userData.paymentCount = 0;
    }

    // 生成健康记录
    userData.healthRecords = [];
    const recordCount = Math.floor(Math.random() * 50) + 10; // 10-60条记录
    
    const healthTypes = ['blood_pressure', 'blood_sugar', 'heart_rate', 'weight', 'temperature'];
    
    for (let k = 0; k < recordCount; k++) {
      const type = healthTypes[Math.floor(Math.random() * healthTypes.length)];
      const recordTime = generators.generateDate(90); // 最近3个月内
      
      let value, unit, status;
      switch (type) {
        case 'blood_pressure':
          const systolic = Math.floor(Math.random() * 50) + 110; // 110-160
          const diastolic = Math.floor(Math.random() * 30) + 70;  // 70-100
          value = `${systolic}/${diastolic}`;
          unit = 'mmHg';
          status = systolic > 140 || diastolic > 90 ? 'warning' : 'normal';
          break;
        case 'blood_sugar':
          value = (Math.random() * 5 + 4).toFixed(1); // 4.0-9.0
          unit = 'mmol/L';
          status = parseFloat(value) > 7.0 ? 'warning' : 'normal';
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 40) + 60; // 60-100
          unit = 'bpm';
          status = value > 100 || value < 60 ? 'warning' : 'normal';
          break;
        case 'weight':
          value = (Math.random() * 30 + 50).toFixed(1); // 50-80kg
          unit = 'kg';
          status = 'normal';
          break;
        case 'temperature':
          value = (Math.random() * 2 + 36).toFixed(1); // 36-38度
          unit = '°C';
          status = parseFloat(value) > 37.5 ? 'warning' : 'normal';
          break;
      }
      
      userData.healthRecords.push({
        type: type,
        value: value,
        unit: unit,
        status: status,
        recordTime: recordTime,
        source: ['self', 'nurse', 'device'][Math.floor(Math.random() * 3)]
      });
    }

    return userData;
  }

  static async createUser(connection, userData) {
    const sql = `
      INSERT INTO users (
        id, open_id, nickname, real_name, phone, age, gender, 
        status, subscription_status, total_payment_amount, payment_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW(), NOW())
    `;
    
    const userId = generators.generateId('user_');
    const subscriptionStatus = userData.hasSubscription ? 
      (userData.subscription?.status === 'active' ? 'active' : 'expired') : 'none';
    
    await connection.execute(sql, [
      userId,
      userData.openId,
      userData.nickname,
      userData.realName,
      userData.phone,
      userData.age,
      userData.gender,
      subscriptionStatus,
      userData.totalPayment || 0,
      userData.paymentCount || 0
    ]);
    
    return userId;
  }

  static async createSubscription(connection, userId, subscriptionData) {
    const sql = `
      INSERT INTO user_subscriptions (
        id, user_id, package_id, status, start_date, end_date,
        monthly_price, services_used, services_remaining, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const subscriptionId = generators.generateId('sub_');
    
    await connection.execute(sql, [
      subscriptionId,
      userId,
      subscriptionData.packageId,
      subscriptionData.status,
      subscriptionData.startDate,
      subscriptionData.endDate,
      subscriptionData.monthlyPrice,
      subscriptionData.servicesUsed,
      subscriptionData.servicesRemaining
    ]);
    
    // 更新用户当前订阅ID
    await connection.execute(
      'UPDATE users SET current_subscription_id = ? WHERE id = ?',
      [subscriptionId, userId]
    );
    
    return subscriptionId;
  }

  static async createPayments(connection, userId, paymentHistory) {
    const sql = `
      INSERT INTO payment_records (
        id, user_id, amount, payment_method, payment_status,
        order_no, payment_time, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    for (const payment of paymentHistory) {
      const paymentId = generators.generateId('pay_');
      
      await connection.execute(sql, [
        paymentId,
        userId,
        payment.amount,
        payment.paymentMethod,
        payment.paymentStatus,
        payment.orderNo,
        payment.paymentTime
      ]);
    }
  }

  static async createAddress(connection, userId, addressData) {
    const sql = `
      INSERT INTO user_addresses (
        id, user_id, contact_name, contact_phone, province, city,
        address, is_default, visit_count, last_visit, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())
    `;
    
    const addressId = generators.generateId('addr_');
    const visitCount = Math.floor(Math.random() * 20);
    const lastVisit = visitCount > 0 ? generators.generateDate(30) : null;
    
    await connection.execute(sql, [
      addressId,
      userId,
      addressData.contactName,
      addressData.contactPhone,
      addressData.province,
      addressData.city,
      addressData.address,
      visitCount,
      lastVisit
    ]);
    
    return addressId;
  }

  static async createHealthRecords(connection, userId, healthRecords) {
    const sql = `
      INSERT INTO health_records (
        id, user_id, type, value, unit, status, record_time, source, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    for (const record of healthRecords) {
      const recordId = generators.generateId('health_');
      
      await connection.execute(sql, [
        recordId,
        userId,
        record.type,
        record.value,
        record.unit,
        record.status,
        record.recordTime,
        record.source
      ]);
    }
  }

  static async updateUserStatistics(connection, userId, userData) {
    const lastPaymentTime = userData.paymentHistory.length > 0 ?
      Math.max(...userData.paymentHistory.map(p => p.paymentTime.getTime())) : null;
    
    const sql = `
      UPDATE users SET 
        last_payment_time = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await connection.execute(sql, [
      lastPaymentTime ? new Date(lastPaymentTime) : null,
      userId
    ]);
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
      const totalRevenue = await query('SELECT SUM(amount) as total FROM payment_records WHERE payment_status = "success"');
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
      
      console.log('✅ 数据验证完成！');
      
    } catch (error) {
      console.error('❌ 数据验证失败:', error);
    }
  }
}

// 执行生成器
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 50;
  
  EnhancedUserGenerator.generateTestUsers(count)
    .then((result) => {
      console.log(`\n🎉 压力测试工具执行完成！成功: ${result.successCount}, 失败: ${result.errorCount}`);
      process.exit(result.errorCount > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('压力测试工具执行异常:', error);
      process.exit(1);
    });
}

module.exports = EnhancedUserGenerator;