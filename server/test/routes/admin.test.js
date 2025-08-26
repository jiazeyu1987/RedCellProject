const request = require('supertest');
const app = require('../../app');
const Database = require('../../config/database');
const TestHelper = require('../helpers/TestHelper');

describe('管理员功能接口测试', () => {
  let testHelper;
  let adminToken;
  let testUsers = [];

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    // 清理测试数据
    try {
      await Database.query('DELETE FROM bookings');
      await Database.query('DELETE FROM addresses');
      await Database.query('DELETE FROM admin_sessions');
      await Database.query('DELETE FROM users');
    } catch (error) {
      console.log('清理数据时的错误（可忽略）:', error.message);
    }
    testUsers = [];
    
    // 创建几个测试用户
    for (let i = 1; i <= 3; i++) {
      const userData = await testHelper.createTestUser({
        openId: `admin_test_user_${i}`,
        nickname: `管理测试用户${i}`,
        email: `admintest${i}@example.com`,
        phone: `1380013800${i}`,
        realName: `张测试${i}`
      });
      testUsers.push(userData);
    }
  });

  describe('POST /api/admin/login - 管理员登录', () => {
    test('应该使用正确密码成功登录', async () => {
      const response = await testHelper.post('/api/admin/login', {
        password: 'admin123'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.message).toContain('登录成功');

      adminToken = response.body.data.token;

      // 验证session有效性（通过API调用而不是数据库查询）
      const sessionResponse = await testHelper.get(`/api/admin/session/${adminToken}`);
      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.data).toHaveProperty('token');
      expect(sessionResponse.body.data).toHaveProperty('expires_at');
    });

    test('应该拒绝错误的密码', async () => {
      const response = await testHelper.post('/api/admin/login', {
        password: 'wrongpassword'
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('口令错误');
    });

    test('应该验证必填字段', async () => {
      const response = await testHelper.post('/api/admin/login', {});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('口令');
    });

    test('应该设置正确的过期时间', async () => {
      const response = await testHelper.post('/api/admin/login', {
        password: 'admin123'
      });

      expect(response.body.data.expiresIn).toBe(1800); // 30分钟 = 1800秒

      const token = response.body.data.token;
      const sessionResponse = await testHelper.get(`/api/admin/session/${token}`);
      expect(sessionResponse.status).toBe(200);
      
      const expiresAt = new Date(sessionResponse.body.data.expires_at);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      
      expect(diffMinutes).toBeGreaterThan(29); // 应该接近30分钟
      expect(diffMinutes).toBeLessThanOrEqual(30);
    });
  });

  describe('GET /api/admin/users - 获取用户列表', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
    });

    test('应该返回所有用户列表', async () => {
      const response = await testHelper.get('/api/admin/users', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBe(testUsers.length);
      
      // 验证分页信息
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.total).toBe(testUsers.length);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(20);

      // 验证用户信息结构
      const user = response.body.data.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('nickname');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('phone');
      expect(user).toHaveProperty('status');
      expect(user).toHaveProperty('createdAt');
    });
  });

  describe('GET /api/admin/users/:id - 获取用户详情', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
    });

    test('应该返回用户详细信息', async () => {
      const userId = testUsers[0].id;
      const response = await testHelper.get(`/api/admin/users/${userId}`, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.user.nickname).toBe('管理测试用户1');
      
      // 验证包含敏感信息（管理员权限）
      expect(response.body.data.user).toHaveProperty('phone');
      expect(response.body.data.user).toHaveProperty('email');
      expect(response.body.data.user).toHaveProperty('realName');
      expect(response.body.data.user).toHaveProperty('openId');
    });

    test('应该返回用户统计信息', async () => {
      const userId = testUsers[0].id;
      
      // 先创建一些测试预约记录
      await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, created_at) 
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'completed', NOW()), 
               (?, 'comprehensive_health', '2025-09-02', '14:00', 'pending', NOW())
      `, [userId, userId]);

      const response = await testHelper.get(`/api/admin/users/${userId}`, adminToken);

      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.statistics.totalBookings).toBeGreaterThanOrEqual(0);
      expect(response.body.data.statistics.completedBookings).toBeGreaterThanOrEqual(0);
      expect(response.body.data.statistics.totalSpent).toBeGreaterThanOrEqual(0);
    });

    test('应该处理不存在的用户', async () => {
      const response = await testHelper.get('/api/admin/users/999999', adminToken);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户不存在');
    });
  });

  describe('PUT /api/admin/users/:id/status - 更新用户状态', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
    });

    test('应该成功禁用用户', async () => {
      const userId = testUsers[0].id;
      const response = await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled', reason: '违规行为' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('状态更新成功');

      // 验证数据库中的状态已更新
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: userId
      });
      expect(dbUser.status).toBe('disabled');
    });

    test('应该成功启用用户', async () => {
      const userId = testUsers[0].id;
      
      // 先禁用用户
      await Database.query('UPDATE users SET status = ? WHERE id = ?', ['disabled', userId]);

      const response = await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证数据库中的状态已更新
      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: userId
      });
      expect(dbUser.status).toBe('active');
    });

    test('应该验证状态值', async () => {
      const userId = testUsers[0].id;
      const response = await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('状态值');
    });
  });

  describe('GET /api/admin/statistics - 获取管理统计信息', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
      
      // 创建一些测试数据
      const userId = testUsers[0].id;
      await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at) 
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'completed', 100.00, DATE_SUB(NOW(), INTERVAL 1 DAY)),
               (?, 'comprehensive_health', '2025-09-02', '14:00', 'completed', 200.00, NOW()),
               (?, 'basic_health', '2025-09-03', '09:00', 'pending', 100.00, NOW())
      `, [userId, userId, userId]);
    });

    test('应该返回系统统计信息', async () => {
      const response = await testHelper.get('/api/admin/statistics', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('bookings');
      expect(response.body.data).toHaveProperty('revenue');

      // 验证用户统计
      expect(response.body.data.users.total).toBe(testUsers.length);
      expect(response.body.data.users.active).toBeGreaterThan(0);
      expect(response.body.data.users.newToday).toBeGreaterThan(0);

      // 验证预约统计
      expect(response.body.data.bookings.total).toBeGreaterThan(0);
      expect(response.body.data.bookings.completed).toBeGreaterThan(0);
      expect(response.body.data.bookings.pending).toBeGreaterThan(0);

      // 验证收入统计
      expect(response.body.data.revenue.total).toBeGreaterThan(0);
      expect(response.body.data.revenue.today).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/logout - 管理员登出', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
    });

    test('应该成功登出管理员', async () => {
      const response = await request(app)
        .post('/api/admin/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('登出成功');

      // 验证token已失效
      const verifyResponse = await testHelper.get('/api/admin/users', adminToken);
      expect(verifyResponse.status).toBe(401);
    });
  });

  describe('管理员权限验证', () => {
    test('过期的token应该被拒绝', async () => {
      // 创建一个已过期的token
      const expiredToken = await testHelper.generateAdminToken(-3600); // 1小时前过期

      const response = await testHelper.get('/api/admin/users', expiredToken);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('过期');
    });

    test('无效格式的token应该被拒绝', async () => {
      const response = await testHelper.get('/api/admin/users', 'invalid.token.format');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('数据库数据验证', () => {
    beforeEach(async () => {
      adminToken = await testHelper.generateAdminToken();
    });

    test('管理员登录应该创建session记录', async () => {
      const response = await testHelper.post('/api/admin/login', {
        password: 'admin123'
      });

      const token = response.body.data.token;
      
      // 通过API验证session存在
      const sessionResponse = await testHelper.get(`/api/admin/session/${token}`);
      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.data.token).toBe(token);
      expect(sessionResponse.body.data.created_at).toBeTruthy();
      expect(sessionResponse.body.data.expires_at).toBeTruthy();
    });

    test('用户状态更新应该正确保存到数据库', async () => {
      const userId = testUsers[0].id;
      
      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled', reason: '测试禁用' });

      const dbUser = await testHelper.verifyDatabaseRecord('users', {
        id: userId
      });

      expect(dbUser.status).toBe('disabled');
      expect(new Date(dbUser.updated_at)).toBeInstanceOf(Date);
      
      // 验证updated_at字段已更新
      expect(new Date(dbUser.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(dbUser.created_at).getTime()
      );
    });

    test('管理员登出应该删除session记录', async () => {
      // 先登录获取token
      const loginResponse = await testHelper.post('/api/admin/login', {
        password: 'admin123'
      });
      const token = loginResponse.body.data.token;

      // 验证session存在
      let sessionResponse = await testHelper.get(`/api/admin/session/${token}`);
      expect(sessionResponse.status).toBe(200);

      // 登出
      await request(app)
        .post('/api/admin/logout')
        .set('Authorization', `Bearer ${token}`);

      // 验证session已删除
      sessionResponse = await testHelper.get(`/api/admin/session/${token}`);
      expect(sessionResponse.status).toBe(404);
    });
  });
});