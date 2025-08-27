const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('用户相关接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('GET /api/users - 用户API根路径', () => {
    test('应该返回用户API信息', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.message).toBe('Users API');
    });

    test('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.success).toBe(true);
    });

    test('响应应该包含用户API标识', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toBe('Users API');
    });
  });

  describe('用户API HTTP方法验证', () => {
    test('应该支持GET方法', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(200);
    });

    test('应该拒绝POST方法', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'test user' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/users')
        .send({ id: 1, name: 'updated user' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/users');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PATCH方法', async () => {
      const response = await request(app)
        .patch('/api/users')
        .send({ name: 'patched user' });

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('用户API响应特性', () => {
    test('响应应该包含正确的Content-Type', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('响应时间应该合理', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/users');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(600); // 响应时间应该小于600ms
    });

    test('多次请求应该返回一致结果', async () => {
      const responses = await Promise.all([
        request(app).get('/api/users'),
        request(app).get('/api/users'),
        request(app).get('/api/users')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Users API');
      });

      // 验证所有响应都相同（除了timestamp）
      const firstResponse = responses[0].body;
      responses.forEach((response, index) => {
        if (index > 0) {
          // 比较除了timestamp以外的所有字段
          expect(response.body.success).toEqual(firstResponse.success);
          expect(response.body.message).toEqual(firstResponse.message);
          expect(response.body.code).toEqual(firstResponse.code);
          expect(response.body.data).toEqual(firstResponse.data);
          
          // 验证timestamp字段存在且为数字
          expect(typeof response.body.timestamp).toBe('number');
        }
      });
    });
  });

  describe('用户API查询参数处理', () => {
    test('应该忽略查询参数并正常响应', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=10&sort=name');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Users API');
    });

    test('应该处理特殊字符查询参数', async () => {
      const response = await request(app)
        .get('/api/users?search=测试用户&filter=<script>alert("xss")</script>');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理空查询参数', async () => {
      const response = await request(app)
        .get('/api/users?');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理长查询字符串', async () => {
      const longQuery = 'param=' + 'x'.repeat(1000);
      const response = await request(app)
        .get(`/api/users?${longQuery}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('用户API并发处理', () => {
    test('应该正确处理并发请求', async () => {
      const concurrentRequests = [];
      
      for (let i = 0; i < 8; i++) {
        concurrentRequests.push(request(app).get('/api/users'));
      }

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Users API');
      });
    });

    test('快速连续请求应该稳定', async () => {
      const responses = [];
      
      for (let i = 0; i < 6; i++) {
        const response = await request(app).get('/api/users');
        responses.push(response);
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('用户API安全性测试', () => {
    test('响应不应包含敏感信息', async () => {
      const response = await request(app)
        .get('/api/users');

      const responseStr = JSON.stringify(response.body);
      
      // 检查不应暴露的敏感信息
      expect(responseStr).not.toMatch(/password/i);
      expect(responseStr).not.toMatch(/secret/i);
      expect(responseStr).not.toMatch(/token/i);
      expect(responseStr).not.toMatch(/private/i);
      expect(responseStr).not.toMatch(/internal/i);
    });

    test('应该正确处理恶意请求头', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('X-Forwarded-For', '<script>alert("xss")</script>')
        .set('User-Agent', 'malicious-bot/1.0')
        .set('X-Real-IP', '127.0.0.1; DROP TABLE users;')
        .set('X-Requested-With', 'XMLHttpRequest<script>');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理异常大的请求头', async () => {
      const largeHeaderValue = 'x'.repeat(1000);
      
      const response = await request(app)
        .get('/api/users')
        .set('X-Custom-Header', largeHeaderValue);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});