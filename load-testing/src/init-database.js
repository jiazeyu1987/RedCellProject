const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

console.log('🚀 开始初始化数据库表结构...');
console.log('📋 目标数据库:', config.database);
console.log('');

async function initializeTables() {
  let connection;
  
  try {
    console.log('🔄 连接到数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');
    console.log('');

    // 1. 创建用户订阅表
    console.log('📦 创建 user_subscriptions 表...');
    const createUserSubscriptionsTable = `
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id VARCHAR(50) PRIMARY KEY COMMENT '订阅ID',
        user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
        plan_id VARCHAR(50) NOT NULL COMMENT '套餐ID',
        status ENUM('active', 'expired', 'cancelled') DEFAULT 'active' COMMENT '订阅状态',
        start_date DATETIME NOT NULL COMMENT '开始时间',
        end_date DATETIME NOT NULL COMMENT '结束时间',
        remaining_quota INT DEFAULT 0 COMMENT '剩余配额(-1表示无限)',
        purchase_price DECIMAL(10,2) NOT NULL COMMENT '购买价格',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_user_id (user_id),
        INDEX idx_plan_id (plan_id),
        INDEX idx_status (status),
        INDEX idx_end_date (end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户套餐订阅表';
    `;
    
    await connection.execute(createUserSubscriptionsTable);
    console.log('✅ user_subscriptions 表创建成功');

    // 2. 创建支付记录表
    console.log('💳 创建 payment_records 表...');
    const createPaymentRecordsTable = `
      CREATE TABLE IF NOT EXISTS payment_records (
        id VARCHAR(50) PRIMARY KEY COMMENT '支付记录ID',
        user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
        order_no VARCHAR(100) NOT NULL UNIQUE COMMENT '订单号',
        amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
        payment_method ENUM('wechat', 'alipay', 'balance', 'bank_card') NOT NULL COMMENT '支付方式',
        status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
        pay_time DATETIME NULL COMMENT '支付完成时间',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        remark TEXT NULL COMMENT '备注信息',
        INDEX idx_user_id (user_id),
        INDEX idx_order_no (order_no),
        INDEX idx_status (status),
        INDEX idx_pay_time (pay_time),
        INDEX idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户支付记录表';
    `;
    
    await connection.execute(createPaymentRecordsTable);
    console.log('✅ payment_records 表创建成功');

    // 3. 创建套餐计划表（如果不存在）
    console.log('📋 创建 subscription_plans 表...');
    const createSubscriptionPlansTable = `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(50) PRIMARY KEY COMMENT '套餐ID',
        name VARCHAR(100) NOT NULL COMMENT '套餐名称',
        type VARCHAR(50) NOT NULL COMMENT '套餐类型',
        level INT NOT NULL COMMENT '套餐等级(1-10)',
        price DECIMAL(10,2) NOT NULL COMMENT '套餐价格',
        duration_days INT NOT NULL COMMENT '有效期（天）',
        monthly_visits INT NOT NULL COMMENT '每月上门次数',
        staff_level VARCHAR(50) NOT NULL COMMENT '服务人员等级',
        hospital_level VARCHAR(50) NOT NULL COMMENT '合作医院等级',
        service_items TEXT NOT NULL COMMENT '服务项目',
        target_users TEXT NOT NULL COMMENT '目标用户',
        description TEXT NULL COMMENT '套餐描述',
        features JSON NULL COMMENT '套餐特性',
        is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
        sort_order INT DEFAULT 0 COMMENT '排序',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_type (type),
        INDEX idx_level (level),
        INDEX idx_price (price),
        INDEX idx_is_active (is_active),
        INDEX idx_sort_order (sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐计划表';
    `;
    
    await connection.execute(createSubscriptionPlansTable);
    console.log('✅ subscription_plans 表创建成功');

    // 4. 插入默认套餐数据
    console.log('🎁 插入默认10级套餐数据...');
    const insertDefaultPlans = `
      INSERT IGNORE INTO subscription_plans (
        id, name, type, level, price, duration_days, monthly_visits, 
        staff_level, hospital_level, service_items, target_users, description
      ) VALUES
      ('plan_level_1', '贴心关怀型', 'basic', 1, 98.00, 30, 1, '护理员', '社区卫生服务中心', '基础健康咨询、血压体温测量、生活指导', '身体健康，仅需基础关怀的老年人', '每月1次上门探访，基础健康关怀'),
      ('plan_level_2', '基础保障型', 'basic', 2, 168.00, 30, 2, '护理员', '一级医疗机构', '健康监测、档案记录、用药提醒', '身体状况稳定，需要定期基础监测的老年人', '每月2次上门服务，基础健康监测'),
      ('plan_level_3', '健康守护型', 'standard', 3, 298.00, 30, 4, '护士', '二级医疗机构', '健康监测、趋势分析、用药指导', '有轻微慢性病，需要定期监测的老年人', '每月4次上门服务，健康趋势分析'),
      ('plan_level_4', '专业护理型', 'standard', 4, 498.00, 30, 6, '护士', '二级医疗机构', '全面监测、慢性病管理、伤口护理', '有明确慢性病，需要专业护理指导的老年人', '每月6次上门服务，专业护理指导'),
      ('plan_level_5', '贴心陪护型', 'premium', 5, 798.00, 30, 8, '主管护师', '二级医疗机构+部分三甲医院', '全面监测、个性化方案、康复训练', '行动不便，需要较多关注的老年人', '每月8次上门服务，个性化护理方案'),
      ('plan_level_6', '高级护理型', 'premium', 6, 1280.00, 30, 12, '主管护师', '三级医疗机构', '全面检查、慢性病管理、理疗指导、营养建议', '有多种慢性病，需要高级护理的老年人', '每月12次上门服务，高级护理管理'),
      ('plan_level_7', '专家指导型', 'expert', 7, 1880.00, 30, 16, '专家级护理师', '三级甲等医疗机构+专家资源', '专家方案、康复理疗、心理疏导、运动处方', '病情复杂，需要专家指导的老年人', '每月16次上门服务，专家级健康管理'),
      ('plan_level_8', '专属护理型', 'expert', 8, 2280.00, 30, 20, '专家级护理师', '知名三甲医院+专家资源+特需门诊', '专属管理师、中医调理、个性化营养、睡眠管理', '高净值客户，对服务质量要求极高的老年人', '每月20次上门服务，专属健康管理师'),
      ('plan_level_9', '全程陪护型', 'vip', 9, 2680.00, 30, 25, '专家级护理师+合作医生', '知名三甲医院+专家资源+特需门诊+急救网络', '家庭医生服务、专业护理、专家会诊、紧急绿色通道', '行动严重不便，需要高频次服务的老年人', '每月25次上门服务，24小时紧急响应'),
      ('plan_level_10', '尊享专家型', 'vip', 10, 2980.00, 30, 30, '专属健康管理师+家庭医生+专家顾问团队', '顶级三甲医院+知名专家+特需门诊+急救网络+国际医疗资源', '顶级服务、远程监测、基因检测、专车接送、国际医疗', '超高净值客户，要求最高级别服务的老年人', '每月30次上门服务，尊享专家级服务');
    `;
    
    await connection.execute(insertDefaultPlans);
    console.log('✅ 10级套餐数据插入完成');

    // 5. 检查users表结构，确保包含新增字段
    console.log('👤 检查 users 表结构...');
    const [userColumns] = await connection.execute('DESCRIBE users');
    const existingFields = userColumns.map(col => col.Field);
    
    const requiredFields = [
      { field: 'service_count', type: 'INT DEFAULT 0', comment: '服务次数' },
      { field: 'total_spent', type: 'DECIMAL(10,2) DEFAULT 0.00', comment: '总消费金额' }
    ];
    
    for (const { field, type, comment } of requiredFields) {
      if (!existingFields.includes(field)) {
        console.log(`➕ 添加字段: ${field}`);
        await connection.execute(`ALTER TABLE users ADD COLUMN ${field} ${type} COMMENT '${comment}'`);
        console.log(`✅ 字段 ${field} 添加成功`);
      } else {
        console.log(`✅ 字段 ${field} 已存在`);
      }
    }

    // 6. 验证表创建结果
    console.log('');
    console.log('🔍 验证表创建结果...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    const requiredTables = ['users', 'user_subscriptions', 'payment_records', 'health_records', 'subscription_plans'];
    console.log('📋 数据表检查:');
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`   ✅ ${table} - 存在`);
      } else {
        console.log(`   ❌ ${table} - 不存在`);
      }
    }

    console.log('');
    console.log('🎉 数据库初始化完成！');
    console.log('✨ 现在可以正常运行用户生成器了');
    return true;

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('');
    console.error('🔧 解决建议:');
    console.error('1. 检查数据库连接配置');
    console.error('2. 确认用户具有 CREATE TABLE 权限');
    console.error('3. 检查数据库存储空间');
    return false;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
initializeTables().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 初始化过程中发生异常:', error.message);
  process.exit(1);
});