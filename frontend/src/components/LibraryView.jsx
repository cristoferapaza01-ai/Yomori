import React, { useState, useMemo } from 'react';
import { 
  BookMarked, 
  Play, 
  Search, 
  Filter, 
  CheckCircle, 
  Sparkles, 
  BookOpen, 
  Clock, 
  HardDrive,
  X,
  RotateCcw,
  Check,
  Layers,
  Radio
} from 'lucide-react';

export default function LibraryView({
  library = [],
  categories = ['Todos'],
  onSelectManga,
  onContinueReading,
  onExploreSources,
  downloadStatusMap = {},
  appMode = 'manga'
}) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [downloadFilter, setDownloadFilter] = useState('all'); // 'all' | 'downloaded'
  const [selectedScan, setSelectedScan] = useState('all'); // 'all' | scanName
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Lista única de scans presentes en los mangas de la biblioteca
  const availableScans = useMemo(() => {
    const set = new Set();
    library.forEach(m => {
      const scan = m.extension || m.extensionId || m.scanName;
      if (scan) set.add(scan);
    });
    return Array.from(set);
  }, [library]);

  // Detección universal de descargas para mangas en biblioteca
  const getMangaDownloadedCount = (manga) => {
    if (!manga) return 0;
    
    // 1. Coincidencia directa en el arreglo de capítulos si existe
    if (Array.isArray(manga.chapters) && manga.chapters.length > 0) {
      const direct = manga.chapters.filter(c => downloadStatusMap[c.url]?.isDownloaded || c.isDownloaded).length;
      if (direct > 0) return direct;
    }

    // 2. Coincidencia en el mapa global de descargas por URL de manga o título
    const mUrl = (manga.url || '').trim().toLowerCase();
    const mTitle = (manga.title || '').trim().toLowerCase();
    
    if (!mUrl && !mTitle) return 0;

    let count = 0;
    Object.values(downloadStatusMap || {}).forEach(dl => {
      if (!dl || !dl.isDownloaded) return;
      const dlMUrl = (dl.mangaUrl || '').trim().toLowerCase();
      const dlTitle = (dl.mangaTitle || '').trim().toLowerCase();

      if (mUrl && dlMUrl && mUrl === dlMUrl) {
        count++;
      } else if (mTitle && dlTitle && (mTitle === dlTitle || mTitle.includes(dlTitle) || dlTitle.includes(mTitle))) {
        count++;
      }
    });

    return count;
  };

  // Contadores rápidos
  const downloadedMangasCount = useMemo(() => {
    return library.filter(m => getMangaDownloadedCount(m) > 0).length;
  }, [library, downloadStatusMap]);

  // Filtrado compuesto: Descargas + Categoría + Scan + Búsqueda
  const filteredLibrary = useMemo(() => {
    return library.filter((item) => {
      // 1. Filtro de Descargas
      const dlCount = getMangaDownloadedCount(item);
      if (downloadFilter === 'downloaded' && dlCount === 0) return false;

      // 2. Filtro de Categoría
      if (selectedCategory !== 'Todos' && item.category !== selectedCategory) return false;

      // 3. Filtro por Scan
      if (selectedScan !== 'all') {
        const itemScan = item.extension || item.extensionId || item.scanName || '';
        if (itemScan.toLowerCase() !== selectedScan.toLowerCase()) return false;
      }

      // 4. Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesScan = (item.extension || item.extensionId || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesScan) return false;
      }

      return true;
    });
  }, [library, downloadFilter, selectedCategory, selectedScan, searchTerm, downloadStatusMap]);

  const activeFiltersCount = (downloadFilter !== 'all' ? 1 : 0) + 
                             (selectedCategory !== 'Todos' ? 1 : 0) + 
                             (selectedScan !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setDownloadFilter('all');
    setSelectedCategory('Todos');
    setSelectedScan('all');
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-10 py-6 pb-28 animate-fadeIn relative select-none">
      
      {/* Encabezado, Buscador y Botón de Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-purple-400" />
            <span>Mi Biblioteca</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            {library.length} {library.length === 1 ? 'manga guardado' : 'mangas guardados en seguimiento'}
            {downloadedMangasCount > 0 && ` • ${downloadedMangasCount} disponibles offline`}
          </p>
        </div>

        {/* Buscador y Botón de Filtros Flotantes */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en mi biblioteca..."
              className="w-full bg-[#11141c] border border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
            />
          </div>

          <button
            onClick={() => setShowFilterModal(true)}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/30'
                : 'bg-[#11141c] hover:bg-[#1a202c] text-gray-300 border-gray-800'
            }`}
            title="Abrir ventana de filtros"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-purple-700 text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chips Rápidos de Filtro Activo */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-gray-400 font-medium">Filtros activos:</span>
          
          {downloadFilter === 'downloaded' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-bold">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Solo Descargados</span>
              <button onClick={() => setDownloadFilter('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedCategory !== 'Todos' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-600/60 text-purple-300 text-xs font-bold">
              <span>Categoría: {selectedCategory}</span>
              <button onClick={() => setSelectedCategory('Todos')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedScan !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 text-xs font-bold">
              <span>Scan: {selectedScan}</span>
              <button onClick={() => setSelectedScan('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 ml-2 transition underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar todos</span>
          </button>
        </div>
      )}

      {/* Cuadrícula de Mangas en Biblioteca */}
      {filteredLibrary.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4">
          {filteredLibrary.map((manga) => {
            const totalChapters = manga.totalChapters || manga.chapters?.length || 1;
            const readCount = manga.readChapters?.length || 0;
            const unreadCount = Math.max(0, totalChapters - readCount);
            const progressPercent = Math.min(100, Math.round((readCount / totalChapters) * 100));

            const dlChaptersCount = getMangaDownloadedCount(manga);

            return (
              <div
                key={manga.url}
                onClick={() => onSelectManga(manga.url)}
                className="group relative rounded-2xl bg-[#131720] border border-gray-800/80 overflow-hidden cursor-pointer hover:border-purple-600/80 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/40 flex flex-col transform hover:-translate-y-1"
              >
                {/* Portada */}
                <div className="aspect-[3/4] w-full bg-[#131720] overflow-hidden relative -mb-[1px]">
                  <img
                    src={manga.coverProxy || manga.cover}
                    alt={manga.title}
                    loading="lazy"
                    className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />

                  {/* Badges de Estado (Descargas y No Leídos) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {dlChaptersCount > 0 && (
                      <span 
                        className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md text-[10px] font-bold text-emerald-300 flex items-center gap-1 shadow-md"
                        title={`${dlChaptersCount} capítulos descargados en disco`}
                      >
                        <HardDrive className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{dlChaptersCount}</span>
                      </span>
                    )}

                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-md">
                        {unreadCount}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>Al día</span>
                      </span>
                    )}
                  </div>

                  {/* Scan Badge en la esquina inferior izquierda de la portada */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-gray-300">
                      {manga.extension || manga.extensionId || 'Scan'}
                    </span>
                  </div>

                  {/* Botón flotante para continuar lectura rápida */}
                  {manga.lastReadChapter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinueReading(manga.lastReadChapter.url, manga.url, null, manga);
                      }}
                      className="absolute bottom-2 right-2 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition transform hover:scale-110"
                      title={`Continuar: ${manga.lastReadChapter.name}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  )}
                </div>

                {/* Info y Barra de Progreso */}
                <div className="p-3 bg-[#131720] flex-1 flex flex-col justify-between relative z-10 border-t border-transparent">
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-purple-300 transition line-clamp-2 leading-tight">
                      {manga.title}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">
                      {readCount}/{totalChapters} leídos ({progressPercent}%)
                    </p>
                  </div>

                  {/* Mini barra de progreso */}
                  <div className="w-full h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado Vacío / Sin Resultados */
        <div className="py-24 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
          <BookMarked className="w-14 h-14 text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-300">
            {activeFiltersCount > 0 
              ? (appMode === 'anime' ? 'No hay animes con los filtros seleccionados' : 'No hay mangas con los filtros seleccionados')
              : (appMode === 'anime' ? 'Tu biblioteca de Anime está vacía' : 'Tu biblioteca está vacía')}
          </h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            {activeFiltersCount > 0 
              ? 'Intenta cambiar las opciones de descarga, categoría o fuente en el botón de filtros.'
              : (appMode === 'anime' 
                  ? 'Explora las fuentes de anime e instala extensiones para guardar y dar seguimiento a tus series.'
                  : 'Explora las fuentes disponibles y pulsa "Añadir a Biblioteca" en los mangas que te interesen para darles seguimiento.')}
          </p>
          {activeFiltersCount > 0 ? (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Mostrar Todos los Mangas</span>
            </button>
          ) : (
            <button
              onClick={onExploreSources}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explorar Fuentes</span>
            </button>
          )}
        </div>
      )}

      {/* VENTANA FLOTANTE DE FILTROS (MODAL FLOTANTE / POPOVER) */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e121a] border border-gray-800 rounded-3xl p-6 shadow-2xl relative text-left space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-600/60 text-purple-400">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Filtros de Biblioteca</h3>
                  <p className="text-[11px] text-gray-400">Personaliza la visualización de tus mangas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN 1: ESTADO DE DESCARGA */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block flex items-center justify-between">
                <span>Estado de Descargas</span>
                <span className="text-[10px] text-purple-400 font-mono">{downloadedMangasCount} descargados</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDownloadFilter('all')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                    downloadFilter === 'all'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-[#141824] text-gray-400 hover:text-gray-200 border-gray-800'
                  }`}
                >
                  <span>Todos ({library.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDownloadFilter('downloaded')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                    downloadFilter === 'downloaded'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-[#141824] text-gray-400 hover:text-emerald-300 border-gray-800'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Descargados ({downloadedMangasCount})</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: CATEGORÍAS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">
                Categoría
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#090c12] rounded-2xl border border-gray-800/80 custom-scrollbar">
                {categories.map((cat) => {
                  const count = cat === 'Todos' ? library.length : library.filter(i => i.category === cat).length;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-[#141824] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] font-mono px-1 rounded-md ${
                        isSelected ? 'bg-purple-950/80 text-purple-200' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 3: SCAN / FUENTE */}
            {availableScans.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  Scan / Fuente
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#090c12] rounded-2xl border border-gray-800/80 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedScan('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedScan === 'all'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-[#141824] text-gray-400 hover:text-white'
                    }`}
                  >
                    Todos los Scans
                  </button>
                  {availableScans.map((scan) => {
                    const count = library.filter(m => (m.extension || m.extensionId || m.scanName) === scan).length;
                    const isSelected = selectedScan === scan;
                    return (
                      <button
                        key={scan}
                        type="button"
                        onClick={() => setSelectedScan(scan)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-[#141824] text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>{scan}</span>
                        <span className={`text-[10px] font-mono px-1 rounded-md ${
                          isSelected ? 'bg-indigo-950/80 text-indigo-200' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer con Botones de Aplicar y Restablecer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs text-gray-400 hover:text-red-400 flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
