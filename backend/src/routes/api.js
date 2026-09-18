import { Router } from 'express';
import { 
  getInstalledExtensions,
  getRepoExtensions,
  resolveRepoUrl,
  installExtension,
  uninstallExtension,
  getCatalog, 
  searchManga, 
  getMangaDetails, 
  extractChapter,
  getHomeFeed,
  getRecommendations,
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
  syncUserData,
  verifyPassword,
  changePassword
} from '../controllers/authController.js';
import { 
  getRoomMessages, 
  postMessage, 
  toggleLikeMessage,
  deleteMessage,
  reportMessage
} from '../controllers/chatController.js';
import {
  getCommunities,
  createCommunity,
  getPendingCommunities,
  reviewCommunityRequest,
  updateCommunitySettings,
  updateCommunityRoles,
  assignMemberRole,
  kickMember,
  deleteCommunity,
  toggleJoinCommunity,
  toggleFriend,
  sendFriendRequest,
  respondFriendRequest,
  updateReadingActivity,
  getFriendsAndDMs
} from '../controllers/socialController.js';
import {
  trackReadEvent,
  getPopularAnalytics
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Yomori Reader Engine'
  });
});

// Endpoints de Repositorio Central de Extensiones (Manga & Anime)
router.get('/repo/index.json', getRepoExtensions);
router.get('/repo/extensions', getRepoExtensions);
router.get('/repo/resolve', resolveRepoUrl);

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

// Feed de inicio en vivo, Recomendaciones y Analíticas de Lectura de la Comunidad
router.get('/home-feed', getHomeFeed);
router.get('/recommendations', getRecommendations);
router.post('/analytics/track-read', trackReadEvent);
router.get('/analytics/popular', getPopularAnalytics);

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
router.post('/auth/verify-password', verifyPassword);
router.post('/auth/change-password', changePassword);
router.get('/users/:userId', getPublicProfile);

// Chat en vivo y salas de comentarios persistentes
router.get('/chat/history/:roomId', getRoomMessages);
router.get('/chat/history', getRoomMessages);
router.get('/chat/messages/:roomId', getRoomMessages);
router.get('/chat/messages', getRoomMessages);
router.post('/chat/send', postMessage);
router.post('/chat/like/:messageId', toggleLikeMessage);
router.post('/chat/like', toggleLikeMessage);
router.delete('/chat/message/:messageId', deleteMessage);
router.post('/chat/delete', deleteMessage);
router.post('/chat/report/:messageId', reportMessage);
router.post('/chat/report', reportMessage);

// Comunidades, Roles Estilo Discord, Moderación y Amigos
router.get('/social/communities', getCommunities);
router.post('/social/communities', createCommunity);
router.get('/social/communities/pending', getPendingCommunities);
router.post('/social/communities/review', reviewCommunityRequest);
router.put('/social/communities/settings', updateCommunitySettings);
router.post('/social/communities/roles', updateCommunityRoles);
router.post('/social/communities/assign-role', assignMemberRole);
router.post('/social/communities/kick', kickMember);
router.delete('/social/communities/:communityId', deleteCommunity);
router.post('/social/communities/delete', deleteCommunity);
router.post('/social/communities/join', toggleJoinCommunity);

router.post('/social/friends/toggle', toggleFriend);
router.post('/social/friends/request', sendFriendRequest);
router.post('/social/friends/respond', respondFriendRequest);
router.post('/social/activity', updateReadingActivity);
router.get('/social/friends-and-dms', getFriendsAndDMs);

export default router;
