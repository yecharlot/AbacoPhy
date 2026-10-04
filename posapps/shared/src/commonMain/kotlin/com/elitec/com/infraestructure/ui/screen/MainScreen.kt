package com.elitec.com.infraestructure.ui.screen

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RemoveShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.pos.ui.components.NewSaleForm
import com.elitec.com.feature.pos.ui.components.StockCard
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import com.gursimar.composive.responsive.theme.AppTheme
import org.koin.compose.viewmodel.koinViewModel

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

    LaunchedEffect(session.user.id, session.user.metadata) {
        salesVm.bindSession(session)
    }

    val boards = remember(context.unitStocks, context.products, assignedUnit) {
        salesVm.stockBoards()
    }
    val (outStock, lowStock, okStock) = boards
    val sellerLabel = session.user.displayName.ifBlank { session.user.username }.ifBlank { sellerKey }

    Row(
        modifier = modifier.fillMaxSize().padding(AppTheme.dimensions.cardSpacing),
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
                Text(context.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
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
                        Text("Aún no tienes ventas registradas", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    is SaleListUiState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                    is SaleListUiState.WithSales -> LazyColumn(
                        Modifier.fillMaxSize().padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        items(s.sales, key = { it.id }) { sale ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        sale.number.ifBlank { sale.id.take(8) },
                                        fontWeight = FontWeight.SemiBold,
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                    Text(sale.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(
                                    "${sale.total} ${sale.currency}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
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
}
