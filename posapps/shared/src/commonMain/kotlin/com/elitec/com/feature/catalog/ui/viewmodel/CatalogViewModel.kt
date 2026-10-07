package com.elitec.com.feature.catalog.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.catalog.domain.caseuse.GetProductsCaseUse
import com.elitec.com.feature.catalog.domain.caseuse.ObserveProductsCaseUse
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.ui.uiStates.CatalogChargingUiState
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.milliseconds

class CatalogViewModel(
    private val _observeProducts: ObserveProductsCaseUse
): ViewModel() {

    private var _productFlow = MutableStateFlow(listOf<Product>())
    val productFlow get() = _productFlow.asStateFlow()

    private var _productChargingUIState = MutableStateFlow<CatalogChargingUiState>(CatalogChargingUiState.Idle)
    val productChargingUiState get() = _productChargingUIState.asStateFlow()

    init {
        observeProducts()
    }

    private fun observeProducts() {
        viewModelScope.launch {
            _observeProducts().collect { products ->
                changeUiState(CatalogChargingUiState.Loading("Actualizando lista de productos en catálogo"))
                _productFlow.value = products
                changeUiState(CatalogChargingUiState.CatalogCharged("Lista de productos actualizada"))
                resetUiState()
            }
        }
    }

    private suspend fun changeUiState(newState: CatalogChargingUiState) {
        delay(1000.milliseconds)
        _productChargingUIState.value = newState
    }

    private suspend fun resetUiState() {
        _productChargingUIState.value = CatalogChargingUiState.Idle
    }
}
