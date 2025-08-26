const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 简单的用户路由占位
router.get('/', (req, res) => {
  Utils.response(res, { message: 'Users API' });
});

module.exports = router;