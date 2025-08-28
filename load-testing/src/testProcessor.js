const faker = require('faker');

// 设置中文语言
faker.locale = 'zh_CN';

// 北京市区域数据
const beijingDistricts = [
  { name: '朝阳区', center: [39.9204, 116.4490] },
  { name: '海淀区', center: [39.9593, 116.2979] },
  { name: '西城区', center: [39.9142, 116.3660] },
  { name: '东城区', center: [39.9180, 116.4175] },
  { name: '丰台区', center: [39.8585, 116.2867] },
  { name: '石景山区', center: [39.9056, 116.2223] }
];

/**
 * 生成用户注册数据
 */
function generateUserData(context, events, done) {
  const age = faker.datatype.number({min: 60, max: 90});
  const gender = faker.random.arrayElement(['男', '女']);
  const lastName = faker.name.lastName();
  
  // 生成北京地址
  const district = faker.random.arrayElement(beijingDistricts);
  const offsetLat = (Math.random() - 0.5) * 0.018;
  const offsetLng = (Math.random() - 0.5) * 0.018;
  
  const healthConditions = [
    'healthy', 'high_blood_pressure', 'diabetes', 
    'heart_disease', 'arthritis', 'chronic_pain'
  ];
  
  // 设置测试数据到上下文
  context.vars.openId = `wx_test_${faker.datatype.uuid()}`;
  context.vars.nickname = age >= 70 ? 
    `${lastName}${gender === '男' ? '大爷' : '奶奶'}` : 
    `${lastName}${gender === '男' ? '叔叔' : '阿姨'}`;
  context.vars.realName = `${lastName}${faker.name.firstName()}`;
  context.vars.avatar = null;
  context.vars.phone = '1' + faker.datatype.number({min: 3000000000, max: 8999999999});
  context.vars.age = age;
  context.vars.gender = gender;
  context.vars.emergencyContact = `${faker.name.findName()} 1${faker.datatype.number({min: 3000000000, max: 8999999999})}`;
  context.vars.healthCondition = faker.random.arrayElement(healthConditions);
  context.vars.latitude = district.center[0] + offsetLat;
  context.vars.longitude = district.center[1] + offsetLng;
  
  return done();
}

/**
 * 生成分配数据
 */
function generateAssignmentData(context, events, done) {
  // 模拟获取一些用户ID进行分配
  const userCount = faker.datatype.number({min: 1, max: 5});
  const userIds = [];
  
  for (let i = 0; i < userCount; i++) {
    userIds.push(faker.datatype.number({min: 1, max: 100}));
  }
  
  const algorithms = ['distance_priority', 'load_balance', 'specialty_match', 'comprehensive'];
  
  context.vars.userIds = userIds;
  context.vars.algorithm = faker.random.arrayElement(algorithms);
  context.vars.maxDistance = faker.datatype.number({min: 3000, max: 8000});
  
  return done();
}

/**
 * 生成批量分配数据
 */
function generateBatchAssignmentData(context, events, done) {
  // 生成更大批次的用户ID
  const userCount = faker.datatype.number({min: 5, max: 15});
  const userIds = [];
  
  for (let i = 0; i < userCount; i++) {
    userIds.push(faker.datatype.number({min: 1, max: 200}));
  }
  
  const algorithms = ['distance_priority', 'load_balance', 'comprehensive'];
  
  context.vars.userIds = userIds;
  context.vars.algorithm = faker.random.arrayElement(algorithms);
  
  return done();
}

/**
 * 生成登录凭据
 */
function generateLoginCredentials(context, events, done) {
  const passwords = ['admin123', 'health2024', 'manager888'];
  context.vars.password = faker.random.arrayElement(passwords);
  
  return done();
}

/**
 * 生成搜索参数
 */
function generateSearchParams(context, events, done) {
  const keywords = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄'];
  const statuses = ['active', 'inactive', ''];
  const assignmentStatuses = ['assigned', 'unassigned', ''];
  
  context.vars.keyword = Math.random() > 0.7 ? faker.random.arrayElement(keywords) : '';
  context.vars.status = faker.random.arrayElement(statuses);
  context.vars.assignmentStatus = faker.random.arrayElement(assignmentStatuses);
  context.vars.page = faker.datatype.number({min: 1, max: 10});
  
  return done();
}

/**
 * 生成随机延迟
 */
function randomDelay(context, events, done) {
  const delay = faker.datatype.number({min: 500, max: 3000});
  setTimeout(done, delay);
}

/**
 * 记录响应时间
 */
function logResponseTime(context, events, done) {
  const response = context.response;
  if (response) {
    console.log(`响应时间: ${response.timings.response}ms, 状态码: ${response.statusCode}`);
  }
  return done();
}

/**
 * 验证响应数据
 */
function validateResponse(context, events, done) {
  const response = context.response;
  
  if (response && response.body) {
    try {
      const data = JSON.parse(response.body);
      
      // 验证基本响应结构
      if (!data.hasOwnProperty('success')) {
        console.warn('响应缺少success字段');
      }
      
      // 记录错误响应
      if (!data.success && data.message) {
        console.log(`API错误: ${data.message}`);
      }
      
      // 记录成功的数据量
      if (data.success && data.data) {
        if (Array.isArray(data.data.users)) {
          console.log(`获取到 ${data.data.users.length} 个用户`);
        }
        if (Array.isArray(data.data.providers)) {
          console.log(`获取到 ${data.data.providers.length} 个服务提供者`);
        }
      }
    } catch (error) {
      console.warn('响应数据解析失败:', error.message);
    }
  }
  
  return done();
}

/**
 * 模拟用户行为延迟
 */
function simulateUserBehavior(context, events, done) {
  // 模拟用户阅读、思考时间
  const behaviorDelays = {
    'quick_scan': faker.datatype.number({min: 500, max: 1500}),     // 快速浏览
    'normal_read': faker.datatype.number({min: 2000, max: 5000}),   // 正常阅读
    'careful_review': faker.datatype.number({min: 5000, max: 10000}) // 仔细查看
  };
  
  const behaviorType = faker.random.arrayElement(Object.keys(behaviorDelays));
  const delay = behaviorDelays[behaviorType];
  
  console.log(`模拟${behaviorType}行为，延迟${delay}ms`);
  setTimeout(done, delay);
}

module.exports = {
  generateUserData,
  generateAssignmentData,
  generateBatchAssignmentData,
  generateLoginCredentials,
  generateSearchParams,
  randomDelay,
  logResponseTime,
  validateResponse,
  simulateUserBehavior
};