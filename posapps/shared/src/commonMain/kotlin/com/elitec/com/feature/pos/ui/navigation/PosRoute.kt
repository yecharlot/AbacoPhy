package com.elitec.com.feature.pos.ui.navigation

sealed interface PosRoute {
    /** Workspace menú productos (adaptativo). */
    data object Menu : PosRoute

    /** Solo mobile: revisión de pedido. */
    data object OrderReview : PosRoute

    data object SalesList : PosRoute
    data class SaleDetail(val saleId: String) : PosRoute
    data object Stock : PosRoute
}
