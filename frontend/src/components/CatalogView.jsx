import React, { useState } from 'react';
import { Search, RefreshCw, Layers, Link2, ArrowRight, Loader2, Puzzle, Plus, Sparkles, BookOpen } from 'lucide-react';

export default function CatalogView({
  installedExtensions = [],
  selectedExtension,
  onSelectExtension,
  onOpenExtensionsModal,
  catalog = [],
  loading,
  onSearch,
  onRefresh,
  onSelectManga,
  onDirectExtract
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');
  const [directUrl, setDirectUrl] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      onRefresh();
    } else {
      onSearch(searchTerm.trim());
    }
  };

  const handleDirectSubmit = (e) => {
    e.preventDefault();
    if (directUrl.trim()) {
      onDirectExtract(directUrl.trim());
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      
      {/* Selector de Fuentes Instaladas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/80">
        
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Fuentes:</span>
          </span>

          {installedExtensions.map((ext) => (
            <button
              key={ext.id}
              onClick={() => onSelectExtension(ext.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
                selectedExtension === ext.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-[#141822] text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              <span>{ext.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-purple-200 font-mono">
                v{ext.version}
              </span>
            </button>
          ))}

          {/* Botón para añadir/gestionar extensiones */}
          <button
            onClick={onOpenExtensionsModal}
            className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-semibold flex items-center gap-1 transition shrink-0"
            title="Abrir Repositorio de Extensiones"
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>+ Extensiones</span>
          </button>
        </div>

        {/* Pestañas: Catálogo vs Enlace Directo */}
        <div className="flex items-center bg-[#10131a] p-1 rounded-xl border border-gray-800 text-xs self-end sm:self-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'catalog'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              activeTab === 'direct'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Pegar URL</span>
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'direct' ? (
        <div className="max-w-2xl mx-auto my-12 bg-[#121620] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-400" />
            <span>Cargar capítulo por enlace directo</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Pega el enlace de un capítulo para extraer y visualizar las viñetas inmediatamente.
          </p>

          <form onSubmit={handleDirectSubmit} className="flex gap-2">
            <input
              type="url"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              placeholder="https://olympusxyz.com/capitulo/..."
              className="flex-1 bg-[#0b0e14] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !directUrl.trim()}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Cargar</span>
            </button>
          </form>
        </div>
      ) : (
        /* Pestaña Catálogo */
        <div>
          {installedExtensions.length === 0 ? (
            <div className="py-20 text-center text-gray-500 max-w-sm mx-auto flex flex-col items-center">
              <Puzzle className="w-14 h-14 text-purple-500/40 mb-3" />
              <h3 className="text-base font-bold text-gray-200">No tienes extensiones instaladas</h3>
              <p className="text-xs text-gray-400 mt-1 mb-5">
                Conecta tu repositorio Yomori e instala extensiones para explorar catálogos en tiempo real.
              </p>
              <button
                onClick={onOpenExtensionsModal}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                <Puzzle className="w-4 h-4" />
                <span>Explorar Repositorio</span>
              </button>
            </div>
          ) : (
            <>
              {/* Barra de búsqueda */}
              <div className="flex items-center gap-3 mb-6">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar manga o cómic en esta fuente..."
                    className="w-full bg-[#11141c] border border-gray-800 rounded-xl pl-10 pr-24 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Buscar
                  </button>
                </form>

                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-2.5 bg-[#141822] hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl transition flex items-center gap-1 text-xs"
                  title="Recargar catálogo"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
                </button>
              </div>

              {/* Estado de carga */}
              {loading && catalog.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-3" />
                  <p className="text-sm font-medium text-gray-300">Conectando al repositorio y raspando en vivo...</p>
                  <p className="text-xs text-gray-500 mt-1">Evolucionando filtros y extrayendo viñetas.</p>
                </div>
              )}

              {/* Cuadrícula de mangas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {catalog.map((manga) => (
                  <div
                    key={manga.url}
                    onClick={() => onSelectManga(manga.url)}
                    className="group relative rounded-2xl bg-[#131720] border border-gray-800/80 overflow-hidden cursor-pointer hover:border-purple-600/70 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/30 flex flex-col transform hover:-translate-y-1"
                  >
                    <div className="aspect-[3/4] w-full bg-[#0a0c10] overflow-hidden relative">
                      {manga.coverProxy || manga.cover ? (
                        <img
                          src={manga.coverProxy || manga.cover}
                          alt={manga.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                      {manga.latestChapter && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-medium text-purple-300 border border-purple-800/40">
                          {manga.latestChapter}
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-end bg-[#131720]">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-purple-300 transition line-clamp-2 leading-tight">
                        {manga.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>

              {!loading && catalog.length === 0 && (
                <div className="py-20 text-center text-gray-500">
                  <p className="text-sm font-medium text-gray-400">No se encontraron series en esta fuente</p>
                  <button
                    onClick={onRefresh}
                    className="mt-3 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
