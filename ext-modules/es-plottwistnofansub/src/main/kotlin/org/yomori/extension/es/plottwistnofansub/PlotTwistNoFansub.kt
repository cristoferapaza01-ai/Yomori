package org.yomori.extension.es.plottwistnofansub

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
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Element

class PlotTwistNoFansub : HttpSource() {

    override val name = "Plot Twist No Fansub"
    override val baseUrl = "https://plotnofansub.com"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")

    // ============================== Popular ===============================
    override fun popularMangaRequest(page: Int): Request {
        val url = if (page > 1) {
            "$baseUrl/biblioteca3/page/$page/?m_orderby=trending"
        } else {
            "$baseUrl/biblioteca3?m_orderby=trending"
        }
        return GET(url, headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        val figures = document.select("div.manga-grid-v2 figure, .page-item-detail, .element, .card, article")
        for (element in figures) {
            val a = element.selectFirst("a[href*='/manga/'], a[href*='/series/'], a[href*='/comic/'], a[href]") ?: continue
            val href = a.attr("abs:href").ifEmpty { a.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/" || href == "$baseUrl/biblioteca3" || href.contains("/page/") || !seen.add(href)) continue

            val title = a.attr("title").takeIf { it.isNotBlank() }
                ?: element.selectFirst("figcaption, .post-title, .title, .entry-title, h3, h4")?.text()?.trim()
                ?: a.text().trim()
            if (title.isBlank() || title.length <= 1) continue

            val img = element.selectFirst("img")
            val cover = img?.imgAttr() ?: ""

            val capMatch = Regex("""(?:Cap[íi]tulo|Cap\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(element.text())
            val capDesc = if (capMatch != null) "Capítulo ${capMatch.groupValues[1]}" else ""

            mangas.add(
                SManga.create().apply {
                    setUrlWithoutDomain(href)
                    this.title = title
                    this.thumbnail_url = cover
                    this.description = capDesc
                    this.initialized = true
                }
            )
        }

        val hasNextPage = document.selectFirst("a.next.page-numbers, a.next, a:contains(Siguiente)") != null || mangas.size >= 12
        return MangasPage(mangas, hasNextPage)
    }

    // =============================== Latest ===============================
    override fun latestUpdatesRequest(page: Int): Request {
        val url = if (page > 1) {
            "$baseUrl/biblioteca3/page/$page/?m_orderby=latest3"
        } else {
            "$baseUrl/biblioteca3?m_orderby=latest3"
        }
        return GET(url, headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    // =============================== Search ===============================
    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val encodedQuery = java.net.URLEncoder.encode(query.trim(), "UTF-8")
        if (query.isNotBlank()) {
            val url = if (page > 1) {
                "$baseUrl/page/$page/?s=$encodedQuery&post_type=wp-manga"
            } else {
                "$baseUrl/?s=$encodedQuery&post_type=wp-manga"
            }
            return GET(url, headers)
        }

        var order = "views3"
        val genres = mutableListOf<String>()
        val statuses = mutableListOf<String>()

        for (filter in filters) {
            when (filter) {
                is SortByFilter -> order = filter.selected
                is GenreFilter -> {
                    filter.state.filter { it.state }.forEach { genres.add(it.id) }
                }
                is StatusFilter -> {
                    filter.state.filter { it.state }.forEach { statuses.add(it.id) }
                }
                else -> {}
            }
        }

        val urlBuilder = StringBuilder(if (page > 1) "$baseUrl/biblioteca3/page/$page/?" else "$baseUrl/biblioteca3?")
        urlBuilder.append("m_orderby=").append(order)
        genres.forEach { urlBuilder.append("&genre%5B%5D=").append(it) }
        statuses.forEach { urlBuilder.append("&status%5B%5D=").append(it) }

        return GET(urlBuilder.toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    // =========================== Manga Details ============================
    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        return SManga.create().apply {
            title = document.selectFirst("h1.mn-detail-title, .post-title h1, h1.entry-title, h1")?.text()?.trim() ?: "Manga"
            thumbnail_url = document.selectFirst(".mn-detail-cover-frame img, .summary_image img, img.wp-post-image")?.imgAttr()
            description = document.selectFirst(".mn-detail-synopsis, .description-summary, .summary__content, .entry-content, p")?.text()?.trim()

            val genres = document.select(".mn-detail-genres-desktop a, .genres-content a, a[href*='genre']").map { it.text().trim() }.distinct()
            genre = genres.joinToString(", ")

            author = document.selectFirst(".mn-detail-pill-label:contains(Autor) + .mn-detail-pill-value, .author-content a")?.text()?.trim()
            artist = document.selectFirst(".mn-detail-pill-label:contains(Artista) + .mn-detail-pill-value, .artist-content a")?.text()?.trim()

            val statusPill = document.selectFirst(".mn-detail-pill-value, .post-status .summary-content")?.text() ?: ""
            val statusClass = document.selectFirst(".mn-detail-pill-value")?.classNames()?.firstOrNull { it.startsWith("mn-st-") } ?: ""

            status = when {
                statusClass == "mn-st-emit" || statusPill.contains("en emisión", true) || statusPill.contains("en curso", true) || statusPill.contains("ongoing", true) -> SManga.ONGOING
                statusClass == "mn-st-comp" || statusPill.contains("finalizado", true) || statusPill.contains("completado", true) || statusPill.contains("completed", true) -> SManga.COMPLETED
                statusClass == "mn-st-cancel" || statusPill.contains("cancelado", true) -> SManga.CANCELLED
                statusClass == "mn-st-pause" || statusPill.contains("en espera", true) || statusPill.contains("hiatus", true) -> SManga.ON_HIATUS
                else -> SManga.ONGOING
            }
            initialized = true
        }
    }

    // ============================== Chapters ==============================
    override fun chapterListParse(response: Response): List<SChapter> {
        val document = response.asJsoup()
        val seenUrls = mutableSetOf<String>()
        val chapters = mutableListOf<SChapter>()

        fun parseChapterElement(a: Element) {
            val url = a.attr("abs:href").ifEmpty { a.attr("href") }
            if (url.isEmpty() || !seenUrls.add(url)) return
            val num = a.selectFirst(".mn-detail-chapter-name")?.text()?.trim()
                ?: Regex("""(\d+(\.\d+)?)""").find(a.text())?.groupValues?.get(1) ?: ""
            val extend = a.selectFirst(".mn-detail-chapter-extend")?.text()?.trim() ?: ""
            val rawName = a.text().trim()

            val chapterName = if (num.isNotEmpty()) {
                buildString {
                    append("Capítulo $num")
                    if (extend.isNotEmpty()) append(" - $extend")
                }
            } else if (rawName.isNotEmpty()) {
                rawName
            } else {
                "Capítulo ${chapters.size + 1}"
            }

            val dateEl = a.selectFirst(".mn-detail-chapter-date, span.chapter-release-date, time, .date")
            val dateStr = dateEl?.attr("datetime") ?: dateEl?.text()?.trim()
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
            } catch (_: Exception) {
                0L
            }

            chapters.add(
                SChapter.create().apply {
                    setUrlWithoutDomain(url)
                    name = chapterName
                    chapter_number = num.toFloatOrNull() ?: (chapters.size + 1).toFloat()
                    date_upload = dateUpload
                }
            )
        }

        // Chapters rendered directly in the page HTML
        document.select("a.mn-detail-chapter-item, li.wp-manga-chapter a, .chapter-item a, a[href*='/capitulo/'], a[href*='/chapter/']").forEach { parseChapterElement(it) }

        // Try to load additional chapters via AJAX if manga ID is found
        val mangaId = document.selectFirst("#mn-detail-load-more")?.attr("data-manga")
            ?: document.selectFirst("script:containsData(mnWpMangaId)")?.data()?.let { MANGA_ID_REGEX.find(it)?.groupValues?.get(1) }
            ?: document.selectFirst("script:containsData(manga_id)")?.data()?.let { OLD_MANGA_ID_REGEX.find(it)?.groupValues?.get(1) }

        if (!mangaId.isNullOrEmpty()) {
            var page = 1
            var hasNextPage = true

            while (hasNextPage && page <= 50) {
                try {
                    val form = FormBody.Builder()
                        .add("action", "plot_load_chapters")
                        .add("manga_id", mangaId)
                        .add("page", page.toString())
                        .build()

                    val rawJson = client.newCall(
                        POST("$baseUrl/wp-admin/admin-ajax.php", headers, form)
                    ).execute().use { it.body.string() }

                    val json = JSONObject(rawJson)
                    val dataObj = json.optJSONObject("data") ?: break
                    val html = dataObj.optString("html")
                    if (html.isEmpty()) break

                    val fragment = Jsoup.parseBodyFragment(html, baseUrl)
                    val newChapters = fragment.body().select("a.mn-detail-chapter-item")
                    if (newChapters.isEmpty()) break

                    newChapters.forEach { parseChapterElement(it) }
                    hasNextPage = dataObj.optBoolean("has_more", false) || dataObj.optBoolean("hasMore", false)
                    page++
                } catch (e: Exception) {
                    break
                }
            }
        }

        return chapters.sortedByDescending { it.chapter_number }
    }

    // =============================== Pages ================================
    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        val imgElements = (
            document.select("div.reading-content img").ifEmpty {
                document.select("img.wp-manga-chapter-img")
            }.ifEmpty {
                document.select(".chapter-content img")
            }.ifEmpty {
                document.select("img.attachment-full")
            }.ifEmpty {
                document.select("div.pg-box img, div.page-break img")
            }
        )

        for (img in imgElements) {
            val src = img.imgAttr()
            if (src.isNotEmpty() && !src.contains("logo") && !src.startsWith("data:image") && seen.add(src)) {
                pages.add(Page(pages.size, "", src))
            }
        }
        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    private fun Element.imgAttr(): String {
        val url = when {
            hasAttr("data-src") -> attr("abs:data-src").ifEmpty { attr("data-src") }
            hasAttr("data-lazy-src") -> attr("abs:data-lazy-src").ifEmpty { attr("data-lazy-src") }
            hasAttr("srcset") -> attr("abs:srcset").ifEmpty { attr("srcset") }.substringBefore(" ")
            else -> attr("abs:src").ifEmpty { attr("src") }
        }
        return url.trim()
    }

    override fun getFilterList(): FilterList = FilterList(
        SortByFilter("Ordenar por", getSorts()),
        Filter.Separator(),
        StatusFilter("Estado", getStatuses()),
        GenreFilter("Géneros", getGenres()),
    )

    private class SortByFilter(name: String, val options: List<Pair<String, String>>) :
        Filter.Select<String>(name, options.map { it.first }.toTypedArray()) {
        val selected: String get() = options[state].second
    }

    private class GenreVal(val id: String, name: String) : Filter.CheckBox(name)
    private class GenreFilter(name: String, genres: List<GenreVal>) : Filter.Group<GenreVal>(name, genres)

    private class StatusVal(val id: String, name: String) : Filter.CheckBox(name)
    private class StatusFilter(name: String, statuses: List<StatusVal>) : Filter.Group<StatusVal>(name, statuses)

    private fun getSorts() = listOf(
        Pair("Tendencias", "trending"),
        Pair("Más vistos", "views3"),
        Pair("Últimos subidos", "latest3"),
        Pair("Mejor calificados", "rating"),
        Pair("Alfabético", "alphabet"),
        Pair("Nuevos", "new3"),
    )

    private fun getStatuses() = listOf(
        StatusVal("on-going", "En emisión"),
        StatusVal("end", "Finalizado"),
        StatusVal("canceled", "Cancelado"),
        StatusVal("on-hold", "En pausa"),
    )

    private fun getGenres() = listOf(
        GenreVal("accion", "Acción"),
        GenreVal("artes-marciales", "Artes Marciales"),
        GenreVal("aventura", "Aventura"),
        GenreVal("ciencia-ficcion", "Ciencia Ficción"),
        GenreVal("comedia", "Comedia"),
        GenreVal("cultivacion", "Cultivo"),
        GenreVal("demonios", "Demonios"),
        GenreVal("drama", "Drama"),
        GenreVal("fantasia", "Fantasía"),
        GenreVal("harem", "Harem"),
        GenreVal("historico", "Histórico"),
        GenreVal("isekai", "Isekai"),
        GenreVal("magia", "Magia"),
        GenreVal("misterio", "Misterio"),
        GenreVal("psicologico", "Psicológico"),
        GenreVal("reencarnacion", "Reencarnación"),
        GenreVal("romance", "Romance"),
        GenreVal("seinen", "Seinen"),
        GenreVal("shounen", "Shounen"),
        GenreVal("sobrenatural", "Sobrenatural"),
        GenreVal("superpoderes", "Superpoderes"),
        GenreVal("sistema", "Sistema"),
        GenreVal("regresion", "Regresión"),
    )

    companion object {
        private val MANGA_ID_REGEX = Regex("""mnWpMangaId\s*=\s*(\d+)""")
        private val OLD_MANGA_ID_REGEX = Regex(""""manga_id"\s*:\s*"(\d+)"""")
    }
}
