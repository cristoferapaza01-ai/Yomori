import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  HardDrive, 
  Puzzle, 
  BookOpen, 
  CheckCircle2, 
  Copy, 
  Check, 
  Layers, 
  ArrowRight, 
  ChevronDown, 
  Cloud, 
  MessageSquare, 
  Settings, 
  Search,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function OfficialLandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [copiedRepo, setCopiedRepo] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  const repoUrl = 'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json';

  const handleCopyRepo = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(repoUrl);
      setCopiedRepo(true);
      setTimeout(() => setCopiedRepo(false), 3500);
    }
  };

  const highlights = [
    { value: '100%', label: 'Gratis & Sin Publicidad' },
    { value: 'Android', label: '8.0 o Superior' },
    { value: 'Cloud Sync', label: 'Historial y Biblioteca' },
    { value: '10+ Scans', label: 'Fuentes en Español' }
  ];

  const scans = [
    { name: 'Olympus Scanlation', lang: 'Español', type: 'Manhwas & Cómics', status: 'Activo' },
    { name: 'SkyMangas', lang: 'Español', type: 'Manhuas & Acción', status: 'Activo' },
    { name: 'ZonaTMO (VisorTMO)', lang: 'Español', type: 'Catálogo Masivo', status: 'Activo' },
    { name: 'Ikigai Mangas', lang: 'Español', type: 'Manhwas & Novelas', status: 'Activo' },
    { name: 'MangaDex', lang: 'Multilenguaje', type: 'Comunidad Global', status: 'Activo' },
    { name: 'MiauScan (LeeMiau)', lang: 'Español', type: 'Romance & Shojo', status: 'Activo' },
    { name: 'ManhwaLatino', lang: 'Español', type: 'Webtoons HD', status: 'Activo' },
    { name: 'Plot Twist No Fansub', lang: 'Español', type: 'Shonen & Seinen', status: 'Activo' },
    { name: 'RN Scanlation', lang: 'Español', type: 'Manhwas & Cómics', status: 'Activo' }
  ];

  const features = [
    {
      icon: Smartphone,
      title: 'Diseñado para Android',
      desc: 'Interfaz nativa, rápida y fluida optimizada para teléfonos y tablets con soporte de navegación gestual y pantalla completa a 120Hz.'
    },
    {
      icon: Cloud,
      title: 'Sincronización en la Nube',
      desc: 'Inicia sesión con tu cuenta de Yomori y mantén tu biblioteca, capítulos leídos y favoritos respaldados en tiempo real.'
    },
    {
      icon: Zap,
      title: 'Lectura Limpia sin Anuncios',
      desc: 'Cero publicidad intrusiva, sin ventanas emergentes ni acortadores molestos. Enfoque total en una lectura cómoda.'
    },
    {
      icon: HardDrive,
      title: 'Descargas Offline Reales',
      desc: 'Descarga capítulos completos en el almacenamiento de tu móvil para leer tus series favoritas en cualquier lugar sin conexión.'
    },
    {
      icon: BookOpen,
      title: 'Visor Cascada & Doble Página',
      desc: 'Modo webtoon vertical continuo, visor horizontal manga clásico, filtros de color, brillo inteligente y recorte de márgenes.'
    },
    {
      icon: MessageSquare,
      title: 'Comentarios en Vivo',
      desc: 'Debate cada capítulo y reacciona con emojis en tiempo real junto a otros lectores de la comunidad de Yomori.'
    }
  ];

  const faqs = [
    {
      q: '¿Por qué la aplicación no trae mangas nada más instalarla?',
      a: 'Yomori es una aplicación modular de código abierto. Para acceder a tus scans favoritos, solo necesitas agregar la URL del Repositorio de Extensiones (indicada arriba) en Ajustes > Explorar > Repositorios, e instalar las extensiones que desees con un solo toque.'
    },
    {
      q: '¿Cómo instalo el archivo APK en mi teléfono Android?',
      a: 'Descarga el APK pulsando en "Descargar APK". Una vez descargado, ábrelo en las notificaciones de tu teléfono. Si Android te pide confirmación, activa la opción "Permitir instalar aplicaciones de orígenes desconocidos" en tu navegador o explorador de archivos.'
    },
    {
      q: '¿Yomori es completamente gratuito?',
      a: 'Sí, Yomori es 100% gratuito y de código abierto. No contiene compras integradas, suscripciones premium ni publicidad molesta.'
    },
    {
      q: '¿Qué versión de APK debo descargar (Universal vs ARM64)?',
      a: 'Si tu teléfono es moderno (procesador de 64 bits), la versión ARM64 es más ligera (aprox. 26 MB) y rápida. Si tienes dudas o un dispositivo antiguo, descarga la versión Universal (compatible con cualquier Android).'
    },
    {
      q: '¿Mis lecturas y favoritos se guardan si cambio de teléfono?',
      a: '¡Sí! Al iniciar sesión con tu cuenta de Yomori dentro de la app, tu biblioteca, historial de lectura y progreso se sincronizan en la nube automáticamente.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-[#E2E8F0] font-sans antialiased selection:bg-[#3DD6D0] selection:text-[#07090E] relative overflow-x-hidden">
      
      {/* Luces de Fondo Ambientales */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#3DD6D0]/10 via-[#3DD6D0]/3 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-purple-600/5 blur-3xl pointer-events-none -z-10" />

      {/* NAVBAR SUPERIOR TEMA OSCURO */}
      <header className="sticky top-0 z-50 bg-[#07090E]/90 backdrop-blur-md border-b border-[#161D2B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Circular con Kanji */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#0F141C] border-2 border-[#3DD6D0] flex items-center justify-center shadow-lg shadow-[#3DD6D0]/20 text-[#3DD6D0] font-black text-xl tracking-tighter group-hover:scale-105 group-hover:shadow-[#3DD6D0]/40 transition duration-300">
              <span>夜</span>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block leading-none">
                Yomori
              </span>
              <span className="text-[11px] font-bold text-[#3DD6D0] tracking-wide flex items-center gap-1 mt-0.5">
                <Smartphone className="w-3 h-3 text-[#3DD6D0]" />
                App para Android
              </span>
            </div>
          </a>

          {/* Menú de Navegación */}
          <nav className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-gray-300">
            <button 
              onClick={() => setActiveNav('home')}
              className={`px-4 py-2 rounded-xl transition ${activeNav === 'home' ? 'bg-[#3DD6D0] text-[#07090E] font-extrabold shadow-md shadow-[#3DD6D0]/20' : 'hover:bg-[#161D2B] hover:text-white'}`}
            >
              Inicio
            </button>
            <a href="#manual-extensiones" className="px-3.5 py-2 rounded-xl hover:bg-[#161D2B] text-[#3DD6D0] hover:text-white transition font-bold flex items-center gap-1.5">
              <Puzzle className="w-4 h-4 text-[#3DD6D0]" />
              Manual Extensiones
            </a>
            <a href="#caracteristicas" className="px-3.5 py-2 rounded-xl hover:bg-[#161D2B] hover:text-white transition">
              Características
            </a>
            <a href="#scans" className="px-3.5 py-2 rounded-xl hover:bg-[#161D2B] hover:text-white transition">
              Scans en Español
            </a>
            <a href="#faq" className="px-3.5 py-2 rounded-xl hover:bg-[#161D2B] hover:text-white transition">
              Preguntas
            </a>
          </nav>

          {/* Botón GitHub & Descarga */}
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/cristoferapaza01-ai/Yomori" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121824] hover:bg-[#1A2333] text-gray-300 hover:text-white font-semibold text-xs transition border border-[#1E293B]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </a>

            <a
              href="/downloads/yomori.apk"
              download="Yomori-Android.apk"
              className="px-5 py-2.5 rounded-xl bg-[#3DD6D0] hover:bg-[#4AE3B5] text-[#07090E] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#3DD6D0]/20 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar APK</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION DE 2 COLUMNAS (TEMA OSCURO CYBER) */}
      <section className="py-12 sm:py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Columna Izquierda: Textos y Botones de Descarga */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121824] border border-[#1E293B] text-xs font-bold text-[#3DD6D0]">
              <span className="w-2 h-2 rounded-full bg-[#3DD6D0] animate-pulse" />
              <span>Versión 1.0 Oficial para Android</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              <span className="text-[#3DD6D0] drop-shadow-[0_0_20px_rgba(61,214,208,0.3)]">Yomori</span> App para Android
            </h1>

            <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-normal">
              El lector definitivo de <strong>Mangas, Manhwas y Novelas</strong> para tu teléfono o tablet Android. 100% gratuito, sin anuncios, sincronización en la nube con tu cuenta y lectura offline de alta velocidad.
            </p>

            {/* Opciones de Descarga */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/downloads/yomori.apk"
                  download="Yomori-Universal.apk"
                  className="px-7 py-3.5 rounded-xl bg-[#3DD6D0] hover:bg-[#4AE3B5] text-[#07090E] font-black text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-[#3DD6D0]/25 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Descargar APK (Universal)</span>
                </a>

                <a
                  href="/downloads/yomori-arm64-v8a.apk"
                  download="Yomori-ARM64.apk"
                  className="px-5 py-3.5 rounded-xl bg-[#121824] hover:bg-[#1A2333] text-gray-200 hover:text-white font-bold text-sm flex items-center gap-2 transition border border-[#1E293B] cursor-pointer"
                  title="Versión optimizada y más ligera para teléfonos de 64 bits"
                >
                  <Smartphone className="w-4 h-4 text-[#3DD6D0]" />
                  <span>ARM64 (26 MB)</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-mono pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3DD6D0]" />
                  Android 8.0+
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3DD6D0]" />
                  Sin Anuncios
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3DD6D0]" />
                  Código Abierto
                </span>
              </div>
            </div>

            {/* Botón directo al manual de extensiones */}
            <div className="pt-2">
              <a
                href="#manual-extensiones"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#3DD6D0] hover:text-[#4AE3B5] transition"
              >
                <span>¿Primera vez? Revisa cómo agregar las fuentes y extensiones</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

          {/* Columna Derecha: Mockup de Teléfono Android con Yomori */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[340px] sm:max-w-[380px] bg-[#0E131E] rounded-[42px] p-3 shadow-2xl shadow-[#3DD6D0]/10 border-4 border-[#1E2838] relative transform hover:scale-[1.02] transition duration-300">
              
              {/* Notificación / Notch superior del móvil */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#07090E] rounded-full z-20 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#161D2B] inline-block" />
              </div>

              {/* Pantalla Interna del Teléfono */}
              <div className="rounded-[34px] bg-[#07090E] border border-[#161D2B] overflow-hidden text-left shadow-inner flex flex-col h-[580px]">
                
                {/* Barra de Estado Android */}
                <div className="h-8 px-6 bg-[#07090E] flex items-center justify-between text-[11px] font-mono text-gray-500 select-none">
                  <span>12:00</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Header de la App Yomori Android */}
                <div className="px-4 py-3 bg-[#0F1420] border-b border-[#1A2233] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0B1118] border border-[#3DD6D0] flex items-center justify-center text-[#3DD6D0] font-black text-xs shadow-sm">
                      夜
                    </div>
                    <span className="font-black text-white text-sm tracking-wide">Yomori</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#132A32] text-[10px] font-mono text-[#3DD6D0] font-bold border border-[#3DD6D0]/30">
                      Cloud Sync
                    </span>
                  </div>
                </div>

                {/* Feed / Biblioteca de Mangas en Android */}
                <div className="p-3.5 space-y-3 flex-1 overflow-hidden bg-gradient-to-b from-[#0C101A] to-[#07090E]">
                  
                  {/* Categorías en Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-hidden pb-1">
                    <span className="px-3 py-1 rounded-full bg-[#3DD6D0] text-[#07090E] text-[11px] font-black shrink-0">
                      Leyendo (4)
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#161D2B] text-gray-300 text-[11px] font-medium shrink-0">
                      Completados
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#161D2B] text-gray-300 text-[11px] font-medium shrink-0">
                      Favoritos
                    </span>
                  </div>

                  {/* Grid de Portadas */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { title: 'Iron-Blooded Hound', cap: 'Cap. 114', scan: 'Olympus', color: 'from-purple-900/80 to-indigo-950' },
                      { title: 'Lookism', cap: 'Cap. 602', scan: 'ZonaTMO', color: 'from-blue-900/80 to-slate-950' },
                      { title: 'Mount Hua Sect', cap: 'Cap. 195', scan: 'SkyMangas', color: 'from-emerald-900/80 to-teal-950' },
                      { title: 'Grand Blue', cap: 'Cap. 92', scan: 'Plot Twist', color: 'from-amber-900/80 to-stone-950' }
                    ].map((m, idx) => (
                      <div key={idx} className="rounded-xl bg-[#121824] border border-[#1E293B] p-2 space-y-1.5">
                        <div className={`h-28 rounded-lg bg-gradient-to-tr ${m.color} p-2 flex flex-col justify-between border border-white/5`}>
                          <span className="self-end text-[7px] font-bold px-1.5 py-0.5 rounded bg-[#3DD6D0] text-[#07090E]">
                            HD
                          </span>
                          <span className="text-[10px] font-extrabold text-white leading-tight line-clamp-2">
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono px-0.5">
                          <span>{m.scan}</span>
                          <span className="text-[#3DD6D0] font-bold">{m.cap}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Barra Inferior de Navegación Android */}
                <div className="h-14 px-4 bg-[#0B0E16] border-t border-[#161D2B] flex items-center justify-around text-gray-400 text-[10px] font-medium">
                  <div className="flex flex-col items-center text-[#3DD6D0] font-bold">
                    <BookOpen className="w-4 h-4" />
                    <span>Inicio</span>
                  </div>
                  <div className="flex flex-col items-center hover:text-white">
                    <Layers className="w-4 h-4" />
                    <span>Biblioteca</span>
                  </div>
                  <div className="flex flex-col items-center hover:text-white">
                    <Search className="w-4 h-4" />
                    <span>Explorar</span>
                  </div>
                  <div className="flex flex-col items-center hover:text-white">
                    <Settings className="w-4 h-4" />
                    <span>Ajustes</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* FILA DE DESTACADOS / STATS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {highlights.map((item, idx) => (
            <div 
              key={idx}
              className="rounded-2xl border border-[#1E293B] bg-[#0E131E] p-6 text-center shadow-lg hover:border-[#3DD6D0]/60 transition duration-300"
            >
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                {item.value}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-400">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN CRUCIAL: EL MANUAL DE EXTENSIONES */}
      <section id="manual-extensiones" className="py-16 sm:py-24 bg-[#0A0E17] border-y border-[#161D2B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Cabecera del Manual */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#132A32] border border-[#3DD6D0]/40 text-[#3DD6D0] font-mono text-xs font-bold tracking-wider uppercase">
              <Puzzle className="w-3.5 h-3.5" />
              Guía Paso a Paso
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Cómo Activar las Fuentes y Scans en Yomori
            </h2>
            <p className="text-base text-gray-400 leading-relaxed">
              Por arquitectura de código abierto, la aplicación <strong>no incluye extensiones preinstaladas por defecto</strong>. Solo debes añadir el repositorio oficial una sola vez para tener acceso a todos los scans en español.
            </p>
          </div>

          {/* Caja Interactiva para Copiar la URL del Repositorio */}
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#0E1422] p-6 sm:p-8 border-2 border-[#3DD6D0]/50 shadow-2xl shadow-[#3DD6D0]/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-black uppercase text-[#3DD6D0] tracking-widest block">
                  URL del Repositorio Oficial
                </span>
                <h4 className="text-lg font-black text-white mt-0.5">
                  Repositorio de Extensiones (Keiyoushi / Yomori)
                </h4>
              </div>
              <button
                onClick={handleCopyRepo}
                className="px-5 py-3 rounded-xl bg-[#3DD6D0] hover:bg-[#4AE3B5] text-[#07090E] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#3DD6D0]/20 transition transform active:scale-95 cursor-pointer shrink-0"
              >
                {copiedRepo ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡URL Copiada al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar URL del Repositorio</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 bg-[#070A10] rounded-xl border border-[#1E293B] flex items-center justify-between gap-2 overflow-x-auto">
              <code className="text-xs sm:text-sm font-mono text-[#3DD6D0] font-bold select-all break-all">
                {repoUrl}
              </code>
            </div>

            <p className="text-xs text-gray-400 leading-normal">
              💡 Esta dirección conecta tu aplicación con más de 100 extensiones actualizadas constantemente (Olympus Scanlation, SkyMangas, ZonaTMO, Ikigai, MangaDex, etc.).
            </p>
          </div>

          {/* 4 Pasos Visuales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-[#0E131E] border border-[#1E293B] space-y-3 text-left shadow-md hover:border-[#3DD6D0]/60 transition">
              <span className="w-10 h-10 rounded-xl bg-[#132A32] text-[#3DD6D0] border border-[#3DD6D0]/40 font-black text-base flex items-center justify-center shadow-md">
                1
              </span>
              <h3 className="text-base font-bold text-white">Instala el APK</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Descarga <a href="/downloads/yomori.apk" className="text-[#3DD6D0] font-bold underline">yomori.apk</a> en tu teléfono e instálalo permitiendo la instalación de orígenes desconocidos.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0E131E] border border-[#1E293B] space-y-3 text-left shadow-md hover:border-[#3DD6D0]/60 transition">
              <span className="w-10 h-10 rounded-xl bg-[#132A32] text-[#3DD6D0] border border-[#3DD6D0]/40 font-black text-base flex items-center justify-center shadow-md">
                2
              </span>
              <h3 className="text-base font-bold text-white">Ve a Ajustes</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Abre Yomori, toca en <strong>Ajustes</strong> (icono de engranaje) &gt; <strong>Explorar</strong> &gt; <strong>Repositorios de extensiones</strong>.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0E131E] border border-[#1E293B] space-y-3 text-left shadow-md hover:border-[#3DD6D0]/60 transition">
              <span className="w-10 h-10 rounded-xl bg-[#132A32] text-[#3DD6D0] border border-[#3DD6D0]/40 font-black text-base flex items-center justify-center shadow-md">
                3
              </span>
              <h3 className="text-base font-bold text-white">Pega el Repositorio</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Toca el botón <strong>"+"</strong> o <strong>"Añadir Repositorio"</strong> y pega la URL que copiaste arriba. Guarda los cambios.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0E131E] border border-[#1E293B] space-y-3 text-left shadow-md hover:border-[#3DD6D0]/60 transition">
              <span className="w-10 h-10 rounded-xl bg-[#132A32] text-[#3DD6D0] border border-[#3DD6D0]/40 font-black text-base flex items-center justify-center shadow-md">
                4
              </span>
              <h3 className="text-base font-bold text-white">¡Instala y Lee!</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ve a la pestaña <strong>Explorar &gt; Extensiones</strong>, pulsa <strong>Instalar</strong> en tus scans favoritos y comienza a disfrutar.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECCIÓN: CARACTERÍSTICAS PRINCIPALES */}
      <section id="caracteristicas" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#3DD6D0]">
            Lo Mejor de Yomori Android
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Diseñado para Lectores Móviles
          </h2>
          <p className="text-base text-gray-400">
            Todo lo que necesitas para una lectura fluida, rápida y placentera en tu teléfono o tablet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="rounded-2xl bg-[#0E131E] p-7 border border-[#1E293B] shadow-md hover:border-[#3DD6D0]/60 transition duration-300 text-left space-y-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-[#132A32] text-[#3DD6D0] flex items-center justify-center border border-[#3DD6D0]/30 shadow-md shadow-[#3DD6D0]/10">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN: SCANS Y FUENTES EN ESPAÑOL */}
      <section id="scans" className="py-20 bg-[#0A0E17] border-y border-[#161D2B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#3DD6D0]">
              Compatibilidad Total
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Tus Scans Favoritos en un Solo Lugar
            </h2>
            <p className="text-base text-gray-400">
              Lee directamente desde las fuentes oficiales de traducción en español sin publicidad ni intermediarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scans.map((scan, idx) => (
              <div 
                key={idx}
                className="rounded-xl bg-[#0E131E] p-4 sm:p-5 border border-[#1E293B] flex items-center justify-between shadow-md hover:border-[#3DD6D0]/60 transition"
              >
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-sm text-white">{scan.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{scan.lang}</span>
                    <span>•</span>
                    <span>{scan.type}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#132A32] text-[#3DD6D0] border border-[#3DD6D0]/30 font-mono text-[11px] font-bold">
                  {scan.status}
                </span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECCIÓN: PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 bg-[#07090E] border-b border-[#161D2B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#3DD6D0]">
              Dudas Frecuentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-xl bg-[#0E131E] border border-[#1E293B] overflow-hidden transition"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#121824] transition cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#3DD6D0] transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-[#1E293B] pt-3 text-left">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* BANNER FINAL DE DESCARGA */}
      <section className="py-20 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#0F141C] border-2 border-[#3DD6D0] text-[#3DD6D0] flex items-center justify-center mx-auto shadow-xl shadow-[#3DD6D0]/20 mb-2">
          <Smartphone className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          Descarga <span className="text-[#3DD6D0]">Yomori</span> para Android
        </h2>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
          Lleva tu biblioteca completa en tu bolsillo. Lectura fluida, cero anuncios y sincronización en la nube.
        </p>
        <div className="pt-3 flex flex-wrap justify-center gap-4">
          <a
            href="/downloads/yomori.apk"
            download="Yomori-Universal.apk"
            className="px-9 py-4 rounded-xl bg-[#3DD6D0] hover:bg-[#4AE3B5] text-[#07090E] font-black text-base flex items-center gap-3 shadow-xl shadow-[#3DD6D0]/25 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Descargar APK Universal (Recomendado)</span>
          </a>

          <a
            href="/downloads/yomori-arm64-v8a.apk"
            download="Yomori-ARM64.apk"
            className="px-6 py-4 rounded-xl bg-[#121824] hover:bg-[#1A2333] text-gray-200 hover:text-white font-bold text-base flex items-center gap-2 border border-[#1E293B] transition cursor-pointer"
          >
            <Smartphone className="w-5 h-5 text-[#3DD6D0]" />
            <span>Descargar ARM64 (26 MB)</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-[#161D2B] bg-[#05070B] text-center text-xs text-gray-500 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0F141C] border border-[#3DD6D0] flex items-center justify-center text-[10px] text-[#3DD6D0] font-bold">
            夜
          </div>
          <span className="font-bold text-gray-300">Yomori App para Android</span>
        </div>
        <p>© 2026 Yomori Project. Proyecto gratuito y de código abierto para la comunidad.</p>
      </footer>

    </div>
  );
}
