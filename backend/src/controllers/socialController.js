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
const readingActivitiesFile = path.join(dataDir, 'reading_activities.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function getAuthenticatedUser(req, users = []) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : (req.body?.token || req.query?.token);
  const reqUserId = req.body?.currentUserId || req.body?.userId || req.headers['x-user-id'];
  const reqUsername = req.body?.currentUsername || req.body?.fromUsername || req.body?.username || req.headers['x-username'];

  if (token && token !== 'null' && token !== 'undefined' && token !== '') {
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

  // Si se envió un username (por ejemplo Rey_Palomo / Admin / Lector) asegurar que el usuario exista
  if (reqUsername) {
    const isAdmin = (reqUsername.toLowerCase() === 'rey_palomo' || reqUsername.toLowerCase() === 'admin');
    const newUser = {
      id: reqUserId || ('user_' + Date.now()),
      username: reqUsername,
      role: isAdmin ? 'admin' : 'user',
      token: token || ('tok_' + Date.now()),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(reqUsername)}`
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  }

  return null;
}

// Comunidades limpias
const INITIAL_OFFICIAL_COMMUNITY = [];

export function isUserAdmin(user) {
  if (!user) return false;
  return user.role === 'admin' || 
         (user.username || '').toLowerCase() === 'rey_palomo' || 
         (user.username || '').toLowerCase() === 'admin';
}

export function loadCommunities() {
  try {
    if (fs.existsSync(communitiesFile)) {
      const data = JSON.parse(fs.readFileSync(communitiesFile, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

export function saveCommunities(communities) {
  try {
    fs.writeFileSync(communitiesFile, JSON.stringify(communities, null, 2), 'utf8');
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
    fs.writeFileSync(friendsFile, JSON.stringify(friends, null, 2), 'utf8');
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
    fs.writeFileSync(friendRequestsFile, JSON.stringify(requests, null, 2), 'utf8');
  } catch (e) {
    console.error('[Social Error] Guardando friend_requests.json:', e.message);
  }
}

export function loadReadingActivities() {
  try {
    if (fs.existsSync(readingActivitiesFile)) {
      return JSON.parse(fs.readFileSync(readingActivitiesFile, 'utf8'));
    }
  } catch (e) {}
  return {};
}

export function saveReadingActivities(activities) {
  try {
    fs.writeFileSync(readingActivitiesFile, JSON.stringify(activities, null, 2), 'utf8');
  } catch (e) {
    console.error('[Social Error] Guardando reading_activities.json:', e.message);
  }
}

// 1. OBTENER LISTA DE COMUNIDADES (Aprobadas + Propias en revisión)
export const getCommunities = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    const communities = loadCommunities();
    const isAdmin = isUserAdmin(user);

    // Si es admin, ve todas; si es usuario normal, ve las aprobadas y sus propias solicitudes pendientes
    const visible = communities.filter(c => {
      if (c.status === 'approved' || !c.status) return true;
      if (user && (isAdmin || user.id === c.leaderId || user.username === c.createdBy)) return true;
      return false;
    });

    return res.json({ success: true, communities: visible });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. CREAR NUEVA COMUNIDAD (Rey_Palomo / Admin crea inmediatamente aprobada)
export const createCommunity = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'Inicia sesión para crear una comunidad.' });

    const { name, description, genres, category, icon, iconType, banner, bannerType } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la comunidad es obligatorio.' });
    }

    const selectedGenres = Array.isArray(genres) ? genres.slice(0, 2) : (category ? [category] : ['General']);

    const defaultBannerPresets = [
      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
      'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)',
      'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%)',
      'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      'linear-gradient(135deg, #831843 0%, #be185d 50%, #f43f5e 100%)',
      'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #06b6d4 100%)'
    ];
    const finalBanner = banner && banner.trim() 
      ? banner.trim() 
      : defaultBannerPresets[Math.floor(Math.random() * defaultBannerPresets.length)];

    const defaultIcons = [
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`
    ];
    const finalIcon = icon && icon.trim()
      ? icon.trim()
      : defaultIcons[Math.floor(Math.random() * defaultIcons.length)];

    const commId = 'comm_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

    const isAdmin = isUserAdmin(user);
    const initialStatus = isAdmin ? 'approved' : 'pending_approval';

    const newComm = {
      id: commId,
      name: name.trim().slice(0, 50),
      description: (description || 'Comunidad de lectores en Yomori.').trim().slice(0, 250),
      genres: selectedGenres,
      category: selectedGenres[0] || 'General',
      icon: finalIcon,
      iconType: 'image',
      banner: finalBanner,
      bannerType: (finalBanner.startsWith('http') || finalBanner.startsWith('data:')) ? 'image' : 'gradient',
      status: initialStatus,
      createdBy: user.username,
      leaderId: user.id,
      leaderUsername: user.username,
      membersCount: 1,
      members: [
        {
          userId: user.id,
          username: user.username,
          avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
          roleId: 'role_leader',
          joinedAt: new Date().toISOString()
        }
      ],
      roles: [
        {
          id: 'role_leader',
          name: '👑 Líder',
          color: '#f59e0b',
          isProtected: true,
          position: 1,
          permissions: {
            manage_community: true,
            manage_roles: true,
            kick_members: true,
            delete_messages: true,
            pin_messages: true
          }
        },
        {
          id: 'role_moderator',
          name: '🛡️ Moderador',
          color: '#3b82f6',
          isProtected: false,
          position: 2,
          permissions: {
            kick_members: true,
            delete_messages: true,
            pin_messages: true
          }
        },
        {
          id: 'role_vip',
          name: '💎 Miembro VIP',
          color: '#8b5cf6',
          isProtected: false,
          position: 3,
          permissions: {
            send_media: true
          }
        },
        {
          id: 'role_member',
          name: '👥 Miembros',
          color: '#9ca3af',
          isProtected: true,
          isDefault: true,
          position: 4,
          permissions: {
            send_messages: true
          }
        }
      ],
      createdAt: new Date().toISOString()
    };

    const communities = loadCommunities();
    communities.unshift(newComm);
    saveCommunities(communities);

    return res.json({
      success: true,
      requiresApproval: !isAdmin,
      message: isAdmin ? '¡Comunidad creada exitosamente!' : '¡Solicitud enviada para revisión por el Administrador!',
      community: newComm
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. OBTENER SOLICITUDES PENDIENTES DE COMUNIDAD (Admin)
export const getPendingCommunities = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!isUserAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Acceso restringido a Administradores' });
    }

    const communities = loadCommunities();
    const pending = communities.filter(c => c.status === 'pending_approval');

    return res.json({ success: true, pending });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. APROBAR O RECHAZAR SOLICITUD DE COMUNIDAD (Admin)
export const reviewCommunityRequest = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!isUserAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Acceso restringido a Administradores' });
    }

    const { communityId, action } = req.body; // action: 'approve' | 'reject'
    const communities = loadCommunities();
    const commIdx = communities.findIndex(c => c.id === communityId);

    if (commIdx === -1) {
      return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });
    }

    if (action === 'approve') {
      communities[commIdx].status = 'approved';
      saveCommunities(communities);
      return res.json({ success: true, message: 'Comunidad aprobada exitosamente', community: communities[commIdx] });
    } else {
      communities.splice(commIdx, 1);
      saveCommunities(communities);
      return res.json({ success: true, message: 'Solicitud de comunidad rechazada' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. AJUSTES DE COMUNIDAD (Líder / Admin)
export const updateCommunitySettings = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId, name, description, genres, icon, iconType, banner, bannerType } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);

    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    const isLeader = comm.leaderId === user.id || comm.createdBy === user.username;
    const isAdmin = isUserAdmin(user);

    if (!isLeader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Solo el Líder de la comunidad o un Administrador puede modificar sus ajustes.' });
    }

    if (name && name.trim()) comm.name = name.trim().slice(0, 50);
    if (description !== undefined) comm.description = description.trim().slice(0, 250);
    if (Array.isArray(genres)) comm.genres = genres.slice(0, 2);
    if (icon) comm.icon = icon;
    if (iconType) comm.iconType = iconType;
    if (banner) comm.banner = banner;
    if (bannerType) comm.bannerType = bannerType;

    saveCommunities(communities);
    return res.json({ success: true, message: 'Ajustes guardados correctamente', community: comm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. GESTIÓN DE ROLES ESTILO DISCORD (Crear, Editar, Borrar, Reordenar)
export const updateCommunityRoles = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId, roles, action, roleData, roleId } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);

    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    const isLeader = comm.leaderId === user.id || comm.createdBy === user.username;
    const isAdmin = isUserAdmin(user);
    if (!isLeader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permisos insuficientes para gestionar roles.' });
    }

    if (!Array.isArray(comm.roles) || comm.roles.length === 0) {
      comm.roles = [
        { id: 'role_leader', name: '👑 Líder', color: '#f59e0b', isProtected: true, position: 1, permissions: { admin: true, delete_messages: true, kick_members: true, manage_roles: true, pin_messages: true, edit_community: true, send_media: true } },
        { id: 'role_mod', name: '🛡️ Moderador', color: '#3b82f6', isProtected: false, position: 2, permissions: { admin: false, delete_messages: true, kick_members: true, manage_roles: false, pin_messages: true, edit_community: false, send_media: true } },
        { id: 'role_vip', name: '💎 Miembro VIP', color: '#8b5cf6', isProtected: false, position: 3, permissions: { admin: false, delete_messages: false, kick_members: false, manage_roles: false, pin_messages: false, edit_community: false, send_media: true } },
        { id: 'role_member', name: '👥 Miembros', color: '#9ca3af', isProtected: true, position: 4, permissions: { admin: false, delete_messages: false, kick_members: false, manage_roles: false, pin_messages: false, edit_community: false, send_media: true } }
      ];
    }

    if (Array.isArray(roles)) {
      comm.roles = roles;
    } else if (action === 'create' && roleData) {
      const newRoleId = 'role_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex');
      const newRole = {
        id: newRoleId,
        name: roleData.name || 'Nuevo Rol',
        color: roleData.color || '#3b82f6',
        isProtected: false,
        position: (comm.roles.length + 1),
        permissions: roleData.permissions || { send_media: true }
      };
      comm.roles.push(newRole);
    } else if (action === 'edit' && roleId && roleData) {
      const r = comm.roles.find(x => x.id === roleId);
      if (r) {
        if (roleData.name) r.name = roleData.name.trim();
        if (roleData.color) r.color = roleData.color;
        if (roleData.permissions) r.permissions = roleData.permissions;
      }
    } else if (action === 'delete' && roleId) {
      const r = comm.roles.find(x => x.id === roleId);
      if (r && r.isProtected) {
        return res.status(400).json({ success: false, message: 'Los roles predeterminados no se pueden eliminar.' });
      }
      comm.roles = comm.roles.filter(x => x.id !== roleId);
      // Reasignar miembros que tenían este rol a @Miembros
      if (Array.isArray(comm.members)) {
        comm.members.forEach(m => {
          if (m.roleId === roleId) m.roleId = 'role_member';
        });
      }
    }

    saveCommunities(communities);
    return res.json({ success: true, roles: comm.roles, community: comm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7. ASIGNAR ROL A MIEMBRO
export const assignMemberRole = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId, targetUserId, roleId } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);

    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    const isLeader = comm.leaderId === user.id || comm.createdBy === user.username;
    const isAdmin = isUserAdmin(user);
    if (!isLeader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Solo el Líder o un Administrador puede asignar roles.' });
    }

    if (!Array.isArray(comm.members)) comm.members = [];
    const member = comm.members.find(m => (typeof m === 'string' ? m === targetUserId : m.userId === targetUserId));
    if (!member) return res.status(404).json({ success: false, message: 'Miembro no encontrado en la comunidad.' });

    if (typeof member === 'string') {
      const idx = comm.members.indexOf(member);
      comm.members[idx] = { userId: member, roleId: roleId || 'role_member' };
    } else {
      member.roleId = roleId || 'role_member';
    }

    saveCommunities(communities);
    return res.json({ success: true, member, roles: comm.roles, community: comm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. EXPULSAR MIEMBRO (Kick)
export const kickMember = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId, targetUserId } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);

    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    const isLeader = comm.leaderId === user.id || comm.createdBy === user.username;
    const isAdmin = isUserAdmin(user);
    if (!isLeader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permisos insuficientes para expulsar miembros.' });
    }

    if (targetUserId === comm.leaderId && !isAdmin) {
      return res.status(400).json({ success: false, message: 'No se puede expulsar al Líder de la comunidad.' });
    }

    comm.members = (comm.members || []).filter(m => m.userId !== targetUserId);
    comm.membersCount = Math.max(1, comm.members.length);
    saveCommunities(communities);

    return res.json({ success: true, message: 'Miembro expulsado correctamente' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 9. BORRAR COMUNIDAD (Solo Líder o Admin Global)
export const deleteCommunity = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId } = req.body;
    const communities = loadCommunities();
    const commIdx = communities.findIndex(c => c.id === communityId);

    if (commIdx === -1) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    const comm = communities[commIdx];
    const isLeader = comm.leaderId === user.id || comm.createdBy === user.username;
    const isAdmin = isUserAdmin(user);

    if (!isLeader && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Solo el Líder o el Administrador puede borrar la comunidad.' });
    }

    communities.splice(commIdx, 1);
    saveCommunities(communities);

    return res.json({ success: true, message: 'Comunidad eliminada exitosamente' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 10. UNIRSE O SALIR DE UNA COMUNIDAD
export const toggleJoinCommunity = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { communityId } = req.body;
    const communities = loadCommunities();
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return res.status(404).json({ success: false, message: 'Comunidad no encontrada' });

    if (!Array.isArray(comm.members)) comm.members = [];

    const existingIdx = comm.members.findIndex(m => 
      typeof m === 'string' 
        ? (m === user.id || (user.username && m.toLowerCase() === user.username.toLowerCase()))
        : (m.userId === user.id || (m.username && user.username && m.username.toLowerCase() === user.username.toLowerCase()))
    );
    const isMember = existingIdx !== -1;

    if (isMember) {
      comm.members.splice(existingIdx, 1);
      comm.membersCount = Math.max(1, comm.members.length);
    } else {
      comm.members.push({
        userId: user.id,
        username: user.username,
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
        roleId: 'role_member',
        joinedAt: new Date().toISOString()
      });
      comm.membersCount = comm.members.length;
    }

    saveCommunities(communities);
    return res.json({ success: true, isMember: !isMember, membersCount: comm.membersCount, community: comm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 11. AMIGOS Y DMs
export const toggleFriend = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === user.id) {
      return res.status(400).json({ success: false, message: 'Usuario destino inválido' });
    }

    const friends = loadFriends();
    if (!friends[user.id]) friends[user.id] = [];
    if (!friends[targetUserId]) friends[targetUserId] = [];

    const isFriend = friends[user.id].includes(targetUserId);
    if (isFriend) {
      friends[user.id] = friends[user.id].filter(id => id !== targetUserId);
      friends[targetUserId] = friends[targetUserId].filter(id => id !== user.id);
    } else {
      friends[user.id].push(targetUserId);
      friends[targetUserId].push(user.id);
    }

    saveFriends(friends);
    return res.json({ success: true, isFriend: !isFriend });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { targetUserId } = req.body;
    const requests = loadFriendRequests();

    const existing = requests.find(r => 
      (r.fromUserId === user.id && r.toUserId === targetUserId) ||
      (r.fromUserId === targetUserId && r.toUserId === user.id)
    );

    if (existing) {
      return res.json({ success: true, message: 'Solicitud ya enviada o pendiente', request: existing });
    }

    const newReq = {
      id: 'req_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
      fromUserId: user.id,
      fromUsername: user.username,
      fromAvatar: user.avatar,
      toUserId: targetUserId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    requests.push(newReq);
    saveFriendRequests(requests);

    return res.json({ success: true, request: newReq });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const respondFriendRequest = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { requestId, action } = req.body; // 'accept' | 'reject'
    const requests = loadFriendRequests();
    const reqIdx = requests.findIndex(r => r.id === requestId);

    if (reqIdx === -1) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    const friendReq = requests[reqIdx];
    if (action === 'accept') {
      const friends = loadFriends();
      if (!friends[friendReq.fromUserId]) friends[friendReq.fromUserId] = [];
      if (!friends[friendReq.toUserId]) friends[friendReq.toUserId] = [];

      if (!friends[friendReq.fromUserId].includes(friendReq.toUserId)) friends[friendReq.fromUserId].push(friendReq.toUserId);
      if (!friends[friendReq.toUserId].includes(friendReq.fromUserId)) friends[friendReq.toUserId].push(friendReq.fromUserId);

      saveFriends(friends);
      requests.splice(reqIdx, 1);
      saveFriendRequests(requests);

      return res.json({ success: true, message: 'Solicitud aceptada' });
    } else {
      requests.splice(reqIdx, 1);
      saveFriendRequests(requests);
      return res.json({ success: true, message: 'Solicitud rechazada' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateReadingActivity = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { mangaTitle, chapterTitle, cover, url } = req.body;
    const activities = loadReadingActivities();

    activities[user.id] = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      mangaTitle: mangaTitle || '',
      chapterTitle: chapterTitle || '',
      cover: cover || '',
      url: url || '',
      updatedAt: Date.now()
    };

    saveReadingActivities(activities);
    return res.json({ success: true, activity: activities[user.id] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getFriendsAndDMs = async (req, res) => {
  try {
    const users = loadUsers();
    const user = getAuthenticatedUser(req, users);
    if (!user) return res.status(401).json({ success: false, message: 'No autenticado' });

    const friendsMap = loadFriends();
    const friendIds = friendsMap[user.id] || [];
    const activities = loadReadingActivities();
    const allRequests = loadFriendRequests();
    const allChats = loadChats();

    const pendingRequests = allRequests.filter(r => r.toUserId === user.id && r.status === 'pending');
    const sentRequests = allRequests.filter(r => r.fromUserId === user.id && r.status === 'pending');

    const friendsList = friendIds.map(fid => {
      const fUser = users.find(u => u.id === fid || u.username === fid);
      const act = activities[fid] || (fUser ? activities[fUser.id] : null);
      return {
        id: fid,
        username: fUser?.username || fid,
        avatar: fUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fUser?.username || fid)}`,
        badge: fUser?.badge || fUser?.rank || '🌱 Lector Novato',
        activity: act && (Date.now() - act.updatedAt < 600000) ? act : null
      };
    });

    // Construir lista de conversaciones activas y amigos
    const conversationMap = new Map();

    // 1. Añadir amigos primero para que aparezcan inmediatamente en la lista de conversaciones
    friendsList.forEach(fr => {
      const dmId = `dm:${[user.id, fr.id].sort().join('_')}`;
      const dmIdByUsername = `dm:${[user.username, fr.username].sort().join('_')}`;
      const roomMsgs = allChats[dmId] || allChats[dmIdByUsername] || [];
      const lastMsg = roomMsgs.length > 0 ? roomMsgs[roomMsgs.length - 1] : null;
      conversationMap.set(fr.id, {
        roomId: dmId,
        user: {
          id: fr.id,
          username: fr.username,
          avatar: fr.avatar,
          badge: fr.badge,
          activity: fr.activity
        },
        lastMessage: lastMsg,
        isFriend: true
      });
    });

    // 2. Buscar cualquier otro DM en allChats donde participe user.id o user.username
    Object.keys(allChats).forEach(roomId => {
      if (roomId.startsWith('dm:')) {
        const parts = roomId.replace('dm:', '').split('_');
        if (parts.includes(user.id) || (user.username && parts.includes(user.username))) {
          const otherKey = parts.find(p => p !== user.id && p !== user.username);
          if (otherKey && !conversationMap.has(otherKey)) {
            const otherUser = users.find(u => u.id === otherKey || u.username === otherKey);
            const otherId = otherUser?.id || otherKey;
            if (!conversationMap.has(otherId)) {
              const roomMsgs = allChats[roomId] || [];
              const lastMsg = roomMsgs.length > 0 ? roomMsgs[roomMsgs.length - 1] : null;
              conversationMap.set(otherId, {
                roomId,
                user: {
                  id: otherId,
                  username: otherUser?.username || otherKey,
                  avatar: otherUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherUser?.username || otherKey)}`,
                  badge: otherUser?.badge || otherUser?.rank || '🌱 Lector Novato',
                  activity: activities[otherId] || null
                },
                lastMessage: lastMsg,
                isFriend: friendIds.includes(otherId)
              });
            }
          }
        }
      }
    });

    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt || a.lastMessage.timestamp || 0).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt || b.lastMessage.timestamp || 0).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (a.user?.username || '').localeCompare(b.user?.username || '');
    });

    const activeReadingFriends = Object.values(activities)
      .filter(a => a.userId !== user.id && (Date.now() - a.updatedAt < 600000))
      .map(a => ({ user: { id: a.userId, username: a.username, avatar: a.avatar }, activity: a }));

    return res.json({
      success: true,
      friends: friendsList,
      pendingRequests: {
        incoming: pendingRequests,
        outgoing: sentRequests
      },
      sentRequests,
      messageRequests: [],
      activeReadingFriends,
      conversations
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
