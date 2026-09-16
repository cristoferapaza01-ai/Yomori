package eu.kanade.tachiyomi.ui.yomori.ui

import androidx.compose.animation.*
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import coil3.compose.AsyncImage
import eu.kanade.presentation.util.Screen
import eu.kanade.tachiyomi.ui.yomori.data.AVATAR_PRESETS
import eu.kanade.tachiyomi.ui.yomori.data.Quest
import eu.kanade.tachiyomi.ui.yomori.data.RANK_TIERS
import eu.kanade.tachiyomi.ui.yomori.data.UserManager
import kotlinx.coroutines.launch

class YomoriProfileScreenVoyager : Screen() {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        YomoriProfileScreen(onBack = { navigator.pop() })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YomoriProfileScreen(onBack: (() -> Unit)? = null) {
    val user by UserManager.userState.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var showEditProfileModal by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(0) } // 0: Misiones, 1: Jerarquía de Rangos

    // Edit profile local state
    var editNickname by remember { mutableStateOf(user.nickname) }
    var editUsername by remember { mutableStateOf(user.username) }
    var editBio by remember { mutableStateOf(user.bio) }
    var editAvatarUrl by remember { mutableStateOf(user.avatarUrl) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            editAvatarUrl = uri.toString()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mi Perfil & Rangos", color = TextPrimary, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = TextPrimary)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YomoriBgDark)
            )
        },
        containerColor = YomoriBgDark
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter
        ) {
            LazyColumn(
                modifier = Modifier
                    .widthIn(max = 720.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Tarjeta Principal de Perfil (Avatar, Nivel, Rango, Apodo, Username y Bio)
                item {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = YomoriSurfaceDark,
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.linearGradient(
                                listOf(Color(user.rankColor), YomoriBorder)
                            )
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Avatar con borde del color del Rango
                            Box(contentAlignment = Alignment.BottomEnd) {
                                AsyncImage(
                                    model = user.avatarUrl,
                                    contentDescription = user.nickname,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(86.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF131924))
                                        .border(2.dp, Color(user.rankColor), CircleShape)
                                )
                                Surface(
                                    shape = CircleShape,
                                    color = Color(user.rankColor),
                                    modifier = Modifier.size(26.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            "${user.level}",
                                            color = YomoriBgDark,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Apodo (Nickname)
                            Text(
                                user.nickname,
                                color = TextPrimary,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black
                            )

                            // @Username
                            Text(
                                "@${user.username}",
                                color = TextMuted,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            // Insignia de Rango
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(user.rankColor).copy(alpha = 0.2f),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = Brush.linearGradient(
                                        listOf(Color(user.rankColor), Color(user.rankColor).copy(alpha = 0.4f))
                                    )
                                )
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    if (user.isAdmin) {
                                        Text("👑 ", fontSize = 11.sp)
                                    }
                                    Text(
                                        if (user.isAdmin) "ADMIN" else "RANGO [${user.rankTier}] • ${user.rankTitle.uppercase()}",
                                        color = Color(user.rankColor),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }

                        // Biografía / Descripción
                        if (user.bio.isNotBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                user.bio,
                                color = TextSecondary,
                                fontSize = 12.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Barra de Progreso XP
                        val progress = if (user.nextLevelXp > 0) (user.currentXp.toFloat() / user.nextLevelXp.toFloat()).coerceIn(0f, 1f) else 0f
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Nivel ${user.level}", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("${user.currentXp} / ${user.nextLevelXp} XP", color = YomoriTeal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = Color(user.rankColor),
                                trackColor = Color(0xFF1F2937),
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Botón Editar Perfil
                        OutlinedButton(
                            onClick = {
                                editNickname = user.nickname
                                editUsername = user.username
                                editBio = user.bio
                                editAvatarUrl = user.avatarUrl
                                showEditProfileModal = true
                            },
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = Brush.linearGradient(listOf(YomoriTeal, YomoriBorder))
                            ),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(38.dp)
                        ) {
                            Icon(Icons.Filled.Edit, contentDescription = null, tint = YomoriTeal, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Editar Perfil & Foto", color = YomoriTeal, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            // 2. Estadísticas de Lectura
            item {
                Text("Estadísticas de Lector", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    StatCard("Capítulos", "${user.chaptersRead}", Icons.Filled.AutoStories, YomoriTeal, Modifier.weight(1f))
                    StatCard("Completados", "${user.mangasCompleted}", Icons.Filled.CheckCircle, YomoriGreen, Modifier.weight(1f))
                    StatCard("Racha", "${user.streakDays} días", Icons.Filled.LocalFireDepartment, Color(0xFFFF5722), Modifier.weight(1f))
                }
            }

            // 3. Selector de Pestañas: Misiones vs Jerarquía de Rangos
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = YomoriSurfaceDark,
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(YomoriBorder, YomoriBorder.copy(alpha = 0.4f)))),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(4.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (selectedTab == 0) YomoriTeal else Color.Transparent,
                            modifier = Modifier
                                .weight(1f)
                                .clickable { selectedTab = 0 }
                        ) {
                            Box(modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp), contentAlignment = Alignment.Center) {
                                Text(
                                    "Misiones",
                                    color = if (selectedTab == 0) YomoriBgDark else TextSecondary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (selectedTab == 1) YomoriTeal else Color.Transparent,
                            modifier = Modifier
                                .weight(1f)
                                .clickable { selectedTab = 1 }
                        ) {
                            Box(modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp), contentAlignment = Alignment.Center) {
                                Text(
                                    "Rangos (10 Tiers)",
                                    color = if (selectedTab == 1) YomoriBgDark else TextSecondary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }

            // 4. Contenido según pestaña seleccionada
            if (selectedTab == 0) {
                // Lista de Misiones
                val quests = UserManager.getQuests()
                items(quests) { quest ->
                    QuestCard(
                        quest = quest,
                        onClaim = {
                            UserManager.claimQuest(quest.id)
                        }
                    )
                }
            } else {
                // Jerarquía de 10 Rangos
                items(RANK_TIERS) { rank ->
                    val isCurrentRank = user.rankTier == rank.tier
                    val isUnlocked = user.level >= rank.minLevel
                    RankHierarchyCard(
                        rank = rank,
                        userLevel = user.level,
                        isCurrentRank = isCurrentRank,
                        isUnlocked = isUnlocked
                    )
                }
            }

            // 5. Botón de Cerrar Sesión / Sincronización
            item {
                Spacer(modifier = Modifier.height(10.dp))
                if (user.isLoggedIn) {
                    OutlinedButton(
                        onClick = {
                            UserManager.logout()
                        },
                        border = ButtonDefaults.outlinedButtonBorder().copy(brush = Brush.linearGradient(listOf(Color(0xFFE57373), Color(0xFFB71C1C)))),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                    ) {
                        Icon(Icons.Filled.Logout, contentDescription = null, tint = Color(0xFFE57373), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Cerrar Sesión", color = Color(0xFFE57373), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

    // Modal de Edición de Perfil
    if (showEditProfileModal) {
        AlertDialog(
            onDismissRequest = { showEditProfileModal = false },
            containerColor = YomoriSurfaceDark,
            title = {
                Text("Editar Perfil de Cazador", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Preview del Avatar Actual y Botón de Subir Foto
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            AsyncImage(
                                model = editAvatarUrl,
                                contentDescription = "Avatar Preview",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(YomoriSurfaceVariant)
                                    .border(2.dp, Color(user.rankColor), RoundedCornerShape(16.dp))
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            OutlinedButton(
                                onClick = { photoPickerLauncher.launch("image/*") },
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = YomoriSurfaceVariant,
                                    contentColor = YomoriTeal
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    Brush.linearGradient(listOf(YomoriTeal, YomoriBorder))
                                ),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Filled.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Subir mi Foto", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            Text("Elige de tu galería o selecciona abajo", color = TextMuted, fontSize = 10.sp)
                        }
                    }

                    // Selector de Avatares Predefinidos Estilo Robot / Mecha
                    Text("O elige un Avatar Robotizado:", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(AVATAR_PRESETS) { avatar ->
                            val isSelected = editAvatarUrl == avatar
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = if (isSelected) YomoriTeal.copy(alpha = 0.15f) else YomoriSurfaceVariant,
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = Brush.linearGradient(
                                        if (isSelected) listOf(YomoriTeal, Color(user.rankColor)) else listOf(YomoriBorder, YomoriBorder)
                                    )
                                ),
                                modifier = Modifier
                                    .size(54.dp)
                                    .clickable { editAvatarUrl = avatar }
                            ) {
                                AsyncImage(
                                    model = avatar,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(4.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                )
                            }
                        }
                    }

                    // Campo Apodo
                    OutlinedTextField(
                        value = editNickname,
                        onValueChange = { editNickname = it },
                        label = { Text("Apodo (Nombre Visible)") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = YomoriTeal,
                            unfocusedBorderColor = YomoriBorder,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Campo @Username
                    OutlinedTextField(
                        value = editUsername,
                        onValueChange = { editUsername = it },
                        label = { Text("Nombre de Usuario (@username)") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = YomoriTeal,
                            unfocusedBorderColor = YomoriBorder,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Campo Biografía
                    OutlinedTextField(
                        value = editBio,
                        onValueChange = { editBio = it },
                        label = { Text("Biografía / Estado") },
                        maxLines = 3,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = YomoriTeal,
                            unfocusedBorderColor = YomoriBorder,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        UserManager.updateProfile(
                            nickname = editNickname,
                            username = editUsername,
                            bio = editBio,
                            avatarUrl = editAvatarUrl
                        )
                        showEditProfileModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = YomoriTeal)
                ) {
                    Text("Guardar Cambios", color = YomoriBgDark, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditProfileModal = false }) {
                    Text("Cancelar", color = TextSecondary)
                }
            }
        )
    }
}

@Composable
fun QuestCard(
    quest: Quest,
    onClaim: () -> Unit
) {
    val progress = (quest.currentProgress.toFloat() / quest.targetProgress.toFloat()).coerceIn(0f, 1f)

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(
                listOf(
                    if (quest.isCompleted && !quest.isClaimed) YomoriGreen else YomoriBorder,
                    YomoriBorder.copy(alpha = 0.4f)
                )
            )
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            quest.title,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f, fill = false),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (quest.type == "DAILY") YomoriTeal.copy(alpha = 0.2f) else Color(0xFFFFD700).copy(alpha = 0.2f)
                        ) {
                            Text(
                                if (quest.type == "DAILY") "DIARIA" else "HITO 2 AÑOS",
                                color = if (quest.type == "DAILY") YomoriTeal else Color(0xFFFFD700),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                maxLines = 1,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        quest.description,
                        color = TextMuted,
                        fontSize = 11.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF1F2937)
                ) {
                    Text(
                        "+${quest.xpReward} XP",
                        color = YomoriTeal,
                        fontWeight = FontWeight.Black,
                        fontSize = 12.sp,
                        maxLines = 1,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .weight(1f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = if (quest.isCompleted) YomoriGreen else YomoriTeal,
                    trackColor = Color(0xFF1F2937),
                )
                Spacer(modifier = Modifier.width(12.dp))

                if (quest.isClaimed) {
                    Text("Reclamado ✓", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                } else if (quest.isCompleted) {
                    Button(
                        onClick = onClaim,
                        colors = ButtonDefaults.buttonColors(containerColor = YomoriGreen),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Text("Reclamar", color = YomoriBgDark, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                } else {
                    Text("${quest.currentProgress}/${quest.targetProgress}", color = TextSecondary, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
fun RankHierarchyCard(
    rank: eu.kanade.tachiyomi.ui.yomori.data.RankInfo,
    userLevel: Int,
    isCurrentRank: Boolean,
    isUnlocked: Boolean
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isCurrentRank) Color(rank.color).copy(alpha = 0.12f) else YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(
                listOf(
                    if (isCurrentRank) Color(rank.color) else YomoriBorder,
                    YomoriBorder.copy(alpha = 0.4f)
                )
            )
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Badge de Tier
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(rank.color).copy(alpha = 0.2f))
                        .border(1.5.dp, Color(rank.color), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        rank.tier,
                        color = Color(rank.color),
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        rank.title,
                        color = if (isUnlocked) TextPrimary else TextMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text(
                        "Nivel ${rank.minLevel} - ${if (rank.maxLevel > 1000) "∞" else rank.maxLevel.toString()}",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            }

            if (isCurrentRank) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(rank.color)
                ) {
                    Text(
                        "ACTUAL",
                        color = YomoriBgDark,
                        fontWeight = FontWeight.Black,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            } else if (!isUnlocked) {
                Icon(Icons.Filled.Lock, contentDescription = "Bloqueado", tint = TextMuted, modifier = Modifier.size(18.dp))
            } else {
                Icon(Icons.Filled.CheckCircle, contentDescription = "Superado", tint = YomoriGreen, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
fun StatCard(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(color.copy(alpha = 0.3f), YomoriBorder))),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 16.sp)
            Text(label, color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Medium)
        }
    }
}
