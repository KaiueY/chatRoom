// src/utils/http/AxiosCanceler.ts

const pendingMap = new Map();

function getPendingKey(config) {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join('&');
}

export class AxiosCanceler {
  /**
   * 添加请求到 pendingMap，自动取消重复请求
   */
  add(config) {
    const key = getPendingKey(config);

    // 跳过忽略项
    if (config.ignoreCancel) return;

    this.remove(config); // 如果已经有相同请求，取消它

    const controller = new AbortController();
    config.signal = controller.signal;
    pendingMap.set(key, controller);
  }

  /**
   * 移除请求（用于响应后清理）
   */
  remove(config) {
    const key = getPendingKey(config);
    if (pendingMap.has(key)) {
      const controller = pendingMap.get(key);
      controller.abort();
      pendingMap.delete(key);
    }
  }

  /**
   * 取消所有请求
   */
  cancelAll() {
    for (const controller of pendingMap.values()) {
      controller.abort();
    }
    pendingMap.clear();
  }

  /**
   * 根据 URL 部分取消请求
   */
  cancelByUrl(urlPart) {
    for (const [key, controller] of pendingMap.entries()) {
      if (key.includes(urlPart)) {
        controller.abort();
        pendingMap.delete(key);
      }
    }
  }
}

// 单例暴露
const globalCanceler = new AxiosCanceler();
export default globalCanceler; 
