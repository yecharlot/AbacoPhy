package com.elitec.com.feature.pos.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitec.com.feature.pos.ui.components.CategoryCard
import com.elitec.com.feature.pos.ui.components.OrderPanel
import com.elitec.com.feature.pos.ui.components.PosNavItem
import com.elitec.com.feature.pos.ui.components.PosSideNav
import com.elitec.com.feature.pos.ui.components.ProductCard
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.elitec.com.feature.pos.ui.viewmodel.PosOrderViewModel
import com.elitec.com.feature.pos.ui.viewmodel.SalesViewModel
import org.koin.compose.viewmodel.koinViewModel

/**
 * Workspace POS adaptativo:
 * - ≥1024dp: nav | productos | pedido persistente
 * - <768dp: columna única + CTA sticky → OrderScreen
 */
@Composable
fun PosWorkspaceScreen(
    onOpenOrderReview: () -> Unit,
    onOpenSales: () -> Unit,
    onOpenStock: () -> Unit,
    onLogout: () -> Unit,
    salesVm: SalesViewModel = koinViewModel(),
    orderVm: PosOrderViewModel = koinViewModel(),
) {
    val context by salesVm.context.collectAsStateWithLifecycle()
    val order by orderVm.state.collectAsStateWithLifecycle()
    val register by salesVm.registerState.collectAsStateWithLifecycle()
    val unitId by salesVm.activeUnitId.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        salesVm.refreshAll()
    }

    LaunchedEffect(register) {
        if (register is RegisterSaleUiState.Success) {
            orderVm.clear()
            salesVm.clearRegisterState()
        }
    }

    val products = context.products
    val categories = remember(products) {
        products.map { it.category.ifBlank { "General" } }
            .groupingBy { it }.eachCount()
            .entries.sortedBy { it.key }
    }

    val filtered = remember(products, order.searchQuery, order.selectedCategory) {
        products.filter { p ->
            val cat = p.category.ifBlank { "General" }
            val catOk = order.selectedCategory == null || cat == order.selectedCategory
            val q = order.searchQuery.trim().lowercase()
            val qOk = q.isEmpty() ||
                p.name.lowercase().contains(q) ||
                p.code.lowercase().contains(q)
            catOk && qOk
        }
    }

    fun priceOf(p: com.elitec.com.feature.catalog.domain.entities.Product) =
        p.priceSale ?: p.costStd ?: 0.0

    fun placeOrder() {
        runCatching {
            val input = orderVm.toCreateSaleInput(
                unitId = unitId.ifBlank { null },
                seller = null,
            )
            salesVm.createSale(input)
        }
    }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val width = maxWidth
        val isCompact = width < 768.dp
        val isWide = width >= 1024.dp

        when {
            isWide -> {
                Row(Modifier.fillMaxSize()) {
                    PosSideNav(
                        selected = PosNavItem.Menu,
                        onSelect = {
                            when (it) {
                                PosNavItem.Menu -> Unit
                                PosNavItem.Sales -> onOpenSales()
                                PosNavItem.Stock -> onOpenStock()
                                PosNavItem.Settings -> onLogout()
                            }
                        },
                        onLogout = onLogout,
                    )
                    Column(Modifier.weight(1f).fillMaxHeight()) {
                        PosHeader(
                            search = order.searchQuery,
                            onSearch = orderVm::setSearch,
                            unitLabel = unitId.ifBlank { "PDV" },
                            isCompact = false,
                            onMenu = null,
                        )
                        CategorySection(
                            categories = categories,
                            selected = order.selectedCategory,
                            onSelect = { c ->
                                orderVm.selectCategory(
                                    if (order.selectedCategory == c) null else c,
                                )
                            },
                            horizontal = false,
                        )
                        ProductGrid(
                            products = filtered,
                            columns = if (width >= 1400.dp) 4 else 3,
                            qtyOf = orderVm::qtyOf,
                            stockOf = salesVm::stockOf,
                            priceOf = ::priceOf,
                            onInc = { p -> orderVm.inc(p, priceOf(p)) },
                            onDec = { p -> orderVm.dec(p, priceOf(p)) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    OrderPanel(
                        order = order,
                        placing = register is RegisterSaleUiState.Saving,
                        onPayment = orderVm::setPaymentMethod,
                        onPlaceOrder = { placeOrder() },
                        modifier = Modifier.fillMaxWidth(0.28f).fillMaxHeight(),
                    )
                }
            }
            isCompact -> {
                Column(Modifier.fillMaxSize()) {
                    PosHeader(
                        search = order.searchQuery,
                        onSearch = orderVm::setSearch,
                        unitLabel = unitId.ifBlank { "PDV" },
                        isCompact = true,
                        onMenu = onOpenSales,
                    )
                    CategorySection(
                        categories = categories,
                        selected = order.selectedCategory,
                        onSelect = { c ->
                            orderVm.selectCategory(
                                if (order.selectedCategory == c) null else c,
                            )
                        },
                        horizontal = true,
                    )
                    ProductGrid(
                        products = filtered,
                        columns = 2,
                        qtyOf = orderVm::qtyOf,
                        stockOf = salesVm::stockOf,
                        priceOf = ::priceOf,
                        onInc = { p -> orderVm.inc(p, priceOf(p)) },
                        onDec = { p -> orderVm.dec(p, priceOf(p)) },
                        modifier = Modifier.weight(1f),
                    )
                    Surface(
                        tonalElevation = 3.dp,
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    ) {
                        Button(
                            onClick = onOpenOrderReview,
                            enabled = order.lines.isNotEmpty(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                                .height(52.dp),
                        ) {
                            Text("Ver pedido (${order.itemCount}) · ${"%.2f".format(order.total)}")
                        }
                    }
                }
            }
            else -> {
                // tablet intermedio: sin nav ancha, con panel pedido
                Row(Modifier.fillMaxSize()) {
                    Column(Modifier.weight(1f).fillMaxHeight()) {
                        PosHeader(
                            search = order.searchQuery,
                            onSearch = orderVm::setSearch,
                            unitLabel = unitId.ifBlank { "PDV" },
                            isCompact = false,
                            onMenu = onOpenSales,
                        )
                        CategorySection(
                            categories = categories,
                            selected = order.selectedCategory,
                            onSelect = { c ->
                                orderVm.selectCategory(
                                    if (order.selectedCategory == c) null else c,
                                )
                            },
                            horizontal = true,
                        )
                        ProductGrid(
                            products = filtered,
                            columns = 3,
                            qtyOf = orderVm::qtyOf,
                            stockOf = salesVm::stockOf,
                            priceOf = ::priceOf,
                            onInc = { p -> orderVm.inc(p, priceOf(p)) },
                            onDec = { p -> orderVm.dec(p, priceOf(p)) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    OrderPanel(
                        order = order,
                        placing = register is RegisterSaleUiState.Saving,
                        onPayment = orderVm::setPaymentMethod,
                        onPlaceOrder = { placeOrder() },
                        modifier = Modifier.fillMaxWidth(0.34f).fillMaxHeight(),
                    )
                }
            }
        }
    }
}

@Composable
private fun PosHeader(
    search: String,
    onSearch: (String) -> Unit,
    unitLabel: String,
    isCompact: Boolean,
    onMenu: (() -> Unit)?,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onMenu != null) {
                TextButton(onClick = onMenu) { Text("Menú") }
            }
            Text(
                "POS",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                unitLabel,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        OutlinedTextField(
            value = search,
            onValueChange = onSearch,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text("Buscar producto…") },
        )
    }
}

@Composable
private fun CategorySection(
    categories: List<Map.Entry<String, Int>>,
    selected: String?,
    onSelect: (String) -> Unit,
    horizontal: Boolean,
) {
    if (categories.isEmpty()) return
    if (horizontal) {
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            categories.forEach { e ->
                CategoryCard(
                    name = e.key,
                    count = e.value,
                    selected = selected == e.key,
                    onClick = { onSelect(e.key) },
                    compact = true,
                )
            }
        }
    } else {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            categories.take(8).forEach { e ->
                CategoryCard(
                    name = e.key,
                    count = e.value,
                    selected = selected == e.key,
                    onClick = { onSelect(e.key) },
                )
            }
        }
    }
}

@Composable
private fun ProductGrid(
    products: List<com.elitec.com.feature.catalog.domain.entities.Product>,
    columns: Int,
    qtyOf: (String) -> Double,
    stockOf: (String) -> Double,
    priceOf: (com.elitec.com.feature.catalog.domain.entities.Product) -> Double,
    onInc: (com.elitec.com.feature.catalog.domain.entities.Product) -> Unit,
    onDec: (com.elitec.com.feature.catalog.domain.entities.Product) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(columns),
        modifier = modifier.fillMaxWidth().padding(horizontal = 8.dp),
        contentPadding = PaddingValues(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(products, key = { it.id }) { p ->
            ProductCard(
                product = p,
                price = priceOf(p),
                qty = qtyOf(p.id),
                stock = stockOf(p.id),
                onInc = { onInc(p) },
                onDec = { onDec(p) },
            )
        }
    }
}
