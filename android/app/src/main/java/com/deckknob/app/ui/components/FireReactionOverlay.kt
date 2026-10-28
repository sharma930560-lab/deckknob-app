package com.deckknob.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.deckknob.app.ui.theme.DeckKnobYellow
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

private val FlameOrange = Color(0xFFFF3D00)
private val FlameDeepYellow = Color(0xFFFF9100)
private val FlameGlow = Color(0x99FF5722)

/**
 * High-fidelity 3D Fire Reaction burst animation for double-tap gestures
 * across media posts and Klyps short videos.
 * Supports exact tap-position-aware positioning with edge safety padding.
 */
@Composable
fun FireReactionOverlay(
    visible: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    tapOffset: Offset? = null
) {
    if (!visible) return

    val density = LocalDensity.current
    val transition = updateTransition(targetState = true, label = "FireReaction3D")

    // Spring pop scale: explodes from 0 -> 1.35 -> settles around 1.05
    val scale by transition.animateFloat(
        transitionSpec = {
            spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        },
        label = "FireScale"
    ) { state ->
        if (state) 1.15f else 0f
    }

    // Upward float drift: drifts up 32 dp as it finishes
    val driftY by transition.animateFloat(
        transitionSpec = {
            tween(durationMillis = 650, easing = FastOutSlowInEasing)
        },
        label = "FireOffsetY"
    ) { state ->
        if (state) -32f else 0f
    }

    // Smooth fade out towards the tail of the animation
    val alpha by transition.animateFloat(
        transitionSpec = {
            keyframes {
                durationMillis = 650
                1f at 0
                1f at 400
                0f at 650
            }
        },
        label = "FireAlpha"
    ) { state ->
        if (state) 0f else 1f
    }

    LaunchedEffect(visible) {
        delay(650)
        onDismiss()
    }

    BoxWithConstraints(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        val containerWidthPx = constraints.maxWidth.toFloat()
        val containerHeightPx = constraints.maxHeight.toFloat()
        val edgePaddingPx = with(density) { 56.dp.toPx() }

        val (targetXOffsetPx, targetYOffsetPx) = if (tapOffset != null && containerWidthPx > 0 && containerHeightPx > 0) {
            val clampedX = tapOffset.x.coerceIn(edgePaddingPx, (containerWidthPx - edgePaddingPx).coerceAtLeast(edgePaddingPx))
            val clampedY = tapOffset.y.coerceIn(edgePaddingPx, (containerHeightPx - edgePaddingPx).coerceAtLeast(edgePaddingPx))
            val diffX = clampedX - (containerWidthPx / 2f)
            val diffY = clampedY - (containerHeightPx / 2f)
            Pair(diffX, diffY)
        } else {
            Pair(0f, 0f)
        }

        val driftYPx = with(density) { driftY.dp.toPx() }

        Box(
            modifier = Modifier
                .offset {
                    IntOffset(
                        targetXOffsetPx.roundToInt(),
                        (targetYOffsetPx + driftYPx).roundToInt()
                    )
                }
                .scale(scale)
                .alpha(alpha),
            contentAlignment = Alignment.Center
        ) {
            // Ambient radial backglow
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .blur(24.dp)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(FlameDeepYellow, FlameOrange, Color.Transparent)
                        ),
                        shape = CircleShape
                    )
            )

            // Outer flame halo ring
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(FlameGlow, Color.Transparent)
                        ),
                        shape = CircleShape
                    )
            )

            // Spark particles
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .offset(x = (-28).dp, y = (-26).dp)
                    .background(DeckKnobYellow, CircleShape)
            )
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .offset(x = 24.dp, y = (-32).dp)
                    .background(FlameOrange, CircleShape)
            )
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .offset(x = 30.dp, y = (-12).dp)
                    .background(FlameDeepYellow, CircleShape)
            )
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .offset(x = (-18).dp, y = (-42).dp)
                    .background(Color.White, CircleShape)
            )

            // 3D Shadow layer (depth)
            Icon(
                imageVector = Icons.Filled.Whatshot,
                contentDescription = null,
                tint = FlameOrange.copy(alpha = 0.85f),
                modifier = Modifier
                    .size(84.dp)
                    .offset(y = 2.dp)
            )

            // Vibrant Foreground Fire Icon
            Icon(
                imageVector = Icons.Filled.Whatshot,
                contentDescription = "Fire reaction",
                tint = DeckKnobYellow,
                modifier = Modifier.size(80.dp)
            )
        }
    }
}
