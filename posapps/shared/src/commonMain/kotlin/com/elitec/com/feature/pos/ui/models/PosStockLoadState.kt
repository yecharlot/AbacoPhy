package com.elitec.com.feature.pos.ui.models

/** Estado de CARGA del stock. */
sealed interface PosStockLoadState {
    /** Primera carga / sincronización inicial (la UI muestra esqueletos). */
    data object Loading : PosStockLoadState

    data class Error(val message: String) : PosStockLoadState

    data class Ready(
        /** Ya filtrados por la búsqueda. */
        val items: List<StockItemUi>,
        /** Resumen de TODO el stock (no depende de la búsqueda). */
        val summary: PosStockSummary,
        /** Cantidad total de productos con stock registrado, sin filtrar. */
        val totalCount: Int,
    ) : PosStockLoadState
}
