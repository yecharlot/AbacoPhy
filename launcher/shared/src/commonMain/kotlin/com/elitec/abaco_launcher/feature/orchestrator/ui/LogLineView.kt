package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.DisableSelection
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLevel
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLine
import kotlinx.coroutines.launch

private fun levelColor(level: LogLevel): Color = when (level) {
    LogLevel.INFO -> Ide.Blue
    LogLevel.DEBUG -> Ide.Cyan
    LogLevel.WARN -> Ide.Yellow
    LogLevel.ERROR -> Ide.Red
}

private fun messageColor(level: LogLevel): Color = when (level) {
    LogLevel.INFO -> Ide.Fg
    LogLevel.DEBUG -> Ide.Subtle
    LogLevel.WARN -> Ide.Yellow
    LogLevel.ERROR -> Ide.Red
}

private val kvRegex = Regex("""([A-Za-z_][\w.]*)=(\S+)""")

/** Resalta pares KEY=value (p. ej. EVENT=discovery.advertised) como en un visor de logs. */
private fun highlight(text: String): AnnotatedString = buildAnnotatedString {
    var last = 0
    kvRegex.findAll(text).forEach { m ->
        append(text.substring(last, m.range.first))
        withStyle(SpanStyle(color = Ide.Purple)) { append(m.groupValues[1]) }
        withStyle(SpanStyle(color = Ide.Subtle)) { append("=") }
        withStyle(SpanStyle(color = Ide.Peach)) { append(m.groupValues[2]) }
        last = m.range.last + 1
    }
    append(text.substring(last))
}

/**
 * Línea de log estilo IDE: gutter con número, timestamp tenue, badge de nivel y mensaje.
 * Las líneas nuevas entran con fade + slide; los errores nuevos parpadean en rojo.
 */
@Composable
fun LogLineView(
    line: LogLine,
    number: Int,
    modifier: Modifier = Modifier,
    animate: Boolean = false,
) {
    val alpha = remember { Animatable(if (animate) 0f else 1f) }
    val slide = remember { Animatable(if (animate) 8f else 0f) }
    val flash = remember { Animatable(if (animate && line.level == LogLevel.ERROR) 0.28f else 0f) }
    LaunchedEffect(Unit) {
        if (animate) {
            launch { alpha.animateTo(1f, tween(180)) }
            launch { slide.animateTo(0f, tween(180)) }
            launch { flash.animateTo(0f, tween(900)) }
        }
    }

    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val tint = when (line.level) {
        LogLevel.ERROR -> Ide.Red.copy(alpha = 0.07f)
        LogLevel.WARN -> Ide.Yellow.copy(alpha = 0.04f)
        else -> Color.Transparent
    }
    val color = levelColor(line.level)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer {
                this.alpha = alpha.value
                translationY = slide.value
            }
            .clip(RoundedCornerShape(4.dp))
            .background(if (hovered) Ide.Surface1.copy(alpha = 0.7f) else tint)
            .drawBehind { drawRect(Ide.Red.copy(alpha = flash.value)) }
            .hoverable(source)
            .padding(horizontal = 6.dp, vertical = 1.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top,
    ) {
        DisableSelection {
            Text(
                text = number.toString(),
                modifier = Modifier.width(36.dp),
                textAlign = TextAlign.End,
                fontFamily = Ide.Mono,
                fontSize = 10.sp,
                lineHeight = 16.sp,
                color = Ide.Overlay,
                maxLines = 1,
            )
            Text(
                text = line.timestamp,
                fontFamily = Ide.Mono,
                fontSize = 11.sp,
                lineHeight = 16.sp,
                color = Ide.Subtle,
                maxLines = 1,
            )
            Box(
                modifier = Modifier
                    .padding(top = 2.dp)
                    .width(40.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(color.copy(alpha = 0.14f))
                    .padding(vertical = 1.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = line.level.name,
                    fontFamily = Ide.Mono,
                    fontSize = 9.sp,
                    lineHeight = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = color,
                    maxLines = 1,
                )
            }
        }
        Text(
            text = highlight(line.text),
            modifier = Modifier.weight(1f),
            fontFamily = Ide.Mono,
            fontSize = 11.sp,
            lineHeight = 16.sp,
            color = messageColor(line.level),
        )
    }
}