import React, { useState } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  HardDrive, 
  Puzzle, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  ExternalLink,
  Layers,
  Flame,
  ArrowDown,
  Code2
} from 'lucide-react';

export default function OfficialLandingPage({ onOpenWebReader }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: HardDrive,
      color: 'from-purple-500 to-indigo-500',
      title: 'Lectura 100% Offline Real',
      desc: 'Descarga capítulos y tomos completos directamente a tu disco duro. Lee en aviones, viajes o sin conexión a Internet con carga instantánea.'
    },
    {
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
      title: 'Cero Anuncios ni Acortadores',
      desc: 'Olvídate de la publicidad molesta, captchas y redirecciones. Una experiencia de lectura limpia, fluida y enfocada solo en el arte.'
    },
    {
      icon: Puzzle,
      color: 'from-emerald-500 to-teal-500',
      title: '9+ Scans Oficiales Sincronizados',
      desc: 'Conexión en tiempo real con Olympus, ZonaTMO, MangaDex, MiauScan, SkyMangas, Plot Twist, Ikigai, ManhwaLatino y RN Scanlation.'
    },
    {
      icon: BookOpen,
      color: 'from-sky-500 to-blue-500',
      title: 'Visor Cascada & Webtoon HD',
      desc: 'Optimizado para scroll continuo vertical, doble página y zoom inteligente de alta definición sin recargar la pantalla.'
    },
    {
      icon: Layers,
      color: 'from-pink-500 to-rose-500',
      title: 'Biblioteca & Categorías',
      desc: 'Organiza tus mangas por categorías personalizadas, seguimiento automático de capítulos leídos y guardado de historial.'
    },
    {
      icon: ShieldCheck,
      color: 'from-violet-500 to-purple-500',
      title: 'Código Abierto & Seguro',
      desc: 'Sin telemetría invasiva ni recolección de datos personales. Todo se almacena localmente en tu propio dispositivo.'
    }
  ];

  const extensions = [
    { name: 'Olympus Scanlation', lang: 'ES', type: 'Manhwas & Cómics', status: 'Online' },
    { name: 'ZonaTMO (TuMangaOnline)', lang: 'ES', type: 'Catálogo Masivo', status: 'Online' },
    { name: 'MangaDex', lang: 'ES / Global', type: 'Multilenguaje', status: 'Online' },
    { name: 'MiauScan (LeeMiau)', lang: 'ES', type: 'Romance / Shojo', status: 'Online' },
    { name: 'SkyMangas', lang: 'ES', type: 'Manhuas & Cultivo', status: 'Online' },
    { name: 'Plot Twist No Fansub', lang: 'ES', type: 'Shonen & Seinen', status: 'Online' },
    { name: 'Ikigai Mangas', lang: 'ES', type: 'Manhwas & Novelas', status: 'Online' },
    { name: 'ManhwaLatino', lang: 'ES', type: 'Webtoons HD', status: 'Online' },
    { name: 'RN Scanlation', lang: 'ES', type: 'Manhwas & Acción', status: 'Online' }
  ];

  const faqs = [
    {
      q: '¿Yomori es completamente gratuito?',
      a: 'Sí, Yomori es 100% gratuito y de código abierto. No contiene compras dentro de la aplicación, suscripciones ni publicidad.'
    },
    {
      q: '¿Cómo funciona la lectura offline en mi PC?',
      a: 'Al hacer clic en el botón de descargar capítulo en la aplicación de PC, todas las imágenes se guardan directamente en tu disco duro (C:/...). Puedes apagar el Wi-Fi o desconectar el cable de red y leer todos tus mangas descargados sin ningún problema.'
    },
    {
      q: '¿Cómo instalo la aplicación en Windows?',
      a: 'Solo debes descargar el archivo Yomori-Windows-x64.zip, descomprimirlo en tu carpeta preferida y hacer doble clic en Yomori.exe (o en Abrir_YOMORI_PC.bat). ¡No requiere instalaciones complicadas!'
    },
    {
      q: '¿Cuándo estará disponible la versión para celulares (Android)?',
      a: 'La versión para Android en formato .apk está actualmente en fase de desarrollo activo y estará disponible para descarga en esta misma página web.'
    },
    {
      q: '¿Puedo agregar mis propias extensiones o scans?',
      a: '¡Por supuesto! El repositorio de extensiones de Yomori es abierto. Puedes vincular cualquier manifest compatible o crear tus propios scrapers en JavaScript.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 font-sans selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Luces de fondo ambientales */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[800px] -left-40 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[1400px] -right-40 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER PRINCIPAL DE LA LANDING */}
      <header className="sticky top-0 z-50 bg-[#07090e]/90 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/40">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block leading-tight">
                Yomori
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-purple-400 font-mono">
                Manga & Manhwa Desktop
              </span>
            </div>
          </div>

          {/* Enlaces de Navegación */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-400">
            <a href="#caracteristicas" className="hover:text-white transition">Características</a>
            <a href="#extensiones" className="hover:text-white transition">Scans & Fuentes</a>
            <a href="#descargar" className="hover:text-white transition">Descargar</a>
            <a href="#faq" className="hover:text-white transition">Preguntas Frecuentes</a>
            <a 
              href="https://github.com/cristoferapaza01-ai/Yomori" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </a>
          </nav>

          {/* Botón CTA Superior */}
          <div className="flex items-center gap-3">
            <a
              href="/downloads/Yomori-Windows-x64.zip"
              download="Yomori-Windows-x64.zip"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar para PC</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION DE PRESENTACIÓN */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        
        {/* Badge de Lanzamiento */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 shadow-md shadow-purple-950/50 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-200">
            Yomori Desktop v1.0 • Ya Disponible para Windows
          </span>
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
          Lee Manga y Manhwa sin Límites, <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            100% Offline en tu Computadora
          </span>
        </h1>

        {/* Subtítulo Descriptivo */}
        <p className="text-base sm:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed font-normal">
          La aplicación de escritorio definitiva para descargar y leer mangas directo a tu disco duro. 
          Conecta más de 9 scans oficiales en español, disfruta de lectura continua en cascada y olvídate de la publicidad molesta.
        </p>

        {/* Botonera de Descarga Principal */}
        <div id="descargar" className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          <a
            href="/downloads/Yomori-Windows-x64.zip"
            download="Yomori-Windows-x64.zip"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base flex items-center justify-center gap-3 shadow-2xl shadow-purple-600/50 hover:shadow-purple-600/80 transition transform hover:-translate-y-1 active:scale-95 cursor-pointer"
          >
            <Download className="w-5 h-5 animate-bounce" />
            <div className="text-left">
              <span className="block text-[10px] font-semibold text-purple-200 uppercase tracking-widest">Windows 10 / 11 (x64)</span>
              <span>Descargar Yomori para PC</span>
            </div>
          </a>

          <div className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#121524] border border-gray-800 flex items-center justify-center gap-3 text-left">
            <Smartphone className="w-6 h-6 text-gray-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300">App para Android</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  En Desarrollo
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Archivo .apk próximamente</span>
            </div>
          </div>
        </div>

        {/* Garantías Rápidas */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Gratuito y de Código Abierto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sin Anuncios ni Ventanas Emergentes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Descarga Directa a Disco Local</span>
          </div>
        </div>

        {/* MOCKUP / PREVIEW VISUAL DE LA APP */}
        <div className="pt-12 max-w-5xl mx-auto">
          <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-purple-500/30 via-gray-800/40 to-transparent shadow-2xl shadow-purple-950/70 border border-purple-500/40">
            <div className="rounded-2xl bg-[#0d1017] border border-gray-800 overflow-hidden shadow-inner">
              
              {/* Barra de ventana de la app */}
              <div className="h-9 px-4 bg-[#141824] border-b border-gray-800 flex items-center justify-between text-xs text-gray-400 select-none">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] text-purple-300 font-bold">Yomori Desktop Reader • Modo Offline</span>
                <div className="w-12" />
              </div>

              {/* Vista interna simulada */}
              <div className="p-6 sm:p-8 bg-gradient-to-b from-[#0f131f] to-[#0a0d14] space-y-6 text-left">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Disco Duro Local • 14 Capítulos Guardados
                    </span>
                    <h3 className="text-xl font-black text-white">Biblioteca Offline de Mangas</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-purple-950 border border-purple-700/60 text-purple-300 text-xs font-bold font-mono">
                      9 Scans Conectados
                    </span>
                  </div>
                </div>

                {/* Grid de portadas simuladas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { title: 'El Lord que sube de nivel', scan: 'Olympus', cap: 'Cap. 112 (Descargado)', tag: 'Guardado' },
                    { title: 'Lookism', scan: 'ZonaTMO', cap: 'Cap. 601 (Descargado)', tag: 'Guardado' },
                    { title: 'Grand Blue', scan: 'Plot Twist', cap: 'Cap. 92 (Descargado)', tag: 'Guardado' },
                    { title: 'Secta de la Montaña', scan: 'SkyMangas', cap: 'Cap. 192 (Descargado)', tag: 'Guardado' }
                  ].map((m, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#171b29] border border-gray-800 space-y-2 hover:border-purple-600/50 transition">
                      <div className="h-36 sm:h-44 rounded-xl bg-gradient-to-tr from-purple-950/60 to-indigo-900/40 border border-gray-700/40 flex flex-col justify-between p-2.5">
                        <span className="self-end text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {m.tag}
                        </span>
                        <span className="text-[10px] font-mono text-purple-300 bg-black/60 px-2 py-0.5 rounded-md self-start">
                          {m.scan}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{m.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{m.cap}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: CARACTERÍSTICAS DESTACADAS */}
      <section id="caracteristicas" className="py-20 bg-[#0a0d15] border-t border-b border-gray-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
              Potencia & Rendimiento
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Diseñado Exclusivamente para Lectores de Manga
            </h2>
            <p className="text-sm text-gray-400">
              Todas las herramientas que necesitas para disfrutar de tus obras favoritas sin limitaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div 
                  key={i} 
                  className="p-7 rounded-3xl bg-[#111522] border border-gray-800/90 hover:border-purple-600/50 transition-all duration-300 space-y-4 hover:-translate-y-1 shadow-xl"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN: SCANS Y EXTENSIONES INCLUIDAS */}
      <section id="extensiones" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
            Fuentes Conectadas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Los Mejores Scans en un Solo Lugar
          </h2>
          <p className="text-sm text-gray-400">
            Yomori incluye soporte nativo y sincronización automática con las fuentes más populares de la comunidad.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extensions.map((ext, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-2xl bg-[#101420] border border-gray-800 flex items-center justify-between gap-3 hover:border-purple-700/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-purple-400 text-sm shrink-0">
                  {ext.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{ext.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{ext.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60">
                  {ext.lang}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <a
            href="https://github.com/cristoferapaza01-ai/yomori-extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
          >
            <span>Ver repositorio público de extensiones en GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* SECCIÓN: CÓMO INSTALAR EN WINDOWS */}
      <section className="py-20 bg-[#0a0d15] border-t border-b border-gray-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
              Instalación Rápida
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Listo en 3 Simples Pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#121624] border border-gray-800 space-y-3 relative">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-purple-600/40">
                1
              </span>
              <h3 className="text-base font-bold text-white">Descarga el Zip</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Haz clic en el botón de descarga para obtener el paquete oficial <code className="text-purple-300 font-mono">Yomori-Windows-x64.zip</code>.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#121624] border border-gray-800 space-y-3 relative">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-600/40">
                2
              </span>
              <h3 className="text-base font-bold text-white">Descomprime la Carpeta</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Haz clic derecho en el archivo descargado y selecciona "Extraer todo" en cualquier carpeta de tu PC.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#121624] border border-gray-800 space-y-3 relative">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-emerald-600/40">
                3
              </span>
              <h3 className="text-base font-bold text-white">Ejecuta y Lee Offline</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Abre <code className="text-purple-300 font-mono">Yomori.exe</code> ¡y comienza a disfrutar de todos tus mangas sin conexión a Internet!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: PREGUNTAS FRECUENTES (FAQ) */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
            Resolución de Dudas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-2xl bg-[#101420] border border-gray-800 overflow-hidden transition"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-gray-800/40 transition cursor-pointer"
              >
                <span className="text-sm font-bold text-white">{faq.q}</span>
                <span className={`text-purple-400 transition-transform ${activeFaq === idx ? 'rotate-90' : ''}`}>
                  ❯
                </span>
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-gray-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BANNER FINAL DE DESCARGA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-purple-950/70 border border-purple-500/40 p-8 sm:p-12 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ¿Listo para llevar tu lectura al siguiente nivel?
          </h2>
          <p className="text-sm text-gray-300 max-w-2xl mx-auto">
            Descarga Yomori para PC hoy mismo y disfruta de tus mangas y manhwas favoritos sin anuncios ni cortes.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href="/downloads/Yomori-Windows-x64.zip"
              download="Yomori-Windows-x64.zip"
              className="px-8 py-4 rounded-2xl bg-white hover:bg-gray-100 text-purple-950 font-black text-sm flex items-center gap-2.5 shadow-xl transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5 text-purple-700" />
              <span>Descargar Yomori Gratis (Windows x64)</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-gray-800/80 bg-[#05070a] text-center text-xs text-gray-500 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-gray-300">Yomori Manga & Manhwa Reader</span>
        </div>
        <p>© 2026 Yomori Project. Proyecto de código abierto para la comunidad.</p>
      </footer>

    </div>
  );
}
