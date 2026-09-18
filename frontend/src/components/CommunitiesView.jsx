import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Globe, 
  Flame, 
  Sparkles, 
  MessageSquare, 
  ArrowLeft, 
  Check, 
  X, 
  Loader2, 
  Search,
  ShieldCheck,
  Shield,
  Palette,
  Settings,
  Crown,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Send,
  MoveUp,
  MoveDown,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Clock,
  Tag
} from 'lucide-react';
import LiveChatRoom from './LiveChatRoom.jsx';

// Lista de permisos configurables para roles estilo Discord
const COMMUNITY_PERMISSIONS_LIST = [
  { key: 'admin', label: '🛡️ Administrador', desc: 'Control total de la comunidad (anula restricciones).' },
  { key: 'delete_messages', label: '🗑️ Eliminar Mensajes', desc: 'Permite eliminar mensajes de otros miembros en el chat.' },
  { key: 'kick_members', label: '🚫 Expulsar Miembros', desc: 'Permite expulsar a usuarios de la comunidad.' },
  { key: 'manage_roles', label: '🏷️ Asignar y Gestionar Roles', desc: 'Permite otorgar roles inferiores a otros miembros.' },
  { key: 'pin_messages', label: '📌 Fijar Mensajes', desc: 'Permite anclar mensajes importantes en el chat.' },
  { key: 'edit_community', label: '🎨 Modificar Comunidad', desc: 'Permite cambiar fotos, portada y descripción del gremio.' },
  { key: 'send_media', label: '💬 Enviar Multimedia', desc: 'Permite subir imágenes y adjuntos en el chat.' }
];

// Lista exhaustiva de todos los géneros y categorías de manga/manhwa
const ALL_MANGA_GENRES = [
  'Acción', 'Aventura', 'Artes Marciales', 'Cultivo', 'Comedia', 'Drama', 
  'Fantasía', 'Isekai', 'Misterio', 'Psicológico', 'Romance', 'Recuentos de la Vida', 
  'Reencarnación', 'Sci-Fi', 'Seinen', 'Shounen', 'Shoujo', 'Sobrenatural', 
  'Superpoderes', 'Suspenso', 'Terror', 'Webtoon', 'Manhwa', 'Manhua', 'General'
];

const COMM_BANNER_PRESETS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
  'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)',
  'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  'linear-gradient(135deg, #831843 0%, #be185d 50%, #f43f5e 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #06b6d4 100%)'
];

const EMOJI_CATEGORIES = {
  'Populares': ['⚔️', '🐉', '🌸', '🏰', '⚡', '🔥', '👑', '📜', '✨', '🎮', '💎', '🦊'],
  'Combate & Fantasía': ['🗡️', '🛡️', '🥋', '💥', '🪐', '🔮', '🏹', '🩸', '💀', '🧙‍♂️', '👹', '👺'],
  'Vida & Emociones': ['☕', '📖', '🎭', '🍀', '🌙', '⭐', '🌈', '🌺', '🍃', '❤️', '💫', '🎯']
};

// Componente Selector de Color Espectro idéntico a Discord / Referencia de usuario
function DiscordColorPicker({ color, onChange }) {
  const [hue, setHue] = useState(0);
  const [hexInput, setHexInput] = useState(color || '#3b82f6');

  useEffect(() => {
    if (color) {
      setHexInput(color);
    }
  }, [color]);

  const handleHexChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const presetColors = [
    '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', 
    '#10b981', '#14b8a6', '#06b6d4', '#6366f1', '#9ca3af'
  ];

  return (
    <div className="p-3 bg-[#0a0d14] border border-gray-800 rounded-2xl space-y-3 w-64 shadow-2xl">
      {/* Caja de degradado 2D */}
      <div 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
          // Aproximar color rgb simple
          const r = Math.round(255 * (1 - y) * (1 - x * 0.5));
          const g = Math.round(150 * x * (1 - y));
          const b = Math.round(255 * x * (1 - y));
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          setHexInput(hex);
          onChange(hex);
        }}
        className="w-full h-24 rounded-xl relative cursor-crosshair overflow-hidden border border-white/10"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hexInput})`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Barra de Tono / Hue Slider Rainbow */}
      <div className="relative">
        <input 
          type="range" 
          min="0" 
          max="360" 
          value={hue} 
          onChange={(e) => {
            const h = parseInt(e.target.value, 10);
            setHue(h);
            const a = 0.85 * Math.min(0.55, 1 - 0.55);
            const f = n => {
              const k = (n + h / 30) % 12;
              const colorVal = 0.55 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
              return Math.round(255 * colorVal).toString(16).padStart(2, '0');
            };
            const computedHex = `#${f(0)}${f(8)}${f(4)}`;
            setHexInput(computedHex);
            onChange(computedHex);
          }}
          className="w-full h-2.5 rounded-lg appearance-none cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
          }}
        />
      </div>

      {/* Paleta rápida de colores preestablecidos */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {presetColors.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { setHexInput(c); onChange(c); }}
            className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
              hexInput.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white scale-110 border-white' : 'border-black/30'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Input de código HEX */}
      <div className="flex items-center gap-2 bg-[#121622] px-3 py-1.5 rounded-xl border border-gray-700">
        <span className="text-gray-400 font-mono text-xs">#</span>
        <input 
          type="text"
          value={hexInput.replace('#', '')}
          onChange={handleHexChange}
          placeholder="000000"
          className="w-full bg-transparent text-white font-mono text-xs outline-none uppercase"
          maxLength={6}
        />
        <div className="w-4 h-4 rounded-md border border-white/20 shrink-0" style={{ backgroundColor: hexInput }} />
      </div>
    </div>
  );
}

export default function CommunitiesView({
  currentUser = null,
  onOpenAuth,
  onOpenUserCard,
  onSelectManga
}) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [activeGenreFilter, setActiveGenreFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para crear nueva comunidad
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createNoticeModal, setCreateNoticeModal] = useState(null);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [selectedGenres, setSelectedGenres] = useState(['Acción', 'Manhwa']);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const bannerFileInputRef = useRef(null);
  const iconFileInputRef = useRef(null);
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = currentUser?.username?.toLowerCase() === 'rey_palomo' || currentUser?.role === 'admin' || currentUser?.isAdmin;

  const handleReviewCommunity = async (communityId, action) => {
    try {
      const res = await axios.post('/api/social/communities/review', { communityId, action }, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (res.data?.success) {
        if (action === 'approve') {
          setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, status: 'approved' } : c));
        } else {
          setCommunities(prev => prev.filter(c => c.id !== communityId));
        }
      }
    } catch (err) {
      console.error('Error al revisar comunidad:', err);
    }
  };

  const handleBannerFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBannerPreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setIconPreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Modal de Ajustes de Comunidad (Líder / Admin)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('general'); // 'general' | 'roles' | 'members' | 'danger'
  const [editCommName, setEditCommName] = useState('');
  const [editCommDesc, setEditCommDesc] = useState('');
  const [editCommBanner, setEditCommBanner] = useState('');
  const [editCommIcon, setEditCommIcon] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Gestión de Roles 2 Columnas Estilo Discord
  const [communityRoles, setCommunityRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormColor, setRoleFormColor] = useState('#8b5cf6');
  const [roleFormPermissions, setRoleFormPermissions] = useState({
    admin: false,
    delete_messages: true,
    kick_members: false,
    manage_roles: false,
    pin_messages: false,
    edit_community: false,
    send_media: true
  });
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Menú contextual de miembros en la barra lateral
  const [activeMemberMenu, setActiveMemberMenu] = useState(null);

  const fetchCommunities = async () => {
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const res = await axios.get('/api/social/communities', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data?.success) {
        setCommunities(res.data.communities || []);
      }
    } catch (e) {
      console.warn('Error fetching communities:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [currentUser]);

  // Si cambia la comunidad seleccionada, sincronizar roles y ajustes
  useEffect(() => {
    if (selectedCommunity) {
      setEditCommName(selectedCommunity.name || '');
      setEditCommDesc(selectedCommunity.description || '');
      setEditCommBanner(selectedCommunity.banner || '');
      setEditCommIcon(selectedCommunity.icon || '');
      const roles = selectedCommunity.roles || [];
      setCommunityRoles(roles);
      if (roles.length > 0) {
        const first = roles[0];
        setSelectedRoleId(first.id);
        setRoleFormName(first.name || '');
        setRoleFormColor(first.color || '#8b5cf6');
        setRoleFormPermissions(first.permissions || {
          admin: false,
          delete_messages: true,
          kick_members: false,
          manage_roles: false,
          pin_messages: false,
          edit_community: false,
          send_media: true
        });
      }
    }
  }, [selectedCommunity]);

  // Toggle de selección de hasta 2 géneros
  const handleToggleGenre = (g) => {
    if (selectedGenres.includes(g)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(prev => prev.filter(x => x !== g));
      }
    } else {
      if (selectedGenres.length >= 2) {
        // Reemplazar el segundo
        setSelectedGenres([selectedGenres[0], g]);
      } else {
        setSelectedGenres(prev => [...prev, g]);
      }
    }
  };

  const handleCreateCommunity = async (e) => {
    if (e) e.preventDefault();
    
    // Obtener usuario autenticado desde props o localStorage
    let authUser = currentUser;
    if (!authUser) {
      try {
        const saved = localStorage.getItem('tachiyomi_user');
        if (saved) authUser = JSON.parse(saved);
      } catch (e) {}
    }

    if (!authUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    if (!newCommName.trim()) return;

    setIsCreating(true);
    try {
      const token = authUser?.token || localStorage.getItem('yomori_token') || '';
      
      const payload = {
        name: newCommName.trim(),
        description: newCommDesc.trim() || `Comunidad de lectores creada por ${authUser.username || 'un lector'}`,
        genres: selectedGenres.length > 0 ? selectedGenres : ['Acción', 'Manhwa'],
        category: selectedGenres[0] || 'General',
        icon: iconPreview || '',
        banner: bannerPreview || '',
        currentUserId: authUser.id,
        userId: authUser.id,
        currentUsername: authUser.username,
        username: authUser.username,
        token: token
      };

      const res = await axios.post('/api/social/communities', payload, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': authUser.id || '',
          'x-username': authUser.username || ''
        }
      });

      if (res.data?.success && res.data.community) {
        const comm = res.data.community;
        setCommunities(prev => [comm, ...prev.filter(c => c.id !== comm.id)]);
        setShowCreateModal(false);
        setNewCommName('');
        setNewCommDesc('');
        setBannerPreview(null);
        setIconPreview(null);
        
        if (comm.status === 'approved') {
          // Entrar de inmediato a la comunidad creada
          setSelectedCommunity(comm);
        } else {
          setCreateNoticeModal({
            title: '¡Solicitud de Comunidad Enviada!',
            message: 'Tu comunidad ha sido enviada para revisión por la administración. Una vez aprobada por Rey_Palomo, aparecerá públicamente para todos los lectores.'
          });
        }
      } else {
        alert(res.data?.message || 'No se pudo crear la comunidad.');
      }
    } catch (err) {
      console.error('Error creando comunidad:', err);
      alert(err.response?.data?.message || 'Error al conectar con el servidor para crear la comunidad.');
    } finally {
      setIsCreating(false);
    }
  };

  // Guardar ajustes generales de la comunidad
  const handleSaveGeneralSettings = async () => {
    if (!selectedCommunity || !currentUser) return;
    setIsSavingSettings(true);
    try {
      const res = await axios.put('/api/social/communities/settings', {
        communityId: selectedCommunity.id,
        name: editCommName,
        description: editCommDesc,
        banner: editCommBanner,
        icon: editCommIcon
      }, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });

      if (res.data?.success && res.data.community) {
        setSelectedCommunity(res.data.community);
        setCommunities(prev => prev.map(c => c.id === res.data.community.id ? res.data.community : c));
        setShowSettingsModal(false);
      }
    } catch (err) {
      console.error('Error guardando ajustes:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Seleccionar rol para editar
  const handleSelectRoleToEdit = (role) => {
    setIsCreatingNewRole(false);
    setSelectedRoleId(role.id);
    setRoleFormName(role.name || '');
    setRoleFormColor(role.color || '#8b5cf6');
    setRoleFormPermissions(role.permissions || {
      admin: false,
      delete_messages: true,
      kick_members: false,
      manage_roles: false,
      pin_messages: false,
      edit_community: false,
      send_media: true
    });
  };

  // Iniciar creación de nuevo rol
  const handleStartCreateRole = () => {
    setIsCreatingNewRole(true);
    setSelectedRoleId(null);
    setRoleFormName('');
    setRoleFormColor('#38bdf8');
    setRoleFormPermissions({
      admin: false,
      delete_messages: true,
      kick_members: false,
      manage_roles: false,
      pin_messages: false,
      edit_community: false,
      send_media: true
    });
  };

  // Reordenar roles hacia arriba (subir jerarquía) o hacia abajo
  const handleMoveRole = async (index, direction) => {
    if (!selectedCommunity || !currentUser) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= communityRoles.length) return;

    const newRoles = [...communityRoles];
    const [moved] = newRoles.splice(index, 1);
    newRoles.splice(targetIndex, 0, moved);

    const updatedWithPos = newRoles.map((r, idx) => ({ ...r, position: idx + 1 }));
    setCommunityRoles(updatedWithPos);
    setSelectedCommunity(prev => ({ ...prev, roles: updatedWithPos }));

    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      await axios.post('/api/social/communities/roles', {
        communityId: selectedCommunity.id,
        action: 'reorder',
        roles: updatedWithPos,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        token
      }, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser?.id || '',
          'x-username': currentUser?.username || ''
        }
      });
    } catch (e) {
      console.warn('Error guardando reordenamiento de roles:', e);
    }
  };

  // Guardar (Crear o Editar) rol con nombre, color y permisos completos
  const handleSaveRole = async () => {
    if (!roleFormName.trim() || !selectedCommunity || !currentUser) return;
    setIsSavingRole(true);
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const action = isCreatingNewRole ? 'create' : 'edit';
      const roleData = {
        name: roleFormName.trim(),
        color: roleFormColor,
        permissions: roleFormPermissions
      };

      const res = await axios.post('/api/social/communities/roles', {
        communityId: selectedCommunity.id,
        action,
        roleId: selectedRoleId,
        roleData,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        token
      }, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser?.id || '',
          'x-username': currentUser?.username || ''
        }
      });

      if (res.data?.success && res.data.roles) {
        setCommunityRoles(res.data.roles);
        setSelectedCommunity(prev => ({ ...prev, roles: res.data.roles }));
        if (isCreatingNewRole) {
          const created = res.data.roles[res.data.roles.length - 1];
          if (created) handleSelectRoleToEdit(created);
        }
      }
    } catch (err) {
      console.error('Error guardando rol:', err);
      alert(err.response?.data?.message || 'Error guardando rol');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const res = await axios.post('/api/social/communities/roles', {
        communityId: selectedCommunity.id,
        action: 'delete',
        roleId,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        token
      }, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser?.id || '',
          'x-username': currentUser?.username || ''
        }
      });

      if (res.data?.success && res.data.roles) {
        setCommunityRoles(res.data.roles);
        setSelectedCommunity(prev => ({ ...prev, roles: res.data.roles }));
        if (selectedRoleId === roleId) {
          const remaining = res.data.roles[0];
          if (remaining) handleSelectRoleToEdit(remaining);
          else handleStartCreateRole();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el rol');
    }
  };

  const handleAssignRoleToMember = async (targetUserId, roleId) => {
    if (!selectedCommunity || !currentUser) return;
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const res = await axios.post('/api/social/communities/assign-role', {
        communityId: selectedCommunity.id,
        targetUserId,
        roleId,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        token
      }, {
        headers: { 
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser?.id || '',
          'x-username': currentUser?.username || ''
        }
      });

      if (res.data?.success) {
        const updatedComm = res.data.community;
        if (updatedComm) {
          setSelectedCommunity(updatedComm);
          setCommunities(prev => prev.map(c => c.id === updatedComm.id ? updatedComm : c));
        } else {
          setSelectedCommunity(prev => {
            const updatedMembers = (prev.members || []).map(m => {
              const uId = typeof m === 'object' ? (m.userId || m.id) : m;
              if (uId === targetUserId) {
                return typeof m === 'object' ? { ...m, roleId } : { userId: m, roleId };
              }
              return m;
            });
            const updated = { ...prev, members: updatedMembers };
            setCommunities(all => all.map(c => c.id === prev.id ? updated : c));
            return updated;
          });
        }
        setActiveMemberMenu(null);
      }
    } catch (err) {
      console.error('Error asignando rol a miembro:', err);
      alert(err.response?.data?.message || 'Error al asignar rol.');
    }
  };

  const handleKickMember = async (targetUserId) => {
    if (!confirm('¿Estás seguro de expulsar a este usuario de la comunidad?')) return;
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const res = await axios.post('/api/social/communities/kick', {
        communityId: selectedCommunity.id,
        targetUserId,
        currentUserId: currentUser?.id,
        currentUsername: currentUser?.username,
        token
      }, {
        headers: { 
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser?.id || '',
          'x-username': currentUser?.username || ''
        }
      });

      if (res.data?.success) {
        setSelectedCommunity(prev => {
          const updatedMembers = (prev.members || []).filter(m => {
            const uId = typeof m === 'object' ? (m.userId || m.id) : m;
            return uId !== targetUserId;
          });
          const updated = {
            ...prev,
            members: updatedMembers,
            membersCount: Math.max(1, (prev.membersCount || 1) - 1)
          };
          setCommunities(all => all.map(c => c.id === prev.id ? updated : c));
          return updated;
        });
        setActiveMemberMenu(null);
      }
    } catch (err) {
      console.error('Error al expulsar miembro:', err);
      alert(err.response?.data?.message || 'Error al expulsar miembro.');
    }
  };

  const handleDeleteCommunity = async () => {
    if (!confirm('¿ESTÁS SEGURO DE ELIMINAR ESTA COMUNIDAD? Esta acción no se puede deshacer.')) return;
    try {
      const res = await axios.delete(`/api/social/communities/${selectedCommunity.id}`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` }
      });
      if (res.data?.success) {
        setCommunities(prev => prev.filter(c => c.id !== selectedCommunity.id));
        setSelectedCommunity(null);
        setShowSettingsModal(false);
      }
    } catch (err) {}
  };

  const handleToggleJoin = async (commId) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    try {
      const token = currentUser?.token || localStorage.getItem('yomori_token') || '';
      const res = await axios.post('/api/social/communities/join', { 
        communityId: commId,
        currentUserId: currentUser.id,
        currentUsername: currentUser.username,
        userId: currentUser.id,
        username: currentUser.username
      }, {
        headers: { 
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id || '',
          'x-username': currentUser.username || ''
        }
      });
      if (res.data?.success) {
        fetchCommunities();
        if (res.data.community) {
          setSelectedCommunity(res.data.community);
        } else if (selectedCommunity && selectedCommunity.id === commId) {
          setSelectedCommunity(prev => {
            const isCurrentlyMember = (prev.members || []).some(m => 
              (typeof m === 'string' ? (m === currentUser.id || m.toLowerCase() === currentUser.username?.toLowerCase()) : (m.userId === currentUser.id || m.username?.toLowerCase() === currentUser.username?.toLowerCase()))
            );
            let updatedMembers = [...(prev.members || [])];
            if (isCurrentlyMember) {
              updatedMembers = updatedMembers.filter(m => 
                (typeof m === 'string' ? (m !== currentUser.id && m.toLowerCase() !== currentUser.username?.toLowerCase()) : (m.userId !== currentUser.id && m.username?.toLowerCase() !== currentUser.username?.toLowerCase()))
              );
            } else {
              updatedMembers.push({
                userId: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.username)}`,
                roleId: 'role_member',
                joinedAt: new Date().toISOString()
              });
            }
            return {
              ...prev,
              members: updatedMembers,
              membersCount: updatedMembers.length
            };
          });
        }
      }
    } catch (err) {
      console.error('Error al unirse/salir de comunidad:', err);
    }
  };

  const isCurrentUserSuperAdmin = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      (currentUser.username || '').toLowerCase() === 'rey_palomo' ||
      (currentUser.username || '').toLowerCase() === 'admin'
    )
  );

  const isUserLeader = selectedCommunity && currentUser && (
    selectedCommunity.leaderId === currentUser.id || 
    selectedCommunity.createdBy === currentUser.username ||
    isCurrentUserSuperAdmin
  );

  const filteredCommunities = communities.filter(c => {
    const matchGenre = activeGenreFilter === 'all' || (c.genres && c.genres.includes(activeGenreFilter)) || c.category === activeGenreFilter;
    const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchGenre && matchSearch;
  });

  // Agrupación de miembros por roles estilo Discord para la barra lateral derecha
  const groupedMembers = React.useMemo(() => {
    if (!selectedCommunity) return [];
    let members = [...(selectedCommunity.members || [])];

    // Si el Super Admin actual está viendo la comunidad y no está aún en members, agregarlo a la vista en vivo
    if (isCurrentUserSuperAdmin && currentUser && !members.some(m => m.userId === currentUser.id || m.username?.toLowerCase() === currentUser.username?.toLowerCase())) {
      members.unshift({
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        roleId: 'role_super_admin',
        isGlobalAdmin: true
      });
    }

    const roles = selectedCommunity.roles || [
      { id: 'role_leader', name: '👑 Líder', color: '#f59e0b', position: 1 },
      { id: 'role_member', name: '👥 Miembros', color: '#9ca3af', position: 4 }
    ];

    // Separar administradores globales
    const superAdmins = members.filter(m => 
      (m.username || '').toLowerCase() === 'rey_palomo' || 
      (m.username || '').toLowerCase() === 'admin' ||
      m.role === 'admin' ||
      m.isGlobalAdmin ||
      m.roleId === 'role_super_admin'
    );

    const regularMembers = members.filter(m => 
      !((m.username || '').toLowerCase() === 'rey_palomo' || 
        (m.username || '').toLowerCase() === 'admin' ||
        m.role === 'admin' ||
        m.isGlobalAdmin ||
        m.roleId === 'role_super_admin')
    );

    // Ordenar roles por posición
    const sortedRoles = [...roles].sort((a, b) => (a.position || 0) - (b.position || 0));

    const regularGroups = sortedRoles.map(role => {
      const roleMembers = regularMembers.filter(m => (m.roleId || 'role_member') === role.id);
      return {
        role,
        members: roleMembers
      };
    }).filter(group => group.members.length > 0);

    if (superAdmins.length > 0) {
      return [
        {
          role: { id: 'role_super_admin', name: '👑 Administrador Global', color: '#ef4444', isProtected: true, position: 0 },
          members: superAdmins
        },
        ...regularGroups
      ];
    }

    return regularGroups;
  }, [selectedCommunity, currentUser, isCurrentUserSuperAdmin]);

  // ==========================================
  // VISTA DENTRO DE UNA COMUNIDAD (ESTILO DISCORD)
  // ==========================================
  if (selectedCommunity) {
    const isMember = Boolean(
      isCurrentUserSuperAdmin ||
      isUserLeader ||
      (selectedCommunity.members || []).some(m => 
        (typeof m === 'string' ? (m === currentUser?.id || (currentUser?.username && m.toLowerCase() === currentUser.username.toLowerCase())) : (m.userId === currentUser?.id || (m.username && currentUser?.username && m.username.toLowerCase() === currentUser.username.toLowerCase())))
      )
    );

    return (
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-2 select-none animate-fadeIn flex flex-col h-[calc(100vh-75px)]">
        
        {/* Barra Superior de la Comunidad */}
        <div className="flex items-center justify-between gap-3 pb-2.5 mb-2 border-b border-gray-800/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedCommunity(null)}
              className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-purple-900/40 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Comunidades</span>
            </button>

            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-lg shrink-0">
                {selectedCommunity.iconType === 'image' ? (
                  <img src={selectedCommunity.icon} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span>{selectedCommunity.icon || '🌟'}</span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                {selectedCommunity.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Ajustes de Comunidad para Líder o Admin */}
            {isUserLeader && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">Ajustes</span>
              </button>
            )}

            {/* Botón Unirse / Salir */}
            <button
              onClick={() => handleToggleJoin(selectedCommunity.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                isMember 
                  ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/30'
              }`}
            >
              {isMember ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isMember ? 'Salir' : 'Unirme'}</span>
            </button>
          </div>
        </div>

        {/* Layout 2 Columnas Estilo Discord: Chat Central (Seamless) + Barra de Miembros Derecha */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden pb-1">
          
          {/* Columna Principal (3/4): Chat en Vivo de la Comunidad (Seamless, sin cajas dentro de cajas) */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden">
            <LiveChatRoom
              roomId={`comm_${selectedCommunity.id}`}
              roomTitle={selectedCommunity.name}
              currentUser={currentUser}
              onOpenAuth={onOpenAuth}
              onOpenUserCard={onOpenUserCard}
              onSelectManga={onSelectManga}
              isCommunityLeader={isUserLeader}
              isCommunityMember={isMember}
              onJoinCommunity={() => handleToggleJoin(selectedCommunity.id)}
              variant="seamless"
            />
          </div>

          {/* Columna Derecha (1/4): Tarjeta de Miembros Agrupados por Rol */}
          <div className="hidden lg:flex flex-col h-full min-h-0 bg-[#0e121b]/95 border border-gray-800/80 rounded-2xl p-4 overflow-y-auto custom-scrollbar shadow-xl backdrop-blur-md">
            <div className="pb-3 mb-2 border-b border-gray-800/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Miembros ({selectedCommunity.members?.length || 1})</span>
              </span>
            </div>

            {/* Grupos de Roles */}
            <div className="space-y-4">
              {groupedMembers.map(({ role, members }) => (
                <div key={role.id} className="space-y-1.5">
                  {/* Encabezado de Rol con Contador */}
                  <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-1 font-mono" style={{ color: role.color || '#9ca3af' }}>
                    <span>{role.name}</span>
                    <span className="text-gray-500">— {members.length}</span>
                  </div>

                  {/* Miembros del Rol con Color personalizado */}
                  <div className="space-y-1">
                    {members.map(member => (
                      <div
                        key={member.userId}
                        className="group relative flex items-center justify-between p-1.5 rounded-xl hover:bg-[#141926] transition cursor-pointer"
                        onClick={() => onOpenUserCard && onOpenUserCard(member.userId)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-black shrink-0 border border-gray-700/60">
                            <img 
                              src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
                          </div>
                          <div className="min-w-0">
                            <span 
                              className="text-xs font-bold block truncate" 
                              style={{ color: role.color || '#e5e7eb' }}
                            >
                              {member.username}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block truncate">
                              Lector activo
                            </span>
                          </div>
                        </div>

                        {/* Opciones de Miembro para Líder */}
                        {isUserLeader && member.userId !== currentUser?.id && (
                          <div className="opacity-0 group-hover:opacity-100 transition relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMemberMenu(activeMemberMenu === member.userId ? null : member.userId);
                              }}
                              className="p-1 rounded-lg hover:bg-purple-900/60 text-gray-400 hover:text-white"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMemberMenu === member.userId && (
                              <div className="absolute right-0 top-6 z-50 w-44 bg-[#0a0d14] border border-gray-700 rounded-2xl p-1.5 shadow-2xl space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 px-2 py-1 block">Asignar Rol</span>
                                {(selectedCommunity.roles || []).map(r => (
                                  <button
                                    key={r.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignRoleToMember(member.userId, r.id);
                                    }}
                                    className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[#1a2030] flex items-center justify-between"
                                    style={{ color: r.color }}
                                  >
                                    <span>{r.name}</span>
                                    {member.roleId === r.id && <Check className="w-3 h-3 text-emerald-400" />}
                                  </button>
                                ))}
                                <div className="border-t border-gray-800 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleKickMember(member.userId);
                                  }}
                                  className="w-full text-left px-2 py-1 rounded-lg text-xs font-bold text-red-400 hover:bg-red-950/50 flex items-center gap-1.5"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>Expulsar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL DE AJUSTES DE COMUNIDAD (LÍDER) */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-4xl bg-[#0e121a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header Modal */}
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Ajustes de la Comunidad</h3>
                    <p className="text-xs text-gray-400">Control de roles, miembros e identidad de tu comunidad</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pestañas de Ajustes */}
              <div className="flex border-b border-gray-800 bg-[#0a0d14] px-4 gap-2">
                {[
                  { id: 'general', label: 'General' },
                  { id: 'roles', label: 'Roles & Permisos (Discord)' },
                  { id: 'members', label: 'Miembros' },
                  { id: 'danger', label: 'Zona de Peligro' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsActiveTab(tab.id)}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                      settingsActiveTab === tab.id 
                        ? 'border-purple-500 text-white bg-purple-950/20' 
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenido de Pestañas */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Pestaña 1: General */}
                <div className={settingsActiveTab === 'general' ? 'space-y-4' : 'hidden'}>
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Nombre de la Comunidad</label>
                    <input 
                      type="text" 
                      value={editCommName}
                      onChange={(e) => setEditCommName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">Descripción</label>
                    <textarea 
                      value={editCommDesc}
                      onChange={(e) => setEditCommDesc(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">URL de Banner de Portada</label>
                    <input 
                      type="text" 
                      value={editCommBanner}
                      onChange={(e) => setEditCommBanner(e.target.value)}
                      placeholder="https://ejemplo.com/banner.jpg"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSaveGeneralSettings}
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    {isSavingSettings ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>

                {/* Pestaña 2: Roles y Permisos en 2 Columnas Estilo Discord */}
                <div className={settingsActiveTab === 'roles' ? 'grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[460px]' : 'hidden'}>
                  
                  {/* COLUMNA IZQUIERDA: Lista de Roles con Orden Jerárquico */}
                  <div className="md:col-span-5 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-gray-800/80 pr-0 md:pr-4">
                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <span className="text-xs font-black text-white uppercase tracking-wider block">Roles</span>
                        <span className="text-[10px] text-gray-400">Usa ▲/▼ para ordenar jerarquía</span>
                      </div>
                      <button
                        onClick={handleStartCreateRole}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nuevo</span>
                      </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                      {communityRoles.map((role, idx) => {
                        const isSelected = !isCreatingNewRole && selectedRoleId === role.id;
                        return (
                          <div
                            key={role.id || idx}
                            onClick={() => handleSelectRoleToEdit(role)}
                            className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected 
                                ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/50' 
                                : 'bg-[#121622] border-gray-800/80 hover:border-gray-700 hover:bg-[#161b2a]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Botones para Subir y Bajar Jerarquía */}
                              <div className="flex flex-col items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleMoveRole(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Subir prioridad de rol"
                                  className={`p-0.5 rounded hover:bg-gray-700 transition ${idx === 0 ? 'opacity-20 cursor-not-allowed text-gray-500' : 'text-gray-300 hover:text-white cursor-pointer'}`}
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveRole(idx, 'down')}
                                  disabled={idx === communityRoles.length - 1}
                                  title="Bajar prioridad de rol"
                                  className={`p-0.5 rounded hover:bg-gray-700 transition ${idx === communityRoles.length - 1 ? 'opacity-20 cursor-not-allowed text-gray-500' : 'text-gray-300 hover:text-white cursor-pointer'}`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div 
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                                style={{ backgroundColor: role.color || '#3b82f6' }}
                              />

                              <div className="truncate">
                                <span className="text-xs font-bold block truncate" style={{ color: role.color || '#fff' }}>
                                  {role.name}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {role.isProtected ? 'Sistema' : 'Personalizado'}
                                </span>
                              </div>
                            </div>

                            {role.isProtected && (
                              <Shield className="w-3.5 h-3.5 text-yellow-500 shrink-0" title="Rol protegido del sistema" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: Editor de Nombre, Color y Permisos */}
                  <div className="md:col-span-7 flex flex-col gap-4 overflow-y-auto max-h-[460px] pl-0 md:pl-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span>{isCreatingNewRole ? '✨ Crear Nuevo Rol' : `🛠️ Editar Rol: ${roleFormName || 'Sin Nombre'}`}</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          {isCreatingNewRole ? 'Configura el nombre, color y permisos del nuevo rol' : 'Ajusta los privilegios y apariencia de este rol'}
                        </p>
                      </div>
                      {!isCreatingNewRole && selectedRoleId && !communityRoles.find(r => r.id === selectedRoleId)?.isProtected && (
                        <button
                          onClick={() => handleDeleteRole(selectedRoleId)}
                          title="Eliminar este rol"
                          className="p-1.5 rounded-xl hover:bg-red-950/60 text-gray-400 hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Nombre del Rol */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">Nombre del Rol</label>
                      <input
                        type="text"
                        value={roleFormName}
                        onChange={(e) => setRoleFormName(e.target.value)}
                        placeholder="Ej: ⚔️ Cazador S, 🎨 Colorista, etc."
                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500 font-bold"
                      />
                    </div>

                    {/* Selector de Color estilo Discord */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1.5">Color del Rol</label>
                      <DiscordColorPicker 
                        color={roleFormColor} 
                        onChange={(newC) => setRoleFormColor(newC)} 
                      />
                    </div>

                    {/* Lista de Permisos */}
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <label className="text-[11px] font-bold text-gray-300 block">Permisos de Comunidad</label>
                      <div className="space-y-2">
                        {COMMUNITY_PERMISSIONS_LIST.map((perm) => {
                          const isEnabled = !!roleFormPermissions[perm.key];
                          return (
                            <label 
                              key={perm.key} 
                              className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                                isEnabled ? 'bg-purple-950/20 border-purple-800/60' : 'bg-[#121622] border-gray-800 hover:bg-[#161b2a]'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-white block">{perm.label}</span>
                                <span className="text-[10px] text-gray-400 block leading-tight">{perm.desc}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={isEnabled} 
                                onChange={(e) => {
                                  setRoleFormPermissions(prev => ({
                                    ...prev,
                                    [perm.key]: e.target.checked
                                  }));
                                }}
                                className="w-4 h-4 rounded mt-0.5 accent-purple-600 cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botón Guardar Rol */}
                    <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
                      <button
                        onClick={handleSaveRole}
                        disabled={isSavingRole || !roleFormName.trim()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSavingRole ? 'Guardando...' : (isCreatingNewRole ? 'Crear Rol' : 'Guardar Cambios')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pestaña 3: Miembros de la Comunidad */}
                <div className={settingsActiveTab === 'members' ? 'space-y-4' : 'hidden'}>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>👥 Gestión de Miembros</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-mono">
                          {selectedCommunity?.members?.length || 1}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400">Asigna roles personalizados o expulsa usuarios de tu comunidad</p>
                    </div>

                    {/* Buscador de Miembros */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Buscar miembro..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Lista de Miembros */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {(() => {
                      const rawMembers = selectedCommunity?.members || [];
                      const membersList = rawMembers.length > 0 ? rawMembers : [
                        { userId: selectedCommunity?.createdBy || currentUser?.id, username: selectedCommunity?.createdBy || currentUser?.username, roleId: 'role_leader' }
                      ];

                      const filtered = membersList.filter(m => {
                        const name = typeof m === 'object' ? (m.username || m.userId || '') : String(m);
                        return name.toLowerCase().includes(memberSearchQuery.toLowerCase());
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-8 text-center text-gray-500 text-xs">
                            No se encontraron miembros con ese nombre.
                          </div>
                        );
                      }

                      return filtered.map((m, idx) => {
                        const mId = typeof m === 'object' ? (m.userId || m.id) : String(m);
                        const mName = typeof m === 'object' ? (m.username || m.userId || 'Miembro') : String(m);
                        const mRoleId = typeof m === 'object' ? (m.roleId || (mName === selectedCommunity?.createdBy ? 'role_leader' : 'role_member')) : (m === selectedCommunity?.createdBy ? 'role_leader' : 'role_member');
                        const assignedRole = communityRoles.find(r => r.id === mRoleId) || { name: '👥 Miembro', color: '#9ca3af' };
                        const isLeader = mName === selectedCommunity?.createdBy || mId === selectedCommunity?.createdBy;

                        return (
                          <div
                            key={mId || idx}
                            className="p-3 rounded-2xl bg-[#121622] border border-gray-800 hover:border-gray-700 flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-sm font-bold text-purple-300 shrink-0 uppercase">
                                {mName.slice(0, 2)}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white truncate">@{mName}</span>
                                  {isLeader && (
                                    <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" title="Creador / Líder" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span 
                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1"
                                    style={{
                                      backgroundColor: `${assignedRole.color}22`,
                                      color: assignedRole.color || '#9ca3af',
                                      borderColor: `${assignedRole.color}55`,
                                      borderWidth: '1px'
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: assignedRole.color || '#9ca3af' }} />
                                    {assignedRole.name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Acciones de Rol y Expulsión */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Selector de Rol */}
                              <select
                                value={mRoleId}
                                onChange={(e) => handleAssignRoleToMember(mId, e.target.value)}
                                disabled={isLeader}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#141824] border border-gray-800 text-gray-200 outline-none focus:border-purple-500 cursor-pointer ${
                                  isLeader ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-700'
                                }`}
                              >
                                {communityRoles.map(role => (
                                  <option key={role.id} value={role.id} className="bg-[#121622] text-white">
                                    {role.name}
                                  </option>
                                ))}
                              </select>

                              {/* Botón Expulsar */}
                              {!isLeader && (
                                <button
                                  onClick={() => handleKickMember(mId)}
                                  title="Expulsar de la comunidad"
                                  className="p-1.5 rounded-xl hover:bg-red-950/60 text-gray-400 hover:text-red-400 transition cursor-pointer"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Pestaña 4: Zona de Peligro */}
                <div className={settingsActiveTab === 'danger' ? 'p-5 bg-red-950/20 border border-red-900/40 rounded-2xl space-y-4' : 'hidden'}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-red-200">Eliminar Comunidad Definitivamente</h4>
                      <p className="text-xs text-red-300/80 mt-0.5">Se eliminarán permanentemente todos los chats, roles y miembros de esta comunidad.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteCommunity}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-950/60 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Comunidad</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA EXPLORAR COMUNIDADES
  // ==========================================
  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-10 py-6 pb-28 space-y-6 animate-fadeIn select-none">
      
      {/* Encabezado y Barra de Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Comunidades de Lectores</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-bold">
                {communities.length} activas
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Únete a gremios, debates y grupos temáticos de mangas, manhwas y cultivación.
            </p>
          </div>
        </div>

        {/* Botón Crear Comunidad */}
        <button
          onClick={() => {
            if (!currentUser) {
              if (onOpenAuth) onOpenAuth('login');
              return;
            }
            setShowCreateModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Comunidad</span>
        </button>
      </div>

      {/* Selector de Géneros & Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveGenreFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeGenreFilter === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#121622] text-gray-400 hover:text-gray-200 border border-gray-800'
            }`}
          >
            Todas ({communities.length})
          </button>
          {ALL_MANGA_GENRES.slice(0, 14).map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenreFilter(genre)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeGenreFilter === genre
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#121622] text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              <Tag className="w-3 h-3 text-purple-400" />
              <span>{genre}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cuadrícula de Comunidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredCommunities.map((comm) => (
          <div
            key={comm.id}
            onClick={() => setSelectedCommunity(comm)}
            className="group relative bg-[#121622] border border-gray-800/80 hover:border-purple-600/70 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-purple-950/40 cursor-pointer flex flex-col justify-between"
          >
            {/* Banner de la Comunidad */}
            <div 
              className="relative h-28 w-full overflow-hidden"
              style={{
                background: comm.bannerType === 'image' || comm.banner?.startsWith('http') 
                  ? `url(${comm.banner}) center/cover no-repeat` 
                  : (comm.banner || COMM_BANNER_PRESETS[0])
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#121622] via-transparent to-black/20" />
              
              {/* Badge de Estado en Revisión */}
              {comm.status === 'pending_approval' && (
                <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-lg bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                  En Revisión
                </div>
              )}
            </div>

            {/* Contenido de la Tarjeta */}
            <div className="p-4 pt-0 -mt-7 relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-xl shrink-0">
                    {comm.iconType === 'image' ? (
                      <img src={comm.icon} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span>{comm.icon || '🌟'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-gray-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{comm.membersCount || comm.members?.length || 1}</span>
                  </div>
                </div>

                <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {comm.name}
                </h3>
                
                <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                  {comm.description}
                </p>

                {/* Géneros */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {(comm.genres || [comm.category || 'General']).map((g, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botón Entrar / Acciones de Moderación Admin */}
              <div className="pt-3 mt-3 border-t border-gray-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-mono">
                    Por @{comm.createdBy}
                  </span>
                  <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Entrar</span>
                    <span>→</span>
                  </span>
                </div>

                {isAdmin && comm.status === 'pending_approval' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReviewCommunity(comm.id, 'approve');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReviewCommunity(comm.id, 'reject');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PARA CREAR COMUNIDAD */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e121a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-white">Crear Nueva Comunidad</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Nombre */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Nombre de la Comunidad *</label>
                <input 
                  type="text" 
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="Ej: Secta del Cultivo Celestial 🗡️"
                  maxLength={50}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500 font-bold"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Descripción</label>
                <textarea 
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="¿De qué trata esta comunidad de lectores?"
                  rows={2}
                  maxLength={200}
                  className="w-full px-4 py-2 rounded-xl bg-[#141824] border border-gray-800 text-white text-xs outline-none focus:border-purple-500"
                />
              </div>

              {/* Selección de hasta 2 Géneros */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">Géneros / Categorías (Elige hasta 2)</label>
                  <span className="text-[10px] font-mono text-purple-400">{selectedGenres.length}/2 seleccionados</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#090c12] rounded-xl border border-gray-800 custom-scrollbar">
                  {ALL_MANGA_GENRES.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleToggleGenre(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedGenres.includes(g)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-[#141824] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subir Banner de Portada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">Banner de Portada</label>
                  <span className="text-[10px] text-purple-400 font-mono">1200 x 320 px recomendado</span>
                </div>
                <input 
                  type="file" 
                  ref={bannerFileInputRef} 
                  accept="image/*" 
                  onChange={handleBannerFileSelect} 
                  className="hidden" 
                />
                {bannerPreview ? (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden border border-purple-500/50 group shadow-lg">
                    <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5" /> Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerPreview(null)}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-gray-800 hover:border-purple-500 bg-[#090c12]/60 hover:bg-purple-950/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-gray-400 hover:text-purple-300 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-300 group-hover:text-purple-300">Seleccionar Banner de Portada</span>
                    <span className="text-[10px] text-gray-500">Haz clic para abrir el explorador (Opcional: degradado aleatorio por defecto)</span>
                  </div>
                )}
              </div>

              {/* Subir Foto de Perfil / Ícono */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">Foto de Perfil / Logo</label>
                  <span className="text-[10px] text-purple-400 font-mono">512 x 512 px recomendado</span>
                </div>
                <input 
                  type="file" 
                  ref={iconFileInputRef} 
                  accept="image/*" 
                  onChange={handleIconFileSelect} 
                  className="hidden" 
                />
                {iconPreview ? (
                  <div className="flex items-center gap-3 p-2 bg-[#090c12] rounded-xl border border-purple-500/40">
                    <img src={iconPreview} alt="Icon Preview" className="w-14 h-14 rounded-xl object-cover border border-purple-500 shadow-md shrink-0" />
                    <div className="flex-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => iconFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5" /> Cambiar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setIconPreview(null)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-red-600/80 text-gray-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => iconFileInputRef.current?.click()}
                    className="w-full p-3 rounded-xl border-2 border-dashed border-gray-800 hover:border-purple-500 bg-[#090c12]/60 hover:bg-purple-950/10 flex items-center gap-3 cursor-pointer transition text-gray-400 hover:text-purple-300 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400 group-hover:scale-110 transition shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-300 group-hover:text-purple-300">Seleccionar Foto de Perfil</span>
                      <span className="text-[10px] text-gray-500">Haz clic para abrir el explorador (Opcional: avatar aleatorio por defecto)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 transition transform active:scale-95 cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Crear Comunidad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE SOLICITUD EN REVISIÓN */}
      {createNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e121a] border border-gray-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">{createNoticeModal.title}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{createNoticeModal.message}</p>
            <button
              onClick={() => setCreateNoticeModal(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
