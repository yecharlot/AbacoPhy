package com.elitec.com.feature.pos.ui.models

import com.elitec.com.feature.pos.ui.uiStates.StockStates

/** Un producto con su existencia en el punto de venta, listo para pintar. */
data class StockItemUi(
    val productId: String,
    val code: String,
    val name: String,
    val category: String,
    val unit: String,
    val qty: Double,
    val unitPrice: Double,
    /** OUT / LOW / OK: solo cambia el COLOR; los productos no se separan por estado. */
    val state: StockStates,
)