package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.pos.domain.caseuse.GetSaleByIdCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesByPOSCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveASaleFlowCaseUse
import com.elitec.com.feature.pos.domain.caseuse.RegisterSelectCaseUse
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

class SalesViewModel(
    private val _getSalesById: GetSaleByIdCaseUse,
    private val _observeASaleFlow: ObserveASaleFlowCaseUse,
    private val _listSalesByPOS: ListSalesByPOSCaseUse,
    private val _registerSelect: RegisterSelectCaseUse
): ViewModel() {
    private var _salesUiState = MutableStateFlow<SaleListUiState>(SaleListUiState.Empty)
    val salesUiState get() = _salesUiState.asStateFlow()

    init {
        listASalesByPos()
        observeSalesFLow()
    }

    private fun observeSalesFLow() {
        viewModelScope.launch {
            _observeASaleFlow()
                .catch { error ->
                    _salesUiState.value = SaleListUiState.ErrorLoadingSales(
                        error.message ?: "Error en la carga de ventas"
                    )
                }
                .collect { saleList ->
                    when (saleList.isEmpty()) {
                        true -> _salesUiState.value = SaleListUiState.Empty
                        else -> _salesUiState.value = SaleListUiState.WithSales(saleList)
                    }
                }
        }
    }

    private fun listASalesByPos() {
        viewModelScope.launch {
            _listSalesByPOS("Id de pos") // Hay que inyectar una instancia que ayude a cargar el posid del vendedor
                .onSuccess { } // Success action
                .onFailure {  } // Failure action
        }
    }

    fun createANewSale(
        newSale: Sale,
        onSaleSuccess: () -> Unit,
        onSaleFail: (String) -> Unit
    ) {
        viewModelScope.launch {
            _registerSelect(newSale)
                .onSuccess { onSaleSuccess() }
                .onFailure { onSaleFail(it.message ?: "No se ha podido realizar la ultima venta, error no especificado durante el proceso, Código: 000") }
        }
    }

    fun getSaleById(
        saleId: String,
        onSaleSearchSuccess: (Sale) -> Unit,
        onSearchFail:(String) -> Unit) {
        viewModelScope.launch {
            _getSalesById(saleId)
                .onSuccess {
                    onSaleSearchSuccess(it)
                }
                .onFailure {
                    onSearchFail( "No se ha encontrado la venta seleccionada: ${it.message}" )
                }
        }
    }
}