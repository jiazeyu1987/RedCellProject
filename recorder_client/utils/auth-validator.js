// 用户认证验证工具
const CONFIG = require('../constants/config.js');

class AuthValidator {
  /**
   * 验证手机号格式
   * @param {string} phone 手机号
   * @returns {object} 验证结果
   */
  static validatePhone(phone) {
    if (!phone) {
      return {
        valid: false,
        message: '请输入手机号'
      };
    }

    // 中国大陆手机号正则表达式
    const phonePattern = /^1[3-9]\d{9}$/;
    
    if (!phonePattern.test(phone)) {
      return {
        valid: false,
        message: '请输入正确的手机号格式'
      };
    }

    return {
      valid: true,
      message: '手机号格式正确'
    };
  }

  /**
   * 验证密码格式
   * @param {string} password 密码
   * @returns {object} 验证结果
   */
  static validatePassword(password) {
    if (!password) {
      return {
        valid: false,
        message: '请输入密码'
      };
    }

    if (password.length < 6) {
      return {
        valid: false,
        message: '密码至少需要6位字符'
      };
    }

    if (password.length > 20) {
      return {
        valid: false,
        message: '密码不能超过20位字符'
      };
    }

    // 检查密码强度（至少包含字母和数字）
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
      return {
        valid: false,
        message: '密码应包含字母和数字',
        level: 'weak'
      };
    }

    // 检查是否包含特殊字符（更强的密码）
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      valid: true,
      message: '密码格式正确',
      level: hasSpecial ? 'strong' : 'medium'
    };
  }

  /**
   * 验证短信验证码
   * @param {string} code 验证码
   * @returns {object} 验证结果
   */
  static validateSmsCode(code) {
    if (!code) {
      return {
        valid: false,
        message: '请输入验证码'
      };
    }

    if (!/^\d{6}$/.test(code)) {
      return {
        valid: false,
        message: '验证码为6位数字'
      };
    }

    return {
      valid: true,
      message: '验证码格式正确'
    };
  }

  /**
   * 验证用户角色
   * @param {string} role 用户角色
   * @returns {boolean} 是否有效
   */
  static validateUserRole(role) {
    return Object.values(CONFIG.USER_ROLES).includes(role);
  }

  /**
   * 验证token格式
   * @param {string} token JWT token
   * @returns {object} 验证结果
   */
  static validateToken(token) {
    if (!token) {
      return {
        valid: false,
        message: 'Token不能为空'
      };
    }

    // JWT token基本格式验证（三段式）
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return {
        valid: false,
        message: 'Token格式不正确'
      };
    }

    try {
      // 验证JWT header和payload可以被解码
      const header = JSON.parse(atob(tokenParts[0]));
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // 检查是否过期
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return {
          valid: false,
          message: 'Token已过期',
          expired: true
        };
      }

      return {
        valid: true,
        message: 'Token格式正确',
        payload
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Token解析失败'
      };
    }
  }

  /**
   * 验证登录表单
   * @param {object} formData 表单数据
   * @param {string} loginType 登录方式
   * @returns {object} 验证结果
   */
  static validateLoginForm(formData, loginType) {
    const errors = {};
    let isValid = true;

    // 验证手机号
    const phoneResult = this.validatePhone(formData.phone);
    if (!phoneResult.valid) {
      errors.phone = phoneResult.message;
      isValid = false;
    }

    if (loginType === 'password') {
      // 密码登录验证
      const passwordResult = this.validatePassword(formData.password);
      if (!passwordResult.valid) {
        errors.password = passwordResult.message;
        isValid = false;
      }
    } else if (loginType === 'sms') {
      // 验证码登录验证
      const codeResult = this.validateSmsCode(formData.smsCode);
      if (!codeResult.valid) {
        errors.smsCode = codeResult.message;
        isValid = false;
      }
    }

    return {
      valid: isValid,
      errors
    };
  }
}

module.exports = AuthValidator;