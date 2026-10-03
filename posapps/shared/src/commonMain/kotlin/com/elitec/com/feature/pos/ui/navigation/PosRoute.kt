package com.elitec.com.feature.pos.ui.navigation

/**
 * Destinos internos de Home (Nav3 type-safe).
 * Auth (Splash/Login) queda fuera — SessionControl.
 */
sealed interface PosRoute {
    /** Listado de ventas del PDV. */
    data object SalesList : PosRoute

    /** Detalle de una venta (list-detail en tablet más adelante). */
    data class SaleDetail(val saleId: String) : PosRoute

    /** Formulario nueva venta (placeholder). */
    data object NewSale : PosRoute

    /** Stock del punto de venta (placeholder). */
    data object Stock : PosRoute
}
