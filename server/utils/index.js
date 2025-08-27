const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class Utils {
  // 生成UUID
  static generateId() {
    return uuidv4().replace(/-/g, '');
  }
  
  // 生成订单号
  static generateOrderNo() {
    const date = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HG${date}${random}`;
  }
  
  // 格式化日期
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    return moment(date).format(format);
  }
  
  // 手机号脱敏
  static maskPhone(phone) {
    if (!phone) return '';
    if (phone.length === 11) {
      // 11位手机号：138****5678
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    } else if (phone.length === 10) {
      // 10位手机号：123***7890（保持原有长度）
      return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    } else {
      // 其他长度，保留前3位和后3位（如果长度够）
      if (phone.length <= 6) {
        return phone.replace(/./g, '*');
      }
      const start = phone.substring(0, 3);
      const end = phone.substring(phone.length - 3);
      const middle = '*'.repeat(Math.max(0, phone.length - 6));
      return start + middle + end;
    }
  }
  
  // 身份证脱敏
  static maskIdCard(idCard) {
    if (!idCard) return '';
    if (idCard.length === 18) {
      // 18位身份证：123456********5678
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    } else if (idCard.length === 15) {
      // 15位身份证：123456*****2345（保持原有长度）
      return idCard.replace(/(\d{6})\d{5}(\d{4})/, '$1*****$2');
    } else {
      // 其他长度，保留前6位和后4位（如果长度够）
      if (idCard.length <= 10) {
        return idCard.replace(/./g, '*');
      }
      const start = idCard.substring(0, 6);
      const end = idCard.substring(idCard.length - 4);
      const middle = '*'.repeat(Math.max(0, idCard.length - 10));
      return start + middle + end;
    }
  }
  
  // 邮箱脱敏
  static maskEmail(email) {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username.charAt(0)}***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }
  
  // 分页计算
  static getPagination(page = 1, pageSize = 20) {
    const limit = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * limit;
    return { limit, offset };
  }
  
  // 统一响应格式
  static response(res, data = null, message = 'success', code = 200) {
    return res.json({
      code,
      success: code >= 200 && code < 400,
      message,
      data,
      timestamp: Date.now()
    });
  }
  
  // 错误响应
  static error(res, message = '服务器内部错误', code = 500, details = null) {
    return res.status(code >= 400 ? code : 500).json({
      code,
      success: false,
      message,
      details,
      timestamp: Date.now()
    });
  }
  
  // 参数验证错误
  static validationError(res, errors) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors,
      timestamp: Date.now()
    });
  }
  
  // 检查必需参数
  static validateRequired(data, fields) {
    const missing = [];
    for (const field of fields) {
      if (!data[field]) {
        missing.push(field);
      }
    }
    return missing;
  }
  
  // 安全删除对象属性
  static omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }
  
  // 只保留指定属性
  static pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }
  
  // 生成随机字符串
  static randomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // 健康数据验证
  static validateHealthData(type, value) {
    const validators = {
      bloodPressure: (val) => {
        return val.systolic >= 50 && val.systolic <= 250 &&
               val.diastolic >= 30 && val.diastolic <= 150;
      },
      bloodSugar: (val) => {
        return val.value >= 1.0 && val.value <= 30.0;
      },
      temperature: (val) => {
        return val.value >= 35.0 && val.value <= 45.0;
      },
      weight: (val) => {
        return val.value >= 20 && val.value <= 300;
      },
      heartRate: (val) => {
        return val.value >= 30 && val.value <= 200;
      }
    };
    
    const validator = validators[type];
    if (!validator) {
      return { isValid: false, message: '不支持的健康数据类型' };
    }
    
    if (!validator(value)) {
      return { isValid: false, message: '健康数据超出正常范围' };
    }
    
    return { isValid: true };
  }
}

module.exports = Utils;