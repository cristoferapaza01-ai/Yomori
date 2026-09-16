package eu.kanade.tachiyomi.ui.yomori.data

import eu.kanade.tachiyomi.network.NetworkHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import tachiyomi.domain.manga.model.Manga
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

object YomoriSupabaseService {

    private const val SUPABASE_URL = "https://vbivlrdjdnaiaxtbllro.supabase.co"
    private const val API_KEY = "sb_publishable_k3QS_xKR1A1gQ0MN3J5V7w_IMxu25Rg"
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val scope = CoroutineScope(Dispatchers.IO)

    private val okHttpClient by lazy {
        try {
            Injekt.get<NetworkHelper>().client
        } catch (_: Throwable) {
            okhttp3.OkHttpClient()
        }
    }

    /**
     * Obtiene el Manga más leído del DÍA para el Banner Principal de Inicio.
     */
    suspend fun fetchDailyTopHero(): WeeklyTopManga? = withContext(Dispatchers.IO) {
        try {
            // Consulta ordenando primero por lecturas del día (daily_reads) o weekly_reads
            val url = "$SUPABASE_URL/rest/v1/yomori_manga_stats?select=*&order=daily_reads.desc.nullslast,weekly_reads.desc&limit=1"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val bodyString = response.body?.string() ?: return@withContext null
            val jsonArray = JSONArray(bodyString)
            if (jsonArray.length() == 0) return@withContext null

            val obj = jsonArray.getJSONObject(0)
            val genresList = mutableListOf<String>()
            val genresArr = obj.optJSONArray("genres")
            if (genresArr != null) {
                for (g in 0 until genresArr.length()) {
                    genresList.add(genresArr.getString(g))
                }
            } else {
                genresList.addAll(listOf("Acción", "Fantasía"))
            }

            WeeklyTopManga(
                id = obj.optString("id", "daily-top-1"),
                title = obj.optString("title", ""),
                originalTitle = obj.optString("original_title", obj.optString("title", "")),
                synopsis = obj.optString("synopsis", "El manga más leído del día por la comunidad Yomori."),
                coverUrl = obj.optString("cover_url", ""),
                rating = obj.optString("rating", "9.9"),
                scanSource = obj.optString("scan_source", "Yomori Cloud"),
                latestChapter = obj.optString("latest_chapter", "Capítulo 1"),
                genres = genresList,
                sourceId = obj.optLong("source_id", 0L),
                mangaUrl = obj.optString("manga_url", "")
            )
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Obtiene el Top Semanal real generado por las lecturas de los usuarios en la base de datos de Supabase.
     */
    suspend fun fetchWeeklyTop(): List<WeeklyTopManga> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/yomori_manga_stats?select=*&order=weekly_reads.desc&limit=15"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val bodyString = response.body?.string() ?: return@withContext emptyList()
            val jsonArray = JSONArray(bodyString)
            val resultList = mutableListOf<WeeklyTopManga>()

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val id = obj.optString("id", "top-$i")
                val title = obj.optString("title", "")
                val originalTitle = obj.optString("original_title", title)
                val synopsis = obj.optString("synopsis", "Manga popular en la comunidad de Yomori.")
                val coverUrl = obj.optString("cover_url", "")
                val rating = obj.optString("rating", "9.9")
                val scanSource = obj.optString("scan_source", "Yomori Cloud")
                val latestChapter = obj.optString("latest_chapter", "Capítulo 1")
                val sourceId = obj.optLong("source_id", 0L)
                val mangaUrl = obj.optString("manga_url", "")

                val genresList = mutableListOf<String>()
                val genresArr = obj.optJSONArray("genres")
                if (genresArr != null) {
                    for (g in 0 until genresArr.length()) {
                        genresList.add(genresArr.getString(g))
                    }
                } else {
                    genresList.addAll(listOf("Acción", "Fantasía"))
                }

                resultList.add(
                    WeeklyTopManga(
                        id = id,
                        title = title,
                        originalTitle = originalTitle,
                        synopsis = synopsis,
                        coverUrl = coverUrl,
                        rating = rating,
                        scanSource = scanSource,
                        latestChapter = latestChapter,
                        genres = genresList,
                        sourceId = sourceId,
                        mangaUrl = mangaUrl
                    )
                )
            }
            resultList
        } catch (_: Throwable) {
            emptyList()
        }
    }

    /**
     * Registra en segundo plano una lectura de capítulo en Supabase para contabilizar el Top Semanal global.
     */
    fun recordMangaRead(
        manga: Manga,
        chapterName: String? = null,
        scanSource: String? = null
    ) {
        scope.launch {
            try {
                val mangaId = "manga-${manga.source}-${manga.url.hashCode()}"
                val jsonPayload = JSONObject().apply {
                    put("p_id", mangaId)
                    put("p_source_id", manga.source)
                    put("p_manga_url", manga.url)
                    put("p_title", manga.title)
                    put("p_cover_url", manga.thumbnailUrl ?: "")
                    put("p_scan_source", scanSource ?: "Scan")
                    put("p_latest_chapter", chapterName ?: "")
                    put("p_synopsis", manga.description ?: "")
                    put("p_manga_type", "Manhwa")
                }

                val request = Request.Builder()
                    .url("$SUPABASE_URL/rest/v1/rpc/record_manga_read")
                    .addHeader("apikey", API_KEY)
                    .addHeader("Authorization", "Bearer $API_KEY")
                    .addHeader("Content-Type", "application/json")
                    .post(jsonPayload.toString().toRequestBody(JSON_MEDIA_TYPE))
                    .build()

                okHttpClient.newCall(request).execute().close()
            } catch (_: Throwable) {
                // Silently ignore network failures to never interrupt the user
            }
        }
    }

    /**
     * Obtiene los mensajes del chat en vivo de la comunidad desde Supabase.
     */
    suspend fun fetchChatMessages(limit: Int = 10): List<LiveChatMessage> = withContext(Dispatchers.IO) {
        try {
            val url = "$SUPABASE_URL/rest/v1/yomori_chat_messages?select=*&order=created_at.desc&limit=$limit"
            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()

            val bodyString = response.body?.string() ?: return@withContext emptyList()
            val jsonArray = JSONArray(bodyString)
            val list = mutableListOf<LiveChatMessage>()

            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val uName = obj.optString("user_name", "Lector")
                val badgeText = obj.optString("badge", "Lector")
                var bColor = obj.optLong("badge_color", 0L)

                if (bColor == 0L || bColor == 4279934207L) {
                    if (uName.equals("Rey_Palomo", ignoreCase = true) || badgeText.contains("ADMIN", ignoreCase = true)) {
                        bColor = 0xFFFF0055L
                    } else {
                        val matchingTier = RANK_TIERS.find { it.title.equals(badgeText.replace("👑 ", "").trim(), ignoreCase = true) }
                        if (matchingTier != null) {
                            bColor = matchingTier.color
                        }
                    }
                }

                val replyUser = obj.optString("reply_to_user", "").ifBlank { null }
                val replyTxt = obj.optString("reply_to_text", "").ifBlank { null }

                list.add(
                    LiveChatMessage(
                        id = obj.optString("id", "msg-$i"),
                        user = uName,
                        avatarInitial = obj.optString("avatar_initial", uName.take(1).uppercase()),
                        badge = badgeText,
                        badgeColor = bColor,
                        time = "Ahora",
                        manga = obj.optString("manga_title", "General"),
                        text = obj.optString("message", ""),
                        likes = obj.optInt("likes", 0),
                        replyToUser = replyUser,
                        replyToText = replyTxt
                    )
                )
            }
            list
        } catch (_: Throwable) {
            emptyList()
        }
    }

    /**
     * Envía un mensaje al chat en vivo de la comunidad en Supabase.
     */
    suspend fun sendChatMessage(
        userName: String,
        userId: String,
        avatarInitial: String,
        badge: String,
        badgeColor: Long,
        mangaTitle: String,
        message: String,
        replyToUser: String? = null,
        replyToText: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().apply {
                put("user_name", userName)
                put("user_id", userId)
                put("avatar_initial", avatarInitial)
                put("badge", badge)
                put("badge_color", badgeColor)
                put("manga_title", mangaTitle)
                put("message", message)
                put("likes", 0)
                if (!replyToUser.isNullOrBlank()) put("reply_to_user", replyToUser)
                if (!replyToText.isNullOrBlank()) put("reply_to_text", replyToText)
            }

            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/yomori_chat_messages")
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=representation")
                .post(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val response = okHttpClient.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            success
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * Elimina un mensaje del chat en vivo (Función Exclusiva de Administrador).
     */
    suspend fun deleteChatMessage(messageId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/yomori_chat_messages?id=eq.$messageId")
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .delete()
                .build()

            val response = okHttpClient.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            success
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * Sube o actualiza la copia de seguridad de la biblioteca y perfil del usuario en Supabase (UPSERT).
     */
    suspend fun pushUserSync(userId: String, libraryJson: String, settingsJson: String? = null): Boolean = withContext(Dispatchers.IO) {
        try {
            val payload = JSONObject().apply {
                put("user_id", userId)
                put("library_data", JSONObject(libraryJson))
                if (!settingsJson.isNullOrBlank()) {
                    put("settings_data", JSONObject(settingsJson))
                }
                put("updated_at", "now()")
            }

            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/yomori_user_sync?on_conflict=user_id")
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "resolution=merge-duplicates")
                .post(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            val response = okHttpClient.newCall(request).execute()
            val success = response.isSuccessful
            response.close()
            success
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * Datos sincronizados en la nube de Supabase (Biblioteca + Perfil de Usuario).
     */
    data class YomoriCloudData(
        val libraryJson: String?,
        val settingsJson: String?
    )

    /**
     * Descarga la biblioteca, perfil y progreso del usuario desde Supabase.
     */
    suspend fun pullUserSync(userId: String): YomoriCloudData? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$SUPABASE_URL/rest/v1/yomori_user_sync?user_id=eq.$userId&select=library_data,settings_data")
                .addHeader("apikey", API_KEY)
                .addHeader("Authorization", "Bearer $API_KEY")
                .addHeader("Content-Type", "application/json")
                .get()
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null

            val body = response.body?.string() ?: return@withContext null
            val array = JSONArray(body)
            if (array.length() == 0) return@withContext null

            val obj = array.getJSONObject(0)
            val libData = obj.optJSONObject("library_data")?.toString()
            val settsData = obj.optJSONObject("settings_data")?.toString()
            YomoriCloudData(libraryJson = libData, settingsJson = settsData)
        } catch (_: Throwable) {
            null
        }
    }
}
