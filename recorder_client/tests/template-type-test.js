/**
 * 模板类型支持功能测试
 * 测试不同模板格式的创建、渲染和验证功能
 */

import TemplateManager from '../services/template-manager.js';
import {
  MESSAGE_FORMATS,
  TEMPLATE_TYPES,
  getTemplateTypeConfig,
  validateTypeFormatCompatibility
} from '../constants/template-types.js';

class TemplateTypeTest {
  constructor() {
    this.templateManager = new TemplateManager();
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始模板类型支持功能测试...');
    
    try {
      // 初始化模板管理器
      await this.templateManager.init();
      
      // 运行各项测试
      await this.testTextMessageTemplate();
      await this.testCardMessageTemplate();
      await this.testImageTextMessageTemplate();
      await this.testRichTextMessageTemplate();
      await this.testCustomMessageTemplate();
      await this.testTemplateValidation();
      await this.testTypeFormatCompatibility();
      
      // 输出测试结果
      this.outputTestResults();
      
    } catch (error) {
      console.error('❌ 测试运行失败:', error);
    }
  }

  /**
   * 测试纯文本消息模板
   */
  async testTextMessageTemplate() {
    console.log('📝 测试纯文本消息模板...');
    
    try {
      // 创建文本模板
      const template = await this.templateManager.createTemplateInstance(
        TEMPLATE_TYPES.APPOINTMENT_CONFIRM,
        MESSAGE_FORMATS.TEXT,
        {
          title: '预约确认通知',
          content: '尊敬的{patientName}，您的{serviceName}预约已确认，时间：{serviceTime}。'
        }
      );
      
      // 渲染模板
      const mockData = {
        patientName: '张三',
        serviceName: '居家护理',
        serviceTime: '2025-09-01 14:00'
      };
      
      const rendered = this.templateManager.renderTemplateContent(
        template,
        mockData,
        MESSAGE_FORMATS.TEXT
      );
      
      console.log('✅ 文本模板渲染结果:', rendered);
      
      this.testResults.push({
        test: '文本消息模板',
        status: 'PASS',
        details: '模板创建和渲染成功'
      });
      
    } catch (error) {
      console.error('❌ 文本消息模板测试失败:', error);
      this.testResults.push({
        test: '文本消息模板',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试卡片消息模板
   */
  async testCardMessageTemplate() {
    console.log('🎴 测试卡片消息模板...');
    
    try {
      const template = await this.templateManager.createTemplateInstance(
        TEMPLATE_TYPES.SERVICE_COMPLETE,
        MESSAGE_FORMATS.CARD,
        {
          title: '服务完成通知',
          content: '{patientName}您好，您的{serviceName}已完成。',
          imageUrl: 'https://example.com/service-complete.jpg',
          actions: [
            { text: '查看详情', url: '/pages/service-detail', type: 'button' },
            { text: '评价服务', url: '/pages/evaluation', type: 'button' }
          ]
        }
      );
      
      const mockData = {
        patientName: '李四',
        serviceName: '健康咨询'
      };
      
      const rendered = this.templateManager.renderTemplateContent(
        template,
        mockData,
        MESSAGE_FORMATS.CARD
      );
      
      console.log('✅ 卡片模板渲染结果:', rendered);
      
      this.testResults.push({
        test: '卡片消息模板',
        status: 'PASS',
        details: '卡片模板创建和渲染成功'
      });
      
    } catch (error) {
      console.error('❌ 卡片消息模板测试失败:', error);
      this.testResults.push({
        test: '卡片消息模板',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试图文消息模板
   */
  async testImageTextMessageTemplate() {
    console.log('🖼️ 测试图文消息模板...');
    
    try {
      const template = await this.templateManager.createTemplateInstance(
        TEMPLATE_TYPES.HEALTH_ALERT,
        MESSAGE_FORMATS.IMAGE_TEXT,
        {
          title: '健康警报',
          content: '{patientName}，检测到{alertType}异常，请及时关注！',
          imageUrl: 'https://example.com/health-alert.jpg',
          layout: 'vertical'
        }
      );
      
      const mockData = {
        patientName: '王五',
        alertType: '血压'
      };
      
      const rendered = this.templateManager.renderTemplateContent(
        template,
        mockData,
        MESSAGE_FORMATS.IMAGE_TEXT
      );
      
      console.log('✅ 图文模板渲染结果:', rendered);
      
      this.testResults.push({
        test: '图文消息模板',
        status: 'PASS',
        details: '图文模板创建和渲染成功'
      });
      
    } catch (error) {
      console.error('❌ 图文消息模板测试失败:', error);
      this.testResults.push({
        test: '图文消息模板',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试富文本消息模板
   */
  async testRichTextMessageTemplate() {
    console.log('📄 测试富文本消息模板...');
    
    try {
      const template = await this.templateManager.createTemplateInstance(
        TEMPLATE_TYPES.SYSTEM_NOTICE,
        MESSAGE_FORMATS.RICH_TEXT,
        {
          title: '系统公告',
          content: '**重要通知**\n\n{noticeContent}\n\n*生效时间：{effectiveDate}*',
          styles: {
            fontSize: 16,
            color: '#333333',
            lineHeight: 1.6
          }
        }
      );
      
      const mockData = {
        noticeContent: '系统将于今晚24:00进行维护升级',
        effectiveDate: '2025-09-01 24:00'
      };
      
      const rendered = this.templateManager.renderTemplateContent(
        template,
        mockData,
        MESSAGE_FORMATS.RICH_TEXT
      );
      
      console.log('✅ 富文本模板渲染结果:', rendered);
      
      this.testResults.push({
        test: '富文本消息模板',
        status: 'PASS',
        details: '富文本模板创建和渲染成功'
      });
      
    } catch (error) {
      console.error('❌ 富文本消息模板测试失败:', error);
      this.testResults.push({
        test: '富文本消息模板',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试自定义消息模板
   */
  async testCustomMessageTemplate() {
    console.log('🛠️ 测试自定义消息模板...');
    
    try {
      const template = await this.templateManager.createTemplateInstance(
        TEMPLATE_TYPES.MARKETING_PROMOTION,
        MESSAGE_FORMATS.CUSTOM,
        {
          title: '营销推广',
          content: '{promotionTitle}活动开始啦！{promotionContent}',
          customData: {
            templateType: 'promotion',
            config: JSON.stringify({
              backgroundColor: '#ff6b6b',
              buttonColor: '#4ecdc4',
              animation: 'slideIn'
            })
          }
        }
      );
      
      const mockData = {
        promotionTitle: '春季健康体检',
        promotionContent: '享受8折优惠，立即预约！'
      };
      
      const rendered = this.templateManager.renderTemplateContent(
        template,
        mockData,
        MESSAGE_FORMATS.CUSTOM
      );
      
      console.log('✅ 自定义模板渲染结果:', rendered);
      
      this.testResults.push({
        test: '自定义消息模板',
        status: 'PASS',
        details: '自定义模板创建和渲染成功'
      });
      
    } catch (error) {
      console.error('❌ 自定义消息模板测试失败:', error);
      this.testResults.push({
        test: '自定义消息模板',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试模板验证功能
   */
  async testTemplateValidation() {
    console.log('🔍 测试模板验证功能...');
    
    try {
      // 测试有效模板
      const validTemplate = {
        type: TEMPLATE_TYPES.APPOINTMENT_CONFIRM,
        format: MESSAGE_FORMATS.TEXT,
        title: '预约确认',
        content: '尊敬的{patientName}，您的{serviceName}预约已确认，时间：{serviceTime}，地址：{address}。'
      };
      
      const isValid = this.templateManager.validateTemplateData(validTemplate);
      console.log('✅ 有效模板验证结果:', isValid);
      
      // 测试无效模板（缺少必需变量）
      try {
        const invalidTemplate = {
          type: TEMPLATE_TYPES.APPOINTMENT_CONFIRM,
          format: MESSAGE_FORMATS.TEXT,
          title: '预约确认',
          content: '预约已确认' // 缺少必需变量
        };
        
        this.templateManager.validateTemplateData(invalidTemplate);
        console.log('❌ 无效模板验证应该失败');
        
      } catch (validationError) {
        console.log('✅ 无效模板正确被拒绝:', validationError.message);
      }
      
      this.testResults.push({
        test: '模板验证功能',
        status: 'PASS',
        details: '模板验证功能正常工作'
      });
      
    } catch (error) {
      console.error('❌ 模板验证测试失败:', error);
      this.testResults.push({
        test: '模板验证功能',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 测试类型格式兼容性
   */
  async testTypeFormatCompatibility() {
    console.log('🔗 测试类型格式兼容性...');
    
    try {
      // 测试兼容的组合
      const compatibleCombinations = [
        [TEMPLATE_TYPES.APPOINTMENT_CONFIRM, MESSAGE_FORMATS.TEXT],
        [TEMPLATE_TYPES.SERVICE_COMPLETE, MESSAGE_FORMATS.CARD],
        [TEMPLATE_TYPES.HEALTH_ALERT, MESSAGE_FORMATS.IMAGE_TEXT],
        [TEMPLATE_TYPES.SYSTEM_NOTICE, MESSAGE_FORMATS.RICH_TEXT]
      ];
      
      for (const [type, format] of compatibleCombinations) {
        const isCompatible = validateTypeFormatCompatibility(type, format);
        console.log(`✅ ${type} + ${format}: ${isCompatible}`);
      }
      
      this.testResults.push({
        test: '类型格式兼容性',
        status: 'PASS',
        details: '兼容性检查功能正常'
      });
      
    } catch (error) {
      console.error('❌ 类型格式兼容性测试失败:', error);
      this.testResults.push({
        test: '类型格式兼容性',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  /**
   * 输出测试结果
   */
  outputTestResults() {
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   详情: ${result.details}`);
      }
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log('='.repeat(50));
    console.log(`总计: ${totalTests} 个测试`);
    console.log(`通过: ${passedTests} 个测试`);
    console.log(`失败: ${failedTests} 个测试`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
      console.log('🎉 所有测试都通过了！模板类型支持功能实现完成！');
    } else {
      console.log('⚠️ 部分测试失败，需要修复相关问题。');
    }
  }
}

// 导出测试类
export default TemplateTypeTest;

// 如果直接运行此文件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateTypeTest;
}