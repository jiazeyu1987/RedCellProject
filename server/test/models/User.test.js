const User = require('../../models/User');
const Database = require('../../config/database');
const TestHelper = require('../helpers/TestHelper');

describe('用户模型数据库测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
    
    // 确保数据库表存在，如果不存在则创建
    try {
      const resetTables = require('../../reset-tables');
      await resetTables();
    } catch (error) {
      console.log('数据库表初始化警告:', error.message);
    }
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    // 清理测试数据 - 清理所有测试相关的数据
    try {
      // 更全面的清理策略，包括新的短前缀
      await Database.query(`
        DELETE FROM users WHERE 
          email LIKE "%test%" OR 
          open_id LIKE "%test%" OR 
          open_id LIKE "%duplicate%" OR 
          open_id LIKE "%special%" OR
          open_id LIKE "%constraint%" OR
          open_id LIKE "%minimal%" OR
          open_id LIKE "%char%" OR
          open_id LIKE "%find%" OR
          open_id LIKE "%update%" OR
          open_id LIKE "%status%" OR
          open_id LIKE "%timestamp%" OR
          open_id LIKE "%null%" OR
          open_id LIKE "constraint_%" OR
          open_id LIKE "timestamp_%" OR
          open_id LIKE "null_%" OR
          open_id LIKE "cst_%" OR
          nickname LIKE "%测试%" OR
          nickname LIKE "%创建%" OR
          nickname LIKE "%重复%" OR
          nickname LIKE "%特殊%" OR
          nickname LIKE "%最小%" OR
          nickname LIKE "%查找%" OR
          nickname LIKE "%更新%" OR
          nickname LIKE "%状态%" OR
          nickname LIKE "%时间戳%" OR
          nickname LIKE "%NULL%" OR
          nickname LIKE "%约束%"
      `);
      // 等待片刻以确保数据库操作完成
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log('数据清理警告:', error.message);
    }
  });

  describe('User.create - 创建用户', () => {
    test('应该成功创建新用户', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const userData = {
        openId: `test_create_${uniqueId}`,
        nickname: '创建测试用户',
        avatar: 'https://test.avatar.url',
        phone: '13800138001',
        email: 'create@test.com',
        realName: '张创建',
        gender: '男',
        birthday: '1990-01-01'
      };

      const user = await User.create(userData);

      expect(user).toBeTruthy();
      expect(user.id).toBeTruthy();
      expect(user.openId).toBe(userData.openId);
      expect(user.nickname).toBe(userData.nickname);
      expect(user.email).toBe(userData.email);
      expect(user.status).toBe('active');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // 验证数据库中的记录
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        open_id: userData.openId
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser.nickname).toBe(userData.nickname);
      expect(dbUser.status).toBe('active');
    });

    test('应该设置默认值', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const minimalUserData = {
        openId: `test_minimal_${uniqueId}`,
        nickname: '最小用户'
      };

      const user = await User.create(minimalUserData);

      expect(user.status).toBe('active');
      expect(user.memberLevel).toBe('regular');
      expect(user.serviceCount).toBe(0);
      expect(user.totalSpent).toBe(0);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // 验证数据库中的默认值
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        open_id: minimalUserData.openId
      });
      expect(dbUser.status).toBe('active');
      expect(dbUser.member_level).toBe('regular');
      expect(dbUser.service_count).toBe(0);
      expect(parseFloat(dbUser.total_spent)).toBe(0);
    });

    test('应该验证必填字段', async () => {
      await expect(User.create({})).rejects.toThrow();
      await expect(User.create({ openId: 'test' })).rejects.toThrow();
      await expect(User.create({ nickname: 'test' })).rejects.toThrow();
    });

    test('应该正确处理特殊字符', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + Math.floor(Math.random() * 100000);
      const userData = {
        openId: `special_char_test_${uniqueId}`,
        nickname: '特殊字符用户👤',
        realName: '李特殊&字符',
        email: `special+test_${uniqueId}@example.com`
      };

      const user = await User.create(userData);

      expect(user.nickname).toBe(userData.nickname);
      expect(user.realName).toBe(userData.realName);
      expect(user.email).toBe(userData.email);

      // 验证数据库中的数据
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        open_id: userData.openId
      });
      expect(dbUser.nickname).toBe(userData.nickname);
      expect(dbUser.real_name).toBe(userData.realName);
      expect(dbUser.email).toBe(userData.email);
    });
  });

  describe('User.findByOpenId - 根据OpenId查找用户', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelper.createTestUser({
        openId: 'find_test_openid',
        nickname: '查找测试用户',
        email: 'find@test.com'
      });
    });

    test('应该成功找到存在的用户', async () => {
      const user = await User.findByOpenId('find_test_openid');

      expect(user).toBeTruthy();
      expect(user.id).toBe(testUser.id);
      expect(user.openId).toBe('find_test_openid');
      expect(user.nickname).toBe('查找测试用户');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('应该返回null对于不存在的openId', async () => {
      const user = await User.findByOpenId('nonexistent_openid');
      expect(user).toBeNull();
    });

    test('应该正确处理数据脱敏', async () => {
      const user = await User.findByOpenId('find_test_openid');

      // 敏感信息应该被脱敏
      if (user.phone) {
        expect(user.phone).toMatch(/\d{3}\*{4}\d{4}/);
      }
      if (user.idCard) {
        expect(user.idCard).toMatch(/\d{6}\*{8}\d{4}/);
      }
      if (user.email) {
        expect(user.email).toMatch(/[^@]+\*{3}@.+/);
      }
    });
  });

  describe('User.findById - 根据ID查找用户', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelper.createTestUser({
        openId: 'findbyid_test_openid',
        nickname: 'ID查找测试用户',
        email: 'findbyid@test.com'
      });
    });

    test('应该成功找到存在的用户', async () => {
      const user = await User.findById(testUser.id);

      expect(user).toBeTruthy();
      expect(user.id).toBe(testUser.id);
      expect(user.nickname).toBe('ID查找测试用户');
    });

    test('应该返回null对于不存在的ID', async () => {
      const user = await User.findById(999999);
      expect(user).toBeNull();
    });

    test('应该验证ID参数类型', async () => {
      await expect(User.findById('invalid_id')).rejects.toThrow();
      await expect(User.findById(null)).rejects.toThrow();
    });
  });

  describe('User.update - 更新用户信息', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelper.createTestUser({
        openId: 'update_test_openid',
        nickname: '更新测试用户',
        email: 'update@test.com',
        phone: '13800138002'
      });
    });

    test('应该成功更新用户信息', async () => {
      const updateData = {
        nickname: '新昵称',
        realName: '新真实姓名',
        phone: '13900139001',
        gender: '女',
        birthday: '1995-05-05'
      };
      
      // 添加小延时确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedUser = await User.update(testUser.id, updateData);

      expect(updatedUser).toBeTruthy();
      expect(updatedUser.nickname).toBe(updateData.nickname);
      expect(updatedUser.realName).toBe(updateData.realName);
      expect(updatedUser.phone).toBe(updateData.phone);
      expect(updatedUser.gender).toBe(updateData.gender);
      expect(updatedUser.birthday).toBe(updateData.birthday);

      // 验证数据库中的数据已更新
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: testUser.id
      });
      expect(dbUser.nickname).toBe(updateData.nickname);
      expect(dbUser.real_name).toBe(updateData.realName);
      expect(dbUser.phone).toBe(updateData.phone);
      expect(dbUser.gender).toBe(updateData.gender);
      expect(dbUser.birthday).toBe(updateData.birthday);
      
      // 验证updated_at字段已更新
      expect(new Date(dbUser.updated_at)).toBeInstanceOf(Date);
      expect(new Date(dbUser.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(dbUser.created_at).getTime()
      );
    });

    test('应该忽略不允许更新的字段', async () => {
      const updateData = {
        id: 999999,
        openId: 'new_openid',
        createdAt: new Date(),
        status: 'disabled', // 状态不应通过此方法更新
        nickname: '允许更新的昵称'
      };

      const updatedUser = await User.update(testUser.id, updateData);

      expect(updatedUser.id).toBe(testUser.id); // ID不变
      expect(updatedUser.openId).toBe(testUser.openId); // openId不变
      expect(updatedUser.nickname).toBe('允许更新的昵称'); // nickname已更新
      expect(updatedUser.status).toBe('active'); // status不变

      // 验证数据库中的数据
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: testUser.id
      });
      expect(dbUser.open_id).toBe(testUser.openId);
      expect(dbUser.status).toBe('active');
    });

    test('应该返回null对于不存在的用户', async () => {
      const result = await User.update(999999, { nickname: '测试' });
      expect(result).toBeNull();
    });

    test('应该验证手机号格式', async () => {
      await expect(User.update(testUser.id, { phone: '123' })).rejects.toThrow();
      await expect(User.update(testUser.id, { phone: '1234567890123' })).rejects.toThrow();
    });

    test('应该验证邮箱格式', async () => {
      await expect(User.update(testUser.id, { email: 'invalid-email' })).rejects.toThrow();
    });
  });

  describe('User.updateStatus - 更新用户状态', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testHelper.createTestUser({
        openId: 'status_test_openid',
        nickname: '状态测试用户'
      });
    });

    test('应该成功更新用户状态为禁用', async () => {
      const result = await User.updateStatus(testUser.id, 'disabled');

      expect(result).toBe(true);

      // 验证数据库中的状态已更新
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: testUser.id
      });
      expect(dbUser.status).toBe('disabled');
    });

    test('应该成功更新用户状态为激活', async () => {
      // 先设置为禁用
      await User.updateStatus(testUser.id, 'disabled');
      
      // 再设置为激活
      const result = await User.updateStatus(testUser.id, 'active');

      expect(result).toBe(true);

      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: testUser.id
      });
      expect(dbUser.status).toBe('active');
    });

    test('应该拒绝无效的状态值', async () => {
      await expect(User.updateStatus(testUser.id, 'invalid_status')).rejects.toThrow();
    });

    test('应该返回false对于不存在的用户', async () => {
      const result = await User.updateStatus(999999, 'disabled');
      expect(result).toBe(false);
    });
  });

  describe('数据完整性验证', () => {
    test('创建用户时应正确设置所有时间戳', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const userData = {
        openId: `timestamp_${uniqueId}`,
        nickname: '时间戳测试用户'
      };

      const user = await User.create(userData);
      
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      
      // 创建时间和更新时间应该相近
      const timeDiff = Math.abs(user.updatedAt.getTime() - user.createdAt.getTime());
      expect(timeDiff).toBeLessThan(1000); // 1秒内
    });

    test('更新用户时应正确更新时间戳', async () => {
      const user = await testHelper.createTestUser({
        openId: 'timestamp_update_test',
        nickname: '时间戳更新测试'
      });

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedUser = await User.update(user.id, { nickname: '新昵称' });

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
    });

    test('数据库约束应该正确工作', async () => {
      // 使用更简单的随机策略，并加入高精度时间戳
      const uniqueId = `${Date.now()}_${performance.now().toString().replace('.', '')}_${Math.floor(Math.random() * 999999)}`;
      
      const userData = {
        openId: `cst_${uniqueId}`, // 使用更短的前缀
        nickname: '约束测试用户'
      };

      // 更强的清理逼辑 - 先清理所有可能的残留数据
      try {
        await Database.query('DELETE FROM users WHERE open_id LIKE "cst_%"');
        await Database.query('DELETE FROM users WHERE open_id = ?', [userData.openId]);
        // 等待更长时间确保数据库操作完成
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (cleanupError) {
        console.log('清理数据警告:', cleanupError.message);
      }

      // 再次检查是否存在
      try {
        const existing = await Database.query('SELECT id FROM users WHERE open_id = ?', [userData.openId]);
        if (existing.length > 0) {
          await Database.query('DELETE FROM users WHERE open_id = ?', [userData.openId]);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (checkError) {
        console.log('检查数据警告:', checkError.message);
      }

      // 第一次创建应该成功
      const firstUser = await User.create(userData);
      expect(firstUser).toBeTruthy();
      expect(firstUser.openId).toBe(userData.openId);
      
      // 尝试创建相同openId的用户应该失败
      await expect(User.create(userData)).rejects.toThrow();
      
      // 清理测试数据
      try {
        await Database.query('DELETE FROM users WHERE open_id = ?', [userData.openId]);
      } catch (cleanupError) {
        console.log('清理测试数据警告:', cleanupError.message);
      }
    });

    test('应该正确处理NULL值', async () => {
      const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const userData = {
        openId: `null_${uniqueId}`,
        nickname: 'NULL测试用户',
        phone: null,
        email: null,
        realName: null
      };

      const user = await User.create(userData);

      expect(user.phone).toBeNull();
      expect(user.email).toBeNull();
      expect(user.realName).toBeNull();

      // 验证数据库中的NULL值
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        open_id: userData.openId
      });
      expect(dbUser.phone).toBeNull();
      expect(dbUser.email).toBeNull();
      expect(dbUser.real_name).toBeNull();
    });
  });
});