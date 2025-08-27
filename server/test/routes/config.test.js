const request = require('supertest');
const app = require('../../app');
const TestHelper = require('../helpers/TestHelper');

describe('配置相关接口测试', () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  describe('GET /api/config - 获取应用配置', () => {
    test('应该返回完整的应用配置', async () => {
      const response = await request(app)
        .get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();

      // 验证配置结构
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data).toHaveProperty('contact');
      expect(response.body.data).toHaveProperty('upload');
    });

    test('应该返回正确的版本信息', async () => {
      const response = await request(app)
        .get('/api/config');

      expect(response.body.data.version).toBe('1.0.0');
      expect(typeof response.body.data.version).toBe('string');
    });

    test('应该返回正确的功能配置', async () => {
      const response = await request(app)
        .get('/api/config');

      const features = response.body.data.features;
      expect(features).toHaveProperty('communityEnabled');
      expect(features).toHaveProperty('hospitalBookingEnabled');
      expect(features).toHaveProperty('videoCallEnabled');

      expect(features.communityEnabled).toBe(true);
      expect(features.hospitalBookingEnabled).toBe(true);
      expect(features.videoCallEnabled).toBe(false);
    });

    test('应该返回正确的联系信息', async () => {
      const response = await request(app)
        .get('/api/config');

      const contact = response.body.data.contact;
      expect(contact).toHaveProperty('phone');
      expect(contact).toHaveProperty('email');
      expect(contact).toHaveProperty('workTime');

      expect(contact.phone).toBe('400-888-8888');
      expect(contact.email).toBe('support@health-guard.com');
      expect(contact.workTime).toBe('9:00-18:00');
    });

    test('应该返回正确的上传配置', async () => {
      const response = await request(app)
        .get('/api/config');

      const upload = response.body.data.upload;
      expect(upload).toHaveProperty('maxSize');
      expect(upload).toHaveProperty('allowedTypes');

      expect(upload.maxSize).toBe(10 * 1024 * 1024); // 10MB
      expect(Array.isArray(upload.allowedTypes)).toBe(true);
      expect(upload.allowedTypes).toContain('image/jpeg');
      expect(upload.allowedTypes).toContain('image/png');
      expect(upload.allowedTypes).toContain('image/gif');
    });
  });

  describe('配置API HTTP方法验证', () => {
    test('应该支持GET方法', async () => {
      const response = await request(app)
        .get('/api/config');

      expect(response.status).toBe(200);
    });

    test('应该拒绝POST方法', async () => {
      const response = await request(app)
        .post('/api/config')
        .send({ version: '2.0.0' });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PUT方法', async () => {
      const response = await request(app)
        .put('/api/config')
        .send({ features: { communityEnabled: false } });

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝DELETE方法', async () => {
      const response = await request(app)
        .delete('/api/config');

      expect([404, 405]).toContain(response.status);
    });

    test('应该拒绝PATCH方法', async () => {
      const response = await request(app)
        .patch('/api/config')
        .send({ version: '1.0.1' });

      expect([404, 405]).toContain(response.status);
    });
  });

  describe('配置API数据完整性', () => {
    test('配置数据应该是稳定的', async () => {
      const response1 = await request(app).get('/api/config');
      const response2 = await request(app).get('/api/config');

      // 比较除了timestamp以外的所有字段
      expect(response1.body.success).toEqual(response2.body.success);
      expect(response1.body.message).toEqual(response2.body.message);
      expect(response1.body.code).toEqual(response2.body.code);
      expect(response1.body.data).toEqual(response2.body.data);
      
      // 验证timestamp字段存在且为数字
      expect(typeof response1.body.timestamp).toBe('number');
      expect(typeof response2.body.timestamp).toBe('number');
    });

    test('配置数据类型应该正确', async () => {
      const response = await request(app)
        .get('/api/config');

      const config = response.body.data;

      // 检查数据类型
      expect(typeof config.version).toBe('string');
      expect(typeof config.features).toBe('object');
      expect(typeof config.contact).toBe('object');
      expect(typeof config.upload).toBe('object');

      expect(typeof config.features.communityEnabled).toBe('boolean');
      expect(typeof config.features.hospitalBookingEnabled).toBe('boolean');
      expect(typeof config.features.videoCallEnabled).toBe('boolean');

      expect(typeof config.contact.phone).toBe('string');
      expect(typeof config.contact.email).toBe('string');
      expect(typeof config.contact.workTime).toBe('string');

      expect(typeof config.upload.maxSize).toBe('number');
      expect(Array.isArray(config.upload.allowedTypes)).toBe(true);
    });

    test('配置值应该合理', async () => {
      const response = await request(app)
        .get('/api/config');

      const config = response.body.data;

      // 版本号格式检查
      expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);

      // 文件大小应该合理（大于0）
      expect(config.upload.maxSize).toBeGreaterThan(0);
      
      // 允许的文件类型应该非空
      expect(config.upload.allowedTypes.length).toBeGreaterThan(0);

      // 联系方式格式检查
      expect(config.contact.phone).toMatch(/^\d{3}-\d{3}-\d{4}$/);
      expect(config.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(config.contact.workTime).toMatch(/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/);
    });
  });

  describe('配置API性能测试', () => {
    test('应该快速响应配置请求', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/config');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(400); // 响应时间应该小于400ms
    });

    test('并发配置请求应该正常处理', async () => {
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app).get('/api/config'));
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('version');
      });

      // 所有响应应该相同（除了timestamp）
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        // 比较除了timestamp以外的所有字段
        expect(response.body.success).toEqual(firstResponse.success);
        expect(response.body.message).toEqual(firstResponse.message);
        expect(response.body.code).toEqual(firstResponse.code);
        expect(response.body.data).toEqual(firstResponse.data);
        
        // 验证timestamp字段存在且为数字
        expect(typeof response.body.timestamp).toBe('number');
      });
    });
  });

  describe('配置API安全性验证', () => {
    test('配置不应包含敏感信息', async () => {
      const response = await request(app)
        .get('/api/config');

      const configStr = JSON.stringify(response.body.data);
      
      // 检查不应暴露的敏感信息
      expect(configStr).not.toMatch(/password/i);
      expect(configStr).not.toMatch(/secret/i);
      expect(configStr).not.toMatch(/key/i);
      expect(configStr).not.toMatch(/token/i);
      expect(configStr).not.toMatch(/database/i);
      expect(configStr).not.toMatch(/db_/i);
      expect(configStr).not.toMatch(/api_key/i);
    });

    test('应该正确处理恶意请求头', async () => {
      const response = await request(app)
        .get('/api/config')
        .set('X-Forwarded-For', '<script>alert("xss")</script>')
        .set('User-Agent', 'malicious-config-reader/1.0')
        .set('Accept', 'text/html,application/xhtml+xml');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理查询参数攻击', async () => {
      const response = await request(app)
        .get('/api/config?../../etc/passwd&<script>alert("xss")</script>');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('配置API边界条件', () => {
    test('应该处理Accept头部变化', async () => {
      const response = await request(app)
        .get('/api/config')
        .set('Accept', 'application/xml');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该处理不同的User-Agent', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mobile Safari/537.36',
        'PostmanRuntime/7.28.0',
        'curl/7.68.0'
      ];

      for (const userAgent of userAgents) {
        const response = await request(app)
          .get('/api/config')
          .set('User-Agent', userAgent);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });
});