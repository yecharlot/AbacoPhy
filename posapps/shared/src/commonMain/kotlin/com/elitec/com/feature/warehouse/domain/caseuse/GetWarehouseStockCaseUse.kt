package com.elitec.com.feature.warehouse.domain.caseuse

import com.elitec.com.feature.warehouse.domain.entities.WarehouseSnapshot
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository

class GetWarehouseStockCaseUse(
    private val repository: WarehouseRepository,
) {
    suspend operator fun invoke(): Result<WarehouseSnapshot> = runCatching {
        repository.getStock()
    }
}
