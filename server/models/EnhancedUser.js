const { query } = require('../config/database');

class EnhancedUserModel {
  
  /**
   * 获取增强的用户列表
   * 包含订阅套餐、付费信息、地址信息、健康状况等完整信息
   */
  static async getEnhancedUsers(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      status,
      subscriptionStatus,
      sortBy = 'u.created_at',
      sortOrder = 'desc'
    } = params;

    const offset = (page - 1) * pageSize;
    let whereConditions = [];
    let queryParams = [];

    // 安全的排序字段白名单
    const allowedSortFields = {
      'u.created_at': 'u.created_at',
      'u.nickname': 'u.nickname', 
      'u.real_name': 'u.real_name',
      'u.phone': 'u.phone',
      'u.age': 'u.age'
    };
    
    const safeSortBy = allowedSortFields[sortBy] || 'u.created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 构建查询条件
    if (keyword) {
      whereConditions.push(`(u.nickname LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)`);
      const keywordPattern = `%${keyword}%`;
      queryParams.push(keywordPattern, keywordPattern, keywordPattern);
    }

    if (status) {
      whereConditions.push('u.status = ?');
      queryParams.push(status);
    }

    if (subscriptionStatus) {
      whereConditions.push('u.subscription_status = ?');
      queryParams.push(subscriptionStatus);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 主查询SQL - 使用多表联查获取完整信息
    const sql = `
      SELECT 
        u.id,
        u.nickname,
        u.real_name,
        u.phone,
        u.age,
        u.gender,
        u.status,
        u.subscription_status,
        u.current_subscription_id,
        u.last_payment_time,
        u.total_payment_amount,
        u.payment_count,
        u.created_at as register_time,
        
        -- 订阅套餐信息
        sp.name as package_name,
        sp.level as package_level,
        sp.price as package_price,
        us.status as sub_status,
        us.start_date as sub_start_date,
        us.end_date as sub_end_date,
        sp.price as monthly_price,
        us.remaining_quota,
        0 as services_used,
        us.remaining_quota as services_remaining,
        
        -- 默认地址信息
        ua.contact_name as addr_contact_name,
        ua.contact_phone as addr_contact_phone,
        ua.address as addr_address,
        NULL as addr_province,
        NULL as addr_city,
        NULL as addr_district,
        ua.visit_count as addr_visit_count,
        ua.last_visit as addr_last_visit,
        
        -- 统计信息（通过子查询获取）
        (SELECT COUNT(*) FROM health_records WHERE user_id = u.id) as health_record_count,
        (SELECT MAX(record_time) FROM health_records WHERE user_id = u.id) as last_health_record_time,
        (SELECT SUM(amount) FROM payment_records WHERE user_id = u.id AND status = 'success') as total_spent_calculated,
        (SELECT MAX(pay_time) FROM payment_records WHERE user_id = u.id AND status = 'success') as last_payment_time_calculated,
        (SELECT COUNT(*) FROM payment_records WHERE user_id = u.id AND status = 'success') as payment_count_calculated
      
      FROM users u
      LEFT JOIN user_subscriptions us ON u.current_subscription_id = us.id
      LEFT JOIN subscription_packages sp ON us.plan_id = sp.id
      LEFT JOIN user_addresses ua ON u.id = ua.user_id AND ua.is_default = 1
      
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    
    try {
      const users = await query(sql, queryParams);
      
      // 处理和丰富用户数据
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          // 获取健康状况详情
          const healthDetails = await this.getHealthSummary(user.id);
          
          // 获取主要病情信息
          const mainConditions = await this.getMainConditions(user.id);
          
          return {
            id: user.id,
            nickname: user.nickname,
            realName: user.real_name,
            phone: user.phone,
            age: user.age,
            gender: user.gender,
            status: user.status,
            registerTime: user.register_time,
            
            // 订阅套餐信息
            subscription: user.package_name ? {
              packageId: user.current_subscription_id,
              packageName: user.package_name,
              level: user.package_level,
              status: user.sub_status,
              startDate: user.sub_start_date,
              endDate: user.sub_end_date,
              monthlyPrice: parseFloat(user.monthly_price || user.package_price || 0),
              servicesUsed: user.services_used || 0,
              servicesRemaining: user.services_remaining || 0
            } : null,
            
            // 付费信息
            payment: {
              totalSpent: parseFloat(user.total_spent_calculated || user.total_payment_amount || 0),
              lastPaymentTime: user.last_payment_time_calculated || user.last_payment_time,
              paymentCount: user.payment_count_calculated || user.payment_count || 0
            },
            
            // 地址信息
            address: user.addr_address ? {
              default: {
                contactName: user.addr_contact_name,
                contactPhone: user.addr_contact_phone,
                address: user.addr_address,
                province: user.addr_province,
                city: user.addr_city,
                district: user.addr_district,
                visitCount: user.addr_visit_count || 0,
                lastServiceTime: user.addr_last_visit
              }
            } : null,
            
            // 健康状况信息
            health: {
              recordCount: user.health_record_count || 0,
              lastRecordTime: user.last_health_record_time,
              riskLevel: healthDetails.riskLevel,
              mainConditions: mainConditions
            }
          };
        })
      );

      // 获取总数统计
      const countSql = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
      const countParams = queryParams.slice(0, -2); // 移除LIMIT和OFFSET参数
      const countResult = await query(countSql, countParams);

      return {
        users: enrichedUsers,
        pagination: {
          current: page,
          pageSize,
          total: countResult[0].total
        }
      };

    } catch (error) {
      console.error('获取增强用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户健康状况摘要
   */
  static async getHealthSummary(userId) {
    try {
      // 获取最近的健康记录数量和类型
      const recentRecordsSql = `
        SELECT type, COUNT(*) as count, MAX(record_time) as latest_time
        FROM health_records 
        WHERE user_id = ? AND record_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY type
        ORDER BY latest_time DESC
      `;
      
      const recentRecords = await query(recentRecordsSql, [userId]);
      
      // 简化的风险评估逻辑
      let riskLevel = 'low';
      
      // 基于健康记录数量和类型评估风险
      const recordCount = recentRecords.reduce((sum, record) => sum + record.count, 0);
      const recordTypes = recentRecords.length;
      
      if (recordCount > 20 || recordTypes > 5) {
        riskLevel = 'high';
      } else if (recordCount > 10 || recordTypes > 3) {
        riskLevel = 'medium';
      }
      
      return {
        riskLevel,
        recentRecords: recordCount,
        recordTypes: recordTypes
      };
      
    } catch (error) {
      console.error('获取健康状况摘要失败:', error);
      return {
        riskLevel: 'unknown',
        recentRecords: 0,
        recordTypes: 0
      };
    }
  }

  /**
   * 获取用户主要病情信息
   */
  static async getMainConditions(userId) {
    try {
      // 从健康记录中提取常见的病情类型
      const conditionsSql = `
        SELECT type, value, COUNT(*) as frequency, MAX(record_time) as latest_record
        FROM health_records 
        WHERE user_id = ? 
          AND type IN ('blood_pressure', 'blood_sugar', 'condition', 'symptom')
          AND record_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        GROUP BY type, value
        ORDER BY frequency DESC, latest_record DESC
        LIMIT 5
      `;
      
      const conditions = await query(conditionsSql, [userId]);
      
      // 转换为可读的病情描述
      const conditionMap = {
        'blood_pressure': '血压异常',
        'blood_sugar': '血糖异常', 
        'condition': '慢性病',
        'symptom': '症状'
      };
      
      return conditions.map(condition => {
        if (condition.type === 'condition' || condition.type === 'symptom') {
          return condition.value;
        }
        return conditionMap[condition.type] || condition.type;
      }).slice(0, 3); // 最多返回3个主要病情
      
    } catch (error) {
      console.error('获取主要病情失败:', error);
      return [];
    }
  }

  /**
   * 获取用户完整详情
   */
  static async getUserComplete(userId) {
    try {
      const users = await this.getEnhancedUsers({
        page: 1,
        pageSize: 1,
        keyword: userId // 这里需要改进查询逻辑
      });
      
      if (users.users.length === 0) {
        return null;
      }
      
      const user = users.users[0];
      
      // 获取更详细的信息
      const detailedInfo = await Promise.all([
        this.getUserAllAddresses(userId),
        this.getUserPaymentHistory(userId),
        this.getUserHealthRecords(userId)
      ]);
      
      return {
        ...user,
        allAddresses: detailedInfo[0],
        paymentHistory: detailedInfo[1],
        healthRecords: detailedInfo[2]
      };
      
    } catch (error) {
      console.error('获取用户完整详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户所有地址
   */
  static async getUserAllAddresses(userId) {
    try {
      const sql = `
        SELECT id, contact_name, contact_phone, address, 
               province, city, district, is_default, 
               visit_count, last_visit, create_time
        FROM user_addresses 
        WHERE user_id = ? 
        ORDER BY is_default DESC, create_time DESC
      `;
      
      return await query(sql, [userId]);
      
    } catch (error) {
      console.error('获取用户地址失败:', error);
      return [];
    }
  }

  /**
   * 获取用户付费历史
   */
  static async getUserPaymentHistory(userId) {
    try {
      const sql = `
        SELECT id, amount, payment_method, payment_status, 
               order_no, payment_time, create_time, remark
        FROM payment_records 
        WHERE user_id = ? 
        ORDER BY create_time DESC
        LIMIT 20
      `;
      
      return await query(sql, [userId]);
      
    } catch (error) {
      console.error('获取用户付费历史失败:', error);
      return [];
    }
  }

  /**
   * 获取用户健康记录
   */
  static async getUserHealthRecords(userId) {
    try {
      const sql = `
        SELECT id, type, value, unit, status, record_time, 
               source, notes, create_time
        FROM health_records 
        WHERE user_id = ? 
        ORDER BY record_time DESC
        LIMIT 50
      `;
      
      return await query(sql, [userId]);
      
    } catch (error) {
      console.error('获取用户健康记录失败:', error);
      return [];
    }
  }

  /**
   * 获取用户池统计信息
   */
  static async getUserPoolStatistics() {
    try {
      const statisticsSql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscribers,
          COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_subscribers,
          COUNT(CASE WHEN subscription_status = 'none' THEN 1 END) as non_subscribers,
          AVG(total_payment_amount) as avg_payment_amount,
          SUM(total_payment_amount) as total_revenue,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users
        FROM users
      `;
      
      const stats = await query(statisticsSql);
      return stats[0];
      
    } catch (error) {
      console.error('获取用户池统计信息失败:', error);
      return {
        total_users: 0,
        active_subscribers: 0,
        expired_subscribers: 0,
        non_subscribers: 0,
        avg_payment_amount: 0,
        total_revenue: 0,
        active_users: 0,
        inactive_users: 0
      };
    }
  }
}

module.exports = EnhancedUserModel;