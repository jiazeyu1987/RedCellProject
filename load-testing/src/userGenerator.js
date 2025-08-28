const faker = require('faker');
const axios = require('axios');
const mysql = require('mysql2/promise');

// 设置中文语言
faker.locale = 'zh_CN';

// 配置信息
const config = {
  api: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/v1',
    timeout: 10000
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'abcd1234!',
    database: process.env.DB_DATABASE || 'health_guard_db'
  },
  generation: {
    batchSize: 10,
    maxUsers: 500,
    enableDatabaseInsert: true,
    enableAPICall: false
  }
};

/**
 * 生成北京市随机地址和坐标
 */
function generateBeijingLocation() {
  const districts = [
    { 
      name: '朝阳区', 
      center: [39.9204, 116.4490],
      streets: ['三里屯街道', '建国门外街道', '呼家楼街道', '八里庄街道', '双井街道']
    },
    { 
      name: '海淀区', 
      center: [39.9593, 116.2979],
      streets: ['中关村街道', '万寿路街道', '羊坊店街道', '甘家口街道', '学院路街道']
    },
    { 
      name: '西城区', 
      center: [39.9142, 116.3660],
      streets: ['西长安街街道', '新街口街道', '月坛街道', '德胜街道', '金融街街道']
    },
    { 
      name: '东城区', 
      center: [39.9180, 116.4175],
      streets: ['东华门街道', '景山街道', '交道口街道', '安定门街道', '北新桥街道']
    },
    { 
      name: '丰台区', 
      center: [39.8585, 116.2867],
      streets: ['右安门街道', '太平桥街道', '西罗园街道', '大红门街道', '南苑街道']
    }
  ];
  
  const district = faker.random.arrayElement(districts);
  const street = faker.random.arrayElement(district.streets);
  
  // 在区中心附近生成随机坐标
  const offsetLat = (Math.random() - 0.5) * 0.018;
  const offsetLng = (Math.random() - 0.5) * 0.018;
  
  return {
    district: district.name,
    street: street,
    address: `${district.name}${street}${faker.datatype.number({min: 1, max: 999})}号`,
    latitude: district.center[0] + offsetLat,
    longitude: district.center[1] + offsetLng
  };
}

/**
 * 生成虚拟用户数据
 */
function generateVirtualUser() {
  const location = generateBeijingLocation();
  const age = faker.datatype.number({min: 60, max: 90});
  const gender = faker.random.arrayElement(['男', '女']);
  const lastName = faker.name.lastName();
  
  const healthConditions = [
    'healthy', 'high_blood_pressure', 'diabetes', 
    'heart_disease', 'arthritis', 'chronic_pain'
  ];
  
  const healthCondition = faker.random.arrayElement(healthConditions);
  
  return {
    open_id: `wx_virtual_${faker.datatype.uuid()}`,
    nickname: age >= 70 ? `${lastName}${gender === '男' ? '大爷' : '奶奶'}` : `${lastName}${gender === '男' ? '叔叔' : '阿姨'}`,
    real_name: `${lastName}${faker.name.firstName()}`,
    phone: '1' + faker.datatype.number({min: 3000000000, max: 8999999999}).toString(),
    age: age,
    gender: gender,
    member_level: faker.random.arrayElement(['regular', 'vip']),
    status: 'active',
    health_condition: healthCondition,
    latitude: location.latitude,
    longitude: location.longitude,
    assignment_status: 'unassigned',
    created_at: faker.date.recent(30),
    updated_at: new Date()
  };
}

/**
 * 直接插入数据库
 */
async function insertUserToDatabase(userData) {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    const sql = `
      INSERT INTO users (
        open_id, nickname, real_name, phone, age, gender, 
        member_level, status, health_condition, latitude, longitude, 
        assignment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      userData.open_id, userData.nickname, userData.real_name, userData.phone,
      userData.age, userData.gender, userData.member_level, userData.status,
      userData.health_condition, userData.latitude, userData.longitude,
      userData.assignment_status, userData.created_at, userData.updated_at
    ];
    
    const [result] = await connection.execute(sql, values);
    
    return {
      success: true,
      userId: result.insertId,
      affectedRows: result.affectedRows
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 批量创建虚拟用户
 */
async function batchCreateUsers(count, options = {}) {
  const {
    useDatabase = config.generation.enableDatabaseInsert,
    batchSize = config.generation.batchSize
  } = options;
  
  console.log(`🚀 开始生成 ${count} 个虚拟用户...`);
  
  const results = {
    total: count,
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    const users = [];
    
    for (let j = 0; j < currentBatchSize; j++) {
      users.push(generateVirtualUser());
    }
    
    console.log(`📦 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(count/batchSize)}`);
    
    for (const user of users) {
      try {
        if (useDatabase) {
          const result = await insertUserToDatabase(user);
          if (result.success) {
            results.success++;
            console.log(`✅ ${user.nickname} 创建成功`);
          } else {
            results.failed++;
            results.errors.push(result.error);
            console.log(`❌ ${user.nickname} 创建失败`);
          }
        } else {
          results.success++;
          console.log(`✅ ${user.nickname} 生成成功（仅生成）`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
        console.log(`❌ ${user.nickname} 处理异常`);
      }
    }
    
    // 批次间延时
    if (i + batchSize < count) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`🎉 完成! 成功: ${results.success}, 失败: ${results.failed}`);
  return results;
}

/**
 * 清除虚拟用户
 */
async function clearVirtualUsers() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    const [result] = await connection.execute(
      "DELETE FROM users WHERE open_id LIKE 'wx_virtual_%'"
    );
    console.log(`🗑️ 已清除 ${result.affectedRows} 个虚拟用户`);
    return result.affectedRows;
  } catch (error) {
    console.error('清除虚拟用户失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  async function main() {
    try {
      switch (command) {
        case 'generate':
          const count = parseInt(args[1]) || 50;
          await batchCreateUsers(count);
          break;
          
        case 'clear':
          await clearVirtualUsers();
          break;
          
        case 'test':
          console.log('🧪 测试虚拟用户生成...');
          const testUser = generateVirtualUser();
          console.log('生成的用户:', testUser);
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node userGenerator.js generate [数量]');
          console.log('  node userGenerator.js clear');
          console.log('  node userGenerator.js test');
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = {
  generateVirtualUser,
  batchCreateUsers,
  clearVirtualUsers,
  insertUserToDatabase
};