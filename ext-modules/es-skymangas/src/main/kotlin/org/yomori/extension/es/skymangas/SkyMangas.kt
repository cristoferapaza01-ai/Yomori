package org.yomori.extension.es.skymangas

import eu.kanade.tachiyomi.network.GET
import eu.kanade.tachiyomi.source.model.Filter
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import eu.kanade.tachiyomi.util.asJsoup
import okhttp3.Headers
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject

class SkyMangas : HttpSource() {

    override val name = "SkyMangas"
    override val baseUrl = "https://skymangas.com"
    private val apiBase = "https://api.skymangas.com"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")
        .add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/explorar?page=$page", headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val elements = document.select("a[href*='/manhua/'], a[href*='/manga/'], .element, .card, .manga-item")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.select("a[href*='/manhua/'], a[href*='/manga/']").firstOrNull() ?: continue
            val href = link.attr("href")
            if (href.isEmpty() || href.endsWith("/manhuas") || href.endsWith("/mangas") || href.contains("/leer/") || !seen.add(href)) continue

            val rawTitle = link.select(".title, h3, h4, .entry-title").firstOrNull()?.text()?.trim()
                ?: link.attr("title").ifEmpty { link.text().trim() }
            val title = rawTitle.replace(Regex("""^\d+(\.\d+)?\s+"""), "").replace(Regex("""Cap\.\s*\d+.*""", RegexOption.IGNORE_CASE), "").trim()
            if (title.isEmpty() || title.length <= 1 || title.equals("Inicio", true) || title.equals("Biblioteca", true) || title.equals("Explorar", true)) continue

            val slug = href.trimEnd('/').substringAfterLast("/")
            var cover = el.select("img").firstOrNull()?.let {
                it.attr("abs:src").ifEmpty { it.attr("abs:data-src").ifEmpty { it.attr("src") } }
            } ?: ""
            if (cover.isEmpty()) {
                cover = "$apiBase/uploads/covers/$slug/${slug}_cover_thumb.webp"
            }

            val capMatch = Regex("""(?:Cap[íi]tulo|Cap\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(el.text() + " " + rawTitle)
            val timeMatch = Regex("""(?:hace\s+\d+\s*(?:s|seg|min|m|h|hora|horas|d|d[íi]as|dias))""", RegexOption.IGNORE_CASE).find(el.text())
            val capNum = capMatch?.groupValues?.get(1)
            val capDesc = when {
                capNum != null && timeMatch != null -> "Capítulo $capNum | ${timeMatch.value}"
                capNum != null -> "Capítulo $capNum"
                else -> ""
            }

            val manga = SManga.create().apply {
                this.url = if (href.startsWith("http")) href.removePrefix(baseUrl) else href
                this.title = title
                this.thumbnail_url = cover
                this.description = capDesc
                this.initialized = true
            }
            mangas.add(manga)
        }

        val hasNext = document.select("a[rel=next], .next, .pagination-next").isNotEmpty() || mangas.size >= 12
        return MangasPage(mangas, hasNext)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/explorar?order=update&page=$page", headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val url = "$baseUrl/explorar".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())

        if (query.isNotBlank()) {
            url.addQueryParameter("q", query.trim())
        }

        for (filter in filters) {
            when (filter) {
                is OrderFilter -> {
                    val orderPart = filter.toUriPart()
                    if (orderPart.isNotEmpty()) url.addQueryParameter("order", orderPart)
                }
                is StatusFilter -> {
                    val statusPart = filter.toUriPart()
                    if (statusPart.isNotEmpty()) url.addQueryParameter("status", statusPart)
                }
                is GenreFilter -> {
                    val genrePart = filter.toUriPart()
                    if (genrePart.isNotEmpty()) url.addQueryParameter("genre", genrePart)
                }
                else -> {}
            }
        }

        return GET(url.build().toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsRequest(manga: SManga): Request {
        val slug = manga.url.trimEnd('/').substringAfterLast("/")
        return GET("$apiBase/api/v1/manhuas/$slug", headers)
    }

    override fun mangaDetailsParse(response: Response): SManga {
        val body = response.body.string()
        return try {
            val json = JSONObject(body)
            val data = json.optJSONObject("data") ?: json
            val titleStr = data.optString("title").trim()
            val synStr = data.optString("synopsis").trim()
            val coverUrl = data.optString("coverUrl")
            val slug = data.optString("slug")

            val genresList = mutableListOf<String>()
            val genresArr = data.optJSONArray("genres")
            if (genresArr != null) {
                for (i in 0 until genresArr.length()) {
                    val g = genresArr.opt(i)
                    if (g is JSONObject) {
                        genresList.add(g.optString("name"))
                    } else if (g is String) {
                        genresList.add(g)
                    }
                }
            }

            val coverFinal = if (coverUrl.isNotEmpty()) {
                if (coverUrl.startsWith("http")) coverUrl else "$apiBase$coverUrl"
            } else {
                "$apiBase/uploads/covers/$slug/${slug}_cover.webp"
            }

            SManga.create().apply {
                title = titleStr
                thumbnail_url = coverFinal
                description = synStr
                genre = genresList.filter { it.isNotEmpty() }.joinToString(", ")
                author = data.optString("author").ifEmpty { "SkyMangas" }
                artist = data.optString("artist").ifEmpty { "SkyMangas" }
                status = if (data.optInt("statusId", 1) == 1) SManga.ONGOING else SManga.COMPLETED
                initialized = true
            }
        } catch (e: Exception) {
            val document = response.asJsoup()
            SManga.create().apply {
                title = document.select("h1, .entry-title").firstOrNull()?.text()?.trim() ?: "SkyMangas Manhua"
                thumbnail_url = document.select("img[src*='cover'], img.thumb").firstOrNull()?.let {
                    it.attr("abs:src").ifEmpty { it.attr("src") }
                }
                description = document.select("p, .synopsis, .description").text().trim()
                genre = document.select("a[href*='/genero/'], .badge, .tag").map { it.text().trim() }.distinct().joinToString(", ")
                status = SManga.ONGOING
                initialized = true
            }
        }
    }

    override fun chapterListRequest(manga: SManga): Request {
        val slug = manga.url.trimEnd('/').substringAfterLast("/")
        return GET("$apiBase/api/v1/manhuas/$slug", headers)
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()
        val requestUrl = response.request.url.toString()
        val slug = requestUrl.trimEnd('/').substringAfterLast("/")
        val bodyStr = response.body.string()

        // 1. Try to fetch all chapters via SkyMangas API
        try {
            val json = JSONObject(bodyStr)
            val dataObj = json.optJSONObject("data") ?: json
            val manhuaId = dataObj.optInt("id", 0)

            if (manhuaId > 0) {
                var page = 1
                var hasMore = true

                while (hasMore && page <= 60) {
                    val pageUrl = "$apiBase/api/v1/chapters/manhua/$manhuaId?page=$page"
                    val pageResp = client.newCall(GET(pageUrl, headers)).execute()
                    val pageBody = pageResp.body.string()
                    val pageJson = JSONObject(pageBody)
                    val chaptersArr = pageJson.optJSONArray("data")

                    if (chaptersArr == null || chaptersArr.length() == 0) {
                        hasMore = false
                        break
                    }

                    for (i in 0 until chaptersArr.length()) {
                        val chObj = chaptersArr.getJSONObject(i)
                        val chNum = chObj.optDouble("chapterNumber", 0.0).toFloat()
                        val chId = chObj.optInt("id", 0)
                        val chTitle = chObj.optString("title", "").trim()
                        val chSlug = chObj.optString("slug", "").trim()
                        val uniqueKey = if (chId > 0) chId.toString() else "$slug-$chNum"

                        if (!seen.add(uniqueKey)) continue

                        val chName = if (chTitle.isNotEmpty() && chTitle != "null") {
                            "Capítulo ${if (chNum % 1.0f == 0.0f) chNum.toInt().toString() else chNum.toString()} - $chTitle"
                        } else {
                            "Capítulo ${if (chNum % 1.0f == 0.0f) chNum.toInt().toString() else chNum.toString()}"
                        }

                        val pubAt = chObj.optString("publishedAt").ifEmpty { chObj.optString("createdAt") }
                        val dateUpload = parseDate(pubAt)
                        val readUrl = "/leer/$slug/${if (chNum % 1.0f == 0.0f) chNum.toInt().toString() else chNum.toString()}"

                        val chapter = SChapter.create().apply {
                            this.url = readUrl
                            this.name = chName
                            this.chapter_number = chNum
                            this.date_upload = dateUpload
                        }
                        chapters.add(chapter)
                    }

                    if (chaptersArr.length() < 50) {
                        hasMore = false
                    } else {
                        page++
                    }
                }
            }
        } catch (e: Exception) {}

        // 2. Fallback: Parse from web HTML if API didn't return chapters
        if (chapters.isEmpty()) {
            try {
                val doc = if (bodyStr.contains("<html")) org.jsoup.Jsoup.parse(bodyStr, baseUrl)
                          else client.newCall(GET("$baseUrl/manhua/$slug", headers)).execute().asJsoup()
                val elements = doc.select("a[href*='/leer/']")
                for (el in elements) {
                    val href = el.attr("href")
                    if (href.isEmpty() || !seen.add(href)) continue

                    val text = el.text().trim().replace(Regex("""\s+"""), " ")
                    val numMatch = Regex("""/(\d+(\.\d+)?)$""").find(href) ?: Regex("""Cap[^\d]*(\d+(\.\d+)?)""", RegexOption.IGNORE_CASE).find(text)
                    val chapterNumber = numMatch?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()

                    val chapter = SChapter.create().apply {
                        url = if (href.startsWith("http")) href.removePrefix(baseUrl) else href
                        name = if (text.contains("Cap", true)) text else "Capítulo $chapterNumber"
                        chapter_number = chapterNumber
                        date_upload = System.currentTimeMillis()
                    }
                    chapters.add(chapter)
                }
            } catch (e: Exception) {}
        }

        return chapters.sortedByDescending { it.chapter_number }
    }

    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        val imgElements = document.select("img[src*='api.skymangas.com'], img[data-src*='api.skymangas.com'], img[src*='uploads'], img[src*='storage'], .reading-content img, .reader img")
        for (el in imgElements) {
            val rawSrc = el.attr("abs:src").ifEmpty { el.attr("abs:data-src").ifEmpty { el.attr("src") } }
            val src = rawSrc.replace("&amp;", "&").trim()
            if (src.isNotEmpty() && !src.contains("watermark") && !src.contains("logo") && seen.add(src)) {
                pages.add(Page(pages.size, "", src))
            }
        }
        return pages
    }

    private fun parseDate(dateStr: String): Long {
        if (dateStr.isBlank()) return 0L
        return try {
            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            format.parse(dateStr.substringBefore('.'))?.time ?: 0L
        } catch (e: Exception) {
            0L
        }
    }

    override fun imageRequest(page: Page): Request {
        val imageHeaders = headersBuilder()
            .set("Referer", "$baseUrl/")
            .set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
            .build()
        return GET(page.imageUrl!!, imageHeaders)
    }

    override fun imageUrlParse(response: Response): String = ""

    // --- Filters ---
    override fun getFilterList(): FilterList = FilterList(
        OrderFilter(),
        StatusFilter(),
        GenreFilter(),
    )

    private class OrderFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Más Populares", "Últimas Actualizaciones", "Alfabético (A-Z)"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> ""
            1 -> "update"
            2 -> "alphabet"
            else -> ""
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "En emisión", "Finalizado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "ongoing"
            2 -> "completed"
            else -> ""
        }
    }

    private class GenreFilter : Filter.Select<String>(
        "Género",
        genres.map { it.first }.toTypedArray(),
    ) {
        fun toUriPart(): String = genres[state].second

        companion object {
            private val genres = arrayOf(
                Pair("Todos", ""),
                Pair("Acción", "accion"),
                Pair("Artes Marciales", "artes-marciales"),
                Pair("Aventura", "aventura"),
                Pair("Ciencia Ficción", "ciencia-ficcion"),
                Pair("Comedia", "comedia"),
                Pair("Cultivación", "cultivacion"),
                Pair("Demonios", "demonios"),
                Pair("Drama", "drama"),
                Pair("Fantasía", "fantasia"),
                Pair("Harem", "harem"),
                Pair("Isekai", "isekai"),
                Pair("Magia", "magia"),
                Pair("Misterio", "misterio"),
                Pair("Psicológico", "psicologico"),
                Pair("Reencarnación", "reencarnacion"),
                Pair("Recuentos de la vida", "recuentos-de-la-vida"),
                Pair("Romance", "romance"),
                Pair("Sci-Fi", "sci-fi"),
                Pair("Seinen", "seinen"),
                Pair("Shounen", "shounen"),
                Pair("Sistema", "sistema"),
                Pair("Sobrenatural", "sobrenatural"),
                Pair("Superpoderes", "superpoderes"),
                Pair("Tragedia", "tragedia"),
                Pair("Vida Escolar", "vida-escolar"),
                Pair("Webtoon", "webtoon"),
            )
        }
    }
}
