package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SalesListScreen(
    onOpenSale: (saleId: String) -> Unit,
    onNewSale: () -> Unit,
    onOpenStock: () -> Unit,
    onLogout: () -> Unit,
    vm: SalesViewModel = koinViewModel(),
) {
    val listState by vm.salesUiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        vm.refreshAll()
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Ventas",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = AbacoColors.Cyan,
            )
            Row {
                TextButton(onClick = onOpenStock) { Text("Stock") }
                TextButton(onClick = onLogout) { Text("Salir") }
            }
        }
        Spacer(Modifier.height(8.dp))
        Button(onClick = onNewSale, modifier = Modifier.fillMaxWidth()) {
            Text("Nueva venta")
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
                    Spacer(Modifier.height(8.dp))
                    Text("Cargando ventas…")
                }
            }
            is SaleListUiState.Empty -> {
                Text("Sin ventas aún", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            is SaleListUiState.Error -> {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                Button(onClick = { vm.refreshAll() }) { Text("Reintentar") }
            }
            is SaleListUiState.WithSales -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(s.sales, key = { it.id }) { sale ->
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .clickable { onOpenSale(sale.id) }
                                .padding(vertical = 10.dp),
                        ) {
                            Text(
                                sale.number.ifBlank { sale.id.take(8) },
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "${sale.total} ${sale.currency} · ${sale.seller}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
