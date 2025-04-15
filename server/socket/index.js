import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import knex from '../db/knex.js';
import { formatTime } from '../utils/formatTime.js';
import { saveRoomMessage } from '../services/messageService.js';

import {handleJoin, handleMessage, handleFileInfo } from './handlers.js';

const clients = new Map();

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false };
  }
};

export default function initSocketIO(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token){
      return next(new Error('未提供 token'));
    };
    const { valid, decoded } = verifyToken(token);
    if (valid) {
      console.log(decoded,'---');
      
      socket.user = decoded;
    }
    next();
  });

  io.on('connection', (socket) => {
    const clientId = socket.id;
    clients.set(clientId, { socket, userId: socket.user?.id, username: socket.user?.username });

    // socket.on('login', (data, cb) => handleLogin(socket, data, cb, clients, isUserAlreadyOnline));
    // socket.on('register', (data, cb) => handleRegister(socket, data, cb, clients));
    socket.on('logout', async (data, cb) => {
      await knex('user').where({ id: socket.user.id }).update({ status: 'offline' });
      clients.delete(clientId);
      socket.user = null;
      cb({ success: true });
    });

    socket.on('join', (data, cb) => handleJoin(socket, data, cb));
    socket.on('message', (data, cb) => handleMessage(socket, data, cb));
    socket.on('file_info', (data, cb) => handleFileInfo(socket, data, cb));
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
        console.log(socket.user,'---');
        
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