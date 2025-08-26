const express = require('express');
const axios = require('axios');
const JWTUtils = require('../utils/jwt');
const UserModel = require('../models/User');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { openId, nickname, avatar, phone, email, realName, gender, birthday } = req.body;
    
    // 验证必填字段
    if (!openId || !nickname) {
      return Utils.error(res, '缺少必填字段：openId 和 nickname 为必填项', 400);
    }
    
    // 检查用户是否已存在
    const existingUser = await UserModel.findByOpenId(openId);
    if (existingUser) {
      return Utils.error(res, '用户已存在', 400);
    }
    
    // 创建用户
    const user = await UserModel.create({
      openId,
      nickname,
      avatar,
      phone,
      email,
      realName,
      gender,
      birthday
    });
    
    // 生成JWT Token
    const token = JWTUtils.generateUserToken({
      userId: user.id,
      openId: user.openId
    });
    
    Utils.response(res, {
      token,
      user: UserModel.getSafeUserInfo ? UserModel.getSafeUserInfo(user) : user
    }, '注册成功');
    
  } catch (error) {
    console.error('用户注册失败:', error);
    Utils.error(res, '注册失败');
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { openId, nickname, avatar } = req.body;
    
    if (!openId) {
      return Utils.error(res, '缺少openId', 400);
    }
    
    // 查找用户
    let user = await UserModel.findByOpenId(openId);
    
    if (!user) {
      // 为新用户创建账户
      if (!nickname) {
        return Utils.error(res, '新用户必须提供昵称', 400);
      }
      
      user = await UserModel.create({
        openId,
        nickname,
        avatar
      });
    }
    
    // 生成JWT Token
    const token = JWTUtils.generateUserToken({
      userId: user.id,
      openId: user.openId
    });
    
    Utils.response(res, {
      token,
      user: UserModel.getSafeUserInfo ? UserModel.getSafeUserInfo(user) : user
    }, '登录成功');
    
  } catch (error) {
    console.error('用户登录失败:', error);
    Utils.error(res, '登录失败');
  }
});

// 微信登录
router.post('/wechat-login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;
    
    if (!code) {
      return Utils.error(res, '缺少微信授权码', 400);
    }
    
    // 获取微信用户信息
    const wxUserInfo = await getWechatUserInfo(code);
    
    if (!wxUserInfo.openid) {
      return Utils.error(res, '微信授权失败', 400);
    }
    
    // 查找或创建用户
    let user = await UserModel.findByOpenId(wxUserInfo.openid);
    
    if (!user) {
      // 创建新用户
      user = await UserModel.create({
        openId: wxUserInfo.openid,
        unionId: wxUserInfo.unionid,
        nickname: userInfo?.nickName || '微信用户',
        avatar: userInfo?.avatarUrl,
        gender: parseGender(userInfo?.gender)
      });
    } else {
      // 更新登录信息
      await UserModel.updateLoginInfo(user.id, req.ip);
    }
    
    // 生成JWT Token
    const token = JWTUtils.generateUserToken({
      userId: user.id,
      openId: user.open_id
    });
    
    Utils.response(res, {
      token,
      userInfo: UserModel.getSafeUserInfo(user)
    }, '登录成功');
    
  } catch (error) {
    console.error('微信登录失败:', error);
    Utils.error(res, '登录失败');
  }
});

// 获取用户信息
router.get('/user-info', authMiddleware, async (req, res) => {
  try {
    Utils.response(res, { user: UserModel.getSafeUserInfo ? UserModel.getSafeUserInfo(req.user) : req.user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    Utils.error(res, '获取用户信息失败');
  }
});

// 获取用户信息别名路由（为了支持测试）
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    Utils.response(res, { user: UserModel.getSafeUserInfo ? UserModel.getSafeUserInfo(req.user) : req.user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    Utils.error(res, '获取用户信息失败');
  }
});

// 更新用户信息
router.put('/user-info', authMiddleware, async (req, res) => {
  try {
    const updateData = req.body;
    
    // 验证必填字段
    const requiredFields = ['realName'];
    const missing = Utils.validateRequired(updateData, requiredFields);
    
    if (missing.length > 0) {
      return Utils.error(res, `缺少必填字段: ${missing.join(', ')}`, 400);
    }
    
    // 验证手机号格式
    if (updateData.phone && !/^1[3-9]\d{9}$/.test(updateData.phone)) {
      return Utils.error(res, '手机号格式不正确', 400);
    }
    
    // 验证邮箱格式
    if (updateData.email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(updateData.email)) {
      return Utils.error(res, '邮箱格式不正确', 400);
    }
    
    const updatedUser = await UserModel.update(req.user.id, {
      real_name: updateData.realName,
      phone: updateData.phone,
      email: updateData.email,
      age: updateData.age,
      gender: updateData.gender,
      birthday: updateData.birthday,
      emergency_contact: updateData.emergencyContact,
      emergency_relation: updateData.emergencyRelation
    });
    
    Utils.response(res, UserModel.getSafeUserInfo(updatedUser), '更新成功');
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    Utils.error(res, '更新失败');
  }
});

// 更新用户信息别名路由（为了支持测试）
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updateData = req.body;
    
    // 验证手机号格式
    if (updateData.phone && !/^1[3-9]\d{9}$/.test(updateData.phone)) {
      return Utils.error(res, '手机号格式不正确', 400);
    }
    
    // 验证邮箱格式
    if (updateData.email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(updateData.email)) {
      return Utils.error(res, '邮箱格式不正确', 400);
    }
    
    const updatedUser = await UserModel.update(req.user.id, {
      nickname: updateData.nickname,
      real_name: updateData.realName,
      phone: updateData.phone,
      email: updateData.email,
      age: updateData.age,
      gender: updateData.gender,
      birthday: updateData.birthday,
      emergency_contact: updateData.emergencyContact,
      emergency_relation: updateData.emergencyRelation
    });
    
    Utils.response(res, { user: UserModel.getSafeUserInfo ? UserModel.getSafeUserInfo(updatedUser) : updatedUser }, '更新成功');
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    Utils.error(res, '更新失败');
  }
});

// 退出登录
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // 这里可以实现Token黑名单机制
    Utils.response(res, null, '退出成功');
  } catch (error) {
    console.error('退出登录失败:', error);
    Utils.error(res, '退出失败');
  }
});

// 获取微信用户信息
async function getWechatUserInfo(code) {
  try {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = {
      appid: process.env.WECHAT_APPID,
      secret: process.env.WECHAT_SECRET,
      js_code: code,
      grant_type: 'authorization_code'
    };
    
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('获取微信用户信息失败:', error);
    throw new Error('微信API调用失败');
  }
}

// 解析性别
function parseGender(gender) {
  const genderMap = { 1: '男', 2: '女', 0: '未知' };
  return genderMap[gender] || '未知';
}

module.exports = router;