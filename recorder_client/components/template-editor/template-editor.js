// components/template-editor/template-editor.js
import {
  MESSAGE_FORMATS,
  TEMPLATE_TYPES,
  getTemplateTypeConfig,
  getFormatConfig,
  validateTypeFormatCompatibility
} from '../../constants/template-types.js';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 编辑模式：create | edit
    mode: {
      type: String,
      value: 'create'
    },
    // 模板ID（编辑模式下使用）
    templateId: {
      type: String,
      value: ''
    },
    // 初始数据
    initialData: {
      type: Object,
      value: null
    },
    // 是否显示
    show: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 模板数据
    templateData: {
      name: '',
      description: '',
      type: '',
      typeIndex: 0,
      typeText: '',
      format: MESSAGE_FORMATS.TEXT,
      formatIndex: 0,
      formatText: '纯文本',
      channels: [],
      title: '',
      content: '',
      link: '',
      imageUrl: '',
      priority: 'normal',
      priorityIndex: 1,
      priorityText: '普通',
      timing: 'immediate',
      timingIndex: 0,
      timingText: '立即发送',
      delayValue: 0,
      delayUnit: 'minutes',
      delayUnitIndex: 0,
      delayUnitText: '分钟',
      enabled: true,
      // 卡片格式相关
      cardActions: [],
      // 富文本格式相关
      styles: {},
      // 自定义格式相关
      customData: {}
    },

    // 选项配置
    typeOptions: [
      { value: 'appointment', label: '预约通知' },
      { value: 'service', label: '服务通知' },
      { value: 'payment', label: '付款通知' },
      { value: 'health', label: '健康提醒' },
      { value: 'system', label: '系统通知' },
      { value: 'marketing', label: '营销推广' }
    ],

    formatOptions: [
      { value: MESSAGE_FORMATS.TEXT, label: '纯文本消息', icon: 'text', description: '简单的文本消息' },
      { value: MESSAGE_FORMATS.CARD, label: '卡片消息', icon: 'card', description: '包含标题、内容和按钮的卡片格式' },
      { value: MESSAGE_FORMATS.IMAGE_TEXT, label: '图文消息', icon: 'image', description: '包含图片和文本的消息' },
      { value: MESSAGE_FORMATS.RICH_TEXT, label: '富文本消息', icon: 'rich-text', description: '支持格式化的文本消息' },
      { value: MESSAGE_FORMATS.CUSTOM, label: '自定义消息', icon: 'custom', description: '自定义格式的消息' }
    ],

    channelOptions: [
      { value: 'wechat', label: '微信消息', icon: 'wechat' },
      { value: 'sms', label: '短信', icon: 'message' },
      { value: 'app', label: '应用内', icon: 'bell' },
      { value: 'push', label: '推送', icon: 'notification' }
    ],

    priorityOptions: [
      { value: 'low', label: '低' },
      { value: 'normal', label: '普通' },
      { value: 'high', label: '高' },
      { value: 'urgent', label: '紧急' }
    ],

    timingOptions: [
      { value: 'immediate', label: '立即发送' },
      { value: 'delay', label: '延迟发送' },
      { value: 'scheduled', label: '定时发送' }
    ],

    delayUnits: [
      { value: 'minutes', label: '分钟' },
      { value: 'hours', label: '小时' },
      { value: 'days', label: '天' }
    ],

    // 通用变量
    commonVariables: [
      { key: 'patientName', label: '患者姓名' },
      { key: 'serviceName', label: '服务名称' },
      { key: 'serviceTime', label: '服务时间' },
      { key: 'address', label: '服务地址' },
      { key: 'recorderName', label: '记录员姓名' },
      { key: 'phone', label: '联系电话' }
    ],

    // 变量分类
    variableCategories: [
      {
        name: '患者信息',
        variables: [
          { key: 'patientName', label: '患者姓名' },
          { key: 'patientAge', label: '患者年龄' },
          { key: 'patientGender', label: '患者性别' },
          { key: 'patientPhone', label: '患者电话' },
          { key: 'familyContact', label: '家属联系人' }
        ]
      },
      {
        name: '服务信息',
        variables: [
          { key: 'serviceName', label: '服务名称' },
          { key: 'serviceTime', label: '服务时间' },
          { key: 'serviceDuration', label: '服务时长' },
          { key: 'servicePrice', label: '服务价格' },
          { key: 'serviceStatus', label: '服务状态' }
        ]
      },
      {
        name: '记录员信息',
        variables: [
          { key: 'recorderName', label: '记录员姓名' },
          { key: 'recorderPhone', label: '记录员电话' },
          { key: 'hospitalName', label: '所属医院' }
        ]
      },
      {
        name: '系统信息',
        variables: [
          { key: 'currentTime', label: '当前时间' },
          { key: 'currentDate', label: '当前日期' },
          { key: 'systemName', label: '系统名称' }
        ]
      }
    ],

    // UI状态
    isEdit: false,
    canSave: false,
    canPreview: false,
    showPreview: false,
    showVariableHelp: false,
    showTitleEditor: true,
    showLinkEditor: true,
    showImageEditor: false,
    showCardActionsEditor: false,
    showRichTextEditor: false,
    showCustomDataEditor: false,
    showDelaySettings: false,
    
    // 当前格式相关的显示控制
    currentFormatConfig: null,
    supportedChannels: [],
    
    // 预览数据
    previewData: {},
    
    // 变量提示
    variableHint: '{patientName}, {serviceName}, {serviceTime}...'
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initializeComponent();
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'templateData.**': function(templateData) {
      this.validateForm();
    },
    'mode, templateId': function(mode, templateId) {
      this.setData({
        isEdit: mode === 'edit'
      });
      
      if (mode === 'edit' && templateId) {
        this.loadTemplate(templateId);
      }
    },
    'initialData': function(initialData) {
      if (initialData) {
        this.setData({
          templateData: { ...this.data.templateData, ...initialData }
        });
      }
    },
    'templateData.timing': function(timing) {
      this.setData({
        showDelaySettings: timing === 'delay' || timing === 'scheduled'
      });
    },
    'templateData.type': function(type) {
      this.updateUIForTemplateType(type);
    },
    'templateData.format': function(format) {
      this.updateUIForTemplateFormat(format);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化组件
     */
    initializeComponent() {
      console.log('Template Editor initialized');
      this.validateForm();
    },

    /**
     * 加载模板数据
     */
    async loadTemplate(templateId) {
      try {
        // TODO: 调用API加载模板数据
        const templateData = await this.getTemplateById(templateId);
        
        // 更新表单数据
        this.setData({
          templateData: {
            ...this.data.templateData,
            ...templateData,
            typeIndex: this.findOptionIndex(this.data.typeOptions, templateData.type),
            typeText: this.findOptionLabel(this.data.typeOptions, templateData.type),
            priorityIndex: this.findOptionIndex(this.data.priorityOptions, templateData.priority),
            priorityText: this.findOptionLabel(this.data.priorityOptions, templateData.priority),
            timingIndex: this.findOptionIndex(this.data.timingOptions, templateData.timing),
            timingText: this.findOptionLabel(this.data.timingOptions, templateData.timing)
          }
        });
      } catch (error) {
        console.error('加载模板失败:', error);
        wx.showToast({
          title: '加载模板失败',
          icon: 'error'
        });
      }
    },

    /**
     * 获取模板数据（API调用）
     */
    async getTemplateById(templateId) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: templateId,
            name: '预约提醒模板',
            description: '用于预约前一天提醒患者',
            type: 'appointment',
            channels: ['wechat', 'sms'],
            title: '预约提醒',
            content: '尊敬的{patientName}，您预约的{serviceName}将于{serviceTime}开始，请提前准备。',
            priority: 'normal',
            timing: 'delay',
            delayValue: 24,
            delayUnit: 'hours',
            enabled: true
          });
        }, 500);
      });
    },

    /**
     * 输入事件处理
     */
    onInputChange(e) {
      const { field } = e.currentTarget.dataset;
      const { value } = e.detail;
      
      this.setData({
        [`templateData.${field}`]: value
      });
    },

    /**
     * 类型选择器变化
     */
    onTypeChange(e) {
      const index = parseInt(e.detail.value);
      const option = this.data.typeOptions[index];
      
      this.setData({
        'templateData.typeIndex': index,
        'templateData.type': option.value,
        'templateData.typeText': option.label
      });
    },

    /**
     * 渠道切换
     */
    onChannelToggle(e) {
      const { value } = e.currentTarget.dataset;
      const channels = [...this.data.templateData.channels];
      const index = channels.indexOf(value);
      
      if (index > -1) {
        channels.splice(index, 1);
      } else {
        channels.push(value);
      }
      
      this.setData({
        'templateData.channels': channels
      });
    },

    /**
     * 优先级选择器变化
     */
    onPriorityChange(e) {
      const index = parseInt(e.detail.value);
      const option = this.data.priorityOptions[index];
      
      this.setData({
        'templateData.priorityIndex': index,
        'templateData.priority': option.value,
        'templateData.priorityText': option.label
      });
    },

    /**
     * 发送时机选择器变化
     */
    onTimingChange(e) {
      const index = parseInt(e.detail.value);
      const option = this.data.timingOptions[index];
      
      this.setData({
        'templateData.timingIndex': index,
        'templateData.timing': option.value,
        'templateData.timingText': option.label
      });
    },

    /**
     * 格式选择器变化
     */
    onFormatChange(e) {
      const index = parseInt(e.detail.value);
      const option = this.data.formatOptions[index];
      
      this.setData({
        'templateData.formatIndex': index,
        'templateData.format': option.value,
        'templateData.formatText': option.label
      });
    },

    /**
     * 添加卡片操作
     */
    onAddCardAction() {
      const actions = [...this.data.templateData.cardActions];
      actions.push({
        id: 'action_' + Date.now(),
        text: '',
        type: 'button',
        url: ''
      });
      
      this.setData({
        'templateData.cardActions': actions
      });
    },

    /**
     * 删除卡片操作
     */
    onRemoveCardAction(e) {
      const { index } = e.currentTarget.dataset;
      const actions = [...this.data.templateData.cardActions];
      actions.splice(index, 1);
      
      this.setData({
        'templateData.cardActions': actions
      });
    },

    /**
     * 卡片操作输入变化
     */
    onCardActionChange(e) {
      const { index, field } = e.currentTarget.dataset;
      const { value } = e.detail;
      const actions = [...this.data.templateData.cardActions];
      
      if (actions[index]) {
        actions[index][field] = value;
        this.setData({
          'templateData.cardActions': actions
        });
      }
    },

    /**
     * 图片选择
     */
    onChooseImage() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.setData({
            'templateData.imageUrl': tempFilePath
          });
        },
        fail: (error) => {
          console.error('选择图片失败:', error);
          wx.showToast({
            title: '选择图片失败',
            icon: 'error'
          });
        }
      });
    },

    /**
     * 删除图片
     */
    onRemoveImage() {
      this.setData({
        'templateData.imageUrl': ''
      });
    },

    /**
     * 富文本样式变化
     */
    onRichTextStyleChange(e) {
      const { field } = e.currentTarget.dataset;
      const { value } = e.detail;
      const styles = { ...this.data.templateData.styles };
      
      styles[field] = value;
      
      this.setData({
        'templateData.styles': styles
      });
    },

    /**
     * 自定义数据变化
     */
    onCustomDataChange(e) {
      const { field } = e.currentTarget.dataset;
      const { value } = e.detail;
      const customData = { ...this.data.templateData.customData };
      
      customData[field] = value;
      
      this.setData({
        'templateData.customData': customData
      });
    },

    /**
     * 开关变化
     */
    onSwitchChange(e) {
      const { field } = e.currentTarget.dataset;
      const { value } = e.detail;
      
      this.setData({
        [`templateData.${field}`]: value
      });
    },

    /**
     * 插入变量
     */
    onInsertVariable(e) {
      const { variable } = e.currentTarget.dataset;
      const content = this.data.templateData.content;
      const newContent = content + `{${variable}}`;
      
      this.setData({
        'templateData.content': newContent
      });
      
      // 触觉反馈
      wx.vibrateShort();
    },

    /**
     * 预览模板
     */
    onPreview() {
      if (!this.data.canPreview) {
        return;
      }
      
      const previewData = this.generatePreviewData();
      
      this.setData({
        previewData,
        showPreview: true
      });
    },

    /**
     * 生成预览数据
     */
    generatePreviewData() {
      const { templateData } = this.data;
      
      // 模拟变量替换
      const mockData = {
        patientName: '张三',
        serviceName: '居家护理',
        serviceTime: '2025-09-01 14:00',
        address: '北京市朝阳区xx小区xx号',
        recorderName: '李护士',
        phone: '138****5678',
        amount: '158.00',
        dueDate: '2025-09-03'
      };
      
      let content = templateData.content;
      let title = templateData.title;
      let imageUrl = templateData.imageUrl;
      let linkUrl = templateData.link;
      
      // 替换变量
      Object.keys(mockData).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, mockData[key]);
        title = title.replace(regex, mockData[key]);
        if (imageUrl) imageUrl = imageUrl.replace(regex, mockData[key]);
        if (linkUrl) linkUrl = linkUrl.replace(regex, mockData[key]);
      });
      
      // 根据格式生成不同的预览数据
      const baseData = {
        title,
        content,
        type: templateData.typeText,
        format: templateData.formatText,
        channels: this.getChannelLabels(templateData.channels).join('、'),
        priority: templateData.priorityText
      };
      
      switch (templateData.format) {
        case MESSAGE_FORMATS.TEXT:
          return {
            ...baseData,
            renderType: 'text'
          };
          
        case MESSAGE_FORMATS.CARD:
          return {
            ...baseData,
            renderType: 'card',
            imageUrl,
            linkUrl,
            actions: templateData.cardActions || []
          };
          
        case MESSAGE_FORMATS.IMAGE_TEXT:
          return {
            ...baseData,
            renderType: 'image_text',
            imageUrl,
            linkUrl,
            layout: templateData.layout || 'vertical'
          };
          
        case MESSAGE_FORMATS.RICH_TEXT:
          return {
            ...baseData,
            renderType: 'rich_text',
            rawContent: content,
            processedContent: this.processRichTextContent(content),
            styles: templateData.styles || {}
          };
          
        case MESSAGE_FORMATS.CUSTOM:
          return {
            ...baseData,
            renderType: 'custom',
            imageUrl,
            linkUrl,
            customData: templateData.customData || {}
          };
          
        default:
          return baseData;
      }
    },
    
    /**
     * 处理富文本内容
     */
    processRichTextContent(content) {
      // 简单的 Markdown 处理
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
    },

    /**
     * 获取渠道标签
     */
    getChannelLabels(channels) {
      return channels.map(channel => {
        const option = this.data.channelOptions.find(opt => opt.value === channel);
        return option ? option.label : channel;
      });
    },

    /**
     * 预览确认
     */
    onPreviewConfirm() {
      this.setData({
        showPreview: false
      });
    },

    /**
     * 预览取消
     */
    onPreviewCancel() {
      this.setData({
        showPreview: false
      });
    },

    /**
     * 保存模板
     */
    async onSave() {
      if (!this.data.canSave) {
        return;
      }
      
      try {
        wx.showLoading({ title: '保存中...' });
        
        const templateData = this.buildSaveData();
        
        let result;
        if (this.data.isEdit) {
          result = await this.updateTemplate(this.properties.templateId, templateData);
        } else {
          result = await this.createTemplate(templateData);
        }
        
        wx.hideLoading();
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 触发保存成功事件
        this.triggerEvent('save', {
          template: result,
          isEdit: this.data.isEdit
        });
        
      } catch (error) {
        wx.hideLoading();
        console.error('保存模板失败:', error);
        
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'error'
        });
      }
    },

    /**
     * 构建保存数据
     */
    buildSaveData() {
      const { templateData } = this.data;
      
      const baseData = {
        name: templateData.name.trim(),
        description: templateData.description.trim(),
        type: templateData.type,
        format: templateData.format,
        channels: templateData.channels,
        title: templateData.title.trim(),
        content: templateData.content.trim(),
        link: templateData.link.trim(),
        priority: templateData.priority,
        timing: templateData.timing,
        delayValue: templateData.delayValue,
        delayUnit: templateData.delayUnit,
        enabled: templateData.enabled,
        variables: this.extractVariables(templateData.content)
      };
      
      // 根据格式添加特定字段
      switch (templateData.format) {
        case MESSAGE_FORMATS.CARD:
          baseData.imageUrl = templateData.imageUrl;
          baseData.cardActions = templateData.cardActions || [];
          break;
          
        case MESSAGE_FORMATS.IMAGE_TEXT:
          baseData.imageUrl = templateData.imageUrl;
          baseData.layout = templateData.layout || 'vertical';
          break;
          
        case MESSAGE_FORMATS.RICH_TEXT:
          baseData.styles = templateData.styles || {};
          break;
          
        case MESSAGE_FORMATS.CUSTOM:
          baseData.imageUrl = templateData.imageUrl;
          baseData.customData = templateData.customData || {};
          break;
      }
      
      return baseData;
    },

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
    },

    /**
     * 创建模板（API调用）
     */
    async createTemplate(templateData) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'tpl_' + Date.now(),
            ...templateData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }, 1000);
      });
    },

    /**
     * 更新模板（API调用）
     */
    async updateTemplate(templateId, templateData) {
      // 模拟API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: templateId,
            ...templateData,
            updatedAt: new Date().toISOString()
          });
        }, 1000);
      });
    },

    /**
     * 表单验证
     */
    validateForm() {
      const { templateData } = this.data;
      
      // 必填字段验证
      const required = [
        templateData.name?.trim(),
        templateData.type,
        templateData.content?.trim(),
        templateData.channels?.length > 0
      ];
      
      const isValid = required.every(field => !!field);
      
      // 内容长度验证
      const contentValid = templateData.content?.trim().length >= 10;
      
      // 渠道验证
      const channelValid = templateData.channels?.length > 0;
      
      const canSave = isValid && contentValid && channelValid;
      const canPreview = templateData.content?.trim().length > 0;
      
      this.setData({
        canSave,
        canPreview
      });
    },

    /**
     * 根据模板格式更新UI
     */
    updateUIForTemplateFormat(format) {
      const formatConfig = getFormatConfig(format);
      let showTitleEditor = true;
      let showLinkEditor = false;
      let showImageEditor = false;
      let showCardActionsEditor = false;
      let showRichTextEditor = false;
      let showCustomDataEditor = false;
      
      switch (format) {
        case MESSAGE_FORMATS.TEXT:
          showTitleEditor = true;
          showLinkEditor = false;
          showImageEditor = false;
          break;
          
        case MESSAGE_FORMATS.CARD:
          showTitleEditor = true;
          showLinkEditor = true;
          showImageEditor = true;
          showCardActionsEditor = true;
          break;
          
        case MESSAGE_FORMATS.IMAGE_TEXT:
          showTitleEditor = true;
          showLinkEditor = true;
          showImageEditor = true;
          break;
          
        case MESSAGE_FORMATS.RICH_TEXT:
          showTitleEditor = true;
          showLinkEditor = true;
          showRichTextEditor = true;
          break;
          
        case MESSAGE_FORMATS.CUSTOM:
          showTitleEditor = true;
          showLinkEditor = true;
          showImageEditor = true;
          showCustomDataEditor = true;
          break;
          
        default:
          break;
      }
      
      this.setData({
        showTitleEditor,
        showLinkEditor,
        showImageEditor,
        showCardActionsEditor,
        showRichTextEditor,
        showCustomDataEditor,
        currentFormatConfig: formatConfig
      });
    },

    /**
     * 获取支持的渠道
     */
    getSupportedChannelsForType(type) {
      const typeConfig = getTemplateTypeConfig(type);
      if (typeConfig && typeConfig.supportedChannels) {
        return typeConfig.supportedChannels;
      }
      return [];
    },

    /**
     * 检查类型和格式兼容性
     */
    checkTypeFormatCompatibility(type, format) {
      return validateTypeFormatCompatibility(type, format);
    },

    /**
     * 显示变量帮助
     */
    showVariableHelp() {
      this.setData({
        showVariableHelp: true
      });
    },

    /**
     * 关闭变量帮助
     */
    onVariableHelpCancel() {
      this.setData({
        showVariableHelp: false
      });
    },

    /**
     * 查找选项索引
     */
    findOptionIndex(options, value) {
      return options.findIndex(option => option.value === value) || 0;
    },

    /**
     * 查找选项标签
     */
    findOptionLabel(options, value) {
      const option = options.find(opt => opt.value === value);
      return option ? option.label : '';
    },

    /**
     * 重置表单
     */
    resetForm() {
      this.setData({
        templateData: {
          name: '',
          description: '',
          type: '',
          typeIndex: 0,
          typeText: '',
          channels: [],
          title: '',
          content: '',
          link: '',
          priority: 'normal',
          priorityIndex: 1,
          priorityText: '普通',
          timing: 'immediate',
          timingIndex: 0,
          timingText: '立即发送',
          delayValue: 0,
          delayUnit: 'minutes',
          delayUnitIndex: 0,
          delayUnitText: '分钟',
          enabled: true
        }
      });
    }
  }
});