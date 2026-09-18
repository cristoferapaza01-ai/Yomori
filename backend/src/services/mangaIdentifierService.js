import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const REGISTRY_FILE = path.join(DATA_DIR, 'canonical_mangas.json');

// Base de conocimiento canónica de mangas/manhwas/manhuas conocidos con sus múltiples alias en español, inglés, coreano/japonés y nombres troll/anti-copyright
const DEFAULT_CANONICAL_DATABASE = [
  {
    id: 'tomb_raider_king',
    canonicalTitle: 'Tomb Raider King (El Rey de los Saqueadores de Tumbas)',
    cleanName: 'Tomb Raider King',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 411,
    endedYear: 2023,
    imageSlugs: ['tomb-raider-king', 'tomb-raider', 'dogulwang', 'tombraider'],
    aliases: [
      'tomb raider king',
      'el rey de los saqueadores de tumbas',
      'rey de los saqueadores de tumbas',
      'el rey de los ladrones de tumbas',
      'rey de los ladrones de tumbas',
      'el saqueador de tumbas',
      'el rey de las tumbas',
      'tomb raider',
      'dogulwang',
      'tomb raider king el rey de los saqueadores de tumbas'
    ]
  },
  {
    id: 'limit_breaker',
    canonicalTitle: 'Limit Breaker (Rompiendo Límites)',
    cleanName: 'Limit Breaker',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 140,
    endedYear: 2023,
    imageSlugs: ['limit-breaker', 'limitbreaker', 'han-gye-dolpa', 'hangyedolpa'],
    aliases: [
      'limit breaker',
      'rompiendo limites',
      'rompiendo límites',
      'rompe limites',
      'rompe límites',
      'superando el limite',
      'limit breaker rompiendo limites',
      'han gye dolpa',
      'hangye dolpa'
    ]
  },
  {
    id: 'crazy_leveling_system',
    canonicalTitle: 'Crazy Leveling System (Sistema Loco de Subida de Nivel)',
    cleanName: 'Crazy Leveling System',
    type: 'Manhua',
    status: 'EN_EMISION',
    imageSlugs: ['crazy-leveling-system', 'crazy-leveling', 'crazyleveling', 'loco-frontera'],
    aliases: [
      'crazy leveling system',
      'loco frontera',
      'el loco frontera',
      'sistema loco de subida de nivel',
      'sistema de subida de nivel loco',
      'subida de nivel loca'
    ]
  },
  {
    id: 'youngest_brother_academy_genius',
    canonicalTitle: 'Mi hermano pequeño es el mejor de la Academia',
    cleanName: 'Mi hermano pequeño es el mejor de la Academia',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: [
      'hada-scan',
      'mi-hermano-pequeno-es-el-mejor-de-la-academia',
      'my-little-brother-is-the-academys-best',
      'my-youngest-brother-is-the-best-in-the-academy',
      'academys-genius-swordmaster'
    ],
    aliases: [
      'mi hermano pequeno es el mejor de la academia',
      'mi hermano pequeño es el mejor de la academia',
      'mi hermano menor es el genio de la academia',
      'mi hermano menor es el mejor de la academia',
      'el genio espadachin de la academia',
      'my little brother is the academy best',
      'my little brother is the academy\'s best',
      'the academy\'s genius swordmaster',
      'the academys genius swordmaster',
      'hada scan'
    ]
  },
  {
    id: 'reaper_drifting_moon',
    canonicalTitle: 'Reaper of the Drifting Moon (El Segador de la Luna a la Deriva)',
    cleanName: 'Reaper of the Drifting Moon',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['reaper-of-the-drifting-moon', 'drifting-moon', 'pyowol', 'asesino-prieto'],
    aliases: [
      'reaper of the drifting moon',
      'el segador de la luna a la deriva',
      'el asesino prieto',
      'asesino prieto',
      'el asesino negro',
      'el asesino oscuro',
      'segador de la luna a la deriva',
      'pyowol'
    ]
  },
  {
    id: 'solo_leveling',
    canonicalTitle: 'Solo Leveling',
    cleanName: 'Solo Leveling',
    type: 'Manhwa',
    // Obra ORIGINAL finalizada en diciembre 2021 (179 caps).
    // OJO: "Solo Leveling: Ragnarok" es una SECUELA diferente (id: solo_leveling_ragnarok) y NO debe filtrarse.
    status: 'FINALIZADO',
    totalChapters: 179,
    endedYear: 2021,
    imageSlugs: ['na-honjaman-lebel-eob', 'naho-lebel', 'sololeveling-original'],
    // IMPORTANTE: NO incluir 'solo-leveling' como imageSlug aquí porque colisionaría con Ragnarok.
    aliases: [
      'solo leveling',
      'na honjaman lebel eob',
      'i level up alone',
      'solo subo de nivel',
      'solo yo subo de nivel'
    ]
  },
  {
    id: 'solo_leveling_ragnarok',
    canonicalTitle: 'Solo Leveling: Ragnarok',
    cleanName: 'Solo Leveling: Ragnarok',
    type: 'Manhwa',
    // Secuela activa - empezó abril 2023 (~68 caps), en pausa indefinida desde ene 2026 por servicio militar del artista.
    // No está cancelada - puede retomar publicación. NO filtrar.
    status: 'EN_EMISION',
    imageSlugs: ['solo-leveling-ragnarok', 'sololeveling-ragnarok', 'solo-leveling-2', 'ragnarok-manhwa'],
    aliases: [
      'solo leveling ragnarok',
      'solo leveling: ragnarok',
      'solo leveling ragnarök',
      'solo leveling: ragnarök',
      'na honjaman lebel eob ragnarok',
      'slr',
      'solo leveling secuela',
      'solo leveling 2'
    ]
  },
  {
    id: 'iron_blooded_hound',
    canonicalTitle: 'La venganza del sabueso de sangre de hierro',
    cleanName: 'La venganza del sabueso de sangre de hierro',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['revenge-of-the-iron-blooded-sword-hound', 'iron-blooded-sword-hound', 'cheolhyeolgeomga'],
    aliases: [
      'la venganza del sabueso de sangre de hierro',
      'venganza del sabueso de sangre de hierro',
      'el perro rabioso',
      'el sabueso rabioso',
      'el sabueso de hierro',
      'revenge of the iron blooded sword hound',
      'revenge of the iron-blooded sword hound',
      'sabueso de sangre de hierro',
      'cheolhyeolgeomga sanyanggae',
      'iron blooded sword hound'
    ]
  },
  {
    id: 'swordmasters_youngest_son',
    canonicalTitle: 'El hijo menor del maestro de la espada',
    cleanName: 'El hijo menor del maestro de la espada',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['swordmasters-youngest-son', 'swordmaster-youngest-son', 'geomgammun-maknae-adeul'],
    aliases: [
      'el hijo menor del maestro de la espada',
      'hijo menor del maestro de la espada',
      'el menor de los espadachines',
      'el bastardo de la espada',
      'swordmasters youngest son',
      'swordmaster s youngest son',
      'swordmaster\'s youngest son',
      'el hijo menor del maestro de la espada magica',
      'geomgammun maknae adeul'
    ]
  },
  {
    id: 'leveling_10000_years_in_the_future',
    canonicalTitle: 'Subiendo de Nivel 10.000 años en el futuro',
    cleanName: 'Subiendo de Nivel 10.000 años en el futuro',
    type: 'Manhua',
    status: 'EN_EMISION',
    imageSlugs: ['apex-future-martial-arts', 'logging-10000-years', 'gaowu-denglu'],
    aliases: [
      'subiendo de nivel 10000 anos en el futuro',
      'subiendo de nivel 10000 años en el futuro',
      'subiendo de nivel 10 000 anos en el futuro',
      'subiendo de nivel 10 000 años en el futuro',
      'apex future martial arts',
      'future martial arts',
      'gaowu denglu baiwan nian hou',
      'logging 10000 years into the future',
      'artes marciales del futuro'
    ]
  },
  {
    id: 'leveling_with_the_gods',
    canonicalTitle: 'Subiendo de Nivel con los Dioses',
    cleanName: 'Subiendo de Nivel con los Dioses',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['leveling-with-the-gods', 'leveling-with-gods', 'sin-gwa-hamkke'],
    aliases: [
      'subiendo de nivel con los dioses',
      'leveling with the gods',
      'leveling with the gods subiendo de nivel con los dioses',
      'sin gwa hamkke lebel eob'
    ]
  },
  {
    id: 'nano_machine',
    canonicalTitle: 'Nano Machine (Nano Máquina)',
    cleanName: 'Nano Machine',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['nano-machine', 'nanomashin', 'nanomachine'],
    aliases: [
      'nano machine',
      'nano maquina',
      'nano máquina',
      'nanomashin'
    ]
  },
  {
    id: 'magic_emperor',
    canonicalTitle: 'El Emperador Mágico (Demonic Emperor)',
    cleanName: 'El Emperador Mágico',
    type: 'Manhua',
    status: 'EN_EMISION',
    imageSlugs: ['demonic-emperor', 'magic-emperor', 'zhuo-yifan'],
    aliases: [
      'el emperador magico',
      'el emperador mágico',
      'magic emperor',
      'demonic emperor',
      'el emperador demoniaco',
      'el emperador demoníaco',
      'zhuo yifan',
      'mayordomo demoniaco'
    ]
  },
  {
    id: 'the_beginning_after_the_end',
    canonicalTitle: 'The Beginning After The End',
    cleanName: 'The Beginning After The End',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['the-beginning-after-the-end', 'tbate'],
    aliases: [
      'the beginning after the end',
      'el comienzo despues del fin',
      'el comienzo después del fin',
      'el principio despues del final',
      'tbate'
    ]
  },
  {
    id: 'lookism',
    canonicalTitle: 'Lookism (Apariencias)',
    cleanName: 'Lookism',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['lookism', 'oemojisangjuui'],
    aliases: [
      'lookism',
      'apariencias',
      'oemojisangjuui'
    ]
  },
  {
    id: 'mercenary_enrollment',
    canonicalTitle: 'Mercenary Enrollment (Inscripción Mercenaria)',
    cleanName: 'Mercenary Enrollment',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['mercenary-enrollment', 'teen-mercenary', 'iphag-yongbyeong'],
    aliases: [
      'mercenary enrollment',
      'inscripcion mercenaria',
      'inscripción mercenaria',
      'teen mercenary',
      'el mercenario adolescente',
      'iphag yongbyeong'
    ]
  },
  {
    id: 'reincarnation_of_the_suicidal_battle_god',
    canonicalTitle: 'Reencarnación del Dios de la Batalla Suicida (Doom Breaker)',
    cleanName: 'Doom Breaker',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['doom-breaker', 'reincarnation-of-the-suicidal-battle-god', 'tu-sin-hwangsaeng-gi'],
    aliases: [
      'doom breaker',
      'reencarnacion del dios de la batalla suicida',
      'reencarnación del dios de la batalla suicida',
      'reincarnation of the suicidal battle god',
      'el regresor suicida',
      'tu sin hwangsaeng gi'
    ]
  },
  {
    id: 'legend_of_the_northern_blade',
    canonicalTitle: 'La Leyenda de la Hoja del Norte',
    cleanName: 'La Leyenda de la Hoja del Norte',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 200,
    endedYear: 2024,
    imageSlugs: ['legend-of-the-northern-blade', 'northern-blade', 'bukgeomjeonji'],
    aliases: [
      'legend of the northern blade',
      'la leyenda de la hoja del norte',
      'bukgeomjeonji'
    ]
  },
  {
    id: 'martial_peak',
    canonicalTitle: 'Martial Peak (Cumbre Marcial)',
    cleanName: 'Martial Peak',
    type: 'Manhua',
    status: 'FINALIZADO',
    totalChapters: 3770,
    endedYear: 2023,
    imageSlugs: ['martial-peak', 'wu-lian-dian-feng'],
    aliases: [
      'martial peak',
      'cumbre marcial',
      'wu lian dian feng'
    ]
  },
  {
    id: 'return_of_the_disaster_class_hero',
    canonicalTitle: 'El Retorno del Héroe de Clase Desastre',
    cleanName: 'The Return of the Disaster-Class Hero',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['return-of-the-disaster-class-hero', 'disaster-class-hero'],
    aliases: [
      'el retorno del heroe de clase desastre',
      'el retorno del héroe de clase desastre',
      'the return of the disaster-class hero',
      'the return of the disaster class hero',
      'heroe clase desastre'
    ]
  },
  {
    id: 'solo_max_level_newbie',
    canonicalTitle: 'I Am The Fated Villain / Solo Max-Level Newbie',
    cleanName: 'Solo Max-Level Newbie',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['solo-max-level-newbie', 'max-level-newbie'],
    aliases: [
      'solo max level newbie',
      'solo max-level newbie',
      'el novato de nivel maximo',
      'el novato de nivel máximo',
      'el novato del nivel maximo'
    ]
  },
  {
    id: 'infinite_mage',
    canonicalTitle: 'El Mago Infinito (Infinite Mage)',
    cleanName: 'Infinite Mage',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['infinite-mage', 'mullang'],
    aliases: [
      'infinite mage',
      'el mago infinito',
      'mago infinito'
    ]
  },
  {
    id: 'lazy_lord_masters_the_sword',
    canonicalTitle: 'El Noble Perezoso se Convierte en un Genio de la Espada',
    cleanName: 'The Lazy Lord Masters the Sword',
    type: 'Manhwa',
    status: 'EN_EMISION',
    imageSlugs: ['lazy-lord-masters-the-sword', 'reformation-of-the-deadbeat-noble'],
    aliases: [
      'the lazy lord masters the sword',
      'el noble perezoso se convierte en un genio de la espada',
      'el vago del clan',
      'el joven maestro perezoso',
      'reformation of the deadbeat noble'
    ]
  },
  // ─────────────────────────────────────────────────────────────────
  // SERIES FINALIZADAS CONFIRMADAS - investigadas Sept 2026
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'return_sss_class_ranker',
    canonicalTitle: 'Return of the SSS-Class Ranker (Regreso del Ranker de Clase SSS)',
    cleanName: 'Return of the SSS-Class Ranker',
    type: 'Manhwa',
    // Finalizado el 13 de julio de 2026. Total: 200 capítulos.
    status: 'FINALIZADO',
    totalChapters: 200,
    endedYear: 2026,
    imageSlugs: ['return-of-the-sss-class-ranker', 'sss-class-ranker', 'sss-ranker', 'return-sss-ranker'],
    aliases: [
      'return of the sss-class ranker',
      'return of the sss class ranker',
      'regreso del ranker de clase sss',
      'el regreso del ranker de clase sss',
      'ranker de clase sss',
      'regreso del ranker sss',
      'sss class ranker',
      'sss-class ranker regreso',
      'el ranker sss',
      'ranker sss'
    ]
  },
  {
    id: 'kill_the_hero',
    canonicalTitle: 'Kill the Hero (Matar al Héroe)',
    cleanName: 'Kill the Hero',
    type: 'Manhwa',
    // Finalizado. Total: 153 capítulos.
    status: 'FINALIZADO',
    totalChapters: 153,
    endedYear: 2024,
    imageSlugs: ['kill-the-hero', 'kill-hero', 'yeongung- euro-jul-da'],
    aliases: [
      'kill the hero',
      'matar al heroe',
      'matar al héroe',
      'mata al heroe',
      'mata al héroe',
      'kill hero',
      'yeongung uro jul da'
    ]
  },
  {
    id: 'greatest_estate_developer',
    canonicalTitle: 'The Greatest Estate Developer (El Mejor Desarrollador de Bienes Raíces)',
    cleanName: 'The Greatest Estate Developer',
    type: 'Manhwa',
    // Finalizado. Historia principal: 210 capítulos. Con historias cortas: ~223.
    status: 'FINALIZADO',
    totalChapters: 210,
    endedYear: 2025,
    imageSlugs: ['greatest-estate-developer', 'best-estate-developer', 'yeokdaegeup-yeongjiseolja'],
    aliases: [
      'the greatest estate developer',
      'greatest estate developer',
      'el mejor desarrollador de bienes raices',
      'el mejor desarrollador de bienes raíces',
      'el mejor desarrollador inmobiliario',
      'desarrollador de bienes raices',
      'yeokdaegeup yeongjiseolja'
    ]
  },
  {
    id: 'omniscient_reader',
    canonicalTitle: 'Omniscient Reader\'s Viewpoint (El Lector Omnisciente)',
    cleanName: 'Omniscient Reader\'s Viewpoint',
    type: 'Manhwa',
    // En emisión - muy popular, más de 200 caps, PERO aún no finalizado.
    status: 'EN_EMISION',
    imageSlugs: ['omniscient-readers-viewpoint', 'omniscient-reader', 'orv', 'jeongjijuui'],
    aliases: [
      'omniscient reader\'s viewpoint',
      'omniscient readers viewpoint',
      'el lector omnisciente',
      'lector omnisciente',
      'orv',
      'el punto de vista del lector omnisciente'
    ]
  },
  {
    id: 'my_dad_is_too_strong',
    canonicalTitle: 'My Dad Is Too Strong (Mi papá es demasiado fuerte / Mi papá es el archimago)',
    cleanName: 'My Dad Is Too Strong',
    type: 'Manhwa',
    // Finalizado. Total: 237 capítulos.
    status: 'FINALIZADO',
    totalChapters: 237,
    endedYear: 2024,
    imageSlugs: [
      'my-dad-is-too-strong',
      'dad-is-too-strong',
      'dad-too-strong',
      'appaga-neomu-gangham',
      'my-father-is-too-strong',
      'mi-papa-es-demasiado-fuerte',
      'mi-padre-es-demasiado-fuerte',
      'mi-papa-es-el-archimago',
      'mi-padre-es-el-archimago',
      'archimago'
    ],
    aliases: [
      'my dad is too strong',
      'my father is too strong',
      'mi papa es demasiado fuerte',
      'mi papá es demasiado fuerte',
      'mi padre es demasiado fuerte',
      'papa es demasiado fuerte',
      'papá es demasiado fuerte',
      'padre es demasiado fuerte',
      'mi papa es el archimago',
      'mi papá es el archimago',
      'mi padre es el archimago',
      'papa es el archimago',
      'papá es el archimago',
      'padre es el archimago',
      'appaga neomu gangham',
      'my dad is strong',
      'el papa mas fuerte',
      'el papá más fuerte',
      'padre mas fuerte',
      'padre más fuerte'
    ]
  },
  {
    id: 'the_boxer',
    canonicalTitle: 'The Boxer (El Boxeador)',
    cleanName: 'The Boxer',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 104,
    endedYear: 2022,
    imageSlugs: ['the-boxer', 'boxer', 'deo-bokseo'],
    aliases: ['the boxer', 'el boxeador', 'boxer', 'deo bokseo']
  },
  {
    id: 'medical_return',
    canonicalTitle: 'Medical Return (Retorno Médico)',
    cleanName: 'Medical Return',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 148,
    endedYear: 2022,
    imageSlugs: ['medical-return', 'medikeol-hwansaeng'],
    aliases: ['medical return', 'retorno medico', 'retorno médico', 'medikeol hwansaeng']
  },
  {
    id: 'i_am_the_sorcerer_king',
    canonicalTitle: 'I Am the Sorcerer King (Yo soy el Rey Hechicero)',
    cleanName: 'I Am the Sorcerer King',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 143,
    endedYear: 2021,
    imageSlugs: ['i-am-the-sorcerer-king', 'sorcerer-king', 'naneun-madowangida'],
    aliases: ['i am the sorcerer king', 'yo soy el rey hechicero', 'el rey hechicero', 'naneun madowangida']
  },
  {
    id: 'a_returners_magic_should_be_special',
    canonicalTitle: 'A Returner\'s Magic Should Be Special (La magia de un retornado debe ser especial)',
    cleanName: 'A Returner\'s Magic Should Be Special',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 262,
    endedYear: 2024,
    imageSlugs: ['a-returners-magic-should-be-special', 'returners-magic', 'gwihwanjaui-mabeobeun-teukbyeolhaeya-hamnida'],
    aliases: [
      'a returners magic should be special',
      'a returner\'s magic should be special',
      'la magia de un retornado debe ser especial',
      'magia de un retornado',
      'retornado especial'
    ]
  },
  {
    id: 'peerless_dad',
    canonicalTitle: 'Peerless Dad (Padre Incomparable)',
    cleanName: 'Peerless Dad',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 285,
    endedYear: 2024,
    imageSlugs: ['peerless-dad', 'abimussang'],
    aliases: ['peerless dad', 'padre incomparable', 'abimussang', 'padre sin igual']
  },
  {
    id: 'god_of_highschool',
    canonicalTitle: 'The God of High School (El Dios de la Secundaria)',
    cleanName: 'The God of High School',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 571,
    endedYear: 2022,
    imageSlugs: ['the-god-of-high-school', 'god-of-high-school', 'gat-obu-haiseukul'],
    aliases: ['the god of high school', 'god of high school', 'the god of highschool', 'el dios de la secundaria', 'gat obu haiseukul']
  },
  {
    id: 'noblesse',
    canonicalTitle: 'Noblesse',
    cleanName: 'Noblesse',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 544,
    endedYear: 2019,
    imageSlugs: ['noblesse'],
    aliases: ['noblesse']
  },
  {
    id: 'bastard',
    canonicalTitle: 'Bastard',
    cleanName: 'Bastard',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 93,
    endedYear: 2016,
    imageSlugs: ['bastard', 'hurejasik'],
    aliases: ['bastard', 'hijo de la muerte', 'hurejasik']
  },
  {
    id: 'sweet_home',
    canonicalTitle: 'Sweet Home (Dulce Hogar)',
    cleanName: 'Sweet Home',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 140,
    endedYear: 2020,
    imageSlugs: ['sweet-home', 'seuwiteuhom'],
    aliases: ['sweet home', 'dulce hogar', 'seuwiteuhom']
  },
  {
    id: 'leviathan',
    canonicalTitle: 'Leviathan (Leviatán)',
    cleanName: 'Leviathan',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 214,
    endedYear: 2022,
    imageSlugs: ['leviathan', 'ribai-eodeon'],
    aliases: ['leviathan', 'leviatan', 'ribai-eodeon', 'el leviatán']
  },
  {
    id: 'weak_hero',
    canonicalTitle: 'Weak Hero (Héroe Débil)',
    cleanName: 'Weak Hero',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 267,
    endedYear: 2023,
    imageSlugs: ['weak-hero', 'yakhanyeongung'],
    aliases: ['weak hero', 'heroe debil', 'héroe débil', 'yakhanyeongung']
  },
  {
    id: 'unholy_blood',
    canonicalTitle: 'Unholy Blood / White Blood (Sangre Impura)',
    cleanName: 'Unholy Blood',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 92,
    endedYear: 2021,
    imageSlugs: ['unholy-blood', 'white-blood', 'hwaiteu-beulleodeu'],
    aliases: ['unholy blood', 'white blood', 'sangre impura', 'sangre blanca']
  },
  {
    id: 'her_summon',
    canonicalTitle: 'Her Summon (Su Invocación)',
    cleanName: 'Her Summon',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 117,
    endedYear: 2021,
    imageSlugs: ['her-summon', 'geunyeoui-sohwan'],
    aliases: ['her summon', 'su invocacion', 'su invocación']
  },
  {
    id: 'hardcore_leveling_warrior_orig',
    canonicalTitle: 'Hardcore Leveling Warrior (Original)',
    cleanName: 'Hardcore Leveling Warrior',
    type: 'Manhwa',
    status: 'FINALIZADO',
    totalChapters: 316,
    endedYear: 2022,
    imageSlugs: ['hardcore-leveling-warrior', 'yeolrep-jeonsa'],
    aliases: ['hardcore leveling warrior', 'guerrero de subida de nivel extrema', 'hlw']
  }
];


class MangaIdentifierService {
  constructor() {
    this.registry = new Map();
    this.aliasIndex = new Map();
    this.imageSlugIndex = new Map();
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let loaded = [...DEFAULT_CANONICAL_DATABASE];
    if (fs.existsSync(REGISTRY_FILE)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
        if (Array.isArray(fileContent) && fileContent.length > 0) {
          const mapById = new Map();
          loaded.forEach(item => mapById.set(item.id, item));
          fileContent.forEach(item => {
            if (item && item.id) {
              const existing = mapById.get(item.id) || {};
              mapById.set(item.id, {
                ...existing,
                ...item,
                aliases: Array.from(new Set([...(existing.aliases || []), ...(item.aliases || [])])),
                imageSlugs: Array.from(new Set([...(existing.imageSlugs || []), ...(item.imageSlugs || [])]))
              });
            }
          });
          loaded = Array.from(mapById.values());
        }
      } catch (err) {
        console.warn('[MangaIdentifier] Error cargando canonical_mangas.json:', err.message);
      }
    }

    this.loadDatabase(loaded);
    this.save();
  }

  loadDatabase(items) {
    this.registry.clear();
    this.aliasIndex.clear();
    this.imageSlugIndex.clear();

    for (const item of items) {
      this.registry.set(item.id, item);

      // Índice de nombres y alias de texto
      const allNames = [item.canonicalTitle, item.cleanName, ...(item.aliases || [])];
      for (const name of allNames) {
        const normalized = this.normalizeTitle(name);
        if (normalized) {
          this.aliasIndex.set(normalized, item.id);
        }
      }

      // Índice de huellas de URL de portada y slugs de imágenes
      const allSlugs = [item.id, ...(item.imageSlugs || [])];
      for (const slug of allSlugs) {
        const normSlug = this.normalizeSlug(slug);
        if (normSlug) {
          this.imageSlugIndex.set(normSlug, item.id);
        }
      }
    }
  }

  save() {
    try {
      const arr = Array.from(this.registry.values());
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[MangaIdentifier] Error guardando registro:', e.message);
    }
  }

  // Normalización exhaustiva de texto para matching multi-idioma
  normalizeTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/\[.*?\]|\(.*?\)/g, ' ') // Remover corchetes y paréntesis
      .replace(/\b(capitulo|capítulo|cap|ch|episode|ep|season|temporada|manhwa|manga|manhua|webtoon|raw|color|full color|hd|scan|oficial|official)\b.*\b/gi, '')
      .replace(/[^a-z0-9]/g, ' ') // Dejar solo letras y números separados por espacio
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalización de slugs de URLs o nombres de archivos de portadas
  normalizeSlug(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Extraer patrones significativos desde una URL de imagen o URL de serie
  extractImageSignatures(imageUrl = '', pageUrl = '') {
    const signatures = [];
    const fullSource = `${imageUrl} ${pageUrl}`.toLowerCase();

    // 1. Extraer slug de la URL de la página
    if (pageUrl) {
      const parts = pageUrl.split('/').filter(Boolean);
      const lastPart = parts.pop() || '';
      const cleanSlug = lastPart.replace(/^comic-|^series-|^manga-|^manhua-/, '').replace(/-\d{5,}.*$/, '');
      if (cleanSlug.length > 3) signatures.push(cleanSlug);
    }

    // 2. Extraer nombre del archivo de la portada
    if (imageUrl) {
      const imgFile = imageUrl.split('/').pop()?.split('?')[0]?.replace(/\.[a-zA-Z0-9]+$/, '') || '';
      const cleanImg = imgFile.replace(/^cover_|^thumb_|^poster_/, '').replace(/_\d{3,}x\d{3,}$/, '');
      if (cleanImg.length > 3) signatures.push(cleanImg);
    }

    return signatures;
  }

  // 📷 IDENTIFICACIÓN POR IMAGEN / HUELLA VISUAL / SLUG DE PORTADA
  // Resuelve nombres troll inventados por scans (ej: "Loco Frontera", "El Asesino Prieto") analizando su portada y assets
  identifyByImage(imageUrl = '', pageUrl = '', rawTitle = '') {
    const signatures = this.extractImageSignatures(imageUrl, pageUrl);

    for (const sig of signatures) {
      const normSig = this.normalizeSlug(sig);
      if (!normSig || normSig.length < 4) continue;

      // 1. Coincidencia directa o por token completo con el índice de slugs de portadas
      for (const [slugKey, canonicalId] of this.imageSlugIndex.entries()) {
        if (slugKey.length < 4) continue;

        const isExact = normSig === slugKey;
        const isSignificantSub = (slugKey.length >= 6 && normSig.includes(slugKey));

        if (isExact || isSignificantSub) {
          const item = this.registry.get(canonicalId);
          if (item) {
            if (rawTitle) this.registerAlias(canonicalId, rawTitle);
            return item;
          }
        }
      }
    }

    return null;
  }

  // 🎯 IDENTIFICADOR GLOBAL UNIFICADO (Texto + Imagen + Alias Troll)
  identifyManga(rawTitle = '', imageUrl = '', pageUrl = '') {
    // 1. Intentar primero por Huella Visual / Imagen / Slug de portada (vital para nombres troll como "Loco Frontera")
    if (imageUrl || pageUrl) {
      const byImage = this.identifyByImage(imageUrl, pageUrl, rawTitle);
      if (byImage) return byImage;
    }

    if (!rawTitle) return null;
    const normalized = this.normalizeTitle(rawTitle);
    if (!normalized) return null;

    // 2. Búsqueda exacta en el índice de alias
    if (this.aliasIndex.has(normalized)) {
      const canonicalId = this.aliasIndex.get(normalized);
      return this.registry.get(canonicalId) || null;
    }

    // 3. Búsqueda por sub-coincidencia estricta (longitud descendente)
    const aliasEntries = Array.from(this.aliasIndex.entries())
      .filter(([k]) => k.length >= 7)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [aliasNorm, canonicalId] of aliasEntries) {
      // Solo coincidencias directas o si el título completo contiene el alias canónico como frase
      if (normalized === aliasNorm || normalized.includes(aliasNorm)) {
        return this.registry.get(canonicalId) || null;
      }
    }

    // 4. Heurística de similitud por palabras clave significativas (mínimo 3 palabras o 80% de similitud)
    const words = normalized.split(' ').filter(w => w.length > 2);
    if (words.length >= 3) {
      for (const [canonicalId, item] of this.registry.entries()) {
        const allItemAliases = [item.canonicalTitle, item.cleanName, ...(item.aliases || [])];
        for (const al of allItemAliases) {
          const alWords = this.normalizeTitle(al).split(' ').filter(w => w.length > 2);
          const matchingWords = words.filter(w => alWords.includes(w));
          if (matchingWords.length >= 3 && matchingWords.length >= Math.max(words.length, alWords.length) * 0.8) {
            this.registerAlias(canonicalId, rawTitle);
            return item;
          }
        }
      }
    }

    return null;
  }

  // Registrar un nuevo alias dinámicamente
  registerAlias(canonicalId, newAlias) {
    const item = this.registry.get(canonicalId);
    if (!item) return;

    const norm = this.normalizeTitle(newAlias);
    if (!norm) return;

    if (!item.aliases) item.aliases = [];
    if (!item.aliases.includes(newAlias.trim())) {
      item.aliases.push(newAlias.trim());
      this.aliasIndex.set(norm, canonicalId);
      this.save();
    }
  }

  // Comprueba si una obra está FINALIZADA y no debería mostrarse como "nuevo lanzamiento"
  // Lógica:
  //   - Si la BD dice FINALIZADO → siempre filtrar. Una resubida del cap 50 de una serie que acabó en cap 200 sigue siendo una resubida antigua.
  //   - Si la BD dice EN_EMISION → nunca filtrar aunque tenga muchos capítulos.
  //   - Si no está en la BD → no filtrar (beneficio de la duda).
  isCompletedSeries(rawTitle = '', parsedChapterNum = 0, imageUrl = '', pageUrl = '') {
    const identified = this.identifyManga(rawTitle, imageUrl, pageUrl);

    if (identified && identified.status === 'FINALIZADO') {
      console.log(`[MangaIdentifier] FILTRADO (finalizado): "${rawTitle}" → "${identified.canonicalTitle}" (${identified.totalChapters} caps, ${identified.endedYear})`);
      return {
        isCompleted: true,
        canonicalTitle: identified.canonicalTitle,
        totalChapters: identified.totalChapters,
        endedYear: identified.endedYear
      };
    }

    return { isCompleted: false };
  }

  // Devuelve la clave canónica de desempate
  getCanonicalDeduplicationKey(rawTitle = '', imageUrl = '', pageUrl = '') {
    const identified = this.identifyManga(rawTitle, imageUrl, pageUrl);
    if (identified) {
      return `canon_${identified.id}`;
    }
    return `norm_${this.normalizeTitle(rawTitle).replace(/\s+/g, '')}`;
  }
}

export const mangaIdentifier = new MangaIdentifierService();
