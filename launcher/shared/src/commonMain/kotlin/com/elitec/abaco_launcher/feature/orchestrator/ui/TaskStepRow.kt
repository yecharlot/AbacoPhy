package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.MonitorHeart
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.WifiTethering
import androidx.compose.material.icons.rounded.Circle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStep
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStepStatus

private fun stepIcon(id: String): ImageVector = when (id) {
    "port" -> Icons.Rounded.Tune
    "backend" -> Icons.Rounded.Dns
    "health" -> Icons.Rounded.MonitorHeart
    "discovery" -> Icons.Rounded.WifiTethering
    "browser" -> Icons.Rounded.Language
    else -> Icons.Rounded.Circle
}

private fun statusColor(status: TaskStepStatus): Color = when (status) {
    TaskStepStatus.Pending -> Ide.Overlay
    TaskStepStatus.Running -> Ide.Blue
    TaskStepStatus.Success -> Ide.Green
    TaskStepStatus.Failed -> Ide.Red
}

private fun statusTag(status: TaskStepStatus): String = when (status) {
    TaskStepStatus.Pending -> "ESPERA"
    TaskStepStatus.Running -> "EN CURSO"
    TaskStepStatus.Success -> "OK"
    TaskStepStatus.Failed -> "FALLÓ"
}

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun TaskStepRow(
    step: TaskStep,
    isLast: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val accent by animateColorAsState(statusColor(step.status), tween(300), label = "step-accent")
    val rowBg by animateColorAsState(
        when (step.status) {
            TaskStepStatus.Running -> Ide.Blue.copy(alpha = 0.08f)
            TaskStepStatus.Failed -> Ide.Red.copy(alpha = 0.07f)
            else -> Color.Transparent
        },
        tween(300),
        label = "step-bg",
    )

    // "Shake" horizontal cuando un paso falla
    val shake = remember { Animatable(0f) }
    LaunchedEffect(step.status) {
        if (step.status == TaskStepStatus.Failed) {
            repeat(3) {
                shake.animateTo(4f, tween(45))
                shake.animateTo(-4f, tween(45))
            }
            shake.animateTo(0f, tween(45))
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .offset { IntOffset(shake.value.dp.roundToPx(), 0) }
            .clip(RoundedCornerShape(8.dp))
            .background(rowBg)
            .padding(horizontal = 8.dp),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp),
    ) {
        // Columna izquierda: badge + conector vertical
        Column(
            modifier = Modifier.width(26.dp).fillMaxHeight(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(6.dp))
            StepBadge(step = step, accent = accent)
            if (!isLast) {
                val fill by animateFloatAsState(
                    if (step.status == TaskStepStatus.Success) 1f else 0f,
                    tween(600),
                    label = "connector-fill",
                )
                Box(
                    modifier = Modifier
                        .padding(vertical = 4.dp)
                        .width(2.dp)
                        .weight(1f)
                        .clip(CircleShape)
                        .background(Ide.Border),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(fill)
                            .background(Ide.Green.copy(alpha = 0.7f)),
                    )
                }
            }
        }

        // Texto del paso
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(top = 6.dp, bottom = if (isLast) 6.dp else 14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = step.label,
                    fontSize = 13.sp,
                    fontWeight = if (step.status == TaskStepStatus.Running) FontWeight.SemiBold else FontWeight.Normal,
                    color = when (step.status) {
                        TaskStepStatus.Pending -> Ide.Subtle
                        TaskStepStatus.Running -> Ide.Fg
                        else -> accent
                    },
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(6.dp))
                AnimatedContent(
                    targetState = step.status,
                    transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(120)) },
                    label = "step-tag",
                ) { s ->
                    Text(
                        text = statusTag(s),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp,
                        color = statusColor(s).copy(alpha = if (s == TaskStepStatus.Pending) 0.7f else 1f),
                    )
                }
            }
            val detail = step.detail
            AnimatedVisibility(
                visible = !detail.isNullOrBlank(),
                enter = fadeIn(tween(250)) + expandVertically(tween(250)),
                exit = fadeOut(tween(150)) + shrinkVertically(tween(150)),
            ) {
                Text(
                    text = detail.orEmpty(),
                    fontSize = 11.sp,
                    color = accent.copy(alpha = 0.85f),
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

/** Badge circular: cambia con rebote entre pendiente / spinner / check / error. */
@OptIn(ExperimentalAnimationApi::class)
@Composable
private fun StepBadge(step: TaskStep, accent: Color) {
    Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
        AnimatedContent(
            targetState = step.status,
            transitionSpec = {
                (scaleIn(spring(dampingRatio = Spring.DampingRatioMediumBouncy), initialScale = 0.4f) + fadeIn(tween(150))) togetherWith
                        (scaleOut(targetScale = 0.6f) + fadeOut(tween(120)))
            },
            label = "step-badge",
        ) { status ->
            val color = statusColor(status)
            when (status) {
                TaskStepStatus.Pending -> Box(
                    Modifier.size(22.dp).clip(CircleShape).border(1.5.dp, color.copy(alpha = 0.6f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(stepIcon(step.id), null, tint = color, modifier = Modifier.size(12.dp))
                }

                TaskStepStatus.Running -> Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                    Spinner(color = color)
                    Icon(stepIcon(step.id), null, tint = color, modifier = Modifier.size(12.dp))
                }

                TaskStepStatus.Success -> Box(
                    Modifier.size(22.dp).clip(CircleShape).background(color.copy(alpha = 0.18f))
                        .border(1.5.dp, color.copy(alpha = 0.6f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Check, null, tint = color, modifier = Modifier.size(14.dp))
                }

                TaskStepStatus.Failed -> Box(
                    Modifier.size(22.dp).clip(CircleShape).background(color.copy(alpha = 0.18f))
                        .border(1.5.dp, color.copy(alpha = 0.6f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Close, null, tint = color, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}

@Composable
private fun Spinner(color: Color) {
    val transition = rememberInfiniteTransition(label = "spinner")
    val rotation by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart),
        label = "spinner-rot",
    )
    Canvas(Modifier.size(24.dp)) {
        val strokeW = 2.dp.toPx()
        val pad = strokeW / 2
        val arcSize = Size(size.width - strokeW, size.height - strokeW)
        val stroke = Stroke(width = strokeW, cap = StrokeCap.Round)
        drawArc(color.copy(alpha = 0.2f), 0f, 360f, false, Offset(pad, pad), arcSize, style = stroke)
        drawArc(color, rotation, 100f, false, Offset(pad, pad), arcSize, style = stroke)
    }
}
