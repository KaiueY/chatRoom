import { io } from "socket.io-client";
import {getFullTime} from '@/utils/formatTime.js'

class SocketIOClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.serverUrl = "http://localhost:3000"; // 默认服务器地址
  }

  /**
   * 初始化并连接到Socket.IO服务器
   * @param {Object} options - 连接选项
   * @returns {Promise} 连接成功或失败的Promise
   */
  connect(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接且处于活动状态，直接返回成功
        if (this.socket && this.connected) {
          console.log("Socket已连接，无需重新连接");
          return resolve(this.socket);
        }

        // 如果有socket实例但未连接，先断开
        if (this.socket) {
          console.log("断开旧连接，准备重新连接");
          this.disconnect();
        }

        const serverUrl = this.serverUrl;
        console.log("连接到Socket.IO服务器:", serverUrl);
        console.log("连接选项:", options);
        
        // 创建Socket.IO连接
        this.socket = io(serverUrl, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          auth: options.auth || {},
        });

        // 连接成功事件
        this.socket.on("connect", () => {
          console.log("Socket.IO连接成功");
          this.connected = true;
          resolve(this.socket);
        });

        // 连接错误事件
        this.socket.on("connect_error", (error) => {
          // console.error("Socket.IO连接错误:", error);
          reject(error);
        });

        // 断开连接事件
        this.socket.on("disconnect", (reason) => {
          console.log("Socket.IO断开连接:", reason);
          this.connected = false;
        });

        // 重新连接事件
        this.socket.on("reconnect", (attemptNumber) => {
          console.log(`Socket.IO重新连接成功，尝试次数: ${attemptNumber}`);
          this.connected = true;
        });
      } catch (error) {
        console.error("Socket.IO初始化错误:", error);
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
        reject(new Error("Socket.IO未连接"));
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
      console.error("Socket.IO未初始化");
      return;
    }
  
    const callbacks = this.listeners.get(event) || [];
  
    if (!callbacks.includes(callback)) {
      callbacks.push(callback);
      this.socket.on(event, callback);
      this.listeners.set(event, callbacks);
    }
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
  async login  (credentials) {
    if(!this.isConnected()){
     await this.connect()
    }
    return this.emit("login", credentials);
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.password - 密码
   * @returns {Promise} 注册结果
   */
  register(userData) {
    console.log("用户注册", userData);
    
    return this.emit("register", userData);
  }

  /**
   * 用户退出登录
   * @returns {Promise} 退出结果
   */
  logout() {
    return this.emit("logout", {});
  }

  /**
   * 发送文本消息
   * @param {Object} messageData - 消息数据
   * @returns {Promise} 发送结果
   */
  sendMessage(messageData) {
    const data = {
      username: messageData.username,
      userId: messageData.userId,
      roomId: messageData.roomId,
      fileId: messageData.fileId || null,
      content: messageData.content,
      messageType: messageData.messageType,
      created_at:messageData.created_at,
    }
    return this.emit("message", data);
  }
  /**
   * 上传文件信息
   * @param {Object} fileData - 文件数据
   * @returns {Promise} 上传结果
   */
  uploadFileMessage(fileData) {
    console.log("上传文件信息", fileData);
    // 确保传递正确的文件类型和URL信息
    const data = {
      userId: fileData.userId,
      username: fileData.username,
      roomId: fileData.roomId,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileUrl: fileData.fileUrl,
      messageType: fileData.messageType,
      created_at: fileData.created_at
    };
    return this.emit("file_info", data);
  }

  /**
   * 加入聊天室
   * @param {Object} userData - 用户数据
   * @param {string} userData.userId - 用户ID
   * @param {string} userData.username - 用户名
   * @returns {Promise} 加入结果
   */
  joinChat(userData) {
    console.log("加入聊天室", userData);
    return this.emit("join", {
      ...userData,
      time: getFullTime(Date.now()),
    });
  }

  /**
   * 获取连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.connected;
  }
}
// 创建单例
let socketClient = null;
const getSocketClient =  () => {
  if(!socketClient){
  
  
    console.log('get New');
    
    socketClient =  new SocketIOClient();
    return socketClient;
  }else{
    return socketClient;
  }
}


// 导出单例
export default getSocketClient;
