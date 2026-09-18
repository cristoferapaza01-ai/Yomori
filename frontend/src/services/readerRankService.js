// Servicio unificado de Rangos de Lector, Misiones y Estadísticas de Yomori

export const READER_RANKS = [
  {
    level: 1,
    minChapters: 0,
    maxChapters: 49,
    title: 'Lector Novato',
    badge: '🌱 Lector Novato',
    color: 'from-gray-500 to-slate-400',
    border: 'border-slate-500/50',
    text: 'text-slate-300',
    bg: 'bg-slate-900/90',
    nextGoal: 50
  },
  {
    level: 2,
    minChapters: 50,
    maxChapters: 149,
    title: 'Lector Aprendiz',
    badge: '📖 Lector Aprendiz',
    color: 'from-sky-500 to-blue-400',
    border: 'border-sky-500/50',
    text: 'text-sky-300',
    bg: 'bg-sky-950/90',
    nextGoal: 150
  },
  {
    level: 3,
    minChapters: 150,
    maxChapters: 399,
    title: 'Lector Aficionado',
    badge: '🥉 Lector Aficionado',
    color: 'from-emerald-500 to-teal-400',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/90',
    nextGoal: 400
  },
  {
    level: 4,
    minChapters: 400,
    maxChapters: 999,
    title: 'Lector Entusiasta',
    badge: '🥈 Lector Entusiasta',
    color: 'from-indigo-500 to-violet-400',
    border: 'border-indigo-500/50',
    text: 'text-indigo-300',
    bg: 'bg-indigo-950/90',
    nextGoal: 1000
  },
  {
    level: 5,
    minChapters: 1000,
    maxChapters: 2499,
    title: 'Lector Ávido',
    badge: '🥇 Lector Ávido',
    color: 'from-amber-500 to-yellow-400',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
    bg: 'bg-amber-950/90',
    nextGoal: 2500
  },
  {
    level: 6,
    minChapters: 2500,
    maxChapters: 4999,
    title: 'Lector Veterano',
    badge: '⚡ Lector Veterano',
    color: 'from-orange-500 to-red-400',
    border: 'border-orange-500/50',
    text: 'text-orange-300',
    bg: 'bg-orange-950/90',
    nextGoal: 5000
  },
  {
    level: 7,
    minChapters: 5000,
    maxChapters: 8999,
    title: 'Lector Élite',
    badge: '🔮 Lector Élite',
    color: 'from-purple-500 to-fuchsia-400',
    border: 'border-purple-500/50',
    text: 'text-purple-300',
    bg: 'bg-purple-950/90',
    nextGoal: 9000
  },
  {
    level: 8,
    minChapters: 9000,
    maxChapters: 14999,
    title: 'Maestro del Manga',
    badge: '👑 Maestro del Manga',
    color: 'from-pink-500 to-rose-400',
    border: 'border-pink-500/50',
    text: 'text-pink-300',
    bg: 'bg-pink-950/90',
    nextGoal: 15000
  },
  {
    level: 9,
    minChapters: 15000,
    maxChapters: 24999,
    title: 'Monarca del Manhwa',
    badge: '🔥 Monarca del Manhwa',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-500/60',
    text: 'text-red-300',
    bg: 'bg-red-950/90',
    nextGoal: 25000
  },
  {
    level: 10,
    minChapters: 25000,
    maxChapters: 999999,
    title: 'Ser Trascendente',
    badge: '🌌 Ser Trascendente',
    color: 'from-purple-400 via-pink-400 to-cyan-300',
    border: 'border-purple-400',
    text: 'text-purple-200',
    bg: 'bg-purple-950/90',
    nextGoal: 25000
  }
];

// Calcula rango, nivel y progreso hacia la siguiente meta
export function calculateReaderRank(totalChaptersRead = 0) {
  const count = Math.max(0, parseInt(totalChaptersRead, 10) || 0);
  const rank = READER_RANKS.find(r => count >= r.minChapters && count <= r.maxChapters) || READER_RANKS[0];
  const isMax = rank.level === 10;

  const span = isMax ? 1 : (rank.nextGoal - rank.minChapters);
  const currentInTier = isMax ? 1 : (count - rank.minChapters);
  const progressPercent = isMax ? 100 : Math.min(100, Math.max(0, Math.round((currentInTier / span) * 100)));
  const chaptersRemaining = isMax ? 0 : Math.max(1, rank.nextGoal - count);

  return {
    ...rank,
    totalChaptersRead: count,
    progressPercent,
    chaptersRemaining,
    isMax
  };
}

// Actualiza y calcula la racha de días consecutivos leyendo
export function updateReadingStreak() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem('yomori_reading_streak');
    let streakData = raw ? JSON.parse(raw) : { streak: 1, lastDate: today };

    if (streakData.lastDate === today) {
      return streakData.streak || 1;
    }

    const last = new Date(streakData.lastDate);
    const curr = new Date(today);
    const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streakData.streak = (streakData.streak || 0) + 1;
      streakData.lastDate = today;
    } else if (diffDays > 1) {
      streakData.streak = 1;
      streakData.lastDate = today;
    }
    localStorage.setItem('yomori_reading_streak', JSON.stringify(streakData));
    return streakData.streak || 1;
  } catch (e) {
    return 1;
  }
}

// Obtiene la racha actual
export function getReadingStreak() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem('yomori_reading_streak');
    if (!raw) return 1;
    const data = JSON.parse(raw);
    const last = new Date(data.lastDate || today);
    const curr = new Date(today);
    const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 1;
    return data.streak || 1;
  } catch (e) {
    return 1;
  }
}

// Obtiene el tiempo total de lectura en horas y minutos
export function getReadingTimeStats(chaptersRead = 0) {
  try {
    let seconds = parseInt(localStorage.getItem('yomori_reading_seconds') || '0', 10);
    // Si los segundos registrados son 0 pero tiene capítulos leídos, calculamos un estimado de 5 minutos por cap
    if (seconds < 60 && chaptersRead > 0) {
      seconds = chaptersRead * 5 * 60;
    }
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, totalMinutes, totalSeconds: seconds };
  } catch (e) {
    return { hours: 0, minutes: 0, totalMinutes: 0, totalSeconds: 0 };
  }
}

// Registra un capítulo completado en el registro vitalicio inmutable anti-trampas
export function recordLifetimeReadChapter(chapterUrl) {
  if (!chapterUrl) return;
  try {
    const raw = localStorage.getItem('yomori_lifetime_read_chapters');
    const list = raw ? JSON.parse(raw) : [];
    const set = new Set(list);
    const key = String(chapterUrl).trim();
    if (!set.has(key)) {
      set.add(key);
      localStorage.setItem('yomori_lifetime_read_chapters', JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

// Calcula el total exacto de capítulos únicos leídos por el usuario (Anti-Trampas e Inmutable)
export function calculateTotalUniqueReadChapters(library = [], readChaptersMap = {}, history = []) {
  const readSet = new Set();

  // 1. Cargar del registro vitalicio inmutable anti-trampas
  try {
    const rawLifetime = localStorage.getItem('yomori_lifetime_read_chapters');
    if (rawLifetime) {
      const lifetimeList = JSON.parse(rawLifetime);
      if (Array.isArray(lifetimeList)) {
        lifetimeList.forEach(url => { if (url) readSet.add(url); });
      }
    }
  } catch (e) {}

  // 2. Desde readChaptersMap
  Object.keys(readChaptersMap || {}).forEach(url => {
    if (readChaptersMap[url]) readSet.add(url);
  });

  // 3. Desde los mangas de la biblioteca
  (library || []).forEach(manga => {
    (manga.readChapters || []).forEach(url => {
      if (url) readSet.add(url);
    });
  });

  // 4. Desde el historial si no estaban en el set
  (history || []).forEach(item => {
    if (item.url) readSet.add(item.url);
  });

  // 5. Persistir la unión completa en el registro vitalicio para blindar contra desmarques
  try {
    if (readSet.size > 0) {
      localStorage.setItem('yomori_lifetime_read_chapters', JSON.stringify(Array.from(readSet)));
    }
  } catch (e) {}

  return readSet.size;
}
