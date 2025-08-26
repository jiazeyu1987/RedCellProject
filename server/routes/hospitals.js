const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 医院相关路由占位
router.get('/', (req, res) => {
  Utils.response(res, { message: 'Hospitals API' });
});

module.exports = router;