package com.elitec.com.infraestructure.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RemoveShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.entities.SaleLine
import com.elitec.com.feature.pos.domain.entities.effectiveLineTotal
import com.elitec.com.feature.pos.domain.entities.effectiveTotal
import com.elitec.com.feature.pos.domain.entities.effectiveSubtotal
import com.elitec.com.feature.pos.ui.components.NewSaleForm
import com.elitec.com.feature.pos.ui.components.StockCard
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay
import org.koin.compose.viewmodel.koinViewModel
import kotlin.time.Duration.Companion.milliseconds

@Composable
fun MainScreen(
    session: Session,
    modifier: Modifier = Modifier,
    salesVm: SalesViewModel = koinViewModel(),
) {
    val context by salesVm.context.collectAsStateWithLifecycle()
    val salesState by salesVm.salesUiState.collectAsStateWithLifecycle()
    val registerState by salesVm.registerState.collectAsStateWithLifecycle()
    val assignedUnit by salesVm.assignedUnit.collectAsStateWithLifecycle()
    val sellerKey by salesVm.sellerKey.collectAsStateWithLifecycle()

    var selectedSale by remember { mutableStateOf<Sale?>(null) }

    LaunchedEffect(session.user.id, session.user.metadata) {
        salesVm.bindSession(session)
    }

    val boards = remember(context.unitStocks, context.products, assignedUnit) {
        salesVm.stockBoards()
    }
    val (outStock, lowStock, okStock) = boards
    val sellerLabel = session.user.displayName.ifBlank { session.user.username }.ifBlank { sellerKey }

    Row(
        modifier = modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(
            modifier = Modifier.weight(1.15f).fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                "Stock del PDV",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            if (context.error != null) {
                Text(
                    context.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StockCard(
                    icon = Icons.Default.RemoveShoppingCart,
                    tittle = "Agotados",
                    subTittle = "Requieren atención",
                    stockList = outStock,
                    stockState = StockStates.OUT,
                    loading = context.loading,
                    modifier = Modifier.weight(1f),
                )
                StockCard(
                    icon = Icons.Default.Warning,
                    tittle = "Casi agotados",
                    subTittle = "Prevención",
                    stockList = lowStock,
                    stockState = StockStates.LOW,
                    loading = context.loading,
                    modifier = Modifier.weight(1f),
                )
                StockCard(
                    icon = Icons.Default.CheckCircle,
                    tittle = "Habilitados",
                    subTittle = "Disponibles",
                    stockList = okStock,
                    stockState = StockStates.OK,
                    loading = context.loading,
                    modifier = Modifier.weight(1f),
                )
            }

            Text("Mis ventas", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Surface(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                tonalElevation = 1.dp,
            ) {
                when (val s = salesState) {
                    is SaleListUiState.Loading -> Column(
                        Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        CircularProgressIndicator()
                        Spacer(Modifier.height(8.dp))
                        Text("Cargando tus ventas…", style = MaterialTheme.typography.bodySmall)
                    }
                    is SaleListUiState.Empty -> Column(
                        Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Outlined.ReceiptLong,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(36.dp),
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Aún no tienes ventas registradas",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    is SaleListUiState.Error -> Text(
                        s.message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(16.dp),
                    )
                    is SaleListUiState.WithSales -> LazyColumn(
                        Modifier.fillMaxSize().padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        itemsIndexed(s.sales, key = { _, sale -> sale.id }) { index, sale ->
                            SaleListItem(
                                sale = sale,
                                index = index,
                                onClick = { selectedSale = sale },
                            )
                        }
                    }
                }
            }
        }

        NewSaleForm(
            assignedUnit = assignedUnit,
            seller = sellerLabel,
            products = context.products,
            stockOf = salesVm::stockOf,
            registerState = registerState,
            onSubmit = salesVm::createSale,
            onClearRegisterState = salesVm::clearRegisterState,
            modifier = Modifier.weight(0.95f),
        )
    }

    selectedSale?.let { sale ->
        SaleDetailDialog(sale = sale, onDismiss = { selectedSale = null })
    }
}

@Composable
private fun SaleListItem(
    sale: Sale,
    index: Int,
    onClick: () -> Unit,
) {
    var visible by remember(sale.id) { mutableStateOf(false) }
    LaunchedEffect(sale.id) {
        delay((index * 45L).coerceAtMost(360L).milliseconds)
        visible = true
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(220)) + slideInVertically(
            initialOffsetY = { it / 4 },
            animationSpec = tween(220),
        ),
    ) {
        OutlinedCard(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.outlinedCardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onClick)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ReceiptLong,
                        contentDescription = "Venta",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(10.dp).size(22.dp),
                    )
                }

                Column(
                    Modifier.weight(1f).padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        sale.number.ifBlank { sale.id.take(8) },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            Icons.Outlined.CalendarToday,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            sale.date.ifBlank { "—" },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Icon(
                            Icons.Outlined.Inventory2,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            "${sale.lines.size} ítems",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        money(sale.effectiveTotal(), sale.currency),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Detalle",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Icon(
                            Icons.Outlined.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SaleDetailDialog(
    sale: Sale,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Cerrar") }
        },
        title = {
            Column {
                Text(
                    "Detalle de venta",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    sale.number.ifBlank { sale.id },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 480.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            DetailMetaRow(Icons.Outlined.CalendarToday, "Fecha", sale.date.ifBlank { "—" })
                            DetailMetaRow(Icons.Outlined.Store, "PDV", sale.unitName.ifBlank { sale.unitId.ifBlank { "—" } })
                            DetailMetaRow(Icons.Outlined.ReceiptLong, "Vendedor", sale.seller.ifBlank { "—" })
                        }
                    }
                }

                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.Inventory2,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            "Productos",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                if (sale.lines.isEmpty()) {
                    item {
                        Text(
                            "Sin líneas de producto",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    itemsIndexed(sale.lines, key = { i, line -> "${line.productId}-$i" }) { _, line ->
                        SaleLineRow(line = line, currency = sale.currency)
                    }
                }

                item {
                    HorizontalDivider()
                    Spacer(Modifier.height(4.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            if (sale.subtotal > 0.0 && sale.subtotal != sale.total) {
                                Text(
                                    "Subtotal ${money(sale.effectiveSubtotal(), sale.currency)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            if (sale.discount > 0.0) {
                                Text(
                                    "Descuento −${money(sale.discount, sale.currency)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                "Total",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Text(
                            money(sale.effectiveTotal(), sale.currency),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        },
    )
}

@Composable
private fun DetailMetaRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            "$label:",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun SaleLineRow(
    line: SaleLine,
    currency: String,
) {
    val lineTotal = line.effectiveLineTotal()
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.secondaryContainer,
            ) {
                Icon(
                    Icons.Outlined.Inventory2,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.padding(8.dp).size(18.dp),
                )
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    line.productName.ifBlank { line.productCode.ifBlank { line.productId } },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                )
                Text(
                    buildString {
                        if (line.productCode.isNotBlank()) append(line.productCode).append(" · ")
                        append("Cant. ${trimNum(line.qty)}")
                        append(" × ")
                        append(money(line.unitPrice, currency))
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    money(lineTotal, currency),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "línea",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun money(amount: Double, currency: String): String {
    val rounded = (kotlin.math.round(amount * 100.0) / 100.0)
    val body = if (rounded == rounded.toLong().toDouble()) {
        rounded.toLong().toString()
    } else {
        rounded.toString()
    }
    return if (currency.isBlank()) body else "$body $currency"
}

private fun trimNum(n: Double): String =
    if (n == n.toLong().toDouble()) n.toLong().toString() else n.toString()
