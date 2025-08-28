const faker = require('faker');

// 设置中文语言
faker.locale = 'zh_CN';

/**
 * 北京市区县和街道数据
 */
const BEIJING_DISTRICTS = {
  '朝阳区': {
    center: [39.9204, 116.4490],
    streets: [
      '三里屯街道', '建国门外街道', '呼家楼街道', '八里庄街道', 
      '双井街道', '团结湖街道', '六里屯街道', '麦子店街道',
      '香河园街道', '左家庄街道', '机场街道', '大屯街道'
    ],
    landmarks: [
      '国贸中心', '三里屯太古里', '朝阳公园', '奥林匹克公园',
      '燕莎商城', '蓝色港湾', 'CBD商务区', '望京SOHO'
    ]
  },
  '海淀区': {
    center: [39.9593, 116.2979],
    streets: [
      '中关村街道', '万寿路街道', '羊坊店街道', '甘家口街道',
      '学院路街道', '清河街道', '青龙桥街道', '香山街道'
    ],
    landmarks: [
      '中关村科技园', '清华大学', '北京大学', '颐和园',
      '圆明园', '香山公园', '西山森林公园', '北京理工大学'
    ]
  },
  '西城区': {
    center: [39.9142, 116.3660],
    streets: [
      '西长安街街道', '新街口街道', '月坛街道', '德胜街道',
      '金融街街道', '什刹海街道', '展览路街道', '牛街街道'
    ],
    landmarks: [
      '天安门广场', '故宫博物院', '北海公园', '什刹海',
      '金融街', '西单商业街', '白云观', '恭王府'
    ]
  },
  '东城区': {
    center: [39.9180, 116.4175],
    streets: [
      '东华门街道', '景山街道', '交道口街道', '安定门街道',
      '北新桥街道', '东直门街道', '朝阳门街道', '建国门街道'
    ],
    landmarks: [
      '天坛公园', '雍和宫', '孔庙和国子监', '王府井大街',
      '东单体育中心', '隆福寺', '簋街', '南锣鼓巷'
    ]
  },
  '丰台区': {
    center: [39.8585, 116.2867],
    streets: [
      '右安门街道', '太平桥街道', '西罗园街道', '大红门街道',
      '南苑街道', '方庄街道', '马家堡街道', '和义街道'
    ],
    landmarks: [
      '北京西站', '天坛医院', '方庄购物中心', '丰台体育中心',
      '世界公园', '北宫森林公园', '卢沟桥', '宛平城'
    ]
  },
  '石景山区': {
    center: [39.9056, 116.1958],
    streets: [
      '八宝山街道', '老山街道', '八角街道', '古城街道',
      '苹果园街道', '金顶街街道', '广宁街道', '五里坨街道'
    ],
    landmarks: [
      '八大处公园', '石景山游乐园', '首钢园区', '法海寺',
      '模式口历史文化街区', '永定河', '西山国家森林公园'
    ]
  }
};

/**
 * 住宅小区类型和特征
 */
const RESIDENTIAL_TYPES = {
  '高档社区': {
    buildingNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    unitNumbers: [1, 2, 3, 4, 5, 6],
    roomNumbers: [101, 102, 201, 202, 301, 302, 401, 402, 501, 502, 601, 602],
    names: ['花园', '公馆', '府邸', '华庭', '雅苑', '豪庭', '尊邸', '名苑']
  },
  '普通住宅': {
    buildingNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    unitNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    roomNumbers: [101, 102, 103, 201, 202, 203, 301, 302, 303, 401, 402, 403, 501, 502, 503, 601, 602, 603],
    names: ['小区', '家园', '苑', '居', '庭', '园', '里', '坊']
  },
  '老式居民楼': {
    buildingNumbers: [1, 2, 3, 4, 5, 6],
    unitNumbers: [1, 2, 3, 4],
    roomNumbers: [101, 102, 201, 202, 301, 302, 401, 402],
    names: ['胡同', '里', '院', '街', '巷', '弄']
  }
};

/**
 * 联系人关系类型
 */
const CONTACT_RELATIONS = {
  'self': { name: '本人', probability: 0.70 },
  'spouse': { name: '配偶', probability: 0.15 },
  'child': { name: '子女', probability: 0.10 },
  'parent': { name: '父母', probability: 0.03 },
  'relative': { name: '亲属', probability: 0.02 }
};

/**
 * 基于概率选择联系人关系
 */
function selectContactRelation() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [relation, config] of Object.entries(CONTACT_RELATIONS)) {
    cumulative += config.probability;
    if (random <= cumulative) {
      return relation;
    }
  }
  
  return 'self';
}

/**
 * 生成中国常见姓名
 */
function generateChineseName(gender = null) {
  const familyNames = [
    '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'
  ];
  
  const maleNames = [
    '建华', '明', '强', '磊', '军', '洋', '勇', '杰', '涛', '超',
    '志强', '国华', '华', '伟', '刚', '建国', '志明', '文华'
  ];
  
  const femaleNames = [
    '敏', '静', '丽', '艳', '娟', '芳', '秀英', '霞', '平', '桂英',
    '秀兰', '玉兰', '春', '金凤', '玉梅', '秀珍', '玉华', '桂花'
  ];
  
  const familyName = faker.random.arrayElement(familyNames);
  let givenName;
  
  if (gender === '男') {
    givenName = faker.random.arrayElement(maleNames);
  } else if (gender === '女') {
    givenName = faker.random.arrayElement(femaleNames);
  } else {
    givenName = faker.random.arrayElement([...maleNames, ...femaleNames]);
  }
  
  return `${familyName}${givenName}`;
}

/**
 * 生成地址详细信息
 */
function generateDetailedAddress(district, street) {
  const districtData = BEIJING_DISTRICTS[district];
  const residentialType = faker.random.arrayElement(['高档社区', '普通住宅', '老式居民楼']);
  const typeConfig = RESIDENTIAL_TYPES[residentialType];
  
  // 生成小区/建筑群名称
  const namePrefix = faker.random.arrayElement([
    '金', '银', '阳光', '花园', '春天', '绿色', '和谐', '幸福',
    '美好', '温馨', '舒适', '宁静', '现代', '新', '东方', '西苑'
  ]);
  const nameSuffix = faker.random.arrayElement(typeConfig.names);
  const complexName = `${namePrefix}${nameSuffix}`;
  
  // 生成楼号、单元号、房间号
  const buildingNumber = faker.random.arrayElement(typeConfig.buildingNumbers);
  const unitNumber = faker.random.arrayElement(typeConfig.unitNumbers);
  const roomNumber = faker.random.arrayElement(typeConfig.roomNumbers);
  
  // 组合完整地址
  const fullAddress = `${street}${complexName}${buildingNumber}号楼${unitNumber}单元${roomNumber}室`;
  
  return {
    complexName,
    buildingNumber,
    unitNumber,
    roomNumber,
    fullAddress,
    residentialType
  };
}

/**
 * 生成坐标（在区域中心附近随机分布）
 */
function generateCoordinates(district) {
  const districtData = BEIJING_DISTRICTS[district];
  const [baseLat, baseLng] = districtData.center;
  
  // 在区中心5公里范围内随机分布
  const offsetLat = (Math.random() - 0.5) * 0.045; // 约5公里
  const offsetLng = (Math.random() - 0.5) * 0.045;
  
  return {
    latitude: parseFloat((baseLat + offsetLat).toFixed(6)),
    longitude: parseFloat((baseLng + offsetLng).toFixed(6))
  };
}

/**
 * 生成服务历史数据
 */
function generateServiceHistory() {
  const visitCount = faker.datatype.number({ min: 0, max: 25 });
  let lastVisit = null;
  
  if (visitCount > 0) {
    // 最后服务时间在最近6个月内
    lastVisit = faker.date.between(
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      new Date()
    );
  }
  
  return {
    visitCount,
    lastVisit
  };
}

/**
 * 生成单个用户地址
 */
function generateUserAddress(userId, userInfo = {}, isDefault = false) {
  const { realName, phone, gender } = userInfo;
  
  // 选择区县和街道
  const district = faker.random.arrayElement(Object.keys(BEIJING_DISTRICTS));
  const districtData = BEIJING_DISTRICTS[district];
  const street = faker.random.arrayElement(districtData.streets);
  
  // 生成地址详情
  const addressDetail = generateDetailedAddress(district, street);
  const coordinates = generateCoordinates(district);
  const serviceHistory = generateServiceHistory();
  
  // 生成联系人信息
  const contactRelation = selectContactRelation();
  let contactName, contactPhone;
  
  if (contactRelation === 'self') {
    contactName = realName || generateChineseName(gender);
    contactPhone = phone || '1' + faker.datatype.number({min: 3000000000, max: 8999999999}).toString();
  } else {
    contactName = generateChineseName();
    contactPhone = '1' + faker.datatype.number({min: 3000000000, max: 8999999999}).toString();
  }
  
  return {
    id: `addr_${faker.datatype.uuid().replace(/-/g, '')}`,
    user_id: userId,
    contact_name: contactName,
    contact_phone: contactPhone,
    address: `北京市${district}${addressDetail.fullAddress}`,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    is_default: isDefault ? 1 : 0,
    visit_count: serviceHistory.visitCount,
    last_visit: serviceHistory.lastVisit,
    create_time: faker.date.recent(90),
    update_time: new Date(),
    
    // 扩展信息（用于显示和分析）
    _addressInfo: {
      street: street,
      complexName: addressDetail.complexName,
      buildingNumber: addressDetail.buildingNumber,
      unitNumber: addressDetail.unitNumber,
      roomNumber: addressDetail.roomNumber,
      residentialType: addressDetail.residentialType,
      contactRelation: contactRelation,
      contactRelationName: CONTACT_RELATIONS[contactRelation].name
    }
  };
}

/**
 * 为用户生成多个地址
 */
function generateUserAddresses(userId, userInfo = {}, options = {}) {
  const { 
    minAddresses = 1, 
    maxAddresses = 3,
    guaranteeDefault = true 
  } = options;
  
  const addressCount = faker.datatype.number({ min: minAddresses, max: maxAddresses });
  const addresses = [];
  
  for (let i = 0; i < addressCount; i++) {
    const isDefault = guaranteeDefault && i === 0; // 第一个地址设为默认
    const address = generateUserAddress(userId, userInfo, isDefault);
    addresses.push(address);
  }
  
  return addresses;
}

/**
 * 插入地址记录到数据库
 */
async function insertAddressToDatabase(addressData, connection) {
  const sql = `
    INSERT INTO user_addresses (
      id, user_id, contact_name, contact_phone, address, 
      latitude, longitude, is_default, visit_count, last_visit,
      create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    addressData.id,
    addressData.user_id,
    addressData.contact_name,
    addressData.contact_phone,
    addressData.address,
    addressData.latitude,
    addressData.longitude,
    addressData.is_default,
    addressData.visit_count,
    addressData.last_visit,
    addressData.create_time,
    addressData.update_time
  ];
  
  const [result] = await connection.execute(sql, values);
  return result;
}

/**
 * 地址生成器类
 */
class AddressGenerator {
  constructor(connection = null) {
    this.connection = connection;
  }
  
  /**
   * 为单个用户生成地址信息
   */
  async generateForUser(userId, userInfo = {}, options = {}) {
    const { enableDatabase = true } = options;
    
    try {
      const addresses = generateUserAddresses(userId, userInfo, options);
      const results = [];
      
      for (const address of addresses) {
        if (enableDatabase && this.connection) {
          try {
            await insertAddressToDatabase(address, this.connection);
            const defaultText = address.is_default ? '(默认)' : '';
            console.log(`  🏠 地址创建成功: ${address.district}${address._addressInfo.complexName} ${defaultText}`);
            results.push({ success: true, address });
          } catch (error) {
            console.log(`  ❌ 地址创建失败: ${error.message}`);
            results.push({ success: false, error: error.message, address });
          }
        } else {
          const defaultText = address.is_default ? '(默认)' : '';
          console.log(`  🏠 地址生成成功: ${address.district}${address._addressInfo.complexName} ${defaultText}`);
          results.push({ success: true, address });
        }
      }
      
      return results;
      
    } catch (error) {
      console.log(`  ❌ 用户地址信息生成失败: ${error.message}`);
      return [{ success: false, error: error.message }];
    }
  }
  
  /**
   * 批量为用户生成地址信息
   */
  async batchGenerateForUsers(userData, options = {}) {
    const { progressCallback } = options;
    
    console.log(`🏠 开始为 ${userData.length} 个用户生成地址信息...`);
    
    const results = {
      total: userData.length,
      success: 0,
      failed: 0,
      addresses: []
    };
    
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      const userId = user.userId || user.open_id || user.id;
      const userInfo = {
        realName: user.real_name || user.realName,
        phone: user.phone,
        gender: user.gender
      };
      
      try {
        const userResults = await this.generateForUser(userId, userInfo, options);
        
        for (const result of userResults) {
          if (result.success) {
            results.success++;
            results.addresses.push(result.address);
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
        console.log(`❌ 用户 ${userId} 地址生成异常: ${error.message}`);
      }
    }
    
    console.log(`🎉 地址信息生成完成! 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }
  
  /**
   * 获取地址统计信息
   */
  getAddressStats(addresses) {
    const stats = {
      total: addresses.length,
      byDistrict: {},
      byResidentialType: {},
      defaultCount: 0,
      averageVisitCount: 0,
      totalVisitCount: 0
    };
    
    addresses.forEach(addr => {
      // 按区县统计
      stats.byDistrict[addr.district] = (stats.byDistrict[addr.district] || 0) + 1;
      
      // 按住宅类型统计
      const type = addr._addressInfo?.residentialType || 'unknown';
      stats.byResidentialType[type] = (stats.byResidentialType[type] || 0) + 1;
      
      // 默认地址统计
      if (addr.is_default) {
        stats.defaultCount++;
      }
      
      // 服务次数统计
      stats.totalVisitCount += addr.visit_count || 0;
    });
    
    stats.averageVisitCount = stats.total > 0 ? stats.totalVisitCount / stats.total : 0;
    
    return stats;
  }
}

module.exports = {
  AddressGenerator,
  generateUserAddress,
  generateUserAddresses,
  insertAddressToDatabase,
  generateChineseName,
  BEIJING_DISTRICTS,
  RESIDENTIAL_TYPES,
  CONTACT_RELATIONS
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
      const generator = new AddressGenerator(connection);
      
      switch (command) {
        case 'test':
          console.log('🧪 测试地址信息生成...');
          const testUserId = 'wx_test_user_123';
          const testUserInfo = {
            realName: '张三',
            phone: '13800138000',
            gender: '男'
          };
          const testAddresses = generateUserAddresses(testUserId, testUserInfo);
          console.log('生成的地址数据:', JSON.stringify(testAddresses, null, 2));
          break;
          
        case 'generate':
          const userId = args[1];
          if (!userId) {
            console.log('❌ 请提供用户ID');
            break;
          }
          await generator.generateForUser(userId, {}, { enableDatabase: true });
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node addressGenerator.js test');
          console.log('  node addressGenerator.js generate <用户ID>');
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