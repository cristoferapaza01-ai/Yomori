import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class JKAnimeExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'jkanime-es',
      name: 'JKAnime',
      version: '1.1.0',
      baseUrl: 'https://jkanime.net',
      icon: 'https://jkanime.net/favicon.ico',
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
      return data;
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
      const url = page === 1 ? `${this.baseUrl}/` : `${this.baseUrl}/directorio/${page}/`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      const seen = new Set();

      $('div.anime__item, .anime-card, .portada-anime').each((_, el) => {
        const title = $(el).find('div.anime__item__text h5 a, h5 a, .title').text().trim();
        const relUrl = $(el).find('div.anime__item__text h5 a, h5 a, a').attr('href');
        const cover = $(el).find('div.anime__item__pic, .pic').attr('data-setbg') || $(el).find('img').attr('src');
        if (title && relUrl && !seen.has(relUrl)) {
          seen.add(relUrl);
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(cover)
          });
        }
      });

      if (items.length === 0) {
        $('a').each((_, el) => {
          const h = $(el).attr('href') || '';
          const img = $(el).find('img').attr('src') || $(el).attr('data-setbg') || '';
          const title = $(el).find('h5, h3, h2, span.title, p').text().trim() || $(el).attr('title') || '';
          if (h.startsWith('https://jkanime.net/') && !h.includes('/directorio') && !h.includes('/buscar') && !h.includes('/horario') && !h.includes('/top') && !h.includes('/genero') && h.split('/').filter(Boolean).length >= 4) {
            if (title && !seen.has(h)) {
              seen.add(h);
              items.push({ id: h, title, url: h, cover: this.normalizeUrl(img) });
            }
          }
        });
      }

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[JKAnimeExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/buscar/${encodeURIComponent(query)}/${page}/`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      const seen = new Set();

      $('div.anime__item, .anime-card, .portada-anime').each((_, el) => {
        const title = $(el).find('div.anime__item__text h5 a, h5 a, .title').text().trim();
        const relUrl = $(el).find('div.anime__item__text h5 a, h5 a, a').attr('href');
        const cover = $(el).find('div.anime__item__pic, .pic').attr('data-setbg') || $(el).find('img').attr('src');
        if (title && relUrl && !seen.has(relUrl)) {
          seen.add(relUrl);
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(cover)
          });
        }
      });

      if (items.length === 0) {
        $('a').each((_, el) => {
          const h = $(el).attr('href') || '';
          const img = $(el).find('img').attr('src') || $(el).attr('data-setbg') || '';
          const title = $(el).find('h5, h3, h2, span.title, p').text().trim() || $(el).attr('title') || '';
          if (h.startsWith('https://jkanime.net/') && !h.includes('/directorio') && !h.includes('/buscar') && h.split('/').filter(Boolean).length >= 4) {
            if (title && !seen.has(h)) {
              seen.add(h);
              items.push({ id: h, title, url: h, cover: this.normalizeUrl(img) });
            }
          }
        });
      }

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[JKAnimeExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const html = await this.fetchHtml(animeUrl);
      const $ = cheerio.load(html);

      const title = $('div.anime__details__title h3').text().trim() || $('h1').text().trim();
      const cover = this.normalizeUrl($('div.anime__details__pic').attr('data-setbg') || $('img').attr('src'));
      const synopsis = $('p.sinopsis').text().trim() || $('div.anime__details__text p').text().trim();
      const genres = $('div.anime__details__widget ul li:contains("Géneros") a').map((_, el) => $(el).text().trim()).get();

      const episodes = [];
      $('div.anime__pagination a').each((_, el) => {
        const epNumText = $(el).text().trim();
        const epNum = parseFloat(epNumText) || 1;
        const epUrl = $(el).attr('href');
        if (epUrl) {
          episodes.push({
            id: epUrl,
            number: epNum,
            name: `Episodio ${Math.floor(epNum)}`,
            url: this.normalizeUrl(epUrl)
          });
        }
      });

      return {
        title,
        cover,
        synopsis,
        genres,
        episodes: episodes.reverse()
      };
    } catch (error) {
      console.error(`[JKAnimeExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const html = await this.fetchHtml(episodeUrl);
      const $ = cheerio.load(html);
      const servers = [];

      $('iframe').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (src.includes('sibnet')) {
          servers.push({
            server: 'Sibnet',
            quality: '720p',
            url: src,
            isHls: false
          });
        } else if (src.includes('streamtape')) {
          servers.push({
            server: 'StreamTape',
            quality: '720p',
            url: src,
            isHls: false
          });
        }
      });

      return servers;
    } catch (error) {
      console.error(`[JKAnimeExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}
