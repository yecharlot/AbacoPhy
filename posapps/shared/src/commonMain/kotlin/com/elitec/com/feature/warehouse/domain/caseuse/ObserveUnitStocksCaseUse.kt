package com.elitec.com.feature.warehouse.domain.caseuse

import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository
import kotlinx.coroutines.flow.Flow

class ObserveUnitStocksCaseUse(
    private val repository: WarehouseRepository,
) {
    operator fun invoke(unitId: String? = null): Flow<List<UnitStock>> =
        repository.observeUnitStocks(unitId)
}
