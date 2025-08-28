const mysql = require('mysql2/promise');
const faker = require('faker');

// 数据库配置 - 使用项目的实际配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db',
  charset: 'utf8mb4'
};

console.log('🩺 最终健康数据修复工具');
console.log('========================================');

async function generateHealthRecords() {
  let connection;
  
  try {
    // 连接数据库
    console.log('🔌 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 获取所有用户
    console.log('\n👥 获取用户列表...');
    const [users] = await connection.execute('SELECT id, nickname, real_name FROM users LIMIT 50');
    console.log(`📊 找到 ${users.length} 个用户`);

    if (users.length === 0) {
      console.log('❌ 没有找到用户，请先创建用户');
      return;
    }

    // 清除现有健康记录
    console.log('\n🗑️ 清除现有健康记录...');
    const [deleteResult] = await connection.execute('DELETE FROM health_records');
    console.log(`✅ 已清除 ${deleteResult.affectedRows} 条旧记录`);

    // 为每个用户生成健康记录
    console.log('\n🩺 开始生成健康记录...');
    let totalRecords = 0;

    for (const user of users) {
      const userId = user.id; // 使用实际的用户ID
      const userName = user.nickname || user.real_name || `用户${user.id}`;
      
      console.log(`\n👤 为用户 ${userName} (ID: ${userId}) 生成健康记录...`);

      // 生成血压记录
      const bloodPressureRecords = generateBloodPressureData(userId);
      for (const record of bloodPressureRecords) {
        await insertHealthRecord(connection, record);
        totalRecords++;
      }
      console.log(`   🩸 生成 ${bloodPressureRecords.length} 条血压记录`);

      // 生成血糖记录
      const bloodSugarRecords = generateBloodSugarData(userId);
      for (const record of bloodSugarRecords) {
        await insertHealthRecord(connection, record);
        totalRecords++;
      }
      console.log(`   🍯 生成 ${bloodSugarRecords.length} 条血糖记录`);

      // 生成心率记录
      const heartRateRecords = generateHeartRateData(userId);
      for (const record of heartRateRecords) {
        await insertHealthRecord(connection, record);
        totalRecords++;
      }
      console.log(`   ❤️ 生成 ${heartRateRecords.length} 条心率记录`);

      // 生成体重记录
      const weightRecords = generateWeightData(userId);
      for (const record of weightRecords) {
        await insertHealthRecord(connection, record);
        totalRecords++;
      }
      console.log(`   ⚖️ 生成 ${weightRecords.length} 条体重记录`);
    }

    console.log('\n🎉 健康记录生成完成！');
    console.log(`📊 总计生成 ${totalRecords} 条健康记录`);
    console.log(`👥 覆盖 ${users.length} 个用户`);

    // 验证生成结果
    console.log('\n🔍 验证生成结果...');
    const [healthCheck] = await connection.execute(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM health_records 
      GROUP BY type
    `);

    console.log('\n📈 生成统计:');
    healthCheck.forEach(row => {
      console.log(`   ${getHealthTypeIcon(row.type)} ${row.type}: ${row.count} 条记录，${row.unique_users} 个用户`);
    });

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 生成血压数据
function generateBloodPressureData(userId) {
  const records = [];
  const recordCount = Math.floor(Math.random() * 4) + 2; // 2-5条记录

  for (let i = 0; i < recordCount; i++) {
    const systolic = Math.floor(Math.random() * 40) + 110; // 110-150
    const diastolic = Math.floor(Math.random() * 30) + 70; // 70-100
    
    records.push({
      id: `health_${faker.datatype.uuid()}`,
      user_id: userId,
      type: 'bloodPressure',
      value: `${systolic}/${diastolic}`, // 使用与前端一致的格式
      unit: 'mmHg',
      record_time: getRandomDate(),
      source: 'quick_record',
      notes: '快速记录',
      create_time: new Date()
    });
  }

  return records;
}

// 生成血糖数据
function generateBloodSugarData(userId) {
  const records = [];
  const recordCount = Math.floor(Math.random() * 4) + 2; // 2-5条记录

  for (let i = 0; i < recordCount; i++) {
    const value = (Math.random() * 3 + 4.5).toFixed(1); // 4.5-7.5
    
    records.push({
      id: `health_${faker.datatype.uuid()}`,
      user_id: userId,
      type: 'bloodSugar',
      value: value,
      unit: 'mmol/L',
      record_time: getRandomDate(),
      source: 'quick_record',
      notes: '快速记录',
      create_time: new Date()
    });
  }

  return records;
}

// 生成心率数据
function generateHeartRateData(userId) {
  const records = [];
  const recordCount = Math.floor(Math.random() * 4) + 2; // 2-5条记录

  for (let i = 0; i < recordCount; i++) {
    const value = Math.floor(Math.random() * 40) + 60; // 60-100
    
    records.push({
      id: `health_${faker.datatype.uuid()}`,
      user_id: userId,
      type: 'heartRate',
      value: value.toString(),
      unit: '次/分',
      record_time: getRandomDate(),
      source: 'quick_record',
      notes: '快速记录',
      create_time: new Date()
    });
  }

  return records;
}

// 生成体重数据
function generateWeightData(userId) {
  const records = [];
  const recordCount = Math.floor(Math.random() * 3) + 1; // 1-3条记录

  for (let i = 0; i < recordCount; i++) {
    const value = (Math.random() * 40 + 50).toFixed(1); // 50-90 kg
    
    records.push({
      id: `health_${faker.datatype.uuid()}`,
      user_id: userId,
      type: 'weight',
      value: value,
      unit: 'kg',
      record_time: getRandomDate(),
      source: 'quick_record',
      notes: '快速记录',
      create_time: new Date()
    });
  }

  return records;
}

// 插入健康记录
async function insertHealthRecord(connection, record) {
  const sql = `
    INSERT INTO health_records (
      id, user_id, type, value, unit, record_time,
      source, notes, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    record.id, record.user_id, record.type, record.value,
    record.unit, record.record_time, record.source,
    record.notes, record.create_time
  ];
  
  await connection.execute(sql, values);
}

// 获取随机日期（最近30天内）
function getRandomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const randomDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return randomDate;
}

// 获取健康类型图标
function getHealthTypeIcon(type) {
  const icons = {
    'bloodPressure': '🩸',
    'bloodSugar': '🍯', 
    'heartRate': '❤️',
    'weight': '⚖️'
  };
  return icons[type] || '📊';
}

// 运行生成器
generateHealthRecords()
  .then(() => {
    console.log('\n========================================');
    console.log('🎯 健康数据修复完成！');
    console.log('========================================');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });