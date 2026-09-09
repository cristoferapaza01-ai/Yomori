import { extensionLoader } from '../services/extensionLoader.js';
import { cacheService } from '../services/cacheService.js';
import { downloadService } from '../services/downloadService.js';
import * as cheerio from 'cheerio';

// Listar extensiones instaladas físicamente en el backend
export const getInstalledExtensions = (req, res) => {
  try {
    const installed = extensionLoader.getInstalledList();
    return res.json({ success: true, data: installed });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint para instalar/descargar el script .js desde el repositorio Keiyoushi
export const installExtension = async (req, res) => {
  try {
    const { id, name, version, scriptUrl, baseUrl, icon, lang } = req.body;
    if (!id || !scriptUrl) {
      return res.status(400).json({ success: false, message: 'Faltan id o scriptUrl' });
    }

    const meta = await extensionLoader.installExtension({
      id,
      name,
      version,
      scriptUrl,
      baseUrl,
      icon,
      lang
    });

    return res.json({
      success: true,
      message: `Extensión ${name || id} descargada e instalada en disco local.`,
      data: meta
    });
  } catch (err) {
    console.error('[Install Error]:', err);
    return res.status(500).json({
      success: false,
      message: `Fallo al descargar script de la extensión: ${err.message}`
    });
  }
};

// Desinstalar extensión de disco
export const uninstallExtension = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Falta id' });

    const result = await extensionLoader.uninstallExtension(id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Catálogo de mangas usando la extensión cargada dinámicamente con soporte de filtros
export const getCatalog = async (req, res) => {
  try {
    const extensionId = req.query.extensionId || req.query.extension || 'zonatmo';
    const { page = 1, query = '', type = '', status = '', genres = '', sort = 'popular' } = req.query;
    const filters = {
      query: query || '',
      type: type || '',
      status: status || '',
      sort: sort || 'popular',
      genres: Array.isArray(genres) ? genres : (genres ? String(genres).split(',').map(s => s.trim()).filter(Boolean) : [])
    };

    const cacheKey = `catalog_${extensionId}_p${page}_${JSON.stringify(filters)}`;

    const cached = cacheService.get(cacheKey);
    if (cached && cached.mangas && cached.mangas.length > 0) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    // Instanciar dinámicamente el módulo .js descargado
    const extension = await extensionLoader.getExtensionInstance(extensionId);
    console.log(`[API] Ejecutando getCatalog() en [${extension.name}] pág ${page} con filtros:`, filters);
    const catalogData = await extension.getCatalog(parseInt(page, 10), filters);

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const enrichedMangas = (catalogData.mangas || []).map(m => ({
      ...m,
      extensionId: extensionId,
      extension: extension.name,
      coverProxy: m.cover ? `${baseUrl}/api/proxy-image?url=${encodeURIComponent(m.cover)}&referer=${encodeURIComponent(extension.baseUrl)}` : ''
    }));

    const responsePayload = { ...catalogData, mangas: enrichedMangas };
    if (enrichedMangas.length > 0) {
      cacheService.set(cacheKey, responsePayload, 900);
    }

    return res.json({ success: true, fromCache: false, data: responsePayload });
  } catch (err) {
    console.error('[API Error] getCatalog:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Búsqueda en la extensión cargada dinámicamente con soporte de filtros
export const searchManga = async (req, res) => {
  try {
    const extensionId = req.query.extensionId || req.query.extension || 'zonatmo';
    const { query = '', page = 1, type = '', status = '', genres = '', sort = 'popular' } = req.query;
    const filters = {
      query: query || '',
      type: type || '',
      status: status || '',
      sort: sort || 'popular',
      genres: Array.isArray(genres) ? genres : (genres ? String(genres).split(',').map(s => s.trim()).filter(Boolean) : [])
    };

    const cacheKey = `search_${extensionId}_${(query || '').toLowerCase().trim()}_p${page}_${JSON.stringify(filters)}`;
    const cached = cacheService.get(cacheKey);
    if (cached && cached.mangas && cached.mangas.length > 0) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    const extension = await extensionLoader.getExtensionInstance(extensionId);
    console.log(`[API] Ejecutando search("${query}") en [${extension.name}] con filtros:`, filters);
    const searchResult = await extension.search(query, parseInt(page, 10), filters);

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const enrichedMangas = (searchResult.mangas || []).map(m => ({
      ...m,
      extensionId: extensionId,
      extension: extension.name,
      coverProxy: m.cover ? `${baseUrl}/api/proxy-image?url=${encodeURIComponent(m.cover)}&referer=${encodeURIComponent(extension.baseUrl)}` : ''
    }));

    const responsePayload = { ...searchResult, mangas: enrichedMangas };
    if (enrichedMangas.length > 0) {
      cacheService.set(cacheKey, responsePayload, 600);
    }

    return res.json({ success: true, fromCache: false, data: responsePayload });
  } catch (err) {
    console.error('[API Error] searchManga:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Autoresuelve URLs de capítulos o URLs relativas hacia la URL canónica de la serie/manga
async function resolveCanonicalMangaUrl(rawUrl, rawExtensionId) {
  let url = (rawUrl || '').trim();
  let extensionId = rawExtensionId || '';

  // 1. Detección precisa de extensión basada en dominio o ID
  if (url.includes('rncalation.online') || url.includes('rn-scanlation') || extensionId === 'rn-scanlation') {
    extensionId = 'rn-scanlation';
  } else if (url.includes('zonatmo') || url.includes('leercapitulo.com') || extensionId === 'zonatmo') {
    extensionId = 'zonatmo';
  } else if (url.includes('skymangas.com') || extensionId === 'skymangas') {
    extensionId = 'skymangas';
  } else if (url.includes('leemiau.com') || url.includes('miauscan') || extensionId === 'miauscan') {
    extensionId = 'miauscan';
  } else if (url.includes('manhwalatino.lat') || url.includes('manhwalatino.com') || extensionId === 'manhwalatino') {
    extensionId = 'manhwalatino';
  } else if (url.includes('mangadex.org') || extensionId === 'mangadex') {
    extensionId = 'mangadex';
  } else if (url.includes('plotwistscan.com') || url.includes('plotnofansub.com') || extensionId === 'plot-twist-no-fansub') {
    extensionId = 'plot-twist-no-fansub';
  } else if (url.includes('ikigai') || url.includes('gettocaboca') || url.includes('cmpunjabrashancard') || extensionId === 'ikigai-mnagas') {
    extensionId = 'ikigai-mnagas';
  } else if (url.includes('olympusxyz.com') || url.includes('olympus') || extensionId === 'olympus-scanlation') {
    extensionId = 'olympus-scanlation';
  } else if (!extensionId) {
    extensionId = 'olympus-scanlation';
  }

  // 2. Resolver URLs de capítulo hacia la serie principal para evitar errores de scrapers
  try {
    // SkyMangas: /leer/slug/num -> /manhua/slug
    if (url.includes('skymangas.com/leer/')) {
      const parts = url.split('skymangas.com/leer/')[1].split('/');
      if (parts[0]) url = `https://skymangas.com/manhua/${parts[0]}`;
    }
    // Olympus: /capitulo/123/comic-slug -> /series/comic-slug
    else if (url.includes('olympusxyz.com/capitulo/')) {
      const match = url.match(/capitulo\/\d+\/([^/?#]+)/);
      if (match) url = `https://olympusxyz.com/series/${match[1]}`;
    }
    // MangaDex: /chapter/UUID -> /title/MANGA_UUID
    else if (url.includes('mangadex.org/chapter/')) {
      const chId = url.split('mangadex.org/chapter/')[1].split('/')[0].split('?')[0];
      const chRes = await fetch(`https://api.mangadex.org/chapter/${chId}?includes[]=manga`, { signal: AbortSignal.timeout(5000) });
      if (chRes.ok) {
        const json = await chRes.json();
        const mId = json.data?.relationships?.find(r => r.type === 'manga')?.id;
        if (mId) url = `https://mangadex.org/title/${mId}`;
      }
    }
    // RN Scanlation: /leer/ID -> /comics/slug
    else if (url.includes('rncalation.online/leer/')) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/href="(\/comics\/[^"/?#]+)"/);
        if (match && !match[1].includes('random')) {
          url = `https://rncalation.online${match[1]}`;
        }
      }
    }
    // MiauScan / ManhwaLatino: /slug-capitulo-123/ -> /manga/slug/
    else if ((url.includes('leemiau.com') || url.includes('manhwalatino.lat')) && url.includes('-capitulo-')) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const seriesHref = $('.allc a, .breadcrumb a[href*="/manga/"], a.series-link, .ts-breadcrumb a').attr('href') ||
                           $('a[href*="/manga/"]').first().attr('href');
        if (seriesHref && seriesHref.startsWith('http')) {
          url = seriesHref;
        }
      }
    }
  } catch (err) {
    console.warn('[resolveCanonicalMangaUrl] Advertencia resolviendo URL canónica:', err.message);
  }

  return { url, extensionId };
}

// Escáner Universal de Respaldo directo en caso de que una extensión falle o devuelva datos incompletos
async function fallbackDirectScrapeDetails(url, extensionId) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Cookie': 'age_verified=1; is_adult=1; r18=1; adult=1'
      },
      signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    let title = $('h1.entry-title, .post-title, h1, .manga-title, meta[property="og:title"]').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') || '';
    title = title.replace(/\s*-\s*LeeMiau.*$/i, '').replace(/\s*-\s*ManhwaLatino.*$/i, '').replace(/\s*-\s*SkyMangas.*$/i, '').replace(/\s*-\s*Olympus.*$/i, '').replace(/\s*-\s*MangaDex.*$/i, '').trim();

    if (!title || title.length === 0) {
      const slug = decodeURIComponent(url).split('/').filter(Boolean).pop() || '';
      title = slug.replace(/^comic-|^manhua-|^manga-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    let cover = $('meta[property="og:image"]').attr('content') ||
                $('.thumb img, .poster img, .summary_image img, .wp-post-image, .comic-poster img').first().attr('src') ||
                $('.thumb img, .poster img').first().attr('data-src') || '';
    if (cover && cover.startsWith('/')) {
      const base = new URL(url).origin;
      cover = `${base}${cover}`;
    }

    let synopsis = $('.manga-excerpt, .description-summary, .entry-content, meta[property="og:description"]').first().text().trim().replace(/\s+/g, ' ') ||
                   'Sinopsis disponible en la web oficial.';

    const status = $('.status, .post-status, [class*="status"]').first().text().trim() || 'En emisión';

    const genres = [];
    $('.genres-content a, .mg_genres a, .genres a, .tags-content a, [class*="genre"] a').each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });
    if (genres.length === 0) genres.push('Manga', 'Acción');

    const chapters = [];
    const seen = new Set();
    $('a[href*="/leer/"], a[href*="/capitulo/"], a[href*="-capitulo-"], a[href*="/chapter/"], .clstyle a, #chapterlist a, .eplister a, ul.chapters a, .chapter-item a').each((_, a) => {
      const href = $(a).attr('href');
      if (!href || href === '#' || seen.has(href)) return;
      seen.add(href);
      const text = $(a).text().trim().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
      const numMatch = text.match(/Cap[^\d]*(\d+(\.\d+)?)/i) || href.match(/capitulo-(\d+(\.\d+)?)/i) || href.match(/(\d+(\.\d+)?)$/);
      const num = numMatch ? numMatch[1] : `${chapters.length + 1}`;
      const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;

      chapters.push({
        id: `fb-ch-${chapters.length + 1}`,
        name: text.startsWith('Cap') ? text : `Capítulo ${num}`,
        chapterNumber: String(num),
        url: fullUrl,
        date: 'Reciente',
        isLocked: false
      });
    });

    return {
      title,
      cover,
      synopsis,
      status,
      genres,
      chapters
    };
  } catch (err) {
    console.warn('[fallbackDirectScrapeDetails] Error en escáner universal:', err.message);
    return null;
  }
}

// Ficha de Manga con la extensión correspondiente y seguro contra caídas
export const getMangaDetails = async (req, res) => {
  try {
    let { url, extensionId } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'Falta url' });

    // 1. Autoresolver URL canónica y extensión correcta
    const resolved = await resolveCanonicalMangaUrl(url, extensionId);
    url = resolved.url;
    extensionId = resolved.extensionId;

    const cacheKey = `manga_${url}`;
    const cached = cacheService.get(cacheKey);
    if (cached && cached.chapters && cached.chapters.length > 0) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    let details = null;
    let extension = null;

    // 2. Intentar ejecutar el script local de la extensión
    try {
      extension = await extensionLoader.getExtensionInstance(extensionId);
      console.log(`[API] Ejecutando getMangaDetails() en script local de [${extension.name}] para: ${url}`);
      details = await extension.getMangaDetails(url);
    } catch (extErr) {
      console.warn(`[API Warning] Fallo en script de [${extensionId}], activando escáner directo universal:`, extErr.message);
    }

    // 3. Si la extensión falló o devolvió 0 capítulos, activar el Escáner Universal de Respaldo
    if (!details || !details.title || !details.chapters || details.chapters.length === 0) {
      const fallbackDetails = await fallbackDirectScrapeDetails(url, extensionId);
      if (fallbackDetails) {
        details = {
          ...(details || {}),
          ...fallbackDetails,
          chapters: (fallbackDetails.chapters && fallbackDetails.chapters.length > 0) ? fallbackDetails.chapters : (details?.chapters || [])
        };
      }
    }

    if (!details || !details.title) {
      throw new Error(`No se pudo obtener información del manga en ${url}`);
    }

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    // 4. Normalizar y blindar cada capítulo
    const normalizedChapters = (details.chapters || []).map((c, idx) => {
      let rawName = c.name || c.title || '';
      let chNum = c.chapterNumber || '';
      if (!chNum) {
        const numMatch = (rawName || c.url || '').match(/(\d+(\.\d+)?)/);
        chNum = numMatch ? numMatch[1] : String(idx + 1);
      }
      if (!rawName || rawName.includes('undefined') || rawName.trim().length === 0) {
        rawName = `Capítulo ${chNum}`;
      }
      const isDownloaded = downloadService.isChapterDownloaded(c.url);
      return {
        id: c.id || `ch-${idx}-${chNum}`,
        name: rawName.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(),
        chapterNumber: String(chNum),
        url: c.url,
        date: c.date || 'Reciente',
        isLocked: !!c.isLocked,
        lockedReason: c.lockedReason,
        isDownloaded
      };
    });

    const enrichedDetails = {
      ...details,
      extensionId: extensionId,
      extension: extension ? extension.name : extensionId,
      coverProxy: details.cover ? `${baseUrl}/api/proxy-image?url=${encodeURIComponent(details.cover)}&extensionId=${encodeURIComponent(extensionId)}` : '',
      chapters: normalizedChapters
    };

    if (enrichedDetails.chapters.length > 0) {
      cacheService.set(cacheKey, enrichedDetails, 1800);
    }

    return res.json({ success: true, fromCache: false, data: enrichedDetails });
  } catch (err) {
    console.error('[API Error] getMangaDetails:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Extracción de viñetas de capítulo (con soporte Offline Suwayomi)
export const extractChapter = async (req, res) => {
  try {
    const params = { ...(req.query || {}), ...(req.body || {}) };
    let { url, extensionId } = params;
    if (!url) return res.status(400).json({ success: false, message: 'Falta url' });

    // 0. Si el capítulo está descargado localmente en disco (Modo Offline Suwayomi)
    const downloadedChapter = downloadService.getDownloadedChapter(url);
    if (downloadedChapter) {
      console.log(`[API] ⚡ Sirviendo capítulo offline descargado en PC: ${url}`);
      return res.json({ success: true, fromCache: false, isOffline: true, data: downloadedChapter });
    }

    // Autodetección de extensión según el dominio si no coincide
    if (url.includes('rncalation.online') || url.includes('rn-scanlation')) {
      extensionId = 'rn-scanlation';
    } else if (url.includes('zonatmo') || url.includes('leercapitulo.com')) {
      extensionId = 'zonatmo';
    } else if (url.includes('skymangas.com')) {
      extensionId = 'skymangas';
    } else if (url.includes('leemiau.com') || url.includes('miauscan')) {
      extensionId = 'miauscan';
    } else if (url.includes('manhwalatino.lat')) {
      extensionId = 'manhwalatino';
    } else if (url.includes('mangadex.org')) {
      extensionId = 'mangadex';
    } else if (url.includes('plotwistscan.com') || url.includes('plotnofansub.com')) {
      extensionId = 'plot-twist-no-fansub';
    } else if (url.includes('ikigai') || url.includes('gettocaboca') || url.includes('cmpunjabrashancard')) {
      extensionId = 'ikigai-mnagas';
    } else if (url.includes('olympusxyz.com') || url.includes('olympus')) {
      extensionId = 'olympus-scanlation';
    } else if (!extensionId) {
      extensionId = 'zonatmo';
    }

    const cacheKey = `chapter_${url}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, fromCache: true, data: cached });

    const extension = await extensionLoader.getExtensionInstance(extensionId);
    console.log(`[API] Ejecutando extractChapter() en script local de [${extension.name}] para: ${url}`);
    const chapterData = await extension.extractChapter(url);

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const enrichedPages = (chapterData.pages || []).map(p => {
      if (typeof p === 'string') {
        return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(p)}&referer=${encodeURIComponent(extension.baseUrl)}`;
      }
      return p;
    });

    const result = {
      ...chapterData,
      extensionId: extensionId,
      extension: extension.name,
      pages: enrichedPages
    };

    cacheService.set(cacheKey, result, 3600);
    return res.json({ success: true, fromCache: false, data: result });
  } catch (err) {
    console.error('[API Error] extractChapter:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Función para normalizar títulos de mangas para deduplicación precisa
function normalizeMangaTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Jerarquía de calidad y completitud de fuentes
const SCAN_QUALITY_SCORE = {
  'olympus-scanlation': 100,
  'skymangas': 95,
  'miauscan': 90,
  'zonatmo': 90,
  'mangadex': 88,
  'plot-twist-no-fansub': 85,
'manhwalatino': 80,
  'ikigai-mnagas': 75,
  'rn-scanlation': 70
};

const ADULT_REGEX = /\b(erotic|erotico|erotica|eroticos|eroticas|erotismo|placer|masajista|celo|extasis|éxtasis|onahole|sin\s*censura|hacerlo|sexo|cama|sumis[ao]|tentaci[oó]n|esclav[ao]|profesora|desaloja\s*ya|favoritos\.zip|emborracharse|amante|vicio|fetiche|cuerpos?|desnud[ao]|taller\s*de\s*sonidos|18\+|r18|\+18|smut|hentai|ecchi|adult[os]*|mature|pornhwa|uncensored|seducci[oó]n|madrastra|suegra|cuñada|vecina|hermana\s*casera|guarida\s*del\s*tigre|aventura\s*con\s*mi\s*prometido|pervertid[ao]|pecaminoso|sensual|cl[ií]max|infiel|infidelidad|satisfacer\s*al\s*demonio|dosukebe|hokenshitsu|oyakodon|soushuuhen|doujinshi|yarenai|tentaculos?|tentáculos?|enchufare|enchufaré|animar\s*el\s*amor|cita\s*a\s*ciegas|nidito\s*de\s*amor|my\s*wife\s*gave\s*birth|oracion\s*secreta|oración\s*secreta|duque\s*ennegrecido|gata\s*rebelde|dueno\s*de\s*la\s*isla|dueño\s*de\s*la\s*isla|pagum|pueden\s*casarse\s*una\s*serpiente)\b/i;

const BL_REGEX = /\b(bl|boys\s*love|yaoi|shounen\s*ai|shonen\s*ai|danmei|omegaverse|alfa\s*dominante|\balfa\b|\bomega\b|taller\s*de\s*sonidos|compa[nñ]ero\s*perfecto|lluvia\s*de\s*verano|encontrarse\s*en\s*el\s*medio|en\s*una\s*correa|amor\s*de\s*chicos|bromance|teto\s*x\s*egen|serim|regla\s*de\s*hierro\s*de\s*serim)\b/i;

function checkIsAdult(title, genres = [], type = '') {
  const gStr = Array.isArray(genres) ? genres.join(' ') : '';
  const combined = `${title || ''} ${gStr} ${type || ''}`;
  return ADULT_REGEX.test(combined);
}

function checkIsBL(title, genres = [], type = '') {
  const gStr = Array.isArray(genres) ? genres.join(' ') : '';
  const combined = `${title || ''} ${gStr} ${type || ''}`;
  return BL_REGEX.test(combined);
}

// Funciones auxiliares para normalización de fechas y tiempos en vivo
function parseReleaseTimestamp(text, fallbackIndex = 0) {
  const now = Date.now();
  if (!text) return now - (fallbackIndex * 2 * 60 * 1000 + 5 * 60 * 1000);
  
  const lower = text.toLowerCase();
  if (lower.includes('segundo') || lower.includes('seg') || lower.includes('momento') || lower.includes('justo')) {
    return now - (30 * 1000 + fallbackIndex * 1000);
  }
  
  const minMatch = lower.match(/(\d+)\s*(?:minuto|min)/);
  if (minMatch) {
    return now - (parseInt(minMatch[1], 10) * 60 * 1000 + fallbackIndex * 1000);
  }
  
  const hourMatch = lower.match(/(\d+)\s*(?:hora|hr|h\b)/);
  if (hourMatch) {
    return now - (parseInt(hourMatch[1], 10) * 3600 * 1000 + fallbackIndex * 1000);
  }

  const weekMatch = lower.match(/(\d+)\s*(?:semana|sem|s\b)/);
  if (weekMatch) {
    return now - (parseInt(weekMatch[1], 10) * 7 * 86400 * 1000 + fallbackIndex * 1000);
  }
  
  const dayMatch = lower.match(/(\d+)\s*(?:día|dia|días|dias|d\b)/);
  if (dayMatch) {
    return now - (parseInt(dayMatch[1], 10) * 86400 * 1000 + fallbackIndex * 1000);
  }
  
  if (lower.includes('ayer')) {
    return now - (86400 * 1000 + fallbackIndex * 1000);
  }
  
  if (lower.includes('hoy') || lower.includes('reciente')) {
    return now - (15 * 60 * 1000 + fallbackIndex * 2 * 60 * 1000);
  }

  const parsed = Date.parse(text);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return now - (fallbackIndex * 3 * 60 * 1000 + 10 * 60 * 1000);
}

function formatReleaseTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}

// Feed en vivo para la pantalla de Inicio (Nuevos Lanzamientos, Rankings y Tendencias de Scans)
export const getHomeFeed = async (req, res) => {
  try {
    const cacheKey = 'home_feed_data_v6';
    const isForcedRefresh = req.query.refresh === 'true';
    const cached = isForcedRefresh ? null : cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const helperProxy = (url, referer = '') => {
      if (!url) return '';
      return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
    };

    const rawReleases = [];
    const topRankings = [];

    // Tareas paralelas de extracción en vivo para todos los scans instalados y compatibles
    const tasks = [
      // 1. OLYMPUS SCANLATION (🇰🇷 Manhwas en tiempo real + Rankings)
      (async () => {
        try {
          const olyRes = await fetch('https://olympusxyz.com/', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Referer': 'https://olympusxyz.com/'
            },
            signal: AbortSignal.timeout(9000)
          });
          if (olyRes.ok) {
            const html = await olyRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $("a[href*='/series/comic-']").each((i, el) => {
              const title = $(el).find('figcaption').text().trim() || $(el).attr('title') || $(el).text().trim().replace(/\s+/g, ' ');
              const url = 'https://olympusxyz.com' + $(el).attr('href');
              const parentCard = $(el).closest('figure, div.group, div.relative, div');
              const img = parentCard.find('img').attr('src') || parentCard.find('img').attr('data-src') || '';
              const chapterLinks = parentCard.find("a[href*='/capitulo/']");
              
              if (chapterLinks.length > 0 && title && !title.includes('Puesto')) {
                const firstCh = chapterLinks.first();
                const rawChText = firstCh.text().trim().replace(/\s+/g, ' ');
                const chHref = 'https://olympusxyz.com' + firstCh.attr('href');
                
                let timeText = 'Hace unos momentos';
                const timeMatch = rawChText.match(/hace\s+([^]+)/i);
                let cleanCh = rawChText;
                if (timeMatch) {
                  timeText = `hace ${timeMatch[1].trim()}`;
                  cleanCh = rawChText.replace(/hace\s+[^]+/i, '').trim();
                }

                const chNumMatch = cleanCh.match(/(\d+(\.\d+)?)/);
                const chNum = chNumMatch ? parseFloat(chNumMatch[1]) : 0;
                const publishedAt = parseReleaseTimestamp(timeText, orderIdx);
                orderIdx++;

                if (img && !rawReleases.some(r => r.url === url)) {
                  rawReleases.push({
                    id: `rel-oly-${rawReleases.length + 1}`,
                    title,
                    url,
                    cover: img,
                    coverProxy: helperProxy(img, 'https://olympusxyz.com'),
                    chapter: cleanCh || 'Nuevo Capítulo',
                    chapterNum: chNum,
                    type: 'Manhwa',
                    isAdult: checkIsAdult(title, [], 'Manhwa'),
                    isBL: checkIsBL(title, [], 'Manhwa'),
                    publishedAt,
                    time: formatReleaseTime(publishedAt),
                    chapterUrl: chHref,
                    scan: 'Olympus Scanlation',
                    extensionId: 'olympus-scanlation'
                  });
                }
              }
            });

            // Top rankings en vivo de Olympus
            $("a[href*='/series/comic-']").each((i, el) => {
              const text = $(el).text().trim().replace(/\s+/g, ' ');
              const match = text.match(/Puesto\s+(\d+)\s+([\d\.]+M?\s+vistas)?\s+(.+)/i);
              if (match) {
                const rank = parseInt(match[1], 10);
                const views = match[2] ? match[2].trim() : '';
                const title = match[3] ? match[3].trim() : '';
                const url = 'https://olympusxyz.com' + $(el).attr('href');
                const img = $(el).find('img').attr('src') || '';
                if (!topRankings.some(r => r.rank === rank)) {
                  topRankings.push({
                    rank,
                    title,
                    views: views || '1.5M lecturas',
                    url,
                    cover: img,
                    coverProxy: helperProxy(img, 'https://olympusxyz.com'),
                    rating: '9.9',
                    type: 'Manhwa',
                    isAdult: checkIsAdult(title, [], 'Manhwa'),
                    isBL: checkIsBL(title, [], 'Manhwa'),
                    scanSource: 'Olympus Scanlation',
                    extensionId: 'olympus-scanlation'
                  });
                }
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando Olympus:', err.message);
        }
      })(),

      // 2. MIAUSCAN (🐱 Manhwas y Webtoons recién actualizados de https://leemiau.com/manga/?order=update)
      (async () => {
        try {
          const miauRes = await fetch('https://leemiau.com/manga/?order=update', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://leemiau.com/'
            },
            signal: AbortSignal.timeout(9000)
          });
          if (miauRes.ok) {
            const html = await miauRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $('.bsx, .bs, article.bs').each((_, el) => {
              const a = $(el).find('a').first();
              const href = a.attr('href');
              if (!href) return;
              const title = $(el).find('.tt, .title, .entry-title, h4, h3').first().text().trim() || a.attr('title') || '';
              const img = $(el).find('img').first();
              let cover = img.attr('data-src') || img.attr('data-lazy-src') || img.attr('src') || '';
              if (cover && !cover.startsWith('http')) cover = `https://leemiau.com${cover.startsWith('/') ? '' : '/'}${cover}`;
              const ch = $(el).find('.epxs, .chapter').first().text().trim() || 'Nuevo Capítulo';
              const chNumMatch = ch.match(/(\d+(\.\d+)?)/);
              const chNum = chNumMatch ? parseFloat(chNumMatch[1]) : 0;
              const publishedAt = Date.now() - (orderIdx * 3 * 60 * 1000 + 10 * 60 * 1000);
              orderIdx++;

              if (title && href && cover && !rawReleases.some(r => r.url === href)) {
                rawReleases.push({
                  id: `rel-miau-${rawReleases.length + 1}`,
                  title,
                  url: href,
                  cover,
                  coverProxy: helperProxy(cover, 'https://leemiau.com'),
                  chapter: ch,
                  chapterNum: chNum,
                  type: 'Manhwa',
                  isAdult: checkIsAdult(title, [], 'Manhwa'),
                  isBL: checkIsBL(title, [], 'Manhwa'),
                  publishedAt,
                  time: formatReleaseTime(publishedAt),
                  chapterUrl: href,
                  scan: 'MiauScan',
                  extensionId: 'miauscan'
                });
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando MiauScan:', err.message);
        }
      })(),

      // 3. MANHWALATINO (🇰🇷 Manhwas/Webtoons desde https://manhwalatino.lat/manga/?order=update)
      (async () => {
        try {
          const mlRes = await fetch('https://manhwalatino.lat/manga/?order=update', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Referer': 'https://manhwalatino.lat/'
            },
            signal: AbortSignal.timeout(9000)
          });
          if (mlRes.ok) {
            const html = await mlRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $('.page-item-detail, .item, .bsx, article').slice(0, 20).each((i, el) => {
              let title = $(el).find('.post-title, .tt, h3, h4, a[title]').first().text().trim().replace(/\s+/g, ' ');
              // Limpiar prefijos de plantilla como "Color"
              title = title.replace(/^Color\s+/i, '').replace(/\s+Capítulo\s+\d+.*/i, '').replace(/\s+\d+\.\d+$/i, '').trim();
              
              const a = $(el).find('a').first();
              const url = a.attr('href') || '';
              const imgEl = $(el).find('img').first();
              const cover = imgEl.attr('data-src') || imgEl.attr('src') || '';
              const chEl = $(el).find('.chapter-item, .chapter, .epxs').first();
              const chText = chEl.text().trim().replace(/\s+/g, ' ');
              const chHref = chEl.find('a').attr('href') || url;
              const chNumMatch = chText.match(/(\d+(\.\d+)?)/);
              const chNum = chNumMatch ? parseFloat(chNumMatch[1]) : 0;
              const publishedAt = Date.now() - (orderIdx * 4 * 60 * 1000 + 15 * 60 * 1000);
              orderIdx++;

              const hasHot = $(el).find('.hotx, .hotjar, [class*="hot"], [class*="18"]').length > 0 || $(el).html().includes('hotx') || $(el).html().includes('hotjar');
              const isAdult = hasHot || checkIsAdult(title, [], 'Manhwa');

              if (title && url && cover && !rawReleases.some(r => r.url === url)) {
                rawReleases.push({
                  id: `rel-ml-${rawReleases.length + 1}`,
                  title,
                  url,
                  cover,
                  coverProxy: helperProxy(cover, 'https://manhwalatino.lat'),
                  chapter: chText || 'Nuevo Capítulo',
                  chapterNum: chNum,
                  type: 'Manhwa',
                  isAdult,
                  isBL: checkIsBL(title, [], 'Manhwa'),
                  publishedAt,
                  time: formatReleaseTime(publishedAt),
                  chapterUrl: chHref,
                  scan: 'ManhwaLatino',
                  extensionId: 'manhwalatino'
                });
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando ManhwaLatino:', err.message);
        }
      })(),

      // 4. MANGADEX (🇯🇵 Mangas en español en tiempo real con fecha exacta)
      (async () => {
        try {
          const mdUrl = 'https://api.mangadex.org/chapter?limit=50&translatedLanguage[]=es&translatedLanguage[]=es-la&order[readableAt]=desc&includes[]=manga&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic';
          const mdRes = await fetch(mdUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TachiyomiWeb/1.0' },
            signal: AbortSignal.timeout(9000)
          });
          if (mdRes.ok) {
            const mdData = await mdRes.json();
            const mangaIds = (mdData.data || []).map(ch => ch.relationships?.find(r => r.type === 'manga')?.id).filter(Boolean);
            const uniqueIds = [...new Set(mangaIds)];
            
            let coverMap = {};
            if (uniqueIds.length > 0) {
              const q = uniqueIds.slice(0, 50).map(id => `ids[]=${id}`).join('&');
              const mMetaRes = await fetch(`https://api.mangadex.org/manga?limit=100&${q}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TachiyomiWeb/1.0' },
                signal: AbortSignal.timeout(8000)
              });
              if (mMetaRes.ok) {
                const mMetaJson = await mMetaRes.json();
                for (const m of (mMetaJson.data || [])) {
                  const cRel = m.relationships?.find(r => r.type === 'cover_art');
                  if (cRel?.attributes?.fileName) {
                    coverMap[m.id] = `https://uploads.mangadex.org/covers/${m.id}/${cRel.attributes.fileName}.512.jpg`;
                  }
                }
              }
            }

            for (const ch of (mdData.data || [])) {
              const mangaRel = ch.relationships?.find(r => r.type === 'manga');
              if (!mangaRel) continue;
              const mangaTitle = mangaRel.attributes?.title?.en || mangaRel.attributes?.title?.['es'] || mangaRel.attributes?.title?.['es-la'] || Object.values(mangaRel.attributes?.title || {})[0] || 'Manga';
              const chNum = parseFloat(ch.attributes?.chapter) || 0;
              const chName = ch.attributes?.chapter ? `Capítulo ${ch.attributes.chapter}` : (ch.attributes?.title ? `Cap. ${ch.attributes.title}` : 'Nuevo Capítulo');
              const groupRel = ch.relationships?.find(r => r.type === 'scanlation_group');
              const groupName = groupRel?.attributes?.name || 'MangaDex';
              
              const pubDate = new Date(ch.attributes?.readableAt || ch.attributes?.publishAt || Date.now());
              const publishedAt = pubDate.getTime();
              const mangaId = mangaRel.id;
              const coverUrl = coverMap[mangaId] || `https://uploads.mangadex.org/covers/${mangaId}/cover.512.jpg`;
              const url = `https://mangadex.org/title/${mangaId}`;

              if (mangaTitle) {
                rawReleases.push({
                  id: `rel-md-${rawReleases.length + 1}`,
                  title: mangaTitle,
                  url,
                  cover: coverUrl,
                  coverProxy: helperProxy(coverUrl, 'https://mangadex.org'),
                  chapter: chName,
                  chapterNum: chNum,
                  type: 'Manga',
                  isAdult: checkIsAdult(mangaTitle, [], 'Manga'),
                  isBL: checkIsBL(mangaTitle, [], 'Manga'),
                  publishedAt,
                  time: formatReleaseTime(publishedAt),
                  chapterUrl: `https://mangadex.org/chapter/${ch.id}`,
                  scan: `MangaDex (${groupName})`,
                  extensionId: 'mangadex'
                });
              }
            }
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando MangaDex:', err.message);
        }
      })(),

      // 5. SKYMANGAS (🇨🇳 Manhuas & Mangas - Integrado cronológicamente según antigüedad real)
      (async () => {
        try {
          const skyRes = await fetch('https://skymangas.com/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(9000)
          });
          if (skyRes.ok) {
            const html = await skyRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $("a[href*='/manhua/'], a[href*='/manga/']").each((i, el) => {
              const href = $(el).attr('href') || '';
              if (!href.startsWith('https://skymangas.com/manhua/') && !href.startsWith('/manhua/') &&
                  !href.startsWith('https://skymangas.com/manga/') && !href.startsWith('/manga/')) return;

              const fullUrl = href.startsWith('http') ? href : 'https://skymangas.com' + href;
              const rawText = $(el).text().trim().replace(/\s+/g, ' ');
              if (!rawText || rawText.includes('Inicio') || rawText.includes('Biblioteca')) return;

              const capMatch = rawText.match(/Cap\.?\s*(\d+(\.\d+)?)/i);
              const title = rawText.replace(/^\d+(\.\d+)?\s*/, '').replace(/Cap\.?\s*\d+.*/i, '').trim();
              const chapter = capMatch ? `Capítulo ${capMatch[1]}` : 'Nuevo Capítulo';
              const chNum = capMatch ? parseFloat(capMatch[1]) : 0;
              const slug = fullUrl.replace(/\/+$/, '').split('/').pop();
              const img = `https://api.skymangas.com/uploads/covers/${slug}/${slug}_cover.webp`;
              const isManhua = fullUrl.includes('/manhua/');
              
              // SkyMangas los últimos capítulos fueron subidos hace ~2 días (queda ordenado según su tiempo real)
              const publishedAt = Date.now() - (2 * 86400 * 1000 + orderIdx * 10 * 60 * 1000);
              orderIdx++;

              if (title && !rawReleases.some(item => item.url === fullUrl)) {
                rawReleases.push({
                  id: `rel-sky-${rawReleases.length + 1}`,
                  title,
                  url: fullUrl,
                  cover: img,
                  coverProxy: helperProxy(img, 'https://skymangas.com'),
                  chapter,
                  chapterNum: chNum,
                  type: isManhua ? 'Manhua' : 'Manga',
                  isAdult: checkIsAdult(title, [], isManhua ? 'Manhua' : 'Manga'),
                  isBL: checkIsBL(title, [], isManhua ? 'Manhua' : 'Manga'),
                  publishedAt,
                  time: formatReleaseTime(publishedAt),
                  chapterUrl: fullUrl,
                  scan: 'SkyMangas',
                  extensionId: 'skymangas'
                });
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando SkyMangas:', err.message);
        }
      })(),

      // 6. ZONATMO / LEERCAPITULO (Obras populares y lanzamientos)
      (async () => {
        try {
          const tmoRes = await fetch('https://leercapitulo.com/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(9000)
          });
          if (tmoRes.ok) {
            const html = await tmoRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $("a[href*='/manga/']").slice(0, 20).each((i, el) => {
              const href = $(el).attr('href') || '';
              const fullUrl = href.startsWith('http') ? href : 'https://leercapitulo.com' + href;
              const title = $(el).text().trim().replace(/\s+/g, ' ');
              
              if (title && title.length > 2 && fullUrl.includes('/manga/')) {
                const parentCard = $(el).closest('.media, .col-6, .col-sm-4, .item, tr, div');
                const img = parentCard.find('img').attr('src') || parentCard.find('img').attr('data-src') || '';
                const chEl = parentCard.find("a[href*='/leer/']").first();
                const chText = chEl.text().trim().replace(/\s+/g, ' ');
                const capMatch = chText.match(/(\d+(\.\d+)?)/);
                const chNum = capMatch ? parseFloat(capMatch[1]) : 0;
                const coverUrl = img.startsWith('http') ? img : (img ? 'https://leercapitulo.com' + img : '');

                const isManhua = title.toLowerCase().includes('nivel') || title.toLowerCase().includes('dios') || title.toLowerCase().includes('discipulo') || title.toLowerCase().includes('cultiv');
                const publishedAt = Date.now() - (orderIdx * 5 * 60 * 1000 + 45 * 60 * 1000);
                orderIdx++;

                if (coverUrl && !rawReleases.some(item => item.url === fullUrl)) {
                  rawReleases.push({
                    id: `rel-tmo-${rawReleases.length + 1}`,
                    title,
                    url: fullUrl,
                    cover: coverUrl,
                    coverProxy: helperProxy(coverUrl, 'https://leercapitulo.com'),
                    chapter: chText || 'Capítulo Reciente',
                    chapterNum: chNum,
                    type: isManhua ? 'Manhua' : 'Manga',
                    isAdult: checkIsAdult(title, [], isManhua ? 'Manhua' : 'Manga'),
                    isBL: checkIsBL(title, [], isManhua ? 'Manhua' : 'Manga'),
                    publishedAt,
                    time: formatReleaseTime(publishedAt),
                    chapterUrl: fullUrl,
                    scan: 'ZonaTMO',
                    extensionId: 'zonatmo'
                  });
                }
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando ZonaTMO:', err.message);
        }
      })(),

      // 7. RN SCANLATION (🇰🇷 Manhwas/Webtoons desde https://rncalation.online/library)
      (async () => {
        try {
          const rnRes = await fetch('https://rncalation.online/library', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://rncalation.online/',
              'Cookie': 'age_verified=1; is_adult=1; r18=1; adult=1'
            },
            signal: AbortSignal.timeout(8000)
          });
          if (rnRes.ok) {
            const html = await rnRes.text();
            const $ = cheerio.load(html);
            let orderIdx = 0;

            $('a[href*="/comics/"]').slice(0, 15).each((i, el) => {
              const href = $(el).attr('href');
              if (!href || href === '/comics/random') return;
              const fullUrl = href.startsWith('http') ? href : `https://rncalation.online${href}`;
              const imgEl = $(el).find('img').first();
              const title = $(el).find('p.line-clamp-2, .title, h2, h3, h4').first().text().trim() || imgEl.attr('alt') || '';
              let cover = imgEl.attr('src') || imgEl.attr('data-src') || '';
              if (cover && !cover.startsWith('http')) cover = `https://rncalation.online${cover.startsWith('/') ? '' : '/'}${cover}`;
              const ch = $(el).find('.chapter, [class*="ep"], [class*="ch"]').first().text().trim() || 'Nuevo Capítulo';
              const chNumMatch = ch.match(/(\d+(\.\d+)?)/);
              const chNum = chNumMatch ? parseFloat(chNumMatch[1]) : 0;
              const publishedAt = Date.now() - (orderIdx * 5 * 60 * 1000 + 35 * 60 * 1000);
              orderIdx++;

              const hasBlur = $(el).find('[class*="blur"]').length > 0 || $(el).html().includes('blur-') || $(el).html().includes('saturate-') || fullUrl.includes('oyaoyakodon') || fullUrl.includes('soushuuhen') || fullUrl.includes('jiraikei');
              const isAdult = hasBlur || checkIsAdult(title, [], 'Manhwa');

              if (title && cover && !rawReleases.some(r => r.url === fullUrl)) {
                rawReleases.push({
                  id: `rel-rn-${rawReleases.length + 1}`,
                  title,
                  url: fullUrl,
                  cover,
                  coverProxy: helperProxy(cover, 'https://rncalation.online'),
                  chapter: ch,
                  chapterNum: chNum,
                  type: 'Manhwa',
                  isAdult,
                  isBL: checkIsBL(title, [], 'Manhwa'),
                  publishedAt,
                  time: formatReleaseTime(publishedAt),
                  chapterUrl: fullUrl,
                  scan: 'RN Scanlation',
                  extensionId: 'rn-scanlation'
                });
              }
            });
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando RN Scanlation:', err.message);
        }
      })()
    ];

    await Promise.allSettled(tasks);

    // 8. MOTOR DE DESEMPATE Y DEDUPLICACIÓN INTELIGENTE
    // Si la misma obra aparece en múltiples scans, selecciona la versión con capítulo superior o mejor calidad
    const bestByTitle = new Map();

    for (const cand of rawReleases) {
      const key = normalizeMangaTitle(cand.title);
      if (!key) continue;

      if (!bestByTitle.has(key)) {
        bestByTitle.set(key, cand);
      } else {
        const existing = bestByTitle.get(key);
        // Criterio 1: Número de capítulo más avanzado
        if ((cand.chapterNum || 0) > (existing.chapterNum || 0)) {
          bestByTitle.set(key, cand);
        } 
        // Criterio 2: Si tienen el mismo capítulo, desempata por calidad/velocidad del scan o fecha más reciente
        else if ((cand.chapterNum || 0) === (existing.chapterNum || 0)) {
          const scoreCand = SCAN_QUALITY_SCORE[cand.extensionId] || 50;
          const scoreExisting = SCAN_QUALITY_SCORE[existing.extensionId] || 50;
          if (scoreCand > scoreExisting || (cand.publishedAt > existing.publishedAt && scoreCand === scoreExisting)) {
            bestByTitle.set(key, cand);
          }
        }
      }
    }

    // 9. ORDENAMIENTO CRONOLÓGICO ESTRICTO: Primero el más reciente y sucesivamente
    const sortedReleases = Array.from(bestByTitle.values())
      .sort((a, b) => b.publishedAt - a.publishedAt);

    // Actualizar los strings relativos de tiempo para máxima frescura
    for (const r of sortedReleases) {
      r.time = formatReleaseTime(r.publishedAt);
    }

    const payload = {
      latestReleases: sortedReleases.slice(0, 45),
      topRankings: topRankings.slice(0, 10),
      timestamp: Date.now()
    };

    if (sortedReleases.length > 0) {
      cacheService.set(cacheKey, payload, 60); // 1 minuto de caché para máxima frescura en vivo
    }

    return res.json({ success: true, fromCache: false, data: payload });
  } catch (err) {
    console.error('[HomeFeed Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const getCacheStats = (req, res) => {
  res.json({ success: true, stats: cacheService.getStats() });
};

export const clearCache = (req, res) => {
  cacheService.clear();
  extensionLoader.loadedInstances.clear();
  res.json({ success: true, message: 'Caché e instancias de extensiones vaciadas exitosamente' });
};
