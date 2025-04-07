/**
 * axios数据转换器
 * 功能：
 * 1. 请求前数据处理
 * 2. 响应后数据处理
 * 3. 提供统一的数据转换接口
 */

/**
 * 数据处理类，可以根据项目需求自定义
 */
export class AxiosTransform {
  /**
   * 请求之前处理配置
   * @param {Object} config - axios请求配置
   * @param {Object} options - 额外参数对象
   * @returns {Object} - 处理后的配置
   */
  beforeRequestHook(config, options) {
    return config;
  }

  /**
   * 请求成功处理
   * @param {Object} response - axios响应对象
   * @returns {Object} - 处理后的响应数据
   */
  transformRequestData(response) {
    return response.data;
  }

  /**
   * 请求失败处理
   * @param {Object} error - 错误对象
   * @returns {Promise} - 返回Promise.reject
   */
  requestCatch(error) {
    return Promise.reject(error);
  }

  /**
   * 请求之前的拦截器
   * @param {Object} config - axios请求配置
   * @param {Object} options - 额外参数对象
   * @returns {Object} - 处理后的配置
   */
  requestInterceptors(config, options) {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果存在token，则添加到请求头中
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  }

  /**
   * 响应拦截器处理
   * @param {Object} response - axios响应对象
   * @returns {Object} - 处理后的响应数据
   */
  responseInterceptors(response) {
    return response;
  }

  /**
   * 响应错误处理
   * @param {Object} error - 错误对象
   * @param {Function} errorHandler - 自定义错误处理函数
   * @returns {Promise} - 返回Promise.reject
   */
  responseInterceptorsCatch(error, errorHandler) {
    if (errorHandler) {
      return errorHandler(error);
    }
    return Promise.reject(error);
  }
}