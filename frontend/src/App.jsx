import React, { useState, useEffect, useRef } from 'react';
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
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Settings as SettingsIcon, LogIn, User, BookOpen } from 'lucide-react';

export default function App() {
  const isElectron = typeof window !== 'undefined' && (
    window.navigator.userAgent.includes('Electron') || 
    window.location.search.includes('mode=app')
  );

  const chapterExtractionCache = useRef({});
  // En Electron/Desktop: 'home' (lector). En Web: 'landing' (descarga de la app)
  const [view, setView] = useState(() => isElectron ? 'home' : 'landing');
  const [exploreSubTab, setExploreSubTab] = useState('sources'); // 'sources' | 'extensions' | 'migration'

  // Autenticación y Perfil de Usuario
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [initialDirectChatUserId, setInitialDirectChatUserId] = useState(null);
  const [userCardModal, setUserCardModal] = useState({
    isOpen: false,
    userId: null,
    usernameFallback: null,
    userAvatarFallback: null
  });

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tachiyomi_user');
    setCurrentUser(null);
  };

  const handleOpenUserCard = (userId, username, avatar) => {
    setUserCardModal({
      isOpen: true,
      userId,
      usernameFallback: username,
      userAvatarFallback: avatar
    });
  };

  const handleViewProfile = (userId = null) => {
    setSelectedProfileUserId(userId);
    setView('profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenDirectChat = (userId) => {
    setInitialDirectChatUserId(userId);
    setView('messages');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleUpdateCurrentUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('tachiyomi_user', JSON.stringify(updatedUser));
  };

  // Repositorios y Extensiones
  const [repositories, setRepositories] = useState(() => {
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

  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [selectedExtension, setSelectedExtension] = useState('');

  // Catálogo y Búsqueda
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [catalogTotalPages, setCatalogTotalPages] = useState(null);

  // Ficha de Manga
  const [selectedManga, setSelectedManga] = useState(null);
  const [loadingManga, setLoadingManga] = useState(false);

  // Lector de Capítulos
  const [chapterData, setChapterData] = useState(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Modales
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);

  // Biblioteca Personal
  const [library, setLibrary] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_library');
    return saved ? JSON.parse(saved) : [];
  });

  // Categorías personalizadas de la biblioteca (Por defecto solo ['Todos'])
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_categories');
    return saved ? JSON.parse(saved) : ['Todos'];
  });

  // Mapa de capítulos leídos en toda la app
  const [readChaptersMap, setReadChaptersMap] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_read_chapters');
    return saved ? JSON.parse(saved) : {};
  });

  const saveReadChaptersMap = (newMap) => {
    setReadChaptersMap(newMap);
    localStorage.setItem('tachiyomi_read_chapters', JSON.stringify(newMap));
  };

  // Mapa de progreso exacto por página en cada capítulo: { [chapterUrl]: { page, totalPages, updatedAt } }
  const [chapterProgressMap, setChapterProgressMap] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_chapter_progress');
    return saved ? JSON.parse(saved) : {};
  });

  const handleUpdateChapterProgress = (chapterUrl, pageNum, totalPages) => {
    if (!chapterUrl || !pageNum) return;
    setChapterProgressMap(prev => {
      const updated = {
        ...prev,
        [chapterUrl]: { page: pageNum, totalPages: totalPages || prev[chapterUrl]?.totalPages || 1, updatedAt: Date.now() }
      };
      localStorage.setItem('tachiyomi_chapter_progress', JSON.stringify(updated));
      return updated;
    });
  };

  const [initialReaderPage, setInitialReaderPage] = useState(1);

  const handleAddCategory = (name) => {
    const clean = name.trim();
    if (!clean || categories.some(c => c.toLowerCase() === clean.toLowerCase())) return;
    const updated = [...categories, clean];
    setCategories(updated);
    localStorage.setItem('tachiyomi_categories', JSON.stringify(updated));
  };

  const handleRemoveCategory = (name) => {
    if (name === 'Todos') return;
    const updated = categories.filter((c) => c !== name);
    setCategories(updated);
    localStorage.setItem('tachiyomi_categories', JSON.stringify(updated));
  };

  // Ajustes de lectura
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_settings');
    return saved ? JSON.parse(saved) : {
      readingMode: 'webtoon',
      readerWidth: '850px',
      imageGap: 0,
      brightness: 100,
      invertColors: false,
      useProxy: true,
      backgroundColor: '#07080b',
      autoScrollSpeed: 3,
      floatingControlsMode: 'visible'
    };
  });

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Historial
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Sistema de Descargas Locales Estilo Suwayomi
  const [downloadStatusMap, setDownloadStatusMap] = useState({});
  const [downloadQueue, setDownloadQueue] = useState({ isPaused: false, activeCount: 0, items: [] });

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

  // 1. Cargar lista de extensiones instaladas físicamente en disco
  const fetchInstalledExtensions = async () => {
    try {
      const res = await axios.get('/api/extensions/installed');
      if (res.data?.success) {
        const exts = res.data.data || [];
        setInstalledExtensions(exts);
      }
    } catch (err) {
      console.warn('Backend /api/extensions/installed:', err.message);
    }
  };

  // Instalar todas las extensiones disponibles en el repositorio con un solo clic
  const handleInstallAllExtensions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/index.json');
      if (Array.isArray(res.data)) {
        for (const ext of res.data) {
          try {
            await axios.post('/api/extensions/install', {
              id: ext.id,
              name: ext.name,
              version: ext.version,
              scriptUrl: ext.scriptUrl,
              baseUrl: ext.baseUrl,
              icon: ext.icon,
              lang: ext.lang
            });
          } catch (err) {
            console.error(`Error instalando ${ext.name}:`, err);
          }
        }
        await fetchInstalledExtensions();
        if (res.data.length > 0) {
          setSelectedExtension(res.data[0].id);
          fetchCatalog(res.data[0].id, 1, false);
        }
        return true;
      }
    } catch (err) {
      console.error('Error sincronizando repositorio para instalación masiva:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchInstalledExtensions();
  }, []);

  const saveRepositories = (newRepos) => {
    setRepositories(newRepos);
    localStorage.setItem('tachiyomi_repos', JSON.stringify(newRepos));
  };

  const saveLibrary = (newLib) => {
    setLibrary(newLib);
    localStorage.setItem('tachiyomi_library', JSON.stringify(newLib));
  };

  const handleAddRepository = async (repoUrl) => {
    const targetUrl = repoUrl.endsWith('.json') ? repoUrl : `${repoUrl.replace(/\/+$/, '')}/index.json`;
    try {
      const res = await axios.get(targetUrl);
      if (Array.isArray(res.data)) {
        const newRepo = {
          name: `Repositorio (${new URL(targetUrl).hostname})`,
          url: targetUrl
        };
        const updated = [...repositories.filter(r => r.url !== targetUrl), newRepo];
        saveRepositories(updated);
        alert(`¡Repositorio conectado! Se encontraron ${res.data.length} extensiones.`);
      }
    } catch (err) {
      alert('Error conectando con repositorio: ' + err.message);
    }
  };

  const handleRemoveRepository = (repoUrl) => {
    const updated = repositories.filter(r => r.url !== repoUrl);
    saveRepositories(updated);
  };

  // 2. Cargar Catálogo con Soporte de Filtros
  const [activeFilters, setActiveFilters] = useState({
    query: '',
    type: '',
    status: '',
    sort: 'popular',
    genres: []
  });

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
  const handleSelectManga = (mangaOrUrl, extId = selectedExtension) => {
    let mangaUrl = typeof mangaOrUrl === 'string' ? mangaOrUrl : mangaOrUrl?.url;
    if (!mangaUrl) return;

    // Buscar si tenemos datos previos en memoria (catálogo, biblioteca o el objeto pasado)
    const existing = (typeof mangaOrUrl === 'object' && mangaOrUrl.title) 
      ? mangaOrUrl 
      : library.find(item => item.url === mangaUrl) || catalog.find(item => item.url === mangaUrl);

    const slug = decodeURIComponent(mangaUrl).split('/').filter(Boolean).pop() || '';
    const fallbackTitle = slug.replace(/^comic-|^manhua-|^manga-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // 1. Navegación Optimista Instantánea (0ms)
    setSelectedManga({
      title: existing?.title || fallbackTitle || 'Manga',
      url: mangaUrl,
      cover: existing?.cover || '',
      coverProxy: existing?.coverProxy || '',
      synopsis: existing?.synopsis || 'Cargando información y lista de capítulos...',
      status: existing?.status || 'En emisión',
      genres: existing?.genres || ['Manga'],
      chapters: existing?.chapters || [],
      extensionId: extId || existing?.extensionId || 'olympus-scanlation'
    });
    setView('manga');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoadingManga(!existing?.chapters || existing.chapters.length === 0);

    // 2. Fetch en segundo plano (SWR) para refrescar capítulos y metadata fresca
    const activeExt = getExtensionFromUrlOrId(mangaUrl, extId || existing?.extensionId);
    axios.get(`/api/manga?url=${encodeURIComponent(mangaUrl)}&extensionId=${activeExt}`)
      .then(response => {
        if (response.data?.success && response.data.data) {
          setSelectedManga(prev => {
            if (prev?.url === mangaUrl) {
              return { ...prev, ...response.data.data };
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

  const handleSelectChapter = async (chapterUrl, originMangaUrl = selectedManga?.url, targetPage = null) => {
    setLoadingChapter(true);
    setView('reader');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Determinar página de inicio (reanudar donde se quedó)
    const savedProgress = chapterProgressMap[chapterUrl];
    const isCompleted = !!readChaptersMap[chapterUrl];
    const startPage = targetPage || (!isCompleted && savedProgress?.page ? savedProgress.page : 1);
    setInitialReaderPage(startPage);
    setCurrentPage(startPage);

    // Determinar la extensión correcta según la URL o el manga seleccionado
    const targetUrl = chapterUrl || originMangaUrl || '';
    const extId = getExtensionFromUrlOrId(targetUrl, selectedManga?.extensionId || selectedExtension);

    // 1. Si el capítulo ya fue precargado en memoria, renderizar instantáneamente
    if (chapterExtractionCache.current[chapterUrl]) {
      const cachedData = chapterExtractionCache.current[chapterUrl];
      setChapterData(cachedData);
      setLoadingChapter(false);

      // Precargar el que sigue en segundo plano
      triggerNextChapterPrefetch(cachedData, originMangaUrl, extId);
      return;
    }

    // 2. Si no estaba en caché, mostrar estado de carga limpio
    setChapterData({
      mangaTitle: selectedManga?.title || 'Lector',
      chapterTitle: '',
      pages: [],
      totalPages: 0,
      currentUrl: chapterUrl,
      mangaUrl: originMangaUrl,
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

        if (response.data?.success && response.data?.data?.pages?.length > 0) {
          successData = response.data.data;
          break;
        } else if (response.data?.data?.pages?.length === 0) {
          lastError = new Error('No se detectaron viñetas en la respuesta');
        }
      } catch (err) {
        lastError = err;
        console.warn(`[handleOpenChapter] Intento ${attempt}/3 falló:`, err.message);
      }

      if (attempt < 3 && !successData) {
        // Pausa breve antes del siguiente intento
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }

    if (successData) {
      const data = successData;
      const currentManga = (selectedManga?.url === originMangaUrl) ? selectedManga : library.find(i => i.url === originMangaUrl);
      chapterExtractionCache.current[chapterUrl] = { ...data, mangaCover: currentManga?.cover || selectedManga?.cover };
      setChapterData({ ...data, mangaUrl: originMangaUrl, mangaCover: currentManga?.cover || selectedManga?.cover, loading: false, error: null });

      // Disparar precarga del siguiente capítulo en segundo plano
      triggerNextChapterPrefetch(data, originMangaUrl, extId);

      const historyItem = {
        mangaTitle: data.mangaTitle || currentManga?.title || selectedManga?.title || 'Manga',
        chapterTitle: data.chapterTitle,
        cover: currentManga?.cover || selectedManga?.cover || '',
        coverProxy: currentManga?.coverProxy || selectedManga?.coverProxy || '',
        extension: data.extension || currentManga?.extension || selectedManga?.extension || 'Extensión',
        url: chapterUrl,
        mangaUrl: originMangaUrl,
        timestamp: new Date().toISOString()
      };

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.url !== chapterUrl);
        const newHist = [historyItem, ...filtered].slice(0, 30);
        localStorage.setItem('tachiyomi_history', JSON.stringify(newHist));
        return newHist;
      });

      if (originMangaUrl) {
        setLibrary((prev) => {
          const updated = prev.map((item) => {
            if (item.url === originMangaUrl) {
              return {
                ...item,
                lastReadChapter: { url: chapterUrl, name: data.chapterTitle }
              };
            }
            return item;
          });
          localStorage.setItem('tachiyomi_library', JSON.stringify(updated));
          return updated;
        });
      }
    } else {
      console.error('[handleOpenChapter] Todos los intentos fallaron:', lastError);
      setChapterData(prev => ({
        ...prev,
        loading: false,
        error: lastError?.response?.data?.message || 'No se pudieron cargar las viñetas del capítulo. Por favor intenta de nuevo.'
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
        category: chosenCategory,
        readChapters: [],
        totalChapters: manga.chapters?.length || 1,
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
    }
    saveReadChaptersMap(newMap);

    if (mangaUrl) {
      const updated = library.map((item) => {
        if (item.url === mangaUrl) {
          const readSet = new Set(item.readChapters || []);
          if (isCurrentlyRead) readSet.delete(chapterUrl);
          else readSet.add(chapterUrl);
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
      if (isRead) newMap[url] = true;
      else delete newMap[url];
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
    
    // Marcar como leído de forma definitiva (no toggle)
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

  const handleUpdateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('tachiyomi_settings', JSON.stringify(updated));
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
    if (view === 'reader') {
      if (selectedManga) setView('manga');
      else setView('explore');
    } else if (view === 'manga') {
      setView('explore');
    }
  };

  const currentLibraryItem = library.find((i) => i.url === selectedManga?.url);

  // Si estamos en la Web (Modo Landing de Descarga Oficial), mostrar ÚNICAMENTE la página de presentación y descarga
  if (view === 'landing') {
    return <OfficialLandingPage onOpenWebReader={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex font-sans selection:bg-purple-600 selection:text-white">
      
      {/* 1. SIDEBAR LATERAL (Estilo Tachiyomi: Biblioteca, Actualizaciones, Historial, Explorar, Mensajes, Comunidades, Descargas, Ajustes) */}
      {view !== 'reader' && (
        <Sidebar
          currentView={view}
          onSelectView={(v) => {
            if (v === 'explore') {
              setExploreSubTab('sources');
              setSelectedExtension('');
              setSelectedManga(null);
            }
            setView(v);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          libraryCount={library.length}
          installedExtCount={installedExtensions.length}
          historyCount={history.length}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onOpenProfile={() => handleViewProfile(null)}
          onLogout={handleLogout}
        />
      )}

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Cabecera persistente con Notificaciones en todos los apartados (Inicio a Explorar) */}
        {view !== 'reader' && (
          <header className="sticky top-0 z-30 bg-[#090c14]/95 backdrop-blur-md border-b border-gray-800/80 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 select-none">
            {/* Lado Izquierdo: Título de sección o Botón Volver */}
            <div className="flex items-center gap-3 min-w-0">
              {view === 'manga' ? (
                <button
                  onClick={handleGoBack}
                  className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-500/20 md:hidden">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    {view === 'home' && 'Inicio'}
                    {view === 'library' && 'Mi Biblioteca'}
                    {view === 'updates' && 'Actualizaciones'}
                    {view === 'history' && 'Historial'}
                    {view === 'communities' && 'Comunidades'}
                    {view === 'messages' && 'Amigos & Mensajes'}
                    {view === 'explore' && 'Explorar Fuentes'}
                    {view === 'downloads' && 'Descargas'}
                    {view === 'settings' && 'Ajustes'}
                    {view === 'profile' && 'Perfil de Usuario'}
                  </span>
                </div>
              )}
            </div>

            {/* Lado Derecho: Campana de Notificaciones + Perfil Rápido */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell
                currentUser={currentUser}
                onOpenMessages={() => {
                  setView('messages');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenDirectChat={(userId) => {
                  handleOpenDirectChat(userId);
                }}
                onOpenAuth={handleOpenAuth}
              />

              {currentUser ? (
                <button
                  onClick={() => handleViewProfile(currentUser.id)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-2xl bg-[#121624] hover:bg-[#181d2e] border border-gray-800 hover:border-purple-500/60 transition cursor-pointer"
                  title="Mi Perfil"
                >
                  <span className="text-xs font-bold text-white hidden sm:inline truncate max-w-[120px]">
                    @{currentUser.username}
                  </span>
                  <div className="w-7 h-7 rounded-xl overflow-hidden bg-gray-900 border border-purple-500/40 shrink-0">
                    <img src={currentUser.avatar} alt={currentUser.username} className="w-full h-full object-cover" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition cursor-pointer"
                >
                  Ingresar
                </button>
              )}
            </div>
          </header>
        )}

        {/* ========================================================= */}
        {/* APARTADO 0: INICIO (HOME / HERO BANNER / POPULAR / LIVE)  */}
        {/* ========================================================= */}
        {view === 'home' && (
          <main className="flex-1">
            <HomeView
              onSelectManga={handleSelectManga}
              onSelectChapter={handleSelectChapter}
              catalog={catalog}
              library={library}
              onToggleLibrary={handleToggleLibrary}
              currentUser={currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
              installedExtensions={installedExtensions}
              onInstallAllExtensions={handleInstallAllExtensions}
              onGoToExplore={() => {
                setView('explore');
                setExploreSubTab('extensions');
              }}
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
              onExplore={() => setView('explore')}
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
              onClearHistory={() => {
                setHistory([]);
                localStorage.removeItem('tachiyomi_history');
              }}
              onExplore={() => setView('explore')}
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
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO: MENSAJES DIRECTOS Y AMIGOS                      */}
        {/* ========================================================= */}
        {view === 'messages' && (
          <main className="flex-1">
            <MessagesView
              currentUser={currentUser}
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
              currentUser={currentUser}
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
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              onSelectManga={handleSelectManga}
              onOpenDirectChat={handleOpenDirectChat}
              onBack={() => setView('home')}
            />
          </main>
        )}

        {/* ========================================================= */}
        {/* APARTADO 5: DESCARGAS                                     */}
        {/* ========================================================= */}
        {view === 'downloads' && (
          <main className="flex-1">
            <DownloadsView onExplore={() => setView('explore')} />
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
              currentUser={currentUser}
              onUpdateCurrentUser={setCurrentUser}
            />
          </main>
        )}

        {/* VISTA DETALLES DE MANGA */}
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
              onSelectChapter={(url, page) => handleSelectChapter(url, selectedManga.url, page)}
              loadingChapter={loadingChapter}
              categories={categories}
              readChaptersMap={readChaptersMap}
              chapterProgressMap={chapterProgressMap}
              downloadStatusMap={downloadStatusMap}
              downloadQueue={downloadQueue}
              onDownloadChapter={handleDownloadChapter}
              onDownloadBatch={handleDownloadBatch}
              onDeleteDownload={handleDeleteDownload}
              currentUser={currentUser}
              onOpenAuth={handleOpenAuth}
              onOpenUserCard={handleOpenUserCard}
            />
          </main>
        )}

        {/* VISTA LECTOR */}
        {view === 'reader' && chapterData && (
          <main className="flex-1 w-full relative">
            <Reader
              chapterData={chapterData}
              settings={settings}
              onNavigateChapter={(url) => handleSelectChapter(url, selectedManga?.url)}
              onToggleControls={() => setControlsVisible((prev) => !prev)}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onChapterFinished={handleChapterFinished}
              isAutoScrolling={isAutoScrolling}
              setIsAutoScrolling={setIsAutoScrolling}
              initialPage={initialReaderPage}
              onPageChange={(page, total) => handleUpdateChapterProgress(chapterData.currentUrl, page, total)}
              onRetry={() => handleSelectChapter(chapterData?.currentUrl, selectedManga?.url || chapterData?.mangaUrl)}
            />

            <FloatingControls
              chapterData={chapterData}
              chapters={selectedManga?.chapters || []}
              currentPage={currentPage}
              totalPages={chapterData?.pages?.length || 0}
              isVisible={controlsVisible}
              settings={settings}
              onNavigateChapter={(url) => handleSelectChapter(url, selectedManga?.url)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
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
              currentUser={currentUser}
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
          }}
        />

        {/* Tarjeta Flotante Interactiva de Perfil de Usuario (Estilo Discord) */}
        <UserCardPopover
          isOpen={userCardModal.isOpen}
          onClose={() => setUserCardModal({ isOpen: false, userId: null, usernameFallback: null, userAvatarFallback: null })}
          userId={userCardModal.userId}
          usernameFallback={userCardModal.usernameFallback}
          userAvatarFallback={userCardModal.userAvatarFallback}
          currentUser={currentUser}
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
