const { query } = require('../config/database');

async function createServiceProviderTables() {
  console.log('🔄 创建服务者相关数据表...');

  try {
    // 创建服务者信息表
    await query(`
      CREATE TABLE IF NOT EXISTS service_providers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        profession ENUM('doctor', 'nurse', 'therapist', 'caregiver') NOT NULL DEFAULT 'nurse',
        license_number VARCHAR(50) UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100),
        
        -- 服务区域信息
        service_center_lat DECIMAL(10, 8),
        service_center_lng DECIMAL(11, 8),
        service_radius INT DEFAULT 5000,
        
        -- 工作信息
        max_users INT DEFAULT 20,
        current_users INT DEFAULT 0,
        
        -- 专业特长
        specialties JSON,
        
        -- 工作时间安排
        work_schedule JSON,
        
        -- 状态信息
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        rating DECIMAL(3, 2) DEFAULT 5.0,
        total_reviews INT DEFAULT 0,
        
        -- 时间戳
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_location (service_center_lat, service_center_lng),
        INDEX idx_status (status),
        INDEX idx_profession (profession)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建用户分配表
    await query(`
      CREATE TABLE IF NOT EXISTS user_assignments (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT NOT NULL,
        provider_id VARCHAR(50) NOT NULL,
        
        -- 分配信息
        assignment_type ENUM('manual', 'automatic') DEFAULT 'manual',
        assigned_by VARCHAR(50),
        assignment_reason TEXT,
        
        -- 匹配信息
        distance_meters INT,
        match_score DECIMAL(5, 2),
        
        -- 状态信息
        status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
        
        -- 时间戳
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_provider_id (provider_id),
        INDEX idx_status (status),
        INDEX idx_assigned_at (assigned_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建分配历史记录表
    await query(`
      CREATE TABLE IF NOT EXISTS assignment_history (
        id VARCHAR(50) PRIMARY KEY,
        assignment_id VARCHAR(50) NOT NULL,
        action ENUM('created', 'cancelled', 'completed', 'reassigned') NOT NULL,
        reason TEXT,
        operator VARCHAR(50),
        
        -- 时间戳
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (assignment_id) REFERENCES user_assignments(id) ON DELETE CASCADE,
        
        INDEX idx_assignment_id (assignment_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 更新users表，添加分配相关字段
    const alterColumns = [
      'ADD COLUMN assigned_provider_id VARCHAR(50) NULL',
      "ADD COLUMN assignment_status ENUM('unassigned', 'assigned', 'in_service') DEFAULT 'unassigned'",
      'ADD COLUMN latitude DECIMAL(10, 8) NULL',
      'ADD COLUMN longitude DECIMAL(11, 8) NULL'
    ];
    
    for (const columnDef of alterColumns) {
      try {
        await query(`ALTER TABLE users ${columnDef}`);
      } catch (error) {
        // 列可能已存在，跳过
        if (!error.message.includes('Duplicate column name')) {
          console.warn(`添加列失败: ${error.message}`);
        }
      }
    }
    
    // 添加索引
    try {
      await query(`ALTER TABLE users ADD INDEX idx_assignment_status (assignment_status)`);
    } catch (e) {
      // 索引可能已存在
    }
    
    try {
      await query(`ALTER TABLE users ADD INDEX idx_location (latitude, longitude)`);
    } catch (e) {
      // 索引可能已存在
    }

    console.log('✅ 服务者相关数据表创建完成');
    return true;
  } catch (error) {
    console.error('❌ 数据表创建失败:', error);
    throw error;
  }
}

async function insertMockData() {
  console.log('🔄 插入模拟数据...');

  try {
    // 插入模拟服务者数据
    const mockProviders = [
      {
        id: 'provider_001',
        name: '李护士',
        profession: 'nurse',
        license_number: 'N2024001',
        phone: '13800001001',
        email: 'li.nurse@example.com',
        service_center_lat: 39.9204,
        service_center_lng: 116.4490,
        service_radius: 5000,
        max_users: 20,
        current_users: 0,
        specialties: JSON.stringify(['blood_pressure', 'diabetes_care', 'wound_care']),
        work_schedule: JSON.stringify([
          { day: 'monday', startTime: '08:00', endTime: '17:00' },
          { day: 'tuesday', startTime: '08:00', endTime: '17:00' },
          { day: 'wednesday', startTime: '08:00', endTime: '17:00' },
          { day: 'thursday', startTime: '08:00', endTime: '17:00' },
          { day: 'friday', startTime: '08:00', endTime: '17:00' }
        ]),
        status: 'active'
      },
      {
        id: 'provider_002',
        name: '王医生',
        profession: 'doctor',
        license_number: 'D2024001',
        phone: '13800001002',
        email: 'wang.doctor@example.com',
        service_center_lat: 39.9593,
        service_center_lng: 116.2979,
        service_radius: 8000,
        max_users: 15,
        current_users: 0,
        specialties: JSON.stringify(['general_medicine', 'elderly_care', 'chronic_disease']),
        work_schedule: JSON.stringify([
          { day: 'monday', startTime: '09:00', endTime: '18:00' },
          { day: 'wednesday', startTime: '09:00', endTime: '18:00' },
          { day: 'friday', startTime: '09:00', endTime: '18:00' },
          { day: 'saturday', startTime: '09:00', endTime: '15:00' }
        ]),
        status: 'active'
      },
      {
        id: 'provider_003',
        name: '张康复师',
        profession: 'therapist',
        license_number: 'T2024001',
        phone: '13800001003',
        email: 'zhang.therapist@example.com',
        service_center_lat: 39.9142,
        service_center_lng: 116.3660,
        service_radius: 6000,
        max_users: 12,
        current_users: 0,
        specialties: JSON.stringify(['physical_therapy', 'rehabilitation', 'mobility_assistance']),
        work_schedule: JSON.stringify([
          { day: 'tuesday', startTime: '08:00', endTime: '16:00' },
          { day: 'thursday', startTime: '08:00', endTime: '16:00' },
          { day: 'saturday', startTime: '10:00', endTime: '16:00' },
          { day: 'sunday', startTime: '10:00', endTime: '14:00' }
        ]),
        status: 'active'
      }
    ];

    for (const provider of mockProviders) {
      await query(`
        INSERT IGNORE INTO service_providers 
        (id, name, profession, license_number, phone, email, 
         service_center_lat, service_center_lng, service_radius, 
         max_users, current_users, specialties, work_schedule, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        provider.id, provider.name, provider.profession, provider.license_number,
        provider.phone, provider.email, provider.service_center_lat, provider.service_center_lng,
        provider.service_radius, provider.max_users, provider.current_users,
        provider.specialties, provider.work_schedule, provider.status
      ]);
    }

    console.log('✅ 模拟数据插入完成');
    return true;
  } catch (error) {
    console.error('❌ 模拟数据插入失败:', error);
    throw error;
  }
}

// 主执行函数
async function main() {
  try {
    await createServiceProviderTables();
    await insertMockData();
    console.log('🎉 数据库迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createServiceProviderTables,
  insertMockData
};