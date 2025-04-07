/**
 * axios封装
 * 功能：
 * 1. 统一配置请求头、超时时间等
 * 2. 请求拦截器：添加token等认证信息
 * 3. 响应拦截器：统一处理响应数据和错误
 * 4. 封装常用请求方法：get、post、put、delete
 * 5. 特殊请求方法：文件上传、图片上传
 */

import axios from 'axios';

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // 从环境变量获取API基础URL，默认为'/api'
  timeout: 5000, // 请求超时时间：5秒
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果存在token，则添加到请求头中
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data;
    
    // 如果响应成功，直接返回数据
    return res;
  },
  (error) => {
    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('请求参数错误', data);
          break;
        case 401:
          console.error('未授权，请重新登录', data);
          // 可以在这里处理登出逻辑
          localStorage.removeItem('token');
          // 重定向到登录页
          // window.location.href = '/login';
          break;
        case 403:
          console.error('拒绝访问', data);
          break;
        case 404:
          console.error('请求的资源不存在', data);
          break;
        case 500:
          console.error('服务器错误', data);
          break;
        default:
          console.error(`未知错误: ${status}`, data);
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误，请检查您的网络连接');
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * 封装GET请求
 * @param {string} url - 请求URL
 * @param {Object} params - 请求参数
 * @param {Object} config - 额外配置
 * @returns {Promise}
 */
export function get(url, params = {}, config = {}) {
  return service.get(url, {
    params,
    ...config,
  });
}

/**
 * 封装POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求体数据
 * @param {Object} config - 额外配置
 * @returns {Promise}
 */
export function post(url, data = {}, config = {}) {
  return service.post(url, data, config);
}

/**
 * 封装PUT请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求体数据
 * @param {Object} config - 额外配置
 * @returns {Promise}
 */
export function put(url, data = {}, config = {}) {
  return service.put(url, data, config);
}

/**
 * 封装DELETE请求
 * @param {string} url - 请求URL
 * @param {Object} config - 额外配置
 * @returns {Promise}
 */
export function del(url, config = {}) {
  return service.delete(url, config);
}

/**
 * 文件上传
 * @param {string} url - 上传URL
 * @param {FormData} formData - 包含文件的FormData对象
 * @param {Function} onUploadProgress - 上传进度回调函数
 * @returns {Promise}
 */
export function uploadFile(url, formData, onUploadProgress = null) {
  return service.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onUploadProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onUploadProgress(percentCompleted);
    } : undefined,
  });
}

/**
 * 图片上传
 * @param {string} url - 上传URL
 * @param {File} imageFile - 图片文件
 * @param {Function} onUploadProgress - 上传进度回调函数
 * @returns {Promise}
 */
export function uploadImage(url, imageFile, onUploadProgress = null) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  return uploadFile(url, formData, onUploadProgress);
}

// 导出axios实例
export default service;