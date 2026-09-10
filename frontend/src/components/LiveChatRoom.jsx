import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  LogIn, 
  MoreVertical,
  Reply,
  Copy,
  Link2,
  Flag,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';
import RichCommentEditor from './RichCommentEditor.jsx';

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'populares', label: 'Más populares' },
  { value: 'antiguos', label: 'Más antiguos' }
];

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
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [includePageTag, setIncludePageTag] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Ordenamiento personalizado y estado del menú desplegable estilizado
  const [sortBy, setSortBy] = useState('recientes');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  
  // Respuesta a un mensaje
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Menú flotante de 3 puntos activo (ID de mensaje)
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const chatContainerRef = useRef(null);

  // Cerrar menús flotantes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.yomori-chat-menu-trigger') && !e.target.closest('.yomori-chat-menu-popup')) {
        setActiveMenuId(null);
      }
      if (!e.target.closest('.yomori-sort-dropdown-trigger') && !e.target.closest('.yomori-sort-dropdown-menu')) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar historial y unirse a la sala de Socket.IO
  useEffect(() => {
    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/history/${roomId}`)
      .then(res => {
        if (isMounted && res.data?.messages) {
          setMessages(res.data.messages);
        }
      })
      .catch(err => console.warn('[LiveChat] Error al cargar historial:', err))
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      });

    const socket = getSocket();
    if (socket) {
      socket.emit('join_room', roomId);

      const handleNewMessage = (msg) => {
        if (!isMounted) return;
        if (msg.roomId === roomId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 50);
        }
      };

      const handleLikeUpdate = ({ messageId, likesCount, likedUsers }) => {
        if (!isMounted) return;
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, likesCount, likedUsers };
          }
          return m;
        }));
      };

      const handleDeleteMessage = ({ messageId }) => {
        if (!isMounted) return;
        setMessages(prev => prev.filter(m => m.id !== messageId));
      };

      const handleRoomStats = (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId && data.activeUsers) {
          setActiveUsersCount(data.activeUsers);
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_liked', handleLikeUpdate);
      socket.on('delete_message', handleDeleteMessage);
      socket.on('room_stats', handleRoomStats);

      return () => {
        isMounted = false;
        socket.emit('leave_room', roomId);
        socket.off('new_message', handleNewMessage);
        socket.off('message_liked', handleLikeUpdate);
        socket.off('delete_message', handleDeleteMessage);
        socket.off('room_stats', handleRoomStats);
      };
    }
  }, [roomId]);

  // Mensajes ordenados según el filtro seleccionado
  const sortedMessages = useMemo(() => {
    const list = [...messages];
    if (sortBy === 'recientes') {
      return list.sort((a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0));
    } else if (sortBy === 'populares') {
      return list.sort((a, b) => (b.likesCount || b.likes || 0) - (a.likesCount || a.likes || 0));
    } else if (sortBy === 'antiguos') {
      return list.sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
    }
    return list;
  }, [messages, sortBy]);

  // Enviar mensaje enriquecido
  const handleSend = ({ text, images }) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    setIsSending(true);
    const socket = getSocket();

    const payload = {
      roomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: text || '',
      images: images || [],
      page: (showPageTag && includePageTag && currentPage) ? currentPage : null,
      mangaTitle,
      chapterTitle,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        username: replyingTo.username,
        text: replyingTo.text ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text) : 'Adjunto'
      } : null
    };

    const finishSend = (createdMsg) => {
      setIsSending(false);
      setReplyingTo(null);
      if (createdMsg) {
        setMessages(prev => prev.some(m => m.id === createdMsg.id) ? prev : [...prev, createdMsg]);
      }
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    };

    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        if (res?.success) {
          finishSend(res.message);
        } else {
          setIsSending(false);
          console.warn('[Chat Error]:', res?.message);
        }
      });
    } else {
      axios.post('/api/chat/send', payload, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data?.success) {
          finishSend(res.data.message);
        } else {
          setIsSending(false);
        }
      }).catch(err => {
        console.warn('[Chat Send Error]:', err);
        setIsSending(false);
      });
    }
  };

  // Dar me gusta / reaccionar
  const handleLike = (messageId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('like_message', {
        messageId,
        roomId,
        userId: currentUser.id,
        token: currentUser.token
      });
    } else {
      axios.post(`/api/chat/like/${messageId}`, { roomId }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data?.success) {
          setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              return { ...m, likesCount: res.data.likesCount, likedUsers: res.data.likedUsers };
            }
            return m;
          }));
        }
      }).catch(err => console.warn('[Like Error]:', err));
    }
  };

  // Responder comentario
  const handleReplyToMessage = (msg) => {
    setReplyingTo({
      id: msg.id,
      username: msg.username,
      text: msg.text || (msg.images?.length ? '[Imagen]' : '')
    });
    setActiveMenuId(null);
  };

  // Copiar enlace del comentario
  const handleCopyLink = (msgId) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${msgId}`;
    navigator.clipboard?.writeText(url);
    showToast('Enlace del comentario copiado');
    setActiveMenuId(null);
  };

  // Copiar texto del comentario
  const handleCopyText = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Texto copiado');
    setActiveMenuId(null);
  };

  // Reportar comentario
  const handleReport = (msgId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    axios.post(`/api/chat/report/${msgId}`, { reason: 'Inapropiado' }, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(() => {
      showToast('Comentario reportado para moderación.');
    }).catch(() => {
      showToast('Comentario reportado para moderación.');
    });
    setActiveMenuId(null);
  };

  // Eliminar comentario (si es autor o admin)
  const handleDelete = (msgId) => {
    if (!currentUser) return;
    if (!confirm('¿Deseas eliminar este comentario?')) return;

    axios.delete(`/api/chat/message/${msgId}`, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(() => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      showToast('Comentario eliminado');
    }).catch(err => {
      console.warn('[Delete Comment Error]:', err);
    });
    setActiveMenuId(null);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Ahora';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Ahora';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col bg-[#0b0e14] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${compact ? 'h-[520px]' : 'h-[620px]'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-lg shadow-purple-600/40 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0f131d] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="En directo"></span>
            </h3>
            <p className="text-[11px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Controles de Header: Ordenamiento con Dropdown Personalizado y Lectores */}
        <div className="flex items-center gap-2.5">
          
          {/* Menú Desplegable Personalizado Estilo Yomori */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(prev => !prev)}
              className="yomori-sort-dropdown-trigger flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111420] hover:bg-[#161a29] border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-200 transition cursor-pointer shadow-sm"
              title="Cambiar orden de los comentarios"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
              <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Más recientes'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>

            {/* Panel Desplegable Estilizado */}
            {isSortDropdownOpen && (
              <div className="yomori-sort-dropdown-menu absolute right-0 top-9 w-40 rounded-2xl bg-[#121622] border border-gray-700/80 shadow-2xl p-1.5 z-50 animate-fade-in backdrop-blur-md space-y-1">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/70'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-[11px] text-purple-300 font-medium">
            <Users className="w-3 h-3 text-purple-400" />
            <span>{activeUsersCount} online</span>
          </div>
        </div>
      </div>

      {/* Lista de Mensajes */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 custom-scrollbar bg-radial from-purple-950/10 via-transparent to-transparent"
      >
        {loadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="text-xs">Cargando comentarios...</span>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-gray-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-400">Aún no hay comentarios.</p>
            <p className="text-[11px] text-gray-600 max-w-xs">
              ¡Sé el primero en iniciar la conversación y comparte tu opinión!
            </p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isMe = currentUser && (msg.userId === currentUser.id || msg.username === currentUser.username);
            const isLikedByMe = currentUser && Array.isArray(msg.likedUsers) && msg.likedUsers.includes(currentUser.id);
            const likesCount = msg.likesCount || msg.likes || 0;

            return (
              <div 
                key={msg.id || `${msg.timestamp}-${Math.random()}`}
                id={`comment-${msg.id}`}
                className="group relative flex gap-3 items-start animate-fade-in hover:bg-white/[0.02] p-2 rounded-2xl transition"
              >
                {/* Avatar */}
                <button
                  onClick={() => onOpenUserCard && onOpenUserCard(msg.username)}
                  className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-purple-500/30 hover:border-purple-400 transition transform hover:scale-105"
                  title={`Ver perfil de @${msg.username}`}
                >
                  <img 
                    src={msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.username || 'guest')}`} 
                    alt={msg.username}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Contenido del Mensaje */}
                <div className="flex-1 min-w-0">
                  
                  {/* Cabecera del Mensaje */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onOpenUserCard && onOpenUserCard(msg.username)}
                        className="text-xs font-bold text-gray-200 hover:text-purple-400 transition"
                      >
                        @{msg.username}
                      </button>

                      {msg.role === 'admin' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ADMIN
                        </span>
                      )}

                      {msg.page && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Pág. {msg.page}
                        </span>
                      )}

                      <span className="text-[10px] text-gray-600">
                        {formatTimestamp(msg.createdAt || msg.timestamp)}
                      </span>
                    </div>

                    {/* Menú de 3 puntos y botón Me Gusta */}
                    <div className="flex items-center gap-1.5 relative">
                      
                      {/* Botón de Like */}
                      <button
                        onClick={() => handleLike(msg.id)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] transition cursor-pointer ${
                          isLikedByMe 
                            ? 'text-rose-400 bg-rose-950/40 border border-rose-800/50' 
                            : 'text-gray-500 hover:text-rose-400 hover:bg-gray-800/60'
                        }`}
                        title={isLikedByMe ? 'Quitar Me Gusta' : 'Me Gusta'}
                      >
                        <Heart className={`w-3 h-3 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                        {likesCount > 0 && <span className="font-semibold text-[10px]">{likesCount}</span>}
                      </button>

                      {/* Menú Flotante de 3 puntos */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                          className="yomori-chat-menu-trigger p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800/80 transition cursor-pointer"
                          title="Opciones del comentario"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Panel Flotante Desplegable */}
                        {activeMenuId === msg.id && (
                          <div className="yomori-chat-menu-popup absolute right-0 top-6 w-48 rounded-xl bg-[#131722] border border-gray-700 shadow-2xl p-1 z-50 animate-fade-in text-xs text-gray-200 space-y-0.5">
                            
                            {/* Responder */}
                            <button
                              onClick={() => handleReplyToMessage(msg)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-300 transition text-left cursor-pointer"
                            >
                              <Reply className="w-3.5 h-3.5 text-purple-400" />
                              <span>Responder</span>
                            </button>

                            {/* Copiar Enlace */}
                            <button
                              onClick={() => handleCopyLink(msg.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition text-left cursor-pointer"
                            >
                              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Copiar enlace</span>
                            </button>

                            {/* Copiar Texto */}
                            {msg.text && (
                              <button
                                onClick={() => handleCopyText(msg.text)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition text-left cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                                <span>Copiar texto</span>
                              </button>
                            )}

                            <div className="h-px bg-gray-800 my-1" />

                            {/* Reportar */}
                            <button
                              onClick={() => handleReport(msg.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-950/40 text-amber-300/80 hover:text-amber-300 transition text-left cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-amber-400" />
                              <span>Reportar comentario</span>
                            </button>

                            {/* Eliminar (si es propio o admin) */}
                            {(isMe || currentUser?.role === 'admin') && (
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Eliminar comentario</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Cita de Respuesta si existe */}
                  {msg.replyTo && (
                    <div className="mb-2 px-2.5 py-1 rounded-lg bg-purple-950/30 border-l-2 border-purple-500 text-[11px] text-gray-300">
                      <span className="font-bold text-purple-300">@{msg.replyTo.username}: </span>
                      <span className="text-gray-400 italic">"{msg.replyTo.text}"</span>
                    </div>
                  )}

                  {/* Cuerpo Formateado (Soporte spoilers, negritas, links e imágenes) */}
                  <div className="text-xs sm:text-sm text-gray-200">
                    <FormattedMessage text={msg.text} images={msg.images} />
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor WYSIWYG de Comentarios en la parte inferior */}
      <div className="p-3 bg-[#0f131d] border-t border-gray-800 shrink-0">
        {currentUser ? (
          <RichCommentEditor
            placeholder="Escribe un comentario..."
            onSend={handleSend}
            isSending={isSending}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            showPageTag={showPageTag}
            currentPage={currentPage}
            includePageTag={includePageTag}
            onTogglePageTag={setIncludePageTag}
          />
        ) : (
          <div className="p-4 rounded-2xl bg-[#111420] border border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Únete a la conversación
                </span>
                <p className="text-[11px] text-gray-400">
                  Inicia sesión o regístrate para poder enviar comentarios, fotos y spoilers interactivos.
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

    </div>
  );
}
