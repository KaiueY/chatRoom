/**
 * 文件服务 - 处理文件的上传、存储和下载
 */
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import knex from '../db/knex.js';
import config from '../config.js';

// 文件存储根目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// 确保上传目录存在
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// 初始化上传目录结构
function initUploadDirectories() {
  // 创建主上传目录
  ensureDirectoryExists(UPLOAD_DIR);
  
  // 创建不同类型文件的子目录
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'images'));
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'documents'));
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'audio'));
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'video'));
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'other'));
  
  // 创建临时目录用于存储分片
  ensureDirectoryExists(path.join(UPLOAD_DIR, 'temp'));
}

// 初始化目录
initUploadDirectories();

/**
 * 根据文件类型获取存储目录
 * @param {string} fileType - MIME类型
 * @returns {string} 存储目录路径
 */
function getDirectoryByFileType(fileType) {
  if (fileType.startsWith('image/')) {
    return path.join(UPLOAD_DIR, 'images');
  } else if (fileType.startsWith('video/')) {
    return path.join(UPLOAD_DIR, 'video');
  } else if (fileType.startsWith('audio/')) {
    return path.join(UPLOAD_DIR, 'audio');
  } else if (
    fileType === 'application/pdf' ||
    fileType.includes('document') ||
    fileType.includes('text/') ||
    fileType.includes('application/vnd')
  ) {
    return path.join(UPLOAD_DIR, 'documents');
  } else {
    return path.join(UPLOAD_DIR, 'other');
  }
}

/**
 * 保存文件分片
 * @param {Object} chunkData - 分片数据
 * @param {string} chunkData.fileId - 文件唯一标识
 * @param {number} chunkData.chunkIndex - 分片索引
 * @param {number} chunkData.totalChunks - 总分片数
 * @param {Buffer} chunkData.chunkData - 分片内容
 * @returns {Promise<Object>} 保存结果
 */
export async function saveFileChunk(chunkData) {
  const { fileId, chunkIndex, totalChunks, chunkData: data } = chunkData;
  
  // 创建文件唯一目录
  const chunkDir = path.join(UPLOAD_DIR, 'temp', fileId);
  ensureDirectoryExists(chunkDir);
  
  // 保存分片
  const chunkPath = path.join(chunkDir, `${chunkIndex}`);
  await fsPromises.writeFile(chunkPath, data);
  
  return {
    success: true,
    fileId,
    chunkIndex,
    totalChunks
  };
}

/**
 * 合并文件分片
 * @param {Object} fileData - 文件数据
 * @param {string} fileData.fileId - 文件唯一标识
 * @param {string} fileData.fileName - 文件名
 * @param {string} fileData.fileType - 文件MIME类型
 * @param {number} fileData.fileSize - 文件大小
 * @param {number} fileData.totalChunks - 总分片数
 * @param {number} fileData.userId - 上传用户ID
 * @returns {Promise<Object>} 合并结果
 */
export async function mergeFileChunks(fileData) {
  const { fileId, fileName, fileType, fileSize, totalChunks, userId } = fileData;
  
  // 分片目录
  const chunkDir = path.join(UPLOAD_DIR, 'temp', fileId);
  
  // 检查所有分片是否都已上传
  const chunkPaths = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `${i}`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`分片 ${i} 不存在，无法合并文件`);
    }
    chunkPaths.push(chunkPath);
  }
  
  // 确定文件存储目录
  const targetDir = getDirectoryByFileType(fileType);
  
  // 生成唯一文件名
  const fileExt = path.extname(fileName);
  const baseFileName = path.basename(fileName, fileExt);
  const uniqueFileName = `${baseFileName}_${Date.now()}${fileExt}`;
  const targetPath = path.join(targetDir, uniqueFileName);
  
  // 合并文件
  const writeStream = fs.createWriteStream(targetPath);
  
  for (const chunkPath of chunkPaths) {
    const chunkData = await fsPromises.readFile(chunkPath);
    writeStream.write(chunkData);
  }
  
  // 关闭写入流
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    writeStream.end();
  });
  
  // 清理临时分片
  await fsPromises.rm(chunkDir, { recursive: true, force: true });
  
  // 生成文件URL
  const fileUrl = `/uploads/${path.relative(UPLOAD_DIR, targetPath).replace(/\\/g, '/')}`;
  
  // 保存文件信息到数据库
  const [fileRecord] = await knex('files').insert({
    userId,
    fileName,
    originalName: fileName,
    fileType,
    fileSize,
    filePath: targetPath,
    fileUrl,
    uploadedAt: new Date()
  });
  
  return {
    success: true,
    fileId: fileRecord,
    fileName,
    fileUrl,
    fileSize
  };
}

/**
 * 获取文件信息
 * @param {number} fileId - 文件ID
 * @returns {Promise<Object>} 文件信息
 */
export async function getFileInfo(fileId) {
  const file = await knex('files').where({ id: fileId }).first();
  if (!file) {
    throw new Error('文件不存在');
  }
  return file;
}

/**
 * 获取文件物理路径
 * @param {number} fileId - 文件ID
 * @returns {Promise<string>} 文件物理路径
 */
export async function getFilePath(fileId) {
  const file = await getFileInfo(fileId);
  return file.filePath;
}