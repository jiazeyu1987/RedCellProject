const express = require('express');
const { query } = require('../config/database');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// 创建预约
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { serviceType, serviceDate, serviceTime, addressId, notes } = req.body;
    const userId = req.user.id;
    
    // 验证必填字段
    if (!serviceType || !serviceDate || !serviceTime || !addressId) {
      return Utils.error(res, '缺少必填字段', 400);
    }
    
    // 验证服务类型
    const validServiceTypes = ['basic_health', 'comprehensive_health', 'home_care', 'emergency_care'];
    if (!validServiceTypes.includes(serviceType)) {
      return Utils.error(res, '无效的服务类型', 400);
    }
    
    // 验证日期不能是过去时间
    const bookingDate = new Date(serviceDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return Utils.error(res, '不能选择过去的日期', 400);
    }
    
    // 验证地址存在且属于当前用户
    const addressCheck = await query('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    if (addressCheck.length === 0) {
      return Utils.error(res, '地址不存在或不属于当前用户', 400);
    }
    
    // 计算费用
    const serviceTypePrices = {
      'basic_health': 100.00,
      'comprehensive_health': 200.00,
      'home_care': 150.00,
      'emergency_care': 300.00
    };
    const totalAmount = serviceTypePrices[serviceType] || 100.00;
    
    // 创建预约
    const result = await query(`
      INSERT INTO bookings (user_id, service_type, service_date, service_time, address_id, status, total_amount, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())
    `, [userId, serviceType, serviceDate, serviceTime, addressId, totalAmount, notes || null]);
    
    const bookingId = result.insertId;
    
    // 返回创建的预约信息
    const booking = {
      id: bookingId,
      serviceType,
      serviceDate,
      serviceTime,
      addressId,
      status: 'pending',
      totalAmount,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    Utils.response(res, { booking }, '预约创建成功');
    
  } catch (error) {
    console.error('创建预约失败:', error);
    Utils.error(res, '创建预约失败');
  }
});

// 获取用户预约列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status = 'all' } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM bookings ${whereClause}`, params);
    const total = countResult[0].total;
    
    // 查询列表
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // 使用字符串拼接而不是参数化查询来避免参数类型问题
    const sql = `
      SELECT id, service_type as serviceType, service_date as serviceDate, 
             TIME_FORMAT(service_time, '%H:%i') as serviceTime,
             status, total_amount as totalAmount, notes, created_at as createdAt, updated_at as updatedAt
      FROM bookings 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const bookings = await query(sql, params);
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { bookings, pagination });
    
  } catch (error) {
    console.error('获取预约列表失败:', error);
    Utils.error(res, '获取预约列表失败');
  }
});

// 获取预约详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    // 检查预约是否存在
    const allBookings = await query('SELECT user_id FROM bookings WHERE id = ?', [bookingId]);
    if (allBookings.length === 0) {
      return Utils.error(res, '预约不存在', 404);
    }
    
    // 检查是否属于当前用户
    if (allBookings[0].user_id !== userId) {
      return Utils.error(res, '权限不足', 403);
    }
    
    const sql = `
      SELECT id, service_type as serviceType, service_date as serviceDate, 
             TIME_FORMAT(service_time, '%H:%i') as serviceTime,
             status, total_amount as totalAmount, notes, created_at as createdAt, updated_at as updatedAt
      FROM bookings 
      WHERE id = ? AND user_id = ?
    `;
    
    const bookings = await query(sql, [bookingId, userId]);
    
    Utils.response(res, { booking: bookings[0] });
    
  } catch (error) {
    console.error('获取预约详情失败:', error);
    Utils.error(res, '获取预约详情失败');
  }
});

// 更新预约
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const { serviceDate, serviceTime, notes } = req.body;
    
    // 检查预约是否存在
    const allBookings = await query('SELECT status FROM bookings WHERE id = ?', [bookingId]);
    if (allBookings.length === 0) {
      return Utils.error(res, '预约不存在', 404);
    }
    
    // 检查是否属于当前用户
    const userBookings = await query('SELECT status FROM bookings WHERE id = ? AND user_id = ?', [bookingId, userId]);
    if (userBookings.length === 0) {
      return Utils.error(res, '权限不足', 403);
    }
    
    const currentStatus = userBookings[0].status;
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return Utils.error(res, '无法修改已完成或已取消的预约', 400);
    }
    
    // 更新预约
    const fields = [];
    const values = [];
    
    if (serviceDate) {
      fields.push('service_date = ?');
      values.push(serviceDate);
    }
    if (serviceTime) {
      fields.push('service_time = ?');
      values.push(serviceTime);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
    }
    
    if (fields.length === 0) {
      return Utils.error(res, '没有可更新的字段', 400);
    }
    
    fields.push('updated_at = NOW()');
    values.push(bookingId, userId);
    
    await query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    
    // 返回更新后的预约
    const updatedBookings = await query(`
      SELECT id, service_type as serviceType, service_date as serviceDate, 
             TIME_FORMAT(service_time, '%H:%i') as serviceTime,
             status, total_amount as totalAmount, notes, created_at as createdAt, updated_at as updatedAt
      FROM bookings 
      WHERE id = ? AND user_id = ?
    `, [bookingId, userId]);
    
    Utils.response(res, { booking: updatedBookings[0] }, '预约更新成功');
    
  } catch (error) {
    console.error('更新预约失败:', error);
    Utils.error(res, '更新预约失败');
  }
});

// 取消预约
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    // 检查预约是否存在且属于当前用户
    const existingBookings = await query('SELECT status FROM bookings WHERE id = ? AND user_id = ?', [bookingId, userId]);
    if (existingBookings.length === 0) {
      return Utils.error(res, '预约不存在', 404);
    }
    
    const currentStatus = existingBookings[0].status;
    if (currentStatus === 'completed') {
      return Utils.error(res, '无法取消已完成的预约', 400);
    }
    if (currentStatus === 'cancelled') {
      return Utils.error(res, '预约已取消', 400);
    }
    
    // 取消预约
    await query('UPDATE bookings SET status = "cancelled", updated_at = NOW() WHERE id = ? AND user_id = ?', [bookingId, userId]);
    
    Utils.response(res, null, '预约取消成功');
    
  } catch (error) {
    console.error('取消预约失败:', error);
    Utils.error(res, '取消预约失败');
  }
});

module.exports = router;