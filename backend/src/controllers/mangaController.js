import { extensionLoader } from '../services/extensionLoader.js';
import { cacheService } from '../services/cacheService.js';
import { downloadService } from '../services/downloadService.js';
import { mangaIdentifier } from '../services/mangaIdentifierService.js';
import { loadAnalytics } from './analyticsController.js';
import * as cheerio from 'cheerio';
import axios from 'axios';

// Listar extensiones instaladas físicamente en el backend
export const getInstalledExtensions = (req, res) => {
  try {
    const installed = extensionLoader.getInstalledList();
    return res.json({ success: true, data: installed });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint del Repositorio Central de Extensiones (Manga & Anime)
export const getRepoExtensions = (req, res) => {
  try {
    const type = req.query.type || null;
    const list = extensionLoader.getAvailableExtensions(type);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Resolutor Universal Multi-Estrategia de Repositorios (JSON, Mihon/Aniyomi, GitHub Source Trees)
export const resolveRepoUrl = async (req, res) => {
  try {
    const { url, type } = req.query;
    if (!url) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const cleanUrl = url.trim();
    const candidateUrls = [cleanUrl];
    if (!cleanUrl.endsWith('.json')) {
      const base = cleanUrl.replace(/\/$/, '');
      candidateUrls.push(`${base}/index.min.json`);
      candidateUrls.push(`${base}/index.json`);
      candidateUrls.push(`${base}/repo/index.min.json`);
      candidateUrls.push(`${base}/repo/index.json`);
    }

    let fetchedData = null;
    let repoName = 'Repositorio';

    // Estrategia 1 & 2: Descarga directa y endpoints estándar de repos
    for (const u of candidateUrls) {
      try {
        const response = await axios.get(u, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 6000
        });
        if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
          fetchedData = response.data;
          break;
        }
      } catch (e) {}
    }

    // Estrategia 3: Si es un repositorio de código fuente de GitHub (formato Aniyomi/Tachiyomi con src/es/...)
    if (!fetchedData) {
      const ghMatch = cleanUrl.match(/(?:github\.com|raw\.githubusercontent\.com)\/([^\/]+)\/([^\/]+)/i);
      if (ghMatch) {
        const owner = ghMatch[1];
        const repo = ghMatch[2].replace(/\.git$/, '');
        repoName = `${owner}/${repo}`;

        const ghHeaders = { 'User-Agent': 'Yomori-App/1.0' };
        const discoveredDirs = [];

        // 1. Probar en src/es
        try {
          const esRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/src/es`, {
            headers: ghHeaders,
            timeout: 6000
          });
          if (Array.isArray(esRes.data)) discoveredDirs.push(...esRes.data);
        } catch (e) {}

        // 2. Probar en src (otros idiomas o carpetas directas)
        if (discoveredDirs.length === 0) {
          try {
            const srcRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/src`, {
              headers: ghHeaders,
              timeout: 6000
            });
            if (Array.isArray(srcRes.data)) {
              for (const item of srcRes.data) {
                if (item.type === 'dir') {
                  try {
                    const subRes = await axios.get(item.url, { headers: ghHeaders, timeout: 5000 });
                    if (Array.isArray(subRes.data)) discoveredDirs.push(...subRes.data);
                  } catch (e) {
                    discoveredDirs.push(item);
                  }
                }
              }
            }
          } catch (e) {}
        }

        if (discoveredDirs.length > 0) {
          const builtins = extensionLoader.getAvailableExtensions();
          const items = [];

          for (const d of discoveredDirs) {
            if (d.type !== 'dir') continue;
            const normKey = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normKey === 'animeflv') continue; // Excluir AnimeFLV

            // Buscar coincidencia en extensiones preinstaladas / conocidas
            const matched = builtins.find(b => {
              const bKey = b.id.toLowerCase().replace(/[^a-z0-9]/g, '');
              const bNameKey = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return bKey.includes(normKey) || normKey.includes(bKey) || bNameKey.includes(normKey) || normKey.includes(bNameKey);
            });

            if (matched) {
              items.push({
                ...matched,
                repoName: repoName
              });
            } else {
              const cleanTitle = d.name.charAt(0).toUpperCase() + d.name.slice(1);
              items.push({
                id: d.name.toLowerCase().endsWith('-es') ? d.name.toLowerCase() : `${d.name.toLowerCase()}-es`,
                name: cleanTitle,
                version: '1.2.0',
                lang: 'es',
                type: type || 'anime',
                baseUrl: `https://${d.name}.com`,
                icon: `https://${d.name}.com/favicon.ico`,
                description: `Extensión de ${cleanTitle} desde ${repoName}`,
                repoName: repoName
              });
            }
          }

          fetchedData = items;
        }
      }
    }

    if (!fetchedData) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Normalizar la lista de extensiones
    let rawList = [];
    if (Array.isArray(fetchedData)) {
      rawList = fetchedData;
    } else if (fetchedData && typeof fetchedData === 'object') {
      if (Array.isArray(fetchedData.extensions)) rawList = fetchedData.extensions;
      else if (Array.isArray(fetchedData.data)) rawList = fetchedData.data;
      else if (Array.isArray(fetchedData.sources)) rawList = fetchedData.sources;
      else rawList = Object.values(fetchedData).filter(v => typeof v === 'object');
    }

    const normalized = [];
    const builtins = extensionLoader.getAvailableExtensions();

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;

      if (Array.isArray(item.sources) && item.sources.length > 0) {
        for (const src of item.sources) {
          const sName = src.name || item.name || '';
          const sId = String(src.id || sName).toLowerCase().replace(/[^a-z0-9]/g, '-');
          if (sId.includes('animeflv') || sName.toLowerCase().includes('animeflv')) continue;

          const matched = builtins.find(b => b.id === sId || b.name.toLowerCase() === sName.toLowerCase());

          normalized.push({
            id: matched ? matched.id : sId,
            name: matched ? matched.name : (sName || sId),
            version: item.version || (matched ? matched.version : '1.2.0'),
            lang: src.lang || item.lang || (matched ? matched.lang : 'es'),
            baseUrl: matched ? matched.baseUrl : (src.baseUrl || item.baseUrl || ''),
            icon: matched ? matched.icon : (item.icon || (src.baseUrl ? `${src.baseUrl}/favicon.ico` : '')),
            type: matched ? matched.type : (item.type || type || 'anime'),
            scriptUrl: item.scriptUrl || item.apk || item.url || '',
            description: matched ? matched.description : (item.description || `Fuente: ${sName}`),
            repoName: repoName || item.repoName || 'Repositorio'
          });
        }
      } else {
        const extId = (item.id || item.pkg || item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const extName = item.name || extId;
        if (extId.includes('animeflv') || extName.toLowerCase().includes('animeflv')) continue;

        const matched = builtins.find(b => b.id === extId || b.id.replace(/-es$/, '') === extId || b.name.toLowerCase() === extName.toLowerCase());

        normalized.push({
          id: matched ? matched.id : extId,
          name: matched ? matched.name : extName,
          version: item.version || (matched ? matched.version : '1.2.0'),
          lang: item.lang || (matched ? matched.lang : 'es'),
          baseUrl: matched ? matched.baseUrl : (item.baseUrl || ''),
          icon: matched ? matched.icon : (item.icon || (item.baseUrl ? `${item.baseUrl}/favicon.ico` : '')),
          type: matched ? matched.type : (item.type || type || 'anime'),
          scriptUrl: item.scriptUrl || item.apk || item.url || '',
          description: matched ? matched.description : (item.description || `Extensión: ${extName}`),
          repoName: repoName || item.repoName || 'Repositorio'
        });
      }
    }

    // Filtrar duplicados
    const unique = [];
    const seen = new Set();
    for (const ext of normalized) {
      if (ext && ext.id && !seen.has(ext.id)) {
        seen.add(ext.id);
        unique.push(ext);
      }
    }

    return res.json({
      success: true,
      count: unique.length,
      data: unique
    });
  } catch (err) {
    console.error('[resolveRepoUrl Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
};

// Endpoint para instalar/descargar el script .js desde el repositorio Keiyoushi o local
export const installExtension = async (req, res) => {
  try {
    const { id, name, version, scriptUrl, baseUrl, icon, lang, type } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Falta id' });
    }

    const meta = await extensionLoader.installExtension({
      id,
      name,
      version,
      scriptUrl,
      baseUrl,
      icon,
      lang,
      type
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

    const rawList = (catalogData && (catalogData.mangas || catalogData.animes)) || [];
    const enrichedItems = rawList.map(m => ({
      ...m,
      extensionId: extensionId,
      extension: extension.name,
      coverProxy: m.cover ? `${baseUrl}/api/proxy-image?url=${encodeURIComponent(m.cover)}&referer=${encodeURIComponent(extension.baseUrl)}` : ''
    }));

    const responsePayload = { ...catalogData, mangas: enrichedItems, animes: enrichedItems };
    if (enrichedItems.length > 0) {
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
    if (cached && (cached.mangas?.length > 0 || cached.animes?.length > 0)) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    const extension = await extensionLoader.getExtensionInstance(extensionId);
    console.log(`[API] Ejecutando search("${query}") en [${extension.name}] con filtros:`, filters);
    const searchResult = await extension.search(query, parseInt(page, 10), filters);

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const rawList = (searchResult && (searchResult.mangas || searchResult.animes)) || [];
    const enrichedItems = rawList.map(m => ({
      ...m,
      extensionId: extensionId,
      extension: extension.name,
      coverProxy: m.cover ? `${baseUrl}/api/proxy-image?url=${encodeURIComponent(m.cover)}&referer=${encodeURIComponent(extension.baseUrl)}` : ''
    }));

    const responsePayload = { ...searchResult, mangas: enrichedItems, animes: enrichedItems };
    if (enrichedItems.length > 0) {
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

    const cacheKey = `manga_${url}_${extensionId}`;
    const cached = cacheService.get(cacheKey);
    if (cached && cached.chapters && cached.chapters.length > 0) {
      return res.json({ success: true, fromCache: true, data: cached });
    }

    let details = null;
    let extension = null;

    // 2. Intentar ejecutar el script local de la extensión
    try {
      extension = await extensionLoader.getExtensionInstance(extensionId);
      console.log(`[API] Ejecutando getMangaDetails/getAnimeDetails en script local de [${extension.name}] para: ${url}`);
      if (typeof extension.getAnimeDetails === 'function' || extension.type === 'anime') {
        details = await extension.getAnimeDetails(url);
        if (details && details.episodes) {
          details.chapters = (details.episodes || []).map((ep, idx) => ({
            id: ep.id || `ep-${idx + 1}`,
            name: ep.name || `Episodio ${ep.number || idx + 1}`,
            chapterNumber: String(ep.number || idx + 1),
            url: ep.url,
            date: ep.date || 'Reciente',
            isAnime: true
          }));
          details.isAnime = true;
          details.type = 'anime';
        }
      } else if (typeof extension.getMangaDetails === 'function') {
        details = await extension.getMangaDetails(url);
      }
    } catch (extErr) {
      console.warn(`[API Warning] Fallo en script de [${extensionId}], activando escáner directo universal:`, extErr.message);
    }

    // 2.1. Si es Olympus y devolvió 0 capítulos o falló, buscar en la biblioteca completa de Olympus para resolver el slug activo
    if ((!details || !details.chapters || details.chapters.length === 0) && (url.includes('olympus') || extensionId === 'olympus-scanlation')) {
      try {
        const olyExt = await extensionLoader.getExtensionInstance('olympus-scanlation');
        const allOly = await olyExt._fetchFullLibrary();
        const rawSlug = url.replace(/\/+$/, '').split('/series/').pop().replace(/^comic-/, '');
        const baseQuery = rawSlug.split('-202')[0].replace(/-\d{8}.*$/, '').toLowerCase().replace(/[-_]/g, ' ');
        const matchedOly = allOly.find(m => {
          const mSlug = (m.slug || '').toLowerCase().replace(/[-_]/g, ' ');
          const mTitle = (m.title || '').toLowerCase();
          return mSlug.includes(baseQuery) || baseQuery.includes(mSlug.split(' 202')[0]) || mTitle.includes(baseQuery);
        });
        if (matchedOly && matchedOly.url && matchedOly.url !== url) {
          console.log(`[Olympus Auto-Resolve] Redirigiendo slug viejo "${rawSlug}" -> "${matchedOly.slug}"`);
          url = matchedOly.url;
          details = await olyExt.getMangaDetails(url);
          if (details && details.chapters && details.chapters.length > 0) {
            extension = olyExt;
            extensionId = 'olympus-scanlation';
          }
        }
      } catch (e) {
        console.warn('[Olympus Auto-Resolve Error]:', e.message);
      }
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

    // 3.1. Si sigue teniendo 0 capítulos y el título no es un UUID, buscar en los demás scans instalados por título
    if ((!details?.chapters || details.chapters.length === 0) && details?.title && !/^[0-9a-fA-F-]{32,}$/.test(details.title)) {
      try {
        const installed = extensionLoader.getInstalledList();
        for (const extMeta of installed) {
          if (extMeta.id === extensionId) continue;
          try {
            const altExt = await extensionLoader.getExtensionInstance(extMeta.id);
            const searchResults = await altExt.search(details.title);
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              const bestMatch = searchResults[0];
              console.log(`[Cross-Scan Fallback] Encontrado "${details.title}" en [${extMeta.name}]: ${bestMatch.url}`);
              const altDetails = await altExt.getMangaDetails(bestMatch.url);
              if (altDetails?.chapters && altDetails.chapters.length > 0) {
                details = {
                  ...details,
                  ...altDetails,
                  title: details.title,
                  extensionId: extMeta.id,
                  extension: extMeta.name
                };
                extensionId = extMeta.id;
                extension = altExt;
                break;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    // 3.2. Proteger contra títulos que sean meros UUIDs
    if (!details || !details.title || /^[0-9a-fA-F-]{32,}$/.test(details.title)) {
      const slug = decodeURIComponent(url).split('/').filter(Boolean).pop() || 'manga';
      let cleanTitle = slug.replace(/^comic-|^manhua-|^manga-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (/^[0-9a-fA-F-]{32,}$/.test(cleanTitle) || (cleanTitle.length > 30 && /^[0-9a-fA-F\s-]+$/.test(cleanTitle))) {
        cleanTitle = 'Manga Destacado';
      }
      details = {
        title: cleanTitle || 'Manga',
        cover: details?.cover || '',
        synopsis: details?.synopsis || 'Información disponible en el scan origen.',
        status: details?.status || 'En emisión',
        genres: details?.genres || ['Manga'],
        chapters: details?.chapters || []
      };
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
    } else if (url.includes('animeflv.net')) {
      extensionId = 'animeflv-es';
    } else if (url.includes('jkanime.net')) {
      extensionId = 'jkanime-es';
    } else if (url.includes('animefenix.tv')) {
      extensionId = 'animefenix-es';
    } else if (url.includes('tioanime.com')) {
      extensionId = 'tioanime-es';
    } else if (url.includes('monoschinos2.net')) {
      extensionId = 'monoschinos-es';
    } else if (url.includes('animeonline.ninja')) {
      extensionId = 'animeonlineninja-es';
    } else if (url.includes('animeav1.com')) {
      extensionId = 'animeav1-es';
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
    console.log(`[API] Ejecutando extractChapter/getVideoServers en script local de [${extension.name}] para: ${url}`);

    if (typeof extension.getVideoServers === 'function' || extension.type === 'anime') {
      const videoServers = await extension.getVideoServers(url);
      let epNum = '';
      const numMatch = url.match(/\/(\d+(\.\d+)?)\/?$/) || url.match(/episodio-(\d+)/i) || url.match(/capitulo-(\d+)/i) || url.match(/-(\d+)$/);
      if (numMatch) epNum = numMatch[1];
      const epTitle = epNum ? `Episodio ${epNum}` : 'Episodio';

      const result = {
        isAnime: true,
        extensionId: extensionId,
        extension: extension.name,
        currentUrl: url,
        chapterTitle: epTitle,
        episodeNumber: epNum || '1',
        videos: videoServers || [],
        pages: []
      };
      cacheService.set(cacheKey, result, 1800);
      return res.json({ success: true, fromCache: false, data: result });
    }

    const chapterData = await extension.extractChapter(url);

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;

    const enrichedPages = (chapterData.pages || []).map((p, idx) => {
      const rawUrl = typeof p === 'string' ? p : (p.url || p.originalUrl || '');
      const proxyUrl = `${baseUrl}/api/proxy-image?url=${encodeURIComponent(rawUrl)}&referer=${encodeURIComponent(extension.baseUrl)}`;
      return {
        index: (typeof p === 'object' && p.index) ? p.index : (idx + 1),
        url: rawUrl,
        originalUrl: rawUrl,
        proxyUrl: proxyUrl,
        isOffline: (typeof p === 'object' && p.isOffline) || false,
        localUrl: (typeof p === 'object' && p.localUrl) || ''
      };
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

// Función para limpiar títulos con números inyectados o basura de scraping (Olympus, etc.)
function cleanMangaTitle(raw) {
  if (!raw) return '';
  return raw
    .replace(/\b\d{3,}\b/g, '')         // elimina números largos sueltos (ej: 13424, 225)
    .replace(/([A-Za-zÁ-ú])\d+/g, '$1')  // elimina dígitos pegados al final de palabras (ej: Hijo20 → Hijo)
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para normalizar títulos de mangas para deduplicación precisa
function normalizeMangaTitle(title) {
  if (!title) return '';
  return cleanMangaTitle(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// JERARQUÍA DE PRIORIDAD DE SCANS
// Regla general de desempate: si dos scans tienen el mismo manga...
//   - Si la diferencia de capítulos es > 2  → siempre gana el que tenga más caps (tiene contenido nuevo real)
//   - Si la diferencia de capítulos es ≤ 2  → gana el de mayor score (más confiable/completo)
// Olympus: mejor calidad visual, traducciones propias, el preferido.
// RN Scanlation: activo, variado, bastante fiable.
// ZonaTMO / SkyMangas: buenos scans alternativos.
// MangaDex: fuente oficial global, varía por grupo traductor.
const SCAN_QUALITY_SCORE = {
  'olympus-scanlation':    100,  // 🥇 Prioritario absoluto - mayor calidad visual y traducciones propias
  'rn-scanlation':          90,  // 🥈 Activo y variado, bastante fiable
  'zonatmo':                85,  // 🥉 Buen scan alternativo
  'skymangas':              80,  // Cobertura amplia
  'mangadex':               80,  // Fuente global
  'plot-twist-no-fansub':   78,  // Calidad buena en sus títulos
  'manhwalatino':           72,  // Activo pero calidad variable
  'ikigai-mangas':          68,  // Cobertura limitada
  'miauscan':               30   // 🔴 Último - re-subidas masivas, números desordenados y menor fidelidad
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
    const installedList = extensionLoader.getInstalledList();
    const installedExtIds = new Set(installedList.map(e => e.id));

    if (installedExtIds.size === 0) {
      return res.json({
        success: true,
        data: {
          latestReleases: [],
          topRankings: [],
          timestamp: Date.now()
        }
      });
    }

    const cacheKey = `home_feed_data_v7_${Array.from(installedExtIds).sort().join('_')}`;
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

    // Tareas paralelas de extracción en vivo EXCLUSIVAMENTE para los scans que el usuario tenga instalados
    const tasks = [
      // 1. OLYMPUS SCANLATION (🇰🇷 Manhwas en tiempo real + Rankings)
      (async () => {
        if (!installedExtIds.has('olympus-scanlation')) return;
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
              let rawTitle = $(el).find('figcaption').text().trim() || $(el).attr('title') || $(el).text().trim().replace(/\s+/g, ' ');
              const url = 'https://olympusxyz.com' + $(el).attr('href');
              if (!rawTitle || rawTitle.includes('comic-') || rawTitle.includes('2026')) {
                const slug = $(el).attr('href').split('/').filter(Boolean).pop() || '';
                rawTitle = slug.replace(/^comic-|^manhua-|^manga-/, '').replace(/-\d{6,}.*$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              }
              const title = cleanMangaTitle(rawTitle);
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
                const title = cleanMangaTitle(match[3] ? match[3].trim() : '');
                const url = 'https://olympusxyz.com' + $(el).attr('href');
                const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || $(el).find('img').attr('srcset')?.split(' ')[0] || '';
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
        if (!installedExtIds.has('miauscan')) return;
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
        if (!installedExtIds.has('manhwalatino')) return;
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
        if (!installedExtIds.has('mangadex')) return;
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
            let lastChapterMap = {};
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
                  if (m.attributes?.lastChapter) {
                    const parsedLast = parseFloat(m.attributes.lastChapter);
                    if (!isNaN(parsedLast)) {
                      lastChapterMap[m.id] = parsedLast;
                    }
                  }
                }
              }
            }

            // Agrupar lanzamientos de MangaDex por mangaId para conservar únicamente el capítulo más alto / reciente real
            const mdCandidateMap = new Map();

            for (const ch of (mdData.data || [])) {
              const mangaRel = ch.relationships?.find(r => r.type === 'manga');
              if (!mangaRel) continue;
              const mangaId = mangaRel.id;
              const mangaTitle = mangaRel.attributes?.title?.en || mangaRel.attributes?.title?.['es'] || mangaRel.attributes?.title?.['es-la'] || Object.values(mangaRel.attributes?.title || {})[0] || 'Manga';
              const chNum = parseFloat(ch.attributes?.chapter) || 0;
              const maxKnown = lastChapterMap[mangaId] || 0;

              // Si el manga ya tiene capítulos mucho más altos registrados (ej. 397) y alguien sube un 206, NO mostrarlo en Nuevos Lanzamientos
              if (maxKnown > 0 && chNum < (maxKnown - 1.5)) {
                continue;
              }

              const chName = ch.attributes?.chapter ? `Capítulo ${ch.attributes.chapter}` : (ch.attributes?.title ? `Cap. ${ch.attributes.title}` : 'Nuevo Capítulo');
              const groupRel = ch.relationships?.find(r => r.type === 'scanlation_group');
              const groupName = groupRel?.attributes?.name || 'MangaDex';
              
              const pubDate = new Date(ch.attributes?.readableAt || ch.attributes?.publishAt || Date.now());
              const publishedAt = pubDate.getTime();
              const coverUrl = coverMap[mangaId] || `https://uploads.mangadex.org/covers/${mangaId}/cover.512.jpg`;
              const url = `https://mangadex.org/title/${mangaId}`;

              if (mangaTitle) {
                const existing = mdCandidateMap.get(mangaId);
                if (!existing || chNum > existing.chapterNum || (chNum === existing.chapterNum && publishedAt > existing.publishedAt)) {
                  mdCandidateMap.set(mangaId, {
                    id: `rel-md-${mangaId}`,
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

            for (const release of mdCandidateMap.values()) {
              rawReleases.push(release);
            }
          }
        } catch (err) {
          console.warn('[HomeFeed] Error consultando MangaDex:', err.message);
        }
      })(),

      // 5. SKYMANGAS (🇨🇳 Manhuas & Mangas - Integrado cronológicamente según antigüedad real)
      (async () => {
        if (!installedExtIds.has('skymangas')) return;
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
        if (!installedExtIds.has('zonatmo')) return;
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
        if (!installedExtIds.has('rn-scanlation')) return;
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

    // 8. MOTOR DE IDENTIFICACIÓN CANÓNICA, DESEMPATE Y DEDUPLICACIÓN INTELIGENTE
    // Identifica alias multi-idioma (ej: "Tomb Raider King" vs "El Rey de los Saqueadores de Tumbas")
    // y descarta resubidas de series que ya finalizaron hace años (ej: Limit Breaker / Tomb Raider King)
    const bestByTitle = new Map();

    for (const cand of rawReleases) {
      // 1. Filtrar series históricas que ya finalizaron por completo (usando texto y huella de imagen)
      const completionCheck = mangaIdentifier.isCompletedSeries(cand.title, cand.chapterNum || 0, cand.cover, cand.url);
      if (completionCheck.isCompleted) {
        // Obra histórica finalizada: No entra como estreno en vivo en el carrusel de lanzamientos
        continue;
      }

      // 2. Obtener clave canónica unificada y metadatos canónicos por texto e imagen
      const key = mangaIdentifier.getCanonicalDeduplicationKey(cand.title, cand.cover, cand.url);
      if (!key) continue;

      const canonInfo = mangaIdentifier.identifyManga(cand.title, cand.cover, cand.url);
      if (canonInfo) {
        cand.title = canonInfo.canonicalTitle || cand.title;
        if (canonInfo.type) cand.type = canonInfo.type;
        // Auto-aprendizaje: Registrar alias en la memoria canónica permanente
        if (cand.title && canonInfo.id) {
          mangaIdentifier.registerAlias(canonInfo.id, cand.title);
        }
      }

      if (!bestByTitle.has(key)) {
        // Si es MiauScan en solitario pero es una resubida de un manga antiguo con muchos capítulos
        if (cand.extensionId === 'miauscan' && cand.chapterNum > 5) {
          cand.publishedAt = Math.min(cand.publishedAt, Date.now() - (4 * 3600 * 1000));
        }
        bestByTitle.set(key, cand);
      } else {
        const existing = bestByTitle.get(key);
        const candCap = cand.chapterNum || 0;
        const existCap = existing.chapterNum || 0;
        const capDiff = Math.abs(candCap - existCap);

        const scoreCand    = SCAN_QUALITY_SCORE[cand.extensionId]     || 50;
        const scoreExist   = SCAN_QUALITY_SCORE[existing.extensionId] || 50;

        // REGLA 1: OLYMPUS SCANLATION ES EL REY (#1 ABSOLUTO)
        // Si el candidato es Olympus, siempre reemplaza a scans de menor calidad (MiauScan, ManhwaLatino, etc.)
        if (cand.extensionId === 'olympus-scanlation' && existing.extensionId !== 'olympus-scanlation') {
          bestByTitle.set(key, cand);
          continue;
        }
        // Si el existente ya es Olympus, scans inferiores (especialmente MiauScan) NUNCA pueden desplazarlo
        if (existing.extensionId === 'olympus-scanlation' && cand.extensionId !== 'olympus-scanlation') {
          continue;
        }

        // REGLA 2: MIAUSCAN NUNCA PUEDE SOBREESCRIBIR UN SCAN SUPERIOR (RN, ZonaTMO, MangaDex, etc.)
        if (cand.extensionId === 'miauscan' && scoreExist > 40) {
          continue; // Descartar MiauScan en favor del scan confiable existente
        }
        if (existing.extensionId === 'miauscan' && scoreCand > 40) {
          bestByTitle.set(key, cand); // El scan confiable desplaza a MiauScan
          continue;
        }

        // REGLA 3: Si ambos scans son de calidad similar y la diferencia de caps es > 3
        if (capDiff > 3) {
          if (candCap > existCap && scoreCand >= 68) {
            bestByTitle.set(key, cand);
          }
        }
        // REGLA 4: Si están a la par (diferencia <= 3), gana el de mayor reputación / calidad
        // Olympus (100) > RN (90) > ZonaTMO (85) > SkyMangas/MangaDex (80) > PlotTwist (78) > ManhwaLatino (72) > MiauScan (30)
        else if (scoreCand > scoreExist) {
          bestByTitle.set(key, cand);
        }
        // REGLA 5: Mismo score de calidad → gana el publicado más recientemente
        else if (scoreCand === scoreExist && cand.publishedAt > existing.publishedAt) {
          bestByTitle.set(key, cand);
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

    // 10. INTEGRACIÓN DE ANALÍTICAS REALES DE LECTORES (Recopilación colectiva)
    let finalRankings = [...topRankings];
    try {
      const analytics = loadAnalytics();
      const analyticsList = Object.values(analytics.mangas || {})
        .filter(m => m.totalReads > 0 && installedExtIds.has(m.extensionId))
        .sort((a, b) => (b.weeklyReads * 2 + b.totalReads) - (a.weeklyReads * 2 + a.totalReads));

      if (analyticsList.length > 0) {
        const userFavs = analyticsList.slice(0, 10).map((m, idx) => ({
          rank: idx + 1,
          title: m.title,
          views: `${m.totalReads} lecturas globales`,
          url: m.url,
          cover: m.cover,
          coverProxy: helperProxy(m.cover),
          rating: '9.9',
          type: 'Manhwa',
          isAdult: checkIsAdult(m.title, [], 'Manhwa'),
          isBL: checkIsBL(m.title, [], 'Manhwa'),
          scanSource: m.scanSource || 'Scan',
          extensionId: m.extensionId || 'olympus-scanlation'
        }));

        // Fusionar respetando los más leídos de los usuarios al tope
        const combinedRankings = [...userFavs];
        for (const tr of topRankings) {
          if (!combinedRankings.some(x => x.title?.toLowerCase().trim() === tr.title?.toLowerCase().trim())) {
            combinedRankings.push(tr);
          }
        }
        finalRankings = combinedRankings.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
      }
    } catch (e) {
      console.warn('[HomeFeed] Error integrando analytics en rankings:', e.message);
    }

    const payload = {
      latestReleases: sortedReleases.slice(0, 45),
      topRankings: finalRankings.slice(0, 10),
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

// Obtener recomendaciones inteligentes de mangas similares basadas en géneros, temas (Sistema, Murim, Regresión, etc.) y sinopsis
export const getRecommendations = async (req, res) => {
  try {
    const { title = '', genres = '', extensionId = '', synopsis = '', limit = 30 } = req.query;
    const currentTitle = String(title || '').trim();
    const parsedGenres = Array.isArray(genres) 
      ? genres 
      : (genres ? String(genres).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []);
    const fullText = `${currentTitle} ${parsedGenres.join(' ')} ${synopsis || ''}`.toLowerCase();

    // 1. Detectar tópicos/temas clave en el texto (incluso si no están en la lista oficial de géneros)
    const themes = [];
    if (/sistema|system|nivel|level|leveling|jugador|player|pantalla|misiones|subir de nivel/i.test(fullText)) {
      themes.push('sistema');
    }
    if (/retornado|regres[oó]|regresi[oó]n|reencarna|segunda oportunidad|vida pasada|futuro/i.test(fullText)) {
      themes.push('regresion');
    }
    if (/cultiv|marcial|artes marciales|murim|espadach[ií]n|espada|secta|qi|dantian|dioses/i.test(fullText)) {
      themes.push('marcial');
    }
    if (/torre|mazmorra|dungeon|cazador|hunter|portal|monstruo|rango|despertado|gremio/i.test(fullText)) {
      themes.push('mazmorra');
    }
    if (/venganza|traici[oó]n|traicionado|sabueso|villano|enemigo|hierro/i.test(fullText)) {
      themes.push('venganza');
    }
    if (/academia|mago|magia|escuela|nigromante|invocador/i.test(fullText)) {
      themes.push('magia');
    }

    const host = req.get('host');
    const baseUrl = `${req.protocol}://${host}`;
    const helperProxy = (url, referer = '') => {
      if (!url) return '';
      return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
    };

    // Helper para obtener una clave canónica y evitar títulos alternativos duplicados
    const getCanonicalKey = (tStr) => {
      const t = String(tStr || '').toLowerCase();
      if (t.includes('solo leveling')) return 'solo_leveling';
      if (t.includes('lector omnisciente') || t.includes('omniscient reader')) return 'omniscient_reader';
      if (t.includes('nano machine')) return 'nano_machine';
      if (t.includes('beginning after the end') || t.includes('principio despues') || t.includes('tbate')) return 'tbate';
      if (t.includes('sabueso') || t.includes('hound')) return 'sabueso';
      if (t.includes('10000') || t.includes('10.000')) {
        if (t.includes('jugador que regreso') || t.includes('player who returned')) return 'player_returned_10k';
        return 'future_10000_years';
      }
      if (t.includes('hijo menor') || t.includes('youngest son of sword')) return 'runcandel_sword';
      if (t.includes('loco frontera') || t.includes('ingeniero') || t.includes('estate developer')) return 'estate_developer';
      if (t.includes('contra los dioses') || t.includes('against the gods')) return 'atg';
      if (t.includes('yu ijin') || t.includes('mercenary enrollment') || t.includes('mercenario')) return 'mercenary_enrollment';
      if (t.includes('novato') || t.includes('max level newbie') || t.includes('devorador')) return 'max_level_newbie';
      if (t.includes('mago de rango infinito') || t.includes('infinite mage')) return 'infinite_mage';
      if (t.includes('pick me up') || t.includes('gacha infinito')) return 'pick_me_up';
      if (t.includes('ascension') || t.includes('ascensión')) return 'ascension_academy';
      if (t.includes('suicida') || t.includes('sss-class') || t.includes('sss class')) return 'sss_hunter';
      if (t.includes('torre de dios') || t.includes('tower of god')) return 'tower_of_god';
      if (t.includes('wind breaker')) return 'wind_breaker';
      if (t.includes('eleceed')) return 'eleceed';
      if (t.includes('noble perezoso') || t.includes('deadbeat')) return 'deadbeat_noble';
      if (t.includes('tumbas') || t.includes('tomb raider')) return 'tomb_raider';
      if (t.includes('dulce hogar') || t.includes('sweet home')) return 'sweet_home';
      if (t.includes('god of high school') || t.includes('escuela secundaria')) return 'goh';
      if (t.includes('overgeared')) return 'overgeared';
      if (t.includes('gokurakugai')) return 'gokurakugai';
      if (t.includes('barbaro') || t.includes('bárbaro')) return 'barbarian_game';
      if (t.includes('medico') || t.includes('médico supremo') || t.includes('doctor')) return 'murim_doctor';
      if (t.includes('nigromante de la estacion') || t.includes('seoul station')) return 'seoul_necromancer';
      return t.replace(/[^a-z0-9]/g, '');
    };

    // 2. Detectar si la petición es de Anime
    const isAnimeReq = String(req.query.type || '').toLowerCase() === 'anime' ||
      String(extensionId || '').toLowerCase().includes('anime') ||
      String(extensionId || '').toLowerCase().includes('monos') ||
      ['animeav1-es', 'jkanime-es', 'tioanime-es', 'monoschinos-es', 'animefenix-es', 'animeonlineninja-es'].includes(extensionId);

    if (isAnimeReq) {
      let animeCatalog = [];
      try {
        const ext = await extensionLoader.getExtensionInstance(extensionId || 'animeav1-es');
        if (ext && typeof ext.getCatalog === 'function') {
          const catRes = await ext.getCatalog(1);
          animeCatalog = catRes?.animes || catRes?.mangas || (Array.isArray(catRes) ? catRes : []);
        }
      } catch (e) {
        console.warn('[Anime Recommendations] No se pudo cargar catálogo vivo:', e.message);
      }

      const rawAnimeCandidates = [
        {
          title: 'Bleach: Sennen Kessen-hen (Thousand-Year Blood War)',
          genres: ['Acción', 'Aventura', 'Shounen', 'Sobrenatural'],
          synopsis: 'La paz se rompe cuando las sirenas de advertencia suenan en la Sociedad de Almas. Los Shinigami se enfrentan al ejército del Wandenreich liderado por Yhwach.',
          cover: 'https://cdn.animeav1.com/covers/bleach-sennen-kessen-hen.jpg',
          url: 'https://animeav1.com/media/bleach-sennen-kessen-hen-kashin-tan',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.9',
          totalChapters: 26,
          status: 'En emisión'
        },
        {
          title: 'Jujutsu Kaisen',
          genres: ['Acción', 'Fantasía', 'Shounen', 'Sobrenatural'],
          synopsis: 'Yuji Itadori se traga un dedo maldito y se convierte en el recipiente de Sukuna, el Rey de las Maldiciones, uniéndose a la Escuela de Hechicería de Tokio.',
          cover: 'https://cdn.animeav1.com/covers/jujutsu-kaisen.jpg',
          url: 'https://animeav1.com/media/jujutsu-kaisen',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.8',
          totalChapters: 24,
          status: 'Finalizado'
        },
        {
          title: 'Kimetsu no Yaiba (Demon Slayer)',
          genres: ['Acción', 'Fantasía', 'Shounen', 'Demonios', 'Espadachín'],
          synopsis: 'Tanjiro Kamado emprende un viaje para vengar a su familia masacrada y encontrar una cura para convertir a su hermana Nezuko nuevamente en humana.',
          cover: 'https://cdn.animeav1.com/covers/kimetsu-no-yaiba.jpg',
          url: 'https://animeav1.com/media/kimetsu-no-yaiba',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.9',
          totalChapters: 26,
          status: 'Finalizado'
        },
        {
          title: 'Solo Leveling (Ore dake Level Up na Ken)',
          genres: ['Acción', 'Aventura', 'Fantasía', 'Sistema', 'Mazmorras'],
          synopsis: 'En un mundo donde los cazadores luchan contra bestias mágicas, Jinwoo Sung, el cazador más débil, despierta un misterioso programa llamado Sistema.',
          cover: 'https://cdn.animeav1.com/covers/solo-leveling.jpg',
          url: 'https://animeav1.com/media/solo-leveling',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.9',
          totalChapters: 12,
          status: 'Finalizado'
        },
        {
          title: 'Sousou no Frieren (Frieren: Beyond Journey\'s End)',
          genres: ['Aventura', 'Drama', 'Fantasía', 'Magia', 'Recuentos de la vida'],
          synopsis: 'La maga elfa Frieren reflexiona sobre el paso del tiempo y las vidas humanas tras la derrota del Rey Demonio junto a sus antiguos compañeros héroes.',
          cover: 'https://cdn.animeav1.com/covers/sousou-no-frieren.jpg',
          url: 'https://animeav1.com/media/sousou-no-frieren',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.9',
          totalChapters: 28,
          status: 'Finalizado'
        },
        {
          title: 'Chainsaw Man',
          genres: ['Acción', 'Sobrenatural', 'Shounen', 'Gore', 'Demonios'],
          synopsis: 'Denji es un joven que vive en la extrema pobreza trabajando como cazador de demonios con Pochita, hasta que renace como el Hombre Motosierra.',
          cover: 'https://cdn.animeav1.com/covers/chainsaw-man.jpg',
          url: 'https://animeav1.com/media/chainsaw-man',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.7',
          totalChapters: 12,
          status: 'Finalizado'
        },
        {
          title: 'Boku no Hero Academia: I Am a Hero Too',
          genres: ['Acción', 'Superpoderes', 'Shounen', 'Escolar'],
          synopsis: 'En un mundo donde la mayoría de la población tiene dones sobrehumanos, los jóvenes aspiran a convertirse en héroes profesionales.',
          cover: 'https://cdn.animeav1.com/covers/boku-no-hero-academia.jpg',
          url: 'https://animeav1.com/media/boku-no-hero-academia-i-am-a-hero-too',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.6',
          totalChapters: 25,
          status: 'En emisión'
        },
        {
          title: 'DanDaDan',
          genres: ['Acción', 'Comedia', 'Sobrenatural', 'Aliens', 'Fantasmas'],
          synopsis: 'Momo Ayase cree en los fantasmas pero no en los aliens, y Okarun cree en los extraterrestres pero no en los espíritus. Juntos descubren ambos mundos.',
          cover: 'https://cdn.animeav1.com/covers/dandadan.jpg',
          url: 'https://animeav1.com/media/dandadan',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.8',
          totalChapters: 12,
          status: 'En emisión'
        },
        {
          title: 'Kaiju No. 8',
          genres: ['Acción', 'Ciencia Ficción', 'Monstruos', 'Militar'],
          synopsis: 'Kafka Hibino sueña con unirse a las Fuerzas de Defensa para exterminar kaijus, pero tras un incidente inesperado adquiere el poder de transformarse en uno.',
          cover: 'https://cdn.animeav1.com/covers/kaiju-no-8.jpg',
          url: 'https://animeav1.com/media/kaiju-no-8',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.7',
          totalChapters: 12,
          status: 'Finalizado'
        },
        {
          title: 'Mushoku Tensei: Isekai Ittara Honki Dasu',
          genres: ['Aventura', 'Drama', 'Fantasía', 'Isekai', 'Magia'],
          synopsis: 'Un desempleado de 34 años muere salvando a unos adolescentes y reencarna como Rudeus Greyrat en un mundo de magia conservando sus recuerdos.',
          cover: 'https://cdn.animeav1.com/covers/mushoku-tensei.jpg',
          url: 'https://animeav1.com/media/mushoku-tensei',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '9.8',
          totalChapters: 24,
          status: 'Finalizado'
        },
        {
          title: 'Shingeki no Kyojin (Attack on Titan)',
          genres: ['Acción', 'Drama', 'Fantasía', 'Misterio', 'Militar'],
          synopsis: 'La humanidad vive dentro de enormes murallas para protegerse de los Titanes devoradores de humanos. Eren Jaeger jura aniquilar a todos los titanes.',
          cover: 'https://cdn.animeav1.com/covers/shingeki-no-kyojin.jpg',
          url: 'https://animeav1.com/media/shingeki-no-kyojin',
          scan: 'AnimeAV1',
          extensionId: 'animeav1-es',
          rating: '10.0',
          totalChapters: 87,
          status: 'Finalizado'
        }
      ];

      const seenKeys = new Set();
      const currentKey = currentTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      seenKeys.add(currentKey);
      const scoredAnimeList = [];

      // 1. Agregar animes del catálogo vivo de la extensión
      if (Array.isArray(animeCatalog)) {
        for (const item of animeCatalog) {
          const itemKey = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!itemKey || seenKeys.has(itemKey) || itemKey.includes(currentKey) || currentKey.includes(itemKey)) continue;
          seenKeys.add(itemKey);

          let score = 30;
          const itemGenres = (item.genres || []).map(g => g.toLowerCase());
          for (const g of parsedGenres) {
            if (itemGenres.includes(g)) score += 20;
          }
          const percent = Math.min(99, Math.max(80, Math.round(60 + score * 0.35)));

          scoredAnimeList.push({
            title: item.title,
            genres: item.genres || ['Anime'],
            synopsis: item.synopsis || 'Anime disponible en tu catálogo.',
            cover: item.cover,
            coverProxy: helperProxy(item.cover),
            url: item.url,
            scan: item.extension || 'AnimeAV1',
            extensionId: extensionId || 'animeav1-es',
            rating: '9.8',
            totalChapters: item.episodes?.length || item.totalChapters || 12,
            status: item.status || 'En emisión',
            matchScore: `${percent}%`,
            matchReason: 'Anime Recomendado'
          });
        }
      }

      // 2. Agregar candidatos de respaldo si hace falta
      for (const cand of rawAnimeCandidates) {
        const candKey = cand.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenKeys.has(candKey) || candKey.includes(currentKey) || currentKey.includes(candKey)) continue;
        seenKeys.add(candKey);

        scoredAnimeList.push({
          ...cand,
          coverProxy: helperProxy(cand.cover),
          matchScore: '95%',
          matchReason: 'Anime Recomendado'
        });
      }

      return res.json({
        success: true,
        data: scoredAnimeList.slice(0, parseInt(limit, 10) || 30)
      });
    }

    // 2. Obtener catálogo vivo de Olympus (867+ obras reales con slugs activos)
    let olympusCatalog = [];
    try {
      const oly = await extensionLoader.getExtensionInstance('olympus-scanlation');
      if (oly) {
        olympusCatalog = await oly._fetchFullLibrary();
      }
    } catch (e) {
      console.warn('[Recommendations] No se pudo cargar catálogo de Olympus:', e.message);
    }

    // Helper para resolver un manga de Olympus a su slug y cover vivos
    const resolveOlympusLive = (baseQuery, fallbackItem) => {
      if (!olympusCatalog || olympusCatalog.length === 0) return fallbackItem;
      const bq = baseQuery.toLowerCase().replace(/[-_]/g, ' ');
      const match = olympusCatalog.find(item => {
        const mSlug = (item.slug || '').toLowerCase().replace(/[-_]/g, ' ');
        const mTitle = (item.title || '').toLowerCase();
        return mSlug.includes(bq) || bq.includes(mSlug.split(' 202')[0]) || mTitle.includes(bq);
      });
      if (match) {
        return {
          ...fallbackItem,
          title: match.title || fallbackItem.title,
          url: match.url,
          cover: match.cover || fallbackItem.cover,
          totalChapters: match.chapterCount || fallbackItem.totalChapters,
          extensionId: 'olympus-scanlation',
          scan: 'Olympus Scanlation'
        };
      }
      return fallbackItem;
    };

    // Repertorio curado de las mejores obras maestras (En emisión y Finalizados)
    const rawCandidates = [
      {
        title: 'Solo Leveling',
        genres: ['Acción', 'Fantasía', 'Sistema', 'Mazmorra', 'Nivel'],
        synopsis: 'Sung Jin-Woo, el cazador más débil de la humanidad, recibe una misión secreta tras una doble mazmorra y despierta un sistema que le permite subir de nivel sin límites.',
        cover: 'https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/e90bdc47-c8b9-4df7-b2c0-17641b645ee1.jpg.512.jpg',
        url: 'https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
        scan: 'MangaDex',
        extensionId: 'mangadex',
        rating: '10.0',
        totalChapters: 200,
        status: 'Finalizado'
      },
      resolveOlympusLive('pick me up', {
        title: 'Pick Me Up, Infinite Gacha',
        genres: ['Acción', 'Fantasía', 'Videojuegos', 'Estrategia', 'Mazmorra', 'Sistema'],
        synopsis: 'El mejor jugador mundial del gacha más cruel de la historia es transportado al juego como un personaje de 1 estrella de rango basura.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/94/tmp_0taieuu-lg.webp',
        url: 'https://olympusxyz.com/series/comic-pick-me-up-gacha-infinito-20260910-080354820',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 218,
        status: 'En emisión'
      }),
      resolveOlympusLive('sabueso', {
        title: 'La venganza del sabueso de sangre de hierro',
        genres: ['Acción', 'Venganza', 'Fantasía', 'Reencarnación', 'Espada'],
        synopsis: 'Vikir, el fiel sabueso de la familia Baskerville, renace con sus recuerdos para ejecutar su implacable venganza contra quienes lo traicionaron.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/743/sabueso-venganza-lg.webp',
        url: 'https://olympusxyz.com/series/comic-20-225-2sabueso13424',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 115,
        status: 'En emisión'
      }),
      resolveOlympusLive('el hijo menor del maestro de la espada', {
        title: 'El hijo menor del maestro de la espada',
        genres: ['Acción', 'Artes Marciales', 'Fantasía', 'Retornado', 'Magia', 'Espada'],
        synopsis: 'Jin Runcandel, el mayor fracaso del clan más prestigioso de espadachines, recibe una segunda oportunidad con un contrato con un dios para convertirse en el supremo maestro.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/86/tmpizpqgl2f-lg.webp',
        url: 'https://olympusxyz.com/series/comic-el-hijo20-225-de-la-espada13424',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 216,
        status: 'En emisión'
      }),
      resolveOlympusLive('yu ijin', {
        title: 'El Asesino Yu Ijin (Mercenary Enrollment)',
        genres: ['Acción', 'Militar', 'Drama', 'Vida Escolar'],
        synopsis: 'El único superviviente de un accidente aéreo de niño se convierte en un mercenario temido. Al reencontrarse con su familia, protege a su hermana en la escuela secundaria.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/142/tmpt79xoj_3-lg.webp',
        url: 'https://olympusxyz.com/series/comic-el-asesino-yu-ijin-20260910-080332880',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 287,
        status: 'En emisión'
      }),
      {
        title: 'Subiendo De Nivel 10.000 Años En el Futuro',
        genres: ['Acción', 'Fantasía', 'Artes Marciales', 'Futuro', 'Sistema'],
        synopsis: 'Al comienzo de la era de las artes marciales, monstruos invaden la tierra. Un joven viaja en sueños al futuro para aprender técnicas supremas y despertar el sistema.',
        cover: 'https://rncalation.online/uploads/covers/subiendo-de-nivel-10000-anos-en-el-futuro/1780562389357-158da0ad-163d-4984-8e2d-7b1458040bc2.png',
        url: 'https://rncalation.online/comics/subiendo-de-nivel-10000-anos-en-el-futuro',
        scan: 'RN Scanlation',
        extensionId: 'rn-scanlation',
        rating: '9.9',
        totalChapters: 248,
        status: 'En emisión'
      },
      resolveOlympusLive('asesino de dragones', {
        title: 'Asesino de Dragones',
        genres: ['Acción', 'Fantasía', 'Magia', 'Cazador', 'Aventura'],
        synopsis: 'En un mundo amenazado por dragones destructores, un guerrero empuña la hoja suprema para proteger a la humanidad.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/29/tmpl_1uy72v-lg.webp',
        url: 'https://olympusxyz.com/series/comic-asesino-de-dragones-20260910-080345604',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.8',
        totalChapters: 175,
        status: 'En emisión'
      }),
      resolveOlympusLive('cronicas de la faccion demoniaca', {
        title: 'Crónicas de la facción demoníaca',
        genres: ['Acción', 'Murim', 'Artes Marciales', 'Cultivo', 'Regresión'],
        synopsis: 'Chun Hajin, el asesino más fuerte del bajo mundo marcial, renace como el tercer señor de la facción demoníaca.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/653/tmp69lkrvi5-lg.webp',
        url: 'https://olympusxyz.com/series/comic-cronicas-de-la-faccion-demoniaca-chun-hajin-el-asesino-mas-fuerte-20260910-080350582',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 188,
        status: 'En emisión'
      }),
      resolveOlympusLive('dr jugador', {
        title: 'Dr. Jugador (Doctor Jugador)',
        genres: ['Manhwa', 'Sistema', 'Fantasía', 'Magia', 'Medicina'],
        synopsis: 'Raymond, un hijo ilegítimo y aprendiz de curandero maltratado, despierta un sistema médico legendario que le permite diagnosticar y operar milagrosamente.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/49/dr-jugador-lg.webp',
        url: 'https://olympusxyz.com/series/comic-el-me10-05-2025raymond13424',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.8',
        totalChapters: 66,
        status: 'En emisión'
      }),
      resolveOlympusLive('asesino de la luna a la deriva', {
        title: 'El Asesino de la Luna a la Deriva',
        genres: ['Acción', 'Murim', 'Venganza', 'Artes Marciales', 'Oscuro'],
        synopsis: 'Secuestrado en las profundidades de una cueva para ser forjado como un arma viviente sin piedad, desata su camino marcial bajo la luz de la luna.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/31/19 - lw0VfUZ1nwVIpOqsTmtyTk&filename=th3-lg.webp',
        url: 'https://olympusxyz.com/series/comic-el-asesino20-225-de-la-luna-a-la-deriva13424',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.9',
        totalChapters: 141,
        status: 'En emisión'
      }),
      resolveOlympusLive('academia de la ascension', {
        title: 'Academia de la Ascensión',
        genres: ['Cultivo', 'Artes Marciales', 'Aventura', 'Academia', 'Sistema'],
        synopsis: 'En un mundo dimensional, guerreros entrenan en academias para despertar dones legendarios y escalar hacia el reino celestial.',
        cover: 'https://media.imagesolymp.xyz/comics/covers/11/tmpedu9scno-lg.webp',
        url: 'https://olympusxyz.com/series/comic-academia-de-la-ascension-20260909-080419413',
        scan: 'Olympus Scanlation',
        extensionId: 'olympus-scanlation',
        rating: '9.8',
        totalChapters: 201,
        status: 'En emisión'
      }),
      {
        title: 'Contra los dioses (Against the Gods)',
        genres: ['Cultivo', 'Artes Marciales', 'Fantasía', 'Acción', 'Reencarnación'],
        synopsis: 'Portando la legendaria Perla del Veneno Celestial, Yun Che renace tras una trágica muerte para desafiar a los cielos y forjar su propio destino divino.',
        cover: 'https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp',
        url: 'https://skymangas.com/manhua/contra-los-dioses',
        scan: 'SkyMangas',
        extensionId: 'skymangas',
        rating: '9.8',
        totalChapters: 158,
        status: 'En emisión'
      },
      {
        title: 'Gokurakugai',
        genres: ['Manga', 'Acción', 'Sobrenatural', 'Misterio'],
        synopsis: 'Tao y Alma dirigen una oficina de soluciones en el bullicioso distrito de Gokurakugai, resolviendo casos oscuros que involucran criaturas no humanas.',
        cover: 'https://uploads.mangadex.org/covers/40c058a2-430e-4ced-b663-369dcf38583f/2824eeb9-042d-4c1c-bb1f-584d1c5a047a.jpg.512.jpg',
        url: 'https://plotnofansub.com/manga/gokurakugai/',
        scan: 'Plot Twist No Fansub',
        extensionId: 'plot-twist-no-fansub',
        rating: '9.7',
        totalChapters: 37,
        status: 'En emisión'
      }
    ];

    // 3. Algoritmo de Coincidencia de Similitud y Filtrado Antiduplicados Canónico
    const currentCanonicalKey = getCanonicalKey(currentTitle);
    const seenCanonicalKeys = new Set();
    seenCanonicalKeys.add(currentCanonicalKey);
    const scoredList = [];

    // Añadir primero los candidatos destacados con URLs y portadas vivas
    for (const cand of rawCandidates) {
      const candKey = getCanonicalKey(cand.title);
      if (candKey === currentCanonicalKey || seenCanonicalKeys.has(candKey)) {
        continue;
      }
      seenCanonicalKeys.add(candKey);

      let score = 25;
      const matchReasons = [];

      const candGenresLower = (cand.genres || []).map(g => g.toLowerCase());
      for (const g of parsedGenres) {
        if (candGenresLower.includes(g)) {
          score += 25;
          if (matchReasons.length < 2) matchReasons.push(g.charAt(0).toUpperCase() + g.slice(1));
        }
      }

      const candFullText = `${cand.title} ${(cand.genres || []).join(' ')} ${cand.synopsis || ''}`.toLowerCase();
      for (const th of themes) {
        if (th === 'sistema' && /sistema|system|nivel|level|jugador/i.test(candFullText)) {
          score += 35;
          if (!matchReasons.includes('Sistema')) matchReasons.push('Sistema');
        }
        if (th === 'regresion' && /retornado|regres|reencarna|segunda/i.test(candFullText)) {
          score += 30;
          if (!matchReasons.includes('Regresión')) matchReasons.push('Regresión');
        }
        if (th === 'marcial' && /marcial|cultiv|espada|murim/i.test(candFullText)) {
          score += 30;
          if (!matchReasons.includes('Artes Marciales')) matchReasons.push('Artes Marciales');
        }
        if (th === 'mazmorra' && /torre|mazmorra|dungeon|cazador/i.test(candFullText)) {
          score += 25;
          if (!matchReasons.includes('Mazmorras')) matchReasons.push('Mazmorras');
        }
        if (th === 'venganza' && /venganza|traici|enemigo|sabueso/i.test(candFullText)) {
          score += 30;
          if (!matchReasons.includes('Venganza')) matchReasons.push('Venganza');
        }
        if (th === 'magia' && /magia|mago|academia/i.test(candFullText)) {
          score += 25;
          if (!matchReasons.includes('Magia')) matchReasons.push('Magia');
        }
      }

      const percentMatch = Math.min(99, Math.max(80, Math.round(55 + score * 0.38)));

      scoredList.push({
        ...cand,
        coverProxy: helperProxy(cand.cover, cand.extensionId === 'olympus-scanlation' ? 'https://olympusxyz.com' : 'https://mangadex.org'),
        matchScore: `${percentMatch}%`,
        matchReason: matchReasons.slice(0, 2).join(' & ') || (cand.status === 'Finalizado' ? 'Obra Maestra Finalizada' : 'Historia Similar')
      });
    }

    // 4. Incorporar obras dinámicas relevantes desde el catálogo vivo de Olympus si hay espacio
    if (olympusCatalog && olympusCatalog.length > 0) {
      for (const oItem of olympusCatalog) {
        if (scoredList.length >= parseInt(limit, 10) * 1.5) break;
        const oKey = getCanonicalKey(oItem.title);
        if (seenCanonicalKeys.has(oKey) || !oItem.cover) continue;

        const oFullText = `${oItem.title} ${(oItem.genres || []).join(' ')}`.toLowerCase();
        let matchScore = 0;
        const matchReasons = [];

        for (const th of themes) {
          if (th === 'sistema' && /sistema|system|nivel|level|jugador/i.test(oFullText)) {
            matchScore += 35;
            if (!matchReasons.includes('Sistema')) matchReasons.push('Sistema');
          }
          if (th === 'regresion' && /retornado|regres|reencarna|segunda/i.test(oFullText)) {
            matchScore += 30;
            if (!matchReasons.includes('Regresión')) matchReasons.push('Regresión');
          }
          if (th === 'marcial' && /marcial|cultiv|espada|murim/i.test(oFullText)) {
            matchScore += 30;
            if (!matchReasons.includes('Artes Marciales')) matchReasons.push('Artes Marciales');
          }
          if (th === 'mazmorra' && /torre|mazmorra|dungeon|cazador/i.test(oFullText)) {
            matchScore += 25;
            if (!matchReasons.includes('Mazmorras')) matchReasons.push('Mazmorras');
          }
          if (th === 'venganza' && /venganza|traici|enemigo|sabueso/i.test(oFullText)) {
            matchScore += 30;
            if (!matchReasons.includes('Venganza')) matchReasons.push('Venganza');
          }
          if (th === 'magia' && /magia|mago|academia/i.test(oFullText)) {
            matchScore += 25;
            if (!matchReasons.includes('Magia')) matchReasons.push('Magia');
          }
        }

        if (matchScore > 0 && (oItem.chapterCount || 0) > 5) {
          seenCanonicalKeys.add(oKey);
          const percent = Math.min(98, Math.max(78, Math.round(55 + matchScore * 0.38)));
          scoredList.push({
            title: oItem.title,
            genres: oItem.genres || ['Manhwa'],
            synopsis: 'Manga disponible en Olympus Scanlation.',
            cover: oItem.cover,
            coverProxy: helperProxy(oItem.cover, 'https://olympusxyz.com'),
            url: oItem.url,
            scan: 'Olympus Scanlation',
            extensionId: 'olympus-scanlation',
            rating: '9.8',
            totalChapters: oItem.chapterCount || 0,
            status: oItem.status || 'En emisión',
            matchScore: `${percent}%`,
            matchReason: matchReasons.slice(0, 2).join(' & ') || 'Recomendación Similar'
          });
        }
      }
    }

    // Ordenar por afinidad
    scoredList.sort((a, b) => parseInt(b.matchScore, 10) - parseInt(a.matchScore, 10));

    return res.json({
      success: true,
      data: scoredList.slice(0, parseInt(limit, 10) || 30)
    });
  } catch (err) {
    console.error('[Recommendations Error]:', err);
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
