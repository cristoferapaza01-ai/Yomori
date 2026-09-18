import { BaseExtension } from './BaseExtension.js';

/**
 * Clase Base específica para extensiones de Anime en Yomori PC (Streaming de Vídeo).
 */
export class BaseAnimeExtension extends BaseExtension {
  constructor({ id, name, version, baseUrl, icon, lang = 'es' }) {
    super({ id, name, version, baseUrl, icon, lang });
    this.type = 'anime';
  }

  /**
   * Obtiene la lista de episodios de un anime
   * @param {string} animeUrl
   * @returns {Promise<Array<{ id: string, number: number, name: string, url: string, date?: string }>>}
   */
  async getEpisodes(animeUrl) {
    throw new Error(`El método getEpisodes() debe ser implementado por ${this.name}`);
  }

  /**
   * Extrae los enlaces de vídeo disponibles para un episodio
   * @param {string} episodeUrl
   * @returns {Promise<Array<{ server: string, quality: string, url: string, isHls: boolean, headers?: Record<string, string> }>>}
   */
  async getVideoServers(episodeUrl) {
    throw new Error(`El método getVideoServers() debe ser implementado por ${this.name}`);
  }
}
