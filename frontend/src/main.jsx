import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { CLOUD_SERVER_URL } from './services/socket.js'

// Interceptor para enrutar Auth, Chat, Usuarios y Comunidad al servidor Cloud central
axios.interceptors.request.use((config) => {
  const isCloudRoute = 
    config.url?.startsWith('/api/chat') ||
    config.url?.startsWith('/api/social') ||
    config.url?.startsWith('/api/auth') ||
    config.url?.startsWith('/api/users');

  if (isCloudRoute && !config.url.startsWith('http')) {
    // Si estamos en Desktop (Electron) o localhost, redirigir las peticiones sociales al servidor Cloud
    if (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.protocol === 'file:'
    )) {
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

