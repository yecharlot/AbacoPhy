package com.elitec.com.feature.warehouse.domain.entities

/** Punto de venta del negocio. */
data class SalesUnit(
    val id: String,
    val code: String,
    val name: String,
    val address: String = "",
    val phone: String = "",
    val active: Boolean = true,
    val metadata: String? = null,
)

/** Stock de un producto en una unidad de venta. */
data class UnitStock(
    val unitId: String,
    val productId: String,
    val qty: Double,
    val avgCost: Double = 0.0,
    val amountBase: Double = 0.0,
    val metadata: String? = null,
)

/** Snapshot GET /units (web SalesUnitsSnapshot). */
data class SalesUnitsSnapshot(
    val units: List<SalesUnit>,
    val stocks: List<UnitStock>,
)

/** Fila de almacén central GET /warehouse. */
data class WarehouseStockRow(
    val productId: String,
    val code: String = "",
    val name: String = "",
    val unit: String = "",
    val qty: Double,
    val avgCost: Double = 0.0,
    val amountBase: Double = 0.0,
    val currency: String = "",
)

data class WarehouseSnapshot(
    val rows: List<WarehouseStockRow>,
    val unitStocks: List<UnitStock> = emptyList(),
)
