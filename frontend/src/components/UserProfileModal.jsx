import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  User, 
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
  Eye,
  Calendar,
  Layers,
  Palette
} from 'lucide-react';

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

const BADGE_PRESETS = [
  'Lector Élite ⚡',
  'Cazador de Manhwas 🗡️',
  'Otaku Supremo 🌸',
  'Devorador de Capítulos 🔥',
  'Soberano de las Sombras 👑',
  'Crítico de Manga 📜',
  'Lector Legendario 🌟'
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSelectManga
}) {
  if (!isOpen || !currentUser) return null;

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'stats' | 'library'
  const [username, setUsername] = useState(currentUser.username || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [banner, setBanner] = useState(currentUser.banner || BANNER_PRESETS[0].value);
  const [bio, setBio] = useState(currentUser.bio || 'Leyendo en Yomori 📖✨');
  const [badge, setBadge] = useState(currentUser.badge || 'Lector Élite ⚡');
  const [isLibraryPublic, setIsLibraryPublic] = useState(currentUser.isLibraryPublic !== false);
  
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [isCustomBanner, setIsCustomBanner] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Sincronizar estado cuando cambie currentUser
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setAvatar(currentUser.avatar || '');
      setBanner(currentUser.banner || BANNER_PRESETS[0].value);
      setBio(currentUser.bio || 'Leyendo en Yomori 📖✨');
      setBadge(currentUser.badge || 'Lector Élite ⚡');
      setIsLibraryPublic(currentUser.isLibraryPublic !== false);
    }
  }, [currentUser]);

  const stats = currentUser.stats || {
    totalMangas: currentUser.library?.length || 0,
    totalChaptersRead: 0,
    readingHours: 0,
    readingMinutes: 0,
    level: 1,
    levelTitle: 'Lector Principiante',
    streakDays: 1
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const payload = {
        username: username.trim(),
        avatar: avatar.trim(),
        banner: banner.trim(),
        bio: bio.trim(),
        badge: badge.trim(),
        isLibraryPublic
      };

      const res = await axios.put('/api/auth/profile', payload, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      });

      if (res.data?.success && res.data.user) {
        setSaveSuccess(true);
        if (onUpdateUser) {
          onUpdateUser(res.data.user);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0d101a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-left relative animate-fadeInScale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white border border-white/10 transition active:scale-90 cursor-pointer shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. CABECERA CON BANNER ESTILO DISCORD */}
        <div 
          className="relative h-32 sm:h-40 w-full transition-all duration-500 flex items-end p-4 sm:p-6"
          style={{
            background: banner.startsWith('http') ? `url(${banner}) center/cover no-repeat` : banner
          }}
        >
          {/* Sombra inferior para transición suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d101a] via-[#0d101a]/40 to-transparent pointer-events-none" />

          {/* Avatar Flotante con Borde y Estado */}
          <div className="relative z-10 flex items-end gap-3.5 sm:gap-4 -mb-10 sm:-mb-12">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-[#161a28] border-4 border-[#0d101a] shadow-2xl shrink-0">
                <img 
                  src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`} 
                  alt={username} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0d101a]" title="En Línea" />
            </div>

            <div className="min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md truncate">
                  {username}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-800/80 text-[11px] font-bold shadow-md">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-purple-300/90 font-medium drop-shadow mt-0.5 truncate max-w-xs">
                {bio}
              </p>
            </div>
          </div>
        </div>

        {/* 2. PESTAÑAS DE NAVEGACIÓN */}
        <div className="pt-12 sm:pt-14 px-4 sm:px-6 border-b border-gray-800/80 bg-[#0a0d15] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Editar Perfil</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stats'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Estadísticas de Lectura</span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'library'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Mi Biblioteca ({currentUser.library?.length || 0})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 pb-3">
            {isLibraryPublic ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Globe className="w-3.5 h-3.5" />
                <span>Biblioteca Pública</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Biblioteca Privada</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. CONTENIDO SEGÚN LA PESTAÑA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">

          {/* PESTAÑA 1: EDITAR PERFIL */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Notificaciones */}
              {saveSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>¡Cambios guardados con éxito! Tu nuevo perfil se verá en todos los chats.</span>
                </div>
              )}
              {saveError && (
                <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <X className="w-4 h-4 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Nombre de Usuario y Título */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={30}
                    className="w-full bg-[#141824] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition select-text"
                    placeholder="Tu apodo visible en chats..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Insignia / Título de Lector
                  </label>
                  <select
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="w-full bg-[#141824] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-purple-300 font-semibold focus:outline-none focus:border-purple-500 transition cursor-pointer"
                  >
                    {BADGE_PRESETS.map((b) => (
                      <option key={b} value={b} className="bg-[#141824] text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado / Bio personalizada */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Estado / Biografía Personalizada
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={120}
                  className="w-full bg-[#141824] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition select-text"
                  placeholder="Ej: Leyendo manhwas de artes marciales 🗡️"
                />
                <span className="text-[10px] text-gray-500 block text-right mt-1 font-mono">
                  {bio.length}/120
                </span>
              </div>

              {/* Selector de Banner estilo Discord */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Banner de Perfil (Estilo Discord)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
                  {BANNER_PRESETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBanner(b.value)}
                      className={`h-12 rounded-xl p-2 flex items-center justify-between border transition relative overflow-hidden group cursor-pointer ${
                        banner === b.value ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-gray-700/80 hover:border-gray-500'
                      }`}
                      style={{ background: b.value }}
                    >
                      <span className="text-[10px] font-extrabold text-white drop-shadow bg-black/40 px-1.5 py-0.5 rounded-md">
                        {b.name}
                      </span>
                      {banner === b.value && (
                        <Check className="w-4 h-4 text-white drop-shadow bg-black/40 p-0.5 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Avatares Predeterminados o URL */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  <span>Foto de Perfil / Avatar</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AVATAR_PRESETS.map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(pUrl)}
                      className={`w-11 h-11 rounded-2xl overflow-hidden bg-[#161a28] border-2 transition cursor-pointer ${
                        avatar === pUrl ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105' : 'border-gray-700/80 hover:border-gray-500'
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
                  className="w-full bg-[#141824] border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500 select-text"
                />
              </div>

              {/* Switch de Privacidad de la Biblioteca */}
              <div className="p-4 rounded-2xl bg-[#131826] border border-gray-800 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">
                    Visibilidad de mi Biblioteca
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Permitir que otros lectores vean tus mangas favoritos al hacer click en tu foto de perfil en el chat.
                  </p>
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

              {/* Botón Guardar Cambios */}
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
                      <span>Guardar Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* PESTAÑA 2: ESTADÍSTICAS DE LECTURA (Estilo AniList / Tachiyomi) */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Tarjetas de Estadísticas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Mangas en Lista
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {stats.totalMangas || 0}
                    </span>
                    <BookOpen className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Capítulos Leídos
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {stats.totalChaptersRead || 0}
                    </span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Tiempo de Lectura
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {stats.readingHours || 0}h
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {stats.readingMinutes || 0}m
                    </span>
                    <Clock className="w-4 h-4 text-blue-400 ml-auto" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#121624] border border-gray-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Racha de Días
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {stats.streakDays || 1} 🔥
                    </span>
                    <Calendar className="w-4 h-4 text-emerald-400 ml-auto" />
                  </div>
                </div>
              </div>

              {/* Nivel y Rango de Lector */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#131828] to-[#101422] border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-300">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {stats.levelTitle || 'Lector Élite'}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Nivel de Lector: <span className="text-purple-300 font-bold font-mono">{stats.level || 1}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {stats.totalChaptersRead % 20}/20 Cap. para subir
                  </span>
                </div>

                {/* Barra de Progreso de Nivel */}
                <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((stats.totalChaptersRead % 20) / 20) * 100 || 15)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: MI BIBLIOTECA */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">
                  Mangas guardados en tu cuenta:
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  {currentUser.library?.length || 0} títulos
                </span>
              </div>

              {currentUser.library && currentUser.library.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {currentUser.library.map((manga, idx) => (
                    <div
                      key={manga.url || idx}
                      onClick={() => {
                        if (onSelectManga) {
                          onSelectManga(manga.url, manga.extensionId);
                          onClose();
                        }
                      }}
                      className="p-2 rounded-2xl bg-[#121624] border border-gray-800 hover:border-purple-600/70 transition group cursor-pointer"
                    >
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black mb-2 relative">
                        <img 
                          src={manga.coverProxy || manga.cover} 
                          alt={manga.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded-md bg-purple-950/80 text-purple-300 text-[9px] font-bold">
                          {manga.category || 'General'}
                        </div>
                      </div>
                      <h5 className="text-xs font-bold text-gray-200 group-hover:text-purple-300 line-clamp-1">
                        {manga.title}
                      </h5>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 text-xs">
                  Aún no tienes mangas en tu biblioteca. Explora y añade tus favoritos.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
