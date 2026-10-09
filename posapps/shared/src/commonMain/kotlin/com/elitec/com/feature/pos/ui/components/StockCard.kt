package com.elitec.com.feature.pos.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Sell
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.pos.ui.models.LocalStock
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.gursimar.composive.responsive.core.DeviceConfiguration
import com.gursimar.composive.responsive.core.rememberDeviceConfiguration
import com.gursimar.composive.responsive.theme.AppTheme
import kotlin.math.roundToLong

/*
/**
 * @param listHeight altura de la lista de productos. Si no se indica,
 * cada tipo de pantalla usa su valor por defecto.
 */
@Composable
fun StockCard(
    icon: ImageVector,
    tittle: String,
    subTittle: String,
    stockList: List<LocalStock>,
    stockState: StockStates,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    listHeight: Dp = Dp.Unspecified,
) {
    val deviceConfig = rememberDeviceConfiguration()
    val colors = AppTheme.materialColors

    // El color de acento transiciona suavemente si cambia el estado
    val accent by animateColorAsState(
        targetValue = when (stockState) {
            StockStates.OUT -> Color(0xFFC94F4F)
            StockStates.LOW -> Color(0xFFFA8760)
            StockStates.OK -> Color(0xFF5E8F52)
        },
        animationSpec = tween(350),
        label = "stockAccent",
    )

    val data = StockCardData(
        icon = icon,
        title = tittle,
        subtitle = subTittle,
        stockList = stockList,
        loading = loading,
        accent = accent,
        statusLabel = when (stockState) {
            StockStates.OUT -> "Agotado"
            StockStates.LOW -> "Stock bajo"
            StockStates.OK -> "Disponible"
        },
        statusIcon = when (stockState) {
            StockStates.OUT -> Icons.Rounded.Error
            StockStates.LOW -> Icons.Rounded.Warning
            StockStates.OK -> Icons.Rounded.CheckCircle
        },
    )

    StockCardContainer(accent = accent, modifier = modifier) {
        when (deviceConfig) {

            // Tarjeta a todo el ancho: el estado cabe en la cabecera, junto al título.
            DeviceConfiguration.MOBILE_PORTRAIT -> StockCardVertical(
                data = data,
                padding = 14.dp,
                iconBoxSize = 40.dp,
                statusInHeader = true,
                nameLines = 2,
                showAvatar = true,
                listHeight = listHeight.orDefault(148.dp),
            )

            // Poca altura: información a la izquierda y lista a la derecha.
            DeviceConfiguration.MOBILE_LANDSCAPE -> StockCardSideBySide(
                data = data,
                listHeight = listHeight.orDefault(120.dp),
            )

            // Tarjetas medianas: el estado baja a la fila del contador para liberar el título.
            DeviceConfiguration.TABLET_PORTRAIT -> StockCardVertical(
                data = data,
                padding = 16.dp,
                iconBoxSize = 44.dp,
                statusInHeader = false,
                nameLines = 2,
                showAvatar = true,
                listHeight = listHeight.orDefault(156.dp),
            )

            // Normalmente 3 tarjetas en fila + barra lateral: el ancho es el más justo.
            DeviceConfiguration.TABLET_LANDSCAPE -> StockCardVertical(
                data = data,
                padding = 16.dp,
                iconBoxSize = 44.dp,
                statusInHeader = false,
                nameLines = 2,
                showAvatar = true,
                listHeight = listHeight.orDefault(160.dp),
            )

            // Más aire y más altura para la lista.
            DeviceConfiguration.DESKTOP -> StockCardVertical(
                data = data,
                padding = 20.dp,
                iconBoxSize = 48.dp,
                statusInHeader = false,
                nameLines = 2,
                showAvatar = true,
                listHeight = listHeight.orDefault(188.dp),
            )
        }
    }
}

 */


@Composable
fun StockCard(
    icon: ImageVector,
    tittle: String,
    subTittle: String,
    stockList: List<LocalStock>,
    stockState: StockStates,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    listHeight: Dp = Dp.Unspecified,
    compact: Boolean = false,
) {
    val accent by animateColorAsState(
        targetValue = when (stockState) {
            StockStates.OUT -> Color(0xFFC94F4F)
            StockStates.LOW -> Color(0xFFFA8760)
            StockStates.OK -> Color(0xFF5E8F52)
        },
        animationSpec = tween(350),
        label = "stockAccent",
    )

    val data = StockCardData(
        icon = icon,
        title = tittle,
        subtitle = subTittle,
        stockList = stockList,
        loading = loading,
        accent = accent,
        statusLabel = when (stockState) {
            StockStates.OUT -> "Agotado"
            StockStates.LOW -> "Stock bajo"
            StockStates.OK -> "Disponible"
        },
        statusIcon = when (stockState) {
            StockStates.OUT -> Icons.Rounded.Error
            StockStates.LOW -> Icons.Rounded.Warning
            StockStates.OK -> Icons.Rounded.CheckCircle
        },
    )

    StockCardContainer(accent = accent, modifier = modifier) {
        BoxWithConstraints {
            val w = maxWidth

            when {
                // Ancho suficiente: información a la izquierda, lista a la derecha.
                w >= 440.dp || (compact && w >= 340.dp) -> StockCardSideBySide(
                    data = data,
                    listHeight = listHeight.orDefault(if (compact) 96.dp else 132.dp),
                )

                // Vertical. El estado sube a la cabecera solo si hay sitio para él.
                else -> {
                    val roomy = w >= 340.dp
                    StockCardVertical(
                        data = data,
                        padding = if (roomy) 16.dp else 12.dp,
                        iconBoxSize = if (roomy) 44.dp else 36.dp,
                        statusInHeader = w >= 360.dp,
                        nameLines = 2,
                        showAvatar = true,
                        listHeight = listHeight.orDefault(if (roomy) 156.dp else 140.dp),
                    )
                }
            }
        }
    }
}

private fun Dp.orDefault(default: Dp): Dp = if (this == Dp.Unspecified) default else this

/** Datos ya resueltos que comparten todos los layouts. */
private data class StockCardData(
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val stockList: List<LocalStock>,
    val loading: Boolean,
    val accent: Color,
    val statusLabel: String,
    val statusIcon: ImageVector,
)

/* ================================================================== */
/*  Layouts                                                            */
/* ================================================================== */

/** Layout vertical: cabecera -> contador -> lista. */
@Composable
private fun StockCardVertical(
    data: StockCardData,
    padding: Dp,
    iconBoxSize: Dp,
    statusInHeader: Boolean,
    nameLines: Int,
    showAvatar: Boolean,
    listHeight: Dp,
) {
    Column(Modifier.padding(padding)) {

        // ---------- Cabecera ----------
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StockIconBadge(data.icon, data.title, data.accent, iconBoxSize)
            StockTitleBlock(
                title = data.title,
                subtitle = data.subtitle,
                titleLines = 2,
                modifier = Modifier.weight(1f),
            )
            if (statusInHeader) {
                StatusPill(data.statusLabel, data.statusIcon, data.accent)
            }
        }

        Spacer(Modifier.height(14.dp))

        // ---------- Contador (+ estado cuando no cabe en la cabecera) ----------
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            StockCounter(count = data.stockList.size, accent = data.accent)
            if (!statusInHeader) {
                StatusPill(
                    label = data.statusLabel,
                    icon = data.statusIcon,
                    color = data.accent,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        // ---------- Lista ----------
        StockListPanel(
            data = data,
            nameLines = nameLines,
            showAvatar = showAvatar,
            modifier = Modifier
                .fillMaxWidth()
                .height(listHeight),
        )
    }
}

/** Layout horizontal para móvil en landscape (poca altura disponible). */
@Composable
private fun StockCardSideBySide(
    data: StockCardData,
    listHeight: Dp,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Izquierda: identidad + contador + estado
        Column(
            modifier = Modifier.weight(0.45f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StockIconBadge(data.icon, data.title, data.accent, 36.dp)
                StockTitleBlock(
                    title = data.title,
                    subtitle = data.subtitle,
                    titleLines = 2,
                    modifier = Modifier.weight(1f),
                )
            }
            StockCounter(count = data.stockList.size, accent = data.accent)
            StatusPill(data.statusLabel, data.statusIcon, data.accent)
        }

        // Derecha: lista compacta sin avatares
        StockListPanel(
            data = data,
            nameLines = 1,
            showAvatar = false,
            modifier = Modifier
                .weight(0.55f)
                .height(listHeight),
        )
    }
}

/* ================================================================== */
/*  Contenedor y piezas compartidas                                    */
/* ================================================================== */

@Composable
private fun StockCardContainer(
    accent: Color,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp, hoveredElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = AppTheme.materialColors.surfaceContainer),
        border = BorderStroke(1.dp, accent.copy(alpha = 0.18f)),
        shape = RoundedCornerShape(24.dp),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier.background(
                Brush.verticalGradient(
                    colors = listOf(accent.copy(alpha = 0.10f), Color.Transparent),
                    endY = 280f,
                )
            )
        ) {
            content()
        }
    }
}

@Composable
private fun StockIconBadge(
    icon: ImageVector,
    contentDescription: String,
    accent: Color,
    size: Dp,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(size)
            .background(accent.copy(alpha = 0.16f), RoundedCornerShape(14.dp)),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = accent,
            modifier = Modifier.size(size * 0.5f),
        )
    }
}

/** Título y subtítulo: permiten hasta 2 líneas para evitar el recorte. */
@Composable
private fun StockTitleBlock(
    title: String,
    subtitle: String,
    titleLines: Int,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors
    Column(modifier) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = colors.onSurface,
            maxLines = titleLines,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodySmall,
            color = colors.onSurfaceVariant,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun StockCounter(count: Int, accent: Color) {
    Row(
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.padding(start = 4.dp),
    ) {
        AnimatedContent(
            targetState = count,
            transitionSpec = {
                // Sube si aumenta, baja si disminuye
                if (targetState > initialState) {
                    (slideInVertically { it } + fadeIn()) togetherWith
                            (slideOutVertically { -it } + fadeOut())
                } else {
                    (slideInVertically { -it } + fadeIn()) togetherWith
                            (slideOutVertically { it } + fadeOut())
                }
            },
            label = "stockCount",
        ) { n ->
            Text(
                text = n.toString(),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.ExtraBold,
                color = accent,
            )
        }
        Text(
            text = if (count == 1) "producto" else "productos",
            style = MaterialTheme.typography.labelMedium,
            color = AppTheme.materialColors.onSurfaceVariant,
            maxLines = 1,
            modifier = Modifier.padding(bottom = 6.dp),
        )
    }
}

@Composable
private fun StatusPill(
    label: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .background(color.copy(alpha = 0.14f), CircleShape)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(14.dp),
        )
        Spacer(Modifier.size(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = color,
            maxLines = 1,
        )
    }
}

/* ------------------------------------------------------------------ */
/*  Lista                                                              */
/* ------------------------------------------------------------------ */

@Composable
private fun StockListPanel(
    data: StockCardData,
    nameLines: Int,
    showAvatar: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors

    Box(
        modifier = modifier.background(colors.surfaceContainerLow, RoundedCornerShape(18.dp)),
    ) {
        when {
            data.loading -> SkeletonRows()

            data.stockList.isEmpty() -> Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = Icons.Rounded.Inventory2,
                    contentDescription = null,
                    tint = colors.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(28.dp),
                )
                Text(
                    text = "Sin productos",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceVariant,
                )
            }

            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(horizontal = 8.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                items(
                    items = data.stockList,
                    key = { row -> row.posId + "|" + row.productId },
                ) { item ->
                    StockRow(
                        item = item,
                        accent = data.accent,
                        nameLines = nameLines,
                        showAvatar = showAvatar,
                        modifier = Modifier.animateItem(),
                    )
                }
            }
        }
    }
}

@Composable
private fun StockRow(
    item: LocalStock,
    accent: Color,
    nameLines: Int,
    showAvatar: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.materialColors

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 6.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (showAvatar) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .background(accent.copy(alpha = 0.12f), CircleShape),
            ) {
                Text(
                    text = item.productName.firstOrNull()?.uppercase() ?: "?",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = accent,
                )
            }
        }

        Column(Modifier.weight(1f)) {
            Text(
                text = item.productName,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = colors.onSurface,
                maxLines = nameLines,
                overflow = TextOverflow.Ellipsis,
            )
            if (item.unitPrice > 0.0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Sell,
                        contentDescription = null,
                        tint = colors.onSurfaceVariant,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = formatPrice(item.unitPrice),
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.onSurfaceVariant,
                    )
                }
            }
        }

        Text(
            text = item.qty.toInt().toString(),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = accent,
            maxLines = 1,
            modifier = Modifier
                .background(accent.copy(alpha = 0.14f), CircleShape)
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

/** Filas "esqueleto" con pulso mientras carga. */
@Composable
private fun SkeletonRows() {
    val colors = AppTheme.materialColors
    val pulse by rememberInfiniteTransition(label = "skeleton").animateFloat(
        initialValue = 0.35f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
        label = "skeletonAlpha",
    )

    Column(
        modifier = Modifier.padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        repeat(3) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.alpha(pulse),
            ) {
                Box(
                    Modifier
                        .size(32.dp)
                        .background(colors.surfaceContainerHighest, CircleShape)
                )
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(0.7f)
                            .height(10.dp)
                            .background(colors.surfaceContainerHighest, CircleShape)
                    )
                    Box(
                        Modifier
                            .fillMaxWidth(0.4f)
                            .height(8.dp)
                            .background(colors.surfaceContainerHighest, CircleShape)
                    )
                }
                Box(
                    Modifier
                        .size(width = 32.dp, height = 20.dp)
                        .background(colors.surfaceContainerHighest, CircleShape)
                )
            }
        }
    }
}

/** Formato "1234.5" -> "$1234.50" compatible con commonMain (sin java.text). */
private fun formatPrice(value: Double): String {
    val cents = (value * 100).roundToLong()
    val whole = cents / 100
    val decimals = (cents % 100).toString().padStart(2, '0')
    return "$$whole.$decimals"
}