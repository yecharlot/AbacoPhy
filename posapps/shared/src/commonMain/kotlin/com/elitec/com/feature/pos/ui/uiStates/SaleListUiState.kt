package com.elitec.com.feature.pos.ui.uiStates

import com.elitec.com.feature.pos.domain.entities.Sale

sealed class SaleListUiState {
    data object Loading : SaleListUiState()
    data object Empty : SaleListUiState()
    data class WithSales(val sales: List<Sale>) : SaleListUiState()
    data class Error(val message: String) : SaleListUiState()
}

sealed class RegisterSaleUiState {
    data object Idle : RegisterSaleUiState()
    data object Saving : RegisterSaleUiState()
    data class Success(val sale: Sale) : RegisterSaleUiState()
    data class Error(val message: String) : RegisterSaleUiState()
}
