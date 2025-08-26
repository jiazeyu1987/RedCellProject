const express = require('express');
const Utils = require('../utils');

const router = express.Router();

// 文件上传路由占位
router.post('/', (req, res) => {
  Utils.response(res, { message: 'Upload API' });
});

module.exports = router;