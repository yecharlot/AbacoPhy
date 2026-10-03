package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

class ListSalesByPOSCaseUse(
    private val repository: SalesRepository
) {
    suspend operator fun invoke(posId: String): Result<List<Sale>> {
        if (posId.isEmpty()) {
            return Result.failure(IllegalArgumentException("El ID del POS es requerido"))
        }
        return Result.success(repository.getSalesByPOSId(posId))
    }
}