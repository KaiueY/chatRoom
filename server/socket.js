/**
 * Socket.IO服务器配置
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { genSalt, hash, compare } from 'bcryptjs';
import knex from './db/knex.js';
import config from './config.js';
import { saveUserMessage, saveRoomMessage } from './services/messageService.js';

// 存储连接的客户端
const clients = new Map();

/**
 * 初始化Socket.IO服务器
 * @param {Object} server - HTTP服务器实例
 */
export function initSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // 在生产环境中应该限制为特定域名
      methods: ['GET', 'POST']
    }
  });

  // 中间件：连接认证
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    // 如果提供了token，验证它
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.user = decoded;
        return next();
      } catch (error) {
        return next(new Error('认证失败'));
      }
    }
    
    // 没有token也允许连接，但用户需要登录才能执行某些操作
    next();
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
        console.log('登录请求');
        
        // 验证请求数据
        if (!username || !password) {
          return callback({ error: { message: '用户名和密码不能为空' } });
        }
        
        // 查找用户
        const user = await knex('user').where({ username }).first();
        if (!user) {
          return callback({ error: { message: '用户名或密码错误' } });
        }
        
        // 验证密码
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
          return callback({ error: { message: '用户名或密码错误' } });
        }
        
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
        
        // 发送认证成功事件
        socket.emit('auth_success', {
          user: { id: user.id, username: user.username },
          token
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('登录错误:', error);
        callback({ error: { message: '服务器错误' } });
        socket.emit('auth_error', { message: '服务器错误' });
      }
    });
    
    // 注册事件
    socket.on('register', async (userData, callback) => {
      try {
        const { username, password } = userData;
        
        // 验证请求数据
        if (!username || !password) {
          return callback({ error: { message: '用户名和密码不能为空' } });
        }
        
        // 检查用户名是否已存在
        const existingUser = await knex('user').where({ username }).first();
        if (existingUser) {
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
        
        // 生成JWT令牌
        const token = jwt.sign(
          { id: userId, username },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );
        
        // 更新客户端信息
        clients.set(clientId, { socket, userId, username });
        
        // 将用户信息存储在socket对象中
        socket.user = { id: userId, username };
        
        // 发送认证成功事件
        socket.emit('auth_success', {
          user: { id: userId, username },
          token
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('注册错误:', error);
        callback({ error: { message: '服务器错误' } });
        socket.emit('auth_error', { message: '服务器错误' });
      }
    });
    
    // 退出登录事件
    socket.on('logout', (data, callback) => {
      // 清除用户信息
      socket.user = null;
      clients.set(clientId, { socket, userId: null, username: null });
      
      callback({ success: true });
    });
    
    // 加入聊天事件
    socket.on('join', async (data, callback) => {
      const { userId, username } = data;
      
      // 验证用户数据
      if (!userId || !username) {
        console.error('无效的用户加入数据:', data);
        return callback({ error: { message: '无效的用户加入数据' } });
      }
      
      // 创建系统消息
      const joinMessage = {
        id: Date.now().toString(), // 添加唯一ID
        type: 'join',
        userId,
        username,
        content: `${username} 加入了聊天室`,
        created_at: new Date().toISOString()
      };
      
      // 广播用户加入消息
      socket.broadcast.emit('join', joinMessage);
      
      try {
        // 保存系统消息到数据库
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content: `${username} 加入了聊天室`,
          messageType: 'system'
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('保存加入消息错误:', error);
        callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
      }
    });
    
    // 消息事件
    socket.on('message', async (data, callback) => {
      const { userId, username, content } = data;
      
      // 验证消息数据
      if (!userId || !content) {
        console.error('无效的消息数据:', data);
        return callback({ error: { message: '无效的消息数据' } });
      }
      
      // 创建消息对象
      const messageData = {
        id: Date.now().toString(), // 添加唯一ID
        type: 'message',
        userId,
        username,
        senderName: username,
        content: content, // 使用content字段而不是text
        created_at: new Date().toISOString()
      };
      console.log('接收消息', messageData);
      
      // 广播消息给所有客户端
      io.emit('message', messageData);
      
      try {
        // 保存用户消息到数据库
        await saveUserMessage({
          userId: parseInt(userId),
          content,
          messageType: 'text'
        });
        
        // 保存聊天室消息到数据库
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content,
          messageType: 'text'
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('保存消息错误:', error);
        callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
      }
    });
    
    // 文件事件
    socket.on('file', async (data, callback) => {
      const { userId, username, fileName, fileType, fileSize, fileData } = data;
      
      // 广播文件给所有客户端
      io.emit('file', data);
      
      try {
        // 保存文件消息到数据库
        // 注意：这里简化处理，实际应用中应该将文件保存到文件系统或云存储
        await saveUserMessage({
          userId: parseInt(userId),
          content: `发送了文件: ${fileName}`,
          messageType: 'file',
          fileName,
          fileSize
        });
        
        // 保存聊天室文件消息
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content: `发送了文件: ${fileName}`,
          messageType: 'file',
          fileName,
          fileSize
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('保存文件消息错误:', error);
        callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
      }
    });
    
    // 图片事件
    socket.on('image', async (data, callback) => {
      const { userId, username, fileName, fileType, fileSize, fileData } = data;
      
      // 广播图片给所有客户端
      io.emit('image', data);
      
      try {
        // 保存图片消息到数据库
        // 注意：这里简化处理，实际应用中应该将图片保存到文件系统或云存储
        await saveUserMessage({
          userId: parseInt(userId),
          content: `发送了图片: ${fileName}`,
          messageType: 'image',
          fileName,
          fileSize
        });
        
        // 保存聊天室图片消息
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content: `发送了图片: ${fileName}`,
          messageType: 'image',
          fileName,
          fileSize
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('保存图片消息错误:', error);
        callback({ success: true }); // 即使保存失败也返回成功，不影响用户体验
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
          time: new Date().toISOString()
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