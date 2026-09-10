import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  ExternalLink, 
  Send, 
  BookOpen, 
  Loader2,
  Sparkles,
  Crown
} from 'lucide-react';
import { getSocket } from '../services/socket.js';

export default function UserCardPopover({
  userId,
  usernameFallback,
  userAvatarFallback,
  isOpen,
  onClose,
  currentUser,
  onViewFullProfile,
  onOpenDirectChat,
  onSelectManga
}) {
  if (!isOpen || (!userId && !usernameFallback)) return null;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [quickMsg, setQuickMsg] = useState('');
  const [sendingQuickMsg, setSendingQuickMsg] = useState(false);

  const isMe = Boolean(
    currentUser && (
      (userId && userId === currentUser.id) ||
      (usernameFallback && usernameFallback.toLowerCase() === currentUser.username.toLowerCase()) ||
      (profile && (profile.id === currentUser.id || profile.username?.toLowerCase() === currentUser.username.toLowerCase()))
    )
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const target = userId || usernameFallback;
    axios.get(`/api/users/${encodeURIComponent(target)}`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setProfile(res.data.profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile({
            id: userId || 'usr_guest',
            username: usernameFallback || 'Lector de Yomori',
            avatar: userAvatarFallback || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(usernameFallback || 'Lector')}`,
            banner: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
            bio: 'Lector activo en la comunidad de Yomori ✨',
            badge: 'Lector Élite ⚡',
            isLibraryPublic: true,
            library: [],
            stats: { totalMangas: 0, totalChaptersRead: 12, readingHours: 1, level: 2 }
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    if (currentUser) {
      axios.get('/api/social/friends-and-dms', {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (isMounted && res.data?.success) {
          const friends = res.data.friends || [];
          setIsFriend(friends.some(f => f.id === userId || f.username?.toLowerCase() === (usernameFallback || '').toLowerCase()));
        }
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [userId, usernameFallback, userAvatarFallback, currentUser]);

  const [requestSent, setRequestSent] = useState(false);

  const handleToggleFriend = async () => {
    if (!currentUser || isMe || !profile) return;
    try {
      const res = await axios.post('/api/social/friends/request', {
        targetUserId: profile.id,
        targetUsername: profile.username,
        username: profile.username
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        if (res.data.status === 'accepted') {
          setIsFriend(true);
        } else {
          setRequestSent(true);
        }
        const socket = getSocket();
        if (socket) {
          socket.emit('send_friend_request', {
            toUserId: profile.id,
            request: res.data.request || {
              id: 'req_' + Date.now(),
              fromUserId: currentUser.id,
              fromUsername: currentUser.username,
              fromAvatar: currentUser.avatar,
              toUserId: profile.id,
              toUsername: profile.username
            }
          });
        }
      }
    } catch (e) {}
  };

  const handleSendQuickMessage = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser || !quickMsg.trim() || isMe || !profile) return;

    setSendingQuickMsg(true);
    const targetId = profile.id;
    const targetUsername = profile.username;
    const sortedIds = [currentUser.id, targetId].sort();
    const dmRoomId = `dm:${sortedIds[0]}_${sortedIds[1]}`;

    const payload = {
      roomId: dmRoomId,
      token: currentUser.token,
      userId: currentUser.id,
      username: currentUser.username,
      text: quickMsg.trim()
    };

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', payload);
    }

    try {
      await axios.post('/api/chat/send', payload, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
    } catch (err) {
      console.warn('Error enviando DM:', err);
    } finally {
      setSendingQuickMsg(false);
      setQuickMsg('');
      onClose();
      if (onOpenDirectChat) {
        onOpenDirectChat(targetId, targetUsername);
      }
    }
  };

  const p = profile || {
    id: userId,
    username: usernameFallback || 'Usuario',
    avatar: userAvatarFallback || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(usernameFallback || 'User')}`,
    banner: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
    bio: 'Leyendo en Yomori...',
    badge: 'Lector Élite',
    isLibraryPublic: true,
    library: [],
    stats: { totalMangas: 0, totalChaptersRead: 0, readingHours: 0, level: 1 }
  };

  const isLibraryPublic = p.isLibraryPublic !== false;
  const libraryList = Array.isArray(p.library) ? p.library : [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 select-none animate-fadeIn backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[340px] bg-[#111625] border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left relative animate-fadeInScale ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative h-28 w-full p-3 flex justify-between items-start"
          style={{
            background: p.banner?.startsWith('http') ? `url(${p.banner}) center/cover no-repeat` : (p.banner || 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)')
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#111625] via-transparent to-black/30 pointer-events-none" />

          {!isMe && (
            <div className="relative z-10 ml-auto flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenDirectChat) onOpenDirectChat(p.id, p.username);
                }}
                className="p-1.5 rounded-xl hover:bg-white/20 text-gray-200 hover:text-white transition active:scale-90 cursor-pointer"
                title="Enviar mensaje directo"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
              </button>

              <button
                onClick={handleToggleFriend}
                disabled={requestSent}
                className={`p-1.5 rounded-xl transition active:scale-90 cursor-pointer ${
                  isFriend 
                    ? 'bg-emerald-600 text-white' 
                    : requestSent 
                      ? 'bg-amber-600/80 text-white' 
                      : 'hover:bg-white/20 text-gray-200 hover:text-white'
                }`}
                title={isFriend ? 'Amigos' : requestSent ? 'Solicitud enviada' : 'Añadir a mis amigos'}
              >
                {isFriend ? <UserCheck className="w-3.5 h-3.5" /> : requestSent ? <Clock className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5 text-emerald-300" />}
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onViewFullProfile) onViewFullProfile(p.id);
                }}
                className="p-1.5 rounded-xl hover:bg-white/20 text-gray-200 hover:text-white transition active:scale-90 cursor-pointer"
                title="Ver perfil completo"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
              </button>
            </div>
          )}
        </div>

        <div className="px-5 relative pb-5">
          <div className="relative -mt-12 mb-3 inline-block">
            <div className="w-20 h-20 rounded-full border-4 border-[#111625] overflow-hidden bg-gray-900 shadow-xl">
              <img 
                src={p.avatar} 
                alt={p.username} 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111625]" title="En línea" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white truncate">
                {p.username}
              </h3>
              {isMe && (
                <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[10px] font-extrabold">
                  TÚ
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                <Sparkles className="w-2.5 h-2.5" />
                {p.badge || 'Lector Élite'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                <Crown className="w-2.5 h-2.5" />
                Nv. {p.stats?.level || 1}
              </span>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-[#0b0e18] border border-gray-800/80 text-xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Sobre mí
            </span>
            <p className="text-gray-300 text-xs leading-relaxed">
              {p.bio || 'Leyendo en Yomori ✨'}
            </p>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Colección de mangas
              </span>
              <span className="text-[10px] text-purple-400 font-bold">
                {libraryList.length} obras
              </span>
            </div>

            {isLibraryPublic && libraryList.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {libraryList.slice(0, 4).map((m, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onClose();
                      if (onSelectManga) onSelectManga(m.url, m.extensionId);
                    }}
                    className="w-14 shrink-0 rounded-lg overflow-hidden border border-gray-800 hover:border-purple-500 transition cursor-pointer group"
                    title={m.title}
                  >
                    <div className="aspect-[3/4] bg-gray-900 overflow-hidden">
                      <img src={m.cover} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic">
                {isLibraryPublic ? 'Sin mangas guardados todavía.' : 'Colección privada.'}
              </p>
            )}
          </div>

          {!isMe && (
            <form onSubmit={handleSendQuickMessage} className="mt-4 relative">
              <input
                type="text"
                value={quickMsg}
                onChange={(e) => setQuickMsg(e.target.value)}
                placeholder={`Enviar mensaje a @${p.username}`}
                className="w-full bg-[#0b0e18] border border-gray-800 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!quickMsg.trim() || sendingQuickMsg}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white transition active:scale-95 cursor-pointer"
                title="Enviar mensaje"
              >
                {sendingQuickMsg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}