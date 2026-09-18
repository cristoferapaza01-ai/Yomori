import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

function getExtensionsDir() {
  if (process.env.YOMORI_EXTENSIONS_DIR) {
    return process.env.YOMORI_EXTENSIONS_DIR;
  }
  if (!backendRoot.includes('app.asar')) {
    return path.join(backendRoot, 'installed-extensions');
  }
  const appData = process.env.APPDATA || path.join(os.homedir(), '.yomori');
  return path.join(appData, 'Yomori', 'installed-extensions');
}

function getRepoExtensionsDir() {
  return path.resolve(backendRoot, '..', 'repositorio-extensiones', 'extensions');
}

const extensionsDir = getExtensionsDir();
const repoExtensionsDir = getRepoExtensionsDir();

if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

// Catálogo predefinido de extensiones oficiales integradas (Manga & Anime)
const BUILTIN_EXTENSIONS = [
  // --- FUENTES DE MANGA ---
  {
    id: 'olympus-scanlation',
    name: 'Olympus Scanlation',
    version: '1.2.0',
    type: 'manga',
    baseUrl: 'https://olympusscans.com',
    icon: 'https://olympusscans.com/favicon.ico',
    lang: 'es',
    file: 'olympus.extension.js',
    description: 'Scanlation oficial de Manhwas y Novelas en Español'
  },
  {
    id: 'zonatmo',
    name: 'ZonaTMO',
    version: '1.2.0',
    type: 'manga',
    baseUrl: 'https://visortmo.com',
    icon: 'https://visortmo.com/favicon.ico',
    lang: 'es',
    file: 'zontmo.extension.js',
    description: 'El mayor agregador y comunidad de Manga y Manhwa en Español'
  },

  // --- FUENTES DE ANIME ---
  {
    id: 'jkanime-es',
    name: 'JKAnime',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://jkanime.net',
    icon: 'https://jkanime.net/favicon.ico',
    lang: 'es',
    file: 'jkanime.extension.js',
    description: 'Anime online en alta definición, estrenos diarios'
  },
  {
    id: 'animefenix-es',
    name: 'AnimeFénix',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://animefenix.tv',
    icon: 'https://animefenix.tv/favicon.ico',
    lang: 'es',
    file: 'animefenix.extension.js',
    description: 'Animes en audio Latino y subtitulado sin esperas'
  },
  {
    id: 'tioanime-es',
    name: 'TioAnime',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://tioanime.com',
    icon: 'https://tioanime.com/favicon.ico',
    lang: 'es',
    file: 'tioanime.extension.js',
    description: 'Transmisión ultra rápida y ligera de episodios de Anime'
  },
  {
    id: 'monoschinos-es',
    name: 'MonosChinos',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://monoschinos2.net',
    icon: 'https://monoschinos2.net/favicon.ico',
    lang: 'es',
    file: 'monoschinos.extension.js',
    description: 'Catálogo completo de animes clásicos y en emisión'
  },
  {
    id: 'animeonlineninja-es',
    name: 'AnimeOnline.Ninja',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://ww3.animeonline.ninja',
    icon: 'https://ww3.animeonline.ninja/favicon.ico',
    lang: 'es',
    file: 'animeonlineninja.extension.js',
    description: 'Películas, OVAs y series completas de anime'
  },
  {
    id: 'animeav1-es',
    name: 'AnimeAV1',
    version: '1.2.0',
    type: 'anime',
    baseUrl: 'https://animeav1.com',
    icon: 'https://animeav1.com/favicon.ico',
    lang: 'es',
    file: 'animeav1.extension.js',
    description: 'Anime en codec AV1 y máxima calidad visual'
  }
];

class ExtensionLoaderService {
  constructor() {
    this.loadedInstances = new Map();
  }

  /**
   * Obtiene la lista de extensiones disponibles en el repositorio local
   */
  getAvailableExtensions(type = null) {
    if (type) {
      return BUILTIN_EXTENSIONS.filter(ext => ext.type === type);
    }
    return BUILTIN_EXTENSIONS;
  }

  /**
   * 1. Instala la extensión en disco (descarga o copia de repositorio local)
   */
  async installExtension({ id, name, version, scriptUrl, baseUrl, icon, lang, type }) {
    if (!id) {
      throw new Error('Se requiere id para instalar la extensión.');
    }

    const matchedBuiltin = BUILTIN_EXTENSIONS.find(e => e.id === id || e.id.replace(/-es$/, '') === id);
    const extType = type || matchedBuiltin?.type || (id.includes('anime') ? 'anime' : 'manga');
    const extName = name || matchedBuiltin?.name || id;
    const extVersion = version || matchedBuiltin?.version || '1.0.0';
    const extBaseUrl = baseUrl || matchedBuiltin?.baseUrl || '';
    const extIcon = icon || matchedBuiltin?.icon || '';
    const extLang = lang || matchedBuiltin?.lang || 'es';

    const targetFilePath = path.join(extensionsDir, `${id}.js`);
    let scriptSaved = false;

    // Intentar descargar si hay scriptUrl válido
    if (scriptUrl && scriptUrl.startsWith('http')) {
      try {
        console.log(`[ExtensionLoader] 📥 Descargando script .js para [${extName}] desde: ${scriptUrl}`);
        const response = await axios.get(scriptUrl, { responseType: 'text', timeout: 8000 });
        if (response.data && response.data.length > 50) {
          fs.writeFileSync(targetFilePath, response.data, 'utf-8');
          scriptSaved = true;
        }
      } catch (err) {
        console.warn(`[ExtensionLoader] Descarga remota falló para [${id}], usando archivo local:`, err.message);
      }
    }

    // Si no se descargó remotamente, copiar desde repositorio local
    if (!scriptSaved && matchedBuiltin?.file) {
      const localSourcePath = path.join(repoExtensionsDir, matchedBuiltin.file);
      if (fs.existsSync(localSourcePath)) {
        fs.copyFileSync(localSourcePath, targetFilePath);
        scriptSaved = true;
        console.log(`[ExtensionLoader] ⚡ Copiado script local para [${extName}] desde: ${localSourcePath}`);
      }
    }

    // Si aún no está guardado, buscar cualquier archivo coincidente
    if (!scriptSaved) {
      const candidates = [
        `${id}.extension.js`,
        `${id.replace(/-es$/, '')}.extension.js`,
        `${id}.js`
      ];
      for (const cand of candidates) {
        const p = path.join(repoExtensionsDir, cand);
        if (fs.existsSync(p)) {
          fs.copyFileSync(p, targetFilePath);
          scriptSaved = true;
          break;
        }
      }
    }

    // Guardar o actualizar metadatos locales
    const metaPath = path.join(extensionsDir, 'installed.json');
    let installedList = [];
    if (fs.existsSync(metaPath)) {
      try {
        installedList = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {}
    }

    const extMeta = {
      id,
      name: extName,
      version: extVersion,
      baseUrl: extBaseUrl,
      icon: extIcon,
      lang: extLang,
      type: extType,
      scriptFile: `${id}.js`,
      installedAt: new Date().toISOString()
    };

    installedList = [...installedList.filter(e => e.id !== id), extMeta];
    fs.writeFileSync(metaPath, JSON.stringify(installedList, null, 2), 'utf-8');

    // Limpiar instancia previa de la memoria para forzar recarga
    this.loadedInstances.delete(id);

    return extMeta;
  }

  /**
   * 2. Desinstala la extensión borrando el archivo físico
   */
  async uninstallExtension(id) {
    const targetFilePath = path.join(extensionsDir, `${id}.js`);
    if (fs.existsSync(targetFilePath)) {
      try { fs.unlinkSync(targetFilePath); } catch {}
    }

    const metaPath = path.join(extensionsDir, 'installed.json');
    if (fs.existsSync(metaPath)) {
      try {
        const list = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const filtered = list.filter(e => e.id !== id);
        fs.writeFileSync(metaPath, JSON.stringify(filtered, null, 2), 'utf-8');
      } catch {}
    }

    this.loadedInstances.delete(id);
    return { success: true, message: `Extensión ${id} desinstalada` };
  }

  /**
   * 3. Carga dinámicamente el módulo JavaScript guardado en disco con import()
   */
  async getExtensionInstance(id) {
    if (this.loadedInstances.has(id)) {
      return this.loadedInstances.get(id);
    }

    let scriptPath = path.join(extensionsDir, `${id}.js`);
    
    // Si no está en installed-extensions, buscar en repoExtensionsDir
    if (!fs.existsSync(scriptPath)) {
      const matched = BUILTIN_EXTENSIONS.find(e => e.id === id || e.id.replace(/-es$/, '') === id);
      if (matched?.file && fs.existsSync(path.join(repoExtensionsDir, matched.file))) {
        scriptPath = path.join(repoExtensionsDir, matched.file);
      } else {
        const fallbackCandidates = [
          path.join(repoExtensionsDir, `${id}.extension.js`),
          path.join(repoExtensionsDir, `${id.replace(/-es$/, '')}.extension.js`),
          path.join(repoExtensionsDir, `${id}.js`)
        ];
        const found = fallbackCandidates.find(p => fs.existsSync(p));
        if (found) {
          scriptPath = found;
        } else {
          throw new Error(`La extensión "${id}" no está instalada en el sistema.`);
        }
      }
    }

    try {
      const moduleUrl = `file://${scriptPath.replace(/\\/g, '/')}?t=${Date.now()}`;
      const module = await import(moduleUrl);
      const ExtensionClass = module.default || module[Object.keys(module)[0]];

      const matchedBuiltin = BUILTIN_EXTENSIONS.find(e => e.id === id);
      const extMeta = matchedBuiltin || { id, name: id };

      const instance = new ExtensionClass(extMeta);
      this.loadedInstances.set(id, instance);
      console.log(`[ExtensionLoader] ⚡ Módulo [${id}] cargado dinámicamente en memoria`);
      return instance;
    } catch (err) {
      console.error(`[ExtensionLoader] Error cargando módulo [${id}]:`, err);
      throw new Error(`Error al instanciar script de ${id}: ${err.message}`);
    }
  }

  /**
   * 4. Lista las extensiones instaladas físicamente
   */
  getInstalledList() {
    const metaPath = path.join(extensionsDir, 'installed.json');
    if (fs.existsSync(metaPath)) {
      try {
        const list = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {}
    }
    return [];
  }
}

export const extensionLoader = new ExtensionLoaderService();
