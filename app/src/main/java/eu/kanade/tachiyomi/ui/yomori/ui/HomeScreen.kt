package eu.kanade.tachiyomi.ui.yomori.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import eu.kanade.tachiyomi.ui.yomori.data.BuiltInScansRepository
import eu.kanade.tachiyomi.ui.yomori.data.LiveChatMessage
import eu.kanade.tachiyomi.ui.yomori.data.UserManager
import eu.kanade.tachiyomi.ui.yomori.data.YomoriSupabaseService
import eu.kanade.tachiyomi.ui.yomori.ui.components.Yomori3DCoverFlowCarousel

@Composable
fun YomoriHomeScreen(
    onMangaClick: (sourceId: Long, mangaUrl: String, title: String, coverUrl: String, scanSource: String) -> Unit,
    onProfileClick: () -> Unit,
    onCommunityClick: () -> Unit,
) {
    val user by UserManager.userState.collectAsState()
    val heroBannerManga by BuiltInScansRepository.heroBannerManga.collectAsState()
    val weeklyTop by BuiltInScansRepository.weeklyTopList.collectAsState()
    val newReleases by BuiltInScansRepository.newReleases.collectAsState()
    val isRefreshing by BuiltInScansRepository.isRefreshing.collectAsState()

    val topHeroManga = heroBannerManga

    // Estado local para chat en vivo interactivo
    var chatMessages by remember { mutableStateOf(BuiltInScansRepository.initialChatMessages) }
    var commentText by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var replyingTo by remember { mutableStateOf<LiveChatMessage?>(null) }
    var showFullChatModal by remember { mutableStateOf(false) }
    var hasNewNotification by remember { mutableStateOf(true) }
    val coroutineScope = rememberCoroutineScope()
    val modalListState = rememberLazyListState()

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
    }

    val onToggleReaction: (String, String) -> Unit = { msgId, emoji ->
        chatMessages = chatMessages.map { msg ->
            if (msg.id == msgId) {
                val currentList = msg.reactions[emoji] ?: emptyList()
                val updatedList = if (currentList.contains(user.id)) {
                    currentList - user.id
                } else {
                    currentList + user.id
                }
                val newReactions = if (updatedList.isEmpty()) {
                    msg.reactions - emoji
                } else {
                    msg.reactions + (emoji to updatedList)
                }
                if (!currentList.contains(user.id)) {
                    UserManager.addXp(5)
                }
                msg.copy(reactions = newReactions)
            } else {
                msg
            }
        }
    }

    val onSendMessage: (String, String?, String?, String?) -> Unit = { text, imageUrl, replyUser, replyText ->
        val textToSend = text.trim()
        val msgBadge = if (user.isAdmin) "👑 ADMIN" else "[${user.rankTier}] ${user.rankTitle}"
        val newMsg = LiveChatMessage(
            id = "chat-${System.currentTimeMillis()}",
            user = user.username,
            avatarInitial = user.username.take(1).uppercase(),
            badge = msgBadge,
            badgeColor = user.rankColor,
            time = "Ahora",
            manga = "",
            text = textToSend,
            imageUrl = imageUrl,
            reactions = emptyMap(),
            replyToUser = replyUser,
            replyToText = replyText?.take(40)
        )
        chatMessages = chatMessages + listOf(newMsg)
        UserManager.addXp(15)

        coroutineScope.launch {
            YomoriSupabaseService.sendChatMessage(
                userName = user.username,
                userId = user.id,
                avatarInitial = user.username.take(1).uppercase(),
                badge = msgBadge,
                badgeColor = user.rankColor,
                mangaTitle = "",
                message = textToSend,
                imageUrl = imageUrl,
                replyToUser = replyUser,
                replyToText = replyText?.take(40)
            )
        }
    }

    LaunchedEffect(Unit) {
        val cloudChat = eu.kanade.tachiyomi.ui.yomori.data.YomoriSupabaseService.fetchChatMessages(25)
        if (cloudChat.isNotEmpty()) {
            chatMessages = cloudChat.reversed()
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(YomoriBgDark)
    ) {
        // 1. Barra Superior con Logo Yomori y Botón de Notificaciones (Respetando Notch y Batería)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Perfil de Usuario con Avatar, Apodo, Rango y @Username
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clickable { onProfileClick() }
                        .weight(1f, fill = false)
                ) {
                    Box(contentAlignment = Alignment.BottomEnd) {
                        AsyncImage(
                            model = user.avatarUrl,
                            contentDescription = user.nickname,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(YomoriSurfaceDark)
                                .border(1.5.dp, Color(user.rankColor), CircleShape)
                        )
                        Surface(
                            shape = CircleShape,
                            color = Color(user.rankColor),
                            modifier = Modifier.size(16.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("${user.level}", color = YomoriBgDark, fontWeight = FontWeight.Black, fontSize = 8.sp)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                user.nickname,
                                color = TextPrimary,
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(user.rankColor).copy(alpha = 0.2f),
                                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Color(user.rankColor), Color(user.rankColor).copy(alpha = 0.5f))))
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                ) {
                                    if (user.isAdmin) {
                                        Text("👑 ", fontSize = 9.sp)
                                    }
                                    Text(
                                        if (user.isAdmin) "ADMIN" else "[${user.rankTier}] ${user.rankTitle}",
                                        color = Color(user.rankColor),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }
                        }
                        Text(
                            "@${user.username}",
                            color = TextMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Botón de Notificaciones con Insignia
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(YomoriSurfaceDark)
                        .border(1.dp, YomoriBorder, CircleShape)
                        .clickable { hasNewNotification = false },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (hasNewNotification) Icons.Filled.Notifications else Icons.Filled.NotificationsNone,
                        contentDescription = "Notificaciones",
                        tint = if (hasNewNotification) YomoriTeal else TextSecondary,
                        modifier = Modifier.size(20.dp)
                    )
                    if (hasNewNotification) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFF3366))
                                .align(Alignment.TopEnd)
                                .offset(x = (-6).dp, y = 6.dp)
                        )
                    }
                }
            }
        }

        // 2. BANNER GRANDE DESTACADO AUTO-DESLIZANTE (HERO BANNER MULTI-MANGA)
        item {
            val heroList by BuiltInScansRepository.heroBannersList.collectAsState()
            val bannerCount = heroList.size.coerceAtLeast(1)
            val pagerState = rememberPagerState(pageCount = { bannerCount })

            LaunchedEffect(bannerCount) {
                if (bannerCount > 1) {
                    while (true) {
                        kotlinx.coroutines.delay(4500L)
                        try {
                            val nextPage = (pagerState.currentPage + 1) % bannerCount
                            pagerState.animateScrollToPage(nextPage)
                        } catch (_: Throwable) {}
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
                    .height(210.dp)
            ) {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(18.dp))
                        .border(1.dp, YomoriBorder, RoundedCornerShape(18.dp))
                ) { page ->
                    val manga = heroList.getOrNull(page) ?: heroList.first()
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable {
                                onMangaClick(
                                    manga.sourceId,
                                    manga.mangaUrl,
                                    manga.title,
                                    manga.coverUrl,
                                    manga.scanSource
                                )
                            }
                    ) {
                        AsyncImage(
                            model = manga.coverUrl,
                            contentDescription = manga.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )

                        // Overlay con degradado nocturno
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Transparent,
                                            YomoriBgDark.copy(alpha = 0.5f),
                                            YomoriBgDark.copy(alpha = 0.96f)
                                        ),
                                        startY = 40f
                                    )
                                )
                        )

                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = YomoriTeal,
                                ) {
                                    Text(
                                        if (page == 0) "MÁS LEÍDO DE HOY" else "DESTACADO #${page + 1}",
                                        color = YomoriBgDark,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Text(manga.scanSource, color = YomoriGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                manga.title,
                                color = TextPrimary,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                manga.synopsis,
                                color = TextSecondary,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )

                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(manga.latestChapter, color = YomoriTeal, fontWeight = FontWeight.Bold, fontSize = 12.sp)

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFB800), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(manga.rating, color = Color(0xFFFFB800), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // Indicadores de página de píldora en la esquina superior derecha
                if (bannerCount > 1) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp)
                            .background(YomoriBgDark.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 6.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        repeat(bannerCount) { index ->
                            val isCurrent = pagerState.currentPage == index
                            Box(
                                modifier = Modifier
                                    .size(width = if (isCurrent) 14.dp else 5.dp, height = 5.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(if (isCurrent) YomoriTeal else Color.White.copy(alpha = 0.4f))
                            )
                        }
                    }
                }
            }
        }

        // 3. PORTADA GRANDE TOP SEMANALES DESLIZABLES PARA EL LADO IZQUIERDO (CARRUSEL HORIZONTAL)
        item {
            Column(modifier = Modifier.padding(top = 18.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Whatshot, contentDescription = null, tint = Color(0xFFFF5722), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Top Semanales", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 16.sp)
                    }
                    Text("Desliza para ver más →", color = TextMuted, fontSize = 11.sp)
                }

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(weeklyTop) { manga ->
                        Box(
                            modifier = Modifier
                                .width(290.dp)
                                .height(195.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .border(1.dp, YomoriBorder, RoundedCornerShape(16.dp))
                                .clickable {
                                    onMangaClick(
                                        manga.sourceId,
                                        manga.mangaUrl,
                                        manga.title,
                                        manga.coverUrl,
                                        manga.scanSource
                                    )
                                }
                        ) {
                            AsyncImage(
                                model = manga.coverUrl,
                                contentDescription = manga.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(
                                                YomoriBgDark.copy(alpha = 0.3f),
                                                YomoriBgDark.copy(alpha = 0.95f)
                                            ),
                                            startY = 40f
                                        )
                                    )
                            )

                            Column(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = YomoriTeal,
                                    ) {
                                        Text(
                                            "TOP SEMANAL",
                                            color = YomoriBgDark,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(13.dp))
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(manga.rating, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    manga.title,
                                    color = TextPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    manga.synopsis,
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(manga.latestChapter, color = YomoriTeal, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        Text(" • ", color = TextMuted)
                                        Text(manga.scanSource, color = YomoriGreen, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. NUEVOS LANZAMIENTOS: 3D COVER-FLOW CAROUSEL
        item {
            Yomori3DCoverFlowCarousel(
                releases = newReleases,
                isRefreshing = isRefreshing,
                onRefresh = { BuiltInScansRepository.refresh() },
                onMangaClick = { release ->
                    onMangaClick(
                        release.sourceId,
                        release.mangaUrl,
                        release.title,
                        release.coverUrl,
                        release.scan
                    )
                }
            )
        }

        // 5. CHAT GLOBAL INTEGRADO CON ORDEN ASCENDENTE Y MENÚ DE ACCIONES
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 32.dp, start = 16.dp, end = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("💬 CHAT GLOBAL", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        Text("Comenta en directo con otros lectores", color = TextMuted, fontSize = 11.sp)
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.linearGradient(
                                listOf(Color(0xFF10B981).copy(alpha = 0.6f), Color(0xFF10B981).copy(alpha = 0.2f))
                            )
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF10B981))
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text("1 lector", color = Color(0xFF10B981), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Botón para navegar por el historial sin colisión de scroll
                OutlinedButton(
                    onClick = { showFullChatModal = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = YomoriSurfaceDark.copy(alpha = 0.6f),
                        contentColor = YomoriTeal
                    ),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.4f), YomoriBorder))
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Filled.History, contentDescription = null, modifier = Modifier.size(15.dp), tint = YomoriTeal)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Ver mensajes antiguos", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Lista de comentarios en orden ASCENDENTE (los más recientes abajo)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    chatMessages.takeLast(4).forEach { msg ->
                        YomoriMessageItem(
                            msg = msg,
                            currentUserId = user.id,
                            isAdmin = user.isAdmin,
                            currentUsername = user.username,
                            onReply = { replyingTo = it },
                            onToggleReaction = { emoji -> onToggleReaction(msg.id, emoji) },
                            onDelete = {
                                coroutineScope.launch {
                                    YomoriSupabaseService.deleteChatMessage(msg.id)
                                    chatMessages = chatMessages.filter { it.id != msg.id }
                                }
                            }
                        )
                    }
                }

                // Banner de preview de imagen si está seleccionada
                if (selectedImageUri != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = YomoriSurfaceVariant,
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AsyncImage(
                                    model = selectedImageUri,
                                    contentDescription = "Imagen seleccionada",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Imagen lista para enviar",
                                    color = YomoriTeal,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            IconButton(
                                onClick = { selectedImageUri = null },
                                modifier = Modifier.size(20.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Quitar imagen",
                                    tint = TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }

                // Banner de respuesta si se está respondiendo a un mensaje
                if (replyingTo != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = YomoriSurfaceVariant,
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Reply, contentDescription = null, tint = YomoriTeal, modifier = Modifier.size(13.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "Respondiendo a @${replyingTo?.user}: ${replyingTo?.text?.take(30)}...",
                                    color = YomoriTeal,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            IconButton(
                                onClick = { replyingTo = null },
                                modifier = Modifier.size(20.dp)
                            ) {
                                Icon(Icons.Filled.Close, contentDescription = "Cancelar", tint = TextMuted, modifier = Modifier.size(13.dp))
                            }
                        }
                    }
                }

                // Input para enviar mensaje al chat con icono de subir imagen a la izquierda
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = YomoriSurfaceDark,
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Botón para subir imágenes
                        IconButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                Icons.Filled.AddPhotoAlternate,
                                contentDescription = "Subir Imagen",
                                tint = if (selectedImageUri != null) YomoriTeal else TextSecondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(2.dp))

                        TextField(
                            value = commentText,
                            onValueChange = { commentText = it },
                            placeholder = {
                                Text(
                                    if (replyingTo != null) "Escribe tu respuesta a @${replyingTo?.user}..." else "Escribe tu comentario en el chat...",
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            },
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                disabledContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.weight(1f)
                        )

                        IconButton(
                            onClick = {
                                if (commentText.isNotBlank() || selectedImageUri != null) {
                                    onSendMessage(
                                        commentText,
                                        selectedImageUri?.toString(),
                                        replyingTo?.user,
                                        replyingTo?.text
                                    )
                                    commentText = ""
                                    selectedImageUri = null
                                    replyingTo = null
                                }
                            },
                            enabled = commentText.isNotBlank() || selectedImageUri != null
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Enviar",
                                tint = if (commentText.isNotBlank() || selectedImageUri != null) YomoriTeal else TextMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Espacio inferior para que el dock flotante nunca tape el chat
                Spacer(modifier = Modifier.height(110.dp))
            }
        }
    }

    // Modal de Historial Completo del Chat sin colisión de Scroll
    if (showFullChatModal) {
        var isAutoLoadingOlder by remember { mutableStateOf(false) }
        var hasInitiallyScrolled by remember { mutableStateOf(false) }

        // Posicionar automáticamente en el mensaje más nuevo al entrar al historial
        LaunchedEffect(Unit) {
            if (chatMessages.isNotEmpty()) {
                modalListState.scrollToItem(chatMessages.size - 1)
                hasInitiallyScrolled = true
            }
        }

        // Carga automática de mensajes más antiguos SOLO si el usuario hace scroll hacia arriba (tope de la lista)
        LaunchedEffect(modalListState.firstVisibleItemIndex, modalListState.isScrollInProgress) {
            if (hasInitiallyScrolled && modalListState.isScrollInProgress && modalListState.firstVisibleItemIndex <= 0 && !isAutoLoadingOlder && chatMessages.size >= 10) {
                isAutoLoadingOlder = true
                val olderMessages = YomoriSupabaseService.fetchChatMessages(chatMessages.size + 30)
                if (olderMessages.isNotEmpty()) {
                    val prevCount = chatMessages.size
                    chatMessages = (olderMessages.reversed() + chatMessages).distinctBy { it.id }
                    val diff = chatMessages.size - prevCount
                    if (diff > 0) {
                        modalListState.scrollToItem(diff)
                    }
                }
                isAutoLoadingOlder = false
            }
        }

        Dialog(
            onDismissRequest = { showFullChatModal = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(YomoriBgDark)
                    .systemBarsPadding(),
                contentAlignment = Alignment.TopCenter
            ) {
                Column(
                    modifier = Modifier
                        .widthIn(max = 720.dp)
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Header del Modal
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { showFullChatModal = false }) {
                                Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = TextPrimary)
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            Column {
                                Text("💬 CHAT GLOBAL", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 16.sp)
                                Text("Historial completo en directo", color = TextMuted, fontSize = 10.sp)
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF10B981).copy(alpha = 0.15f),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = Brush.linearGradient(
                                    listOf(Color(0xFF10B981).copy(alpha = 0.6f), Color(0xFF10B981).copy(alpha = 0.2f))
                                )
                            )
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text("1 lector", color = Color(0xFF10B981), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    HorizontalDivider(color = YomoriBorder, thickness = 1.dp, modifier = Modifier.padding(vertical = 8.dp))

                    if (isAutoLoadingOlder) {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Cargando mensajes anteriores...", color = YomoriTeal, fontSize = 10.sp)
                        }
                    }

                    // Lista de mensajes con scroll independiente
                    LazyColumn(
                        state = modalListState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(chatMessages, key = { it.id }) { msg ->
                            YomoriMessageItem(
                                msg = msg,
                                currentUserId = user.id,
                                isAdmin = user.isAdmin,
                                currentUsername = user.username,
                                onReply = { replyingTo = it },
                                onToggleReaction = { emoji -> onToggleReaction(msg.id, emoji) },
                                onDelete = {
                                    coroutineScope.launch {
                                        YomoriSupabaseService.deleteChatMessage(msg.id)
                                        chatMessages = chatMessages.filter { it.id != msg.id }
                                    }
                                }
                            )
                        }
                    }

                    // Banner de preview de imagen si está seleccionada dentro del modal
                    if (selectedImageUri != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = YomoriSurfaceVariant,
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    AsyncImage(
                                        model = selectedImageUri,
                                        contentDescription = "Imagen seleccionada",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Imagen lista para enviar",
                                        color = YomoriTeal,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                                IconButton(
                                    onClick = { selectedImageUri = null },
                                    modifier = Modifier.size(20.dp)
                                ) {
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = "Quitar imagen",
                                        tint = TextMuted,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Banner de respuesta dentro del modal
                    if (replyingTo != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = YomoriSurfaceVariant,
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.Reply, contentDescription = null, tint = YomoriTeal, modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "Respondiendo a @${replyingTo?.user}: ${replyingTo?.text?.take(30)}...",
                                        color = YomoriTeal,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                IconButton(
                                    onClick = { replyingTo = null },
                                    modifier = Modifier.size(20.dp)
                                ) {
                                    Icon(Icons.Filled.Close, contentDescription = "Cancelar", tint = TextMuted, modifier = Modifier.size(13.dp))
                                }
                            }
                        }
                    }

                    // Input flotante al final del modal con icono de subir imagen a la izquierda
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = YomoriSurfaceDark,
                        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(YomoriTeal.copy(alpha = 0.5f), YomoriBorder))),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Botón para subir imágenes
                            IconButton(
                                onClick = { galleryLauncher.launch("image/*") },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    Icons.Filled.AddPhotoAlternate,
                                    contentDescription = "Subir Imagen",
                                    tint = if (selectedImageUri != null) YomoriTeal else TextSecondary,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(2.dp))

                            TextField(
                                value = commentText,
                                onValueChange = { commentText = it },
                                placeholder = {
                                    Text(
                                        if (replyingTo != null) "Escribe tu respuesta a @${replyingTo?.user}..." else "Escribe tu comentario en el chat...",
                                        color = TextMuted,
                                        fontSize = 12.sp
                                    )
                                },
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    disabledContainerColor = Color.Transparent,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent,
                                    focusedTextColor = TextPrimary,
                                    unfocusedTextColor = TextPrimary
                                ),
                                modifier = Modifier.weight(1f)
                            )

                            IconButton(
                                onClick = {
                                    if (commentText.isNotBlank() || selectedImageUri != null) {
                                        onSendMessage(
                                            commentText,
                                            selectedImageUri?.toString(),
                                            replyingTo?.user,
                                            replyingTo?.text
                                        )
                                        commentText = ""
                                        selectedImageUri = null
                                        replyingTo = null

                                        // Auto-scroll hacia el nuevo mensaje al escribir
                                        coroutineScope.launch {
                                            if (chatMessages.isNotEmpty()) {
                                                modalListState.animateScrollToItem(chatMessages.size - 1)
                                            }
                                        }
                                    }
                                },
                                enabled = commentText.isNotBlank() || selectedImageUri != null
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Send,
                                    contentDescription = "Enviar",
                                    tint = if (commentText.isNotBlank() || selectedImageUri != null) YomoriTeal else TextMuted,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun YomoriMessageItem(
    msg: LiveChatMessage,
    currentUserId: String,
    isAdmin: Boolean,
    currentUsername: String,
    onReply: (LiveChatMessage) -> Unit,
    onToggleReaction: (emoji: String) -> Unit,
    onDelete: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    var menuExpanded by remember { mutableStateOf(false) }
    var showEmojiCatalog by remember { mutableStateOf(false) }
    val isUserAdmin = msg.user.equals("Rey_Palomo", ignoreCase = true) || msg.badge.contains("ADMIN", ignoreCase = true)
    val displayColor = if (isUserAdmin) {
        Color(0xFFFF0055)
    } else {
        Color(msg.badgeColor)
    }
    val isMine = msg.user == currentUsername

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            // User Avatar (AsyncImage si hay avatarUrl o inicial en círculo)
            if (!msg.avatarUrl.isNullOrBlank()) {
                AsyncImage(
                    model = msg.avatarUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .border(1.dp, displayColor, CircleShape)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(displayColor.copy(alpha = 0.2f))
                        .border(1.dp, displayColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        msg.avatarInitial,
                        color = displayColor,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                // Top Row: Username + Rank badge + Timestamp + Action Icons (Reply, Emoji, 3 dots)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        Text(
                            msg.user,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = displayColor.copy(alpha = 0.15f),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = Brush.linearGradient(
                                    listOf(displayColor, displayColor.copy(alpha = 0.5f))
                                )
                            )
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                            ) {
                                if (isUserAdmin) {
                                    Text("👑 ", fontSize = 9.sp)
                                }
                                Text(
                                    if (isUserAdmin) "ADMIN" else msg.badge.replace("👑 ", "").trim(),
                                    color = displayColor,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }

                    // Acciones superiores: Responder, Reacción Emoji, Tiempo y 3 puntitos verticales
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        // Responder
                        IconButton(
                            onClick = { onReply(msg) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Reply,
                                contentDescription = "Responder",
                                tint = TextMuted,
                                modifier = Modifier.size(15.dp)
                            )
                        }

                        // Reaccionar Emoji
                        Box {
                            IconButton(
                                onClick = { showEmojiCatalog = !showEmojiCatalog },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Text("😊", fontSize = 13.sp)
                            }

                            // Catálogo de Emojis desplegable
                            DropdownMenu(
                                expanded = showEmojiCatalog,
                                onDismissRequest = { showEmojiCatalog = false },
                                modifier = Modifier.background(YomoriSurfaceDark)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    EMOJI_CATALOG.take(8).forEach { emoji ->
                                        Text(
                                           text = emoji,
                                           fontSize = 18.sp,
                                           modifier = Modifier
                                               .clickable {
                                                   onToggleReaction(emoji)
                                                   showEmojiCatalog = false
                                               }
                                               .padding(4.dp)
                                        )
                                    }
                                }
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    EMOJI_CATALOG.drop(8).forEach { emoji ->
                                        Text(
                                           text = emoji,
                                           fontSize = 18.sp,
                                           modifier = Modifier
                                               .clickable {
                                                   onToggleReaction(emoji)
                                                   showEmojiCatalog = false
                                               }
                                               .padding(4.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Tiempo de envío (entre el emoji y los 3 puntitos)
                        Text(
                            text = msg.time,
                            color = TextMuted,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )

                        // 3 puntitos verticales (Más opciones / Eliminar)
                        Box {
                            IconButton(
                                onClick = { menuExpanded = true },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Filled.MoreVert,
                                    contentDescription = "Opciones",
                                    tint = TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }

                            DropdownMenu(
                                expanded = menuExpanded,
                                onDismissRequest = { menuExpanded = false },
                                modifier = Modifier.background(YomoriSurfaceDark)
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Responder", color = TextPrimary, fontSize = 12.sp) },
                                    onClick = {
                                        menuExpanded = false
                                        onReply(msg)
                                    },
                                    leadingIcon = {
                                        Icon(Icons.AutoMirrored.Filled.Reply, contentDescription = null, tint = YomoriTeal, modifier = Modifier.size(16.dp))
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text("Copiar texto", color = TextPrimary, fontSize = 12.sp) },
                                    onClick = {
                                        menuExpanded = false
                                        clipboardManager.setText(AnnotatedString(msg.text))
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Filled.ContentCopy, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                                    }
                                )
                                if (isAdmin || isMine) {
                                    HorizontalDivider(color = YomoriBorder)
                                    DropdownMenuItem(
                                        text = { Text("Eliminar mensaje", color = Color(0xFFFF6B6B), fontSize = 12.sp) },
                                        onClick = {
                                            menuExpanded = false
                                            onDelete()
                                        },
                                        leadingIcon = {
                                            Icon(Icons.Filled.Delete, contentDescription = null, tint = Color(0xFFFF6B6B), modifier = Modifier.size(16.dp))
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // Cita si este mensaje es respuesta a otro
                if (!msg.replyToUser.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = YomoriSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(20.dp)
                                    .background(YomoriTeal, RoundedCornerShape(2.dp))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Column {
                                Text(
                                    "Respondiendo a @${msg.replyToUser}",
                                    color = YomoriTeal,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    msg.replyToText ?: "",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Text Content
                if (msg.text.isNotBlank()) {
                    Text(
                        msg.text,
                        color = TextPrimary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }

                // Imagen adjunta si existe
                if (!msg.imageUrl.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    AsyncImage(
                        model = msg.imageUrl,
                        contentDescription = "Imagen compartida",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .heightIn(max = 220.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, YomoriBorder, RoundedCornerShape(12.dp))
                    )
                }

                // EMOJI REACTIONS ROW (ESTILO DISCORD)
                if (msg.reactions.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        items(msg.reactions.entries.toList(), key = { it.key }) { (emoji, users) ->
                            val userHasReacted = users.contains(currentUserId)
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (userHasReacted) YomoriTeal.copy(alpha = 0.2f) else YomoriSurfaceVariant,
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = Brush.linearGradient(
                                        if (userHasReacted) listOf(YomoriTeal, YomoriTeal) else listOf(Color.Transparent, Color.Transparent)
                                    )
                                ),
                                modifier = Modifier.clickable { onToggleReaction(emoji) }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(emoji, fontSize = 12.sp)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "${users.size}",
                                        color = if (userHasReacted) YomoriTeal else TextSecondary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        // Mini botón + para agregar más reacciones
                        item {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = YomoriSurfaceDark,
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = Brush.linearGradient(listOf(YomoriBorder, YomoriBorder))
                                ),
                                modifier = Modifier.clickable { showEmojiCatalog = true }
                            ) {
                                Text(
                                    "+",
                                    color = TextMuted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        HorizontalDivider(color = YomoriBorder.copy(alpha = 0.4f), thickness = 0.5.dp, modifier = Modifier.padding(top = 8.dp))
    }
}
