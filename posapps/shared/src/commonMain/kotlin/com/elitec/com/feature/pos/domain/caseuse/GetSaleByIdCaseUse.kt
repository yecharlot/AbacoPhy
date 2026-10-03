package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

class GetSaleByIdCaseUse(
    private val repository: SalesRepository,
) {
    suspend operator fun invoke(id: String): Result<Sale> = runCatching {
        repository.getSaleById(id) ?: error("Venta no encontrada")
    }
}
