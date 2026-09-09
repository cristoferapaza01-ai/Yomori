import React, { useState } from 'react';
import { BookMarked, Play, Search, Filter, CheckCircle, Sparkles, BookOpen, Clock, HardDrive } from 'lucide-react';

export default function LibraryView({
  library = [],
  categories = ['Todos'],
  onSelectManga,
  onContinueReading,
  onExploreSources,
  downloadStatusMap = {}
}) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado por categoría y búsqueda
  const filteredLibrary = library.filter((item) => {
    let matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    if (selectedCategory === 'Descargados') {
      const hasDl = (item.chapters || []).some(c => downloadStatusMap[c.url]?.isDownloaded);
      matchesCategory = hasDl;
    }
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 animate-fadeIn relative">
      
      {/* Encabezado y Buscador */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-purple-400" />
            <span>Mi Biblioteca</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {library.length} {library.length === 1 ? 'manga guardado' : 'mangas guardados'}
          </p>
        </div>

        {/* Buscador dentro de la Biblioteca */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en mi biblioteca..."
            className="w-full bg-[#11141c] border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* Cuadrícula de Mangas en Biblioteca */}
      {filteredLibrary.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredLibrary.map((manga) => {
            const totalChapters = manga.totalChapters || manga.chapters?.length || 1;
            const readCount = manga.readChapters?.length || 0;
            const unreadCount = Math.max(0, totalChapters - readCount);
            const progressPercent = Math.min(100, Math.round((readCount / totalChapters) * 100));

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

                  {/* Badge de No Leídos o Al Día y Descargas */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {(() => {
                      const dlCount = (manga.chapters || []).filter(c => downloadStatusMap[c.url]?.isDownloaded).length;
                      if (dlCount > 0) {
                        return (
                          <span 
                            className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/60 backdrop-blur-md text-[10px] font-bold text-emerald-300 flex items-center gap-1 shadow-md"
                            title={`${dlCount} capítulos descargados en PC`}
                          >
                            <HardDrive className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{dlCount}</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
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

                  {/* Botón flotante para continuar lectura rápida */}
                  {manga.lastReadChapter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContinueReading(manga.lastReadChapter.url, manga.url);
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
        /* Estado Vacío */
        <div className="py-24 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
          <BookMarked className="w-14 h-14 text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-300">Tu biblioteca está vacía</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Explora las fuentes disponibles y pulsa "Añadir a Biblioteca" en los mangas que te interesen para darles seguimiento.
          </p>
          <button
            onClick={onExploreSources}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explorar Fuentes</span>
          </button>
        </div>
      )}

      {/* Botones Flotantes de Categorías en la parte inferior central con bordes curvos */}
      {library.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[90vw]">
          <div className="pointer-events-auto overflow-x-auto p-1.5 rounded-full bg-[#10141d]/90 backdrop-blur-xl border border-gray-700/80 shadow-2xl shadow-black/90 flex items-center gap-1.5">
            {categories.map((cat) => {
              const count = cat === 'Todos' ? library.length : library.filter(i => i.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 scale-105'
                      : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-purple-950/80 text-purple-200' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
