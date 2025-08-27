const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('健康相关接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('GET /api/health - 健康API根路径', () => {
    test('应该返回健康API信息', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.message).toBe('Health API');
    });

    test('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.success).toBe(true);
    });
  });

  describe('健康API状态检查', () => {
    test('应该正确处理OPTIONS请求', async () => {
      const response = await request(app)
        .options('/api/health');

      // OPTIONS请求应该被正确处理（通常返回200或204）
      expect([200, 204, 404]).toContain(response.status);
    });

    test('应该拒绝不支持的HTTP方法', async () => {
      const response = await request(app)
        .post('/api/health');

      // POST方法应该返回405（方法不允许）或404
      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/health');

      // PUT方法应该返回405（方法不允许）或404  
      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/health');

      // DELETE方法应该返回405（方法不允许）或404
      expect([404, 405]).toContain(response.status);
    });
  });

  describe('健康API响应时间测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/health');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 响应时间应该小于1秒
    });

    test('应该保持响应一致性', async () => {
      // 连续请求多次，验证响应一致性
      const responses = await Promise.all([
        request(app).get('/api/health'),
        request(app).get('/api/health'),
        request(app).get('/api/health')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Health API');
      });
    });
  });
});