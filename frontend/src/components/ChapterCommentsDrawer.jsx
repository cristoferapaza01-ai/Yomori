import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  X, 
  Heart, 
  ChevronLeft,
  Users,
  LogIn,
  Loader2,
  MoreVertical,
  Reply,
  Copy,
  Link2,
  Flag,
  Trash2,
  ArrowUpDown
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';
import RichCommentEditor from './RichCommentEditor.jsx';

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
  const [includePageTag, setIncludePageTag] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeReaders, setActiveReaders] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [sortBy, setSortBy] = useState('recientes');
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const commentsEndRef = useRef(null);

  const roomId = useMemo(() => {
    if (!chapterUrl) return 'global';
    return 'chapter_' + btoa(chapterUrl).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 48);
  }, [chapterUrl]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.yomori-chat-menu-trigger') && !e.target.closest('.yomori-chat-menu-popup')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/history/${roomId}`)
      .then(res => {
        if (isMounted && res.data?.messages) {
          setComments(res.data.messages);
        }
      })
      .catch(err => console.warn('[Drawer] Error al cargar comentarios:', err))
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
          setTimeout(() => {
            if (commentsEndRef.current) {
              commentsEndRef.current.scrollTop = commentsEndRef.current.scrollHeight;
            }
          }, 100);
        }
      });

    const socket = getSocket();
    if (socket) {
      socket.emit('join_room', roomId);

      const handleNewComment = (msg) => {
        if (!isMounted) return;
        if (msg.roomId === roomId) {
          setComments(prev => {
            if (prev.some(c => c.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => {
            if (commentsEndRef.current) {
              commentsEndRef.current.scrollTo({
                top: commentsEndRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 50);
        }
      };

      const handleLikeUpdate = ({ messageId, likesCount, likedUsers }) => {
        if (!isMounted) return;
        setComments(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, likesCount, likedUsers };
          }
          return m;
        }));
      };

      const handleDeleteMessage = ({ messageId }) => {
        if (!isMounted) return;
        setComments(prev => prev.filter(m => m.id !== messageId));
      };

      const handleRoomStats = (data) => {
        if (!isMounted) return;
        if (data.roomId === roomId && data.activeUsers) {
          setActiveReaders(data.activeUsers);
        }
      };

      socket.on('new_message', handleNewComment);
      socket.on('message_liked', handleLikeUpdate);
      socket.on('delete_message', handleDeleteMessage);
      socket.on('room_stats', handleRoomStats);

      return () => {
        isMounted = false;
        socket.emit('leave_room', roomId);
        socket.off('new_message', handleNewComment);
        socket.off('message_liked', handleLikeUpdate);
        socket.off('delete_message', handleDeleteMessage);
        socket.off('room_stats', handleRoomStats);
      };
    }
  }, [isOpen, roomId]);

  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortBy === 'recientes') {
      return list.sort((a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0));
    } else if (sortBy === 'populares') {
      return list.sort((a, b) => (b.likesCount || b.likes || 0) - (a.likesCount || a.likes || 0));
    } else if (sortBy === 'antiguos') {
      return list.sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
    }
    return list;
  }, [comments, sortBy]);

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
      page: includePageTag ? currentPage : null,
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
        setComments(prev => prev.some(c => c.id === createdMsg.id) ? prev : [...prev, createdMsg]);
      }
      setTimeout(() => {
        if (commentsEndRef.current) {
          commentsEndRef.current.scrollTo({
            top: commentsEndRef.current.scrollHeight,
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
          console.warn('[Comment Error]:', res?.message);
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
        console.warn('[Comment Send Error]:', err);
        setIsSending(false);
      });
    }
  };

  const handleLike = (commentId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('like_message', {
        messageId: commentId,
        roomId,
        userId: currentUser.id,
        token: currentUser.token
      });
    } else {
      axios.post(`/api/chat/like/${commentId}`, { roomId }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (res.data?.success) {
          setComments(prev => prev.map(c => {
            if (c.id === commentId) {
              return { ...c, likesCount: res.data.likesCount, likedUsers: res.data.likedUsers };
            }
            return c;
          }));
        }
      }).catch(err => console.warn('[Like Error]:', err));
    }
  };

  const handleReplyToComment = (c) => {
    setReplyingTo({
      id: c.id,
      username: c.username,
      text: c.text || (c.images?.length ? '[Imagen]' : '')
    });
    setActiveMenuId(null);
  };

  const handleCopyLink = (cId) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${cId}`;
    navigator.clipboard?.writeText(url);
    showToast('Enlace copiado');
    setActiveMenuId(null);
  };

  const handleCopyText = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Texto copiado');
    setActiveMenuId(null);
  };

  const handleReport = (cId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    axios.post(`/api/chat/report/${cId}`, { reason: 'Inapropiado' }, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(() => {
      showToast('Comentario reportado');
    }).catch(() => {
      showToast('Comentario reportado');
    });
    setActiveMenuId(null);
  };

  const handleDelete = (cId) => {
    if (!currentUser) return;
    if (!confirm('¿Deseas eliminar este comentario?')) return;

    axios.delete(`/api/chat/message/${cId}`, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(() => {
      setComments(prev => prev.filter(c => c.id !== cId));
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
    <>
      {/* Botón flotante para abrir comentarios del capítulo */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-2xl shadow-purple-600/50 border border-purple-400/30 font-bold text-xs transition transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        title="Ver comentarios del capítulo en directo"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Comentarios</span>
        {comments.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-extrabold border border-white/20">
            {comments.length}
          </span>
        )}
      </button>

      {/* Drawer Lateral Deslizante */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in">
          
          <div 
            className="w-full max-w-md h-full bg-[#0b0e14] border-l border-gray-800 flex flex-col shadow-2xl transform transition-transform animate-slide-in-right relative"
          >
            {toastMessage && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-lg shadow-purple-600/40">
                {toastMessage}
              </div>
            )}

            {/* Cabecera del Drawer */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#0f131d] border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    {chapterTitle}
                  </h3>
                  <p className="text-[10px] text-gray-400 truncate">
                    {mangaTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector de Ordenar Por */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-900 border border-gray-800 text-[10px] text-gray-300">
                  <ArrowUpDown className="w-2.5 h-2.5 text-purple-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-gray-200 outline-none cursor-pointer text-[10px]"
                  >
                    <option value="recientes" className="bg-[#0f131d]">Recientes</option>
                    <option value="populares" className="bg-[#0f131d]">Populares</option>
                    <option value="antiguos" className="bg-[#0f131d]">Antiguos</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-300 font-medium">
                  <Users className="w-3 h-3 text-purple-400" />
                  <span>{activeReaders}</span>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de comentarios */}
            <div 
              ref={commentsEndRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-radial from-purple-950/10 via-transparent to-transparent"
            >
              {loadingHistory ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  <span className="text-xs">Cargando comentarios...</span>
                </div>
              ) : sortedComments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-700" />
                  <p className="text-xs font-semibold text-gray-400">Sin comentarios aún en este capítulo.</p>
                  <p className="text-[11px] text-gray-600">
                    Comenta tus impresiones sobre esta parte de la historia.
                  </p>
                </div>
              ) : (
                sortedComments.map((c) => {
                  const isMe = currentUser && (c.userId === currentUser.id || c.username === currentUser.username);
                  const isLikedByMe = currentUser && Array.isArray(c.likedUsers) && c.likedUsers.includes(currentUser.id);
                  const likesCount = c.likesCount || c.likes || 0;

                  return (
                    <div 
                      key={c.id || Math.random()}
                      id={`comment-${c.id}`}
                      className="group relative flex gap-2.5 items-start p-2 rounded-2xl hover:bg-white/[0.02] transition animate-fade-in"
                    >
                      <button
                        onClick={() => onOpenUserCard && onOpenUserCard(c.username)}
                        className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-purple-500/30 hover:border-purple-400 transition"
                      >
                        <img 
                          src={c.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.username || 'user')}`} 
                          alt={c.username}
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => onOpenUserCard && onOpenUserCard(c.username)}
                              className="text-xs font-bold text-gray-200 hover:text-purple-400 transition"
                            >
                              @{c.username}
                            </button>
                            {c.page && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Pág. {c.page}
                              </span>
                            )}
                            <span className="text-[9px] text-gray-600">
                              {formatTimestamp(c.createdAt || c.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 relative">
                            <button
                              onClick={() => handleLike(c.id)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
                                isLikedByMe ? 'text-rose-400 bg-rose-950/40 border border-rose-800/50' : 'text-gray-500 hover:text-rose-400'
                              }`}
                            >
                              <Heart className={`w-2.5 h-2.5 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                              {likesCount > 0 && <span>{likesCount}</span>}
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)}
                              className="yomori-chat-menu-trigger p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800/80 transition cursor-pointer"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {activeMenuId === c.id && (
                              <div className="yomori-chat-menu-popup absolute right-0 top-5 w-44 rounded-xl bg-[#131722] border border-gray-700 shadow-2xl p-1 z-50 animate-fade-in text-xs text-gray-200 space-y-0.5">
                                <button
                                  onClick={() => handleReplyToComment(c)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 hover:text-purple-300 transition text-left cursor-pointer"
                                >
                                  <Reply className="w-3 h-3 text-purple-400" />
                                  <span>Responder</span>
                                </button>
                                <button
                                  onClick={() => handleCopyLink(c.id)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition text-left cursor-pointer"
                                >
                                  <Link2 className="w-3 h-3 text-indigo-400" />
                                  <span>Copiar enlace</span>
                                </button>
                                {c.text && (
                                  <button
                                    onClick={() => handleCopyText(c.text)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition text-left cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3 text-gray-400" />
                                    <span>Copiar texto</span>
                                  </button>
                                )}
                                <div className="h-px bg-gray-800 my-1" />
                                <button
                                  onClick={() => handleReport(c.id)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-950/40 text-amber-300/80 hover:text-amber-300 transition text-left cursor-pointer"
                                >
                                  <Flag className="w-3 h-3 text-amber-400" />
                                  <span>Reportar</span>
                                </button>
                                {(isMe || currentUser?.role === 'admin') && (
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-400" />
                                    <span>Eliminar</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {c.replyTo && (
                          <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-purple-950/30 border-l-2 border-purple-500 text-[10px] text-gray-300">
                            <span className="font-bold text-purple-300">@{c.replyTo.username}: </span>
                            <span className="text-gray-400 italic">"{c.replyTo.text}"</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-200">
                          <FormattedMessage text={c.text} images={c.images} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input WYSIWYG */}
            <div className="p-3 bg-[#0f131d] border-t border-gray-800 shrink-0">
              {currentUser ? (
                <RichCommentEditor
                  placeholder="Comenta este capítulo..."
                  onSend={handleSend}
                  isSending={isSending}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  showPageTag={true}
                  currentPage={currentPage}
                  includePageTag={includePageTag}
                  onTogglePageTag={setIncludePageTag}
                />
              ) : (
                <div className="p-3 rounded-2xl bg-[#111420] border border-purple-900/40 text-center space-y-2">
                  <p className="text-[11px] text-gray-400">Inicia sesión para comentar este capítulo.</p>
                  <button
                    onClick={() => onOpenAuth && onOpenAuth('login')}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/30"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
