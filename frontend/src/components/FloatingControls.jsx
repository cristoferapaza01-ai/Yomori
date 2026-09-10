import React, { useState } from 'react';
import { 
  ArrowLeft,
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
  mangaTitle = '',
  currentPage,
  totalPages,
  isVisible,
  settings,
  onBack,
  onNavigateChapter,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
  isAutoScrolling,
  onToggleAutoScroll
}) {
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);

  // Extraer número de capítulo formateado limpiando números del título
  const getChapterLabel = () => {
    let title = chapterData?.chapterTitle || '';
    const mTitle = mangaTitle || chapterData?.mangaTitle || '';
    if (mTitle) {
      const cleanTitle = mTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(cleanTitle, 'gi'), '');
    }
    title = title.replace(/\b10[.,]?000\b/gi, '').replace(/\b\d{4,}\b/g, '');

    const match = title.match(/(?:cap[íi]tulo|cap\.?|ch\.?|episodio|ep\.?)\s*(\d+(?:\.\d+)?)/i) || title.match(/\b(\d+(?:\.\d+)?)\b/);
    if (match && match[1]) {
      return `Cap. ${match[1]}`;
    }
    const clean = title.trim();
    return clean.length > 15 ? clean.substring(0, 15) + '...' : (clean || `Capítulo ${currentPage}`);
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
      {/* 0. BARRA SUPERIOR PERSISTENTE (Título del Manga, Capítulo y Botón Volver) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out select-none ${
          shouldShow ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full bg-[#090c14]/95 backdrop-blur-md border-b border-gray-800/80 px-4 sm:px-6 h-14 flex items-center justify-between shadow-2xl">
          {/* Botón Volver e Información del Manga */}
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 px-2.5 rounded-xl bg-gray-800/90 hover:bg-gray-700 text-gray-200 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 shadow-sm border border-gray-700/60"
                title="Volver"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[280px] sm:max-w-md">
                {mangaTitle || chapterData?.mangaTitle || 'Manga'}
              </h2>
              <span className="text-[11px] text-purple-400 font-semibold truncate">
                {chapterData?.chapterTitle && chapterData.chapterTitle !== (mangaTitle || chapterData?.mangaTitle) ? chapterData.chapterTitle : getChapterLabel()}
              </span>
            </div>
          </div>

          {/* Lado Derecho: Paginación y Ajustes rápidos */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <span className="text-xs font-mono font-medium text-gray-400 hidden sm:inline">
              Página <strong className="text-purple-400">{currentPage}</strong> de <strong>{totalPages || 1}</strong> ({percent}%)
            </span>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-purple-600 text-gray-300 hover:text-white transition cursor-pointer"
              title="Ajustes del lector"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. BARRA FLOTANTE INFERIOR */}
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
