package com.elitec.com.feature.pos.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.CreateSaleLineInput
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.gursimar.composive.responsive.theme.AppTheme
import kotlinx.coroutines.delay

data class DraftLineUi(
    val product: Product,
    val qty: String = "1",
    val unitPrice: String = "",
)

@Composable
fun NewSaleForm(
    assignedUnit: AssignedUnitUiState,
    seller: String,
    products: List<Product>,
    stockOf: (String) -> Double,
    registerState: RegisterSaleUiState,
    onSubmit: (CreateSaleInput) -> Unit,
    onClearRegisterState: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var search by remember { mutableStateOf("") }
    var lines by remember { mutableStateOf<List<DraftLineUi>>(emptyList()) }
    var note by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }

    val unitId = (assignedUnit as? AssignedUnitUiState.Ready)?.unitId.orEmpty()
    val unitName = (assignedUnit as? AssignedUnitUiState.Ready)?.unitName.orEmpty()

    val filtered = remember(products, search) {
        val q = search.trim().lowercase()
        if (q.isEmpty()) products.take(30)
        else products.filter {
            it.name.lowercase().contains(q) || it.code.lowercase().contains(q)
        }.take(30)
    }

    val ticketTotal = lines.sumOf {
        val q = it.qty.toDoubleOrNull() ?: 0.0
        val p = it.unitPrice.toDoubleOrNull() ?: 0.0
        q * p
    }

    LaunchedEffect(registerState) {
        if (registerState is RegisterSaleUiState.Success) {
            lines = emptyList()
            note = ""
            formError = null
            delay(2200)
            onClearRegisterState()
        }
    }

    val saving = registerState is RegisterSaleUiState.Saving
    val success = registerState is RegisterSaleUiState.Success
    val regError = (registerState as? RegisterSaleUiState.Error)?.message

    Surface(
        modifier = modifier.fillMaxHeight(),
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        tonalElevation = 2.dp,
        shadowElevation = 4.dp,
    ) {
        Column(Modifier.padding(AppTheme.dimensions.cardPadding)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Receipt, null, tint = MaterialTheme.colorScheme.primary)
                Text("Nueva venta", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(12.dp))

            // —— Contexto PDV / vendedor ——
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    when (assignedUnit) {
                        is AssignedUnitUiState.Loading, AssignedUnitUiState.Idle -> {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                                Text("Cargando punto de venta…", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        is AssignedUnitUiState.Ready -> {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.Store, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                                Column {
                                    Text("Punto de venta", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(unitName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        is AssignedUnitUiState.None -> {
                            Text(
                                "Sin punto de venta asignado. Un administrador debe asociarlo al usuario.",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        is AssignedUnitUiState.Error -> {
                            Text(assignedUnit.message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        Text(seller, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // —— Búsqueda ——
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !saving,
                leadingIcon = { Icon(Icons.Default.Search, null) },
                placeholder = { Text("Buscar producto por nombre o código") },
                shape = RoundedCornerShape(14.dp),
            )
            Spacer(Modifier.height(8.dp))

            Text("Catálogo", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            LazyColumn(
                modifier = Modifier.weight(0.38f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (filtered.isEmpty()) {
                    item {
                        Text(
                            if (products.isEmpty()) "Sin productos cargados" else "Sin coincidencias",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                items(filtered, key = { it.id }) { p ->
                    val stock = stockOf(p.id)
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceContainer,
                        onClick = {
                            if (saving || stock <= 0 || lines.any { it.product.id == p.id }) return@Surface
                            val price = p.priceSale ?: p.costStd ?: 0.0
                            lines = lines + DraftLineUi(p, "1", if (price > 0) price.toString() else "")
                        },
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(p.name, style = MaterialTheme.typography.bodyMedium, maxLines = 1, fontWeight = FontWeight.Medium)
                                Text(
                                    "${p.code} · stock ${stock.toInt()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Icon(Icons.Default.Add, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Text("Ticket", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)

            // —— Ticket scroll ——
            LazyColumn(
                modifier = Modifier.weight(0.32f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (lines.isEmpty()) {
                    item {
                        Text("Añade productos al ticket", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                items(lines, key = { it.product.id }) { line ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(line.product.name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, maxLines = 1)
                                val q = line.qty.toDoubleOrNull() ?: 0.0
                                val pr = line.unitPrice.toDoubleOrNull() ?: 0.0
                                Text("Subtotal ${q * pr}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            OutlinedTextField(
                                value = line.qty,
                                onValueChange = { v -> lines = lines.map { if (it.product.id == line.product.id) it.copy(qty = v) else it } },
                                modifier = Modifier.weight(0.28f),
                                singleLine = true,
                                label = { Text("Cant") },
                                enabled = !saving,
                            )
                            OutlinedTextField(
                                value = line.unitPrice,
                                onValueChange = { v -> lines = lines.map { if (it.product.id == line.product.id) it.copy(unitPrice = v) else it } },
                                modifier = Modifier.weight(0.32f),
                                singleLine = true,
                                label = { Text("Precio") },
                                enabled = !saving,
                            )
                            IconButton(onClick = { lines = lines.filterNot { it.product.id == line.product.id } }, enabled = !saving) {
                                Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }

            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !saving,
                label = { Text("Nota") },
                shape = RoundedCornerShape(12.dp),
            )

            AnimatedVisibility(visible = formError != null || regError != null, enter = fadeIn(), exit = fadeOut()) {
                Text(formError ?: regError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
            }
            AnimatedVisibility(visible = success, enter = fadeIn(), exit = fadeOut()) {
                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    Text("Venta registrada", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                }
            }

            // —— Footer fijo total + CTA ——
            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Total", style = MaterialTheme.typography.titleMedium)
                Text(
                    ticketTotal.toString(),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Button(
                onClick = {
                    formError = null
                    if (assignedUnit is AssignedUnitUiState.Loading || assignedUnit is AssignedUnitUiState.Idle) {
                        formError = "Espere a que cargue el punto de venta"
                        return@Button
                    }
                    if (unitId.isBlank()) {
                        formError = "No hay Punto de Venta asignado a este usuario"
                        return@Button
                    }
                    if (lines.isEmpty()) {
                        formError = "Añade al menos un producto"
                        return@Button
                    }
                    val saleLines = mutableListOf<CreateSaleLineInput>()
                    for (line in lines) {
                        val qty = line.qty.toDoubleOrNull()
                        if (qty == null || qty <= 0) {
                            formError = "Cantidad inválida en ${line.product.name}"
                            return@Button
                        }
                        saleLines += CreateSaleLineInput(
                            productId = line.product.id,
                            qty = qty,
                            unitPrice = line.unitPrice.toDoubleOrNull(),
                        )
                    }
                    onSubmit(CreateSaleInput(unitId = unitId, seller = seller, note = note.ifBlank { null }, lines = saleLines))
                },
                enabled = !saving && assignedUnit is AssignedUnitUiState.Ready,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text("Registrar venta")
            }
        }
    }
}
