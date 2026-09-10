import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Users, 
  Sparkles, 
  LogIn, 
  Smile, 
  Flame, 
  ShieldCheck, 
  Loader2, 
  User, 
  Bookmark,
  CheckCircle2
} from 'lucide-react';
import { getSocket } from '../services/socket.js';

const QUICK_EMOJIS = ['🔥', '❤️', '😱', '😂', '👏', '✨', '🗡️', '💯'];

export default function LiveChatRoom({
  roomId = 'global',
  title = 'Chat de la Comunidad',
  subtitle = 'Comenta en directo con otros lectores en tiempo real.',
  currentUser = null,
  onOpenAuth,
  onOpenUserCard,
  mangaTitle = null,
  chapterTitle = null,
  currentPage = null,
  showPageTag = false,
  compact = false
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [includePageTag, setIncludePageTag] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 1. Cargar historial persistente desde el backend
  useEffect(() => {
    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}&limit=100`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setMessages(res.data.messages || []);
        }
      })
      .catch(err => {
        console.warn(`[LiveChat] Error cargando historial de ${roomId}:`, err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // 2. Conexión WebSocket / Socket.IO a la sala
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Unirse a la sala
    socket.emit('join_room', roomId);

    // Escuchar mensajes nuevos en tiempo real
    const handleNewMessage = (newMsg) => {
      if (newMsg.roomId === roomId) {
        setMessages(prev => {
          // Evitar duplicados si ya existe por ID
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Scroll suave al último mensaje
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      }
    };

    // Escuchar actualizaciones de likes
    const handleMessageUpdated = (updated) => {
      if (updated.roomId === roomId) {
        setMessages(prev => prev.map(m => {
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

    // Escuchar conteo de lectores activos en la sala
    const handleRoomUsers = (data) => {
      if (data.roomId === roomId) {
        setActiveUsersCount(Math.max(1, data.activeCount || 1));
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
  }, [roomId]);

  // Enviar mensaje
  const handleSendMessage = (e) => {
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
      page: (showPageTag && includePageTag && currentPage) ? currentPage : null,
      mangaTitle,
      chapterTitle
    };

    // Enviar vía socket
    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        setIsSending(false);
        if (res?.success) {
          setInputText('');
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        } else {
          console.warn('[Chat Error]:', res?.message);
        }
      });
    } else {
      // Fallback REST si el socket no está listo
      axios.post('/api/chat/send', payload, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        setIsSending(false);
        if (res.data?.success) {
          setInputText('');
          setMessages(prev => [...prev, res.data.message]);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      }).catch(() => {
        setIsSending(false);
      });
    }
  };

  // Reacción / Like a mensaje
  const handleToggleLike = (messageId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('like_message', {
        roomId,
        messageId,
        token: currentUser.token
      });
    } else {
      axios.post('/api/chat/like', { roomId, messageId }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data?.success) {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, likes: res.data.likes } : m));
        }
      });
    }
  };

  const handleQuickReaction = (emoji) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    setInputText(prev => prev ? `${prev} ${emoji}` : emoji);
  };

  return (
    <div className={`rounded-3xl bg-[#0f1320] border border-gray-800 shadow-2xl overflow-hidden flex flex-col ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} space-y-4`}>
      
      {/* 1. CABECERA DEL CHAT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-600/40 shadow-lg shadow-purple-950/40">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {title}
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-bold text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>En Vivo</span>
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Lector activo en directo */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#151a2a] border border-gray-700/70 text-xs text-gray-300 font-mono self-start sm:self-auto">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>{activeUsersCount} {activeUsersCount === 1 ? 'lector conectado' : 'lectores conectados'}</span>
        </div>
      </div>

      {/* 2. BARRA DE REACCIONES RÁPIDAS (EMOJIS) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="px-2.5 py-1 rounded-xl bg-[#141824] hover:bg-purple-950/60 hover:text-purple-300 border border-gray-800 hover:border-purple-800/60 text-xs text-gray-300 transition active:scale-95 cursor-pointer shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 3. LISTA DE MENSAJES CON SCROLL Y EFECTO EN VIVO */}
      <div 
        ref={chatContainerRef}
        className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto pr-2 space-y-3 custom-scrollbar rounded-2xl bg-[#090c13]/70 border border-gray-800/80 p-3 sm:p-4"
      >
        {loadingHistory ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Cargando mensajes en vivo...</span>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isLiked = currentUser && Array.isArray(msg.likedBy) && msg.likedBy.includes(currentUser.id);
            const isMe = currentUser && msg.userId === currentUser.id;

            return (
              <div 
                key={msg.id} 
                className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5 group ${
                  isMe 
                    ? 'bg-[#181a2e] border-purple-800/40 hover:border-purple-600/60' 
                    : 'bg-[#121624] border-gray-800/80 hover:border-gray-700'
                }`}
              >
                {/* Cabecera del Mensaje */}
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Click en usuario abre su tarjeta flotante estilo Discord */}
                  <div 
                    onClick={() => {
                      if (onOpenUserCard) {
                        onOpenUserCard(msg.userId, msg.username, msg.userAvatar);
                      }
                    }}
                    className="flex items-center gap-2 cursor-pointer group/user min-w-0"
                    title="Ver perfil de usuario"
                  >
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-purple-950 border border-purple-800/50 shrink-0 group-hover/user:scale-105 transition">
                      <img 
                        src={msg.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.username)}`} 
                        alt={msg.username} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                    <span className="text-xs font-bold text-white group-hover/user:text-purple-300 transition truncate">
                      {msg.username}
                    </span>

                    {msg.userBadge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-950/90 text-purple-300 border border-purple-800/60 shrink-0">
                        {msg.userBadge}
                      </span>
                    )}

                    {msg.page && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-950/90 text-blue-300 border border-blue-800/60 shrink-0">
                        Pág. {msg.page}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-gray-500 font-mono shrink-0">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                  </span>
                </div>

                {/* Contenido del Mensaje */}
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed select-text pl-9 break-words">
                  {msg.text}
                </p>

                {/* Pie con botón de Like */}
                <div className="flex items-center justify-between pl-9 pt-1">
                  <button
                    onClick={() => handleToggleLike(msg.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer ${
                      isLiked 
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60' 
                        : 'text-gray-500 hover:text-rose-400 hover:bg-gray-800/50'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{msg.likes || 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-gray-500 text-xs">
            Sé el primero en escribir en esta sala. ¡Comenta en vivo!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. FORMULARIO PARA ESCRIBIR */}
      {currentUser ? (
        <form onSubmit={handleSendMessage} className="space-y-2">
          {showPageTag && currentPage && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={includePageTag}
                onChange={(e) => setIncludePageTag(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-purple-600 bg-gray-800 border-gray-700"
              />
              <span>Etiquetar viñeta actual (Página {currentPage})</span>
            </label>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje en vivo..."
              maxLength={500}
              className="flex-1 bg-[#141824] border border-gray-700/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition select-text"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold shadow-lg shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Publicar en el chat en vivo"
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
        <div className="p-4 rounded-2xl bg-[#141824] border border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Únete a la conversación
              </span>
              <p className="text-[11px] text-gray-400">
                Inicia sesión o regístrate para poder enviar mensajes en vivo.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition active:scale-95 cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </div>
      )}

    </div>
  );
}
