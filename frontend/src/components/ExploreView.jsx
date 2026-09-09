import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Puzzle, 
  ArrowRightLeft, 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  BookOpen, 
  ExternalLink, 
  Loader2, 
  Globe, 
  PlusCircle, 
  Filter, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  Star, 
  SlidersHorizontal, 
  RotateCcw,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

const ALL_GENRES = [
  // --- TIER 1: Los más populares y más usados en mangas/manhwas ---
  "Acción",
  "Romance",
  "Fantasía",
  "Comedia",
  "Drama",
  "Aventura",
  "Isekai",
  "Reencarnación",
  "Sobrenatural",
  "Artes Marciales",
  "Magia",
  "Shounen",
  "Escolar",
  "Recuentos de la vida",
  "Sistema",
  "Regresion",
  "Harem",
  "BL (Boys Love)",
  "Yaoi",
  "Ecchi",
  "Maduro",
  "+18",
  "Misterio",
  "Psicológico",
  "Thriller",
  "Ciencia Ficción",
  "Venganza",
  "Superpoderes",
  "Supervivencia",
  "Murim",
  "Cultivo",
  "Girls Love",
  "Yuri",
  "Seinen",
  "Shoujo",
  "Demonios",
  "Horror",
  "Apocalíptico",
  "Histórico",
  "Deportes",

  // --- TIER 2: Géneros y etiquetas muy comunes ---
  "Vida Escolar",
  "Vida Cotidiana",
  "Sistema de Niveles",
  "Retornado",
  "Transmigración",
  "Fantasía oscura",
  "Fantasía urbana",
  "Gore",
  "Smut",
  "Vampiros",
  "Bestias",
  "Militar",
  "Guerra",
  "Gourmet",
  "Video Game",
  "Realidad Virtual",
  "Viaje en el tiempo",
  "Anti-Heroe",
  "Crimen",
  "Policiaco",
  "Tragedia",
  "Harem Inverso",
  "Suspense",
  "Boys Love",
  "Shonen-ai",
  "Yaoi (Soft)",
  "Shonen-ai (Yaoi Soft)",
  "Shounen Ai",
  "Josei",
  "Shonen",
  "+15",
  "Adulto",
  "Erotica",
  "Adult Cast",
  "Action",
  "Fantasy",
  "Comedy",
  "Adventure",
  "Supernatural",
  "Slice of Life",
  "Mystery",
  "Psychological",
  "Sci-Fi",
  "Reincarnation",
  "School",
  "School Life",
  "Sports",
  "Vampire",
  "Military",
  "Time Travel",
  "Urban Fantasy",
  "Super Natural",
  "sobre natural",
  "reencuentro de la vida",

  // --- TIER 3: Subgéneros, temas y etiquetas menos frecuentes ---
  "Familia",
  "Mecha",
  "Ciberpunk",
  "Gender Bender",
  "Género Bender",
  "Bender",
  "Traps",
  "Musica",
  "Music",
  "Primer amor",
  "Odio-Amor",
  "Love Polygon",
  "Toxicidad",
  "Trabajo",
  "Aliens",
  "Animación",
  "Academia",
  "Samurái",
  "Historia",
  "Historical",
  "Deporte",
  "Team Sports",
  "Ejercito",
  "Niños",
  "Mythology",
  "Oeste",
  "Parodia",
  "Gag Humor",
  "Stream",
  "Omegaverse",
  "Doujinshi",
  "Oneshot",
  "Realidad",
  "Premiados",
  "Award Winning",
  "Telenovela",
  "Manga",
  "Manhwa",
  "Webtoon",
  "Webcomic",
  "Novela",
  "ficcion",
  "Español",
  "Extranjero",
  "Self-Published",
  "MangoScan",
  "Mucho Gogogo"
];

const OLYMPUS_GENRES = [
  "Acción",
  "Stream",
  "Apocalíptico",
  "Artes marciales",
  "Aventura",
  "Ciencia Ficción",
  "Comedia",
  "Crimen",
  "Cultivación",
  "Deportes",
  "Arquero",
  "Ecchi",
  "Familia",
  "Fantasía",
  "Guerra",
  "Harem",
  "Histórico",
  "Juego",
  "Magia",
  "Misterio",
  "Murim",
  "Psicológico",
  "Realidad virtual",
  "Recuentos de la vida",
  "Reencarnación",
  "Romance",
  "Seinen",
  "Shonen",
  "Shoujo",
  "Sistema",
  "Sobrenatural",
  "spokon",
  "Superpoderes",
  "Supervivencia",
  "Suspenso",
  "Terror",
  "Tragedia",
  "Vida Escolar",
  "+15",
  "Retornado",
  "Medico",
  "Isekai",
  "Drama",
  "Demonios",
  "Criptomonedas",
  "venganza",
  "mafia",
  "analisis",
  "constelaciones",
  "Pantallas de sistemas",
  "Escritor",
  "Meian",
  "Horror",
  "Supernatural",
  "Girls Love",
  "Posible Harem",
  "Monstruos",
  "Bestias",
  "Evolución",
  "zombis",
  "IA",
  "WAIFU",
  "Viajero",
  "Prota mamado",
  "Nigromante",
  "Anti-heroe",
  "Villano",
  "transmigración"
];

const MANHWALATINO_GENRES = [
  "+18", "+19", "Academia", "Acción", "Adulto", "Aliens", "Amigos con Derechos",
  "Amigos de la Infancia", "Anti-heroe", "Apocaliptico", "Artes Marciales", "Aventura",
  "Bestias", "Ciencia Ficción", "Comedia", "Crimen", "Cultivo", "Cyberpunk",
  "Deporte", "Doujinshi", "Drama", "Ecchi", "Ejercito", "Fantasía", "Girls Love",
  "Gore", "Guerra", "Harem", "Historias Cortas", "Horror", "Isekai", "Josei",
  "Madrastra", "Madre e Hija", "Maduro", "Magia", "Manwha", "Milfs", "Misterio",
  "Mujer Casada", "Musica", "Pimer Amor", "Primer Amor", "Psicológico",
  "Recuentos de la Vida", "Reencarnación", "Relacion Secreta", "Romance", "Seinen",
  "Shoujo", "Shounen", "Sistema", "Sobrenatural", "Superpoderes", "Tragedia",
  "Universidad", "Vampiros", "Venganza", "Vida Escolar", "Yuri"
];

const FILTER_TYPES = [
  "Ver todo", "Manga", "Manhua", "Manhwa", "Webtoon", "Novela", "Comic", "One shot", "Doujinshi", "OEL"
];

const FILTER_STATUSES = [
  "Ver todo", "En emisión", "Completado", "Finalizado", "En pausa", "Cancelado"
];

const OLYMPUS_STATUSES = [
  "Ver todo",
  "Activo",
  "Finalizado",
  "Pausado por el autor (Hiatus)",
  "Cancelado por el autor",
  "Abandonado por el scan"
];

export default function ExploreView({
  exploreSubTab = 'sources',
  onSelectSubTab,
  installedExtensions = [],
  selectedExtension,
  onSelectExtension,
  catalog = [],
  loadingCatalog,
  catalogPage = 1,
  totalPages = null,
  hasNextPage = true,
  onPageChange,
  onSearchManga,
  onApplyFilters,
  activeFilters = { type: 'Ver todo', status: 'Ver todo', genres: [], query: '' },
  onRefreshCatalog,
  onSelectManga,
  onDirectExtract,
  onRefreshInstalled,
  onInstallAllExtensions,
  library = []
}) {
  const [activeSubTab, setActiveSubTab] = useState(exploreSubTab);
  const [searchTerm, setSearchTerm] = useState(activeFilters?.query || '');
  const [selectedSourceForCatalog, setSelectedSourceForCatalog] = useState(null);

  // Sidebar de Filtros Lateral (Abierto por defecto para aprovechar todo el ancho)
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [genreSearch, setGenreSearch] = useState('');
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Repositorio central Keiyoushi
  const [repoExtensions, setRepoExtensions] = useState([]);
  const [syncingRepos, setSyncingRepos] = useState(false);
  const [installingId, setInstallingId] = useState(null);
  const [isBatchInstalling, setIsBatchInstalling] = useState(false);

  const defaultRepoUrl = 'http://localhost:5000/index.json';
  const debounceRef = useRef(null);

  useEffect(() => {
    if (selectedExtension && installedExtensions.length > 0) {
      const found = installedExtensions.find(e => e.id === selectedExtension);
      if (found) setSelectedSourceForCatalog(found);
    }
  }, [selectedExtension, installedExtensions]);

  useEffect(() => {
    setSearchTerm(activeFilters?.query || '');
  }, [activeFilters?.query]);

  // LIVE SEARCH DEBOUNCED
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (onSearchManga) {
        onSearchManga(val);
      }
    }, 380);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (onSearchManga) {
      onSearchManga('');
    }
  };

  const handleSubTabChange = (tab) => {
    setActiveSubTab(tab);
    if (onSelectSubTab) onSelectSubTab(tab);
    if (tab === 'extensions' && repoExtensions.length === 0) {
      handleSyncRepo();
    }
  };

  const handleSyncRepo = async () => {
    setSyncingRepos(true);
    try {
      const res = await axios.get(defaultRepoUrl);
      if (Array.isArray(res.data)) {
        setRepoExtensions(res.data);
      }
    } catch (err) {
      console.error('Error sincronizando repositorio oficial:', err);
    } finally {
      setSyncingRepos(false);
    }
  };

  useEffect(() => {
    handleSyncRepo();
  }, []);

  const handleInstallClick = async (ext) => {
    setInstallingId(ext.id);
    try {
      const res = await axios.post('/api/extensions/install', {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        scriptUrl: ext.scriptUrl,
        baseUrl: ext.baseUrl,
        icon: ext.icon,
        lang: ext.lang
      });
      if (res.data?.success) {
        await onRefreshInstalled();
      }
    } catch (err) {
      alert(`Error al instalar extensión: ${err.response?.data?.message || err.message}`);
    } finally {
      setInstallingId(null);
    }
  };

  const handleUninstallClick = async (extId) => {
    try {
      const res = await axios.post('/api/extensions/uninstall', { id: extId });
      if (res.data?.success) {
        await onRefreshInstalled();
      }
    } catch (err) {
      alert(`Error al desinstalar: ${err.message}`);
    }
  };

  const isInstalled = (extId) => installedExtensions.some(e => e.id === extId);

  // MANEJO INTEGRADO DE FILTROS EN TIEMPO REAL
  const handleTypeChange = (typeVal) => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        type: typeVal,
        query: searchTerm
      });
    }
  };

  const handleStatusChange = (statusVal) => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        status: statusVal,
        query: searchTerm
      });
    }
  };

  const handleToggleGenre = (genre) => {
    const current = activeFilters.genres || [];
    let updated;
    if (current.includes(genre)) {
      updated = current.filter(g => g !== genre);
    } else {
      updated = [...current, genre];
    }
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        genres: updated,
        query: searchTerm
      });
    }
  };

  const handleClearAllGenres = () => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        genres: [],
        query: searchTerm
      });
    }
  };

  const handleSortChange = (sortVal) => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        sort: sortVal,
        query: searchTerm
      });
    }
  };

  const handleResetAllFilters = () => {
    if (onApplyFilters) {
      onApplyFilters({
        type: 'Ver todo',
        status: 'Ver todo',
        sort: 'popular',
        genres: [],
        query: searchTerm
      });
    }
  };

  const removeFilterGenre = (genreToRemove) => {
    const updated = (activeFilters.genres || []).filter(g => g !== genreToRemove);
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        genres: updated
      });
    }
  };

  const removeFilterType = () => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        type: 'Ver todo'
      });
    }
  };

  const removeFilterStatus = () => {
    if (onApplyFilters) {
      onApplyFilters({
        ...activeFilters,
        status: 'Ver todo'
      });
    }
  };

  const countActiveFilters = () => {
    let count = 0;
    if (activeFilters?.type && activeFilters.type !== 'Ver todo') count++;
    if (activeFilters?.status && activeFilters.status !== 'Ver todo') count++;
    if (activeFilters?.genres && activeFilters.genres.length > 0) count += activeFilters.genres.length;
    return count;
  };

  const isOlympusActive = (selectedSourceForCatalog?.id === 'olympus-scanlation' || selectedExtension === 'olympus-scanlation');
  const isManhwaLatinoActive = (selectedSourceForCatalog?.id === 'manhwalatino' || selectedExtension === 'manhwalatino');
  const activeGenresList = isOlympusActive ? OLYMPUS_GENRES : (isManhwaLatinoActive ? MANHWALATINO_GENRES : ALL_GENRES);
  const activeStatusList = isOlympusActive ? OLYMPUS_STATUSES : FILTER_STATUSES;

  const filteredGenreList = activeGenresList.filter(g => 
    g.toLowerCase().includes(genreSearch.toLowerCase().trim())
  );

  const handleJumpPageSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (isNaN(p) || p < 1) return;
    if (totalPages && totalPages > 0 && p > totalPages) {
      if (onPageChange) onPageChange(totalPages);
    } else {
      if (onPageChange) onPageChange(p);
    }
    setJumpPageInput('');
  };

  const getPaginationPages = () => {
    const current = catalogPage || 1;

    // 1. Si totalPages está definido (> 0): límite estricto exacto (nunca se pasa de la última página)
    if (totalPages && totalPages > 0) {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages];
      } else if (current >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        return [1, '...', current - 1, current, current + 1, '...', totalPages];
      }
    }

    // 2. Si no hay más páginas adelante (!hasNextPage), limitar al current como última página
    if (!hasNextPage) {
      const maxPage = Math.max(1, current);
      if (maxPage <= 7) {
        return Array.from({ length: maxPage }, (_, i) => i + 1);
      }
      return [1, '...', maxPage - 4, maxPage - 3, maxPage - 2, maxPage - 1, maxPage];
    }

    // 3. Para extensiones con catálogo abierto (ej. ZonaTMO):
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', current + 5];
    } else {
      return [1, '...', current - 1, current, current + 1, '...', current + 5];
    }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 py-4 pb-20 animate-fadeIn">
      
      {/* 3 SUB-PESTAÑAS: FUENTES | EXTENSIONES | MIGRACIÓN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-800">
        <div className="flex items-center bg-[#10141e] p-1 rounded-2xl border border-gray-800 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => handleSubTabChange('sources')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeSubTab === 'sources'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fuentes</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
              {installedExtensions.length}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('extensions')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeSubTab === 'extensions'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            <span>Extensiones</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300">
              {repoExtensions.length}
            </span>
          </button>

          <button
            onClick={() => handleSubTabChange('migration')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeSubTab === 'migration'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Migración</span>
          </button>
        </div>

        {/* Acciones superiores */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeSubTab === 'extensions' && (
            <>
              <a
                href="http://localhost:5000/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Abrir Panel de Administrador para agregar nuevas páginas o scans"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Panel Administrador</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <button
                onClick={handleSyncRepo}
                disabled={syncingRepos}
                className="p-2 rounded-xl bg-[#141824] hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Actualizar catálogo de extensiones"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRepos ? 'animate-spin text-purple-400' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SUB-PESTAÑA: FUENTES & CATÁLOGO                        */}
      {/* ========================================================= */}
      {activeSubTab === 'sources' && (
        <div>
          {selectedSourceForCatalog ? (
            <div className="space-y-4">
              {/* BARRA SUPERIOR DE LA FUENTE & BÚSQUEDA */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedSourceForCatalog(null)}
                    className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-gray-800 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 font-semibold transition-all duration-200 active:scale-95 border border-gray-800 shrink-0 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Volver a fuentes</span>
                  </button>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                      <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                      {selectedSourceForCatalog.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 font-mono shrink-0">
                      v{selectedSourceForCatalog.version}
                    </span>
                    {catalog.length > 0 && (
                      <span className="text-[11px] text-gray-400 hidden sm:inline">
                        • {catalog.length} mangas en pág. {catalogPage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Populares/Recientes + Buscador en Tiempo Real + Alternar Filtros + Recargar */}
                <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end flex-wrap sm:flex-nowrap">
                  
                  {/* SELECTOR: POPULARES / RECIENTES */}
                  <div className="flex items-center bg-[#0d1017] p-1 rounded-xl border border-gray-800/80 text-xs font-semibold shrink-0 shadow-inner">
                    <button
                      onClick={() => handleSortChange('popular')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                        (activeFilters.sort || 'popular') === 'popular'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`}
                      title="Mostrar mangas más populares y leídos"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Populares</span>
                    </button>
                    <button
                      onClick={() => handleSortChange('recent')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                        activeFilters.sort === 'recent'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`}
                      title="Mostrar mangas y capítulos recién actualizados"
                    >
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Recientes</span>
                    </button>
                  </div>

                  {/* Input de Búsqueda */}
                  <div className="flex-1 min-w-[180px] relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      placeholder={`Buscar en ${selectedSourceForCatalog.name}...`}
                      className="w-full bg-[#11141c] border border-gray-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all duration-200 shadow-inner"
                    />
                    {searchTerm && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 transition-transform active:scale-90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Botón Alternar Filtros Sidebar */}
                  <button
                    onClick={() => setIsFilterExpanded(prev => !prev)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-95 shrink-0 ${
                      isFilterExpanded
                        ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-600/30'
                        : 'bg-[#141822] hover:bg-gray-800 border-gray-800 text-gray-300'
                    }`}
                    title="Alternar panel de filtros lateral"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtros</span>
                    {countActiveFilters() > 0 && (
                      <span className="w-4 h-4 rounded-full bg-white text-purple-900 font-bold text-[9px] flex items-center justify-center animate-bounce">
                        {countActiveFilters()}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={onRefreshCatalog}
                    disabled={loadingCatalog}
                    className="p-2 bg-[#141822] hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl transition-all duration-200 active:scale-95 shrink-0"
                    title="Recargar catálogo"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin text-purple-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* LAYOUT PRINCIPAL: CATÁLOGO A LA IZQUIERDA + SIDEBAR DE FILTROS A LA DERECHA */}
              <div className="flex flex-col lg:flex-row items-start">
                
                {/* 1. ÁREA DE MANGAS (COLUMNA PRINCIPAL IZQUIERDA) */}
                <div className="flex-1 min-w-0 w-full transition-all duration-300">
                  {/* Chips de Filtros Activos */}
                  {countActiveFilters() > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3.5 p-2.5 rounded-2xl bg-[#0e121b] border border-gray-800/80 text-xs animate-fadeInScale">
                      <span className="text-gray-400 text-xs font-medium mr-1 flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                        Activos:
                      </span>
                      {activeFilters.type && activeFilters.type !== 'Ver todo' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800 text-xs font-semibold animate-fadeIn">
                          Tipo: {activeFilters.type}
                          <button onClick={removeFilterType} className="hover:text-white transition active:scale-90"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {activeFilters.status && activeFilters.status !== 'Ver todo' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold animate-fadeIn">
                          Estado: {activeFilters.status}
                          <button onClick={removeFilterStatus} className="hover:text-white transition active:scale-90"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                      {(activeFilters.genres || []).map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800 text-xs font-semibold animate-fadeIn"
                        >
                          {genre}
                          <button onClick={() => removeFilterGenre(genre)} className="hover:text-white transition active:scale-90"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <button
                        onClick={handleResetAllFilters}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold underline ml-auto px-1 transition active:scale-95"
                      >
                        Limpiar todos
                      </button>
                    </div>
                  )}

                  {/* CUADRÍCULA DE MANGAS / SKELETON LOADER ANIMADO */}
                  {loadingCatalog ? (
                    <div className={`grid gap-3.5 sm:gap-4 animate-fadeIn ${
                      isFilterExpanded
                        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
                    }`}>
                      {Array.from({ length: 15 }).map((_, idx) => (
                        <div
                          key={`skel-${idx}`}
                          className="rounded-2xl bg-[#131720] border border-gray-800/60 overflow-hidden flex flex-col animate-pulse"
                        >
                          <div className="aspect-[3/4] w-full bg-gradient-to-b from-[#181d28] to-[#10141d]" />
                          <div className="p-3 space-y-2 bg-[#131720]">
                            <div className="h-3.5 bg-gray-800/70 rounded-md w-4/5" />
                            <div className="h-2.5 bg-gray-800/40 rounded-md w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : catalog.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#0f121a] border border-gray-800/80 animate-fadeInScale">
                      <BookOpen className="w-12 h-12 text-gray-600 mb-3" />
                      <h4 className="text-base font-bold text-white mb-1">
                        {catalogPage > 1 ? 'No hay más mangas en esta página' : 'No se encontraron mangas'}
                      </h4>
                      <p className="text-xs text-gray-400 max-w-sm mb-4">
                        {catalogPage > 1
                          ? `Has alcanzado el límite del catálogo en la página ${catalogPage}. Puedes volver a las páginas anteriores.`
                          : 'No hay resultados que coincidan con la búsqueda o los filtros aplicados.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {catalogPage > 1 && (
                          <button
                            onClick={() => onPageChange && onPageChange(catalogPage - 1)}
                            className="px-4 py-2 rounded-xl bg-[#181d2c] hover:bg-gray-800 text-purple-300 border border-purple-800/40 text-xs font-semibold flex items-center gap-2 transition-all duration-200 active:scale-95"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Volver a página {catalogPage - 1}</span>
                          </button>
                        )}
                        <button
                          onClick={handleResetAllFilters}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all duration-200 active:scale-95"
                        >
                          <span>Restablecer Filtros</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`grid gap-3.5 sm:gap-4 ${
                        isFilterExpanded
                          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5'
                          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
                      }`}>
                        {catalog.map((manga, idx) => (
                          <div
                            key={`${catalogPage}-${manga.url}`}
                            onClick={() => onSelectManga(manga.url, manga.extensionId || selectedSourceForCatalog.id)}
                            style={{ animationDelay: `${Math.min(idx * 30, 750)}ms` }}
                            className="group relative rounded-2xl bg-[#131720] border border-gray-800/80 overflow-hidden cursor-pointer hover:border-purple-600/70 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/40 flex flex-col transform hover:-translate-y-1.5 active:scale-95 animate-cascadeCard"
                          >
                            {/* Portada */}
                            <div className="aspect-[3/4] w-full bg-[#10141d] overflow-hidden relative -mb-[1px]">
                              {manga.coverProxy || manga.cover ? (
                                <img
                                  src={manga.coverProxy || manga.cover}
                                  alt={manga.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <BookOpen className="w-10 h-10" />
                                </div>
                              )}

                              {/* Insignias Superiores */}
                              <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                                {manga.type && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-900/90 backdrop-blur-md text-[9px] font-black tracking-wider uppercase text-purple-100 border border-purple-700/60 shadow-md">
                                    {manga.type}
                                  </span>
                                )}
                                {manga.status && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase backdrop-blur-md shadow-md flex items-center gap-1 border ${
                                    manga.status.toLowerCase().includes('finalizado') || manga.status.toLowerCase().includes('completado')
                                      ? 'bg-blue-950/90 text-blue-300 border-blue-700/60'
                                      : manga.status.toLowerCase().includes('pausa')
                                      ? 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                                      : manga.status.toLowerCase().includes('cancel')
                                      ? 'bg-red-950/90 text-red-300 border-red-700/60'
                                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      manga.status.toLowerCase().includes('finalizado') || manga.status.toLowerCase().includes('completado')
                                        ? 'bg-blue-400'
                                        : manga.status.toLowerCase().includes('pausa')
                                        ? 'bg-amber-400'
                                        : manga.status.toLowerCase().includes('cancel')
                                        ? 'bg-red-400'
                                        : 'bg-emerald-400 animate-pulse'
                                    }`} />
                                    <span>{manga.status}</span>
                                  </span>
                                )}
                              </div>

                              <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                                {manga.latestChapter && (
                                  <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono font-bold text-purple-300 border border-purple-800/60 shadow-md">
                                    <span>{manga.latestChapter}</span>
                                  </div>
                                )}
                                {manga.score && (
                                  <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-amber-300 border border-amber-600/40 flex items-center gap-1 shadow-md">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                    <span>{manga.score}</span>
                                  </div>
                                )}
                              </div>

                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#131720] via-[#131720]/70 to-transparent pointer-events-none" />
                            </div>

                            {/* Metadatos inferiores */}
                            <div className="p-3 bg-[#131720] flex-1 flex flex-col justify-between relative z-10 border-t border-transparent">
                              <div>
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-purple-300 transition-colors duration-200 line-clamp-2 leading-snug">
                                  {manga.title}
                                </h4>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                                <span className="text-purple-400 font-medium truncate">
                                  {selectedSourceForCatalog.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* BARRA DE PAGINACIÓN INTERACTIVA COMPLETA (PRIMERA, ANTERIOR, NÚMEROS, SIGUIENTE, ÚLTIMA, SALTO RÁPIDO) */}
                      {catalog.length > 0 && (
                        <div className="flex flex-col items-center justify-center gap-3.5 mt-8 pt-6 border-t border-gray-800/80">
                          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {/* Botón Primera Página */}
                            <button
                              onClick={() => onPageChange && onPageChange(1)}
                              disabled={catalogPage <= 1 || loadingCatalog}
                              title="Ir a la primera página"
                              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-[#121622] border border-gray-800 text-xs font-semibold text-gray-300 flex items-center gap-1 transition-all duration-200 active:scale-90 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronsLeft className="w-4 h-4 text-purple-400" />
                              <span className="hidden sm:inline">Inicio</span>
                            </button>

                            {/* Botón Anterior */}
                            <button
                              onClick={() => onPageChange && onPageChange(catalogPage - 1)}
                              disabled={catalogPage <= 1 || loadingCatalog}
                              className="px-3 sm:px-4 py-2 rounded-xl bg-[#121622] hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-[#121622] border border-gray-800 text-xs font-semibold text-gray-200 flex items-center gap-1 transition-all duration-200 active:scale-90 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Anterior</span>
                            </button>

                            {/* Píldoras de números de página */}
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              {getPaginationPages().map((item, idx) => {
                                if (item === '...') {
                                  return (
                                    <span
                                      key={`dots-${idx}`}
                                      className="w-7 h-9 flex items-center justify-center text-gray-500 font-bold text-xs select-none"
                                    >
                                      ...
                                    </span>
                                  );
                                }

                                const isCurrent = item === catalogPage;
                                return (
                                  <button
                                    key={item}
                                    onClick={() => onPageChange && onPageChange(item)}
                                    disabled={loadingCatalog || isCurrent}
                                    className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer disabled:cursor-default ${
                                      isCurrent
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-500'
                                        : 'bg-[#121622] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white'
                                    }`}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Botón Siguiente */}
                            <button
                              onClick={() => onPageChange && onPageChange(catalogPage + 1)}
                              disabled={!hasNextPage || (totalPages && catalogPage >= totalPages) || loadingCatalog}
                              className="px-3 sm:px-4 py-2 rounded-xl bg-[#121622] hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-[#121622] border border-gray-800 text-xs font-semibold text-gray-200 flex items-center gap-1 transition-all duration-200 active:scale-90 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span>Siguiente</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Botón Última Página / Salto Grande */}
                            <button
                              onClick={() => {
                                if (totalPages && totalPages > 0) {
                                  onPageChange && onPageChange(totalPages);
                                } else if (hasNextPage) {
                                  onPageChange && onPageChange(catalogPage + 5);
                                }
                              }}
                              disabled={!hasNextPage || (totalPages && catalogPage >= totalPages) || loadingCatalog}
                              title={totalPages ? `Ir a la última página (${totalPages})` : "Saltar 5 páginas adelante"}
                              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-[#121622] border border-gray-800 text-xs font-semibold text-gray-300 flex items-center gap-1 transition-all duration-200 active:scale-90 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span className="hidden sm:inline">{totalPages ? 'Fin' : '+5'}</span>
                              <ChevronsRight className="w-4 h-4 text-purple-400" />
                            </button>
                          </div>

                          {/* Mini formulario de salto directo a página & contador */}
                          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 font-medium">
                            {totalPages && totalPages > 0 ? (
                              <span>
                                Página <strong className="text-purple-400 font-bold">{catalogPage}</strong> de <strong className="text-white font-bold">{totalPages}</strong>
                              </span>
                            ) : (
                              <span>
                                Página <strong className="text-purple-400 font-bold">{catalogPage}</strong>
                              </span>
                            )}

                            <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1.5 bg-[#0f131f] px-2.5 py-1 rounded-xl border border-gray-800">
                              <span className="text-[11px] text-gray-400">Ir a pág:</span>
                              <input
                                type="number"
                                min="1"
                                max={totalPages || 9999}
                                value={jumpPageInput}
                                onChange={(e) => setJumpPageInput(e.target.value)}
                                placeholder="#"
                                className="w-12 bg-[#171d2c] border border-gray-700/60 rounded-lg px-1.5 py-0.5 text-center text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                              />
                              <button
                                type="submit"
                                disabled={!jumpPageInput || loadingCatalog}
                                className="px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-[11px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed transition"
                              >
                                Ir
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 2. SIDEBAR DE FILTROS LATERAL A LA DERECHA (CIERRE Y APERTURA SUAVES) */}
                <aside className={`shrink-0 transition-all duration-300 ease-in-out sticky top-4 overflow-hidden ${
                  isFilterExpanded
                    ? 'w-full lg:w-80 xl:w-96 2xl:w-[420px] opacity-100 translate-x-0 lg:ml-6 mt-4 lg:mt-0 pointer-events-auto'
                    : 'w-0 opacity-0 translate-x-12 ml-0 mt-0 pointer-events-none'
                }`}>
                  <div className="w-full sm:w-80 xl:w-96 2xl:w-[420px] shrink-0 bg-[#0f131f] border border-gray-800/90 rounded-2xl p-4 sm:p-5 space-y-5 shadow-2xl transition-transform duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                      <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                        <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                        <span>Filtros de Búsqueda</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {countActiveFilters() > 0 && (
                          <button
                            onClick={handleResetAllFilters}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-950/30 border border-red-800/40 transition-all active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Limpiar</span>
                          </button>
                        )}
                        <button
                          onClick={() => setIsFilterExpanded(false)}
                          className="p-1.5 rounded-lg bg-[#151926] hover:bg-gray-800 text-gray-400 hover:text-white transition active:scale-90 border border-gray-800"
                          title="Cerrar filtros"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SECCIÓN: TIPO */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                        Tipo de Obra
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {FILTER_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={() => handleTypeChange(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              (activeFilters.type || 'Ver todo') === t
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'bg-[#151926] text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800/70'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SECCIÓN: ESTADO */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                        Estado de Publicación
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStatusList.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              (activeFilters.status || 'Ver todo') === s
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'bg-[#151926] text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800/70'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SECCIÓN: GÉNEROS (AMPLIADO, LETRA MÁS GRANDE Y LEGIBLE) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                          Géneros y Etiquetas ({(activeFilters.genres || []).length} seleccionados)
                        </h5>
                        {(activeFilters.genres || []).length > 0 && (
                          <button
                            onClick={handleClearAllGenres}
                            className="text-xs text-red-400 hover:text-red-300 font-medium underline"
                          >
                            Deseleccionar
                          </button>
                        )}
                      </div>

                      <div className="relative mb-2.5">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={genreSearch}
                          onChange={(e) => setGenreSearch(e.target.value)}
                          placeholder="Buscar género (+18, Acción, Romance, etc.)..."
                          className="w-full bg-[#151926] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-[480px] overflow-y-auto p-1.5 bg-[#0a0d15] rounded-2xl border border-gray-800/70 custom-scrollbar">
                        {filteredGenreList.map((g) => {
                          const isSelected = (activeFilters.genres || []).includes(g);
                          return (
                            <button
                              key={g}
                              onClick={() => handleToggleGenre(g)}
                              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between text-left transition ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                                  : 'bg-[#141826] hover:bg-[#1c2236] text-gray-300 hover:text-white border border-gray-800/60'
                              }`}
                            >
                              <span className="truncate mr-1">{g}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </aside>

              </div>
            </div>
          ) : (
            /* Lista de Fuentes Instaladas (Grid Multi-Columna para aprovechar todo el ancho) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Fuentes Disponibles ({installedExtensions.length})</span>
                </h3>
              </div>

              {installedExtensions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                  {installedExtensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 hover:border-purple-800/60 transition flex flex-col justify-between gap-3 shadow-sm hover:shadow-purple-950/20"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-300 font-black text-lg shrink-0">
                          {ext.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{ext.name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
                              v{ext.version}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 uppercase font-mono">
                              {ext.lang || 'es'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{ext.baseUrl}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-gray-800/60">
                        <button
                          onClick={() => {
                            onSelectExtension(ext.id);
                            setSelectedSourceForCatalog(ext);
                          }}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Explorar Catálogo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
                  <Puzzle className="w-14 h-14 text-purple-500/40 mb-3" />
                  <h3 className="text-base font-bold text-gray-200">No tienes fuentes instaladas</h3>
                  <p className="text-xs text-gray-400 mt-1 mb-5">
                    Ve a la pestaña <strong>"Extensiones"</strong> para instalar las fuentes disponibles en tu repositorio.
                  </p>
                  <button
                    onClick={() => handleSubTabChange('extensions')}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition"
                  >
                    <Puzzle className="w-4 h-4" />
                    <span>Ver Extensiones</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-PESTAÑA: EXTENSIONES (GRID MULTI-COLUMNA)           */}
      {/* ========================================================= */}
      {activeSubTab === 'extensions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-purple-400" />
                <span>Extensiones Disponibles ({repoExtensions.length})</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sincronizadas automáticamente desde el Repositorio Central de tu servidor.
              </p>
            </div>

            {/* Botón Descargar todas de golpe */}
            {repoExtensions.length > 0 && (
              <button
                onClick={async () => {
                  setIsBatchInstalling(true);
                  if (onInstallAllExtensions) {
                    await onInstallAllExtensions();
                  }
                  setIsBatchInstalling(false);
                }}
                disabled={isBatchInstalling}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isBatchInstalling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Descargando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar todas</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {repoExtensions.map((ext) => {
              const installed = isInstalled(ext.id);
              const isDownloading = installingId === ext.id;

              return (
                <div
                  key={ext.id}
                  className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 hover:border-purple-800/50 transition flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#171c2a] border border-gray-700 flex items-center justify-center font-black text-purple-400 text-base shrink-0">
                      {ext.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{ext.name}</h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
                          v{ext.version}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800">
                          {ext.status || 'online'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-1">{ext.description || ext.baseUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-gray-800/60">
                    {installed ? (
                      <button
                        onClick={() => handleUninstallClick(ext.id)}
                        className="w-full py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Desinstalar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstallClick(ext)}
                        disabled={isDownloading}
                        className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Descargando...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Instalar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {repoExtensions.length === 0 && !syncingRepos && (
              <div className="py-16 text-center text-gray-500 col-span-full">
                <p className="text-xs text-gray-400">No hay extensiones en el repositorio.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-PESTAÑA: MIGRACIÓN                                 */}
      {/* ========================================================= */}
      {activeSubTab === 'migration' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/50 text-xs text-purple-300 flex items-start gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Migrador de Fuentes de Tachiyomi</p>
              <p className="text-purple-300/80 mt-0.5">
                Si una página cambia de dominio o deja de funcionar, transfiere automáticamente tus mangas y capítulos leídos a otra fuente disponible.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Mangas en tu Biblioteca para Migrar ({library.length})</span>
            </h4>

            {library.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {library.map((item) => (
                  <div
                    key={item.url}
                    className="p-3.5 rounded-2xl bg-[#121622] border border-gray-800 hover:border-purple-800/50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.coverProxy || item.cover}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-lg bg-gray-900 shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                        <p className="text-xs text-purple-400 mt-0.5">{item.extension || 'ZonaTMO'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {item.readChapters?.length || 0} capítulos leídos
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => alert(`Iniciando migración para "${item.title}"... Puedes buscar una fuente alternativa en Fuentes.`)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Migrar</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-500">
                <p className="text-xs text-gray-400">No tienes mangas en tu biblioteca para migrar.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}


