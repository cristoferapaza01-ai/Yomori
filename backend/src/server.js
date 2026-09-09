import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

// Server initialized v3
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: '*', // Permitir peticiones desde cualquier origen local o remoto
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rutas API
app.use('/api', apiRoutes);

// Servir frontend compilado para modo aplicación de escritorio nativa
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Manejador raíz informativo si no está compilado
  app.get('/', (req, res) => {
    res.json({
      name: 'Tachiyomi Desktop Engine',
      version: '1.0.0',
      description: 'Servidor backend y extractor en tiempo real para lector desktop de manga',
      endpoints: {
        health: '/api/health',
        extensions: '/api/extensions',
        extract: 'POST /api/extract { url: "..." }',
        downloads: '/api/downloads/queue'
      }
    });
  });
}

// Manejo de 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada en este servidor.`
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'Error no controlado en el servidor',
    error: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Tachiyomi Backend ejecutándose en: http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibles en: http://localhost:${PORT}/api`);
  console.log(`=================================================`);
});

