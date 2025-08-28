const mysql = require('mysql2/promise');
const readline = require('readline');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

/**
 * 用户清理工具类
 */
class UserCleanupTool {
  constructor() {
    this.connection = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      this.connection = await mysql.createConnection(config);
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
    if (this.rl) {
      this.rl.close();
    }
  }
  
  /**
   * 安全检查：确保只删除测试用户
   */
  async getTestUsers() {
    try {
      const [users] = await this.connection.execute(`
        SELECT id, open_id, nickname, real_name, phone, created_at
        FROM users 
        WHERE open_id LIKE 'wx_test_%' OR open_id LIKE 'wx_virtual_%'
        ORDER BY created_at DESC
      `);
      
      return users;
    } catch (error) {
      console.error('查询测试用户失败:', error.message);
      return [];
    }
  }
  
  /**
   * 获取用户关联数据统计
   */
  async getUserDataStats(userIds) {
    if (userIds.length === 0) return {};
    
    const stats = {};
    
    try {
      // 获取用户的 open_id 列表
      const userIdPlaceholders = userIds.map(() => '?').join(',');
      const [users] = await this.connection.execute(`
        SELECT id, open_id FROM users WHERE id IN (${userIdPlaceholders})
      `, userIds);
      
      const openIds = users.map(user => user.open_id);
      const userIdStrings = userIds.map(id => id.toString());
      
      // 订阅记录统计（使用数字ID转字符串）
      const userIdStringPlaceholders = userIdStrings.map(() => '?').join(',');
      const [subscriptions] = await this.connection.execute(`
        SELECT COUNT(*) as count FROM user_subscriptions 
        WHERE user_id IN (${userIdStringPlaceholders})
      `, userIdStrings);
      stats.subscriptions = subscriptions[0].count;
      
      // 支付记录统计（使用 open_id）
      if (openIds.length > 0) {
        const openIdPlaceholders = openIds.map(() => '?').join(',');
        const [payments] = await this.connection.execute(`
          SELECT COUNT(*) as count FROM payment_records 
          WHERE user_id IN (${openIdPlaceholders})
        `, openIds);
        stats.payments = payments[0].count;
      } else {
        stats.payments = 0;
      }
      
      // 地址记录统计（使用数字ID转字符串）
      const [addresses] = await this.connection.execute(`
        SELECT COUNT(*) as count FROM user_addresses 
        WHERE user_id IN (${userIdStringPlaceholders})
      `, userIdStrings);
      stats.addresses = addresses[0].count;
      
      // 健康记录统计（使用数字ID）
      const [healthRecords] = await this.connection.execute(`
        SELECT COUNT(*) as count FROM health_records 
        WHERE user_id IN (${userIdPlaceholders})
      `, userIds);
      stats.healthRecords = healthRecords[0].count;
      
    } catch (error) {
      console.error('统计用户数据失败:', error.message);
    }
    
    return stats;
  }
  
  /**
   * 交互式确认删除
   */
  async confirmDeletion(users, stats) {
    console.log('\n🔍 即将删除的测试用户:');
    console.log('=====================================');
    
    users.slice(0, 10).forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickname || user.real_name} (${user.open_id})`);
    });
    
    if (users.length > 10) {
      console.log(`... 还有 ${users.length - 10} 个用户`);
    }
    
    console.log('\n📊 关联数据统计:');
    console.log(`💳 支付记录: ${stats.payments || 0} 条`);
    console.log(`📦 订阅记录: ${stats.subscriptions || 0} 条`);
    console.log(`🏠 地址记录: ${stats.addresses || 0} 条`);
    console.log(`💊 健康记录: ${stats.healthRecords || 0} 条`);
    
    console.log('\n⚠️  警告: 此操作将永久删除所有相关数据，无法恢复！');
    
    return new Promise((resolve) => {
      this.rl.question('\n确认删除这些测试用户吗？(输入 "yes" 确认): ', (answer) => {
        resolve(answer.toLowerCase() === 'yes');
      });
    });
  }
  
  /**
   * 安全删除用户及关联数据
   */
  async safeDeleteUsers(userIds) {
    if (userIds.length === 0) {
      console.log('⚠️ 没有找到需要删除的测试用户');
      return { success: true, deletedCount: 0 };
    }
    
    let deletedCount = 0;
    
    try {
      // 开始事务
      await this.connection.beginTransaction();
      
      console.log('🗑️ 开始删除用户数据...');
      
      // 获取要删除的用户信息（包括 open_id）
      const userIdPlaceholders = userIds.map(() => '?').join(',');
      const [users] = await this.connection.execute(`
        SELECT id, open_id FROM users WHERE id IN (${userIdPlaceholders})
      `, userIds);
      
      const openIds = users.map(user => user.open_id);
      const openIdPlaceholders = openIds.map(() => '?').join(',');
      
      // 1. 删除健康记录（使用数字ID）
      console.log('删除健康记录...');
      const [healthResult] = await this.connection.execute(`
        DELETE FROM health_records WHERE user_id IN (${userIdPlaceholders})
      `, userIds);
      console.log(`✅ 删除了 ${healthResult.affectedRows} 条健康记录`);
      
      // 2. 删除支付记录（使用 open_id）
      console.log('删除支付记录...');
      if (openIds.length > 0) {
        const [paymentResult] = await this.connection.execute(`
          DELETE FROM payment_records WHERE user_id IN (${openIdPlaceholders})
        `, openIds);
        console.log(`✅ 删除了 ${paymentResult.affectedRows} 条支付记录`);
      } else {
        console.log(`✅ 删除了 0 条支付记录`);
      }
      
      // 3. 删除订阅记录（使用数字ID转字符串）
      console.log('删除订阅记录...');
      const userIdStrings = userIds.map(id => id.toString());
      const userIdStringPlaceholders = userIdStrings.map(() => '?').join(',');
      const [subscriptionResult] = await this.connection.execute(`
        DELETE FROM user_subscriptions WHERE user_id IN (${userIdStringPlaceholders})
      `, userIdStrings);
      console.log(`✅ 删除了 ${subscriptionResult.affectedRows} 条订阅记录`);
      
      // 4. 删除地址记录（使用数字ID转字符串）
      console.log('删除地址记录...');
      const [addressResult] = await this.connection.execute(`
        DELETE FROM user_addresses WHERE user_id IN (${userIdStringPlaceholders})
      `, userIdStrings);
      console.log(`✅ 删除了 ${addressResult.affectedRows} 条地址记录`);
      
      // 5. 最后删除用户主表
      console.log('删除用户主表记录...');
      const [userResult] = await this.connection.execute(`
        DELETE FROM users WHERE id IN (${userIdPlaceholders})
      `, userIds);
      console.log(`✅ 删除了 ${userResult.affectedRows} 个用户`);
      
      deletedCount = userResult.affectedRows;
      
      // 提交事务
      await this.connection.commit();
      
      console.log('🎉 用户删除完成！');
      return { success: true, deletedCount };
      
    } catch (error) {
      // 回滚事务
      await this.connection.rollback();
      console.error('❌ 删除用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 按日期范围删除用户
   */
  async deleteUsersByDateRange(startDate, endDate) {
    try {
      const [users] = await this.connection.execute(`
        SELECT id, open_id, nickname, real_name, created_at
        FROM users 
        WHERE (open_id LIKE 'wx_test_%' OR open_id LIKE 'wx_virtual_%')
          AND created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
      `, [startDate, endDate]);
      
      if (users.length === 0) {
        console.log('⚠️ 指定日期范围内没有找到测试用户');
        return { success: true, deletedCount: 0 };
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStats(userIds);
      
      console.log(`\n📅 日期范围: ${startDate} 到 ${endDate}`);
      const confirmed = await this.confirmDeletion(users, stats);
      
      if (!confirmed) {
        console.log('❌ 用户取消了删除操作');
        return { success: false, deletedCount: 0 };
      }
      
      return await this.safeDeleteUsers(userIds);
      
    } catch (error) {
      console.error('按日期删除用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 按数量删除最旧的用户
   */
  async deleteOldestUsers(count) {
    try {
      const [users] = await this.connection.execute(`
        SELECT id, open_id, nickname, real_name, created_at
        FROM users 
        WHERE open_id LIKE 'wx_test_%' OR open_id LIKE 'wx_virtual_%'
        ORDER BY created_at ASC
        LIMIT ?
      `, [count]);
      
      if (users.length === 0) {
        console.log('⚠️ 没有找到测试用户');
        return { success: true, deletedCount: 0 };
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStats(userIds);
      
      console.log(`\n🔢 删除最旧的 ${count} 个用户:`);
      const confirmed = await this.confirmDeletion(users, stats);
      
      if (!confirmed) {
        console.log('❌ 用户取消了删除操作');
        return { success: false, deletedCount: 0 };
      }
      
      return await this.safeDeleteUsers(userIds);
      
    } catch (error) {
      console.error('按数量删除用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 删除所有用户（极度危险操作）
   */
  async deleteAllUsers() {
    try {
      console.log('\n🚨 极度危险操作: 删除所有用户');
      console.log('⚠️  警告: 此操作将永久删除所有用户数据，无法恢复！');
      
      // 获取所有用户
      const [users] = await this.connection.execute(`
        SELECT id, open_id, nickname, real_name, phone, created_at
        FROM users 
        ORDER BY created_at DESC
      `);
      
      if (users.length === 0) {
        console.log('⚠️ 数据库中没有用户');
        return { success: true, deletedCount: 0 };
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStatsForAll(userIds);
      
      console.log('\n📊 所有用户数据统计:');
      console.log(`👥 用户数量: ${users.length} 个`);
      console.log(`💳 支付记录: ${stats.payments || 0} 条`);
      console.log(`📦 订阅记录: ${stats.subscriptions || 0} 条`);
      console.log(`🏠 地址记录: ${stats.addresses || 0} 条`);
      console.log(`💊 健康记录: ${stats.healthRecords || 0} 条`);
      
      console.log('\n📊 用户名单（前10个）:');
      users.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname || user.real_name || 'Unknown'} (${user.open_id || user.id}) - ${user.phone || 'No phone'}`);
      });
      
      if (users.length > 10) {
        console.log(`... 还有 ${users.length - 10} 个用户`);
      }
      
      console.log('\n🔥 开始完全数据库清理...');
      return await this.safeDeleteAllUsers(userIds);
      
    } catch (error) {
      console.error('删除所有用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 安全删除所有用户及关联数据
   */
  async safeDeleteAllUsers(userIds) {
    if (userIds.length === 0) {
      console.log('⚠️ 没有用户需要删除');
      return { success: true, deletedCount: 0 };
    }
    
    let deletedCount = 0;
    
    try {
      // 开始事务
      await this.connection.beginTransaction();
      
      console.log('🗑️ 清理所有用户数据...');
      
      // 获取要删除的用户信息（包括 open_id）
      const userIdPlaceholders = userIds.map(() => '?').join(',');
      const [users] = await this.connection.execute(`
        SELECT id, open_id FROM users WHERE id IN (${userIdPlaceholders})
      `, userIds);
      
      const openIds = users.map(user => user.open_id).filter(Boolean);
      const userIdStrings = userIds.map(id => id.toString());
      
      // 1. 删除所有健康记录
      console.log('清理健康记录...');
      const [healthResult] = await this.connection.execute('DELETE FROM health_records');
      console.log(`✅ 删除了 ${healthResult.affectedRows} 条健康记录`);
      
      // 2. 删除所有支付记录
      console.log('清理支付记录...');
      const [paymentResult] = await this.connection.execute('DELETE FROM payment_records');
      console.log(`✅ 删除了 ${paymentResult.affectedRows} 条支付记录`);
      
      // 3. 删除所有订阅记录
      console.log('清理订阅记录...');
      const [subscriptionResult] = await this.connection.execute('DELETE FROM user_subscriptions');
      console.log(`✅ 删除了 ${subscriptionResult.affectedRows} 条订阅记录`);
      
      // 4. 删除所有地址记录
      console.log('清理地址记录...');
      const [addressResult] = await this.connection.execute('DELETE FROM user_addresses');
      console.log(`✅ 删除了 ${addressResult.affectedRows} 条地址记录`);
      
      // 5. 最后删除所有用户
      console.log('清理用户主表...');
      const [userResult] = await this.connection.execute('DELETE FROM users');
      console.log(`✅ 删除了 ${userResult.affectedRows} 个用户`);
      
      deletedCount = userResult.affectedRows;
      
      // 提交事务
      await this.connection.commit();
      
      console.log('🎉 所有用户数据清理完成！');
      console.log('⚠️  数据库已经被完全清空！');
      return { success: true, deletedCount };
      
    } catch (error) {
      // 回滚事务
      await this.connection.rollback();
      console.error('❌ 删除所有用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 获取所有用户的数据统计
   */
  async getUserDataStatsForAll(userIds) {
    const stats = {};
    
    try {
      // 统计所有记录
      const [subscriptions] = await this.connection.execute('SELECT COUNT(*) as count FROM user_subscriptions');
      stats.subscriptions = subscriptions[0].count;
      
      const [payments] = await this.connection.execute('SELECT COUNT(*) as count FROM payment_records');
      stats.payments = payments[0].count;
      
      const [addresses] = await this.connection.execute('SELECT COUNT(*) as count FROM user_addresses');
      stats.addresses = addresses[0].count;
      
      const [healthRecords] = await this.connection.execute('SELECT COUNT(*) as count FROM health_records');
      stats.healthRecords = healthRecords[0].count;
      
    } catch (error) {
      console.error('统计所有数据失败:', error.message);
    }
    
    return stats;
  }
  
  /**
   * 强制删除所有测试用户（无需确认）
   */
  async forceDeleteAllTestUsers() {
    try {
      const users = await this.getTestUsers();
      
      if (users.length === 0) {
        console.log('⚠️ 没有找到测试用户');
        return { success: true, deletedCount: 0 };
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStats(userIds);
      
      console.log('\n🚨 强制删除所有测试用户:');
      console.log('=====================================');
      
      users.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname || user.real_name} (${user.open_id})`);
      });
      
      if (users.length > 10) {
        console.log(`... 还有 ${users.length - 10} 个用户`);
      }
      
      console.log('\n📊 关联数据统计:');
      console.log(`💳 支付记录: ${stats.payments || 0} 条`);
      console.log(`📦 订阅记录: ${stats.subscriptions || 0} 条`);
      console.log(`🏠 地址记录: ${stats.addresses || 0} 条`);
      console.log(`💊 健康记录: ${stats.healthRecords || 0} 条`);
      
      console.log('\n🔥 开始强制删除（无需确认）...');
      return await this.safeDeleteUsers(userIds);
      
    } catch (error) {
      console.error('强制删除所有测试用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 删除所有测试用户
   */
  async deleteAllTestUsers() {
    try {
      const users = await this.getTestUsers();
      
      if (users.length === 0) {
        console.log('⚠️ 没有找到测试用户');
        return { success: true, deletedCount: 0 };
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStats(userIds);
      
      console.log('\n🚨 删除所有测试用户:');
      const confirmed = await this.confirmDeletion(users, stats);
      
      if (!confirmed) {
        console.log('❌ 用户取消了删除操作');
        return { success: false, deletedCount: 0 };
      }
      
      return await this.safeDeleteUsers(userIds);
      
    } catch (error) {
      console.error('删除所有测试用户失败:', error.message);
      return { success: false, error: error.message, deletedCount: 0 };
    }
  }
  
  /**
   * 预览删除（不实际删除）
   */
  async previewDeletion() {
    try {
      const users = await this.getTestUsers();
      
      if (users.length === 0) {
        console.log('⚠️ 没有找到测试用户');
        return;
      }
      
      const userIds = users.map(user => user.id);
      const stats = await this.getUserDataStats(userIds);
      
      console.log('\n👀 删除预览 (不会实际删除):');
      console.log('=====================================');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nickname || user.real_name} (${user.open_id}) - ${user.created_at}`);
      });
      
      console.log('\n📊 将要删除的数据统计:');
      console.log(`👥 用户数量: ${users.length} 个`);
      console.log(`💳 支付记录: ${stats.payments || 0} 条`);
      console.log(`📦 订阅记录: ${stats.subscriptions || 0} 条`);
      console.log(`🏠 地址记录: ${stats.addresses || 0} 条`);
      console.log(`💊 健康记录: ${stats.healthRecords || 0} 条`);
      
      const totalRecords = (stats.payments || 0) + (stats.subscriptions || 0) + 
                          (stats.addresses || 0) + (stats.healthRecords || 0) + users.length;
      console.log(`📊 总记录数: ${totalRecords} 条`);
      
    } catch (error) {
      console.error('预览删除失败:', error.message);
    }
  }
  
  /**
   * 显示主菜单
   */
  showMainMenu() {
    console.log('\n==================');
    console.log('Health Guard User Cleanup Tool');
    console.log('==================\n');
    console.log('清理选项:');
    console.log('[1] 删除所有测试用户');
    console.log('[2] 按日期范围删除用户');
    console.log('[3] 删除指定数量的最旧用户');
    console.log('[4] 预览删除 (仅查看不删除)');
    console.log('[0] 退出\n');
    console.log('⚠️  警告: 删除操作无法撤销，请谨慎操作！\n');
  }
  
  /**
   * 主交互循环
   */
  async run() {
    const initialized = await this.initialize();
    if (!initialized) {
      await this.cleanup();
      return;
    }
    
    try {
      while (true) {
        this.showMainMenu();
        
        const choice = await new Promise((resolve) => {
          this.rl.question('请选择操作 (0-4): ', resolve);
        });
        
        switch (choice) {
          case '1':
            await this.deleteAllTestUsers();
            break;
            
          case '2':
            const startDate = await new Promise((resolve) => {
              this.rl.question('请输入开始日期 (YYYY-MM-DD): ', resolve);
            });
            const endDate = await new Promise((resolve) => {
              this.rl.question('请输入结束日期 (YYYY-MM-DD): ', resolve);
            });
            await this.deleteUsersByDateRange(startDate, endDate);
            break;
            
          case '3':
            const count = await new Promise((resolve) => {
              this.rl.question('请输入要删除的用户数量: ', resolve);
            });
            await this.deleteOldestUsers(parseInt(count));
            break;
            
          case '4':
            await this.previewDeletion();
            break;
            
          case '0':
            console.log('退出用户清理工具');
            return;
            
          default:
            console.log('❌ 无效选择，请重新输入');
        }
        
        // 操作完成后暂停
        await new Promise((resolve) => {
          this.rl.question('\n按回车键继续...', resolve);
        });
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'interactive';
  
  async function main() {
    const cleanupTool = new UserCleanupTool();
    
    try {
      switch (command) {
        case 'interactive':
          await cleanupTool.run();
          break;
          
        case 'preview':
          await cleanupTool.initialize();
          await cleanupTool.previewDeletion();
          break;
          
        case 'all':
          await cleanupTool.initialize();
          await cleanupTool.deleteAllTestUsers();
          break;
          
        case 'delete-all-users':
          await cleanupTool.initialize();
          await cleanupTool.deleteAllUsers();
          break;
          
        case 'force-all':
          await cleanupTool.initialize();
          await cleanupTool.forceDeleteAllTestUsers();
          break;
          
        case 'count':
          const count = parseInt(args[1]);
          if (!count) {
            console.log('❌ 请提供要删除的用户数量');
            process.exit(1);
            break;
          }
          await cleanupTool.initialize();
          await cleanupTool.deleteOldestUsers(count);
          break;
          
        case 'date-range':
          const startDate = args[1];
          const endDate = args[2];
          if (!startDate || !endDate) {
            console.log('❌ 请提供开始日期和结束日期');
            process.exit(1);
            break;
          }
          await cleanupTool.initialize();
          await cleanupTool.deleteUsersByDateRange(startDate, endDate);
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node userCleanupTool.js interactive         # 交互式清理');
          console.log('  node userCleanupTool.js preview             # 预览待删除数据');
          console.log('  node userCleanupTool.js all                 # 删除所有测试用户');
          console.log('  node userCleanupTool.js force-all           # 强制删除所有测试用户');
          console.log('  node userCleanupTool.js delete-all-users    # 删除所有用户（危险！）');
          console.log('  node userCleanupTool.js count <数量>        # 删除指定数量的最旧用户');
          console.log('  node userCleanupTool.js date-range <开始日期> <结束日期> # 按日期范围删除');
          console.log('');
          console.log('⚠️  警告: delete-all-users 命令将删除所有用户（包括真实用户），请极其谨慎使用！');
      }
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    } finally {
      await cleanupTool.cleanup();
    }
  }
  
  main();
}

module.exports = UserCleanupTool;