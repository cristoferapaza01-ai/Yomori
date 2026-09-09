import React from 'react';
import { Sparkles, Play, Calendar, BookOpen, RefreshCw } from 'lucide-react';

export default function UpdatesView({
  library = [],
  onSelectChapter,
  onExplore
}) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Actualizaciones Recientes</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Novedades y capítulos de los mangas en tu biblioteca
          </p>
        </div>
      </div>

      {library.length > 0 ? (
        <div className="space-y-3">
          {library.map((item) => (
            <div
              key={item.url}
              className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 hover:border-purple-800/50 transition flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={item.coverProxy || item.cover}
                  alt={item.title}
                  className="w-12 h-16 object-cover rounded-xl bg-gray-900 shrink-0 border border-gray-800"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                    {item.title}
                  </h4>
                  <p className="text-xs text-purple-300/90 font-medium mt-0.5">
                    {item.lastReadChapter ? `Último: ${item.lastReadChapter.name}` : `${item.totalChapters} capítulos disponibles`}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Actualizado recientemente</span>
                  </p>
                </div>
              </div>

              {item.lastReadChapter && (
                <button
                  onClick={() => onSelectChapter(item.lastReadChapter.url, item.url)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Leer</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
          <Sparkles className="w-12 h-12 text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-300">Sin actualizaciones</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Añade mangas a tu biblioteca para recibir avisos de capítulos nuevos aquí.
          </p>
          <button
            onClick={onExplore}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg transition"
          >
            Explorar Fuentes
          </button>
        </div>
      )}
    </div>
  );
}
