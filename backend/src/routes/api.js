import { Router } from 'express';
import { 
  getInstalledExtensions,
  installExtension,
  uninstallExtension,
  getCatalog, 
  searchManga, 
  getMangaDetails, 
  extractChapter,
  getHomeFeed,
  getCacheStats,
  clearCache
} from '../controllers/mangaController.js';
import { proxyImage } from '../controllers/proxyController.js';
import { 
  getDownloadQueue, 
  addChaptersToQueue, 
  getDownloadedStatus, 
  pauseQueue, 
  resumeQueue, 
  cancelDownload, 
  deleteDownloadedChapter, 
  serveLocalPage 
} from '../controllers/downloadController.js';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  getPublicProfile, 
  syncUserData 
} from '../controllers/authController.js';
import { 
  getRoomMessages, 
  postMessage, 
  toggleLikeMessage 
} from '../controllers/chatController.js';
import {
  getCommunities,
  createCommunity,
  toggleJoinCommunity,
  toggleFriend,
  getFriendsAndDMs
} from '../controllers/socialController.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Yomori Reader Engine'
  });
});

// Endpoints de gestión de extensiones descargadas en disco local
router.get('/extensions/installed', getInstalledExtensions);
router.post('/extensions/install', installExtension);
router.post('/extensions/uninstall', uninstallExtension);

// Endpoints de ejecución que corren sobre las extensiones instaladas dinámicamente
router.get('/catalog', getCatalog);
router.get('/search', searchManga);
router.get('/manga', getMangaDetails);
router.post('/extract', extractChapter);
router.get('/extract', extractChapter);

// Feed de inicio en vivo
router.get('/home-feed', getHomeFeed);

// Proxy de imágenes
router.get('/proxy-image', proxyImage);

// Sistema de Descargas y Almacenamiento Local Estilo Suwayomi
router.get('/downloads/queue', getDownloadQueue);
router.post('/downloads/queue', addChaptersToQueue);
router.get('/downloads/status', getDownloadedStatus);
router.post('/downloads/pause', pauseQueue);
router.post('/downloads/resume', resumeQueue);
router.post('/downloads/cancel', cancelDownload);
router.delete('/downloads/chapter', deleteDownloadedChapter);
router.get('/downloads/page', serveLocalPage);

// Control de caché
router.get('/cache/stats', getCacheStats);
router.post('/cache/clear', clearCache);

// Autenticación y Perfil de usuarios de Yomori
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', getProfile);
router.put('/auth/profile', updateProfile);
router.post('/auth/sync', syncUserData);
router.get('/users/:userId', getPublicProfile);

// Chat en vivo y salas de comentarios persistentes
router.get('/chat/messages', getRoomMessages);
router.post('/chat/send', postMessage);
router.post('/chat/like', toggleLikeMessage);

// Comunidades, Amigos y Mensajes Directos (DMs)
router.get('/social/communities', getCommunities);
router.post('/social/communities', createCommunity);
router.post('/social/communities/join', toggleJoinCommunity);
router.post('/social/friends/toggle', toggleFriend);
router.get('/social/friends-and-dms', getFriendsAndDMs);

export default router;
