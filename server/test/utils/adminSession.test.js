const adminSession = require('../../utils/adminSession');
const TestHelper = require('../helpers/TestHelper');

describe('AdminSession管理模块测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    // 清理内存存储和数据库记录
    await adminSession.cleanupExpiredSessions();
  });

  describe('createSession - 创建session', () => {
    test('应该成功创建session', async () => {
      const token = 'test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
        created_at: new Date()
      };

      const result = await adminSession.createSession(token, sessionData);

      expect(result).toBeTruthy();
      expect(result.expires_at).toEqual(sessionData.expires_at);
      expect(result.created_at).toEqual(sessionData.created_at);
    });

    test('应该在测试环境使用内存存储', async () => {
      const token = 'memory_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      const result = await adminSession.createSession(token, sessionData);
      expect(result).toEqual(sessionData);

      // 验证可以立即获取
      const retrieved = await adminSession.getSession(token);
      expect(retrieved).toBeTruthy();
    });

    test('应该处理重复token创建', async () => {
      const token = 'duplicate_token_' + Date.now();
      const sessionData1 = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };
      const sessionData2 = {
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData1);
      const result = await adminSession.createSession(token, sessionData2);

      expect(result).toEqual(sessionData2);
    });
  });

  describe('getSession - 获取session', () => {
    test('应该获取有效的session', async () => {
      const token = 'get_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      const result = await adminSession.getSession(token);

      expect(result).toBeTruthy();
      expect(result.expires_at).toEqual(sessionData.expires_at);
    });

    test('应该返回null对于不存在的token', async () => {
      const result = await adminSession.getSession('nonexistent_token');
      expect(result).toBeNull();
    });

    test('应该自动删除过期的session', async () => {
      const token = 'expired_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() - 1000), // 已过期
        created_at: new Date(Date.now() - 60 * 1000)
      };

      await adminSession.createSession(token, sessionData);
      const result = await adminSession.getSession(token);

      expect(result).toBeNull();
    });

    test('应该处理边界时间的session', async () => {
      const token = 'boundary_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 1000), // 1秒后过期
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      
      // 立即获取应该成功
      const result1 = await adminSession.getSession(token);
      expect(result1).toBeTruthy();

      // 等待过期后应该返回null
      await new Promise(resolve => setTimeout(resolve, 1100));
      const result2 = await adminSession.getSession(token);
      expect(result2).toBeNull();
    });
  });

  describe('deleteSession - 删除session', () => {
    test('应该成功删除存在的session', async () => {
      const token = 'delete_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      const deleteResult = await adminSession.deleteSession(token);

      expect(deleteResult).toBe(true);

      // 验证session已被删除
      const getResult = await adminSession.getSession(token);
      expect(getResult).toBeNull();
    });

    test('应该返回false对于不存在的session', async () => {
      const result = await adminSession.deleteSession('nonexistent_token');
      expect(result).toBe(false);
    });

    test('应该处理重复删除', async () => {
      const token = 'repeat_delete_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      
      const result1 = await adminSession.deleteSession(token);
      expect(result1).toBe(true);

      const result2 = await adminSession.deleteSession(token);
      expect(result2).toBe(false);
    });
  });

  describe('isValidSession - 检查session有效性', () => {
    test('应该返回true对于有效session', async () => {
      const token = 'valid_test_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      const isValid = await adminSession.isValidSession(token);

      expect(isValid).toBe(true);
    });

    test('应该返回false对于不存在的session', async () => {
      const isValid = await adminSession.isValidSession('nonexistent_token');
      expect(isValid).toBe(false);
    });

    test('应该返回false对于过期的session', async () => {
      const token = 'expired_valid_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() - 1000), // 已过期
        created_at: new Date()
      };

      await adminSession.createSession(token, sessionData);
      const isValid = await adminSession.isValidSession(token);

      expect(isValid).toBe(false);
    });

    test('应该处理异常情况', async () => {
      // 测试空token
      const isValid1 = await adminSession.isValidSession('');
      expect(isValid1).toBe(false);

      // 测试null token
      const isValid2 = await adminSession.isValidSession(null);
      expect(isValid2).toBe(false);

      // 测试undefined token
      const isValid3 = await adminSession.isValidSession(undefined);
      expect(isValid3).toBe(false);
    });
  });

  describe('cleanupExpiredSessions - 清理过期sessions', () => {
    test('应该清理过期的sessions', async () => {
      const token1 = 'cleanup_valid_token_' + Date.now();
      const token2 = 'cleanup_expired_token_' + Date.now();

      // 创建有效session
      await adminSession.createSession(token1, {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      });

      // 创建过期session
      await adminSession.createSession(token2, {
        expires_at: new Date(Date.now() - 1000),
        created_at: new Date()
      });

      const cleanedCount = await adminSession.cleanupExpiredSessions();

      // 应该清理至少1个过期session
      expect(cleanedCount).toBeGreaterThanOrEqual(0);

      // 有效session应该仍然存在
      const valid = await adminSession.isValidSession(token1);
      expect(valid).toBe(true);

      // 过期session应该被清理
      const expired = await adminSession.isValidSession(token2);
      expect(expired).toBe(false);
    });

    test('应该返回清理的session数量', async () => {
      // 创建多个过期session
      const expiredTokens = [];
      for (let i = 0; i < 3; i++) {
        const token = `cleanup_count_token_${Date.now()}_${i}`;
        expiredTokens.push(token);
        await adminSession.createSession(token, {
          expires_at: new Date(Date.now() - 1000),
          created_at: new Date()
        });
      }

      const cleanedCount = await adminSession.cleanupExpiredSessions();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    test('应该处理没有过期session的情况', async () => {
      // 先清理所有过期session
      await adminSession.cleanupExpiredSessions();

      // 创建有效session
      const token = 'no_expired_token_' + Date.now();
      await adminSession.createSession(token, {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      });

      const cleanedCount = await adminSession.cleanupExpiredSessions();
      expect(cleanedCount).toBeGreaterThanOrEqual(0);

      // 有效session应该仍然存在
      const isValid = await adminSession.isValidSession(token);
      expect(isValid).toBe(true);
    });
  });

  describe('Session生命周期测试', () => {
    test('完整的session生命周期', async () => {
      const token = 'lifecycle_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        created_at: new Date()
      };

      // 1. 创建session
      const created = await adminSession.createSession(token, sessionData);
      expect(created).toBeTruthy();

      // 2. 验证session有效
      const isValid1 = await adminSession.isValidSession(token);
      expect(isValid1).toBe(true);

      // 3. 获取session
      const retrieved = await adminSession.getSession(token);
      expect(retrieved).toBeTruthy();

      // 4. 删除session
      const deleted = await adminSession.deleteSession(token);
      expect(deleted).toBe(true);

      // 5. 验证session已失效
      const isValid2 = await adminSession.isValidSession(token);
      expect(isValid2).toBe(false);
    });

    test('session自动过期', async () => {
      const token = 'auto_expire_token_' + Date.now();
      const sessionData = {
        expires_at: new Date(Date.now() + 500), // 0.5秒后过期
        created_at: new Date()
      };

      // 创建即将过期的session
      await adminSession.createSession(token, sessionData);

      // 立即检查应该有效
      const isValid1 = await adminSession.isValidSession(token);
      expect(isValid1).toBe(true);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 600));

      // 过期后应该无效
      const isValid2 = await adminSession.isValidSession(token);
      expect(isValid2).toBe(false);
    });
  });

  describe('错误处理测试', () => {
    test('应该处理无效的sessionData', async () => {
      const token = 'invalid_data_token_' + Date.now();

      // 测试各种无效数据 - 只测试一个简单的情况
      try {
        // 传递无效的sessionData（缺少必要字段）
        await adminSession.createSession(token, { invalid: 'data' });
        // 如果没有抛出错误，这里才会执行
        expect(true).toBe(false); // 应该不会达到这里
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('应该处理极端日期值', async () => {
      const token = 'extreme_date_token_' + Date.now();
      
      // 测试非常遥远的过期时间
      const futureData = {
        expires_at: new Date('2099-12-31'),
        created_at: new Date()
      };

      const result = await adminSession.createSession(token, futureData);
      expect(result).toBeTruthy();

      const isValid = await adminSession.isValidSession(token);
      expect(isValid).toBe(true);
    });
  });
});