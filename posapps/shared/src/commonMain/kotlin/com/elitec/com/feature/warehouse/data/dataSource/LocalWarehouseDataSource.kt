package com.elitec.com.feature.warehouse.data.dataSource

import com.elitec.com.feature.warehouse.data.dao.WarehouseDao
import com.elitec.com.feature.warehouse.data.dto.SalesUnitEntity
import com.elitec.com.feature.warehouse.data.dto.UnitStockEntity
import kotlinx.coroutines.flow.Flow

class LocalWarehouseDataSource(
    private val dao: WarehouseDao,
) {
    fun observeUnits(): Flow<List<SalesUnitEntity>> = dao.observeUnits()
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
}
