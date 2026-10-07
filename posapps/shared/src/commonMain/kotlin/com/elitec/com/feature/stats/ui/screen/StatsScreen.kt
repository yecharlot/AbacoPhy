package com.elitec.com.feature.stats.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.unit.dp
import androidx.compose.animation.core.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.stats.ui.components.FiltersBar
import com.elitec.com.feature.stats.ui.components.KpiSection
import com.elitec.com.feature.stats.ui.components.RevenueCard
import com.elitec.com.feature.stats.ui.components.StockCard
import com.elitec.com.feature.stats.ui.components.TopProductsCard
import com.elitec.com.feature.stats.ui.components.UnitsCard
import com.elitec.com.feature.stats.ui.models.StatsEvent
import com.elitec.com.feature.stats.ui.models.StatsUiState
import com.elitec.com.feature.stats.ui.viewmodels.StatsViewModel
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import org.koin.compose.viewmodel.koinViewModel

private val Gap = 16.dp

@Composable
fun StatsRoute(
    modifier: Modifier = Modifier,
    viewModel: StatsViewModel = koinViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    StatsScreen(state, viewModel::onEvent, modifier)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen(state: StatsUiState, onEvent: (StatsEvent) -> Unit, modifier: Modifier = Modifier) {
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.error, state.hasData) {
        val msg = state.error
        if (msg != null && state.hasData) {
            val r = snackbar.showSnackbar(msg, actionLabel = "Reintentar", duration = SnackbarDuration.Short)
            onEvent(if (r == SnackbarResult.ActionPerformed) StatsEvent.Refresh else StatsEvent.DismissError)
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Estadísticas") },
                actions = {
                    val spin by rememberInfiniteTransition(label = "refresh").animateFloat(
                        0f, 360f, infiniteRepeatable(tween(900, easing = LinearEasing)), label = "spin",
                    )
                    IconButton(onClick = { onEvent(StatsEvent.Refresh) }, enabled = !state.isRefreshing) {
                        Icon(Icons.Rounded.Refresh, "Actualizar", Modifier.rotate(if (state.isRefreshing) spin else 0f))
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            val error = state.error
            if (error != null && !state.hasData) {
                ErrorState(error) { onEvent(StatsEvent.Refresh) }
            } else {
                StatsLayout(state, onEvent)
            }
        }
    }
}

@Composable
private fun StatsLayout(state: StatsUiState, onEvent: (StatsEvent) -> Unit) {
    val deviceConfig = rememberDeviceConfiguration()
    when (deviceConfig) {
        DeviceConfiguration.MOBILE_PORTRAIT -> MobilePortrait(state, onEvent)
        DeviceConfiguration.MOBILE_LANDSCAPE -> MobileLandscape(state, onEvent)
        DeviceConfiguration.TABLET_PORTRAIT -> TabletPortrait(state, onEvent)
        DeviceConfiguration.TABLET_LANDSCAPE -> TabletLandscape(state, onEvent)
        DeviceConfiguration.DESKTOP -> Desktop(state, onEvent)
    }
}

// ───────────── Layouts ─────────────

@Composable
private fun MobilePortrait(state: StatsUiState, onEvent: (StatsEvent) -> Unit) = Scrollable {
    FiltersBar(state, onEvent, wide = false)
    KpiSection(state, columns = 2)
    RevenueCard(state, chartHeight = 220.dp)
    TopProductsCard(state, chartHeight = 240.dp)
    UnitsCard(state, stacked = true, pieSize = 180.dp)
    StockCard(state)
}

@Composable
private fun MobileLandscape(state: StatsUiState, onEvent: (StatsEvent) -> Unit) = Scrollable {
    FiltersBar(state, onEvent, wide = true)
    KpiSection(state, columns = 4)
    EqualRow {
        RevenueCard(state, 180.dp, Modifier.weight(1f).fillMaxHeight())
        TopProductsCard(state, 180.dp, Modifier.weight(1f).fillMaxHeight())
    }
    EqualRow {
        UnitsCard(state, stacked = false, pieSize = 140.dp, modifier = Modifier.weight(1f).fillMaxHeight())
        StockCard(state, Modifier.weight(1f).fillMaxHeight())
    }
}

@Composable
private fun TabletPortrait(state: StatsUiState, onEvent: (StatsEvent) -> Unit) = Scrollable(
    padding = PaddingValues(24.dp),
) {
    FiltersBar(state, onEvent, wide = true)
    KpiSection(state, columns = 4)
    RevenueCard(state, chartHeight = 280.dp)
    EqualRow {
        TopProductsCard(state, 240.dp, Modifier.weight(1f).fillMaxHeight())
        UnitsCard(state, stacked = true, pieSize = 180.dp, modifier = Modifier.weight(1f).fillMaxHeight())
    }
    StockCard(state)
}

@Composable
private fun TabletLandscape(state: StatsUiState, onEvent: (StatsEvent) -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 16.dp)) {
        FiltersBar(state, onEvent, wide = true)
        Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Gap)) {
            Scrollable(Modifier.weight(2f), PaddingValues(top = Gap)) {
                KpiSection(state, columns = 4)
                RevenueCard(state, chartHeight = 300.dp)
                TopProductsCard(state, chartHeight = 260.dp)
            }
            Scrollable(Modifier.weight(1f), PaddingValues(top = Gap)) {
                UnitsCard(state, stacked = true, pieSize = 190.dp)
                StockCard(state)
            }
        }
    }
}

@Composable
private fun Desktop(state: StatsUiState, onEvent: (StatsEvent) -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Scrollable(Modifier.widthIn(max = 1400.dp), PaddingValues(32.dp)) {
            FiltersBar(state, onEvent, wide = true)
            KpiSection(state, columns = 4)
            EqualRow {
                RevenueCard(state, 320.dp, Modifier.weight(2f).fillMaxHeight())
                UnitsCard(state, stacked = true, pieSize = 200.dp, modifier = Modifier.weight(1f).fillMaxHeight())
            }
            EqualRow {
                TopProductsCard(state, 280.dp, Modifier.weight(1f).fillMaxHeight())
                StockCard(state, Modifier.weight(1f).fillMaxHeight())
            }
        }
    }
}

// ───────────── Helpers ─────────────

@Composable
private fun Scrollable(
    modifier: Modifier = Modifier,
    padding: PaddingValues = PaddingValues(Gap),
    content: @Composable ColumnScope.() -> Unit,
) = Column(
    modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding),
    verticalArrangement = Arrangement.spacedBy(Gap),
    content = content,
)

@Composable
private fun EqualRow(content: @Composable RowScope.() -> Unit) = Row(
    Modifier.fillMaxWidth().height(IntrinsicSize.Min),
    horizontalArrangement = Arrangement.spacedBy(Gap),
    content = content,
)

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Rounded.WarningAmber, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
        Text(message, style = MaterialTheme.typography.bodyLarge)
        Button(onClick = onRetry) { Text("Reintentar") }
    }
}