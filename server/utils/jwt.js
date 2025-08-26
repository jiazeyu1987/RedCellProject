const jwt = require('jsonwebtoken');

class JWTUtils {
  // 生成用户Token
  static generateUserToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
  
  // 生成管理员Token
  static generateAdminToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: 'admin',
        loginTime: payload.loginTime || new Date().getTime()
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '30m' }
    );
  }
  
  // 验证用户Token
  static verifyUserToken(token) {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET未配置');
      }
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('JWT用户token验证失败:', {
        error: error.message,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'null',
        jwtSecretExists: !!process.env.JWT_SECRET
      });
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('用户登录已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token格式错误');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token尚未生效');
      }
      throw new Error('Token无效');
    }
  }
  
  // 验证管理员Token
  static verifyAdminToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      
      // JWT本身已经处理了过期检查，不需要额外的loginTime检查
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('管理员登录已过期');
      }
      throw new Error(error.message || '管理员Token无效');
    }
  }
  
  // 从请求头获取Token
  static extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = JWTUtils;