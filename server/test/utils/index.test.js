const Utils = require('../../utils/index');

describe('Utils工具类测试', () => {
  describe('generateId - 生成UUID', () => {
    test('应该生成不含连字符的UUID', () => {
      const id = Utils.generateId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBe(32); // UUID去掉连字符后长度为32
      expect(id).not.toContain('-');
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    test('多次调用应该生成不同的ID', () => {
      const id1 = Utils.generateId();
      const id2 = Utils.generateId();
      const id3 = Utils.generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    test('生成的ID应该是唯一的', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(Utils.generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateOrderNo - 生成订单号', () => {
    test('应该生成正确格式的订单号', () => {
      const orderNo = Utils.generateOrderNo();
      
      expect(typeof orderNo).toBe('string');
      expect(orderNo).toMatch(/^HG\d{8}\d{3}$/);
      expect(orderNo.startsWith('HG')).toBe(true);
      expect(orderNo.length).toBe(13); // HG + 8位日期 + 3位随机数
    });

    test('订单号应该包含当前日期', () => {
      const orderNo = Utils.generateOrderNo();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      expect(orderNo.substring(2, 10)).toBe(today);
    });

    test('多次调用可能生成不同的订单号', () => {
      const orderNos = [];
      for (let i = 0; i < 10; i++) {
        orderNos.push(Utils.generateOrderNo());
      }
      
      // 由于随机数的存在，大部分订单号应该不同
      const uniqueOrderNos = new Set(orderNos);
      expect(uniqueOrderNos.size).toBeGreaterThan(1);
    });
  });

  describe('formatDate - 格式化日期', () => {
    test('应该使用默认格式格式化日期', () => {
      const date = new Date('2023-12-25 15:30:45');
      const formatted = Utils.formatDate(date);
      
      expect(formatted).toBe('2023-12-25 15:30:45');
    });

    test('应该使用自定义格式格式化日期', () => {
      const date = new Date('2023-12-25 15:30:45');
      const formatted = Utils.formatDate(date, 'YYYY/MM/DD');
      
      expect(formatted).toBe('2023/12/25');
    });

    test('应该处理不同的日期格式', () => {
      const date = new Date('2023-01-01 08:00:00');
      
      expect(Utils.formatDate(date, 'YYYY-MM-DD')).toBe('2023-01-01');
      expect(Utils.formatDate(date, 'MM/DD/YYYY')).toBe('01/01/2023');
      expect(Utils.formatDate(date, 'HH:mm:ss')).toBe('08:00:00');
    });
  });

  describe('maskPhone - 手机号脱敏', () => {
    test('应该正确脱敏11位手机号', () => {
      const phone = '13812345678';
      const masked = Utils.maskPhone(phone);
      
      expect(masked).toBe('138****5678');
    });

    test('应该处理空值', () => {
      expect(Utils.maskPhone('')).toBe('');
      expect(Utils.maskPhone(null)).toBe('');
      expect(Utils.maskPhone(undefined)).toBe('');
    });

    test('应该处理不同长度的手机号', () => {
      expect(Utils.maskPhone('12345678901')).toBe('123****8901');
      expect(Utils.maskPhone('1234567890')).toBe('123***7890');
    });
  });

  describe('maskIdCard - 身份证脱敏', () => {
    test('应该正确脱敏18位身份证', () => {
      const idCard = '123456789012345678';
      const masked = Utils.maskIdCard(idCard);
      
      expect(masked).toBe('123456********5678');
    });

    test('应该处理空值', () => {
      expect(Utils.maskIdCard('')).toBe('');
      expect(Utils.maskIdCard(null)).toBe('');
      expect(Utils.maskIdCard(undefined)).toBe('');
    });

    test('应该处理15位身份证', () => {
      const idCard = '123456789012345';
      const masked = Utils.maskIdCard(idCard);
      
      expect(masked).toBe('123456*****2345');
    });
  });

  describe('maskEmail - 邮箱脱敏', () => {
    test('应该正确脱敏长邮箱地址', () => {
      const email = 'testuser@example.com';
      const masked = Utils.maskEmail(email);
      
      expect(masked).toBe('te***@example.com');
    });

    test('应该处理短邮箱地址', () => {
      const email = 'abc@example.com';
      const masked = Utils.maskEmail(email);
      
      expect(masked).toBe('a***@example.com');
    });

    test('应该处理空值', () => {
      expect(Utils.maskEmail('')).toBe('');
      expect(Utils.maskEmail(null)).toBe('');
      expect(Utils.maskEmail(undefined)).toBe('');
    });

    test('应该处理各种邮箱格式', () => {
      expect(Utils.maskEmail('a@test.com')).toBe('a***@test.com');
      expect(Utils.maskEmail('ab@test.com')).toBe('a***@test.com');
      expect(Utils.maskEmail('abcde@test.com')).toBe('ab***@test.com');
    });
  });

  describe('getPagination - 分页计算', () => {
    test('应该返回正确的分页参数', () => {
      const result = Utils.getPagination(2, 10);
      
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
    });

    test('应该处理默认参数', () => {
      const result = Utils.getPagination();
      
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    test('应该限制最大页面大小', () => {
      const result = Utils.getPagination(1, 150);
      
      expect(result.limit).toBe(100); // 最大值限制
    });

    test('应该处理无效参数', () => {
      expect(Utils.getPagination(0, 5)).toEqual({ limit: 5, offset: 0 });
      expect(Utils.getPagination(-1, 0)).toEqual({ limit: 1, offset: 0 });
      expect(Utils.getPagination(1, -5)).toEqual({ limit: 1, offset: 0 });
    });
  });

  describe('response - 统一响应格式', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        json: jest.fn()
      };
    });

    test('应该返回成功响应', () => {
      const data = { test: 'data' };
      Utils.response(mockRes, data, 'success', 200);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        success: true,
        message: 'success',
        data: data,
        timestamp: expect.any(Number)
      });
    });

    test('应该使用默认参数', () => {
      Utils.response(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        code: 200,
        success: true,
        message: 'success',
        data: null,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('error - 错误响应', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    test('应该返回错误响应', () => {
      Utils.error(mockRes, '测试错误', 400);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 400,
        success: false,
        message: '测试错误',
        details: null,
        timestamp: expect.any(Number)
      });
    });

    test('应该使用默认错误参数', () => {
      Utils.error(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 500,
        success: false,
        message: '服务器内部错误',
        details: null,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('validateRequired - 检查必需参数', () => {
    test('应该返回缺失的必需字段', () => {
      const data = { name: 'test', age: 25 };
      const required = ['name', 'email', 'phone'];
      const missing = Utils.validateRequired(data, required);

      expect(missing).toEqual(['email', 'phone']);
    });

    test('应该返回空数组当所有字段都存在', () => {
      const data = { name: 'test', email: 'test@example.com' };
      const required = ['name', 'email'];
      const missing = Utils.validateRequired(data, required);

      expect(missing).toEqual([]);
    });

    test('应该检查空字符串和假值', () => {
      const data = { name: '', email: null, phone: undefined, age: 0 };
      const required = ['name', 'email', 'phone', 'age'];
      const missing = Utils.validateRequired(data, required);

      expect(missing).toEqual(['name', 'email', 'phone', 'age']);
    });
  });

  describe('omit - 安全删除对象属性', () => {
    test('应该删除指定属性', () => {
      const obj = { name: 'test', password: '123456', email: 'test@example.com' };
      const result = Utils.omit(obj, ['password']);

      expect(result).toEqual({ name: 'test', email: 'test@example.com' });
      expect(obj.password).toBe('123456'); // 原对象不应被修改
    });

    test('应该删除多个属性', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = Utils.omit(obj, ['b', 'd']);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    test('应该处理不存在的属性', () => {
      const obj = { name: 'test' };
      const result = Utils.omit(obj, ['nonexistent']);

      expect(result).toEqual({ name: 'test' });
    });
  });

  describe('pick - 只保留指定属性', () => {
    test('应该只保留指定属性', () => {
      const obj = { name: 'test', password: '123456', email: 'test@example.com' };
      const result = Utils.pick(obj, ['name', 'email']);

      expect(result).toEqual({ name: 'test', email: 'test@example.com' });
    });

    test('应该处理不存在的属性', () => {
      const obj = { name: 'test' };
      const result = Utils.pick(obj, ['name', 'nonexistent']);

      expect(result).toEqual({ name: 'test' });
    });

    test('应该返回空对象当没有匹配属性', () => {
      const obj = { name: 'test' };
      const result = Utils.pick(obj, ['nonexistent']);

      expect(result).toEqual({});
    });
  });

  describe('randomString - 生成随机字符串', () => {
    test('应该生成指定长度的随机字符串', () => {
      const str = Utils.randomString(10);
      
      expect(str.length).toBe(10);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });

    test('应该使用默认长度', () => {
      const str = Utils.randomString();
      
      expect(str.length).toBe(8);
    });

    test('多次调用应该生成不同的字符串', () => {
      const strings = [];
      for (let i = 0; i < 10; i++) {
        strings.push(Utils.randomString(20));
      }
      
      const uniqueStrings = new Set(strings);
      expect(uniqueStrings.size).toBe(10);
    });
  });

  describe('validateHealthData - 健康数据验证', () => {
    test('应该验证血压数据', () => {
      const validData = { systolic: 120, diastolic: 80 };
      const result = Utils.validateHealthData('bloodPressure', validData);
      
      expect(result.isValid).toBe(true);
    });

    test('应该拒绝无效血压数据', () => {
      const invalidData = { systolic: 300, diastolic: 80 };
      const result = Utils.validateHealthData('bloodPressure', invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('健康数据超出正常范围');
    });

    test('应该验证血糖数据', () => {
      const validData = { value: 5.6 };
      const result = Utils.validateHealthData('bloodSugar', validData);
      
      expect(result.isValid).toBe(true);
    });

    test('应该验证体温数据', () => {
      const validData = { value: 36.5 };
      const result = Utils.validateHealthData('temperature', validData);
      
      expect(result.isValid).toBe(true);
    });

    test('应该验证体重数据', () => {
      const validData = { value: 70 };
      const result = Utils.validateHealthData('weight', validData);
      
      expect(result.isValid).toBe(true);
    });

    test('应该验证心率数据', () => {
      const validData = { value: 72 };
      const result = Utils.validateHealthData('heartRate', validData);
      
      expect(result.isValid).toBe(true);
    });

    test('应该拒绝不支持的数据类型', () => {
      const result = Utils.validateHealthData('invalidType', { value: 100 });
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('不支持的健康数据类型');
    });
  });
});