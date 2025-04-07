import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

// 封装消息提示组件
const Message = {
  // 成功提示
  success(message, options = {}) {
    return ElMessage({
      type: 'success',
      message,
      showClose: true,
      duration: 3000,
      ...options
    })
  },

  // 警告提示
  warning(message, options = {}) {
    return ElMessage({
      type: 'warning',
      message,
      showClose: true,
      duration: 3000,
      ...options
    })
  },

  // 错误提示
  error(message, options = {}) {
    return ElMessage({
      type: 'error',
      message,
      showClose: true,
      duration: 3000,
      ...options
    })
  },

  // 信息提示
  info(message, options = {}) {
    return ElMessage({
      type: 'info',
      message,
      showClose: true,
      duration: 3000,
      ...options
    })
  },

  // 自定义配置的消息
  custom(options) {
    return ElMessage(options)
  }
}

export default Message