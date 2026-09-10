
export function getAuthenticatedUser(req, users) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : (req.body?.token || req.query?.token);
  const reqUserId = req.body?.currentUserId || req.body?.userId || req.headers['x-user-id'];
  const reqUsername = req.body?.currentUsername || req.body?.fromUsername || req.headers['x-username'];

  if (token) {
    const u = users.find(user => user.token === token);
    if (u) return u;
  }

  if (reqUserId) {
    const u = users.find(user => user.id === reqUserId);
    if (u) return u;
  }

  if (reqUsername) {
    const u = users.find(user => (user.username || '').toLowerCase() === reqUsername.toLowerCase());
    if (u) return u;
  }

  return null;
}

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
const friendRequestsFile = path.join(dataDir, 'friend_requests.json');
const activitiesFile = path.join(dataDir, 'reading_activities.json');

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

export function loadFriendRequests() {
  try {
    if (fs.existsSync(friendRequestsFile)) {
      return JSON.parse(fs.readFileSync(friendRequestsFile, 'utf8'));
    }
  } catch (e) {}
  return [];
}

export function saveFriendRequests(requests) {
  try {
    const tempFile = `${friendRequestsFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(requests, null, 2), 'utf8');
    fs.renameSync(tempFile, friendRequestsFile);
  } catch (e) {
    console.error('[Social Error] Guardando friend_requests.json:', e.message);
  }
}

export function loadReadingActivities() {
  try {
    if (fs.existsSync(activitiesFile)) {
      return JSON.parse(fs.readFileSync(activitiesFile, 'utf8'));
    }
  } catch (e) {}
  return {};
}

export function saveReadingActivities(activities) {
  try {
    const tempFile = `${activitiesFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(activities, null, 2), 'utf8');
    fs.renameSync(tempFile, activitiesFile);
  } catch (e) {
    console.error('[Social Error] Guardando reading_activities.json:', e.message);
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

// 4. AÑADIR O ELIMINAR AMIGO DIRECTAMENTE
export const toggleFriend = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = getAuthenticatedUser(req, users);
    if (!me) return res.status(401).json({ success: false, message: 'Debes iniciar sesión para realizar esta acción.' });

    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === me.id) {
      return res.status(400).json({ success: false, message: 'ID de usuario no válido' });
    }

    const targetUser = users.find(u => u.id === targetUserId || u.username.toLowerCase() === targetUserId.toLowerCase());
    if (!targetUser) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const allFriends = loadFriends();
    if (!Array.isArray(allFriends[me.id])) allFriends[me.id] = [];
    if (!Array.isArray(allFriends[targetUser.id])) allFriends[targetUser.id] = [];

    const isFriend = allFriends[me.id].includes(targetUser.id);
    if (isFriend) {
      allFriends[me.id] = allFriends[me.id].filter(id => id !== targetUser.id);
      allFriends[targetUser.id] = allFriends[targetUser.id].filter(id => id !== me.id);
    } else {
      allFriends[me.id].push(targetUser.id);
      if (!allFriends[targetUser.id].includes(me.id)) {
        allFriends[targetUser.id].push(me.id);
      }
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

// 5. ENVIAR SOLICITUD DE AMISTAD
export const sendFriendRequest = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = getAuthenticatedUser(req, users);
    if (!me) return res.status(401).json({ success: false, message: 'Debes iniciar sesión para realizar esta acción.' });

    const { username, targetUsername, targetUserId } = req.body;
    const searchVal = (username || targetUsername || '').trim().replace(/^@/, '');

    let targetUser = null;
    if (targetUserId) {
      targetUser = users.find(u => u.id === targetUserId);
    }
    if (!targetUser && searchVal) {
      const normSearch = searchVal.toLowerCase().replace(/[@_\s-]/g, '');
      targetUser = users.find(u => {
        const normU = (u.username || '').toLowerCase().replace(/[@_\s-]/g, '');
        return u.username.toLowerCase() === searchVal.toLowerCase() ||
               normU === normSearch ||
               (normSearch.length >= 3 && (normU.includes(normSearch) || normSearch.includes(normU)));
      });
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: `No se encontró ningún usuario con el nombre "@${searchVal || targetUserId}".` });
    }

    if (targetUser.id === me.id) {
      return res.status(400).json({ success: false, message: 'No puedes enviarte una solicitud a ti mismo.' });
    }

    const allFriends = loadFriends();
    if (allFriends[me.id]?.includes(targetUser.id)) {
      return res.status(400).json({ success: false, message: `Ya eres amigo de @${targetUser.username}.` });
    }

    const requests = loadFriendRequests();
    const existing = requests.find(r => 
      ((r.fromUserId === me.id && r.toUserId === targetUser.id) || (r.fromUserId === targetUser.id && r.toUserId === me.id)) &&
      r.status === 'pending'
    );

    if (existing) {
      if (existing.fromUserId === targetUser.id) {
        // Aceptación automática si la otra persona ya te había enviado solicitud
        existing.status = 'accepted';
        saveFriendRequests(requests);

        if (!Array.isArray(allFriends[me.id])) allFriends[me.id] = [];
        if (!Array.isArray(allFriends[targetUser.id])) allFriends[targetUser.id] = [];
        allFriends[me.id].push(targetUser.id);
        allFriends[targetUser.id].push(me.id);
        saveFriends(allFriends);

        return res.json({ success: true, message: `¡Genial! Ahora tú y @${targetUser.username} son amigos.`, status: 'accepted', targetUser });
      }
      return res.status(400).json({ success: false, message: 'Ya tienes una solicitud de amistad pendiente con este usuario.' });
    }

    const newRequest = {
      id: 'req_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      fromUserId: me.id,
      fromUsername: me.username,
      fromAvatar: me.avatar,
      toUserId: targetUser.id,
      toUsername: targetUser.username,
      toAvatar: targetUser.avatar,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    saveFriendRequests(requests);

    return res.json({ 
      success: true, 
      message: `Solicitud de amistad enviada a @${targetUser.username}.`, 
      request: newRequest,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. RESPONDER A UNA SOLICITUD DE AMISTAD (ACEPTAR / RECHAZAR)
export const respondFriendRequest = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = getAuthenticatedUser(req, users);
    if (!me) return res.status(401).json({ success: false, message: 'Debes iniciar sesión para realizar esta acción.' });

    const { requestId, action } = req.body; // action: 'accept' | 'reject'
    const requests = loadFriendRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId && (r.toUserId === me.id || r.fromUserId === me.id));

    if (reqIndex === -1) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const request = requests[reqIndex];
    const otherUserId = request.fromUserId === me.id ? request.toUserId : request.fromUserId;

    if (action === 'accept') {
      request.status = 'accepted';
      const allFriends = loadFriends();
      if (!Array.isArray(allFriends[me.id])) allFriends[me.id] = [];
      if (!Array.isArray(allFriends[otherUserId])) allFriends[otherUserId] = [];

      if (!allFriends[me.id].includes(otherUserId)) allFriends[me.id].push(otherUserId);
      if (!allFriends[otherUserId].includes(me.id)) allFriends[otherUserId].push(me.id);
      saveFriends(allFriends);
    } else {
      request.status = 'rejected';
    }

    saveFriendRequests(requests);
    return res.json({ success: true, action, message: action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7. ACTUALIZAR ACTIVIDAD DE LECTURA EN TIEMPO REAL ("Activo ahora")
export const updateReadingActivity = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const me = getAuthenticatedUser(req, users);
    if (!me) return res.status(401).json({ success: false, message: 'Debes iniciar sesión para realizar esta acción.' });

    const { mangaTitle, chapterTitle, cover, url, extensionId, page, totalPages, isReading } = req.body;
    const activities = loadReadingActivities();

    if (isReading === false || !mangaTitle) {
      delete activities[me.id];
    } else {
      activities[me.id] = {
        userId: me.id,
        username: me.username,
        avatar: me.avatar,
        mangaTitle,
        chapterTitle: chapterTitle || 'Capítulo actual',
        cover: cover || '',
        url: url || '',
        extensionId: extensionId || '',
        page: page || 1,
        totalPages: totalPages || 1,
        startedAt: activities[me.id]?.startedAt || Date.now(),
        updatedAt: Date.now()
      };
    }

    saveReadingActivities(activities);
    return res.json({ success: true, activity: activities[me.id] || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. OBTENER LISTA DE AMIGOS, DMs, SOLICITUDES Y ACTIVIDADES EN VIVO
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
    const activities = loadReadingActivities();

    // 1. Amigos confirmados con su actividad en vivo
    const friends = users
      .filter(u => myFriendIds.includes(u.id))
      .map(u => {
        const act = activities[u.id];
        // Verificar si la actividad es reciente (últimos 45 minutos)
        const isRecent = act && (Date.now() - act.updatedAt < 45 * 60 * 1000);
        return {
          id: u.id,
          username: u.username,
          avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`,
          banner: u.banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          bio: u.bio || 'Leyendo en Yomori',
          badge: u.badge || 'Lector',
          online: true,
          readingActivity: (isRecent && u.shareReadingActivity !== false) ? act : null
        };
      });

    // 2. Solicitudes de amistad (Recibidas y Enviadas)
    const allRequests = loadFriendRequests();
    const pendingIncoming = allRequests.filter(r => r.toUserId === me.id && r.status === 'pending');
    const pendingOutgoing = allRequests.filter(r => r.fromUserId === me.id && r.status === 'pending');

    // 3. Conversaciones directas y Solicitudes de mensajes (DMs de no-amigos)
    const chats = loadChats();
    const dmRooms = Object.keys(chats).filter(roomId => roomId.startsWith('dm:') && roomId.includes(me.id));
    
    const conversations = [];
    const messageRequests = [];

    dmRooms.forEach(roomId => {
      const otherUserId = roomId.replace('dm:', '').split('_').find(id => id !== me.id);
      const otherUser = users.find(u => u.id === otherUserId) || {
        id: otherUserId,
        username: 'Usuario',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherUserId || 'User')}`,
        badge: 'Lector'
      };

      const roomMessages = chats[roomId] || [];
      const lastMessage = roomMessages[roomMessages.length - 1] || null;
      const isFriend = myFriendIds.includes(otherUser.id);

      const convObj = {
        roomId,
        user: otherUser,
        lastMessage,
        isFriend,
        unreadCount: 0
      };

      conversations.push(convObj);

      // Si no son amigos y el último mensaje lo envió la otra persona, cuenta como solicitud de mensaje
      if (!isFriend && lastMessage && lastMessage.userId !== me.id) {
        messageRequests.push(convObj);
      }
    });

    // 4. Actividades en vivo de amigos para el panel "Activo ahora"
    const activeReadingFriends = friends
      .filter(f => f.readingActivity)
      .map(f => ({
        user: {
          id: f.id,
          username: f.username,
          avatar: f.avatar
        },
        activity: f.readingActivity
      }));

    return res.json({
      success: true,
      friends,
      pendingRequests: {
        incoming: pendingIncoming,
        outgoing: pendingOutgoing
      },
      messageRequests,
      activeReadingFriends,
      conversations
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
