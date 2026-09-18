import { BaseAnimeExtension } from '../base/BaseAnimeExtension.js';
import { BrowserManager } from '../base/BrowserManager.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class AnimeFlvExtension extends BaseAnimeExtension {
  constructor() {
    super({
      id: 'animeflv-es',
      name: 'AnimeFLV',
      version: '1.1.0',
      baseUrl: 'https://animeflv.net',
      icon: 'https://animeflv.net/favicon.ico',
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
      // Fallback a BrowserManager (Puppeteer Stealth) si Axios es bloqueado
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
      const url = `${this.baseUrl}/browse?order=rating&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('ul.ListAnimes li article').each((_, el) => {
        const title = $(el).find('h3.Title').text().trim();
        const relUrl = $(el).find('a').attr('href');
        const thumb = $(el).find('div.Image figure img').attr('src');
        if (title && relUrl) {
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(thumb)
          });
        }
      });

      return {
        animes: items,
        hasNextPage: $('ul.pagination li.active + li').length > 0
      };
    } catch (error) {
      console.error(`[AnimeFlvExtension] getCatalog Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/browse?q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const items = [];
      $('ul.ListAnimes li article').each((_, el) => {
        const title = $(el).find('h3.Title').text().trim();
        const relUrl = $(el).find('a').attr('href');
        const thumb = $(el).find('div.Image figure img').attr('src');
        if (title && relUrl) {
          items.push({
            id: relUrl,
            title,
            url: this.normalizeUrl(relUrl),
            cover: this.normalizeUrl(thumb)
          });
        }
      });

      return {
        animes: items,
        hasNextPage: $('ul.pagination li.active + li').length > 0
      };
    } catch (error) {
      console.error(`[AnimeFlvExtension] search Error:`, error.message);
      return { animes: [], hasNextPage: false };
    }
  }

  async getAnimeDetails(animeUrl) {
    try {
      const html = await this.fetchHtml(animeUrl);
      const $ = cheerio.load(html);

      const title = $('h1.Title').text().trim();
      const cover = this.normalizeUrl($('div.Image figure img').attr('src'));
      const synopsis = $('div.Description p').text().trim();
      const genres = $('nav.NvGenres a').map((_, el) => $(el).text().trim()).get();

      const animeId = html.substringAfter('var anime_info = ["', '').substringBefore('"', '');
      const animeSlug = html.substringAfter(`var anime_info = ["${animeId}","`, '').substringBefore('"', '');
      const episodesData = html.substringAfter('var episodes = [', '').substringBefore('];', '');

      const episodes = [];
      if (episodesData) {
        const epPairs = episodesData.split('],[').map(str => str.replace(/\[|\]/g, '').trim());
        epPairs.forEach(pair => {
          const parts = pair.split(',');
          if (parts.length >= 2) {
            const epNum = parseFloat(parts[0]) || 1;
            episodes.push({
              id: `${animeSlug}-${epNum}`,
              number: epNum,
              name: `Episodio ${Math.floor(epNum)}`,
              url: `${this.baseUrl}/ver/${animeSlug}-${Math.floor(epNum)}`
            });
          }
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
      console.error(`[AnimeFlvExtension] getAnimeDetails Error:`, error.message);
      throw error;
    }
  }

  async getVideoServers(episodeUrl) {
    try {
      const html = await this.fetchHtml(episodeUrl);
      const servers = [];
      const videosScript = html.substringAfter('var videos = ', '').substringBefore(';', '');

      if (videosScript.includes('SWISH') || videosScript.includes('streamwish')) {
        const wishCode = videosScript.substringAfter('streamwish.top/e/', '').substringBefore('"', '');
        if (wishCode) {
          servers.push({
            server: 'StreamWish',
            quality: '720p',
            url: `https://streamwish.top/e/${wishCode}`,
            isHls: true
          });
        }
      }

      if (videosScript.includes('sibnet.ru')) {
        const sibnetId = videosScript.substringAfter('video.sibnet.ru/shell.php?videoid=', '').substringBefore('"', '');
        if (sibnetId) {
          servers.push({
            server: 'Sibnet',
            quality: '720p',
            url: `https://video.sibnet.ru/shell.php?videoid=${sibnetId}`,
            isHls: false
          });
        }
      }

      if (videosScript.includes('streamtape.com')) {
        const stCode = videosScript.substringAfter('streamtape.com/e/', '').substringBefore('"', '');
        if (stCode) {
          servers.push({
            server: 'StreamTape',
            quality: '720p',
            url: `https://streamtape.com/e/${stCode}`,
            isHls: false
          });
        }
      }

      return servers;
    } catch (error) {
      console.error(`[AnimeFlvExtension] getVideoServers Error:`, error.message);
      return [];
    }
  }
}

if (!String.prototype.substringAfter) {
  String.prototype.substringAfter = function(delim, fallback = '') {
    const pos = this.indexOf(delim);
    return pos === -1 ? fallback : this.substring(pos + delim.length);
  };
}
if (!String.prototype.substringBefore) {
  String.prototype.substringBefore = function(delim, fallback = '') {
    const pos = this.indexOf(delim);
    return pos === -1 ? fallback : this.substring(0, pos);
  };
}
