const express = require('express');
const { query } = require('../config/database');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 获取用户健康记录
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type = 'all' } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (type !== 'all') {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM health_records ${whereClause}`, params);
    const total = countResult[0].total;
    
    // 查询列表
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const sql = `
      SELECT id, type, value, unit, status, notes, 
             DATE_FORMAT(record_time, '%Y-%m-%d %H:%i') as recordTime,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as createdAt
      FROM health_records 
      ${whereClause}
      ORDER BY record_time DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const records = await query(sql, params);
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { records, pagination });
    
  } catch (error) {
    console.error('获取健康记录失败:', error);
    Utils.error(res, '获取健康记录失败');
  }
});

// 添加健康记录
router.post('/records', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, value, unit, status, notes, recordTime } = req.body;
    
    // 验证必填字段
    if (!type || !value) {
      return Utils.error(res, '缺少必填字段', 400);
    }
    
    // 验证记录类型
    const validTypes = ['bloodPressure', 'bloodSugar', 'heartRate', 'weight', 'temperature'];
    if (!validTypes.includes(type)) {
      return Utils.error(res, '无效的记录类型', 400);
    }
    
    // 处理记录时间，转换为MySQL支持的datetime格式
    let recordTimeStr;
    if (recordTime) {
      // 如果提供了recordTime，转换ISO格式为MySQL datetime格式
      const date = new Date(recordTime);
      recordTimeStr = date.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      // 如果没有提供，使用当前时间
      const now = new Date();
      recordTimeStr = now.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // 生成UUID作为主键
    const recordId = uuidv4();
    
    const result = await query(`
      INSERT INTO health_records (id, user_id, type, value, unit, status, notes, record_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [recordId, userId, type, value, unit || '', status || 'normal', notes || null, recordTimeStr]);
    
    const record = {
      id: recordId,
      type,
      value,
      unit: unit || '',
      status: status || 'normal',
      notes: notes || null,
      recordTime: recordTimeStr,
      createdAt: new Date()
    };
    
    Utils.response(res, { record }, '健康记录添加成功');
    
  } catch (error) {
    console.error('添加健康记录失败:', error);
    Utils.error(res, '添加健康记录失败');
  }
});

// 获取健康指标统计
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    const daysNum = Math.min(365, Math.max(1, parseInt(days, 10) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    // 转换为MySQL支持的datetime格式
    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const sql = `
      SELECT type, value, unit, status,
             DATE_FORMAT(record_time, '%Y-%m-%d') as date
      FROM health_records 
      WHERE user_id = ? AND record_time >= ?
      ORDER BY type, record_time DESC
    `;
    
    const records = await query(sql, [userId, startDateStr]);
    
    // 按类型分组统计
    const metrics = {};
    records.forEach(record => {
      if (!metrics[record.type]) {
        metrics[record.type] = {
          type: record.type,
          latestValue: record.value,
          unit: record.unit,
          status: record.status,
          records: []
        };
      }
      metrics[record.type].records.push({
        value: record.value,
        date: record.date,
        status: record.status
      });
    });
    
    Utils.response(res, { metrics: Object.values(metrics) });
    
  } catch (error) {
    console.error('获取健康指标统计失败:', error);
    Utils.error(res, '获取健康指标统计失败');
  }
});

// 获取健康建议
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户最近的健康记录
    const recentRecords = await query(`
      SELECT type, value, status
      FROM health_records 
      WHERE user_id = ? AND record_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY record_time DESC
      LIMIT 10
    `, [userId]);
    
    // 基于健康数据生成个性化建议
    const suggestions = [];
    
    // 基础建议
    suggestions.push({
      id: 1,
      icon: '🏃',
      title: '适度运动',
      description: '建议每天进行30分钟的轻度运动，如散步、太极拳等',
      actionText: '查看运动计划',
      action: 'exercise',
      priority: 'normal'
    });
    
    suggestions.push({
      id: 2,
      icon: '🥗',
      title: '均衡饮食',
      description: '注意控制盐分摄入，多吃新鲜蔬菜水果',
      actionText: '饮食建议',
      action: 'diet',
      priority: 'normal'
    });
    
    suggestions.push({
      id: 3,
      icon: '😴',
      title: '规律作息',
      description: '保持充足睡眠，每天7-8小时，避免熬夜',
      actionText: '睡眠指导',
      action: 'sleep',
      priority: 'normal'
    });
    
    // 根据健康记录添加特定建议
    const hasHighBP = recentRecords.some(r => r.type === 'bloodPressure' && r.status === 'warning');
    if (hasHighBP) {
      suggestions.unshift({
        id: 4,
        icon: '⚠️',
        title: '血压管理',
        description: '您的血压偏高，请注意减少盐分摄入，保持心情愉快',
        actionText: '血压管理指南',
        action: 'blood_pressure',
        priority: 'high'
      });
    }
    
    Utils.response(res, { suggestions });
    
  } catch (error) {
    console.error('获取健康建议失败:', error);
    Utils.error(res, '获取健康建议失败');
  }
});

// 删除健康记录
router.delete('/records/:id', authMiddleware, async (req, res) => {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    
    // 检查记录是否存在且属于当前用户
    const existingRecord = await query('SELECT id FROM health_records WHERE id = ? AND user_id = ?', [recordId, userId]);
    if (existingRecord.length === 0) {
      return Utils.error(res, '记录不存在或无权限删除', 404);
    }
    
    await query('DELETE FROM health_records WHERE id = ? AND user_id = ?', [recordId, userId]);
    
    Utils.response(res, null, '健康记录删除成功');
    
  } catch (error) {
    console.error('删除健康记录失败:', error);
    Utils.error(res, '删除健康记录失败');
  }
});

module.exports = router;