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

// 管理员认证中间件 - 统一认证逻辑
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = JWTUtils.extractToken(req);
    
    if (!token) {
      return Utils.error(res, '管理员未登录', 401);
    }
    
    console.log('🔍 验证管理员token:', { token: token.substring(0, 20) + '...' });
    
    let adminInfo = null;
    let authMethod = null;
    
    // 统一的认证流程
    try {
      // 1. 优先尝试简单token格式（推荐格式）
      if (token.startsWith('admin_token_')) {
        const isValid = await adminSession.isValidSession(token);
        if (isValid) {
          adminInfo = {
            id: 'admin',
            username: 'admin',
            permissions: ['viewUserData', 'viewSensitiveInfo', 'exportData', 'freezeUser']
          };
          authMethod = 'simple_token';
        }
      } else {
        // 2. 尝试JWT token格式（兼容性支持）
        try {
          const decoded = JWTUtils.verifyAdminToken(token);
          const isValid = await adminSession.isValidSession(token);
          
          if (isValid) {
            adminInfo = {
              id: decoded.adminId || 'admin',
              username: decoded.username || 'admin',
              permissions: decoded.permissions || ['viewUserData', 'viewSensitiveInfo', 'exportData', 'freezeUser']
            };
            authMethod = 'jwt_token';
          }
        } catch (jwtError) {
          // JWT解析失败，尝试作为简单token处理
          const isValid = await adminSession.isValidSession(token);
          if (isValid) {
            adminInfo = {
              id: 'admin',
              username: 'admin',
              permissions: ['viewUserData', 'viewSensitiveInfo', 'exportData', 'freezeUser']
            };
            authMethod = 'fallback_simple';
          }
        }
      }
      
      // 3. 验证结果处理
      if (!adminInfo) {
        console.log('❌ 认证失败：token无效或已过期');
        return Utils.error(res, 'Token已失效，请重新登录', 401);
      }
      
      req.admin = adminInfo;
      console.log(`✅ 管理员认证成功 (${authMethod}):`, {
        username: adminInfo.username,
        permissions: adminInfo.permissions.length
      });
      
      return next();
      
    } catch (authError) {
      console.log('❌ 认证过程异常:', authError.message);
      return Utils.error(res, 'session已失效，请重新登录', 401);
    }
    
  } catch (error) {
    console.error('管理员认证中间件异常:', error);
    return Utils.error(res, '认证失败，请重新登录', 401);
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
    const permissions = req.admin.permissions || [];
    if (!permissions.includes(permission)) {
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