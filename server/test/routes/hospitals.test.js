const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('医院相关接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('GET /api/hospitals - 医院API根路径', () => {
    test('应该返回医院API信息', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.message).toBe('Hospitals API');
    });

    test('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.success).toBe(true);
    });

    test('响应应该包含message字段', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      expect(response.body.data).toHaveProperty('message');
      expect(typeof response.body.data.message).toBe('string');
      expect(response.body.data.message.length).toBeGreaterThan(0);
    });
  });

  describe('医院API HTTP方法验证', () => {
    test('应该支持GET方法', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      expect(response.status).toBe(200);
    });

    test('应该拒绝POST方法', async () => {
      const response = await request(app)
        .post('/api/hospitals')
        .send({ test: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/hospitals')
        .send({ test: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/hospitals');

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('医院API响应特性', () => {
    test('响应应该包含正确的Content-Type', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('响应应该在合理时间内返回', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/hospitals');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(800); // 响应时间应该小于800ms
    });

    test('重复请求应该返回一致的结果', async () => {
      const response1 = await request(app).get('/api/hospitals');
      const response2 = await request(app).get('/api/hospitals');

      // 比较除了timestamp以外的所有字段
      expect(response1.body.success).toEqual(response2.body.success);
      expect(response1.body.message).toEqual(response2.body.message);
      expect(response1.body.code).toEqual(response2.body.code);
      expect(response1.body.data).toEqual(response2.body.data);
      expect(response1.status).toBe(response2.status);
      
      // 验证timestamp字段存在且为数字
      expect(typeof response1.body.timestamp).toBe('number');
      expect(typeof response2.body.timestamp).toBe('number');
    });
  });

  describe('医院API压力测试', () => {
    test('应该能处理多个并发请求', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/hospitals'));
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Hospitals API');
      });
    });

    test('快速连续请求应该正常处理', async () => {
      const responses = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/api/hospitals');
        responses.push(response);
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('医院API安全性验证', () => {
    test('响应不应包含服务器内部信息', async () => {
      const response = await request(app)
        .get('/api/hospitals');

      const responseStr = JSON.stringify(response.body);
      
      // 检查不应暴露的服务器信息
      expect(responseStr).not.toMatch(/server/i);
      expect(responseStr).not.toMatch(/database/i);
      expect(responseStr).not.toMatch(/config/i);
      expect(responseStr).not.toMatch(/env/i);
    });

    test('应该正确处理恶意请求头', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .set('X-Forwarded-For', '<script>alert("xss")</script>')
        .set('User-Agent', 'malicious-bot/1.0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});