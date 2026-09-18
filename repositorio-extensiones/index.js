import { OlympusExtension } from './extensions/olympus.extension.js';
import { ZonTMOExtension } from './extensions/zontmo.extension.js';
import { JKAnimeExtension } from './extensions/jkanime.extension.js';
import { MonosChinosExtension } from './extensions/monoschinos.extension.js';
import { TioAnimeExtension } from './extensions/tioanime.extension.js';
import { AnimeFenixExtension } from './extensions/animefenix.extension.js';
import { AnimeOnlineNinjaExtension } from './extensions/animeonlineninja.extension.js';
import { AnimeAV1Extension } from './extensions/animeav1.extension.js';

// Registro centralizado de extensiones
export const registeredExtensions = [
  new OlympusExtension(),
  new ZonTMOExtension(),
  new JKAnimeExtension(),
  new MonosChinosExtension(),
  new TioAnimeExtension(),
  new AnimeFenixExtension(),
  new AnimeOnlineNinjaExtension(),
  new AnimeAV1Extension()
];

/**
 * Obtiene la lista de metadatos de las extensiones disponibles
 * @param {string} [type] - 'manga' | 'anime' | null
 */
export function getAvailableExtensions(type = null) {
  let list = registeredExtensions;
  if (type) {
    list = list.filter(ext => (ext.type || 'manga') === type);
  }
  return list.map(ext => ({
    id: ext.id,
    name: ext.name,
    version: ext.version,
    baseUrl: ext.baseUrl,
    icon: ext.icon,
    lang: ext.lang,
    type: ext.type || 'manga'
  }));
}

/**
 * Encuentra la extensión adecuada para una URL
 */
export function findExtensionForUrl(url) {
  if (!url) return null;
  return registeredExtensions.find(ext => ext.canHandle(url)) || null;
}

/**
 * Obtiene una extensión por su ID
 */
export function getExtensionById(id) {
  return registeredExtensions.find(ext => ext.id === id) || null;
}

export { BaseExtension } from './base/BaseExtension.js';
export { BaseAnimeExtension } from './base/BaseAnimeExtension.js';
export { BrowserManager } from './base/BrowserManager.js';
export { OlympusExtension } from './extensions/olympus.extension.js';
export { ZonTMOExtension } from './extensions/zontmo.extension.js';
export { JKAnimeExtension } from './extensions/jkanime.extension.js';
export { MonosChinosExtension } from './extensions/monoschinos.extension.js';
export { TioAnimeExtension } from './extensions/tioanime.extension.js';
export { AnimeFenixExtension } from './extensions/animefenix.extension.js';
export { AnimeOnlineNinjaExtension } from './extensions/animeonlineninja.extension.js';
export { AnimeAV1Extension } from './extensions/animeav1.extension.js';
