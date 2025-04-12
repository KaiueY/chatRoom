/**
 * Socket.IO 处理程序集合
 */
import jwt from 'jsonwebtoken';
import { compare } from 'bcryptjs';
import { genSalt, hash } from 'bcryptjs';
import knex from '../db/knex.js';
import config from '../config.js';
import { saveRoomMessage } from '../services/messageService.js';
import { uploadFileMessage } from '../services/fileService.js';

/**
 * 处理用户登录
 * @param {Object} socket - Socket.IO socket对象
 * @param {Object} credentials - 登录凭证
 * @param {Function} callback - 回调函数
 * @param {Map} clients - 客户端映射
 * @param {Function} isUserAlreadyOnline - 检查用户是否已在线
 */
export async function handleLogin(socket, credentials, callback, clients, isUserAlreadyOnline) {
  try {
    const { username, password } = credentials;
    
    // 验证请求数据
    if (!username || !password) {
      return callback({ error: { message: '用户名和密码不能为空' } });
    }
    
    // 查找用户
    const user = await knex('user').where({ username }).first();
    
    if (!user) {
      return callback({ error: { message: '该用户不存在' } });
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return callback({ error: { message: '用户名或密码错误' } });
    }

    const alreadyOnline = isUserAlreadyOnline(user.id);
    if (alreadyOnline) {
      return callback({ error: { message: '该用户已在别处登录' } });
    }
    await knex('user').where({ id: user.id }).update({ status: 'online' });

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // 更新客户端信息
    const clientId = socket.id;
    clients.set(clientId, { socket, userId: user.id, username: user.username });
    
    // 将用户信息存储在socket对象中
    socket.user = { id: user.id, username: user.username };
    
    callback({ 
      success: true,
      data: {
        user: { id: user.id, username },
        token
      },
      code: '200'
    });
  } catch (error) {
    console.error('登录错误:', error);
    callback({ error: { message: '服务器错误' } });
  }
}

/**
 * 处理用户注册
 * @param {Object} socket - Socket.IO socket对象
 * @param {Object} userData - 用户数据
 * @param {Function} callback - 回调函数
 * @param {Map} clients - 客户端映射
 */
export async function handleRegister(socket, userData, callback, clients) {
  try {
    const { username, password } = userData;
    
    // 验证请求数据
    if (!username || !password) {
      return callback({ error: { message: '用户名和密码不能为空' } });
    }
    
    // 检查用户名是否已存在
    const exist = await knex('user').where({ username }).first();
    if (exist) {
      return callback({ error: { message: '用户名已存在' } });
    }
    // 密码加密
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);
    
    // 创建新用户
    const [userId] = await knex('user').insert({
      username,
      password: hashedPassword,
      created_at: new Date()
    });
    
    // 更新客户端信息
    const clientId = socket.id;
    clients.set(clientId, { socket, userId, username });
    socket.user = { id: userId, username: username };
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: userId, username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    callback({ 
      success: true,
      data: {
        user: { id: userId, username },
        token
      },
      code: '200'
    });
  } catch (error) {
    console.error('注册错误:', error);
    callback({ error: { message: '服务器错误' } });
  }
}

/**
 * 处理用户加入聊天室
 * @param {Object} socket - Socket.IO socket对象
 * @param {Object} data - 加入数据
 * @param {Function} callback - 回调函数
 */
export async function handleJoin(socket, data, callback) {
  try {
    const { userId, username, roomId, time } = data;
    
    // 验证用户数据
    if (!userId || !username) {
      console.error('无效的用户加入数据:', data);
      return callback({ error: { message: '无效的用户加入数据' } });
    }

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
    
    // 广播用户加入消息
    socket.to(roomId).emit('join', joinMessage);
    
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
    // 验证消息数据
    if (!messageData.roomId || !messageData.content) {
      return callback({ error: { message: '无效的消息数据' } });
    }
    
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
    // 验证文件信息
    if (!fileInfo.roomId || !fileInfo.fileName) {
      return callback({ error: { message: '无效的文件信息' } });
    }
    
    // 保存文件信息到数据库并获取ID
    fileInfo.id = await uploadFileMessage(fileInfo);
    
    // 获取Socket.IO实例
    const io = socket.server;
    
    // 广播文件消息给所有客户端
    io.to(fileInfo.roomId).emit('message', fileInfo);
    
    callback({ success: true, data: fileInfo });
  } catch (error) {
    console.error('处理文件上传信息错误:', error);
    callback({ error: { message: '服务器错误' } });
  }
}