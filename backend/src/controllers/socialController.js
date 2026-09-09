import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { loadUsers, saveUsers } from './authController.js';
import { loadChats, saveChats } from './chatController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const communitiesFile = path.join(dataDir, 'communities.json');
const friendsFile = path.join(dataDir, 'friends.json');

// Comunidades por defecto iniciales
const DEFAULT_COMMUNITIES = [
  {
    id: 'comm_shonen',
    name: 'Mundo Shonen & Aventura ⚔️',
    description: 'Comunidad dedicada a los mejores mangas y manhwas de acción, batallas épicas y superación.',
    category: 'Acción & Aventura',
    icon: '⚔️',
    banner: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 50%, #f59e0b 100%)',
    membersCount: 142,
    members: [],
    createdBy: 'Yomori',
    createdAt: new Date().toISOString()
  },
  {
    id: 'comm_manhwa_cult',
    name: 'Sectas de Cultivación & Manhwa 🗡️',
    description: 'El rincón para los amantes del cultivo inmortal, regreso al pasado, mazmorras y sistemas de niveles.',
    category: 'Cultivo & Manhwa',
    icon: '🐉',
    banner: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #6366f1 100%)',
    membersCount: 238,
    members: [],
    createdBy: 'Yomori',
    createdAt: new Date().toISOString()
  },
  {
    id: 'comm_romance_slice',
    name: 'Romance, Drama & Recuentos 🌸',
    description: 'Recomendaciones, debates y momentos conmovedores de los mangas románticos y comedias del momento.',
    category: 'Romance & Drama',
    icon: '🌸',
    banner: 'linear-gradient(135deg, #db2777 0%, #f43f5e 50%, #fb7185 100%)',
    membersCount: 95,
    members: [],
    createdBy: 'Yomori',
    createdAt: new Date().toISOString()
  },
  {
    id: 'comm_isekai_reborn',
    name: 'Gremio Isekai & Reencarnación 🏰',
    description: 'Si fuiste atropellado por un camión y despertaste con poderes OP en otro mundo, esta es tu casa.',
    category: 'Fantasía & Isekai',
    icon: '🏰',
    banner: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
    membersCount: 180,
    members: [],
    createdBy: 'Yomori',
    createdAt: new Date().toISOString()
  }
];

export function loadCommunities() {
  try {
    if (fs.existsSync(communitiesFile)) {
      const data = JSON.parse(fs.readFileSync(communitiesFile, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  saveCommunities(DEFAULT_COMMUNITIES);
  return DEFAULT_COMMUNITIES;
}

export function saveCommunities(communities) {
  try {
    const tempFile = `${communitiesFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(communities, null, 2), 'utf8');
    fs.renameSync(tempFile, communitiesFile);
  } catch (e) {
    console.error('[Social Error] Guardando communities.json:', e.message);
  }
}

export function loadFriends() {
  try {
    if (fs.existsSync(friendsFile)) {
      return JSON.parse(fs.readFileSync(friendsFile, 'utf8'));
    }
  } catch (e) {}
  return {};
}

export function saveFriends(friends) {
  try {
    const tempFile = `${friendsFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(friends, null, 2), 'utf8');
    fs.renameSync(tempFile, friendsFile);
  } catch (e) {
    console.error('[Social Error] Guardando friends.json:', e.message);
  }
}

// 1. OBTENER LISTA DE COMUNIDADES
export const getCommunities = async (req, res) => {
  try {
    const communities = loadCommunities();
    return res.json({ success: true, communities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. CREAR NUEVA COMUNIDAD
export const createCommunity = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);
    if (!user) return res.status(401).json({ success: false, message: 'Sesión no válida' });

    const { name, description, category, icon, banner } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la comunidad es obligatorio.' });
    }

    const communities = loadCommunities();
    const newComm = {
      id: 'comm_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      name: name.trim().slice(0, 50),
      description: (description || 'Una nueva comunidad de lectores en Yomori.').trim().slice(0, 200),
      category: category || 'General',
      icon: icon || '🌟',
      banner: banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      membersCount: 1,
      members: [user.id],
      createdBy: user.username,
      createdAt: new Date().toISOString()
    };

    communities.unshift(newComm);
    saveCommunities(communities);

    return res.json({ success: true, community: newComm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. UNIRSE O SALIR DE UNA COMUNIDAD
export const toggleJoinCommunity = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);
    if (!user) return res.status(401).json({ success: false, message: 'Sesión no válida' });

    const { communityId } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    if (!Array.isArray(comm.members)) comm.members = [];

    const isMember = comm.members.includes(user.id);
    if (isMember) {
      comm.members = comm.members.filter(id => id !== user.id);
      comm.membersCount = Math.max(1, (comm.membersCount || 1) - 1);
    } else {
      comm.members.push(user.id);
      comm.membersCount = (comm.membersCount || 0) + 1;
    }

    saveCommunities(communities);
    return res.json({ success: true, isMember: !isMember, membersCount: comm.membersCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. AÑADIR O ELIMINAR AMIGO
export const toggleFriend = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = users.find(u => u.token === token);
    if (!me) return res.status(401).json({ success: false, message: 'Sesión no válida' });

    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === me.id) {
      return res.status(400).json({ success: false, message: 'ID de usuario no válido' });
    }

    const targetUser = users.find(u => u.id === targetUserId || u.username.toLowerCase() === targetUserId.toLowerCase());
    if (!targetUser) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const allFriends = loadFriends();
    if (!Array.isArray(allFriends[me.id])) allFriends[me.id] = [];

    const isFriend = allFriends[me.id].includes(targetUser.id);
    if (isFriend) {
      allFriends[me.id] = allFriends[me.id].filter(id => id !== targetUser.id);
    } else {
      allFriends[me.id].push(targetUser.id);
    }

    saveFriends(allFriends);

    return res.json({
      success: true,
      isFriend: !isFriend,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        banner: targetUser.banner,
        badge: targetUser.badge
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. OBTENER LISTA DE AMIGOS Y CONVERSACIONES DIRECTAS
export const getFriendsAndDMs = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = users.find(u => u.token === token);
    if (!me) return res.status(401).json({ success: false, message: 'Sesión no válida' });

    const allFriends = loadFriends();
    const myFriendIds = allFriends[me.id] || [];
    const friends = users
      .filter(u => myFriendIds.includes(u.id))
      .map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`,
        banner: u.banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        bio: u.bio || 'Leyendo en Yomori',
        badge: u.badge || 'Lector',
        online: true
      }));

    // Cargar todas las conversaciones directas que involucran al usuario
    const chats = loadChats();
    const dmRooms = Object.keys(chats).filter(roomId => roomId.startsWith('dm:') && roomId.includes(me.id));
    
    const conversations = dmRooms.map(roomId => {
      const otherUserId = roomId.replace('dm:', '').split('_').find(id => id !== me.id);
      const otherUser = users.find(u => u.id === otherUserId) || {
        id: otherUserId,
        username: 'Usuario',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherUserId || 'User')}`,
        badge: 'Lector'
      };

      const roomMessages = chats[roomId] || [];
      const lastMessage = roomMessages[roomMessages.length - 1] || null;

      return {
        roomId,
        user: otherUser,
        lastMessage,
        unreadCount: 0
      };
    });

    return res.json({
      success: true,
      friends,
      conversations
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
