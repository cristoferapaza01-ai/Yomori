import { BaseExtension } from '../base/BaseExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';

export class ZonTMOExtension extends BaseExtension {
  constructor() {
    super({
      id: 'zon-tmo',
      name: 'ZonTMO / TuMangaOnline',
      version: '1.1.0',
      baseUrl: 'https://zonatmo.com',
      icon: 'https://zonatmo.com/favicon.ico',
      lang: 'es'
    });

    this.knownDomains = [
      'zonatmo.com',
      'visortmo.com',
      'tmofans.com',
      'lectortmo.com',
      'tumangaonline.site',
      'zonatmo.me'
    ];
  }

  canHandle(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.knownDomains.some(domain => hostname.includes(domain) || domain.includes(hostname));
    } catch {
      return false;
    }
  }

  async extractChapter(chapterUrl) {
    let browser = null;
    try {
      // Si la URL es de tipo paginada, intentar convertir a modo cascada
      let targetUrl = chapterUrl;
      if (targetUrl.includes('/viewer/') && !targetUrl.includes('/cascade')) {
        targetUrl = targetUrl.replace(/\/paginated(\/.*)?$/, '/cascade');
        if (!targetUrl.includes('/cascade')) {
          targetUrl = targetUrl.replace(/\/viewer\/([^\/]+)(\/.*)?$/, '/viewer/$1/cascade');
        }
      }

      console.log(`[ZonTMOExtension] Navegando a: ${targetUrl}`);
      browser = await BrowserManager.launchBrowser();
      const page = await BrowserManager.setupPage(browser, {
        headers: {
          'Referer': this.baseUrl
        }
      });

      await page.goto(targetUrl, {
        waitUntil: ['domcontentloaded', 'networkidle2'],
        timeout: 45000
      });

      await new Promise(r => setTimeout(r, 2000));
      await BrowserManager.autoScroll(page, 20, 200);

      const result = await page.evaluate(() => {
        let pageTitle = document.title || 'Capítulo';
        let mangaTitle = '';
        let chapterTitle = '';

        const titleElem = document.querySelector('h1, .chapter-title, #app h2');
        if (titleElem) {
          mangaTitle = titleElem.textContent.trim();
        }

        // Buscar imágenes en el visor en cascada de TMO
        const imageElements = Array.from(document.querySelectorAll(
          '.viewer-container img, .content-img img, #app img.viewer-page, div.viewer-img img, img.viewer-image, .img-container img'
        ));

        const collected = [];
        const seen = new Set();

        const targets = imageElements.length > 0 ? imageElements : Array.from(document.querySelectorAll('main img, article img, img'));

        for (const img of targets) {
          const src = img.getAttribute('data-src') || 
                      img.getAttribute('data-lazy-src') || 
                      img.getAttribute('src') || 
                      img.currentSrc;

          if (src && !src.includes('logo') && !src.includes('avatar') && !src.includes('banner') && !src.startsWith('data:image')) {
            if (!seen.has(src)) {
              seen.add(src);
              collected.push(src);
            }
          }
        }

        // Detectar botones de anterior / siguiente
        const prevLink = document.querySelector('a.chapter-arrow-prev, a[rel="prev"], a.btn-prev');
        const nextLink = document.querySelector('a.chapter-arrow-next, a[rel="next"], a.btn-next');

        return {
          mangaTitle: mangaTitle || pageTitle,
          chapterTitle: chapterTitle || pageTitle,
          rawImages: collected,
          prevUrl: prevLink ? prevLink.getAttribute('href') : null,
          nextUrl: nextLink ? nextLink.getAttribute('href') : null
        };
      });

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
    } catch (error) {
      console.error(`[ZonTMOExtension] Error:`, error);
      throw new Error(`Fallo en extensión ZonTMO: ${error.message}`);
    } finally {
      await BrowserManager.safeClose(browser);
    }
  }
}
