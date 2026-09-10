import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Users, 
  LogIn, 
  Loader2, 
  Eye, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Quote, 
  Image as ImageIcon,
  MoreVertical,
  Reply,
  Copy,
  Link2,
  Flag,
  Trash2,
  X,
  Sparkles,
  ChevronDown,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';

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
  
  // Ordenamiento: 'recientes' (default), 'populares', 'antiguos'
  const [sortBy, setSortBy] = useState('recientes');
  
  // Respuesta a un mensaje
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Menú flotante de 3 puntos activo: messageId o null
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Feedback temporal de copiado
  const [copiedId, setCopiedId] = useState(null);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 1. Cargar historial desde el backend
  useEffect(() => {
    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}&limit=150`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setMessages(res.data.messages || []);
        }
      })
      .catch(err => {
        console.warn(`[LiveChat] Error cargando historial de ${roomId}:`, err.message);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
          // Scroll suave interno sin saltar la ventana principal
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 80);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // 2. Conexión WebSocket / Socket.IO a la sala
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_room', roomId);

    const handleNewMessage = (newMsg) => {
      if (newMsg.roomId === roomId) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Scroll interno solo dentro de la caja de mensajes
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

    const handleMessageDeleted = (data) => {
      if (data.roomId === roomId) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    const handleRoomUsers = (data) => {
      if (data.roomId === roomId) {
        setActiveUsersCount(Math.max(1, data.activeCount || 1));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('room_users_count', handleRoomUsers);

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('room_users_count', handleRoomUsers);
    };
  }, [roomId]);

  // Aplicar formato de texto (Negrita, Cursiva, Spoiler, Cita, etc.)
  const handleFormat = (tagType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = inputText.substring(start, end);

    let prefix = '', suffix = '', placeholder = 'texto';
    switch (tagType) {
      case 'bold': prefix = '**'; suffix = '**'; placeholder = 'negrita'; break;
      case 'italic': prefix = '*'; suffix = '*'; placeholder = 'cursiva'; break;
      case 'underline': prefix = '<u>'; suffix = '</u>'; placeholder = 'subrayado'; break;
      case 'strike': prefix = '~~'; suffix = '~~'; placeholder = 'tachado'; break;
      case 'quote': prefix = '> '; suffix = ''; placeholder = 'cita'; break;
      case 'spoiler': prefix = '||'; suffix = '||'; placeholder = 'spoiler'; break;
      default: break;
    }

    const replacement = prefix + (selected || placeholder) + suffix;
    const newText = inputText.substring(0, start) + replacement + inputText.substring(end);
    setInputText(newText);

    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      const selectionEnd = selected ? selectionStart + selected.length : selectionStart + placeholder.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 50);
  };

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
      chapterTitle,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        username: replyingTo.username,
        text: replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text
      } : null
    };

    const finishSend = (createdMsg) => {
      setIsSending(false);
      setInputText('');
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
      }).catch(() => {
        setIsSending(false);
      });
    }
  };

  // Like / Reacción
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

  // Copiar texto del comentario
  const handleCopyComment = (msg) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  // Copiar enlace al comentario
  const handleCopyLink = (msg) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${msg.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  // Reportar comentario
  const handleReport = (msg) => {
    axios.post('/api/chat/report', {
      roomId,
      messageId: msg.id,
      username: msg.username
    }).catch(() => {});
    alert('Comentario reportado para revisión por el equipo de moderación.');
    setActiveMenuId(null);
  };

  // Eliminar comentario
  const handleDelete = (msg) => {
    if (!window.confirm('¿Seguro que deseas eliminar este comentario?')) return;
    axios.post('/api/chat/delete', {
      roomId,
      messageId: msg.id
    }, {
      headers: currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}
    }).then(() => {
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    }).catch(() => {});
    setActiveMenuId(null);
  };

  // Responder a un comentario
  const handleStartReply = (msg) => {
    setReplyingTo(msg);
    setActiveMenuId(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Ordenar lista de mensajes
  const sortedMessages = useMemo(() => {
    const list = [...messages];
    if (sortBy === 'populares') {
      return list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'antiguos') {
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    // 'recientes': orden natural de llegada / cronológico
    return list;
  }, [messages, sortBy]);

  return (
    <div className="w-full space-y-4 font-sans selection:bg-purple-600 selection:text-white">
      
      {/* 1. CABECERA INTEGRADA (Sin cuadros pesados) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {title}
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-[10px] font-bold text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En Vivo</span>
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Controles de Cabecera: Lectores y Ordenar Por */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          
          {/* Ordenar Por */}
          <div className="flex items-center gap-1.5 bg-[#121520] border border-gray-800 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-gray-400 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="recientes" className="bg-[#121520] text-white">Recientes (Predeterminado)</option>
              <option value="populares" className="bg-[#121520] text-white">Populares (Más me gusta)</option>
              <option value="antiguos" className="bg-[#121520] text-white">Antiguos</option>
            </select>
          </div>

          {/* Lectores conectados */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#121520] border border-gray-800 text-xs text-gray-300 font-mono">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeUsersCount} {activeUsersCount === 1 ? 'lector' : 'lectores'}</span>
          </div>
        </div>
      </div>

      {/* 2. LISTA DE MENSAJES (Diseño fluido integrado con el fondo) */}
      <div 
        ref={chatContainerRef}
        className="min-h-[220px] max-h-[420px] overflow-y-auto pr-1 sm:pr-2 space-y-2.5 custom-scrollbar py-1"
      >
        {loadingHistory ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Cargando mensajes en vivo...</span>
          </div>
        ) : sortedMessages.length > 0 ? (
          sortedMessages.map((msg) => {
            const isLiked = currentUser && Array.isArray(msg.likedBy) && msg.likedBy.includes(currentUser.id);
            const isMe = currentUser && (msg.userId === currentUser.id || msg.username === currentUser.username);
            const isMenuOpen = activeMenuId === msg.id;

            return (
              <div 
                key={msg.id} 
                id={`comment-${msg.id}`}
                className={`p-3 sm:p-3.5 rounded-2xl transition-all duration-200 flex flex-col gap-1.5 relative group border ${
                  isMe 
                    ? 'bg-[#151828]/80 border-purple-900/40 hover:border-purple-700/60' 
                    : 'bg-[#0e111a]/70 border-gray-800/60 hover:border-gray-700/80 hover:bg-[#121522]/90'
                }`}
              >
                {/* Si es respuesta a otro mensaje, mostrar referencia compacta */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 bg-purple-950/30 border-l-2 border-purple-500 px-2 py-0.5 rounded-r-md mb-0.5 max-w-xl truncate">
                    <Reply className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="font-bold text-purple-300 truncate">@{msg.replyTo.username}:</span>
                    <span className="text-gray-400 truncate italic">{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Cabecera del Mensaje */}
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Perfil de Usuario */}
                  <div 
                    onClick={() => {
                      if (onOpenUserCard) {
                        onOpenUserCard(msg.userId, msg.username, msg.userAvatar);
                      }
                    }}
                    className="flex items-center gap-2.5 cursor-pointer group/user min-w-0"
                    title="Ver perfil de usuario"
                  >
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-purple-950 border border-purple-800/40 shrink-0 group-hover/user:scale-105 transition">
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
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-950/90 text-purple-300 border border-purple-800/50 shrink-0">
                        {msg.userBadge}
                      </span>
                    )}

                    {msg.page && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-950/90 text-blue-300 border border-blue-800/50 shrink-0">
                        Pág. {msg.page}
                      </span>
                    )}
                  </div>

                  {/* Hora y Menú 3 Puntos */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </span>

                    {/* Botón 3 Puntos */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : msg.id);
                        }}
                        className="p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition cursor-pointer"
                        title="Opciones de mensaje"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Menú Flotante de Opciones */}
                      {isMenuOpen && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-6 z-40 bg-[#161a28] border border-gray-700/80 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 min-w-[170px] animate-fade-in text-xs font-medium"
                        >
                          <button
                            onClick={() => handleStartReply(msg)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-purple-950/60 text-gray-200 hover:text-purple-300 transition text-left cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5 text-purple-400" />
                            <span>Responder</span>
                          </button>

                          <button
                            onClick={() => handleCopyComment(msg)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-800 text-gray-200 hover:text-white transition text-left cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                            <span>{copiedId === msg.id ? '¡Texto copiado!' : 'Copiar comentario'}</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(msg)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-800 text-gray-200 hover:text-white transition text-left cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5 text-gray-400" />
                            <span>Copiar enlace</span>
                          </button>

                          <button
                            onClick={() => handleReport(msg)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 transition text-left cursor-pointer"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reportar comentario</span>
                          </button>

                          {(isMe || currentUser?.role === 'admin') && (
                            <button
                              onClick={() => handleDelete(msg)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 transition text-left cursor-pointer border-t border-gray-800/80 mt-0.5 pt-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenido del Mensaje con Soporte de Spoiler y Formato */}
                <div className="text-xs sm:text-sm text-gray-200 leading-relaxed select-text pl-9 break-words">
                  <FormattedMessage text={msg.text} />
                </div>

                {/* Pie con Acciones Rápidas (Responder y Like) */}
                <div className="flex items-center gap-3 pl-9 pt-0.5 text-xs text-gray-400">
                  <button
                    onClick={() => handleToggleLike(msg.id)}
                    className={`flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer ${
                      isLiked 
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60' 
                        : 'text-gray-500 hover:text-rose-400 hover:bg-gray-800/50'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{msg.likes || 0}</span>
                  </button>

                  <button
                    onClick={() => handleStartReply(msg)}
                    className="flex items-center gap-1 font-semibold text-gray-500 hover:text-purple-300 transition cursor-pointer"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Responder</span>
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
      </div>

      {/* 3. BARRA DE EDICIÓN Y ENVÍO INTEGRADA */}
      {currentUser ? (
        <form onSubmit={handleSendMessage} className="space-y-2 pt-1">
          
          {/* Banner de Respuesta Activa */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 animate-fade-in">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="font-bold">Respondiendo a @{replyingTo.username}:</span>
                <span className="text-gray-400 truncate italic">"{replyingTo.text}"</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
                title="Cancelar respuesta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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

          {/* Contenedor del Editor de Texto */}
          <div className="rounded-2xl bg-[#111420] border border-gray-800 focus-within:border-purple-500/80 transition shadow-inner overflow-hidden">
            
            {/* Campo de Entrada de Texto */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Escribe algo... (Usa ||spoiler|| o el icono de ojo para ocultar spoilers)"
              maxLength={500}
              className="w-full bg-transparent px-3.5 pt-3 pb-1.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none resize-none select-text"
            />

            {/* Barra de Herramientas de Formato (Exacta a las imágenes del usuario) */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-800/80 bg-[#0d101a]">
              
              {/* Botones de Formato: B, I, U, S, Cita, Spoiler, Imagen */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleFormat('bold')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer font-bold text-xs"
                  title="Negrita (**texto**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFormat('italic')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer italic text-xs"
                  title="Cursiva (*texto*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFormat('underline')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer text-xs"
                  title="Subrayado (<u>texto</u>)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFormat('strike')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer text-xs"
                  title="Tachado (~~texto~~)"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFormat('quote')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/70 transition cursor-pointer text-xs"
                  title="Cita (> texto)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                {/* BOTÓN DE SPOILER (Ícono de Ojo 👁️) */}
                <button
                  type="button"
                  onClick={() => handleFormat('spoiler')}
                  className="p-1.5 rounded-lg text-purple-400 hover:text-purple-200 hover:bg-purple-950/60 transition cursor-pointer text-xs border border-purple-800/40"
                  title="Marcar como Spoiler (||texto||)"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title="Enviar mensaje (Enter)"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Enviar</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
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
                Inicia sesión o regístrate para poder enviar mensajes y spoilers en vivo.
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
