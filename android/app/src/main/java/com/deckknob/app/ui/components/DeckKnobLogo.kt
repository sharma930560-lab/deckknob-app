package com.deckknob.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.deckknob.app.ui.theme.DeckKnobBlack
import com.deckknob.app.ui.theme.DeckKnobYellow

enum class LogoVariant {
    Primary,
    CompactIcon,
    Header,
    Splash
}

@Composable
fun DeckKnobLogo(
    modifier: Modifier = Modifier,
    variant: LogoVariant = LogoVariant.Primary,
    showTagline: Boolean = true
) {
    when (variant) {
        LogoVariant.CompactIcon -> {
            DeckKnobBrandMark(size = 36.dp)
        }
        LogoVariant.Header -> {
            Row(
                modifier = modifier,
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Start
            ) {
                DeckKnobBrandMark(size = 32.dp)
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "DECKKNOB",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 2.sp,
                        color = Color.White
                    )
                }
            }
        }
        LogoVariant.Primary -> {
            Column(
                modifier = modifier,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                DeckKnobBrandMark(size = 72.dp)
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "DECKKNOB",
                    fontWeight = FontWeight.Black,
                    fontSize = 28.sp,
                    letterSpacing = 4.sp,
                    color = Color.White
                )
                if (showTagline) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "DJ & NIGHTLIFE SIGNAL",
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        letterSpacing = 2.sp,
                        color = DeckKnobYellow
                    )
                }
            }
        }
        LogoVariant.Splash -> {
            Column(
                modifier = modifier,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                DeckKnobBrandMark(size = 96.dp)
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "DECKKNOB",
                    fontWeight = FontWeight.Black,
                    fontSize = 36.sp,
                    letterSpacing = 6.sp,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "BUILD YOUR SIGNAL",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 3.sp,
                    color = DeckKnobYellow
                )
            }
        }
    }
}

@Composable
fun DeckKnobBrandMark(
    size: Dp = 48.dp
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(DeckKnobBlack),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize().padding(4.dp)) {
            val center = Offset(size.toPx() / 2f, size.toPx() / 2f)
            val radius = (size.toPx() / 2f) - 6.dp.toPx()

            // Outer DJ turntable ring
            drawCircle(
                color = DeckKnobYellow,
                radius = radius,
                style = Stroke(width = 2.5.dp.toPx())
            )

            // Inner turntable groove
            drawCircle(
                color = Color.White.copy(alpha = 0.2f),
                radius = radius * 0.7f,
                style = Stroke(width = 1.dp.toPx())
            )

            // Center Knob Dial Dot
            drawCircle(
                color = DeckKnobYellow,
                radius = radius * 0.25f
            )

            // Equalizer Waveform Signal Bars (left & right accents)
            val barWidth = 2.dp.toPx()
            val barHeights = listOf(0.3f, 0.6f, 0.9f, 0.5f)

            barHeights.forEachIndexed { index, ratio ->
                val xOffsetLeft = center.x - radius * 0.5f - (index * 4.dp.toPx())
                val xOffsetRight = center.x + radius * 0.5f + (index * 4.dp.toPx())
                val barLen = radius * ratio * 0.5f

                // Left signal bar
                drawLine(
                    color = DeckKnobYellow.copy(alpha = 0.8f - index * 0.15f),
                    start = Offset(xOffsetLeft, center.y - barLen),
                    end = Offset(xOffsetLeft, center.y + barLen),
                    strokeWidth = barWidth,
                    cap = StrokeCap.Round
                )

                // Right signal bar
                drawLine(
                    color = DeckKnobYellow.copy(alpha = 0.8f - index * 0.15f),
                    start = Offset(xOffsetRight, center.y - barLen),
                    end = Offset(xOffsetRight, center.y + barLen),
                    strokeWidth = barWidth,
                    cap = StrokeCap.Round
                )
            }
        }
    }
}
