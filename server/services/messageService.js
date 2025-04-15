/**
 * 消息服务 - 处理消息的存储和检索
 */
import knex from '../db/knex.js';
import {formatTime} from '../utils/formatTime.js'


/**
 * 保存聊天室消息到数据库
 */
export async function saveRoomMessage(messageData) {
    // const res = await knex('roomMessages').insert({
  const [messageId] = await knex('roomMessages').insert({
    roomId: messageData.roomId || 1,
    userId: messageData.userId,
    fileId: messageData.fileId || null,
    content: messageData.content,
    messageType: messageData.messageType || 'text',
    created_at: messageData.created_at || formatTime(),
  });
//   console.log(res,'----');
  
  return messageId;
}

/**
 * 获取用户的消息历史
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
 */
export async function deleteUserMessage(messageId, userId) {
  const deleted = await knex('userMessages')
    .where({ id: messageId, userId })
    .delete();
  
  return deleted > 0;
}

/**
 * 删除聊天室消息
 */
export async function deleteRoomMessage(messageId, userId) {
  const deleted = await knex('roomMessages')
    .where({ id: messageId, userId })
    .delete();
  
  return deleted > 0;
}