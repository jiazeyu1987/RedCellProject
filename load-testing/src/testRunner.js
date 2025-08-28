#!/usr/bin/env node
const { program } = require('commander');
const { TestScheduler, VirtualUserManager, LoadTestExecutor, TestResultManager, Logger } = require('./scheduledTesting');
const { batchCreateUsers, clearVirtualUsers } = require('./userGenerator');
const path = require('path');
const fs = require('fs').promises;

// 设置程序信息
program
  .name('health-guard-load-tester')
  .description('健康守护压力测试系统')
  .version('1.0.0');

/**
 * 用户生成命令
 */
program
  .command('generate-users')
  .description('生成虚拟用户数据')
  .option('-c, --count <number>', '生成用户数量', '50')
  .option('-b, --batch-size <number>', '批次大小', '10')
  .option('--use-api', '通过API创建用户')
  .option('--use-database', '直接插入数据库', true)
  .action(async (options) => {
    try {
      console.log('🚀 开始生成虚拟用户...');
      
      const count = parseInt(options.count);
      const batchSize = parseInt(options.batchSize);
      
      const result = await batchCreateUsers(count, {
        useAPI: options.useApi,
        useDatabase: options.useDatabase,
        batchSize: batchSize
      });
      
      console.log('✅ 用户生成完成!');
      console.log(`📊 统计: 成功 ${result.success}, 失败 ${result.failed}, 总计 ${result.total}`);
      
      if (result.errors.length > 0) {
        console.log('❌ 错误列表:');
        result.errors.slice(0, 5).forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    } catch (error) {
      console.error('❌ 生成用户失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 清理用户命令
 */
program
  .command('cleanup-users')
  .description('清理所有虚拟用户数据')
  .option('--confirm', '确认执行清理操作')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('⚠️  请使用 --confirm 参数确认清理操作');
        console.log('   例: npm run cleanup-users -- --confirm');
        return;
      }
      
      console.log('🧹 开始清理虚拟用户...');
      const deletedCount = await clearVirtualUsers();
      console.log(`✅ 清理完成! 删除了 ${deletedCount} 个虚拟用户`);
    } catch (error) {
      console.error('❌ 清理失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 负载测试命令
 */
program
  .command('load-test')
  .description('执行负载测试')
  .option('-c, --config <file>', '测试配置文件', 'test-config.yml')
  .option('-r, --report', '生成详细报告')
  .action(async (options) => {
    try {
      console.log('🔥 开始执行负载测试...');
      
      const result = await LoadTestExecutor.runTest(options.config, 'load_test');
      
      console.log('✅ 负载测试完成!');
      console.log('📊 测试结果摘要:');
      
      if (result.result.success && result.result.summary) {
        const summary = result.result.summary;
        
        if (summary.responseTime) {
          console.log(`   响应时间: 中位数 ${summary.responseTime.median}ms, 95% ${summary.responseTime.p95}ms`);
        }
        
        if (summary.statusCodes) {
          console.log('   状态码分布:');
          Object.entries(summary.statusCodes).forEach(([code, count]) => {
            console.log(`     ${code}: ${count} 次`);
          });
        }
        
        if (summary.scenariosCompleted && summary.scenariosCreated) {
          const successRate = ((summary.scenariosCompleted / summary.scenariosCreated) * 100).toFixed(2);
          console.log(`   场景成功率: ${successRate}% (${summary.scenariosCompleted}/${summary.scenariosCreated})`);
        }
      }
      
      if (options.report) {
        console.log(`📄 详细报告已保存到: ${result.resultFile || '结果文件'}`);
      }
    } catch (error) {
      console.error('❌ 负载测试失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 压力测试命令
 */
program
  .command('stress-test')
  .description('执行压力测试')
  .option('-c, --config <file>', '测试配置文件', 'stress-test.yml')
  .action(async (options) => {
    try {
      console.log('💥 开始执行压力测试...');
      
      const result = await LoadTestExecutor.runTest(options.config, 'stress_test');
      
      console.log('✅ 压力测试完成!');
      console.log(`⏱️  测试耗时: ${result.duration}ms`);
      
      if (result.result.success) {
        console.log('🎯 测试执行成功');
      } else {
        console.log('⚠️  测试执行中发现问题');
      }
    } catch (error) {
      console.error('❌ 压力测试失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 定时任务命令
 */
program
  .command('scheduler')
  .description('启动定时测试调度器')
  .option('-s, --start', '启动调度器')
  .option('-t, --stop', '停止调度器')
  .option('--status', '查看调度器状态')
  .option('-d, --daemon', '以守护进程模式运行')
  .action(async (options) => {
    const scheduler = new TestScheduler();
    
    try {
      if (options.start) {
        console.log('🚀 启动定时测试调度器...');
        scheduler.start();
        
        if (options.daemon) {
          console.log('🔄 调度器运行在守护进程模式...');
          console.log('💡 使用 Ctrl+C 停止调度器');
          
          // 保持进程运行
          process.on('SIGINT', () => {
            console.log('\n🛑 收到停止信号，正在关闭调度器...');
            scheduler.stop();
            process.exit(0);
          });
          
          process.on('SIGTERM', () => {
            console.log('\n🛑 收到终止信号，正在关闭调度器...');
            scheduler.stop();
            process.exit(0);
          });
          
          // 定期输出状态
          setInterval(async () => {
            const status = await scheduler.getStatus();
            console.log(`📊 调度器运行中 - 活跃任务: ${status.activeTasks}, 运行时间: ${Math.round(status.uptime)}秒`);
          }, 300000); // 每5分钟输出一次状态
          
        } else {
          console.log('✅ 调度器已启动，请手动停止或使用 --stop 参数');
        }
      } else if (options.stop) {
        console.log('🛑 停止调度器...');
        scheduler.stop();
      } else if (options.status) {
        const status = await scheduler.getStatus();
        console.log('📊 调度器状态:');
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log('❓ 请指定操作: --start, --stop, 或 --status');
      }
    } catch (error) {
      console.error('❌ 调度器操作失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 报告命令
 */
program
  .command('report')
  .description('查看测试报告')
  .option('-t, --type <type>', '报告类型 (load_test|stress_test|user_generation)', 'load_test')
  .option('-n, --number <count>', '显示最近几次结果', '5')
  .option('--summary', '只显示摘要')
  .action(async (options) => {
    try {
      console.log(`📊 获取 ${options.type} 测试报告...\n`);
      
      const results = await TestResultManager.getLatestResults(options.type, parseInt(options.number));
      
      if (results.length === 0) {
        console.log('📭 暂无测试结果');
        return;
      }
      
      results.forEach((result, index) => {
        console.log(`📄 报告 ${index + 1}: ${result.filename}`);
        console.log(`   时间: ${result.data.timestamp}`);
        
        if (result.data.result) {
          if (options.type === 'user_generation') {
            console.log(`   结果: 成功 ${result.data.result.success}, 失败 ${result.data.result.failed}`);
          } else if (result.data.result.summary) {
            const summary = result.data.result.summary;
            if (summary.responseTime) {
              console.log(`   响应时间: ${summary.responseTime.median}ms (中位数)`);
            }
            if (summary.scenariosCompleted) {
              console.log(`   完成场景: ${summary.scenariosCompleted}`);
            }
          }
        }
        
        if (!options.summary && result.data.result) {
          console.log('   详细结果:', JSON.stringify(result.data.result, null, 4));
        }
        
        console.log(''); // 空行分隔
      });
    } catch (error) {
      console.error('❌ 获取报告失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 完整测试套件命令
 */
program
  .command('full-test')
  .description('执行完整的测试套件')
  .option('--skip-user-gen', '跳过用户生成')
  .option('--skip-load-test', '跳过负载测试')
  .option('--skip-stress-test', '跳过压力测试')
  .option('-u, --users <count>', '生成用户数量', '100')
  .action(async (options) => {
    try {
      console.log('🎯 开始执行完整测试套件...\n');
      
      const results = {
        userGeneration: null,
        loadTest: null,
        stressTest: null
      };
      
      // 1. 生成虚拟用户
      if (!options.skipUserGen) {
        console.log('📝 步骤 1: 生成虚拟用户');
        results.userGeneration = await batchCreateUsers(parseInt(options.users), {
          useDatabase: true,
          batchSize: 20
        });
        console.log(`✅ 用户生成完成: ${results.userGeneration.success}/${results.userGeneration.total}\n`);
      }
      
      // 2. 执行负载测试
      if (!options.skipLoadTest) {
        console.log('🔥 步骤 2: 执行负载测试');
        results.loadTest = await LoadTestExecutor.runLoadTest();
        console.log('✅ 负载测试完成\n');
      }
      
      // 3. 执行压力测试
      if (!options.skipStressTest) {
        console.log('💥 步骤 3: 执行压力测试');
        results.stressTest = await LoadTestExecutor.runStressTest();
        console.log('✅ 压力测试完成\n');
      }
      
      // 汇总结果
      console.log('🎉 完整测试套件执行完成!');
      console.log('📊 测试结果汇总:');
      
      if (results.userGeneration) {
        console.log(`   用户生成: ${results.userGeneration.success}/${results.userGeneration.total} 成功`);
      }
      
      if (results.loadTest) {
        console.log(`   负载测试: ${results.loadTest.result.success ? '成功' : '失败'}`);
      }
      
      if (results.stressTest) {
        console.log(`   压力测试: ${results.stressTest.result.success ? '成功' : '失败'}`);
      }
      
    } catch (error) {
      console.error('❌ 完整测试套件执行失败:', error.message);
      process.exit(1);
    }
  });

/**
 * 帮助信息
 */
program
  .command('info')
  .description('显示系统信息和使用指南')
  .action(() => {
    console.log(`
🏥 健康守护压力测试系统 v1.0.0

📖 主要功能:
  • 虚拟用户数据生成
  • 自动化压力测试
  • 定时任务调度
  • 测试结果分析

🚀 快速开始:
  1. 生成测试用户:    npm run generate-users -- -c 100
  2. 执行负载测试:    npm run load-test
  3. 启动定时任务:    npm run scheduled-test -- --start --daemon
  4. 查看测试报告:    npm run report

📁 重要文件:
  • config/test-config.yml     - 负载测试配置
  • config/stress-test.yml     - 压力测试配置
  • src/userGenerator.js       - 虚拟用户生成器
  • src/scheduledTesting.js    - 定时任务调度器

🔗 相关服务:
  • 后端API: http://localhost:3000/v1
  • 管理员门户: http://localhost:3000 (前端)
  • 数据库: MySQL (localhost:3306)

💡 提示:
  • 确保后端服务已启动
  • 确保数据库连接正常
  • 使用 --help 查看详细命令选项
`);
  });

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}