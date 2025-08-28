const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'abcd1234!',
    database: 'health_guard_db'
};

async function testUserGeneration() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('[SUCCESS] Database connection established');
        
        // 生成3个测试用户
        for(let i = 0; i < 3; i++) {
            const user = {
                open_id: 'wx_test_' + Math.random().toString(36).substr(2, 9),
                nickname: '测试用户' + (i + 1),
                real_name: '测试' + (i + 1),
                phone: '1' + Math.floor(Math.random() * 9000000000 + 1000000000),
                gender: Math.random() > 0.5 ? '男' : '女',
                member_level: 'regular',
                status: 'active',
                assignment_status: 'unassigned',
                created_at: new Date(),
                updated_at: new Date()
            };
            
            const sql = `INSERT INTO users (open_id, nickname, real_name, phone, gender, member_level, status, assignment_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await connection.execute(sql, [
                user.open_id, user.nickname, user.real_name, user.phone,
                user.gender, user.member_level, user.status,
                user.assignment_status, user.created_at, user.updated_at
            ]);
            
            console.log('[SUCCESS] Created user:', user.nickname);
        }
        
        console.log('[SUCCESS] User generation test completed');
        
        // 检查创建的用户数量
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM users WHERE open_id LIKE 'wx_test_%'`);
        console.log('[INFO] Total test users in database:', rows[0].count);
        
    } catch(error) {
        console.log('[ERROR] User generation failed:', error.message);
        if(error.code === 'ER_NO_SUCH_TABLE') {
            console.log('[INFO] Users table does not exist. Please run database migration first.');
        }
        if(error.code === 'ECONNREFUSED') {
            console.log('[INFO] Cannot connect to MySQL. Please ensure MySQL server is running.');
        }
    } finally {
        if(connection) await connection.end();
    }
}

testUserGeneration();