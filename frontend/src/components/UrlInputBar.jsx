import React, { useState, useEffect } from 'react';
import { Search, Globe, Sparkles, Loader2, Play, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function UrlInputBar({
  onExtract,
  loading,
  extensions = [],
  error
}) {
  const [inputUrl, setInputUrl] = useState('');
  const [detectedExt, setDetectedExt] = useState(null);

  // Ejemplos de prueba rápidos
  const sampleUrls = [
    {
      name: 'Solo Leveling (Olympus)',
      url: 'https://olympusv2.gg/capitulo/12345/comic-solo-leveling',
      desc: 'Capítulo en Olympus Scanlation'
    },
    {
      name: 'Nano Machine (Olympus)',
      url: 'https://olympusscans.com/capitulo/999/comic-nano-machine',
      desc: 'Olympus Scans alternativo'
    },
    {
      name: 'ZonTMO / TuMangaOnline',
      url: 'https://zonatmo.com/viewer/sample/cascade',
      desc: 'Visor continuo ZonTMO'
    }
  ];

  // Detección en tiempo real de la extensión según el texto ingresado
  useEffect(() => {
    if (!inputUrl) {
      setDetectedExt(null);
      return;
    }
    const clean = inputUrl.toLowerCase();
    if (clean.includes('olympus') || clean.includes('leerolympus')) {
      setDetectedExt('Olympus Scanlation');
    } else if (clean.includes('tmo') || clean.includes('tumangaonline')) {
      setDetectedExt('ZonTMO');
    } else {
      setDetectedExt(null);
    }
  }, [inputUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputUrl.trim() || loading) return;
    onExtract(inputUrl.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
      }
    } catch (e) {
      console.warn('No se pudo acceder al portapapeles automáticamente');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16">
      {/* Hero Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-medium mb-4 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Extracción en tiempo real sin almacenamiento en servidor</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          Lector de Manga & Manhwa{' '}
          <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
            Modular
          </span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          Pega el enlace de un capítulo de tus fuentes favoritas. Los módulos de scraping extraerán y renderizarán las páginas al instante con scroll continuo.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-[#141820]/90 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-purple-950/20 mb-8">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-gray-500 pointer-events-none">
              <Globe className="w-5 h-5" />
            </div>

            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://olympusv2.gg/capitulo/..."
              disabled={loading}
              className="w-full bg-[#0b0e14] border border-gray-700/80 rounded-xl pl-11 pr-24 py-3.5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition disabled:opacity-60"
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              {!inputUrl && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
                >
                  Pegar
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !inputUrl.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition transform active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Raspando...</span>
                  </>
                ) : (
                  <>
                    <span>Cargar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Badge de detección */}
          {detectedExt && (
            <div className="flex items-center gap-2 text-xs text-purple-300 font-medium pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Módulo detectado: <strong>{detectedExt}</strong></span>
            </div>
          )}
        </form>

        {/* Mensaje de Error */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error al extraer el capítulo</p>
              <p className="text-red-400/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Extensiones Disponibles */}
      <div className="mb-10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Extensiones activas en el repositorio</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {extensions.map((ext) => (
            <div
              key={ext.id}
              className="p-3.5 rounded-xl bg-[#12161f] border border-gray-800/80 flex items-center justify-between gap-3 hover:border-purple-800/50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-800/90 flex items-center justify-center font-bold text-sm text-purple-400 border border-gray-700/50 group-hover:scale-105 transition">
                  {ext.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{ext.name}</h4>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{ext.baseUrl}</p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700 font-mono">
                v{ext.version}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Enlaces de prueba rápida */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Probar con ejemplos de prueba</span>
        </h3>
        <div className="space-y-2">
          {sampleUrls.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputUrl(sample.url);
                onExtract(sample.url);
              }}
              disabled={loading}
              className="w-full text-left p-3 rounded-xl bg-[#11141a] hover:bg-[#181d26] border border-gray-800/60 hover:border-purple-700/40 transition flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-purple-300 group-hover:text-purple-200">
                  {sample.name}
                </p>
                <p className="text-[11px] text-gray-500 truncate font-mono mt-0.5">
                  {sample.url}
                </p>
              </div>
              <Play className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
