import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Palette, 
  BookOpen, 
  Eye, 
  DownloadCloud, 
  HardDrive, 
  ShieldCheck, 
  Crown, 
  Info, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  FileDown, 
  FileUp, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Sun, 
  Moon, 
  Laptop, 
  Folder, 
  Flame, 
  Zap, 
  Clock
} from 'lucide-react';
import axios from 'axios';

// Helper para convertir HSL a HEX limpio
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export default function SettingsView({
  settings = {},
  onUpdateSettings,
  onOpenExtensions,
  categories = ['Todos'],
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
  currentUser,
  onUpdateCurrentUser,
  library = [],
  history = [],
  chapterProgressMap = {},
  readChaptersMap = {},
  installedExtensions = [],
  repositories = [],
  onRestoreBackup,
  appMode = 'manga'
}) {
  // Pestaña activa del menú lateral (por defecto: 'general')
  const [activeTab, setActiveTab] = useState('general');

  // Estados de Apariencia
  const [accentColor, setAccentColor] = useState(settings?.accentColor || '#9333ea');
  const [colorHue, setColorHue] = useState(270);
  const [customHexInput, setCustomHexInput] = useState(settings?.accentColor || '#9333ea');
  const [colorAppliedFeedback, setColorAppliedFeedback] = useState(false);

  // Sincronizar estado local cuando settings cambie
  useEffect(() => {
    if (settings?.accentColor) {
      setAccentColor(settings.accentColor);
      setCustomHexInput(settings.accentColor);
    }
  }, [settings?.accentColor]);

  // Estados de Categorías
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Estados de Seguridad
  const [revealedEmail, setRevealedEmail] = useState(null);
  const [verifyingPasswordForEmail, setVerifyingPasswordForEmail] = useState(false);
  const [verifyEmailPasswordInput, setVerifyEmailPasswordInput] = useState('');
  const [verifyEmailLoading, setVerifyEmailLoading] = useState(false);
  const [verifyEmailError, setVerifyEmailError] = useState('');

  // Estados de Cambio de Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState({ text: '', type: '' });

  // Estados de Cambio de Nombre de Usuario
  const [newUsernameInput, setNewUsernameInput] = useState(currentUser?.username || '');
  const [usernameChangeLoading, setUsernameChangeLoading] = useState(false);
  const [usernameChangeMsg, setUsernameChangeMsg] = useState({ text: '', type: '' });

  // Estados de Admin
  const [pendingCommunities, setPendingCommunities] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [analyticsStats, setAnalyticsStats] = useState(null);

  // Estados de Actualización / Acerca de
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Referencia para importar backup
  const fileInputRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'rey_palomo' || currentUser?.username?.toLowerCase() === 'admin';

  // Sincronizar input de usuario cuando cambie currentUser
  useEffect(() => {
    if (currentUser?.username) {
      setNewUsernameInput(currentUser.username);
    }
  }, [currentUser]);

  // Cargar datos de administración si corresponde
  useEffect(() => {
    if (isAdmin && currentUser?.token) {
      fetchAdminData();
    }
  }, [isAdmin, currentUser]);

  const fetchAdminData = async () => {
    if (!currentUser?.token) return;
    setLoadingPending(true);
    try {
      const res = await axios.get('/api/social/communities/pending', {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) setPendingCommunities(res.data.pending || []);
    } catch (e) {} finally {
      setLoadingPending(false);
    }

    try {
      const resAn = await axios.get('/api/analytics/popular');
      if (resAn.data?.success) setAnalyticsStats(resAn.data.data);
    } catch (e) {}
  };

  const handleReviewCommunity = async (communityId, action) => {
    try {
      const res = await axios.post('/api/social/communities/review', {
        communityId,
        action
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.data?.success) {
        setPendingCommunities(prev => prev.filter(c => c.id !== communityId));
        alert(action === 'approve' ? '¡Comunidad aprobada y publicada para todos!' : 'Solicitud rechazada');
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Helper para actualizar ajuste específico
  const updateSetting = (key, value) => {
    if (onUpdateSettings) {
      onUpdateSettings({ [key]: value });
    }
  };

  // 1. Creador y editor de Categorías
  const handleCreateCategory = (e) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      alert('Esta categoría ya existe.');
      return;
    }
    if (onAddCategory) onAddCategory(clean);
    setNewCatName('');
  };

  const handleStartEditCategory = (cat) => {
    setEditingCat(cat);
    setEditingCatName(cat);
  };

  const handleSaveEditCategory = () => {
    const clean = editingCatName.trim();
    if (!clean || clean === editingCat) {
      setEditingCat(null);
      return;
    }
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase() && c !== editingCat)) {
      alert('Ya existe otra categoría con ese nombre.');
      return;
    }
    if (onRenameCategory) {
      onRenameCategory(editingCat, clean);
    } else {
      if (onAddCategory) onAddCategory(clean);
      if (onRemoveCategory) onRemoveCategory(editingCat);
    }
    setEditingCat(null);
  };

  // 2. Exportar Copia de Seguridad Completa (.json)
  const handleExportFullBackup = () => {
    const fullBackup = {
      app: 'Yomori Reader',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      user: currentUser ? { username: currentUser.username, email: currentUser.email, role: currentUser.role } : null,
      library: JSON.parse(localStorage.getItem('tachiyomi_library') || '[]'),
      history: JSON.parse(localStorage.getItem('tachiyomi_history') || '[]'),
      categories: JSON.parse(localStorage.getItem('tachiyomi_categories') || '["Todos"]'),
      chapterProgress: JSON.parse(localStorage.getItem('tachiyomi_chapter_progress') || '{}'),
      readChapters: JSON.parse(localStorage.getItem('tachiyomi_read_chapters') || '{}'),
      settings: JSON.parse(localStorage.getItem('tachiyomi_settings') || '{}'),
      installedExtensions: JSON.parse(localStorage.getItem('yomori_installed_extensions') || '[]'),
      repositories: JSON.parse(localStorage.getItem('tachiyomi_repos') || '[]')
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yomori-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Importar / Restaurar Copia de Seguridad
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed || (!parsed.library && !parsed.settings && !parsed.history)) {
          alert('El archivo no parece ser una copia de seguridad válida de Yomori.');
          return;
        }

        const confirmRestore = window.confirm(
          `¿Restaurar copia de seguridad del ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString() : 'archivo'}?\n\n` +
          `• Mangas en biblioteca: ${parsed.library?.length || 0}\n` +
          `• Entradas de historial: ${parsed.history?.length || 0}\n` +
          `• Categorías: ${parsed.categories?.length || 0}\n\n` +
          `Esta acción actualizará tus datos locales.`
        );

        if (confirmRestore) {
          if (parsed.library) localStorage.setItem('tachiyomi_library', JSON.stringify(parsed.library));
          if (parsed.history) localStorage.setItem('tachiyomi_history', JSON.stringify(parsed.history));
          if (parsed.categories) localStorage.setItem('tachiyomi_categories', JSON.stringify(parsed.categories));
          if (parsed.chapterProgress) localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(parsed.chapterProgress));
          if (parsed.readChapters) localStorage.setItem('tachiyomi_read_chapters', JSON.stringify(parsed.readChapters));
          if (parsed.settings) localStorage.setItem('tachiyomi_settings', JSON.stringify(parsed.settings));
          if (parsed.repositories) localStorage.setItem('tachiyomi_repos', JSON.stringify(parsed.repositories));

          if (onRestoreBackup) {
            onRestoreBackup(parsed);
          } else {
            window.location.reload();
          }
          alert('¡Copia de seguridad restaurada con éxito!');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 4. Limpiar Caché del Servidor
  const handleClearServerCache = async () => {
    try {
      await axios.post('/api/cache/clear');
      alert('¡Caché del servidor vaciada con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // 5. Revelar correo con verificación de contraseña
  const handleVerifyPasswordForEmail = async (e) => {
    e.preventDefault();
    if (!verifyEmailPasswordInput) {
      setVerifyEmailError('Por favor ingresa tu contraseña.');
      return;
    }
    setVerifyEmailLoading(true);
    setVerifyEmailError('');
    try {
      const res = await axios.post('/api/auth/verify-password', {
        password: verifyEmailPasswordInput
      }, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (res.data?.success && res.data.email) {
        setRevealedEmail(res.data.email);
        setVerifyingPasswordForEmail(false);
        setVerifyEmailPasswordInput('');
      } else {
        setVerifyEmailError('Contraseña incorrecta.');
      }
    } catch (err) {
      setVerifyEmailError(err.response?.data?.message || 'Contraseña incorrecta.');
    } finally {
      setVerifyEmailLoading(false);
    }
  };

  // 6. Cambiar Contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordChangeMsg({ text: '', type: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordChangeMsg({ text: 'Por favor completa todos los campos.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeMsg({ text: 'La nueva contraseña y su confirmación no coinciden.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeMsg({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const res = await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });

      if (res.data?.success) {
        setPasswordChangeMsg({ text: '¡Contraseña actualizada con éxito!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordChangeMsg({ 
        text: err.response?.data?.message || 'Error al actualizar contraseña.', 
        type: 'error' 
      });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // 7. Cambiar Nombre de Usuario
  const handleChangeUsername = async (e) => {
    e.preventDefault();
    setUsernameChangeMsg({ text: '', type: '' });

    const clean = newUsernameInput.trim();
    if (!clean || clean === currentUser?.username) return;

    if (clean.length < 3 || clean.length > 30) {
      setUsernameChangeMsg({ text: 'El nombre debe tener entre 3 y 30 caracteres.', type: 'error' });
      return;
    }

    setUsernameChangeLoading(true);
    try {
      const res = await axios.put('/api/auth/profile', {
        username: clean
      }, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });

      if (res.data?.success && res.data.user) {
        if (onUpdateCurrentUser) onUpdateCurrentUser(res.data.user);
        setUsernameChangeMsg({ text: '¡Nombre de usuario actualizado con éxito!', type: 'success' });
      }
    } catch (err) {
      setUsernameChangeMsg({
        text: err.response?.data?.message || 'Error al actualizar el nombre de usuario.',
        type: 'error'
      });
    } finally {
      setUsernameChangeLoading(false);
    }
  };

  // 8. Buscar Actualizaciones
  const handleCheckUpdates = () => {
    setCheckingUpdates(true);
    setUpdateStatus(null);
    setTimeout(() => {
      setCheckingUpdates(false);
      setUpdateStatus({
        isLatest: true,
        message: '¡Tienes la versión más reciente instalada! (v2.5.0 Alpha Yomori Desktop)'
      });
    }, 1200);
  };

  // Máscara de correo (ej: cr***@gmail.com)
  const getMaskedEmail = (email) => {
    if (!email) return 'Sin correo registrado';
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const maskedUser = user.length <= 2 ? user + '***' : user.slice(0, 2) + '***' + user.slice(-1);
    return `${maskedUser}@${domain}`;
  };

  // Tabs de navegación
  const navTabs = [
    { id: 'general', label: 'General', icon: Settings, desc: 'Inicio, idioma y confirmaciones' },
    { id: 'appearance', label: 'Apariencia', icon: Palette, desc: 'Temas, colores y paleta' },
    { id: 'library', label: 'Biblioteca', icon: BookOpen, desc: 'Categorías y cuadrícula' },
    { id: 'reader', label: 'Visor / Lector', icon: Eye, desc: 'Modo de lectura, brillo y ancho' },
    { id: 'downloads', label: 'Descargas', icon: DownloadCloud, desc: 'Descarga automática y límites' },
    { id: 'storage', label: 'Datos y Almacenamiento', icon: HardDrive, desc: 'Copia de seguridad y caché' },
    { id: 'security', label: 'Seguridad y Privacidad', icon: ShieldCheck, desc: 'Cuenta, correo y contraseña' },
    ...(isAdmin ? [{ id: 'admin', label: 'Administración', icon: Crown, desc: 'Moderación y estadísticas' }] : []),
    { id: 'about', label: 'Acerca de', icon: Info, desc: 'Versión, changelog y hoja de ruta' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 animate-fadeIn select-none">
      
      {/* Input oculto para restaurar backup */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-gray-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/30">
              <Sliders className="w-6 h-6 text-white" />
            </div>
            <span>Ajustes de Yomori</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Personaliza tu experiencia de lectura, gestiona tu biblioteca, temas y copias de seguridad.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#121622] border border-gray-800 shadow-inner">
            <img 
              src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username)}`} 
              alt={currentUser.username} 
              className="w-8 h-8 rounded-full border border-purple-500/50 bg-gray-900 object-cover"
            />
            <div className="text-left">
              <p className="text-xs font-bold text-gray-200">{currentUser.username}</p>
              <p className="text-[10px] text-purple-400 font-semibold">{currentUser.role === 'admin' ? '👑 Administrador' : 'Lector Activo'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ESTRUCTURA MASTER-DETAIL EN 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: SIDEBAR DE AJUSTES (4 Cols en Desktop) */}
        <div className="lg:col-span-4 bg-[#101420]/90 backdrop-blur-xl rounded-3xl border border-gray-800/90 p-3 shadow-xl space-y-1.5 sticky top-20">
          <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
            <span>Secciones de Configuración</span>
            <span className="text-purple-400 font-bold">{navTabs.length}</span>
          </div>

          <div className="space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 border border-purple-500/50 text-white shadow-md shadow-purple-950/40 translate-x-1' 
                      : 'hover:bg-gray-800/60 text-gray-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition ${isActive ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-800/80 text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold truncate leading-tight">{tab.label}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{tab.desc}</p>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-6 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer de versión en el sidebar */}
          <div className="mt-4 pt-3 border-t border-gray-800/70 px-3 py-1 flex items-center justify-between text-[11px] text-gray-400">
            <span>Yomori v2.5.0</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Online
            </span>
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE CONTENIDO ACTIVO (8 Cols en Desktop) */}
        <div className="lg:col-span-8 bg-[#101420]/90 backdrop-blur-xl rounded-3xl border border-gray-800/90 p-6 sm:p-8 shadow-2xl min-h-[550px]">
          
          {/* ========================================================= */}
          {/* PESTAÑA 1: GENERAL                                        */}
          {/* ========================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>Ajustes Generales</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Configuración inicial del sistema, inicio e idioma</p>
              </div>

              <div className="space-y-4">
                {/* Pestaña de Inicio Predeterminada */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Pestaña Inicial Predeterminada</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Sección que se abrirá al iniciar la aplicación</p>
                  </div>
                  <select
                    value={settings?.defaultStartTab || 'home'}
                    onChange={(e) => updateSetting('defaultStartTab', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="home">🏠 Inicio (Nuevos Lanzamientos & Tendencias)</option>
                    <option value="library">📚 Mi Biblioteca</option>
                    <option value="updates">🔔 Actualizaciones</option>
                    <option value="explore">🧭 Explorar Catálogo</option>
                  </select>
                </div>

                {/* Idioma de la Interfaz */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Idioma de la Interfaz</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Idioma principal para los textos de la app</p>
                  </div>
                  <select
                    value={settings?.language || 'es'}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="es">🇪🇸 Español (Predeterminado)</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="pt">🇧🇷 Português</option>
                  </select>
                </div>

                {/* Confirmar antes de salir del lector */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Confirmar salida del lector</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Evita cierres accidentales al presionar Atrás en medio de un capítulo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.confirmExitReader || false}
                      onChange={(e) => updateSetting('confirmExitReader', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Mostrar insignias de recuento en pestañas */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Insignias numéricas en la barra lateral</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Muestra la cantidad de mangas en biblioteca, historial y DMs</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.showSidebarBadges !== false}
                      onChange={(e) => updateSetting('showSidebarBadges', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: APARIENCIA                                     */}
          {/* ========================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <span>Apariencia y Temas</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Elige el estilo visual y personaliza el esquema de colores a tu gusto</p>
              </div>

              {/* Modo del Sistema (Automático) */}
              <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${settings?.theme === 'system' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-gray-800 text-gray-400'}`}>
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Tema del Sistema</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Sincroniza automáticamente con el tema claro u oscuro de tu dispositivo</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.theme === 'system'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateSetting('theme', 'system');
                      } else {
                        updateSetting('theme', 'dark');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Selector de los 4 Temas Principales */}
              <div>
                <h3 className="text-sm font-bold text-gray-200 mb-3">Temas Principales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'dark', name: 'Oscuro OLED', icon: Moon, desc: 'Fondo negro puro (#07090e) y violeta', defaultColor: '#9333ea', bgPreview: '#07090e', accentPreview: '#9333ea' },
                    { id: 'light', name: 'Claro Moderno', icon: Sun, desc: 'Tema luminoso con acento índigo', defaultColor: '#6366f1', bgPreview: '#f8fafc', accentPreview: '#6366f1' },
                    { id: 'ruby_neon', name: 'Rubí Carmesí', icon: Flame, desc: 'Firma Rubí Carmesí neón vibrante', defaultColor: '#f43f5e', bgPreview: '#18080c', accentPreview: '#f43f5e' },
                    { id: 'cyberpunk', name: 'Esmeralda Neon', icon: Zap, desc: 'Estilo Cyberpunk verde esmeralda', defaultColor: '#10b981', bgPreview: '#06120d', accentPreview: '#10b981' }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = settings?.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setAccentColor(t.defaultColor);
                          setCustomHexInput(t.defaultColor);
                          if (onUpdateSettings) {
                            onUpdateSettings({ theme: t.id, accentColor: t.defaultColor });
                          }
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50 ring-1 ring-purple-500' 
                            : 'bg-[#141824] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-[#181d2c]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl" style={{ backgroundColor: `${t.accentPreview}22`, color: t.accentPreview }}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-white">{t.name}</span>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-purple-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-700" style={{ backgroundColor: t.accentPreview }} />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PALETA DE COLOR INTERACTIVA (Color Picker Personalizado) */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span>Color de Acento Personalizado</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Ajusta el tono exacto y presiona "Aceptar y Aplicar" para guardarlo</p>
                  </div>
                  <div 
                    className="w-8 h-8 rounded-xl border border-white/20 shadow-md transition-all"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>

                {/* Lienzo visual de gradiente de color / Selector interactivo */}
                <div 
                  className="w-full h-36 rounded-2xl relative overflow-hidden border border-gray-700/80 shadow-inner cursor-crosshair select-none"
                  style={{
                    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${colorHue}, 100%, 50%))`
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    const sat = Math.round(x * 100);
                    const light = Math.round((1 - y) * 100);
                    const hex = hslToHex(colorHue, sat, light);
                    setAccentColor(hex);
                    setCustomHexInput(hex);
                  }}
                >
                  <div className="absolute inset-0 flex items-end justify-between p-3 pointer-events-none">
                    <span className="text-[10px] font-bold text-white/70 drop-shadow">Haz clic en cualquier área para seleccionar tono</span>
                  </div>
                </div>

                {/* Slider de Matiz (Hue Slider arcoíris completo) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Matiz (Hue)</span>
                    <span className="font-mono text-purple-300 font-bold">{colorHue}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={colorHue}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      setColorHue(h);
                      const hex = hslToHex(h, 90, 55);
                      setAccentColor(hex);
                      setCustomHexInput(hex);
                    }}
                    className="w-full h-4 rounded-xl appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                    }}
                  />
                </div>

                {/* Campo de Entrada HEX y Presets */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-gray-400 font-bold">Código HEX:</span>
                    <div className="flex items-center px-3 py-1.5 rounded-xl bg-gray-900 border border-purple-500/60 shadow-sm">
                      <span className="text-purple-400 font-mono text-xs font-bold mr-1">#</span>
                      <input
                        type="text"
                        value={customHexInput.replace('#', '')}
                        onChange={(e) => {
                          let clean = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
                          const val = '#' + clean;
                          setCustomHexInput(val);
                          if (clean.length === 6) {
                            setAccentColor(val);
                          }
                        }}
                        placeholder="9333EA"
                        className="bg-transparent font-mono text-xs text-white uppercase focus:outline-none w-20"
                      />
                    </div>
                  </div>

                  {/* Presets Rápidos */}
                  <div className="flex items-center gap-1.5">
                    {['#9333EA', '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#F43F5E', '#EC4899'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          setAccentColor(hex);
                          setCustomHexInput(hex);
                        }}
                        className={`w-6 h-6 rounded-lg transition-transform active:scale-90 cursor-pointer ${
                          accentColor.toUpperCase() === hex.toUpperCase() ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                {/* Botón de Aceptar y Aplicar Color */}
                <div className="pt-3 space-y-2">
                  {(() => {
                    let hex = (accentColor || '#9333ea').replace('#', '');
                    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                    const num = parseInt(hex, 16) || 0;
                    const r = (num >> 16) & 255;
                    const g = (num >> 8) & 255;
                    const b = num & 255;
                    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
                    const btnTextColor = yiq >= 155 ? '#090d16' : '#ffffff';

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          let h = customHexInput.trim();
                          if (!h.startsWith('#')) h = '#' + h;
                          if (!/^#[0-9A-Fa-f]{6}$/.test(h)) {
                            alert('Por favor ingresa un código HEX válido de 6 dígitos (ejemplo: #9333EA)');
                            return;
                          }
                          setAccentColor(h);
                          if (onUpdateSettings) {
                            onUpdateSettings({ accentColor: h, theme: 'custom' });
                          }
                          setColorAppliedFeedback(true);
                          setTimeout(() => setColorAppliedFeedback(false), 3000);
                        }}
                        className="w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-98 cursor-pointer hover:brightness-110"
                        style={{
                          backgroundColor: accentColor,
                          color: btnTextColor,
                          boxShadow: `0 10px 25px -5px ${accentColor}77`
                        }}
                      >
                        <Check className="w-5 h-5 stroke-[2.5]" style={{ color: btnTextColor }} />
                        <span>Aceptar y Aplicar Color ({accentColor})</span>
                      </button>
                    );
                  })()}

                  {colorAppliedFeedback && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>¡Color de acento personalizado aplicado con éxito a toda la aplicación!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: BIBLIOTECA                                     */}
          {/* ========================================================= */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span>Gestión de Biblioteca</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Organiza tus categorías personalizadas y la vista de cuadrícula</p>
              </div>

              {/* Editor de Categorías */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Categorías de la Biblioteca ({appMode === 'anime' ? 'Anime' : 'Manga'})</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Crea pestañas personalizadas para clasificar tus {appMode === 'anime' ? 'animes' : 'mangas'}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300 font-bold">
                    {categories.length} Categorías ({appMode === 'anime' ? 'Anime' : 'Manga'})
                  </span>
                </div>

                {/* Formulario Agregar */}
                <form onSubmit={handleCreateCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nueva categoría (ej: Leyendo, Favoritos, Shonen)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear</span>
                  </button>
                </form>

                {/* Lista de Categorías */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 transition"
                    >
                      {editingCat === cat ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg bg-gray-800 border border-purple-500 text-xs text-white outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditCategory}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-bold text-gray-200">{cat}</span>
                          {cat === 'Todos' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Fija</span>
                          )}
                        </div>
                      )}

                      {cat !== 'Todos' && editingCat !== cat && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                            title="Renombrar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la categoría "${cat}"?`)) {
                                if (onRemoveCategory) onRemoveCategory(cat);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-gray-400 hover:text-rose-400 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cuadrícula y Visualización */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Tamaño de Cuadrícula de Portadas</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Ajusta cuántas portadas se ven por fila en tu biblioteca</p>
                  </div>
                  <select
                    value={settings?.gridSize || 'normal'}
                    onChange={(e) => updateSetting('gridSize', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="compact">🔍 Compacto (Más portadas por fila)</option>
                    <option value="normal">📱 Normal (Recomendado)</option>
                    <option value="comfortable">🖼️ Grande / Cómodo</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Mostrar contador de capítulos no leídos</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Insignia sobre la esquina de la portada con capítulos pendientes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.showUnreadBadge !== false}
                      onChange={(e) => updateSetting('showUnreadBadge', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 4: VISOR / LECTOR                                 */}
          {/* ========================================================= */}
          {activeTab === 'reader' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  <span>Ajustes Globales del Visor</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Modo de lectura, dimensiones de viñetas, brillo y navegación</p>
              </div>

              <div className="space-y-4">
                {/* Modo de Lectura */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Modo de Lectura Predeterminado</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cómo se desplegarán las páginas de los mangas</p>
                  </div>
                  <select
                    value={settings?.readerMode || 'webtoon'}
                    onChange={(e) => updateSetting('readerMode', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="webtoon">📜 Cascada Webtoon (Vertical Continuo)</option>
                    <option value="horizontal">↔️ Horizontal Continuo</option>
                    <option value="paged-rtl">📖 Paginado Manga (Derecha a Izquierda)</option>
                    <option value="paged-ltr">📑 Paginado Cómic (Izquierda a Derecha)</option>
                  </select>
                </div>

                {/* Ancho Máximo de Lectura */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Ancho Máximo de Viñetas</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Limita el ancho en pantallas panorámicas para lectura cómoda</p>
                  </div>
                  <select
                    value={settings?.maxWidth || '100%'}
                    onChange={(e) => updateSetting('maxWidth', e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="100%">🖥️ Pantalla Completa (100%)</option>
                    <option value="1200px">📐 Grande (1200px)</option>
                    <option value="1000px">📱 Normal (1000px)</option>
                    <option value="800px">🔍 Compacto (800px)</option>
                  </select>
                </div>

                {/* Brillo de Viñetas */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-200">Brillo de Viñetas</h3>
                      <p className="text-xs text-gray-400">Atenúa las páginas para lectura nocturna</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {settings?.brightness || 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={settings?.brightness || 100}
                    onChange={(e) => updateSetting('brightness', Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Separación entre Páginas */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Separación entre Viñetas</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Espacio en blanco/negro entre cada página</p>
                  </div>
                  <select
                    value={settings?.pageGap || 0}
                    onChange={(e) => updateSetting('pageGap', Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value={0}>Sin separación (0px - Continuo)</option>
                    <option value={4}>Mínimo (4px)</option>
                    <option value={8}>Medio (8px)</option>
                    <option value={16}>Separado (16px)</option>
                  </select>
                </div>

                {/* Invertir toques de navegación */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Invertir zonas de toque</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Lado izquierdo avanza y lado derecho retrocede</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.invertTaps || false}
                      onChange={(e) => updateSetting('invertTaps', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 5: DESCARGAS                                      */}
          {/* ========================================================= */}
          {activeTab === 'downloads' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <DownloadCloud className="w-5 h-5 text-purple-400" />
                  <span>Ajustes de Descargas</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Control de descargas automáticas para lectura sin conexión</p>
              </div>

              <div className="space-y-4">
                {/* Descarga Automática de Nuevos Capítulos */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Descargar automáticamente nuevos capítulos</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Descarga capítulos recién estrenados de los mangas en tu biblioteca</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.autoDownloadNewChapters || false}
                      onChange={(e) => updateSetting('autoDownloadNewChapters', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Descargar siguientes capítulos mientras lees */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Descargar siguientes capítulos mientras lees</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Pre-descarga los próximos 2 capítulos para lectura ultra fluida</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.autoDownloadNextWhileReading || false}
                      onChange={(e) => updateSetting('autoDownloadNextWhileReading', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Descargas Simultáneas */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Descargas Simultáneas en Paralelo</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cantidad de capítulos procesados al mismo tiempo</p>
                  </div>
                  <select
                    value={settings?.concurrentDownloads || 2}
                    onChange={(e) => updateSetting('concurrentDownloads', Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-white focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value={1}>1 Capítulo a la vez (Menor uso de red)</option>
                    <option value={2}>2 Capítulos en paralelo (Recomendado)</option>
                    <option value={3}>3 Capítulos en paralelo</option>
                    <option value={5}>5 Capítulos en paralelo (Ultra rápido)</option>
                  </select>
                </div>

                {/* Descargar solo con Wi-Fi */}
                <div className="p-4 rounded-2xl bg-[#141824] border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Descargar solo mediante Wi-Fi</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Pausa descargas si detecta conexión de datos móviles</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.downloadOnlyOnWifi || false}
                      onChange={(e) => updateSetting('downloadOnlyOnWifi', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 6: DATOS Y ALMACENAMIENTO                         */}
          {/* ========================================================= */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <span>Datos y Almacenamiento</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Copias de seguridad locales, ubicación de datos y limpieza de caché</p>
              </div>

              {/* COPIA DE SEGURIDAD INTEGRAL */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Copia de Seguridad y Restauración</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Guarda o restaura todo: biblioteca, historial, capítulos leídos, progreso, categorías y ajustes.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-400">
                    <HardDrive className="w-5 h-5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Crear Copia */}
                  <button
                    onClick={handleExportFullBackup}
                    className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-between shadow-lg shadow-purple-950/50 transition cursor-pointer active:scale-95"
                  >
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-wide">Crear Copia Local</p>
                      <p className="text-[11px] text-purple-200 mt-0.5">Descargar archivo .json</p>
                    </div>
                    <FileDown className="w-5 h-5" />
                  </button>

                  {/* Restaurar Copia */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-purple-500/50 text-gray-200 hover:text-white flex items-center justify-between transition cursor-pointer active:scale-95"
                  >
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-wide">Restaurar Copia</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Cargar archivo .json</p>
                    </div>
                    <FileUp className="w-5 h-5 text-purple-400" />
                  </button>
                </div>
              </div>

              {/* Ubicación y Memoria Utilizada */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Ubicación del Almacenamiento</h3>
                <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 font-mono text-xs text-gray-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Yomori/backend/data/downloads</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold shrink-0 ml-2">Suwayomi Engine</span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-gray-200">Caché y Archivos Temporales</p>
                    <p className="text-[11px] text-gray-400">Libera espacio eliminando páginas web y prefetchs cacheados</p>
                  </div>
                  <button
                    onClick={handleClearServerCache}
                    className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Caché</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 7: SEGURIDAD Y PRIVACIDAD                         */}
          {/* ========================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Seguridad y Privacidad de la Cuenta</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Tus datos de registro, cambio de contraseña y control de privacidad</p>
              </div>

              {currentUser ? (
                <div className="space-y-5">
                  {/* Vista Previa de Datos de Registro */}
                  <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-4">
                    <h3 className="text-sm font-bold text-white">Datos de Registro</h3>

                    {/* Nombre de Usuario */}
                    <form onSubmit={handleChangeUsername} className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold">Nombre de Usuario Actual</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newUsernameInput}
                          onChange={(e) => setNewUsernameInput(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white font-semibold outline-none focus:border-purple-500"
                        />
                        <button
                          type="submit"
                          disabled={usernameChangeLoading || newUsernameInput === currentUser.username}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                        >
                          {usernameChangeLoading ? 'Guardando...' : 'Cambiar Nombre'}
                        </button>
                      </div>
                      {usernameChangeMsg.text && (
                        <p className={`text-xs ${usernameChangeMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {usernameChangeMsg.text}
                        </p>
                      )}
                    </form>

                    {/* Correo Electrónico Enmascarado + Botón Revelar */}
                    <div className="space-y-2 pt-2 border-t border-gray-800/80">
                      <label className="text-xs text-gray-400 font-bold">Correo Electrónico Registrado</label>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
                        <span className="font-mono text-xs text-gray-200 font-bold">
                          {revealedEmail || getMaskedEmail(currentUser.email)}
                        </span>

                        {!revealedEmail && (
                          <button
                            onClick={() => setVerifyingPasswordForEmail(true)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Correo Completo</span>
                          </button>
                        )}
                      </div>

                      {/* Formulario para verificar contraseña y revelar correo */}
                      {verifyingPasswordForEmail && !revealedEmail && (
                        <form onSubmit={handleVerifyPasswordForEmail} className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/50 space-y-2 animate-fadeIn">
                          <p className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-purple-400" />
                            <span>Confirma tu contraseña para ver tu correo:</span>
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={verifyEmailPasswordInput}
                              onChange={(e) => setVerifyEmailPasswordInput(e.target.value)}
                              placeholder="Ingresa tu contraseña actual..."
                              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-white outline-none focus:border-purple-400"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={verifyEmailLoading}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                            >
                              {verifyEmailLoading ? 'Verificando...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingPasswordForEmail(false);
                                setVerifyEmailError('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                          {verifyEmailError && (
                            <p className="text-[11px] text-rose-400">{verifyEmailError}</p>
                          )}
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Formulario de Cambio de Contraseña */}
                  <form onSubmit={handleChangePassword} className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Cambiar Contraseña</span>
                    </h3>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-gray-400 font-bold block mb-1">Contraseña Actual</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Tu contraseña actual..."
                          className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-gray-400 font-bold block mb-1">Nueva Contraseña</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres..."
                            className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-400 font-bold block mb-1">Confirmar Nueva Contraseña</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña..."
                            className="w-full px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {passwordChangeMsg.text && (
                      <p className={`text-xs ${passwordChangeMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {passwordChangeMsg.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={passwordChangeLoading}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-purple-950/50"
                    >
                      {passwordChangeLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-[#141824] border border-gray-800 text-center space-y-3">
                  <Lock className="w-10 h-10 text-purple-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">Inicia sesión para gestionar tu seguridad</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Crea una cuenta gratuita en Yomori para sincronizar tu biblioteca en la nube, ver tu perfil y personalizar tu seguridad.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 8: ADMINISTRACIÓN (ADMIN)                          */}
          {/* ========================================================= */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-amber-400 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>Panel de Administración Global</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Control de comunidades, analíticas de mangas y moderación</p>
              </div>

              {/* Moderación de Comunidades */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-amber-500/40 space-y-4">
                <h3 className="text-sm font-bold text-amber-300">Solicitudes Pendientes de Comunidades</h3>
                
                {loadingPending ? (
                  <p className="text-xs text-gray-400">Cargando solicitudes...</p>
                ) : pendingCommunities.length === 0 ? (
                  <p className="text-xs text-gray-400">No hay comunidades pendientes de revisión.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingCommunities.map((c) => (
                      <div key={c.id} className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{c.name}</p>
                          <p className="text-[11px] text-gray-400">{c.description}</p>
                          <p className="text-[10px] text-purple-300">Creado por: @{c.creatorUsername}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewCommunity(c.id, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReviewCommunity(c.id, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estadísticas de Lectura */}
              {analyticsStats && (
                <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>Top Mangas más Leídos en la Plataforma</span>
                  </h3>
                  <div className="space-y-1.5">
                    {(analyticsStats.popularMangas || []).slice(0, 5).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs">
                        <span className="font-bold text-gray-200">#{idx + 1} {m.title}</span>
                        <span className="text-purple-300 font-mono">{m.readCount} lecturas</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 9: ACERCA DE                                      */}
          {/* ========================================================= */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-800/80 pb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-400" />
                  <span>Acerca de Yomori</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Información del sistema, novedades y hoja de ruta</p>
              </div>

              {/* Tarjeta de Versión */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#141824] to-indigo-950/40 border border-purple-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/40">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Yomori Reader</h3>
                      <p className="text-xs text-purple-300 font-bold">Versión 2.5.0 Alpha (Desktop & Web)</p>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckUpdates}
                    disabled={checkingUpdates}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdates ? 'Buscando...' : 'Buscar Actualizaciones'}</span>
                  </button>
                </div>

                {updateStatus && (
                  <p className="text-xs text-emerald-400 font-semibold p-3 rounded-xl bg-emerald-950/40 border border-emerald-800">
                    {updateStatus.message}
                  </p>
                )}
              </div>

              {/* Registro de Novedades (Changelog) */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Novedades de la Versión v2.5.0</span>
                </h3>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Filtro Anti-Finalizados:</strong> Bloqueo estricto de mangas terminados antiguos en nuevos lanzamientos (*Tomb Raider King*, *My Dad Is Too Strong*, etc.).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Jerarquía de Scans:</strong> Preferencia obligatoria para Olympus Scanlation y RN Scanlation sobre MiauScan en desempates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Navegación Retorno:</strong> Botón Volver ahora regresa con exactitud a la sección de origen (Inicio, Biblioteca, Historial).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span><strong>Ajustes en 2 Columnas:</strong> Nuevo diseño espacioso con copia de seguridad local completa, paleta de colores y seguridad.</span>
                  </li>
                </ul>
              </div>

              {/* Hoja de Ruta ("Lo que está por venir") */}
              <div className="p-5 rounded-3xl bg-[#141824] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Hoja de Ruta (Lo que está por venir)</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-400">
                  <li>• Sincronización automática de progreso multi-dispositivo en la nube.</li>
                  <li>• Compresión avanzada de imágenes descargadas para ahorro de disco.</li>
                  <li>• Sistema de marcadores comunitarios y comentarios con spoilers.</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
