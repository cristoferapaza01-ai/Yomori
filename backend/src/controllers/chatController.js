import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const chatsFile = path.join(dataDir, 'chats.json');
const usersFile = path.join(dataDir, 'users.json');

// Asegurar existencia del directorio
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    }
  } catch (e) {}
  return [];
}

// Cargar mensajes persistentes de chats
export function loadChats() {
  try {
    if (fs.existsSync(chatsFile)) {
      return JSON.parse(fs.readFileSync(chatsFile, 'utf8'));
    }
  } catch (e) {
    console.error('[Chat Error] Fallo al leer chats.json:', e.message);
  }
  return {};
}

// Guardado seguro y atómico de chats
export function saveChats(chats) {
  try {
    const tempFile = `${chatsFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(chats, null, 2), 'utf8');
    fs.renameSync(tempFile, chatsFile);
  } catch (e) {
    console.error('[Chat Error] Fallo al guardar chats.json:', e.message);
  }
}

// Mensajes iniciales de bienvenida para las salas si están vacías
const DEFAULT_GLOBAL_MESSAGES = [
  {
    id: 'msg_init_1',
    roomId: 'global',
    userId: 'usr_system_yomori',
    username: 'Yomori Bot',
    userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=YomoriOfficial',
    userBanner: 'linear-gradient(135deg, #7928ca 0%, #ff0080 100%)',
    userBadge: 'Oficial',
    userStatus: '¡Bienvenidos a la comunidad de Yomori! 🌸',
    text: '¡Bienvenidos a Yomori! Este chat es en vivo y en tiempo real. Puedes debatir sobre tus mangas favoritos y personalizar tu perfil.',
    likes: 12,
    likedBy: [],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// Obtener mensajes de una sala
export const getRoomMessages = async (req, res) => {
  try {
    const { roomId = 'global', limit = 100 } = req.query;
    const chats = loadChats();
    let roomMessages = chats[roomId];

    if (!roomMessages || roomMessages.length === 0) {
      if (roomId === 'global') {
        chats['global'] = [...DEFAULT_GLOBAL_MESSAGES];
        saveChats(chats);
        roomMessages = chats['global'];
      } else {
        roomMessages = [];
      }
    }

    // Retornar los últimos N mensajes
    const recent = roomMessages.slice(-parseInt(limit, 10));
    return res.json({
      success: true,
      roomId,
      messages: recent,
      count: recent.length
    });
  } catch (err) {
    console.error('[Get Messages Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Enviar un mensaje (REST fallback o llamado por Socket)
export const postMessage = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    const { roomId = 'global', userId, username, text, page = null, mangaTitle = null, chapterTitle = null } = req.body;

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
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión para poder escribir en el chat.' });
      }
    }

    const { roomId = 'global', text, page = null, mangaTitle = null, chapterTitle = null } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío.' });
    }

    const cleanText = text.trim();
    if (cleanText.length > 500) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede exceder los 500 caracteres.' });
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
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    const chats = loadChats();
    if (!chats[roomId]) {
      chats[roomId] = [];
    }
    chats[roomId].push(message);

    // Mantener un historial máximo de 500 mensajes por sala
    if (chats[roomId].length > 500) {
      chats[roomId] = chats[roomId].slice(-500);
    }

    saveChats(chats);

    return res.json({
      success: true,
      message
    });
  } catch (err) {
    console.error('[Post Message Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Dar o quitar Like a un mensaje
export const toggleLikeMessage = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesión para dar like.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Sesión no válida o expirada.' });
    }

    const { messageId, roomId = 'global' } = req.body;
    if (!messageId) {
      return res.status(400).json({ success: false, message: 'Falta messageId.' });
    }

    const chats = loadChats();
    const roomMessages = chats[roomId] || [];
    const msg = roomMessages.find(m => m.id === messageId);

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Mensaje no encontrado.' });
    }

    if (!Array.isArray(msg.likedBy)) {
      msg.likedBy = [];
    }

    const hasLiked = msg.likedBy.includes(user.id);
    if (hasLiked) {
      msg.likedBy = msg.likedBy.filter(id => id !== user.id);
      msg.likes = Math.max(0, (msg.likes || 1) - 1);
    } else {
      msg.likedBy.push(user.id);
      msg.likes = (msg.likes || 0) + 1;
    }

    saveChats(chats);

    return res.json({
      success: true,
      messageId: msg.id,
      likes: msg.likes,
      isLiked: !hasLiked
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
