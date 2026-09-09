import { BaseExtension } from '../base/BaseExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';

export class OlympusExtension extends BaseExtension {
  constructor(config = {}) {
    super({
      id: config.id || 'olympus-scanlation',
      name: config.name || 'Olympus Scanlation',
      version: config.version || '2.1.0',
      baseUrl: config.baseUrl || 'https://olympusxyz.com',
      icon: config.icon || 'https://olympusxyz.com/olympus-logo-96.webp',
      lang: config.lang || 'es'
    });
  }

  async getCatalog(page = 1) {
    let pageInstance = null;
    try {
      console.log(`[OlympusExtension] Obteniendo catálogo (pág ${page})...`);
      const warm = await BrowserManager.createWarmPage({ headers: { 'Referer': this.baseUrl } });
      pageInstance = warm.page;

      const targetUrl = page === 1 ? `${this.baseUrl}/series` : `${this.baseUrl}/series?page=${page}`;
      await pageInstance.goto(targetUrl, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 30000 });
      await BrowserManager.autoScroll(pageInstance, 8, 150);

      const result = await pageInstance.evaluate((baseUrl) => {
        const mangas = [];
        const seen = new Set();
        const links = Array.from(document.querySelectorAll('a[href*="/series/comic-"], a[href*="/series/"]'));

        for (const a of links) {
          const url = a.href;
          if (url && !seen.has(url) && !url.endsWith('/series') && !url.endsWith('/series/')) {
            seen.add(url);
            const img = a.querySelector('img');
            const titleElem = a.querySelector('h2, h3, h4, p, span, .title');
            
            let title = (titleElem ? titleElem.textContent : '') || (img ? img.alt : '') || a.textContent || '';
            title = title.trim().replace(/\s+/g, ' ');

            let cover = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
            if (cover && !cover.startsWith('http')) cover = baseUrl + cover;

            const latestBadge = a.querySelector('.badge, .chapter, span[class*="chapter"]');
            const latestChapter = latestBadge ? latestBadge.textContent.trim() : '';

            if (title.length > 0 && !title.toLowerCase().includes('inicio') && !title.toLowerCase().includes('series')) {
              mangas.push({
                id: url.split('/series/').pop().split('?')[0],
                title,
                url,
                cover,
                latestChapter
              });
            }
          }
        }
        return { mangas, hasNextPage: mangas.length >= 20 };
      }, this.baseUrl);

      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        page,
        mangas: result.mangas,
        hasNextPage: result.hasNextPage
      };
    } finally {
      await BrowserManager.closePage(pageInstance);
    }
  }

  async search(query, page = 1) {
    let pageInstance = null;
    try {
      console.log(`[OlympusExtension] Buscando "${query}"...`);
      const warm = await BrowserManager.createWarmPage({ headers: { 'Referer': this.baseUrl } });
      pageInstance = warm.page;

      const searchUrl = `${this.baseUrl}/series?name=${encodeURIComponent(query)}`;
      await pageInstance.goto(searchUrl, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 30000 });
      await BrowserManager.autoScroll(pageInstance, 5, 150);

      const result = await pageInstance.evaluate((baseUrl, queryTerm) => {
        const mangas = [];
        const seen = new Set();
        const links = Array.from(document.querySelectorAll('a[href*="/series/comic-"], a[href*="/series/"]'));

        for (const a of links) {
          const url = a.href;
          if (url && !seen.has(url) && !url.endsWith('/series') && !url.endsWith('/series/')) {
            seen.add(url);
            const img = a.querySelector('img');
            const titleElem = a.querySelector('h2, h3, h4, p, span, .title');
            
            let title = (titleElem ? titleElem.textContent : '') || (img ? img.alt : '') || a.textContent || '';
            title = title.trim().replace(/\s+/g, ' ');

            let cover = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
            if (cover && !cover.startsWith('http')) cover = baseUrl + cover;

            if (title.length > 0) {
              mangas.push({
                id: url.split('/series/').pop().split('?')[0],
                title,
                url,
                cover
              });
            }
          }
        }
        const filtered = mangas.filter(m => m.title.toLowerCase().includes(queryTerm.toLowerCase()));
        return filtered.length > 0 ? filtered : mangas;
      }, this.baseUrl, query);

      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        query,
        mangas: result,
        hasNextPage: false
      };
    } finally {
      await BrowserManager.closePage(pageInstance);
    }
  }

  async getMangaDetails(mangaUrl) {
    let pageInstance = null;
    try {
      console.log(`[OlympusExtension] Obteniendo ficha: ${mangaUrl}`);
      const warm = await BrowserManager.createWarmPage({ headers: { 'Referer': this.baseUrl } });
      pageInstance = warm.page;

      await pageInstance.goto(mangaUrl, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 30000 });
      await BrowserManager.autoScroll(pageInstance, 8, 150);

      const details = await pageInstance.evaluate((baseUrl) => {
        const titleElem = document.querySelector('h1, h2.title');
        const title = titleElem ? titleElem.textContent.trim() : document.title;

        const coverElem = document.querySelector('img[src*="covers"], img[src*="comics"], .cover img, img[alt*="cover"]');
        let cover = coverElem ? (coverElem.src || coverElem.getAttribute('data-src') || '') : '';

        const synopsisElem = document.querySelector('p.sinopsis, div.sinopsis, p.description, div[class*="summary"] p, div[class*="synopsis"] p, article p');
        const synopsis = synopsisElem ? synopsisElem.textContent.trim() : '';

        const genreBadges = Array.from(document.querySelectorAll('a[href*="genero"], span[class*="badge"], div[class*="genre"] span'));
        const genres = genreBadges.map(g => g.textContent.trim()).filter(g => g.length > 1 && g.length < 30);

        let status = 'En emisión';
        const pageText = document.body.innerText;
        if (pageText.includes('Finalizado') || pageText.includes('Completado')) status = 'Finalizado';

        const chapterLinks = Array.from(document.querySelectorAll('a[href*="/capitulo/"]'));
        const chapters = [];
        const seenChapters = new Set();

        for (const a of chapterLinks) {
          const url = a.href;
          if (url && !seenChapters.has(url)) {
            seenChapters.add(url);
            let name = a.textContent.trim().replace(/\s+/g, ' ');
            if (!name || name.length < 2) {
              const numMatch = url.match(/capitulo\/(\d+)/);
              name = numMatch ? `Capítulo ${numMatch[1]}` : 'Capítulo';
            }

            const numMatch = name.match(/\d+(\.\d+)?/);
            const chapterNumber = numMatch ? numMatch[0] : '';

            const dateElem = a.querySelector('span[class*="date"], time, small');
            const date = dateElem ? dateElem.textContent.trim() : '';

            chapters.push({
              id: url.split('/capitulo/').pop(),
              name,
              chapterNumber,
              url,
              date
            });
          }
        }

        return { title, cover, synopsis, genres, status, chapters };
      }, this.baseUrl);

      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        url: mangaUrl,
        ...details
      };
    } finally {
      await BrowserManager.closePage(pageInstance);
    }
  }

  async extractChapter(chapterUrl) {
    let pageInstance = null;
    try {
      console.log(`[OlympusExtension] Extrayendo páginas: ${chapterUrl}`);
      const warm = await BrowserManager.createWarmPage({ headers: { 'Referer': this.baseUrl } });
      pageInstance = warm.page;

      await pageInstance.goto(chapterUrl, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 35000 });
      await new Promise(r => setTimeout(r, 1000));
      await BrowserManager.autoScroll(pageInstance, 12, 150);

      const result = await pageInstance.evaluate((baseUrl) => {
        let pageTitle = document.title || 'Capítulo';
        let mangaTitle = '';

        const h1 = document.querySelector('h1, h2.chapter-title, .title');
        if (h1) mangaTitle = h1.textContent.trim();

        const allImgs = Array.from(document.querySelectorAll('img'));
        const images = [];
        const seen = new Set();

        for (const img of allImgs) {
          const src = img.getAttribute('data-src') || 
                      img.getAttribute('data-lazy-src') || 
                      img.getAttribute('src') || 
                      img.currentSrc;

          if (src && !src.startsWith('data:image')) {
            const isMedia = src.includes('media') || 
                            src.includes('imagesolymp') || 
                            src.includes('comics') || 
                            src.includes('capitulo') ||
                            src.includes('.webp') ||
                            src.includes('.jpg') ||
                            src.includes('.png');

            const isExcluded = src.includes('logo') || src.includes('avatar') || src.includes('icon');

            if (isMedia && !isExcluded && !seen.has(src)) {
              seen.add(src);
              images.push(src);
            }
          }
        }

        let prevUrl = null;
        let nextUrl = null;
        const navLinks = Array.from(document.querySelectorAll('a[href*="capitulo"], a.btn-nav, button[data-href]'));
        
        for (const link of navLinks) {
          const text = (link.textContent || '').toLowerCase();
          const href = link.getAttribute('href') || link.getAttribute('data-href');
          if (href && (text.includes('ant') || text.includes('prev') || link.classList.contains('prev'))) prevUrl = href;
          if (href && (text.includes('sig') || text.includes('next') || link.classList.contains('next'))) nextUrl = href;
        }

        return {
          mangaTitle: mangaTitle || pageTitle,
          chapterTitle: pageTitle,
          rawImages: images,
          prevUrl,
          nextUrl
        };
      }, this.baseUrl);

      const pages = (result.rawImages || []).map((imgUrl, index) => ({
        index: index + 1,
        url: this.normalizeUrl(imgUrl, chapterUrl)
      }));

      return {
        success: true,
        extension: this.name,
        extensionId: this.id,
        mangaTitle: result.mangaTitle,
        chapterTitle: result.chapterTitle,
        currentUrl: chapterUrl,
        totalPages: pages.length,
        pages: pages,
        prevChapterUrl: result.prevUrl ? this.normalizeUrl(result.prevUrl, chapterUrl) : null,
        nextChapterUrl: result.nextUrl ? this.normalizeUrl(result.nextUrl, chapterUrl) : null
      };
    } finally {
      await BrowserManager.closePage(pageInstance);
    }
  }
}

export default OlympusExtension;
