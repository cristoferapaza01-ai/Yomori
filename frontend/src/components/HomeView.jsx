import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import LiveChatRoom from './LiveChatRoom.jsx';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Sparkles, 
  Trophy, 
  MessageSquare, 
  Send, 
  Heart, 
  Clock, 
  TrendingUp, 
  Star, 
  BookOpen, 
  Layers, 
  Users, 
  Bookmark, 
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Puzzle,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';

// Función para obtener URL de imagen segura con proxy contra bloqueos hotlink/CORS
const getProxiedCover = (cover, extensionId = '') => {
  if (!cover) return '';
  if (cover.startsWith('/api/proxy-image') || cover.startsWith('http://localhost:4000/api/proxy-image')) {
    return cover;
  }
  return `/api/proxy-image?url=${encodeURIComponent(cover)}&extensionId=${encodeURIComponent(extensionId || '')}`;
};

// Expresiones regulares para detección estricta de contenido Adulto (+18) y BL (Boys Love / Yaoi)
const ADULT_REGEX = /\b(erotic|erotico|erotica|eroticos|eroticas|erotismo|placer|masajista|celo|extasis|éxtasis|onahole|sin\s*censura|hacerlo|sexo|cama|sumis[ao]|tentaci[oó]n|esclav[ao]|profesora|desaloja\s*ya|favoritos\.zip|emborracharse|amante|vicio|fetiche|cuerpos?|desnud[ao]|taller\s*de\s*sonidos|18\+|r18|\+18|smut|hentai|ecchi|adult[os]*|mature|pornhwa|uncensored|seducci[oó]n|madrastra|suegra|cuñada|vecina|hermana\s*casera|guarida\s*del\s*tigre|aventura\s*con\s*mi\s*prometido|pervertid[ao]|pecaminoso|sensual|cl[ií]max|infiel|infidelidad|satisfacer\s*al\s*demonio|dosukebe|hokenshitsu|oyakodon|soushuuhen|doujinshi|yarenai|tentaculos?|tentáculos?|enchufare|enchufaré|animar\s*el\s*amor|cita\s*a\s*ciegas|nidito\s*de\s*amor|my\s*wife\s*gave\s*birth|oracion\s*secreta|oración\s*secreta|duque\s*ennegrecido|gata\s*rebelde|dueno\s*de\s*la\s*isla|dueño\s*de\s*la\s*isla|pagum|pueden\s*casarse\s*una\s*serpiente)\b/i;

const BL_REGEX = /\b(bl|boys\s*love|yaoi|shounen\s*ai|shonen\s*ai|danmei|omegaverse|alfa\s*dominante|\balfa\b|\bomega\b|taller\s*de\s*sonidos|compa[nñ]ero\s*perfecto|lluvia\s*de\s*verano|encontrarse\s*en\s*el\s*medio|en\s*una\s*correa|amor\s*de\s*chicos|bromance|teto\s*x\s*egen|serim|regla\s*de\s*hierro\s*de\s*serim)\b/i;

const isAdultManga = (item) => {
  if (!item) return false;
  if (item.isAdult) return true;
  const gStr = Array.isArray(item.genres) ? item.genres.join(' ') : (item.genres || '');
  const combined = `${item.title || ''} ${gStr} ${item.type || ''} ${item.synopsis || ''}`;
  return ADULT_REGEX.test(combined);
};

const isBLManga = (item) => {
  if (!item) return false;
  if (item.isBL) return true;
  const gStr = Array.isArray(item.genres) ? item.genres.join(' ') : (item.genres || '');
  const combined = `${item.title || ''} ${gStr} ${item.type || ''} ${item.synopsis || ''}`;
  return BL_REGEX.test(combined);
};

// Mangas destacados iniciales para el Hero Slider y secciones con los mejores scans
const DEFAULT_HERO_SLIDES = [
  {
    id: 'hero-1',
    title: 'Subiendo De Nivel 10.000 Años En el Futuro',
    originalTitle: 'Logging 10,000 Years into the Future',
    synopsis: 'Al comienzo de la era de las artes marciales, monstruos aterradores invadieron la tierra. Diez mil años en el futuro, la humanidad perfeccionó técnicas divinas. Un joven viaja en sueños al futuro para aprenderlas.',
    cover: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    backdrop: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    rating: '9.9',
    year: '2026',
    status: 'Activo',
    genres: ['Acción', 'Fantasía', 'Superpoderes', 'Futuro'],
    scanSource: 'ZonaTMO',
    extensionId: 'zonatmo',
    url: 'https://leercapitulo.com/manga/wjjmh6cpwz/subiendo-de-nivel-10-000-anos-en-el-futuro/',
    latestChapter: '357 capítulos'
  },
  {
    id: 'hero-2',
    title: 'Grand Blue',
    originalTitle: 'Grand Blue Dreaming',
    synopsis: 'Iori Kitahara se muda a la costera ciudad de Izu para iniciar su vida universitaria. Al instalarse en la tienda de buceo de su tío, "Grand Blue", descubre un mundo hilarante y salvaje de buceo, fiestas y amistades inolvidables.',
    cover: 'https://uploads.mangadex.org/covers/fffbfac3-b7ad-41ee-9581-b4d90ecec941/0c6c8758-6819-4262-9671-30d5989c0fb8.jpg.512.jpg',
    backdrop: 'https://uploads.mangadex.org/covers/fffbfac3-b7ad-41ee-9581-b4d90ecec941/0c6c8758-6819-4262-9671-30d5989c0fb8.jpg.512.jpg',
    rating: '9.9',
    year: '2026',
    status: 'Activo',
    genres: ['Comedia', 'Recuentos de la Vida', 'Seinen', 'Buceo'],
    scanSource: 'Plot Twist No Fansub',
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/grand-blue/',
    latestChapter: '132 capítulos'
  },
  {
    id: 'hero-3',
    title: 'Academia de la Ascensión',
    originalTitle: 'Ascension Academy',
    synopsis: 'En un mundo donde los elegidos entrenan en academias dimensionales para despertar sus mayores dones, un joven decidido supera las adversidades para convertirse en el guerrero supremo de su generación.',
    cover: 'https://media.imagesolymp.xyz/comics/covers/11/11-lg.webp',
    backdrop: 'https://media.imagesolymp.xyz/comics/covers/11/11-lg.webp',
    rating: '9.9',
    year: '2026',
    status: 'Activo',
    genres: ['Cultivación', 'Artes Marciales', 'Aventura', 'Shounen'],
    scanSource: 'Olympus Scanlation',
    extensionId: 'olympus-scanlation',
    url: 'https://olympusxyz.com/series/comic-academia-de-la-ascension-20260909-080419413',
    latestChapter: '40 capítulos'
  },
  {
    id: 'hero-4',
    title: 'Contra los dioses',
    originalTitle: 'Against the Gods',
    synopsis: 'Un joven que posee la mística Perla de Veneno Celestial es acorralado y cae al abismo. Al renacer en otro cuerpo, emprende la senda del cultivo supremo para desafiar a los clanes y conquistar el firmamento.',
    cover: 'https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp',
    backdrop: 'https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp',
    rating: '9.8',
    year: '2026',
    status: 'Activo',
    genres: ['Cultivo', 'Artes Marciales', 'Fantasía', 'Acción'],
    scanSource: 'SkyMangas',
    extensionId: 'skymangas',
    url: 'https://skymangas.com/manhua/contra-los-dioses',
    latestChapter: '158 capítulos'
  },
  {
    id: 'hero-5',
    title: 'Las 100 novias que te quieren mucho mucho mucho mucho mucho',
    originalTitle: 'The 100 Girlfriends Who Really, Really, Really, Really, Really Love You',
    synopsis: 'Aijou Rentarou ha sido rechazado 100 veces. El Dios del Amor le revela que en la preparatoria conocerá a sus 100 almas gemelas destinadas, pero si no las hace felices a todas, ¡el destino les deparará una tragedia!',
    cover: 'https://uploads.mangadex.org/covers/efb4278c-a761-406b-9d69-19603c5e4c8b/fd2c6a48-810e-4cb4-bd35-e90cef71e337.jpg.512.jpg',
    backdrop: 'https://uploads.mangadex.org/covers/efb4278c-a761-406b-9d69-19603c5e4c8b/fd2c6a48-810e-4cb4-bd35-e90cef71e337.jpg.512.jpg',
    rating: '9.8',
    year: '2026',
    status: 'Activo',
    genres: ['Romance', 'Comedia', 'Harem', 'Manga'],
    scanSource: 'Plot Twist No Fansub',
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/las-100-novias-que-te-quieren-mucho-mucho-mucho-mucho-mucho/',
    latestChapter: '296 capítulos'
  },
  {
    id: 'hero-6',
    title: 'Lookism',
    originalTitle: 'Lookism',
    synopsis: 'Park Hyung Suk, un joven víctima de constante acoso escolar, despierta un día en un segundo cuerpo alto, atlético y carismático. Alternando entre ambos cuerpos, desentraña los oscuros secretos del bajo mundo.',
    cover: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    backdrop: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    rating: '9.8',
    year: '2026',
    status: 'Activo',
    genres: ['Drama', 'Acción', 'Vida Escolar', 'Webtoon'],
    scanSource: 'ZonaTMO',
    extensionId: 'zonatmo',
    url: 'https://leercapitulo.com/manga/lptcna0l9q/lookism/',
    latestChapter: '601 capítulos'
  }
];

const INITIAL_POPULAR = [
  {
    id: 'pop-1',
    title: 'Subiendo De Nivel 10.000 Años En el Futuro',
    cover: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    status: 'Activo',
    rank: 1,
    extensionId: 'zonatmo',
    url: 'https://leercapitulo.com/manga/wjjmh6cpwz/subiendo-de-nivel-10-000-anos-en-el-futuro/',
    views: '1.8M',
    rating: '9.9',
    scanSource: 'ZonaTMO'
  },
  {
    id: 'pop-2',
    title: 'Grand Blue',
    cover: 'https://uploads.mangadex.org/covers/fffbfac3-b7ad-41ee-9581-b4d90ecec941/0c6c8758-6819-4262-9671-30d5989c0fb8.jpg.512.jpg',
    status: 'Activo',
    rank: 2,
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/grand-blue/',
    views: '1.5M',
    rating: '9.9',
    scanSource: 'Plot Twist No Fansub'
  },
  {
    id: 'pop-3',
    title: 'Academia de la Ascensión',
    cover: 'https://media.imagesolymp.xyz/comics/covers/11/11-lg.webp',
    status: 'Activo',
    rank: 3,
    extensionId: 'olympus-scanlation',
    url: 'https://olympusxyz.com/series/comic-academia-de-la-ascension-20260909-080419413',
    views: '1.4M',
    rating: '9.9',
    scanSource: 'Olympus Scanlation'
  },
  {
    id: 'pop-4',
    title: 'Contra los dioses',
    cover: 'https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp',
    status: 'Activo',
    rank: 4,
    extensionId: 'skymangas',
    url: 'https://skymangas.com/manhua/contra-los-dioses',
    views: '1.2M',
    rating: '9.8',
    scanSource: 'SkyMangas'
  },
  {
    id: 'pop-5',
    title: 'Las 100 novias que te quieren mucho',
    cover: 'https://uploads.mangadex.org/covers/efb4278c-a761-406b-9d69-19603c5e4c8b/fd2c6a48-810e-4cb4-bd35-e90cef71e337.jpg.512.jpg',
    status: 'Activo',
    rank: 5,
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/las-100-novias-que-te-quieren-mucho-mucho-mucho-mucho-mucho/',
    views: '1.1M',
    rating: '9.8',
    scanSource: 'Plot Twist No Fansub'
  },
  {
    id: 'pop-6',
    title: 'Lookism',
    cover: 'https://media.imagesolymp.xyz/comics/covers/18/XTPSnDxOUPhotoauto_scaleLevel3width_800-lg.webp',
    status: 'Activo',
    rank: 6,
    extensionId: 'zonatmo',
    url: 'https://leercapitulo.com/manga/lptcna0l9q/lookism/',
    views: '980K',
    rating: '9.9',
    scanSource: 'ZonaTMO'
  }
];

const INITIAL_RELEASES = [
  {
    id: 'rel-1',
    title: 'Grand Blue',
    chapter: 'Capítulo 111',
    time: 'Hace 5 min',
    type: 'Manga',
    scan: 'Plot Twist No Fansub',
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/grand-blue/',
    chapterUrl: 'https://plotnofansub.com/manga/grand-blue/',
    cover: 'https://uploads.mangadex.org/covers/fffbfac3-b7ad-41ee-9581-b4d90ecec941/0c6c8758-6819-4262-9671-30d5989c0fb8.jpg.512.jpg'
  },
  {
    id: 'rel-2',
    title: 'Subiendo De Nivel 10.000 Años En el Futuro',
    chapter: 'Capítulo 357',
    time: 'Hace 12 min',
    type: 'Manhua',
    scan: 'ZonaTMO',
    extensionId: 'zonatmo',
    url: 'https://leercapitulo.com/manga/wjjmh6cpwz/subiendo-de-nivel-10-000-anos-en-el-futuro/',
    chapterUrl: 'https://leercapitulo.com/leer/wjjmh6cpwz/subiendo-de-nivel-10-000-anos-en-el-futuro/357/',
    cover: 'https://leercapitulo.com/covers/b1/31265b4e9277b26ac8c0fe7296c1d3.jpg'
  },
  {
    id: 'rel-3',
    title: 'Academia de la Ascensión',
    chapter: 'Capítulo 40',
    time: 'Hace 25 min',
    type: 'Manhwa',
    scan: 'Olympus Scanlation',
    extensionId: 'olympus-scanlation',
    url: 'https://olympusxyz.com/series/comic-academia-de-la-ascension-20260909-080419413',
    chapterUrl: 'https://olympusxyz.com/capitulo/41724/comic-academia-de-la-ascension-20260909-080419413',
    cover: 'https://media.imagesolymp.xyz/comics/covers/11/11-lg.webp'
  },
  {
    id: 'rel-4',
    title: 'Gokurakugai',
    chapter: 'Capítulo 37',
    time: 'Hace 40 min',
    type: 'Manga',
    scan: 'Plot Twist No Fansub',
    extensionId: 'plot-twist-no-fansub',
    url: 'https://plotnofansub.com/manga/gokurakugai/',
    cover: 'https://uploads.mangadex.org/covers/40c058a2-430e-4ced-b663-369dcf38583f/2824eeb9-042d-4c1c-bb1f-584d1c5a047a.jpg.512.jpg'
  },
  {
    id: 'rel-5',
    title: 'Contra los dioses',
    chapter: 'Capítulo 158',
    time: 'Hace 1 hora',
    type: 'Manhua',
    scan: 'SkyMangas',
    extensionId: 'skymangas',
    url: 'https://skymangas.com/manhua/contra-los-dioses',
    cover: 'https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp'
  },
  {
    id: 'rel-6',
    title: '«El Héroe» – Dirigido por: El Rey Demonio',
    chapter: 'Capítulo 6',
    time: 'Hace 2 horas',
    type: 'Manhwa',
    scan: 'ManhwaLatino',
    extensionId: 'manhwalatino',
    url: 'https://manhwalatino.lat/manga/el-heroe-dirigido-por-el-rey-demonio/',
    cover: 'https://media.manhwaweb.xyz/wp-content/uploads/2026/08/1786338745-8945-i515977.jpg'
  }
];

const INITIAL_COMMENTS = [
  {
    id: 'c-1',
    user: 'KuroReader',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kuro',
    badge: 'Lector VIP',
    badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
    time: 'Hace 2 min',
    manga: 'El Lord que sube de nivel',
    text: '¡El capítulo 112 estuvo brutal! El dibujo en la pelea contra el dragón carmesí subió de nivel totalmente 🔥🔥',
    likes: 24,
    isLiked: false
  },
  {
    id: 'c-2',
    user: 'ManhwaLover99',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Manhwa',
    badge: 'Crítico',
    badgeColor: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50',
    time: 'Hace 6 min',
    manga: 'El Método de Inversión',
    text: 'No me esperaba la jugada que hizo con las acciones de la farmacéutica, se nota que el autor sabe de economía real.',
    likes: 15,
    isLiked: false
  },
  {
    id: 'c-3',
    user: 'Sora_Cultivador',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sora',
    badge: 'Top Fan',
    badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    time: 'Hace 11 min',
    manga: 'El Indomable Rey Marcial',
    text: 'Olympus sacó el capítulo super rápido hoy, gracias a los traductores por la calidad 👏',
    likes: 31,
    isLiked: false
  }
];

const SIMULATED_COMMUNITY_POOL = [
  { user: 'ValkyrieScan', text: '¡Qué buen giro de trama en los nuevos lanzamientos!', manga: 'Nigromante Supremo' },
  { user: 'Shadow_Reader', text: 'Recomienden manhwas parecidos a este, me quedé sin nada para leer hoy', manga: 'Solo Máximo Nivel' },
  { user: 'Alex_Gamer', text: 'La velocidad del lector web de esta app es una maravilla, cero lag 👌', manga: 'General' },
  { user: 'MangaFanatic', text: 'Esperando con ansias el capítulo de mañana, el cliffhanger estuvo de locos', manga: 'El Lord que sube de nivel' }
];

export default function HomeView({
  onSelectManga,
  onSelectChapter,
  catalog = [],
  library = [],
  onToggleLibrary,
  currentUser = null,
  onOpenAuth,
  onOpenUserCard,
  installedExtensions = [],
  onInstallAllExtensions,
  onGoToExplore
}) {
  // Si no hay extensiones instaladas, mostrar bienvenida limpia estilo Tachiyomi
  if (!installedExtensions || installedExtensions.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fadeIn">
        <div className="max-w-md w-full text-center space-y-6 bg-[#0f131f] border border-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-600/40">
            <Puzzle className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Bienvenido a Yomori</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Tu lector está listo. Para comenzar a leer, ve a la sección de extensiones e instala tus fuentes favoritas.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onGoToExplore}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/40 transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Puzzle className="w-4 h-4" />
              <span>Instalar Extensiones</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtros de contenido +18 (Adulto) y BL (Boys Love)
  const [allowAdult, setAllowAdult] = useState(() => {
    return localStorage.getItem('tachiyomi_allow_adult') === 'true';
  });
  const [allowBL, setAllowBL] = useState(() => {
    return localStorage.getItem('tachiyomi_allow_bl') === 'true';
  });
  const [showAdultWarningModal, setShowAdultWarningModal] = useState(false);
  const [showBLInfoModal, setShowBLInfoModal] = useState(false);

  const handleToggleAdult = () => {
    if (!allowAdult) {
      setShowAdultWarningModal(true);
    } else {
      setAllowAdult(false);
      localStorage.setItem('tachiyomi_allow_adult', 'false');
    }
  };

  const handleConfirmAdult = () => {
    setAllowAdult(true);
    localStorage.setItem('tachiyomi_allow_adult', 'true');
    setShowAdultWarningModal(false);
  };

  const handleToggleBL = () => {
    if (!allowBL) {
      setShowBLInfoModal(true);
    } else {
      setAllowBL(false);
      localStorage.setItem('tachiyomi_allow_bl', 'false');
    }
  };

  const handleConfirmBL = () => {
    setAllowBL(true);
    localStorage.setItem('tachiyomi_allow_bl', 'true');
    setShowBLInfoModal(false);
  };

  // Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderIntervalRef = useRef(null);

  // Estado del banner de sugerencia de instalación
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    return !localStorage.getItem('tachiyomi_dismiss_ext_banner') && installedExtensions.length < 2;
  });
  const [onlyInstalledFilter, setOnlyInstalledFilter] = useState(() => {
    return localStorage.getItem('tachiyomi_only_installed') === 'true';
  });
  const [isInstallingBatch, setIsInstallingBatch] = useState(false);

  // Instalar todas las extensiones desde el banner
  const handleInstallAll = async () => {
    setIsInstallingBatch(true);
    if (onInstallAllExtensions) {
      await onInstallAllExtensions();
    }
    setIsInstallingBatch(false);
    setShowInstallBanner(false);
    localStorage.removeItem('tachiyomi_only_installed');
    setOnlyInstalledFilter(false);
  };

  const installedIds = installedExtensions.map(e => e.id);

  // Combina mangas reales del catálogo si existen con los destacados
  const heroSlides = React.useMemo(() => {
    let list = DEFAULT_HERO_SLIDES;
    if (catalog && catalog.length >= 3) {
      list = catalog.slice(0, 8).map((m, idx) => ({
        id: `hero-cat-${idx}`,
        title: m.title,
        originalTitle: m.title,
        synopsis: m.synopsis || DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length].synopsis,
        cover: m.coverProxy || m.cover || DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length].cover,
        backdrop: m.coverProxy || m.cover || DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length].backdrop,
        rating: '9.8',
        year: '2026',
        status: m.status || 'Activo',
        genres: m.genres && m.genres.length > 0 ? m.genres : DEFAULT_HERO_SLIDES[idx % DEFAULT_HERO_SLIDES.length].genres,
        scanSource: m.extension || 'Olympus Scanlation',
        extensionId: m.extensionId || 'olympus-scanlation',
        url: m.url,
        latestChapter: m.latestChapter || 'Cap. Reciente',
        isAdult: m.isAdult,
        isBL: m.isBL
      }));
    }
    // SIEMPRE filtrar estrictamente por las extensiones que el usuario tiene instaladas
    list = list.filter(s => installedIds.includes(s.extensionId));

    if (!allowAdult) {
      list = list.filter(m => !isAdultManga(m));
    }
    if (!allowBL) {
      list = list.filter(m => !isBLManga(m));
    }
    return list;
  }, [catalog, installedIds, allowAdult, allowBL]);

  // Estado del feed de estrenos y rankings en vivo con persistencia instantánea en localStorage
  const [liveFeed, setLiveFeed] = useState(() => {
    try {
      const cached = localStorage.getItem('tachiyomi_home_feed_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.latestReleases) && parsed.latestReleases.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché de home-feed:', e);
    }
    return {
      latestReleases: [],
      topRankings: []
    };
  });
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

  const fetchHomeFeed = async (force = false) => {
    try {
      if (force) setIsRefreshingFeed(true);
      const url = force ? '/api/home-feed?refresh=true' : '/api/home-feed';
      const res = await axios.get(url);
      if (res.data?.success) {
        const feedData = {
          latestReleases: res.data.data?.latestReleases || [],
          topRankings: res.data.data?.topRankings || []
        };
        setLiveFeed(feedData);
        try {
          localStorage.setItem('tachiyomi_home_feed_cache', JSON.stringify(feedData));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Backend /api/home-feed:', err.message);
    } finally {
      if (force) {
        setTimeout(() => setIsRefreshingFeed(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchHomeFeed(false);
    const interval = setInterval(() => fetchHomeFeed(false), 180000); // Refrescar cada 3 minutos
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Lista de populares filtrada EXCLUSIVAMENTE por extensiones instaladas
  const popularMangas = React.useMemo(() => {
    let list = INITIAL_POPULAR.filter(m => installedIds.includes(m.extensionId));

    if (!allowAdult) {
      list = list.filter(m => !isAdultManga(m));
    }
    if (!allowBL) {
      list = list.filter(m => !isBLManga(m));
    }
    return list;
  }, [installedIds, allowAdult, allowBL]);

  // Lista de nuevos lanzamientos en vivo o iniciales filtrados EXCLUSIVAMENTE por extensiones instaladas
  const recentReleases = React.useMemo(() => {
    let list = (liveFeed.latestReleases && liveFeed.latestReleases.length > 0)
      ? liveFeed.latestReleases
      : INITIAL_RELEASES;

    // Filtrar estrictamente por las extensiones instaladas
    list = list.filter(m => installedIds.includes(m.extensionId));

    // Filtrar +18 si no está habilitado
    if (!allowAdult) {
      list = list.filter(m => !isAdultManga(m));
    }

    // Filtrar BL si no está habilitado
    if (!allowBL) {
      list = list.filter(m => !isBLManga(m));
    }

    return list;
  }, [liveFeed.latestReleases, installedIds, allowAdult, allowBL]);

  // Filtro activo de formato: 'all' | 'manga' | 'manhwa' | 'manhua'
  const [activeFormatTab, setActiveFormatTab] = useState('all');

  // Conteos por categoría
  const mangaCount = React.useMemo(() => recentReleases.filter(r => (r.type || '').toLowerCase() === 'manga').length, [recentReleases]);
  const manhwaCount = React.useMemo(() => recentReleases.filter(r => (r.type || '').toLowerCase() === 'manhwa').length, [recentReleases]);
  const manhuaCount = React.useMemo(() => recentReleases.filter(r => (r.type || '').toLowerCase() === 'manhua').length, [recentReleases]);

  // Lanzamientos filtrados por pestaña de formato seleccionada
  const filteredReleases = React.useMemo(() => {
    if (activeFormatTab === 'all') return recentReleases;
    return recentReleases.filter(r => (r.type || '').toLowerCase() === activeFormatTab.toLowerCase());
  }, [recentReleases, activeFormatTab]);

  // Carrusel 3D Coverflow de Nuevos Lanzamientos
  const [activeReleaseIndex, setActiveReleaseIndex] = useState(0);
  const [isReleaseCarouselPaused, setIsReleaseCarouselPaused] = useState(false);

  // Auto-play suave del carrusel 3D cada 3.8 segundos
  useEffect(() => {
    if (isReleaseCarouselPaused || filteredReleases.length <= 1) return;

    const interval = setInterval(() => {
      setActiveReleaseIndex(prev => (prev + 1) % filteredReleases.length);
    }, 3800);

    return () => clearInterval(interval);
  }, [isReleaseCarouselPaused, filteredReleases.length]);

  const handleFormatTabChange = (tab) => {
    setActiveFormatTab(tab);
    setActiveReleaseIndex(0);
  };

  // Mouse Drag / Touch Swipe & Wheel controlado sin desplazar la página
  const [isDragging, setIsDragging] = useState(false);
  const carousel3DRef = useRef(null);
  const dragStartXRef = useRef(0);
  const lastShiftXRef = useRef(0);
  const lastDragStepTimeRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const lastWheelTimeRef = useRef(0);

  const handlePrevRelease = React.useCallback(() => {
    setActiveReleaseIndex(prev => (prev === 0 ? filteredReleases.length - 1 : prev - 1));
  }, [filteredReleases.length]);

  const handleNextRelease = React.useCallback(() => {
    setActiveReleaseIndex(prev => (prev + 1) % filteredReleases.length);
  }, [filteredReleases.length]);

  // Interceptar el scroll de la rueda (wheel) para mover el carrusel SIN bajar la página
  useEffect(() => {
    const el = carousel3DRef.current;
    if (!el) return;

    const onWheelHandler = (e) => {
      e.preventDefault(); // Detiene el scroll vertical de la ventana
      e.stopPropagation();

      const now = Date.now();
      if (now - lastWheelTimeRef.current < 260) return; // Control suave de cadencia

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 8) {
        lastWheelTimeRef.current = now;
        if (delta > 0) {
          handleNextRelease();
        } else {
          handlePrevRelease();
        }
      }
    };

    el.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelHandler);
    };
  }, [handleNextRelease, handlePrevRelease]);

  const handleDragStart = (clientX) => {
    setIsDragging(true);
    dragStartXRef.current = clientX;
    lastShiftXRef.current = clientX;
    lastDragStepTimeRef.current = Date.now();
    hasDraggedRef.current = false;
    setIsReleaseCarouselPaused(true);
  };

  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    const totalDiff = clientX - dragStartXRef.current;
    const stepDiff = clientX - lastShiftXRef.current;

    if (Math.abs(totalDiff) > 8) {
      hasDraggedRef.current = true;
    }

    const now = Date.now();
    // Limitar la velocidad de cambio al arrastrar (mínimo 280ms entre mangas para evitar saltos bruscos)
    if (now - lastDragStepTimeRef.current < 280) return;

    const DRAG_STEP = 50;
    if (stepDiff < -DRAG_STEP) {
      handleNextRelease();
      lastShiftXRef.current = clientX;
      lastDragStepTimeRef.current = now;
    } else if (stepDiff > DRAG_STEP) {
      handlePrevRelease();
      lastShiftXRef.current = clientX;
      lastDragStepTimeRef.current = now;
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  // Transformación 3D nítida con transición suave y orgánica
  const getCard3DStyle = (index) => {
    const total = filteredReleases.length;
    if (total === 0) return { display: 'none' };

    let diff = index - activeReleaseIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);

    if (absDiff > 3) {
      return {
        display: 'none',
        opacity: 0,
        pointerEvents: 'none'
      };
    }

    const isCenter = diff === 0;
    const isTrio = absDiff === 1;
    const sign = diff < 0 ? -1 : 1;

    let x = 0;
    let z = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 1;

    if (isCenter) {
      x = 0;
      z = 40;
      rotateY = 0;
      scale = 1;
      opacity = 1;
    } else if (isTrio) {
      x = sign * 205;
      z = -15;
      rotateY = -sign * 16;
      scale = 0.92;
      opacity = 0.95;
    } else if (absDiff === 2) {
      x = sign * 345;
      z = -60;
      rotateY = -sign * 32;
      scale = 0.78;
      opacity = 0.55;
    } else {
      x = sign * 445;
      z = -110;
      rotateY = -sign * 45;
      scale = 0.65;
      opacity = 0.25;
    }

    return {
      transform: `translate3d(${x}px, 0px, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
      WebkitTransform: `translate3d(${x}px, 0px, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
      zIndex: 40 - absDiff * 8,
      opacity,
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden',
      WebkitFontSmoothing: 'antialiased',
      transformStyle: 'preserve-3d',
      willChange: 'transform, opacity',
      transition: 'transform 550ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease-out',
      cursor: isDragging ? 'grabbing' : 'grab'
    };
  };

  const currentReleaseManga = filteredReleases[activeReleaseIndex] || filteredReleases[0] || null;

  // Lista de top rankings en vivo o populares con filtros +18 / BL
  const topRankingsList = React.useMemo(() => {
    let list = (liveFeed.topRankings && liveFeed.topRankings.length > 0)
      ? liveFeed.topRankings
      : popularMangas;

    // Filtrar estrictamente por las extensiones instaladas
    list = list.filter(m => installedIds.includes(m.extensionId));

    if (!allowAdult) {
      list = list.filter(m => !isAdultManga(m));
    }
    if (!allowBL) {
      list = list.filter(m => !isBLManga(m));
    }
    return list.slice(0, 5);
  }, [liveFeed.topRankings, popularMangas, installedIds, allowAdult, allowBL]);

  // Auto-play del Hero Banner cada 6 segundos hacia la izquierda
  useEffect(() => {
    if (isPaused) return;

    sliderIntervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => {
      if (sliderIntervalRef.current) clearInterval(sliderIntervalRef.current);
    };
  }, [isPaused, heroSlides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % heroSlides.length);
  };

  // Comentarios en tiempo real
  const [comments, setComments] = useState(() => {
    const saved = localStorage.getItem('tachiyomi_live_comments');
    return saved ? JSON.parse(saved) : INITIAL_COMMENTS;
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [commentUserName, setCommentUserName] = useState('Tú (Lector)');

  // Guardar comentarios en localStorage
  useEffect(() => {
    localStorage.setItem('tachiyomi_live_comments', JSON.stringify(comments));
  }, [comments]);

  // Simulación sutil de actividad comunitaria en vivo (1 mensaje cada ~40s)
  useEffect(() => {
    const simInterval = setInterval(() => {
      const randomItem = SIMULATED_COMMUNITY_POOL[Math.floor(Math.random() * SIMULATED_COMMUNITY_POOL.length)];
      const simComment = {
        id: `sim-${Date.now()}`,
        user: randomItem.user,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randomItem.user)}`,
        badge: 'En línea',
        badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
        time: 'Hace un momento',
        manga: randomItem.manga,
        text: randomItem.text,
        likes: Math.floor(Math.random() * 5),
        isLiked: false
      };

      setComments(prev => [simComment, ...prev.slice(0, 19)]); // Limitar a los 20 más recientes
    }, 45000);

    return () => clearInterval(simInterval);
  }, []);

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const activeName = currentUser?.name || commentUserName.trim() || 'Lector Anónimo';
    const activeAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeName)}`;

    const newComment = {
      id: `c-user-${Date.now()}`,
      user: activeName,
      avatar: activeAvatar,
      badge: currentUser ? 'Usuario' : 'Tú',
      badgeColor: 'bg-purple-900/80 text-purple-200 border-purple-600',
      time: 'Hace unos momentos',
      manga: 'General',
      text: newCommentText.trim(),
      likes: 1,
      isLiked: true
    };

    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
  };

  const handleToggleLikeComment = (id) => {
    setComments(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          likes: c.isLiked ? c.likes - 1 : c.likes + 1,
          isLiked: !c.isLiked
        };
      }
      return c;
    }));
  };

  const currentHero = heroSlides[currentSlide] || heroSlides[0];

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-10 py-6 pb-28 space-y-9 animate-fadeIn select-none">

      {/* 1. HERO SLIDER BANNER PRINCIPAL (Estilo Cinemático Widescreen) */}
      <div 
        className="relative w-full rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-[#0b0e14] group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Controles Globales de Contenido para toda la Página de Inicio (+18 y BL) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2 bg-[#0a0d14]/85 backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-2xl">
          <button
            onClick={handleToggleAdult}
            title={allowAdult ? "Contenido +18 activado en todo Inicio (Clic para ocultar)" : "Clic para habilitar contenido +18 en todo Inicio (Requiere confirmación de edad)"}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-lg ${
              allowAdult
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-400 shadow-red-950/60 hover:scale-105'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] text-gray-400 hover:text-red-400 border-gray-700/80 hover:border-red-900/50'
            }`}
          >
            <span className="text-sm">🔞</span>
            <span>+18 {allowAdult ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleBL}
            title={allowBL ? "Contenido BL activado en todo Inicio (Clic para ocultar)" : "Clic para habilitar contenido BL / Yaoi en todo Inicio"}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-lg ${
              allowBL
                ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white border-pink-400 shadow-pink-950/60 hover:scale-105'
                : 'bg-[#121622]/90 hover:bg-[#1a2030] text-gray-400 hover:text-pink-400 border-gray-700/80 hover:border-pink-900/50'
            }`}
          >
            <span className="text-sm">🌈</span>
            <span>BL {allowBL ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Fondo con Blur e Imagen Cinemática */}
        <div className="relative w-full h-[440px] sm:h-[500px] lg:h-[560px] overflow-hidden">
          
          {heroSlides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Imagen de fondo extendida */}
              <img
                src={slide.coverProxy || getProxiedCover(slide.backdrop || slide.cover, slide.extensionId)}
                alt={slide.title}
                className="w-full h-full object-cover object-center scale-105 filter brightness-90 transition-transform duration-7000 ease-out"
                onError={(e) => {
                  if (!e.target.dataset.triedOriginal && (slide.backdrop || slide.cover)) {
                    e.target.dataset.triedOriginal = 'true';
                    e.target.src = slide.backdrop || slide.cover;
                  }
                }}
              />

              {/* Degradados Cinemáticos para máxima legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-[#0a0d14]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d14] via-[#0a0d14]/80 to-transparent" />
              <div className="absolute inset-0 bg-purple-950/20 mix-blend-overlay" />
            </div>
          ))}

          {/* Contenido Superpuesto del Slide Actual */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-4xl">
            
            {/* Metadatos y Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
              <span className="px-3 py-1 rounded-full bg-purple-600/90 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/40">
                {currentHero.scanSource}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{currentHero.status}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 text-xs font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{currentHero.rating}</span>
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {currentHero.year} • {currentHero.latestChapter}
              </span>
            </div>

            {/* Título Monumental */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-xl line-clamp-2">
              {currentHero.title}
            </h1>

            {/* Géneros */}
            {currentHero.genres && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {currentHero.genres.map((g, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-900/80 text-gray-300 border border-gray-700/60 backdrop-blur-sm">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Sinopsis */}
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-6 max-w-3xl text-shadow select-text">
              {currentHero.synopsis}
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onSelectManga(currentHero.url, currentHero.extensionId)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-purple-600/40 transition transform active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Leer Manga</span>
              </button>

              <button
                onClick={() => onSelectManga(currentHero.url, currentHero.extensionId)}
                className="px-5 py-3 rounded-2xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-700 text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-md transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Ver Detalles</span>
              </button>
            </div>
          </div>

          {/* Flechas de Navegación Lateral */}
          <button
            onClick={handlePrevSlide}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 hover:bg-purple-600/90 text-white border border-white/10 backdrop-blur-md transition opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNextSlide}
            aria-label="Slide siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 hover:bg-purple-600/90 text-white border border-white/10 backdrop-blur-md transition opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicadores de Páginas / Dots abajo */}
          <div className="absolute bottom-4 right-6 sm:right-10 z-30 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide ? 'w-6 bg-purple-500' : 'w-2 bg-gray-600 hover:bg-gray-400'
                }`}
                aria-label={`Ir al slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. POPULAR DE LA SEMANA (Tarjetas con gráficos de tendencia) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Popular de la Semana
              </h2>
              <p className="text-xs text-gray-400">
                Las series y obras más destacadas y leídas de la semana en todos los scans.
              </p>
            </div>
          </div>
        </div>

        {/* Cuadrícula / Carrusel de Tarjetas Populares */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {popularMangas.map((manga) => (
            <div
              key={manga.id}
              onClick={() => onSelectManga(manga.url, manga.extensionId)}
              className="group relative bg-[#121622] border border-gray-800/80 hover:border-purple-600/70 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-purple-950/50 cursor-pointer flex flex-col"
            >
              {/* Contenedor de Portada */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#090b10]">
                <img
                  src={manga.coverProxy || getProxiedCover(manga.cover, manga.extensionId)}
                  alt={manga.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Badge de Ranking */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-black font-mono shadow-md backdrop-blur-md ${
                  manga.rank === 1 ? 'bg-amber-500 text-black' :
                  manga.rank === 2 ? 'bg-slate-300 text-black' :
                  manga.rank === 3 ? 'bg-amber-700 text-white' :
                  'bg-black/70 text-gray-200 border border-white/10'
                }`}>
                  #{manga.rank}
                </div>

                {/* Badge de Estado con Icono de Tendencia */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-[#0a0d14]/90 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
                    <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
                    <span>{manga.status}</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-300 bg-black/80 px-1.5 py-0.5 rounded">
                    ★ {manga.rating}
                  </span>
                </div>
              </div>

              {/* Título del Manga */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <h3 className="text-xs font-bold text-gray-200 group-hover:text-purple-300 line-clamp-2 leading-snug transition-colors">
                  {manga.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. NUEVOS LANZAMIENTOS Y RANKINGS (Layout 2 columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda (2/3): Nuevos Lanzamientos de Capítulos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Nuevos Lanzamientos
                </h2>
                <p className="text-xs text-gray-400">
                  Capítulos recién estrenados en vivo de Mangas, Manhwas y Manhuas.
                </p>
              </div>
            </div>

            {/* Pestañas de Filtrado por Tipo/Origen + Controles de Navegación Izquierda/Derecha + Botón Actualizar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0e121a] p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => handleFormatTabChange('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeFormatTab === 'all'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Todos ({recentReleases.length})
                </button>
                <button
                  onClick={() => handleFormatTabChange('manga')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeFormatTab === 'manga'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>🇯🇵</span>
                  <span>Mangas ({mangaCount})</span>
                </button>
                <button
                  onClick={() => handleFormatTabChange('manhwa')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeFormatTab === 'manhwa'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>🇰🇷</span>
                  <span>Manhwas ({manhwaCount})</span>
                </button>
                <button
                  onClick={() => handleFormatTabChange('manhua')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeFormatTab === 'manhua'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>🇨🇳</span>
                  <span>Manhuas ({manhuaCount})</span>
                </button>
              </div>

              {/* Botón Refrescar en Vivo */}
              <button
                onClick={() => fetchHomeFeed(true)}
                disabled={isRefreshingFeed}
                title="Actualizar capítulos en vivo"
                className="p-2 rounded-xl bg-[#0e121a] hover:bg-purple-950/60 border border-gray-800 hover:border-purple-600/50 text-gray-400 hover:text-purple-300 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingFeed ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Carrusel 3D Coverflow con Arrastre por Ratón (Drag & Swipe) */}
          <div 
            className="relative w-full h-[370px] sm:h-[420px] md:h-[450px] flex items-center justify-center overflow-hidden select-none bg-gradient-to-b from-[#080b12] via-[#0e1322] to-[#080b12] rounded-3xl border border-gray-800/80 shadow-2xl group cursor-grab active:cursor-grabbing"
            style={{ perspective: '1100px', perspectiveOrigin: 'center center', transformStyle: 'preserve-3d' }}
            onMouseEnter={() => setIsReleaseCarouselPaused(true)}
            onMouseLeave={() => {
              if (isDragging) handleDragEnd();
              setIsReleaseCarouselPaused(false);
            }}
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
            ref={carousel3DRef}
          >
            {/* Gradientes laterales de desvanecimiento sutil estilo cine */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#080b12] via-[#080b12]/80 to-transparent z-35" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-r from-transparent via-[#080b12]/80 to-[#080b12] z-35" />

            {/* Render de Tarjetas en Perspectiva 3D con Trío Destacado */}
            {filteredReleases.length === 0 ? (
              <div className="text-gray-400 text-sm text-center">
                No hay lanzamientos disponibles en esta categoría.
              </div>
            ) : (
              filteredReleases.map((rel, idx) => {
                const isCenter = idx === activeReleaseIndex;
                let diff = idx - activeReleaseIndex;
                const total = filteredReleases.length;
                if (diff > total / 2) diff -= total;
                if (diff < -total / 2) diff += total;
                const absDiff = Math.abs(diff);
                const isTrio = absDiff <= 1;

                const cardStyle = getCard3DStyle(idx);
                if (cardStyle.display === 'none') return null;

                return (
                  <div
                    key={rel.id || rel.url || idx}
                    onClick={() => {
                      if (hasDraggedRef.current) return;
                      if (isCenter) {
                        onSelectManga(rel.url, rel.extensionId);
                      } else {
                        setActiveReleaseIndex(idx);
                      }
                    }}
                    style={cardStyle}
                    className={`absolute w-[170px] sm:w-[220px] md:w-[245px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl origin-center transition-transform ${
                      isCenter 
                        ? 'ring-2 ring-purple-500 shadow-purple-900/80 shadow-2xl' 
                        : isTrio 
                        ? 'ring-1 ring-purple-400/50 hover:ring-purple-300 shadow-xl' 
                        : 'ring-1 ring-white/10 hover:ring-purple-400/40'
                    }`}
                  >
                    <img
                      src={rel.coverProxy || getProxiedCover(rel.cover, rel.extensionId)}
                      alt={rel.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      loading="lazy"
                      style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Insignia Superior: Tipo y Scan */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      {rel.type && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                          rel.type.toLowerCase() === 'manga' ? 'bg-rose-950/90 text-rose-300 border border-rose-800/60' :
                          rel.type.toLowerCase() === 'manhua' ? 'bg-amber-950/90 text-amber-300 border border-amber-800/60' :
                          'bg-indigo-950/90 text-indigo-300 border border-indigo-800/60'
                        }`}>
                          {rel.type}
                        </span>
                      )}

                      {isCenter && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-900/90 text-purple-200 border border-purple-600/70 backdrop-blur-md shadow-md">
                          En Foco
                        </span>
                      )}
                    </div>

                    {/* Título y Capítulo en la parte inferior de la tarjeta */}
                    <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end pointer-events-none">
                      <p className={`font-black text-white text-center drop-shadow-md line-clamp-1 ${
                        isCenter ? 'text-xs sm:text-sm' : 'text-xs text-gray-200'
                      }`}>
                        {rel.title}
                      </p>
                      {rel.chapter && (
                        <p className="text-[10px] sm:text-[11px] text-purple-300 font-bold text-center mt-0.5 font-mono drop-shadow">
                          {rel.chapter}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel de Información Dinámica del Manga Activo en el Carrusel */}
          {currentReleaseManga && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111522] via-[#161c2e] to-[#111522] border border-purple-900/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300">
              <div className="flex-1 min-w-0">
                {/* Insignias: Scan, Tipo, Tiempo */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-950/90 border border-purple-700/60 text-purple-300 text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{currentReleaseManga.scan}</span>
                  </span>
                  
                  {currentReleaseManga.type && (
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm ${
                      currentReleaseManga.type.toLowerCase() === 'manga' ? 'bg-rose-950/90 text-rose-300 border-rose-800/60' :
                      currentReleaseManga.type.toLowerCase() === 'manhua' ? 'bg-amber-950/90 text-amber-300 border-amber-800/60' :
                      'bg-indigo-950/90 text-indigo-300 border-indigo-800/60'
                    }`}>
                      {currentReleaseManga.type}
                    </span>
                  )}

                  {currentReleaseManga.isAdult && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-950/90 text-red-300 border border-red-700/60 text-xs font-bold flex items-center gap-1 shadow-sm">
                      <span>🔞</span>
                      <span>+18</span>
                    </span>
                  )}

                  {currentReleaseManga.isBL && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-pink-950/90 text-pink-300 border border-pink-700/60 text-xs font-bold flex items-center gap-1 shadow-sm">
                      <span>🌈</span>
                      <span>BL</span>
                    </span>
                  )}

                  <span className="text-xs text-gray-300 flex items-center gap-1 font-mono bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>{currentReleaseManga.time}</span>
                  </span>
                </div>

                {/* Nombre del Manga */}
                <h3 
                  onClick={() => onSelectManga(currentReleaseManga.url, currentReleaseManga.extensionId)}
                  className="text-base sm:text-lg font-black text-white hover:text-purple-300 transition-colors cursor-pointer truncate"
                  title={currentReleaseManga.title}
                >
                  {currentReleaseManga.title}
                </h3>

                {/* Capítulo Nuevo */}
                <div className="flex items-center gap-2.5 mt-2">
                  <span className="px-3 py-1 rounded-xl bg-purple-600/30 border border-purple-500/60 text-purple-200 text-xs sm:text-sm font-bold shadow-md shadow-purple-950/50">
                    {currentReleaseManga.chapter}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Capítulo más reciente disponible</span>
                  </span>
                </div>
              </div>

              {/* Botón de Acción Directo al Lector / Detalles */}
              <button
                onClick={() => {
                  if (onSelectChapter && (currentReleaseManga.chapterUrl || currentReleaseManga.url)) {
                    onSelectChapter(currentReleaseManga.chapterUrl || currentReleaseManga.url, currentReleaseManga.url);
                  } else {
                    onSelectManga(currentReleaseManga.url, currentReleaseManga.extensionId);
                  }
                }}
                className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 hover:shadow-purple-700/60 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span>Leer Ahora</span>
              </button>
            </div>
          )}
        </div>


        {/* Columna Derecha (1/3): Top Rankings */}
        <div className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Top Rankings</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono uppercase">
                    Mes
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Las obras más leídas y valoradas.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-between">
            {topRankingsList.slice(0, 5).map((item, index) => (
              <div
                key={item.id || item.rank || index}
                onClick={() => onSelectManga(item.url, item.extensionId)}
                className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-300 group cursor-pointer shadow-lg hover:-translate-y-0.5 ${
                  index === 0
                    ? 'bg-gradient-to-r from-amber-950/40 via-[#131828] to-[#101422] border-amber-500/50 hover:border-amber-400 shadow-amber-950/30'
                    : index === 1
                    ? 'bg-gradient-to-r from-slate-900/50 via-[#131828] to-[#101422] border-slate-400/40 hover:border-slate-300'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-950/20 via-[#131828] to-[#101422] border-amber-700/40 hover:border-amber-600'
                    : 'bg-[#101422] hover:bg-[#151b2e] border-gray-800/80 hover:border-purple-600/60'
                }`}
              >
                {/* Portada Grande y Clara con Insignia de Ranking */}
                <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-gray-700/60 shadow-md group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={item.coverProxy || getProxiedCover(item.cover, item.extensionId)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                    onError={(e) => {
                      if (!e.target.dataset.triedOriginal && item.cover) {
                        e.target.dataset.triedOriginal = 'true';
                        e.target.src = item.cover;
                      } else {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80';
                      }
                    }}
                  />

                  {/* Badge de Ranking Grande */}
                  <div className={`absolute top-1 left-1 w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shadow-lg backdrop-blur-md ${
                    index === 0 ? 'bg-amber-400 text-black ring-1 ring-amber-300' :
                    index === 1 ? 'bg-slate-200 text-black ring-1 ring-white' :
                    index === 2 ? 'bg-amber-600 text-white ring-1 ring-amber-400' :
                    'bg-black/80 text-gray-300 border border-white/20'
                  }`}>
                    #{index + 1}
                  </div>
                </div>

                {/* Información Completa y Legible */}
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide truncate">
                        {item.scanSource || item.scan || 'Top Scan'}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white group-hover:text-purple-300 line-clamp-2 leading-snug transition-colors">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono">
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        ★ {item.rating || '9.9'}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 text-[11px] truncate">
                        {item.views || '1.5M lecturas'}
                      </span>
                    </div>
                    
                    <div className="p-1.5 rounded-lg bg-gray-800/60 group-hover:bg-purple-600 text-gray-400 group-hover:text-white transition shrink-0">
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* 4. CHAT GLOBAL EN VIVO (Comunidad de Yomori) */}
      <LiveChatRoom
        roomId="global"
        title="Chat de la Comunidad"
        subtitle="Opina, comparte teorías y debate en directo con todos los lectores de Yomori."
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onOpenUserCard={onOpenUserCard}
      />

      {/* Modal de Advertencia y Confirmación +18 */}
      {showAdultWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#18101a] via-[#120a14] to-[#0a060d] border border-red-600/50 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-red-950/70 flex flex-col items-center text-center">
            {/* Ícono de Advertencia */}
            <div className="w-16 h-16 rounded-2xl bg-red-950/90 border border-red-600/60 flex items-center justify-center mb-4 shadow-lg shadow-red-900/50 animate-bounce">
              <span className="text-3xl">🔞</span>
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide">
              Contenido Exclusivo para Adultos (+18)
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
              Este catálogo incluye obras con temáticas <strong className="text-red-400">Maduras, Eróticas y Explícitas (+18)</strong>.
              <br /><br />
              Para desbloquear y visualizar estos títulos, debes confirmar que eres <strong className="text-white">mayor de 18 años</strong> o cuentas con la mayoría de edad legal requerida en tu país.
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowAdultWarningModal(false)}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Cancelar (Modo Seguro)
              </button>

              <button
                onClick={handleConfirmAdult}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-900/60 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔞 Confirmar (+18)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Informativo de Contenido BL (Boys' Love) */}
      {showBLInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#1b101c] via-[#140b17] to-[#0a060d] border border-pink-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-pink-950/70 flex flex-col items-center text-center">
            {/* Ícono de BL */}
            <div className="w-16 h-16 rounded-2xl bg-pink-950/90 border border-pink-500/60 flex items-center justify-center mb-4 shadow-lg shadow-pink-900/50 animate-bounce">
              <span className="text-3xl">🌈</span>
            </div>

            <h3 className="text-xl font-black text-white mb-2 tracking-wide">
              Contenido BL (Boys' Love)
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
              Este botón habilita la visualización de mangas, manhwas y webtoons con temática <strong className="text-pink-400">Boys' Love (BL), Yaoi, Shounen Ai y Romance entre Chicos</strong> en la página de inicio.
              <br /><br />
              Puedes activar o desactivar este filtro en cualquier momento según tus preferencias de lectura.
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowBLInfoModal(false)}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmBL}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-pink-900/60 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🌈 Habilitar BL</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
