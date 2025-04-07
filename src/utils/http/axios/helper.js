/**
 * axios辅助函数
 * 功能：
 * 1. 处理URL参数
 * 2. 格式化请求数据
 * 3. 其他辅助功能
 */

/**
 * 将对象转换为URL参数
 * @param {Object} params - 参数对象
 * @returns {string} - URL参数字符串
 */
export function objectToParams(params) {
  if (!params) return '';
  
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * 将URL参数转换为对象
 * @param {string} url - 包含参数的URL
 * @returns {Object} - 参数对象
 */
export function paramsToObject(url) {
  const search = url.split('?')[1];
  if (!search) return {};
  
  return JSON.parse(
    `{"${decodeURIComponent(search)
      .replace(/"/g, '\\"')
      .replace(/&/g, '","')
      .replace(/=/g, '":"')}"}`
  );
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} - 合并后的对象
 */
export function deepMerge(target, source) {
  if (!source) return target;
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = target[key];
      const sourceValue = source[key];
      
      if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = deepMerge(targetValue, sourceValue);
      } else {
        target[key] = sourceValue;
      }
    }
  }
  
  return target;
}

/**
 * 判断是否为对象
 * @param {any} val - 要检查的值
 * @returns {boolean} - 是否为对象
 */
export function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 格式化请求参数
 * @param {Object} params - 请求参数
 * @returns {Object} - 格式化后的参数
 */
export function formatRequestParams(params) {
  if (!params) return {};
  
  const result = {};
  
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      
      // 过滤掉undefined和null值
      if (value !== undefined && value !== null) {
        // 如果是数组，转换为逗号分隔的字符串
        if (Array.isArray(value)) {
          result[key] = value.join(',');
        } else if (value instanceof Date) {
          // 如果是日期，转换为ISO字符串
          result[key] = value.toISOString();
        } else {
          result[key] = value;
        }
      }
    }
  }
  
  return result;
}

/**
 * 生成唯一ID
 * @returns {string} - 唯一ID
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}