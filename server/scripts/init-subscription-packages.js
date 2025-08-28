const { query } = require('../config/database');

console.log('🎯 开始初始化10级订阅套餐数据...');
console.log('📋 根据上门医疗服务项目10级订阅套餐定价策略文档');
console.log('');

async function initSubscriptionPackages() {
  try {
    // 检查是否已存在套餐数据
    console.log('🔍 检查现有套餐数据...');
    const existingPackages = await query('SELECT COUNT(*) as count FROM subscription_packages');
    
    if (existingPackages[0].count > 0) {
      console.log(`⚠️ 发现 ${existingPackages[0].count} 个现有套餐，清空后重新初始化...`);
      await query('DELETE FROM subscription_packages');
      console.log('✅ 现有套餐数据已清空');
    }

    // 定义10级订阅套餐数据
    const packages = [
      {
        id: 'pkg_001',
        name: '贴心关怀型',
        level: 1,
        price: 98.00,
        services_per_month: 1,
        service_staff: '护理员',
        hospital_resources: '社区卫生服务中心',
        features: '基础健康咨询、测量血压体温、生活起居指导、节日慰问礼品',
        target_users: '身体健康，仅需基础关怀的老年人',
        service_description: '每月1次上门探访，工作日白天服务'
      },
      {
        id: 'pkg_002', 
        name: '基础保障型',
        level: 2,
        price: 168.00,
        services_per_month: 2,
        service_staff: '护理员',
        hospital_resources: '一级医疗机构',
        features: '基础健康监测、健康档案记录、用药提醒服务、节日慰问礼品',
        target_users: '身体状况稳定，需要定期基础监测的老年人',
        service_description: '每月2次上门服务，工作日全天'
      },
      {
        id: 'pkg_003',
        name: '健康守护型',
        level: 3,
        price: 298.00,
        services_per_month: 4,
        service_staff: '护士',
        hospital_resources: '二级医疗机构',
        features: '基础健康监测、健康趋势分析、用药指导和健康咨询、节日+生日礼品',
        target_users: '有轻微慢性病，需要定期监测的老年人',
        service_description: '每月4次上门服务，工作日全天，周末可预约'
      },
      {
        id: 'pkg_004',
        name: '专业护理型',
        level: 4,
        price: 498.00,
        services_per_month: 6,
        service_staff: '护士',
        hospital_resources: '二级医疗机构',
        features: '全面健康监测、慢性病管理指导、伤口护理等基础护理、月度健康报告',
        target_users: '有明确慢性病，需要专业护理指导的老年人',
        service_description: '每月6次上门服务，工作日全天，周末可预约'
      },
      {
        id: 'pkg_005',
        name: '贴心陪护型',
        level: 5,
        price: 798.00,
        services_per_month: 8,
        service_staff: '主管护师',
        hospital_resources: '二级医疗机构 + 部分三甲医院',
        features: '个性化护理方案、康复训练指导、周健康趋势分析报告、节日+生日+季度礼品',
        target_users: '行动不便，需要较多关注的老年人',
        service_description: '每月8次上门服务，每天可预约，节假日除外'
      },
      {
        id: 'pkg_006',
        name: '高级护理型',
        level: 6,
        price: 1280.00,
        services_per_month: 12,
        service_staff: '主管护师',
        hospital_resources: '三级医疗机构',
        features: '个性化慢性病管理方案、康复训练+理疗指导、双周健康趋势分析、营养膳食建议',
        target_users: '有多种慢性病，需要高级护理的老年人',
        service_description: '每月12次上门服务，每天可预约，节假日除外'
      },
      {
        id: 'pkg_007',
        name: '专家指导型',
        level: 7,
        price: 1880.00,
        services_per_month: 16,
        service_staff: '专家级护理师',
        hospital_resources: '三级甲等医疗机构 + 专家资源',
        features: '专家级健康管理方案、康复训练+理疗+心理疏导、周健康趋势+专家建议、营养膳食+运动处方',
        target_users: '病情复杂，需要专家指导的老年人',
        service_description: '每月16次上门服务，每天可预约，节假日可协商，年度体检'
      },
      {
        id: 'pkg_008',
        name: '专属护理型',
        level: 8,
        price: 2280.00,
        services_per_month: 20,
        service_staff: '专家级护理师',
        hospital_resources: '知名三甲医院 + 专家资源 + 特需门诊',
        features: '专属健康管理师服务、康复训练+理疗+心理疏导+中医调理、个性化营养膳食+运动处方+睡眠管理',
        target_users: '高净值客户，对服务质量要求极高的老年人',
        service_description: '每月20次上门服务，每天可预约，节假日可协商，半年度体检'
      },
      {
        id: 'pkg_009',
        name: '全程陪护型',
        level: 9,
        price: 2680.00,
        services_per_month: 25,
        service_staff: '专家级护理师 + 合作医生',
        hospital_resources: '知名三甲医院 + 专家资源 + 特需门诊 + 急救网络',
        features: '专属健康管理师+家庭医生服务、康复训练+理疗+心理疏导+中医调理+专业护理、紧急医疗绿色通道',
        target_users: '行动严重不便，需要高频次服务的老年人',
        service_description: '每月25次上门服务，每天可预约，节假日可协商，紧急情况24小时响应'
      },
      {
        id: 'pkg_010',
        name: '尊享专家型',
        level: 10,
        price: 2980.00,
        services_per_month: 30,
        service_staff: '专属健康管理师+家庭医生+专家顾问团队',
        hospital_resources: '顶级三甲医院+知名专家+特需门诊+急救网络+国际医疗资源',
        features: '专属健康管理师+家庭医生+专家顾问团队、康复训练+理疗+心理疏导+中医调理+专业护理+临终关怀咨询、个性化营养膳食+运动处方+睡眠管理+用药管理+基因检测分析、年度高端体检+紧急医疗绿色通道+专车接送',
        target_users: '超高净值客户，要求最高级别服务的老年人',
        service_description: '每月30次上门服务（可按需增加），每天可预约，节假日可协商，紧急情况24小时响应'
      }
    ];

    console.log('📦 开始插入套餐数据...');
    
    for (const pkg of packages) {
      const sql = `
        INSERT INTO subscription_packages (
          id, name, level, price, services_per_month, 
          service_staff, hospital_resources, features, 
          target_users, service_description, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        pkg.id,
        pkg.name,
        pkg.level,
        pkg.price,
        pkg.services_per_month,
        pkg.service_staff,
        pkg.hospital_resources,
        pkg.features,
        pkg.target_users,
        pkg.service_description,
        1
      ];
      
      await query(sql, values);
      console.log(`✅ 套餐 ${pkg.level}: ${pkg.name} (¥${pkg.price}/月) - 插入成功`);
    }

    // 验证插入结果
    console.log('');
    console.log('🔍 验证套餐数据插入结果...');
    const allPackages = await query('SELECT id, name, level, price, services_per_month FROM subscription_packages ORDER BY level');
    
    console.log('📋 套餐列表:');
    console.log('等级 | 套餐名称        | 月费(元) | 服务次数/月');
    console.log('-'.repeat(50));
    
    for (const pkg of allPackages) {
      console.log(`Lv.${pkg.level.toString().padStart(2)} | ${pkg.name.padEnd(12)} | ${pkg.price.toString().padStart(7)} | ${pkg.services_per_month.toString().padStart(8)}`);
    }

    console.log('');
    console.log('🎉 10级订阅套餐数据初始化完成！');
    console.log(`✨ 共初始化 ${allPackages.length} 个套餐，价格区间: ¥98-¥2980/月`);
    return true;

  } catch (error) {
    console.error('❌ 套餐数据初始化失败:', error.message);
    console.error('');
    console.error('🔧 解决建议:');
    console.error('1. 检查数据库连接');
    console.error('2. 确保subscription_packages表已创建');
    console.error('3. 检查数据格式是否正确');
    return false;
  }
}

// 执行初始化
if (require.main === module) {
  initSubscriptionPackages()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('初始化执行异常:', error);
      process.exit(1);
    });
}

module.exports = initSubscriptionPackages;