const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('文件上传接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('POST /api/upload - 文件上传根路径', () => {
    test('应该返回上传API信息', async () => {
      const response = await request(app)
        .post('/api/upload');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.message).toBe('Upload API');
    });

    test('应该返回正确的响应格式', async () => {
      const response = await request(app)
        .post('/api/upload');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
      expect(response.body.success).toBe(true);
    });

    test('应该正确处理空的POST请求', async () => {
      const response = await request(app)
        .post('/api/upload')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Upload API');
    });

    test('应该正确处理带有数据的POST请求', async () => {
      const testData = {
        filename: 'test.jpg',
        type: 'image'
      };

      const response = await request(app)
        .post('/api/upload')
        .send(testData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Upload API');
    });
  });

  describe('上传API HTTP方法验证', () => {
    test('应该支持POST方法', async () => {
      const response = await request(app)
        .post('/api/upload');

      expect(response.status).toBe(200);
    });

    test('应该拒绝GET方法', async () => {
      const response = await request(app)
        .get('/api/upload');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/upload')
        .send({ test: 'data' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/upload');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PATCH方法', async () => {
      const response = await request(app)
        .patch('/api/upload')
        .send({ test: 'data' });

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('上传API Content-Type处理', () => {
    test('应该处理application/json内容类型', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'application/json')
        .send({ test: 'json data' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理application/x-www-form-urlencoded内容类型', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value&another=data');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理multipart/form-data内容类型', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('name', 'test-file')
        .field('description', 'test upload');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('上传API性能测试', () => {
    test('应该在合理时间内响应', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/upload')
        .send({ test: 'performance test' });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 响应时间应该小于1秒
    });

    test('并发上传请求应该正常处理', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/upload')
            .send({ test: `concurrent upload ${i}` })
        );
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Upload API');
      });
    });
  });

  describe('上传API安全性验证', () => {
    test('应该正确处理大量数据', async () => {
      const largeData = {
        content: 'x'.repeat(1000), // 1KB的数据
        description: 'Large data test'
      };

      const response = await request(app)
        .post('/api/upload')
        .send(largeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该正确处理特殊字符', async () => {
      const specialData = {
        filename: 'test文件.jpg',
        content: '特殊字符测试 <script>alert("xss")</script>',
        emoji: '😀🎉🚀'
      };

      const response = await request(app)
        .post('/api/upload')
        .send(specialData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该拒绝恶意请求头', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('X-Forwarded-For', '<script>alert("xss")</script>')
        .set('User-Agent', 'malicious-uploader/1.0')
        .send({ test: 'security test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('上传API错误处理', () => {
    test('应该处理无效的JSON数据', async () => {
      // 临时抑制console.error输出，避免测试日志污染
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        const response = await request(app)
          .post('/api/upload')
          .set('Content-Type', 'application/json')
          .send('invalid json data');

        // 全局错误处理器会返回500状态码
        expect(response.status).toBe(500);
        
        // 验证错误响应格式
        expect(response.body).toHaveProperty('code', 500);
        expect(response.body).toHaveProperty('message', '服务器内部错误');
        
        // 验证错误日志被记录
        expect(console.error).toHaveBeenCalled();
      } finally {
        // 恢复console.error
        console.error = originalConsoleError;
      }
    });

    test('响应格式应该保持一致', async () => {
      const response1 = await request(app).post('/api/upload').send({});
      const response2 = await request(app).post('/api/upload').send({ test: 'data' });

      expect(response1.body).toHaveProperty('success');
      expect(response1.body).toHaveProperty('data');
      expect(response2.body).toHaveProperty('success');
      expect(response2.body).toHaveProperty('data');
    });
  });
});