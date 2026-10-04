package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.pos.ui.components.OrderPanel
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.elitec.com.feature.pos.ui.viewmodel.PosOrderViewModel
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import org.koin.compose.viewmodel.koinViewModel

/** Mobile: pantalla dedicada de pedido (no columna lateral). */
@Composable
fun OrderReviewScreen(
    onBack: () -> Unit,
    onPlaced: () -> Unit,
    salesVm: SalesViewModel = koinViewModel(),
    orderVm: PosOrderViewModel = koinViewModel(),
) {
    val order by orderVm.state.collectAsStateWithLifecycle()
    val register by salesVm.registerState.collectAsStateWithLifecycle()
    val unitId by salesVm.activeUnitId.collectAsStateWithLifecycle()

    LaunchedEffect(register) {
        if (register is RegisterSaleUiState.Success) {
            orderVm.clear()
            salesVm.clearRegisterState()
            onPlaced()
        }
    }

    Column(Modifier.fillMaxSize()) {
        TextButton(onClick = onBack, modifier = Modifier.padding(8.dp)) {
            androidx.compose.material3.Text("← Añadir productos")
        }
        OrderPanel(
            order = order,
            placing = register is RegisterSaleUiState.Saving,
            onPayment = orderVm::setPaymentMethod,
            onPlaceOrder = {
                runCatching {
                    salesVm.createSale(
                        orderVm.toCreateSaleInput(unitId.ifBlank { null }, null),
                    )
                }
            },
            modifier = Modifier.fillMaxSize(),
        )
    }
}
