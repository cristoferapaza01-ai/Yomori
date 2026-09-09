import React from 'react';
import { History, Play, Trash2, BookOpen, Clock, Calendar } from 'lucide-react';

export default function HistoryView({
  history = [],
  onSelectChapter,
  onClearHistory,
  onExplore
}) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <span>Historial de Lectura</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Registro cronológico de tus capítulos leídos
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar Historial</span>
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#121622] border border-gray-800/80 hover:border-purple-800/50 transition flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {(item.coverProxy || item.cover) ? (
                  <img
                    src={item.coverProxy || item.cover}
                    alt={item.mangaTitle}
                    className="w-12 h-16 object-cover rounded-xl bg-[#0a0c10] shrink-0 border border-gray-800 shadow-md"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-12 h-16 rounded-xl bg-gray-800/80 border border-gray-700/60 shrink-0 flex items-center justify-center text-gray-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition truncate">
                      {item.mangaTitle}
                    </h4>
                    {item.extension && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50 font-mono shrink-0">
                        {item.extension}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-1 font-medium truncate">
                    {item.chapterTitle}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectChapter(item.url, item.mangaUrl)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Continuar</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
          <History className="w-12 h-12 text-gray-700 mb-3" />
          <h3 className="text-base font-bold text-gray-300">Sin historial de lectura</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Los capítulos que leas se guardarán automáticamente aquí.
          </p>
          <button
            onClick={onExplore}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg transition"
          >
            Comenzar a leer
          </button>
        </div>
      )}
    </div>
  );
}
