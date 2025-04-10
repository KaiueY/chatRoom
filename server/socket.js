/**
 * Socket.IO服务器配置
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { genSalt, hash, compare } from 'bcryptjs';
import knex from './db/knex.js';
import config from './config.js';
import { saveUserMessage, saveRoomMessage } from './services/messageService.js';
import { getFileInfo } from './services/fileService.js';

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
    console.log('验证token',token);
    // 如果提供了token，验证它
    if (token) {
      try {
       
        
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.user = decoded;
        console.log('验证成功');
        
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
        console.log(socket.user,'socket.user');
        
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
    socket.on('message', async (messageData, callback) => {
      try {
        const { content, userId, username } = messageData;
        
        // 验证消息数据
        if (!content || !userId || !username) {
          return callback({ error: { message: '无效的消息数据' } });
        }
        
        // 创建消息对象
        const message = {
          id: Date.now().toString(), // 添加唯一ID
          type: 'message',
          content,
          userId,
          username,
          time: new Date().toISOString()
        };
        
        // 广播消息给所有客户端
        io.emit('message', message);
        
        // 保存消息到数据库
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content,
          messageType: 'text'
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('处理消息错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    
    // 文件消息事件
    socket.on('file', async (fileData, callback) => {
      try {
        console.log('文件消息事件触发',socket.user);
        
        // 验证用户是否已登录
        if (!socket.user) {
          return callback && callback({ error: { message: '未登录，无法发送文件' } });
        }
        
        const { userId, username, fileName, fileType, fileSize, fileUrl, fileId } = fileData;
        
        // 验证文件数据
        if (!userId || !username || !fileName || !fileUrl || !fileId) {
          return callback && callback({ error: { message: '无效的文件数据' } });
        }
        
        // 创建文件消息对象
        const fileMessage = {
          id: Date.now().toString(),
          type: 'file',
          userId,
          username,
          fileName,
          fileType,
          fileSize,
          fileUrl,
          fileId,
          time: new Date().toISOString()
        };
        
        // 广播文件消息给所有客户端
        io.emit('file', fileMessage);
        
        // 确定消息类型
        let messageType = 'file';
        if (fileType && fileType.startsWith('image/')) {
          messageType = 'image';
        }
        
        // 保存文件消息到数据库
        await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: parseInt(userId),
          content: `${username} 分享了文件: ${fileName}`,
          messageType,
          fileUrl,
          fileName,
          fileSize
        });
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('处理文件消息错误:', error);
        if (callback) callback({ error: { message: '服务器错误' } });
      }
    });
    
    // 处理文件上传完成事件
    socket.on('file_uploaded', async (data, callback) => {
      try {
        const { fileId, fileName, fileType, fileSize, fileUrl } = data;
        
        if (!socket.user) {
          return callback({ error: { message: '未登录，无法发送文件' } });
        }
        
        // 创建文件消息
        const fileMessage = {
          userId: socket.user.id,
          username: socket.user.username,
          fileName,
          fileType,
          fileSize,
          fileUrl,
          fileId,
          messageType: 'file',
          content: `${socket.user.username} 发送了文件: ${fileName}`,
          time: new Date().toISOString()
        };
        
        // 保存到数据库
        const messageId = await saveRoomMessage({
          roomId: 1, // 默认聊天室
          userId: socket.user.id,
          content: fileMessage.content,
          messageType: 'file',
          fileUrl,
          fileName,
          fileSize
        });
        
        // 添加消息ID
        fileMessage.id = messageId;
        
        // 广播给所有客户端
        io.emit('file', fileMessage);
        
        callback({ success: true });
      } catch (error) {
        console.error('处理文件上传错误:', error);
        callback({ error: { message: '服务器错误' } });
      }
    });
    
    // 注意：文件事件处理已合并到上面的'file'事件处理器中
    // 此处删除重复的处理器以避免冲突
    
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