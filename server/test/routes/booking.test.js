const request = require('supertest');
const app = require('../../app');
const Database = require('../../config/database');
const TestHelper = require('../helpers/TestHelper');

describe('服务预约接口测试', () => {
  let testHelper;
  let testUser;
  let userToken;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestDatabase();
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    // 清理测试数据 - 清理所有测试相关的数据
    const cleanupSql = `
      DELETE FROM users WHERE 
        email LIKE "%test%" OR 
        open_id LIKE "%booking%" OR
        nickname LIKE "%预约测试%"
    `;
    
    await Database.query('DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email LIKE "%test%" OR open_id LIKE "%booking%")');
    await Database.query('DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE email LIKE "%test%" OR open_id LIKE "%booking%")');
    await Database.query(cleanupSql);

    // 创建测试用户
    testUser = await testHelper.createTestUser({
      openId: 'booking_test_user',
      nickname: '预约测试用户',
      email: 'booking@test.com',
      phone: '13800138001',
      realName: '张预约'
    });
    userToken = testHelper.generateUserToken(testUser.id);

    // 创建测试地址
    const addressResult = await Database.query(`
      INSERT INTO addresses (user_id, name, phone, province, city, district, address, is_default, created_at, updated_at)
      VALUES (?, '张预约', '13800138001', '广东省', '深圳市', '南山区', '科技园南区123号', 1, NOW(), NOW())
    `, [testUser.id]);
    
    // 存储地址ID供测试使用
    global.testAddressId = addressResult.insertId;
  });

  describe('POST /api/bookings - 创建预约', () => {
    test('应该成功创建服务预约', async () => {
      const bookingData = {
        serviceType: 'basic_health',
        serviceDate: '2025-08-30',
        serviceTime: '10:00',
        addressId: global.testAddressId,
        notes: '需要测血压和血糖'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.booking).toHaveProperty('id');
      expect(response.body.data.booking.serviceType).toBe(bookingData.serviceType);
      expect(response.body.data.booking.serviceDate).toBe(bookingData.serviceDate);
      expect(response.body.data.booking.serviceTime).toBe(bookingData.serviceTime);
      expect(response.body.data.booking.status).toBe('pending');

      // 验证数据库中的记录
      const dbBooking = await testHelper.verifyDatabaseRecord('bookings', {
        user_id: testUser.id,
        service_type: bookingData.serviceType
      });
      expect(dbBooking).toBeTruthy();
      expect(dbBooking.service_date).toBe(bookingData.serviceDate);
      expect(dbBooking.service_time).toBe(bookingData.serviceTime + ':00'); // 数据库返回完整时间格式
      expect(dbBooking.notes).toBe(bookingData.notes);
      expect(dbBooking.status).toBe('pending');
    });

    test('应该验证必填字段', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceType: 'basic_health'
          // 缺少 serviceDate, serviceTime, addressId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('必填');
    });

    test('应该验证服务类型', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceType: 'invalid_service',
          serviceDate: '2025-08-30',
          serviceTime: '10:00',
          addressId: global.testAddressId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('服务类型');
    });

    test('应该验证预约日期不能是过去时间', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceType: 'basic_health',
          serviceDate: '2020-01-01',
          serviceTime: '10:00',
          addressId: global.testAddressId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('日期');
    });

    test('应该验证地址存在且属于当前用户', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceType: 'basic_health',
          serviceDate: '2025-08-30',
          serviceTime: '10:00',
          addressId: 999999
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('地址');
    });
  });

  /*
  test('应该拒绝无认证的请求', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({
        serviceType: 'basic_health',
        serviceDate: '2025-08-30',
        serviceTime: '10:00',
        addressId: 1
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  */

  describe('GET /api/bookings - 获取用户预约列表', () => {
    beforeEach(async () => {
      // 创建测试预约记录
      await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, NOW()),
               (?, 'comprehensive_health', '2025-08-25', '14:00', 'completed', 200.00, DATE_SUB(NOW(), INTERVAL 1 DAY)),
               (?, 'basic_health', '2025-08-20', '09:00', 'cancelled', 100.00, DATE_SUB(NOW(), INTERVAL 5 DAY))
      `, [testUser.id, testUser.id, testUser.id]);
    });

    test('应该返回用户的预约列表', async () => {
      const response = await testHelper.get('/api/bookings', userToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bookings).toBeInstanceOf(Array);
      expect(response.body.data.bookings.length).toBe(3);
      
      // 验证分页信息
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.total).toBe(3);

      // 验证预约信息结构
      const booking = response.body.data.bookings[0];
      expect(booking).toHaveProperty('id');
      expect(booking).toHaveProperty('serviceType');
      expect(booking).toHaveProperty('serviceDate');
      expect(booking).toHaveProperty('serviceTime');
      expect(booking).toHaveProperty('status');
      expect(booking).toHaveProperty('totalAmount');
      expect(booking).toHaveProperty('createdAt');
    });

    test('应该支持分页功能', async () => {
      const response = await testHelper.get('/api/bookings?page=1&limit=2', userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.bookings.length).toBe(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    test('应该支持状态筛选', async () => {
      const response = await testHelper.get('/api/bookings?status=pending', userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.bookings.length).toBe(1);
      expect(response.body.data.bookings[0].status).toBe('pending');
    });

    test('应该按创建时间降序排列', async () => {
      const response = await testHelper.get('/api/bookings', userToken);

      expect(response.body.data.bookings.length).toBeGreaterThan(1);
      
      // 验证排序
      for (let i = 1; i < response.body.data.bookings.length; i++) {
        const prevDate = new Date(response.body.data.bookings[i-1].createdAt);
        const currDate = new Date(response.body.data.bookings[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('GET /api/bookings/:id - 获取预约详情', () => {
    let bookingId;

    beforeEach(async () => {
      const result = await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, notes, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, '详情测试预约', NOW())
      `, [testUser.id]);
      bookingId = result.insertId;
    });

    test('应该返回预约详情', async () => {
      const response = await testHelper.get(`/api/bookings/${bookingId}`, userToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.id).toBe(bookingId);
      expect(response.body.data.booking.serviceType).toBe('basic_health');
      expect(response.body.data.booking.notes).toBe('详情测试预约');
      expect(response.body.data.booking.status).toBe('pending');
    });

    test('应该拒绝访问其他用户的预约', async () => {
      // 创建另一个用户
      const otherUser = await testHelper.createTestUser({
        openId: 'other_booking_user',
        nickname: '其他用户',
        email: 'other@test.com'
      });
      const otherUserToken = testHelper.generateUserToken(otherUser.id);

      const response = await testHelper.get(`/api/bookings/${bookingId}`, otherUserToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('权限');
    });

    test('应该处理不存在的预约', async () => {
      const response = await testHelper.get('/api/bookings/999999', userToken);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('预约不存在');
    });
  });

  describe('PUT /api/bookings/:id - 更新预约', () => {
    let bookingId;

    beforeEach(async () => {
      const result = await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, NOW())
      `, [testUser.id]);
      bookingId = result.insertId;
    });

    test('应该成功更新预约信息', async () => {
      const updateData = {
        serviceDate: '2025-09-02',
        serviceTime: '14:00',
        notes: '更新后的备注'
      };

      const response = await request(app)
        .put(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.serviceDate).toBe(updateData.serviceDate);
      expect(response.body.data.booking.serviceTime).toBe(updateData.serviceTime);
      expect(response.body.data.booking.notes).toBe(updateData.notes);

      // 验证数据库中的数据已更新
      const dbBooking = await testHelper.verifyDatabaseRecord('bookings', {
        id: bookingId
      });
      expect(dbBooking.service_date).toBe(updateData.serviceDate);
      expect(dbBooking.service_time).toBe(updateData.serviceTime + ':00'); // 数据库返回完整时间格式
      expect(dbBooking.notes).toBe(updateData.notes);
    });

    test('应该拒绝更新已完成的预约', async () => {
      // 先更新预约状态为已完成
      await Database.query('UPDATE bookings SET status = ? WHERE id = ?', ['completed', bookingId]);

      const response = await request(app)
        .put(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ serviceDate: '2025-09-02' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无法修改');
    });

    test('应该拒绝访问其他用户的预约', async () => {
      const otherUser = await testHelper.createTestUser({
        openId: 'other_update_user',
        nickname: '其他更新用户',
        email: 'otherupdate@test.com'
      });
      const otherUserToken = testHelper.generateUserToken(otherUser.id);

      const response = await request(app)
        .put(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ serviceDate: '2025-09-02' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/bookings/:id/cancel - 取消预约', () => {
    let bookingId;

    beforeEach(async () => {
      const result = await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, NOW())
      `, [testUser.id]);
      bookingId = result.insertId;
    });

    test('应该成功取消预约', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '时间冲突' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('取消成功');

      // 验证数据库中的状态已更新
      const dbBooking = await testHelper.verifyDatabaseRecord('bookings', {
        id: bookingId
      });
      expect(dbBooking.status).toBe('cancelled');
    });

    test('应该拒绝取消已完成的预约', async () => {
      await Database.query('UPDATE bookings SET status = ? WHERE id = ?', ['completed', bookingId]);

      const response = await request(app)
        .put(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '测试取消' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无法取消');
    });

    test('应该拒绝取消已取消的预约', async () => {
      await Database.query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]);

      const response = await request(app)
        .put(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '测试取消' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已取消');
    });
  });

  describe('GET /api/services - 获取服务类型列表', () => {
    test('应该返回可用的服务类型', async () => {
      const response = await testHelper.get('/api/services');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeInstanceOf(Array);
      expect(response.body.data.services.length).toBeGreaterThan(0);

      // 验证服务信息结构
      const service = response.body.data.services[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('price');
      expect(service).toHaveProperty('description');
      expect(service).toHaveProperty('duration');
    });

    test('服务信息应该包含价格和时长', async () => {
      const response = await testHelper.get('/api/services');

      response.body.data.services.forEach(service => {
        expect(service.price).toBeGreaterThan(0);
        expect(service.duration).toBeGreaterThan(0);
        expect(service.name).toBeTruthy();
        expect(service.description).toBeTruthy();
      });
    });
  });

  describe('数据库数据验证', () => {
    test('预约创建时应正确计算费用', async () => {
      const bookingData = {
        serviceType: 'comprehensive_health',
        serviceDate: '2025-08-30',
        serviceTime: '10:00',
        addressId: global.testAddressId
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      // 添加错误检查
      if (response.status !== 200 || !response.body.data || !response.body.data.booking) {
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
        throw new Error('预约创建失败');
      }

      const bookingId = response.body.data.booking.id;
      const dbBooking = await testHelper.verifyDatabaseRecord('bookings', {
        id: bookingId
      });

      // 验证费用计算正确（综合健康评估应该是200元）
      expect(parseFloat(dbBooking.total_amount)).toBe(200.00);
    });

    test('预约状态变更应正确记录时间', async () => {
      const result = await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, NOW())
      `, [testUser.id]);
      const bookingId = result.insertId;

      // 添加小延时确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));

      // 取消预约
      await request(app)
        .put(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '测试取消' });

      const dbBooking = await testHelper.verifyDatabaseRecord('bookings', {
        id: bookingId
      });

      expect(dbBooking.status).toBe('cancelled');
      expect(new Date(dbBooking.updated_at)).toBeInstanceOf(Date);
      expect(new Date(dbBooking.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(dbBooking.created_at).getTime()
      );
    });

    test('预约和地址的关联应该正确', async () => {
      // 创建预约
      const bookingData = {
        serviceType: 'basic_health',
        serviceDate: '2025-08-30',
        serviceTime: '10:00',
        addressId: global.testAddressId
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      // 添加错误检查
      if (response.status !== 200 || !response.body.data || !response.body.data.booking) {
        console.log('Response status:', response.status);
        console.log('Response body:', response.body);
        throw new Error('预约创建失败');
      }

      const bookingId = response.body.data.booking.id;

      // 验证预约和地址的关联
      const bookingWithAddress = await Database.query(`
        SELECT b.*, a.name as address_name, a.phone as address_phone, a.address
        FROM bookings b
        JOIN addresses a ON b.address_id = a.id
        WHERE b.id = ?
      `, [bookingId]);

      expect(bookingWithAddress.length).toBe(1);
      expect(bookingWithAddress[0].address_name).toBe('张预约');
      expect(bookingWithAddress[0].address_phone).toBe('13800138001');
      expect(bookingWithAddress[0].address).toBe('科技园南区123号');
    });

    test('预约统计数据应该准确', async () => {
      // 创建多个不同状态的预约
      await Database.query(`
        INSERT INTO bookings (user_id, service_type, service_date, service_time, status, total_amount, created_at)
        VALUES (?, 'basic_health', '2025-09-01', '10:00', 'pending', 100.00, NOW()),
               (?, 'comprehensive_health', '2025-08-25', '14:00', 'completed', 200.00, NOW()),
               (?, 'basic_health', '2025-08-20', '09:00', 'cancelled', 100.00, NOW())
      `, [testUser.id, testUser.id, testUser.id]);

      // 验证统计数据
      const stats = await Database.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_amount
        FROM bookings 
        WHERE user_id = ?
      `, [testUser.id]);

      expect(stats[0].total).toBe(3);
      expect(stats[0].pending).toBe(1);
      expect(stats[0].completed).toBe(1);
      expect(stats[0].cancelled).toBe(1);
      expect(parseFloat(stats[0].completed_amount)).toBe(200.00);
    });
  });
});