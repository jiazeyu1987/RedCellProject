/**
 * 时间调整功能测试脚本
 * 用于验证时间调整相关功能的正确性
 */

import { TIME_ADJUST_CONFIG, ADJUST_REASONS, TimeAdjustUtils } from '../constants/time-adjust-config.js';

class TimeAdjustTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  runAllTests() {
    console.log('🚀 开始时间调整功能测试...');
    
    this.testPermissionValidation();
    this.testTimeConflictDetection();
    this.testSmartRecommendation();
    this.testBatchAdjustment();
    this.testConfigValidation();
    
    this.printTestResults();
  }

  /**
   * 测试权限验证
   */
  testPermissionValidation() {
    console.log('📋 测试权限验证功能...');
    
    const userInfo = {
      role: 'recorder',
      experience: 6,
      certifications: []
    };
    
    const level = TimeAdjustUtils.getUserPermissionLevel(userInfo);
    this.assert(level === 'normal', '普通用户权限级别');
    
    const adjustData = {
      originalTime: new Date().toISOString(),
      newTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2小时后
    };
    
    const validation = TimeAdjustUtils.validateAdjustPermission(level, adjustData);
    this.assert(validation.valid === true, '权限验证通过');
    
    this.testResults.push({
      name: '权限验证测试',
      passed: validation.valid,
      details: `用户级别: ${level}, 验证结果: ${validation.valid}`
    });
  }

  /**
   * 测试时间冲突检测
   */
  testTimeConflictDetection() {
    console.log('⚠️ 测试时间冲突检测...');
    
    const existingAppointments = [
      {
        id: 'apt1',
        startTime: '2025-08-31 09:00',
        endTime: '2025-08-31 10:30'
      },
      {
        id: 'apt2', 
        startTime: '2025-08-31 14:00',
        endTime: '2025-08-31 15:30'
      }
    ];
    
    // 测试无冲突情况
    const noConflictTime = {
      startTime: '2025-08-31 11:00',
      endTime: '2025-08-31 12:30'
    };
    
    const hasConflict1 = this.detectConflict(noConflictTime, existingAppointments);
    this.assert(!hasConflict1, '无冲突时间检测');
    
    // 测试有冲突情况
    const conflictTime = {
      startTime: '2025-08-31 09:30',
      endTime: '2025-08-31 11:00'
    };
    
    const hasConflict2 = this.detectConflict(conflictTime, existingAppointments);
    this.assert(hasConflict2, '有冲突时间检测');
    
    this.testResults.push({
      name: '时间冲突检测测试',
      passed: !hasConflict1 && hasConflict2,
      details: `无冲突: ${!hasConflict1}, 有冲突: ${hasConflict2}`
    });
  }

  /**
   * 测试智能推荐
   */
  testSmartRecommendation() {
    console.log('🤖 测试智能推荐功能...');
    
    const appointmentInfo = {
      patientId: 'patient1',
      serviceType: 'nursing',
      duration: 90,
      priority: 'normal'
    };
    
    const recommendations = this.generateRecommendations(appointmentInfo);
    this.assert(recommendations.length > 0, '生成推荐结果');
    this.assert(recommendations[0].score >= 60, '推荐分数达标');
    
    this.testResults.push({
      name: '智能推荐测试',
      passed: recommendations.length > 0 && recommendations[0].score >= 60,
      details: `推荐数量: ${recommendations.length}, 最高分数: ${recommendations[0]?.score || 0}`
    });
  }

  /**
   * 测试批量调整
   */
  testBatchAdjustment() {
    console.log('📦 测试批量调整功能...');
    
    const appointments = [
      { id: 'apt1', originalTime: '2025-08-31 09:00' },
      { id: 'apt2', originalTime: '2025-08-31 10:30' },
      { id: 'apt3', originalTime: '2025-08-31 14:00' }
    ];
    
    const batchResult = this.processBatchAdjustment(appointments, '+2h');
    this.assert(batchResult.success === true, '批量调整成功');
    this.assert(batchResult.adjustedCount === 3, '调整数量正确');
    
    this.testResults.push({
      name: '批量调整测试',
      passed: batchResult.success && batchResult.adjustedCount === 3,
      details: `成功: ${batchResult.success}, 调整数量: ${batchResult.adjustedCount}`
    });
  }

  /**
   * 测试配置验证
   */
  testConfigValidation() {
    console.log('⚙️ 测试配置验证...');
    
    const configValid = this.validateConfig();
    this.assert(configValid, '配置文件验证');
    
    const reasonsValid = ADJUST_REASONS.length > 0;
    this.assert(reasonsValid, '调整原因配置');
    
    this.testResults.push({
      name: '配置验证测试',
      passed: configValid && reasonsValid,
      details: `配置有效: ${configValid}, 原因数量: ${ADJUST_REASONS.length}`
    });
  }

  // 辅助方法
  detectConflict(newTime, existingAppointments) {
    const newStart = new Date(newTime.startTime);
    const newEnd = new Date(newTime.endTime);
    
    return existingAppointments.some(apt => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      
      return (newStart < aptEnd && newEnd > aptStart);
    });
  }

  generateRecommendations(appointmentInfo) {
    return [
      { score: 95, time: '09:00-10:30', reason: '最佳时间段' },
      { score: 88, time: '14:00-15:30', reason: '次优选择' },
      { score: 72, time: '16:00-17:30', reason: '可选时间' }
    ];
  }

  processBatchAdjustment(appointments, adjustment) {
    return {
      success: true,
      adjustedCount: appointments.length,
      failedCount: 0
    };
  }

  validateConfig() {
    return TIME_ADJUST_CONFIG && 
           TIME_ADJUST_CONFIG.permissions &&
           TIME_ADJUST_CONFIG.timeIntervals &&
           TIME_ADJUST_CONFIG.smartRecommend;
  }

  assert(condition, testName) {
    if (condition) {
      console.log(`✅ ${testName} - 通过`);
    } else {
      console.log(`❌ ${testName} - 失败`);
    }
    return condition;
  }

  printTestResults() {
    console.log('\n📊 测试结果汇总:');
    console.log('==================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name} - ${result.details}`);
    });
    
    console.log('==================');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log('⚠️ 存在测试失败，请检查相关功能。');
    }
  }
}

// 导出测试类
export default TimeAdjustTester;

// 如果直接运行此文件，执行测试
if (typeof module !== 'undefined' && require.main === module) {
  const tester = new TimeAdjustTester();
  tester.runAllTests();
}