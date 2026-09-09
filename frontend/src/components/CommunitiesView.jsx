import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Globe, 
  Flame, 
  Sparkles, 
  MessageSquare, 
  ArrowLeft, 
  Check, 
  X, 
  Loader2, 
  Search,
  ShieldCheck,
  Palette
} from 'lucide-react';
import LiveChatRoom from './LiveChatRoom.jsx';

const COMM_BANNER_PRESETS = [
  'linear-gradient(135deg, #b91c1c 0%, #ea580c 50%, #f59e0b 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #6366f1 100%)',
  'linear-gradient(135deg, #db2777 0%, #f43f5e 50%, #fb7185 100%)',
  'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #06b6d4 100%)'
];

const EMOJI_ICONS = ['⚔️', '🐉', '🌸', '🏰', '⚡', '🔥', '👑', '📜', '✨', '🎮'];

export default function CommunitiesView({
  currentUser = null,
  onOpenAuth,
  onOpenUserCard,
  onSelectManga
}) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para crear nueva comunidad
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommCat, setNewCommCat] = useState('Acción & Manhwa');
  const [newCommIcon, setNewCommIcon] = useState('⚔️');
  const [newCommBanner, setNewCommBanner] = useState(COMM_BANNER_PRESETS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchCommunities = async () => {
    try {
      const res = await axios.get('/api/social/communities');
      if (res.data?.success) {
        setCommunities(res.data.communities || []);
      }
    } catch (e) {
      console.warn('Error fetching communities:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleCreateCommunity = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    if (!newCommName.trim()) return;

    setIsCreating(true);
    try {
      const res = await axios.post('/api/social/communities', {
        name: newCommName.trim(),
        description: newCommDesc.trim(),
        category: newCommCat,
        icon: newCommIcon,
        banner: newCommBanner
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (res.data?.success && res.data.community) {
        setCommunities(prev => [res.data.community, ...prev]);
        setSelectedCommunity(res.data.community);
        setShowCreateModal(false);
        setNewCommName('');
        setNewCommDesc('');
      }
    } catch (err) {
      console.error('Error creando comunidad:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const categories = ['all', 'Acción & Aventura', 'Cultivo & Manhwa', 'Romance & Drama', 'Fantasía & Isekai'];

  const filteredCommunities = communities.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory;
    const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Si se seleccionó una comunidad, mostrar su sala dedicada de chat y debate en tiempo real
  if (selectedCommunity) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 select-none animate-fadeIn">
        
        {/* Botón Volver a la Lista de Comunidades */}
        <button
          onClick={() => setSelectedCommunity(null)}
          className="mb-4 px-3.5 py-2 rounded-xl bg-[#141822] hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition hover:-translate-x-1 active:scale-95 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explorar Comunidades</span>
        </button>

        {/* Banner de la Comunidad */}
        <div 
          className="rounded-3xl p-6 sm:p-8 mb-6 border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[160px]"
          style={{
            background: selectedCommunity.banner || COMM_BANNER_PRESETS[0]
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-xl">
                {selectedCommunity.icon || '🌟'}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
                  {selectedCommunity.name}
                </h2>
                <p className="text-xs text-purple-200 font-medium drop-shadow mt-0.5">
                  {selectedCommunity.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedCommunity.membersCount || 1} miembros</span>
            </div>
          </div>
        </div>

        {/* Chat en Vivo Multi-Usuario de la Comunidad */}
        <LiveChatRoom
          roomId={`comm_${selectedCommunity.id}`}
          title={`Chat de ${selectedCommunity.name}`}
          subtitle="Comparte teorías, recomendaciones de mangas y chatea en directo con los miembros."
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenUserCard={onOpenUserCard}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 select-none animate-fadeIn">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800/80 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-purple-400" />
            <span>Comunidades de Yomori</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Únete a gremios de lectores, debate sobre géneros específicos o crea tu propia comunidad.
          </p>
        </div>

        {/* Botón Crear Comunidad */}
        <button
          onClick={() => {
            if (!currentUser) {
              if (onOpenAuth) onOpenAuth('login');
              return;
            }
            setShowCreateModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Comunidad</span>
        </button>
      </div>

      {/* Buscador y Categorías */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        
        {/* Pestañas de Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-[#141824] text-gray-400 hover:text-white hover:bg-[#181d2c]'
              }`}
            >
              {cat === 'all' ? 'Todas' : cat}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar comunidad..."
            className="w-full bg-[#131622] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 select-text"
          />
        </div>
      </div>

      {/* Grilla de Comunidades */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-xs text-gray-400">Cargando comunidades...</span>
        </div>
      ) : filteredCommunities.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCommunities.map((comm) => (
            <div
              key={comm.id}
              onClick={() => setSelectedCommunity(comm)}
              className="group bg-[#111422] border border-gray-800/80 hover:border-purple-600/70 rounded-3xl overflow-hidden shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              {/* Banner */}
              <div 
                className="h-28 w-full p-3 relative flex items-end"
                style={{ background: comm.banner || COMM_BANNER_PRESETS[0] }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#111422] to-transparent pointer-events-none" />
                <div className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-lg relative z-10 -mb-6">
                  {comm.icon || '🌟'}
                </div>
              </div>

              {/* Información */}
              <div className="p-5 pt-8 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                      {comm.category || 'General'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>{comm.membersCount || 1}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition">
                    {comm.name}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mt-1.5">
                    {comm.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 group-hover:translate-x-1 transition flex items-center gap-1">
                    <span>Entrar al chat</span>
                    <span>→</span>
                  </span>
                  <div className="p-2 rounded-xl bg-purple-950/60 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl bg-[#101420] border border-gray-800 p-8 text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
          <Users className="w-10 h-10 text-gray-600 mb-1" />
          <span className="font-bold text-sm text-white">No se encontraron comunidades</span>
          <p className="max-w-sm">
            Sé el primero en crear una comunidad con tus amigos para debatir sobre tus mangas favoritos.
          </p>
        </div>
      )}

      {/* Modal para Crear Comunidad */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#111422] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-left relative animate-fadeInScale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Crear Nueva Comunidad</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Nombre de la Comunidad
                </label>
                <input
                  type="text"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="Ej: Fans del Manhwa de Cultivo 🐉"
                  required
                  maxLength={50}
                  className="w-full bg-[#161a28] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 select-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="¿De qué trata esta comunidad?..."
                  rows={3}
                  maxLength={200}
                  className="w-full bg-[#161a28] border border-gray-700/80 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 select-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={newCommCat}
                    onChange={(e) => setNewCommCat(e.target.value)}
                    className="w-full bg-[#161a28] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-purple-300 font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="Acción & Aventura">Acción & Aventura</option>
                    <option value="Cultivo & Manhwa">Cultivo & Manhwa</option>
                    <option value="Romance & Drama">Romance & Drama</option>
                    <option value="Fantasía & Isekai">Fantasía & Isekai</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Ícono
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {EMOJI_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewCommIcon(ic)}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition ${
                          newCommIcon === ic ? 'bg-purple-600 scale-110' : 'bg-[#161a28] hover:bg-gray-700'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  Banner de la Comunidad
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COMM_BANNER_PRESETS.map((b, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewCommBanner(b)}
                      className={`h-9 rounded-xl border transition ${
                        newCommBanner === b ? 'border-purple-400 ring-2 ring-purple-500' : 'border-gray-700'
                      }`}
                      style={{ background: b }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!newCommName.trim() || isCreating}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  {isCreating ? 'Creando...' : 'Crear Comunidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
