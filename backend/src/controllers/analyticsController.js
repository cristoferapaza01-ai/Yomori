import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const analyticsFile = path.join(dataDir, 'read_analytics.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function loadAnalytics() {
  try {
    if (fs.existsSync(analyticsFile)) {
      return JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
    }
  } catch (e) {
    console.warn('[Analytics] Error leyendo analytics:', e);
  }
  return {
    mangas: {}, // url/key -> { url, title, cover, scanSource, extensionId, totalReads, weeklyReads, lastReadAt }
    events: []  // recent log of reads
  };
}

export function saveAnalytics(data) {
  try {
    fs.writeFileSync(analyticsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[Analytics] Error guardando analytics:', e);
  }
}

/**
 * Registra un evento de lectura de capítulo
 * POST /api/analytics/track-read
 */
export const trackReadEvent = (req, res) => {
  try {
    const { mangaUrl, title, cover, scanSource, extensionId, chapterTitle, chapterUrl, userId, username } = req.body;
    if (!mangaUrl && !title) {
      return res.status(400).json({ success: false, message: 'mangaUrl o title requerido' });
    }

    const data = loadAnalytics();
    const key = (mangaUrl || title).trim().toLowerCase();
    const now = Date.now();

    if (!data.mangas[key]) {
      data.mangas[key] = {
        key,
        url: mangaUrl || '',
        title: title || 'Manga',
        cover: cover || '',
        scanSource: scanSource || 'Scan',
        extensionId: extensionId || '',
        totalReads: 0,
        weeklyReads: 0,
        firstReadAt: now,
        lastReadAt: now
      };
    }

    const entry = data.mangas[key];
    entry.totalReads = (entry.totalReads || 0) + 1;
    entry.weeklyReads = (entry.weeklyReads || 0) + 1;
    entry.lastReadAt = now;
    if (title && !entry.title) entry.title = title;
    if (cover) entry.cover = cover;
    if (scanSource) entry.scanSource = scanSource;
    if (extensionId) entry.extensionId = extensionId;

    // Log de evento reciente
    data.events.push({
      key,
      title: entry.title,
      chapterTitle: chapterTitle || '',
      userId: userId || 'anon',
      username: username || 'Lector',
      timestamp: now
    });

    // Mantener eventos recientes limitados a los últimos 500
    if (data.events.length > 500) {
      data.events = data.events.slice(-500);
    }

    saveAnalytics(data);

    return res.json({
      success: true,
      data: {
        totalReads: entry.totalReads,
        weeklyReads: entry.weeklyReads
      }
    });
  } catch (err) {
    console.error('[trackReadEvent Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Obtiene las obras más leídas por la comunidad (Semanal / Histórico)
 * GET /api/analytics/popular
 */
export const getPopularAnalytics = (req, res) => {
  try {
    const data = loadAnalytics();
    const list = Object.values(data.mangas || {});

    // Ordenar por lecturas semanales y totales
    const topPopular = list
      .sort((a, b) => (b.weeklyReads * 2 + b.totalReads) - (a.weeklyReads * 2 + a.totalReads))
      .slice(0, 20);

    return res.json({
      success: true,
      data: {
        popular: topPopular,
        totalTracked: list.length,
        totalEvents: data.events?.length || 0
      }
    });
  } catch (err) {
    console.error('[getPopularAnalytics Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
