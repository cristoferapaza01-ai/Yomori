import { downloadService } from '../services/downloadService.js';
import path from 'path';
import fs from 'fs';

// Obtener estado en vivo de la cola de descargas
export const getDownloadQueue = (req, res) => {
  try {
    const queue = downloadService.getQueueStatus();
    return res.json({ success: true, data: queue });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Enviar capítulos a la cola de descargas
export const addChaptersToQueue = (req, res) => {
  try {
    const { chapters } = req.body;
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista de capítulos para descargar.' });
    }

    const result = downloadService.addToQueue(chapters);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Obtener mapa de todos los capítulos descargados actualmente en disco
export const getDownloadedStatus = (req, res) => {
  try {
    const statusMap = downloadService.getDownloadedStatusMap();
    return res.json({ success: true, data: statusMap });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Pausar y reanudar cola
export const pauseQueue = (req, res) => {
  try {
    const result = downloadService.pauseQueue();
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const resumeQueue = (req, res) => {
  try {
    const result = downloadService.resumeQueue();
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Cancelar descarga activa o en espera
export const cancelDownload = (req, res) => {
  try {
    const { chapterUrl } = req.body;
    if (!chapterUrl) return res.status(400).json({ success: false, message: 'Falta chapterUrl' });

    const result = downloadService.cancelDownload(chapterUrl);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Eliminar capítulo descargado físicamente de disco
export const deleteDownloadedChapter = (req, res) => {
  try {
    const chapterUrl = req.body.chapterUrl || req.query.chapterUrl;
    if (!chapterUrl) return res.status(400).json({ success: false, message: 'Falta chapterUrl' });

    const result = downloadService.deleteDownloadedChapter(chapterUrl);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Servir archivo de imagen local descargado para el lector offline
export const serveLocalPage = (req, res) => {
  try {
    const { chapterUrl, page } = req.query;
    if (!chapterUrl || !page) {
      return res.status(400).send('Faltan parámetros chapterUrl o page');
    }

    const filePath = downloadService.getLocalPagePath(chapterUrl, page);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('Página local no encontrada');
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif'
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }

    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).send('Error sirviendo viñeta local: ' + err.message);
  }
};
