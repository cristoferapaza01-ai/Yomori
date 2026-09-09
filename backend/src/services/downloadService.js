import fs from 'fs';
import path from 'path';
import { extensionLoader } from './extensionLoader.js';

class DownloadService {
  constructor() {
    this.rootDir = path.join(process.cwd(), 'data');
    this.downloadsDir = path.join(this.rootDir, 'downloads');
    this.coversDir = path.join(this.rootDir, 'covers');
    this.databaseDir = path.join(this.rootDir, 'database');
    
    this.indexPath = path.join(this.databaseDir, 'downloads_index.json');
    this.queuePath = path.join(this.databaseDir, 'downloads_queue.json');

    this.queue = [];
    this.activeDownloads = new Map(); // id -> { item, cancelToken }
    this.downloadedIndex = {}; // chapterUrl -> item metadata
    this.isPaused = false;
    this.isProcessing = false;
    this.maxConcurrentChapters = 2;

    this.initStorage();
  }

  // Inicializar directorios de almacenamiento estilo Suwayomi
  initStorage() {
    try {
      if (!fs.existsSync(this.rootDir)) fs.mkdirSync(this.rootDir, { recursive: true });
      if (!fs.existsSync(this.downloadsDir)) fs.mkdirSync(this.downloadsDir, { recursive: true });
      if (!fs.existsSync(this.coversDir)) fs.mkdirSync(this.coversDir, { recursive: true });
      if (!fs.existsSync(this.databaseDir)) fs.mkdirSync(this.databaseDir, { recursive: true });

      if (fs.existsSync(this.indexPath)) {
        try {
          this.downloadedIndex = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
        } catch (e) {
          this.downloadedIndex = {};
        }
      } else {
        this.saveIndex();
      }

      if (fs.existsSync(this.queuePath)) {
        try {
          const savedQueue = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
          this.queue = (savedQueue || []).map(q => ({
            ...q,
            status: q.status === 'downloading' ? 'pending' : q.status
          })).filter(q => q.status === 'pending');
        } catch (e) {
          this.queue = [];
        }
      }

      console.log('[DownloadService] Sistema de almacenamiento Suwayomi inicializado en:', this.downloadsDir);
      console.log(`[DownloadService] Capítulos descargados registrados: ${Object.keys(this.downloadedIndex).length}`);
      
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 2000);
      }
    } catch (err) {
      console.error('[DownloadService] Error inicializando almacenamiento:', err);
    }
  }

  // Guardar índice de capítulos descargados en disco
  saveIndex() {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(this.downloadedIndex, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DownloadService] Error guardando índice:', err.message);
    }
  }

  // Guardar cola actual en disco
  saveQueue() {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DownloadService] Error guardando cola:', err.message);
    }
  }

  // Sanitizar nombres de carpetas y archivos para Windows
  sanitize(str = '') {
    return (str || '')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/[\s.]+/g, ' ')
      .trim()
      .slice(0, 80) || 'unnamed';
  }

  // Mapear nombre legible del scan
  getScanName(extensionId = '') {
    const map = {
      'skymangas': 'SkyMangas',
      'mangadex': 'MangaDex',
      'miauscan': 'MiauScan',
      'rn-scanlation': 'RN Scanlation',
      'olympus-scanlation': 'Olympus Scanlation',
      'manhwalatino': 'ManhwaLatino',
      'zonatmo': 'ZonaTMO',
      'ikigai-mnagas': 'Ikigai Mangas',
      'plot-twist-no-fansub': 'Plot Twist'
    };
    return map[extensionId] || extensionId || 'General';
  }

  // Obtener estado de todos los capítulos descargados
  getDownloadedStatusMap() {
    const statusMap = {};
    for (const [url, item] of Object.entries(this.downloadedIndex)) {
      statusMap[url] = {
        isDownloaded: true,
        downloadedAt: item.downloadedAt,
        pageCount: item.pageCount,
        folderPath: item.folderPath,
        chapterName: item.chapterName,
        mangaTitle: item.mangaTitle
      };
    }
    return statusMap;
  }

  // Comprobar si un capítulo específico está descargado
  isChapterDownloaded(chapterUrl) {
    return !!this.downloadedIndex[chapterUrl];
  }

  // Obtener datos del capítulo descargado para lectura offline
  getDownloadedChapter(chapterUrl) {
    const item = this.downloadedIndex[chapterUrl];
    if (!item) return null;

    if (!fs.existsSync(item.folderPath)) {
      delete this.downloadedIndex[chapterUrl];
      this.saveIndex();
      return null;
    }

    const jsonPath = path.join(item.folderPath, 'chapter.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return {
          ...meta,
          isOffline: true,
          pages: (meta.pages || []).map((p, idx) => ({
            page: idx + 1,
            url: `/api/downloads/page?chapterUrl=${encodeURIComponent(chapterUrl)}&page=${idx + 1}`,
            localUrl: `/api/downloads/page?chapterUrl=${encodeURIComponent(chapterUrl)}&page=${idx + 1}`,
            isOffline: true
          }))
        };
      } catch (e) {}
    }

    const files = fs.readdirSync(item.folderPath)
      .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    return {
      mangaTitle: item.mangaTitle,
      chapterTitle: item.chapterName,
      chapterNumber: item.chapterNumber,
      totalPages: files.length,
      currentUrl: chapterUrl,
      isOffline: true,
      pages: files.map((f, idx) => ({
        page: idx + 1,
        url: `/api/downloads/page?chapterUrl=${encodeURIComponent(chapterUrl)}&page=${idx + 1}`,
        localUrl: `/api/downloads/page?chapterUrl=${encodeURIComponent(chapterUrl)}&page=${idx + 1}`,
        isOffline: true
      }))
    };
  }

  // Obtener la ruta de un archivo de página local
  getLocalPagePath(chapterUrl, pageNumber) {
    const item = this.downloadedIndex[chapterUrl];
    if (!item || !fs.existsSync(item.folderPath)) return null;

    const files = fs.readdirSync(item.folderPath)
      .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    const targetIdx = parseInt(pageNumber, 10) - 1;
    if (targetIdx >= 0 && targetIdx < files.length) {
      return path.join(item.folderPath, files[targetIdx]);
    }
    return null;
  }

  // Añadir capítulos a la cola de descarga
  addToQueue(chaptersToAdd = []) {
    const addedItems = [];

    for (const ch of chaptersToAdd) {
      if (!ch.chapterUrl) continue;
      
      if (this.downloadedIndex[ch.chapterUrl]) continue;
      if (this.queue.some(q => q.chapterUrl === ch.chapterUrl)) continue;

      const scanName = ch.scanName || this.getScanName(ch.extensionId);
      const cleanManga = this.sanitize(ch.mangaTitle || 'Manga');
      const cleanCh = this.sanitize(ch.chapterName || `Capitulo ${ch.chapterNumber || '1'}`);

      const targetFolder = path.join(this.downloadsDir, this.sanitize(scanName), cleanManga, cleanCh);

      const queueItem = {
        id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        chapterUrl: ch.chapterUrl,
        mangaUrl: ch.mangaUrl || '',
        mangaTitle: ch.mangaTitle || 'Manga',
        chapterName: ch.chapterName || `Capítulo ${ch.chapterNumber || '1'}`,
        chapterNumber: String(ch.chapterNumber || '1'),
        extensionId: ch.extensionId || 'olympus-scanlation',
        scanName,
        cover: ch.cover || '',
        folderPath: targetFolder,
        totalPages: 0,
        downloadedPages: 0,
        progress: 0,
        status: 'pending',
        errorMsg: null,
        addedAt: new Date().toISOString()
      };

      this.queue.push(queueItem);
      addedItems.push(queueItem);
    }

    this.saveQueue();
    this.processQueue();
    return { success: true, addedCount: addedItems.length, queue: this.getQueueStatus() };
  }

  // Obtener estado completo de la cola
  getQueueStatus() {
    return {
      isPaused: this.isPaused,
      activeCount: this.activeDownloads.size,
      totalQueueCount: this.queue.length,
      items: this.queue.map(q => ({
        id: q.id,
        chapterUrl: q.chapterUrl,
        mangaTitle: q.mangaTitle,
        chapterName: q.chapterName,
        chapterNumber: q.chapterNumber,
        scanName: q.scanName,
        cover: q.cover,
        totalPages: q.totalPages,
        downloadedPages: q.downloadedPages,
        progress: q.progress,
        status: q.status,
        errorMsg: q.errorMsg
      }))
    };
  }

  pauseQueue() {
    this.isPaused = true;
    return this.getQueueStatus();
  }

  resumeQueue() {
    this.isPaused = false;
    this.processQueue();
    return this.getQueueStatus();
  }

  cancelDownload(chapterUrl) {
    const idx = this.queue.findIndex(q => q.chapterUrl === chapterUrl);
    if (idx !== -1) {
      const item = this.queue[idx];
      this.queue.splice(idx, 1);
      this.saveQueue();

      if (this.activeDownloads.has(item.id)) {
        const active = this.activeDownloads.get(item.id);
        active.cancelled = true;
        this.activeDownloads.delete(item.id);
      }
    }
    return this.getQueueStatus();
  }

  deleteDownloadedChapter(chapterUrl) {
    const item = this.downloadedIndex[chapterUrl];
    if (item) {
      try {
        if (fs.existsSync(item.folderPath)) {
          fs.rmSync(item.folderPath, { recursive: true, force: true });
        }
        delete this.downloadedIndex[chapterUrl];
        this.saveIndex();
        console.log('[DownloadService] Capítulo eliminado de disco:', item.folderPath);
        return { success: true, message: 'Capítulo eliminado correctamente del disco.' };
      } catch (err) {
        console.error('[DownloadService] Error eliminando carpeta:', err.message);
        return { success: false, error: err.message };
      }
    }
    return { success: false, message: 'El capítulo no estaba registrado como descargado.' };
  }

  async processQueue() {
    if (this.isPaused || this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (!this.isPaused && this.activeDownloads.size < this.maxConcurrentChapters) {
        const nextItem = this.queue.find(q => q.status === 'pending');
        if (!nextItem) break;

        nextItem.status = 'downloading';
        const controlObj = { item: nextItem, cancelled: false };
        this.activeDownloads.set(nextItem.id, controlObj);
        this.saveQueue();

        this.downloadChapterTask(nextItem, controlObj).finally(() => {
          this.activeDownloads.delete(nextItem.id);
          this.saveQueue();
          this.processQueue();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async downloadChapterTask(item, controlObj) {
    console.log(`[DownloadService] ⏳ Iniciando descarga de [${item.mangaTitle}] - ${item.chapterName} en: ${item.folderPath}`);
    try {
      if (!fs.existsSync(item.folderPath)) {
        fs.mkdirSync(item.folderPath, { recursive: true });
      }

      const extension = await extensionLoader.getExtensionInstance(item.extensionId);
      const chapterData = await extension.extractChapter(item.chapterUrl);

      if (controlObj.cancelled) return;

      if (!chapterData || !chapterData.pages || chapterData.pages.length === 0) {
        throw new Error('No se encontraron páginas para este capítulo en el scan.');
      }

      const pages = chapterData.pages;
      item.totalPages = pages.length;
      item.downloadedPages = 0;
      item.progress = 0;
      this.saveQueue();

      const downloadedFiles = [];

      for (let i = 0; i < pages.length; i++) {
        if (controlObj.cancelled || this.isPaused) break;

        const pageObj = pages[i];
        const pageUrl = typeof pageObj === 'string' ? pageObj : (pageObj?.originalUrl || pageObj?.url || pageObj?.proxyUrl || '');
        const padIndex = String(i + 1).padStart(3, '0');
        const extMatch = (pageUrl || '').match(/\.(jpe?g|png|webp|avif)/i);
        const fileExt = extMatch ? extMatch[0].toLowerCase() : '.jpg';
        const fileName = `${padIndex}${fileExt}`;
        const filePath = path.join(item.folderPath, fileName);

        let success = false;
        for (let retry = 1; retry <= 3; retry++) {
          try {
            await this.downloadImageFile(pageUrl, filePath, extension.baseUrl);
            success = true;
            break;
          } catch (dlErr) {
            console.warn(`[DownloadService] Reintento ${retry}/3 página ${i + 1}: ${dlErr.message}`);
            await new Promise(r => setTimeout(r, 1000 * retry));
          }
        }

        if (success) {
          downloadedFiles.push(fileName);
          item.downloadedPages = i + 1;
          item.progress = Math.round(((i + 1) / pages.length) * 100);
          this.saveQueue();
        }
      }

      if (controlObj.cancelled) {
        if (fs.existsSync(item.folderPath)) fs.rmSync(item.folderPath, { recursive: true, force: true });
        return;
      }

      const meta = {
        mangaTitle: item.mangaTitle,
        chapterTitle: item.chapterName,
        chapterNumber: item.chapterNumber,
        extensionId: item.extensionId,
        scanName: item.scanName,
        sourceUrl: item.chapterUrl,
        downloadedAt: new Date().toISOString(),
        pageCount: downloadedFiles.length,
        pages: downloadedFiles
      };
      fs.writeFileSync(path.join(item.folderPath, 'chapter.json'), JSON.stringify(meta, null, 2), 'utf-8');

      this.downloadedIndex[item.chapterUrl] = {
        chapterUrl: item.chapterUrl,
        mangaUrl: item.mangaUrl,
        mangaTitle: item.mangaTitle,
        chapterName: item.chapterName,
        chapterNumber: item.chapterNumber,
        extensionId: item.extensionId,
        scanName: item.scanName,
        folderPath: item.folderPath,
        pageCount: downloadedFiles.length,
        downloadedAt: new Date().toISOString()
      };
      this.saveIndex();

      const qIdx = this.queue.findIndex(q => q.id === item.id);
      if (qIdx !== -1) {
        this.queue.splice(qIdx, 1);
        this.saveQueue();
      }

      console.log(`[DownloadService] ✅ Descarga completada con éxito: [${item.mangaTitle}] - ${item.chapterName} (${downloadedFiles.length} páginas)`);

    } catch (err) {
      console.error(`[DownloadService] ❌ Fallo descargando [${item.mangaTitle}] - ${item.chapterName}:`, err.message);
      item.status = 'error';
      item.errorMsg = err.message;
      this.saveQueue();
    }
  }

  async downloadImageFile(imageUrl, targetPath, referer) {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': referer || 'https://google.com',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar imagen`);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetPath, buffer);
  }
}

export const downloadService = new DownloadService();
