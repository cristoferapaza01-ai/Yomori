import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  X, 
  Send, 
  Heart, 
  User, 
  ChevronLeft,
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
  ArrowUpDown
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';

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
  
  const [sortBy, setSortBy] = useState('recientes');
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    quote: false,
    spoiler: false
  });

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const roomId = chapterUrl ? `chapter:${btoa(encodeURIComponent(chapterUrl)).slice(0, 32)}` : 'chapter:default';

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 1. Cargar historial
  useEffect(() => {
    if (!chapterUrl) return;
    let isMounted = true;
    setLoadingHistory(true);

    axios.get(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}&limit=150`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setComments(res.data.messages || []);
        }
      })
      .catch(err => {
        console.warn('[ChapterChat] Error cargando mensajes:', err.message);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          }, 80);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chapterUrl, roomId]);

  // 2. Conexión Socket.IO
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
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 50);
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

    const handleMessageDeleted = (data) => {
      if (data.roomId === roomId) {
        setComments(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    const handleRoomUsers = (data) => {
      if (data.roomId === roomId) {
        setActiveReaders(Math.max(1, data.activeCount || 1));
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
  }, [chapterUrl, roomId]);

  // Formato interactivo
  const handleFormat = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = inputText.substring(start, end);

    let prefix = '', suffix = '';
    switch (type) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'underline': prefix = '<u>'; suffix = '</u>'; break;
      case 'strike': prefix = '~~'; suffix = '~~'; break;
      case 'quote': prefix = '> '; suffix = ''; break;
      case 'spoiler': prefix = '||'; suffix = '||'; break;
      default: break;
    }

    if (selected && selected.length > 0) {
      const replacement = `${prefix}${selected}${suffix}`;
      const newText = inputText.substring(0, start) + replacement + inputText.substring(end);
      setInputText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 30);
    } else {
      const isCurrentlyActive = activeFormats[type];
      setActiveFormats(prev => ({ ...prev, [type]: !isCurrentlyActive }));

      if (!isCurrentlyActive) {
        const newText = inputText.substring(0, start) + prefix + suffix + inputText.substring(end);
        setInputText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        }, 30);
      } else {
        setTimeout(() => {
          textarea.focus();
          const nextPos = Math.min(inputText.length, start + suffix.length);
          textarea.setSelectionRange(nextPos, nextPos);
        }, 30);
      }
    }
  };

  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target.result;
        setAttachedImages(prev => [...prev, base64].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachedImage = (idx) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Enviar comentario
  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const cleanText = inputText.trim();
    if ((!cleanText && attachedImages.length === 0) || isSending) return;

    setIsSending(true);
    const socket = getSocket();

    const payload = {
      roomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: cleanText,
      images: attachedImages,
      page: includePageTag ? currentPage : null,
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
      setAttachedImages([]);
      setReplyingTo(null);
      setActiveFormats({ bold: false, italic: false, underline: false, strike: false, quote: false, spoiler: false });

      if (createdMsg) {
        setComments(prev => prev.some(m => m.id === createdMsg.id) ? prev : [...prev, createdMsg]);
      }
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
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

  const handleCopyComment = (msg) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  const handleCopyLink = (msg) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${msg.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuId(null);
  };

  const handleReport = (msg) => {
    axios.post('/api/chat/report', { roomId, messageId: msg.id, username: msg.username }).catch(() => {});
    alert('Comentario reportado para moderación.');
    setActiveMenuId(null);
  };

  const handleDelete = (msg) => {
    if (!window.confirm('¿Deseas eliminar este comentario?')) return;
    axios.post('/api/chat/delete', { roomId, messageId: msg.id }, {
      headers: currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}
    }).then(() => {
      setComments(prev => prev.filter(m => m.id !== msg.id));
    }).catch(() => {});
    setActiveMenuId(null);
  };

  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortBy === 'populares') {
      return list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'antiguos') {
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    return list;
  }, [comments, sortBy]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-[#181a28]/95 hover:bg-[#202438] border border-purple-500/50 hover:border-purple-400 text-white shadow-2xl backdrop-blur-xl flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs"
        title="Ver comentarios del capítulo"
      >
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <span>Comentarios ({comments.length})</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md h-full bg-[#0a0d14]/95 border-l border-gray-800/80 shadow-2xl flex flex-col z-10 backdrop-blur-xl animate-slide-left">
            
            {/* Cabecera */}
            <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Comentarios del Capítulo
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                    {chapterTitle} • {mangaTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-[#121520] border border-gray-800 text-[10px] text-gray-300 font-mono">
                  <Users className="w-3 h-3 text-emerald-400" />
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

            {/* Ordenar Por */}
            <div className="px-4 py-2 bg-[#0d101a] border-b border-gray-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-400">
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                <span>Ordenar:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#141824] border border-gray-700/80 rounded-lg px-2 py-1 text-purple-300 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="recientes">Recientes</option>
                <option value="populares">Populares</option>
                <option value="antiguos">Antiguos</option>
              </select>
            </div>

            {/* Lista de Comentarios */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            >
              {loadingHistory ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Cargando comentarios...</span>
                </div>
              ) : sortedComments.length > 0 ? (
                sortedComments.map((msg) => {
                  const isLiked = currentUser && Array.isArray(msg.likedBy) && msg.likedBy.includes(currentUser.id);
                  const isMe = currentUser && (msg.userId === currentUser.id || msg.username === currentUser.username);
                  const isMenuOpen = activeMenuId === msg.id;

                  return (
                    <div 
                      key={msg.id} 
                      className={`p-3.5 rounded-2xl border transition flex flex-col gap-1.5 relative ${
                        isMe 
                          ? 'bg-[#151828] border-purple-900/40' 
                          : 'bg-[#10131e] border-gray-800/70'
                      }`}
                    >
                      {msg.replyTo && (
                        <div className="flex items-center gap-1.5 text-[10px] text-purple-300/80 bg-purple-950/30 border-l-2 border-purple-500 px-2 py-0.5 rounded-r-md mb-0.5 truncate">
                          <Reply className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                          <span className="font-bold">@{msg.replyTo.username}:</span>
                          <span className="text-gray-400 truncate italic">{msg.replyTo.text}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div 
                          onClick={() => onOpenUserCard && onOpenUserCard(msg.userId, msg.username, msg.userAvatar)}
                          className="flex items-center gap-2 cursor-pointer group min-w-0"
                        >
                          <div className="w-6 h-6 rounded-lg overflow-hidden bg-purple-950 shrink-0">
                            <img 
                              src={msg.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.username)}`} 
                              alt={msg.username} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                            {msg.username}
                          </span>
                          {msg.page && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-950/90 text-blue-300 border border-blue-800/50 shrink-0">
                              Pág. {msg.page}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-gray-500 font-mono">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                          </span>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : msg.id);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-200 transition cursor-pointer"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>

                            {isMenuOpen && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-5 z-40 bg-[#161a28] border border-gray-700/80 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 min-w-[150px] text-xs"
                              >
                                <button
                                  onClick={() => { setReplyingTo(msg); setActiveMenuId(null); textareaRef.current?.focus(); }}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-purple-950/60 text-gray-200 hover:text-purple-300 transition text-left"
                                >
                                  <Reply className="w-3 h-3 text-purple-400" />
                                  <span>Responder</span>
                                </button>
                                <button
                                  onClick={() => handleCopyComment(msg)}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 text-gray-200 transition text-left"
                                >
                                  <Copy className="w-3 h-3 text-gray-400" />
                                  <span>{copiedId === msg.id ? '¡Copiado!' : 'Copiar texto'}</span>
                                </button>
                                <button
                                  onClick={() => handleCopyLink(msg)}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 text-gray-200 transition text-left"
                                >
                                  <Link2 className="w-3 h-3 text-gray-400" />
                                  <span>Copiar enlace</span>
                                </button>
                                <button
                                  onClick={() => handleReport(msg)}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-amber-950/40 text-amber-300 transition text-left"
                                >
                                  <Flag className="w-3 h-3 text-amber-400" />
                                  <span>Reportar</span>
                                </button>
                                {(isMe || currentUser?.role === 'admin') && (
                                  <button
                                    onClick={() => handleDelete(msg)}
                                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-rose-950/60 text-rose-300 transition text-left border-t border-gray-800 mt-0.5"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-400" />
                                    <span>Eliminar</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-200 leading-relaxed select-text pl-8 break-words">
                        <FormattedMessage text={msg.text} images={msg.images} image={msg.image} />
                      </div>

                      <div className="flex items-center gap-3 pl-8 pt-0.5 text-xs">
                        <button
                          onClick={() => handleToggleLike(msg.id)}
                          className={`flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded transition cursor-pointer ${
                            isLiked ? 'text-rose-400 bg-rose-950/40' : 'text-gray-500 hover:text-rose-400'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{msg.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => { setReplyingTo(msg); textareaRef.current?.focus(); }}
                          className="flex items-center gap-1 text-gray-500 hover:text-purple-300 transition cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Responder</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-gray-500 text-xs">
                  Sin comentarios aún en este capítulo. ¡Sé el primero en opinar!
                </div>
              )}
            </div>

            {/* Formulario de Entrada */}
            <div className="p-3 bg-[#0c0f18] border-t border-gray-800">
              {currentUser ? (
                <form onSubmit={handleSend} className="space-y-2">
                  
                  {replyingTo && (
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <Reply className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="font-bold">@{replyingTo.username}:</span>
                        <span className="text-gray-400 truncate italic">"{replyingTo.text}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-0.5 text-gray-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {attachedImages.length > 0 && (
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#0d101a] border border-gray-800 overflow-x-auto">
                      {attachedImages.map((imgData, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-purple-500/50 shrink-0">
                          <img src={imgData} alt="Adjunto" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAttachedImage(i)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-rose-400"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePageTag}
                      onChange={(e) => setIncludePageTag(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-purple-600 bg-gray-800 border-gray-700"
                    />
                    <span>Etiquetar página actual ({currentPage})</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageFileChange}
                  />

                  <div className="rounded-xl bg-[#131622] border border-gray-800 focus-within:border-purple-500 transition overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Comentar en este capítulo..."
                      maxLength={500}
                      className="w-full bg-transparent px-3 pt-2 text-xs text-white placeholder-gray-500 focus:outline-none resize-none select-text"
                    />

                    {/* Toolbar de formato */}
                    <div className="flex items-center justify-between px-2 py-1 border-t border-gray-800/60 bg-[#0f121d]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFormat('bold')}
                          className={`p-1 rounded text-xs font-bold transition ${
                            activeFormats.bold ? 'bg-purple-600 text-white border border-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                          title="Negrita"
                        >
                          <Bold className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFormat('italic')}
                          className={`p-1 rounded text-xs italic transition ${
                            activeFormats.italic ? 'bg-purple-600 text-white border border-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                          title="Cursiva"
                        >
                          <Italic className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFormat('underline')}
                          className={`p-1 rounded text-xs transition ${
                            activeFormats.underline ? 'bg-purple-600 text-white border border-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                          title="Subrayado"
                        >
                          <Underline className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFormat('strike')}
                          className={`p-1 rounded text-xs transition ${
                            activeFormats.strike ? 'bg-purple-600 text-white border border-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                          title="Tachado"
                        >
                          <Strikethrough className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFormat('quote')}
                          className={`p-1 rounded text-xs transition ${
                            activeFormats.quote ? 'bg-purple-600 text-white border border-purple-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                          title="Cita"
                        >
                          <Quote className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFormat('spoiler')}
                          className={`p-1 rounded text-xs transition ${
                            activeFormats.spoiler ? 'bg-purple-600 text-white border border-purple-400' : 'text-purple-400 hover:text-purple-200 hover:bg-purple-950/60 border border-purple-800/40'
                          }`}
                          title="Spoiler (||texto||)"
                        >
                          <Eye className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 rounded text-gray-400 hover:text-purple-300 hover:bg-gray-800 text-xs"
                          title="Subir foto"
                        >
                          <ImageIcon className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={(!inputText.trim() && attachedImages.length === 0) || isSending}
                        className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-3 rounded-xl bg-[#141824] text-center space-y-2">
                  <p className="text-xs text-gray-400">Inicia sesión para comentar</p>
                  <button
                    onClick={() => onOpenAuth && onOpenAuth('login')}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
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
