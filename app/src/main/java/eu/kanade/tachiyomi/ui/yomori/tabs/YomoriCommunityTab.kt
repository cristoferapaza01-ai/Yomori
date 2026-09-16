package eu.kanade.tachiyomi.ui.yomori.tabs

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.navigator.tab.LocalTabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import eu.kanade.presentation.util.Tab
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriCommunityScreen

data object YomoriCommunityTab : Tab {

    override val options: TabOptions
        @Composable
        get() {
            val isSelected = LocalTabNavigator.current.current.key == key
            val painter = rememberVectorPainter(if (isSelected) Icons.Filled.Forum else Icons.Outlined.Forum)
            return TabOptions(
                index = 2u,
                title = "Comunidad",
                icon = painter,
            )
        }

    override suspend fun onReselect(navigator: Navigator) {}

    @Composable
    override fun Content() {
        YomoriCommunityScreen()
    }
}
