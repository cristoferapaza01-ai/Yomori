import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { CLOUD_SERVER_URL } from './services/socket.js'

import { Capacitor } from '@capacitor/core'

// Interceptor para enrutar peticiones en la app nativa o servir en local
axios.interceptors.request.use((config) => {
  const isNative = Capacitor.isNativePlatform() || 
                   (typeof window !== 'undefined' && (
                     window.location.origin.includes('capacitor') ||
                     window.location.protocol === 'file:'
                   ));

  if (!config.url.startsWith('http')) {
    if (isNative) {
      // En la aplicación nativa Android (APK), enrutar todas las peticiones /api al servidor central
      config.url = `${CLOUD_SERVER_URL}${config.url}`;
    }
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

