package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.elitec.com.infraestructure.ui.theme.AbacoColors
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun SaleDetailScreen(
    saleId: String,
    onBack: () -> Unit,
    vm: SalesViewModel = koinViewModel(),
) {
    var sale by remember(saleId) { mutableStateOf<Sale?>(null) }
    var loading by remember(saleId) { mutableStateOf(true) }
    var error by remember(saleId) { mutableStateOf<String?>(null) }

    LaunchedEffect(saleId) {
        loading = true
        error = null
        vm.loadSaleById(
            saleId,
            onSuccess = {
                sale = it
                loading = false
            },
            onError = {
                error = it
                loading = false
            },
        )
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Volver") }
        Spacer(Modifier.height(8.dp))
        Text(
            "Detalle venta",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = AbacoColors.Cyan,
        )
        Spacer(Modifier.height(12.dp))
        when {
            loading -> CircularProgressIndicator()
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
            sale == null -> Text("Venta no encontrada: $saleId")
            else -> {
                val s = sale!!
                Text("Número: ${s.number}")
                Text("Total: ${s.total} ${s.currency}")
                Text("Vendedor: ${s.seller}")
                Text("PDV: ${s.unitName.ifBlank { s.unitId }}")
                Text("Líneas: ${s.lines.size}")
                s.lines.forEach { line ->
                    Text(
                        "· ${line.productName} x${line.qty} @ ${line.unitPrice}",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}
