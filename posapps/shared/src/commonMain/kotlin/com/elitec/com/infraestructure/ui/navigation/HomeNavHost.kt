package com.elitec.com.infraestructure.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backpack
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warehouse
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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
import com.elitec.com.infraestructure.ui.components.NavRail
import com.elitec.com.infraestructure.ui.screen.MainScreen
import com.elitec.com.infraestructure.ui.uiModels.NavButton
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
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

@Composable
fun HomeNavHost(
    sessionState: Session,
    onLogout: () -> Unit
) {
    val backStack = rememberNavBackStack(config,InternalRoute.Home)

    fun resetRoot(destination: InternalRoute) {
        while (backStack.isNotEmpty()) {
            backStack.removeLastOrNull()
        }
        backStack.navigateTo(destination)
    }

    val deviceConfig = rememberDeviceConfiguration()

    val navigationButtons = listOf(
        NavButton("Principal", Icons.Default.Dashboard, { backStack.navigateTo(InternalRoute.Home)  }, true, "Página principal",false),
        NavButton("Catálogo", Icons.Default.Backpack, { backStack.navigateTo(InternalRoute.Catalog) }, true, "Catalogo de productos",false),
        NavButton("Stock", Icons.Default.Warehouse, { backStack.navigateTo(InternalRoute.Stock) }, true, "Stock de productos en punto de venta",false),
        NavButton("Estadística", Icons.Default.BarChart, { backStack.navigateTo(InternalRoute.Statistics) }, true, "Estadísticas personales",false),
        NavButton("Configuración", Icons.Default.Settings, { backStack.navigateTo(InternalRoute.Config) }, true, "Configuración de la aplicación",false)
    )

    when (deviceConfig) {
        DeviceConfiguration.MOBILE_PORTRAIT -> { Text("Mobile portrait") }
        DeviceConfiguration.MOBILE_LANDSCAPE -> { Text("Mobile landscape") }
        DeviceConfiguration.TABLET_PORTRAIT -> { Text("Tablet portrait") }
        DeviceConfiguration.TABLET_LANDSCAPE, DeviceConfiguration.DESKTOP -> {
            // Contenido siempre ocupa weight; solo anima opacity (no quitar del layout).
            var contentReady by remember { mutableStateOf(false) }
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize().padding(
                    AppTheme.dimensions.cardSpacing
                )
            ) {
                NavRail(
                    navButtonsList = navigationButtons,
                    onLogout = onLogout,
                    sessionName = sessionState.user.displayName,
                    onEntranceComplete = { contentReady = true },
                )
                Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                    this@Row.AnimatedVisibility(
                        visible = contentReady,
                        enter = fadeIn(animationSpec = tween(200)),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        HomeContent(
                            session = sessionState,
                            modifier = Modifier.fillMaxSize(),
                            backstack = backStack,
                            onBack = {
                                backStack.navigateBack()
                            }
                        )
                    }
                }
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
            entry<InternalRoute.Config> {
                Text("CONFIG")
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
        }
    )
}