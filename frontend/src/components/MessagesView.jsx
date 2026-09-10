import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Search, 
  BookOpen, 
  UserPlus, 
  UserCheck, 
  X, 
  Loader2, 
  ExternalLink,
  Sparkles,
  Heart,
  Clock,
  Check,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import FormattedMessage from './FormattedMessage.jsx';
import RichCommentEditor from './RichCommentEditor.jsx';

export default function MessagesView({
  currentUser = null,
  initialActiveUserId = null,
  library = [],
  catalog = [],
  onSelectManga,
  onViewUserProfile,
  onOpenAuth
}) {
  const [activeTab, setActiveTab] = useState(initialActiveUserId ? 'chat' : 'online');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
  const [messageRequests, setMessageRequests] = useState([]);
  const [activeReadingFriends, setActiveReadingFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [addFriendInput, setAddFriendInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [addFriendFeedback, setAddFriendFeedback] = useState(null);

  const [searchContact, setSearchContact] = useState('');
  const messagesEndRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchSocialData = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get('/api/social/friends-and-dms', {
        headers: { 
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.id,
          'x-username': currentUser?.username
        }
      });
      if (res.data?.success) {
        setFriends(res.data.friends || []);
        setPendingRequests(res.data.pendingRequests || { incoming: [], outgoing: [] });
        setMessageRequests(res.data.messageRequests || []);
        setActiveReadingFriends(res.data.activeReadingFriends || []);
        setConversations(res.data.conversations || []);

        if (initialActiveUserId && !activeUser) {
          const found = (res.data.friends || []).find(f => f.id === initialActiveUserId);
          if (found) {
            setActiveUser(found);
            setActiveTab('chat');
          } else {
            axios.get(`/api/users/${encodeURIComponent(initialActiveUserId)}`).then(uRes => {
              if (uRes.data?.success) {
                setActiveUser(uRes.data.profile);
                setActiveTab('chat');
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error cargando datos sociales:', err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSocialData();
  }, [currentUser, initialActiveUserId]);

  const dmRoomId = (currentUser && activeUser)
    ? `dm:${[currentUser.id, activeUser.id].sort().join('_')}`
    : null;

  const isActiveUserFriend = Boolean(
    activeUser && friends.some(f => f.id === activeUser.id || f.username?.toLowerCase() === activeUser.username?.toLowerCase())
  );

  useEffect(() => {
    if (!dmRoomId || activeTab !== 'chat') return;

    let isMounted = true;
    setLoadingChat(true);

    axios.get(`/api/chat/history/${encodeURIComponent(dmRoomId)}`)
      .then(res => {
        if (isMounted && res.data?.messages) {
          setMessages(res.data.messages);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          }, 60);
        }
      })
      .catch(e => {})
      .finally(() => {
        if (isMounted) setLoadingChat(false);
      });

    const socket = getSocket();
    if (socket) {
      socket.emit('join_room', dmRoomId);

      const handleNewMessage = (msg) => {
        if (msg.roomId === dmRoomId) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      };

      const handleActivityUpdate = () => {
        fetchSocialData();
      };

      socket.on('new_message', handleNewMessage);
      socket.on('activity_update', handleActivityUpdate);

      return () => {
        socket.emit('leave_room', dmRoomId);
        socket.off('new_message', handleNewMessage);
        socket.off('activity_update', handleActivityUpdate);
      };
    }
  }, [dmRoomId, activeTab]);

  const handleSendDM = ({ text, images }) => {
    if (!currentUser || !dmRoomId || !activeUser) return;
    if (!text && (!images || images.length === 0)) return;

    setIsSending(true);
    const socket = getSocket();

    const payload = {
      roomId: dmRoomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: text || '',
      images: images || []
    };

    const finishSend = (createdMsg) => {
      setIsSending(false);
      if (createdMsg) {
        setMessages(prev => prev.some(m => m.id === createdMsg.id) ? prev : [...prev, createdMsg]);
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      }).catch(() => setIsSending(false));
    }
  };

  const handleSendFriendRequest = async (e) => {
    if (e) e.preventDefault();
    if (!addFriendInput.trim() || addingFriend) return;

    setAddingFriend(true);
    setAddFriendFeedback(null);

    try {
      const res = await axios.post('/api/social/friends/request', {
        username: addFriendInput.trim(),
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        userId: currentUser?.id
      }, {
        headers: { 
          Authorization: `Bearer ${currentUser?.token || ''}`,
          'x-user-id': currentUser?.id,
          'x-username': currentUser?.username
        }
      });

      if (res.data?.success) {
        setAddFriendFeedback({ type: 'success', text: res.data.message });
        setAddFriendInput('');
        fetchSocialData();

        const socket = getSocket();
        if (socket && res.data.targetUser?.id) {
          socket.emit('send_friend_request', {
            toUserId: res.data.targetUser.id,
            request: res.data.request || {
              fromUserId: currentUser.id,
              fromUsername: currentUser.username,
              fromAvatar: currentUser.avatar
            }
          });
        }
      }
    } catch (err) {
      setAddFriendFeedback({ type: 'error', text: err.response?.data?.message || 'Error al enviar solicitud.' });
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRespondRequest = async (requestId, action, fromUserId) => {
    try {
      const res = await axios.post('/api/social/friends/respond', {
        requestId,
        action
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (res.data?.success) {
        showToast(action === 'accept' ? '¡Solicitud aceptada!' : 'Solicitud rechazada');
        fetchSocialData();

        const socket = getSocket();
        if (socket && fromUserId) {
          socket.emit('respond_friend_request', {
            toUserId: fromUserId,
            action,
            request: { id: requestId, toUsername: currentUser.username }
          });
        }
      }
    } catch (err) {
      console.warn('Error respondiendo solicitud:', err);
    }
  };

  const handleAddFriendDirectly = async (targetUserId) => {
    try {
      const res = await axios.post('/api/social/friends/toggle', {
        targetUserId
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        showToast('¡Añadido a tus amigos con éxito!');
        fetchSocialData();
      }
    } catch (err) {}
  };

  if (!currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-[#0f131f] border border-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="w-18 h-18 mx-auto rounded-3xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <MessageSquare className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Mensajes y Amigos</h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Inicia sesión para hablar con tus amigos, ver qué mangas están leyendo en directo y enviar solicitudes de amistad.
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

  const filteredConversations = conversations.filter(c => 
    (c.user?.username || '').toLowerCase().includes(searchContact.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 py-4 pb-20 select-none animate-fadeIn">
      
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-2xl shadow-purple-600/50 animate-fade-in">
          {toastMessage}
        </div>
      )}

      <div className="rounded-3xl bg-[#090c13] border border-gray-800/90 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[84vh]">
        
        {/* 1. BARRA LATERAL IZQUIERDA: DMs Y BOTÓN AMIGOS */}
        <div className="w-full md:w-64 lg:w-72 bg-[#0c101a] border-r border-gray-800/80 flex flex-col shrink-0">
          
          <div className="p-3 border-b border-gray-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                placeholder="Buscar conversación..."
                className="w-full bg-[#131825] border border-gray-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="p-2 border-b border-gray-800/40">
            <button
              onClick={() => {
                setActiveTab('online');
                setActiveUser(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab !== 'chat' 
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Amigos</span>
              </div>
              {pendingRequests.incoming.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                  {pendingRequests.incoming.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <span>Mensajes directos</span>
              <span className="text-gray-600 font-mono">{conversations.length}</span>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                <p>Sin conversaciones activas.</p>
                <button
                  onClick={() => setActiveTab('online')}
                  className="mt-2 text-purple-400 hover:text-purple-300 underline font-semibold text-[11px]"
                >
                  Ver lista de amigos
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activeTab === 'chat' && activeUser?.id === c.user.id;
                return (
                  <button
                    key={c.roomId}
                    onClick={() => {
                      setActiveUser(c.user);
                      setActiveTab('chat');
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer text-left group ${
                      isSelected
                        ? 'bg-purple-600/20 text-white border border-purple-500/40 shadow-sm'
                        : 'text-gray-300 hover:text-white hover:bg-[#131826]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={c.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.user.username)}`} 
                        alt={c.user.username} 
                        className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0c101a]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate group-hover:text-purple-300 transition">
                          {c.user.username}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {c.lastMessage?.text || 'Iniciar conversación'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* 2. COLUMNA CENTRAL: AMIGOS / CHAT */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d1017]">
          
          <div className="h-14 px-4 bg-[#0f131f] border-b border-gray-800 flex items-center justify-between shrink-0">
            {activeTab === 'chat' && activeUser ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={activeUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeUser.username)}`} 
                    alt={activeUser.username}
                    className="w-7 h-7 rounded-full object-cover border border-purple-500/30"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0f131f]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>@{activeUser.username}</span>
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {isActiveUserFriend ? 'Amigo en Yomori' : 'Mensaje directo'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-1 text-gray-400 font-bold text-xs mr-2 shrink-0">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-white hidden sm:inline">Amigos</span>
                </div>

                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    activeTab === 'online' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Disponibles ({friends.length})
                </button>

                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    activeTab === 'all' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    activeTab === 'pending' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>Pendientes</span>
                  {pendingRequests.incoming.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                      {pendingRequests.incoming.length}
                    </span>
                  )}
                </button>

                {messageRequests.length > 0 && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      activeTab === 'requests' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>Solicitudes DM</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-black">
                      {messageRequests.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('add')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    activeTab === 'add' ? 'bg-emerald-600 text-white' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Añadir amigo</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {activeTab === 'chat' && activeUser ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {!isActiveUserFriend && (
                  <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-800/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200 animate-fade-in shrink-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span><strong>@{activeUser.username}</strong> no está en tu lista de amigos.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddFriendDirectly(activeUser.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Añadir a amigos
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loadingChat ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-2">
                      <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-gray-600">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Este es el comienzo de tu chat con @{activeUser.username}</h4>
                      <p className="text-xs text-gray-400 max-w-xs">
                        ¡Escribe un saludo, recomienda tus mangas favoritos o comparte imágenes!
                      </p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.userId === currentUser.id;
                      return (
                        <div key={m.id || idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start group`}>
                          <img 
                            src={m.userAvatar || (isMe ? currentUser.avatar : activeUser.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.username || 'user')}`} 
                            alt={m.username}
                            className="w-7 h-7 rounded-full object-cover border border-purple-500/30 shrink-0"
                          />
                          <div className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-purple-600 text-white rounded-tr-sm shadow-md' 
                              : 'bg-[#151a28] text-gray-200 rounded-tl-sm border border-gray-800'
                          }`}>
                            <FormattedMessage text={m.text} images={m.images} />
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-[#0f131f] border-t border-gray-800 shrink-0">
                  <RichCommentEditor
                    placeholder={`Enviar mensaje a @${activeUser.username}...`}
                    onSend={handleSendDM}
                    isSending={isSending}
                  />
                </div>

              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                
                {activeTab === 'add' && (
                  <div className="max-w-xl space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Añadir Amigo
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Puedes añadir amigos usando su nombre de usuario exacto en Yomori.
                      </p>
                    </div>

                    <form onSubmit={handleSendFriendRequest} className="relative">
                      <input
                        type="text"
                        value={addFriendInput}
                        onChange={(e) => setAddFriendInput(e.target.value)}
                        placeholder="Ejemplo: Rey_Palomo"
                        className="w-full bg-[#121624] border border-gray-700 rounded-2xl pl-4 pr-36 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
                      />
                      <button
                        type="submit"
                        disabled={!addFriendInput.trim() || addingFriend}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                      >
                        {addingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar solicitud'}
                      </button>
                    </form>

                    {addFriendFeedback && (
                      <div className={`p-3 rounded-xl text-xs font-semibold ${
                        addFriendFeedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                      }`}
                      >
                        {addFriendFeedback.text}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pending' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Solicitudes Recibidas ({pendingRequests.incoming.length})
                      </h3>
                    </div>

                    {pendingRequests.incoming.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No tienes solicitudes de amistad entrantes.</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingRequests.incoming.map((req) => (
                          <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#121624] border border-gray-800">
                            <div className="flex items-center gap-3">
                              <img src={req.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.fromUsername)}`} alt={req.fromUsername} className="w-9 h-9 rounded-full object-cover border border-purple-500/30" />
                              <div>
                                <span className="text-xs font-bold text-white">@{req.fromUsername}</span>
                                <span className="text-[10px] text-gray-400 block">Quiere ser tu amigo</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRespondRequest(req.id, 'accept', req.fromUserId)}
                                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm"
                                title="Aceptar solicitud"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRespondRequest(req.id, 'reject', req.fromUserId)}
                                className="p-2 rounded-xl bg-gray-800 hover:bg-rose-900 text-gray-300 hover:text-white transition cursor-pointer"
                                title="Rechazar solicitud"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Solicitudes de Mensajes Directos ({messageRequests.length})
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Mensajes recibidos de personas que no están en tu lista de amigos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {messageRequests.map((conv) => (
                        <div key={conv.roomId} className="flex items-center justify-between p-3 rounded-2xl bg-[#121624] border border-gray-800">
                          <div className="flex items-center gap-3">
                            <img src={conv.user.avatar} alt={conv.user.username} className="w-9 h-9 rounded-full object-cover border border-purple-500/30" />
                            <div>
                              <span className="text-xs font-bold text-white">@{conv.user.username}</span>
                              <p className="text-[11px] text-gray-400 truncate max-w-xs">{conv.lastMessage?.text || 'Nuevo mensaje'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveUser(conv.user);
                              setActiveTab('chat');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Abrir Chat
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTab === 'online' || activeTab === 'all') && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-bold tracking-wider">
                      <span>{activeTab === 'online' ? `Disponibles — ${friends.length}` : `Todos los amigos — ${friends.length}`}</span>
                    </div>

                    {friends.length === 0 ? (
                      <div className="text-center py-16 text-gray-500 space-y-2">
                        <Users className="w-12 h-12 mx-auto text-gray-700" />
                        <p className="text-xs font-bold text-gray-300">Aún no tienes amigos agregados</p>
                        <p className="text-[11px] text-gray-500">Pulsa en "Añadir amigo" para buscar lectores por su nombre de usuario.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {friends.map((f) => (
                          <div 
                            key={f.id}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-[#121624]/60 hover:bg-[#151b2c] border border-gray-800/80 hover:border-purple-600/40 transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <img src={f.avatar} alt={f.username} className="w-9 h-9 rounded-full object-cover border border-purple-500/30" />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#121624]" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate group-hover:text-purple-300 transition">
                                  @{f.username}
                                </span>
                                {f.readingActivity ? (
                                  <span className="text-[10px] text-purple-400 font-semibold truncate flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    Leyendo: {f.readingActivity.mangaTitle}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 truncate block">{f.bio || 'Leyendo en Yomori 📖'}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setActiveUser(f);
                                  setActiveTab('chat');
                                }}
                                className="p-2 rounded-xl bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white transition cursor-pointer shadow-sm"
                                title="Abrir chat privado"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

        {/* 3. COLUMNA DERECHA: "ACTIVO AHORA" (RICH PRESENCE DE MANGA) */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 bg-[#0c101a] border-l border-gray-800/80 p-4 shrink-0">
          
          <div className="flex items-center justify-between pb-3 border-b border-gray-800/60 mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Activo ahora</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {activeReadingFriends.length === 0 ? (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-900/80 flex items-center justify-center mx-auto text-gray-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-gray-400">Por ahora todo está tranquilo</h4>
                <p className="text-[11px] text-gray-600 max-w-xs">
                  Cuando tus amigos comiencen a leer un manga en directo, verás aquí su portada y capítulo actual.
                </p>
              </div>
            ) : (
              activeReadingFriends.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-[#121624] border border-gray-800 hover:border-purple-600/50 transition duration-300 shadow-md flex flex-col gap-2.5 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <img src={item.user.avatar} alt={item.user.username} className="w-7 h-7 rounded-full object-cover border border-purple-500/40" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#121624]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        @{item.user.username}
                      </span>
                      <span className="text-[9px] text-purple-400 font-semibold block">
                        Leyendo en Yomori
                      </span>
                    </div>
                  </div>

                  <div 
                    onClick={() => onSelectManga && onSelectManga(item.activity.url, item.activity.extensionId)}
                    className="flex gap-2.5 p-2 rounded-xl bg-[#0a0d15] border border-gray-800/80 hover:border-purple-500/60 transition cursor-pointer"
                    title="Clic para ver este manga"
                  >
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-900 shrink-0 border border-gray-800">
                      <img 
                        src={item.activity.cover || 'https://via.placeholder.com/150'} 
                        alt={item.activity.mangaTitle} 
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                          {item.activity.mangaTitle}
                        </h5>
                        <p className="text-[10px] text-gray-400 truncate">
                          {item.activity.chapterTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[9px] text-purple-400 font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Leyendo en vivo</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}