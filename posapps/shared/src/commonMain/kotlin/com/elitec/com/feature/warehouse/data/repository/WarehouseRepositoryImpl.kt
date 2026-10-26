package com.elitec.com.feature.warehouse.data.repository

import com.elitec.com.feature.warehouse.data.dataSource.LocalWarehouseDataSource
import com.elitec.com.feature.warehouse.data.dataSource.RemoteWarehouseDataSource
import com.elitec.com.feature.warehouse.data.dto.toDomain
import com.elitec.com.feature.warehouse.data.dto.toEntity
import com.elitec.com.feature.warehouse.domain.entities.SalesUnitsSnapshot
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.entities.WarehouseSnapshot
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class WarehouseRepositoryImpl(
    private val local: LocalWarehouseDataSource,
    private val remote: RemoteWarehouseDataSource,
) : WarehouseRepository {

    override suspend fun getSalesUnits(): SalesUnitsSnapshot {
        return try {
            val dto = remote.getSalesUnits()
            val units = dto.units.orEmpty()
            val stocks = dto.stocks.orEmpty()
            local.replaceUnitsAndStocks(
                units.map { it.toEntity() },
                stocks.map { it.toEntity() },
            )
            SalesUnitsSnapshot(
                units = units.map { it.toDomain() },
                stocks = stocks.map { it.toDomain() },
            )
        } catch (t: Throwable) {
            AbacoLog.w(LogCategory.POS, "getSalesUnits remote fail → local: ${t.message}")
            SalesUnitsSnapshot(
                units = local.getUnits().map { it.toDomain() },
                stocks = local.getAllUnitStocks().map { it.toDomain() },
            )
        }
    }

    override suspend fun getStock(): WarehouseSnapshot {
        return try {
            val dto = remote.getWarehouse()
            val unitStocks = dto.unitStocks.orEmpty()
            if (unitStocks.isNotEmpty()) {
                local.replaceUnitStocks(unitStocks.map { it.toEntity() })
            }
            WarehouseSnapshot(
                rows = dto.warehouse.orEmpty().map { it.toDomain() },
                unitStocks = unitStocks.map { it.toDomain() },
            )
        } catch (t: Throwable) {
            AbacoLog.w(LogCategory.POS, "getStock remote fail → local: ${t.message}")
            val stocks = local.getAllUnitStocks().map { it.toDomain() }
            WarehouseSnapshot(rows = emptyList(), unitStocks = stocks)
        }
    }

    override fun observeUnitStocks(unitId: String?): Flow<List<UnitStock>> =
        local.observeUnitStocks(unitId).map { list -> list.map { it.toDomain() } }

    override suspend fun applyProvisionalSaleOut(unitId: String, productQty: Map<String, Double>) {
        if (unitId.isBlank() || productQty.isEmpty()) return
        local.applyProvisionalSaleOut(
            unitId,
            productQty.entries.map { it.key to it.value },
        )
        AbacoLog.i(
            LogCategory.POS,
            "Provisional stock out unit=$unitId lines=${productQty.size}",
        )
    }
}
