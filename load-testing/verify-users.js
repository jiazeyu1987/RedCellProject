const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'abcd1234!',
    database: 'health_guard_db'
};

async function verifyTestUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('[INFO] Checking test users...');
        
        // 获取测试用户总数
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM users WHERE open_id LIKE 'wx_test_%'`);
        console.log(`[INFO] Total test users: ${countResult[0].count}`);
        
        if (countResult[0].count > 0) {
            // 显示前10个测试用户示例
            const [users] = await connection.execute(`
                SELECT nickname, real_name, gender, member_level, created_at 
                FROM users 
                WHERE open_id LIKE 'wx_test_%' 
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            
            console.log('[INFO] Sample test users (latest 10):');
            users.forEach((user, index) => {
                const createdAt = new Date(user.created_at).toLocaleString();
                console.log(`  ${index + 1}. ${user.nickname} (${user.real_name}, ${user.gender}, ${user.member_level}) - ${createdAt}`);
            });
            
            console.log('[SUCCESS] Test users are working properly!');
        } else {
            console.log('[WARNING] No test users found');
        }
        
    } catch(error) {
        console.log('[ERROR] Verification failed:', error.message);
    } finally {
        if(connection) await connection.end();
    }
}

verifyTestUsers();