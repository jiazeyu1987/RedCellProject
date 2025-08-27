// 管理员Session管理模块
const { query } = require('../config/database');

// 测试环境使用内存存储，避免JWT token长度限制
const isTestEnv = process.env.NODE_ENV === 'test';
const memoryStore = new Map();

// 创建session
async function createSession(token, sessionData) {
  // 验证输入参数
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('无效的sessionData');
  }
  
  if (!sessionData.expires_at || !(sessionData.expires_at instanceof Date)) {
    throw new Error('sessionData必须包含有效的expires_at字段');
  }
  
  if (isTestEnv) {
    // 测试环境使用内存存储
    memoryStore.set(token, sessionData);
    return sessionData;
  }
  
  try {
    const sql = `
      INSERT INTO admin_sessions (token, expires_at, created_at) 
      VALUES (?, ?, ?)
    `;
    
    await query(sql, [
      token,
      sessionData.expires_at,
      sessionData.created_at
    ]);
    
    return sessionData;
  } catch (error) {
    console.error('创建admin session失败:', error);
    throw error;
  }
}

// 获取session
async function getSession(token) {
  if (isTestEnv) {
    // 测试环境从内存获取
    const session = memoryStore.get(token);
    
    // 检查session是否为null或undefined
    if (!session || !session.expires_at) {
      if (session) {
        memoryStore.delete(token); // 删除无效session
      }
      return null;
    }
    
    if (new Date() <= session.expires_at) {
      return session;
    }
    
    // 删除过期session
    memoryStore.delete(token);
    return null;
  }
  
  try {
    const sql = 'SELECT * FROM admin_sessions WHERE token = ? AND expires_at > NOW()';
    const sessions = await query(sql, [token]);
    return sessions.length > 0 ? sessions[0] : null;
  } catch (error) {
    console.error('获取admin session失败:', error);
    return null;
  }
}

// 删除session
async function deleteSession(token) {
  if (isTestEnv) {
    // 测试环境从内存删除
    return memoryStore.delete(token);
  }
  
  try {
    const sql = 'DELETE FROM admin_sessions WHERE token = ?';
    const result = await query(sql, [token]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('删除admin session失败:', error);
    return false;
  }
}

// 检查session是否有效
async function isValidSession(token) {
  try {
    const session = await getSession(token);
    return session !== null;
  } catch (error) {
    console.error('检查admin session有效性失败:', error);
    return false;
  }
}

// 清理过期sessions
async function cleanupExpiredSessions() {
  if (isTestEnv) {
    // 测试环境清理内存中的过期session
    const now = new Date();
    let cleaned = 0;
    for (const [token, session] of memoryStore.entries()) {
      // 检查session是否为null或undefined，以及是否有expires_at属性
      if (!session || !session.expires_at) {
        memoryStore.delete(token);
        cleaned++;
        continue;
      }
      
      if (now > session.expires_at) {
        memoryStore.delete(token);
        cleaned++;
      }
    }
    return cleaned;
  }
  
  try {
    const sql = 'DELETE FROM admin_sessions WHERE expires_at <= NOW()';
    const result = await query(sql);
    console.log(`清理了 ${result.affectedRows} 个过期的admin session`);
    return result.affectedRows;
  } catch (error) {
    console.error('清理过期admin sessions失败:', error);
    return 0;
  }
}

// 定期清理过期sessions (每小时执行一次)
// 在测试环境中跳过定时器设置，避免Jest开放句柄警告
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  isValidSession,
  cleanupExpiredSessions
};