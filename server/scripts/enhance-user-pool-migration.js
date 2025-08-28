const { query, transaction } = require('../config/database');

console.log('🚀 开始用户池管理增强功能数据库迁移...');
console.log('📋 本次迁移将创建以下表和字段：');
console.log('   - subscription_packages (订阅套餐表)');
console.log('   - user_subscriptions (用户订阅表)');
console.log('   - payment_records (付费记录表)');  
console.log('   - user_addresses (用户地址表)');
console.log('   - 增强users表字段');
console.log('');

async function enhanceUserPoolMigration() {
  try {
    await transaction(async (connection) => {
      
      // 1. 创建订阅套餐表
      console.log('📦 创建 subscription_packages 表...');
      const createSubscriptionPackagesTable = `
        CREATE TABLE IF NOT EXISTS subscription_packages (
          id VARCHAR(50) PRIMARY KEY COMMENT '套餐ID',
          name VARCHAR(100) NOT NULL COMMENT '套餐名称',
          level INT NOT NULL COMMENT '套餐等级(1-10)',
          price DECIMAL(10,2) NOT NULL COMMENT '月费价格',
          services_per_month INT NOT NULL COMMENT '每月服务次数',
          service_staff VARCHAR(200) DEFAULT NULL COMMENT '服务人员配置',
          hospital_resources VARCHAR(500) DEFAULT NULL COMMENT '合作医院资源',
          features TEXT DEFAULT NULL COMMENT '套餐特性描述',
          target_users VARCHAR(200) DEFAULT NULL COMMENT '目标用户群体',
          service_description TEXT DEFAULT NULL COMMENT '服务内容描述',
          is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
          create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_level (level),
          INDEX idx_price (price),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅套餐配置表';
      `;
      await connection.execute(createSubscriptionPackagesTable);
      console.log('✅ subscription_packages 表创建成功');

      // 2. 创建用户订阅表
      console.log('👤 创建 user_subscriptions 表...');
      const createUserSubscriptionsTable = `
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id VARCHAR(50) PRIMARY KEY COMMENT '订阅ID',
          user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
          package_id VARCHAR(50) NOT NULL COMMENT '套餐ID',
          status ENUM('active','expired','paused','cancelled') DEFAULT 'active' COMMENT '订阅状态',
          start_date DATE NOT NULL COMMENT '开始日期',
          end_date DATE NOT NULL COMMENT '结束日期',
          monthly_price DECIMAL(10,2) NOT NULL COMMENT '月费',
          services_used INT DEFAULT 0 COMMENT '已使用服务次数',
          services_remaining INT DEFAULT 0 COMMENT '剩余服务次数',
          create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_user_id (user_id),
          INDEX idx_package_id (package_id),
          INDEX idx_status (status),
          INDEX idx_end_date (end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅表';
      `;
      await connection.execute(createUserSubscriptionsTable);
      console.log('✅ user_subscriptions 表创建成功');

      // 3. 创建付费记录表
      console.log('💳 创建 payment_records 表...');
      const createPaymentRecordsTable = `
        CREATE TABLE IF NOT EXISTS payment_records (
          id VARCHAR(50) PRIMARY KEY COMMENT '支付记录ID',
          user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
          amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
          payment_method ENUM('wechat','alipay','balance','bank_card') DEFAULT 'wechat' COMMENT '支付方式',
          payment_status ENUM('pending','success','failed','refunded') DEFAULT 'pending' COMMENT '支付状态',
          order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
          transaction_id VARCHAR(100) DEFAULT NULL COMMENT '第三方交易号',
          payment_time TIMESTAMP NULL DEFAULT NULL COMMENT '支付时间',
          refund_time TIMESTAMP NULL DEFAULT NULL COMMENT '退款时间',
          remark TEXT DEFAULT NULL COMMENT '备注信息',
          create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_user_id (user_id),
          INDEX idx_order_no (order_no),
          INDEX idx_payment_status (payment_status),
          INDEX idx_payment_time (payment_time),
          INDEX idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';
      `;
      await connection.execute(createPaymentRecordsTable);
      console.log('✅ payment_records 表创建成功');

      // 4. 创建用户地址表
      console.log('🏠 创建 user_addresses 表...');
      const createUserAddressesTable = `
        CREATE TABLE IF NOT EXISTS user_addresses (
          id VARCHAR(50) PRIMARY KEY COMMENT '地址ID',
          user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
          contact_name VARCHAR(50) NOT NULL COMMENT '联系人姓名',
          contact_phone VARCHAR(20) NOT NULL COMMENT '联系人电话',
          province VARCHAR(50) DEFAULT NULL COMMENT '省份',
          city VARCHAR(50) DEFAULT NULL COMMENT '城市',
          district VARCHAR(50) DEFAULT NULL COMMENT '区县',
          address VARCHAR(500) NOT NULL COMMENT '详细地址',
          latitude DECIMAL(10,6) DEFAULT NULL COMMENT '纬度',
          longitude DECIMAL(10,6) DEFAULT NULL COMMENT '经度',
          is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认地址',
          visit_count INT DEFAULT 0 COMMENT '服务次数',
          last_visit TIMESTAMP NULL DEFAULT NULL COMMENT '最后服务时间',
          create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_user_id (user_id),
          INDEX idx_is_default (is_default),
          INDEX idx_last_visit (last_visit)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户地址表';
      `;
      await connection.execute(createUserAddressesTable);
      console.log('✅ user_addresses 表创建成功');

      // 5. 增强users表字段
      console.log('🔧 检查并增强 users 表字段...');
      
      // 检查现有字段
      const [userColumns] = await connection.execute('DESCRIBE users');
      const existingFields = userColumns.map(col => col.Field);
      
      const newFields = [
        {
          field: 'current_subscription_id',
          type: 'VARCHAR(50) DEFAULT NULL',
          comment: '当前订阅ID'
        },
        {
          field: 'subscription_status', 
          type: "ENUM('none','active','expired','paused') DEFAULT 'none'",
          comment: '订阅状态'
        },
        {
          field: 'last_payment_time',
          type: 'TIMESTAMP NULL DEFAULT NULL',
          comment: '最后付费时间'
        },
        {
          field: 'total_payment_amount',
          type: 'DECIMAL(10,2) DEFAULT 0.00',
          comment: '总付费金额'
        },
        {
          field: 'payment_count',
          type: 'INT DEFAULT 0',
          comment: '付费次数'
        }
      ];
      
      for (const { field, type, comment } of newFields) {
        if (!existingFields.includes(field)) {
          console.log(`➕ 添加字段: ${field}`);
          await connection.execute(`ALTER TABLE users ADD COLUMN ${field} ${type} COMMENT '${comment}'`);
          console.log(`✅ 字段 ${field} 添加成功`);
        } else {
          console.log(`✅ 字段 ${field} 已存在`);
        }
      }

      // 6. 添加索引
      console.log('📊 添加必要的索引...');
      const indexes = [
        {
          table: 'users',
          name: 'idx_subscription_status',
          field: 'subscription_status'
        },
        {
          table: 'users', 
          name: 'idx_current_subscription_id',
          field: 'current_subscription_id'
        },
        {
          table: 'users',
          name: 'idx_last_payment_time',
          field: 'last_payment_time'
        }
      ];

      for (const { table, name, field } of indexes) {
        try {
          await connection.execute(`CREATE INDEX ${name} ON ${table} (${field})`);
          console.log(`✅ 索引 ${name} 创建成功`);
        } catch (error) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log(`✅ 索引 ${name} 已存在`);
          } else {
            console.log(`⚠️ 索引 ${name} 创建失败: ${error.message}`);
          }
        }
      }

      // 7. 验证表创建结果
      console.log('');
      console.log('🔍 验证表创建结果...');
      const [tables] = await connection.execute('SHOW TABLES');
      const tableNames = tables.map(table => Object.values(table)[0]);
      
      const requiredTables = [
        'users', 
        'subscription_packages', 
        'user_subscriptions', 
        'payment_records',
        'user_addresses',
        'health_records'
      ];
      
      console.log('📋 数据表检查:');
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        if (tableNames.includes(table)) {
          console.log(`   ✅ ${table} - 存在`);
        } else {
          console.log(`   ❌ ${table} - 不存在`);
          allTablesExist = false;
        }
      }

      if (!allTablesExist) {
        throw new Error('部分必要的表未创建成功');
      }

      console.log('');
      console.log('🎉 用户池管理增强功能数据库迁移完成！');
      return true;
    });

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    console.error('');
    console.error('🔧 解决建议:');
    console.error('1. 检查数据库连接配置');
    console.error('2. 确保数据库用户有CREATE/ALTER权限');
    console.error('3. 检查表名冲突');
    console.error('4. 查看详细错误信息进行排查');
    return false;
  }
}

// 执行迁移
if (require.main === module) {
  enhanceUserPoolMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('迁移执行异常:', error);
      process.exit(1);
    });
}

module.exports = enhanceUserPoolMigration;