const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 获取应用配置
router.get('/', (req, res) => {
  try {
    const config = {
      version: '1.0.0',
      features: {
        communityEnabled: true,
        hospitalBookingEnabled: true,
        videoCallEnabled: false
      },
      contact: {
        phone: '400-888-8888',
        email: 'support@health-guard.com',
        workTime: '9:00-18:00'
      },
      upload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
      }
    };
    
    Utils.response(res, config);
  } catch (error) {
    console.error('获取配置失败:', error);
    Utils.error(res, '获取配置失败');
  }
});

module.exports = router;