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
    env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1' },
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
    await new Promise(r => setTimeout(r, 300));
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
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#07090e',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Permite cargar recursos e imágenes locales fluidamente
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Browser Console L${level}] ${message} (at ${sourceId}:${line})`);
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1200);

  // Ocultar menú superior pero registrar atajos de recarga (F5), pantalla completa (F11) y DevTools (F12)
  const template = [
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: 'F11' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Abrir enlaces externos en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const isDevRunning = process.env.ELECTRON_DEV === '1' && await checkServer(FRONTEND_DEV_URL, 800);
  const targetUrl = (isDevRunning ? FRONTEND_DEV_URL : BACKEND_URL) + '?mode=app';

  console.log('[Electron] Cargando aplicación de escritorio desde:', targetUrl);
  mainWindow.loadURL(targetUrl);

  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
    console.error('[Electron] Error cargando URL, reintentando con backend local...', errorCode, errorDescription);
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(BACKEND_URL + '?mode=app');
    }, 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ciclo de vida de la aplicación
app.whenReady().then(async () => {
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
