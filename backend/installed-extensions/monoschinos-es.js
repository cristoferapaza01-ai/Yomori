import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class MonosChinosExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'monoschinos-es',
      name: 'MonosChinos',
      version: '1.0.0',
      baseUrl: 'https://monoschinos2.net',
      icon: 'https://monoschinos2.net/favicon.ico',
      lang: 'es'
    });

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': this.baseUrl
    };
  }

  async getCatalog(page = 1) {
    try {
      const url = `${this.baseUrl}/animes?page=${page}`;
      const { data } = await axios.get(url, { headers: this.headers, timeout: 8000 });
      const $ = cheerio.load(data);

      const items = [];
      const seen = new Set();
      $('article, div.herobox article.series, .col-6, .col-md-3, .anime, .series-item').each((_, el) => {
        const title = $(el).find('h3.title, .title, h2, h3, h5').text().trim();
        const relUrl = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
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

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[MonosChinosExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/buscar?q=${encodeURIComponent(query)}&page=${page}`;
      const { data } = await axios.get(url, { headers: this.headers, timeout: 8000 });
      const $ = cheerio.load(data);

      const items = [];
      const seen = new Set();
      $('article, div.herobox article.series, .col-6, .col-md-3, .anime, .series-item').each((_, el) => {
        const title = $(el).find('h3.title, .title, h2, h3, h5').text().trim();
        const relUrl = $(el).find('a').attr('href');
        const cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
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

      return { animes: items, hasNextPage: items.length > 0 };
    } catch (error) {
      console.error(`[MonosChinosExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const { data } = await axios.get(animeUrl, { headers: this.headers });
      const $ = cheerio.load(data);

      const title = $('h1').text().trim();
      const cover = this.normalizeUrl($('div.series-thumb img').attr('src') || $('img').attr('src'));
      const synopsis = $('p.sinopsis').text().trim();
      const genres = $('div.genres a').map((_, el) => $(el).text().trim()).get();

      const episodes = [];
      $('div.episodes-list a').each((index, el) => {
        const epTitle = $(el).find('span').text().trim();
        const epUrl = $(el).attr('href');
        const epNum = index + 1;
        if (epUrl) {
          episodes.push({
            id: epUrl,
            number: epNum,
            name: epTitle || `Episodio ${epNum}`,
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
      console.error(`[MonosChinosExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const { data } = await axios.get(episodeUrl, { headers: this.headers });
      const $ = cheerio.load(data);
      const servers = [];

      $('button.play-video').each((_, el) => {
        const videoUrl = $(el).attr('data-player') || '';
        if (videoUrl.includes('sibnet')) {
          servers.push({
            server: 'Sibnet',
            quality: '720p',
            url: videoUrl,
            isHls: false
          });
        } else if (videoUrl.includes('streamtape')) {
          servers.push({
            server: 'StreamTape',
            quality: '720p',
            url: videoUrl,
            isHls: false
          });
        }
      });

      return servers;
    } catch (error) {
      console.error(`[MonosChinosExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}
