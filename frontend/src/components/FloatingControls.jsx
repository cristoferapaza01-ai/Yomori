import React, { useState } from 'react';
import { 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  Sliders, 
  List,
  X
} from 'lucide-react';

export default function FloatingControls({
  chapterData,
  chapters = [],
  currentPage,
  totalPages,
  isVisible,
  settings,
  onNavigateChapter,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
  isAutoScrolling,
  onToggleAutoScroll
}) {
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);

  // Extraer número de capítulo formateado
  const getChapterLabel = () => {
    const title = chapterData?.chapterTitle || '';
    const match = title.match(/(?:cap[íi]tulo|cap\.?|ch\.?)\s*(\d+(?:\.\d+)?)/i) || title.match(/\b(\d+(?:\.\d+)?)\b/);
    if (match && match[1]) {
      return `Cap. ${match[1]}`;
    }
    return title.length > 12 ? title.substring(0, 12) + '...' : (title || 'Capítulo');
  };

  // Resolver URLs anterior y siguiente de forma infalible
  let resolvedPrevUrl = chapterData?.prevChapterUrl;
  let resolvedNextUrl = chapterData?.nextChapterUrl;

  if (chapters && chapters.length > 0 && chapterData?.currentUrl) {
    const currentIndex = chapters.findIndex(c => c.url === chapterData.currentUrl);
    if (currentIndex !== -1) {
      const firstNum = parseFloat(chapters[0]?.chapterNumber || 0);
      const lastNum = parseFloat(chapters[chapters.length - 1]?.chapterNumber || 0);
      const isDesc = firstNum >= lastNum;

      if (isDesc) {
        if (!resolvedNextUrl && currentIndex > 0) {
          resolvedNextUrl = chapters[currentIndex - 1]?.url;
        }
        if (!resolvedPrevUrl && currentIndex < chapters.length - 1) {
          resolvedPrevUrl = chapters[currentIndex + 1]?.url;
        }
      } else {
        if (!resolvedNextUrl && currentIndex < chapters.length - 1) {
          resolvedNextUrl = chapters[currentIndex + 1]?.url;
        }
        if (!resolvedPrevUrl && currentIndex > 0) {
          resolvedPrevUrl = chapters[currentIndex - 1]?.url;
        }
      }
    }
  }

  const percent = Math.min(100, Math.round((currentPage / (totalPages || 1)) * 100));
  const shouldShow = settings?.floatingControlsMode === 'visible' || isVisible;

  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out pointer-events-none max-w-[95vw] ${
          shouldShow ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full bg-[#11141d]/95 backdrop-blur-2xl border border-gray-800/90 shadow-2xl shadow-black/90 text-gray-300 select-none">
          
          {/* 1. Botón Capítulo Anterior */}
          <button
            onClick={() => resolvedPrevUrl && onNavigateChapter(resolvedPrevUrl)}
            disabled={!resolvedPrevUrl}
            className="p-2.5 rounded-full bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white active:scale-95 disabled:opacity-25 disabled:hover:bg-gray-800/80 disabled:pointer-events-none transition"
            title={resolvedPrevUrl ? 'Capítulo anterior' : 'No hay capítulo anterior'}
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <div className="h-4 w-px bg-gray-800/80 mx-0.5" />

          {/* 2. Botón Auto-Scroll (Play / Pause) */}
          <button
            onClick={onToggleAutoScroll}
            className={`p-2.5 rounded-full transition active:scale-95 ${
              isAutoScrolling
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                : 'bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white'
            }`}
            title={isAutoScrolling ? 'Pausar auto-scroll' : 'Bajar página automáticamente (Auto-scroll)'}
          >
            {isAutoScrolling ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* 3. Botón Pantalla Completa */}
          <button
            onClick={onToggleFullscreen}
            className="p-2.5 rounded-full bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white active:scale-95 transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-gray-800/80 mx-0.5" />

          {/* 4. Pastilla Central con Capítulo */}
          <button
            onClick={() => setShowChaptersDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition"
            title="Ver lista de capítulos al lado derecho"
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span>{getChapterLabel()}</span>
          </button>

          {/* 5. Botón Ajustes */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white active:scale-95 transition"
            title="Ajustes (Ancho, Fondo, Velocidad, Controles)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-gray-800/80 mx-0.5" />

          {/* 6. Botón Siguiente Capítulo */}
          <button
            onClick={() => resolvedNextUrl && onNavigateChapter(resolvedNextUrl)}
            disabled={!resolvedNextUrl}
            className="p-2.5 rounded-full bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white active:scale-95 disabled:opacity-25 disabled:hover:bg-gray-800/80 disabled:pointer-events-none transition"
            title={resolvedNextUrl ? 'Siguiente capítulo' : 'No hay siguiente capítulo'}
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

        </div>
      </div>

      {/* Panel Lateral Derecho de Capítulos (Drawer deslizante a la derecha) */}
      {showChaptersDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs select-none transition-opacity"
          onClick={() => setShowChaptersDrawer(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-[#0c101a] border-l border-gray-800/90 shadow-2xl shadow-black z-50 flex flex-col animate-slideLeft"
          >
            {/* Encabezado del Panel */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/80">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Capítulos</h3>
                <span className="text-[11px] font-mono text-gray-500">
                  ({chapters.length})
                </span>
              </div>
              <button 
                onClick={() => setShowChaptersDrawer(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progreso del capítulo actual */}
            <div className="px-4 py-2.5 bg-[#080b12] border-b border-gray-800/60 flex items-center justify-between text-xs">
              <span className="text-gray-400">Progreso actual:</span>
              <span className="font-mono font-bold text-purple-400">
                Pág. {currentPage}/{totalPages || 1} ({percent}%)
              </span>
            </div>

            {/* Lista Vertical de Capítulos estilo barra lateral */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-900/60 py-1">
              {chapters.length > 0 ? (
                chapters.map((ch) => {
                  const isCurrent = ch.url === chapterData?.currentUrl;
                  return (
                    <button
                      key={ch.url}
                      onClick={() => {
                        setShowChaptersDrawer(false);
                        onNavigateChapter(ch.url);
                      }}
                      className={`w-full text-left py-2.5 px-4 text-xs font-medium transition flex items-center gap-2.5 ${
                        isCurrent 
                          ? 'bg-purple-600/15 border-l-4 border-purple-500 text-purple-300 font-bold' 
                          : 'text-gray-400 hover:text-purple-200 hover:bg-gray-800/40'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-purple-400' : 'bg-gray-600'}`} />
                      <span className="truncate flex-1">{ch.name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  {chapterData?.chapterTitle || 'Capítulo actual'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
