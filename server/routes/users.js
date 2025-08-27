const express = require('express');
const { query } = require('../config/database');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// 获取用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const users = await query(`
      SELECT id, openid, nickname, real_name as realName, avatar, phone, email, 
             age, gender, birthday, member_level as memberLevel,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as registerTime,
             DATE_FORMAT(last_login, '%Y-%m-%d %H:%i') as lastVisit
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return Utils.error(res, '用户不存在', 404);
    }
    
    Utils.response(res, { user: users[0] });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    Utils.error(res, '获取用户信息失败');
  }
});

// 更新用户信息
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, realName, phone, email, age, gender, birthday } = req.body;
    
    const fields = [];
    const values = [];
    
    if (nickname) {
      fields.push('nickname = ?');
      values.push(nickname);
    }
    if (realName) {
      fields.push('real_name = ?');
      values.push(realName);
    }
    if (phone) {
      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return Utils.error(res, '手机号格式不正确', 400);
      }
      fields.push('phone = ?');
      values.push(phone);
    }
    if (email) {
      // 验证邮箱格式
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Utils.error(res, '邮箱格式不正确', 400);
      }
      fields.push('email = ?');
      values.push(email);
    }
    if (age) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        return Utils.error(res, '年龄不合法', 400);
      }
      fields.push('age = ?');
      values.push(ageNum);
    }
    if (gender) {
      if (!['male', 'female'].includes(gender)) {
        return Utils.error(res, '性别参数不正确', 400);
      }
      fields.push('gender = ?');
      values.push(gender);
    }
    if (birthday) {
      fields.push('birthday = ?');
      values.push(birthday);
    }
    
    if (fields.length === 0) {
      return Utils.error(res, '没有要更新的字段', 400);
    }
    
    fields.push('updated_at = NOW()');
    values.push(userId);
    
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    
    Utils.response(res, null, '用户信息更新成功');
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    Utils.error(res, '更新用户信息失败');
  }
});

// 获取家庭成员列表
router.get('/family-members', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const members = await query(`
      SELECT id, name, relation, age, gender, phone, id_card as idCard,
             medical_history as medicalHistory, allergies,
             DATE_FORMAT(created_at, '%Y-%m-%d') as createTime
      FROM family_members 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    Utils.response(res, { members });
    
  } catch (error) {
    console.error('获取家庭成员列表失败:', error);
    Utils.error(res, '获取家庭成员列表失败');
  }
});

// 添加家庭成员
router.post('/family-members', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, relation, age, gender, phone, idCard, medicalHistory, allergies } = req.body;
    
    // 验证必填字段
    if (!name || !relation || !age || !gender) {
      return Utils.error(res, '缺少必填字段', 400);
    }
    
    // 验证年龄
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      return Utils.error(res, '年龄不合法', 400);
    }
    
    // 验证性别
    if (!['male', 'female'].includes(gender)) {
      return Utils.error(res, '性别参数不正确', 400);
    }
    
    // 验证关系
    const validRelations = ['father', 'mother', 'spouse', 'child', 'sibling', 'grandparent', 'other'];
    if (!validRelations.includes(relation)) {
      return Utils.error(res, '关系参数不正确', 400);
    }
    
    // 验证手机号（如果提供）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return Utils.error(res, '手机号格式不正确', 400);
    }
    
    const result = await query(`
      INSERT INTO family_members (user_id, name, relation, age, gender, phone, id_card, medical_history, allergies, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [userId, name, relation, ageNum, gender, phone || null, idCard || null, medicalHistory || null, allergies || null]);
    
    const memberId = result.insertId;
    
    const member = {
      id: memberId,
      name,
      relation,
      age: ageNum,
      gender,
      phone: phone || null,
      idCard: idCard || null,
      medicalHistory: medicalHistory || null,
      allergies: allergies || null,
      createTime: new Date().toISOString().split('T')[0]
    };
    
    Utils.response(res, { member }, '家庭成员添加成功');
    
  } catch (error) {
    console.error('添加家庭成员失败:', error);
    Utils.error(res, '添加家庭成员失败');
  }
});

// 更新家庭成员
router.put('/family-members/:id', authMiddleware, async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.user.id;
    const { name, relation, age, gender, phone, idCard, medicalHistory, allergies } = req.body;
    
    // 检查成员是否存在且属于当前用户
    const existingMember = await query('SELECT id FROM family_members WHERE id = ? AND user_id = ?', [memberId, userId]);
    if (existingMember.length === 0) {
      return Utils.error(res, '家庭成员不存在或无权限修改', 404);
    }
    
    const fields = [];
    const values = [];
    
    if (name) {
      fields.push('name = ?');
      values.push(name);
    }
    if (relation) {
      const validRelations = ['father', 'mother', 'spouse', 'child', 'sibling', 'grandparent', 'other'];
      if (!validRelations.includes(relation)) {
        return Utils.error(res, '关系参数不正确', 400);
      }
      fields.push('relation = ?');
      values.push(relation);
    }
    if (age) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        return Utils.error(res, '年龄不合法', 400);
      }
      fields.push('age = ?');
      values.push(ageNum);
    }
    if (gender) {
      if (!['male', 'female'].includes(gender)) {
        return Utils.error(res, '性别参数不正确', 400);
      }
      fields.push('gender = ?');
      values.push(gender);
    }
    if (phone !== undefined) {
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        return Utils.error(res, '手机号格式不正确', 400);
      }
      fields.push('phone = ?');
      values.push(phone || null);
    }
    if (idCard !== undefined) {
      fields.push('id_card = ?');
      values.push(idCard || null);
    }
    if (medicalHistory !== undefined) {
      fields.push('medical_history = ?');
      values.push(medicalHistory || null);
    }
    if (allergies !== undefined) {
      fields.push('allergies = ?');
      values.push(allergies || null);
    }
    
    if (fields.length === 0) {
      return Utils.error(res, '没有要更新的字段', 400);
    }
    
    fields.push('updated_at = NOW()');
    values.push(memberId, userId);
    
    await query(`UPDATE family_members SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    
    Utils.response(res, null, '家庭成员更新成功');
    
  } catch (error) {
    console.error('更新家庭成员失败:', error);
    Utils.error(res, '更新家庭成员失败');
  }
});

// 删除家庭成员
router.delete('/family-members/:id', authMiddleware, async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.user.id;
    
    // 检查成员是否存在且属于当前用户
    const existingMember = await query('SELECT id FROM family_members WHERE id = ? AND user_id = ?', [memberId, userId]);
    if (existingMember.length === 0) {
      return Utils.error(res, '家庭成员不存在或无权限删除', 404);
    }
    
    await query('DELETE FROM family_members WHERE id = ? AND user_id = ?', [memberId, userId]);
    
    Utils.response(res, null, '家庭成员删除成功');
    
  } catch (error) {
    console.error('删除家庭成员失败:', error);
    Utils.error(res, '删除家庭成员失败');
  }
});

// 获取用户地址列表
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const addresses = await query(`
      SELECT id, contact_name as contactName, contact_phone as contactPhone,
             address, latitude, longitude, is_default as isDefault,
             visit_count as visitCount,
             DATE_FORMAT(create_time, '%Y-%m-%d %H:%i') as createdAt
      FROM user_addresses 
      WHERE user_id = ?
      ORDER BY is_default DESC, create_time DESC
    `, [userId]);
    
    Utils.response(res, { addresses });
    
  } catch (error) {
    console.error('获取地址列表失败:', error);
    Utils.error(res, '获取地址列表失败');
  }
});

// 添加地址
router.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactName, contactPhone, address, latitude, longitude, isDefault } = req.body;
    
    // 验证必填字段
    if (!contactName || !contactPhone || !address) {
      return Utils.error(res, '缺少必填字段', 400);
    }
    
    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
      return Utils.error(res, '手机号格式不正确', 400);
    }
    
    // 如果设置为默认地址，先取消其他地址的默认状态
    if (isDefault) {
      await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    
    // 生成唯一ID
    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await query(`
      INSERT INTO user_addresses (id, user_id, contact_name, contact_phone, address, latitude, longitude, is_default, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [addressId, userId, contactName, contactPhone, address, latitude || null, longitude || null, isDefault ? 1 : 0]);
    
    const newAddress = {
      id: addressId,
      contactName,
      contactPhone,
      address,
      latitude: latitude || null,
      longitude: longitude || null,
      isDefault: Boolean(isDefault),
      createdAt: new Date()
    };
    
    Utils.response(res, { address: newAddress }, '地址添加成功');
    
  } catch (error) {
    console.error('添加地址失败:', error);
    Utils.error(res, '添加地址失败');
  }
});

// 更新地址
router.put('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;
    const { contactName, contactPhone, address, latitude, longitude, isDefault } = req.body;
    
    // 检查地址是否存在且属于当前用户
    const existingAddress = await query('SELECT id FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    if (existingAddress.length === 0) {
      return Utils.error(res, '地址不存在或无权限修改', 404);
    }
    
    const fields = [];
    const values = [];
    
    if (contactName) {
      fields.push('contact_name = ?');
      values.push(contactName);
    }
    if (contactPhone) {
      if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
        return Utils.error(res, '手机号格式不正确', 400);
      }
      fields.push('contact_phone = ?');
      values.push(contactPhone);
    }
    if (address) {
      fields.push('address = ?');
      values.push(address);
    }
    if (latitude !== undefined) {
      fields.push('latitude = ?');
      values.push(latitude);
    }
    if (longitude !== undefined) {
      fields.push('longitude = ?');
      values.push(longitude);
    }
    if (isDefault !== undefined) {
      // 如果设置为默认地址，先取消其他地址的默认状态
      if (isDefault) {
        await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [userId, addressId]);
      }
      fields.push('is_default = ?');
      values.push(isDefault ? 1 : 0);
    }
    
    if (fields.length === 0) {
      return Utils.error(res, '没有要更新的字段', 400);
    }
    
    fields.push('update_time = NOW()');
    values.push(addressId, userId);
    
    await query(`UPDATE user_addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    
    Utils.response(res, null, '地址更新成功');
    
  } catch (error) {
    console.error('更新地址失败:', error);
    Utils.error(res, '更新地址失败');
  }
});

// 删除地址
router.delete('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;
    
    // 检查地址是否存在且属于当前用户
    const existingAddress = await query('SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    if (existingAddress.length === 0) {
      return Utils.error(res, '地址不存在或无权限删除', 404);
    }
    
    const isDefault = existingAddress[0].is_default;
    
    await query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
    
    // 如果删除的是默认地址，设置第一个地址为默认
    if (isDefault) {
      await query('UPDATE user_addresses SET is_default = 1 WHERE user_id = ? ORDER BY create_time ASC LIMIT 1', [userId]);
    }
    
    Utils.response(res, null, '地址删除成功');
    
  } catch (error) {
    console.error('删除地址失败:', error);
    Utils.error(res, '删除地址失败');
  }
});

module.exports = router;