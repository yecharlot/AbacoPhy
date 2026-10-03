package com.elitec.com.feature.warehouse.domain.repository

import com.elitec.com.feature.warehouse.domain.entities.SalesUnitsSnapshot
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.entities.WarehouseSnapshot
import kotlinx.coroutines.flow.Flow

/**
 * Subconjunto del contrato web WarehouseRepository que el POS necesita.
 * Recepciones/transferencias no se implementan aquí (app vendedor).
 */
interface WarehouseRepository {
    suspend fun getSalesUnits(): SalesUnitsSnapshot
    suspend fun getStock(): WarehouseSnapshot
    fun observeUnitStocks(unitId: String? = null): Flow<List<UnitStock>>
}
