import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  X, 
  Send, 
  Heart, 
  Sparkles, 
  User, 
  Clock, 
  Smile, 
  ChevronLeft,
  Flame,
  ThumbsUp,
  Bookmark,
  Users,
  LogIn,
  Loader2
} from 'lucide-react';
import { getSocket } from '../services/socket.js';

export default function ChapterCommentsDrawer({
  chapterUrl,
  chapterTitle = 'Capítulo',
  mangaTitle = 'Manga',
  currentPage = 1,
  currentUser = null,
  onOpenAuth,
  onOpenUserCard
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  const [includePageTag, setIncludePageTag] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeReaders, setActiveReaders] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const commentsEndRef = useRef(null);

  const roomId = chapterUrl ? `chapter:${btoa(encodeURIComponent(chapterUrl)).slice(0, 32)}` : 'chapter:default';

  // 1. Cargar historial persistente desde el backend
  useEffect(() => {
    if (!chapterUrl) return;
    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}&limit=100`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setComments(res.data.messages || []);
        }
      })
      .catch(err => {
        console.warn('[ChapterChat] Error cargando mensajes:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chapterUrl, roomId]);

  // 2. Conexión Socket.IO a la sala del capítulo
  useEffect(() => {
    if (!chapterUrl) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_room', roomId);

    const handleNewMessage = (newMsg) => {
      if (newMsg.roomId === roomId) {
        setComments(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      }
    };

    const handleMessageUpdated = (updated) => {
      if (updated.roomId === roomId) {
        setComments(prev => prev.map(m => {
          if (m.id === updated.messageId) {
            return {
              ...m,
              likes: updated.likes,
              likedBy: updated.likedBy
            };
          }
          return m;
        }));
      }
    };

    const handleRoomUsers = (data) => {
      if (data.roomId === roomId) {
        setActiveReaders(Math.max(1, data.activeCount || 1));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('room_users_count', handleRoomUsers);

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('room_users_count', handleRoomUsers);
    };
  }, [chapterUrl, roomId]);

  const handleSendComment = (e) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);
    const socket = getSocket();

    const payload = {
      roomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: cleanText,
      page: includePageTag ? currentPage : null,
      mangaTitle,
      chapterTitle
    };

    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        setIsSending(false);
        if (res?.success) {
          setInputText('');
          setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      });
    } else {
      axios.post('/api/chat/send', payload, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        setIsSending(false);
        if (res.data?.success) {
          setInputText('');
          setComments(prev => [...prev, res.data.message]);
          setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      }).catch(() => {
        setIsSending(false);
      });
    }
  };

  const handleToggleLike = (commentId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('like_message', {
        roomId,
        messageId: commentId,
        token: currentUser.token
      });
    } else {
      axios.post('/api/chat/like', { roomId, messageId: commentId }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data?.success) {
          setComments(prev => prev.map(m => m.id === commentId ? { ...m, likes: res.data.likes } : m));
        }
      });
    }
  };

  const handleQuickReaction = (emojiText) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    setInputText(prev => prev ? `${prev} ${emojiText}` : emojiText);
  };

  return (
    <>
      {/* 1. BOTÓN FLOTANTE EN EL LADO IZQUIERDO DEL LECTOR */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-2xl border transition-all duration-300 shadow-2xl flex flex-col items-center gap-1 group active:scale-95 cursor-pointer ${
          isOpen
            ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/40 translate-x-80 sm:translate-x-96'
            : 'bg-[#0f121d]/90 hover:bg-[#161a29] border-gray-800 text-gray-300 hover:text-white shadow-black/80 hover:border-purple-600/60 backdrop-blur-xl'
        }`}
        title={isOpen ? 'Cerrar panel de comentarios' : `${activeReaders} personas leyendo en vivo`}
      >
        <MessageSquare className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'group-hover:scale-110 text-purple-400'}`} />
        <span className="text-[10px] font-bold font-mono tracking-tight">
          {comments.length}
        </span>
        <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-mono font-semibold">
          <Users className="w-2.5 h-2.5" />
          <span>{activeReaders}</span>
        </span>
      </button>

      {/* 2. PANEL LATERAL FLOTANTE DE COMENTARIOS EN VIVO */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 left-0 bottom-0 z-40 w-80 sm:w-96 bg-[#0c0f18]/95 backdrop-blur-2xl border-r border-gray-800/90 shadow-2xl shadow-black/90 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Cabecera del Panel */}
        <div className="p-4 border-b border-gray-800/80 flex items-center justify-between bg-[#101420]/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-800/60 text-purple-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  Comentarios en Vivo
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-bold text-emerald-400 font-mono shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                  <span className="text-emerald-600/80">•</span>
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>{activeReaders} {activeReaders === 1 ? 'leyendo' : 'leyendo'}</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {chapterTitle} • {comments.length} comentarios
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition active:scale-90 shrink-0 ml-2 cursor-pointer"
            title="Cerrar panel de comentarios"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Reacciones Rápidas */}
        <div className="px-3 py-2 bg-[#090b12] border-b border-gray-800/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {['🔥 Épico', '😱 Qué giro', '❤️ Me encantó', '😂 Jaja', '👏 10/10', '✨ Obra Maestra'].map((rx) => (
            <button
              key={rx}
              onClick={() => handleQuickReaction(rx)}
              className="px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-purple-950/80 hover:text-purple-300 border border-gray-800/80 text-[11px] font-medium text-gray-300 whitespace-nowrap transition active:scale-95 cursor-pointer"
            >
              {rx}
            </button>
          ))}
        </div>

        {/* Lista de Comentarios con Scroll */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
          {loadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span>Cargando comentarios...</span>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => {
              const isLiked = currentUser && Array.isArray(comment.likedBy) && comment.likedBy.includes(currentUser.id);
              const isMe = currentUser && comment.userId === currentUser.id;

              return (
                <div
                  key={comment.id}
                  className={`p-3 rounded-2xl border transition flex flex-col gap-2 group shadow-sm ${
                    isMe ? 'bg-[#16182a] border-purple-800/40' : 'bg-[#121622] border-gray-800/70 hover:border-gray-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    
                    {/* Click en usuario abre su tarjeta flotante Discord */}
                    <div 
                      onClick={() => {
                        if (onOpenUserCard) {
                          onOpenUserCard(comment.userId, comment.username, comment.userAvatar);
                        }
                      }}
                      className="flex items-center gap-2 min-w-0 cursor-pointer group/u"
                      title="Ver perfil de usuario"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-950 border border-purple-700/50 flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm group-hover/u:scale-105 transition">
                        <img 
                          src={comment.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.username)}`} 
                          alt={comment.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-200 group-hover/u:text-purple-300 transition truncate">
                        {comment.username}
                      </span>
                      {comment.page && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-300 border border-purple-800/50">
                          Pág. {comment.page}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </span>
                  </div>

                  {/* Texto del comentario */}
                  <p className="text-xs text-gray-300 leading-relaxed break-words select-text">
                    {comment.text}
                  </p>

                  {/* Botón de Like */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-800/40">
                    <button
                      onClick={() => handleToggleLike(comment.id)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
                        isLiked ? 'text-rose-400 font-bold' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500 animate-bounce' : ''}`} />
                      <span>{comment.likes || 0}</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs">
              No hay comentarios aún en este capítulo. ¡Sé el primero en comentar!
            </div>
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input para Escribir Comentario */}
        {currentUser ? (
          <form onSubmit={handleSendComment} className="p-3 border-t border-gray-800/90 bg-[#0e121c]">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePageTag}
                  onChange={(e) => setIncludePageTag(e.target.checked)}
                  className="w-3 h-3 rounded accent-purple-600 bg-gray-800 border-gray-700"
                />
                <span>Etiquetar viñeta actual (Pág. {currentPage})</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un comentario en vivo..."
                maxLength={500}
                className="flex-1 bg-[#141824] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner select-text"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-md shadow-purple-600/30 transition active:scale-95 shrink-0 cursor-pointer"
                title="Publicar comentario en tiempo real"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 border-t border-gray-800/90 bg-[#0e121c] flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-400">
              Inicia sesión para comentar
            </span>
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Entrar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
