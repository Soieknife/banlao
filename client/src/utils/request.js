/**
 * 统一请求工具
 * @param {string} url - 请求路径
 * @param {string} method - 请求方法
 * @param {Object} data - 请求参数
 */
import config from '../config';

export const request = (url, method = 'GET', data = {}) => {
    const token = uni.getStorageSync('token');
    
    return new Promise((resolve, reject) => {
        uni.request({
            url: config.api.baseUrl + url,
            method,
            data,
            header: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
};
