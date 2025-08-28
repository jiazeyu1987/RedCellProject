const faker = require('faker');
const mysql = require('mysql2/promise');

// 设置中文语言
faker.locale = 'zh_CN';

// 配置信息
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'abcd1234!',
    database: process.env.DB_DATABASE || 'health_guard_db'
  }
};

/**
 * 生成健康记录
 */
function generateHealthRecord(userId, type, daysAgo = 0) {
  const recordId = `health_${faker.datatype.uuid()}`;
  // 根据daysAgo生成历史记录时间
  const recordTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000);
  
  let value;
  let unit;
  let status = 'normal'; // 默认状态
  
  switch (type) {
    case 'bloodPressure':
      // 生成血压数据 (收缩压: 90-180, 舒张压: 60-120)
      const systolic = faker.datatype.number({min: 90, max: 180});
      const diastolic = faker.datatype.number({min: 60, max: 120});
      value = `${systolic}/${diastolic}`; // 直接存储为字符串格式，与前端显示一致
      unit = 'mmHg';
      
      // 判断血压状态
      if (systolic >= 140 || diastolic >= 90) {
        status = 'warning';
      } else if (systolic <= 90 || diastolic <= 60) {
        status = 'low';
      }
      break;
      
    case 'bloodSugar':
      // 生成血糖数据 (3.0-12.0 mmol/L)
      const glucose = (3.0 + Math.random() * 9.0);
      value = parseFloat(glucose.toFixed(1)).toString();
      unit = 'mmol/L';
      
      // 判断血糖状态
      if (glucose >= 7.0) {
        status = 'warning';
      } else if (glucose <= 3.9) {
        status = 'low';
      }
      break;
      
    case 'heartRate':
      // 生成心率数据 (50-120 bpm)
      const bpm = faker.datatype.number({min: 50, max: 120});
      value = bpm.toString();
      unit = '次/分';
      
      // 判断心率状态
      if (bpm > 100 || bpm < 60) {
        status = 'warning';
      }
      break;
      
    case 'weight':
      // 生成体重数据 (40-100 kg)
      const weight = (40 + Math.random() * 60);
      value = parseFloat(weight.toFixed(1)).toString();
      unit = 'kg';
      break;
      
    case 'temperature':
      // 生成体温数据 (35.5-39.5 °C)
      const temp = (35.5 + Math.random() * 4.0);
      value = parseFloat(temp.toFixed(1)).toString();
      unit = '°C';
      
      // 判断体温状态
      if (temp >= 37.5) {
        status = 'warning';
      } else if (temp <= 36.0) {
        status = 'low';
      }
      break;
      
    default:
      value = faker.datatype.number({min: 1, max: 100}).toString();
      unit = 'unit';
  }
  
  // 生成合适的备注信息
  const generateNotes = (type, status) => {
    const normalNotes = ['测量正常', '数据稳定', '情况良好', '日常监测'];
    const warningNotes = ['略有偏高，需要关注', '建议复查', '请注意观察', '需要调整生活习惯'];
    const lowNotes = ['偏低，请注意', '建议加强营养', '需要医生指导', '请关注身体状况'];
    
    let notePool;
    switch (status) {
      case 'warning':
        notePool = warningNotes;
        break;
      case 'low':
        notePool = lowNotes;
        break;
      default:
        notePool = normalNotes;
    }
    
    return Math.random() < 0.7 ? faker.random.arrayElement(notePool) : null;
  };
  
  return {
    id: recordId,
    user_id: userId,
    type: type,
    value: value, // 直接存储处理后的值
    unit: unit,
    record_time: recordTime,
    source: faker.random.arrayElement(['self', 'nurse', 'device', 'doctor']),
    notes: generateNotes(type, status),
    create_time: recordTime
  };
}

/**
 * 插入健康记录
 */
async function insertHealthRecord(connection, healthData) {
  const sql = `
    INSERT INTO health_records (
      id, user_id, type, value, unit, record_time,
      source, notes, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    healthData.id, healthData.user_id, healthData.type, healthData.value,
    healthData.unit, healthData.record_time, healthData.source,
    healthData.notes, healthData.create_time
  ];
  
  const [result] = await connection.execute(sql, values);
  
  return {
    success: true,
    healthRecordId: healthData.id,
    affectedRows: result.affectedRows
  };
}

/**
 * 获取所有用户
 */
async function getAllUsers(connection) {
  const sql = 'SELECT id, open_id, nickname FROM users WHERE status = "active"';
  const [rows] = await connection.execute(sql);
  return rows;
}

/**
 * 检查用户是否已有健康记录
 */
async function getUserHealthRecordCounts(connection, userId) {
  const sql = `
    SELECT type, COUNT(*) as count 
    FROM health_records 
    WHERE user_id = ? 
    GROUP BY type
  `;
  const [rows] = await connection.execute(sql, [userId]);
  
  const counts = {};
  rows.forEach(row => {
    counts[row.type] = row.count;
  });
  
  return counts;
}

/**
 * 为用户添加健康记录
 */
async function addHealthRecordsForUser(connection, user) {
  console.log(`🔍 处理用户: ${user.nickname} (ID: ${user.id})`);
  
  // 使用实际存在的用户ID - 优先使用open_id，如果为空则使用id
  const userId = user.open_id || user.id;
  const existingCounts = await getUserHealthRecordCounts(connection, userId);
  
  const healthTypes = ['bloodPressure', 'bloodSugar', 'heartRate', 'weight'];
  let recordsAdded = 0;
  
  for (const healthType of healthTypes) {
    const existingCount = existingCounts[healthType] || 0;
    
    if (existingCount === 0) {
      // 如果没有记录，生成3-5条历史记录
      const recordCount = faker.datatype.number({min: 3, max: 5});
      
      for (let i = 0; i < recordCount; i++) {
        try {
          // 生成30天内不同时间的记录
          const daysAgo = faker.datatype.number({min: 0, max: 30});
          const healthRecord = generateHealthRecord(userId, healthType, daysAgo);
          await insertHealthRecord(connection, healthRecord);
          recordsAdded++;
        } catch (error) {
          console.log(`⚠️ ${user.nickname} 健康记录(${healthType})创建失败:`, error.message);
        }
      }
    } else if (existingCount < 3) {
      // 如果记录少于3条，补充到3条
      const needToAdd = 3 - existingCount;
      
      for (let i = 0; i < needToAdd; i++) {
        try {
          const daysAgo = faker.datatype.number({min: 0, max: 15});
          const healthRecord = generateHealthRecord(userId, healthType, daysAgo);
          await insertHealthRecord(connection, healthRecord);
          recordsAdded++;
        } catch (error) {
          console.log(`⚠️ ${user.nickname} 健康记录(${healthType})补充失败:`, error.message);
        }
      }
    }
  }
  
  if (recordsAdded > 0) {
    console.log(`✅ ${user.nickname} 新增了 ${recordsAdded} 条健康记录`);
  } else {
    console.log(`📊 ${user.nickname} 健康记录已充足，无需添加`);
  }
  
  return recordsAdded;
}

/**
 * 为所有用户添加健康数据
 */
async function addHealthDataForAllUsers() {
  let connection;
  try {
    console.log('🚀 开始为所有用户添加健康数据...');
    connection = await mysql.createConnection(config.database);
    
    // 获取所有活跃用户
    const users = await getAllUsers(connection);
    console.log(`📋 找到 ${users.length} 个活跃用户`);
    
    if (users.length === 0) {
      console.log('❌ 没有找到任何用户，请先生成用户数据');
      return;
    }
    
    let totalRecordsAdded = 0;
    let processedUsers = 0;
    
    for (const user of users) {
      try {
        const recordsAdded = await addHealthRecordsForUser(connection, user);
        totalRecordsAdded += recordsAdded;
        processedUsers++;
        
        // 每处理10个用户后稍微延时
        if (processedUsers % 10 === 0) {
          console.log(`⏳ 已处理 ${processedUsers}/${users.length} 个用户...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ 处理用户 ${user.nickname} 时出错:`, error.message);
      }
    }
    
    console.log('🎉 健康数据添加完成！');
    console.log(`📊 统计信息:`);
    console.log(`   - 处理用户数: ${processedUsers}`);
    console.log(`   - 新增健康记录: ${totalRecordsAdded} 条`);
    console.log(`   - 平均每用户: ${(totalRecordsAdded / processedUsers).toFixed(1)} 条`);
    
  } catch (error) {
    console.error('❌ 添加健康数据失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 清理所有健康记录（测试用）
 */
async function clearAllHealthRecords() {
  let connection;
  try {
    console.log('🗑️ 开始清理所有健康记录...');
    connection = await mysql.createConnection(config.database);
    
    const [result] = await connection.execute('DELETE FROM health_records');
    console.log(`✅ 已清理 ${result.affectedRows} 条健康记录`);
    
  } catch (error) {
    console.error('❌ 清理健康记录失败:', error.message);
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
  const command = args[0] || 'add';
  
  async function main() {
    try {
      switch (command) {
        case 'add':
          await addHealthDataForAllUsers();
          break;
          
        case 'clear':
          await clearAllHealthRecords();
          break;
          
        case 'test':
          console.log('🧪 测试健康记录生成...');
          const testRecord = generateHealthRecord('test_user_123', 'bloodPressure');
          console.log('生成的健康记录:', testRecord);
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node add-health-data.js add    # 为所有用户添加健康数据');
          console.log('  node add-health-data.js clear  # 清理所有健康记录');
          console.log('  node add-health-data.js test   # 测试健康记录生成');
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = {
  generateHealthRecord,
  addHealthDataForAllUsers,
  clearAllHealthRecords
};