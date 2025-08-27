const express = require('express');
const { query } = require('../config/database');
const Utils = require('../utils');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// 获取用户动态列表
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const countResult = await query('SELECT COUNT(*) as total FROM community_posts WHERE status = ?', ['published']);
    const total = countResult[0].total;
    
    const sql = `
      SELECT p.id, p.content, p.like_count as likes, p.comment_count as comments, p.images,
             u.nickname as userName, u.avatar as userAvatar,
             DATE_FORMAT(p.publish_time, '%H小时前') as createTime
      FROM community_posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.status = 'published'
      ORDER BY p.publish_time DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const posts = await query(sql);
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { posts, pagination });
    
  } catch (error) {
    console.error('获取用户动态失败:', error);
    Utils.error(res, '获取用户动态失败');
  }
});

// 发布动态
router.post('/posts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, images } = req.body;
    
    if (!content || content.trim().length === 0) {
      return Utils.error(res, '内容不能为空', 400);
    }
    
    if (content.length > 500) {
      return Utils.error(res, '内容过长，最多500字符', 400);
    }
    
    // 生成UUID作为主键
    const { v4: uuidv4 } = require('uuid');
    const postId = uuidv4();
    
    const result = await query(`
      INSERT INTO community_posts (id, user_id, content, images, like_count, comment_count, status, publish_time, update_time)
      VALUES (?, ?, ?, ?, 0, 0, 'published', NOW(), NOW())
    `, [postId, userId, content.trim(), JSON.stringify(images || [])]);
    
    const post = {
      id: postId,
      content: content.trim(),
      images: images || [],
      likes: 0,
      comments: 0,
      createdAt: new Date()
    };
    
    Utils.response(res, { post }, '动态发布成功');
    
  } catch (error) {
    console.error('发布动态失败:', error);
    Utils.error(res, '发布动态失败');
  }
});

// 获取健康知识列表
router.get('/knowledge', async (req, res) => {
  try {
    const { page = 1, limit = 20, category = 'all' } = req.query;
    
    let whereClause = 'WHERE status = ?';
    let params = ['published'];
    
    if (category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM health_knowledge ${whereClause}`, params);
    const total = countResult[0].total;
    
    const sql = `
      SELECT id, title, summary, cover, author, read_count as readCount, category,
             DATE_FORMAT(created_at, '%Y-%m-%d') as createdAt
      FROM health_knowledge 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const knowledge = await query(sql, params);
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { knowledge, pagination });
    
  } catch (error) {
    console.error('获取健康知识失败:', error);
    Utils.error(res, '获取健康知识失败');
  }
});

// 获取知识详情
router.get('/knowledge/:id', async (req, res) => {
  try {
    const knowledgeId = req.params.id;
    
    const knowledge = await query(`
      SELECT id, title, content, cover, author, read_count as readCount, category,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as createdAt
      FROM health_knowledge 
      WHERE id = ? AND status = 'published'
    `, [knowledgeId]);
    
    if (knowledge.length === 0) {
      return Utils.error(res, '知识内容不存在', 404);
    }
    
    // 增加阅读数
    await query('UPDATE health_knowledge SET read_count = read_count + 1 WHERE id = ?', [knowledgeId]);
    
    Utils.response(res, { knowledge: knowledge[0] });
    
  } catch (error) {
    console.error('获取知识详情失败:', error);
    Utils.error(res, '获取知识详情失败');
  }
});

// 获取问答列表
router.get('/qa', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM qa_questions ${whereClause}`, params);
    const total = countResult[0].total;
    
    const sql = `
      SELECT q.id, q.question, q.answer, q.status,
             u.nickname as userName,
             q.doctor_name as doctorName,
             DATE_FORMAT(q.created_at, '%Y-%m-%d') as createTime,
             CASE q.status 
               WHEN 'answered' THEN '已回复'
               WHEN 'pending' THEN '等待回复'
               ELSE '未知'
             END as statusText
      FROM qa_questions q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const questions = await query(sql, params);
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { questions, pagination });
    
  } catch (error) {
    console.error('获取问答列表失败:', error);
    Utils.error(res, '获取问答列表失败');
  }
});

// 提问
router.post('/qa', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return Utils.error(res, '问题内容不能为空', 400);
    }
    
    if (question.length > 200) {
      return Utils.error(res, '问题过长，最多200字符', 400);
    }
    
    const result = await query(`
      INSERT INTO qa_questions (user_id, question, status, created_at, updated_at)
      VALUES (?, ?, 'pending', NOW(), NOW())
    `, [userId, question.trim()]);
    
    const questionId = result.insertId;
    
    const qa = {
      id: questionId,
      question: question.trim(),
      status: 'pending',
      statusText: '等待回复',
      createdAt: new Date()
    };
    
    Utils.response(res, { question: qa }, '问题提交成功');
    
  } catch (error) {
    console.error('提问失败:', error);
    Utils.error(res, '提问失败');
  }
});

// 点赞动态
router.post('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    
    // 检查动态是否存在
    const posts = await query('SELECT id, like_count FROM community_posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return Utils.error(res, '动态不存在', 404);
    }
    
    // 检查是否已经点赞
    const existingLike = await query('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    
    if (existingLike.length > 0) {
      // 取消点赞
      await query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await query('UPDATE community_posts SET like_count = like_count - 1 WHERE id = ?', [postId]);
      Utils.response(res, { liked: false }, '取消点赞成功');
    } else {
      // 添加点赞
      await query('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, NOW())', [postId, userId]);
      await query('UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
      Utils.response(res, { liked: true }, '点赞成功');
    }
    
  } catch (error) {
    console.error('点赞操作失败:', error);
    Utils.error(res, '点赞操作失败');
  }
});

// 获取医院信息
router.get('/hospitals', async (req, res) => {
  try {
    const { page = 1, limit = 20, city = 'all' } = req.query;
    
    let whereClause = 'WHERE status = ?';
    let params = ['active'];
    
    if (city !== 'all') {
      whereClause += ' AND city = ?';
      params.push(city);
    }
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // 查询总数
    const countResult = await query(`SELECT COUNT(*) as total FROM hospitals ${whereClause}`, params);
    const total = countResult[0].total;
    
    const sql = `
      SELECT id, name, level, type, address, phone, distance, logo, 
             specialties, departments
      FROM hospitals 
      ${whereClause}
      ORDER BY distance ASC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const hospitals = await query(sql, params);
    
    // 解析JSON字段
    hospitals.forEach(hospital => {
      if (hospital.specialties) {
        try {
          hospital.specialties = JSON.parse(hospital.specialties);
        } catch (e) {
          hospital.specialties = [];
        }
      }
      if (hospital.departments) {
        try {
          hospital.departments = JSON.parse(hospital.departments);
        } catch (e) {
          hospital.departments = [];
        }
      }
    });
    
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };
    
    Utils.response(res, { hospitals, pagination });
    
  } catch (error) {
    console.error('获取医院信息失败:', error);
    Utils.error(res, '获取医院信息失败');
  }
});

// 获取服务类型配置
router.get('/service-types', async (req, res) => {
  try {
    const serviceTypes = await query(`
      SELECT id, name, price, description, features, icon
      FROM service_types 
      WHERE status = 'active'
      ORDER BY sort_order ASC, id ASC
    `);
    
    // 解析features字段
    serviceTypes.forEach(service => {
      if (service.features) {
        try {
          service.features = JSON.parse(service.features);
        } catch (e) {
          service.features = [];
        }
      }
    });
    
    Utils.response(res, { serviceTypes });
    
  } catch (error) {
    console.error('获取服务类型失败:', error);
    Utils.error(res, '获取服务类型失败');
  }
});

module.exports = router;