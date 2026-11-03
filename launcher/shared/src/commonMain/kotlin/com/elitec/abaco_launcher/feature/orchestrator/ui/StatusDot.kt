package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearOutSlowInEasing
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Punto de estado: transición suave de color y, cuando [isRunning] es true,
 * un anillo expansivo tipo "ping" de radar.
 * Ocupa un área de 2.4 × [size] para dejar espacio al anillo.
 */
@Composable
fun StatusDot(
    isRunning: Boolean,
    color: Color,
    size: Dp = 10.dp,
    modifier: Modifier = Modifier,
) {
    val animatedColor by animateColorAsState(color, tween(300), label = "dot-color")

    Box(modifier = modifier.size(size * 2.4f), contentAlignment = Alignment.Center) {
        if (isRunning) {
            val transition = rememberInfiniteTransition(label = "dot-ping")
            val ring by transition.animateFloat(
                initialValue = 0f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1400, easing = LinearOutSlowInEasing),
                    repeatMode = RepeatMode.Restart,
                ),
                label = "dot-ring",
            )
            Box(
                Modifier
                    .size(size)
                    .graphicsLayer {
                        val s = 1f + ring * 1.4f
                        scaleX = s
                        scaleY = s
                        alpha = (1f - ring) * 0.55f
                    }
                    .clip(CircleShape)
                    .background(animatedColor),
            )
        }
        Box(
            Modifier
                .size(size)
                .clip(CircleShape)
                .background(animatedColor),
        )
    }
}