import React from 'react';
import { BookOpen, BookMarked, Compass, History, Settings, Maximize2, Minimize2, ExternalLink, ArrowLeft, Puzzle } from 'lucide-react';

export default function Header({
  view,
  onNavigateTab,
  chapterData,
  selectedManga,
  libraryCount = 0,
  onGoBack,
  onOpenExtensions,
  onOpenHistory,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
  isVisible
}) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 bg-[#0e1217]/95 backdrop-blur-md border-b border-gray-800/80 transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 shadow-lg shadow-black/40' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        
        {/* Lado Izquierdo */}
        <div className="flex items-center gap-3 min-w-0">
          {view === 'manga' || view === 'reader' ? (
            <button
              onClick={onGoBack}
              className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-500/20">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent hidden sm:inline">
                Yomori<span className="text-white font-light text-xs ml-1 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/50">Reader</span>
              </span>
            </div>
          )}

          {view === 'reader' && chapterData && (
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white truncate">
                  {chapterData.mangaTitle}
                </h1>
                <span className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50">
                  {chapterData.extension}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {chapterData.chapterTitle}
              </p>
            </div>
          )}

          {view === 'manga' && selectedManga && (
            <div className="min-w-0 truncate">
              <h1 className="text-sm font-semibold text-white truncate">
                {selectedManga.title}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {selectedManga.chapters?.length || 0} capítulos
              </p>
            </div>
          )}
        </div>

        {/* Centro: Pestañas */}
        {view !== 'reader' && (
          <nav className="flex items-center bg-[#121622] p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => onNavigateTab('library')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                view === 'library'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Biblioteca</span>
              {libraryCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${view === 'library' ? 'bg-black/30 text-white' : 'bg-purple-950 text-purple-300'}`}>
                  {libraryCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigateTab('catalog')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                view === 'catalog'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explorar</span>
            </button>
          </nav>
        )}

        {/* Lado Derecho */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {view === 'reader' && chapterData?.currentUrl && (
            <a
              href={chapterData.currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition text-xs flex items-center gap-1"
              title="Abrir página original en fuente"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">Fuente</span>
            </a>
          )}

          {/* Botón de Descarga App PC */}
          <a
            href="/downloads/Yomori-Windows-x64.zip"
            download="Yomori-Windows-x64.zip"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition transform active:scale-95 cursor-pointer"
            title="Descargar Yomori Desktop para Windows (100% Offline)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar PC</span>
          </a>

          {/* Botón de Extensiones */}
          <button
            onClick={onOpenExtensions}
            className="p-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-950/40 border border-transparent hover:border-purple-800/50 transition relative flex items-center gap-1"
            title="Gestionar Repositorio de Extensiones"
          >
            <Puzzle className="w-4 h-4 text-purple-400" />
            <span className="hidden lg:inline text-xs font-medium text-purple-300">Extensiones</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition relative"
            title="Historial de lectura"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition"
            title="Ajustes de lectura y sistema"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
