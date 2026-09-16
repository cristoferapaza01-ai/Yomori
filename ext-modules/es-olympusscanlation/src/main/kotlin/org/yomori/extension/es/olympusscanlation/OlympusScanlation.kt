package org.yomori.extension.es.olympusscanlation

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

class OlympusScanlation : HttpSource() {

    override val name = "Olympus Scanlation"
    override val baseUrl = "https://olympusxyz.com"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/series")

    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/api/rankings?page=$page", headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val body = response.body.string()
        val json = JSONObject(body)
        val dataArray = json.optJSONArray("data")
            ?: json.optJSONObject("data")?.optJSONObject("series")?.optJSONArray("data")
            ?: json.optJSONObject("data")?.optJSONArray("series")
            ?: json.optJSONObject("data")?.optJSONArray("data")
            ?: return MangasPage(emptyList(), false)

        val mangas = mutableListOf<SManga>()
        for (i in 0 until dataArray.length()) {
            val item = dataArray.getJSONObject(i)
            val slug = item.optString("slug")
            val title = item.optString("name").trim()
            val cover = item.optString("cover")
            val type = item.optString("type")
            val lastCaps = item.optJSONArray("last_chapters")
            val firstCap = lastCaps?.optJSONObject(0)
            val capName = firstCap?.optString("name")
            val pubAt = firstCap?.optString("published_at") ?: ""
            val dateUpload = if (pubAt.isNotEmpty()) parseDate(pubAt) else 0L

            val desc = when {
                !capName.isNullOrEmpty() && dateUpload > 0L -> "Capítulo $capName||$dateUpload"
                !capName.isNullOrEmpty() -> "Capítulo $capName"
                else -> ""
            }

            val manga = SManga.create().apply {
                this.url = "/series/${if (type.isNotEmpty() && type != "comic") "$type-" else "comic-"}$slug"
                this.title = title
                this.thumbnail_url = cover
                this.description = desc
                this.initialized = true
            }
            mangas.add(manga)
        }

        val lastPage = json.optInt("last_page", 0).takeIf { it > 0 }
            ?: json.optJSONObject("meta")?.optInt("last_page", 0)?.takeIf { it > 0 }
            ?: json.optJSONObject("data")?.optJSONObject("series")?.optInt("last_page", 1)
            ?: 1
        val currentPage = json.optInt("current_page", 0).takeIf { it > 0 }
            ?: json.optJSONObject("meta")?.optInt("current_page", 0)?.takeIf { it > 0 }
            ?: json.optJSONObject("data")?.optJSONObject("series")?.optInt("current_page", 1)
            ?: 1

        return MangasPage(mangas, currentPage < lastPage)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/api/new-chapters?page=$page", headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val url = "$baseUrl/api/series".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())

        if (query.isNotBlank()) {
            url.addQueryParameter("name", query.trim())
        }

        for (filter in filters) {
            when (filter) {
                is SortFilter -> {
                    val sort = filter.toUriPart()
                    if (sort.isNotEmpty()) url.addQueryParameter("sort", sort)
                }
                is TypeFilter -> {
                    val type = filter.toUriPart()
                    if (type.isNotEmpty()) url.addQueryParameter("type", type)
                }
                is StatusFilter -> {
                    val status = filter.toUriPart()
                    if (status.isNotEmpty()) url.addQueryParameter("status", status)
                }
                else -> {}
            }
        }

        return GET(url.build().toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    private fun getSlugFromUrl(url: String): String {
        val clean = url.trimEnd('/').substringAfterLast('/')
        return clean.removePrefix("comic-").removePrefix("novel-").removePrefix("manga-")
    }

    private fun getTypeFromUrl(url: String): String {
        val clean = url.trimEnd('/').substringAfterLast('/')
        return when {
            clean.startsWith("novel-") -> "novel"
            clean.startsWith("manga-") -> "manga"
            else -> "comic"
        }
    }

    override fun mangaDetailsRequest(manga: SManga): Request {
        val slug = getSlugFromUrl(manga.url)
        return GET("$baseUrl/api/series/$slug", headers)
    }

    override fun mangaDetailsParse(response: Response): SManga {
        val body = response.body.string()
        return try {
            val json = JSONObject(body)
            val data = json.optJSONObject("data") ?: json
            val genresList = mutableListOf<String>()
            val genresArr = data.optJSONArray("genres")
            if (genresArr != null) {
                for (i in 0 until genresArr.length()) {
                    genresList.add(genresArr.getJSONObject(i).optString("name"))
                }
            }

            SManga.create().apply {
                title = data.optString("name").trim()
                thumbnail_url = data.optString("cover")
                description = data.optString("summary").trim()
                genre = genresList.joinToString(", ")
                val statusStr = data.optJSONObject("status")?.optString("name") ?: data.optString("status")
                status = when {
                    statusStr.contains("Activo", ignoreCase = true) -> SManga.ONGOING
                    statusStr.contains("Finalizado", ignoreCase = true) -> SManga.COMPLETED
                    else -> SManga.ONGOING
                }
                initialized = true
            }
        } catch (e: Exception) {
            SManga.create().apply {
                title = "Olympus Comic"
                status = SManga.ONGOING
                initialized = true
            }
        }
    }

    override fun chapterListRequest(manga: SManga): Request {
        val slug = getSlugFromUrl(manga.url)
        val type = getTypeFromUrl(manga.url)
        return GET("https://panel.olympusxyz.com/api/series/$slug/chapters?page=1&direction=desc&type=$type", headers)
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val chapters = mutableListOf<SChapter>()
        val reqUrl = response.request.url
        val slug = reqUrl.encodedPath.substringAfter("series/").substringBefore("/chapters")
        val type = reqUrl.queryParameter("type") ?: "comic"

        var currentPage = 1
        var totalPages = 1
        var currentBody = response.body.string()

        do {
            try {
                val json = JSONObject(currentBody)
                val dataArray = json.optJSONArray("data") ?: break
                totalPages = json.optJSONObject("meta")?.optInt("last_page", 1)
                    ?: json.optInt("last_page", 1)

                for (i in 0 until dataArray.length()) {
                    val item = dataArray.getJSONObject(i)
                    val id = item.optString("id")
                    val name = item.optString("name").trim()
                    val dateStr = item.optString("published_at")

                    val chapter = SChapter.create().apply {
                        url = "/capitulo/$id/$type-$slug"
                        this.name = if (name.startsWith("Capítulo", true) || name.startsWith("Cap", true)) name else "Capítulo $name"
                        chapter_number = Regex("""(\d+(\.\d+)?)""").find(name)?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()
                        date_upload = parseDate(dateStr)
                    }
                    chapters.add(chapter)
                }

                currentPage++
                if (currentPage <= totalPages && currentPage <= 100) {
                    val nextUrl = "https://panel.olympusxyz.com/api/series/$slug/chapters?page=$currentPage&direction=desc&type=$type"
                    val nextResp = client.newCall(GET(nextUrl, headers)).execute()
                    currentBody = nextResp.body.string()
                }
            } catch (e: Exception) {
                break
            }
        } while (currentPage <= totalPages && currentPage <= 100)

        return chapters.sortedByDescending { it.chapter_number }
    }

    private fun parseDate(dateStr: String): Long {
        if (dateStr.isBlank()) return 0L
        return try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            format.parse(dateStr.substringBefore('.'))?.time ?: 0L
        } catch (e: Exception) {
            0L
        }
    }

    override fun pageListParse(response: Response): List<Page> {
        val html = response.body.string()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        // 1. Search in Nuxt Data / JSON
        val regex = Regex("""https://[^"'\s\\]+?\.(?:webp|jpg|jpeg|png)""")
        val matches = regex.findAll(html)
        for (m in matches) {
            val url = m.value.replace("\\/", "/")
            if ((url.contains("media") || url.contains("imagesolymp") || url.contains("comics") || url.contains("storage/chapters")) 
                && !url.contains("cover") && !url.contains("avatar") && !url.contains("logo")
                && seen.add(url)) {
                pages.add(Page(pages.size, "", url))
            }
        }

        // 2. Fallback to Jsoup elements
        if (pages.isEmpty()) {
            val document = org.jsoup.Jsoup.parse(html, baseUrl)
            val imgElements = document.select("img[src*='media'], img[src*='imagesolymp'], img[src*='comics'], img[src*='storage/chapters']")
            imgElements.forEach { el ->
                val src = el.attr("abs:src").ifEmpty { el.attr("data-src").ifEmpty { el.attr("src") } }
                if (src.isNotEmpty() && seen.add(src)) {
                    pages.add(Page(pages.size, "", src))
                }
            }
        }

        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    // --- Filters ---
    override fun getFilterList(): FilterList = FilterList(
        SortFilter(),
        StatusFilter(),
        TypeFilter(),
    )

    private class SortFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Populares", "Últimas Actualizaciones", "Nuevos"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> ""
            1 -> "latest"
            2 -> "new"
            else -> ""
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "Activo", "Finalizado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "active"
            2 -> "completed"
            else -> ""
        }
    }

    private class TypeFilter : Filter.Select<String>(
        "Tipo",
        arrayOf("Todos", "Comic", "Novela"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "comic"
            2 -> "novel"
            else -> ""
        }
    }
}
