package eu.kanade.tachiyomi.ui.yomori.data

import eu.kanade.tachiyomi.source.CatalogueSource
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import tachiyomi.domain.source.service.SourceManager
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

data class WeeklyTopManga(
    val id: String,
    val title: String,
    val originalTitle: String,
    val synopsis: String,
    val coverUrl: String,
    val rating: String,
    val scanSource: String,
    val latestChapter: String,
    val genres: List<String>,
    val sourceId: Long = 0L,
    val mangaUrl: String = "",
)

data class NewReleaseManga(
    val id: String,
    val title: String,
    val chapter: String,
    val time: String,
    val type: String, // "Manga", "Manhwa", "Manhua"
    val scan: String,
    val coverUrl: String,
    val sourceId: Long = 0L,
    val mangaUrl: String = "",
    val category: String = "MANHWA", // "MANGA", "MANHWA", "MANHUA"
    val uploadTimestamp: Long = 0L,
)

data class LiveChatMessage(
    val id: String,
    val user: String,
    val avatarInitial: String,
    val badge: String,
    val badgeColor: Long,
    val time: String,
    val manga: String = "",
    val text: String,
    val imageUrl: String? = null,
    val reactions: Map<String, List<String>> = emptyMap(),
    var likes: Int = 0,
    var isLiked: Boolean = false,
    val replyToUser: String? = null,
    val replyToText: String? = null,
    val avatarUrl: String? = null
)

object BuiltInScansRepository {

    private val scope = CoroutineScope(Dispatchers.IO)

    // 1. Top Semanales Oficiales canónicos de respaldo
    val defaultWeeklyTop = listOf(
        WeeklyTopManga(
            id = "top-1",
            title = "Subiendo De Nivel 10.000 Años En el Futuro",
            originalTitle = "Logging 10,000 Years into the Future",
            synopsis = "Al comienzo de la era de las artes marciales, monstruos aterradores invadieron la tierra. Un joven viaja en sueños 10.000 años al futuro para aprender técnicas divinas.",
            coverUrl = "https://rncalation.online/uploads/covers/subiendo-de-nivel-10000-anos-en-el-futuro/1780562389357-158da0ad-163d-4984-8e2d-7b1458040bc2.png",
            rating = "9.9",
            scanSource = "RN Scanlation",
            latestChapter = "Capítulo 248",
            genres = listOf("Acción", "Fantasía", "Futuro"),
            sourceId = 68580195094275L,
            mangaUrl = "/comics/subiendo-de-nivel-10000-anos-en-el-futuro"
        ),
        WeeklyTopManga(
            id = "top-2",
            title = "La venganza del sabueso de sangre de hierro",
            originalTitle = "Revenge of the Iron-Blooded Sword Hound",
            synopsis = "Vikir fue el fiel perro de caza de los Baskerville, pero fue ejecutado con falsedad. Al reencarnar conservando sus recuerdos, desata su implacable venganza.",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/743/sabueso-venganza-lg.webp",
            rating = "9.9",
            scanSource = "Olympus Scanlation",
            latestChapter = "Capítulo 115",
            genres = listOf("Acción", "Venganza", "Reencarnación"),
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-la-venganza-del-sabueso-de-sangre-de-hierro"
        ),
        WeeklyTopManga(
            id = "top-3",
            title = "Academia de la Ascensión",
            originalTitle = "Ascension Academy",
            synopsis = "En un mundo donde los elegidos entrenan en academias dimensionales para despertar sus dones, un joven supera todas las adversidades para ser el guerrero supremo.",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/11/tmpedu9scno-lg.webp",
            rating = "9.9",
            scanSource = "Olympus Scanlation",
            latestChapter = "Capítulo 201",
            genres = listOf("Cultivo", "Artes Marciales", "Aventura"),
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-academia-de-la-ascension"
        ),
        WeeklyTopManga(
            id = "top-4",
            title = "Contra los dioses",
            originalTitle = "Against the Gods",
            synopsis = "Un joven poseedor de la Perla de Veneno Celestial renace para cultivar la fuerza suprema, desafiar a los clanes sagrados y dominar el firmamento.",
            coverUrl = "https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp",
            rating = "9.8",
            scanSource = "SkyMangas",
            latestChapter = "Capítulo 158",
            genres = listOf("Cultivo", "Magia", "Fantasía"),
            sourceId = 468855040642010L,
            mangaUrl = "/manga/contra-los-dioses"
        ),
        WeeklyTopManga(
            id = "top-5",
            title = "El hijo menor del maestro de la espada",
            originalTitle = "Swordmaster's Youngest Son",
            synopsis = "Jin Runcandel fue repudiado por su clan, pero recibe una segunda oportunidad otorgada por el dios de las sombras para dominar espada y magia.",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/86/tmpizpqgl2f-lg.webp",
            rating = "9.9",
            scanSource = "Olympus Scanlation",
            latestChapter = "Capítulo 142",
            genres = listOf("Acción", "Magia", "Espadas"),
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-el-hijo-menor-del-maestro-de-la-espada"
        ),
        WeeklyTopManga(
            id = "top-6",
            title = "Loco Frontera",
            originalTitle = "Crazy Leveling Border",
            synopsis = "En una frontera desolada donde bestias feroces acechan a la humanidad, un guerrero implacable forja su camino con sangre y voluntad inquebrantable.",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/463/tmpncgwpvr3-lg.webp",
            rating = "9.8",
            scanSource = "Olympus Scanlation",
            latestChapter = "Capítulo 98",
            genres = listOf("Acción", "Supervivencia", "Webtoon"),
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-loco-frontera"
        )
    )

    // 2. Nuevos Lanzamientos canónicos de respaldo
    val defaultNewReleases = listOf(
        NewReleaseManga(
            id = "rel-1",
            title = "La venganza del sabueso de sangre de hierro",
            chapter = "Capítulo 115",
            time = "Hace 5 min",
            type = "Manhwa",
            scan = "Olympus Scanlation",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/743/sabueso-venganza-lg.webp",
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-la-venganza-del-sabueso-de-sangre-de-hierro",
            category = "MANHWA"
        ),
        NewReleaseManga(
            id = "rel-2",
            title = "Subiendo De Nivel 10.000 Años En el Futuro",
            chapter = "Capítulo 248",
            time = "Hace 12 min",
            type = "Manhua",
            scan = "RN Scanlation",
            coverUrl = "https://rncalation.online/uploads/covers/subiendo-de-nivel-10000-anos-en-el-futuro/1780562389357-158da0ad-163d-4984-8e2d-7b1458040bc2.png",
            sourceId = 68580195094275L,
            mangaUrl = "/comics/subiendo-de-nivel-10000-anos-en-el-futuro",
            category = "MANHUA"
        ),
        NewReleaseManga(
            id = "rel-3",
            title = "Academia de la Ascensión",
            chapter = "Capítulo 201",
            time = "Hace 25 min",
            type = "Manhwa",
            scan = "Olympus Scanlation",
            coverUrl = "https://media.imagesolymp.xyz/comics/covers/11/tmpedu9scno-lg.webp",
            sourceId = 326031604400560L,
            mangaUrl = "/series/comic-academia-de-la-ascension",
            category = "MANHWA"
        ),
        NewReleaseManga(
            id = "rel-4",
            title = "Gokurakugai",
            chapter = "Capítulo 37",
            time = "Hace 40 min",
            type = "Manga",
            scan = "Plot Twist No Fansub",
            coverUrl = "https://uploads.mangadex.org/covers/40c058a2-430e-4ced-b663-369dcf38583f/2824eeb9-042d-4c1c-bb1f-584d1c5a047a.jpg.512.jpg",
            sourceId = 796106230356576L,
            mangaUrl = "/manga/gokurakugai",
            category = "MANGA"
        ),
        NewReleaseManga(
            id = "rel-5",
            title = "Contra los dioses",
            chapter = "Capítulo 158",
            time = "Hace 1 hora",
            type = "Manhua",
            scan = "SkyMangas",
            coverUrl = "https://api.skymangas.com/uploads/covers/contra-los-dioses/contra-los-dioses_cover.webp",
            sourceId = 468855040642010L,
            mangaUrl = "/manga/contra-los-dioses",
            category = "MANHUA"
        ),
        NewReleaseManga(
            id = "rel-6",
            title = "«El Héroe» – Dirigido por: El Rey Demonio",
            chapter = "Capítulo 6",
            time = "Hace 2 horas",
            type = "Manhwa",
            scan = "ManhwaLatino",
            coverUrl = "https://media.manhwaweb.xyz/wp-content/uploads/2026/08/1786338745-8945-i515977.jpg",
            sourceId = 278736110177809L,
            mangaUrl = "/manga/el-heroe-dirigido-por-el-rey-demonio/",
            category = "MANHWA"
        )
    )

    private val _heroBannerManga = MutableStateFlow<WeeklyTopManga>(defaultWeeklyTop.first())
    val heroBannerManga = _heroBannerManga.asStateFlow()

    private val _heroBannersList = MutableStateFlow<List<WeeklyTopManga>>(defaultWeeklyTop)
    val heroBannersList = _heroBannersList.asStateFlow()

    private val _weeklyTopList = MutableStateFlow(defaultWeeklyTop)
    val weeklyTopList = _weeklyTopList.asStateFlow()

    private val _newReleases = MutableStateFlow(defaultNewReleases)
    val newReleases = _newReleases.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    private var lastRefreshTime = 0L
    private const val TWO_HOURS_MS = 2 * 60 * 60 * 1000L

    init {
        refresh()
        // Auto-actualización periódica en segundo plano cada 2 horas
        scope.launch {
            while (true) {
                kotlinx.coroutines.delay(TWO_HOURS_MS)
                refresh()
            }
        }
    }

    fun isNsfwOrHentai(
        sourceName: String,
        mangaTitle: String = "",
        genres: List<String> = emptyList(),
        description: String = ""
    ): Boolean {
        val nsfwKeywords = listOf(
            "hentai", "tmohentai", "tmo hentai", "nhentai", "hitomi", "luscious", "pururin",
            "asmhentai", "eromanga", "doujin", "fakku", "tsumino", "allporncomic", "hentai2read",
            "hentaihere", "multporn", "8muses", "simplyhentai", "hentaifox", "milftoon",
            "lewd", "porn", "xxx", "yaoi", "yuri", "nsfw", "+18", "18+", "erotica", "smut", "adulto"
        )
        val lowerSource = sourceName.lowercase()
        val lowerTitle = mangaTitle.lowercase()
        val lowerDesc = description.lowercase()
        val lowerGenres = genres.map { it.lowercase() }

        if (nsfwKeywords.any { lowerSource.contains(it) }) return true
        if (nsfwKeywords.any { lowerTitle.contains(it) }) return true
        if (lowerGenres.any { g -> nsfwKeywords.any { g.contains(it) } }) return true
        if (lowerDesc.contains("hentai") || lowerDesc.contains("doujinshi") || lowerDesc.contains("porn")) return true

        return false
    }

    private fun isSourceNsfw(source: CatalogueSource): Boolean {
        if (isNsfwOrHentai(source.name)) return true
        try {
            val extensionManager = Injekt.get<eu.kanade.tachiyomi.extension.ExtensionManager>()
            val installed = extensionManager.installedExtensionsFlow.value
            val match = installed.find { ext -> ext.sources.any { it.id == source.id } }
            if (match?.isNsfw == true) return true
        } catch (e: Throwable) {}
        return false
    }

    fun refresh() {
        scope.launch {
            try {
                _isRefreshing.value = true
                val sourceManager = Injekt.get<SourceManager>()
                val sources = sourceManager.getOnlineSources()
                    .filterIsInstance<CatalogueSource>()
                    .filterNot { isSourceNsfw(it) }
                if (sources.isEmpty()) {
                    _isRefreshing.value = false
                    return@launch
                }

                // 1. Fetch latest updates from all clean installed sources in parallel
                val latestDeferred = sources.map { src ->
                    async {
                        try {
                            withTimeoutOrNull(9000L) {
                                val page = src.getLatestUpdates(1)
                                src to page.mangas
                            }
                        } catch (e: Throwable) {
                            null
                        }
                    }
                }

                // 2. Fetch popular manga from all clean installed sources in parallel
                val popularDeferred = sources.map { src ->
                    async {
                        try {
                            withTimeoutOrNull(9000L) {
                                val page = src.getPopularManga(1)
                                src to page.mangas
                            }
                        } catch (e: Throwable) {
                            null
                        }
                    }
                }

                val latestResults = latestDeferred.awaitAll().filterNotNull()
                val popularResults = popularDeferred.awaitAll().filterNotNull()

                // Aggregate New Releases across all installed sources
                val aggregatedReleases = mutableListOf<NewReleaseManga>()
                val seenTitles = mutableSetOf<String>()

                // Collect candidate mangas first
                data class CandidateManga(val source: CatalogueSource, val manga: SManga, val index: Int)
                val candidates = mutableListOf<CandidateManga>()

                val maxLatest = latestResults.maxOfOrNull { it.second.size } ?: 0
                for (i in 0 until maxLatest) {
                    for ((source, mangas) in latestResults) {
                        if (i < mangas.size) {
                            val manga = mangas[i]
                            if (isNsfwOrHentai(source.name, manga.title, manga.genre?.split(",") ?: emptyList(), manga.description ?: "")) {
                                continue
                            }
                            val clean = normalizeTitle(manga.title)
                            if (clean.length > 1 && seenTitles.add(clean)) {
                                candidates.add(CandidateManga(source, manga, i))
                            }
                        }
                    }
                }

                // For top candidate mangas, resolve real latest chapter and upload timestamp concurrently
                val now = System.currentTimeMillis()
                val resolvedDeferred = candidates.take(32).map { cand ->
                    async {
                        val (source, manga, idx) = cand
                        val originType = detectTypeAndCategory(manga, source)

                        var capText = extractChapterInfo(manga)
                        var timeStamp = extractTimestampInfo(manga)

                        if (timeStamp <= 0L || capText.isBlank()) {
                            try {
                                val update = withTimeoutOrNull(3000L) {
                                    source.getMangaUpdate(manga, emptyList(), fetchDetails = false, fetchChapters = true)
                                }
                                val firstChapter = update?.chapters?.firstOrNull()
                                if (firstChapter != null) {
                                    if (!firstChapter.name.isNullOrBlank()) {
                                        capText = formatChapterTitle(firstChapter.name)
                                    }
                                    if (firstChapter.date_upload > 0L) {
                                        timeStamp = firstChapter.date_upload
                                    }
                                }
                            } catch (_: Throwable) {}
                        }

                        if (capText.isBlank()) {
                            capText = "Nuevo"
                        }

                        if (timeStamp <= 0L) {
                            val minsAgo = (idx * 15 + 5).coerceAtLeast(3)
                            timeStamp = now - (minsAgo * 60 * 1000L)
                        }

                        val timeText = formatRelativeTime(timeStamp)

                        NewReleaseManga(
                            id = "dyn-rel-${source.id}-${manga.url.hashCode()}",
                            title = cleanDisplayTitle(manga.title),
                            chapter = capText,
                            time = timeText,
                            type = originType.first,
                            scan = source.name,
                            coverUrl = manga.thumbnail_url ?: "",
                            sourceId = source.id,
                            mangaUrl = manga.url,
                            category = originType.second,
                            uploadTimestamp = timeStamp,
                        )
                    }
                }

                val allResolved = resolvedDeferred.awaitAll()
                // Strictly sort from newest to oldest
                val sortedList = allResolved.sortedByDescending { it.uploadTimestamp }
                // Limit to 24 hours if available
                val oneDayAgo = now - (24 * 60 * 60 * 1000L)
                val recentOnly = sortedList.filter { it.uploadTimestamp >= oneDayAgo }
                val finalList = if (recentOnly.size >= 8) recentOnly else sortedList.take(24)

                if (finalList.isNotEmpty()) {
                    _newReleases.value = finalList
                }

                // 1. Fetch Daily Top Hero for the Main Banner
                val dailyHero = YomoriSupabaseService.fetchDailyTopHero()
                if (dailyHero != null) {
                    _heroBannerManga.value = dailyHero
                }

                // 2. Fetch Weekly Top from Supabase Cloud Database (Real user statistics)
                val cloudTop = YomoriSupabaseService.fetchWeeklyTop()
                if (cloudTop.isNotEmpty()) {
                    _weeklyTopList.value = cloudTop
                    if (dailyHero == null) {
                        _heroBannerManga.value = cloudTop.first()
                    }
                } else {
                    // Fallback to aggregated Populars if cloud is unreachable
                    val aggregatedTop = mutableListOf<WeeklyTopManga>()
                    val topSeen = mutableSetOf<String>()
                    var topIndex = 1

                    for (i in 0 until 12) {
                        for ((source, mangas) in popularResults) {
                            if (i < mangas.size) {
                                val manga = mangas[i]
                                if (isNsfwOrHentai(source.name, manga.title, manga.genre?.split(",") ?: emptyList(), manga.description ?: "")) {
                                    continue
                                }
                                val clean = normalizeTitle(manga.title)
                                if (clean.length > 1 && topSeen.add(clean)) {
                                    val ratingVal = String.format(java.util.Locale.US, "%.1f", (9.9 - (topIndex * 0.04)).coerceAtLeast(9.1))
                                    val rawDesc = manga.description ?: ""
                                    val cleanDesc = if (rawDesc.startsWith("Capítulo", true) || rawDesc.isBlank()) {
                                        "Explora esta emocionante obra disponible en ${source.name}."
                                    } else {
                                        rawDesc
                                    }

                                    aggregatedTop.add(
                                        WeeklyTopManga(
                                            id = "dyn-top-${source.id}-${manga.url.hashCode()}",
                                            title = cleanDisplayTitle(manga.title),
                                            originalTitle = cleanDisplayTitle(manga.title),
                                            synopsis = cleanDesc,
                                            coverUrl = manga.thumbnail_url ?: "",
                                            rating = ratingVal,
                                            scanSource = source.name,
                                            latestChapter = "Capítulo ${80 + (topIndex * 15)}",
                                            genres = manga.genre?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() && !it.startsWith("Cap", true) } ?: listOf("Acción", "Fantasía"),
                                            sourceId = source.id,
                                            mangaUrl = manga.url,
                                        )
                                    )
                                    topIndex++
                                }
                            }
                        }
                    }

                    if (aggregatedTop.isNotEmpty()) {
                        _weeklyTopList.value = aggregatedTop
                        if (dailyHero == null) {
                            _heroBannerManga.value = aggregatedTop.first()
                        }
                    }
                }

                // Update Hero Banners List (Multi-manga auto-sliding banner)
                val banners = mutableListOf<WeeklyTopManga>()
                if (dailyHero != null) {
                    banners.add(dailyHero)
                }
                val remainingTop = _weeklyTopList.value.filter { it.title != dailyHero?.title }
                banners.addAll(remainingTop.take(5))
                if (banners.isNotEmpty()) {
                    _heroBannersList.value = banners
                }

                lastRefreshTime = System.currentTimeMillis()

            } catch (_: Throwable) {
                // Keep existing list safely
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    suspend fun resolveMangaSourceAndUrl(
        sourceId: Long,
        scanName: String,
        title: String,
        currentUrl: String,
    ): Pair<CatalogueSource, String>? {
        return try {
            val sourceManager = Injekt.get<SourceManager>()
            val onlineSources = sourceManager.getOnlineSources().filterIsInstance<CatalogueSource>()
            if (onlineSources.isEmpty()) return null

            // Helper to normalize strings for comparison
            fun clean(s: String) = s.lowercase()
                .replace(" ", "")
                .replace("-", "")
                .replace("(es)", "")
                .replace("(en)", "")
                .replace("scanlation", "")
                .replace("fansub", "")
                .replace("scan", "")
                .trim()

            val cleanScan = clean(scanName)
            val cleanTitle = title.trim()

            // 1. If direct valid CatalogueSource exists by ID and has real URL
            val direct = sourceManager.get(sourceId) as? CatalogueSource
            if (direct != null && currentUrl.isNotBlank() && currentUrl.startsWith("/")) {
                return direct to currentUrl
            }

            // 2. Find matching source by scan name among installed sources
            val matchedByName = onlineSources.firstOrNull { src ->
                val sName = clean(src.name)
                cleanScan.isNotBlank() && (sName.contains(cleanScan) || cleanScan.contains(sName))
            }

            // 3. Search candidate sources for the manga title
            val candidateSources = if (matchedByName != null) {
                listOf(matchedByName) + onlineSources.filter { it.id != matchedByName.id }
            } else {
                onlineSources
            }

            for (src in candidateSources) {
                try {
                    val searchRes = withTimeoutOrNull(4000L) {
                        src.getSearchManga(1, cleanTitle, eu.kanade.tachiyomi.source.model.FilterList())
                    }
                    val match = searchRes?.mangas?.firstOrNull { sm ->
                        val smTitle = sm.title.trim().lowercase()
                        val qTitle = cleanTitle.lowercase()
                        smTitle == qTitle || smTitle.contains(qTitle) || qTitle.contains(smTitle)
                    }
                    if (match != null && match.url.isNotBlank()) {
                        return src to match.url
                    }
                } catch (_: Throwable) {}
            }

            // 4. If matched by scan name and currentUrl exists
            if (matchedByName != null && currentUrl.isNotBlank()) {
                return matchedByName to currentUrl
            }

            // 5. If direct source existed
            if (direct != null) {
                return direct to currentUrl
            }

            // 6. Fallback to first online source
            onlineSources.firstOrNull()?.let { it to currentUrl }
        } catch (_: Throwable) {
            null
        }
    }

    private fun normalizeTitle(title: String): String {
        return title.lowercase()
            .replace(Regex("""[^\p{L}\p{N}]+"""), " ")
            .trim()
    }

    private fun cleanDisplayTitle(title: String): String {
        return title
            .replace(Regex("""<!--.*?-->"""), "")
            .replace(Regex("""\s+Cap(?:ítulo|itulo|\.)\s*\d+.*$""", RegexOption.IGNORE_CASE), "")
            .trim()
    }

    private fun detectTypeAndCategory(manga: SManga, source: CatalogueSource): Pair<String, String> {
        val url = manga.url.lowercase()
        val sName = source.name.lowercase()
        val genreText = (manga.genre ?: "").lowercase()
        val title = manga.title.lowercase()
        val fullInfo = "$url $sName $genreText $title"

        return when {
            // Explicit Manhua cues
            url.contains("/manhua/") || fullInfo.contains("manhua") || sName.contains("skymangas") ||
            fullInfo.contains("cultivo") || fullInfo.contains("artes marciales") || fullInfo.contains("firmamento") || fullInfo.contains("dioses") -> {
                Pair("Manhua", "MANHUA")
            }

            // Explicit Manga cues
            url.contains("/manga/") && (fullInfo.contains("japan") || fullInfo.contains("japon") || sName.contains("plot twist") || sName.contains("mangadex")) ||
            fullInfo.contains("manga") && !fullInfo.contains("manhwa") && !fullInfo.contains("manhua") -> {
                Pair("Manga", "MANGA")
            }

            // Explicit Manhwa cues (Korean webtoons)
            fullInfo.contains("manhwa") || sName.contains("manhwa") || sName.contains("olympus") || sName.contains("rn") ||
            fullInfo.contains("reencarn") || fullInfo.contains("venganza") || fullInfo.contains("cazador") ||
            fullInfo.contains("sistema") || fullInfo.contains("torre") || fullInfo.contains("duque") ||
            fullInfo.contains("sabueso") || fullInfo.contains("lord") || fullInfo.contains("villana") -> {
                Pair("Manhwa", "MANHWA")
            }

            else -> Pair("Manhwa", "MANHWA")
        }
    }

    private fun extractChapterInfo(manga: SManga): String {
        val candidates = listOf(manga.description ?: "", manga.genre ?: "", manga.author ?: "", manga.title)
        for (text in candidates) {
            val cleanText = text.substringBefore("||")
            val match = Regex("""(?:Capítulo|Capitulo|Cap\.?|Ch\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(cleanText)
            if (match != null) {
                val num = match.groupValues[1]
                return "Capítulo $num"
            }
        }
        return ""
    }

    private fun extractTimestampInfo(manga: SManga): Long {
        val candidates = listOf(manga.description ?: "", manga.genre ?: "", manga.title)
        for (desc in candidates) {
            if (desc.contains("||")) {
                val tsStr = desc.substringAfter("||").trim()
                val parsed = tsStr.toLongOrNull()
                if (parsed != null && parsed > 0L) return parsed
            }
            val relativeMatch = Regex("""(?:hace\s+)?(\d+)\s*(s|seg|min|m|h|hora|horas|d|dia|días|dias)""", RegexOption.IGNORE_CASE).find(desc)
            if (relativeMatch != null) {
                val amount = relativeMatch.groupValues[1].toLongOrNull() ?: 0L
                val unit = relativeMatch.groupValues[2].lowercase()
                val now = System.currentTimeMillis()
                val calc = when {
                    unit.startsWith("s") -> now - (amount * 1000L)
                    unit.startsWith("m") -> now - (amount * 60 * 1000L)
                    unit.startsWith("h") -> now - (amount * 60 * 60 * 1000L)
                    unit.startsWith("d") -> now - (amount * 24 * 60 * 60 * 1000L)
                    else -> 0L
                }
                if (calc > 0L) return calc
            }
        }
        return 0L
    }

    private fun formatChapterTitle(chapterName: String): String {
        val match = Regex("""(?:Capítulo|Capitulo|Cap\.?|Ch\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(chapterName)
            ?: Regex("""(\d+(?:\.\d+)?)""").find(chapterName)
        return if (match != null) {
            val num = match.groupValues[1]
            "Capítulo $num"
        } else {
            chapterName.trim().take(18)
        }
    }

    private fun formatRelativeTime(dateUpload: Long): String {
        if (dateUpload <= 0L) return "Reciente"
        val now = System.currentTimeMillis()
        val diffMs = (now - dateUpload).coerceAtLeast(0L)
        val diffSec = diffMs / 1000.0
        val diffMin = diffSec / 60.0
        val diffHours = diffSec / 3600.0
        val diffDays = diffSec / 86400.0
        val diffWeeks = diffDays / 7.0

        return when {
            diffSec < 60.0 -> "Hace un momento"
            diffMin < 50.0 -> {
                val mins = kotlin.math.round(diffMin).toInt().coerceAtLeast(1)
                "Hace $mins min"
            }
            diffHours < 1.5 -> "Hace 1 hora"
            diffHours < 23.5 -> {
                val hours = kotlin.math.round(diffHours).toInt()
                if (hours <= 1) "Hace 1 hora" else "Hace $hours horas"
            }
            diffDays < 1.5 -> "Hace 1 día"
            diffDays < 7.0 -> {
                val days = kotlin.math.round(diffDays).toInt()
                if (days <= 1) "Hace 1 día" else "Hace $days días"
            }
            diffWeeks < 1.5 -> "Hace 1 semana"
            else -> {
                val weeks = kotlin.math.round(diffWeeks).toInt()
                if (weeks <= 1) "Hace 1 semana" else "Hace $weeks semanas"
            }
        }
    }

    // 3. Comentarios del Chat en Vivo (Exacto como en la app de PC)
    val initialChatMessages = listOf(
        LiveChatMessage(
            id = "chat-1",
            user = "KuroReader",
            avatarInitial = "K",
            badge = "Lector VIP",
            badgeColor = 0xFF7C3AED,
            time = "Hace 2 min",
            manga = "El Lord que sube de nivel",
            text = "¡El capítulo 112 estuvo brutal! El dibujo en la pelea contra el dragón carmesí subió de nivel totalmente 🔥🔥",
            reactions = mapOf("🔥" to listOf("u1", "u2", "u3"), "❤️" to listOf("u4")),
            likes = 24
        ),
        LiveChatMessage(
            id = "chat-2",
            user = "ManhwaLover99",
            avatarInitial = "M",
            badge = "Crítico",
            badgeColor = 0xFF3B82F6,
            time = "Hace 6 min",
            manga = "El Método de Inversión",
            text = "No me esperaba la jugada que hizo con las acciones de la farmacéutica, se nota que el autor sabe de economía real.",
            reactions = mapOf("👏" to listOf("u1"), "😮" to listOf("u5")),
            likes = 15
        ),
        LiveChatMessage(
            id = "chat-3",
            user = "Sora_Cultivador",
            avatarInitial = "S",
            badge = "Top Fan",
            badgeColor = 0xFFF59E0B,
            time = "Hace 11 min",
            manga = "El Indomable Rey Marcial",
            text = "Olympus sacó el capítulo super rápido hoy, gracias a los traductores por la calidad 👏",
            reactions = mapOf("✨" to listOf("u2"), "🎉" to listOf("u3")),
            likes = 31
        ),
        LiveChatMessage(
            id = "chat-4",
            user = "Shadow_Reader",
            avatarInitial = "R",
            badge = "Cazador",
            badgeColor = 0xFF3DD6D0,
            time = "Hace 15 min",
            manga = "Solo Máximo Nivel",
            text = "Recomienden manhwas parecidos a este, me quedé sin nada para leer hoy",
            reactions = mapOf("👀" to listOf("u6")),
            likes = 8
        )
    )
}
