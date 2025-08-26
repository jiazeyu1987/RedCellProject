const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 健康相关路由占位
router.get('/', (req, res) => {
  Utils.response(res, { message: 'Health API' });
});

module.exports = router;