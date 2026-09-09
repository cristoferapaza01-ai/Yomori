import React from 'react';
import { X, History, Trash2, ExternalLink, Play, BookOpen } from 'lucide-react';

export default function HistoryDrawer({
  isOpen,
  onClose,
  history = [],
  onSelectChapter,
  onClearHistory
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-[#11141c] border-l border-gray-800 p-6 flex flex-col shadow-2xl animate-slideLeft"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Historial de Lectura</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Historial */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
              <BookOpen className="w-12 h-12 text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">Sin lecturas recientes</p>
              <p className="text-xs text-gray-600 mt-1 max-w-xs">
                Los capítulos que leas se guardarán automáticamente aquí para que continúes cuando quieras.
              </p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#161a24] border border-gray-800/80 hover:border-purple-800/50 transition group flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {item.mangaTitle}
                    </h4>
                    {item.extension && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                        {item.extension}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-300/90 mt-0.5 truncate">
                    {item.chapterTitle}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onSelectChapter(item.url);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition transform active:scale-95 shrink-0"
                  title="Continuar leyendo"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Acciones al pie */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
            <button
              onClick={onClearHistory}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition px-2 py-1 rounded hover:bg-red-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar historial</span>
            </button>
            <span className="text-xs text-gray-500 font-mono">
              {history.length} {history.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
