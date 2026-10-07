package com.elitec.com.feature.warehouse.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material.icons.rounded.Sell
import androidx.compose.material.icons.rounded.Store
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.pos.ui.components.AssignedUnitUiState
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.elitec.com.feature.pos.ui.models.PosStockLoadState
import com.elitec.com.feature.pos.ui.models.PosStockSummary
import com.elitec.com.feature.pos.ui.models.PosStockUiState
import com.elitec.com.feature.pos.ui.models.StockItemUi
import com.elitec.com.feature.warehouse.ui.viewmodels.PosStockViewModel
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.koin.compose.viewmodel.koinViewModel
import kotlin.math.roundToLong

@OptIn(ExperimentalCoroutinesApi::class)
@Composable
fun PosStockScreen(
    assignedUnit: AssignedUnitUiState,
    modifier: Modifier = Modifier,
    viewModel: PosStockViewModel = koinViewModel(),
) {
    val ui by viewModel.uiState.collectAsStateWithLifecycle()
    val deviceConfig = rememberDeviceConfiguration()

    val ready = assignedUnit as? AssignedUnitUiState.Ready
    LaunchedEffect(ready?.unitId) { viewModel.setUnit(ready?.unitId) }

    // Tamaño mínimo de tarjeta -> el grid calcula las columnas según el ancho real
    val gridMinSize = when (deviceConfig) {
        DeviceConfiguration.MOBILE_PORTRAIT -> 280.dp
        DeviceConfiguration.MOBILE_LANDSCAPE -> 240.dp
        DeviceConfiguration.TABLET_PORTRAIT -> 250.dp
        DeviceConfiguration.TABLET_LANDSCAPE -> 270.dp
        DeviceConfiguration.DESKTOP -> 300.dp
    }
    val spacing = when (deviceConfig) {
        DeviceConfiguration.MOBILE_PORTRAIT,
        DeviceConfiguration.MOBILE_LANDSCAPE -> 8.dp
        else -> 12.dp
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        StockHeader(
            unitName = ready?.unitName,
            refreshing = ready != null && ui.isRefreshing,
            canRefresh = ready != null,
            onRefresh = viewModel::refresh,
        )

        when (assignedUnit) {
            AssignedUnitUiState.Idle,
            AssignedUnitUiState.Loading -> StockSkeletonGrid(
                minSize = gridMinSize,
                spacing = spacing,
                modifier = Modifier.weight(1f),
            )

            AssignedUnitUiState.None -> StatePanel(
                icon = Icons.Rounded.Store,
                title = "Sin punto de venta asignado",
                message = "Un administrador debe asociar un punto de venta a tu usuario.",
                tint = AppTheme.materialColors.error,
                modifier = Modifier.weight(1f),
            )

            is AssignedUnitUiState.Error -> StatePanel(
                icon = Icons.Rounded.CloudOff,
                title = "No se pudo obtener tu punto de venta",
                message = assignedUnit.message,
                tint = AppTheme.materialColors.error,
                modifier = Modifier.weight(1f),
            )

            is AssignedUnitUiState.Ready -> ReadyBody(
                ui = ui,
                gridMinSize = gridMinSize,
                spacing = spacing,
                onQueryChange = viewModel::onQueryChange,
                onRefresh = viewModel::refresh,
                onRetry = viewModel::retry,
                onDismissError = viewModel::dismissRefreshError,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

/* ================================================================== */
/*  Cuerpo cuando el PDV está listo                                    */
/* ================================================================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReadyBody(
    ui: PosStockUiState,
    gridMinSize: Dp,
    spacing: Dp,
    onQueryChange: (String) -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val load = ui.load

    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        RefreshErrorBanner(
            error = ui.refreshError,
            onRetry = onRefresh,
            onDismiss = onDismissError,
        )

        // Leyenda de colores + búsqueda solo cuando hay stock que mostrar
        if (load is PosStockLoadState.Ready && load.totalCount > 0) {
            StockSummaryRow(load.summary)
            StockSearchField(query = ui.query, onQueryChange = onQueryChange)
        }

        PullToRefreshBox(
            isRefreshing = ui.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
        ) {
            AnimatedContent(
                targetState = load,
                // Solo anima al cambiar de TIPO de estado, no en cada actualización de datos
                contentKey = {
                    when (it) {
                        PosStockLoadState.Loading -> 0
                        is PosStockLoadState.Error -> 1
                        is PosStockLoadState.Ready -> 2
                    }
                },
                transitionSpec = { fadeIn(tween(250)) togetherWith fadeOut(tween(150)) },
                label = "stockLoadState",
            ) { state ->
                when (state) {
                    PosStockLoadState.Loading -> StockSkeletonGrid(gridMinSize, spacing)

                    is PosStockLoadState.Error -> StatePanel(
                        icon = Icons.Rounded.CloudOff,
                        title = "No se pudo cargar el stock",
                        message = state.message,
                        actionLabel = "Reintentar",
                        onAction = onRetry,
                        tint = AppTheme.materialColors.error,
                    )

                    is PosStockLoadState.Ready -> when {
                        state.totalCount == 0 -> StatePanel(
                            icon = Icons.Rounded.Inventory2,
                            title = "Sin stock registrado",
                            message = "Este punto de venta aún no tiene productos en inventario.",
                            actionLabel = "Actualizar",
                            onAction = onRefresh,
                        )

                        state.items.isEmpty() -> StatePanel(
                            icon = Icons.Rounded.SearchOff,
                            title = "Sin coincidencias",
                            message = "No hay productos que coincidan con «${ui.query.trim()}».",
                        )

                        else -> StockGrid(state.items, gridMinSize, spacing)
                    }
                }
            }
        }
    }
}

/* ================================================================== */
/*  Cabecera, leyenda y búsqueda                                       */
/* ================================================================== */

@Composable
private fun StockHeader(
    unitName: String?,
    refreshing: Boolean,
    canRefresh: Boolean,
    onRefresh: () -> Unit,
) {
    val colors = AppTheme.materialColors

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(44.dp)
                .background(colors.primary.copy(alpha = 0.14f), RoundedCornerShape(14.dp)),
        ) {
            Icon(Icons.Rounded.Inventory2, null, tint = colors.primary, modifier = Modifier.size(24.dp))
        }

        Column(Modifier.weight(1f)) {
            Text(
                "Stock del punto de venta",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = colors.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (unitName != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(Icons.Rounded.Store, null, tint = colors.onSurfaceVariant, modifier = Modifier.size(14.dp))
                    Text(
                        unitName,
                        style = MaterialTheme.typography.labelMedium,
                        color = colors.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(colors.primary.copy(alpha = if (canRefresh) 0.12f else 0.05f))
                .clickable(enabled = canRefresh && !refreshing, onClick = onRefresh),
        ) {
            RefreshIcon(spinning = refreshing, tint = colors.primary.copy(alpha = if (canRefresh) 1f else 0.4f))
        }
    }
}

@Composable
private fun RefreshIcon(spinning: Boolean, tint: Color) {
    if (spinning) {
        // La animación infinita solo existe mientras se actualiza
        val transition = rememberInfiniteTransition(label = "refreshSpin")
        val angle by transition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(tween(900, easing = LinearEasing)),
            label = "refreshAngle",
        )
        Icon(Icons.Rounded.Refresh, "Actualizando", tint = tint, modifier = Modifier.size(22.dp).rotate(angle))
    } else {
        Icon(Icons.Rounded.Refresh, "Actualizar stock", tint = tint, modifier = Modifier.size(22.dp))
    }
}

/** Leyenda de colores con conteos. No filtra: solo explica qué significa cada color. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StockSummaryRow(summary: PosStockSummary) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SummaryChip("Total", summary.total, Icons.Rounded.Inventory2, AppTheme.materialColors.onSurfaceVariant)
        SummaryChip("Disponibles", summary.ok, StockStates.OK.icon(), StockStates.OK.accent())
        SummaryChip("Stock bajo", summary.low, StockStates.LOW.icon(), StockStates.LOW.accent())
        SummaryChip("Agotados", summary.out, StockStates.OUT.icon(), StockStates.OUT.accent())
    }
}

@Composable
private fun SummaryChip(label: String, count: Int, icon: ImageVector, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.14f), CircleShape)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        AnimatedContent(
            targetState = count,
            transitionSpec = {
                (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut())
            },
            label = "summaryCount",
        ) { n ->
            Text(
                n.toString(),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.ExtraBold,
                color = color,
            )
        }
        Spacer(Modifier.width(4.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = color,
            maxLines = 1,
        )
    }
}

@Composable
private fun StockSearchField(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        leadingIcon = { Icon(Icons.Rounded.Search, null) },
        trailingIcon = {
            AnimatedVisibility(visible = query.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .clickable { onQueryChange("") },
                ) {
                    Icon(Icons.Rounded.Close, "Limpiar búsqueda", Modifier.size(20.dp))
                }
            }
        },
        placeholder = {
            Text("Buscar producto, código o categoría", maxLines = 1, overflow = TextOverflow.Ellipsis)
        },
    )
}

@Composable
private fun RefreshErrorBanner(error: String?, onRetry: () -> Unit, onDismiss: () -> Unit) {
    val colors = AppTheme.materialColors

    AnimatedVisibility(
        visible = error != null,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.errorContainer, RoundedCornerShape(14.dp))
                .padding(start = 12.dp, top = 4.dp, bottom = 4.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Icons.Rounded.Error, null, tint = colors.onErrorContainer, modifier = Modifier.size(18.dp))
            Text(
                text = "No se pudo actualizar. Mostrando datos guardados." +
                        error?.let { " ($it)" }.orEmpty(),
                style = MaterialTheme.typography.bodySmall,
                color = colors.onErrorContainer,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onRetry) { Text("Reintentar", color = colors.onErrorContainer) }
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onDismiss),
            ) {
                Icon(Icons.Rounded.Close, "Cerrar", tint = colors.onErrorContainer, modifier = Modifier.size(18.dp))
            }
        }
    }
}

/* ================================================================== */
/*  Grid y tarjeta de producto                                         */
/* ================================================================== */

@Composable
private fun StockGrid(items: List<StockItemUi>, minSize: Dp, spacing: Dp) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize),
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(spacing),
        horizontalArrangement = Arrangement.spacedBy(spacing),
        contentPadding = PaddingValues(bottom = 16.dp),
    ) {
        items(items, key = { it.productId }) { item ->
            StockItemCard(item, Modifier.animateItem())
        }
    }
}

/**
 * Una sola lista para todos los productos. El estado se comunica con COLOR
 * (franja lateral, borde, degradado, cantidad y píldora), sin agrupar.
 */
@Composable
private fun StockItemCard(item: StockItemUi, modifier: Modifier = Modifier) {
    val colors = AppTheme.materialColors
    val accent = item.state.accent()

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = colors.surfaceContainer,
        tonalElevation = 1.dp,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.35f)),
    ) {
        Box(
            modifier = Modifier.background(
                Brush.horizontalGradient(
                    colors = listOf(accent.copy(alpha = 0.14f), Color.Transparent),
                    endX = 500f,
                )
            )
        ) {
            Row(Modifier.height(IntrinsicSize.Min)) {
                // Franja de color del estado
                Box(
                    Modifier
                        .width(5.dp)
                        .fillMaxHeight()
                        .background(accent)
                )

                Row(
                    modifier = Modifier
                        .weight(1f)
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            item.name,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.onSurface,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            listOf(item.category, item.code).filter { it.isNotBlank() }.joinToString(" · "),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            StatePill(item.state)
                            if (item.unitPrice > 0.0) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                                ) {
                                    Icon(Icons.Rounded.Sell, null, tint = colors.onSurfaceVariant, modifier = Modifier.size(12.dp))
                                    Text(
                                        formatMoney(item.unitPrice),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = colors.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                            }
                        }
                    }

                    // Cantidad destacada (anima al cambiar)
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        AnimatedContent(
                            targetState = item.qty,
                            transitionSpec = {
                                if (targetState >= initialState) {
                                    (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut())
                                } else {
                                    (slideInVertically { -it } + fadeIn()) togetherWith (slideOutVertically { it } + fadeOut())
                                }
                            },
                            label = "stockQty",
                        ) { qty ->
                            Text(
                                formatQty(qty),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = accent,
                                maxLines = 1,
                            )
                        }
                        if (item.unit.isNotBlank()) {
                            Text(
                                item.unit,
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatePill(state: StockStates) {
    val color = state.accent()
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.16f), CircleShape)
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Icon(state.icon(), null, tint = color, modifier = Modifier.size(12.dp))
        Spacer(Modifier.width(4.dp))
        Text(
            state.label(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = color,
            maxLines = 1,
        )
    }
}

/* ================================================================== */
/*  Estados visuales: esqueleto y paneles                              */
/* ================================================================== */

@Composable
private fun StockSkeletonGrid(minSize: Dp, spacing: Dp, modifier: Modifier = Modifier) {
    val pulse by rememberPulse()

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize),
        modifier = modifier.fillMaxSize(),
        userScrollEnabled = false,
        verticalArrangement = Arrangement.spacedBy(spacing),
        horizontalArrangement = Arrangement.spacedBy(spacing),
    ) {
        items(count = 8) { SkeletonCard(alpha = pulse) }
    }
}

@Composable
private fun SkeletonCard(alpha: Float) {
    val colors = AppTheme.materialColors
    val bar = colors.surfaceContainerHighest

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = colors.surfaceContainer,
        modifier = Modifier.alpha(alpha),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.fillMaxWidth(0.75f).height(14.dp).background(bar, CircleShape))
                Box(Modifier.fillMaxWidth(0.5f).height(10.dp).background(bar, CircleShape))
                Box(Modifier.width(80.dp).height(18.dp).background(bar, CircleShape))
            }
            Box(Modifier.size(width = 44.dp, height = 32.dp).background(bar, RoundedCornerShape(10.dp)))
        }
    }
}

@Composable
private fun rememberPulse(): State<Float> =
    rememberInfiniteTransition(label = "skeleton").animateFloat(
        initialValue = 0.35f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
        label = "skeletonAlpha",
    )

/** Panel centrado para errores, vacíos y casos sin datos. */
@Composable
private fun StatePanel(
    icon: ImageVector,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    tint: Color = AppTheme.materialColors.onSurfaceVariant,
) {
    val colors = AppTheme.materialColors

    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(72.dp)
                    .background(tint.copy(alpha = 0.12f), CircleShape),
            ) {
                Icon(icon, null, tint = tint, modifier = Modifier.size(34.dp))
            }
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurface,
                textAlign = TextAlign.Center,
            )
            Text(
                message,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            if (actionLabel != null && onAction != null) {
                Spacer(Modifier.height(4.dp))
                Button(onClick = onAction, shape = RoundedCornerShape(14.dp)) {
                    Icon(Icons.Rounded.Refresh, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(actionLabel)
                }
            }
        }
    }
}

/* ================================================================== */
/*  Color / icono / texto por estado y formato                         */
/* ================================================================== */

@Composable
private fun StockStates.accent(): Color = when (this) {
    StockStates.OUT -> AppTheme.materialColors.error
    StockStates.LOW -> AppTheme.materialColors.tertiary
    StockStates.OK -> AppTheme.materialColors.primary
}

private fun StockStates.icon(): ImageVector = when (this) {
    StockStates.OUT -> Icons.Rounded.Error
    StockStates.LOW -> Icons.Rounded.Warning
    StockStates.OK -> Icons.Rounded.CheckCircle
}

private fun StockStates.label(): String = when (this) {
    StockStates.OUT -> "Agotado"
    StockStates.LOW -> "Stock bajo"
    StockStates.OK -> "Disponible"
}

/** 12.0 -> "12"; 2.5 -> "2.5" */
private fun formatQty(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()

/** 1234567.5 -> "$1,234,567.50" (sin java.text: compatible con commonMain). */
private fun formatMoney(value: Double): String {
    val cents = (value * 100).roundToLong()
    val whole = cents / 100
    val decimals = (cents % 100).toString().padStart(2, '0')
    val grouped = whole.toString().reversed().chunked(3).joinToString(",").reversed()
    return "$$grouped.$decimals"
}