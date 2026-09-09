const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

// Puerto del servidor backend
const BACKEND_PORT = 4000;
const BACKEND_URL = 'http://localhost:' + BACKEND_PORT;
const FRONTEND_DEV_URL = 'http://localhost:3000';

// Iniciar el servidor backend silenciosamente en segundo plano
function startBackend() {
  const backendPath = path.join(__dirname, '../backend/src/server.js');
  
  backendProcess = spawn(process.execPath, [backendPath], {
    cwd: path.join(__dirname, '../backend'),
    env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: 'production' },
    windowsHide: true,
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('[Electron] Error iniciando proceso de backend:', err);
  });
}

// Comprobar si un servidor HTTP responde
function checkServer(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// Esperar a que el servidor esté activo
async function waitForServer(url, maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    const isReady = await checkServer(url);
    if (isReady) return true;
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

// Crear la ventana principal nativa de escritorio
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 950,
    minHeight: 650,
    title: 'Yomori Desktop Reader',
    backgroundColor: '#07080b',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Permite cargar recursos e imágenes locales fluidamente
    }
  });

  // Ocultar menú superior por defecto (pulsando Alt o F11 se puede ver o poner pantalla completa)
  Menu.setApplicationMenu(null);

  // Mostrar ventana cuando esté lista para evitar parpadeos blancos
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Abrir enlaces externos en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Comprobar si el frontend de desarrollo está corriendo o usar el servidor backend local
  const isDevRunning = await checkServer(FRONTEND_DEV_URL, 800);
  const targetUrl = isDevRunning ? FRONTEND_DEV_URL : BACKEND_URL;

  console.log('[Electron] Cargando aplicación de escritorio desde:', targetUrl);
  mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ciclo de vida de la aplicación
app.whenReady().then(async () => {
  // Comprobar si el backend ya estaba corriendo, o iniciarlo
  const isBackendRunning = await checkServer(BACKEND_URL + '/api/health', 800);
  if (!isBackendRunning) {
    console.log('[Electron] Iniciando backend local en segundo plano...');
    startBackend();
    await waitForServer(BACKEND_URL + '/api/health');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Cerrar procesos hijos al salir
app.on('will-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
