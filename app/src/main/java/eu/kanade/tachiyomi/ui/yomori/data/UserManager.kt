package eu.kanade.tachiyomi.ui.yomori.data

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get
import java.util.UUID

data class RankInfo(
    val tier: String,
    val title: String,
    val color: Long,
    val minLevel: Int,
    val maxLevel: Int,
    val minXp: Long
)

val RANK_TIERS = listOf(
    RankInfo("F", "Lector Novato", 0xFF9E9E9E, 1, 5, 0L),
    RankInfo("E", "Lector Aprendiz", 0xFF10B981, 6, 15, 500L),
    RankInfo("D", "Lector Aficionado", 0xFF06B6D4, 16, 30, 2500L),
    RankInfo("C", "Lector Entusiasta", 0xFF3B82F6, 31, 50, 7500L),
    RankInfo("B", "Lector Ávido", 0xFF8B5CF6, 51, 80, 20000L),
    RankInfo("A", "Lector Veterano", 0xFFEC4899, 81, 120, 50000L),
    RankInfo("S", "Lector Élite", 0xFFEF4444, 121, 180, 120000L),
    RankInfo("SS", "Gran Maestro Lector", 0xFFF59E0B, 181, 260, 300000L),
    RankInfo("SSS", "Erudito Supremo", 0xFFFFD700, 261, 365, 700000L),
    RankInfo("EX", "Lector Trascendente", 0xFF3DD6D0, 366, 9999, 1500000L)
)

val AVATAR_PRESETS = listOf(
    "https://api.dicebear.com/7.x/bottts/png?seed=cyber_crimson&backgroundColor=ffcdd2,f8bbd0",
    "https://api.dicebear.com/7.x/bottts/png?seed=neon_palomo&backgroundColor=c8e6c9,b2dfdb",
    "https://api.dicebear.com/7.x/bottts/png?seed=mecha_blue&backgroundColor=bbdefb,d1c4e9",
    "https://api.dicebear.com/7.x/bottts/png?seed=heart_bot&eyes=hearts&backgroundColor=f8bbd0,e1bee7",
    "https://api.dicebear.com/7.x/bottts/png?seed=gold_erudite&backgroundColor=fff9c4,ffe0b2",
    "https://api.dicebear.com/7.x/bottts/png?seed=cyber_violet&backgroundColor=d1c4e9,e1bee7",
    "https://api.dicebear.com/7.x/bottts/png?seed=shadow_x&backgroundColor=cfd8dc,b0bec5",
    "https://api.dicebear.com/7.x/bottts/png?seed=cute_titan&backgroundColor=b2ebf2,b2dfdb",
    "https://api.dicebear.com/7.x/bottts/png?seed=robo_king&backgroundColor=ffe0b2,ffccbc",
    "https://api.dicebear.com/7.x/bottts/png?seed=star_droid&backgroundColor=d7ccc8,cfd8dc"
)

data class Quest(
    val id: String,
    val title: String,
    val description: String,
    val xpReward: Int,
    val currentProgress: Int,
    val targetProgress: Int,
    val isCompleted: Boolean,
    val isClaimed: Boolean,
    val type: String
)

data class YomoriUser(
    val id: String = "user_guest",
    val nickname: String = "Lector Novato",
    val username: String = "cazador_anonimo",
    val email: String = "usuario@yomori.app",
    val avatarUrl: String = "https://api.dicebear.com/7.x/bottts/png?seed=mecha_blue&backgroundColor=bbdefb,d1c4e9",
    val bio: String = "Amante apasionado de los mangas, manhwas y novelas.",
    val level: Int = 1,
    val currentXp: Int = 0,
    val nextLevelXp: Int = 100,
    val rankTitle: String = "Lector Novato",
    val rankTier: String = "F",
    val rankColor: Long = 0xFF9E9E9E,
    val chaptersRead: Int = 0,
    val mangasCompleted: Int = 0,
    val streakDays: Int = 1,
    val claimedQuests: Set<String> = emptySet(),
    val isLoggedIn: Boolean = false,
    val isAdmin: Boolean = false,
    val token: String? = null
)

object UserManager {

    private const val PREFS_NAME = "yomori_user_session"
    private const val KEY_REMEMBER_ME = "remember_me"
    private const val KEY_IS_LOGGED_IN = "is_logged_in"
    private const val KEY_IS_ADMIN = "is_admin"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_NICKNAME = "nickname"
    private const val KEY_USERNAME = "username"
    private const val KEY_EMAIL = "email"
    private const val KEY_AVATAR = "avatar_url"
    private const val KEY_BIO = "bio"
    private const val KEY_LEVEL = "level"
    private const val KEY_XP = "current_xp"
    private const val KEY_NEXT_XP = "next_level_xp"
    private const val KEY_RANK = "rank_title"
    private const val KEY_RANK_TIER = "rank_tier"
    private const val KEY_RANK_COLOR = "rank_color"
    private const val KEY_CHAPTERS = "chapters_read"
    private const val KEY_MANGAS = "mangas_completed"
    private const val KEY_STREAK = "streak_days"
    private const val KEY_CLAIMED_QUESTS = "claimed_quests"

    // Seguros Fuertes Anti-Farm (Progresión Calculada ~2 Años)
    private const val KEY_LAST_XP_AWARD_TIME = "last_xp_award_time"
    private const val KEY_TODAY_DATE = "today_date"
    private const val KEY_TODAY_CHAPTERS_COUNT = "today_chapters_count"
    private const val KEY_LIFETIME_AWARDED_CHAPTERS = "lifetime_awarded_chapters"

    const val MIN_READ_TIME_SECONDS = 35L // Mínimo 35 segundos por capítulo real
    const val MAX_DAILY_XP_CHAPTERS = 60  // Límite generoso de hasta 60 capítulos con XP al día (maratones)
    const val XP_PER_CHAPTER = 20         // 20 XP por capítulo único
    const val MIN_INTERVAL_BETWEEN_XP_MS = 30_000L // 30 segundos de intervalo mínimo entre recompensas

    private const val SUPABASE_URL = "https://vbivlrdjdnaiaxtbllro.supabase.co"
    private const val API_KEY = "sb_publishable_k3QS_xKR1A1gQ0MN3J5V7w_IMxu25Rg"
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val scope = CoroutineScope(Dispatchers.IO)

    private val prefs: SharedPreferences? by lazy {
        try {
            val app = Injekt.get<Application>()
            app.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        } catch (_: Throwable) {
            null
        }
    }

    private val okHttpClient by lazy {
        try {
            Injekt.get<eu.kanade.tachiyomi.network.NetworkHelper>().client
        } catch (_: Throwable) {
            okhttp3.OkHttpClient()
        }
    }

    private val _userState = MutableStateFlow(loadInitialUser())
    val userState = _userState.asStateFlow()

    init {
        if (!_userState.value.isLoggedIn) {
            scope.launch {
                try {
                    YomoriSyncManager.clearLocalSession()
                } catch (_: Throwable) {}
            }
        }
    }

    private fun loadInitialUser(): YomoriUser {
        try {
            val sp = prefs ?: return YomoriUser()

            // Invalida sesiones de prueba anteriores para presentar la pantalla de Login y Registro
            val authVersion = sp.getInt("yomori_auth_v2_migration", 0)
            if (authVersion < 2) {
                sp.edit().putInt("yomori_auth_v2_migration", 2).putBoolean(KEY_IS_LOGGED_IN, false).apply()
                val defaultRank = getRankForLevel(1)
                return YomoriUser(
                    rankTitle = defaultRank.title,
                    rankTier = defaultRank.tier,
                    rankColor = defaultRank.color,
                    isLoggedIn = false,
                    isAdmin = false
                )
            }

            val isLoggedIn = sp.getBoolean(KEY_IS_LOGGED_IN, false)
            val rememberMe = sp.getBoolean(KEY_REMEMBER_ME, true)
            val isAdmin = sp.getBoolean(KEY_IS_ADMIN, false)

            if (isLoggedIn && rememberMe) {
                val lvl = sp.getInt(KEY_LEVEL, if (isAdmin) 999 else 1)
                val rank = if (isAdmin) RankInfo("ADMIN", "ADMIN", 0xFFFF0055L, 999, 999, 0L) else getRankForLevel(lvl)
                val claimed = sp.getStringSet(KEY_CLAIMED_QUESTS, emptySet()) ?: emptySet()
                return YomoriUser(
                    id = sp.getString(KEY_USER_ID, "user_1") ?: "user_1",
                    nickname = sp.getString(KEY_NICKNAME, if (isAdmin) "Rey Palomo" else "Lector Nocturno") ?: "Lector Nocturno",
                    username = sp.getString(KEY_USERNAME, if (isAdmin) "Rey_Palomo" else "lector_nocturno") ?: "lector_nocturno",
                    email = sp.getString(KEY_EMAIL, if (isAdmin) "reypalomo@yomori.app" else "usuario@yomori.app") ?: "usuario@yomori.app",
                    avatarUrl = sp.getString(KEY_AVATAR, AVATAR_PRESETS[0]) ?: AVATAR_PRESETS[0],
                    bio = sp.getString(KEY_BIO, if (isAdmin) "👑 Creador & Administrador Supremo de Yomori." else "Amante apasionado de los mangas, manhwas y novelas.") ?: "",
                    level = lvl,
                    currentXp = sp.getInt(KEY_XP, if (isAdmin) 9999999 else 0),
                    nextLevelXp = sp.getInt(KEY_NEXT_XP, if (isAdmin) 9999999 else 100),
                    rankTitle = rank.title,
                    rankTier = rank.tier,
                    rankColor = rank.color,
                    chaptersRead = sp.getInt(KEY_CHAPTERS, if (isAdmin) 99999 else 0),
                    mangasCompleted = sp.getInt(KEY_MANGAS, if (isAdmin) 1000 else 0),
                    streakDays = sp.getInt(KEY_STREAK, if (isAdmin) 730 else 1),
                    claimedQuests = claimed,
                    isLoggedIn = true,
                    isAdmin = isAdmin,
                    token = if (isAdmin) "admin_master_token" else "saved_session"
                )
            }
            val defaultRank = getRankForLevel(1)
            return YomoriUser(
                rankTitle = defaultRank.title,
                rankTier = defaultRank.tier,
                rankColor = defaultRank.color,
                isLoggedIn = false,
                isAdmin = false
            )
        } catch (_: Throwable) {
            val defaultRank = getRankForLevel(1)
            return YomoriUser(
                rankTitle = defaultRank.title,
                rankTier = defaultRank.tier,
                rankColor = defaultRank.color,
                isLoggedIn = false,
                isAdmin = false
            )
        }
    }

    fun isAutoLoginEnabled(): Boolean {
        return try {
            val sp = prefs ?: return false
            val authVersion = sp.getInt("yomori_auth_v2_migration", 0)
            if (authVersion < 2) return false
            sp.getBoolean(KEY_IS_LOGGED_IN, false) && sp.getBoolean(KEY_REMEMBER_ME, true)
        } catch (_: Throwable) {
            false
        }
    }

    fun getRankForLevel(level: Int): RankInfo {
        for (rank in RANK_TIERS) {
            if (level in rank.minLevel..rank.maxLevel) {
                return rank
            }
        }
        return RANK_TIERS.last()
    }

    /**
     * Motor de Seguridad Anti-Farm de Experiencia
     */
    fun recordChapterReadWithAntiFarm(chapterId: String, durationSeconds: Long): Pair<Boolean, String> {
        val user = _userState.value
        val now = System.currentTimeMillis()
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())

        val sp = prefs
        val savedDate = sp?.getString(KEY_TODAY_DATE, "") ?: ""
        var todayCount = if (savedDate == todayStr) sp?.getInt(KEY_TODAY_CHAPTERS_COUNT, 0) ?: 0 else 0
        val lifetimeAwardedIds = (sp?.getStringSet(KEY_LIFETIME_AWARDED_CHAPTERS, emptySet()) ?: emptySet()).toMutableSet()
        val lastXpTime = sp?.getLong(KEY_LAST_XP_AWARD_TIME, 0L) ?: 0L

        // Siempre suma al total de capítulos leídos en el perfil y programa sync a la nube
        incrementChapterStats()
        YomoriSyncManager.scheduleSyncPush()

        // Modo Admin sin restricciones
        if (user.isAdmin) {
            addXp(XP_PER_CHAPTER)
            return Pair(true, "+$XP_PER_CHAPTER XP (Admin)")
        }

        // SEGURO 1: Blindaje contra Desmarcar como No Leído y Releer (Lifetime Deduplication)
        // Cada capítulo en la historia de la cuenta solo puede otorgar XP UNA SOLA VEZ en la vida
        if (lifetimeAwardedIds.contains(chapterId)) {
            return Pair(false, "Capítulo ya recompensado anteriormente (Anti-relectura).")
        }

        // SEGURO 2: Tiempo mínimo de lectura real (anti-scripts y auto-scroll veloz)
        if (durationSeconds < MIN_READ_TIME_SECONDS) {
            return Pair(false, "Lectura demasiado rápida (<35s). No otorga XP.")
        }

        // SEGURO 3: Intervalo mínimo entre ganancias de XP
        if (now - lastXpTime < MIN_INTERVAL_BETWEEN_XP_MS) {
            return Pair(false, "Enfriamiento de XP activo. Espera un momento.")
        }

        // SEGURO 4: Límite diario de capítulos con XP (Cap ampliado a 60 caps/día = 1,200 XP)
        if (todayCount >= MAX_DAILY_XP_CHAPTERS) {
            return Pair(false, "Límite diario de lectura alcanzado (60 caps/día).")
        }

        // Todo correcto: Registrar capítulo permanentemente en la cuenta y otorgar XP
        lifetimeAwardedIds.add(chapterId)
        todayCount++
        addXp(XP_PER_CHAPTER)

        sp?.edit()?.apply {
            putString(KEY_TODAY_DATE, todayStr)
            putInt(KEY_TODAY_CHAPTERS_COUNT, todayCount)
            putStringSet(KEY_LIFETIME_AWARDED_CHAPTERS, lifetimeAwardedIds)
            putLong(KEY_LAST_XP_AWARD_TIME, now)
            apply()
        }

        return Pair(true, "+$XP_PER_CHAPTER XP")
    }

    private fun incrementChapterStats() {
        val current = _userState.value
        val updated = current.copy(chaptersRead = current.chaptersRead + 1)
        _userState.value = updated
        if (current.isLoggedIn) {
            saveSession(updated, rememberMe = true)
            syncProfileToCloud(updated)
        }
    }

    fun addXp(amount: Int) {
        val current = _userState.value
        if (current.isAdmin) return // Admin ya está en nivel supremo

        var newXp = current.currentXp + amount
        var newLevel = current.level
        var nextXp = current.nextLevelXp

        while (newXp >= nextXp) {
            newXp -= nextXp
            newLevel++
            nextXp = 100 + (newLevel * 40)
        }

        val rank = getRankForLevel(newLevel)
        val updated = current.copy(
            level = newLevel,
            currentXp = newXp,
            nextLevelXp = nextXp,
            rankTitle = rank.title,
            rankTier = rank.tier,
            rankColor = rank.color
        )
        _userState.value = updated

        if (current.isLoggedIn) {
            saveSession(updated, rememberMe = true)
            syncProfileToCloud(updated)
        }
    }

    fun updateProfile(
        nickname: String,
        username: String,
        bio: String,
        avatarUrl: String
    ) {
        val current = _userState.value
        val cleanNick = nickname.trim().ifBlank { current.nickname }
        val cleanUser = username.trim().replace("@", "").ifBlank { current.username }
        val cleanBio = bio.trim()
        val cleanAvatar = avatarUrl.trim().ifBlank { current.avatarUrl }

        val updated = current.copy(
            nickname = cleanNick,
            username = cleanUser,
            bio = cleanBio,
            avatarUrl = cleanAvatar
        )
        _userState.value = updated
        saveSession(updated, rememberMe = true)
        if (updated.isLoggedIn) {
            syncProfileToCloud(updated)
        }
    }

    fun updateBio(bio: String) {
        val current = _userState.value
        val cleanBio = bio.trim()
        val updated = current.copy(bio = cleanBio)
        _userState.value = updated
        saveSession(updated, rememberMe = true)
        if (updated.isLoggedIn) {
            syncProfileToCloud(updated)
        }
    }

    fun getQuests(): List<Quest> {
        val user = _userState.value
        val claimed = user.claimedQuests

        return listOf(
            // Misiones Diarias
            Quest(
                id = "daily_read_3",
                title = "Lector Nocturno",
                description = "Lee 3 capítulos de cualquier manga hoy",
                xpReward = 60,
                currentProgress = (user.chaptersRead % 10).coerceAtMost(3),
                targetProgress = 3,
                isCompleted = (user.chaptersRead % 10) >= 3,
                isClaimed = claimed.contains("daily_read_3"),
                type = "DAILY"
            ),
            Quest(
                id = "daily_streak",
                title = "Fuego Inquebrantable",
                description = "Mantén activa tu racha diaria de lectura",
                xpReward = 100,
                currentProgress = 1,
                targetProgress = 1,
                isCompleted = true,
                isClaimed = claimed.contains("daily_streak"),
                type = "DAILY"
            ),
            Quest(
                id = "daily_chat",
                title = "Voz de la Comunidad",
                description = "Participa enviando un mensaje en el chat en vivo",
                xpReward = 40,
                currentProgress = 1,
                targetProgress = 1,
                isCompleted = true,
                isClaimed = claimed.contains("daily_chat"),
                type = "DAILY"
            ),
            // Logros y Misiones de Hito (Progresión a largo plazo ~2 años)
            Quest(
                id = "milestone_100_caps",
                title = "Iniciación de Lector",
                description = "Lee un total de 100 capítulos",
                xpReward = 300,
                currentProgress = user.chaptersRead.coerceAtMost(100),
                targetProgress = 100,
                isCompleted = user.chaptersRead >= 100,
                isClaimed = claimed.contains("milestone_100_caps"),
                type = "MILESTONE"
            ),
            Quest(
                id = "milestone_500_caps",
                title = "Veterano de la Lectura",
                description = "Lee un total de 500 capítulos",
                xpReward = 1500,
                currentProgress = user.chaptersRead.coerceAtMost(500),
                targetProgress = 500,
                isCompleted = user.chaptersRead >= 500,
                isClaimed = claimed.contains("milestone_500_caps"),
                type = "MILESTONE"
            ),
            Quest(
                id = "milestone_2000_caps",
                title = "Gran Maestro de la Biblioteca",
                description = "Lee un total de 2,000 capítulos",
                xpReward = 5000,
                currentProgress = user.chaptersRead.coerceAtMost(2000),
                targetProgress = 2000,
                isCompleted = user.chaptersRead >= 2000,
                isClaimed = claimed.contains("milestone_2000_caps"),
                type = "MILESTONE"
            ),
            Quest(
                id = "milestone_10000_caps",
                title = "Erudito Trascendente",
                description = "Lee 10,000 capítulos en tu trayectoria de 2 años",
                xpReward = 30000,
                currentProgress = user.chaptersRead.coerceAtMost(10000),
                targetProgress = 10000,
                isCompleted = user.chaptersRead >= 10000,
                isClaimed = claimed.contains("milestone_10000_caps"),
                type = "MILESTONE"
            )
        )
    }

    fun claimQuest(questId: String) {
        val current = _userState.value
        if (current.claimedQuests.contains(questId)) return

        val quest = getQuests().find { it.id == questId } ?: return
        if (!quest.isCompleted) return

        val newClaimed = current.claimedQuests + questId
        _userState.value = current.copy(claimedQuests = newClaimed)
        addXp(quest.xpReward)

        prefs?.edit()?.apply {
            putStringSet(KEY_CLAIMED_QUESTS, newClaimed)
            apply()
        }
    }

    suspend fun login(
        usernameOrEmail: String,
        password: String,
        rememberMe: Boolean
    ): Result<YomoriUser> = withContext(Dispatchers.IO) {
        try {
            val cleanInput = usernameOrEmail.trim()
            val normalizedUser = cleanInput.removePrefix("@")
            if (cleanInput.isBlank()) {
                return@withContext Result.failure(Exception("Por favor ingresa tu usuario o correo"))
            }

            // Verificación Especial de Cuenta Administrador
            val isAdminAttempt = cleanInput.equals("Rey_Palomo", ignoreCase = true) ||
                    normalizedUser.equals("Rey_Palomo", ignoreCase = true) ||
                    cleanInput.equals("reypalomo@yomori.app", ignoreCase = true)

            if (isAdminAttempt) {
                if (password != "apaza213mamani") {
                    return@withContext Result.failure(Exception("Contraseña de Administrador incorrecta"))
                }
                val adminUser = YomoriUser(
                    id = "admin_rey_palomo",
                    nickname = "Rey Palomo",
                    username = "Rey_Palomo",
                    email = "reypalomo@yomori.app",
                    avatarUrl = "https://api.dicebear.com/7.x/bottts/png?seed=cyber_crimson&backgroundColor=ffcdd2,f8bbd0",
                    bio = "👑 Creador & Administrador Supremo de Yomori.",
                    level = 999,
                    currentXp = 9999999,
                    nextLevelXp = 9999999,
                    rankTitle = "ADMIN",
                    rankTier = "ADMIN",
                    rankColor = 0xFFFF0055L,
                    chaptersRead = 99999,
                    mangasCompleted = 1000,
                    streakDays = 730,
                    isLoggedIn = true,
                    isAdmin = true,
                    token = "admin_master_token"
                )
                _userState.value = adminUser
                saveSession(adminUser, rememberMe)
                return@withContext Result.success(adminUser)
            }

            // Consultar perfil en Supabase (busca por nombre de usuario sin @ o por correo electrónico)
            val queryParam = if (cleanInput.contains("@") && cleanInput.contains(".")) {
                "or=(email.eq.$cleanInput,username.eq.$normalizedUser)"
            } else {
                "or=(username.eq.$normalizedUser,email.eq.$cleanInput)"
            }
            val url = "$SUPABASE_URL/rest/v1/yomori_profiles?$queryParam&limit=1"

            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            val response = okHttpClient.newCall(request).execute()
            val bodyString = response.body?.string() ?: ""

            if (response.isSuccessful && bodyString.isNotBlank() && bodyString != "[]") {
                val array = JSONArray(bodyString)
                val obj = array.getJSONObject(0)

                val lvl = obj.optInt("level", 1)
                val rank = getRankForLevel(lvl)
                val user = YomoriUser(
                    id = obj.optString("id", "user_${UUID.randomUUID()}"),
                    nickname = obj.optString("nickname", obj.optString("username", normalizedUser)),
                    username = obj.optString("username", normalizedUser),
                    email = obj.optString("email", if (cleanInput.contains("@")) cleanInput else "$normalizedUser@yomori.app"),
                    avatarUrl = obj.optString("avatar_url", AVATAR_PRESETS[0]),
                    bio = obj.optString("bio", "Amante de los mangas y manhwas de acción y cultivo."),
                    level = lvl,
                    currentXp = obj.optInt("current_xp", 0),
                    nextLevelXp = obj.optInt("next_level_xp", 100),
                    rankTitle = rank.title,
                    rankTier = rank.tier,
                    rankColor = rank.color,
                    chaptersRead = obj.optInt("chapters_read", 0),
                    mangasCompleted = obj.optInt("mangas_completed", 0),
                    streakDays = obj.optInt("streak_days", 1),
                    isLoggedIn = true,
                    isAdmin = false,
                    token = "token_${System.currentTimeMillis()}"
                )

                _userState.value = user
                saveSession(user, rememberMe)
                scope.launch { try { YomoriSyncManager.pullLibraryFromCloud() } catch (_: Throwable) {} }
                Result.success(user)
            } else {
                val fallbackId = "usr_${cleanInput.hashCode()}"
                val lvl = 1
                val rank = getRankForLevel(lvl)
                val user = YomoriUser(
                    id = fallbackId,
                    nickname = cleanInput,
                    username = cleanInput,
                    email = if (cleanInput.contains("@")) cleanInput else "$cleanInput@yomori.app",
                    rankTitle = rank.title,
                    rankTier = rank.tier,
                    rankColor = rank.color,
                    isLoggedIn = true,
                    isAdmin = false,
                    token = "token_${System.currentTimeMillis()}"
                )
                _userState.value = user
                saveSession(user, rememberMe)
                syncProfileToCloud(user)
                scope.launch { try { YomoriSyncManager.pullLibraryFromCloud() } catch (_: Throwable) {} }
                Result.success(user)
            }
        } catch (e: Exception) {
            val lvl = 1
            val rank = getRankForLevel(lvl)
            val user = YomoriUser(
                id = "local_${usernameOrEmail.hashCode()}",
                nickname = usernameOrEmail.trim(),
                username = usernameOrEmail.trim(),
                email = "$usernameOrEmail@yomori.app",
                rankTitle = rank.title,
                rankTier = rank.tier,
                rankColor = rank.color,
                isLoggedIn = true,
                isAdmin = false
            )
            _userState.value = user
            saveSession(user, rememberMe)
            Result.success(user)
        }
    }

    suspend fun register(
        nickname: String,
        username: String,
        email: String,
        password: String,
        rememberMe: Boolean
    ): Result<YomoriUser> = withContext(Dispatchers.IO) {
        try {
            val cleanNick = nickname.trim()
            val cleanUser = username.trim().replace("@", "")
            val cleanEmail = email.trim()

            if (cleanNick.isBlank()) {
                return@withContext Result.failure(Exception("Por favor ingresa tu apodo / nombre para mostrar"))
            }
            if (cleanUser.length < 3) {
                return@withContext Result.failure(Exception("El nombre de usuario debe tener al menos 3 caracteres"))
            }

            val userId = "user_${UUID.randomUUID().toString().take(12)}"
            val rank = getRankForLevel(1)
            val newUser = YomoriUser(
                id = userId,
                nickname = cleanNick,
                username = cleanUser,
                email = cleanEmail.ifBlank { "$cleanUser@yomori.app" },
                avatarUrl = AVATAR_PRESETS[0],
                bio = "Amante de los mangas y manhwas de acción y cultivo.",
                level = 1,
                currentXp = 0,
                nextLevelXp = 100,
                rankTitle = rank.title,
                rankTier = rank.tier,
                rankColor = rank.color,
                chaptersRead = 0,
                mangasCompleted = 0,
                streakDays = 1,
                isLoggedIn = true,
                isAdmin = false,
                token = "token_${System.currentTimeMillis()}"
            )

            // Guardar en Supabase
            val jsonPayload = JSONObject().apply {
                put("id", newUser.id)
                put("nickname", newUser.nickname)
                put("username", newUser.username)
                put("email", newUser.email)
                put("avatar_url", newUser.avatarUrl)
                put("bio", newUser.bio)
                put("level", newUser.level)
                put("current_xp", newUser.currentXp)
                put("next_level_xp", newUser.nextLevelXp)
                put("rank_title", newUser.rankTitle)
                put("rank_tier", newUser.rankTier)
                put("chapters_read", newUser.chaptersRead)
                put("mangas_completed", newUser.mangasCompleted)
                put("streak_days", newUser.streakDays)
            }

            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/yomori_profiles")
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=representation")
                .post(jsonPayload.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            okHttpClient.newCall(request).execute().close()

            _userState.value = newUser
            saveSession(newUser, rememberMe)
            scope.launch { try { YomoriSyncManager.pullLibraryFromCloud() } catch (_: Throwable) {} }
            Result.success(newUser)
        } catch (e: Exception) {
            val rank = getRankForLevel(1)
            val fallbackUser = YomoriUser(
                id = "usr_${System.currentTimeMillis()}",
                nickname = username.trim(),
                username = username.trim(),
                email = email.trim(),
                rankTitle = rank.title,
                rankTier = rank.tier,
                rankColor = rank.color,
                isLoggedIn = true,
                isAdmin = false
            )
            _userState.value = fallbackUser
            saveSession(fallbackUser, rememberMe)
            scope.launch { try { YomoriSyncManager.pullLibraryFromCloud() } catch (_: Throwable) {} }
            Result.success(fallbackUser)
        }
    }

    fun continueAsGuest() {
        scope.launch {
            try {
                YomoriSyncManager.clearLocalSession()
            } catch (_: Throwable) {}
        }
        val rank = getRankForLevel(1)
        val guest = YomoriUser(
            id = "guest_${System.currentTimeMillis()}",
            nickname = "Lector Invitado",
            username = "invitado",
            email = "invitado@yomori.app",
            rankTitle = rank.title,
            rankTier = rank.tier,
            rankColor = rank.color,
            isLoggedIn = false,
            isAdmin = false
        )
        _userState.value = guest
    }

    fun logout() {
        val currentUser = _userState.value
        scope.launch {
            try {
                if (currentUser.isLoggedIn && currentUser.username.isNotBlank()) {
                    YomoriSyncManager.pushLibraryToCloud()
                }
                YomoriSyncManager.clearLocalSession()
            } catch (_: Throwable) {}
        }
        prefs?.edit()?.apply {
            putBoolean(KEY_IS_LOGGED_IN, false)
            putBoolean(KEY_IS_ADMIN, false)
            remove(KEY_USER_ID)
            remove(KEY_NICKNAME)
            remove(KEY_USERNAME)
            remove(KEY_EMAIL)
            apply()
        }
        _userState.value = YomoriUser(isLoggedIn = false, isAdmin = false)
    }

    private fun saveSession(user: YomoriUser, rememberMe: Boolean) {
        prefs?.edit()?.apply {
            putBoolean(KEY_REMEMBER_ME, rememberMe)
            putBoolean(KEY_IS_LOGGED_IN, user.isLoggedIn)
            putBoolean(KEY_IS_ADMIN, user.isAdmin)
            putString(KEY_USER_ID, user.id)
            putString(KEY_NICKNAME, user.nickname)
            putString(KEY_USERNAME, user.username)
            putString(KEY_EMAIL, user.email)
            putString(KEY_AVATAR, user.avatarUrl)
            putString(KEY_BIO, user.bio)
            putInt(KEY_LEVEL, user.level)
            putInt(KEY_XP, user.currentXp)
            putInt(KEY_NEXT_XP, user.nextLevelXp)
            putString(KEY_RANK, user.rankTitle)
            putString(KEY_RANK_TIER, user.rankTier)
            putLong(KEY_RANK_COLOR, user.rankColor)
            putInt(KEY_CHAPTERS, user.chaptersRead)
            putInt(KEY_MANGAS, user.mangasCompleted)
            putInt(KEY_STREAK, user.streakDays)
            apply()
        }
        if (user.isLoggedIn) {
            scope.launch {
                try {
                    // Limpia favoritos locales previos y luego restaura la biblioteca del usuario desde Supabase
                    YomoriSyncManager.clearLocalLibraryFavorites()
                    YomoriSyncManager.pullLibraryFromCloud()
                } catch (e: Throwable) {}
            }
        }
    }

    fun restoreProfileFromCloud(settingsJson: String) {
        try {
            val obj = JSONObject(settingsJson)
            val current = _userState.value
            if (!current.isLoggedIn) return

            val isAdmin = if (obj.has("is_admin")) obj.getBoolean("is_admin") else current.isAdmin
            val lvl = obj.optInt("level", current.level)
            val rank = if (isAdmin) RankInfo("ADMIN", "ADMIN", 0xFFFF0055L, 999, 999, 0L) else getRankForLevel(lvl)
            
            val claimedArr = obj.optJSONArray("claimed_quests")
            val claimedSet = mutableSetOf<String>()
            if (claimedArr != null) {
                for (i in 0 until claimedArr.length()) {
                    claimedSet.add(claimedArr.getString(i))
                }
            } else {
                claimedSet.addAll(current.claimedQuests)
            }

            val restored = current.copy(
                nickname = obj.optString("nickname", current.nickname),
                username = obj.optString("username", current.username),
                avatarUrl = obj.optString("avatar_url", current.avatarUrl),
                bio = obj.optString("bio", current.bio),
                level = lvl,
                currentXp = obj.optInt("current_xp", current.currentXp),
                nextLevelXp = obj.optInt("next_level_xp", current.nextLevelXp),
                rankTitle = rank.title,
                rankTier = rank.tier,
                rankColor = rank.color,
                chaptersRead = obj.optInt("chapters_read", current.chaptersRead),
                mangasCompleted = obj.optInt("mangas_completed", current.mangasCompleted),
                streakDays = obj.optInt("streak_days", current.streakDays),
                claimedQuests = claimedSet,
                isAdmin = isAdmin
            )

            _userState.value = restored
            prefs?.edit()?.apply {
                putString(KEY_NICKNAME, restored.nickname)
                putString(KEY_USERNAME, restored.username)
                putString(KEY_AVATAR, restored.avatarUrl)
                putString(KEY_BIO, restored.bio)
                putInt(KEY_LEVEL, restored.level)
                putInt(KEY_XP, restored.currentXp)
                putInt(KEY_NEXT_XP, restored.nextLevelXp)
                putString(KEY_RANK, restored.rankTitle)
                putString(KEY_RANK_TIER, restored.rankTier)
                putLong(KEY_RANK_COLOR, restored.rankColor)
                putInt(KEY_CHAPTERS, restored.chaptersRead)
                putInt(KEY_MANGAS, restored.mangasCompleted)
                putInt(KEY_STREAK, restored.streakDays)
                putStringSet(KEY_CLAIMED_QUESTS, restored.claimedQuests)
                putBoolean(KEY_IS_ADMIN, restored.isAdmin)
                apply()
            }
        } catch (e: Exception) {}
    }

    private fun syncProfileToCloud(user: YomoriUser) {
        YomoriSyncManager.scheduleSyncPush()
        scope.launch {
            try {
                val jsonPayload = JSONObject().apply {
                    put("id", user.id)
                    put("nickname", user.nickname)
                    put("username", user.username)
                    put("avatar_url", user.avatarUrl)
                    put("bio", user.bio)
                    put("level", user.level)
                    put("current_xp", user.currentXp)
                    put("next_level_xp", user.nextLevelXp)
                    put("rank_title", user.rankTitle)
                    put("rank_tier", user.rankTier)
                    put("chapters_read", user.chaptersRead)
                    put("mangas_completed", user.mangasCompleted)
                    put("streak_days", user.streakDays)
                }

                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/yomori_profiles?id=eq.${user.id}")
                    .addHeader("apikey", API_KEY)
                    .addHeader("Authorization", "Bearer $API_KEY")
                    .addHeader("Content-Type", "application/json")
                    .patch(jsonPayload.toString().toRequestBody(JSON_MEDIA_TYPE))
                    .build()

                okHttpClient.newCall(request).execute().close()
            } catch (e: Throwable) {}
        }
    }
}
