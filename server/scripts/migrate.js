const { query, initDatabase, testConnection } = require('../config/database');

// 创建数据表的SQL语句
const createTableSQL = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
      open_id varchar(100) NOT NULL COMMENT '微信OpenID',
      union_id varchar(100) DEFAULT NULL COMMENT '微信UnionID',
      nickname varchar(100) NOT NULL COMMENT '昵称',
      real_name varchar(50) DEFAULT NULL COMMENT '真实姓名',
      avatar varchar(500) DEFAULT NULL COMMENT '头像URL',
      phone varchar(20) DEFAULT NULL COMMENT '手机号',
      email varchar(100) DEFAULT NULL COMMENT '邮箱',
      id_card varchar(20) DEFAULT NULL COMMENT '身份证号',
      age int DEFAULT NULL COMMENT '年龄',
      gender enum('男','女','未知') DEFAULT '未知' COMMENT '性别',
      birthday date DEFAULT NULL COMMENT '生日',
      member_level enum('regular','vip') DEFAULT 'regular' COMMENT '会员等级',
      status enum('active','inactive','frozen') DEFAULT 'active' COMMENT '用户状态',
      service_count int DEFAULT 0 COMMENT '服务次数',
      total_spent decimal(10,2) DEFAULT 0.00 COMMENT '总消费金额',
      emergency_contact varchar(100) DEFAULT NULL COMMENT '紧急联系人',
      emergency_relation varchar(20) DEFAULT NULL COMMENT '紧急联系人关系',
      health_condition varchar(200) DEFAULT NULL COMMENT '健康状况',
      allergies text DEFAULT NULL COMMENT '过敏史',
      medical_history text DEFAULT NULL COMMENT '病史',
      preferred_services json DEFAULT NULL COMMENT '偏好服务',
      device_info json DEFAULT NULL COMMENT '设备信息',
      last_login_ip varchar(50) DEFAULT NULL COMMENT '最后登录IP',
      last_login_time timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      UNIQUE KEY uk_open_id (open_id),
      KEY idx_phone (phone),
      KEY idx_status (status),
      KEY idx_member_level (member_level),
      KEY idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户基础信息表'
  `,
  
  // 服务类型表
  service_types: `
    CREATE TABLE IF NOT EXISTS service_types (
      id int NOT NULL AUTO_INCREMENT COMMENT '服务类型ID',
      name varchar(100) NOT NULL COMMENT '服务名称',
      description text COMMENT '服务描述',
      price decimal(10,2) NOT NULL COMMENT '服务价格',
      duration int DEFAULT 60 COMMENT '服务时长(分钟)',
      category varchar(50) DEFAULT NULL COMMENT '服务分类',
      icon varchar(10) DEFAULT NULL COMMENT '图标',
      is_active tinyint(1) DEFAULT 1 COMMENT '是否启用',
      sort_order int DEFAULT 0 COMMENT '排序',
      create_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_category (category),
      KEY idx_is_active (is_active),
      KEY idx_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务类型表'
  `,
  
  // 用户地址表
  user_addresses: `
    CREATE TABLE IF NOT EXISTS user_addresses (
      id varchar(50) NOT NULL COMMENT '地址ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      contact_name varchar(50) NOT NULL COMMENT '联系人姓名',
      contact_phone varchar(20) NOT NULL COMMENT '联系人电话',
      address varchar(500) NOT NULL COMMENT '详细地址',
      latitude decimal(10,6) DEFAULT NULL COMMENT '纬度',
      longitude decimal(10,6) DEFAULT NULL COMMENT '经度',
      is_default tinyint(1) DEFAULT 0 COMMENT '是否默认地址',
      visit_count int DEFAULT 0 COMMENT '服务次数',
      last_visit timestamp NULL DEFAULT NULL COMMENT '最后服务时间',
      create_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_is_default (is_default)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户地址表'
  `,
  
  // 地址表（用于测试）
  addresses: `
    CREATE TABLE IF NOT EXISTS addresses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      province VARCHAR(20),
      city VARCHAR(20),
      district VARCHAR(20),
      address TEXT NOT NULL,
      is_default TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  
  // 预约订单表
  bookings: `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '预约ID',
      user_id INT NOT NULL COMMENT '用户ID',
      service_type VARCHAR(50) NOT NULL COMMENT '服务类型',
      service_date DATE NOT NULL COMMENT '服务日期',
      service_time TIME NOT NULL COMMENT '服务时间',
      address_id INT COMMENT '服务地址ID',
      status enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending' COMMENT '预约状态',
      total_amount decimal(10,2) DEFAULT 0.00 COMMENT '服务费用',
      notes text DEFAULT NULL COMMENT '备注信息',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_status (status),
      KEY idx_service_date (service_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约订单表'
  `,
  
  // 服务记录表
  service_records: `
    CREATE TABLE IF NOT EXISTS service_records (
      id varchar(50) NOT NULL COMMENT '服务记录ID',
      booking_id varchar(50) NOT NULL COMMENT '预约ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      nurse_id varchar(50) NOT NULL COMMENT '护士ID',
      service_id int NOT NULL COMMENT '服务类型ID',
      service_time timestamp NOT NULL COMMENT '服务时间',
      duration int NOT NULL COMMENT '实际时长(分钟)',
      status enum('completed','cancelled') DEFAULT 'completed' COMMENT '服务状态',
      cost decimal(10,2) NOT NULL COMMENT '服务费用',
      address_id varchar(50) NOT NULL COMMENT '服务地址ID',
      service_report json DEFAULT NULL COMMENT '服务报告',
      rating int DEFAULT NULL COMMENT '用户评分(1-5)',
      feedback text DEFAULT NULL COMMENT '用户反馈',
      tags json DEFAULT NULL COMMENT '评价标签',
      images json DEFAULT NULL COMMENT '服务图片',
      create_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_booking_id (booking_id),
      KEY idx_user_id (user_id),
      KEY idx_service_time (service_time),
      KEY idx_rating (rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务记录表'
  `,
  
  // 健康记录表
  health_records: `
    CREATE TABLE IF NOT EXISTS health_records (
      id varchar(50) NOT NULL COMMENT '记录ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      type varchar(50) NOT NULL COMMENT '记录类型',
      value varchar(100) NOT NULL COMMENT '记录值',
      unit varchar(20) DEFAULT NULL COMMENT '单位',
      status enum('normal','warning','danger') DEFAULT 'normal' COMMENT '状态',
      record_time timestamp NOT NULL COMMENT '记录时间',
      source enum('self','nurse','device','doctor') DEFAULT 'self' COMMENT '数据来源',
      notes text DEFAULT NULL COMMENT '备注',
      images json DEFAULT NULL COMMENT '相关图片',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_type (type),
      KEY idx_record_time (record_time),
      KEY idx_status (status),
      KEY idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='健康记录表'
  `,
  
  // 健康报告表
  health_reports: `
    CREATE TABLE IF NOT EXISTS health_reports (
      id varchar(50) NOT NULL COMMENT '报告ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      report_type enum('weekly','monthly','quarterly','yearly') DEFAULT 'monthly' COMMENT '报告类型',
      period_start date NOT NULL COMMENT '报告周期开始',
      period_end date NOT NULL COMMENT '报告周期结束',
      overall_score int DEFAULT NULL COMMENT '综合评分',
      risk_level enum('low','medium','high') DEFAULT 'low' COMMENT '风险等级',
      summary json DEFAULT NULL COMMENT '总结信息',
      details json DEFAULT NULL COMMENT '详细数据',
      suggestions json DEFAULT NULL COMMENT '建议',
      generate_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_period (period_start, period_end)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='健康报告表'
  `,
  
  // 社区动态表
  community_posts: `
    CREATE TABLE IF NOT EXISTS community_posts (
      id varchar(50) NOT NULL COMMENT '动态ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      type enum('health','experience','question','sharing') DEFAULT 'sharing' COMMENT '动态类型',
      title varchar(200) DEFAULT NULL COMMENT '标题',
      content text NOT NULL COMMENT '内容',
      images json DEFAULT NULL COMMENT '图片列表',
      like_count int DEFAULT 0 COMMENT '点赞数',
      comment_count int DEFAULT 0 COMMENT '评论数',
      view_count int DEFAULT 0 COMMENT '浏览数',
      status enum('published','draft','deleted') DEFAULT 'published' COMMENT '状态',
      is_top tinyint(1) DEFAULT 0 COMMENT '是否置顶',
      publish_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
      update_time timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_type (type),
      KEY idx_status (status),
      KEY idx_publish_time (publish_time),
      KEY idx_is_top (is_top)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态表'
  `,
  
  // 健康知识表
  health_knowledge: `
    CREATE TABLE IF NOT EXISTS health_knowledge (
      id varchar(50) NOT NULL COMMENT '知识ID',
      title varchar(200) NOT NULL COMMENT '标题',
      summary text DEFAULT NULL COMMENT '摘要',
      content text NOT NULL COMMENT '正文内容',
      cover varchar(500) DEFAULT NULL COMMENT '封面图片',
      author varchar(100) DEFAULT NULL COMMENT '作者',
      category varchar(50) DEFAULT 'general' COMMENT '分类',
      read_count int DEFAULT 0 COMMENT '阅读次数',
      like_count int DEFAULT 0 COMMENT '点赞次数',
      status enum('draft','published','archived') DEFAULT 'published' COMMENT '状态',
      is_featured tinyint(1) DEFAULT 0 COMMENT '是否推荐',
      tags json DEFAULT NULL COMMENT '标签',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (id),
      KEY idx_category (category),
      KEY idx_status (status),
      KEY idx_created_at (created_at),
      KEY idx_is_featured (is_featured)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='健康知识表'
  `,
  
  // 问答表
  qa_questions: `
    CREATE TABLE IF NOT EXISTS qa_questions (
      id int NOT NULL AUTO_INCREMENT COMMENT '问题ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      question text NOT NULL COMMENT '问题内容',
      answer text DEFAULT NULL COMMENT '回答内容',
      doctor_name varchar(100) DEFAULT NULL COMMENT '医生姓名',
      category varchar(50) DEFAULT 'general' COMMENT '问题分类',
      status enum('pending','answered','closed') DEFAULT 'pending' COMMENT '状态',
      is_anonymous tinyint(1) DEFAULT 0 COMMENT '是否匿名',
      view_count int DEFAULT 0 COMMENT '浏览次数',
      like_count int DEFAULT 0 COMMENT '点赞次数',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      answered_at timestamp NULL DEFAULT NULL COMMENT '回答时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_status (status),
      KEY idx_category (category),
      KEY idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='问答表'
  `,
  
  // 用户状态变更日志表
  user_status_logs: `
    CREATE TABLE IF NOT EXISTS user_status_logs (
      id varchar(50) NOT NULL COMMENT '日志ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      status varchar(20) NOT NULL COMMENT '状态',
      reason varchar(200) DEFAULT NULL COMMENT '变更原因',
      create_time timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      PRIMARY KEY (id),
      KEY idx_user_id (user_id),
      KEY idx_create_time (create_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户状态变更日志表'
  `,
  
  // 动态点赞表
  post_likes: `
    CREATE TABLE IF NOT EXISTS post_likes (
      id int NOT NULL AUTO_INCREMENT COMMENT '点赞ID',
      post_id varchar(50) NOT NULL COMMENT '动态ID',
      user_id varchar(50) NOT NULL COMMENT '用户ID',
      created_at timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      PRIMARY KEY (id),
      UNIQUE KEY uk_post_user (post_id, user_id),
      KEY idx_post_id (post_id),
      KEY idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动态点赞表'
  `,
  
  // 管理员会话表
  admin_sessions: `
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
};

// 初始化数据SQL
const initDataSQL = {
  service_types: `
    INSERT IGNORE INTO service_types (id, name, description, price, duration, category, icon, sort_order) VALUES
    (1, '基础健康监测', '血压、血糖、体温等基础指标检测', 100.00, 60, '检测', '🩺', 1),
    (2, '综合健康评估', '全面健康状况评估和建议', 200.00, 90, '评估', '📋', 2),
    (3, '康复指导', '专业康复师上门指导', 150.00, 120, '康复', '🏃', 3),
    (4, '慢病管理', '糖尿病、高血压等慢病管理', 180.00, 90, '管理', '💊', 4)
  `,
  
  health_knowledge: `
    INSERT IGNORE INTO health_knowledge (id, title, summary, content, author, category, status) VALUES
    ('hk_001', '高血压患者的日常饮食注意事项', '高血压是常见的慢性疾病，通过合理的饮食调理可以有效控制血压，改善生活质量...', '高血压患者的饮食管理非常重要，以下是一些重要的注意事项：\n\n1. 控制钠分摄入：每日钠分摄入量不超过6克。\n2. 少吃高脂食物：避免油炸、高胆固醇食物。\n3. 多吃新鲜蔬菜水果：富含钾、镁等矿物质。\n4. 适量运动：每天进行30分钟中等强度运动。', '李医生', '慢病管理', 'published'),
    ('hk_002', '老年人如何预防心血管疾病', '心血管疾病是老年人的主要健康威胁之一，通过早期预防和科学管理可以大大降低风险...', '老年人预防心血管疾病的方法：\n\n1. 定期检查：每年进行心电图、血脂检查。\n2. 合理饮食：低盐低脂，多吃蔬菜水果。\n3. 适度运动：散步、太极拳等有氧运动。\n4. 戒烟限酒：减少心血管损害。\n5. 保持心情愉快：减少精神压力。', '王医生', '预防保健', 'published'),
    ('hk_003', '糖尿病患者的运动指导', '适度的运动对糖尿病患者控制血糖非常重要，但需要选择合适的运动方式和强度...', '糖尿病患者运动指导原则：\n\n1. 运动时机：餐后1-2小时运动最佳。\n2. 运动强度：中等强度，以微微出汗为宜。\n3. 运动时间：每次30-45分钟，每周至少150分钟。\n4. 运动方式：散步、游泳、太极拳等有氧运动。\n5. 注意事项：运动前后监测血糖，防止低血糖。', '张医生', '慢病管理', 'published')
  `
};

// 执行数据库迁移
async function runMigration() {
  console.log('🔄 开始数据库迁移...');
  
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    
    // 初始化数据库
    await initDatabase();
    
    // 创建数据表
    console.log('📋 创建数据表...');
    for (const [tableName, sql] of Object.entries(createTableSQL)) {
      try {
        await query(sql);
        console.log(`✅ 表 ${tableName} 创建成功`);
      } catch (error) {
        console.error(`❌ 表 ${tableName} 创建失败:`, error.message);
      }
    }
    
    // 插入初始数据
    console.log('📊 插入初始数据...');
    for (const [tableName, sql] of Object.entries(initDataSQL)) {
      try {
        await query(sql);
        console.log(`✅ 表 ${tableName} 初始数据插入成功`);
      } catch (error) {
        console.error(`❌ 表 ${tableName} 初始数据插入失败:`, error.message);
      }
    }
    
    console.log('🎉 数据库迁移完成!');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  runMigration().then(() => {
    process.exit(0);
  });
}

module.exports = {
  runMigration,
  createTableSQL,
  initDataSQL
};