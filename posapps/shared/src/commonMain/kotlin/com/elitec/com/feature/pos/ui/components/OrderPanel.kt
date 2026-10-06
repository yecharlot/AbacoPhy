package com.elitec.com.feature.pos.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.pos.ui.viewmodel.OrderLineDraft
import com.elitec.com.feature.pos.ui.viewmodel.PosOrderUiState

@Composable
fun OrderPanel(
    order: PosOrderUiState,
    placing: Boolean,
    onPayment: (String) -> Unit,
    onPlaceOrder: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxHeight(),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        tonalElevation = 1.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "Pedido",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (order.lines.isEmpty()) {
                    item {
                        Text(
                            "Sin líneas",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
                items(order.lines, key = { it.productId }) { line ->
                    OrderLineRow(line)
                }
            }
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            SummaryRow("Subtotal", order.subtotal)
            SummaryRow("Impuesto", order.tax)
            SummaryRow("Total", order.total, emphasize = true)
            Spacer(Modifier.height(8.dp))
            Text("Pago", style = MaterialTheme.typography.labelMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("cash" to "Efectivo", "card" to "Tarjeta", "digitalWallet" to "Digital").forEach { (id, label) ->
                    FilterChip(
                        selected = order.paymentMethod == id,
                        onClick = { onPayment(id) },
                        label = { Text(label) },
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onPlaceOrder,
                enabled = order.lines.isNotEmpty() && !placing,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text(if (placing) "Registrando…" else "Cobrar / Place Order")
            }
        }
    }
}

@Composable
fun OrderLineRow(line: OrderLineDraft) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "${line.qty.toInt()}× ${line.productName}",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            "%.2f".format(line.lineTotal),
            style = MaterialTheme.typography.titleSmall,
        )
    }
}

@Composable
private fun SummaryRow(label: String, amount: Double, emphasize: Boolean = false) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            style = if (emphasize) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasize) FontWeight.Bold else FontWeight.Normal,
        )
        Text(
            "%.2f".format(amount),
            style = if (emphasize) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasize) FontWeight.Bold else FontWeight.Normal,
        )
    }
}
