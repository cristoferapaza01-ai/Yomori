import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Heart, 
  Sparkles, 
  User, 
  Clock, 
  Smile, 
  ChevronLeft,
  Flame,
  ThumbsUp,
  Bookmark,
  Users
} from 'lucide-react';

const DEFAULT_COMMENTS_SEED = {
  general: [
    {
      id: 'seed-1',
      username: 'MangaFan99',
      avatarColor: 'from-purple-500 to-indigo-600',
      text: '¡Qué buen capítulo! La calidad del dibujo y los detalles están brutales 🔥',
      page: 3,
      likes: 14,
      isLiked: false,
      timestamp: 'hace 15 min'
    },
    {
      id: 'seed-2',
      username: 'OtakuReader_XD',
      avatarColor: 'from-pink-500 to-rose-600',
      text: 'No me esperaba para nada ese giro en esta parte 😱 10/10',
      page: 8,
      likes: 9,
      isLiked: false,
      timestamp: 'hace 42 min'
    },
    {
      id: 'seed-3',
      username: 'Kaze_Scan',
      avatarColor: 'from-emerald-500 to-teal-600',
      text: 'Muchas gracias por la traducción y subirlo tan rápido ❤️',
      page: 1,
      likes: 27,
      isLiked: false,
      timestamp: 'hace 2 horas'
    }
  ]
};

export default function ChapterCommentsDrawer({
  chapterUrl,
  chapterTitle = 'Capítulo',
  mangaTitle = 'Manga',
  currentPage = 1,
  currentUser = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  const [includePageTag, setIncludePageTag] = useState(true);
  const commentsEndRef = useRef(null);

  const storageKey = chapterUrl ? `tachiyomi_comments_${btoa(encodeURIComponent(chapterUrl)).slice(0, 32)}` : null;

  // Cantidad de personas leyendo en vivo (Semilla determinista por capítulo con fluctuación orgánica)
  const [activeReaders, setActiveReaders] = useState(() => {
    if (!chapterUrl) return 89;
    let hash = 0;
    for (let i = 0; i < chapterUrl.length; i++) {
      hash = (hash << 5) - hash + chapterUrl.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 180) + 42; // entre 42 y 222 lectores
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReaders(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(15, prev + delta);
      });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Cargar comentarios desde LocalStorage o generar comentarios iniciales
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setComments(JSON.parse(saved));
      } catch (e) {
        setComments(DEFAULT_COMMENTS_SEED.general);
      }
    } else {
      setComments(DEFAULT_COMMENTS_SEED.general);
    }
  }, [storageKey]);

  // Guardar en localStorage cada vez que cambien los comentarios
  const saveComments = (newComments) => {
    setComments(newComments);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newComments));
    }
  };

  const handleSendComment = (e) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      username: currentUser?.username || 'Tú (Lector)',
      avatarColor: 'from-purple-600 to-indigo-600',
      text: cleanText,
      page: includePageTag ? currentPage : null,
      likes: 0,
      isLiked: false,
      timestamp: 'Justo ahora'
    };

    const updated = [...comments, newComment];
    saveComments(updated);
    setInputText('');

    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleToggleLike = (commentId) => {
    const updated = comments.map(c => {
      if (c.id === commentId) {
        const isLiked = !c.isLiked;
        return {
          ...c,
          isLiked,
          likes: isLiked ? c.likes + 1 : Math.max(0, c.likes - 1)
        };
      }
      return c;
    });
    saveComments(updated);
  };

  const handleQuickReaction = (emojiText) => {
    setInputText(prev => prev ? `${prev} ${emojiText}` : emojiText);
  };

  return (
    <>
      {/* 1. BOTÓN FLOTANTE EN EL LADO IZQUIERDO DEL LECTOR */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-2xl border transition-all duration-300 shadow-2xl flex flex-col items-center gap-1 group active:scale-95 ${
          isOpen
            ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/40 translate-x-80 sm:translate-x-96'
            : 'bg-[#0f121d]/90 hover:bg-[#161a29] border-gray-800 text-gray-300 hover:text-white shadow-black/80 hover:border-purple-600/60 backdrop-blur-xl'
        }`}
        title={isOpen ? 'Cerrar panel de comentarios' : `${activeReaders} personas leyendo ahora`}
      >
        <MessageSquare className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'group-hover:scale-110 text-purple-400'}`} />
        <span className="text-[10px] font-bold font-mono tracking-tight">
          {comments.length}
        </span>
        <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-mono font-semibold">
          <Users className="w-2.5 h-2.5" />
          <span>{activeReaders}</span>
        </span>
      </button>

      {/* 2. PANEL LATERAL FLOTANTE DE COMENTARIOS (SIN SOMBREADO/OVERLAY DE FONDO) */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 left-0 bottom-0 z-40 w-80 sm:w-96 bg-[#0c0f18]/95 backdrop-blur-2xl border-r border-gray-800/90 shadow-2xl shadow-black/90 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Cabecera del Panel */}
        <div className="p-4 border-b border-gray-800/80 flex items-center justify-between bg-[#101420]/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-800/60 text-purple-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  Comentarios en Vivo
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-bold text-emerald-400 font-mono shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                  <span className="text-emerald-600/80">•</span>
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>{activeReaders} leyendo</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {chapterTitle} • {comments.length} comentarios
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition active:scale-90 shrink-0 ml-2"
            title="Cerrar panel de comentarios"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Reacciones Rápidas */}
        <div className="px-3 py-2 bg-[#090b12] border-b border-gray-800/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {['🔥 Épico', '😱 Qué giro', '❤️ Me encantó', '😂 Jaja', '👏 10/10'].map((rx) => (
            <button
              key={rx}
              onClick={() => handleQuickReaction(rx)}
              className="px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-purple-950/80 hover:text-purple-300 border border-gray-800/80 text-[11px] font-medium text-gray-300 whitespace-nowrap transition active:scale-95"
            >
              {rx}
            </button>
          ))}
        </div>

        {/* Lista de Comentarios con Scroll */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 rounded-2xl bg-[#121622] border border-gray-800/70 hover:border-gray-700/80 transition flex flex-col gap-2 group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${comment.avatarColor || 'from-purple-600 to-indigo-600'} flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm`}>
                    {comment.username.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-gray-200 truncate">
                    {comment.username}
                  </span>
                  {comment.page && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-300 border border-purple-800/50">
                      Pág. {comment.page}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {comment.timestamp}
                </span>
              </div>

              {/* Texto del comentario */}
              <p className="text-xs text-gray-300 leading-relaxed break-words select-text">
                {comment.text}
              </p>

              {/* Botón de Like */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-800/40">
                <button
                  onClick={() => handleToggleLike(comment.id)}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold transition active:scale-95 ${
                    comment.isLiked ? 'text-rose-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-500 text-rose-500 animate-bounce' : ''}`} />
                  <span>{comment.likes}</span>
                </button>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Input para Escribir Comentario */}
        <form onSubmit={handleSendComment} className="p-3 border-t border-gray-800/90 bg-[#0e121c]">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includePageTag}
                onChange={(e) => setIncludePageTag(e.target.checked)}
                className="w-3 h-3 rounded accent-purple-600 bg-gray-800 border-gray-700"
              />
              <span>Etiquetar en viñeta actual (Pág. {currentPage})</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 bg-[#141824] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition shadow-inner select-text"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white shadow-md shadow-purple-600/30 transition active:scale-95 shrink-0"
              title="Publicar comentario"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
