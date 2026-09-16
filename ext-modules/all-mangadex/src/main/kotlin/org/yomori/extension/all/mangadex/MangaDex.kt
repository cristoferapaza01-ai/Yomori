package org.yomori.extension.all.mangadex

import eu.kanade.tachiyomi.network.GET
import eu.kanade.tachiyomi.source.model.Filter
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import okhttp3.Headers
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors

class MangaDex : HttpSource() {

    override val name = "MangaDex"
    override val baseUrl = "https://mangadex.org"
    private val apiBase = "https://api.mangadex.org"
    override val lang = "all"
    override val supportsLatest = true

    private val executor = Executors.newFixedThreadPool(12)

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")

    private fun hasSpanishChapters(mangaId: String): Boolean {
        return try {
            val req = GET("$apiBase/manga/$mangaId/aggregate?translatedLanguage[]=es&translatedLanguage[]=es-la", headers)
            val resp = client.newCall(req).execute()
            if (!resp.isSuccessful) return false
            val json = JSONObject(resp.body.string())
            val volumes = json.opt("volumes")
            when (volumes) {
                is JSONObject -> volumes.length() > 0
                is org.json.JSONArray -> volumes.length() > 0
                else -> false
            }
        } catch (_: Exception) {
            false
        }
    }

    override fun popularMangaRequest(page: Int): Request {
        val offset = (page - 1) * 32
        return GET("$apiBase/manga?limit=32&offset=$offset&availableTranslatedLanguage[]=es&availableTranslatedLanguage[]=es-la&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica", headers)
    }

    private fun extractBestTitle(attr: JSONObject): String {
        val titleObj = attr.optJSONObject("title")
        val altTitles = attr.optJSONArray("altTitles")

        // 1. Spanish title in main or alt
        val esTitle = titleObj?.optString("es-la")?.ifEmpty { null }
            ?: titleObj?.optString("es")?.ifEmpty { null }
            ?: titleObj?.optString("es-419")?.ifEmpty { null }
        if (!esTitle.isNullOrEmpty()) return esTitle

        if (altTitles != null) {
            for (i in 0 until altTitles.length()) {
                val obj = altTitles.optJSONObject(i) ?: continue
                val esAlt = obj.optString("es-la").ifEmpty { null }
                    ?: obj.optString("es").ifEmpty { null }
                    ?: obj.optString("es-419").ifEmpty { null }
                if (!esAlt.isNullOrEmpty()) return esAlt
            }
        }

        // 2. English title in main or alt
        val enTitle = titleObj?.optString("en")?.ifEmpty { null }
        if (!enTitle.isNullOrEmpty()) return enTitle

        if (altTitles != null) {
            for (i in 0 until altTitles.length()) {
                val obj = altTitles.optJSONObject(i) ?: continue
                val enAlt = obj.optString("en").ifEmpty { null }
                if (!enAlt.isNullOrEmpty()) return enAlt
            }
        }

        // 3. Primary title from titleObj (e.g. ja-ro, ko-ro, etc.)
        if (titleObj != null && titleObj.length() > 0) {
            val primary = titleObj.optString("ja-ro").ifEmpty { null }
                ?: titleObj.optString("ko-ro").ifEmpty { null }
                ?: titleObj.optString("zh-ro").ifEmpty { null }
                ?: titleObj.keys().asSequence().mapNotNull { titleObj.optString(it).ifEmpty { null } }.firstOrNull()
            if (!primary.isNullOrEmpty()) return primary
        }

        // 4. Any alt title
        if (altTitles != null && altTitles.length() > 0) {
            for (i in 0 until altTitles.length()) {
                val obj = altTitles.optJSONObject(i) ?: continue
                val alt = obj.keys().asSequence().mapNotNull { obj.optString(it).ifEmpty { null } }.firstOrNull()
                if (!alt.isNullOrEmpty()) return alt
            }
        }

        return "MangaDex Manga"
    }

    private fun extractBestDescription(attr: JSONObject): String {
        val descObj = attr.optJSONObject("description") ?: return ""
        val esDesc = descObj.optString("es-la").ifEmpty { null }
            ?: descObj.optString("es").ifEmpty { null }
            ?: descObj.optString("es-419").ifEmpty { null }
        if (!esDesc.isNullOrEmpty()) return esDesc

        val enDesc = descObj.optString("en").ifEmpty { null }
        if (!enDesc.isNullOrEmpty()) return enDesc

        return descObj.keys().asSequence().mapNotNull { descObj.optString(it).ifEmpty { null } }.firstOrNull() ?: ""
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val body = response.body.string()
        val json = JSONObject(body)
        val dataArray = json.optJSONArray("data") ?: return MangasPage(emptyList(), false)

        val futures = (0 until dataArray.length()).map { i ->
            val item = dataArray.getJSONObject(i)
            val id = item.optString("id")
            CompletableFuture.supplyAsync({
                if (hasSpanishChapters(id)) item else null
            }, executor)
        }
        CompletableFuture.allOf(*futures.toTypedArray()).join()
        val validItems = futures.mapNotNull { it.get() }

        val mangas = mutableListOf<SManga>()
        for (item in validItems) {
            val id = item.optString("id")
            val attr = item.optJSONObject("attributes") ?: continue
            val title = extractBestTitle(attr)

            var coverFileName = ""
            val rels = item.optJSONArray("relationships")
            if (rels != null) {
                for (j in 0 until rels.length()) {
                    val rel = rels.getJSONObject(j)
                    if (rel.optString("type") == "cover_art") {
                        coverFileName = rel.optJSONObject("attributes")?.optString("fileName") ?: ""
                        break
                    }
                }
            }

            val coverUrl = if (coverFileName.isNotEmpty()) {
                "https://uploads.mangadex.org/covers/$id/$coverFileName.512.jpg"
            } else ""

            val manga = SManga.create().apply {
                this.url = "/manga/$id"
                this.title = title
                this.thumbnail_url = coverUrl
                this.initialized = true
            }
            mangas.add(manga)
        }

        val total = json.optInt("total", 0)
        val offset = json.optInt("offset", 0)
        val limit = json.optInt("limit", 32)
        val hasNext = offset + limit < total

        return MangasPage(mangas, hasNext)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        val offset = (page - 1) * 32
        return GET("$apiBase/manga?limit=32&offset=$offset&availableTranslatedLanguage[]=es&availableTranslatedLanguage[]=es-la&includes[]=cover_art&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica", headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val offset = (page - 1) * 32
        val url = "$apiBase/manga".toHttpUrl().newBuilder()
            .addQueryParameter("limit", "32")
            .addQueryParameter("offset", offset.toString())
            .addQueryParameter("includes[]", "cover_art")
            .addQueryParameter("contentRating[]", "safe")
            .addQueryParameter("contentRating[]", "suggestive")
            .addQueryParameter("contentRating[]", "erotica")

        if (query.isNotBlank()) {
            url.addQueryParameter("title", query.trim())
        }

        var orderField = "followedCount"
        var orderDir = "desc"
        var selectedLang = "all_es"

        for (filter in filters) {
            when (filter) {
                is LanguageFilter -> {
                    selectedLang = filter.toUriPart()
                }
                is SortFilter -> {
                    when (filter.state) {
                        0 -> { orderField = "followedCount"; orderDir = "desc" }
                        1 -> { orderField = "rating"; orderDir = "desc" }
                        2 -> { orderField = "latestUploadedChapter"; orderDir = "desc" }
                        3 -> { orderField = "title"; orderDir = "asc" }
                    }
                }
                is StatusFilter -> {
                    val statusPart = filter.toUriPart()
                    if (statusPart.isNotEmpty()) url.addQueryParameter("status[]", statusPart)
                }
                is DemographicFilter -> {
                    val demoPart = filter.toUriPart()
                    if (demoPart.isNotEmpty()) url.addQueryParameter("publicationDemographic[]", demoPart)
                }
                is TagFilter -> {
                    val tagId = filter.toUriPart()
                    if (tagId.isNotEmpty()) url.addQueryParameter("includedTags[]", tagId)
                }
                else -> {}
            }
        }

        when (selectedLang) {
            "es" -> url.addQueryParameter("availableTranslatedLanguage[]", "es")
            "es-la" -> url.addQueryParameter("availableTranslatedLanguage[]", "es-la")
            else -> {
                url.addQueryParameter("availableTranslatedLanguage[]", "es")
                url.addQueryParameter("availableTranslatedLanguage[]", "es-la")
            }
        }

        url.addQueryParameter("order[$orderField]", orderDir)
        return GET(url.build().toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsRequest(manga: SManga): Request {
        val id = manga.url.substringAfterLast("/")
        return GET("$apiBase/manga/$id?includes[]=cover_art&includes[]=author&includes[]=artist", headers)
    }

    override fun mangaDetailsParse(response: Response): SManga {
        val body = response.body.string()
        val json = JSONObject(body)
        val data = json.optJSONObject("data") ?: return SManga.create()
        val id = data.optString("id")
        val attr = data.optJSONObject("attributes") ?: JSONObject()

        val titleStr = extractBestTitle(attr)
        val descStr = extractBestDescription(attr)

        var coverFileName = ""
        var authorName = ""
        var artistName = ""
        val rels = data.optJSONArray("relationships")
        if (rels != null) {
            for (j in 0 until rels.length()) {
                val rel = rels.getJSONObject(j)
                val type = rel.optString("type")
                if (type == "cover_art") {
                    coverFileName = rel.optJSONObject("attributes")?.optString("fileName") ?: ""
                } else if (type == "author") {
                    authorName = rel.optJSONObject("attributes")?.optString("name") ?: ""
                } else if (type == "artist") {
                    artistName = rel.optJSONObject("attributes")?.optString("name") ?: ""
                }
            }
        }

        val tagsArray = attr.optJSONArray("tags")
        val tagList = mutableListOf<String>()
        if (tagsArray != null) {
            for (k in 0 until tagsArray.length()) {
                val tagItem = tagsArray.getJSONObject(k)
                val tagName = tagItem.optJSONObject("attributes")?.optJSONObject("name")?.optString("en")
                if (!tagName.isNullOrEmpty()) tagList.add(tagName)
            }
        }

        val statusStr = attr.optString("status")
        val statusVal = when (statusStr) {
            "ongoing" -> SManga.ONGOING
            "completed" -> SManga.COMPLETED
            "hiatus" -> SManga.ON_HIATUS
            "cancelled" -> SManga.CANCELLED
            else -> SManga.ONGOING
        }

        return SManga.create().apply {
            title = titleStr
            thumbnail_url = if (coverFileName.isNotEmpty()) "https://uploads.mangadex.org/covers/$id/$coverFileName" else null
            description = descStr
            genre = tagList.joinToString(", ")
            author = authorName.ifEmpty { null }
            artist = artistName.ifEmpty { null }
            status = statusVal
            initialized = true
        }
    }

    override fun chapterListRequest(manga: SManga): Request {
        val id = manga.url.substringAfterLast("/")
        return GET("$apiBase/manga/$id/feed?limit=500&offset=0&translatedLanguage[]=es&translatedLanguage[]=es-la&order[chapter]=desc&order[volume]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&includeEmptyPages=0&includes[]=scanlation_group", headers)
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()
        val reqUrl = response.request.url.toString()
        val mangaId = reqUrl.substringAfter("manga/").substringBefore("/feed")

        var offset = 0
        val limit = 500
        var total = 0
        var currentBody = response.body.string()

        do {
            try {
                val json = JSONObject(currentBody)
                val dataArray = json.optJSONArray("data") ?: break
                total = json.optInt("total", 0)

                for (i in 0 until dataArray.length()) {
                    val item = dataArray.getJSONObject(i)
                    val id = item.optString("id")
                    if (!seen.add(id)) continue

                    val attr = item.optJSONObject("attributes") ?: continue
                    val lang = attr.optString("translatedLanguage").trim().lowercase()
                    val isSpanish = lang == "es" || lang == "es-la" || lang == "es-419" || lang.startsWith("es")
                    if (!isSpanish) continue

                    val chNumStr = attr.optString("chapter").trim()
                    val chTitle = attr.optString("title").trim()

                    var scanGroup = ""
                    val rels = item.optJSONArray("relationships")
                    if (rels != null) {
                        for (j in 0 until rels.length()) {
                            val rel = rels.getJSONObject(j)
                            if (rel.optString("type") == "scanlation_group") {
                                scanGroup = rel.optJSONObject("attributes")?.optString("name") ?: ""
                                if (scanGroup.isNotEmpty()) break
                            }
                        }
                    }

                    val isSpainSpanish = lang == "es" || lang == "es-es"
                    val langBadge = if (isSpainSpanish) "🇪🇸 ES" else "🇲🇽 LAT"
                    val langTag = if (isSpainSpanish) "[ES]" else "[LAT]"

                    val chapterTitle = if (chNumStr.isNotEmpty() && chNumStr != "null") {
                        if (chTitle.isNotEmpty() && chTitle != "null") "Capítulo $chNumStr - $chTitle $langTag" else "Capítulo $chNumStr $langTag"
                    } else {
                        if (chTitle.isNotEmpty() && chTitle != "null") "$chTitle $langTag" else "Capítulo único $langTag"
                    }

                    val chapterNumber = if (chNumStr.isNotEmpty() && chNumStr != "null") {
                        Regex("""(\d+(\.\d+)?)""").find(chNumStr)?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()
                    } else {
                        (chapters.size + 1).toFloat()
                    }

                    val publishDateStr = attr.optString("publishAt").ifEmpty { attr.optString("readableAt") }
                    val uploadDate = parseDate(publishDateStr)

                    val chapter = SChapter.create().apply {
                        this.url = "/chapter/$id"
                        this.name = chapterTitle
                        this.chapter_number = chapterNumber
                        this.scanlator = if (scanGroup.isNotEmpty()) "$langBadge • $scanGroup" else langBadge
                        this.date_upload = uploadDate
                    }
                    chapters.add(chapter)
                }

                offset += limit
                if (offset < total && offset <= 10000) {
                    val nextUrl = "$apiBase/manga/$mangaId/feed?limit=$limit&offset=$offset&translatedLanguage[]=es&translatedLanguage[]=es-la&order[chapter]=desc&order[volume]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic&includeEmptyPages=0&includes[]=scanlation_group"
                    val nextResp = client.newCall(GET(nextUrl, headers)).execute()
                    currentBody = nextResp.body.string()
                }
            } catch (e: Exception) {
                break
            }
        } while (offset < total && offset <= 10000)

        return chapters.sortedWith(
            compareByDescending<SChapter> { it.chapter_number }
                .thenBy { if (it.scanlator?.contains("ES") == true || it.name.contains("[ES]")) 0 else 1 }
        )
    }

    private fun parseDate(dateStr: String): Long {
        if (dateStr.isBlank()) return 0L
        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            format.parse(dateStr.substringBefore('+').substringBefore('Z'))?.time ?: 0L
        } catch (_: Exception) {
            0L
        }
    }

    override fun pageListRequest(chapter: SChapter): Request {
        val id = chapter.url.substringAfterLast("/")
        return GET("$apiBase/at-home/server/$id", headers)
    }

    override fun pageListParse(response: Response): List<Page> {
        val body = response.body.string()
        val json = JSONObject(body)
        val serverUrl = json.optString("baseUrl")
        val chapterObj = json.optJSONObject("chapter") ?: return emptyList()
        val hash = chapterObj.optString("hash")
        val dataArray = chapterObj.optJSONArray("data") ?: return emptyList()

        val pages = mutableListOf<Page>()
        for (i in 0 until dataArray.length()) {
            val fileName = dataArray.getString(i)
            val pageUrl = "$serverUrl/data/$hash/$fileName"
            pages.add(Page(i, "", pageUrl))
        }
        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    // --- Filters ---
    override fun getFilterList(): FilterList = FilterList(
        LanguageFilter(),
        SortFilter(),
        StatusFilter(),
        DemographicFilter(),
        TagFilter(),
    )

    private class LanguageFilter : Filter.Select<String>(
        "Idioma de traducción",
        arrayOf("Todos en Español (España y LATAM)", "Solo España (ES 🇪🇸)", "Solo Latinoamérica (LAT 🇲🇽)"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "es"
            2 -> "es-la"
            else -> "all_es"
        }
    }

    private class SortFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Más Seguidos", "Mejor Calificados", "Última Actualización", "Alfabético (A-Z)"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> "followedCount"
            1 -> "rating"
            2 -> "latestUploadedChapter"
            3 -> "title"
            else -> "followedCount"
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "En emisión", "Completado", "En pausa", "Cancelado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "ongoing"
            2 -> "completed"
            3 -> "hiatus"
            4 -> "cancelled"
            else -> ""
        }
    }

    private class DemographicFilter : Filter.Select<String>(
        "Demografía",
        arrayOf("Todos", "Shounen", "Shoujo", "Seinen", "Josei"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "shounen"
            2 -> "shoujo"
            3 -> "seinen"
            4 -> "josei"
            else -> ""
        }
    }

    private class TagFilter : Filter.Select<String>(
        "Género / Tag",
        tags.map { it.first }.toTypedArray(),
    ) {
        fun toUriPart(): String = tags[state].second

        companion object {
            private val tags = arrayOf(
                Pair("Todos", ""),
                Pair("Acción", "391b0423-d847-456f-aff0-8b0cfc03066b"),
                Pair("Aventura", "87cc87cd-a395-47af-b27a-93258283bbc6"),
                Pair("Comedia", "4d32cc48-9f00-4cca-9b5a-a839f0764984"),
                Pair("Drama", "b9af3a63-f058-46de-a9a0-e0c13906197a"),
                Pair("Fantasía", "cdc58593-87dd-415e-bbc0-2ec27bf404cc"),
                Pair("Romance", "423e2eae-a7a2-4a8b-ac03-a8351462d71d"),
                Pair("Sci-Fi", "256c8bd9-4904-4360-bf4f-508a76d67183"),
                Pair("Sobrenatural", "e12b6803-37cc-46c5-ac30-2c478a444107"),
                Pair("Misterio", "ee968100-4191-4968-93d3-f82d86e077b8"),
                Pair("Psicológico", "3b60b75c-a2d7-4860-ab56-05f391bb8179"),
                Pair("Recuentos de la vida", "e5301a23-ebd9-49dd-a0cb-2add944c7fe9"),
                Pair("Isekai", "ace04997-f6bd-436e-b261-779182193d3d"),
                Pair("Magia", "a1f53773-c69a-4941-852b-44b68a97cae0"),
                Pair("Artes Marciales", "799c5027-f4e2-4038-abf6-88b835ffb30e"),
                Pair("Reencarnación", "0a39b5a1-b225-4966-ac00-525afcece386"),
                Pair("Vida Escolar", "caaa44eb-cd40-4177-b930-79d3ef210a0a"),
                Pair("Vampiros", "d7d17d07-8880-4b3e-acf9-ecce91597637"),
                Pair("Web Comic", "e197df38-d0e7-43b5-9b09-2842d0c326dd"),
            )
        }
    }
}

