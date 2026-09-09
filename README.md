# 📖 Tachiyomi Web & Keiyoushi Extensions Hub

Arquitectura 100% desacoplada inspirada en el ecosistema **Tachiyomi (Lector)** y **Keiyoushi (Repositorio de Extensiones)**.

---

## 🏛️ Las Dos Plataformas Independientes

```
tachiyomi-web/
├── keiyoushi-repo-server/        # PLATAFORMA 1: Servidor de Repositorio de Extensiones (Puerto 5000)
│   ├── config/
│   │   └── registry.json         # Registro manual de Scans, URLs y scripts de scraping
│   ├── extensions/               # Scripts de scraping independientes (.js)
│   │   ├── olympus.js            # Extractor Olympus Scanlation (https://olympusxyz.com)
│   │   └── zontmo.js             # Extractor ZonTMO / TuMangaOnline
│   ├── base/
│   │   ├── BaseExtension.js      # Clase abstracta con contrato Keiyoushi
│   │   └── BrowserManager.js     # Browser Pool caliente de Chromium + Stealth
│   ├── src/
│   │   └── server.js             # Servidor que entrega /index.json y ejecuta APIs
│   └── package.json
│
└── frontend/                     # PLATAFORMA 2: Lector Web Tachiyomi (Puerto 3001)
    ├── src/
    │   ├── components/
    │   │   ├── ExtensionsModal.jsx # Gestor de repositorios remotos y activador de extensiones
    │   │   ├── LibraryView.jsx     # Mi Biblioteca con categorías y seguimiento
    │   │   ├── CatalogView.jsx     # Explorador de fuentes dinámicas
    │   │   ├── MangaDetailsView.jsx# Ficha con sinopsis y lista de capítulos
    │   │   ├── Reader.jsx          # Lector (Webtoon vertical continuo y Paginado Manga/Cómic)
    │   │   └── FloatingControls.jsx# Barra flotante con slider de páginas
    │   └── App.jsx
    └── vite.config.js
```

---

## 🚀 Cómo Iniciar Ambas Plataformas

### 1. Iniciar Plataforma 1: Repositorio Keiyoushi
En una terminal:
```bash
cd tachiyomi-web/keiyoushi-repo-server
npm start
```
* Tu manifest Keiyoushi estará disponible en: **`http://localhost:5000/index.json`**

### 2. Iniciar Plataforma 2: Lector Web Tachiyomi
En otra terminal:
```bash
cd tachiyomi-web/frontend
npm run dev
```
* Abre tu navegador en: **`http://localhost:3001`**

---

## 🧩 Cómo Registrar un Nuevo Scan en el Repositorio

En `keiyoushi-repo-server/config/registry.json`:
```json
{
  "id": "mi-scan",
  "name": "Mi Scanlation Favorito",
  "version": "1.0.0",
  "lang": "es",
  "baseUrl": "https://miscan.com",
  "icon": "https://miscan.com/favicon.ico",
  "script": "miscan.js",
  "description": "Lector de cómics de Mi Scanlation",
  "status": "online"
}
```
Al guardar el archivo, `http://localhost:5000/index.json` se actualizará automáticamente y cualquier Lector Web conectado verá la nueva extensión lista para instalar con 1 clic.
