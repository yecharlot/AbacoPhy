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
        vm.loadSaleById(saleId, { sale = it; loading = false }, { error = it; loading = false })
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        TextButton(onClick = onBack) { Text("← Volver") }
        Text("Detalle", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        when {
            loading -> CircularProgressIndicator()
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
            sale == null -> Text("No encontrada")
            else -> {
                Text("Nº ${sale!!.number}")
                Text("Total ${sale!!.total} ${sale!!.currency}")
                sale!!.lines.forEach {
                    Text("· ${it.productName} x${it.qty}")
                }
            }
        }
    }
}
