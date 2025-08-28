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
  },
  generation: {
    batchSize: 10,
    enableDatabase: true
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
      streets: ['三里屯街道', '建国门外街道', '呼家楼街道', '八里庄街道', '双井街道', '团结湖街道']
    },
    { 
      name: '海淀区', 
      center: [39.9593, 116.2979],
      streets: ['中关村街道', '万寿路街道', '羊坊店街道', '甘家口街道', '学院路街道', '清河街道']
    },
    { 
      name: '西城区', 
      center: [39.9142, 116.3660],
      streets: ['西长安街街道', '新街口街道', '月坛街道', '德胜街道', '金融街街道', '什刹海街道']
    },
    { 
      name: '东城区', 
      center: [39.9180, 116.4175],
      streets: ['东华门街道', '景山街道', '交道口街道', '安定门街道', '北新桥街道', '东直门街道']
    },
    { 
      name: '丰台区', 
      center: [39.8585, 116.2867],
      streets: ['右安门街道', '太平桥街道', '西罗园街道', '大红门街道', '南苑街道', '方庄街道']
    },
    { 
      name: '石景山区', 
      center: [39.9056, 116.1958],
      streets: ['八宝山街道', '老山街道', '八角街道', '古城街道', '苹果园街道', '金顶街街道']
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
    address: `${district.name}${street}${faker.datatype.number({min: 1, max: 999})}号${faker.datatype.number({min: 1, max: 30})}单元${faker.datatype.number({min: 101, max: 2999})}室`,
    latitude: district.center[0] + offsetLat,
    longitude: district.center[1] + offsetLng
  };
}

/**
 * 生成中国常见姓氏
 */
function generateChineseName() {
  const familyNames = [
    '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
    '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
    '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'
  ];
  
  const givenNames = [
    '建华', '明', '敏', '静', '丽', '强', '磊', '军', '洋', '勇',
    '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平', '刚',
    '桂英', '伟', '芳', '秀兰', '国华', '华', '玉兰', '春', '金凤', '玉梅',
    '志强', '秀珍', '玉华', '桂花', '玉英', '玉珍', '建国', '丽娟', '丽华', '金花'
  ];
  
  const familyName = faker.random.arrayElement(familyNames);
  const givenName = faker.random.arrayElement(givenNames);
  
  return `${familyName}${givenName}`;
}

/**
 * 生成邮箱地址
 */
function generateEmail(realName) {
  const emailProviders = ['163.com', 'qq.com', '126.com', 'sina.com', 'gmail.com', 'hotmail.com'];
  const provider = faker.random.arrayElement(emailProviders);
  
  // 基于真实姓名生成邮箱前缀
  const namePrefix = realName.replace(/[^\w]/g, '').toLowerCase();
  const randomSuffix = faker.datatype.number({min: 100, max: 9999});
  
  return `${namePrefix}${randomSuffix}@${provider}`;
}

/**
 * 生成健康状况描述
 */
function generateHealthCondition() {
  const conditions = [
    { condition: 'healthy', description: '身体健康' },
    { condition: 'high_blood_pressure', description: '高血压' },
    { condition: 'diabetes', description: '糖尿病' },
    { condition: 'heart_disease', description: '心脏病' },
    { condition: 'arthritis', description: '关节炎' },
    { condition: 'chronic_pain', description: '慢性疼痛' },
    { condition: 'hypertension_diabetes', description: '高血压合并糖尿病' },
    { condition: 'osteoporosis', description: '骨质疏松' }
  ];
  
  return faker.random.arrayElement(conditions);
}

/**
 * 生成紧急联系人信息
 */
function generateEmergencyContact() {
  const relations = ['子女', '配偶', '兄弟姐妹', '亲属', '朋友', '邻居'];
  const relation = faker.random.arrayElement(relations);
  const contactName = generateChineseName();
  const contactPhone = '1' + faker.datatype.number({min: 3000000000, max: 8999999999}).toString();
  
  return {
    name: contactName,
    phone: contactPhone,
    relation: relation
  };
}

/**
 * 生成增强型用户基础数据
 */
function generateEnhancedUserData() {
  const age = faker.datatype.number({min: 60, max: 90});
  const gender = faker.random.arrayElement(['男', '女']);
  const realName = generateChineseName();
  const location = generateBeijingLocation();
  const health = generateHealthCondition();
  const emergency = generateEmergencyContact();
  
  // 计算生日
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const birthday = faker.date.between(`${birthYear}-01-01`, `${birthYear}-12-31`);
  
  return {
    // 基础信息
    open_id: `wx_test_${faker.datatype.uuid().replace(/-/g, '')}`,
    nickname: age >= 70 ? `${realName.charAt(0)}${gender === '男' ? '大爷' : '奶奶'}` : `${realName.charAt(0)}${gender === '男' ? '叔叔' : '阿姨'}`,
    real_name: realName,
    phone: '1' + faker.datatype.number({min: 3000000000, max: 8999999999}).toString(),
    email: generateEmail(realName),
    age: age,
    gender: gender,
    birthday: birthday.toISOString().split('T')[0],
    
    // 会员信息
    member_level: faker.random.arrayElement(['regular', 'vip']),
    status: 'active',
    
    // 位置信息
    latitude: location.latitude,
    longitude: location.longitude,
    
    // 健康信息
    health_condition: health.condition,
    
    // 系统字段
    assignment_status: 'unassigned',
    service_count: 0,
    total_spent: 0.00,
    created_at: new Date(),
    updated_at: new Date(),
    
    // 扩展信息（用于地址生成）
    _locationInfo: location
  };
}

/**
 * 插入用户到数据库
 */
async function insertUserToDatabase(userData, connection) {
  const sql = `
    INSERT INTO users (
      open_id, nickname, real_name, phone, email, age, gender, birthday,
      member_level, status, latitude, longitude, health_condition,
      assignment_status, service_count, total_spent, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    userData.open_id, userData.nickname, userData.real_name, userData.phone,
    userData.email, userData.age, userData.gender, userData.birthday,
    userData.member_level, userData.status, userData.latitude, userData.longitude,
    userData.health_condition, userData.assignment_status, userData.service_count,
    userData.total_spent, userData.created_at, userData.updated_at
  ];
  
  const [result] = await connection.execute(sql, values);
  return result;
}

/**
 * 增强型用户生成器类
 */
class EnhancedUserGenerator {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.connection = null;
  }
  
  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      this.connection = await mysql.createConnection(this.config.database);
      console.log('✅ 数据库连接成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      return false;
    }
  }
  
  /**
   * 清理资源
   */
  async cleanup() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
  
  /**
   * 生成单个增强型用户
   */
  async generateSingleUser() {
    const userData = generateEnhancedUserData();
    
    if (this.config.generation.enableDatabase && this.connection) {
      try {
        await insertUserToDatabase(userData, this.connection);
        console.log(`✅ ${userData.nickname}(${userData.real_name}) 创建成功`);
        return { success: true, userData };
      } catch (error) {
        console.log(`❌ ${userData.nickname}(${userData.real_name}) 创建失败: ${error.message}`);
        return { success: false, error: error.message, userData };
      }
    } else {
      console.log(`✅ ${userData.nickname}(${userData.real_name}) 生成成功（仅生成）`);
      return { success: true, userData };
    }
  }
  
  /**
   * 批量生成增强型用户
   */
  async batchGenerateUsers(count, options = {}) {
    const { progressCallback } = options;
    
    console.log(`🚀 开始生成 ${count} 个增强型用户...`);
    
    const results = {
      total: count,
      success: 0,
      failed: 0,
      errors: [],
      users: []
    };
    
    for (let i = 0; i < count; i++) {
      try {
        const result = await this.generateSingleUser();
        
        if (result.success) {
          results.success++;
          results.users.push(result.userData);
        } else {
          results.failed++;
          results.errors.push(result.error);
        }
        
        // 进度回调
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: count,
            success: results.success,
            failed: results.failed
          });
        }
        
        // 批次间延时，避免数据库压力过大
        if ((i + 1) % this.config.generation.batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
        console.log(`❌ 第 ${i + 1} 个用户生成异常: ${error.message}`);
      }
    }
    
    console.log(`🎉 完成! 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }
  
  /**
   * 清除测试用户
   */
  async clearTestUsers() {
    if (!this.connection) {
      throw new Error('数据库未连接');
    }
    
    try {
      // 按照外键约束顺序删除
      const tables = [
        'payment_records',
        'user_subscriptions', 
        'health_records',
        'user_addresses',
        'users'
      ];
      
      let totalDeleted = 0;
      
      for (const table of tables) {
        try {
          const [result] = await this.connection.execute(
            `DELETE FROM ${table} WHERE user_id LIKE 'wx_test_%' OR open_id LIKE 'wx_test_%'`
          );
          console.log(`🗑️ 清理 ${table} 表: ${result.affectedRows} 条记录`);
          totalDeleted += result.affectedRows;
        } catch (error) {
          // 某些表可能不存在 user_id 字段，忽略错误
          console.log(`⚠️ 清理 ${table} 表时跳过: ${error.message}`);
        }
      }
      
      console.log(`🎉 总共清理了 ${totalDeleted} 条测试数据`);
      return totalDeleted;
      
    } catch (error) {
      console.error('❌ 清理测试用户失败:', error.message);
      throw error;
    }
  }
}

// 工具函数导出
module.exports = {
  EnhancedUserGenerator,
  generateEnhancedUserData,
  generateBeijingLocation,
  generateChineseName,
  generateEmail,
  generateHealthCondition,
  generateEmergencyContact
};

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  async function main() {
    const generator = new EnhancedUserGenerator();
    
    try {
      await generator.initialize();
      
      switch (command) {
        case 'generate':
          const count = parseInt(args[1]) || 50;
          await generator.batchGenerateUsers(count, {
            progressCallback: (progress) => {
              if (progress.current % 10 === 0 || progress.current === progress.total) {
                console.log(`📊 进度: ${progress.current}/${progress.total} (成功: ${progress.success}, 失败: ${progress.failed})`);
              }
            }
          });
          break;
          
        case 'clear':
          await generator.clearTestUsers();
          break;
          
        case 'test':
          console.log('🧪 测试增强型用户生成...');
          const testUser = generateEnhancedUserData();
          console.log('生成的用户数据:', JSON.stringify(testUser, null, 2));
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node enhancedUserGenerator.js generate [数量]');
          console.log('  node enhancedUserGenerator.js clear');
          console.log('  node enhancedUserGenerator.js test');
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    } finally {
      await generator.cleanup();
    }
  }
  
  main();
}