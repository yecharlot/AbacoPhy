package com.elitec.com.infraestructure.ui.feedback

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Sync
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.elitec.com.feature.pos.data.sync.OutboxSyncWorker
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay

/**
 * Overlay global: toasts de conectividad / cola / sincronización.
 * Montar encima del contenido del shell (HomeNavHost), sin alterar NavRail.
 */
@Composable
fun AppFeedbackHost(
    status: OutboxSyncWorker.UiStatus,
    pending: Int,
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit = {},
) {
    var current by remember { mutableStateOf<AppFeedbackEvent?>(null) }
    var seq by remember { mutableStateOf(0L) }
    var prevStatus by remember { mutableStateOf<OutboxSyncWorker.UiStatus?>(null) }
    var prevPending by remember { mutableStateOf(0) }

    LaunchedEffect(status, pending) {
        val event = feedbackForTransition(
            previous = prevStatus,
            next = status,
            prevPending = prevPending,
            pending = pending,
            nextId = { ++seq },
        )
        prevStatus = status
        prevPending = pending
        if (event != null) {
            current = event
            if (event.durationMs > 0) {
                delay(event.durationMs)
                if (current?.id == event.id) {
                    current = null
                    if (status is OutboxSyncWorker.UiStatus.SyncFinished) {
                        onDismiss()
                    }
                }
            }
        } else if (status is OutboxSyncWorker.UiStatus.Online &&
            current?.tone == FeedbackTone.Progress
        ) {
            current = null
        }
    }

    // Progress sticky while Syncing
    LaunchedEffect(status) {
        if (status is OutboxSyncWorker.UiStatus.Syncing && current?.tone != FeedbackTone.Progress) {
            current = AppFeedbackEvent(
                id = ++seq,
                tone = FeedbackTone.Progress,
                title = "Sincronizando…",
                message = if (status.pendingOps > 0) {
                    "${status.pendingOps} operación(es) en curso"
                } else {
                    "Enviando operaciones pendientes"
                },
                durationMs = 0,
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .zIndex(40f)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.TopCenter,
    ) {
        AnimatedVisibility(
            visible = current != null,
            enter = slideInVertically(
                animationSpec = tween(320, easing = FastOutSlowInEasing),
                initialOffsetY = { -it },
            ) + fadeIn(tween(280)),
            exit = slideOutVertically(
                animationSpec = tween(260),
                targetOffsetY = { -it / 2 },
            ) + fadeOut(tween(220)),
        ) {
            current?.let { event ->
                FeedbackCard(
                    event = event,
                    onClick = {
                        current = null
                        if (status is OutboxSyncWorker.UiStatus.SyncFinished) onDismiss()
                    },
                )
            }
        }
    }
}

@Composable
private fun FeedbackCard(
    event: AppFeedbackEvent,
    onClick: () -> Unit,
) {
    val colors = AppTheme.materialColors
    val (bg, border, accent, icon) = toneVisual(event.tone, colors.primary, colors.error, colors.tertiary)

    Surface(
        modifier = Modifier
            .widthIn(max = 440.dp)
            .fillMaxWidth()
            .shadow(10.dp, RoundedCornerShape(18.dp))
            .clip(RoundedCornerShape(18.dp))
            .border(1.dp, border, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick),
        color = bg,
        tonalElevation = 2.dp,
        shape = RoundedCornerShape(18.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(accent.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                if (event.tone == FeedbackTone.Progress) {
                    val spin = rememberInfiniteTransition(label = "syncSpin")
                    val angle by spin.animateFloat(
                        initialValue = 0f,
                        targetValue = 360f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(900, easing = FastOutSlowInEasing),
                            repeatMode = RepeatMode.Restart,
                        ),
                        label = "angle",
                    )
                    Icon(
                        imageVector = Icons.Rounded.Sync,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier
                            .size(24.dp)
                            .rotate(angle),
                    )
                } else {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                )
                event.message?.let { msg ->
                    Spacer(Modifier.size(2.dp))
                    Text(
                        text = msg,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onSurfaceVariant,
                    )
                }
            }

            if (event.tone == FeedbackTone.Progress) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = accent,
                )
            }
        }
    }
}

private data class ToneVisual(
    val background: Color,
    val border: Color,
    val accent: Color,
    val icon: ImageVector,
)

@Composable
private fun toneVisual(
    tone: FeedbackTone,
    primary: Color,
    error: Color,
    tertiary: Color,
): ToneVisual {
    val surface = MaterialTheme.colorScheme.surfaceContainerHigh
    return when (tone) {
        FeedbackTone.Info -> ToneVisual(
            surface, primary.copy(alpha = 0.28f), primary, Icons.Rounded.Info,
        )
        FeedbackTone.Success -> ToneVisual(
            surface, primary.copy(alpha = 0.35f), primary, Icons.Rounded.DoneAll,
        )
        FeedbackTone.Warning -> ToneVisual(
            surface, tertiary.copy(alpha = 0.4f), tertiary, Icons.Rounded.WarningAmber,
        )
        FeedbackTone.Error -> ToneVisual(
            surface, error.copy(alpha = 0.4f), error, Icons.Rounded.CloudOff,
        )
        FeedbackTone.Progress -> ToneVisual(
            surface, tertiary.copy(alpha = 0.35f), tertiary, Icons.Rounded.CloudSync,
        )
    }
}

/**
 * Traduce transiciones de estado del worker a mensajes humanos.
 */
internal fun feedbackForTransition(
    previous: OutboxSyncWorker.UiStatus?,
    next: OutboxSyncWorker.UiStatus,
    prevPending: Int,
    pending: Int,
    nextId: () -> Long,
): AppFeedbackEvent? {
    // Offline
    if (next is OutboxSyncWorker.UiStatus.Offline &&
        previous !is OutboxSyncWorker.UiStatus.Offline
    ) {
        return AppFeedbackEvent(
            id = nextId(),
            tone = FeedbackTone.Error,
            title = "Sin conexión con el servidor",
            message = if (next.pendingOps > 0 || pending > 0) {
                "Las ventas se guardan en cola local (${maxOf(next.pendingOps, pending)})"
            } else {
                "Puedes seguir vendiendo; se sincronizará al recuperar la red"
            },
            durationMs = 5_000,
        )
    }

    // Cola creció estando offline
    if (next is OutboxSyncWorker.UiStatus.Offline &&
        pending > prevPending &&
        prevPending >= 0
    ) {
        return AppFeedbackEvent(
            id = nextId(),
            tone = FeedbackTone.Warning,
            title = "Operación en cola",
            message = "$pending pendiente(s) esperando al servidor",
            durationMs = 3_200,
        )
    }

    // Recuperación → Online (sin pending) o va a Syncing
    if (previous is OutboxSyncWorker.UiStatus.Offline &&
        next is OutboxSyncWorker.UiStatus.Online
    ) {
        return AppFeedbackEvent(
            id = nextId(),
            tone = FeedbackTone.Success,
            title = "Conexión recuperada",
            message = if (pending > 0) {
                "Hay $pending operación(es) por sincronizar"
            } else {
                "Comunicación con el servidor restablecida"
            },
            durationMs = 3_500,
        )
    }

    if (previous is OutboxSyncWorker.UiStatus.Offline &&
        next is OutboxSyncWorker.UiStatus.Syncing
    ) {
        return AppFeedbackEvent(
            id = nextId(),
            tone = FeedbackTone.Success,
            title = "Conexión recuperada",
            message = "Sincronizando cola automáticamente…",
            durationMs = 2_800,
        )
    }

    // Sync finished
    if (next is OutboxSyncWorker.UiStatus.SyncFinished) {
        return when {
            next.rejected > 0 -> AppFeedbackEvent(
                id = nextId(),
                tone = FeedbackTone.Warning,
                title = "Sincronización con incidencias",
                message = buildString {
                    if (next.confirmed > 0) append("${next.confirmed} OK. ")
                    append("${next.rejected} requieren revisión")
                    if (next.stillPending > 0) append(" · ${next.stillPending} aún en cola")
                },
                durationMs = 6_000,
            )
            next.confirmed > 0 -> AppFeedbackEvent(
                id = nextId(),
                tone = FeedbackTone.Success,
                title = "Datos sincronizados",
                message = "${next.confirmed} operación(es) enviadas al servidor",
                durationMs = 4_000,
            )
            next.stillPending > 0 -> AppFeedbackEvent(
                id = nextId(),
                tone = FeedbackTone.Warning,
                title = "Quedan operaciones en cola",
                message = "${next.stillPending} aún pendientes de confirmar",
                durationMs = 4_500,
            )
            else -> AppFeedbackEvent(
                id = nextId(),
                tone = FeedbackTone.Info,
                title = "Todo al día",
                message = "No había operaciones pendientes",
                durationMs = 2_800,
            )
        }
    }

    return null
}
