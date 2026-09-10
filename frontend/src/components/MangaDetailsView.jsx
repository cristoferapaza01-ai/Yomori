import React, { useState } from 'react';
import LiveChatRoom from './LiveChatRoom.jsx';
import { 
  ArrowLeft, 
  Play, 
  ArrowDownUp, 
  Search, 
  BookOpen, 
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
  HardDrive
} from 'lucide-react';

export default function MangaDetailsView({
  manga,
  libraryItem,
  onToggleLibrary,
  onUpdateCategory,
  onToggleChapterRead,
  onMarkAllChapters,
  onBack,
  onSelectChapter,
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
  onOpenUserCard
}) {
  const [sortAsc, setSortAsc] = useState(false);
  const [chapterFilter, setChapterFilter] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [lockedModal, setLockedModal] = useState(null);

  if (!manga) return null;

  const chapters = manga.chapters || [];
  const readChaptersSet = new Set([
    ...(libraryItem?.readChapters || []),
    ...chapters.filter(c => readChaptersMap[c.url]).map(c => c.url)
  ]);

  const isInLibrary = !!libraryItem;
  const currentCategory = libraryItem?.category || 'General';

  // Filtrar
  const filteredChapters = chapters.filter(c => {
    if (!c) return false;
    const name = (c.name || c.title || '').toLowerCase();
    const num = String(c.chapterNumber || '');
    const filter = (chapterFilter || '').toLowerCase().trim();
    if (!filter) return true;
    return name.includes(filter) || num.includes(filter);
  });

  // Extractor inteligente de número de capítulo que ignora números del título del manga
  const getChapterNum = (c) => {
    if (!c) return 0;
    
    let rawStr = String(c.name || c.title || '');
    if (manga?.title) {
      // Eliminar el título del manga para no capturar números que pertenezcan al nombre (ej. 10.000 Años)
      const cleanTitle = manga.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rawStr = rawStr.replace(new RegExp(cleanTitle, 'gi'), '');
    }
    // Eliminar números mayores o iguales a 1000 que pertenezcan al título (ej. 10.000, 10000, etc.)
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 select-none">
      
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
                e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Información y Metadatos */}
          <div className="flex-1 min-w-0">
            
            <div className="flex flex-wrap items-center gap-2 mb-2 animate-fadeInScale">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 text-xs font-semibold">
                {manga.extension || 'ZonaTMO'}
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
              
              {/* Botón de Continuar o Iniciar Lectura */}
              {nextUnreadChapter && (
                <button
                  onClick={() => onSelectChapter(nextUnreadChapter.url, nextUnreadPage)}
                  disabled={loadingChapter}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 hover:shadow-purple-500/50 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {nextUnreadPage > 1 
                      ? `Continuar: ${nextUnreadChapter.name} (Pág. ${nextUnreadPage})`
                      : readChaptersSet.size > 0 
                        ? `Continuar: ${nextUnreadChapter.name}` 
                        : `Leer: ${nextUnreadChapter.name}`}
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
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Capítulos ({chapters.length})</span>
            </h3>
            <p className="text-xs text-purple-300/80 font-mono mt-0.5">
              {readChaptersSet.size} de {chapters.length} leídos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Botones Marcar Todos Leídos / No Leídos */}
            <button
              onClick={() => onMarkAllChapters(manga.url, chapters.map(c => c.url), true)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1 cursor-pointer transition"
              title="Marcar todos como leídos"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Todos leídos</span>
            </button>

            <button
              onClick={() => onMarkAllChapters(manga.url, [], false)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 text-xs flex items-center gap-1 cursor-pointer transition"
              title="Marcar todos como no leídos"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>

            {/* Menú de Descargas en Lote (Estilo Suwayomi) */}
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
                        onDownloadBatch(unread.slice(0, 5), manga);
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
                        onDownloadBatch(unread.slice(0, 10), manga);
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
                        onDownloadBatch(unread, manga);
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
                        onDownloadBatch(notDl, manga);
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

        {/* Lista de Capítulos con Checkbox de Leído y Progreso */}
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
                      : 'hover:bg-[#181d2a]'
                }`}
              >
                {/* Botón de toggle Leído/No leído */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) onToggleChapterRead(manga.url, chapter.url);
                  }}
                  disabled={isLocked}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    isLocked 
                      ? 'text-amber-500/40 cursor-not-allowed'
                      : isRead 
                        ? 'text-purple-400 hover:text-gray-400' 
                        : 'text-gray-600 hover:text-purple-400'
                  }`}
                  title={isLocked ? 'Capítulo bloqueado en la fuente' : isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-amber-500/70" />
                  ) : (
                    <CheckCircle2 className={`w-4 h-4 ${isRead ? 'fill-purple-500/20' : ''}`} />
                  )}
                </button>

                {/* Título del Capítulo */}
                <div 
                  onClick={handleChapterClick}
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-xs sm:text-sm font-semibold transition truncate ${
                      isLocked
                        ? 'text-gray-300 group-hover:text-amber-300'
                        : isRead 
                          ? 'text-gray-400 line-through decoration-gray-600' 
                          : 'text-gray-200 group-hover:text-purple-300'
                    }`}>
                      {displayName}
                    </h4>

                    {/* Insignia y Candadito con Tooltip */}
                    {isLocked && (
                      <div 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-bold shadow-sm cursor-help hover:bg-amber-500/25 transition"
                        title="🔒 Bloqueado por el scan original. Este capítulo tiene acceso VIP o de pago en su sitio web oficial."
                      >
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span>Bloqueado por el scan</span>
                      </div>
                    )}

                    {/* Insignia de Guardado en PC / Offline */}
                    {isDownloaded && !isLocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-sm">
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>Guardado en PC</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {chapter.date && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{chapter.date}</span>
                      </p>
                    )}
                    {hasProgress && !isLocked && (
                      <span className="text-[11px] text-purple-400 font-mono font-medium">
                        • Pág. {progress.page}/{progress.totalPages || '?'} ({Math.round((progress.page / (progress.totalPages || 1)) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón de Descarga individual en disco */}
                {!isLocked && (
                  (() => {
                    if (isDownloaded) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal(chapter);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-rose-950/60 border border-emerald-500/40 hover:border-rose-500/50 text-emerald-400 hover:text-rose-400 transition cursor-pointer shadow-sm group/btn"
                          title="Descargado en PC (Clic para eliminar del disco)"
                        >
                          <CheckCircle className="w-4 h-4 group-hover/btn:hidden" />
                          <Trash2 className="w-4 h-4 hidden group-hover/btn:block" />
                        </button>
                      );
                    }

                    if (isDownloading) {
                      return (
                        <div 
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/50 text-purple-300 text-[11px] font-mono shadow-sm"
                          title={`Descargando a disco: ${queueItem.downloadedPages || 0}/${queueItem.totalPages || '?'} páginas (${queueItem.progress || 0}%)`}
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
                          onDownloadChapter(chapter, manga);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-gray-800 transition cursor-pointer"
                        title="Descargar capítulo a tu computadora (Lectura offline)"
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
                    title="Capítulo bloqueado por el scan original"
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
            );
          })}

          {sortedChapters.length === 0 && (
            <div className="py-12 text-center text-gray-500 text-xs">
              No se encontraron capítulos coincidentes.
            </div>
          )}
        </div>
      </div>

      {/* 3. COMUNIDAD Y CHAT EN VIVO DEL MANGA */}
      <div className="mt-8 animate-detailsHeroIn" style={{ animationDelay: '180ms', animationFillMode: 'both' }}>
        <LiveChatRoom
          roomId={`manga:${btoa(encodeURIComponent(manga.url || manga.title || 'default')).slice(0, 32)}`}
          title={`Comunidad de ${manga.title}`}
          subtitle={`Debate sobre la historia, teorías y comparte opiniones en vivo con otros lectores de ${manga.title}.`}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onOpenUserCard={onOpenUserCard}
          mangaTitle={manga.title}
        />
      </div>

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
    </div>
  );
}
