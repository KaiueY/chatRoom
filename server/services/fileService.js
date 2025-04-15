import knex from '../db/knex.js';

/**
 * 获取文件信息
 * @param {number} fileId - 文件ID
 * @returns {Promise<Object>} 文件信息
 */
export async function getFileInfo(messageId) {
  if (!messageId) {
    throw new Error('消息不存在');
  }
  const fileInfo = await knex('roomMessages').where('roomMessages.id', messageId)
  .leftJoin('user', 'roomMessages.userId', 'user.id')
  .leftJoin('file', 'roomMessages.fileId', 'file.id')
  .select(
    'roomMessages.id',
    'roomMessages.messageType',
    'roomMessages.userId',
    'roomMessages.created_at',
    'roomMessages.content',
    'roomMessages.fileId',
    'file.fileUrl', 
    'file.fileName',
    'file.fileSize',
    'user.username'
  );
  return fileInfo[0];
}

/**
 * 保存文件信息到数据库
 */
export async function uploadFileMessage(fileInfo) {
  // console.log('文件上传信息:', fileInfo);
  const data = {
    userId: fileInfo.userId,
    fileName: fileInfo.fileName,
    fileSize: fileInfo.fileSize,
    fileType: fileInfo.messageType,
    fileUrl: fileInfo.fileUrl,
    created_at: fileInfo.created_at,
  }
  const [fileId] = await knex('file').insert(data);
  return fileId;
}

// export async function () {
 
  
//   const [fileId] = await knex('file').insert(fileInfo);
//   return fileId;
// }