package com.elitec.com.feature.pos.ui.uiStates

import com.elitec.com.feature.pos.domain.entities.Sale

sealed class SaleListUiState {
    object Empty : SaleListUiState()
    data class WithSales(val sales: List<Sale>) : SaleListUiState()
    data class ErrorLoadingSales(val errorMessage: String) : SaleListUiState()
}