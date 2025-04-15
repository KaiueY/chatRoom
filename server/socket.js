/**
 * Socket.IO服务器配置
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { genSalt, hash, compare } from 'bcryptjs';
import knex from './db/knex.js';
import {formatTime} from './utils/formatTime.js';
import config from './config.js';
import { saveRoomMessage } from './services/messageService.js';
import { getFileInfo,uploadFileMessage } from './services/fileService.js';

// 存储连接的客户端
const clients = new Map();

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err };
  }
}

const  isUserAlreadyOnline = (userId)=> {
  for (const { userId: id } of clients.values()) {
    if (id === userId) return true;
  }
  return false;
}
/**
 * 初始化Socket.IO服务器
 * @param {Object} server - HTTP服务器实例
 */
export function initSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // 中间件：连接认证
  io.use((socket, next) => {
    
    // 如果是注册请求，直接放行
    const token = socket.handshake.auth.token;
    // 如果提供了token，验证它
    if(!token){
      return next();
    }
    const { valid, decoded} = verifyToken(token);
    if (valid) {
      const {id,username} = decoded;
      // 将用户信息存储在socket对象中
      socket.user = {id,username};
      return next();
    }else{
      return next(new Error('认证失败'));
    }
  });

  // 连接事件
  io.on('connection', (socket) => {
    console.log('客户端已连接:', socket.id);
    // 为每个连接分配一个唯一ID
    const clientId = socket.id;
    clients.set(clientId, { socket, userId: socket.user?.id, username: socket.user?.username });
    
    // 登录事件
    socket.on('login', async (credentials, callback) => {
      try {
        const { username, password } = credentials;
        
        // 验证请求数据
        if (!username || !password) {
          return callback({ error: { message: '用户名和密码不能为空' } });
        }
        
        // 查找用户
        const user = await knex('user').where({ username }).first();
        // console.log('user',user);
        
        if (!user) {
          return callback({ error: { message: '该用户不存在' } });
        }

        // 验证密码
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
          return callback({ error: { message: '用户名或密码错误' } });
        }

        const alreadyOnline =  isUserAlreadyOnline(user.id);
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
        clients.set(clientId, { socket, userId: user.id, username: user.username });
        
        // 将用户信息存储在socket对象中
        socket.user = { id: user.id, username: user.username };
        // console.log('socket----',socket);
        
        // console.log('clients---',clients);
        callback({ 
          success: true,
          data: {
            user: { id: user.id, username },
            token
          },
          code:'200'
        });
      } catch (error) {
        console.error('登录错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    
    // 注册事件
    socket.on('register', async (userData, callback) => {
      try {
        console.log('用户注册', userData);
        
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
        clients.set(clientId, { socket, userId, username });
        socket.user = { id: userId, username: username };
        const token = jwt.sign(
          { id: userId, username },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );
        // console.log('token',token);
        
        // socket.emit('auth_success', {
        //   user: { id: userId, username },
        //   token
        // });
        
        callback({ 
          success: true,
          data: {
            user: { id: userId, username },
            token
          },
          code:'200'
        });
      } catch (error) {
        console.error('注册错误12:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    
    // 退出登录事件
    socket.on('logout', async(data, callback) => {
      // 清除用户信息
      await knex('user').where({ id: user.id }).update({ status: 'offline' });
      socket.user = null;
      clients.delete(clientId);
      callback({ success: true });
    });
    
    // 加入聊天事件
    socket.on('join', async (data, callback) => {
      const { userId, username,roomId,time } = data;
      
      // 验证用户数据
      if (!userId || !username) {
        console.error('无效的用户加入数据:', data);
        return callback({ error: { message: '无效的用户加入数据' } });
      }

      // 将用户加入到指定的聊天室
      socket.join(roomId);
      console.log(`用户 ${username} 加入了聊天室 ${roomId}`);
      
      const joinMessage = {
        roomId,
        messageType: 'system',
        userId,
        username,
        content: `${username} 加入了聊天室`,
        created_at: time,
      };
      
      
      try {
        // 保存系统消息到数据库
        joinMessage.id =  await saveRoomMessage(joinMessage);
        
        callback({ success: true });
      } catch (error) {
        console.error('保存加入消息错误:', error);
        callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
      }
      // 广播用户加入消息
      io.to(roomId).emit('join', joinMessage);
      
    });
    
    // 消息事件
    socket.on('message', async (messageData, callback) => {
      console.log('messageData',messageData);
      try {  
        // 验证消息数据
        if (!messageData.roomId || !messageData.content) {
          return callback({ error: { message: '无效的消息数据' } });
        }
        
        const {roomId} = messageData;
        // 保存消息到数据库
        messageData.id = await saveRoomMessage(messageData);
        
        // 检查当前聊天室内的用户
        const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .map(socketId => {
            const client = Array.from(clients.values())
              .find(client => client.socket.id === socketId);
            return client ? {
              userId: client.userId,
              username: client.username
            } : null;
          })
          .filter(user => user !== null);
        console.log(`当前聊天室 ${roomId} 的用户:`, roomUsers);
        
        // 使用io.to广播消息给房间内所有用户，包括发送者
        io.to(roomId).emit('message', messageData);
        
        callback({ success: true });
      } catch (error) {
        console.error('处理消息错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });

    // 文件上传信息
    socket.on('file_info', async (fileInfo, callback) => {
      try {
        console.log('文件上传信息:', fileInfo);
        // 保存文件信息到数据库并获取ID
        fileInfo.id = await uploadFileMessage(fileInfo);
        // 广播文件消息给所有客户端
        io.to(fileInfo.roomId).emit('message', fileInfo);
        callback({ success: true, data: fileInfo });
      } catch (error) {
        console.error('上传信息错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    
    
    // 处理文件上传完成事件
    socket.on('file_uploaded', async (data, callback) => {
      try {

      } catch (error) {
        console.error('处理文件上传错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    

    // 断开连接事件
    socket.on('disconnect', async () => {
      console.log('客户端已断开连接:', clientId);
      const client = clients.get(clientId);
      clients.delete(clientId);
      
      // 如果用户已登录，广播用户离开消息
      if (socket.user) {
        const leaveMessage = {
          type: 'leave',
          userId: socket.user.id,
          username: socket.user.username,
          time: formatTime()
        };
        
        io.emit('leave', leaveMessage);
        
        try {
          // 保存离开消息到数据库
          await saveRoomMessage({
            roomId: 1, // 默认聊天室
            userId: parseInt(socket.user.id),
            content: `${socket.user.username} 离开了聊天室`,
            messageType: 'system'
          });
        } catch (error) {
          console.error('保存离开消息错误:', error);
        }
      }
    });
  });

  return io;
}