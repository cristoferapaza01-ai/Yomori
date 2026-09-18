import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AnimeFenixExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'animefenix-es',
      name: 'AnimeFenix',
      version: '1.0.0',
      baseUrl: 'https://animefenix.tv',
      icon: 'https://animefenix.tv/favicon.ico',
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
      const url = `${this.baseUrl}/animes?page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('div.list-series article.serie-card').each((_, el) => {
        const title = $(el).find('h3.title').text().trim() || $(el).find('a').attr('title');
        const relUrl = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        if (title && relUrl) {
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(cover)
          });
        }
      });

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[AnimeFenixExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/animes?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('div.list-series article.serie-card').each((_, el) => {
        const title = $(el).find('h3.title').text().trim() || $(el).find('a').attr('title');
        const relUrl = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        if (title && relUrl) {
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(cover)
          });
        }
      });

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[AnimeFenixExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const html = await this.fetchHtml(animeUrl);
      const $ = cheerio.load(html);

      const title = $('h1.title').text().trim() || $('h1').text().trim();
      const cover = this.normalizeUrl($('div.serie-card img').attr('src') || $('img').attr('src'));
      const synopsis = $('p.sinopsis').text().trim();
      const genres = $('div.genres a').map((_, el) => $(el).text().trim()).get();

      const episodes = [];
      $('ul.episodes-list li a').each((index, el) => {
        const epName = $(el).text().trim();
        const epUrl = $(el).attr('href');
        const epNum = index + 1;
        if (epUrl) {
          episodes.push({
            id: epUrl,
            number: epNum,
            name: epName || `Episodio ${epNum}`,
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
      console.error(`[AnimeFenixExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const html = await this.fetchHtml(episodeUrl);
      const $ = cheerio.load(html);
      const servers = [];

      $('ul.player-tabs li button').each((_, el) => {
        const serverName = $(el).text().trim();
        const playerSrc = $(el).attr('data-player');
        if (playerSrc) {
          servers.push({
            server: serverName || 'Servidor HD',
            quality: '720p',
            url: playerSrc,
            isHls: playerSrc.includes('.m3u8')
          });
        }
      });

      return servers;
    } catch (error) {
      console.error(`[AnimeFenixExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}
