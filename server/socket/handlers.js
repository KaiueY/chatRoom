
import { getRoomMessages, saveRoomMessage } from '../services/messageService.js';
import { getFileInfo, uploadFileMessage } from '../services/fileService.js';

/**
 * 处理用户加入聊天室
 */
export async function handleJoin(socket, data, callback) {
  try {
    const { userId, username, roomId, time } = data;
    
    // 验证用户数据
    if (!userId || !username) {
      console.error('无效的用户加入数据:', data);
      return callback({ error: { message: '无效的用户加入数据' } });
    }
    console.log('you用户加入',data);
    // 加入房间
    socket.join(roomId);
    const joinMessage = {
      roomId,
      messageType: 'system',
      userId,
      username,
      content: `${username} 加入了聊天室`,
      created_at: time,
    };
    
    // 保存系统消息到数据库
    joinMessage.id = await saveRoomMessage(joinMessage);
    
    // 广播用户加入消息给所有客户端，包括发送者
    // const io = socket.server;
    // io.to(roomId).emit('join', joinMessage);
    
    callback({ success: true });
  } catch (error) {
    console.error('保存加入消息错误:', error);
    callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
  }
}

/**
 * 处理用户消息
 * @param {Object} socket - Socket.IO socket对象
 * @param {Object} messageData - 消息数据
 * @param {Function} callback - 回调函数
 */
export async function handleMessage(socket, messageData, callback) {
  try {  
    console.log('有用户发送消息');
    
    // 验证消息数据
    if (!messageData.roomId || !messageData.content) {
      return callback({ error: { message: '无效的消息数据' } });
    }
    console.log('消息数据',messageData);
    
    const { roomId } = messageData;
    
    // 保存消息到数据库
    messageData.id = await saveRoomMessage(messageData);
    
    // 获取Socket.IO实例
    const io = socket.server;
    
    // 广播消息给所有客户端，包括发送者
    io.to(roomId).emit('message', messageData);
    
    callback({ success: true });
  } catch (error) {
    console.error('处理消息错误:', error);
    callback({ error: { message: '服务器错误' } });
  }
}

/**
 * 处理文件上传信息
 * @param {Object} socket - Socket.IO socket对象
 * @param {Object} fileInfo - 文件信息
 * @param {Function} callback - 回调函数
 */
export async function handleFileInfo(socket, fileInfo, callback) {
  try {
    console.log('有用户上传文件',fileInfo);
    // 验证文件信息
    if (!fileInfo.userId || !fileInfo.fileName || !fileInfo.fileUrl) {
      return callback({ error: { message: '无效的文件信息' } });
    }
    
    // 保存文件信息到数据库并获取ID
    fileInfo.fileId = await uploadFileMessage(fileInfo);
    const fileId = await saveRoomMessage(fileInfo);
    
    // 获取Socket.IO实例
    const io = socket.server;
    
    // 获取完整的文件数据
    const fileData = await getFileInfo(fileId);
    console.log('文件消息数据:', fileData);
    
    // 广播文件消息给所有客户端
    io.to(fileInfo.roomId).emit('message', fileData);
    
    callback({ success: true, data: fileInfo });
  } catch (error) {
    console.error('处理文件上传信息错误:', error);
    callback({ error: { message: '服务器错误' } });
  }
}