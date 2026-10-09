package com.elitec.com.infraestructure.ui.navigation

import com.elitec.com.feature.settings.ui.screens.SettingsScreen

import abacopos.shared.generated.resources.Res
import abacopos.shared.generated.resources.abacus_color_icon
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Backpack
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation3.runtime.NavBackStack
import androidx.navigation3.runtime.NavKey
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import androidx.savedstate.serialization.SavedStateConfiguration
import com.elitec.com.feature.catalog.ui.screens.CatalogScreen
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.elitec.com.feature.stats.ui.screen.StatsRoute
import com.elitec.com.feature.warehouse.ui.screens.PosStockScreen
import com.elitec.com.infraestructure.ui.components.AppNavRail
import com.elitec.com.infraestructure.ui.screen.MainScreen
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import com.slapps.cupertino.adaptive.AdaptiveTopAppBar
import com.slapps.cupertino.adaptive.ExperimentalAdaptiveApi
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.viewmodel.koinViewModel

private val config = SavedStateConfiguration {
    serializersModule = SerializersModule {
        polymorphic(NavKey::class) {
            subclass(InternalRoute.Home::class, InternalRoute.Home.serializer())
            subclass(InternalRoute.Stock::class, InternalRoute.Stock.serializer())
            subclass(InternalRoute.Catalog::class, InternalRoute.Catalog.serializer())
            subclass(InternalRoute.Config::class, InternalRoute.Config.serializer())
            subclass(InternalRoute.Statistics::class, InternalRoute.Statistics.serializer())
        }
    }
}

enum class NavMode { BOTTOM_BAR, RAIL_COMPACT, RAIL_EXPANDED }

private fun navModeFor(width: Dp, height: Dp): NavMode = when {
    height < 480.dp -> NavMode.RAIL_COMPACT
    width < 600.dp -> NavMode.BOTTOM_BAR
    width < 1000.dp -> NavMode.RAIL_COMPACT
    else -> NavMode.RAIL_EXPANDED
}

@Immutable
data class NavDestinationUi(
    val route: InternalRoute,
    val label: String,
    /** Etiqueta corta para rail compacto y barra inferior. */
    val shortLabel: String,
    val icon: ImageVector,
    val description: String,
)

private val destinations = listOf(
    NavDestinationUi(InternalRoute.Home, "Principal", "Inicio", Icons.Default.Dashboard, "Página principal"),
    NavDestinationUi(InternalRoute.Catalog, "Catálogo", "Catálogo", Icons.Default.Backpack, "Catálogo de productos"),
    NavDestinationUi(InternalRoute.Stock, "Stock", "Stock", Icons.Default.Warehouse, "Stock de productos en punto de venta"),
    NavDestinationUi(InternalRoute.Statistics, "Estadística", "Estadística", Icons.Default.BarChart, "Estadísticas personales"),
    NavDestinationUi(InternalRoute.Config, "Ajustes", "Ajustes", Icons.Default.Settings, "Tema y servidor"),
)

/**
 * Navegación de nivel superior: pila plana [Home, destino].
 * Atrás desde cualquier sección lleva a Home; tocar la activa no apila duplicados.
 */
fun NavBackStack<NavKey>.navigateTopLevel(dest: InternalRoute) {
    if (lastOrNull() == dest) return
    while (size > 1) removeLastOrNull()
    if (dest != InternalRoute.Home) add(dest)
}


@Composable
fun HomeNavHost(
    sessionState: Session,
    onLogout: () -> Unit,
) {
    val backStack = rememberNavBackStack(config, InternalRoute.Home)

    // La selección sale de la pila real: siempre coincide con lo que se ve.
    val current = backStack.lastOrNull()
    val currentLabel = destinations.firstOrNull { it.route == current }?.label ?: "Ábaco POS"

    var confirmLogout by rememberSaveable { mutableStateOf(false) }
    var userCollapsed by rememberSaveable { mutableStateOf(false) }

    val navigate: (InternalRoute) -> Unit = { backStack.navigateTopLevel(it) }

    val content: @Composable (Modifier) -> Unit = { m ->
        HomeContent(
            session = sessionState,
            modifier = m,
            backstack = backStack,
            onBack = { backStack.navigateBack() },
        )
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val mode = navModeFor(maxWidth, maxHeight)

        when (mode) {
            NavMode.BOTTOM_BAR -> Scaffold(
                modifier = Modifier.fillMaxSize(),
                topBar = {
                    CompactTopBar(
                        title = currentLabel,
                        userName = sessionState.user.displayName,
                        onLogoutClick = { confirmLogout = true },
                    )
                },
                bottomBar = {
                    NavigationBar {
                        destinations.forEach { d ->
                            NavigationBarItem(
                                selected = d.route == current,
                                onClick = { navigate(d.route) },
                                icon = { Icon(d.icon, contentDescription = d.description) },
                                label = { Text(d.shortLabel, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                alwaysShowLabel = true,
                            )
                        }
                    }
                },
            ) { padding ->
                content(
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 12.dp),
                )
            }

            NavMode.RAIL_COMPACT, NavMode.RAIL_EXPANDED -> {
                val dense = maxHeight < 480.dp // móvil landscape
                val expanded = mode == NavMode.RAIL_EXPANDED && !userCollapsed
                val gap = if (dense) 8.dp else 12.dp

                Row(
                    horizontalArrangement = Arrangement.spacedBy(gap),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(if (dense) 8.dp else AppTheme.dimensions.cardSpacing),
                ) {
                    AppNavRail(
                        destinations = destinations,
                        selected = current,
                        expanded = expanded,
                        dense = dense,
                        userName = sessionState.user.displayName,
                        onNavigate = navigate,
                        onLogoutClick = { confirmLogout = true },
                        onToggleExpanded = if (mode == NavMode.RAIL_EXPANDED) {
                            { userCollapsed = !userCollapsed }
                        } else null,
                    )
                    content(Modifier.weight(1f).fillMaxHeight())
                }
            }
        }
    }

    // Acción destructiva: se confirma siempre.
    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null) },
            title = { Text("Cerrar sesión") },
            text = { Text("¿Seguro que quieres salir de Ábaco POS?") },
            confirmButton = {
                TextButton(onClick = { confirmLogout = false; onLogout() }) { Text("Cerrar sesión") }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) { Text("Cancelar") }
            },
        )
    }
}


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

@OptIn(ExperimentalCoroutinesApi::class)
@Composable
fun HomeContent(
    session: Session,
    onBack: () -> Unit,
    backstack: NavBackStack<NavKey>,
    modifier: Modifier = Modifier
) {
    val salesVm: SalesViewModel = koinViewModel()

    val assignedUnit by salesVm.assignedUnit.collectAsStateWithLifecycle()

    NavDisplay(
        modifier = modifier.fillMaxSize(),
        backStack = backstack,
        onBack  = onBack,
        transitionSpec = {
            slideInVertically (
                initialOffsetY = { it },
                animationSpec = tween(250)
            ) + fadeIn() togetherWith slideOutVertically (
                targetOffsetY = { -it },
                animationSpec = tween(250)
            ) + fadeOut()
        },
        popTransitionSpec = {
            slideInHorizontally(
                initialOffsetX = { -it },
                animationSpec = tween(250)
            ) togetherWith slideOutHorizontally(
                targetOffsetX = { it },
                animationSpec = tween(250)
            )
        },
        predictivePopTransitionSpec = {
            slideInHorizontally(
                initialOffsetX = { -it },
                animationSpec = tween(250)
            ) togetherWith slideOutHorizontally(
                targetOffsetX = { it },
                animationSpec = tween(250)
            )
        },
        entryProvider = entryProvider {
            entry<InternalRoute.Home> {
                MainScreen(
                    session = session,
                    modifier = Modifier.fillMaxSize()
                )
            }
            entry<InternalRoute.Stock> {
                PosStockScreen(
                    assignedUnit = assignedUnit,
                    modifier = Modifier.fillMaxSize()
                )
            }
            entry<InternalRoute.Statistics> {
                StatsRoute(
                    modifier = Modifier.fillMaxSize()
                )
            }
            entry<InternalRoute.Catalog> {
                CatalogScreen(
                    modifier = Modifier.fillMaxSize()
                )
            }

            entry<InternalRoute.Config> {
                SettingsScreen()
            }
        }
    )
}