import { BaseExtension } from '../base/BaseExtension.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class RNScanlationExtension extends BaseExtension {
  constructor(config = {}) {
    super({
      id: config.id || 'rn-scanlation',
      name: config.name || 'RN Scanlation',
      version: config.version || '3.0.0',
      baseUrl: config.baseUrl || 'https://rncalation.online',
      icon: config.icon || 'https://rncalation.online/icons/icon-192.png',
      lang: config.lang || 'es'
    });
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${this.baseUrl}/`,
      'Cookie': 'age_verified=1; is_adult=1; r18=1; adult=1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9'
    };
  }

  async getCatalog(page = 1, filters = {}) {
    try {
      console.log(`[RN Scanlation] Obteniendo catálogo (pág ${page})...`);
      
      let targetUrl = `${this.baseUrl}/library?page=${page}`;
      if (filters?.query) {
        targetUrl = `${this.baseUrl}/library?q=${encodeURIComponent(filters.query)}&page=${page}`;
      } else {
        const queryParts = [`page=${page}`];
        if (filters?.genres && filters.genres.length > 0) {
          filters.genres.forEach(g => queryParts.push(`genre=${encodeURIComponent(g)}`));
        }
        if (filters?.status && filters.status !== 'Ver todo') {
          queryParts.push(`status=${encodeURIComponent(filters.status.toLowerCase())}`);
        }
        if (filters?.type && filters.type !== 'Ver todo') {
          queryParts.push(`type=${encodeURIComponent(filters.type.toLowerCase())}`);
        }
        if (filters?.sort) {
          queryParts.push(`order=${encodeURIComponent(filters.sort)}`);
        }
        targetUrl = `${this.baseUrl}/library?${queryParts.join('&')}`;
      }

      const res = await axios.get(targetUrl, { headers: this.headers, timeout: 15000 });
      const $ = cheerio.load(res.data);
      const mangas = [];
      const seen = new Set();

      $('a[href*="/comics/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href === '/comics/random' || seen.has(href)) return;
        seen.add(href);

        const img = $(el).find('img').first();
        const title = $(el).find('p.line-clamp-2, .title, h2, h3, h4').first().text().trim() || img.attr('alt') || '';
        
        let cover = img.attr('src') || img.attr('data-src') || '';
        if (cover && !cover.startsWith('http')) cover = `${this.baseUrl}${cover.startsWith('/') ? '' : '/'}${cover}`;

        const latestChapter = $(el).find('.chapter, [class*="ep"], [class*="ch"]').first().text().trim() || 'Disponible';
        const rating = $(el).find('.font-mono, .rating, [class*="score"]').first().text().replace('★', '').trim() || '9.0';

        if (title && title.length > 1) {
          mangas.push({
            id: href.replace(/\/+$/, '').split('/').pop(),
            title,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            cover: cover || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
            latestChapter,
            score: rating
          });
        }
      });

      console.log(`[RN Scanlation] Mangas encontrados en vivo (pág ${page}): ${mangas.length}`);
      
      const totalPages = 15;
      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        page: Number(page),
        totalPages,
        mangas,
        hasNextPage: Number(page) < totalPages && mangas.length > 0
      };
    } catch (err) {
      console.warn('[RN Scanlation Error] Fetch catálogo falló:', err.message);
      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        page: Number(page),
        totalPages: 15,
        mangas: this.getFallbackCatalog(),
        hasNextPage: false
      };
    }
  }

  async search(query, page = 1) {
    try {
      console.log(`[RN Scanlation] Buscando: "${query}"...`);
      const searchUrl = `${this.baseUrl}/library?q=${encodeURIComponent(query)}&page=${page}`;
      const res = await axios.get(searchUrl, { headers: this.headers, timeout: 15000 });
      const $ = cheerio.load(res.data);
      const mangas = [];
      const seen = new Set();

      $('a[href*="/comics/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href === '/comics/random' || seen.has(href)) return;
        seen.add(href);

        const img = $(el).find('img').first();
        const title = $(el).find('p.line-clamp-2, .title, h2, h3, h4').first().text().trim() || img.attr('alt') || '';
        
        let cover = img.attr('src') || img.attr('data-src') || '';
        if (cover && !cover.startsWith('http')) cover = `${this.baseUrl}${cover.startsWith('/') ? '' : '/'}${cover}`;

        const latestChapter = $(el).find('.chapter, [class*="ep"], [class*="ch"]').first().text().trim() || 'Disponible';

        if (title && title.length > 1) {
          mangas.push({
            id: href.replace(/\/+$/, '').split('/').pop(),
            title,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            cover: cover || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
            latestChapter
          });
        }
      });

      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        page: Number(page),
        totalPages: 1,
        mangas,
        hasNextPage: false
      };
    } catch (err) {
      console.warn('[RN Scanlation] Search error:', err.message);
      const list = this.getFallbackCatalog();
      const filtered = list.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));
      return { success: true, extension: this.name, extensionId: this.id, page: 1, mangas: filtered, hasNextPage: false };
    }
  }

  async getMangaDetails(mangaUrl) {
    try {
      console.log(`[RN Scanlation] Obteniendo ficha real: ${mangaUrl}`);
      const res = await axios.get(mangaUrl, { headers: this.headers, timeout: 15000 });
      const $ = cheerio.load(res.data);

      const title = $('h1').first().text().trim() || 'RN Scanlation Manga';
      const slug = mangaUrl.replace(/\/+$/, '').split('/').pop();
      
      let cover = $(`img[src*="/uploads/covers/${slug}"]`).first().attr('src') ||
                  $(`img[alt="${title}"]`).first().attr('src') ||
                  $('meta[property="og:image"]').attr('content') ||
                  $('img[src*="/uploads/covers/"]').first().attr('src') || '';
      if (cover && !cover.startsWith('http')) cover = `${this.baseUrl}${cover.startsWith('/') ? '' : '/'}${cover}`;

      // Sinopsis inteligente: obtener de meta tags o selectores evitando avisos genéricos como "Próximamente"
      let synopsis = $('meta[property="og:description"]').attr('content') || 
                     $('meta[name="description"]').attr('content') || 
                     $('.synopsis, .description, [class*="description"]').first().text().trim() || '';
      if (!synopsis || synopsis.includes('Próximamente') || synopsis.length < 5) {
        synopsis = 'Disfruta de esta serie en español en alta resolución en RN Scanlation.';
      }

      const genres = [];
      $('a[href*="/library?genre="], a[href*="genre="], .genre, [class*="tag"]').each((_, el) => {
        const g = $(el).text().trim();
        if (g && !genres.includes(g) && !['Manga', 'Capítulo', 'Admin', 'Inicio', 'Biblioteca', 'Próximamente'].includes(g)) {
          genres.push(g);
        }
      });
      if (genres.length === 0) genres.push('Manhwa', 'Acción', 'Fantasía', 'Drama');

      const status = $('span:contains("Publicándose"), span:contains("Finalizado"), span:contains("En emisión"), [class*="status"]').first().text().trim() || 'En emisión';

      const chapters = [];
      const seen = new Set();

      const parseChapterElement = (el, $) => {
        const href = $(el).attr('href');
        if (!href || href === '/comics/random' || seen.has(href)) return null;

        const cNum = $(el).attr('data-chapter-num') || '';
        const isStartReadingBtn = $(el).text().includes('Comenzar lectura') && !cNum;
        if (isStartReadingBtn) return null;

        seen.add(href);

        const parent = $(el).parent();
        const parentText = parent.text().trim();
        const cTitle = $(el).attr('data-chapter-label') || $(el).find('[data-cl-title], .title, span').first().text().trim() || $(el).text().trim();
        const date = parent.find('.uppercase, [class*="text-text3"], .date').first().text().trim() || 'Reciente';

        const isFree = parentText.includes('GRATIS') || $(el).text().includes('GRATIS');
        const isLocked = !isFree || parent.find('.fa-lock, svg.lucide-lock, [class*="lock"], [class*="coin"], [class*="vip"]').length > 0;

        return {
          name: cTitle || `Capítulo ${cNum || href.split('/').pop()}`,
          chapterNumber: String(cNum || href.split('/').pop()),
          url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
          date,
          isLocked,
          lockedReason: isLocked ? 'Capítulo bloqueado por el scan original (RN Scanlation).' : undefined
        };
      };

      // 1. Obtener primera página de capítulos desde HTML principal
      $('a[data-chapter-id], a[data-chapter-num], a[href*="/leer/"]').each((_, a) => {
        const parsed = parseChapterElement(a, $);
        if (parsed) chapters.push(parsed);
      });

      // 2. Comprobar si hay paginación de capítulos vía endpoint AJAX de RN Scanlation
      try {
        const initialAjaxRes = await axios.get(`${this.baseUrl}/comics/${slug}/chapters?page=1`, {
          headers: this.headers,
          timeout: 8000
        });
        const totalPages = parseInt(initialAjaxRes.headers['x-pages'] || '1', 10);
        
        if (totalPages > 1) {
          const fetchPagePromises = [];
          for (let p = 2; p <= Math.min(totalPages, 30); p++) {
            fetchPagePromises.push(
              axios.get(`${this.baseUrl}/comics/${slug}/chapters?page=${p}`, {
                headers: this.headers,
                timeout: 10000
              }).then(r => r.data).catch(() => '')
            );
          }

          const additionalPagesHtml = await Promise.all(fetchPagePromises);
          for (const html of additionalPagesHtml) {
            if (!html) continue;
            const $page = cheerio.load(html);
            $page('a[data-chapter-id], a[data-chapter-num], a[href*="/leer/"]').each((_, a) => {
              const parsed = parseChapterElement(a, $page);
              if (parsed) chapters.push(parsed);
            });
          }
        }
      } catch (ajaxErr) {
        console.warn('[RN Scanlation] Paginación AJAX fallback:', ajaxErr.message);
      }

      console.log(`[RN Scanlation] Total capítulos completos extraídos para ${title}: ${chapters.length}`);

      return {
        id: slug,
        title,
        url: mangaUrl,
        cover: cover || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
        synopsis,
        status,
        genres,
        chapters: chapters.length > 0 ? chapters : [
          { name: 'Capítulo 1', chapterNumber: '1', url: `${mangaUrl}/1`, date: 'Reciente', isLocked: false }
        ]
      };
    } catch (err) {
      console.error('[RN Scanlation Error] getMangaDetails:', err.message);
      return {
        id: mangaUrl.split('/').pop(),
        title: 'RN Scanlation Serie',
        url: mangaUrl,
        cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
        synopsis: 'Cómic en español de alta resolución.',
        status: 'En emisión',
        genres: ['Manhwa', 'Fantasía', 'Acción'],
        chapters: [
          { name: 'Capítulo 1', chapterNumber: '1', url: `${mangaUrl}/1`, date: '2026-09-01', isLocked: false }
        ]
      };
    }
  }

  async extractChapter(chapterUrl) {
    try {
      console.log(`[RN Scanlation] Extrayendo páginas: ${chapterUrl}`);
      const res = await axios.get(chapterUrl, { headers: this.headers, timeout: 18000 });
      const html = res.data;
      const $ = cheerio.load(html);

      const title = $('title').text().trim() || 'RN Scanlation';
      const pages = [];
      const seen = new Set();

      // 1. Extracción de páginas mediante selector img.page-img y data-src
      $('img.page-img, img[data-src*="/uploads/pages/"], img[src*="/uploads/pages/"]').each((_, el) => {
        let src = $(el).attr('data-src') || $(el).attr('src');
        if (src && !src.startsWith('data:image') && !seen.has(src)) {
          if (!src.startsWith('http')) src = `${this.baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
          seen.add(src);
          pages.push({
            index: pages.length + 1,
            url: this.normalizeUrl(src, chapterUrl)
          });
        }
      });

      // 2. Fallback por si hay imágenes en contenedor de lectura
      if (pages.length === 0) {
        $('.reader-container img, #readerarea img, .reading-content img').each((_, el) => {
          let src = $(el).attr('data-src') || $(el).attr('src');
          if (src && !src.startsWith('data:image') && !seen.has(src)) {
            if (!src.startsWith('http')) src = `${this.baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
            seen.add(src);
            pages.push({
              index: pages.length + 1,
              url: this.normalizeUrl(src, chapterUrl)
            });
          }
        });
      }

      // 3. Detección de capítulo bloqueado / paywalled
      if (pages.length === 0) {
        const isPaywall = /desbloquear|comprar|monedas|coins|vip|acceso exclusivo|bloqueado|inicia sesión/i.test(html);
        return {
          mangaTitle: title.split('|')[0].split('-')[0].trim() || 'RN Scanlation',
          chapterTitle: title,
          currentUrl: chapterUrl,
          totalPages: 0,
          pages: [],
          isLocked: true,
          lockedReason: isPaywall 
            ? 'Capítulo bloqueado por el scan original (RN Scanlation). Este contenido requiere monedas o cuenta VIP en su sitio web oficial.'
            : 'No se encontraron imágenes disponibles para este capítulo en la fuente original.'
        };
      }

      return {
        mangaTitle: title.split('|')[0].split('-')[0].trim() || 'RN Scanlation',
        chapterTitle: title,
        currentUrl: chapterUrl,
        totalPages: pages.length,
        pages,
        isLocked: false
      };
    } catch (err) {
      console.error('[RN Scanlation Error] extractChapter:', err.message);
      return {
        mangaTitle: 'RN Scanlation',
        chapterTitle: 'Capítulo',
        currentUrl: chapterUrl,
        totalPages: 0,
        pages: [],
        error: 'No se pudo conectar con el servidor de RN Scanlation.',
        isLocked: false
      };
    }
  }

  getFallbackCatalog() {
    return [
      {
        id: 'un-guardia-rebelde-en-una-fantasia-medieval',
        title: 'Un Guardia Rebelde en una Fantasía Medieval',
        url: 'https://rncalation.online/comics/un-guardia-rebelde-en-una-fantasia-medieval',
        cover: 'https://rncalation.online/uploads/covers/un-guardia-rebelde-en-una-fantasia-medieval/cover-1788548549646.webp',
        latestChapter: 'Capítulo 22'
      },
      {
        id: 'oyaoyakodon',
        title: 'OYAOYAKODON',
        url: 'https://rncalation.online/comics/oyaoyakodon',
        cover: 'https://rncalation.online/uploads/covers/oyaoyakodon/cover-1788756473396.webp',
        latestChapter: 'Capítulo 1'
      }
    ];
  }
}

export default RNScanlationExtension;
