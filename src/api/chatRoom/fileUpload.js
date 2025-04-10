/**
 * 文件上传相关API
 */
import { post, get,uploadFile } from '@/utils/http/axios/axios';
import {mergeChunk,postChunk} from '@/api/api'
/**
 * 上传文件分片
 * @param {Object} params - 上传参数
 * @param {File} params.chunk - 文件分片
 * @param {string} params.fileId - 文件唯一标识
 * @param {number} params.chunkIndex - 分片索引
 * @param {number} params.totalChunks - 总分片数
 * @param {Function} onUploadProgress - 上传进度回调函数
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadChunk(params, onUploadProgress) {
  const { chunk, fileId, chunkIndex, totalChunks } = params;
  
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('fileId', fileId);
  formData.append('chunkIndex', chunkIndex);
  formData.append('totalChunks', totalChunks);
  
  try {
    return await uploadFile(postChunk, formData, onUploadProgress);
  } catch (error) {
    console.error('上传分片失败:', error);
    throw error;
  }
}

/**
 * 合并文件分片
 * @param {Object} params - 合并参数
 * @param {string} params.fileId - 文件唯一标识
 * @param {string} params.fileName - 文件名
 * @param {string} params.fileType - 文件MIME类型
 * @param {number} params.fileSize - 文件大小
 * @param {number} params.totalChunks - 总分片数
 * @returns {Promise<Object>} 合并结果
 */
export async function mergeChunks(params) {
  return post(mergeChunk, params);
}

/**
 * 获取文件下载链接
 * @param {number} fileId - 文件ID
 * @returns {string} 下载链接
 */
export function getFileDownloadUrl(fileId) {
  return `/api/files/${fileId}`;
}