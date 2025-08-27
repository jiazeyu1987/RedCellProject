const { authMiddleware, adminAuthMiddleware, checkAdminPermission } = require('../../middlewares/auth');
const JWTUtils = require('../../utils/jwt');
const UserModel = require('../../models/User');
const adminSession = require('../../utils/adminSession');
const Utils = require('../../utils');
const TestHelper = require('../helpers/TestHelper');

// Mock依赖
jest.mock('../../utils/jwt');
jest.mock('../../models/User');
jest.mock('../../utils/adminSession');
jest.mock('../../utils', () => ({
  error: jest.fn()
}));

describe('认证中间件测试', () => {
  let req, res, next;
  let testHelper;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      admin: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // 清理所有mock
    jest.clearAllMocks();
    
    // Mock Utils.error
    Utils.error.mockImplementation((res, message, code) => {
      return res.status(code || 500).json({
        code: code || 500,
        success: false,
        message,
        details: null,
        timestamp: Date.now()
      });
    });
  });

  describe('authMiddleware - 用户认证中间件', () => {
    test('应该成功验证有效用户token', async () => {
      const mockUser = {
        id: 1,
        openId: 'test_openid',
        status: 'active',
        nickname: 'Test User'
      };

      req.headers.authorization = 'Bearer valid_user_token';
      JWTUtils.extractToken.mockReturnValue('valid_user_token');
      JWTUtils.verifyUserToken.mockReturnValue({ userId: 1 });
      UserModel.findById.mockResolvedValue(mockUser);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('应该拒绝没有token的请求', async () => {
      JWTUtils.extractToken.mockReturnValue(null);

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: '请提供token',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝无效token', async () => {
      // 模拟无效token，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      req.headers.authorization = 'Bearer invalid_token';
      JWTUtils.extractToken.mockReturnValue('invalid_token');
      JWTUtils.verifyUserToken.mockImplementation(() => {
        const error = new Error('Token格式错误'); // 使用预期错误类型
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'token无效',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    test('应该拒绝不存在的用户', async () => {
      req.headers.authorization = 'Bearer valid_token';
      JWTUtils.extractToken.mockReturnValue('valid_token');
      JWTUtils.verifyUserToken.mockReturnValue({ userId: 999 });
      UserModel.findById.mockResolvedValue(null);

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: '用户不存在',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝被冻结的用户', async () => {
      const mockUser = {
        id: 1,
        openId: 'test_openid',
        status: 'disabled',
        nickname: 'Disabled User'
      };

      req.headers.authorization = 'Bearer valid_token';
      JWTUtils.extractToken.mockReturnValue('valid_token');
      JWTUtils.verifyUserToken.mockReturnValue({ userId: 1 });
      UserModel.findById.mockResolvedValue(mockUser);

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: '用户已被冻结',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该处理数据库查询错误', async () => {
      // 模拟数据库查询错误，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      req.headers.authorization = 'Bearer valid_token';
      JWTUtils.extractToken.mockReturnValue('valid_token');
      JWTUtils.verifyUserToken.mockReturnValue({ userId: 1 });
      UserModel.findById.mockRejectedValue(new Error('数据库错误'));

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'token无效',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });
  });

  describe('adminAuthMiddleware - 管理员认证中间件', () => {
    test('应该成功验证有效管理员token', async () => {
      const mockDecoded = {
        adminId: 1,
        username: 'admin',
        permissions: ['user_management']
      };

      req.headers.authorization = 'Bearer valid_admin_token';
      JWTUtils.extractToken.mockReturnValue('valid_admin_token');
      JWTUtils.verifyAdminToken.mockReturnValue(mockDecoded);
      adminSession.isValidSession.mockResolvedValue(true);

      await adminAuthMiddleware(req, res, next);

      expect(req.admin).toEqual({
        id: mockDecoded.adminId,
        username: mockDecoded.username,
        permissions: mockDecoded.permissions
      });
      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('应该拒绝没有token的请求', async () => {
      JWTUtils.extractToken.mockReturnValue(null);

      await adminAuthMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: '管理员未登录',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝无效的管理员token', async () => {
      // 模拟无效管理员token，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      req.headers.authorization = 'Bearer invalid_admin_token';
      JWTUtils.extractToken.mockReturnValue('invalid_admin_token');
      JWTUtils.verifyAdminToken.mockImplementation(() => {
        const error = new Error('Token格式错误'); // 使用预期错误类型
        throw error;
      });

      await adminAuthMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'Token格式错误',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    test('应该拒绝session失效的token', async () => {
      const mockDecoded = {
        adminId: 1,
        username: 'admin',
        permissions: ['user_management']
      };

      req.headers.authorization = 'Bearer valid_token_invalid_session';
      JWTUtils.extractToken.mockReturnValue('valid_token_invalid_session');
      JWTUtils.verifyAdminToken.mockReturnValue(mockDecoded);
      adminSession.isValidSession.mockResolvedValue(false);

      await adminAuthMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'session已失效',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该处理session检查错误', async () => {
      // 模拟session检查错误，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      const mockDecoded = {
        adminId: 1,
        username: 'admin',
        permissions: ['user_management']
      };

      req.headers.authorization = 'Bearer valid_token';
      JWTUtils.extractToken.mockReturnValue('valid_token');
      JWTUtils.verifyAdminToken.mockReturnValue(mockDecoded);
      adminSession.isValidSession.mockRejectedValue(new Error('Session检查失败'));

      await adminAuthMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'Session检查失败',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    test('应该处理无权限的管理员', async () => {
      const mockDecoded = {
        adminId: 2,
        username: 'limited_admin'
        // 没有permissions字段
      };

      req.headers.authorization = 'Bearer valid_token';
      JWTUtils.extractToken.mockReturnValue('valid_token');
      JWTUtils.verifyAdminToken.mockReturnValue(mockDecoded);
      adminSession.isValidSession.mockResolvedValue(true);

      await adminAuthMiddleware(req, res, next);

      expect(req.admin.permissions).toEqual([]);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkAdminPermission - 管理员权限检查中间件', () => {
    test('应该允许超级管理员访问所有权限', () => {
      req.admin = {
        id: 1,
        username: 'superadmin',
        permissions: []
      };

      const middleware = checkAdminPermission('any_permission');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('应该允许有相应权限的管理员访问', () => {
      req.admin = {
        id: 2,
        username: 'admin',
        permissions: ['user_management', 'content_management']
      };

      const middleware = checkAdminPermission('user_management');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('应该拒绝没有相应权限的管理员', () => {
      req.admin = {
        id: 3,
        username: 'limited_admin',
        permissions: ['content_management']
      };

      const middleware = checkAdminPermission('user_management');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        success: false,
        message: '权限不足',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝未登录的请求', () => {
      req.admin = null;

      const middleware = checkAdminPermission('user_management');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: '未登录',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该处理空权限数组', () => {
      req.admin = {
        id: 4,
        username: 'no_permission_admin',
        permissions: []
      };

      const middleware = checkAdminPermission('user_management');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        success: false,
        message: '权限不足',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该检查权限大小写敏感性', () => {
      req.admin = {
        id: 5,
        username: 'case_admin',
        permissions: ['User_Management'] // 大写
      };

      const middleware = checkAdminPermission('user_management'); // 小写
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        success: false,
        message: '权限不足',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('中间件集成测试', () => {
    test('完整的管理员认证和权限检查流程', async () => {
      const mockDecoded = {
        adminId: 1,
        username: 'admin',
        permissions: ['user_management']
      };

      req.headers.authorization = 'Bearer valid_admin_token';
      JWTUtils.extractToken.mockReturnValue('valid_admin_token');
      JWTUtils.verifyAdminToken.mockReturnValue(mockDecoded);
      adminSession.isValidSession.mockResolvedValue(true);

      // 先执行认证中间件
      await adminAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // 重置next mock
      next.mockReset();

      // 然后执行权限检查中间件
      const permissionMiddleware = checkAdminPermission('user_management');
      permissionMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('认证失败应该阻止权限检查', async () => {
      JWTUtils.extractToken.mockReturnValue(null);

      // 认证失败
      await adminAuthMiddleware(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 401,
        message: '管理员未登录'
      }));
      expect(next).not.toHaveBeenCalled();

      // 权限检查不应该被执行
      const permissionMiddleware = checkAdminPermission('user_management');
      permissionMiddleware(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 401,
        message: '未登录'
      }));
    });
  });

  describe('错误处理和边界条件', () => {
    test('应该处理JWT验证中的预期错误（测试环境）', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      req.headers.authorization = 'Bearer expired_token';
      JWTUtils.extractToken.mockReturnValue('expired_token');
      JWTUtils.verifyUserToken.mockImplementation(() => {
        const error = new Error('用户登录已过期');
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'token无效',
        details: null,
        timestamp: expect.any(Number)
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('应该处理空的permissions数组', () => {
      req.admin = {
        id: 1,
        username: 'empty_permissions_admin',
        permissions: undefined
      };

      const middleware = checkAdminPermission('user_management');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 403,
        success: false,
        message: '权限不足',
        details: null,
        timestamp: expect.any(Number)
      });
    });

    test('应该处理异常的token提取', async () => {
      // 模拟token提取失败的情况，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      JWTUtils.extractToken.mockImplementation(() => {
        const error = new Error('Token提取失败');
        // 模拟一个预期错误来减少日志输出
        error.message = 'Token格式错误';
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'token无效',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });

    test('应该处理管理员token提取异常', async () => {
      // 模拟管理员token提取失败的情况，并抑制错误日志
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      
      // 设置测试环境并抑制console.error
      process.env.NODE_ENV = 'test';
      console.error = jest.fn();

      JWTUtils.extractToken.mockImplementation(() => {
        const error = new Error('Token提取失败');
        // 模拟一个预期错误来减少日志输出
        error.message = 'Token格式错误';
        throw error;
      });

      await adminAuthMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        success: false,
        message: 'Token格式错误',
        details: null,
        timestamp: expect.any(Number)
      });
      expect(next).not.toHaveBeenCalled();
      
      // 恢复环境
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });
  });
});