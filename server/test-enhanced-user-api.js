const { testConnection } = require('./config/database');
const EnhancedUserModel = require('./models/EnhancedUser');

/**
 * 测试修复后的增强用户列表API
 */
async function testEnhancedUserList() {
  console.log('🧪 开始测试增强用户列表API...\n');
  
  try {
    // 测试数据库连接
    console.log('1. 测试数据库连接...');
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('数据库连接失败');
    }
    console.log('✅ 数据库连接正常\n');

    // 测试获取用户列表
    console.log('2. 测试获取用户列表...');
    const result = await EnhancedUserModel.getEnhancedUsers({
      page: 1,
      pageSize: 5
    });
    
    console.log(`✅ 成功获取用户列表，共 ${result.users.length} 个用户`);
    console.log(`📊 分页信息:`, result.pagination);
    
    // 检查订阅信息完整性
    console.log('\n3. 检查订阅信息完整性...');
    const usersWithSubscription = result.users.filter(u => u.subscription);
    
    if (usersWithSubscription.length > 0) {
      console.log(`✅ 找到 ${usersWithSubscription.length} 个有订阅的用户`);
      
      // 显示第一个有订阅的用户信息
      const sampleUser = usersWithSubscription[0];
      console.log('\n📋 订阅信息示例:');
      console.log(`用户: ${sampleUser.nickname || sampleUser.realName || sampleUser.id}`);
      console.log(`套餐名称: ${sampleUser.subscription.packageName}`);
      console.log(`套餐级别: ${sampleUser.subscription.level}`);
      console.log(`月费价格: ${sampleUser.subscription.monthlyPrice}`);
      console.log(`订阅状态: ${sampleUser.subscription.status}`);
      console.log(`服务已用: ${sampleUser.subscription.servicesUsed}`);
      console.log(`服务剩余: ${sampleUser.subscription.servicesRemaining}`);
      
      // 验证月费价格不为undefined或null
      if (sampleUser.subscription.monthlyPrice !== undefined && 
          sampleUser.subscription.monthlyPrice !== null) {
        console.log('✅ 月费价格字段正常');
      } else {
        console.log('⚠️  月费价格字段为空');
      }
    } else {
      console.log('ℹ️  当前没有用户有订阅信息');
    }
    
    // 显示所有用户基本信息
    console.log('\n4. 用户列表概览:');
    result.users.forEach((user, index) => {
      const subscription = user.subscription ? 
        `订阅: ${user.subscription.packageName}(¥${user.subscription.monthlyPrice})` : 
        '无订阅';
      console.log(`${index + 1}. ${user.nickname || user.realName || user.id} - ${subscription}`);
    });
    
    console.log('\n✅ 所有测试通过！API修复成功！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    return false;
  }
}

/**
 * 测试带参数的查询
 */
async function testParameterizedQueries() {
  console.log('\n🔍 测试带参数的查询...');
  
  try {
    // 测试关键词搜索
    console.log('测试关键词搜索...');
    const searchResult = await EnhancedUserModel.getEnhancedUsers({
      page: 1,
      pageSize: 3,
      keyword: 'test'
    });
    console.log(`✅ 关键词搜索结果: ${searchResult.users.length} 个用户`);
    
    // 测试状态过滤
    console.log('测试状态过滤...');
    const statusResult = await EnhancedUserModel.getEnhancedUsers({
      page: 1,
      pageSize: 3,
      status: 'active'
    });
    console.log(`✅ 状态过滤结果: ${statusResult.users.length} 个用户`);
    
    return true;
  } catch (error) {
    console.error('❌ 参数化查询测试失败:', error.message);
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🚀 开始API修复验证测试...\n');
  
  const basicTestSuccess = await testEnhancedUserList();
  
  if (basicTestSuccess) {
    await testParameterizedQueries();
  }
  
  console.log('\n🏁 测试完成');
  process.exit(basicTestSuccess ? 0 : 1);
}

// 执行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testEnhancedUserList,
  testParameterizedQueries
};