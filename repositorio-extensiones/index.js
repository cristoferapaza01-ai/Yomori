import { OlympusExtension } from './extensions/olympus.extension.js';
import { ZonTMOExtension } from './extensions/zontmo.extension.js';

// Registro centralizado de extensiones
export const registeredExtensions = [
  new OlympusExtension(),
  new ZonTMOExtension()
];

/**
 * Obtiene la lista de metadatos de las extensiones disponibles
 */
export function getAvailableExtensions() {
  return registeredExtensions.map(ext => ({
    id: ext.id,
    name: ext.name,
    version: ext.version,
    baseUrl: ext.baseUrl,
    icon: ext.icon,
    lang: ext.lang
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
export { BrowserManager } from './base/BrowserManager.js';
export { OlympusExtension } from './extensions/olympus.extension.js';
export { ZonTMOExtension } from './extensions/zontmo.extension.js';
