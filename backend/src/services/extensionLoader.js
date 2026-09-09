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

const extensionsDir = getExtensionsDir();

if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

class ExtensionLoaderService {
  constructor() {
    this.loadedInstances = new Map();
  }

  /**
   * 1. Descarga físicamente el script .js desde scriptUrl usando axios y fs
   */
  async installExtension({ id, name, version, scriptUrl, baseUrl, icon, lang }) {
    if (!id || !scriptUrl) {
      throw new Error('Se requieren id y scriptUrl para instalar la extensión.');
    }

    console.log(`[ExtensionLoader] 📥 Descargando script .js para [${name || id}] desde: ${scriptUrl}`);
    
    // Descargar el código fuente en texto plano
    const response = await axios.get(scriptUrl, {
      responseType: 'text',
      timeout: 15000
    });

    const scriptContent = response.data;
    const targetFilePath = path.join(extensionsDir, `${id}.js`);

    // Guardar en disco local usando fs
    fs.writeFileSync(targetFilePath, scriptContent, 'utf-8');
    console.log(`[ExtensionLoader] 💾 Script guardado exitosamente en: ${targetFilePath}`);

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
      name: name || id,
      version: version || '1.0.0',
      baseUrl: baseUrl || '',
      icon: icon || '',
      lang: lang || 'es',
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
   * 2. Desinstala la extensión borrando el archivo físico con fs.unlinkSync
   */
  async uninstallExtension(id) {
    const targetFilePath = path.join(extensionsDir, `${id}.js`);
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
      console.log(`[ExtensionLoader] 🗑️ Archivo de script eliminado: ${targetFilePath}`);
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

    const scriptPath = path.join(extensionsDir, `${id}.js`);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`La extensión "${id}" no está instalada en el sistema de archivos local.`);
    }

    try {
      // Import dinámico de ES Module desde el sistema de archivos local
      const moduleUrl = `file://${scriptPath.replace(/\\/g, '/')}?t=${Date.now()}`;
      const module = await import(moduleUrl);
      const ExtensionClass = module.default || module[Object.keys(module)[0]];

      const metaPath = path.join(extensionsDir, 'installed.json');
      let extMeta = {};
      if (fs.existsSync(metaPath)) {
        const list = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        extMeta = list.find(e => e.id === id) || {};
      }

      const instance = new ExtensionClass(extMeta);
      this.loadedInstances.set(id, instance);
      console.log(`[ExtensionLoader] ⚡ Módulo [${id}] cargado dinámicamente en memoria`);
      return instance;
    } catch (err) {
      console.error(`[ExtensionLoader] Error cargando módulo [${id}]:`, err);
      throw new Error(`Error al instanciar script .js de ${id}: ${err.message}`);
    }
  }

  /**
   * 4. Lista las extensiones instaladas físicamente
   */
  getInstalledList() {
    const metaPath = path.join(extensionsDir, 'installed.json');
    if (fs.existsSync(metaPath)) {
      try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {}
    }
    return [];
  }
}

export const extensionLoader = new ExtensionLoaderService();
