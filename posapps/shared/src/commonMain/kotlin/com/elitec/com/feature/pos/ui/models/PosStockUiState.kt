package com.elitec.com.feature.pos.ui.models

data class PosStockUiState(
    val load: PosStockLoadState = PosStockLoadState.Loading,
    val query: String = "",
    /** Actualización en curso (pull-to-refresh o botón). */
    val isRefreshing: Boolean = false,
    /** Fallo al actualizar; los datos locales siguen visibles. */
    val refreshError: String? = null,
)
