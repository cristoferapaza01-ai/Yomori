package eu.kanade.tachiyomi.ui.library

import androidx.activity.compose.BackHandler
import androidx.compose.animation.graphics.res.animatedVectorResource
import androidx.compose.animation.graphics.res.rememberAnimatedVectorPainter
import androidx.compose.animation.graphics.vector.AnimatedImageVector
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.NewReleases
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.fastAll
import androidx.lifecycle.viewmodel.compose.viewModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.navigator.currentOrThrow
import cafe.adriel.voyager.navigator.tab.LocalTabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import eu.kanade.presentation.category.components.ChangeCategoryDialog
import eu.kanade.presentation.library.DeleteLibraryMangaDialog
import eu.kanade.presentation.library.LibrarySettingsDialog
import eu.kanade.presentation.library.components.LibraryContent
import eu.kanade.presentation.library.components.LibraryToolbar
import eu.kanade.presentation.manga.components.LibraryBottomActionMenu
import eu.kanade.presentation.more.onboarding.GETTING_STARTED_URL
import eu.kanade.presentation.util.Tab
import eu.kanade.tachiyomi.R
import eu.kanade.tachiyomi.data.library.LibraryUpdateJob
import eu.kanade.tachiyomi.ui.browse.source.globalsearch.GlobalSearchScreen
import eu.kanade.tachiyomi.ui.category.CategoryScreen
import eu.kanade.tachiyomi.ui.history.HistoryTab
import eu.kanade.tachiyomi.ui.home.HomeScreen
import eu.kanade.tachiyomi.ui.main.MainActivity
import eu.kanade.tachiyomi.ui.manga.MangaScreen
import eu.kanade.tachiyomi.ui.reader.ReaderActivity
import eu.kanade.tachiyomi.ui.updates.UpdatesTab
import eu.kanade.tachiyomi.ui.yomori.ui.TextMuted
import eu.kanade.tachiyomi.ui.yomori.ui.TextSecondary
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriBorder
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriSurfaceDark
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriTeal
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import mihon.feature.migration.config.MigrationConfigScreen
import tachiyomi.core.common.i18n.stringResource
import tachiyomi.core.common.util.lang.launchIO
import tachiyomi.domain.category.model.Category
import tachiyomi.domain.library.model.LibraryManga
import tachiyomi.domain.manga.model.Manga
import tachiyomi.i18n.MR
import tachiyomi.presentation.core.components.material.Scaffold
import tachiyomi.presentation.core.i18n.stringResource
import tachiyomi.presentation.core.screens.EmptyScreen
import tachiyomi.presentation.core.screens.EmptyScreenAction
import tachiyomi.presentation.core.screens.LoadingScreen
import tachiyomi.source.local.isLocal

enum class LibrarySubTab {
    COLLECTION,
    HISTORY,
    UPDATES
}

data object LibraryTab : Tab {

    private val subTabChannel = Channel<LibrarySubTab>(1, BufferOverflow.DROP_OLDEST)
    fun showCollection() = subTabChannel.trySend(LibrarySubTab.COLLECTION)
    fun showHistory() = subTabChannel.trySend(LibrarySubTab.HISTORY)
    fun showUpdates() = subTabChannel.trySend(LibrarySubTab.UPDATES)

    override val options: TabOptions
        @Composable
        get() {
            val isSelected = LocalTabNavigator.current.current.key == key
            val image = AnimatedImageVector.animatedVectorResource(R.drawable.anim_library_enter)
            return TabOptions(
                index = 0u,
                title = stringResource(MR.strings.label_library),
                icon = rememberAnimatedVectorPainter(image, isSelected),
            )
        }

    override suspend fun onReselect(navigator: Navigator) {
        requestOpenSettingsSheet()
    }

    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        val context = LocalContext.current
        val scope = rememberCoroutineScope()
        val haptic = LocalHapticFeedback.current

        var currentSubTab by rememberSaveable { mutableStateOf(LibrarySubTab.COLLECTION) }

        LaunchedEffect(Unit) {
            subTabChannel.receiveAsFlow().collectLatest { currentSubTab = it }
        }

        val viewModel = viewModel<LibraryViewModel>()
        val settingsViewModel = viewModel<LibrarySettingsViewModel>()
        val state by viewModel.state.collectAsState()

        val snackbarHostState = remember { SnackbarHostState() }

        val onClickRefresh: (Category?) -> Boolean = { category ->
            val started = LibraryUpdateJob.startNow(context, category)
            scope.launch {
                val msgRes = when {
                    !started -> MR.strings.update_already_running
                    category != null -> MR.strings.updating_category
                    else -> MR.strings.updating_library
                }
                snackbarHostState.showSnackbar(context.stringResource(msgRes))
            }
            started
        }

        when (currentSubTab) {
            LibrarySubTab.COLLECTION -> {
                Scaffold(
                    topBar = { scrollBehavior ->
                        Column(modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background)) {
                            val title = state.getToolbarTitle(
                                defaultTitle = stringResource(MR.strings.label_library),
                                defaultCategoryTitle = stringResource(MR.strings.label_default),
                                page = state.coercedActiveCategoryIndex,
                            )
                            LibraryToolbar(
                                hasActiveFilters = state.hasActiveFilters,
                                selectedCount = state.selection.size,
                                title = title,
                                onClickUnselectAll = viewModel::clearSelection,
                                onClickSelectAll = viewModel::selectAll,
                                onClickInvertSelection = viewModel::invertSelection,
                                onClickFilter = viewModel::showSettingsDialog,
                                onClickRefresh = { onClickRefresh(state.activeCategory) },
                                onClickGlobalUpdate = { onClickRefresh(null) },
                                onClickOpenRandomManga = {
                                    scope.launch {
                                        val randomItem = viewModel.getRandomLibraryItemForCurrentCategory()
                                        if (randomItem != null) {
                                            navigator.push(MangaScreen(randomItem.libraryManga.manga.id))
                                        } else {
                                            snackbarHostState.showSnackbar(
                                                context.stringResource(MR.strings.information_no_entries_found),
                                            )
                                        }
                                    }
                                },
                                searchQuery = state.searchQuery,
                                onSearchQueryChange = viewModel::search,
                                scrollBehavior = scrollBehavior.takeIf { !state.showCategoryTabs },
                            )

                            LibrarySubTabSelector(
                                currentSubTab = currentSubTab,
                                onSubTabSelected = { currentSubTab = it }
                            )
                        }
                    },
                    bottomBar = {
                        LibraryBottomActionMenu(
                            visible = state.selectionMode,
                            onChangeCategoryClicked = viewModel::openChangeCategoryDialog,
                            onMarkAsReadClicked = { viewModel.markReadSelection(true) },
                            onMarkAsUnreadClicked = { viewModel.markReadSelection(false) },
                            onDownloadClicked = viewModel::performDownloadAction
                                .takeIf { state.selectedManga.fastAll { !it.isLocal() } },
                            onDeleteClicked = viewModel::openDeleteMangaDialog,
                            onMigrateClicked = {
                                val selection = state.selection
                                viewModel.clearSelection()
                                navigator.push(MigrationConfigScreen(selection))
                            },
                        )
                    },
                    snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
                ) { contentPadding ->
                    when {
                        state.isLoading -> {
                            LoadingScreen(Modifier.padding(contentPadding))
                        }
                        state.searchQuery.isNullOrEmpty() && !state.hasActiveFilters && state.isLibraryEmpty -> {
                            val handler = LocalUriHandler.current
                            EmptyScreen(
                                stringRes = MR.strings.information_empty_library,
                                modifier = Modifier.padding(contentPadding),
                                actions = listOf(
                                    EmptyScreenAction(
                                        stringRes = MR.strings.getting_started_guide,
                                        icon = Icons.AutoMirrored.Outlined.HelpOutline,
                                        onClick = { handler.openUri(GETTING_STARTED_URL) },
                                    ),
                                ),
                            )
                        }
                        else -> {
                            LibraryContent(
                                categories = state.displayedCategories,
                                searchQuery = state.searchQuery,
                                selection = state.selection,
                                contentPadding = contentPadding,
                                currentPage = state.coercedActiveCategoryIndex,
                                hasActiveFilters = state.hasActiveFilters,
                                showPageTabs = state.showCategoryTabs || !state.searchQuery.isNullOrEmpty(),
                                onChangeCurrentPage = viewModel::updateActiveCategoryIndex,
                                onClickManga = { navigator.push(MangaScreen(it)) },
                                onContinueReadingClicked = { it: LibraryManga ->
                                    scope.launchIO {
                                        val chapter = viewModel.getNextUnreadChapter(it.manga)
                                        if (chapter != null) {
                                            context.startActivity(
                                                ReaderActivity.newIntent(context, chapter.mangaId, chapter.id),
                                            )
                                        } else {
                                            snackbarHostState.showSnackbar(context.stringResource(MR.strings.no_next_chapter))
                                        }
                                    }
                                    Unit
                                }.takeIf { state.showMangaContinueButton },
                                onToggleSelection = viewModel::toggleSelection,
                                onToggleRangeSelection = { category, manga ->
                                    viewModel.toggleRangeSelection(category, manga)
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                },
                                onRefresh = { onClickRefresh(state.activeCategory) },
                                onGlobalSearchClicked = {
                                    navigator.push(GlobalSearchScreen(viewModel.state.value.searchQuery ?: ""))
                                },
                                getItemCountForCategory = { state.getItemCountForCategory(it) },
                                getDisplayMode = { viewModel.getDisplayMode() },
                                getColumnsForOrientation = { viewModel.getColumnsForOrientation(it) },
                                getItemsForCategory = { state.getItemsForCategory(it) },
                            )
                        }
                    }
                }

                val onDismissRequest = viewModel::closeDialog
                when (val dialog = state.dialog) {
                    is LibraryViewModel.Dialog.SettingsSheet -> run {
                        LibrarySettingsDialog(
                            onDismissRequest = onDismissRequest,
                            viewModel = settingsViewModel,
                            category = state.activeCategory,
                        )
                    }
                    is LibraryViewModel.Dialog.ChangeCategory -> {
                        ChangeCategoryDialog(
                            initialSelection = dialog.initialSelection,
                            onDismissRequest = onDismissRequest,
                            onEditCategories = {
                                viewModel.clearSelection()
                                navigator.push(CategoryScreen())
                            },
                            onConfirm = { include, exclude ->
                                viewModel.clearSelection()
                                viewModel.setMangaCategories(dialog.manga, include, exclude)
                            },
                        )
                    }
                    is LibraryViewModel.Dialog.DeleteManga -> {
                        DeleteLibraryMangaDialog(
                            containsLocalManga = dialog.manga.any(Manga::isLocal),
                            onDismissRequest = onDismissRequest,
                            onConfirm = { deleteManga, deleteChapter ->
                                viewModel.removeMangas(dialog.manga, deleteManga, deleteChapter)
                                viewModel.clearSelection()
                            },
                        )
                    }
                    null -> {}
                }

                BackHandler(enabled = state.selectionMode || state.searchQuery != null) {
                    when {
                        state.selectionMode -> viewModel.clearSelection()
                        state.searchQuery != null -> viewModel.search(null)
                    }
                }
            }
            LibrarySubTab.HISTORY -> {
                HistoryTab.Content(
                    headerContent = {
                        LibrarySubTabSelector(
                            currentSubTab = currentSubTab,
                            onSubTabSelected = { currentSubTab = it }
                        )
                    }
                )
            }
            LibrarySubTab.UPDATES -> {
                UpdatesTab.Content(
                    headerContent = {
                        LibrarySubTabSelector(
                            currentSubTab = currentSubTab,
                            onSubTabSelected = { currentSubTab = it }
                        )
                    }
                )
            }
        }

        LaunchedEffect(state.selectionMode, state.dialog) {
            HomeScreen.showBottomNav(!state.selectionMode)
        }

        LaunchedEffect(state.isLoading) {
            if (!state.isLoading) {
                (context as? MainActivity)?.ready = true
            }
        }

        LaunchedEffect(Unit) {
            launch { queryEvent.receiveAsFlow().collect(viewModel::search) }
            launch { requestSettingsSheetEvent.receiveAsFlow().collectLatest { viewModel.showSettingsDialog() } }
        }
    }

    // For invoking search from other screen
    private val queryEvent = Channel<String>()
    suspend fun search(query: String) = queryEvent.send(query)

    // For opening settings sheet in LibraryController
    private val requestSettingsSheetEvent = Channel<Unit>()
    private suspend fun requestOpenSettingsSheet() = requestSettingsSheetEvent.send(Unit)
}

@Composable
fun LibrarySubTabSelector(
    currentSubTab: LibrarySubTab,
    onSubTabSelected: (LibrarySubTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val items = listOf(
            Triple(LibrarySubTab.COLLECTION, "Colección", Icons.Filled.CollectionsBookmark),
            Triple(LibrarySubTab.HISTORY, "Historial", Icons.Filled.History),
            Triple(LibrarySubTab.UPDATES, "Novedades", Icons.Filled.NewReleases),
        )

        items.forEach { (tab, label, icon) ->
            val isSelected = currentSubTab == tab
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSubTabSelected(tab) },
                color = if (isSelected) YomoriTeal.copy(alpha = 0.2f) else YomoriSurfaceDark,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(
                    1.dp,
                    if (isSelected) YomoriTeal else YomoriBorder
                )
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 7.dp, horizontal = 4.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = if (isSelected) YomoriTeal else TextMuted,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        text = label,
                        color = if (isSelected) YomoriTeal else TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
