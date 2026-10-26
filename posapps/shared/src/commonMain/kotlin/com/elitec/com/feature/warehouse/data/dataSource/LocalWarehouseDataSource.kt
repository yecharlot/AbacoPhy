package com.elitec.com.feature.warehouse.data.dataSource

import com.elitec.com.feature.warehouse.data.dao.WarehouseDao
import com.elitec.com.feature.warehouse.data.dto.SalesUnitEntity
import com.elitec.com.feature.warehouse.data.dto.UnitStockEntity
import kotlinx.coroutines.flow.Flow

class LocalWarehouseDataSource(
    private val dao: WarehouseDao,
) {
    fun observeUnits(): Flow<List<SalesUnitEntity>> = dao.observeUnits()
    suspend fun getUnits(): List<SalesUnitEntity> = dao.getUnits()
    suspend fun getAllUnitStocks(): List<UnitStockEntity> = dao.getAllUnitStocks()
    fun observeUnitStocks(unitId: String?): Flow<List<UnitStockEntity>> =
        if (unitId.isNullOrBlank()) dao.observeAllUnitStocks()
        else dao.observeUnitStocks(unitId)

    suspend fun replaceUnitsAndStocks(units: List<SalesUnitEntity>, stocks: List<UnitStockEntity>) {
        dao.clearUnits()
        dao.clearUnitStocks()
        if (units.isNotEmpty()) dao.saveUnits(units)
        if (stocks.isNotEmpty()) dao.saveUnitStocks(stocks)
    }

    suspend fun replaceUnitStocks(stocks: List<UnitStockEntity>) {
        dao.clearUnitStocks()
        if (stocks.isNotEmpty()) dao.saveUnitStocks(stocks)
    }

    /**
     * Descuento provisional de stock PDV (offline). No toca servidor.
     * qty se reduce y no baja de 0. Filas inexistentes se ignoran.
     */
    suspend fun applyProvisionalSaleOut(unitId: String, lines: List<Pair<String, Double>>) {
        if (unitId.isBlank() || lines.isEmpty()) return
        val updated = mutableListOf<UnitStockEntity>()
        for ((productId, qtySold) in lines) {
            if (productId.isBlank() || qtySold <= 0.0) continue
            val row = dao.getUnitStock(unitId, productId) ?: continue
            val newQty = (row.qty - qtySold).coerceAtLeast(0.0)
            updated += row.copy(
                qty = newQty,
                amountBase = newQty * row.avgCost,
            )
        }
        if (updated.isNotEmpty()) dao.saveUnitStocks(updated)
    }
}
