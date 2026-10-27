package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStep
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStepStatus

// Paleta Catppuccin Macchiato
private val colorPending  = Color(0xFF585B70)   // surface2
private val colorRunning  = Color(0xFF89B4FA)   // blue
private val colorSuccess  = Color(0xFFA6E3A1)   // green
private val colorFailed   = Color(0xFFF38BA8)   // red

@Composable
fun TaskStepRow(
    step: TaskStep,
    isLast: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val dotColor = when (step.status) {
        TaskStepStatus.Pending -> colorPending
        TaskStepStatus.Running -> colorRunning
        TaskStepStatus.Success -> colorSuccess
        TaskStepStatus.Failed  -> colorFailed
    }
    val labelColor = when (step.status) {
        TaskStepStatus.Pending -> Color(0xFF7F849C)
        TaskStepStatus.Running -> Color(0xFFCDD6F4)
        TaskStepStatus.Success -> Color(0xFFA6E3A1)
        TaskStepStatus.Failed  -> Color(0xFFF38BA8)
    }
    val glyph = when (step.status) {
        TaskStepStatus.Pending -> "○"
        TaskStepStatus.Running -> "◉"
        TaskStepStatus.Success -> "✓"
        TaskStepStatus.Failed  -> "✕"
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 0.dp),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.Top,
    ) {
        // Columna izquierda: dot + línea vertical conectora
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(28.dp),
        ) {
            if (step.status == TaskStepStatus.Running) {
                val transition = rememberInfiniteTransition(label = "step-${step.id}")
                val pulse by transition.animateFloat(
                    initialValue = 0.6f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(600, easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse,
                    ),
                    label = "step-pulse",
                )
                val scale by transition.animateFloat(
                    initialValue = 0.85f,
                    targetValue = 1.2f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(600, easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse,
                    ),
                    label = "step-scale",
                )
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .scale(scale)
                        .alpha(pulse)
                        .clip(CircleShape)
                        .background(dotColor),
                )
            } else {
                Text(
                    text = glyph,
                    color = dotColor,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            // Línea vertical conectora (excepto el último)
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(28.dp)
                        .background(
                            when (step.status) {
                                TaskStepStatus.Success -> colorSuccess.copy(alpha = 0.5f)
                                TaskStepStatus.Failed  -> colorFailed.copy(alpha = 0.4f)
                                TaskStepStatus.Running -> colorRunning.copy(alpha = 0.6f)
                                else                   -> colorPending.copy(alpha = 0.5f)
                            },
                        ),
                )
            }
        }

        Spacer(Modifier.width(10.dp))

        // Texto del paso
        Column(modifier = Modifier.weight(1f).padding(top = 1.dp)) {
            Text(
                text = step.label,
                fontSize = 13.sp,
                fontWeight = if (step.status == TaskStepStatus.Running) FontWeight.SemiBold else FontWeight.Normal,
                color = labelColor,
            )
            val detail = step.detail
            if (!detail.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(
                    text = detail,
                    fontSize = 11.sp,
                    color = dotColor.copy(alpha = 0.85f),
                )
            }
            Spacer(Modifier.height(if (isLast) 4.dp else 0.dp))
        }
    }
}
