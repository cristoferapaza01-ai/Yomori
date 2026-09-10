import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    let serverUrl = 'http://localhost:4000';
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        serverUrl = 'http://localhost:4000';
      } else if (window.location.protocol.startsWith('http')) {
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
      console.log('⚡ Conectado a Yomori Real-time Socket Server:', socket.id);
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
