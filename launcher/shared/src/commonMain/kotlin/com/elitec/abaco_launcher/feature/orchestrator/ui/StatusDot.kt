package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Punto de estado circular: pulsa suavemente cuando [isRunning] es true.
 */
@Composable
fun StatusDot(
    isRunning: Boolean,
    color: Color,
    size: Dp = 10.dp,
    modifier: Modifier = Modifier,
) {
    if (isRunning) {
        val transition = rememberInfiniteTransition(label = "dot-pulse")
        val alpha by transition.animateFloat(
            initialValue = 0.4f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(700, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "dot-alpha",
        )
        val scale by transition.animateFloat(
            initialValue = 0.85f,
            targetValue = 1.15f,
            animationSpec = infiniteRepeatable(
                animation = tween(700, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "dot-scale",
        )
        Box(
            modifier = modifier
                .size(size)
                .scale(scale)
                .alpha(alpha)
                .clip(CircleShape)
                .background(color),
        )
    } else {
        Box(
            modifier = modifier
                .size(size)
                .clip(CircleShape)
                .background(color),
        )
    }
}
