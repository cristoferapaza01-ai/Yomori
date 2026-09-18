import React from 'react';
import { History, Play, BookOpen, Clock, Sparkles, X } from 'lucide-react';

export default function HistoryView({
  history = [],
  onSelectChapter,
  onRemoveHistoryItem,
  onExplore,
  appMode = 'manga'
}) {
  const formatTime = (isoString) => {
    if (!isoString) return 'Reciente';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Justo ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 animate-fadeIn">
      {/* Cabecera del Historial */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-purple-400" />
            <span>{appMode === 'anime' ? 'Historial de Reproducción (Anime)' : 'Historial de Lectura (Manga)'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {appMode === 'anime' ? 'Continúa viendo tus episodios desde donde lo dejaste' : 'Continúa leyendo tus obras desde el último capítulo donde te quedaste'}
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{history.length} {appMode === 'anime' ? (history.length === 1 ? 'anime en progreso' : 'animes en progreso') : (history.length === 1 ? 'manga en progreso' : 'mangas en progreso')}</span>
          </div>
        )}
      </div>

      {history.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {history.map((item, idx) => (
            <div
              key={item.mangaUrl || item.url || idx}
              onClick={() => onSelectChapter(item.url, item.mangaUrl, item.page, item)}
              className="group relative flex gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#111420]/90 hover:bg-[#151928] border border-gray-800/90 hover:border-purple-600/60 transition-all duration-200 shadow-lg hover:shadow-purple-900/20 cursor-pointer overflow-hidden"
            >
              {/* Botón Flotante para Eliminar del Historial */}
              {onRemoveHistoryItem && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveHistoryItem(item.url || item.mangaUrl);
                  }}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-gray-900/80 hover:bg-red-600 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition duration-200 shadow-md border border-gray-700/60"
                  title="Eliminar del historial"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Portada Grande en Alta Definición */}
              <div className="relative w-24 sm:w-28 h-36 sm:h-40 rounded-xl overflow-hidden bg-gray-900 shrink-0 border border-gray-800/80 shadow-md group-hover:shadow-purple-500/20 transition">
                {(item.coverProxy || item.cover) ? (
                  <img
                    src={item.coverProxy || item.cover}
                    alt={item.mangaTitle}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-[#0d1017]">
                    <BookOpen className="w-7 h-7" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                  <Play className="w-6 h-6 text-white drop-shadow-md fill-white" />
                </div>
              </div>

              {/* Información y Botón de Reanudación */}
              <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                <div className="space-y-1.5 pr-6">
                  <div className="flex items-center justify-between gap-2">
                    {item.extension && (
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800/50 font-mono truncate max-w-[120px]">
                        {item.extension}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-purple-400" />
                      {formatTime(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                    {item.mangaTitle || 'Manga'}
                  </h3>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1b2032] border border-gray-700/60 text-xs font-bold text-gray-200 truncate max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                    <span className="truncate">{item.chapterTitle || 'Último Capítulo'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectChapter(item.url, item.mangaUrl, item.page, item);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Continuar Leyendo</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center max-w-md mx-auto flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-full bg-purple-950/40 border border-purple-800/40 flex items-center justify-center mb-4 shadow-inner">
            <History className="w-10 h-10 text-purple-400/80" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Sin historial de lectura</h3>
          <p className="text-xs text-gray-400 mb-6 text-center max-w-xs">
            Cuando comiences a leer mangas, se registrarán aquí automáticamente para que puedas continuar donde te quedaste con un solo clic.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Explorar Catálogo
          </button>
        </div>
      )}
    </div>
  );
}
