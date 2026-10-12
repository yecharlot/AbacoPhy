package com.elitec.com.infraestructure.ui.components

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.MenuOpen
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.CloudQueue
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Sync
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.NavKey
import com.elitec.com.feature.pos.data.sync.OutboxSyncWorker
import com.elitec.com.infraestructure.ui.navigation.InternalRoute
import com.elitec.com.infraestructure.ui.navigation.NavDestinationUi
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay
import org.jetbrains.compose.resources.painterResource
import kotlin.time.Duration.Companion.milliseconds

/* ------------------------------------------------------------------ */
/*  NavRail                                                            */
/* ------------------------------------------------------------------ */

private val RailCompactWidth = 88.dp
private val RailExpandedWidth = 228.dp

@Composable
fun AppNavRail(
    destinations: List<NavDestinationUi>,
    selected: NavKey?,
    expanded: Boolean,
    dense: Boolean,
    userName: String,
    sync: SyncIndicatorUi,            // SYNC
    onSyncClick: () -> Unit,          // SYNC
    onNavigate: (InternalRoute) -> Unit,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier,

    onToggleExpanded: (() -> Unit)? = null,
) {
    val colors = AppTheme.materialColors

    // Entrada una sola vez; cambiar de compacto a expandido NO la repite.
    val entered = remember { MutableTransitionState(false).apply { targetState = true } }
    val width by animateDpAsState(
        targetValue = if (expanded) RailExpandedWidth else RailCompactWidth,
        animationSpec = tween(250),
        label = "railWidth",
    )

    AnimatedVisibility(
        visibleState = entered,
        enter = slideInHorizontally(tween(220)) { -it / 3 } + fadeIn(tween(220)),
    ) {
        Surface(
            modifier = modifier.width(width).fillMaxHeight(),
            shape = RoundedCornerShape(28.dp),
            color = colors.surfaceContainer,
            tonalElevation = 3.dp,
            shadowElevation = 6.dp,
            border = BorderStroke(1.dp, colors.outlineVariant.copy(alpha = 0.4f)),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(colors.primary.copy(alpha = 0.10f), Color.Transparent),
                            endY = 600f,
                        ),
                    ),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(if (expanded) AppTheme.dimensions.cardSpacing else 8.dp),
                    verticalArrangement = Arrangement.spacedBy(if (dense) 4.dp else 12.dp),
                    horizontalAlignment = if (expanded) Alignment.Start else Alignment.CenterHorizontally,
                ) {
                    // ---------- Cabecera (se omite en poca altura compacta) ----------
                    if (expanded) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            AppLogoBox(
                                userName = userName,
                                logoSize = 32.dp,
                                elementSeparation = 10.dp,
                                modifier = Modifier.weight(1f).padding(horizontal = 4.dp, vertical = 4.dp),
                            )
                            onToggleExpanded?.let {
                                IconButton(onClick = it) {
                                    Icon(Icons.AutoMirrored.Filled.MenuOpen, contentDescription = "Contraer menú")
                                }
                            }
                        }
                        HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.5f))
                    } else if (!dense) {
                        Image(
                            painter = painterResource(Res.drawable.abacus_color_icon),
                            contentDescription = "Ábaco POS",
                            modifier = Modifier.size(40.dp).padding(top = 4.dp),
                        )
                        onToggleExpanded?.let {
                            IconButton(onClick = it) {
                                Icon(Icons.Default.Menu, contentDescription = "Expandir menú")
                            }
                        }
                        HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.5f))
                    }

                    // ---------- Destinos (scroll propio) ----------
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        destinations.forEachIndexed { index, d ->
                            val isSelected = d.route == selected
                            Entrance(index) {
                                if (expanded) {
                                    NavButtonItem(
                                        isSelected = isSelected,
                                        iconSize = 22.dp,
                                        onSelectedPage = { onNavigate(d.route) },
                                        navButton = NavButton(
                                            d.label, d.icon, { onNavigate(d.route) }, true, d.description, false,
                                        ),
                                    )
                                } else {
                                    RailItem(d, isSelected, dense) { onNavigate(d.route) }
                                }
                            }
                        }
                    }

                    // ---------- Estado de sincronización (justo sobre el logout)  // SYNC ----------
                    if (expanded) {
                        SyncStatusCard(ui = sync, onClick = onSyncClick)
                    } else {
                        SyncStatusChip(ui = sync, onClick = onSyncClick)
                    }

                    // ---------- Cerrar sesión (fijo abajo) ----------
                    if (expanded) {
                        LogoutButton(onLogout = onLogoutClick)
                    } else {
                        IconButton(onClick = onLogoutClick) {
                            Icon(
                                Icons.AutoMirrored.Filled.Logout,
                                contentDescription = "Cerrar sesión",
                                tint = colors.error,
                            )
                        }
                    }
                }
            }
        }
    }
}


/** Entrada escalonada; el estado vive fuera de la rama expandido/compacto. */
@Composable
private fun Entrance(index: Int, content: @Composable () -> Unit) {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay((120L + index * 45L).milliseconds)
        shown = true
    }
    AnimatedVisibility(
        visible = shown,
        enter = fadeIn(tween(220)) + slideInHorizontally(tween(220)) { -it / 4 },
    ) { content() }
}

/** Ítem del rail compacto: píldora de selección + etiqueta debajo (patrón M3). */
@Composable
private fun RailItem(
    destination: NavDestinationUi,
    selected: Boolean,
    dense: Boolean,
    onClick: () -> Unit,
) {
    val colors = AppTheme.materialColors
    val pill by animateColorAsState(
        if (selected) colors.primary.copy(alpha = 0.18f) else Color.Transparent,
        tween(200), label = "railPill",
    )
    val tint by animateColorAsState(
        if (selected) colors.primary else colors.onSurfaceVariant,
        tween(200), label = "railTint",
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .selectable(selected = selected, role = Role.Tab, onClick = onClick)
            .padding(vertical = if (dense) 4.dp else 6.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.width(56.dp).height(32.dp).background(pill, CircleShape),
        ) {
            Icon(destination.icon, contentDescription = destination.description, tint = tint, modifier = Modifier.size(22.dp))
        }
        Text(
            text = destination.shortLabel,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            color = tint,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/* ================================================================== */
/*  Top bar mínima para móvil portrait                                 */
/* ================================================================== */

@Composable
private fun CompactTopBar(
    title: String,
    userName: String,
    sync: SyncIndicatorUi,            // SYNC
    onSyncClick: () -> Unit,          // SYNC
    onLogoutClick: () -> Unit,
) {
    val colors = AppTheme.materialColors
    var menuOpen by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Image(
            painter = painterResource(Res.drawable.abacus_color_icon),
            contentDescription = "Ábaco POS",
            modifier = Modifier.size(32.dp),
        )
        AnimatedContent(
            targetState = title,
            modifier = Modifier.weight(1f),
            transitionSpec = { fadeIn(tween(180, 60)) togetherWith fadeOut(tween(90)) },
            label = "topBarTitle",
        ) { t ->
            Text(
                t,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = colors.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // SYNC: estado de conexión / cola, a la izquierda del avatar
        SyncStatusChip(ui = sync, onClick = onSyncClick, size = 36.dp)

        Box {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = 0.16f))
                    .clickable { menuOpen = true },
            ) {
                Text(
                    userName.firstOrNull()?.uppercase() ?: "?",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary,
                )
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                DropdownMenuItem(
                    text = { Text(userName.ifBlank { "Usuario" }, fontWeight = FontWeight.SemiBold) },
                    onClick = {},
                    enabled = false,
                )
                HorizontalDivider()
                DropdownMenuItem(
                    text = { Text("Cerrar sesión") },
                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.Logout, null, tint = colors.error) },
                    onClick = { menuOpen = false; onLogoutClick() },
                )
            }
        }
    }
}

enum class SyncKind { UNKNOWN, ONLINE, OFFLINE, SYNCING, FINISHED }

@Immutable
data class SyncIndicatorUi(
    val kind: SyncKind = SyncKind.UNKNOWN,
    val pending: Int = 0,
) {
    /** Tocar tiene sentido: cerrar el resumen, o reintentar si hay cola. */
    val clickable: Boolean
        get() = kind == SyncKind.FINISHED || (kind != SyncKind.SYNCING && pending > 0)
}

fun OutboxSyncWorker.UiStatus.toSyncKind(): SyncKind = when (this) {
    is OutboxSyncWorker.UiStatus.Online -> SyncKind.ONLINE
    is OutboxSyncWorker.UiStatus.Offline -> SyncKind.OFFLINE
    is OutboxSyncWorker.UiStatus.Syncing -> SyncKind.SYNCING
    is OutboxSyncWorker.UiStatus.SyncFinished -> SyncKind.FINISHED
    else -> SyncKind.UNKNOWN
}

/** Un único punto para decidir qué hace el toque. */
fun SyncIndicatorUi.handleClick(requestSync: () -> Unit, dismissFinished: () -> Unit) {
    when {
        kind == SyncKind.FINISHED -> dismissFinished()
        clickable -> requestSync()
    }
}

/** El resumen "Sincronizado" se oculta solo tras unos segundos (vuelve a Online). */
@Composable
fun SyncFinishedAutoDismiss(kind: SyncKind, onDismiss: () -> Unit) {
    LaunchedEffect(kind) {
        if (kind == SyncKind.FINISHED) {
            delay(3500.milliseconds)
            onDismiss()
        }
    }
}

/* ================================================================== */
/*  Apariencia por estado                                              */
/* ================================================================== */

@Immutable
private data class SyncVisual(
    val icon: ImageVector,
    val color: Color,
    val title: String,
    val subtitle: String?,
)

@Composable
private fun syncVisual(ui: SyncIndicatorUi): SyncVisual {
    val c = AppTheme.materialColors
    return when (ui.kind) {
        SyncKind.ONLINE ->
            if (ui.pending > 0) SyncVisual(Icons.Rounded.CloudSync, c.primary, "En línea", "Toca para sincronizar")
            else SyncVisual(Icons.Rounded.CloudDone, c.primary, "En línea", "Todo al día")

        SyncKind.OFFLINE ->
            SyncVisual(
                Icons.Rounded.CloudOff, c.error, "Sin conexión",
                if (ui.pending > 0) "Cambios en cola" else "Modo sin conexión",
            )

        SyncKind.SYNCING ->
            SyncVisual(Icons.Rounded.Sync, c.tertiary, "Sincronizando…", "Enviando cambios")

        SyncKind.FINISHED ->
            SyncVisual(Icons.Rounded.DoneAll, c.primary, "Sincronizado", "Cambios enviados")

        SyncKind.UNKNOWN ->
            SyncVisual(Icons.Rounded.CloudQueue, c.onSurfaceVariant, "Conectando…", null)
    }
}

/** Icono con transición al cambiar de estado; gira mientras sincroniza. */
@Composable
private fun SyncGlyph(
    kind: SyncKind,
    icon: ImageVector,
    tint: Color,
    size: Dp,
    description: String?,
) {
    AnimatedContent(
        targetState = kind to icon,
        transitionSpec = {
            (fadeIn(tween(180, 60)) + scaleIn(tween(180, 60), initialScale = 0.8f)) togetherWith
                    fadeOut(tween(90))
        },
        label = "syncGlyph",
    ) { (k, ic) ->
        if (k == SyncKind.SYNCING) {
            val rotation by rememberInfiniteTransition(label = "syncSpin").animateFloat(
                initialValue = 0f,
                targetValue = 360f,
                animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing)),
                label = "syncRotation",
            )
            Icon(
                ic, description, tint = tint,
                modifier = Modifier.size(size).graphicsLayer { rotationZ = rotation },
            )
        } else {
            Icon(ic, description, tint = tint, modifier = Modifier.size(size))
        }
    }
}

/* ================================================================== */
/*  Chip: rail compacto y top bar                                      */
/* ================================================================== */

@Composable
fun SyncStatusChip(
    ui: SyncIndicatorUi,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
) {
    val colors = AppTheme.materialColors
    val visual = syncVisual(ui)
    val tint by animateColorAsState(visual.color, tween(250), label = "syncChipTint")

    val description = buildString {
        append(visual.title)
        if (ui.pending > 0) append(", ${ui.pending} pendientes")
    }

    BadgedBox(
        modifier = modifier,
        badge = {
            if (ui.pending > 0) {
                Badge(containerColor = tint, contentColor = colors.surface) {
                    Text(if (ui.pending > 99) "99+" else ui.pending.toString())
                }
            }
        },
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .background(tint.copy(alpha = 0.14f))
                .clickable(enabled = ui.clickable, role = Role.Button, onClick = onClick),
        ) {
            SyncGlyph(ui.kind, visual.icon, tint, size * 0.5f, description)
        }
    }
}

/* ================================================================== */
/*  Tarjeta: rail expandido                                            */
/* ================================================================== */

@Composable
fun SyncStatusCard(
    ui: SyncIndicatorUi,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    val visual = syncVisual(ui)
    val tint by animateColorAsState(visual.color, tween(250), label = "syncCardTint")

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surfaceContainerHighest)
            .clickable(enabled = ui.clickable, role = Role.Button, onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(32.dp).background(tint.copy(alpha = 0.14f), CircleShape),
        ) {
            SyncGlyph(ui.kind, visual.icon, tint, 18.dp, null)
        }

        Column(Modifier.weight(1f).animateContentSize()) {
            AnimatedContent(
                targetState = visual.title,
                transitionSpec = { fadeIn(tween(160, 40)) togetherWith fadeOut(tween(80)) },
                label = "syncTitle",
            ) { title ->
                Text(
                    title,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            visual.subtitle?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        AnimatedVisibility(
            visible = ui.pending > 0,
            enter = fadeIn() + scaleIn(initialScale = 0.6f),
            exit = fadeOut() + scaleOut(targetScale = 0.6f),
        ) {
            Text(
                text = if (ui.pending > 99) "99+" else ui.pending.toString(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = tint,
                maxLines = 1,
                modifier = Modifier
                    .background(tint.copy(alpha = 0.14f), CircleShape)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            )
        }
    }
}