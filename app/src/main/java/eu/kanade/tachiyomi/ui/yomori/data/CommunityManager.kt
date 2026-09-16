package eu.kanade.tachiyomi.ui.yomori.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class CommunityMember(
    val userId: String,
    val username: String,
    val avatarUrl: String,
    val rankTitle: String,
    val rankColor: Long,
    val role: String = "MEMBER", // "ADMIN", "CREATOR", "MEMBER"
    val isOnline: Boolean = true
)

data class YomoriCommunityMessage(
    val id: String,
    val communityId: String,
    val userId: String,
    val username: String,
    val userAvatar: String,
    val badge: String,
    val badgeColor: Long,
    val message: String,
    val timestamp: String,
    val imageUrl: String? = null,
    val reactions: Map<String, List<String>> = emptyMap(),
    val replyToUser: String? = null,
    val replyToText: String? = null
)

data class YomoriCommunity(
    val id: String,
    val name: String,
    val description: String,
    val bannerUrl: String,
    val iconUrl: String,
    val creatorUsername: String,
    val creatorId: String,
    val genres: List<String>,
    val memberCount: Int,
    val members: List<CommunityMember> = emptyList(),
    val isJoined: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

val COMMUNITY_GENRES = listOf(
    "Todas",
    "Acción",
    "Aventura",
    "Artes Marciales",
    "Cultivo",
    "Comedia",
    "Drama",
    "Fantasía",
    "Isekai",
    "Misterio",
    "Psicológico",
    "Romance",
    "Recuentos de la Vida",
    "Reencarnación",
    "Sci-Fi"
)

val COMMUNITY_BANNER_PRESETS = listOf(
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80", // Torii Gate Anime
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80", // Cyberpunk City
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80", // Fantasy Landscape
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80", // Mystic Temple
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80", // Warrior Sunset
)

val COMMUNITY_ICON_PRESETS = listOf(
    "https://api.dicebear.com/7.x/bottts/png?seed=secta_admin&backgroundColor=ffcdd2",
    "https://api.dicebear.com/7.x/bottts/png?seed=cultivador_dragon&backgroundColor=fff9c4",
    "https://api.dicebear.com/7.x/bottts/png?seed=monarca_sombras&backgroundColor=c8e6c9",
    "https://api.dicebear.com/7.x/bottts/png?seed=isekai_guild&backgroundColor=bbdefb",
    "https://api.dicebear.com/7.x/bottts/png?seed=romance_club&backgroundColor=f8bbd0",
)

object CommunityManager {

    private val _communities = MutableStateFlow<List<YomoriCommunity>>(
        listOf(
            YomoriCommunity(
                id = "secta-admin",
                name = "LA SECTA DEL ADMIN",
                description = "Ayuden a mejorar pe causas",
                bannerUrl = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
                iconUrl = "https://api.dicebear.com/7.x/bottts/png?seed=secta_admin&backgroundColor=ffcdd2",
                creatorUsername = "Rey_Palomo",
                creatorId = "admin_rey_palomo",
                genres = listOf("Acción", "Aventura", "Cultivo"),
                memberCount = 1,
                members = listOf(
                    CommunityMember(
                        userId = "admin_rey_palomo",
                        username = "Rey_Palomo",
                        avatarUrl = "https://api.dicebear.com/7.x/bottts/png?seed=cyber_crimson&backgroundColor=ffcdd2,f8bbd0",
                        rankTitle = "ADMIN",
                        rankColor = 0xFFFF0055L,
                        role = "ADMINISTRADOR GLOBAL",
                        isOnline = true
                    )
                ),
                isJoined = true
            ),
            YomoriCommunity(
                id = "monarcas-cultivo",
                name = "MONARCAS DEL CULTIVO",
                description = "Comunidad de debate de manhuas de cultivo, reencarnación y sectas inmortales.",
                bannerUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
                iconUrl = "https://api.dicebear.com/7.x/bottts/png?seed=cultivador_dragon&backgroundColor=fff9c4",
                creatorUsername = "Daoist_Immortal",
                creatorId = "user_daoist",
                genres = listOf("Cultivo", "Artes Marciales", "Reencarnación"),
                memberCount = 18,
                members = listOf(
                    CommunityMember(
                        userId = "user_daoist",
                        username = "Daoist_Immortal",
                        avatarUrl = "https://api.dicebear.com/7.x/bottts/png?seed=gold_erudite&backgroundColor=fff9c4,ffe0b2",
                        rankTitle = "Erudito Supremo",
                        rankColor = 0xFFFFD700L,
                        role = "CREADOR",
                        isOnline = true
                    ),
                    CommunityMember(
                        userId = "user_cloud",
                        username = "CloudSeeker",
                        avatarUrl = "https://api.dicebear.com/7.x/bottts/png?seed=mecha_blue&backgroundColor=bbdefb,d1c4e9",
                        rankTitle = "Lector Veterano",
                        rankColor = 0xFFEC4899L,
                        role = "MIEMBRO",
                        isOnline = true
                    )
                ),
                isJoined = false
            ),
            YomoriCommunity(
                id = "gremio-isekai",
                name = "GREMIO CAZADORES ISEKAI",
                description = "Los mejores mangas y manhwas de reencarnación, mazmorras y subidas de nivel.",
                bannerUrl = "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
                iconUrl = "https://api.dicebear.com/7.x/bottts/png?seed=isekai_guild&backgroundColor=bbdefb",
                creatorUsername = "Jinwoo_Shadow",
                creatorId = "user_jinwoo",
                genres = listOf("Isekai", "Fantasía", "Acción"),
                memberCount = 32,
                members = listOf(
                    CommunityMember(
                        userId = "user_jinwoo",
                        username = "Jinwoo_Shadow",
                        avatarUrl = "https://api.dicebear.com/7.x/bottts/png?seed=monarca_sombras&backgroundColor=c8e6c9",
                        rankTitle = "Gran Maestro Lector",
                        rankColor = 0xFFF59E0BL,
                        role = "CREADOR",
                        isOnline = true
                    )
                ),
                isJoined = false
            )
        )
    )
    val communities = _communities.asStateFlow()

    private val _selectedGenre = MutableStateFlow("Todas")
    val selectedGenre = _selectedGenre.asStateFlow()

    private val _communityMessages = MutableStateFlow<Map<String, List<YomoriCommunityMessage>>>(
        mapOf(
            "secta-admin" to listOf(
                YomoriCommunityMessage(
                    id = "msg-1",
                    communityId = "secta-admin",
                    userId = "admin_rey_palomo",
                    username = "Rey_Palomo",
                    userAvatar = "https://api.dicebear.com/7.x/bottts/png?seed=cyber_crimson&backgroundColor=ffcdd2,f8bbd0",
                    badge = "👑 ADMIN",
                    badgeColor = 0xFFFF0055L,
                    message = "¡Bienvenidos a La Secta del Admin! Dejen sus opiniones y recomendaciones de mangas acá.",
                    timestamp = "15:30",
                    reactions = mapOf("🔥" to listOf("admin_rey_palomo", "user_guest"), "❤️" to listOf("admin_rey_palomo"))
                )
            )
        )
    )
    val communityMessages = _communityMessages.asStateFlow()

    fun selectGenre(genre: String) {
        _selectedGenre.value = genre
    }

    fun getMessagesForCommunity(communityId: String): List<YomoriCommunityMessage> {
        return _communityMessages.value[communityId] ?: emptyList()
    }

    fun sendCommunityMessage(
        communityId: String,
        text: String,
        imageUrl: String? = null,
        replyToUser: String? = null,
        replyToText: String? = null
    ) {
        val user = UserManager.userState.value
        val time = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        val msgBadge = if (user.isAdmin) "👑 ADMIN" else "[${user.rankTier}] ${user.rankTitle}"

        val newMsg = YomoriCommunityMessage(
            id = "cmsg-${System.currentTimeMillis()}",
            communityId = communityId,
            userId = user.id,
            username = user.username,
            userAvatar = user.avatarUrl,
            badge = msgBadge,
            badgeColor = user.rankColor,
            message = text.trim(),
            timestamp = time,
            imageUrl = imageUrl,
            replyToUser = replyToUser,
            replyToText = replyToText
        )

        val currentList = _communityMessages.value[communityId] ?: emptyList()
        _communityMessages.value = _communityMessages.value + (communityId to (currentList + newMsg))
        UserManager.addXp(15) // +15 XP por interactuar en la comunidad
    }

    fun toggleEmojiReaction(communityId: String, messageId: String, emoji: String) {
        val user = UserManager.userState.value
        val currentList = _communityMessages.value[communityId] ?: return
        val updatedList = currentList.map { msg ->
            if (msg.id == messageId) {
                val currentUsers = msg.reactions[emoji] ?: emptyList()
                val newReactions = msg.reactions.toMutableMap()
                if (currentUsers.contains(user.id)) {
                    val nextUsers = currentUsers - user.id
                    if (nextUsers.isEmpty()) {
                        newReactions.remove(emoji)
                    } else {
                        newReactions[emoji] = nextUsers
                    }
                } else {
                    newReactions[emoji] = currentUsers + user.id
                    UserManager.addXp(5) // +5 XP por reaccionar
                }
                msg.copy(reactions = newReactions)
            } else msg
        }
        _communityMessages.value = _communityMessages.value + (communityId to updatedList)
    }

    fun deleteCommunityMessage(communityId: String, messageId: String) {
        val currentList = _communityMessages.value[communityId] ?: return
        _communityMessages.value = _communityMessages.value + (communityId to currentList.filter { it.id != messageId })
    }

    fun createCommunity(
        name: String,
        description: String,
        genres: List<String>,
        bannerUrl: String,
        iconUrl: String
    ): YomoriCommunity {
        val user = UserManager.userState.value
        val newCommunity = YomoriCommunity(
            id = "comm-${UUID.randomUUID().toString().take(8)}",
            name = name.trim(),
            description = description.trim(),
            bannerUrl = bannerUrl.ifBlank { COMMUNITY_BANNER_PRESETS[0] },
            iconUrl = iconUrl.ifBlank { COMMUNITY_ICON_PRESETS[0] },
            creatorUsername = user.username,
            creatorId = user.id,
            genres = if (genres.isEmpty()) listOf("Acción") else genres,
            memberCount = 1,
            members = listOf(
                CommunityMember(
                    userId = user.id,
                    username = user.username,
                    avatarUrl = user.avatarUrl,
                    rankTitle = user.rankTitle,
                    rankColor = user.rankColor,
                    role = if (user.isAdmin) "ADMINISTRADOR GLOBAL" else "CREADOR",
                    isOnline = true
                )
            ),
            isJoined = true
        )

        _communities.value = listOf(newCommunity) + _communities.value
        UserManager.addXp(50) // +50 XP por fundar una comunidad
        return newCommunity
    }

    fun toggleJoinCommunity(communityId: String) {
        val user = UserManager.userState.value
        val list = _communities.value.map { comm ->
            if (comm.id == communityId) {
                val nowJoined = !comm.isJoined
                val newCount = if (nowJoined) comm.memberCount + 1 else (comm.memberCount - 1).coerceAtLeast(1)
                val newMembers = if (nowJoined) {
                    comm.members + CommunityMember(
                        userId = user.id,
                        username = user.username,
                        avatarUrl = user.avatarUrl,
                        rankTitle = user.rankTitle,
                        rankColor = user.rankColor,
                        role = "MIEMBRO",
                        isOnline = true
                    )
                } else {
                    comm.members.filter { it.userId != user.id }
                }
                comm.copy(isJoined = nowJoined, memberCount = newCount, members = newMembers)
            } else comm
        }
        _communities.value = list
    }
}

