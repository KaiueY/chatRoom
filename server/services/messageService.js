/**
 * 消息服务 - 处理消息的存储和检索
 */
import knex from '../db/knex.js';
import {formatTime} from '../utils/formatTime.js'


/**
 * 保存聊天室消息到数据库
 * @param {Object} messageData - 消息数据
 * @param {number} messageData.roomId - 聊天室ID (默认为1)
 * @param {number} messageData.userId - 用户ID
 * @param {string} messageData.content - 消息内容
 * @param {string} messageData.messageType - 消息类型 (text, file, image, system)
 * @param {number} [messageData.fileId] - 文件ID (可选，用于文件类型消息)
 * @returns {Promise<number>} 插入的消息ID
 */
export async function saveRoomMessage(messageData) {
    // const res = await knex('roomMessages').insert({
  const [messageId] = await knex('roomMessages').insert({
    roomId: messageData.roomId || 1,
    userId: messageData.userId,
    content: messageData.content,
    messageType: messageData.messageType || 'text',
    fileId: messageData.fileId || null,
    created_at: messageData.created_at || formatTime(),
  });
//   console.log(res,'----');
  
  return messageId;
}

/**
 * 获取用户的消息历史
 * @param {number} userId - 用户ID
 * @param {number} limit - 限制返回的消息数量 (默认50条)
 * @param {number} offset - 分页偏移量 (默认0)
 * @returns {Promise<Array>} 消息列表
 */
export async function getUserMessages(userId, limit = 50, offset = 0) {
   return knex('userMessages')
    .select(
      'userMessages.*',                 // 选择消息表的所有字段
      'user.username' 
    )
    .leftJoin('user', 'userMessages.userId', 'user.id') // 左关联 user 表
    .where('userMessages.userId', userId)
    .orderBy('userMessages.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

/**
 * 获取聊天室的消息历史
 * @param {number} roomId - 聊天室ID (默认为1)
 * @param {number} limit - 限制返回的消息数量 (默认50条)
 * @param {number} offset - 分页偏移量 (默认0)
 * @returns {Promise<Array>} 消息列表
 */
export async function getRoomMessages(roomId = 1, limit = 50, offset = 0) {
  return await knex('roomMessages')
    .where('roomId', roomId)
    .whereNot('messageType', 'system')
    // .whereIn('messageType', ['file', 'image']) // 只查询 messageType 为 'file' 或 'image' 的记录
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
    )
    .orderBy('roomMessages.created_at', 'desc') // 按时间倒序排列
    .limit(limit)
    .offset(offset);
}

/**
 * 删除用户消息
 * @param {number} messageId - 消息ID
 * @param {number} userId - 用户ID (用于验证权限)
 * @returns {Promise<boolean>} 是否成功删除
 */
export async function deleteUserMessage(messageId, userId) {
  const deleted = await knex('userMessages')
    .where({ id: messageId, userId })
    .delete();
  
  return deleted > 0;
}

/**
 * 删除聊天室消息
 * @param {number} messageId - 消息ID
 * @param {number} userId - 用户ID (用于验证权限)
 * @returns {Promise<boolean>} 是否成功删除
 */
export async function deleteRoomMessage(messageId, userId) {
  const deleted = await knex('roomMessages')
    .where({ id: messageId, userId })
    .delete();
  
  return deleted > 0;
}