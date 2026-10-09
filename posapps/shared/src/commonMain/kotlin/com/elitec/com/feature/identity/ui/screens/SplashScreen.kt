package com.elitec.com.feature.identity.ui.screens

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import org.jetbrains.compose.resources.painterResource
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import kotlinx.coroutines.delay
import org.jetbrains.compose.resources.painterResource
import kotlin.time.Duration.Companion.milliseconds

// Conserva tus imports existentes de: Res, abacus_color_icon y AbacoColors.

/**
 * Visible mientras SessionControl.Reading.
 * No navega: AppNavHost reacciona al Flow.
 *
 * Coreografía (motion design):
 *  1. Logo entra con spring (escala + giro) y luego "flota".
 *  2. Ondas concéntricas laten detrás del logo.
 *  3. El título se revela letra por letra.
 *  4. Aparece el estado con puntos en ola.
 */
@Composable
fun SplashScreen() {
    // ---- Entrada del logo ----
    val logoScale = remember { Animatable(0.3f) }
    val logoAlpha = remember { Animatable(0f) }
    val logoRotation = remember { Animatable(-25f) }
    val statusAlpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        // Se lanzan en paralelo con launch implícito vía animaciones independientes.
        logoAlpha.animateTo(1f, tween(350))
    }
    LaunchedEffect(Unit) {
        logoScale.animateTo(
            1f,
            spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        )
    }
    LaunchedEffect(Unit) {
        logoRotation.animateTo(
            0f,
            spring(dampingRatio = Spring.DampingRatioLowBouncy, stiffness = Spring.StiffnessLow),
        )
    }
    LaunchedEffect(Unit) {
        delay(1100.milliseconds)
        statusAlpha.animateTo(1f, tween(500))
    }

    // ---- Animaciones infinitas ----
    val infinite = rememberInfiniteTransition(label = "splash-infinite")

    val glow = infinite.animateFloat(
        initialValue = 0.10f,
        targetValue = 0.22f,
        animationSpec = infiniteRepeatable(tween(2600, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "bg-glow",
    )
    val float = infinite.animateFloat(
        initialValue = -6f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "logo-float",
    )
    // Tres ondas desfasadas.
    val ring0 = rippleProgress(infinite, offsetMs = 0)
    val ring1 = rippleProgress(infinite, offsetMs = 900)
    val ring2 = rippleProgress(infinite, offsetMs = 1800)

    val cyan = AbacoColors.Cyan
    val bg = MaterialTheme.colorScheme.background

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(cyan.copy(alpha = glow.value), bg),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // ---- Logo + ondas ----
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(280.dp)) {
                Canvas(Modifier.fillMaxSize()) {
                    val minR = size.minDimension * 0.22f
                    val maxR = size.minDimension / 2f
                    listOf(ring0, ring1, ring2).forEach { p ->
                        val progress = p.value
                        drawCircle(
                            color = cyan.copy(alpha = (1f - progress) * 0.35f),
                            radius = lerp(minR, maxR, progress),
                            style = Stroke(width = 2.dp.toPx()),
                        )
                    }
                }
                Image(
                    painter = painterResource(Res.drawable.abacus_color_icon),
                    contentDescription = "Ábaco POS",
                    modifier = Modifier
                        .size(120.dp)
                        .graphicsLayer {
                            scaleX = logoScale.value
                            scaleY = logoScale.value
                            rotationZ = logoRotation.value
                            alpha = logoAlpha.value
                            translationY = float.value.dp.toPx()
                        },
                    contentScale = ContentScale.Fit,
                )
            }

            Spacer(Modifier.height(4.dp))

            // ---- Título letra por letra ----
            AnimatedTitle(
                text = "Ábaco POS",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = cyan,
                ),
                startDelayMs = 500,
            )

            Spacer(Modifier.height(32.dp))

            // ---- Estado ----
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.graphicsLayer {
                    alpha = statusAlpha.value
                    translationY = (1f - statusAlpha.value) * 12.dp.toPx()
                },
            ) {
                WaveDots()
                Spacer(Modifier.height(14.dp))
                Text(
                    text = "Comprobando sesión…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun rippleProgress(
    transition: androidx.compose.animation.core.InfiniteTransition,
    offsetMs: Int,
) = transition.animateFloat(
    initialValue = 0f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(
        animation = tween(2700, easing = LinearEasing),
        repeatMode = RepeatMode.Restart,
        initialStartOffset = StartOffset(offsetMs),
    ),
    label = "ripple-$offsetMs",
)

/** Cada letra sube y aparece con un pequeño retraso respecto a la anterior. */
@Composable
private fun AnimatedTitle(
    text: String,
    style: TextStyle,
    startDelayMs: Long,
) {
    Row {
        text.forEachIndexed { index, char ->
            val progress = remember { Animatable(0f) }
            LaunchedEffect(Unit) {
                delay(startDelayMs + index * 55L)
                progress.animateTo(1f, tween(500, easing = FastOutSlowInEasing))
            }
            Text(
                text = char.toString(),
                style = style,
                modifier = Modifier.graphicsLayer {
                    alpha = progress.value
                    translationY = (1f - progress.value) * 28.dp.toPx()
                    val s = 0.85f + 0.15f * progress.value
                    scaleX = s
                    scaleY = s
                },
            )
        }
    }
}

/** Tres puntos que laten en ola, reemplazan al spinner clásico. */
@Composable
private fun WaveDots() {
    val transition = rememberInfiniteTransition(label = "dots")
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
        repeat(3) { i ->
            val s = transition.animateFloat(
                initialValue = 0.5f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(480, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse,
                    initialStartOffset = StartOffset(i * 160),
                ),
                label = "dot-$i",
            )
            Box(
                Modifier
                    .size(10.dp)
                    .graphicsLayer {
                        scaleX = s.value
                        scaleY = s.value
                        alpha = 0.4f + 0.6f * s.value
                    }
                    .clip(CircleShape)
                    .background(AbacoColors.Cyan),
            )
        }
    }
}
