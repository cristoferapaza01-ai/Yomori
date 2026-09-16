package eu.kanade.tachiyomi.ui.yomori.data

import android.content.Context
import eu.kanade.tachiyomi.data.backup.create.BackupOptions
import eu.kanade.tachiyomi.data.backup.create.creators.CategoriesBackupCreator
import eu.kanade.tachiyomi.data.backup.create.creators.MangaBackupCreator
import eu.kanade.tachiyomi.data.backup.models.BackupCategory
import eu.kanade.tachiyomi.data.backup.models.BackupChapter
import eu.kanade.tachiyomi.data.backup.models.BackupManga
import eu.kanade.tachiyomi.data.backup.restore.restorers.CategoriesRestorer
import eu.kanade.tachiyomi.data.backup.restore.restorers.MangaRestorer
import eu.kanade.tachiyomi.data.download.DownloadCache
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.withContext
import logcat.LogPriority
import org.json.JSONArray
import org.json.JSONObject
import tachiyomi.core.common.util.system.logcat
import tachiyomi.domain.category.interactor.GetCategories
import tachiyomi.domain.category.model.Category
import tachiyomi.domain.manga.interactor.GetFavorites
import tachiyomi.domain.manga.interactor.GetLibraryManga
import tachiyomi.domain.manga.model.Manga
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

object YomoriSyncManager {

    private val scope = CoroutineScope(Dispatchers.IO)
    private var syncJob: Job? = null
    private var isAutoSyncStarted = false

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing = _isSyncing.asStateFlow()

    private val _lastSyncTime = MutableStateFlow<Long>(0L)
    val lastSyncTime = _lastSyncTime.asStateFlow()

    private val getFavorites by lazy { Injekt.get<GetFavorites>() }
    private val getCategories by lazy { Injekt.get<GetCategories>() }
    private val categoriesBackupCreator by lazy { CategoriesBackupCreator() }
    private val mangaBackupCreator by lazy { MangaBackupCreator() }
    private val categoriesRestorer by lazy { CategoriesRestorer() }
    private val mangaRestorer by lazy { MangaRestorer() }

    init {
        initAutoSync()
    }

    /**
     * Inicia observadores automáticos de biblioteca y ciclo periódico de sincronización.
     */
    fun initAutoSync() {
        if (isAutoSyncStarted) return
        isAutoSyncStarted = true

        // 1. Observar cambios en la biblioteca (manga agregado, borrado, progreso)
        scope.launch {
            try {
                Injekt.get<GetLibraryManga>().subscribe()
                    .drop(1) // Omitir la emisión inicial
                    .collect {
                        val currentUser = UserManager.userState.value
                        if (currentUser.isLoggedIn && currentUser.username.isNotBlank()) {
                            logcat(LogPriority.INFO) { "YomoriSync: Detectado cambio en biblioteca local, programando auto-sync..." }
                            scheduleSyncPush(8000L) // 8 segundos de debounce
                        }
                    }
            } catch (e: Exception) {
                logcat(LogPriority.ERROR, e) { "YomoriSync: Error escuchando cambios de biblioteca" }
            }
        }

        // 2. Ciclo periódico cada 5 minutos en primer plano / app abierta
        scope.launch {
            while (true) {
                delay(5 * 60 * 1000L) // Cada 5 minutos
                val currentUser = UserManager.userState.value
                if (currentUser.isLoggedIn && currentUser.username.isNotBlank()) {
                    logcat(LogPriority.INFO) { "YomoriSync: Sincronización automática periódica cada 5 min" }
                    pushLibraryToCloud()
                }
            }
        }
    }

    /**
     * Sincroniza hacia la nube de Supabase (Push) con debounce para evitar llamadas excesivas.
     */
    fun scheduleSyncPush(delayMs: Long = 5000L) {
        val currentUser = UserManager.userState.value
        if (!currentUser.isLoggedIn || currentUser.username.isBlank()) return

        syncJob?.cancel()
        syncJob = scope.launch {
            delay(delayMs)
            pushLibraryToCloud()
        }
    }

    /**
     * Sube toda la biblioteca, categorías y progreso de lectura en un JSON ultracompacto a Supabase.
     */
    suspend fun pushLibraryToCloud(): Boolean = withContext(Dispatchers.IO) {
        val currentUser = UserManager.userState.value
        if (!currentUser.isLoggedIn || currentUser.username.isBlank()) return@withContext false

        try {
            _isSyncing.value = true

            val categories = categoriesBackupCreator()
            val favorites = getFavorites.await()
            val backupMangas = mangaBackupCreator(
                favorites,
                BackupOptions(
                    libraryEntries = true,
                    categories = true,
                    chapters = true,
                    tracking = true,
                    history = true,
                ),
            )

            // Construir payload JSON ultracompacto
            val rootJson = JSONObject()
            rootJson.put("v", 1)

            // 1. Categorías
            val catArray = JSONArray()
            for (cat in categories) {
                val cObj = JSONObject().apply {
                    put("id", cat.id)
                    put("n", cat.name)
                    put("o", cat.order)
                    put("f", cat.flags)
                }
                catArray.put(cObj)
            }
            rootJson.put("cats", catArray)

            // 2. Mangas y progreso de lectura
            val mangaArray = JSONArray()
            for (bm in backupMangas) {
                val mObj = JSONObject().apply {
                    put("s", bm.source)
                    put("u", bm.url)
                    put("t", bm.title)
                    if (!bm.thumbnailUrl.isNullOrEmpty()) put("c", bm.thumbnailUrl)
                    if (!bm.author.isNullOrEmpty()) put("a", bm.author)
                    if (!bm.artist.isNullOrEmpty()) put("art", bm.artist)
                    if (!bm.description.isNullOrEmpty()) put("d", bm.description)
                    if (bm.genre.isNotEmpty()) put("g", JSONArray(bm.genre))
                    put("st", bm.status)
                    put("fav", bm.favorite)
                    if (bm.categories.isNotEmpty()) put("cat", JSONArray(bm.categories))

                    // Solo guardamos capítulos con progreso de lectura para ahorrar 90% de espacio
                    val chArray = JSONArray()
                    for (ch in bm.chapters) {
                        if (ch.read || ch.lastPageRead > 0 || ch.bookmark) {
                            val chObj = JSONObject().apply {
                                put("u", ch.url)
                                put("n", ch.name)
                                put("cn", ch.chapterNumber)
                                if (ch.read) put("r", true)
                                if (ch.lastPageRead > 0) put("lp", ch.lastPageRead)
                                if (ch.bookmark) put("bm", true)
                            }
                            chArray.put(chObj)
                        }
                    }
                    if (chArray.length() > 0) put("ch", chArray)
                }
                mangaArray.put(mObj)
            }
            rootJson.put("mangas", mangaArray)

            // Construir payload del Perfil & Rangos
            val settingsJson = JSONObject().apply {
                put("nickname", currentUser.nickname)
                put("username", currentUser.username)
                put("avatar_url", currentUser.avatarUrl)
                put("bio", currentUser.bio)
                put("level", currentUser.level)
                put("current_xp", currentUser.currentXp)
                put("next_level_xp", currentUser.nextLevelXp)
                put("rank_title", currentUser.rankTitle)
                put("rank_tier", currentUser.rankTier)
                put("rank_color", currentUser.rankColor)
                put("chapters_read", currentUser.chaptersRead)
                put("mangas_completed", currentUser.mangasCompleted)
                put("streak_days", currentUser.streakDays)
                put("is_admin", currentUser.isAdmin)
                val qArr = JSONArray()
                currentUser.claimedQuests.forEach { qArr.put(it) }
                put("claimed_quests", qArr)
            }

            val success = YomoriSupabaseService.pushUserSync(
                userId = currentUser.username.lowercase().trim(),
                libraryJson = rootJson.toString(),
                settingsJson = settingsJson.toString()
            )

            if (success) {
                _lastSyncTime.value = System.currentTimeMillis()
                logcat(LogPriority.INFO) { "YomoriSync: Push exitoso para ${currentUser.username} (${mangaArray.length()} mangas, Rango: [${currentUser.rankTier}] ${currentUser.rankTitle})" }
            }
            success
        } catch (e: Exception) {
            logcat(LogPriority.ERROR, e) { "YomoriSync: Error en pushLibraryToCloud" }
            false
        } finally {
            _isSyncing.value = false
        }
    }

    /**
     * Descarga la biblioteca, categorías, perfil y capítulos leídos desde Supabase e inserta en la base de datos local.
     */
    suspend fun pullLibraryFromCloud(context: Context? = null): Boolean = withContext(Dispatchers.IO) {
        val currentUser = UserManager.userState.value
        if (!currentUser.isLoggedIn || currentUser.username.isBlank()) return@withContext false

        try {
            _isSyncing.value = true

            val cloudData = YomoriSupabaseService.pullUserSync(currentUser.username.lowercase().trim())
                ?: return@withContext false

            // 1. Restaurar Perfil y Rangos si existen en la nube
            if (!cloudData.settingsJson.isNullOrBlank()) {
                UserManager.restoreProfileFromCloud(cloudData.settingsJson)
            }

            val rawData = cloudData.libraryJson ?: return@withContext true
            val rootJson = JSONObject(rawData)
            val catArray = rootJson.optJSONArray("cats")
            val backupCategories = mutableListOf<BackupCategory>()

            if (catArray != null) {
                for (i in 0 until catArray.length()) {
                    val cObj = catArray.getJSONObject(i)
                    backupCategories.add(
                        BackupCategory(
                            id = cObj.optLong("id", 0L),
                            name = cObj.optString("n", ""),
                            order = cObj.optLong("o", 0L),
                            flags = cObj.optLong("f", 0L),
                        ),
                    )
                }
            }

            // Restaurar categorías en base de datos local
            if (backupCategories.isNotEmpty()) {
                categoriesRestorer(backupCategories)
            }

            val mangaArray = rootJson.optJSONArray("mangas")
            if (mangaArray != null) {
                for (i in 0 until mangaArray.length()) {
                    val mObj = mangaArray.getJSONObject(i)
                    val bm = BackupManga(
                        source = mObj.optLong("s", 0L),
                        url = mObj.optString("u", ""),
                        title = mObj.optString("t", ""),
                        thumbnailUrl = if (mObj.has("c")) mObj.optString("c") else null,
                        author = if (mObj.has("a")) mObj.optString("a") else null,
                        artist = if (mObj.has("art")) mObj.optString("art") else null,
                        description = if (mObj.has("d")) mObj.optString("d") else null,
                        status = mObj.optInt("st", 0),
                        favorite = mObj.optBoolean("fav", true),
                    )

                    val gArr = mObj.optJSONArray("g")
                    if (gArr != null) {
                        val gList = mutableListOf<String>()
                        for (g in 0 until gArr.length()) gList.add(gArr.getString(g))
                        bm.genre = gList
                    }

                    val catIds = mObj.optJSONArray("cat")
                    if (catIds != null) {
                        val cList = mutableListOf<Long>()
                        for (c in 0 until catIds.length()) cList.add(catIds.getLong(c))
                        bm.categories = cList
                    }

                    val chArr = mObj.optJSONArray("ch")
                    if (chArr != null) {
                        val chList = mutableListOf<BackupChapter>()
                        for (c in 0 until chArr.length()) {
                            val cObj = chArr.getJSONObject(c)
                            chList.add(
                                BackupChapter(
                                    url = cObj.optString("u", ""),
                                    name = cObj.optString("n", ""),
                                    chapterNumber = cObj.optDouble("cn", 0.0).toFloat(),
                                    read = cObj.optBoolean("r", false),
                                    lastPageRead = cObj.optLong("lp", 0L),
                                    bookmark = cObj.optBoolean("bm", false),
                                ),
                            )
                        }
                        bm.chapters = chList
                    }

                    // Restaurar manga y capítulos en SQLite local
                    mangaRestorer.restore(bm, backupCategories)
                }
            }

            try {
                Injekt.get<DownloadCache>().invalidateCache()
            } catch (_: Exception) {}

            _lastSyncTime.value = System.currentTimeMillis()
            logcat(LogPriority.INFO) { "YomoriSync: Pull exitoso para ${currentUser.username}" }
            true
        } catch (e: Exception) {
            logcat(LogPriority.ERROR, e) { "YomoriSync: Error en pullLibraryFromCloud" }
            false
        } finally {
            _isSyncing.value = false
        }
    }
}
