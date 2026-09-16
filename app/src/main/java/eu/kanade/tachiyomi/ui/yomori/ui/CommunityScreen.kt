package eu.kanade.tachiyomi.ui.yomori.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil3.compose.AsyncImage
import eu.kanade.tachiyomi.ui.yomori.data.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YomoriCommunityScreen() {
    val communities by CommunityManager.communities.collectAsState()
    val selectedGenre by CommunityManager.selectedGenre.collectAsState()
    val communityMessagesMap by CommunityManager.communityMessages.collectAsState()
    val currentUser by UserManager.userState.collectAsState()

    var selectedCommunityId by remember { mutableStateOf<String?>(null) }
    var showMembersSheet by remember { mutableStateOf(false) }
    var showCreateDialog by remember { mutableStateOf(false) }

    val activeCommunity = communities.find { it.id == selectedCommunityId }

    if (activeCommunity != null) {
        // VISTA INTERNA DE LA COMUNIDAD (DETALLE Y CHAT EN VIVO)
        CommunityDetailAndChatView(
            community = activeCommunity,
            currentUser = currentUser,
            messages = communityMessagesMap[activeCommunity.id] ?: emptyList(),
            onBack = { selectedCommunityId = null },
            onOpenMembers = { showMembersSheet = true },
            onSendMessage = { text, replyUser, replyText ->
                CommunityManager.sendCommunityMessage(
                    communityId = activeCommunity.id,
                    text = text,
                    replyToUser = replyUser,
                    replyToText = replyText
                )
            },
            onToggleLike = { msgId ->
                CommunityManager.toggleLikeMessage(activeCommunity.id, msgId)
            },
            onDeleteMessage = { msgId ->
                CommunityManager.deleteCommunityMessage(activeCommunity.id, msgId)
            },
            onToggleJoin = {
                CommunityManager.toggleJoinCommunity(activeCommunity.id)
            }
        )

        // PANEL DE MIEMBROS (BOTTOM SHEET)
        if (showMembersSheet) {
            CommunityMembersBottomSheet(
                community = activeCommunity,
                onDismiss = { showMembersSheet = false }
            )
        }
    } else {
        // EXPLORADOR DE COMUNIDADES
        CommunityExplorerView(
            communities = communities,
            selectedGenre = selectedGenre,
            onSelectGenre = { CommunityManager.selectGenre(it) },
            onSelectCommunity = { selectedCommunityId = it.id },
            onCreateCommunityClick = { showCreateDialog = true }
        )
    }

    // MODAL PARA CREAR COMUNIDAD
    if (showCreateDialog) {
        CreateCommunityDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name, desc, genres, banner, icon ->
                val created = CommunityManager.createCommunity(name, desc, genres, banner, icon)
                showCreateDialog = false
                selectedCommunityId = created.id
            }
        )
    }
}

// ---------------------------------------------------------------------------
// 1. EXPLORADOR DE COMUNIDADES
// ---------------------------------------------------------------------------
@Composable
fun CommunityExplorerView(
    communities: List<YomoriCommunity>,
    selectedGenre: String,
    onSelectGenre: (String) -> Unit,
    onSelectCommunity: (YomoriCommunity) -> Unit,
    onCreateCommunityClick: () -> Unit
) {
    val filteredCommunities = remember(communities, selectedGenre) {
        if (selectedGenre == "Todas") communities
        else communities.filter { it.genres.contains(selectedGenre) }
    }

    Scaffold(
        topBar = {
            Surface(
                color = YomoriBgDark,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    // Header Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = CircleShape,
                                color = YomoriTeal.copy(alpha = 0.15f),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.Filled.Public,
                                        contentDescription = null,
                                        tint = YomoriTeal,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(10.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "COMUNIDADES",
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 17.sp,
                                        letterSpacing = 0.5.sp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = YomoriTeal.copy(alpha = 0.15f),
                                        border = CardDefaults.outlinedCardBorder().copy(
                                            brush = androidx.compose.ui.graphics.SolidColor(YomoriTeal.copy(alpha = 0.4f))
                                        )
                                    ) {
                                        Text(
                                            "${communities.size} activas",
                                            color = YomoriTeal,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text(
                                    "Únete a grupos, debate y comparte",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        // Botón + Crear
                        Button(
                            onClick = onCreateCommunityClick,
                            colors = ButtonDefaults.buttonColors(containerColor = YomoriTeal),
                            shape = RoundedCornerShape(20.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Icon(
                                Icons.Filled.Add,
                                contentDescription = "Crear",
                                tint = YomoriBgDark,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Crear",
                                color = YomoriBgDark,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Horizontal Genre Chips
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(end = 8.dp)
                    ) {
                        items(COMMUNITY_GENRES) { genre ->
                            val isSelected = genre == selectedGenre
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (isSelected) YomoriTeal else YomoriSurfaceDark,
                                border = if (!isSelected) CardDefaults.outlinedCardBorder().copy(
                                    brush = androidx.compose.ui.graphics.SolidColor(YomoriBorder)
                                ) else null,
                                modifier = Modifier.clickable { onSelectGenre(genre) }
                            ) {
                                Text(
                                    text = genre,
                                    color = if (isSelected) YomoriBgDark else TextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }
            }
        },
        containerColor = YomoriBgDark
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (filteredCommunities.isEmpty()) {
                item {
                    EmptyCommunityListPlaceholder(onCreateCommunityClick)
                }
            } else {
                items(filteredCommunities, key = { it.id }) { community ->
                    CommunityCard(
                        community = community,
                        onClick = { onSelectCommunity(community) }
                    )
                }
            }
        }
    }
}

@Composable
fun CommunityCard(
    community: YomoriCommunity,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(YomoriBorder.copy(alpha = 0.6f))
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Panoramic Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
            ) {
                AsyncImage(
                    model = community.bannerUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Dark gradient scrim
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.3f),
                                    YomoriSurfaceDark
                                )
                            )
                        )
                )

                // Member count badge (Top Right)
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.Black.copy(alpha = 0.65f),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            Icons.Filled.Group,
                            contentDescription = null,
                            tint = YomoriTeal,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "${community.memberCount} miembros",
                            color = TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // Community Icon (Avatar) overlapping bottom left
                Surface(
                    shape = CircleShape,
                    color = YomoriSurfaceDark,
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = androidx.compose.ui.graphics.SolidColor(YomoriTeal)
                    ),
                    modifier = Modifier
                        .size(46.dp)
                        .align(Alignment.BottomStart)
                        .padding(start = 12.dp)
                ) {
                    AsyncImage(
                        model = community.iconUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape)
                    )
                }
            }

            // Info Section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        community.name,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )

                    if (community.isJoined) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = YomoriGreen.copy(alpha = 0.15f)
                        ) {
                            Text(
                                "Miembro ✓",
                                color = YomoriGreen,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                // Creator Tag
                Text(
                    "👑 Creado por @${community.creatorUsername}",
                    color = TextMuted,
                    fontSize = 11.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Description
                Text(
                    community.description,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Genre Tags + Entrar Button Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Genre pills
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        community.genres.take(3).forEach { genre ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = YomoriSurfaceVariant
                            ) {
                                Text(
                                    "#$genre",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Button Entrar →
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = YomoriTeal.copy(alpha = 0.15f),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = androidx.compose.ui.graphics.SolidColor(YomoriTeal.copy(alpha = 0.5f))
                        ),
                        modifier = Modifier.clickable { onClick() }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Text(
                                "Entrar",
                                color = YomoriTeal,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("→", color = YomoriTeal, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyCommunityListPlaceholder(onCreateClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = YomoriSurfaceDark,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("🌌", fontSize = 40.sp)
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                "No hay comunidades en este género",
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "¡Sé el pionero y funda la primera comunidad para este género!",
                color = TextSecondary,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onCreateClick,
                colors = ButtonDefaults.buttonColors(containerColor = YomoriTeal),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text("Crear Comunidad (+50 XP)", color = YomoriBgDark, fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 2. VISTA INTERNA DE LA COMUNIDAD (DETALLE Y CHAT EN VIVO)
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityDetailAndChatView(
    community: YomoriCommunity,
    currentUser: YomoriUser,
    messages: List<YomoriCommunityMessage>,
    onBack: () -> Unit,
    onOpenMembers: () -> Unit,
    onSendMessage: (text: String, replyUser: String?, replyText: String?) -> Unit,
    onToggleLike: (msgId: String) -> Unit,
    onDeleteMessage: (msgId: String) -> Unit,
    onToggleJoin: () -> Unit
) {
    var inputText by remember { mutableStateOf("") }
    var replyingTo by remember { mutableStateOf<YomoriCommunityMessage?>(null) }
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Atrás",
                            tint = TextPrimary
                        )
                    }
                },
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { onOpenMembers() }
                    ) {
                        AsyncImage(
                            model = community.iconUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .border(1.dp, YomoriTeal, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                community.name,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(YomoriGreen, CircleShape)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "${community.memberCount} miembros",
                                    color = TextMuted,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                },
                actions = {
                    // BOTÓN 👥 (2 personitas) PARA ABRIR LA LISTA DE MIEMBROS
                    IconButton(
                        onClick = onOpenMembers,
                        modifier = Modifier.padding(end = 4.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = YomoriSurfaceVariant,
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Filled.Group,
                                    contentDescription = "Ver Miembros",
                                    tint = YomoriTeal,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YomoriBgDark)
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(YomoriSurfaceDark)
                    .navigationBarsPadding()
                    .imePadding()
            ) {
                // Reply preview bar
                if (replyingTo != null) {
                    Surface(
                        color = YomoriSurfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Reply,
                                    contentDescription = null,
                                    tint = YomoriTeal,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        "Respondiendo a @${replyingTo?.username}",
                                        color = YomoriTeal,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        replyingTo?.message ?: "",
                                        color = TextSecondary,
                                        fontSize = 11.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            IconButton(
                                onClick = { replyingTo = null },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Cancelar respuesta",
                                    tint = TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }

                // Message Input Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = {
                            Text(
                                "Escribe en ${community.name}...",
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = YomoriSurfaceVariant,
                            unfocusedContainerColor = YomoriSurfaceVariant,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(24.dp),
                        modifier = Modifier.weight(1f)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                onSendMessage(
                                    inputText,
                                    replyingTo?.username,
                                    replyingTo?.message
                                )
                                inputText = ""
                                replyingTo = null
                            }
                        },
                        colors = IconButtonDefaults.iconButtonColors(containerColor = YomoriTeal),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Enviar",
                            tint = YomoriBgDark
                        )
                    }
                }
            }
        },
        containerColor = YomoriBgDark
    ) { innerPadding ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(vertical = 10.dp)
        ) {
            // Header Info Card inside Chat
            item {
                CommunityChatHeaderCard(
                    community = community,
                    onToggleJoin = onToggleJoin
                )
            }

            // Message Items
            if (messages.isEmpty()) {
                item {
                    EmptyChatPlaceholder()
                }
            } else {
                items(messages, key = { it.id }) { msg ->
                    CommunityMessageBubble(
                        message = msg,
                        isMine = msg.userId == currentUser.id,
                        isAdmin = currentUser.isAdmin,
                        onLike = { onToggleLike(msg.id) },
                        onReply = { replyingTo = msg },
                        onDelete = { onDeleteMessage(msg.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun CommunityChatHeaderCard(
    community: YomoriCommunity,
    onToggleJoin: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(YomoriBorder.copy(alpha = 0.5f))
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
            ) {
                AsyncImage(
                    model = community.bannerUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    YomoriSurfaceDark
                                )
                            )
                        )
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        community.name,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )

                    Button(
                        onClick = onToggleJoin,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (community.isJoined) YomoriSurfaceVariant else YomoriTeal
                        ),
                        shape = RoundedCornerShape(16.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Text(
                            if (community.isJoined) "Unido ✓" else "+ Unirse",
                            color = if (community.isJoined) YomoriGreen else YomoriBgDark,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    community.description,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )

                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    community.genres.forEach { genre ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = YomoriSurfaceVariant
                        ) {
                            Text(
                                "#$genre",
                                color = TextMuted,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CommunityMessageBubble(
    message: YomoriCommunityMessage,
    isMine: Boolean,
    isAdmin: Boolean,
    onLike: () -> Unit,
    onReply: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isMine) YomoriSurfaceVariant.copy(alpha = 0.9f) else YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(
                if (isMine) YomoriTeal.copy(alpha = 0.3f) else YomoriBorder.copy(alpha = 0.3f)
            )
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Header Row: Avatar + Username + Rank Badge + Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    AsyncImage(
                        model = message.userAvatar,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                message.username,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(message.badgeColor).copy(alpha = 0.15f)
                            ) {
                                Text(
                                    message.badge,
                                    color = Color(message.badgeColor),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                        Text(
                            message.timestamp,
                            color = TextMuted,
                            fontSize = 10.sp
                        )
                    }
                }
            }

            // Reply Quote Preview
            if (!message.replyToUser.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = YomoriBgDark.copy(alpha = 0.6f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .width(3.dp)
                                .height(24.dp)
                                .background(YomoriTeal, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Column {
                            Text(
                                "Respondiendo a @${message.replyToUser}",
                                color = YomoriTeal,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                message.replyToText ?: "",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Message text
            Text(
                message.message,
                color = TextPrimary.copy(alpha = 0.95f),
                fontSize = 13.sp,
                lineHeight = 18.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Actions Row: Like, Reply, Delete
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                // Like Button
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (message.isLiked) Color(0xFFFF4081).copy(alpha = 0.15f) else Color.Transparent,
                    modifier = Modifier.clickable { onLike() }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Icon(
                            if (message.isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = "Me gusta",
                            tint = if (message.isLiked) Color(0xFFFF4081) else TextMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        if (message.likes > 0) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "${message.likes}",
                                color = if (message.isLiked) Color(0xFFFF4081) else TextMuted,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Reply Button
                IconButton(
                    onClick = onReply,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Reply,
                        contentDescription = "Responder",
                        tint = TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // Delete Button (if mine or admin)
                if (isMine || isAdmin) {
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Eliminar",
                            tint = Color(0xFFEF4444).copy(alpha = 0.7f),
                            modifier = Modifier.size(15.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyChatPlaceholder() {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = YomoriSurfaceDark,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("💬", fontSize = 34.sp)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "¡Sé el primero en escribir!",
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Inicia el debate, recomienda mangas o saluda al gremio.",
                color = TextSecondary,
                fontSize = 12.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

// ---------------------------------------------------------------------------
// 3. PANEL DE MIEMBROS (BOTTOM SHEET)
// ---------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityMembersBottomSheet(
    community: YomoriCommunity,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = YomoriSurfaceDark,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 10.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(YomoriBorder, RoundedCornerShape(2.dp))
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp)
        ) {
            // Sheet Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Filled.Group,
                        contentDescription = null,
                        tint = YomoriTeal,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Miembros de la Comunidad",
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = YomoriTeal.copy(alpha = 0.15f)
                ) {
                    Text(
                        "${community.members.size} miembros",
                        color = YomoriTeal,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Section: Administradores & Creadores
                val leaders = community.members.filter {
                    it.role.contains("ADMIN", ignoreCase = true) || it.role.contains("CREADOR", ignoreCase = true)
                }

                if (leaders.isNotEmpty()) {
                    item {
                        Text(
                            "👑 ADMINISTRADOR / CREADOR",
                            color = Color(0xFFFFD700),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    items(leaders) { member ->
                        MemberRowItem(member = member, isLeader = true)
                    }
                }

                // Section: Lectores Miembros
                val regularMembers = community.members.filterNot {
                    it.role.contains("ADMIN", ignoreCase = true) || it.role.contains("CREADOR", ignoreCase = true)
                }

                if (regularMembers.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "LECTORES MIEMBROS",
                            color = TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    items(regularMembers) { member ->
                        MemberRowItem(member = member, isLeader = false)
                    }
                }
            }
        }
    }
}

@Composable
fun MemberRowItem(member: CommunityMember, isLeader: Boolean) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (isLeader) YomoriSurfaceVariant else YomoriBgDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(
                if (isLeader) Color(0xFFFFD700).copy(alpha = 0.4f) else YomoriBorder.copy(alpha = 0.4f)
            )
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box {
                    AsyncImage(
                        model = member.avatarUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                    )
                    if (member.isOnline) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(YomoriGreen, CircleShape)
                                .border(1.5.dp, YomoriSurfaceDark, CircleShape)
                                .align(Alignment.BottomEnd)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            member.username,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        if (isLeader) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("👑", fontSize = 11.sp)
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color(member.rankColor).copy(alpha = 0.15f)
                    ) {
                        Text(
                            member.rankTitle,
                            color = Color(member.rankColor),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            Surface(
                shape = RoundedCornerShape(6.dp),
                color = YomoriSurfaceDark
            ) {
                Text(
                    member.role,
                    color = if (isLeader) Color(0xFFFFD700) else TextMuted,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 4. MODAL CREAR COMUNIDAD
// ---------------------------------------------------------------------------
@Composable
fun CreateCommunityDialog(
    onDismiss: () -> Unit,
    onCreate: (name: String, description: String, genres: List<String>, bannerUrl: String, iconUrl: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedGenres by remember { mutableStateOf(listOf("Acción")) }
    var selectedBanner by remember { mutableStateOf(COMMUNITY_BANNER_PRESETS[0]) }
    var selectedIcon by remember { mutableStateOf(COMMUNITY_ICON_PRESETS[0]) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = YomoriSurfaceDark,
            border = CardDefaults.outlinedCardBorder().copy(
                brush = androidx.compose.ui.graphics.SolidColor(YomoriTeal.copy(alpha = 0.5f))
            ),
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(vertical = 20.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Crear Comunidad",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                        Text(
                            "Funda tu propio espacio en Yomori",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = TextMuted)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Name Input
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre de la comunidad", color = TextSecondary, fontSize = 12.sp) },
                    placeholder = { Text("Ej. La Secta del Manhua", color = TextMuted, fontSize = 12.sp) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = YomoriTeal,
                        unfocusedBorderColor = YomoriBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Description Input
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Descripción / Reglas", color = TextSecondary, fontSize = 12.sp) },
                    placeholder = { Text("¿De qué trata este gremio?", color = TextMuted, fontSize = 12.sp) },
                    maxLines = 3,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = YomoriTeal,
                        unfocusedBorderColor = YomoriBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Genre selection
                Text("Géneros (elige hasta 3)", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(COMMUNITY_GENRES.filterNot { it == "Todas" }) { genre ->
                        val isSelected = selectedGenres.contains(genre)
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) YomoriTeal else YomoriBgDark,
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = androidx.compose.ui.graphics.SolidColor(if (isSelected) YomoriTeal else YomoriBorder)
                            ),
                            modifier = Modifier.clickable {
                                selectedGenres = if (isSelected) {
                                    if (selectedGenres.size > 1) selectedGenres - genre else selectedGenres
                                } else {
                                    if (selectedGenres.size < 3) selectedGenres + genre else selectedGenres
                                }
                            }
                        ) {
                            Text(
                                genre,
                                color = if (isSelected) YomoriBgDark else TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Banner preset selector
                Text("Elegir Banner", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(COMMUNITY_BANNER_PRESETS) { banner ->
                        val isSelected = banner == selectedBanner
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = androidx.compose.ui.graphics.SolidColor(if (isSelected) YomoriTeal else Color.Transparent)
                            ),
                            modifier = Modifier
                                .size(width = 80.dp, height = 45.dp)
                                .clickable { selectedBanner = banner }
                        ) {
                            AsyncImage(
                                model = banner,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Icon preset selector
                Text("Elegir Ícono", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(COMMUNITY_ICON_PRESETS) { icon ->
                        val isSelected = icon == selectedIcon
                        Surface(
                            shape = CircleShape,
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = androidx.compose.ui.graphics.SolidColor(if (isSelected) YomoriTeal else Color.Transparent)
                            ),
                            modifier = Modifier
                                .size(40.dp)
                                .clickable { selectedIcon = icon }
                        ) {
                            AsyncImage(
                                model = icon,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().clip(CircleShape)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar", color = TextSecondary)
                    }

                    Button(
                        onClick = {
                            if (name.isNotBlank()) {
                                onCreate(name, description, selectedGenres, selectedBanner, selectedIcon)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = YomoriTeal),
                        shape = RoundedCornerShape(12.dp),
                        enabled = name.isNotBlank(),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Crear (+50 XP)", color = YomoriBgDark, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

