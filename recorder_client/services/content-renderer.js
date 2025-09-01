/**
 * 动态内容填充服务
 * 负责处理通知模板中的变量替换、条件渲染、数据格式化等功能
 */

class ContentRenderer {
  constructor() {
    this.formatters = new Map();
    this.conditions = new Map();
    this.functions = new Map();
    this.cache = new Map();
    
    // 初始化内置格式化器
    this.initializeFormatters();
    
    // 初始化内置函数
    this.initializeFunctions();
  }

  /**
   * 渲染模板内容
   */
  async renderTemplate(template, data, options = {}) {
    try {
      const {
        enableCache = true,
        cacheKey,
        locale = 'zh-CN',
        timezone = 'Asia/Shanghai'
      } = options;

      // 检查缓存
      const finalCacheKey = cacheKey || this.generateCacheKey(template, data);
      if (enableCache && this.cache.has(finalCacheKey)) {
        const cached = this.cache.get(finalCacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
          return {
            success: true,
            data: cached.data
          };
        }
      }

      // 准备渲染上下文
      const context = this.prepareContext(data, { locale, timezone });

      // 渲染标题
      const title = template.title ? 
        await this.renderContent(template.title, context) : '';

      // 渲染内容
      const content = await this.renderContent(template.content, context);

      // 渲染链接
      const link = template.link ? 
        await this.renderContent(template.link, context) : '';

      const result = {
        ...template,
        title,
        content,
        link,
        renderedAt: new Date().toISOString(),
        context: context.data
      };

      // 更新缓存
      if (enableCache) {
        this.cache.set(finalCacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return {
        success: true,
        data: result
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
   * 渲染单个内容
   */
  async renderContent(content, context) {
    if (!content) return '';

    let result = content;

    // 1. 处理条件渲染
    result = await this.processConditions(result, context);

    // 2. 处理函数调用
    result = await this.processFunctions(result, context);

    // 3. 处理变量替换
    result = this.processVariables(result, context);

    // 4. 处理格式化
    result = this.processFormatters(result, context);

    // 5. 清理多余空格和换行
    result = this.cleanupContent(result);

    return result;
  }

  /**
   * 处理条件渲染
   * 语法: {{#if condition}}content{{/if}}
   * 语法: {{#unless condition}}content{{/unless}}
   * 语法: {{#if condition}}content{{else}}other{{/if}}
   */
  async processConditions(content, context) {
    // 处理 if-else 条件
    const ifElseRegex = /{{#if\s+([^}]+)}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
    content = content.replace(ifElseRegex, (match, condition, ifContent, elseContent = '') => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? ifContent : elseContent;
    });

    // 处理 unless 条件
    const unlessRegex = /{{#unless\s+([^}]+)}}([\s\S]*?){{\/unless}}/g;
    content = content.replace(unlessRegex, (match, condition, unlessContent) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return !conditionResult ? unlessContent : '';
    });

    // 处理 each 循环
    const eachRegex = /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
    content = content.replace(eachRegex, (match, arrayPath, itemContent) => {
      const array = this.getNestedValue(context.data, arrayPath.trim());
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        const itemContext = {
          ...context,
          data: {
            ...context.data,
            this: item,
            index,
            first: index === 0,
            last: index === array.length - 1
          }
        };
        return this.processVariables(itemContent, itemContext);
      }).join('');
    });

    return content;
  }

  /**
   * 处理函数调用
   * 语法: {{functionName(param1, param2)}}
   */
  async processFunctions(content, context) {
    const functionRegex = /{{(\w+)\((.*?)\)}}/g;
    
    return content.replace(functionRegex, (match, functionName, params) => {
      if (!this.functions.has(functionName)) {
        console.warn(`未知函数: ${functionName}`);
        return match;
      }

      try {
        // 解析参数
        const parsedParams = this.parseParameters(params, context);
        const functionHandler = this.functions.get(functionName);
        
        // 执行函数
        const result = functionHandler(parsedParams, context);
        return result !== undefined ? String(result) : '';
      } catch (error) {
        console.error(`函数执行失败 ${functionName}:`, error);
        return match;
      }
    });
  }

  /**
   * 处理变量替换
   * 语法: {variableName} 或 {{variableName}}
   */
  processVariables(content, context) {
    // 处理双大括号变量
    const doubleBraceRegex = /{{([^#\/][^}]*)}}/g;
    content = content.replace(doubleBraceRegex, (match, variable) => {
      const value = this.getVariableValue(variable.trim(), context);
      return value !== undefined ? String(value) : '';
    });

    // 处理单大括号变量
    const singleBraceRegex = /{([^{}]+)}/g;
    content = content.replace(singleBraceRegex, (match, variable) => {
      const value = this.getVariableValue(variable.trim(), context);
      return value !== undefined ? String(value) : match;
    });

    return content;
  }

  /**
   * 处理格式化器
   * 语法: {{variable | formatter:param1:param2}}
   */
  processFormatters(content, context) {
    const formatterRegex = /{{([^|{}]+)\|([^}]+)}}/g;
    
    return content.replace(formatterRegex, (match, variable, formatters) => {
      let value = this.getVariableValue(variable.trim(), context);
      
      // 应用格式化器链
      const formatterChain = formatters.split('|').map(f => f.trim());
      
      for (const formatterStr of formatterChain) {
        const [formatterName, ...params] = formatterStr.split(':').map(p => p.trim());
        
        if (this.formatters.has(formatterName)) {
          const formatter = this.formatters.get(formatterName);
          try {
            value = formatter(value, params, context);
          } catch (error) {
            console.error(`格式化器执行失败 ${formatterName}:`, error);
            return match;
          }
        } else {
          console.warn(`未知格式化器: ${formatterName}`);
        }
      }
      
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * 获取变量值
   */
  getVariableValue(variable, context) {
    // 处理特殊变量
    if (variable === 'this') {
      return context.data.this;
    }
    
    if (variable === 'index') {
      return context.data.index;
    }

    // 处理嵌套属性
    return this.getNestedValue(context.data, variable);
  }

  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }

  /**
   * 评估条件表达式
   */
  evaluateCondition(condition, context) {
    try {
      // 简单的条件评估
      // 支持: variable, !variable, variable === value, variable !== value 等
      
      // 取反条件
      if (condition.startsWith('!')) {
        const variable = condition.slice(1).trim();
        const value = this.getVariableValue(variable, context);
        return !this.isTruthy(value);
      }
      
      // 比较操作
      const operators = ['===', '!==', '>=', '<=', '>', '<', '==', '!='];
      for (const op of operators) {
        if (condition.includes(op)) {
          const [left, right] = condition.split(op).map(s => s.trim());
          const leftValue = this.getVariableValue(left, context);
          const rightValue = this.parseValue(right, context);
          
          switch (op) {
            case '===': return leftValue === rightValue;
            case '!==': return leftValue !== rightValue;
            case '==': return leftValue == rightValue;
            case '!=': return leftValue != rightValue;
            case '>': return leftValue > rightValue;
            case '<': return leftValue < rightValue;
            case '>=': return leftValue >= rightValue;
            case '<=': return leftValue <= rightValue;
          }
        }
      }
      
      // 简单布尔值
      const value = this.getVariableValue(condition, context);
      return this.isTruthy(value);
      
    } catch (error) {
      console.error('条件评估失败:', condition, error);
      return false;
    }
  }

  /**
   * 判断值是否为真
   */
  isTruthy(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }

  /**
   * 解析参数值
   */
  parseValue(value, context) {
    value = value.trim();
    
    // 字符串字面量
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // 数字字面量
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // 布尔字面量
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // 变量引用
    return this.getVariableValue(value, context);
  }

  /**
   * 解析函数参数
   */
  parseParameters(paramsStr, context) {
    if (!paramsStr.trim()) return [];
    
    const params = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < paramsStr.length; i++) {
      const char = paramsStr[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (!inQuotes && char === ',') {
        params.push(this.parseValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(this.parseValue(current.trim(), context));
    }
    
    return params;
  }

  /**
   * 清理内容
   */
  cleanupContent(content) {
    return content
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n\s*\n/g, '\n') // 合并多个换行
      .trim();
  }

  /**
   * 准备渲染上下文
   */
  prepareContext(data, options = {}) {
    const now = new Date();
    
    return {
      data: {
        ...data,
        // 添加系统变量
        currentTime: now.toLocaleString(options.locale),
        currentDate: now.toLocaleDateString(options.locale),
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1,
        currentDay: now.getDate(),
        timestamp: now.getTime()
      },
      options
    };
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(template, data) {
    const templateStr = JSON.stringify({
      title: template.title,
      content: template.content,
      link: template.link
    });
    const dataStr = JSON.stringify(data);
    return `${this.hashCode(templateStr)}_${this.hashCode(dataStr)}`;
  }

  /**
   * 简单哈希函数
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 初始化格式化器
   */
  initializeFormatters() {
    // 日期格式化
    this.formatters.set('date', (value, params, context) => {
      if (!value) return '';
      const date = new Date(value);
      const format = params[0] || 'YYYY-MM-DD';
      return this.formatDate(date, format);
    });

    // 时间格式化
    this.formatters.set('time', (value, params, context) => {
      if (!value) return '';
      const date = new Date(value);
      const format = params[0] || 'HH:mm';
      return this.formatTime(date, format);
    });

    // 货币格式化
    this.formatters.set('currency', (value, params, context) => {
      if (value === null || value === undefined) return '';
      const currency = params[0] || 'CNY';
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency
      }).format(value);
    });

    // 数字格式化
    this.formatters.set('number', (value, params, context) => {
      if (value === null || value === undefined) return '';
      const decimals = parseInt(params[0]) || 0;
      return Number(value).toFixed(decimals);
    });

    // 大写转换
    this.formatters.set('upper', (value) => {
      return value ? String(value).toUpperCase() : '';
    });

    // 小写转换
    this.formatters.set('lower', (value) => {
      return value ? String(value).toLowerCase() : '';
    });

    // 截断
    this.formatters.set('truncate', (value, params) => {
      if (!value) return '';
      const length = parseInt(params[0]) || 50;
      const suffix = params[1] || '...';
      const str = String(value);
      return str.length > length ? str.substring(0, length) + suffix : str;
    });

    // 默认值
    this.formatters.set('default', (value, params) => {
      return value !== null && value !== undefined && value !== '' ? 
        value : (params[0] || '');
    });
  }

  /**
   * 初始化内置函数
   */
  initializeFunctions() {
    // 获取相对时间
    this.functions.set('timeAgo', ([date], context) => {
      if (!date) return '';
      const now = new Date();
      const target = new Date(date);
      const diff = now - target;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}天前`;
      if (hours > 0) return `${hours}小时前`;
      if (minutes > 0) return `${minutes}分钟前`;
      return '刚刚';
    });

    // 获取相对日期
    this.functions.set('relativeDate', ([date], context) => {
      if (!date) return '';
      const now = new Date();
      const target = new Date(date);
      
      // 重置时间到当天0点进行比较
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      
      const diff = targetDate - nowDate;
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      
      if (days === 0) return '今天';
      if (days === 1) return '明天';
      if (days === -1) return '昨天';
      if (days > 1) return `${days}天后`;
      if (days < -1) return `${Math.abs(days)}天前`;
      
      return target.toLocaleDateString();
    });

    // 计算年龄
    this.functions.set('age', ([birthDate], context) => {
      if (!birthDate) return '';
      const now = new Date();
      const birth = new Date(birthDate);
      let age = now.getFullYear() - birth.getFullYear();
      
      if (now.getMonth() < birth.getMonth() || 
          (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    });
  }

  /**
   * 格式化日期
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return format
      .replace('YYYY', year)
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('M', month)
      .replace('D', day);
  }

  /**
   * 格式化时间
   */
  formatTime(date, format) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    return format
      .replace('HH', hours.toString().padStart(2, '0'))
      .replace('mm', minutes.toString().padStart(2, '0'))
      .replace('ss', seconds.toString().padStart(2, '0'))
      .replace('H', hours)
      .replace('m', minutes)
      .replace('s', seconds);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 添加自定义格式化器
   */
  addFormatter(name, handler) {
    this.formatters.set(name, handler);
  }

  /**
   * 添加自定义函数
   */
  addFunction(name, handler) {
    this.functions.set(name, handler);
  }
}

// 创建单例实例
const contentRenderer = new ContentRenderer();

module.exports = contentRenderer;