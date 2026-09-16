package org.yomori.extension.es.miauscan

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
import org.jsoup.nodes.Element

class MiauScan : HttpSource() {

    override val name = "MiauScan"
    override val baseUrl = "https://leemiau.com"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")

    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/manga/?page=$page&order=popular", headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val elements = document.select(".bsx, .bs, article.bs, .element, .manga-card, div.thumbnail, a[href*='/manga/']")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.select("a[href*='/manga/']").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/manga/" || href == "$baseUrl/manga" || href.contains("/page/") || !seen.add(href)) continue

            val title = el.select(".tt, .title, .entry-title, h4, h3").firstOrNull()?.text()?.trim()
                ?: link.attr("title").ifEmpty { link.text().trim() }
            if (title.isEmpty() || title.length <= 1) continue

            val img = el.selectFirst("img.lm4-poster-image, img")
            var cover = img?.imgAttr() ?: ""
            if (cover.startsWith("data:image")) cover = ""
            if (cover.isNotEmpty() && !cover.startsWith("http")) cover = "$baseUrl$cover"

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

        val hasNext = document.select("a[rel=next], .next, .pagination-next").isNotEmpty() || mangas.size >= 12
        return MangasPage(mangas, hasNext)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/manga/?page=$page&order=update", headers)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val url = "$baseUrl/manga/".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())

        if (query.isNotBlank()) {
            url.addQueryParameter("title", query.trim())
        }

        var orderVal = "popular"
        for (filter in filters) {
            when (filter) {
                is OrderFilter -> orderVal = filter.toUriPart()
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
                    if (genrePart.isNotEmpty()) url.addQueryParameter("genre[]", genrePart)
                }
                else -> {}
            }
        }
        url.addQueryParameter("order", orderVal)

        return GET(url.build().toString(), headers)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        return SManga.create().apply {
            title = document.selectFirst("h1, .entry-title, .title")?.text()?.trim() ?: "MiauScan Manga"
            thumbnail_url = document.selectFirst("img.lm4-poster-image, .thumb img, .series-thumb img, img.wp-post-image, img[src*='uploads']")?.imgAttr()
            description = document.selectFirst(".lm4-summary-full, .lm4-summary-short, .entry-content, .synopsis, .description, .summary, p")?.text()?.trim()

            val genres = document.select(".mgen a, .genres a, a[href*='/genre/'], a[href*='/genres/'], .badge, .tag, a[rel='tag']").map { it.text().trim() }.distinct()
            genre = genres.joinToString(", ")

            val statusText = document.selectFirst(".lm4-poster-status, .tsinfo .imptdt:contains(Estado) i, .status")?.text()?.lowercase() ?: ""
            status = when {
                statusText.contains("complet") || statusText.contains("final") -> SManga.COMPLETED
                statusText.contains("paus") || statusText.contains("hiatus") -> SManga.ON_HIATUS
                statusText.contains("cancel") -> SManga.CANCELLED
                else -> SManga.ONGOING
            }
            initialized = true
        }
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val document = response.asJsoup()
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()

        val elements = document.select("li.chapter-item, .eph-num, ul.clstyle li, li:has(.lm4-chapter-name), a[href*='/capitulo/'], a[href*='-capitulo-']")
        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.selectFirst("a") ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || !seen.add(href)) continue

            val chTitle = el.select(".lm4-chapter-name").text().trim()
            val chSubtitle = el.select(".lm4-chapter-subtitle").text().trim()
            val rawText = if (chTitle.isNotEmpty()) {
                buildString {
                    append(chTitle)
                    if (chSubtitle.isNotEmpty() && chSubtitle != chTitle) {
                        append(" - ")
                        append(chSubtitle)
                    }
                }
            } else {
                el.select(".chapter-name, span, .chapternum").firstOrNull()?.text()?.trim() ?: link.text().trim()
            }

            if (rawText.contains("{{") || rawText.contains("number}}")) continue
            val numMatch = Regex("""(\d+(\.\d+)?)""").find(rawText) ?: Regex("""-capitulo-(\d+(\.\d+)?)""", RegexOption.IGNORE_CASE).find(href)
            val chNum = numMatch?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()

            val dateEl = el.selectFirst("span.chapter-date, time, .date, .chapterdate")
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

            val chapter = SChapter.create().apply {
                setUrlWithoutDomain(href)
                name = if (rawText.isNotBlank()) rawText else "Capítulo $chNum"
                chapter_number = chNum
                date_upload = dateUpload
            }
            chapters.add(chapter)
        }
        return chapters.sortedByDescending { it.chapter_number }
    }

    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        val imgElements = document.select("#readerarea img, .chapter-images img, img[src*='uploads'], img[data-src*='uploads'], div.reading-content img")
        for (el in imgElements) {
            val src = el.imgAttr()
            if (src.isNotEmpty() && !src.contains("logo") && !src.contains("banner") && !src.startsWith("data:image") && seen.add(src)) {
                pages.add(Page(pages.size, "", src))
            }
        }

        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    private fun Element.imgAttr(): String {
        return when {
            hasAttr("data-lazy-src") -> attr("abs:data-lazy-src")
            hasAttr("data-src") -> attr("abs:data-src")
            hasAttr("data-srcset") -> attr("abs:data-srcset").substringBefore(" ")
            hasAttr("srcset") -> attr("abs:srcset").substringBefore(" ")
            hasAttr("src") -> attr("abs:src")
            else -> ""
        }
    }

    // --- Filters ---
    override fun getFilterList(): FilterList = FilterList(
        OrderFilter(),
        StatusFilter(),
        TypeFilter(),
        GenreFilter(),
    )

    private class OrderFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Popularidad", "Actualización", "Alfabético (A-Z)", "Nuevos", "Calificación"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> "popular"
            1 -> "update"
            2 -> "title"
            3 -> "latest"
            4 -> "rating"
            else -> "popular"
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "Publicándose", "Completado", "En pausa", "Cancelado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "publishing"
            2 -> "completed"
            3 -> "hiatus"
            4 -> "cancelled"
            else -> ""
        }
    }

    private class TypeFilter : Filter.Select<String>(
        "Tipo",
        arrayOf("Todos", "Manga", "Manhwa", "Manhua", "Comic"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "manga"
            2 -> "manhwa"
            3 -> "manhua"
            4 -> "comic"
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
                Pair("Animación", "animacion"),
                Pair("Apocalíptico", "apocaliptico"),
                Pair("Artes Marciales", "artes-marciales"),
                Pair("Aventura", "aventura"),
                Pair("Ciencia Ficción", "ciencia-ficcion"),
                Pair("Comedia", "comedia"),
                Pair("Cultivación", "cultivacion"),
                Pair("Demonios", "demonios"),
                Pair("Deporte", "deporte"),
                Pair("Drama", "drama"),
                Pair("Ecchi", "ecchi"),
                Pair("Fantasía", "fantasia"),
                Pair("Fantasía Oscura", "fantasia-oscura"),
                Pair("Género Bender", "genero-bender"),
                Pair("Harem", "harem"),
                Pair("Histórico", "historico"),
                Pair("Horror", "horror"),
                Pair("Isekai", "isekai"),
                Pair("Magia", "magia"),
                Pair("Mecha", "mecha"),
                Pair("Militar", "militar"),
                Pair("Misterio", "misterio"),
                Pair("Monstruos", "monstruos"),
                Pair("Música", "musica"),
                Pair("Post-apocalíptico", "post-apocaliptico"),
                Pair("Psicológico", "psicologico"),
                Pair("Realidad Virtual", "realidad-virtual"),
                Pair("Reencarnación", "reencarnacion"),
                Pair("Recuentos de la vida", "recuentos-de-la-vida"),
                Pair("Romance", "romance"),
                Pair("Samurái", "samurai"),
                Pair("Sci-fi", "sci-fi"),
                Pair("Seinen", "seinen"),
                Pair("Shounen", "shounen"),
                Pair("Shoujo", "shoujo"),
                Pair("Sistema", "sistema"),
                Pair("Sobrenatural", "sobrenatural"),
                Pair("Superpoderes", "superpoderes"),
                Pair("Supervivencia", "supervivencia"),
                Pair("Suspense", "suspense"),
                Pair("Tragedia", "tragedia"),
                Pair("Vampiros", "vampiros"),
                Pair("Vida Escolar", "vida-escolar"),
                Pair("Webtoon", "webtoon"),
            )
        }
    }
}
