package org.yomori.extension.es.rnscanlation

import eu.kanade.tachiyomi.network.GET
import eu.kanade.tachiyomi.network.POST
import eu.kanade.tachiyomi.source.model.Filter
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import eu.kanade.tachiyomi.util.asJsoup
import okhttp3.FormBody
import okhttp3.Headers
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import okhttp3.Response
import org.jsoup.nodes.Document

class RNScanlation : HttpSource() {

    override val name = "RN Scanlation"
    override val baseUrl = "https://rncalation.online"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")
        .add("Cookie", "age_verified=1; is_adult=1; r18=1; adult=1")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")

    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/library?sort=views&page=$page", headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val elements = document.select(".lib-grid a.comic-card, a[href*='/comics/'], .element, .card, article, .manga-card")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.select("a[href*='/comics/']").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || href.endsWith("/random") || href == "$baseUrl/comics/" || !seen.add(href)) continue

            val type = el.selectFirst("span.absolute.top-2.left-2")?.text()
            if (type != null && type.contains("Novel", ignoreCase = true)) continue

            val img = el.selectFirst("img")
            val title = el.selectFirst("p.leading-snug, p.line-clamp-2, p[class*='font-semibold'], .title, h2, h3, h4")?.text()?.trim()
                ?: img?.attr("alt")?.trim() ?: link.text().trim()
            if (title.isEmpty() || title.length <= 1) continue

            var cover = img?.attr("abs:data-src")?.ifEmpty { img.attr("abs:src")?.ifEmpty { img.attr("src") } } ?: ""
            if (cover.startsWith("//")) {
                cover = "https:$cover"
            } else if (cover.startsWith("/")) {
                cover = "$baseUrl$cover"
            }

            val capMatch = Regex("""(?:Cap[íi]tulo|Cap\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(el.text())
            val capDesc = if (capMatch != null) "Capítulo ${capMatch.groupValues[1]}" else ""

            val manga = SManga.create().apply {
                setUrlWithoutDomain(href)
                this.title = title
                this.thumbnail_url = cover
                this.description = capDesc
                this.initialized = true
            }
            mangas.add(manga)
        }

        val hasNext = document.selectFirst("a.lib-page-btn--nav:last-child, a[rel=next], .next") != null || mangas.size >= 12
        return MangasPage(mangas, hasNext)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/library?sort=updated&page=$page", headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val url = "$baseUrl/library".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())

        if (query.isNotBlank()) {
            url.addQueryParameter("q", query.trim())
        }

        var sortVal = "views"
        for (filter in filters) {
            when (filter) {
                is SortFilter -> sortVal = filter.toUriPart()
                is StatusFilter -> {
                    val statusPart = filter.toUriPart()
                    if (statusPart.isNotEmpty()) url.addQueryParameter("status", statusPart)
                }
                is TypeFilter -> {
                    val typePart = filter.toUriPart()
                    if (typePart.isNotEmpty()) url.addQueryParameter("type", typePart)
                }
                is GenreFilter -> {
                    val genrePart = filter.toUriPart()
                    if (genrePart.isNotEmpty()) url.addQueryParameter("genre", genrePart)
                }
                else -> {}
            }
        }
        url.addQueryParameter("sort", sortVal)

        return GET(url.build().toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        return SManga.create().apply {
            title = document.select("h1, .comic-title, .title").firstOrNull()?.text()?.trim() ?: "RN Scanlation Comic"
            thumbnail_url = document.select("img[src*='storage'], img[src*='comics'], img[src*='uploads'], .thumb img, img.cover").firstOrNull()?.let {
                var src = it.attr("abs:data-src").ifEmpty { it.attr("abs:src").ifEmpty { it.attr("src") } }
                if (src.startsWith("//")) "https:$src"
                else if (src.startsWith("/")) "$baseUrl$src"
                else src
            }
            description = document.selectFirst("div.comic-page-wrap p[class*=text-], p.description, .synopsis, .summary, p.leading-relaxed")?.text()?.trim()

            val badges = document.select("span.inline-flex.items-center.rounded").map { it.text().lowercase() }
            status = when {
                badges.any { it.contains("emisión") || it.contains("curso") || it.contains("ongoing") } -> SManga.ONGOING
                badges.any { it.contains("completado") || it.contains("completed") } -> SManga.COMPLETED
                badges.any { it.contains("pausa") || it.contains("hiatus") } -> SManga.ON_HIATUS
                badges.any { it.contains("cancelado") || it.contains("cancelled") } -> SManga.CANCELLED
                else -> SManga.ONGOING
            }

            val genres = document.select("span.inline-flex.items-center.rounded, a[href*='genre='], a[href*='/genre/'], .badge")
                .map { it.text().trim() }
                .filter { it.lowercase() !in listOf("emisión", "completado", "pausa", "cancelado") }
                .distinct()
            genre = genres.joinToString(", ")

            document.select(".flex.items-baseline.justify-between.gap-2").forEach { row ->
                val label = row.selectFirst("span.text-\\[var\\(--color-text3\\)\\]")?.text()
                val value = row.selectFirst("span.text-\\[var\\(--color-text2\\)\\]")?.text()
                if (label == "Autor") author = value
                if (label == "Arte") artist = value
            }

            initialized = true
        }
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val document = response.asJsoup()
        val requestUrl = response.request.url.toString()
        val slug = requestUrl.removeSuffix("/").substringAfterLast("/")
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()

        fun addChaptersFromDoc(doc: Document) {
            val elements = doc.select("a[data-chapter-id], a[href*='/leer/'], a[href*='/read/'], a[href*='/capitulo/'], .chapter-item a")
            for (it in elements) {
                var href = it.attr("abs:href").ifEmpty { it.attr("href") }
                if (href.isEmpty() || !seen.add(href)) continue
                if (href.startsWith("/")) href = "$baseUrl$href"

                val numAttr = it.attr("data-chapter-num")
                val labelAttr = it.attr("data-chapter-label").trim()
                val text = if (labelAttr.isNotEmpty()) labelAttr else it.text().trim()

                val numMatch = Regex("""(\d+(\.\d+)?)""").find(if (numAttr.isNotEmpty()) numAttr else text)
                val chNum = numMatch?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()

                val name = if (labelAttr.isNotEmpty()) labelAttr
                    else if (text.isNotEmpty() && text != href) text
                    else "Capítulo ${chNum.toInt()}"

                val timeEl = it.selectFirst("time")
                val dateStr = timeEl?.attr("datetime") ?: timeEl?.text() ?: it.selectFirst("span.date, span.chapter-date, .text-xs")?.text()?.trim()
                val dateUpload = try {
                    if (!dateStr.isNullOrEmpty()) {
                        val relativeMatch = Regex("""(?:hace\s+)?(\d+)\s*(s|seg|min|m|h|hora|horas|d|dia|días|dias)""", RegexOption.IGNORE_CASE).find(dateStr)
                        if (relativeMatch != null) {
                            val amount = relativeMatch.groupValues[1].toLongOrNull() ?: 0L
                            val unit = relativeMatch.groupValues[2].lowercase()
                            val now = System.currentTimeMillis()
                            when {
                                unit.startsWith("s") -> now - (amount * 1000L)
                                unit.startsWith("m") -> now - (amount * 60 * 1000L)
                                unit.startsWith("h") -> now - (amount * 60 * 60 * 1000L)
                                unit.startsWith("d") -> now - (amount * 24 * 60 * 60 * 1000L)
                                else -> 0L
                            }
                        } else 0L
                    } else 0L
                } catch (e: Exception) {
                    0L
                }

                val chapter = SChapter.create().apply {
                    setUrlWithoutDomain(href)
                    this.name = name
                    this.chapter_number = chNum
                    this.date_upload = dateUpload
                }
                chapters.add(chapter)
            }
        }

        // 1. Try endpoint: $baseUrl/comics/$slug/chapters?page=1..N
        if (slug.isNotEmpty() && !requestUrl.contains("/chapters")) {
            var page = 1
            var totalPages = 1
            do {
                try {
                    val pageUrl = "$baseUrl/comics/$slug/chapters?page=$page"
                    val pageResp = client.newCall(GET(pageUrl, headers)).execute()
                    val curPage = pageResp.header("x-page")?.toIntOrNull() ?: page
                    totalPages = pageResp.header("x-pages")?.toIntOrNull() ?: 1
                    val pageDoc = pageResp.asJsoup()
                    addChaptersFromDoc(pageDoc)
                    page++
                } catch (e: Exception) {
                    break
                }
            } while (page <= totalPages && page <= 30)
        }

        // 2. Fallback: Parse from initial document
        if (chapters.isEmpty()) {
            addChaptersFromDoc(document)
        }

        return chapters.sortedByDescending { it.chapter_number }
    }

    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        fun extractImagesFrom(doc: Document) {
            val imgElements = doc.select("img.page-img, img[data-src*='uploads/pages'], img[src*='uploads/pages'], img[data-fallback*='uploads/pages'], .page-wrap img, img[src*='uploads'], img[data-src*='uploads'], img[src*='chapters'], img[src*='comics'], .chapter-images img, #readerarea img")
            for (el in imgElements) {
                var src = el.attr("abs:data-src").ifEmpty {
                    el.attr("data-src").ifEmpty {
                        el.attr("abs:src").ifEmpty {
                            el.attr("src").ifEmpty {
                                el.attr("data-fallback")
                            }
                        }
                    }
                }
                if (src.startsWith("//")) {
                    src = "https:$src"
                } else if (src.startsWith("/")) {
                    src = "$baseUrl$src"
                }
                if (src.isNotEmpty() && !src.contains("logo") && !src.contains("banner") && !src.contains("avatar") && !src.contains("icon") && seen.add(src)) {
                    pages.add(Page(pages.size, "", src))
                }
            }
        }

        // 1. Check if direct images are already present
        extractImagesFrom(document)

        // 2. If no pages found or bridge form exists, execute authorize flow
        if (pages.isEmpty() || document.selectFirst("form#rkf, form[action*='authorize'], form[action*='wp-json']") != null) {
            val form = document.selectFirst("form#rkf, form[action*='authorize'], form[action*='wp-json'], form")
            if (form != null) {
                val action = form.attr("abs:action").ifEmpty { form.attr("action") }
                if (action.isNotEmpty()) {
                    val formBodyBuilder = FormBody.Builder()
                    for (input in form.select("input[name]")) {
                        val name = input.attr("name")
                        val value = input.attr("value")
                        if (name.isNotEmpty()) {
                            formBodyBuilder.add(name, value)
                        }
                    }
                    val requestUrl = response.request.url.toString()
                    val authHeaders = headersBuilder()
                        .set("Referer", requestUrl)
                        .set("Origin", baseUrl)
                        .build()
                    val postRequest = Request.Builder()
                        .url(action)
                        .headers(authHeaders)
                        .post(formBodyBuilder.build())
                        .build()

                    try {
                        val authResponse = client.newCall(postRequest).execute()
                        val authDoc = authResponse.asJsoup()
                        extractImagesFrom(authDoc)
                    } catch (e: Exception) {
                        // ignore and keep parsed pages
                    }
                }
            }
        }

        return pages
    }

    override fun imageRequest(page: Page): Request {
        val imgHeaders = headersBuilder()
            .set("Referer", "$baseUrl/")
            .set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
            .build()
        return GET(page.imageUrl!!, imgHeaders)
    }

    override fun imageUrlParse(response: Response): String = ""

    // --- Filters ---
    override fun getFilterList(): FilterList = FilterList(
        SortFilter(),
        StatusFilter(),
        TypeFilter(),
        GenreFilter(),
    )

    private class SortFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Más Populares", "Últimas Actualizaciones", "Calificación", "Alfabético (A-Z)"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> "views"
            1 -> "updated"
            2 -> "rating"
            3 -> "title"
            else -> "views"
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "En emisión", "Completado", "En pausa", "Cancelado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "Ongoing"
            2 -> "Completed"
            3 -> "Hiatus"
            4 -> "Cancelled"
            else -> ""
        }
    }

    private class TypeFilter : Filter.Select<String>(
        "Tipo",
        arrayOf("Todos", "Manhwa", "Manhua", "Manga", "Novela", "Doujinshi", "Otro"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "Manhwa"
            2 -> "Manhua"
            3 -> "Manga"
            4 -> "Novel"
            5 -> "Doujinshi"
            6 -> "Other"
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
                Pair("Acción", "Acción"),
                Pair("Artes Marciales", "Artes Marciales"),
                Pair("Aventura", "Aventura"),
                Pair("Comedia", "Comedia"),
                Pair("Cultivación", "Cultivación"),
                Pair("Demonios", "Demonios"),
                Pair("Drama", "Drama"),
                Pair("Fantasía", "Fantasía"),
                Pair("Harem", "Harem"),
                Pair("Isekai", "Isekai"),
                Pair("Magia", "Magia"),
                Pair("Misterio", "Misterio"),
                Pair("Psicológico", "Psicológico"),
                Pair("Reencarnación", "Reencarnación"),
                Pair("Romance", "Romance"),
                Pair("Sci-Fi", "Sci-Fi"),
                Pair("Seinen", "Seinen"),
                Pair("Shounen", "Shounen"),
                Pair("Sistema", "Sistema"),
                Pair("Sobrenatural", "Sobrenatural"),
                Pair("Superpoderes", "Superpoderes"),
                Pair("Vida Escolar", "Vida Escolar"),
            )
        }
    }
}
