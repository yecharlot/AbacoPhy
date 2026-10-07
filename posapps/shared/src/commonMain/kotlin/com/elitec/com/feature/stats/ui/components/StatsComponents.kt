package com.elitec.com.feature.stats.ui.components

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseInOutCubic
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AttachMoney
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SegmentedButtonDefaults.Icon
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.stats.ui.models.StatsEvent
import com.elitec.com.feature.stats.ui.models.StatsPeriod
import com.elitec.com.feature.stats.ui.models.StatsUiState
import ir.ehsannarmani.compose_charts.LineChart
import ir.ehsannarmani.compose_charts.PieChart
import ir.ehsannarmani.compose_charts.RowChart
import ir.ehsannarmani.compose_charts.models.AnimationMode
import ir.ehsannarmani.compose_charts.models.BarProperties
import ir.ehsannarmani.compose_charts.models.Bars
import ir.ehsannarmani.compose_charts.models.DotProperties
import ir.ehsannarmani.compose_charts.models.DrawStyle
import ir.ehsannarmani.compose_charts.models.GridProperties
import ir.ehsannarmani.compose_charts.models.HorizontalIndicatorProperties
import ir.ehsannarmani.compose_charts.models.LabelHelperProperties
import ir.ehsannarmani.compose_charts.models.LabelProperties
import ir.ehsannarmani.compose_charts.models.Line
import ir.ehsannarmani.compose_charts.models.Pie
import ir.ehsannarmani.compose_charts.models.VerticalIndicatorProperties
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.roundToLong


// ───────────── Formato (sin String.format, apto commonMain) ─────────────
fun formatMoney(v: Double): String {
    val cents = (v * 100).roundToLong()
    val whole = (cents / 100).toString().reversed().chunked(3).joinToString(",").reversed()
    return "$$whole.${(abs(cents) % 100).toString().padStart(2, '0')}"
}

fun compact(v: Double): String = when {
    v >= 1_000_000 -> "${(v / 100_000).roundToInt() / 10.0}M"
    v >= 1_000 -> "${(v / 100).roundToInt() / 10.0}k"
    else -> v.roundToInt().toString()
}

@Composable
private fun chartPalette(): List<Color> = with(MaterialTheme.colorScheme) {
    listOf(primary, secondary, tertiary, primary.copy(.6f), secondary.copy(.6f), tertiary.copy(.6f))
}

// ───────────── Shimmer de carga ─────────────
@Composable
fun Modifier.shimmer(): Modifier {
    val x by rememberInfiniteTransition(label = "shimmer").animateFloat(
        initialValue = 0f, targetValue = 1200f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing)),
        label = "shimmerX",
    )
    val base = MaterialTheme.colorScheme.surfaceVariant
    val light = MaterialTheme.colorScheme.surface
    return background(
        Brush.linearGradient(listOf(base, light, base), start = Offset(x - 400f, 0f), end = Offset(x, 400f)),
        RoundedCornerShape(12.dp),
    )
}

// ───────────── Filtros ─────────────
@Composable
fun FiltersBar(state: StatsUiState, onEvent: (StatsEvent) -> Unit, wide: Boolean, modifier: Modifier = Modifier) {
    val periods = StatsPeriod.entries
    val segmented: @Composable (Modifier) -> Unit = { m ->
        SingleChoiceSegmentedButtonRow(m) {
            periods.forEachIndexed { i, p ->
                SegmentedButton(
                    selected = p == state.period,
                    onClick = { onEvent(StatsEvent.PeriodChanged(p)) },
                    shape = SegmentedButtonDefaults.itemShape(i, periods.size),
                    label = { Text(p.label) },
                )
            }
        }
    }
    val chips: @Composable (Modifier) -> Unit = { m ->
        LazyRow(m, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.unitOptions, key = { it.id ?: "all" }) { u ->
                val selected = u.id == state.selectedUnitId
                FilterChip(
                    selected = selected,
                    onClick = { onEvent(StatsEvent.UnitChanged(u.id)) },
                    label = { Text(u.name) },
                    leadingIcon = if (selected) {
                        { Icon(Icons.Rounded.Check, null, Modifier.size(FilterChipDefaults.IconSize)) }
                    } else null,
                )
            }
        }
    }
    if (wide) {
        Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            segmented(Modifier.widthIn(max = 360.dp).weight(1f, fill = false))
            chips(Modifier.weight(1f))
        }
    } else {
        Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            segmented(Modifier.fillMaxWidth())
            chips(Modifier.fillMaxWidth())
        }
    }
}

// ───────────── KPIs ─────────────
private data class KpiItem(
    val title: String, val icon: ImageVector, val value: Double,
    val format: (Double) -> String, val delta: Double? = null,
)

@Composable
fun KpiSection(state: StatsUiState, columns: Int, modifier: Modifier = Modifier) {
    val k = state.kpis
    val items = listOf(
        KpiItem("Ingresos", Icons.Rounded.AttachMoney, k.revenue, ::formatMoney, k.revenueDeltaPct),
        KpiItem("Ventas", Icons.Rounded.ReceiptLong, k.salesCount.toDouble(), { it.roundToInt().toString() }),
        KpiItem("Ticket medio", Icons.Rounded.ShoppingCart, k.avgTicket, ::formatMoney),
        KpiItem("Unidades", Icons.Rounded.Inventory2, k.itemsSold, { it.roundToInt().toString() }),
    )
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.chunked(columns).forEach { rowItems ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                rowItems.forEach {
                    KpiCard(it, state.isLoading, Modifier.weight(1f).fillMaxHeight())
                }
            }
        }
    }
}

@Composable
private fun KpiCard(item: KpiItem, loading: Boolean, modifier: Modifier = Modifier) {
    ElevatedCard(modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(item.icon, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
                Text(item.title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (loading) {
                Box(Modifier.fillMaxWidth(.6f).height(28.dp).shimmer())
                Box(Modifier.fillMaxWidth(.4f).height(14.dp).shimmer())
            } else {
                AnimatedNumber(item.value, item.format)
                item.delta?.let { DeltaText(it) } ?: Text(
                    "en el periodo", style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun AnimatedNumber(value: Double, format: (Double) -> String) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(value) {
        progress.snapTo(0f)
        progress.animateTo(1f, tween(900, easing = FastOutSlowInEasing))
    }
    Text(
        format(value * progress.value),
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold, maxLines = 1,
    )
}

@Composable
private fun DeltaText(pct: Double) {
    val up = pct >= 0
    Text(
        "${if (up) "▲" else "▼"} ${abs(pct).roundToInt()}% vs. previo",
        style = MaterialTheme.typography.labelMedium,
        color = if (up) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error,
    )
}

// ───────────── Card genérica con skeleton / vacío / contenido ─────────────
@Composable
private fun StatsCard(
    title: String, loading: Boolean, isEmpty: Boolean, skeletonHeight: Dp,
    modifier: Modifier = Modifier, emptyText: String = "Sin datos en este periodo",
    content: @Composable () -> Unit,
) {
    ElevatedCard(modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Crossfade(
                targetState = if (loading) 0 else if (isEmpty) 1 else 2,
                label = "card-$title",
            ) { s ->
                when (s) {
                    0 -> Box(Modifier.fillMaxWidth().height(skeletonHeight).shimmer())
                    1 -> Box(Modifier.fillMaxWidth().heightIn(min = 96.dp), contentAlignment = Alignment.Center) {
                        Text(emptyText, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    else -> content()
                }
            }
        }
    }
}

// ───────────── Ingresos en el tiempo ─────────────
@Composable
fun RevenueCard(state: StatsUiState, chartHeight: Dp, modifier: Modifier = Modifier) {
    StatsCard("Ingresos", state.isLoading, state.kpis.salesCount == 0, chartHeight, modifier) {
        val primary = MaterialTheme.colorScheme.primary
        val surface = MaterialTheme.colorScheme.surface
        val grid = MaterialTheme.colorScheme.outlineVariant
        val labelStyle = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
        val points = state.revenueByDay
        val step = ((points.size + 5) / 6).coerceAtLeast(1)
        val labels = remember(points) { points.mapIndexed { i, p -> if (i % step == 0) p.label else "" } }
        val data = remember(points, primary) {
            listOf(
                Line(
                    label = "Ingresos",
                    values = points.map { it.value },
                    color = SolidColor(primary),
                    firstGradientFillColor = primary.copy(alpha = .35f),
                    secondGradientFillColor = Color.Transparent,
                    strokeAnimationSpec = tween(1400, easing = EaseInOutCubic),
                    gradientAnimationSpec = tween(1400),
                    gradientAnimationDelay = 400,
                    drawStyle = DrawStyle.Stroke(width = 3.dp),
                    curvedEdges = true,
                    dotProperties = DotProperties(
                        enabled = points.size <= 15,
                        radius = 4.dp,
                        color = SolidColor(primary),
                        strokeWidth = 2.dp,
                        strokeColor = SolidColor(surface),
                    ),
                ),
            )
        }
        LineChart(
            modifier = Modifier.fillMaxWidth().height(chartHeight),
            data = data,
            animationMode = AnimationMode.Together(),
            gridProperties = GridProperties(
                xAxisProperties = GridProperties.AxisProperties(
                    lineCount = 4,
                    color = SolidColor(grid)
                ),
                yAxisProperties = GridProperties.AxisProperties(enabled = false),
            ),
            labelProperties = LabelProperties(
                enabled = true,
                textStyle = labelStyle,
                labels = labels
            ),
            indicatorProperties = HorizontalIndicatorProperties(
                enabled = true, textStyle = labelStyle, contentBuilder = { compact(it) },
            ),
            labelHelperProperties = LabelHelperProperties(enabled = false),
        )
    }
}

// ───────────── Top productos ─────────────
@Composable
fun TopProductsCard(state: StatsUiState, chartHeight: Dp, modifier: Modifier = Modifier) {
    StatsCard("Top productos", state.isLoading, state.topProducts.isEmpty(), chartHeight, modifier) {
        val palette = chartPalette()
        val labelStyle = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
        val data = remember(state.topProducts, palette) {
            state.topProducts.mapIndexed { i, p ->
                Bars(
                    label = p.name.take(14),
                    values = listOf(
                        Bars.Data(
                            label = "Ingresos",
                            value = p.revenue,
                            color = SolidColor(palette[i % palette.size])
                        )
                    ),
                )
            }
        }
        RowChart(
            modifier = Modifier.fillMaxWidth().height(chartHeight),
            data = data,
            barProperties = BarProperties(
                cornerRadius = Bars.Data.Radius.Rectangle(topRight = 6.dp, bottomRight = 6.dp),
                spacing = 4.dp, thickness = 18.dp,
            ),
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
            labelProperties = LabelProperties(enabled = true, textStyle = labelStyle),
            indicatorProperties = VerticalIndicatorProperties(
                enabled = true, textStyle = labelStyle, contentBuilder = { compact(it) },
            ),
            labelHelperProperties = LabelHelperProperties(enabled = false),
        )
    }
}

// ───────────── Reparto por PDV ─────────────
@Composable
fun UnitsCard(state: StatsUiState, stacked: Boolean, pieSize: Dp, modifier: Modifier = Modifier) {
    val total = state.unitShares.sumOf { it.revenue }
    StatsCard("Ventas por punto de venta", state.isLoading, total <= 0.0, pieSize, modifier) {
        val palette = chartPalette()
        var data by remember(state.unitShares, palette) {
            mutableStateOf(
                state.unitShares.mapIndexed { i, s ->
                    Pie(
                        label = s.name, data = s.revenue,
                        color = palette[i % palette.size],
                        selectedColor = palette[i % palette.size].copy(alpha = .85f),
                    )
                },
            )
        }
        val pie: @Composable () -> Unit = {
            PieChart(
                modifier = Modifier.size(pieSize),
                data = data,
                onPieClick = { clicked ->
                    val idx = data.indexOf(clicked)
                    data = data.mapIndexed { i, p -> p.copy(selected = i == idx && !clicked.selected) }
                },
                selectedScale = 1.08f,
                scaleAnimEnterSpec = spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessLow),
                colorAnimEnterSpec = tween(300),
                colorAnimExitSpec = tween(300),
                scaleAnimExitSpec = tween(300),
                spaceDegreeAnimExitSpec = tween(300),
                style = Pie.Style.Stroke(width = pieSize * 0.22f),
            )
        }
        val legend: @Composable (Modifier) -> Unit = { m ->
            Column(m, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                state.unitShares.forEachIndexed { i, s ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(Modifier.size(10.dp).background(palette[i % palette.size], CircleShape))
                        Text(s.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1)
                        Text(
                            "${(s.revenue / total * 100).roundToInt()}%",
                            style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
        if (stacked) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                pie(); legend(Modifier.fillMaxWidth())
            }
        } else {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                pie(); legend(Modifier.weight(1f))
            }
        }
    }
}

// ───────────── Stock bajo ─────────────
@Composable
fun StockCard(state: StatsUiState, modifier: Modifier = Modifier) {
    StatsCard(
        "Stock bajo", state.isLoading, state.stockAlerts.isEmpty(), 160.dp, modifier,
        emptyText = "Sin alertas de stock",
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.stockAlerts.forEach { a ->
                val progress by animateFloatAsState(a.ratio, tween(800), label = "stock")
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(a.productName, style = MaterialTheme.typography.bodyMedium, maxLines = 1)
                            Text(a.unitName, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("${a.qty.roundToInt()} uds", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    }
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxWidth().height(6.dp),
                        color = if (a.ratio < .4f) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round,
                    )
                }
            }
        }
    }
}