const express = require('express');
const { query } = require('../config/database');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// 获取服务类型列表（根路径）
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT id, name, description, price, duration, category, icon
      FROM service_types 
      WHERE is_active = 1 
      ORDER BY sort_order ASC, id ASC
    `;
    
    const services = await query(sql);
    
    // 转换数据类型
    const formattedServices = services.map(service => ({
      ...service,
      price: parseFloat(service.price),
      duration: parseInt(service.duration, 10)
    }));
    
    Utils.response(res, { services: formattedServices });
    
  } catch (error) {
    console.error('获取服务类型失败:', error);
    Utils.error(res, '获取服务类型失败');
  }
});

// 获取服务类型列表
router.get('/types', async (req, res) => {
  try {
    const sql = `
      SELECT id, name, description, price, duration, category, icon
      FROM service_types 
      WHERE is_active = 1 
      ORDER BY sort_order ASC, id ASC
    `;
    
    const serviceTypes = await query(sql);
    Utils.response(res, serviceTypes);
    
  } catch (error) {
    console.error('获取服务类型失败:', error);
    Utils.error(res, '获取服务类型失败');
  }
});

// 获取服务详情
router.get('/types/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const sql = `
      SELECT id, name, description, price, duration, category, icon
      FROM service_types 
      WHERE id = ? AND is_active = 1
    `;
    
    const services = await query(sql, [serviceId]);
    
    if (services.length === 0) {
      return Utils.error(res, '服务类型不存在', 404);
    }
    
    Utils.response(res, services[0]);
    
  } catch (error) {
    console.error('获取服务详情失败:', error);
    Utils.error(res, '获取服务详情失败');
  }
});

module.exports = router;