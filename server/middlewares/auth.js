const JWTUtils = require('../utils/jwt');
const UserModel = require('../models/User');
const Utils = require('../utils');
const adminSession = require('../utils/adminSession');

// 用户认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = JWTUtils.extractToken(req);
    
    if (!token) {
      return Utils.error(res, '请提供token', 401);
    }
    
    const decoded = JWTUtils.verifyUserToken(token);
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return Utils.error(res, '用户不存在', 401);
    }
    
    if (user.status !== 'active') {
      return Utils.error(res, '用户已被冻结', 401);
    }
    
    req.user = user;
    next();
  } catch (error) {
    // 在非测试环境或非预期错误时输出日忕
    const isExpectedError = error.message.includes('过期') || error.message.includes('格式错误');
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    if (!isTestEnv || !isExpectedError) {
      console.error('用户认证失败:', error);
    }
    Utils.error(res, 'token无效', 401);
  }
};

// 管理员认证中间件
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = JWTUtils.extractToken(req);
    
    if (!token) {
      return Utils.error(res, '管理员未登录', 401);
    }
    
    // 先验证JWT token（这样过期的token能返回正确的错误消息）
    const decoded = JWTUtils.verifyAdminToken(token);
    
    // 然后检查session是否有效
    const isValid = await adminSession.isValidSession(token);
    if (!isValid) {
      return Utils.error(res, 'session已失效', 401);
    }
    
    req.admin = {
      id: decoded.adminId,
      username: decoded.username,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    // 在非测试环境或非预期错误时输出日忕
    const isExpectedError = error.message.includes('过期') || error.message.includes('格式错误');
    const isTestEnv = process.env.NODE_ENV === 'test';
    
    if (!isTestEnv || !isExpectedError) {
      console.error('管理员认证失败:', error);
    }
    Utils.error(res, error.message, 401);
  }
};

// 管理员权限检查中间件
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return Utils.error(res, '未登录', 401);
    }
    
    // 超级管理员拥有所有权限
    if (req.admin.username === 'superadmin') {
      return next();
    }
    
    // 检查权限
    if (!req.admin.permissions.includes(permission)) {
      return Utils.error(res, '权限不足', 403);
    }
    
    next();
  };
};

// 可选认证中间件（不强制登录）
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = JWTUtils.extractToken(req);
    
    if (token) {
      const decoded = JWTUtils.verifyUserToken(token);
      const user = await UserModel.findById(decoded.userId);
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
};

module.exports = {
  authMiddleware,
  adminAuthMiddleware,
  checkAdminPermission,
  optionalAuthMiddleware
};