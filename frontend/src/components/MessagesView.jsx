import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Search, 
  Share2, 
  BookOpen, 
  UserPlus, 
  UserCheck, 
  X, 
  Smile, 
  Loader2, 
  ExternalLink,
  Sparkles,
  Heart,
  ChevronRight,
  Play
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';

export default function MessagesView({
  currentUser = null,
  initialActiveUserId = null,
  library = [],
  catalog = [],
  onSelectManga,
  onViewUserProfile,
  onOpenAuth
}) {
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modal para compartir manga en el chat
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFilter, setShareFilter] = useState('');

  const messagesEndRef = useRef(null);

  // Cargar lista de amigos y conversaciones
  const fetchFriendsAndDMs = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get('/api/social/friends-and-dms', {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        setFriends(res.data.friends || []);
        setConversations(res.data.conversations || []);

        // Si se especificó un usuario inicial, seleccionarlo
        if (initialActiveUserId) {
          const found = (res.data.friends || []).find(f => f.id === initialActiveUserId);
          if (found) setActiveUser(found);
          else {
            // Buscar perfil
            axios.get(`/api/users/${encodeURIComponent(initialActiveUserId)}`).then(uRes => {
              if (uRes.data?.success) setActiveUser(uRes.data.profile);
            });
          }
        } else if (!activeUser && res.data.friends?.length > 0) {
          setActiveUser(res.data.friends[0]);
        }
      }
    } catch (err) {
      console.warn('Error cargando amigos y DMs:', err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFriendsAndDMs();
  }, [currentUser, initialActiveUserId]);

  // ID de la sala DM entre currentUser y activeUser
  const dmRoomId = (currentUser && activeUser)
    ? `dm:${[currentUser.id, activeUser.id].sort().join('_')}`
    : null;

  // Cargar historial de mensajes al cambiar de activeUser
  useEffect(() => {
    if (!dmRoomId) return;

    let isMounted = true;
    setLoadingChat(true);

    axios.get(`/api/chat/messages?roomId=${encodeURIComponent(dmRoomId)}&limit=100`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setMessages(res.data.messages || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          }, 50);
        }
      })
      .catch(e => {})
      .finally(() => {
        if (isMounted) setLoadingChat(false);
      });

    // Conectar Socket.IO a la sala DM
    const socket = getSocket();
    if (socket) {
      socket.emit('join_room', dmRoomId);

      const handleNewMessage = (msg) => {
        if (msg.roomId === dmRoomId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      };

      const handleMessageUpdated = (updated) => {
        if (updated.roomId === dmRoomId) {
          setMessages(prev => prev.map(m => m.id === updated.messageId ? { ...m, likes: updated.likes, likedBy: updated.likedBy } : m));
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_updated', handleMessageUpdated);

      return () => {
        socket.emit('leave_room', dmRoomId);
        socket.off('new_message', handleNewMessage);
        socket.off('message_updated', handleMessageUpdated);
      };
    }
  }, [dmRoomId]);

  const handleSendMessage = (e, customPayload = null) => {
    if (e) e.preventDefault();
    if (!currentUser || !dmRoomId) return;

    const textToSend = customPayload?.text || inputText.trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    const socket = getSocket();

    const payload = {
      roomId: dmRoomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: textToSend,
      mangaTitle: customPayload?.mangaTitle || null,
      chapterTitle: customPayload?.chapterTitle || null
    };

    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        setIsSending(false);
        if (res?.success) {
          setInputText('');
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleShareManga = (manga) => {
    if (!manga) return;
    const shareText = `📖 Te recomiendo este manga: "${manga.title}"\n${manga.url}`;
    handleSendMessage(null, {
      text: shareText,
      mangaTitle: manga.title
    });
    setShowShareModal(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-[#0f131f] border border-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="w-18 h-18 mx-auto rounded-3xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <MessageSquare className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Mensajes Directos</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Inicia sesión para hablar en privado con tus amigos y compartir recomendaciones de manga en tiempo real.
            </p>
          </div>
          <button
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Lista combinada de amigos y conversaciones para la barra lateral
  const allContacts = [...friends];
  conversations.forEach(c => {
    if (!allContacts.some(u => u.id === c.user.id)) {
      allContacts.push(c.user);
    }
  });

  const filteredContacts = allContacts.filter(u => 
    (u.username || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  const availableShareMangas = [...(library || []), ...(catalog || [])].filter((m, i, arr) => 
    arr.findIndex(x => x.url === m.url) === i &&
    (m.title || '').toLowerCase().includes(shareFilter.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 select-none animate-fadeIn">
      
      {/* Contenedor Principal Estilo Discord */}
      <div className="rounded-3xl bg-[#0c0f18] border border-gray-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[82vh]">
        
        {/* 1. PANEL IZQUIERDO: LISTA DE AMIGOS Y CHATS */}
        <aside className="w-full md:w-80 bg-[#090b12] border-r border-gray-800/80 flex flex-col shrink-0">
          
          {/* Cabecera del Panel Izquierdo */}
          <div className="p-4 border-b border-gray-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white">Mensajes</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-bold font-mono">
                {allContacts.length} amigos
              </span>
            </div>

            {/* Buscador de Amigos */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar amigo o chat..."
                className="w-full bg-[#131622] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition select-text"
              />
            </div>
          </div>

          {/* Lista de Contactos con Scroll */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => {
                const isSelected = activeUser?.id === contact.id;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setActiveUser(contact)}
                    className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer group ${
                      isSelected 
                        ? 'bg-purple-900/40 border border-purple-600/50 shadow-md' 
                        : 'hover:bg-[#141724] border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#161a28] border border-gray-700">
                        <img 
                          src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(contact.username)}`} 
                          alt={contact.username} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090b12]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-purple-200' : 'text-white'}`}>
                          {contact.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                        {contact.badge || contact.bio || 'Lector en Yomori'}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs px-4">
                No tienes amigos añadidos todavía. Explora los chats de inicio o mangas y pulsa en los avatares para añadir amigos.
              </div>
            )}
          </div>
        </aside>

        {/* 2. PANEL DERECHO: SALA DE CHAT DIRECTO ACTIVA */}
        {activeUser ? (
          <main className="flex-1 flex flex-col bg-[#0f121d] min-w-0">
            
            {/* Cabecera del Chat Directo */}
            <div className="p-3.5 sm:p-4 border-b border-gray-800/80 bg-[#121524] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#181d2a] border border-purple-500/50">
                    <img 
                      src={activeUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeUser.username)}`} 
                      alt={activeUser.username} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#121524]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">
                      {activeUser.username}
                    </h4>
                    <span className="px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800/60">
                      {activeUser.badge || 'Lector'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {activeUser.bio || 'En línea'}
                  </p>
                </div>
              </div>

              {/* Botón Ver Perfil Completo */}
              <button
                onClick={() => onViewUserProfile && onViewUserProfile(activeUser.id)}
                className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800/60 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ver Perfil</span>
              </button>
            </div>

            {/* Mensajes del Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingChat ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Cargando conversación...</span>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.userId === currentUser.id;
                  const isMangaShare = msg.text.startsWith('📖 Te recomiendo este manga:');

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-md ${
                        isMe 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none' 
                          : 'bg-[#181c2c] border border-gray-800 text-gray-200 rounded-bl-none'
                      }`}>
                        
                        {/* Mensaje de Manga Compartido con Botón Interactivo */}
                        {isMangaShare ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Manga Compartido</span>
                            </div>
                            <p className="font-semibold text-white">
                              {msg.mangaTitle || msg.text}
                            </p>
                            {msg.mangaTitle && (
                              <button
                                onClick={() => {
                                  const found = [...library, ...catalog].find(m => m.title === msg.mangaTitle);
                                  if (found && onSelectManga) onSelectManga(found.url, found.extensionId);
                                }}
                                className="w-full py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Ver Manga</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="select-text whitespace-pre-wrap break-words">
                            <FormattedMessage text={msg.text} />
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-gray-500 font-mono mt-1 px-1">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
                  <MessageSquare className="w-8 h-8 text-gray-600" />
                  <span>Inicia la conversación con {activeUser.username}. ¡Escribe un mensaje o recomiéndale un manga!</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input para Escribir y Compartir Manga */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0d101a] border-t border-gray-800/90 flex items-center gap-2">
              
              {/* Botón Compartir Manga */}
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="p-2.5 rounded-xl bg-[#181c2c] hover:bg-purple-950/70 text-purple-400 hover:text-purple-300 border border-gray-700/80 transition active:scale-95 cursor-pointer shrink-0"
                title="Compartir un manga en el chat"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Escribe un mensaje a @${activeUser.username}...`}
                className="flex-1 bg-[#151928] border border-gray-700/80 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition select-text"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold transition active:scale-95 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </main>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs p-6">
            <MessageSquare className="w-10 h-10 mb-2 text-gray-600" />
            <span>Selecciona un amigo o chat de la lista izquierda para comenzar.</span>
          </div>
        )}

      </div>

      {/* Modal para Compartir Manga en el Chat */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#121624] border border-gray-800 rounded-3xl p-6 shadow-2xl text-left relative animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-400" />
                <h4 className="text-base font-bold text-white">Compartir Manga</h4>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={shareFilter}
              onChange={(e) => setShareFilter(e.target.value)}
              placeholder="Buscar en tus mangas para compartir..."
              className="w-full bg-[#181d2e] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500"
            />

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {availableShareMangas.map((m, idx) => (
                <div
                  key={m.url || idx}
                  onClick={() => handleShareManga(m)}
                  className="p-2 rounded-xl bg-[#181d2e] hover:bg-purple-950/60 border border-gray-800 hover:border-purple-600/60 flex items-center gap-3 transition cursor-pointer group"
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-black shrink-0">
                    <img src={m.coverProxy || m.cover} alt={m.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                      {m.title}
                    </h5>
                    <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                      {m.extension || 'Manga'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold shrink-0">
                    Enviar
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
