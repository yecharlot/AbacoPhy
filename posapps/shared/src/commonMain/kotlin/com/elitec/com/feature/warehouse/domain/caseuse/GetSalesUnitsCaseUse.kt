package com.elitec.com.feature.warehouse.domain.caseuse

import com.elitec.com.feature.warehouse.domain.entities.SalesUnitsSnapshot
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository

class GetSalesUnitsCaseUse(
    private val repository: WarehouseRepository,
) {
    suspend operator fun invoke(): Result<SalesUnitsSnapshot> = runCatching {
        repository.getSalesUnits()
    }
}
