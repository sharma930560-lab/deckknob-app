package com.deckknob.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.deckknob.app.data.model.update.AnnouncementBannerConfig
import com.deckknob.app.ui.theme.DeckKnobYellow

@Composable
fun AnnouncementBanner(
    bannerConfig: AnnouncementBannerConfig?,
    onActionClick: (String) -> Unit = {}
) {
    if (bannerConfig == null || !bannerConfig.enabled || bannerConfig.text.isBlank()) return

    var isDismissed by remember(bannerConfig.id, bannerConfig.text) { mutableStateOf(false) }

    AnimatedVisibility(
        visible = !isDismissed,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        val backgroundColor = when (bannerConfig.type.lowercase()) {
            "critical", "error" -> Color(0xFFEF4444)
            "warning" -> Color(0xFFF59E0B)
            else -> DeckKnobYellow
        }

        val textColor = when (bannerConfig.type.lowercase()) {
            "critical", "error" -> Color.White
            "warning" -> Color.Black
            else -> Color.Black
        }

        val icon = when (bannerConfig.type.lowercase()) {
            "critical", "warning" -> Icons.Default.Warning
            else -> Icons.Default.Campaign
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(backgroundColor)
                .clickable {
                    bannerConfig.actionUrl?.let { onActionClick(it) }
                }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = bannerConfig.text,
                color = textColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f)
            )
            IconButton(
                onClick = { isDismissed = true },
                modifier = Modifier.size(20.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Dismiss",
                    tint = textColor,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
