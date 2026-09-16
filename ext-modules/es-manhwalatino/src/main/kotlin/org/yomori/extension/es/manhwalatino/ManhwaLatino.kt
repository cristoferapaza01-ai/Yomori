package org.yomori.extension.es.manhwalatino

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
import org.jsoup.nodes.Document
import java.text.SimpleDateFormat
import java.util.Locale

class ManhwaLatino : HttpSource() {

    override val name = "Manhwa Latino"
    override val baseUrl = "https://manhwalatino.lat"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")

    private val dateFormat by lazy {
        SimpleDateFormat("MMMM d, yyyy", Locale("es"))
    }

    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/manga/?page=$page&order=popular", headers)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val elements = document.select("div.bsx, div.animposx, .manga-card, article.bs, .element, .page-item-detail")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = el.selectFirst("a[href*='/manga/']") ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/manga/" || href == "$baseUrl/manga" || href.contains("/page/") || href.endsWith("/manga/list-mode") || !seen.add(href)) continue

            val title = link.attr("title").ifEmpty {
                el.selectFirst(".tt, .title, .entry-title, h4, h3")?.text()?.trim() ?: link.text().trim()
            }
            if (title.isEmpty() || title.length <= 1) continue

            val img = el.selectFirst("img")
            var cover = img?.attr("abs:data-src")?.ifEmpty { img.attr("abs:data-lazy-src")?.ifEmpty { img.attr("abs:src")?.ifEmpty { img.attr("src") } } } ?: ""
            if (cover.startsWith("data:image")) {
                cover = img?.attr("abs:data-src")?.ifEmpty { img.attr("abs:data-lazy-src") } ?: ""
            }
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

        val hasNext = document.selectFirst("a[rel=next], .next, .pagination-next, a.r") != null || mangas.size >= 15
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
                is OrderByFilter -> orderVal = filter.toUriPart()
                is StatusFilter -> {
                    val status = filter.toUriPart()
                    if (status.isNotEmpty()) url.addQueryParameter("status", status)
                }
                is TypeFilter -> {
                    val type = filter.toUriPart()
                    if (type.isNotEmpty()) url.addQueryParameter("type", type)
                }
                is GenreFilter -> {
                    val genre = filter.toUriPart()
                    if (genre.isNotEmpty()) url.addQueryParameter("genre[]", genre)
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
            title = document.select("h1.entry-title, h1, .post-title h1").firstOrNull()?.text()?.trim()
                ?.replace(Regex("""&#8211;"""), "-") ?: "Manhwa Latino"
            
            val img = document.select("div.thumb img, .summary_image img, img.wp-post-image").firstOrNull()
            var cover = img?.attr("abs:data-src")?.ifEmpty { img.attr("abs:data-lazy-src")?.ifEmpty { img.attr("abs:src")?.ifEmpty { img.attr("src") } } } ?: ""
            if (cover.startsWith("data:image")) {
                cover = img?.attr("abs:data-src")?.ifEmpty { img.attr("abs:data-lazy-src") } ?: ""
            }
            if (cover.startsWith("//")) cover = "https:$cover"
            else if (cover.startsWith("/")) cover = "$baseUrl$cover"
            thumbnail_url = cover

            description = document.selectFirst("div[itemprop=description], div.entry-content, .synopsis, .description, .summary")?.text()?.trim()

            val genres = document.select("div.gnr a, a[href*='/genres/'], .genres-content a, .mgen a").map { it.text().trim() }.filter { it.isNotEmpty() }.distinct()
            genre = genres.joinToString(", ")

            author = document.select("div.imptdt:contains(Publicado por) i, div.imptdt:contains(Autor) i, div.spe span:contains(Autor)").firstOrNull()?.text()?.trim()
            artist = document.select("div.imptdt:contains(Artista) i, div.spe span:contains(Artista)").firstOrNull()?.text()?.trim()

            val statusText = document.select("div.imptdt:contains(Estado) i, div.spe span:contains(Estado)").firstOrNull()?.text()?.lowercase() ?: ""
            status = when {
                statusText.contains("ongoing") || statusText.contains("emisión") || statusText.contains("emision") || statusText.contains("curso") -> SManga.ONGOING
                statusText.contains("completed") || statusText.contains("complet") || statusText.contains("final") -> SManga.COMPLETED
                statusText.contains("hiatus") || statusText.contains("paus") -> SManga.ON_HIATUS
                statusText.contains("dropped") || statusText.contains("cancel") -> SManga.CANCELLED
                else -> SManga.ONGOING
            }
            initialized = true
        }
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val document = response.asJsoup()
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()

        val elements = document.select("ul.clstyle li, #chapterlist li, div.eplister li, li.wp-manga-chapter, div.mini-letters > a")
        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.selectFirst("a") ?: continue
            var href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || !seen.add(href)) continue
            if (href.startsWith("/")) href = "$baseUrl$href"

            val numAttr = el.attr("data-num")
            val nameSpan = el.selectFirst("span.chapternum, span.chapter-name")?.text()?.trim()
            val text = nameSpan ?: link.text().trim()

            val numMatch = Regex("""(\d+(\.\d+)?)""").find(if (numAttr.isNotEmpty()) numAttr else text)
                ?: Regex("""-capitulo-(\d+(\.\d+)?)""", RegexOption.IGNORE_CASE).find(href)
            val chNum = numMatch?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()

            val dateStr = el.selectFirst("span.chapterdate")?.text()?.trim()
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
                    } else {
                        dateFormat.parse(dateStr)?.time ?: 0L
                    }
                } else 0L
            } catch (e: Exception) {
                0L
            }

            val chapter = SChapter.create().apply {
                setUrlWithoutDomain(href)
                this.name = if (text.isNotBlank() && text != href) text else "Capítulo ${if (chNum % 1f == 0f) chNum.toInt().toString() else chNum.toString()}"
                this.chapter_number = chNum
                this.date_upload = dateUpload
            }
            chapters.add(chapter)
        }

        return chapters.sortedByDescending { it.chapter_number }
    }

    override fun pageListParse(response: Response): List<Page> {
        val html = response.body.string()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        // 1. Parse JSON from ts_reader.run({...})
        val tsReaderMatch = Regex("""ts_reader\.run\s*\((.*?)\);""", RegexOption.DOT_MATCHES_ALL).find(html)
            ?: Regex("""\"images\"\s*:\s*\[([^\]]+)\]""").find(html)

        if (tsReaderMatch != null) {
            val imagesMatch = Regex("""\"images\"\s*:\s*\[([^\]]+)\]""").find(tsReaderMatch.value)
            if (imagesMatch != null) {
                val arrayContent = imagesMatch.groupValues[1]
                val urlMatches = Regex("""\"(https?:[^\"]+)\"""").findAll(arrayContent)
                for (m in urlMatches) {
                    var src = m.groupValues[1].replace("\\/", "/").trim()
                    if (src.isNotEmpty() && !src.contains("logo") && !src.contains("banner") && seen.add(src)) {
                        pages.add(Page(pages.size, "", src))
                    }
                }
            }
        }

        // 2. Fallback: Parse from HTML img elements
        if (pages.isEmpty()) {
            val document = org.jsoup.Jsoup.parse(html, baseUrl)
            val imgElements = document.select("div#readerarea img, div.reading-content img, .page-break img, .wp-manga-chapter-img")
            for (el in imgElements) {
                var src = el.attr("abs:data-src").ifEmpty { el.attr("abs:data-lazy-src").ifEmpty { el.attr("abs:src").ifEmpty { el.attr("src") } } }.trim()
                if (src.startsWith("data:image")) {
                    src = el.attr("abs:data-src").ifEmpty { el.attr("abs:data-lazy-src") }.trim()
                }
                if (src.startsWith("//")) src = "https:$src"
                else if (src.startsWith("/")) src = "$baseUrl$src"
                if (src.isNotEmpty() && !src.contains("logo") && !src.contains("banner") && !src.contains("readerarea.svg") && seen.add(src)) {
                    pages.add(Page(pages.size, "", src))
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
        OrderByFilter(),
        StatusFilter(),
        TypeFilter(),
        GenreFilter(),
    )

    private class OrderByFilter : Filter.Select<String>(
        "Ordenar por",
        arrayOf("Más Vistos", "Últimos Actualizados", "Nuevos", "Alfabético (A-Z)"),
    ) {
        fun toUriPart(): String = when (state) {
            0 -> "popular"
            1 -> "update"
            2 -> "latest"
            3 -> "title"
            else -> "popular"
        }
    }

    private class StatusFilter : Filter.Select<String>(
        "Estado",
        arrayOf("Todos", "En emisión", "Completado", "Pausado", "Cancelado"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "ongoing"
            2 -> "completed"
            3 -> "hiatus"
            4 -> "dropped"
            else -> ""
        }
    }

    private class TypeFilter : Filter.Select<String>(
        "Tipo",
        arrayOf("Todos", "Manhwa", "Manhua", "Manga", "Comic"),
    ) {
        fun toUriPart(): String = when (state) {
            1 -> "manhwa"
            2 -> "manhua"
            3 -> "manga"
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
                Pair("Adulto", "adulto"),
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
                Pair("Girls Love", "girls-love"),
                Pair("Harem", "harem"),
                Pair("Histórico", "historico"),
                Pair("Horror", "horror"),
                Pair("Isekai", "isekai"),
                Pair("Josei", "josei"),
                Pair("Magia", "magia"),
                Pair("Mecha", "mecha"),
                Pair("Militar", "militar"),
                Pair("Misterio", "misterio"),
                Pair("Psicológico", "psicologico"),
                Pair("Realidad Virtual", "realidad-virtual"),
                Pair("Reencarnación", "reencarnacion"),
                Pair("Recuentos de la vida", "recuentos-de-la-vida"),
                Pair("Romance", "romance"),
                Pair("Seinen", "seinen"),
                Pair("Shounen", "shounen"),
                Pair("Shoujo", "shoujo"),
                Pair("Sistema", "sistema"),
                Pair("Sobrenatural", "sobrenatural"),
                Pair("Superpoderes", "superpoderes"),
                Pair("Tragedia", "tragedia"),
                Pair("Vampiros", "vampiros"),
                Pair("Venganza", "venganza"),
                Pair("Webtoon", "webtoon"),
                Pair("Yuri", "yuri"),
            )
        }
    }
}

