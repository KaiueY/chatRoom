/**
 * axios请求重试功能
 * 功能：
 * 1. 请求失败后自动重试
 * 2. 支持设置最大重试次数
 * 3. 支持设置重试延迟时间
 * 4. 支持指数退避策略
 */

/**
 * 创建重试拦截器
 * @param {Object} axios - axios实例
 * @param {Object} options - 重试配置选项
 * @param {number} options.retries - 最大重试次数，默认3次
 * @param {number} options.retryDelay - 重试延迟时间(ms)，默认1000ms
 * @param {boolean} options.shouldResetTimeout - 是否重置超时时间，默认true
 * @param {Function} options.retryCondition - 重试条件，默认所有非2xx状态码都重试
 * @param {boolean} options.exponentialBackoff - 是否使用指数退避策略，默认true
 */
export function setupRetry(axios, options = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    shouldResetTimeout = true,
    retryCondition = (error) => {
      // 默认对网络错误和5xx错误进行重试
      return (
        !error.response ||
        (error.response.status >= 500 && error.response.status <= 599)
      );
    },
    exponentialBackoff = true,
  } = options;

  // 添加响应拦截器处理重试逻辑
  axios.interceptors.response.use(null, async (error) => {
    // 从错误对象中获取配置和请求信息
    const config = error.config;

    // 如果配置不存在，或者不满足重试条件，则直接拒绝
    if (!config || !retryCondition(error)) {
      return Promise.reject(error);
    }

    // 设置重试计数器
    config.__retryCount = config.__retryCount || 0;

    // 如果已经达到最大重试次数，则拒绝
    if (config.__retryCount >= retries) {
      return Promise.reject(error);
    }

    // 增加重试计数
    config.__retryCount += 1;

    // 创建新的Promise用于延迟
    const delayRetry = new Promise((resolve) => {
      // 计算延迟时间（指数退避策略）
      let delay = retryDelay;
      if (exponentialBackoff) {
        delay = retryDelay * Math.pow(2, config.__retryCount - 1);
      }
      
      console.log(`请求重试: 第${config.__retryCount}次，延迟${delay}ms`);
      setTimeout(resolve, delay);
    });

    // 等待延迟后重新发送请求
    await delayRetry;

    // 如果需要重置超时时间
    if (shouldResetTimeout && config.timeout) {
      config.timeout = config.timeout * (config.__retryCount + 1);
    }

    // 重新发送请求
    return axios(config);
  });
}

/**
 * 请求重试类
 */
export default class AxiosRetry {
  /**
   * 构造函数
   * @param {Object} options - 重试配置选项
   */
  constructor(options = {}) {
    this.options = {
      retries: 3,
      retryDelay: 1000,
      shouldResetTimeout: true,
      retryCondition: (error) => {
        return (
          !error.response ||
          (error.response.status >= 500 && error.response.status <= 599)
        );
      },
      exponentialBackoff: true,
      ...options,
    };
  }

  /**
   * 为axios实例设置重试机制
   * @param {Object} axios - axios实例
   */
  setup(axios) {
    setupRetry(axios, this.options);
  }

  /**
   * 创建一个带有重试机制的axios实例
   * @param {Object} axios - axios实例
   * @returns {Object} - 配置了重试机制的axios实例
   */
  static create(axios, options = {}) {
    const retry = new AxiosRetry(options);
    retry.setup(axios);
    return axios;
  }
}