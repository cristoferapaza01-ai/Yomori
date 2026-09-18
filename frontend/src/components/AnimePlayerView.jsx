import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  SkipBack,
  SkipForward,
  Server,
  Maximize,
  Minimize,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  Tv,
  Eye,
  Download,
  Share2,
  Heart,
  Send,
  LogIn,
  ChevronRight,
  Flame,
  Clock,
  Layers
} from 'lucide-react';
import axios from 'axios';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';
import RichCommentEditor from './RichCommentEditor.jsx';

export default function AnimePlayerView({
  playerData,
  anime,
  episodes = [],
  currentEpisodeUrl,
  onSelectEpisode,
  onBack,
  currentUser,
  onOpenAuth,
  onOpenUserCard,
  readChaptersMap = {},
  onToggleChapterRead
}) {
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  // Comentarios en tiempo real integrados abajo del vídeo
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const containerRef = useRef(null);
  const videoWrapperRef = useRef(null);

  const servers = useMemo(() => {
    return playerData?.videos || [];
  }, [playerData]);

  const currentServer = servers[selectedServerIndex] || servers[0] || null;

  const currentAnimeTitle = anime?.title || playerData?.mangaTitle || 'Anime';
  const currentEpNum = playerData?.episodeNumber || (playerData?.chapterTitle?.match(/\d+/) ? playerData.chapterTitle.match(/\d+/)[0] : '1');
  const currentEpTitle = playerData?.chapterTitle || `Episodio ${currentEpNum}`;

  // Lista ordenada de episodios de menor a mayor (1, 2, 3...)
  const sortedEpisodes = useMemo(() => {
    const list = [...(episodes.length > 0 ? episodes : (playerData?.chapters || []))];
    return list.sort((a, b) => {
      const numA = parseFloat(a.chapterNumber || a.number || (a.name ? a.name.match(/\d+(\.\d+)?/)?.[0] : 0) || 0);
      const numB = parseFloat(b.chapterNumber || b.number || (b.name ? b.name.match(/\d+(\.\d+)?/)?.[0] : 0) || 0);
      return numA - numB;
    });
  }, [episodes, playerData]);

  const currentIndex = sortedEpisodes.findIndex(
    ep => ep.url === currentEpisodeUrl || ep.url === playerData?.currentUrl
  );

  const prevEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;

  // Marcar automáticamente como visto
  useEffect(() => {
    const epUrl = currentEpisodeUrl || playerData?.currentUrl;
    if (epUrl && onToggleChapterRead && !readChaptersMap[epUrl]) {
      const animeUrl = anime?.url || playerData?.mangaUrl;
      onToggleChapterRead(animeUrl, epUrl);
    }
  }, [currentEpisodeUrl, playerData?.currentUrl]);

  // Restablecer servidor a 0 cuando cambie el episodio
  useEffect(() => {
    setSelectedServerIndex(0);
    setIframeKey(prev => prev + 1);
  }, [currentEpisodeUrl, playerData?.currentUrl]);

  // Pantalla completa del marco de vídeo
  const toggleFullscreen = () => {
    const el = videoWrapperRef.current || containerRef.current;
    if (!document.fullscreenElement) {
      if (el?.requestFullscreen) {
        el.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Atajos de teclado (F: Fullscreen, N: Siguiente, P: Anterior)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.key === 'n' || e.key === 'N') && nextEpisode) {
        e.preventDefault();
        onSelectEpisode(nextEpisode.url);
      } else if ((e.key === 'p' || e.key === 'P') && prevEpisode) {
        e.preventDefault();
        onSelectEpisode(prevEpisode.url);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextEpisode, prevEpisode]);

  // Room ID para comentarios en tiempo real
  const roomId = useMemo(() => {
    const targetUrl = currentEpisodeUrl || playerData?.currentUrl;
    if (!targetUrl) return 'global_anime';
    try {
      const safeB64 = btoa(unescape(encodeURIComponent(targetUrl)));
      return 'chapter_' + safeB64.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 48);
    } catch {
      let hash = 0;
      for (let i = 0; i < targetUrl.length; i++) {
        hash = ((hash << 5) - hash) + targetUrl.charCodeAt(i);
        hash |= 0;
      }
      return 'chapter_' + Math.abs(hash).toString(36);
    }
  }, [currentEpisodeUrl, playerData?.currentUrl]);

  // Conexión Socket para comentarios en vivo
  useEffect(() => {
    if (!roomId) return;
    setLoadingComments(true);
    const socket = getSocket();

    socket.emit('join_room', roomId);

    axios.get(`/api/chats/${roomId}/messages`)
      .then(res => {
        if (res.data?.success) {
          setComments(res.data.data || []);
        }
      })
      .catch(err => console.warn('[AnimePlayerView] Error cargando comentarios:', err.message))
      .finally(() => setLoadingComments(false));

    const handleNewMessage = (msg) => {
      if (msg.roomId === roomId) {
        setComments(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleLikeUpdate = ({ messageId, likesCount, likedBy }) => {
      setComments(prev => prev.map(m => m.id === messageId ? { ...m, likesCount, likedBy } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_liked', handleLikeUpdate);

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('new_message', handleNewMessage);
      socket.off('message_liked', handleLikeUpdate);
    };
  }, [roomId]);

  const handleSendComment = async (textToSend) => {
    const text = (textToSend || commentText).trim();
    if (!text || isSendingComment) return;

    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    setIsSendingComment(true);
    try {
      const socket = getSocket();
      const payload = {
        roomId,
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        badge: currentUser.badge,
        rank: currentUser.rank,
        role: currentUser.role,
        text: text,
        pageTag: null,
        chapterTitle: currentEpTitle,
        mangaTitle: currentAnimeTitle
      };

      socket.emit('send_message', payload);
      setCommentText('');
    } catch (err) {
      console.error('Error enviando comentario:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleToggleLike = (messageId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    const socket = getSocket();
    socket.emit('like_message', { roomId, messageId, userId: currentUser.id });
  };

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return sortedEpisodes;
    const q = episodeSearch.toLowerCase().trim();
    return sortedEpisodes.filter(ep => {
      const name = (ep.name || ep.title || '').toLowerCase();
      const num = String(ep.chapterNumber || ep.number || '');
      return name.includes(q) || num.includes(q);
    });
  }, [sortedEpisodes, episodeSearch]);

  const genres = anime?.genres || ['Anime', 'Acción', 'Aventura'];
  const status = anime?.status || 'En emisión';

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col select-none"
    >
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-4 flex-1">
        
        {/* Disposición Principal en 2 Columnas (Estilo AnimeV1 / Streaming Moderno) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA (3 Columnas): REPRODUCTOR + DETALLES + COMENTARIOS */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* 1. MARCO PRINCIPAL DEL REPRODUCTOR DE VÍDEO (16:9 Aspect Ratio) */}
            <div 
              ref={videoWrapperRef}
              className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800/90 shadow-2xl shadow-black/80 group"
            >
              {isLoadingPlayer && (
                <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-gray-300">Cargando servidor...</p>
                </div>
              )}

              {currentServer?.url ? (
                <iframe
                  key={`${currentServer.url}-${iframeKey}`}
                  src={currentServer.url}
                  title={`${currentAnimeTitle} - ${currentEpTitle}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0a0d14] text-gray-400 gap-3">
                  <Tv className="w-12 h-12 text-gray-600 animate-pulse" />
                  <p className="text-sm font-semibold text-gray-300">
                    No se encontró un enlace directo de vídeo para este episodio.
                  </p>
                  <p className="text-xs text-gray-500 max-w-md">
                    Es posible que la fuente requiera seleccionar otro servidor de la lista inferior o que el episodio aún no esté disponible.
                  </p>
                </div>
              )}
            </div>

            {/* 2. BARRA DE CONTROLES INFERIORES: NAVEGACIÓN + SERVIDORES (ESTILO ANIMEAV1) */}
            <div className="bg-[#0e121d] border border-gray-800/80 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Botones Anterior / Siguiente */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={!prevEpisode}
                  onClick={() => prevEpisode && onSelectEpisode(prevEpisode.url)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    prevEpisode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white shadow-sm active:scale-95' 
                      : 'bg-gray-900/50 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  disabled={!nextEpisode}
                  onClick={() => nextEpisode && onSelectEpisode(nextEpisode.url)}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    nextEpisode 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black active:scale-95 shadow-cyan-900/30' 
                      : 'bg-gray-900/50 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span>Siguiente</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selector de Servidores de Vídeo (Pills con estilo AnimeAV1) */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0 flex-1 justify-start md:justify-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 shrink-0">
                  SUB
                </span>

                {servers.map((srv, idx) => {
                  const isSelected = selectedServerIndex === idx;
                  const serverName = srv.server || `Servidor ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsLoadingPlayer(true);
                        setSelectedServerIndex(idx);
                        setIframeKey(k => k + 1);
                        setTimeout(() => setIsLoadingPlayer(false), 300);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-gray-950 font-black shadow-md shadow-cyan-500/30 scale-105'
                          : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60'
                      }`}
                    >
                      {serverName}
                    </button>
                  );
                })}
              </div>

              {/* Botón de Pantalla Completa y Recarga */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setIsLoadingPlayer(true);
                    setIframeKey(k => k + 1);
                    setTimeout(() => setIsLoadingPlayer(false), 300);
                  }}
                  className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition cursor-pointer"
                  title="Recargar reproductor"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition cursor-pointer"
                  title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. DETALLES DEL ANIME Y METADATOS (TÍTULO CYAN, EPISODIO, GÉNEROS) */}
            <div className="bg-[#0d1017] border border-gray-800/80 rounded-2xl p-4 sm:p-6 space-y-3">
              <div 
                onClick={onBack}
                className="text-xs sm:text-sm font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1.5"
                title="Hacer clic para ver la ficha completa del anime"
              >
                <span>{currentAnimeTitle}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {currentEpTitle}
              </h1>

              {/* Badges de Metadatos */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span className="font-semibold text-gray-300">{anime?.type || 'TV Anime'}</span>
                <span>•</span>
                <span>2026</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-md bg-green-950/80 border border-green-800/50 text-green-400 text-[11px] font-semibold">
                  {status}
                </span>
              </div>

              {/* Géneros */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {genres.map((g, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700/60 text-gray-300 text-[11px] font-medium"
                  >
                    {typeof g === 'string' ? g : g.name}
                  </span>
                ))}
              </div>

              {/* Sinopsis */}
              {(anime?.synopsis || playerData?.synopsis) && (
                <div className="pt-2 text-xs text-gray-400 leading-relaxed border-t border-gray-800/60">
                  <p className={isSynopsisExpanded ? '' : 'line-clamp-2'}>
                    {anime?.synopsis || playerData?.synopsis}
                  </p>
                  {(anime?.synopsis || playerData?.synopsis).length > 140 && (
                    <button
                      onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold mt-1 cursor-pointer"
                    >
                      {isSynopsisExpanded ? 'Ver menos' : 'Leer más...'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. SECCIÓN DE COMENTARIOS Y CHAT EN VIVO DEBAJO DEL VÍDEO (ESTILO MODERNO) */}
            <div className="bg-[#0d1017] border border-gray-800/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Comentarios del Episodio</h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-xs font-bold">
                    {comments.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En vivo</span>
                </div>
              </div>

              {/* Editor de Comentarios */}
              <div className="bg-[#121622] rounded-xl p-3 border border-gray-800 flex flex-col gap-2">
                {currentUser ? (
                  <div className="flex gap-3 items-start">
                    <img
                      src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
                      alt={currentUser.username}
                      className="w-8 h-8 rounded-full border border-cyan-500/60 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                          }
                        }}
                        placeholder="Escribe tu comentario sobre este episodio... (soporta emojis y texto enriquecido)"
                        rows={2}
                        className="w-full bg-[#090c14] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none transition"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">
                          Presiona Enter para publicar
                        </span>
                        <button
                          disabled={!commentText.trim() || isSendingComment}
                          onClick={() => handleSendComment()}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            commentText.trim() && !isSendingComment
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black shadow-md'
                              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2 px-3 bg-[#0a0d14] rounded-lg">
                    <p className="text-xs text-gray-400">Inicia sesión para unirte a la conversación de este anime.</p>
                    <button
                      onClick={() => onOpenAuth && onOpenAuth('login')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Acceder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de Comentarios */}
              <div className="space-y-3 pt-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {loadingComments ? (
                  <div className="py-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                    <span>Cargando comentarios...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    Sé el primero en comentar sobre este episodio.
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isLiked = currentUser && comment.likedBy && comment.likedBy.includes(currentUser.id);
                    return (
                      <div 
                        key={comment.id}
                        className="p-3 rounded-xl bg-[#121622]/80 border border-gray-800/80 flex items-start gap-3 hover:border-gray-700/80 transition"
                      >
                        <img
                          src={comment.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.username}`}
                          alt={comment.username}
                          onClick={() => onOpenUserCard && onOpenUserCard(comment.userId, comment.username, comment.avatar)}
                          className="w-8 h-8 rounded-full border border-gray-700 shrink-0 cursor-pointer hover:scale-105 transition"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                onClick={() => onOpenUserCard && onOpenUserCard(comment.userId, comment.username, comment.avatar)}
                                className="text-xs font-bold text-white hover:text-cyan-300 transition cursor-pointer truncate"
                              >
                                @{comment.username}
                              </span>
                              {comment.badge && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 shrink-0">
                                  {comment.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-200 break-words leading-relaxed">
                            <FormattedMessage text={comment.text} />
                          </div>

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                            <button
                              onClick={() => handleToggleLike(comment.id)}
                              className={`flex items-center gap-1 transition cursor-pointer ${
                                isLiked ? 'text-red-400 font-bold' : 'hover:text-red-400'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                              <span>{comment.likesCount || (comment.likedBy ? comment.likedBy.length : 0)}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* COLUMNA DERECHA (1 Columna Sticky): LISTA DE EPISODIOS EN CUADRÍCULA */}
          {/* ========================================================= */}
          <div className="lg:col-span-1 sticky top-20">
            <div className="bg-[#0d1017] border border-gray-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
              
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estás viendo</p>
                <h3 className="text-sm font-black text-white flex items-center justify-between">
                  <span>{currentEpTitle}</span>
                  <span className="text-xs font-bold text-cyan-400 font-mono">
                    {currentIndex + 1} / {sortedEpisodes.length}
                  </span>
                </h3>
              </div>

              {/* Buscador de Episodios (si hay muchos) */}
              {sortedEpisodes.length > 12 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    placeholder="Buscar ep..."
                    className="w-full bg-[#121622] border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                  {episodeSearch && (
                    <button
                      onClick={() => setEpisodeSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Cuadrícula de Botones de Episodios (Estilo AnimeV1 / 1, 2, 3, 4...) */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[580px] overflow-y-auto custom-scrollbar p-1">
                {filteredEpisodes.map((ep) => {
                  const num = ep.chapterNumber || ep.number || (ep.name ? ep.name.match(/\d+(\.\d+)?/)?.[0] : '') || '1';
                  const isCurrent = ep.url === currentEpisodeUrl || ep.url === playerData?.currentUrl;
                  const isRead = !!readChaptersMap[ep.url];

                  return (
                    <button
                      key={ep.url || ep.id}
                      onClick={() => onSelectEpisode(ep.url)}
                      className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition relative cursor-pointer ${
                        isCurrent
                          ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-black font-black ring-2 ring-cyan-300 shadow-lg shadow-cyan-950/80 scale-105 z-10'
                          : isRead
                            ? 'bg-[#131826] text-gray-400 border border-gray-800/80 hover:bg-[#1a2133] hover:text-white hover:border-gray-600'
                            : 'bg-[#181e2e] text-gray-200 border border-gray-700/60 hover:bg-[#222b42] hover:text-white hover:border-cyan-500/50 hover:scale-102'
                      }`}
                      title={ep.name || `Episodio ${num}`}
                    >
                      <span>{num}</span>
                      {isRead && !isCurrent && (
                        <div className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botón Volver a la Lista Completa de Detalles */}
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Anime</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}