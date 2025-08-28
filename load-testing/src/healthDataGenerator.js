const faker = require('faker');

// 设置中文语言
faker.locale = 'zh_CN';

/**
 * 健康指标类型定义
 */
const HEALTH_METRICS = {
  bloodPressure: {
    name: '血压',
    unit: 'mmHg',
    normal: { min: 90, max: 140, systolic: { min: 90, max: 140 }, diastolic: { min: 60, max: 90 } },
    warning: { min: 140, max: 160, systolic: { min: 140, max: 160 }, diastolic: { min: 90, max: 100 } },
    danger: { min: 160, max: 200, systolic: { min: 160, max: 200 }, diastolic: { min: 100, max: 120 } },
    format: 'systolic/diastolic'
  },
  bloodSugar: {
    name: '血糖',
    unit: 'mmol/L',
    normal: { min: 4.0, max: 6.1 },
    warning: { min: 6.1, max: 7.0 },
    danger: { min: 7.0, max: 15.0 },
    format: 'decimal'
  },
  heartRate: {
    name: '心率',
    unit: 'bpm',
    normal: { min: 60, max: 100 },
    warning: { min: 50, max: 120 },
    danger: { min: 40, max: 150 },
    format: 'integer'
  },
  weight: {
    name: '体重',
    unit: 'kg',
    normal: { min: 45, max: 80 },
    warning: { min: 35, max: 100 },
    danger: { min: 30, max: 120 },
    format: 'decimal'
  },
  temperature: {
    name: '体温',
    unit: '°C',
    normal: { min: 36.0, max: 37.3 },
    warning: { min: 37.3, max: 38.5 },
    danger: { min: 38.5, max: 42.0 },
    format: 'decimal'
  },
  oxygenSaturation: {
    name: '血氧饱和度',
    unit: '%',
    normal: { min: 95, max: 100 },
    warning: { min: 90, max: 95 },
    danger: { min: 70, max: 90 },
    format: 'integer'
  },
  cholesterol: {
    name: '胆固醇',
    unit: 'mmol/L',
    normal: { min: 3.0, max: 5.2 },
    warning: { min: 5.2, max: 6.2 },
    danger: { min: 6.2, max: 10.0 },
    format: 'decimal'
  }
};

/**
 * 状态分布概率（基于健康状况）
 */
const STATUS_DISTRIBUTION = {
  healthy: {
    normal: 0.85,
    warning: 0.12,
    danger: 0.03
  },
  high_blood_pressure: {
    normal: 0.60,
    warning: 0.30,
    danger: 0.10
  },
  diabetes: {
    normal: 0.65,
    warning: 0.25,
    danger: 0.10
  },
  heart_disease: {
    normal: 0.55,
    warning: 0.35,
    danger: 0.10
  },
  arthritis: {
    normal: 0.75,
    warning: 0.20,
    danger: 0.05
  },
  chronic_pain: {
    normal: 0.70,
    warning: 0.25,
    danger: 0.05
  }
};

/**
 * 监测频率配置（基于健康状况和指标类型）
 */
const MONITORING_FREQUENCY = {
  healthy: {
    bloodPressure: 0.3,
    bloodSugar: 0.2,
    heartRate: 0.4,
    weight: 0.6,
    temperature: 0.8,
    oxygenSaturation: 0.1,
    cholesterol: 0.1
  },
  high_blood_pressure: {
    bloodPressure: 0.9,
    bloodSugar: 0.3,
    heartRate: 0.6,
    weight: 0.7,
    temperature: 0.5,
    oxygenSaturation: 0.2,
    cholesterol: 0.4
  },
  diabetes: {
    bloodPressure: 0.6,
    bloodSugar: 0.9,
    heartRate: 0.4,
    weight: 0.8,
    temperature: 0.5,
    oxygenSaturation: 0.2,
    cholesterol: 0.6
  },
  heart_disease: {
    bloodPressure: 0.8,
    bloodSugar: 0.4,
    heartRate: 0.9,
    weight: 0.6,
    temperature: 0.5,
    oxygenSaturation: 0.7,
    cholesterol: 0.5
  }
};

/**
 * 基于概率分布选择健康状态
 */
function selectHealthStatus(healthCondition, metricType) {
  const distribution = STATUS_DISTRIBUTION[healthCondition] || STATUS_DISTRIBUTION.healthy;
  const random = Math.random();
  let cumulative = 0;
  
  for (const [status, probability] of Object.entries(distribution)) {
    cumulative += probability;
    if (random <= cumulative) {
      return status;
    }
  }
  
  return 'normal';
}

/**
 * 生成指定类型的健康数值
 */
function generateHealthValue(metricType, status) {
  const metric = HEALTH_METRICS[metricType];
  if (!metric) return null;
  
  const range = metric[status] || metric.normal;
  
  switch (metric.format) {
    case 'systolic/diastolic':
      // 血压格式：收缩压/舒张压
      const systolic = faker.datatype.number({ 
        min: Math.round(range.systolic.min), 
        max: Math.round(range.systolic.max) 
      });
      const diastolic = faker.datatype.number({ 
        min: Math.round(range.diastolic.min), 
        max: Math.round(range.diastolic.max) 
      });
      return `${systolic}/${diastolic}`;
      
    case 'decimal':
      // 小数格式
      const decimalValue = faker.datatype.number({ 
        min: range.min * 100, 
        max: range.max * 100 
      }) / 100;
      return parseFloat(decimalValue.toFixed(1));
      
    case 'integer':
      // 整数格式
      return faker.datatype.number({ 
        min: Math.round(range.min), 
        max: Math.round(range.max) 
      });
      
    default:
      return faker.datatype.number({ 
        min: Math.round(range.min), 
        max: Math.round(range.max) 
      });
  }
}

/**
 * 生成健康记录备注
 */
function generateHealthNotes(metricType, status, value) {
  const notes = {
    bloodPressure: {
      normal: ['血压正常', '状态良好', '继续保持'],
      warning: ['血压偏高，注意休息', '建议减少盐分摄入', '注意监测血压变化'],
      danger: ['血压过高，请及时就医', '需要药物治疗', '立即联系医生']
    },
    bloodSugar: {
      normal: ['血糖正常', '控制良好', '继续坚持'],
      warning: ['血糖偏高，注意饮食', '餐后血糖偏高', '建议控制碳水化合物'],
      danger: ['血糖过高，立即处理', '需要调整药物', '紧急就医']
    },
    heartRate: {
      normal: ['心率正常', '心跳规律', '状态良好'],
      warning: ['心率异常，注意观察', '轻度心率不齐', '建议多休息'],
      danger: ['心率严重异常', '立即就医', '可能需要急救']
    },
    weight: {
      normal: ['体重正常', '保持当前状态', '健康体重'],
      warning: ['体重偏高/偏低', '注意饮食调节', '适当运动'],
      danger: ['体重严重超标/过轻', '需要专业指导', '立即就医']
    },
    temperature: {
      normal: ['体温正常', '无发热', '状态良好'],
      warning: ['轻度发热', '注意休息多喝水', '继续观察'],
      danger: ['高热，立即就医', '需要紧急处理', '可能需要住院']
    }
  };
  
  const statusNotes = notes[metricType]?.[status] || ['数值记录', '请咨询医生'];
  return faker.random.arrayElement(statusNotes);
}

/**
 * 生成单个健康记录
 */
function generateHealthRecord(userId, metricType, userHealthCondition = 'healthy', recordTime = null) {
  const status = selectHealthStatus(userHealthCondition, metricType);
  const value = generateHealthValue(metricType, status);
  const metric = HEALTH_METRICS[metricType];
  const notes = generateHealthNotes(metricType, status, value);
  
  const baseTime = recordTime || faker.date.recent(90);
  
  return {
    id: `health_${faker.datatype.uuid().replace(/-/g, '')}`,
    user_id: userId,
    type: metricType,
    value: value.toString(),
    unit: metric.unit,
    status: status,
    notes: notes,
    record_time: baseTime,
    created_at: baseTime,
    updated_at: new Date(),
    
    // 扩展信息（用于显示和分析）
    _metricInfo: {
      name: metric.name,
      format: metric.format,
      userCondition: userHealthCondition
    }
  };
}

/**
 * 为用户生成健康记录历史
 */
function generateUserHealthHistory(userId, userHealthCondition = 'healthy', options = {}) {
  const {
    daysBack = 90,
    minRecordsPerDay = 0,
    maxRecordsPerDay = 3
  } = options;
  
  const records = [];
  const frequency = MONITORING_FREQUENCY[userHealthCondition] || MONITORING_FREQUENCY.healthy;
  
  // 生成过去N天的记录
  for (let day = 0; day < daysBack; day++) {
    const recordDate = new Date();
    recordDate.setDate(recordDate.getDate() - day);
    
    // 每天可能记录多个指标
    const todayRecordCount = faker.datatype.number({ min: minRecordsPerDay, max: maxRecordsPerDay });
    const todayMetrics = [];
    
    for (let recordIndex = 0; recordIndex < todayRecordCount; recordIndex++) {
      // 基于健康状况和监测频率选择指标类型
      const availableMetrics = Object.keys(frequency).filter(metric => {
        const shouldMonitor = Math.random() < frequency[metric];
        const notAlreadyRecorded = !todayMetrics.includes(metric);
        return shouldMonitor && notAlreadyRecorded;
      });
      
      if (availableMetrics.length === 0) continue;
      
      const metricType = faker.random.arrayElement(availableMetrics);
      todayMetrics.push(metricType);
      
      // 为这个指标生成记录时间（在当天的不同时间点）
      const recordTime = new Date(recordDate);
      recordTime.setHours(
        faker.datatype.number({ min: 6, max: 22 }),
        faker.datatype.number({ min: 0, max: 59 }),
        0, 0
      );
      
      const record = generateHealthRecord(userId, metricType, userHealthCondition, recordTime);
      records.push(record);
    }
  }
  
  // 按时间排序（最新的在前）
  records.sort((a, b) => new Date(b.record_time) - new Date(a.record_time));
  
  return records;
}

/**
 * 插入健康记录到数据库
 */
async function insertHealthRecordToDatabase(recordData, connection) {
  const sql = `
    INSERT INTO health_records (
      id, user_id, type, value, unit, status, notes,
      record_time, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    recordData.id,
    recordData.user_id,
    recordData.type,
    recordData.value,
    recordData.unit,
    recordData.status,
    recordData.notes,
    recordData.record_time,
    recordData.created_at,
    recordData.updated_at
  ];
  
  const [result] = await connection.execute(sql, values);
  return result;
}

/**
 * 健康数据生成器类
 */
class HealthDataGenerator {
  constructor(connection = null) {
    this.connection = connection;
  }
  
  /**
   * 为单个用户生成健康数据
   */
  async generateForUser(userId, userHealthCondition = 'healthy', options = {}) {
    const { enableDatabase = true } = options;
    
    try {
      const records = generateUserHealthHistory(userId, userHealthCondition, options);
      const results = [];
      
      for (const record of records) {
        if (enableDatabase && this.connection) {
          try {
            await insertHealthRecordToDatabase(record, this.connection);
            console.log(`  💊 健康记录创建成功: ${record._metricInfo.name} - ${record.value}${record.unit} (${record.status})`);
            results.push({ success: true, record });
          } catch (error) {
            console.log(`  ❌ 健康记录创建失败: ${error.message}`);
            results.push({ success: false, error: error.message, record });
          }
        } else {
          console.log(`  💊 健康记录生成成功: ${record._metricInfo.name} - ${record.value}${record.unit} (${record.status})`);
          results.push({ success: true, record });
        }
      }
      
      return results;
      
    } catch (error) {
      console.log(`  ❌ 用户健康数据生成失败: ${error.message}`);
      return [{ success: false, error: error.message }];
    }
  }
  
  /**
   * 批量为用户生成健康数据
   */
  async batchGenerateForUsers(userData, options = {}) {
    const { progressCallback } = options;
    
    console.log(`💊 开始为 ${userData.length} 个用户生成健康数据...`);
    
    const results = {
      total: userData.length,
      success: 0,
      failed: 0,
      records: []
    };
    
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      const userId = user.userId || user.open_id || user.id;
      const healthCondition = user.health_condition || user.healthCondition || 'healthy';
      
      try {
        const userResults = await this.generateForUser(userId, healthCondition, options);
        
        for (const result of userResults) {
          if (result.success) {
            results.success++;
            results.records.push(result.record);
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
        console.log(`❌ 用户 ${userId} 健康数据生成异常: ${error.message}`);
      }
    }
    
    console.log(`🎉 健康数据生成完成! 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }
  
  /**
   * 获取健康数据统计信息
   */
  getHealthStats(records) {
    const stats = {
      total: records.length,
      byType: {},
      byStatus: {},
      byCondition: {},
      dateRange: {
        earliest: null,
        latest: null
      }
    };
    
    records.forEach(record => {
      // 按类型统计
      stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
      
      // 按状态统计
      stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
      
      // 按健康状况统计
      const condition = record._metricInfo?.userCondition || 'unknown';
      stats.byCondition[condition] = (stats.byCondition[condition] || 0) + 1;
      
      // 日期范围统计
      const recordDate = new Date(record.record_time);
      if (!stats.dateRange.earliest || recordDate < stats.dateRange.earliest) {
        stats.dateRange.earliest = recordDate;
      }
      if (!stats.dateRange.latest || recordDate > stats.dateRange.latest) {
        stats.dateRange.latest = recordDate;
      }
    });
    
    return stats;
  }
}

module.exports = {
  HealthDataGenerator,
  generateHealthRecord,
  generateUserHealthHistory,
  insertHealthRecordToDatabase,
  generateHealthValue,
  selectHealthStatus,
  HEALTH_METRICS,
  STATUS_DISTRIBUTION,
  MONITORING_FREQUENCY
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
      const generator = new HealthDataGenerator(connection);
      
      switch (command) {
        case 'test':
          console.log('🧪 测试健康数据生成...');
          const testUserId = 'wx_test_user_123';
          const testHealthCondition = 'high_blood_pressure';
          const testRecords = generateUserHealthHistory(testUserId, testHealthCondition, { daysBack: 7 });
          console.log('生成的健康数据:', JSON.stringify(testRecords.slice(0, 3), null, 2));
          console.log(`总共生成 ${testRecords.length} 条记录`);
          break;
          
        case 'generate':
          const userId = args[1];
          const healthCondition = args[2] || 'healthy';
          if (!userId) {
            console.log('❌ 请提供用户ID');
            break;
          }
          await generator.generateForUser(userId, healthCondition, { enableDatabase: true });
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node healthDataGenerator.js test');
          console.log('  node healthDataGenerator.js generate <用户ID> [健康状况]');
          console.log('  健康状况选项: healthy, high_blood_pressure, diabetes, heart_disease, arthritis, chronic_pain');
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