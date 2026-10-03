package com.elitec.com.feature.warehouse.data.repository

import com.elitec.com.feature.warehouse.data.dataSource.LocalWarehouseDataSource
import com.elitec.com.feature.warehouse.data.dataSource.RemoteWarehouseDataSource
import com.elitec.com.feature.warehouse.data.dto.toDomain
import com.elitec.com.feature.warehouse.data.dto.toEntity
import com.elitec.com.feature.warehouse.domain.entities.SalesUnitsSnapshot
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.entities.WarehouseSnapshot
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class WarehouseRepositoryImpl(
    private val local: LocalWarehouseDataSource,
    private val remote: RemoteWarehouseDataSource,
) : WarehouseRepository {

    override suspend fun getSalesUnits(): SalesUnitsSnapshot {
        val dto = remote.getSalesUnits()
        val units = dto.units.orEmpty()
        val stocks = dto.stocks.orEmpty()
        local.replaceUnitsAndStocks(
            units.map { it.toEntity() },
            stocks.map { it.toEntity() },
        )
        return SalesUnitsSnapshot(
            units = units.map { it.toDomain() },
            stocks = stocks.map { it.toDomain() },
        )
    }

    override suspend fun getStock(): WarehouseSnapshot {
        val dto = remote.getWarehouse()
        val unitStocks = dto.unitStocks.orEmpty()
        if (unitStocks.isNotEmpty()) {
            local.replaceUnitStocks(unitStocks.map { it.toEntity() })
        }
        return WarehouseSnapshot(
            rows = dto.warehouse.orEmpty().map { it.toDomain() },
            unitStocks = unitStocks.map { it.toDomain() },
        )
    }

    override fun observeUnitStocks(unitId: String?): Flow<List<UnitStock>> =
        local.observeUnitStocks(unitId).map { list -> list.map { it.toDomain() } }
}
