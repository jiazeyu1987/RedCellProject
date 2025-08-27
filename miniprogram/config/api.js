// API配置文件
// 统一管理服务器地址和接口配置

// 开发环境配置
const development = {
  baseURL: 'http://localhost:3000',
  apiPrefix: '/v1',
  timeout: 30000
};

// 生产环境配置  
const production = {
  baseURL: 'https://your-production-domain.com',
  apiPrefix: '/v1', 
  timeout: 30000
};

// 测试环境配置
const testing = {
  baseURL: 'http://localhost:3000',
  apiPrefix: '/v1',
  timeout: 30000
};

// 根据环境变量选择配置
const getCurrentConfig = () => {
  // 可以根据不同条件选择环境
  // 这里默认使用开发环境
  const env = 'development'; // 可以改为 'production' 或 'testing'
  
  switch (env) {
    case 'production':
      return production;
    case 'testing':
      return testing;
    default:
      return development;
  }
};

const config = getCurrentConfig();

// API接口地址
const API = {
  // 基础配置
  BASE_URL: config.baseURL,
  API_PREFIX: config.apiPrefix,
  TIMEOUT: config.timeout,
  
  // 完整的API基础路径
  API_BASE: `${config.baseURL}${config.apiPrefix}`,
  
  // 用户相关接口
  USER: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register', 
    PROFILE: '/users/profile',
    ADDRESSES: '/users/addresses',
    FAMILY_MEMBERS: '/users/family-members'
  },
  
  // 服务相关接口
  SERVICE: {
    TYPES: '/services/types',
    BOOK: '/bookings',
    HISTORY: '/bookings'
  },
  
  // 健康相关接口
  HEALTH: {
    RECORDS: '/health/records',
    METRICS: '/health/metrics',
    SUGGESTIONS: '/health/suggestions',
    REPORTS: '/health/reports'
  },
  
  // 社区相关接口
  COMMUNITY: {
    POSTS: '/community/posts',
    KNOWLEDGE: '/community/knowledge',
    QA: '/community/qa'
  },
  
  // 管理员相关接口
  ADMIN: {
    LOGIN: '/admin/login',
    USERS: '/admin/users'
  },
  
  // 其他接口
  HOSPITAL: '/hospitals',
  UPLOAD: '/upload',
  HEALTH_CHECK: '/health'
};

// HTTP请求封装
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 设置默认配置
    const defaultOptions = {
      method: 'GET',
      url: '',
      data: {},
      header: {
        'Content-Type': 'application/json'
      },
      timeout: config.timeout
    };
    
    // 合并配置
    const requestOptions = Object.assign({}, defaultOptions, options);
    
    // 处理URL
    if (requestOptions.url.startsWith('/')) {
      requestOptions.url = config.baseURL + config.apiPrefix + requestOptions.url;
    } else if (!requestOptions.url.startsWith('http')) {
      requestOptions.url = config.baseURL + config.apiPrefix + '/' + requestOptions.url;
    }
    
    // 添加认证头
    const token = wx.getStorageSync('token');
    if (token) {
      requestOptions.header.Authorization = `Bearer ${token}`;
    }
    
    console.log('发起API请求:', {
      url: requestOptions.url,
      method: requestOptions.method,
      data: requestOptions.data,
      hasToken: !!token
    });
    
    // 发起请求
    wx.request({
      ...requestOptions,
      success: (res) => {
        console.log('API响应:', {
          statusCode: res.statusCode,
          data: res.data
        });
        
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject({
            code: res.statusCode,
            message: res.data.message || '请求失败',
            data: res.data
          });
        }
      },
      fail: (error) => {
        console.error('API请求失败:', error);
        reject({
          code: -1,
          message: '网络请求失败',
          error: error
        });
      }
    });
  });
};

// 常用请求方法封装
const http = {
  get: (url, data = {}) => {
    return request({
      method: 'GET',
      url,
      data
    });
  },
  
  post: (url, data = {}) => {
    return request({
      method: 'POST', 
      url,
      data
    });
  },
  
  put: (url, data = {}) => {
    return request({
      method: 'PUT',
      url,
      data
    });
  },
  
  delete: (url, data = {}) => {
    return request({
      method: 'DELETE',
      url,
      data
    });
  }
};

// 获取测试token的辅助函数
const getTestToken = async () => {
  try {
    console.log('开始获取测试token...');
    
    // 使用简单的登录接口获取token
    const loginResult = await request({
      method: 'POST',
      url: '/auth/login',
      data: {
        openId: 'test_user_123',
        nickname: '测试用户',
        avatar: 'https://via.placeholder.com/100'
      }
    });
    
    if (loginResult.success && loginResult.data.token) {
      const token = loginResult.data.token;
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', loginResult.data.user);
      console.log('测试token获取成功:', token.substring(0, 20) + '...');
      return token;
    } else {
      throw new Error('登录响应格式错误');
    }
  } catch (error) {
    console.error('获取测试token失败:', error);
    throw error;
  }
};

module.exports = {
  API,
  http,
  request,
  getTestToken
};