import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class TioAnimeExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'tioanime-es',
      name: 'TioAnime',
      version: '1.0.0',
      baseUrl: 'https://tioanime.com',
      icon: 'https://tioanime.com/favicon.ico',
      lang: 'es'
    });

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': this.baseUrl
    };
  }

  async getCatalog(page = 1) {
    try {
      const url = `${this.baseUrl}/directorio?p=${page}`;
      const { data } = await axios.get(url, { headers: this.headers, timeout: 8000 });
      const $ = cheerio.load(data);

      const items = [];
      const seen = new Set();
      $('article.anime, ul.animes li, .anime-card').each((_, el) => {
        const title = $(el).find('h3.title, .title, h3').text().trim();
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
      console.error(`[TioAnimeExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/directorio?q=${encodeURIComponent(query)}&p=${page}`;
      const { data } = await axios.get(url, { headers: this.headers, timeout: 8000 });
      const $ = cheerio.load(data);

      const items = [];
      const seen = new Set();
      $('article.anime, ul.animes li, .anime-card').each((_, el) => {
        const title = $(el).find('h3.title, .title, h3').text().trim();
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
      console.error(`[TioAnimeExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const { data } = await axios.get(animeUrl, { headers: this.headers });
      const $ = cheerio.load(data);

      const title = $('h1.title').text().trim();
      const cover = this.normalizeUrl($('div.thumb figure img').attr('src'));
      const synopsis = $('p.sinopsis').text().trim();
      const genres = $('p.genres span.badge a').map((_, el) => $(el).text().trim()).get();

      const animeSlug = animeUrl.substringAfterLast('/');
      const episodes = [];

      const episodesData = data.substringAfter('var episodes = [', '').substringBefore('];', '');
      if (episodesData) {
        const epNums = episodesData.split(',').map(str => parseFloat(str.trim())).filter(n => !isNaN(n));
        epNums.forEach(num => {
          const epUrl = `${this.baseUrl}/ver/${animeSlug}-${Math.floor(num)}`;
          episodes.push({
            id: epUrl,
            number: num,
            name: `Episodio ${Math.floor(num)}`,
            url: epUrl
          });
        });
      }

      return {
        title,
        cover,
        synopsis,
        genres,
        episodes
      };
    } catch (error) {
      console.error(`[TioAnimeExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const { data } = await axios.get(episodeUrl, { headers: this.headers });
      const servers = [];
      const videosData = data.substringAfter('var videos = [', '').substringBefore('];', '');

      if (videosData.includes('sibnet')) {
        const sibnetId = videosData.substringAfter('sibnet.ru/shell.php?videoid=', '').substringBefore('"', '');
        if (sibnetId) {
          servers.push({
            server: 'Sibnet',
            quality: '720p',
            url: `https://video.sibnet.ru/shell.php?videoid=${sibnetId}`,
            isHls: false
          });
        }
      }

      return servers;
    } catch (error) {
      console.error(`[TioAnimeExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}

// Polyfill
if (!String.prototype.substringAfterLast) {
  String.prototype.substringAfterLast = function(delim, fallback = '') {
    const pos = this.lastIndexOf(delim);
    return pos === -1 ? fallback : this.substring(pos + delim.length);
  };
}
