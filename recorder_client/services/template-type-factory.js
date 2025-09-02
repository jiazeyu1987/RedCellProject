/**
 * 模板类型工厂服务
 * 负责根据不同类型创建和配置通知模板
 */

const {
  TEMPLATE_TYPES,
  MESSAGE_FORMATS,
  NOTIFICATION_CHANNELS,
  getTemplateTypeConfig,
  getFormatConfig,
  getChannelConfig,
  validateTypeFormatCompatibility,
  validateTypeChannelCompatibility,
  getDefaultTemplate
} = require('../constants/template-types.js');

class TemplateTypeFactory {
  constructor() {
    this.builders = new Map();
    this.validators = new Map();
    this.renderers = new Map();
    
    // 初始化构建器
    this.initializeBuilders();
    
    // 初始化验证器
    this.initializeValidators();
    
    // 初始化渲染器
    this.initializeRenderers();
  }

  /**
   * 创建模板实例
   */
  createTemplate(type, format, options = {}) {
    try {
      // 验证类型和格式兼容性
      if (!validateTypeFormatCompatibility(type, format)) {
        throw new Error(`模板类型 ${type} 不支持格式 ${format}`);
      }

      // 获取配置
      const typeConfig = getTemplateTypeConfig(type);
      const formatConfig = getFormatConfig(format);

      if (!typeConfig || !formatConfig) {
        throw new Error(`无效的模板类型或格式: ${type}, ${format}`);
      }

      // 获取构建器
      const builder = this.getBuilder(type, format);
      
      // 构建模板
      const template = builder.build({
        type,
        format,
        typeConfig,
        formatConfig,
        ...options
      });

      return {
        success: true,
        data: template
      };

    } catch (error) {
      console.error('创建模板失败:', error);
      return {
        success: false,
        error: error.message || '创建模板失败'
      };
    }
  }

  /**
   * 验证模板数据
   */
  validateTemplate(templateData) {
    try {
      const { type, format, channels } = templateData;

      // 基础验证
      if (!type || !format) {
        throw new Error('模板类型和格式不能为空');
      }

      // 类型格式兼容性验证
      if (!validateTypeFormatCompatibility(type, format)) {
        throw new Error(`模板类型 ${type} 不支持格式 ${format}`);
      }

      // 渠道兼容性验证
      if (channels && Array.isArray(channels)) {
        for (const channel of channels) {
          if (!validateTypeChannelCompatibility(type, channel)) {
            throw new Error(`模板类型 ${type} 不支持渠道 ${channel}`);
          }
        }
      }

      // 获取验证器
      const validator = this.getValidator(type, format);
      const validationResult = validator.validate(templateData);

      if (!validationResult.valid) {
        throw new Error(validationResult.errors.join(', '));
      }

      return {
        success: true,
        data: validationResult
      };

    } catch (error) {
      console.error('验证模板失败:', error);
      return {
        success: false,
        error: error.message || '验证模板失败'
      };
    }
  }

  /**
   * 渲染模板
   */
  async renderTemplate(templateData, data, options = {}) {
    try {
      const { type, format } = templateData;

      // 获取渲染器
      const renderer = this.getRenderer(type, format);
      
      // 渲染模板
      const renderResult = await renderer.render(templateData, data, options);

      return {
        success: true,
        data: renderResult
      };

    } catch (error) {
      console.error('渲染模板失败:', error);
      return {
        success: false,
        error: error.message || '渲染模板失败'
      };
    }
  }

  /**
   * 获取模板构建器
   */
  getBuilder(type, format) {
    const key = `${type}_${format}`;
    
    if (this.builders.has(key)) {
      return this.builders.get(key);
    }

    // 返回默认构建器
    return this.builders.get('default');
  }

  /**
   * 获取模板验证器
   */
  getValidator(type, format) {
    const key = `${type}_${format}`;
    
    if (this.validators.has(key)) {
      return this.validators.get(key);
    }

    // 返回默认验证器
    return this.validators.get('default');
  }

  /**
   * 获取模板渲染器
   */
  getRenderer(type, format) {
    const key = `${type}_${format}`;
    
    if (this.renderers.has(key)) {
      return this.renderers.get(key);
    }

    // 返回默认渲染器
    return this.renderers.get('default');
  }

  /**
   * 初始化构建器
   */
  initializeBuilders() {
    // 默认构建器
    this.builders.set('default', new DefaultTemplateBuilder());

    // 预约确认文本构建器
    this.builders.set(`${TEMPLATE_TYPES.APPOINTMENT_CONFIRM}_${MESSAGE_FORMATS.TEXT}`, 
      new AppointmentConfirmTextBuilder());

    // 预约确认卡片构建器
    this.builders.set(`${TEMPLATE_TYPES.APPOINTMENT_CONFIRM}_${MESSAGE_FORMATS.CARD}`, 
      new AppointmentConfirmCardBuilder());

    // 付款提醒构建器
    this.builders.set(`${TEMPLATE_TYPES.PAYMENT_REMINDER}_${MESSAGE_FORMATS.TEXT}`, 
      new PaymentReminderTextBuilder());

    // 健康警报构建器
    this.builders.set(`${TEMPLATE_TYPES.HEALTH_ALERT}_${MESSAGE_FORMATS.TEXT}`, 
      new HealthAlertTextBuilder());

    // 富文本构建器
    this.builders.set(`default_${MESSAGE_FORMATS.RICH_TEXT}`, 
      new RichTextTemplateBuilder());
  }

  /**
   * 初始化验证器
   */
  initializeValidators() {
    // 默认验证器
    this.validators.set('default', new DefaultTemplateValidator());

    // 文本消息验证器
    this.validators.set(`default_${MESSAGE_FORMATS.TEXT}`, 
      new TextMessageValidator());

    // 卡片消息验证器
    this.validators.set(`default_${MESSAGE_FORMATS.CARD}`, 
      new CardMessageValidator());

    // 图文消息验证器
    this.validators.set(`default_${MESSAGE_FORMATS.IMAGE_TEXT}`, 
      new ImageTextMessageValidator());

    // 付款提醒验证器
    this.validators.set(`${TEMPLATE_TYPES.PAYMENT_REMINDER}_default`, 
      new PaymentReminderValidator());
  }

  /**
   * 初始化渲染器
   */
  initializeRenderers() {
    // 默认渲染器
    this.renderers.set('default', new DefaultTemplateRenderer());

    // 文本渲染器
    this.renderers.set(`default_${MESSAGE_FORMATS.TEXT}`, 
      new TextMessageRenderer());

    // 卡片渲染器
    this.renderers.set(`default_${MESSAGE_FORMATS.CARD}`, 
      new CardMessageRenderer());

    // 微信模板消息渲染器
    this.renderers.set(`default_${NOTIFICATION_CHANNELS.WECHAT_TEMPLATE}`, 
      new WechatTemplateRenderer());

    // 短信渲染器
    this.renderers.set(`default_${NOTIFICATION_CHANNELS.SMS}`, 
      new SmsRenderer());
  }

  /**
   * 注册自定义构建器
   */
  registerBuilder(type, format, builder) {
    const key = `${type}_${format}`;
    this.builders.set(key, builder);
  }

  /**
   * 注册自定义验证器
   */
  registerValidator(type, format, validator) {
    const key = `${type}_${format}`;
    this.validators.set(key, validator);
  }

  /**
   * 注册自定义渲染器
   */
  registerRenderer(type, format, renderer) {
    const key = `${type}_${format}`;
    this.renderers.set(key, renderer);
  }
}

// 默认模板构建器
class DefaultTemplateBuilder {
  build(options) {
    const { type, format, typeConfig, formatConfig } = options;
    
    return {
      id: null,
      name: '',
      description: '',
      type,
      format,
      channels: typeConfig.supportedChannels,
      title: '',
      content: '',
      variables: [...typeConfig.requiredVariables, ...typeConfig.optionalVariables],
      priority: typeConfig.priority,
      enabled: true,
      metadata: {
        typeConfig,
        formatConfig,
        createdAt: new Date().toISOString()
      }
    };
  }
}

// 预约确认文本构建器
class AppointmentConfirmTextBuilder extends DefaultTemplateBuilder {
  build(options) {
    const template = super.build(options);
    const defaultTemplate = getDefaultTemplate(TEMPLATE_TYPES.APPOINTMENT_CONFIRM);
    
    return {
      ...template,
      name: '预约确认通知',
      description: '患者预约成功后的确认通知',
      title: defaultTemplate.title,
      content: defaultTemplate.content,
      channels: [NOTIFICATION_CHANNELS.SMS, NOTIFICATION_CHANNELS.IN_APP]
    };
  }
}

// 预约确认卡片构建器
class AppointmentConfirmCardBuilder extends DefaultTemplateBuilder {
  build(options) {
    const template = super.build(options);
    
    return {
      ...template,
      name: '预约确认卡片',
      description: '卡片式预约确认通知',
      title: '预约确认',
      content: '您的预约已确认',
      structure: {
        header: {
          title: '预约确认',
          subtitle: '服务预约成功'
        },
        body: {
          content: '尊敬的{patientName}，您预约的{serviceName}已确认。',
          details: [
            { label: '服务时间', value: '{serviceTime}' },
            { label: '服务地址', value: '{address}' },
            { label: '联系电话', value: '{contactPhone}' }
          ]
        },
        actions: [
          { text: '查看详情', action: 'view_detail' },
          { text: '修改预约', action: 'modify_appointment' }
        ]
      }
    };
  }
}

// 付款提醒文本构建器
class PaymentReminderTextBuilder extends DefaultTemplateBuilder {
  build(options) {
    const template = super.build(options);
    const defaultTemplate = getDefaultTemplate(TEMPLATE_TYPES.PAYMENT_REMINDER);
    
    return {
      ...template,
      name: '付款提醒通知',
      description: '付款到期提醒通知',
      title: defaultTemplate.title,
      content: defaultTemplate.content,
      priority: 'high',
      channels: [NOTIFICATION_CHANNELS.WECHAT_TEMPLATE, NOTIFICATION_CHANNELS.SMS]
    };
  }
}

// 健康警报文本构建器
class HealthAlertTextBuilder extends DefaultTemplateBuilder {
  build(options) {
    const template = super.build(options);
    const defaultTemplate = getDefaultTemplate(TEMPLATE_TYPES.HEALTH_ALERT);
    
    return {
      ...template,
      name: '健康警报通知',
      description: '健康异常警报通知',
      title: defaultTemplate.title,
      content: defaultTemplate.content,
      priority: 'urgent',
      channels: [
        NOTIFICATION_CHANNELS.WECHAT_TEMPLATE,
        NOTIFICATION_CHANNELS.SMS,
        NOTIFICATION_CHANNELS.PUSH
      ]
    };
  }
}

// 富文本模板构建器
class RichTextTemplateBuilder extends DefaultTemplateBuilder {
  build(options) {
    const template = super.build(options);
    
    return {
      ...template,
      format: MESSAGE_FORMATS.RICH_TEXT,
      features: {
        allowedTags: ['b', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'a'],
        maxLength: 1000,
        supportImages: false,
        supportLinks: true
      }
    };
  }
}

// 默认验证器
class DefaultTemplateValidator {
  validate(templateData) {
    const errors = [];

    // 基础验证
    if (!templateData.name?.trim()) {
      errors.push('模板名称不能为空');
    }

    if (!templateData.content?.trim()) {
      errors.push('模板内容不能为空');
    }

    if (!templateData.channels || templateData.channels.length === 0) {
      errors.push('至少选择一个通知渠道');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 文本消息验证器
class TextMessageValidator extends DefaultTemplateValidator {
  validate(templateData) {
    const result = super.validate(templateData);
    
    // 文本长度验证
    if (templateData.content && templateData.content.length > 500) {
      result.errors.push('文本消息长度不能超过500字符');
    }

    // 不允许富文本标签
    if (templateData.content && /<[^>]+>/.test(templateData.content)) {
      result.errors.push('文本消息不支持HTML标签');
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}

// 卡片消息验证器
class CardMessageValidator extends DefaultTemplateValidator {
  validate(templateData) {
    const result = super.validate(templateData);
    
    // 标题验证
    if (templateData.title && templateData.title.length > 50) {
      result.errors.push('卡片标题不能超过50字符');
    }

    // 内容验证
    if (templateData.content && templateData.content.length > 300) {
      result.errors.push('卡片内容不能超过300字符');
    }

    // 按钮数量验证
    if (templateData.structure?.actions && templateData.structure.actions.length > 3) {
      result.errors.push('卡片按钮不能超过3个');
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}

// 图文消息验证器
class ImageTextMessageValidator extends DefaultTemplateValidator {
  validate(templateData) {
    const result = super.validate(templateData);
    
    // 图片验证
    if (!templateData.structure?.image) {
      result.errors.push('图文消息必须包含图片');
    }

    // 描述验证
    if (templateData.structure?.description && 
        templateData.structure.description.length > 200) {
      result.errors.push('图文消息描述不能超过200字符');
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}

// 付款提醒验证器
class PaymentReminderValidator extends DefaultTemplateValidator {
  validate(templateData) {
    const result = super.validate(templateData);
    
    // 检查必需变量
    const requiredVars = ['patientName', 'amount', 'dueDate'];
    const content = templateData.content || '';
    
    for (const varName of requiredVars) {
      if (!content.includes(`{${varName}}`)) {
        result.errors.push(`付款提醒必须包含变量 {${varName}}`);
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}

// 默认渲染器
class DefaultTemplateRenderer {
  async render(templateData, data, options = {}) {
    // 简单的变量替换
    let content = templateData.content || '';
    let title = templateData.title || '';

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      content = content.replace(regex, data[key] || '');
      title = title.replace(regex, data[key] || '');
    });

    return {
      ...templateData,
      title,
      content,
      renderedAt: new Date().toISOString()
    };
  }
}

// 文本消息渲染器
class TextMessageRenderer extends DefaultTemplateRenderer {
  async render(templateData, data, options = {}) {
    const result = await super.render(templateData, data, options);
    
    // 文本格式化
    result.content = this.formatText(result.content);
    
    return result;
  }

  formatText(text) {
    return text
      .replace(/\n+/g, '\n')  // 合并多个换行
      .trim();                // 去除首尾空格
  }
}

// 卡片消息渲染器
class CardMessageRenderer extends DefaultTemplateRenderer {
  async render(templateData, data, options = {}) {
    const result = await super.render(templateData, data, options);
    
    // 渲染卡片结构
    if (result.structure) {
      result.structure = this.renderCardStructure(result.structure, data);
    }
    
    return result;
  }

  renderCardStructure(structure, data) {
    const rendered = { ...structure };
    
    // 渲染详情列表
    if (rendered.body?.details) {
      rendered.body.details = rendered.body.details.map(detail => ({
        ...detail,
        value: this.replaceVariables(detail.value, data)
      }));
    }
    
    return rendered;
  }

  replaceVariables(text, data) {
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      text = text.replace(regex, data[key] || '');
    });
    return text;
  }
}

// 微信模板消息渲染器
class WechatTemplateRenderer extends DefaultTemplateRenderer {
  async render(templateData, data, options = {}) {
    const result = await super.render(templateData, data, options);
    
    // 微信模板消息格式
    result.wechatTemplate = {
      template_id: templateData.wechatTemplateId,
      data: this.formatWechatData(data),
      url: templateData.link || '',
      topcolor: '#FF0000'
    };
    
    return result;
  }

  formatWechatData(data) {
    const formatted = {};
    
    Object.keys(data).forEach(key => {
      formatted[key] = {
        value: data[key],
        color: '#173177'
      };
    });
    
    return formatted;
  }
}

// 短信渲染器
class SmsRenderer extends DefaultTemplateRenderer {
  async render(templateData, data, options = {}) {
    const result = await super.render(templateData, data, options);
    
    // 短信格式处理
    result.content = this.formatSmsContent(result.content);
    
    // 添加签名
    if (!result.content.includes('【')) {
      result.content = `【家庭健康】${result.content}`;
    }
    
    return result;
  }

  formatSmsContent(content) {
    return content
      .replace(/\n/g, '')     // 移除换行
      .substring(0, 70);      // 限制长度
  }
}

// 创建单例实例
const templateTypeFactory = new TemplateTypeFactory();

module.exports = templateTypeFactory;