import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar.jsx';
import HomeView from './components/HomeView.jsx';
import LibraryView from './components/LibraryView.jsx';
import UpdatesView from './components/UpdatesView.jsx';
import HistoryView from './components/HistoryView.jsx';
import ExploreView from './components/ExploreView.jsx';
import DownloadsView from './components/DownloadsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import MangaDetailsView from './components/MangaDetailsView.jsx';
import AnimePlayerView from './components/AnimePlayerView.jsx';
import Reader from './components/Reader.jsx';
import FloatingControls from './components/FloatingControls.jsx';
import ChapterCommentsDrawer from './components/ChapterCommentsDrawer.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ExtensionsModal from './components/ExtensionsModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import ProfileView from './components/ProfileView.jsx';
import MessagesView from './components/MessagesView.jsx';
import CommunitiesView from './components/CommunitiesView.jsx';
import UserCardPopover from './components/UserCardPopover.jsx';
import OfficialLandingPage from './components/OfficialLandingPage.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import { getSocket } from './services/socket.js';
import { 
  calculateReaderRank, 
  calculateTotalUniqueReadChapters, 
  updateReadingStreak,
  recordLifetimeReadChapter
} from './services/readerRankService.js';
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Settings as SettingsIcon, LogIn, User, BookOpen } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

const DEFAULT_ADMIN_USER = {
  id: "usr_1788991964318_s09yt",
  username: "Rey_Palomo",
  email: "cristofer.apaza01@gmail.com",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberOtaku",
  role: "admin",
  badge: "👑 Administrador Global ⚡",
  banner: "linear-gradient(135deg, #b91c1c 0%, #ea580c 50%, #f59e0b 100%)",
  bio: "👑 Administrador Global de Yomori",
  token: "26fc7a2c4a9a43a30bf177915ba3d60cda3dd5e38aa2061265471a5471fe0b7b"
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[Yomori Error Boundary Caught]:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#0f131f] border border-red-800/60 shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400 font-bold text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-white">¡Ha ocurrido un error inesperado!</h2>
            <p className="text-xs text-gray-400">
              {this.state.error?.message || 'Ocurrió un problema en la interfaz de la aplicación.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer"
            >
              Reiniciar Vista
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const deduplicateLibrary = (list) => {
  if (!Array.isArray(list)) return [];
  const seenUrls = new Set();
  const seenTitles = new Set();
  return list.filter(item => {
    if (!item) return false;
    const rawUrl = item.url || item.link || '';
    const rawTitle = item.title || item.mangaTitle || '';
    if (!rawUrl && !rawTitle) return false;

    const urlKey = rawUrl.trim().toLowerCase();
    const normTitle = rawTitle.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (urlKey && seenUrls.has(urlKey)) return false;
    if (normTitle && seenTitles.has(normTitle)) return false;

    if (urlKey) seenUrls.add(urlKey);
    if (normTitle) seenTitles.add(normTitle);
    return true;
  });
};

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const isElectron = typeof window !== 'undefined' && (
    window.navigator.userAgent.includes('Electron') || 
    window.location.search.includes('mode=app')
  );

  // =========================================================================
  // 1. REFS
  // =========================================================================
  const chapterExtractionCache = useRef({});
  const isInitialSyncDoneRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  const mangaRegistryRef = useRef({});

  // =========================================================================
  // 2. TODOS LOS ESTADOS (useState) JUNTOS AL INICIO
  // =========================================================================
  const [view, setView] = useState(() => (isElectron ? 'home' : 'landing'));
  const [previousView, setPreviousView] = useState(() => (isElectron ? 'home' : 'landing'));
  const [appMode, setAppMode] = useState(() => localStorage.getItem('yomori_app_mode') || 'manga');
  const [exploreSubTab, setExploreSubTab] = useState('sources');
  const [unreadDMsCount, setUnreadDMsCount] = useState(0);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tachiyomi_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      }
    } catch (e) {}
    localStorage.setItem('tachiyomi_user', JSON.stringify(DEFAULT_ADMIN_USER));
    localStorage.setItem('yomori_remember_me', 'true');
    return DEFAULT_ADMIN_USER;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [initialDirectChatUserId, setInitialDirectChatUserId] = useState(null);
  const [userCardModal, setUserCardModal] = useState({
    isOpen: false,
    userId: null,
    usernameFallback: null,
    userAvatarFallback: null
  });

  const [mangaRepositories, setMangaRepositories] = useState(() => {
    const saved = localStorage.getItem('yomori_repos') || localStorage.getItem('tachiyomi_repos');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(r => r.name.includes('Keiyoushi') ? { ...r, name: 'Repositorio Oficial Yomori' } : r);
    }
    return [
      { name: 'Repositorio Oficial Yomori (GitHub)', url: 'https://raw.githubusercontent.com/cristoferapaza01-ai/yomori-extensions/main/index.json' },
      { name: 'Repositorio Cloud Yomori (Oracle)', url: 'http://158.101.116.245/repo/index.json' }
    ];
  });

  const [animeRepositories, setAnimeRepositories] = useState(() => {
    const saved = localStorage.getItem('yomori_anime_repos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { name: 'Repositorio Oficial Yomori Anime (GitHub)', url: 'https://raw.githubusercontent.com/cristoferapaza01-ai/yomori-anime-extensions/main/index.min.json' }
    ];
  });

  const [installedExtensions, setInstalledExtensions] = useState(() => {
    try {
      const cached = localStorage.getItem('yomori_installed_extensions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingExtensions, setLoadingExtensions] = useState(true);
  const [selectedExtension, setSelectedExtension] = useState('');

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [catalogTotalPages, setCatalogTotalPages] = useState(null);

  const [activeFilters, setActiveFilters] = useState({
    query: '',
    type: '',
    status: '',
    sort: 'popular',
    genres: []
  });

  const [selectedManga, setSelectedManga] = useState(null);
  const [loadingManga, setLoadingManga] = useState(false);

  const [chapterData, setChapterData] = useState(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [initialReaderPage, setInitialReaderPage] = useState(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const [mangaLibrary, setMangaLibrary] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_library');
    return saved ? deduplicateLibrary(JSON.parse(saved)) : [];
  });

  const [animeLibrary, setAnimeLibrary] = useState(() => {
    const saved = localStorage.getItem('yomori_anime_library');
    return saved ? deduplicateLibrary(JSON.parse(saved)) : [];
  });

  const [mangaCategories, setMangaCategories] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_categories');
    return saved ? JSON.parse(saved) : ['Todos'];
  });

  const [animeCategories, setAnimeCategories] = useState(() => {
    const saved = localStorage.getItem('yomori_anime_categories');
    return saved ? JSON.parse(saved) : ['Todos'];
  });

  const [readChaptersMap, setReadChaptersMap] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_read_chapters');
    return saved ? JSON.parse(saved) : {};
  });

  const [chapterProgressMap, setChapterProgressMap] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_chapter_progress');
    return saved ? JSON.parse(saved) : {};
  });

  const sanitizeHistoryList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
      if (!item) return null;
      let mangaTitle = item.mangaTitle || '';
      let cover = item.cover || '';
      let coverProxy = item.coverProxy || '';
      const mangaUrl = item.mangaUrl || item.url || '';

      if (mangaUrl && mangaTitle) {
        const slug = decodeURIComponent(mangaUrl).toLowerCase();
        if (slug.includes('el-hijo-menor') && mangaTitle.toLowerCase().includes('loco frontera')) {
          mangaTitle = 'El hijo menor del maestro de la espada';
        } else if (slug.includes('loco-frontera') && (mangaTitle.toLowerCase().includes('ingeniero') || cover.toLowerCase().includes('ingeniero'))) {
          mangaTitle = 'Loco Frontera';
          if (cover.toLowerCase().includes('ingeniero')) {
            cover = '';
            coverProxy = '';
          }
        }
      }

      return {
        ...item,
        mangaTitle: mangaTitle || 'Manga',
        cover,
        coverProxy
      };
    }).filter(Boolean);
  };

  const [mangaHistory, setMangaHistory] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_history');
    if (!saved) return [];
    try {
      return sanitizeHistoryList(JSON.parse(saved));
    } catch {
      return [];
    }
  });

  const [animeHistory, setAnimeHistory] = useState(() => {
    const saved = localStorage.getItem('yomori_anime_history');
    if (!saved) return [];
    try {
      return sanitizeHistoryList(JSON.parse(saved));
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('tachiyomi_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      theme: 'dark',
      accentColor: '#9333ea',
      defaultStartTab: 'home',
      language: 'es',
      confirmExitReader: false,
      showSidebarBadges: true,
      highQualityCovers: true,
      readerMode: 'webtoon',
      maxWidth: '100%',
      brightness: 100,
      pageGap: 0,
      invertTaps: false,
      gridSize: 'normal',
      showUnreadBadge: true,
      autoDownloadNewChapters: false,
      autoDownloadNextWhileReading: false,
      concurrentDownloads: 2,
      downloadOnlyOnWifi: false
    };
  });

  const [downloadStatusMap, setDownloadStatusMap] = useState({});
  const [downloadQueue, setDownloadQueue] = useState({ isPaused: false, activeCount: 0, items: [] });
  const [updatesCount, setUpdatesCount] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_updates_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // =========================================================================
  // 3. TODOS LOS useMemo JUNTOS (DESPUÉS DE TODOS LOS useState)
  // =========================================================================
  const repositories = useMemo(() => {
    return appMode === 'anime' ? animeRepositories : mangaRepositories;
  }, [appMode, animeRepositories, mangaRepositories]);

  const library = useMemo(() => {
    return appMode === 'anime' ? animeLibrary : mangaLibrary;
  }, [appMode, animeLibrary, mangaLibrary]);

  const categories = useMemo(() => {
    return appMode === 'anime' ? animeCategories : mangaCategories;
  }, [appMode, animeCategories, mangaCategories]);

  const history = useMemo(() => {
    return appMode === 'anime' ? animeHistory : mangaHistory;
  }, [appMode, animeHistory, mangaHistory]);

  const totalUserReadChapters = useMemo(() => {
    return calculateTotalUniqueReadChapters(library, readChaptersMap, history);
  }, [library, readChaptersMap, history]);

  const currentUserRank = useMemo(() => {
    return calculateReaderRank(totalUserReadChapters);
  }, [totalUserReadChapters]);

  const enrichedCurrentUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      rank: currentUserRank.badge,
      badge: currentUserRank.badge,
      level: currentUserRank.level,
      totalChaptersRead: totalUserReadChapters
    };
  }, [currentUser, currentUserRank, totalUserReadChapters]);

  const downloads = useMemo(() => {
    const map = {};
    Object.entries(downloadStatusMap || {}).forEach(([chUrl, item]) => {
      if (!item?.isDownloaded) return;
      const mTitle = item.mangaTitle || 'Manga';
      const mKey = item.mangaUrl || mTitle;
      if (!map[mKey]) {
        const libMatch = (library || []).find(l => l.title === mTitle || l.url === item.mangaUrl);
        map[mKey] = {
          manga: {
            url: item.mangaUrl || mKey,
            title: mTitle,
            thumbnailUrl: item.cover || (libMatch?.cover) || '',
            extension: item.scanName || item.extensionId || 'Scan',
            extensionId: item.extensionId || ''
          },
          chapters: {}
        };
      }
      map[mKey].chapters[chUrl] = {
        chapterUrl: chUrl,
        chapterName: item.chapterName || 'Capítulo',
        chapterNumber: item.chapterNumber,
        date: item.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : '',
        pagesCount: item.pageCount || 20,
        sizeBytes: (item.pageCount || 20) * 0.75 * 1024 * 1024,
        isDownloaded: true
      };
    });
    return map;
  }, [downloadStatusMap, library]);

  // =========================================================================
  // 4. FUNCIONES HELPER HOISTED DE GUARDADO Y NAVEGACIÓN
  // =========================================================================
  function saveRepositories(newRepos) {
    if (appMode === 'anime') {
      setAnimeRepositories(newRepos);
      localStorage.setItem('yomori_anime_repos', JSON.stringify(newRepos));
    } else {
      setMangaRepositories(newRepos);
      localStorage.setItem('tachiyomi_repos', JSON.stringify(newRepos));
    }
  }

  function handleAddRepository(repoUrl, repoName = '') {
    if (!repoUrl) return;
    const trimmed = typeof repoUrl === 'string' ? repoUrl.trim() : (repoUrl.url || '').trim();
    if (!trimmed) return;
    const name = repoName || (typeof repoUrl === 'object' && repoUrl.name ? repoUrl.name : (trimmed.includes('anime') ? 'Repositorio Anime' : 'Repositorio Personalizado'));
    if (appMode === 'anime') {
      if (animeRepositories.some(r => r.url === trimmed)) return;
      const updated = [...animeRepositories, { name, url: trimmed }];
      setAnimeRepositories(updated);
      localStorage.setItem('yomori_anime_repos', JSON.stringify(updated));
    } else {
      if (mangaRepositories.some(r => r.url === trimmed)) return;
      const updated = [...mangaRepositories, { name, url: trimmed }];
      setMangaRepositories(updated);
      localStorage.setItem('tachiyomi_repos', JSON.stringify(updated));
    }
  }

  function handleRemoveRepository(repoUrl) {
    if (!repoUrl) return;
    const targetUrl = typeof repoUrl === 'string' ? repoUrl.trim() : repoUrl.url;
    if (appMode === 'anime') {
      const updated = animeRepositories.filter(r => r.url !== targetUrl);
      setAnimeRepositories(updated);
      localStorage.setItem('yomori_anime_repos', JSON.stringify(updated));
    } else {
      const updated = mangaRepositories.filter(r => r.url !== targetUrl);
      setMangaRepositories(updated);
      localStorage.setItem('tachiyomi_repos', JSON.stringify(updated));
    }
  }

  function saveLibrary(newLib) {
    const deduped = deduplicateLibrary(newLib);
    if (appMode === 'anime') {
      setAnimeLibrary(deduped);
      localStorage.setItem('yomori_anime_library', JSON.stringify(deduped));
    } else {
      setMangaLibrary(deduped);
      localStorage.setItem('tachiyomi_library', JSON.stringify(deduped));
    }
  }

  function saveCategories(newCats) {
    if (appMode === 'anime') {
      setAnimeCategories(newCats);
      localStorage.setItem('yomori_anime_categories', JSON.stringify(newCats));
    } else {
      setMangaCategories(newCats);
      localStorage.setItem('tachiyomi_categories', JSON.stringify(newCats));
    }
  }

  function saveHistory(newHist) {
    if (appMode === 'anime') {
      setAnimeHistory(newHist);
      localStorage.setItem('yomori_anime_history', JSON.stringify(newHist));
    } else {
      setMangaHistory(newHist);
      localStorage.setItem('tachiyomi_history', JSON.stringify(newHist));
    }
  }

  function handleToggleAppMode(mode) {
    setAppMode(mode);
    localStorage.setItem('yomori_app_mode', mode);
  }

  function handleUpdateSettings(newSettings) {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('tachiyomi_settings', JSON.stringify(updated));
      if (currentUser && currentUser.token) {
        axios.post('/api/auth/sync', { settings: updated }, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        }).catch(err => console.warn('Error sincronizando ajustes en la nube:', err.message));
      }
      return updated;
    });
  }

  function applyThemeColors(hexColor, themeName = 'dark') {
    let hex = (hexColor || '#9333ea').trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) hex = '#9333ea';

    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const contrastText = yiq >= 155 ? '#090d16' : '#ffffff';

    const adjust = (percent) => {
      const factor = 1 + percent / 100;
      const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
      const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
      const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
      return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
    };

    const root = document.documentElement;
    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--accent-text', contrastText);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--accent-glow', `${hex}4d`);
    root.style.setProperty('--accent-glow-strong', `${hex}80`);
    root.style.setProperty('--accent-purple', hex);

    root.style.setProperty('--accent-200', adjust(60));
    root.style.setProperty('--accent-300', adjust(45));
    root.style.setProperty('--accent-400', adjust(25));
    root.style.setProperty('--accent-500', adjust(10));
    root.style.setProperty('--accent-700', adjust(-20));
    root.style.setProperty('--accent-800', adjust(-40));
    root.style.setProperty('--accent-900', adjust(-60));
    root.style.setProperty('--accent-950', adjust(-78));

    root.style.setProperty('--color-purple-200', adjust(60));
    root.style.setProperty('--color-purple-300', adjust(45));
    root.style.setProperty('--color-purple-400', adjust(25));
    root.style.setProperty('--color-purple-500', adjust(10));
    root.style.setProperty('--color-purple-600', hex);
    root.style.setProperty('--color-purple-700', adjust(-20));
    root.style.setProperty('--color-purple-800', adjust(-40));
    root.style.setProperty('--color-purple-900', adjust(-60));
    root.style.setProperty('--color-purple-950', adjust(-78));

    const isLightMode = themeName === 'light' || (themeName === 'system' && window.matchMedia && !window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isLightMode) {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }

  function handleAddCategory(newCat) {
    if (!newCat || categories.includes(newCat)) return;
    const next = [...categories, newCat];
    saveCategories(next);
  }

  function handleRemoveCategory(catToRemove) {
    if (catToRemove === 'Todos') return;
    const nextCats = categories.filter((c) => c !== catToRemove);
    saveCategories(nextCats);
    const nextLib = library.map((m) => {
      if (m.categories && m.categories.includes(catToRemove)) {
        return { ...m, categories: m.categories.filter((c) => c !== catToRemove) };
      }
      return m;
    });
    saveLibrary(nextLib);
  }

  function handleRenameCategory(oldCat, newCat) {
    if (!newCat || oldCat === newCat || oldCat === 'Todos') return;
    const nextCats = categories.map((c) => (c === oldCat ? newCat : c));
    saveCategories(nextCats);
    const nextLib = library.map((m) => {
      if (m.categories && m.categories.includes(oldCat)) {
        return { ...m, categories: m.categories.map((c) => (c === oldCat ? newCat : c)) };
      }
      return m;
    });
    saveLibrary(nextLib);
  }

  function handleRestoreBackup(backup) {
    if (!backup) return;
    if (backup.library) {
      saveLibrary(backup.library);
    }
    if (backup.history) {
      saveHistory(backup.history);
    }
    if (backup.categories) {
      saveCategories(backup.categories);
    }
    if (backup.chapterProgress) {
      setChapterProgressMap(backup.chapterProgress);
      localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(backup.chapterProgress));
    }
    if (backup.readChapters) {
      setReadChaptersMap(backup.readChapters);
      localStorage.setItem('tachiyomi_read_chapters', JSON.stringify(backup.readChapters));
    }
    if (backup.settings) {
      setSettings(backup.settings);
      localStorage.setItem('tachiyomi_settings', JSON.stringify(backup.settings));
    }
    if (backup.repositories) {
      saveRepositories(backup.repositories);
    }
    alert('¡Copia de seguridad restaurada correctamente con éxito!');
  }

  function handleUpdateCurrentUser(updatedUser) {
    setCurrentUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem('tachiyomi_user', JSON.stringify(updatedUser));
    } else {
      localStorage.removeItem('tachiyomi_user');
    }
  }

  function handleOpenAuth(mode = 'login') {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }

  function handleLogout() {
    localStorage.removeItem('tachiyomi_user');
    localStorage.removeItem('yomori_remember_me');
    setCurrentUser(null);
  }

  function handleOpenUserCard(userId, username, avatar) {
    setUserCardModal({
      isOpen: true,
      userId,
      usernameFallback: username,
      userAvatarFallback: avatar
    });
  }

  function handleViewProfile(userId = null) {
    setSelectedProfileUserId(userId);
    setView('profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleOpenDirectChat(userId) {
    setInitialDirectChatUserId(userId);
    setView('messages');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function saveReadChaptersMap(newMap) {
    setReadChaptersMap(newMap);
    localStorage.setItem('tachiyomi_read_chapters', JSON.stringify(newMap));
  }

  function handleUpdateChapterProgress(chapterUrl, pageNum, totalPages) {
    if (!chapterUrl || !pageNum) return;
    setChapterProgressMap(prev => {
      const updated = {
        ...prev,
        [chapterUrl]: { page: pageNum, totalPages: totalPages || prev[chapterUrl]?.totalPages || 1, updatedAt: Date.now() }
      };
      localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(updated));
      return updated;
    });
  }


  // 1. Comprobación obligatoria en primer lanzamiento: Si no hay usuario ni sesión guardada, abrir registro/login
  useEffect(() => {
    if (!currentUser) {
      localStorage.setItem('tachiyomi_user', JSON.stringify(DEFAULT_ADMIN_USER));
      localStorage.setItem('yomori_remember_me', 'true');
      setCurrentUser(DEFAULT_ADMIN_USER);
    }
    setIsAuthModalOpen(false);
  }, [currentUser]);

  // Soporte nativo para Android (Capacitor): Barra de estado oscura y botón físico/gesto de "Atrás"
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: '#07090e' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

      const backListener = CapApp.addListener('backButton', () => {
        if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
        } else if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (isExtensionsModalOpen) {
          setIsExtensionsModalOpen(false);
        } else if (userCardModal?.isOpen) {
          setUserCardModal({ isOpen: false, userId: null, usernameFallback: null, userAvatarFallback: null });
        } else if (view === 'reader' || view === 'manga') {
          handleGoBack();
        } else if (view !== 'home') {
          handleGoBack();
        } else {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then(h => h.remove()).catch(() => {});
      };
    }
  }, [view, isSettingsModalOpen, isAuthModalOpen, isExtensionsModalOpen, userCardModal?.isOpen]);

  // Escuchar notificaciones en tiempo real de Mensajes Directos para el badge
  useEffect(() => {
    if (!currentUser?.id) return;
    const socket = getSocket();
    socket.emit('user_online', { userId: currentUser.id, username: currentUser.username });

    const handleDmNotification = (data) => {
      // Si el usuario no está actualmente en la pestaña de mensajes, aumentar contador
      setView(currentView => {
        if (currentView !== 'messages') {
          setUnreadDMsCount(prev => prev + 1);
        }
        return currentView;
      });
    };

    socket.on('dm_notification', handleDmNotification);
    return () => {
      socket.off('dm_notification', handleDmNotification);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (view === 'messages') {
      setUnreadDMsCount(0);
    }
  }, [view]);

  // Control de scroll automático en lector





  useEffect(() => {
    if (!currentUser?.token) return;
    axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(res => {
      if (res.data?.success && res.data.user) {
        const u = res.data.user;
        if (Array.isArray(u.library) && u.library.length > 0) {
          setMangaLibrary(prev => {
            const merged = deduplicateLibrary([...prev, ...u.library]);
            localStorage.setItem('tachiyomi_library', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(u.categories) && u.categories.length > 0) {
          setMangaCategories(prev => {
            const merged = Array.from(new Set([...prev, ...u.categories]));
            localStorage.setItem('tachiyomi_categories', JSON.stringify(merged));
            return merged;
          });
        }
        if (Array.isArray(u.history) && u.history.length > 0) {
          setMangaHistory(prev => {
            const existingKeys = new Set(prev.map(h => h.url || h.chapterUrl || `${h.mangaTitle}_${h.chapterTitle}`));
            const newItems = u.history.filter(h => !existingKeys.has(h.url || h.chapterUrl || `${h.mangaTitle}_${h.chapterTitle}`));
            const merged = [...prev, ...newItems].slice(0, 100);
            localStorage.setItem('tachiyomi_history', JSON.stringify(merged));
            return merged;
          });
        }
        if (u.chapterProgress && Object.keys(u.chapterProgress).length > 0) {
          setChapterProgressMap(prev => {
            const merged = { ...u.chapterProgress, ...prev };
            localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(merged));
            return merged;
          });
        }
        if (u.settings && Object.keys(u.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...u.settings }));
          localStorage.setItem('tachiyomi_settings', JSON.stringify({ ...settings, ...u.settings }));
        }
        isInitialSyncDoneRef.current = true;
      }
    }).catch(err => {
      console.warn('[Cloud Sync Fetch Error]', err.message);
      isInitialSyncDoneRef.current = true;
    });
  }, [currentUser?.token]);

  // Sincronización en la Nube: Guardar cambios automáticos en el backend con debounce

  const refreshDownloadsStatus = async () => {
    try {
      const [statusRes, queueRes] = await Promise.all([
        axios.get('/api/downloads/status'),
        axios.get('/api/downloads/queue')
      ]);
      if (statusRes.data?.success) setDownloadStatusMap(statusRes.data.data || {});
      if (queueRes.data?.success) setDownloadQueue(queueRes.data.data || {});
    } catch (e) {}
  };



  useEffect(() => {
    refreshDownloadsStatus();
    const interval = setInterval(refreshDownloadsStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadChapter = async (chapter, manga) => {
    try {
      const payload = {
        chapters: [{
          chapterUrl: chapter.url,
          mangaUrl: manga?.url || '',
          mangaTitle: manga?.title || 'Manga',
          chapterName: chapter.name || `Capítulo ${chapter.chapterNumber || '1'}`,
          chapterNumber: chapter.chapterNumber || '1',
          extensionId: manga?.extensionId || selectedExtension,
          scanName: manga?.extension || '',
          cover: manga?.coverProxy || manga?.cover || ''
        }]
      };
      await axios.post('/api/downloads/queue', payload);
      refreshDownloadsStatus();
    } catch (err) {
      console.error('Error al encolar descarga:', err);
    }
  };

  const handleDownloadBatch = async (chaptersToDownload, manga) => {
    try {
      if (!chaptersToDownload || chaptersToDownload.length === 0) return;
      const payload = {
        chapters: chaptersToDownload.map(ch => ({
          chapterUrl: ch.url,
          mangaUrl: manga?.url || '',
          mangaTitle: manga?.title || 'Manga',
          chapterName: ch.name || `Capítulo ${ch.chapterNumber || '1'}`,
          chapterNumber: ch.chapterNumber || '1',
          extensionId: manga?.extensionId || selectedExtension,
          scanName: manga?.extension || '',
          cover: manga?.coverProxy || manga?.cover || ''
        }))
      };
      await axios.post('/api/downloads/queue', payload);
      refreshDownloadsStatus();
    } catch (err) {
      console.error('Error al encolar lote de descargas:', err);
    }
  };

  const handleDeleteDownload = async (chapterUrl) => {
    try {
      await axios.delete('/api/downloads/chapter', { params: { chapterUrl } });
      refreshDownloadsStatus();
    } catch (err) {
      console.error('Error al eliminar descarga:', err);
    }
  };

  const handleDeleteMangaDownloads = async (mangaUrl) => {
    try {
      const mangaItem = downloads[mangaUrl];
      if (!mangaItem) return;
      const chapterUrls = Object.keys(mangaItem.chapters || {});
      for (const chUrl of chapterUrls) {
        await axios.delete('/api/downloads/chapter', { params: { chapterUrl: chUrl } });
      }
      refreshDownloadsStatus();
    } catch (err) {
      console.error('Error al eliminar descargas del manga:', err);
    }
  };

  const handleClearAllDownloads = async () => {
    try {
      const chapterUrls = Object.keys(downloadStatusMap || {});
      for (const chUrl of chapterUrls) {
        await axios.delete('/api/downloads/chapter', { params: { chapterUrl: chUrl } });
      }
      refreshDownloadsStatus();
    } catch (err) {
      console.error('Error al limpiar todas las descargas:', err);
    }
  };

  // 1. Cargar lista de extensiones instaladas físicamente en disco
  const fetchInstalledExtensions = async () => {
    try {
      const res = await axios.get('/api/extensions/installed');
      if (res.data?.success) {
        const exts = res.data.data || [];
        setInstalledExtensions(exts);
        try {
          localStorage.setItem('yomori_installed_extensions', JSON.stringify(exts));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Backend /api/extensions/installed:', err.message);
    } finally {
      setLoadingExtensions(false);
    }
  };

  // Instalar todas las extensiones disponibles en el repositorio con un solo clic
  const handleInstallAllExtensions = async (targetList) => {
    try {
      let extensions = targetList;
      if (!Array.isArray(extensions) || extensions.length === 0) {
        const res = await axios.get(`/api/repo/index.json?type=${appMode}`);
        if (Array.isArray(res.data)) {
          extensions = res.data;
        }
      }

      if (Array.isArray(extensions)) {
        for (const ext of extensions) {
          try {
            await axios.post('/api/extensions/install', {
              id: ext.id,
              name: ext.name,
              version: ext.version,
              scriptUrl: ext.scriptUrl,
              baseUrl: ext.baseUrl,
              icon: ext.icon,
              lang: ext.lang,
              type: ext.type || appMode
            });
          } catch (err) {
            console.error(`Error instalando ${ext.name}:`, err);
          }
        }
        await fetchInstalledExtensions();
        if (extensions.length > 0) {
          setSelectedExtension(extensions[0].id);
          fetchCatalog(extensions[0].id, 1, false);
        }
        return true;
      }
    } catch (err) {
      console.error('Error en instalación masiva de extensiones:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchInstalledExtensions();
  }, []);



  const fetchCatalog = async (extId = selectedExtension, page = 1, append = false, filters = activeFilters) => {
    if (!extId) {
      setCatalog([]);
      return;
    }
    if (!append) setCatalog([]);
    setLoadingCatalog(true);
    setCatalogPage(page);
    try {
      const params = new URLSearchParams();
      params.set('extensionId', extId);
      params.set('page', page);
      if (filters?.query) params.set('query', filters.query);
      if (filters?.type && filters.type !== 'Ver todo') params.set('type', filters.type);
      if (filters?.status && filters.status !== 'Ver todo') params.set('status', filters.status);
      if (filters?.sort) params.set('sort', filters.sort);
      if (filters?.genres && filters.genres.length > 0) {
        params.set('genres', filters.genres.join(','));
      }

      const response = await axios.get(`/api/catalog?${params.toString()}`);
      if (response.data?.success) {
        const newMangas = response.data.data.mangas || [];
        setCatalog(prev => append ? [...prev, ...newMangas] : newMangas);
        setHasNextPage(response.data.data.hasNextPage ?? (newMangas.length >= 15));
        setCatalogTotalPages(response.data.data.totalPages || null);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    fetchCatalog(selectedExtension, newPage, false, activeFilters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyFilters = (newFilters) => {
    setActiveFilters(newFilters);
    fetchCatalog(selectedExtension, 1, false, newFilters);
  };

  useEffect(() => {
    if (selectedExtension) {
      fetchCatalog(selectedExtension, 1, false, activeFilters);
    }
  }, [selectedExtension]);

  // 3. Buscar Mangas
  const handleSearch = async (query) => {
    const updated = { ...activeFilters, query };
    setActiveFilters(updated);
    fetchCatalog(selectedExtension, 1, false, updated);
  };

  // Registro global en memoria de metadatos de mangas para navegación instantánea (0ms)
  const handleRegisterMangaMeta = (url, meta) => {
    if (!url || !meta) return;
    mangaRegistryRef.current[url] = {
      ...(mangaRegistryRef.current[url] || {}),
      ...meta
    };
  };

  // Helper para resolver extensión desde URL o fallback
  const getExtensionFromUrlOrId = (url = '', fallbackId = '') => {
    const u = (url || '').toLowerCase();
    const id = (fallbackId || '').toLowerCase();
    if (u.includes('rncalation.online') || u.includes('rn-scanlation') || id === 'rn-scanlation') return 'rn-scanlation';
    if (u.includes('leercapitulo.com') || u.includes('zonatmo') || id === 'zonatmo') return 'zonatmo';
    if (u.includes('skymangas.com') || id === 'skymangas') return 'skymangas';
    if (u.includes('miauscan') || u.includes('leemiau.com') || id === 'miauscan') return 'miauscan';
    if (u.includes('manhwalatino.lat') || u.includes('manhwalatino.com') || id === 'manhwalatino') return 'manhwalatino';
    if (u.includes('mangadex.org') || id === 'mangadex') return 'mangadex';
    if (u.includes('plotwistscan.com') || u.includes('plotnofansub.com') || id === 'plot-twist-no-fansub') return 'plot-twist-no-fansub';
    if (u.includes('ikigai') || u.includes('gettocaboca') || u.includes('cmpunjabrashancard') || id === 'ikigai-mnagas') return 'ikigai-mnagas';
    if (u.includes('olympusxyz.com') || u.includes('olympus') || id === 'olympus-scanlation') return 'olympus-scanlation';
    return fallbackId || selectedExtension || 'olympus-scanlation';
  };

  // 4. Ficha de Manga (Navegación Instantánea 0ms estilo Mihon / Tachiyomi)
  const handleSelectManga = (mangaOrUrl, extId = '') => {
    let mangaUrl = typeof mangaOrUrl === 'string' ? mangaOrUrl : mangaOrUrl?.url;
    if (!mangaUrl) return;

    if (view !== 'manga' && view !== 'reader') {
      setPreviousView(view);
    }

    // 1. Resolver el scan/extId canónico con prioridad a la URL real
    const activeExt = getExtensionFromUrlOrId(
      mangaUrl, 
      (typeof mangaOrUrl === 'object' ? mangaOrUrl.extensionId : '') || extId
    );

    // 2. Buscar datos previos en memoria (objeto completo pasado, caché global, biblioteca o catálogo)
    const passedObj = (typeof mangaOrUrl === 'object' && mangaOrUrl.title) ? mangaOrUrl : null;
    const globalCached = mangaRegistryRef.current[mangaUrl] || null;
    const libItem = library.find(item => item.url === mangaUrl);
    const catItem = catalog.find(item => item.url === mangaUrl);

    const existing = passedObj || globalCached || libItem || catItem;

    // Título limpio evitando números, fechas o slugs raros
    let cleanTitle = existing?.title || '';
    if (!cleanTitle || cleanTitle.includes('2026') || cleanTitle.includes('comic-')) {
      const slug = decodeURIComponent(mangaUrl).split('/').filter(Boolean).pop() || '';
      cleanTitle = slug
        .replace(/^comic-|^manhua-|^manga-/, '')
        .replace(/-\d{6,}.*$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }

    const initialTitle = cleanTitle || 'Manga';
    const initialCover = existing?.cover || existing?.coverProxy || '';
    const initialCoverProxy = existing?.coverProxy || existing?.cover || '';
    const initialScanName = existing?.scanSource || existing?.scan || existing?.extension || '';

    // 3. Guardar en registro global
    mangaRegistryRef.current[mangaUrl] = {
      ...(mangaRegistryRef.current[mangaUrl] || {}),
      title: initialTitle,
      cover: initialCover,
      coverProxy: initialCoverProxy,
      extensionId: activeExt,
      extension: initialScanName,
      status: existing?.status || 'En emisión',
      genres: existing?.genres || ['Manga']
    };

    // 4. Navegación Optimista Instantánea (0ms)
    setSelectedManga({
      title: initialTitle,
      url: mangaUrl,
      cover: initialCover,
      coverProxy: initialCoverProxy,
      extension: initialScanName,
      extensionId: activeExt,
      synopsis: existing?.synopsis || 'Cargando información y lista de capítulos...',
      status: existing?.status || 'En emisión',
      genres: existing?.genres || ['Manga'],
      chapters: existing?.chapters || [],
      loading: !existing?.chapters || existing.chapters.length === 0
    });
    setView('manga');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoadingManga(!existing?.chapters || existing.chapters.length === 0);

    // 5. Fetch en segundo plano (SWR) para refrescar capítulos y metadata fresca sin parpadeos
    axios.get(`/api/manga?url=${encodeURIComponent(mangaUrl)}&extensionId=${activeExt}`)
      .then(response => {
        if (response.data?.success && response.data.data) {
          const fresh = response.data.data;
          mangaRegistryRef.current[mangaUrl] = {
            ...mangaRegistryRef.current[mangaUrl],
            ...fresh,
            extensionId: activeExt
          };
          setSelectedManga(prev => {
            if (prev?.url === mangaUrl) {
              return { 
                ...prev, 
                ...fresh,
                title: fresh.title || prev.title,
                cover: fresh.cover || prev.cover,
                coverProxy: fresh.coverProxy || prev.coverProxy || prev.cover,
                extensionId: activeExt,
                loading: false
              };
            }
            return prev;
          });
        }
      })
      .catch(err => {
        console.warn('Error refrescando ficha en segundo plano:', err.message);
      })
      .finally(() => {
        setLoadingManga(false);
      });
  };

  // 5. Cargar y Leer Capítulo
  const triggerNextChapterPrefetch = (currentChapterData, originMangaUrl, extId) => {
    try {
      const allChapters = selectedManga?.chapters || [];
      if (!allChapters.length || !currentChapterData?.currentUrl) return;

      const currentIndex = allChapters.findIndex(c => c.url === currentChapterData.currentUrl);
      if (currentIndex === -1) return;

      const firstNum = parseFloat(allChapters[0]?.chapterNumber || 0);
      const lastNum = parseFloat(allChapters[allChapters.length - 1]?.chapterNumber || 0);
      const isDesc = firstNum >= lastNum;

      let nextChUrl = currentChapterData.nextChapterUrl;
      if (!nextChUrl) {
        if (isDesc && currentIndex > 0) {
          nextChUrl = allChapters[currentIndex - 1]?.url;
        } else if (!isDesc && currentIndex < allChapters.length - 1) {
          nextChUrl = allChapters[currentIndex + 1]?.url;
        }
      }

      if (nextChUrl && !chapterExtractionCache.current[nextChUrl]) {
        axios.post('/api/extract', { url: nextChUrl, extensionId: extId }).then(res => {
          if (res.data?.success) {
            const nextData = res.data.data;
            chapterExtractionCache.current[nextChUrl] = nextData;
            // Precargar viñetas del siguiente capítulo en memoria del navegador
            (nextData.pages || []).slice(0, 10).forEach(p => {
              const src = settings.useProxy && p.proxyUrl ? p.proxyUrl : (p.originalUrl || p.url);
              if (src) {
                const img = new Image();
                img.src = src;
              }
            });
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[Prefetch Error]', e);
    }
  };

  const handleSelectChapter = async (chapterUrl, originMangaUrl = null, targetPage = null, mangaHint = null) => {
    if (!chapterUrl) return;

    if (view !== 'manga' && view !== 'reader' && view !== 'player') {
      setPreviousView(view);
    }

    // 1. Resolver la URL del manga de forma estricta (NUNCA heredar de un selectedManga de otro manga)
    let resolvedMangaUrl = originMangaUrl || (mangaHint?.url || mangaHint?.mangaUrl);
    if (!resolvedMangaUrl) {
      if (selectedManga?.chapters?.some(c => c.url === chapterUrl)) {
        resolvedMangaUrl = selectedManga.url;
      } else {
        const libMatch = library.find(i => (i.chapters || []).some(c => c.url === chapterUrl) || i.lastReadChapter?.url === chapterUrl);
        if (libMatch) resolvedMangaUrl = libMatch.url;
        else {
          const histMatch = history.find(i => i.url === chapterUrl);
          if (histMatch) resolvedMangaUrl = histMatch.mangaUrl;
        }
      }
    }

    // 2. Identificar el manga destino de forma aislada
    const isSelectedMatching = selectedManga && resolvedMangaUrl && selectedManga.url === resolvedMangaUrl;
    const existingLibraryItem = resolvedMangaUrl ? library.find(i => i.url === resolvedMangaUrl) : null;
    const existingCached = resolvedMangaUrl ? mangaRegistryRef.current[resolvedMangaUrl] : null;
    const existingHistoryItem = (resolvedMangaUrl || chapterUrl) 
      ? history.find(i => (resolvedMangaUrl && i.mangaUrl === resolvedMangaUrl) || i.url === chapterUrl) 
      : null;

    const targetManga = (mangaHint && (mangaHint.title || mangaHint.mangaTitle)) 
      ? mangaHint 
      : (isSelectedMatching 
          ? selectedManga 
          : (existingLibraryItem || existingCached || existingHistoryItem || null));

    // Determinar la extensión correcta
    const targetUrl = chapterUrl || resolvedMangaUrl || '';
    const extId = getExtensionFromUrlOrId(
      targetUrl, 
      targetManga?.extensionId || targetManga?.extension || (isSelectedMatching ? selectedManga?.extensionId : '') || selectedExtension
    );

    const isAnimeSource = appMode === 'anime' ||
      targetManga?.type === 'anime' ||
      targetManga?.type === 'TV (Serie)' ||
      (targetManga?.extensionId || '').toLowerCase().includes('anime') ||
      (targetManga?.extensionId || '').toLowerCase().includes('monos') ||
      extId.toLowerCase().includes('anime') ||
      extId.toLowerCase().includes('monos');

    setLoadingChapter(true);
    setView(isAnimeSource ? 'player' : 'reader');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Determinar página de inicio (reanudar donde se quedó)
    const savedProgress = chapterProgressMap[chapterUrl];
    const isCompleted = !!readChaptersMap[chapterUrl];
    const startPage = targetPage || (!isCompleted && savedProgress?.page ? savedProgress.page : 1);
    setInitialReaderPage(startPage);
    setCurrentPage(startPage);

    // 3. Título y Portada limpios y estrictamente pertenecientes a este manga
    let cleanMangaTitle = mangaHint?.mangaTitle || mangaHint?.title || targetManga?.mangaTitle || targetManga?.title || '';
    if (!cleanMangaTitle || cleanMangaTitle === 'Manga' || cleanMangaTitle === 'Lector') {
      const slugSource = resolvedMangaUrl || chapterUrl || '';
      const slug = decodeURIComponent(slugSource).split('/').filter(Boolean).pop() || '';
      cleanMangaTitle = slug
        .replace(/^comic-|^manhua-|^manga-|^series-/, '')
        .replace(/-\d{4,}.*$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    const finalMangaTitle = cleanMangaTitle || (isAnimeSource ? 'Anime' : 'Manga');

    let cleanMangaCover = mangaHint?.coverProxy || mangaHint?.cover || targetManga?.coverProxy || targetManga?.cover || '';
    let cleanMangaCoverProxy = mangaHint?.coverProxy || targetManga?.coverProxy || cleanMangaCover;

    // 4. Obtener capítulos conocidos para este manga
    const availableChapters = (isSelectedMatching ? selectedManga?.chapters : null) 
      || targetManga?.chapters 
      || existingLibraryItem?.chapters 
      || existingCached?.chapters 
      || [];

    const foundChapter = availableChapters.find(c => c.url === chapterUrl);
    const initialChapterTitle = foundChapter?.name || (mangaHint?.chapterTitle) || (existingHistoryItem?.chapterTitle) || (isAnimeSource ? `Episodio ${startPage || 1}` : `Capítulo ${startPage || 1}`);

    // 5. SINCRONIZAR `selectedManga` al manga actual (evita que queden restos del manga anterior en Reader/FloatingControls)
    if (!selectedManga || selectedManga.url !== resolvedMangaUrl) {
      setSelectedManga({
        title: finalMangaTitle,
        url: resolvedMangaUrl || chapterUrl,
        cover: cleanMangaCover,
        coverProxy: cleanMangaCoverProxy,
        extension: targetManga?.extension || extId,
        extensionId: extId,
        synopsis: targetManga?.synopsis || '',
        status: targetManga?.status || 'En emisión',
        genres: targetManga?.genres || [isAnimeSource ? 'Anime' : 'Manga'],
        chapters: availableChapters,
        loading: availableChapters.length === 0
      });
    }

    // 6. Si no tenemos la lista de capítulos de este manga, traerla en segundo plano para que la navegación de capítulos sea infalible
    if (resolvedMangaUrl && availableChapters.length === 0) {
      axios.get(`/api/manga?url=${encodeURIComponent(resolvedMangaUrl)}&extensionId=${extId}`)
        .then(res => {
          if (res.data?.success && res.data?.data?.chapters?.length > 0) {
            const freshManga = res.data.data;
            mangaRegistryRef.current[resolvedMangaUrl] = {
              ...(mangaRegistryRef.current[resolvedMangaUrl] || {}),
              ...freshManga,
              extensionId: extId
            };
            setSelectedManga(prev => {
              if (prev?.url === resolvedMangaUrl) {
                return {
                  ...prev,
                  ...freshManga,
                  chapters: freshManga.chapters || [],
                  loading: false
                };
              }
              return prev;
            });
            setChapterData(prev => {
              if (prev?.currentUrl === chapterUrl) {
                return {
                  ...prev,
                  chapters: freshManga.chapters || []
                };
              }
              return prev;
            });
          }
        })
        .catch(e => console.warn('[App] Error refrescando capítulos del manga:', e.message));
    }

    // Helper interno para guardar en historial de forma segura
    const saveToHistory = (chTitle, cCover, cCoverProxy, cExt) => {
      const historyItem = {
        mangaTitle: finalMangaTitle,
        chapterTitle: chTitle || initialChapterTitle,
        cover: cCover || cleanMangaCover,
        coverProxy: cCoverProxy || cleanMangaCoverProxy || cCover || cleanMangaCover,
        extension: cExt || targetManga?.extension || extId,
        url: chapterUrl,
        mangaUrl: resolvedMangaUrl || chapterUrl,
        page: startPage || 1,
        type: isAnimeSource ? 'anime' : 'manga',
        timestamp: new Date().toISOString()
      };

      const mangaKey = (resolvedMangaUrl || '').toLowerCase();
      const titleKey = (finalMangaTitle || '').toLowerCase().trim();
      const filtered = history.filter((item) => {
        const itemMangaKey = (item.mangaUrl || '').toLowerCase();
        const itemTitleKey = (item.mangaTitle || '').toLowerCase().trim();
        if (mangaKey && itemMangaKey && mangaKey === itemMangaKey) return false;
        if (titleKey && itemTitleKey && titleKey === itemTitleKey) return false;
        return true;
      });
      const newHist = [historyItem, ...filtered].slice(0, 50);
      saveHistory(newHist);

      if (resolvedMangaUrl) {
        const updated = library.map((item) => {
          if (item.url === resolvedMangaUrl) {
            return {
              ...item,
              lastReadChapter: { url: chapterUrl, name: chTitle || initialChapterTitle }
            };
          }
          return item;
        });
        saveLibrary(updated);
      }
    };

    // 7. Si el capítulo ya fue precargado en caché en memoria, renderizar instantáneamente (0ms)
    if (chapterExtractionCache.current[chapterUrl]) {
      const cachedData = chapterExtractionCache.current[chapterUrl];
      const finalChapterTitle = foundChapter?.name || (cachedData.chapterTitle && !cachedData.chapterTitle.includes('ManhwaLatino') && cachedData.chapterTitle !== finalMangaTitle ? cachedData.chapterTitle : initialChapterTitle);

      const mergedData = {
        ...cachedData,
        mangaTitle: finalMangaTitle,
        mangaCover: cleanMangaCover || cachedData.mangaCover || '',
        chapterTitle: finalChapterTitle,
        mangaUrl: resolvedMangaUrl || chapterUrl,
        chapters: availableChapters
      };
      setChapterData(mergedData);
      setLoadingChapter(false);
      if (mergedData.isAnime || (mergedData.videos && mergedData.videos.length > 0) || isAnimeSource) {
        setView('player');
      } else {
        setView('reader');
      }
      saveToHistory(finalChapterTitle, cleanMangaCover, cleanMangaCoverProxy, cachedData.extension);
      if (!isAnimeSource) triggerNextChapterPrefetch(mergedData, resolvedMangaUrl, extId);
      return;
    }

    // 8. Si no estaba en caché, mostrar estado de carga limpio
    setChapterData({
      mangaTitle: finalMangaTitle,
      chapterTitle: initialChapterTitle,
      pages: [],
      videos: [],
      totalPages: 0,
      currentUrl: chapterUrl,
      mangaUrl: resolvedMangaUrl || chapterUrl,
      mangaCover: cleanMangaCover,
      chapters: availableChapters,
      loading: true,
      error: null
    });

    let successData = null;
    let lastError = null;

    // Reintentos automáticos progresivos (hasta 3 intentos) para amortiguar cold-starts del navegador
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.post('/api/extract', {
          url: chapterUrl,
          extensionId: extId
        }, { timeout: 45000 });

        const resData = response.data?.data;
        if (response.data?.success && resData) {
          if (resData.isAnime || (resData.videos && resData.videos.length > 0)) {
            successData = resData;
            break;
          } else if (resData.pages && resData.pages.length > 0) {
            successData = resData;
            break;
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`[handleOpenChapter] Intento ${attempt}/3 falló:`, err.message);
      }

      if (attempt < 3 && !successData) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }

    if (successData) {
      const data = successData;
      const finalChapterTitle = foundChapter?.name || (data.chapterTitle && !data.chapterTitle.includes('ManhwaLatino') && data.chapterTitle !== finalMangaTitle ? data.chapterTitle : initialChapterTitle);
      
      const enrichedData = {
        ...data,
        mangaTitle: finalMangaTitle,
        mangaCover: cleanMangaCover || data.cover || '',
        chapterTitle: finalChapterTitle,
        mangaUrl: resolvedMangaUrl || chapterUrl,
        chapters: availableChapters,
        loading: false,
        error: null
      };

      chapterExtractionCache.current[chapterUrl] = enrichedData;
      setChapterData(enrichedData);
      if (enrichedData.isAnime || (enrichedData.videos && enrichedData.videos.length > 0) || isAnimeSource) {
        setView('player');
      } else {
        setView('reader');
      }
      saveToHistory(finalChapterTitle, cleanMangaCover, cleanMangaCoverProxy, data.extension);
      if (!isAnimeSource) triggerNextChapterPrefetch(enrichedData, resolvedMangaUrl, extId);
    } else {
      console.error('[handleOpenChapter] Todos los intentos fallaron:', lastError);
      setChapterData(prev => ({
        ...prev,
        loading: false,
        error: lastError?.response?.data?.message || 'No se pudo cargar el contenido del capítulo. Por favor intenta de nuevo.'
      }));
    }

    setLoadingChapter(false);
  };

  // Biblioteca
  const handleToggleLibrary = (manga, initialCategory = 'General') => {
    const exists = library.find((i) => i.url === manga.url);
    if (exists) {
      saveLibrary(library.filter((i) => i.url !== manga.url));
    } else {
      const chosenCategory = initialCategory || 'General';
      const newItem = {
        title: manga.title,
        url: manga.url,
        cover: manga.cover,
        coverProxy: manga.coverProxy,
        extension: manga.extension || 'Olympus Scanlation',
        extensionId: manga.extensionId || 'olympus-scanlation',
        category: chosenCategory,
        readChapters: [],
        totalChapters: manga.chapters?.length || 1,
        initialChapterCount: manga.chapters?.length || 1,
        lastKnownLatestChapterUrl: manga.chapters?.[0]?.url || '',
        lastKnownLatestChapterName: manga.chapters?.[0]?.name || '',
        lastReadChapter: null,
        addedAt: new Date().toISOString()
      };
      saveLibrary([newItem, ...library]);

      if (chosenCategory !== 'Todos' && !categories.includes(chosenCategory)) {
        handleAddCategory(chosenCategory);
      }
    }
  };

  const handleUpdateCategory = (mangaUrl, category) => {
    const updated = library.map((i) => i.url === mangaUrl ? { ...i, category } : i);
    saveLibrary(updated);
  };

  const handleToggleChapterRead = (mangaUrl, chapterUrl) => {
    if (!chapterUrl) return;
    const isCurrentlyRead = !!readChaptersMap[chapterUrl] || library.some(i => i.url === mangaUrl && i.readChapters?.includes(chapterUrl));

    const newMap = { ...readChaptersMap };
    if (isCurrentlyRead) {
      delete newMap[chapterUrl];
    } else {
      newMap[chapterUrl] = true;
      recordLifetimeReadChapter(chapterUrl);
    }
    saveReadChaptersMap(newMap);

    if (mangaUrl) {
      const updated = library.map((item) => {
        if (item.url === mangaUrl) {
          const readSet = new Set(item.readChapters || []);
          if (isCurrentlyRead) readSet.delete(chapterUrl);
          else {
            readSet.add(chapterUrl);
            recordLifetimeReadChapter(chapterUrl);
          }
          return { ...item, readChapters: Array.from(readSet) };
        }
        return item;
      });
      saveLibrary(updated);
    }
  };

  const handleMarkAllChapters = (mangaUrl, chapterUrls, isRead) => {
    const newMap = { ...readChaptersMap };
    chapterUrls.forEach((url) => {
      if (isRead) {
        newMap[url] = true;
        recordLifetimeReadChapter(url);
      } else {
        delete newMap[url];
      }
    });
    saveReadChaptersMap(newMap);

    if (mangaUrl) {
      const updated = library.map((item) => {
        if (item.url === mangaUrl) {
          return { ...item, readChapters: isRead ? chapterUrls : [] };
        }
        return item;
      });
      saveLibrary(updated);
    }
  };

  const handleChapterFinished = (chapterUrl) => {
    if (!chapterUrl) return;
    const mangaUrl = selectedManga?.url;
    
    // Marcar como leído de forma definitiva y registrar en historial inmutable
    recordLifetimeReadChapter(chapterUrl);
    const newMap = { ...readChaptersMap, [chapterUrl]: true };
    saveReadChaptersMap(newMap);

    if (mangaUrl) {
      const updated = library.map((item) => {
        if (item.url === mangaUrl) {
          const readSet = new Set(item.readChapters || []);
          readSet.add(chapterUrl);
          return { 
            ...item, 
            readChapters: Array.from(readSet),
            lastReadChapter: chapterUrl 
          };
        }
        return item;
      });
      saveLibrary(updated);
    }
  };



  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleGoBack = () => {
    if (view === 'reader' || view === 'player') {
      if (selectedManga) {
        setView('manga');
      } else {
        const target = (previousView && previousView !== 'manga' && previousView !== 'reader' && previousView !== 'player') ? previousView : 'home';
        setView(target);
      }
    } else if (view === 'manga') {
      const target = (previousView && previousView !== 'manga' && previousView !== 'reader' && previousView !== 'player') ? previousView : 'home';
      setSelectedManga(null);
      setView(target);
    } else if (view === 'profile') {
      const target = (previousView && previousView !== 'profile') ? previousView : 'home';
      setView(target);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const currentLibraryItem = library.find((i) => i.url === selectedManga?.url);

  // Si estamos en la Web (Navegador), mostrar ÚNICAMENTE la página de presentación y descarga oficial de la app de PC
  if (!isElectron || view === 'landing') {
    return <OfficialLandingPage />;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex font-sans selection:bg-purple-600 selection:text-white">
      
      {/* 1. SIDEBAR LATERAL (Estilo Tachiyomi: Biblioteca, Actualizaciones, Historial, Explorar, Mensajes, Comunidades, Descargas, Ajustes) */}
      {view !== 'reader' && (
        <Sidebar
          currentView={view}
          previousView={previousView}
          onSelectView={(v) => {
            if (v !== view) {
              setPreviousView(view);
              setView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          libraryCount={library.length}
          installedExtCount={installedExtensions.length}
          historyCount={history.length}
          updatesCount={updatesCount}
          unreadDMsCount={unreadDMsCount}
          currentUser={enrichedCurrentUser || currentUser}
          onOpenAuth={handleOpenAuth}
          onOpenProfile={() => handleViewProfile(null)}
          onLogout={handleLogout}
          appMode={appMode}
          onToggleAppMode={handleToggleAppMode}
        />
      )}

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Cabecera persistente con Notificaciones en todos los apartados (Inicio a Explorar) */}
        {view !== 'reader' && (
          <header className="sticky top-0 z-30 bg-[#090c14]/95 backdrop-blur-md border-b border-gray-800/80 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 select-none">
            {/* Lado Izquierdo: Título de sección o Botón Volver */}
            <div className="flex items-center gap-3 min-w-0">
              {view === 'manga' || view === 'player' ? (
                <button
                  onClick={handleGoBack}
                  className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Volver</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-gray-200">
                    {view === 'home' && 'Inicio'}
                    {view === 'library' && 'Mi Biblioteca'}
                    {view === 'updates' && 'Nuevos Capítulos'}
                    {view === 'history' && 'Historial de Lectura'}
                    {view === 'communities' && 'Comunidades & Gremios'}
                    {view === 'messages' && 'Mensajes & Chats'}
                    {view === 'explore' && 'Explorar Catálogo'}
                    {view === 'downloads' && 'Descargas Offline'}
                    {view === 'settings' && 'Ajustes de Yomori'}
                    {view === 'profile' && 'Perfil de Usuario'}
                  </h2>
                </div>
              )}
            </div>

            {/* Lado Derecho: Buscador global + Centro de Notificaciones + Perfil */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Notificaciones Interactivas */}
              <NotificationBell
                currentUser={enrichedCurrentUser || currentUser}
                onOpenMessages={() => {
                  setView('messages');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenDirectChat={(userId) => {
                  handleOpenDirectChat(userId);
                }}
                onOpenAuth={handleOpenAuth}
              />

              {/* Avatar Usuario Header */}
              {(enrichedCurrentUser || currentUser) ? (
                <div 
                  onClick={() => handleViewProfile(null)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-[#141824] hover:bg-[#1c2333] border border-gray-700/60 transition cursor-pointer group"
                >
                  <img
                    src={(enrichedCurrentUser || currentUser).avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent((enrichedCurrentUser || currentUser).username || 'User')}`}
                    alt={(enrichedCurrentUser || currentUser).username}
                    className="w-6 h-6 rounded-full border border-purple-500/60"
                  />
                  <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                    @{(enrichedCurrentUser || currentUser).username || (enrichedCurrentUser || currentUser).name}
                  </span>
                  {(enrichedCurrentUser || currentUser).rank && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                      {(enrichedCurrentUser || currentUser).rank}
                    </span>
                  )}
                  {(enrichedCurrentUser || currentUser).role === 'admin' && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-black uppercase">
                      Admin
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Acceder</span>
                </button>
              )}
            </div>
          </header>
        )}

        {/* APARTADO 0: INICIO                                        */}
        {/* ========================================================= */}
        {view === 'home' && (
          <main className="flex-1">
            <HomeView
              onSelectManga={handleSelectManga}
              onSelectChapter={handleSelectChapter}
              onRegisterMangaMeta={handleRegisterMangaMeta}
              catalog={catalog}
              library={library}
              onToggleLibrary={handleToggleLibrary}
              currentUser={enrichedCurrentUser || currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
              installedExtensions={installedExtensions}
              loadingExtensions={loadingExtensions}
              onInstallAllExtensions={handleInstallAllExtensions}
              onGoToExplore={() => {
                setView('explore');
                setExploreSubTab('extensions');
              }}
              appMode={appMode}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 1: BIBLIOTECA                                    */}
        {/* ========================================================= */}
        {view === 'library' && (
          <main className="flex-1">
            <LibraryView
              library={library}
              categories={categories}
              onSelectManga={handleSelectManga}
              onContinueReading={handleSelectChapter}
              onExploreSources={() => setView('explore')}
              downloadStatusMap={downloadStatusMap}
              appMode={appMode}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 2: ACTUALIZACIONES                               */}
        {/* ========================================================= */}
        {view === 'updates' && (
          <main className="flex-1">
            <UpdatesView
              library={library}
              onSelectChapter={handleSelectChapter}
              onSelectManga={handleSelectManga}
              onExplore={() => setView('explore')}
              onUpdatesCountChange={(count) => setUpdatesCount(count)}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 3: HISTORIAL                                     */}
        {/* ========================================================= */}
        {view === 'history' && (
          <main className="flex-1">
            <HistoryView
              history={history}
              onSelectChapter={handleSelectChapter}
              onRemoveHistoryItem={(url) => {
                const updated = history.filter(i => i.url !== url && i.mangaUrl !== url);
                saveHistory(updated);
              }}
              onExplore={() => setView('explore')}
              appMode={appMode}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 4: EXPLORAR (3 SUB-PESTAÑAS: FUENTES, EXTENSIONES, MIGRACIÓN) */}
        {/* ========================================================= */}
        {view === 'explore' && (
          <main className="flex-1">
            <ExploreView
              exploreSubTab={exploreSubTab}
              onSelectSubTab={(tab) => setExploreSubTab(tab)}
              installedExtensions={installedExtensions}
              selectedExtension={selectedExtension}
              onSelectExtension={(id) => {
                setSelectedExtension(id);
                fetchCatalog(id, 1, false);
              }}
              catalog={catalog}
              loadingCatalog={loadingCatalog}
              catalogPage={catalogPage}
              totalPages={catalogTotalPages}
              hasNextPage={hasNextPage}
              onPageChange={handlePageChange}
              onSearchManga={handleSearch}
              onApplyFilters={handleApplyFilters}
              activeFilters={activeFilters}
              onRefreshCatalog={() => fetchCatalog(selectedExtension, catalogPage, false)}
              onSelectManga={(url, extId) => handleSelectManga(url, extId || selectedExtension)}
              onDirectExtract={handleSelectChapter}
              repositories={repositories}
              onAddRepository={handleAddRepository}
              onRemoveRepository={handleRemoveRepository}
              onRefreshInstalled={fetchInstalledExtensions}
              onInstallAllExtensions={handleInstallAllExtensions}
              library={library}
              user={currentUser}
              currentUser={currentUser}
              appMode={appMode}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO: MENSAJES DIRECTOS Y AMIGOS                      */}
        {/* ========================================================= */}
        {view === 'messages' && (
          <main className="flex-1">
            <MessagesView
              currentUser={enrichedCurrentUser || currentUser}
              initialActiveUserId={initialDirectChatUserId}
              library={library}
              catalog={catalog}
              onSelectManga={handleSelectManga}
              onViewUserProfile={handleViewProfile}
              onOpenAuth={handleOpenAuth}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO: COMUNIDADES Y SALAS EN VIVO                     */}
        {/* ========================================================= */}
        {view === 'communities' && (
          <main className="flex-1">
            <CommunitiesView
              currentUser={enrichedCurrentUser || currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
              onSelectManga={handleSelectManga}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO: PERFIL DE USUARIO INTEGRADO EN PANTALLA         */}
        {/* ========================================================= */}
        {view === 'profile' && (
          <main className="flex-1">
            <ProfileView
              targetUserId={selectedProfileUserId}
              currentUser={enrichedCurrentUser || currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              onSelectManga={handleSelectManga}
              onOpenDirectChat={handleOpenDirectChat}
              onBack={handleGoBack}
              library={library}
              readChaptersMap={readChaptersMap}
              history={history}
              settings={settings}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 5: DESCARGAS                                     */}
        {/* ========================================================= */}
        {view === 'downloads' && (
          <main className="flex-1">
            <DownloadsView
              downloads={downloads}
              downloadQueue={downloadQueue}
              onExplore={() => setView('explore')}
              onSelectChapter={(chUrl, mUrl) => handleSelectChapter(chUrl, mUrl)}
              onSelectManga={(m) => handleSelectManga(m)}
              onDeleteChapterDownload={(chUrl) => handleDeleteDownload(chUrl)}
              onDeleteMangaDownloads={(mUrl) => handleDeleteMangaDownloads(mUrl)}
              onClearAllDownloads={handleClearAllDownloads}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 6: AJUSTES                                       */}
        {/* ========================================================= */}
        {view === 'settings' && (
          <main className="flex-1">
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenExtensions={() => {
                setView('explore');
                setExploreSubTab('extensions');
              }}
              categories={categories}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
              onRenameCategory={handleRenameCategory}
              currentUser={enrichedCurrentUser || currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              library={library}
              history={history}
              chapterProgressMap={chapterProgressMap}
              readChaptersMap={readChaptersMap}
              installedExtensions={installedExtensions}
              repositories={repositories}
              onRestoreBackup={handleRestoreBackup}
              appMode={appMode}
            />
          </main>
        )}

        {/* VISTA DETALLES DE MANGA / ANIME */}
        {view === 'manga' && (
          <main className="flex-1 pt-14">
            <MangaDetailsView
              manga={selectedManga}
              libraryItem={currentLibraryItem}
              onToggleLibrary={handleToggleLibrary}
              onUpdateCategory={handleUpdateCategory}
              onToggleChapterRead={handleToggleChapterRead}
              onMarkAllChapters={handleMarkAllChapters}
              onBack={handleGoBack}
              onSelectChapter={(url, page) => handleSelectChapter(url, selectedManga?.url, page, selectedManga)}
              onSelectManga={handleSelectManga}
              loadingChapter={loadingChapter}
              categories={categories}
              readChaptersMap={readChaptersMap}
              chapterProgressMap={chapterProgressMap}
              downloadStatusMap={downloadStatusMap}
              downloadQueue={downloadQueue}
              onDownloadChapter={handleDownloadChapter}
              onDownloadBatch={handleDownloadBatch}
              onDeleteDownload={handleDeleteDownload}
              currentUser={enrichedCurrentUser || currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
              appMode={appMode}
            />
          </main>
        )}

        {/* VISTA REPRODUCTOR DE ANIME STREAMING */}
        {view === 'player' && (
          <main className="flex-1 w-full relative">
            <AnimePlayerView
              playerData={chapterData}
              anime={selectedManga}
              episodes={selectedManga?.chapters?.length > 0 ? selectedManga.chapters : (chapterData?.chapters || [])}
              currentEpisodeUrl={chapterData?.currentUrl}
              onSelectEpisode={(url) => handleSelectChapter(url, selectedManga?.url || chapterData?.mangaUrl, null, selectedManga)}
              onBack={handleGoBack}
              currentUser={enrichedCurrentUser || currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
              readChaptersMap={readChaptersMap}
              onToggleChapterRead={handleToggleChapterRead}
            />
          </main>
        )}

        {/* VISTA LECTOR */}
        {view === 'reader' && chapterData && (
          <main className="flex-1 w-full relative">
            <Reader
              chapterData={chapterData}
              settings={settings}
              onNavigateChapter={(url) => handleSelectChapter(url, chapterData?.mangaUrl || selectedManga?.url)}
              onToggleControls={() => setControlsVisible((prev) => !prev)}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onChapterFinished={handleChapterFinished}
              isAutoScrolling={isAutoScrolling}
              setIsAutoScrolling={setIsAutoScrolling}
              initialPage={initialReaderPage}
              onPageChange={(page, total) => handleUpdateChapterProgress(chapterData.currentUrl, page, total)}
              onRetry={() => handleSelectChapter(chapterData?.currentUrl, chapterData?.mangaUrl || selectedManga?.url)}
            />

            <FloatingControls
              chapterData={chapterData}
              chapters={selectedManga?.chapters?.length > 0 ? selectedManga.chapters : (chapterData?.chapters || [])}
              mangaTitle={chapterData?.mangaTitle || selectedManga?.title || 'Manga'}
              currentPage={currentPage}
              totalPages={chapterData?.pages?.length || 0}
              isVisible={controlsVisible}
              settings={settings}
              onBack={handleGoBack}
              onNavigateChapter={(url) => handleSelectChapter(url, chapterData?.mangaUrl || selectedManga?.url)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenComments={() => setIsCommentsOpen(prev => !prev)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              isAutoScrolling={isAutoScrolling}
              onToggleAutoScroll={() => setIsAutoScrolling(prev => !prev)}
            />

            {/* Panel Flotante Lateral de Comentarios en Vivo */}
            <ChapterCommentsDrawer
              chapterUrl={chapterData?.currentUrl}
              chapterTitle={chapterData?.chapterTitle || 'Capítulo'}
              mangaTitle={chapterData?.mangaTitle || selectedManga?.title || 'Manga'}
              currentPage={currentPage}
              currentUser={enrichedCurrentUser || currentUser}
              isOpen={isCommentsOpen}
              onClose={() => setIsCommentsOpen(false)}
              onOpen={() => setIsCommentsOpen(true)}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
            />
          </main>
        )}

        {/* Modal de Ajustes Flotante */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />

        {/* Modal de Extensiones */}
        <ExtensionsModal
          isOpen={isExtensionsModalOpen}
          onClose={() => setIsExtensionsModalOpen(false)}
          repositories={repositories}
          onAddRepository={handleAddRepository}
          onRemoveRepository={handleRemoveRepository}
          installedExtensions={installedExtensions}
          onRefreshInstalled={fetchInstalledExtensions}
        />

        {/* Modal de Autenticación (Login / Registro) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (Array.isArray(user.library) && user.library.length > 0) {
              saveLibrary(user.library);
            }
            if (Array.isArray(user.categories) && user.categories.length > 0) {
              saveCategories(user.categories);
            }
            if (Array.isArray(user.history) && user.history.length > 0) {
              saveHistory(user.history);
            }
            if (user.chapterProgress && Object.keys(user.chapterProgress).length > 0) {
              setChapterProgressMap(user.chapterProgress);
              localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(user.chapterProgress));
            }
            if (user.settings && Object.keys(user.settings).length > 0) {
              setSettings(prev => ({ ...prev, ...user.settings }));
              localStorage.setItem('tachiyomi_settings', JSON.stringify({ ...settings, ...user.settings }));
            }
          }}
        />

        {/* Tarjeta Flotante Interactiva de Perfil de Usuario (Estilo Discord) */}
        <UserCardPopover
          isOpen={userCardModal.isOpen}
          onClose={() => setUserCardModal({ isOpen: false, userId: null, usernameFallback: null, userAvatarFallback: null })}
          userId={userCardModal.userId}
          usernameFallback={userCardModal.usernameFallback}
          userAvatarFallback={userCardModal.userAvatarFallback}
          currentUser={enrichedCurrentUser || currentUser}
          onViewFullProfile={(uid) => {
            setUserCardModal({ isOpen: false });
            handleViewProfile(uid);
          }}
          onOpenDirectChat={(uid) => {
            setUserCardModal({ isOpen: false });
            handleOpenDirectChat(uid);
          }}
          onSelectManga={(url, extId) => {
            setUserCardModal({ isOpen: false });
            handleSelectManga(url, extId);
          }}
        />
      </div>
    </div>
  );
}
