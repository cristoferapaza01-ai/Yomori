package eu.kanade.tachiyomi.ui.yomori.data

import kotlinx.coroutines.flow.MutableStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ChatMessage(
    val id: String,
    val channelId: String,
    val username: String,
    val userAvatar: String,
    val userRank: String,
    val message: String,
    val timestamp: String,
    val isOfficial: Boolean = false
)

data class ChatChannel(
    val id: String,
    val name: String,
    val description: String,
    val icon: String
)

object CommunityManager {
    val channels = listOf(
        ChatChannel("general", "#general", "Charla libre entre lectores de Yomori", "💬"),
        ChatChannel("recom", "#recomendaciones", "Pide y comparte tus mejores mangas y manhwas", "⭐"),
        ChatChannel("spoilers", "#spoilers-alert", "Debates intensos sobre los últimos capítulos", "🔥"),
        ChatChannel("noticias", "#noticias-yomori", "Lanzamientos oficiales y avisos de scans", "📢")
    )

    val activeChannel = MutableStateFlow(channels[0])

    val messages = MutableStateFlow(
        listOf(
            ChatMessage(
                id = "1",
                channelId = "general",
                username = "Admin Yomori",
                userAvatar = "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80",
                userRank = "Soberano Supremo",
                message = "¡Bienvenidos a la comunidad oficial de Yomori Manga! 🎉 Disfruten de la lectura sin anuncios.",
                timestamp = "14:00",
                isOfficial = true
            ),
            ChatMessage(
                id = "2",
                channelId = "general",
                username = "Jinwoo_Shadow",
                userAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
                userRank = "Monarca Lector",
                message = "¿Alguien ya leyó el capítulo de hoy de Ragnarok? ¡El dibujo estuvo increíble!",
                timestamp = "14:15"
            ),
            ChatMessage(
                id = "3",
                channelId = "general",
                username = "TurtleReader",
                userAvatar = "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80",
                userRank = "Cazador de Sombras",
                message = "Sí, Olympus Scan lo sacó súper rápido hoy. Me encanta esta app.",
                timestamp = "14:22"
            )
        )
    )

    fun sendMessage(text: String) {
        val user = UserManager.userState.value
        val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        val newMsg = ChatMessage(
            id = System.currentTimeMillis().toString(),
            channelId = activeChannel.value.id,
            username = user.username,
            userAvatar = user.avatarUrl,
            userRank = user.rankTitle,
            message = text,
            timestamp = time
        )
        messages.value = messages.value + newMsg
        UserManager.addXp(10) // +10 XP for participating in community
    }
}
