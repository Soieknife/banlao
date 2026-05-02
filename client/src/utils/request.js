/**
 * 统一请求工具
 * @param {string} url - 请求路径
 * @param {string} method - 请求方法
 * @param {Object} data - 请求参数
 * @param {Object} options - 额外选项
 */
import config from '../config';
import { clearAuthStorage } from './auth';

// 请求队列管理
const requestQueue = new Set();

// 显示加载中
const showLoading = () => {
  if (requestQueue.size === 0) {
    uni.showLoading({
      title: '加载中...',
      mask: true
    });
  }
  requestQueue.add(Date.now());
};

// 隐藏加载中
const hideLoading = () => {
  requestQueue.delete(requestQueue.values().next().value);
  if (requestQueue.size === 0) {
    uni.hideLoading();
  }
};

export const request = (url, method = 'GET', data = {}, options = {}) => {
    const token = uni.getStorageSync('token');
    const {
      showLoading: shouldShowLoading = true,
      showErrorToast = true,
      authRedirect = true,
      retry = 0,
      timeout = 30000
    } = options;
    
    if (shouldShowLoading) {
      showLoading();
    }
    
    const doRequest = (attempt = 0) => {
      return new Promise((resolve, reject) => {
        uni.request({
            url: config.api.baseUrl + url,
            method,
            data,
            header: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            timeout,
            success: (res) => {
                if (shouldShowLoading) {
                  hideLoading();
                }
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else if (res.statusCode === 401 || res.statusCode === 403) {
                    // 未授权，跳转到登录页
                    clearAuthStorage();
                    if (authRedirect) {
                      uni.reLaunch({ url: '/pages/login/login' });
                    }
                    reject({ message: '登录已过期，请重新登录' });
                } else {
                    const errorMessage = res.data?.message || `请求失败 (${res.statusCode})`;
                    if (showErrorToast) {
                      uni.showToast({ title: errorMessage, icon: 'none' });
                    }
                    reject(res.data);
                }
            },
            fail: (err) => {
                if (shouldShowLoading) {
                  hideLoading();
                }
                
                // 重试机制
                if (attempt < retry) {
                  setTimeout(() => {
                    doRequest(attempt + 1)
                      .then(resolve)
                      .catch(reject);
                  }, 1000);
                  return;
                }
                
                // 网络错误处理
                const errorMessage = err.errMsg || '网络请求失败，请检查网络连接';
                if (showErrorToast) {
                  uni.showToast({ title: errorMessage, icon: 'none' });
                }
                reject(err);
            }
        });
      });
    };
    
    return doRequest();
};

// 快捷方法
export const get = (url, data = {}, options = {}) => {
  return request(url, 'GET', data, options);
};

export const post = (url, data = {}, options = {}) => {
  return request(url, 'POST', data, options);
};

export const put = (url, data = {}, options = {}) => {
  return request(url, 'PUT', data, options);
};

export const del = (url, data = {}, options = {}) => {
  return request(url, 'DELETE', data, options);
};
