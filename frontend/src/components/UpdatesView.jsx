import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  Play, 
  Clock, 
  Calendar, 
  BookOpen, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCheck,
  Eye,
  Filter
} from 'lucide-react';

const getProxiedCover = (cover, extensionId = '') => {
  if (!cover) return '';
  if (cover.startsWith('/api/proxy-image') || cover.startsWith('http://localhost:4000/api/proxy-image')) {
    return cover;
  }
  return `/api/proxy-image?url=${encodeURIComponent(cover)}&extensionId=${encodeURIComponent(extensionId || '')}`;
};

export default function UpdatesView({
  library = [],
  onSelectChapter,
  onSelectManga,
  onExplore,
  onUpdatesCountChange
}) {
  const [updatesList, setUpdatesList] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [filterMode, setFilterMode] = useState('only_new'); // 'only_new' | 'all'
  const [lastCheckTime, setLastCheckTime] = useState(() => localStorage.getItem('yomori_last_updates_check') || null);

  // Helper para leer/guardar el mapa de capítulos conocidos cuando se agregaron a biblioteca
  const getTrackedChaptersMap = () => {
    try {
      return JSON.parse(localStorage.getItem('yomori_library_tracked_chapters') || '{}');
    } catch {
      return {};
    }
  };

  const saveTrackedChaptersMap = (map) => {
    try {
      localStorage.setItem('yomori_library_tracked_chapters', JSON.stringify(map));
    } catch {}
  };

  // Helper para verificar si la fecha del capítulo es reciente (últimas 24-48 horas)
  const isRecentChapter = (dateStr) => {
    if (!dateStr) return false;
    const s = String(dateStr).toLowerCase();
    if (s.includes('segundo') || s.includes('minuto') || s.includes('hora') || s.includes('hoy') || s.includes('ayer') || s.includes('justo') || s.includes('recién')) {
      return true;
    }
    const dayMatch = s.match(/(\d+)\s*(?:día|dia|días|dias|d\b)/);
    if (dayMatch && parseInt(dayMatch[1], 10) > 1) {
      return false;
    }
    if (s.includes('semana') || s.includes('mes') || s.includes('año') || s.includes('sem')) {
      return false;
    }
    const parts = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (parts) {
      const d = parseInt(parts[1], 10);
      const m = parseInt(parts[2], 10) - 1;
      const y = parts[3].length === 2 ? 2000 + parseInt(parts[3], 10) : parseInt(parts[3], 10);
      const chapterDate = new Date(y, m, d);
      if (!isNaN(chapterDate.getTime())) {
        const diffHours = (Date.now() - chapterDate.getTime()) / (1000 * 3600);
        if (diffHours > 48) return false;
      }
    }
    return true;
  };

  // Comprobar nuevos capítulos únicamente para los mangas en la biblioteca del usuario
  const checkLibraryUpdates = async (force = false) => {
    if (!library || library.length === 0) {
      setUpdatesList([]);
      if (onUpdatesCountChange) onUpdatesCountChange(0);
      localStorage.setItem('tachiyomi_updates_count', '0');
      return;
    }

    setIsChecking(true);
    const trackedMap = getTrackedChaptersMap();
    let updatedTrackedMap = { ...trackedMap };
    const results = [];

    // Consultar en paralelo directamente al scan asignado de cada manga
    const promises = library.map(async (item) => {
      try {
        const extId = item.extensionId || item.extension || 'olympus-scanlation';
        const res = await axios.get(`/api/manga?url=${encodeURIComponent(item.url)}&extensionId=${encodeURIComponent(extId)}`, {
          timeout: 10000
        });

        if (res.data?.success && res.data?.data) {
          const freshManga = res.data.data;
          const chapters = freshManga.chapters || [];
          const latestChapter = chapters[0];
          const currentTotal = chapters.length;

          const existingTracked = trackedMap[item.url];

          // Si es la primera vez que se rastrea este manga o la biblioteca no tenía el total real:
          // Establecer la línea base con el estado actual del scan (NO marcar como nuevo capítulo histórico)
          if (!existingTracked || !existingTracked.isInitialized || (existingTracked.initialCount <= 1 && currentTotal > 1)) {
            updatedTrackedMap[item.url] = {
              initialCount: currentTotal,
              lastSeenUrl: latestChapter?.url || '',
              lastSeenName: latestChapter?.name || '',
              lastSeenDate: latestChapter?.date || '',
              lastSeenAt: new Date().toISOString(),
              isInitialized: true
            };

            results.push({
              manga: {
                ...item,
                title: freshManga.title || item.title,
                cover: freshManga.cover || item.cover,
                coverProxy: freshManga.coverProxy || item.coverProxy,
                extensionId: extId,
                scanSource: freshManga.extension || item.scanSource || extId,
                totalChapters: currentTotal
              },
              latestChapter: latestChapter || { name: 'Capítulo Reciente', url: item.url },
              chapterCount: currentTotal,
              isNew: false,
              updatedAt: latestChapter?.date || freshManga.updatedAt || 'Reciente'
            });
            return;
          }

          // Para mangas ya inicializados previamente:
          // Un capítulo es NUEVO si:
          // 1. Hay más capítulos que la línea base previa guardada (currentTotal > existingTracked.initialCount)
          // 2. O la URL del último capítulo es distinta de la última registrada
          // 3. Y la fecha del capítulo es reciente (no de hace 4 días ni semanas pasadas)
          // 4. Y el usuario no lo tiene marcado como leído
          const hasMoreChapters = currentTotal > (existingTracked.initialCount || 0);
          const hasNewerChapterUrl = latestChapter?.url && latestChapter.url !== existingTracked.lastSeenUrl;
          const isDateRecent = isRecentChapter(latestChapter?.date);
          const isRead = item.readChapters?.includes(latestChapter?.url);

          const isGenuinelyNew = (hasMoreChapters || hasNewerChapterUrl) && isDateRecent && !isRead;

          results.push({
            manga: {
              ...item,
              title: freshManga.title || item.title,
              cover: freshManga.cover || item.cover,
              coverProxy: freshManga.coverProxy || item.coverProxy,
              extensionId: extId,
              scanSource: freshManga.extension || item.scanSource || extId,
              totalChapters: currentTotal
            },
            latestChapter: latestChapter || { name: 'Capítulo Reciente', url: item.url },
            chapterCount: currentTotal,
            isNew: isGenuinelyNew,
            updatedAt: latestChapter?.date || freshManga.updatedAt || 'Reciente'
          });
        } else {
          results.push({
            manga: item,
            latestChapter: item.lastReadChapter || { name: `Capítulo disponible`, url: item.url },
            chapterCount: item.totalChapters || 1,
            isNew: false,
            updatedAt: 'Reciente'
          });
        }
      } catch (err) {
        results.push({
          manga: item,
          latestChapter: item.lastReadChapter || { name: `Capítulo disponible`, url: item.url },
          chapterCount: item.totalChapters || 1,
          isNew: false,
          updatedAt: 'Guardado'
        });
      }
    });

    await Promise.allSettled(promises);
    saveTrackedChaptersMap(updatedTrackedMap);
    setUpdatesList(results);

    const newUpdatesCount = results.filter(r => r.isNew).length;
    if (onUpdatesCountChange) onUpdatesCountChange(newUpdatesCount);
    localStorage.setItem('tachiyomi_updates_count', String(newUpdatesCount));
    setIsChecking(false);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastCheckTime(nowStr);
    localStorage.setItem('yomori_last_updates_check', nowStr);
  };

  // Marcar una actualización de manga como vista/leída
  const handleDismissUpdate = (mangaUrl, latestChapterUrl, totalChapters) => {
    const trackedMap = getTrackedChaptersMap();
    trackedMap[mangaUrl] = {
      initialCount: totalChapters,
      lastSeenUrl: latestChapterUrl,
      lastSeenAt: new Date().toISOString()
    };
    saveTrackedChaptersMap(trackedMap);

    setUpdatesList(prev => prev.map(item => {
      if (item.manga.url === mangaUrl) {
        return { ...item, isNew: false };
      }
      return item;
    }));

    const remainingCount = updatesList.filter(r => r.manga.url !== mangaUrl && r.isNew).length;
    if (onUpdatesCountChange) onUpdatesCountChange(remainingCount);
    localStorage.setItem('tachiyomi_updates_count', String(remainingCount));
  };

  // Marcar todas como leídas
  const handleMarkAllAsSeen = () => {
    const trackedMap = getTrackedChaptersMap();
    updatesList.forEach(({ manga, latestChapter, chapterCount }) => {
      trackedMap[manga.url] = {
        initialCount: chapterCount,
        lastSeenUrl: latestChapter?.url || '',
        lastSeenAt: new Date().toISOString()
      };
    });
    saveTrackedChaptersMap(trackedMap);
    setUpdatesList(prev => prev.map(item => ({ ...item, isNew: false })));
    if (onUpdatesCountChange) onUpdatesCountChange(0);
    localStorage.setItem('tachiyomi_updates_count', '0');
  };

  useEffect(() => {
    checkLibraryUpdates(false);
  }, [library.length]);

  const newUpdatesList = updatesList.filter(item => item.isNew);
  // Mostrar los capítulos de todos los mangas de la biblioteca, priorizando los que tengan capítulos nuevos
  const displayedList = [...updatesList].sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return (b.chapterCount || 0) - (a.chapterCount || 0);
  });

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-10 py-6 pb-28 space-y-6 animate-fadeIn select-none">
      
      {/* Encabezado y Barra de Acciones Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Actualizaciones de Biblioteca</span>
              {newUpdatesList.length > 0 && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  {newUpdatesList.length} nuevos
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Capítulos nuevos y estrenos exclusivamente de tus fuentes y scans guardados.
            </p>
          </div>
        </div>

        {/* Botones de Control */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {newUpdatesList.length > 0 && (
            <button
              onClick={handleMarkAllAsSeen}
              title="Marcar todas como leídas"
              className="px-3 py-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Marcar visto</span>
            </button>
          )}

          <button
            onClick={() => checkLibraryUpdates(true)}
            disabled={isChecking || library.length === 0}
            className="px-4 py-2 rounded-xl bg-[#121622] hover:bg-purple-900/60 border border-gray-800 hover:border-purple-600/50 text-gray-200 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-purple-400 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Revisando Scans...' : 'Comprobar Novedades'}</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {library.length === 0 ? (
        <div className="py-24 text-center text-gray-400 max-w-md mx-auto flex flex-col items-center bg-[#0d1017] border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center mb-4 text-purple-400 shadow-xl">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">Tu biblioteca está vacía</h3>
          <p className="text-xs text-gray-400 mt-2 mb-6 leading-relaxed">
            Agrega mangas a tu biblioteca para recibir actualizaciones automáticas de sus nuevos capítulos directamente desde sus scans de origen.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Explorar Catálogo de Scans
          </button>
        </div>
      ) : displayedList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {displayedList.map(({ manga, latestChapter, chapterCount, isNew, updatedAt }) => (
            <div
              key={manga.url}
              className={`group relative bg-[#121622] border ${isNew ? 'border-purple-500/50 shadow-purple-950/40' : 'border-gray-800/80'} hover:border-purple-500/80 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Parte Superior: Portada + Información */}
              <div className="flex gap-3.5">
                {/* Portada del Manga */}
                <div 
                  onClick={() => onSelectManga && onSelectManga(manga, manga.extensionId)}
                  className="relative w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden bg-black shrink-0 border border-gray-800 shadow-md cursor-pointer group-hover:scale-[1.02] transition-transform"
                >
                  <img
                    src={manga.coverProxy || getProxiedCover(manga.cover, manga.extensionId)}
                    alt={manga.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  {isNew && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                      Nuevo
                    </div>
                  )}
                </div>

                {/* Detalles del Manga */}
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide truncate block">
                      {manga.scanSource || manga.extensionId || 'Scan Guardado'}
                    </span>
                    <h3 
                      onClick={() => onSelectManga && onSelectManga(manga, manga.extensionId)}
                      className="text-sm font-black text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug cursor-pointer mt-0.5"
                      title={manga.title}
                    >
                      {manga.title}
                    </h3>
                  </div>

                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        isNew 
                          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/50' 
                          : 'bg-purple-950/80 text-purple-200 border border-purple-700/50'
                      }`}>
                        {latestChapter?.name || `Cap. Reciente`}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{updatedAt || 'Recién sincronizado'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón de Acción Directo: Leer Capítulo o Ver Manga */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-800/60">
                <button
                  onClick={() => {
                    handleDismissUpdate(manga.url, latestChapter?.url, chapterCount);
                    if (latestChapter?.url && onSelectChapter) {
                      onSelectChapter(latestChapter.url, manga.url, null, manga);
                    } else if (onSelectManga) {
                      onSelectManga(manga, manga.extensionId);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Leer Capítulo</span>
                </button>

                <button
                  onClick={() => onSelectManga && onSelectManga(manga, manga.extensionId)}
                  title="Ver ficha del manga"
                  className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Estado Vacío cuando no hay actualizaciones pendientes */
        <div className="py-20 text-center text-gray-400 max-w-lg mx-auto flex flex-col items-center bg-[#0d1017]/90 border border-gray-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">¡Tu biblioteca está al día!</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              No hay capítulos nuevos en los {library.length} mangas de tu biblioteca. Cuando tus scans favoritos publiquen nuevos episodios, los verás listados aquí automáticamente.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => checkLibraryUpdates(true)}
              disabled={isChecking}
              className="px-5 py-2.5 rounded-xl bg-[#141824] hover:bg-purple-900/40 border border-gray-700 text-gray-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Comprobando Scans...' : 'Comprobar Novedades'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
