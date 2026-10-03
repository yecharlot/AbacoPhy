package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.pos.domain.caseuse.GetSaleByIdCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesByPOSCaseUse
import com.elitec.com.feature.pos.domain.caseuse.LoadPosSnapshotCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveSalesFlowCaseUse
import com.elitec.com.feature.pos.domain.caseuse.RegisterSaleCaseUse
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

data class PosContextState(
    val products: List<Product> = emptyList(),
    val units: List<SalesUnit> = emptyList(),
    val unitStocks: List<UnitStock> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
)

class SalesViewModel(
    private val observeSales: ObserveSalesFlowCaseUse,
    private val listSalesByPos: ListSalesByPOSCaseUse,
    private val registerSale: RegisterSaleCaseUse,
    private val getSaleById: GetSaleByIdCaseUse,
    private val loadPosSnapshot: LoadPosSnapshotCaseUse,
) : ViewModel() {

    private val _salesUiState = MutableStateFlow<SaleListUiState>(SaleListUiState.Loading)
    val salesUiState: StateFlow<SaleListUiState> = _salesUiState.asStateFlow()

    private val _registerState = MutableStateFlow<RegisterSaleUiState>(RegisterSaleUiState.Idle)
    val registerState: StateFlow<RegisterSaleUiState> = _registerState.asStateFlow()

    private val _context = MutableStateFlow(PosContextState())
    val context: StateFlow<PosContextState> = _context.asStateFlow()

    private val _activeUnitId = MutableStateFlow("")
    val activeUnitId: StateFlow<String> = _activeUnitId.asStateFlow()

    init {
        observeLocalCache()
    }

    fun setActiveUnitId(unitId: String) {
        _activeUnitId.value = unitId
        refreshAll()
    }

    private fun observeLocalCache() {
        viewModelScope.launch {
            observeSales()
                .catch { e ->
                    _salesUiState.value = SaleListUiState.Error(e.message ?: "Error observando ventas")
                }
                .collect { list ->
                    val unitId = _activeUnitId.value
                    val filtered =
                        if (unitId.isBlank()) list else list.filter { it.unitId == unitId }
                    _salesUiState.value =
                        if (filtered.isEmpty()) SaleListUiState.Empty
                        else SaleListUiState.WithSales(filtered)
                }
        }
    }

    /** Carga ventas + productos + PDV/stock (como posStore.loadAll). */
    fun refreshAll() {
        viewModelScope.launch {
            _context.value = _context.value.copy(loading = true, error = null)
            _salesUiState.value = SaleListUiState.Loading
            loadPosSnapshot(_activeUnitId.value.ifBlank { null })
                .onSuccess { snap ->
                    _context.value = PosContextState(
                        products = snap.products,
                        units = snap.units,
                        unitStocks = snap.unitStocks,
                        loading = false,
                    )
                }
                .onFailure { e ->
                    _context.value = _context.value.copy(
                        loading = false,
                        error = e.message ?: "Error al cargar POS",
                    )
                    _salesUiState.value =
                        SaleListUiState.Error(e.message ?: "Error al cargar ventas")
                }
        }
    }

    fun createSale(input: CreateSaleInput) {
        viewModelScope.launch {
            _registerState.value = RegisterSaleUiState.Saving
            registerSale(input)
                .onSuccess { sale ->
                    _registerState.value = RegisterSaleUiState.Success(sale)
                    refreshAll()
                }
                .onFailure { e ->
                    _registerState.value =
                        RegisterSaleUiState.Error(e.message ?: "No se pudo registrar la venta")
                }
        }
    }

    fun clearRegisterState() {
        _registerState.value = RegisterSaleUiState.Idle
    }

    fun stockOf(productId: String): Double {
        val unitId = _activeUnitId.value
        val rows = _context.value.unitStocks
        return if (unitId.isBlank()) {
            rows.filter { it.productId == productId }.sumOf { it.qty }
        } else {
            rows.firstOrNull { it.unitId == unitId && it.productId == productId }?.qty ?: 0.0
        }
    }

    fun loadSaleById(saleId: String, onSuccess: (Sale) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            getSaleById(saleId)
                .onSuccess(onSuccess)
                .onFailure { onError(it.message ?: "Venta no encontrada") }
        }
    }
}
