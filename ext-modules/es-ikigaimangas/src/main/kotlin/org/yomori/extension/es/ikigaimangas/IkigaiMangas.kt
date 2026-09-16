package org.yomori.extension.es.ikigaimangas

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
import java.text.SimpleDateFormat
import java.util.Locale

class IkigaiMangas : HttpSource() {

    override val name = "Ikigai Mangas"
    override val baseUrl = "https://visorikigai.gettocaboca.com"
    override val lang = "es"
    override val supportsLatest = true

    override fun headersBuilder(): Headers.Builder = Headers.Builder()
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .set("Referer", "$baseUrl/")
        .set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
        .set("Accept-Language", "es-ES,es;q=0.9,en;q=0.8")
        .set("Sec-Fetch-Dest", "image")
        .set("Sec-Fetch-Mode", "no-cors")
        .set("Sec-Fetch-Site", "cross-site")

    private val htmlHeaders: Headers
        get() = headersBuilder()
            .set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .set("Sec-Fetch-Dest", "document")
            .set("Sec-Fetch-Mode", "navigate")
            .set("Sec-Fetch-Site", "same-origin")
            .build()

    private val dateFormat = SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss 'GMT'Z", Locale.ENGLISH)

    // ============================== Popular ===============================
    override fun popularMangaRequest(page: Int): Request {
        return GET("$baseUrl/series/?tipos[]=comic&pagina=$page", htmlHeaders)
    }

    override fun popularMangaParse(response: Response): MangasPage {
        val document = response.asJsoup()
        val mangas = mutableListOf<SManga>()
        val seen = mutableSetOf<String>()

        val cardElements = document.select("a[href*='/series/'], a.card, .card, .element")
        for (element in cardElements) {
            val href = element.attr("abs:href").ifEmpty { element.attr("href") }
            if (href.isEmpty() || href == "$baseUrl/" || href == "$baseUrl/series/" || href.contains("/series/?") || !seen.add(href)) continue

            val slug = href.substringAfterLast("/series/").substringBefore("/").substringBefore("?")
            if (slug.isEmpty() || slug.contains("http") || slug.contains("tipos") || slug.contains("buscar")) continue
            val mangaUrl = "/series/$slug/"

            val titleEl = element.selectFirst("h3, h4, h2, .card-title, .title, p.font-medium, p.font-bold")
            var title = titleEl?.text()?.trim() ?: element.selectFirst("img")?.attr("alt")?.trim() ?: ""
            title = cleanMangaTitle(title)
            if (title.isBlank() || title.length <= 1 || title.equals("Cómic", true) || title.equals("Comic", true) || title.equals("Manga", true) || title.equals("Novela", true) || title.equals("Ver serie", true)) {
                title = slug.replace("-", " ").split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
            }

            val img = element.selectFirst("img")
            var cover = img?.attr("abs:src")?.ifEmpty { img.attr("abs:data-src")?.ifEmpty { img.attr("src") } } ?: ""
            cover = fixImageUrl(cover)

            val capMatch = Regex("""(?:Cap[íi]tulo|Cap\.?|Ep\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(element.text())
            val capDesc = if (capMatch != null) "Capítulo ${capMatch.groupValues[1]}" else ""

            mangas.add(
                SManga.create().apply {
                    setUrlWithoutDomain(mangaUrl)
                    this.title = title
                    this.thumbnail_url = cover
                    this.description = capDesc
                    this.initialized = true
                }
            )
        }

        val hasNextPage = document.selectFirst("nav[aria-label=pagination] > a:last-child:not([class*=btn-disabled])") != null || mangas.size >= 12
        return MangasPage(mangas, hasNextPage)
    }

    // =============================== Latest ===============================
    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/series/?tipos[]=comic&pagina=$page", htmlHeaders)
    }

    override fun latestUpdatesParse(response: Response): MangasPage = popularMangaParse(response)

    // =============================== Search ===============================
    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        val encoded = java.net.URLEncoder.encode(query.trim(), "UTF-8")
        val urlBuilder = StringBuilder("$baseUrl/series/?")

        if (query.isNotBlank()) {
            urlBuilder.append("buscar=").append(encoded).append("&")
        }

        var hasType = false
        for (filter in filters) {
            when (filter) {
                is TypeFilter -> {
                    filter.state.filter { it.state }.forEach { t ->
                        urlBuilder.append("tipos%5B%5D=").append(t.id).append("&")
                        hasType = true
                    }
                }
                is StatusFilter -> {
                    filter.state.filter { it.state }.forEach { s ->
                        urlBuilder.append("estados%5B%5D=").append(s.id).append("&")
                    }
                }
                else -> {}
            }
        }

        if (!hasType) {
            urlBuilder.append("tipos%5B%5D=comic&")
        }

        urlBuilder.append("pagina=").append(page)
        return GET(urlBuilder.toString(), htmlHeaders)
    }

    override fun searchMangaParse(response: Response): MangasPage = popularMangaParse(response)

    // =========================== Manga Details ============================
    override fun mangaDetailsRequest(manga: SManga): Request = GET(baseUrl + manga.url, htmlHeaders)

    override fun mangaDetailsParse(response: Response): SManga {
        val document = response.asJsoup()
        val element = document.select("article.card, article, div.manga-detail, main").firstOrNull() ?: document

        val titleText = element.select(".card-body .card-title, h1").firstOrNull()?.text()?.trim()?.let { cleanMangaTitle(it) } ?: "Ikigai Manga"
        
        // Find best high-res cover
        val img = document.select("img[src*='rs:fill:350:500'], article figure img, figure.relative img, figure img, .card-body img, article img").firstOrNull()
            ?: element.select("img").firstOrNull()
            
        var coverUrl = img?.attr("abs:src")?.ifEmpty { img.attr("abs:data-src")?.ifEmpty { img.attr("src") } } ?: ""
        coverUrl = fixImageUrl(coverUrl)
        val descText = element.select(".card-body > p, .synopsis, p").firstOrNull()?.text()?.trim()
        val statusText = element.select("figure > ul a[href*=?estados], .status").firstOrNull()?.text()?.lowercase() ?: ""

        val statusVal = when {
            statusText.contains("complet") || statusText.contains("final") -> SManga.COMPLETED
            statusText.contains("cancel") -> SManga.CANCELLED
            statusText.contains("hiatus") || statusText.contains("pausa") -> SManga.ON_HIATUS
            else -> SManga.ONGOING
        }

        val genres = element.select(".card-body > ul > li > a[href*=?generos], a[href*='genero']").map { it.text().trim() }.distinct()

        return SManga.create().apply {
            title = titleText
            thumbnail_url = coverUrl
            description = descText
            status = statusVal
            genre = genres.joinToString(", ")
            initialized = true
        }
    }

    // ============================== Chapters ==============================
    override fun chapterListRequest(manga: SManga): Request = GET(baseUrl + manga.url, htmlHeaders)

    override fun chapterListParse(response: Response): List<SChapter> {
        val initialDoc = response.asJsoup()
        val mangaUrl = response.request.url.toString()
        val slug = mangaUrl.substringAfterLast("/series/").substringBefore("/").substringBefore("?")
        val chapters = mutableListOf<SChapter>()
        val seen = mutableSetOf<String>()

        var page = 1
        var currentDoc = initialDoc

        do {
            val chapterElements = currentDoc.select("a[href*='/capitulo/']")
            if (chapterElements.isEmpty() && page > 1) break

            var newFoundInPage = 0
            for (el in chapterElements) {
                val href = el.attr("abs:href").ifEmpty { el.attr("href") }
                if (href.isEmpty() || !href.contains("/capitulo/") || !seen.add(href)) continue

                val rawText = el.text().trim()
                if (rawText.contains("Primer", true) || rawText.contains("Último", true) || rawText.contains("Capitulo Inicial", true) || rawText.isEmpty() || href.contains("primer-capitulo") || href.contains("ultimo-capitulo")) continue

                val cleanedName = rawText.split(Regex("""\s{2,}|\t|\n""")).firstOrNull()?.trim() ?: rawText
                val numMatch = Regex("""(?:Capítulo|Capitulo|Cap|Episodio|Ep|Ch\.?)\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(cleanedName)
                    ?: Regex("""(\d+(\.\d+)?)""").find(cleanedName)
                    ?: Regex("""/(\d+(\.\d+)?)/?$""").find(href)
                val chNum = numMatch?.groupValues?.get(1)?.toFloatOrNull() ?: (chapters.size + 1).toFloat()
                val chDisplayNum = if (chNum % 1f == 0f) chNum.toInt().toString() else chNum.toString()
                val name = "Capítulo $chDisplayNum"

                val dateString = el.selectFirst("time")?.attr("datetime")?.substringBeforeLast("(")?.trim()
                val dateUpload = try {
                    if (!dateString.isNullOrEmpty()) {
                        val relativeMatch = Regex("""(?:hace\s+)?(\d+)\s*(s|seg|min|m|h|hora|horas|d|dia|días|dias)""", RegexOption.IGNORE_CASE).find(dateString)
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
                            dateFormat.parse(dateString)?.time ?: 0L
                        }
                    } else 0L
                } catch (e: Exception) {
                    0L
                }

                chapters.add(
                    SChapter.create().apply {
                        setUrlWithoutDomain(href)
                        this.name = name
                        this.chapter_number = chNum
                        this.date_upload = dateUpload
                    }
                )
                newFoundInPage++
            }

            if (newFoundInPage == 0 && page > 1) break

            val hasNextPage = currentDoc.select("a[href*='?pagina=${page + 1}']").isNotEmpty() ||
                              currentDoc.selectFirst("nav[aria-label=pagination] > a:last-child:not([class*=btn-disabled])") != null
            if (hasNextPage && page < 60 && slug.isNotEmpty()) {
                page++
                try {
                    val nextUrl = "$baseUrl/series/$slug/?pagina=$page"
                    val nextResp = client.newCall(GET(nextUrl, htmlHeaders)).execute()
                    currentDoc = nextResp.asJsoup()
                } catch (e: Exception) {
                    break
                }
            } else {
                break
            }
        } while (true)

        return chapters.sortedByDescending { it.chapter_number }
    }

    // =============================== Pages ================================
    override fun pageListRequest(chapter: SChapter): Request = GET(baseUrl + chapter.url, htmlHeaders)

    override fun pageListParse(response: Response): List<Page> {
        val document = response.asJsoup()
        val pages = mutableListOf<Page>()
        val seen = mutableSetOf<String>()

        val html = document.html()
        // Extract all reader images (image2 or image3 or media or cdn)
        val regexUrls = Regex("""https://[a-zA-Z0-9.-]+\.ikigaimangas\.cloud/series/[^"'\s<>]+?\.(?:webp|jpg|jpeg|png)""").findAll(html)
        for (m in regexUrls) {
            val url = fixImageUrl(m.value)
            if (!url.contains("banner") && !url.contains("logo") && !url.contains("covers/") && !url.contains("btn_close") && !url.contains("80:110") && !url.contains("60:60") && seen.add(url)) {
                pages.add(Page(pages.size, "", url))
            }
        }

        if (pages.isEmpty()) {
            val imgElements = document.select("section div.img > img, div.reading-content img, .page-break img, img[src*='ikigaimangas'], img[src*='series/']")
            for (img in imgElements) {
                val src = img.attr("abs:src").ifEmpty { img.attr("abs:data-src").ifEmpty { img.attr("src") } }
                val fixed = fixImageUrl(src)
                if (fixed.isNotEmpty() && !fixed.contains("logo") && !fixed.contains("banner") && !fixed.contains("covers/") && !fixed.contains("btn_close") && !fixed.contains("80:110") && !fixed.contains("60:60") && !fixed.startsWith("data:image") && seen.add(fixed)) {
                    pages.add(Page(pages.size, "", fixed))
                }
            }
        }

        return pages
    }

    override fun imageRequest(page: Page): Request {
        val imageHeaders = headersBuilder()
            .set("Referer", "$baseUrl/")
            .set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
            .set("Sec-Fetch-Dest", "image")
            .set("Sec-Fetch-Mode", "no-cors")
            .set("Sec-Fetch-Site", "cross-site")
            .build()
        return GET(page.imageUrl!!, imageHeaders)
    }

    private fun cleanMangaTitle(rawTitle: String): String {
        var t = rawTitle
            .replace(Regex("""<!--.*?-->"""), "")
            .replace(Regex("""^(?:Cómic|Manga|Novela)\s*""", RegexOption.IGNORE_CASE), "")
            .replace(Regex("""\s+\d+\.\d+.*$"""), "")
            .trim()
        val firstLine = t.split('\n').firstOrNull()?.trim() ?: t
        return firstLine.ifEmpty { rawTitle.trim() }
    }

    private fun fixImageUrl(url: String): String {
        if (url.isBlank()) return url
        if (url.startsWith("/")) {
            return "$baseUrl$url"
        }
        return url
    }

    override fun imageUrlParse(response: Response): String = ""

    override fun getFilterList(): FilterList = FilterList(
        TypeFilter("Tipo", getTypes()),
        StatusFilter("Estado", getStatuses()),
    )

    private class TypeVal(val id: String, name: String) : Filter.CheckBox(name)
    private class TypeFilter(name: String, types: List<TypeVal>) : Filter.Group<TypeVal>(name, types)

    private class StatusVal(val id: String, name: String) : Filter.CheckBox(name)
    private class StatusFilter(name: String, statuses: List<StatusVal>) : Filter.Group<StatusVal>(name, statuses)

    private fun getTypes() = listOf(
        TypeVal("comic", "Cómic (Manhwa/Manga)"),
        TypeVal("novel", "Novela"),
        TypeVal("manga", "Manga"),
    )

    private fun getStatuses() = listOf(
        StatusVal("en-curso", "En curso"),
        StatusVal("completa", "Completa"),
        StatusVal("hiatus", "Hiatus"),
        StatusVal("cancelada", "Cancelada"),
    )
}
