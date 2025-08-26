const { query } = require('../config/database');
const Utils = require('../utils');

class UserModel {
  // 通过OpenID查找用户
  static async findByOpenId(openId) {
    const sql = 'SELECT * FROM users WHERE open_id = ?';
    const users = await query(sql, [openId]);
    
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // 返回格式化的用户数据（含脱敏处理）
    return {
      id: user.id,
      openId: user.open_id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone ? Utils.maskPhone(user.phone) : null,
      email: user.email ? Utils.maskEmail(user.email) : null,
      realName: user.real_name || null,
      gender: user.gender,
      birthday: user.birthday,
      status: user.status,
      memberLevel: user.member_level,
      serviceCount: user.service_count,
      totalSpent: parseFloat(user.total_spent || 0),
      createdAt: user.created_at ? new Date(user.created_at) : null,
      updatedAt: user.updated_at ? new Date(user.updated_at) : null
    };
  }
  
  // 通过ID查找用户
  static async findById(id) {
    // 验证ID参数
    if (!id || isNaN(parseInt(id))) {
      throw new Error('无效的用户ID');
    }
    
    const sql = 'SELECT * FROM users WHERE id = ?';
    const users = await query(sql, [id]);
    
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // 返回格式化的用户数据
    return {
      id: user.id,
      openId: user.open_id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone || null,
      email: user.email || null,
      realName: user.real_name || null,
      gender: user.gender,
      birthday: user.birthday,
      status: user.status,
      memberLevel: user.member_level,
      serviceCount: user.service_count,
      totalSpent: parseFloat(user.total_spent || 0),
      emergencyContact: user.emergency_contact || null,
      emergencyRelation: user.emergency_relation || null,
      createdAt: user.created_at ? new Date(user.created_at) : null,
      updatedAt: user.updated_at ? new Date(user.updated_at) : null
    };
  }
  
  // 创建用户
  static async create(userData) {
    // 验证必填字段
    if (!userData || !userData.openId || !userData.nickname) {
      throw new Error('缺少必填字段：openId 和 nickname 为必填项');
    }

    const sql = `
      INSERT INTO users (
        open_id, nickname, avatar, phone, email, real_name,
        gender, birthday, status, member_level, service_count, total_spent,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const now = new Date();
    
    try {
      const result = await query(sql, [
        userData.openId,
        userData.nickname,
        userData.avatar || null,
        userData.phone || null,
        userData.email || null,
        userData.realName || null,
        userData.gender || '未知',
        userData.birthday || null,
        'active',
        'regular',
        0,
        0.00,
        now,
        now
      ]);
      
      const user = await this.findById(result.insertId);
      
      if (!user) {
        throw new Error(`用户创建失败：无法找到刚创建的用户 ID=${result.insertId}`);
      }
      
      // 返回格式化的用户数据
      return {
        id: user.id,
        openId: user.openId,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        email: user.email,
        realName: user.realName,
        gender: user.gender,
        birthday: user.birthday,
        status: user.status,
        memberLevel: user.memberLevel,
        serviceCount: user.serviceCount,
        totalSpent: parseFloat(user.totalSpent),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      };
    } catch (error) {
      // 在测试环境中对预期的重复条目错误不输出详细日忕
      const isDuplicateEntry = error.code === 'ER_DUP_ENTRY';
      const isTestEnv = process.env.NODE_ENV === 'test';
      
      if (!isTestEnv || !isDuplicateEntry) {
        console.error('创建用户失败:', error);
      }
      throw error;
    }
  }
  
  // 更新用户登录信息
  static async updateLoginInfo(userId, loginIP) {
    // 暂时只更新updated_at字段，因为数据库中没有last_login_time和last_login_ip字段
    const sql = `
      UPDATE users 
      SET updated_at = ?
      WHERE id = ?
    `;
    
    const now = new Date();
    await query(sql, [now, userId]);
  }
  
  // 更新用户信息
  static async update(userId, updateData) {
    // 验证输入数据
    if (updateData.phone && updateData.phone.length > 0) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(updateData.phone)) {
        throw new Error('手机号格式不正确');
      }
    }
    
    if (updateData.email && updateData.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new Error('邮箱格式不正确');
      }
    }
    
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'nickname', 'real_name', 'phone', 'email', 'age', 'gender', 'birthday',
      'emergency_contact', 'emergency_relation', 'health_condition',
      'allergies', 'medical_history', 'preferred_services'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
    
    // 处理realName字段映射
    if (updateData.realName !== undefined) {
      fields.push('real_name = ?');
      values.push(updateData.realName);
    }
    
    if (fields.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    fields.push('updated_at = ?');
    values.push(new Date());
    values.push(userId);
    
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);
    
    // 返回更新后的用户信息
    const updatedUser = await this.findById(userId);
    
    // 确保时间戳是Date对象
    if (updatedUser) {
      updatedUser.updatedAt = new Date(updatedUser.updatedAt);
      updatedUser.createdAt = new Date(updatedUser.createdAt);
    }
    
    return updatedUser;
  }
  
  // 获取用户列表（管理员功能）
  static async getList(options = {}) {
    try {
      const {
        keyword = '',
        status = 'all',
        memberLevel = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        pageSize = 20
      } = options;
      
      let whereConditions = [];
      let params = [];
      
      // 关键词搜索
      if (keyword) {
        whereConditions.push('(nickname LIKE ? OR real_name LIKE ? OR phone LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      
      // 状态筛选
      if (status !== 'all') {
        whereConditions.push('status = ?');
        params.push(status);
      }
      
      // 会员等级筛选
      if (memberLevel !== 'all') {
        whereConditions.push('member_level = ?');
        params.push(memberLevel);
      }
      
      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 排序
      const orderBy = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      
      // 分页参数处理
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
      const limitNum = pageSizeNum;
      const offsetNum = (pageNum - 1) * pageSizeNum;
      
      console.log('分页参数:', { pageNum, pageSizeNum, limitNum, offsetNum });
      
      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countResult = await query(countSql, params);
      const total = countResult[0].total;
      
      // 查询列表 - 使用字符串拼接而不是参数化查询来避免参数类型问题
      const listSql = `
        SELECT 
          id, nickname, real_name, phone, email, avatar, status, member_level,
          service_count, total_spent, created_at, updated_at
        FROM users 
        ${whereClause} 
        ${orderBy} 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
      
      console.log('执行查询 SQL:', listSql);
      console.log('查询参数:', params);
      
      const list = await query(listSql, params);
      
      // 脱敏处理和字段格式转换
      const processedList = list.map(user => ({
        id: user.id,
        nickname: user.nickname,
        realName: user.real_name,
        phone: Utils.maskPhone(user.phone),
        email: Utils.maskEmail(user.email),
        avatar: user.avatar,
        status: user.status,
        memberLevel: user.member_level,
        serviceCount: user.service_count,
        totalSpent: user.total_spent,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));
      
      return {
        users: processedList,
        pagination: {
          total,
          page: pageNum,
          limit: pageSizeNum,
          totalPages: Math.ceil(total / pageSizeNum)
        }
      };
      
    } catch (error) {
      console.error('getList 方法错误:', error);
      throw error;
    }
  }
  
  // 获取用户详情（管理员功能）
  static async getDetailById(userId) {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }
    
    // 获取用户统计信息
    const statsSql = `
      SELECT 
        COUNT(*) as totalBookings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedBookings,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as totalSpent
      FROM bookings 
      WHERE user_id = ?
    `;
    
    try {
      const statsResult = await query(statsSql, [userId]);
      const stats = statsResult[0] || { totalBookings: 0, completedBookings: 0, totalSpent: 0 };
      
      return {
        user,
        statistics: {
          totalBookings: parseInt(stats.totalBookings) || 0,
          completedBookings: parseInt(stats.completedBookings) || 0,
          totalSpent: parseFloat(stats.totalSpent) || 0
        }
      };
    } catch (error) {
      console.error('获取用户统计信息失败:', error);
      // 如果统计查询失败，返回默认值
      return {
        user,
        statistics: {
          totalBookings: 0,
          completedBookings: 0,
          totalSpent: 0
        }
      };
    }
  }
  
  // 更新用户状态
  static async updateStatus(userId, status, reason = null) {
    // 验证状态值
    const validStatuses = ['active', 'inactive', 'disabled', 'frozen'];
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的用户状态: ${status}`);
    }
    
    try {
      const sql = `
        UPDATE users 
        SET status = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const result = await query(sql, [status, new Date(), userId]);
      
      // 记录状态变更日志
      if (reason) {
        await this.logStatusChange(userId, status, reason);
      }
      
      // 返回是否成功更新（affectedRows > 0表示成功）
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新用户状态失败:', error);
      return false;
    }
  }
  
  // 记录状态变更日志
  static async logStatusChange(userId, status, reason) {
    // 暂时禁用，因为user_status_logs表不存在
    // TODO: 将来可以创建该表或使用其他日志方式
    console.log(`用户 ${userId} 状态变更为 ${status}，原因: ${reason}`);
  }
  
  // 增加服务次数
  static async incrementServiceCount(userId, amount = 1) {
    const sql = `
      UPDATE users 
      SET service_count = service_count + ?, updated_at = ?
      WHERE id = ?
    `;
    
    await query(sql, [amount, new Date(), userId]);
  }
  
  // 增加消费金额
  static async incrementTotalSpent(userId, amount) {
    const sql = `
      UPDATE users 
      SET total_spent = total_spent + ?, updated_at = ?
      WHERE id = ?
    `;
    
    await query(sql, [amount, new Date(), userId]);
  }
  
  // 获取用户统计信息
  static async getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
        COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen_users,
        COUNT(CASE WHEN member_level = 'vip' THEN 1 END) as vip_users,
        AVG(service_count) as avg_service_count,
        SUM(total_spent) as total_revenue
      FROM users
    `;
    
    const result = await query(sql);
    return result[0];
  }
  
  // 获取安全的用户信息（用于返回给前端）
  static getSafeUserInfo(user) {
    if (!user) return null;
    
    const safeUser = { ...user };
    
    // 手机号脱敏
    if (safeUser.phone) {
      safeUser.phone = Utils.maskPhone(safeUser.phone);
    }
    
    // 返回脱敏后的用户信息
    return safeUser;
  }
}

module.exports = UserModel;