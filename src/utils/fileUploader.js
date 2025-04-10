/**
 * 文件上传工具类
 * 实现文件分片上传、进度跟踪和断点续传功能
 */
import { v4 as uuidv4 } from 'uuid';
import { uploadChunk, mergeChunks } from '@/api/chatRoom/fileUpload';
import socketClient from './socket';

// 默认分片大小：2MB
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 文件上传器类
 */
class FileUploader {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {number} options.chunkSize - 分片大小（字节）
   * @param {Function} options.onProgress - 进度回调
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   */
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    this.onProgress = options.onProgress || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    
    // 上传任务队列
    this.uploadQueue = [];
    
    // 当前上传状态
    this.uploading = false;
  }
  
  /**
   * 添加文件到上传队列
   * @param {File} file - 文件对象
   * @param {Object} userData - 用户数据
   * @returns {string} 上传任务ID
   */
  addFile(file, userData) {
    const taskId = uuidv4();
    
    // 创建上传任务
    const task = {
      id: taskId,
      file,
      fileId: uuidv4(),
      userData,
      chunks: [],
      uploadedChunks: 0,
      totalChunks: 0,
      progress: 0,
      status: 'pending' // pending, uploading, success, error
    };
    
    // 分割文件
    this._splitFile(task);
    
    // 添加到队列
    this.uploadQueue.push(task);
    
    // 开始上传
    this._processQueue();
    
    return taskId;
  }
  
  /**
   * 分割文件为多个分片
   * @param {Object} task - 上传任务
   * @private
   */
  _splitFile(task) {
    const file = task.file;
    const chunkSize = this.chunkSize;
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    
    task.totalChunks = totalChunks;
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = file.slice(start, end);
      
      task.chunks.push({
        index: i,
        blob: chunk,
        size: chunk.size,
        uploaded: false
      });
    }
  }
  
  /**
   * 处理上传队列
   * @private
   */
  _processQueue() {
    if (this.uploading) return;
    
    const pendingTask = this.uploadQueue.find(task => task.status === 'pending');
    if (!pendingTask) return;
    
    this.uploading = true;
    pendingTask.status = 'uploading';
    
    this._uploadTask(pendingTask);
  }
  
  /**
   * 上传任务
   * @param {Object} task - 上传任务
   * @private
   */
  async _uploadTask(task) {
    try {
      // 上传所有分片
      await this._uploadChunks(task);
      
      // 合并分片
      const result = await this._mergeChunks(task);
      
      // 更新任务状态
      task.status = 'success';
      task.result = result;
      
      // 发送WebSocket消息
      await this._sendFileMessage(task);
      
      // 调用成功回调
      this.onSuccess(task);
    } catch (error) {
      console.error('文件上传错误:', error);
      task.status = 'error';
      task.error = error;
      this.onError(task, error);
    } finally {
      this.uploading = false;
      this._processQueue();
    }
  }
  
  /**
   * 上传所有分片
   * @param {Object} task - 上传任务
   * @returns {Promise<void>}
   * @private
   */
  async _uploadChunks(task) {
    const promises = task.chunks.map(chunk => this._uploadChunk(task, chunk));
    await Promise.all(promises);
  }
  
  /**
   * 上传单个分片
   * @param {Object} task - 上传任务
   * @param {Object} chunk - 分片对象
   * @returns {Promise<void>}
   * @private
   */
  async _uploadChunk(task, chunk) {
    if (chunk.uploaded) return;
    
    try {
      const params = {
        chunk: chunk.blob,
        fileId: task.fileId,
        chunkIndex: chunk.index,
        totalChunks: task.totalChunks
      };
      
      // 上传分片
      await uploadChunk(params, (progress) => {
        // 更新分片进度
        chunk.progress = progress;
        
        // 计算总进度
        this._updateTaskProgress(task);
      });
      
      // 标记为已上传
      chunk.uploaded = true;
      task.uploadedChunks++;
      
      // 更新总进度
      this._updateTaskProgress(task);
    } catch (error) {
      console.error(`上传分片 ${chunk.index} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 更新任务进度
   * @param {Object} task - 上传任务
   * @private
   */
  _updateTaskProgress(task) {
    // 计算已上传的分片进度总和
    const chunkProgressSum = task.chunks.reduce((sum, chunk) => {
      return sum + (chunk.uploaded ? 100 : (chunk.progress || 0));
    }, 0);
    
    // 计算总进度百分比
    const totalProgress = chunkProgressSum / (task.totalChunks * 100) * 100;
    task.progress = Math.round(totalProgress);
    
    // 调用进度回调
    this.onProgress(task);
  }
  
  /**
   * 合并文件分片
   * @param {Object} task - 上传任务
   * @returns {Promise<Object>} 合并结果
   * @private
   */
  async _mergeChunks(task) {
    const params = {
      fileId: task.fileId,
      fileName: task.file.name,
      fileType: task.file.type,
      fileSize: task.file.size,
      totalChunks: task.totalChunks
    };
    
    const result = await mergeChunks(params);
    return result.data;
  }
  
  /**
   * 发送文件消息到WebSocket
   * @param {Object} task - 上传任务
   * @returns {Promise<void>}
   * @private
   */
  async _sendFileMessage(task) {
    const { userData, result, file } = task;
    
    // 构建文件消息
    const fileMessage = {
      userId: userData.userId,
      username: userData.username,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: result.fileUrl,
      fileId: result.fileId
    };
    
    // 发送WebSocket消息
    await socketClient.emit('file', fileMessage);
  }
  
  /**
   * 取消上传任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} 是否成功取消
   */
  cancelTask(taskId) {
    const taskIndex = this.uploadQueue.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return false;
    
    const task = this.uploadQueue[taskIndex];
    if (task.status === 'success') return false;
    
    // 移除任务
    this.uploadQueue.splice(taskIndex, 1);
    
    return true;
  }
}

// 导出单例实例
export default new FileUploader();