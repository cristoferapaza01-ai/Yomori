/**
 * Clase Base estándar para extensiones de Scraping estilo Tachiyomi / Keiyoushi.
 */
export class BaseExtension {
  constructor({ id, name, version, baseUrl, icon, lang = 'es' }) {
    if (!id || !name || !baseUrl) {
      throw new Error('Cada extensión debe tener al menos: id, name y baseUrl');
    }
    this.id = id;
    this.name = name;
    this.version = version || '1.0.0';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.icon = icon || '';
    this.lang = lang;
  }

  canHandle(url) {
    if (!url) return false;
    try {
      const parsedUrl = new URL(url);
      const parsedBase = new URL(this.baseUrl);
      return parsedUrl.hostname.includes(parsedBase.hostname) || parsedBase.hostname.includes(parsedUrl.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el catálogo de mangas/cómics (Populares o Últimas Novedades)
   * @param {number} page
   * @returns {Promise<{ mangas: Array<{ id: string, title: string, url: string, cover: string, latestChapter?: string }>, hasNextPage: boolean }>}
   */
  async getCatalog(page = 1) {
    throw new Error(`El método getCatalog() debe ser implementado por la extensión ${this.name}`);
  }

  /**
   * Busca mangas/cómics por término o palabra clave
   * @param {string} query
   * @param {number} page
   */
  async search(query, page = 1) {
    throw new Error(`El método search() debe ser implementado por la extensión ${this.name}`);
  }

  /**
   * Obtiene los detalles de un manga (Sinopsis, portada, lista de capítulos)
   * @param {string} mangaUrl
   * @returns {Promise<{
   *   title: string,
   *   cover: string,
   *   synopsis: string,
   *   status: string,
   *   genres: string[],
   *   chapters: Array<{ id: string, name: string, chapterNumber: string, url: string, date?: string }>
   * }>}
   */
  async getMangaDetails(mangaUrl) {
    throw new Error(`El método getMangaDetails() debe ser implementado por la extensión ${this.name}`);
  }

  /**
   * Extrae la lista de imágenes de un capítulo para el lector vertical
   * @param {string} chapterUrl
   */
  async extractChapter(chapterUrl) {
    throw new Error(`El método extractChapter() debe ser implementado por la extensión ${this.name}`);
  }

  normalizeUrl(relativeOrAbsoluteUrl, baseUrl = this.baseUrl) {
    if (!relativeOrAbsoluteUrl) return '';
    const cleanUrl = relativeOrAbsoluteUrl.trim();
    if (cleanUrl.startsWith('//')) {
      return 'https:' + cleanUrl;
    }
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    try {
      return new URL(cleanUrl, baseUrl).toString();
    } catch {
      return cleanUrl;
    }
  }
}
