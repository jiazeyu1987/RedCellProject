const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 社区相关路由占位
router.get('/', (req, res) => {
  Utils.response(res, { message: 'Community API' });
});

module.exports = router;