const mysql = require('mysql2/promise');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'abcd1234!',
  database: process.env.DB_DATABASE || 'health_guard_db'
};

console.log('🔧 修复users表字段结构...');
console.log('📋 目标数据库:', config.database);
console.log('');

async function fixUsersTable() {
  let connection;
  
  try {
    console.log('🔄 连接到数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');
    console.log('');

    // 1. 检查当前字段
    console.log('🔍 检查当前users表字段...');
    const [currentColumns] = await connection.execute('DESCRIBE users');
    const existingFields = currentColumns.map(col => col.Field);
    
    console.log('📋 当前字段:');
    existingFields.forEach(field => {
      console.log(`   - ${field}`);
    });
    console.log('');

    // 2. 需要添加的字段
    const fieldsToAdd = [
      {
        field: 'age',
        definition: 'INT DEFAULT 65 COMMENT \'年龄\'',
        check: () => !existingFields.includes('age')
      },
      {
        field: 'health_condition',
        definition: 'VARCHAR(50) DEFAULT \'healthy\' COMMENT \'健康状况\'',
        check: () => !existingFields.includes('health_condition')
      }
    ];

    // 3. 添加缺失字段
    let fieldsAdded = 0;
    
    for (const { field, definition, check } of fieldsToAdd) {
      if (check()) {
        console.log(`➕ 添加字段: ${field}`);
        try {
          await connection.execute(`ALTER TABLE users ADD COLUMN ${field} ${definition}`);
          console.log(`✅ 字段 ${field} 添加成功`);
          fieldsAdded++;
        } catch (error) {
          console.log(`❌ 字段 ${field} 添加失败: ${error.message}`);
        }
      } else {
        console.log(`✅ 字段 ${field} 已存在，跳过`);
      }
    }

    console.log('');

    // 4. 检查member_level字段是否需要扩展
    console.log('🔍 检查member_level字段定义...');
    const [memberLevelInfo] = await connection.execute("SHOW COLUMNS FROM users WHERE Field = 'member_level'");
    
    if (memberLevelInfo.length > 0) {
      const currentType = memberLevelInfo[0].Type;
      console.log(`📋 当前member_level类型: ${currentType}`);
      
      // 检查是否包含所需的值
      const requiredValues = ['regular', 'vip', 'premium', 'enterprise'];
      const needsUpdate = !currentType.includes('premium') || !currentType.includes('enterprise');
      
      if (needsUpdate) {
        console.log('🔄 扩展member_level字段枚举值...');
        const newEnumValues = "('regular','vip','premium','enterprise')";
        await connection.execute(`ALTER TABLE users MODIFY COLUMN member_level ENUM${newEnumValues} DEFAULT 'regular' COMMENT '会员等级'`);
        console.log('✅ member_level字段扩展成功');
      } else {
        console.log('✅ member_level字段已包含所需枚举值');
      }
    }

    // 5. 验证修复结果
    console.log('');
    console.log('🔍 验证字段修复结果...');
    const [updatedColumns] = await connection.execute('DESCRIBE users');
    
    console.log('📋 修复后的users表字段:');
    updatedColumns.forEach(col => {
      const isNew = ['age', 'health_condition'].includes(col.Field);
      const isRequired = ['service_count', 'total_spent', 'member_level', 'age', 'health_condition'].includes(col.Field);
      console.log(`   ${isNew ? '🆕' : isRequired ? '✅' : '📋'} ${col.Field} (${col.Type})`);
    });

    console.log('');
    console.log('🎉 users表字段修复完成！');
    
    if (fieldsAdded > 0) {
      console.log(`✨ 成功添加了 ${fieldsAdded} 个字段`);
    }
    
    console.log('');
    console.log('🚀 现在可以重新运行用户生成器了:');
    console.log('   cd d:\\ProjectPackage\\claude_code_project\\RedCellProject\\wx_mini_program');
    console.log('   node userGenerator.js generate 50');

    return true;

  } catch (error) {
    console.error('❌ 字段修复失败:', error.message);
    console.error('');
    console.error('🔧 解决建议:');
    console.error('1. 检查数据库连接权限');
    console.error('2. 确认用户具有 ALTER TABLE 权限');
    console.error('3. 检查表是否被锁定');
    return false;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行修复
fixUsersTable().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 修复过程中发生异常:', error.message);
  process.exit(1);
});