import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AnimeOnlineNinjaExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'animeonlineninja-es',
      name: 'AnimeOnlineNinja (Latino/Sub)',
      version: '1.0.0',
      baseUrl: 'https://www.animeonlineninja.com',
      icon: 'https://www.animeonlineninja.com/favicon.ico',
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
      const url = `${this.baseUrl}/anime/page/${page}/`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('article.post').each((_, el) => {
        const title = $(el).find('h3.title').text().trim() || $(el).find('img').attr('alt');
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
      console.error(`[AnimeOnlineNinjaExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('article.post').each((_, el) => {
        const title = $(el).find('h3.title').text().trim() || $(el).find('img').attr('alt');
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
      console.error(`[AnimeOnlineNinjaExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const html = await this.fetchHtml(animeUrl);
      const $ = cheerio.load(html);

      const title = $('h1').first().text().trim();
      const cover = this.normalizeUrl($('div.poster img').attr('src') || $('img').first().attr('src'));
      const synopsis = $('div.entry-content p').text().trim();
      const genres = $('div.sgenres a').map((_, el) => $(el).text().trim()).get();

      const episodes = [];
      $('ul.episodios li a').each((index, el) => {
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
      console.error(`[AnimeOnlineNinjaExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const html = await this.fetchHtml(episodeUrl);
      const $ = cheerio.load(html);
      const servers = [];

      $('iframe').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (src) {
          servers.push({
            server: 'Servidor Ninja',
            quality: '720p',
            url: src,
            isHls: src.includes('.m3u8')
          });
        }
      });

      return servers;
    } catch (error) {
      console.error(`[AnimeOnlineNinjaExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}
