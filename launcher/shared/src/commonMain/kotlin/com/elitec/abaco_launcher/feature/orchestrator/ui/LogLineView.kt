package com.elitec.abaco_launcher.feature.orchestrator.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLine
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.LogLevel

/** Colores de la consola oscura para cada nivel de log. */
private val colorForLevel: Map<LogLevel, Color> = mapOf(
    LogLevel.INFO  to Color(0xFFCDD6F4),   // Catppuccin text — blanco suave
    LogLevel.DEBUG to Color(0xFF89DCEB),   // cian claro
    LogLevel.WARN  to Color(0xFFF9E2AF),   // amarillo ámbar
    LogLevel.ERROR to Color(0xFFF38BA8),   // rojo coral
)

private val prefixColorForLevel: Map<LogLevel, Color> = mapOf(
    LogLevel.INFO  to Color(0xFF89B4FA),   // azul lavanda
    LogLevel.DEBUG to Color(0xFF89DCEB),
    LogLevel.WARN  to Color(0xFFF9E2AF),
    LogLevel.ERROR to Color(0xFFF38BA8),
)

/**
 * Renderiza una línea de log de la consola con el prefijo [timestamp][LEVEL] coloreado
 * y el texto del mensaje.
 */
@Composable
fun LogLineView(line: LogLine, modifier: Modifier = Modifier) {
    val prefixColor = prefixColorForLevel[line.level] ?: Color(0xFF89B4FA)
    val textColor = colorForLevel[line.level] ?: Color(0xFFCDD6F4)
    val monoStyle = FontFamily.Monospace

    Row(modifier = modifier, verticalAlignment = Alignment.Top) {
        // Timestamp + nivel (prefijo)
        Text(
            text = "[${line.timestamp}][${line.level.name}] ",
            fontFamily = monoStyle,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = prefixColor,
            maxLines = 1,
        )
        Spacer(Modifier.width(0.dp))
        // Texto del mensaje
        Text(
            text = line.text,
            fontFamily = monoStyle,
            fontSize = 11.sp,
            color = textColor,
        )
    }
}
