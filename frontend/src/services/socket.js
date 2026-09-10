import { io } from 'socket.io-client';

let socket = null;
export const CLOUD_SERVER_URL = 'http://158.101.116.245';

export function getSocket() {
  if (!socket) {
    // Conectar al servidor central en la nube de Yomori para sincronización global en tiempo real (PC <-> Celular)
    let serverUrl = CLOUD_SERVER_URL;
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      if (hostname === '158.101.116.245' || hostname.includes('yomori')) {
        serverUrl = window.location.origin;
      }
    }

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
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

