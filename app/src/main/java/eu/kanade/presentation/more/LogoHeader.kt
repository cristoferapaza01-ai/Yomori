package eu.kanade.presentation.more

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun LogoHeader(
    iconPadding: PaddingValues = PaddingValues(vertical = 28.dp),
) {
    val YomoriTeal = Color(0xFF3DD6D0)
    val YomoriGreen = Color(0xFF10B981)
    val YomoriBgBox = Color(0xFF131924)
    val YomoriBorder = Color(0xFF263345)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(iconPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Logo Brillante Yomori
        Box(
            modifier = Modifier
                .size(68.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.linearGradient(
                        listOf(
                            YomoriTeal.copy(alpha = 0.22f),
                            YomoriBgBox
                        )
                    )
                )
                .border(
                    2.dp,
                    Brush.linearGradient(listOf(YomoriTeal, YomoriGreen)),
                    RoundedCornerShape(20.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                "夜",
                color = YomoriTeal,
                fontWeight = FontWeight.Black,
                fontSize = 34.sp
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            "YOMORI",
            color = Color(0xFFF1F5F9),
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Text(
            "Tu mundo de Manga & Manhwa",
            color = Color(0xFF94A3B8),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(18.dp))

        HorizontalDivider(color = YomoriBorder.copy(alpha = 0.6f))
    }
}
