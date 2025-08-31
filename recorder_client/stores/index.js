// 简单的状态管理工具
const CONSTANTS = require('../constants/constants.js');

class StoreManager {
  constructor() {
    this.stores = new Map();
    this.listeners = new Map();
  }

  /**
   * 创建一个状态存储
   */
  createStore(name, initialState = {}) {
    this.stores.set(name, { ...initialState });
    this.listeners.set(name, new Set());
    return this.getStore(name);
  }

  /**
   * 获取状态存储
   */
  getStore(name) {
    if (!this.stores.has(name)) {
      throw new Error(`Store '${name}' does not exist`);
    }

    return {
      // 获取状态
      getState: () => {
        return { ...this.stores.get(name) };
      },

      // 设置状态
      setState: (newState) => {
        const currentState = this.stores.get(name);
        const updatedState = { ...currentState, ...newState };
        this.stores.set(name, updatedState);
        this._notifyListeners(name, updatedState);
      },

      // 订阅状态变化
      subscribe: (listener) => {
        if (typeof listener !== 'function') {
          console.error('监听器必须是一个函数');
          return () => {};
        }
        
        const listeners = this.listeners.get(name);
        listeners.add(listener);
        
        // 返回取消订阅函数
        return () => {
          const currentListeners = this.listeners.get(name);
          if (currentListeners) {
            currentListeners.delete(listener);
          }
        };
      },

      // 清空状态
      clearState: () => {
        this.stores.set(name, {});
        this._notifyListeners(name, {});
      }
    };
  }

  /**
   * 通知监听器
   */
  _notifyListeners(storeName, newState) {
    const listeners = this.listeners.get(storeName);
    if (!listeners || listeners.size === 0) {
      return;
    }
    
    // 使用 setTimeout 避免同步执行导致的问题
    setTimeout(() => {
      listeners.forEach(listener => {
        try {
          // 确保监听器存在且为函数
          if (typeof listener === 'function') {
            listener(newState);
          }
        } catch (error) {
          console.error('监听器执行错误:', error);
          // 移除出错的监听器
          listeners.delete(listener);
        }
      });
    }, 0);
  }

  /**
   * 销毁存储
   */
  destroyStore(name) {
    this.stores.delete(name);
    this.listeners.delete(name);
  }
}

// 创建全局状态管理实例
const storeManager = new StoreManager();

// 创建用户状态存储
const userStore = storeManager.createStore('user', {
  userInfo: null,
  token: '',
  role: '',
  isLoggedIn: false
});

// 创建应用状态存储
const appStore = storeManager.createStore('app', {
  loading: false,
  error: null,
  networkStatus: 'online',
  currentPage: '',
  tabBarIndex: 0
});

// 创建日程状态存储
const scheduleStore = storeManager.createStore('schedule', {
  scheduleList: [],
  currentSchedule: null,
  filterStatus: 'all',
  loading: false
});

// 创建患者状态存储
const patientStore = storeManager.createStore('patient', {
  patientList: [],
  currentPatient: null,
  familyMembers: [],
  loading: false
});

// 创建服务记录状态存储
const recordStore = storeManager.createStore('record', {
  recordList: [],
  currentRecord: null,
  uploadProgress: {},
  loading: false
});

// 导出状态存储
module.exports = {
  storeManager,
  userStore,
  appStore,
  scheduleStore,
  patientStore,
  recordStore
};