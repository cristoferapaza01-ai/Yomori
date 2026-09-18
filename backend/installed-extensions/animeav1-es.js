import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AnimeAV1Extension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'animeav1-es',
      name: 'AnimeAV1 (Predecesora AnimeFLV)',
      version: '1.0.0',
      baseUrl: 'https://animeav1.com',
      icon: 'https://animeav1.com/favicon.png',
      lang: 'es'
    });

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': this.baseUrl
    };
  }

  async fetchHtml(url) {
    try {
      const { data } = await axios.get(url, { headers: this.headers, timeout: 8000 });
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      let pageObj = null;
      try {
        pageObj = await BrowserManager.createWarmPage({ headers: this.headers });
        await pageObj.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const html = await pageObj.page.content();
        return html;
      } finally {
        if (pageObj?.page) await BrowserManager.closePage(pageObj.page);
      }
    }
  }

  async getCatalog(page = 1) {
    try {
      const url = page === 1 ? `${this.baseUrl}/catalogo` : `${this.baseUrl}/catalogo?page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('article').each((_, el) => {
        const title = $(el).find('h3').text().trim() || $(el).find('h1').text().trim() || $(el).find('img').attr('alt');
        const relUrl = $(el).find('a[href^="/media/"]').attr('href') || $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        if (title && relUrl && relUrl.includes('/media/')) {
          const cleanTitle = title.replace(/^Portada de /i, '').trim();
          const fullUrl = this.normalizeUrl(relUrl);
          if (!items.some(i => i.url === fullUrl)) {
            items.push({
              id: relUrl,
              title: cleanTitle,
              url: fullUrl,
              cover: this.normalizeUrl(cover)
            });
          }
        }
      });

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[AnimeAV1Extension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/catalogo?search=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('article').each((_, el) => {
        const title = $(el).find('h3').text().trim() || $(el).find('h1').text().trim() || $(el).find('img').attr('alt');
        const relUrl = $(el).find('a[href^="/media/"]').attr('href') || $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        if (title && relUrl && relUrl.includes('/media/')) {
          const cleanTitle = title.replace(/^Portada de /i, '').trim();
          const fullUrl = this.normalizeUrl(relUrl);
          if (!items.some(i => i.url === fullUrl)) {
            items.push({
              id: relUrl,
              title: cleanTitle,
              url: fullUrl,
              cover: this.normalizeUrl(cover)
            });
          }
        }
      });

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[AnimeAV1Extension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const html = await this.fetchHtml(animeUrl);
      const $ = cheerio.load(html);

      const title = $('h1').first().text().trim();
      const cover = this.normalizeUrl($('img.aspect-poster').attr('src') || $('img').first().attr('src'));
      const synopsis = $('div.entry p').text().trim() || $('p').first().text().trim();
      const genres = $('a[href*="genre="]').map((_, el) => $(el).text().trim()).get();

      const episodes = [];
      const animeSlug = animeUrl.split('/media/')[1]?.replace(/\/+$/, '') || '';

      // Extracción desde datos Svelte en el HTML
      const svelteMatch = html.match(/episodes:(\[\{.*?\}\])/);
      if (svelteMatch && svelteMatch[1]) {
        try {
          const jsonStr = svelteMatch[1].replace(/([a-zA-Z0-9_]+):/g, '"$1":');
          const parsedEps = JSON.parse(jsonStr);
          parsedEps.forEach(ep => {
            const num = ep.number || ep.id;
            episodes.push({
              id: `${animeSlug}-${num}`,
              number: num,
              name: `Episodio ${num}`,
              url: `${this.baseUrl}/media/${animeSlug}/${num}`
            });
          });
        } catch {}
      }

      // Fallback a enlaces en el DOM si Svelte JSON falla
      if (episodes.length === 0) {
        $('a[href*="/media/"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const parts = href.split('/').filter(Boolean);
          const epNum = parseFloat(parts[parts.length - 1]);
          if (!isNaN(epNum) && href.startsWith(`/media/${animeSlug}/`)) {
            const fullUrl = this.normalizeUrl(href);
            if (!episodes.some(e => e.url === fullUrl)) {
              episodes.push({
                id: `${animeSlug}-${epNum}`,
                number: epNum,
                name: `Episodio ${Math.floor(epNum)}`,
                url: fullUrl
              });
            }
          }
        });
      }

      return {
        title,
        cover,
        synopsis,
        genres: [...new Set(genres)],
        episodes: episodes.sort((a, b) => b.number - a.number)
      };
    } catch (error) {
      console.error(`[AnimeAV1Extension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const html = await this.fetchHtml(episodeUrl);
      const $ = cheerio.load(html);
      const servers = [];

      // 1. Extraer desde datos estructurados de SvelteKit / JSON en el HTML ({server:"...",url:"..."})
      const regex = /\{server:"([^"]+)",url:"([^"]+)"\}/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const [, serverName, serverUrl] = match;
        // Solo incluir URLs de streaming / reproducción embebida (evitar descargas directas)
        const isEmbed = serverUrl.includes('embed') || 
                        serverUrl.includes('/e/') || 
                        serverUrl.includes('/play/') || 
                        serverUrl.includes('uns.bio') || 
                        serverUrl.includes('player') || 
                        serverUrl.includes('.html') || 
                        serverUrl.includes('.m3u8') || 
                        serverUrl.includes('voe.sx') ||
                        serverUrl.includes('mega.nz/embed');

        if (isEmbed && !servers.some(s => s.url === serverUrl)) {
          servers.push({
            server: serverName || 'Servidor',
            quality: 'HD',
            url: serverUrl,
            isHls: serverUrl.includes('.m3u8') || serverName.toUpperCase().includes('HLS')
          });
        }
      }

      // 2. Extraer iframes del DOM
      $('iframe').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src && !servers.some(s => s.url === src)) {
          servers.unshift({
            server: 'Reproductor Principal (HD)',
            quality: '1080p/720p',
            url: src,
            isHls: src.includes('.m3u8')
          });
        }
      });

      // 3. Extraer botones de servidores alternativos si existen
      $('div.flex-wrap button.btn, [data-player], [data-server]').each((_, el) => {
        const btnText = $(el).text().trim();
        const playerSrc = $(el).attr('data-src') || $(el).attr('data-url') || $(el).attr('data-player') || '';
        if (playerSrc && !servers.some(s => s.url === playerSrc)) {
          servers.push({
            server: btnText || 'Servidor Alternativo',
            quality: '720p',
            url: playerSrc,
            isHls: playerSrc.includes('.m3u8')
          });
        }
      });

      return servers;
    } catch (error) {
      console.error(`[AnimeAV1Extension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}
