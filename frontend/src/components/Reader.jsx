import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle, ArrowUp, Sun, Moon, Loader2, Lock } from 'lucide-react';

function ChapterImage({ page, index, totalPages, useProxy, gap, filterStyle }) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setHasError(false);
  }, [page.originalUrl, page.proxyUrl, page.url]);

  const imageSource = page.isOffline || page.localUrl
    ? (page.localUrl || page.url)
    : (useProxy && page.proxyUrl 
      ? `${page.proxyUrl}&retry=${retryCount}` 
      : `${page.originalUrl || page.url}${page.url?.includes('?') ? '&' : '?'}retry=${retryCount}`);

  const handleRetry = (e) => {
    e.stopPropagation();
    setHasError(false);
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div
      id={`page-${index + 1}`}
      className="relative w-full flex flex-col items-center justify-center bg-transparent select-none"
      style={{ marginBottom: `${gap}px` }}
    >
      {!hasError ? (
        <img
          src={imageSource}
          alt={`Página ${index + 1} de ${totalPages}`}
          loading={index < 6 ? 'eager' : 'lazy'}
          fetchPriority={index < 3 ? 'high' : 'auto'}
          decoding="async"
          onError={() => setHasError(true)}
          style={filterStyle}
          className="w-full h-auto object-contain block transition-opacity duration-200"
        />
      ) : (
        <div className="w-full py-10 px-4 bg-red-950/20 border border-red-900/40 rounded-2xl my-4 flex flex-col items-center justify-center text-center gap-2.5">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
          <p className="text-xs font-semibold text-gray-300">
            No se pudo cargar la viñeta {index + 1}
          </p>
          <button
            onClick={handleRetry}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar viñeta</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Reader({
  chapterData,
  settings,
  onNavigateChapter,
  onToggleControls,
  currentPage,
  setCurrentPage,
  onChapterFinished,
  isAutoScrolling,
  setIsAutoScrolling,
  initialPage = 1,
  onPageChange,
  onRetry
}) {
  const totalPages = chapterData?.pages?.length || 0;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const readingMode = settings.readingMode || 'webtoon'; // 'webtoon' | 'paginated-rtl' | 'paginated-ltr'
  const bgColor = settings.backgroundColor || '#07080b';
  const isLightBg = bgColor === '#ffffff' || bgColor === '#f4ede2';

  // Desplazar automáticamente a la página donde se quedó el usuario (initialPage)
  useEffect(() => {
    if (initialPage && initialPage > 1 && chapterData?.pages?.length > 0) {
      const timer = setTimeout(() => {
        const targetElement = document.getElementById(`page-${initialPage}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [chapterData?.currentUrl, initialPage, chapterData?.pages?.length]);

  // Precarga inteligente en segundo plano de TODAS las viñetas del capítulo actual
  useEffect(() => {
    if (!chapterData?.pages || chapterData.pages.length === 0) return;
    const pages = chapterData.pages;

    pages.forEach((p) => {
      const src = settings.useProxy && p.proxyUrl ? p.proxyUrl : (p.originalUrl || p.url);
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [chapterData?.pages, settings.useProxy]);

  // Manejador de Auto-Scroll continuo (Play/Pausa)
  useEffect(() => {
    if (!isAutoScrolling) return;

    if (readingMode === 'webtoon') {
      let animId;
      const speed = Math.max(0.5, (settings.autoScrollSpeed || 3) * 0.7);

      const step = () => {
        const scrollBottom = window.innerHeight + window.scrollY;
        const docHeight = Math.max(
          document.body.scrollHeight, 
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );

        if (scrollBottom >= docHeight - 10) {
          if (setIsAutoScrolling) setIsAutoScrolling(false);
          return;
        }

        window.scrollBy(0, speed);
        animId = requestAnimationFrame(step);
      };

      animId = requestAnimationFrame(step);

      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    } else {
      // Modo Paginado: pasar página cada N segundos según la velocidad
      const delayMs = Math.max(1500, (11 - (settings.autoScrollSpeed || 3)) * 1000);
      const timer = setInterval(() => {
        if (currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
        } else {
          if (setIsAutoScrolling) setIsAutoScrolling(false);
        }
      }, delayMs);

      return () => clearInterval(timer);
    }
  }, [isAutoScrolling, readingMode, settings.autoScrollSpeed, currentPage, totalPages, setIsAutoScrolling, setCurrentPage]);

  // Manejador de scroll para el botón de volver arriba, completado y detección precisa de página activa
  useEffect(() => {
    if (readingMode !== 'webtoon' || totalPages === 0) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const innerHeight = window.innerHeight;
          const docHeight = Math.max(
            document.body.scrollHeight, 
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
          );

          setShowScrollTop(scrollY > 800);

          // Determinar página activa precisa sin parpadeos ni rebotes
          const focalY = innerHeight * 0.4;
          let detectedPage = 1;

          if (scrollY + innerHeight >= docHeight - 60 && docHeight > innerHeight + 200) {
            detectedPage = totalPages;
            // Solo marcar como leído si realmente llegó al 100% final del documento
            if (onChapterFinished && chapterData?.currentUrl) {
              onChapterFinished(chapterData.currentUrl);
            }
          } else if (scrollY <= 80) {
            detectedPage = 1;
          } else {
            // Búsqueda del elemento visible en el punto focal
            for (let i = 1; i <= totalPages; i++) {
              const el = document.getElementById(`page-${i}`);
              if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= focalY && rect.bottom >= focalY) {
                  detectedPage = i;
                  break;
                } else if (rect.top > focalY && i > 1) {
                  detectedPage = i - 1;
                  break;
                }
              }
            }
          }

          if (detectedPage && detectedPage !== currentPageRef.current) {
            currentPageRef.current = detectedPage;
            setCurrentPage(detectedPage);
            if (onPageChange) {
              onPageChange(detectedPage, totalPages);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [readingMode, totalPages, chapterData?.currentUrl, onChapterFinished, onPageChange, setCurrentPage]);

  // Teclado para cambio de página en modo paginado
  useEffect(() => {
    if (readingMode === 'webtoon') return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        if (readingMode === 'paginated-rtl') handlePrevPage();
        else handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        if (readingMode === 'paginated-rtl') handleNextPage();
        else handlePrevPage();
      } else if (e.key === ' ') {
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentPage, totalPages]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    } else if (chapterData.nextChapterUrl) {
      if (onChapterFinished) onChapterFinished(chapterData.currentUrl);
      onNavigateChapter(chapterData.nextChapterUrl);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (chapterData.prevChapterUrl) {
      onNavigateChapter(chapterData.prevChapterUrl);
    }
  };

  const scrollToTop = (e) => {
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterStyle = {
    filter: `brightness(${settings.brightness || 100}%) contrast(${settings.contrast || 100}%) ${
      settings.invertColors ? 'invert(1) hue-rotate(180deg)' : ''
    }`
  };

  const getContainerMaxWidth = () => {
    switch (settings.readerWidth) {
      case '650px':
      case '600px': return 'max-w-[650px]';
      case '850px':
      case '800px': return 'max-w-[850px]';
      case '1050px':
      case '1000px': return 'max-w-[1050px]';
      case '100%': return 'w-full max-w-none px-0';
      default: return 'max-w-[850px]';
    }
  };

  return (
    <div
      onClick={onToggleControls}
      style={{ backgroundColor: bgColor }}
      className={`min-h-screen w-full flex flex-col items-center pt-0 pb-24 cursor-pointer select-none transition-colors duration-300 ${
        isLightBg ? 'text-gray-900' : 'text-white'
      }`}
    >
      {/* MODO 1: WEBTOON (Scroll Continuo Vertical) */}
      {readingMode === 'webtoon' ? (
        <div className={`w-full ${getContainerMaxWidth()} mx-auto px-0 sm:px-2 transition-all duration-200`}>

          {chapterData.isLocked ? (
            <div className="py-24 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Capítulo Bloqueado por el Scan</h3>
              <p className="text-xs sm:text-sm text-gray-300 mb-4 leading-relaxed">
                {chapterData.lockedReason || 'Este capítulo se encuentra bloqueado por la fuente original (MiauScan/LeeMiau) bajo modalidad VIP o de pago.'}
              </p>
              <div className="p-3.5 rounded-2xl bg-[#121624] border border-gray-800 text-[11px] text-gray-400 text-left">
                ℹ️ <strong className="text-gray-200">Aviso informativo:</strong> Nuestra aplicación indexa todos los capítulos del catálogo, pero el contenido de este episodio requiere pase VIP o monedas en la web oficial de MiauScan.
              </div>
            </div>
          ) : chapterData.error ? (
            <div className="py-24 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">No se pudo cargar el capítulo</h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
                {chapterData.error}
              </p>
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reintentar conexión</span>
                </button>
              )}
            </div>
          ) : chapterData.pages.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-3" />
              <h3 className="text-base font-bold text-white">Extrayendo viñetas en tiempo real...</h3>
              <p className="text-xs text-gray-400 mt-1">Conectando con la fuente</p>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {chapterData.isOffline && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md mb-4 mt-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Modo Offline (Guardado en tu PC)</span>
                </div>
              )}
              {chapterData.pages.map((page, index) => (
                <ChapterImage
                  key={`${page.index}-${index}`}
                  page={page}
                  index={index}
                  totalPages={totalPages}
                  useProxy={settings.useProxy}
                  gap={settings.imageGap}
                  filterStyle={filterStyle}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MODO 2: PAGINADO (Manga RTL o Cómic LTR) */
        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4 relative min-h-[80vh]">
          {chapterData.isLocked ? (
            <div className="py-24 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Capítulo Bloqueado por el Scan</h3>
              <p className="text-xs sm:text-sm text-gray-300 mb-4 leading-relaxed">
                {chapterData.lockedReason || 'Este capítulo se encuentra bloqueado por la fuente original (MiauScan/LeeMiau) bajo modalidad VIP o de pago.'}
              </p>
              <div className="p-3.5 rounded-2xl bg-[#121624] border border-gray-800 text-[11px] text-gray-400 text-left">
                ℹ️ <strong className="text-gray-200">Aviso informativo:</strong> Nuestra aplicación indexa todos los capítulos del catálogo, pero el contenido de este episodio requiere pase VIP o monedas en la web oficial de MiauScan.
              </div>
            </div>
          ) : chapterData.error ? (
            <div className="py-24 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">No se pudo cargar el capítulo</h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
                {chapterData.error}
              </p>
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reintentar conexión</span>
                </button>
              )}
            </div>
          ) : chapterData.pages?.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-3" />
              <h3 className="text-base font-bold text-white">Extrayendo viñetas en tiempo real...</h3>
              <p className="text-xs text-gray-400 mt-1">Conectando con la fuente</p>
            </div>
          ) : (
            chapterData.pages[currentPage - 1] && (
              <div className="relative max-h-[85vh] flex items-center justify-center">
                <img
                  src={
                    settings.useProxy && chapterData.pages[currentPage - 1].proxyUrl
                      ? chapterData.pages[currentPage - 1].proxyUrl
                      : (chapterData.pages[currentPage - 1].originalUrl || chapterData.pages[currentPage - 1].url)
                  }
                  alt={`Página ${currentPage}`}
                  style={filterStyle}
                  className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
                />

                {/* Zonas de toque táctil / clic laterales */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (readingMode === 'paginated-rtl') handleNextPage();
                    else handlePrevPage();
                  }}
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-w-resize"
                  title="Página anterior/siguiente"
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (readingMode === 'paginated-rtl') handlePrevPage();
                    else handleNextPage();
                  }}
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-e-resize"
                  title="Página siguiente/anterior"
                />
              </div>
            )
          )}
        </div>
      )}

      {/* Botón flotante volver arriba */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 z-30 p-3 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 backdrop-blur-sm transition transform hover:scale-110 active:scale-95"
          title="Volver al inicio"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Indicador de página Tachiyomi */}
      <div className="fixed bottom-3 right-4 z-30 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-gray-800/80 text-gray-300 text-xs font-mono font-medium shadow-md pointer-events-none flex items-center gap-2">
        <span className="text-purple-400 font-bold">{currentPage}</span>
        <span className="text-gray-500">/</span>
        <span>{totalPages}</span>
        <span className="text-[10px] text-gray-400 font-sans">
          ({Math.round((currentPage / (totalPages || 1)) * 100)}%)
        </span>
      </div>
    </div>
  );
}
