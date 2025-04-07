import { io } from 'socket.io-client';
import { ElMessage } from 'element-plus';

class SocketIOClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.serverUrl = 'http://localhost:3000'; // 默认服务器地址
  }

  /**
   * 初始化并连接到Socket.IO服务器
   * @param {Object} options - 连接选项
   * @param {string} options.serverUrl - 服务器URL（可选）
   * @param {Object} options.auth - 认证信息（可选）
   * @returns {Promise} 连接成功或失败的Promise
   */
  connect(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接，先断开
        if (this.socket) {
          this.disconnect();
        }

        const serverUrl = options.serverUrl || this.serverUrl;
        
        // 创建Socket.IO连接
        this.socket = io(serverUrl, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          auth: options.auth || {}
        });

        // 连接成功事件
        this.socket.on('connect', () => {
          console.log('Socket.IO连接成功');
          this.connected = true;
          resolve(this.socket);
        });

        // 连接错误事件
        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO连接错误:', error);
          reject(error);
        });

        // 断开连接事件
        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO断开连接:', reason);
          this.connected = false;
        });

        // 重新连接事件
        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`Socket.IO重新连接成功，尝试次数: ${attemptNumber}`);
          this.connected = true;
        });
      } catch (error) {
        console.error('Socket.IO初始化错误:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开Socket.IO连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * 发送事件到服务器
   * @param {string} event - 事件名称
   * @param {any} data - 要发送的数据
   * @returns {Promise} 发送成功或失败的Promise
   */
  emit(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket.IO未连接'));
        return;
      }

      try {
        this.socket.emit(event, data, (response) => {
          if (response && response.error) {
            reject(response.error);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 监听服务器事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.socket) {
      console.error('Socket.IO未初始化');
      return;
    }

    // 存储监听器以便后续可以移除
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    this.socket.on(event, callback);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 要移除的回调函数（可选，如果不提供则移除该事件的所有监听器）
   */
  off(event, callback) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      // 移除特定回调
      this.socket.off(event, callback);
      
      // 从存储的监听器中移除
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      // 移除该事件的所有监听器
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭证
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @returns {Promise} 登录结果
   */
  login(credentials) {
    return this.emit('login', credentials);
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.password - 密码
   * @returns {Promise} 注册结果
   */
  register(userData) {
    return this.emit('register', userData);
  }

  /**
   * 用户退出登录
   * @returns {Promise} 退出结果
   */
  logout() {
    return this.emit('logout', {});
  }

  /**
   * 发送文本消息
   * @param {Object} messageData - 消息数据
   * @param {string} messageData.content - 消息内容
   * @param {string} messageData.userId - 用户ID
   * @param {string} messageData.username - 用户名
   * @returns {Promise} 发送结果
   */
  sendMessage(messageData) {
    return this.emit('message', {
      type: 'message',
      ...messageData,
      time: new Date().toISOString()
    });
  }

  /**
   * 发送文件
   * @param {Object} fileData - 文件数据
   * @param {File} fileData.file - 文件对象
   * @param {string} fileData.userId - 用户ID
   * @param {string} fileData.username - 用户名
   * @returns {Promise} 发送结果
   */
  sendFile(fileData) {
    return new Promise((resolve, reject) => {
      const { file, userId, username } = fileData;
      
      // 将文件转换为Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = () => {
        const base64File = reader.result;
        
        this.emit('file', {
          type: 'file',
          userId,
          username,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64File,
          time: new Date().toISOString()
        })
          .then(resolve)
          .catch(reject);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
    });
  }

  /**
   * 发送图片
   * @param {Object} imageData - 图片数据
   * @param {File} imageData.file - 图片文件
   * @param {string} imageData.userId - 用户ID
   * @param {string} imageData.username - 用户名
   * @returns {Promise} 发送结果
   */
  sendImage(imageData) {
    return this.sendFile({
      ...imageData,
      type: 'image'
    });
  }

  /**
   * 加入聊天室
   * @param {Object} userData - 用户数据
   * @param {string} userData.userId - 用户ID
   * @param {string} userData.username - 用户名
   * @returns {Promise} 加入结果
   */
  joinChat(userData) {
    return this.emit('join', {
      type: 'join',
      ...userData,
      time: new Date().toISOString()
    });
  }

  /**
   * 获取连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 获取Socket.IO实例
   * @returns {Object} Socket.IO实例
   */
  getSocket() {
    return this.socket;
  }
}

// 创建单例实例
const socketClient = new SocketIOClient();

// 导出单例
export default socketClient;