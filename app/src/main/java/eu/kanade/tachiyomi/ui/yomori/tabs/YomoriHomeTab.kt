package eu.kanade.tachiyomi.ui.yomori.tabs

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.Home
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.navigator.currentOrThrow
import cafe.adriel.voyager.navigator.tab.LocalTabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import eu.kanade.presentation.util.Tab
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.ui.browse.BrowseTab
import eu.kanade.tachiyomi.ui.manga.MangaScreen
import eu.kanade.tachiyomi.ui.browse.source.globalsearch.GlobalSearchScreen
import eu.kanade.tachiyomi.ui.yomori.data.BuiltInScansRepository
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriHomeScreen
import kotlinx.coroutines.launch
import mihon.domain.manga.model.toDomainManga
import tachiyomi.domain.manga.interactor.NetworkToLocalManga
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

data object YomoriHomeTab : Tab {

    override val options: TabOptions
        @Composable
        get() {
            val isSelected = LocalTabNavigator.current.current.key == key
            val painter = rememberVectorPainter(if (isSelected) Icons.Filled.Home else Icons.Outlined.Home)
            return TabOptions(
                index = 0u,
                title = "Inicio",
                icon = painter,
            )
        }

    override suspend fun onReselect(navigator: Navigator) {}

    @Composable
    override fun Content() {
        val tabNavigator = LocalTabNavigator.current
        val navigator = LocalNavigator.currentOrThrow
        val scope = rememberCoroutineScope()
        val networkToLocalManga = remember { Injekt.get<NetworkToLocalManga>() }

        YomoriHomeScreen(
            onMangaClick = { sourceId, mangaUrl, title, coverUrl, scanSource ->
                scope.launch {
                    try {
                        val resolved = BuiltInScansRepository.resolveMangaSourceAndUrl(
                            sourceId = sourceId,
                            scanName = scanSource,
                            title = title,
                            currentUrl = mangaUrl
                        )
                        val finalSourceId = resolved?.first?.id ?: sourceId
                        val finalUrl = resolved?.second ?: mangaUrl

                        if (finalSourceId != 0L && finalUrl.isNotBlank()) {
                            val smanga = SManga.create().apply {
                                this.url = finalUrl
                                this.title = title
                                this.thumbnail_url = coverUrl
                            }
                            val domainManga = smanga.toDomainManga(finalSourceId)
                            val localManga = networkToLocalManga(domainManga)
                            navigator.push(MangaScreen(localManga.id))
                        } else {
                            if (title.isNotBlank()) {
                                navigator.push(GlobalSearchScreen(title))
                            } else {
                                tabNavigator.current = BrowseTab
                            }
                        }
                    } catch (_: Exception) {
                        if (title.isNotBlank()) {
                            navigator.push(GlobalSearchScreen(title))
                        } else {
                            tabNavigator.current = BrowseTab
                        }
                    }
                }
            },
            onProfileClick = {
                tabNavigator.current = YomoriProfileTab
            },
            onCommunityClick = {
                tabNavigator.current = YomoriCommunityTab
            }
        )
    }
}
