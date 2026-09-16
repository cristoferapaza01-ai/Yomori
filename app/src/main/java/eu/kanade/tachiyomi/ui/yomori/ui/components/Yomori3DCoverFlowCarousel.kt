package eu.kanade.tachiyomi.ui.yomori.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import coil3.compose.AsyncImage
import eu.kanade.tachiyomi.ui.yomori.data.NewReleaseManga
import eu.kanade.tachiyomi.ui.yomori.ui.*
import kotlinx.coroutines.delay
import kotlin.math.absoluteValue

@Composable
fun Yomori3DCoverFlowCarousel(
    releases: List<NewReleaseManga>,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onMangaClick: (NewReleaseManga) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedCategory by remember { mutableStateOf("ALL") }

    // Accurate counts for category chips
    val allCount = releases.size
    val mangaCount = releases.count { it.category == "MANGA" || it.type.equals("Manga", true) }
    val manhwaCount = releases.count { it.category == "MANHWA" || it.type.equals("Manhwa", true) }
    val manhuaCount = releases.count { it.category == "MANHUA" || it.type.equals("Manhua", true) }

    val filteredReleases = remember(releases, selectedCategory) {
        when (selectedCategory) {
            "MANGA" -> releases.filter { it.category == "MANGA" || it.type.equals("Manga", true) }
            "MANHWA" -> releases.filter { it.category == "MANHWA" || it.type.equals("Manhwa", true) }
            "MANHUA" -> releases.filter { it.category == "MANHUA" || it.type.equals("Manhua", true) }
            else -> releases
        }
    }

    val displayList = if (filteredReleases.isNotEmpty()) filteredReleases else releases
    val pagerState = rememberPagerState(pageCount = { displayList.size.coerceAtLeast(1) })

    // Auto-advance every 4s
    LaunchedEffect(pagerState, displayList.size) {
        if (displayList.size > 1) {
            while (true) {
                delay(4000)
                if (!pagerState.isScrollInProgress) {
                    val next = (pagerState.currentPage + 1) % displayList.size
                    pagerState.animateScrollToPage(next)
                }
            }
        }
    }

    // Refresh icon animation
    val refreshRotation by animateFloatAsState(
        targetValue = if (isRefreshing) 360f else 0f,
        animationSpec = tween(durationMillis = 800),
        label = "refresh_rotation",
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
    ) {
        // 1. Header: Title + Category Filter Chips & Refresh Button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    tint = YomoriTeal,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "Nuevos Lanzamientos",
                    color = TextPrimary,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            }

            IconButton(
                onClick = { onRefresh() },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Filled.Refresh,
                    contentDescription = "Actualizar",
                    tint = if (isRefreshing) YomoriTeal else TextMuted,
                    modifier = Modifier
                        .size(18.dp)
                        .rotate(refreshRotation)
                )
            }
        }

        // Clean Category Filter Chips (Mangas, Manhwas, Manhuas)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            item {
                FilterChipItem(
                    label = "Todos ($allCount)",
                    selected = selectedCategory == "ALL",
                    onClick = { selectedCategory = "ALL" }
                )
            }
            item {
                FilterChipItem(
                    label = "Mangas ($mangaCount)",
                    selected = selectedCategory == "MANGA",
                    onClick = { selectedCategory = "MANGA" }
                )
            }
            item {
                FilterChipItem(
                    label = "Manhwas ($manhwaCount)",
                    selected = selectedCategory == "MANHWA",
                    onClick = { selectedCategory = "MANHWA" }
                )
            }
            item {
                FilterChipItem(
                    label = "Manhuas ($manhuaCount)",
                    selected = selectedCategory == "MANHUA",
                    onClick = { selectedCategory = "MANHUA" }
                )
            }
        }

        if (displayList.isNotEmpty()) {
            // 2. 3D Cover Flow Horizontal Pager (Portrait Manga 2:3 Aspect Ratio)
            HorizontalPager(
                state = pagerState,
                contentPadding = PaddingValues(horizontal = 96.dp),
                pageSpacing = 16.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(295.dp)
            ) { page ->
                val manga = displayList.getOrNull(page) ?: return@HorizontalPager
                val pageOffset = ((pagerState.currentPage - page) + pagerState.currentPageOffsetFraction)
                val absOffset = pageOffset.absoluteValue.coerceIn(0f, 2f)

                val scale = lerp(1f, 0.82f, absOffset.coerceIn(0f, 1f))
                val alpha = lerp(1f, 0.45f, absOffset.coerceIn(0f, 1f))
                val rotationY = (pageOffset * -22f).coerceIn(-45f, 45f)
                val isFocused = page == pagerState.currentPage

                Box(
                    modifier = Modifier
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                            this.alpha = alpha
                            this.rotationY = rotationY
                            cameraDistance = 16f * density
                        }
                        .fillMaxWidth()
                        .height(290.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(YomoriSurfaceDark)
                        .border(
                            width = if (isFocused) 2.dp else 1.dp,
                            color = if (isFocused) YomoriTeal else YomoriBorder,
                            shape = RoundedCornerShape(16.dp)
                        )
                        .clickable { onMangaClick(manga) },
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = manga.coverUrl,
                        contentDescription = manga.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Gradient overlay
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        YomoriBgDark.copy(alpha = 0.2f),
                                        YomoriBgDark.copy(alpha = 0.85f)
                                    ),
                                    startY = 120f
                                )
                            )
                    )

                    // "En Foco" Badge for the active center card
                    if (isFocused) {
                        Surface(
                            shape = RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp),
                            color = YomoriTeal,
                            modifier = Modifier.align(Alignment.TopCenter)
                        ) {
                            Text(
                                "EN FOCO",
                                color = YomoriBgDark,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    // Scan source tag at card bottom
                    Text(
                        text = manga.scan,
                        color = YomoriGreen,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3. Focused Manga Details Card (Entire block is clickable)
            val currentManga = displayList.getOrNull(pagerState.currentPage)
            if (currentManga != null) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = YomoriSurfaceDark,
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = Brush.linearGradient(
                            listOf(YomoriTeal.copy(alpha = 0.4f), YomoriBorder)
                        )
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onMangaClick(currentManga) }
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    currentManga.scan,
                                    color = YomoriGreen,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = YomoriSurfaceVariant
                                ) {
                                    Text(
                                        currentManga.type,
                                        color = TextSecondary,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Text(
                                currentManga.time,
                                color = TextMuted,
                                fontSize = 11.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = currentManga.title,
                            color = TextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Start,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = YomoriTeal.copy(alpha = 0.15f),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = Brush.linearGradient(
                                        listOf(YomoriTeal.copy(alpha = 0.4f), YomoriTeal.copy(alpha = 0.1f))
                                    )
                                )
                            ) {
                                Text(
                                    text = currentManga.chapter,
                                    color = YomoriTeal,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
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
private fun FilterChipItem(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (selected) YomoriTeal.copy(alpha = 0.18f) else YomoriSurfaceDark,
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(
                if (selected) listOf(YomoriTeal, YomoriTeal.copy(alpha = 0.5f))
                else listOf(YomoriBorder, YomoriBorder.copy(alpha = 0.5f))
            )
        ),
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable { onClick() }
    ) {
        Text(
            text = label,
            color = if (selected) YomoriTeal else TextSecondary,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}
