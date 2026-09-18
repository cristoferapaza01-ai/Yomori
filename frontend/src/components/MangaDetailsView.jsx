import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LiveChatRoom from './LiveChatRoom.jsx';
import { 
  ArrowLeft, 
  Play, 
  ArrowDownUp, 
  Search, 
  BookOpen, 
  MessageSquare,
  Check, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink, 
  Calendar, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  ChevronDown,
  Trash2,
  Lock,
  X,
  AlertCircle,
  Download,
  DownloadCloud,
  CheckCircle,
  Loader2,
  HardDrive,
  Sparkles,
  Flame,
  Star
} from 'lucide-react';

const FALLBACK_COVER = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2318182b'/%3E%3Cstop offset='100%25' stop-color='%230b0b14'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23bg)'/%3E%3Ccircle cx='150' cy='200' r='48' fill='%237c3aed' fill-opacity='0.25'/%3E%3Cpath d='M135 180h30v40h-30z' fill='%23a78bfa' fill-opacity='0.7'/%3E%3Ctext x='50%25' y='275' dominant-baseline='middle' text-anchor='middle' fill='%23e2e8f0' font-family='system-ui, -apple-system, sans-serif' font-size='14' font-weight='700' letter-spacing='1'%3EYOMORI%3C/text%3E%3Ctext x='50%25' y='298' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='system-ui, -apple-system, sans-serif' font-size='11' font-weight='500'%3ESin Portada%3C/text%3E%3C/svg%3E";

// Helper para mostrar el nombre canónico y elegante del scan
const getExtensionDisplayName = (ext, extId) => {
  if (ext && ext !== 'ZonaTMO') return ext;
  const id = (extId || '').toLowerCase();
  if (id === 'olympus-scanlation') return 'Olympus Scanlation';
  if (id === 'rn-scanlation') return 'RN Scanlation';
  if (id === 'plot-twist-no-fansub') return 'Plot Twist No Fansub';
  if (id === 'skymangas') return 'SkyMangas';
  if (id === 'miauscan') return 'MiauScan';
  if (id === 'manhwalatino') return 'ManhwaLatino';
  if (id === 'mangadex') return 'MangaDex';
  if (id === 'zonatmo') return 'ZonaTMO';
  if (id === 'ikigai-mnagas') return 'Ikigai Mangas';
  return ext || (extId ? extId.replace(/-/g, ' ').toUpperCase() : 'Scan Oficial');
};

export default function MangaDetailsView({
  manga,
  libraryItem,
  onToggleLibrary,
  onUpdateCategory,
  onToggleChapterRead,
  onMarkAllChapters,
  onBack,
  onSelectChapter,
  onSelectManga,
  loadingChapter,
  categories = ['Todos'],
  readChaptersMap = {},
  chapterProgressMap = {},
  downloadStatusMap = {},
  downloadQueue = { items: [] },
  onDownloadChapter,
  onDownloadBatch,
  onDeleteDownload,
  currentUser = null,
  onOpenAuth,
  onOpenUserCard,
  appMode = 'manga'
}) {
  const isAnimeMode = appMode === 'anime' ||
    manga?.type === 'anime' ||
    manga?.type === 'TV (Serie)' ||
    (manga?.extensionId || '').toLowerCase().includes('anime') ||
    (manga?.extensionId || '').toLowerCase().includes('monos');

  const [activeTab, setActiveTab] = useState('chapters'); // 'chapters' | 'comments'
  const [sortAsc, setSortAsc] = useState(false);
  const [chapterFilter, setChapterFilter] = useState('');
  const [selectedLangFilter, setSelectedLangFilter] = useState('Todos'); // 'Todos' | 'Latino' | 'Castellano'
  const [selectedRangeTab, setSelectedRangeTab] = useState('Todos'); // 'Todos' | '1-50' | '51-100' ...
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [lockedModal, setLockedModal] = useState(null);
  const [needLibraryModal, setNeedLibraryModal] = useState(null);

  // Estados de Recomendaciones Similares
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Detectar automáticamente dialectos disponibles en los capítulos
  const detectedLanguages = React.useMemo(() => {
    const found = new Set();
    (manga?.chapters || []).forEach(c => {
      const name = (c.name || c.title || '').toLowerCase();
      if (name.includes('latino') || name.includes('🇲🇽') || name.includes('[mx') || name.includes('es-la') || name.includes('es-419')) {
        found.add('Latino');
      }
      if (name.includes('castellano') || name.includes('españa') || name.includes('espana') || name.includes('🇪🇸') || name.includes('[es]') || name.includes('es-es')) {
        found.add('Castellano');
      }
    });
    return Array.from(found);
  }, [manga?.chapters]);

  useEffect(() => {
    if (!manga?.title) return;
    let isMounted = true;
    setLoadingRecommendations(true);

    const genresStr = Array.isArray(manga.genres) ? manga.genres.join(',') : (manga.genres || '');
    axios.get('/api/recommendations', {
      params: {
        title: manga.title,
        genres: genresStr,
        synopsis: manga.synopsis || '',
        extensionId: manga.extensionId || '',
        type: isAnimeMode ? 'anime' : 'manga',
        limit: 30
      },
      timeout: 8000
    }).then(res => {
      if (isMounted && res.data?.success) {
        setRecommendations(res.data.data || []);
      }
    }).catch(err => {
      console.warn('[Recommendations Fetch Error]', err.message);
    }).finally(() => {
      if (isMounted) setLoadingRecommendations(false);
    });

    return () => { isMounted = false; };
  }, [manga?.title, manga?.url, isAnimeMode]);

  if (!manga) return null;

  const chapters = manga.chapters || [];
  const readChaptersSet = new Set([
    ...(libraryItem?.readChapters || []),
    ...chapters.filter(c => readChaptersMap[c.url]).map(c => c.url)
  ]);

  const isInLibrary = !!libraryItem;
  const currentCategory = libraryItem?.category || 'General';

  const triggerDownloadChapter = (chapter) => {
    if (!isInLibrary) {
      setNeedLibraryModal({ type: 'single', chapter });
      return;
    }
    if (onDownloadChapter) onDownloadChapter(chapter, manga);
  };

  const triggerDownloadBatch = (chaptersList) => {
    if (!chaptersList || chaptersList.length === 0) return;
    if (!isInLibrary) {
      setNeedLibraryModal({ type: 'batch', chapters: chaptersList });
      return;
    }
    if (onDownloadBatch) onDownloadBatch(chaptersList, manga);
  };

  // Filtrar
  const filteredChapters = chapters.filter(c => {
    if (!c) return false;
    const name = (c.name || c.title || '').toLowerCase();
    const num = String(c.chapterNumber || '');
    const filter = (chapterFilter || '').toLowerCase().trim();

    // Filtro estricto por dialecto / idioma
    if (selectedLangFilter === 'Latino') {
      const isLatino = name.includes('latino') || name.includes('🇲🇽') || name.includes('[mx') || name.includes('es-la') || name.includes('es-419');
      if (!isLatino && (name.includes('castellano') || name.includes('españa') || name.includes('espana') || name.includes('🇪🇸') || name.includes('[es]'))) {
        return false;
      }
    } else if (selectedLangFilter === 'Castellano') {
      const isCastellano = name.includes('castellano') || name.includes('españa') || name.includes('espana') || name.includes('🇪🇸') || name.includes('[es]') || name.includes('es-es');
      if (!isCastellano && (name.includes('latino') || name.includes('🇲🇽') || name.includes('[mx') || name.includes('es-la'))) {
        return false;
      }
    }

    if (!filter) return true;
    return name.includes(filter) || num.includes(filter);
  });

  // Extractor inteligente de número de capítulo que ignora números del título del manga
  const getChapterNum = (c) => {
    if (!c) return 0;
    
    let rawStr = String(c.name || c.title || '');
    if (manga?.title) {
      const cleanTitle = manga.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rawStr = rawStr.replace(new RegExp(cleanTitle, 'gi'), '');
    }
    rawStr = rawStr.replace(/\b10[.,]?000\b/gi, '').replace(/\b\d{4,}\b/g, '');

    const capMatch = rawStr.match(/(?:cap[íi]tulo|cap\.?|ch\.?|episodio|ep\.?)\s*(\d+(?:\.\d+)?)/i);
    if (capMatch && capMatch[1]) return parseFloat(capMatch[1]);

    const anyNum = rawStr.match(/\b(\d+(?:\.\d+)?)\b/);
    if (anyNum && anyNum[1]) return parseFloat(anyNum[1]);

    if (c.chapterNumber && !isNaN(parseFloat(c.chapterNumber))) {
      const parsed = parseFloat(c.chapterNumber);
      if (parsed < 1000) return parsed;
    }

    return 0;
  };

  // Ordenar
  const sortedChapters = [...filteredChapters].sort((a, b) => {
    const numA = getChapterNum(a);
    const numB = getChapterNum(b);
    return sortAsc ? numA - numB : numB - numA;
  });

  // Encontrar el primer capítulo no leído o en progreso
  const nextUnreadChapter = chapters.slice().reverse().find(c => {
    const prog = chapterProgressMap[c.url];
    const isPart = prog?.page && prog.page > 1 && prog.page < (prog.totalPages || 999);
    if (isPart) return true;
    return !readChaptersSet.has(c.url);
  }) || chapters[0];
  const nextUnreadProgress = nextUnreadChapter ? chapterProgressMap[nextUnreadChapter.url] : null;
  const nextUnreadPage = nextUnreadProgress?.page && nextUnreadProgress.page > 1 ? nextUnreadProgress.page : 1;

  const availableCategories = categories.filter(c => c !== 'Todos');
  const displayCategories = availableCategories.length > 0 
    ? availableCategories 
    : ['General', 'Leyendo', 'Favoritos', 'Pendientes', 'Completados'];

  // Dividir recomendaciones para los dos costados laterales (Solo en modo Manga)
  const leftRecs = isAnimeMode ? [] : recommendations.filter((_, i) => i % 2 === 0);
  const rightRecs = isAnimeMode ? [] : recommendations.filter((_, i) => i % 2 !== 0);

  // Duplicar solo 1 vez para el ciclo continuo infinito de desplazamiento suave hacia abajo sin mangas repetidos
  const loopLeft = leftRecs.length > 0 ? [...leftRecs, ...leftRecs] : [];
  const loopRight = rightRecs.length > 0 ? [...rightRecs, ...rightRecs] : [];

  return (
    <div className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-6 pb-24 select-none">
      <div className="flex gap-4 lg:gap-6 items-start justify-center">
        
        {/* COLUMNA LATERAL IZQUIERDA: Recomendaciones Deslizantes */}
        {loopLeft.length > 0 && (
          <aside className="hidden xl:flex flex-col w-44 2xl:w-52 shrink-0 sticky top-16 h-[calc(100vh-4.5rem)] overflow-hidden rounded-3xl bg-[#0e111a]/85 border border-gray-800/80 p-2 shadow-2xl relative select-none pause-on-hover">
            {/* Degradado Superior */}
            <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-[#0e111a] via-[#0e111a]/85 to-transparent z-20 pointer-events-none rounded-t-3xl" />
            
            {/* Cabecera */}
            <div className="relative z-30 pt-1 pb-1.5 text-center text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center justify-center gap-1.5 border-b border-gray-800/60 shrink-0">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Similares</span>
            </div>

            {/* Pista animada que baja lentamente */}
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-scrollDownSlow flex flex-col gap-3 py-2">
                {loopLeft.map((rec, idx) => (
                  <div
                    key={`left-${rec.url || rec.title}-${idx}`}
                    onClick={() => {
                      if (onSelectManga) {
                        onSelectManga({
                          title: rec.title,
                          url: rec.url,
                          cover: rec.cover,
                          coverProxy: rec.coverProxy,
                          extension: rec.scan || rec.extensionId,
                          extensionId: rec.extensionId,
                          genres: rec.genres,
                          synopsis: rec.synopsis
                        }, rec.extensionId);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="group relative rounded-2xl bg-[#141824]/90 border border-gray-800/90 hover:border-purple-500/80 p-2 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-950/50 cursor-pointer text-center shrink-0"
                  >
                    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black shadow-md">
                      <img
                        src={rec.coverProxy || rec.cover}
                        alt={rec.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          if (e.target.src.includes('/api/proxy-image') && rec.cover && !e.target.src.endsWith(encodeURIComponent(rec.cover))) {
                            e.target.src = rec.cover;
                          } else {
                            e.target.src = FALLBACK_COVER;
                          }
                        }}
                      />
                      {/* Badge de capítulos dentro de la portada */}
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-purple-300 text-[10px] font-black font-mono border border-purple-500/40 shadow-md">
                        {rec.status === 'Finalizado' ? 'Finalizado' : (rec.totalChapters ? `${rec.totalChapters} caps` : (rec.latestChapter || 'Completo'))}
                      </div>
                    </div>
                    <h4 
                      className="text-[11px] font-bold text-gray-200 group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight mt-1.5 px-0.5"
                      title={rec.title}
                    >
                      {rec.title}
                    </h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Degradado Inferior */}
            <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[#0e111a] via-[#0e111a]/85 to-transparent z-20 pointer-events-none rounded-b-3xl" />
          </aside>
        )}

        {/* COLUMNA CENTRAL: CONTENIDO DEL MANGA */}
        <div className="flex-1 min-w-0 w-full">
          {/* Botón Volver con Microanimación */}
          <button
            onClick={onBack}
            className="mb-4 px-3.5 py-2 rounded-xl bg-[#141822] hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:-translate-x-1 active:scale-95 cursor-pointer shadow-sm animate-fadeIn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

      {/* Header Ficha del Manga con Animación de Entrada Suave */}
      <div className="relative rounded-3xl bg-[#121622] border border-gray-800/90 p-6 sm:p-8 shadow-2xl mb-8 animate-detailsHeroIn z-10">
        
        {/* Fondo Blur Aislado */}
        {manga.coverProxy || manga.cover ? (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div
              className="w-full h-full bg-cover bg-center opacity-15 blur-2xl scale-110 transition-opacity duration-700"
              style={{ backgroundImage: `url(${manga.coverProxy || manga.cover})` }}
            />
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          
          {/* Portada con Efecto Pop-In y Elevación 3D */}
          <div className="w-36 sm:w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-gray-700/60 shrink-0 bg-[#0a0c10] mx-auto md:mx-0 animate-coverPopIn group hover:shadow-purple-900/40 transition-all duration-300 hover:scale-[1.03]">
            <img
              src={manga.coverProxy || manga.cover}
              alt={manga.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                if (e.target.src.includes('/api/proxy-image') && manga.cover && !e.target.src.endsWith(encodeURIComponent(manga.cover))) {
                  e.target.src = manga.cover;
                } else {
                  e.target.src = FALLBACK_COVER;
                }
              }}
            />
          </div>

          {/* Información y Metadatos */}
          <div className="flex-1 min-w-0">
            
            <div className="flex flex-wrap items-center gap-2 mb-2 animate-fadeInScale">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 text-xs font-semibold">
                {getExtensionDisplayName(manga.extension, manga.extensionId)}
              </span>
              {manga.type && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 text-xs font-bold uppercase tracking-wider">
                  {manga.type}
                </span>
              )}
              {manga.status && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{manga.status}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 animate-fadeIn">
              {manga.title}
            </h1>

            {manga.genres && manga.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {manga.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[#141926] text-purple-300 border border-purple-900/60 shadow-sm animate-cascadeCard"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {manga.authors && manga.authors.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 animate-fadeIn">
                <span className="font-semibold text-gray-500">Autor/es:</span>
                <div className="flex flex-wrap gap-1">
                  {manga.authors.map((a, i) => (
                    <span key={i} className="text-gray-300 font-medium bg-gray-800/60 px-2 py-0.2 rounded-md">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {manga.synopsis && (
              <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed mb-6 line-clamp-4 select-text animate-fadeIn">
                {manga.synopsis}
              </p>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              
              {/* Botón de Continuar o Iniciar Lectura/Reproducción */}
              {nextUnreadChapter && (
                <button
                  onClick={() => onSelectChapter(nextUnreadChapter.url, nextUnreadPage)}
                  disabled={loadingChapter}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 hover:shadow-purple-500/50 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {isAnimeMode
                      ? (readChaptersSet.size > 0 
                          ? `Continuar: ${nextUnreadChapter.name}` 
                          : `Reproducir: ${nextUnreadChapter.name}`)
                      : (nextUnreadPage > 1 
                          ? `Continuar: ${nextUnreadChapter.name} (Pág. ${nextUnreadPage})`
                          : readChaptersSet.size > 0 
                            ? `Continuar: ${nextUnreadChapter.name}` 
                            : `Leer: ${nextUnreadChapter.name}`)}
                  </span>
                </button>
              )}

              {/* Botón de Añadir / Quitar de Biblioteca */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoryMenu(prev => !prev)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                    isInLibrary
                      ? 'bg-purple-900/50 hover:bg-purple-900/70 text-purple-200 border border-purple-600/70 shadow-md shadow-purple-950/40'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                  }`}
                >
                  {isInLibrary ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-purple-400" />
                      <span>En Biblioteca</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 text-gray-400" />
                      <span>Añadir a Biblioteca</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                    </>
                  )}
                </button>

                {showCategoryMenu && (
                  <>
                    {/* Backdrop para cerrar menú al pulsar fuera */}
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowCategoryMenu(false)} 
                    />
                    <div className="absolute left-0 top-full mt-2 w-56 bg-[#141824] border border-gray-700/90 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl animate-fadeInScale">
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {isInLibrary ? 'Categoría en Biblioteca' : 'Guardar en Categoría'}
                      </div>
                      {displayCategories.map((cat) => {
                        const isSelected = isInLibrary && currentCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              if (isInLibrary) {
                                onUpdateCategory(manga.url, cat);
                              } else {
                                onToggleLibrary(manga, cat);
                              }
                              setShowCategoryMenu(false);
                            }}
                            className={`text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                              isSelected 
                                ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-700/30' 
                                : 'text-gray-200 hover:bg-gray-800/80 hover:text-white'
                            }`}
                          >
                            <span>{cat}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}

                      {isInLibrary && (
                        <>
                          <div className="my-1 border-t border-gray-800" />
                          <button
                            onClick={() => {
                              onToggleLibrary(manga);
                              setShowCategoryMenu(false);
                            }}
                            className="text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Quitar de Biblioteca</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {manga.url && (
                <a
                  href={manga.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Fuente</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Capítulos con Animación de Entrada */}
      <div 
        className="bg-[#121620] border border-gray-800 rounded-3xl p-6 shadow-xl animate-detailsHeroIn"
        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
      >
        
        {/* Controles superiores */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {isAnimeMode ? <Sparkles className="w-4 h-4 text-purple-400" /> : <BookOpen className="w-4 h-4 text-purple-400" />}
              <span>{isAnimeMode ? `Episodios (${chapters.length})` : `Capítulos (${chapters.length})`}</span>
            </h3>
            <p className="text-xs text-purple-300/80 font-mono mt-0.5">
              {readChaptersSet.size} de {chapters.length} {isAnimeMode ? 'vistos' : 'leídos'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Botones Marcar Todos Leídos / No Leídos */}
            <button
              onClick={() => onMarkAllChapters(manga.url, chapters.map(c => c.url), true)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1 cursor-pointer transition"
              title={isAnimeMode ? "Marcar todos como vistos" : "Marcar todos como leídos"}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAnimeMode ? "Todos vistos" : "Todos leídos"}</span>
            </button>

            <button
              onClick={() => onMarkAllChapters(manga.url, [], false)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 text-xs flex items-center gap-1 cursor-pointer transition"
              title={isAnimeMode ? "Marcar todos como no vistos" : "Marcar todos como no leídos"}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>

            {/* Menú de Descargas en Lote (Solo en modo Manga) */}
            {!isAnimeMode && (
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer transition font-medium"
                  title="Descargar capítulos a la PC"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Descargar</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showDownloadMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowDownloadMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#141824] border border-purple-500/30 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl animate-fadeInScale">
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3 text-purple-400" />
                        <span>Descargas Locales (PC)</span>
                      </div>

                      <button
                        onClick={() => {
                          const unread = chapters.filter(c => !readChaptersSet.has(c.url) && !(downloadStatusMap[c.url]?.isDownloaded || c.isDownloaded) && !c.isLocked);
                          triggerDownloadBatch(unread.slice(0, 5));
                          setShowDownloadMenu(false);
                        }}
                        className="text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-purple-950/50 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Descargar próximos 5 no leídos</span>
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                      </button>

                      <button
                        onClick={() => {
                          const unread = chapters.filter(c => !readChaptersSet.has(c.url) && !(downloadStatusMap[c.url]?.isDownloaded || c.isDownloaded) && !c.isLocked);
                          triggerDownloadBatch(unread.slice(0, 10));
                          setShowDownloadMenu(false);
                        }}
                        className="text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-purple-950/50 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Descargar próximos 10 no leídos</span>
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                      </button>

                      <button
                        onClick={() => {
                          const unread = chapters.filter(c => !readChaptersSet.has(c.url) && !(downloadStatusMap[c.url]?.isDownloaded || c.isDownloaded) && !c.isLocked);
                          triggerDownloadBatch(unread);
                          setShowDownloadMenu(false);
                        }}
                        className="text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-purple-950/50 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Descargar todos los no leídos</span>
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                      </button>

                      <button
                        onClick={() => {
                          const notDl = chapters.filter(c => !(downloadStatusMap[c.url]?.isDownloaded || c.isDownloaded) && !c.isLocked);
                          triggerDownloadBatch(notDl);
                          setShowDownloadMenu(false);
                        }}
                        className="text-left px-3 py-2 rounded-xl text-xs text-purple-300 font-semibold hover:bg-purple-900/40 hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Descargar todo el manga ({chapters.length})</span>
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Selector de Dialecto / Idioma (si el manga tiene múltiples idiomas) */}
            {detectedLanguages.length > 0 && (
              <div className="flex items-center gap-1 bg-[#0b0e14] p-0.5 rounded-xl border border-gray-700/80 shrink-0">
                <button
                  onClick={() => setSelectedLangFilter('Todos')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedLangFilter === 'Todos'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Mostrar todos los capítulos"
                >
                  Todos
                </button>
                {detectedLanguages.includes('Latino') && (
                  <button
                    onClick={() => setSelectedLangFilter('Latino')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      selectedLangFilter === 'Latino'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Filtrar por Español Latino"
                  >
                    <span>🇲🇽</span>
                    <span className="hidden xs:inline sm:inline">Latino</span>
                  </button>
                )}
                {detectedLanguages.includes('Castellano') && (
                  <button
                    onClick={() => setSelectedLangFilter('Castellano')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      selectedLangFilter === 'Castellano'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Filtrar por Español España"
                  >
                    <span>🇪🇸</span>
                    <span className="hidden xs:inline sm:inline">España</span>
                  </button>
                )}
              </div>
            )}

            {/* Buscador */}
            <div className="relative flex-1 sm:w-36">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                placeholder="Filtrar..."
                className="w-full bg-[#0b0e14] border border-gray-700/80 rounded-xl pl-7 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 select-text"
              />
            </div>

            {/* Ordenar */}
            <button
              onClick={() => setSortAsc(prev => !prev)}
              className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1 text-xs font-medium cursor-pointer"
              title={sortAsc ? 'Ascendente (1 -> 100)' : 'Descendente (100 -> 1)'}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Asc' : 'Desc'}</span>
            </button>
          </div>
        </div>

        {/* 1. MODO ANIME: Grid Expansivo de Tarjetas de Episodios */}
        {isAnimeMode ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 max-h-[500px] overflow-y-auto p-1 pr-2">
            {sortedChapters.map((chapter, idx) => {
              const isWatched = readChaptersSet.has(chapter.url);
              const num = chapter.chapterNumber || idx + 1;
              const epName = (chapter.name || `Episodio ${num}`)
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              return (
                <div
                  key={chapter.url || idx}
                  onClick={() => onSelectChapter(chapter.url, 1)}
                  style={{ animationDelay: `${Math.min(idx * 15, 400)}ms` }}
                  className={`group relative p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between items-center text-center cursor-pointer select-none hover:scale-105 active:scale-95 shadow-md animate-cascadeCard ${
                    isWatched
                      ? 'bg-[#10131d]/70 border-gray-800 text-gray-400 hover:border-purple-500/60 hover:text-white'
                      : 'bg-[#141926] border-purple-900/30 hover:border-purple-500 text-gray-200 hover:text-white shadow-purple-950/20'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-1 text-[10px] text-gray-400 mb-1.5">
                    <span className="font-mono font-bold text-purple-400">EP {num}</span>
                    {isWatched ? (
                      <span className="text-emerald-400 flex items-center gap-0.5" title="Episodio Visto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleChapterRead(chapter.url);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-purple-300 transition cursor-pointer"
                        title="Marcar como visto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-purple-950/40 group-hover:bg-purple-600 group-hover:text-white text-purple-300 border border-purple-800/40 flex items-center justify-center transition-all duration-300 my-1 shadow-inner group-hover:shadow-lg group-hover:shadow-purple-600/40">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>

                  <span className="text-[11px] font-bold line-clamp-1 mt-1 text-gray-200 group-hover:text-purple-300 transition-colors">
                    {epName}
                  </span>
                </div>
              );
            })}

            {sortedChapters.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 text-xs">
                No se encontraron episodios disponibles.
              </div>
            )}
          </div>
        ) : (
          /* 2. MODO MANGA: Lista de Capítulos tradicional */
          <div className="rounded-2xl bg-[#090c13]/60 border border-gray-800/80 p-2 max-h-[440px] overflow-y-auto pr-2 divide-y divide-gray-800/40 space-y-1">
            {sortedChapters.map((chapter, idx) => {
              const displayName = (chapter.name || `Capítulo ${chapter.chapterNumber || idx + 1}`)
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              const isManuallyOrFinishedRead = readChaptersSet.has(chapter.url);
              const progress = chapterProgressMap[chapter.url];
              const isPartiallyRead = !!(progress?.page && progress.page > 1 && progress.page < (progress.totalPages || 999));
              const isRead = isManuallyOrFinishedRead && !isPartiallyRead;
              const hasProgress = isPartiallyRead || (!isManuallyOrFinishedRead && progress?.page && progress.page > 1);
              const resumePage = hasProgress ? progress.page : 1;

              const isDownloaded = !!(downloadStatusMap[chapter.url]?.isDownloaded || chapter.isDownloaded);
              const queueItem = downloadQueue?.items?.find(q => q.chapterUrl === chapter.url);
              const isDownloading = queueItem && (queueItem.status === 'downloading' || queueItem.status === 'pending');

              const isLocked = !!chapter.isLocked;
              const handleChapterClick = () => {
                if (isLocked) {
                  setLockedModal({
                    title: displayName,
                    reason: chapter.lockedReason || 'Este capítulo se encuentra bloqueado o protegido directamente por el scan original bajo modalidad de pago o cuenta VIP en su página web oficial.'
                  });
                  return;
                }
                onSelectChapter(chapter.url, resumePage);
              };

              return (
                <div
                  key={chapter.url || idx}
                  style={{ animationDelay: `${Math.min(idx * 18, 500)}ms` }}
                  className={`py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 group animate-chapterRowSlide ${
                    isLocked 
                      ? 'bg-amber-950/10 hover:bg-amber-950/20 border border-amber-900/20' 
                      : isRead 
                        ? 'opacity-60 bg-transparent hover:bg-[#141822]' 
                        : 'hover:bg-[#141824]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => onToggleChapterRead(chapter.url)}
                      className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-purple-400 transition cursor-pointer"
                      title={isRead ? "Marcar como no leído" : "Marcar como leído"}
                    >
                      {isRead ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-600 hover:border-purple-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 cursor-pointer" onClick={handleChapterClick}>
                      <p className={`text-xs font-semibold truncate transition-colors ${
                        isRead ? 'text-gray-400' : 'text-gray-200 group-hover:text-purple-300'
                      }`}>
                        {displayName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-mono">
                          {chapter.date || 'Reciente'}
                        </span>
                        {hasProgress && !isRead && (
                          <span className="text-[10px] text-purple-400 font-mono font-semibold">
                            Pág. {progress.page}/{progress.totalPages || '?'}
                          </span>
                        )}
                        {isDownloaded && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Descargado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {/* Botón Descargar */}
                    {!isDownloaded && (
                      (() => {
                        if (isDownloading) {
                          return (
                            <div 
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/50 text-purple-300 text-[11px] font-mono shadow-sm"
                              title={`Descargando: ${queueItem.progress || 0}%`}
                            >
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              <span>{queueItem.progress || 0}%</span>
                            </div>
                          );
                        }

                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDownloadChapter(chapter);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-gray-800 transition cursor-pointer"
                            title="Descargar capítulo"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        );
                      })()
                    )}

                    {/* Botón Leer / Bloqueado */}
                    {isLocked ? (
                      <button
                        onClick={handleChapterClick}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 hover:text-amber-100 transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                        title="Capítulo bloqueado por el scan"
                      >
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Bloqueado</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleChapterClick}
                        disabled={loadingChapter}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                          isRead 
                            ? 'bg-gray-800 text-gray-400 group-hover:bg-purple-950 group-hover:text-purple-300' 
                            : hasProgress
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                              : 'bg-purple-600/20 group-hover:bg-purple-600 text-purple-300 group-hover:text-white'
                        }`}
                      >
                        <span>{isRead ? 'Releer' : hasProgress ? `Pág. ${progress.page}` : 'Leer'}</span>
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {sortedChapters.length === 0 && (
              <div className="py-12 text-center text-gray-500 text-xs">
                No se encontraron capítulos coincidentes.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN DE ANIMES SIMILARES (Exclusiva de Modo Anime) */}
      {isAnimeMode && recommendations.length > 0 && (
        <div className="mt-8 rounded-3xl bg-[#121622] border border-gray-800/90 p-6 shadow-2xl animate-detailsHeroIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
              <span>Animes Similares</span>
            </h3>
            <span className="text-xs text-gray-400">
              Recomendaciones para {manga.title}
            </span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {recommendations.slice(0, 12).map((rec, idx) => (
              <div
                key={`sim-${rec.url || idx}`}
                onClick={() => {
                  if (onSelectManga) {
                    onSelectManga({
                      title: rec.title,
                      url: rec.url,
                      cover: rec.cover,
                      coverProxy: rec.coverProxy,
                      extension: rec.scan || rec.extensionId,
                      extensionId: rec.extensionId,
                      genres: rec.genres,
                      synopsis: rec.synopsis,
                      type: 'anime'
                    }, rec.extensionId);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="group relative rounded-2xl bg-[#141824] border border-gray-800/90 hover:border-purple-500/80 p-2.5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-950/50 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black shadow-md">
                  <img
                    src={rec.coverProxy || rec.cover}
                    alt={rec.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_COVER;
                    }}
                  />
                  {rec.status && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-purple-300 text-[10px] font-black font-mono border border-purple-500/40">
                      {rec.status}
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-gray-200 group-hover:text-purple-300 transition-colors line-clamp-2 mt-2 leading-tight">
                  {rec.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COMUNIDAD Y CHAT EN VIVO DEL MANGA */}
      <div className="mt-8 animate-detailsHeroIn" style={{ animationDelay: '140ms', animationFillMode: 'both' }}>
        <LiveChatRoom
          roomId={(() => {
            const raw = manga.url || manga.title || 'default';
            try {
              return `manga:${btoa(unescape(encodeURIComponent(raw))).slice(0, 32)}`;
            } catch {
              return `manga:${raw.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)}`;
            }
          })()}
          title={`Comunidad de ${manga.title}`}
          subtitle={`Debate sobre la historia, teorías y comparte opiniones en vivo con otros lectores de ${manga.title}.`}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenUserCard={onOpenUserCard}
          mangaTitle={manga.title}
        />
      </div>
    </div>

    {/* COLUMNA LATERAL DERECHA: Recomendaciones Deslizantes */}
    {loopRight.length > 0 && (
      <aside className="hidden xl:flex flex-col w-44 2xl:w-52 shrink-0 sticky top-16 h-[calc(100vh-4.5rem)] overflow-hidden rounded-3xl bg-[#0e111a]/85 border border-gray-800/80 p-2 shadow-2xl relative select-none pause-on-hover">
        {/* Degradado Superior */}
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-[#0e111a] via-[#0e111a]/85 to-transparent z-20 pointer-events-none rounded-t-3xl" />
        
        {/* Cabecera */}
        <div className="relative z-30 pt-1 pb-1.5 text-center text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center justify-center gap-1.5 border-b border-gray-800/60 shrink-0">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Recomendados</span>
        </div>

        {/* Pista animada que baja lentamente */}
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-scrollDownSlow flex flex-col gap-3 py-2">
            {loopRight.map((rec, idx) => (
              <div
                key={`right-${rec.url || rec.title}-${idx}`}
                onClick={() => {
                  if (onSelectManga) {
                    onSelectManga({
                      title: rec.title,
                      url: rec.url,
                      cover: rec.cover,
                      coverProxy: rec.coverProxy,
                      extension: rec.scan || rec.extensionId,
                      extensionId: rec.extensionId,
                      genres: rec.genres,
                      synopsis: rec.synopsis
                    }, rec.extensionId);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="group relative rounded-2xl bg-[#141824]/90 border border-gray-800/90 hover:border-purple-500/80 p-2 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-950/50 cursor-pointer text-center shrink-0"
              >
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black shadow-md">
                  <img
                    src={rec.coverProxy || rec.cover}
                    alt={rec.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      if (e.target.src.includes('/api/proxy-image') && rec.cover && !e.target.src.endsWith(encodeURIComponent(rec.cover))) {
                        e.target.src = rec.cover;
                      } else {
                        e.target.src = FALLBACK_COVER;
                      }
                    }}
                  />
                  {/* Badge de capítulos dentro de la portada */}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-purple-300 text-[10px] font-black font-mono border border-purple-500/40 shadow-md">
                    {rec.status === 'Finalizado' ? 'Finalizado' : (rec.totalChapters ? `${rec.totalChapters} caps` : (rec.latestChapter || 'Completo'))}
                  </div>
                </div>
                <h4 
                  className="text-[11px] font-bold text-gray-200 group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight mt-1.5 px-0.5"
                  title={rec.title}
                >
                  {rec.title}
                </h4>
              </div>
            ))}
          </div>
        </div>

        {/* Degradado Inferior */}
        <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-[#0e111a] via-[#0e111a]/85 to-transparent z-20 pointer-events-none rounded-b-3xl" />
      </aside>
    )}
  </div>

  {/* Modales */}

      {/* Modal Confirmación de Eliminación de Descarga */}
      {deleteConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#141824] border border-rose-500/40 rounded-3xl p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">¿Eliminar descarga de PC?</h3>
            <p className="text-xs text-gray-400 mb-5">
              Se eliminarán las imágenes guardadas en disco del capítulo <span className="text-purple-300 font-semibold">"{deleteConfirmModal.name}"</span>. Podrás volver a descargarlo cuando quieras.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteDownload(deleteConfirmModal.url);
                  setDeleteConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Eliminar de PC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Informativo de Capítulo Bloqueado por el Scan */}
      {lockedModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLockedModal(null)}
        >
          <div 
            className="w-full max-w-md bg-[#141824] border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setLockedModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Capítulo Bloqueado por el Scan
            </h3>
            <p className="text-xs font-semibold text-amber-400 mb-3">
              {lockedModal.title}
            </p>

            <div className="p-4 rounded-2xl bg-[#0b0e14] border border-gray-800/90 mb-5 text-xs text-gray-300 leading-relaxed space-y-2.5">
              <p>
                {lockedModal.reason}
              </p>
              <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-gray-200">Aviso:</strong> Nuestra aplicación indexa la lista completa de capítulos para tu comodidad, pero el contenido de este episodio está restringido por la fuente oficial.
                </span>
              </div>
            </div>

            <button
              onClick={() => setLockedModal(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition active:scale-95 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Aviso: Requiere Agregar a la Biblioteca */}
      {needLibraryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setNeedLibraryModal(null)}
        >
          <div 
            className="w-full max-w-md bg-[#0e121a] border border-purple-500/40 rounded-3xl p-6 shadow-2xl relative text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-600/60 flex items-center justify-center text-purple-400 shadow-lg">
                <Bookmark className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setNeedLibraryModal(null)}
                className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Agrega este manga a tu biblioteca
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Para descargar capítulos y habilitar la lectura sin conexión, primero debes guardar <span className="text-purple-300 font-semibold font-mono">"{manga.title}"</span> en tu biblioteca.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-900/40 flex items-center gap-3 text-xs text-purple-200">
              <Download className="w-5 h-5 text-purple-400 shrink-0" />
              <span>
                Guardar en tu biblioteca permite sincronizar tus capítulos descargados, historial y progreso de lectura en todos tus dispositivos.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setNeedLibraryModal(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const pending = needLibraryModal;
                  setNeedLibraryModal(null);
                  if (onToggleLibrary) onToggleLibrary(manga);
                  if (pending.type === 'single' && onDownloadChapter) {
                    onDownloadChapter(pending.chapter, manga);
                  } else if (pending.type === 'batch' && onDownloadBatch) {
                    onDownloadBatch(pending.chapters, manga);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>Agregar a Biblioteca y Descargar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
