import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  ExternalLink, 
  Send, 
  Smile, 
  Lock, 
  Globe, 
  BookOpen, 
  Loader2,
  Sparkles,
  Trophy,
  Flame,
  ShieldCheck,
  Crown
} from 'lucide-react';

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

  const isMe = currentUser && (userId === currentUser.id || usernameFallback === currentUser.username);

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

    // Comprobar si es amigo
    if (currentUser && !isMe) {
      axios.get('/api/social/friends-and-dms', {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      }).then(res => {
        if (isMounted && res.data?.success) {
          const friends = res.data.friends || [];
          setIsFriend(friends.some(f => f.id === userId || f.username === usernameFallback));
        }
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [userId, usernameFallback, userAvatarFallback, currentUser, isMe]);

  const handleToggleFriend = async () => {
    if (!currentUser || isMe || !profile) return;
    try {
      const res = await axios.post('/api/social/friends/toggle', {
        targetUserId: profile.id
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        setIsFriend(res.data.isFriend);
      }
    } catch (e) {}
  };

  const handleSendQuickMessage = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser || !quickMsg.trim() || isMe || !profile) return;

    setSendingQuickMsg(true);
    const sortedIds = [currentUser.id, profile.id].sort();
    const dmRoomId = `dm:${sortedIds[0]}_${sortedIds[1]}`;

    try {
      await axios.post('/api/chat/send', {
        roomId: dmRoomId,
        text: quickMsg.trim()
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      setQuickMsg('');
      onClose();
      if (onOpenDirectChat) {
        onOpenDirectChat(profile.id, profile.username);
      }
    } catch (err) {
      console.error('Error enviando mensaje directo:', err);
    } finally {
      setSendingQuickMsg(false);
    }
  };

  const p = profile || {
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
    // Backdrop COMPLETAMENTE TRANSPARENTE (NO oscurece la pantalla)
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[340px] bg-[#111625] border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left relative animate-fadeInScale ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. CABECERA CON BANNER Y BOTONES DE ACCIÓN DISCORD (TOP RIGHT) */}
        <div 
          className="relative h-28 w-full p-3 flex justify-between items-start"
          style={{
            background: p.banner?.startsWith('http') ? `url(${p.banner}) center/cover no-repeat` : (p.banner || 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)')
          }}
        >
          {/* Sombra sutil */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111625] via-transparent to-black/30 pointer-events-none" />

          {/* Botones de Acción Estilo Discord (Top Right) */}
          <div className="relative z-10 ml-auto flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-lg">
            {!isMe && (
              <>
                {/* Botón Mensaje Directo */}
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

                {/* Botón Añadir Amigo */}
                <button
                  onClick={handleToggleFriend}
                  className={`p-1.5 rounded-xl transition active:scale-90 cursor-pointer ${
                    isFriend ? 'bg-emerald-600 text-white' : 'hover:bg-white/20 text-gray-200 hover:text-white'
                  }`}
                  title={isFriend ? 'Amigos (Clic para quitar)' : 'Añadir a mis amigos'}
                >
                  {isFriend ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5 text-emerald-300" />}
                </button>
              </>
            )}

            {/* Botón Ver Perfil Completo en Pantalla Integrada */}
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

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-200 hover:text-white transition active:scale-90 cursor-pointer"
              title="Cerrar tarjeta"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Avatar Flotante Superpuesto al Banner con Anillo Discord */}
          <div className="absolute left-4 -bottom-8 z-10">
            <div className="relative">
              <div className="w-18 h-18 rounded-full overflow-hidden bg-[#161a28] border-4 border-[#111625] shadow-2xl">
                <img 
                  src={p.avatar} 
                  alt={p.username} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-3 border-[#111625]" title="En Línea" />
            </div>
          </div>
        </div>

        {/* 2. CUERPO DE LA TARJETA */}
        <div className="pt-10 px-4 pb-4 space-y-3.5">
          
          {/* Nombre e Insignias Discord */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white truncate drop-shadow">
                {p.username}
              </h3>
            </div>

            {/* Fila de Insignias Discord Nitro/Fundador/Elite */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/80 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                <span>{p.badge || 'Lector'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>Nv. {p.stats?.level || 1}</span>
              </span>
            </div>
          </div>

          {/* Sobre mí / Bio */}
          <div className="p-2.5 rounded-2xl bg-[#161c2e] border border-gray-800">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              Sobre mí
            </span>
            <p className="text-xs text-gray-200 leading-snug">
              {p.bio || 'Leyendo mangas en Yomori 📖✨'}
            </p>
          </div>

          {/* Colección de Mangas (Miniaturas estilo Discord) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                Colección de Mangas
              </span>
              <span className="text-[10px] font-bold text-purple-400 font-mono">
                {libraryList.length} obras
              </span>
            </div>

            {isLibraryPublic ? (
              libraryList.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {libraryList.slice(0, 4).map((m, idx) => (
                    <div
                      key={m.url || idx}
                      onClick={() => {
                        if (onSelectManga) {
                          onSelectManga(m.url, m.extensionId);
                          onClose();
                        }
                      }}
                      className="w-12 aspect-[3/4] rounded-xl overflow-hidden bg-black border border-gray-700 hover:border-purple-500 shrink-0 cursor-pointer shadow-sm group"
                      title={m.title}
                    >
                      <img 
                        src={m.coverProxy || m.cover} 
                        alt={m.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                  ))}
                  {libraryList.length > 4 && (
                    <button
                      onClick={() => {
                        onClose();
                        if (onViewFullProfile) onViewFullProfile(p.id);
                      }}
                      className="w-10 aspect-[3/4] rounded-xl bg-[#161c2e] border border-gray-700 hover:border-purple-500 text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      +{libraryList.length - 4}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 py-1 pl-1">
                  Sin mangas guardados todavía.
                </p>
              )
            ) : (
              <div className="p-2 rounded-xl bg-[#161c2e] border border-amber-900/30 flex items-center gap-2 text-[11px] text-amber-300/80">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Biblioteca privada</span>
              </div>
            )}
          </div>

          {/* Input de Mensaje Directo Rápido Estilo Discord */}
          {!isMe && (
            <form onSubmit={handleSendQuickMessage} className="pt-1">
              <div className="flex items-center gap-1.5 bg-[#171d30] border border-gray-700/80 rounded-2xl px-3 py-1.5 focus-within:border-purple-500 transition shadow-inner">
                <input
                  type="text"
                  value={quickMsg}
                  onChange={(e) => setQuickMsg(e.target.value)}
                  placeholder={`Enviar mensaje a @${p.username}`}
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none select-text"
                />
                <button
                  type="submit"
                  disabled={!quickMsg.trim() || sendingQuickMsg}
                  className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer shrink-0"
                >
                  {sendingQuickMsg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
