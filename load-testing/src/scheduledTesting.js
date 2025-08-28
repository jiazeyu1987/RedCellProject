const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { batchCreateUsers, clearVirtualUsers } = require('./userGenerator');

// 配置信息
const config = {
  scheduling: {
    // 每天凌晨2点清理虚拟用户数据
    cleanupSchedule: '0 2 * * *',
    // 每30分钟生成新的虚拟用户
    userGenerationSchedule: '*/30 * * * *',
    // 每小时执行一次压力测试
    loadTestSchedule: '0 * * * *',
    // 每6小时执行一次压力测试
    stressTestSchedule: '0 */6 * * *'
  },
  testing: {
    userBatchSize: 20,           // 每次生成用户数量
    maxVirtualUsers: 500,        // 最大虚拟用户数
    testResultsDir: path.join(__dirname, '..', 'results'),
    enableCleanup: true,         // 是否启用定时清理
    enableUserGeneration: true,  // 是否启用定时用户生成
    enableLoadTesting: true      // 是否启用定时压力测试
  },
  notifications: {
    enableConsoleLog: true,
    enableFileLog: true,
    logFile: path.join(__dirname, '..', 'logs', 'scheduler.log')
  }
};

/**
 * 日志记录器
 */
class Logger {
  static async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    const logText = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    
    // 控制台输出
    if (config.notifications.enableConsoleLog) {
      console.log(logText);
    }
    
    // 文件输出
    if (config.notifications.enableFileLog) {
      try {
        await fs.mkdir(path.dirname(config.notifications.logFile), { recursive: true });
        await fs.appendFile(config.notifications.logFile, logText + '\n');
      } catch (error) {
        console.error('写入日志文件失败:', error.message);
      }
    }
  }
  
  static async info(message, data) {
    await this.log('info', message, data);
  }
  
  static async warn(message, data) {
    await this.log('warn', message, data);
  }
  
  static async error(message, data) {
    await this.log('error', message, data);
  }
  
  static async success(message, data) {
    await this.log('success', message, data);
  }
}

/**
 * 测试结果管理器
 */
class TestResultManager {
  static async saveResult(testType, result) {
    try {
      await fs.mkdir(config.testing.testResultsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${testType}_${timestamp}.json`;
      const filepath = path.join(config.testing.testResultsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(result, null, 2));
      await Logger.info(`测试结果已保存`, { file: filename });
      
      return filepath;
    } catch (error) {
      await Logger.error(`保存测试结果失败`, { error: error.message });
      throw error;
    }
  }
  
  static async getLatestResults(testType, count = 5) {
    try {
      const files = await fs.readdir(config.testing.testResultsDir);
      const testFiles = files
        .filter(file => file.startsWith(testType) && file.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, count);
      
      const results = [];
      for (const file of testFiles) {
        const filepath = path.join(config.testing.testResultsDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        results.push({
          filename: file,
          data: JSON.parse(content)
        });
      }
      
      return results;
    } catch (error) {
      await Logger.error(`获取测试结果失败`, { error: error.message });
      return [];
    }
  }
}

/**
 * 虚拟用户管理任务
 */
class VirtualUserManager {
  static async generateUsers() {
    try {
      await Logger.info('开始定时生成虚拟用户');
      
      const result = await batchCreateUsers(config.testing.userBatchSize, {
        useDatabase: true,
        batchSize: 5
      });
      
      await TestResultManager.saveResult('user_generation', {
        type: 'user_generation',
        timestamp: new Date().toISOString(),
        config: {
          batchSize: config.testing.userBatchSize
        },
        result: result
      });
      
      await Logger.success('虚拟用户生成完成', {
        success: result.success,
        failed: result.failed,
        total: result.total
      });
      
      return result;
    } catch (error) {
      await Logger.error('虚拟用户生成失败', { error: error.message });
      throw error;
    }
  }
  
  static async cleanupUsers() {
    try {
      await Logger.info('开始定时清理虚拟用户');
      
      const deletedCount = await clearVirtualUsers();
      
      await TestResultManager.saveResult('user_cleanup', {
        type: 'user_cleanup',
        timestamp: new Date().toISOString(),
        result: {
          deletedCount: deletedCount
        }
      });
      
      await Logger.success('虚拟用户清理完成', { deletedCount });
      
      return deletedCount;
    } catch (error) {
      await Logger.error('虚拟用户清理失败', { error: error.message });
      throw error;
    }
  }
}

/**
 * 压力测试执行器
 */
class LoadTestExecutor {
  static async runTest(configFile, testType) {
    return new Promise((resolve, reject) => {
      const configPath = path.join(__dirname, '..', 'config', configFile);
      const command = `npx artillery run ${configPath}`;
      
      Logger.info(`开始执行${testType}测试`, { command });
      
      const startTime = Date.now();
      exec(command, { 
        cwd: path.join(__dirname, '..'),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }, async (error, stdout, stderr) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (error) {
          await Logger.error(`${testType}测试执行失败`, { 
            error: error.message,
            stderr: stderr 
          });
          reject(error);
          return;
        }
        
        // 解析Artillery输出结果
        const result = this.parseArtilleryOutput(stdout);
        
        const testResult = {
          type: testType,
          timestamp: new Date().toISOString(),
          duration: duration,
          configFile: configFile,
          result: result,
          stdout: stdout,
          stderr: stderr
        };
        
        try {
          await TestResultManager.saveResult(testType, testResult);
          await Logger.success(`${testType}测试完成`, {
            duration: `${duration}ms`,
            ...result.summary
          });
          resolve(testResult);
        } catch (saveError) {
          await Logger.error(`保存${testType}测试结果失败`, { error: saveError.message });
          resolve(testResult);
        }
      });
    });
  }
  
  static parseArtilleryOutput(stdout) {
    try {
      // 解析Artillery的输出，提取关键指标
      const lines = stdout.split('\n');
      const summary = {};
      
      lines.forEach(line => {
        if (line.includes('http.response_time:')) {
          const match = line.match(/min: ([\d.]+).*max: ([\d.]+).*median: ([\d.]+).*p95: ([\d.]+).*p99: ([\d.]+)/);
          if (match) {
            summary.responseTime = {
              min: parseFloat(match[1]),
              max: parseFloat(match[2]),
              median: parseFloat(match[3]),
              p95: parseFloat(match[4]),
              p99: parseFloat(match[5])
            };
          }
        }
        
        if (line.includes('http.codes.')) {
          const codeMatch = line.match(/http\.codes\.(\d+):\s*(\d+)/);
          if (codeMatch) {
            if (!summary.statusCodes) summary.statusCodes = {};
            summary.statusCodes[codeMatch[1]] = parseInt(codeMatch[2]);
          }
        }
        
        if (line.includes('scenarios.completed:')) {
          const scenarioMatch = line.match(/scenarios\.completed:\s*(\d+)/);
          if (scenarioMatch) {
            summary.scenariosCompleted = parseInt(scenarioMatch[1]);
          }
        }
        
        if (line.includes('scenarios.created:')) {
          const createdMatch = line.match(/scenarios\.created:\s*(\d+)/);
          if (createdMatch) {
            summary.scenariosCreated = parseInt(createdMatch[1]);
          }
        }
      });
      
      return {
        success: true,
        summary: summary,
        rawOutput: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rawOutput: stdout
      };
    }
  }
  
  static async runLoadTest() {
    return await this.runTest('test-config.yml', 'load_test');
  }
  
  static async runStressTest() {
    return await this.runTest('stress-test.yml', 'stress_test');
  }
}

/**
 * 主调度器类
 */
class TestScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) {
      Logger.warn('调度器已在运行中');
      return;
    }
    
    this.isRunning = true;
    Logger.info('🚀 测试调度器启动');
    
    // 定时清理虚拟用户
    if (config.testing.enableCleanup) {
      const cleanupTask = cron.schedule(config.scheduling.cleanupSchedule, async () => {
        try {
          await VirtualUserManager.cleanupUsers();
        } catch (error) {
          await Logger.error('定时清理任务失败', { error: error.message });
        }
      }, { scheduled: false });
      
      this.tasks.push({ name: 'cleanup', task: cleanupTask });
      cleanupTask.start();
      Logger.info('✅ 定时清理任务已启动', { 
        schedule: config.scheduling.cleanupSchedule 
      });
    }
    
    // 定时生成虚拟用户
    if (config.testing.enableUserGeneration) {
      const userGenTask = cron.schedule(config.scheduling.userGenerationSchedule, async () => {
        try {
          await VirtualUserManager.generateUsers();
        } catch (error) {
          await Logger.error('定时用户生成任务失败', { error: error.message });
        }
      }, { scheduled: false });
      
      this.tasks.push({ name: 'userGeneration', task: userGenTask });
      userGenTask.start();
      Logger.info('✅ 定时用户生成任务已启动', { 
        schedule: config.scheduling.userGenerationSchedule,
        batchSize: config.testing.userBatchSize
      });
    }
    
    // 定时执行负载测试
    if (config.testing.enableLoadTesting) {
      const loadTestTask = cron.schedule(config.scheduling.loadTestSchedule, async () => {
        try {
          await LoadTestExecutor.runLoadTest();
        } catch (error) {
          await Logger.error('定时负载测试任务失败', { error: error.message });
        }
      }, { scheduled: false });
      
      this.tasks.push({ name: 'loadTest', task: loadTestTask });
      loadTestTask.start();
      Logger.info('✅ 定时负载测试任务已启动', { 
        schedule: config.scheduling.loadTestSchedule 
      });
    }
    
    // 定时执行压力测试
    if (config.testing.enableLoadTesting) {
      const stressTestTask = cron.schedule(config.scheduling.stressTestSchedule, async () => {
        try {
          await LoadTestExecutor.runStressTest();
        } catch (error) {
          await Logger.error('定时压力测试任务失败', { error: error.message });
        }
      }, { scheduled: false });
      
      this.tasks.push({ name: 'stressTest', task: stressTestTask });
      stressTestTask.start();
      Logger.info('✅ 定时压力测试任务已启动', { 
        schedule: config.scheduling.stressTestSchedule 
      });
    }
    
    Logger.success(`🎯 测试调度器启动完成，共启动 ${this.tasks.length} 个定时任务`);
  }
  
  stop() {
    if (!this.isRunning) {
      Logger.warn('调度器未在运行');
      return;
    }
    
    Logger.info('🛑 正在停止测试调度器...');
    
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      Logger.info(`⏹️ ${name} 任务已停止`);
    });
    
    this.tasks = [];
    this.isRunning = false;
    
    Logger.success('✅ 测试调度器已停止');
  }
  
  async getStatus() {
    const status = {
      isRunning: this.isRunning,
      activeTasks: this.tasks.length,
      config: config,
      uptime: process.uptime()
    };
    
    // 获取最近的测试结果
    try {
      status.recentResults = {
        userGeneration: await TestResultManager.getLatestResults('user_generation', 3),
        loadTest: await TestResultManager.getLatestResults('load_test', 3),
        stressTest: await TestResultManager.getLatestResults('stress_test', 3)
      };
    } catch (error) {
      await Logger.error('获取测试结果状态失败', { error: error.message });
    }
    
    return status;
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  const scheduler = new TestScheduler();
  
  async function main() {
    try {
      switch (command) {
        case 'start':
          scheduler.start();
          
          // 保持进程运行
          process.on('SIGINT', () => {
            Logger.info('收到停止信号，正在关闭调度器...');
            scheduler.stop();
            process.exit(0);
          });
          
          process.on('SIGTERM', () => {
            Logger.info('收到终止信号，正在关闭调度器...');
            scheduler.stop();
            process.exit(0);
          });
          
          break;
          
        case 'stop':
          scheduler.stop();
          break;
          
        case 'status':
          const status = await scheduler.getStatus();
          console.log('📊 调度器状态:');
          console.log(JSON.stringify(status, null, 2));
          break;
          
        case 'test-user-gen':
          console.log('🧪 测试用户生成...');
          await VirtualUserManager.generateUsers();
          break;
          
        case 'test-load':
          console.log('🧪 测试负载测试...');
          await LoadTestExecutor.runLoadTest();
          break;
          
        case 'test-stress':
          console.log('🧪 测试压力测试...');
          await LoadTestExecutor.runStressTest();
          break;
          
        case 'cleanup':
          console.log('🧹 执行清理...');
          await VirtualUserManager.cleanupUsers();
          break;
          
        default:
          console.log('❓ 使用方法:');
          console.log('  node scheduledTesting.js start          - 启动定时任务');
          console.log('  node scheduledTesting.js stop           - 停止定时任务');
          console.log('  node scheduledTesting.js status         - 查看状态');
          console.log('  node scheduledTesting.js test-user-gen  - 测试用户生成');
          console.log('  node scheduledTesting.js test-load      - 测试负载测试');
          console.log('  node scheduledTesting.js test-stress    - 测试压力测试');
          console.log('  node scheduledTesting.js cleanup        - 清理虚拟用户');
      }
    } catch (error) {
      await Logger.error('命令执行失败', { command, error: error.message });
      process.exit(1);
    }
  }
  
  main();
}

module.exports = {
  TestScheduler,
  VirtualUserManager,
  LoadTestExecutor,
  TestResultManager,
  Logger,
  config
};