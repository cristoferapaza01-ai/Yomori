import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  User, 
  ArrowLeft, 
  Camera, 
  Sparkles, 
  Flame, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  Check, 
  Lock, 
  Globe, 
  Edit3, 
  Save, 
  Loader2, 
  Trophy, 
  Heart, 
  BookmarkCheck,
  Calendar,
  Layers,
  Palette,
  MessageSquare,
  UserPlus,
  UserCheck,
  Share2,
  Zap,
  Target
} from 'lucide-react';
import { 
  calculateReaderRank, 
  updateReadingStreak, 
  getReadingStreak, 
  getReadingTimeStats, 
  calculateTotalUniqueReadChapters,
  READER_RANKS
} from '../services/readerRankService.js';

const BANNER_PRESETS = [
  { id: 'purple_indigo', name: 'Neón Yomori', value: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' },
  { id: 'cyber_dark', name: 'Cyberpunk Oscuro', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)' },
  { id: 'fire_flame', name: 'Fuego Carmesí', value: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 50%, #f59e0b 100%)' },
  { id: 'emerald_matrix', name: 'Esmeralda', value: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)' },
  { id: 'ocean_blue', name: 'Océano Profundo', value: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #06b6d4 100%)' },
  { id: 'galaxy', name: 'Galaxia Cósmica', value: 'linear-gradient(135deg, #3b0764 0%, #701a75 50%, #1e1b4b 100%)' }
];

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=YomoriWarrior',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowHunter',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SakuraManga',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberOtaku',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DragonKnight',
  'https://api.dicebear.com/7.x/bottts/svg?seed=MoonPrincess',
  'https://api.dicebear.com/7.x/bottts/svg?seed=KitsuneSage',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ReaperSlayer'
];

export default function ProfileView({
  targetUserId = null,
  currentUser = null,
  library = [],
  readChaptersMap = {},
  history = [],
  settings = {},
  onUpdateCurrentUser,
  onSelectManga,
  onOpenDirectChat,
  onBack
}) {
  const isMyProfile = !targetUserId || (currentUser && targetUserId === currentUser.id);

  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'stats' | 'edit'
  const [profileData, setProfileData] = useState(isMyProfile ? currentUser : null);
  const [loading, setLoading] = useState(!isMyProfile);
  const [isFriend, setIsFriend] = useState(false);

  // Estados de edición (para perfil propio)
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');
  const [bio, setBio] = useState('');
  const [isLibraryPublic, setIsLibraryPublic] = useState(true);
  const [shareReadingActivity, setShareReadingActivity] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Cargar datos del perfil
  useEffect(() => {
    if (isMyProfile) {
      setProfileData(currentUser);
      if (currentUser) {
        setAvatar(currentUser.avatar || '');
        setBanner(currentUser.banner || BANNER_PRESETS[0].value);
        setBio(currentUser.bio || 'Leyendo en Yomori 📖✨');
        setIsLibraryPublic(currentUser.isLibraryPublic !== false && settings?.publicLibrary !== false);
        setShareReadingActivity(currentUser.shareReadingActivity !== false);
      }
      setLoading(false);
    } else {
      setLoading(true);
      axios.get(`/api/users/${encodeURIComponent(targetUserId)}`)
        .then(res => {
          if (res.data?.success) {
            setProfileData(res.data.profile);
          }
        })
        .catch(err => {
          console.warn('[ProfileView] Error:', err.message);
        })
        .finally(() => {
          setLoading(false);
        });

      // Verificar si es amigo
      if (currentUser) {
        axios.get('/api/social/friends-and-dms', {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        }).then(res => {
          if (res.data?.success) {
            const friends = res.data.friends || [];
            setIsFriend(friends.some(f => f.id === targetUserId));
          }
        }).catch(() => {});
      }
    }
  }, [targetUserId, isMyProfile, currentUser, settings?.publicLibrary]);

  const handleToggleFriend = async () => {
    if (!currentUser || isMyProfile || !profileData) return;
    try {
      const res = await axios.post('/api/social/friends/toggle', {
        targetUserId: profileData.id
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        setIsFriend(res.data.isFriend);
      }
    } catch (err) {
      console.error('Error al toggle amigo:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!isMyProfile || !currentUser) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const payload = {
        avatar: avatar.trim(),
        banner: banner.trim(),
        bio: bio.trim(),
        badge: rankInfo.badge,
        isLibraryPublic,
        shareReadingActivity
      };

      const res = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (res.data?.success && res.data.user) {
        setSaveSuccess(true);
        setProfileData(res.data.user);
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(res.data.user);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cálculos reales de estadísticas, rango y tiempo de lectura
  const totalChaptersRead = useMemo(() => {
    if (isMyProfile) {
      return calculateTotalUniqueReadChapters(library, readChaptersMap, history);
    }
    return profileData?.stats?.totalChaptersRead || 0;
  }, [isMyProfile, library, readChaptersMap, history, profileData?.stats?.totalChaptersRead]);

  const rankInfo = useMemo(() => {
    return calculateReaderRank(totalChaptersRead);
  }, [totalChaptersRead]);

  const readingTime = useMemo(() => {
    if (isMyProfile) {
      return getReadingTimeStats(totalChaptersRead);
    }
    return {
      hours: profileData?.stats?.readingHours || 0,
      minutes: profileData?.stats?.readingMinutes || 0
    };
  }, [isMyProfile, totalChaptersRead, profileData?.stats]);

  const readingStreak = useMemo(() => {
    if (isMyProfile) {
      return getReadingStreak();
    }
    return profileData?.stats?.streakDays || 1;
  }, [isMyProfile, profileData?.stats?.streakDays]);

  const libraryList = useMemo(() => {
    if (isMyProfile) {
      return Array.isArray(library) ? library : [];
    }
    return Array.isArray(profileData?.library) ? profileData.library : [];
  }, [isMyProfile, library, profileData?.library]);

  const isLibraryPrivate = isMyProfile 
    ? (settings?.publicLibrary === false || currentUser?.isLibraryPublic === false)
    : (profileData?.isLibraryPublic === false);

  const canViewLibrary = isMyProfile || !isLibraryPrivate;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="text-xs text-gray-400">Cargando perfil de usuario...</span>
      </div>
    );
  }

  const p = profileData || currentUser || {
    username: 'Usuario',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=User',
    banner: BANNER_PRESETS[0].value,
    bio: 'Leyendo en Yomori 📖✨',
    badge: rankInfo.badge
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 select-none animate-fadeIn">
      
      {/* Botón Volver si se está viendo el perfil de otra persona */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 px-3.5 py-2 rounded-xl bg-[#141822] hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition hover:-translate-x-1 active:scale-95 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      )}

      {/* 1. CABECERA INTEGRADA CON BANNER ESTILO DISCORD */}
      <div className="rounded-3xl bg-[#101422] border border-gray-800 shadow-2xl overflow-hidden mb-8">
        
        {/* Banner */}
        <div 
          className="relative h-48 sm:h-64 w-full transition-all duration-500 flex items-end p-6"
          style={{
            background: p.banner?.startsWith('http') ? `url(${p.banner}) center/cover no-repeat` : (p.banner || BANNER_PRESETS[0].value)
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#101422] via-[#101422]/30 to-transparent pointer-events-none" />

          {/* Avatar e Información Principal */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full -mb-16 sm:-mb-14">
            
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-[#161a28] border-4 border-[#101422] shadow-2xl shrink-0">
                  <img 
                    src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`} 
                    alt={p.username} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-[#101422]" title="En Línea" />
              </div>

              <div className="pb-3">
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                  {p.username}
                </h1>
                
                {/* Rango de Lector Debajo del Nombre de Usuario y Encima de la Biografía */}
                <div className="mt-1.5 mb-1.5 flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${rankInfo.bg} ${rankInfo.border} border text-xs font-black ${rankInfo.text} shadow-lg backdrop-blur-md`}>
                    <span>{rankInfo.badge}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/50 text-purple-300 font-bold">
                      Nivel {rankInfo.level}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-purple-200/90 font-medium drop-shadow">
                  {p.bio || 'Leyendo en Yomori 📖✨'}
                </p>
              </div>
            </div>

            {/* Acciones de Cabecera (Añadir Amigo, Mensaje, Editar) */}
            <div className="flex items-center gap-2.5 pb-3">
              {!isMyProfile && (
                <>
                  <button
                    onClick={handleToggleFriend}
                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                      isFriend 
                        ? 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                    }`}
                  >
                    {isFriend ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Amigos</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Añadir Amigo</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onOpenDirectChat && onOpenDirectChat(p.id, p.username)}
                    className="px-4 py-2.5 rounded-2xl bg-[#1b2234] hover:bg-[#232b42] border border-gray-700/80 text-white font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span>Mensaje Directo</span>
                  </button>
                </>
              )}

              {isMyProfile && (
                <button
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Perfil</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Pestañas de Navegación del Perfil */}
        <div className="pt-20 px-6 border-t border-gray-800/80 bg-[#0d101a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('library')}
              className={`pb-4 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'library'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Colección & Biblioteca ({libraryList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-4 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'stats'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Estadísticas de Lectura</span>
            </button>

            {isMyProfile && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`pb-4 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'edit'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Personalizar Perfil</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-4">
            {!isLibraryPrivate ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-xs font-bold text-emerald-400 font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span>Biblioteca Pública</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-xs font-bold text-amber-400 font-mono">
                <Lock className="w-3.5 h-3.5" />
                <span>{isMyProfile ? 'Biblioteca Privada (Solo tú)' : 'Biblioteca Privada'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. CONTENIDO PRINCIPAL */}
      {/* PESTAÑA: BIBLIOTECA */}
      {activeTab === 'library' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">
                {isMyProfile ? 'Tu Colección de Mangas' : `Mangas de ${p.username}`}
              </h3>
              <p className="text-xs text-gray-400">
                {canViewLibrary ? `${libraryList.length} obras guardadas` : 'Esta biblioteca es privada.'}
              </p>
            </div>
          </div>

          {canViewLibrary ? (
            libraryList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {libraryList.map((manga, idx) => (
                  <div
                    key={manga.url || idx}
                    onClick={() => onSelectManga && onSelectManga(manga.url, manga.extensionId)}
                    className="group bg-[#121624] border border-gray-800 hover:border-purple-600/70 rounded-2xl p-2.5 transition-all duration-300 hover:-translate-y-1 shadow-lg cursor-pointer"
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black mb-2 relative shadow-md">
                      <img 
                        src={manga.coverProxy || manga.cover} 
                        alt={manga.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute top-1 right-1 px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-300 border border-purple-800/60 text-[9px] font-bold">
                        {manga.category || 'General'}
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 line-clamp-2 transition leading-tight">
                      {manga.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-[#101420] border border-gray-800 text-gray-400 text-xs">
                No hay mangas en esta biblioteca por el momento.
              </div>
            )
          ) : (
            <div className="p-12 text-center rounded-3xl bg-[#101420] border border-amber-900/30 text-amber-300/80 text-xs flex flex-col items-center justify-center gap-2">
              <Lock className="w-8 h-8 text-amber-400 mb-1" />
              <span className="font-bold text-sm">Biblioteca Privada</span>
              <p className="text-gray-400 max-w-sm">
                Este usuario ha configurado su biblioteca como privada. Solo él puede ver sus obras añadidas.
              </p>
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA: ESTADÍSTICAS DE LECTURA */}
      {activeTab === 'stats' && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between shadow-lg">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Mangas en Lista
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black text-white font-mono">{libraryList.length}</span>
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between shadow-lg">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Capítulos Leídos
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black text-white font-mono">{totalChaptersRead}</span>
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between shadow-lg">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Tiempo de Lectura
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black text-white font-mono">{readingTime.hours}h</span>
                <span className="text-xs text-gray-400 font-mono font-bold">{readingTime.minutes}m</span>
                <Clock className="w-5 h-5 text-blue-400 ml-auto" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between shadow-lg">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Racha de Días
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black text-white font-mono">{readingStreak} 🔥</span>
                <Calendar className="w-5 h-5 text-emerald-400 ml-auto" />
              </div>
            </div>
          </div>

          {/* Tarjeta Progresiva de Misión y Rango */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#131828] to-[#101422] border border-purple-800/50 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="p-3.5 rounded-2xl bg-purple-600/30 border border-purple-500/50 text-purple-300 shadow-inner">
                  <Trophy className="w-7 h-7 text-yellow-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-white">
                      {rankInfo.badge}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/40">
                      Nivel {rankInfo.level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {rankInfo.isMax
                      ? '👑 ¡Has alcanzado el rango máximo celestial de Yomori!'
                      : `Misión activa: Lee ${rankInfo.chaptersRemaining} capítulo${rankInfo.chaptersRemaining > 1 ? 's' : ''} más para subir de rango.`
                    }
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-mono font-extrabold text-purple-300">
                  {rankInfo.isMax 
                    ? '100% Completado'
                    : `${rankInfo.totalChaptersRead}/${rankInfo.nextGoal} Capítulos (${rankInfo.progressPercent}%)`
                  }
                </span>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full h-3.5 bg-gray-900 rounded-full overflow-hidden p-0.5 border border-purple-900/40">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 rounded-full transition-all duration-700 shadow-md shadow-purple-500/50"
                style={{ width: `${rankInfo.progressPercent}%` }}
              />
            </div>

            {/* Próximos Rangos Desbloqueables */}
            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span>Nivel Actual: <strong className="text-white">{rankInfo.title}</strong></span>
              {!rankInfo.isMax && (
                <span>Siguiente Rango: <strong className="text-purple-300">{READER_RANKS[rankInfo.level]?.title} ({rankInfo.nextGoal} caps)</strong></span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* PESTAÑA: EDITAR PERFIL (Solo perfil propio) */}
      {activeTab === 'edit' && isMyProfile && (
        <section className="bg-[#101420] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Perfil actualizado con éxito! Tus cambios ya están visibles para toda la comunidad.</span>
              </div>
            )}
            {saveError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <X className="w-4 h-4 text-rose-400" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Insignia / Título de Lector Automático */}
            <div className="p-4 rounded-2xl bg-[#131826] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Insignia / Rango de Lector</span>
                <p className="text-[11px] text-gray-400 mt-0.5">Tu rango se actualiza y desbloquea automáticamente leyendo más capítulos.</p>
              </div>
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${rankInfo.bg} ${rankInfo.border} border text-xs font-black ${rankInfo.text} shrink-0`}>
                <span>{rankInfo.badge}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-purple-300">Nivel {rankInfo.level}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                Estado / Biografía Personalizada
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={120}
                className="w-full bg-[#141824] border border-gray-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition select-text"
                placeholder="Ej: Leyendo Solo Leveling 🗡️"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2.5 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Banner de Perfil (Estilo Discord)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {BANNER_PRESETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBanner(b.value)}
                    className={`h-14 rounded-2xl p-2.5 flex items-center justify-between border transition relative overflow-hidden cursor-pointer ${
                      banner === b.value ? 'border-purple-400 ring-2 ring-purple-500/60' : 'border-gray-700 hover:border-gray-500'
                    }`}
                    style={{ background: b.value }}
                  >
                    <span className="text-[11px] font-extrabold text-white drop-shadow bg-black/40 px-2 py-0.5 rounded-md">
                      {b.name}
                    </span>
                    {banner === b.value && <Check className="w-4 h-4 text-white drop-shadow bg-black/50 rounded-full p-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2.5 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-400" />
                <span>Foto de Perfil / Avatar</span>
              </label>
              <div className="flex flex-wrap gap-2.5 mb-3">
                {AVATAR_PRESETS.map((pUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(pUrl)}
                    className={`w-12 h-12 rounded-2xl overflow-hidden bg-[#161a28] border-2 transition cursor-pointer ${
                      avatar === pUrl ? 'border-purple-500 ring-2 ring-purple-500/60 scale-105' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img src={pUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="O pega una URL de imagen personalizada..."
                className="w-full bg-[#141824] border border-gray-700/80 rounded-2xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-purple-500 select-text"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#131826] border border-gray-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">Visibilidad de mi Biblioteca</span>
                <p className="text-[11px] text-gray-400 mt-0.5">Permitir que otros lectores vean tus mangas guardados.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isLibraryPublic}
                  onChange={(e) => setIsLibraryPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-[#131826] border border-gray-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white block">Compartir actividad en tiempo real ("Activo ahora")</span>
                <p className="text-[11px] text-gray-400 mt-0.5">Permitir que tus amigos vean lo que estás leyendo y tu progreso en vivo.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={shareReadingActivity}
                  onChange={(e) => setShareReadingActivity(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

    </div>
  );
}
