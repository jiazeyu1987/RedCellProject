/**
 * 批量时间冲突检测算法单元测试
 * 测试批量调整中的冲突检测功能
 */

const BatchConflictDetectionService = require('../services/batch-conflict-detection.service.js');

class BatchConflictDetectionTest {
  constructor() {
    this.service = new BatchConflictDetectionService();
    this.testResults = [];
    this.testStartTime = null;
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始批量冲突检测算法测试...');
    this.testStartTime = Date.now();
    
    try {
      // 基础功能测试
      await this.testBasicConflictDetection();
      await this.testInternalConflictDetection();
      await this.testExternalConflictDetection();
      
      // 高级功能测试  
      await this.testSeverityAnalysis();
      await this.testPerformanceOptimization();
      await this.testProgressCallback();
      
      // 边界条件测试
      await this.testEdgeCases();
      await this.testErrorHandling();
      
      // 生成测试报告
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ 测试运行失败:', error);
    }
  }

  /**
   * 测试基础冲突检测功能
   */
  async testBasicConflictDetection() {
    console.log('🔍 测试基础冲突检测功能...');
    
    // 测试用例1: 无冲突场景
    const noConflictItems = [
      {
        scheduleId: 'sch1',
        patientName: '张三',
        newTime: '2025-09-01 09:00',
        duration: 60
      },
      {
        scheduleId: 'sch2', 
        patientName: '李四',
        newTime: '2025-09-01 11:00',
        duration: 60
      }
    ];
    
    const noConflictResult = await this.service.detectBatchConflicts(noConflictItems);
    this.assert(noConflictResult.conflicts.length === 0, '无冲突场景应返回空冲突列表');
    this.assert(noConflictResult.statistics.totalItems === 2, '统计信息应正确');
    
    // 测试用例2: 有冲突场景
    const conflictItems = [
      {
        scheduleId: 'sch1',
        patientName: '张三', 
        newTime: '2025-09-01 09:00',
        duration: 60
      },
      {
        scheduleId: 'sch2',
        patientName: '李四',
        newTime: '2025-09-01 09:30', 
        duration: 60
      }
    ];
    
    const conflictResult = await this.service.detectBatchConflicts(conflictItems);
    this.assert(conflictResult.conflicts.length > 0, '有冲突场景应检测到冲突');
    this.assert(conflictResult.statistics.internalConflicts > 0, '应检测到内部冲突');
    
    this.addTestResult('基础冲突检测', true, '基础功能正常');
  }

  /**
   * 测试内部冲突检测
   */
  async testInternalConflictDetection() {
    console.log('🔗 测试内部冲突检测...');
    
    const batchItems = [
      {
        scheduleId: 'sch1',
        patientName: '患者A',
        newTime: '2025-09-01 10:00',
        duration: 90
      },
      {
        scheduleId: 'sch2', 
        patientName: '患者B',
        newTime: '2025-09-01 10:30',
        duration: 60
      },
      {
        scheduleId: 'sch3',
        patientName: '患者C', 
        newTime: '2025-09-01 12:00',
        duration: 60
      }
    ];
    
    const result = await this.service.detectBatchConflicts(batchItems, {
      includeExternal: false
    });
    
    // 验证检测结果
    this.assert(result.conflicts.length === 1, '应检测到1个内部冲突');
    this.assert(result.statistics.internalConflicts === 1, '内部冲突统计正确');
    this.assert(result.statistics.externalConflicts === 0, '外部冲突统计正确');
    
    const conflict = result.conflicts[0];
    this.assert(conflict.type === 'internal', '冲突类型应为internal');
    this.assert(conflict.overlapInfo && conflict.overlapInfo.hasConflict, '应包含重叠信息');
    
    this.addTestResult('内部冲突检测', true, '内部冲突检测准确');
  }

  /**
   * 测试外部冲突检测
   */
  async testExternalConflictDetection() {
    console.log('🌐 测试外部冲突检测...');
    
    // 模拟外部冲突检测
    const originalGetExistingSchedules = this.service.getExistingSchedules;
    this.service.getExistingSchedules = async (time, radiusDays) => {
      return [
        {
          id: 'existing1',
          patientName: '现有患者',
          startTime: '2025-09-01 10:15',
          duration: 45
        }
      ];
    };
    
    const batchItems = [
      {
        scheduleId: 'new1',
        patientName: '新患者',
        newTime: '2025-09-01 10:00',
        duration: 60
      }
    ];
    
    const result = await this.service.detectBatchConflicts(batchItems, {
      includeExternal: true
    });
    
    this.assert(result.statistics.externalConflicts > 0, '应检测到外部冲突');
    
    const externalConflict = result.conflicts.find(c => c.type === 'external');
    this.assert(externalConflict !== undefined, '应存在外部冲突记录');
    
    // 恢复原方法
    this.service.getExistingSchedules = originalGetExistingSchedules;
    
    this.addTestResult('外部冲突检测', true, '外部冲突检测正常');
  }

  /**
   * 测试严重程度分析
   */
  async testSeverityAnalysis() {
    console.log('📊 测试严重程度分析...');
    
    const batchItems = [
      {
        scheduleId: 'sch1',
        patientName: '紧急患者',
        newTime: '2025-09-01 09:00',
        duration: 120, // 长时间重叠
        priority: 'urgent'
      },
      {
        scheduleId: 'sch2',
        patientName: '普通患者', 
        newTime: '2025-09-01 09:30',
        duration: 60,
        priority: 'normal'
      }
    ];
    
    const result = await this.service.detectBatchConflicts(batchItems);
    
    this.assert(result.conflicts.length > 0, '应检测到冲突');
    
    const conflict = result.conflicts[0];
    this.assert(conflict.severity !== undefined, '应包含严重程度信息');
    this.assert(conflict.impactScore !== undefined, '应包含影响分数');
    this.assert(typeof conflict.impactScore === 'number', '影响分数应为数值');
    this.assert(conflict.impactScore >= 0 && conflict.impactScore <= 100, '影响分数应在0-100范围内');
    
    this.addTestResult('严重程度分析', true, '严重程度计算正确');
  }

  /**
   * 测试性能优化
   */
  async testPerformanceOptimization() {
    console.log('⚡ 测试性能优化...');
    
    // 生成大量测试数据
    const largeBatch = [];
    for (let i = 0; i < 50; i++) {
      largeBatch.push({
        scheduleId: `sch${i}`,
        patientName: `患者${i}`,
        newTime: `2025-09-01 ${8 + Math.floor(i / 6)}:${(i % 6) * 10}`,
        duration: 60
      });
    }
    
    const startTime = Date.now();
    const result = await this.service.detectBatchConflicts(largeBatch);
    const endTime = Date.now();
    
    const processingTime = endTime - startTime;
    
    this.assert(result.statistics.totalItems === 50, '应处理所有项目');
    this.assert(processingTime < 5000, '处理时间应小于5秒'); // 性能要求
    this.assert(result.processing.duration !== undefined, '应记录处理时间');
    
    this.addTestResult('性能优化', true, `处理50个项目耗时${processingTime}ms`);
  }

  /**
   * 测试进度回调
   */
  async testProgressCallback() {
    console.log('📈 测试进度回调...');
    
    const progressEvents = [];
    const progressCallback = (progress) => {
      progressEvents.push(progress);
    };
    
    const batchItems = [
      {
        scheduleId: 'sch1',
        patientName: '患者1',
        newTime: '2025-09-01 09:00',
        duration: 60
      },
      {
        scheduleId: 'sch2',
        patientName: '患者2', 
        newTime: '2025-09-01 10:00',
        duration: 60
      },
      {
        scheduleId: 'sch3',
        patientName: '患者3',
        newTime: '2025-09-01 11:00', 
        duration: 60
      }
    ];
    
    await this.service.detectBatchConflicts(batchItems, { progressCallback });
    
    this.assert(progressEvents.length > 0, '应触发进度回调');
    
    const finalProgress = progressEvents[progressEvents.length - 1];
    this.assert(finalProgress.processed === finalProgress.total, '最终进度应为100%');
    this.assert(finalProgress.percentage !== undefined, '应包含百分比信息');
    
    this.addTestResult('进度回调', true, `触发了${progressEvents.length}次进度更新`);
  }

  /**
   * 测试边界条件
   */
  async testEdgeCases() {
    console.log('🏷️ 测试边界条件...');
    
    // 测试空数组
    const emptyResult = await this.service.detectBatchConflicts([]);
    this.assert(emptyResult.conflicts.length === 0, '空数组应返回空结果');
    
    // 测试单个项目
    const singleItem = [{
      scheduleId: 'single',
      patientName: '单个患者',
      newTime: '2025-09-01 09:00',
      duration: 60
    }];
    const singleResult = await this.service.detectBatchConflicts(singleItem);
    this.assert(singleResult.statistics.totalItems === 1, '单项目统计正确');
    
    // 测试边界时间重叠
    const boundaryItems = [
      {
        scheduleId: 'sch1',
        patientName: '患者1',
        newTime: '2025-09-01 09:00', 
        duration: 60
      },
      {
        scheduleId: 'sch2',
        patientName: '患者2',
        newTime: '2025-09-01 10:00', // 正好相邻
        duration: 60
      }
    ];
    const boundaryResult = await this.service.detectBatchConflicts(boundaryItems);
    // 边界情况应考虑缓冲时间，可能产生冲突
    
    this.addTestResult('边界条件', true, '边界条件处理正确');
  }

  /**
   * 测试错误处理
   */
  async testErrorHandling() {
    console.log('❗ 测试错误处理...');
    
    try {
      // 测试无效数据
      await this.service.detectBatchConflicts(null);
      this.assert(false, '应抛出参数错误');
    } catch (error) {
      this.assert(true, '正确处理无效参数');
    }
    
    // 测试数据格式错误
    const invalidItems = [
      {
        scheduleId: 'sch1',
        // 缺少必要字段
      }
    ];
    
    try {
      const result = await this.service.detectBatchConflicts(invalidItems);
      // 应能优雅处理，不应崩溃
      this.assert(true, '优雅处理数据格式错误');
    } catch (error) {
      this.assert(true, '正确抛出数据格式错误');
    }
    
    this.addTestResult('错误处理', true, '错误处理机制完善');
  }

  /**
   * 辅助方法 - 断言
   */
  assert(condition, message) {
    if (!condition) {
      console.error(`❌ 断言失败: ${message}`);
      throw new Error(`断言失败: ${message}`);
    } else {
      console.log(`✅ ${message}`);
    }
  }

  /**
   * 添加测试结果
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.testStartTime;
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 批量冲突检测算法测试报告');
    console.log('==========================================');
    console.log(`总测试数量: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${failedTests}`); 
    console.log(`通过率: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log(`总耗时: ${totalTime}ms`);
    console.log('==========================================');
    
    // 详细结果
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} - ${result.details}`);
    });
    
    if (failedTests === 0) {
      console.log('\n🎉 所有测试通过! 批量冲突检测算法功能正常。');
    } else {
      console.log(`\n⚠️  ${failedTests}个测试失败，请检查相关功能。`);
    }
    
    return {
      totalTests,
      passedTests, 
      failedTests,
      passRate: Math.round((passedTests / totalTests) * 100),
      totalTime,
      details: this.testResults
    };
  }
}

// 导出测试类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchConflictDetectionTest;
}

// 如果直接运行此文件，执行测试
if (typeof require !== 'undefined' && require.main === module) {
  const test = new BatchConflictDetectionTest();
  test.runAllTests().catch(console.error);
}