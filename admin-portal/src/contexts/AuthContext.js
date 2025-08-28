import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);

  // 检查本地存储的token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          // 验证token有效性
          const response = await api.get('/admin/profile');
          if (response.data.success) {
            setIsAuthenticated(true);
            setAdminInfo(response.data.data);
          } else {
            localStorage.removeItem('admin_token');
          }
        } catch (error) {
          console.error('Token验证失败:', error);
          localStorage.removeItem('admin_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (password) => {
    try {
      console.log('🚀 开始登录请求...', { password });
      console.log('🔗 API基本地址:', api.defaults.baseURL);
      
      const response = await api.post('/admin/login', { password });
      
      console.log('📄 登录响应:', response.data);
      
      // 检查响应数据结构
      if (response.data && (response.data.success || response.data.code === 200)) {
        const responseData = response.data.data || response.data;
        const { token, permissions, expireTime } = responseData;
        
        if (token) {
          // 保存token和用户信息
          localStorage.setItem('admin_token', token);
          localStorage.setItem('admin_permissions', JSON.stringify(permissions || []));
          localStorage.setItem('admin_expire_time', expireTime || '');
          
          setIsAuthenticated(true);
          setAdminInfo({
            username: 'admin',
            permissions: permissions || [],
            expireTime
          });
          
          message.success('登录成功');
          return { success: true };
        } else {
          message.error('服务器响应数据异常');
          return { success: false, message: '服务器响应数据异常' };
        }
      } else {
        const errorMsg = response.data?.message || '登录失败';
        message.error(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (error) {
      console.error('🚨 登录错误:', error);
      
      let errorMessage = '登录失败';
      let isNetworkError = false;
      
      if (error.response) {
        // 服务器响应了错误状态码
        console.error('服务器错误:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url
        });
        
        if (error.response.status === 404) {
          errorMessage = '后端 API 接口不存在，请检查后端服务器是否启动';
          isNetworkError = true;
        } else if (error.response.status === 401) {
          errorMessage = '管理员口令错误';
        } else {
          errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`;
        }
      } else if (error.request) {
        // 请求已发送但没有响应
        console.error('网络错误:', {
          request: error.request,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        });
        errorMessage = '网络连接失败，请检查后端服务器是否在 3000 端口启动';
        isNetworkError = true;
      } else {
        // 请求设置时发生错误
        console.error('请求配置错误:', error.message);
        errorMessage = '请求配置错误: ' + error.message;
      }
      
      message.error(errorMessage);
      return { success: false, message: errorMessage, isNetworkError };
    }
  };

  const logout = async () => {
    try {
      await api.post('/admin/logout');
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_permissions');
      localStorage.removeItem('admin_expire_time');
      
      setIsAuthenticated(false);
      setAdminInfo(null);
      message.success('已退出登录');
    }
  };

  const hasPermission = (permission) => {
    return adminInfo?.permissions?.includes(permission) || false;
  };

  const value = {
    isAuthenticated,
    loading,
    adminInfo,
    login,
    logout,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};