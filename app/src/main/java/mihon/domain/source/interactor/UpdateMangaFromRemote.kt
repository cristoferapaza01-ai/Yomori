package mihon.domain.source.interactor

import eu.kanade.domain.chapter.interactor.SyncChaptersWithSource
import eu.kanade.domain.chapter.model.toSChapter
import eu.kanade.domain.manga.model.hasCustomCover
import eu.kanade.domain.manga.model.toSManga
import eu.kanade.tachiyomi.data.cache.CoverCache
import eu.kanade.tachiyomi.data.download.DownloadManager
import eu.kanade.tachiyomi.source.Source
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import logcat.LogPriority
import mihon.domain.source.models.RemoteMangaUpdate
import tachiyomi.core.common.util.lang.withIOContext
import tachiyomi.core.common.util.system.logcat
import tachiyomi.domain.chapter.model.Chapter
import tachiyomi.domain.chapter.repository.ChapterRepository
import tachiyomi.domain.library.service.LibraryPreferences
import tachiyomi.domain.manga.model.Manga
import tachiyomi.domain.manga.model.MangaUpdate
import tachiyomi.domain.manga.repository.MangaRepository
import tachiyomi.domain.source.model.StubSource
import tachiyomi.domain.source.service.SourceManager
import tachiyomi.source.local.isLocal
import kotlin.time.Clock

class UpdateMangaFromRemote(
    private val sourceManager: SourceManager,
    private val chapterRepository: ChapterRepository,
    private val mangaRepository: MangaRepository,
    private val syncChaptersWithSource: SyncChaptersWithSource,
    private val coverCache: CoverCache,
    private val libraryPreferences: LibraryPreferences,
    private val downloadManager: DownloadManager,
) {
    suspend operator fun invoke(
        manga: Manga,
        fetchDetails: Boolean = false,
        fetchChapters: Boolean = false,
        manualFetch: Boolean = false,
        fetchWindow: Pair<Long, Long> = Pair(0, 0),
    ): Result<RemoteMangaUpdate> {
        val source = sourceManager.getOrStub(manga.source)
        return invoke(
            source = source,
            manga = manga,
            fetchDetails = fetchDetails,
            fetchChapters = fetchChapters,
            manualFetch = manualFetch,
            fetchWindow = fetchWindow,
        )
    }

    suspend operator fun invoke(
        source: Source,
        manga: Manga,
        fetchDetails: Boolean = false,
        fetchChapters: Boolean = false,
        manualFetch: Boolean = false,
        fetchWindow: Pair<Long, Long> = Pair(0, 0),
    ): Result<RemoteMangaUpdate> {
        return try {
            val chapters = chapterRepository.getChapterByMangaId(manga.id)
                .sortedBy { it.sourceOrder }

            var actualSource = source
            if (actualSource is StubSource) {
                val installed = sourceManager.getOnlineSources().firstOrNull {
                    it.name.equals(actualSource.name, ignoreCase = true) ||
                    it.name.contains(actualSource.name, ignoreCase = true) ||
                    actualSource.name.contains(it.name, ignoreCase = true)
                }
                if (installed != null) {
                    actualSource = installed
                    mangaRepository.update(MangaUpdate(id = manga.id, source = installed.id))
                }
            }

            var currentManga = mangaRepository.getMangaById(manga.id) ?: manga
            val update = withIOContext {
                try {
                    actualSource.getMangaUpdate(
                        manga = currentManga.toSManga(),
                        chapters = chapters.map(Chapter::toSChapter),
                        fetchDetails = fetchDetails,
                        fetchChapters = fetchChapters,
                    )
                } catch (e: Exception) {
                    // Si ocurre 404 o fallo de ruta antigua, auto-resolver buscando por título
                    val resolved = tryResolveMangaUrl(actualSource, currentManga)
                    if (resolved != null) {
                        currentManga = resolved
                        actualSource.getMangaUpdate(
                            manga = currentManga.toSManga(),
                            chapters = chapters.map(Chapter::toSChapter),
                            fetchDetails = fetchDetails,
                            fetchChapters = fetchChapters,
                        )
                    } else {
                        throw e
                    }
                }
            }
            awaitUpdateFromSource(currentManga, update.manga, manualFetch)
            val newChapters = syncChaptersWithSource.await(
                rawSourceChapters = update.chapters,
                manga = currentManga,
                source = actualSource,
                manualFetch = manualFetch,
                fetchWindow = fetchWindow,
            )
            val updatedManga = mangaRepository.getMangaById(currentManga.id)

            Result.success(RemoteMangaUpdate(manga = updatedManga, newChapters = newChapters))
        } catch (e: Exception) {
            logcat(LogPriority.ERROR, e)
            Result.failure(e)
        }
    }

    private suspend fun tryResolveMangaUrl(source: Source, manga: Manga): Manga? {
        if (manga.title.isBlank() || source is StubSource) return null
        return try {
            val searchTitle = manga.title.trim()
            val searchPage = if (source is HttpSource) {
                source.getSearchManga(1, searchTitle, FilterList())
            } else {
                null
            }

            val bestMatch = searchPage?.mangas?.firstOrNull { sManga ->
                val sTitle = sManga.title.trim().lowercase()
                val mTitle = searchTitle.lowercase()
                sTitle == mTitle || sTitle.contains(mTitle) || mTitle.contains(sTitle)
            } ?: searchPage?.mangas?.firstOrNull()

            if (bestMatch != null && bestMatch.url.isNotBlank() && bestMatch.url != manga.url) {
                logcat(LogPriority.INFO) { "[Yomori] Auto-resolved URL for '${manga.title}': '${manga.url}' -> '${bestMatch.url}'" }
                val update = MangaUpdate(
                    id = manga.id,
                    url = bestMatch.url,
                    thumbnailUrl = bestMatch.thumbnail_url?.takeIf { it.isNotBlank() },
                )
                mangaRepository.update(update)
                mangaRepository.getMangaById(manga.id)
            } else {
                null
            }
        } catch (e: Exception) {
            logcat(LogPriority.WARN, e) { "[Yomori] Fallback URL search failed for '${manga.title}'" }
            null
        }
    }

    private suspend fun awaitUpdateFromSource(
        localManga: Manga,
        remoteManga: SManga,
        manualFetch: Boolean,
    ): Boolean {
        val remoteTitle = try {
            remoteManga.title
        } catch (_: UninitializedPropertyAccessException) {
            ""
        }

        // if the manga isn't a favorite (or 'update titles' preference is enabled), set its title from source and update in db
        val title =
            if (remoteTitle.isNotEmpty() && (!localManga.favorite || libraryPreferences.updateMangaTitles.get())) {
                remoteTitle
            } else {
                null
            }

        val coverLastModified = when {
            // Never refresh covers if the url is empty to avoid "losing" existing covers
            remoteManga.thumbnail_url.isNullOrEmpty() -> null
            !manualFetch && localManga.thumbnailUrl == remoteManga.thumbnail_url -> null
            localManga.isLocal() -> Clock.System.now().toEpochMilliseconds()
            localManga.hasCustomCover(coverCache) -> {
                coverCache.deleteFromCache(localManga, false)
                null
            }
            else -> {
                coverCache.deleteFromCache(localManga, false)
                Clock.System.now().toEpochMilliseconds()
            }
        }

        val thumbnailUrl = remoteManga.thumbnail_url?.takeIf { it.isNotEmpty() }

        val success = mangaRepository.update(
            MangaUpdate(
                id = localManga.id,
                title = title,
                coverLastModified = coverLastModified,
                author = remoteManga.author,
                artist = remoteManga.artist,
                description = remoteManga.description,
                genre = remoteManga.getGenres(),
                thumbnailUrl = thumbnailUrl,
                status = remoteManga.status.toLong(),
                updateStrategy = remoteManga.update_strategy,
                initialized = true,
                memo = remoteManga.memo,
            ),
        )
        if (success && title != null) {
            downloadManager.renameManga(localManga, title)
        }
        return success
    }
}
