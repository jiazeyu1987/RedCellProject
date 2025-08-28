const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'abcd1234!',
    database: 'health_guard_db'
};

async function testDatabase() {
    let connection;
    try {
        // 测试基本连接
        connection = await mysql.createConnection(config);
        console.log('[SUCCESS] Database connection established');
        
        // 检查数据库是否存在
        const [databases] = await connection.execute(`SHOW DATABASES LIKE 'health_guard_db'`);
        if (databases.length === 0) {
            console.log('[WARNING] Database "health_guard_db" does not exist');
            console.log('[INFO] Available databases:');
            const [allDbs] = await connection.execute('SHOW DATABASES');
            allDbs.forEach(db => console.log('  -', Object.values(db)[0]));
            return;
        }
        console.log('[SUCCESS] Database "health_guard_db" exists');
        
        // 检查users表是否存在
        const [tables] = await connection.execute(`SHOW TABLES LIKE 'users'`);
        if (tables.length === 0) {
            console.log('[WARNING] Table "users" does not exist');
            console.log('[INFO] Available tables:');
            const [allTables] = await connection.execute('SHOW TABLES');
            if (allTables.length === 0) {
                console.log('  No tables found in database');
            } else {
                allTables.forEach(table => console.log('  -', Object.values(table)[0]));
            }
            return;
        }
        console.log('[SUCCESS] Table "users" exists');
        
        // 检查users表结构
        const [columns] = await connection.execute('DESCRIBE users');
        console.log('[INFO] Users table structure:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        // 检查现有用户数量
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log('[INFO] Current users count:', userCount[0].count);
        
        // 检查测试用户数量
        const [testUserCount] = await connection.execute(`SELECT COUNT(*) as count FROM users WHERE open_id LIKE 'wx_test_%'`);
        console.log('[INFO] Test users count:', testUserCount[0].count);
        
    } catch(error) {
        console.log('[ERROR] Database test failed:', error.message);
        if(error.code === 'ECONNREFUSED') {
            console.log('[INFO] MySQL server is not running or not accessible');
            console.log('[SOLUTION] Please start MySQL server');
        } else if(error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('[INFO] Access denied - check username/password');
            console.log('[SOLUTION] Verify database credentials');
        } else if(error.code === 'ER_BAD_DB_ERROR') {
            console.log('[INFO] Database does not exist');
            console.log('[SOLUTION] Create database "health_guard_db"');
        }
        process.exit(1);
    } finally {
        if(connection) await connection.end();
    }
}

testDatabase();