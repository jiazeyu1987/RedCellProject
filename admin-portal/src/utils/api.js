import axios from 'axios';
import { message } from 'antd';

// 创建axios实例 - 使用相对路径通过代理访问后端
const api = axios.create({
  baseURL: '/api',  // 使用代理路径
  timeout: 10000,
});

// 打印API配置信息
console.log('🔗 API配置:', {
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout
});

// 请求拦截器 - 添加token和增强认证处理
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      // 统一使用Bearer Token格式
      config.headers.Authorization = `Bearer ${token}`;
      
      // 检查token是否过期（只针对新格式）
      const expireTime = localStorage.getItem('admin_expire_time');
      if (expireTime && new Date() > new Date(expireTime)) {
        console.log('⚠️ Token已过期，清理本地存储');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_permissions');
        localStorage.removeItem('admin_expire_time');
        delete config.headers.Authorization;
      }
    }
    
    // 添加请求时间戳用于调试
    config.metadata = { startTime: new Date() };
    console.log(`🚀 API请求: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和增强日志
api.interceptors.response.use(
  (response) => {
    // 计算请求时间
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    const duration = startTime ? endTime - startTime : 0;
    
    console.log(`✅ API响应: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    
    return response;
  },
  (error) => {
    const endTime = new Date();
    const startTime = error.config?.metadata?.startTime;
    const duration = startTime ? endTime - startTime : 0;
    
    console.error(`❌ API错误: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`, error);

    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token过期或无效 - 清理所有认证相关存储
          console.log('🗑️ 清理认证信息因401错误');
          ['admin_token', 'admin_permissions', 'admin_expire_time'].forEach(key => {
            localStorage.removeItem(key);
          });
          
          if (window.location.pathname !== '/login') {
            message.error('登录已过期，请重新登录');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
          break;
          
        case 403:
          message.error(data?.message || '权限不足');
          break;
          
        case 404:
          message.error('请求的资源不存在');
          break;
          
        case 422:
          message.error(data?.message || '请求参数错误');
          break;
          
        case 500:
          message.error('服务器内部错误，请稍后再试');
          break;
          
        default:
          if (data?.message) {
            message.error(data.message);
          } else {
            message.error(`请求失败 (${status})`);
          }
      }
    } else if (error.request) {
      // 网络连接错误
      message.error('网络连接失败，请检查网络设置和服务器状态');
    } else {
      // 请求配置错误
      console.error('请求配置错误:', error.message);
      message.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

// API接口定义
export const adminAPI = {
  // 认证相关
  login: (password) => api.post('/admin/login', { password }),
  logout: () => api.post('/admin/logout'),
  getProfile: () => api.get('/admin/profile'),

  // 用户池管理
  getUserPool: (params) => api.get('/admin/user-pool', { params }),
  
  // 增强用户列表 - 包含订阅、付费、地址、健康信息
  getEnhancedUsers: (params) => api.get('/admin/users/enhanced', { params }),
  
  getUserDetail: (userId) => api.get(`/admin/users/${userId}`),
  
  // 获取用户完整详情 - 包含订阅、付费、地址、健康信息
  getUserComplete: (userId) => api.get(`/admin/users/${userId}/complete`),
  
  updateUserStatus: (userId, status, reason) => 
    api.put(`/admin/users/${userId}/status`, { status, reason }),
  assignUser: (userId, providerId, notes) => 
    api.post('/admin/assign-user', { userId, providerId, notes }),
  batchAssignUsers: (userIds, algorithm, preferences) =>
    api.post('/admin/auto-assign', { userIds, algorithm, preferences }),

  // 套餐管理接口
  getSubscriptionPackages: () => api.get('/admin/subscription-packages'),
  updateUserSubscription: (userId, subscriptionData) => 
    api.put(`/admin/users/${userId}/subscription`, subscriptionData),

  // 服务者管理
  getServiceProviders: (params) => api.get('/admin/service-providers', { params }),
  getProviderDetail: (providerId) => api.get(`/admin/service-providers/${providerId}`),
  updateProviderInfo: (providerId, data) => 
    api.put(`/admin/service-providers/${providerId}`, data),
  updateProviderServiceArea: (providerId, serviceArea) =>
    api.put(`/admin/service-providers/${providerId}/service-area`, { serviceArea }),

  // 分配管理
  getAssignments: (params) => api.get('/admin/assignments', { params }),
  getAssignmentHistory: (params) => api.get('/admin/assignment-history', { params }),
  cancelAssignment: (assignmentId, reason) =>
    api.post(`/admin/assignments/${assignmentId}/cancel`, { reason }),

  // 统计数据
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getGeoData: () => api.get('/admin/dashboard/geo-data'),
  getAssignmentTrends: (timeRange) => 
    api.get('/admin/dashboard/assignment-trends', { params: { timeRange } }),

  // 数据导出
  exportUserData: (userIds, format) => 
    api.get('/admin/users/export', { 
      params: { userIds: userIds.join(','), format },
      responseType: 'blob'
    }),

  // 生成随机用户
  generateRandomUsers: (count = 10) => 
    api.post('/admin/generate-random-users', { count }),
};

export default api;