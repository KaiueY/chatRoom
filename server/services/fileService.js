/**
 * 文件服务 - 处理文件的上传、存储和下载
 */
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import knex from '../db/knex.js';
import config from '../config.js';

/**
 * 获取文件信息
 * @param {number} fileId - 文件ID
 * @returns {Promise<Object>} 文件信息
 */
export async function getFileInfo(fileId) {
  const file = await knex('file').where({ id: fileId }).first();
  if (!file) {
    throw new Error('文件不存在');
  }
  return file;
}

/**
 * 保存文件信息到数据库
 */
export async function uploadFileMessage(fileInfo) {
  const [fileId] = await knex('file').insert(fileInfo);
  return fileId;
}

// export async function () {
 
  
//   const [fileId] = await knex('file').insert(fileInfo);
//   return fileId;
// }