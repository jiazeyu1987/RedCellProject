const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'abcd1234!',
    database: 'health_guard_db'
};

// 生成中文姓名
function generateChineseName() {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '高', '罗'];
    const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀', '霞', '平'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
    return surname + givenName;
}

async function generate50Users() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('[SUCCESS] Database connection established');
        
        // 清理之前的测试用户
        await connection.execute(`DELETE FROM users WHERE open_id LIKE 'wx_test_%'`);
        console.log('[INFO] Cleaned up previous test users');
        
        // 生成50个测试用户
        console.log('[INFO] Generating 50 test users...');
        
        for(let i = 0; i < 50; i++) {
            const realName = generateChineseName();
            const user = {
                open_id: 'wx_test_' + Math.random().toString(36).substr(2, 9),
                nickname: realName + '(测试)',
                real_name: realName,
                phone: '1' + Math.floor(Math.random() * 9000000000 + 1000000000),
                gender: Math.random() > 0.5 ? '男' : '女',
                member_level: Math.random() > 0.8 ? 'vip' : 'regular',
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
            
            // 每10个用户显示一次进度
            if ((i + 1) % 10 === 0) {
                console.log(`[PROGRESS] Generated ${i + 1}/50 users`);
            }
        }
        
        console.log('[SUCCESS] Successfully generated 50 test users');
        
        // 验证创建的用户数量
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM users WHERE open_id LIKE 'wx_test_%'`);
        console.log(`[VERIFY] Total test users in database: ${rows[0].count}`);
        
        // 显示一些示例用户
        const [sampleUsers] = await connection.execute(`SELECT nickname, real_name, gender, member_level FROM users WHERE open_id LIKE 'wx_test_%' LIMIT 5`);
        console.log('[SAMPLE] Sample users created:');
        sampleUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.nickname} (${user.real_name}, ${user.gender}, ${user.member_level})`);
        });
        
    } catch(error) {
        console.log('[ERROR] User generation failed:', error.message);
        if(error.code === 'ER_NO_SUCH_TABLE') {
            console.log('[INFO] Users table does not exist. Please run database migration first.');
        }
        if(error.code === 'ECONNREFUSED') {
            console.log('[INFO] Cannot connect to MySQL. Please ensure MySQL server is running.');
        }
        process.exit(1);
    } finally {
        if(connection) await connection.end();
    }
}

generate50Users();