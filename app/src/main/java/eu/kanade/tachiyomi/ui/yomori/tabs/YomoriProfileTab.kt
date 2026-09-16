package eu.kanade.tachiyomi.ui.yomori.tabs

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Person
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.navigator.tab.LocalTabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import eu.kanade.presentation.util.Tab
import eu.kanade.tachiyomi.ui.yomori.ui.YomoriProfileScreen

data object YomoriProfileTab : Tab {

    override val options: TabOptions
        @Composable
        get() {
            val isSelected = LocalTabNavigator.current.current.key == key
            val painter = rememberVectorPainter(if (isSelected) Icons.Filled.Person else Icons.Outlined.Person)
            return TabOptions(
                index = 4u,
                title = "Perfil",
                icon = painter,
            )
        }

    override suspend fun onReselect(navigator: Navigator) {}

    @Composable
    override fun Content() {
        YomoriProfileScreen()
    }
}
