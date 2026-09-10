import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import apiRoutes from './routes/api.js';
import { loadUsers } from './controllers/authController.js';
import { loadChats, saveChats } from './controllers/chatController.js';
import { loadReadingActivities, saveReadingActivities } from './controllers/socialController.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Configuración de Socket.IO con CORS total
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 25000
});

// Middlewares Express
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rutas API
app.use('/api', apiRoutes);

// Servir frontend compilado para modo desktop o web
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'resources/app/frontend/dist')
];

const distPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];

if (fs.existsSync(distPath)) {
  console.log('[Server] Sirviendo frontend estático desde:', distPath);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Yomori Real-time Engine',
      version: '2.0.0',
      description: 'Servidor backend con WebSockets y soporte multi-sala en tiempo real para Yomori'
    });
  });
}

// -------------------------------------------------------------
// GESTIÓN DE SALAS Y SOCKETS EN TIEMPO REAL (SOCKET.IO)
// -------------------------------------------------------------
// Mapa de usuarios conectados por sala: { [roomId]: Set<socketId> }
const roomUsersCount = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

  // 0. Registrar canal personal de notificaciones por usuario
  socket.on('register_user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket] Usuario registrado en canal personal user:${userId}`);
    }
  });

  // 1. Unirse a una sala específica (global, manga:..., chapter:...)
  socket.on('join_room', (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.currentRoom = roomId;

    if (!roomUsersCount.has(roomId)) {
      roomUsersCount.set(roomId, new Set());
    }
    roomUsersCount.get(roomId).add(socket.id);

    const activeCount = roomUsersCount.get(roomId).size;
    io.to(roomId).emit('room_users_count', { roomId, activeCount });
    console.log(`[Socket] ${socket.id} se unió a la sala "${roomId}" (Total: ${activeCount})`);
  });

  // 2. Salir de una sala
  socket.on('leave_room', (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    if (roomUsersCount.has(roomId)) {
      roomUsersCount.get(roomId).delete(socket.id);
      const activeCount = roomUsersCount.get(roomId).size;
      io.to(roomId).emit('room_users_count', { roomId, activeCount });
    }
  });

  // 3. Enviar mensaje en vivo a una sala
  socket.on('send_message', async (data, callback) => {
    try {
      const { roomId = 'global', token, userId, username, text, page = null, mangaTitle = null, chapterTitle = null, replyTo = null } = data || {};

      const users = loadUsers();
      let user = null;
      if (token) {
        user = users.find(u => u.token === token);
      }
      if (!user && (userId || username)) {
        user = users.find(u => (userId && u.id === userId) || (username && u.username.toLowerCase() === username.toLowerCase()));
      }

      if (!user) {
        if (username) {
          user = {
            id: userId || ('usr_guest_' + Date.now()),
            username: username,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
            banner: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            badge: 'Lector Élite',
            bio: 'Leyendo en Yomori 📖'
          };
        } else {
          if (typeof callback === 'function') callback({ success: false, message: 'Debes iniciar sesión para escribir en el chat.' });
          return;
        }
      }

      if (!text || !text.trim()) {
        if (typeof callback === 'function') callback({ success: false, message: 'El mensaje no puede estar vacío.' });
        return;
      }

      const cleanText = text.trim();
      if (cleanText.length > 500) {
        if (typeof callback === 'function') callback({ success: false, message: 'El mensaje no puede exceder los 500 caracteres.' });
        return;
      }

      const message = {
        id: 'msg_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
        roomId,
        userId: user.id,
        username: user.username,
        userAvatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
        userBanner: user.banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        userBadge: user.badge || (user.role === 'admin' ? 'Administrador' : 'Lector Élite'),
        userStatus: user.bio || user.status || 'Leyendo en Yomori 📖',
        text: cleanText,
        page: page ? parseInt(page, 10) : null,
        mangaTitle: mangaTitle || null,
        chapterTitle: chapterTitle || null,
        replyTo: replyTo || null,
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString()
      };

      // Guardar de forma duradera en el archivo de base de datos
      const chats = loadChats();
      if (!chats[roomId]) {
        chats[roomId] = [];
      }
      chats[roomId].push(message);
      if (chats[roomId].length > 500) {
        chats[roomId] = chats[roomId].slice(-500);
      }
      saveChats(chats);

      // Retransmitir en tiempo real a todos en la sala
      io.to(roomId).emit('new_message', message);

      // Si es un mensaje directo (DM), emitir notificación instantánea al receptor y emisor
      if (roomId.startsWith('dm:')) {
        const parts = roomId.replace('dm:', '').split('_');
        parts.forEach(targetId => {
          io.to(`user:${targetId}`).emit('dm_notification', {
            message,
            roomId,
            fromUser: {
              id: user.id,
              username: user.username,
              avatar: user.avatar
            }
          });
        });
      }

      if (typeof callback === 'function') {
        callback({ success: true, message });
      }
    } catch (err) {
      console.error('[Socket Message Error]:', err);
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  });

  // 3.1 Eventos en tiempo real para Solicitudes de Amistad
  socket.on('send_friend_request', (data) => {
    try {
      const { toUserId, request } = data || {};
      if (toUserId) {
        io.to(`user:${toUserId}`).emit('friend_request_received', { request });
        console.log(`[Socket] Solicitud de amistad enviada a canal user:${toUserId}`);
      }
    } catch (e) {}
  });

  socket.on('respond_friend_request', (data) => {
    try {
      const { toUserId, action, request } = data || {};
      if (toUserId) {
        io.to(`user:${toUserId}`).emit('friend_request_result', { action, request });
        console.log(`[Socket] Respuesta de amistad enviada a canal user:${toUserId}`);
      }
    } catch (e) {}
  });

  // 4. Like / Reacción a mensaje en tiempo real
  socket.on('like_message', async (data, callback) => {
    try {
      const { roomId = 'global', messageId, token } = data || {};
      if (!token || !messageId) return;

      const users = loadUsers();
      const user = users.find(u => u.token === token);
      if (!user) return;

      const chats = loadChats();
      const roomMessages = chats[roomId] || [];
      const msg = roomMessages.find(m => m.id === messageId);
      if (!msg) return;

      if (!Array.isArray(msg.likedBy)) msg.likedBy = [];

      const hasLiked = msg.likedBy.includes(user.id);
      if (hasLiked) {
        msg.likedBy = msg.likedBy.filter(id => id !== user.id);
        msg.likes = Math.max(0, (msg.likes || 1) - 1);
      } else {
        msg.likedBy.push(user.id);
        msg.likes = (msg.likes || 0) + 1;
      }

      saveChats(chats);

      // Emitir a todos en la sala la actualización del mensaje
      io.to(roomId).emit('message_updated', {
        messageId: msg.id,
        roomId,
        likes: msg.likes,
        likedBy: msg.likedBy
      });

      if (typeof callback === 'function') callback({ success: true, likes: msg.likes, isLiked: !hasLiked });
    } catch (e) {}
  });

  // 5. Eliminar mensaje en tiempo real
  socket.on('delete_message', async (data, callback) => {
    try {
      const { roomId = 'global', messageId, token } = data || {};
      if (!messageId) return;

      const users = loadUsers();
      const user = users.find(u => u.token === token);

      const chats = loadChats();
      const roomMessages = chats[roomId] || [];
      const msg = roomMessages.find(m => m.id === messageId);
      if (!msg) return;

      if (user && user.id !== msg.userId && user.role !== 'admin') return;

      chats[roomId] = roomMessages.filter(m => m.id !== messageId);
      saveChats(chats);

      io.to(roomId).emit('message_deleted', { roomId, messageId });
      if (typeof callback === 'function') callback({ success: true, messageId });
    } catch (e) {}
  });

  // 6. Actividad de lectura en vivo ("Activo ahora")
  socket.on('reading_activity', async (data) => {
    try {
      const { token, isReading, mangaTitle, chapterTitle, cover, url, extensionId, page, totalPages } = data || {};
      if (!token) return;
      const users = loadUsers();
      const user = users.find(u => u.token === token);
      if (!user) return;

      const activities = loadReadingActivities();
      if (isReading === false || !mangaTitle) {
        delete activities[user.id];
        io.emit('activity_update', {
          userId: user.id,
          activity: null
        });
      } else {
        const act = {
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          mangaTitle,
          chapterTitle: chapterTitle || 'Capítulo actual',
          cover: cover || '',
          url: url || '',
          extensionId: extensionId || '',
          page: page || 1,
          totalPages: totalPages || 1,
          startedAt: activities[user.id]?.startedAt || Date.now(),
          updatedAt: Date.now()
        };
        activities[user.id] = act;
        io.emit('activity_update', {
          userId: user.id,
          activity: user.shareReadingActivity !== false ? act : null
        });
      }
      saveReadingActivities(activities);
    } catch (e) {
      console.error('[Socket Reading Activity Error]:', e);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (socket.currentRoom && roomUsersCount.has(socket.currentRoom)) {
      roomUsersCount.get(socket.currentRoom).delete(socket.id);
      const activeCount = roomUsersCount.get(socket.currentRoom).size;
      io.to(socket.currentRoom).emit('room_users_count', { roomId: socket.currentRoom, activeCount });
    }
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

// Manejo de 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada en este servidor.`
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'Error no controlado en el servidor',
    error: err.message
  });
});

// Iniciar servidor HTTP con soporte WebSocket
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Yomori Backend Server + Socket.IO en: http://localhost:${PORT}`);
  console.log(`📡 WebSocket Real-time listo para todas las salas`);
  console.log(`=================================================`);
});
