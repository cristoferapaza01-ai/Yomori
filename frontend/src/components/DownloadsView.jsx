import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Loader2, 
  BookMarked, 
  ArrowRight,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  X
} from 'lucide-react';

export default function DownloadsView({
  downloadQueue = { items: [], isPaused: false },
  onExplore,
  onGoToLibrary,
  onCancelDownload,
  onTogglePauseQueue,
  onClearQueue
}) {
  const queueItems = downloadQueue?.items || [];
  const isPaused = !!downloadQueue?.isPaused;

  const activeCount = queueItems.filter(q => q.status === 'downloading').length;
  const pendingCount = queueItems.filter(q => q.status === 'pending').length;

  return (
    <div className="w-full min-h-screen px-4 sm:px-8 py-6 pb-28 animate-fadeIn text-gray-200">
      {/* 1. HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-800/80 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 shadow-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Descargas</h1>
              <p className="text-xs text-gray-400">
                Progreso y cola de capítulos en descarga activa
              </p>
            </div>
          </div>
        </div>

        {/* Acciones de la Cola */}
        {queueItems.length > 0 && (
          <div className="flex items-center gap-3">
            {onTogglePauseQueue && (
              <button
                onClick={onTogglePauseQueue}
                className="px-4 py-2 rounded-2xl bg-[#141824] hover:bg-[#1f2638] border border-gray-800 text-xs font-bold text-gray-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                    <span>Reanudar Cola</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pausar Cola</span>
                  </>
                )}
              </button>
            )}

            {onClearQueue && (
              <button
                onClick={onClearQueue}
                className="px-4 py-2 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancelar Todo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. LISTADO DE CAPÍTULOS EN DESCARGA ACTIVA */}
      {queueItems.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-1">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 font-bold flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {activeCount} en proceso
              </span>
              <span>•</span>
              <span>{pendingCount} en espera</span>
            </div>
            <span>Total en cola: {queueItems.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queueItems.map((item) => {
              const progress = item.progress || 0;
              const isItemDownloading = item.status === 'downloading';

              return (
                <div 
                  key={item.id || item.chapterUrl}
                  className="p-4 rounded-3xl bg-[#10141f] border border-purple-500/30 hover:border-purple-500/60 transition shadow-xl flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {item.mangaCover || item.cover ? (
                      <img 
                        src={item.mangaCover || item.cover} 
                        alt="" 
                        className="w-14 h-20 rounded-2xl object-cover border border-purple-500/30 shadow-md shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-20 rounded-2xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400 shrink-0">
                        <Download className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-bold text-white truncate" title={item.mangaTitle}>
                          {item.mangaTitle || 'Manga'}
                        </h4>
                        {onCancelDownload && (
                          <button
                            onClick={() => onCancelDownload(item.chapterUrl || item.id)}
                            className="p-1 rounded-lg hover:bg-red-950/60 text-gray-500 hover:text-red-400 transition cursor-pointer"
                            title="Cancelar descarga"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-purple-300 font-semibold truncate mt-0.5" title={item.chapterName}>
                        {item.chapterName || `Capítulo ${item.chapterNumber || 1}`}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 text-[10px] font-mono font-semibold">
                          {item.scanName || item.extension || item.extensionId || 'Scan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progreso y Estadísticas */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
                    <div className="w-full bg-gray-800/80 rounded-full h-2.5 overflow-hidden p-0.5">
                      <div 
                        className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${Math.max(progress, 5)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                      <span className="flex items-center gap-1">
                        {isItemDownloading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                            <span className="text-purple-300 font-bold">Descargando viñetas...</span>
                          </>
                        ) : (
                          <span className="text-gray-500">En espera en cola</span>
                        )}
                      </span>

                      <span className="font-bold text-white">
                        {item.downloadedPages || 0}/{item.totalPages || '?'} págs ({progress}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ESTADO VACÍO ELEGANTE */
        <div className="py-24 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400 shadow-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">No hay descargas activas en curso</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md">
              Todos los capítulos descargados están organizados y disponibles para lectura offline dentro de tu <strong className="text-purple-300">Biblioteca</strong> mediante el filtro de <strong className="text-emerald-400">Descargados</strong>.
            </p>
          </div>

          <button
            onClick={() => {
              if (onGoToLibrary) onGoToLibrary();
              else if (onExplore) onExplore();
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-purple-600/30 transition transform active:scale-95 cursor-pointer mt-2"
          >
            <BookMarked className="w-4 h-4" />
            <span>Ir a Mi Biblioteca</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
