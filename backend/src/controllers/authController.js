import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const usersFile = path.join(dataDir, 'users.json');

// Asegurar existencia del directorio de datos
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Validador estricto de correo electrónico estándar RFC 5322
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length > 254 || clean.length < 5) return false;
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (local.length > 64 || local.length === 0) return false;
  if (!domain.includes('.')) return false;
  const domainParts = domain.split('.');
  if (domainParts.some(p => p.length === 0)) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  return EMAIL_REGEX.test(clean);
}

export function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    }
  } catch (e) {
    console.error('[Auth Error] Fallo al leer users.json:', e.message);
  }
  return [];
}

// Guardado seguro y atómico para evitar corrupción de datos
export function saveUsers(users) {
  try {
    const tempFile = `${usersFile}.tmp_${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf8');
    fs.renameSync(tempFile, usersFile);
  } catch (e) {
    console.error('[Auth Error] Fallo al guardar users.json:', e.message);
  }
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateToken(userId) {
  return crypto.randomBytes(32).toString('hex');
}

// Helper para calcular estadísticas de lectura
export function calculateUserStats(user) {
  const library = Array.isArray(user.library) ? user.library : [];
  const history = Array.isArray(user.history) ? user.history : [];
  const chapterProgress = (user.chapterProgress && typeof user.chapterProgress === 'object') ? user.chapterProgress : {};

  // Total de capítulos leídos basados en historial + capítulos con progreso completo
  const uniqueReadChapters = new Set();
  history.forEach(h => {
    if (h.chapterUrl) uniqueReadChapters.add(h.chapterUrl);
    else if (h.chapterTitle) uniqueReadChapters.add(`${h.mangaTitle || ''}_${h.chapterTitle}`);
  });
  Object.keys(chapterProgress).forEach(url => uniqueReadChapters.add(url));

  const totalChaptersRead = Math.max(uniqueReadChapters.size, user.stats?.totalChaptersRead || 0);
  
  // Tiempo de lectura estimado: ~5.5 minutos por capítulo leído
  const estimatedReadingMinutes = totalChaptersRead * 5.5;
  const readingHours = Math.floor(estimatedReadingMinutes / 60);
  const readingMinutes = Math.round(estimatedReadingMinutes % 60);

  // Rango / Nivel de Lector según capítulos leídos
  let level = 1;
  let levelTitle = 'Lector Principiante';
  if (totalChaptersRead >= 500) {
    level = 50;
    levelTitle = 'Soberano de las Sombras 👑';
  } else if (totalChaptersRead >= 200) {
    level = 30;
    levelTitle = 'Cazador Rango S ⚔️';
  } else if (totalChaptersRead >= 100) {
    level = 20;
    levelTitle = 'Lector Élite ⚡';
  } else if (totalChaptersRead >= 50) {
    level = 10;
    levelTitle = 'Devorador de Manhwas 🔥';
  } else if (totalChaptersRead >= 20) {
    level = 5;
    levelTitle = 'Lector Aventurero 📖';
  } else if (totalChaptersRead >= 5) {
    level = 2;
    levelTitle = 'Lector Constante ✨';
  }

  return {
    totalMangas: library.length,
    totalChaptersRead,
    readingHours,
    readingMinutes,
    readingTimeFormatted: `${readingHours}h ${readingMinutes}m`,
    level,
    levelTitle,
    streakDays: Math.min(30, Math.max(1, Math.floor(totalChaptersRead / 3) + 1))
  };
}

// 1. REGISTRO DE NUEVA CUENTA
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Por favor ingresa un nombre de usuario.' });
    }

    if (username.trim().length < 3 || username.trim().length > 30) {
      return res.status(400).json({ success: false, message: 'El nombre de usuario debe tener entre 3 y 30 caracteres.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El formato de correo no es válido. Asegúrate de incluir el usuario, "@" y un dominio válido (ej: usuario@gmail.com).' 
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const users = loadUsers();
    
    // Validar duplicados
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Este correo electrónico ya se encuentra registrado con otra cuenta.' });
    }

    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Este nombre de usuario ya está en uso. Por favor elige otro apodo.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const token = generateToken(userId);

    const newUser = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      banner: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      bio: 'Leyendo en Yomori 📖✨',
      badge: 'Lector Principiante',
      isLibraryPublic: true,
      role: 'user',
      salt,
      password: hashedPassword,
      token,
      library: [],
      history: [],
      chapterProgress: {},
      settings: {},
      stats: {
        totalChaptersRead: 0,
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const userStats = calculateUserStats(newUser);

    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      banner: newUser.banner,
      bio: newUser.bio,
      badge: newUser.badge,
      isLibraryPublic: newUser.isLibraryPublic,
      role: newUser.role,
      token: newUser.token,
      library: newUser.library,
      history: newUser.history,
      chapterProgress: newUser.chapterProgress,
      settings: newUser.settings,
      stats: userStats,
      createdAt: newUser.createdAt
    };

    return res.json({
      success: true,
      message: '¡Cuenta creada y registrada con éxito en Yomori!',
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor al registrar usuario.' });
  }
};

// 2. INICIO DE SESIÓN
export const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: 'Por favor ingresa tu usuario/correo y contraseña.' });
    }

    const cleanQuery = emailOrUsername.trim().toLowerCase();
    const users = loadUsers();

    const user = users.find(u => 
      u.email.toLowerCase() === cleanQuery || 
      u.username.toLowerCase() === cleanQuery
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'No existe ninguna cuenta asociada a este usuario o correo.' });
    }

    const checkHash = hashPassword(password, user.salt);
    if (checkHash !== user.password) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta. Por favor verifica tus credenciales.' });
    }

    // Renovar token de sesión
    user.token = generateToken(user.id);
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    
    // Asignar campos por defecto si faltan
    if (!user.banner) user.banner = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
    if (!user.bio) user.bio = 'Leyendo en Yomori 📖✨';
    if (user.isLibraryPublic === undefined) user.isLibraryPublic = true;

    saveUsers(users);

    const userStats = calculateUserStats(user);

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      badge: user.badge || userStats.levelTitle,
      isLibraryPublic: user.isLibraryPublic,
      shareReadingActivity: user.shareReadingActivity !== false,
      role: user.role || 'user',
      token: user.token,
      library: user.library || [],
      history: user.history || [],
      chapterProgress: user.chapterProgress || {},
      settings: user.settings || {},
      stats: userStats,
      createdAt: user.createdAt
    };

    return res.json({
      success: true,
      message: `¡Bienvenido de nuevo, ${user.username}!`,
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Error interno al procesar el inicio de sesión.' });
  }
};

// 3. ACTUALIZAR PERFIL DE USUARIO ("Mi Perfil")
export const updateProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Sesión no válida o expirada' });
    }

    const { username, avatar, banner, bio, badge, isLibraryPublic, shareReadingActivity } = req.body;

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, message: 'El nombre de usuario debe tener entre 3 y 30 caracteres.' });
      }
      // Verificar si otro usuario ya tiene ese nombre
      const exists = users.find(u => u.id !== user.id && u.username.toLowerCase() === cleanUsername.toLowerCase());
      if (exists) {
        return res.status(400).json({ success: false, message: 'Este nombre de usuario ya está en uso por otra persona.' });
      }
      user.username = cleanUsername;
    }

    if (avatar && typeof avatar === 'string') {
      user.avatar = avatar.trim();
    }

    if (banner && typeof banner === 'string') {
      user.banner = banner.trim();
    }

    if (typeof bio === 'string') {
      user.bio = bio.trim().slice(0, 150);
    }

    if (typeof badge === 'string') {
      user.badge = badge.trim().slice(0, 40);
    }

    if (typeof isLibraryPublic === 'boolean') {
      user.isLibraryPublic = isLibraryPublic;
    }

    if (typeof shareReadingActivity === 'boolean') {
      user.shareReadingActivity = shareReadingActivity;
    }

    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    const userStats = calculateUserStats(user);

    const updatedSafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      badge: user.badge || userStats.levelTitle,
      isLibraryPublic: user.isLibraryPublic,
      shareReadingActivity: user.shareReadingActivity !== false,
      role: user.role || 'user',
      token: user.token,
      library: user.library || [],
      history: user.history || [],
      chapterProgress: user.chapterProgress || {},
      settings: user.settings || {},
      stats: userStats,
      createdAt: user.createdAt
    };

    return res.json({
      success: true,
      message: '¡Perfil actualizado correctamente!',
      user: updatedSafeUser
    });
  } catch (err) {
    console.error('[Auth Update Profile Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. OBTENER PERFIL PÚBLICO (Para la tarjeta flotante Discord de cualquier usuario)
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Falta userId' });

    const users = loadUsers();
    const user = users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const userStats = calculateUserStats(user);
    const isLibraryPublic = user.isLibraryPublic !== false;

    const publicProfile = {
      id: user.id,
      username: user.username,
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
      banner: user.banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      bio: user.bio || 'Leyendo en Yomori 📖✨',
      badge: user.badge || userStats.levelTitle,
      role: user.role || 'user',
      isLibraryPublic,
      library: isLibraryPublic ? (user.library || []) : [],
      stats: userStats,
      createdAt: user.createdAt
    };

    return res.json({
      success: true,
      profile: publicProfile
    });
  } catch (err) {
    console.error('[Get Public Profile Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. SINCRONIZACIÓN DE DATOS DE LA CUENTA (Biblioteca, Historial, Progreso)
export const syncUserData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Sesión no válida o expirada' });
    }

    const { library, history, chapterProgress, settings } = req.body;

    if (Array.isArray(library)) user.library = library;
    if (Array.isArray(history)) user.history = history;
    if (chapterProgress && typeof chapterProgress === 'object') user.chapterProgress = chapterProgress;
    if (settings && typeof settings === 'object') user.settings = settings;

    user.updatedAt = new Date().toISOString();
    saveUsers(users);

    return res.json({
      success: true,
      message: 'Datos de la cuenta sincronizados correctamente en la nube.',
      data: {
        libraryCount: user.library?.length || 0,
        historyCount: user.history?.length || 0,
        lastSynced: user.updatedAt
      }
    });
  } catch (err) {
    console.error('[Auth Sync Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. RECUPERAR DATOS DE LA CUENTA
export const getProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No autenticado' });

    const token = authHeader.replace('Bearer ', '').trim();
    const users = loadUsers();
    const user = users.find(u => u.token === token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Sesión no válida o expirada' });
    }

    const userStats = calculateUserStats(user);

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        banner: user.banner || 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        bio: user.bio || 'Leyendo en Yomori 📖✨',
        badge: user.badge || userStats.levelTitle,
        isLibraryPublic: user.isLibraryPublic !== false,
        shareReadingActivity: user.shareReadingActivity !== false,
        role: user.role || 'user',
        library: user.library || [],
        history: user.history || [],
        chapterProgress: user.chapterProgress || {},
        settings: user.settings || {},
        stats: userStats,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
