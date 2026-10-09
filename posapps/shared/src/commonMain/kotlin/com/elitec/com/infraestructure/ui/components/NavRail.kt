package com.elitec.com.infraestructure.ui.components

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.NavKey
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
    onNavigate: (InternalRoute) -> Unit,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier,
    /** null = sin botón de contraer/expandir. */
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