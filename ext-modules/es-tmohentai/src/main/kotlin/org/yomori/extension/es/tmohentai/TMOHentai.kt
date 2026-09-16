package org.yomori.extension.es.tmohentai

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
import org.jsoup.Jsoup
import org.jsoup.nodes.Document

class TMOHentai : HttpSource() {

    override val name = "TMOHentai"
    override val baseUrl = "https://tmohentai.app"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/biblioteca")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")
        .add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

    override fun popularMangaRequest(page: Int): Request {
        val url = "$baseUrl/biblioteca?title=&filter_by=title&order_item=likes_count&order_dir=desc&_pg=1&page=$page"
        val ajaxHeaders = headersBuilder()
            .add("X-Requested-With", "XMLHttpRequest")
            .build()
        return GET(url, ajaxHeaders)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val bodyStr = response.body.string()
        val document: Document = try {
            val json = JSONObject(bodyStr)
            val html = json.optString("html")
            if (html.isNotEmpty()) Jsoup.parse(html, baseUrl) else Jsoup.parse(bodyStr, baseUrl)
        } catch (_: Exception) {
            Jsoup.parse(bodyStr, baseUrl)
        }

        val elements = document.select(".manga-card-col, .manga-card, div.col-xs-6, div.col-sm-4, div.col-md-4, div.col-lg-3, .element, div.thumbnail")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.select("a[href*='/library/'], a[href*='/manga/'], a[href*='/doujinshi/'], a.manga-card").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/" || href == "$baseUrl/biblioteca" || !seen.add(href)) continue

            val titleEl = el.selectFirst(".manga-card__title, h3, .title, .thumbnail-title, h4")
            val title = titleEl?.attr("title")?.takeIf { it.isNotBlank() }
                ?: titleEl?.text()?.trim()
                ?: link.attr("title").ifEmpty { link.text().trim() }
            if (title.isBlank() || title.length <= 1) continue

            val img = el.selectFirst("img.manga-card__cover, img.content-thumbnail-cover, img")
            var cover = img?.attr("abs:src")?.ifEmpty { img.attr("abs:data-src")?.ifEmpty { img.attr("src") } } ?: ""
            if (cover.isEmpty()) {
                cover = el.selectFirst(".thumbnail.book, .lazy-cover, [data-bg]")?.attr("data-bg") ?: ""
            }
            if (cover.isNotEmpty() && !cover.startsWith("http")) {
                cover = if (cover.startsWith("//")) "https:$cover" else "$baseUrl${if (cover.startsWith("/")) "" else "/"}$cover"
            }

            val author = el.selectFirst(".manga-card__meta-author span, .book-author")?.text()?.trim() ?: ""
            val time = el.selectFirst(".manga-card__meta-time span")?.text()?.trim() ?: ""
            val chapters = el.selectFirst(".manga-card__stat--chapters span")?.text()?.trim() ?: ""

            val desc = when {
                chapters.isNotEmpty() && time.isNotEmpty() -> "$chapters págs • $time"
                chapters.isNotEmpty() -> "$chapters págs"
                time.isNotEmpty() -> time
                author.isNotEmpty() -> author
                else -> ""
            }

            mangas.add(
                SManga.create().apply {
                    setUrlWithoutDomain(href)
                    this.title = title
                    this.thumbnail_url = cover
                    this.description = desc
                    this.author = author.ifBlank { null }
                    this.initialized = true
                }
            )
        }

        val hasNext = document.select("a[rel=next], .pagination a:contains(Siguiente), .pagination a:contains(›)").isNotEmpty() || mangas.size >= 20
        return MangasPage(mangas, hasNext)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        val url = "$baseUrl/biblioteca?title=&filter_by=title&order_item=creation&order_dir=desc&_pg=1&page=$page"
        val ajaxHeaders = headersBuilder()
            .add("X-Requested-With", "XMLHttpRequest")
            .build()
        return GET(url, ajaxHeaders)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val url = "$baseUrl/biblioteca".toHttpUrl().newBuilder()
            .addQueryParameter("page", page.toString())
            .addQueryParameter("_pg", "1")

        if (query.isNotBlank()) {
            url.addQueryParameter("title", query.trim())
            url.addQueryParameter("filter_by", "title")
        }

        var orderItem = "likes_count"
        var orderDir = "desc"

        for (filter in filters) {
            when (filter) {
                is SortByFilter -> {
                    orderItem = filter.orderItem
                    orderDir = filter.orderDir
                }
                is ContentFilter -> {
                    if (filter.selected.isNotEmpty()) {
                        url.addQueryParameter("content", filter.selected)
                    }
                }
                is TypeFilter -> {
                    if (filter.selected.isNotEmpty()) {
                        url.addQueryParameter("type", filter.selected)
                    }
                }
                is GenreFilter -> {
                    filter.state.filter { it.state }.forEach { genre ->
                        url.addQueryParameter("tags[]", genre.id)
                    }
                }
                else -> {}
            }
        }

        url.addQueryParameter("order_item", orderItem)
        url.addQueryParameter("order_dir", orderDir)

        val ajaxHeaders = headersBuilder()
            .add("X-Requested-With", "XMLHttpRequest")
            .build()

        return GET(url.build().toString(), ajaxHeaders)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        return SManga.create().apply {
            val rawTitle = document.select("#md-title, h1.element-title, h1, .md-hero-title h1").firstOrNull()?.text()?.trim() ?: ""
            title = rawTitle.ifEmpty { "TMOHentai" }

            var cover = document.select("img#md-cover, .md-cover-card__image-wrap img, img.content-thumbnail-cover, img.cover").firstOrNull()?.let {
                it.attr("abs:src").ifEmpty { it.attr("abs:data-src").ifEmpty { it.attr("src") } }
            } ?: ""
            if (cover.isNotEmpty() && !cover.startsWith("http")) {
                cover = if (cover.startsWith("//")) "https:$cover" else "$baseUrl${if (cover.startsWith("/")) "" else "/"}$cover"
            }
            thumbnail_url = cover

            description = document.select(".md-info-row--synopsis .md-info-row__value, .synopsis, #manga-synopsis, .element-description").text().trim()

            val genresList = document.select(".md-info-row #md-tags-list a, .md-info-row a.label, .md-info-row a[href*='/tag/'], a[href*='/genero/']")
                .map { it.text().trim() }
                .filter { it.isNotEmpty() }
                .distinct()
            genre = genresList.joinToString(", ")

            author = document.select(".md-info-row:has(.md-info-row__label:contains(Autor)) a, a[href*='author'], a[href*='title=']").map { it.text().trim() }.joinToString(", ").ifBlank { null }
            artist = document.select(".md-info-row:has(.md-info-row__label:contains(Artista)) a, a[href*='artist']").map { it.text().trim() }.joinToString(", ").ifBlank { null }

            val statusBadge = document.select(".md-badge--ongoing, .md-badge--completed, .md-cover-card__status .md-badge, [class*='publishing']").text()
            status = when {
                statusBadge.contains("Completed", true) || statusBadge.contains("Final", true) -> SManga.COMPLETED
                statusBadge.contains("Hiatus", true) || statusBadge.contains("Pausa", true) -> SManga.ON_HIATUS
                else -> SManga.ONGOING
            }
            initialized = true
        }
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        val document = response.asJsoup()
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()

        // 1. Si es doujinshi o manga con botón directo "Leer"
        val readBtn = document.selectFirst("a.md-preview-read-btn, a[href*='/view_uploads/'], a[href*='/reader/']")
        if (readBtn != null) {
            val href = readBtn.attr("abs:href").ifEmpty { readBtn.attr("href") }
            if (href.isNotEmpty() && seen.add(href)) {
                val totalPages = document.selectFirst(".md-preview-card__badge, #md-preview-grid")?.attr("data-total")
                    ?: document.selectFirst(".md-preview-card__badge")?.text()?.trim()
                val dateText = document.selectFirst(".md-info-row--date .md-info-row__value")?.text()?.trim()

                chapters.add(
                    SChapter.create().apply {
                        setUrlWithoutDomain(href)
                        name = if (!totalPages.isNullOrBlank()) "Capítulo Completo ($totalPages págs)" else "Capítulo Completo"
                        chapter_number = 1f
                        date_upload = parseRelativeDate(dateText)
                    }
                )
            }
        }

        // 2. Si tiene lista de capítulos múltiples
        val listElements = document.select("li.upload-link, li.list-group-item, .chapter-list-element")
        for (el in listElements) {
            val link = el.select("a[href*='/view_uploads/'], a[href*='/viewer/'], a[href*='/reader/']").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || !seen.add(href)) continue

            val chName = el.select(".chapter-number, .btn-collapse, h4, .chapter-title").text().trim().ifEmpty { link.text().trim() }
            val chNumMatch = Regex("""(\d+(\.\d+)?)""").find(chName)
            val chNum = chNumMatch?.value?.toFloatOrNull() ?: (chapters.size + 1).toFloat()
            val dateText = el.selectFirst(".badge.badge-primary, .badge, .date, time, .uploaded-date")?.text()?.trim()

            chapters.add(
                SChapter.create().apply {
                    setUrlWithoutDomain(href)
                    name = chName.ifEmpty { "Capítulo $chNum" }
                    chapter_number = chNum
                    date_upload = parseRelativeDate(dateText)
                }
            )
        }

        // 3. Fallback si no encontró ningún botón ni lista
        if (chapters.isEmpty()) {
            val currentUrl = response.request.url.toString()
            val idMatch = Regex("""/(?:manga|doujinshi)/(\d+)""").find(currentUrl)
            if (idMatch != null) {
                val mangaId = idMatch.groupValues[1]
                chapters.add(
                    SChapter.create().apply {
                        url = "/view_uploads/$mangaId"
                        name = "Capítulo Completo"
                        chapter_number = 1f
                    }
                )
            }
        }

        return chapters.sortedByDescending { it.chapter_number }
    }

    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        val imgElements = document.select("#reader-wrap .reader-img-wrap img, .reader-img-wrap img, #reader-wrap img, img[data-src*='mangas'], img[src*='mangas']")
        for (el in imgElements) {
            var src = el.attr("abs:data-src").ifEmpty { el.attr("abs:src").ifEmpty { el.attr("src") } }
            if (src.isNotEmpty() && !src.contains("logo") && !src.contains("avatar") && !src.startsWith("data:image")) {
                if (src.startsWith("//")) src = "https:$src"
                if (seen.add(src)) {
                    pages.add(Page(pages.size, "", src))
                }
            }
        }

        // Fallback si las imágenes se cargan dinámicamente mediante el grid de preview
        if (pages.isEmpty()) {
            val totalAttr = document.selectFirst("#md-preview-grid")?.attr("data-total")
            val currentUrl = response.request.url.toString()
            val idMatch = Regex("""/view_uploads/(\d+)""").find(currentUrl)
            val total = totalAttr?.toIntOrNull() ?: 0
            if (idMatch != null && total > 0) {
                val mangaId = idMatch.groupValues[1]
                for (i in 1..total) {
                    pages.add(Page(pages.size, "", "https://storage.tmohentai.app/mangas/$mangaId/$i.webp"))
                }
            }
        }

        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    private fun parseRelativeDate(dateStr: String?): Long {
        if (dateStr.isNullOrEmpty()) return 0L
        return try {
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
        } catch (_: Exception) {
            0L
        }
    }

    override fun getFilterList(): FilterList = FilterList(
        SortByFilter("Ordenar por", getSorts()),
        Filter.Separator(),
        ContentFilter("Contenido", getContents()),
        TypeFilter("Tipo de obra", getTypes()),
        Filter.Separator(),
        GenreFilter("Tags / Géneros Populares", getTags()),
    )

    private class SortOption(val name: String, val orderItem: String, val orderDir: String)
    private class SortByFilter(name: String, val options: List<SortOption>) :
        Filter.Select<String>(name, options.map { it.name }.toTypedArray()) {
        val orderItem: String get() = options[state].orderItem
        val orderDir: String get() = options[state].orderDir
    }

    private class ContentOption(val name: String, val value: String)
    private class ContentFilter(name: String, val options: List<ContentOption>) :
        Filter.Select<String>(name, options.map { it.name }.toTypedArray()) {
        val selected: String get() = options[state].value
    }

    private class TypeOption(val name: String, val value: String)
    private class TypeFilter(name: String, val options: List<TypeOption>) :
        Filter.Select<String>(name, options.map { it.name }.toTypedArray()) {
        val selected: String get() = options[state].value
    }

    private class GenreVal(val id: String, name: String) : Filter.CheckBox(name)
    private class GenreFilter(name: String, genres: List<GenreVal>) : Filter.Group<GenreVal>(name, genres)

    private fun getSorts() = listOf(
        SortOption("Más valorados (Populares)", "likes_count", "desc"),
        SortOption("Más vistos", "views_count", "desc"),
        SortOption("Últimas subidas (Recientes)", "creation", "desc"),
        SortOption("Alfabético (A-Z)", "title", "asc"),
        SortOption("Alfabético (Z-A)", "title", "desc"),
    )

    private fun getContents() = listOf(
        ContentOption("Todo el contenido", ""),
        ContentOption("Vanilla ♡", "vanilla"),
        ContentOption("Solo Femenino ♀", "sole-female"),
        ContentOption("Solo Masculino ♂", "sole-male"),
        ContentOption("Yaoi ♂♂", "yaoi"),
        ContentOption("Yuri ♀♀", "yuri"),
        ContentOption("Futanari ⚧", "futanari"),
        ContentOption("NTR / Netorare", "ntr"),
        ContentOption("Sin Censura (Uncensored)", "uncensored"),
    )

    private fun getTypes() = listOf(
        TypeOption("Todos los tipos", ""),
        TypeOption("Doujinshi", "doujinshi"),
        TypeOption("Manga", "manga"),
        TypeOption("Comic / Western", "western"),
        TypeOption("Ilustraciones / Artbook", "artbook"),
    )

    private fun getTags() = listOf(
        GenreVal("ahegao", "Ahegao"),
        GenreVal("milf", "Milf"),
        GenreVal("big-breasts", "Big Breasts"),
        GenreVal("dark-skin", "Dark Skin"),
        GenreVal("gyaru", "Gyaru"),
        GenreVal("cheating", "Cheating / Infidelidad"),
        GenreVal("blowjob", "Blowjob / Oral"),
        GenreVal("big-ass", "Big Ass"),
        GenreVal("deepthroat", "Deepthroat"),
        GenreVal("nakadashi", "Nakadashi / Creampie"),
        GenreVal("uncensored", "Uncensored / Sin censura"),
        GenreVal("x-ray", "X-Ray"),
        GenreVal("glasses", "Glasses / Lentes"),
        GenreVal("hairy", "Hairy"),
        GenreVal("huge-breasts", "Huge Breasts / Tetas enormes"),
        GenreVal("maid", "Maid"),
        GenreVal("schoolgirl", "Schoolgirl / Colegiala"),
        GenreVal("incest", "Incest / Incesto"),
        GenreVal("mind-break", "Mind Break"),
        GenreVal("netorare", "Netorare (NTR)"),
        GenreVal("anal", "Anal"),
        GenreVal("cosplay", "Cosplay"),
        GenreVal("femdom", "Femdom"),
        GenreVal("tentacles", "Tentacles / Tentáculos"),
        GenreVal("monster-girl", "Monster Girl"),
        GenreVal("swimsuit", "Swimsuit / Traje de baño"),
        GenreVal("vanilla", "Vanilla"),
        GenreVal("futanari", "Futanari"),
        GenreVal("stockings", "Stockings / Medias"),
        GenreVal("teacher", "Teacher / Profesora"),
        GenreVal("yuri", "Yuri"),
        GenreVal("yaoi", "Yaoi"),
    )
}
