// 网络请求封装工具
const CONFIG = require('../constants/config.js');
const CONSTANTS = require('../constants/constants.js');

class HttpService {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * 通用请求方法
   * @param {Object} options 请求配置
   * @returns {Promise}
   */
  request(options) {
    // 开发环境下使用模拟数据
    if (CONFIG.USE_MOCK_DATA) {
      return this._getMockData(options.url, options.method, options.data);
    }
    
    return new Promise((resolve, reject) => {
      // 获取token
      const token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
      
      // 构建请求配置
      const requestConfig = {
        url: this._buildURL(options.url),
        method: options.method || CONSTANTS.HTTP_METHODS.GET,
        data: options.data || {},
        header: {
          ...this.defaultHeaders,
          ...options.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: options.timeout || this.timeout,
        success: (res) => {
          this._handleResponse(res, resolve, reject);
        },
        fail: (err) => {
          this._handleError(err, reject);
        }
      };

      // 发起请求
      wx.request(requestConfig);
    });
  }

  /**
   * GET请求
   */
  get(url, params = {}, options = {}) {
    const queryString = this._buildQueryString(params);
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.request({
      url: fullUrl,
      method: CONSTANTS.HTTP_METHODS.GET,
      ...options
    });
  }

  /**
   * POST请求
   */
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: CONSTANTS.HTTP_METHODS.POST,
      data,
      ...options
    });
  }

  /**
   * PUT请求
   */
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: CONSTANTS.HTTP_METHODS.PUT,
      data,
      ...options
    });
  }

  /**
   * DELETE请求
   */
  delete(url, options = {}) {
    return this.request({
      url,
      method: CONSTANTS.HTTP_METHODS.DELETE,
      ...options
    });
  }

  /**
   * 文件上传
   */
  upload(url, filePath, formData = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
      
      wx.uploadFile({
        url: this._buildURL(url),
        filePath,
        name: 'file',
        formData,
        header: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            this._handleResponse({ data, statusCode: res.statusCode }, resolve, reject);
          } catch (e) {
            reject({ message: '响应解析失败', error: e });
          }
        },
        fail: (err) => {
          this._handleError(err, reject);
        }
      });
    });
  }

  /**
   * 构建完整URL
   */
  _buildURL(url) {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
  }

  /**
   * 构建查询字符串
   */
  _buildQueryString(params) {
    const queryParts = [];
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
      }
    });
    return queryParts.join('&');
  }

  /**
   * 处理响应
   */
  _handleResponse(response, resolve, reject) {
    const { statusCode, data } = response;
    
    if (statusCode >= 200 && statusCode < 300) {
      // 根据业务逻辑处理响应
      if (data.code === 0 || data.success) {
        resolve(data);
      } else {
        // 业务错误
        this._handleBusinessError(data, reject);
      }
    } else if (statusCode === 401) {
      // 未授权，清除token并跳转登录
      this._handleUnauthorized(reject);
    } else {
      // HTTP错误
      reject({
        code: CONSTANTS.ERROR_CODES.NETWORK_ERROR,
        message: `HTTP错误: ${statusCode}`,
        statusCode
      });
    }
  }

  /**
   * 处理业务错误
   */
  _handleBusinessError(data, reject) {
    reject({
      code: data.code || CONSTANTS.ERROR_CODES.VALIDATION_ERROR,
      message: data.message || '业务处理失败',
      data: data.data
    });
  }

  /**
   * 处理未授权
   */
  _handleUnauthorized(reject) {
    // 清除本地存储的用户信息
    wx.removeStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
    wx.removeStorageSync(CONFIG.STORAGE_KEYS.USER_INFO);
    
    // 提示用户重新登录
    wx.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none'
    });
    
    // 跳转到登录页
    setTimeout(() => {
      wx.reLaunch({
        url: CONSTANTS.PAGES.LOGIN
      });
    }, 1500);
    
    reject({
      code: CONSTANTS.ERROR_CODES.AUTH_FAILED,
      message: '登录已过期'
    });
  }

  /**
   * 处理网络错误
   */
  _handleError(error, reject) {
    console.error('网络请求失败:', error);
    
    let errorMessage = '网络请求失败';
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMessage = '请求超时，请检查网络连接';
      } else if (error.errMsg.includes('fail')) {
        errorMessage = '网络连接失败，请检查网络设置';
      }
    }
    
    reject({
      code: CONSTANTS.ERROR_CODES.NETWORK_ERROR,
      message: errorMessage,
      error
    });
  }

  /**
   * 设置请求拦截器
   */
  setRequestInterceptor(interceptor) {
    this.requestInterceptor = interceptor;
  }

  /**
   * 设置响应拦截器
   */
  setResponseInterceptor(interceptor) {
    this.responseInterceptor = interceptor;
  }

  /**
   * 获取模拟数据（开发环境使用）
   */
  _getMockData(url, method = 'GET', data = {}) {
    return new Promise((resolve) => {
      // 模拟网络延迟
      setTimeout(() => {
        const mockResponses = {
          // 微信登录
          '/auth/login/wechat': {
            code: 0,
            success: true,
            message: '登录成功',
            data: {
              token: 'mock_token_' + Date.now(),
              userInfo: {
                id: 'mock_user_001',
                nickname: '测试用户',
                avatar: '',
                phone: '138****8888',
                role: CONFIG.USER_ROLES.RECORDER
              },
              needBindPhone: false
            }
          },
          // 获取用户信息
          '/user/info': {
            code: 0,
            success: true,
            data: {
              id: 'mock_user_001',
              nickname: '测试用户',
              avatar: '',
              phone: '138****8888',
              role: CONFIG.USER_ROLES.RECORDER,
              status: 'active'
            }
          },
          // 日程列表
          '/schedule/list': {
            code: 0,
            success: true,
            message: '获取日程列表成功',
            data: {
              list: [
                {
                  id: 'mock_001',
                  patientName: '张三',
                  serviceName: '居家护理',
                  startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                  endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
                  address: '北京市朝阳区三里屯小区12号楼301室',
                  status: 'pending',
                  priority: 'normal',
                  serviceType: 'regular',
                  contactPhone: '138****5678',
                  notes: '患者需要血压测量和用药指导',
                  patientAge: 65,
                  patientGender: '男',
                  createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  estimatedDuration: 60
                },
                {
                  id: 'mock_002',
                  patientName: '李四',
                  serviceName: '康复理疗',
                  startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                  endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
                  address: '北京市海淀区中关村大街55号',
                  status: 'confirmed',
                  priority: 'high',
                  serviceType: 'follow_up',
                  contactPhone: '139****1234',
                  notes: '需要带物理治疗设备',
                  patientAge: 45,
                  patientGender: '女',
                  createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                  estimatedDuration: 90
                },
                {
                  id: 'mock_003',
                  patientName: '王五',
                  serviceName: '健康检查',
                  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                  address: '北京市东城区建国门外大街100号',
                  status: 'completed',
                  priority: 'normal',
                  serviceType: 'initial',
                  contactPhone: '150****9876',
                  notes: '定期健康检查，包括血常规和尿常规',
                  patientAge: 72,
                  patientGender: '男',
                  createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                  estimatedDuration: 45,
                  completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                  id: 'mock_004',
                  patientName: '赵六',
                  serviceName: '精神健康咨询',
                  startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                  endTime: new Date(Date.now()).toISOString(),
                  address: '北京市西城区复兴门内大街200号',
                  status: 'overdue',
                  priority: 'urgent',
                  serviceType: 'consultation',
                  contactPhone: '187****3456',
                  notes: '患者有焦虑症状，需要心理指导',
                  patientAge: 38,
                  patientGender: '女',
                  createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
                  estimatedDuration: 60
                },
                {
                  id: 'mock_005',
                  patientName: '孙七',
                  serviceName: '伤口换药',
                  startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                  endTime: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
                  address: '北京市丰台区丰科路18号院',
                  status: 'pending',
                  priority: 'high',
                  serviceType: 'emergency',
                  contactPhone: '156****7890',
                  notes: '车祸外伤后需定期换药',
                  patientAge: 28,
                  patientGender: '男',
                  createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                  estimatedDuration: 30
                }
              ],
              total: 5,
              page: 1,
              limit: 20
            }
          },
          // 日程统计信息
          '/schedule/statistics': {
            code: 0,
            success: true,
            message: '获取统计信息成功',
            data: {
              total: 25,
              today: 8,
              pending: 5,
              overdue: 2,
              completed: 18,
              inProgress: 0,
              cancelled: 0,
              urgent: 3
            }
          },
          // 详细统计信息
          '/schedule/statistics/detailed': {
            code: 0,
            success: true,
            message: '获取详细统计成功',
            data: {
              thisWeek: 25,
              thisMonth: 120,
              avgDuration: 45,
              completionRate: 72
            }
          },
          // 统计趋势数据
          '/schedule/statistics/trend': {
            code: 0,
            success: true,
            message: '获取趋势数据成功',
            data: {
              trend: {
                direction: 'up',
                percentage: 12
              }
            }
          },
          // 默认响应
          'default': {
            code: 0,
            success: true,
            message: '模拟数据返回成功',
            data: {}
          }
        };

        // 获取对应的mock数据
        const mockData = mockResponses[url] || mockResponses['default'];
        
        console.log(`[Mock API] ${method} ${url}`, {
          request: data,
          response: mockData
        });
        
        resolve(mockData);
      }, Math.random() * 300 + 200); // 200-500ms的随机延迟，提升用户体验
    });
  }
}

// 创建实例
const httpService = new HttpService();

// 导出实例和类
module.exports = {
  http: httpService,
  HttpService
};