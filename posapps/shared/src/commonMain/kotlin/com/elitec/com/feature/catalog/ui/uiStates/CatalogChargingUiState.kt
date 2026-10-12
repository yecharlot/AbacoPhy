package com.elitec.com.feature.catalog.ui.uiStates

sealed interface CatalogChargingUiState {
    object Idle: CatalogChargingUiState
    data class Loading(val message: String) : CatalogChargingUiState
    data class CatalogCharged(val message: String) : CatalogChargingUiState
    data class ErrorLoading(val message: String): CatalogChargingUiState
}