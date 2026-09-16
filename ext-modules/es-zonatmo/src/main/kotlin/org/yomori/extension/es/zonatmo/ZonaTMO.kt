package org.yomori.extension.es.zonatmo

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
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Document

class ZonaTMO : HttpSource() {

    override val name = "ZonaTMO"
    override val baseUrl = "https://zonatmo.org"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .add("Referer", "$baseUrl/biblioteca")
        .add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
        .add("Accept-Language", "es-ES,es;q=0.9")

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
        } catch (e: Exception) {
            Jsoup.parse(bodyStr, baseUrl)
        }

        val elements = document.select("#library-grid .element, .element, .element.book, .card, div.thumbnail, a[href*='/library/'], a[href*='/biblioteca/']")
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        for (el in elements) {
            val link = if (el.tagName() == "a") el else el.select("a[href*='/library/'], a[href*='/biblioteca/'], a[href*='/manga/']").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/" || href == "$baseUrl/biblioteca" || !seen.add(href)) continue

            val titleEl = el.selectFirst(".thumbnail-title h4, .thumbnail-title, h4, .title, .text-truncate")
            val title = titleEl?.attr("title")?.takeIf { it.isNotBlank() }
                ?: titleEl?.text()?.trim()
                ?: link.attr("title").ifEmpty { link.text().trim() }
            if (title.isBlank() || title.length <= 1) continue

            val img = el.selectFirst("img.cover-bg-img, img")
            var cover = img?.attr("abs:src")?.ifEmpty { img.attr("abs:data-src")?.ifEmpty { img.attr("src") } } ?: ""
            if (cover.isEmpty()) {
                cover = el.selectFirst(".thumbnail.book, .lazy-cover, [data-bg]")?.attr("data-bg") ?: ""
            }
            if (cover.isNotEmpty() && !cover.startsWith("http")) {
                cover = "$baseUrl${if (cover.startsWith("/")) "" else "/"}$cover"
            }

            val capMatch = Regex("""(?:Cap[íi]tulo|Cap\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(el.text())
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
        val encoded = java.net.URLEncoder.encode(query.trim(), "UTF-8")
        val urlBuilder = StringBuilder("$baseUrl/biblioteca?title=$encoded&filter_by=title&_pg=1&page=$page")

        var orderItem = "likes_count"
        for (filter in filters) {
            when (filter) {
                is SortByFilter -> {
                    orderItem = filter.selected
                }
                is GenreFilter -> {
                    filter.state.filter { it.state }.forEach { g ->
                        urlBuilder.append("&genders%5B%5D=").append(g.id)
                    }
                }
                is TypeFilter -> {
                    filter.state.filter { it.state }.forEach { t ->
                        urlBuilder.append("&types%5B%5D=").append(t.id)
                    }
                }
                is StatusFilter -> {
                    filter.state.filter { it.state }.forEach { s ->
                        urlBuilder.append("&statuses%5B%5D=").append(s.id)
                    }
                }
                is DemographyFilter -> {
                    filter.state.filter { it.state }.forEach { d ->
                        urlBuilder.append("&demographies%5B%5D=").append(d.id)
                    }
                }
                else -> {}
            }
        }
        urlBuilder.append("&order_item=").append(orderItem).append("&order_dir=desc")

        val ajaxHeaders = headersBuilder()
            .add("X-Requested-With", "XMLHttpRequest")
            .build()
        return GET(urlBuilder.toString(), ajaxHeaders)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        return SManga.create().apply {
            var rawTitle = document.select("h1.element-title, .element-header-content-title, .element-title").firstOrNull()?.text()?.trim() ?: ""
            if (rawTitle.isEmpty() || listOf("manga", "manhwa", "manhua", "comic").contains(rawTitle.lowercase())) {
                rawTitle = document.select("meta[property='og:title']").attr("content").substringBefore("|").trim()
            }
            title = rawTitle.ifEmpty { "ZonaTMO Manga" }

            thumbnail_url = document.select("img.book-thumbnail, .book-thumbnail img, img.cover, .book-header-cover-image").firstOrNull()?.let {
                it.attr("abs:src").ifEmpty { it.attr("abs:data-src").ifEmpty { it.attr("src") } }
            }

            description = document.select("#manga-synopsis, .element-description, .sinopsis, p.element-description").text().trim()

            val genresList = document.select(".element-header-content-text a[href*=/tag/], a[href*='/genero/'], a[href*='/genders/'], a.badge-primary, .demography")
                .map { it.text().trim() }
                .filter { it.isNotEmpty() }
                .distinct()
            genre = genresList.joinToString(", ")

            author = document.select("h5.element-subtitle:contains(Autor) + * a, a[href*='author']").map { it.text().trim() }.joinToString(", ").ifBlank { null }
            artist = document.select("h5.element-subtitle:contains(Artista) + * a, a[href*='artist']").map { it.text().trim() }.joinToString(", ").ifBlank { null }

            val statusText = document.select("h5.element-subtitle:contains(Estado) + *, .book-status, [class*='publishing'], .book-meta-status").firstOrNull()?.text()?.lowercase() ?: ""
            status = when {
                statusText.contains("emisi") || statusText.contains("public") -> SManga.ONGOING
                statusText.contains("final") || statusText.contains("complet") -> SManga.COMPLETED
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
        val elements = document.select("li.upload-link, li.list-group-item, .chapter-list-element")

        for (el in elements) {
            val link = el.select("a[href*='/view_uploads/'], a[href*='/viewer/'], .chapter-detail a").firstOrNull() ?: continue
            val href = link.attr("abs:href").ifEmpty { link.attr("href") }
            if (href.isEmpty() || !seen.add(href)) continue

            val chNumAttr = el.attr("data-chapter-number").ifEmpty { el.select(".chapter-number").attr("data-number") }
            var chName = el.select(".chapter-number").text().trim().ifEmpty {
                el.select(".btn-collapse, h4, .chapter-title").firstOrNull()?.text()?.trim() ?: link.text().trim()
            }
            chName = chName.substringBefore("Subido").substringBefore("Uploaded").trim()
            val numMatch = Regex("""(\d+(\.\d+)?)""").find(if (chNumAttr.isNotEmpty()) chNumAttr else chName)
            val chNum = numMatch?.value?.toFloatOrNull() ?: (chapters.size + 1).toFloat()

            val scanGroup = el.select("a[href*='/groups/']").firstOrNull()?.text()?.trim()

            val dateEl = el.selectFirst(".badge.badge-primary, .badge, .date, time, .uploaded-date")
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
                name = if (chName.contains("Cap", true)) chName else "Capítulo ${numMatch?.value ?: chNum}"
                chapter_number = chNum
                scanlator = scanGroup
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

        val imgElements = document.select("#reader-wrap img.reader-image, img.reader-image, .reader-img-wrap img, img.viewer-img, .viewer-container img, img[data-src], img[src*='chapters'], img[src*='uploads']")
        for (el in imgElements) {
            val src = el.attr("abs:data-src").ifEmpty { el.attr("abs:src").ifEmpty { el.attr("src") } }
            if (src.isNotEmpty() && !src.contains("logo") && !src.startsWith("data:image") && seen.add(src)) {
                pages.add(Page(pages.size, "", src))
            }
        }
        return pages
    }

    override fun imageUrlParse(response: Response): String = ""

    override fun getFilterList(): FilterList = FilterList(
        SortByFilter("Ordenar por", getSorts()),
        Filter.Separator(),
        DemographyFilter("Demografía", getDemographies()),
        StatusFilter("Estado", getStatuses()),
        TypeFilter("Tipo", getTypes()),
        GenreFilter("Géneros", getGenres()),
    )

    private class SortByFilter(name: String, val options: List<Pair<String, String>>) :
        Filter.Select<String>(name, options.map { it.first }.toTypedArray()) {
        val selected: String get() = options[state].second
    }

    private class GenreVal(val id: String, name: String) : Filter.CheckBox(name)
    private class GenreFilter(name: String, genres: List<GenreVal>) : Filter.Group<GenreVal>(name, genres)

    private class TypeVal(val id: String, name: String) : Filter.CheckBox(name)
    private class TypeFilter(name: String, types: List<TypeVal>) : Filter.Group<TypeVal>(name, types)

    private class StatusVal(val id: String, name: String) : Filter.CheckBox(name)
    private class StatusFilter(name: String, statuses: List<StatusVal>) : Filter.Group<StatusVal>(name, statuses)

    private class DemographyVal(val id: String, name: String) : Filter.CheckBox(name)
    private class DemographyFilter(name: String, demographies: List<DemographyVal>) : Filter.Group<DemographyVal>(name, demographies)

    private fun getSorts() = listOf(
        Pair("Popularidad", "likes_count"),
        Pair("Fecha de creación", "creation"),
        Pair("Alfabético", "title"),
        Pair("Número de votos", "num_votos"),
    )

    private fun getStatuses() = listOf(
        StatusVal("publishing", "Publicándose"),
        StatusVal("ended", "Finalizado"),
        StatusVal("cancelled", "Cancelado"),
        StatusVal("on_hold", "En pausa"),
    )

    private fun getTypes() = listOf(
        TypeVal("manga", "Manga"),
        TypeVal("manhwa", "Manhwa"),
        TypeVal("manhua", "Manhua"),
        TypeVal("novel", "Novela"),
        TypeVal("one_shot", "One-shot"),
        TypeVal("doujinshi", "Doujinshi"),
    )

    private fun getDemographies() = listOf(
        DemographyVal("seinen", "Seinen"),
        DemographyVal("shounen", "Shounen"),
        DemographyVal("shoujo", "Shoujo"),
        DemographyVal("josei", "Josei"),
        DemographyVal("kodomo", "Kodomo"),
    )

    private fun getGenres() = listOf(
        GenreVal("accion", "Acción"),
        GenreVal("aventura", "Aventura"),
        GenreVal("comedia", "Comedia"),
        GenreVal("drama", "Drama"),
        GenreVal("recuentos-de-la-vida", "Recuentos de la vida"),
        GenreVal("ecchi", "Ecchi"),
        GenreVal("fantasia", "Fantasía"),
        GenreVal("magia", "Magia"),
        GenreVal("sobrenatural", "Sobrenatural"),
        GenreVal("horror", "Horror"),
        GenreVal("misterio", "Misterio"),
        GenreVal("psicologico", "Psicológico"),
        GenreVal("romance", "Romance"),
        GenreVal("ciencia-ficcion", "Ciencia Ficción"),
        GenreVal("thriller", "Thriller"),
        GenreVal("deporte", "Deporte"),
        GenreVal("artes-marciales", "Artes Marciales"),
        GenreVal("harem", "Harem"),
        GenreVal("mecha", "Mecha"),
        GenreVal("supervivencia", "Supervivencia"),
        GenreVal("reencarnacion", "Reencarnación"),
        GenreVal("isekai", "Isekai"),
        GenreVal("apocaliptico", "Apocalíptico"),
        GenreVal("historico", "Histórico"),
        GenreVal("militar", "Militar"),
        GenreVal("policial", "Policial"),
        GenreVal("superpoderes", "Superpoderes"),
        GenreVal("vampiros", "Vampiros"),
        GenreVal("genero-bender", "Género Bender"),
        GenreVal("realidad-virtual", "Realidad Virtual"),
    )
}
