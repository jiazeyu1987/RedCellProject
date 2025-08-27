const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('社区相关接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('GET /api/community - 社区API根路径', () => {
    test('应该返回社区API信息', async () => {
      const response = await request(app)
        .get('/api/community');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.message).toBe('Community API');
    });

    test('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .get('/api/community');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.success).toBe(true);
    });

    test('响应头应该包含正确的Content-Type', async () => {
      const response = await request(app)
        .get('/api/community');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('社区API错误处理', () => {
    test('应该正确处理不支持的HTTP方法', async () => {
      const response = await request(app)
        .post('/api/community');

      // POST方法应该返回405（方法不允许）或404
      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/community');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/community');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PATCH方法', async () => {
      const response = await request(app)
        .patch('/api/community');

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('社区API性能测试', () => {
    test('应该快速响应请求', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/community');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // 响应时间应该小于500ms
    });

    test('并发请求应该正常处理', async () => {
      const concurrentRequests = Array(5).fill().map(() => 
        request(app).get('/api/community')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Community API');
      });
    });
  });

  describe('社区API数据验证', () => {
    test('返回的数据结构应该是稳定的', async () => {
      const response1 = await request(app).get('/api/community');
      const response2 = await request(app).get('/api/community');

      // 比较除了timestamp以外的所有字段
      expect(response1.body.success).toEqual(response2.body.success);
      expect(response1.body.message).toEqual(response2.body.message);
      expect(response1.body.code).toEqual(response2.body.code);
      expect(response1.body.data).toEqual(response2.body.data);
      
      // 验证timestamp字段存在且为数字
      expect(typeof response1.body.timestamp).toBe('number');
      expect(typeof response2.body.timestamp).toBe('number');
    });

    test('响应数据应该不包含敏感信息', async () => {
      const response = await request(app)
        .get('/api/community');

      const responseStr = JSON.stringify(response.body);
      
      // 检查不应包含的敏感字段
      expect(responseStr).not.toMatch(/password/i);
      expect(responseStr).not.toMatch(/secret/i);
      expect(responseStr).not.toMatch(/token/i);
      expect(responseStr).not.toMatch(/key/i);
    });
  });
});