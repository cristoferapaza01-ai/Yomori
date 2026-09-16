package eu.kanade.tachiyomi.ui.yomori.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Group
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import eu.kanade.tachiyomi.ui.yomori.data.CommunityManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YomoriCommunityScreen() {
    val channels = CommunityManager.channels
    val activeChannel by CommunityManager.activeChannel.collectAsState()
    val messages by CommunityManager.messages.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(activeChannel.icon, fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(activeChannel.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(activeChannel.description, color = TextSecondary, fontSize = 11.sp, maxLines = 1)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YomoriBgDark)
            )
        },
        bottomBar = {
            // Message Input Bar
            Surface(
                color = YomoriSurfaceDark,
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Escribe en ${activeChannel.name}...", color = TextMuted, fontSize = 13.sp) },
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
                                CommunityManager.sendMessage(inputText)
                                inputText = ""
                            }
                        },
                        colors = IconButtonDefaults.iconButtonColors(containerColor = YomoriTeal),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar", tint = YomoriBgDark)
                    }
                }
            }
        },
        containerColor = YomoriBgDark
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Channel Selector Tabs
            LazyRow(
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(channels) { channel ->
                    val isSelected = channel.id == activeChannel.id
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) YomoriTeal.copy(alpha = 0.2f) else YomoriSurfaceDark,
                        border = if (isSelected) CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(YomoriTeal)) else null,
                        modifier = Modifier.clickable { CommunityManager.activeChannel.value = channel }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(channel.icon, fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(channel.name, color = if (isSelected) YomoriTeal else TextSecondary, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, fontSize = 12.sp)
                        }
                    }
                }
            }

            // Messages List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(messages) { msg ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (msg.isOfficial) YomoriSurfaceVariant else YomoriSurfaceDark,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            AsyncImage(
                                model = msg.userAvatar,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                            )

                            Spacer(modifier = Modifier.width(10.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(msg.username, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        if (msg.isOfficial) {
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Icon(Icons.Filled.CheckCircle, contentDescription = "Oficial", tint = YomoriTeal, modifier = Modifier.size(13.dp))
                                        }
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = YomoriTeal.copy(alpha = 0.15f)
                                        ) {
                                            Text(msg.userRank, color = YomoriTeal, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                        }
                                    }
                                    Text(msg.timestamp, color = TextMuted, fontSize = 10.sp)
                                }

                                Spacer(modifier = Modifier.height(4.dp))
                                Text(msg.message, color = TextPrimary.copy(alpha = 0.9f), fontSize = 13.sp, lineHeight = 18.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
