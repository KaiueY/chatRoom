/**
 * HTTP响应状态码检查
 * 功能：
 * 1. 统一处理HTTP状态码
 * 2. 提供详细的错误信息
 * 3. 支持自定义错误处理
 */

/**
 * 检查HTTP状态码并处理错误
 * @param {number} status - HTTP状态码
 * @param {string} message - 错误信息
 * @param {Function} errorMessageMode - 错误信息显示模式，可以是'message'或'modal'
 */
export function checkStatus(status, message, errorMessageMode = 'message') {
  let errMessage = '';
  
  switch (status) {
    case 400:
      errMessage = `${message || '请求参数错误'}`;
      break;
    case 401:
      errMessage = '未授权，请重新登录';
      // 可以在这里处理登出逻辑
      localStorage.removeItem('token');
      // 重定向到登录页
      // window.location.href = '/login';
      break;
    case 403:
      errMessage = '拒绝访问';
      break;
    case 404:
      errMessage = '请求的资源不存在';
      break;
    case 405:
      errMessage = '请求方法不允许';
      break;
    case 408:
      errMessage = '请求超时';
      break;
    case 500:
      errMessage = '服务器错误';
      break;
    case 501:
      errMessage = '服务未实现';
      break;
    case 502:
      errMessage = '网关错误';
      break;
    case 503:
      errMessage = '服务不可用';
      break;
    case 504:
      errMessage = '网关超时';
      break;
    case 505:
      errMessage = 'HTTP版本不受支持';
      break;
    default:
      errMessage = `未知错误: ${status}`;
  }

  if (errMessage) {
    if (errorMessageMode === 'modal') {
      // 如果项目中有弹窗组件，可以在这里调用
      console.error(errMessage);
    } else {
      console.error(errMessage);
    }
  }

  return errMessage;
}