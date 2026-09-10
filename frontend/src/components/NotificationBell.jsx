import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Bell, 
  UserPlus, 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Loader2, 
  CheckCheck,
  ExternalLink,
  Sparkles,
  Inbox
} from 'lucide-react';
import { getSocket } from '../services/socket.js';

export default function NotificationBell({
  currentUser = null,
  onOpenMessages,
  onOpenDirectChat,
  onOpenAuth
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadDMs, setUnreadDMs] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const dropdownRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cargar notificaciones iniciales
  const fetchNotifications = async () => {
    if (!currentUser) {
      setPendingRequests([]);
      setUnreadDMs([]);
      return;
    }

    try {
      const res = await axios.get('/api/social/friends-and-dms', {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        setPendingRequests(res.data.pendingRequests?.incoming || []);
        
        // DMs recibidos donde el último remitente no soy yo
        const dms = (res.data.conversations || []).filter(c => {
          return c.lastMessage && c.lastMessage.userId !== currentUser.id;
        });
        setUnreadDMs(dms);
      }
    } catch (err) {
      console.warn('[NotificationBell] Error fetching alerts:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Escuchar eventos en tiempo real vía WebSocket
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    if (!socket) return;

    // Registrar canal de usuario personal
    socket.emit('register_user', currentUser.id);

    const handleFriendRequest = (data) => {
      if (data?.request) {
        setPendingRequests(prev => {
          if (prev.some(r => r.id === data.request.id)) return prev;
          return [data.request, ...prev];
        });
      }
    };

    const handleFriendResult = (data) => {
      if (data?.action === 'accept') {
        setSystemAlerts(prev => [
          {
            id: 'alert_' + Date.now(),
            text: `@${data.request?.toUsername || 'Tu amigo'} aceptó tu solicitud de amistad 🎉`,
            time: 'Ahora'
          },
          ...prev
        ]);
      }
      fetchNotifications();
    };

    const handleDMNotification = (data) => {
      const { message, fromUser, roomId } = data || {};
      if (message && message.userId !== currentUser.id) {
        setUnreadDMs(prev => {
          const filtered = prev.filter(c => c.roomId !== roomId);
          return [
            {
              roomId,
              user: fromUser,
              lastMessage: message,
              isFriend: true
            },
            ...filtered
          ];
        });
      }
    };

    socket.on('friend_request_received', handleFriendRequest);
    socket.on('friend_request_result', handleFriendResult);
    socket.on('dm_notification', handleDMNotification);

    return () => {
      socket.off('friend_request_received', handleFriendRequest);
      socket.off('friend_request_result', handleFriendResult);
      socket.off('dm_notification', handleDMNotification);
    };
  }, [currentUser]);

  const handleRespondRequest = async (e, requestId, action, fromUserId) => {
    e.stopPropagation();
    if (!currentUser) return;

    setProcessingId(requestId);
    try {
      const res = await axios.post('/api/social/friends/respond', {
        requestId,
        action
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (res.data?.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));

        const socket = getSocket();
        if (socket && fromUserId) {
          socket.emit('respond_friend_request', {
            toUserId: fromUserId,
            action,
            request: { id: requestId, toUsername: currentUser.username }
          });
        }
      }
    } catch (err) {
      console.error('Error respondiendo solicitud:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const totalUnread = pendingRequests.length + unreadDMs.length + systemAlerts.length;

  return (
    <div className="relative select-none" ref={dropdownRef}>
      {/* Botón Campana */}
      <button
        onClick={() => {
          if (!currentUser) {
            if (onOpenAuth) onOpenAuth('login');
            return;
          }
          setIsOpen(prev => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-center cursor-pointer ${
          isOpen 
            ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30' 
            : totalUnread > 0
              ? 'bg-[#141824] border-purple-800/80 text-purple-300 hover:bg-[#1b2030] hover:text-white shadow-md'
              : 'bg-[#101420]/80 border-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-[#151928]'
        }`}
        title="Centro de Notificaciones"
      >
        <Bell className={`w-4 h-4 ${totalUnread > 0 ? 'animate-bounce' : ''}`} />

        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-pulse">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0f131f] border border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden z-50 animate-fadeInScale ring-1 ring-white/10">
          
          {/* Cabecera */}
          <div className="px-5 py-4 bg-[#141826] border-b border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Notificaciones
              </h3>
            </div>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/60 text-purple-300 text-[10px] font-bold">
                {totalUnread} nuevas
              </span>
            )}
          </div>

          {/* Cuerpo con Scroll */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-800/60">
            
            {/* 1. Solicitudes de Amistad */}
            {pendingRequests.length > 0 && (
              <div className="p-3 bg-purple-950/20">
                <p className="px-2 pb-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3 h-3" />
                  <span>Solicitudes de Amistad ({pendingRequests.length})</span>
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-[#131724] border border-purple-900/40 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:border-purple-700/60 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-900 shrink-0 border border-purple-800/50">
                          <img 
                            src={req.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.fromUsername || 'User')}`} 
                            alt={req.fromUsername} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            @{req.fromUsername}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Quiere ser tu amigo
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleRespondRequest(e, req.id, 'accept', req.fromUserId)}
                          disabled={processingId === req.id}
                          className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition active:scale-95 cursor-pointer"
                          title="Aceptar solicitud"
                        >
                          {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => handleRespondRequest(e, req.id, 'reject', req.fromUserId)}
                          disabled={processingId === req.id}
                          className="p-1.5 rounded-xl bg-gray-800 hover:bg-red-950 hover:text-red-400 text-gray-400 transition active:scale-95 cursor-pointer"
                          title="Rechazar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Mensajes Directos Recibidos */}
            {unreadDMs.length > 0 && (
              <div className="p-3">
                <p className="px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-purple-400" />
                  <span>Mensajes Directos</span>
                </p>
                <div className="space-y-2">
                  {unreadDMs.map((dm, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setIsOpen(false);
                        if (onOpenDirectChat && dm.user) {
                          onOpenDirectChat(dm.user.id, dm.user.username);
                        } else if (onOpenMessages) {
                          onOpenMessages();
                        }
                      }}
                      className="p-2.5 bg-[#121622] hover:bg-[#171c2b] border border-gray-800/80 hover:border-purple-500/50 rounded-2xl flex items-center justify-between gap-3 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-900 shrink-0 border border-gray-700 group-hover:border-purple-500 transition">
                          <img 
                            src={dm.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(dm.user?.username || 'User')}`} 
                            alt={dm.user?.username} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                            @{dm.user?.username}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {dm.lastMessage?.text || '📷 Imagen adjunta'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-purple-400 font-bold shrink-0 bg-purple-950/60 px-2 py-1 rounded-xl border border-purple-800/40">
                        Ver
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Alertas del Sistema */}
            {systemAlerts.length > 0 && (
              <div className="p-3">
                <p className="px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Actividad Reciente
                </p>
                <div className="space-y-1.5">
                  {systemAlerts.map(alert => (
                    <div key={alert.id} className="p-2.5 rounded-xl bg-[#121622] text-xs text-gray-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="flex-1 truncate">{alert.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado Vacío */}
            {totalUnread === 0 && (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-800/40 flex items-center justify-center text-gray-500">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-300">
                  Todo al día
                </p>
                <p className="text-[11px] text-gray-500 max-w-[200px]">
                  No tienes solicitudes de amistad ni mensajes nuevos sin leer.
                </p>
              </div>
            )}

          </div>

          {/* Pie de Notificaciones */}
          <div className="p-3 bg-[#121622] border-t border-gray-800/80 flex items-center justify-between">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenMessages) onOpenMessages();
              }}
              className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-700/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Centro de Amigos y Mensajes</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
