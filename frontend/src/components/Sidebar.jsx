import React from 'react';
import { 
  Home,
  BookMarked, 
  Sparkles, 
  History, 
  Compass, 
  Download, 
  Settings, 
  BookOpen,
  ChevronRight,
  LogIn,
  LogOut,
  User,
  MessageSquare,
  Users
} from 'lucide-react';

export default function Sidebar({
  currentView,
  onSelectView,
  libraryCount = 0,
  installedExtCount = 0,
  historyCount = 0,
  currentUser = null,
  onOpenAuth,
  onOpenProfile,
  onLogout
}) {
  const menuItems = [
    {
      id: 'home',
      label: 'Inicio',
      icon: Home,
      badge: null
    },
    {
      id: 'library',
      label: 'Biblioteca',
      icon: BookMarked,
      badge: libraryCount > 0 ? libraryCount : null
    },
    {
      id: 'updates',
      label: 'Actualizaciones',
      icon: Sparkles,
      badge: null
    },
    {
      id: 'history',
      label: 'Historial',
      icon: History,
      badge: historyCount > 0 ? historyCount : null
    },
    {
      id: 'communities',
      label: 'Comunidad',
      icon: Users,
      badge: null
    },
    {
      id: 'messages',
      label: 'Mensajes',
      icon: MessageSquare,
      badge: null
    },
    {
      id: 'explore',
      label: 'Explorar',
      icon: Compass,
      badge: null
    },
    {
      id: 'downloads',
      label: 'Descargas',
      icon: Download,
      badge: null
    },
    {
      id: 'settings',
      label: 'Ajustes',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* SIDEBAR DE ESCRITORIO (Estilo Tachiyomi / Mihon) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 bg-[#0a0d14] border-r border-gray-800/80 h-screen sticky top-0 z-30 shrink-0 select-none">
        
        {/* Branding Yomori */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-800/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-base tracking-tight text-white block leading-tight">
              Yomori
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-purple-400 font-mono">
              Manga Reader
            </span>
          </div>
        </div>

        {/* Lista de Navegación */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (currentView === 'catalog' && item.id === 'explore') || (currentView === 'manga' && item.id === 'explore');

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#141822]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-black/30 text-white' : 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sección de Usuario / Autenticación */}
        <div className="p-3 border-t border-gray-800/60 bg-[#090c13]">
          {currentUser ? (
            <div 
              onClick={() => onOpenProfile && onOpenProfile()}
              className="flex items-center justify-between p-2 rounded-xl bg-[#141824] hover:bg-[#181f30] border border-gray-700/60 hover:border-purple-600/60 transition cursor-pointer group"
              title="Clic para ver y editar tu Perfil"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username || 'User')}`}
                    alt={currentUser.username || currentUser.name}
                    className="w-8 h-8 rounded-full border border-purple-500/50 group-hover:scale-105 transition shrink-0"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition block truncate">
                      {currentUser.username || currentUser.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono block truncate">
                    {currentUser.badge || 'Ver perfil'}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión / Registro</span>
            </button>
          )}
        </div>

        {/* Footer del Sidebar */}
        <div className="p-3 border-t border-gray-800/60 bg-[#080a10]">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Servidor Yomori Activo</span>
          </div>
        </div>
      </aside>

      {/* BARRA INFERIOR PARA MÓVILES */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0f17]/95 backdrop-blur-xl border-t border-gray-800/90 flex items-center justify-around px-2 py-2 select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (currentView === 'catalog' && item.id === 'explore') || (currentView === 'manga' && item.id === 'explore');

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
                isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
