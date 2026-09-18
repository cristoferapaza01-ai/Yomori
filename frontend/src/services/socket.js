import { io } from 'socket.io-client';

let socket = null;
export const CLOUD_SERVER_URL = 'http://158.101.116.245';

export function getSocket() {
  if (!socket) {
    let serverUrl = typeof window !== 'undefined' && window.location ? window.location.origin : CLOUD_SERVER_URL;
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        serverUrl = window.location.origin;
      } else if (hostname === '158.101.116.245' || hostname.includes('yomori')) {
        serverUrl = window.location.origin;
      } else {
        serverUrl = CLOUD_SERVER_URL;
      }
    }

    socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('⚡ Conectado a Yomori Real-time Socket Server:', socket.id, '->', serverUrl);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Desconectado de Yomori Socket Server');
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Error de conexión WebSocket:', err.message);
    });
  }
  return socket;
}

