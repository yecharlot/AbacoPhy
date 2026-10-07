package com.elitec.com.feature.warehouse.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.catalog.domain.caseuse.GetProductsCaseUse
import com.elitec.com.feature.catalog.domain.caseuse.ObserveProductsCaseUse
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.entities.effectiveUnitPrice
import com.elitec.com.feature.pos.ui.uiStates.StockStates
import com.elitec.com.feature.warehouse.domain.caseuse.GetWarehouseStockCaseUse
import com.elitec.com.feature.warehouse.domain.caseuse.ObserveUnitStocksCaseUse
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.pos.ui.models.PosStockLoadState
import com.elitec.com.feature.pos.ui.models.PosStockSummary
import com.elitec.com.feature.pos.ui.models.PosStockUiState
import com.elitec.com.feature.pos.ui.models.StockItemUi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

@kotlinx.coroutines.ExperimentalCoroutinesApi
class PosStockViewModel(
    private val observeUnitStocks: ObserveUnitStocksCaseUse,
    private val observeProducts: ObserveProductsCaseUse,
    private val getWarehouseStock: GetWarehouseStockCaseUse,
    private val getProducts: GetProductsCaseUse,
) : ViewModel() {

    private val unitId = MutableStateFlow<String?>(null)
    private val query = MutableStateFlow("")
    private val isRefreshing = MutableStateFlow(false)
    private val refreshError = MutableStateFlow<String?>(null)
    private val retryTick = MutableStateFlow(0)

    /**
     * Stock reactivo del PDV: se recalcula cuando cambia el stock de la unidad
     * o el catálogo (nombres/precios). Cambiar de unidad o reintentar lo reinicia.
     */
    private val loadState: Flow<PosStockLoadState> =
        combine(unitId, retryTick) { id, _ -> id }
            .flatMapLatest { id -> stockFlow(id) }
            .flowOn(Dispatchers.Default)

    val uiState: StateFlow<PosStockUiState> =
        combine(loadState, query, isRefreshing, refreshError) { load, q, refreshing, error ->
            val shown: PosStockLoadState = when {
                // Base local vacía mientras se sincroniza por primera vez: mejor esqueleto que "sin stock".
                load is PosStockLoadState.Ready && load.totalCount == 0 && refreshing ->
                    PosStockLoadState.Loading

                load is PosStockLoadState.Ready ->
                    load.copy(items = load.items.filterByQuery(q))

                else -> load
            }
            PosStockUiState(load = shown, query = q, isRefreshing = refreshing, refreshError = error)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = PosStockUiState(),
        )

    /* ---------------- Acciones ---------------- */

    /** Llamar cuando se conoce el PDV asignado (o null si no hay). */
    fun setUnit(id: String?) {
        if (unitId.value == id) return
        unitId.value = id
        if (!id.isNullOrBlank()) refresh()
    }

    fun onQueryChange(value: String) {
        query.value = value
    }

    /** Pide al backend stock y catálogo; los observers locales se actualizan solos. */
    fun refresh() {
        if (isRefreshing.value) return
        viewModelScope.launch {
            isRefreshing.value = true
            refreshError.value = null

            val results: List<Result<Unit>> = coroutineScope {
                val stock = async { getWarehouseStock().map { } }
                val products = async { getProducts().map { } }
                listOf(stock.await(), products.await())
            }

            refreshError.value = results
                .firstNotNullOfOrNull { it.exceptionOrNull() }
                ?.let { it.message ?: "No se pudo actualizar el stock" }
            isRefreshing.value = false
        }
    }

    /** Reintento tras un error de carga: reinicia la observación y vuelve a sincronizar. */
    fun retry() {
        retryTick.update { it + 1 }
        refresh()
    }

    fun dismissRefreshError() {
        refreshError.value = null
    }

    /* ---------------- Internos ---------------- */

    private fun stockFlow(id: String?): Flow<PosStockLoadState> =
        if (id.isNullOrBlank()) {
            flowOf(PosStockLoadState.Loading)
        } else {
            combine<List<UnitStock>, List<Product>, PosStockLoadState>(
                observeUnitStocks(id),
                observeProducts(),
            ) { stocks, products -> buildReady(stocks, products) }
                .onStart { emit(PosStockLoadState.Loading) }
                .catch { emit(PosStockLoadState.Error(it.message ?: "No se pudo cargar el stock")) }
        }

    companion object {
        /** Por debajo (o igual) de este valor el producto se considera "stock bajo". */
        const val LOW_STOCK_THRESHOLD = 5.0

        fun classify(qty: Double): StockStates = when {
            qty <= 0.0 -> StockStates.OUT
            qty <= LOW_STOCK_THRESHOLD -> StockStates.LOW
            else -> StockStates.OK
        }
    }
}

private fun buildReady(
    stocks: List<UnitStock>,
    products: List<Product>,
): PosStockLoadState.Ready {
    val productsById = products.associateBy { it.id }

    // Alfabético a propósito: no se agrupa por estado, solo se colorea.
    val items = stocks
        .groupBy { it.productId }
        .map { (productId, rows) ->
            val qty = rows.sumOf { it.qty }
            val product = productsById[productId]
            StockItemUi(
                productId = productId,
                code = product?.code ?: "—",
                name = product?.name ?: "Producto $productId",
                category = product?.category.orEmpty(),
                unit = product?.unit.orEmpty(),
                qty = qty,
                unitPrice = product?.effectiveUnitPrice() ?: 0.0,
                state = PosStockViewModel.classify(qty),
            )
        }
        .sortedBy { it.name.lowercase() }

    return PosStockLoadState.Ready(
        items = items,
        summary = PosStockSummary(
            total = items.size,
            ok = items.count { it.state == StockStates.OK },
            low = items.count { it.state == StockStates.LOW },
            out = items.count { it.state == StockStates.OUT },
        ),
        totalCount = items.size,
    )
}

private fun List<StockItemUi>.filterByQuery(query: String): List<StockItemUi> {
    val q = query.trim().lowercase()
    if (q.isEmpty()) return this
    return filter {
        it.name.lowercase().contains(q) ||
                it.code.lowercase().contains(q) ||
                it.category.lowercase().contains(q)
    }
}