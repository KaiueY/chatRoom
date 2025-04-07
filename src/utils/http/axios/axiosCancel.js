/**
 * axios请求取消功能
 * 功能：
 * 1. 创建取消令牌
 * 2. 取消所有请求
 * 3. 取消指定URL的请求
 * 4. 取消重复请求
 */

import axios from 'axios';

// 存储pending中的请求
let pendingMap = new Map();

/**
 * 生成每个请求唯一的键
 * @param {Object} config - axios请求配置
 * @returns {string} - 唯一键值
 */
export function getPendingKey(config) {
  const { url, method, params, data } = config;
  return [
    url,
    method,
    JSON.stringify(params),
    JSON.stringify(data)
  ].join('&');
}

/**
 * 储存每个请求的唯一值, 也就是cancel token
 * @param {Object} config - axios请求配置
 */
export function addPending(config) {
  // 如果配置了ignoreCancel = true，则不执行取消重复请求逻辑
  if (config.ignoreCancel) {
    return;
  }
  
  const pendingKey = getPendingKey(config);
  
  // 如果pendingMap中存在当前请求，取消上一次的请求
  if (pendingMap.has(pendingKey)) {
    const cancelToken = pendingMap.get(pendingKey);
    cancelToken(pendingKey);
    pendingMap.delete(pendingKey);
  }
  
  // 创建新的取消令牌
  const source = axios.CancelToken.source();
  config.cancelToken = source.token;
  
  // 将取消函数存储到pendingMap中
  pendingMap.set(pendingKey, source.cancel);
}

/**
 * 删除请求
 * @param {Object} config - axios请求配置
 */
export function removePending(config) {
  const pendingKey = getPendingKey(config);
  if (pendingMap.has(pendingKey)) {
    pendingMap.delete(pendingKey);
  }
}

/**
 * 清空所有pending中的请求
 */
export function clearPending() {
  for (const [key, cancel] of pendingMap) {
    cancel(key);
  }
  pendingMap.clear();
}

/**
 * 取消指定URL的请求
 * @param {string} url - 请求URL
 */
export function cancelRequest(url) {
  for (const [key, cancel] of pendingMap) {
    if (key.startsWith(url)) {
      cancel(key);
      pendingMap.delete(key);
    }
  }
}

/**
 * 请求取消类
 */
export default class AxiosCancel {
  /**
   * 添加请求到pendingMap
   * @param {Object} config - axios请求配置
   */
  addPending(config) {
    addPending(config);
  }
  
  /**
   * 移除请求从pendingMap
   * @param {Object} config - axios请求配置
   */
  removePending(config) {
    removePending(config);
  }
  
  /**
   * 清空所有pending中的请求
   */
  clearPending() {
    clearPending();
  }
  
  /**
   * 取消指定URL的请求
   * @param {string} url - 请求URL
   */
  cancelRequest(url) {
    cancelRequest(url);
  }
}