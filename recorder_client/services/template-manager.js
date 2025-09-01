/**
 * 通知模板管理服务
 * 提供模板的增删改查、版本管理、审核等功能
 */

import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TEMPLATES
} from '../constants/notification-config.js';

import {
  TEMPLATE_TYPES,
  MESSAGE_FORMATS,
  getTemplateTypeConfig,
  getFormatConfig,
  validateTypeFormatCompatibility
} from '../constants/template-types.js';

import TemplateTypeFactory from './template-type-factory.js';

/**
 * 通知模板管理服务
 * 提供模板的增删改查、版本管理、审核等功能
 */

class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.templateVersions = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5分钟缓存
    this.lastUpdateTime = 0;
    
    // 模板类型工厂
    this.typeFactory = new TemplateTypeFactory();
    
    // 模板类型渲染器
    this.renderers = new Map();
    
    // 初始化渲染器
    this.initializeRenderers();
  }

  /**
   * 初始化渲染器
   */
  initializeRenderers() {
    // 文本消息渲染器
    this.renderers.set(MESSAGE_FORMATS.TEXT, new TextMessageRenderer());
    
    // 卡片消息渲染器
    this.renderers.set(MESSAGE_FORMATS.CARD, new CardMessageRenderer());
    
    // 图文消息渲染器
    this.renderers.set(MESSAGE_FORMATS.IMAGE_TEXT, new ImageTextMessageRenderer());
    
    // 富文本消息渲染器
    this.renderers.set(MESSAGE_FORMATS.RICH_TEXT, new RichTextMessageRenderer());
    
    // 自定义消息渲染器
    this.renderers.set(MESSAGE_FORMATS.CUSTOM, new CustomMessageRenderer());
  }

  /**
   * 创建模板实例
   */
  async createTemplateInstance(type, format, options = {}) {
    try {
      // 验证类型和格式兼容性
      if (!validateTypeFormatCompatibility(type, format)) {
        throw new Error(`模板类型 ${type} 不支持格式 ${format}`);
      }

      // 使用工厂创建模板
      const template = this.typeFactory.createTemplate(type, format, options);
      
      return template;
    } catch (error) {
      console.error('[模板管理器] 创建模板实例失败:', error);
      throw error;
    }
  }

  /**
   * 渲染模板内容
   */
  renderTemplateContent(template, data = {}, format = MESSAGE_FORMATS.TEXT) {
    try {
      const renderer = this.renderers.get(format);
      if (!renderer) {
        throw new Error(`不支持的模板格式: ${format}`);
      }

      return renderer.render(template, data);
    } catch (error) {
      console.error('[模板管理器] 渲染模板失败:', error);
      throw error;
    }
  }

  /**
   * 根据类型获取默认模板
   */
  getDefaultTemplateByType(type, format = MESSAGE_FORMATS.TEXT) {
    try {
      const config = getTemplateTypeConfig(type);
      if (!config) {
        throw new Error(`未找到模板类型配置: ${type}`);
      }

      return {
        id: `default_${type}_${format}`,
        name: config.name,
        description: config.description,
        type: type,
        format: format,
        category: config.category,
        priority: config.priority,
        title: config.defaultTemplate.title,
        content: config.defaultTemplate.content,
        variables: [...config.requiredVariables, ...config.optionalVariables],
        supportedChannels: config.supportedChannels,
        supportedFormats: config.supportedFormats,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[模板管理器] 获取默认模板失败:', error);
      return null;
    }
  }

  /**
   * 根据类型获取模板列表
   */
  async getTemplatesByType(type, options = {}) {
    try {
      const allTemplates = await this.getTemplates({
        ...options,
        type: type
      });

      return allTemplates;
    } catch (error) {
      console.error('[模板管理器] 按类型获取模板失败:', error);
      throw error;
    }
  }

  /**
   * 验证模板数据
   */
  validateTemplateData(templateData) {
    try {
      const { type, format, title, content, variables = [] } = templateData;

      // 基本字段验证
      if (!type || !format || !title || !content) {
        throw new Error('模板的基本字段不能为空');
      }

      // 类型和格式兼容性验证
      if (!validateTypeFormatCompatibility(type, format)) {
        throw new Error(`模板类型 ${type} 不支持格式 ${format}`);
      }

      // 验证变量
      const extractedVariables = this.extractVariables(content);
      const config = getTemplateTypeConfig(type);
      
      if (config && config.requiredVariables) {
        const missingRequired = config.requiredVariables.filter(
          variable => !extractedVariables.includes(variable)
        );
        
        if (missingRequired.length > 0) {
          throw new Error(`缺少必需变量: ${missingRequired.join(', ')}`);
        }
      }

      return true;
    } catch (error) {
      console.error('[模板管理器] 模板数据验证失败:', error);
      throw error;
    }
  }

  /**
   * 提取模板中的变量
   */
  extractVariables(content) {
    const regex = /\{([^}]+)\}/g;
    const variables = new Set();
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  /**
   * 获取所有模板
   */
  async getTemplates(options = {}) {
    try {
      const {
        type,
        channel,
        status = 'active',
        page = 1,
        pageSize = 20,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options;

      // 检查缓存
      if (this.shouldUseCache()) {
        return this.getFromCache(options);
      }

      // 构建查询参数
      const params = {
        type,
        channel,
        status,
        page,
        pageSize,
        search,
        sortBy,
        sortOrder
      };

      // 模拟API调用
      const response = await this.mockApiCall('/api/templates', {
        method: 'GET',
        params
      });

      // 更新缓存
      this.updateCache(response.data);

      return {
        success: true,
        data: response.data,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize
      };

    } catch (error) {
      console.error('获取模板列表失败:', error);
      return {
        success: false,
        error: error.message || '获取模板列表失败'
      };
    }
  }

  /**
   * 获取单个模板
   */
  async getTemplate(templateId) {
    try {
      // 检查缓存
      if (this.templates.has(templateId)) {
        const cachedTemplate = this.templates.get(templateId);
        if (Date.now() - cachedTemplate.cacheTime < this.cacheDuration) {
          return {
            success: true,
            data: cachedTemplate.data
          };
        }
      }

      // 模拟API调用
      const response = await this.mockApiCall(`/api/templates/${templateId}`, {
        method: 'GET'
      });

      // 更新缓存
      this.templates.set(templateId, {
        data: response.data,
        cacheTime: Date.now()
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('获取模板失败:', error);
      return {
        success: false,
        error: error.message || '获取模板失败'
      };
    }
  }

  /**
   * 创建模板
   */
  async createTemplate(templateData) {
    try {
      // 数据验证
      const validation = this.validateTemplateData(templateData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // 处理模板数据
      const processedData = this.processTemplateData(templateData);

      // 模拟API调用
      const response = await this.mockApiCall('/api/templates', {
        method: 'POST',
        data: processedData
      });

      // 清除缓存
      this.clearCache();

      return {
        success: true,
        data: response.data
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
   * 更新模板
   */
  async updateTemplate(templateId, templateData) {
    try {
      // 数据验证
      const validation = this.validateTemplateData(templateData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // 处理模板数据
      const processedData = this.processTemplateData(templateData);

      // 模拟API调用
      const response = await this.mockApiCall(`/api/templates/${templateId}`, {
        method: 'PUT',
        data: processedData
      });

      // 更新缓存
      this.templates.set(templateId, {
        data: response.data,
        cacheTime: Date.now()
      });

      // 清除列表缓存
      this.clearListCache();

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('更新模板失败:', error);
      return {
        success: false,
        error: error.message || '更新模板失败'
      };
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId) {
    try {
      // 检查模板是否被使用
      const usageCheck = await this.checkTemplateUsage(templateId);
      if (usageCheck.inUse) {
        return {
          success: false,
          error: '模板正在使用中，无法删除'
        };
      }

      // 模拟API调用
      await this.mockApiCall(`/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      // 清除缓存
      this.templates.delete(templateId);
      this.clearListCache();

      return {
        success: true
      };

    } catch (error) {
      console.error('删除模板失败:', error);
      return {
        success: false,
        error: error.message || '删除模板失败'
      };
    }
  }

  /**
   * 复制模板
   */
  async duplicateTemplate(templateId, newName) {
    try {
      // 获取原模板
      const templateResult = await this.getTemplate(templateId);
      if (!templateResult.success) {
        return templateResult;
      }

      const originalTemplate = templateResult.data;

      // 创建新模板数据
      const newTemplateData = {
        ...originalTemplate,
        name: newName || `${originalTemplate.name} (副本)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        version: 1,
        status: 'draft'
      };

      // 创建新模板
      return await this.createTemplate(newTemplateData);

    } catch (error) {
      console.error('复制模板失败:', error);
      return {
        success: false,
        error: error.message || '复制模板失败'
      };
    }
  }

  /**
   * 预览模板
   */
  async previewTemplate(templateData, mockData = {}) {
    try {
      // 使用默认mock数据
      const defaultMockData = {
        patientName: '张三',
        serviceName: '居家护理',
        serviceTime: '2025-09-01 14:00',
        serviceDate: '2025-09-01',
        address: '北京市朝阳区xx小区xx号',
        recorderName: '李护士',
        recorderPhone: '138****5678',
        hospitalName: '北京第一医院',
        currentTime: new Date().toLocaleString(),
        currentDate: new Date().toLocaleDateString(),
        systemName: '家庭健康管理系统'
      };

      const finalMockData = { ...defaultMockData, ...mockData };

      // 替换变量
      const previewResult = this.replaceVariables(templateData, finalMockData);

      return {
        success: true,
        data: previewResult
      };

    } catch (error) {
      console.error('预览模板失败:', error);
      return {
        success: false,
        error: error.message || '预览模板失败'
      };
    }
  }

  /**
   * 获取模板版本历史
   */
  async getTemplateVersions(templateId) {
    try {
      // 检查缓存
      if (this.templateVersions.has(templateId)) {
        const cached = this.templateVersions.get(templateId);
        if (Date.now() - cached.cacheTime < this.cacheDuration) {
          return {
            success: true,
            data: cached.data
          };
        }
      }

      // 模拟API调用
      const response = await this.mockApiCall(`/api/templates/${templateId}/versions`, {
        method: 'GET'
      });

      // 更新缓存
      this.templateVersions.set(templateId, {
        data: response.data,
        cacheTime: Date.now()
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('获取模板版本失败:', error);
      return {
        success: false,
        error: error.message || '获取模板版本失败'
      };
    }
  }

  /**
   * 发布模板
   */
  async publishTemplate(templateId) {
    try {
      // 模拟API调用
      const response = await this.mockApiCall(`/api/templates/${templateId}/publish`, {
        method: 'POST'
      });

      // 更新缓存
      this.templates.set(templateId, {
        data: response.data,
        cacheTime: Date.now()
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('发布模板失败:', error);
      return {
        success: false,
        error: error.message || '发布模板失败'
      };
    }
  }

  /**
   * 数据验证
   */
  validateTemplateData(templateData) {
    const errors = [];

    // 必填字段验证
    if (!templateData.name?.trim()) {
      errors.push('模板名称不能为空');
    }

    if (!templateData.type) {
      errors.push('模板类型不能为空');
    }

    if (!templateData.content?.trim()) {
      errors.push('模板内容不能为空');
    }

    if (!templateData.channels || templateData.channels.length === 0) {
      errors.push('至少选择一个通知渠道');
    }

    // 内容长度验证
    if (templateData.content && templateData.content.trim().length < 10) {
      errors.push('模板内容不能少于10个字符');
    }

    if (templateData.content && templateData.content.trim().length > 1000) {
      errors.push('模板内容不能超过1000个字符');
    }

    // 变量语法验证
    const variableValidation = this.validateVariables(templateData.content);
    if (!variableValidation.valid) {
      errors.push(...variableValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证变量语法
   */
  validateVariables(content) {
    const errors = [];
    const regex = /\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const variable = match[1];
      
      // 检查变量名是否合法
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variable)) {
        errors.push(`变量名 "${variable}" 格式不正确`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 处理模板数据
   */
  processTemplateData(templateData) {
    return {
      ...templateData,
      name: templateData.name.trim(),
      description: templateData.description?.trim() || '',
      title: templateData.title?.trim() || '',
      content: templateData.content.trim(),
      link: templateData.link?.trim() || '',
      variables: this.extractVariables(templateData.content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      status: 'draft'
    };
  }

  /**
   * 提取变量
   */
  extractVariables(content) {
    const regex = /\{([^}]+)\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * 替换变量
   */
  replaceVariables(templateData, mockData) {
    let title = templateData.title || '';
    let content = templateData.content || '';

    Object.keys(mockData).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      title = title.replace(regex, mockData[key]);
      content = content.replace(regex, mockData[key]);
    });

    return {
      ...templateData,
      title,
      content,
      originalTitle: templateData.title,
      originalContent: templateData.content,
      mockData
    };
  }

  /**
   * 检查模板使用情况
   */
  async checkTemplateUsage(templateId) {
    try {
      // 模拟API调用
      const response = await this.mockApiCall(`/api/templates/${templateId}/usage`, {
        method: 'GET'
      });

      return {
        success: true,
        inUse: response.data.inUse,
        usageCount: response.data.usageCount,
        usageDetails: response.data.usageDetails
      };

    } catch (error) {
      console.error('检查模板使用情况失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 缓存管理
   */
  shouldUseCache() {
    return Date.now() - this.lastUpdateTime < this.cacheDuration;
  }

  updateCache(data) {
    this.cachedList = data;
    this.lastUpdateTime = Date.now();
  }

  getFromCache(options) {
    // 简单的缓存过滤逻辑
    let filteredData = this.cachedList;

    if (options.type) {
      filteredData = filteredData.filter(item => item.type === options.type);
    }

    if (options.channel) {
      filteredData = filteredData.filter(item => 
        item.channels.includes(options.channel)
      );
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredData = filteredData.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      data: filteredData,
      total: filteredData.length,
      fromCache: true
    };
  }

  clearCache() {
    this.templates.clear();
    this.templateVersions.clear();
    this.cachedList = null;
    this.lastUpdateTime = 0;
  }

  clearListCache() {
    this.cachedList = null;
    this.lastUpdateTime = 0;
  }

  /**
   * 模拟API调用
   */
  async mockApiCall(url, options = {}) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟不同的响应
        if (url.includes('/templates') && options.method === 'GET') {
          if (url.includes('/versions')) {
            resolve({
              data: this.generateMockVersions()
            });
          } else if (url.includes('/usage')) {
            resolve({
              data: {
                inUse: Math.random() > 0.7,
                usageCount: Math.floor(Math.random() * 100),
                usageDetails: []
              }
            });
          } else if (url.match(/\/templates\/[^\/]+$/)) {
            resolve({
              data: this.generateMockTemplate()
            });
          } else {
            resolve({
              data: this.generateMockTemplates(),
              total: 50,
              page: 1,
              pageSize: 20
            });
          }
        } else if (options.method === 'POST') {
          resolve({
            data: {
              id: 'tpl_' + Date.now(),
              ...options.data
            }
          });
        } else if (options.method === 'PUT') {
          resolve({
            data: {
              id: url.split('/').pop(),
              ...options.data
            }
          });
        } else {
          resolve({ success: true });
        }
      }, Math.random() * 1000 + 500);
    });
  }

  /**
   * 生成模拟模板数据
   */
  generateMockTemplates() {
    return [
      {
        id: 'tpl_001',
        name: '预约确认通知',
        description: '患者预约成功后的确认通知',
        type: 'appointment',
        channels: ['wechat', 'sms'],
        status: 'active',
        version: 2,
        createdAt: '2025-08-30T10:00:00Z',
        updatedAt: '2025-08-31T15:30:00Z'
      },
      {
        id: 'tpl_002',
        name: '服务完成通知',
        description: '服务完成后发送给患者的通知',
        type: 'service',
        channels: ['wechat'],
        status: 'active',
        version: 1,
        createdAt: '2025-08-30T14:00:00Z',
        updatedAt: '2025-08-30T14:00:00Z'
      }
    ];
  }

  /**
   * 生成模拟单个模板
   */
  generateMockTemplate() {
    return {
      id: 'tpl_001',
      name: '预约确认通知',
      description: '患者预约成功后的确认通知',
      type: 'appointment',
      channels: ['wechat', 'sms'],
      title: '预约确认',
      content: '尊敬的{patientName}，您的{serviceName}预约已确认，服务时间：{serviceTime}，服务地址：{address}。',
      priority: 'normal',
      timing: 'immediate',
      enabled: true,
      status: 'active',
      version: 2,
      variables: ['patientName', 'serviceName', 'serviceTime', 'address'],
      createdAt: '2025-08-30T10:00:00Z',
      updatedAt: '2025-08-31T15:30:00Z'
    };
  }

  /**
   * 生成模拟版本数据
   */
  generateMockVersions() {
    return [
      {
        version: 2,
        content: '尊敬的{patientName}，您的{serviceName}预约已确认，服务时间：{serviceTime}，服务地址：{address}。',
        updatedAt: '2025-08-31T15:30:00Z',
        updatedBy: '管理员',
        status: 'active'
      },
      {
        version: 1,
        content: '您好{patientName}，预约{serviceName}成功，时间{serviceTime}。',
        updatedAt: '2025-08-30T10:00:00Z',
        updatedBy: '管理员',
        status: 'archived'
      }
    ];
  }
}

// 创建单例实例
const templateManager = new TemplateManager();

/**
 * 文本消息渲染器
 */
class TextMessageRenderer {
  render(template, data) {
    try {
      let content = template.content || '';
      let title = template.title || '';
      
      // 替换变量
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, data[key] || '');
        title = title.replace(regex, data[key] || '');
      });
      
      return {
        type: 'text',
        title: title.trim(),
        content: content.trim(),
        length: content.trim().length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[文本渲染器] 渲染失败:', error);
      throw error;
    }
  }
}

/**
 * 卡片消息渲染器
 */
class CardMessageRenderer {
  render(template, data) {
    try {
      let content = template.content || '';
      let title = template.title || '';
      let description = template.description || '';
      let imageUrl = template.imageUrl || '';
      let linkUrl = template.linkUrl || '';
      
      // 替换变量
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, data[key] || '');
        title = title.replace(regex, data[key] || '');
        description = description.replace(regex, data[key] || '');
        imageUrl = imageUrl.replace(regex, data[key] || '');
        linkUrl = linkUrl.replace(regex, data[key] || '');
      });
      
      return {
        type: 'card',
        title: title.trim(),
        content: content.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        actions: template.actions || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[卡片渲染器] 渲染失败:', error);
      throw error;
    }
  }
}

/**
 * 图文消息渲染器
 */
class ImageTextMessageRenderer {
  render(template, data) {
    try {
      let content = template.content || '';
      let title = template.title || '';
      let imageUrl = template.imageUrl || '';
      let linkUrl = template.linkUrl || '';
      
      // 替换变量
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, data[key] || '');
        title = title.replace(regex, data[key] || '');
        imageUrl = imageUrl.replace(regex, data[key] || '');
        linkUrl = linkUrl.replace(regex, data[key] || '');
      });
      
      return {
        type: 'image_text',
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        layout: template.layout || 'vertical',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[图文渲染器] 渲染失败:', error);
      throw error;
    }
  }
}

/**
 * 富文本消息渲染器
 */
class RichTextMessageRenderer {
  render(template, data) {
    try {
      let content = template.content || '';
      let title = template.title || '';
      
      // 替换变量
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, data[key] || '');
        title = title.replace(regex, data[key] || '');
      });
      
      // 处理 Markdown 格式
      const processedContent = this.processMarkdown(content);
      
      return {
        type: 'rich_text',
        title: title.trim(),
        content: processedContent,
        rawContent: content.trim(),
        styles: template.styles || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[富文本渲染器] 渲染失败:', error);
      throw error;
    }
  }
  
  processMarkdown(content) {
    // 简单的 Markdown 处理
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }
}

/**
 * 自定义消息渲染器
 */
class CustomMessageRenderer {
  render(template, data) {
    try {
      // 自定义渲染逻辑
      const customRender = template.customRenderer;
      
      if (customRender && typeof customRender === 'function') {
        return customRender(template, data);
      }
      
      // 默认处理
      let content = template.content || '';
      let title = template.title || '';
      
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, data[key] || '');
        title = title.replace(regex, data[key] || '');
      });
      
      return {
        type: 'custom',
        title: title.trim(),
        content: content.trim(),
        customData: template.customData || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[自定义渲染器] 渲染失败:', error);
      throw error;
    }
  }
}

module.exports = templateManager;
