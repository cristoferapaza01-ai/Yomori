package eu.kanade.presentation.manga.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import tachiyomi.i18n.MR
import tachiyomi.presentation.core.components.material.SECONDARY_ALPHA
import tachiyomi.presentation.core.components.material.padding
import tachiyomi.presentation.core.i18n.pluralStringResource
import tachiyomi.presentation.core.i18n.stringResource

@Composable
fun ChapterHeader(
    enabled: Boolean,
    chapterCount: Int?,
    missingChapterCount: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    showLanguageToggle: Boolean = false,
    selectedLanguage: String = "ES",
    onLanguageSelected: (String) -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .clickable(
                    enabled = enabled,
                    onClick = onClick,
                ),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.padding.extraSmall),
        ) {
            Text(
                text = if (chapterCount == null) {
                    stringResource(MR.strings.chapters)
                } else {
                    pluralStringResource(MR.plurals.manga_num_chapters, count = chapterCount, chapterCount)
                },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )

            MissingChaptersWarning(missingChapterCount)
        }

        if (showLanguageToggle) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LanguageChip(
                    text = "ES",
                    flag = "🇪🇸",
                    isSelected = selectedLanguage == "ES",
                    onClick = { onLanguageSelected("ES") },
                )
                LanguageChip(
                    text = "LAT",
                    flag = "🇲🇽",
                    isSelected = selectedLanguage == "LAT",
                    onClick = { onLanguageSelected("LAT") },
                )
            }
        }
    }
}

@Composable
private fun LanguageChip(
    text: String,
    flag: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    val containerColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    val contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    val borderColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = containerColor,
        border = BorderStroke(1.dp, borderColor),
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = flag,
                fontSize = 12.sp,
            )
            Text(
                text = text,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = contentColor,
            )
        }
    }
}

@Composable
private fun MissingChaptersWarning(count: Int) {
    if (count == 0) {
        return
    }

    Text(
        text = pluralStringResource(MR.plurals.missing_chapters, count = count, count),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.error.copy(alpha = SECONDARY_ALPHA),
    )
}

