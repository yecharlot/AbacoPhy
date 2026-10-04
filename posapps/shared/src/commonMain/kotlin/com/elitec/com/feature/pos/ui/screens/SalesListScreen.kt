package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.entities.SaleLine
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SalesListScreen(
    onNewSale: () -> Unit,
    onOpenStock: () -> Unit,
    onLogout: () -> Unit,
    vm: SalesViewModel = koinViewModel(),
) {
    val listState by vm.salesUiState.collectAsStateWithLifecycle()
    var selectedSale by remember { mutableStateOf<Sale?>(null) }

    LaunchedEffect(Unit) { vm.refreshAll() }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    "Historial ventas",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Selecciona una venta para ver su detalle",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row {
                TextButton(onClick = onNewSale) { Text("Menú") }
                TextButton(onClick = onOpenStock) { Text("Stock") }
                TextButton(onClick = onLogout) { Text("Salir") }
            }
        }

        Spacer(Modifier.height(12.dp))

        when (val s = listState) {
            is SaleListUiState.Loading -> {
                Column(
                    Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CircularProgressIndicator()
                }
            }
            is SaleListUiState.Empty -> {
                Text("Sin ventas", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            is SaleListUiState.Error -> {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                Button(onClick = { vm.refreshAll() }) { Text("Reintentar") }
            }
            is SaleListUiState.WithSales -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(s.sales, key = { it.id }) { sale ->
                        SaleHistoryItem(sale = sale, onClick = { selectedSale = sale })
                    }
                }
            }
        }
    }

    selectedSale?.let { sale ->
        SaleDetailDialog(sale = sale, onDismiss = { selectedSale = null })
    }
}

@Composable
private fun SaleHistoryItem(
    sale: Sale,
    onClick: () -> Unit,
) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.outlinedCardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primaryContainer,
            ) {
                Icon(
                    imageVector = Icons.Outlined.ReceiptLong,
                    contentDescription = "Venta",
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.padding(10.dp),
                )
            }

            Column(
                Modifier.weight(1f).padding(horizontal = 12.dp),
            ) {
                Text(
                    sale.number.ifBlank { sale.id },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CalendarToday,
                        contentDescription = "Fecha",
                        modifier = Modifier.height(15.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        sale.date.ifBlank { "Fecha no disponible" },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "%.2f".format(sale.total) + " " + sale.currency,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Ver detalle",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                )
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
            TextButton(onClick = onDismiss) {
                Text("Cerrar")
            }
        },
        title = {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "Detalle de la venta",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        sale.number.ifBlank { sale.id },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Outlined.Close, contentDescription = "Cerrar")
                }
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    SaleInfoGrid(sale)
                }

                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.Inventory2,
                            contentDescription = "Productos",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            "Productos vendidos",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                if (sale.lines.isEmpty()) {
                    item {
                        Text(
                            "No hay líneas de productos disponibles.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    items(
                        items = sale.lines,
                        key = { it.productId + "-" + it.productCode },
                    ) { line ->
                        SaleLineCard(line = line, currency = sale.currency)
                    }
                }

                item {
                    HorizontalDivider()
                    Spacer(Modifier.height(6.dp))
                    SaleTotals(sale)
                }
            }
        },
    )
}

@Composable
private fun SaleInfoGrid(sale: Sale) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        InfoCard(
            icon = Icons.Outlined.Person,
            label = "Vendedor",
            value = sale.seller.ifBlank { "No especificado" },
        )
        InfoCard(
            icon = Icons.Outlined.CalendarToday,
            label = "Fecha",
            value = sale.date.ifBlank { "No disponible" },
        )
        InfoCard(
            icon = Icons.Outlined.Tag,
            label = "Punto de venta",
            value = sale.unitName.ifBlank { sale.unitId.ifBlank { "No especificado" } },
        )
        InfoCard(
            icon = Icons.Outlined.ReceiptLong,
            label = "Estado",
            value = sale.status.ifBlank { "Registrada" },
        )
    }
}

@Composable
private fun InfoCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = MaterialTheme.colorScheme.primary,
            )
            Column(Modifier.padding(start = 12.dp)) {
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    value,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun SaleLineCard(
    line: SaleLine,
    currency: String,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        line.productName.ifBlank { line.productId },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    if (line.productCode.isNotBlank()) {
                        Text(
                            line.productCode,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Text(
                    "%.2f".format(line.lineTotal) + " " + currency,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(Modifier.height(8.dp))

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                LineMetric("Cantidad", formatQty(line.qty))
                LineMetric("Precio/u.", "%.2f".format(line.unitPrice) + " " + currency)
                if (line.discountAmt > 0.0) {
                    LineMetric("Descuento", "%.2f".format(line.discountAmt) + " " + currency)
                }
            }
        }
    }
}

@Composable
private fun RowScope.LineMetric(
    label: String,
    value: String,
) {
    Column(Modifier.weight(1f)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun SaleTotals(sale: Sale) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        TotalRow("Subtotal", sale.subtotal, sale.currency)
        if (sale.discount > 0.0) {
            TotalRow("Descuento", sale.discount, sale.currency)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                Icon(
                    Icons.Outlined.Payments,
                    contentDescription = "Total",
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    "Total",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                "%.2f".format(sale.total) + " " + sale.currency,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun TotalRow(
    label: String,
    amount: Double,
    currency: String,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("%.2f".format(amount) + " " + currency)
    }
}

private fun formatQty(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else "%.2f".format(value)
