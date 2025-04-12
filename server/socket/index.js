import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import knex from '../db/knex.js';
import { formatTime } from '../utils/formatTime.js';
import { saveRoomMessage } from '../services/messageService.js';
import { uploadFileMessage } from '../services/fileService.js';

import { handleLogin, handleRegister, handleJoin, handleMessage, handleFileInfo } from './handlers.js';

const clients = new Map();

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false };
  }
};

const isUserAlreadyOnline = (userId) => {
  for (const { userId: id } of clients.values()) {
    if (id === userId) return true;
  }
  return false;
};

function withAuth(handler) {
  return async (socket, data, callback) => {
    const token = socket.handshake.auth?.token;
    if (!token) return callback({ error: '未提供 token' });

    const { valid, decoded } = verifyToken(token);
    if (!valid) return callback({ error: 'token 无效' });

    socket.user = decoded;
    await handler(socket, data, callback);
  };
}

export function initSocketIO(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

//   io.use((socket, next) => {
//     const token = socket.handshake.auth.token;
//     if (!token) return next();

//     const { valid, decoded } = verifyToken(token);
//     if (valid) {
//       socket.user = decoded;
//     }
//     next();
//   });

  io.on('connection', (socket) => {
    const clientId = socket.id;
    clients.set(clientId, { socket, userId: socket.user?.id, username: socket.user?.username });

    socket.on('login', (data, cb) => handleLogin(socket, data, cb, clients, isUserAlreadyOnline));
    socket.on('register', (data, cb) => handleRegister(socket, data, cb, clients));
    socket.on('logout', async (data, cb) => {
      await knex('user').where({ id: socket.user.id }).update({ status: 'offline' });
      clients.delete(clientId);
      socket.user = null;
      cb({ success: true });
    });

    socket.on('join', (data, cb) => withAuth(handleJoin)(socket, data, cb));
    socket.on('message', (data, cb) => withAuth(handleMessage)(socket, data, cb));
    socket.on('file_info', (data, cb) => withAuth(handleFileInfo)(socket, data, cb));

    socket.on('disconnect', async () => {
      const client = clients.get(clientId);
      clients.delete(clientId);
      if (socket.user) {
        const leaveMessage = {
          type: 'leave',
          userId: socket.user.id,
          username: socket.user.username,
          time: formatTime(),
        };
        io.emit('leave', leaveMessage);
        await saveRoomMessage({
          roomId: 1,
          userId: socket.user.id,
          content: `${socket.user.username} 离开了聊天室`,
          messageType: 'system',
        });
      }
    });
  });

  return io;
}